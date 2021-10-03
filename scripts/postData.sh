#!/bin/bash

# TODO Needs fixing when civil twilight happens after midnight

source "${ALLSKY_HOME}/config/variables.sh"
source "${ALLSKY_CONFIG}/config.sh"
source "${ALLSKY_SCRIPTS}/ftp-settings.sh"

ME="$(basename "${BASH_ARGV0}")"

latitude=$(jq -r '.latitude' "${CAMERA_SETTINGS}")
longitude=$(jq -r '.longitude' "${CAMERA_SETTINGS}")
timezone=$(date "+%z")
streamDaytime=false

if [[ ${DAYTIME} == "true" || ${DAYTIME} == "1" ]] ; then
	streamDaytime="true"
fi

echo "${ME}: Posting Next Twilight Time"
today=`date +%Y-%m-%d`
time="$(sunwait list set civil ${latitude} ${longitude})"
timeNoZone=${time:0:5}

FILE="data.json"
OUTPUT_FILE="${ALLSKY_TMP}/${FILE}"
(
  echo {
  echo \"sunset\": \"$today"T"$timeNoZone":00.000$timezone"\",
  echo \"streamDaytime\": \"$streamDaytime\"
  echo }
) > "${OUTPUT_FILE}"

# PD == Post Data
"${ALLSKY_SCRIPTS}/upload.sh" --silent "${OUTPUT_FILE}" "${IMG_DIR}" "${FILE}" "PD"
