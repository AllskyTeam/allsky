#!/bin/bash
source $ALLSKY_HOME/config.sh
source $ALLSKY_HOME/scripts/ftp-settings.sh

# TODO Needs fixing when civil twilight happens after midnight
cd $ALLSKY_HOME/scripts
ME="$(basename "$BASH_ARGV0")"	# Include script name in output so it's easier to find in the log file

latitude=$(jq -r '.latitude' "$CAMERA_SETTINGS")
longitude=$(jq -r '.longitude' "$CAMERA_SETTINGS")
timezone=-0700
streamDaytime=false

if [[ $DAYTIME == "1" ]] ; then
	streamDaytime=true;
fi

#echo "$ME: Posting Next Twilight Time"
today=`date +%Y-%m-%d`
time="$(sunwait list set civil $latitude $longitude)"
timeNoZone=${time:0:5}
echo { > data.json
echo \"sunset\": \"$today"T"$timeNoZone":00.000$timezone"\", >> data.json
echo \"streamDaytime\": \"$streamDaytime\" >> data.json
echo } >> data.json
echo "$ME: Uploading data.json"
if [[ $PROTOCOL == "S3" ]] ; then
        $AWS_CLI_DIR/aws s3 cp data.json s3://$S3_BUCKET$IMGDIR --acl $S3_ACL &
elif [[ $PROTOCOL == "local" ]] ; then
	cp data.json $IMGDIR &
else
        lftp "$PROTOCOL://$USER:$PASSWORD@$HOST:$IMGDIR" -e "set net:max-retries 1; set net:timeout 20; put data.json; bye" &
fi
