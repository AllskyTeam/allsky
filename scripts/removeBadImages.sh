#!/bin/bash

# Remove "bad" images, which includes:
#	Empty files
#	Corrupted files (i.e., not an image)
#	Too dark (as specified by user)
#	Too light (as specified by user)

# If a file is specified, only look at that file,
# otherwise look at all the files in the specified directory.
# If only 1 file, return it's MEAN.

# The MEAN is the only thing that should go to stdout.

ME="$( basename "${BASH_ARGV0}" )"

#shellcheck disable=SC1091 source-path=.
source "${ALLSKY_HOME}/variables.sh" 		|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"		|| exit "${EXIT_ERROR_STOP}"
#shellcheck disable=SC1091				# file doesn't exist in GitHub
source "${ALLSKY_CONFIG}/config.sh" 		|| exit "${EXIT_ERROR_STOP}"

usage()
{
	retcode="${1}"
	(
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
	) >&2
	exit "${retcode}"
}
[[ ${1} == "-h" || ${1} == "--help" ]] && usage 0
if [[ ${1} == "-d" || ${1} == "--debug" ]]; then
	DEBUG="true"
	r="would be removed"
	shift
else
	DEBUG="false"
	r="removed"
fi

[[ $# -eq 0 || $# -gt 2 ]] && usage 1

DATE="${1}"
FILE="${2}"

# If we're running in debug mode don't display ${ME} since it makes the output harder to read.
if [[ ${DEBUG} == "true" || ${ON_TTY} -eq 1 ]]; then
	ME=""
else
	ME="${ME}:"
fi

# If it's not a full pathname, assume it's in ${ALLSKY_IMAGES}.
[[ ${DATE:0:1} != "/" ]] && DATE="${ALLSKY_IMAGES}/${DATE}"
if [[ ! -d ${DATE} ]]; then
	echo -e "${RED}${ME} '${DATE}' is not a directory${NC}" >&2
	exit 2
fi

if [[ ${FILE} != "" && ! -f ${DATE}/${FILE} ]]; then
	echo -e "${RED}${ME} '${FILE}' not found in '${DATE}'${NC}" >&2
	exit 2
fi

if [[ $( settings ".takedarkframes" ) -eq 1 ]]; then
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

set +a		# turn off auto-export since ${IMAGE_FILES} might be huge and produce errors

cd "${DATE}" || exit 99
if [[ -n ${FILE} ]]; then
	IMAGE_FILES="${FILE}"
else
	IMAGE_FILES="$( find . -maxdepth 1 -type f -iname "${FILENAME}"-\*."${EXTENSION}" )"
fi
ERROR_WORDS="Huffman|Bogus|Corrupt|Invalid|Trunc|Missing|insufficient image data|no decode delegate|no images defined"

# Reduce writes to disk if possible.  This script is normally called once for each file,
# and most files are good so no output is created and hence no reason to create a temporary
# OUTPUT file.  Only use OUTPUT if we're doing a whole directory at once,
# otherwise put a single file's output in a variable.
if [[ -n ${FILE} ]]; then		# looking at one file
	OUTPUT=""
else							# looking at a directory
	OUTPUT="${ALLSKY_TMP}/removeBadImages.log"
	> "${OUTPUT}"
fi

num_bad=0

# If the LOW threshold is 0 it's disabled.
# If the HIGH threshold is 0 or 100 (nothing can be brighter than 100) it's disabled.
# Convert possibly 0.0 and 100.0 to 0 and 100 so we can check using bash.
HIGH=${REMOVE_BAD_IMAGES_THRESHOLD_HIGH}
[[ $( echo "${HIGH} == 0 || ${HIGH} > 100" | bc ) -eq 1 ]] && HIGH=0
LOW=${REMOVE_BAD_IMAGES_THRESHOLD_LOW}
[[ $( echo "${LOW} <= 0" | bc ) -eq 1 ]] && LOW=0

# If we're processing a whole directory assume it's done in the background so "nice" it.
# If we're only processing one file we want it done quickly.
if [[ ${FILE} == "" ]]; then
		NICE="nice"
else
		NICE=""
fi

for f in ${IMAGE_FILES} ; do
	BAD=""

	if [[ ! -s ${f} ]]; then
		BAD="'${f}' (zero length)"
	else
		if ! MEAN=$(${NICE} convert "${f}" -colorspace Gray -format "%[fx:image.mean]" info: 2>&1) ; then
			# Do NOT set BAD since this isn't necessarily a problem with the file.
			echo -e "${RED}***${ME}: ERROR: 'convert ${f}' failed; leaving file.${NC}" >&2
			echo -e "Message=${MEAN}" >&2
		elif [[ -z ${MEAN} ]]; then
			# Do NOT set BAD since this isn't necessarily a problem with the file.
			echo -e "${RED}***${ME}: ERROR: 'convert ${f}' returned nothing; leaving file.${NC}" >&2
		elif echo "${MEAN}" | grep -E -q "${ERROR_WORDS}"; then
			# At least one error word was found in the output.
			# Get rid of unnecessary error text, and only look at first line of error message.
			BAD="'${f}' (corrupt file: $( echo "${MEAN}" | sed -e 's;convert-im6.q16: ;;' -e 's; @ error.*;;' -e 's; @ warning.*;;' -e q ))"
		else
			# If only one file, output its mean.
			[[ ${FILE} != "" ]] && echo "${MEAN}"

			# MEAN is a number between 0.0 and 1.0, but it may have format:
			#	6.90319e-06
			# which "bc" doesn't accept.
			# LOW and HIGH are from 0 to 100 so first multiple the MEAN by 100
			# to match the LOW and HIGH.
			MEAN=$( echo "${MEAN}" | awk '{ printf("%0.2f", $1 * 100); }' )

			# Since the shell doesn't do floating point math and we want the user to
			# be able to specify up to two digits precision,
			# multiple everything by 100 and convert to integer.
			# Awk handles the "e-" format.
			MEAN_CHECK=$( echo "${MEAN}" | awk '{ printf("%d", $1 * 100); }' )
			HIGH_CHECK=$( echo "${HIGH}" | awk '{ printf("%d", $1 * 100); }' )
			LOW_CHECK=$( echo "${LOW}" | awk '{ printf("%d", $1 * 100); }' )

			MSG=""

			if [[ ${HIGH} != "0" ]]; then		# Use the HIGH check
				if [[ $( echo "${MEAN_CHECK} > ${HIGH_CHECK}" | bc ) -eq 1 ]]; then
					BAD="'${f}' (above threshold: MEAN=${MEAN}, threshold = ${HIGH})"
				elif [[ ${DEBUG} == "true" ]]; then
					MSG="===== OK: ${f}, MEAN=${MEAN}, HIGH=${HIGH}, LOW=${LOW}"
				fi
			fi

			# An image can't be both HIGH and LOW so if it was HIGH don't check for LOW.
			if [[ ${BAD} == "" && ${LOW} != "0" ]]; then
				if [[ $( echo "${MEAN_CHECK} < ${LOW_CHECK}" | bc ) -eq 1 ]]; then
					BAD="'${f}' (below threshold: MEAN=${MEAN}, threshold = ${LOW})"
				elif [[ ${DEBUG} == "true" && ${MSG} == "" ]]; then
					MSG="===== OK: ${f}, MEAN=${MEAN}, HIGH=${HIGH}, LOW=${LOW}"
				fi
			fi

			if [[ ${DEBUG} == "true" && ${BAD} == "" && -n ${MSG} ]]; then
				echo "${MSG}" >&2
			fi
		fi
	fi

	if [[ -n ${BAD} ]]; then
		if [[ -n ${FILE} ]]; then		# looking at one file, save message in variable
			OUTPUT="${r} ${BAD}"
		else							# looking at a directory, save message in tmp file
			echo "${r} ${BAD}" >> "${OUTPUT}"
		fi
		[[ ${DEBUG} == "false" ]] && rm -f "${f}" "thumbnails/${f}"
		((num_bad++))
	fi
done

if [[ ${num_bad} -eq 0 ]]; then
	# If only one file, "no news is good news".
	if [[ -z ${FILE} ]]; then
		echo -e "\n${ME} ${GREEN}No bad files found.${NC}" >&2
		rm -f "${OUTPUT}"
	else
		rm -f "${ALLSKY_BAD_IMAGE_COUNT}"
	fi
else
	if [[ -z ${FILE} ]]; then
		echo "${ME} ${num_bad} bad file(s) found and ${r}. See ${OUTPUT}." >&2
		# Do NOT remove ${OUTPUT} in case the user wants to look at it.
	else	# only 1 file so show it
		echo "${ME} File is bad: ${OUTPUT}" >&2
		echo -e "${OUTPUT}" >> "${ALLSKY_BAD_IMAGE_COUNT}"
		BAD_COUNT="$( wc -l < "${ALLSKY_BAD_IMAGE_COUNT}" )"
		# TODO: make BAD_LIMIT a WebUI setting.
		BAD_LIMIT=3
# echo "xxxxxxxxxx ${BAD_COUNT} bad consecutive images" >&2
		if [[ $((BAD_COUNT % BAD_LIMIT)) -eq 0 ]]; then
			MSG="Multiple bad consecutive bad images."
			MSG="${MSG}\nCheck 'REMOVE_BAD_IMAGES_THRESHOLD_LOW' and 'REMOVE_BAD_IMAGES_THRESHOLD_HIGH' in config.sh"
			"${ALLSKY_SCRIPTS}/addMessage.sh" "warning" "${MSG}" >&2
		fi
		if [[ ${BAD_COUNT} -ge "${BAD_LIMIT}" ]]; then
			# Split the long file name so it fits in the message.
			DIR="$( dirname "${ALLSKY_BAD_IMAGE_COUNT}" )"
			FILE="$( basename "${ALLSKY_BAD_IMAGE_COUNT}" )"

			"${ALLSKY_SCRIPTS}/generate_notification_images.sh" \
				--directory "${ALLSKY_TMP}" \
				"${FILENAME}" "yellow" "" "85" "" "" \
	 			"" "5" "yellow" "${EXTENSION}" "" \
				"WARNING:\n${BAD_COUNT} consecutive\nbad images. See:\n${DIR}/\n  ${FILE}" >&2

		fi

	fi
fi

if [[ ${num_bad} -eq 0 ]]; then
	exit 0
else
	exit 99		# "99" means we deleted at least one file.
fi

