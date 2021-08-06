#!/bin/bash
source $ALLSKY_HOME/config.sh
source $ALLSKY_HOME/scripts/filename.sh
source $ALLSKY_HOME/scripts/ftp-settings.sh

cd  $ALLSKY_HOME/scripts

ME="$(basename "$BASH_ARGV0")"	# Include script name in output so it's easier to find in the log file

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

if [ $# -lt 1 ]
  then
    echo -en "${ME}: ${RED}You need to pass a day argument\n"
        echo -en "    ex: $ME 20180119${NC}\n"
        exit 3
fi

DIR="$ALLSKY_HOME/images/$1"

# Upload keogram
echo -e "${ME}: Uploading Keogram\n"
KEOGRAM="$DIR/keogram/keogram-$1.$EXTENSION"
if [[ $PROTOCOL == "S3" ]] ; then
        $AWS_CLI_DIR/aws s3 cp "$KEOGRAM" "s3://$S3_BUCKET$KEOGRAM_DIR" --acl $S3_ACL &
elif [[ $PROTOCOL == "local" ]] ; then
	cp "$KEOGRAM" "$KEOGRAM_DIR" &
else
        lftp "$PROTOCOL://$USER:$PASSWORD@$HOST:$KEOGRAM_DIR" -e "set net:max-retries 1; put "$KEOGRAM"; bye" &
fi
echo -e "\n"

# Upload Startrails
echo -e "${ME}: Uploading Startrails\n"
STARTRAILS="$DIR/startrails/startrails-$1.$EXTENSION"
if [[ $PROTOCOL == "S3" ]] ; then
        $AWS_CLI_DIR/aws s3 cp "$STARTRAILS" "s3://$S3_BUCKET$STARTRAILS_DIR" --acl $S3_ACL &
elif [[ $PROTOCOL == "local" ]] ; then
	cp "$STARTRAILS" "$STARTRAILS_DIR" &
else
        lftp "$PROTOCOL://$USER:$PASSWORD@$HOST:$STARTRAILS_DIR" -e "set net:max-retries 1; put "$STARTRAILS"; bye" &
fi
echo -e "\n"

# Upload timelapse
echo -e "${ME}: Uploading Timelapse\n"
TIMELAPSE="$DIR/allsky-$1.mp4"
if [[ "$PROTOCOL" == "S3" ]] ; then
        $AWS_CLI_DIR/aws s3 cp "$TIMELAPSE" "s3://$S3_BUCKET$MP4DIR" --acl $S3_ACL &
elif [[ $PROTOCOL == "local" ]] ; then
	cp "$TIMELAPSE" "$MP4DIR" &
else
        lftp "$PROTOCOL://$USER:$PASSWORD@$HOST:$MP4DIR" -e "set net:max-retries 1; put "$TIMELAPSE"; bye" &
fi
echo -e "\n"
