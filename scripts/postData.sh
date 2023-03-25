#!/bin/bash

# This script uploads a file to a website to tell the website when the user has defined
# "sunrise" and "sunset".  Use the angle set by the user.
# A copy of the settings file is also uploaded.

# Allow this script to be executed manually or by sudo, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$(realpath "$(dirname "${BASH_ARGV0}")/..")"
ME="$(basename "${BASH_ARGV0}")"

#shellcheck disable=SC2086 source-path=.
source "${ALLSKY_HOME}/variables.sh"		|| exit ${ALLSKY_ERROR_STOP}
#shellcheck disable=SC2086,SC1091		# file doesn't exist in GitHub
source "${ALLSKY_CONFIG}/config.sh"			|| exit ${ALLSKY_ERROR_STOP}
#shellcheck disable=SC2086,SC1091		# file doesn't exist in GitHub
source "${ALLSKY_CONFIG}/ftp-settings.sh"	|| exit ${ALLSKY_ERROR_STOP}
#shellcheck disable=SC2086 source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"		|| exit ${ALLSKY_ERROR_STOP}

WEBSITES="$(whatWebsites)"
# Make sure a local or remote Allsky Website exists.
if [[ ${WEBSITES} == "none" ]]; then
	echo -e "${YELLOW}${ME}: WARNING: No local or remote website found.${NC}"
	exit 0		# It's not an error
fi

if [[ ${WEBSITES} == "local" || ${WEBSITES} == "both" ]]; then
	HAS_LOCAL_WEBSITE="true"
else
	HAS_LOCAL_WEBSITE="false"
fi
if [[ ${WEBSITES} == "remote" || ${WEBSITES} == "both" ]]; then
	HAS_REMOTE_WEBSITE="true"
else
	HAS_REMOTE_WEBSITE="false"
fi


usage_and_exit()
{
	retcode=${1}
	echo
	[[ ${retcode} -ne 0 ]] && echo -en "${RED}"
	echo "Usage: ${ME} [--help] [--debug] [--settingsOnly] [--allfiles]"
	[[ ${retcode} -ne 0 ]] && echo -en "${NC}"
	echo "    where:"
	echo "      '--allfiles' causes all 'view settings' files to be uploaded"
	# shellcheck disable=SC2086
	exit ${retcode}
}

HELP="false"
DEBUG="false"
DEBUG_ARG=""
SETTINGS_ONLY="false"
ALL_FILES="false"
RET=0
while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in		# lower case
		--debug)
			DEBUG="true"
			DEBUG_ARG="--debug"
			shift
			;;
		--help)
			HELP="true"
			shift
			;;
		--allfiles)
			ALL_FILES="true"
			shift
			;;
		--settingsonly)
			SETTINGS_ONLY="true"
			shift
			;;
		-*)
			echo -e "${RED}Unknown argument '${ARG}'.${NC}" >&2
			shift
			RET=1
			;;
		*)
			break		# done with arguments
			;;
	esac
done
[[ ${RET} -ne 0 ]] && usage_and_exit ${RET}
[[ ${HELP} = "true" ]] && usage_and_exit 0

if [[ ${SETTINGS_ONLY} == "false" ]]; then
	OK="true"
	if ! latitude="$(convertLatLong "$(settings ".latitude")" "latitude")" ; then
		OK="false"
		echo -e "${RED}${ME}: ERROR: ${latitude}"
		"${ALLSKY_SCRIPTS}/addMessage.sh" "error" "${ME}: ${latitude}"
	fi
	if ! longitude="$(convertLatLong "$(settings ".longitude")" "longitude")" ; then
		OK="false"
		echo -e "${RED}${ME}: ERROR: ${longitude}"
		"${ALLSKY_SCRIPTS}/addMessage.sh" "error" "${ME}: ${longitude}"
	fi
	[[ ${OK} == "false" ]] && exit 1

	angle="$(settings ".angle")"
	timezone="$(date "+%z")"

	# If nighttime happens after midnight, sunwait returns "--:-- (Midnight sun)"
	# If nighttime happens before noon, sunwait returns "--:-- (Polar night)"
	sunrise="$(sunwait list rise angle "${angle}" "${latitude}" "${longitude}")"
	sunrise_hhmm="${sunrise:0:5}"
	sunset="$(sunwait list set angle "${angle}" "${latitude}" "${longitude}")"
	sunset_hhmm="${sunset:0:5}"

	if [[ ${sunrise_hhmm} == "--:--" || ${sunset_hhmm} == "--:--" ]]; then
		# nighttime starts after midnight or before noon.
		today="$(date --date='tomorrow' +%Y-%m-%d)"		# is actually tomorrow
		# TODO What SHOULD *_hhmm be?
		sunrise_hhmm="00:00"
		sunset_hhmm="00:00"

		echo "***"
		echo -e "${RED}${ME}: WARNING: angle ${angle} caused sunwait to return"
		echo -e "sunrise='${sunrise}' and sunset='${sunset}'.${NC}"
		echo "Using tomorrow at '${sunrise_hhmm}' instead."
		echo "***"
	else
		today="$(date +%Y-%m-%d)"
	fi

	FILE="data.json"
	OUTPUT_FILE="${ALLSKY_TMP}/${FILE}"
	(
		if [[ $(settings ".takeDaytimeImages") -eq 1 ]]; then
			D="true"
		else
			D="false"
		fi
		echo "{"
		echo "\"sunrise\": \"${today}T${sunrise_hhmm}:00.000${timezone}\","
		echo "\"sunset\": \"${today}T${sunset_hhmm}:00.000${timezone}\","
		echo "\"streamDaytime\": \"${D}\""
		echo "}"
	) > "${OUTPUT_FILE}"
fi


function upload_file()
{
	local FILE_TO_UPLOAD="${1}"
	local strFILE_TO_UPLOAD="${2}"
	local DIRECTORY="${3}"		# Directory to put file in
	if [[ ! -f ${FILE_TO_UPLOAD} ]]; then
		MSG="File to upload '${FILE_TO_UPLOAD}' (${strFILE_TO_UPLOAD}) not found."
		echo -e "${RED}${ME}: ERROR: ${MSG}.${NC}"
		"${ALLSKY_SCRIPTS}/addMessage.sh" "error" "${ME}: ${MSG}"
		return 1
	fi

	local RETCODE=0
	local S="${DIRECTORY:0:1}"

	# Copy to local Allsky website if it exists.
	if [[ ${HAS_LOCAL_WEBSITE} == "true" ]]; then

		# If ${DIRECTORY} isn't "" and doesn't start with "/", add one.
		if [[ -n ${S} && ${S} != "/" ]]; then
			S="/"
		else
			S=""
		fi

		TO="${ALLSKY_WEBSITE}${S}${DIRECTORY}"
		[[ ${DEBUG} == "true" ]] && echo -e "${wDEBUG}cp '${FILE_TO_UPLOAD}' '${TO}'${wNC}"

		if ! cp "${FILE_TO_UPLOAD}" "${TO}" ; then
			MSG="Unable to copy '${FILE_TO_UPLOAD}' to '${ALLSKY_WEBSITE}'"
			echo -e "${RED}${ME}: ERROR: ${MSG}.${NC}"
			"${ALLSKY_SCRIPTS}/addMessage.sh" "error" "${ME}: ${MSG}"
			RETCODE=1
		fi
	fi

	# Upload to remote website if there is one.
	if [[ ${HAS_REMOTE_WEBSITE} == "true" ]]; then

		# Need a "/" to separate when both variables exist.
		if [[ -n ${IMAGE_DIR} ]]; then
			[[ -n ${S} && ${S} != "/" ]] && S="/"
		else
			S=""
		fi

		# Copy relative to ${IMAGE_DIR}
		TO="${IMAGE_DIR}${S}${DIRECTORY}"
		[[ ${DEBUG} == "true" ]] && echo -e "${wDEBUG}Uploading '${FILE_TO_UPLOAD}' to ${TO:-root}${wNC}"

		"${ALLSKY_SCRIPTS}/upload.sh" --silent ${DEBUG_ARG} \
			"${FILE_TO_UPLOAD}" \
			"${TO}" \
			"" \
			"PostData"
		if [[ $? -ne 0 ]]; then
			MSG="Unable to upload '${FILE_TO_UPLOAD}'"
			echo -e "${RED}${ME}: ${MSG}.${NC}"
			"${ALLSKY_SCRIPTS}/addMessage.sh" "error" "${ME}: ${MSG}"
			RETCODE=1
		fi
	fi

	# shellcheck disable=SC2086
	return ${RETCODE}
}

# These files go in ${VIEW_DIR} so the user can display their settings.
# This directory is in the root of the Allsky Website.
# Assume if the first upload fails they all will, so exit.
VIEW_DIR="viewSettings"
upload_file "${SETTINGS_FILE}" "settings file" "${VIEW_DIR}" || exit $?

if [[ ${ALL_FILES} == "true" ]]; then
	upload_file "${OPTIONS_FILE}" "options file" "${VIEW_DIR}"
	upload_file "${ALLSKY_WEBUI}/includes/allskySettings.php" "allskySettings file" "${VIEW_DIR}"
	upload_file "${ALLSKY_DOCUMENTATION}/css/custom.css" "custom file" "${VIEW_DIR}"
fi

if [[ ${SETTINGS_ONLY} == "false" ]]; then
	upload_file "${OUTPUT_FILE}" "output file" ""		# Goes in top-level directory
	# shellcheck disable=SC2086
	exit $?
fi

exit 0
