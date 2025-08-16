#!/bin/bash

# Allow this script to be executed manually, which requires ALLSKY_HOME to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"		|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"		|| exit "${EXIT_ERROR_STOP}"


DEBUG="false"
DO_HELP="false"
IS_MINI="false"
LOCK="false"
IMAGES_FILE=""
INPUT_DIR=""
IMAGE_NAME="${ALLSKY_FILENAME}"
OUTPUT=""			# shorthand for ${OUTPUT_DIR}/${OUTPUT_FILE}
OUTPUT_DIR=""		# Used when more granularity is needed
OUTPUT_FILE=""		# Used when more granularity is needed
FPS=""
TIMELAPSE_BITRATE=""
while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
			-h | --help)
				DO_HELP="true"
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
			--output-dir)
				OUTPUT_DIR="${2}"
				shift
				;;
			--output-file)
				OUTPUT_FILE="${2}"
				shift
				;;
			-o | --output)
				OUTPUT="${2}"
				shift
				;;
			-i | --images)
				IMAGES_FILE="${2}"
				shift
				;;
			-L | --last)		# this is just so the last image name appears in "ps" output
				shift
				;;
			-m | --mini)
				IS_MINI="true"
				;;
			--fps)
				FPS="${2}"
				shift
				;;
			--bitrate)
				TIMELAPSE_BITRATE="${2}"
				shift
				;;
			-*)
				E_ "${ME}: Unknown argument '${ARG}'." >&2
				DO_HELP="true"
				;;
			*)
				# Assume it's the input directory.
				INPUT_DIR="${1}"
				break
				;;
	esac
	shift
done

usage_and_exit()
{
	RET=$1
	exec >&2

	local MSG="\nUsage: ${ME} [--help] [--debug] [--lock] [--output-dir dir] [--output file]"
	MSG+="\n    [--mini] [--filename file]"
	MSG+="\n    [--fps s] [--bitrate b]"
	MSG+="\n    --images file | <INPUT_DIR>"
	if [[ ${RET} -ne 0 ]]; then
		E_ "${MSG}"
	else
		echo -e "${MSG}"
	fi

	echo
	echo "Arguments:"
	echo "   --help             Display this message and exist."
	echo "   --debug            Output debugging information."
	echo "   --lock             Ensure only one instance of ${ME} runs at a time."
	echo "   --output-dir dir   Put the output file in 'dir'."
	echo "   --output file      Override the default storage location and file name."
	echo "                      Should not be used if --output-dir is also used."
	echo "   --mini             Use the Mini-Timelapse settings and the timelapse file is"
	echo "                      called 'mini-timelapse.mp4' (unless '--output' is used)."
	echo "   --filename file    Use 'file' as the beginning of the file names." 
	echo "                      This is useful if creating a timelapse of non-Allsky files."
	echo
	echo "The list of images to process is determined in one of two ways:"
	echo "1. Looking in '<INPUT_DIR>' for files with an extension of '${ALLSKY_EXTENSION}'."
	echo "   If <INPUT_DIR> is a full path name all files ending in '${ALLSKY_EXTENSION}' are used,"
	echo "   otherwise <INPUT_DIR> is assumed to be in '${ALLSKY_IMAGES}' and"
	echo "   only files begining with '${IMAGE_NAME}' are use."
	echo "   The timelapse is called 'allsky-<BASENAME_DIR>.mp4' where"
	echo "   <BASENAME_DIR> is the basename of <INPUT_DIR> and"
	echo "   is stored in <INPUT_DIR> unless '-output-dir' is specified."
	echo
	echo "2. Specifying '--images file' uses the images listed in 'file'; <INPUT_DIR> is not used."
	echo "   timelapse videos are stored in the same directory as the first image unless"
	echo "   '--output-dir' is specified."

	exit "${RET}"
}

# Either IMAGES_FILE or INPUT_DIR must be specified.
[[ -z ${IMAGES_FILE} && -z ${INPUT_DIR} ]] && usage_and_exit 1
[[ -n ${IMAGES_FILE} && -n ${INPUT_DIR} ]] && usage_and_exit 1
[[ ${DO_HELP} == "true" ]] && usage_and_exit 0
if [[ -n ${OUTPUT_DIR} && ! -d ${OUTPUT_DIR} ]]; then
	E_ "${ME}: Output directory '${OUTPUT_DIR}' does not exist." >&2
	exit 2
fi

LAST_IMAGE=""

if [[ -n ${IMAGES_FILE} ]]; then
	if [[ ! -s ${IMAGES_FILE} ]]; then
		E_ "*** ${ME} ERROR: '${IMAGES_FILE}' does not exist or is empty!"
		exit 3
	fi
	LAST_IMAGE="$( tail -1 "${IMAGES_FILE}" )"
else
	# If not a full pathname, ${DIRNAME} will be "." so look in ${ALLSKY_IMAGES}.
	DIRNAME="$( dirname "${INPUT_DIR}" )"
	if [[ ${DIRNAME} == "." ]]; then
		INPUT_DIR="${ALLSKY_IMAGES}/${INPUT_DIR}"	# Need full pathname for links
	else
		# Full path name - use all images with ${ALLSKY_EXTENSION}.
		IMAGE_NAME=""
	fi
	OUTPUT_DIR="${INPUT_DIR}"	# default location

	if [[ ! -d ${INPUT_DIR} ]]; then
		E_ "*** ${ME} ERROR: '${INPUT_DIR}' does not exist!"
		exit 4
	fi
fi

if ! KEEP_SEQUENCE="$( settings ".timelapsekeepsequence" 2>&1 )" ; then
	# The settings file may not exist or may be corrupt.
	E_ "*** ${ME} ERROR: Unable to get .timelapsekeepsequence: ${KEEP_SEQUENCE}"
	exit 4
fi

MY_PID="$$"
if [[ ${DEBUG} == "true" ]]; then
	# Output one string so it's all on one line in log file.
	MSG="${ME}: Starting"
	[[ ${IS_MINI} == "true" ]] && MSG+=" mini "
	MSG+="timelapse"
	[[ -n ${LAST_IMAGE} ]] && MSG+=", last image = $( basename "${LAST_IMAGE}" )"
	D_ "${MSG}, my PID=${MY_PID}."
fi

if [[ ${LOCK} == "true" ]]; then
	if [[ ${DEBUG} == "true" ]]; then
		if [[ -s ${ALLSKY_TIMELAPSE_PID_FILE} ]]; then
			D_ "  > ALLSKY_TIMELAPSE_PID_FILE contains $( < "${ALLSKY_TIMELAPSE_PID_FILE}" )"
		else
			D_ "  > No ALLSKY_TIMELAPSE_PID_FILE"
		fi
	fi
	ABORTED_MSG1="Another timelapse creation is in progress so this one (${PPID}) was aborted."
	ABORTED_FIELDS="$( basename "${OUTPUT}" )\tMY_PID=${MY_PID}\tPPID=${PPID}"
	ABORTED_MSG2="timelapse creations"
	if [[ ${IS_MINI} == "true" ]]; then
		CAUSED_BY="This could be caused by the  Mini-Timelapse"
		CAUSED_BY+=" 'Number Of Images' setting being to high"
		CAUSED_BY+=" and/or 'Frequency' settings being too low."
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
		D_ "  > Got lock, new PID=$( < "${ALLSKY_TIMELAPSE_PID_FILE}" )"
	fi
	SEQUENCE_DIR="${ALLSKY_TMP}/sequence-lock-timelapse"
else
	SEQUENCE_DIR="${ALLSKY_TMP}/sequence-timelapse"
	# Use (hopefully) unique names for the sequence directories in case there are
	# multiple simultaneous timelapse being created.
	[[ -n ${INPUT_DIR} ]] && SEQUENCE_DIR+=".$( basename "${INPUT_DIR}" )"

	ALLSKY_TIMELAPSE_PID_FILE=""
fi

if [[ -n ${OUTPUT_DIR} && -n ${OUTPUT_FILE} ]]; then
	OUTPUT="${OUTPUT_DIR}/${OUTPUT_FILE}"
elif [[ -z ${OUTPUT} ]]; then
	if [[ ${IS_MINI} == "true" ]]; then
		[[ -z ${OUTPUT_DIR} ]] && OUTPUT_DIR="${ALLSKY_CURRENT_DIR}"
		OUTPUT="${OUTPUT_DIR}/${OUTPUT_FILE:-mini-timelapse.mp4}"
	else
		if [[ -z ${OUTPUT_DIR} && -n ${IMAGES_FILE} ]]; then
			# Use the directory the images are in.  Only look at the first one.
			I="$( head -1 "${IMAGES_FILE}" )"
			OUTPUT_DIR="$( dirname "${I}" )"

			# In case the filename doesn't include a path, put in a default location.
			if [[ ${OUTPUT_DIR} == "." ]]; then
				OUTPUT_DIR="${ALLSKY_TMP}"
				W_ "${ME}: Can't determine where to put the timelapse video so putting in '${OUTPUT_DIR}'."
			fi
		fi

		# Use the basename of the directory.
		OUTPUT="${OUTPUT_DIR}/${OUTPUT_FILE:-allsky-$( basename "${OUTPUT_DIR}" ).mp4}"
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
		ls -rt "${INPUT_DIR}/${IMAGE_NAME}"*".${ALLSKY_EXTENSION}" 2>/dev/null
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
				ln -s "${IMAGE}" "${SEQUENCE_DIR}/${NUM}.${ALLSKY_EXTENSION}"
			fi
	done
	if [[ $? -ne 0 ]]; then
		E_ "*** ${ME} ERROR: No images found in '${INPUT_DIR}'!"
		rm -fr "${SEQUENCE_DIR}"
		[[ -n ${ALLSKY_TIMELAPSE_PID_FILE} ]] && rm -f "${ALLSKY_TIMELAPSE_PID_FILE}"
		exit 98		# this number should match what's in {startrails|keogram}.cpp
	fi
else
	W_ "${ME} Not regenerating sequence because 'Keep Timelapse Sequence' is enabled."
fi

# "-loglevel warning" gets rid of the dozens of lines of garbage output
# but doesn't get rid of "deprecated pixel format" message when -pix_ftm is "yuv420p".
# Bitrate settings are integers so do NOT include the "k", so add below.
if [[ ${IS_MINI} == "true" ]]; then
	[[ -z ${FPS} ]] && FPS="$( settings ".minitimelapsefps" )"
	[[ -z ${TIMELAPSE_BITRATE} ]] && TIMELAPSE_BITRATE="$( settings ".minitimelapsebitrate" )"
	W="$( settings ".minitimelapsewidth" )"
	H="$( settings ".minitimelapseheight" )"
else
	[[ -z ${FPS} ]] && FPS="$( settings ".timelapsefps" )"
	[[ -z ${TIMELAPSE_BITRATE} ]] && TIMELAPSE_BITRATE="$( settings ".timelapsebitrate" )"
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
	-i "${SEQUENCE_DIR}/%04d.${ALLSKY_EXTENSION}" \
	-vcodec "${VCODEC}" \
	-b:v "${TIMELAPSE_BITRATE}k" \
	-pix_fmt "${PIX_FMT}" \
	-movflags +faststart \
	${SCALE} \
	${EXTRA} \
	"${OUTPUT}" 2>&1 )"
RET=$?
# The "deprecated..." message is useless and only confuses users, so hide it.
X="$( echo "${X}" | grep -E -v "deprecated pixel format used|Processed " )"
[[ -n ${X} ]] && echo "${X}" >> "${TMP}"		# a warning/error message

if [[ ${RET} -ne -0 ]]; then
	E_ "\n*** ${ME}: ERROR: ffmpeg failed."

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
	rm -f "${OUTPUT}"	# don't leave around to confuse user
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
	MSG="${ME}: "
	[[ ${IS_MINI} == "true" ]] && MSG+="mini "
	MSG+="timelapse creation finished"
	[[ -n ${LAST_IMAGE} ]] && MSG+=", last image = $( basename "${LAST_IMAGE}" )"
	D_ "${MSG}, my PID=${MY_PID}."
fi

# Let our parent remove ${ALLSKY_TIMELAPSE_PID_FILE} when done.

exit 0
