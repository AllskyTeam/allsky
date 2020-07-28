#!/bin/bash
SCRIPT_DIR=$(dirname $(realpath $BASH_ARGV0))
ALLSKY_DIR=$(dirname $SCRIPT_DIR)
source ${ALLSKY_DIR}/config.sh
source ${ALLSKY_DIR}/scripts/filename.sh
cd ${ALLSKY_DIR}/scripts


# TODO Needs fixing when civil twilight happens after midnight
# TODO get this from settings.json...
latitude=60.7N
longitude=135.02W
timezone=-0700
streamDaytime=false

if [[ $DAYTIME == "1" ]] ; then
	streamDaytime=true;
fi

echo "Posting Next Twilight Time"
today=`date +%Y-%m-%d`
time="$(sunwait list set civil $latitude $longitude)"
timeNoZone=${time:0:5}
echo { > data.json
echo \"sunset\": \"$today"T"$timeNoZone":00.000$timezone"\", >> data.json
echo \"streamDaytime\": \"$streamDaytime\" >> data.json
echo } >> data.json
echo "Uploading data.json"
lftp "$PROTOCOL"://"$USER":"$PASSWORD"@"$HOST":"$IMGDIR" -e "set net:max-retries 1; set net:timeout 20; put data.json; bye"
