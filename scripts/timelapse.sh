#!/bin/bash
source /home/pi/allsky/config.sh
source /home/pi/allsky/scripts/filename.sh

cd /home/pi/allsky/

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

if [ $# -lt 1 ]
  then
    echo -en "${RED}You need to pass a day argument\n"
        echo -en "    ex: timelapse.sh 20180119${NC}\n"
        exit 3
fi

# find images, rename images sequentially and start avconv to build mp4; upload mp4 and move directory
ls -rt -I "keogram*" -I "*.mp4" images/$1 |
gawk 'BEGIN{ a=1 }{ printf "mv -v ./images/'$1'/%s images/'$1'/%04d.'$EXTENSION'\n", $0, a++ }' |
bash
avconv -y -f image2 -r 25 -i images/$1/%04d.$EXTENSION -vcodec libx264 -b:v 2000k -pix_fmt yuv420p images/$1/allsky-$1.mp4

if [ "$UPLOAD_VIDEO" = true ] ; then
	lftp "$PROTOCOL"://"$USER":"$PASSWORD"@"$HOST":"$MP4DIR" -e "set net:max-retries 1; put images/$1/allsky-$1.mp4; bye"
fi

echo -en "* ${GREEN}Timelapse was created${NC}\n"
