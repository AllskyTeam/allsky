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
		echo "Configure your Pi using the Samba protocol to allow easy file transfers to and from PCs and MACs."
		echo "The HOME directory of the login you use on the Pi will be available to connect to a PC or MAC,"
		echo "where it will be treated like any other disk.  You can then drag and drop files."
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
		echo "Configure Allsky to save images in the location you specify, rather than in ~/allsky/images."
		echo "You are prompted for the new location, and if there are images in the current location,"
		echo "you'll be prompted for what you want to do with them (typically move them to the new location)."
		echo
		echo "The new location is typically an SSD or other higher-capacity, more reliable media"
		echo "than an SD card."
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

	# Log entry format:
	#	2025-02-09T10:44:17.594698-07:00 new-allsky allsky[905780]: removeBadImages.sh: File is bad: \
	#		removed 'image-20250209104345.jpg' (MEAN of 0.167969 is below low threshold of 0.5)
	local INFO="$( grep "File is bad:.*MEAN of" "${ALLSKY_LOG}"* | sed -e 's/.*(MEAN/MEAN/' -e 's/)//' )"
	if [[ -z ${INFO} ]]; then
		W_ "\nNo bad file information found in the Allsky log (${ALLSKY_LOG}).  Cannot continue.\n"
		return
	fi

	#	MEAN of 0.167969 is below low threshold of 0.5
	#	$1   $2 $3       $4 $5    $6  $7        $8 $9
	echo "$INFO" | gawk '
		BEGIN {
			low_count = 0; low_min = 1; low_max = 0; low_threshold = 0; low_mean_total = 0;
			high_count = 0; high_min = 0; high_max = 0; high_threshold = 0; high_mean_total = 0;
		}
		{
			mean = $3;
			below_above = $5;
			threshold = $9;
			if (below_above == "below") {	# below low
				if (threshold != low_threshold) {
					if (low_threshold != 0) {
						# Start over with numbers
						# printf("Low threshold changed from %f to %f; summary may not be accurate\n",
						# 	low_threshold, threshold);
						low_max = 0;
						low_count = 0;
						low_mean_total = 0;
					}
					low_threshold = threshold;
				}
				low_count++;
				low_mean_total += mean;
				if (mean < low_min)
					low_min = mean;
				else if (mean > low_max)
					low_max = mean;

			} else {				# above high
				if (threshold != high_threshold) {
					if (high_threshold != 0) {
						# printf("High threshold changed from %f to %f; summary may not be accurate\n",
						# 	high_threshold, threshold);
						high_min = 1;
						high_count = 0;
						high_mean_total = 0;
					}
					high_threshold = threshold;
				}
				high_count++;
				high_mean_total += mean;
				if (mean < high_min)
					high_min = mean;
				else if (mean > high_max)
					high_max = mean;
			}
		}
		END {
			if (low_count > 0) {
				printf("%d images had a mean below the Low Threshold of %f\n", low_count, low_threshold);
				if (low_min == low_max) {
					printf("The lowest mean was %f\n", low_min);
					printf("\nConsider lowering your Low Threshold to less than %f\n", low_min);
					printf("or increasing your exposure and/or gain.\n");
				} else {
					ave = low_mean_total / low_count;
					printf("The lowest mean was %f and the highest %f with and average of %f\n",
						low_min, low_max, ave);
					printf("\nConsider lowering your Low Threshold to around %f\n", ave);
				}
			}
			if (high_count > 0) {
				printf("%d images had a mean above the High Threshold of %f\n", high_count, high_threshold);
				if (high_min == high_max) {
					printf("The highest mean was %f\n", high_min);
					printf("\nConsider raising your High Threshold to more than %f\n", high_min);
					printf("or decreasing your exposure and/or gain.\n");
				} else {
					ave = high_mean_total / high_count;
					printf("The lowest mean was %f and the highest %f with and average of %f\n",
						high_min, high_max, ave);
					printf("\nConsider raising your High Threshold to around %f\n", ave);
				}
			}
		}'
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
		echo "Helps determine what to put in the 'Image Directory' and 'Website URL' settings in"
		the "'Remote Server' section of the WebUI."
		echo "It does this by displaying information from a remote Website's server via FTP and via a URL,"
		echo "such as the directory name (they should match) and a list of files in those directories."
		echo
		echo "If you did not specify either '--website' or '--server', you will be prompted for which to use."
		return
	fi

	# shellcheck disable=SC2124
	local ARGS="${@}"

	#shellcheck disable=SC2086
	if needs_arguments ${ARGS} ; then
		PROMPT="\nSelect the machine you want to check:"
		OPTS=()
		OPTS+=("--website"			"Remote Allsky Website (uses the remote Website's 'Website URL' setting)")
		OPTS+=("--server"			"Remote server (uses for the remote server's 'Website URL' setting)")

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
		echo "Displays a list of possible video encoders you can use in the Timelapse 'VCODEC' setting."
		echo "This setting is rarely changed, and should only be changed if you know what you're doing."
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
		echo "Displays a list of possible video encoders you can use in the Timelapse 'Pixel format' setting."
		echo "This setting is rarely changed, and should only be changed if you know what you're doing."
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
		W_ "    ${ME}  ${ME_F} [--zero] [angle [latitude [longitude]]]"
		echo "OR"
		W_ "    ${ME}  ${ME_F} [--zero] [--angle A] [--latitude LAT] [--longitude LONG]"
		echo
		echo "Show the daytime and nighttime start times for the specified angle, latitude, and longitude."
		echo "If you don't specify those values, your current values are used."
		echo "'--zero' also displays information for an angle of 0."
		echo
		echo "This information is useful when determining what to put in the 'Angle' setting in the WebUI."
		echo "Typically you would adjust the angle until you got the start time you wanted."
		echo
		echo "This is also useful when troubleshooting when the daytime and nighttime start times"
		echo "aren't what you expected."
		return
	fi

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
				E_ "${ME}: Unknown argument '${ARG}'." >&2
				OK="false"
				;;

			*)
				break	# Assume angle
				;;
		esac
		shift
	done

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

####
# Display the usage message.
function usage_and_exit()
{
	local RET=${1}
	
	exec 2>&1
	echo
	local MSG="Usage: ${ME} [--debug] [--help] [command [arguments ...]]"
	if [[ ${RET} -ne 0 ]]; then
		E_ "${MSG}"
	else
		W_ "${MSG}"
	fi
	echo -e "\nwhere:"
	echo -e "  '--help' displays this message and exits."
	echo -e "  '--help command' displays a help message for the specified command, then exits."
	echo -e "  '--debug' displays debugging information."
	echo -e "  'command' is a command to execute with optional arguments.  Choices are:"
	echo -e "      show_supported_cameras  --RPi | --ZWO"
	echo -e "      show_connected_cameras"
	echo -e "      prepare_logs"
	echo -e "      change_swap"
	echo -e "      change_tmp"
	echo -e "      samba"
	echo -e "      move_images"
	echo -e "      bad_images_info"
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
		return 1
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

	PROMPT="\nSelect a command to run:"
	CMDS=(); N=1
	CMDS+=("show_supported_cameras"		"$( L "Show supported cameras" )"); ((N++))
	CMDS+=("show_connected_cameras"		"$( L "Show connected cameras" )"); ((N++))
	CMDS+=("prepare_logs"				"$( L "Prepare log files for troubleshooting" )"); ((N++))
	CMDS+=("change_swap"				"$( L "Add swap space or change size" )"); ((N++))
	CMDS+=("change_tmp" 				"$( L "Move ~/allsky/tmp to memory or change size") "); ((N++))
	CMDS+=("samba" 						"$( L "Simplify copying files to/from the Pi" )"); ((N++))
	CMDS+=("move_images"				"$( L "Move ~/allsky/images to a different location" )"); ((N++))
	CMDS+=("bad_images_info"			"$( L "Display information on 'bad' images." )"); ((N++))
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

