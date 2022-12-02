#!/bin/bash

# This script uploads a file to a website to tell the website when the user has defined
# "sunrise" and "sunset".  Use the angle set by the user.
# A copy of the settings file is also uploaded.

# Allow this script to be executed manually or by sudo, which requires several variables to be set.
if [ -z "${ALLSKY_HOME}" ] ; then
	ALLSKY_HOME="$(realpath "$(dirname "${BASH_ARGV0}")/..")"
	export ALLSKY_HOME
fi

ME="$(basename "${BASH_ARGV0}")"

# shellcheck disable=SC1090
source "${ALLSKY_HOME}/variables.sh"
# shellcheck disable=SC2181
[ $? -ne 0 ] && echo "${ME}: ERROR: unable to source variables.sh file!" && exit 1

# shellcheck disable=SC1090
source "${ALLSKY_CONFIG}/config.sh"
# shellcheck disable=SC1090
source "${ALLSKY_SCRIPTS}/functions.sh"
# shellcheck disable=SC1090
source "${ALLSKY_CONFIG}/ftp-settings.sh"

# Make sure a local or remote Allsky Website exists.
if [[ -f ${ALLSKY_WEBSITE_CONFIGURATION_FILE} ]]; then
	HAS_LOCAL_WEBSITE=true
else
	HAS_LOCAL_WEBSITE=false
fi

# Assume if PROTOCOL is set, there's a remote website.
if [[ -n ${PROTOCOL} && ${PROTOCOL} != "local" ]]; then
	HAS_REMOTE_WEBSITE=true
else
	HAS_REMOTE_WEBSITE=false
fi
if [[ ${HAS_LOCAL_WEBSITE} == "false" && ${HAS_REMOTE_WEBSITE} == "false" ]]; then
	echo -e "${YELLOW}${ME}: WARNING: No local or remote website found.${NC}"
	exit 0		# It's not an error
fi

if [[ ${1} == "--settingsOnly" ]]; then
	SETTINGS_ONLY=true
else
	SETTINGS_ONLY=false
fi

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
	FILE_TO_UPLOAD="${1}"
	strFILE_TO_UPLOAD="${2}"
	if [[ ! -f ${FILE_TO_UPLOAD} ]]; then
		echo -e "${RED}${ME}: ERROR: File to upload '${FILE_TO_UPLOAD}' (${strFILE_TO_UPLOAD}) not found.${NC}"
		return 1
	fi

	RETCODE=0

	# Copy to local Allsky website if it exists.
	if [[ ${HAS_LOCAL_WEBSITE} == "true" ]]; then
		cp "${FILE_TO_UPLOAD}" "${ALLSKY_WEBSITE}"
		((RETCODE=$?))
	fi

	# Upload to remote website if there is one.
	if [[ ${HAS_REMOTE_WEBSITE} == "true" ]]; then
		"${ALLSKY_SCRIPTS}/upload.sh" --silent \
			"${FILE_TO_UPLOAD}" \
			"${IMAGE_DIR}" \
			"" \
			"PostData"
		((RETCODE=RETCODE+$?))
	fi

	return ${RETCODE}
}

upload_file "${SETTINGS_FILE}" "settings file"
# shellcheck disable=SC2181
RET=$?
if [[ ${RET} -eq 0 && ${SETTINGS_ONLY} == "false" ]]; then
	upload_file "${OUTPUT_FILE}" "output file"
	# shellcheck disable=SC2181
	RET=$?
fi
exit ${RET}

