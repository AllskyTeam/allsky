#!/bin/bash
source $ALLSKY_HOME/config.sh
source $ALLSKY_HOME/scripts/filename.sh
source $ALLSKY_HOME/scripts/darkCapture.sh	# does not return if in darkframe mode
source $ALLSKY_HOME/scripts/darkSubtract.sh
source $ALLSKY_HOME/scripts/ftp-settings.sh

cd $ALLSKY_HOME
ME="$(basename "$BASH_ARGV0")"	# Include script name in output so it's easier to find in the log file

# Make a directory to store current night images.
# The 12 hours ago option ensures that we're always using today's date even at high latitudes where civil twilight can start after midnight.
CURRENT=$(date -d '12 hours ago' +'%Y%m%d')
mkdir -p images/$CURRENT
THUMBNAILS_DIR=images/$CURRENT/thumbnails
mkdir -p $THUMBNAILS_DIR

# Create image to use (original or processed) for liveview in GUI
IMAGE_TO_USE="$FULL_FILENAME"
# quotes around $IMAGE_TO_USE below, in case it has a space or special characters.

# Make sure the image isn't corrupted
identify "$IMAGE_TO_USE" >/dev/null 2>&1
RET=$?
if [ $RET -ne 0 ] ; then
	echo "*** $ME: ERROR: Image '${IMAGE_TO_USE} is corrupt; ignoring."
	exit 1
fi

if [ "$DARK_FRAME_SUBTRACTION" = "true" ] ; then
	# PROCESSED_FILE should have been created by darkSubtract.sh.  If not, it output an error message.
	PROCESSED_FILE="$FILENAME-processed.$EXTENSION"
	# Check in case the user has subtraction set to "true" but has no dark frames.
	if [[ ! -f "$PROCESSED_FILE" ]]; then
		echo "*** $ME: WARNING: Processed image '$PROCESSED_FILE' does not exist; continuing!" >> log.txt
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
		echo "*** $ME: ERROR: IMG_RESIZE failed with RET=$RET"
		exit 1
	fi
fi

# Crop the image around the center if required
if [[ $CROP_IMAGE == "true" ]]; then
        convert "$IMAGE_TO_USE" -gravity Center -crop "$CROP_WIDTH"x"$CROP_HEIGHT"+"$CROP_OFFSET_X"+"$CROP_OFFSET_Y" +repage "$IMAGE_TO_USE"
	RET=$?
	if [ $RET -ne 0 ] ; then
		echo "*** $ME: ERROR: CROP_IMAGE failed with RET=$RET"
		exit 1
	fi
fi

# Stretch the image
if [[ $AUTO_STRETCH == "true" ]]; then
  	convert "$IMAGE_TO_USE" -sigmoidal-contrast "$AUTO_STRETCH_AMOUNT","$AUTO_STRETCH_MID_POINT" "$IMAGE_TO_USE"
	RET=$?
	if [ $RET -ne 0 ] ; then
		echo "*** $ME: ERROR: AUTO_STRETCH failed with RET=$RET"
		exit 1
	fi
fi

# IMG_DIR and IMG_PREFIX are in config.sh
# If the user specified an IMG_PREFIX, copy the file to that name so the websites can display it.
if [ "${IMG_PREFIX}" != "" ]; then
	cp "$IMAGE_TO_USE" "${IMG_PREFIX}${FILENAME}.${EXTENSION}"
fi

# Save image in images/current directory
SAVED_FILE="$FILENAME-$(date +'%Y%m%d%H%M%S').$EXTENSION"
cp "$IMAGE_TO_USE" "images/$CURRENT/$SAVED_FILE"

# Create a thumbnail of the image for faster load in web GUI.
# If we resized above, this will be a resize of a resize, but for thumbnails it should be ok.
convert "$IMAGE_TO_USE" -resize "${THUMBNAIL_SIZE_X}x${THUMBNAIL_SIZE_Y}" "$THUMBNAILS_DIR/$SAVED_FILE"
RET=$?
if [ $RET -ne 0 ] ; then
	echo "*** $ME: ERROR: THUMBNAIL resize failed with RET=$RET; continuing."
fi

# If upload is true, optionally create a smaller version of the image; either way, upload it
if [[ "$UPLOAD_IMG" == "true" ]] ; then
	if [[ "$RESIZE_UPLOADS" == "true" ]]; then
		echo -e "$ME: Resizing '$IMAGE_TO_USE' for uploading\n"		
		echo -e "$ME: Resizing '$IMAGE_TO_USE' for uploading\n" >> log.txt

		# Create smaller version for upload
		convert "$IMAGE_TO_USE" -resize "$RESIZE_UPLOADS_SIZE" -gravity East -chop 2x0 "$IMAGE_TO_USE"
		RET=$?
		[ $RET -ne 0 ] && echo "*** $ME: ERROR: RESIZE_UPLOADS failed with RET=$RET"
	fi

	TS=$(ls -l --time-style='+%H:%M:%S' $IMAGE_TO_USE | awk '{print $6}')
	echo -e "$ME: Uploading '$IMAGE_TO_USE' with timestamp: $TS\n"
	echo -e "$ME: Uploading '$IMAGE_TO_USE' with timestamp: $TS" >> log.txt
	if [[ $PROTOCOL == "S3" ]] ; then
		$AWS_CLI_DIR/aws s3 cp "$IMAGE_TO_USE" s3://$S3_BUCKET$IMGDIR --acl $S3_ACL &
	elif [[ $PROTOCOL == "local" ]] ; then
                cp "$IMAGE_TO_USE" "$IMGDIR" &
	elif [[ $PROTOCOL == "test" ]]; then			# added for testing
		(echo set ssl:check-hostname false
		 echo open -u "$USER,$PASSWORD" "ftp://$HOST"
		 echo cd "$IMGDIR"
		 echo set net:max-retries 1
		 echo set net:timeout 20
		 echo put "$IMAGE_TO_USE"
		 echo bye
		) > night.lftp
		lftp -d -f night.lftp > log_night.txt 2>&1 &
		
	else
		# "put" to a temp name, then move the temp name to the final name.
		# This is because slow uplinks can cause multiple lftp requests to be running at once,
		# and only one lftp can upload the file at once, otherwise get this error:
		# put: Access failed: 550 The process cannot access the file because it is being used by another process.  (image.jpg)
		# Slow uploads also cause a problem with web pages that try to read the file as it's being uploaded.
		# "si" = "save image" - use a unique temporary name
		TEMP_NAME="si-$RANDOM"
		lftp "$PROTOCOL://$USER:$PASSWORD@$HOST:$IMGDIR" -e "set net:max-retries 2; set net:timeout 20; put "$IMAGE_TO_USE" -o $TEMP_NAME; rm -f "$IMAGE_TO_USE"; mv $TEMP_NAME "$IMAGE_TO_USE"; bye" &
	fi
fi
