#!/bin/bash

# Help a user determine what settings to use to create timelapse videos.
# Prompt for one or more values of different settings,
# then create a timelapse for each combination of values.

[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )" )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"					|| exit "${EXIT_ERROR_STOP}"

TODAY="$( date '+%Y%m%d' )"
# Get the last directory other than today.
DIR="$( find "${ALLSKY_IMAGES}" -type d -name '20*' \! -name "${TODAY}" | sort | tail -1 )"
NUM_IMAGES="200"
BITRATE_VALUES="$( settings ".timelapsebitrate" )"
FPS_VALUES="$( settings ".timelapsefps" )"

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

#### Get source of images.
echo "Where should the images to make the timelapses come from?"
echo "If you don't enter anything, '${DIR}' will be used."
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

	[[ -z ${x} ]] && break

	[[ ${x:0:1} != "/" ]] && x="${ALLSKY_IMAGES}/${x}"	
	if [[ ! -d ${x} ]]; then
		E_ "'${x}' does not exist; try again"
	else
		DIR="${x}"
		break
	fi
done
echo
echo

#### Get number of images.
echo "How many images in '${DIR}' should be use?"
echo "If you don't enter anything, ${NUM_IMAGES} will be used,"
echo "which is usually sufficient to compare videos."
echo "Entering 'all' will use all the images, which will be slow and isn't usually needed."

echo -e "${cYELLOW}${cBOLD}"
echo -en "Enter the number of images to use: ${cNC}"
# shellcheck disable=SC2034
read -r x
[[ -n ${x} ]] && NUM_IMAGES="${x}"
echo
echo

#### Get bitrates
echo "Enter one or more space-separated Bitrates to use."
echo "If you don't enter anything, ${BITRATE_VALUES} will be used."
echo -e "${cYELLOW}${cBOLD}"
echo -en "Enter the bitrate value(s): ${cNC}"
# shellcheck disable=SC2034
read -r x
[[ -n ${x} ]] && BITRATE_VALUES="${x}"
echo
echo

#### Get fps's
echo "Enter one or more space-separated Frames Per Second (FPS) to use."
echo "If you don't enter anything, ${FPS_VALUES} will be used."
echo -e "${cYELLOW}${cBOLD}"
echo -en "Enter the FPS value(s): ${cNC}"
# shellcheck disable=SC2034
read -r x
[[ -n ${x} ]] && FPS_VALUES="${x}"
echo
echo


#### Create the videos.

IMAGES_FILE="${ALLSKY_TMP}/config_timelapse_images.txt"

find "${DIR}" -maxdepth 1 -type f -name "${FILENAME}-*.${EXTENSION}" > "${IMAGES_FILE}"
if [[ $? -ne 0 || ! -s ${IMAGES_FILE} ]]; then
	E_ "\nUnable to find images in '${DIR}\n"
	rm -f "${IMAGES_FILE}"
	exit 1
fi


if [[ ${NUM_IMAGES} == "all" ]]; then
	NUM_IMAGES=$( wc -l < "${IMAGES_FILE}" )
else
	# Get the first ${NUM_IMAGES} files.
	FILES="$( sort "${IMAGES_FILE}" | head "-${NUM_IMAGES}" )"
	echo "${FILES}" > "${IMAGES_FILE}"
fi


# Get some stats.
NUM_BITRATE=$( echo ${BITRATE_VALUES} | wc -w )
NUM_FPS=$( echo ${FPS_VALUES} | wc -w )
NUM_TIMELAPSES=$(( NUM_BITRATE * NUM_FPS ))
ON_TIMELAPSE=0

I_ "================ Creating timelapses with ${NUM_IMAGES} from '${DIR}'."
FILES=()
for BITRATE in ${BITRATE_VALUES}
do
	for FPS in ${FPS_VALUES}
	do
		(( ON_TIMELAPSE++ ))
		OUTPUT_FILE="${DIR}/timelapse-fps_${FPS}-bitrate_${BITRATE}.mp4"

# TODO: determine time to create first timelapse,
# then tell user estimate remaining time.

		MSG="  Starting timelapse ${ON_TIMELAPSE} of ${NUM_TIMELAPSES} using"
		MSG+=" FPS ${FPS} and bitrate ${BITRATE}."
		I_ "${MSG}"

		ERR="$( "${ALLSKY_SCRIPTS}/timelapse.sh" \
			--fps "${FPS}" \
			--bitrate "${BITRATE}" \
			--images "${IMAGES_FILE}" \
			--output "${OUTPUT_FILE}" \
			2>&1 )"
		if [[ $? -eq 0 ]]; then
			FILES+=( "${OUTPUT_FILE}" )
		else
			E_ "Unable to make timelapse for FPS ${FPS} and bitrate ${BITRATE}:\n${ERR}"
		fi
	done
done

if [[ ${#FILES[@]} -gt 0 ]]; then
	I_ "\nThe following videos were created:"
	for F in ${FILES[@]}
	do
		echo "    ${F}"
	done
	echo
fi

rm -f "${IMAGES_FILE}"
