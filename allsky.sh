#!/bin/bash
source /home/pi/allsky/config.sh
source /home/pi/allsky/scripts/filename.sh

echo "Starting allsky camera..."
cd /home/pi/allsky

# Building the arguments to pass to the capture binary
ARGUMENTS=""
KEYS=( $(jq -r 'keys[]' $CAMERA_SETTINGS) )
for KEY in ${KEYS[@]}
do
	ARGUMENTS="$ARGUMENTS -$KEY `jq -r '.'$KEY $CAMERA_SETTINGS` "
done
echo "$ARGUMENTS">>log.txt

# When a new image is captured, we launch saveImage.sh
ls $FULL_FILENAME | entr scripts/saveImage.sh & \
# cpulimit prevents the Pi from crashing during the timelapse creation
# Uncomment the following line if you get a segmentation fault during timelapse on a Pi3
#cpulimit -e avconv -l 50 & \
./capture $ARGUMENTS
