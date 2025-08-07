#!/bin/bash

# Remove "bad" images, which includes:
#	Empty files
#	Corrupted files (i.e., not an image)
#	Too dark (as specified by user)
#	Too light (as specified by user)

# If a file is specified, only look at that file,
# otherwise look at all the files in the specified directory.

ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh" 		|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"		|| exit "${EXIT_ERROR_STOP}"

usage_and_exit()
{
	local RET="${1}"
	exec >&2
	echo
	echo "Remove images with corrupt data which might mess up startrails, keograms, and timelapse."
	echo
	local MSG="Usage: ${ME} [--help] [--debug]  directory  [file]"
	if [[ "${RET}" -ne 0 ]]; then
		E_ "${MSG}"
	else
		echo -e "${MSG}"
	fi
	echo
	echo "Turning on debug will indicate bad images but will not remove them."
	echo "If 'file' is specified, only that file in 'directory' will be checked,"
	echo "otherwise all files in 'directory' will be checked."

	exit "${RET}"
}

OK="true"
DO_HELP="false"
DEBUG="false"
r="removed"

while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
			--help)
				DO_HELP="true"
				;;
			--debug)
				DEBUG="true"
				r="would be removed"
				;;
			-*)
				E_ "${ME}: Unknown argument '${ARG}'." >&2
				OK="false"
				;;
			*)
				break
				;;
	esac
	shift
done
[[ ${DO_HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" ]] && usage_and_exit 1
[[ $# -eq 0 || $# -gt 2 ]] && usage_and_exit 1

DIRECTORY="${1}"
FILE="${2}"

# If we're running in debug mode don't display ${ME} since it makes the output harder to read.
if [[ ${DEBUG} == "true" || ${ON_TTY} == "true" ]]; then
	ME=""
else
	ME="${ME}:"
fi

# If it's not a full pathname, assume it's in ${ALLSKY_IMAGES}.
[[ ${DIRECTORY:0:1} != "/" ]] && DIRECTORY="${ALLSKY_IMAGES}/${DIRECTORY}"
if [[ ! -d ${DIRECTORY} ]]; then
	E_ "${ME} '${DIRECTORY}' is not a directory." >&2
	exit 2
fi

if [[ ${FILE} != "" && ! -f ${DIRECTORY}/${FILE} ]]; then
	E_ "${ME} '${FILE}' not found in '${DIRECTORY}'." >&2
	exit 2
fi

HIGH="$( settings ".imageremovebadhigh" )"
LOW="$( settings ".imageremovebadlow" )"
if [[ $( settings ".takedarkframes" ) == "true" ]]; then
	# Disable low brightness check since darks will have extremely low brightness.
	# Set the high value to something a dark frame should never get to.
	LOW=0.00000
	HIGH=0.10000	# 10%
fi
# TODO: make BAD_LIMIT a WebUI setting.
BAD_LIMIT=5

# Find the full size image-*jpg and image-*png files (not the thumbnails) and
# have "convert" compute a histogram in order to capture any error messages and determine
# if the image is too dim or too bright.
# If an image DOES produce an error message grep will match it and the file will be deleted.

# Doing this allows good startrails and keograms to be produced on machines that
# sometimes produce corrupt or zero-length files.

# Use IMAGE_FILES and ERROR_WORDS to avoid duplicating those strings.
# ${DIRECTORY} may end in a "/" so there will be "//" in the filenames, but there's no harm in that.

set +a		# turn off auto-export since ${IMAGE_FILES} might be huge and produce errors

cd "${DIRECTORY}" || exit "${EXIT_ERROR_STOP}"

# If the LOW threshold is 0 or < 0 it's disabled.
# If the HIGH threshold is 0 or 1.0 (nothing can be brighter than 1.0) it's disabled.
if gawk -v l="${LOW}" -v h="${HIGH}" 'BEGIN {
		if (l < 0) l=0;
		if (h > 1) h=0;
		if ((l + h) == 0) {
			exit 0;
		} else {
			exit 1;
		}
	}' ; then
	# Both are 0 so no checking needed.
	exit 0
fi

if [[ -n ${FILE} ]]; then
	IMAGE_FILES="${FILE}"
else
	IMAGE_FILES="$( find . -maxdepth 1 -type f -iname "${ALLSKY_FILENAME}"-\*."${ALLSKY_EXTENSION}" )"
fi

ERROR_WORDS="Huffman|Bogus|Corrupt|Invalid|Trunc|Missing"
ERROR_WORDS+="|insufficient image data|no decode delegate|no images defined"

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

# If we're processing a whole directory assume it's done in the background so "nice" it.
# If we're only processing one file we want it done quickly.
if [[ -z ${FILE} ]]; then
		NICE="nice"
else
		NICE=""
fi

for f in ${IMAGE_FILES} ; do
	BAD=""

	if [[ ! -s ${f} ]]; then
		BAD="'${f}' (zero length)"
	else
		if [[ -n ${AS_MEAN} ]]; then
			MEAN="${AS_MEAN/,/.}"		# single image: mean passed to us.  Allow commas
		elif ! MEAN=$( ${NICE} convert "${f}" -colorspace Gray -format "%[fx:image.mean]" info: 2>&1 ) ; then
			# Do NOT set BAD since this isn't necessarily a problem with the file.
			E_ "***${ME} ERROR: 'convert ${f}' failed; leaving file." >&2
			echo -e "Message=${MEAN}" >&2
			continue
		fi
		if [[ -z ${MEAN} ]]; then
			# Do NOT set BAD since this isn't necessarily a problem with the file.
			E_ "***${ME} ERROR: 'convert ${f}' returned nothing; leaving file." >&2
			continue
		fi

		if echo "${MEAN}" | grep -E --quiet "${ERROR_WORDS}"; then
			# At least one error word was found in the output.
			# Get rid of unnecessary error text, and only look at first line of error message.
			BAD="'${f}' (corrupt file: "
			BAD+="$( echo "${MEAN}" | sed -e 's;convert-im6.q16: ;;' -e 's; @ error.*;;' -e 's; @ warning.*;;' -e q ))"
			continue

		else
			# MEAN is a number between 0.0 and 1.0, but it may have format:
			#	6.90319e-06
			# which "bc" doesn't accept so use gawk.
			# LOW and HIGH are also between 0.0 and 1.0.

			# Since the shell doesn't do floating point math and we want up to
			# 5 digits precision, multiple everything by 100000 and convert to integer.
			# We can then use bash math with the *_CHECK values.
			# Awk handles the "e-" format.
			MEAN_CHECK=$( gawk -v x="${MEAN}" 'BEGIN { printf("%d", x * 100000); }' )
			HIGH_CHECK=$( gawk -v x="${HIGH}" 'BEGIN { printf("%d", x * 100000); }' )
			LOW_CHECK=$(  gawk -v x="${LOW}"  'BEGIN { printf("%d", x * 100000); }' )

			if [[ ${DEBUG} == "true" ]]; then
				MSG="${ME} ${FILE}: MEAN=${MEAN}, MEAN_CHECK=${MEAN_CHECK},"
				MSG+=" LOW_CHECK=${LOW_CHECK}, HIGH_CHECK=${HIGH_CHECK}"
				D_ "${MSG}"
			fi
			MSG=""
			if [[ ${HIGH_CHECK} -ne 0 ]]; then
				if [[ ${MEAN_CHECK} -gt ${HIGH_CHECK} ]]; then
					BAD="'${f}' (MEAN of ${MEAN} is above high threshold of ${HIGH})"
				elif [[ ${DEBUG} == "true" ]]; then
					MSG="===== OK: ${f}, MEAN=${MEAN}, HIGH=${HIGH}, LOW=${LOW}"
				fi
			fi

			# An image can't be both HIGH and LOW so if it was HIGH don't check for LOW.
			if [[ -z ${BAD} && ${LOW_CHECK} -ne 0 ]]; then
				if [[ ${MEAN_CHECK} -lt ${LOW_CHECK} ]]; then
					BAD="'${f}' (MEAN of ${MEAN} is below low threshold of ${LOW})"
				elif [[ ${DEBUG} == "true" && -z ${MSG} ]]; then
					MSG="===== OK: ${f}, MEAN=${MEAN}, HIGH=${HIGH}, LOW=${LOW}"
				fi
			fi

			if [[ ${DEBUG} == "true" && -z ${BAD} && -n ${MSG} ]]; then
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
		O_ "\n${ME} N}No bad files found." >&2
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
		if [[ $((BAD_COUNT % BAD_LIMIT)) -eq 0 ]]; then
			MSG="Multiple consecutive bad images."
			MSG+="\nClick <a external='true' href='/execute.php?ID=AM_ALLSKY_CONFIG bad_images_info --html'>here</a> to see a summary."
			"${ALLSKY_SCRIPTS}/addMessage.sh" --type warning --msg "${MSG}" >&2
		fi
		if [[ ${BAD_COUNT} -ge "${BAD_LIMIT}" ]]; then
			# Split the long file name so it fits in the message.
			DIR="$( dirname "${ALLSKY_BAD_IMAGE_COUNT}" )"
			FILE="$( basename "${ALLSKY_BAD_IMAGE_COUNT}" )"

			"${ALLSKY_SCRIPTS}/generateNotificationImages.sh" \
				--directory "${ALLSKY_TMP}" \
				"${ALLSKY_FILENAME}" "yellow" "" "85" "" "" \
	 			"" "5" "yellow" "${ALLSKY_EXTENSION}" "" \
				"WARNING:\n${BAD_COUNT} consecutive\nbad images. See:\n${DIR}/\n  ${FILE}" >&2
		fi
	fi
fi

if [[ ${num_bad} -eq 0 ]]; then
	exit 0
else
	exit "${EXIT_PARTIAL_OK}"		# partially ok because we deleted at least one file.
fi

