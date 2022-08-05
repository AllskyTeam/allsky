#!/bin/bash

# Update the specified Allsky Website configuration file.

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

# This output may go to a web page, so use "w" colors.
# shell check doesn't realize there were set in variables.sh so we have to reset them here.
wOK="${wOK}"
wWARNING="${wWARNING}"
wERROR="${wERROR}"
wDEBUG="${wDEBUG}"
wYELLOW="${wYELLOW}"
wNC="${wNC}"
wBOLD="${wBOLD}"
wNBOLD="${wNBOLD}"
wBR="${wBR}"

function usage_and_exit()
{
	RET=${1}
	if [ ${RET} -eq 0 ]; then
		C="${wYELLOW}"
	else
		C="${wERROR}"
	fi
	echo -e "${C}Usage: ${ME} [--help] [--debug] [--silent] [--config file] key new_value [...]${wNC}" >&2
	echo "There must be a multiple of 2 arguments." >&2
	exit ${RET}
}
# Check arguments
OK="true"
HELP="false"
DEBUG="false"
SILENT="false"
CONFIG_FILE=""
while [ $# -gt 0 ]; do
	ARG="${1}"
	case "${ARG}" in
		--help)
			HELP="true"
			;;
		--debug)
			DEBUG="true"
			;;
		--silent)
			SILENT="true"
			;;
		--config)
			CONFIG_FILE="${2}"
			if [[ ${CONFIG_FILE} == "" ]]; then
				OK="false"
			else
				shift	# skip over CONFIG_FILE
			fi
			;;
		-*)
			echo -e "${wERROR}ERROR: Unknown argument: '${ARG}'${wNC}" >&2
			OK="false"
			;;
		*)
			break
			;;
	esac
	shift
done

[[ ${HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" ]] && usage_and_exit 1
[[ $# -eq 0 ]] && usage_and_exit 1
[[ $(($# % 2)) -ne 0 ]] && usage_and_exit 2

if [[ ${CONFIG_FILE} != "" ]]; then
	if [[ ! -f "${CONFIG_FILE}" ]]; then
		echo -e "${wERROR}ERROR: Configuration file not found: '${CONFIG_FILE}'.${wNC}" >&2
		exit 1
	fi
else
	# Look for the configuration file.
	CONFIG_FILE="${ALLSKY_WEBSITE}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}"	# local website
	if [ ! -f "${CONFIG_FILE}" ]; then
		CONFIG_FILE="${ALLSKY_CONFIG}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}"	# remote website
		if [ ! -f "${CONFIG_FILE}" ]; then
			# Can't find the configuration file on the Pi or for remote.
			echo -e "${wWARNING}WARNING: No configuration file found.${wNC}" >&2
			exit 99
		fi
	fi
fi

FIELD_Q='"'		# JSON files have quotes around field names and strings

JQ_STRING=(.comment = .comment)
OUTPUT_MESSAGE=""
NUMRE="^[+-]?[0-9]+([.][0-9]+)?$"

while [ $# -gt 0 ]; do
	FIELD="${1}"
	NEW_VALUE="${2}"
	# Convert HTML code for apostrophy back to character.
	apos="&#x27"
	NEW_VALUE="${NEW_VALUE/${apos}/\'}"
	NEW="${NEW_VALUE}"
	NEW_VALUE="${NEW_VALUE//\"/\\\"}"	# Handle double quotes

	[ "${DEBUG}" = "true" ] && echo -e "${wDEBUG}DEBUG: update '${FIELD}' to [${NEW_VALUE}].${wNC}"

	# Only put quotes around ${NEW_VALUE} if it's a string,
	# i.e., not a number or a special name.
	if  [[ ! (${NEW_VALUE} =~ ${NUMRE}) && ${NEW_VALUE} != "true" && ${NEW_VALUE} != "false" && ${NEW_VALUE} != "null" ]]; then
		Q='"'
		NEW_VALUE="${Q}${NEW_VALUE}${Q}"
	fi
	JQ_STRING+=( "| .${FIELD} = ${NEW_VALUE}" )

	shift 2

	OUTPUT_MESSAGE="${OUTPUT_MESSAGE}'${FIELD}' updated to ${wBOLD}${NEW}${wNBOLD}."
	[ $# -gt 0 ] && OUTPUT_MESSAGE="${OUTPUT_MESSAGE}${wBR}"
done


if [[ ${DEBUG} == "true" ]]; then
	echo -e "${wDEBUG}DEBUG: not running:"
	# shellcheck disable=SC2145
	echo -e "  jq '${JQ_STRING[@]}' ${CONFIG_FILE}${wNC}"
else
	# shellcheck disable=SC2145
	S="${JQ_STRING[@]}"
	if OUTPUT="$(jq "${S}" "${CONFIG_FILE}" 2>&1 > /tmp/x && mv /tmp/x "${CONFIG_FILE}")"; then
		[ "${SILENT}" = "false" ] && echo -e "${wOK}${OUTPUT_MESSAGE}${wNC}"
	else
		echo -e "${wERROR}ERROR: unable to update data in '${CONFIG_FILE}':${wNC}" >&2
		echo "   ${OUTPUT}" >&2
	fi
fi
