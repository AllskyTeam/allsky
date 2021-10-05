#!/bin/bash

ME="$(basename "${BASH_ARGV0}")"

source "${ALLSKY_HOME}/variables.sh"
source "${ALLSKY_CONFIG}/config.sh"
source "${ALLSKY_SCRIPTS}/filename.sh"
source "${ALLSKY_SCRIPTS}/darkCapture.sh"	# does not return if in darkframe mode
source "${ALLSKY_SCRIPTS}/darkSubtract.sh"
source "${ALLSKY_CONFIG}/ftp-settings.sh"

cd $ALLSKY_HOME

# Make a directory to store current night images.
# The 12 hours ago option ensures that we're always using today's date
# even at high latitudes where civil twilight can start after midnight.
DATE_DIR="${ALLSKY_IMAGES}/$(date -d '12 hours ago' +'%Y%m%d')"
THUMBNAILS_DIR="${DATE_DIR}/thumbnails"
mkdir -p ${THUMBNAILS_DIR}	# it also makes ${DATE_DIR}

# Create image to use (original or processed) for liveview in GUI
IMAGE_TO_USE="$FULL_FILENAME"
if [ "$IMAGE_TO_USE" = "" ]; then
	echo "${RED}*** $ME: ERROR: IMAGE_TO_USE is null.${NC}"
	exit 1
fi
# quotes around $IMAGE_TO_USE below, in case it has a space or special characters.

# Make sure the image isn't corrupted
identify "$IMAGE_TO_USE" >/dev/null 2>&1
RET=$?
if [ $RET -ne 0 ] ; then
	echo -e "${RED}*** ${ME}: ERROR: Image '${IMAGE_TO_USE}' is corrupt; ignoring.${NC}"
	exit 3
fi

if [ "$DARK_FRAME_SUBTRACTION" = "true" ] ; then
	# PROCESSED_FILE should have been created by darkSubtract.sh.  If not, it output an error message.
	PROCESSED_FILE="$FILENAME-processed.$EXTENSION"
	# Check in case the user has subtraction set to "true" but has no dark frames.
	if [[ ! -f "$PROCESSED_FILE" ]]; then
		echo "${YELLOW}*** $ME: WARNING: Processed image '$PROCESSED_FILE' does not exist; continuing!${NC}"
	else
		# Want the name of the final file to alway be the same
		mv -f "$PROCESSED_FILE" "$IMAGE_TO_USE"
	fi
fi

# Resize the image if required
if [[ $IMG_RESIZE == "true" ]]; then
        convert "$IMAGE_TO_USE" -resize "$IMG_WIDTH"x"$IMG_HEIGHT" "$IMAGE_TO_USE"
	RET=$?
	if [ $RET -ne 0 ] ; then
		echo -e "${RED}*** ${ME}: ERROR: IMG_RESIZE failed with RET=${RET}{$NC}"
		exit 4
	fi
fi

# Crop the image around the center if required
if [[ $CROP_IMAGE == "true" ]]; then
        convert "$IMAGE_TO_USE" -gravity Center -crop "$CROP_WIDTH"x"$CROP_HEIGHT"+"$CROP_OFFSET_X"+"$CROP_OFFSET_Y" +repage "$IMAGE_TO_USE"
	RET=$?
	if [ $RET -ne 0 ] ; then
		echo -e "${RED}*** ${ME}: ERROR: CROP_IMAGE failed with RET=${RET}{$NC}"
		exit 4
	fi
fi

# Stretch the image
if [[ $AUTO_STRETCH == "true" ]]; then
  	convert "$IMAGE_TO_USE" -sigmoidal-contrast "$AUTO_STRETCH_AMOUNT","$AUTO_STRETCH_MID_POINT" "$IMAGE_TO_USE"
	RET=$?
	if [ $RET -ne 0 ] ; then
		echo -e "${RED}*** ${ME}: ERROR: AUTO_STRETCH failed with RET=${RET}${NC}"
		exit 4
	fi
fi

# IMG_DIR and IMG_PREFIX are in config.sh
# If the user specified an IMG_PREFIX, copy the file to that name so the websites can display it.
if [ "${IMG_PREFIX}" != "" ]; then
	cp "$IMAGE_TO_USE" "${IMG_PREFIX}${FILENAME}.${EXTENSION}"
fi

# Copy image to the final location.
SAVED_FILE="$FILENAME-$(date +'%Y%m%d%H%M%S').$EXTENSION"
cp "$IMAGE_TO_USE" "${DATE_DIR}/${SAVED_FILE}"

# Create a thumbnail of the image for faster load in web GUI.
# If we resized above, this will be a resize of a resize, but for thumbnails it should be ok.
convert "$IMAGE_TO_USE" -resize "${THUMBNAIL_SIZE_X}x${THUMBNAIL_SIZE_Y}" "$THUMBNAILS_DIR/$SAVED_FILE"
RET=$?
if [ $RET -ne 0 ] ; then
	echo -e "${YELLOW}*** ${ME}: WARNING: THUMBNAIL resize failed with RET=${RET}; continuing.${NC}"
fi

# If upload is true, optionally create a smaller version of the image; either way, upload it
if [[ "$UPLOAD_IMG" == "true" ]] ; then
	if [[ "$RESIZE_UPLOADS" == "true" ]]; then
		# Create smaller version for upload
		convert "$IMAGE_TO_USE" -resize "$RESIZE_UPLOADS_SIZE" -gravity East -chop 2x0 "$IMAGE_TO_USE"
		RET=$?
		if [ ${RET} -ne 0 ] ; then
			echo -e "${YELLOW}*** ${ME}: WARNING: RESIZE_UPLOADS failed with RET=${RET}; continuing with larger image.${NC}"
		fi
	fi

	"${ALLSKY_SCRIPTS}/upload.sh" "${IMAGE_TO_USE}" "${IMGDIR}" "${IMAGE_TO_USE}" "SI"
	exit $?
fi
exit 0
