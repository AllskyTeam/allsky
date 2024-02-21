#!/bin/bash

# Shell functions used by multiple scripts.
# This file is "source"d into others, and must be done AFTER source'ing variables.sh.

SUDO_OK="${SUDO_OK:-false}"
if [[ ${SUDO_OK} == "false" && ${EUID} -eq 0 ]]; then
	echo -e "\n${RED}${ME}: This script must NOT be run as root, do NOT use 'sudo'.${NC}\n" >&2
	exit 1
fi

#####
# Exit with error message and a custom notification image.
function doExit()
{
	local EXITCODE=$1
	local TYPE=${2:-"Error"}
	local CUSTOM_MESSAGE="${3}"		# optional
	local WEBUI_MESSAGE="${4}"		# optional

	case "${TYPE}" in
		"Warning")
			COLOR="yellow"
			;;
		"Error")
			COLOR="red"
			;;
		"NotRunning" | *)
			COLOR="yellow"
			;;
	esac

	OUTPUT_A_MSG="false"
	if [[ -n ${WEBUI_MESSAGE} ]]; then
		[[ ${TYPE} = "no-image" ]] && TYPE="success"
		"${ALLSKY_SCRIPTS}/addMessage.sh" "${TYPE}" "${WEBUI_MESSAGE}"
		echo -e "Stopping Allsky: ${WEBUI_MESSAGE}" >&2
		OUTPUT_A_MSG="true"
	fi

	if [[ ${EXITCODE} -ge ${EXIT_ERROR_STOP} ]]; then
		# With fatal EXIT_ERROR_STOP errors, we can't continue so display a notification image
		# even if the user has them turned off.
		if [[ -n ${CUSTOM_MESSAGE} ]]; then
			# Create a custom error message.
			# If we error out before variables.sh is sourced in,
			# ${FILENAME} and ${EXTENSION} won't be set so guess at what they are.
			"${ALLSKY_SCRIPTS}/generate_notification_images.sh" --directory "${ALLSKY_TMP}" \
				"${FILENAME:-"image"}" \
				"${COLOR}" "" "85" "" "" \
				"" "10" "${COLOR}" "${EXTENSION:-"jpg"}" "" "${CUSTOM_MESSAGE}"
			echo "Stopping Allsky: ${CUSTOM_MESSAGE}"
		elif [[ ${TYPE} != "no-image" ]]; then
			[[ ${OUTPUT_A_MSG} == "false" && ${TYPE} == "RebootNeeded" ]] && echo "Reboot needed"
			"${ALLSKY_SCRIPTS}/copy_notification_image.sh" --expires 0 "${TYPE}" 2>&1
		fi
	fi

	echo "     ***** AllSky Stopped *****"

	# Don't let the service restart us because we'll likely get the same error again.
	[[ ${EXITCODE} -ge ${EXIT_ERROR_STOP} ]] && sudo systemctl stop allsky

	exit "${EXITCODE}"
}


#####
# RPi cameras can use either "raspistill" on Buster or "libcamera-still" on Bullseye
# to actually take pictures.
# Determine which to use.
# On success, return 0 and the command to use.
# On failure, return non-0 and an error message.
function determineCommandToUse()
{
	local USE_doExit="${1}"			# Call doExit() on error?
	local PREFIX="${2}"				# only used if calling doExit()

	# If libcamera is installed and works, use it.
	# If it's not installed, or IS installed but doesn't work (the user may not have it configured),
	# use raspistill.

	local RET=1
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
			echo "Can't determine what command to use for RPi camera." >&2
			if [[ ${USE_doExit} == "true" ]]; then
				doExit "${EXIT_ERROR_STOP}" "Error" "${PREFIX}\nRPi camera command\nnot found!."
			fi

			return 1
		fi

		"${CMD}" --timeout 1 --nopreview > /dev/null 2>&1
		RET=$?
	fi

	if [[ ${RET} -ne 0 ]]; then
		echo "RPi camera not found.  Make sure it's enabled." >&2
		if [[ ${USE_doExit} == "true" ]]; then
			doExit "${EXIT_NO_CAMERA}" "Error" "${PREFIX}\nRPi camera\nnot found!\nMake sure it's enabled."
		fi

		return "${EXIT_NO_CAMERA}"
	fi

	echo "${CMD}"
	return 0
}


#####
# Seach for the specified field in the specified array, and return the index.
# Return -1 on error.
function getJSONarrayIndex()
{
	local JSON_FILE="${1}"
	local PARENT="${2}"
	local FIELD="${3}"
	settings ".${PARENT}" "${JSON_FILE}" | \
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
				EMSG+=" 'N' or 'S'"
			else
				EMSG+=" 'E' or 'W'"
			fi
			EMSG+="; you entered '${LATLONG}'."
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
	#shellcheck source-path=.
	source "${ALLSKY_HOME}/variables.sh"	|| return 1

	[[ -z ${ANGLE} ]] && ANGLE="$( settings ".angle" )"
	[[ -z ${LATITUDE} ]] && LATITUDE="$( settings ".latitude" )"
	[[ -z ${LONGITUDE} ]] && LONGITUDE="$( settings ".longitude" )"

	LATITUDE="$( convertLatLong "${LATITUDE}" "latitude" )"		|| return 2
	LONGITUDE="$( convertLatLong "${LONGITUDE}" "longitude" )"	|| return 2

	echo "Daytime start    Nighttime start   Angle"
	local X="$( sunwait list angle "0" "${LATITUDE}" "${LONGITUDE}" )"
	# Replace comma by several spaces so the output lines up.
	echo "${X/,/           }               0"
	X="$( sunwait list angle "${ANGLE}" "${LATITUDE}" "${LONGITUDE}" )"
	echo "${X/,/           }              ${ANGLE}"
}


#####
# Return which Allsky Websites exist - local, remote, both, none
function whatWebsites()
{
	#shellcheck source-path=.
	source "${ALLSKY_HOME}/variables.sh"	|| return 1

	local HAS_LOCAL="false"
	local HAS_REMOTE="false"

	[[ "$( settings ".uselocalwebsite" )" == "true" ]] && HAS_LOCAL="true"
	[[ "$( settings ".useremotewebsite" )" == "true" ]] && HAS_REMOTE="true"

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
	X="$( curl --show-error --silent "${GIT_FILE}" )"
	RET=$?
	if [[ ${RET} -eq 0 && ${X} != "404: Not Found" ]]; then
		# We really just check if the files are different.
		echo "${X}" > "${DOWNLOADED_FILE}"
		DOWNLOADED_CHECKSUM="$( sum "${DOWNLOADED_FILE}" )"
		MY_CHECKSUM="$( sum "${CURRENT_FILE}" )"
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
# The crop rectangle needs to fit within the image and the numbers be even.
# TODO: should there be a maximum for any number (other than the image size)?
# Number of pixels to crop off top, right, bottom, left, plus max_resolution_x and max_resolution_y.
function checkCropValues()
{
	local CROP_TOP="${1}"
	local CROP_RIGHT="${2}"
	local CROP_BOTTOM="${3}"
	local CROP_LEFT="${4}"
	local MAX_RESOLUTION_X="${5}"
	local MAX_RESOLUTION_Y="${6}"

	local ERR=""
	if [[ ${CROP_TOP} -lt 0 || ${CROP_RIGHT} -lt 0 ||
			${CROP_BOTTOM} -lt 0 || ${CROP_LEFT} -lt 0 ]]; then
		ERR+="\nCrop numbers must all be positive."
	fi
	if [[ $((CROP_TOP % 2)) -eq 1 || $((CROP_RIGHT % 2)) -eq 1 ||
			$((CROP_BOTTOM % 2)) -eq 1 || $((CROP_LEFT % 2)) -eq 1 ]]; then
		ERR+="\nCrop numbers must all be even."
	fi
	if [[ ${CROP_TOP} -gt $((MAX_RESOLUTION_Y -2)) ]]; then
		ERR+="\nCropping on top (${CROP_TOP}) is larger than the image height (${MAX_RESOLUTION_Y})."
	fi
	if [[ ${CROP_RIGHT} -gt $((MAX_RESOLUTION_X - 2)) ]]; then
		ERR+="\nCropping on right (${CROP_RIGHT}) is larger than the image width (${MAX_RESOLUTION_X})."
	fi
	if [[ ${CROP_BOTTOM} -gt $((MAX_RESOLUTION_Y - 2)) ]]; then
		ERR+="\nCropping on bottom (${CROP_BOTTOM}) is larger than the image height (${MAX_RESOLUTION_Y})."
	fi
	if [[ ${CROP_LEFT} -gt $((MAX_RESOLUTION_X - 2)) ]]; then
		ERR+="\nCropping on left (${CROP_LEFT}) is larger than the image width (${MAX_RESOLUTION_X})."
	fi

	if [[ -z ${ERR} ]]; then
		return 0
	else
		echo -e "${ERR}"
		return 1
	fi
}

#####
# The crop rectangle needs to fit within the image, be an even number, and be greater than 0.
# x, y, offset_x, offset_y, max_resolution_x, max_resolution_y
# TODO: remove this after testing.  It's the old way of cropping.
function checkCropValuesOLD()
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
		ERR+="\nCROP rectangle goes off the top of the image by ${CROP_TOP#-} pixel(s)."
	fi
	if [[ ${CROP_BOTTOM} -gt ${MAX_RESOLUTION_Y} ]]; then
		ERR+="\nCROP rectangle goes off the bottom of the image: ${CROP_BOTTOM} is greater than image height (${MAX_RESOLUTION_Y})."
	fi
	if [[ ${CROP_LEFT} -lt 0 ]]; then
		ERR+="\nCROP rectangle goes off the left of the image: ${CROP_LEFT} is less than 0."
	fi
	if [[ ${CROP_RIGHT} -gt ${MAX_RESOLUTION_X} ]]; then
		ERR+="\nCROP rectangle goes off the right of the image: ${CROP_RIGHT} is greater than image width (${MAX_RESOLUTION_X})."
	fi

	if [[ -z ${ERR} ]]; then
		return 0
	else
		echo -e "${ERR}"
		return 1
	fi
}


#####
# Simple way to get a setting that hides the details.
# Most of the time the caller doesn't distinguish between a return of "" and "null",
# so unless --null is passed, return "" instead of "null".
function settings()
{
	local DO_NULL="false"
	[[ ${1} == "--null" ]] && DO_NULL="true" && shift
	local M="${ME:-${FUNCNAME[0]}}"
	local FIELD="${1}"
	# Arrays can't begin with period but everything else should.
	if [[ ${FIELD:0:1} != "." && ${FIELD: -2:2} != "[]" && ${FIELD:0:3} != "if " ]]; then
		echo "${M}: Field names must begin with period '.' (Field='${FIELD}')" >&2
		return 1
	fi

	local FILE="${2:-${SETTINGS_FILE}}"
	if [[ ! -f ${FILE} ]]; then
		echo "${M}: File '${FILE}' does not exist!  Cannot get '${FIELD}'." >&2
		return 2
	fi

	if j="$( jq -r "${FIELD}" "${FILE}" )" ; then
		[[ ${j} == "null" && ${DO_NULL} == "false" ]] && j=""
		echo "${j}"
		return 0
	fi

	echo "${M}: Unable to get json value for '${FIELD}' in '${FILE}." >&2
	
	return 3
}


#####
# Return hard any link(s) to the specified file.
# The links must be in the same directory.
# On success return code 0 and the link(s).
# On failure, return code 1 and an error message.
NO_LINK_=3
function get_links()
{
	local FILE="$1"
	if [[ -z ${FILE} ]]; then
		echo "${FUNCNAME[0]}(): File not specified."
		return 1
	fi
	local DIRNAME="$( dirname "${FILE}" )"

	# shellcheck disable=SC2012
	local INODE="$( /bin/ls -l --inode "${FILE}" 2>/dev/null | cut -f1 -d' ' )"
	if [[ -z ${INODE} ]]; then
		echo "File '${FILE}' not found."
		return 2
	fi

	# Don't include the specified FILE.
	local LINKS="$(
		if [[ ${DIRNAME} == "." ]]; then
			x="./"
		else
			x=""
		fi
		find "${DIRNAME}" -inum "${INODE}" "!" -path "${x}${FILE}" | 
			if [[ -n ${x} ]]; then
				sed -e "s;^${x};;"
			else
				cat
			fi
	)"
	if [[ -z ${LINKS} ]]; then
		echo "No links for '${FILE}'."
		return "${NO_LINK_}"
	fi

	echo "${LINKS}"
	return 0
}


#####
# Make sure the settings file is linked to the camera-specific file.
# Return 0 code and no message if successful, else 1 and return a message.
function check_settings_link()
{
	local FULL_FILE FILE DIRNAME SETTINGS_LINK RET MSG F E CORRECT_NAME
	local CT="cameratype"
	local CM="cameramodel"
	if [[ ${1} == "--uppercase" ]]; then
		CT="cameraType"
		CM="cameraModel"
		shift
	fi

	FULL_FILE="${1}"
	if [[ -z ${FULL_FILE} ]]; then
		echo "${FUNCNAME[0]}(): Settings file not specified."
		return "${EXIT_ERROR_STOP}"
	fi
	if [[ ! -f ${FULL_FILE} ]]; then
		echo "${FUNCNAME[0]}(): File '${FULL_FILE}' not found."
		return 1
	fi
	if [[ -z ${CAMERA_TYPE} ]]; then
		CAMERA_TYPE="$( settings ".${CT}"  "${FULL_FILE}" )"
		[[ $? -ne 0 || -z ${CAMERA_TYPE} ]] && return "${EXIT_ERROR_STOP}"
	fi
	if [[ -z ${CAMERA_MODEL} ]]; then
		CAMERA_MODEL="$( settings ".${CM}"  "${FULL_FILE}" )"
		[[ $? -ne 0 || -z ${CAMERA_TYPE} ]] && return "${EXIT_ERROR_STOP}"
	fi

	DIRNAME="$( dirname "${FULL_FILE}" )"
	FILE="$( basename "${FULL_FILE}" )"
	F="${FILE%.*}"
	E="${FILE##*.}"
	CORRECT_NAME="${F}_${CAMERA_TYPE}_${CAMERA_MODEL}.${E}"
	FULL_CORRECT_NAME="${DIRNAME}/${CORRECT_NAME}"
	SETTINGS_LINK="$( get_links "${FULL_FILE}" )"
	RET=$?
	if [[ ${RET} -ne 0 ]]; then
		MSG="The settings file '${FILE}' was not linked to '${CORRECT_NAME}'"
		[[ ${RET} -ne "${NO_LINK_}" ]] && MSG+="\nERROR: ${SETTINGS_LINK}."
		echo -e "${MSG}$( fix_settings_link "${FULL_FILE}" "${FULL_CORRECT_NAME}" )"
		return 1
	else
		# Make sure it's linked to the correct file.
		if [[ ${SETTINGS_LINK} != "${FULL_CORRECT_NAME}" ]]; then
			MSG="The settings file (${FULL_FILE}) was linked to:"
			MSG+="\n    ${SETTINGS_LINK}"
			MSG+="\nbut should have been linked to:"
			MSG+="\n    ${FULL_CORRECT_NAME}"
			echo -e "${MSG}$( fix_settings_link "${FULL_FILE}" "${FULL_CORRECT_NAME}" )"
			return 1
		fi
	fi

	return 0
}

function fix_settings_link()
{
	local SETTINGS="${1}"
	local LINK="${2}"

	# Often the file to be linked to will exist, it just won't be linked.
	# shellcheck disable=SC2012
	local NEWER="$( /bin/ls -t -1 "${SETTINGS}" "${LINK}" 2>/dev/null | head -1 )"
	if [[ ${NEWER} == "${SETTINGS}" ]]; then
		echo " but has been fixed."
		rm -f "${LINK}"
		ln "${SETTINGS}" "${LINK}"
	else
		# Typically the settings will will be newer than the camera-specific version.
		echo " but has been fixed ('${LINK}' linked to '${SETTINGS}' - this is uncommon)."
		rm -f "${SETTINGS}"
		ln "${LINK}" "${SETTINGS}"
	fi

	return 0
}


####
# Only allow one of the specified process at a time.
function one_instance()
{
	local SLEEP_TIME="5s"
	local MAX_CHECKS=3
	local PID_FILE=""
	local PID=""
	local ABORTED_FILE=""
	local ABORTED_FIELDS=""
	local ABORTED_MSG1=""
	local ABORTED_MSG2=""
	local CAUSED_BY=""

	local OK="true"
	local ERRORS=""
	while [[ $# -gt 0 ]]; do
		ARG="${1}"
		case "${ARG}" in
				--sleep)
					SLEEP_TIME="${2}"
					shift
					;;
				--max-checks)
					MAX_CHECKS=${2}
					shift
					;;
				--pid-file)
					PID_FILE="${2}"
					shift
					;;
				--pid)
					PID="${2}"
					shift
					;;
				--aborted-count-file)
					ABORTED_FILE="${2}"
					shift
					;;
				--aborted-fields)
					ABORTED_FIELDS="${2}"
					shift
					;;
				--aborted-msg1)
					ABORTED_MSG1="${2}"
					shift
					;;
				--aborted-msg2)
					ABORTED_MSG2="${2}"
					shift
					;;
				--caused-by)
					CAUSED_BY="${2}"
					shift
					;;
				*)
					ERRORS="${ERRORS}\nUnknown argument: '${ARG}'."
					OK="false"
					;;
		esac
		shift
	done
	if [[ -z ${PID_FILE} ]]; then
		ERRORS+="\nPID_FILE not specified."
		OK="false"
	fi
	if [[ -z ${ABORTED_FILE} ]]; then
		ERRORS+="\nABORTED_FILE not specified."
		OK="false"
	fi
	if [[ -z ${ABORTED_FIELDS} ]]; then
		ERRORS+="\nABORTED_FIELDS not specified."
		OK="false"
	fi
	if [[ -z ${ABORTED_MSG1} ]]; then
		ERRORS+="\nABORTED_MSG1 not specified."
		OK="false"
	fi
	if [[ -z ${ABORTED_MSG2} ]]; then
		ERRORS+="\nABORTED_MSG2 not specified."
		OK="false"
	fi
	# CAUSED_BY and PID aren't required

	if [[ ${OK} == "false" ]]; then
		echo -e "${RED}${ME}: ERROR: ${ERRORS}.${NC}" >&2
		return 1
	fi


	local NUM_CHECKS=0
	local INITIAL_PID
	while  : ;
	do
		((NUM_CHECKS++))

		[[ ! -f ${PID_FILE} ]] && break

		local CURRENT_PID=$( < "${PID_FILE}" )
		# Check that the process is still running. Looking in /proc is very quick.
		[[ ! -d "/proc/${CURRENT_PID}" ]] && break

		[[ ${NUM_CHECKS} -eq 1 ]] && INITIAL_PID="${CURRENT_PID}"

		# If the PID has changed since the first time we looked,
		# that means another process grabbed the lock.
		# Since there may be several processes waiting, exit.
		if [[ ${NUM_CHECKS} -eq ${MAX_CHECKS} || ${CURRENT_PID} -ne ${INITIAL_PID} ]]; then
			echo -en "${YELLOW}" >&2
			echo -e  "${ABORTED_MSG1}" >&2
			if [[ ${CURRENT_PID} -ne ${INITIAL_PID} ]]; then
				echo -n  "Another process (PID=${CURRENT_PID}) got the lock." >&2
			else
				echo -n  "Made ${NUM_CHECKS} attempts at waiting. Process ${PID} still has lock." >&2
			fi
			echo -n  " If this happens often, check your settings." >&2
			echo -e  "${NC}" >&2
			ps -fp "${CURRENT_PID}" >&2

			# Keep track of aborts so user can be notified.
			# If it's happening often let the user know.
			[[ ! -d ${ALLSKY_ABORTS_DIR} ]] && mkdir "${ALLSKY_ABORTS_DIR}"
			local AF="${ALLSKY_ABORTS_DIR}/${ABORTED_FILE}"
			echo -e "$( date )\t${ABORTED_FIELDS}" >> "${AF}"
			NUM=$( wc -l < "${AF}" )
			if [[ ${NUM} -eq 10 ]]; then
				MSG="${NUM} ${ABORTED_MSG2} have been aborted waiting for others to finish."
				[[ -n ${CAUSED_BY} ]] && MSG+="\n${CAUSED_BY}"
				SEVERITY="warning"
				MSG+="\nOnce you have resolved the cause, reset the aborted counter:"
				MSG+="\n&nbsp; &nbsp; <code>rm -f '${AF}'</code>"
				"${ALLSKY_SCRIPTS}/addMessage.sh" "${SEVERITY}" "${MSG}"
			fi

			return 2
		else
			sleep "${SLEEP_TIME}"
		fi
	done

	[[ -z ${PID} ]] && PID="$$"
	echo "${PID}" > "${PID_FILE}" || return 1

	return 0
}


#####
# Make a thumbnail image.
function make_thumbnail()
{
	local SEC="${1}"
	local INPUT_FILE="${2}"
	local THUMBNAIL="${3}"
	local THUMBNAIL_SIZE_X="$( settings ".thumbnailsizex" )"
	ffmpeg -loglevel error -ss "00:00:${SEC}" -i "${INPUT_FILE}" \
		-filter:v scale="${THUMBNAIL_SIZE_X:-100}:-1" -frames:v 1 "${THUMBNAIL}"
}


#####
# Check if the user was supposed to reboot, and if so, if they did.
# Return 0 if a reboot is needed.
function reboot_needed()
{
	[[ ! -f ${ALLSKY_REBOOT_NEEDED} ]] && return 1

	# The file exists so they were supposed to reboot.
	BEFORE="$( < "${ALLSKY_REBOOT_NEEDED}" )"
	NOW="$( uptime --since )"
	if [[ ${BEFORE} == "${NOW}" ]]; then
		return 0
	else
		rm -f "${ALLSKY_REBOOT_NEEDED}"		# different times so they rebooted
		return 1
	fi
}


####
# Upload to the appropriate Websites and/or servers.
# Everything is put relative to the root directory.
#
# --local-web: copy to local website
# --remote-web: upload to remote website
# --remote-server: upload to remote server
function upload_all()
{
	local ARGS=""
	local LOCAL_WEB="false"
	local REMOTE_WEB="false"
	local REMOTE_SERVER="false"
	while [[ ${1:0:2} == "--" ]]
	do
		if [[ ${1} == "--local-web" ]]; then
			LOCAL_WEB="true"
		elif [[ ${1} == "--remote-web" ]]; then
			REMOTE_WEB="true"
		elif [[ ${1} == "--remote-server" ]]; then
			REMOTE_SERVER="true"
		else
			ARGS="${ARGS} ${1}"
		fi
		shift
	done
	if [[ ${LOCAL_WEB} == "false" && ${REMOTE_WEB} == "false" && ${REMOTE_SERVER} == "false" ]]; then
		LOCAL_WEB="true"
		REMOTE_WEB="true"
		REMOTE_SERVER="true"
	fi

	local UPLOAD_FILE="${1}"
	local SUBDIR="${2}"
	local DESTINATION_NAME="${3}"
	local FILE_TYPE="${4}"		# optional
	local RET=0
	local ROOT REMOTE_DIR
	if [[ ${LOCAL_WEB} == "true" && "$( settings ".uselocalwebsite" )" == "true" ]]; then
		#shellcheck disable=SC2086
		"${ALLSKY_SCRIPTS}/upload.sh" ${ARGS} --local \
			"${UPLOAD_FILE}" "${ALLSKY_WEBSITE}/${SUBDIR}" "${DESTINATION_NAME}"
		((RET+=$?))
	fi
	if [[ ${REMOTE_WEB} == "true" && "$( settings ".useremotewebsite" )" == "true" ]]; then
		ROOT="$( settings ".remotewebsiteimagedir" )"
		if [[ -z ${ROOT} ]]; then
			REMOTE_DIR="${SUBDIR}"
		else
			REMOTE_DIR="${ROOT}/${SUBDIR}"
		fi
		#shellcheck disable=SC2086
		"${ALLSKY_SCRIPTS}/upload.sh" ${ARGS} --remote "web" \
			"${UPLOAD_FILE}" "${REMOTE_DIR}" "${DESTINATION_NAME}" "${FILE_TYPE}"
		((RET+=$?))
	fi
	if [[ ${REMOTE_SERVER} == "true" && "$( settings ".useremoteserver" )" == "true" ]]; then
		ROOT="$( settings ".remoteserverimagedir" )"
		if [[ -z ${ROOT} ]]; then
			REMOTE_DIR="${SUBDIR}"
		else
			REMOTE_DIR="${ROOT}/${SUBDIR}"
		fi
		#shellcheck disable=SC2086
		"${ALLSKY_SCRIPTS}/upload.sh" ${ARGS} --remote "server" \
			"${UPLOAD_FILE}" "${REMOTE_DIR}" "${DESTINATION_NAME}" "${FILE_TYPE}"
		((RET+=$?))
	fi

	return "${RET}"
}


# Indent all lines.
function indent()
{
	echo -e "${1}" | sed 's/^/\t/'
}


# Python virtual environment
PYTHON_VENV_ACTIVATED="false"
activate_python_venv() {

# TODO: will need to change when the OS after bookworm is released
# If our next release is out, it won't support buster so may be check  != bullseye  ?

	if [[ ${PI_OS} == "bookworm" ]]; then
		#shellcheck disable=SC1090,SC1091
		source "${ALLSKY_PYTHON_VENV}/bin/activate" || exit 1
		PYTHON_VENV_ACTIVATED="true"
		return 0	# Successfully activated
	fi
	return 1
}

deactivate_python_venv() {
	[[ ${PYTHON_VENV_ACTIVATED} == "true" ]] && deactivate
}


# Determine if the specified value is a number.
function is_number()
{
	local VALUE="${1}"
	[[ -z ${VALUE} ]] && return 1
	shopt -s extglob
	local NON_NUMERIC="${VALUE/?([-+])*([0-9])?(.)*([0-9])/}"
	if [[ -z ${NON_NUMERIC} ]]; then
		# Nothing but +, -, 0-9, .
		return 0
	else
		# Has non-numeric character
		return 1
	fi
}
