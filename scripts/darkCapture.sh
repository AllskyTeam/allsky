#!/bin/bash

cd $ALLSKY_HOME

# If we are in darkframe mode, we only save to the dark file
DARK_MODE=$(jq -r '.darkframe' "$CAMERA_SETTINGS")
TEMP=$(printf "%.0f" "`cat temperature.txt`")

if [ $DARK_MODE = "1" ] ; then
        mkdir -p darks
        cp $FULL_FILENAME "darks/$TEMP.$EXTENSION"
        cp $FULL_FILENAME "liveview-$FILENAME.$EXTENSION"
        exit 0
fi
