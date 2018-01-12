#!/bin/bash
source /home/pi/allsky/config.sh

echo "Posting Next Twilight Time"
today=`date +%Y-%m-%d`
time="$(sunwait list set civil 60.7N 135.02W)"
timeNoZone=${time:0:5}
echo {\"sunset\": \"$today"T"$timeNoZone":00.000-0800"\"} > data.json
echo "Uploading data.json"
lftp "$PROTOCOL"://"$USER":"$PASSWORD"@"$HOST":"$IMGDIR" -e "set net:max-retries 1; set net:timeout 20; put data.json; bye"
