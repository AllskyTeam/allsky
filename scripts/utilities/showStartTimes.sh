#!/bin/bash

[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )" )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"					|| exit "${EXIT_ERROR_STOP}"

OK="true"
DO_HELP="false"
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
get_sunrise_sunset ${ZERO} "${ANGLE}" "${LATITUDE}" "${LONGITUDE}"
