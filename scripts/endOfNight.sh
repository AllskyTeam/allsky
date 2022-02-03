#!/bin/bash

ME="$(basename "${BASH_ARGV0}")"

# Allow this script to be executed manually, which requires several variables to be set.
if [ -z "${ALLSKY_HOME}" ] ; then
	export ALLSKY_HOME=$(realpath $(dirname "${BASH_ARGV0}")/..)
fi

source "${ALLSKY_HOME}/variables.sh"
source "${ALLSKY_CONFIG}/config.sh"
source "${ALLSKY_SCRIPTS}/filename.sh"
source "${ALLSKY_CONFIG}/ftp-settings.sh"

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

DATE_DIR="${ALLSKY_IMAGES}/${DATE}"
if [ ! -d "${DATE_DIR}" ] ; then
	echo -e "${ME}: ${RED}ERROR: '${DATE_DIR}' not found!${NC}"
	exit 2
fi

# Post end of night data. This includes next twilight time
if [[ ${POST_END_OF_NIGHT_DATA} == "true" ]]; then
	echo -e "${ME}: ===== Posting twilight data"
	"${ALLSKY_SCRIPTS}/postData.sh"
fi

# Generate keogram from collected images
if [[ ${KEOGRAM} == "true" ]]; then
	echo -e "${ME}: ===== Generating Keogram"
	"${ALLSKY_SCRIPTS}/generateForDay.sh" --silent -k ${DATE}
	RET=$?
	echo -e "${ME}: ===== Keogram complete"
	if [[ ${UPLOAD_KEOGRAM} == "true" && ${RET} = 0 ]] ; then
		"${ALLSKY_SCRIPTS}/generateForDay.sh" --upload -k ${DATE}
	fi
fi

# Generate startrails from collected images.
# Threshold set to 0.1 by default in config.sh to avoid stacking over-exposed images.
if [[ ${STARTRAILS} == "true" ]]; then
	echo -e "${ME}: ===== Generating Startrails"
	"${ALLSKY_SCRIPTS}/generateForDay.sh" --silent -s ${DATE}
	RET=$?
	echo -e "${ME}: ===== Startrails complete"
	if [[ ${UPLOAD_KEOGRAM} == "true" && ${RET} = 0 ]] ; then
		"${ALLSKY_SCRIPTS}/generateForDay.sh" --upload -s ${DATE}
	fi
fi

# Generate timelapse from collected images.
# Use timelapse.sh instead of putting all the commands here so users can easily
# test the timelapse creation, which sometimes has issues.
if [[ ${TIMELAPSE} == "true" ]]; then
	echo -e "${ME}: ===== Generating Timelapse"
	"${ALLSKY_SCRIPTS}/generateForDay.sh" --silent -t ${DATE}
	RET=$?
	echo -e "${ME}: ===== Timelapse complete"
	if [[ ${UPLOAD_VIDEO} == "true" && ${RET} = 0 ]] ; then
		"${ALLSKY_SCRIPTS}/generateForDay.sh" --upload -t ${DATE}
	fi
fi

# Run custom script at the end of a night. This is run BEFORE the automatic deletion
# just in case you need to do something with the files before they are removed
cmd="${ALLSKY_SCRIPTS}/endOfNight_additionalSteps.sh"
test -x "${cmd}" && "${cmd}"

# Automatically delete old images and videos
if [[ ${AUTO_DELETE} == "true" ]]; then
	del=$(date --date="${NIGHTS_TO_KEEP} days ago" +%Y%m%d)
	for i in $(find "${ALLSKY_IMAGES}/" -type d -name "2*"); do	# "2*" for years >= 2000
		((${del} > $(basename ${i}))) && echo "Deleting old directory ${i}" && rm -rf ${i}
	done
fi

exit 0
