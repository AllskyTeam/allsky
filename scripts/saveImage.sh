#!/bin/bash

# Script to save a DAY or NIGHT image.

ME="$(basename "${BASH_ARGV0}")"

[[ ${ALLSKY_DEBUG_LEVEL} -ge 4 ]] && echo "${ME} $*"

#shellcheck disable=SC2086 source-path=.
source "${ALLSKY_HOME}/variables.sh" || exit ${ALLSKY_ERROR_STOP}
#shellcheck disable=SC2086 source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"		|| exit ${ALLSKY_ERROR_STOP}
#shellcheck disable=SC2086,SC1091		# file doesn't exist in GitHub
source "${ALLSKY_CONFIG}/config.sh" || exit ${ALLSKY_ERROR_STOP}

usage_and_exit()
{
	retcode=${1}
	[[ ${retcode} -ne 0 ]] && echo -ne "${RED}"
	echo -n "Usage: ${ME} DAY|NIGHT  full_path_to_filename  [variable=value [...]]"
	[[ ${retcode} -ne 0 ]] && echo -e "${NC}"
	# shellcheck disable=SC2086
	exit ${retcode}
}
[[ $# -lt 2 ]] && usage_and_exit 1
# Export so other scripts can use it.
export DAY_OR_NIGHT="${1}"
[[ ${DAY_OR_NIGHT} != "DAY" && ${DAY_OR_NIGHT} != "NIGHT" ]] && usage_and_exit 1

# ${CURRENT_IMAGE} is the full path to a uniquely-named file created by the capture program.
# The file name is its final name in the ${ALLSKY_IMAGES}/<date> directory.
# Because it's a unique name we don't have to worry about another process overwritting it.
# We modify the file as needed and ultimately save a link to it as ${FULL_FILENAME} since
# that's what websites look for and what is uploaded.

# Export so other scripts can use it.
export CURRENT_IMAGE="${2}"
shift 2
if [[ ! -f ${CURRENT_IMAGE} ]] ; then
	echo -e "${RED}*** ${ME}: ERROR: File '${CURRENT_IMAGE}' not found; ignoring${NC}"
	exit 2
fi
if [[ ! -s ${CURRENT_IMAGE} ]] ; then
	echo -e "${RED}*** ${ME}: ERROR: File '${CURRENT_IMAGE}' is empty; ignoring${NC}"
	exit 2
fi

# The image may be in a memory filesystem, so do all the processing there and
# leave the image used by the website(s) in that directory.
IMAGE_NAME=$(basename "${CURRENT_IMAGE}")	# just the file name
WORKING_DIR=$(dirname "${CURRENT_IMAGE}")	# the directory the image is currently in

# Optional full check for bad images.
if [[ ${REMOVE_BAD_IMAGES} == "true" ]]; then
	# If the return code is 99, the file was bad and deleted so don't continue.
	"${ALLSKY_SCRIPTS}/removeBadImages.sh" "${WORKING_DIR}" "${IMAGE_NAME}"
	# removeBadImages.sh displayed error message and deleted the file.
	[[ $? -eq 99 ]] && exit 99
fi

# If we didn't execute removeBadImages.sh do a quick sanity check on the image.
# OR, if we did execute removeBaImages.sh but we're cropping the image, get the image resolution.
if [[ ${REMOVE_BAD_IMAGES} != "true" || ${CROP_IMAGE} == "true" ]]; then
	x=$(identify "${CURRENT_IMAGE}" 2>/dev/null)
	if [[ $? -ne 0 ]]; then
		echo -e "${RED}*** ${ME}: ERROR: '${CURRENT_IMAGE}' is corrupt; not saving.${NC}"
		exit 3
	fi

	if [[ ${CROP_IMAGE} == "true" ]]; then
		# Typical output:
			# image.jpg JPEG 4056x3040 4056x3040+0+0 8-bit sRGB 1.19257MiB 0.000u 0:00.000
		RESOLUTION=$(echo "${x}" | awk '{ print $3 }')
		# These are the resolution of the image (which may have been binned), not the sensor.
		RESOLUTION_X=${RESOLUTION%x*}	# everything before the "x"
		RESOLUTION_Y=${RESOLUTION##*x}	# everything after  the "x"
	fi
fi

# Get passed-in variables.
# Normally at least the exposure will be passed and the sensor temp if known.
while [[ $# -gt 0 ]]; do
	VARIABLE="AS_${1%=*}"		# everything before the "="
	VALUE="${1##*=}"			# everything after  the "="
	shift
	# Export the variable so other scripts we call can use it.
	# shellcheck disable=SC2086
	export ${VARIABLE}="${VALUE}"	# need "export" to get indirection to work
done
# Export other variables so user can use them in overlays
export AS_CAMERA_TYPE="${CAMERA_TYPE}"
export AS_CAMERA_MODEL="${CAMERA_MODEL}"

#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/darkCapture.sh"		# does not return if in darkframe mode
# TODO: Dark subtract long-exposure images, even if during daytime.
# TODO: Need a config variable to specify the threshold to dark subtract.
# TODO: Possibly also for stretching below.
if [[ ${DAY_OR_NIGHT} == "NIGHT" ]]; then
	#shellcheck source-path=scripts
	source "${ALLSKY_SCRIPTS}/darkSubtract.sh"	# It will modify the image but not its name.
fi

# If any of the "convert"s below fail, exit since we won't know if the file was corrupted.

function display_error_and_exit()	# error message, notification string
{
	ERROR_MESSAGE="${1}"
	NOTIFICATION_STRING="${2}"
	echo -en "${RED}"
	echo -e "${ERROR_MESSAGE}" | while read -r MSG
		do
			[[ -n ${MSG} ]] && echo -e "    * ${MSG}"
		done
	echo -e "${NC}"
	# Create a custom error message.
	"${ALLSKY_SCRIPTS}/copy_notification_image.sh" --expires 15 "custom" \
		"red" "" "85" "" "" "" "10" "red" "${EXTENSION}" "" \
		"*** ERROR ***\nAllsky Stopped!\nInvalid ${NOTIFICATION_STRING} settings\nSee\n/var/log/allsky.log"

	# Don't let the service restart us because we will get the same error again.
	sudo systemctl stop allsky
	# shellcheck disable=SC2086
	exit ${EXIT_ERROR_STOP}
}

# Resize the image if required
if [[ ${IMG_RESIZE} == "true" ]] ; then
	# Make sure we were given numbers.
	ERROR_MSG=""
	if [[ ${IMG_WIDTH} != +([+0-9]) ]]; then		# no negative numbers allowed
		ERROR_MSG="${ERROR_MSG}\nIMG_WIDTH (${IMG_WIDTH}) must be a number."
	fi
	if [[ ${IMG_WIDTH} != +([+0-9]) ]]; then
		ERROR_MSG="${ERROR_MSG}\nIMG_HEIGHT (${IMG_HEIGHT}) must be a number."
	fi
	if [[ -n ${ERROR_MSG} ]]; then
		echo -e "${RED}*** ${ME}: ERROR: Image resize number(s) invalid.${NC}"
		display_error_and_exit "${ERROR_MSG}" "IMG_RESIZE"
	fi

	[[ ${ALLSKY_DEBUG_LEVEL} -ge 4 ]] && echo "${ME}: Resizing '${CURRENT_IMAGE}' to ${IMG_WIDTH}x${IMG_HEIGHT}"
	if ! convert "${CURRENT_IMAGE}" -resize "${IMG_WIDTH}x${IMG_HEIGHT}" "${CURRENT_IMAGE}" ; then
		echo -e "${RED}*** ${ME}: ERROR: IMG_RESIZE failed; not saving${NC}"
		exit 4
	fi
fi

# Crop the image if required
if [[ ${CROP_IMAGE} == "true" ]]; then
	# If the image was just resized, the resolution changed, so reset the variables.
	if [[ ${IMG_RESIZE} == "true" ]]; then
		RESOLUTION_X=${IMG_WIDTH}
		RESOLUTION_Y=${IMG_HEIGHT}
	fi

	# Do some sanity checks on the CROP_* variables.
	ERROR_MSG=""
	# shellcheck disable=SC2153
	if ! E="$(checkPixelValue "CROP_WIDTH" "${CROP_WIDTH}" "width" "${RESOLUTION_X}")" ; then
		ERROR_MSG="${ERROR_MSG}\n${E}"
	fi
	# shellcheck disable=SC2153
	if ! E="$(checkPixelValue "CROP_HEIGHT" "${CROP_HEIGHT}" "height" "${RESOLUTION_Y}")"; then
		ERROR_MSG="${ERROR_MSG}\n${E}"
	fi
	if ! E="$(checkPixelValue "CROP_OFFSET_X" "${CROP_OFFSET_X}" "width" "${RESOLUTION_X}" "any")" ; then
		ERROR_MSG="${ERROR_MSG}\n${E}"
	fi
	if ! E="$(checkPixelValue "CROP_OFFSET_Y" "${CROP_OFFSET_Y}" "height" "${RESOLUTION_Y}" "any")" ; then
		ERROR_MSG="${ERROR_MSG}\n${E}"
	fi

	# Now for more intensive checks.
	if [[ -z ${ERROR_MSG} ]]; then
		ERROR_MSG="$(checkCropValues "${CROP_WIDTH}" "${CROP_HEIGHT}" \
			"${CROP_OFFSET_X}" "${CROP_OFFSET_Y}" \
			"${RESOLUTION_X}" "${RESOLUTION_Y}")"
	fi

	if [[ -z ${ERROR_MSG} ]]; then
		if [[ ${ALLSKY_DEBUG_LEVEL} -ge 4 ]]; then
			echo -e "${RED}*** ${ME} Cropping '${CURRENT_IMAGE}' to ${CROP_WIDTH}x${CROP_HEIGHT}.${NC}"
		fi
		convert "${CURRENT_IMAGE}" -gravity Center -crop "${CROP_WIDTH}x${CROP_HEIGHT}+${CROP_OFFSET_X}+${CROP_OFFSET_Y}" +repage "${CURRENT_IMAGE}"
		if [ $? -ne 0 ] ; then
			echo -e "${RED}*** ${ME}: ERROR: CROP_IMAGE failed; not saving${NC}"
			exit 4
		fi
	else
		echo -e "${RED}*** ${ME}: ERROR: Crop number(s) invalid; not cropping image.${NC}"
		display_error_and_exit "${ERROR_MSG}" "CROP"
	fi
fi

# Stretch the image if required, but only at night.
if [[ ${DAY_OR_NIGHT} == "NIGHT" && ${AUTO_STRETCH} == "true" ]]; then
	if [[ ${ALLSKY_DEBUG_LEVEL} -ge 4 ]]; then
		echo "${ME}: Stretching '${CURRENT_IMAGE}' by ${AUTO_STRETCH_AMOUNT}"
	fi
 	convert "${CURRENT_IMAGE}" -sigmoidal-contrast "${AUTO_STRETCH_AMOUNT}x${AUTO_STRETCH_MID_POINT}" "${IMAGE_TO_USE}"
	if [ $? -ne 0 ] ; then
		echo -e "${RED}*** ${ME}: ERROR: AUTO_STRETCH failed; not saving${NC}"
		exit 4
	fi
fi

if [ "${DAY_OR_NIGHT}" = "NIGHT" ] ; then
	# The 12 hours ago option ensures that we're always using today's date
	# even at high latitudes where civil twilight can start after midnight.
	export DATE_NAME="$(date -d '12 hours ago' +'%Y%m%d')"
else
	# During the daytime we alway save the file in today's directory.
	export DATE_NAME="$(date +'%Y%m%d')"
fi

"${ALLSKY_SCRIPTS}/flow-runner.py"

SAVED_FILE="${CURRENT_IMAGE}"						# The name of the file saved from the camera.
WEBSITE_FILE="${WORKING_DIR}/${FULL_FILENAME}"		# The name of the file the websites look for

# If needed, save the current image in today's directory.
if [[ $(settings ".saveDaytimeImages") -eq 1 || ${DAY_OR_NIGHT} == "NIGHT" ]]; then
	SAVE_IMAGE="true"
else
	SAVE_IMAGE="false"
fi
if [[ ${SAVE_IMAGE} == "true" ]]; then
	# Determine what directory is the final resting place.
	if [[ ${DAY_OR_NIGHT} == "NIGHT" ]]; then
		# The 12 hours ago option ensures that we're always using today's date
		# even at high latitudes where civil twilight can start after midnight.
		DATE_NAME="$(date -d '12 hours ago' +'%Y%m%d')"
	else
		# During the daytime we alway save the file in today's directory.
		DATE_NAME="$(date +'%Y%m%d')"
	fi
	DATE_DIR="${ALLSKY_IMAGES}/${DATE_NAME}"
	mkdir -p "${DATE_DIR}"

	if [[ ${IMG_CREATE_THUMBNAILS} == "true" ]]; then
		THUMBNAILS_DIR="${DATE_DIR}/thumbnails"
		mkdir -p "${THUMBNAILS_DIR}"
		# Create a thumbnail of the image for faster load in the WebUI.
		# If we resized above, this will be a resize of a resize,
		# but for thumbnails that should be ok.
		convert "${CURRENT_IMAGE}" -resize "${THUMBNAIL_SIZE_X}x${THUMBNAIL_SIZE_Y}" "${THUMBNAILS_DIR}/${IMAGE_NAME}"
		if [ $? -ne 0 ] ; then
			echo -e "${YELLOW}*** ${ME}: WARNING: THUMBNAIL resize failed; continuing.${NC}"
		fi
	fi

	# The web server can't handle symbolic links so we need to make a copy of the file for
	# it to use.
	FINAL_FILE="${DATE_DIR}/${IMAGE_NAME}"
	if cp "${CURRENT_IMAGE}" "${FINAL_FILE}" ; then

		if [[ ${TIMELAPSE_MINI_IMAGES} -ne 0 && ${TIMELAPSE_MINI_FREQUENCY} -ne 1 ]]; then
			# We are creating mini-timelapses; see if we should create one now.

			MINI_TIMELAPSE_FILES="${ALLSKY_TMP}/mini-timelapse_files.txt"	 # List of files
			if [[ ! -f ${MINI_TIMELAPSE_FILES} ]]; then
				# The file may have been deleted for an unknown reason.
				echo "${FINAL_FILE}" > "${MINI_TIMELAPSE_FILES}"
				NUM_IMAGES=1
				LEFT=$((TIMELAPSE_MINI_IMAGES - NUM_IMAGES))
			else
				if ! grep --silent "${FINAL_FILE}" "${MINI_TIMELAPSE_FILES}" ; then
					echo "${FINAL_FILE}" >> "${MINI_TIMELAPSE_FILES}"
				elif [[ ${ALLSKY_DEBUG_LEVEL} -ge 2 ]]; then
					# This shouldn't happen...
					echo -e "${YELLOW}${ME} WARNING: '${FINAL_FILE}' already in set.${NC}" >&2
				fi
				NUM_IMAGES=$(wc -l < "${MINI_TIMELAPSE_FILES}")
				LEFT=$((TIMELAPSE_MINI_IMAGES - NUM_IMAGES))
			fi
			[[ ${ALLSKY_DEBUG_LEVEL} -ge 4 ]] && echo -e "NUM_IMAGES=${NUM_IMAGES}" >&2

			MOD=0
			if [[ ${TIMELAPSE_MINI_FORCE_CREATION} == "true" ]]; then
				# We only force creation every${TIMELAPSE_MINI_FREQUENCY} images,
				# and only when we haven't reached ${TIMELAPSE_MINI_IMAGES} or we're close.
				if [[ ${LEFT} -lt ${TIMELAPSE_MINI_FREQUENCY} ]]; then
					TIMELAPSE_MINI_FORCE_CREATION="false"
				else
					MOD="$(echo "${NUM_IMAGES} % ${TIMELAPSE_MINI_FREQUENCY}" | bc)"
					[[ ${MOD} -ne 0 ]] && TIMELAPSE_MINI_FORCE_CREATION="false"
				fi
			fi
			if [[ ${TIMELAPSE_MINI_FORCE_CREATION} == "true" || ${LEFT} -le 0 ]]; then
				# Create a mini-timelapse
				# This ALLSKY_DEBUG_LEVEL should be same as what's in upload.sh
				if [[ ${ALLSKY_DEBUG_LEVEL} -ge 4 ]]; then
					# timelapse.sh produces a lot of debug output
					D="--debug --debug"
				elif [[ ${ALLSKY_DEBUG_LEVEL} -ge 2 ]]; then
					D="--debug"
				else
					D=""
				fi
				# shellcheck disable=SC2086
				"${ALLSKY_SCRIPTS}"/timelapse.sh ${D} --mini "${MINI_TIMELAPSE_FILES}" "${DATE_NAME}"
				RET=$?
				[[ ${RET} -ne 0 ]] && TIMELAPSE_MINI_UPLOAD_VIDEO="false"			# failed so don't try to upload
				if [[ ${ALLSKY_DEBUG_LEVEL} -ge 2 ]]; then
					if [[ ${RET} -eq 0 ]]; then
						echo "${ME}: mini-timelapse created"
					else
						echo "${ME}: mini-timelapse creation returned with RET=${RET}"
					fi
				fi

				# Remove the oldest files, but not if we only created this mini-timelapse because of a force
				if [[ ${MOD} -ne 0 || ${TIMELAPSE_MINI_FORCE_CREATION} == "false" ]]; then
					KEEP=$((TIMELAPSE_MINI_IMAGES - TIMELAPSE_MINI_FREQUENCY))
					x="$(tail -${KEEP} "${MINI_TIMELAPSE_FILES}")"
					echo -e "${x}" > "${MINI_TIMELAPSE_FILES}"
					if [[ ${ALLSKY_DEBUG_LEVEL} -ge 2 ]]; then
						echo -e "${YELLOW}${ME} Replaced ${TIMELAPSE_MINI_FREQUENCY} oldest file(s) and added current image.${NC}" >&2
					fi
				fi
			else
				# Not ready to create yet
				if [[ ${ALLSKY_DEBUG_LEVEL} -ge 4 ]]; then
					echo -n "${ME}: Not creating mini timelapse: "
					if [[ ${MOD} -eq 0 ]]; then
						echo "${LEFT} images(s) left."
					else
						echo "$((TIMELAPSE_MINI_FREQUENCY - MOD)) images(s) left in frequency."
					fi
				fi
				TIMELAPSE_MINI_UPLOAD_VIDEO="false"
			fi
		fi

	else
		echo "*** ERROR: ${ME}: unable to copy ${CURRENT_IMAGE} ***"
		SAVE_IMAGE="false"
		TIMELAPSE_MINI_UPLOAD_VIDEO="false"			# so we can easily compare below
	fi
fi

if [[ ${IMG_UPLOAD} == "true" || (${TIMELAPSE_MINI_UPLOAD_VIDEO} == "true" && ${SAVE_IMAGE} == "true") ]]; then
	#shellcheck disable=SC2086,SC1091		# file doesn't exist in GitHub
	source "${ALLSKY_CONFIG}/ftp-settings.sh"	|| exit ${ALLSKY_ERROR_STOP}
fi

# If upload is true, optionally create a smaller version of the image; either way, upload it
RET=0
if [[ ${IMG_UPLOAD} == "true" ]]; then
	# First check if we should upload this image
	if [[ ${IMG_UPLOAD_FREQUENCY} != "1" ]]; then
		FREQUENCY_FILE="${ALLSKY_TMP}/IMG_UPLOAD_FREQUENCY.txt"
		if [[ ! -f ${FREQUENCY_FILE} ]]; then
			# The file may have been deleted, or the user may have just changed the frequency.
			LEFT=${IMG_UPLOAD_FREQUENCY}
		else
			LEFT=$( < "${FREQUENCY_FILE}" )
		fi
		if [[ ${LEFT} -le 1 ]]; then
			# upload this one and reset the counter
			echo "${IMG_UPLOAD_FREQUENCY}" > "${FREQUENCY_FILE}"
		else
			# Not ready to upload yet, so decrement the counter
			LEFT=$((LEFT - 1))
			echo "${LEFT}" > "${FREQUENCY_FILE}"
			# This ALLSKY_DEBUG_LEVEL should be same as what's in upload.sh
			[[ ${ALLSKY_DEBUG_LEVEL} -ge 4 ]] && echo "${ME}: Not uploading image: ${LEFT} images(s) left."

			# We didn't create ${WEBSITE_FILE} yet so do that now.
			mv "${CURRENT_IMAGE}" "${WEBSITE_FILE}"

			exit 0
		fi
	fi

	# We no longer use the "permanent" image name; instead, use the one the user specified
	# in the config file (${FULL_FILENAME}).
	if [[ ${RESIZE_UPLOADS} == "true" ]]; then
		# Need a copy of the image since we are going to resize it.
		# Put the copy in ${WORKING_DIR}.
		FILE_TO_UPLOAD="${WORKING_DIR}/resize-${IMAGE_NAME}"
		S="${RESIZE_UPLOADS_WIDTH}x${RESIZE_UPLOADS_HEIGHT}"
		[ "${ALLSKY_DEBUG_LEVEL}" -ge 4 ] && echo "${ME}: Resizing upload file '${FILE_TO_UPLOAD}' to ${S}"
		if ! convert "${CURRENT_IMAGE}" -resize "${S}" -gravity East -chop 2x0 "${FILE_TO_UPLOAD}" ; then
			echo -e "${YELLOW}*** ${ME}: WARNING: RESIZE_UPLOADS failed; continuing with larger image.${NC}"
			# We don't know the state of $FILE_TO_UPLOAD so use the larger file.
			FILE_TO_UPLOAD="${CURRENT_IMAGE}"
		fi
	else
		FILE_TO_UPLOAD="${CURRENT_IMAGE}"
	fi

	if [[ ${IMG_UPLOAD_ORIGINAL_NAME} == "true" ]]; then
		DESTINATION_NAME=""
	else
		DESTINATION_NAME="${FULL_FILENAME}"
	fi

	"${ALLSKY_SCRIPTS}/upload.sh" "${FILE_TO_UPLOAD}" "${IMAGE_DIR}" "${DESTINATION_NAME}" "SaveImage" "${WEB_IMAGE_DIR}"
	RET=$?

	[[ ${RESIZE_UPLOADS} == "true" ]] && rm -f "${FILE_TO_UPLOAD}"	# was a temporary file
fi

# If needed, upload the mini timelapse.  If upload.sh failed above, it will likely fail below.
if [[ ${TIMELAPSE_MINI_UPLOAD_VIDEO} == "true" && ${SAVE_IMAGE} == "true" && ${RET} -eq 0 ]] ; then
	MINI="mini-timelapse.mp4"
	FILE_TO_UPLOAD="${ALLSKY_TMP}/${MINI}"

	"${ALLSKY_SCRIPTS}/upload.sh" "${FILE_TO_UPLOAD}" "${IMAGE_DIR}" "${MINI}" "MiniTimelapse" "${WEB_IMAGE_DIR}"
	RET=$?
	if [[ ${RET} -eq 0 && ${TIMELAPSE_MINI_UPLOAD_THUMBNAIL} == "true" ]]; then
		UPLOAD_THUMBNAIL_NAME="mini-timelapse.jpg"
		UPLOAD_THUMBNAIL="${ALLSKY_TMP}/${UPLOAD_THUMBNAIL_NAME}"
		# Create the thumbnail for the mini timelapse, then upload it.
		rm -f "${UPLOAD_THUMBNAIL}"
		ffmpeg -loglevel error -i "${FILE_TO_UPLOAD}" \
			-filter:v scale="${THUMBNAIL_SIZE_X}:-1" -frames:v 1 "${UPLOAD_THUMBNAIL}"
		if [[ ! -f ${UPLOAD_THUMBNAIL} ]]; then
			echo "${ME}Mini timelapse thumbnail not created!"
		else
			# Use --silent because we just displayed message(s) above for this image.
			if [[ -n ${WEB_VIDEOS_DIR} ]]; then
				x="${WEB_VIDEOS_DIR}/thumbnails"
			else
				x=""
			fi
			"${ALLSKY_SCRIPTS}/upload.sh" --silent \
				"${UPLOAD_THUMBNAIL}" \
				"${IMAGE_DIR}" \
				"${UPLOAD_THUMBNAIL_NAME}" \
				"MiniThumbnail" \
				"${x}"
		fi
	fi
fi

# We create ${WEBSITE_FILE} as late as possible to avoid it being overwritten.
mv "${SAVED_FILE}" "${WEBSITE_FILE}"

exit 0
