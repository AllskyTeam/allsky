#!/bin/bash

# This script gets information on any attached RPi camera(s),
# primarily to be used when requesting support for a new camera.

# Allow this script to be executed manually, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$(dirname "${BASH_ARGV0}")/../.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"		|| exit "${ALLSKY_EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"		|| exit "${ALLSKY_EXIT_ERROR_STOP}"

OK="true"
DO_HELP="false"
CAMERA_NUMBER=0
CMD=""
INFO_ONLY="false"
IGNORE_ERRORS="false"
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
		--cmd)
			CMD="$2"
			shift
			;;
		--info-only)
			INFO_ONLY="true"
			;;
		--ignore-errors)
			IGNORE_ERRORS="$2"
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
	local USAGE="Usage: ${ME} [--help] [--camera NUM] [--ignore-errors true|false]"
	if [[ ${RET} -ne 0 ]]; then
		E_ "${USAGE}"
	else
		echo -e "${USAGE}"
	fi
	echo "Arguments:"
	echo "    --help           displays this message and exits."
	echo "    --camera NUM     use camera number NUM."
	echo "    --cmd CMD        execute 'CMD' to get camera information."
	echo "    --info-only      only output camera information to stdout."
	echo "    --ignore-errors  don't output any error message."
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

if [[ -z ${CMD} ]]; then
	CMD="$( determineCommandToUse "false" "" "false" )"		|| exit 1
fi

export LIBCAMERA_LOG_LEVELS="ERROR,FATAL"
CAMERA_RAW_DATA="${ALLSKY_TMP}/camera_data.txt"

{
	echo -e "===== ${CMD} --list-cameras --verbose"
	# "--list-cameras" lists ALL the cameras found, even if we specify "--camera".
	"${CMD}" --list-cameras --verbose 2>&1
} > "${CAMERA_RAW_DATA}"

NUM_CAMERAS="$( grep -c "^[0-9]" "${CAMERA_RAW_DATA}" )"
if [[ ${NUM_CAMERAS} -eq 0 ]]; then
	[[ ${IGNORE_ERRORS} == "false" ]] && echo "${ME}: No RPi cameras found!" >&2
	exit 1
fi


# CAMERA_RAW_DATA's format:
#	0 : imx477 [4056x3040] (/base/soc/i2c0mux/i2c@1/imx477@1a)
#	    Modes: 'SRGGB10_CSI2P' : 1332x990 
#	           'SRGGB12_CSI2P' : 2028x1080 2028x1520 4056x3040 
#	           ...
#   Available controls for 4056x3040 SRGGB10_CSI2P mode:
#   ----------------------------------------------------
#   AeConstraintMode : [0..3]
#   AeEnable : [false..true]
#	...

# Run once for each camera so we get the metadata for all of them.
ON_CAMERA=0
while [[ ${ON_CAMERA} -lt ${NUM_CAMERAS} ]];
do
	echo "===== Camera ${ON_CAMERA}"	# If you change this line, change it in the gawk program as well.
	# Do not use "--immediate 1" since it causes the max Exposure time to be 0.
	"${CMD}" --camera "${ON_CAMERA}"  --verbose --metadata - --immediate 0 --nopreview \
		--thumb none --timeout 1 --shutter 1 --output /dev/null
	RET+=$?
	(( ON_CAMERA++ ))
done >> "${CAMERA_RAW_DATA}" 2>&1
if [[ ${RET} -ne 0 ]]; then
	echo "${ME}: '${CMD}' failed:"
	indent "$( "${CAMERA_RAW_DATA}" )"
	exit "${RET}"
fi

# Get the max exposure for the specified camera as well as capabilites for all cameras.
if [[ ! -s ${ALLSKY_RPi_CAMERA_INFO} ]]; then
	[[ ${IGNORE_ERRORS} == "false" ]] && echo "${ME}: File '${ALLSKY_RPi_CAMERA_INFO}' not found." >&2
	exit 1
fi
MAX_EXPOSURE="$( sed -e 's/://' -e 's/\.\./ /' -e 's/\[//' -e 's/]//' "${CAMERA_RAW_DATA}" |
	gawk -v CAMERA_NUMBER="${CAMERA_NUMBER}" -v CAMERA_INFO_FILE="${ALLSKY_CONNECTED_CAMERAS_INFO}" -v INFO="${ALLSKY_RPi_CAMERA_INFO}" '
		BEGIN {
			et = 0; fdl = 0; camera_number = ""; number_of_cameras = 0;
			SAVED_FS = FS;
			FS = "	";
			while ((getline < INFO) > 0) {
				if (substr($1, 1, 1) == "#" || $0 == "")
					continue;
				sensor = $1;
				module_len = $2;
				name = $3;
				pixel_size = $4;
				max_exposure = $5;
				is_cooled = $6;
				a_module_len[sensor] = module_len;
				a_name[sensor] = name;
				a_pixel_size[sensor] = pixel_size;
				a_max_exposure[sensor] = max_exposure;
				a_is_cooled[sensor] = is_cooled;
			}
			close(INFO);
			FS = SAVED_FS;
		}

		function s0(s, type) {
			# Strip trailing 0s in floating point numbers to make them easier to read.
			# Skip if an int or string.
			if (type != "float" || s + 0 != s)
				return(s);

			if (index(s, ".") == 0)
				return(s ".0");		# Append .0 to make it a float

			m_ = match(s, "00*$");
			if (m_ == 0)
				return(s);
			return(substr(s, 1, m_-1) "0");
		}

		function do_cc(cam_num, out_file, name, desc, maxv, minv, defaultv, currentv, auto_supported, writable, cc_type, num_type) {
			printf("libcamera") > out_file;
			printf("\t%s", name) > out_file;
			printf("\t%s", desc) > out_file;
			printf("\t%s", s0(maxv, num_type)) > out_file;
			printf("\t%s", s0(minv, num_type)) > out_file;
			printf("\t%s", s0(defaultv, num_type)) > out_file;
			printf("\t%s", s0(currentv, num_type)) > out_file;
			printf("\t%s", auto_supported) > out_file;
			printf("\t%s", writable) > out_file;
			printf("\t%s", cc_type) > out_file;
			printf("\n") > out_file;
		}
		function do_camera(cam_num, out_file) {
			if (cam_num == 0) {
				# Legend
				printf("#") > out_file;
				printf("\tcamera") > out_file;
				printf("\ttype") > out_file;
				printf("\tnum") > out_file;
				printf("\tsensor") > out_file;
				printf("\tmodule_len") > out_file;
				printf("\tmodel") > out_file;
				printf("\theight") > out_file;
				printf("\twidth") > out_file;
				printf("\tis_color?") > out_file;
				printf("\tbayer") > out_file;
				printf("\tbins") > out_file;
				printf("\tvideo_formats") > out_file;
				printf("\tpixel_size") > out_file;
				printf("\tis_cooled?") > out_file;
				printf("\tbit_depth") > out_file;
				printf("\tsupport_temp?") > out_file;
				printf("\tsupport_focus?") > out_file;
				printf("\n") > out_file;
			}
			printf("camera") > out_file;
			printf("\tRPi") > out_file;
			printf("\t%d", cam_num) > out_file;
			printf("\t%s", camera_info[cam_num, "sensor"]) > out_file;
			printf("\t%d", camera_info[cam_num, "module_len"]) > out_file;
			printf("\t%s", camera_info[cam_num, "name"]) > out_file;
			printf("\t%d", camera_info[cam_num, "height"]) > out_file;
			printf("\t%d", camera_info[cam_num, "width"]) > out_file;
			printf("\t%s", camera_info[cam_num, "color_camera"]) > out_file;
			printf("\t%s", camera_info[cam_num, "bayer_pattern"]) > out_file;
			printf("\t%s", camera_info[cam_num, "supported_bins"]) > out_file;
			printf("\t%s", camera_info[cam_num, "supported_video_format"]) > out_file;
			printf("\t%.2f", camera_info[cam_num, "pixel_size"]) > out_file;
			printf("\t%s", camera_info[cam_num, "is_cooled"]) > out_file;
			printf("\t%d", camera_info[cam_num, "bit_depth"]) > out_file;
			printf("\t%s", camera_info[cam_num, "supports_temperature"]) > out_file;
			printf("\t%s", camera_info[cam_num, "supports_auto_focus"]) > out_file;
			printf("\n") > out_file;

			# Now output the camera capabilities.

			low = camera_cc[cam_num, "gain_low"];
			if (low != "") {
				high = camera_cc[cam_num, "gain_high"];
				# Either gain is set or the user specifies the values, so there is no default.
				do_cc(cam_num, out_file, "Gain", "Gain", high, low, "NOT_SET", "NOT_SET", "ASI_TRUE", "ASI_TRUE", "ASI_GAIN", "float");
				do_cc(cam_num, out_file, "AutoExpMaxGain", "Auto exposure maximum gain value", high, low, "NOT_SET", "NOT_SET", "ASI_FALSE", "ASI_TRUE", "ASI_AUTO_MAX_GAIN", "float");
			}

			low = camera_cc[cam_num, "exposure_low"];
			if (low != "") {
				high = camera_cc[cam_num, "exposure_high"];
				do_cc(cam_num, out_file, "Exposure", "Exposure Time (us)", high, low, 10000, "NOT_SET", "ASI_TRUE", "ASI_TRUE", "ASI_EXPOSURE", "int");
				do_cc(cam_num, out_file, "AutoExpMaxExpMS", "Auto exposure maximum exposure value (ms)", high/1000, low/1000, 60000, "NOT_SET", "ASI_FALSE", "ASI_TRUE", "ASI_AUTO_MAX_EXP", "int");
			}

			low = camera_cc[cam_num, "WB_low"];
			if (low != "") {
				high = camera_cc[cam_num, "WB_high"];
				# Either auto white balance is set or the user specifies the values, so there is no default.
				do_cc(cam_num, out_file, "WB_R", "White balance: Red component", high, low, 0.0, "NOT_SET", "ASI_TRUE", "ASI_TRUE", "ASI_WB_R", "float");
				do_cc(cam_num, out_file, "WB_B", "White balance: Blue component", high, low, 0.0, "NOT_SET", "ASI_TRUE", "ASI_TRUE", "ASI_WB_B", "float");
			}

			# Per the RPi developers, "All cameras will always support flips..."
			do_cc(cam_num, out_file, "Flip", "Flip: 0->None 1->Horiz 2->Vert 3->Both", 3, 0, 0, "NOT_SET", "ASI_FALSE", "ASI_TRUE", "ASI_FLIP", "int")

			low = camera_cc[cam_num, "ev_low"];
			if (low != "") {
				high = camera_cc[cam_num, "ev_high"];
				def = camera_cc[cam_num, "ev_default"];
				do_cc(cam_num, out_file, "ExposureCompensation", "Exposure Compensation", high, low, def, "NOT_SET", "ASI_FALSE", "ASI_TRUE", "EV", "float");
			}

			low = camera_cc[cam_num, "saturation_low"];
			if (low != "") {
				high = camera_cc[cam_num, "saturation_high"];
				def = camera_cc[cam_num, "saturation_default"];
				do_cc(cam_num, out_file, "Saturation", "Saturation", high, low, def, "NOT_SET", "ASI_FALSE", "ASI_TRUE", "SATURATION", "float");
			}

			low = camera_cc[cam_num, "contrast_low"];
			if (low != "") {
				high = camera_cc[cam_num, "contrast_high"];
				def = camera_cc[cam_num, "contrast_default"];
				do_cc(cam_num, out_file, "Contrast", "Contrast", high, low, def, "NOT_SET", "ASI_FALSE", "ASI_TRUE", "CONTRAST", "float");
			}
			low = camera_cc[cam_num, "sharpness_low"];
			if (low != "") {
				high = camera_cc[cam_num, "sharpness_high"];
				def = camera_cc[cam_num, "sharpness_default"];
				do_cc(cam_num, out_file, "Sharpness", "Sharpness", high, low, def, "NOT_SET", "ASI_FALSE", "ASI_TRUE", "SHARPNESS", "float");
			}
		}

		{
			online++;

			if (/^[a-zA-Z]/ || /^-/) {
				next;
			}

# printf("line %d: %s\n", online, $0);
			if (/^[0-9]/) {
				camera_number = $1;
				number_of_cameras++;

				sensor = $2;
				camera_info[camera_number, "sensor"] = sensor;
				split($3, a, "x");
					camera_info[camera_number, "width"] = a[1];
					camera_info[camera_number, "height"] = a[2];
				split($4, a, "-");
					camera_info[camera_number, "bit_depth"] = a[1];
				if ($5 == "MONO") {
					camera_info[camera_number, "supported_video_format"] = "ASI_IMG_RAW8 ASI_IMG_END";
				} else {
					camera_info[camera_number, "bayer_pattern"] = "BAYER_" substr($5, 1, 2);
					camera_info[camera_number, "supported_video_format"] = "ASI_IMG_RGB24 ASI_IMG_END";
				}

				# If the sensor is unknown
				x = a_module_len[sensor];
				camera_info[camera_number, "module_len"] = x != "" ? x : 0;
				x = a_name[sensor];
				camera_info[camera_number, "name"] = x != "" ? x : "unknown sensor";
				x = a_pixel_size[sensor];
				camera_info[camera_number, "pixel_size"] = x != "" ? x : "0";
				x = a_is_cooled[sensor];
				camera_info[camera_number, "is_cooled"] = x != "" ? x : "ASI_FALSE";
				camera_info[camera_number, "supports_temperature"] = "ASI_FALSE";
				camera_info[camera_number, "supports_auto_focus"] = "ASI_FALSE";
				camera_info[camera_number, "color_camera"] = "ASI_FALSE";
				# RPi cameras do not support binning directly; instead,
				# you specify the image size.  Assume all camera support 50% size (bin 2).
				camera_info[camera_number, "supported_bins"] = "1 2 0";

				next;
			}

			# Get all the capabilities
			if ($1 == "=====" && $2 == "Camera") {
				camera_number = $3;		# New section of metadata

			} else if ($1 == "AnalogueGain") {
				camera_cc[camera_number, "gain_low"] = $2;
				camera_cc[camera_number, "gain_high"] = $3;
			} else if ($1 == "ExposureTime") {
				camera_cc[camera_number, "exposure_low"] = $2;
				# Allow for the max exposure to be overwritten.
				m =	a_max_exposure[sensor];
				if (m == "" || m == 0)
					m = $3;
				camera_cc[camera_number, "exposure_high"] = m;

				if (camera_number == CAMERA_NUMBER) {
					et = m;		# Max exposure time for this camera
				}
			} else if ($1 == "FrameDurationLimits") {
				fdl = $3;

			} else if ($1 == "ColourGains") {
				camera_info[camera_number, "color_camera"] = "ASI_TRUE";
				camera_cc[camera_number, "WB_low"] = $2;
				camera_cc[camera_number, "WB_high"] = $3;

			} else if ($1 == "Contrast") {
				camera_cc[camera_number, "contrast_low"] = $2;
				camera_cc[camera_number, "contrast_high"] = $3;
			} else if ($1 == "contrast") {
				camera_cc[camera_number, "contrast_default"] = $2;

			} else if ($1 == "Saturation") {
				camera_cc[camera_number, "saturation_low"] = $2;
				camera_cc[camera_number, "saturation_high"] = $3;
			} else if ($1 == "saturation") {
				camera_cc[camera_number, "saturation_default"] = $2;

			} else if ($1 == "Sharpness") {
				camera_cc[camera_number, "sharpness_low"] = $2;
				camera_cc[camera_number, "sharpness_high"] = $3;
			} else if ($1 == "sharpness") {
				camera_cc[camera_number, "sharpness_default"] = $2;

			} else if ($1 == "ExposureValue") {
				camera_cc[camera_number, "ev_low"] = $2;
				camera_cc[camera_number, "ev_high"] = $3;
			} else if ($1 == "ev") {
				camera_cc[camera_number, "ev_default"] = $2;

			} else if ($1 == "LensPosition") {
				camera_cc[camera_number, "lens_low"] = $2;
				camera_cc[camera_number, "lens_high"] = $3;

			} else if ($1 == "AfMode") {
				camera_info[camera_number, "supports_auto_focus"] = "ASI_TRUE";

			} else if ($1 == "\"SensorTemperature\"") {
				camera_info[camera_number, "supports_temperature"] = "ASI_TRUE";
			}
		}
		END {
			for (i=0; i<number_of_cameras; i++) {
				do_camera(i, CAMERA_INFO_FILE);
			}

			if (et == 0 && fdl == 0) {
				# No exposure time found
				exit(1);
			}
			# FrameDurationLimits takes precedence over ExposureTime
			if (fdl != 0)
				num = fdl;
			else
				num = et;
			printf("%.1f\n", num / 1000000);

			exit(0);
		}'
)"
RET=$?

SENSOR="$( grep -m 1 "^${CAMERA_NUMBER} :" "${CAMERA_RAW_DATA}" | gawk '{ print $3; }' )"

# Determine if this is a known sensor.
MODEL="$( get_model_from_sensor "${SENSOR}" )"
if grep --silent "^camera.*${MODEL}" "${ALLSKY_CONNECTED_CAMERAS_INFO}" ; then
	KNOWN_SENSOR="true"
else
	KNOWN_SENSOR="false"
fi

if [[ ${RET} -eq 0 ]]; then
	if [[ ${INFO_ONLY} == "true" ]]; then
		cat "${ALLSKY_CONNECTED_CAMERAS_INFO}"
	else
		echo
		if [[ ${KNOWN_SENSOR} == "true" ]] ; then
			echo "Camera model ${MODEL}, sensor ${SENSOR} is known by Allsky."
			echo "Information about the camera's features is in:"
			echo "    ${CAMERA_RAW_DATA}"
		else
			echo "This sensor, ${SENSOR}, is not known by Allsky, but should work."
			echo "Its maximum exposure time is ${MAX_EXPOSURE} seconds."
			if gawk -v E="${MAX_EXPOSURE}" 'BEGIN { if (E >= 60) exit 0; else exit 1; }' ; then
				echo ">>> This will make a good allsky camera. <<<"
			else
				echo ">>> This is a short maximum exposure so may not make a good allsky camera. <<<"
			fi
	
			echo
			echo "************************"
			echo "Please let the Allsky team know about this sensor so it can"
			echo "be added to the list of known sensors.  Please attach"
			echo "    ${CAMERA_RAW_DATA}"
			echo "to your GitHub Discussion."
			echo    "************************"
		fi
	fi
else
	[[ ${IGNORE_ERRORS} == "false" ]] && echo -e "\n${ME}: ERROR: Unable to determine maximum exposure time for camera ${MODEL} ${SENSOR}.\n" >&2
fi

exit "${RET}"
