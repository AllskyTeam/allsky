#!/bin/bash

# This file is "source"d into another.
cd $ALLSKY_HOME

# If we are in darkframe mode, we only save to the dark file
DARK_MODE=$(jq -r '.darkframe' "$CAMERA_SETTINGS")
USE_NOTIFICATION_IMAGES=$(jq -r '.notificationimages' "$CAMERA_SETTINGS")

# If the temperature file doesn't exist, set a default value
TEMP=20
if [ "$DARK_MODE" = "1" ] ; then

	TEMP_FILE="temperature.txt"
	if [ -s "$TEMP_FILE" ]; then		# -s so we don't use an empty file
		TEMP=$(printf "%.0f" "`cat ${TEMP_FILE}`")
	fi

        mkdir -p darks
	# To avoid having the websites display a dark frame, when in dark mode
	# the image file is different.
	DARK_FRAME="dark.$EXTENSION"
        cp "$DARK_FRAME" "darks/$TEMP.$EXTENSION"

	# If the user has notification images on, the current images says we're taking dark frames, so don't overwrite.
	if [ "$USE_NOTIFICATION_IMAGES" = "0" ] ; then
		# Go ahead and let the web sites see the dark frame.  Not very interesting though...
        	cp "$DARK_FRAME" "${IMG_PREFIX}${FILENAME}.${EXTENSION}"
	fi

        exit 0	# exit so the calling script exits.
fi
