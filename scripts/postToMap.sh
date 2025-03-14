#!/bin/bash

# Allow this script to be executed manually, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/.." )"
ME="$( basename "${BASH_ARGV0}" )"

# This script uploads various information relative to the camera setup to the allsky map.
# https://www.thomasjacquin.com/allsky-map/
# Information is gathered automatically from the settings file.
# The script can be called manually, via endOfNight.sh, or via the WebUI.

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"		|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"		|| exit "${EXIT_ERROR_STOP}"

function usage_and_exit()
{
	local RET=${1}
	exec >&2
	local MSG="Usage: ${ME} [--help] [--whisper] [--delete] [--force] [--debug] [--machineid id] [--endofnight] [--fromWebUI]"
	echo
	if [[ ${RET} -eq 0 ]]; then
		echo -e "${MSG}"
	else
		E_ "${MSG}"
	fi
	echo "where:"
	echo "    --help:       Print this usage message and exit immediately."
	echo "    --whisper:    Be quiet with non-error related output - only display results."
	echo "    --delete:     Delete map data; all fields except machine_id are ignored."
	echo "    --force:      Force updates, even if not scheduled automatically for today."
	echo "    --debug:      Output debugging statements."
	echo "    --endofnight: ${ME} was called from endOfNight.sh."
	echo "    --fromWebUI:  ${ME} was called from the WebUI (use html)."
	echo
	exit "${RET}"
}

function get_domain()
{
	local URL D
	# Get the domain name or IP address from a URL
	# Examples:
	#	http://myallsky.com						# Return "myallsky.com"
	#	http://myallsky.com/allsky				# Return "myallsky.com"
	#	http://123.456.789.000:8080/allsky		# Return "123.456.789.000"
	URL="${1}"
	D="${URL/*\/\//}"	# Remove everything up to and including "//"
	D="${D/[:\/]*/}"	# Remove from ":" or "/" to end
	D="${D/www./}"		# Remove optional "www."
	echo "${D}"
}


function check_URL()
{
	local URL="${1}"
	local URL_TYPE="${2}"
	local FIELD_NAME="${3}"

	local TIMEOUT=30		# seconds to wait when trying to reach a URL
	local E=""				# holds error message

	local D="$( get_domain "${URL}" )"
	if [[ "${D:0:7}"  == "192.168"		||
		  "${D:0:4}"  == "10.0"			||
		  "${D:0:6}"  == "172.16"		||
		  "${D:0:9}"  == "169.254.0"	||
		  "${D:0:6}"  == "198.18"		||
		  "${D:0:10}" == "198.51.100"	||
		  "${D:0:9}"  == "203.0.113"	||
		  "${D:0:3}"  == "240" ]]; then
		E+="ERROR: ${FIELD_NAME} '${URL}' is not reachable from the Internet.${BR}"

	elif [[ ${URL:0:5} != "http:" && ${URL:0:6} != "https:" ]]; then
		E+="ERROR: ${FIELD_NAME} '${URL}' must begin with 'http:' or 'https:'.${BR}"

	elif [[ ${URL_TYPE} == "remotewebsiteurl" && "$( basename "${URL}" )" == "index.php" ]]; then
		E+="ERROR: ${FIELD_NAME} '${URL}' should not end with '/index.php'.${BR}"

	else
		# Make sure it's a valid URL.  Some servers don't return anything if the user agent is "curl".
		local CONTENT="$( curl --user-agent Allsky --location --head --silent --show-error --connect-timeout "${TIMEOUT}" "${URL}" 2>&1 )"
		local RET=$?
		if [[ ${DEBUG} == "true" ]]; then
			D_ "\ncheck_URL(${URL}, ${URL_TYPE}, ${FIELD_NAME}) RET=${RET}:\n${CONTENT}\n"
		fi
		if [[ ${RET} -eq 6 ]]; then
			E+="ERROR: ${FIELD_NAME} '${URL}' not found - check spelling and network connectivity.${BR}"
		elif [[ ${RET} -eq 28 ]]; then
			E+="ERROR: Could not connect to ${FIELD_NAME} '${URL}' after ${TIMEOUT} seconds.${BR}"
		elif [[ ${RET} -ne 0 ]]; then
				E+="ERROR: ${FIELD_NAME} '${URL}' cannot be reached (${CONTENT}).${BR}"
		else
			local TYPE T
			if [[ ${URL_TYPE} == "remotewebsiteurl" ]]; then
				TYPE="$( echo "${CONTENT}" | grep -i "Content-Type: text" )"
				T="web site"
			else
				TYPE="$( echo "${CONTENT}" | grep -i "Content-Type: image" )"
				T="image"
			fi
			if [[ -z ${TYPE} ]]; then
				E+="ERROR: ${FIELD_NAME} '${URL}' does not appear to be a valid ${T}.${BR}"
			else
				return 0
			fi
		fi
	fi

	echo "${E}"		# NO -e
	return 1
}

DEBUG="false"
DELETE="false"
UPLOAD="false"
WHISPER="false"
ENDOFNIGHT="false"
MACHINE_ID=""
FROM_WEBUI="false"
FORCE="false"
while [[ $# -ne 0 ]]; do
	case "${1,,}" in
		--help)
			usage_and_exit 0;
			;;
		--delete)
			DELETE="true"
			UPLOAD="true"		# always upload DELETEs
			;;
		--debug)
			DEBUG="true"
			;;
		--force)
			FORCE="true"
			UPLOAD="true"
			;;
		--whisper)
			WHISPER="true"
			;;
		--endofnight)
			ENDOFNIGHT="true"
			;;
		--machineid)
			MACHINE_ID="${2}"
			shift
			;;
		--fromwebui)
			FROM_WEBUI="true"
			;;
		*)
			usage_and_exit 1;
			;;
	esac
	shift
done


if [[ ${FROM_WEBUI} == "true" ]]; then
	BR="<br>"		# Line break
else
	BR="\n"
fi

if [[ ${ENDOFNIGHT} == "true" ]]; then
	# All stdout/stderr output goes to the log file so don't include colors.
	wERROR=""
	wWARNING=""
	wNC=""
fi

if [[ ${WHISPER} == "true" ]]; then
	MSG_START=""
	ERROR_MSG_START=""
	WARNING_MSG_START=""
else
	MSG_START="${ME}: "
	ERROR_MSG_START="*** ${ME}: "
	WARNING_MSG_START="*** ${ME}: "
	if [[ ${FROM_WEBUI} == "true" ]]; then
		ERROR_MSG_START+="${BR}"
		WARNING_MSG_START+="${BR}"
	fi
fi


if [[ -z ${MACHINE_ID} ]]; then
	MACHINE_ID="$( < /etc/machine-id )"
	if [[ -z ${MACHINE_ID} ]]; then
		ERR="ERROR: Unable to get 'machine_id': check /etc/machine-id."
		wE_ "${ERROR_MSG_START}${ERR}" >&2
		[[ ${ENDOFNIGHT} == "true" ]] && "${ALLSKY_SCRIPTS}/addMessage.sh" --type error --msg "${ME}: ${ERR}"
		exit 3
	fi
fi

E=""
LATITUDE="$( settings ".latitude" )"
if [[ -z ${LATITUDE} ]]; then
	E+="ERROR: 'Latitude' is required.${BR}"
fi
LONGITUDE="$( settings ".longitude" )"
if [[ -z ${LONGITUDE} ]]; then
	E+="ERROR: 'Longitude' is required.${BR}"
fi
if [[ -n ${E} ]]; then
	wE_ "${ERROR_MSG_START}${E}"
	exit 1
fi

OK="true"
LATITUDE="$( convertLatLong "${LATITUDE}" "latitude" )" >&2 || OK="false"
LONGITUDE="$( convertLatLong "${LONGITUDE}" "longitude" )" >&2 || OK="false"
[[ ${OK} == "false" ]] && exit 1	# convertLatLong output error message


if false; then
	# TODO: in the future, include part of the latitude and longitude with the machine id
	# to REALLY guarantee it's unique (we've seen cases where two Pi's have the same machine id.
	LA=${LATITUDE%.*}
	LO=${LONGITUDE%.*}
	MACHINE_ID="${LA:0:2}${LO:0:2}${MACHINE_ID:4}"
fi

if [[ ${DELETE} == "true" ]]; then
	generate_post_data()
	{
		cat <<-EOF
		{
		"machine_id": "${MACHINE_ID}",
		"website_url": "DELETE"
		}
		EOF
	}

else
	LOCATION="$( settings ".location" )"
	OWNER="$( settings ".owner" )"
	WEBSITE_URL="$( settings ".remotewebsiteurl" )"
	IMAGE_URL="$( settings ".remotewebsiteimageurl" )"
	CAMERA="$( settings ".camera" )"
	LENS="$( settings ".lens" )"
	COMPUTER="$( settings ".computer" )"

	E=""
	W=""
	# Check for required fields
	if [[ -z ${CAMERA} ]]; then
		E+="ERROR: 'Camera' is required.${BR}"
	fi
	if [[ -z ${COMPUTER} ]]; then
		E+="ERROR: 'Computer' is required.${BR}"
	fi

	# Check for optional, but suggested fields
	if [[ -z ${LOCATION} ]]; then
		W+="WARNING: 'Location' not set; continuing.${BR}"
	fi
	if [[ -z ${OWNER} ]]; then
		W+="WARNING: 'Owner' not set; continuing.${BR}"
	fi
	if [[ -z ${LENS} ]]; then
		W+="WARNING: 'Lens' not set; continuing.${BR}"
	fi

	# website_url and image_url are optional

	if [[ (-n ${WEBSITE_URL} && -z ${IMAGE_URL}) || (-z ${WEBSITE_URL} && -n ${IMAGE_URL}) ]]; then
		E+="ERROR: If you specify the Website URL or Image URL, you must specify both URLs.${BR}"
	elif [[ -n ${WEBSITE_URL} ]]; then		# they specified both
		# The domain names (or IP addresses) must be the same.
		Wurl="$( get_domain "${WEBSITE_URL}" )"
		Iurl="$( get_domain "${IMAGE_URL}" )"
		if [[ ${Wurl} != "${Iurl}" ]]; then
			E+="ERROR: The Website and Image URLs must have the same domain name or IP address.${BR}"
		fi

		ERR="$( check_URL "${WEBSITE_URL}" remotewebsiteurl "Website URL" )"  || E+="${ERR}"
		ERR="$( check_URL "${IMAGE_URL}" remotewebsiteimageurl "Image URL" )" || E+="${ERR}"

		# Without a trailing "/" we may get a "Moved permanently" message.
		# This check needs to come after check_URL() above.
		[[ -n ${E} && -n ${WEBSITE_URL} && ${WEBSITE_URL: -1:1} != "/" ]] && WEBSITE_URL+="/"
	fi

	if [[ -n ${W} ]]; then
		wW_ "${WARNING_MSG_START}${W%%"${BR}"}" >&2
		# Want each message to have its own addMessage.sh entry.
		if [[ ${ENDOFNIGHT} == "true" ]]; then
			echo "${W}" | while read -r MSG
			do
				"${ALLSKY_SCRIPTS}/addMessage.sh" --type warning --msg "${ME}: ${MSG}"
			done
		fi
	fi
	if [[ -n ${E} ]]; then
		wE_ "${ERROR_MSG_START}${E%%"${BR}"}" >&2
		if [[ ${ENDOFNIGHT} == "true" ]]; then
			echo "${E}" | while read -r MSG
			do
				"${ALLSKY_SCRIPTS}/addMessage.sh" --type error --msg "${ME}: ${MSG}"
			done
		fi
		exit 2
	fi

	generate_post_data()
	{
		# Need to escape single quotes.
		local ALLSKY_SETTINGS="$( sed -e "s/'/'\"'\"'/g" "${SETTINGS_FILE}" )"

		local WEBSITE_SETTINGS
		if [[ $( settings ".uselocalwebsite" ) == "true" ]]; then
			WEBSITE_SETTINGS="$( sed -e "s/'/'\"'\"'/g" "${ALLSKY_WEBSITE_CONFIGURATION_FILE}" )"
		elif [[ $( settings ".useremotewebsite" ) == "true" ]]; then
			WEBSITE_SETTINGS="$( sed -e "s/'/'\"'\"'/g" "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}" )"
		else
			WEBSITE_SETTINGS="{ }"
		fi

		# Handle double quotes in fields that may have them.
		cat <<-EOF
		{
		"force": ${FORCE},
		"machine_id": "${MACHINE_ID}",
		"location": "${LOCATION/\"/\\\"}",
		"owner": "${OWNER/\"/\\\"}",
		"latitude": "${LATITUDE}",
		"longitude": "${LONGITUDE}",
		"website_url": "${WEBSITE_URL}",
		"image_url": "${IMAGE_URL}",
		"camera": "${CAMERA/\"/\\\"}",
		"lens": "${LENS/\"/\\\"}",
		"computer": "${COMPUTER/\"/\\\"}",
		"allsky_version": "${ALLSKY_VERSION}",
		"website_settings" : ${WEBSITE_SETTINGS},
		"allsky_settings" : ${ALLSKY_SETTINGS}
		}
		EOF
	}
fi

if [[ ${UPLOAD} == "false" ]]; then
	# Only upload every other day to save on server bandwidth.
	# Extract last character of machine ID and find its parity
	digit="${MACHINE_ID: -1}"
	decimal=$(( 16#$digit ))
	parity="$(( decimal % 2 ))"
	(( $( date +%e ) % 2 == parity )) && UPLOAD="true"
fi

RETURN_CODE=0
if [[ ${UPLOAD} == "true" ]]; then
	if [[ ${DELETE} == "true" ]]; then
		[[ ${WHISPER} == "false" ]] && echo "${ME}: Deleting map data."
	elif [[ ${ON_TTY} == "true" || ${ALLSKY_DEBUG_LEVEL} -ge 3 ]]; then
		[[ ${WHISPER} == "false" ]] && echo "${ME}: Uploading map data."
	fi
	# shellcheck disable=SC2089
	CMD="curl --silent --show-error -i -H 'Accept: application/json' -H 'Content-Type:application/json'"
	# shellcheck disable=SC2089
	CMD+=" --data '$( generate_post_data )'"
	CMD+=" https://www.thomasjacquin.com/allsky-map/postToMap.php"
	[[ ${DEBUG} == "true" ]] && wD_ "Executing:\n${CMD}\n"

	# shellcheck disable=SC2090,SC2086
	RETURN="$( eval ${CMD} 2>&1 )"
	RETURN_CODE=$?
	[[ ${DEBUG} == "true" ]] && wD_ "Returned:\n${RETURN:-Nothing returned}"
	if [[ ${RETURN_CODE} -ne 0 ]]; then
		ERR="ERROR while uploading map data with curl: ${RETURN}, CMD=${CMD}."
		if [[ ${ENDOFNIGHT} == "true" ]]; then
			echo -e "${ME}: ${ERR}"		# goes in log file
			"${ALLSKY_SCRIPTS}/addMessage.sh" --type error --msg "${ME}: ${ERR}"
		else
			wE_ "${ERROR_MSG_START}${ERR}" >&2
		fi
		exit "${RETURN_CODE}"
	fi

	# Check for server error.
	if HTTP="$( echo "${RETURN}" | grep HTTP )" ; then
		if [[ ! ${HTTP} =~ 200 ]]; then
			wW_ "Got server error ${HTTP}"
		fi
		exit 1
	fi
	# Get the return string from the server.  It's the last line of output.
	RET="$( echo "${RETURN}" | tail -1 )"
	if [[ ${RET} == "INSERTED" || ${RET} == "DELETED" ]]; then
		wO_ "${MSG_START}Map data ${RET}."

	elif [[ ${RET:0:7} == "UPDATED" ]]; then
		NUMBERS=${RET:8}	# num_updates max
		MSG=""
		if [[ -n ${NUMBERS} ]]; then
			NUM_UPDATES=${NUMBERS% *}
			MAX_UPDATES=${NUMBERS##* }
			NUM_LEFT=$((MAX_UPDATES - NUM_UPDATES))
			if [[ ${NUM_LEFT} -eq 0 ]]; then
				MSG="  This is your last update allowed today.  You made ${MAX_UPDATES}."
			else
				MSG="  You can make ${NUM_LEFT} more updates today."
			fi
		fi
		[[ ${ENDOFNIGHT} == "false" ]] && wO_ "${MSG_START}Map data UPDATED.${MSG}"

	elif [[ -z ${RET} ]]; then
		MSG="ERROR: Unknown reply from server: ${RETURN}."
		wE_ "${ERROR_MSG_START}${MSG}"
		[[ ${ENDOFNIGHT} == "true" ]] && "${ALLSKY_SCRIPTS}/addMessage.sh" --type error --msg "${ME}: ${MSG}"
		RETURN_CODE=2

	elif [[ ${RET:0:6} == "ERROR " ]]; then
		MSG="ERROR returned while uploading map data: ${RET:6}."
		wE_ "${ERROR_MSG_START}${MSG}"
		[[ ${ENDOFNIGHT} == "true" ]] && "${ALLSKY_SCRIPTS}/addMessage.sh" --type error --msg "${ME}: ${MSG}"
		RETURN_CODE=2

	elif [[ ${RET:0:15} == "ALREADY UPDATED" ]]; then
		MAX_UPDATES=${RET:16}
		MSG="NOTICE: You have already updated your map data the maximum of ${MAX_UPDATES} times per day.  Try again tomorrow."
		wW_ "${WARNING_MSG_START}${MSG}"
		[[ ${ENDOFNIGHT} == "true" ]] && "${ALLSKY_SCRIPTS}/addMessage.sh" --type warning --msg "${ME}: ${MSG}"

	else
		MSG="ERROR Got unknown error while uploading map data: ${RET:-No output}."
		wE_ "${ERROR_MSG_START}${MSG}"
		[[ ${ENDOFNIGHT} == "true" ]] && "${ALLSKY_SCRIPTS}/addMessage.sh" --type error --msg "${ME}: ${MSG}"
		RETURN_CODE=2
	fi

elif [[ ( ${ON_TTY} == "true" || ${ALLSKY_DEBUG_LEVEL} -ge 4) && ${ENDOFNIGHT} == "false"  ]]; then
	echo "${ME}: Not time to upload - wait until tomorrow."
fi

exit "${RETURN_CODE}"
