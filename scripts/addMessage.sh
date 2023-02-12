#!/bin/bash

# Add a message to the WebUI message box.

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

# The classes are all lower case, so convert.
TYPE="${1,,}"
if [[ ${TYPE} == "error" ]]; then
	TYPE="danger"
elif [[ ${TYPE} == "debug" ]]; then
	TYPE="warning"
fi
MESSAGE="${2}"

echo -e "${TYPE}\t${MESSAGE}"  >>  "${ALLSKY_MESSAGES}"
