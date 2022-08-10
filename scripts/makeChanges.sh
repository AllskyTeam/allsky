#!/bin/bash

ME="$(basename "${BASH_ARGV0}")"

# Allow this script to be executed manually, which requires several variables to be set.
if [ -z "${ALLSKY_HOME}" ] ; then
	ALLSKY_HOME="$(realpath "$(dirname "${BASH_ARGV0}")/..")"
	export ALLSKY_HOME
fi
# shellcheck disable=SC1090
source "${ALLSKY_HOME}/variables.sh"

# This script may be called during installation BEFORE there is a settings file.
# config.sh looks for the file and produces an error if it doesn't exist,
# so only include these two files if there IS a settings file.
SETTINGS_FILE="${SETTINGS_FILE_NAME}.${SETTINGS_FILE_EXT}"
if [[ -f ${ALLSKY_CONFIG}/${SETTINGS_FILE} ]]; then
	# shellcheck disable=SC1090
	source "${ALLSKY_CONFIG}/config.sh"
	# shellcheck disable=SC1090
	source "${ALLSKY_CONFIG}/ftp-settings.sh"
fi


function usage_and_exit()
{
	echo -e "${wERROR}"
	echo "Usage: ${ME} [--debug] [--cameraTypeOnly] [--restarting] key label new_value [...]"
	echo -e "${wNC}"
	echo "There must be a multiple of 3 key/label/old_value/new_value arguments."
	exit ${1}
}

# Check arguments
OK=true
DEBUG=false
HELP=false
RESTARTING=false			# Will the caller restart Allsky?
CAMERA_TYPE_ONLY=false		# Only update the cameraType ?
FORCE=""					# Passed to createAllskyOptions.php

while [ $# -gt 0 ]; do
	ARG="${1}"
	case "${ARG}" in
		--debug)
			DEBUG="true"
			;;
		--help)
			HELP="true"
			;;
		--cameraTypeOnly)
			CAMERA_TYPE_ONLY="true"
			;;
		--force)
			FORCE="${ARG}"
			;;
		--restarting)
			RESTARTING="true"
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
[[ $# -eq 0 ]] && usage_and_exit 1
[ $(($# % 3)) -ne 0 ] && usage_and_exit 2


# This output may go to a web page, so use "w" colors.
# shell check doesn't realize there were set in variables.sh
wOK="${wOK}"
wWARNING="${wWARNING}"
wERROR="${wERROR}"
wDEBUG="${wDEBUG}"
wBOLD="${wBOLD}"
wNBOLD="${wNBOLD}"
wNC="${wNC}"

# Does the change need Allsky to be restarted in order to take affect?
NEEDS_RESTART=false

RUN_POSTDATA=false
RUN_POSTTOMAP=false
POSTTOMAP_ACTION=""
WEBSITE_CONFIG=()

while [ $# -gt 0 ]; do
	KEY="${1}"
	LABEL="${2}"
	NEW_VALUE="${3}"
	if [ "${DEBUG}" = "true" ]; then
		MSG="${KEY}: new [${NEW_VALUE}]"
		if [[ ${ON_TTY} -eq 1 ]]; then
			echo -e "${wDEBUG}${ME}: ${MSG}${wNC}"
		else	# called from WebUI.
			echo -e "${wDEBUG}${ME}: ${MSG}${wNC}"
			echo -e "<script>console.log('${MSG}');</script>"
		fi
	fi

	# Unfortunately, the Allsky configuration file was already updated,
	# so if we find a bad entry, e.g., a file doesn't exist, all we can do is warn the user.
	case "${KEY}" in

		cameraType)
			# If we can't set the new camera type, it's a major problem so exit right away.
			# When we're changing cameraType we're not changing anything else.

			CC_FILE="${ALLSKY_CONFIG}/${CC_FILE_NAME}.${CC_FILE_EXT}"
			CC_FILE_OLD="${CC_FILE}-OLD"

			if [ -f "${CC_FILE}" ]; then
				# Save the current file just in case creating a new one fails.
				# It's a link so copy it to a temp name, then remove the old name.
				[[ ${DEBUG} == "true" ]] && echo -e "${wDEBUG}DEBUG: saving '${CC_FILE}' to '${CC_FILE_OLD}'${wNC}"
				cp "${CC_FILE}" "${CC_FILE_OLD}"
				rm -f "${CC_FILE}"
			fi

			# Create the camera capabilities file for the new camera type.
			# Debug level 3 to give the user more info on error.

			# The software for RPi cameras needs to know what command is being used to
			# capture the images.
			if [[ ${NEW_VALUE} == "RPi" ]]; then
				# shellcheck disable=SC1090
				source "${ALLSKY_SCRIPTS}/functions.sh" || exit 99
				C="$(determineCommandToUse "false" "" )"
				# shellcheck disable=SC2181
				if [ $? -ne 0 ]; then
					exit $?
				fi
				C="-cmd ${C}"
			else
				C=""
			fi
			[[ ${DEBUG} == "true" ]] && echo -e "${wDEBUG}DEBUG: Calling capture_${NEW_VALUE} ${C} -cc_file '${CC_FILE}'${wNC}"
			"${ALLSKY_HOME}/capture_${NEW_VALUE}" ${C} -debuglevel 3 -cc_file "${CC_FILE}"
			RET=$?
			if [[ ${RET} -ne 0 || ! -f ${CC_FILE} ]]; then
				echo -e "${wERROR}ERROR: Unable to create cc file '${CC_FILE}'.${wNC}"

				# Restore prior cc file if there was one.
				[ -f "${CC_FILE_OLD}" ] && mv "${CC_FILE_OLD}" "${CC_FILE}"
				exit ${RET}		# the actual exit code is important
			fi

			# Create a link to a file that contains the camera type and model in the name.
			CAMERA_TYPE="${NEW_VALUE}"		# already know it
			CAMERA_MODEL="$(jq .cameraModel "${CC_FILE}" | sed 's;";;g')"
			if [[ -z ${CAMERA_MODEL} ]]; then
				echo -e "${wERROR}ERROR: 'cameraModel' not found in ${CC_FILE}.${wNC}"
				[ -f "${CC_FILE_OLD}" ] && mv "${CC_FILE_OLD}" "${CC_FILE}"
				exit 1
			fi

			# ${CC_FILE} is a generic name defined in config.sh.
			# ${SPECIFIC_NAME} is specific to the camera type/model.
			# It isn't really needed except debugging.
			SPECIFIC_NAME="${ALLSKY_CONFIG}/${CC_FILE_NAME}_${CAMERA_TYPE}_${CAMERA_MODEL}.${CC_FILE_EXT}"

			# Any old and new camera capabilities file should be the same unless Allsky
			# adds or changes capabilities, so delete the old one just in case.
			ln --force "${CC_FILE}" "${SPECIFIC_NAME}"

			sed -i -e "s/^CAMERA_TYPE=.*$/CAMERA_TYPE=\"${NEW_VALUE}\"/" "${ALLSKY_CONFIG}/config.sh"
			# shellcheck disable=SC2181
			if [ $? -ne 0 ]; then
				echo -e "${wERROR}ERROR updating ${wBOLD}${LABEL}${wNBOLD}.${wNC}"
				[ -f "${CC_FILE_OLD}" ] && mv "${CC_FILE_OLD}" "${CC_FILE}"
				exit 1
			fi

			# The old file is no longer needed.
			rm -f "${CC_FILE_OLD}"

			# createAllskyOptions.php will use the cc file and the options template file
			# to create an OPTIONS_FILE for this camera type/model.
			# These variables don't include a directory since the directory is specified with "--dir" below.
			CC_FILE="${CC_FILE_NAME}.${CC_FILE_EXT}"		# reset from full name above
			OPTIONS_FILE="${OPTIONS_FILE_NAME}.${OPTIONS_FILE_EXT}"

			# .php files don't return error codes so we check if it worked by
			# looking for a string in its output.
			R="$("${ALLSKY_WEBUI}/includes/createAllskyOptions.php" \
				${FORCE} \
				--dir "${ALLSKY_CONFIG}" \
				--cc_file "${CC_FILE}" \
				--options_file "${OPTIONS_FILE}" \
				--settings_file "${SETTINGS_FILE}" \
				2>&1)"
			if [ -n "${R}" ]; then
				# The user shouldn't see XX_WORKED_XX.
				OTHER_OUTPUT="$(echo -e "${R}" | grep -v "XX_WORKED_XX")"
				if [ -n "${OTHER_OUTPUT}" ]; then
					echo -e "${wERROR}ERROR: Unable to create '${OPTIONS_FILE}' and '${SETTINGS_FILE}' files.${wNC}"
					echo "${OTHER_OUTPUT}"
				fi
			fi
			# It's an error if XX_WORKED_XX is NOT in the output.
			echo -e "${R}" | grep --silent "XX_WORKED_XX" || exit 2

			# Don't do anything else if ${CAMERA_TYPE_ONLY} is set.
			[[ ${CAMERA_TYPE_ONLY} == "true" ]] && exit 0

			NEEDS_RESTART=true
			;;

		filename)
			WEBSITE_CONFIG+=("config.imageName" "${NEW_VALUE}")
			NEEDS_RESTART=true
			;;
		extratext)
			# It's possible the user will create/populate the file while Allsky is running,
			# so it's not an error if the file doesn't exist or is empty.
			if [ -n "${NEW_VALUE}" ]; then
				if [ ! -f "${NEW_VALUE}" ]; then
					echo -e "${wWARNING}WARNING: '${NEW_VALUE}' does not exist; please change it.${wNC}"
				elif [ ! -s "${NEW_VALUE}" ]; then
					echo -e "${wWARNING}WARNING: '${NEW_VALUE}' is empty; please change it.${wNC}"
				fi
			fi
			NEEDS_RESTART=true
			;;
		latitude | longitude)
			# Allow either +/- decimal numbers, OR numbers with N, S, E, W, but not both.
			NEW_VALUE="${NEW_VALUE^^[nsew]}"	# convert any character to uppercase for consistency
			SIGN="${NEW_VALUE:0:1}"				# First character, may be "-" or "+" or a number
			LAST="${NEW_VALUE: -1}"				# May be N, S, E, or W, or a number
			if [[ (${SIGN} = "+" || ${SIGN} == "-") && (${LAST%[NSEW]} == "") ]]; then
				echo -e "${wWARNING}WARNING: '${NEW_VALUE}' should contain EITHER a \"${SIGN}\" OR a \"${LAST}\", but not both; please change it.${wNC}"
			else
				WEBSITE_CONFIG+=(config."${KEY}" "${NEW_VALUE}")
				RUN_POSTDATA=true
			fi
			NEEDS_RESTART=true
			;;
		angle)
			RUN_POSTDATA=true
			NEEDS_RESTART=true
			;;
		takeDaytimeImages)
			RUN_POSTDATA=true
			NEEDS_RESTART=true
			;;
		config)
			if [ "${NEW_VALUE}" = "" ]; then
				NEW_VALUE="[none]"
			elif [ "${NEW_VALUE}" != "[none]" ]; then
				if [ ! -f "${NEW_VALUE}" ]; then
					echo -e "${wWARNING}WARNING: Configuration File '${NEW_VALUE}' does not exist; please change it.${wNC}"
				elif [ ! -s "${NEW_VALUE}" ]; then
					echo -e "${wWARNING}WARNING: Configuration File '${NEW_VALUE}' is empty; please change it.${wNC}"
				fi
			fi
			;;
		showonmap)
			[ "${NEW_VALUE}" = "0" ] && POSTTOMAP_ACTION="--delete"
			RUN_POSTTOMAP=true
			;;
		location | owner | camera | lens | computer)
			RUN_POSTTOMAP=true
			WEBSITE_CONFIG+=(config."${KEY}" "${NEW_VALUE}")
			;;
		websiteurl | imageurl)
			RUN_POSTTOMAP=true
			;;

		*)
			echo -e "${wWARNING}WARNING: Unknown label '${LABEL}', key='${KEY}'; ignoring.${wNC}"
			;;
		esac
		shift 3
done

if [[ ${RUN_POSTDATA} == "true" && ${POST_END_OF_NIGHT_DATA} == "true" ]]; then
	if RESULT="$("${ALLSKY_SCRIPTS}/postData.sh" >&2)" ; then
		echo -en "${wOK}"
		echo -e "Updated twilight data sent to your Allsky Website."
		echo -e "${wBOLD}If you have the website open in a browser, please refresh the window.${wNBOLD}"
		echo -en "${wNC}"
	else
		echo -e "${wERROR}ERROR posting updated twilight data: ${RESULT}.${wNC}"
	fi
fi

if [ "${DEBUG}" = "true" ]; then
	D="--debug"
else
	D=""
fi
# shellcheck disable=SC2128
if [[ ${WEBSITE_CONFIG} != "" && -d ${ALLSKY_WEBSITE} ]]; then
	"${ALLSKY_SCRIPTS}/updateWebsiteConfig.sh" ${D} "${WEBSITE_CONFIG[@]}"
fi	# else the Website isn't installed on the Pi

if [[ ${RUN_POSTTOMAP} == "true" ]]; then
	"${ALLSKY_SCRIPTS}/postToMap.sh" --whisper --force ${D} ${POSTTOMAP_ACTION}
fi

if [[ ${RESTARTING} == "false" && ${NEEDS_RESTART} == "true" ]]; then
	echo -en "${wOK}${wBOLD}"
	echo "*** You must restart Allsky for your change to take affect. ***"
	echo -en "${wNBOLD}${wNC}"
fi


exit 0
