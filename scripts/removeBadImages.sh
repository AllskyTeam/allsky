#!/bin/bash

ME="$(basename "${BASH_ARGV0}")"

source "${ALLSKY_HOME}/variables.sh"
source "${ALLSKY_CONFIG}/config.sh"
source "${ALLSKY_SCRIPTS}/filename.sh"

usage()
{
	retcode="${1}"
	echo
	echo "Remove images with corrupt data which might mess up startrails and keograms."
	[ "${retcode}" -ne 0 ] && echo -en "${RED}"
	echo -n "Usage: ${ME} [--help] [--debug]  directory  [file]"
	[ "${retcode}" -ne 0 ] && echo -e "${NC}"
	echo
	echo "You must enter the arguments in the above order."
# TODO: use getopts to allow any order
	echo "Turning on debug will indicate bad images but will not remove them."
	echo "If 'file' is specified, only that file in 'directory' will be checked,"
	echo "otherwise all files in 'directory' will be checked."
	exit ${retcode}
}
[ "${1}" = "-h" -o "${1}" = "--help" ] && usage 0
if [ "${1}" = "-d" -o "${1}" = "--debug" ]; then
	DEBUG="true"
	r="would be removed"
	shift
else
	DEBUG="false"
	r="removed"
fi

[ $# -eq 0 -o $# -gt 2 ] && usage 1

DATE="${1}"
FILE="${2}"

# If we're running in debug mode don't display ${ME} since it makes the output harder to read.
if [ ${DEBUG} = "true" -o "${ON_TTY}" = "1" ]; then
	ME=""
else
	ME="${ME}:"
fi

# If it's not a full pathname, assume it's in $ALLSKY_IMAGES which is what many other scripts do.
[ "${DATE:0:1}" != "/" ] && DATE="${ALLSKY_IMAGES}/${DATE}"
if [ ! -d "${DATE}" ]; then
	echo -e "${RED}${ME} '${DATE}' is not a directory${NC}"
	exit 2
fi

if [ "${FILE}" != "" -a ! -f "${DATE}/${FILE}" ]; then
	echo -e "${RED}${ME} '${FILE}' not found in '${DATE}'${NC}"
	exit 2
fi

DARK_MODE=$(jq -r '.darkframe' "${CAMERA_SETTINGS}")
if [ "${DARK_MODE}" = "1" ]; then
	# Disable low brightness check since darks will have extremely low brightness.
	# But continue with the other checks in case the dark file is corrupted.
	REMOVE_BAD_IMAGES_THRESHOLD_LOW=0
fi

# Find the full size image-*jpg and image-*png files (not the thumbnails) and
# have "convert" compute a histogram in order to capture any error messages and determine
# if the image is too dim or too bright.
# If an image DOES produce an error message grep will match it and the file will be deleted.

# Doing this allows good startrails and keograms to be produced on machines that
# sometimes produce corrupt or zero-length files.

# Use IMAGE_FILES and ERROR_WORDS to avoid duplicating those strings.
# ${DATE} may end in a "/" so there will be "//" in the filenames, but there's no harm in that.

set +a		# turn off auto-export since $IMAGE_FILES might be huge and produce errors

cd "${DATE}"
if [ "${FILE}" != "" ]; then
	IMAGE_FILES="${FILE}"
else
	IMAGE_FILES="$( find . -maxdepth 1 -type f -iname "${FILENAME}"-\*.${EXTENSION} )"
fi
ERROR_WORDS="Huffman|Bogus|Corrupt|Invalid|Trunc|Missing|insufficient image data|no decode delegate|no images defined"

TMP="${ALLSKY_TMP}/badError.txt"

# Save all output to a temp file so don't potentially swamp the system log file.
OUTPUT="${ALLSKY_TMP}/removeBadImages.log"
> ${OUTPUT}

typeset -i num_bad=0
# If the low threshold is 0 it's disabled.
# If the high one is 0 or 100 (nothing can be brighter than 100) it's disabled.
if [ ${REMOVE_BAD_IMAGES_THRESHOLD_HIGH} -gt 100 -o ${REMOVE_BAD_IMAGES_THRESHOLD_HIGH} -eq 0 ]; then
	HIGH=0
else
	HIGH=${REMOVE_BAD_IMAGES_THRESHOLD_HIGH}
fi
LOW=${REMOVE_BAD_IMAGES_THRESHOLD_LOW}

# If we're processing a whole directory assume it's done in the background so "nice" it.
# If we're only processing one file we want it done quickly.
if [ "${FILE}" = "" ]; then
		NICE="nice"
else
		NICE=""
fi

for f in ${IMAGE_FILES} ; do
	BAD=""

	if [ ! -s "${f}" ]; then
		BAD="'${f}' (zero length)"
	else
		# MEAN is a number between 0.0 and 1.0.
		MEAN=$(${NICE} convert "${f}" -colorspace Gray -format "%[fx:image.mean]" info: 2> "${TMP}")
		if egrep -q "${ERROR_WORDS}" "${TMP}"; then
			# At least one error word was found in the output.
			# Try to get rid of unnecessary error text.
			BAD="'${f}' (corrupt file: $(head -1 "${TMP}" | sed -e 's;convert-im6.q16: ;;' -e 's; @ error.*;;' -e 's; @ warning.*;;'))"
		else
			# Multiply MEAN by 100 to convert to integer (0-100 %) since
			# bash doesn't work with floats.
			MEAN=$(echo "${MEAN} * 100" | bc)
			MSG=""

			if [ "${HIGH}" != "0" ]; then
				x=$(echo "${MEAN} > ${HIGH}" | bc)
				if [ ${x} -eq 1 ]; then
					BAD="'${f}' (above threshold: MEAN=${MEAN}, threshold = ${HIGH})"
				elif [ ${DEBUG} = "true" ]; then
					MSG="===== OK: ${f}, MEAN=${MEAN}, HIGH=${HIGH}, LOW=${LOW}"
				fi
			fi

			# An image can't be both HIGH and LOW so if it was HIGH don't check for LOW.
			if [ "${BAD}" = "" -a "${LOW}" != "0" ]; then
				x=$(echo "${MEAN} < ${LOW}" | bc)
				if [ ${x} -eq 1 ]; then
					BAD="'${f}' (below threshold: MEAN=${MEAN}, threshold = ${LOW})"
				elif [ ${DEBUG} = "true" -a "${MSG}" = "" ]; then
					MSG="===== OK: ${f}, MEAN=${MEAN}, HIGH=${HIGH}, LOW=${LOW}"
				fi
			fi

			if [ ${DEBUG} = "true" -a "${BAD}" = "" -a "${MSG}" != "" ]; then
				echo "${MSG}"
			fi
		fi

	fi

	if [ "${BAD}" != "" ]; then
		echo "${r} ${BAD}" >> "${OUTPUT}"
		[ ${DEBUG} = "false" ] && rm -f "${f}" "thumbnails/${f}"
		let num_bad=num_bad+1
	fi
done

if [ $num_bad -eq 0 ]; then
	# If only one file, "no news is good news".
	[ "${FILE}" = "" ] && echo -e "\n${ME} ${GREEN}No bad files found.${NC}"
	rm -f "${OUTPUT}"
else
	if [ "${FILE}" = "" ]; then
		echo "${ME} ${num_bad} bad file(s) found and ${r}. See ${OUTPUT}."
		# Do NOT remove ${OUTPUT} in case the user wants to look at it.
	else	# only 1 file so show it
		echo "${ME} File is bad: $(< "${OUTPUT}")"
		rm -f "${OUTPUT}"
	fi
fi

rm -f "${TMP}"

if [ $num_bad -eq 0 ]; then
	exit 0
else
	exit 99		# "99" means we deleted at least one file.
fi
