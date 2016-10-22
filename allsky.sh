#!/bin/bash
echo "Starting allsky camera";
cd /home/pi/allsky
WIDTH=0;
HEIGHT=0;
BIN=1;
MODE=1;
GAIN=200;
EXPOSURE=5000000;
FILENAME="Ortona";
LATITUDE="60.7N";
LONGITUDE="135.05W";
WBR="53";
WBB="80";

ls "$FILENAME-full.jpg" | entr ./upload.sh "$FILENAME" & ./capture "$WIDTH" "$HEIGHT" "$BIN" "$MODE" "$GAIN" "$EXPOSURE" "$FILENAME" "$LATITUDE" "$LONGITUDE" "$WBR" "$WBB"


