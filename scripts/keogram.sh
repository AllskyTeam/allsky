#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

if [ $# -lt 3 ]
  then
    echo -en "${RED}You need to pass 3 arguments: source directory, image extension, output file\n"
	echo -en "    ex: keogram.sh ../images/current/ jpg keogram.jpg\n"
	echo -en "    ex: keogram.sh . png /home/pi/allsky/keogram.jpg ${NC}\n"
	exit 3
fi

keogram_input=${1%/}
extension=$2
keogram_output=$3
rm -f $keogram_output

pictures_count=`find $keogram_input -type f -name "*.$extension" | wc -l`

echo -en "* Creating Keogram from $pictures_count pictures\n"
cd $keogram_input
mkdir -p columns
for f in *.$extension
	do echo -en "* Current Image $f \e[0K\r"; convert $f -gravity Center -crop 1x976+0+0 columns/$f
done
echo -en "\n* Stitching columns into a Keogram\n"
convert -colorspace RGB columns/*.$extension +append -colorspace RGB $keogram_output
rm -rf columns
echo -en "* ${GREEN}$keogram_output was created${NC}\n"
