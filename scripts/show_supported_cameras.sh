#!/bin/bash

# This scripts outputs the list of cameras Allsky supports.

# Allow this script to be executed manually, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"		|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"		|| exit "${EXIT_ERROR_STOP}"

OK="true"
DO_HELP="false"
DO_ZWO="false"
DO_RPI="false"
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
		-*)
			echo -e "${RED}Unknown argument '${ARG}' ignoring.${NC}" >&2
			OK="false"
			;;
	esac
	shift
done

usage_and_exit()
{
	local RET=${1}
	echo
	[[ ${RET} -ne 0 ]] && echo -en "${RED}"
	echo "Usage: ${ME} [--help] --rpi | --zwo"
	[[ ${RET} -ne 0 ]] && echo -en "${NC}"
	echo "    where:"
	echo "      '--help' displays this message and exits."
	echo "      '--rpi' displays a list of supported Raspberry Pi and compatible cameras."
	echo "      '--zwo' displays a list of supported ZWO cameras."
	exit "${RET}"
}

[[ ${DO_HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" ]] && usage_and_exit 1
if [[ ${DO_RPI} == "false" && ${DO_ZWO} == "false" ]]; then
	echo -e "${RED}You must specify --rpi and/or --zwo${NC}"
	usage_and_exit 2
fi


if [[ ${DO_RPI} == "true" ]]; then
	[[ ${DO_ZWO} == "true" ]] && echo -e "===== Supported RPi cameras:"
	# Format of input file:
	#	camera_info_line_1
	#	libcamera_camera_capability_line_1
	#	libcamera_camera_capability_line_2
	#	End
	#	raspistill_camera_capability_line_1
	#	raspistill_camera_capability_line_2
	#	End
	#	camera_info_line_2
	#	...
	gawk -F'\t' 'BEGIN { on_camera_line=1; }
		{
			if (on_camera_line) {
				on_camera_line = 0;
				read_libcamera_lines = 0;
				print $3;
			} else if (! read_libcamera_lines) {
				if ($1 == "End")
					read_libcamera_lines = 1;
			} else if ($1 == "End") {
				on_camera_line = 1;
			}
		}' "${RPi_SUPPORTED_CAMERAS}"
fi

if [[ ${DO_ZWO} == "true" ]]; then
	[[ ${DO_RPI} == "true" ]] && echo -e "\n===== Supported ZWO cameras:"

	# Any of the libraries should work.
	strings "${ALLSKY_HOME}/src/lib/armv7/libASICamera2.a" |
		grep '_SetResolutionEv$' | \
		sed -e 's/^.*CameraS//' -e 's/17Cam//' -e 's/_SetResolutionEv//' | \
		sort -u
fi

exit 0
