#!/bin/bash

# Allow this script to be executed manually, which requires ALLSKY_HOME to be set.
if [ -z "${ALLSKY_HOME}" ] ; then
	export ALLSKY_HOME="$(realpath $(dirname "${BASH_ARGV0}")/..)"
fi

source "${ALLSKY_HOME}/variables.sh"
source "${ALLSKY_CONFIG}/config.sh"
source "${ALLSKY_SCRIPTS}/filename.sh"
source "${ALLSKY_CONFIG}/ftp-settings.sh"

ME="$(basename "${BASH_ARGV0}")"

cd $ALLSKY_HOME

if [ $# -lt 1 -o $# -gt 2 -o "${1}" = "-h" -o "${1}" = "--help" ] ; then
	TODAY=$(date +%Y%m%d)
	echo -en "${RED}"
	echo -n "Usage: ${ME} [--help]  DATE  [directory]"
	echo -e "${NC}"
	echo "    example: ${ME} ${TODAY}"
	echo "    or:      ${ME} ${TODAY} /media/external/allsky"
	echo -en "${YELLOW}"
	echo "'DATE' must be in '${ALLSKY_IMAGES}' unless 'directory' is specified,"
	echo "in which case 'DATE' must bin in 'directory', i.e., 'directory/DATE'."
	echo -en "${NC}"
	exit 1
fi

# Allow timelapses of pictures not in the standard ALLSKY_IMAGES directory.
# If $2 is passed, it's the top folder, otherwise use the one in ALLSKY_IMAGES.
DATE="${1}"
if [ "${2}" = "" ] ; then
	DATE_DIR="${ALLSKY_IMAGES}/${DATE}"	# Need full pathname for links
else
	DATE_DIR="${2}/${DATE}"
fi

# Guess what the likely image extension is (unless specified in the config) by
# looking at the most common extension in the target day directory
if [ -z "${EXTENSION}" ] ; then
	EXTENSION=$(ls "${DATE_DIR}" | sed -e 's/.*[.]//' | sort | uniq -c | head -1 | sed -e 's/.* //')
	echo -en "${YELLOW}"
	echo -n "${ME}: file EXTENSION not found in configuration, guessing ${EXTENSION}"
	echo -e "${NC}"
fi

# If you are tuning encoder settings, run this script with KEEP_SEQUENCE, eg.
#	$ env KEEP_SEQUENCE=1 VCODEC=h264_nvenc ~/allsky/scripts/timelapse.sh ${TODAY} /media/external/allsky/${TODAY}/
# to keep the sequence directory from being deleted and to reuse the contents
# of the sequence directory if it looks ok (contains at least 100 files). This
# might save you some time when running your encoder repeatedly.

SEQUENCE_DIR="${DATE_DIR}/sequence"
NSEQ=$(ls "${SEQUENCE_DIR}" 2>/dev/null | wc -l )
if [ -z "$KEEP_SEQUENCE" -o $NSEQ -lt 100 ] ; then
	rm -fr "${SEQUENCE_DIR}"
	mkdir -p "${SEQUENCE_DIR}"

	# Delete any 0=length files
	find "${DATE_DIR}" -name "*.${EXTENSION}" -size 0 -delete

	# capture the "ln" commands in case the user needs to debug
	mkdir -p "${ALLSKY_TMP}"
	TMP="${ALLSKY_TMP}/timelapseTMP.txt"
	> "${TMP}"
	ls -rt "${DATE_DIR}"/*.${EXTENSION} |
	gawk 'BEGIN{ a=1 }
		{
			printf "ln -s %s '${SEQUENCE_DIR}'/%04d.'${EXTENSION}'\n", $0, a;
			printf "ln -s %s '${SEQUENCE_DIR}'/%04d.'${EXTENSION}'\n", $0, a >> "'${TMP}'";
			a++;
		}' |
	bash

	# Make sure there's at least one link.
	NUM_FILES=$(wc -l < "${TMP}")
	if [ $NUM_FILES -eq 0 ]; then
		echo -en "${RED}*** ${ME}: ERROR: No images found!${NC}\n"
		rmdir "${SEQUENCE_DIR}"
		exit 1
	else
		echo "${ME}: Processing ${NUM_FILES} images..."
	fi
else
	echo -en "${ME}: ${YELLOW}Not regenerating sequence because KEEP_SEQUENCE was given and $NSEQ links are present ${NC}\n"
fi

SCALE=""
TIMELAPSEWIDTH=${TIMELAPSEWIDTH:-0}
TIMELAPSEHEIGHT=${TIMELAPSEHEIGHT:-0}
if [ "${TIMELAPSEWIDTH}" != 0 ]; then
	SCALE="-filter:v scale=${TIMELAPSEWIDTH}:${TIMELAPSEHEIGHT}"
	echo "$ME: Using video scale ${TIMELAPSEWIDTH}x${TIMELAPSEHEIGHT}"
fi

# "-loglevel warning" gets rid of the dozens of lines of garbage output
# but doesn't get rid of "deprecated pixel format" message when -pix_ftm is "yuv420p".
# set FFLOG=info in config.sh if you want to see what's going on for debugging.
OUTPUT_FILE="${DATE_DIR}/allsky-${DATE}.mp4"
ffmpeg -y -f image2 \
	-loglevel ${FFLOG:-warning} \
	-r ${FPS:-25} \
	-i ${SEQUENCE_DIR}/%04d.${EXTENSION} \
	-vcodec ${VCODEC:-libx264} \
	-b:v ${TIMELAPSE_BITRATE:-2000k} \
	-pix_fmt ${PIX_FMT:-yuv420p} \
	-movflags +faststart \
	$SCALE \
	${TIMELAPSE_PARAMETERS} \
	${OUTPUT_FILE}
RET=$?
if [ $RET -ne 0 ]; then
	echo -e "\n${RED}*** $ME: ERROR: ffmpeg failed with RET=$RET"
	echo "Links in '${SEQUENCE_DIR}' left for debugging."
	echo -e "Remove them when the problem is fixed.${NC}\n"
	exit 1
fi

if [ -z "$KEEP_SEQUENCE" ] ; then
	rm -rf $DIR/sequence
else
	echo -en "${ME}: ${GREEN}Keeping sequence${NC}\n"
fi

echo -en "${ME}: ${GREEN}Timelapse was created${NC}\n"

# timelapse is uploaded via endOfNight.sh, which called us.

exit 0
