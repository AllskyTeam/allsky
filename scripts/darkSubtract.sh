#!/bin/bash

cd $ALLSKY_HOME

# Subtract dark frame if there is one defined in config.sh
# Find the closest dark frame temperature wise
CLOSEST_TEMP=0
DIFF=100
for file in darks/*
do
    if [[ -f $file ]]; then
        DARK_TEMP=$(echo $file | awk -F[/.] '{print $2}')
        DELTA=$(expr $TEMP - $CLOSEST_TEMP)
	ABS_DELTA=${DELTA#-}

        if [ "$ABS_DELTA" -lt "$DIFF"  ]; then
                DIFF=$DELTA
                CLOSEST_TEMP=$DARK_TEMP
        fi
    fi
done

if [ -e "darks/$CLOSEST_TEMP.$EXTENSION" ] ; then
        convert "$FULL_FILENAME" "darks/$CLOSEST_TEMP.$EXTENSION" -compose minus_src -composite -type TrueColor "$FILENAME-processed.$EXTENSION"
fi
