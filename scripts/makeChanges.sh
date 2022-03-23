#!/bin/bash

ME="$(basename "${BASH_ARGV0}")"

# Allow this script to be executed manually, which requires several variables to be set.
if [ -z "${ALLSKY_HOME}" ] ; then
	ALLSKY_HOME=$(realpath "$(dirname "${BASH_ARGV0}")"/..)
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

function update_config_js()
{
		FILE="${WEBSITE_DIR}/config.js"
		[ ! -f "${FILE}" ] && return	# The website isn't installed on the Pi.

		# TODO: For remote websites, store a local copy of config.js and update it, the upload it.

		FIELD="${1}"
		# If ${OLD} is set, only update its value, not the whole line.
		OLD="${2}"
		# Convert HTML code for apostophy back to character.
		apos="&#x27"
		NEW="${3/${apos}/\'}"
		[ "${DEBUG}" = "true" ] && echo "${ME} update config.js field '${FIELD}' to [${NEW}]"
		if [ -n "${OLD}" ]; then
			OUTPUT="$(sed -i -e "/[ \t]*${FIELD}:/ s/${OLD}/${NEW}/" "${FILE}" 2>&1)"
			RET=$?
		else
			OUTPUT="$(sed -i -e "s/[ \t]*${FIELD}:.*$/\t${FIELD}: \"${NEW}\",/" "${FILE}" 2>&1)"
			RET=$?
		fi
		if [ ${RET} -eq 0 ]; then
			echo "'${FIELD}' updated in config.js to <b>${NEW}</b>."
			sudo chown pi "${FILE}"
		else
			echo "<span style='color: red'>WARNING: '${FIELD}' in config.js could not be updated; ignoring</span>: ${OUTPUT}"
		fi
}

RUN_POSTDATA=false
RUN_POSTTOMAP=false
POSTTOMAP_ACTION=""
while [ $# -gt 0 ]; do
	KEY="${1}"
	OLD_VALUE="${2}"
	NEW_VALUE="${3}"
	[ "${DEBUG}" = "true" ] && echo "${ME}: ${KEY} old [${OLD_VALUE}], new [${NEW_VALUE}]"

	case "${KEY}" in
		filename)
			update_config_js "imageName" "${OLD_VALUE}" "${NEW_VALUE}"
			;;
		extratext)
			# It's possible the user will create/populate the file while Allsky is running,
			# so it's not an error if the file doesn't exist or is empty.
			if [ -n "${NEW_VALUE}" ]; then
				if [ ! -f "${NEW_VALUE}" ]; then
					echo "<span style='color: red'>WARNING: '${NEW_VALUE}' does not exist; ignoring</span>"
				elif [ ! -s "${NEW_VALUE}" ]; then
					echo "<span style='color: red'>WARNING: '${NEW_VALUE}' is empty; ignoring</span>"
				fi
			fi
			;;
		latitude | longitude)
			update_config_js "${KEY}" "" "${NEW_VALUE}"
			RUN_POSTDATA=true
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
			update_config_js "${KEY}" "" "${NEW_VALUE}"
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
		echo -e "<span style='color: red'>ERROR posting twilight data: ${RESULT}.</span>"
	fi
fi
if [ "${RUN_POSTTOMAP}" = "true" ]; then
	"${ALLSKY_SCRIPTS}/postToMap.sh" --whisper --force ${POSTTOMAP_ACTION}
fi

exit 0
