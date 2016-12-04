#!/bin/bash
echo "Starting allsky camera";
cd /home/pi/allsky
WIDTH=0;
HEIGHT=0;
BIN=1;
MODE=1;
GAIN=50;
EXPOSURE=3000000;
FILENAME="Ortona.PNG";
LATITUDE="60.7N";
LONGITUDE="135.05W";
WBR="53";
WBB="80";
DISPLAY=1;

ls "$FILENAME" | entr ./upload.sh "$FILENAME" & ./capture -width "$WIDTH" -height "$HEIGHT" -binning "$BIN" -imagetype "$MODE" -gain "$GAIN" -exposure "$EXPOSURE" -filename "$FILENAME" -latitude "$LATITUDE" -longitude "$LONGITUDE" -wbred "$WBR" -wbblue "$WBB" -display "$DISPLAY"


