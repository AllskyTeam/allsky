#!/bin/bash

ME="$(basename "${BASH_ARGV0}")"

if [ $# -eq 1 ] ; then
	if [ "${1}" = "-h" -o "${1}" = "--help" ] ; then
		echo -e "${RED}Usage: ${ME} [YYYYmmdd]${NC}"
		exit 0
	else
		DATE="${1}"
	fi
else
	DATE=$(date -d '12 hours ago' +'%Y%m%d')
fi

# Allow this script to be executed manually, which requires several variables to be set.
if [ -z "$ALLSKY_HOME" ] ; then
	export ALLSKY_HOME=$(realpath $(dirname "${BASH_ARGV0}")/..)
fi

source "${ALLSKY_HOME}/variables.sh"
source "${ALLSKY_CONFIG}/config.sh"
source "${ALLSKY_SCRIPTS}/filename.sh"
source "${ALLSKY_SCRIPTS}/ftp-settings.sh"

DATE_DIR="${ALLSKY_IMAGES}/${DATE}"
if [ ! -d "${DATE_DIR}" ] ; then
	echo -e "${ME}: ${RED}ERROR: '${DATE_DIR}' not found!${NC}"
	exit 2
fi

# Post end of night data. This includes next twilight time
if [[ ${POST_END_OF_NIGHT_DATA} == "true" ]]; then
	echo -e "${ME}: Posting next twilight time to let server know when to resume liveview\n"
	"${ALLSKY_SCRIPTS}/postData.sh"
	echo -e "\n"
fi

# Remove corrupt images before generating keograms and startrails.
# This can take several (tens of) minutes to run and isn't necessary unless the system
# produces corrupt images which then generate funny colors in the summary images.
if [[ "${REMOVE_BAD_IMAGES}" == "true" ]]; then
	echo -e "${ME}: ===== Removing bad images"
	"${ALLSKY_SCRIPTS}/removeBadImages.sh" "${DATE_DIR}"
	echo
fi

# Generate keogram from collected images
if [[ ${KEOGRAM} == "true" ]]; then
	echo -e "${ME}: ===== Generating Keogram"
	mkdir -p "${DATE_DIR}/keogram/"
	KEOGRAM_FILE="keogram-${DATE}.${EXTENSION}"
	UPLOAD_FILE="${DATE_DIR}/keogram/${KEOGRAM_FILE}"

	"${ALLSKY_HOME}/keogram" -d "${DATE_DIR}/" -e ${EXTENSION} -o "${UPLOAD_FILE}" ${KEOGRAM_PARAMETERS}
	RETCODE=$?
	if [[ ${UPLOAD_KEOGRAM} == "true" && ${RETCODE} = 0 ]] ; then
		# If the user specified a different name for the destination file, use it.
		if [ "${KEOGRAM_DESTINATION_NAME}" != "" ]; then
			KEOGRAM_FILE="${KEOGRAM_DESTINATION_NAME}"
		fi
		# KG == KeoGram
		"${ALLSKY_SCRIPTS}/upload.sh" "${UPLOAD_FILE}" "${KEOGRAM_DIR}" "${KEOGRAM_FILE}" "KG"

		# Optionally copy to the local website in addition to the upload above.
		if [ "${WEB_KEOGRAM_DIR}" != "" ]; then
			echo "${ME}: Copying ${UPLOAD_FILE} to ${WEB_KEOGRAM_DIR}"
			cp ${UPLOAD_FILE} "${WEB_KEOGRAM_DIR}"
		fi
	fi
	echo
fi

# Generate startrails from collected images.
# Threshold set to 0.1 by default in config.sh to avoid stacking over-exposed images.
if [[ ${STARTRAILS} == "true" ]]; then
	echo -e "${ME}: ===== Generating Startrails"
	mkdir -p ${DATE_DIR}/startrails/
	STARTRAILS_FILE="startrails-${DATE}.${EXTENSION}"
	UPLOAD_FILE="${DATE_DIR}/startrails/${STARTRAILS_FILE}"
	"${ALLSKY_HOME}/startrails" -d "${DATE_DIR}/" -e ${EXTENSION} -b ${BRIGHTNESS_THRESHOLD} -o "${UPLOAD_FILE}"
	RETCODE=$?
	if [[ ${UPLOAD_STARTRAILS} == "true" && ${RETCODE} == 0 ]] ; then
		# If the user specified a different name for the destination file, use it.
		if [ "${STARTRAILS_DESTINATION_NAME}" != "" ]; then
			STARTRAILS_FILE="${STARTRAILS_DESTINATION_NAME}"
		fi
		# ST == Star Trails
		"${ALLSKY_SCRIPTS}/upload.sh" "${UPLOAD_FILE}" "${STARTRAILS_DIR}" "${STARTRAILS_FILE}" "ST"

		# Optionally copy to the local website in addition to the upload above.
		if [ "${WEB_STARTRAILS_DIR}" != "" ]; then
			echo "${ME}: Copying ${UPLOAD_FILE} to ${WEB_STARTRAILS_DIR}"
			cp "${UPLOAD_FILE}" "${WEB_STARTRAILS_DIR}"
		fi
	fi
	echo
fi

# Generate timelapse from collected images.
# Use timelapse.sh instead of putting all the commands here so users can easily
# test the timelapse creation, which sometimes has issues.
if [[ ${TIMELAPSE} == "true" ]]; then
	echo -e "${ME}: ===== Generating Timelapse"
	"${ALLSKY_SCRIPTS}/timelapse.sh" "${DATE}"
	RETCODE=$?
	if [[ ${UPLOAD_VIDEO} == "true" && ${RETCODE} == 0 ]] ; then
		VIDEOS_FILE="allsky-${DATE}.mp4"
		UPLOAD_FILE="${DATE_DIR}/${VIDEOS_FILE}"
		# If the user specified a different name for the destination file, use it.
		if [ "${VIDEOS_DESTINATION_NAME}" != "" ]; then
			VIDEOS_FILE="${VIDEOS_DESTINATION_NAME}"
		fi
		# TL == Time Lapse
		"${ALLSKY_SCRIPTS}/upload.sh" "${UPLOAD_FILE}" "${VIDEOS_DIR}" "${VIDEOS_FILE}" "TL"

		# Optionally copy to the local website in addition to the upload above.
		if [ "${WEB_VIDEOS_DIR}" != "" ]; then
			TIMELAPSE_FILE="allsky-${DATE}.mp4"
			UPLOAD_FILE="${DATE_DIR}/${TIMELAPSE_FILE}"
			echo "${ME}: Copying ${UPLOAD_FILE} to ${WEB_VIDEOS_DIR}"
			cp "${UPLOAD_FILE}" "${WEB_VIDEOS_DIR}"
		fi
	fi
	# timelapse.sh handled ${TMP}
fi

# Run custom script at the end of a night. This is run BEFORE the automatic deletion
# just in case you need to do something with the files before they are removed
"${ALLSKY_SCRIPTS}/endOfNight_additionalSteps.sh"

# Automatically delete old images and videos
if [[ ${AUTO_DELETE} == "true" ]]; then
	del=$(date --date="${NIGHTS_TO_KEEP} days ago" +%Y%m%d)
	for i in $(find "${ALLSKY_IMAGES}/" -type d -name "2*"); do	# "2*" for years >= 2000
		((${del} > $(basename ${i}))) && echo "Deleting old directory ${i}" && rm -rf ${i}
	done
fi

exit 0
