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

source "${ALLSKY_HOME}/config/variables.sh"
source "${ALLSKY_CONFIG}/config.sh"
source "${ALLSKY_SCRIPTS}/filename.sh"
[ "${TYPE}" = "UPLOAD" ] && source "${ALLSKY_SCRIPTS}/ftp-settings.sh"


if [ $# -eq 0 -o "${1}" = "-h" -o "${1}" = "--help" ]; then
	[ $# -eq 0 ] && echo -en "${RED}"
	echo -e "Usage: ${ME} [-k] [-s] [-t] DATE"
	echo -e "    where:"
	echo -e "      'DATE' is the day in '${ALLSKY_IMAGES}' to process"
	echo -e "      'k' is to ${MSG1} a keogram"
	echo -e "      's' is to ${MSG1} a startrail"
	echo -e "      't' is to ${MSG1} a timelapse"
	echo -e "    If you don't specify k, s, or t, all three will be ${MSG2}."
	[ $# -eq 0 ] && echo -e "${NC}"
	exit 0
fi

if [ $# -gt 1 ] ; then
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
		else
			echo "Unknown image type: '${1}'; ignoring."
		fi
		shift
	done
else
	DO_KEOGRAM="true"
	DO_STARTRAILS="true"
	DO_TIMELAPSE="true"
fi

DATE="${1}"
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

		"${ALLSKY_HOME}/keogram" -d "${DATE_DIR}" -e ${EXTENSION} -o "${UPLOAD_FILE}" ${KEOGRAM_PARAMETERS}
		[ $? -eq 0 ] && echo -e "Completed"
	else
		if [ -s "${UPLOAD_FILE}" ]; then
			# If the user specified a different name for the destination file, use it.
			if [ "${KEOGRAM_DESTINATION_NAME}" != "" ]; then
				KEOGRAM_FILE="${KEOGRAM_DESTINATION_NAME}"
			fi
			echo "Uploading ${KEOGRAM_FILE}"
			# KG == KeoGram.   "--silent" is for silent mode
			"${ALLSKY_SCRIPTS}/upload.sh" --silent "${UPLOAD_FILE}" "${KEOGRAM_DIR}" "${KEOGRAM_FILE}" "KG"
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
			# ST = Star Trails
			"${ALLSKY_SCRIPTS}/upload.sh" --silent "${UPLOAD_FILE}" "${STARTRAILS_DIR}" "${STARTRAILS_FILE}" "ST"
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
			# TL = Time Lapse
			"${ALLSKY_SCRIPTS}/upload.sh" --silent "${UPLOAD_FILE}" "${VIDEOS_DIR}" "${VIDEOS_FILE}" "TL"
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
	echo -e "\n================"
	echo "If you want to upload the file(s) you just created, execute 'uploadForDay.sh ${DATE}"
	echo "================"
fi

exit 0
