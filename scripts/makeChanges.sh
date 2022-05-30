#!/bin/bash

ME="$(basename "${BASH_ARGV0}")"

# Allow this script to be executed manually, which requires several variables to be set.
if [ -z "${ALLSKY_HOME}" ] ; then
	ALLSKY_HOME="$(realpath "$(dirname "${BASH_ARGV0}")/..")"
	export ALLSKY_HOME
fi
# shellcheck disable=SC1090
source "${ALLSKY_HOME}/variables.sh"
# shellcheck disable=SC1090
source "${ALLSKY_CONFIG}/config.sh"
# shellcheck disable=SC1090
source "${ALLSKY_CONFIG}/ftp-settings.sh"

DEBUG=false
[ "${1}" = "--debug" ] && DEBUG=true && shift

function usage_and_exit()
{
	echo -e "${RED}Usage: ${ME} [--debug] key old_value new_value [...]${NC}" >&2
	echo "There must be a multiple of 3 arguments." >&2
	exit ${1}
}
[ $# -eq 0 ] && usage_and_exit 1

MOD=$(($# % 3))
[ ${MOD} -ne 0 ] && usage_and_exit 2

function update_website_config()
{
		Q='"'		# JSON files have quotes around field names
		CONFIG_FILE_NAME="configuration.json"
		CONFIG_FILE="${WEBSITE_DIR}/${CONFIG_FILE_NAME}"
		if [ ! -f "${CONFIG_FILE}" ]; then
			Q=''
			CONFIG_FILE_NAME="config.js"		# OLD name - leave for compatibility
			CONFIG_FILE="${WEBSITE_DIR}/${CONFIG_FILE_NAME}"
			[ ! -f "${CONFIG_FILE}" ] && return	# The website isn't installed on the Pi.
		fi

		# TODO: For remote websites, store a local copy of the configuration file and update it, the upload it.

		FIELD="${1}"
		# If ${OLD} is set, only update its value, not the whole line.
		OLD="${2}"
		# Convert HTML code for apostrophy back to character.
		apos="&#x27"
		NEW="${3/${apos}/\'}"
		[ "${DEBUG}" = "true" ] && echo "${ME} update ${CONFIG_FILE_NAME} '${FIELD}' to [${NEW}]"
		if [ -n "${OLD}" ]; then
			OUTPUT="$(sed -i -e "/[ \t]*${Q}${FIELD}${Q}:/ s/${OLD}/${NEW}/" "${CONFIG_FILE}" 2>&1)"
			RET=$?
		else
			# Only put quotes around ${NEW} if it's not a number.
			[ -n "${NEW##?([+-])+([0-9.])}" ] && NEW="${Q}${NEW}${Q}"
			OUTPUT="$(sed -i -e "s/[ \t]*${Q}${FIELD}${Q}:.*$/\t${Q}${FIELD}${Q}: ${NEW},/" "${CONFIG_FILE}" 2>&1)"
			RET=$?
		fi
		if [ ${RET} -eq 0 ]; then
			echo "'${FIELD}' updated to <b>${NEW}</b> in ${CONFIG_FILE_NAME}."
			sudo chown pi "${CONFIG_FILE}"
		else
			echo "<span style='color: red'>WARNING: '${FIELD}' in ${CONFIG_FILE_NAME} not updated; ignoring</span>: ${OUTPUT}" >&2
		fi
}

RUN_POSTDATA=false
RUN_POSTTOMAP=false
POSTTOMAP_ACTION=""
typeset -i sawURLs=0
while [ $# -gt 0 ]; do
	KEY="${1}"
	OLD_VALUE="${2}"
	NEW_VALUE="${3}"
	if [ "${DEBUG}" = "true" ]; then
		MSG="${KEY} old [${OLD_VALUE}], new [${NEW_VALUE}]"
		echo "${ME}: ${MSG}"
		echo "<script>console.log('${MSG}');</script>"
	fi

	case "${KEY}" in
		filename)
			update_website_config "imageName" "${OLD_VALUE}" "${NEW_VALUE}"
			;;
		extratext)
			# It's possible the user will create/populate the file while Allsky is running,
			# so it's not an error if the file doesn't exist or is empty.
			if [ -n "${NEW_VALUE}" ]; then
				if [ ! -f "${NEW_VALUE}" ]; then
					echo "<span style='color: red'>WARNING: '${NEW_VALUE}' does not exist; ignoring</span>" >&2
				elif [ ! -s "${NEW_VALUE}" ]; then
					echo "<span style='color: red'>WARNING: '${NEW_VALUE}' is empty; ignoring</span>" >&2
				fi
			fi
			;;
		latitude | longitude)
			# Allow either +/- decimal numbers, OR numbers with N, S, E, W, but not both.
			NEW_VALUE="${NEW_VALUE^^[nsew]}"	# convert any character to uppercase for consistency
			SIGN="${NEW_VALUE:0:1}"				# First character, may be "-" or "+" or a number
			LAST="${NEW_VALUE: -1}"				# May be N, S, E, or W, or a number
			if [[ ("${SIGN}" = "+" || "${SIGN}" == "-") && ("${LAST%[NSEW]}" == "") ]]; then
				echo "<span style='color: red'>WARNING: '${NEW_VALUE}' should contain EITHER a \"${SIGN}\" OR a \"${LAST}\", but not both; ignoring</span>" >&2
			else
				update_website_config "${KEY}" "" "${NEW_VALUE}"
				RUN_POSTDATA=true
			fi
			;;
		angle)
			RUN_POSTDATA=true
			;;
		showonmap)
			[ "${NEW_VALUE}" = "0" ] && POSTTOMAP_ACTION="--delete"
			RUN_POSTTOMAP=true
			;;
		location | owner | camera | lens | computer)
			RUN_POSTTOMAP=true
			update_website_config "${KEY}" "" "${NEW_VALUE}"
			;;
		websiteurl | imageurl)
			RUN_POSTTOMAP=true
			;;

		*)
			echo -e "${RED}WARNING: Unknown key '${KEY}' ignoring.${NC}" >&2
			;;
		esac
		shift 3
done

if [ "${RUN_POSTDATA}" = "true" ] && [ ${POST_END_OF_NIGHT_DATA} = "true" ]; then
	RESULT="$(sudo --user pi --group pi "${ALLSKY_SCRIPTS}/postData.sh")"
	# shellcheck disable=SC2181
	if [ $? -eq 0 ]; then
		echo "Twilight data posted."
	else
		echo -e "<span style='color: red'>ERROR posting twilight data: ${RESULT}.</span>" >&2
	fi
fi
if [ "${RUN_POSTTOMAP}" = "true" ]; then
	"${ALLSKY_SCRIPTS}/postToMap.sh" --whisper --force ${POSTTOMAP_ACTION} >&2
fi

exit 0
