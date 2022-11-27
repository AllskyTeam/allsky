#!/bin/bash

# Allow this script to be executed manually, which requires ALLSKY_HOME to be set.
if [ -z "${ALLSKY_HOME}" ] ; then
	ALLSKY_HOME="$(realpath "$(dirname "${BASH_ARGV0}")/..")"
	export ALLSKY_HOME
fi

source "${ALLSKY_HOME}/variables.sh"
source "${ALLSKY_CONFIG}/config.sh"

ME="$(basename "${BASH_ARGV0}")"

DEBUG=0
DO_HELP="false"
DO_MINI="false"
MINI_FILE=""
while [ $# -gt 0 ]; do
	case "${1}" in
			-h | --help)
				DO_HELP="true"
				;;
			-d | --debug)
				((DEBUG=DEBUG+1))
				;;
			-m | --mini)
				DO_MINI="true"
				MINI_FILE="${2}"
				shift
				;;
			-*)
				echo -e "${RED}${ME}: Unknown argument '${1}' ignoring.${NC}" >&2
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
	echo -n "Usage: ${ME} [--debug] [--help] [--mini mini_file]  <DATE> [<IMAGE_DIR>]"
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
	echo "[--mini mini_file] creates a mini-timelapse using the images listed in 'mini-file'."
	echo -en "${NC}"
	exit ${RET}
}
[[ $# -eq 0 ||  $# -gt 2 ]] && usage_and_exit 1
[[ ${DO_HELP} == "true" ]] && usage_and_exit 0

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
[[ ${DO_MINI} == "false"  ]] && : > "${TMP}"		# Only create when NOT doing mini-timelapses

if [[ ${KEEP_SEQUENCE} == "false" || ${NSEQ} -lt 100 ]]; then
	rm -fr "${SEQUENCE_DIR}"
	mkdir -p "${SEQUENCE_DIR}"

	# capture the "ln" commands in case the user needs to debug
	(
		if [[ ${DO_MINI} == "false" ]]; then
			# Doing daily, full timelapse
			ls -rt "${DATE_DIR}"/*.${EXTENSION}
			exit 0		# Gets us out of this sub-shell
		fi

		if [ -f "${MINI_FILE}" ]; then
			cat "${MINI_FILE}"
		else
			echo "${ME} WARNING: No '${MINI_FILE}' file" >&2
			# Do not pass anything to gawk
		fi
	) | gawk -v DO_MINI=${DO_MINI} 'BEGIN { a=0; }
		{
			a++;
			printf "ln -s %s '${SEQUENCE_DIR}'/%04d.'${EXTENSION}'\n", $0, a;
		}
		END {
			# If we are in "mini" mode, tell bash to exit 1 so we do not have to create a temporary file.
			if (a > 0 && DO_MINI == "true") {
				printf("exit 1");		# avoids creating ${TMP} for MINI timelapse
			} else if (a > 0) {
				printf("Processed %d images\n", a) > "'${TMP}'";
				printf("exit 0");
			} else {		# either a == 0 or in MINI mode
				printf("exit 2");		# no, or not enough, images found
			}

		}' \
	| bash
	RET=$?

	# If bash exited with 0 then there are images and we're not in MINI mode.
	# If bash exited with 1 we're in MINI mode; we exit 1 in MINI mode to avoid
	# If bash exited with 2 no images were found.
	# In MINI mode that's ok (but exit with 1 so the invoker knows we didn't create a timelapse).
	if [ ${RET} -eq 2 ]; then
		if [[ ${DO_MINI} == "false" ]]; then
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
if [[ ${DO_MINI} == "false" ]]; then
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
[[ ${FFLOG} == "info" && ${DO_MINI} == "false"  ]] && cat "${TMP}"	 # if the user wants output, give it to them

if [ "${KEEP_SEQUENCE}" = "false" ] ; then
	rm -rf "${SEQUENCE_DIR}"
else
	echo -e "${ME} ${GREEN}Keeping sequence${NC}"
fi

# timelapse is uploaded via generateForDay.sh (usually via endOfNight.sh), which called us.

[[ ${DEBUG} -ge 2 ]] && echo -e "${ME}${GREEN}Timelapse in ${OUTPUT_FILE}${NC}"

exit 0
