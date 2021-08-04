#!/bin/bash
# This script allows users to manually generate keograms,startrails, and timelapses,
# outside of the ones generated automatically.

source $ALLSKY_HOME/config.sh
source $ALLSKY_HOME/scripts/filename.sh

cd  $ALLSKY_HOME/scripts

ME="$(basename "$BASH_ARGV0")"	# Include script name in output so it's easier to find in the log file

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

if [ $# -lt 1 ]
  then
    echo -en "${ME}: ${RED}You need to pass a day argument\n"
        echo -en "    ex: ${ME} 20180119${NC}\n"
        exit 3
fi

DATE=$1
DIR="$ALLSKY_HOME/images/$DATE"

# Generate timelapse from collected images
echo -e "${ME}: Generating Keogram\n"
mkdir -p ${DIR}/keogram/
../keogram ${DIR}/ $EXTENSION ${DIR}/keogram/keogram-$DATE.jpg
echo -e "\n"

# Generate startrails from collected images. Treshold set to 0.1 by default in config.sh to avoid stacking over-exposed images
echo -e "${ME}: Generating Startrails\n"
mkdir -p ${DIR}/startrails
../startrails ${DIR}/ $EXTENSION $BRIGHTNESS_THRESHOLD ${DIR}/startrails/startrails-$DATE.jpg
echo -e "\n"

# Generate timelapse from collected images
echo -e "${ME}: Generating Timelapse\n"
./timelapse.sh $DATE
echo -e "\n"
