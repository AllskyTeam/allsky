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

# shellcheck disable=SC1090
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

# shellcheck disable=SC1090
source "${ALLSKY_CONFIG}/config.sh" || exit 99
# shellcheck disable=SC1090
source "${ALLSKY_CONFIG}/ftp-settings.sh" || exit 99
# shellcheck disable=SC1090
source "${ALLSKY_SCRIPTS}/functions.sh" || exit 99


if [[ -n ${NEWER} ]]; then
	# This is a newer version
echo "XXXXXXXXXX this is a newer version, BASH_ARGV0=[${BASH_ARGV0}]"

else
	# See if there's a newer version of this script; if so, download it and execute it.
	BRANCH="$(getBranch)" || exit 2
	CURRENT_FILE="${ALLSKY_SCRIPTS}/${ME}"
	FILE_TO_CHECK="$(basename "${CURRENT_FILE}")"
	NEWER_FILE="/tmp/${ME}"
	checkAndGetNewerFile --branch "${BRANCH}" "${CURRENT_FILE}" "${FILE_TO_CHECK}" "${NEWER_FILE}"
	RET=$?
	[[ ${RET} -eq 2 ]] && exit 2
	if [[ ${RET} -eq 1 ]]; then
: ##########
 exec "${NEWER_FILE}" --newer
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
	NON_NUMERIC="${VALUE/?([-+])*([0-9])?(.)*([0-9])/}"
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
	if [[ -f ${ALLSKY_WEBSITE_CONFIGURATION_FILE} || -f ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE} ]]; then
		return 0
	else
		return 1
	fi
}


# ================= Check for informational items.
#	There is nothing wrong with these, it's just that they typically don't exist.


TAKING_DARKS="$(settings .takeDarkFrames)"
if [[ ${TAKING_DARKS} = "1" ]]; then
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

if [[ ${POST_END_OF_NIGHT_DATA} == "true" && ! has_website ]]; then
	heading "Warnings"
	echo "POST_END_OF_NIGHT_DATA is 'true' but no Allsky Website found."
	echo "POST_END_OF_NIGHT_DATA should be set to 'false'."
elif [[ ${POST_END_OF_NIGHT_DATA} == "false" && has_website ]]; then
	heading "Warnings"
	echo "POST_END_OF_NIGHT_DATA is 'false' but an Allsky Website was found."
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
	"" | local | ftp | ftps | sftp | scp | s3 | gcs)
		;;
	*)
		heading "Warnings"
		echo "PROTOCOL (${PROTOCOL}) not blank or one of: local, ftp, ftps, sftp, scp, s3, gcs)".
		echo "Uploads will not work until this is corrected."
		;;
esac

if [[ -n ${REMOTE_PORT} ]] && ! is_number "${REMOTE_PORT}" ; then
		heading "Warnings"
		echo "REMOTE_PORT (${REMOTE_PORT}) must be a number."
		echo "Uploads will not work until this is corrected."
fi

for i in WEB_IMAGE_DIR WEB_VIDEOS_DIR WEB_KEOGRAM_DIR WEB_STARTRAILS_DIR SSH_KEY_FILE AWS_CLI_DIR UHUBCTL_PATH
do
	VALUE="${!i}"
	if [[ -n ${VALUE} && ! -e ${VALUE} ]]; then
		heading "Warnings"
		echo "${i} is set to '${VALUE}' but it does not exist."
	fi
done

# ================= Check for error items.
#	These are wrong and will likely keep Allsky from running.

ANGLE="$(settings ".angle")"
LATITUDE="$(settings ".latitude")"
LONGITUDE="$(settings ".longitude")"
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
		echo -e "${lONG}"
	fi
fi

USING_DARKS="$(settings .useDarkFrames)"
if [[ ${USING_DARKS} = "1" ]]; then
	NUM_DARKS=$(find "${ALLSKY_DARKS}" -name "*.${EXTENSION}" 2>/dev/null | wc -l)
	if [[ ${NUM_DARKS} -eq 0 ]]; then
		heading "Information"
		echo -n "'Use Dark Frames' is set but there are no darks "
		if [[ -d ${ALLSKY_DARKS} ]]; then
			echo "in '${ALLSKY_DARKS}'."
		else
			echo "with extension of '${EXTENSION}'."
		fi
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
