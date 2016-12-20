#!/bin/bash

echo "Starting allsky camera..."
cd /home/pi/allsky

FILENAME="image.PNG"

# Run with -help or -h for full list of arguments

Uncomment the following line to allow upload of your image for live view
#ls "$FILENAME" | entr ./upload.sh "$FILENAME" & \
./capture \
  -gain 	50 \
  -exposure 	3000000 \
  -filename 	"$FILENAME" \
  -latitude 	"60.7N" \
  -longitude 	"135.05W" \
  -wbred 	53 \
  -wbblue 	80 \
  -textx	200 \
  -time 	1\
  -help 	0\
  -nodisplay 	1 \
  -timelapse 	1