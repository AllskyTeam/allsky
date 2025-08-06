#!/bin/bash

# This script gets information on any attached RPi camera(s),
# primarily to be used when requesting support for a new camera.

# Allow this script to be executed manually, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$(dirname "${BASH_ARGV0}")/../.." )"
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
			E_ "Unknown argument '${ARG}'." >&2
			OK="false"
			;;
	esac
	shift
done

usage_and_exit()
{
	local RET=${1}
	exec >&2
	echo
	local USAGE="Usage: ${ME} [--help] [--camera NUM]"
	if [[ ${RET} -ne 0 ]]; then
		E_ "${USAGE}"
	else
		echo -e "${USAGE}"
	fi
	echo "where:"
	echo "    --help         displays this message and exits."
	echo "    --camera NUM   use camera number NUM."
	echo

	W_ "NOTE: This command only works if you have an RPi camera connected to the Pi."
	echo
	echo "Saves detailed information on the attached RPi camera to a file."
	echo "This file MUST be attached to your GitHub Discussion requesting support for the camera."
	echo
	echo "If there is more than one RPi camera connected to the Pi,"
	echo "by default, information on the first camera (number 0) is displayed."
	echo "Use the '--camera NUM' argument to specify a different camera."

	exit "${RET}"
}

[[ ${DO_HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" ]] && usage_and_exit 1

CMD="$( determineCommandToUse "false" "" "false" )"		|| exit 1

export LIBCAMERA_LOG_LEVELS="ERROR,FATAL"
CAMERA_DATA="${ALLSKY_TMP}/camera_data.txt"
{
	echo -e "===== ${CMD} --list-cameras"
	"${CMD}" --list-cameras 2>&1
} > "${CAMERA_DATA}"

if [[ $( wc --lines < "${CAMERA_DATA}" ) -le 2 ]]; then
	echo "${ME}: No RPi cameras found!" >&2
	exit 1
fi


# CAMERA_DATA's format:
#	0 : imx477 [4056x3040] (/base/soc/i2c0mux/i2c@1/imx477@1a)
#	    Modes: 'SRGGB10_CSI2P' : 1332x990 
#	           'SRGGB12_CSI2P' : 2028x1080 2028x1520 4056x3040 

SENSOR="$( grep "${CAMERA_NUMBER} :" "${CAMERA_DATA}" | gawk '{ print $3; }' )"

# Determine if this sensor is supported.
MODEL="$( get_model_from_sensor "${SENSOR}" )"
if grep --silent "^camera.*${MODEL}" "${ALLSKY_RPi_SUPPORTED_CAMERAS}" ; then
	SUPPORTED="true"
else
	SUPPORTED="false"
fi

{
	echo -e "\n===== ${CMD}"
	# Do not use --immediate 1 since it causes the max Exposure time to be 0.
	"${CMD}" --camera "${CAMERA_NUMBER}"  -v --metadata - --immediate 0 --nopreview \
		--thumb none --timeout 1 --shutter 1 --output /dev/null
	RET=$?
} >> "${CAMERA_DATA}" 2>&1
if [[ ${RET} -ne 0 ]]; then
	echo "${ME}: '${CMD}' failed:"
	indent "$( "${CAMERA_DATA}" )"
	exit "${RET}"
fi


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
		echo "Camera model ${MODEL}, sensor ${SENSOR} is supported by Allsky."
		echo "Information about the camera's features is in:"
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
	echo "${ME}: ERROR: Unable to determine maximum exposure time for camera ${MODEL} ${SENSOR}." >&2
fi
echo

exit "${RET}"
