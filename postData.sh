#!/bin/bash
echo "Posting Next Twilight Time"
today=`date +%Y-%m-%d`
time="$(sunwait list set civil 60.7N 135.02W)"
timeNoZone=${time:0:5}
echo {\"sunset\": \"$today"T"$timeNoZone":00.000-0800"\"} > data.json
echo "Uploading data.json"
lftp sftp://username:password@server:/location_of_allsky_directory -e "put data.json; bye"
