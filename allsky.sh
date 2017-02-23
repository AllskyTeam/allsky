#!/bin/bash

echo "Starting allsky camera..."
cd /home/pi/allsky

FILENAME="gibbons.jpg"

# Set upload to false if you don't want to upload the latest image to your website
UPLOAD=true

# Set -help to 1 for full list of arguments
# Set -nodisplay to 1 on Raspbian Lite and other OS without Desktop environments

ls "$FILENAME" | entr ./saveImage.sh "$FILENAME" "$UPLOAD" & \
./capture \
  -gain 	200 \
  -exposure 	5000000 \
  -filename 	"$FILENAME" \
  -latitude 	"60.7N" \
  -longitude 	"135.05W" \
  -wbr	 	53 \
  -wbb	 	80 \
  -textx	20 \
  -fontcolor	255 255 255 \
  -time 	1 \
  -help 	0 \
  -nodisplay 	0 \
  -timelapse 	1 
