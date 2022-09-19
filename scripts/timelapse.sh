#!/bin/bash

# Allow this script to be executed manually, which requires ALLSKY_HOME to be set.
if [ -z "${ALLSKY_HOME}" ] ; then
	ALLSKY_HOME="$(realpath "$(dirname "${BASH_ARGV0}")/..")"
	export ALLSKY_HOME
fi

source "${ALLSKY_HOME}/variables.sh"
source "${ALLSKY_CONFIG}/config.sh"

ME="$(basename "${BASH_ARGV0}")"

DEBUG="false"
DO_HELP="false"
MINI_COUNT=0
MINI_SUBTRACT=0
FORCE_MINI="false"
CURRENT_IMAGE=""
while [ $# -gt 0 ]; do
	case "${1}" in
			-h | --help)
				DO_HELP="true"
				;;
			-d | --debug)
				DEBUG="true"
				;;
			-m | --mini-count)
				# Create a "mini" timelapse of the ${MINI_COUNT} most recent images.
				MINI_COUNT="${2}"
				MINI_SUBTRACT="${3}"	# Subtract this many images from the list.
				shift 2
				;;
			-f | --force)
				FORCE_MINI="true"
				;;
			-i | --image)
				CURRENT_IMAGE="${2}"
				shift
				;;
			-*)
				echo -e "${RED}Unknown argument '${1}' ignoring.${NC}" >&2
				DO_HELP="true"
				;;
			*)
				break
				;;
	esac
	shift
done

usage_and_exit()
{
	RET=$1
	XD="/path/to/nonstandard/location/of/allsky_images"
	TODAY="$(date +%Y%m%d)"
	[ ${RET} -ne 0 ] && echo -en "${RED}"
	echo -n "Usage: ${ME} [-d] [-h|--help] [-m|M number_images subtracts [-i image] [-f]]  <DATE> [<IMAGE_DIR>]"
	echo -e "${NC}"
	echo "    example: ${ME} ${TODAY}"
	echo "    or:      ${ME} ${TODAY} ${XD}"
	echo
	echo -en "${YELLOW}"
	echo "<DATE> must be of the form YYYYMMDD."
	echo
	echo "<IMAGE_DIR> defaults to '\${ALLSKY_IMAGES}' but may be overridden to use a"
	echo "nonstandard location such as a usb stick or a network drive (eg. for regenerating timelapses)."
	echo "In that case <DATE> must exist inside <IMAGE_DIR>,"
	echo "eg. '${XD}/${TODAY}'."
	echo
	echo "Produces a movie in <IMAGE_DIR>/<DATE>/allsky-<DATE>.mp4"
	echo "eg. ${ALLSKY_IMAGES}/${TODAY}/allsky-${TODAY}.mp4"
	echo "or  ${XD}/${TODAY}/allsky-${TODAY}.mp4"
	echo
	echo "[-m number_images subtracts] creates a mini-timelapse of the newest 'number_images' images and removes the oldest 'subtract' images."
	echo "[-f] forces creation of the mini-timelapse, typically for command-line use."
	echo "[-i image] is the full path to the current image."
	echo -en "${NC}"
	exit ${RET}
}
[ $# -eq 0 ] || [ $# -gt 2 ] && usage_and_exit 1
[ "${DO_HELP}" = "true" ] && usage_and_exit 0

# If we're on a tty that means we're being manually run so don't display ${ME}.
if [ "${ON_TTY}" = "1" ]; then
	   ME=""
else
	   ME="${ME}:"
fi

# XXXXXX TODO: if in MINI mode, only allow one process at a time.

# Allow timelapses of pictures not in the standard $ALLSKY_IMAGES directory.
# If $2 is passed, it's the top folder, otherwise use the one in $ALLSKY_IMAGES.
DATE="${1}"
if [ "${2}" = "" ] ; then
	DATE_DIR="${ALLSKY_IMAGES}/${DATE}"	# Need full pathname for links
else
	DATE_DIR="${2}/${DATE}"
fi
if [ ! -d "${DATE_DIR}" ]; then
	echo -e "${RED}*** ${ME} ERROR: '${DATE_DIR}' does not exist!${NC}"
	exit 2
fi

# To save on writes to SD card for people who have $ALLSKY_TMP as a memory filesystem,
# put the sequence files there.
SEQUENCE_DIR="${ALLSKY_TMP}/sequence-${DATE}"
if [ -d "${SEQUENCE_DIR}" ]; then
	NSEQ=$(find "${SEQUENCE_DIR}/*" 2>/dev/null | wc -l)	# left over from last time
else
	NSEQ=0
fi

TMP="${ALLSKY_TMP}/timelapseTMP.txt"
[ ${MINI_COUNT} -eq 0 ] && : > "${TMP}"

if [[ ${KEEP_SEQUENCE} == "false" || ${NSEQ} -lt 100 ]]; then
	rm -fr "${SEQUENCE_DIR}"
	mkdir -p "${SEQUENCE_DIR}"

	# capture the "ln" commands in case the user needs to debug
	(
		if [ ${MINI_COUNT} -eq 0 ]; then
			ls -rt "${DATE_DIR}"/*.${EXTENSION}
			exit 0		# Gets us out of this sub-shell
		fi

		if [[ ${FORCE_MINI} == "true" ]]; then
			[[ ${DEBUG} == "true" ]] && echo "Forcing mini-timelapse" >&2
			FILES="$(ls -rt "${DATE_DIR}"/image-*.${EXTENSION} | tail -${MINI_COUNT})"
			echo "${FILES}"

			# Let the user know if there aren't as many images as desired.
			NUM_IMAGES=$(echo "${FILES}" | wc -l)
			[ ${NUM_IMAGES} -lt ${MINI_COUNT} ] && echo "INFO: Only ${NUM_IMAGES} are being used." >&2

			exit 0		# Gets us out of this sub-shell
		fi

		if [ "${CURRENT_IMAGE}" = "" ]; then
			# This can be slow if there are a lot of images.  Hopefully CURRENT_IMAGE is passed in.
			CURRENT_IMAGE="$(ls -rt "${DATE_DIR}"/image-*.${EXTENSION} | tail -1)"
		fi

		MINI_TIMELAPSE_FILES="${ALLSKY_TMP}/mini-timelapse_files.txt"
		if [ -f "${MINI_TIMELAPSE_FILES}" ]; then
			# If we haven't gotten to the minimum number of images, don't create the mini timelapse.
			FILES="$(< "${MINI_TIMELAPSE_FILES}")"
			NUM_IMAGES=$(echo "${FILES}" | wc -l)
			# If the CURRENT_IMAGE isn't in the list, add it.
			if [ ${NUM_IMAGES} -ge ${MINI_COUNT} ] ; then
				echo "${FILES}"
				x="$(tail -$((MINI_COUNT-MINI_SUBTRACT)) "${MINI_TIMELAPSE_FILES}")"
				# Remove the oldest image(s) and append the CURRENT_IMAGE.
				echo -e "${x}\n${CURRENT_IMAGE}" > "${MINI_TIMELAPSE_FILES}"
				if [[ ${DEBUG} == "true" ]]; then
					echo -e "${YELLOW}Replacing oldest file(s) in set and adding '${CURRENT_IMAGE}'.${NC}" >&2
				fi
			else
				grep --silent "${CURRENT_IMAGE}" "${MINI_TIMELAPSE_FILES}"
				RET=$?
				OK="false"
				if [ ${RET} -ne 0 ]; then
					echo "${CURRENT_IMAGE}" >> "${MINI_TIMELAPSE_FILES}"
					NUM_IMAGES=$((NUM_IMAGES+1))
					if [ ${NUM_IMAGES} -ge ${MINI_COUNT} ] ; then
						[[ ${DEBUG} == "true" ]] && echo -e "${GREEN}Just reached enough images.${NC}" >&2
						OK="true"
						cat "${MINI_TIMELAPSE_FILES}"
					fi
				elif [[ ${DEBUG} == "true" ]]; then
					echo -e "${YELLOW}'${CURRENT_IMAGE}' already in set.${NC}" >&2
				fi
				if [[ ${OK} == "false" && ${DEBUG} == "true" ]]; then
					echo -e "\n${YELLOW}Not creating mini-timelapse yet; only ${NUM_IMAGES} of ${MINI_COUNT} images ready.${NC}\n" >&2
				fi
			fi
		else
			# Create the file with the most recent image.
			[[ ${DEBUG} == "true" ]] && echo "Creating ${MINI_TIMELAPSE_FILES}" >&2
			echo "${CURRENT_IMAGE}" > "${MINI_TIMELAPSE_FILES}"
		fi
	) | gawk -v MINI_COUNT=${MINI_COUNT} 'BEGIN { a=0; }
		{
			a++;
			printf "ln -s %s '${SEQUENCE_DIR}'/%04d.'${EXTENSION}'\n", $0, a;
		}
		END {
			# If we are in "mini" mode, tell bash to exit 1 so we do not have to create a temporary file.
			if (a > 0 && MINI_COUNT > 0) {
				printf("exit 1");		# avoids creating ${TMP} for MINI timelapse
			} else if (a > 0) {
				printf("Processed %d images\n", a) > "'${TMP}'";
				printf("exit 0");
			} else {		# either a == 0 or in MINI mode
				printf("exit 2");		# error - no images found
			}

		}' \
	| bash
	RET=$?

	# If bash exited with 0 then there are images and we're not in MINI mode.
	# If bash exited with 1 we're in MINI mode; we exit 1 in MINI mode to avoid
	# If bash exited with 2 no images were found.
	# In MINI mode that's ok (but exit with 1 so the invoker knows we didn't create a timelapse).
	if [ ${RET} -eq 2 ]; then
		if [ ${MINI_COUNT} -eq 0 ]; then
			echo -e "${RED}*** ${ME} ERROR: No images found!${NC}"
			rm -fr "${SEQUENCE_DIR}"
		fi
		exit 1
	fi
else
	echo -e "${ME} ${YELLOW}Not regenerating sequence because KEEP_SEQUENCE was given and ${NSEQ} links are present ${NC}"
fi

SCALE=""

# "-loglevel warning" gets rid of the dozens of lines of garbage output
# but doesn't get rid of "deprecated pixel format" message when -pix_ftm is "yuv420p".
# set FFLOG=info in config.sh if you want to see what's going on for debugging.
if [ ${MINI_COUNT} -eq 0 ]; then
	OUTPUT_FILE="${DATE_DIR}/allsky-${DATE}.mp4"
	if [ "${TIMELAPSEWIDTH}" != 0 ]; then
		SCALE="-filter:v scale=${TIMELAPSEWIDTH}:${TIMELAPSEHEIGHT}"
	fi
else
	OUTPUT_FILE="${ALLSKY_TMP}/mini-timelapse.mp4"
	FPS="${TIMELAPSE_MINI_FPS}"
	TIMELAPSE_BITRATE="${TIMELAPSE_MINI_BITRATE}"
	if [ "${TIMELAPSE_MINI_WIDTH}" != 0 ]; then
		SCALE="-filter:v scale=${TIMELAPSE_MINI_WIDTH}:${TIMELAPSE_MINI_HEIGHT}"
	fi
fi
X="$(ffmpeg -y -f image2 \
	-loglevel ${FFLOG} \
	-r ${FPS} \
	-i "${SEQUENCE_DIR}/%04d.${EXTENSION}" \
	-vcodec ${VCODEC} \
	-b:v ${TIMELAPSE_BITRATE} \
	-pix_fmt ${PIX_FMT} \
	-movflags +faststart \
	$SCALE \
	${TIMELAPSE_EXTRA_PARAMETERS} \
	"${OUTPUT_FILE}" 2>&1)"
RET=$?

# The "deprecated..." message is useless and only confuses users, so hide it.
X="$(echo "${X}" | grep -v "deprecated pixel format used")"
[ "${X}" != "" ] && echo "${X}" >> "${TMP}"		# a warning/error message

if [ ${RET} -ne -0 ]; then
	echo -e "\n${RED}*** $ME: ERROR: ffmpeg failed."
	echo "Error log is in '${TMP}'."
	echo
	echo "Links in '${SEQUENCE_DIR}' left for debugging."
	echo -e "Remove them when the problem is fixed.${NC}\n"
	rm -f "${OUTPUT_FILE}"	# don't leave around to confuse user
	exit 1
fi
[ "${FFLOG}" = "info" ] && [ ${MINI_COUNT} -eq 0 ] && cat "${TMP}"	 # if the user wants output, give it to them

if [ "${KEEP_SEQUENCE}" = "false" ] ; then
	rm -rf "${SEQUENCE_DIR}"
else
	echo -e "${ME} ${GREEN}Keeping sequence${NC}"
fi

# timelapse is uploaded via generateForDay.sh (usually via endOfNight.sh), which called us.

[[ ${DEBUG} == "true" ]] && echo -e "${ME}${GREEN}Timelapse in ${OUTPUT_FILE}${NC}"

exit 0
