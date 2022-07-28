#!/bin/bash

# Update the specified Allsky Website configuration file; it will either be .json or .js.

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
	echo -e "${C}Usage: ${ME} [--help] [--debug] [--silent] [--config file] key old_value new_value [...]${wNC}" >&2
	echo "There must be a multiple of 3 arguments." >&2
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
[[ $(($# % 3)) -ne 0 ]] && usage_and_exit 2

if [[ ${CONFIG_FILE} != "" ]]; then
	if [[ ! -f "${CONFIG_FILE}" ]]; then
		echo -e "${wERROR}ERROR: Configuration file not found: '${CONFIG_FILE}'.${wNC}" >&2
		exit 1
	fi
else
	# Look for the configuration file.
	CONFIG_FILE="${ALLSKY_WEBSITE}/configuration.json"		# local website
	if [ ! -f "${CONFIG_FILE}" ]; then
		CONFIG_FILE="${ALLSKY_CONFIG}/configuration.json"	# remote website
		if [ ! -f "${CONFIG_FILE}" ]; then
			# OLD .js name - leave for compatibility for a while
			CONFIG_FILE="${WEBSITE_DIR}/config.js"			# local website, old name
			if [ ! -f "${CONFIG_FILE}" ]; then
				# Can't find the configuration file on the Pi or for remote.
				echo -e "${wWARNING}WARNING: No configuration file found.${wNC}" >&2
				exit 99
			fi
		fi
	fi
fi
EXTENSION="${CONFIG_FILE##*.}"
if [[ ${EXTENSION} == "json" ]]; then
	Q='"'		# JSON files have quotes around field names
else
	Q=''		# .js
fi

SED_STRING=()
OUTPUT_MESSAGE=""
while [ $# -gt 0 ]; do
	FIELD="${1}"
	OLD_VALUE="${2}"
	# Convert HTML code for apostrophy back to character.
	apos="&#x27"
	NEW_VALUE="${3/${apos}/\'}"
	NEW="${NEW_VALUE}"

	[ "${DEBUG}" = "true" ] && echo -e "${wDEBUG}DEBUG: update '${FIELD}' to [${NEW_VALUE}].${wNC}"

	# TODO: Use a true JSON program so it'll handle fields within other fields,
	# TODO: and we don't have to worry about whether or not the ":" has whitespace before or after it,
	# TODO: or if there's a trailing comma.
	if [ -n "${OLD_VALUE}" ]; then
		# If ${OLD_VALUE} is set, only update its value, not the whole line.
		SED_STRING+=(-e "/[ \t]*${Q}${FIELD}${Q}[ \t]*/ s;${OLD_VALUE};${NEW_VALUE};")
	else
		# Only put quotes around ${NEW_VALUE} if it's a string,
		# i.e., not a number or a special name, or is blank.
		if [[ ${NEW_VALUE} == "" || (-n ${NEW_VALUE##?([+-])+([0-9.])} && ${NEW_VALUE} != "true" && ${NEW_VALUE} != "false" && ${NEW_VALUE} != "null") ]]; then
			NEW_VALUE="${Q}${NEW_VALUE}${Q}"
		fi
		# Only replace the value, which we consider anything after the ":"
# TODO: BUG: This also replaces anything after the value.
		SED_STRING+=(-e "/[ \t]*${Q}${FIELD}${Q}[ \t]*:/    s;:[ \t].*;: ${NEW_VALUE},;")
	fi
	shift 3

	OUTPUT_MESSAGE="${OUTPUT_MESSAGE}'${FIELD}' updated to ${wBOLD}${NEW}${wNBOLD}."
	[ $# -gt 0 ] && OUTPUT_MESSAGE="${OUTPUT_MESSAGE}${wBR}"
done

if [[ ${DEBUG} == "true" ]]; then
	echo -e "${wDEBUG}DEBUG: not running:"
	# shellcheck disable=SC2145
	echo -e "  sed -i ${SED_STRING[@]} ${CONFIG_FILE}${wNC}"
else
	# shellcheck disable=SC2145
	if OUTPUT="$(sed -i "${SED_STRING[@]}" "${CONFIG_FILE}" 2>&1)"; then
		[ "${SILENT}" = "false" ] && echo -e "${wOK}${OUTPUT_MESSAGE}${wNC}"
	else
		echo -e "${wERROR}ERROR: unable to update data in '${CONFIG_FILE}':${wNC}" >&2
		echo "   ${OUTPUT}" >&2
	fi
fi
