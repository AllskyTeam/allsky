#!/bin/bash

ME="$(basename "${BASH_ARGV0}")"

source "${ALLSKY_HOME}/variables.sh"
source "${ALLSKY_CONFIG}/config.sh"
source "${ALLSKY_SCRIPTS}/filename.sh"
source "${ALLSKY_CONFIG}/ftp-settings.sh"

NOTIFICATIONFILE="$1"	# filename, minus the extension, since the extension may vary
if [ "$1" = "" ] ; then
	echo "${RED}*** ${ME}: ERROR: no file specified.${NC}" >&2
	exit 1
fi

NOTIFICATIONFILE="${ALLSKY_NOTIFICATION_IMAGES}/${NOTIFICATIONFILE}.${EXTENSION}"
if [ ! -e "${NOTIFICATIONFILE}" ] ; then
	echo "${RED}*** ${ME}: ERROR: File '${NOTIFICATIONFILE}' does not exist or is empty!${NC}" >&2
	exit 2
fi

IMAGE_TO_USE="${CAPTURE_SAVE_DIR}/notification-${FULL_FILENAME}"
# Don't overwrite notification image so create a temporary copy and use that.
cp "${NOTIFICATIONFILE}" "${IMAGE_TO_USE}"

# Resize the image if required
if [ "${IMG_RESIZE}" = "true" ]; then
	convert "${IMAGE_TO_USE}" -resize "${IMG_WIDTH}x${IMG_HEIGHT}" "${IMAGE_TO_USE}"
	if [ $? -ne 0 ] ; then
		echo "${RED}*** ${ME}: ERROR: IMG_RESIZE failed${NC}"
		exit 3
	fi
fi

# If daytime saving is desired, save the image in today's thumbnail directory if desired
# so the user can see when things changed.
# Don't save in main image directory because we don't want the notification image in timelapses.
# If at nighttime, save them in (possibly) yesterday's directory.
# If during day, save in today's directory.
if [ "${DAYTIME_SAVE}" = "true" -a "${IMG_CREATE_THUMBNAILS}" = "true" ] ; then
	DATE_DIR="${ALLSKY_IMAGES}/$(date +'%Y%m%d')"
	# Use today's folder if it exists, otherwise yesterday's
	[ ! -d "${DATE_DIR}" ] && DATE_DIR="${ALLSKY_IMAGES}/$(date -d '12 hours ago' +'%Y%m%d')"
	THUMBNAILS_DIR="${DATE_DIR}/thumbnails"
	mkdir -p ${THUMBNAILS_DIR}
	THUMB="${THUMBNAILS_DIR}/${FILENAME}-$(date +'%Y%m%d%H%M%S').${EXTENSION}"

	convert "${IMAGE_TO_USE}" -resize "${THUMBNAIL_SIZE_X}x${THUMBNAIL_SIZE_Y}" "${THUMB}"
	if [ $? -ne 0 ] ; then
		echo "${YELLOW}*** ${ME}: WARNING: THUMBNAIL resize failed; continuing.${NC}"
	fi
fi

FULL_FILENAME="${IMG_PREFIX}${FULL_FILENAME}"
FINAL_IMAGE="${CAPTURE_SAVE_DIR}/${FULL_FILENAME}"	# final resting place - no more changes to it.
mv -f "${IMAGE_TO_USE}" "${FINAL_IMAGE}"	# so web severs can see it.

# If upload is true, optionally create a smaller version of the image, either way, upload it.
if [ "${UPLOAD_IMG}" = "true" ] ; then
	if [ "${RESIZE_UPLOADS}" = "true" ]; then
		# Don't overwrite FINAL_IMAGE since the web server(s) may be looking at it.
		TEMP_FILE="${CAPTURE_SAVE_DIR}/resize-${FULL_FILENAME}"
		cp "${FINAL_IMAGE}" "${TEMP_FILE}"  # create temporary copy to resize
		convert "${TEMP_FILE}" -resize "${RESIZE_UPLOADS_SIZE}" -gravity East -chop 2x0 "${TEMP_FILE}"
		if [ $? -ne 0 ] ; then
			echo "${RED}*** ${ME}: ERROR: RESIZE_UPLOADS failed${NC}"
			# Leave temporary file for possible debugging.
			exit 4
		fi
		UPLOAD_FILE="${TEMP_FILE}"
	else
		UPLOAD_FILE="${FINAL_IMAGE}"
		TEMP_FILE=""
	fi

	# We're actually uploading $UPLOAD_FILE, but show $NOTIFICATIONFILE in the message since it's more descriptive.
	echo "${ME}: Uploading $(basename "${NOTIFICATIONFILE}")"
	"${ALLSKY_SCRIPTS}/upload.sh" --silent "${UPLOAD_FILE}" "${IMAGE_DIR}" "${FULL_FILENAME}" "NotificationImage"
	RET=$?

	# If we created a temporary copy, delete it.
	[ "${TEMP_FILE}" != "" ] && rm -f "${TEMP_FILE}"

	exit ${RET}
fi

exit 0
