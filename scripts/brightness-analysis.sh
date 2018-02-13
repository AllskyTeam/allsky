#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

if [ $# -lt 3 ]
  then
    echo -en "${RED}You need to pass 3 arguments: source directory, image extension, increment  ${NC}\n"
	echo -en "    ex: startrails-analysis.sh ../images/20180208/ jpg 50\n"
	echo -en "    Increment is the amount of images to skip during analysis.\n"
	echo -en "    0 (slowest analysis) will calculate the brightness of each images\n"
	exit 3
fi

SRC_DIR=${1%/}
EXT=$2
INCREMENT=$3

cd $SRC_DIR

cat /dev/null > brightness-analysis-log.csv

pictures_count=`find $SRC_DIR -type f -name "*.$EXT" | wc -l`
echo -en "* Analysing overall brightness from $pictures_count pictures\n"

n=0
for f in `ls *.$EXT`
do
	if [ $((n%$INCREMENT)) -eq 0 ]; then
  		BRIGHTNESS=$(identify -format "%[fx:mean]" $f)
		echo -en "* $f Brightness: $BRIGHTNESS\e[0K\r"
  		echo "$f, $BRIGHTNESS" >> brightness-analysis-log.csv
	fi
	n=$n+1
done
echo -en "\n${GREEN}The analysis has been written to brightness-analysis-log.csv ${NC}\n"
