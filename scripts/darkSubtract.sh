#!/bin/bash

# This file is "source"d into another.
# "${CURRENT_IMAGE}" is the name of the current image we're working on.

ME2="$(basename "${BASH_SOURCE[0]}")"

# Subtract dark frame if there is one defined in config.sh
# This has to come after executing darkCapture.sh which sets ${THIS_TEMPERATURE}.

if [ "${DARK_FRAME_SUBTRACTION}" = "true" ]; then
	# Make sure the input file exists; if not, something major is wrong so exit.
	if [ "${CURRENT_IMAGE}" = "" ]; then
		echo "*** ${ME2}: ERROR: 'CURRENT_IMAGE' not set; aborting."
		exit 1
	fi
	if [ ! -f "${CURRENT_IMAGE}" ]; then
		echo "*** ${ME2}: ERROR: '${CURRENT_IMAGE}' does not exist; aborting."
		exit 2
	fi

	# Make sure we know the current temperature.
	# If it doesn't exist, warn the user but continue.
	if [ "${THIS_TEMPERATURE}" = "" ]; then
		echo "*** ${ME2}: WARNING: 'THIS_TEMPERATURE' not set; continuing without dark subtraction."
		return
	fi
	# Some cameras don't have a sensor temp, so don't attempt dark subtraction for them.
	[ "${THIS_TEMPERATURE}" = "n/a" ] && return

	# First check if we have an exact match.
	DARKS_DIR="${ALLSKY_DARKS}"
	DARK="${DARKS_DIR}/${THIS_TEMPERATURE}.${EXTENSION}"
	if [ -s "${DARK}" ]; then
		CLOSEST_TEMPERATURE="${THIS_TEMPERATURE}"
	else
		# Find the closest dark frame temperature wise
		typeset -i CLOSEST_TEMPERATURE	# don't set yet
		typeset -i DIFF=100		# any sufficiently high number
		typeset -i THIS_TEMPERATURE=${THIS_TEMPERATURE##*(0)}
		typeset -i OVERDIFF		# DIFF when dark file temp > ${THIS_TEMPERATURE}
		typeset -i DARK_TEMPERATURE

		# Sort the files by temperature so once we find a file at a higher temperature
		# than ${THIS_TEMPERATURE}, stop, then compare it to the previous file to
		# determine which is closer to ${THIS_TEMPERATURE}.
		# Need "--general-numeric-sort" in case any files have a leading "-".
		for file in $(find "${DARKS_DIR}" -maxdepth 1 -iname "*.${EXTENSION}" | sed 's;.*/;;' | sort --general-numeric-sort)
		do
			[ "${ALLSKY_DEBUG_LEVEL}" -ge 5 ] && echo "Looking at ${file}"
			# Example file name for 21 degree dark: "21.jpg".
			if [ -s "${DARKS_DIR}/${file}" ]; then
				file=$(basename "./${file}")	# need "./" in case file has "-"
				# Get name of file (which is the temp) without extension
				DARK_TEMPERATURE=${file%.*}
				if [ ${DARK_TEMPERATURE} -gt ${THIS_TEMPERATURE} ]; then
					let OVERDIFF=${DARK_TEMPERATURE}-${THIS_TEMPERATURE}
					if [ ${OVERDIFF} -lt ${DIFF} ]; then
						CLOSEST_TEMPERATURE=${DARK_TEMPERATURE}
					fi
					break
				fi
				CLOSEST_TEMPERATURE=${DARK_TEMPERATURE}
				let DIFF=${THIS_TEMPERATURE}-${CLOSEST_TEMPERATURE}
			else
				
				echo -n "${ME2}: INFORMATION: dark file '${DARKS_DIR}/${file}' "
				if [ ! -f "${DARKS_DIR}/${file}" ]; then
					echo "${file} does not exist  Huh?."
				else
					echo "${file} zero-length; deleting."
					ls -l "${DARKS_DIR}/${file}"
					rm -f "${DARKS_DIR}/${file}"
				fi
			fi
		done

		if [ "${CLOSEST_TEMPERATURE}" = "" ]; then
			echo "*** ${ME2}: ERROR: No dark frame found for ${CURRENT_IMAGE} at temperature ${THIS_TEMPERATURE}."
			echo "Either take dark frames or turn DARK_FRAME_SUBTRACTION off in config.sh"
			echo "Continuing without dark subtraction."
			return
		fi

		DARK="${DARKS_DIR}/${CLOSEST_TEMPERATURE}.${EXTENSION}"
	fi

	if [ "${ALLSKY_DEBUG_LEVEL}" -ge 4 ]; then
		echo "${ME2}: Subtracting dark frame '${CLOSEST_TEMPERATURE}.${EXTENSION}' from image with temperature=${THIS_TEMPERATURE}"
	fi
	# Update the current image - don't rename it.
	convert "${CURRENT_IMAGE}" "${DARK}" -compose minus_src -composite "${CURRENT_IMAGE}"
	if [ $? -ne 0 ]; then
		# Exit since we don't know the state of ${CURRENT_IMAGE}.
		echo "*** ${ME2}: ERROR: 'convert' of '${DARK}' failed"
		exit 4
	fi
fi

