#!/bin/bash

# Allow this script to be executed manually, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"			|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"			|| exit "${EXIT_ERROR_STOP}"

function usage_and_exit()
{
	echo -en "${wERROR}"
	echo     "Usage: ${ME} [--debug] [--optionsOnly] [--cameraTypeOnly] [--fromInstall]"
	echo -en "\tkey label old_value new_value [...]"
	echo -e  "${wNC}"
	echo "There must be a multiple of 4 key/label/old_value/new_value arguments"
	echo "unless the --optionsOnly argument is given."
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
if [[ -f ${SETTINGS_FILE} ]]; then
	# check_website requires the settings file to exist.
	# If it doesn't we are likely called from the install script before the file is created.
	check_website		# invoke to set variables
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

CAMERA_NUMBER=""
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
		[[ ${DEBUG} == "true" ]] && echo -e "    ${wDEBUG}Skipping - old and new are equal${wNC}"
		shift 4
		continue
	fi

	# Unfortunately, the Allsky configuration file was already updated,
	# so if we find a bad entry, e.g., a file doesn't exist, all we can do is warn the user.
	
	((NUM_CHANGED++))
	case "${KEY}" in

		"cameranumber" | "cameratype")

			if [[ ${KEY} == "cameranumber" ]]; then
				NEW_CAMERA_NUMBER="${NEW_VALUE}"
				CAMERA_NUMBER=" -cameranumber ${NEW_CAMERA_NUMBER}"
				# Set NEW_VALUE to the current Camera Type
				NEW_VALUE="$( settings ".cameratype" )"

				MSG="Re-creating files for cameratype ${NEW_VALUE}, cameranumber ${NEW_CAMERA_NUMBER}"
				if [[ ${ON_TTY} == "false" ]]; then		# called from WebUI.
					echo -e "<script>console.log('${MSG}');</script>"
				elif [[ ${DEBUG} == "true" ]]; then
					echo -e "${wDEBUG}${MSG}${wNC}"
				fi
			fi

			if [[ ! -e "${ALLSKY_BIN}/capture_${NEW_VALUE}" ]]; then
				MSG="Unknown Camera Type: '${NEW_VALUE}'."
				echo -e "${wERROR}${ERROR_PREFIX}ERROR: ${MSG}${wNC}"
				exit "${EXIT_NO_CAMERA}"
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
				if [[ ${NEW_VALUE} == "RPi" ]]; then
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

					export RPi_COMMAND_TO_USE
					export CONNECTED_CAMERAS_INFO
					export RPi_SUPPORTED_CAMERAS
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

				CMD="capture_${NEW_VALUE} ${CAMERA_NUMBER}"
				if [[ ${DEBUG} == "true" ]]; then
					echo -e "${wDEBUG}Calling ${CMD} -cc_file '${CC_FILE}'${wNC}"
				fi

				# shellcheck disable=SC2086
				R="$( "${ALLSKY_BIN}"/${CMD} -debuglevel 3 -cc_file "${CC_FILE}" 2>&1 )"
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
				CAMERA_TYPE="${NEW_VALUE}"		# already know it
				SETTING_NAME="cameraModel"		# Name is Upper case in CC file
				CAMERA_MODEL="$( settings ".${SETTING_NAME}" "${CC_FILE}" )"
				if [[ -z ${CAMERA_MODEL} ]]; then
					echo -e "${wERROR}ERROR: '${SETTING_NAME}' not found in ${CC_FILE}.${wNC}"
					[[ -f ${CC_FILE_OLD} ]] && mv "${CC_FILE_OLD}" "${CC_FILE}"
					exit 1
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

				# Change other things that vary depending on CAMERA_TYPE and CAMERA_MODEL.
				if [[ ${OLD_VALUE} != "${NEW_VALUE}" ]]; then
					# Move the current overlay.json to the old camera-specific name,
					# then copy the new camera-specific named file to overlay.json.
					O="${ALLSKY_OVERLAY}/config/overlay.json"
					if [[ -n ${OLD_VALUE} && -f ${O} ]]; then
						if [[ ${DEBUG} == "true" ]]; then
							echo -e "${wDEBUG}Moving overlay.json to overlay-${OLD_VALUE}.json${wNC}"
						fi
						mv -f "${O}" "${ALLSKY_OVERLAY}/config/overlay-${OLD_VALUE}.json"
					fi

					# When we're called during Allsky installation,
					# the Camera-Specific Overlay (CSO) file may not exist yet.
					CSO="${ALLSKY_OVERLAY}/config/overlay-${NEW_VALUE}.json"
					if [[ -f ${CSO} ]]; then
						if [[ ${DEBUG} == "true" ]]; then
							echo -e "${wDEBUG}Copying overlay-${NEW_VALUE}.json to overlay.json${wNC}"
						fi
						# Need to preserve permissions so use "-a".
						cp -a "${CSO}" "${O}"
					elif [[ ${DEBUG} == "true" ]]; then
						echo -e "${wDEBUG}'${CSO}' doesn't exist yet - ignoring.${wNC}"
					fi
				fi
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
				OLD_TYPE="${OLD_VALUE}"
				OLD_MODEL="$( settings .cameramodel )"
			else
				OLD_TYPE=""
				OLD_MODEL=""
			fi

			if [[ ${DEBUG} == "true" ]]; then
				# shellcheck disable=SC2086
				echo -e "${wDEBUG}Calling:" \
					"${ALLSKY_WEBUI}/includes/createAllskyOptions.php" \
					${FORCE} ${DEBUG_ARG} \
					"\n\t--cc-file ${CC_FILE}" \
					"\n\t--options-file ${OPTIONS_FILE}" \
					"\n\t--settings-file ${SETTINGS_FILE}" \
					"${wNC}"
			fi
			# shellcheck disable=SC2086
			R="$( "${ALLSKY_WEBUI}/includes/createAllskyOptions.php" \
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
				echo -e "${wNC}, RET=${RET}:${R}"
				exit 1
			fi
			[[ ${DEBUG} == "true" && -n ${R} ]] && echo -e "${wDEBUG}${R}${wNC}"

			OK="true"
			if [[ ! -f ${OPTIONS_FILE} ]]; then
				echo -e "${wERROR}${ERROR_PREFIX}ERROR Options file ${OPTIONS_FILE} not created.${wNC}"
				OK="false"
			fi
			if [[ ! -f ${SETTINGS_FILE} && ${OPTIONS_FILE_ONLY} == "false" ]]; then
				echo -e "${wERROR}${ERROR_PREFIX}ERROR Settings file ${SETTINGS_FILE} not created.${wNC}"
				OK="false"
			fi
			[[ ${OK} == "false" ]] && exit 2

			# See if a camera-specific settings file was created.
			# If the latitude isn't set assume it's a new file.
			if [[ -n ${OLD_TYPE} && -n ${OLD_MODEL} &&
					-z "$( settings .latitude "${SETTINGS_FILE}" )" ]]; then
				#shellcheck source-path=scripts
				source "${ALLSKY_SCRIPTS}/installUpgradeFunctions.sh"
				[[ $? -ne 0 ]] && exit "${EXIT_ERROR_STOP}"

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

# TODO: Replace these "for" statements with code using the "carryforward" field in
# in the options file.
				for s in latitude longitude locale websiteurl imageurl \
					location owner computer imagesortorder temptype
				do
					X="$( settings .${s} "${OLD_SETTINGS_FILE}" )"
					update_json_file ".${s}" "${X}" "${SETTINGS_FILE}" "text"
				done

				for s in angle debuglevel dayskipframes nightskipframes quality \
					overlaymethod daystokeep daystokeepremotewebsite
				do
					X="$( settings .${s} "${OLD_SETTINGS_FILE}" )"
					update_json_file ".${s}" "${X}" "${SETTINGS_FILE}" "number"
				done

				for s in uselogin displaysettings showonmap showupdatedmessage \
					consistentdelays uselocalwebsite useremotewebsite useremoteserver \
					notificationimages
				do
					X="$( settings .${s} "${OLD_SETTINGS_FILE}" )"
					update_json_file ".${s}" "${X}" "${SETTINGS_FILE}" "boolean"
				done
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

		"latitude" | "longitude")
			# Allow either +/- decimal numbers, OR numbers with N, S, E, W, but not both.
			if NEW_VALUE="$( convertLatLong "${NEW_VALUE}" "${KEY}" )" ; then
				check_website && WEBSITE_CONFIG+=(config."${KEY}" "${LABEL}" "${NEW_VALUE}")
			else
				echo -e "${wWARNING}WARNING: ${NEW_VALUE}.${wNC}"
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

		"location" | "owner" | "camera" | "lens" | "computer")
			RUN_POSTTOMAP="true"
			check_website && WEBSITE_CONFIG+=(config."${KEY}" "${LABEL}" "${NEW_VALUE}")
			;;


		"remotewebsiteurl" | "remotewebsiteimageurl")
			CHECK_REMOTE_WEBSITE_ACCESS="true"
			RUN_POSTTOMAP="true"
			;;

		"useremotewebsite")
			CHECK_REMOTE_WEBSITE_ACCESS="true"
			USE_REMOTE_WEBSITE="${NEW_VALUE}"
			;;

		"remotewebsiteprotocol" | "remotewebsiteimagedir" | \
		"remotewebsitevideodestinationname" | "remotewebsitekeogramdestinationname" | "remotewebsitestartrailsdestinationname")
			CHECK_REMOTE_WEBSITE_ACCESS="true"
			;;

		remotewebsite_*)
			CHECK_REMOTE_WEBSITE_ACCESS="true"
			;;

		"useremoteserver")
			CHECK_REMOTE_SERVER_ACCESS="true"
			USE_REMOTE_SERVER="${NEW_VALUE}"
			;;

		# We don't care about the *destination names for remote servers
		"remoteserverprotocol" | "remoteserveriteimagedir")
			CHECK_REMOTE_SERVER_ACCESS="true"
			;;

		remoteserver_*)
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
			echo -e "${wDEBUG}Executing updateWebsiteConfig.sh local${NC}"
		fi
		# shellcheck disable=SC2086
		"${ALLSKY_SCRIPTS}/updateWebsiteConfig.sh" ${DEBUG_ARG} --local "${WEBSITE_CONFIG[@]}"
	fi
	if [[ ${WEBSITES} == "remote" || ${WEBSITES} == "both" ]]; then
		if [[ ${DEBUG} == "true" ]]; then
			echo -e "${wDEBUG}Executing updateWebsiteConfig.sh remote${NC}"
		fi
		# shellcheck disable=SC2086
		"${ALLSKY_SCRIPTS}/updateWebsiteConfig.sh" ${DEBUG_ARG} --remote "${WEBSITE_CONFIG[@]}"

		FILE_TO_UPLOAD="${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}"

		IMAGE_DIR="$( settings ".remotewebsiteimagedir" )"
		if [[ ${DEBUG} == "true" ]]; then
			echo -e "${wDEBUG}Uploading '${FILE_TO_UPLOAD}' to remote Website.${wNC}"
		fi

		if ! "${ALLSKY_SCRIPTS}/upload.sh" --silent --remote-web \
				"${FILE_TO_UPLOAD}" \
				"${IMAGE_DIR}" \
				"${ALLSKY_WEBSITE_CONFIGURATION_NAME}" \
				"RemoteWebsite" ; then
			echo -e "${RED}${ERROR_PREFIX}Unable to upload '${FILE_TO_UPLOAD}' to Website ${NUM}.${NC}"
		fi
	fi
fi

if [[ ${RUN_POSTTOMAP} == "true" ]]; then
	[[ -z ${SHOW_ON_MAP} ]] && SHOW_ON_MAP="$( settings ".showonmap" )"
	if [[ ${SHOW_ON_MAP} == "true" ]]; then
		[[ ${DEBUG} == "true" ]] && echo -e "${wDEBUG}Executing postToMap.sh${NC}"
		# shellcheck disable=SC2086
		"${ALLSKY_SCRIPTS}/postToMap.sh" --whisper --force ${DEBUG_ARG} ${POSTTOMAP_ACTION}
	fi
fi

if [[ ${GOT_WARNING} == "true" ]]; then
	exit 255
else
	exit 0
fi
