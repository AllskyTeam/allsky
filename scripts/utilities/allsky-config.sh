#!/bin/bash

# This scripts is similar to "raspi-config" but for Allsky.
# It's a command-line method to view and set certain Allsky items.

# Allow this script to be executed manually, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/installUpgradeFunctions.sh"	|| exit "${EXIT_ERROR_STOP}"

# allow user to select additional commands after 1st one?
ALLOW_MORE_COMMANDS="true"

OK="true"
DO_HELP="false"
CMD=""
CMD_ARGS=""

while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
		--help)
			DO_HELP="true"
			;;

		-*)
			echo -e "${RED}${ME}: Unknown argument '${ARG}'.${NC}" >&2
			OK="false"
			;;

		*)
			CMD="${ARG}"
			shift
			CMD_ARGS="${@}"
			break;
			;;
	esac
	shift
done

usage_and_exit()
{
	local RET=${1}
	{
		echo
		[[ ${RET} -ne 0 ]] && echo -en "${RED}"
		echo "Usage: ${ME} [--help] [command [--help] [arguments ...]]"
		[[ ${RET} -ne 0 ]] && echo -en "${NC}"
		echo -e "\n	where:"
		echo -e "	'--help' displays this message and exits."
		echo -e "	'command' is a command to execute with optional arguments.  Choices are:"
		echo -e "		show_supported_cameras  RPi | ZWO"
		echo -e "		show_connected_cameras"
		echo -e "		recheck_swap"
		echo -e "		recheck_tmp"
		echo -e "		samba"
		echo -e "		new_rpi_camera_info [--camera NUM]"
		echo -e "	If no 'command' is specified you are prompted for one to execute."
	} >&2
	exit "${RET}"
}

[[ ${DO_HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" ]] && usage_and_exit 1
PATH="${PATH}:${ALLSKY_UTILITIES}"

####################################### Functions - one per command

#####
# Show all the supported cameras.
function show_supported_cameras()
{
	local ARGS="${@}"

	#shellcheck disable=SC2086
	if needs_arguments ${ARGS} ; then
		PROMPT="\nSelect the camera(s) to show:"
		OPTS=()
		OPTS+=("--RPi"			"RPi and compatible")
		OPTS+=("--ZWO"			"ZWO (very long list)")
		OPTS+=("--RPi --ZWO"	"both")

		# If the user selects "Cancel" prompt() returns 1 and we exit the loop.
		ARGS="$( prompt "${PROMPT}" "${OPTS[@]}" )"
	fi

	#shellcheck disable=SC2086
	show_supported_cameras.sh ${ARGS}
}

#####
# Show all the currently connected cameras.
function show_connected_cameras()
{
	get_connected_cameras_info
}

#####
# Show all the currently connected cameras.
function new_rpi_camera_info()
{
	local ARGS="${@}"		# optional

	# Make sure the user sees the output, so don't allow more commands.
	ALLOW_MORE_COMMANDS="false"

	#shellcheck disable=SC2086
	get_RPi_camera_info.sh ${ARGS}
}

#####
# Install SAMBA.
function samba()
{
	installSamba.sh
}


####################################### Helper functions

# Check if the required argument(s) were given to this command.
# If called via the command line it's an error if no arguments
# were given, so exit since we can't prompt (we may be called by another program).
# If called via a menu item there normally WON'T be an argument so
# return 0 which tells the caller it needs to prompt for the arguments.
function needs_arguments()
{
	if [[ $# -eq 0 ]]; then
		if [[ -n ${CMD} ]]; then		# CMD is global
			echo -e "\n${RED}'${FUNCNAME[1]}' requires an argument.${NC}" >&2
			usage_and_exit 1
		else
			echo "${@}"
		fi

		return 0
	else
		return 1
	fi
}

#####
# Run a command / function, passing any arguments.
function do_command()
{
	COMMAND="${1}"
	shift
	ARGUMENTS="${@}"
	if ! type "${COMMAND}" > /dev/null 2>&1 ; then
		echo -e "\n${RED}${ME}: Unknown command '${COMMAND}'.${NC}" >&2
		return 1
	fi

	#shellcheck disable=SC2086
	eval "${COMMAND}" ${ARGUMENTS}
}


#####
# Prompt for a command or argument
function prompt()
{
	PROMPT="${1}"
	shift
	OPTIONS=("${@}")

	TITLE="*** Allsky Configuration ***"
	NUM_OPTIONS=$(( (${#OPTIONS[@]} / 2) + 3 ))

	OPT="$( whiptail --title "${TITLE}" --notags --menu "${PROMPT}" \
		15 "${WT_WIDTH:-80}" "${NUM_OPTIONS}" -- "${OPTIONS[@]}" 3>&1 1>&2 2>&3 )"
	RET=$?
	if [[ ${RET} -eq 255 ]]; then
		echo -e "\n${RED}${ME}: whiptail failed.${NC}" >&2
		exit 2
	else
		echo "${OPT}"
		return ${RET}
	fi
}


####################################### Main part of program

if [[ -z ${CMD} ]]; then
	# No command given on command line so prompt for one.

	PROMPT="\nSelect a command to run:"
	CMDS=()
	CMDS+=("show_supported_cameras"		"Show supported cameras")
	CMDS+=("get_connected_cameras_info"	"Show connected cameras")
	CMDS+=("recheck_swap"				"Add swap space")
	CMDS+=("recheck_tmp"				"Move ~/allsky/tmp to memory")
	CMDS+=("samba"						"Simplify copying files to/from the Pi")
	CMDS+=("new_rpi_camera_info"		"Collect information for new RPi camera")

	# If the user selects "Cancel" prompt() returns 1 and we exit the loop.
	while COMMAND="$( prompt "${PROMPT}" "${CMDS[@]}" )"
	do
		do_command "${COMMAND}"
		RET=$?

		[[ ${ALLOW_MORE_COMMANDS} == "false" ]] && exit ${RET}
		echo -e "\n\n"
		echo -e "${YELLOW}${BOLD}"
		echo    "=========================================="
		echo -n "Press RETURN to continue or 'q' to quit: "
		read -r x
		echo -e "${NC}"
		[[ ${x:0:1} == "q" ]] && exit 0
	done
	exit 0

else
	#shellcheck disable=SC2086
	do_command "${CMD}" ${CMD_ARGS}
	exit $?
fi
