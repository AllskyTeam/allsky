#!/bin/bash

echo "Starting allsky camera..."
cd /home/pi/allsky

# Set upload to false if you don't want to upload the latest image to your website
UPLOAD=false

# Set -help to 1 for full list of arguments
# Set -nodisplay to 1 on Raspbian Lite and other OS without Desktop environments

CAMERA_CONFIG='/var/www/html/camera.conf'

ARGUMENTS=""
FILENAME=""
while IFS='' read -r line || [[ -n "$line" ]]; do
    KEY=${line%=*}
    VALUE=${line#*=}
    VALUE=$VALUE | sed -e 's/^ "//' -e 's/"$//'
    file="filename"
    if [[ $KEY == *"$file"* ]]; then
        FILENAME=$VALUE
    fi

    ARGUMENTS="$ARGUMENTS -$KEY $VALUE "
done < "$CAMERA_CONFIG"

echo "./capture $ARGUMENTS"

ls "$FILENAME" | entr ./saveImage.sh $FILENAME $UPLOAD & \
cpulimit -e avconv -l 50 & \
./capture $ARGUMENTS
