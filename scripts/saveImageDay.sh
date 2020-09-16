#!/bin/bash
source $ALLSKY_HOME/config.sh
source $ALLSKY_HOME/scripts/filename.sh
source $ALLSKY_HOME/scripts/darkCapture.sh
source $ALLSKY_HOME/scripts/ftp-settings.sh

cd $ALLSKY_HOME

# If we are in darkframe mode, we only save to the dark file
DARK_MODE=$(jq -r '.darkframe' "$CAMERA_SETTINGS")

if [ $DARK_MODE = "1" ] ; then
        exit 0
fi

IMAGE_TO_USE="$FULL_FILENAME"

# Crop the image around the center if required
if [[ $CROP_IMAGE == "true" ]]; then
        convert "$IMAGE_TO_USE" -gravity Center -crop "$CROP_WIDTH"x"$CROP_HEIGHT"+"$CROP_OFFSET_X"+"$CROP_OFFSET_Y" +repage "$IMAGE_TO_USE";
fi

cp $IMAGE_TO_USE "liveview-$FILENAME.$EXTENSION"


# If 24 hour saving is desired, save the current image in today's directory
if [ "$CAPTURE_24HR" = true ] ; then
	CURRENT=$(date +'%Y%m%d')
	TFILENAME="$(date +'%Y%m%d%H%M%S').$EXTENSION"

	mkdir -p images/$CURRENT
	mkdir -p images/$CURRENT/thumbnails

	# Save image in images/current directory
	cp $IMAGE_TO_USE "images/$CURRENT/$TFILENAME"

	# Create a thumbnail of the image for faster load in web GUI
    	if identify $IMAGE_TO_USE >/dev/null 2>&1; then
        	convert "$IMAGE_TO_USE" -resize 100x75 "images/$CURRENT/thumbnails/$TFILENAME";
    	fi
fi

# If upload is true, create a smaller version of the image and upload it
if [ "$UPLOAD_IMG" = true ] ; then
	echo -e "Resizing"
	echo -e "Resizing $FULL_FILENAME \n" >> log.txt

	# Create a thumbnail for live view
	convert "$IMAGE_TO_USE" -resize 962x720 -gravity East -chop 2x0 "$FILENAME-resize.$EXTENSION";

	echo -e "Uploading\n"
	echo -e "Uploading $FILENAME-resize.$EXTENSION \n" >> log.txt
	lftp "$PROTOCOL"://"$USER":"$PASSWORD"@"$HOST":"$IMGDIR" -e "set net:max-retries 1; set net:timeout 20; put $FILENAME-resize.$EXTENSION; bye" &
fi
