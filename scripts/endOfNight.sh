#!/bin/bash

ME="$(basename "${BASH_ARGV0}")"

# Allow this script to be executed manually, which requires several variables to be set.
if [[ -z ${ALLSKY_HOME} ]]; then
	ALLSKY_HOME="$(realpath "$(dirname "${BASH_ARGV0}")/..")"
	export ALLSKY_HOME
fi
# shellcheck disable=SC1090
source "${ALLSKY_HOME}/variables.sh"
# shellcheck disable=SC1090
source "${ALLSKY_CONFIG}/config.sh"
# shellcheck disable=SC1090
source "${ALLSKY_CONFIG}/ftp-settings.sh"

if [ $# -eq 1 ] ; then
	if [[ ${1} = "-h" || ${1} = "--help" ]]; then
		echo -e "Usage: ${ME} [YYYYmmdd]"
		exit 0
	else
		DATE="${1}"
	fi
else
	DATE=$(date -d 'yesterday' +'%Y%m%d')
fi

DATE_DIR="${ALLSKY_IMAGES}/${DATE}"
if [[ ! -d ${DATE_DIR} ]]; then
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
	if [[ ${UPLOAD_STARTRAILS} == "true" && ${RET} = 0 ]] ; then
		"${ALLSKY_SCRIPTS}/generateForDay.sh" --upload -s ${DATE}
	fi
fi

# Generate timelapse from collected images.
# Use generateForDay.sh instead of putting all the commands here so users can easily
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
if [ -n "${DAYS_TO_KEEP}" ]; then
	del=$(date --date="${DAYS_TO_KEEP} days ago" +%Y%m%d)
	for i in $(find "${ALLSKY_IMAGES}/" -type d -name "2*"); do	# "2*" for years >= 2000
		((${del} > $(basename ${i}))) && echo "${ME}: Deleting old directory ${i}" && rm -rf ${i}
	done
fi

# Automatically delete old website images and videos
if [ -n "${WEB_DAYS_TO_KEEP}" ]; then
	if [ ! -d "${ALLSKY_WEBSITE}" ]; then
		echo -e "${ME}: ${YELLOW}WARNING: 'WEB_DAYS_TO_KEEP' set but no website found in '${ALLSKY_WEBSITE}!${NC}"
		echo -e 'Set WEB_DAYS_TO_KEEP to ""'
	else
		del=$(date --date="${WEB_DAYS_TO_KEEP} days ago" +%Y%m%d)
		(
			cd "${ALLSKY_WEBSITE}" || exit 1
			for i in $(find startrails keograms videos -type f -name "*-202*"); do	# "*-202*" for years >= 2020
				# Remove everything but the date
				DATE="${i##*-}"
				DATE="${DATE%.*}"
				# Thumbnails will typically be owned and grouped to www-data so use "rm -f".
				((${del} > ${DATE})) && echo "${ME}: Deleting old website file ${i}" && rm -f ${i}
			done
		)
	fi
fi

SHOW_ON_MAP=$(settings ".showonmap")
if [[ ${SHOW_ON_MAP} == "1" ]]; then
	echo -e "${ME}: ===== Posting camera details to allsky map"
	"${ALLSKY_SCRIPTS}/postToMap.sh" --endofnight
fi

python ${ALLSKY_SCRIPTS}/flow-runner.py -e nightday

exit 0
