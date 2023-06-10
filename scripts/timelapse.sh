#!/bin/bash

# Allow this script to be executed manually, which requires ALLSKY_HOME to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$(realpath "$(dirname "${BASH_ARGV0}")/..")"
ME="$(basename "${BASH_ARGV0}")"

#shellcheck disable=SC2086 source-path=.
source "${ALLSKY_HOME}/variables.sh" || exit ${ALLSKY_ERROR_STOP}
#shellcheck disable=SC2086 source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"		|| exit ${ALLSKY_ERROR_STOP}
#shellcheck disable=SC2086,SC1091		# file doesn't exist in GitHub
source "${ALLSKY_CONFIG}/config.sh" || exit ${ALLSKY_ERROR_STOP}


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
	echo -n "Usage: ${ME} [--debug] [--help] [--lock] [--output file] [--mini] {--images file | <DIR> }"
	echo -e "${NC}"
	echo "    example: ${ME} ${TODAY}"
	echo "    or:      ${ME} --output '${XD}' ${TODAY}"
	echo
	echo -en "${YELLOW}"
	echo
	echo "You entered: ${ME} ${ENTERED}"
	echo
	echo "The list of images is determined in one of two ways:"
	echo "1. Looking in '<DIR>' for files with an extension of '${EXTENSION}'."
	echo "   If <DIR> is NOT a full path name it is assumed to be in '${ALLSKY_IMAGES}',"
	echo "   which allows using images on a USB stick, for example."
	echo
	echo "2. Specifying '--images file' uses the images listed in 'file'; <DIR> is not used."
	echo
	echo "'--lock' ensures only one instance of ${ME} runs at a time."
	echo "'--output file' puts the output timelapse in 'file'."
	echo "   If not specified, the timelapse is stored in the same directory as the images."
	echo "'--mini' uses the MINI_TIMELAPSE settings and the timelapse file"
	echo "   is called 'mini-timelapse.mp4'."
	echo "   If not set, the timelapse file is called 'allsky-<BASENAME_DIR>.mp4',"
	echo "   where <BASENAME_DIR> is the basename of <DIR>."
	echo -en "${NC}"
	# shellcheck disable=SC2086
	exit ${RET}
}
if [[ -n ${IMAGES_FILE} ]]; then
	# If IMAGES_FILE is specified there should be no other arguments.
	[[ $# -ne 0 ]] && usage_and_exit 1
elif [[ $# -eq 0 || $# -gt 1 ]]; then
	usage_and_exit 2
fi
[[ ${HELP} == "true" ]] && usage_and_exit 0

if [[ -n ${IMAGES_FILE} ]]; then
	if [[ ! -f ${IMAGES_FILE} ]]; then
		echo -e "${RED}*** ${ME} ERROR: '${IMAGES_FILE}' does not exist!${NC}"
		exit 3
	fi
else
	# If not a full pathname, ${DIRNAME} will be "." so look in ${ALLSKY_IMAGES}.
	DIR="${1}"
	DIRNAME="$( dirname "${DIR}" )"
	if [[ ${DIRNAME} == "." ]]; then
		DIR="${ALLSKY_IMAGES}/${DIR}"	# Need full pathname for links
	fi
	if [[ ! -d ${DIR} ]]; then
		echo -e "${RED}*** ${ME} ERROR: '${DIR}' does not exist!${NC}"
		exit 4
	fi
fi

if [[ -z ${OUTPUT_FILE} ]]; then
	if [[ ${IS_MINI} == "true" ]]; then
		OUTPUT_FILE="${ALLSKY_TMP}/mini-timelapse.mp4"
	else
		# Use the basename of the directory.
		B="$( basename "${DIR}" )"
		OUTPUT_FILE="${DIR}/allsky-${B}.mp4"
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
fi

TMP="${ALLSKY_TMP}/timelapseTMP.txt"
[[ ${IS_MINI} == "false"  ]] && : > "${TMP}"		# Only create when NOT doing mini-timelapses

if [[ ${KEEP_SEQUENCE} == "false" ]]; then
	rm -fr "${SEQUENCE_DIR}"
	mkdir -p "${SEQUENCE_DIR}"

	# capture the "ln" commands in case the user needs to debug
	(
		if [[ ${IS_MINI} == "false" ]]; then
			# Doing daily, full timelapse
			ls -rt "${DIR}"/*."${EXTENSION}"
			exit 0		# Gets us out of this sub-shell
		fi

		if [[ -f ${IMAGES_FILE} ]]; then
			cat "${IMAGES_FILE}"
		else
			echo "${ME} WARNING: No '${IMAGES_FILE}' file" >&2
			# Do not pass anything to gawk
		fi
	) | gawk -v IS_MINI=${IS_MINI} 'BEGIN { a=0; }
		{
			a++;
			printf "ln -s %s '"${SEQUENCE_DIR}"'/%04d.'"${EXTENSION}"'\n", $0, a;
		}
		END {
			# If we are in "mini" mode, tell bash to exit 1 so we do not have to create a temporary file.
			if (a > 0 && IS_MINI == "true") {
				printf("exit 1");		# avoids creating ${TMP} for MINI timelapse
			} else if (a > 0) {
				printf("Processed %d images\n", a) > "'"${TMP}"'";
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
	if [[ ${RET} -eq 2 ]]; then
		if [[ ${IS_MINI} == "false" ]]; then
			echo -e "${RED}*** ${ME} ERROR: No images found!${NC}"
			rm -fr "${SEQUENCE_DIR}"
		fi
		exit 1
	fi
else
	echo -e "${ME} ${YELLOW}"
	echo "Not regenerating sequence because KEEP_SEQUENCE"
	echo "was given and ${NSEQ} links are present."
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
	echo "Error log is in '${TMP}'."
	echo
	echo "Links in '${SEQUENCE_DIR}' left for debugging."
	echo -e "Remove them when the problem is fixed.${NC}\n"
	rm -f "${OUTPUT_FILE}"	# don't leave around to confuse user
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

rm -f "${PID_FILE}"

exit 0

