#!/bin/bash

# Add a message to the WebUI message box, including the time and a count.
# If the message is already there, just update the time and count.

# Allow this script to be executed manually, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck disable=SC1091 source=variables.sh
source "${ALLSKY_HOME}/variables.sh"					|| exit "${EXIT_ERROR_STOP}"

if [ $# -lt 2 ]; then
	# shellcheck disable=SC2154
	{
		echo -e "${wERROR}"
		echo    "Usage: ${ME}  message_type  message  [url]"
		echo -e "${wNC}"
		echo    "\n'message_type' is 'success', 'warning', 'error', 'info', or 'debug'."
		echo    "\n'url' is a URL to (normally) a documentation page."
	} >&2
	exit 1
fi

# The CSS classes are all lower case, so convert.
# Our "error" and "debug" message types have a different CSS class name, so map them.
TYPE="${1,,}"
if [[ ${TYPE} == "error" ]]; then
	TYPE="danger"
elif [[ ${TYPE} == "debug" ]]; then
	TYPE="warning"
elif [[ ${TYPE} != "warning" && ${TYPE} != "info" && ${TYPE} != "success" ]]; then
	echo -e "${wWARNING}Warning: unknown message type: '${TYPE}'. Using 'info'.${wNC}" >&2
	TYPE="info"
fi
MESSAGE="${2}"
URL="${3}"
DATE="$( date '+%B %d, %r' )"

# The file is tab-separated:    type  date  count  message  url
TAB="$( echo -e "\t" )"

# Convert newlines to HTML breaks.
MESSAGE="$( echo -en "${MESSAGE}" |
	awk 'BEGIN { l=0; } { if (++l > 1) printf("<br>"); printf("%s", $0); }' )"
MESSAGE="${MESSAGE//  /\&nbsp;\&nbsp;}"

# Messages may have "/" in them so we can't use that to search in sed,
# so use "%" instead, but because it could be in a message (although unlikely),
# convert all "%" to the ASCII code.
# The pound sign in escaped only to make gvim look nicer.
MESSAGE="${MESSAGE//%/\&\#37;}"

# If ${MESSAGE} contains "*" it hoses up the grep and sed regular expression, so escape it.
ESCAPED_MESSAGE="${MESSAGE//\*/\\*}"


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

echo -e "${TYPE}${TAB}${DATE}${TAB}${COUNT}${TAB}${MESSAGE}${TAB}${URL}"  >>  "${ALLSKY_MESSAGES}"
