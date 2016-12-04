#!/bin/bash

echo "Starting allsky camera..."
cd /home/pi/allsky


$FILENAME="image.jpg"

ls "$FILENAME" | entr ./upload.sh "$FILENAME" & ./capture \
  -txt 		"Thomas" \
  -gain 	50 \
  -exposure 	3000000 \
  -filename 	"Ortona.PNG" \
  -latitude 	"60.7N" \
  -longitude 	"135.05W" \
  -wbred 	"53" \
  -wbblue 	"80"

# These values override the default values of the program.
# You can add more overrides here. 
# Full list of available parameters shows up in the terminal window when the program starts.