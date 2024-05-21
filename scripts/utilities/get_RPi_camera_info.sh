#!/bin/bash

# This script gets information on any attached RPi camera(s),
# primarily to be used when requesting support for a new camera.

# Allow this script to be executed manually, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"		|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"		|| exit "${EXIT_ERROR_STOP}"

OK="true"
DO_HELP="false"
CAMERA_NUMBER=0
while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
		--help)
			DO_HELP="true"
			;;
		--camera)
			CAMERA_NUMBER="$2"
			shift
			;;
		-*)
			echo -e "${RED}Unknown argument '${ARG}'.${NC}" >&2
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
	echo "Usage: ${ME} [--help] [-camera NUM]"
	[[ ${RET} -ne 0 ]] && echo -en "${NC}"
	echo "    where:"
	echo "      '--help' displays this message and exits."
	echo "      '--camera NUM' use camera number NUM."
	exit "${RET}"
}

[[ ${DO_HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" ]] && usage_and_exit 1

export LIBCAMERA_LOG_LEVELS=ERROR,FATAL
CAMERA_DATA="${ALLSKY_TMP}/camera_data.txt"
{
	echo -e "===== libcamera-still --list-cameras"
	libcamera-still --list-cameras
} > "${CAMERA_DATA}" 2>&1
SENSOR="$( grep "${CAMERA_NUMBER} :" "${CAMERA_DATA}" | gawk '{ print $3; }' )"

# Determine if this sensor is supported.
MODEL="$( get_model_from_sensor "${SENSOR}" )"
if grep --silent "^camera.*${MODEL}" "${RPi_SUPPORTED_CAMERAS}" ; then
	SUPPORTED="true"
else
	SUPPORTED="false"
fi

{
	echo -e "\n===== libcamera-still"
	# Do not use --immediate 1 since it causes the max Exposure time to be 0.
	libcamera-still --camera "${CAMERA_NUMBER}"  -v --metadata - --immediate 0 --nopreview \
		--thumb none --timeout 1 --shutter 1 --output /dev/null
} >> "${CAMERA_DATA}" 2>&1


# Example output:
#	ExposureTime : [114..674191602]
#	FrameDurationLimits : [100000..694434742]
MAX_EXPOSURE="$( grep -E "ExposureTime :|FrameDurationLimits :" "${CAMERA_DATA}" |
	tail -2 | sed -e 's/://' -e 's/\.\./ /' -e 's/]//' |
	gawk '
		BEGIN { et = 0; fdl = 0; }
		{
			if ($1 == "ExposureTime") {
				et = $3;
			} else if ($1 == "FrameDurationLimits") {
				fdl = $3;
			}
		}
		END {
			if (et == 0 && fdl == 0) {
				exit 1;
			}
			if (et == 0 || et > fdl)
				num = et;
			else
				num = fdl;
			printf("%.1f\n", num / 1000000);
			exit(0);
		}'
)"
RET=$?

echo
if [[ ${RET} -eq 0 ]]; then
	if [[ ${SUPPORTED} == "true" ]] ; then
		echo "Camera model ${MODEL}, sensor ${SENSOR} is already supported by Allsky."
		echo "Information about the features supported by the camera is in:"
		echo "    ${CAMERA_DATA}"
	else
		echo "Maximum exposure time for sensor '${SENSOR}' is ${MAX_EXPOSURE} seconds."
		if gawk -v E="${MAX_EXPOSURE}" 'BEGIN { if (E >= 60) exit 0; else exit 1; }' ; then
			echo ">>> This will make a good allsky camera. <<<"
		else
			echo ">>> This is a short maximum exposure so may not make a good allsky camera. <<<"
		fi

		echo
		echo "************************"
		echo "When requesting support for this camera, please attach"
		echo "    ${CAMERA_DATA}"
		echo "to your request."
		echo    "************************"
	fi
else
	echo "ERROR: Unable to determine maximum exposure time for camera ${MODEL} ${SENSOR}." >&2
fi
echo

exit "${RET}"
