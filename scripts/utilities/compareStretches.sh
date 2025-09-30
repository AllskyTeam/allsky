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
	local USAGE="Usage: ${ME} [--help] --verbose] [--image i]"
	USAGE+=" [--amounts '1 2 3'] [--midpoints '4 5 6']"
	USAGE+=" [--directory dir]"
	if [[ ${RET} -ne 0 ]]; then
		E_ "${USAGE}"
	else
		echo -e "${USAGE}"
	fi

	echo "Arguments:"
	echo "   --help              Displays this message and exits."
	echo "   --verbose           Displays information about every startrails created."
	echo "   --image i           Stretch the specified image."
	echo "   --amounts '1 2 3'   Use the specified Stretch Amounts.  Must quote the numbers."
	echo "                           Default: '${AMOUNTS}'."
	echo "   --midpoints '1 2 3' Use the specified Stretch Amounts.  Must quote the numbers."
	echo "                           Default: '${MIDPOINTS}'."
	echo "   --directory dir     Put the stretched images in the specified directory."
	echo "                       Default: '${OUT_DIRECTORY}'."

	echo
	echo -n "Creates multiple stretched images using different 'Stretch Amount' and"
	echo "'Stretch Mid Point' values."
	echo "This is useful when trying to determine how much to brighten an image."
	echo

	exit "${RET}"
}

OK="true"
DO_HELP="false"
HTML="false"
CREATE_NO_STRETCH_IMAGE="true"
OUT_DIRECTORY="${ALLSKY_IMAGES}/test_stretches"	# Must start with "test"
IMAGE="";			d_IMAGE="${ALLSKY_CURRENT_DIR}/${ALLSKY_FULL_FILENAME}"
AMOUNTS="";			d_AMOUNTS="5  10  15  20"
MIDPOINTS="";		d_MIDPOINTS="10  30  50"
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
		--image)
			IMAGE="${2}"
			shift
			;;
		--amounts)
			# To avoid having spaces in the argument the invoker may use "_" instead.
			AMOUNTS="${2//_/ }"
			shift
			;;
		--midpoints)
			MIDPOINTS="${2//_/ }"
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
		( -z ${IMAGE}
			|| -z ${AMOUNTS}   || -z ${MIDPOINTS} ) ]]; then
	echo "All settings must be specified on the command line." >&2
	echo "You are missing:" >&2
	[[ -z ${IMAGE} ]] && echo " --image" >&2
	[[ -z ${AMOUNTS} ]] && echo " --amounts" >&2
	[[ -z ${MIDPOINTS} ]] && echo " --midpoints" >&2
	
	usage_and_exit 2
fi

# Prompt for missing data.
if [[ -z ${IMAGE} ]]; then
	echo -en  "${cYELLOW}${cBOLD}"
	echo -en "Enter the name of a file to stretch or leave blank for '${d_IMAGE}': ${cNC}"

	while true
	do
		# shellcheck disable=SC2034
		read -r IMAGE
		if [[ ${IMAGE} == "q" ]]; then
			exit 0
		elif [[ -z ${IMAGE} ]]; then
			IMAGE="${d_IMAGE}"
			break;
		elif [[ ! -f ${IMAGE} ]]; then
			echo -e "\nFile '${IMAGE}' does not exist.\n" >&2
		else
			break
		fi
		echo "Enter image name: "
	done
fi

function get_numbers()
{
	local PROMPT="${1}"
	local DEFAULT="${2}"

	while true
	do
		echo -en "${cYELLOW}${cBOLD}${PROMPT}" >&2
		[[ -n ${DEFAULT} ]] && echo -n " or leave blank for ${DEFAULT}" >&2
		echo -en ": ${cNC}" >&2

		# shellcheck disable=SC2034
		read -r NUMBERS
		if [[ ${NUMBERS} == "q" ]]; then
			return 1
		elif [[ -z ${NUMBERS} ]]; then
			if [[ -n ${DEFAULT} ]]; then
				echo "${DEFAULT}"
				return 0
			fi
		else
			echo "${NUMBERS}"
			return 0
		fi
	done
}
if [[ -z ${AMOUNTS} ]]; then
	AMOUNTS="$( get_numbers "Enter the initial amount to stretch" "${d_AMOUNTS}" )"
	[[ $? -ne 0 ]] && exit 0
fi
if [[ -z ${MIDPOINTS} ]]; then
	MIDPOINTS="$( get_numbers "Enter the initial amount to stretch" "${d_MIDPOINTS}" )"
	[[ $? -ne 0 ]] && exit 0
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


# Check for input errors
ERRORS=""
AMOUNTS=" ${AMOUNTS} "		# Adding spaces makes easier to remove entries
A="${AMOUNTS}"
for AMOUNT in ${A}
do
	if ! is_number "${AMOUNT}" ; then
		ERRORS+="* Amount '${AMOUNT}' is not a number so ignoring it.\n"
		AMOUNTS="${AMOUNTS/ ${AMOUNT} /}"
	elif [[ ${AMOUNT} -lt 10 && ${AMOUNT} -gt 0 ]]; then
		# Make sure numbers are all 2-digit so they sort correctly.
		AMOUNTS="${AMOUNTS/ ${AMOUNT} / 0${AMOUNT} }"
	fi
done
MIDPOINTS=" ${MIDPOINTS} "
M="${MIDPOINTS}"
for MIDPOINT in ${M}
do
	if ! is_number "${MIDPOINT}" ; then
		ERRORS+="* Mid Point '${MIDPOINT}' is not a number so ignoring it.\n"
		MIDPOINTS="${MIDPOINTS/ ${MIDPOINT} /}"
	elif [[ ${MIDPOINT} -lt 10 ]]; then
		MIDPOINTS="${MIDPOINTS/ ${MIDPOINT} / 0${MIDPOINT} }"
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

# Create the stretches.

HOW="-sigmoidal-contrast"	# the way to stretch

function doImage()
{
	local FROM_FILE="${1}"
	local TO_FILE="${2}"
	local A="${3}"
	local M="${4}"
	local TEXT

	# Want fixed-width font so the data lines up.
	if [[ -z ${TEXT} ]]; then
		   TEXT="Stretch Amount: ${A}"
		TEXT+="\nMid Point:      ${M}"
	fi
	addTextToImage --extra-args "${HOW} ${A}x${M}" "${FROM_FILE}" "${TO_FILE}" "${TEXT}" 2>&1
}

if [[ ${CREATE_NO_STRETCH_IMAGE} == "true" ]]; then
	# Do a "no stretch" version so the user can compare.
	FILE="stretch_NO_STRETCH.jpg"
	OUTPUT="${OUT_DIRECTORY}/${FILE}"
	doImage "${IMAGE}"  "${OUTPUT}" 0 0 "NO STRETCH"
	echo "Created '${FILE}' with NO STRETCH, for comparison."
fi

NUM_CREATED=0
for AMOUNT in ${AMOUNTS}
do
	for MIDPOINT in ${MIDPOINTS}
	do
		FILE="stretch_amount_${AMOUNT}_midpoint_${MIDPOINT}.jpg"
		OUTPUT="${OUT_DIRECTORY}/${FILE}"
		MSG="$( doImage "${IMAGE}" "${OUTPUT}" "${AMOUNT}" "${MIDPOINT}" "" 2>&1 )"
		RET=$?
		if [[ ${RET} -eq 0 ]]; then
			(( NUM_CREATED++ ))
			echo "Created '${FILE}' with Amount ${AMOUNT} and Midpoint ${MIDPOINT}."
		else
			echo -e "ERROR: Unable to make stretched image.  Quitting." >&2
			echo -e "${MSG}" >&2
			exit 3
		fi
	done
done

if [[ ${NUM_CREATED} -gt 0 ]]; then
	if [[ ${HTML} == "true" ]]; then
		echo "<p>"
		echo "All images are in '${OUT_DIRECTORY}'."
		echo "</p>"

		echo "<p>"
		DAY="$( basename "${OUT_DIRECTORY}" )"
		echo -n "Click <a href='/helpers/show_images.php?_ts=${RANDOM}"
		echo -n "&day=${DAY}&pre=stretch_&type=Test Stretch"
		echo    "'>here</a> to see the results."
	else
		echo -e "\nThe ${NUM_CREATED} stretched image(s) are in '${OUT_DIRECTORY}'.\n"
	fi
fi

exit 0
