#!/bin/bash

ME="$(basename "$BASH_ARGV0")"

source "${ALLSKY_HOME}/variables.sh"
source "${ALLSKY_CONFIG}/config.sh"
source "${ALLSKY_SCRIPTS}/filename.sh"
source "${ALLSKY_SCRIPTS}/darkCapture.sh"	# does not return if in darkframe mode
source "${ALLSKY_CONFIG}/ftp-settings.sh"

cd $ALLSKY_HOME

IMAGE_TO_USE="$FULL_FILENAME"
# quotes around $IMAGE_TO_USE below, in case it has a space or special characters.

# Quick check to make sure the image isn't corrupted.
identify "$IMAGE_TO_USE" >/dev/null 2>&1
if [ $? -ne 0 ] ; then
	echo "${RED}*** $ME: ERROR: Image '${IMAGE_TO_USE} is corrupt; ignoring.${NC}"
	exit 3
fi

# Resize the image if required
if [[ $IMG_RESIZE == "true" ]]; then
        convert "$IMAGE_TO_USE" -resize "$IMG_WIDTH"x"$IMG_HEIGHT" "$IMAGE_TO_USE"
	if [ $? -ne 0 ] ; then
		echo "${RED}*** $ME: ERROR: IMG_RESIZE failed${NC}"
		exit 4
	fi
fi

# Crop the image around the center if required
if [[ $CROP_IMAGE == "true" ]]; then
        convert "$IMAGE_TO_USE" -gravity Center -crop "$CROP_WIDTH"x"$CROP_HEIGHT"+"$CROP_OFFSET_X"+"$CROP_OFFSET_Y" +repage "$IMAGE_TO_USE"
	if [ $? -ne 0 ] ; then
		echo "${RED}*** $ME: ERROR: CROP_IMAGE failed${NC}"
		exit 4
	fi
fi

# IMG_DIR and IMG_PREFIX are in config.sh
# If the user specified an IMG_PREFIX, copy the file to that name so the websites can display it.
if [ "${IMG_PREFIX}" != "" ]; then
	cp "$IMAGE_TO_USE" "${IMG_PREFIX}${FILENAME}.${EXTENSION}"
fi

# If daytime saving is desired, save the current image in today's directory
if [ "${CAPTURE_24HR}" = "true" -o "${DAYTIME_SAVE}" = "true" ] ; then
	DATE_DIR="${ALLSKY_IMAGES}/$(date +'%Y%m%d')"

	THUMBNAILS_DIR=${DATE_DIR}/thumbnails
	mkdir -p $THUMBNAILS_DIR	# it also makes ${DATE_DIR}

	# Copy image to the final location.
	SAVED_FILE="$FILENAME-$(date +'%Y%m%d%H%M%S').$EXTENSION"
	cp "$IMAGE_TO_USE" "${DATE_DIR}/${SAVED_FILE}"

	# Create a thumbnail of the image for faster load in web GUI.
	# If we resized above, this will be a resize of a resize,
	# but for thumbnails it should be ok.
	convert "$IMAGE_TO_USE" -resize "${THUMBNAIL_SIZE_X}x${THUMBNAIL_SIZE_Y}" "$THUMBNAILS_DIR/$SAVED_FILE"
	if [ $? -ne 0 ] ; then
		echo "*** $ME: ERROR: THUMBNAIL resize failed; continuing."
    	fi
fi

# If upload is true, optionally create a smaller version of the image; either way, upload it
if [ "$UPLOAD_IMG" = true ] ; then
	if [[ "$RESIZE_UPLOADS" == "true" ]]; then
		# Create a smaller version for upload
		convert "$IMAGE_TO_USE" -resize "$RESIZE_UPLOADS_SIZE" -gravity East -chop 2x0 "$IMAGE_TO_USE"
		if [ $? -ne 0 ] ; then
			echo -e "${YELLOW}*** ${ME}: WARNING: RESIZE_UPLOADS failed; continuing with larger image.${NC}"
		fi
	fi

	"${ALLSKY_SCRIPTS}/upload.sh" "${IMAGE_TO_USE}" "${IMGDIR}" "${IMAGE_TO_USE}" "SaveImageDay"
	exit $?
fi

exit 0
