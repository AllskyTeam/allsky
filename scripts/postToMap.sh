#!/bin/bash

ME="$(basename "${BASH_ARGV0}")"

# Allow this script to be executed manually, which requires several variables to be set.
if [ -z "${ALLSKY_HOME}" ] ; then
	ALLSKY_HOME="$(realpath "$(dirname "${BASH_ARGV0}")/..")"
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

if [ ${ON_TTY} -eq 1 ]; then
	RED_START="${RED}"
	GREEN_START="${GREEN}"
	YELLOW_START="${YELLOW}"
	COLOR_END="${NC}"
	BR=" \n"
else
	RED_START="<span style='color: red'>"
	GREEN_START="<span style='color: green'>"
	YELLOW_START="<span style='color: yellow'>"
	COLOR_END="</span>"
	BR="<br>"
fi

function usage_and_exit()
{
	RET_CODE=${1}
	[ ${RET_CODE} -ne 0 ] && echo -en "${RED_START}"
	echo -e "${BR}Usage: ${ME} [--help] [--whisper] [--delete] [--force] [--debug] [--endofnight]${BR}"
	echo "--help: Print this usage message and exit immediately."
	echo "--whisper: Be quiet with non-error related output - only display results."
	echo "--delete: Delete map data; all fields except machine_id are ignored."
	echo "--force: Force updates, even if not scheduled automatically for today."
	echo "--debug: Output debugging statements."
	echo "--endofnight: Indicates how ${ME} was invoked."
	[ ${RET_CODE} -ne 0 ] && echo -e "${COLOR_END}"
	exit ${RET_CODE}
}

function get_domain()
{
	# Get the domain name or IP address from a URL
	# Examples:
	#	http://myallsky.com						# Return "myallsky.com"
	#	http://myallsky.com/allsky				# Return "myallsky.com"
	#	http://123.456.789.000:8080/allsky		# Return "123.456.789.000"
	URL="${1}"
	D="${URL/*\/\//}"	# Remove everything up to and including "//"
	D="${D/[:\/]*/}"	# Remove from ":" or "/" to end
	echo "${D}"
}

TIMEOUT=30		# seconds to wait when trying to reach a URL

function check_URL()
{
	URL="${1}"
	URL_TYPE="${2}"
	FIELD_NAME="${3}"

	D="$(get_domain "${URL}")"
	if [[ "${D:0:7}" = "192.168" || "${D:0:4}" = "10.0" || "${D:0:6}" = "172.16" || "${D:0:9}" = "169.254.0" || "${D:0:6}" = "198.18" || "${D:0:10}" = "198.51.100"  || "${D:0:9}" = "203.0.113" || "${D:0:3}" = "240" ]]; then
		M="${ERROR_MSG_START}ERROR: '${URL}' is not reachable from the Internet.${ERROR_MSG_END}${BR}${M}"
	elif [ "${URL:0:5}" != "http:" ] && [ "${URL:0:6}" != "https:" ]; then
		M="${ERROR_MSG_START}ERROR: 'Website URL' must begin with 'http:' or 'https:'.${ERROR_MSG_END}${BR}${M}"
	else
		# Make sure it's a valid URL
		CONTENT="$(curl --head --silent --show-error --connect-timeout ${TIMEOUT} "${URL}" 2>&1)"
		RET=$?
		if [ ${RET} -eq 6 ]; then
			M="${ERROR_MSG_START}ERROR: '${URL}' not found - check spelling.${ERROR_MSG_END}${BR}${M}"
		elif [ ${RET} -eq 28 ]; then
			M="${ERROR_MSG_START}ERROR: Could not connect to '${URL}' after ${TIMEOUT} seconds.${ERROR_MSG_END}${BR}${M}"
		elif [ ${RET} -ne 0 ]; then
				M="${ERROR_MSG_START}ERROR: '${URL}' cannot be reached (${CONTENT}).${ERROR_MSG_END}${BR}${M}"
		else
			if [ "${URL_TYPE}" = "websiteurl" ]; then
				TYPE="$(echo "${CONTENT}" | grep -i "Content-Type: text")"
				T="web site"
			else
				TYPE="$(echo "${CONTENT}" | grep -i "Content-Type: image")"
				T="image"
			fi
			if [ -z "${TYPE}" ]; then
				M="${ERROR_MSG_START}ERROR: ${FIELD_NAME} '${URL}' does not appear to be a valid ${T}.${ERROR_MSG_END}${BR}${M}"
			else
				return 0
			fi
		fi
	fi
	return 1
}

DEBUG=false
DELETE=false
UPLOAD=false
WHISPER=false
ENDOFNIGHT=false
while [ $# -ne 0 ]; do
	if [ "${1}" = "--help" ]; then
		usage_and_exit 0;
	elif [ "${1}" = "--delete" ]; then
		DELETE=true
		UPLOAD=true		# always upload DELETEs
		shift
	elif [ "${1}" = "--debug" ]; then
		DEBUG=true
		shift
	elif [ "${1}" = "--force" ]; then
		UPLOAD=true
		shift
	elif [ "${1}" = "--whisper" ]; then
		WHISPER=true
		shift
	elif [ "${1}" = "--endofnight" ]; then
		ENDOFNIGHT=true
		shift
	else
		usage_and_exit 1;
	fi
done

if [ "${WHISPER}" = "true" ];then
	MSG_START=""
	ERROR_MSG_START="${RED_START}"
	WARNING_MSG_START="${YELLOW_START}"
else
	MSG_START="${ME}: "
	ERROR_MSG_START="${RED_START}*** ${ME}: "
	WARNING_MSG_START="${YELLOW_START}*** ${ME}: "
fi
ERROR_MSG_END="${COLOR_END}"
WARNING_MSG_END="${COLOR_END}"

MACHINE_ID="$(< /etc/machine-id)"
if [ -z "${MACHINE_ID}" ]; then
	M="${ERROR_MSG_START}ERROR: Unable to get 'machine_id': check /etc/machine-id.${ERROR_MSG_END}"
	echo -e "${M}"
	[ "${ENDOFNIGHT}" = "true" ] && echo -e "${ME}: ${M}" >> "${ALLSKY_MESSAGES}"
	exit 3
fi

if [ "${DELETE}" = "true" ]; then
	generate_post_data()
	{
		cat <<-EOF
		{
		"website_url": "DELETE",
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

	OK=true
	M=""
	# Check for required fields
	if [ "${LATITUDE}" = "" ]; then
		M="${ERROR_MSG_START}ERROR: 'Latitude' is required.${ERROR_MSG_END}${BR}${M}"
		OK=false
	fi
	if [ "${LONGITUDE}" = "" ]; then
		M="${ERROR_MSG_START}ERROR: 'Longitude' is required.${ERROR_MSG_END}${BR}${M}"
		OK=false
	fi
	if [ "${CAMERA}" = "" ]; then
		M="${ERROR_MSG_START}ERROR: 'Camera' is required.${ERROR_MSG_END}${BR}${M}"
		OK=false
	fi
	if [ "${COMPUTER}" = "" ]; then
		M="${ERROR_MSG_START}ERROR: 'Computer' is required.${ERROR_MSG_END}${BR}${M}"
		OK=false
	fi

	# Check for optional, but suggested fields
	if [ "${LOCATION}" = "" ]; then
		M="${WARNING_MSG_START}WARNING: 'Location' not set; continuing.${WARNING_MSG_END}${BR}${M}"
	fi
	if [ "${OWNER}" = "" ]; then
		M="${WARNING_MSG_START}WARNING: 'Owner' not set; continuing.${WARNING_MSG_END}${BR}${M}"
	fi
	if [ "${LENS}" = "" ]; then
		M="${WARNING_MSG_START}WARNING: 'Lens' not set; continuing.${WARNING_MSG_END}${BR}${M}"
	fi

	# website_url and image_url are optional

	if [ -n "${WEBSITE_URL}" -a -z "${IMAGE_URL}" ] || [ -z "${WEBSITE_URL}" -a -n "${IMAGE_URL}" ]; then
		M="${ERROR_MSG_START}ERROR: If you specify the Website URL or Image URL, you must specify both URLs.${ERROR_MSG_END}${BR}${M}"
		OK=false
	elif [ -n "${WEBSITE_URL}" ]; then		# they specified both
		# The domain names (or IP addresses) must be the same.
		W="$(get_domain "${WEBSITE_URL}")"
		I="$(get_domain "${IMAGE_URL}")"
		if [ "${W}" != "${I}" ]; then
			M="${ERROR_MSG_START}ERROR: The Website and Image URLs must have the same domain name or IP address.${ERROR_MSG_END}${BR}${M}"
			OK=false
		fi
		if [ -n "${WEBSITE_URL}" ]; then
			check_URL "${WEBSITE_URL}" websiteurl "Website URL" || OK=false
		fi
		if [ -n "${IMAGE_URL}" ]; then
			check_URL "${IMAGE_URL}" imageurl "Image URL" || OK=false
		fi
	fi

	if [ "${OK}" = "false" ]; then
		echo -e "${M%%${BR}}"
		[ "${ENDOFNIGHT}" = "true" ] && echo -e "${ME}: ${M%%${BR}}" >> "${ALLSKY_MESSAGES}"
		exit 2
	fi


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

if [ "${UPLOAD}" = "false" ]; then
	# Only upload every other day to save on server bandwidth.
	# Extract last character of machine ID and find its parity
	digit="${MACHINE_ID: -1}"
	decimal=$(( 16#$digit ))
	parity="$(( decimal % 2 ))"
	(( $(date +%e) % 2 == parity )) && UPLOAD=true
fi

RETURN_CODE=0
if [ "${UPLOAD}" = "true" ]; then
	if [ "${DELETE}" = "true" ]; then
		[ "${WHISPER}" = "false" ] && echo "${ME}: Deleting map data."
	elif [ ${ON_TTY} -eq 1 ] || [ ${ALLSKY_DEBUG_LEVEL} -ge 3 ]; then
		[ "${WHISPER}" = "false" ] && echo "${ME}: Uploading map data."
	fi
	# shellcheck disable=SC2089
	CMD="curl --silent -i -H 'Accept: application/json' -H 'Content-Type:application/json'"
	# shellcheck disable=SC2089
	CMD="${CMD} --data '$(generate_post_data)' 'https://www.thomasjacquin.com/allsky-map/postToMap.php'"
	[ "${DEBUG}" = "true" ] && echo -e "\nExecuting:\n${GREEN_START}${CMD}${COLOR_END}\n"
	# shellcheck disable=SC2090
	RETURN="$(echo ${CMD} | bash)"
	RETURN_CODE=$?
	[ "${DEBUG}" = "true" ] && echo -e "\nReturned:\n${YELLOW_START}${RETURN}${COLOR_END}.\n"
	if [ ${RETURN_CODE} -ne 0 ]; then
		M="${ERROR_MSG_START}ERROR while uploading map data with curl: ${RETURN}.${ERROR_MSG_END}"
		echo -e "${M}"
		[ "${ENDOFNIGHT}" = "true" ] && echo -e "${ME}: ${M}" >> "${ALLSKY_MESSAGES}"
		exit ${RETURN_CODE}
	fi

	# Get the return string from the server.  It's the last line of output.
	RET="$(echo "${RETURN}" | tail -1)"
	if [ "${RET}" = "INSERTED" ] || [ "${RET}" = "DELETED" ]; then
		echo "${MSG_START}Map data ${RET}."
	elif [ "${RET:0:7}" = "UPDATED" ]; then
		echo -n "${MSG_START}Map data UPDATED."
		NUMBERS=${RET:8}	# num_updates max
		if [ -n "${NUMBERS}" ]; then
			NUM_UPDATES=${NUMBERS% *}
			MAX_UPDATES=${NUMBERS##* }
			NUM_LEFT=$((MAX_UPDATES - NUM_UPDATES))
			if [ ${NUM_LEFT} -eq 0 ]; then
				echo "  This is your last update allowed today."
			else
				echo "  You can make ${NUM_LEFT} more today."
			fi
		else
			echo	# terminating newline
		fi
	elif [ -z "${RET}" ]; then
		M="${ERROR_MSG_START}ERROR: Unknown reply from server: ${RETURN}.${ERROR_MSG_END}"
		echo -e "${M}"
		[ "${ENDOFNIGHT}" = "true" ] && echo -e "${ME}: ${M}" >> "${ALLSKY_MESSAGES}"
		RETURN_CODE=2
	elif [ "${RET:0:6}" = "ERROR " ]; then
		M="${ERROR_MSG_START}ERROR returned while uploading map data: ${RET:6}.${ERROR_MSG_END}"
		echo -e "${M}"
		[ "${ENDOFNIGHT}" = "true" ] && echo -e "${ME}: ${M}" >> "${ALLSKY_MESSAGES}"
		RETURN_CODE=2
	elif [ "${RET:0:15}" = "ALREADY UPDATED" ]; then
		MAX_UPDATES=${RET:17}
		M="${WARNING_MSG_START}NOTICE:You have already updated your map data the maximum times per day (${MAX_UPDATES}).  Try again tomorrow.${WARNING_MSG_END}"
		echo -e "${M}"
		[ "${ENDOFNIGHT}" = "true" ] && echo -e "${ME}: ${M}" >> "${ALLSKY_MESSAGES}"
	else
		M="${ERROR_MSG_START}ERROR returned while uploading map data: ${RET}.${ERROR_MSG_END}"
		echo -e "${M}"
		[ "${ENDOFNIGHT}" = "true" ] && echo -e "${ME}: ${M}" >> "${ALLSKY_MESSAGES}"
		RETURN_CODE=2
	fi

elif [ ${ON_TTY} -eq 1 ] || [ ${ALLSKY_DEBUG_LEVEL} -ge 3 ]; then
	echo "${ME}: Week day doesn't match Machine ID ending - don't upload."
fi

exit ${RETURN_CODE}
