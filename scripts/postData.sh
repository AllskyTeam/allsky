#!/bin/bash

# This script uploads a file to a website to tell the website when the user has defined
# "sunrise" and "sunset".  Use the angle set by the user.

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
source "${ALLSKY_CONFIG}/ftp-settings.sh"

angle=$(jq -r '.angle' "${CAMERA_SETTINGS}")
latlong=$(jq -r '.latitude,.longitude' "${CAMERA_SETTINGS}")
timezone=$(date "+%z")

# If nighttime happens after midnight, sunwait returns "--:-- (Midnight sun)"
# If nighttime happens before noon, sunwait returns "--:-- (Polar night)"
sunrise="$(sunwait list rise angle ${angle} ${latlong})"
sunrise_hhmm=${sunrise:0:5}
sunset="$(sunwait list set angle ${angle} ${latlong})"
sunset_hhmm=${sunset:0:5}

if [ "${sunrise_hhmm}" = "--:--" -o "${sunset_hhmm}" = "--:--" ]; then
	# nighttime starts after midnight or before noon.
	today=$(date --date='tomorrow' +%Y-%m-%d)		# is actually tomorrow
	# TODO What SHOULD *_hhmm be?
	sunrise_hhmm="00:00"
	sunset_hhmm="00:00"

	echo "***"
	echo -e "${RED}${ME}: WARNING: angle ${angle} caused sunwait to return"
	echo -e "sunrise='${sunrise}' and sunset='${sunset}'.${NC}"
	echo "Using tomorrow at '${sunriset_hhmm}' instead."
	echo "***"
else
	today=$(date +%Y-%m-%d)
fi

FILE="data.json"
OUTPUT_FILE="${ALLSKY_TMP}/${FILE}"
(
	echo {
	echo \"sunrise\": \"${today}T${sunrise_hhmm}:00.000${timezone}\",
	echo \"sunset\": \"${today}T${sunset_hhmm}:00.000${timezone}\",
	echo \"streamDaytime\": \"${DAYTIME_CAPTURE}\"
	echo }
) > "${OUTPUT_FILE}"

COPIED=false
typeset -i RETCODE=0

# Copy to local Allsky website if it exists.
if [ -d "${WEBSITE_DIR}" ]; then
	cp "${OUTPUT_FILE}" "${WEBSITE_DIR}"
	let RETCODE=$?
	COPIED=true
fi

# Upload to remote website
if [ "${REMOTE_HOST}" != "" ]; then
	"${ALLSKY_SCRIPTS}/upload.sh" --silent "${OUTPUT_FILE}" "${IMAGE_DIR}" "${FILE}" "PostData"
	let RETCODE=RETCODE+$?
	COPIED=true
fi

if [ "${COPIED}" = "false" ]; then
	echo "***"
	echo -e "${RED}${ME}: WARNING: No local or remote website specified so '${FILE}' not copied anywhere.${NC}"
	echo "***"
	exit 1
fi

exit $RETCODE
