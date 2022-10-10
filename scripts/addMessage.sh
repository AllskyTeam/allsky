#!/bin/bash

# Add a message to the WebUI message box.

ME="$(basename "${BASH_ARGV0}")"

# Allow this script to be executed manually, which requires several variables to be set.
if [ -z "${ALLSKY_HOME}" ] ; then
	ALLSKY_HOME="$(realpath "$(dirname "${BASH_ARGV0}")/..")"
	export ALLSKY_HOME
fi
# shellcheck disable=SC1090
source "${ALLSKY_HOME}/variables.sh"

if [ $# -ne 2 ]; then
	# shellcheck disable=SC2154
	echo -e "${wERROR}Usage: ${ME} message_type message${wNC}" >&2
	exit 1
fi
TYPE="${1}"
if [[ ${TYPE} == "error" ]];
	$TYPE="danger"
elif [[ ${TYPE} == "debug" ]];
	$TYPE="warning"
fi
MESSAGE="${1}"

(
	echo -e "<span class='alert-${TYPE}'>${MESSAGE}</span>"
) >> "${ALLSKY_MESSAGES}"
