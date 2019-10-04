#!/bin/bash
source ${HOME}/allsky/config.sh
source ${HOME}/allsky/scripts/filename.sh

cd ${HOME}/allsky/

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
mkdir ${HOME}/allsky/images/$1/sequence/
# find images, make symlinks sequentially and start avconv to build mp4; upload mp4 and move directory
find "${HOME}/allsky/images/$1" -name "*.$EXTENSION" -size 0 -delete
ls -rt ${HOME}/allsky/images/$1/*.$EXTENSION |
gawk 'BEGIN{ a=1 }{ printf "ln -sv %s ${HOME}/allsky/images/'$1'/sequence/%04d.'$EXTENSION'\n", $0, a++ }' |
bash
ffmpeg -y -f image2 -r $FPS -i images/$1/sequence/%04d.$EXTENSION -vcodec libx264 -b:v 2000k -pix_fmt yuv420p images/$1/allsky-$1.mp4

if [ "$UPLOAD_VIDEO" = true ] ; then
	lftp "$PROTOCOL"://"$USER":"$PASSWORD"@"$HOST":"$MP4DIR" -e "set net:max-retries 1; put images/$1/allsky-$1.mp4; bye"
fi

echo -en "* ${GREEN}Deleting sequence${NC}\n"
rm -rf ${HOME}/allsky/images/$1/sequence

echo -en "* ${GREEN}Timelapse was created${NC}\n"
