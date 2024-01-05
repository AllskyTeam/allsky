#!/bin/bash

# This script has two main purposes:
#	1. Optionally create a keogram, startrails, and timelapse video for the specified day.
#	2. Perform daily housekeeping not related to the specified day, like removing old files.

# Allow this script to be executed manually, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"		|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"		|| exit "${EXIT_ERROR_STOP}"
#shellcheck disable=SC1091		# file doesn't exist in GitHub
source "${ALLSKY_CONFIG}/config.sh"			|| exit "${EXIT_ERROR_STOP}"
#shellcheck disable=SC1091		# file doesn't exist in GitHub
source "${ALLSKY_CONFIG}/ftp-settings.sh"	|| exit "${EXIT_ERROR_STOP}"

if [[ $# -eq 1 ]]; then
	if [[ ${1} = "--help" ]]; then
		echo -e "Usage: ${ME} [YYYYmmdd]"
		echo "If no date is specified, yesterday will be used"
		exit 0
	else
		DATE="${1}"
	fi
else
	DATE=$( date -d 'yesterday' +'%Y%m%d' )
fi

DATE_DIR="${ALLSKY_IMAGES}/${DATE}"
if [[ ! -d ${DATE_DIR} ]]; then
	echo -e "${ME}: ${RED}ERROR: '${DATE_DIR}' not found!${NC}"
	exit 2
fi

# Decrease priority when running in background.
if [[ ${ON_TTY} -eq 1 ]]; then
	NICE=""
	NICE_ARG=""
else
	NICE="nice -n 15"
	NICE_ARG="--nice 15"
fi

# Post end of night data. This includes next twilight time
WEBSITES="$( whatWebsites )"

if [[ ${WEBSITES} != "none" ]]; then
	echo -e "${ME}: ===== Posting twilight data"
	"${ALLSKY_SCRIPTS}/postData.sh"
fi

# Generate keogram from collected images
if [[ ${KEOGRAM} == "true" ]]; then
	echo -e "${ME}: ===== Generating Keogram for ${DATE}"
	#shellcheck disable=SC2086
	"${ALLSKY_SCRIPTS}/generateForDay.sh" ${NICE_ARG} --silent --keogram "${DATE}"
	RET=$?
	echo -e "${ME}: ===== Keogram complete"
	if [[ ${UPLOAD_KEOGRAM} == "true" && ${RET} = 0 ]] ; then
		"${ALLSKY_SCRIPTS}/generateForDay.sh" --upload --keogram "${DATE}"
	fi
fi

# Generate startrails from collected images.
# Threshold set to 0.1 by default in config.sh to avoid stacking over-exposed images.
if [[ ${STARTRAILS} == "true" ]]; then
	echo -e "${ME}: ===== Generating Startrails for ${DATE}"
	#shellcheck disable=SC2086
	"${ALLSKY_SCRIPTS}/generateForDay.sh" ${NICE_ARG} --silent --startrails "${DATE}"
	RET=$?
	echo -e "${ME}: ===== Startrails complete"
	if [[ ${UPLOAD_STARTRAILS} == "true" && ${RET} = 0 ]] ; then
		"${ALLSKY_SCRIPTS}/generateForDay.sh" --upload --startrails "${DATE}"
	fi
fi

# Generate timelapse from collected images.
# Use generateForDay.sh instead of putting all the commands here so users can easily
# test the timelapse creation, which sometimes has issues.
if [[ ${TIMELAPSE} == "true" ]]; then
	echo -e "${ME}: ===== Generating Timelapse for ${DATE}"
	#shellcheck disable=SC2086
	"${ALLSKY_SCRIPTS}/generateForDay.sh" ${NICE_ARG} --silent --timelapse "${DATE}"
	RET=$?
	echo -e "${ME}: ===== Timelapse complete"
	if [[ ${UPLOAD_VIDEO} == "true" && ${RET} = 0 ]] ; then
		"${ALLSKY_SCRIPTS}/generateForDay.sh" --upload --timelapse "${DATE}"
	fi
fi

# Run custom script at the end of a night. This is run BEFORE the automatic deletion
# just in case you need to do something with the files before they are removed
# TODO: remove in next release.
CMD="${ALLSKY_SCRIPTS}/endOfNight_additionalSteps.sh"
[[ -x ${CMD} ]] && "${CMD}"

DAYS_TO_KEEP=${DAYS_TO_KEEP:-0}					# old versions allowed "" to disable
WEB_DAYS_TO_KEEP=${WEB_DAYS_TO_KEEP:-0}			# old versions allowed "" to disable

# Automatically delete old images and videos.
if [[ ${DAYS_TO_KEEP} -gt 0 ]]; then
	del=$( date --date="${DAYS_TO_KEEP} days ago" +%Y%m%d )
	# "20" for years >= 2000.   Format:  YYYYMMDD
	#                                                   YY  Y    Y   M    M   D      D
	find "${ALLSKY_IMAGES}/" -maxdepth 1 -type d -name "20[2-9][0-9][01][0-9][0123][0-9]" | \
		while read -r i

	do
		if (( del > $( basename "${i}" ) )); then
			echo "${ME}: Deleting old directory ${i}"
			rm -rf "${i}"
		fi
	done
fi

# Automatically delete old LOCAL Website images and videos.

# TODO: work on remote Websites

if [[ ${WEB_DAYS_TO_KEEP} -gt 0 ]]; then
	if [[ ! -d ${ALLSKY_WEBSITE} ]]; then
		echo -e "${ME}: ${YELLOW}WARNING: 'WEB_DAYS_TO_KEEP' set but no website found in '${ALLSKY_WEBSITE}!${NC}"
		echo -e 'Set WEB_DAYS_TO_KEEP to ""'
	else
		del=$( date --date="${WEB_DAYS_TO_KEEP} days ago" +%Y%m%d )
		(
			cd "${ALLSKY_WEBSITE}" || exit 1
			NUM_DELETED=0
			# "*-20" for years >= 2000.   Format:  image_type-YYYYMMDD.${EXT}
			# Examples: keogram-20230710.jpg keogram-20230710.png
			#                                                YY  Y    Y   M    M   D      D
			find startrails keograms videos -type f -name "*-20[2-9][0-9][01][0-9][0123][0-9].[a-zA-Z]*" | \
				while read -r i
			do
				
				# Remove everything but the date from the name of the file.
				DATE="${i##*-}"
				DATE="${DATE%.*}"
				# Thumbnails will typically be owned and grouped to www-data so use "rm -f".
				if ((del > DATE)) ; then
					if [[ ${ALLSKY_DEBUG_LEVEL} -ge 3 ]]; then
						((NUM_DELETED++))
						if [[ ${NUM_DELETED} -eq 1 ]]; then
							echo "${ME}: Deleting old Website files:"
						fi
						echo "    DELETED: ${i}"
					fi
					rm -f "${i}"
				fi
			done
		)
	fi
fi

SHOW_ON_MAP=$( settings ".showonmap" )
if [[ ${SHOW_ON_MAP} -eq 1 ]]; then
	echo -e "${ME}: ===== Posting camera details to allsky map"
	"${ALLSKY_SCRIPTS}/postToMap.sh" --endofnight
fi

activate_python_venv
${NICE} python3 "${ALLSKY_SCRIPTS}/flow-runner.py" --event nightday
deactivate_python_venv

exit 0
