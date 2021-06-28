#!/bin/bash
source $ALLSKY_HOME/config.sh
source $ALLSKY_HOME/scripts/filename.sh
source $ALLSKY_HOME/scripts/ftp-settings.sh

cd $ALLSKY_HOME/

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

if [ $# -lt 1 ]
  then
    echo -en "${RED}You need to pass a day argument\n"
        echo -en "    ex: timelapse.sh 20180119${NC}\n"
        exit 3
fi

echo -en "* ${GREEN}Creating symlinks to generate timelapse${NC}\n"
mkdir $ALLSKY_HOME/images/$1/sequence/

# find images, make symlinks sequentially and start avconv to build mp4; upload mp4 and move directory
find "$ALLSKY_HOME/images/$1" -name "*.$EXTENSION" -size 0 -delete
ls -rt $ALLSKY_HOME/images/$1/*.$EXTENSION |
gawk 'BEGIN{ a=1 }{ printf "ln -sv %s $ALLSKY_HOME/images/'$1'/sequence/%04d.'$EXTENSION'\n", $0, a++ }' |
bash

SCALE=""
TIMELAPSEWIDTH=${TIMELAPSEWIDTH:-0}

if [ "${TIMELAPSEWIDTH}" != 0 ]
  then
    SCALE="-filter:v scale=${TIMELAPSEWIDTH:0}:${TIMELAPSEHEIGHT:0}"
    echo "Using video scale ${TIMELAPSEWIDTH} * ${TIMELAPSEHEIGHT}"
fi

ffmpeg -y -f image2 \
	-r $FPS \
	-i images/$1/sequence/%04d.$EXTENSION \
	-vcodec libx264 \
	-b:v 15000k \
	-pix_fmt yuv420p \
	-movflags +faststart \
	$SCALE \
	images/$1/allsky-$1.mp4

if [ "$UPLOAD_VIDEO" = true ] ; then
        if [[ "$PROTOCOL" == "S3" ]] ; then
                $AWS_CLI_DIR/aws s3 cp images/$1/allsky-$1.mp4 s3://$S3_BUCKET$MP4DIR --acl $S3_ACL &
	elif [[ $PROTOCOL == "local" ]] ; then
                cp $FILENAME-resize.$EXTENSION /var/www/html/$MP4DIR &
        else
                lftp "$PROTOCOL"://"$USER":"$PASSWORD"@"$HOST":"$MP4DIR" -e "set net:max-retries 1; put images/$1/allsky-$1.mp4; bye" &
        fi
fi

echo -en "* ${GREEN}Deleting sequence${NC}\n"
rm -rf $ALLSKY_HOME/images/$1/sequence

echo -en "* ${GREEN}Timelapse was created${NC}\n"
