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

# This output may go to a web page, so use "w" colors.
# shell check doesn't realize there were set in variables.sh
wOK="${wOK}"
wWARNING="${wWARNING}"
wERROR="${wERROR}"
wDEBUG="${wDEBUG}"
wNC="${wNC}"

function usage_and_exit()
{
	echo -e "${wERROR}Usage: ${ME} [--debug] key old_value new_value [...]${wNC}" >&2
	echo "There must be a multiple of 3 arguments." >&2
	exit ${1}
}
[ $# -eq 0 ] && usage_and_exit 1
[ $(($# % 3)) -ne 0 ] && usage_and_exit 2

RUN_POSTDATA=false
RUN_POSTTOMAP=false
POSTTOMAP_ACTION=""
WEBSITE_CONFIG=()
while [ $# -gt 0 ]; do
	KEY="${1}"
	OLD_VALUE="${2}"
	NEW_VALUE="${3}"
	if [ "${DEBUG}" = "true" ]; then
		MSG="${KEY} old [${OLD_VALUE}], new [${NEW_VALUE}]"
		echo "${wDEBUG}${ME}: ${MSG}${wNC}"
		echo "<script>console.log('${MSG}');</script>"
	fi

	# Unfortunately, the Allsky configuration file was already updated,
	# so if we find a bad entry, e.g., a file doesn't exist, all we can do is warn the user.
	case "${KEY}" in
		filename)
			WEBSITE_CONFIG+=("imageName" "${OLD_VALUE}" "${NEW_VALUE}")
			;;
		extratext)
			# It's possible the user will create/populate the file while Allsky is running,
			# so it's not an error if the file doesn't exist or is empty.
			if [ -n "${NEW_VALUE}" ]; then
				if [ ! -f "${NEW_VALUE}" ]; then
					echo -e "${wWARNING}WARNING: '${NEW_VALUE}' does not exist; please change it.${wNC}" >&2
				elif [ ! -s "${NEW_VALUE}" ]; then
					echo -e "${wWARNING}WARNING: '${NEW_VALUE}' is empty; please change it.${wNC}" >&2
				fi
			fi
			;;
		latitude | longitude)
			# Allow either +/- decimal numbers, OR numbers with N, S, E, W, but not both.
			NEW_VALUE="${NEW_VALUE^^[nsew]}"	# convert any character to uppercase for consistency
			SIGN="${NEW_VALUE:0:1}"				# First character, may be "-" or "+" or a number
			LAST="${NEW_VALUE: -1}"				# May be N, S, E, or W, or a number
			if [[ (${SIGN} = "+" || ${SIGN} == "-") && (${LAST%[NSEW]} == "") ]]; then
				echo -e "${wWARNING}WARNING: '${NEW_VALUE}' should contain EITHER a \"${SIGN}\" OR a \"${LAST}\", but not both; please change it.${wNC}" >&2
			else
				WEBSITE_CONFIG+=("${KEY}" "" "${NEW_VALUE}")
				RUN_POSTDATA=true
			fi
			;;
		angle)
			RUN_POSTDATA=true
			;;
		config)
			if [ "${NEW_VALUE}" = "" ]; then
				NEW_VALUE="[none]"
			elif [ "${NEW_VALUE}" != "[none]" ]; then
				if [ ! -f "${NEW_VALUE}" ]; then
					echo -e "${wWARNING}WARNING: Configuration File '${NEW_VALUE}' does not exist; please change it.${wNC}" >&2
				elif [ ! -s "${NEW_VALUE}" ]; then
					echo -e "${wWARNING}WARNING: Configuration File '${NEW_VALUE}' is empty; please change it.${wNC}" >&2
				fi
			fi
			;;
		showonmap)
			[ "${NEW_VALUE}" = "0" ] && POSTTOMAP_ACTION="--delete"
			RUN_POSTTOMAP=true
			;;
		location | owner | camera | lens | computer)
			RUN_POSTTOMAP=true
			WEBSITE_CONFIG+=("${KEY}" "" "${NEW_VALUE}")
			;;
		websiteurl | imageurl)
			RUN_POSTTOMAP=true
			;;

		*)
			echo -e "${wWARNING}WARNING: Unknown key '${KEY}'; ignoring.${wNC}" >&2
			;;
		esac
		shift 3
done

if [[ ${RUN_POSTDATA} == "true" && ${POST_END_OF_NIGHT_DATA} == "true" ]]; then
	RESULT="$("${ALLSKY_SCRIPTS}/postData.sh")"
	# shellcheck disable=SC2181
	if [ $? -eq 0 ]; then
		echo -e "${wOK}Twilight data posted.${wNC}"
	else
		echo -e "${wERROR}ERROR posting twilight data: ${RESULT}.${wNC}" >&2
	fi
fi

# shellcheck disable=SC2128
if [[ ${WEBSITE_CONFIG} != "" && (-d ${ALLSKY_WEBSITE} || -f ${ALLSKY_CONFIG}/configuration.json) ]]; then
	"${ALLSKY_SCRIPTS}/updateWebsiteConfig.sh" --upload "${WEBSITE_CONFIG[@]}" >&2
fi	# else the Website isn't installed on the Pi or a remote server

if [[ ${RUN_POSTTOMAP} == "true" ]]; then
	"${ALLSKY_SCRIPTS}/postToMap.sh" --whisper --force ${POSTTOMAP_ACTION} >&2
fi

exit 0
