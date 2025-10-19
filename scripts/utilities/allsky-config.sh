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


####################################### Functions - one per command

####
# Display the usage message.
function usage_and_exit()
{
	local COMMANDS_ONLY="false"
	[[ ${1} == "--commands-only" ]] && COMMANDS_ONLY="true" && shift

	local RET=${1}
	
	exec 2>&1
	echo

	if [[ ${COMMANDS_ONLY} == "false" ]]; then
		local MSG="Usage: ${ME} [--debug] [--help] [command [arguments ...]]"
		if [[ ${RET} -ne 0 ]]; then
			E_ "${MSG}"
		else
			W_ "${MSG}"
		fi
		echo
		echo "Where:"
		echo "   --help           Displays this message and exits."
		echo "   --help command   Displays a help message for the specified command, then exits."
		echo "   --debug          Displays debugging information."
		echo "   command          Is a command to execute with optional arguments.  Choices are:"
	else
		echo "Valid commands are:"
	fi

	# Try to keep in same order as menu.
	echo "      get_startrails_info"
	echo "      show_start_times [--zero] [angle [latitude [longitude]]]"
	echo "      show_supported_cameras  --RPi | --ZWO"
	echo "      show_connected_cameras"
	echo "      new_rpi_camera_info [--camera NUM]"
	echo "      show_installed_locales"
	echo "      get_filesystems"
	echo "      encoders"
	echo "      pix_fmts"

	echo "      compare_timelapse"
	echo "      compare_startrails [see --help for arguments]"
	echo "      compare_stretches [see --help for arguments]"

	echo "      change_swap"
	echo "      change_tmp"
	echo "      samba"

	echo "      bad_images_info [--show_bad_images]"
	echo "      check_post_data"
	echo "      compare_paths --website | --server"
	echo "      test_upload --website | --server"

	echo "      manage_modules [see --help for arguments]"
	echo "      check_allsky [see --help for arguments]"
	echo "      move_images"
	echo "      prepare_logs [debug_level]"

	if [[ ${COMMANDS_ONLY} == "false" ]]; then
		echo "  If no 'command' is specified you are prompted for one."
	fi
	echo
	echo "Enter:"
	 W_ "   ${ME}  command  --help"
	echo "for information on the specified command."

	exit "${RET}"
}

#####
# Show all the supported cameras.
function show_supported_cameras()
{
	local COMMAND_TO_EXECUTE="showSupportedCameras.sh"

	if [[ $# -eq 0 && -n ${FUNCTION_TO_EXECUTE} ]]; then
		# Command to run specified on command line but required options not given.
		E_ "${ME} ${ME_F}: Need to specify all arguments on command line." >&2
		"${COMMAND_TO_EXECUTE}" --help
		exit 2
	fi

	local ARGS

	if [[ $# -eq 0 && -z ${FUNCTION_TO_EXECUTE} ]]; then
		PROMPT="\nSelect the camera(s) to show:"
		OPTS=()
		OPTS+=("--RPi"			"RPi and compatible")
		OPTS+=("--ZWO"			"ZWO (very long list)")
		OPTS+=("--RPi --ZWO"	"both")

		# If the user selects "Cancel" prompt() returns 1 and we exit the loop.
		ARGS="$( prompt "${PROMPT}" "${OPTS[@]}" )"
	else
		# shellcheck disable=SC2124
		ARGS="${@}"
	fi

	# shellcheck disable=SC2086
	"${COMMAND_TO_EXECUTE}" ${ARGS}
}


#####
# Show all the currently connected cameras.
function show_connected_cameras()
{
	if [[ ${1} == "--help" ]]; then
		echo
		W_ "Usage: ${ME}  ${ME_F}"
		echo
		echo "Display all the cameras currently connected to the Pi."
		echo "The Type of camera (ZWO or RPi), Number, and Model are displayed for each camera."
		echo "If there is only one camera of a given Type, its Number will always be 0."
		return
	fi

	get_connected_cameras_info "true" > "${ALLSKY_CONNECTED_CAMERAS_INFO}"

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
# Show all the supported cameras.
function show_installed_locales()
{
	local HTML=""

	if [[ ${1} == "--help" ]]; then
		echo
		W_ "Usage: ${ME}  ${ME_F}"
		echo
		echo "Display a list of the locales installed on this computer."
		return
	fi

	echo
	echo "The following locales are installed on this computer."
	echo -n "If the one you want to use is NOT in the list,"
	if [[ ${ON_TTY} == "true" ]]; then
		echo " see the 'Locale' setting on the WebUI's"
		echo "'Settings -> Allsky' Documentation page for instructions on how to install it."
	else
		echo " <a href='/documentation/settings/allsky.html#locale'>click here</a>"
		echo "for instructions on how to install it."
		HTML="--html"
	fi

	# shellcheck disable=SC2086
	indent ${HTML} "$( list_installed_locales )"
}

#####
# Prepare Allsky for troubleshooting.
# Stop it, then truncate the log files and restart Allsky.
function prepare_logs()
{
	# shellcheck disable=SC2068
	prepareLogs.sh "${@}"
}


#####
# Request support for an RPi camera.
function new_rpi_camera_info()
{
	# shellcheck disable=SC2068
	getRPiCameraInfo.sh "${@}"
}


#####
# Install SAMBA.
function samba()
{
	if [[ ${ON_TTY} == "false" ]]; then
		W_ "${ME} ${ME_F} must be run from a terminal." >&2
		return
	fi

	# shellcheck disable=SC2068
	installSamba.sh "${@}"
}


#####
# Move ALLSKY_IMAGES to a new location.
function move_images()
{
	if [[ ${ON_TTY} == "false" ]]; then
		W_ "${ME} ${ME_F} must be run from a terminal." >&2
		return
	fi

	# shellcheck disable=SC2068
	moveImages.sh "${@}"
}


#####
# Check Allsky
function check_allsky()
{
	# shellcheck disable=SC2068
	"${ALLSKY_SCRIPTS}/checkAllsky.sh" "${@}"
}

#####
# Move ALLSKY_IMAGES to a new location.
function bad_images_info()
{
	# shellcheck disable=SC2068
	badImagesInfo.sh "${@}"
}


#####
# Generic command to test something about a remote Website or server.
function website_server_cmd()
{
	local COMMAND_TO_EXECUTE="${1}"
	local PROMPT="${2}"
	local MSG1="${3}"
	local MSG2="${4}"
	shift 4

	if [[ $# -eq 0 && -n ${FUNCTION_TO_EXECUTE} ]]; then
		# Command to run specified on command line but required options not given.
		E_ "${ME} ${ME_F}: Need to specify all arguments on command line.\n" >&2
#		"${COMMAND_TO_EXECUTE}" --help
		exit 2
	fi

	local ARGS  P

	if [[ $# -eq 0 && -z ${FUNCTION_TO_EXECUTE} ]]; then
		OPTS=()
		OPTS+=("--website"	\
			"${MSG1}")
		OPTS+=("--server"	\
			"${MSG2}")

		# If the user selects "Cancel" prompt() returns 1 and we exit the loop.
		ARGS="$( prompt "\n${PROMPT}" "${OPTS[@]}" )"

# TODO: Remove this check once "remoteserverurl" is implemented.
		if [[ ${ARGS} == "--server" ]]; then
			P="\nEnter the URL of the server (must begin with 'http' or 'https'):"
			while ! A="$( getInput "${P}" )" ; do
				echo -e "\nYou must enter a URL."
			done
			ARGS+=" ${A}"
		fi
	else
		# shellcheck disable=SC2124
		local ARGS="${@}"
	fi

	# shellcheck disable=SC2086
	"${COMMAND_TO_EXECUTE}" ${ARGS}
}


#####
# Display the path on the server of an Allsky Website and
# display the path on the server give a URL.
function compare_paths()
{
	website_server_cmd "comparePaths.sh" \
		"Select the machine you want to check:" \
		"check the remote Allsky Website specified in its 'Website URL' setting" \
		"check the remote server specified in its 'Website URL' setting" \
		"${@}"
}


#####
# Test a file upload.
function test_upload()
{
	if [[ ${1} == "--help" ]]; then
		echo
		W_ "Usage: ${ME}  ${ME_F} --website | --server"
		echo
		echo "Test uploading a file to the remote Website or remote server."
		echo "Any errors will be displayed and (usually) a fix specified."
		return
	fi

	website_server_cmd "${ALLSKY_SCRIPTS}/testUpload.sh" \
		"Select the machine you want to test an upload to:" \
		"Remote Allsky Website" \
		"Remote server" \
		"${@}"
}


#####
# Display brightness information from the startrails command.
get_startrails_info()
{
	# shellcheck disable=SC2068
	getStartrailsInfo.sh "${@}"
}


#####
# Create multiple startrails with different thresholds.
compare_startrails()
{
	# shellcheck disable=SC2068
	compareStartrails.sh "${@}"
}


#####
# Create multiple stretched images with different amounts and midpoints.
compare_stretches()
{
	# shellcheck disable=SC2068
	compareStretches.sh "${@}"
}


#####
# Help determine some timelapse settings.
compare_timelapse()
{
	# shellcheck disable=SC2068
	compareTimelapse.sh "${@}"
}


#####
# Allow the user to change the size of ${ALLSKY_TMP}.
function change_tmp()
{
	if [[ ${1} == "--help" ]]; then
		echo
		W_ "Usage: ${ME}  ${ME_F}"
		echo
		echo "Many files are writen to the 'allsky/tmp' directory, so putting it in memory"
		echo "instead of on an SD card will speed up file reads and writes."
		echo "It also significantly reduces wear on your SD card."
		echo
		echo "If 'allsky/tmp' is is already in memory, you can change its size."
		echo "If it's NOT in memory, you can move it to memory."
		return
	fi

	if [[ ${ON_TTY} == "false" ]]; then
		W_ "${ME} ${ME_F} must be run from a terminal." >&2
		return
	fi

	recheck_tmp			# defined elsewhere
}


#####
# Allow the user to change the size of ${ALLSKY_TMP}.
function change_swap()
{
	if [[ ${1} == "--help" ]]; then
		echo
		W_ "Usage: ${ME}  ${ME_F}"
		echo
		echo "All computer programs need physical memory to run in."
		echo "The more programs running on a computer, or the bigger those programs are,"
		echo "the more memory that's needed."
		echo
		echo "If the programs need more memory than the computer physically has,"
		echo "programs might be killed or the computer may crash."
		echo "To avoid this, disk space can be used to act as 'virtual memory'."
		echo "This disk space is called 'swap space'."
		echo
		echo "If your Pi has 1 GB of physical memory and you add 4 GB of swap space,"
		echo "it's similar to having a Pi with 5 GB of memory."
		echo "A Pi 512 MB of memory needs more swap space than one with 8 GB of memory."
		echo
		echo "This script lets you change the amount of swap space."
		echo "A suggested amount is displayed for your Pi and is usually enough,"
		echo "but if you use your Pi for a lot of things, you may want to increase swap space."
		return
	fi

	if [[ ${ON_TTY} == "false" ]]; then
		W_ "${ME} ${ME_F} must be run from a terminal." >&2
		return
	fi

	recheck_swap			# defined elsewhere
}


#####
# List encoders available to timelapses.
function encoders()
{
	if [[ ${1} == "--help" ]]; then
		echo
		W_ "Usage: ${ME}  ${ME_F}"
		echo
		echo "Displays a list of possible video encoders you can use in"
		echo "the Timelapse 'VCODEC' setting."
		echo "This setting is rarely changed; change only if you know what you're doing."
		return
	fi

	[[ ${1} == "--html" ]] && echo "<pre>"
	ffmpeg -loglevel error -encoders
	[[ ${1} == "--html" ]] && echo "</pre>"
}


#####
# List pixel formats available to timelapses.
function pix_fmts()
{
	if [[ ${1} == "--help" ]]; then
		echo
		W_ "Usage: ${ME}  ${ME_F}"
		echo
		echo "Displays a list of possible video encoders you can use in"
		echo "the Timelapse 'Pixel format' setting."
		echo "This setting is rarely changed; change only if you know what you're doing."
		return
	fi

	[[ ${1} == "--html" ]] && echo "<pre>"
	ffmpeg -loglevel error -pix_fmts
	[[ ${1} == "--html" ]] && echo "</pre>"
}


#####
# Show the daytime and nighttime start times
function show_start_times()
{
	# shellcheck disable=SC2068
	showStartTimes.sh "${@}"
}


#####
# Determine why the user gets the message:
#	data.json is X days old. Check ... postData.sh
function check_post_data()
{
	# shellcheck disable=SC2068
	checkPostData.sh "${@}"
}

#####
# Get a list of filesystems to help the user determine where a devices is mounted.
function get_filesystems()
{
	# shellcheck disable=SC2068
	getFilesystems.sh "${@}"
}

#####
# Allow users to install and uninstall modules.
function manage_modules()
{
	# shellcheck disable=SC2068
	manageModules.sh "${@}"
}


####################################### Helper functions

#####
# Run a command / function, passing any arguments.
function run_command()
{
	local COMMAND="${1}"
	shift

	if ! type "${COMMAND}" > /dev/null 2>&1 ; then
		E_ "\n${ME}: Unknown command '${COMMAND}'." >&2
		usage_and_exit --commands-only 2
	fi

	if [[ ${DEBUG} == "true" ]]; then
		# shellcheck disable=SC2145
		D_ "Executing: ${COMMAND} ${@}\n"
	fi

	ME_F="${COMMAND}"		# global
	"${COMMAND}" "${@}"
}


#####
# Prompt for a command or argument from a list.
if [[ ${ON_TTY} == "true" ]]; then
	WT_LINES=$( tput lines 2>/dev/null )
fi
WT_LINES="${WT_LINES:-24}"

function prompt()
{
	local PROMPT="${1}"
	shift
	local OPTIONS=("${@}")
	local NUM_OPTIONS=$(( ${#OPTIONS[@]} / 2 ))

# whiptail's menubox has:
# 4 lines at top
# then the menu (NUM_OPTIONS lines)
# 2 blank lines
# 1 "<Ok> / <Cancel>" line
# 2 blank lines
# If all that doesn't fit in the terminal windows, whiptail does NOT scroll.
	local LINES=$(( 4 + NUM_OPTIONS + 2 + 1 + 2 ))
	if [[ ${LINES} -ge ${WT_LINES} ]]; then
		echo "Please resize your window to at least $(( LINES + 1 )) lines."
		echo "It is only ${WT_LINES} lines now."
		return 1
	fi >&2

	local OPT="$( whiptail --title "${TITLE}" --notags --menu "${PROMPT}" \
		--default-item "${DEFAULT_MENU_ITEM}" \
		"${LINES}" "${WT_WIDTH:-100}" "${NUM_OPTIONS}" -- "${OPTIONS[@]}" 3>&1 1>&2 2>&3 )"
	local RET=$?
	if [[ ${RET} -eq 255 ]]; then
		E_ "\n${ME}: whiptail failed." >&2
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
		E_ "\n${ME}: whiptail failed." >&2
		exit 2
	else
		echo "${LINE}"
		return "${RET}"
	fi
}


# Output a list item.
# Uses globals ${N} and ${C}.
function L()
{
	local NAME="${1}"

	local NUM="$( printf "%2d" "${N}" )"
	echo -e "     ${NUM}.  ${NAME}"
}


####################################### Main part of program

OK="true"
DO_HELP="false"
FUNCTION_TO_EXECUTE=""
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
			E_ "\nUnknown argument '${ARG}'." >&2
			OK="false"
			;;

		*)
			FUNCTION_TO_EXECUTE="${ARG}"
			shift
			# The remaining arguments are in ${@}.
			break;
			;;
	esac
	shift
done

PATH="${PATH}:${ALLSKY_UTILITIES}"

if [[ ${DO_HELP} == "true" ]]; then
	if [[ -n ${FUNCTION_TO_EXECUTE} ]]; then
		echo
		run_command "${FUNCTION_TO_EXECUTE}" "--help"
		echo
		exit 0
	else
		usage_and_exit 0
	fi
fi
[[ ${OK} == "false" ]] && usage_and_exit 1

if [[ -z ${FUNCTION_TO_EXECUTE} ]]; then
	# No command given on command line so prompt for one.

	if [[ ${ON_TTY} == "false" ]]; then
		W_ "${ME} must be run from a terminal or have all arguments included on the command line." >&2
		exit 2
	fi

	PROMPT="\nSelect a command to run:"
	CMDS=()
	N=0

#####
	CMDS+=("header"	      "Commands to Display Information" )

	((N++));	C="get_startrails_info"
	CMDS+=("${C}"	"$( L "Get information on startrails image brightness           (${C})" )")

	DEFAULT_MENU_ITEM="${C}"		# Must be 1st item

	((N++));	C="show_start_times"
	CMDS+=("${C}"	"$( L "Show daytime and nighttime start times                   (${C})" )")

	((N++));	C="show_supported_cameras"
	CMDS+=("${C}"	"$( L "Show supported cameras                                   (${C})" )")

	((N++));	C="show_connected_cameras"
	CMDS+=("${C}"	"$( L "Show connected cameras                                   (${C})" )")

	((N++));	C="new_rpi_camera_info"
	CMDS+=("${C}"	"$( L "Collect information for new RPi camera                   (${C})" )")

	((N++));	C="show_installed_locales"
	CMDS+=("${C}"	"$( L "Show the locales installed on the Pi                     (${C})" )")

	((N++));	C="get_filesystems"
	CMDS+=("${C}"	"$( L "Determine where a secodary storage device is             (${C})" )")

	((N++));	C="encoders"
	CMDS+=("${C}"	"$( L "Show list of timelapse encoders available                (${C})" )")

	((N++));	C="pix_fmts"
	CMDS+=("${C}"	"$( L "Show list of timelapse pixel formats available           (${C})" )")


#####
	CMDS+=("header"	      "Commands to Create Test Images or Videos" )

	((N++));	C="compare_timelapse"
	CMDS+=("${C}"	"$( L "Create multiple timelapse videos                         (${C})" )")

	((N++));	C="compare_startrails"
	CMDS+=("${C}"	"$( L "Create multiple startrails                               (${C})" )")

	((N++));	C="compare_stretches"
	CMDS+=("${C}"	"$( L "Create multiple stretched images                         (${C})" )")


#####
	CMDS+=("header"	      "Commands to Change Pi Settings" )

	((N++));	C="change_swap"
	CMDS+=("${C}"	"$( L "Add swap space or change size                            (${C})" )")

	((N++));	C="change_tmp"
	CMDS+=("${C}" 	"$( L "Move ~/allsky/tmp to memory or change size               (${C})") ")

	((N++));	C="samba"
	CMDS+=("${C}" 	"$( L "Simplify copying files to/from the Pi                    (${C})" )")


#####
	CMDS+=("header"	      "Troubleshooting Commands" )

	((N++));	C="bad_images_info"
	CMDS+=("${C}"	"$( L "Display information on 'bad' images                      (${C})" )")

	((N++));	C="check_post_data"
	CMDS+=("${C}"	"$( L "Troubleshoot the 'data.json is X days old' message       (${C})" )")

	((N++));	C="compare_paths"
	CMDS+=("${C}"	"$( L "Compare upload and Website paths                         (${C})" )")

	((N++));	C="test_upload"
	CMDS+=("${C}"	"$( L "Test uploading a file                                    (${C})" )")



#####
	CMDS+=("header"	      "Misc. Commands" )

	((N++));	C="manage_modules"
	CMDS+=("${C}"	"$( L "Install or uninstall modules.                            (${C})" )")

	((N++));	C="move_images"
	((N++));	C="check_allsky"
	CMDS+=("${C}"	"$( L "Check Allsky for setting errors and warnings             (${C})" )")

	((N++));	C="move_images"
	CMDS+=("${C}"	"$( L "Move ~/allsky/images to a different location             (${C})" )")

	((N++));	C="prepare_logs"
	CMDS+=("${C}"	"$( L "Prepare log files for troubleshooting                    (${C})" )")

	##### Prompt
	# If the user selects "Cancel" prompt() returns 1 and we exit the loop.
	P="${PROMPT}"
	while COMMAND="$( prompt "${P}" "${CMDS[@]}" )"
	do
		[[ -z ${COMMAND} ]] && exit 0

		if [[ ${COMMAND} == "header" ]]; then
			# There isn't a way in whiptail to group items so we fake it.
			P="\nYou selected a header.  Please select a command to run:"
			continue
		fi
		P="${PROMPT}"	# restore prompt
		

		run_command "${COMMAND}"
		RET=$?

		[[ ${ALLOW_MORE_COMMANDS} == "false" ]] && exit "${RET}"
		while true; do
			echo -e "\n\n"
			echo -e "${cYELLOW}${cBOLD}"
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
	run_command "${FUNCTION_TO_EXECUTE}" "${@}"
	exit $?
fi

