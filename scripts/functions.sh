#!/bin/bash

# Shell functions used by multiple scripts.
# This file is "source"d into others, and must be done AFTER source'ing variables.sh.

# Globals
ZWO_VENDOR="03c3"
# shellcheck disable=SC2034
NOT_STARTED_MSG="Can't start Allsky!"
STOPPED_MSG="Allsky Stopped!"
ERROR_MSG_PREFIX="*** ERROR ***\n${STOPPED_MSG}\n"
FATAL_MSG="FATAL ERROR:"

if [[ ${ON_TTY} == "true" ]]; then
	export NL="\n"
	export SPACES="    "
	export STRONGs=""
	export STRONGe=""
	export WSNs="'"
	export WSNe="'"
	export WSVs="'"
	export WSVe="'"
	export WSFs="'"
	export WSFe="'"
else
	export NL="<br>"
	export SPACES="&nbsp; &nbsp; &nbsp;"
	export STRONGs="<strong>"
	export STRONGe="</strong>"
	export WSNs="<span class='WebUISetting'>"	# Web Setting Name start
	export WSNe="</span>"
	export WSVs="<span class='WebUIValue'>"		# Web Setting Value start
	export WSVe="</span>"
	export WSFs="<span class='fileName'>"		# Web Setting Filename start
	export WSFe="</span>"
fi

##### output messages with appropriate color strings
function O_() { echo -e "${cOK}${1}${cNC}" ; }
function I_() { echo -e "${cINFO}${1}${cNC}" ; }
function W_() { echo -e "${cWARNING}${1}${cNC}" ; }
function E_() { echo -e "${cERROR}${1}${cNC}" ; }
function D_() { echo -e "${cDEBUG}DEBUG: ${1}${cNC}" ; }
function U_() { echo -e "${cUNDERLINE}${1}${cNC}" ; }
function B_() { echo -e "${cBOLD}${1}${cNC}" ; }
# If the output may go to the WebUI:
function wO_() { echo -e "${wOK}${1}${wNC}" ; }
function wI_() { echo -e "${wINFO}${1}${wNC}" ; }
function wW_() { echo -e "${wWARNING}${1}${wNC}" ; }
function wE_() { echo -e "${wERROR}${1}${wNC}" ; }
function wD_() { echo -e "${wDEBUG}DEBUG: ${1}${wNC}" ; }
function wU_() { echo -e "${wUNDERLINE}${1}${wNC}" ; }
function wB_() { echo -e "${wBOLD}${1}${wNBOLD}" ; }
# If the output may go to the "dialog" command (no "-e"):
function dO_() { echo "${DIALOG_OK}${1}${DIALOG_NC}" ; }
function dI_() { echo "${DIALOG_INFO}${1}${DIALOG_NC}" ; }
function dW_() { echo "${DIALOG_WARNING}${1}${DIALOG_NC}" ; }
function dE_() { echo "${DIALOG_ERROR}${1}${DIALOG_NC}" ; }
function dD_() { echo "${DIALOG_DEBUG}DEBUG: ${1}${DIALOG_NC}" ; }
function dU_() { echo "${DIALOG_UNDERLINE}${1}${DIALOG_NC}" ; }
function dB_() { echo "${DIALOG_BOLD}${1}${DIALOG_NC}" ; }

SUDO_OK="${SUDO_OK:-false}"
if [[ ${SUDO_OK} == "false" && ${EUID} -eq 0 ]]; then
	E_ "\n${ME}: This script must NOT be run as root, do NOT use 'sudo'.\n" >&2
	exit 1
fi


##### Start and Stop Allsky
function start_Allsky()
{
	sudo systemctl start allsky 2> /dev/null
}
function stop_Allsky()
{
	sudo systemctl stop allsky 2> /dev/null
}

#####
# Exit with error message and a custom notification image.
function doExit()
{
	local EXITCODE=$1
	local TYPE=${2:-"Error"}
	local CUSTOM_MESSAGE="${3}"		# optional
	local WEBUI_MESSAGE="${4}"		# optional

	local COLOR=""  OUTPUT_A_MSG
	local MSG_TYPE="${TYPE}"

	case "${TYPE,,}" in
		"no-image")
			COLOR="green"
			;;
		"success")
			COLOR="green"
			;;
		"warning" | "info" | "debug")
			COLOR="yellow"
			;;
		"error")
			COLOR="red"
			;;
		"notrunning")
			COLOR="yellow"
			;;
		*)
			# ${TYPE} is the name of a notification image so
			# assume it's for an error.
			COLOR="red"
			MSG_TYPE="Error"
			;;
	esac

	OUTPUT_A_MSG="false"
	if [[ -n ${WEBUI_MESSAGE} ]]; then
		"${ALLSKY_SCRIPTS}/addMessage.sh" --type "${MSG_TYPE}" --msg "${WEBUI_MESSAGE}"
		echo -e "Stopping Allsky: ${WEBUI_MESSAGE}" >&2
		OUTPUT_A_MSG="true"
	fi

	if [[ ${EXITCODE} -ge ${EXIT_ERROR_STOP} ]]; then
		# With fatal EXIT_ERROR_STOP errors, we can't continue so display a notification image
		# even if the user has them turned off.
		if [[ -n ${CUSTOM_MESSAGE} ]]; then
			# Create a custom error message.
			# If we error out before variables.sh is sourced in,
			# ${ALLSKY_FILENAME} and ${ALLSKY_EXTENSION} won't be set so guess what they are.
			"${ALLSKY_SCRIPTS}/generateNotificationImages.sh" --directory "${ALLSKY_CURRENT_DIR}" \
				"${ALLSKY_FILENAME:-"image"}" \
				"${COLOR}" "" "85" "" "" \
				"" "10" "${COLOR}" "${ALLSKY_EXTENSION:-"jpg"}" "" "${CUSTOM_MESSAGE}"
			echo "Stopping Allsky: ${CUSTOM_MESSAGE}"

		elif [[ ${TYPE} != "no-image" ]]; then
			[[ ${OUTPUT_A_MSG} == "false" && ${TYPE} == "RebootNeeded" ]] && echo "Reboot needed"
			"${ALLSKY_SCRIPTS}/copyNotificationImage.sh" --expires 0 "${TYPE}" 2>&1
		fi
	fi

	echo "     ***** Allsky Stopped *****" >&2

	# Don't let the service restart us because we'll likely get the same error again.
	# Stop here so the message above is output first.
	[[ ${EXITCODE} -ge ${EXIT_ERROR_STOP} ]] && stop_Allsky

	exit "${EXITCODE}"
}


#####
# This allows testing from the command line without "return" or doExit() killing the shell.
function test_verify_CAMERA_TYPE()
{
	# "true" == ignore errors
	verify_CAMERA_TYPE "${1}" "true" || echo -e "\nverify_CAMERA_TYPE() returned $?"
}
#####
# Make sure the CAMERA_TYPE is valid.
# This should never happen unless something got corrupted.
# Exit on error.
function verify_CAMERA_TYPE()
{
	local CT="${1}"
	local IGNORE_ERRORS="${2:-false}"

	local OK  MSG  IMAGE_MSG

	OK="true"
	if [[ -z ${CT} ]]; then
		OK="false"
		MSG="'Camera Type' not set in WebUI."
		IMAGE_MSG="${ERROR_MSG_PREFIX}\nCamera Type\nnot specified."

	elif [[ ${CT} != "RPi" && ${CT} != "ZWO" ]]; then
		OK="false"
		MSG="Unknown Camera Type: ${CT}."
		IMAGE_MSG="${ERROR_MSG_PREFIX}\nCamera Type\nnot specified."
	fi

	if [[ ${OK} == "false" ]]; then
		E_ "${FATAL_MSG} ${MSG}" >&2

		if [[ ${IGNORE_ERRORS} != "true" ]]; then
			doExit "${EXIT_NO_CAMERA}" "Error" "${IMAGE_MSG}" "${MSG}"
		fi

		return 1
	fi

	return 0
}

#####
# This allows testing from the command line without "return" or doExit() killing the shell.
function test_determineCommandToUse()
{
	# true == ignore errors
	determineCommandToUse "${1}" "${2}" "true" || echo -e "\ndetermineCommandToUse() returned $?"
}

#####
# RPi cameras can use either libcamera-still or rpicam-still to actually take pictures.
# (libcamera-still was removed from Pi OS mid-2025, but continue checking for
# Pi's that haven't been updated.
# Determine which to use.
# On success, return 0 and the command to use.
# On failure, return non-0 and an error message.
CMD_TO_USE_=""
function determineCommandToUse()
{
	# If we were already called just return the command.
	if [[ -n ${CMD_TO_USE_} ]]; then
		echo "${CMD_TO_USE_}"
		return 0
	fi

	local USE_doExit="${1:-false}"		# Call doExit() on error?
	local PREFIX="${2}"					# Only used if calling doExit().
	local IGNORE_ERRORS="${3:-false}"	# True if just checking

	local RET  MSG  EXIT_MSG
	local NO_CMD_FOUND="Can't determine what command to use for RPi camera;"

	CMD_TO_USE_="rpicam-still"
	if ! command -v "${CMD_TO_USE_}" > /dev/null ; then
		CMD_TO_USE_="libcamera-still"
		if ! command -v "${CMD_TO_USE_}" > /dev/null ; then
			if [[ ${IGNORE_ERRORS} == "false" ]]; then
				MSG="'rpicam-still' and 'libcamera-still' were not found."
				echo "${NO_CMD_FOUND} ${MSG}" >&2
				if [[ ${USE_doExit} == "true" ]]; then
					EXIT_MSG="${PREFIX}\nRPi camera command\nnot found!."
					doExit "${EXIT_ERROR_STOP}" "Error" "${EXIT_MSG}" "${MSG}"
				fi
			# else don't echo anything
			fi

			# No command was found.  This is ok if the user doesn't have an RPi camera.
			# Let the invoker determine what to do.
			return 2
		fi
	fi

	# Found a command - see if it works.
	# If the cable is bad the camera might be found but not work,
	# and the command can hang.

	local ERR="$( timeout 120 "${CMD_TO_USE_}" --timeout 1 --nopreview 2>&1 )"
	RET=$?
	if [[ ${RET} -eq 0 || ${RET} -eq 137 ]]; then
		# If another of these commands is running ours will hang for
		# about a minute then be killed with RET=137.
		# If that happens, assume this is the command to use.
		echo "${CMD_TO_USE_}"
		return 0

	elif [[ ${RET} -eq 124 ]]; then
		# Time out.
		# This usually means a camera exists but there's a problem connecting to it.
		echo "'${CMD_TO_USE_}' timed out." >&2
		return "${EXIT_ERROR_STOP}"

	else
		if [[ ${IGNORE_ERRORS} == "false" ]]; then
			echo "'${CMD_TO_USE_}' failed with return code ${RET}." >&2
			[[ -n ${ERR} ]] && indent "${ERR}" >&2
			if [[ ${USE_doExit} == "true" ]]; then
				EXIT_MSG="${PREFIX}\n${CMD_TO_USE_} failed!"
				doExit "${EXIT_ERROR_STOP}" "Error" "${EXIT_MSG}" "${MSG}"
			fi
		fi
		return 1
	fi
}

#####
# Get information on the connected camera(s), one line per camera.
# Prepend each line with the CAMERA_TYPE.
function get_connected_cameras_info()
{
	local RUN_dCTU="true"		# determine Command To Use
	if [[ ${1} == "--cmd" ]]; then
		RUN_dCTU="false"
		CMD_TO_USE_="${2}"
		shift 2
	fi
	local IGNORE_ERRORS="${1:-false}"

	####### Check for RPi
	# Tab-separated output will be:
	#		RPi  camera_number   camera_sensor
	# for each camera found.
	# camera_sensor will be one word.
	# Only run determineCommandToUse() if it wasn't already run.

	if [[ -z ${CMD_TO_USE_} && ${RUN_dCTU} == "true" ]]; then
		determineCommandToUse "false" "" "${IGNORE_ERRORS}" > /dev/null
	fi
	if [[ -n ${CMD_TO_USE_} ]]; then
		# Input:
		#	camera_number  : sensor  [other stuff]
		LIBCAMERA_LOG_LEVELS=FATAL "${CMD_TO_USE_}" --list-cameras 2>&1 |
			gawk '/^[0-9]/ { printf("%s\t%d\t%s\n", "RPi", $1, $3); }'
	fi

	####### Check for ZWO
	# Keep output similar to RPi:
	#		ZWO  camera_number camera_model
	# for each camera found.
	# lsusb output:
	#	Bus 002 Device 002: ID 03c3:290b ZWO ASI290MM	(newer OS)
	#	1   2   3       4   5  6         7   8
	# or, for really old cameras:
	#	Bus 001 Device 002: ID 03c3:120b ZWOptical company   ASI120MC
	#	1   2   3       4   5  6         7         8         9
	lsusb -d "${ZWO_VENDOR}:" --verbose 2>/dev/null |
	gawk 'BEGIN { num = 0; model = ""; }
		{
			if ($1 == "Bus" && $3 == "Device") {
				ZWO = $7;
				# Check for "ZWOptical company" instead of ZWO on some older cameras
				if (ZWO == "ZWOptical" && $8 == "company") {
					model = $9;
					model_cont = 10;
				} else {
					model = $8;
					model_cont = 9;
				}
				if (model != "") {
					# The model may have multiple tokens.
					for (i=model_cont; i<= NF; i++) {
						# Check for "ASI120 Planetary Camera" on some older cameras.
						if ($i == "Planetary")
							break;
						model = model " " $i;
					}
					printf("ZWO\t%d\t%s\n", num++, model);
					model = "<found>";		# This camera was output
				}
			}
		}'
}


#####
# Get just the model name(s) of the specified camera type that are connected to the Pi.
function get_connected_camera_models()
{
	local FULL="false"
	[[ ${1} == "--full" ]] && FULL="true" && shift

	local TYPE="${1}"
	if [[ -z ${TYPE} ]]; then
		echo "Usage: ${FUNCNAME[0]} type" >&2
		return 1
	fi


	# Input:
	#		ZWO  camera_number  camera_model
	#		RPi  camera_number  camera_sensor

	# Output (tab-separated):
	#	Short:
	#		camera_model
	#	FULL:
	#		ZWO  camera_number  camera_model
	#		RPi  camera_number  camera_model  camera_sensor
	#		1    2              3             4
	#		1    2              3             4

	# For RPi we have the sensor and need the model.
	local PATH="${PATH}:${ALLSKY_UTILITIES}"
	gawk -v TYPE="${TYPE}" -v FULL="${FULL}" --field-separator="\t" '
		{
			camera_type = $1;
			if (camera_type != TYPE && TYPE != "both") next;

			if (camera_type == "ZWO") {
				if (FULL == "true") {
					print $0;
				} else {
					model = $3;
					print model;
				}
			} else {
				sensor = $3;
				"getModelFromSensor.sh " sensor | getline model;
				if (FULL == "true") {
					printf("%s\t%d\t%s\t%s\n", $1, $2, model, sensor);
				} else {
					print model;
				}
			}
		}' "${ALLSKY_CONNECTED_CAMERAS_INFO}"
}


#####
# This allows testing from the command line without "return" or doExit() killing the shell.
function test_validate_camera()
{
	# true == ignore errors
	validate_camera "${1}" "${2}" "${3}" "true" || echo -e "\nvalidate_camera() returned $?"
}

#####
# Check if the current camera is known (i.e., supported by Allsky) and is
# different from the last camera used (i.e., the user changed cameras without telling Allsky).
function validate_camera()
{
	local CT="${1}"		# Camera type
	local CM="${2}"		# Camera model
	local CN="${3}"		# Camera number
	if [[ $# -lt 3 ]]; then
		E_ "\nUsage: ${FUNCNAME[0]} camera_type camera_model camera_number\n" >&2
		return 2
	fi
	local IGNORE_ERRORS="${4:-false}"	# True if just checking

	verify_CAMERA_TYPE "${CT}" "${IGNORE_ERRORS}" || return 2

	local MSG  URL  RET

	# Compare the specified camera to what's in the settings file.
	SETTINGS_CT="$( settings ".cameratype" )"
	SETTINGS_CM="$( settings ".cameramodel" )"
	SETTINGS_CN="$( settings ".cameranumber" )"

	RET=0
	if [[ ${SETTINGS_CT} != "${CT}" ]]; then
		MSG="The Camera Type unexpectedly changed from '${SETTINGS_CT}' to '${CT}'."
		MSG+="\nGo to the 'Allsky Settings' page of the WebUI and"
		MSG+=" change the 'Camera Type' to 'Refresh' then save the settings."
		if [[ ${ON_TTY} == "true" ]]; then
			E_ "\n${MSG}\n"
		else
			URL="/index.php?page=configuration"
			"${ALLSKY_SCRIPTS}/addMessage.sh" --type error --msg "${MSG}" --url "${URL}"
		fi
		RET=1
	elif [[ ${SETTINGS_CM} != "${CM}" ]]; then
		MSG="The Camera Model unexpectedly changed from '${SETTINGS_CM}' to '${CM}'."
		MSG+="\nGo to the 'Allsky Settings' page of the WebUI and"
		MSG+=" change the 'Camera Model' to '${CM}' then save the settings."
		if [[ ${ON_TTY} == "true" ]]; then
			E_ "\n${MSG}\n"
		else
			URL="/index.php?page=configuration"
			"${ALLSKY_SCRIPTS}/addMessage.sh" --type error --msg "${MSG}" --url "${URL}"
		fi
		RET=1
	elif [[ ${SETTINGS_CN} != "${CN}" ]]; then
		MSG="The camera's number unexpectedly changed from '${SETTINGS_CN}' to '${CN}'."
		MSG+="\nGo to the 'Allsky Settings' page of the WebUI and"
		MSG+=" change the 'Camera Type' to 'Refresh' then save the settings."
		if [[ ${ON_TTY} == "true" ]]; then
			E_ "\n${MSG}\n"
		else
			URL="/index.php?page=configuration"
			"${ALLSKY_SCRIPTS}/addMessage.sh" --type error --msg "${MSG}" --url "${URL}"
		fi
		RET=1
	fi

	if [[ ${CT} == "ZWO" ]]; then
		# The camera name per the camera may have "-" in it,
		# but the list of ZWO cameras has "_" instead.
		CM="${CM/ASI/}"		# "ASI" isn't in the names
		CM="${CM//-/_}"
	fi

	# Now make sure the camera is supported.
	if ! "${ALLSKY_UTILITIES}/showSupportedCameras.sh" "--${CT}" |
		grep --silent "${CM}" ; then

		MSG="${CT} camera '${CM}' is not supported by Allsky."
		if [[ ${ON_TTY} == "true" ]]; then
			E_ "\n${MSG}\n"
		else
			MSG+="\n\nClick this message to ask that Allsky support this camera."
			URL="/documentation/explanations/requestCameraSupport.html";
			local CMD_MSG="Click here to see the supported ${CT} cameras."
			[[ ${CT} == "ZWO" ]] && CMD_MSG+=" WARNING: the list is long!"
			"${ALLSKY_SCRIPTS}/addMessage.sh" \
				--id "AM_NOT_SUPPORTED --${CT}" \
				--type warning \
				--msg "${MSG}" \
				--url "${URL}" \
				--cmd "${CMD_MSG}"
		fi

		return 2
	fi

	return "${RET}"
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
	local TYPE="${2^}"						# "Latitude" or "Longitude"
	LATLONG="${LATLONG^^[nsew]}"			# convert any character to uppercase for consistency
	local SIGN="${LATLONG:0:1}"				# First character, may be "-" or "+" or a number
	local DIRECTION="${LATLONG: -1}"						# May be N, S, E, or W, or a number
	[[ ${SIGN} != "+" && ${SIGN} != "-" ]] && SIGN=""		# No sign
	[[ ${DIRECTION%[NSEW]} != "" ]] && DIRECTION="" 		# No N, S, E, or W

	if [[ -z ${DIRECTION} ]]; then
		# No direction
		if [[ -z ${SIGN} ]]; then
			# No sign either
			EMSG="ERROR: ${TYPE} (${LATLONG}) should contain EITHER a '+' or '-', OR a"
			if [[ ${TYPE} == "Latitude" ]]; then
				EMSG+=" 'N' or 'S'"
			else
				EMSG+=" 'E' or 'W'"
			fi
			echo -e "${EMSG}" >&2
			return 1
		fi

		# A number.
	   
		# Make sure it's a valid number.
		if ! is_number "${LATLONG}" ; then
			EMSG="ERROR: ${TYPE} (${LATLONG}) is an invalid number. It should only contain:"
			EMSG+="\n  * Zero or one of EITHER '+' OR '-' at the beginning of the number"
			EMSG+="\n  * One or more of the digits 1 - 9"
			EMSG+="\n  * Zero or one '.'"
			[[ ${LATLONG} =~ "," ]] && EMSG+=" (commas (',') are not allowed)"
			echo -e "${EMSG}" >&2
			return 1
		fi

		# Convert to String with NSEW
		LATLONG="${LATLONG:1}"		# Skip over sign
		if [[ ${SIGN} == "+" ]]; then
			if [[ ${TYPE} == "Latitude" ]]; then
				echo "${LATLONG}N"
			else
				echo "${LATLONG}E"
			fi
		else
			if [[ ${TYPE} == "Latitude" ]]; then
				echo "${LATLONG}S"
			else
				echo "${LATLONG}W"
			fi
		fi
		return 0

	elif [[ -n ${SIGN} ]]; then
		EMSG="ERROR: ${TYPE} (${LATLONG}) should contain EITHER a '${SIGN}' OR a '${DIRECTION}',"
		EMSG+=" but not both."
		echo -e "${EMSG}" >&2
		return 1

	else
		# There's a direction - make sure it's valid for the TYPE.
		if [[ ${TYPE} == "Latitude" ]]; then
			if [[ ${DIRECTION} != "N" && ${DIRECTION} != "S" ]]; then
				echo "ERROR: ${TYPE} (${LATLONG}) should contain a 'N' or 'S'." >&2
				return 1
			fi
		else
			if [[ ${DIRECTION} != "E" && ${DIRECTION} != "W" ]]; then
				echo "ERROR: ${TYPE} (${LATLONG}) should contain an 'E' or 'W'." >&2
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
	local DO_ZERO="false"
	local DO_HEADER="true"

	while [[ $# -gt 0 ]]; do
		ARG="${1}"
		case "${ARG,,}" in
			--zero)
				DO_ZERO="true"
				;;
			--no-header)
				DO_HEADER="false"
				;;
			*)
				break;
				;;
		esac
		shift
	done

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

	local FORMAT="%-15s  %-17s  %6s   %-10s  %-10s\n"
	if [[ ${DO_HEADER} == "true" ]]; then
		echo "Daytime start    Nighttime start     Angle   Latitude    Longitude"
	fi
	local STARTS=()
	# sunwait output:  day_start, night_start
	# Need to get rid of the comma.
	if [[ ${DO_ZERO} == "true" ]]; then
		read -r -a STARTS <<< "$( sunwait list angle "0" "${LATITUDE}" "${LONGITUDE}" )"
		# shellcheck disable=SC2059
		printf "${FORMAT}" "${STARTS[0]/,/}" "${STARTS[1]}" " 0.00" "${LATITUDE}" "${LONGITUDE}"
	fi
	read -r -a STARTS <<< "$( sunwait list angle "${ANGLE}" "${LATITUDE}" "${LONGITUDE}" )"
	ANGLE="$( printf "% 2.2f" "${ANGLE}" )"
	# shellcheck disable=SC2059
	printf "${FORMAT}" "${STARTS[0]/,/}" "${STARTS[1]}" "${ANGLE}" "${LATITUDE}" "${LONGITUDE}"
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
		local BRANCH="${ALLSKY_GITHUB_MAIN_BRANCH}"
	fi

	if [[ $# -ne 3 ]]; then
		echo "Usage: ${FUNCNAME[0]} [--branch b] current_file git_file downloaded_file" >&2
		return 1
	fi

	local CURRENT_FILE="${1}"
	local GIT_FILE="${ALLSKY_GITHUB_RAW_ROOT}/${ALLSKY_GITHUB_ALLSKY_REPO}/${BRANCH}/${2}"
	local DOWNLOADED_FILE="${3}"
	# Download the file and put in DOWNLOADED_FILE
	X="$( curl --show-error --silent "${GIT_FILE}" )"
	RET=$?
	if [[ ${RET} -eq 0 && ${X} != "400: Invalid request" && ${X} != "404: Not Found" ]]; then
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
		echo "ERROR: '${GIT_FILE}' not found!"
		return 2
	fi
}


#####
# Check for a single valid pixel value.
# Pixel sizes must be even.
function checkPixelValue()
{
	local NAME="${1}"
	local MAX_NAME="${2}"
	local VALUE="${3}"
	local MIN=${4}
	local MAX="${5}"

	[[ ${VALUE} -eq 0 ]] && return 0

	local MIN_MSG   MAX_MSG
	if [[ ${MIN} == "any" ]]; then
		MIN="-99999999"		# a number we'll never go below
		MIN_MSG="an integer"
	else
		MIN_MSG="an even integer from ${MIN}"
	fi
	if [[ ${MAX} == "any" ]]; then
		MAX="99999999"		# a number we'll never go above
		MAX_MSG=""
	else
		MAX_MSG=" up to the ${MAX_NAME} of ${MAX}"
	fi

	if [[ ${VALUE} != +([-+0-9]) ||
		  $((VALUE % 2)) -eq 1 ||
		  ${VALUE} -lt ${MIN} ||
		  ${VALUE} -gt ${MAX} ]]; then
		echo "${WSNs}${NAME}${WSNe} (${VALUE}) must be ${MIN_MSG}${MAX_MSG}." >&2
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
		ERR+="${wBR}Crop numbers must all be positive."
	fi
	if [[ $((CROP_TOP % 2)) -eq 1 || $((CROP_RIGHT % 2)) -eq 1 ||
			$((CROP_BOTTOM % 2)) -eq 1 || $((CROP_LEFT % 2)) -eq 1 ]]; then
		ERR+="${wBR}Crop numbers must all be even."
	fi
	if [[ ${CROP_TOP} -gt $((MAX_RESOLUTION_Y -2)) ]]; then
		ERR+="${wBR}Cropping on top (${CROP_TOP}) is larger than the image height (${MAX_RESOLUTION_Y})."
	fi
	if [[ ${CROP_RIGHT} -gt $((MAX_RESOLUTION_X - 2)) ]]; then
		ERR+="${wBR}Cropping on right (${CROP_RIGHT}) is larger than the image width (${MAX_RESOLUTION_X})."
	fi
	if [[ ${CROP_BOTTOM} -gt $((MAX_RESOLUTION_Y - 2)) ]]; then
		ERR+="${wBR}Cropping on bottom (${CROP_BOTTOM}) is larger than the image height (${MAX_RESOLUTION_Y})."
	fi
	if [[ ${CROP_LEFT} -gt $((MAX_RESOLUTION_X - 2)) ]]; then
		ERR+="${wBR}Cropping on left (${CROP_LEFT}) is larger than the image width (${MAX_RESOLUTION_X})."
	fi

	if [[ -z ${ERR} ]]; then
		return 0
	else
		echo -e "${ERR}" >&2
		echo "Crop settings: top: ${CROP_TOP}, right: ${CROP_RIGHT}, bottom: ${CROP_BOTTOM}, left: ${CROP_LEFT}" >&2
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

	local FILE="${2:-${ALLSKY_SETTINGS_FILE}}"
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
	local INODE="$( stat --printf="%i" "${FILE}" 2>/dev/null )"
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
	CORRECT_NAME="${F}_${CAMERA_TYPE}_${CAMERA_MODEL// /_}.${E}"
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
		case "${ARG,,}" in
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
					ERRORS+="\nUnknown argument: '${ARG}'."
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
		E_ "${ME}: ERROR: ${ERRORS}." >&2
		return 1
	fi


	[[ -z ${PID} ]] && PID="$$"
	local NUM_CHECKS=0
	local INITIAL_PID
	while  :
	do
		((NUM_CHECKS++))

		[[ ! -f ${PID_FILE} ]] && break

		local CURRENT_PID=$( < "${PID_FILE}" )
		# Check that the process is still running. Looking in /proc is very quick.
		[[ ! -d "/proc/${CURRENT_PID}" ]] && break

		[[ ${NUM_CHECKS} -eq 1 ]] && INITIAL_PID="${CURRENT_PID}"

		# If the INITIAL_PID has changed since the first time we looked,
		# that means another process grabbed the lock.
		# Since there may be several processes waiting, exit.
		if [[ ${NUM_CHECKS} -eq ${MAX_CHECKS} || ${CURRENT_PID} -ne ${INITIAL_PID} ]]; then
			local MSG="${ABORTED_MSG1}"
			if [[ ${CURRENT_PID} -ne ${INITIAL_PID} ]]; then
				MSG+="Another process (PID=${CURRENT_PID}) got the lock."
			else
				MSG+="Made ${NUM_CHECKS} attempts at waiting."
				MSG+=" Process ${CURRENT_PID} still has lock."
			fi
			MSG+=" If this happens often, check your settings. PID=${PID}"
			E_ "${MSG}"
			ps -fp "${CURRENT_PID}" >&2

			# Keep track of aborts so user can be notified.
			# If it's happening often let the user know.
			[[ ! -d ${ALLSKY_ABORTS_DIR} ]] && mkdir "${ALLSKY_ABORTS_DIR}"
			local AF="${ALLSKY_ABORTS_DIR}/${ABORTED_FILE}"
			local ID="AM_RM_ABORTS ${ABORTED_FILE}"
			echo -e "$( date )\t${ABORTED_FIELDS}" >> "${AF}"
			NUM=$( wc -l < "${AF}" )
			if [[ ${NUM} -eq 10 ]]; then
				MSG="${NUM} ${ABORTED_MSG2} have been aborted waiting for others to finish."
				[[ -n ${CAUSED_BY} ]] && MSG+="\n${CAUSED_BY}"
				SEVERITY="warning"
				MSG+="\nOnce you have resolved the cause,"
				"${ALLSKY_SCRIPTS}/addMessage.sh" \
					--type ${SEVERITY} \
					--no-date \
					--id "${ID}" --cmd "click here to reset the counter" \
					--msg "${MSG}"
			fi

			return 2
		else
			sleep "${SLEEP_TIME}"
		fi
	done

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
# Create the reboot-is-needed file.
function set_reboot_needed()
{
	uptime --since > "${ALLSKY_REBOOT_NEEDED}"
}

#####
# Check if the user was supposed to reboot, and if so, if they did.
# Return 0 if a reboot is needed.
function reboot_needed()
{
	[[ ! -f ${ALLSKY_REBOOT_NEEDED} ]] && return 1

	# The file exists and has the uptime as of when the file was created.
	# If the Pi has rebooted since the file was created,
	# the current uptime and saved uptime will be different,
	# so the file is outdated so delete it.

	local PRIOR_UPTIME="$( < "${ALLSKY_REBOOT_NEEDED}" )"
	local CURRENT_UPTIME="$( uptime --since )"
	if [[ ${PRIOR_UPTIME} == "${CURRENT_UPTIME}" ]]; then
		# No reboot; still need to reboot.
		return 0
	else
		# Different uptimes so they rebooted.
		rm -f "${ALLSKY_REBOOT_NEEDED}"
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
	local LOCAL_WEB=""
	local REMOTE_WEB=""
	local REMOTE_SERVER=""
	local SILENT=""
	local NUM=0
	while [[ ${1:0:2} == "--" ]]
	do
		ARG="${1,,}"
		if [[ ${ARG} == "--local-web" ]]; then
			LOCAL_WEB="${ARG}"
			(( NUM++ ))
		elif [[ ${ARG} == "--remote-web" ]]; then
			REMOTE_WEB="${ARG}"
			(( NUM++ ))
		elif [[ ${ARG} == "--remote-server" ]]; then
			REMOTE_SERVER="${ARG}"
			(( NUM++ ))
		elif [[ ${ARG} == "--silent" ]]; then
			SILENT="${ARG}"
		else
			ARGS+=" ${ARG}"
		fi
		shift
	done

	# If no locations specified, try them all.
	if [[ ${NUM} -eq 0 ]]; then
		LOCAL_WEB="--local-web"
		REMOTE_WEB="--remote-web"
		REMOTE_SERVER="--remote-server"
	fi

	local UPLOAD_FILE="${1}"
	local SUBDIR="${2}"
	local DESTINATION_NAME="${3}"
	local FILE_TYPE="${4}"		# optional
	local RET=0
	local ROOT  REMOTE_DIR

	if [[ -n ${LOCAL_WEB} && "$( settings ".uselocalwebsite" )" == "true" ]]; then
		#shellcheck disable=SC2086
		"${ALLSKY_SCRIPTS}/upload.sh" ${SILENT} ${ARGS} "${LOCAL_WEB}" \
			"${UPLOAD_FILE}" "${SUBDIR}" "${DESTINATION_NAME}"
		((RET+=$?))
	fi

	if [[ -n ${REMOTE_WEB} && "$( settings ".useremotewebsite" )" == "true" ]]; then
		ROOT="$( settings ".remotewebsiteimagedir" )"
		if [[ -z ${ROOT} ]]; then
			REMOTE_DIR="${SUBDIR}"
		else
			REMOTE_DIR="${ROOT}"
			[[ ${ROOT: -1:1} != "/" ]] && REMOTE_DIR+="/"
			REMOTE_DIR+="${SUBDIR}"
		fi
		#shellcheck disable=SC2086
		"${ALLSKY_SCRIPTS}/upload.sh" ${SILENT} ${ARGS} "${REMOTE_WEB}" \
			"${UPLOAD_FILE}" "${REMOTE_DIR}" "${DESTINATION_NAME}" "${FILE_TYPE}-website"
		((RET+=$?))
	fi

	if [[ -n ${REMOTE_SERVER} && "$( settings ".useremoteserver" )" == "true" ]]; then
		ROOT="$( settings ".remoteserverimagedir" )"
		if [[ -z ${ROOT} ]]; then
			REMOTE_DIR="${SUBDIR}"
		else
			REMOTE_DIR="${ROOT}/${SUBDIR}"
		fi
		#shellcheck disable=SC2086
		"${ALLSKY_SCRIPTS}/upload.sh" ${SILENT} ${ARGS} "${REMOTE_SERVER}" \
			"${UPLOAD_FILE}" "${REMOTE_DIR}" "${DESTINATION_NAME}" "${FILE_TYPE}-server"
		((RET+=$?))
	fi

	return "${RET}"
}


# Indent all lines.
function indent()
{
	local INDENT
	if [[ ${1} == "--spaces" ]]; then
		INDENT="    "
		shift
	elif [[ ${1} == "--html" ]]; then
		INDENT="\&nbsp;\&nbsp;\&nbsp;\&nbsp;"
		shift
	else
		INDENT="	"	# tab
	fi
	echo -e "${1}" | sed "s/^/${INDENT}/"
}


# Python virtual environments
PYTHON_VENV_ACTIVATED="false"
function activate_python_venv()
{
	# TODO: will need to change when the OS after Bookworm is released.
	# Maybe check for != bullseye  ?

	local ACTIVATE="${ALLSKY_PYTHON_VENV}/bin/activate"

	#shellcheck disable=SC1090,SC1091
	source "${ACTIVATE}" || exit 1
	PYTHON_VENV_ACTIVATED="true"
	return 0	# Successfully activated
}

function deactivate_python_venv()
{
	[[ ${PYTHON_VENV_ACTIVATED} == "true" ]] && deactivate
}


PYTHON_SERVER_VENV_ACTIVATED="false"
function activate_python_server_venv()
{
	# TODO: will need to change when the OS after Bookworm is released.
	# Maybe check for != bullseye  ?

	local ACTIVATE="${ALLSKY_PYTHON_SERVER_VENV}/bin/activate"

	#shellcheck disable=SC1090,SC1091
	source "${ACTIVATE}" || exit 1
	PYTHON_SERVER_VENV_ACTIVATED="true"
	return 0	# Successfully activated

}

function deactivate_python_server_venv()
{
	[[ ${PYTHON_SERVER_VENV_ACTIVATED} == "true" ]] && deactivate
}



# Determine if the specified value is a number.
function is_number()
{
	local VALUE="${1}"
	[[ -z ${VALUE} ]] && return 1
	shopt -s extglob
	local NON_NUMERIC="${VALUE/?([-+])*([0-9])?(.)*([0-9])/}"
	if [[ -z ${NON_NUMERIC} ]]; then
		# Nothing but +, -, 0-9, or .
		return 0
	else
		# Has non-numeric character
		return 1
	fi
}


####
# Set the Allsky status along with a timestamp.
function set_allsky_status()
{
	local STATUS="${1}"		# can be ""

	local TIMESTAMP="$( date +'%Y-%m-%d %H:%M:%S' )"

	if which jq >/dev/null ; then
		local S=".status = \"${STATUS}\""
		local T=".timestamp = \"${TIMESTAMP}\""
		echo "{ }" | jq --indent 4 "${S} | ${T}" > "${ALLSKY_STATUS}"
	else
		echo "{ \"status\" : \"${STATUS}\", \"timestamp\" : \"${TIMESTAMP}\" }" > "${ALLSKY_STATUS}"
	fi
}
function get_allsky_status()
{
	settings ".status" "${ALLSKY_STATUS}" 2> /dev/null
}
function get_allsky_status_timestamp()
{
	settings ".timestamp" "${ALLSKY_STATUS}" 2> /dev/null
}


####
# Get the RPi camera model given its sensor name.
function get_model_from_sensor()
{
	local SENSOR="${1}"

	# shellcheck disable=SC2154
	gawk --field-separator '\t' -v sensor="${SENSOR}" '
		BEGIN {
			if (sensor == "") {
				printf("ERROR: No sensor specified.\n");
				ok = "false";
				exit(1);
			}
			model = "";
			ok = "true";
		}
		{
			if ($1 == "camera") {
				module = $2;
				module_len = $3;
				if ((module_len == 0 && module == sensor) ||
					(module == substr(sensor, 0, module_len))) {

					model = $4;
					exit(0);
				}
			}
				
		}
		END {
			if (ok == "false") {
				exit(1);
			}

			if (model != "") {
				print model;
				exit(0);
			} else {
				printf("unknown_sensor_%s\n", sensor);
				exit(1);
			}
		} ' "${ALLSKY_RPi_SUPPORTED_CAMERAS}"
}


####
# Get the RPi camera model given its sensor name.
function execute_web_commands()
{
	local URL="${1}"

	curl --user-agent Allsky --silent --location "${URL}/runCommands.php"
}

####
# Get everthing in between "START info" and "END info".
# Ignore any WARNING messages (we'll often have a certificate warning).
# Return 0 if we found the start, even if nothing's there.
function get_ls_contents()
{
	local FILE="${1}"

	nawk 'BEGIN { in_info = 0; dir = ""; }
		{
			if ($0 == "START info") {
				in_info = 1;
			} else if ($0 == "END info") {
				exit(0);
			} else if (in_info >= 1) {
				if (in_info++ == 1) {
					printf("Contents:\n");
				}
				if ($1 != "WARNING:")
					print $0;
			}
		}
		END {
			exit(! in_info);
		}' "${FILE}"
}

####
# Get all settings at once rather than individually via settings().
# --var "variable1 ..." gets only the specified variables.
function getAllSettings()
{
	local M="${ME:-${FUNCNAME[0]}}"
	local VAR=""
	local PREFIX="S_"
	while [[ ${1:0:1} == "-" ]]
	do
		if [[ ${1} == "--var" ]]; then
			VAR="${2//	/ }"	# Convert tabs to spaces for convertJSON.php
			shift
		elif [[ ${1} == "--prefix" ]]; then
			PREFIX="${2}"
			shift
		else
			echo "${M}: ERROR: Unknown argument: ${1}." >&2
			return 2
		fi
		shift
	done
	local X

	#shellcheck disable=SC2086
	if ! X="$( "${ALLSKY_SCRIPTS}/convertJSON.php" --prefix "${PREFIX}" --shell --variables "${VAR}" 2>&1 )" ; then
		echo "${X}"
		return 1
	fi
	eval "${X}"
	return 0
}

####
# If uploads are enabled, upload the specified file which will
# likely be a notification image.
function processAndUploadImage()
{
	local IMAGE_FILE="${1}"
	local NOTIFICATION_FILE="${2}"

	local M="${ME:-${FUNCNAME[0]}}"

	# Get all settings we're going to use.  Their bash names are prefixed by "S_".
	# shellcheck disable=SC2119
	getAllSettings --var "imageuploadfrequency imageresizeuploadswidth \
		imageresizeuploadsheight" || return 1

	# shellcheck disable=SC2154
	if [[ ${S_imageuploadfrequency} -eq 0 ]]; then
		# Not uploading images so we're done.
		return 0
	fi

	# Upload the image, resizing first if needed.

	# shellcheck disable=SC2154
	if [[ ${S_imageresizeuploadswidth} -gt 0 ]]; then
		# Don't overwrite IMAGE_FILE since the web server(s) may be looking at it.
		TEMP_FILE="${ALLSKY_CURRENT_DIR}/resize-${ALLSKY_FULL_FILENAME}"
	
		# create temporary copy to resize
		if ! cp "${IMAGE_FILE}" "${TEMP_FILE}" ; then
			E_ "*** ${M}: ERROR: Cannot copy to TEMP_FILE: '${IMAGE_FILE}' to '${TEMP_FILE}'."
			return 1
		fi
		# shellcheck disable=SC2154
		if ! convert "${TEMP_FILE}" \
				-resize "${S_imageresizeuploadswidth}x${S_imageresizeuploadsheight}" \
				-gravity East \
				-chop 2x0 "${TEMP_FILE}" ; then
			E_ "*** ${M}: ERROR: Unable to resize '${TEMP_FILE}' - file left for debugging."
			return 2
		fi
		UPLOAD_FILE="${TEMP_FILE}"
	else
		UPLOAD_FILE="${IMAGE_FILE}"
		TEMP_FILE=""
	fi

	if [[ ${ALLSKY_DEBUG_LEVEL} -ge 4 ]]; then
		# We're actually uploading ${UPLOAD_FILE},
		# but show ${NOTIFICATION_FILE} in the message since it's more descriptive.
		echo -e "${M}: Uploading $( basename "${NOTIFICATION_FILE}" )"
	fi

	# If an existing notification is being uploaded,
	# wait for it to finish then upload this one (--wait).
	upload_all --remote-web --remote-server --wait --silent \
		"${UPLOAD_FILE}" "" "${ALLSKY_FULL_FILENAME}" "NotificationImage"
	RET=$?

	# If we created a temporary copy, delete it.
	[[ ${TEMP_FILE} != "" ]] && rm -f "${TEMP_FILE}"

	return "${RET}"
}

#####
# Strip out all color escape sequences.
# The message may have an actual escape character or may have the
# four characters "\033" which represent an escape character.

# I don't know how to replace "\n" with an actual newline in sed,
# and there HAS to be a better way to strip the escape sequences.
# I simply replace actual escape characters in the input with "033" then
# replace "033[" with "033X".
# Feel free to improve...
function remove_colors()
{
	local MSG="${1}"

	local ESC="$( echo -en '\033' )"

	# Ignore any initial "\" in the colors.
	# In case a variable isn't defined, set it to a string that won't be found.
	local B="${cBOLD/\\/}"		; B="${B:-abcxyz}"	; B="${B/033\[/033X}"
	local G="${cGREEN/\\/}"		; G="${G:-abcxyz}"	; G="${G/033\[/033X}"
	local Y="${cYELLOW/\\/}"	; Y="${Y:-abcxyz}"	; Y="${Y/033\[/033X}"
	local R="${cRED/\\/}"		; R="${R:-abcxyz}"	; R="${R/033\[/033X}"
	#shellcheck disable=SC2154
	local D="${cDEBUG/\\/}"		; D="${D:-abcxyz}"	; D="${D/033\[/033X}"
	local N="${cNC/\\/}"		; N="${N:-abcxyz}"	; N="${N/033\[/033X}"

	# Outer "echo -e" handles "\n" (2 characters) in input.
	# No "-e" needed on inner "echo".
	# \Z. entries are dialog(1) colors.
	echo -e "$( echo "${MSG}" |
		sed -e "s/${ESC}/033/g" \
			-e "s/033\[0m//g" \
			-e "s/033\[31m//g" \
			-e "s/033\[/033X/g" \
			-e "s/${G}//g" \
			-e "s/${Y}//g" \
			-e "s/${R}//g" \
			-e "s/${D}//g" \
			-e "s/${N}//g" \
			-e "s/\\\Z.//g" \
	)"
}


#####
# Add very basic text to an image.
addTextToImage()
{
	local POINT_SIZE=""
	local FONT="${ALLSKY_OVERLAY}/system_fonts/Courier_New_Bold.ttf"
	local STROKE="black"
	local STROKE_WIDTH="2"
	local FILL="yellow"
	local X="20"
	local Y=""
	local EXTRA_ARGS=""

	while [[ $# -gt 0 ]]; do
		ARG="${1}"
		case "${ARG,,}" in
			--point-size)
				POINT_SIZE="${2}"
				shift
				;;
			--font)
				FONT="${2}"
				shift
				;;
			--stroke)
				STROKE="${2}"
				shift
				;;
			--stroke-width)
				STROKE_WIDTH="${2}"
				shift
				;;
			--fill)
				FILL="${2}"
				shift
				;;
			--x)
				X="${2}"
				shift
				;;
			--y)
				Y="${2}"
				shift
				;;
			--extra-args)
				# An additional step, like stretch an image, to perform at
				# same time to avoid calling "convert" twice.
				EXTRA_ARGS="${2}"
				shift
				;;
			--*)
				E_ "Unknown argument: ${ARG}" >&2
				;;
			*)
				break;
				;;
		esac
		shift
	done

	local IN_IMAGE="${1}"
	local OUT_IMAGE="${2}"
	local TEXT="${3}"

	# "identify" output:
	#	image.jpg JPEG 4056x3040 4056x3040+0+0 8-bit sRGB 1.8263MiB 0.000u 0:00.000
	local RESOLUTION="$( identify "${IN_IMAGE}" | gawk '{ print $3; }' )"
	local WIDTH="${RESOLUTION%x*}"
	local HEIGHT="${RESOLUTION##*x}"

	# If the location wasn't specified put text in bottom left.
	[[ -z ${POINT_SIZE} ]] && POINT_SIZE="$( echo "${WIDTH} / 33" | bc )"
	if [[ -z ${Y} ]]; then
		Y=$(( HEIGHT - ( POINT_SIZE * 2) ))
	elif [[ ${Y} -lt 0 ]]; then
		# relative to the bottom of the image
		Y=$(( HEIGHT + Y - ( POINT_SIZE * 2) ))
	fi

	#shellcheck disable=SC2086
	convert ${EXTRA_ARGS} -font "${FONT}" -pointsize "${POINT_SIZE}" \
		-fill "${FILL}" -stroke "${STROKE}" -strokewidth "${STROKE_WIDTH}" \
		-annotate "+${X}+${Y}" "${TEXT}" \
		"${IN_IMAGE}" "${OUT_IMAGE}" 2>&1
}
