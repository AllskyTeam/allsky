#!/bin/bash

echo "Starting allsky camera..."
cd /home/pi/allsky

FILENAME="gibbons.jpg"
UPLOAD=true

# Set -help to 1 for full list of arguments

ls "$FILENAME" | entr ./saveImage.sh "$FILENAME" "$UPLOAD" & \
./capture \
  -gain 	200 \
  -exposure 	5000000 \
  -filename 	"$FILENAME" \
  -latitude 	"60.7N" \
  -longitude 	"135.05E" \
  -wbr	 	53 \
  -wbb	 	80 \
  -textx	20 \
  -fontcolor	255 255 255 \
  -time 	1 \
  -help 	0 \
  -nodisplay 	1 \
  -timelapse 	1 
