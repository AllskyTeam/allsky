#!/bin/bash

# This script allows users to manually generate or upload keograms, startrails, and timelapses.

# Allow this script to be executed manually, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$(realpath "$(dirname "${BASH_ARGV0}")/..")"
ME="$(basename "${BASH_ARGV0}")"

source "${ALLSKY_HOME}/variables.sh"	|| exit 99
source "${ALLSKY_CONFIG}/config.sh"		|| exit 99

DO_HELP="false"
DEBUG_ARG=""
TYPE="GENERATE"
MSG1="create"
MSG2="created"
SILENT="false"
UPLOAD_SILENT="--silent"
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
				GOT=$((GOT + 1))
				;;
			-s | --startrails)
				DO_STARTRAILS="true"
				GOT=$((GOT + 1))
				;;
			-t | --timelapse)
				DO_TIMELAPSE="true"
				GOT=$((GOT + 1))
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
	retcode=${1}
	echo
	[[ ${retcode} -ne 0 ]] && echo -en "${RED}"
	echo "Usage: ${ME} [--help] [--silent] [--debug] [--upload] [--thumbnail-only] [-k] [-s] [-t] DATE"
	[[ ${retcode} -ne 0 ]] && echo -en "${NC}"
	echo "    where:"
	echo "      '--help' displays this message and exits."
	echo "      '--debug' runs upload.sh in debug mode."
	echo "      '--upload' uploads previously-created files instead of creating them."
	echo "      '--thumbnail-only' creates or uploads video thumbnails only."
	echo "      'DATE' is the day in '${ALLSKY_IMAGES}' to process."
	echo "      '-k' will ${MSG1} a keogram."
	echo "      '-s' will ${MSG1} a startrail."
	echo "      '-t' will ${MSG1} a timelapse."
	echo "    If you don't specify k, s, or t, all three will be ${MSG2}."
	# shellcheck disable=SC2086
	exit ${retcode}
}

[[ ${DO_HELP} == "true" ]] && usage_and_exit 0
[[ $# -eq 0 ]] && usage_and_exit 1

if [[ ${TYPE} == "UPLOAD" ]]; then
	source "${ALLSKY_CONFIG}/ftp-settings.sh" || exit 99
fi

DATE="${1}"
DATE_DIR="${ALLSKY_IMAGES}/${DATE}"
if [[ ! -d ${DATE_DIR} ]]; then
	echo -e "${RED}${ME}: ERROR: '${DATE_DIR}' not found!${NC}"
	exit 2
fi

if [[ ${GOT} -eq 0 ]]; then
	DO_KEOGRAM="true"
	DO_STARTRAILS="true"
	DO_TIMELAPSE="true"
fi
# echo -e "k=${DO_KEOGRAM}, s=${DO_STARTRAILS}, t=${DO_TIMELAPSE}\nDATE_DIR=${DATE_DIR}"; exit 0

if [[ ${TYPE} == "GENERATE" ]]; then
	generate()
	{
		GENERATING_WHAT="${1}"
		DIRECTORY="${2}"
		CMD="${3}"
		[[ ${SILENT} == "false" ]] && echo "===== Generating ${GENERATING_WHAT}"
		[[ ${DIRECTORY} != "" ]] && mkdir -p "${DATE_DIR}/${DIRECTORY}"

		# In order for the shell to treat the single quotes correctly, need to run in separate bash,
		# otherwise it tries to execute something like:
		#	'command' 'arg1' 'arg2' ...
		# instead of:
		#	command arg1 arg2 ...

		# shellcheck disable=SC2086
		echo ${CMD} | bash
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
			"${ALLSKY_SCRIPTS}/upload.sh" ${UPLOAD_SILENT} ${DEBUG_ARG} "${UPLOAD_FILE}" "${DIRECTORY}" "${DESTINATION_NAME}" "${FILE_TYPE}" "${WEB_DIRECTORY}"
			return $?
		else
			echo -en "${YELLOW}"
			echo -n "WARNING: '${UPLOAD_FILE}' not found; skipping."
			echo -e "${NC}"
			return 1
		fi
	}
fi

typeset -i EXIT_CODE=0

if [[ ${DO_KEOGRAM} == "true" || ${DO_STARTRAILS} == "true" ]]; then
	# Nasty JQ trick to compose a widthxheight string if both width and height
	# are defined in the config file and are non-zero. If this check fails, then
	# IMGSIZE will be empty and it won't be used later on. If the check passes
	# a non-empty string (eg. IMGSIZE="1280x960") will be produced and later
	# parts of this script so startrail and keogram generation can use it
	# to reject incorrectly-sized images.
	IMGSIZE=$(settings 'if .width? != null and .height != null and .width != "0" and .height != "0" and .width != 0 and .height != 0 then "\(.width)x\(.height)" else empty end' | tr -d '"')
	if [[ ${IMGSIZE} != "" ]]; then
		SIZE_FILTER="-s ${IMGSIZE}"
	else
		SIZE_FILTER=""
	fi

fi

if [[ ${DO_KEOGRAM} == "true" ]]; then
	KEOGRAM_FILE="keogram-${DATE}.${EXTENSION}"
	UPLOAD_FILE="${DATE_DIR}/keogram/${KEOGRAM_FILE}"
	if [[ ${TYPE} == "GENERATE" ]]; then
		CMD="'${ALLSKY_BIN}/keogram' ${SIZE_FILTER} -d '${DATE_DIR}' -e ${EXTENSION} -o '${UPLOAD_FILE}' ${KEOGRAM_EXTRA_PARAMETERS}"
		generate "Keogram" "keogram" "${CMD}"
	else
		upload "Keogram" "${UPLOAD_FILE}" "${KEOGRAM_DIR}" "${KEOGRAM_FILE}" "${KEOGRAM_DESTINATION_NAME}" "${WEB_KEOGRAM_DIR}"
	fi
	[[ $? -ne 0 ]] && EXIT_CODE=$((EXIT_CODE + 1))
fi

if [[ ${DO_STARTRAILS} == "true" ]]; then
	STARTRAILS_FILE="startrails-${DATE}.${EXTENSION}"
	UPLOAD_FILE="${DATE_DIR}/startrails/${STARTRAILS_FILE}"
	if [[ ${TYPE} == "GENERATE" ]]; then
		CMD="'${ALLSKY_BIN}/startrails' ${SIZE_FILTER} -d '${DATE_DIR}' -e ${EXTENSION} -b ${BRIGHTNESS_THRESHOLD} -o '${UPLOAD_FILE}' ${STARTRAILS_EXTRA_PARAMETERS}"
		generate "Startrails, threshold=${BRIGHTNESS_THRESHOLD}" "startrails" "${CMD}"
	else
		upload "Startrails" "${UPLOAD_FILE}" "${STARTRAILS_DIR}" "${STARTRAILS_FILE}" "${STARTRAILS_DESTINATION_NAME}" "${WEB_STARTRAILS_DIR}"
	fi
	[[ $? -ne 0 ]] && EXIT_CODE=$((EXIT_CODE + 1))
fi

if [[ ${DO_TIMELAPSE} == "true" ]]; then
	VIDEOS_FILE="allsky-${DATE}.mp4"
	UPLOAD_THUMBNAIL_NAME="allsky-${DATE}.jpg"
	# Need a different name for the file on the Pi so it's not mistaken for a video file in the WebUI.
	THUMBNAIL_FILE="thumbnail-${DATE}.jpg"
	UPLOAD_FILE="${DATE_DIR}/${VIDEOS_FILE}"
	UPLOAD_THUMBNAIL="${DATE_DIR}/${THUMBNAIL_FILE}"
	if [[ ${TYPE} == "GENERATE" ]]; then
		if [[ ${THUMBNAIL_ONLY} == "true" ]]; then
			if [[ -f ${UPLOAD_FILE} ]]; then
				RET=0
			else
				echo -e "${RED}${ME}: ERROR: video file '${UPLOAD_FILE}' not found!\nCannot create thumbnail.${NC}"
				RET=1
			fi
		else
			CMD="'${ALLSKY_SCRIPTS}/timelapse.sh' ${DATE}"
			generate "Timelapse" "" "${CMD}"	# it creates the necessary directory
			RET=$?
		fi
		if [[ ${RET} -eq 0 && ${TIMELAPSE_UPLOAD_THUMBNAIL} == "true" ]]; then
			rm -f "${UPLOAD_THUMBNAIL}"
			function make_thumbnail()
			{
				local SEC="${1}"
				ffmpeg -loglevel error -ss "00:00:${SEC}" -i "${UPLOAD_FILE}" \
					-filter:v scale="${THUMBNAIL_SIZE_X}:-1" -frames:v 1 "${UPLOAD_THUMBNAIL}"
			}
			# Want the thumbnail to be near the start of the video, but not the first frame
			# since that can be a lousy frame.
			# If the video is less than 5 seconds, make_thumbnail won't work, so try again.
			make_thumbnail 5
			[[ ! -f ${UPLOAD_THUMBNAIL} ]] && make_thumbnail 0
			if [[ ! -f ${UPLOAD_THUMBNAIL} ]]; then
				echo -e "${RED}${ME}: ERROR: video thumbnail not created!${NC}"
			fi
		fi
	else
		if [[ ${THUMBNAIL_ONLY} == "true" ]]; then
			RET=0
		else
			upload "Timelapse" "${UPLOAD_FILE}" "${VIDEOS_DIR}" "${VIDEOS_FILE}" "${VIDEOS_DESTINATION_NAME}" "${WEB_VIDEOS_DIR}"
			RET=$?
		fi
		if [[ ${RET} -eq 0 && ${TIMELAPSE_UPLOAD_THUMBNAIL} == "true" && -f ${UPLOAD_THUMBNAIL} ]]; then
			if [[ -n ${WEB_VIDEOS_DIR} ]]; then
				W="${WEB_VIDEOS_DIR}/thumbnails"
			else
				W=""
			fi
			upload "TimelapseThumbnail" "${UPLOAD_THUMBNAIL}" "${VIDEOS_DIR}/thumbnails" "${UPLOAD_THUMBNAIL_NAME}" "" "${W}"
		fi
	fi
	[[ $RET -ne 0 ]] && EXIT_CODE=$((EXIT_CODE + 1))
fi


if [[ ${TYPE} == "GENERATE" && ${SILENT} == "false" && ${EXIT_CODE} -eq 0 ]]; then
	ARGS="${THUMBNAIL_ONLY_ARG}"
	[[ ${DO_KEOGRAM} == "true" ]] && ARGS="${ARGS} -k"
	[[ ${DO_STARTRAILS} == "true" ]] && ARGS="${ARGS} -s"
	[[ ${DO_TIMELAPSE} == "true" ]] && ARGS="${ARGS} -t"
	echo -e "\n================"
	echo "If you want to upload the file(s) you just created,"
	echo -e "\texecute '${ME} --upload ${ARGS} ${DATE}'"
	echo "================"
fi

exit ${EXIT_CODE}
