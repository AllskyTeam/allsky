#!/bin/bash

# Check the Allsky installation and settings for missing items,
# inconsistent items, illegal items, etc.
# TODO: With a heading, group by topic, e.g., all IMG_* together.

ME="$(basename "${BASH_ARGV0}")"

# Allow this script to be executed manually, which requires several variables to be set.
if [[ -z ${ALLSKY_HOME} ]]; then
	ALLSKY_HOME="$(realpath "$(dirname "${BASH_ARGV0}")/..")"
	export ALLSKY_HOME
fi

source "${ALLSKY_HOME}/variables.sh" || exit 99

if [[ ${1} == "--newer" ]]; then
	NEWER="true"
	shift
else
	NEWER=""
fi
if [[ $# -ne 0 ]]; then
	# Don't show the "--newer" option since users should never use it.
	# shellcheck disable=SC2154
	echo -e "${wERROR}Usage: ${ME}${wNC}" >&2
	exit 1
fi

source "${ALLSKY_CONFIG}/config.sh" || exit 99
source "${ALLSKY_CONFIG}/ftp-settings.sh" || exit 99
source "${ALLSKY_SCRIPTS}/functions.sh" || exit 99


if true; then ######################################## set to "false" when testing version is newer
CURRENT_SCRIPT="${ALLSKY_SCRIPTS}/${ME}"
if [[ -n ${NEWER} ]]; then
	# This is a newer version
	echo "[${CURRENT_SCRIPT}] being replaced by newer version from GitHub."
	echo XXXX cp "${BASH_ARGV0}" "${CURRENT_SCRIPT}"
	chmod 775 "${CURRENT_SCRIPT}"

else
	# See if there's a newer version of this script; if so, download it and execute it.
	BRANCH="$(getBranch)" || exit 2
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
fi #####################################################

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
	esac

	if [[ ${DISPLAY_HEADER} == "true" ]]; then
		echo -e "\n---------- ${HEADER}${SUB_HEADER} ----------\n"
	else
		echo "-----"
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
function has_website()
{
	local RET=1
	if [[ -f ${ALLSKY_WEBSITE_CONFIGURATION_FILE} || -f ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE} ]]; then
		# Also return string stating if it's local or remote website.
		local WHERE=""
		[[ -f ${ALLSKY_WEBSITE_CONFIGURATION_FILE} ]] && WHERE="local"
		if [[ -f ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE} ]]; then
			if [[ -n ${WHERE} ]]; then
				WHERE="${WHERE} and remote"
			else
				WHERE="remote"
			fi
		fi
		echo "${WHERE}"
		RET=0
	fi
	return ${RET}
}


function check_exists() {
	local VALUE="${!1}"
	if [[ -n ${VALUE} && ! -e ${VALUE} ]]; then
		heading "Warnings"
		echo "${1} is set to '${VALUE}' but it does not exist."
	fi
}


# ================= Check for informational items.
#	There is nothing wrong with these, it's just that they typically don't exist.


TAKING_DARKS="$(settings .takeDarkFrames)"
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

SENSOR_WIDTH="$(settings .sensorWidth "${CC_FILE}")"
SENSOR_HEIGHT="$(settings .sensorHeight "${CC_FILE}")"
if [[ ${IMG_RESIZE} == "true" && ${SENSOR_WIDTH} == "${IMG_WIDTH}" && ${SENSOR_HEIGHT} == "${IMG_HEIGHT}" ]]; then
	heading "Information"
	echo "Images will be resized to the same size as the sensor; this does nothing useful."
	echo "Check IMG_RESIZE, IMG_WIDTH (${IMG_WIDTH}), and IMG_HEIGHT (${IMG_HEIGHT})."
fi
if [[ ${CROP_IMAGE} == "true" && ${SENSOR_WIDTH} == "${CROP_WIDTH}" && ${SENSOR_HEIGHT} == "${CROP_HEIGHT}" ]]; then
	heading "Information"
	echo "Images will be cropped to the same size as the sensor; this does nothing useful."
	echo "Check CROP_IMAGE, CROP_WIDTH (${CROP_WIDTH}), and CROP_HEIGHT (${CROP_HEIGHT})."
fi

# ================= Check for warning items.
#	These are wrong, but won't stop Allsky from running,
#	but may break part of Allsky, e.g., uploads may not work.

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

TAKE="$(settings .takeDaytimeImages)"
SAVE="$(settings .saveDaytimeImages)"
if [[ ${TAKE} == "0" && ${SAVE} == "1" ]]; then
	heading "Warnings"
	echo "'Daytime Capture' is off but 'Daytime Save' is on in the WebUI."
fi

if [[ ${BRIGHTNESS_THRESHOLD} == "0.0" ]]; then
	heading "Warnings"
	echo "BRIGHTNESS_THRESHOLD is 0.0 which means ALL images will be ignored when creating startrails."
elif [[ ${BRIGHTNESS_THRESHOLD} == "1.0" ]]; then
	heading "Warnings"
	echo "BRIGHTNESS_THRESHOLD is 1.0 which means ALL images will be used when creating startrails."
fi

if [[ ${POST_END_OF_NIGHT_DATA} == "true" ]] && ! WHERE="$(has_website)" ; then
	heading "Warnings"
	echo "POST_END_OF_NIGHT_DATA is 'true' but no Allsky Website found."
	echo "POST_END_OF_NIGHT_DATA should be set to 'false'."
elif [[ ${POST_END_OF_NIGHT_DATA} == "false" ]] && WHERE="$(has_website)" ; then
	heading "Warnings"
	echo "POST_END_OF_NIGHT_DATA is 'false' but a ${WHERE} Allsky Website was found."
	echo "POST_END_OF_NIGHT_DATA should be set to 'true'."
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

case "${PROTOCOL,,}" in
	"" | local)
		;;

	ftp | ftps | sftp)
		for i in REMOTE_HOST REMOTE_USER REMOTE_PASSWORD
		do
			if [[ -z ${!i} ]]; then
				heading "Warnings"
				echo "PROTOCOL (${PROTOCOL}) set but not '${i}'."
				echo "Uploads will not work."
			fi
		done
		;;

	scp)
		if [[ -z ${SSH_KEY_FILE} ]]; then
			heading "Warnings"
			echo "PROTOCOL (${PROTOCOL}) set but not 'SSH_KEY_FILE'."
			echo "Uploads will not work."
		elif [[ ! -e ${SSH_KEY_FILE} ]]; then
			heading "Warnings"
			echo "PROTOCOL (${PROTOCOL}) set but 'SSH_KEY_FILE' (${SSH_KEY_FILE}) does not exist."
			echo "Uploads will not work."
		fi
		;;

	s3)
		if [[ -z ${AWS_CLI_DIR} ]]; then
			heading "Warnings"
			echo "PROTOCOL (${PROTOCOL}) set but not 'AWS_CLI_DIR'."
			echo "Uploads will not work."
		elif [[ ! -e ${AWS_CLI_DIR} ]]; then
			heading "Warnings"
			echo "PROTOCOL (${PROTOCOL}) set but 'AWS_CLI_DIR' (${AWS_CLI_DIR}) does not exist."
			echo "Uploads will not work."
		fi
		for i in S3_BUCKET S3_ACL
		do
			if [[ -z ${!i} ]]; then
				heading "Warnings"
				echo "PROTOCOL (${PROTOCOL}) set but not '${i}'."
				echo "Uploads will not work."
			fi
		done
		;;

	gcs)
		for i in GCS_BUCKET GCS_ACL
		do
			if [[ -z ${!i} ]]; then
				heading "Warnings"
				echo "PROTOCOL (${PROTOCOL}) set but not '${i}'."
				echo "Uploads will not work."
			fi
		done
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

# If these variables are set, the corresponding directory should exist.
for i in WEB_IMAGE_DIR WEB_VIDEOS_DIR WEB_KEOGRAM_DIR WEB_STARTRAILS_DIR UHUBCTL_PATH
do
	check_exists "${i}"
done

NUM_UPLOADS=0
if WHERE="$(has_website)" ; then
	if [[ ${IMG_UPLOAD} == "false" ]]; then
		heading "Warnings"
		echo "You have an Allsky Website but no images are being uploaded to it (IMG_UPLOAD=false)."
	else
		NUM_UPLOADS=$((NUM_UPLOADS + 1))
	fi
	if [[ ${TIMELAPSE} == "true" && ${UPLOAD_VIDEO} == "false" ]]; then
		heading "Warnings"
		echo "You have an Allsky Website and timelapse videos are being created (TIMELAPSE=true),"
		echo "but they are not being uploaded (UPLOAD_VIDEO=false)."
	else
		NUM_UPLOADS=$((NUM_UPLOADS + 1))
	fi
	if [[ ${KEOGRAM} == "true" && ${UPLOAD_KEOGRAM} == "false" ]]; then
		heading "Warnings"
		echo "You have an Allsky Website and keograms are being created (KEOGRAM=true),"
		echo "but they are not being uploaded (UPLOAD_KEOGRAM=false)."
	else
		NUM_UPLOADS=$((NUM_UPLOADS + 1))
	fi
	if [[ ${STARTRAILS} == "true" && ${UPLOAD_STARTRAILS} == "false" ]]; then
		heading "Warnings"
		echo "You have an Allsky Website and startrails are being created (STARTRAILS=true),"
		echo "but they are not being uploaded (UPLOAD_STARTRAILS=false)."
	else
		NUM_UPLOADS=$((NUM_UPLOADS + 1))
	fi
fi


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

ANGLE="$(settings ".angle")"
LATITUDE="$(settings ".latitude")"
LONGITUDE="$(settings ".longitude")"
# shellcheck disable=SC2034
LOCALE="$(settings ".locale")"
for i in ANGLE LATITUDE LONGITUDE LOCALE
do
	if [[ -z ${!i} || ${!i} == "null" ]]; then
		heading "Errors"
		echo "${i} must be set."
	fi
done

if [[ -n ${ANGLE} ]] && ! is_number "${ANGLE}" ; then
	heading "Errors"
	echo "ANGLE (${ANGLE}) must be a number."
fi
if [[ -n ${LATITUDE} ]]; then
	if ! LAT="$(convertLatLong "${LATITUDE}" "latitude" 2>&1)" ; then
		heading "Errors"
		echo -e "${LAT}"
	fi
fi
if [[ -n ${LONGITUDE} ]]; then
	if ! LONG="$(convertLatLong "${LONGITUDE}" "longitude" 2>&1)" ; then
		heading "Errors"
		echo -e "${LONG}"
	fi
fi

USING_DARKS="$(settings .useDarkFrames)"
if [[ ${USING_DARKS} -eq 1 ]]; then
	NUM_DARKS=$(find "${ALLSKY_DARKS}" -name "*.${EXTENSION}" 2>/dev/null | wc -l)
	if [[ ${NUM_DARKS} -eq 0 ]]; then
		heading "Errors"
		echo -n "'Use Dark Frames' is set but there are no darks "
		if [[ -d ${ALLSKY_DARKS} ]]; then
			echo "in '${ALLSKY_DARKS}'."
		else
			echo "with extension of '${EXTENSION}'."
		fi
	fi
fi

if WHERE="$(has_website)" && [[ ${NUM_UPLOADS} -eq 0 ]]; then
	heading "Errors"
	echo "You have a ${WHERE} Allsky Website but nothing is being uploaded to it."
fi

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
