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
	exec >&2
	local E="\n"
	E+="Usage: ${ME} [--debug] [--optionsOnly] [--cameraTypeOnly] [--fromInstall] [--addNewSettings]"
	E+="\n\tkey  label  old_value  new_value  [...]"
	e_ "${E}"
	echo "There must be a multiple of 4 key/label/old_value/new_value arguments."
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
ADD_NEW_SETTINGS="false"
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
		--addnewsettings)
			ADD_NEW_SETTINGS="true"
			;;
		--force)
			FORCE="${ARG}"
			;;
		-*)
			e_ "ERROR: Unknown argument: '${ARG}'"
			OK="false"
			;;
		*)
			break
			;;
	esac
	shift
done

if [[ ${ON_TTY} == "false" ]]; then
	FROM_WEBUI="--fromWebUI"
	# The WebUI will display our output in an
	# appropriate style if ERROR: or WARNING: is in the message, so
	# don't provide our own format.
	ERROR_PREFIX=""
	wERROR=""
	wDEBUG="DEBUG: "
	wWARNING=""
	wNC=""
	BR="<br>"
else
	FROM_WEBUI=""
	ERROR_PREFIX="${ME}: "
	BR="\n"
fi

[[ ${HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" ]] && usage_and_exit 1
if [[ ${OPTIONS_FILE_ONLY} == "false" ]]; then
	[[ $# -eq 0 ]] && usage_and_exit 1
	[[ $(($# % 4)) -ne 0 ]] && usage_and_exit 2
fi

RUN_POSTTOMAP="false"
POSTTOMAP_ACTION=""
WEBSITE_CONFIG=()
WEBSITE_VALUE_CHANGED="false"
GOT_WARNING="false"
SHOW_ON_MAP=""
CHECK_REMOTE_WEBSITE_ACCESS="false"
CHECK_REMOTE_SERVER_ACCESS="false"
USE_REMOTE_WEBSITE=""
USE_REMOTE_SERVER=""

# Return 0 if at least one Website is found, otherwise 1.
# The first time we're called, set some global variables.
WEB_CONFIG_FILE=""
HAS_WEBSITE_RET=""
WEBSITES=""				# local, remote, both, none
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
	# If the settings file doesn't exist, check_website() won't find a website and
	# we are likely called from the install script before the file is created.

	check_website		# invoke to set variables

	if ! X="$( "${ALLSKY_SCRIPTS}/convertJSON.php" --prefix S_ --shell 2>&1 )" ; then
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
			E="${ERROR_PREFIX}ERROR: RAW16 images only work with .png files"
			E+="; either change the Image Type or the Filename."
			e_ "${E}"
			return 1
		fi
	fi
	return 0
}

CAMERA_NUMBER=""
CAMERA_NUMBER_ARG=""
CAMERA_MODEL=""
CAMERA_MODEL_ARG=""

NUM_CHANGED=0

# Read all the arguments into array.
# Some settings, like imageresizewidth and imageresizeheight are usually
# updated at the same time.
# Having an array of all changes allows us to check that a second value
# is being updated while we're looking at the first one.
# For example, if we are working on "imageresizewidth" we can check if "imageresizeheight"
# is also updated, and work on both at the same time.

declare -A KEYS=()
declare -A LABELS=()
declare -A OLD_VALUES=()
declare -A NEW_VALUES=()

while [[ $# -gt 0 ]]
do
	KEY="${1,,}" ;	 KEY="${KEY/#_/}"	# convert to lowercase and remove any leading "_"
	LABEL="${2}"
	OLD_VALUE="${3}"
	NEW_VALUE="${4}"

	shift 4

	# Don't skip if it's cameratype since that indicates we need to refresh.
	if [[ ${KEY} != "cameratype" && ${OLD_VALUE} == "${NEW_VALUE}" ]]; then
		if [[ ${DEBUG} == "true" ]]; then
			d_ "Skipping - old and new are equal."
		fi
		continue
	fi

	(( NUM_CHANGED++ ))
	KEYS[${KEY}]="${KEY}"
	LABELS[${KEY}]="${LABEL}"
	OLD_VALUES[${KEY}]="${OLD_VALUE}"
	NEW_VALUES[${KEY}]="${NEW_VALUE}"
done

# shellcheck disable=SC2302
for KEY in "${KEYS[@]}"
do
	# See if the setting was already processed and hence removed from the array.
	# Can't check for empty ${KEY} since the items in the "for" line were set once.
	# shellcheck disable=SC2303
	[[ -z ${KEYS[${KEY}]} ]] && continue

	LABEL="${LABELS[${KEY}]}"
	OLD_VALUE="${OLD_VALUES[${KEY}]}"
	NEW_VALUE="${NEW_VALUES[${KEY}]}"

	if [[ ${DEBUG} == "true" ]]; then
		MSG="${KEY}: Old=[${OLD_VALUE}], New=[${NEW_VALUE}]"
		d_ "${ME}: ${MSG}"
		if [[ ${ON_TTY} == "false" ]]; then		# called from WebUI.
			echo -e "<script>console.log('${MSG}');</script>"
		fi
	fi

	# The Allsky configuration file was already updated.
	# If we find a bad entry, e.g., a file doesn't exist, warn the user and reset the value.

	case "${KEY}" in

		# When called from the installer we get cameranumber, cameramodel, and cameratype.
		# This is the only time cameranumber should be used since it could change if,
		# for example, a user removes a camera.
		# When called from the WebUI we only get what the user changed which is
		# either cameramodel OR cameratype.
		"cameranumber")
			CAMERA_NUMBER="${NEW_VALUE}"
			CAMERA_NUMBER_ARG=" -cameranumber ${CAMERA_NUMBER}"
			;;

		"cameramodel" | "cameratype")
			if [[ ${KEY} == "cameramodel" ]]; then
				CAMERA_MODEL="${NEW_VALUE}"

				if [[ ${FROM_INSTALL} == "true" ]]; then
# TODO: Use the KEYS[] array so the settings can be passed in either order.
					# When called during installation the camera model is
					# passed in, then the camera type.
					continue
				fi

				# If only the CAMERA_MODEL changed, it's the same CAMERA_TYPE.
# TODO: use   CAMERA_TYPE="${S_cameratype}"
				CAMERA_TYPE="$( settings ".cameratype" )"

			else
				CAMERA_TYPE="${NEW_VALUE}"
				if [[ ! -e "${ALLSKY_BIN}/capture_${CAMERA_TYPE}" ]]; then
					MSG="Unknown '${LABEL}': '${CAMERA_TYPE}'."
					e_ "${ERROR_PREFIX}ERROR: ${MSG}"
					exit "${EXIT_NO_CAMERA}"
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
						e_ "${ERROR_PREFIX}ERROR: ${RPi_COMMAND_TO_USE}."
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

				if [[ -n ${CAMERA_NUMBER} ]]; then
					MSG="Re-creating files for cameratype ${CAMERA_TYPE},"
					MSG+=" cameranumber ${CAMERA_NUMBER}"
					if [[ ${ON_TTY} == "false" ]]; then		# called from WebUI.
						echo -e "<script>console.log('${MSG}');</script>"
					elif [[ ${DEBUG} == "true" ]]; then
						d_ "${MSG}"
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
					d_ "Calling: ${CMD} ${OTHER_ARGS} ${CAMERA_MODEL_ARG} -cc_file '${CC_FILE}'"
				fi

				# CAMERA_MODEL may have spaces in it so can't put in quotes in
				# ${OTHER_ARGS} (at least I don't know how).
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
						E="${BR}ERROR: "
						if [[ ${RET} -eq 139 ]]; then
							E+="Segmentation fault in ${CMD}"
						else
							E+="${R}${BR}Unable to create cc file '${CC_FILE}'."
						fi
						e_ "${E}"
					fi
# TODO: re-set settings to prior values?
					exit "${RET}"		# the actual exit code is important
				fi
				[[ -n ${R} ]] && echo -e "${R}"

				# Create a link to a file that contains the camera type and model in the name.

				if [[ -z ${CAMERA_MODEL} ]]; then
					SETTING_NAME="cameraModel"		# Name is Upper case in CC file
					CAMERA_MODEL="$( settings ".${SETTING_NAME}" "${CC_FILE}" )"
					if [[ -z ${CAMERA_MODEL} ]]; then
						e_ "ERROR: '${SETTING_NAME}' not found in ${CC_FILE}."
						[[ -f ${CC_FILE_OLD} ]] && mv "${CC_FILE_OLD}" "${CC_FILE}"
# TODO: re-set settings to prior values?
						exit 1
					fi
				fi

				# ${CC_FILE} is a generic name defined in variables.sh.
				# ${SPECIFIC_NAME} is specific to the camera type/model.
				# It isn't really needed except debugging.
				CC="$( basename "${CC_FILE}" )"
				CC_EXT="${CC##*.}"			# after "."
				CC_NAME="${CC%.*}"			# before "."
				SPECIFIC_NAME="${ALLSKY_CONFIG}/"
				SPECIFIC_NAME+="${CC_NAME}_${CAMERA_TYPE}_${CAMERA_MODEL// /_}.${CC_EXT}"

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
				d_ "Calling:" \
					"${ALLSKY_SCRIPTS}/createAllskyOptions.php" \
					${FORCE} ${DEBUG_ARG} \
					"\n\t--cc-file ${CC_FILE}" \
					"\n\t--options-file ${OPTIONS_FILE}" \
					"\n\t--settings-file ${SETTINGS_FILE}"
			fi
			# shellcheck disable=SC2086
			R="$( "${ALLSKY_SCRIPTS}/createAllskyOptions.php" \
				${FORCE} ${DEBUG_ARG} \
				--cc-file "${CC_FILE}" \
				--options-file "${OPTIONS_FILE}" \
				--settings-file "${SETTINGS_FILE}" \
				2>&1 )"
			RET=$?

			if [[ -f ${SETTINGS_FILE} ]]; then
				# Make sure the web server can update it.
				chmod 664 "${SETTINGS_FILE}" && sudo chgrp "${WEBSERVER_GROUP}" "${SETTINGS_FILE}"
			fi

			if [[ ${RET} -ne 0 ]]; then
				E="ERROR: Unable to create '${OPTIONS_FILE}'"
				if [[ ${OPTIONS_FILE_ONLY} == "true" ]]; then
					E+=" file"
				else
					E+=" and '${SETTINGS_FILE}' files"
				fi
				e_ "${E}, RET=${RET}: ${R}"
# TODO: re-set settings to prior values?
				exit 1
			fi
			[[ ${DEBUG} == "true" && -n ${R} ]] && d_ "${R}"

			ERR=""
			if [[ ! -f ${OPTIONS_FILE} ]]; then
				ERR+="${BR}ERROR Options file ${OPTIONS_FILE} not created."
			fi
			if [[ ! -f ${SETTINGS_FILE} && ${OPTIONS_FILE_ONLY} == "false" ]]; then
				ERR+="${BR}ERROR Settings file ${SETTINGS_FILE} not created."
			fi
			if [[ -n ${ERR} ]]; then
				e_ "${ERROR_PREFIX}${ERR}"
# TODO: re-set settings to prior values?
				exit 2
			fi

			# See if a camera-specific settings file was created.
			# If the latitude isn't set assume it's a new file.
			if [[ -n ${OLD_TYPE} && -n ${OLD_MODEL} &&
					-z "$( settings ".latitude" "${SETTINGS_FILE}" )" ]]; then

				# We assume the user wants the non-camera specific settings below
				# for this camera to be the same as the prior camera.

				if [[ ${DEBUG} == "true" ]]; then
					MSG="Updating user-defined settings in new settings file."
					d_ "${MSG}"
				fi

				# First determine the name of the prior camera-specific settings file.
				NAME="$( basename "${SETTINGS_FILE}" )"
				S_NAME="${NAME%.*}"
				S_EXT="${NAME##*.}"
				OLD_SETTINGS_FILE="${ALLSKY_CONFIG}/${S_NAME}_${OLD_TYPE}_${OLD_MODEL// /_}.${S_EXT}"
				"${ALLSKY_SCRIPTS}/convertJSON.php" \
					--carryforward \
					--null \
					--settings-file "${OLD_SETTINGS_FILE}" |
				while read -r SETTING TYPE VALUE
				do
					# Some carried-forward settings may not be in the old settings file,
					# so check for "null".
					[[ ${VALUE} == "null" ]] && continue

# TODO: use updateJsonFile.sh   key   label   new_value
# SETTING  SETTING  VALUE
					update_json_file ".${SETTING}" "${VALUE}" "${SETTINGS_FILE}" "${TYPE}" ||
					w_ "WARNING: Unable to update ${SETTING} of type ${TYPE}" >&2
				done
			fi

			FULL_OVERLAY_NAME="overlay-${CAMERA_TYPE}_${CAMERA_MODEL// /_}"
			FULL_OVERLAY_NAME+="-${C_sensorWidth}x${C_sensorHeight}-both.json"
			OVERLAY_PATH="${ALLSKY_REPO}/overlay/config/${FULL_OVERLAY_NAME}"
			if [[ -f ${OVERLAY_PATH} ]]; then
				OVERLAY_NAME=${FULL_OVERLAY_NAME}
			else
				OVERLAY_NAME="overlay-${CAMERA_TYPE}.json"
			fi
			# Set to defaults since there are no prior files.
			for s in daytimeoverlay nighttimeoverlay
			do
				update_json_file ".${s}" "${OVERLAY_NAME}" "${SETTINGS_FILE}" "text"
			done
			COMPUTER="$( get_computer )"
			update_json_file ".computer" "${COMPUTER}" "${SETTINGS_FILE}" "text"
			update_json_file ".camera" "${CAMERA_TYPE} ${CAMERA_MODEL}" "${SETTINGS_FILE}" "text"

			# Because the user doesn't change the camera number directly it's
			# not updated in the settings file, so we have to do it.
			if [[ -z ${CAMERA_NUMBER} ]]; then
				# This uses the CC_FILE just created.
				CAMERA_NUMBER="$( settings ".cameraNumber" "${CC_FILE}" )"
				CAMERA_NUMBER=${CAMERA_NUMBER:-0}
			fi
			update_json_file ".cameranumber" "${CAMERA_NUMBER}" "${SETTINGS_FILE}" "integer"

			if [[ ${ADD_NEW_SETTINGS} == "true" ]]; then
				add_new_settings "${SETTINGS_FILE}" "${OPTIONS_FILE}" "${FROM_INSTALL}"
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
# TODO: Use  ${S_filename}  ??
			check_filename_type "$( settings '.filename' )" "${NEW_VALUE}" || OK="false"
			;;

		"filename")
# TODO: Use  ${S_type}  ??
			if check_filename_type "${NEW_VALUE}" "$( settings '.type' )" ; then
				check_website && WEBSITE_CONFIG+=("config.imageName" "${LABEL}" "${NEW_VALUE}")
				WEBSITE_VALUE_CHANGED="true"
			else
				OK="false"
			fi
			;;

		"usedarkframes")
			if [[ ${NEW_VALUE} == "true" ]]; then
				if [[ ! -d ${ALLSKY_DARKS} ]]; then
					w_ "WARNING: No darks to subtract.  No '${ALLSKY_DARKS}' directory."
					# Restore to old value
					echo "${BR}Disabling ${WSNs}${LABEL}${WSNe}."
					update_json_file ".${KEY}" "${OLD_VALUE}" "${SETTINGS_FILE}" "boolean"
					(( NUM_CHANGED-- ))
				else
					NUM_DARKS=$( find "${ALLSKY_DARKS}" -name "*.${EXTENSION}" 2>/dev/null | wc -l)
					if [[ ${NUM_DARKS} -eq 0 ]]; then
						W="WARNING: ${WSNs}${LABEL}${WSNe} is set but there are no darks"
						W+=" in '${ALLSKY_DARKS}' with extension of '${EXTENSION}'."
						w_ "${W}"
						echo    "${BR}FIX: Either disable the setting or take dark frames."
					fi
				fi
			fi
			;;

		"extratext")
			# It's possible the user will create/populate the file while Allsky is running,
			# so it's not an error if the file doesn't exist or is empty.
			if [[ -n ${NEW_VALUE} ]]; then
				if [[ ! -f ${NEW_VALUE} ]]; then
					X=" does not exist"
				elif [[ ! -s ${NEW_VALUE} ]]; then
					X=" is empty"
				fi
				w_ "WARNING: '${NEW_VALUE}' ${X}; please change it."
			fi
			;;

		"config")
			if [[ ${NEW_VALUE} == "" ]]; then
				NEW_VALUE="[none]"
			elif [[ ${NEW_VALUE} != "[none]" ]]; then
				if [[ ! -f ${NEW_VALUE} ]]; then
					X=" does not exist"
				elif [[ ! -s ${NEW_VALUE} ]]; then
					X=" is empty"
				fi
				w_ "WARNING: Configuration file '${NEW_VALUE}' ${X}; please change it."
			fi
			;;

		"daytuningfile" | "nighttuningfile")
			if [[ -n ${NEW_VALUE} && ! -f ${NEW_VALUE} ]]; then
				w_ "WARNING: Tuning File '${NEW_VALUE}' does not exist; please change it."
			fi
			;;

		"displaysettings")
			[[ ${NEW_VALUE} != "false" ]] && NEW_VALUE="true"
			if check_website; then
				# If there are TWO Websites, this gets the index in the first one.
				# Let's hope it's the same index in the second one...
				PARENT="homePage.popoutIcons"
				INDEX=$( getJSONarrayIndex "${WEB_CONFIG_FILE}" "${PARENT}" "Allsky Settings" )
				if [[ ${INDEX} -ge 0 ]]; then
					WEBSITE_CONFIG+=("${PARENT}[${INDEX}].display" "${LABEL}" "${NEW_VALUE}")
				else
					W="WARNING: Unable to update ${wBOLD}${LABEL}${wNBOLD}"
					W+=" in ${WEB_CONFIG_FILE}; ignoring."
					w_ "${W}"
				fi
			else
				W="Change to ${wBOLD}${LABEL}${wNBOLD} not relevant - "
				W+="\nNo local or remote Allsky Website enabled."
				w_ "${W}"
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
			if LAT_LON="$( convertLatLong "${NEW_VALUE}" "${KEY}" 2>&1 )" ; then
				check_website && WEBSITE_CONFIG+=(config."${KEY}" "${LABEL}" "${LAT_LON}")
				WEBSITE_VALUE_CHANGED="true"
				RUN_POSTTOMAP="true"
			else
				# Restore to old value
				e_ "${LAT_LON}"
				echo "${BR}Setting ${WSNs}${LABEL}${WSNe} back to ${WSVs}${OLD_VALUE}${WSVe}."
				update_json_file ".${KEY}" "${OLD_VALUE}" "${SETTINGS_FILE}" "string"
				(( NUM_CHANGED-- ))
				OK="false"
			fi
			;;

		"location" | "owner" | "camera" | "lens" | "computer")
			RUN_POSTTOMAP="true"
			check_website && WEBSITE_CONFIG+=(config."${KEY}" "${LABEL}" "${NEW_VALUE}")
			WEBSITE_VALUE_CHANGED="true"
			;;


		"uselocalwebsite")
			if [[ ${NEW_VALUE} == "true" ]]; then
				prepare_local_website "" "postData"
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
				W="NOTE: You must enable the ${wBOLD}Overlay Module${wNBOLD} in the"
				W+="\n ${wBOLD}Daytime Capture${wNBOLD} and/or"
				W+="\n ${wBOLD}Nighttime Capture${wNBOLD} flows of the"
				W+="\n ${wBOLD}Module Manager${wNBOLD}"
				W+="\n for the '${LABEL}' to take effect."
				w "${W}"
			else
				rm -f "${ALLSKY_TMP}/overlaydebug.txt"
			fi
			;;

		"takedaytimeimages" | "takenighttimeimages")
:
###### TODO anything to do for these?
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

				THIS_OK="true"
#XX echo "CALLING: checkPixelValue 'Timelapse ${LABEL}' '${NEW_VALUE}' '${MIN}' '${MAX}'"
				if ! checkPixelValue "Timelapse ${LABEL}" "sensor size" "${NEW_VALUE}" "${MIN}" "${MAX}" ; then
#XX echo "    FALSE"
					THIS_OK="false"
				else
					if [[ ${DID_TIMELAPSE} == "false" ]]; then
#XX echo "CALLING: checkWidthHeight 'Timelapse' 'timelapse' '${S_timelapsewidth}' '${S_timelapseheight}' '${C_sensorWidth}' '${C_sensorHeight}'"
						if ! checkWidthHeight "Timelapse" "timelapse" \
						"${S_timelapsewidth}" "${S_timelapseheight}" \
	 					"${C_sensorWidth}" "${C_sensorHeight}" 2>&1 ; then
#XX echo "false"
							THIS_OK="false"
						fi
						DID_TIMELAPSE="true"
					fi
				fi

				if [[ ${THIS_OK} == "false" ]]; then
					# Restore to old value
					echo "Setting ${WSNs}Timelapse ${LABEL}${WSNe} back to ${WSVs}${OLD_VALUE}${WSVe}."
					update_json_file ".${KEY}" "${OLD_VALUE}" "${SETTINGS_FILE}" "number"
					(( NUM_CHANGED-- ))
					OK="false"
				fi
			fi
			;;

		"minitimelapsewidth" | "minitimelapseheight")
			if ! ERR="$( checkWidthHeight "Mini-Timelapse" "mini-timelapse" \
				"${S_minitimelapsewidth}" "${S_minitimelapseheight}" \
				"${C_sensorWidth}" "${C_sensorHeight}" 2>&1 )" ; then

# Only display the "both must be 0 or not 0" msg once
				echo -e "ERROR: ${ERR}"
				# Restore to old value
				update_json_file ".${KEY}" "${OLD_VALUE}" "${SETTINGS_FILE}" "number"
				(( NUM_CHANGED-- ))
			fi
			;;

		"imageresizeuploadwidth" | "imageresizeuploadheight")
			if ! ERR="$( checkWidthHeight "Image RESIZE" \
				"${S_imageresizewidth}" "${S_imageresizeheight}" \
	 			"${C_sensorWidth}" "${C_sensorHeight}" 2>&1 )" ; then

# Only display the "both must be 0 or not 0" msg once
				echo -e "ERROR: ${ERR}"
				# Restore to old value
				update_json_file ".${KEY}" "${OLD_VALUE}" "${SETTINGS_FILE}" "number"
				(( NUM_CHANGED-- ))
			fi
			;;

		"imageresizewidth" | "imageresizeheight")
			if ! ERR="$( checkWidthHeight "Image RESIZE" \
				"${S_imageresizewidth}" "${S_imageresizeheight}" \
	 			"${C_sensorWidth}" "${C_sensorHeight}" 2>&1 )" ; then

# Only display the "both must be 0 or not 0" msg once
				echo -e "ERROR: ${ERR}"
				# Restore to old value
				update_json_file ".${KEY}" "${OLD_VALUE}" "${SETTINGS_FILE}" "number"
				(( NUM_CHANGED-- ))
			fi
			;;

		"imagecroptop" | "imagecropright" | "imagecropbottom" | "imagecropleft")

			if [[ $((S_imagecroptop + S_imagecropright + BOTTOM + LEFT)) -gt 0 ]]; then
				ERR="$( checkCropValues "${S_imagecroptop}" "${S_imagecropright}" \
					"${S_imagecropbottom}" "${S_imagecropleft}" \
					"${C_sensorWidth}" "${C_sensorHeight}" )"
				if [[ $? -ne 0 ]]; then
					MSG="ERROR: ${ERR}${BR}"
					MSG+="FIX: Check the ${WSNs}Image Crop Top/Right/Bottom/Left${WSNe} settings."
					echo -e "${MSG}"
				fi
			fi
			;;

		"timelapsevcodec")
			if ! ffmpeg -encoders 2>/dev/null | awk -v codec="${NEW_VALUE}" '
				BEGIN { exit_code = 1; }
				{ if ($2 == codec) { exit_code = 0; exit 0; } }
				END { exit exit_code; }' ; then

				MSG="WARNING: "
				MSG+="Unknown VCODEC: '${NEW_VALUE}'; resetting to '${OLD_VALUE}'."
				MSG+="${BR}Execute: ffmpeg -encoders"
				MSG+="${BR}for a list of VCODECs."
				w_ "${MSG}"

				# Restore to old value
				update_json_file ".${KEY}" "${OLD_VALUE}" "${SETTINGS_FILE}" "text"
				(( NUM_CHANGED-- ))
			fi
			;;

		"timelapsepixfmt")
			if ! ffmpeg -pix_fmts 2>/dev/null | awk -v fmt="${NEW_VALUE}" '
				BEGIN { exit_code = 1; }
				{ if ($2 == fmt) { exit_code = 0; exit 0; } }
				END { exit exit_code; }' ; then

				MSG="WARNING: "
				MSG+="Unknown Pixel Format: '${NEW_VALUE}'; resetting to '${OLD_VALUE}'."
				MSG+="Execute: ffmpeg -pix_fmts"
				MSG+="for a list of formats."
				w_ "${MSG}"

				# Restore to old value
				update_json_file ".${KEY}" "${OLD_VALUE}" "${SETTINGS_FILE}" "text"
				(( NUM_CHANGED-- ))
			fi
			;;

		"daystokeep" | "daystokeeplocalwebsite" | "daystokeepremotewebsite")
			if [[ ${NEW_VALUE} -gt 0 ]]; then
:	# TODO: Check how many days images there are of the specified type.
	# For remote website, query the website for the number (to be implemented).
	# If MORE than NEW_VALUE, warn the user since those images will be deleted
	# at the next endOfNight.sh run.
			fi
			;;

		"uselogin")
			if [[ ${NEW_VALUE} == "false" ]]; then
				W="WARNING: "
				W+="Disabling '${LABEL}' should NOT be done if your Pi is"
				W+=" accessible on the Internet.  It's a HUGE security risk!"
				w_ "${W}"
			fi
			;;

		*)
			W="WARNING: "
			W+="Unknown key '${KEY}'; ignoring.  Old=${OLD_VALUE}, New=${NEW_VALUE}"
			W+="${wNC}"
			w_ "${W}"
			(( NUM_CHANGED-- ))
			;;

		esac
done

[[ ${OK} == "false" ]] && exit 1

[[ ${NUM_CHANGED} -le 0 ]] && exit 0		# Nothing changed

# TODO: Use  ${S_useremotewebsite} and ${S_useremoteserver}  ??
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
			W="WARNING: "
			W+="The Remote Website is now enabled but hasn't been installed yet."
			W+="${BR}Please do so now."
			if [[ ${ON_TTY} == "false" ]]; then		# called from WebUI.
				W+="${BR}See <a allsky='true' external='true'"
				W+=" href='/documentation/installations/AllskyWebsite.html'>the documentation</a>"
			fi
			w_ "${W}"
			[[ ${WEBSITES} != "local" ]] && WEBSITES=""
		fi
	fi

	if [[ ${USE_REMOTE_SERVER} == "true" && ${CHECK_REMOTE_SERVER_ACCESS} == "true" ]]; then
		"${ALLSKY_SCRIPTS}/testUpload.sh" --server
	fi
fi

CHANGED_LOCAL_WEBSITE="false"
CHANGED_REMOTE_WEBSITE="false"
# shellcheck disable=SC2128
if [[ ${#WEBSITE_CONFIG[@]} -gt 0 ]]; then
	# Update the local and/or Website remote config file
	if [[ ${WEBSITES} == "local" || ${WEBSITES} == "both" ]]; then
		[[ ${DEBUG} == "true" ]] && d_ "Executing updateJsonFile.sh --local"
		# shellcheck disable=SC2086
		"${ALLSKY_SCRIPTS}/updateJsonFile.sh" ${DEBUG_ARG} --local "${WEBSITE_CONFIG[@]}"
		CHANGED_LOCAL_WEBSITE="true"
	fi

	if [[ ${WEBSITES} == "remote" || ${WEBSITES} == "both" ]]; then
		[[ ${DEBUG} == "true" ]] && d_ "Executing updateJsonFile.sh --remote"
		# shellcheck disable=SC2086
		"${ALLSKY_SCRIPTS}/updateJsonFile.sh" ${DEBUG_ARG} --remote "${WEBSITE_CONFIG[@]}"
		CHANGED_REMOTE_WEBSITE="true"

		FILE_TO_UPLOAD="${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}"

# TODO: Use  ${S_remotewebsiteimagedir}  ??
		IMAGE_DIR="$( settings ".remotewebsiteimagedir" )"
		[[ ${DEBUG} == "true" ]] && d_ "Uploading '${FILE_TO_UPLOAD}' to remote Website."

		if ! "${ALLSKY_SCRIPTS}/upload.sh" --silent --remote-web \
				"${FILE_TO_UPLOAD}" \
				"${IMAGE_DIR}" \
				"${ALLSKY_WEBSITE_CONFIGURATION_NAME}" \
				"RemoteWebsite" ; then
			e_ "${ERROR_PREFIX}Unable to upload '${FILE_TO_UPLOAD}' to Website ${NUM}."
		fi
	fi
fi

if [[ ${WEBSITE_VALUE_CHANGED} == "true" ]]; then
	# TODO: A default local configuration.json file is created during installation
	# if one didn't already exist.
	# We have no way of knowing if what's there is the default file or was modified or
	# was copied from the prior Allsky.
	# Until we do, no't display this message:
	if [[ ${CHANGED_LOCAL_WEBSITE} == "false" && -f ${ALLSKY_WEBSITE_CONFIGURATION_FILE} ]]; then
:
#		echo -n "WARNING: ${ALLSKY_WEBSITE_CONFIGURATION_NAME} not updated"
#		echo    " because the local Website is not enabled."
	fi
	if [[ ${CHANGED_REMOTE_WEBSITE} == "false" && -f ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE} ]]; then
		echo -n "WARNING: ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_NAME} not updated"
		echo    " because the remote Website is not enabled."
	fi
fi

if [[ ${RUN_POSTTOMAP} == "true" ]]; then
# TODO: Use  ${S_showonmap}  ??
	[[ -z ${SHOW_ON_MAP} ]] && SHOW_ON_MAP="$( settings ".showonmap" )"
	if [[ ${SHOW_ON_MAP} == "true" ]]; then
		[[ ${DEBUG} == "true" ]] && d_ "Executing postToMap.sh"
		# shellcheck disable=SC2086
		"${ALLSKY_SCRIPTS}/postToMap.sh" --whisper --force ${DEBUG_ARG} ${FROM_WEBUI} ${POSTTOMAP_ACTION}
	fi
fi

if [[ ${GOT_WARNING} == "true" ]]; then
	exit 255
else
	exit 0
fi
