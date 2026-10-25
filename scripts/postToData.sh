#!/bin/bash
# shellcheck disable=SC2154		# referenced but not assigned - from convertJSON.php

# Allow this script to be executed manually, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/.." )"
ME="$( basename "${BASH_ARGV0}" )"

# This script sends the Contact Email and Usage Data to the Allsky Map server,
# but only what the user enabled in the "Privacy & Sharing" settings.
# It can also delete that data from the server.
# The script can be called manually, via endOfNight.sh, or via the WebUI.
# See the "Privacy & Sharing" documentation page for what is sent and why.

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"		|| exit "${ALLSKY_EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"		|| exit "${ALLSKY_EXIT_ERROR_STOP}"

DATA_COMMAND="${ALLSKY_MAP_URL}postToData.php"
DELETE_COMMAND="${ALLSKY_MAP_URL}deleteData.php"
DAYS_BETWEEN_UPLOADS=7

function usage_and_exit()
{
	local RET=${1}
	exec >&2
	local MSG="Usage: ${ME} [--help] [--show] [--delete usage|email|all] [--force] [--whisper] [--debug] [--endofnight] [--from f]"
	echo
	if [[ ${RET} -eq 0 ]]; then
		echo -e "${MSG}"
	else
		E_ "${MSG}"
	fi
	echo "Arguments:"
	echo "   --help        Print this usage message and exit immediately."
	echo "   --show        Print the data that would be sent, then exit without sending it."
	echo "   --delete t    Delete the Usage Data ('usage'), the Contact Email ('email'),"
	echo "                 or both ('all') from the server."
	echo "   --force       Send now, even if it's not ${DAYS_BETWEEN_UPLOADS} days since the last upload."
	echo "   --whisper     Be quiet with non-error related output - only display results."
	echo "   --debug       Output debugging statements."
	echo "   --endofnight  ${ME} was called from endOfNight.sh."
	echo "   --from f      Who called ${ME}, e.g., 'WebUI' (use html)."
	echo
	exit "${RET}"
}

DEBUG="false"
SHOW="false"
DELETE=""
FORCE="false"
WHISPER="false"
ENDOFNIGHT="false"
while [[ $# -ne 0 ]]; do
	case "${1,,}" in
		--help)
			usage_and_exit 0
			;;
		--show)
			SHOW="true"
			;;
		--delete)
			DELETE="${2,,}"
			if [[ ${DELETE} != "usage" && ${DELETE} != "email" && ${DELETE} != "all" ]]; then
				E_ "${ME}: --delete needs 'usage', 'email', or 'all'." >&2
				usage_and_exit 1
			fi
			shift
			;;
		--force)
			FORCE="true"
			;;
		--whisper)
			WHISPER="true"
			;;
		--debug)
			DEBUG="true"
			;;
		--endofnight)
			ENDOFNIGHT="true"
			;;
		--from)
			shift		# accepted like postToMap.sh does; not needed yet
			;;
		*)
			usage_and_exit 1
			;;
	esac
	shift
done

if [[ ${WHISPER} == "true" ]]; then
	MSG_START=""
else
	MSG_START="${ME}: "
fi

# Errors go to the WebUI's or terminal's output and, at the end of night, to a system message.
function error()
{
	local E="${1}"
	if [[ ${ENDOFNIGHT} == "true" ]]; then
		echo -e "${ME}: ${E}"		# goes in log file
		"${ALLSKY_SCRIPTS}/addMessage.sh" --type error --msg "${ME}: ${E}"
	else
		wE_ "${MSG_START}${E}" >&2
	fi
}

# The data is stored under a hash of the machine id, not the id itself:
# /etc/machine-id should stay on the Pi ("man machine-id").
MACHINE_ID="$( < /etc/machine-id )"
if [[ -z ${MACHINE_ID} ]]; then
	error "ERROR: Unable to get 'machine_id': check /etc/machine-id."
	exit 3
fi
DATA_ID="$( echo -n "allsky:${MACHINE_ID}" | sha256sum )"
DATA_ID="${DATA_ID%% *}"

#shellcheck disable=SC2119
getAllSettings || exit 1

# Print the Usage Data as JSON.
function usage_data()
{
	local FILE="${ALLSKY_USAGE_DATA_FILE}"
	local WEBUI_FILE="${ALLSKY_WEBUI_USAGE_DATA_FILE}"
	local COUNTS="{ }"  WEBUI_DAYS=0  SINCE=""  WEBUI_SINCE=""
	if [[ -s ${FILE} ]]; then
		COUNTS="$( jq -c '.counts // { }' "${FILE}" 2>/dev/null )" || COUNTS="{ }"
		SINCE="$( jq -r '.since // ""' "${FILE}" 2>/dev/null )"
	fi
	if [[ -s ${WEBUI_FILE} ]]; then
		WEBUI_DAYS="$( jq -r '.days // 0' "${WEBUI_FILE}" 2>/dev/null )" || WEBUI_DAYS=0
		WEBUI_SINCE="$( jq -r '.since // ""' "${WEBUI_FILE}" 2>/dev/null )"
	fi
	# The earlier of the two dates; dates in YYYY-MM-DD format sort as strings.
	if [[ -z ${SINCE} || ( -n ${WEBUI_SINCE} && ${WEBUI_SINCE} < "${SINCE}" ) ]]; then
		SINCE="${WEBUI_SINCE}"
	fi

	local OS  NUM_CAMERAS
	OS="$( . /etc/os-release 2>/dev/null && echo "${PRETTY_NAME}" )"
	NUM_CAMERAS="$( grep --count "^camera"$'\t' "${ALLSKY_CONNECTED_CAMERAS_INFO}" 2>/dev/null )"

	# The names of the enabled modules in each flow.
	local MODULES="{ }"  FLOW  F  NAMES
	for FLOW in day night daynight nightday periodic ; do
		F="${ALLSKY_MODULES}/postprocessing_${FLOW}.json"
		[[ ! -s ${F} ]] && continue
		NAMES="$( jq -c '[ .[] | select(.enabled == true) | .module | sub("\\.py$"; "") ]' "${F}" 2>/dev/null )" || continue
		MODULES="$( jq -c --arg f "${FLOW}" --argjson n "${NAMES}" '.[$f] = $n' <<< "${MODULES}" )"
	done

	jq -n \
		--arg since "${SINCE:-$( date +%F )}" \
		--arg os "${OS}" \
		--arg computer "${S_computer}" \
		--arg camera "${S_camera}" \
		--argjson cameras "${NUM_CAMERAS:-0}" \
		--argjson counts "${COUNTS}" \
		--argjson webui "${WEBUI_DAYS:-0}" \
		--argjson modules "${MODULES}" \
		'{
			since: $since,
			os: $os,
			computer: $computer,
			camera: $camera,
			cameras_connected: $cameras,
			allsky_starts: ($counts.allsky_starts // 0),
			camera_changes: ($counts.camera_changes // 0),
			webui_days: $webui,
			modules: $modules
		}'
}

# Print what is sent to the server.
function post_data()
{
	local USAGE="null"  EMAIL=""
	[[ ${S_shareusagedata} == "true" ]] && USAGE="$( usage_data )"
	EMAIL="${S_contactemail}"
	jq -n \
		--arg id "${DATA_ID}" \
		--arg version "${ALLSKY_VERSION}" \
		--arg email "${EMAIL}" \
		--argjson usage "${USAGE}" \
		'{ id: $id, allsky_version: $version }
		+ (if $email != "" then { email: $email } else { } end)
		+ (if $usage != null then { usage: $usage } else { } end)'
}

# Send the JSON on stdin to the URL ${1}; check and print the server's reply.
# Returns 0 if the server accepted it.
function send()
{
	local URL="${1}"
	local REPLY  RET  HTTP  UNUSED  STATUS  MORE_INFO  OK="false"

	REPLY="$( curl --silent --show-error --include --max-time 60 \
		-H 'Accept: application/json' -H 'Content-Type: application/json' \
		--data-binary @- "${URL}" 2>&1 )"
	RET=$?
	[[ ${DEBUG} == "true" ]] && wD_ "curl returned ${RET}:\n$( indent --spaces "${REPLY}" )" >&2
	if [[ ${RET} -ne 0 ]]; then
		error "ERROR while sending data to ${URL}: ${REPLY}"
		return 1
	fi
	HTTP="$( echo "${REPLY}" | grep --max-count=1 "^HTTP" )"
	if [[ -n ${HTTP} && ! ${HTTP} =~ " 200" ]]; then
		error "ERROR: Got server error ${HTTP} from ${URL}."
		return 1
	fi

	# The server replies with lines like "RETURN UPDATED" or "RETURN ERROR why".
	# shellcheck disable=SC2034
	while read -r UNUSED STATUS MORE_INFO
	do
		case "${STATUS}" in
			"INSERTED" | "UPDATED" | "DELETED")
				OK="true"
				[[ ${ENDOFNIGHT} == "false" ]] && wO_ "${MSG_START}Data ${STATUS}."
				;;
			"MESSAGE")
				wI_ "${MSG_START}Message from the Allsky Map server: ${MORE_INFO}."
				[[ ${ENDOFNIGHT} != "true" ]] &&
					"${ALLSKY_SCRIPTS}/addMessage.sh" --type info --msg "Message from the Allsky Map server: ${MORE_INFO}."
				;;
			"ERROR")
				error "ERROR returned by the server: ${MORE_INFO}."
				;;
			*)
				error "ERROR: Unknown status from server: [${STATUS}].  Contact the Allsky Team."
				;;
		esac
	done <<< "$( echo "${REPLY}" | grep "^RETURN " )"

	if [[ ${OK} == "false" ]]; then
		! echo "${REPLY}" | grep --quiet "^RETURN " &&
			error "ERROR: No status returned from server: ${REPLY}."
		return 1
	fi
	return 0
}

# Start the Usage Data over: they were sent, or must no longer be kept.
# The WebUI's file belongs to the web server; it's removed and recreated by the WebUI.
function reset_usage_data()
{
	local LAST="${1}"		# date of the last upload, or ""
	rm -f "${ALLSKY_WEBUI_USAGE_DATA_FILE}"
	if [[ -n ${LAST} ]]; then
		echo "{ \"since\": \"$( date +%F )\", \"counts\": { }, \"last_upload\": \"${LAST}\" }" \
			> "${ALLSKY_USAGE_DATA_FILE}"
	else
		rm -f "${ALLSKY_USAGE_DATA_FILE}"
	fi
}


if [[ -n ${DELETE} ]]; then
	if [[ ${SHOW} == "true" ]]; then
		jq -n --arg id "${DATA_ID}" --arg type "${DELETE}" '{ id: $id, type: $type }'
		exit 0
	fi
	[[ ${WHISPER} == "false" ]] && echo "${ME}: Deleting '${DELETE}' data from the Allsky Map server."
	jq -n --arg id "${DATA_ID}" --arg type "${DELETE}" '{ id: $id, type: $type }' |
		send "${DELETE_COMMAND}" || exit 2
	if [[ ${DELETE} != "email" ]]; then
		reset_usage_data ""
	fi
	exit 0
fi

if [[ ${S_shareusagedata} != "true" && -z ${S_contactemail} ]]; then
	if [[ ${SHOW} == "true" ]]; then
		echo "Nothing is sent: 'Share Usage Data' is disabled and 'Contact Email' is empty."
	elif [[ ${ENDOFNIGHT} == "false" && ${WHISPER} == "false" ]]; then
		echo "${ME}: Nothing to send."
	fi
	exit 0
fi

if [[ ${SHOW} == "true" ]]; then
	post_data
	exit 0
fi

if [[ ${FORCE} == "false" ]]; then
	LAST="$( jq -r '.last_upload // ""' "${ALLSKY_USAGE_DATA_FILE}" 2>/dev/null )"
	if [[ -n ${LAST} ]]; then
		DAYS=$(( ( $( date +%s ) - $( date -d "${LAST}" +%s 2>/dev/null || echo 0 ) ) / 86400 ))
		if [[ ${DAYS} -lt ${DAYS_BETWEEN_UPLOADS} ]]; then
			[[ ${ENDOFNIGHT} == "false" && ${WHISPER} == "false" ]] &&
				echo "${ME}: Not time to upload - last upload was ${DAYS} day(s) ago."
			exit 0
		fi
	fi
fi

[[ ${WHISPER} == "false" && ${ENDOFNIGHT} == "false" ]] && echo "${ME}: Sending data to the Allsky Map server."
post_data | jq -c . | send "${DATA_COMMAND}" || exit 2
reset_usage_data "$( date +%F )"
exit 0
