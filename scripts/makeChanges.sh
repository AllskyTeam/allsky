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
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/checkFunctions.sh"			|| exit "${EXIT_ERROR_STOP}"

function usage_and_exit()
{
	exec >&2
	local E="\n"
	E+="Usage: ${ME} [--debug] [--optionsOnly] [--cameraTypeOnly] [--from f] [--addNewSettings]"
	E+="\n\tkey  label  old_value  new_value  [...]"
	wE_ "${E}"
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
FROM=""						# Where are we called from?
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
			ALLSKY_SETTINGS_FILE=""
			;;
		--cameratypeonly)
			CAMERA_TYPE_ONLY="true"
			;;
		--from)
			FROM="${2,,}"
			shift
			;;
		--addnewsettings)
			ADD_NEW_SETTINGS="true"
			;;
		--force)
			FORCE="${ARG}"
			;;
		-*)
			wE_ "ERROR: Unknown argument: '${ARG}'"
			OK="false"
			;;
		*)
			break
			;;
	esac
	shift
done

if [[ ${FROM} == "webui" ]]; then
	# The WebUI will display our output in an
	# appropriate style if ERROR: or WARNING: is in the message, so
	# don't provide our own format.
	ERROR_PREFIX=""
	wERROR=""
	wWARNING=""
	wNC=""
else
	ERROR_PREFIX="${ME}: "
fi

[[ ${HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" ]] && usage_and_exit 1
if [[ ${OPTIONS_FILE_ONLY} == "false" ]]; then
	[[ $# -eq 0 ]] && usage_and_exit 1
	[[ $(($# % 4)) -ne 0 ]] && usage_and_exit 2
fi
if [[ ${DEBUG} == "true" ]]; then
	debug() { return 0 ; }
else
	debug() { return 1 ; }
fi

RUN_POSTTOMAP="false"
POSTTOMAP_ACTION=""
WEBSITE_CONFIG=()
WEBSITE_VALUE_CHANGED="false"
GOT_WARNING="false"
SHOW_ON_MAP=""
CHECK_REMOTE_WEBSITE_ACCESS="false"		# check URL
CHECK_REMOTE_WEBSITE_UPLOAD="false"		# check upload to host name
CHECK_REMOTE_SERVER_UPLOAD="false"		# check upload to host name
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

if [[ -f ${ALLSKY_SETTINGS_FILE} ]]; then
	# If the settings file doesn't exist, check_website() won't find a website and
	# we are likely called from the install script before the file is created.

	check_website		# invoke to set variables

	#shellcheck disable=SC2119
	getAllSettings || exit 1
fi

if [[ -f ${ALLSKY_CC_FILE} ]]; then
	# "convertJSON.php" won't work with the ALLSKY_CC_FILE since it has arrays.
	C_sensorWidth="$( settings ".sensorWidth" "${ALLSKY_CC_FILE}" )"
	C_sensorHeight="$( settings ".sensorHeight" "${ALLSKY_CC_FILE}" )"
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
			wE_ "${E}"
			return 1
		fi
	fi
	return 0
}

# Check width and height for daily or mini timelapse
function checkTimelapse()
{
	local KEY="${1}"
	local TYPE="${2}";		local type="${TYPE,,}"; type="${type/-/}"
	local WIDTH="${3}"
	local HEIGHT="${4}"

	local MAX  O  MIN  THIS_OK  W  H

	if [[ ${KEY} == "${type}timelapsewidth" ]]; then
		MAX="${C_sensorWidth}"
		O="${type}timelapseheight"
	else
		MAX="${C_sensorHeight}"
		O="${type}timelapsewidth"
	fi
	MIN=2

	THIS_OK="true"

	if [[ -z ${TYPE} ]]; then
		W="${S_timelapsewidth}"
		H="${S_timelapseheight}"
	else
		W="${S_minitimelapsewidth}"
		H="${S_minitimelapseheight}"
	fi

	# Check for only 1 value of 0.
	if ! checkWidthHeight "${TYPE}Timelapse" "${TYPE}timelapse" \
			"${W}" "${H}" "${C_sensorWidth}" "${C_sensorHeight}" 2>&1 ; then
		THIS_OK="false"
	fi
	if ! checkPixelValue "${TYPE}Timelapse ${LABELS["${KEY}"]}" "sensor size" \
			"${NEW_VALUES["${KEY}"]}" "${MIN}" "${MAX}" ; then
		THIS_OK="false"
	fi
	if [[ -n ${KEYS["${O}"]} ]]; then
		if ! checkPixelValue "${TYPE}Timelapse ${LABELS["${O}"]}" "sensor size" \
				"${NEW_VALUES["${O}"]}" "${MIN}" "${MAX}" ; then
			THIS_OK="false"
		fi
	fi

	unset 'KEYS["${KEY}"]';  unset 'KEYS["${O}"]'

	if [[ ${THIS_OK} == "false" ]]; then
		# Restore the old values
		restoreSettings "${KEY}" "${LABELS["${KEY}"]}" \
			"${OLD_VALUES["${KEY}"]}" "${O}" "${TYPE}Timelapse "
		return 1
	fi

	return 0
}

# Restore a pair of settings.
function restoreSettings()
{
	local KEY="${1}"
	local LABEL="${2}"
	local VALUE="${3}"
	local OTHER_KEY="${4}"
	local PREFIX="${5}"

	local MSG
	MSG="Not changing ${PREFIX}${LABEL}"
	local RESTORES=( "${KEY}" "${LABEL}" "${VALUE}" )
	(( NUM_CHANGED-- ))

	if [[ -n ${KEYS["${OTHER_KEY}"]} ]]; then
		MSG+=" or ${PREFIX}${LABELS["${OTHER_KEY}"]}"
		RESTORES+=( "${OTHER_KEY}" "${LABELS["${OTHER_KEY}"]}" "${OLD_VALUES["${OTHER_KEY}"]}" )
		(( NUM_CHANGED-- ))
	fi

	echo "${MSG}."

	# shellcheck disable=SC2086
	"${ALLSKY_SCRIPTS}/updateJsonFile.sh" \
		--verbosity silent --file "${ALLSKY_SETTINGS_FILE}" "${RESTORES[@]}" ||
		echo "Failed with KEYs '${KEY}' and '${OTHER_KEY}'."
}

CAMERA_NUMBER=""
CAMERA_NUMBER_ARG=""
CAMERA_MODEL=""
CAMERA_MODEL_ARG=""

# Read all the arguments into array.
# Several settings like image size related ones are usually updated at the same time.
# Having an array of all changes allows us to check both values at once,
# and if either is invalid, restore both values.

declare -A KEYS=()
declare -a KEY_NUMS=()
declare -A LABELS=()
declare -A OLD_VALUES=()
declare -A NEW_VALUES=()

NUM_CHANGED=0
while [[ $# -gt 0 ]]
do
	KEY="${1,,}" ;	 KEY="${KEY/#_/}"	# convert to lowercase and remove any leading "_"
	LABEL="${2}"
	OLD_VALUE="${3}"
	NEW_VALUE="${4}"

	shift 4

	# Don't skip if it's a camera* settings since that means we need to refresh the camera info.
	if [[ ${KEY} != "cameratype" && ${KEY} != "cameranumber" && ${KEY} != "cameramodel" &&
			${OLD_VALUE} == "${NEW_VALUE}" ]]; then
		if debug ; then
			wD_ "Skipping ${LABEL} - old and new are equal."
		fi
		continue
	fi

	(( NUM_CHANGED++ ))
	KEY_NUMS[${NUM_CHANGED}]="${KEY}"		# new ones added to the end
	KEYS[${KEY}]="${KEY}"					# new ones appear to be added in random order
	LABELS[${KEY}]="${LABEL}"
	OLD_VALUES[${KEY}]="${OLD_VALUE}"
	NEW_VALUES[${KEY}]="${NEW_VALUE}"
done

# shellcheck disable=SC2302
for KEY in "${KEY_NUMS[@]}"
do
	# See if the setting was already processed and hence removed from the array.
	# Can't check for empty ${KEY} since the items in the "for" line were set once.
	# shellcheck disable=SC2303
	[[ -z ${KEYS[${KEY}]} ]] && continue

	LABEL="${LABELS[${KEY}]}"
	OLD_VALUE="${OLD_VALUES[${KEY}]}"
	NEW_VALUE="${NEW_VALUES[${KEY}]}"

	if debug ; then
		MSG="${KEY}: Old=[${OLD_VALUE}], New=[${NEW_VALUE}]"
		wD_ "${ME}: ${MSG}"
		if [[ ${FROM} == "webui" ]]; then
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
			CAMERA_NUMBER="${NEW_VALUE:-0}"
			CAMERA_NUMBER_ARG=" -cameranumber ${CAMERA_NUMBER}"
			;;

		"cameramodel" | "cameratype")
			if [[ ${KEY} == "cameramodel" ]]; then
				CAMERA_MODEL="${NEW_VALUE}"

				if [[ ${FROM} == "install" ]]; then
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
					MSG="Unknown ${WSNs}${LABEL}${WSNe}: '${CAMERA_TYPE}'."
					wE_ "${ERROR_PREFIX}ERROR: ${MSG}"
					exit "${EXIT_NO_CAMERA}"
				fi
			fi

			# This requires Allsky to be stopped so we don't
			# try to call the capture program while it's already running.
			[[ ${FROM} == "install" ]] && stop_Allsky

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
						wE_ "${ERROR_PREFIX}ERROR: ${RPi_COMMAND_TO_USE}."
						exit "${RET}"
					fi

					if [[ ${FROM} != "install" ]]; then
						# Installation routine already did this,
						# otherwise do it again in case the list of cameras changed.

						# "false" means don't ignore errors (i.e., exit on error).
						get_connected_cameras_info "false" > "${ALLSKY_CONNECTED_CAMERAS_INFO}"
					fi

					OTHER_ARGS="-cmd ${RPi_COMMAND_TO_USE}"
				else
					OTHER_ARGS=""
				fi

				CC_FILE_OLD="${ALLSKY_CC_FILE}-OLD"
				if [[ -f ${ALLSKY_CC_FILE} ]]; then
					# Save the current file just in case creating a new one fails.
					# It's a link so copy it to a temp name, then remove the old name.
					cp "${ALLSKY_CC_FILE}" "${CC_FILE_OLD}"
					rm -f "${ALLSKY_CC_FILE}"
				fi

				# Create the camera capabilities file for the new camera type.
				# Use Debug Level 3 to give the user more info on error.

				if [[ -n ${CAMERA_NUMBER} ]]; then
					MSG="Re-creating files for cameratype ${CAMERA_TYPE},"
					MSG+=" cameranumber ${CAMERA_NUMBER}"
					if [[ ${FROM} == "webui" ]]; then
						echo -e "<script>console.log('${MSG}');</script>"
					elif debug ; then
						wD_ "${MSG}"
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
				if debug ; then
					wD_ "Calling: ${CMD} ${OTHER_ARGS} ${CAMERA_MODEL_ARG} -cc_file '${ALLSKY_CC_FILE}'"
				fi

				# CAMERA_MODEL may have spaces in it so can't put in quotes in
				# ${OTHER_ARGS} (at least I don't know how).
				if [[ -n ${CAMERA_MODEL} ]]; then
					# shellcheck disable=SC2086
					R="$( "${ALLSKY_BIN}/${CMD}" ${OTHER_ARGS} -cc_file "${ALLSKY_CC_FILE}" \
						-cameramodel "${CAMERA_MODEL}" 2>&1 )"
				else
					# shellcheck disable=SC2086
					R="$( "${ALLSKY_BIN}"/${CMD} ${OTHER_ARGS} -cc_file "${ALLSKY_CC_FILE}" 2>&1 )"
				fi
				RET=$?
				if [[ ${RET} -ne 0 || ! -f ${ALLSKY_CC_FILE} ]]; then
					# Restore prior cc file if there was one.
					[[ -f ${CC_FILE_OLD} ]] && mv "${CC_FILE_OLD}" "${ALLSKY_CC_FILE}"

					# Invoker displays error message on EXIT_NO_CAMERA.
					if [[ ${RET} -ne "${EXIT_NO_CAMERA}" ]]; then
						E="${wBR}ERROR: "
						if [[ ${RET} -eq 139 ]]; then
							E+="Segmentation fault in ${CMD}"
						else
							E+="${R}${wBR}Unable to create cc file '${ALLSKY_CC_FILE}'."
						fi
						wE_ "${E}"
					fi
# TODO: re-set settings to prior values?
					exit "${RET}"		# the actual exit code is important
				fi
				[[ -n ${R} ]] && echo -e "${R}"

				# Create a link to a file that contains the camera type and model in the name.

				if [[ -z ${CAMERA_MODEL} ]]; then
					SETTING_NAME="cameraModel"		# Name is Upper case in CC file
					CAMERA_MODEL="$( settings ".${SETTING_NAME}" "${ALLSKY_CC_FILE}" )"
					if [[ -z ${CAMERA_MODEL} ]]; then
						wE_ "ERROR: '${SETTING_NAME}' not found in ${ALLSKY_CC_FILE}."
						[[ -f ${CC_FILE_OLD} ]] && mv "${CC_FILE_OLD}" "${ALLSKY_CC_FILE}"
# TODO: re-set settings to prior values?
						exit 1
					fi
				fi

				# Recreate the variables.json file so PHP and Python scripts
				# get the updated camera info.
				create_variables_json "${FROM}"

				# ${ALLSKY_CC_FILE} is a generic name defined in variables.sh.
				# ${SPECIFIC_NAME} is specific to the camera type/model.
				# It isn't really needed except debugging.
				CC="$( basename "${ALLSKY_CC_FILE}" )"
				CC_EXT="${CC##*.}"			# after "."
				CC_NAME="${CC%.*}"			# before "."
				SPECIFIC_NAME="${ALLSKY_CONFIG}/"
				SPECIFIC_NAME+="${CC_NAME}_${CAMERA_TYPE}_${CAMERA_MODEL// /_}.${CC_EXT}"

				# Any old and new camera capabilities file should be the same unless Allsky
				# adds or changes capabilities, so delete the old one just in case.
				ln --force "${ALLSKY_CC_FILE}" "${SPECIFIC_NAME}"

				# The old file is no longer needed.
				rm -f "${CC_FILE_OLD}"
			fi

			# createAllskyOptions.php will use the cc file and the options template file
			# to create an ALLSKY_OPTIONS_FILE and ALLSKY_SETTINGS_FILE for this camera type/model.
			# If there is an existing camera-specific settings file for the new
			# camera type/model then createAllskyOptions.php will use it and link it
			# to ALLSKY_SETTINGS_FILE.
			# If there is no existing camera-specific file, i.e., this camera is new
			# to Allsky, it will create a default settings file using the generic
			# values from the prior settings file if it exists.
			if [[ -f ${ALLSKY_SETTINGS_FILE} ]]; then
				# Prior settings file exists so save the old TYPE and MODEL
				OLD_TYPE="${S_cameratype}"
				OLD_MODEL="${S_cameramodel}"
			else
				OLD_TYPE=""
				OLD_MODEL=""
			fi

			if debug ; then
				MSG="Calling: ${ALLSKY_SCRIPTS}/createAllskyOptions.php ${FORCE} ${DEBUG_ARG}"
				MSG+="\n\t--cc-file ${ALLSKY_CC_FILE}"
				MSG+="\n\t--options-file ${ALLSKY_OPTIONS_FILE}"
				MSG+="\n\t--settings-file ${ALLSKY_SETTINGS_FILE}"
				wD_ "${MSG}"
			fi
			# shellcheck disable=SC2086
			R="$( "${ALLSKY_SCRIPTS}/createAllskyOptions.php" \
				${FORCE} ${DEBUG_ARG} \
				--cc-file "${ALLSKY_CC_FILE}" \
				--options-file "${ALLSKY_OPTIONS_FILE}" \
				--settings-file "${ALLSKY_SETTINGS_FILE}" \
				2>&1 )"
			RET=$?

			if [[ -f ${ALLSKY_SETTINGS_FILE} ]]; then
				# Make sure the web server can update it.
				chmod 664 "${ALLSKY_SETTINGS_FILE}" && sudo chgrp "${WEBSERVER_GROUP}" "${ALLSKY_SETTINGS_FILE}"
			fi

			if [[ ${RET} -ne 0 ]]; then
				E="ERROR: Unable to create '${ALLSKY_OPTIONS_FILE}'"
				if [[ ${OPTIONS_FILE_ONLY} == "true" ]]; then
					E+=" file"
				else
					E+=" and '${ALLSKY_SETTINGS_FILE}' files"
				fi
				wE_ "${E}, RET=${RET}: ${R}"
# TODO: re-set settings to prior values?
				exit 1
			fi
			debug && [[ -n ${R} ]] && wD_ "${R}"

			ERR=""
			if [[ ! -f ${ALLSKY_OPTIONS_FILE} ]]; then
				ERR+="${wBR}ERROR Options file ${ALLSKY_OPTIONS_FILE} not created."
			fi
			if [[ ! -f ${ALLSKY_SETTINGS_FILE} && ${OPTIONS_FILE_ONLY} == "false" ]]; then
				ERR+="${wBR}ERROR Settings file ${ALLSKY_SETTINGS_FILE} not created."
			fi
			if [[ -n ${ERR} ]]; then
				wE_ "${ERROR_PREFIX}${ERR}"
# TODO: re-set settings to prior values?
				exit 2
			fi

			# See if a camera-specific settings file was created.
			# If the latitude isn't set assume it's a new file.
			if [[ -n ${OLD_TYPE} && -n ${OLD_MODEL} &&
					-z "$( settings ".latitude" "${ALLSKY_SETTINGS_FILE}" )" ]]; then

				# We assume the user wants the non-camera specific settings below
				# for this camera to be the same as the prior camera.

				# First determine the name of the prior camera-specific settings file.
				NAME="$( basename "${ALLSKY_SETTINGS_FILE}" )"
				S_NAME="${NAME%.*}"
				S_EXT="${NAME##*.}"
				O="${S_NAME}_${OLD_TYPE}_${OLD_MODEL// /_}.${S_EXT}"
				OLD_SETTINGS_FILE="${ALLSKY_CONFIG}/${O}"
				if debug ; then
					MSG="Updating user-defined settings in new settings file from '${O}'."
					wD_ "${MSG}"
				fi

				{
					echo "_START_"
					"${ALLSKY_SCRIPTS}/convertJSON.php" \
						--carryforward \
						--null \
						--settings-file "${OLD_SETTINGS_FILE}"
					echo "_END_"
				} |
				while read -r SETTING TYPE VALUE
				do
					if [[ ${SETTING} == "_START_" ]]; then
						CHANGES=()
					elif [[ ${SETTING} == "_END_" ]]; then
						if [[ ${#CHANGES[@]} -gt 0 ]]; then
							# shellcheck disable=SC2086
							"${ALLSKY_SCRIPTS}/updateJsonFile.sh" \
								--verbosity silent --file "${ALLSKY_SETTINGS_FILE}" "${CHANGES[@]}"
						fi
					else
						# Some carried-forward settings may not be in the old settings file,
						# so check for "null".
						[[ ${VALUE} == "null" ]] && continue

						CHANGES+=( "${SETTING}" "${SETTING,,}" "${VALUE}" )
					fi
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

			CHANGES=()
			# Set to defaults since there are no prior files.
			for s in daytimeoverlay nighttimeoverlay
			do
				CHANGES+=( "${s}" "${s}" "${OVERLAY_NAME}" )
			done
			COMPUTER="$( get_computer "" )"
			CHANGES+=( "computer" "Computer" "${COMPUTER}" )
			CHANGES+=( "camera" "Camera" "${CAMERA_TYPE} ${CAMERA_MODEL}" )

			# Because the user doesn't change the camera number directly it's
			# not updated in the settings file, so we have to do it.
			if [[ -z ${CAMERA_NUMBER} ]]; then
				# This uses the ALLSKY_CC_FILE just created.
				CAMERA_NUMBER="$( settings ".cameraNumber" "${ALLSKY_CC_FILE}" )"
				CAMERA_NUMBER=${CAMERA_NUMBER:-0}
			fi
			CHANGES+=( "cameranumber" "Camera Number" "${CAMERA_NUMBER}" )

			# shellcheck disable=SC2086
			"${ALLSKY_SCRIPTS}/updateJsonFile.sh" \
				--verbosity silent --file "${ALLSKY_SETTINGS_FILE}" "${CHANGES[@]}"

			if [[ ${ADD_NEW_SETTINGS} == "true" ]]; then
				add_new_settings "${ALLSKY_SETTINGS_FILE}" "${ALLSKY_OPTIONS_FILE}" "${FROM}"
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

		"locale")
			if ! is_installed_locale "${NEW_VALUE}"; then
				E="ERROR: ${WSNs}${LABEL}${WSNe} ${WSVs}${NEW_VALUE}${WSVe} is not installed on this computer."
				wE_ "${E}"
				echo -e "${wBR}Installed locales are:${wBR}${INSTALLED_LOCALES}${wBR}"

				echo "${wBR}Setting ${WSNs}${LABEL}${WSNe} back to ${WSVs}${OLD_VALUE}${WSVe}."
				update_json_file ".${KEY}" "${OLD_VALUE}" "${ALLSKY_SETTINGS_FILE}" "string"
				(( NUM_CHANGED-- ))
			fi
			;;

		"type")
			check_filename_type "${S_filename}" "${NEW_VALUE}" || OK="false"
			;;

		"filename")
			if check_filename_type "${NEW_VALUE}" "${S_type}" ; then
				check_website && WEBSITE_CONFIG+=("config.imageName" "${LABEL}" "${NEW_VALUE}")
				WEBSITE_VALUE_CHANGED="true"
			else
				OK="false"
			fi
			;;

		"focusmode")
			if [[ ${NEW_VALUE} == "true" ]]; then
				if [[ ${S_takedarkframes} == "true" ]]; then
					wE_ "ERROR: ${WSNs}${LABEL}${WSNe} and ${WSNs}${S_takedarkframes_label}${WSNe} cannot be active at the same time."
					# Restore to old value
					echo "${wBR}Disabling ${WSNs}${LABEL}${WSNe}."
					update_json_file ".${KEY}" "${OLD_VALUE}" "${ALLSKY_SETTINGS_FILE}" "boolean"
					(( NUM_CHANGED-- ))
				else
					wE_ "Focus Mode is enable - don't forget to turn off when done focusing."
				fi
			fi
			;;

		"usedarkframes")
			if [[ ${NEW_VALUE} == "true" ]]; then
				if [[ ! -d ${ALLSKY_DARKS} ]]; then
					wE_ "ERROR: The '${ALLSKY_DARKS}' directory does not exist so there are no darks to subtract."
					# Restore to old value
					echo "${wBR}Disabling ${WSNs}${LABEL}${WSNe}."
					update_json_file ".${KEY}" "${OLD_VALUE}" "${ALLSKY_SETTINGS_FILE}" "boolean"
					(( NUM_CHANGED-- ))
				else
					NUM_DARKS=$( find "${ALLSKY_DARKS}" \( -name "*.png" -o -name "*.jpg" \) 2>/dev/null | wc -l)
					if [[ ${NUM_DARKS} -eq 0 ]]; then
						W="WARNING: ${WSNs}${LABEL}${WSNe} is set but there are no darks"
						W+=" frames in '${ALLSKY_DARKS}'."
						wW_ "${W}"
						echo "${wBR}FIX: Either disable the setting or take dark frames."
					fi
				fi
			fi
			;;

		"imageremovebadhighdarkframe")
			if [[ -n ${OLD_VALUE} && $( echo "${NEW_VALUE} > ${OLD_VALUE}" | bc ) -eq 1 ]] ; then
				MSG="Having to increase ${WSNs}${LABEL}${WSNe} is often a"
				MSG+=" sign that the lens is not fully covered"
				MSG+=" or your cameras is VERY noisy."
				wI_ "${MSG}"
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
				wW_ "WARNING: '${NEW_VALUE}' ${X}; please change it."
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
				wW_ "WARNING: Configuration file '${NEW_VALUE}' ${X}; please change it."
			fi
			;;

		"daytuningfile" | "nighttuningfile")
			if [[ -n ${NEW_VALUE} && ! -f ${NEW_VALUE} ]]; then
				wW_ "WARNING: Tuning File '${NEW_VALUE}' does not exist; please change it."
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
					W="WARNING: Unable to update ${WSNs}${LABEL}${WSNe}"
					W+=" in ${WEB_CONFIG_FILE}; ignoring."
					wW_ "${W}"
				fi
			else
				W="Change to ${WSNs}${LABEL}${WSNe} not relevant - "
				W+="\nNo local or remote Allsky Website enabled."
				wW_ "${W}"
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
				# Don't restore the "other" KEY since the two keys don't depend on each other.
				wE_ "${LAT_LON}"
				echo "${wBR}Setting ${WSNs}${LABEL}${WSNe} back to ${WSVs}${OLD_VALUE}${WSVe}."
				update_json_file ".${KEY}" "${OLD_VALUE}" "${ALLSKY_SETTINGS_FILE}" "string"
				(( NUM_CHANGED-- ))
			fi
			;;

		"location" | "owner" | "lens" | "equipmentinfo")
			RUN_POSTTOMAP="true"
			check_website && WEBSITE_CONFIG+=(config."${KEY}" "${LABEL}" "${NEW_VALUE}")
			WEBSITE_VALUE_CHANGED="true"
			;;


		"uselocalwebsite")
			[[ ${NEW_VALUE} == "true" ]] && prepare_local_website "" "postData"
			;;

		"remotewebsiteurl" | "remotewebsiteimageurl")
			CHECK_REMOTE_WEBSITE_ACCESS="true"
			RUN_POSTTOMAP="true"
			;;

		"useremotewebsite")
			if [[ ${NEW_VALUE} == "true" ]]; then
				CHECK_REMOTE_WEBSITE_ACCESS="true"
				CHECK_REMOTE_WEBSITE_UPLOAD="true"
			fi
			;;

		"remotewebsiteprotocol" | "remotewebsiteimagedir")
			CHECK_REMOTE_WEBSITE_UPLOAD="true"
			;;

		remotewebsite_*)		# from REMOTE_WEBSITE_* settings in env file
			CHECK_REMOTE_WEBSITE_ACCESS="true"
			CHECK_REMOTE_WEBSITE_UPLOAD="true"
			;;


		"useremoteserver")
			if [[ ${NEW_VALUE} == "true" ]]; then
				CHECK_REMOTE_SERVER_UPLOAD="true"
			fi
			;;

		"remoteserverprotocol" | "remoteserverimagedir")
			CHECK_REMOTE_SERVER_UPLOAD="true"
			;;

		remoteserver_*)			# from env file
			CHECK_REMOTE_SERVER_UPLOAD="true"
			;;

		"takedaytimeimages" | "takenighttimeimages")
:	###### TODO anything to do for these?
			;;

		"timelapsewidth" | "timelapseheight")
			if [[ $((S_timelapsewidth + S_timelapseheight)) -gt 0 ]]; then
				if ! checkTimelapse "${KEY}" "" \
						"${S_timelapsewidth}" "${S_timelapseheight}" ; then
					OK="false"
				fi
			fi
			;;

		"minitimelapsewidth" | "minitimelapseheight")
			if [[ $((S_minitimelapsewidth + S_minitimelapseheight)) -gt 0 ]]; then
				if ! checkTimelapse "${KEY}" "Mini-" \
						"${S_minitimelapsewidth}" "${S_minitimelapseheight}" ; then
					OK="false"
				fi
			fi
			;;

		"minitimelapsenumimages")
			if [[ ${NEW_VALUE} != "${OLD_VALUE}" &&
				(${S_uselocalwebsite} == "true" || ${S_useremotewebsite} == "true" ) ]];
			then
				# Just look at local Website config file.  Assume remote is the same.
				PARENT="homePage.leftSidebar"
				FIELD="Mini-timelapse"
				CONFIG="${ALLSKY_WEBSITE_CONFIGURATION_FILE}"
				INDEX=$( getJSONarrayIndex "${CONFIG}" "${PARENT}" "${FIELD}" )
				if [[ ${INDEX} -ge 0 ]]; then
					DISPLAY="$( settings ".${PARENT}[${INDEX}].display" "${CONFIG}" )"
					[[ ${DISPLAY} != "true" ]] && NEW_VALUE="false"
	
					X=""
					if [[ ${NEW_VALUE} -eq 0 ]]; then	# Turned OFF mini-timelapse creation.
						[[ ${DISPLAY} == "true" ]] && X="false"
					else								# Turned ON creation
						[[ ${DISPLAY} == "false" ]] && X="true"
						URL="$( settings ".${PARENT}[${INDEX}].url" "${CONFIG}" )"
						if [[ -z ${URL} ]]; then
							MSG="WARNING: "
							MSG+="The ${STRONGs}url${STRONGe} field for ${FIELD} in the "
							MSG+="Allsky Website's configuration file is empty."
							MSG+="${NL}"
							MSG+="See the Allsky Documentation for what it should be set to."
							wW_ "${MSG}"
						fi
					fi
					if [[ -n ${X} ]]; then
						MSG="REMINDER: Don't forget to set the ${STRONGs}display${STRONGe}"
						MSG+=" field for ${FIELD} to ${STRONGs}${X}${STRONGe} in the"
						F=""
						if [[ ${S_uselocalwebsite} == "true" ]]; then
							F="${WSFs}${ALLSKY_WEBSITE_CONFIGURATION_NAME}${WSFe}"
						fi
						if [[ ${S_useremotewebsite} == "true" ]]; then
							[[ -n ${F} ]] && F+=" and "
							F+="${WSFs}${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_NAME}${WSFe}"
						fi
						wI_ "${MSG} ${F} file(s) in the WebUI's 'Editor' page."
					fi
				else
					W="WARNING: Unable read '${FIELD}' in '${CONFIG}'."
					wW_ "${W}"
				fi
			fi
			;;

		"imageresizeuploadswidth" | "imageresizeuploadsheight")
			if [[ ${KEY} == "imageresizeupladwidth" ]]; then
				O="imageresizeuploadheight"
			else
				O="imageresizeuploadwidth"
			fi
			if ! ERR="$( _checkWidthHeight "Resize Uploaded Images" "uploaded image" \
				"${S_imageresizeuploadwidth}" "${S_imageresizeuploadheight}" \
	 			"${C_sensorWidth}" "${C_sensorHeight}" 2>&1 )" ; then

				echo -e "ERROR: ${ERR}"
				# Restore the old values
				restoreSettings "${KEY}" "${LABEL}" "${OLD_VALUE}" "${O}" ""
			fi

			unset 'KEYS["${KEY}"]';  unset 'KEYS["${O}"]'
			;;

		"imageresizewidth" | "imageresizeheight")
			if [[ ${KEY} == "imageresizewidth" ]]; then
				O="imageresizeheight"
			else
				O="imageresizewidth"
			fi
			if ! ERR="$( _checkWidthHeight "Image Resize" "image" \
				"${S_imageresizewidth}" "${S_imageresizeheight}" \
	 			"${C_sensorWidth}" "${C_sensorHeight}" 2>&1 )" ; then

				echo -e "ERROR: ${ERR}"
				# Restore to old values
				restoreSettings "${KEY}" "${LABEL}" "${OLD_VALUE}" "${O}" ""
			fi

			unset 'KEYS["${KEY}"]';  unset 'KEYS["${O}"]'
			;;

		"imagecroptop" | "imagecropright" | "imagecropbottom" | "imagecropleft")
			# Only check if at least one value isn't 0.
			if [[ $((S_imagecroptop + S_imagecropright + S_imagecropbottom + S_imagecropleft)) -gt 0 ]]; then
				ERR="$( checkCropValues "${S_imagecroptop}" "${S_imagecropright}" \
					"${S_imagecropbottom}" "${S_imagecropleft}" \
					"${C_sensorWidth}" "${C_sensorHeight}" 2>&1 )"
				if [[ $? -ne 0 ]]; then
					echo -e "ERROR: ${ERR}"
# TODO: restore them?  Why is this different than other image sizes?
				fi
			fi

			unset 'KEYS["imagecroptop"]';  unset 'KEYS["imagecropright"]'
			unset 'KEYS["imagecropbottom"]';  unset 'KEYS["imagecropleft"]'
			;;

		"timelapsevcodec")
			if ! ffmpeg -encoders 2>/dev/null | awk -v codec="${NEW_VALUE}" '
				BEGIN { exit_code = 1; }
				{ if ($2 == codec) { exit_code = 0; exit 0; } }
				END { exit exit_code; }' ; then

				MSG="WARNING: "
				MSG+="Unknown VCODEC: '${NEW_VALUE}'; resetting to '${OLD_VALUE}'."
				if [[ ${FROM} == "webui" ]]; then
					HREF="execute.php?ID=AM_ALLSKY_CONFIG encoders --html'"
					MSG+="&nbsp; &nbsp; <a external='true' href='${HREF}'>Click here</a>"
				else
					MSG+="\nExecute:  allsky-config encoders"
				fi
				MSG+=" for a list of VCODECs."
				wW_ "${MSG}"

				# Restore to old value
				update_json_file ".${KEY}" "${OLD_VALUE}" "${ALLSKY_SETTINGS_FILE}" "text"
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
				if [[ ${FROM} == "webui" ]]; then
					HREF="execute.php?ID=AM_ALLSKY_CONFIG pix_fmts --html'"
					MSG+="&nbsp; &nbsp; <a external='true' href='${HREF}'>Click here</a>"
				else
					MSG+="\nExecute:  allsky-config pix_fmts"
				fi
				MSG+=" for a list of formats."
				wW_ "${MSG}"

				# Restore to old value
				update_json_file ".${KEY}" "${OLD_VALUE}" "${ALLSKY_SETTINGS_FILE}" "text"
				(( NUM_CHANGED-- ))
			fi
			;;

		"daystokeep" | "daystokeeplocalwebsite" | "daystokeepremotewebsite")
			if [[ ${NEW_VALUE} -gt 0 ]]; then
:	# TODO: Check how many days images there are of the specified type.
	# Create a "getNumImages() ${KEY}" function to return the number.
	#	(For remote Website, query the Website for the number.)
	# If MORE than NEW_VALUE, warn the user since those images will be deleted
	# at the next endOfNight.sh run.
			fi
			;;

		"enabledatabase")
			if [[ ${NEW_VALUE} == "false" ]]; then
				W="WARNING: "
				W+="Disabling ${WSNs}${LABEL}${WSNe} will cause many new features not to work properly."
				wW_ "${W}"
# ALEX TODO: Anything if NEW_VALUE == "true" ?
			fi
			;;

		"uselogin")
			if [[ ${NEW_VALUE} == "false" ]]; then
				W="WARNING: "
				W+="Disabling ${WSNs}${LABEL}${WSNe} should NOT be done if your Pi is"
				W+=" accessible on the Internet.  It's a HUGE security risk!"
				wW_ "${W}"
			fi
			;;

		*)
			W="WARNING: "
			W+="Unknown key '${KEY}'; ignoring.  Old=${OLD_VALUE}, New=${NEW_VALUE}"
			wW_ "${W}"
			(( NUM_CHANGED-- ))
			;;

		esac
done

[[ ${OK} == "false" ]] && exit 1

[[ ${NUM_CHANGED} -le 0 ]] && exit "${EXIT_PARTIAL_OK}" 		# Nothing changed

USE_REMOTE_WEBSITE="${S_useremotewebsite}"
USE_REMOTE_SERVER="${S_useremoteserver}"
if [[ ${USE_REMOTE_WEBSITE} == "true" || ${USE_REMOTE_SERVER} == "true" ]]; then
	if [[ ! -f ${ALLSKY_ENV} ]]; then
		cp "${REPO_ENV_FILE}" "${ALLSKY_ENV}"
	fi

	if [[ ${USE_REMOTE_WEBSITE} == "true" ]]; then
		if [[ ${CHECK_REMOTE_WEBSITE_ACCESS} == "true" ]]; then
			# Check URL(s).  They are optional.
			if [[ ${S_remotewebsiteurl} ]]; then
				# Don't check image URL in case they Website isn't complete yet.
				if ! ERR="$( _check_web_connectivity --website --from "${FROM}" 2>&1 )" ; then
					if [[ ${FROM} == "webui" ]]; then
						wE_ "Unable to access remote Website '${S_remotewebsiteurl}': ${E}"
					fi
				fi
			fi
		fi

		if [[ ${CHECK_REMOTE_WEBSITE_UPLOAD} == "true" ]]; then
			# Check Server Name by trying to upload to it.
			# testUpload.sh displays error messages
			if ! E="$( "${ALLSKY_SCRIPTS}/testUpload.sh" --website 2>&1 )" ; then
				if [[ ${FROM} == "webui" ]]; then
					wE_ "${E}"
				fi
			fi
		fi

		# If the remote configuration file doesn't exist assume it's because
		# the user enabled it but hasn't yet "installed" it (which creates the file).
		if [[ ! -s ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE} ]]; then
			W="WARNING: "
			W+="The Remote Website is now enabled but hasn't been installed yet."
			W+="${wBR}Please do so now."
			if [[ ${FROM} == "webui" ]]; then
				W+="${wBR}See <a allsky='true' external='true'"
				W+=" href='/documentation/installations/AllskyWebsite.html'>the documentation</a>"
			fi
			wW_ "${W}"
			[[ ${WEBSITES} != "local" ]] && WEBSITES=""
		fi
	fi

	if [[ ${USE_REMOTE_SERVER} == "true" ]]; then
		if [[ ${CHECK_REMOTE_SERVER_UPLOAD} == "true" ]]; then
			if ! E="$( "${ALLSKY_SCRIPTS}/testUpload.sh" --server 2>&1 )" ; then
				if [[ ${FROM} == "webui" ]]; then
					wE_ "${E}"
				fi
			fi
		fi
	fi
fi

CHANGED_LOCAL_WEBSITE="false"
CHANGED_REMOTE_WEBSITE="false"
# shellcheck disable=SC2128
if [[ ${#WEBSITE_CONFIG[@]} -gt 0 ]]; then
	# Update the local and/or Website remote config file
	if [[ ${WEBSITES} == "local" || ${WEBSITES} == "both" ]]; then
		debug && wD_ "Executing updateJsonFile.sh --local"
		# shellcheck disable=SC2086
		"${ALLSKY_SCRIPTS}/updateJsonFile.sh" ${DEBUG_ARG} --local "${WEBSITE_CONFIG[@]}"
		CHANGED_LOCAL_WEBSITE="true"
	fi

	if [[ ${WEBSITES} == "remote" || ${WEBSITES} == "both" ]]; then
		debug && wD_ "Executing updateJsonFile.sh --remote"
		# shellcheck disable=SC2086
		"${ALLSKY_SCRIPTS}/updateJsonFile.sh" ${DEBUG_ARG} --remote "${WEBSITE_CONFIG[@]}"
		CHANGED_REMOTE_WEBSITE="true"

		FILE_TO_UPLOAD="${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}"

		IMAGE_DIR="${S_remotewebsiteimagedir}"
		debug && wD_ "Uploading '${FILE_TO_UPLOAD}' to remote Website."

		if ! "${ALLSKY_SCRIPTS}/upload.sh" --silent --remote-web \
				"${FILE_TO_UPLOAD}" \
				"${IMAGE_DIR}" \
				"${ALLSKY_WEBSITE_CONFIGURATION_NAME}" \
				"RemoteWebsite" ; then
			wE_ "${ERROR_PREFIX}Unable to upload '${FILE_TO_UPLOAD}' to Website ${NUM}."
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
	# Only run postToMap.sh if: 1) we turned off showonmap,  2) showonmap is on
	[[ -z ${SHOW_ON_MAP} ]] && SHOW_ON_MAP="${S_showonmap}"
	if [[ ${SHOW_ON_MAP} == "true" ]]; then
		debug && wD_ "Executing postToMap.sh"
		# shellcheck disable=SC2086
		"${ALLSKY_SCRIPTS}/postToMap.sh" --whisper --force ${DEBUG_ARG} --from "${FROM}" ${POSTTOMAP_ACTION}
	fi
fi

if [[ ${GOT_WARNING} == "true" ]]; then
	exit 255
else
	exit 0
fi
