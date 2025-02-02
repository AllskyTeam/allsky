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

TITLE="*** Allsky Configuration ***"

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
			e_ "\nUnknown argument '${ARG}'." >&2
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
	local MSG="Usage: ${ME} [--help] [--debug] [command [--help] [arguments ...]]"
	if [[ ${RET} -ne 0 ]]; then
		e_ "${MSG}"
	else
		echo -e "${MSG}"
	fi
	echo -e "\nwhere:"
	echo -e "  '--help' displays this message and exits."
	echo -e "  '--debug' displays debugging information."
	echo -e "  'command' is a command to execute with optional arguments.  Choices are:"
	echo -e "      show_supported_cameras  RPi | ZWO"
	echo -e "      show_connected_cameras"
	echo -e "      prepare_logs"
	echo -e "      recheck_swap"
	echo -e "      recheck_tmp"
	echo -e "      samba"
	echo -e "      new_rpi_camera_info [--camera NUM]"
	echo -e "      show_start_times [--zero] [angle [latitude [longitude]]]"
	echo -e "      compare_paths --website | --server"
	echo -e "      get_brightness_info"
	echo -e "      encoders"
	echo -e "      pix_fmts"
	echo -e "  If no 'command' is specified you are prompted for one to execute."
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
	showSupportedCameras.sh ${ARGS}
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
	getRPiCameraInfo.sh ${ARGS}
}

#####
# Install SAMBA.
function samba()
{
	installSamba.sh
}

#####
# Move ALLSKY_IMAGES to a new location.
function move_images()
{
	moveImages.sh
}

#####
# Display the path on the server of an Allsky Website and
# display the path on the server give a URL.
function compare_paths()
{
	# shellcheck disable=SC2124
	local ARGS="${@}"

	#shellcheck disable=SC2086
	if needs_arguments ${ARGS} ; then
		PROMPT="\nSelect the machine you want to check:"
		OPTS=()
# TODO: change message and don't prompt when "remoteserverurl" setting is implemented.
		OPTS+=("--website"			"Remote Allsky Website (uses remote 'Website URL')")
		OPTS+=("--server"			"Remote server (you will be prompted for the server's URL)")

		# If the user selects "Cancel" prompt() returns 1 and we exit the loop.
		ARGS="$( prompt "${PROMPT}" "${OPTS[@]}" )"

		if [[ ${ARGS} == "--server" ]]; then
			PROMPT="\nEnter the URL of the server (must begin with 'http' or 'https'):"
			while ! A="$( getInput "${PROMPT}" )" ; do
				echo -e "\nYou must enter a URL."
			done
			ARGS+=" ${A}"
		fi
	fi

	# shellcheck disable=SC2086
	comparePaths.sh ${ARGS}
}

#####
# Display brightness information from the startrails command.
get_brightness_info()
{
	if [[ "$( settings ".startrailsgenerate" )" != "true" ]]; then
		w_ "\nWARNING: The startrails 'Generate' setting is not enabled."
	fi

	# Input format:
	# 2025-01-17T06:20:45.240112-06:00 \
	#	Minimum: 0.0840083   maximum: 0.145526   mean: 0.103463   median: 0.104839
	#	$2       $3          $4       $5         $6    $7         $8      $9

	grep --no-filename "startrails: Minimum" "${ALLSKY_LOG}"* 2> /dev/null |
		sed "s/$(uname -n).*startrails: //" |
		nawk 'BEGIN {
				print; t_min=0; t_max=0; t_mean=0; t_median=0; t_num=0
				numFmt = "%-20s   %.3f      %.3f      %.3f      %.3f\n";
			}
			{
				if (++num == 1) {
					header = sprintf("%-20s  %8s   %8s   %5s       %-s\n",
						"Date", "Minimum", "Maximum", "Mean", "Median");
					printf(header);
					dashes = "-";
					l = length(header) - 2;
					for (i=1; i<=l; i++) {
						dashes = dashes "-";
					}
					printf("%s\n", dashes);
				}

				date = substr($1, 0, 10) "  "  substr($1, 12, 8);
				min = $3;		t_min+= min;
				max = $5;		t_max+= max;
				mean = $7;		t_mean+= mean;
				median = $9;	t_median+= median;
				printf(numFmt, date, min, max, mean, median);
			}
			END {
				if (num == 0) {
					exit 1;
				} else if (num > 1) {
					printf("%s\n", dashes);
					printf(numFmt, "Total average", t_min/num, t_max/num, t_mean/num, t_median/num);
				}
				exit 0;
			}'
	if [[ $? -ne 0 ]]; then
		echo -n "No information found.  "
		local STATUS="$( get_allsky_status )"
		if [[ -z ${STATUS} ]]; then
			echo "Is Allsky running?"
		else
			local TIMESTAMP="$( get_allsky_status_timestamp )"
			echo "Allsky is ${STATUS} as of ${TIMESTAMP:-unknown time}."
		fi
	fi
	echo
}

#####
# recheck_tmp and recheck_swap are functions defined elsewhere.

#####
# List encoders available to timelapses.
function encoders()
{
	ffmpeg -loglevel error -encoders
}

#####
# List pixel formats available to timelapses.
function pix_fmts()
{
	ffmpeg -loglevel error -pix_fmts
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

			--)
				break	# End of arguments
				;;

			--*)
				e_ "${ME}: Unknown argument '${ARG}'." >&2
				OK="false"
				;;

			*)
				break	# Assume angle
				;;
		esac
		shift
	done

	if [[ ${DO_HELP} == "true" ]]; then
		echo
		echo "Usage: ${ME}  ${FUNCNAME[0]} [--zero]  [ --angle A]  [--latitude LAT]  [--longitude LONG]"
		echo "or"
		echo "Usage: ${ME}  ${FUNCNAME[0]} [--zero]  [ angle  [latitude  [longitude]"
		echo "Where:"
		echo "    '--zero' will also show times for Angle 0."
		echo "By default, the Angle, Latitude, and Longitude in the WebUI will be use."
		echo "You can override any of those via the command line."
		echo

		return
	fi

	if [[ $# -gt 0 ]]; then
		ANGLE="$1"
		shift
		if [[ $# -gt 0 ]]; then
			LATITUDE="$1"
			shift
			if [[ $# -gt 0 ]]; then
				LONGITUDE="$1"
				shift
			fi
		fi
	fi

	#shellcheck disable=SC2086
	get_sunrise_sunset ${ZERO} "${ANGLE}" "${LATITUDE}" "${LONGITUDE}"
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
			e_ "\n'${FUNCNAME[1]}' requires an argument." >&2
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
		e_ "\n${ME}: Unknown command '${COMMAND}'." >&2
		return 1
	fi

	if [[ ${DEBUG} == "true" ]]; then
		d_ "Executing: ${COMMAND} ${ARGUMENTS}\n"
	fi

	#shellcheck disable=SC2086
	"${COMMAND}" ${ARGUMENTS}
}



#####
# Prompt for a command or argument from a list.
WT_LINES=$( tput lines )
function prompt()
{
	PROMPT="${1}"
	shift
	OPTIONS=("${@}")

	local NUM_OPTIONS=$(( ${#OPTIONS[@]} / 2 ))
# whiptail's menubox has:
# 2 lines at top
# then the menu (NUM_OPTIONS lines)
# 2 blank lines
# 1 "<Ok> / <Cancel>" line
# 2 blank lines
# If all that doesn't fit in the terminal windows, whiptail does NOT scroll.
	local LINES=$(( 2 + NUM_OPTIONS + 2 + 1 + 2 ))
	if [[ ${LINES} -ge ${WT_LINES} ]]; then
		echo "Please resize you window to at least $(( LINES + 1 )) lines."
		echo "It is only ${WT_LINES} lines now."
	fi >&2

	local OPT="$( whiptail --title "${TITLE}" --notags --menu "${PROMPT}" \
		"${LINES}" "${WT_WIDTH:-80}" "${NUM_OPTIONS}" -- "${OPTIONS[@]}" 3>&1 1>&2 2>&3 )"
	local RET=$?
	if [[ ${RET} -eq 255 ]]; then
		e_ "\n${ME}: whiptail failed." >&2
		exit 2
	else
		echo "${OPT}"
		return "${RET}"
	fi
}

#####
# Prompt for a line of input.
function getInput()
{
	local PROMPT="${1}"

	local LINE="$( whiptail --title "${TITLE}" --inputbox "${PROMPT}" 15 "${WT_WIDTH:-80}" \
		"" 3>&1 1>&2 2>&3 )"
	local RET=$?
	if [[ ${RET} -eq 255 ]]; then
		e_ "\n${ME}: whiptail failed." >&2
		exit 2
	else
		echo "${LINE}"
		return "${RET}"
	fi
}

# Output a list item.
# Uses global ${N}.
function L()
{
	local NAME="${1}"

	local NUM="$( printf "%2d" "${N}" )"
	echo -e "${NUM}.  ${NAME}"
}

####################################### Main part of program

if [[ -z ${CMD} ]]; then
	# No command given on command line so prompt for one.

	PROMPT="\nSelect a command to run:"
	CMDS=(); N=1
	CMDS+=("show_supported_cameras"		"$( L "Show supported cameras" )"); ((N++))
	CMDS+=("show_connected_cameras"		"$( L "Show connected cameras" )"); ((N++))
	CMDS+=("prepare_logs"				"$( L "Prepare log files for troubleshooting" )"); ((N++))
	CMDS+=("recheck_swap"				"$( L "Add swap space or change size" )"); ((N++))
	CMDS+=("recheck_tmp"				"$( L "Move ~/allsky/tmp to memory or change size") "); ((N++))
	CMDS+=("samba" 						"$( L "Simplify copying files to/from the Pi" )"); ((N++))
	CMDS+=("move_images"				"$( L "Move ~/allsky/images to a different location" )"); ((N++))
	CMDS+=("new_rpi_camera_info"		"$( L "Collect information for new RPi camera" )"); ((N++))
	CMDS+=("show_start_times"			"$( L "Show daytime and nighttime start times" )"); ((N++))
	CMDS+=("compare_paths"				"$( L "Compare upload and Website paths" )"); ((N++))
	CMDS+=("get_brightness_info"		"$( L "Get information on image brightness" )"); ((N++))
	CMDS+=("encoders"					"$( L "Show list of timelapse encoders available" )"); ((N++))
	CMDS+=("pix_fmts"					"$( L "Show list of timelapse pixel formats available" )"); ((N++))

	# If the user selects "Cancel" prompt() returns 1 and we exit the loop.
	while COMMAND="$( prompt "${PROMPT}" "${CMDS[@]}" )"
	do
		[[ -z ${COMMAND} ]] && exit 0

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

