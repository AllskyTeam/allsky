#!/bin/bash

# This script allows users to manually generate or upload keograms,startrails, and timelapses.

ME="$(basename "${BASH_ARGV0}")"

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


usage_and_exit()
{
	retcode=${1}
	echo
	[ ${retcode} -ne 0 ] && echo -en "${RED}"
	echo -e "Usage: ${ME} [-k] [-s] [-t] DATE"
	[ ${retcode} -ne 0 ] && echo -en "${NC}"
	echo -e "    where:"
	echo -e "      'DATE' is the day in '${ALLSKY_IMAGES}' to process"
	echo -e "      'k' is to ${MSG1} a keogram"
	echo -e "      's' is to ${MSG1} a startrail"
	echo -e "      't' is to ${MSG1} a timelapse"
	echo -e "    If you don't specify k, s, or t, all three will be ${MSG2}."
	exit ${retcode}
}
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
			echo "Unknown image type: '${1}'; ignoring."
		fi
		shift
	done
	DATE="${1}"
fi

DATE="${DATE:-${1}}"
if [ "${DATE}" = "" ]; then
	echo -e "${ME}: ${RED}ERROR: No date specified!${NC}"
	usage_and_exit 1
fi
#### echo K=$DO_KEOGRAM, S=$DO_STARTRAILS, T=$DO_TIMELAPSE, DATE=$DATE
DATE_DIR="${ALLSKY_IMAGES}/${DATE}"
if [ ! -d "${DATE_DIR}" ] ; then
	echo -e "${ME}: ${RED}ERROR: '${DATE_DIR}' not found!${NC}"
	exit 2
fi

if [ "${DO_KEOGRAM}" = "true" ] ; then
	KEOGRAM_FILE="keogram-${DATE}.${EXTENSION}"
	UPLOAD_FILE="${DATE_DIR}/keogram/${KEOGRAM_FILE}"
	if [ "${TYPE}" = "GENERATE" ]; then
		# Don't include ${ME} since this script is always executed manually
		echo -e "===== Generating Keogram"
		mkdir -p "${DATE_DIR}/keogram"

		"${ALLSKY_HOME}/keogram" -d "${DATE_DIR}" -e ${EXTENSION} -o "${UPLOAD_FILE}" ${KEOGRAM_EXTRA_PARAMETERS}
		[ $? -eq 0 ] && echo -e "Completed"
	else
		if [ -s "${UPLOAD_FILE}" ]; then
			# If the user specified a different name for the destination file, use it.
			if [ "${KEOGRAM_DESTINATION_NAME}" != "" ]; then
				KEOGRAM_FILE="${KEOGRAM_DESTINATION_NAME}"
			fi
			echo "Uploading ${KEOGRAM_FILE}"
			# "--silent" is for silent mode
			"${ALLSKY_SCRIPTS}/upload.sh" --silent "${UPLOAD_FILE}" "${KEOGRAM_DIR}" "${KEOGRAM_FILE}" "Keogram"
			[ $? -eq 0 ] && echo "${KEOGRAM_FILE} uploaded"
		else
			echo -en "${YELLOW}"
			echo -n "WARNING: Keogram file '${UPLOAD_FILE}' not found; skipping"
			echo -e "${NC}"
		fi
	fi
	echo -e "\n"
fi

if [ "${DO_STARTRAILS}" = "true" ] ; then
	STARTRAILS_FILE="startrails-${DATE}.${EXTENSION}"
	UPLOAD_FILE="${DATE_DIR}/startrails/${STARTRAILS_FILE}"
	if [ "${TYPE}" = "GENERATE" ]; then
		echo -e "===== Generating Startrails, threshold=${BRIGHTNESS_THRESHOLD}"
		mkdir -p "${DATE_DIR}/startrails"

		"${ALLSKY_HOME}/startrails" -d "${DATE_DIR}/" -e ${EXTENSION} -b "${BRIGHTNESS_THRESHOLD}" -o "${UPLOAD_FILE}"
		[ $? -eq 0 ] && echo -e "Completed"
	else
		if [ -s "${UPLOAD_FILE}" ]; then
			if [ "${STARTRAILS_DESTINATION_NAME}" != "" ]; then
				STARTRAILS_FILE="${STARTRAILS_DESTINATION_NAME}"
			fi
			echo "Uploading ${STARTRAILS_FILE}"
			"${ALLSKY_SCRIPTS}/upload.sh" --silent "${UPLOAD_FILE}" "${STARTRAILS_DIR}" "${STARTRAILS_FILE}" "Startrails"
			[ $? -eq 0 ] && echo "${STARTRAILS_FILE} uploaded"
		else
			echo -en "${YELLOW}"
			echo -n "WARNING: Startrails file '${UPLOAD_FILE}' not found; skipping"
			echo -e "${NC}"
		fi
	fi
	echo -e "\n"
fi

if [ "${DO_TIMELAPSE}" = "true" ] ; then
	VIDEOS_FILE="allsky-${DATE}.mp4"
	UPLOAD_FILE="${DATE_DIR}/${VIDEOS_FILE}"
	if [ "${TYPE}" = "GENERATE" ]; then
		echo -e "===== Generating Timelapse"
		"${ALLSKY_SCRIPTS}/timelapse.sh" ${DATE}	# it creates the necessary directory
		[ $? -eq 0 ] && echo -e "Completed"
	else
		if [ -s "${UPLOAD_FILE}" ]; then
			if [ "${VIDEOS_DESTINATION_NAME}" != "" ]; then
				VIDEOS_FILE="${VIDEOS_DESTINATION_NAME}"
			fi
			echo "Uploading ${VIDEOS_FILE}"
			"${ALLSKY_SCRIPTS}/upload.sh" --silent "${UPLOAD_FILE}" "${VIDEOS_DIR}" "${VIDEOS_FILE}" "Timelapse"
			[ $? -eq 0 ] && echo "${VIDEOS_FILE} uploaded"
		else
			echo -en "${YELLOW}"
			echo -n "WARNING: Timelapse file '${UPLOAD_FILE}' not found; skipping"
			echo -e "${NC}"
		fi
	fi
	echo -e "\n"
fi

if [ "${TYPE}" = "GENERATE" ]; then
	ARGS=""
	[ "${DO_KEOGRAM}" = "true" ] && ARGS="${ARGS} -k"
	[ "${DO_STARTRAILS}" = "true" ] && ARGS="${ARGS} -s"
	[ "${DO_TIMELAPSE}" = "true" ] && ARGS="${ARGS} -t"
	echo -e "\n================"
	echo "If you want to upload the file(s) you just created, execute 'uploadForDay.sh ${ARGS} ${DATE}'"
	echo "================"
fi

exit 0
