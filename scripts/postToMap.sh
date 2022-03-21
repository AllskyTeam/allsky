#!/bin/bash

ME="$(basename "${BASH_ARGV0}")"

# Allow this script to be executed manually, which requires several variables to be set.
if [ -z "${ALLSKY_HOME}" ] ; then
	ALLSKY_HOME=$(realpath "$(dirname "${BASH_ARGV0}")"/..)
	export ALLSKY_HOME
fi

# This script uploads various information relative to the camera setup to the allsky map.
# https://www.thomasjacquin.com/allsky-map/
# Information is gathered automatically from the settings file

# Disabling shellcheck to force CI to compile - May need to find a better way to deal with this
# shellcheck disable=SC1090
source "${ALLSKY_HOME}/variables.sh"
# shellcheck disable=SC1090
source "${ALLSKY_CONFIG}/config.sh"

function usage_and_exit()
{
	RET_CODE=${1}
	[ ${RET_CODE} -ne 0 ] && echo -e "${RED}"
	echo -e "\nUsage: ${ME} [--help] | [ [--delete] [--debug] ]\n"
	[ ${RET_CODE} -ne 0 ] && echo -e "${NC}"
	exit ${RET_CODE}
}

DEBUG=false
DELETE=false
while [ $# -ne 0 ]; do
	if [ "${1}" = "--help" ]; then
		usage_and_exit 0;
	elif [ "${1}" = "--delete" ]; then
		DELETE=true
		shift
	elif [ "${1}" = "--debug" ]; then
		DEBUG=true
		shift
	else
		usage_and_exit 1;
	fi
done

MACHINE_ID="$(< /etc/machine-id)"
if [ "${DELETE}" = "true" ]; then
	generate_post_data()
	{
		cat <<-EOF
		{
		"website_url": "DELETE"
		"machine_id": "${MACHINE_ID}"
		}
		EOF
	}

else
	LOCATION="$(jq -r '.location' "${CAMERA_SETTINGS}")"
	OWNER="$(jq -r '.owner' "${CAMERA_SETTINGS}")"
	LATITUDE="$(jq -r '.latitude' "${CAMERA_SETTINGS}")"
	LONGITUDE="$(jq -r '.longitude' "${CAMERA_SETTINGS}")"
	WEBSITE_URL="$(jq -r '.websiteurl' "${CAMERA_SETTINGS}")"
	IMAGE_URL="$(jq -r '.imageurl' "${CAMERA_SETTINGS}")"
	CAMERA="$(jq -r '.camera' "${CAMERA_SETTINGS}")"
	LENS="$(jq -r '.lens' "${CAMERA_SETTINGS}")"
	COMPUTER="$(jq -r '.computer' "${CAMERA_SETTINGS}")"

	generate_post_data()
	{
		cat <<-EOF
		{
		"location": "${LOCATION}",
		"owner": "${OWNER}",
		"latitude": "${LATITUDE}",
		"longitude": "${LONGITUDE}",
		"website_url": "${WEBSITE_URL}",
		"image_url": "${IMAGE_URL}",
		"camera": "${CAMERA}",
		"lens": "${LENS}",
		"computer": "${COMPUTER}",
		"machine_id": "${MACHINE_ID}"
		}
		EOF
	}
fi

# Extract last character of machine ID and find its parity
digit="${MACHINE_ID: -1}"
decimal=$(( 16#$digit ))
parity="$(( decimal % 2 ))"

# Only upload every other day to save on server bandwidth
RETURN_CODE=0
if (( $(date +%d) % 2 == parity ))
then
	if [ ${ON_TTY} -eq 1 ] || [ ${ALLSKY_DEBUG_LEVEL} -ge 3 ]; then
		echo "${ME}: Week day matches Machine ID ending - upload"
	fi
	COMMAND="curl --silent -i \
		-H 'Accept: application/json' \
		-H 'Content-Type:application/json' \
		--data '$(generate_post_data)' 'https://www.thomasjacquin.com/allsky-map/postToMap.php'"
	[ "${DEBUG}" = "true" ] && echo -e "${ME}: executing:\n${COMMAND}"
	${COMMAND}
	RETURN_CODE=$?
	if [ ${RETURN_CODE} -ne 0 ]; then
		echo "${RED}*** ${ME}: ERROR while uploading map data: ${RET}.${NC}"
		exit ${RETURN_CODE}
	fi

	# Get the return string from the server.  It's the last line of output.
	RET="$(echo "${RET}" | tail -1)"
	if [ "${RET}" = "INSERTED" ] || [ "${RET}" = "UPDATED" ] || [ "${RET}" = "DELETED" ]; then
		echo "${ME}: Map data ${RET}."
	elif [ "${RET}" = "ALREADY UPDATED" ]; then
		echo "${YELLOW}*** ${ME}: NOTICE returned while uploading map data: ${RET}.${NC}"
	else
		echo "${RED}*** ${ME}: ERROR returned while uploading map data: ${RET}.${NC}"
		RETURN_CODE=2
	fi

elif [ ${ON_TTY} -eq 1 ] || [ ${ALLSKY_DEBUG_LEVEL} -ge 3 ]; then
	echo "${ME}: Week day doesn't match Machine ID ending - don't upload."
fi

exit ${RETURN_CODE}
