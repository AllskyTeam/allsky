#!/bin/bash

[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$(dirname "${BASH_ARGV0}")/../.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/installUpgradeFunctions.sh"	|| exit "${EXIT_ERROR_STOP}"

usage_and_exit()
{
	local RET=${1}
	exec >&2
	echo
	local USAGE="Usage: ${ME} [--help] [--verbose] [--directory dir]"
	USAGE+=" [--input dir] [--num-images n] [--thresholds '1 2 3']"
	if [[ ${RET} -ne 0 ]]; then
		E_ "${USAGE}"
	else
		echo -e "${USAGE}"
	fi

	echo "Arguments:"
	echo "   --help                  Displays this message and exits."
	echo "   --verbose               Displays information about every startrails created."
	echo "   --directory dir         Put the test startrails images in the specified directory."
	echo "                           If the directory already exists you are prompted to first"
	echo "                           delete its contents.  Default: '${OUT_DIRECTORY}'."
	echo "   --input dir             The directory to get pictures from.  Default: '${IN_DIRECTORY}'."
	echo "   --num-images n          The number of images to use in the startrails.  Default: ${d_COUNT}."
	echo "   --thresholds '1 2 3'    Use the specified Brightness Thresholds.  Must quote the numbers."
	echo "                           Default: '${d_THRESHOLDS}'."

	echo
	echo "Creates multiple startrails files using different 'Brightness Threshold' values."
	echo "This is useful when startrails images don't show any trails and you need"
	echo "to determine what 'Brightness Threshold' to use."
	echo

	exit "${RET}"
}

OK="true"
DO_HELP="false"
VERBOSE="false"
HTML="false"
OUT_DIRECTORY="${ALLSKY_IMAGES}/test_startrails"	# Must start with "test"
IN_DIRECTORY="${ALLSKY_IMAGES}/$( date -d '12 hours ago' +'%Y%m%d' )"
COUNT="";			d_COUNT="20"
THRESHOLDS=""
# Calculate default based on the current value.
THRESHOLD="$( settings ".startrailsbrightnessthreshold" )"
d_THRESHOLDS="${THRESHOLD}"
i=1
while [[ ${i} -le 7 ]];
do
	THRESHOLD="$( gawk -v T="${THRESHOLD}" 'BEGIN { printf("%0.2f", T + 0.03); }' )"
	d_THRESHOLDS+=" ${THRESHOLD}"
	(( i++ ))
done
while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
		--help)
			DO_HELP="true"
			;;
		--verbose)
			VERBOSE="true"
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
		--thresholds)
			# To avoid having spaces in the argument the invoker may use "_" instead.
			THRESHOLDS="${2//_/ }"
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
if [[ ${HTML} == "true" &&
		( -z ${IN_DIRECTORY} || -z ${COUNT} || -z ${THRESHOLDS} ) ]]; then
	echo "<p style='color: red'>All settings must be specified on the command line.</p>" >&2
	usage_and_exit 2
fi

# Prompt for missing data.
if [[ -z ${IN_DIRECTORY} ]]; then
	echo -en  "${cYELLOW}${cBOLD}"
	echo "Enter the name of directory to use for input images."
	echo "If you enter a name that does not begin with '/' it's assumed to be in '${ALLSKY_IMAGES}'."
	echo -en "\nEnter directory: ${cNC}"

	while true
	do
		# shellcheck disable=SC2034
		read -r IN_DIRECTORY
		if [[ -z ${IN_DIRECTORY} ]]; then
			echo -e "\nYou must enter a directory name.\n" >&2
		elif [[ ${IN_DIRECTORY} == "q" ]]; then
			exit 0
		else
			if [[ ${IN_DIRECTORY:0:1} != "/" ]]; then
				IN_DIRECTORY="${ALLSKY_IMAGES}/${IN_DIRECTORY}"
			fi
			if [[ ! -d ${IN_DIRECTORY} ]]; then
				echo -e "\nDirectory '${IN_DIRECTORY}' does not exist.\n" >&2
			else
				break
			fi
		fi
		echo "Enter directory name: "
	done
fi
if [[ -z ${COUNT} ]]; then
	while true
	do
		echo -en "${cYELLOW}${cBOLD}"
		echo -n  "Enter the number of images to include in the startrails or leave blank for ${d_COUNT}"
		echo -en ": ${NC}"

		# shellcheck disable=SC2034
		read -r COUNT
		if [[ ${COUNT} == "q" ]]; then
			exit 0
		elif [[ -z ${COUNT} ]]; then
			COUNT="${d_COUNT}"
			break
		else
			break
		fi
	done
fi
if [[ -z ${THRESHOLDS} ]]; then
	while true
	do
		echo -en "${cYELLOW}${cBOLD}"
		echo -n  "Enter one or more space-separated thresholds to use or leave blank for ${d_THRESHOLDS}"
		echo -en ": ${NC}"

		# shellcheck disable=SC2034
		read -r THESHOLDS
		if [[ ${THESHOLDS} == "q" ]]; then
			exit 0
		elif [[ -z ${THESHOLDS} ]]; then
			THRESHOLDS="${d_THRESHOLDS}"
			break
		else
			break
		fi
	done
fi

# Create / empty the output directory.
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
elif [[ ! -d ${OUT_DIRECTORY} ]]; then
	sudo mkdir -p "${OUT_DIRECTORY}"
fi
# Always do these in case the directory already exists but isn't the right permissions.
sudo chmod 775 "${OUT_DIRECTORY}"
sudo chown "${ALLSKY_OWNER}:${WEBSERVER_GROUP}" "${OUT_DIRECTORY}"


# Create the list of images.

### TODO: replace with DB query.  Add intelligence to list, e.g., night only, ...

IMAGES="${OUT_DIRECTORY}/images.txt"
find "${IN_DIRECTORY}" -type f -name "*.${ALLSKY_EXTENSION}" 2>/dev/null | head -"${COUNT}" > "${IMAGES}"
if [[ ! -s ${IMAGES} ]]; then
	echo -e "${ME}: ERROR: no images found in '${IN_DIRECTORY}' with extension '.${ALLSKY_EXTENSION}'." >&2
	exit 1
fi

# Check for input errors
ERRORS=""
THRESHOLDS=" ${THRESHOLDS} "		# makes easier to remove entries
T="${THRESHOLDS}"
for THRESHOLD in ${T}
do
	if ! is_number "${THRESHOLD}" ; then
		ERRORS+="* Brightness Threshold '${THRESHOLD}' is not a number so ignoring it.\n"
		THRESHOLDS="${THRESHOLDS/ ${THRESHOLD} /}"
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

# Create the startrails.
NUM_CREATED=0
for THRESHOLD in ${THRESHOLDS}
do
	OUTPUT="${OUT_DIRECTORY}/startrails_${THRESHOLD}.jpg"
	MSG="$( "${ALLSKY_BIN}/startrails" \
		--images "${IMAGES}" \
		--output "${OUTPUT}" \
		--brightness "${THRESHOLD}" 2>&1 )"
	RET=$?
	if [[ ${RET} -eq 0 || ${RET} -eq ${EXIT_PARTIAL_OK} ]]; then
		(( NUM_CREATED++ ))
		echo "Created '${OUTPUT}' with Brightness Threshold of ${THRESHOLD}."
		if [[ ${VERBOSE} == "true" ]]; then
			indent "${MSG}"
		fi

		# Get the number of images used.  Output:
		# startrails: Minimum: 1.0   maximum: 2.0   mean: 3.0   median: 4.0 
		#		numImagesUsed: 0   numImagesNotUsed: 15   threshold: 0.3
		NUM_USED="$( echo "${MSG}" | gawk '{
				if ($2 == "Minimum:") printf("%d", $11);
			}'
		)"

		# Add text
		TEXT="Brightness Threshold: ${THRESHOLD}"
		TEXT+="\n${NUM_USED} of ${COUNT} images used."
		addTextToImage "${OUTPUT}" "${OUTPUT}" "${TEXT}" 2>&1
	else
		echo -e "ERROR: Unable to make startrails.  Quitting." >&2
		remove_colors "${MSG}" >&2
		exit 3
	fi
done

if [[ ${NUM_CREATED} -gt 0 ]]; then
	if [[ ${HTML} == "true" ]]; then
		echo "<p>"
		DAY="$( basename "${OUT_DIRECTORY}" )"
		echo -n "Click <a href='/helpers/show_images.php?_ts=${RANDOM}"
		echo -n "&day=${DAY}&pre=startrails_&type=Test Startrails"
		echo    "'>here</a> to see the results."
	else
		echo -e "\nThe ${NUM_CREATED} startrails image(s) are in '${OUT_DIRECTORY}'.\n"
	fi
fi

exit 0
