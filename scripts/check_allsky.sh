#!/bin/bash

# Check the Allsky installation and settings for missing items,
# inconsistent items, illegal items, etc.

# TODO: Within a heading, group by topic, e.g., all IMG_* together.
# TODO: Right now the checks within each heading are in the order I thought of them!

# Allow this script to be executed manually, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}")/.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit "${ALLSKY_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh" 				|| exit "${ALLSKY_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/installUpgradeFunctions.sh"	|| exit "${ALLSKY_ERROR_STOP}"

usage_and_exit()
{
	RET=${1}
	if [[ ${RET} == 0 ]]; then
		C="${YELLOW}"
	else
		C="${RED}"
	fi
	# Don't show the "--newer", "--no-check", or "--force-check" options since users
	# should never use them.
	echo
	echo -e "${C}Usage: ${ME} [--help] [--debug] [--no-check] [--no-info]${NC}"
	echo
	echo "'--help' displays this message and exits."
	echo "'--no-check' skips checking for newer version, typically used for testing."
	echo "'--no-info' skips checking for Informational items."
	echo
	exit "${RET}"
}

# Check arguments
OK="true"
HELP="false"
DEBUG="false"
NEWER=""
FORCE_CHECK="true"
CHECK_INFORMATIONAL="true"
CHECK_WARNINGS="true"
CHECK_ERRORS="true"
while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG}" in
		--help)
			HELP="true"
			;;
		--debug)
			DEBUG="true"
			;;
		--no-check)
			FORCE_CHECK="false"
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
		--force-check)
			FORCE_CHECK="true"
			;;
		--newer)			# This is passed in from the newer version
			NEWER="true"
			;;
		*)
			display_msg error "Unknown argument: '${ARG}'."
			OK="false"
			;;
	esac
	shift
done
[[ ${HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" ]] && usage_and_exit 1

BRANCH="$( get_branch "" )"
[[ -z ${BRANCH} ]] && BRANCH="${GITHUB_MAIN_BRANCH}"
[[ ${DEBUG} == "true" ]] && echo "DEBUG: using '${BRANCH}' branch."

# Unless forced to, only do the version check if we're on the main branch,
# not on development branches, because when we're updating this script we
# don't want to have the updates overwritten from an older version on GitHub.
if [[ ${FORCE_CHECK} == "true" ]]; then
	CURRENT_SCRIPT="${ALLSKY_SCRIPTS}/${ME}"
	if [[ -n ${NEWER} ]]; then
		# This is a newer version
		echo "[${CURRENT_SCRIPT}] being replaced by newer version from GitHub."
		cp "${BASH_ARGV0}" "${CURRENT_SCRIPT}"
		chmod 775 "${CURRENT_SCRIPT}"

	else
		# See if there's a newer version of this script; if so, download it and execute it.
		FILE_TO_CHECK="$( basename "${ALLSKY_SCRIPTS}" )/${ME}"
		NEWER_SCRIPT="/tmp/${ME}"
		checkAndGetNewerFile --branch "${BRANCH}" "${CURRENT_SCRIPT}" "${FILE_TO_CHECK}" "${NEWER_SCRIPT}"
		RET=$?
		[[ ${RET} -eq 2 ]] && exit 2
		if [[ ${RET} -eq 1 ]]; then
			exec "${NEWER_SCRIPT}" --newer
			# Does not return
		fi
	fi
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
			if [[ $NUM_INFOS -eq 1 ]]; then
				DISPLAY_HEADER="true"
				SUB_HEADER=" (items that will not stop any part of Allsky from running)"
			fi
			;;
		Warnings)
			((NUM_WARNINGS++))
			if [[ $NUM_WARNINGS -eq 1 ]]; then
				DISPLAY_HEADER="true"
				SUB_HEADER=" (items that may keep parts of Allsky running)"
			fi
			;;
		Errors)
			((NUM_ERRORS++))
			if [[ $NUM_ERRORS -eq 1 ]]; then
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
		echo -e "\n---------- ${HEADER}${SUB_HEADER} ----------\n"
	else
		echo "-----"	# Separates lines within a header group
	fi
}


# =================================================== FUNCTIONS

# Determine if the specified value is a number.
function is_number()
{
	local VALUE="${1}"
	[[ -z ${VALUE} ]] && return 1
	shopt -s extglob
	local NON_NUMERIC="${VALUE/?([-+])*([0-9])?(.)*([0-9])/}"
	if [[ -z ${NON_NUMERIC} ]]; then
		# Nothing but +, -, 0-9, .
		return 0
	else
		# Has non-numeric character
		return 1
	fi
}

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

# Check that when a variable holds a location, the location exists.
function check_exists() {
	local VALUE="${!1}"
	if [[ ${VALUE:0:1} == "~" ]]; then
		VALUE="${HOME}${VALUE:1}"
	fi
	if [[ -n ${VALUE} && ! -e ${VALUE} ]]; then
		heading "Warnings"
		echo "${1} is set to '${VALUE}' but it does not exist."
	fi
}

# Make sure the env file exists.
function check_for_env_file()
{
	[[ -s ${ALLSKY_ENV} ]] && return 0

	heading "Errors"
	if [[ ! -f ${ALLSKY_ENV} ]]; then
		echo "'${ALLSKY_ENV}' not found!"
	else
		echo "'${ALLSKY_ENV}' is empty!"
	fi
	echo "Unable to check any remote server settings."
	return 1
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

	if [[ ${DAY_OR_NIGHT} == "daytime" ]]; then
		DELAY_MS="${DAY_DELAY_MS}"
		MIN_MS="${DAY_MIN_IMAGE_TIME_MS}"
	else
		DELAY_MS="${NIGHT_DELAY_MS}"
		MIN_MS="${NIGHT_MIN_IMAGE_TIME_MS}"
	fi

# TODO: use the module average flow times for day and night when using "module" method.

	# With the legacy overlay method it might take up to a couple seconds to save an image.
	# With the module method it can take up to 5 seconds.
	OVERLAY_METHOD=$( settings ".overlaymethod" ) || echo "Problem getting .overlayMethod." >&2
	if [[ ${OVERLAY_METHOD} -eq 1 ]]; then
		MAX_TIME_TO_PROCESS_MS=5000
	else
		MAX_TIME_TO_PROCESS_MS=2000
	fi
	if [[ ${MIN_MS} -lt ${MAX_TIME_TO_PROCESS_MS} ]]; then
		heading "Warnings"
		echo "The ${DAY_OR_NIGHT}delay of ${DELAY_MS} ms may be too short given the maximum"
		echo "expected time to save and process an image (${MAX_TIME_TO_PROCESS_MS} ms)."
		echo "A new image may appear before the prior one has finished processing."
		echo "Consider increasing your delay."
	fi
}

function get_setting()
{
	local S="${1}"
	local V="$( settings "${S}" )" || echo "Problem getting ${S}." >&2
	echo "${V}"
}

#
# ====================================================== MAIN PART OF PROGRAM
#

# Settings used in multiple sections.
# For the most part we use the names that used to be in config.sh since we're familiar with them.

# User-specified width and height are usually 0 which means use SENSOR size.
WIDTH="$( get_setting ".width" )"
HEIGHT="$( get_setting ".height" )"

# Physical sensor size.
SENSOR_WIDTH="$( settings ".sensorWidth" "${CC_FILE}" )" || echo "Problem getting .sensorWidth." >&2
SENSOR_HEIGHT="$( settings ".sensorHeight" "${CC_FILE}" )" || echo "Problem getting .sensorHeight." >&2

IMG_RESIZE_WIDTH="$( get_setting ".imageresizewidth" )"
IMG_RESIZE_HEIGHT="$( get_setting ".imageresizeheight" )"
CROP_TOP="$( get_setting ".imagecroptop" )"
CROP_RIGHT="$( get_setting ".imagecropright" )"
CROP_BOTTOM="$( get_setting ".imagecropbottom" )"
CROP_LEFT="$( get_setting ".imagecropleft" )"
ANGLE="$( get_setting ".angle" )"
LATITUDE="$( get_setting ".latitude" )"
LONGITUDE="$( get_setting ".longitude" )"
UPLOAD_VIDEO="$( get_setting ".timelapseupload" )"
TIMELAPSE_UPLOAD_THUMBNAIL="$( get_setting ".timelapseuploadthumbnail" )"
TIMELAPSE_MINI_UPLOAD_VIDEO="$( get_setting ".minitimelapseupload" )"
TIMELAPSE_MINI_UPLOAD_THUMBNAIL="$( get_setting ".minitimelapseuploadthumbnail" )"
KEOGRAM="$( get_setting ".keogramgenerate" )"
UPLOAD_KEOGRAM="$( get_setting ".keogramupload" )"
STARTRAILS="$( get_setting ".startrailsgenerate" )"
UPLOAD_STARTRAILS="$( get_setting ".startrailsupload" )"
TAKE="$( get_setting ".takedaytimeimages" )"
SAVE="$( get_setting ".savedaytimeimages" )"
BRIGHTNESS_THRESHOLD="$( get_setting ".startrailsbrightnessthreshold" )"

# ======================================================================
# ================= Check for informational items.

if [[ ${CHECK_INFORMATIONAL} == "true" ]]; then

	# Settings used in this section.
	WEBSITES="$( whatWebsites )"
	# shellcheck disable=SC2034
	TAKING_DARKS="$( get_setting ".takedarkframes" )"
	KEEP_SEQUENCE="$( get_setting ".timelapsekeepsequencee" )"
	THUMBNAIL_SIZE_X="$( get_setting ".thumbnailsizex" )"
	THUMBNAIL_SIZE_Y="$( get_setting ".thumbnailsizey" )"
	DAYS_TO_KEEP="$( get_setting ".daystokeep" )"
	LOCAL_WEB_DAYS_TO_KEEP="$( get_setting ".daystokeeplocalwebsite" )"
	REMOTE_WEB_DAYS_TO_KEEP="$( get_setting ".daystokeepremotewebsite" )"
	KEOGRAM_EXTRA_PARAMETERS="$( get_setting ".keogramextraparameters" )"

	# Is Allsky set up to take dark frames?  This isn't done often, so if it is, inform the user.
	if [[ ${TAKING_DARKS} == "true" ]]; then
		heading "Information"
		echo "'Take Dark Frames' is set."
		echo -e "\tUnset when you are done taking dark frames."
	fi

	if [[ ${KEEP_SEQUENCE} == "true" ]]; then
		heading "Information"
		echo "'Keep Timelapse Sequence' in enabled."
		echo -e "\tIf you are not testing / debugging timelapse videos consider disabling this"
		echo -e "\tto save disk space."
	fi

	if [[ ${THUMBNAIL_SIZE_X} -ne 100 || ${THUMBNAIL_SIZE_Y} -ne 75 ]]; then
		heading "Information"
		echo -n "You are using a non-standard thumbnail size (${THUMBNAIL_SIZE_X} x ${THUMBNAIL_SIZE_Y})."
		echo -e "\tPlease note non-standard sizes have not been thoroughly tested and"
		echo -e "\tyou will likely need to modify some code to get them working."
	fi

	if [[ ${DAYS_TO_KEEP} -eq 0 ]]; then
		heading "Information"
		echo "'Days To Keep' is 0 which means images and videos will"
		echo -e "\tbe kept forever or until you manually delete them."
	fi

	if [[ (${WEBSITES} == "both" || ${WEBSITES} == "local") &&
			${LOCAL_WEB_DAYS_TO_KEEP} -eq 0 ]]; then
		heading "Information"
		echo "'Days To Keep on Pi Website' is 0 which means local web images and videos will"
		echo -e "\tbe kept forever or until you manually delete them."
	fi
	if [[ (${WEBSITES} == "both" || ${WEBSITES} == "remote") &&
			${REMOTE_WEB_DAYS_TO_KEEP} -eq 0 ]]; then
		heading "Information"
		echo "'Days To Keep on Remote Website' is 0 which means remote web images and videos will"
		echo -e "\tbe kept forever or until you manually delete them."
	fi

	if [[ ${IMG_RESIZE_WIDTH} -gt 0 && ${IMG_RESIZE_HEIGHT} -eq 0 ]]; then
		heading "Information"
		echo "'Image Resize Width' set to ${IMG_RESIZE_WIDTH} but 'Image Resize Height' is 0."
		echo -e "\tThe image will NOT be resized."
	elif [[ ${IMG_RESIZE_WIDTH} -eq 0 && ${IMG_RESIZE_HEIGHT} -gt 0 ]]; then
		heading "Information"
		echo "'Image Resize Width' is 0 but 'Image Resize Height' is ${IMG_RESIZE_HEIGHT}."
		echo -e "\tThe image will NOT be resized."
	elif [[ ${IMG_RESIZE_WIDTH} -gt 0 && ${IMG_RESIZE_HEIGHT} -gt 0 ]]; then
		if [[ ${SENSOR_WIDTH} == "${IMG_RESIZE_WIDTH}" && ${SENSOR_HEIGHT} == "${IMG_RESIZE_HEIGHT}" ]]; then
			heading "Information"
			echo "Images will be resized to the same size as the sensor; this does nothing useful."
			echo -e "\tCheck 'Image Reize Width' (${IMG_RESIZE_WIDTH}) and"
			echo -e "\t'Image Reize Height' (${IMG_RESIZE_HEIGHT})."
		fi
	fi

	if [[ ${CROP_TOP} -gt 0 || ${CROP_RIGHT} -gt 0 || ${CROP_BOTTOM} -gt 0 || ${CROP_LEFT} -gt 0 ]]; then
		ERR="$( checkCropValues "${CROP_TOP}" "${CROP_RIGHT}" "${CROP_BOTTOM}" "${CROP_LEFT}" \
				"${SENSOR_WIDTH}" "${SENSOR_HEIGHT}" )"
		if [[ $? -ne 0 ]]; then
			heading "Information"
			echo "${ERR}"
			echo -e "\tCheck the 'Image Crop Top/Right/Bottom/Left' settings."
		fi
	fi

	if [[ -n ${KEOGRAM_EXTRA_PARAMETERS} ]]; then
		FOUND="false"
		# These used to be set in the default KEOGRAM_EXTRA_PARAMETERS.
		echo "${KEOGRAM_EXTRA_PARAMETERS}" |
			grep -E --silent "image-expand|-x|font-size|-S|font-line|-L|font-color|-C" && FOUND="true"
		if [[ ${FOUND} == "true" ]]; then
			heading "Information"
			echo "Check your 'Keogram Extra Parameters' setting:"
			echo -e "\t--image-expand"
			echo -e "\t--font-size"
			echo -e "\t--font-line"
			echo -e "\t--font-color"
			echo -e "are separate settings now."
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
	REMOVE_BAD_IMAGES_LOW="$( get_setting ".imageremovebadlow" )"
	REMOVE_BAD_IMAGES_HIGH="$( get_setting ".imageremovebadhigh" )"
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
		echo -e "\tSee the 'Allsky Settings' page in the WebUI."
	fi

	if reboot_needed ; then
		heading "Warning"
		echo "The Pi needs to be rebooted before Allsky will start."
	fi

	check_delay "daytime"
	check_delay "nighttime"


	##### Timelapse and mini-timelapse
	if [[ ${VCODEC} == "libx264" ]]; then
		# Check if timelapse size is "too big" and will likely cause an error.
		# This is normally only an issue with the libx264 video codec which has
		# a dimension limit that we put in PIXEL_LIMIT.
		PIXEL_LIMIT=$((4096 * 2304))		# Limit of libx264
# TODO: This PIXEL_LIMIT might only apply to Buster. Bullseye (I believe) has a larger limit.

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
				W=$(( SENSOR_WIDTH - CROP_LEFT - CROP_RIGHT))
			fi
			if [[ ${RESIZED_HEIGHT} -ne 0 ]]; then
				H="${RESIZED_HEIGHT}"
			elif [[ ${HEIGHT} -gt 0 ]]; then
				H="${HEIGHT}"
			else
				H=$(( SENSOR_HEIGHT - CROP_TOP - CROP_BOTTOM))
			fi

			local TIMELAPSE_PIXELS=$(( W * H ))
			if [[ ${TIMELAPSE_PIXELS} -gt ${PIXEL_LIMIT} ]]; then
				heading "Warnings"
				echo "The ${TYPE} width (${W}) and height (${H}) may cause errors while creating the video."
				echo "Consider either decreasing the video size or decreasing"
				echo "each captured image via resizing and/or cropping."
			fi
		}

	fi

	# Timelapse
	if [[ ${TIMELAPSE} == "true" ]]; then
		if [[ ${VCODEC} == "libx264" ]]; then
			check_timelapse_size "timelapse" "${TIMELAPSEWIDTH}" "${TIMELAPSEHEIGHT}"
		fi
		if [[ ${UPLOAD_VIDEO} == "false" ]]; then
			heading "Warnings"
			echo "Timelapse videos are being created (Generate Timelapse='true') but not uploaded (Upload Timelapse='false')"
		fi
		if echo "${TIMELAPSE_BITRATE}" | grep -i --silent "k" ; then
			heading "Warnings"
			echo "Timelapse bitrate should be only a number and no longer have 'k'."
		fi
	elif [[ ${UPLOAD_VIDEO} == "true" ]]; then
		heading "Warnings"
		echo "Timelapse videos are not being created (Generate Timelapse='false') but Upload Timelapse='true'"
	fi

	# Mini-timelapse
	if [[ ${TIMELAPSE_MINI_IMAGES} -gt 0 ]]; then
		if [[ ${VCODEC} == "libx264" ]]; then
			check_timelapse_size "mini timelapse" "${TIMELAPSE_MINI_WIDTH}" "${TIMELAPSE_MINI_HEIGHT}"
		fi
		if [[ ${TIMELAPSE_MINI_UPLOAD_VIDEO} == "false" ]]; then
			heading "Warnings"
			echo "Mini timelapse videos are being created (TIMELAPSE='true') but not uploaded (Upload Timelapse='false')"
		fi
		if echo "${TIMELAPSE_MINI_BITRATE}" | grep -i --silent "k" ; then
			heading "Warnings"
			echo "Timelapse bitrate should be only a number and no longer have 'k'."
		fi


		# See if there's likely to be a problem with mini timelapse creations
		# starting before the prior one finishes.
		# This is dependent on:
		#	1. Delay:		the delay between images: min(daydelay, nightdelay)
		#	2. Frequency:	how often mini timelapse are created (i.e., after how many images)
		# 	3. NumImages:	how many images are used (the more the longer processing takes)
		# 	4. the speed of the Pi - this is the biggest unknown

		function get_exposure() {	# return the time spent on one image, prior to delay
			local TIME="${1}"
			if [[ $( settings ".${TIME}autoexposure") -eq 1 ]]; then
				settings ".${TIME}maxautoexposure" || echo "Problem getting .${TIME}maxautoexposure." >&2
			else
				settings ".${TIME}exposure" || echo "Problem getting .${TIME}exposure." >&2
			fi
		}
		# Minimum total time between start of timelapse creations.
		MIN_IMAGE_TIME_SEC=$(( MIN_IMAGE_TIME_MS / 1000 ))
		MIN_TIME_BETWEEN_TIMELAPSE_SEC=$( echo "scale=0; ${TIMELAPSE_MINI_FREQUENCY} * ${MIN_IMAGE_TIME_SEC}" | bc -l)
		MIN_TIME_BETWEEN_TIMELAPSE_SEC=${MIN_TIME_BETWEEN_TIMELAPSE_SEC/.*/}

if false; then		# for testing
	echo "CONSISTENT_DELAYS=${CONSISTENT_DELAYS}"
	echo "MIN_IMAGE_TIME_MS=${MIN_IMAGE_TIME_MS}"
	echo "MIN_IMAGE_TIME_SEC=${MIN_IMAGE_TIME_SEC}"
	echo "MIN_TIME_BETWEEN_TIMELAPSE_SEC=${MIN_TIME_BETWEEN_TIMELAPSE_SEC}"
	echo "TIMELAPSE_MINI_IMAGES=${TIMELAPSE_MINI_IMAGES}"
	echo "CAMERA_TYPE=${CAMERA_TYPE}"
	TIMELAPSE_MINI_IMAGES=120
fi

		# On a Pi 4, creating a 50 image timelapse takes
		#	- a few seconds on a small ZWO camera
		#	- about a minute with an RPi HQ camera

		if [[ ${CAMERA_TYPE} == "ZWO" ]]; then
			S=3
		else
			S=60
		fi
		EXPECTED_TIME=$( echo "scale=0; (${TIMELAPSE_MINI_IMAGES} / 50) * ${S}" | bc -l)
		if [[ ${EXPECTED_TIME} -gt ${MIN_TIME_BETWEEN_TIMELAPSE_SEC} ]]; then
			heading "Warnings"
			echo "Your mini timelapse settings may cause multiple timelapse to be created simultaneously."
			echo "Consider increasing the Delay between pictures,"
			echo "increasing Mini-Timelapse Frequency,"
			echo "decreasing Number Of Images,"
			echo "or a combination of those changes."
			echo "Expected time to create a mini timelapse on a Pi 4 is ${EXPECTED_TIME} seconds"
			echo "but with your settings one could be created as short as"
			echo "every ${MIN_TIME_BETWEEN_TIMELAPSE_SEC} seconds."
		fi
	elif [[ ${TIMELAPSE_MINI_UPLOAD_VIDEO} == "true" ]]; then
		heading "Warnings"
		echo "Mini timelapse videos are not being created (Number of Images=0) but Upload Mini-Timelapse='true'"
	fi

	##### Keograms
	if [[ ${KEOGRAM} == "true" && ${UPLOAD_KEOGRAM} == "false" ]]; then
		heading "Warnings"
		echo "Keograms are being created (KEOGRAM='true') but not uploaded (UPLOAD_KEOGRAM='false' )"
	fi
	if [[ ${KEOGRAM} == "false" && ${UPLOAD_KEOGRAM} == "true" ]]; then
		heading "Warnings"
		echo "Keograms are not being created (KEOGRAM='false') but UPLOAD_KEOGRAM='true'"
	fi

	##### Startrails
	if [[ ${STARTRAILS} == "true" && ${UPLOAD_STARTRAILS} == "false" ]]; then
		heading "Warnings"
		echo "Startrails are being created (Generate Startrails='true') but not uploaded (Upload Startrails='false' )"
	fi
	if [[ ${STARTRAILS} == "false" && ${UPLOAD_STARTRAILS} == "true" ]]; then
		heading "Warnings"
		echo "Startrails are not being created (Generate Startrails='false') but Upload Startrails='true'"
	fi

	if [[ ${BRIGHTNESS_THRESHOLD} == "0" ]]; then
		heading "Warnings"
		echo "BRIGHTNESS_THRESHOLD is 0 which means ALL images will be IGNORED when creating startrails."
	elif [[ ${BRIGHTNESS_THRESHOLD} == "1" ]]; then
		heading "Warnings"
		echo "BRIGHTNESS_THRESHOLD is 1 which means ALL images will be USED when creating startrails, even daytime images."
	fi

	##### Images
	if [[ ${TAKE} == "false" && ${SAVE} == "true" ]]; then
		heading "Warnings"
		echo "'Daytime Capture' is off but 'Daytime Save' is on in the WebUI."
	fi

	# These can be floats which bash doesn't support, so treat as strings.
	if [[ ${REMOVE_BAD_IMAGES_LOW} == "0" ]]; then
		heading "Warnings"
		echo "'Remove Bad Images Threshold Low' is 0 (disabled)."
		echo We HIGHLY recommend setting it to a value greater than 0 unless you are debugging issues.
	fi
	if [[ ${REMOVE_BAD_IMAGES_HIGH} == "0" ]]; then
		heading "Warnings"
		echo "'Remove Bad Images Threshold High' is 0 (disabled)."
		echo We HIGHLY recommend setting it to a value greater than 0 unless you are debugging issues.
	fi

	##### Uploads
	if [[ ${RESIZE_UPLOADS_WIDTH} -ne 0 || ${RESIZE_UPLOADS_WIDTH} -ne 0 ]]; then
		if [[ ${IMG_UPLOAD_FREQUENCY} -eq 0 ]]; then
			heading "Warnings"
			echo "'Resize Uploaded Images Width/Height' is set but you aren't uploading images (Upload Every X Images=0)."
		fi
		if [[ ${RESIZE_UPLOADS_WIDTH} -eq 0 && ${RESIZE_UPLOADS_HEIGHT} -ne 0 ]]; then
			heading "Warnings"
			echo "'Resize Uploaded Images Width' = 0 but 'Resize Uploaded Images Height' > 0."
			echo "'If one is set the other one must also be set."
		elif [[ ${RESIZE_UPLOADS_WIDTH} -ne 0 && ${RESIZE_UPLOADS_HEIGHT} -eq 0 ]]; then
			heading "Warnings"
			echo "'Resize Uploaded Images Height' > 0 but 'Resize Uploaded Images Width' = 0."
			echo "'If one is set the other one must also be set."
		fi
	fi

	X="$( check_remote_server "REMOTEWEBSITE"  )"
	RET=$?
	if [[ ${RET} -eq 1 ]]; then
		heading "Warnings"
		echo -e "${X}"
	elif [[ ${RET} -eq 2 ]]; then
		heading "Errors"
		echo -e "${X}"
	fi

	X="$( check_remote_server "REMOTESERVER" )"
	RET=$?
	if [[ ${RET} -eq 1 ]]; then
		heading "Warnings"
		echo -e "${X}"
	elif [[ ${RET} -eq 2 ]]; then
		heading "Errors"
		echo -e "${X}"
	fi


	##### If these variables are set, their corresponding directory should exist.
	check_exists "UHUBCTL_PATH"

	##### Check for Allsky Website-related issues.
	if [[ -f ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE} && (${PROTOCOL} == "" || ${PROTOCOL} == "local") ]]; then
		heading "Warnings"
		echo "A remote Allsky Website configuration file was found but PROTOCOL doesn't support uploading files."
	fi
fi		# end of checking for warning items



# ======================================================================
# ================= Check for error items.
#	These are wrong and will likely keep Allsky from running.

if [[ ${CHECK_ERRORS} == "true" ]]; then

	# Settings used in this section.
	USING_DARKS="$( get_setting ".usedarkframes" )"
	IMG_UPLOAD_ORIGINAL_NAME="$( get_setting ".imageuploadoriginalname" )"
	IMG_CREATE_THUMBNAILS="$( get_setting ".imagecreatethumbnails" )"
	KEEP_SEQUENCE="$( get_setting ".timelapsekeepsequence" )"
	TIMELAPSE_MINI_FORCE_CREATION="$( get_setting ".minitimelapseforcecreation" )"
	# shellcheck disable=SC2034
	LOCALE="$( get_setting ".locale" )"

	##### Make sure it's a know camera type.
	if [[ ${CAMERA_TYPE} != "ZWO" && ${CAMERA_TYPE} != "RPi" ]]; then
		heading "Errors"
		echo "INTERNAL ERROR: CAMERA_TYPE (${CAMERA_TYPE}) not valid."
	fi

	##### Make sure the settings file is properly linked.
	if ! MSG="$( check_settings_link "${SETTINGS_FILE}" )" ; then
		heading "Errors"
		echo -e "${MSG}"
	fi

	function check_bool()
	{
		local B="${1}"
		local NAME="${2}"
		if [[ ${B,,} != "true" && ${B,,} != "false" ]]; then
			heading "Errors"
			echo "'${NAME}' must be either 'true' or 'false'."
		fi
	}

	##### Make sure these booleans have boolean values.
		# TODO: use options.json to determine which are type=boolean.
	check_bool "${USING_DARKS}" "Use Dark Frames"
	check_bool "${IMG_UPLOAD_ORIGINAL_NAME}" "Upload With Original Name"
	check_bool "${IMG_CREATE_THUMBNAILS}" "Create Image Thumbnails"
	check_bool "${TIMELAPSE}" "Generate Timelapse"
	check_bool "${UPLOAD_VIDEO}" "Upload Timelapse"
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
			heading "Errors"
			echo "${i} must be set."
		fi
	done

	##### Check that the required settings' values are valid.
	if [[ -n ${ANGLE} ]] && ! is_number "${ANGLE}" ; then
		heading "Errors"
		echo "ANGLE (${ANGLE}) must be a number."
	fi
	if [[ -n ${LATITUDE} ]]; then
		if ! LAT="$( convertLatLong "${LATITUDE}" "latitude" 2>&1 )" ; then
			heading "Errors"
			echo -e "${LAT}"		# ${LAT} contains the error message
		fi
	fi
	if [[ -n ${LONGITUDE} ]]; then
		if ! LONG="$( convertLatLong "${LONGITUDE}" "longitude" 2>&1 )" ; then
			heading "Errors"
			echo -e "${LONG}"
		fi
	fi

	##### Check dark frames
	if [[ ${USING_DARKS} == "true" ]]; then
		if [[ ! -d ${ALLSKY_DARKS} ]]; then
			heading "Errors"
			echo "'Use Dark Frames' is set but the '${ALLSKY_DARKS}' directory does not exist."
		else
			NUM_DARKS=$( find "${ALLSKY_DARKS}" -name "*.${EXTENSION}" 2>/dev/null | wc -l)
			if [[ ${NUM_DARKS} -eq 0 ]]; then
				heading "Errors"
				echo -n "'Use Dark Frames' is set but there are no darks"
				echo " in '${ALLSKY_DARKS}' with extension of '${EXTENSION}'."
			fi
		fi
	fi

	##### Check for valid numbers.
	if ! is_number "${IMG_UPLOAD_FREQUENCY}" || [[ ${IMG_UPLOAD_FREQUENCY} -le 0 ]]; then
		heading "Errors"
		echo "IMG_UPLOAD_FREQUENCY (${IMG_UPLOAD_FREQUENCY}) must be 1 or greater."
	fi
	if [[ ${AUTO_STRETCH} == "true" ]]; then
		if ! is_number "${AUTO_STRETCH_AMOUNT}" || \
				[[ ${AUTO_STRETCH_AMOUNT} -le 0 ]] || \
				[[ ${AUTO_STRETCH_AMOUNT} -gt 100 ]] ; then
			heading "Errors"
			echo "AUTO_STRETCH_AMOUNT (${AUTO_STRETCH_AMOUNT}) must be 1 - 100."
		fi
		if ! echo "${AUTO_STRETCH_MID_POINT}" | grep --silent "%" ; then
			heading "Errors"
			echo "AUTO_STRETCH_MID_POINT (${AUTO_STRETCH_MID_POINT}) must be an integer percent,"
			echo "for example:  10%."
		fi
	fi
	if ! is_number "${BRIGHTNESS_THRESHOLD}" || \
			! echo "${BRIGHTNESS_THRESHOLD}" | \
			awk '{if ($1 < 0.0 || $1 > 1.0) exit 1; exit 0; }' ; then
		heading "Errors"
		echo "BRIGHTNESS_THRESHOLD (${BRIGHTNESS_THRESHOLD}) must be 0.0 - 1.0"
	fi
	if [[ ${REMOVE_BAD_IMAGES} == "true" ]]; then
		if ! is_number "${REMOVE_BAD_IMAGES_THRESHOLD_LOW}" || \
			! echo "${REMOVE_BAD_IMAGES_THRESHOLD_LOW}" | \
			awk '{if ($1 < 0.0) exit 1; exit 0; }' ; then
			heading "Errors"
			echo "REMOVE_BAD_IMAGES_THRESHOLD_LOW (${REMOVE_BAD_IMAGES_THRESHOLD_LOW}) must be 0 - 100.0,"
			echo "although it's normally around 0.5.  0 disables the low threshold check."
		fi
		if ! is_number "${REMOVE_BAD_IMAGES_THRESHOLD_HIGH}" || \
			! echo "${REMOVE_BAD_IMAGES_THRESHOLD_HIGH}" | \
			awk '{if ($1 < 0.0) exit 1; exit 0; }' ; then
			heading "Errors"
			echo "REMOVE_BAD_IMAGES_THRESHOLD_HIGH (${REMOVE_BAD_IMAGES_THRESHOLD_HIGH}) must be 0 - 100.0,"
			echo "although it's normally around 90.  0 disables the high threshold check."
		fi
	fi
fi		# end of checking for warning items


# ======================================================================
# ================= Summary
RET=0
if [[ $((NUM_INFOS + NUM_WARNINGS + NUM_ERRORS)) -eq 0 ]]; then
	echo "No issues found."
else
	echo
	heading "Summary"
	[[ ${NUM_INFOS} -gt 0 ]] && echo "Informational messages: ${NUM_INFOS}"
	[[ ${NUM_WARNINGS} -gt 0 ]] && echo "Warnings: ${NUM_WARNINGS}" && RET=1
	[[ ${NUM_ERRORS} -gt 0 ]] && echo "Errors: ${NUM_ERRORS}" && RET=2
fi

exit ${RET}
