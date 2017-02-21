#!/bin/bash

# If your images end in .png, please change the script to %04d.png everywhere

ls -rt current | # find images
gawk 'BEGIN{ a=1 }{ printf "mv -v ./current/%s current/%04d.jpg\n", $0, a++ }' | # build mv command
bash && \
avconv -y -f image2 -r 25 -i current/%04d.jpg -vcodec libx264 -b:v 2000k current/allsky-`date -d "yesterday 13:00" '+%Y%m%d'`.mp4 && \
lftp sftp://user:password@host:/path/to/website/ -e "put current/allsky-`date -d "yesterday 13:00" '+%Y%m%d'`.mp4; bye" && \
mv ./current `date -d "yesterday 13:00" '+%Y%m%d'`

