#!/bin/bash

echo "Starting allsky camera...";
cd /home/pi/allsky

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
# Just look at the available parameters in the terminal window.