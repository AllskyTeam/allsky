#!/bin/bash

# We get the filename from settings.json
FULL_FILENAME=$(jq -r '.filename' "$CAMERA_SETTINGS")
EXTENSION="${FULL_FILENAME##*.}"
FILENAME="${FULL_FILENAME%.*}"

