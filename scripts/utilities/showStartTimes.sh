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
	exec >&2
	echo
	local USAGE="Usage: ${ME} [--help]"
	if [[ ${RET} -ne 0 ]]; then
		E_ "${USAGE}"
	else
		echo -e "${USAGE}"
	fi

	echo
	W_ "Usage:"
	W_ "    ${ME}  ${ME_F} [--help] [--zero] [--no-header] [angle [latitude [longitude]]]"
	echo "OR"
	W_ "    ${ME}  ${ME_F} [--help] [--zero] [--no-header] [--angle A] [--latitude LAT] [--longitude LONG]"
	echo
	echo "Where:"
	echo "   --help              Displays this message and exits."
	echo "   --zero              Also displays information for an angle of 0."
	echo "   --no-header         Only displays the data, no header."
	echo "   angle"               
	echo "      OR"
	echo "   --angle A           Specifies the Angle to use."
	echo "   latitude"               
	echo "      OR"
	echo "   --latitude LAT      Specifies the Latitude to use."
	echo "   longitude"               
	echo "      OR"
	echo "   --longitude LONG    Specifies the Longitude to use."

	echo
	echo "Show the daytime and nighttime start times for the specified"
	echo "angle, latitude, and longitude."
	echo "If you don't specify those values, your current values are used."
	echo
	echo "This information is useful to determine what to put in the 'Angle' setting in the WebUI."
	echo "Typically you would adjust the angle until you got the start time you wanted."
	echo
	echo "This is also useful to troubleshoot why the daytime and nighttime start times"
	echo "aren't what you expected."
	echo

	exit "${RET}"
}

OK="true"
DO_HELP="false"
HEADER=""
ZERO=""
ANGLE=""
LATITUDE=""
LONGITUDE=""

while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
		--help)
			DO_HELP="true"
			;;
		--zero)
			ZERO="${ARG}"
			;;

		--no-header)
			HEADER="${ARG}"
			;;

		--angle)
			ANGLE="${2}"
			shift
			;;

		--latitude)
			LATITUDE="${2}"
			shift
			;;

		--longitude)
			LONGITUDE="${2}"
			shift
			;;

		--)
			break	# End of arguments
			;;
		--*)
			E_ "${ME}: Unknown argument '${ARG}'." >&2
			OK="false"
			;;

		*)
			break	# Assume it's the Angle
			;;
	esac
	shift
done
[[ ${DO_HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" ]] && exit 1


if [[ $# -gt 0 ]]; then
	ANGLE="$1"
	shift
	if [[ $# -gt 0 ]]; then
		LATITUDE="$1"
		shift
		if [[ $# -gt 0 ]]; then
			LONGITUDE="$1"
			shift
		fi
	fi
fi

#shellcheck disable=SC2086
get_sunrise_sunset ${HEADER} ${ZERO} "${ANGLE}" "${LATITUDE}" "${LONGITUDE}"
