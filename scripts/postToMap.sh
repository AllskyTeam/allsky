#!/bin/bash

ME="$(basename "${BASH_ARGV0}")"

# Allow this script to be executed manually, which requires several variables to be set.
if [ -z "${ALLSKY_HOME}" ] ; then
	ALLSKY_HOME="$(realpath "$(dirname "${BASH_ARGV0}")/..")"
	export ALLSKY_HOME
fi

# This script uploads various information relative to the camera setup to the allsky map.
# https://www.thomasjacquin.com/allsky-map/
# Information is gathered automatically from the settings file.
# The script can be called manually, via endOfNight.sh, or via the WebUI.

# Disabling shellcheck to force CI to compile - May need to find a better way to deal with this
# shellcheck disable=SC1090
source "${ALLSKY_HOME}/variables.sh"
# shellcheck disable=SC1090
source "${ALLSKY_CONFIG}/config.sh"
# shellcheck disable=SC1090
source "${ALLSKY_SCRIPTS}/functions.sh"

function usage_and_exit()
{
	RET_CODE=${1}
	[ ${RET_CODE} -ne 0 ] && echo -en "${wERROR}"
	echo -e "${BR}Usage: ${ME} [--help] [--whisper] [--delete] [--force] [--debug] [--machineid id] [--endofnight]${BR}"
	echo "--help: Print this usage message and exit immediately."
	echo "--whisper: Be quiet with non-error related output - only display results."
	echo "--delete: Delete map data; all fields except machine_id are ignored."
	echo "--force: Force updates, even if not scheduled automatically for today."
	echo "--debug: Output debugging statements."
	echo "--endofnight: Indicates how ${ME} was invoked."
	[ ${RET_CODE} -ne 0 ] && echo -e "${wNC}"
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
		E="ERROR: '${URL}' is not reachable from the Internet.${BR}${E}"
	elif [ "${URL:0:5}" != "http:" ] && [ "${URL:0:6}" != "https:" ]; then
		E="ERROR: 'Website URL' must begin with 'http:' or 'https:'.${BR}${E}"
	else
		# Make sure it's a valid URL
		CONTENT="$(curl --head --silent --show-error --connect-timeout ${TIMEOUT} "${URL}" 2>&1)"
		RET=$?
		if [ ${RET} -eq 6 ]; then
			E="ERROR: '${URL}' not found - check spelling.${BR}${E}"
		elif [ ${RET} -eq 28 ]; then
			E="ERROR: Could not connect to '${URL}' after ${TIMEOUT} seconds.${BR}${E}"
		elif [ ${RET} -ne 0 ]; then
				E="ERROR: '${URL}' cannot be reached (${CONTENT}).${BR}${E}"
		else
			if [ "${URL_TYPE}" = "websiteurl" ]; then
				TYPE="$(echo "${CONTENT}" | grep -i "Content-Type: text")"
				T="web site"
			else
				TYPE="$(echo "${CONTENT}" | grep -i "Content-Type: image")"
				T="image"
			fi
			if [ -z "${TYPE}" ]; then
				E="ERROR: ${FIELD_NAME} '${URL}' does not appear to be a valid ${T}.${BR}${E}"
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
MACHINE_ID=""
while [ $# -ne 0 ]; do
	if [ "${1}" = "--help" ]; then
		usage_and_exit 0;
	elif [ "${1}" = "--delete" ]; then
		DELETE=true
		UPLOAD=true		# always upload DELETEs
	elif [ "${1}" = "--debug" ]; then
		DEBUG=true
	elif [ "${1}" = "--force" ]; then
		UPLOAD=true
	elif [ "${1}" = "--whisper" ]; then
		WHISPER=true
	elif [ "${1}" = "--endofnight" ]; then
		ENDOFNIGHT=true
	elif [ "${1}" = "--machineid" ]; then
		MACHINE_ID="${2}"
		shift
	else
		usage_and_exit 1;
	fi
	shift
done


# If not on a tty, then we're either called from the endOfNight.sh script (plain text), or the WebUI (html).
if [[ ${ON_TTY} -eq 0 && ${ENDOFNIGHT} = "false" ]]; then
	BR="<br>"		# Line break
else
	BR="\n"
fi

# shell check doesn't realize there were set in variables.sh
wOK="${wOK}"
wWARNING="${wWARNING}"
wERROR="${wERROR}"
wDEBUG="${wDEBUG}"
wNC="${wNC}"

if [[ ${ENDOFNIGHT} = "true" ]]; then
	# All stdout/stderr output goes to the log file so don't include colors.
	wERROR=""
	wWARNING=""
	wNC=""
fi

if [ "${WHISPER}" = "true" ];then
	MSG_START=""
	ERROR_MSG_START="${wERROR}"
	WARNING_MSG_START="${wWARNING}"
else
	MSG_START="${ME}: "
	ERROR_MSG_START="${wERROR}*** ${ME}: "
	WARNING_MSG_START="${wWARNING}*** ${ME}: "
fi


if [[ -z ${MACHINE_ID} ]]; then
	MACHINE_ID="$(< /etc/machine-id)"
	if [ -z "${MACHINE_ID}" ]; then
		E="ERROR: Unable to get 'machine_id': check /etc/machine-id."
		echo -e "${ERROR_MSG_START}${E}${wNC}"
		[ "${ENDOFNIGHT}" = "true" ] && "${ALLSKY_SCRIPTS}/addMessage.sh" "error" "${ME}: ${E}"
		exit 3
	fi
fi

OK=true
E=""
LATITUDE="$(settings ".latitude")"
if [ "${LATITUDE}" = "" ]; then
	E="ERROR: 'Latitude' is required.${BR}${E}"
	OK=false
fi
LONGITUDE="$(settings ".longitude")"
if [ "${LONGITUDE}" = "" ]; then
	E="ERROR: 'Longitude' is required.${BR}${E}"
	OK=false
fi
[[ ${OK} == "false" ]] && echo -e "${ERROR_MSG_START}${E}${wNC}" && exit 1

LATITUDE="$(convertLatLong "${LATITUDE}" "latitude")"
LATRET=$?
LONGITUDE="$(convertLatLong "${LONGITUDE}" "longitude")"
LONGRET=$?
OK=true
if [[ ${LATRET} -ne 0 ]]; then
	OK=false
	echo -e "${RED}${ME}: ERROR: ${LATITUDE}"
fi
if [[ ${LONGRET} -ne 0 ]]; then
	OK=false
	echo -e "${RED}${ME}: ERROR: ${LONGITUDE}"
fi
[[ ${OK} == "false" ]] && exit 1

if false; then
	LA=${LATITUDE%.*}
	LO=${LONGITUDE%.*}
	MACHINE_ID="${LA:0:2}${LO:0:2}${MACHINE_ID:4}"
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
	LOCATION="$(settings ".location")"
	OWNER="$(settings ".owner")"
	WEBSITE_URL="$(settings ".websiteurl")"
	IMAGE_URL="$(settings ".imageurl")"
# TODO: CAMERA should be a combination of CAMERA_TYPE (which we have) and CAMERA_MODEL
	CAMERA="$(settings ".camera")"
	LENS="$(settings ".lens")"
	COMPUTER="$(settings ".computer")"

	OK=true
	E=""
	W=""
	# Check for required fields
	if [ "${CAMERA}" = "" ]; then
		E="ERROR: 'Camera' is required.${BR}${E}"
		OK=false
	fi
	if [ "${COMPUTER}" = "" ]; then
		E="ERROR: 'Computer' is required.${BR}${E}"
		OK=false
	fi

	# Check for optional, but suggested fields
	if [ "${LOCATION}" = "" ]; then
		W="WARNING: 'Location' not set; continuing.${BR}${W}"
	fi
	if [ "${OWNER}" = "" ]; then
		W="WARNING: 'Owner' not set; continuing.${BR}${W}"
	fi
	if [ "${LENS}" = "" ]; then
		W="WARNING: 'Lens' not set; continuing.${BR}${W}"
	fi

	# website_url and image_url are optional

	if [[ -n "${WEBSITE_URL}" && -z "${IMAGE_URL}" ]] || [[ -z "${WEBSITE_URL}" && -n "${IMAGE_URL}" ]]; then
		E="ERROR: If you specify the Website URL or Image URL, you must specify both URLs.${BR}${E}"
		OK=false
	elif [ -n "${WEBSITE_URL}" ]; then		# they specified both
		# The domain names (or IP addresses) must be the same.
		Wurl="$(get_domain "${WEBSITE_URL}")"
		Iurl="$(get_domain "${IMAGE_URL}")"
		if [ "${Wurl}" != "${Iurl}" ]; then
			E="ERROR: The Website and Image URLs must have the same domain name or IP address.${BR}${E}"
			OK=false
		fi
		if [ -n "${WEBSITE_URL}" ]; then
			check_URL "${WEBSITE_URL}" websiteurl "Website URL" || OK=false
		fi
		if [ -n "${IMAGE_URL}" ]; then
			check_URL "${IMAGE_URL}" imageurl "Image URL" || OK=false
		fi
	fi

	if [ "${W}" != "" ]; then
		echo -e "${WARNING_MSG_START}${W%%${BR}}${NC}"
		[ "${ENDOFNIGHT}" = "true" ] && "${ALLSKY_SCRIPTS}/addMessage.sh" "warning" "${ME}: ${W%%${BR}}"
	fi
	if [ "${OK}" = "false" ]; then
		echo -e "${ERROR_MSG_START}${M%%${BR}}${NC}"
		[ "${ENDOFNIGHT}" = "true" ] && "${ALLSKY_SCRIPTS}/addMessage.sh" "error" "${ME}: ${M%%${BR}}"
		exit 2
	fi

	if [ -f "${ALLSKY_HOME}/version" ]; then
		ALLSKY_VERSION="$(< "${ALLSKY_HOME}/version")"
	else
		ALLSKY_VERSION="$(grep "Allsky Camera Software" /var/log/allsky.log | tail -1 | sed -e 's/.*Software //' -e 's/ .*//')"
		[ -z "${ALLSKY_VERSION}" ] && ALLSKY_VERSION="unknown"
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
		"allsky_version": "${ALLSKY_VERSION}",
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
	[ "${DEBUG}" = "true" ] && echo -e "\n${wDEBUG}Executing:\n${CMD}${wNC}\n"
	# shellcheck disable=SC2090
	RETURN="$(echo ${CMD} | bash)"
	RETURN_CODE=$?
	[ "${DEBUG}" = "true" ] && echo -e "\n${wDEBUG}Returned:\n${RETURN}${wNC}.\n"
	if [ ${RETURN_CODE} -ne 0 ]; then
		E="ERROR while uploading map data with curl: ${RETURN}."
		echo -e "${ERROR_MSG_START}${E}${RETURN}${wNC}"
		[ "${ENDOFNIGHT}" = "true" ] && "${ALLSKY_SCRIPTS}/addMessage.sh" "error" "${ME}: ${E}"
		exit ${RETURN_CODE}
	fi

	# Get the return string from the server.  It's the last line of output.
	RET="$(echo "${RETURN}" | tail -1)"
	if [ "${RET}" = "INSERTED" ] || [ "${RET}" = "DELETED" ]; then
		echo -e "${wOK}${MSG_START}Map data ${RET}.${wNC}"

	elif [ "${RET:0:7}" = "UPDATED" ]; then
		echo -en "${wOK}${MSG_START}Map data UPDATED.${wNC}"
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
		E="ERROR: Unknown reply from server: ${RETURN}."
		echo -e "${ERROR_MSG_START}${E}${wNC}"
		[ "${ENDOFNIGHT}" = "true" ] && "${ALLSKY_SCRIPTS}/addMessage.sh" "error" "${ME}: ${E}"
		RETURN_CODE=2

	elif [ "${RET:0:6}" = "ERROR " ]; then
		E="ERROR returned while uploading map data: ${RET:6}."
		echo -e "${ERROR_MSG_START}${E}${wNC}"
		[ "${ENDOFNIGHT}" = "true" ] && "${ALLSKY_SCRIPTS}/addMessage.sh" "error" "${ME}: ${E}"
		RETURN_CODE=2

	elif [ "${RET:0:15}" = "ALREADY UPDATED" ]; then
		MAX_UPDATES=${RET:17}
		W="NOTICE: You have already updated your map data the maximum times per day (${MAX_UPDATES}).  Try again tomorrow."
		echo -e "${WARNING_MSG_START}${W}${wNC}"
		[ "${ENDOFNIGHT}" = "true" ] && "${ALLSKY_SCRIPTS}/addMessage.sh" "warning" "${ME}: ${W}"

	else
		E="ERROR returned while uploading map data: ${RET}."
		echo -e "${ERROR_MSG_START}${E}${wNC}"
		[ "${ENDOFNIGHT}" = "true" ] && "${ALLSKY_SCRIPTS}/addMessage.sh" "error" "${ME}: ${E}"
		RETURN_CODE=2
	fi

elif [ ${ON_TTY} -eq 1 ] || [ ${ALLSKY_DEBUG_LEVEL} -ge 4 ]; then
	echo "${ME}: Week day doesn't match Machine ID ending - don't upload."
fi

exit ${RETURN_CODE}
