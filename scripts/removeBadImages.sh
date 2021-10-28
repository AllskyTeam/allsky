#!/bin/bash

ME="$(basename "${BASH_ARGV0}")"

source "${ALLSKY_HOME}/variables.sh"
source "${ALLSKY_CONFIG}/config.sh"
source "${ALLSKY_SCRIPTS}/filename.sh"

if [ "${1}" = "-d" -o "${1}" = "--debug" ]; then
	DEBUG="true"
	MSG="can be removed"
	shift
else
	DEBUG="false"
	MSG="removed"
fi

if [ $# -eq 0 -o $# -gt 2 -o '${1}' = '-h' -o "${1}" = "--help" ] ; then
	echo
	echo "Remove images with corrupt data which might mess up startrails and keograms."
	echo -en "${RED}"
	echo -n "Usage: ${ME} [-d]  directory  [file]"
	echo -e "${NC}"
	echo
	echo "If 'file' is specified, only that file in 'directory' will be checked,"
	echo "otherwise all files in 'directory' will be checked."
	exit 0
fi

DATE="$1"
if [ ! -d "${DATE}" ] ; then
	echo -e "${RED}${ME}: '${DATE}' is not a directory${NC}"
	exit 2
fi

FILE="${2}"
if [ "${FILE}" != "" -a ! -f "${DATE}/${FILE}" ]; then
	echo -e "${RED}${ME}: '${FILE}' not found in '${DATE}'${NC}"
	exit 2
fi

DARK_MODE=$(jq -r '.darkframe' "${CAMERA_SETTINGS}")
if [ "${DARK_MODE}" = "1" ] ; then
	# Disable low brightness check since darks will have extremely low brightness.
	REMOVE_BAD_IMAGES_THRESHOLD_LOW=0
fi

# Find the full size image-*jpg and image-*png files (not the thumbnails) and
# have "convert" compute a histogram (which is discarded),
# in order to capture any error messages.
# If an image DOES produce an error message grep will match it and the file will be deleted.

# Doing this allows good startrails and keograms to be produced on machines that
# sometimes produce corrupt or zero-length files.

# If GNU Parallel is installed (it's not by default), then blast through and
# clean all the images as fast as possible without regard for CPU utilization.

# Use IMAGE_FILES and ERROR_WORDS to avoid duplicating them.
# Remove 0-length files ("insufficient image data") and files too dim or bright.
# ${DATE} may end in a "/" so there will be "//" in the filenames, but there's no harm in that.
cd "${DATE}"
if [ "${FILE}" != "" ]; then
	IMAGE_FILES="${FILE}"
else
	IMAGE_FILES="$( find . -type f -iname "${FILENAME}"-\*.${EXTENSION} \! -ipath \*thumbnail\* )"
fi
ERROR_WORDS="Huffman|Bogus|Corrupt|Invalid|Trunc|Missing|insufficient image data|no decode delegate|no images defined"

TMP="${ALLSKY_TMP}/badError.txt"
OUTPUT="${ALLSKY_TMP}/removeBadImages.log"
> ${OUTPUT}

typeset -i num_bad=0
if which parallel > /dev/null ; then
	echo $IMAGE_FILES | \
		parallel -- "convert {} histogram:/dev/null 2>&1 | egrep -q "${ERROR_WORDS}" && rm -vf {}"
	# xxxxxxxxxx need to add THRESHOLD checking here and remove bad thumbnails...
	# xxxxxxxxxx Can we replace "rm -vf" above with "echo" and redirect output to the tmp file,
	# xxxxxxxxxx then do a "for f in $(< ${TMP}); do" and remove the files that way?
else
	# If there's only 1 file we wan't it processed quickly so don't "nice" it.
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
			MEAN=$(${NICE} convert "${f}" -colorspace Gray -format "%[fx:image.mean]" info: 2> "${TMP}")
			egrep -q "${ERROR_WORDS}" "${TMP}"
			if [ $? -eq 0 ] ; then
				BAD="'${f}' (corrupt file: $(< "${TMP}"))"

			elif [ ${REMOVE_BAD_IMAGES_THRESHOLD_HIGH} -ne 0 ]; then
				# Multiply MEAN by 100 to convert to integer (0-100 %) since
				# bash doesn't work with floats.
				MEAN=$(echo "${MEAN}" | awk '{ printf("%d", $1 * 100); }')
				if [ ${MEAN} -lt ${REMOVE_BAD_IMAGES_THRESHOLD_LOW} -o ${MEAN} -gt ${REMOVE_BAD_IMAGES_THRESHOLD_HIGH} ]; then
					BAD="'${f}' (bad threshold: MEAN=${MEAN}, ok=${REMOVE_BAD_IMAGES_THRESHOLD_LOW} to ${REMOVE_BAD_IMAGES_THRESHOLD_HIGH})"
				fi
			fi
		fi
		if [ "${BAD}" != "" ]; then
			echo "${MSG} ${BAD}" >> "${OUTPUT}"
			[ ${DEBUG} = "false" ] && rm -f "${f}" "thumbnails/${f}"
			let num_bad=num_bad+1
		fi
	done

	if [ $num_bad -eq 0 ]; then
		echo "${ME}: No bad files found."
		rm -f "${OUTPUT}"
	else
		if [ "${FILE}" = "" ]; then
			echo "${ME}: ${num_bad} bad file(s) found and ${MSG}. See ${OUTPUT}."
			# Do NOT remove ${OUTPUT} in case the user wants to look at it.
		else	# only 1 file so show it
			echo "${ME}: File is bad: $(< "${OUTPUT}")"
			rm -f "${OUTPUT}"
		fi
	fi
fi
rm -f "${TMP}"

exit $num_bad
