#!/bin/bash

# This script uploads various information relative to the camera setup to the allsky map.
# https://www.thomasjacquin.com/allsky-map/
# Information is gathered automatically from the settings file

source "${ALLSKY_CONFIG}/config.sh"

LOCATION="Whitehorse YT"
OWNER="Thomas Jacquin"
LATITUDE=$(jq -r '.latitude' "$CAMERA_SETTINGS")
LONGITUDE=$(jq -r '.longitude' "$CAMERA_SETTINGS")
WEBSITE_URL="http://www.thomasjacquin.com/allsky"
IMAGE_URL="http://www.thomasjacquin.com/allsky/image.jpg"
CAMERA="ASI 224MC"
LENS="Areconnt 1.55"
COMPUTER="Raspberry Pi 3"
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
