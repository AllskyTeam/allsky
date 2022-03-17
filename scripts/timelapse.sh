#!/bin/bash

# Remove this line when we know it is in config.sh
PIX_FMT="${PIX_FMT:-yuv420p}"

# Allow this script to be executed manually, which requires ALLSKY_HOME to be set.
if [ -z "${ALLSKY_HOME}" ] ; then
	ALLSKY_HOME="$(realpath $(dirname "${BASH_ARGV0}")/..)"; export ALLSKY_HOME
fi

source "${ALLSKY_HOME}/variables.sh"
source "${ALLSKY_CONFIG}/config.sh"

ME="$(basename "${BASH_ARGV0}")"

if [ $# -eq 0 ] || [ $# -gt 2 ] || [ "${1}" = "-h" ] || [ "${1}" = "--help" ] ; then
	XD="/path/to/nonstandard/location/of/allsky_images"
	TODAY="$(date +%Y%m%d)"
	echo -en "${RED}"
	echo -n "Usage: ${ME} [-h|--help] <DATE> [<IMAGE_DIR>]"
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
	echo -en "${NC}"
	exit 1
fi

# If we're on a tty that means we're being manually run so don't display $ME.
[ "${ON_TTY}" = "1" ] && ME=""

# Allow timelapses of pictures not in the standard $ALLSKY_IMAGES directory.
# If $2 is passed, it's the top folder, otherwise use the one in $ALLSKY_IMAGES.
DATE="${1}"
if [ "${2}" = "" ] ; then
	DATE_DIR="${ALLSKY_IMAGES}/${DATE}"	# Need full pathname for links
else
	DATE_DIR="${2}/${DATE}"
fi
if [ ! -d "${DATE_DIR}" ]; then
	echo -e "${RED}*** ${ME}: ERROR: '${DATE_DIR}' does not exist!${NC}"
	exit 2
fi

# If you are tuning encoder settings, run this script with KEEP_SEQUENCE, eg.
#	$ env KEEP_SEQUENCE=true VCODEC=h264_nvenc ~/allsky/scripts/timelapse.sh ${TODAY} /media/external/allsky/${TODAY}/
# to keep the sequence directory from being deleted and to reuse the contents
# of the sequence directory if it looks ok (contains at least 100 files). This
# might save you some time when running your encoder repeatedly.

# To save on writes to SD card for people who have $ALLSKY_TMP as a memory filesystem,
# put the sequence files there.
SEQUENCE_DIR="${ALLSKY_TMP}/sequence-${DATE}"
if [ -d "${SEQUENCE_DIR}" ]; then
	NSEQ=$(find "${SEQUENCE_DIR}/*" 2>/dev/null | wc -l)	# left over from last time
else
	NSEQ=0
fi

TMP="${ALLSKY_TMP}/timelapseTMP.txt"
: > "${TMP}"

if [ "${KEEP_SEQUENCE}" = "false" ] || [ ${NSEQ} -lt 100 ]; then
	rm -fr "${SEQUENCE_DIR}"
	mkdir -p "${SEQUENCE_DIR}"

	# capture the "ln" commands in case the user needs to debug
	ls -rt "${DATE_DIR}"/*.${EXTENSION} |
	gawk 'BEGIN { a=0; }
		{
			a++;
			printf "ln -s %s '${SEQUENCE_DIR}'/%04d.'${EXTENSION}'\n", $0, a;
		}
		END { if (a > 0) printf("Processed %d images\n", a) > "'${TMP}'"; }' |
	bash

	# Make sure there's at least one link.  If there is, the file will be > 0 bytes.
	if [ ! -s "${TMP}" ]; then
		echo -e "${RED}*** ${ME}: ERROR: No images found!${NC}"
		rmdir "${SEQUENCE_DIR}"
		exit 1
	fi
else
	echo -e "${ME}: ${YELLOW}Not regenerating sequence because KEEP_SEQUENCE was given and ${NSEQ} links are present ${NC}"
fi

SCALE=""
if [ "${TIMELAPSEWIDTH}" != 0 ]; then
	SCALE="-filter:v scale=${TIMELAPSEWIDTH}:${TIMELAPSEHEIGHT}"
fi

# "-loglevel warning" gets rid of the dozens of lines of garbage output
# but doesn't get rid of "deprecated pixel format" message when -pix_ftm is "yuv420p".
# set FFLOG=info in config.sh if you want to see what's going on for debugging.
OUTPUT_FILE="${DATE_DIR}/allsky-${DATE}.mp4"
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
echo "${X}" | grep -v "deprecated pixel format used" >> "${TMP}"

if [ ${RET} -ne -0 ]; then
	echo -e "\n${RED}*** $ME: ERROR: ffmpeg failed."
	echo "Error log is in '${TMP}'."
	echo
	echo "Links in '${SEQUENCE_DIR}' left for debugging."
	echo -e "Remove them when the problem is fixed.${NC}\n"
	rm -f "${OUTPUT_FILE}"	# don't leave around to confuse user
	exit 1
fi
[ "${FFLOG}" = "info" ] && cat "${TMP}"	 # if the user wants output, give it to them...

if [ "${KEEP_SEQUENCE}" = "false" ] ; then
	rm -rf "${SEQUENCE_DIR}"
else
	echo -e "${ME}: ${GREEN}Keeping sequence${NC}"
fi

# timelapse is uploaded via generateForDay.sh or endOfNight.sh, which called us.

exit 0
