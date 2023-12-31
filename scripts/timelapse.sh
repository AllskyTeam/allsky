#!/bin/bash

# Allow this script to be executed manually, which requires ALLSKY_HOME to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$(realpath "$(dirname "${BASH_ARGV0}")/..")"
ME="$(basename "${BASH_ARGV0}")"

#shellcheck disable=SC1091 source-path=.
source "${ALLSKY_HOME}/variables.sh"		|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"		|| exit "${EXIT_ERROR_STOP}"
#shellcheck disable=SC1091		# file doesn't exist in GitHub
source "${ALLSKY_CONFIG}/config.sh"			|| exit "${EXIT_ERROR_STOP}"


ENTERED="$*"
DEBUG=0
HELP="false"
IS_MINI="false"
LOCK="false"
IMAGES_FILE=""
OUTPUT_FILE=""
while [[ $# -gt 0 ]]; do
	case "${1}" in
			-h | --help)
				HELP="true"
				;;
			-d | --debug)
				((DEBUG++))
				;;
			-l | --lock)
				LOCK="true"
				;;
			-o | --output)
				OUTPUT_FILE="${2}"
				shift
				;;
			-i | --images)
				IMAGES_FILE="${2}"
				shift
				;;
			-m | --mini)
				IS_MINI="true"
				;;
			-*)
				echo -e "${RED}${ME}: Unknown argument '${1}' ignoring.${NC}" >&2
				HELP="true"
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
	XD="/some_nonstandard_path"
	TODAY="$(date +%Y%m%d)"
	[[ ${RET} -ne 0 ]] && echo -en "${RED}"
	echo -n "Usage: ${ME} [--debug] [--help] [--lock] [--output file] [--mini] {--images file | <INPUT_DIR> }"
	echo -e "${NC}"
	echo "    example: ${ME} ${TODAY}"
	echo "    or:      ${ME} --output '${XD}' ${TODAY}"
	echo
	echo -en "${YELLOW}"
	echo
	echo "You entered: ${ME} ${ENTERED}"
	echo
	echo "The list of images is determined in one of two ways:"
	echo "1. Looking in '<INPUT_DIR>' for files with an extension of '${EXTENSION}'."
	echo "   If <INPUT_DIR> is NOT a full path name it is assumed to be in '${ALLSKY_IMAGES}',"
	echo "   which allows using images on a USB stick, for example."
	echo "   The timelapse file is stored in <INPUT_DIR> and is called 'allsky-<BASENAME_DIR>.mp4',"
	echo "   where <BASENAME_DIR> is the basename of <INPUT_DIR>."
	echo
	echo "2. Specifying '--images file' uses the images listed in 'file'; <INPUT_DIR> is not used."
	echo "   The timelapse file is stored in the same directory as the first image."
	echo
	echo "'--lock' ensures only one instance of ${ME} runs at a time."
	echo "'--output file' overrides the default storage location and file name."
	echo "'--mini' uses the MINI_TIMELAPSE settings and the timelapse file is"
	echo "   called 'mini-timelapse.mp4' if '--output' isn't used."
	echo -en "${NC}"
	exit "${RET}"
}
if [[ -n ${IMAGES_FILE} ]]; then
	# If IMAGES_FILE is specified there should be no other arguments.
	[[ $# -ne 0 ]] && usage_and_exit 1
elif [[ $# -eq 0 || $# -gt 1 ]]; then
	usage_and_exit 2
fi
[[ ${HELP} == "true" ]] && usage_and_exit 0

OUTPUT_DIR=""
if [[ -n ${IMAGES_FILE} ]]; then
	if [[ ! -s ${IMAGES_FILE} ]]; then
		echo -e "${RED}*** ${ME} ERROR: '${IMAGES_FILE}' does not exist or is empty!${NC}"
		exit 3
	fi
	INPUT_DIR=""		# Not used
else
	INPUT_DIR="${1}"

	# If not a full pathname, ${DIRNAME} will be "." so look in ${ALLSKY_IMAGES}.
	DIRNAME="$( dirname "${INPUT_DIR}" )"
	if [[ ${DIRNAME} == "." ]]; then
		INPUT_DIR="${ALLSKY_IMAGES}/${INPUT_DIR}"	# Need full pathname for links
	fi
	OUTPUT_DIR="${INPUT_DIR}"	# default location

	if [[ ! -d ${INPUT_DIR} ]]; then
		echo -e "${RED}*** ${ME} ERROR: '${INPUT_DIR}' does not exist!${NC}"
		exit 4
	fi
fi

if [[ ${LOCK} == "true" ]]; then
	PID_FILE="${ALLSKY_TMP}/timelapse-pid.txt"
	ABORTED_MSG1="Another timelapse creation is in progress so this one was aborted."
	ABORTED_FIELDS="$( basename "${OUTPUT_FILE}" )"
	ABORTED_MSG2="timelapse creations"
	if [[ ${IS_MINI} == "true" ]]; then
		CAUSED_BY="This could be caused by unreasonable TIMELAPSE_MINI_IMAGES and TIMELAPSE_MINI_FREQUENCY settings."
	else
		CAUSED_BY="Unknown cause - see /var/log/allsky.log."
	fi
	if ! one_instance --pid-file "${PID_FILE}" \
			--aborted-count-file "${ALLSKY_ABORTEDTIMELAPSE}" \
			--aborted-fields "${ABORTED_FIELDS}" \
			--aborted-msg1 "${ABORTED_MSG1}" --aborted-msg2 "${ABORTED_MSG2}" \
			--caused-by "${CAUSED_BY}" ; then
		exit 5
	fi
	SEQUENCE_DIR="${ALLSKY_TMP}/sequence-lock-timelapse"
else
	SEQUENCE_DIR="${ALLSKY_TMP}/sequence-timelapse"
	# Use (hopefully) unique names for the sequence directories in case there are
	# multiple simultaneous timelapse being created.
	[[ -n ${INPUT_DIR} ]] && SEQUENCE_DIR="${SEQUENCE_DIR}.$( basename "${INPUT_DIR}" )"
	PID_FILE=""
fi

if [[ -z ${OUTPUT_FILE} ]]; then
	if [[ ${IS_MINI} == "true" ]]; then
		OUTPUT_DIR="${ALLSKY_TMP}"
		OUTPUT_FILE="${OUTPUT_DIR}/mini-timelapse.mp4"
	else
		if [[ -n ${IMAGES_FILE} ]]; then
			# Use the directory the images are in.  Only look at the first one.
			I="$( head -1 "${IMAGES_FILE}" )"
			OUTPUT_DIR="$( dirname "${I}" )"

			# In case the filename doesn't include a path, put in a default location.
			if [[ ${OUTPUT_DIR} == "." ]]; then
				OUTPUT_DIR="${ALLSKY_TMP}"
				echo -en "${ME}: ${YELLOW}"
				echo "Can't determine where to put timelapse file so putting in '${OUTPUT_DIR}'."
				echo -e "${NC}"
			fi
		fi

		# Use the basename of the directory.
		B="$( basename "${OUTPUT_DIR}" )"
		OUTPUT_FILE="${OUTPUT_DIR}/allsky-${B}.mp4"
	fi
fi

TMP="${ALLSKY_TMP}/timelapseTMP.txt"
[[ ${IS_MINI} == "false"  ]] && : > "${TMP}"		# Only create when NOT doing mini-timelapses

if [[ ${KEEP_SEQUENCE} == "false" ]]; then
	rm -fr "${SEQUENCE_DIR}"
	mkdir -p "${SEQUENCE_DIR}"

	NUM_IMAGES=0
	# capture the "ln" commands in case the user needs to debug
	if [[ -n ${IMAGES_FILE} ]]; then
		cat "${IMAGES_FILE}"

		# This is needed because NUM_IMAGES is updated in a sub-shell
		# so we can't access it and hence don't know how many images were processed,
		# and it's too expensive to count the number in SEQUENCE_DIR since it could
		# have thousands of images.
		echo "[end]"		# signals end of the list
	else
		ls -rt "${INPUT_DIR}/${FILENAME}-"*".${EXTENSION}" 2>/dev/null
		echo "[end]"
	fi | while read -r IMAGE
		do
			if [[ ${IMAGE} == "[end]" ]]; then
				if [[ ${NUM_IMAGES} -eq 0 ]]; then
					exit 1		# gets out of "while" loop
				elif [[ ${IS_MINI} == "false" ]]; then
					echo "Processed ${NUM_IMAGES} images" > "${TMP}"
				fi
			else
				# Make sure the file exists.
				# This user or something else may have removed it.
				if [[ ! -s ${IMAGE} ]]; then
					if [[ ! -f ${IMAGE} ]]; then
# TODO: would be nice to remove from the file,
# but we don't create/update the file so any change we make may be overwritten.
						MSG="not found"
					else
						MSG="has nothing in it"
						rm -f "${IMAGE}"
					fi
					echo -e "${YELLOW}*** ${ME} WARNING: image '${IMAGE}' ${MSG}!${NC}"
					continue
				fi

				((NUM_IMAGES++))
				NUM="$( printf "%04d" "${NUM_IMAGES}" )"
				ln -s "${IMAGE}" "${SEQUENCE_DIR}/${NUM}.${EXTENSION}"
			fi
		done
	if [[ $? -ne 0 ]]; then
		echo -e "${RED}*** ${ME} ERROR: No images found in '${INPUT_DIR}'!${NC}"
		rm -fr "${SEQUENCE_DIR}"
		[[ -n ${PID_FILE} ]] && rm -f "${PID_FILE}"
		exit 1
	fi
else
	echo -e "${ME} ${YELLOW}"
	echo "Not regenerating sequence because KEEP_SEQUENCE is enabled."
	echo -e "${NC}"
fi

SCALE=""

# "-loglevel warning" gets rid of the dozens of lines of garbage output
# but doesn't get rid of "deprecated pixel format" message when -pix_ftm is "yuv420p".
# set FFLOG=info in config.sh if you want to see what's going on for debugging.
if [[ ${IS_MINI} == "true" ]]; then
	FPS="${TIMELAPSE_MINI_FPS}"
	TIMELAPSE_BITRATE="${TIMELAPSE_MINI_BITRATE}"
	if [[ ${TIMELAPSE_MINI_WIDTH} != "0" ]]; then
		SCALE="-filter:v scale=${TIMELAPSE_MINI_WIDTH}:${TIMELAPSE_MINI_HEIGHT}"
	fi
elif [[ ${TIMELAPSEWIDTH} != "0" ]]; then
	SCALE="-filter:v scale=${TIMELAPSEWIDTH}:${TIMELAPSEHEIGHT}"
fi
# shellcheck disable=SC2086
X="$(ffmpeg -y -f image2 \
	-loglevel "${FFLOG}" \
	-r "${FPS}" \
	-i "${SEQUENCE_DIR}/%04d.${EXTENSION}" \
	-vcodec "${VCODEC}" \
	-b:v "${TIMELAPSE_BITRATE}" \
	-pix_fmt "${PIX_FMT}" \
	-movflags +faststart \
	$SCALE \
	${TIMELAPSE_EXTRA_PARAMETERS} \
	"${OUTPUT_FILE}" 2>&1)"
RET=$?

# The "deprecated..." message is useless and only confuses users, so hide it.
X="$(echo "${X}" | grep -v "deprecated pixel format used")"
[ "${X}" != "" ] && echo "${X}" >> "${TMP}"		# a warning/error message

if [[ ${RET} -ne -0 ]]; then
	echo -e "\n${RED}*** $ME: ERROR: ffmpeg failed."
	echo -e "Error log:\n $( < "${TMP}" )'."
	echo "=============================================="
	echo "Links in '${SEQUENCE_DIR}' left for debugging."
	echo -e "Remove them when the problem is fixed.${NC}\n"
	rm -f "${OUTPUT_FILE}"	# don't leave around to confuse user

	if [[ ${IS_MINI} == "true" ]]; then
		M="Mini-t"
	else
		M="T"
	fi
	MSG="${M}imelapse creation for $( basename "$OUTPUT_FILE" ) failed!"
	"${ALLSKY_SCRIPTS}/addMessage.sh" "error" "${MSG}"

	[[ -n ${PID_FILE} ]] && rm -f "${PID_FILE}"

	exit 1
fi

# if the user wants output, give it to them
[[ ${FFLOG} == "info" && ${IS_MINI} == "false"  ]] && cat "${TMP}"

if [[ ${KEEP_SEQUENCE} == "false" ]]; then
	rm -rf "${SEQUENCE_DIR}"
else
	echo -e "${ME} ${GREEN}Keeping sequence${NC}"
fi

# timelapse is uploaded via generateForDay.sh (usually via endOfNight.sh), which called us.

[[ ${DEBUG} -ge 2 ]] && echo -e "${ME}: ${GREEN}Timelapse in ${OUTPUT_FILE}${NC}"

[[ -n ${PID_FILE} ]] && rm -f "${PID_FILE}"

exit 0

