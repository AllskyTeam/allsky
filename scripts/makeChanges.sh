#!/bin/bash
# shellcheck disable=SC2154		# referenced but not assigned - from convertJSON.php

# Allow this script to be executed manually, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/installUpgradeFunctions.sh"	|| exit "${EXIT_ERROR_STOP}"

function usage_and_exit()
{
	{
		echo -en "${wERROR}"
		echo     "Usage: ${ME} [--debug] [--optionsOnly] [--cameraTypeOnly] [--fromInstall]"
		echo -en "\tkey label old_value new_value [...]"
		echo -e  "${wNC}"
		echo "There must be a multiple of 4 key/label/old_value/new_value arguments"
		echo "unless the --optionsOnly argument is given."
	} >&2
	exit "${1}"
}

# Check arguments
OK="true"
DEBUG="false"
DEBUG_ARG=""
HELP="false"
OPTIONS_FILE_ONLY="false"
CAMERA_TYPE_ONLY="false"	# Only update the cameratype?
FROM_INSTALL="false"		# Called from install.sh ?
FORCE=""					# Passed to createAllskyOptions.php

while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
		--debug)
			DEBUG="true"
			DEBUG_ARG="${ARG}"		# So we can pass to other scripts
			;;
		--help)
			HELP="true"
			;;
		--optionsonly)
			OPTIONS_FILE_ONLY="true"
			SETTINGS_FILE=""
			;;
		--cameratypeonly)
			CAMERA_TYPE_ONLY="true"
			;;
		--frominstall)
			FROM_INSTALL="true"
			;;
		--force)
			FORCE="${ARG}"
			;;
		-*)
			echo -e "${wERROR}ERROR: Unknown argument: '${ARG}'${wNC}"
			OK="false"
			;;
		*)
			break
			;;
	esac
	shift
done

[[ ${HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" ]] && usage_and_exit 1
if [[ ${OPTIONS_FILE_ONLY} == "false" ]]; then
	[[ $# -eq 0 ]] && usage_and_exit 1
	[[ $(($# % 4)) -ne 0 ]] && usage_and_exit 2
fi

if [[ ${ON_TTY} == "false" ]]; then		# called from WebUI.
	ERROR_PREFIX=""
else
	ERROR_PREFIX="${ME}: "
fi

RUN_POSTTOMAP="false"
POSTTOMAP_ACTION=""
WEBSITE_CONFIG=()
WEB_CONFIG_FILE=""
HAS_WEBSITE_RET=""
WEBSITES=""		# local, remote, both, none
GOT_WARNING="false"
SHOW_ON_MAP=""
CHECK_REMOTE_WEBSITE_ACCESS="false"
CHECK_REMOTE_SERVER_ACCESS="false"
USE_REMOTE_WEBSITE=""
USE_REMOTE_SERVER=""

# Several of the fields are in the Allsky Website configuration file,
# so check if the IS a file before trying to update it.
# Return 0 on found and 1 on not found.
# The first time we're called, set ${WEBSITES}
function check_website()
{
	[[ -n ${HAS_WEBSITE_RET} ]] && return "${HAS_WEBSITE_RET}"		# already checked

	WEBSITES="$( whatWebsites )"
	if [[ ${WEBSITES} == "local" || ${WEBSITES} == "both" ]]; then
		WEB_CONFIG_FILE="${ALLSKY_WEBSITE_CONFIGURATION_FILE}"
		HAS_WEBSITE_RET=0
	elif [[ ${WEBSITES} == "remote" ]]; then
		WEB_CONFIG_FILE="${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}"
		HAS_WEBSITE_RET=0
	else
		WEB_CONFIG_FILE=""
		HAS_WEBSITE_RET=1
	fi
	return "${HAS_WEBSITE_RET}"
}

# Get all settings at once rather than individually via settings().
if [[ -f ${SETTINGS_FILE} ]]; then
	# check_website requires the settings file to exist.
	# If it doesn't we are likely called from the install script before the file is created.
	check_website		# invoke to set variables

	X="$( "${ALLSKY_SCRIPTS}/convertJSON.php" --prefix S_ --shell )"
	if [[ $? -ne 0 ]]; then
		echo "${X}"
		exit 1
	fi
	eval "${X}"
fi
if [[ -f ${CC_FILE} ]]; then
	# "convertJSON.php" won't work with the CC_FILE since it has arrays.
	C_sensorWidth="$( settings ".sensorWidth" "${CC_FILE}" )"
	C_sensorHeight="$( settings ".sensorHeight" "${CC_FILE}" )"
fi


# Make sure RAW16 files have a .png extension.
function check_filename_type()
{
	local EXTENSION="${1##*.}"		# filename is passed in - get just the extension
	local TYPE="$2"
	
	if [[ ${TYPE} -eq 2 ]]; then		# 2 is RAW16 in allsky_common.h - it must match
		if [[ ${EXTENSION,,} != "png" ]]; then
			echo -en "${wERROR}${ERROR_PREFIX}"
			echo -n "ERROR: RAW16 images only work with .png files"
			echo -n "; either change the Image Type or the Filename."
			echo -e "${wNC}"
			return 1
		fi
	fi
	return 0
}

CAMERA_NUMBER=0			# default
CAMERA_NUMBER_ARG=""
CAMERA_MODEL=""
CAMERA_MODEL_ARG=""

NUM_CHANGED=0

while [[ $# -gt 0 ]]
do
	KEY="${1}"
	LABEL="${2}"
	OLD_VALUE="${3}"
	NEW_VALUE="${4}"

	if [[ ${DEBUG} == "true" ]]; then
		MSG="${KEY}: Old=[${OLD_VALUE}], New=[${NEW_VALUE}]"
		echo -e "${wDEBUG}${ME}: ${MSG}${wNC}"
		if [[ ${ON_TTY} == "false" ]]; then		# called from WebUI.
			echo -e "<script>console.log('${MSG}');</script>"
		fi
	fi

	KEY="${KEY,,}"		# convert to lowercase
	KEY="${KEY/#_/}"	# Remove any leading "_"

	# Don't skip if it's cameratype since that indicates we need to refresh.
	if [[ ${KEY} != "cameratype" && ${OLD_VALUE} == "${NEW_VALUE}" ]]; then
		if [[ ${DEBUG} == "true" ]]; then
			echo -e "    ${wDEBUG}Skipping - old and new are equal${wNC}"
		fi
		shift 4
		continue
	fi

	# The Allsky configuration file was already updated.
	# If we find a bad entry, e.g., a file doesn't exist, all we can do is warn the user.

	((NUM_CHANGED++))
	case "${KEY}" in

		# When called from the installer we get cameranumber, cameramodel, and cameratype.
		# This is the only time cameranumber should be used since it could change if,
		# for example, a user removes a camera.
		# When called from the WebUI we only get what the user changed which is
		# only cameramodel OR cameratype.
		"cameranumber")
			CAMERA_NUMBER="${NEW_VALUE}"
			CAMERA_NUMBER_ARG=" -cameranumber ${CAMERA_NUMBER}"
			;;

		"cameramodel" | "cameratype")
			if [[ ${KEY} == "cameramodel" ]]; then
				CAMERA_MODEL="${NEW_VALUE}"

				if [[ ${FROM_INSTALL} == "true" ]]; then
					# When called during installation the camera model is
					# passed in, then the camera type.
					shift 4
					continue
				fi
				CAMERA_TYPE="$( settings ".cameratype" )"

			else
				CAMERA_TYPE="${NEW_VALUE}"
				if [[ ! -e "${ALLSKY_BIN}/capture_${CAMERA_TYPE}" ]]; then
					MSG="Unknown Camera Type: '${CAMERA_TYPE}'."
					echo -e "${wERROR}${ERROR_PREFIX}ERROR: ${MSG}${wNC}"
					exit "${EXIT_NO_CAMERA}"
				fi
			fi

			if [[ -n ${CAMERA_MODEL} ]]; then
if false; then
# ##### TODO: I'm pretty sure this is NOT true...
				if [[ ${CAMERA_TYPE} == "RPi" ]]; then
					# For RPi cameras the "model" is actually the sensor name,
					# so convert it into the "real" model name and save it.
					CAMERA_MODEL="$( get_model_from_sensor "${CAMERA_MODEL}" )"
				fi
fi
			fi

			# This requires Allsky to be stopped so we don't
			# try to call the capture program while it's already running.
			stop_Allsky

			if [[ ${OPTIONS_FILE_ONLY} == "false" ]]; then

				# If we can't set the new camera type, it's a major problem so exit right away.
				# NOTE: when we're changing cameratype we're not changing anything else.

				# The software for RPi cameras needs to know what command is being used to
				# capture the images.
				# determineCommandToUse either retuns the command with exit code 0,
				# or an error message with non-zero exit code.
				if [[ ${CAMERA_TYPE} == "RPi" ]]; then
					RPi_COMMAND_TO_USE="$( determineCommandToUse "false" "" "false" 2>&1 )"
					RET=$?
					if [[ ${RET} -ne 0 ]] ; then
						echo -e "${wERROR}${ERROR_PREFIX}ERROR: ${RPi_COMMAND_TO_USE}.${wNC}"
						exit "${RET}"
					fi

					if [[ ${FROM_INSTALL} == "false" ]]; then
						# Installation routine already did this,
						# otherwise do it again in case the list of cameras changed.

						# "false" means don't ignore errors (i.e., exit on error).
						get_connected_cameras_info "false" > "${CONNECTED_CAMERAS_INFO}"
					fi

					OTHER_ARGS="-cmd ${RPi_COMMAND_TO_USE}"
				else
					OTHER_ARGS=""
				fi

				CC_FILE_OLD="${CC_FILE}-OLD"
				if [[ -f ${CC_FILE} ]]; then
					# Save the current file just in case creating a new one fails.
					# It's a link so copy it to a temp name, then remove the old name.
					cp "${CC_FILE}" "${CC_FILE_OLD}"
					rm -f "${CC_FILE}"
				fi

				# Create the camera capabilities file for the new camera type.
				# Use Debug Level 3 to give the user more info on error.

				if [[ -n ${CAMERA_NUMBER_ARG} ]]; then
					MSG="Re-creating files for cameratype ${CAMERA_TYPE},"
					MSG+=" cameranumber ${CAMERA_NUMBER}"
					if [[ ${ON_TTY} == "false" ]]; then		# called from WebUI.
						echo -e "<script>console.log(\"${MSG}\");</script>"
					elif [[ ${DEBUG} == "true" ]]; then
						echo -e "${wDEBUG}${MSG}${wNC}"
					fi
				fi

				# Can't quote items in ${CMD} or else they get double quoted when executed.
				CMD="capture_${CAMERA_TYPE}"
				OTHER_ARGS+=" -debuglevel 3 ${CAMERA_NUMBER_ARG}"
				if [[ -n ${CAMERA_MODEL} ]]; then
					CAMERA_MODEL_ARG="-cameramodel '${CAMERA_MODEL}'"
				else
					CAMERA_MODEL_ARG=""
				fi
				if [[ ${DEBUG} == "true" ]]; then
					echo -e "${wDEBUG}"
					echo    "Calling: ${CMD} ${OTHER_ARGS} ${CAMERA_MODEL_ARG} -cc_file '${CC_FILE}'"
					echo -e "${wNC}"
				fi

				# CAMERA_MODEL may have spaces in it so can
				if [[ -n ${CAMERA_MODEL} ]]; then
					# shellcheck disable=SC2086
					R="$( "${ALLSKY_BIN}/${CMD}" ${OTHER_ARGS} -cc_file "${CC_FILE}" \
						-cameramodel "${CAMERA_MODEL}" 2>&1 )"
				else
					# shellcheck disable=SC2086
					R="$( "${ALLSKY_BIN}"/${CMD} ${OTHER_ARGS} -cc_file "${CC_FILE}" 2>&1 )"
				fi
				RET=$?
				if [[ ${RET} -ne 0 || ! -f ${CC_FILE} ]]; then
					# Restore prior cc file if there was one.
					[[ -f ${CC_FILE_OLD} ]] && mv "${CC_FILE_OLD}" "${CC_FILE}"

					# Invoker displays error message on EXIT_NO_CAMERA.
					if [[ ${RET} -ne "${EXIT_NO_CAMERA}" ]]; then
						echo -en "\n${wERROR}ERROR: "
						if [[ ${RET} -eq 139 ]]; then
							echo -en "Segmentation fault in ${CMD}"
						else
							echo -en "${R}\nUnable to create cc file '${CC_FILE}'."
						fi
						echo -e "${wNC}"
					fi
					exit "${RET}"		# the actual exit code is important
				fi
				[[ -n ${R} ]] && echo -e "${R}"

				# Create a link to a file that contains the camera type and model in the name.

				if [[ -z ${CAMERA_MODEL} ]]; then
					SETTING_NAME="cameraModel"		# Name is Upper case in CC file
					CAMERA_MODEL="$( settings ".${SETTING_NAME}" "${CC_FILE}" )"
					if [[ -z ${CAMERA_MODEL} ]]; then
						echo -e "${wERROR}ERROR: '${SETTING_NAME}' not found in ${CC_FILE}.${wNC}"
						[[ -f ${CC_FILE_OLD} ]] && mv "${CC_FILE_OLD}" "${CC_FILE}"
						exit 1
					fi
				fi

				# ${CC_FILE} is a generic name defined in variables.sh.
				# ${SPECIFIC_NAME} is specific to the camera type/model.
				# It isn't really needed except debugging.
				CC="$( basename "${CC_FILE}" )"
				CC_EXT="${CC##*.}"			# after "."
				CC_NAME="${CC%.*}"			# before "."
				SPECIFIC_NAME="${ALLSKY_CONFIG}/${CC_NAME}_${CAMERA_TYPE}_${CAMERA_MODEL}.${CC_EXT}"

				# Any old and new camera capabilities file should be the same unless Allsky
				# adds or changes capabilities, so delete the old one just in case.
				ln --force "${CC_FILE}" "${SPECIFIC_NAME}"

				# The old file is no longer needed.
				rm -f "${CC_FILE_OLD}"
			fi

			# createAllskyOptions.php will use the cc file and the options template file
			# to create an OPTIONS_FILE and SETTINGS_FILE for this camera type/model.
			# If there is an existing camera-specific settings file for the new
			# camera type/model then createAllskyOptions.php will use it and link it
			# to SETTINGS_FILE.
			# If there is no existing camera-specific file, i.e., this camera is new
			# to Allsky, it will create a default settings file using the generic
			# values from the prior settings file if it exists.
			if [[ -f ${SETTINGS_FILE} ]]; then
				# Prior settings file exists so save the old TYPE and MODEL
				OLD_TYPE="${S_cameratype}"
				OLD_MODEL="${S_cameramodel}"
			else
				OLD_TYPE=""
				OLD_MODEL=""
			fi

			if [[ ${DEBUG} == "true" ]]; then
				# shellcheck disable=SC2086
				echo -e "${wDEBUG}Calling:" \
					"${ALLSKY_SCRIPTS}/createAllskyOptions.php" \
					${FORCE} ${DEBUG_ARG} \
					"\n\t--cc-file ${CC_FILE}" \
					"\n\t--options-file ${OPTIONS_FILE}" \
					"\n\t--settings-file ${SETTINGS_FILE}" \
					"${wNC}"
			fi
			# shellcheck disable=SC2086
			R="$( "${ALLSKY_SCRIPTS}/createAllskyOptions.php" \
				${FORCE} ${DEBUG_ARG} \
				--cc-file "${CC_FILE}" \
				--options-file "${OPTIONS_FILE}" \
				--settings-file "${SETTINGS_FILE}" \
				2>&1 )"
			RET=$?

			if [[ ${RET} -ne 0 ]]; then
				echo -n -e "${wERROR}ERROR: Unable to create '${OPTIONS_FILE}'"
				if [[ ${OPTIONS_FILE_ONLY} == "true" ]]; then
					echo -e "file."
				else
					echo -e " and '${SETTINGS_FILE}' files."
				fi
				echo -e "${wNC}, RET=${RET}: ${R}"
				exit 1
			fi
			[[ ${DEBUG} == "true" && -n ${R} ]] && echo -e "${wDEBUG}${R}${wNC}"

			ERR=""
			if [[ ! -f ${OPTIONS_FILE} ]]; then
				ERR+="\nERROR Options file ${OPTIONS_FILE} not created."
			fi
			if [[ ! -f ${SETTINGS_FILE} && ${OPTIONS_FILE_ONLY} == "false" ]]; then
				ERR+="\nERROR Settings file ${SETTINGS_FILE} not created."
			fi
			if [[ -n ${ERR} ]]; then
				echo -e "${wERROR}${ERROR_PREFIX}${ERR}${wNC}"
				exit 2
			fi

			# See if a camera-specific settings file was created.
			# If the latitude isn't set assume it's a new file.
			if [[ -n ${OLD_TYPE} && -n ${OLD_MODEL} &&
					-z "$( settings .latitude "${SETTINGS_FILE}" )" ]]; then

				# We assume the user wants the non-camera specific settings below
				# for this camera to be the same as the prior camera.

				if [[ ${DEBUG} == "true" ]]; then
					MSG="Updating user-defined settings in new settings file."
					echo -e "${wDEBUG}${MSG}${wNC}"
				fi

				# First determine the name of the prior camera-specific settings file.
				NAME="$( basename "${SETTINGS_FILE}" )"
				S_NAME="${NAME%.*}"
				S_EXT="${NAME##*.}"
				OLD_SETTINGS_FILE="${ALLSKY_CONFIG}/${S_NAME}_${OLD_TYPE}_${OLD_MODEL}.${S_EXT}"

				"${ALLSKY_SCRIPTS}/convertJSON.php" --carryforward |
				while read -r SETTING TYPE
				do
					X="$( settings ".${SETTING}" "${OLD_SETTINGS_FILE}" )"
					update_json_file ".${SETTING}" "${X}" "${SETTINGS_FILE}" "${TYPE}"
				done
			fi

			#shellcheck source-path=scripts
			source "${ALLSKY_SCRIPTS}/installUpgradeFunctions.sh"
			FULL_OVERLAY_NAME="overlay-${CAMERA_TYPE}_${CAMERA_MODEL}"
			FULL_OVERLAY_NAME+="-${C_sensorWidth}x${C_sensorHeight}-both.json"
			SHORT_OVERLAY_NAME="overlay-${CAMERA_TYPE}.json"

			OVERLAY_PATH="${ALLSKY_REPO}/overlay/config/${FULL_OVERLAY_NAME}"
			if [[ -f ${OVERLAY_PATH} ]]; then
				OVERLAY_NAME=${FULL_OVERLAY_NAME}
			else
				OVERLAY_NAME=${SHORT_OVERLAY_NAME}
			fi
			# Set to defaults since there are no prior files.
			for s in daytimeoverlay nighttimeoverlay
			do
				update_json_file ".${s}" "${OVERLAY_NAME}" "${SETTINGS_FILE}" "text"
			done
			COMPUTER="$( get_computer )"
			update_json_file ".computer" "${COMPUTER}" "${SETTINGS_FILE}" "text"

			if [[ -n ${CAMERA_NUMBER_ARG} ]]; then
				# Because the user doesn't change this directly it's not updated
				# in the settings file, so we have to do it.
				update_json_file ".cameranumber" "${CAMERA_NUMBER}" "${SETTINGS_FILE}" "integer"
			fi

			# Don't do anything else if ${CAMERA_TYPE_ONLY} is set.
			if [[ ${CAMERA_TYPE_ONLY} == "true" ]]; then
				if [[ ${GOT_WARNING} == "true" ]]; then
					exit 255
				else
					exit 0
				fi
			fi
			;;

		"type")
			check_filename_type "$( settings '.filename' )" "${NEW_VALUE}" || OK="false"
			;;

		"filename")
			if check_filename_type "${NEW_VALUE}" "$( settings '.type' )" ; then
				check_website && WEBSITE_CONFIG+=("config.imageName" "${LABEL}" "${NEW_VALUE}")
			else
				OK="false"
			fi
			;;

		"usedarkframes")
			if [[ ${NEW_VALUE} == "true" ]]; then
				if [[ ! -d ${ALLSKY_DARKS} ]]; then
					echo -e "${wWARNING}WARNING: No darks to subtract."
					echo -e "No '${ALLSKY_DARKS}' directory.${NC}"
					# Restore to old value
					echo "Disabling ${WSNs}${LABEL}${WSNe}."
					update_json_file ".${KEY}" "${OLD_VALUE}" "${SETTINGS_FILE}" "boolean"
				else
					NUM_DARKS=$( find "${ALLSKY_DARKS}" -name "*.${EXTENSION}" 2>/dev/null | wc -l)
					if [[ ${NUM_DARKS} -eq 0 ]]; then
						echo -n "${WSNs}${LABEL}${WSNe} is set but there are no darks"
						echo    " in '${ALLSKY_DARKS}' with extension of '${EXTENSION}'."
						echo    "FIX: Either disable the setting or take dark frames."
					fi
				fi
			fi
			;;

		"extratext")
			# It's possible the user will create/populate the file while Allsky is running,
			# so it's not an error if the file doesn't exist or is empty.
			if [[ -n ${NEW_VALUE} ]]; then
				if [[ ! -f ${NEW_VALUE} ]]; then
					echo -e "${wWARNING}WARNING: '${NEW_VALUE}' does not exist; please change it.${wNC}"
				elif [[ ! -s ${NEW_VALUE} ]]; then
					echo -e "${wWARNING}WARNING: '${NEW_VALUE}' is empty; please change it.${wNC}"
				fi
			fi
			;;

		"config")
			if [[ ${NEW_VALUE} == "" ]]; then
				NEW_VALUE="[none]"
			elif [[ ${NEW_VALUE} != "[none]" ]]; then
				echo -e "${wWARNING}WARNING: Configuration file '${NEW_VALUE}'"
				if [[ ! -f ${NEW_VALUE} ]]; then
					echo " does not exist; please change it."
				elif [[ ! -s ${NEW_VALUE} ]]; then
					echo " is empty; please change it."
				fi
				echo -e "${wNC}"
			fi
			;;

		"daytuningfile" | "nighttuningfile")
			if [[ -n ${NEW_VALUE} && ! -f ${NEW_VALUE} ]]; then
				echo -e "${wWARNING}"
				echo    "WARNING: Tuning File '${NEW_VALUE}' does not exist; please change it."
				echo -e "${wNC}"
			fi
			;;

		"displaysettings")
			[[ ${NEW_VALUE} != "false" ]] && NEW_VALUE="true"
			if check_website; then
				# If there are two Websites, this gets the index in the first one.
				# Let's hope it's the same index in the second one...
				PARENT="homePage.popoutIcons"
				INDEX=$( getJSONarrayIndex "${WEB_CONFIG_FILE}" "${PARENT}" "Allsky Settings" )
				if [[ ${INDEX} -ge 0 ]]; then
					WEBSITE_CONFIG+=("${PARENT}[${INDEX}].display" "${LABEL}" "${NEW_VALUE}")
				else
					echo -e "${wWARNING}WARNING: Unable to update ${wBOLD}${LABEL}${wNBOLD} in ${WEB_CONFIG_FILE}; ignoring.${wNC}"
				fi
			else
				echo -en "${wWARNING}"
				echo -en "Change to ${wBOLD}${LABEL}${wNBOLD} not relevant - "
				echo -en "No local or remote Allsky Website found."
				echo -e "${wNC}"
				GOT_WARNING="true"
			fi
			;;

		"showonmap")
			SHOW_ON_MAP="true"
			[[ ${NEW_VALUE} == "false" ]] && POSTTOMAP_ACTION="--delete"
			RUN_POSTTOMAP="true"
			;;

		"latitude" | "longitude")
			# Allow either +/- decimal numbers, OR numbers with N, S, E, W, but not both.
			if NEW_VALUE="$( convertLatLong "${NEW_VALUE}" "${KEY}" )" ; then
				check_website && WEBSITE_CONFIG+=(config."${KEY}" "${LABEL}" "${NEW_VALUE}")
			else
				echo -e "${wWARNING}WARNING: ${NEW_VALUE}.${wNC}"
			fi
			RUN_POSTTOMAP="true"
			;;

		"location" | "owner" | "camera" | "lens" | "computer")
			RUN_POSTTOMAP="true"
			check_website && WEBSITE_CONFIG+=(config."${KEY}" "${LABEL}" "${NEW_VALUE}")
			;;


		"uselocalwebsite")
			if [[ ${NEW_VALUE} == "true" && ! -f ${ALLSKY_WEBSITE_CONFIGURATION_FILE} ]]; then
				# No prior config file.
				# This should only happen if there was no prior Website.
				cp \
					"${REPO_WEBSITE_CONFIGURATION_FILE}" \
					"${ALLSKY_WEBSITE_CONFIGURATION_FILE}"
				update_json_file ".config.AllskyVersion" "${WEBSITE_ALLSKY_VERSION}" \
					"${ALLSKY_WEBSITE_CONFIGURATION_FILE}" "text"
			fi
			;;

		"remotewebsiteurl" | "remotewebsiteimageurl")
			CHECK_REMOTE_WEBSITE_ACCESS="true"
			RUN_POSTTOMAP="true"
			;;

		"useremotewebsite")
			[[ ${NEW_VALUE} == "true" ]] && CHECK_REMOTE_WEBSITE_ACCESS="true"
			;;

		"remotewebsiteprotocol" | "remotewebsiteimagedir")
			CHECK_REMOTE_WEBSITE_ACCESS="true"
			;;

		remotewebsite_*)		# from REMOTE_WEBSITE_* settings in env file
			CHECK_REMOTE_WEBSITE_ACCESS="true"
			;;

		"useremoteserver")
			[[ ${NEW_VALUE} == "true" ]] && CHECK_REMOTE_SERVER_ACCESS="true"
			;;

		"remoteserverprotocol" | "remoteserverimagedir")
			CHECK_REMOTE_SERVER_ACCESS="true"
			;;

		remoteserver_*)			# from env file
			CHECK_REMOTE_SERVER_ACCESS="true"
			;;

		"overlaymethod")
			if [[ ${NEW_VALUE} -eq 1 ]]; then		# 1 == "overlay" method
				echo -en "${wWARNING}"
				echo -en "NOTE: You must enable the ${wBOLD}Overlay Module${wNBOLD} in the"
				echo -en " ${wBOLD}Daytime Capture${wNBOLD} and/or"
				echo -en " ${wBOLD}Nighttime Capture${wNBOLD} flows of the"
				echo -en " ${wBOLD}Module Manager${wNBOLD}"
				echo -en " for the '${LABEL}' to take effect."
				echo -e "${wNC}"
			else
				rm -f "${ALLSKY_TMP}/overlaydebug.txt"
			fi
			;;

		"takedaytimeimages" | "takenighttimeimages")
:
###### TODO FIX
			;;

		"timelapsewidth" | "timelapseheight")
			DID_TIMELAPSE="${DID_TIMELAPSE:-false}"
			if [[ ${NEW_VALUE} != "0" ]]; then
				# Check the KEY by itself then both numbers together.
				if [[ ${KEY} == "timelapsewidth" ]]; then
					MAX="${C_sensorWidth}"
				else
					MAX="${C_sensorHeight}"
				fi
				MIN=2

				OK="true"
echo "CALLING: checkPixelValue 'Timelapse ${LABEL}' '${NEW_VALUE}' '${MIN}' '${MAX}'"
				if ! checkPixelValue "Timelapse ${LABEL}" "sensor size" "${NEW_VALUE}" "${MIN}" "${MAX}" ; then
echo "    FALSE"
					OK="false"
				else
					if [[ ${DID_TIMELAPSE} == "false" ]]; then
echo "CALLING: checkWidthHeight 'Timelapse' 'timelapse' '${S_timelapsewidth}' '${S_timelapseheight}' '${C_sensorWidth}' '${C_sensorHeight}'"
						if ! checkWidthHeight "Timelapse" "timelapse" \
						"${S_timelapsewidth}" "${S_timelapseheight}" \
	 					"${C_sensorWidth}" "${C_sensorHeight}" 2>&1 ; then
echo "false"
							OK="false"
						fi
						DID_TIMELAPSE="true"
					fi
				fi

				if [[ ${OK} == "false" ]]; then
					# Restore to old value
					echo "Setting ${WSNs}Timelapse ${LABEL}${WSNe} back to ${WSVs}${OLD_VALUE}${WSVe}."
					update_json_file ".${KEY}" "${OLD_VALUE}" "${SETTINGS_FILE}" "number"
				fi
			fi
OK=false	#XXXXXXX
			;;

		"minitimelapsewidth" | "minitimelapseheight")
			if ! ERR="$( checkWidthHeight "Mini-Timelapse" "mini-timelapse" \
				"${S_minitimelapsewidth}" "${S_minitimelapseheight}" \
				"${C_sensorWidth}" "${C_sensorHeight}" 2>&1 )" ; then

				# Restore to old value
				update_json_file ".${KEY}" "${OLD_VALUE}" "${SETTINGS_FILE}" "number"
			fi
			;;

		"imageresizewidth" | "imageresizeheight")
			if ! ERR="$( checkWidthHeight "Image RESIZE" \
				"${S_imageresizeWidth}" "${S_imageresizeHeight}" \
	 			"${C_sensorWidth}" "${C_sensorHeight}" 2>&1 )" ; then

				# Restore to old value
				update_json_file ".${KEY}" "${OLD_VALUE}" "${SETTINGS_FILE}" "number"
			fi
			;;

		"imagecroptop" | "imagecropright" | "imagecropbottom" | "imagecropleft")

			if [[ $((S_imagecroptop + S_imagecropright + BOTTOM + LEFT)) -gt 0 ]]; then
				ERR="$( checkCropValues "${S_imagecroptop}" "${S_imagecropright}" \
\					"${S_imagecropbottom}" "${S_imagecropleft}" \
					"${C_sensorWidth}" "${C_sensorHeight}" )"
				if [[ $? -ne 0 ]]; then
					echo "${ERR}"
					echo "FIX: Check the ${WSNs}Image Crop Top/Right/Bottom/Left${WSNe} settings."
				fi
			fi
			;;

		"timelapsevcodec")
			if ! ffmpeg -encoders 2>/dev/null | awk -v codec="${NEW_VALUE}" '
				BEGIN { exit_code = 1; }
				{ if ($2 == codec) { exit_code = 0; exit 0; } }
				END { exit exit_code; }' ; then

				echo -e "${wWARNING}"
				echo    "WARNING: Unknown VCODEC: '${NEW_VALUE}'; resetting to '${OLD_VALUE}'."
				echo    "Execute: ffmpeg -encoders"
				echo    "for a list of VCODECs."
				echo -e "${wNC}"

				# Restore to old value
				update_json_file ".${KEY}" "${OLD_VALUE}" "${SETTINGS_FILE}" "text"
			fi
			;;

		"timelapsepixfmt")
			if ! ffmpeg -pix_fmts 2>/dev/null | awk -v fmt="${NEW_VALUE}" '
				BEGIN { exit_code = 1; }
				{ if ($2 == fmt) { exit_code = 0; exit 0; } }
				END { exit exit_code; }' ; then

				echo -e "${wWARNING}"
				echo    "WARNING: Unknown Pixel Format: '${NEW_VALUE}'; resetting to '${OLD_VALUE}'."
				echo    "Execute: ffmpeg -pix_fmts"
				echo    "for a list of formats."
				echo -e "${wNC}"

				# Restore to old value
				update_json_file ".${KEY}" "${OLD_VALUE}" "${SETTINGS_FILE}" "text"
			fi
			;;

		*)
			echo -e "${wWARNING}"
			echo    "WARNING: Unknown key '${KEY}'; ignoring.  Old=${OLD_VALUE}, New=${NEW_VALUE}"
			echo -e "${wNC}"
			((NUM_CHANGED--))
			;;

		esac
		shift 4
done

[[ ${OK} == "false" ]] && exit 1

[[ ${NUM_CHANGED} -le 0 ]] && exit 0		# Nothing changed

USE_REMOTE_WEBSITE="$( settings ".useremotewebsite" )"
USE_REMOTE_SERVER="$( settings ".useremoteserver" )"
if [[ ${USE_REMOTE_WEBSITE} == "true" || ${USE_REMOTE_SERVER} == "true" ]]; then
	if [[ ! -f ${ALLSKY_ENV} ]]; then
		cp "${REPO_ENV_FILE}" "${ALLSKY_ENV}"
	fi

	if [[ ${USE_REMOTE_WEBSITE} == "true" && ${CHECK_REMOTE_WEBSITE_ACCESS} == "true" ]]; then
		# testUpload.sh displays error messages
		"${ALLSKY_SCRIPTS}/testUpload.sh" --website

		# If the remote configuration file doesn't exist assume it's because
		# the user enabled it but hasn't yet "installed" it (which creates the file).
		if [[ ! -s ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE} ]]; then
			echo -e "${wWARNING}"
			echo    "The Remote Website is now enabled but hasn't been installed yet."
			echo    "Please do so now."
			if [[ ${ON_TTY} == "false" ]]; then		# called from WebUI.
				echo -n "See <a allsky='true' external='true'"
				echo " href='/documentation/installations/AllskyWebsite.html'>See the documentation</a>"
			fi
			echo -e "${wNC}"
			[[ ${WEBSITES} != "local" ]] && WEBSITES=""
		fi
	fi

	if [[ ${USE_REMOTE_SERVER} == "true" && ${CHECK_REMOTE_SERVER_ACCESS} == "true" ]]; then
		"${ALLSKY_SCRIPTS}/testUpload.sh" --server
	fi
fi

# shellcheck disable=SC2128
if [[ ${#WEBSITE_CONFIG[@]} -gt 0 ]]; then
	# Update the local and/or Website remote config file
	if [[ ${WEBSITES} == "local" || ${WEBSITES} == "both" ]]; then
		if [[ ${DEBUG} == "true" ]]; then
			echo -e "${wDEBUG}Executing updateWebsiteConfig.sh local${wNC}"
		fi
		# shellcheck disable=SC2086
		"${ALLSKY_SCRIPTS}/updateWebsiteConfig.sh" ${DEBUG_ARG} --local "${WEBSITE_CONFIG[@]}"
	fi
	if [[ ${WEBSITES} == "remote" || ${WEBSITES} == "both" ]]; then
		if [[ ${DEBUG} == "true" ]]; then
			echo -e "${wDEBUG}Executing updateWebsiteConfig.sh remote${wNC}"
		fi
		# shellcheck disable=SC2086
		"${ALLSKY_SCRIPTS}/updateWebsiteConfig.sh" ${DEBUG_ARG} --remote "${WEBSITE_CONFIG[@]}"

		FILE_TO_UPLOAD="${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}"

		IMAGE_DIR="$( settings ".remotewebsiteimagedir" )"
		if [[ ${DEBUG} == "true" ]]; then
			echo -e "${wDEBUG}Uploading '${FILE_TO_UPLOAD}' to remote Website.${wNC}"
		fi

# TODO: put in background to return to user faster?
		if ! "${ALLSKY_SCRIPTS}/upload.sh" --silent --remote-web \
				"${FILE_TO_UPLOAD}" \
				"${IMAGE_DIR}" \
				"${ALLSKY_WEBSITE_CONFIGURATION_NAME}" \
				"RemoteWebsite" ; then
			echo -e "${wERROR}${ERROR_PREFIX}Unable to upload '${FILE_TO_UPLOAD}' to Website ${NUM}.${wNC}"
		fi
	fi
fi

if [[ ${RUN_POSTTOMAP} == "true" ]]; then
	[[ -z ${SHOW_ON_MAP} ]] && SHOW_ON_MAP="$( settings ".showonmap" )"
	if [[ ${SHOW_ON_MAP} == "true" ]]; then
		[[ ${DEBUG} == "true" ]] && echo -e "${wDEBUG}Executing postToMap.sh${wNC}"
# TODO: put in background to return to user faster?
		# shellcheck disable=SC2086
		"${ALLSKY_SCRIPTS}/postToMap.sh" --whisper --force ${DEBUG_ARG} ${POSTTOMAP_ACTION}
	fi
fi

if [[ ${GOT_WARNING} == "true" ]]; then
	exit 255
else
	exit 0
fi
