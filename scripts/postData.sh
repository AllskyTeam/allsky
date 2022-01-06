#!/bin/bash

# This script uploads a file to a website to tell the website when the user has defined "sunset",
# which is the end of daytime and beginning of nighttime.
# Use the angle set by the user.

source "${ALLSKY_HOME}/variables.sh"
source "${ALLSKY_CONFIG}/config.sh"
source "${ALLSKY_CONFIG}/ftp-settings.sh"

ME="$(basename "${BASH_ARGV0}")"

angle=$(jq -r '.angle' "${CAMERA_SETTINGS}")
latitude=$(jq -r '.latitude' "${CAMERA_SETTINGS}")
longitude=$(jq -r '.longitude' "${CAMERA_SETTINGS}")
timezone=$(date "+%z")

# If nighttime happens after midnight, sunwait returns "--:-- (Midnight sun)"
# If nighttime happens before noon, sunwait returns "--:-- (Polar night)"
time="$(sunwait list set angle ${angle} ${latitude} ${longitude})"
hhmm=${time:0:5}

if [ "${hhmm}" = "--:--" ]; then
	# nighttime starts after midnight or before noon.
	today=$(date --date='tomorrow' +%Y-%m-%d)		# is actually tomorrow
	# TODO What SHOULD hhmm be?
	hhmm="00:00"

	echo "***"
	echo -e "${RED}${ME}: WARNING: angle ${angle} caused sunwait to return '${time}'.${NC}"
	echo "Using tomorrow at '${hhmm}' instead."
	echo "***"
else
	today=$(date +%Y-%m-%d)
fi

FILE="data.json"
OUTPUT_FILE="${ALLSKY_TMP}/${FILE}"
(
	echo {
	echo \"sunset\": \"${today}T${hhmm}:00.000${timezone}\",
	echo \"streamDaytime\": \"${DAYTIME_CAPTURE}\"
	echo }
) > "${OUTPUT_FILE}"

COPIED=false

# Copy to local Allsky website if it exists.
if [ -d "${WEBSITE_DIR}" ]; then
	cp "${OUTPUT_FILE}" "${WEBSITE_DIR}"
	COPIED=true
fi

# Upload to remote website
if [ "${REMOTE_HOST}" != "" ]; then
	"${ALLSKY_SCRIPTS}/upload.sh" --silent "${OUTPUT_FILE}" "${IMAGE_DIR}" "${FILE}" "PostData"
	COPIED=true
fi

if [ "${COPIED}" = "false" ]; then
	echo "***"
	echo -e "${RED}${ME}: WARNING: No local or remote website specified so '${FILE}' not copied anywhere.${NC}"
	echo "***"
	exit 1
fi

exit 0
