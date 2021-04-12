#!/bin/bash
source $ALLSKY_HOME/config.sh
source $ALLSKY_HOME/scripts/ftp-settings.sh

# TODO Needs fixing when civil twilight happens after midnight
cd $ALLSKY_HOME/scripts

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
if [[ $PROTOCOL == "S3" ]] ; then
        $AWS_CLI_DIR/aws s3 cp data.json s3://$S3_BUCKET$IMGDIR --acl $S3_ACL &
elif [[ $PROTOCOL == "local" ]] ; then
	cp data.json $IMGDIR &
else
        lftp "$PROTOCOL"://"$USER":"$PASSWORD"@"$HOST":"$IMGDIR" -e "set net:max-retries 1; set net:timeout 20; put data.json; bye" &
fi
