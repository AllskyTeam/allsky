#!/bin/bash

# This file is "source"d into another.
# "${CURRENT_IMAGE}" is the name of the current image we're working on and is passed to us.
ME2="$(basename "${BASH_SOURCE[0]}")"

# Make sure the input file exists; if not, something major is wrong so exit.
if [ "${CURRENT_IMAGE}" = "" ]; then
	echo "*** ${ME2}: ERROR: 'CURRENT_IMAGE' not set; aborting."
	exit 1
fi
if [ ! -f "${CURRENT_IMAGE}" ]; then
	echo "*** ${ME2}: ERROR: '${CURRENT_IMAGE}' does not exist; aborting."
	exit 2
fi

# ${AS_TEMPERATURE} is passed to us by saveImage.sh, but may be null.
# If ${AS_TEMPERATURE} is set, use it as the temperature, otherwise read the ${TEMPERATURE_FILE}.
# If the ${TEMPERATURE_FILE} file doesn't exist, set the temperature to "n/a".
if [ "${AS_TEMPERATURE}" = "" ]; then
	TEMPERATURE_FILE="${ALLSKY_TMP}/temperature.txt"
	if [ -s "${TEMPERATURE_FILE}" ]; then	# -s so we don't use an empty file
		AS_TEMPERATURE=$( < ${TEMPERATURE_FILE})
	else
		AS_TEMPERATURE="n/a"
	fi
fi

DARK_MODE=$(jq -r '.darkframe' "${CAMERA_SETTINGS}")
if [ "${DARK_MODE}" = "1" ] ; then
	# The extension on $CURRENT_IMAGE may not be $EXTENSION.
	DARK_EXTENSION="${CURRENT_IMAGE##*.}"

	DARKS_DIR="${ALLSKY_DARKS}"
	mkdir -p "${DARKS_DIR}"
	# If the camera doesn't support temperature, we will keep overwriting the file until
	# the user creates a temperature.txt file.
	if [ "${AS_TEMPERATURE}" = "n/a" ]; then
		MOVE_TO_FILE="${DARKS_DIR}/$(basename "${CURRENT_IMAGE}")"
	else
		MOVE_TO_FILE="${DARKS_DIR}/${AS_TEMPERATURE}.${DARK_EXTENSION}"
	fi
	mv "${CURRENT_IMAGE}" "${MOVE_TO_FILE}"

	# If the user has notification images on, the current image says we're taking dark frames,
	# so don't overwrite it.
	# xxxx It's possible some people will want to see the dark frame even if notification images
	# are being used - may need to make it optional to see the dark frame.
	USE_NOTIFICATION_IMAGES=$(jq -r '.notificationimages' "${CAMERA_SETTINGS}")
	if [ "${USE_NOTIFICATION_IMAGES}" = "0" ] ; then
		# Go ahead and let the web sites see the dark frame to see if it's working.
		# We're copying back the file we just moved, but the assumption is few people
		# will want to see the dark frames on the web.

		# xxxx  TODO: don't use $FULL_FILENAME since that assumes $EXTENSION is the same as
		# $DARK_EXTENSION.  If we start saving darks as .png files the extensions will be
		# different and we'll need to run "convert" to make the dark a .jpg file to
		# be displayed on the web.
		cp "${MOVE_TO_FILE}" "${FULL_FILENAME}"
	fi

	exit 0	# exit so the calling script exits and doesn't try to process the file.
fi
