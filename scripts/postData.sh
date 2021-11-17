#!/bin/bash

# This script uploads a file to a website to tell the website when sunset is,
# so it knows when daytime and nighttime are.

# TODO Needs fixing when civil twilight happens after midnight

source "${ALLSKY_HOME}/variables.sh"
source "${ALLSKY_CONFIG}/config.sh"
source "${ALLSKY_CONFIG}/ftp-settings.sh"

ME="$(basename "${BASH_ARGV0}")"

latitude=$(jq -r '.latitude' "${CAMERA_SETTINGS}")
longitude=$(jq -r '.longitude' "${CAMERA_SETTINGS}")
timezone=$(date "+%z")

today=$(date +%Y-%m-%d)
# TODO: should this use "angle" instead of "civil" since that's what the user specified?
time="$(sunwait list set civil ${latitude} ${longitude})"
hhmm=${time:0:5}

FILE="data.json"
OUTPUT_FILE="${ALLSKY_TMP}/${FILE}"
(
	echo {
	echo \"sunset\": \"${today}T${hhmm}:00.000${timezone}\",
	echo \"streamDaytime\": \"${DAYTIME_CAPTURE}\"
	echo }
) > "${OUTPUT_FILE}"

"${ALLSKY_SCRIPTS}/upload.sh" --silent "${OUTPUT_FILE}" "${IMAGE_DIR}" "${FILE}" "PostData"
