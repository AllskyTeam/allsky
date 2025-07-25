#!/bin/bash

[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$(dirname "${BASH_ARGV0}")/../.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"					|| exit "${EXIT_ERROR_STOP}"

if [[ ${1} != "" ]]; then
	NEW_DEBUG="${1}"
else
	NEW_DEBUG=3
fi
OLD_DEBUG=$( settings ".debuglevel" )

stop_Allsky
sudo truncate -s 0 "${ALLSKY_LOG}"
sudo truncate -s 0 "${ALLSKY_PERIODIC_LOG}"

MSG="\nAllsky restarted with empty log files"
if [[ ${OLD_DEBUG} -lt ${NEW_DEBUG} ]]; then
	update_json_file ".debuglevel"  "${NEW_DEBUG}"  "${SETTINGS_FILE}"  "number"
	MSG=" and Debug Level of ${NEW_DEBUG}."
	MSG+="\nWhen done troubleshooting, set the Debug Level back to ${OLD_DEBUG}."
else
	MSG+="."
fi
start_Allsky

echo -e "${MSG}"
