#!/bin/bash
source /home/pi/allsky/config.sh
source /home/pi/allsky/scripts/filename.sh

cd /home/pi/allsky

IMAGE_TO_USE="$FULL_FILENAME"
cp $IMAGE_TO_USE "liveview-$FILENAME.$EXTENSION"

# If upload is true, create a smaller version of the image and upload it
if [ "$UPLOAD_IMG" = true ] ; then
	echo -e "Resizing"
	echo -e "Resizing $FULL_FILENAME \n" >> log.txt

	# Create a thumbnail for live view
	# Here's what I use with my ASI224MC
	convert "$IMAGE_TO_USE" -resize 962x720 -gravity East -chop 2x0 "$FILENAME-resize.$EXTENSION";
	# Here's what I use with my ASI185MC (larger sensor so I crop the black around the image)
	#convert "$IMAGE_TO_USE" -resize 962x720 -gravity Center -crop 680x720+40+0 +repage "$FILENAME-resize.$EXTENSION";

	echo -e "Uploading\n"
	echo -e "Uploading $FILENAME-resize.$EXTENSION \n" >> log.txt
	if [[ $PROTOCOL == "ssh" ]] ; then
		scp $FILENAME-resize.$EXTENSION $USER@$HOST:$IMGDIR/$FILENAME-resize.tmp
		ssh $USER@$HOST -C "mv $IMGDIR/$FILENAME-resize.tmp $IMGDIR/$FILENAME-resize.$EXTENSION"
	else
		lftp "$PROTOCOL"://"$USER":"$PASSWORD"@"$HOST":"$IMGDIR" -e "set net:max-retries 1; set net:timeout 20; put $FILENAME-resize.$EXTENSION; bye" &
	fi
fi
