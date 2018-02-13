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

# Generate timelapse from collected images
if [[ $KEOGRAM == "true" ]]; then
        echo -e "Generating Keogram\n"
        ./keogram.sh /home/pi/allsky/images/$LAST_NIGHT/ $EXTENSION /home/pi/allsky/images/$LAST_NIGHT/keogram-$LAST_NIGHT.jpg
        echo -e "\n"
fi

# Generate startrails from collected images. Treshold set to 0.1 to avoid stacking over-exposed images
if [[ $STARTRAILS == "true" ]]; then
        echo -e "Generating Startrails\n"
        ./startrails.sh /home/pi/allsky/images/$LAST_NIGHT/ $EXTENSION 0.1 /home/pi/allsky/images/$LAST_NIGHT/startrails-$LAST_NIGHT.jpg
        echo -e "\n"
fi

# Generate timelapse from collected images
if [[ $TIMELAPSE == "true" ]]; then
	echo -e "Generating Timelapse\n"
	./timelapse.sh $LAST_NIGHT
	echo -e "\n"
fi
