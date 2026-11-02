#!/bin/bash

# This scripts outputs the list of cameras Allsky supports.

# Allow this script to be executed manually, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/../.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"		|| exit "${ALLSKY_EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"		|| exit "${ALLSKY_EXIT_ERROR_STOP}"

OK="true"
DO_HELP="false"
HTML="false"
DO_ZWO="false"
DO_RPI="false"
ZWO_FILE="${ALLSKY_HOME}/src/lib/armv7/libASICamera2.a"
while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
		--help)
			DO_HELP="true"
			;;
		--html)
			HTML="true"
			;;
		--rpi)
			DO_RPI="true"
			;;
		--zwo)
			DO_ZWO="true"
			;;
		--zwo-file)
			ZWO_FILE="${2}"
			if [[ ! -f ${ZWO_FILE} ]]; then
				wE_ "File '${ZWO_FILE}' not found." >&2
				OK="false"
			fi
			;;
		-*)
			wE_ "Unknown argument '${ARG}'." >&2
			OK="false"
			;;
	esac
	shift
done

usage_and_exit()
{
	local RET=${1}
	exec 2>&1
	echo
	local USAGE="Usage: ${ME} [--help] [--zwo-file f] --rpi | --zwo"
	if [[ ${RET} -ne 0 ]]; then
		E_ "${USAGE}"
		[[ ${HTML} == "true" ]] && RET="${ALLSKY_EXIT_ERROR_STOP}"
	else
		echo -e "${USAGE}"
	fi
	echo "where:"
	echo "    '--help' displays this message and exits."
	echo "    '--zwo-file f' looks in this file for list of supported ZWO cameras."
	echo "    '--rpi' displays a list of supported Raspberry Pi and compatible cameras."
	echo "    '--zwo' displays a list of supported ZWO cameras."
	echo
	echo "Display all the cameras of the specified type that Allsky supports."
	echo "Note that the ZWO list is very long."

	exit "${RET}"
}

[[ ${DO_HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" ]] && usage_and_exit 1
if [[ ${DO_RPI} == "false" && ${DO_ZWO} == "false" ]]; then
	wE_  "You must specify --rpi and/or --zwo" >&2
	usage_and_exit 2
fi


if [[ ${DO_RPI} == "true" ]]; then
	if [[ -f ${ALLSKY_RPi_CAMERA_INFO} ]]; then

		echo -e "===== Supported RPi cameras:\n"

		# Format of input file:

		#	sensor  compare_length  model  other_info_for_camera_1
		#	sensor  compare_length  model  other_info_for_camera_2
		#	...
		gawk -F'\t' '
			BEGIN {
				printf("%-25s Sensor\n", "Camera Name");
				printf("%-25s-------\n", "--------------------------");
			}
			{
				if (substr($1, 1, 1) == "#")
					next;
	
				sensor = $1;
				compare_length = $2
				model = $3;
				if (compare_length > 0)
					other = " and related sensors";
				else
					other = "";
				printf("%-25s %s%s\n", model, sensor, other);
			}' "${ALLSKY_RPi_CAMERA_INFO}"

	else
		# Write to stdout since they may not be an error, e.g., Allsky not installed yet.
		echo "RPi information file '${ALLSKY_RPi_CAMERA_INFO}' not installed."
	fi
fi

if [[ ${DO_ZWO} == "true" ]]; then
	echo -e "\n===== Supported ZWO cameras:\n"

	# Any of the libraries should work.
	strings "${ZWO_FILE}" |
		grep '_SetResolutionEv$' | \
		sed -e 's/^.*CameraS//' -e 's/17Cam//' -e 's/_SetResolutionEv//' | \
		sort -u
fi

exit 0
