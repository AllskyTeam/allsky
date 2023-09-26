#!/bin/bash

# This script allows users to manually generate or upload keograms, startrails, and timelapses.

# Allow this script to be executed manually, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"		|| exit "${ALLSKY_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"		|| exit "${ALLSKY_ERROR_STOP}"

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
IMAGES_FILE=""

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
			--images)
				IMAGES_FILE="${2}"
				shift
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
	local RET=${1}
	echo
	[[ ${RET} -ne 0 ]] && echo -en "${RED}"
	echo "Usage: ${ME} [--help] [--silent] [--debug] [--nice n] [--upload] \\"
	echo "    [--thumbnail-only] [--keogram] [--startrails] [--timelapse] \\"
	echo "    {--images file | <INPUT_DIR>}"
	[[ ${RET} -ne 0 ]] && echo -en "${NC}"
	echo "    where:"
	echo "      '--help' displays this message and exits."
	echo "      '--debug' runs upload.sh in debug mode."
	echo "      '--nice' runs with nice level n."
	echo "      '--upload' uploads previously-created files instead of creating them."
	echo "      '--thumbnail-only' creates or uploads video thumbnails only."
	echo "      'INPUT_DIR' is the day in '${ALLSKY_IMAGES}' to process."
	echo "      '--keogram' will ${MSG1} a keogram."
	echo "      '--startrails' will ${MSG1} a startrail."
	echo "      '--timelapse' will ${MSG1} a timelapse."
	echo "    If you don't specify --keogram, --startrails, or --timelapse, all three will be ${MSG2}."
	echo
	echo "The list of images is determined in one of two ways:"
	echo "1. Looking in '<INPUT_DIR>' for files with an extension of '${EXTENSION}'."
	echo "   If <INPUT_DIR> is NOT a full path name it is assumed to be in '${ALLSKY_IMAGES}',"
	echo "   which allows using images on a USB stick, for example."
	echo "   The output file(s) are stored in <INPUT_DIR>."
	echo
	echo "2. Specifying '--images file' uses the images listed in 'file'; <INPUT_DIR> is not used."
	echo "   The output file is stored in the same directory as the first image."
	exit "${RET}"
}

[[ ${DO_HELP} == "true" ]] && usage_and_exit 0

if [[ -n ${IMAGES_FILE} ]]; then
	# If IMAGES_FILE is specified there should be no other arguments.
	[[ $# -ne 0 ]] && usage_and_exit 1
elif [[ $# -eq 0 || $# -gt 1 ]]; then
	usage_and_exit 2
fi

if [[ -n ${IMAGES_FILE} ]]; then
	if [[ ! -s ${IMAGES_FILE} ]]; then
		echo -e "${RED}*** ${ME} ERROR: '${IMAGES_FILE}' does not exist or is empty!${NC}"
		exit 3
	fi
	INPUT_DIR=""		# Not used

	# Use the directory the images are in.  Only look at the first one.
	I="$( head -1 "${IMAGES_FILE}" )"
	OUTPUT_DIR="$( dirname "${I}" )"

	# In case the filename doesn't include a path, put in a default location.
	if [[ ${OUTPUT_DIR} == "." ]]; then
		OUTPUT_DIR="${ALLSKY_TMP}"
		echo -en "${ME}: ${YELLOW}"
		echo "Can't determine where to put files so putting in '${OUTPUT_DIR}'."
		echo -e "${NC}"
	fi

	# Use the basename of the directory.
	DATE="$( basename "${OUTPUT_DIR}" )"

else
	INPUT_DIR="${1}"

	# If not a full pathname, ${DIRNAME} will be "." so look in ${ALLSKY_IMAGES}.
	DIRNAME="$( dirname "${INPUT_DIR}" )"
	if [[ ${DIRNAME} == "." ]]; then
		DATE="${INPUT_DIR}"
		INPUT_DIR="${ALLSKY_IMAGES}/${INPUT_DIR}"	# Need full pathname for links
	else
		DATE="$( basename "${INPUT_DIR}" )"
	fi
	if [[ ! -d ${INPUT_DIR} ]]; then
		echo -e "${RED}*** ${ME} ERROR: '${INPUT_DIR}' does not exist!${NC}"
		exit 4
	fi

	OUTPUT_DIR="${INPUT_DIR}"	# Put output file(s) in same location as input files.
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
		if [[ -f ${UPLOAD_FILE} ]]; then
			# If the user specified a different name for the destination file, use it.
			if [[ ${OVERRIDE_DESTINATION_NAME} != "" ]]; then
				DESTINATION_NAME="${OVERRIDE_DESTINATION_NAME}"
			fi
			[[ ${SILENT} == "false" ]] && echo "===== Uploading '${UPLOAD_FILE}' to '${DIRECTORY}'."

			# shellcheck disable=SC2086
			upload_all ${UPLOAD_SILENT} ${DEBUG_ARG} \
				"${UPLOAD_FILE}" "${DIRECTORY}" "${DESTINATION_NAME}" \
				"${FILE_TYPE}"
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
	IMGSIZE=$( settings 'if .width != null and .height != null and .width != "0" and .height != "0" and .width != 0 and .height != 0 then "\(.width)x\(.height)" else empty end' )
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
		if [[ -z ${NICE} ]]; then
			N=""
		else
			N="--nice-level ${NICE}"
		fi
		KEOGRAM_EXTRA_PARAMETERS="$( settings ".keogramextraparameters" )"
		MORE=""
		EXPAND="$( settings ".keogramexpand" )"
			[[ ${EXPAND} == "true" ]] && MORE="${MORE} --image-expand"
		NAME="$( settings ".keogramfontname" )"
			[[ ${NAME} != "" ]] && MORE="${MORE} --font-name ${NAME}"
		COLOR="$( settings ".keogramfontcolor" )"
			[[ ${COLOR} != "" ]] && MORE="${MORE} --font-color '${COLOR}'"
		SIZE="$( settings ".keogramfontsize" )"
			[[ ${SIZE} != "" ]] && MORE="${MORE} --font-size ${SIZE}"
		THICKNESS="$( settings ".keogramlinethickness" )"
			[[ ${THICKNESS} != "" ]] && MORE="${MORE} --font-type ${THICKNESS}"
		CMD="'${ALLSKY_BIN}/keogram' ${N} ${SIZE_FILTER} -d '${OUTPUT_DIR}' \
			-e ${EXTENSION} -o '${UPLOAD_FILE}' ${MORE} ${KEOGRAM_EXTRA_PARAMETERS}"
		generate "Keogram" "keogram" "${CMD}"
	else
		upload "Keogram" "${UPLOAD_FILE}" "keograms" "${KEOGRAM_FILE}" \
			 "${KEOGRAM_DESTINATION_NAME}"
	fi
	[[ $? -ne 0 ]] && ((EXIT_CODE++))
fi

if [[ ${DO_STARTRAILS} == "true" ]]; then
	STARTRAILS_FILE="startrails-${DATE}.${EXTENSION}"
	UPLOAD_FILE="${OUTPUT_DIR}/startrails/${STARTRAILS_FILE}"
	if [[ ${TYPE} == "GENERATE" ]]; then
		if [[ -z ${NICE} ]]; then
			N=""
		else
			N="--nice ${NICE}"
		fi
		BRIGHTNESS_THRESHOLD="$( settings ".startrailsbrightnessthreshold" )"
		STARTRAILS_EXTRA_PARAMETERS="$( settings ".startrailsextraparameters" )"
		CMD="'${ALLSKY_BIN}/startrails' ${N} ${SIZE_FILTER} -d '${OUTPUT_DIR}' \
			-e ${EXTENSION} -b ${BRIGHTNESS_THRESHOLD} -o '${UPLOAD_FILE}' \
			${STARTRAILS_EXTRA_PARAMETERS}"
		generate "Startrails, threshold=${BRIGHTNESS_THRESHOLD}" "startrails" "${CMD}"
	else
		upload "Startrails" "${UPLOAD_FILE}" "startrails" "${STARTRAILS_FILE}" \
			"${STARTRAILS_DESTINATION_NAME}"
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

	TIMELAPSE_UPLOAD_THUMBNAIL="$( settings ".timelapseuploadthumbnail" )"
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
			if [[ -z ${NICE} ]]; then
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
			upload "Timelapse" "${UPLOAD_FILE}" "videos" "${VIDEOS_FILE}" \
				"${VIDEOS_DESTINATION_NAME}"
			RET=$?
		fi
		if [[ ${RET} -eq 0 && ${TIMELAPSE_UPLOAD_THUMBNAIL} == "true" && -f ${UPLOAD_THUMBNAIL} ]]; then
			upload "TimelapseThumbnail" "${UPLOAD_THUMBNAIL}" "videos/thumbnails" \
				"${UPLOAD_THUMBNAIL_NAME}" ""
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
