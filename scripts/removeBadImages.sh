#!/bin/bash

if [ $# -ne 1 -o 'x$1' == 'x-h' ] ; then
	echo "Remove images with corrupt data which might mess up startrails and keograms"
	echo "usage: $0 <directory>"
	exit 1
fi

if [ \! -d "$1" ] ; then
	echo "$1 is not a directory"
	exit 1
fi

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

if which parallel > /dev/null ; then
	find "$1" -type f \( -iname image-\*.jpg -o -iname image-\*.png \) \! -ipath \*thumbnail\*  | \
		parallel -- "convert {} histogram:/dev/null 2>&1 | egrep -q 'Huffman|Bogus|Corrupt|Invalid|Trunc|Missing' && rm -vf {}"
else
	for f in $( find "$1" -type f \( -iname image-\*.jpg -o -iname image-\*.png \) \! -ipath \*thumbnail\* ) ; do
		nice convert "$f"  histogram:/dev/null 2>&1 | egrep -q 'Huffman|Bogus|Corrupt|Invalid|Trunc|Missing' && rm -vf $f
	done
fi
