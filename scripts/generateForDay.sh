#!/bin/bash

# This script allows users to manually generate or upload keograms,startrails, and timelapses.

ME_USAGE="$(basename "${BASH_ARGV0}")"

# Allow this script to be executed manually, which requires several variables to be set.
if [ -z "${ALLSKY_HOME}" ] ; then
	export ALLSKY_HOME=$(realpath $(dirname "${BASH_ARGV0}")/..)
fi

# If the first argument is "--upload" then we upload files, otherwise we create them.
if [ "$1" = "--upload" ]; then
	shift
	TYPE="UPLOAD"
	MSG1="upload"
	MSG2="uploaded"
else
	TYPE="GENERATE"
	MSG1="create"
	MSG2="created"
fi

source "${ALLSKY_HOME}/variables.sh"
source "${ALLSKY_CONFIG}/config.sh"
source "${ALLSKY_SCRIPTS}/filename.sh"
[ "${TYPE}" = "UPLOAD" ] && source "${ALLSKY_CONFIG}/ftp-settings.sh"

# If we're on a tty we are being invoked manually so no need to display ${ME} in error messages.
if tty --silent ; then
	ME=""
else
	ME="${ME_USAGE}: "	# include trailing space
fi

usage_and_exit()
{
	retcode=${1}
	echo
	[ ${retcode} -ne 0 ] && echo -en "${RED}"
	echo "Usage: ${ME_USAGE} [--silent] [-k] [-s] [-t] DATE"
	[ ${retcode} -ne 0 ] && echo -en "${NC}"
	echo "    where:"
	echo "      'DATE' is the day in '${ALLSKY_IMAGES}' to process"
	echo "      'k' is to ${MSG1} a keogram"
	echo "      's' is to ${MSG1} a startrail"
	echo "      't' is to ${MSG1} a timelapse"
	echo "    If you don't specify k, s, or t, all three will be ${MSG2}."
	exit ${retcode}
}

if [ "${1}" = "--silent" -o "${TYPE}" = "UPLOAD" ] ; then
	# On uploads, we should let upload.sh output messages since it has more details.
	SILENT="true"
	UPLOAD_SILENT=""	# since we aren't outputing message, upload.sh should
	[ "${1}" = "--silent" ] && shift
else
	SILENT="false"
	UPLOAD_SILENT="--silent"
fi

[ "${1}" = "-h" -o "${1}" = "--help" ] && usage_and_exit 0
[ $# -eq 0 ] && usage_and_exit 1

if [ $# -eq 1 ] ; then
	# If the first character is "-" it's an argument, not a date.
	[ "${1:0:1}" = "-" ] && usage_and_exit 1

	DATE="${1}"
	DO_KEOGRAM="true"
	DO_STARTRAILS="true"
	DO_TIMELAPSE="true"
else
	DO_KEOGRAM="false"
	DO_STARTRAILS="false"
	DO_TIMELAPSE="false"
	while [ $# -gt 1 ]
	do
		if [ "${1}" = "-k" ] ; then
			DO_KEOGRAM="true"
		elif [ "${1}" = "-s" ] ; then
			DO_STARTRAILS="true"
		elif [ "${1}" = "-t" ] ; then
			DO_TIMELAPSE="true"
		elif [ "${1:0:1}" = "-" ]; then
			echo -e "${YELLOW}${ME}Unknown image type: '${1}'; ignoring.${NC}"
		fi
		shift
	done
	DATE="${1}"
fi

DATE="${DATE:-${1}}"
if [ "${DATE}" = "" ]; then
	echo -e "${RED}${ME}ERROR: No date specified!${NC}"
	usage_and_exit 1
fi
DATE_DIR="${ALLSKY_IMAGES}/${DATE}"
if [ ! -d "${DATE_DIR}" ] ; then
	echo -e "${RED}${ME}ERROR: '${DATE_DIR}' not found!${NC}"
	exit 2
fi

#### echo -e "K=${DO_KEOGRAM}, S=${DO_STARTRAILS}, T=${DO_TIMELAPSE}\nDATE_DIR=${DATE_DIR}"; exit

if [ "${TYPE}" = "GENERATE" ]; then
	generate()
	{
		GENERATING_WHAT="${1}"
		DIRECTORY="${2}"
		CMD="${3}"
		[ ${SILENT} = "false" ] && echo "===== Generating ${GENERATING_WHAT}"
		[ "${DIRECTORY}" != "" ] && mkdir -p "${DATE_DIR}/${DIRECTORY}"

		# In order for the shell to treat the single quotes correctly, need to run in separate bash,
		# otherwise it tries to execute something like:
		#	'command' 'arg1' 'arg2' ...
		# instead of:
		#	command arg1 arg2 ...

		echo ${CMD} | bash
		RET=$?
		if [ ${RET} -ne 0 ]; then
			echo -e "${RED}${ME}Command Failed: ${CMD}${NC}"
		elif [ ${SILENT} = "false" ]; then
			echo "===== Completed ${GENERATING_WHAT}"
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
		if [ -s "${UPLOAD_FILE}" ]; then
			# If the user specified a different name for the destination file, use it.
			if [ "${OVERRIDE_DESTINATION_NAME}" != "" ]; then
				DESTINATION_NAME="${OVERRIDE_DESTINATION_NAME}"
			fi
			[ ${SILENT} = "false" ] && echo "===== Uploading ${FILE_TYPE}"
			"${ALLSKY_SCRIPTS}/upload.sh" ${UPLOAD_SILENT} "${UPLOAD_FILE}" "${DIRECTORY}" "${DESTINATION_NAME}" "${FILE_TYPE}" "${WEB_DIRECTORY}"
			RET=$?
			[ ${RET} -eq 0 -a ${SILENT} = "false" ] && echo "${DESTINATION_NAME} uploaded"
		else
			echo -en "${YELLOW}"
			echo -n "WARNING: ${FILE_TYPE} file '${UPLOAD_FILE}' not found; skipping."
			echo -e "${NC}"
			return 1
		fi
	}
fi

typeset -i EXIT_CODE=0

if [ "${DO_KEOGRAM}" = "true" -o "${DO_STARTRAILS}" = "true" ] ; then
	# Nasty JQ trick to compose a widthxheight string if both width and height
	# are defined in the config file and are non-zero. If this check fails, then
	# IMGSIZE will be empty and it won't be used later on. If the check passes
	# a non-empty string (eg. IMGSIZE="1280x960") will be produced and later
	# parts of this script so startrail and keogram generation can use it
	# to reject incorrectly-sized images.
	IMGSIZE=$(jq 'if .width? != null and .height != null and .width != "0" and .height != "0" and .width != 0 and .height != 0 then "\(.width)x\(.height)" else empty end' "${CAMERA_SETTINGS}" | tr -d '"')
	if [ "${IMGSIZE}" != "" ]; then
		SIZE_FILTER="-s ${IMGSIZE}"
	else
		SIZE_FILTER=""
	fi

fi

if [ "${DO_KEOGRAM}" = "true" ] ; then
	KEOGRAM_FILE="keogram-${DATE}.${EXTENSION}"
	UPLOAD_FILE="${DATE_DIR}/keogram/${KEOGRAM_FILE}"
	if [ "${TYPE}" = "GENERATE" ]; then
		CMD="'${ALLSKY_HOME}/keogram' ${SIZE_FILTER} -d '${DATE_DIR}' -e ${EXTENSION} -o '${UPLOAD_FILE}' ${KEOGRAM_EXTRA_PARAMETERS}"
		generate "Keogram" "keogram" "${CMD}"
	else
		upload "Keogram" "${UPLOAD_FILE}" "${KEOGRAM_DIR}" "${KEOGRAM_FILE}" "${KEOGRAM_DESTINATION_NAME}" "${WEB_KEOGRAM_DIR}"
	fi
	[ $? -ne 0 ] && let EXIT_CODE=${EXIT_CODE}+1
fi

if [ "${DO_STARTRAILS}" = "true" ] ; then
	STARTRAILS_FILE="startrails-${DATE}.${EXTENSION}"
	UPLOAD_FILE="${DATE_DIR}/startrails/${STARTRAILS_FILE}"
	if [ "${TYPE}" = "GENERATE" ]; then
		CMD="'${ALLSKY_HOME}/startrails' ${SIZE_FILTER} -d '${DATE_DIR}' -e ${EXTENSION} -b ${BRIGHTNESS_THRESHOLD} -o '${UPLOAD_FILE}' ${STARTRAILS_EXTRA_PARAMETERS}"
		generate "Startrails, threshold=${BRIGHTNESS_THRESHOLD}" "startrails" "${CMD}"
	else
		upload "Startrails" "${UPLOAD_FILE}" "${STARTRAILS_DIR}" "${STARTRAILS_FILE}" "${STARTRAILS_DESTINATION_NAME}" "${WEB_STARTRAILS_DIR}"
	fi
	[ $? -ne 0 ] && let EXIT_CODE=${EXIT_CODE}+1
fi

if [ "${DO_TIMELAPSE}" = "true" ] ; then
	VIDEOS_FILE="allsky-${DATE}.mp4"
	UPLOAD_FILE="${DATE_DIR}/${VIDEOS_FILE}"
	if [ "${TYPE}" = "GENERATE" ]; then
		CMD="'${ALLSKY_SCRIPTS}/timelapse.sh' ${DATE}"
		generate "Timelapse" "" "${CMD}"	# it creates the necessary directory
	else
		upload "Timelapse" "${UPLOAD_FILE}" "${VIDEOS_DIR}" "${VIDEOS_FILE}" "${VIDEOS_DESTINATION_NAME}" "${WEB_VIDEOS_DIR}"
	fi
	[ $? -ne 0 ] && let EXIT_CODE=${EXIT_CODE}+1
fi


if [ "${TYPE}" = "GENERATE" -a ${SILENT} = "false" -a ${EXIT_CODE} -eq 0 ]; then
	ARGS=""
	[ "${DO_KEOGRAM}" = "true" ] && ARGS="${ARGS} -k"
	[ "${DO_STARTRAILS}" = "true" ] && ARGS="${ARGS} -s"
	[ "${DO_TIMELAPSE}" = "true" ] && ARGS="${ARGS} -t"
	echo -e "\n================"
	echo "If you want to upload the file(s) you just created, execute 'uploadForDay.sh ${ARGS} ${DATE}'"
	echo "================"
fi

exit ${EXIT_CODE}
