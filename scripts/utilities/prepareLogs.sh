#!/bin/bash

[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$(dirname "${BASH_ARGV0}")/../.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"					|| exit "${EXIT_ERROR_STOP}"

usage_and_exit()
{
	local RET=${1}
	exec 2>&1
	local USAGE="\n"
	USAGE+="Usage: ${ME} [--help] [--debug]  [debug_level]"
	if [[ ${RET} -ne 0 ]]; then
		E_ "${USAGE}"
	else
		echo -e "${USAGE}"
	fi
	echo
	echo "Arguments:"
	echo "   debug_level           Set the 'Debug Level' to this value."
	echo "If you don't specify 'debug_level' an appropriate one will be used."
	echo
	echo "Configure Allsky to collect the proper information for troubleshooting problems."
	echo "Allsky is stopped, the Debug Level set to the appropriate value if needed,"
	echo "the log files are truncated, and Allsky is restarted."
	echo "After the problem appears, see the 'Getting Help' page in the WebUI for details"
	echo "on how to report the problem."
	echo
	exit "${RET}"
}
function debug_()
{
	[[ ${DEBUG} != "true" ]] && return
	# shellcheck disable=SC2068
	echo -e ${@}
}

OK="true"
DO_HELP="false"
DEBUG="false"
while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
		--help)
			DO_HELP="true"
			;;
		--debug)
			DEBUG="true"
			;;
		-*)
			E_ "Unknown argument '${ARG}' ignoring." >&2
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

if [[ ${1} != "" ]]; then
	NEW_DEBUG="${1}"
else
	NEW_DEBUG=3
fi
OLD_DEBUG=$( settings ".debuglevel" )

debug_ "Stopping Allsky."
stop_Allsky
debug_ "Clearing out log files."
sudo truncate -s 0 "${ALLSKY_LOG}"
sudo truncate -s 0 "${ALLSKY_PERIODIC_LOG}"

MSG="\nAllsky restarted with empty log files"
if [[ ${OLD_DEBUG} -lt ${NEW_DEBUG} ]]; then
	update_json_file ".debuglevel"  "${NEW_DEBUG}"  "${ALLSKY_SETTINGS_FILE}"  "number"
	MSG+=" and Debug Level of ${NEW_DEBUG}."
	MSG+="\nWhen done troubleshooting, set the Debug Level back to ${OLD_DEBUG}."
else
	MSG+="."
fi
start_Allsky

echo -e "${MSG}"
