#!/bin/bash
source /home/pi/allsky/config.sh
source /home/pi/allsky/scripts/filename.sh
source /home/pi/allsky/scripts/darkCapture.sh

cd /home/pi/allsky

# If we are in darkframe mode, we only save to the dark file
DARK_MODE=$(jq -r '.darkframe' "$CAMERA_SETTINGS")

if [ $DARK_MODE = "1" ] ; then
        exit 0
fi

IMAGE_TO_USE="$FULL_FILENAME"
cp $IMAGE_TO_USE "liveview-$FILENAME.$EXTENSION"


# If 24 hour saving is desired, save the current image in today's directory
if [ "$CAPTURE_24HR" = true ] ; then
	CURRENT=$(date +'%Y%m%d')
	mkdir -p images/$CURRENT

	# Save image in images/current directory
	cp $IMAGE_TO_USE "images/$CURRENT/$FILENAME-$(date +'%Y%m%d%H%M%S').$EXTENSION"
fi

# If upload is true, create a smaller version of the image and upload it
if [ "$UPLOAD_IMG" = true ] ; then
	echo -e "Resizing"
	echo -e "Resizing $FULL_FILENAME \n" >> log.txt

	# Create a thumbnail for live view
	# Here's what I use with my ASI224MC
	convert "$IMAGE_TO_USE" -resize 962x720 -gravity East -chop 2x0 "$FILENAME-resize.$EXTENSION";
	# Here's what I use with my ASI185MC (larger sensor so I crop the black around the image)
	#convert "$IMAGE_TO_USE" -resize 962x720 -gravity Center -crop 680x720+40+0 +repage "$FILENAME-resize.$EXTENSION";

	echo -e "Uploading\n"
	echo -e "Uploading $FILENAME-resize.$EXTENSION \n" >> log.txt
	lftp "$PROTOCOL"://"$USER":"$PASSWORD"@"$HOST":"$IMGDIR" -e "set net:max-retries 1; set net:timeout 20; put $FILENAME-resize.$EXTENSION; bye" &
fi


