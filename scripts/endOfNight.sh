#!/bin/bash
source /home/pi/allsky/config.sh
source /home/pi/allsky/scripts/filename.sh

cd  /home/pi/allsky/scripts
LAST_NIGHT=$(date -d '12 hours ago' +'%Y%m%d')

# Post end of night data. This includes next twilight time
if [[ $POST_END_OF_NIGHT_DATA == "true" ]]; then
        echo -e "Posting next twilight time to let server know when to resume liveview\n"
        ./postData.sh
	echo -e "\n"
fi

# Generate keogram from collected images
if [[ $KEOGRAM == "true" ]]; then
        echo -e "Generating Keogram\n"
	mkdir -p /home/pi/allsky/images/$LAST_NIGHT/keogram/
        ../keogram /home/pi/allsky/images/$LAST_NIGHT/ $EXTENSION /home/pi/allsky/images/$LAST_NIGHT/keogram/keogram-$LAST_NIGHT.jpg
	if [[ $UPLOAD_KEOGRAM == "true" ]] ; then
		OUTPUT="/home/pi/allsky/images/$LAST_NIGHT/keogram/keogram-$LAST_NIGHT.jpg"
                lftp "$PROTOCOL"://"$USER":"$PASSWORD"@"$HOST":"$KEOGRAM_DIR" \
                        -e "set net:max-retries 1; put $OUTPUT; bye"
	fi
        echo -e "\n"
fi

# Generate startrails from collected images. Treshold set to 0.1 by default in config.sh to avoid stacking over-exposed images
if [[ $STARTRAILS == "true" ]]; then
        echo -e "Generating Startrails\n"
	mkdir -p /home/pi/allsky/images/$LAST_NIGHT/startrails/
        ../startrails /home/pi/allsky/images/$LAST_NIGHT/ $EXTENSION $BRIGHTNESS_THRESHOLD /home/pi/allsky/images/$LAST_NIGHT/startrails/startrails-$LAST_NIGHT.jpg
	if [[ $UPLOAD_STARTRAILS == "true" ]] ; then
		OUTPUT="/home/pi/allsky/images/$LAST_NIGHT/startrails/startrails-$LAST_NIGHT.jpg"
                lftp "$PROTOCOL"://"$USER":"$PASSWORD"@"$HOST":"$STARTRAILS_DIR" \
			-e "set net:max-retries 1; put $OUTPUT; bye"
        fi

        echo -e "\n"
fi

# Generate timelapse from collected images
if [[ $TIMELAPSE == "true" ]]; then
	echo -e "Generating Timelapse\n"
	./timelapse.sh $LAST_NIGHT
	echo -e "\n"
fi

# Automatically delete old images and videos
if [[ $AUTO_DELETE == "true" ]]; then
	del=$(date --date="$NIGHTS_TO_KEEP days ago" +%Y%m%d)
	for i in `find /home/pi/allsky/images/ -type d -name "2*"`; do
	  (($del > $(basename $i))) && rm -rf $i
	done
fi
