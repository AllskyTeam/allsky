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

./capture $ARGUMENTS
