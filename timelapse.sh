#!/bin/bash
source /home/thomas/dev/allsky/config.sh

if [ "$UPLOAD_VIDEO" = true ] ; then
	# find images, rename images sequentially and start avconv to build mp4; upload mp4 and move current dir
	ls -rt images/current |
	gawk 'BEGIN{ a=1 }{ printf "mv -v ./images/current/%s images/current/%04d.'$EXTENSION'\n", $0, a++ }' |
	bash
	avconv -y -f image2 -r 25 -i images/current/%04d.$EXTENSION -vcodec libx264 -b:v 2000k images/current/allsky-$(date -d "yesterday 13:00" '+%Y%m%d').mp4 && \
	lftp sftp://"$USER":"$PASSWORD"@"$HOST":"$MP4DIR" -e "set net:max-retries 1; put images/current/allsky-`date -d "yesterday 13:00" '+%Y%m%d'`.mp4; bye" && \
	mv ./images/current images/$(date -d "yesterday 13:00" '+%Y%m%d')
else
	# find images, rename images sequentially and start avconv to build mp4; move current dir
	ls -rt images/current |
	gawk 'BEGIN{ a=1 }{ printf "mv -v ./images/current/%s images/current/%04d.'$EXTENSION'\n", $0, a++ }' |
	bash &
	avconv -y -f image2 -r 25 -i images/current/%04d.$EXTENSION -vcodec libx264 -b:v 2000k images/current/allsky-$(date -d "yesterday 13:00" '+%Y%m%d').mp4 && \
	mv ./images/current images/$(date -d "yesterday 13:00" '+%Y%m%d')
fi
