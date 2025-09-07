#!/bin/bash

# Add a message to the WebUI message box, including the time and a count.
# If the message is already there, just update the time and count.

# Allow this script to be executed manually, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck disable=SC1091 source=variables.sh
source "${ALLSKY_HOME}/variables.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"					|| exit "${EXIT_ERROR_STOP}"

ARGS=$*

# The file is tab-separated:    type  date  count  message  url
TAB="$( echo -e "\t" )"

function convert_string()
{
	local STRING="${1}"

	# Convert newlines to HTML breaks.
	STRING="$( echo -en "${STRING}" |
		gawk 'BEGIN { l=0; } { if (++l > 1) printf("<br>"); printf("%s", $0); }' )"

	# Make 2 spaces in a row viewable in HTML.
	STRING="${STRING//  /\&nbsp;\&nbsp;}"

	# Convert tabs to spaces because we use tabs as field separators.
	# Tabs in the input can either be an actual tab or \t
	STRING="${STRING//${TAB}/\&nbsp;\&nbsp;\&nbsp;\&nbsp;}"
	STRING="${STRING//\\t/\&nbsp;\&nbsp;\&nbsp;\&nbsp;}"

	# Messages may have "/" in them so we can't use that to search in sed,
	# so use "%" instead, but because it could be in a message (although unlikely),
	# convert all "%" to the ASCII code.
	# The pound sign in escaped only to make gvim look nicer.
	echo "${STRING//%/\&\#37;}"
}

usage_and_exit()
{
	local RET=${1}

	local MSG
	exec >&2
	echo
	MSG="Usage: ${ME} [--id ID [--cmd c]] [--delete] [--no-date] [--url u] --type t --msg m"
	if [[ ${RET} -eq 0 ]]; then
		echo -e "${MSG}"
	else
		wE_ "${MSG}"
	fi
	echo
	echo "where:"
	echo "  --cmd c      displays 'c' as a link in the WebUI."
	echo "  --delete     if specified, only '--id ID' is required."
	echo "  --no-date    does not add the current date to the message."
	echo "  --url u      'u' is a URL to (normally) a documentation page."
	echo "  --type t     't' is 'success', 'warning', 'error', 'info', or 'debug'."
	echo
	exit "${RET}"
}

ADD_DATE="true"
OK="true"
DO_HELP="false"
ID=""
DELETE="false"
CMD_TEXT=""
TYPE=""
MESSAGE=""
ESCAPED_MESSAGE=""
URL=""
MSG_SPECIFIED="false"
while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
		"--help")
			DO_HELP="true"
			;;
		"--id")
			ID="${2}"
			shift
			;;
		"--delete")
			DELETE="true"
			shift
			;;
		"--no-date")
			ADD_DATE="false"
			;;
		"--cmd")
			CMD_TEXT="$( convert_string "${2}" )"
			shift
			;;
		"--type")
			TYPE="${2,,}"
			shift
			;;
		"--msg")
			MSG_SPECIFIED="true"
			MESSAGE="$( convert_string "${2}" )"
			# If ${MESSAGE} contains "*" or "[" it hoses up the grep and sed regular expression,
			# so escape them.
			ESCAPED_MESSAGE="${MESSAGE//\*/\\*}"
			ESCAPED_MESSAGE="${ESCAPED_MESSAGE//\[/\\[}"
			shift
			;;
		"--url")
			URL="${2}"
			shift
			;;
		-*)
			wE_ "Unknown argument '${ARG}'." >&2
			OK="false"
			;;
		*)
			break
			;;
	esac
	shift
done

[[ ${DO_HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" ]] && usage_and_exit 1
if [[ ${DELETE} == "false" && (-z ${TYPE} || -z ${MESSAGE}) ]]; then
	[[ -z ${TYPE} ]] && wE_ "--type not specified" >&2
	[[ ${MSG_SPECIFIED} == "false" ]] && wE_ "--msg not specified" >&2
	[[ -z ${MESSAGE} ]] && wE_ "Empty message" >&2
	echo "Command line: ${ARGS}" >&2
	usage_and_exit 1
fi

if [[ ${DELETE} == "true" ]]; then
	[[ ! -f ${ALLSKY_MESSAGES} ]] && exit 0
	if [[ -z ${ID} ]]; then
		wE_ "${ME}: ERROR: delete specified but no message id given." >&2
		exit 1
	fi

	REST="$( grep -v "^${ID}${TAB}" "${ALLSKY_MESSAGES}" )"
	if [[ -z ${REST} ]]; then
		rm -f "${ALLSKY_MESSAGES}"		# was only message
	else
		echo -e "${REST}" > "${ALLSKY_MESSAGES}"
	fi
	exit 0
fi

# The CSS classes are all lower case, so convert.
# Our "error" and "debug" message types have a different CSS class name, so map them.
if [[ ${TYPE} == "error" ]]; then
	TYPE="danger"
elif [[ ${TYPE} == "debug" ]]; then
	TYPE="warning"
elif [[ ${TYPE} == "no-image" ]]; then
	TYPE="success"
elif [[ ${TYPE} != "warning" && ${TYPE} != "info" && ${TYPE} != "success" ]]; then
	wE_ "ERROR: unknown message type: '${TYPE}'." >&2
	echo "Valid message types are:  error, debug, warning, info, success, no-image." >&2
	exit 2
fi

if [[ ${ADD_DATE} == "true" ]]; then
	DATE="$( date '+%B %d, %r' )"
else
	DATE=""
fi

if [[ -f ${ALLSKY_MESSAGES} ]] &&  M="$( grep "${TAB}${ESCAPED_MESSAGE}${TAB}" "${ALLSKY_MESSAGES}" )" ; then
	COUNT=0
	# tail -1  in case file is corrupt and has more than one line we want.
	PRIOR_COUNT=$( echo -e "${M}" | cut -f5 -d"${TAB}" | tail -1 )

	# If this entry is corrupted don't try to update the counter.
	[[ ${PRIOR_COUNT} != "" ]] && ((COUNT = PRIOR_COUNT + 1))

	# TODO: prior messages can have any character in them so what do we
	# use to separate the sed components?
	# Delete the existing entry.  A new one with a higher COUNT will be added below.
	EXPRESSION="\%${TAB}${ESCAPED_MESSAGE}${TAB}%d"
	if ! sed -i -e "${EXPRESSION}"  "${ALLSKY_MESSAGES}" ; then
		wW_ "${ME}: Warning, sed -e '${EXPRESSION}' failed." >&2
		exit 1
	fi
else
	COUNT=1
fi

#          1          2                3            4            5             6               7
echo -e "${ID}${TAB}${CMD_TEXT}${TAB}${TYPE}${TAB}${DATE}${TAB}${COUNT}${TAB}${MESSAGE}${TAB}${URL}"  >>  "${ALLSKY_MESSAGES}"
