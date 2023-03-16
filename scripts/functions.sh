#!/bin/bash

# Shell functions used by multiple scripts.
# This file is "source"d into others, and must be done AFTER source'ing variables.sh
# and config.sh.


#####
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
		NotRunning | *)
			COLOR="yellow"
			;;
	esac
	if [[ ${EXITCODE} -ge ${EXIT_ERROR_STOP} ]]; then
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
		elif [[ ${TYPE} != "no-image" ]]; then
			"${ALLSKY_SCRIPTS}/copy_notification_image.sh" --expires 0 "${TYPE}" 2>&1
		fi
		# Don't let the service restart us because we'll likely get the same error again.
		echo "     ***** AllSky Stopped *****"
	fi

	if [[ -n ${WEBUI_MESSAGE} ]]; then
		[[ ${TYPE} = "no-image" ]] && TYPE="success"
		"${ALLSKY_SCRIPTS}/addMessage.sh" "${TYPE}" "${WEBUI_MESSAGE}"
	fi

	[[ ${EXITCODE} -ge ${EXIT_ERROR_STOP} ]] && sudo systemctl stop allsky

	# shellcheck disable=SC2086
	exit ${EXITCODE}
}


#####
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
		if [[ ${RET} -eq 137 ]]; then
			# If another libcamera-still is running the one we execute will hang for
			# about a minute then be killed with RET=137.
			# If that happens, assume libcamera-still is the command to use.
			RET=0
		fi
	fi

	if [[ ${RET} -ne 0 ]]; then
		# Didn't find libcamera-still, or it didn't work.

		CMD="raspistill"
		if ! command -v "${CMD}" > /dev/null; then
			echo -e "${RED}*** ERROR: Can't determine what command to use for RPi camera.${NC}"
			if [[ ${USE_doExit} == "true" ]]; then
				doExit "${EXIT_ERROR_STOP}" "Error" "${PREFIX}\nRPi camera command\nnot found!."
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

	if [[ ${RET} -ne 0 ]]; then
		echo -e "${RED}*** ERROR: RPi camera not found.  Make sure it's enabled.${NC}"
		if [[ ${USE_doExit} == "true" ]]; then
			doExit "${EXIT_NO_CAMERA}" "Error" "${PREFIX}\nRPi camera\nnot found!\nMake sure it's enabled."
		fi

		return 1
	fi

	echo "${CMD}"
	return 0
}


#####
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
	local MESSAGE2="${3}"		# optional 2nd message that's not in color
	local MSG=""
	local LOGMSG=""				# same as ${MSG} but no escape chars
	local STARS
	if [[ ${LOG_TYPE} == "error" ]]; then
		LOGMSG="*** ERROR: "
		MSG="\n${RED}${LOGMSG}"
		STARS=true

	elif [[ ${LOG_TYPE} == "warning" ]]; then
		LOGMSG="*** WARNING: "
		MSG="\n${YELLOW}${LOGMSG}"
		STARS=true

	elif [[ ${LOG_TYPE} == "notice" ]]; then
		LOGMSG="*** NOTICE: "
		MSG="\n${YELLOW}${LOGMSG}"
		STARS=true

	elif [[ ${LOG_TYPE} == "progress" ]]; then
		LOGMSG="* ${MESSAGE}"
		MSG="${GREEN}${LOGMSG}${NC}"
		STARS=false

	elif [[ ${LOG_TYPE} == "info" || ${LOG_TYPE} == "debug" ]]; then
		LOGMSG="${MESSAGE}"
		MSG="${YELLOW}${LOGMSG}${NC}"
		STARS=false

	else
		LOGMSG=""
		MSG="${YELLOW}"
		STARS=false
	fi

	if [[ ${STARS} == "true" ]]; then
		MSG="${MSG}\n"
		MSG="${MSG}**********\n"
		MSG="${MSG}${MESSAGE}\n"
		MSG="${MSG}**********${NC}\n"

		LOGMSG="${LOGMSG}\n"
		LOGMSG="${LOGMSG}**********\n"
		LOGMSG="${LOGMSG}${MESSAGE}\n"
		LOGMSG="${LOGMSG}**********\n"
	fi

	echo -e "${MSG}${MESSAGE2}"

	# Log messages to a file if it was specified.
	# ${DISPLAY_MSG_LOG} <should> be set if ${LOG_IT} is true, but just in case, check.
	if [[ ${LOG_IT} == "true" && -n ${DISPLAY_MSG_LOG} ]]; then
		echo -e "${LOGMSG}${MESSAGE2}" >>  "${DISPLAY_MSG_LOG}"
	fi
}


#####
# Seach for the specified field in the specified array, and return the index.
# Return -1 on error.
function getJSONarrayIndex()
{
	local JSON_FILE="${1}"
	local PARENT="${2}"
	local FIELD="${3}"
	jq ".${PARENT}" "${JSON_FILE}" | \
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


#####
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
			EMSG="ERROR: '${TYPE}' should contain EITHER a '+' or '-', OR a"
			if [[ ${TYPE} == "latitude" ]]; then
				EMSG="${EMSG} 'N' or 'S'"
			else
				EMSG="${EMSG} 'E' or 'W'"
			fi
			EMSG="${EMSG}; you entered '${LATLONG}'."
			echo -e "${EMSG}" >&2
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

	elif [[ -n ${SIGN} ]]; then
		echo "'${TYPE}' should contain EITHER a '${SIGN}' OR a '${DIRECTION}', but not both; you entered '${LATLONG}'." >&2
		return 1

	else
		# There's a direction - make sure it's valid for the TYPE.
		if [[ ${TYPE} == "latitude" ]]; then
			if [[ ${DIRECTION} != "N" && ${DIRECTION} != "S" ]]; then
				echo "'${TYPE}' should contain a 'N' or 'S' ; you entered '${LATLONG}'." >&2
				return 1
			fi
		else
			if [[ ${DIRECTION} != "E" && ${DIRECTION} != "W" ]]; then
				echo "'${TYPE}' should contain an 'E' or 'W' ; you entered '${LATLONG}'." >&2
				return 1
			fi
		fi

		# A character - return as is.
		echo "${LATLONG}"
		return 0
	fi
}


#####
# Get the sunrise and sunset times.
# The angle, latitude, and/or longitude can optionally be passed in
# to allow testing various configurations.
function get_sunrise_sunset()
{
	local ANGLE="${1}"
	local LATITUDE="${2}"
	local LONGITUDE="${3}"
	source "${ALLSKY_HOME}/variables.sh"	|| return 1
	source "${ALLSKY_CONFIG}/config.sh"		|| return 1

	[[ -z ${ANGLE} ]] && ANGLE="$(settings ".angle")"
	[[ -z ${LATITUDE} ]] && LATITUDE="$(settings ".latitude")"
	[[ -z ${LONGITUDE} ]] && LONGITUDE="$(settings ".longitude")"

	LATITUDE="$(convertLatLong "${LATITUDE}" "latitude")"		|| return 2
	LONGITUDE="$(convertLatLong "${LONGITUDE}" "longitude")"	|| return 2

	echo "Daytime start    Nighttime start   Angle"
	local X="$(sunwait list angle "0" "${LATITUDE}" "${LONGITUDE}")"
	# Replace comma by several spaces so the output lines up.
	echo "${X/,/           }               0"
	X="$(sunwait list angle "${ANGLE}" "${LATITUDE}" "${LONGITUDE}")"
	echo "${X/,/           }              ${ANGLE}"
}


#####
# Get a shell variable's value.  The variable can have optional spaces and tabs before it.
# This function is useful when we can't "source" the file.
function get_variable() {
	local VARIABLE="${1}"
	local FILE="${2}"
	local LINE=""
	local SEARCH_STRING="^[ 	]*${VARIABLE}="
	if ! LINE="$(grep -E "${SEARCH_STRING}" "${FILE}")" ; then
		return 1
	fi

	echo "${LINE}" | sed -e "s/${SEARCH_STRING}//" -e 's/"//g'
	return 0
}


#####
# Return which Allsky Websites exist - local, remote, both, none
function whatWebsites()
{
	source "${ALLSKY_HOME}/variables.sh"	|| return 1

	local HAS_LOCAL="false"
	local HAS_REMOTE="false"

	# Determine local Website - this is easy.
	[[ -f ${ALLSKY_WEBSITE_CONFIGURATION_FILE} ]] && HAS_LOCAL="true"

	# Determine remote Website - this is more involved.
	# Not only must the file exist, but there also has to be a way to upload to it.
	if [[ -f ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE} ]]; then
		local PROTOCOL="$(get_variable "PROTOCOL" "${ALLSKY_CONFIG}/ftp-settings.sh")"
		PROTOCOL=${PROTOCOL,,}
		if [[ -n ${PROTOCOL} && ${PROTOCOL} != "local" ]]; then
			local X
			case "${PROTOCOL}" in
				"" | local)
					;;

				ftp | ftps | sftp | scp)		# These require R
					X="$(get_variable "REMOTE_HOST" "${ALLSKY_CONFIG}/ftp-settings.sh")" 
					[[ -n ${X} ]] && HAS_REMOTE="true"
					;;

				s3)
					X="$(get_variable "AWS_CLI_DIR" "${ALLSKY_CONFIG}/ftp-settings.sh")" 
					[[ -n ${X} ]] && HAS_REMOTE="true"
					;;

				gcs)
					X="$(get_variable "GCS_BUCKET" "${ALLSKY_CONFIG}/ftp-settings.sh")" 
					[[ -n ${X} ]] && HAS_REMOTE="true"
					;;

				*)
					echo "ERROR: Unknown PROTOCOL: '${PROTOCOL}'" >&2
					;;
			esac
		fi
	fi

	if [[ ${HAS_LOCAL} == "true" ]]; then
		if [[ ${HAS_REMOTE} == "true" ]]; then
			echo "both"
		else
			echo "local"
		fi
	elif [[ ${HAS_REMOTE} == "true" ]]; then
		echo "remote"
	else
		echo "none"
	fi

	return 0
}


#####
# Determine if there's a newer version of a file in the specified branch.
# If so, download it to the specified location/name.
function checkAndGetNewerFile()
{
	if [[ ${1} == "--branch" ]]; then
		local BRANCH="${2}"
		shift 2
	else
		local BRANCH="${GITHUB_MAIN_BRANCH}"
	fi
	local CURRENT_FILE="${1}"
	local GIT_FILE="${GITHUB_RAW_ROOT}/allsky/${BRANCH}/${2}"
	local DOWNLOADED_FILE="${3}"
	# Download the file and put in DOWNLOADED_FILE
	X="$(curl --show-error --silent "${GIT_FILE}")"
	RET=$?
	if [[ ${RET} -eq 0 && ${X} != "404: Not Found" ]]; then
		# We really just check if the files are different.
		echo "${X}" > "${DOWNLOADED_FILE}"
		DOWNLOADED_CHECKSUM="$(sum "${DOWNLOADED_FILE}")"
		MY_CHECKSUM="$(sum "${CURRENT_FILE}")"
		if [[ ${MY_CHECKSUM} == "${DOWNLOADED_CHECKSUM}" ]]; then
			rm -f "${DOWNLOADED_FILE}"
			return 0
		else
			echo -n ""
			chmod 775 "${DOWNLOADED_FILE}"
			return 1
		fi
	else
		echo "ERROR: '${GIT_FILE} not found!"
		return 2
	fi
}


#####
# Determine what GitHub branch is being run.
# The branch name is in the "version" file:
#	<VERSION> [BRANCH: <BRANCH>]
function getBranch()
{
	local BRANCH=""
	[[ -f ${ALLSKY_HOME}/branch ]] && BRANCH="$(< "${ALLSKY_HOME}/branch")"
	if [[ -n ${BRANCH} ]]; then
		echo -n "${BRANCH}"
	else
		echo -n "${GITHUB_MAIN_BRANCH}"
	fi
	return 0
}


#####
# Check for valid pixel values.
function checkPixelValue()	# variable name, variable value, width_or_height, resolution, min
{
	local VAR_NAME="${1}"
	local VAR_VALUE="${2}"
	local W_or_H="${3}"
	local MAX_RESOLUTION="${4}"
	local MIN=${5:-0}		# optional minimal pixel value
	if [[ ${MIN} == "any" ]]; then
		MIN="-99999999"		# a number we'll never go below
		MSG="an"
	else
		MIN=0
		MSG="a postive, even"
	fi

	if [[ ${VAR_VALUE} != +([-+0-9]) || ${VAR_VALUE} -le ${MIN} || $((VAR_VALUE % 2)) -eq 1 ]]; then
		echo "${VAR_NAME} (${VAR_VALUE}) must be ${MSG} integer up to ${MAX_RESOLUTION}."
		return 1
	elif [[ ${VAR_VALUE} -gt ${MAX_RESOLUTION} ]]; then
		echo "${VAR_NAME} (${VAR_VALUE}) is larger than the image ${W_or_H} (${MAX_RESOLUTION})."
		return 1
	fi
	return 0
}


#####
# The crop rectangle needs to fit within the image, be an even number, and be greater than 0.
# x, y, offset_x, offset_y, max_resolution_x, max_resolution_y
function checkCropValues()
{
	local X="${1}"
	local Y="${2}"
	local OFFSET_X="${3}"
	local OFFSET_Y="${4}"
	local MAX_RESOLUTION_X="${5}"
	local MAX_RESOLUTION_Y="${6}"

	local SENSOR_CENTER_X=$(( MAX_RESOLUTION_X / 2 ))
	local SENSOR_CENTER_Y=$(( MAX_RESOLUTION_Y / 2 ))
	local CROP_CENTER_ON_SENSOR_X=$(( SENSOR_CENTER_X + OFFSET_X ))
	# There appears to be a bug in "convert" with "-gravity Center"; the Y offset is applied
	# to the TOP of the image, not the CENTER.
	# The X offset is correctly applied to the image CENTER.
	# Should the division round up or down or truncate (current method)?
	local CROP_CENTER_ON_SENSOR_Y=$(( SENSOR_CENTER_Y + (OFFSET_Y / 2) ))
	local HALF_CROP_WIDTH=$(( X / 2 ))
	local HALF_CROP_HEIGHT=$(( Y / 2 ))

	local CROP_TOP=$(( CROP_CENTER_ON_SENSOR_Y - HALF_CROP_HEIGHT ))
	local CROP_BOTTOM=$(( CROP_CENTER_ON_SENSOR_Y + HALF_CROP_HEIGHT ))
	local CROP_LEFT=$(( CROP_CENTER_ON_SENSOR_X - HALF_CROP_WIDTH ))
	local CROP_RIGHT=$(( CROP_CENTER_ON_SENSOR_X + HALF_CROP_WIDTH ))

	local ERR=""
	if [[ ${CROP_TOP} -lt 0 ]]; then
		ERR="${ERR}\nCROP rectangle goes off the top of the image by ${CROP_TOP#-} pixel(s)."
	fi
	if [[ ${CROP_BOTTOM} -gt ${MAX_RESOLUTION_Y} ]]; then
		ERR="${ERR}\nCROP rectangle goes off the bottom of the image: ${CROP_BOTTOM} is greater than image height (${MAX_RESOLUTION_Y})."
	fi
	if [[ ${CROP_LEFT} -lt 0 ]]; then
		ERR="${ERR}\nCROP rectangle goes off the left of the image: ${CROP_LEFT} is less than 0."
	fi
	if [[ ${CROP_RIGHT} -gt ${MAX_RESOLUTION_X} ]]; then
		ERR="${ERR}\nCROP rectangle goes off the right of the image: ${CROP_RIGHT} is greater than image width (${MAX_RESOLUTION_X})."
	fi

	if [[ -z ${ERR} ]]; then
		return 0
	else
		echo -e "${ERR}"
		return 1
	fi
}
