#!/bin/bash

# This script uploads various information relative to the camera setup to the allsky map.
# https://www.thomasjacquin.com/allsky-map/
# Information is gathered automatically from the settings file

# Disabling shellcheck to force CI to compile - May need to find a better way to deal with this
# shellcheck disable=SC1090
source "/home/pi/allsky/config/config.sh"

LOCATION=$(jq -r '.location' "$CAMERA_SETTINGS")
OWNER=$(jq -r '.owner' "$CAMERA_SETTINGS")
LATITUDE=$(jq -r '.latitude' "$CAMERA_SETTINGS")
LONGITUDE=$(jq -r '.longitude' "$CAMERA_SETTINGS")
WEBSITE_URL=$(jq -r '.websiteurl' "$CAMERA_SETTINGS")
IMAGE_URL=$(jq -r '.imageurl' "$CAMERA_SETTINGS")
CAMERA=$(jq -r '.camera' "$CAMERA_SETTINGS")
LENS=$(jq -r '.lens' "$CAMERA_SETTINGS")
COMPUTER=$(jq -r '.computer' "$CAMERA_SETTINGS")
MAC_ADDRESS="$(sudo cat /sys/class/net/"$(ip route show default | awk '/default/ {print $5}')"/address)"

generate_post_data()
{
  cat <<EOF
{
  "location": "$LOCATION",
  "owner": "$OWNER",
  "latitude": "$LATITUDE",
  "longitude": "$LONGITUDE",
  "website_url": "$WEBSITE_URL",
  "image_url": "$IMAGE_URL",
  "camera": "$CAMERA",
  "lens": "$LENS",
  "computer": "$COMPUTER",
  "mac_address": "$MAC_ADDRESS"
}
EOF
}

# Extract last character of mac address and find its parity
digit="${MAC_ADDRESS: -1}"
decimal=$(( 16#$digit ))
parity="$(( decimal % 2 ))"

# Only upload every other day to save on server bandwidth
if  (( $(date +%d) % 2 == parity ))
then
   echo "Week day matches Mac Address ending - upload"
   curl -i \
   -H "Accept: application/json" \
   -H "Content-Type:application/json" \
   --data "$(generate_post_data)" "https://www.thomasjacquin.com/allsky-map/postToMap.php"
else
   echo "Week day doesn't match Mac Address ending - don't upload"
fi
