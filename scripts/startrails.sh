#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

if [ $# -lt 4 ]
  then
    echo -en "${RED}You need to pass 4 arguments: source directory, file extension, brightness treshold, output file  ${NC}\n"
	echo -en "    ex: startrails.sh ../images/20180208/ jpg 0.07 startrails.jpg\n"
	echo -en "    brightness ranges from 0 (black) to 1 (white)\n"
	echo -en "    A moonless sky is around 0.05 while full moon can be as high as 0.4\n"
	exit 3
fi

SRC_DIR=${1%/}
EXT=$2
TRESHOLD=$3
OUTPUT_FILE=$4

cd $SRC_DIR

cat /dev/null > startrails-log.csv

cp $(ls -t *.$EXT | tail -1) $OUTPUT_FILE
convert $OUTPUT_FILE -threshold 100% -alpha off $OUTPUT_FILE

pictures_count=`find $SRC_DIR -type f -name "*.$EXT" | wc -l`
echo -en "* Creating Startrails from $pictures_count pictures\n"

for f in `ls *.$EXT`
do
  BRIGHTNESS=$(identify -format "%[fx:mean]" $f)
  echo -en "* $f Brightness: $BRIGHTNESS \e[0K\r"
  echo "$f, $BRIGHTNESS" >> startrails-log.csv
  var=$(awk 'BEGIN{ print "'$BRIGHTNESS'"<"'$TRESHOLD'" }')
  if [ "$var" -eq 1 ] ; then
        convert $OUTPUT_FILE $f -gravity center -compose lighten -composite -format $EXT $OUTPUT_FILE
  fi
done
echo -en "\n${GREEN}$OUTPUT_FILE has been generated successfully ${NC}\n"

