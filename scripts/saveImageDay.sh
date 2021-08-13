#!/bin/bash

if [ $# -eq 1 ] ; then
	if [ "x$1" = "x-h" ] ; then
		echo "Usage: $BASH_ARGV0 [YYYYmmdd]"
		exit
	else
		LAST_NIGHT=$1
	fi
else
	LAST_NIGHT=$(date -d '12 hours ago' +'%Y%m%d')
fi

source $ALLSKY_HOME/config.sh
source $ALLSKY_HOME/scripts/filename.sh
source $ALLSKY_HOME/scripts/ftp-settings.sh

cd  $ALLSKY_HOME/scripts
ME="$(basename "$BASH_ARGV0")"	# Include script name in output so it's easier to find in the log file

# Post end of night data. This includes next twilight time
if [[ $POST_END_OF_NIGHT_DATA == "true" ]]; then
        echo -e "$ME: Posting next twilight time to let server know when to resume liveview\n"
        ./postData.sh
	echo -e "\n"
fi

LAST_NIGHT_DIR="$ALLSKY_HOME/images/$LAST_NIGHT"

# Scan for, and remove corrupt images before generating
# keograms and startrails. This can take several (tens of) minutes to run
# and isn't necessary unless your system produces corrupt images which then
# generate funny colors in the summary images...
if [[ "$REMOVE_BAD_IMAGES" == "true" ]]; then
	echo -e "$ME: Removing bad images\n"
	./removeBadImages.sh $LAST_NIGHT_DIR
fi

TMP_DIR="$ALLSKY_HOME/tmp"
mkdir -p "$TMP_DIR"

# Generate keogram from collected images
if [[ $KEOGRAM == "true" ]]; then
        echo -e "$ME: Generating Keogram\n"
        mkdir -p $LAST_NIGHT_DIR/keogram/
	OUTPUT="$LAST_NIGHT_DIR/keogram/keogram-$LAST_NIGHT.$EXTENSION"
	# The keogram command outputs one line for each of the many hundreds of files,
	# and this adds needless clutter to the log file, so send output to a tmp file so we can output the
	# number of images.

	TMP="$TMP_DIR/keogramTMP.txt"
        ../keogram $LAST_NIGHT_DIR/ $EXTENSION $OUTPUT > ${TMP}
	RETCODE=$?
        if [[ $UPLOAD_KEOGRAM == "true" && $RETCODE = 0 ]] ; then
                if [[ $PROTOCOL == "S3" ]] ; then
                        $AWS_CLI_DIR/aws s3 cp $OUTPUT s3://$S3_BUCKET$KEOGRAM_DIR --acl $S3_ACL &
		elif [[ $PROTOCOL == "local" ]] ; then
                	cp $OUTPUT $KEOGRAM_DIR &
                else
                        lftp "$PROTOCOL://$USER:$PASSWORD@$HOST:$KEOGRAM_DIR" \
                                -e "set net:max-retries 1; put "$OUTPUT"; bye" &
                fi
        fi
	echo -e "$ME: Processed $(wc -l < ${TMP}) keogram files\n"
	# Leave ${TMP} in case the user needs to debug something.

	# Optionally copy to the local website in addition to the upload above.
	if [ "$WEB_KEOGRAM_DIR" != "" ]; then
		cp $OUTPUT "$WEB_KEOGRAM_DIR"
	fi
fi

# Generate startrails from collected images.
# Threshold set to 0.1 by default in config.sh to avoid stacking over-exposed images.
if [[ $STARTRAILS == "true" ]]; then
        echo -e "$ME: Generating Startrails\n"
        mkdir -p $LAST_NIGHT_DIR/startrails/
	OUTPUT="$LAST_NIGHT_DIR/startrails/startrails-$LAST_NIGHT.$EXTENSION"
	# The startrails command outputs one line for each of the many hundreds of files,
	# and this adds needless clutter to the log file, so send output to a tmp file so we can output the
	# number of images.
	TMP="$TMP_DIR/startrailsTMP.txt"
        ../startrails $LAST_NIGHT_DIR/ $EXTENSION $BRIGHTNESS_THRESHOLD $OUTPUT > ${TMP}
	RETCODE=$?
        if [[ $UPLOAD_STARTRAILS == "true" && $RETCODE == 0 ]] ; then
                if [[ $PROTOCOL == "S3" ]] ; then
                        $AWS_CLI_DIR/aws s3 cp $OUTPUT s3://$S3_BUCKET$STARTRAILS_DIR --acl $S3_ACL &
                elif [[ $PROTOCOL == "local" ]] ; then
                        cp $OUTPUT $STARTRAILS_DIR &
		else
                        lftp "$PROTOCOL"://"$USER":"$PASSWORD"@"$HOST":"$STARTRAILS_DIR" \
                                -e "set net:max-retries 1; put $OUTPUT; bye" &
                fi
        fi
        echo -e "$ME: Processed $(wc -l < ${TMP}) startrails files.  Summary:\n"
	grep "^Minimum" "${TMP}"
	# Leave ${TMP} in case the user needs to debug something.

	# Optionally copy to the local website in addition to the upload above.
	if [ "$WEB_STARTRAILS_DIR" != "" ]; then
		cp $OUTPUT "$WEB_STARTRAILS_DIR"
	fi
fi

# Generate timelapse from collected images
if [[ $TIMELAPSE == "true" ]]; then
	echo -e "$ME: Generating Timelapse\n"
	./timelapse.sh $LAST_NIGHT
	echo -e "\n"

	# Optionally copy to the local website in addition to the upload above.
	if [ "$WEB_MP4DIR" != "" ]; then
		cp $LAST_NIGHT_DIR/allsky-$LAST_NIGHT.mp4 "$WEB_MP4DIR"
	fi
fi

# Run custom script at the end of a night. This is run BEFORE the automatic deletion just in case you need to do something with the files before they are removed
./endOfNight_additionalSteps.sh

# Automatically delete old images and videos
if [[ $AUTO_DELETE == "true" ]]; then
	del=$(date --date="$NIGHTS_TO_KEEP days ago" +%Y%m%d)
	for i in `find $ALLSKY_HOME/images/ -type d -name "2*"`; do	# "2*" for years >= 2000
	  (($del > $(basename $i))) && rm -rf $i
	done
fi
