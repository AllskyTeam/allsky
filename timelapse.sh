#!/bin/bash

# Camera configuration file location
CAMERA_CONFIG='/var/www/html/camera.conf'

FILENAME=""
while IFS='' read -r line || [[ -n "$line" ]]; do
    KEY=${line%=*}
    VALUE=${line#*=}
    VALUE=$VALUE | sed -e 's/^ "//' -e 's/"$//'
    file="filename"
    if [[ $KEY == *"$file"* ]]; then
        FILENAME=$VALUE
	EXTENSION="${FILENAME##*.}"
    fi
done < "$CAMERA_CONFIG"

ls -rt images/current | # find images
gawk 'BEGIN{ a=1 }{ printf "mv -v ./images/current/%s images/current/%04d.'$EXTENSION'\n", $0, a++ }' | # build mv command
bash 
avconv -y -f image2 -r 25 -i images/current/%04d.$EXTENSION -vcodec libx264 -b:v 2000k images/current/allsky-`date -d "yesterday 13:00" '+%Y%m%d'`.mp4 && \
#lftp sftp://user:password@host:/path/to/website/ -e "put images/current/allsky-`date -d "yesterday 13:00" '+%Y%m%d'`.mp4; bye" && \
mv ./images/current images/`date -d "yesterday 13:00" '+%Y%m%d'`

