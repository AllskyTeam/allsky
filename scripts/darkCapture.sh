#!/bin/bash

# This file is "source"d into another.
# "${CURRENT_IMAGE}" is the name of the current image we're working on and is passed to us.

# ${TEMPERATURE} is passed to us by saveImage.sh, but may be null.
# If ${TEMPERATURE} is set, use it as the temperature, otherwise read the ${TEMPERATURE_FILE}.
# If the ${TEMPERATURE_FILE} file doesn't exist, set the temperature to "n/a".
if [ "${TEMPERATURE}" = "" ]; then
	TEMPERATURE_FILE="${ALLSKY_HOME}/temperature.txt"
	if [ -s "${TEMPERATURE_FILE}" ]; then	# -s so we don't use an empty file
		TEMPERATURE=$(printf "%02.0f" "$(< ${TEMPERATURE_FILE})")
	else
		TEMPERATURE="n/a"
	fi
fi

DARK_MODE=$(jq -r '.darkframe' "${CAMERA_SETTINGS}")
if [ "${DARK_MODE}" = "1" ] ; then
	# XXXXX in future release $CURRENT_IMAGE will be set by saveImage.sh
	# and passed to us.  Doing this conditional set works either way.
	CURRENT_IMAGE=${CURRENT_IMAGE:-"dark.${EXTENSION}"}

	# The extension on $CURRENT_IMAGE may not be $EXTENSION.
	DARK_EXTENSION="${CURRENT_IMAGE##*.}"

	DARKS_DIR="${ALLSKY_DARKS}"
	mkdir -p "${DARKS_DIR}"
	# If the camera doesn't support temperature, we will keep overwriting the file until
	# the user creates a temperature.txt file.
	if [ "${TEMPERATURE}" = "n/a" ]; then
		cp "${CURRENT_IMAGE}" "${DARKS_DIR}"
	else
		cp "${CURRENT_IMAGE}" "${DARKS_DIR}/${TEMPERATURE}.${DARK_EXTENSION}"
	fi

	# If the user has notification images on, the current image says we're taking dark frames,
	# so don't overwrite it.
	# xxxx It's possible some people will want to see the dark frame even if notification images
	# are being used - may need to make it optional to see the dark frame.
	USE_NOTIFICATION_IMAGES=$(jq -r '.notificationimages' "${CAMERA_SETTINGS}")
	if [ "${USE_NOTIFICATION_IMAGES}" = "0" ] ; then
		# Go ahead and let the web sites see the dark frame to see if it's working.
		cp "${CURRENT_IMAGE}" "${FULL_FILENAME}"
	fi

	exit 0	# exit so the calling script exits and doesn't try to process the file.
else	
	# XXXXX Need this until saveImage.sh passes $CURRENT_IMAGE to us.
	CURRENT_IMAGE="${CURRENT_IMAGE:-${FULL_FILENAME}}"	# Not capturing darks so use standard file name
fi
