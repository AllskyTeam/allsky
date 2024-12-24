#!/bin/bash

# Allow this script to be executed manually, which requires ALLSKY_HOME to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"		|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"		|| exit "${EXIT_ERROR_STOP}"


ENTERED="$*"
DEBUG="false"
HELP="false"
IS_MINI="false"
LOCK="false"
IMAGES_FILE=""
IMAGE_NAME="${FILENAME}"
OUTPUT_FILE=""
while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
			-h | --help)
				HELP="true"
				;;
			-d | --debug)
				DEBUG="true"
				;;
			--no-debug)
				DEBUG="false"
				;;
			-l | --lock)
				LOCK="true"
				;;
			--filename)
				IMAGE_NAME="${2}"
				shift
				;;
			-o | --output)
				OUTPUT_FILE="${2}"
				shift
				;;
			-i | --images)
				IMAGES_FILE="${2}"
				shift
				;;
			-L | --last)			# this is just so the last image name appears in "ps" output
				shift
				;;
			-m | --mini)
				IS_MINI="true"
				;;
			-*)
				echo -e "${RED}${ME}: Unknown argument '${ARG}' ignoring.${NC}" >&2
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
	TODAY="$( date +%Y%m%d )"
	{
		[[ ${RET} -ne 0 ]] && echo -en "${RED}"
		echo -n "Usage: ${ME} [--debug] [--help] [--lock] [--output file]"
		echo -en "\t[--mini] [--filename file] {--images file | <INPUT_DIR> }"
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
		echo "   If <INPUT_DIR> is a full path name all files ending in '${EXTENSION}' are used,"
		echo "   otherwise <INPUT_DIR> is assumed to be in '${ALLSKY_IMAGES}' and"
		echo "   only files begining with '${IMAGE_NAME}' are use."
		echo "   The timelapse is stored in <INPUT_DIR> and is called 'allsky-<BASENAME_DIR>.mp4',"
		echo "   where <BASENAME_DIR> is the basename of <INPUT_DIR>."
		echo
		echo "2. Specifying '--images file' uses the images listed in 'file'; <INPUT_DIR> is not used."
		echo "   The timelapse file is stored in the same directory as the first image."
		echo
		echo "'--lock' ensures only one instance of ${ME} runs at a time."
		echo "'--output file' overrides the default storage location and file name."
		echo "'--mini' uses the MINI_TIMELAPSE settings and the timelapse file is"
		echo "   called 'mini-timelapse.mp4' if '--output' isn't used."
		echo "'--filename file' uses 'file' as the begininning of the file names." 
		echo "'  This is useful if creating timelapse of non-allsky files."
		echo -en "${NC}"
	} >&2
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
LAST_IMAGE=""

if [[ -n ${IMAGES_FILE} ]]; then
	if [[ ! -s ${IMAGES_FILE} ]]; then
		echo -e "${RED}*** ${ME} ERROR: '${IMAGES_FILE}' does not exist or is empty!${NC}"
		exit 3
	fi
	LAST_IMAGE="$( tail -1 "${IMAGES_FILE}" )"
	INPUT_DIR=""		# Not used
else
	INPUT_DIR="${1}"

	# If not a full pathname, ${DIRNAME} will be "." so look in ${ALLSKY_IMAGES}.
	DIRNAME="$( dirname "${INPUT_DIR}" )"
	if [[ ${DIRNAME} == "." ]]; then
		INPUT_DIR="${ALLSKY_IMAGES}/${INPUT_DIR}"	# Need full pathname for links
	else
		# Full path name - use all images with ${EXTENSION}.
		IMAGE_NAME=""
	fi
	OUTPUT_DIR="${INPUT_DIR}"	# default location

	if [[ ! -d ${INPUT_DIR} ]]; then
		echo -e "${RED}*** ${ME} ERROR: '${INPUT_DIR}' does not exist!${NC}"
		exit 4
	fi
fi

if ! KEEP_SEQUENCE="$( settings ".timelapsekeepsequence" 2>&1 )" ; then
	# The settings file may not exist or may be corrupt.
	echo -e "${RED}*** ${ME} ERROR: Unable to get .timelapsekeepsequence:"
	echo "${KEEP_SEQUENCE}"
	echo -e "${NC}"
	exit 4
fi

MY_PID="$$"
if [[ ${DEBUG} == "true" ]]; then
	# Output one string so it's all on one line in log file.
	MSG="${ME}: ${GREEN}Starting"
	[[ ${IS_MINI} == "true" ]] && MSG+=" mini "
	MSG+="timelapse"
	[[ -n ${LAST_IMAGE} ]] && MSG+=", last image = $( basename "${LAST_IMAGE}" )"
	echo -e "${MSG}, my PID=${MY_PID}.${NC}"
fi

if [[ ${LOCK} == "true" ]]; then
	if [[ ${DEBUG} == "true" ]]; then
		if [[ -s ${ALLSKY_TIMELAPSE_PID_FILE} ]]; then
			echo "  > ALLSKY_TIMELAPSE_PID_FILE contains $( < "${ALLSKY_TIMELAPSE_PID_FILE}" )"
		else
			echo "  > No ALLSKY_TIMELAPSE_PID_FILE"
		fi
	fi
	ABORTED_MSG1="Another timelapse creation is in progress so this one (${PPID}) was aborted."
	ABORTED_FIELDS="$( basename "${OUTPUT_FILE}" )\tMY_PID=${MY_PID}\tPPID=${PPID}"
	ABORTED_MSG2="timelapse creations"
	if [[ ${IS_MINI} == "true" ]]; then
		CAUSED_BY="This could be caused by unreasonable TIMELAPSE_MINI_IMAGES and TIMELAPSE_MINI_FREQUENCY settings."
	else
		CAUSED_BY="Unknown cause - see ${ALLSKY_LOG}."
	fi
	# We need to use the PID of our parent, not our PID, since our parent
	# may also upload the timelapse file, and 
	if ! one_instance --pid-file "${ALLSKY_TIMELAPSE_PID_FILE}" --pid "${PPID}" \
			--aborted-count-file "${ALLSKY_ABORTEDTIMELAPSE}" \
			--aborted-fields "${ABORTED_FIELDS}" \
			--aborted-msg1 "${ABORTED_MSG1}" --aborted-msg2 "${ABORTED_MSG2}" \
			--caused-by "${CAUSED_BY}" ; then
		exit 5
	fi
	if [[ ${DEBUG} == "true" ]]; then
		echo "  > Got lock, new PID=$( < "${ALLSKY_TIMELAPSE_PID_FILE}" )"
	fi
	SEQUENCE_DIR="${ALLSKY_TMP}/sequence-lock-timelapse"
else
	SEQUENCE_DIR="${ALLSKY_TMP}/sequence-timelapse"
	# Use (hopefully) unique names for the sequence directories in case there are
	# multiple simultaneous timelapse being created.
	[[ -n ${INPUT_DIR} ]] && SEQUENCE_DIR+=".$( basename "${INPUT_DIR}" )"

	ALLSKY_TIMELAPSE_PID_FILE=""
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

if [[ ${KEEP_SEQUENCE} == "false" || ! -d ${SEQUENCE_DIR} ]]; then
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
		ls -rt "${INPUT_DIR}/${IMAGE_NAME}"*".${EXTENSION}" 2>/dev/null
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
						# It would be nice to remove from the file, but we don't
						# create/update the file so any change we make may be overwritten.
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
		[[ -n ${ALLSKY_TIMELAPSE_PID_FILE} ]] && rm -f "${ALLSKY_TIMELAPSE_PID_FILE}"
		exit 98		# this number should match what's in {startrails|keogram}.cpp
	fi
else
	echo -en "${ME} ${YELLOW}"
	echo -n "Not regenerating sequence because 'Keep Timelapse Sequence' is enabled."
	echo -e "${NC}"
fi

# "-loglevel warning" gets rid of the dozens of lines of garbage output
# but doesn't get rid of "deprecated pixel format" message when -pix_ftm is "yuv420p".
# Bitrate settings are integers so do NOT include the "k", so add below.
if [[ ${IS_MINI} == "true" ]]; then
	FPS="$( settings ".minitimelapsefps" )"
	TIMELAPSE_BITRATE="$( settings ".minitimelapsebitrate" )"
	W="$( settings ".minitimelapsewidth" )"
	H="$( settings ".minitimelapseheight" )"
else
	FPS="$( settings ".timelapsefps" )"
	TIMELAPSE_BITRATE="$( settings ".timelapsebitrate" )"
	W="$( settings ".timelapsewidth" )"
	H="$( settings ".timelapseheight" )"
fi
if [[ ${W} -gt 0 ]]; then
	SCALE="-filter:v scale=${W}:${H}"
else
	SCALE=""
fi
FFLOG="$( settings ".timelapsefflog" )"
VCODEC="$( settings ".timelapsevcodec" )"
PIX_FMT="$( settings ".timelapsepixfmt" )"
EXTRA="$( settings ".timelapseextraparameters" )"
# shellcheck disable=SC2086,SC2046
X="$( ffmpeg -y -f image2 \
	-loglevel "${FFLOG}" \
	-r "${FPS}" \
	-i "${SEQUENCE_DIR}/%04d.${EXTENSION}" \
	-vcodec "${VCODEC}" \
	-b:v "${TIMELAPSE_BITRATE}k" \
	-pix_fmt "${PIX_FMT}" \
	-movflags +faststart \
	${SCALE} \
	${EXTRA} \
	"${OUTPUT_FILE}" 2>&1 )"
RET=$?
# The "deprecated..." message is useless and only confuses users, so hide it.
X="$( echo "${X}" | grep -E -v "deprecated pixel format used|Processed " )"
[[ -n ${X} ]] && echo "${X}" >> "${TMP}"		# a warning/error message

if [[ ${RET} -ne -0 ]]; then
	echo -e "\n${RED}*** ${ME}: ERROR: ffmpeg failed."

	# Check for common, known errors.
	if X="$( echo "${TMP}" | grep -E -i "Killed ffmpeg|malloc of size" )" ; then
		indent --spaces "${X}"
		echo -e "See the 'Troubleshooting -> Timelapse' documentation page for a fix.\n"
	elif [[ ${RET} -eq 137 ]]; then
		# Sometimes the process is killed but we don't get a Killed message.
		indent --spaces "Killed ffmpeg\n${X}"
		echo -e "See the 'Troubleshooting -> Timelapse' documentation page for a fix.\n"
	fi

	indent --spaces "Output: $( < "${TMP}" )"
	echo
	echo "Links in '${SEQUENCE_DIR}' left for debugging."
	echo -e "Remove them when the problem is fixed.${NC}\n"
	rm -f "${OUTPUT_FILE}"	# don't leave around to confuse user
	[[ -n ${ALLSKY_TIMELAPSE_PID_FILE} ]] && rm -f "${ALLSKY_TIMELAPSE_PID_FILE}"
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

if [[ ${DEBUG} == "true" ]]; then
	# Output one string so it's all on one line in log file.
	MSG="${ME}: ${GREEN}"
	[[ ${IS_MINI} == "true" ]] && MSG+="mini "
	MSG+="timelapse creation finished"
	[[ -n ${LAST_IMAGE} ]] && MSG+=", last image = $( basename "${LAST_IMAGE}" )"
	echo -e "${MSG}, my PID=${MY_PID}.${NC}"
fi

# Let our parent remove ${ALLSKY_TIMELAPSE_PID_FILE} when done.

exit 0
