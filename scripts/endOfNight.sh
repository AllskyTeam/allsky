#!/bin/bash

# This script has two main purposes:
#	1. Optionally create a keogram, startrails, and timelapse video for the specified day.
#	2. Perform daily housekeeping not related to the specified day, like removing old files.
set -a
# Allow this script to be executed manually, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"		|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"		|| exit "${EXIT_ERROR_STOP}"

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
if [[ ${ON_TTY} == "true" ]]; then
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
if [[ $( settings ".keogramgenerate" ) == "true" ]]; then
	echo -e "${ME}: ===== Generating Keogram for ${DATE}"
	#shellcheck disable=SC2086
	"${ALLSKY_SCRIPTS}/generateForDay.sh" ${NICE_ARG} --silent --keogram "${DATE}"
	RET=$?
	echo -e "${ME}: ===== Keogram complete"
	if [[ $( settings ".keogramupload" ) == "true" && ${RET} = 0 ]] ; then
		"${ALLSKY_SCRIPTS}/generateForDay.sh" --upload --keogram "${DATE}"
	fi
fi

# Generate startrails from collected images.
# Threshold set to 0.1 by default to avoid stacking over-exposed images.
if [[ $( settings ".startrailsgenerate" ) == "true" ]]; then
	echo -e "${ME}: ===== Generating Startrails for ${DATE}"
	#shellcheck disable=SC2086
	"${ALLSKY_SCRIPTS}/generateForDay.sh" ${NICE_ARG} --silent --startrails "${DATE}"
	RET=$?
	echo -e "${ME}: ===== Startrails complete"
	if [[ $( settings ".startrailsupload" ) == "true" && ${RET} = 0 ]] ; then
		"${ALLSKY_SCRIPTS}/generateForDay.sh" --upload --startrails "${DATE}"
	fi
fi

# Generate timelapse from collected images.
# Use generateForDay.sh instead of putting all the commands here so users can easily
# test the timelapse creation, which sometimes has issues.
if [[ $( settings ".timelapsegenerate" ) == "true" ]]; then
	echo -e "${ME}: ===== Generating Timelapse for ${DATE}"
	#shellcheck disable=SC2086
	"${ALLSKY_SCRIPTS}/generateForDay.sh" ${NICE_ARG} --silent --timelapse "${DATE}"
	RET=$?
	echo -e "${ME}: ===== Timelapse complete"
	if [[ $( settings ".timelapseupload" ) == "true" && ${RET} = 0 ]] ; then
		"${ALLSKY_SCRIPTS}/generateForDay.sh" --upload --timelapse "${DATE}"
	fi
fi

DAYS_TO_KEEP="$( settings ".daystokeep" )"
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

# Automatically delete old Website images and videos.


LOCAL_WEB_DAYS_TO_KEEP="$( settings ".daystokeeplocalwebsite" )"
if [[ ${LOCAL_WEB_DAYS_TO_KEEP} -gt 0 && $( settings ".uselocalwebsite" ) == "true" ]]; then
	if [[ ! -d ${ALLSKY_WEBSITE} ]]; then
		echo -e "${ME}: ${YELLOW}WARNING: 'Days to Keep on Pi Website' set but no Local Website found in '${ALLSKY_WEBSITE}!${NC}"
		echo -e 'Set "Days to Keep on Pi Website" to ""'
	else
		del=$( date --date="${LOCAL_WEB_DAYS_TO_KEEP} days ago" +%Y%m%d )
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

REMOTE_WEB_DAYS_TO_KEEP="$( settings ".daystokeepremotewebsite" )"
if [[ ${REMOTE_WEB_DAYS_TO_KEEP} -gt 0 && $( settings ".useremotewebsite" ) == "true" ]]; then
	# TODO: work on remote Websites.
	# Possibly do a curl xxxx?keep=${REMOTE_WEB_DAYS_TO_KEEP}
	# and pass something so it knows this is a valid request.
	:
fi

SHOW_ON_MAP=$( settings ".showonmap" )
if [[ ${SHOW_ON_MAP} == "true" ]]; then
	echo -e "${ME}: ===== Posting camera details to Allsky map."
	"${ALLSKY_SCRIPTS}/postToMap.sh" --endofnight
fi

activate_python_venv
${NICE} python3 "${ALLSKY_SCRIPTS}/flow-runner.py" --event nightday
deactivate_python_venv

exit 0
