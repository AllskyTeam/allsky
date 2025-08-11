#!/bin/bash

#### TODO: remove the "old" way of determining what settings to use. It was too confusing.










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
#	USAGE+=" [--start-amount a] [--step-amount a] [--count-amount c]"
#	USAGE+=" [--start-midpoint m] [--step-midpoint m] [--count-midpoint m]"
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
#	echo "   --start-amount a    The initial Stretch Amount to use.  Default: ${START_AMOUNT}."
#	echo "   --step-amount a     The amount to increase the Stretch Amount.  Default: ${STEP_AMOUNT}."
#	echo "   --count-amount      The number of times to vary the Stretch Amount.  Default: ${COUNT_AMOUNT}."
#	echo "   --start-midpoint m  The initial Stretch Mid Point to use.  Default: ${START_MIDPOINT}."
#	echo "   --step-midpoint m   The maximum Stretch Mid Point to use.  Default: ${STEP_MIDPOINT}."
#	echo "   --count-midpoint    The number of times to vary the Stretch Mid Point.  Default: ${COUNT_MIDPOINT}."
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
OUT_DIRECTORY="${ALLSKY_IMAGES}/test_stretches"	# Must start with "test"
IMAGE="";			d_IMAGE="${ALLSKY_TMP}/${ALLSKY_FULL_FILENAME}"
AMOUNTS="";			d_AMOUNTS="5  10  15  20"
MIDPOINTS="";		d_MIDPOINTS="10  30  50"
if false; then		#############
START_AMOUNT="";	d_START_AMOUNT="5"
STEP_AMOUNT="";		d_STEP_AMOUNT="5"		# increase by this amount
COUNT_AMOUNT="";	d_COUNT_AMOUNT="4"
START_MIDPOINT="";	d_START_MIDPOINT="5"
STEP_MIDPOINT="";	d_STEP_MIDPOINT="5"
COUNT_MIDPOINT="";	d_COUNT_MIDPOINT="4"
fi ############
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
###
		--start-amount)
			START_AMOUNT="${2}"
			shift
			;;
		--step-amount)
			STEP_AMOUNT="${2}"
			shift
			;;
		--count-amount)
			COUNT_AMOUNT="${2}"
			shift
			;;
		--start-midpoint)
			START_MIDPOINT="${2}"
			shift
			;;
		--step-midpoint)
			STEP_MIDPOINT="${2}"
			shift
			;;
		--count-midpoint)
			COUNT_MIDPOINT="${2}"
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
#			|| -z ${START_AMOUNT}   || -z ${STEP_AMOUNT}   || -z ${COUNT_AMOUNT}
#			|| -z ${START_MIDPOINT} || -z ${STEP_MIDPOINT} || -z ${COUNT_MIDPOINT} ) ]]; then
	echo "All settings must be specified on the command line." >&2
	echo "You are missing:" >&2
	[[ -z ${IMAGE} ]] && echo " --image" >&2
	[[ -z ${AMOUNTS} ]] && echo " --amounts" >&2
	[[ -z ${MIDPOINTS} ]] && echo " --midpoints" >&2
#	[[ -z ${START_AMOUNT} ]] && echo " --start-amount" >&2
#	[[ -z ${STEP_AMOUNT} ]] && echo " --step-amount" >&2
#	[[ -z ${COUNT_AMOUNT} ]] && echo " --count-amount" >&2
#	[[ -z ${START_MIDPOINT} ]] && echo " --start-midpoint" >&2
#	[[ -z ${STEP_MIDPOINT} ]] && echo " --step-midpoint" >&2
#	[[ -z ${COUNT_MIDPOINT} ]] && echo " --count-midpoint" >&2
	
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
			IMAGE="${DEFAULT}"
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
	AMOUNTS="$( get_number "Enter the initial amount to stretch" "${d_AMOUNTS}" )"
	[[ $? -ne 0 ]] && exit 0
fi
if [[ -z ${MIDPOINTS} ]]; then
	MIDPOINTS="$( get_number "Enter the initial amount to stretch" "${d_MIDPOINTS}" )"
	[[ $? -ne 0 ]] && exit 0
fi

if false; then		#############
function get_number()
{
	local PROMPT="${1}"
	local DEFAULT="${2}"

	while true
	do
		echo -en "${cYELLOW}${cBOLD}${PROMPT}" >&2
		[[ -n ${DEFAULT} ]] && echo -n " or leave blank for ${DEFAULT}" >&2
		echo -en ": ${cNC}" >&2

		# shellcheck disable=SC2034
		read -r NUM
		if [[ ${NUM} == "q" ]]; then
			return 1
		elif [[ -z ${NUM} ]]; then
			if [[ -n ${DEFAULT} ]]; then
				echo "${DEFAULT}"
				return 0
			fi
		elif echo "${NUM}" | grep --silent "\.,"; then
			echo -e "\nYou must enter a number without a decimal point." >&2
		else
			echo "${NUM}"
			return 0
		fi
	done
}

if [[ -z ${START_AMOUNT} ]]; then
	START_AMOUNT="$( get_number "Enter the initial amount to stretch" "${d_START_AMOUNT}" )"
	[[ $? -ne 0 ]] && exit 0
fi
if [[ -z ${STEP_AMOUNT} ]]; then
	STEP_AMOUNT="$( get_number "Enter the amount to change the stretch amount each time" "${d_STEP_AMOUNT}" )"
	[[ $? -ne 0 ]] && exit 0
fi
if [[ -z ${COUNT_AMOUNT} ]]; then
	COUNT_AMOUNT="$( get_number "Enter the number of times to vary the Amount" "${d_COUNT_AMOUNT}" )"
	[[ $? -ne 0 ]] && exit 0
fi

if [[ -z ${START_MIDPOINT} ]]; then
	START_MIDPOINT="$( get_number "Enter the initial midpoint" "${d_START_MIDPOINT}" )"
	[[ $? -ne 0 ]] && exit 0
fi
if [[ -z ${STEP_MIDPOINT} ]]; then
	STEP_MIDPOINT="$( get_number "Enter the amount to change the stretch midpoint each time" "${d_STEP_MIDPOINT}" )"
	[[ $? -ne 0 ]] && exit 0
fi
if [[ -z ${COUNT_MIDPOINT} ]]; then
	COUNT_MIDPOINT="$( get_number "Enter the number of times to vary the Mid Point" "${d_COUNT_MIDPOINT}" )"
	[[ $? -ne 0 ]] && exit 0
fi
fi	####################

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

if false; then #####################
# Determine what values to use for Amount and Mid Point.
A="${START_AMOUNT}"
AMOUNTS="${A}"
ON=1
while [[ ${ON} -lt ${COUNT_AMOUNT} ]]
do
	(( A += STEP_AMOUNT ))
	AMOUNTS+=" ${A}"
	(( ON++ )) 
done

M="${START_MIDPOINT}"
MIDPOINTS="${M}"
ON=1
while [[ ${ON} -lt ${COUNT_MIDPOINT} ]]
do
	(( M += STEP_MIDPOINT ))
	MIDPOINTS+=" ${M}"
	(( ON++ )) 
done
fi ######################

# Check for input errors
ERRORS=""
AMOUNTS=" ${AMOUNTS} "		# makes easier to remove entries
A="${AMOUNTS}"
for AMOUNT in ${A}
do
	if ! is_number "${AMOUNT}" ; then
		ERRORS+="* Amount '${AMOUNT}' is not a number so ignoring it.\n"
		AMOUNTS="${AMOUNTS/ ${AMOUNT} /}"
	fi
done
MIDPOINTS=" ${MIDPOINTS} "
M="${MIDPOINTS}"
for MIDPOINT in ${M}
do
	if ! is_number "${MIDPOINT}" ; then
		ERRORS+="* Mid Point '${MIDPOINT}' is not a number so ignoring it.\n"
		MIDPOINTS="${MIDPOINTS/ ${MIDPOINT} /}"
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
# First do a "no stretch" version so the user can compare.
FILE="stretch__NO_STRETCH.jpg"
OUTPUT="${OUT_DIRECTORY}/${FILE}"
cp "${IMAGE}" "${OUTPUT}"
echo "Created '${FILE}' with NO STRETCH, for comparison."

HOW="-sigmoidal-contrast"	# the way to stretch
NUM_CREATED=0
for AMOUNT in ${AMOUNTS}
do
	for MIDPOINT in ${MIDPOINTS}
	do
		FILE="stretch_amount_${AMOUNT}_midpoint_${MIDPOINT}.jpg"
		OUTPUT="${OUT_DIRECTORY}/${FILE}"
		MSG="$( convert "${IMAGE}" "${HOW}" "${AMOUNT}x${MIDPOINT}" "${OUTPUT}" 2>&1 )"
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
