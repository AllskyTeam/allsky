#!/bin/bash

# Shell functions used by multiple scripts.
# This file is "source"d into others, and must be done AFTER source'ing variables.sh
# and config.sh.


# Exit with error message and a custom notification image.
function doExit()
{
	local EXITCODE=$1
	local TYPE=${2:-"Error"}
	local CUSTOM_MESSAGE="${3}"		# optional
	local WEBUI_MESSAGE="${4}"		# optional

	case "${TYPE}" in
		Warning)
			COLOR="yellow"
			;;
		Error)
			COLOR="red"
			;;
		NotRunning|*)
			COLOR="yellow"
			;;
	esac
	if [ ${EXITCODE} -ge ${EXIT_ERROR_STOP} ]; then
		# With fatal EXIT_ERROR_STOP errors, we can't continue so display a notification image
		# even if the user has them turned off.
		if [[ -n ${CUSTOM_MESSAGE} ]]; then
			# Create a custom error message.
			# If we error out before config.sh is sourced in, $FILENAME and $EXTENSION won't be
			# set so guess at what they are.
			"${ALLSKY_SCRIPTS}/generate_notification_images.sh" --directory "${ALLSKY_TMP}" \
				"${FILENAME:-"image"}" \
				"${COLOR}" "" "85" "" "" \
				"" "10" "${COLOR}" "${EXTENSION:-"jpg"}" "" "${CUSTOM_MESSAGE}"
		else
			"${ALLSKY_SCRIPTS}/copy_notification_image.sh" --expires 0 "${TYPE}" 2>&1
		fi
		# Don't let the service restart us because we'll likely get the same error again.
		echo "     ***** AllSky Stopped *****"
	fi

	if [[ -n ${WEBUI_MESSAGE} ]]; then
		"${ALLSKY_SCRIPTS}/addMessage.sh" "${TYPE}" "${WEBUI_MESSAGE}"
	fi

	[ ${EXITCODE} -ge ${EXIT_ERROR_STOP} ] && sudo systemctl stop allsky

	exit ${EXITCODE}
}


# RPi cameras can use either "raspistill" on Buster or "libcamera-still" on Bullseye
# to actually take pictures.
# Determine which to use.
# On success, return 1 and the command to use.
# On failure, return 0 and an error message.
function determineCommandToUse()
{
	local USE_doExit="${1}"			# Call doExit() on error?
	local PREFIX="${2}"				# only used if calling doExit()

	# If libcamera is installed and works, use it.
	# If it's not installed, or IS installed but doesn't work (the user may not have it configured),
	# use raspistill.

	local CMD="libcamera-still"
	if command -v ${CMD} > /dev/null; then
		# Found the command - see if it works.
		"${CMD}" --timeout 1 --nopreview > /dev/null 2>&1
		RET=$?
	fi

	if [ ${RET} -ne 0 ]; then
		# Didn't find libcamera-still, or it didn't work.

		CMD="raspistill"
		if ! command -v "${CMD}" > /dev/null; then
			echo -e "${RED}*** ERROR: Can't determine what command to use for RPi camera.${NC}"
			if [[ ${USE_doExit} == "true" ]]; then
				doExit ${EXIT_ERROR_STOP} "Error" "${PREFIX}\nRPi camera command\nnot found!."
			fi

			return 1
		fi

		# TODO: Should try and run raspistill command - doing that is more reliable since
		# the output of vcgencmd changes depending on the OS and how the Pi is configured.
		# Newer kernels/libcamera give:   supported=1 detected=0, libcamera interfaces=1
		# but only if    start_x=1    is in /boot/config.txt
		vcgencmd get_camera | grep --silent "supported=1" ######### detected=1"
		RET=$?
	fi

	if [ ${RET} -ne 0 ]; then
		echo -e "${RED}*** ERROR: RPi camera not found.  Make sure it's enabled.${NC}"
		if [[ ${USE_doExit} == "true" ]]; then
			doExit ${EXIT_NO_CAMERA} "Error" "${PREFIX}\nRPi camera\nnot found!\nMake sure it's enabled."
		fi

		return 1
	fi

	echo "${CMD}"
	return 0
}


# Display a message of various types in appropriate colors.
# Used primarily in installation scripts.
function display_msg()
{
	local LOG_IT
	if [[ $1 == "--log" ]]; then
		LOG_IT=true
		shift
	else
		LOG_IT=false
	fi

	local LOG_TYPE="${1}"
	local MESSAGE="${2}"
	local MSG=""
	local STARS
	if [[ ${LOG_TYPE} == "error" ]]; then
		MSG="\n${RED}*** ERROR: "
		STARS=true

	elif [[ ${LOG_TYPE} == "warning" ]]; then
		MSG="\n${YELLOW}*** WARNING: "
		STARS=true

	elif [[ ${LOG_TYPE} == "notice" ]]; then
		MSG="${YELLOW}*** NOTICE: "
		STARS=true

	elif [[ ${LOG_TYPE} == "progress" ]]; then
		MSG="${GREEN}* ${MESSAGE}${NC}"
		STARS=false

	elif [[ ${LOG_TYPE} == "info" || ${LOG_TYPE} == "debug" ]]; then
		MSG="${YELLOW}${MESSAGE}${NC}"
		STARS=false

	else
		MSG="${YELLOW}"
		STARS=false
	fi

	if [[ ${STARS} == "true" ]]; then
		MSG="${MSG}\n"
		MSG="${MSG}**********\n"
		MSG="${MSG}${MESSAGE}\n"
		MSG="${MSG}**********${NC}\n"
	fi

	# Log messages to a file if it was specified.
	# ${DISPLAY_MSG_LOG} <should> be set if ${LOG_IT} is true, but just in case, check.
	if [[ ${LOG_IT} == "true" && -n ${DISPLAY_MSG_LOG} ]]; then
		echo -e "${MSG}" | tee -a "${DISPLAY_MSG_LOG}"
	else
		echo -e "${MSG}"
	fi
}


# Seach for the specified field in the specified array, and return the index.
# Return -1 on error.
function getJSONarrayIndex()
{
	local JSON_FILE="${1}"
	local PARENT="${2}"
	local FIELD="${3}"
	jq .${PARENT} "${JSON_FILE}" | \
		gawk 'BEGIN { n = -1; found = 0;} {
			if ($1 == "{") {
				n++;
				next;
			}
			if ($0 ~ /'"${FIELD}"'/) {
				printf("%d", n);
				found = 1;
				exit 0
			}
		} END {if (! found) print -1}'
}



# Convert a latitude or longitude to NSEW format.
# Allow either +/- decimal numbers, OR numbers with N, S, E, W, but not both.
function convertLatLong()
{
	local LATLONG="${1}"
	local TYPE="${2}"						# "latitude" or "longitude"
	LATLONG="${LATLONG^^[nsew]}"			# convert any character to uppercase for consistency
	local SIGN="${LATLONG:0:1}"				# First character, may be "-" or "+" or a number
	local DIRECTION="${LATLONG: -1}"						# May be N, S, E, or W, or a number
	[[ ${SIGN} != "+" && ${SIGN} != "-" ]] && SIGN=""		# No sign
	[[ ${DIRECTION%[NSEW]} != "" ]] && DIRECTION="" 		# No N, S, E, or W

	if [[ -z ${DIRECTION} ]]; then
		# No direction
		if [[ -z ${SIGN} ]]; then
			# No sign either
			echo "'${LATLONG}' should contain EITHER a '+' or '-', OR a 'N', 'S', 'E', or 'W'."
			return 1
		fi

		# A number - convert to character
		LATLONG="${LATLONG:1}"		# Skip over sign
		if [[ ${SIGN} == "+" ]]; then
			if [[ ${TYPE} == "latitude" ]]; then
				echo "${LATLONG}N"
			else
				echo "${LATLONG}E"
			fi
		else
			if [[ ${TYPE} == "latitude" ]]; then
				echo "${LATLONG}S"
			else
				echo "${LATLONG}W"
			fi
		fi
		return 0

	elif [[ -n ${SIGN} && -n ${DIRECTION} ]]; then
			echo "'${LATLONG}' should contain EITHER a '${SIGN}' OR a '${DIRECTION}', but not both."
			return 1
	else
		# A character - return as is.
		echo "${LATLONG}"
		return 0
	fi
}

# Get the sunrise and sunset times.
# The angle can optionally be passed in.
get_sunrise_sunset()
{
	ANGLE="${1}"
	#shellcheck disable=SC1090
	source "${ALLSKY_HOME}/variables.sh" || return 1
	#shellcheck disable=SC1090
	source "${ALLSKY_CONFIG}/config.sh" || return 1
	[[ -z ${ANGLE} ]] && ANGLE="$(settings ".angle")"
	LATITUDE="$(settings ".latitude")"
		LATITUDE="$(convertLatLong "${LATITUDE}" "latitude")"
	LONGITUDE="$(settings ".longitude")"
		LONGITUDE="$(convertLatLong "${LONGITUDE}" "longitude")"

	echo "Rise    Set     Angle"
	X="$(sunwait list angle "0" "${LATITUDE}" "${LONGITUDE}")"
	# Replace comma by a couple spaces so the output looks nicer.
	echo "${X/,/  }    0"
	X="$(sunwait list angle "${ANGLE}" "${LATITUDE}" "${LONGITUDE}")"
	echo "${X/,/  }   ${ANGLE}"
}
