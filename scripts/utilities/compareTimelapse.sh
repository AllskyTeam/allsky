#!/bin/bash

# Help a user determine what settings to use to create timelapse videos.
# Prompt for one or more values of different settings,
# then create a timelapse for each combination of values.

[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$(dirname "${BASH_ARGV0}")/../.." )"
ME="$( basename "${BASH_ARGV0}" )"
COMMAND_LINE="${*}"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"					|| exit "${EXIT_ERROR_STOP}"

usage_and_exit()
{
	local RET=${1}
	exec >&2
	echo
	local USAGE="Usage: ${ME} [--help] [--num-images n] [--input dir]"
	USAGE+=" [-bitrates '1 2 3'] [--fps '1 2 3']"
	if [[ ${RET} -ne 0 ]]; then
		E_ "${USAGE}"
	else
		echo -e "${USAGE}"
	fi

	echo
	echo "Arguments:"
	echo "   --help                  Displays this message and exits."
	echo "   --num-images n          The number of images to use in the timelapse video."
	echo "                           Default: ${d_COUNT}."
	echo "   --directory dir         Put the test timelapse videos in the specified directory."
	echo "                           If the directory already exists you are prompted to first"
	echo "                           delete its contents.  Default: '${d_OUT_DIRECTORY}'."
	echo "   --input dir             The directory to get pictures from."
	echo "                           If it does not begin with '/' it's assumed to be in '${ALLSKY_IMAGES}'."
	echo "                           Default: '${d_IN_DIRECTORY}'."
	echo "   --bitrates '1 2 3'      Use the specified bitrates.  Must quote the numbers."
	echo "                           Default: '${d_BITRATE_VALUES}'."
	echo "   --fps '1 2 3'           Use the specified FPSs.  Must quote the numbers."
	echo "                           Default: '${d_FPS_VALUES}'."

	echo
	echo "Create multiple timelapse videos with different settings to help determine"
	echo "what settings to ultimately use."
	echo "If not provided on the command line, you are prompted for:"
	echo "    - which day's images to use"
	echo "    - how many images to include"
	echo "    - one or more 'Bitrate' values"
	echo "    - one or more 'FPS' values"
	echo
	echo "A timelapse video is created for each combination of values you specified."
	echo "The list of videos created is displayed for you to compare."
	echo

	exit "${RET}"
}

OK="true"
DO_HELP="false"
HTML="false"
OUT_DIRECTORY=""
	d_OUT_DIRECTORY="${ALLSKY_IMAGES}/test_timelapses"	# Must start with "test"
IN_DIRECTORY=""
	# Get the last directory other than today.  There may not be a "yesterday".
	TODAY="$( date '+%Y%m%d' )"
	d_IN_DIRECTORY="$( find "${ALLSKY_IMAGES}" -type d -name '20*' \
		\! -name "${TODAY}" 2>/dev/null | sort | tail -1 )"
	if [[ -z ${d_IN_DIRECTORY} ]]; then
		# Use today if it exists.
		d_IN_DIRECTORY="${ALLSKY_IMAGES}/${TODAY}"
		[[ ! -d ${d_IN_DIRECTORY} ]] && d_IN_DIRECTORY=""
	fi
COUNT=""
	d_COUNT="200"
# Calculate defaults based on the current values.
BITRATE_VALUES=""
	BITRATE_VALUE="$( settings ".timelapsebitrate" )"
	d_BITRATE_VALUES="${BITRATE_VALUE}"
FPS_VALUES=""
	FPS_VALUE="$( settings ".timelapsefps" )"
	d_FPS_VALUES="${FPS_VALUE}"

while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
		--help)
			DO_HELP="true"
			;;
		--html)
			HTML="true"
			;;
		--directory)
			OUT_DIRECTORY="${2}"
			shift
			;;
		--input)
			IN_DIRECTORY="${2}"
			if [[ ${IN_DIRECTORY:0:1} != "/" ]]; then
				IN_DIRECTORY="${ALLSKY_IMAGES}/${IN_DIRECTORY}"
			fi
			shift
			;;
		--num-images)
			COUNT="${2}"
			shift
			;;
		--bitrates)
			# To avoid having spaces in the argument the invoker may use "_" instead.
			BITRATE_VALUES="${2//_/ }"
			shift
			;;
		--fps)
			FPS_VALUES="${2//_/ }"
			shift
			;;
		-*)
			E_ "Unknown argument '${ARG}'." >&2
			OK="false"
			;;
	esac
	shift
done
[[ ${DO_HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" ]] && usage_and_exit 1
if [[ -z ${IN_DIRECTORY} || -z ${COUNT} || -z ${BITRATE_VALUES} || -z ${FPS_VALUES} ]]; then
	HAVE_ALL="false"
else
	HAVE_ALL="true"
fi
if [[ ${HTML} == "true" && ${HAVE_ALL} == "false" ]] ; then
	echo "<p style='color: red'>"
	echo "All settings must be specified on the command line."
	echo "<br>You ran:  ${ME} ${COMMAND_LINE}"
	echo "</p>"
	usage_and_exit 2
fi

if [[ ${HAVE_ALL} == "false" ]] ; then
	MSG="\nThis script will create multiple timelapse videos using settings you enter."
	MSG+="\nYou can then compare the videos to see which settings you prefer."
	MSG+="\n"
	MSG+="\nYou will be prompted for:"
	MSG+="\n   - which day's images to use"
	MSG+="\n   - how many images to include in each video"
	MSG+="\n   - one or more 'Bitrate' values"
	MSG+="\n   - one or more 'FPS' values"
	I_ "${MSG}\n"

	echo
	echo -en "${cYELLOW}${cBOLD}"
	echo    "============================================="
	echo -en "Press RETURN to continue: ${cNC}"
	# shellcheck disable=SC2034
	read -r x
	echo
	echo
fi

# Prompt for missing data.
if [[ -z ${IN_DIRECTORY} ]]; then
	#### Get source of images.
	echo "Where should the images to make the timelapses come from?"
	if [[ -z ${d_IN_DIRECTORY} ]]; then
		NO_MSG="You MUST enter something since there is no default directory."
		echo "${NO_MSG}"
	else
		echo "If you don't enter anything, '${d_IN_DIRECTORY}' will be used."
		NO_MSG=""
	fi
	echo
	echo "If you enter a directory name that begins with '/', that directory will be used,"
	echo "otherwise the directory you entered is assumed to be in '${ALLSKY_IMAGES}'."
	while true
	do
		echo
		echo -en "${cYELLOW}${cBOLD}"
		echo -en "Enter the directory name: ${cNC}"

		# shellcheck disable=SC2034
		read -r x

		if [[ -z ${x} ]]; then
			if [[ -z ${d_IN_DIRECTORY} ]]; then
				E_ "${NO_MSG}; try again" >&2
				continue;
			fi

			IN_DIRECTORY="${d_IN_DIRECTORY}"
			break
		fi

		[[ ${x} == "q" ]] && exit 0
		[[ ${x:0:1} != "/" ]] && x="${ALLSKY_IMAGES}/${x}"	
		if [[ ! -d ${x} ]]; then
			E_ "'${x}' does not exist; try again" >&2
		else
			IN_DIRECTORY="${x}"
			break
		fi
	done
	echo
	echo
fi

if [[ -z ${COUNT} ]]; then
	#### Get number of images.
	echo "How many images in '${IN_DIRECTORY}' should be use?"
	echo "If you don't enter anything, ${d_COUNT} will be used,"
	echo "which is usually sufficient to compare videos."
	echo "Entering 'all' will use all the images, which is slow and isn't usually needed."

	while true
	do
		echo -e "${cYELLOW}${cBOLD}"
		echo -en "Enter the number of images to use: ${cNC}"

		# shellcheck disable=SC2034
		read -r COUNT
		if [[ -n ${COUNT} ]]; then
			[[ ${COUNT} == "q" ]] && exit 0
			[[ ${COUNT} == "all" ]] && break

			if ! is_number "${COUNT}" ; then
				E_ "'${COUNT}' must be a number or 'all'; try again." >&2
				continue
			fi
		else
			COUNT="${d_COUNT}"
		fi
	done
	echo
	echo
fi

if [[ -z ${BITRATE_VALUES} ]]; then
	#### Get bitrates
	echo "Enter one or more space-separated Bitrates to use."
	echo "If you don't enter anything, ${d_BITRATE_VALUES} will be used."
	while true
	do
		echo -e "${cYELLOW}${cBOLD}"
		echo -en "Enter the bitrate value(s): ${cNC}"
		# shellcheck disable=SC2034
		read -r BITRATE_VALUES
		if [[ -n ${BITRATE_VALUES} ]]; then
			[[ ${BITRATE_VALUES} == "q" ]] && exit 0
		else
			BITRATE_VALUES="${d_BITRATE_VALUES}"
		fi
	done
	echo
	echo
fi
# Check for input errors
ERRORS=""
BITRATE_VALUES=" ${BITRATE_VALUES} "		# makes easier to remove entries
B="${BITRATE_VALUES}"
for BITRATE in ${B}
do
	if ! is_number "${BITRATE}" ; then
		ERRORS+="* Bitrate '${BITRATE}' is not a number so ignoring it.\n"
		BITRATE_VALUES="${BITRATE_VALUES/ ${BITRATE} /}"
	fi
done
if [[ -n ${ERRORS} ]]; then
	{
		[[ ${HTML} == "true" ]] && ERRORS="${ERRORS//\\n/<br>}"
		[[ ${HTML} == "true" ]] && echo "<p style='color: red'>"
		echo "WARNING:"
		echo "${ERRORS}"
		[[ ${HTML} == "true" ]] && echo "</p>"
	} >&2
fi

if [[ -z ${FPS_VALUES} ]]; then
	#### Get fps values.
	echo "Enter one or more space-separated Frames Per Second (FPS) to use."
	echo "If you don't enter anything, ${d_FPS_VALUES} will be used."
	while true
	do
		echo -e "${cYELLOW}${cBOLD}"
		echo -en "Enter the FPS value(s): ${cNC}"
		# shellcheck disable=SC2034
		read -r FPS_VALUES
		if [[ -n ${FPS_VALUES} ]]; then
			[[ ${FPS_VALUES} == "q" ]] && exit 0
		else
			FPS_VALUES="${d_BITRATE_VALUES}"
		fi
	done
	echo
	echo
fi
# Check for input errors
ERRORS=""
FPS_VALUES=" ${FPS_VALUES} "		# makes easier to remove entries
F="${FPS_VALUES}"
for FPS in ${F}
do
	if ! is_number "${FPS}" ; then
		ERRORS+="* Bitrate '${FPS}' is not a number so ignoring it.\n"
		FPS_VALUES="${FPS_VALUES/ ${FPS} /}"
	fi
done
if [[ -n ${ERRORS} ]]; then
	{
		[[ ${HTML} == "true" ]] && ERRORS="${ERRORS//\\n/<br>}"
		[[ ${HTML} == "true" ]] && echo "<p style='color: red'>"
		echo "WARNING:"
		echo "${ERRORS}"
		[[ ${HTML} == "true" ]] && echo "</p>"
	} >&2
fi


#### Create the list of images to use.

IMAGES_FILE="${ALLSKY_TMP}/compare_timelapse_images.txt"

find "${IN_DIRECTORY}" -maxdepth 1 -type f -name "${ALLSKY_FILENAME}-*.${ALLSKY_EXTENSION}" > "${IMAGES_FILE}" 2>/dev/null
if [[ $? -ne 0 || ! -s ${IMAGES_FILE} ]]; then
	E_ "\nThere are no images in '${IN_DIRECTORY}'\n"
	rm -f "${IMAGES_FILE}"
	exit 1
fi
if [[ ${COUNT} == "all" ]]; then
	COUNT=$( wc -l < "${IMAGES_FILE}" )
else
	# Get the first ${COUNT} files.
	# Can get "broken pipe" from sort so ignore it.
	FILES="$( sort "${IMAGES_FILE}" 2>/dev/null | head "-${COUNT}" )"
	echo "${FILES}" > "${IMAGES_FILE}"
fi


# Get some stats.

# shellcheck disable=SC2086
# NUM_BITRATE=$( echo ${BITRATE_VALUES} | wc -w )
# shellcheck disable=SC2086
# NUM_FPS=$( echo ${FPS_VALUES} | wc -w )
# NUM_TIMELAPSES=$(( NUM_BITRATE * NUM_FPS ))

if [[ -z ${OUT_DIRECTORY} ]]; then
	OUT_DIRECTORY="${d_OUT_DIRECTORY}"

	# Create or empty the directory.
	# Don't delete anything from "normal" image directories.
	NUM="$( find "${OUT_DIRECTORY}" -type f -name "*.${ALLSKY_EXTENSION}" -print 2>/dev/null | wc -l )"
	if [[ ${NUM} -gt 0 ]]; then
		# At least one item in the directory.
		if [[ ${HTML} == "false" ]]; then
			echo -en  "${cYELLOW}${cBOLD}"
			echo -n  "There are already ${NUM} file(s) in '${OUT_DIRECTORY}'.  "
			while true
			do
				echo -en "Remove them? (yes/no): ${cNC}"
				# shellcheck disable=SC2034
				read -r YES_NO
				YES_NO="${YES_NO,,}"
				[[ ${YES_NO} == "q" ]] && exit 0
				[[ ${YES_NO:0:1} == "y" ]] && break
				if [[ ${YES_NO:0:1} == "n" ]]; then
					echo -e "\nThe files must be deleted before new ones can be created.  Quitting.\n"
					exit 0
				fi
				echo -e "\nYou must enter yes or no." >&2
			done
		fi
		sudo rm -fr "${OUT_DIRECTORY}"/*
	fi
fi
if [[ ! -d ${OUT_DIRECTORY} ]]; then
	sudo mkdir -p "${OUT_DIRECTORY}"
fi
# Always do these in case the directory already exists but isn't the right permissions.
sudo chmod 775 "${OUT_DIRECTORY}"
sudo chown "${ALLSKY_OWNER}:${WEBSERVER_GROUP}" "${OUT_DIRECTORY}"

# Create the timelapse videos.
if [[ ${HTML} == "false" ]]; then
	# Display msg because it can take a while to process.
	I_ "================ Creating timelapses with ${COUNT} images from '${IN_DIRECTORY}'."
fi
NUM_CREATED=0
FILES=()
for BITRATE in ${BITRATE_VALUES}
do
	for FPS in ${FPS_VALUES}
	do
		OUTPUT_FILE="${OUT_DIRECTORY}/timelapse-fps_${FPS}-bitrate_${BITRATE}.mp4"

# TODO: determine time to create first timelapse,
# then tell user estimate remaining time.

		ERR="$( "${ALLSKY_SCRIPTS}/timelapse.sh" \
			--fps "${FPS}" \
			--bitrate "${BITRATE}" \
			--images "${IMAGES_FILE}" \
			--output "${OUTPUT_FILE}" \
			2>&1 )"
		if [[ $? -eq 0 ]]; then
			(( NUM_CREATED++ ))
			echo "Created '${OUTPUT_FILE}' with FPS ${FPS} and Bitrate ${BITRATE}."

			# Create a "poster" for it.
			POSTER="${OUTPUT_FILE/.mp4/.jpg}"
###				-filter:v scale="${THUMBNAIL_SIZE_X:-100}:-1" \
			ffmpeg -loglevel error -ss "00:00:00.2" -i "${OUTPUT_FILE}" \
				-frames:v 1 "${POSTER}"
			if [[ $? -eq 0 ]]; then
				# Add text
				   TEXT="FPS:     ${FPS}"
			 	TEXT+="\nBitrate: ${BITRATE}k"
				# 200 px from bottom to avoid video playback controls
				addTextToImage --stroke-width 1 --y -200 "${POSTER}" "${POSTER}" "${TEXT}" 2>&1
			fi
		else
			E_ "Unable to make timelapse for FPS ${FPS} and bitrate ${BITRATE}:\n${ERR}"
		fi
	done
done

if [[ ${NUM_CREATED} -gt 0 ]]; then
	if [[ ${HTML} == "true" ]]; then
		echo "<p>"
		DAY="$( basename "${OUT_DIRECTORY}" )"
		echo -n "Click <a href='/helpers/show_images.php?_ts=${RANDOM}"
		echo -n "&day=${DAY}&pre=timelapse-&type=Test Timelapses&filetype=video"
		echo    "'>here</a> to see the results."
	else
		echo -e "\nThe ${NUM_CREATED} timelapse video(s) are in '${OUT_DIRECTORY}'.\n"
	fi
fi

rm -f "${IMAGES_FILE}"

exit 0
