#!/bin/bash

# This file is "source"d into another.
# "${CURRENT_IMAGE}" is the name of the current image we're working on.

ME2="$( basename "${BASH_SOURCE[0]}" )"

# Subtract dark frame if there is one.
# This has to come after executing darkCapture.sh which sets ${AS_TEMPERATURE_C}.

if [[ $( settings ".usedarkframes" ) == "true" ]]; then
	# Make sure the input file exists; if not, something major is wrong so exit.
	if [[ -z ${CURRENT_IMAGE} ]]; then
		echo "*** ${ME2}: ERROR: 'CURRENT_IMAGE' not set; aborting."
		exit 1
	fi
	if [[ ! -f ${CURRENT_IMAGE} ]]; then
		echo "*** ${ME2}: ERROR: '${CURRENT_IMAGE}' does not exist; aborting."
		exit 2
	fi

	# Make sure we know the current temperature.
	# If it doesn't exist, warn the user but continue.
	if [[ -z ${AS_TEMPERATURE_C} ]]; then
		echo "*** ${ME2}: WARNING: 'AS_TEMPERATURE_C' not set; continuing without dark subtraction."
		return
	fi
	# Some cameras don't have a sensor temp, so don't attempt dark subtraction for them.
	[[ ${AS_TEMPERATURE_C} == "n/a" ]] && return

	# First check if we have an exact match.
	DARKS_DIR="${ALLSKY_DARKS}"
	DARK="${DARKS_DIR}/${AS_TEMPERATURE_C}.${EXTENSION}"
	if [[ -s ${DARK} ]]; then
		CLOSEST_TEMPERATURE="${AS_TEMPERATURE_C}"
	else
		# Find the closest dark frame temperature wise
		typeset -i CLOSEST_TEMPERATURE	# don't set yet
		typeset -i DIFF=100		# any sufficiently high number
		typeset -i AS_TEMPERATURE_C=${AS_TEMPERATURE_C##*(0)}
		typeset -i OVERDIFF		# DIFF when dark file temp > ${AS_TEMPERATURE_C}
		typeset -i DARK_TEMPERATURE

		# Sort the files by temperature so once we find a file at a higher temperature
		# than ${AS_TEMPERATURE_C}, stop, then compare it to the previous file to
		# determine which is closer to ${AS_TEMPERATURE_C}.
		# Need "--general-numeric-sort" in case any files have a leading "-".
		for file in $( find "${DARKS_DIR}" -maxdepth 1 -iname "*.${EXTENSION}" |
			sed 's;.*/;;' | sort --general-numeric-sort )
		do
			# Example file name for 21 degree dark: "21.jpg".
			if [[ -s ${DARKS_DIR}/${file} ]]; then
				file="$( basename "./${file}" )"	# need "./" in case file has "-"
				# Get name of file (which is the temp) without extension
				DARK_TEMPERATURE=${file%.*}
				if [[ ${DARK_TEMPERATURE} -gt ${AS_TEMPERATURE_C} ]]; then
					OVERDIFF=$((DARK_TEMPERATURE - AS_TEMPERATURE_C))
					if [[ ${OVERDIFF} -lt ${DIFF} ]]; then
						CLOSEST_TEMPERATURE=${DARK_TEMPERATURE}
					fi
					break
				fi
				CLOSEST_TEMPERATURE=${DARK_TEMPERATURE}
				DIFF=$((AS_TEMPERATURE_C - CLOSEST_TEMPERATURE))
			else
				
				echo -n "${ME2}: INFORMATION: dark file '${DARKS_DIR}/${file}' "
				if [[ ! -f ${DARKS_DIR}/${file} ]]; then
					echo "${file} does not exist  Huh?."
				else
					echo "${file} zero-length; deleting."
					ls -l "${DARKS_DIR}/${file}"
					rm -f "${DARKS_DIR}/${file}"
				fi
			fi
		done

		if [[ ${CLOSEST_TEMPERATURE} == "" ]]; then
			echo "*** ${ME2}: ERROR: No dark frame found for ${CURRENT_IMAGE} at temperature ${AS_TEMPERATURE_C}."
			echo "Either take dark frames or turn 'Use Dark Frames' off in the WebUI"
			echo "Continuing without dark subtraction."
			return
		fi

		DARK="${DARKS_DIR}/${CLOSEST_TEMPERATURE}.${EXTENSION}"
	fi

	if [[ ${ALLSKY_DEBUG_LEVEL} -ge 4 ]]; then
		echo "${ME2}: Subtracting dark frame '${CLOSEST_TEMPERATURE}.${EXTENSION}' from image with temperature=${AS_TEMPERATURE_C}"
	fi
	# Update the current image - don't rename it.
	if ! convert "${CURRENT_IMAGE}" "${DARK}" -compose minus_src -composite "${CURRENT_IMAGE}" ; then
		# Exit since we don't know the state of ${CURRENT_IMAGE}.
		echo "*** ${ME2}: ERROR: 'convert' of '${DARK}' failed"
		exit 4
	fi
fi
