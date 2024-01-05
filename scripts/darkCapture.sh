#!/bin/bash

# This file is "source"d into another.
# "${CURRENT_IMAGE}" is the full pathname of the current image we're working on and is passed to us.
ME2="$( basename "${BASH_SOURCE[0]}" )"

# Make sure the input file exists; if not, something major is wrong so exit.
if [[ -z ${CURRENT_IMAGE} ]]; then
	echo "*** ${ME2}: ERROR: 'CURRENT_IMAGE' not set; aborting."
	exit 1
fi
if [[ ! -f ${CURRENT_IMAGE} ]]; then
	echo "*** ${ME2}: ERROR: '${CURRENT_IMAGE}' does not exist; aborting."
	exit 2
fi

# The extension on $CURRENT_IMAGE may not be $EXTENSION.
DARK_EXTENSION="${CURRENT_IMAGE##*.}"

DARKS_DIR="${ALLSKY_DARKS}"
mkdir -p "${DARKS_DIR}"
if [[ -z ${AS_TEMPERATURE_C} ]]; then
	# The camera doesn't support temperature so we'll keep overwriting the file until
	# AS_TEMPERATURE_C is set.
	# This allows users to continually look for a new dark file and rename it manually.
	MOVE_TO_FILE="${DARKS_DIR}/$( basename "${CURRENT_IMAGE}" )"
else
	MOVE_TO_FILE="${DARKS_DIR}/${AS_TEMPERATURE_C}.${DARK_EXTENSION}"
fi
mv "${CURRENT_IMAGE}" "${MOVE_TO_FILE}" || exit 3

# If the user has notification images on, the current image says "Taking dark frames",
# so don't overwrite it.
# If notification images are off, let the user see the dark from to know it's working.
# Some people may want to see the dark frame even if notification images
# are being used, but no one's askef for that feature so don't worry about it.

if [[ $( settings ".notificationimages" ) -eq 0 ]]; then
	# We're copying back the file we just moved, but the assumption is few people
	# will want to see the dark frames so the performance hit is 
	cp "${MOVE_TO_FILE}" "${ALLSKY_TMP}/${FILENAME}.${EXTENSION}"
fi
