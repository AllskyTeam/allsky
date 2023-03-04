#!/bin/bash

# Add a message to the WebUI message box, including the time and a count.
# If the message is already there, just update the time and count.

ME="$(basename "${BASH_ARGV0}")"

# Allow this script to be executed manually, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$(realpath "$(dirname "${BASH_ARGV0}")/..")"
source "${ALLSKY_HOME}/variables.sh" || exit 99

if [ $# -ne 2 ]; then
	# shellcheck disable=SC2154
	echo -e "${wERROR}Usage: ${ME} message_type message${wNC}" >&2
	echo -e "\nWhere 'message_type' is one of 'error', 'warning', or 'debug'." >&2
	exit 1
fi

# The CSS classes are all lower case, so convert.
# Our "error" and "debug" message types have a different CSS class name, so map them.
TYPE="${1,,}"
if [[ ${TYPE} == "error" ]]; then
	TYPE="danger"
elif [[ ${TYPE} == "debug" ]]; then
	TYPE="warning"
fi
MESSAGE="${2}"
DATE="$(date '+%B %d, %r')"

# The file is tab-separated: type date count message
COUNT=0
TAB="$(echo -e "\t")"

# If ${MESSAGE} contains "*" it hoses up the grep and sed regular expression, so escape it.
ESCAPED_MESSAGE="$(echo "${MESSAGE}" | sed 's/*/\\*/g')"

if [[ -f ${ALLSKY_MESSAGES} ]] &&  M="$(grep "${TAB}${ESCAPED_MESSAGE}$" "${ALLSKY_MESSAGES}")" ; then
	# tail -1  in case file is corrupt and has more than one line we want.
	PRIOR_COUNT=$(echo -e "${M}" | cut -f3 -d"${TAB}" | tail -1)

	# If this entry is corrupted don't try to update the counter.
	[[ ${PRIOR_COUNT} != "" ]] && COUNT=$((PRIOR_COUNT + 1))

	sed -i -e "/${TAB}${ESCAPED_MESSAGE}$/d"  "${ALLSKY_MESSAGES}"
else
	COUNT=1
fi

echo -e "${TYPE}${TAB}${DATE}${TAB}${COUNT}${TAB}${MESSAGE}"  >>  "${ALLSKY_MESSAGES}"
