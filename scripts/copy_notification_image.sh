#!/bin/bash

ME="$(basename "${BASH_ARGV0}")"

NOTIFICATIONFILE="$1"	# filename, minus the extension, since the extension may vary
if [ "$1" = "" ] ; then
	echo "*** ${ME}: ERROR: no file specified" >&2
	exit 1
fi

source "${ALLSKY_HOME}/config/variables.sh"
source "${ALLSKY_CONFIG}/config.sh"
source "${ALLSKY_SCRIPTS}/filename.sh"
source "${ALLSKY_SCRIPTS}/ftp-settings.sh"

cd "${ALLSKY_HOME}"

NOTIFICATIONFILE="${ALLSKY_NOTIFICATION_IMAGES}/${NOTIFICATIONFILE}.${EXTENSION}"
if [ ! -e "${NOTIFICATIONFILE}" ] ; then
	echo "*** ${ME}: ERROR: File '${NOTIFICATIONFILE}' does not exist or is empty!" >&2
	exit 2
fi

IMAGE_TO_USE="${ALLSKY_TMP}/notification-${FULL_FILENAME}"
# Don't overwrite notification image so create a temporary copy and use that.
cp "${NOTIFICATIONFILE}" "${IMAGE_TO_USE}"

# Resize the image if required
if [ "${IMG_RESIZE}" = "true" ]; then
        convert "${IMAGE_TO_USE}" -resize "${IMG_WIDTH}x${IMG_HEIGHT}" "${IMAGE_TO_USE}"
	RET=$?
	if [ ${RET} -ne 0 ] ; then
		echo "*** ${ME}: ERROR: IMG_RESIZE failed with RET=${RET}"
		exit 3
	fi
fi

# If daytime saving is desired, save the image in today's thumbnail directory
# so the user can see when things changed.
# Don't save in main image directory because we don't want the notification image in timelapses.
# If at nighttime, save them in (possibly) yesterday's directory.
# If during day, save in today's directory.
if [ "${CAPTURE_24HR}" = "true" ] ; then
	IMAGES_DIR="${ALLSKY_IMAGES}/$(date +'%Y%m%d')"
	THUMB="${IMAGES_DIR}/thumbnails/${FILENAME}-$(date +'%Y%m%d%H%M%S').${EXTENSION}"

	convert "${IMAGE_TO_USE}" -resize "${THUMBNAIL_SIZE_X}x${THUMBNAIL_SIZE_Y}" "${THUMB}"
	RET=$?
	if [ ${RET} -ne 0 ] ; then
		echo "*** ${ME}: WARNING: THUMBNAIL resize failed with RET=${RET}; continuing."
    	fi
fi

mv -f "${IMAGE_TO_USE}" "${ALLSKY_HOME}/${FULL_FILENAME}"	# so web severs can see it.

# If upload is true, optionally create a smaller version of the image and upload it
if [ "${UPLOAD_IMG}" = "true" ] ; then
	# Don't overwrite FULL_FILENAME since the web server(s) may be looking at it.
	cp "${ALLSKY_HOME}/${FULL_FILENAME}" "${ALLSKY_TMP}"
	IMAGE_TO_USE="${ALLSKY_TMP}/${FULL_FILENAME}"
	if [ "${RESIZE_UPLOADS}" = "true" ]; then
		# Create a smaller version for upload
		convert "${IMAGE_TO_USE}" -resize "${RESIZE_UPLOADS_SIZE}" -gravity East -chop 2x0 "${IMAGE_TO_USE}"
		RET=$?
		if [ ${RET} -ne 0 ] ; then
			echo "*** ${ME}: ERROR: RESIZE_UPLOADS failed with RET=${RET}"
			exit 4
    		fi
	fi

	# We're actually uploading $IMAGE_TO_USE, but show $NOTIFICATIONFILE
	# in the message since it's more descriptive.
	echo -e "${ME}: Uploading $(basename "${NOTIFICATIONFILE}")\n"
	# NI == Notification Image
	"${ALLSKY_SCRIPTS}/upload.sh" --silent "${IMAGE_TO_USE}" "${IMG_DIR}" "${FULL_FILENAME}" "NI"
fi
exit 0
