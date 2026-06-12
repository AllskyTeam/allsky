#!/bin/bash

# This file is "source"d into another if we're subtracting darks.
# "${CURRENT_IMAGE}" is the name of the current image we're working on.

ME2="$( basename "${BASH_SOURCE[0]}" )"

# Subtract dark frame if there is one.
# This has to come after executing darkCapture.sh which sets ${AS_TEMPERATURE_C}.

# Allow running this script in "test mode", outside of Allsky.
TEST_MODE="false"
if [[ ${TEST_MODE} == "true" ]]; then
	ALLSKY_DEBUG_LEVEL="4"
	AS_TEMPERATURE_C="21"						# Pick a temperature, any temperature...
	ALLSKY_DARKS="/tmp/${ME2}-test"
	CURRENT_IMAGE="${ALLSKY_DARKS}/CURRENT_IMAGE/image.jpg"
	mkdir -p "$( dirname "${CURRENT_IMAGE}" )"

	# Create the image and some darks
	echo "this is a test 'image'" > "${CURRENT_IMAGE}"
	TEST_EXT="jpg"		# Change between .png and .jgp for testing
	for i in -1 1 $(( AS_TEMPERATURE_C - 1 ))
	do
		echo "${i}" > "${ALLSKY_DARKS}/${i}.${TEST_EXT}"
	done
	# echo "over" > "${ALLSKY_DARKS}/$(( AS_TEMPERATURE_C + 1 )).${TEST_EXT}" 

	echo -e "\nUsing '${ALLSKY_DARKS}:"
	find "${ALLSKY_DARKS}" -print
	echo
fi

# Make sure the input file exists; if not, something major is wrong so exit.
if [[ -z ${CURRENT_IMAGE} ]]; then
	echo "*** ${ME2}: ERROR: 'CURRENT_IMAGE' not set; aborting." >&2
	exit 1
fi
if [[ ! -f ${CURRENT_IMAGE} ]]; then
	echo "*** ${ME2}: ERROR: '${CURRENT_IMAGE}' does not exist; aborting." >&2
	exit 2
fi

# Make sure we know the current temperature.
# If it doesn't exist, warn the user but continue.
if [[ -z ${AS_TEMPERATURE_C} ]]; then
	echo "*** ${ME2}: WARNING: 'AS_TEMPERATURE_C' not set; continuing without dark subtraction." >&2
	return
fi
# Some cameras don't have a sensor temp, so don't attempt dark subtraction for them.
[[ ${AS_TEMPERATURE_C} == "n/a" ]] && return

# If the temp is a float, round and convert to int.
# Don't update AS_TEMPERATURE_C since we want the float version to appear in overlays.
TEMPERATURE="$( echo "${AS_TEMPERATURE_C}" | gawk '{ printf("%d", $1+0.5); }' )"

for EXT in "png" "jpg"
do
	# First check if we have an exact match.
	DARK="${ALLSKY_DARKS}/${TEMPERATURE}.${EXT}"
	if [[ -s ${DARK} ]]; then
		break
	fi

	# Find the closest dark frame temperature wise
	typeset -i CLOSEST_TEMPERATURE	# don't set yet
	typeset -i DIFF=100		# any sufficiently high number
	typeset -i TEMPERATURE=${TEMPERATURE##*(0)}
	typeset -i OVERDIFF		# DIFF when dark file temp > ${TEMPERATURE}
	typeset -i DARK_TEMPERATURE

	# Sort the files by temperature so once we find a file at a higher temperature
	# than ${TEMPERATURE}, stop, then compare it to the previous file to
	# determine which is closer to ${TEMPERATURE}.
	# Need "--general-numeric-sort" in case any files start with "-".
	for FILE in $( find "${ALLSKY_DARKS}" -maxdepth 1 -iname "*.${EXT}" |
		sed 's;.*/;;' | sort --general-numeric-sort )
	do
		[[ ${TEST_MODE} == "true" ]] && echo "Looking at FILE='${FILE}'"
		# Example file name for 21 degree dark: "21.png".
		if [[ -s ${ALLSKY_DARKS}/${FILE} ]]; then
				FILE="$( basename -- "${FILE}" )"	# need "--" in case FILE starts with "-"
			# Get name of FILE (which is the temp) without extension
			DARK_TEMPERATURE=${FILE%.*}
			if [[ ${DARK_TEMPERATURE} -gt ${TEMPERATURE} ]]; then
				OVERDIFF=$(( DARK_TEMPERATURE - TEMPERATURE ))
				if [[ ${OVERDIFF} -lt ${DIFF} ]]; then
					CLOSEST_TEMPERATURE=${DARK_TEMPERATURE}
				fi
				break
			fi
			CLOSEST_TEMPERATURE=${DARK_TEMPERATURE}
			DIFF=$(( TEMPERATURE - CLOSEST_TEMPERATURE ))
		else
			echo -n "${ME2}: INFORMATION: dark file '${ALLSKY_DARKS}/${FILE}' " >&2
			if [[ ! -f ${ALLSKY_DARKS}/${FILE} ]]; then
				echo "${FILE} does not exist  Huh?."
			else
				echo "${FILE} zero-length; deleting."
				ls -l "${ALLSKY_DARKS}/${FILE}"
				rm -f "${ALLSKY_DARKS}/${FILE}"
			fi >&2
		fi
	done

	if [[ -n ${CLOSEST_TEMPERATURE} ]]; then
		DARK="${ALLSKY_DARKS}/${CLOSEST_TEMPERATURE}.${EXT}"
		[[ -f ${DARK} ]] && break
		
		echo "*** ${ME2}: ERROR: DARK file '${DARK}' not found.  Huh?" >&2
		return
	fi

	if [[ ${EXT} == "jpg" ]]; then
		echo "*** ${ME2}: ERROR: No dark frame found for ${CURRENT_IMAGE} at temperature ${TEMPERATURE}."
		echo "Either take dark frames or turn off 'Use Dark Frames' in the WebUI."
		echo "Continuing without dark subtraction."
		return
	fi >&2
done

if [[ ${ALLSKY_DEBUG_LEVEL} -ge 4 ]]; then
	echo -n "${ME2}: Subtracting dark frame '$( basename -- "${DARK}" )'"
	echo    " from ${CURRENT_IMAGE} with temperature=${TEMPERATURE}"
fi

if [[ ${TEST_MODE} == "true" ]]; then
	rm -fr "${ALLSKY_DARKS}"
	exit 0
fi

# Update the current image - don't rename it.
if ! ERR="$( convert "${CURRENT_IMAGE}" "${DARK}" -compose minus_src -composite "${CURRENT_IMAGE}" 2>&1 )" ; then
	# Exit since we don't know the state of ${CURRENT_IMAGE}.
	echo "*** ${ME2}: ERROR: 'convert' of '${DARK}' failed: ${ERR}" >&2
	exit 4
fi

