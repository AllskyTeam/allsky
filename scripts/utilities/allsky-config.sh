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
		echo "where:"
		echo "   --help           Displays this message and exits."
		echo "   --help command   Displays a help message for the specified command, then exits."
		echo "   --debug          Displays debugging information."
		echo "   command          Is a command to execute with optional arguments.  Choices are:"
	else
		echo "Valid commands are:"
	fi

	echo "      show_supported_cameras  --RPi | --ZWO"
	echo "      show_connected_cameras"
	echo "      show_installed_locales"
	echo "      prepare_logs"
	echo "      config_timelapse"
	echo "      change_swap"
	echo "      change_tmp"
	echo "      samba"
	echo "      move_images"
	echo "      bad_images_info"
	echo "      new_rpi_camera_info [--camera NUM]"
	echo "      show_start_times [--zero] [angle [latitude [longitude]]]"
	echo "      compare_paths --website | --server"
	echo "      get_brightness_info"
	echo "      check_post_data"
	echo "      get_filesystems"
	echo "      encoders"
	echo "      pix_fmts"

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
	if [[ ${1} == "--help" ]]; then
		echo
		W_ "Usage: ${ME}  ${ME_F} --RPi | --ZWO"
		echo
		echo "Display all the cameras of the specified type that Allsky supports."
		echo "Note that the ZWO list is very long."
		return
	fi

	# shellcheck disable=SC2124
	local ARGS="${@}"

	#shellcheck disable=SC2086
	if needs_arguments ${ARGS} ; then
		if [[ ${ON_TTY} == "false" ]]; then
			E_ "${ME} ${ME_F}: Need to specify all aruments on command line." >&2
			return
		fi
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
	if [[ ${1} == "--help" ]]; then
		echo
		W_ "Usage: ${ME}  ${ME_F}"
		echo
		echo "Display all the cameras currently connected to the Pi."
		echo "The Type of camera (ZWO or RPi), Number, and Model are displayed for each camera."
		echo "If there is only one camera of a given Type, its Number will always be 0."
		return
	fi

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
# Show all the supported cameras.
function show_installed_locales()
{
	local HOW
	HOW="If the locale you want to use is NOT in the list, see the 'Locale' setting on the WebUI's"
	HOW+="\n'Settings -> Allsky' Documentation page for instructions on how to install it."

	if [[ ${1} == "--help" ]]; then
		echo
		W_ "Usage: ${ME}  ${ME_F}"
		echo
		echo "Display all list of the locales installed on this computer."
		echo -e "${HOW}"
		return
	fi

	echo
	echo "The following locales are installed on this computer."
	echo -e "${HOW}"
	indent "$( list_installed_locales )"
}

#####
# Prepare Allsky for troubleshooting.
# Stop it, then truncate the log files and restart Allsky.
function prepare_logs()
{
	if [[ ${1} == "--help" ]]; then
		echo
		W_ "Usage: ${ME}  ${ME_F}"
		echo
		echo "Configure Allsky to collect the proper information for troubleshooting problems."
		echo "Allsky is stopped, the Debug Level set to the appropriate value if needed,"
		echo "the log files are truncated, and Allsky is restarted."
		echo "After the problem appears, see the 'Getting Help' page in the WebUI for details"
		echo "on how to report the problem."
		return
	fi

	prepareLogs.sh
}


#####
# Request support for an RPi camera.
function new_rpi_camera_info()
{
	if [[ ${1} == "--help" ]]; then
		echo
		W_ "Usage: ${ME}  ${ME_F}  [--camera NUM]"
		echo
		W_ "NOTE: This command only works if you have an RPi camera connected to the Pi."
		echo
		echo "Saves detailed information on the attached RPi camera to a file."
		echo "This file MUST be attached to your GitHub Discussion requesting support for the camera."
		echo
		echo "If there is more than one RPi camera connected to the Pi,"
		echo "by default, information on the first camera (number 0) is displayed."
		echo "Use the '--camera NUM' argument to specify a different camera."
		return
	fi

	# shellcheck disable=SC2124
	local ARGS="${@}"		# optional

	# shellcheck disable=SC2086
	getRPiCameraInfo.sh ${ARGS}
}


#####
# Install SAMBA.
function samba()
{
	if [[ ${1} == "--help" ]]; then
		echo
		W_ "Usage: ${ME}  ${ME_F}"
		echo
		echo "Configure your Pi using the Samba protocol to allow easy file transfers to"
		echo "and from PCs and MACs.  The HOME directory of the login you use on the Pi"
		echo "will be available to connect to a PC or MAC,"
		echo "where it will be treated like any other disk.  You can then drag and drop files."
		return
	fi

	if [[ ${ON_TTY} == "false" ]]; then
		W_ "${ME} ${ME_F} must run from a terminal." >&2
		return
	fi

	installSamba.sh
}


#####
# Move ALLSKY_IMAGES to a new location.
function move_images()
{
	if [[ ${1} == "--help" ]]; then
		echo
		W_ "Usage: ${ME}  ${ME_F}"
		echo
		echo "Configure Allsky to save images in the location you specify,"
		echo "rather than in ~/allsky/images.  You are prompted for the new location,"
		echo "and if there are images in the current location, you'll be prompted for"
		echo "what you want to do with them (typically move them to the new location)."
		echo
		echo "The new location is typically an SSD or other higher-capacity,"
		echo "more reliable media than an SD card."
		return
	fi

	if [[ ${ON_TTY} == "false" ]]; then
		W_ "${ME} ${ME_F} must run from a terminal." >&2
		return
	fi

	moveImages.sh
}


#####
# Move ALLSKY_IMAGES to a new location.
function bad_images_info()
{
	if [[ ${1} == "--help" ]]; then
		echo
		W_ "Usage: ${ME}  ${ME_F}"
		echo
		echo "Display information on 'bad' images, which are ones that are too dark or too light,"
		echo "and hence have been deleted."
		echo "This information can be used to determine what the low and high 'Remove Bad Images Threshold'"
		echo "settings should be."
		return
	fi

	badImagesInfo.sh
}


#####
# Display the path on the server of an Allsky Website and
# display the path on the server give a URL.
function compare_paths()
{
	if [[ ${1} == "--help" ]]; then
		echo
		W_ "Usage: ${ME}  ${ME_F}  --website | --server"
		echo
		echo "Helps determine what to put in the 'Image Directory' and 'Website URL' settings"
		echo "in the 'Remote Server' section of the WebUI."
		echo "It does this by displaying information from a remote Website's server via FTP"
		echo "and via a URL, such as the directory name (they should match) and"
		echo "a list of files in those directories."
		echo
		echo "If you did not specify either '--website' or '--server',"
		echo "you will be prompted for which to use."
		return
	fi

	# shellcheck disable=SC2124
	local ARGS="${@}"

	#shellcheck disable=SC2086
	if needs_arguments ${ARGS} ; then
		if [[ ${ON_TTY} == "false" ]]; then
			E_ "${ME} ${ME_F}: Need to specify all aruments on command line." >&2
			return
		fi

		PROMPT="\nSelect the machine you want to check:"
		OPTS=()
		OPTS+=("--website"	\
			"check the remote Allsky Website specified in its 'Website URL' setting.")
		OPTS+=("--server"	\
			"check the remote server specified in its 'Website URL' setting.")

		# If the user selects "Cancel" prompt() returns 1 and we exit the loop.
		ARGS="$( prompt "${PROMPT}" "${OPTS[@]}" )"

# TODO: Remove this check once "remoteserverurl" is implemented.
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
	if [[ ${1} == "--help" ]]; then
		echo
		W_ "Usage: ${ME}  ${ME_F}"
		echo
		echo "Displays brightness information used when updating the 'Threshold' startrails setting."
		echo "Typically this is needed when startrails images don't show any trails."
		return
	fi

	getBrightnessInfo.sh
}


#####
# Help determine some timelapse settings.
config_timelapse()
{
	if [[ ${1} == "--help" ]]; then
		echo
		W_ "Usage: ${ME}  ${ME_F}"
		echo
		echo "Create multiple timelapse videos with different settings to help determine"
		echo "what settings to ultimately use.  You are prompted for:"
		echo "    - which day's images to use (default is yesterday's images)"
		echo "    - how many images to include (default is 200 to minimize the processing time)"
		echo "    - one or more 'Bitrate' values"
		echo "    - one or more 'FPS' values"
		echo
		echo "A timelapse video is created for each combination of values you specified."
		echo "The list of videos created is displayed for you to compare."
		return
	fi

	if [[ ${ON_TTY} == "false" ]]; then
		W_ "${ME} ${ME_F} must run from a terminal." >&2
		return
	fi

	configTimelapse.sh
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
		W_ "${ME} ${ME_F} must run from a terminal." >&2
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
		W_ "${ME} ${ME_F} must run from a terminal." >&2
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

	ffmpeg -loglevel error -encoders
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

	ffmpeg -loglevel error -pix_fmts
}


#####
# Show the daytime and nighttime start times
function show_start_times()
{
	if [[ ${1} == "--help" ]]; then
		echo
		W_ "Usage:"
		W_ "    ${ME}  ${ME_F} [--zero] [--no-header] [angle [latitude [longitude]]]"
		echo "OR"
		W_ "    ${ME}  ${ME_F} [--zero] [--no-header] [--angle A] [--latitude LAT] [--longitude LONG]"
		echo
		echo "Show the daytime and nighttime start times for the specified"
		echo "angle, latitude, and longitude."
		echo "If you don't specify those values, your current values are used."
		echo "'--zero' also displays information for an angle of 0."
		echo "'--no-header' only displays the data, no header."
		echo
		echo "This information is useful to determine what to put in the 'Angle' setting in the WebUI."
		echo "Typically you would adjust the angle until you got the start time you wanted."
		echo
		echo "This is also useful to troubleshoot why the daytime and nighttime start times"
		echo "aren't what you expected."
		return
	fi

	# shellcheck disable=SC2124
	local ARGS="${@}"		# optional

	# shellcheck disable=SC2086
	showStartTimes.sh ${ARGS}
}


#####
# Determine why the user gets the message:
#	data.json is X days old. Check ... postData.sh
function check_post_data()
{
	if [[ ${1} == "--help" ]]; then
		echo
		W_ "Usage: ${ME}  ${ME_F}"
		echo
		echo "This command helps determine why you get the"
		echo "    data.json is X days old"
		echo "message.  If possible, a solution is proposed."
		return
	fi

	checkPostData.sh
}

#####
# Get a list of filesystems to help the user determine where a devices is mounted.
function get_filesystems()
{
	if [[ ${1} == "--help" ]]; then
		echo
		W_ "Usage: ${ME}  ${ME_F}"
		echo
		echo "This command helps determine the path to a storage device like an SSD."
		return
	fi

	getFilesystems.sh
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
			E_ "\n'${FUNCNAME[1]}' requires an argument." >&2
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
		E_ "\n${ME}: Unknown command '${COMMAND}'." >&2
		usage_and_exit --commands-only 2
	fi

	if [[ ${DEBUG} == "true" ]]; then
		D_ "Executing: ${COMMAND} ${ARGUMENTS}\n"
	fi

	ME_F="${COMMAND}"		# global
	#shellcheck disable=SC2086
	"${COMMAND}" ${ARGUMENTS}
}


#####
# Prompt for a command or argument from a list.
if [[ ${ON_TTY} == "true" ]]; then
	WT_LINES=$( tput lines 2>/dev/null )
fi
WT_LINES="${WT_LINES:-24}"

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
# Uses global ${N}.
function L()
{
	local NAME="${1}"

	local NUM="$( printf "%2d" "${N}" )"
	echo -e "${NUM}.  ${NAME}"
}


####################################### Main part of program

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
			E_ "\nUnknown argument '${ARG}'." >&2
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

if [[ ${DO_HELP} == "true" ]]; then
	if [[ -n ${CMD} ]]; then
		echo
		run_command "${CMD}" "--help"
		echo
		exit 0
	else
		usage_and_exit 0
	fi
fi
[[ ${OK} == "false" ]] && usage_and_exit 1

PATH="${PATH}:${ALLSKY_UTILITIES}"

if [[ -z ${CMD} ]]; then
	# No command given on command line so prompt for one.

	if [[ ${ON_TTY} == "false" ]]; then
		W_ "${ME} must run from a terminal or have all arguments included on the command line." >&2
		exit 2
	fi

	PROMPT="\nSelect a command to run:"
	CMDS=(); N=1
	CMDS+=("show_supported_cameras"		"$( L "Show supported cameras" )"); ((N++))
	CMDS+=("show_connected_cameras"		"$( L "Show connected cameras" )"); ((N++))
	CMDS+=("show_installed_locales"		"$( L "Show locales installed on this computer" )"); ((N++))
	CMDS+=("prepare_logs"				"$( L "Prepare log files for troubleshooting" )"); ((N++))
	CMDS+=("config_timelapse"			"$( L "Create timelapse videos with different settings" )"); ((N++))
	CMDS+=("change_swap"				"$( L "Add swap space or change size" )"); ((N++))
	CMDS+=("change_tmp" 				"$( L "Move ~/allsky/tmp to memory or change size") "); ((N++))
	CMDS+=("samba" 						"$( L "Simplify copying files to/from the Pi" )"); ((N++))
	CMDS+=("move_images"				"$( L "Move ~/allsky/images to a different location" )"); ((N++))
	CMDS+=("bad_images_info"			"$( L "Display information on 'bad' images." )"); ((N++))
	CMDS+=("new_rpi_camera_info"		"$( L "Collect information for new RPi camera" )"); ((N++))
	CMDS+=("show_start_times"			"$( L "Show daytime and nighttime start times" )"); ((N++))
	CMDS+=("compare_paths"				"$( L "Compare upload and Website paths" )"); ((N++))
	CMDS+=("get_brightness_info"		"$( L "Get information on image brightness" )"); ((N++))
	CMDS+=("check_post_data"			"$( L "Troubleshoot the 'data.json is X days old' message" )"); ((N++))
	CMDS+=("get_filesystems"			"$( L "Determine where a secodary storage device is" )"); ((N++))
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

