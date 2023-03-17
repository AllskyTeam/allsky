#!/bin/bash

# Check the Allsky installation and settings for missing items,
# inconsistent items, illegal items, etc.

# TODO: Within a heading, group by topic, e.g., all IMG_* together.
# TODO: Right now the checks within each heading are in the order I thought of them!

# Allow this script to be executed manually, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$(realpath "$(dirname "${BASH_ARGV0}")/..")"
ME="$(basename "${BASH_ARGV0}")"

#shellcheck disable=SC2086 source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit ${ALLSKY_ERROR_STOP}
#shellcheck disable=SC2086 source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh" 				|| exit ${ALLSKY_ERROR_STOP}
#shellcheck disable=SC2086 source-path=scripts
source "${ALLSKY_SCRIPTS}/installUpgradeFunctions.sh"	|| exit ${ALLSKY_ERROR_STOP}

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
	echo -e "${C}Usage: ${ME} [--help] [--debug]${NC}"
	echo
	echo "'--help' displays this message and exits."
	echo
	# shellcheck disable=SC2086
	exit ${RET}
}

# Check arguments
OK="true"
HELP="false"
DEBUG="false"
NEWER=""
FORCE_CHECK="true"
while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG}" in
		--help)
			HELP="true"
			;;
		--debug)
			DEBUG="true"
			;;
		--newer)
			NEWER="true"
			;;
		--no-check)
			FORCE_CHECK="false"
			;;
		--force-check)
			FORCE_CHECK="true"
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

#shellcheck disable=SC2086,SC1091		# file doesn't exist in GitHub
source "${ALLSKY_CONFIG}/config.sh"	 					|| exit ${ALLSKY_ERROR_STOP}
#shellcheck disable=SC2086,SC1091		# file doesn't exist in GitHub
source "${ALLSKY_CONFIG}/ftp-settings.sh" 				|| exit ${ALLSKY_ERROR_STOP}


BRANCH="$( get_branch "${ALLSKY_BRANCH_FILE}" )"
[[ -z ${BRANCH} ]] && BRANCH="${GITHUB_MAIN_BRANCH}"
[[ ${DEBUG} == "true" ]] && echo "DEBUG: using '${BRANCH}' branch."

# Unless forced to, only do the version check if we're on the main branch,
# not on development branches, because when we're updating this script we
# don't want to have the updates overwritten from an older version on GitHub.
if [[ ${FORCE_CHECK} == "true" || ${BRANCH} == "${GITHUB_MAIN_BRANCH}" ]]; then
	CURRENT_SCRIPT="${ALLSKY_SCRIPTS}/${ME}"
	if [[ -n ${NEWER} ]]; then
		# This is a newer version
		echo "[${CURRENT_SCRIPT}] being replaced by newer version from GitHub."
		cp "${BASH_ARGV0}" "${CURRENT_SCRIPT}"
		chmod 775 "${CURRENT_SCRIPT}"

	else
		# See if there's a newer version of this script; if so, download it and execute it.
		FILE_TO_CHECK="$(basename "${ALLSKY_SCRIPTS}")/${ME}"
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
			NUM_INFOS=$((NUM_INFOS + 1))
			if [[ $NUM_INFOS -eq 1 ]]; then
				DISPLAY_HEADER="true"
				SUB_HEADER=" (items that will not stop any part of Allsky from running)"
			fi
			;;
		Warnings)
			NUM_WARNINGS=$((NUM_WARNINGS + 1))
			if [[ $NUM_WARNINGS -eq 1 ]]; then
				DISPLAY_HEADER="true"
				SUB_HEADER=" (items that may keep parts of Allsky running)"
			fi
			;;
		Errors)
			NUM_ERRORS=$((NUM_ERRORS + 1))
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

# Determine if the specified value is a number
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

# Return 0 if a local or remote website is detected.
WEBSITE_TYPE=""
function has_website()
{
	if [[ -n ${WEBSITE_TYPE} ]]; then
		[[ ${WEBSITE_TYPE} == "none" ]] && return 1
		echo "${WEBSITE_TYPE}"
		RET=0
	fi

	WEBSITES="$(whatWebsites)"
	if [[ ${WEBSITES} == "none" ]]; then
		return 1
	fi

	# Also return string stating if it's local or remote website.
	[[ ${WEBSITES} == "local" || ${WEBSITES} == "both" ]] && WEBSITE_TYPE="local"
	if [[ ${WEBSITES} == "remote" || ${WEBSITES} == "both" ]]; then
		if [[ -n ${WEBSITE_TYPE} ]]; then
			WEBSITE_TYPE="${WEBSITE_TYPE} and remote"
		else
			WEBSITE_TYPE="remote"
		fi
	fi
	echo "${WEBSITE_TYPE}"

	return 0
}


# The various upload protocols need different variables defined.
# For the specified protocol, make sure the specified variable is defined.
function check_PROTOCOL()
{
	P="${1}"	# Protocol
	V="${2}"	# Variable
	if [[ -z ${!V} ]]; then
		heading "Warnings"
		echo "PROTOCOL (${P}) set but not '${V}'."
		echo "Uploads will not work."
		return 1
	fi
	return 0
}

# Check that when a variable holds a location, the location exists.
function check_exists() {
	local VALUE="${!1}"
	if [[ -n ${VALUE} && ! -e ${VALUE} ]]; then
		heading "Warnings"
		echo "${1} is set to '${VALUE}' but it does not exist."
	fi
}

# Variables used below.
TAKING_DARKS="$(settings .takeDarkFrames)"
WIDTH="$(settings .width)"		# per the WebUI, usually 0
HEIGHT="$(settings .height)"
SENSOR_WIDTH="$(settings .sensorWidth "${CC_FILE}")"	# physical sensor size
SENSOR_HEIGHT="$(settings .sensorHeight "${CC_FILE}")"
TAKE="$(settings .takeDaytimeImages)"
SAVE="$(settings .saveDaytimeImages)"
ANGLE="$(settings .angle)"
LATITUDE="$(settings .latitude)"
LONGITUDE="$(settings .longitude)"
# shellcheck disable=SC2034
LOCALE="$(settings .locale)"
USING_DARKS="$(settings .useDarkFrames)"

# ======================================================================
# ================= Check for informational items.
#	There is nothing wrong with these, it's just that they typically don't exist.

# Is Allsky set up to take dark frames?  This isn't done often, so if it is, inform the user.
if [[ ${TAKING_DARKS} -eq 1 ]]; then
	heading "Information"
	echo "'Take Dark Frames' is set."
	echo "Unset if you no longer wish to take dark frames."
fi

if [[ ${KEEP_SEQUENCE} == "true" ]]; then
	heading "Information"
	echo "KEEP_SEQUENCE in config.sh is 'true'."
	echo "If you are not testing / debugging timelapse videos consider changing this to 'false'"
	echo "to save disk space."
fi

if [[ ${THUMBNAIL_SIZE_X} -ne 100 || ${THUMBNAIL_SIZE_Y} -ne 75 ]]; then
	heading "Information"
	echo "You are using a non-standard thumbnail size (${THUMBNAIL_SIZE_X} x ${THUMBNAIL_SIZE_Y}) in config.sh."
	echo "Please note non-standard sizes have not been thoroughly tested and"
	echo "you will likely need to modify some code to get them working."
fi

if [[ ${DAYS_TO_KEEP} -eq 0 ]]; then
	heading "Information"
	echo "DAYS_TO_KEEP is 0 which means images and videos will be kept forever or until"
	echo "you manually delete them."
fi

if [[ ${WEB_DAYS_TO_KEEP} -eq 0 ]]; then
	heading "Information"
	echo "WEB_DAYS_TO_KEEP is 0 which means web images and videos will be kept forever or until"
	echo "you manually delete them."
fi

if [[ ${IMG_RESIZE} == "true" && ${SENSOR_WIDTH} == "${IMG_WIDTH}" && ${SENSOR_HEIGHT} == "${IMG_HEIGHT}" ]]; then
	heading "Information"
	echo "Images will be resized to the same size as the sensor; this does nothing useful."
	echo "Check IMG_RESIZE, IMG_WIDTH (${IMG_WIDTH}), and IMG_HEIGHT (${IMG_HEIGHT})."
fi
#shellcheck disable=SC2153		# it thinks CROP_HEIGHT may be misspelled
if [[ ${CROP_IMAGE} == "true" && ${SENSOR_WIDTH} == "${CROP_WIDTH}" && ${SENSOR_HEIGHT} == "${CROP_HEIGHT}" ]]; then
	heading "Information"
	echo "Images will be cropped to the same size as the sensor; this does nothing useful."
	echo "Check CROP_IMAGE, CROP_WIDTH (${CROP_WIDTH}), and CROP_HEIGHT (${CROP_HEIGHT})."
fi


# ======================================================================
# ================= Check for warning items.
#	These are wrong and won't stop Allsky from running, but
#	may break part of Allsky, e.g., uploads may not work.


# Check if timelapse size is "too big" and will likely cause an error.
# This is normally only an issue with the libx264 video codec which has a dimension limit
# that we put in PIXEL_LIMIT
if [[ ${VCODEC} == "libx264" ]]; then
	PIXEL_LIMIT=$((4096 * 2304))
	function check_timelapse_size()
	{
		local TYPE="${1}"			# type of video
		local V_WIDTH="${2}"		# video width
		local W_WIDTH="${3}"		# width per the WebUI, adjusted for if it's 0
		local V_HEIGHT="${4}"
		local W_HEIGHT="${5}"

		if [[ ${V_WIDTH} -eq 0 ]]; then
			W="${W_WIDTH}"
		else
			W="${V_WIDTH}"
		fi
		if [[ ${V_HEIGHT} -eq 0 ]]; then
			H="${W_HEIGHT}"
		else
			H="${V_HEIGHT}"
		fi
		TIMELAPSE_PIXELS=$(( W * H ))
		if [[ ${TIMELAPSE_PIXELS} -gt ${PIXEL_LIMIT} ]]; then
			heading "Warnings"
			echo "The ${TYPE} width (${W}) and height (${H}) may cause errors while creating the video."
			echo "Consider either decreasing the video size via TIMELAPSEWIDTH and TIMELAPSEHEIGHT"
			echo "or decrease each captured image via the WebUI and/or IMG_RESIZE and/or CROP_IMAGE."
		fi
	}

	# Determine the final image size.
	# This is dependent on the these, in this order:
	#	if: CROP_IMAGE=true (CROP_WIDTH, CROP_HEIGHT) use it.
	#		else if:  IMG_RESIZE=true (IMG_WIDTH, IMG_HEIGHT), use it
	#			else if: size set in WebUI (width, height), use it
	#				else use sensor size

	if [[ ${CROP_IMAGE} == "true" ]]; then
		W="${CROP_WIDTH}"
		H="${CROP_HEIGHT}"
	elif [[ ${IMG_RESIZE} == "true" ]]; then
		W="${IMG_WIDTH}"
		H="${IMG_HEIGHT}"
	else
		if [[ ${WIDTH} -gt 0 ]]; then
			W="${WIDTH}"
		else
			W="${SENSOR_WIDTH}"
		fi
		if [[ ${HEIGHT} -gt 0 ]]; then
			H="${HEIGHT}"
		else
			H="${SENSOR_HEIGHT}"
		fi
	fi

	if [[ ${TIMELAPSE} == "true" ]]; then
		check_timelapse_size "timelapse" "${TIMELAPSEWIDTH}" "${W}" "${TIMELAPSEHEIGHT}" "${H}"
	fi
	if [[ ${TIMELAPSE_MINI_IMAGES} -gt 0 ]]; then
		check_timelapse_size "mini timelapse" "${TIMELAPSE_MINI_WIDTH}" "${W}" "${TIMELAPSE_MINI_HEIGHT}" "${H}"
	fi
fi

if [[ ${TIMELAPSE} == "true" && ${UPLOAD_VIDEO} == "false" ]]; then
	heading "Warnings"
	echo "Timelapse videos are being created (TIMELAPSE='true') but not uploaded (UPLOAD_VIDEO='false')"
fi
if [[ ${TIMELAPSE} == "false" && ${UPLOAD_VIDEO} == "true" ]]; then
	heading "Warnings"
	echo "Timelapse videos are not being created (TIMELAPSE='false') but UPLOAD_VIDEO='true'"
fi

if [[ ${KEOGRAM} == "true" && ${UPLOAD_KEOGRAM} == "false" ]]; then
	heading "Warnings"
	echo "Keograms are being created (KEOGRAM='true') but not uploaded (UPLOAD_KEOGRAM='false')"
fi
if [[ ${KEOGRAM} == "false" && ${UPLOAD_KEOGRAM} == "true" ]]; then
	heading "Warnings"
	echo "Keograms are not being created (KEOGRAM='false') but UPLOAD_KEOGRAM='true'"
fi

if [[ ${STARTRAILS} == "true" && ${UPLOAD_STARTRAILS} == "false" ]]; then
	heading "Warnings"
	echo "Startrails are being created (STARTRAILS='true') but not uploaded (UPLOAD_STARTRAILS='false')"
fi
if [[ ${STARTRAILS} == "false" && ${UPLOAD_STARTRAILS} == "true" ]]; then
	heading "Warnings"
	echo "Startrails are not being created (STARTRAILS='false') but UPLOAD_STARTRAILS='true'"
fi

if [[ ${RESIZE_UPLOADS} == "true" && ${IMG_UPLOAD} == "false" ]]; then
	heading "Warnings"
	echo "RESIZE_UPLOADS is 'true' but you aren't uploading images (IMG_UPLOAD='false')."
fi

if [[ ${TAKE} -eq 0 && ${SAVE} -eq 1 ]]; then
	heading "Warnings"
	echo "'Daytime Capture' is off but 'Daytime Save' is on in the WebUI."
fi

if [[ ${BRIGHTNESS_THRESHOLD} == "0.0" ]]; then
	heading "Warnings"
	echo "BRIGHTNESS_THRESHOLD is 0.0 which means ALL images will be IGNORED when creating startrails."
elif [[ ${BRIGHTNESS_THRESHOLD} == "1.0" ]]; then
	heading "Warnings"
	echo "BRIGHTNESS_THRESHOLD is 1.0 which means ALL images will be USED when creating startrails, even daytime images."
fi

if [[ -f ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE} && (${PROTOCOL} == "" || ${PROTOCOL} == "local") ]]; then
	heading "Warnings"
	echo "A remote Allsky Website configuration file was found but PROTOCOL doesn't support uploading files."
fi

if [[ ${REMOVE_BAD_IMAGES} != "true" ]]; then
	heading "Warnings"
	echo "REMOVE_BAD_IMAGES is not 'true'."
	echo We HIGHLY recommend setting it to 'true' unless you are debugging issues.
fi


PROTOCOL="${PROTOCOL,,}"
case "${PROTOCOL}" in

	"" | local)		# Nothing needed for these
		;;

	ftp | ftps | sftp)
		check_PROTOCOL "${PROTOCOL}" "REMOTE_HOST"
		check_PROTOCOL "${PROTOCOL}" "REMOTE_USER"
		check_PROTOCOL "${PROTOCOL}" "REMOTE_PASSWORD"
		;;

	scp)
		check_PROTOCOL "${PROTOCOL}" "REMOTE_HOST"
		if check_PROTOCOL "${PROTOCOL}" "SSH_KEY_FILE" && [[ ! -e ${SSH_KEY_FILE} ]]; then
			heading "Warnings"
			echo "PROTOCOL (${PROTOCOL}) set but 'SSH_KEY_FILE' (${SSH_KEY_FILE}) does not exist."
			echo "Uploads will not work."
		fi
		;;

	s3)
		if check_PROTOCOL "${PROTOCOL}" "AWS_CLI_DIR" && [[ ! -e ${AWS_CLI_DIR} ]]; then
			heading "Warnings"
			echo "PROTOCOL (${PROTOCOL}) set but 'AWS_CLI_DIR' (${AWS_CLI_DIR}) does not exist."
			echo "Uploads will not work."
		fi
		check_PROTOCOL "${PROTOCOL}" "S3_BUCKET"
		check_PROTOCOL "${PROTOCOL}" "S3_ACL"
		;;

	gcs)
		check_PROTOCOL "${PROTOCOL}" "GCS_BUCKET"
		check_PROTOCOL "${PROTOCOL}" "GCS_ACL"
		;;

	*)
		heading "Warnings"
		echo "PROTOCOL (${PROTOCOL}) not blank or one of: local, ftp, ftps, sftp, scp, s3, gcs."
		echo "Uploads will not work until this is corrected."
		;;
esac

if [[ -n ${REMOTE_PORT} ]] && ! is_number "${REMOTE_PORT}" ; then
	heading "Warnings"
	echo "REMOTE_PORT (${REMOTE_PORT}) must be a number."
	echo "Uploads will not work until this is corrected."
fi

# If these variables are set, their corresponding directory should exist.
check_exists "WEB_IMAGE_DIR"
check_exists "WEB_VIDEOS_DIR"
check_exists "WEB_KEOGRAM_DIR"
check_exists "WEB_STARTRAILS_DIR"
check_exists "UHUBCTL_PATH"

# Check for Allsky Website-related anomolies.
if has_website > /dev/null ; then
	if [[ ${IMG_UPLOAD} == "false" ]]; then
		heading "Warnings"
		echo "You have an Allsky Website but no images are being uploaded to it (IMG_UPLOAD=false)."
	fi
	if [[ ${TIMELAPSE} == "true" && ${UPLOAD_VIDEO} == "false" ]]; then
		heading "Warnings"
		echo "You have an Allsky Website and timelapse videos are being created (TIMELAPSE=true),"
		echo "but they are not being uploaded (UPLOAD_VIDEO=false)."
	fi
	if [[ ${KEOGRAM} == "true" && ${UPLOAD_KEOGRAM} == "false" ]]; then
		heading "Warnings"
		echo "You have an Allsky Website and keograms are being created (KEOGRAM=true),"
		echo "but they are not being uploaded (UPLOAD_KEOGRAM=false)."
	fi
	if [[ ${STARTRAILS} == "true" && ${UPLOAD_STARTRAILS} == "false" ]]; then
		heading "Warnings"
		echo "You have an Allsky Website and startrails are being created (STARTRAILS=true),"
		echo "but they are not being uploaded (UPLOAD_STARTRAILS=false)."
	fi
fi



# ======================================================================
# ================= Check for error items.
#	These are wrong and will likely keep Allsky from running.

if [[ ${CAMERA_TYPE} != "ZWO" && ${CAMERA_TYPE} != "RPi" ]]; then
	heading "Errors"
	echo "INTERNAL ERROR: CAMERA_TYPE (${CAMERA_TYPE}) not valid."
fi

# Make sure these booleans have boolean values, or are blank.
for i in IMG_UPLOAD IMG_UPLOAD_ORIGINAL_NAME IMG_RESIZE CROP_IMAGE AUTO_STRETCH \
	RESIZE_UPLOADS IMG_CREATE_THUMBNAILS REMOVE_BAD_IMAGES TIMELAPSE UPLOAD_VIDEO \
	TIMELAPSE_UPLOAD_THUMBNAIL TIMELAPSE_MINI_FORCE_CREATION TIMELAPSE_MINI_UPLOAD_VIDEO \
	TIMELAPSE_MINI_UPLOAD_THUMBNAIL KEOGRAM UPLOAD_KEOGRAM \
	STARTRAILS UPLOAD_STARTRAILS POST_END_OF_NIGHT_DATA
do
	if [[ -n ${!i} && ${!i,,} != "true" && ${!i,,} != "false" ]]; then
		heading "Errors"
		echo "${i} must be either 'true' or 'false'."
	fi
done

# Check that all required settings are set.
# All others are optional.
for i in ANGLE LATITUDE LONGITUDE LOCALE
do
	if [[ -z ${!i} || ${!i} == "null" ]]; then
		heading "Errors"
		echo "${i} must be set."
	fi
done

# Check that the required settings' values are valid.
if [[ -n ${ANGLE} ]] && ! is_number "${ANGLE}" ; then
	heading "Errors"
	echo "ANGLE (${ANGLE}) must be a number."
fi
if [[ -n ${LATITUDE} ]]; then
	if ! LAT="$(convertLatLong "${LATITUDE}" "latitude" 2>&1)" ; then
		heading "Errors"
		echo -e "${LAT}"		# ${LAT} contains the error message
	fi
fi
if [[ -n ${LONGITUDE} ]]; then
	if ! LONG="$(convertLatLong "${LONGITUDE}" "longitude" 2>&1)" ; then
		heading "Errors"
		echo -e "${LONG}"
	fi
fi

# Check dark frames
if [[ ${USING_DARKS} -eq 1 ]]; then
	if [[ ! -d ${ALLSKY_DARKS} ]]; then
		heading "Errors"
		echo "'Use Dark Frames' is set but the '${ALLSKY_DARKS}' directory does not exist."
	else
		NUM_DARKS=$(find "${ALLSKY_DARKS}" -name "*.${EXTENSION}" 2>/dev/null | wc -l)
		if [[ ${NUM_DARKS} -eq 0 ]]; then
			heading "Errors"
			echo -n "'Use Dark Frames' is set but there are no darks"
			echo " in '${ALLSKY_DARKS}' with extension of '${EXTENSION}'."
		fi
	fi
fi

# Check for valid numbers.
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

# If images are being resized or cropped,
# make sure the resized/cropped image is fully within the sensor image.
HAS_PIXEL_ERROR="false"
if [[ ${IMG_RESIZE} == "true" ]]; then
	if ! X="$(checkPixelValue "IMG_WIDTH" "${IMG_WIDTH}" "width" "${SENSOR_WIDTH}")" ; then
		heading "Errors"
		echo -e "${X}"
		HAS_PIXEL_ERROR="true"
	fi
	if ! X="$(checkPixelValue "IMG_HEIGHT" "${IMG_HEIGHT}" "height" "${SENSOR_HEIGHT}")" ; then
		heading "Errors"
		echo -e "${X}"
		HAS_PIXEL_ERROR="true"
	fi
fi

if [[ ${CROP_IMAGE} == "true" ]]; then
	if ! X="$(checkPixelValue "CROP_WIDTH" "${CROP_WIDTH}" "width" "${SENSOR_WIDTH}")" ; then
		heading "Errors"
		echo -e "${X}"
		HAS_PIXEL_ERROR="true"
	fi
	if ! X="$(checkPixelValue "CROP_HEIGHT" "${CROP_HEIGHT}" "height" "${SENSOR_HEIGHT}")" ; then
		heading "Errors"
		echo -e "${X}"
		HAS_PIXEL_ERROR="true"
	fi
	# "any" means it can be any number, positive or negative.
	if ! X="$(checkPixelValue "CROP_OFFSET_X" "${CROP_OFFSET_X}" "width" "${SENSOR_WIDTH}" "any")" ; then
		heading "Errors"
		echo -e "${X}"
		HAS_PIXEL_ERROR="true"
	fi
	if ! X="$(checkPixelValue "CROP_OFFSET_Y" "${CROP_OFFSET_Y}" "height" "${SENSOR_HEIGHT}" "any")" ; then
		heading "Errors"
		echo -e "${X}"
		HAS_PIXEL_ERROR="true"
	fi

	# Do more intensive checks but only if there weren't IMG_RESIZE errors since we
	# we can't use IMG_WIDTH or IMG_HEIGHT.
	if [[ ${HAS_PIXEL_ERROR} == "false" ]]; then
		if [[ ${IMG_RESIZE} == "true" ]]; then
			MAX_X=${IMG_WIDTH}
			MAX_Y=${IMG_HEIGHT}
		else
			MAX_X=${SENSOR_WIDTH}
			MAX_Y=${SENSOR_HEIGHT}
		fi
		if ! X="$(checkCropValues "${CROP_WIDTH}" "${CROP_HEIGHT}" \
				"${CROP_OFFSET_X}" "${CROP_OFFSET_Y}" \
				"${MAX_X}" "${MAX_Y}")" ; then
			heading "Errors"
			echo -e "${X}"
		fi
	fi
fi

if [[ ${RESIZE_UPLOADS} == "true" ]]; then
	if ! X="$(checkPixelValue "RESIZE_UPLOADS_WIDTH" "${RESIZE_UPLOADS_WIDTH}" "width" "${SENSOR_WIDTH}")" ; then
		heading "Errors"
		echo -e "${X}"
		echo "It is typically less than the sensor width of ${SENSOR_WIDTH}."
	fi
	if ! X="$(checkPixelValue "RESIZE_UPLOADS_HEIGHT" "${RESIZE_UPLOADS_HEIGHT}" "height" "${SENSOR_HEIGHT}")" ; then
		heading "Errors"
		echo -e "${X}"
		echo "It is typically less than the sensor height of ${SENSOR_HEIGHT}."
	fi
fi


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
