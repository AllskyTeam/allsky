#!/bin/bash

# Script to save a DAY or NIGHT image.

ME="$(basename "${BASH_ARGV0}")"

[ "${ALLSKY_DEBUG_LEVEL}" -ge 4 ] && echo "DEBUG: ${ME} $*"

source "${ALLSKY_HOME}/variables.sh"
source "${ALLSKY_CONFIG}/config.sh"

usage_and_exit()
{
	retcode=${1}
	[ ${retcode} -ne 0 ] && echo -ne "${RED}"
	echo -n "Usage: ${ME} DAY|NIGHT  full_path_to_filename  [variable=value [...]]"
	[ ${retcode} -ne 0 ] && echo -e "${NC}"
	exit ${retcode}
}
[ $# -lt 2 ] && usage_and_exit 1
# Export so other scripts can use it.
export DAY_OR_NIGHT="${1}"
[ "${DAY_OR_NIGHT}" != "DAY" -a "${DAY_OR_NIGHT}" != "NIGHT"  ] && usage_and_exit 1

# ${CURRENT_IMAGE} is the full path to a uniquely-named file created by the capture program.
# The file name is its final name in the ${ALLSKY_IMAGES}/<date> directory.
# Because it's a unique name we don't have to worry about another process overwritting it.
# We modify the file as needed and ultimately save a link to it as ${FULL_FILENAME} since
# that's what websites look for and what is uploaded.

# Export so other scripts can use it.
export CURRENT_IMAGE="${2}"
shift 2
if [ ! -f "${CURRENT_IMAGE}" ] ; then
	echo -e "${RED}*** ${ME}: ERROR: File '${CURRENT_IMAGE}' not found; ignoring${NC}"
	exit 2
fi
if [ ! -s "${CURRENT_IMAGE}" ] ; then
	echo -e "${RED}*** ${ME}: ERROR: File '${CURRENT_IMAGE}' is empty; ignoring${NC}"
	exit 2
fi

# The image may be in a memory filesystem, so do all the processing there and
# leave the image used by the website(s) in that directory.
IMAGE_NAME=$(basename "${CURRENT_IMAGE}")	# just the file name
WORKING_DIR=$(dirname "${CURRENT_IMAGE}")	# the directory the image is currently in

# Optional full check for bad images.
if [ "${REMOVE_BAD_IMAGES}" = "true" ]; then
	# If the return code is 99, the file was bad and deleted so don't continue.
	"${ALLSKY_SCRIPTS}/removeBadImages.sh" "${WORKING_DIR}" "${IMAGE_NAME}"
	# removeBadImages.sh displayed error message and deleted the file.
	[ $? -eq 99 ] && exit 99
else
	# Quick check to make sure the image isn't corrupted.
	identify "${CURRENT_IMAGE}" >/dev/null 2>&1
	if [ $? -ne 0 ] ; then
		echo -e "${RED}*** ${ME}: ERROR: '${CURRENT_IMAGE}' is corrupt; not saving.${NC}"
		exit 3
	fi
fi

# Get passed-in variables.
# Normally at least the exposure will be passed and the sensor temp if known.
while [ $# -gt 0 ]; do
	VARIABLE="AS_${1%=*}"		# everything before the "="
	VALUE="${1##*=}"			# everything after the "="
	shift
	# Export the variable so other scripts we call can use it.
	export ${VARIABLE}="${VALUE}"	# need "export" to get indirection to work
done

source "${ALLSKY_SCRIPTS}/darkCapture.sh"		# does not return if in darkframe mode
# xxxx TODO: Dark subtract long-exposure images, even if during daytime.
# xxxx TODO: Need a config variable to specify the threshold to dark subtract.
# xxxx TODO: Possibly also for stretching below.
if [ "${DAY_OR_NIGHT}" = "NIGHT" ] ; then
	source "${ALLSKY_SCRIPTS}/darkSubtract.sh"	# It will modify the image but not its name.
fi

# If any of the "convert"s below fail, exit since we won't know if the file was corrupted.

# Resize the image if required
if [ "${IMG_RESIZE}" = "true" ] ; then
	[ "${ALLSKY_DEBUG_LEVEL}" -ge 4 ] && echo "${ME}: Resizing '${CURRENT_IMAGE}' to ${IMG_WIDTH}x${IMG_HEIGHT}"
	convert "${CURRENT_IMAGE}" -resize "${IMG_WIDTH}x${IMG_HEIGHT}" "${CURRENT_IMAGE}"
	if [ $? -ne 0 ] ; then
		echo -e "${RED}*** ${ME}: ERROR: IMG_RESIZE failed; not saving${NC}"
		exit 4
	fi
fi

# Crop the image if required
if [ "${CROP_IMAGE}" = "true" ] ; then
	[ "${ALLSKY_DEBUG_LEVEL}" -ge 4 ] && echo "${ME}: Cropping '${CURRENT_IMAGE}' to ${CROP_WIDTH}x${CROP_HEIGHT}"
	convert "${CURRENT_IMAGE}" -gravity Center -crop "${CROP_WIDTH}x${CROP_HEIGHT}+${CROP_OFFSET_X}+${CROP_OFFSET_Y}" +repage "${CURRENT_IMAGE}"
	if [ $? -ne 0 ] ; then
		echo -e "${RED}*** ${ME}: ERROR: CROP_IMAGE failed; not saving${NC}"
		exit 4
	fi
fi

# Stretch the image if required, but only at night.
if [ "${DAY_OR_NIGHT}" = "NIGHT" -a ${AUTO_STRETCH} = "true" ]; then
	[ "${ALLSKY_DEBUG_LEVEL}" -ge 4 ] && echo "${ME}: Stretching '${CURRENT_IMAGE}' by ${AUTO_STRETCH_AMOUNT}"
 	convert "${CURRENT_IMAGE}" -sigmoidal-contrast "${AUTO_STRETCH_AMOUNT},${AUTO_STRETCH_MID_POINT}" "${IMAGE_TO_USE}"
	if [ $? -ne 0 ] ; then
		echo -e "${RED}*** ${ME}: ERROR: AUTO_STRETCH failed; not saving${NC}"
		exit 4
	fi
fi

SAVED_FILE="${CURRENT_IMAGE}"				# The name of the file saved from the camera.
WEBSITE_FILE="${WORKING_DIR}/${FULL_FILENAME}"		# The name of the file the websites look for

# If needed, save the current image in today's directory.
if [ "${DAYTIME_SAVE}" = "true" -o "${DAY_OR_NIGHT}" = "NIGHT" ] ; then
	# Determine what directory is the final resting place.
	if [ "${DAY_OR_NIGHT}" = "NIGHT" ] ; then
		# The 12 hours ago option ensures that we're always using today's date
		# even at high latitudes where civil twilight can start after midnight.
		DATE_DIR="${ALLSKY_IMAGES}/$(date -d '12 hours ago' +'%Y%m%d')"
	else
		# During the daytime we alway save the file in today's directory.
		DATE_DIR="${ALLSKY_IMAGES}/$(date +'%Y%m%d')"
	fi
	mkdir -p "${DATE_DIR}"

	if [ "${IMG_CREATE_THUMBNAILS}" = "true" ]; then
		THUMBNAILS_DIR="${DATE_DIR}/thumbnails"
		mkdir -p ${THUMBNAILS_DIR}
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
	cp "${CURRENT_IMAGE}" "${FINAL_FILE}" || echo "*** ERROR: ${ME}: unable to copy ${CURRENT_IMAGE} ***"
fi

# If upload is true, optionally create a smaller version of the image; either way, upload it
if [ "${IMG_UPLOAD}" = "true" ] ; then
	# First check if we should upload this image
	if [ "${IMG_UPLOAD_FREQUENCY}" != "1" ]; then
		FREQUENCY_FILE="${ALLSKY_TMP}/IMG_UPLOAD_FREQUENCY.txt"
		typeset -i LEFT
		if [ ! -f "${FREQUENCY_FILE}" ]; then
			# The file may have been deleted, or the user may have just changed the frequency.
			echo "${IMG_UPLOAD_FREQUENCY}" > "${FREQUENCY_FILE}"
			let LEFT=${IMG_UPLOAD_FREQUENCY}
		else
			let LEFT=$( < "${FREQUENCY_FILE}" )
		fi
		if [ ${LEFT} -le 1 ]; then
			# upload this one and reset the counter
			echo "${IMG_UPLOAD_FREQUENCY}" > "${FREQUENCY_FILE}"
		else
			# Not ready to upload yet, so decrement the counter
			let LEFT=LEFT-1
			echo "${LEFT}" > "${FREQUENCY_FILE}"
			# This ALLSKY_DEBUG_LEVEL should be same as what's in upload.sh
			[ "${ALLSKY_DEBUG_LEVEL}" -ge 3 ] && echo "${ME}: Not uploading: ${LEFT} images(s) left."

			# We didn't create ${WEBSITE_FILE} yet so do that now.
			mv "${CURRENT_IMAGE}" "${WEBSITE_FILE}"

			exit 0
		fi
	fi

	source "${ALLSKY_CONFIG}/ftp-settings.sh"

	# We no longer use the "permanent" image name; instead, use the one the user specified
	# in the config file (${FULL_FILENAME}).
	if [ "${RESIZE_UPLOADS}" = "true" ] ; then
		# Need a copy of the image since we are going to resize it.
		# Put the copy in ${WORKING_DIR}.
		FILE_TO_UPLOAD="${WORKING_DIR}/resize-${IMAGE_NAME}"
		[ "${ALLSKY_DEBUG_LEVEL}" -ge 4 ] && echo "${ME}: Resizing upload file '${FILE_TO_UPLOAD}' to ${RESIZE_UPLOADS_SIZE}"
		convert "${CURRENT_IMAGE}" -resize "${RESIZE_UPLOADS_SIZE}" -gravity East -chop 2x0 "${FILE_TO_UPLOAD}"
		if [ $? -ne 0 ] ; then
			echo -e "${YELLOW}*** ${ME}: WARNING: RESIZE_UPLOADS failed; continuing with larger image.${NC}"
			# We don't know the state of $FILE_TO_UPLOAD so use the larger file.
			FILE_TO_UPLOAD="${CURRENT_IMAGE}"
		fi
	else
		FILE_TO_UPLOAD="${CURRENT_IMAGE}"
	fi

	"${ALLSKY_SCRIPTS}/upload.sh" "${FILE_TO_UPLOAD}" "${IMAGE_DIR}" "${FULL_FILENAME}" "SaveImage" "${WEB_IMAGE_DIR}"

	[ "${RESIZE_UPLOADS}" = "true" ] && rm -f "${FILE_TO_UPLOAD}"	# was a temporary file
fi

# We create $WEBSITE_FILE as late as possible to avoid it being overwritten.
mv "${SAVED_FILE}" "${WEBSITE_FILE}"

exit 0
