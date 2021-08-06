#!/bin/bash

cd $ALLSKY_HOME

ME="$(basename "$BASH_ARGV0")"	# Include script name in output so it's easier to find in the log file

# Subtract dark frame if there is one defined in config.sh
# This has to come after executing darkCapture.sh which sets ${TEMP}.

if [ "$DARK_FRAME_SUBTRACTION" = "true" ]; then
	# Find the closest dark frame temperature wise
	CLOSEST_TEMP=0
	DIFF=100
	for file in darks/*
	do
    		if [[ -f $file ]]; then		# example file name for 21 degree dark: "darks/21.jpg".
        		DARK_TEMP=$(echo $file | awk -F[/.] '{print $2}')
        		DELTA=$(expr $TEMP - $CLOSEST_TEMP)
			ABS_DELTA=${DELTA#-}

        		if [ "$ABS_DELTA" -lt "$DIFF"  ]; then
                		DIFF=$DELTA
                		CLOSEST_TEMP=$DARK_TEMP
        		fi
    		fi
	done

	PROCESSED_FILE="$FILENAME-processed.$EXTENSION"
	DARK="darks/$CLOSEST_TEMP.$EXTENSION"
	if [ -f "$DARK" ]; then
  	      convert "$FULL_FILENAME" "$DARK" -compose minus_src -composite -type TrueColor "$PROCESSED_FILE"
	      RET=$?
	      if [ $RET -ne 0 ]; then
		      echo "*** $ME: ERROR: 'convert' of '$DARK' failed with RET=$RET"
		      exit 1
	      fi
	else
		echo "*** $ME: ERROR: No dark frame found for $FULL_FILENAME at TEMP $TEMP." >> log.txt
		echo "Either take dark frames or turn DARK_FRAME_SUBTRACTION off in config.sh" >> log.txt
		cp "$FULL_FILENAME" "$PROCESSED_FILE"
	fi
fi
