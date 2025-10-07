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

# The extension on ${CURRENT_IMAGE} may not be ${ALLSKY_EXTENSION}.
DARK_EXTENSION="${CURRENT_IMAGE##*.}"

[[ ! -d ${ALLSKY_DARKS} ]] && mkdir -p "${ALLSKY_DARKS}"

if [[ -z ${AS_TEMPERATURE_C} ]]; then
	# The camera doesn't support temperature so we'll keep overwriting the file until
	# AS_TEMPERATURE_C is set.
	# This allows users to continually look for a new dark file and rename it manually.
	MOVE_TO_FILE="${ALLSKY_DARKS}/$( basename "${CURRENT_IMAGE}" )"
else
	# If the temp is a float, round and convert to int.
	AS_TEMPERATURE_C="$( echo "${AS_TEMPERATURE_C}" | gawk '{ printf("%d", $1+0.5); }' )"
	MOVE_TO_FILE="${ALLSKY_DARKS}/${AS_TEMPERATURE_C}.${DARK_EXTENSION}"
fi
mv "${CURRENT_IMAGE}" "${MOVE_TO_FILE}" || exit 3
