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

if [[ ${FROM_WEBUI} == "true" ]]; then
	NL="<br>"
	TAB="&nbsp; &nbsp; &nbsp;"
	STRONGs="<strong>"
	STRONGe="</strong>"
	WSNs="<span class='WebUISetting'>"		# Web Setting Name start
	WSNe="</span>"
	WSVs="<span class='WebUIValue'>"		# Web Setting Value start
	WSVe="</span>"
else
	NL="\n"
	TAB="    "
	STRONGs=""
	STRONGe=""
	WSNs="'"
	WSNe="'"
	WSVs=""
	WSVe=""
fi

NUM_INFOS=0
NUM_WARNINGS=0
NUM_ERRORS=0

function heading()
{
	local HEADER="${1}"
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
	echo "Unable to check any remote server settings."
	return 1
}

function get_setting()
{
	local S="${1}"
	local F="${2}"
	local V="$( settings "${S}" "${F}" )" || echo "Problem getting ${S}." >&2
	echo "${V}"
}

# Return 0 if the number is 0.0, else return 1.
function is_zero()
{
	local NUM="${1}"
	awk -v n="${NUM}" 'BEGIN {if (n == 0.0) exit 0; else exit 1; }'
}

# Return 0 if the number 0.0 - 1.0, else return 1.
function is_within_range()
{
	local NUM="${1}"
	awk -v n="${NUM}" 'BEGIN {if (n < 0.0 || n > 1.0) exit 1; exit 0; }'
}

DAY_DELAY_MS=$( settings ".daydelay" ) || echo "Problem getting .daydelay"
NIGHT_DELAY_MS=$( settings ".nightdelay" ) || echo "Problem getting .nightdelay"

# Typical minimum daytime and nighttime exposures.
DAY_MIN_EXPOSURE_MS=250
NIGHT_MIN_EXPOSURE_MS=5000
# Minimum total time spent on each image.
DAY_MIN_IMAGE_TIME_MS=$(( DAY_MIN_EXPOSURE_MS + DAY_DELAY_MS ))
NIGHT_MIN_IMAGE_TIME_MS=$(( NIGHT_MIN_EXPOSURE_MS + NIGHT_DELAY_MS ))
MIN_IMAGE_TIME_MS="$( min "${DAY_MIN_IMAGE_TIME_MS}" "${NIGHT_MIN_IMAGE_TIME_MS}" )"

##### Check if the delay is so short it's likely to cause problems.
function check_delay()
{
	local DAY_OR_NIGHT="${1}"
	local DELAY_MS MIN_MS OVERLAY_METHOD

	if [[ ${DAY_OR_NIGHT,,} == "daytime" ]]; then
		DELAY_MS="${DAY_DELAY_MS}"
		MIN_MS="${DAY_MIN_IMAGE_TIME_MS}"
	else
		DELAY_MS="${NIGHT_DELAY_MS}"
		MIN_MS="${NIGHT_MIN_IMAGE_TIME_MS}"
	fi

# TODO: use the module average flow times for day and night when using "module" method.
# TODO: overlaymethod goes away in next release

	# With the legacy overlay method it might take up to a couple seconds to save an image.
	# With the module method it can take up to 5 seconds.
	OVERLAY_METHOD="$( get_setting ".overlaymethod" )"
	if [[ ${OVERLAY_METHOD} -eq 1 ]]; then
		MAX_TIME_TO_PROCESS_MS=5000
	else
		MAX_TIME_TO_PROCESS_MS=2000
	fi
	if [[ ${MIN_MS} -lt ${MAX_TIME_TO_PROCESS_MS} ]]; then
		heading "Warning"
		echo "The ${WSNs}${DAY_OR_NIGHT} Delay${WSNe} of ${DELAY_MS} ms may be too short given the"
		echo "maximum expected time to save and process an image (${MAX_TIME_TO_PROCESS_MS} ms)."
		echo "A new image may appear before the prior one has finished processing."
		echo "FIX: Consider increasing your delay."
	fi
}

#
# ====================================================== MAIN PART OF PROGRAM
#

# Settings used in multiple sections.
# For the most part we use the names that used to be in config.sh since we're familiar with them.

SENSOR_WIDTH="$( get_setting ".sensorWidth" "${CC_FILE}" )"	# Physical sensor size.
SENSOR_HEIGHT="$( get_setting ".sensorHeight" "${CC_FILE}" )"
# User-specified width and height are usually 0 which means use SENSOR size.
WIDTH="$( get_setting ".width" )"
HEIGHT="$( get_setting ".height" )"

IMG_RESIZE_WIDTH="$( get_setting ".imageresizewidth" )"
IMG_RESIZE_HEIGHT="$( get_setting ".imageresizeheight" )"
CROP_TOP="$( get_setting ".imagecroptop" )"
CROP_RIGHT="$( get_setting ".imagecropright" )"
CROP_BOTTOM="$( get_setting ".imagecropbottom" )"
CROP_LEFT="$( get_setting ".imagecropleft" )"
ANGLE="$( get_setting ".angle" )"
LATITUDE="$( get_setting ".latitude" )"
LONGITUDE="$( get_setting ".longitude" )"
TIMELAPSE_UPLOAD_VIDEO="$( get_setting ".timelapseupload" )"
TIMELAPSE_UPLOAD_THUMBNAIL="$( get_setting ".timelapseuploadthumbnail" )"
TIMELAPSE_MINI_UPLOAD_VIDEO="$( get_setting ".minitimelapseupload" )"
TIMELAPSE_MINI_UPLOAD_THUMBNAIL="$( get_setting ".minitimelapseuploadthumbnail" )"
KEEP_SEQUENCE="$( get_setting ".timelapsekeepsequence" )"
KEOGRAM="$( get_setting ".keogramgenerate" )"
UPLOAD_KEOGRAM="$( get_setting ".keogramupload" )"
STARTRAILS="$( get_setting ".startrailsgenerate" )"
UPLOAD_STARTRAILS="$( get_setting ".startrailsupload" )"
TAKE="$( get_setting ".takedaytimeimages" )"
SAVE="$( get_setting ".savedaytimeimages" )"
BRIGHTNESS_THRESHOLD="$( get_setting ".startrailsbrightnessthreshold" )"

USE_LOCAL_WEBSITE="$( get_setting ".uselocalwebsite" )"
USE_REMOTE_WEBSITE="$( get_setting ".useremotewebsite" )"
USE_REMOTE_SERVER="$( get_setting ".useremoteserver" )"
if [[ ${USE_LOCAL_WEBSITE} == "true" ||
	  ${USE_REMOTE_WEBSITE} == "true" ||
	  ${USE_REMOTE_SERVER} == "true" ]]; then
	USE_SOMETHING="true"
else
	USE_SOMETHING="false"
fi

# ======================================================================
# ================= Check for informational items.

if [[ ${CHECK_INFORMATIONAL} == "true" ]]; then

	# Settings used in this section.
	WEBSITES="$( whatWebsites )"
	# shellcheck disable=SC2034
	TAKING_DARKS="$( get_setting ".takedarkframes" )"
	THUMBNAIL_SIZE_X="$( get_setting ".thumbnailsizex" )"
	THUMBNAIL_SIZE_Y="$( get_setting ".thumbnailsizey" )"
	DAYS_TO_KEEP="$( get_setting ".daystokeep" )"
	LOCAL_WEB_DAYS_TO_KEEP="$( get_setting ".daystokeeplocalwebsite" )"
	REMOTE_WEB_DAYS_TO_KEEP="$( get_setting ".daystokeepremotewebsite" )"
	KEOGRAM_EXTRA_PARAMETERS="$( get_setting ".keogramextraparameters" )"

	# Is Allsky set up to take dark frames?  This isn't done often, so if it is, inform the user.
	if [[ ${TAKING_DARKS} == "true" ]]; then
		heading "Information"
		echo "${WSNs}Take Dark Frames${WSNe} is enabled."
		echo "FIX: Unset when you are done taking dark frames."
	fi

	if [[ ${KEEP_SEQUENCE} == "true" ]]; then
		heading "Information"
		echo    "${WSNs}Keep Sequence${WSNe} in enabled."
		echo -n "FIX: If you are not debugging timelapse videos consider disabling this"
		echo    " to save disk space."
	fi

	if [[ ${THUMBNAIL_SIZE_X} -ne 100 || ${THUMBNAIL_SIZE_Y} -ne 75 ]]; then
		heading "Information"
		echo "You are using a non-standard thumbnail size of ${THUMBNAIL_SIZE_X}x${THUMBNAIL_SIZE_Y}."
		echo "Please note non-standard sizes have not been thoroughly tested and"
		echo "FIX: You may need to modify some code to get your thumbnail sizes working."
	fi

	FOREVER="be kept forever or until you manually delete them"
	if [[ ${DAYS_TO_KEEP} -eq 0 ]]; then
		heading "Information"
		echo -n "${WSNs}Days To Keep${WSNe} is ${WSVs}0${WSVe}"
		echo    " which means images and videos will ${FOREVER}."
		echo    "FIX: If this is not what you want, change the setting."
	fi

	if [[ (${WEBSITES} == "both" || ${WEBSITES} == "local") &&
			${LOCAL_WEB_DAYS_TO_KEEP} -eq 0 ]]; then
		heading "Information"
		echo -n "${WSNs}Days To Keep on Pi Website${WSNe} is ${WSVs}0${WSVe}"
		echo    " which means local web images and videos will ${FOREVER}."
		echo    "FIX: If this is not what you want, change the setting."
	fi
	# REMOTE_WEB_DAYS_TO_KEEP may not be implemented; if so, ignore.
	if [[ (${WEBSITES} == "both" || ${WEBSITES} == "remote") &&
			-n ${REMOTE_WEB_DAYS_TO_KEEP} && ${REMOTE_WEB_DAYS_TO_KEEP} -eq 0 ]]; then
		heading "Information"
		echo -n "${WSNs}Days To Keep on Remote Website${WSNe} is ${WSVs}0${WSVe}"
		echo    " which means remote web images and videos will ${FOREVER}."
		echo    "FIX: If this is not what you want, change the setting."
	fi

	if [[ ${IMG_RESIZE_WIDTH} -gt 0 && ${IMG_RESIZE_HEIGHT} -eq 0 ]]; then
		heading "Information"
		echo -n "${WSNs}Image Resize Width${WSNe} is ${WSVs}${IMG_RESIZE_WIDTH}${WSVe}"
		echo    " but ${WSNs}Image Resize Height${WSNe} is ${WSVs}0${WSVe}."
		echo    "The image will NOT be resized since the width would look unnatural."
		echo    "FIX: Either set both numbers to 0 to not resize, or set the height to something."
	elif [[ ${IMG_RESIZE_WIDTH} -eq 0 && ${IMG_RESIZE_HEIGHT} -gt 0 ]]; then
		heading "Information"
		echo -n "${WSNs}Image Resize Width${WSNe} is ${WSVs}0${WSVe}"
		echo    " but ${WSNs}Image Resize Height${WSNe} is ${WSVs}${IMG_RESIZE_HEIGHT}${WSVe}."
		echo    "The image will NOT be resized since the height would look unnatural."
		echo    "FIX: Either set both numbers to 0 to not resize, or set the width to something."
	elif [[ ${IMG_RESIZE_WIDTH} -gt 0 &&
			${IMG_RESIZE_HEIGHT} -gt 0 &&
			${SENSOR_WIDTH} == "${IMG_RESIZE_WIDTH}" &&
			${SENSOR_HEIGHT} == "${IMG_RESIZE_HEIGHT}" ]]; then
		heading "Information"
		echo    "Images will be resized to the same size as the sensor; this does nothing useful."
		echo -n "FIX: Check ${WSNs}Image Resize Width${WSNe} (${IMG_RESIZE_WIDTH}) and"
		echo    " ${WSNs}Image Resize Height${WSNe} (${IMG_RESIZE_HEIGHT})"
		echo    " and set them to something other than the sensor size of"
		echo    " ${WSVs}${SENSOR_WIDTH} x ${SENSOR_HEIGHT}${WSVe}."
	fi

	if [[ $((CROP_TOP + CROP_RIGHT + CROP_BOTTOM + CROP_LEFT)) -gt 0 ]]; then
		ERR="$( checkCropValues "${CROP_TOP}" "${CROP_RIGHT}" "${CROP_BOTTOM}" "${CROP_LEFT}" \
				"${SENSOR_WIDTH}" "${SENSOR_HEIGHT}" )"
		if [[ $? -ne 0 ]]; then
			heading "Information"
			echo "${ERR}"
			echo "FIX: Check the ${WSNs}Image Crop Top/Right/Bottom/Left${WSNe} settings."
		fi
	fi

	if [[ -n ${KEOGRAM_EXTRA_PARAMETERS} ]]; then
		# These used to be set in the default KEOGRAM_EXTRA_PARAMETERS.
		if echo "${KEOGRAM_EXTRA_PARAMETERS}" |
				grep -E --silent "image-expand|-x|font-size|-S|font-line|-L|font-color|-C" ; then
			heading "Information"
			echo "${WSNs}Keogram Extra Parameters${WSNe} contains one or more of:"
			echo "${TAB}${WSVs}--image-expand${WSVe} or ${WSVs}-x${WSVe}"
			echo "${TAB}${WSVs}--font-size${WSVe} or ${WSVs}-S${WSVe}"
			echo "${TAB}${WSVs}--font-line${WSVe} or ${WSVs}-L${WSVe}"
			echo "${TAB}${WSVs}--font-color${WSVe} or ${WSVs}-C${WSVe}"
			echo "FIX: These are now separate settings so move them to their own settings."
		fi
	fi
fi		# end of checking for informational items



# ======================================================================
# ================= Check for warning items.
#	These are wrong and won't stop Allsky from running, but
#	may break part of Allsky, e.g., uploads may not work.

if [[ ${CHECK_WARNINGS} == "true" ]]; then

	# Settings used in this section.
	LAST_CHANGED="$( get_setting ".lastchanged" )"
	BAD_IMAGES_LOW="$( get_setting ".imageremovebadlow" )"
	BAD_IMAGES_HIGH="$( get_setting ".imageremovebadhigh" )"
	TIMELAPSE="$( get_setting ".timelapsegenerate" )"
	TIMELAPSEWIDTH="$( get_setting ".timelapsewidth" )"
	TIMELAPSEHEIGHT="$( get_setting ".timelapseheight" )"
	VCODEC="$( get_setting ".timelapsevcodec" )"
	TIMELAPSE_BITRATE="$( get_setting ".timelapsebitrate" )"
	TIMELAPSE_MINI_IMAGES="$( get_setting ".minitimelapsenumimages" )"
	TIMELAPSE_MINI_WIDTH="$( get_setting ".minitimelapsewidth" )"
	TIMELAPSE_MINI_HEIGHT="$( get_setting ".minitimelapseheight" )"
	TIMELAPSE_MINI_BITRATE="$( get_setting ".minitimelapsebitrate" )"
	TIMELAPSE_MINI_FREQUENCY="$( get_setting ".minitimelapsefrequency" )"
	RESIZE_UPLOADS_WIDTH="$( get_setting ".imageresizeuploadswidth" )"
	RESIZE_UPLOADS_HEIGHT="$( get_setting ".imageresizeuploadsheight" )"
	IMG_UPLOAD_FREQUENCY="$( get_setting ".imageuploadfrequency" )"

	if [[ ${LAST_CHANGED} == "" ]]; then
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
		echo -n "Your Pi is running the old 'Buster' operating system;"
		echo    " this is the last release of Allsky that supports Buster."
		echo    "FIX: Upgrade your Pi to Bookworm, 64-bit if possible."
	fi

	check_delay "Daytime"
	check_delay "Nighttime"

	##### Timelapse and mini-timelapse
	if [[ ${VCODEC} == "libx264" ]]; then
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
			local TYPE="${1}"				# type of video
			local RESIZED_WIDTH="${2}"		# video width
			local RESIZED_HEIGHT="${3}"
			local W H

			# Determine the final image size and put in ${W} and ${H}.
			# This is dependent on the these, in this order:
			#		if the images is resized, use that size
			#			else if the size is set in the WebUI (WIDTH, HEIGHT), use that size
			#				else use sensor size minus crop amount(s)
			if [[ ${RESIZED_WIDTH} -ne 0 ]]; then
				W="${RESIZED_WIDTH}"
			elif [[ ${WIDTH} -gt 0 ]]; then
				W="${WIDTH}"
			else
				W=$(( SENSOR_WIDTH - CROP_LEFT - CROP_RIGHT ))
			fi
			if [[ ${RESIZED_HEIGHT} -ne 0 ]]; then
				H="${RESIZED_HEIGHT}"
			elif [[ ${HEIGHT} -gt 0 ]]; then
				H="${HEIGHT}"
			else
				H=$(( SENSOR_HEIGHT - CROP_TOP - CROP_BOTTOM ))
			fi

			# W * H == total pixels in timelapse
			if [[ $(( W * H )) -gt ${PIXEL_LIMIT} ]]; then
				heading "Warning"
				echo -n "The ${WSNs}${TYPE} Width${WSNe} of ${WSVs}${W}${WSVe}"
				echo -n " and ${WSNs}Height${WSNe} of ${WSVs}${H}${WSVe}"
				echo    " may cause errors while creating the video."
				echo -n "FIX: Consider either decreasing the video size or decreasing"
				echo    " each captured image via resizing and/or cropping."
			fi
		}

	fi

	# Check generate vs upload as well as the bitrate of a timelapse
	function check_timelapse_upload_bitrate()
	{
		local TYPE="${1}"				# type of timelapse
		local UPLOAD="${2}"
		local BITRATE="${3}"
		local W="${4}"
		local H="${5}"

		[[ ${VCODEC} == "libx264" ]] && check_timelapse_size "${TYPE}" "${W}" "${H}"

		# If the user doesn't have a Website or remote server there's nothing to upload
		# to so it's not an issue.
		if [[ ${UPLOAD} == "false" && ${USE_SOMETHING} == "true" ]]; then
			heading "Warning"
			echo -n "${TYPE} videos are being created"
			if [[ ${TYPE} == "Daily Timelapse" ]]; then
				echo -n " (${WSNs}Generate ${TYPE}${WSNe} = Yes)"
			else
				echo -n " (${WSNs}Number of Images${WSNe} is greater than 0)"
:
			fi
			echo    " but not uploaded anywhere (${WSNs}Upload${WSNe} = No)"
			echo    "FIX: Either disable timelapse generation or (more likely) enable upload."
		fi

		if [[ ${BITRATE: -1} == "k" ]]; then
			heading "Warning"
			echo "${WSNs}${TYPE} Bitrate${WSNe} should be a number with OUT ${WSVs}k${WSVe}."
			echo "FIX: Remove the ${WSVs}k${WSVe} from the bitrate."
		fi
	}

	# Timelapse
	if [[ ${TIMELAPSE} == "true" ]]; then			# Generating timelapse

		check_timelapse_upload_bitrate "Daily Timelapse" \
			"${TIMELAPSE_UPLOAD_VIDEO}" \
			"${TIMELAPSE_BITRATE}" \
			"${TIMELAPSEWIDTH}" "${TIMELAPSEHEIGHT}"

	elif [[ ${TIMELAPSE_UPLOAD_VIDEO} == "true" ]]; then
		heading "Warning"
		echo -n "Daily Timelapse videos are not being created (${WSNs}Generate${WSNe} = No)"
		echo    " but ${WSNs}Upload${WSNe} = Yes."
		echo    "FIX: Either create daily timelapse videos or disable upload."
	fi

	# Mini-timelapse
	if [[ ${TIMELAPSE_MINI_IMAGES} -gt 0 ]]; then		# Generating mini-timelapse

		check_timelapse_upload_bitrate "Mini-Timelapse" \
			"${TIMELAPSE_MINI_UPLOAD_VIDEO}" \
			"${TIMELAPSE_MINI_BITRATE}" \
			"${TIMELAPSE_MINI_WIDTH}" "${TIMELAPSE_MINI_HEIGHT}"

		# See if there's likely to be a problem with mini-timelapse creations
		# starting before the prior one finishes.
		# This is dependent on:
		#	1. Delay:		the delay between images: min(daydelay, nightdelay)
		#	2. Frequency:	how often mini-timelapse are created (i.e., after how many images)
		# 	3. NumImages:	how many images are used (the more the longer processing takes)
		# 	4. The speed of the Pi - this is the biggest unknown

		# Minimum total time between start of timelapse creations.
		MIN_IMAGE_TIME_SEC=$(( MIN_IMAGE_TIME_MS / 1000 ))
		MIN_TIME_BETWEEN_TIMELAPSE_SEC=$(( TIMELAPSE_MINI_FREQUENCY * MIN_IMAGE_TIME_SEC ))

		TYPICAL_T=50		# A guess at a "typical" number of images in a timelapse.

		# On a Pi 4, creating a ${TYPICAL_T}-image timelapse takes
		#	- a few seconds on a small ZWO camera
		#	- about a minute with an RPi HQ camera

		if [[ ${CAMERA_TYPE} == "ZWO" ]]; then
			S=3
		else
			S=60
		fi
		EXPECTED_TIME=$( echo "scale=0; (${TIMELAPSE_MINI_IMAGES} / ${TYPICAL_T}) * ${S}" | bc -l )
if false; then		# for testing
	echo "MIN_IMAGE_TIME_MS=${MIN_IMAGE_TIME_MS}"
	echo "MIN_IMAGE_TIME_SEC=${MIN_IMAGE_TIME_SEC}"
	echo "MIN_TIME_BETWEEN_TIMELAPSE_SEC=${MIN_TIME_BETWEEN_TIMELAPSE_SEC}"
	echo "TIMELAPSE_MINI_IMAGES=${TIMELAPSE_MINI_IMAGES}"
	echo "CAMERA_TYPE=${CAMERA_TYPE}"
	echo "EXPECTED_TIME=${EXPECTED_TIME}"
fi
		if [[ ${EXPECTED_TIME} -gt ${MIN_TIME_BETWEEN_TIMELAPSE_SEC} ]]; then
			heading "Warning"
			echo -n "Your mini-timelapse settings may cause multiple timelapse to"
			echo    " be created simultaneously."
			echo    "FIX: Consider increasing the ${WSNs}Delay${WSNe} between pictures,"
			echo    "${TAB}increasing ${WSNs}Frequency${WSNe},"
			echo    "${TAB}decreasing ${WSNs}Number Of Images${WSNe},"
			echo    "${TAB}or a combination of those changes."
			echo    "${TAB}Expected time to create a mini-timelapse on a Pi 4 is"
			echo    "${TAB}${EXPECTED_TIME} seconds but with your settings one could be created"
			echo    "${TAB}as short as every ${MIN_TIME_BETWEEN_TIMELAPSE_SEC} seconds."
		fi
	elif [[ ${TIMELAPSE_MINI_UPLOAD_VIDEO} == "true" ]]; then
		heading "Warning"
		echo -n "Mini-timelapse videos are not being created (${WSNs}Number of Images${WSNe} = 0)"
		echo    " but ${WSNs}Upload${WSNe} = Yes"
		echo    "FIX: Either create videos or disable upload."
	fi

	##### Keograms
	if [[ ${KEOGRAM} == "true" && ${UPLOAD_KEOGRAM} == "false" && ${USE_SOMETHING} == "true" ]]; then
		heading "Warning"
		echo -n "Keograms are being created (${WSNs}Generate${WSNe} = Yes)"
		echo    " but not uploaded (${WSNs}Upload${WSNe} = No)"
		echo    "FIX: Either disable keogram generation or (more likely) enable upload."
	fi
	if [[ ${KEOGRAM} == "false" && ${UPLOAD_KEOGRAM} == "true" ]]; then
		heading "Warning"
		echo -n "Keograms are not being created (${WSNs}Generate${WSNe} = No)"
		echo    " but ${WSNs}Upload${WSNe} = Yes"
		echo    "FIX: Either enable keogram generation of disable upload."
	fi

	##### Startrails
	if [[ ${STARTRAILS} == "true" && ${UPLOAD_STARTRAILS} == "false" && ${USE_SOMETHING} == "true" ]]; then
		heading "Warning"
		echo -n "Startrails are being created (${WSNs}Generate${WSNe} = Yes)"
		echo    " but not uploaded (${WSNs}Upload${WSNe} = No)"
		echo    "FIX: Either disable startrails generation or (more likely) enable upload."
	fi
	if [[ ${STARTRAILS} == "false" && ${UPLOAD_STARTRAILS} == "true" ]]; then
		heading "Warning"
		echo -n "Startrails are not being created (${WSNs}Generate${WSNe} = No)"
		echo    " but ${WSNs}Upload${WSNe} = Yes"
		echo    "FIX: Either enable startrails generation of disable upload."
	fi

	if ! is_number "${BRIGHTNESS_THRESHOLD}" ; then
		X=2
	else
		awk -v x="${BRIGHTNESS_THRESHOLD}" ' BEGIN {
			if (x == 0.0) exit 0;
			else if (x == 1.0) exit 1;
			else if (x < 0.0 || x > 1.0) exit 2;
			exit 3;
			}'
		X=$?
	fi
	if [[ ${X} -eq 0 ]]; then
		heading "Warning"
		echo -n "${WSNs}Brightness Threshold${WSNe} is 0.0 which means ALL images"
		echo    " will be IGNORED when creating startrails."
		echo    "FIX: Increase the value; start off at 0.1 and adjust if needed."
	elif [[ ${X} -eq 1 ]]; then
		heading "Warning"
		echo -n "${WSNs}Brightness Threshold${WSNe} is 1.0 which means ALL images"
		echo    " will be USED when creating startrails, even daytime images."
		echo    "FIX: Increase the value; start off at 0.9 and adjust if needed."
	elif [[ ${X} -eq 2 ]]; then
		heading "Warning"
		echo -n "${WSNs}Brightness Threshold${WSNe} is ${BRIGHTNESS_THRESHOLD}"
		echo    " which is an invalid number."
		echo    "FIX: See the documenation for valid numbers."
	fi

	##### Images
	if [[ ${TAKE} == "false" && ${SAVE} == "true" ]]; then
		heading "Warning"
		echo -n "${WSNs}Daytime Capture${WSNe} of images is off"
		echo    " but ${WSNs}Daytime Save${WSNe} is on in the WebUI."
		echo    "FIX: Either enable capture or disable saving."
	fi

	# These are floats which bash doesn't support, so use awk to compare.
	if ! is_number "${BAD_IMAGES_LOW}" || ! is_within_range "${BAD_IMAGES_LOW}" ; then
		heading "Error"
		echo -n "${WSNs}Remove Bad Images Threshold Low${WSNe} (${BAD_IMAGES_LOW})"
		echo    " must be 0.0 - 1.0, although it's normally around ${WSVs}0.1${WSVe}."
		echo    "FIX: Set to a vaild number.  ${WSVs}0${WSVe} disables the low threshold check."
	elif is_zero "${BAD_IMAGES_LOW}" ; then
		heading "Warning"
		echo "${WSNs}Remove Bad Images Threshold Low${WSNe} is 0 (disabled)."
		echo "FIX: Set to a value greater than 0 unless you are debugging issues."
		echo "${TAB}Try 0.1 and adjust if needed."
	fi
	if ! is_number "${BAD_IMAGES_HIGH}" || ! is_within_range "${BAD_IMAGES_HIGH}" ; then
		heading "Error"
		echo -n "${WSNs}Remove Bad Images Threshold High${WSNe} (${BAD_IMAGES_HIGH})"
		echo    " must be 0.0 - 1.0, although it's normally around ${WSVs}0.9${WSVe}."
		echo    "FIX: Set to a vaild number.  ${WSVs}0${WSVe} disables the high threshold check."
	elif is_zero "${BAD_IMAGES_HIGH}" ; then
		heading "Warning"
		echo "${WSNs}Remove Bad Images Threshold High${WSNe} is 0 (disabled)."
		echo "FIX: Set to a value greater than 0 unless you are debugging issues."
		echo "${TAB}Try 0.9 and adjust if needed."
	fi

	##### Uploads
	if [[ ${RESIZE_UPLOADS_WIDTH} -ne 0 || ${RESIZE_UPLOADS_WIDTH} -ne 0 ]]; then
		if [[ ${IMG_UPLOAD_FREQUENCY} -eq 0 ]]; then
			heading "Warning"
			echo -n "${WSNs}Resize Uploaded Images Width/Height${WSNe} is set"
			echo    " but you aren't uploading images (${WSNs}Upload Every X Images${WSNe} = 0)."
			echo    "FIX: "
			echo    "FIX: Either don't resize uploaded images or enable upload."
		fi
		if [[ ${RESIZE_UPLOADS_WIDTH} -eq 0 && ${RESIZE_UPLOADS_HEIGHT} -ne 0 ]]; then
			heading "Warning"
			echo -n "${WSNs}Resize Uploaded Images Width${WSNe} = 0"
			echo    " but ${WSNs}Resize Uploaded Images Height${WSNe} is greater than 0."
			echo    "If one is set the other one must also be set."
			echo    "FIX: Set both to 0 to disable resizing uploads or both to some value."
		elif [[ ${RESIZE_UPLOADS_WIDTH} -ne 0 && ${RESIZE_UPLOADS_HEIGHT} -eq 0 ]]; then
			heading "Warning"
			echo -n "${WSNs}Resize Uploaded Images Height${WSNe} > 0"
			echo    " but ${WSNs}Resize Uploaded Images Width${WSNe} = 0."
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

	# Settings used in this section.
	USING_DARKS="$( get_setting ".usedarkframes" )"
	UPLOAD_ORIGINAL_NAME_WEBSITE="$( get_setting ".remotewebsiteimageuploadoriginalname" )"
	UPLOAD_ORIGINAL_NAME_SERVER="$( get_setting ".remoteserverimageuploadoriginalname" )"
	IMG_CREATE_THUMBNAILS="$( get_setting ".imagecreatethumbnails" )"
	TIMELAPSE_MINI_FORCE_CREATION="$( get_setting ".minitimelapseforcecreation" )"
	STRETCH_AMOUNT_DAYTIME="$( get_setting ".imagestretchamountdaytime" )"
	STRETCH_MIDPOINT_DAYTIME="$( get_setting ".imagestretchmidpointdaytime" )"
	STRETCH_AMOUNT_NIGHTTIME="$( get_setting ".imagestretchamountnighttime" )"
	STRETCH_MIDPOINT_NIGHTTIME="$( get_setting ".imagestretchmidpointnighttime" )"

	# shellcheck disable=SC2034
	LOCALE="$( get_setting ".locale" )"

	##### Make sure it's a know camera type.
	if [[ ${CAMERA_TYPE} != "ZWO" && ${CAMERA_TYPE} != "RPi" ]]; then
		heading "Error"
		echo "INTERNAL ERROR: CAMERA_TYPE (${CAMERA_TYPE}) not valid."
		echo "Fix: Re-installing Allsky."
	fi

	##### Make sure the settings file is properly linked.
	if ! MSG="$( check_settings_link "${SETTINGS_FILE}" )" ; then
		heading "Error"
		echo -e "${MSG}"
	fi

	function check_bool()
	{
		local B="${1}"
		local NAME="${2}"
		if [[ ${B,,} != "true" && ${B,,} != "false" ]]; then
			heading "Error"
			echo "INTERNAL ERROR: ${WSNs}${NAME}${WSNe} must be either 'true' or 'false'."
			echo "Fix: Re-installing Allsky."
		fi
	}

	##### Make sure these booleans have boolean values.
		# TODO: use options.json to determine which are type=boolean.
	check_bool "${USING_DARKS}" "Use Dark Frames"
	check_bool "${UPLOAD_ORIGINAL_NAME_WEBSITE}" "Upload With Original Name (to website)"
	check_bool "${UPLOAD_ORIGINAL_NAME_SERVER}" "Upload With Original Name (to server)"
	check_bool "${IMG_CREATE_THUMBNAILS}" "Create Image Thumbnails"
	check_bool "${TIMELAPSE}" "Generate Timelapse"
	check_bool "${TIMELAPSE_UPLOAD_VIDEO}" "Upload Timelapse"
	check_bool "${KEEP_SEQUENCE}" "Keep Timelapse Sequence"
	check_bool "${TIMELAPSE_UPLOAD_THUMBNAIL}" "Upload Timelapse Thumbnail"
	check_bool "${TIMELAPSE_MINI_FORCE_CREATION}" "Force Creation (of mini-timelapse)"
	check_bool "${TIMELAPSE_MINI_UPLOAD_VIDEO}" "Upload Mini-Timelapse"
	check_bool "${TIMELAPSE_MINI_UPLOAD_THUMBNAIL}" "Upload Mini-Timelapse Thumbnail"
	check_bool "${KEOGRAM}" "Generate Keogram"
	check_bool "${UPLOAD_KEOGRAM}" "Upload Keogram"
	check_bool "${STARTRAILS}" "Generate Startrails"
	check_bool "${UPLOAD_STARTRAILS}" "Upload Startrails"

	##### Check that all required settings are set.  All others are optional.
	# TODO: determine from options.json file which are required.
	for i in ANGLE LATITUDE LONGITUDE LOCALE
	do
		if [[ -z ${!i} ]]; then
			heading "Error"
			echo "${i} must be set."
			echo "FIX: Set it in the WebUI then rerun ${ME}."
		fi
	done

	##### Check that the required settings' values are valid.
	if [[ -n ${ANGLE} ]] && ! is_number "${ANGLE}" ; then
		heading "Error"
		echo "${WSNs}Angle${WSNe} (${ANGLE}) must be a number."
		echo "FIX: Set to a number in the WebUI then rerun ${ME}."
	fi
	if [[ -n ${LATITUDE} ]] && ! LAT="$( convertLatLong "${LATITUDE}" "latitude" 2>&1 )" ; then
		heading "Error"
		echo -e "${LAT}"		# ${LAT} contains the error message
		echo    "FIX: Correct the latitude then rerun ${ME}."
	fi
	if [[ -n ${LONGITUDE} ]] && ! LONG="$( convertLatLong "${LONGITUDE}" "longitude" 2>&1 )" ; then
		heading "Error"
		echo -e "${LONG}"
		echo    "FIX: Correct the longitude then rerun ${ME}."
	fi

	##### Check dark frames
	if [[ ${USING_DARKS} == "true" ]]; then
		if [[ ! -d ${ALLSKY_DARKS} ]]; then
			heading "Error"
			echo -n "${WSNs}Use Dark Frames${WSNe} is set but the '${ALLSKY_DARKS}'"
			echo    " directory does not exist."
			echo    "FIX: Either disable the setting or take dark frames."
		else
			NUM_DARKS=$( find "${ALLSKY_DARKS}" -name "*.${EXTENSION}" 2>/dev/null | wc -l)
			if [[ ${NUM_DARKS} -eq 0 ]]; then
				heading "Error"
				echo -n "${WSNs}Use Dark Frames${WSNe} is set but there are no darks"
				echo    " in '${ALLSKY_DARKS}' with extension of '${EXTENSION}'."
				echo    "FIX: Either disable the setting or take dark frames."
			fi
		fi
	fi

	##### Check for valid numbers.
	if ! is_number "${IMG_UPLOAD_FREQUENCY}" || [[ ${IMG_UPLOAD_FREQUENCY} -lt 0 ]]; then
		heading "Error"
		echo "${WSNs}Upload Every X Images${WSNe} (${IMG_UPLOAD_FREQUENCY}) must be 0 or greater."
		echo "FIX: Set to ${WSVs}0${WSVe} to disable image uploads or set to a positive number."
	fi

	function check_stretch_numbers()
	{
		local TYPE="${1}"
		local AMOUNT="${2}"
		local MIDPOINT="${3}"

		if ! is_number "${AMOUNT}" || ! is_within_range "${AMOUNT}" ; then
			heading "Error"
			echo "${WSNs}${TYPE} Stretch Amount${WSNe} (${AMOUNT}) must be 0.0 - 1.0."
			echo "FIX: Set to a vaild number.  ${WSVs}0${WSVe} disables stretching."
		elif [[ ${MIDPOINT: -1} == "%" ]]; then
			heading "Error"
			echo -n "${WSNs}${TYPE} Stretch mid point${WSNe} (${MIDPOINT})"
			echo    " no longer accepts a ${WSVs}%${WSVe}."
			echo    "FIX: remove the ${WSVs}%${WSVe}."
		fi
	}
	check_stretch_numbers "Daytime" "${STRETCH_AMOUNT_DAYTIME}" "${STRETCH_MIDPOINT_DAYTIME}"
	check_stretch_numbers "Nighttime" "${STRETCH_AMOUNT_NIGHTTIME}" "${STRETCH_MIDPOINT_NIGHTTIME}"

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
