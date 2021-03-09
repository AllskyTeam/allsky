#!/bin/bash
source $ALLSKY_HOME/config.sh
source $ALLSKY_HOME/scripts/filename.sh
source $ALLSKY_HOME/scripts/ftp-settings.sh

cd  $ALLSKY_HOME/scripts

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

if [ $# -lt 1 ]
  then
    echo -en "${RED}You need to pass a day argument\n"
        echo -en "    ex: uploadForDay.sh 20180119${NC}\n"
        exit 3
fi

# Upload keogram
echo -e "Uploading Keogram\n"
KEOGRAM="$ALLSKY_HOME/images/$1/keogram/keogram-$1.$EXTENSION"
if [[ $PROTOCOL == "S3" ]] ; then
        $AWS_CLI_DIR/aws s3 cp $KEOGRAM s3://$S3_BUCKET$KEOGRAM_DIR --acl $S3_ACL &
else
        lftp "$PROTOCOL"://"$USER":"$PASSWORD"@"$HOST":"$KEOGRAM_DIR" -e "set net:max-retries 1; put $KEOGRAM; bye" -u "$USER","$PASSWORD" &
fi
echo -e "\n"

# Upload Startrails
echo -e "Uploading Startrails\n"
STARTRAILS="$ALLSKY_HOME/images/$1/startrails/startrails-$1.$EXTENSION"
if [[ $PROTOCOL == "S3" ]] ; then
        $AWS_CLI_DIR/aws s3 cp $STARTRAILS s3://$S3_BUCKET$STARTRAILS_DIR --acl $S3_ACL &
else
        lftp "$PROTOCOL"://"$USER":"$PASSWORD"@"$HOST":"$STARTRAILS_DIR" -e "set net:max-retries 1; put $STARTRAILS; bye" &
fi
echo -e "\n"

# Upload timelapse
echo -e "Uploading Timelapse\n"
TIMELAPSE="$ALLSKY_HOME/images/$1/allsky-$1.mp4"
if [[ "$PROTOCOL" == "S3" ]] ; then
        $AWS_CLI_DIR/aws s3 cp $TIMELAPSE s3://$S3_BUCKET$MP4DIR --acl $S3_ACL &
else
        lftp "$PROTOCOL"://"$USER":"$PASSWORD"@"$HOST":"$MP4DIR" -e "set net:max-retries 1; put $TIMELAPSE; bye" &
fi
echo -e "\n"