#!/bin/bash

# Add a message to the WebUI message box, including the time and a count.
# If the message is already there, just update the time and count.

# Allow this script to be executed manually, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck disable=SC1091 source=variables.sh
source "${ALLSKY_HOME}/variables.sh"					|| exit "${EXIT_ERROR_STOP}"

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
	exec >&2
	echo
	[[ ${RET} -ne 0 ]] && echo -en "${wERROR}"
	echo "Usage: ${ME} [--id ID [--cmd TEXT]] [--delete] [--url url]  --type message_type  --msg message"
	[[ ${RET} -ne 0 ]] && echo -en "${wNC}"
	echo
	echo "'message_type' is 'success', 'warning', 'error', 'info', or 'debug'."
	echo "'url' is a URL to (normally) a documentation page."
	echo
	exit "${RET}"
}

OK="true"
DO_HELP="false"
ID=""
CMD_TEXT=""
TYPE=""
MESSAGE=""
ESCAPED_MESSAGE=""
URL=""
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
		"--cmd")
			CMD_TEXT="$( convert_string "${2}" )"
			shift
			;;
		"--type")
			TYPE="${2,,}"
			shift
			;;
		"--msg")
			MESSAGE="$( convert_string "${2}" )"
			# If ${MESSAGE} contains "*" it hoses up the grep and sed regular expression,
			# so escape it.
			ESCAPED_MESSAGE="${MESSAGE//\*/\\*}"
			shift
			;;
		"--url")
			URL="${2}"
			shift
			;;
		-*)
			echo -e "${wERROR}Unknown argument '${ARG}' ignoring.${wNC}" >&2
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
[[ -z ${TYPE} || -z ${MESSAGE} ]] && usage_and_exit 1

if [[ ${DELETE} == "true" ]]; then
	[[ ! -f ${ALLSKY_MESSAGES} ]] && exit 0
	if [[ -z ${ID} ]]; then
		echo "${ME}: ERROR: delete specified but no message id given." >&2
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
	echo -e "${wERROR}ERROR: unknown message type: '${TYPE}'.${wNC}" >&2
	echo 2
fi
DATE="$( date '+%B %d, %r' )"

if [[ -f ${ALLSKY_MESSAGES} ]] &&  M="$( grep "${TAB}${ESCAPED_MESSAGE}${TAB}" "${ALLSKY_MESSAGES}" )" ; then
	COUNT=0
	# tail -1  in case file is corrupt and has more than one line we want.
	PRIOR_COUNT=$( echo -e "${M}" | cut -f3 -d"${TAB}" | tail -1 )

	# If this entry is corrupted don't try to update the counter.
	[[ ${PRIOR_COUNT} != "" ]] && ((COUNT = PRIOR_COUNT + 1))

	# TODO: prior messages can have any character in them so what do we
	# use to separate the sed components?
	EXPRESSION="\%${TAB}${ESCAPED_MESSAGE}${TAB}$%d"
	if ! sed -i -e "${EXPRESSION}"  "${ALLSKY_MESSAGES}" ; then
		echo "${ME}: Warning, sed -e '${EXPRESSION}' failed." >&2
	fi
else
	COUNT=1
fi

echo -e "${ID}${TAB}${CMD_TEXT}${TAB}${TYPE}${TAB}${DATE}${TAB}${COUNT}${TAB}${MESSAGE}${TAB}${URL}"  >>  "${ALLSKY_MESSAGES}"
