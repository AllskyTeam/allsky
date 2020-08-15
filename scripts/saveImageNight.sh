#!/bin/bash
source /home/pi/allsky/config.sh
source /home/pi/allsky/scripts/filename.sh
source /home/pi/allsky/scripts/darkCapture.sh
source /home/pi/allsky/scripts/darkSubtract.sh

cd /home/pi/allsky

# If we are in darkframe mode, we only save to the dark file
DARK_MODE=$(jq -r '.darkframe' "$CAMERA_SETTINGS")

if [ $DARK_MODE = "1" ] ; then
        exit 0
fi

# Make a directory to store current night images
# the 12 hours ago option ensures that we're always using today's date even at high latitudes where civil twilight can start after midnight
CURRENT=$(date -d '12 hours ago' +'%Y%m%d')
mkdir -p images/$CURRENT
mkdir -p images/$CURRENT/thumbnails

# Create image to use (original or processed) for liveview in GUI
IMAGE_TO_USE="$FULL_FILENAME"
if [ "$DARK_FRAME_SUBTRACTION" = true ] ; then
	IMAGE_TO_USE="$FILENAME-processed.$EXTENSION"
fi

#Uncomment the following line to enable image stretching
#convert $IMAGE_TO_USE -sigmoidal-contrast 10,10% $IMAGE_TO_USE
cp $IMAGE_TO_USE "liveview-$FILENAME.$EXTENSION"

# Save image in images/current directory
cp $IMAGE_TO_USE "images/$CURRENT/$FILENAME-$(date +'%Y%m%d%H%M%S').$EXTENSION"

# Create a thumbnail of the image for faster load in web GUI
if identify $IMAGE_TO_USE >/dev/null 2>&1; then
	convert "$IMAGE_TO_USE" -resize 100x75 "images/$CURRENT/thumbnails/$FILENAME-$(date +'%Y%m%d%H%M%S').$EXTENSION";
fi

echo -e "Saving $FILENAME-$(date +'%Y%m%d%H%M%S').$EXTENSION\n" >> log.txt

# If upload is true, create a smaller version of the image and upload it
if [ "$UPLOAD_IMG" = true ] ; then
	echo -e "Resizing \n"
	echo -e "Resizing $FULL_FILENAME \n" >> log.txt

	# Create a thumbnail for live view
	# Here's what I use with my ASI224MC
	convert "$IMAGE_TO_USE" -resize 962x720 -gravity East -chop 2x0 "$FILENAME-resize.$EXTENSION";
	# Here's what I use with my ASI185MC (larger sensor so I crop the black around the image)
	#convert "$IMAGE_TO_USE" -resize 962x720 -gravity Center -crop 680x720+40+0 +repage "$FILENAME-resize.$EXTENSION";

	echo -e "Uploading \n"
	echo -e "Uploading $FILENAME-resize.$EXTENSION \n" >> log.txt
	lftp "$PROTOCOL"://"$USER":"$PASSWORD"@"$HOST":"$IMGDIR" -e "set net:max-retries 1; set net:timeout 20; put $FILENAME-resize.$EXTENSION; bye" &
fi


