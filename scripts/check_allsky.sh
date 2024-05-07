#!/bin/bash

# Check the Allsky installation and settings for missing items,
# inconsistent items, illegal items, etc.

# TODO: Within a heading, group by topic, e.g., all IMG_* together.
# TODO: Right now the checks within each heading are in the order I thought of them!

# Allow this script to be executed manually, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck disable=SC1091 source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh" 				|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/installUpgradeFunctions.sh"	|| exit "${EXIT_ERROR_STOP}"

usage_and_exit()
{
	local RET=${1}
	local C=""
	[[ ${RET} -ne 0 ]] && C="${RED}"
	{
		echo
		echo -en "${C}"
		echo -n  "Usage: ${ME} [--help] [--fromWebUI] [--no-info] [--no-warn] [--no-error]"
		echo -e  "${NC}"
		echo
		echo "'--help' displays this message and exits."
		echo "'--fromWebUI' displays output to be displayed in the WebUI."
		echo "'--no-info' skips checking for Informational items."
		echo "'--no-warn' skips checking for Warning items."
		echo "'--no-error' skips checking for Error items."
		echo
	} >&2
	exit "${RET}"
}

# Check arguments
OK="true"
HELP="false"
FROM_WEBUI="false"
CHECK_INFORMATIONAL="true"
CHECK_WARNINGS="true"
CHECK_ERRORS="true"
while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
		--help)
			HELP="true"
			;;
		--fromwebui)
			FROM_WEBUI="true"
			;;
		--no-info)
			CHECK_INFORMATIONAL="false"
			;;
		--no-warn)
			CHECK_WARNINGS="false"
			;;
		--no-error)
			CHECK_ERRORS="false"
			;;
		*)
			echo -e "${RED}Unknown argument: '${ARG}'${NC}" >&2
			OK="false"
			;;
	esac
	shift
done
[[ ${HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" ]] && usage_and_exit 1

NUM_INFOS=0
NUM_WARNINGS=0
NUM_ERRORS=0

NUM_HEADER_CALLS=0
function heading()
{
	local HEADER="${1}"

	((NUM_HEADER_CALLS++))
	local SUB_HEADER=""
	local DISPLAY_HEADER="false"
	case "${HEADER}" in
		Information)
			((NUM_INFOS++))
			if [[ ${NUM_INFOS} -eq 1 ]]; then
				DISPLAY_HEADER="true"
				SUB_HEADER=" (items that will not stop any part of Allsky from running)"
			fi
			;;
		Warning)
			((NUM_WARNINGS++))
			if [[ ${NUM_WARNINGS} -eq 1 ]]; then
				DISPLAY_HEADER="true"
				SUB_HEADER=" (items that may keep parts of Allsky running)"
			fi
			;;
		Error)
			((NUM_ERRORS++))
			if [[ ${NUM_ERRORS} -eq 1 ]]; then
				DISPLAY_HEADER="true"
				SUB_HEADER=" (items that may keep Allsky from running)"
			fi
			;;
		Summary)
			DISPLAY_HEADER="true"
			;;
		*)
			echo "INTERNAL ERROR in heading(): Unknown HEADER '${HEADER}'."
			;;
	esac

	if [[ ${DISPLAY_HEADER} == "true" ]]; then
		[[ ${NUM_HEADER_CALLS} -gt 1 ]] && echo -e "${NL}"
		echo -e "${NL}${STRONGs}---------- ${HEADER}${SUB_HEADER} ----------${STRONGe}${NL}"
	else
		echo "${STRONGs}-----${STRONGe}"	# Separates lines within a header group
	fi
}


# =================================================== FUNCTIONS

# Return the min of two numbers.
function min()
{
	local ONE="${1}"
	local TWO="${2}"
	if [[ ${ONE} -lt ${TWO} ]]; then
		echo "${ONE}"
	else
		echo "${TWO}"
	fi
}

# Make sure the env file exists.
function check_for_env_file()
{
	[[ -s ${ALLSKY_ENV} ]] && return 0

	heading "Error"
	if [[ ! -f ${ALLSKY_ENV} ]]; then
		echo "'${ALLSKY_ENV}' not found!"
	else
		echo "'${ALLSKY_ENV}' is empty!"
	fi
	echo "Unable to check any remote Website or server settings."
	return 1
}
if check_for_env_file ; then
	ENV_EXISTS="true"
else
	ENV_EXISTS="false"
fi

# Get all settings.  Give each set a different prefix to avoid name conflicts.
X="$( "${ALLSKY_SCRIPTS}/convertJSON.php" --prefix S_ --shell )"
if [[ $? -ne 0 ]]; then
	echo "${X}"
	exit 1
fi
eval "${X}"

if [[ ${ENV_EXISTS} == "true" ]]; then
	X="$( "${ALLSKY_SCRIPTS}/convertJSON.php" --prefix E_ --shell --settings-file "${ALLSKY_ENV}" )"
	eval "${X}"
fi

# "convertJSON.php" won't work with the CC_FILE since it has arrays.
C_sensorWidth="$( settings ".sensorWidth" "${CC_FILE}" )"	# Physical sensor size.
C_sensorHeight="$( settings ".sensorHeight" "${CC_FILE}" )"

# Return 0 if the number is 0.0, else return 1.
function is_zero()
{
	local NUM="${1}"
	gawk -v n="${NUM}" 'BEGIN {if (n == 0.0) exit 0; else exit 1; }'
}

# Return 0 if the number 0.0 - 1.0, else return 1.
function is_within_range()
{
	local NUM="${1}"
	local LOW="${2:-0.0}"
	local HIGH="${3:-1.0}"
	gawk -v n="${NUM}" -v low="${LOW}" -v high="${HIGH}" '
		BEGIN {if (n < low || n > high) exit 1; exit 0; }'
}

# Typical minimum daytime and nighttime exposures.
DAY_MIN_EXPOSURE_MS=250
NIGHT_MIN_EXPOSURE_MS=5000
# Minimum total time spent on each image.
DAY_MIN_IMAGE_TIME_MS=$(( DAY_MIN_EXPOSURE_MS + S_daydelay ))
NIGHT_MIN_IMAGE_TIME_MS=$(( NIGHT_MIN_EXPOSURE_MS + S_nightdelay ))
MIN_IMAGE_TIME_MS="$( min "${DAY_MIN_IMAGE_TIME_MS}" "${NIGHT_MIN_IMAGE_TIME_MS}" )"

##### Check if the delay is so short it's likely to cause problems.
function check_delay()
{
	local DAY_OR_NIGHT="${1}"
	local DELAY_MS  MIN_MS  L

	if [[ ${DAY_OR_NIGHT,,} == "daytime" ]]; then
		L="${S_daydelay_label}"
		DELAY_MS="${S_daydelay}"
		MIN_MS="${DAY_MIN_IMAGE_TIME_MS}"
	else
		L="${S_nightdelay_label}"
		DELAY_MS="${S_nightdelay}"
		MIN_MS="${NIGHT_MIN_IMAGE_TIME_MS}"
	fi

# TODO: use the module average flow times for day and night when using "module" method.
# TODO: overlaymethod goes away in next release

	# With the legacy overlay method it might take up to a couple seconds to save an image.
	# With the module method it can take up to 5 seconds.
	if [[ ${S_overlaymethod} -eq 1 ]]; then
		MAX_TIME_TO_PROCESS_MS=5000
	else
		MAX_TIME_TO_PROCESS_MS=2000
	fi
	if [[ ${MIN_MS} -lt ${MAX_TIME_TO_PROCESS_MS} ]]; then
		heading "Warning"
		echo "The ${WSNs}${L}${WSNe} of ${DELAY_MS} ms may be too short given the"
		echo "maximum expected time to save and process an image (${MAX_TIME_TO_PROCESS_MS} ms)."
		echo "A new image may appear before the prior one has finished processing."
		echo "FIX: Consider increasing ${L}."
	fi
}

#
# ====================================================== MAIN PART OF PROGRAM
#

if [[ ${S_uselocalwebsite} == "true" ||
	  ${S_useremotewebsite} == "true" ||
	  ${S_useremoteserver} == "true" ]]; then
	USE_SOMETHING="true"
else
	USE_SOMETHING="false"
fi

# ======================================================================
# ================= Check for informational items.

if [[ ${CHECK_INFORMATIONAL} == "true" ]]; then

	# Settings used in this section.
	WEBSITES="$( whatWebsites )"

	# Is Allsky set up to take dark frames?  This isn't done often, so if it is, inform the user.
	if [[ ${S_takedarkframes} == "true" ]]; then
		heading "Information"
		echo "${WSNs}${S_takedarkframes_label}${WSNe} is enabled."
		echo "FIX: Unset when you are done taking dark frames."
	fi

	if [[ ${S_timelapsekeepsequence} == "true" ]]; then
		heading "Information"
		echo    "${WSNs}${S_timelapsekeepsequence_label}${WSNe} in enabled."
		echo -n "FIX: If you are not debugging timelapse videos consider disabling this"
		echo    " to save disk space."
	fi

	if [[ ${S_thumbnailsizex} -ne 100 || ${S_thumbnailsizey} -ne 75 ]]; then
		heading "Information"
		echo "You are using a non-standard thumbnail size of ${S_thumbnailsizex}x${S_thumbnailsizey}."
		echo "Please note non-standard sizes have not been thoroughly tested and"
		echo "FIX: You may need to modify some code to get your thumbnail sizes working."
	fi

	FOREVER="be kept forever or until you manually delete them"
	if [[ ${S_daystokeep} -eq 0 ]]; then
		heading "Information"
		echo -n "${WSNs}${S_daystokeep_label}${WSNe} is ${WSVs}0${WSVe}"
		echo    " which means images and videos will ${FOREVER}."
		echo    "FIX: If this is not what you want, change the setting."
	fi

	if [[ (${WEBSITES} == "both" || ${WEBSITES} == "local") &&
			${S_daystokeeplocalwebsite} -eq 0 ]]; then
		heading "Information"
		echo -n "${WSNs}${S_daystokeeplocalwebsite_label}${WSNe} is ${WSVs}0${WSVe}"
		echo    " which means local web images and videos will ${FOREVER}."
		echo    "FIX: If this is not what you want, change the setting."
	fi
	# S_daystokeepremotewebsite may not be implemented; if so, ignore.
	if [[ (${WEBSITES} == "both" || ${WEBSITES} == "remote") &&
			-n ${S_daystokeepremotewebsite} && ${S_daystokeepremotewebsite} -eq 0 ]]; then
		heading "Information"
		echo -n "${WSNs}${S_daystokeepremotewebsite_label}${WSNe} is ${WSVs}0${WSVe}"
		echo    " which means remote web images and videos will ${FOREVER}."
		echo    "FIX: If this is not what you want, change the setting."
	fi

	ERR="$( checkWidthHeight "Resize Image" "image" \
		"${S_imageresizewidth}" "${S_imageresizeheight}" \
	 	"${C_sensorWidth}" "${C_sensorHeight}" 2>&1 )"
	if [[ $? -ne 0 || -n ${ERR} ]]; then
		heading "Information"
		echo "${ERR}"
	fi

	if [[ $((S_imagecroptop + S_imagecropright + S_imagecropbottom + S_imagecropleft)) -gt 0 ]]; then
		ERR="$( checkCropValues "${S_imagecroptop}" "${S_imagecropright}" \
				"${S_imagecropbottom}" "${S_imagecropleft}" \
				"${C_sensorWidth}" "${C_sensorHeight}" )"
		if [[ $? -ne 0 || -n ${ERR} ]]; then
			heading "Information"
			echo "${ERR}"
			echo "FIX: Check the ${WSNs}Image Crop Top/Right/Bottom/Left${WSNe} settings."
		fi
	fi

	if [[ -n ${S_keogramextraparameters} ]]; then
		# These used to be set in the default S_keogramextraparameters.
		if echo "${S_keogramextraparameters}" |
				grep -E --silent "image-expand|-x|font-size|-S|font-line|-L|font-color|-C" ; then
			heading "Information"
			echo "${WSNs}${S_keogramextraparameters_label}${WSNe} contains one or more of:"
			echo "${SPACES}${WSVs}--image-expand${WSVe} or ${WSVs}-x${WSVe}"
			echo "${SPACES}${WSVs}--font-size${WSVe} or ${WSVs}-S${WSVe}"
			echo "${SPACES}${WSVs}--font-line${WSVe} or ${WSVs}-L${WSVe}"
			echo "${SPACES}${WSVs}--font-color${WSVe} or ${WSVs}-C${WSVe}"
			echo "FIX: These are now separate settings so move them to their own settings."
		fi
	fi
fi		# end of checking for informational items



# ======================================================================
# ================= Check for warning items.
#	These are wrong and won't stop Allsky from running, but
#	may break part of Allsky, e.g., uploads may not work.

if [[ ${CHECK_WARNINGS} == "true" ]]; then

	if [[ -z ${S_lastchanged} ]]; then
		heading "Warning"
		echo "Allsky needs to be configured before it will run."
		echo "FIX: Go to the ${STRONGs}Allsky Settings${STRONGe} page in the WebUI."
	fi

	if reboot_needed ; then
		heading "Warning"
		echo "The Pi needs to be rebooted before Allsky will start."
		echo "FIX: Reboot."
	fi

	if [[ ${PI_OS} == "buster" ]]; then
		heading "Warning"
		echo "Your Pi is running the old 'Buster' operating system;"
		echo "this is the last release of Allsky that supports Buster."
		echo "FIX: Upgrade your Pi to Bookworm, 64-bit if possible."
	fi

	check_delay "Daytime"
	check_delay "Nighttime"

	##### Timelapse and mini-timelapse
	if [[ ${S_timelapsevcodec} == "libx264" ]]; then
		# Check if timelapse size is "too big" and will likely cause an error.
		# This is normally only an issue with the libx264 video codec which has
		# a dimension limit that we put in PIXEL_LIMIT.
		if [[ ${PI_OS} == "buster" ]]; then
			PIXEL_LIMIT=$((4096 * 2304))		# Limit of libx264
		else
			PIXEL_LIMIT=$((8192 * 4320))
		fi

		function check_timelapse_size()
		{
			local RESIZED_WIDTH="${1}"		; local RESIZED_WIDTH_LABEL="${2}"
			local RESIZED_HEIGHT="${3}"		; local RESIZED_HEIGHT_LABEL="${4}"
			local W H

			# Determine the final image size and put in ${W} and ${H}.
			# This is dependent on the these, in this order:
			#		if the images is resized, use that size
			#			else if the size is set in the WebUI (WIDTH, HEIGHT), use that size
			#				else use sensor size minus crop amount(s)
			if [[ ${RESIZED_WIDTH} -ne 0 ]]; then
				W="${RESIZED_WIDTH}"
			elif [[ ${S_width} -gt 0 ]]; then
				W="${S_width}"
			else
				W=$(( C_sensorWidth - S_imagecropleft - S_imagecropright ))
			fi
			if [[ ${RESIZED_HEIGHT} -ne 0 ]]; then
				H="${RESIZED_HEIGHT}"
			elif [[ ${S_height} -gt 0 ]]; then
				H="${S_height}"
			else
				H=$(( C_sensorWidth - S_imagecroptop - S_imagecropbottom ))
			fi

			# W * H == total pixels in timelapse
			if [[ $(( W * H )) -gt ${PIXEL_LIMIT} ]]; then
				heading "Warning"
				echo -n "The ${WSNs}${RESIZED_WIDTH_LABEL}${WSNe} of ${WSVs}${W}${WSVe}"
				echo -n " and ${WSNs}${RESIZED_HEIGHT_LABEL}${WSNe} of ${WSVs}${H}${WSVe}"
				echo    " may cause errors while creating the video."
				echo -n "FIX: Consider either decreasing the video size or decreasing"
				echo    " each captured image via resizing and/or cropping."
			fi
		}

	fi

	# Check generate vs upload as well as the bitrate of a timelapse
	function check_timelapse_upload_and_bitrate()
	{
		local TYPE="${1}"				# type of timelapse
		local UPLOAD="${!2}"	; declare -n UPLOAD_LABEL="${2}_label"
		local BITRATE="${!3}"	; declare -n BITRATE_LABEL="${3}_label"
		local W="${!4}"			; declare -n W_LABEL="${4}_label"
		local H="${!5}"			; declare -n H_LABEL="${5}_label"

		if [[ ${S_timelapsevcodec} == "libx264" ]]; then
			check_timelapse_size "${W}" "${W_LABEL}" "${H}" "${H_LABEL}"
		fi

		# If the user doesn't have a Website or remote server there's nothing to upload
		# to so it's not an issue.
		if [[ ${UPLOAD} == "false" && ${USE_SOMETHING} == "true" ]]; then
			heading "Warning"
			echo -n "${TYPE} videos are being created"
			if [[ ${TYPE} == "Daily Timelapse" ]]; then
				echo -n " (${WSNs}${S_timelapsegenerate_label}${WSNe} = Yes)"
			else
				echo -n " (${WSNs}${S_minitimelapsenumimages_label}${WSNe} is greater than 0)"
:
			fi
			echo    " but not uploaded anywhere (${WSNs}${UPLOAD_LABEL}${WSNe} = No)"
			echo    "FIX: Either disable timelapse generation or (more likely) enable upload."
		fi

		if [[ ${BITRATE: -1} == "k" ]]; then
			heading "Warning"
			echo "${WSNs}${BITRATE_LABEL}${WSNe} should be a number with OUT ${WSVs}k${WSVe}."
			echo "FIX: Remove the ${WSVs}k${WSVe} from the bitrate."
		fi
	}

	# Timelapse
	if [[ ${S_timelapsegenerate} == "true" ]]; then	
		check_timelapse_upload_and_bitrate "Daily Timelapse" \
			"S_timelapseupload" "S_timelapsebitrate" \
			"S_timelapsewidth" "S_timelapseheight"

	elif [[ ${S_timelapseupload} == "true" ]]; then
		heading "Warning"
		echo -n "Daily Timelapse videos are not being created (${WSNs}${S_timelapsegenerate_label}${WSNe} = No)"
		echo    " but ${WSNs}${S_timelapseupload_label}${WSNe} = Yes."
		echo    "FIX: Either create daily timelapse videos or disable upload."
	fi

	# Mini-timelapse
	if [[ ${S_minitimelapsenumimages} -gt 0 ]]; then		# Generating mini-timelapse
		check_timelapse_upload_and_bitrate "Mini-Timelapse" \
			"S_minitimelapseupload" "S_minitimelapsebitrate" \
			"S_minitimelapsewidth" "S_minitimelapseheight"

		# See if there's likely to be a problem with mini-timelapse creations
		# starting before the prior one finishes.
		# This is dependent on:
		#	1. Delay:		the delay between images: min(daydelay, nightdelay)
		#	2. Frequency:	how often mini-timelapse are created (i.e., after how many images)
		# 	3. NumImages:	how many images are used (the more the longer processing takes)
		# 	4. The speed of the Pi - this is the biggest unknown

		# Minimum total time between start of timelapse creations.
		MIN_IMAGE_TIME_SEC=$(( MIN_IMAGE_TIME_MS / 1000 ))
		MIN_TIME_BETWEEN_TIMELAPSE_SEC=$(( S_minitimelapsefrequency * MIN_IMAGE_TIME_SEC ))

		TYPICAL_T=50		# A guess at a "typical" number of images in a timelapse.

		# On a Pi 4, creating a ${TYPICAL_T}-image timelapse takes
		#	- a few seconds on a small ZWO camera
		#	- about a minute with an RPi HQ camera

		if [[ ${CAMERA_TYPE} == "ZWO" ]]; then
			S=3
		else
			S=60
		fi
		EXPECTED_TIME=$( echo "scale=0; (${S_minitimelapsenumimages} / ${TYPICAL_T}) * ${S}" | bc -l )
		if [[ ${EXPECTED_TIME} -gt ${MIN_TIME_BETWEEN_TIMELAPSE_SEC} ]]; then
			heading "Warning"
			echo -n "Your mini-timelapse settings may cause multiple timelapse to"
			echo    " be created simultaneously."
			echo    "FIX: Consider increasing the ${WSNs}Delay${WSNe} between pictures,"
			echo    "${SPACES}increasing ${WSNs}${S_minitimelapsefrequency_label}${WSNe},"
			echo    "${SPACES}decreasing ${WSNs}${S_minitimelapsenumimages_label}${WSNe},"
			echo    "${SPACES}or a combination of those changes."
			echo    "${SPACES}Expected time to create a mini-timelapse on a Pi 4 is"
			echo    "${SPACES}${EXPECTED_TIME} seconds but with your settings one could be created"
			echo    "${SPACES}as short as every ${MIN_TIME_BETWEEN_TIMELAPSE_SEC} seconds."
		fi

	elif [[ ${S_minitimelapseupload} == "true" ]]; then
		heading "Warning"
		echo -n "Mini-timelapse videos are not being created"
		echo -n " (${WSNs}${S_minitimelapsenumimages_label}${WSNe} = 0)"
		echo    " but ${WSNs}${S_minitimelapseupload_label}${WSNe} = Yes"
		echo    "FIX: Either create videos or disable upload."
	fi

	##### Keograms
	if [[ ${S_keogramgenerate} == "true" && ${S_keogramupload} == "false" && ${USE_SOMETHING} == "true" ]]; then
		heading "Warning"
		echo -n "Keograms are being created (${WSNs}${S_keogramgenerate_label}${WSNe} = Yes)"
		echo    " but not uploaded (${WSNs}${S_keogramupload_label}${WSNe} = No)"
		echo    "FIX: Either disable keogram generation or (more likely) enable upload."
	fi
	if [[ ${S_keogramgenerate} == "false" && ${S_keogramupload} == "true" ]]; then
		heading "Warning"
		echo -n "Keograms are not being created (${WSNs}${S_keogramgenerate_label}${WSNe} = No)"
		echo    " but ${WSNs}${S_keogramupload_label}${WSNe} = Yes"
		echo    "FIX: Either enable keogram generation or disable upload."
	fi

	##### Startrails
	if [[ ${S_startrailsgenerate} == "true" && ${S_startrailsupload} == "false" && ${USE_SOMETHING} == "true" ]]; then
		heading "Warning"
		echo -n "Startrails are being created (${WSNs}${S_startrailsgenerate}${WSNe} = Yes)"
		echo    " but not uploaded (${WSNs}${S_startrailsupload_label}${WSNe} = No)"
		echo    "FIX: Either disable startrails generation or (more likely) enable upload."
	fi
	if [[ ${S_startrailsgenerate} == "false" && ${S_startrailsupload} == "true" ]]; then
		heading "Warning"
		echo -n "Startrails are not being created (${WSNs}${S_startrailsgenerate}${WSNe} = No)"
		echo    " but ${WSNs}${S_startrailsupload_label}${WSNe} = Yes"
		echo    "FIX: Either enable startrails generation or disable upload."
	fi

	if is_number "${S_startrailsbrightnessthreshold}" ; then
		gawk -v x="${S_startrailsbrightnessthreshold}" ' BEGIN {
			if (x == 0.0) exit 0;
			else if (x == 1.0) exit 1;
			else if (x < 0.0 || x > 1.0) exit 2;
			exit 3;
			}'
		X=$?
	fi
	L="${S_startrailsbrightnessthreshold_label}"
	if [[ ${X} -eq 0 ]]; then
		heading "Warning"
		echo -n "${WSNs}${L}${WSNe} is 0.0 which means ALL images"
		echo    " will be IGNORED when creating startrails."
		echo    "FIX: Increase the value; start off at 0.1 and adjust if needed."
	elif [[ ${X} -eq 1 ]]; then
		heading "Warning"
		echo -n "${WSNs}${L}${WSNe} is 1.0 which means ALL images"
		echo    " will be USED when creating startrails, even daytime images."
		echo    "FIX: Increase the value; start off at 0.9 and adjust if needed."
	fi

	##### Images
	if [[ ${S_takedaytimeimages} == "false" && ${S_savedaytimeimages} == "true" ]]; then
		heading "Warning"
		echo -n "${WSNs}${S_takedaytimeimages_label}${WSNe} of images is off"
		echo    " but ${WSNs}${S_savedaytimeimages_label}${WSNe} is on in the WebUI."
		echo    "FIX: Either enable capture or disable saving."
	fi

	# These are floats which bash doesn't support, so use gawk to compare.
	if ! is_number "${S_imageremovebadlow}" || ! is_within_range "${S_imageremovebadlow}" ; then
		heading "Error"
		echo -n "${WSNs}${S_imageremovebadlow_label}${WSNe} (${S_imageremovebadlow})"
		echo    " must be 0.0 - 1.0, although it's normally around ${WSVs}0.1${WSVe}."
		echo    "FIX: Set to a vaild number.  ${WSVs}0${WSVe} disables the low threshold check."
	elif is_zero "${S_imageremovebadlow}" ; then
		heading "Warning"
		echo "${WSNs}${S_imageremovebadlow_label}${WSNe} is 0 (disabled)."
		echo "FIX: Set to a value greater than 0 unless you are debugging issues."
		echo "${SPACES}Try 0.1 and adjust if needed."
	fi
	if ! is_number "${S_imageremovebadhigh}" || ! is_within_range "${S_imageremovebadhigh}" ; then
		heading "Error"
		echo -n "${WSNs}${S_imageremovebadhigh_label}${WSNe} (${S_imageremovebadhigh})"
		echo    " must be 0.0 - 1.0, although it's normally around ${WSVs}0.9${WSVe}."
		echo    "FIX: Set to a vaild number.  ${WSVs}0${WSVe} disables the high threshold check."
	elif is_zero "${S_imageremovebadhigh}" ; then
		heading "Warning"
		echo "${WSNs}${S_imageremovebadhigh_label}${WSNe} is 0 (disabled)."
		echo "FIX: Set to a value greater than 0 unless you are debugging issues."
		echo "${SPACES}Try 0.9 and adjust if needed."
	fi

	##### Uploads
	if [[ ${S_imageresizeuploadswidth} -ne 0 || ${S_imageresizeuploadswidth} -ne 0 ]]; then
		if [[ ${S_imageuploadfrequency} -eq 0 ]]; then
			heading "Warning"
			echo -n "${WSNs}Resize Uploaded Images Width/Height${WSNe} is set"
			echo    " but you aren't uploading images (${WSNs}Upload Every X Images${WSNe} = 0)."
			echo    "FIX: "
			echo    "FIX: Either don't resize uploaded images or enable upload."
		fi
		if [[ ${S_imageresizeuploadswidth} -eq 0 && ${S_imageresizeuploadsheight} -ne 0 ]]; then
			heading "Warning"
			echo -n "${WSNs}${S_imageresizeuploadwidth_label}${WSNe} = 0"
			echo    " but ${WSNs}${S_imageresizeuploadheight_label}${WSNe} is greater than 0."
			echo    "If one is set the other one must also be set."
			echo    "FIX: Set both to 0 to disable resizing uploads or both to some value."
		elif [[ ${S_imageresizeuploadswidth} -ne 0 && ${S_imageresizeuploadsheight} -eq 0 ]]; then
			heading "Warning"
			echo -n "${WSNs}${S_imageresizeuploadheight_label}${WSNe} > 0"
			echo    " but ${WSNs}${S_imageresizeuploadwidth_label}${WSNe} = 0."
			echo    "If one is set the other one must also be set."
			echo    "FIX: Set both to 0 to disable resizing uploads or both to some value."
		fi
	fi

	X="$( check_remote_server "REMOTEWEBSITE"  )"
	RET=$?
	if [[ ${RET} -eq 1 ]]; then
		heading "Warning"
		echo -e "${X}"
	elif [[ ${RET} -eq 2 ]]; then
		heading "Error"
		echo -e "${X}"
	fi

	X="$( check_remote_server "REMOTESERVER" )"
	RET=$?
	if [[ ${RET} -eq 1 ]]; then
		heading "Warning"
		echo -e "${X}"
	elif [[ ${RET} -eq 2 ]]; then
		heading "Error"
		echo -e "${X}"
	fi

fi		# end of checking for warning items



# ======================================================================
# ================= Check for error items.
#	These are wrong and will likely keep Allsky from running.

if [[ ${CHECK_ERRORS} == "true" ]]; then

	##### Make sure it's a know camera type.
	if [[ ${CAMERA_TYPE} != "ZWO" && ${CAMERA_TYPE} != "RPi" ]]; then
		heading "Error"
		echo "INTERNAL ERROR: CAMERA_TYPE (${CAMERA_TYPE}) not valid."
		echo "Fix: Re-install Allsky."
	fi

	##### Make sure the settings file is properly linked.
	if ! MSG="$( check_settings_link "${SETTINGS_FILE}" )" ; then
		heading "Error"
		echo -e "${MSG}"
	fi

	function check_bool()
	{
		local B="${1}"
		local LABEL="${2}"
		local SETTING_NAME="${3}"

		if [[ ${B,,} != "true" && ${B,,} != "false" ]]; then
			heading "Error"
			local L="${WSNs}${LABEL}${WSNe} (${SETTING_NAME})."
			echo "INTERNAL ERROR: ${L} must be either 'true' or 'false'."
			if [[ -z ${B} ]]; then
				echo "It is empty."
			else
				echo "It is '${B}'."
			fi
			echo "Fix: Re-install Allsky."
		fi
	}

	##### Make sure these booleans have boolean values.
	for i in $( "${ALLSKY_SCRIPTS}/convertJSON.php" --type "boolean" )
	do
		declare -n v="S_${i}"
		declare -n l="S_${i}_label"
		check_bool "${v}" "${l}" "${i}"
	done

	##### Make sure these numbers have number values.
	for i in \
		"type=an integer" \
		$( "${ALLSKY_SCRIPTS}/convertJSON.php" --type "integer" ) \
		"type=a float" \
		$( "${ALLSKY_SCRIPTS}/convertJSON.php" --type "float" )
	do
		if [[ ${i} =~ "type=" ]]; then
			T_="${i/type=/}"
			continue
		fi
		declare -n v="S_${i}"
		declare -n l="S_${i}_label"
		if ! is_number "${v}" ; then
			heading "Error"
			if [[ -z ${v} ]]; then
				v="empty"
			else
				v="'${v}'"
			fi
			echo "${WSNs}${l}${WSNe} (${i}) must be ${T_} number.  It is ${v}."
			echo "FIX: See the documenation for valid numbers."
		fi
	done

	##### Check that all required settings are set.  All others are optional.
	# TODO: determine from options.json file which are required.
	for i in angle latitude longitude locale
	do
		declare -n v="S_${i}"
		if [[ -z ${v} ]]; then
			heading "Error"
			declare -n l="S_${i}_label"
			echo "${l} must be set."
			echo "FIX: Set it in the WebUI then rerun ${ME}."
		fi
	done

	##### Check that the required settings' values are valid.
	if [[ -n ${S_angle} ]] && ! is_number "${S_angle}" ; then
		heading "Error"
		echo "${WSNs}${S_angle_label}${WSNe} (${S_angle}) must be a number."
		echo "FIX: Set to a number in the WebUI then rerun ${ME}."
	fi
	if [[ -n ${S_latitude} ]] && ! LAT="$( convertLatLong "${S_latitude}" "latitude" 2>&1 )" ; then
		heading "Error"
		echo -e "${LAT}"		# ${LAT} contains the error message
		echo    "FIX: Correct the ${S_latitude_label} then rerun ${ME}."
	fi
	if [[ -n ${S_longitude} ]] && ! LONG="$( convertLatLong "${S_longitude}" "longitude" 2>&1 )" ; then
		heading "Error"
		echo -e "${LONG}"
		echo    "FIX: Correct the ${S_longitude_label} then rerun ${ME}."
	fi

	##### Check dark frames
	if [[ ${S_usedarkframes} == "true" ]]; then
		if [[ ! -d ${ALLSKY_DARKS} ]]; then
			heading "Error"
			echo -n "${WSNs}${S_usedarkframes_label}${WSNe} is set but the '${ALLSKY_DARKS}'"
			echo    " directory does not exist."
			echo    "FIX: Either disable the setting or take dark frames."
		else
			NUM_DARKS=$( find "${ALLSKY_DARKS}" -name "*.${EXTENSION}" 2>/dev/null | wc -l)
			if [[ ${NUM_DARKS} -eq 0 ]]; then
				heading "Error"
				echo -n "${WSNs}${S_usedarkframes_label}${WSNe} is set but there are no darks"
				echo    " in '${ALLSKY_DARKS}' with extension of '${EXTENSION}'."
				echo    "FIX: Either disable the setting or take dark frames."
			fi
		fi
	fi

	##### Check for valid numbers.
	if ! is_number "${S_imageuploadfrequency}" || [[ ${S_imageuploadfrequency} -lt 0 ]]; then
		heading "Error"
		echo "${WSNs}"${S_imageuploadfrequency_label}"${WSNe} (${S_imageuploadfrequency}) must be 0 or greater."
		echo "FIX: Set to ${WSVs}0${WSVe} to disable image uploads or set to a positive number."
	fi

	function check_stretch_numbers()
	{
		local TYPE="${1}"
		local LABEL_AMOUNT="${2}"
		local AMOUNT="${3}"
		local LABEL_MIDPOINT="${4}"
		local MIDPOINT="${5}"

		if ! is_number "${AMOUNT}" || ! is_within_range "${AMOUNT}" 0 100 ; then
			heading "Error"
			echo "${WSNs}${TYPE} ${LABEL_AMOUNT}${WSNe} (${AMOUNT}) must be 0 - 100."
			echo "It is '${AMOUNT}'."
			echo "FIX: Set to a vaild number.  ${WSVs}0${WSVe} disables stretching."
		elif [[ ${MIDPOINT: -1} == "%" ]]; then
			heading "Error"
			echo -n "${WSNs}${TYPE} ${LABEL_MIDPOINT}${WSNe} (${MIDPOINT})"
			echo    " no longer accepts a ${WSVs}%${WSVe}."
			echo    "FIX: remove the ${WSVs}%${WSVe}."
		fi
	}
	check_stretch_numbers "Daytime" \
		"${S_imagestretchamountdaytime_label}" "${S_imagestretchamountdaytime}" \
		"${S_imagestretchmidpointdaytime_label}" "${S_imagestretchmidpointdaytime}"
	check_stretch_numbers "Nighttime" \
		"${S_imagestretchamountnighttime_label}" "${S_imagestretchamountnighttime}" \
		"${S_imagestretchmidpointnighttime_label}" "${S_imagestretchmidpointnighttime}"

fi		# end of checking for error items


# ======================================================================
# ================= Summary (not displayed if called from WebUI)
NUM_FINDINGS=$((NUM_INFOS + NUM_WARNINGS + NUM_ERRORS))

if [[ ${FROM_WEBUI} == "true" ]]; then
	RET=${NUM_FINDINGS}
else
	RET=0
	if [[ ${NUM_FINDINGS} -eq 0 ]]; then
		echo "No issues found."
	else
		echo
		heading "Summary"
		[[ ${NUM_INFOS} -gt 0 ]] && echo "Informational messages: ${NUM_INFOS}"
		[[ ${NUM_WARNINGS} -gt 0 ]] && echo "Warnings: ${NUM_WARNINGS}" && RET=1
		[[ ${NUM_ERRORS} -gt 0 ]] && echo "Errors: ${NUM_ERRORS}" && RET=2
	fi
fi

exit ${RET}
