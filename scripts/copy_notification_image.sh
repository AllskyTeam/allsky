#!/bin/bash

ME="$(basename "$BASH_ARGV0")"	# Include script name in output so it's easier to find in the log file

NOTIFICATIONFILE="$1"	# filename, minus the extension, since the extension may vary
if [ "$1" = "" ] ; then
	echo "*** $ME: ERROR: no file specified" >&2
	exit 1
fi

source $ALLSKY_HOME/config.sh
source $ALLSKY_HOME/scripts/filename.sh
source $ALLSKY_HOME/scripts/ftp-settings.sh

cd $ALLSKY_HOME

NOTIFICATIONFILE="notification_images/$NOTIFICATIONFILE.$EXTENSION"
if [ ! -e "$NOTIFICATIONFILE" ] ; then
	echo "*** $ME: ERROR: File '$NOTIFICATIONFILE' does not exist or is empty!" >&2
	exit 1
fi

IMAGE_TO_USE="$FULL_FILENAME"
cp "$NOTIFICATIONFILE" "$IMAGE_TO_USE"	# don't overwrite notification image

# Resize the image if required
if [ $IMG_RESIZE = "true" ]; then
        convert "$IMAGE_TO_USE" -resize "$IMG_WIDTH"x"$IMG_HEIGHT" "$IMAGE_TO_USE"
	RET=$?
	if [ $RET -ne 0 ] ; then
		echo "*** $ME: ERROR: IMG_RESIZE failed with RET=$RET"
		exit 1
	fi
fi

# IMG_DIR and IMG_PREFIX are in config.sh
# If the user specified an IMG_PREFIX, copy the file to that name so the websites can display it.
if [ "${IMG_PREFIX}" != "" ]; then
	cp "$IMAGE_TO_USE" "${IMG_PREFIX}${FILENAME}.${EXTENSION}"
fi

# If 24 hour saving is desired, save the image in today's thumbnail directory
# so the user can see when things changed.
# Don't save in main image directory because we don't want the notification image in timelapses.
if [ "$CAPTURE_24HR" = "true" ] ; then
	CURRENT=$(date +'%Y%m%d')
	mkdir -p images/$CURRENT
	THUMBNAILS_DIR=images/$CURRENT/thumbnails
	mkdir -p $THUMBNAILS_DIR

	SAVED_FILE="$FILENAME-$(date +'%Y%m%d%H%M%S').$EXTENSION"
	# Create a thumbnail of the image for faster load in web GUI
	convert "$IMAGE_TO_USE" -resize "${THUMBNAIL_SIZE_X}x${THUMBNAIL_SIZE_Y}" "$THUMBNAILS_DIR/$SAVED_FILE"
	RET=$?
	if [ $RET -ne 0 ] ; then
		echo "*** $ME: WARNING: THUMBNAIL resize failed with RET=$RET; continuing."
    	fi
fi

# If upload is true, optionally create a smaller version of the image and upload it
if [ "$UPLOAD_IMG" = "true" ] ; then
	if [ "$RESIZE_UPLOADS" = "true" ]; then
		echo -e "$ME: Resizing $NOTIFICATIONFILE for uploading"
		# Create a smaller version for upload
		convert "$IMAGE_TO_USE" -resize "$RESIZE_UPLOADS_SIZE" -gravity East -chop 2x0 "$IMAGE_TO_USE"
		RET=$?
		if [ $RET -ne 0 ] ; then
			echo "*** $ME: ERROR: RESIZE_UPLOADS failed with RET=$RET"
			exit 1
    		fi
	fi

	TS=$(ls -l --time-style='+%H:%M:%S' $IMAGE_TO_USE | awk '{print $6}')
	echo -e "$ME: Uploading $(basename $NOTIFICATIONFILE) with timestamp: $TS\n"
	if [ $PROTOCOL = "S3" ] ; then
                $AWS_CLI_DIR/aws s3 cp "$IMAGE_TO_USE" s3://$S3_BUCKET$IMGDIR --acl $S3_ACL &
        elif [ $PROTOCOL = "local" ] ; then
		cp "$IMAGE_TO_USE" "$IMGDIR" &
	else
		TEMP_NAME="ni-$RANDOM"
		# "ni" = notification image.  Use unique temporary name.
		lftp "$PROTOCOL://$USER:$PASSWORD@$HOST:$IMGDIR" -e "set net:max-retries 2; set net:timeout 20; put "$IMAGE_TO_USE" -o $TEMP_NAME; rm -f "$IMAGE_TO_USE"; mv $TEMP_NAME "$IMAGE_TO_USE"; bye" &

        fi
fi
