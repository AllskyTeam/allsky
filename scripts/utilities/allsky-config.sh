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
DEBUG="false"

while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
		--help)
			DO_HELP="true"
			;;

		--debug)
			DEBUG="true"
			;;

		-*)
			echo -e "${RED}${ME}: Unknown argument '${ARG}'.${NC}" >&2
			OK="false"
			;;

		*)
			CMD="${ARG}"
			shift
			# shellcheck disable=SC2124
			CMD_ARGS="${@}"
			break;
			;;
	esac
	shift
done

function usage_and_exit()
{
	local RET=${1}
	
	exec 2>&1
	echo
	[[ ${RET} -ne 0 ]] && echo -en "${RED}"
	echo "Usage: ${ME} [--help] [--debug] [command [--help] [arguments ...]]"
	[[ ${RET} -ne 0 ]] && echo -en "${NC}"
	echo -e "\n	where:"
	echo -e "	'--help' displays this message and exits."
	echo -e "	'--debug' displays debugging information."
	echo -e "	'command' is a command to execute with optional arguments.  Choices are:"
	echo -e "		show_supported_cameras  RPi | ZWO"
	echo -e "		show_connected_cameras"
	echo -e "		prepare_logs"
	echo -e "		recheck_swap"
	echo -e "		recheck_tmp"
	echo -e "		samba"
	echo -e "		new_rpi_camera_info [--camera NUM]"
	echo -e "		show_start_times [--zero] [angle [latitude [longitude]]]"
	echo -e "	If no 'command' is specified you are prompted for one to execute."
	echo

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
	# shellcheck disable=SC2124
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

	# shellcheck disable=SC2086
	show_supported_cameras.sh ${ARGS}
}

#####
# Show all the currently connected cameras.
function show_connected_cameras()
{
	get_connected_cameras_info "true" > "${CONNECTED_CAMERAS_INFO}"

	local CAMERAS="$( get_connected_camera_models --full "both" )"
	if [[ -z ${CAMERAS} ]]; then
		echo -e "\nThere are no cameras connected to the Pi."
	else
		local FORMAT="%-6s %-8s %s\n"
		echo
		# shellcheck disable=SC2059
		printf "${FORMAT}" "Type" "Number" "Model"
		# shellcheck disable=SC2059
		printf "${FORMAT}" "====" "======" "====="
		echo -e "${CAMERAS}" | while read -r TYPE NUM MODEL
			do
				# shellcheck disable=SC2059
				printf "${FORMAT}" "${TYPE}" "${NUM}" "${MODEL}"
			done
	fi
}

#####
# Prepare Allsky for troubleshooting.
# Stop it, then truncate the log files and restart Allsky.
function prepare_logs()
{
	local NEW_DEBUG=3

	stop_Allsky
	sudo truncate -s 0 "${ALLSKY_LOG}"
	sudo truncate -s 0 "${ALLSKY_PERIODIC_LOG}"
	local OLD_DEBUG=$( settings ".debuglevel" )
	local MSG=""
	if [[ ${OLD_DEBUG} -ne ${NEW_DEBUG} ]]; then
		update_json_file ".debuglevel"  "${NEW_DEBUG}"  "${SETTINGS_FILE}"  "number"
		MSG=" and Debug Level of ${NEW_DEBUG} (prior level was ${OLD_DEBUG})"
	fi
	start_Allsky

	echo -e "\nAllsky restarted with empty log files${MSG}."
}

#####
# Show all the currently connected cameras.
function new_rpi_camera_info()
{
	# shellcheck disable=SC2124
	local ARGS="${@}"		# optional

	# shellcheck disable=SC2086
	get_RPi_camera_info.sh ${ARGS}
}

#####
# Install SAMBA.
function samba()
{
	installSamba.sh
}

#####
# Show the daytime and nighttime start times
function show_start_times()
{
	local DO_HELP="false"
	local ZERO=""
	local ANGLE=""
	local LATITUDE=""
	local LONGITUDE=""

	while [[ $# -gt 0 ]]; do
		ARG="${1}"
		case "${ARG,,}" in
			--help)
				DO_HELP="true"
				;;

			--zero)
				ZERO="${ARG}"
				;;

			--angle)
				ANGLE="${2}"
				shift
				;;

			--latitude)
				LATITUDE="${2}"
				shift
				;;

			--longitude)
				LONGITUDE="${2}"
				shift
				;;

			-*)
				echo -e "${RED}${ME}: Unknown argument '${ARG}'.${NC}" >&2
				OK="false"
				;;
		esac
		shift
	done

	if [[ ${DO_HELP} == "true" ]]; then
		echo
		echo "Usage: ${ME}  ${FUNCNAME[0]} [--zero]  [ --angle A]  [--latitude LAT]  [--longitude LONG]"
		echo "Where:"
		echo "    '--zero' will also show times for Angle 0."
		echo "By default, the Angle, Latitude, and Longitude in the WebUI will be use."
		echo "You can override any of those via the command line."
		echo

		return
	fi

	#shellcheck disable=SC2086
	get_sunrise_sunset ${ZERO} "${ANGLE}" "${LATITUDE}" "${LONGITUDE}"
}

#####
# recheck_tmp and recheck_swap are functions defined elsewhere.

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
function run_command()
{
	COMMAND="${1}"
	shift
	# shellcheck disable=SC2124
	ARGUMENTS="${@}"
	if ! type "${COMMAND}" > /dev/null 2>&1 ; then
		echo -e "\n${RED}${ME}: Unknown command '${COMMAND}'.${NC}" >&2
		return 1
	fi

	if [[ ${DEBUG} == "true" ]]; then
		echo -e "${YELLOW}"
		echo -e "Executing: ${COMMAND} ${ARGUMENTS}:\n"
		echo -e "${NC}"
	fi

	#shellcheck disable=SC2086
	"${COMMAND}" ${ARGUMENTS}
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
		18 "${WT_WIDTH:-80}" "${NUM_OPTIONS}" -- "${OPTIONS[@]}" 3>&1 1>&2 2>&3 )"
	RET=$?
	if [[ ${RET} -eq 255 ]]; then
		echo -e "\n${RED}${ME}: whiptail failed.${NC}" >&2
		exit 2
	else
		echo "${OPT}"
		return "${RET}"
	fi
}


####################################### Main part of program

if [[ -z ${CMD} ]]; then
	# No command given on command line so prompt for one.

	PROMPT="\nSelect a command to run:"
	CMDS=(); N=1
	CMDS+=("show_supported_cameras"		"${N}. Show supported cameras"); ((N++))
	CMDS+=("show_connected_cameras"		"${N}. Show connected cameras"); ((N++))
	CMDS+=("prepare_logs"				"${N}. Prepare log files for troubleshooting"); ((N++))
	CMDS+=("recheck_swap"				"${N}. Add swap space"); ((N++))
	CMDS+=("recheck_tmp"				"${N}. Move ~/allsky/tmp to memory"); ((N++))
	CMDS+=("samba"						"${N}. Simplify copying files to/from the Pi"); ((N++))
	CMDS+=("new_rpi_camera_info"		"${N}. Collect information for new RPi camera"); ((N++))
	CMDS+=("show_start_times"	 		"${N}. Show daytime and nighttime start times"); ((N++))

	# If the user selects "Cancel" prompt() returns 1 and we exit the loop.
	while COMMAND="$( prompt "${PROMPT}" "${CMDS[@]}" )"
	do
		run_command "${COMMAND}"
		RET=$?

		[[ ${ALLOW_MORE_COMMANDS} == "false" ]] && exit "${RET}"
		while true; do
			echo -e "\n\n"
			echo -e "${YELLOW}${BOLD}"
			echo    "=========================================="
			echo -n "Press RETURN to continue or 'q' to quit: "
			read -r x
			echo -e "${NC}"
			[[ ${x:0:1} == "q" ]] && exit 0
			if [[ -n ${x} ]]; then
				echo "'${x}' is not a valid response; try again."
			else
				break
			fi
		done
	done
	exit 0

else
	#shellcheck disable=SC2086
	run_command "${CMD}" ${CMD_ARGS}
	exit $?
fi
