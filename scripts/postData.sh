#!/bin/bash

# This script uploads a file to a website to tell the website when the user has defined
# "sunrise" and "sunset".  Use the angle set by the user.
# A copy of the settings file is also uploaded.

# Allow this script to be executed manually or by sudo, which requires several variables to be set.
if [[ -z ${ALLSKY_HOME} ]]; then
	ALLSKY_HOME="$(realpath "$(dirname "${BASH_ARGV0}")/..")"
	export ALLSKY_HOME
fi

ME="$(basename "${BASH_ARGV0}")"

# shellcheck disable=SC1090
source "${ALLSKY_HOME}/variables.sh" || exit 1

# shellcheck disable=SC1090
source "${ALLSKY_CONFIG}/config.sh" || exit 1
# shellcheck disable=SC1090
source "${ALLSKY_SCRIPTS}/functions.sh" || exit 1
# shellcheck disable=SC1090
source "${ALLSKY_CONFIG}/ftp-settings.sh" || exit 1

# Make sure a local or remote Allsky Website exists.
if [[ -f ${ALLSKY_WEBSITE_CONFIGURATION_FILE} ]]; then
	HAS_LOCAL_WEBSITE=true
else
	HAS_LOCAL_WEBSITE=false
fi

# Assume if PROTOCOL is set, there's a remote website.
if [[ -f ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE} && -n ${PROTOCOL} && ${PROTOCOL} != "local" ]]; then
	HAS_REMOTE_WEBSITE=true
else
	HAS_REMOTE_WEBSITE=false
fi
if [[ ${HAS_LOCAL_WEBSITE} == "false" && ${HAS_REMOTE_WEBSITE} == "false" ]]; then
	echo -e "${YELLOW}${ME}: WARNING: No local or remote website found.${NC}"
	exit 0		# It's not an error
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
	exit ${retcode}
}

HELP="false"
DEBUG="false"
SETTINGS_ONLY="false"
ALL_FILES="false"
RET=0
while [ $# -gt 0 ]; do
	case "${1}" in
		--debug)
			DEBUG="true"
			shift
			;;
		--help)
			HELP="true"
			shift
			;;
		--allFiles)
			ALL_FILES="true"
			shift
			;;
		--settinsOnly)
			SETTINGS_ONLY="true"
			shift
			;;
		-*)
			echo -e "${RED}Unknown argument '${1}'.${NC}" >&2
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
	latitude="$(convertLatLong "$(settings ".latitude")" "latitude")"
	LATRET=$?
	longitude="$(convertLatLong "$(settings ".longitude")" "longitude")"
	LONGRET=$?
	OK=true
	if [[ ${LATRET} -ne 0 ]]; then
		OK=false
		echo -e "${RED}${ME}: ERROR: ${latitude}"
	fi
	if [[ ${LONGRET} -ne 0 ]]; then
		OK=false
		echo -e "${RED}${ME}: ERROR: ${longitude}"
	fi
	[[ ${OK} == "false" ]] && exit 1

	angle="$(settings ".angle")"
	timezone="$(date "+%z")"

	# If nighttime happens after midnight, sunwait returns "--:-- (Midnight sun)"
	# If nighttime happens before noon, sunwait returns "--:-- (Polar night)"
	sunrise="$(sunwait list rise angle ${angle} ${latitude} ${longitude})"
	sunrise_hhmm="${sunrise:0:5}"
	sunset="$(sunwait list set angle ${angle} ${latitude} ${longitude})"
	sunset_hhmm="${sunset:0:5}"

	if [[ ${sunrise_hhmm} == "--:--" || ${sunset_hhmm} = "--:--" ]]; then
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
		if [[ $(settings ".takeDaytimeImages") = "1" ]]; then
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
		echo -e "${RED}${ME}: ERROR: File to upload '${FILE_TO_UPLOAD}' (${strFILE_TO_UPLOAD}) not found.${NC}"
		return 1
	fi

	local RETCODE=0

	# Copy to local Allsky website if it exists.
	if [[ ${HAS_LOCAL_WEBSITE} == "true" ]]; then
		# If ${DIRECTORY} isn't "" and doesn't start with "/", add one.
		local S="${DIRECTORY:0:1}"
		if [[ -n ${S} && ${S} != "/" ]]; then
			S="/"
		else
			S=""
		fi
		TO="${ALLSKY_WEBSITE}${S}${DIRECTORY}"
		[[ ${DEBUG} == "true" ]] && echo -e "${wDEBUG}cp '${FILE_TO_UPLOAD}' '${TO}'${wNC}"

		cp "${FILE_TO_UPLOAD}" "${TO}"
		R=$?
		if [[ ${R} -ne 0 ]]; then
			echo -e "${RED}${ME}: Unable to copy '${FILE_TO_UPLOAD}' to '${ALLSKY_WEBSITE}'.${NC}"
		fi
		((RETCODE=${R}))
	fi

	# Upload to remote website if there is one.
	if [[ ${HAS_REMOTE_WEBSITE} == "true" ]]; then
		[[ ${DEBUG} == "true" ]] && echo -e "${wDEBUG}Uploading '${FILE_TO_UPLOAD}' to ${DIRECTORY:-root}${wNC}"

		"${ALLSKY_SCRIPTS}/upload.sh" --silent \
			"${FILE_TO_UPLOAD}" \
			"${DIRECTORY}" \
			"" \
			"PostData"
		R=$?
		if [[ ${R} -ne 0 ]]; then
			echo -e "${RED}${ME}: Unable to upload '${FILE_TO_UPLOAD}'.${NC}"
		fi
		((RETCODE=RETCODE+${R}))
	fi

	return ${RETCODE}
}

# These files go in ${VIEW_DIR} so the user can display their settings.
# This directory is in the root of the Allsky Website.
VIEW_DIR="viewSettings"
upload_file "${SETTINGS_FILE}" "settings file" "${VIEW_DIR}"
if [[ ${ALL_FILES} == "true" ]]; then
	upload_file "${OPTIONS_FILE}" "options file" "${VIEW_DIR}"
	upload_file "${ALLSKY_WEBUI}/includes/allskySettings.php" "allskySettings file" "${VIEW_DIR}"
	upload_file "${ALLSKY_DOCUMENTATION}/css/custom.css" "custom file" "${VIEW_DIR}"
fi

# shellcheck disable=SC2181
RET=$?
if [[ ${RET} -eq 0 && ${SETTINGS_ONLY} == "false" ]]; then
	upload_file "${OUTPUT_FILE}" "output file" "${IMAGE_DIR}"
	# shellcheck disable=SC2181
	RET=$?
fi
exit ${RET}

