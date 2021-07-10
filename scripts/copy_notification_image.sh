#!/bin/bash

NOTIFICATIONFILE="$1"	# filename, minus the extension, since the extension may vary
if [ "$1" = "" ] ; then
	echo "$0: ERROR: no file specified" >&2
	exit 1
fi

source $ALLSKY_HOME/config.sh
source $ALLSKY_HOME/scripts/filename.sh
source $ALLSKY_HOME/scripts/ftp-settings.sh

cd $ALLSKY_HOME

NOTIFICATIONFILE="notification_images/$NOTIFICATIONFILE.$EXTENSION"
if [ ! -e "$NOTIFICATIONFILE" ] ; then
	echo "$0: ERROR: File '$NOTIFICATIONFILE' does not exist or is empty!" >&2
	exit 1
fi

IMAGE_TO_USE="$FULL_FILENAME"
cp "$NOTIFICATIONFILE" "$IMAGE_TO_USE"	# don't overwrite notification image

# Resize the image if required
if [ $IMG_RESIZE = "true" ]; then
        convert "$IMAGE_TO_USE" -resize "$IMG_WIDTH"x"$IMG_HEIGHT" "$IMAGE_TO_USE"
fi

cp "$IMAGE_TO_USE" "liveview-$FILENAME.$EXTENSION"
if [ "$COPY_TO_WEBSITE" = "true" ]; then
	cp "$IMAGE_TO_USE" "$WEBSITE_LOCATION/liveview-$FILENAME.$EXTENSION"
fi

# If 24 hour saving is desired, save the image in today's thumbnail directory
# so the user can see when things changed.
# Don't save in main image directory because we don't want the notification image in timelapse or startrails.
if [ "$CAPTURE_24HR" = "true" ] ; then
	CURRENT=$(date +'%Y%m%d')
	mkdir -p images/$CURRENT
	mkdir -p images/$CURRENT/thumbnails

	SAVED_FILE="$FILENAME-$(date +'%Y%m%d%H%M%S').$EXTENSION"

	# Create a thumbnail of the image for faster load in web GUI
	convert "$IMAGE_TO_USE" -resize "$THUMBNAIL_SIZE" "images/$CURRENT/thumbnails/$SAVED_FILE"
fi

# If upload is true, optionally create a smaller version of the image and upload it
if [ "$UPLOAD_IMG" = "true" ] ; then
	if [ "$RESIZE_UPLOADS" = "true" ]; then
		echo -e "Resizing $NOTIFICATIONFILE for uploading"
		# Create a smaller version for upload
		convert "$IMAGE_TO_USE" -resize "$RESIZE_UPLOADS_SIZE" -gravity East -chop 2x0 "$IMAGE_TO_USE"
	fi

	TS=$(ls -l --time-style='+%H:%M:%S' $IMAGE_TO_USE | awk '{print $6}')
	echo -e "Uploading $NOTIFICATIONFILE with timestamp: $TS\n" # ECC modified
	if [ $PROTOCOL = "S3" ] ; then
                $AWS_CLI_DIR/aws s3 cp "$IMAGE_TO_USE" s3://$S3_BUCKET$IMGDIR --acl $S3_ACL &
        elif [ $PROTOCOL = "local" ] ; then
		cp "$IMAGE_TO_USE" "$IMGDIR" &
	else
		# "ni" = notification image.  Use unique temporary name.
		lftp "$PROTOCOL"://"$USER":"$PASSWORD"@"$HOST":"$IMGDIR" -e "set net:max-retries 2; set net:timeout 20; put $IMAGE_TO_USE -o ni; rm -f $IMAGE_TO_USE; mv ni $IMAGE_TO_USE; bye" &
        fi
fi
