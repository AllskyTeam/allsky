#!/bin/bash
# shellcheck disable=SC2154		# referenced but not assigned - from convertJSON.php

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
	"${ALLSKY_SCRIPTS}/postData.sh" --from endOfNight
fi

# Get all settings we're going to use.
#shellcheck disable=SC2119
getAllSettings --var "keogramgenerate keogramupload \
	startrailsgenerate startrailsupload \
	timelapsegenerate timelapseupload \
	daystokeep \
	daystokeeplocalwebsite uselocalwebsite \
	daystokeepremotewebsite useremotewebsite \
	showonmap" || exit 1


# Generate keogram from collected images
if [[ ${S_keogramgenerate} == "true" ]]; then
	echo -e "${ME}: ===== Generating Keogram for ${DATE}"
	#shellcheck disable=SC2086
	X="$( "${ALLSKY_SCRIPTS}/generateForDay.sh" ${NICE_ARG} --silent --keogram "${DATE}" 2>&1 )"
	RET=$?
	MSG="${ME}: ===== Keogram completed"
	if [[ ${RET} -eq 0 ]]; then
		echo -e "${MSG} successfully"
		[[ -n ${X} ]] && echo "${X}"
		if [[ ${S_keogramupload} == "true" ]] ; then
			"${ALLSKY_SCRIPTS}/generateForDay.sh" --upload --keogram "${DATE}"
		fi
	else
		echo -e "${MSG} with error:" >&2
		echo -e "${X}" >&2
		"${ALLSKY_SCRIPTS}/addMessage.sh" --type error --msg "${ME}: ${X}"
	fi
fi

# Generate startrails from collected images.
if [[ ${S_startrailsgenerate} == "true" ]]; then
	echo -e "${ME}: ===== Generating Startrails for ${DATE}"
	#shellcheck disable=SC2086
	X="$( "${ALLSKY_SCRIPTS}/generateForDay.sh" ${NICE_ARG} --silent --startrails "${DATE}" 2>&1 )"
	RET=$?
	MSG="${ME}: ===== Startrails completed"
	if [[ ${RET} -eq 0 ]]; then
		echo -e "${MSG} successfully"
		[[ -n ${X} ]] && echo "${X}"
		if [[ ${S_startrailsupload} == "true" ]] ; then
			"${ALLSKY_SCRIPTS}/generateForDay.sh" --upload --startrails "${DATE}"
		fi
	else
		echo -e "${MSG} with error:" >&2
		echo -e "${X}" >&2
		"${ALLSKY_SCRIPTS}/addMessage.sh" --type error --msg "${ME}: ${X}"
	fi
fi

# Generate timelapse from collected images.
# Use generateForDay.sh instead of putting all the commands here so users can easily
# test the timelapse creation, which sometimes has issues.
if [[ ${S_timelapsegenerate} == "true" ]]; then
	echo -e "${ME}: ===== Generating Timelapse for ${DATE}"
	#shellcheck disable=SC2086
	X="$( "${ALLSKY_SCRIPTS}/generateForDay.sh" ${NICE_ARG} --silent --timelapse "${DATE}" 2>&1 )"
	RET=$?
	MSG="${ME}: ===== Timelapse completed"
	if [[ ${RET} -eq 0 ]]; then
		echo -e "${MSG} successfully"
		[[ -n ${X} ]] && echo "${X}"
		if [[ ${S_timelapseupload} == "true" ]] ; then
			"${ALLSKY_SCRIPTS}/generateForDay.sh" --upload --timelapse "${DATE}"
		fi
	else
		echo -e "${MSG} with error:" >&2
		echo -e "${X}" >&2
		"${ALLSKY_SCRIPTS}/addMessage.sh" --type error --msg "${ME}: ${X}"
	fi
fi

# Automatically delete old images and videos.
if [[ ${S_daystokeep} -gt 0 ]]; then
	del=$( date --date="${S_daystokeep} days ago" +%Y%m%d )
	# "20" for years >= 2000.   Format:  YYYYMMDD
	#                                                   YY  Y    Y   M    M   D      D
	find "${ALLSKY_IMAGES}/" -maxdepth 1 -type d -name "20[2-9][0-9][01][0-9][0123][0-9]" |
		while read -r i
		do
			if (( del > $( basename "${i}" ) )); then
				echo "${ME}: Deleting old directory ${i}"
				rm -rf "${i}"
			fi
		done
fi

# Automatically delete old Website images and videos.
if [[ ${S_daystokeeplocalwebsite} -gt 0 && ${S_uselocalwebsite} == "true" ]]; then
	if [[ ! -d ${ALLSKY_WEBSITE} ]]; then
		echo -e "${ME}: ${YELLOW}WARNING: 'Days to Keep on Pi Website' set but no Local Website found in '${ALLSKY_WEBSITE}!${NC}"
		echo -e 'Set "Days to Keep on Pi Website" to ""'
	else
		del=$( date --date="${S_daystokeeplocalwebsite} days ago" +%Y%m%d )
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

if [[ ${S_daystokeepremotewebsite} -gt 0 && ${S_useremotewebsite} == "true" ]]; then
	# TODO: work on remote Websites.
	# Possibly do a curl xxxx?keep=${S_daystokeepremotewebsite}
	# and pass something so it knows this is a valid request.
	:
fi

if [[ ${S_showonmap} == "true" ]]; then
	echo -e "${ME}: ===== Posting camera details to Allsky map."
	"${ALLSKY_SCRIPTS}/postToMap.sh" --endofnight
fi

activate_python_venv
${NICE} python3 "${ALLSKY_SCRIPTS}/flow-runner.py" --event nightday
deactivate_python_venv

#
# Run database purge
#
echo -e "INFO: ===== Purging Allsky database."
"${ALLSKY_UTILITIES}/db.py" --purge

exit 0
