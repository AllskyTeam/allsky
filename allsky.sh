#!/bin/bash
source config.sh

echo "Starting allsky camera..."
cd /home/pi/allsky

# Building the arguments to pass to the capture binary
ARGUMENTS=""
KEYS=( $(jq -r 'keys[]' $CAMERA_SETTINGS) )
for KEY in ${KEYS[@]}
do
	ARGUMENTS="$ARGUMENTS -$KEY `jq -r '.'$KEY $CAMERA_SETTINGS` "
done

# When a new image is captured, we launch saveImage.sh
# cpulimit prevents the Pi from crashing during the timelapse creation
ls $FULL_FILENAME | entr ./saveImage.sh $FILENAME $UPLOAD & \
cpulimit -e avconv -l 50 & \
./capture $ARGUMENTS
