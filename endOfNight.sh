#!/bin/bash
source /home/pi/allsky/config.sh

# Posting next twilight time to let server know when to resume liveview
#./postData.sh
echo -e "\n"

# We get the timelapse setting from settings.json
TIMELAPSE=$(jq -r '.timelapse' "$CAMERA_SETTINGS")

# If timelapse is true
if [[ $TIMELAPSE == "1" ]]; then
	echo -e "Generating Timelapse\n"
	./timelapse.sh
fi
