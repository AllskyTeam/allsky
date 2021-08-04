#!/bin/bash

REMOVE_BAD_IMAGES_THRESHOLD_LOW=${REMOVE_BAD_IMAGES_THRESHOLD_LOW:-0}	# in case not in config.sh file
REMOVE_BAD_IMAGES_THRESHOLD_HIGH=${REMOVE_BAD_IMAGES_THRESHOLD_HIGH:-0}	# in case not in config.sh file

ME="$(basename "$BASH_ARGV0")"	# Include script name in output so it's easier to find in the log file

if [ $# -ne 1 -o 'x$1' == 'x-h' ] ; then
	echo "Remove images with corrupt data which might mess up startrails and keograms"
	echo "usage: $ME <directory>"
	exit 1
fi

if [ \! -d "$1" ] ; then
	echo "$ME: $1 is not a directory"
	exit 1
fi
DIR=$1

# Super simple: find the full size image-*jpg and image-*png files (not the
# thumbnails) and ask imagemagick to compute a histogram (which is discarded)
# in order to capture the diagnostics from libjpeg. Will have to benchmark to
# be sure, but I suspect it's faster to produce histogram output than another
# image format which would be discarded anyway. If an input image does produce
# a warning message grep will match it and it will be deleted.
#
# This leaves us just images that decompress properly and won't introduce junk
# into the processing pipeline.
#
# Why on G-d's green earth would I do something like this? Because for whatever
# reason, my raspberry pi produces corrupt captures occasionally and this tool
# means I get good startrails and keograms in the morning.
#
# If GNU Parallel is installed (it's not by default), then blast through and
# clean all the images as fast as possible without regard for CPU utilization.

# Use IMAGE_FILES and ERROR_WORDS to avoid duplicating them.
# Remove 0-length files ("insufficient image data") and files too dim or bright.
# $DIR may end in a "/" so there will be "//" in the filenames, but there's no harm in that.
cd $DIR
IMAGE_FILES="$( find . -type f \( -iname image-\*.jpg -o -iname image-\*.png \) \! -ipath \*thumbnail\* )"
ERROR_WORDS="Huffman|Bogus|Corrupt|Invalid|Trunc|Missing|insufficient image data|no decode delegate"

TMP=badError.txt

if which parallel > /dev/null ; then
	echo $IMAGE_FILES | \
		parallel -- "convert {} histogram:/dev/null 2>&1 | egrep -q "$ERROR_WORDS" && rm -vf {}"
	# xxxxxxxxxx need to add THRESHOLD checking here and remove bad thumbnails...
	# xxxxxxxxxx Can we replace "rm -vf" above with "echo" and redirect output to the tmp file,
	# xxxxxxxxxx then do a "for f in $(cat $TMP); do" and remove the files that way?
else
	typeset -i num_bad=0
	for f in ${IMAGE_FILES} ; do
		MEAN=$(nice convert "$f" -colorspace Gray -format "%[fx:image.mean]" info: 2> $TMP)
		BAD=""
		egrep -q "$ERROR_WORDS" $TMP
		RET=$?
		if [ $RET -eq 0 ] ; then
			rm -f "$f" "thumbnails/$f"
			BAD="'$f' (corrupt file: $(cat $TMP))"
			let num_bad=num_bad+1
		else
			# Multiply MEAN by 100 to convert to integer (0-100 %) since bash doesn't work with floats.
			MEAN=$(echo "$MEAN" | awk '{ printf("%d", $1 * 100); }')
			if [ $MEAN -lt $REMOVE_BAD_IMAGES_THRESHOLD_LOW -o $MEAN -gt $REMOVE_BAD_IMAGES_THRESHOLD_HIGH ]; then
				rm -f "$f" "thumbnails/$f"
				BAD="'$f' (bad threshold: MEAN=$MEAN)"
				let num_bad=num_bad+1
			fi
		fi
		[ "$BAD" != "" ] && echo "$ME: Removed $BAD"
	done
	if [ $num_bad -eq 0 ]; then
		echo "$ME: No bad files found."
	else
		echo "$ME: $num_bad bad file(s) found and removed."
	fi
fi
rm -f $TMP
