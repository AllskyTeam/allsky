#!/bin/bash

# This script allows users to manually generate or upload keograms, startrails, and timelapses.

# Allow this script to be executed manually, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$(realpath "$(dirname "${BASH_ARGV0}")/..")"
ME="$(basename "${BASH_ARGV0}")"

#shellcheck disable=SC1091 source-path=.
source "${ALLSKY_HOME}/variables.sh"		|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"		|| exit "${EXIT_ERROR_STOP}"
#shellcheck disable=SC1091		# file doesn't exist in GitHub
source "${ALLSKY_CONFIG}/config.sh"			|| exit "${EXIT_ERROR_STOP}"

DO_HELP="false"
DEBUG_ARG=""
TYPE="GENERATE"
MSG1="create"
MSG2="created"
SILENT="false"
UPLOAD_SILENT="--silent"
NICE=""
GOT=0
DO_KEOGRAM="false"
DO_STARTRAILS="false"
DO_TIMELAPSE="false"
THUMBNAIL_ONLY="false"
THUMBNAIL_ONLY_ARG=""

while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG}" in
			--help)
				DO_HELP="true"
				;;
			--debug)
				DEBUG_ARG="${ARG}"
				;;
			--silent)
				SILENT="true"
				UPLOAD_SILENT=""	# since WE aren't outputing a message, upload.sh should.
				;;
			--nice)
				NICE="${2}"
				shift
				;;
			--thumbnail-only)
				THUMBNAIL_ONLY="true"
				THUMBNAIL_ONLY_ARG="${ARG}"
				;;
			--upload)
				TYPE="UPLOAD"
				MSG1="upload"
				MSG2="uploaded"
				# On uploads, we should let upload.sh output messages since it has more details.
				UPLOAD_SILENT=""
				;;
			-k | --keogram)
				DO_KEOGRAM="true"
				((GOT++))
				;;
			-s | --startrails)
				DO_STARTRAILS="true"
				((GOT++))
				;;
			-t | --timelapse)
				DO_TIMELAPSE="true"
				((GOT++))
				;;

			-*)
				echo -e "${RED}${ME}: Unknown argument '${ARG}' ignoring.${NC}" >&2
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
	RET=${1}
	echo
	[[ ${RET} -ne 0 ]] && echo -en "${RED}"
	echo "Usage: ${ME} [--help] [--silent] [--debug] [--nice n] [--upload] \\"
	echo "    [--thumbnail-only] [--keogram] [--startrails] [--timelapse] DATE"
	[[ ${RET} -ne 0 ]] && echo -en "${NC}"
	echo "    where:"
	echo "      '--help' displays this message and exits."
	echo "      '--debug' runs upload.sh in debug mode."
	echo "      '--nice' runs with nice level n."
	echo "      '--upload' uploads previously-created files instead of creating them."
	echo "      '--thumbnail-only' creates or uploads video thumbnails only."
	echo "      'DATE' is the day in '${ALLSKY_IMAGES}' to process."
	echo "      '--keogram' will ${MSG1} a keogram."
	echo "      '--startrails' will ${MSG1} a startrail."
	echo "      '--timelapse' will ${MSG1} a timelapse."
	echo "    If you don't specify --keogram, --startrails, or --timelapse, all three will be ${MSG2}."
	exit "${RET}"
}

[[ ${DO_HELP} == "true" ]] && usage_and_exit 0
[[ $# -eq 0 ]] && usage_and_exit 1

if [[ ${TYPE} == "UPLOAD" ]]; then
	#shellcheck disable=SC1091		# file doesn't exist in GitHub
	source "${ALLSKY_CONFIG}/ftp-settings.sh" || exit "${EXIT_ERROR_STOP}"
fi

DATE="${1}"
OUTPUT_DIR="${ALLSKY_IMAGES}/${DATE}"
if [[ ! -d ${OUTPUT_DIR} ]]; then
	echo -e "${RED}${ME}: ERROR: '${OUTPUT_DIR}' not found!${NC}"
	exit 2
fi

if [[ ${GOT} -eq 0 ]]; then
	DO_KEOGRAM="true"
	DO_STARTRAILS="true"
	DO_TIMELAPSE="true"
fi

if [[ ${TYPE} == "GENERATE" ]]; then
	generate()
	{
		GENERATING_WHAT="${1}"
		DIRECTORY="${2}"
		CMD="${3}"
		[[ ${SILENT} == "false" ]] && echo "===== Generating ${GENERATING_WHAT}"
		[[ ${DIRECTORY} != "" ]] && mkdir -p "${OUTPUT_DIR}/${DIRECTORY}"

		[[ -n ${DEBUG_ARG} ]] && echo "${ME}: Executing: ${CMD}"
		# shellcheck disable=SC2086
		eval ${CMD}
		RET=$?
		if [[ ${RET} -ne 0 ]]; then
			echo -e "${RED}${ME}: Command Failed: ${CMD}${NC}"
		elif [[ ${SILENT} == "false" ]]; then
			echo -e "\tDone"
		fi

		return ${RET}
	}

else
	upload()
	{
		FILE_TYPE="${1}"
		UPLOAD_FILE="${2}"
		DIRECTORY="${3}"
		DESTINATION_NAME="${4}"
		OVERRIDE_DESTINATION_NAME="${5}"	# optional
		WEB_DIRECTORY="${6}"				# optional
		if [[ -f ${UPLOAD_FILE} ]]; then
			# If the user specified a different name for the destination file, use it.
			if [[ ${OVERRIDE_DESTINATION_NAME} != "" ]]; then
				DESTINATION_NAME="${OVERRIDE_DESTINATION_NAME}"
			fi
			[[ ${SILENT} == "false" ]] && echo "===== Uploading '${UPLOAD_FILE}'"
			# shellcheck disable=SC2086
			"${ALLSKY_SCRIPTS}/upload.sh" ${UPLOAD_SILENT} ${DEBUG_ARG} \
				"${UPLOAD_FILE}" "${DIRECTORY}" "${DESTINATION_NAME}" \
				"${FILE_TYPE}" "${WEB_DIRECTORY}"
			return $?
		else
			echo -en "${YELLOW}"
			echo -n "WARNING: '${UPLOAD_FILE}' not found; skipping."
			echo -e "${NC}"
			return 1
		fi
	}
fi

EXIT_CODE=0

if [[ ${DO_KEOGRAM} == "true" || ${DO_STARTRAILS} == "true" ]]; then
	# Nasty JQ trick to compose a widthxheight string if both width and height
	# are defined in the config file and are non-zero. If this check fails, then
	# IMGSIZE will be empty and it won't be used later on. If the check passes
	# a non-empty string (eg. IMGSIZE="1280x960") will be produced and later
	# parts of this script so startrail and keogram generation can use it
	# to reject incorrectly-sized images.
	IMGSIZE=$(settings 'if .width != null and .height != null and .width != "0" and .height != "0" and .width != 0 and .height != 0 then "\(.width)x\(.height)" else empty end')
	if [[ ${IMGSIZE} != "" ]]; then
		SIZE_FILTER="-s ${IMGSIZE//\"}"
	else
		SIZE_FILTER=""
	fi

fi

if [[ ${DO_KEOGRAM} == "true" ]]; then
	KEOGRAM_FILE="keogram-${DATE}.${EXTENSION}"
	UPLOAD_FILE="${OUTPUT_DIR}/keogram/${KEOGRAM_FILE}"
	if [[ ${TYPE} == "GENERATE" ]]; then
		if [[ -z "${NICE}" ]]; then
			N=""
		else
			N="--nice-level ${NICE}"
		fi
		CMD="'${ALLSKY_BIN}/keogram' ${N} ${SIZE_FILTER} -d '${OUTPUT_DIR}' \
			-e ${EXTENSION} -o '${UPLOAD_FILE}' ${KEOGRAM_EXTRA_PARAMETERS}"
		generate "Keogram" "keogram" "${CMD}"
	else
		upload "Keogram" "${UPLOAD_FILE}" "${KEOGRAM_DIR}" "${KEOGRAM_FILE}" \
			 "${KEOGRAM_DESTINATION_NAME}" "${WEB_KEOGRAM_DIR}"
	fi
	[[ $? -ne 0 ]] && ((EXIT_CODE++))
fi

if [[ ${DO_STARTRAILS} == "true" ]]; then
	STARTRAILS_FILE="startrails-${DATE}.${EXTENSION}"
	UPLOAD_FILE="${OUTPUT_DIR}/startrails/${STARTRAILS_FILE}"
	if [[ ${TYPE} == "GENERATE" ]]; then
		if [[ -z "${NICE}" ]]; then
			N=""
		else
			N="--nice ${NICE}"
		fi
		CMD="'${ALLSKY_BIN}/startrails' ${N} ${SIZE_FILTER} -d '${OUTPUT_DIR}' \
			-e ${EXTENSION} -b ${BRIGHTNESS_THRESHOLD} -o '${UPLOAD_FILE}' \
			${STARTRAILS_EXTRA_PARAMETERS}"
		generate "Startrails, threshold=${BRIGHTNESS_THRESHOLD}" "startrails" "${CMD}"
	else
		upload "Startrails" "${UPLOAD_FILE}" "${STARTRAILS_DIR}" "${STARTRAILS_FILE}" \
			"${STARTRAILS_DESTINATION_NAME}" "${WEB_STARTRAILS_DIR}"
	fi
	[[ $? -ne 0 ]] && ((EXIT_CODE++))
fi

if [[ ${DO_TIMELAPSE} == "true" ]]; then
	VIDEOS_FILE="allsky-${DATE}.mp4"
	# Need a different name for the file so it's not mistaken for a regular image in the WebUI.
	THUMBNAIL_FILE="thumbnail-${DATE}.jpg"

	UPLOAD_THUMBNAIL_NAME="allsky-${DATE}.jpg"
	UPLOAD_THUMBNAIL="${OUTPUT_DIR}/${THUMBNAIL_FILE}"
	UPLOAD_FILE="${OUTPUT_DIR}/${VIDEOS_FILE}"

	if [[ ${TYPE} == "GENERATE" ]]; then
		if [[ ${THUMBNAIL_ONLY} == "true" ]]; then
			if [[ -f ${UPLOAD_FILE} ]]; then
				RET=0
			else
				echo -e "${RED}${ME}: ERROR: video file '${UPLOAD_FILE}' not found!"
				echo -e "Cannot create thumbnail.${NC}"
				RET=1
			fi
		else
			if [[ -z "${NICE}" ]]; then
				N=""
			else
				N="nice -n ${NICE}"
			fi
			CMD="${N} '${ALLSKY_SCRIPTS}/timelapse.sh' --output '${UPLOAD_FILE}' ${DATE}"
			generate "Timelapse" "" "${CMD}"	# it creates the necessary directory
			RET=$?
		fi
		if [[ ${RET} -eq 0 && ${TIMELAPSE_UPLOAD_THUMBNAIL} == "true" ]]; then
			rm -f "${UPLOAD_THUMBNAIL}"
			# Want the thumbnail to be near the start of the video, but not the first frame
			# since that can be a lousy frame.
			# If the video is less than 5 seconds, make_thumbnail won't work, so try again.
			make_thumbnail "05" "${UPLOAD_FILE}" "${UPLOAD_THUMBNAIL}"
			if [[ ! -f ${UPLOAD_THUMBNAIL} ]]; then
				make_thumbnail "00" "${UPLOAD_FILE}" "${UPLOAD_THUMBNAIL}"
			fi
			if [[ ! -f ${UPLOAD_THUMBNAIL} ]]; then
				echo -e "${RED}${ME}: ERROR: video thumbnail not created!${NC}"
			fi
		fi
	else
		if [[ ${THUMBNAIL_ONLY} == "true" ]]; then
			RET=0
		else
			upload "Timelapse" "${UPLOAD_FILE}" "${VIDEOS_DIR}" "${VIDEOS_FILE}" \
				"${VIDEOS_DESTINATION_NAME}" "${WEB_VIDEOS_DIR}"
			RET=$?
		fi
		if [[ ${RET} -eq 0 && ${TIMELAPSE_UPLOAD_THUMBNAIL} == "true" && -f ${UPLOAD_THUMBNAIL} ]]; then
			if [[ -n ${WEB_VIDEOS_DIR} ]]; then
				W="${WEB_VIDEOS_DIR}/thumbnails"
			else
				W=""
			fi
			upload "TimelapseThumbnail" "${UPLOAD_THUMBNAIL}" "${VIDEOS_DIR}/thumbnails" \
				"${UPLOAD_THUMBNAIL_NAME}" "" "${W}"
		fi
	fi
	[[ ${RET} -ne 0 ]] && ((EXIT_CODE++))
fi


if [[ ${TYPE} == "GENERATE" && ${SILENT} == "false" && ${EXIT_CODE} -eq 0 ]]; then
	ARGS="${THUMBNAIL_ONLY_ARG}"
	[[ ${DO_KEOGRAM} == "true" ]] && ARGS="${ARGS} --keogram"
	[[ ${DO_STARTRAILS} == "true" ]] && ARGS="${ARGS} --startrails"
	[[ ${DO_TIMELAPSE} == "true" ]] && ARGS="${ARGS} --timelapse"
	echo -e "\n================"
	echo "If you want to upload the file(s) you just created,"
	echo -e "\texecute '${ME} --upload ${ARGS} ${DATE}'"
	echo "================"
fi

exit "${EXIT_CODE}"
