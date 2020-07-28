#!/bin/bash
source ${HOME}/allsky/config.sh
source ${HOME}/allsky/scripts/filename.sh

cd  ${HOME}/allsky/scripts

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

if [ $# -lt 1 ]
  then
    echo -en "${RED}You need to pass a day argument\n"
        echo -en "    ex: generateForDay.sh 20180119${NC}\n"
        exit 3
fi

# Generate timelapse from collected images
echo -e "Generating Keogram\n"
mkdir -p ${HOME}/allsky/images/$1/keogram/
../keogram ${HOME}/allsky/images/$1/ $EXTENSION ${HOME}/allsky/images/$1/keogram/keogram-$1.jpg
echo -e "\n"

# Generate startrails from collected images. Treshold set to 0.1 by default in config.sh to avoid stacking over-exposed images
echo -e "Generating Startrails\n"
mkdir -p ${HOME}/allsky/images/$1/startrails/
../startrails ${HOME}/allsky/images/$1/ $EXTENSION $BRIGHTNESS_THRESHOLD ${HOME}/allsky/images/$1/startrails/startrails-$1.jpg
echo -e "\n"

# Generate timelapse from collected images
echo -e "Generating Timelapse\n"
./timelapse.sh $1
echo -e "\n"
