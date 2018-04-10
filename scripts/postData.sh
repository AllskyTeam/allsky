#!/bin/bash
source /home/pi/allsky/config.sh

latitude=60.7N
longitude=135.02W
timezone=-0700

echo "Posting Next Twilight Time"
today=`date +%Y-%m-%d`
time="$(sunwait list set civil $latitude $longitude)"
timeNoZone=${time:0:5}
echo {\"sunset\": \"$today"T"$timeNoZone":00.000$timezone"\"} > data.json
echo "Uploading data.json"
lftp "$PROTOCOL"://"$USER":"$PASSWORD"@"$HOST":"$IMGDIR" -e "set net:max-retries 1; set net:timeout 20; put data.json; bye"
