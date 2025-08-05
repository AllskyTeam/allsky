#!/bin/bash

echo
echo "THIS SCRIPT IS A WORK IN PROGRESS.  IT CURRENTLY ISN'T USEFUL."
echo

[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$(dirname "${BASH_ARGV0}")/../.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"					|| exit "${EXIT_ERROR_STOP}"

usage_and_exit()
{
	local RET=${1}
	exec >&2
	echo
	local USAGE="Usage: ${ME} [--help] [--thresholds '1 2 3']"
	if [[ ${RET} -ne 0 ]]; then
		E_ "${USAGE}"
	else
		echo -e "${USAGE}"
	fi

	echo "Arguments:"
	echo "   --help                  Displays this message and exits."
	echo "   --thresholds '1 2 3'    Use the specified Brightness Thresholds.  Must quote the numbers."
	echo "                           If not specified, '${THRESHOLDS}' are used."

	echo
	echo "Creates multiple startrails files using different 'Brightness Threshold' values."
	echo "This is useful when startrails images don't show any trails and you need"
	echo "to determine what 'Brightness Threshold' to use."
	echo

	exit "${RET}"
}

OK="true"
DO_HELP="false"
THRESHOLDS="0.10 0.15 0.20 0.25 0.30 0.35 0.40 0.45 0.50"
while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
		--help)
			DO_HELP="true"
			;;
		-*)
			E_ "Unknown argument '${ARG}'." >&2
			OK="false"
			;;
	esac
	shift
done
[[ ${DO_HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" ]] && usage_and_exit 1

for i in ${THRESHOLDS}
do
	echo
	"${ALLSKY_BIN}/startrails" \
		--directory /home/images/tjohnson1970 \
		--extension jpg \
		--output /home/pi/tjohnson1970/$i.jpg \
		--brightness $i
done
