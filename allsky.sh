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

ARGUMENTS="$ARGUMENTS -daytime $DAYTIME"

echo $ARGUMENTS;

# When a new image is captured, we launch saveImage.sh
#ls $FULL_FILENAME | entr scripts/saveImage.sh & \
# Uncomment the following line if you get a segmentation fault during timelapse on a Pi3
#cpulimit -e avconv -l 50 & \
./capture $ARGUMENTS
