#!/bin/bash

echo "Starting allsky camera..."
cd /home/pi/allsky

# Set upload to false if you don't want to upload the latest image to your website
UPLOAD=false
CAMERA_SETTINGS='settings.json'
ARGUMENTS=""

KEYS=( $(jq -r 'keys[]' $CAMERA_SETTINGS) )
for KEY in ${KEYS[@]}
do
	ARGUMENTS="$ARGUMENTS -$KEY `jq -r '.'$KEY $CAMERA_SETTINGS` "
done

echo "./capture $ARGUMENTS"

ls $FILENAME | entr ./saveImage.sh $FILENAME $UPLOAD & \
cpulimit -e avconv -l 50 & \
./capture $ARGUMENTS
