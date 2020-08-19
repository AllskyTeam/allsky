#!/bin/bash

cd $ALLSKY_HOME

# If we are in darkframe mode, we only save to the dark file
DARK_MODE=$(jq -r '.darkframe' "$CAMERA_SETTINGS")

TEMP_FILE="temperature.txt"
if [ -e "$TEMP_FILE" ]; then
	TEMP=$(printf "%.0f" "`cat temperature.txt`")
else
	# If the temperature file doesn't exist, set a default value
	TEMP=20
fi

if [ $DARK_MODE = "1" ] ; then
        mkdir -p darks
        cp $FULL_FILENAME "darks/$TEMP.$EXTENSION"
        cp $FULL_FILENAME "liveview-$FILENAME.$EXTENSION"
        exit 0
fi
