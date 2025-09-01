#!/bin/bash

# This scripts outputs the list of cameras Allsky supports.

# Allow this script to be executed manually, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/../.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"		|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"		|| exit "${EXIT_ERROR_STOP}"

OK="true"
DO_HELP="false"
DO_ZWO="false"
DO_RPI="false"
ZWO_FILE="${ALLSKY_HOME}/src/lib/armv7/libASICamera2.a"
while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
		--help)
			DO_HELP="true"
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
				E_ "File '${ZWO_FILE}' not found." >&2
				OK="false"
			fi
			;;
		-*)
			E_ "Unknown argument '${ARG}'." >&2
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
	local MSG="Usage: ${ME} [--help] [--zwo-file f] --rpi | --zwo"
	if [[ ${RET} -ne 0 ]]; then
		E_ "${MSG}"
	else
		echo -e "${MSG}"
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
	E_  "You must specify --rpi and/or --zwo" >&2
	usage_and_exit 2
fi


if [[ ${DO_RPI} == "true" ]]; then
	echo -e "===== Supported RPi cameras:\n"

	# Format of input file:
	#	camera  sensor  compare_length  model  other_info_for_camera_1
	#	libcamera libcamera_camera_capability_line_1
	#	libcamera libcamera_camera_capability_line_2
	#	libcamera End
	#	camera  sensor  compare_length  model  other_info_for_camera_2
	#	...
	gawk -F'\t' '
		BEGIN {
			printf("%-25s Sensor\n", "Camera Name");
			printf("%-25s-------\n", "--------------------------");
		}
		{
			if ($1 == "camera") {
				sensor = $2;
				compare_length = $3
				model = $4;
				if (compare_length > 0)
					other = " and related sensors";
				else
					other = "";
				printf("%-25s %s%s\n", model, sensor, other);
			}
		}' "${ALLSKY_RPi_SUPPORTED_CAMERAS}"
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
