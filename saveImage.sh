#!/bin/bash

CAMERA_SETTINGS='settings.json'
FILENAME=$(jq -r '.filename' $CAMERA_SETTINGS)
EXTENSION="${FILENAME##*.}"
FILENAME="${FILENAME%.*}"
UPLOAD=$2

# Make a directory to store current night images
mkdir -p images/current;
cp "$1" "images/current/$FILENAME-$(date +'%Y%m%d%H%M%S').$EXTENSION";

if [ "$UPLOAD" = true ] ; then
    	echo "Resizing\n";
	
	# Create a thumbnail for live view
	# Here's what I use with my ASI224MC
	convert "$1" -resize 962x720 -gravity East -chop 2x0 "$FILENAME-resize.$EXTENSION";
	# Here's what I use with my ASI185MC (larger sensor so I crop the black around the image)
	#convert "$1" -resize 962x720 -gravity Center -crop 680x720+40+0 +repage "$FILENAME-resize.$EXTENSION";
	
	#echo "Uploading\n";
	lftp sftp://user:password@host:/path/to/website -e "put $FILENAME-resize.$EXTENSION; bye"

fi

