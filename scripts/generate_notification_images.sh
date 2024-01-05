#!/bin/bash

# Create notification image(s).
# The default ones are listed in this file, but
# other scripts can create custom messages on-the-fly by passing arguments to this script.
# This is quick - on a Pi 4 it takes about one second per image.

# Allow this script to be executed manually, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck disable=SC1091 source-path=.
source "${ALLSKY_HOME}/variables.sh"	|| exit "${EXIT_ERROR_STOP}"

readonly ALL_EXTS="jpg png"		# all the image filename extensions we support

# Sometimes a notification image will accidently make its way into an "images/YYYYMMDD" directory
# and then into a keogram and startrails.
# To avoid this, create images that are not even numbers, which cameras produce.
# The keogram and startrails program will ignore these images since they aren't "standard".
DEFAULT_IMAGE_SIZE="959x719"

function usage_and_exit()
{
	RET=${1}
	(
		[[ ${RET} -ne 0 ]] && echo -en "${RED}"
		echo -e "\nUsage: ${ME} [--help] [--directory dir] [--size XxY]"
		echo -e "    [type TextColor Font FontSize StrokeColor StrokeWidth BgColor BorderWidth BorderColor Extensions ImageSize 'Message']\n"
		[[ ${RET} -ne 0 ]] && echo -en "${NC}"
		echo "When run with no arguments, all notification types are created with extensions: ${ALL_EXTS/ /, }."
		echo "Arguments:"
		echo "  '--help' displays this message and exits."
		echo "  '--directory dir' creates the file(s) in that directory, otherwise in \${PWD}."
		echo "  '--size XxY' creates images that are X by Y pixels.  Default: ${DEFAULT_IMAGE_SIZE} pixels."
		echo
	) >&2
	exit "${RET}"
}

# Check arguments
OK="true"
HELP="false"
DIRECTORY=""
IMAGE_SIZE="${DEFAULT_IMAGE_SIZE}"
while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG}" in
		--help)
			HELP="true"
			;;
		--directory)
			DIRECTORY="${2}"
			if [[ ! -d ${DIRECTORY} ]]; then
				echo -e "\n${RED}*** ${ME} ERROR: Directory '${DIRECTORY}' not found!\n${NC}" >&2
				OK="false"
			fi
			shift
			;;
		--size)
			IMAGE_SIZE="${2}"
			X="${IMAGE_SIZE%x*}"
			Y="${IMAGE_SIZE##*x}"
			[[ $((X % 2)) -eq 0 ]] && ((X--))
			[[ $((Y % 2)) -eq 0 ]] && ((Y--))
			IMAGE_SIZE="${X}x${Y}"
			shift
			;;
		-*)
			echo "${RED}${ME}: ERROR: Unknown argument: '${ARG}'${NC}." >&2
			OK="false"
			;;
		*)
			break
			;;
	esac
	shift
done
[[ ${HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" ]] && usage_and_exit 1

MAX_ARGS=12

if [[ $# -ne 0 && $# -ne ${MAX_ARGS} ]]; then
	echo -e "${RED}${ME}: ERROR: Either specify ALL ${MAX_ARGS} arguments, or don't specify any.${NC}" >&2
	echo "You specified $# arguments." >&2
	usage_and_exit 1
fi

declare LAST_ARG="${MAX_ARGS}"
if [[ $# -eq ${MAX_ARGS} ]]; then
	OK="true"
	if [[ -z ${1} ]]; then
		echo -e "${RED}${ME}: ERROR: Basename must be specified.${NC}" >&2
		OK="false"
	fi
	if [[ -z ${LAST_ARG} ]]; then
		echo -e "${RED}${ME}: ERROR: message must be specified.${NC}" >&2
		OK="false"
	fi
	[[ ${OK} == "false" ]] && usage_and_exit 1
fi

function make_image()
{
	BASENAME="$1"
	TEXTCOLOR="${2:-"white"}"
	FONT="${3:-"Helvetica-Bold"}"
	FONT_SIZE="${4:-128}"
	INTERLINE_SPACING=$( echo "${FONT_SIZE} / 3" | bc )
	STROKE_COLOR="${5:-"black"}"
	STROKE_WIDTH="${6:-2}"
	BGCOLOR="${7:-"#404040"}"
	BORDER_WIDTH="${8:-0}"
	BORDER_COLOR="${9:-"white"}"
	EXTS="${10:-"${ALL_EXTS}"}"
	IM_SIZE="${11:-${IMAGE_SIZE}}"
	MSG="${12}"

	echo "${BASENAME}" | grep -qEi "[.](${ALL_EXTS/ /|})"
	if [[ $? -ne 1 ]]; then
		echo -e "${RED}${ME}: ERROR: Do not add an extension to the basename${NC}." >&2
		usage_and_exit 1
	fi

	if [[ ${BORDER_WIDTH} -ne 0 ]]; then
		BORDER="-border ${BORDER_WIDTH} -bordercolor ${BORDER_COLOR}"
	else
		BORDER=""
	fi

	[[ ${ON_TTY} -eq 1 ]] && echo "Creating '${BASENAME}' in ${PWD}."
	for EXT in ${EXTS} ; do
		# Make highest quality for jpg and highest loss-less compression for png.
		# jpg files at 95% produce somewhat bad artifacts.  Even 100% produces some artifacts.

		if [[ ${EXT} == "jpg" ]]; then
			Q=100
		else
			Q=9
		fi
		# shellcheck disable=SC2086
		convert \
			-quality "${Q}" \
			-fill "${TEXTCOLOR}" \
			-font "${FONT}" \
			-pointsize "${FONT_SIZE}" \
			-interline-spacing "${INTERLINE_SPACING}" \
			-stroke "${STROKE_COLOR}" \
			-strokewidth "${STROKE_WIDTH}" \
			-background "${BGCOLOR}" \
			${BORDER} \
			-gravity center \
			-depth 8 \
			-size "${IM_SIZE}" \
			label:"${MSG}" \
			"${BASENAME}.${EXT}"
	done
}

which mogrify > /dev/null
if [[ $? -ne 0 ]]; then
	# Testing for mogrify which seems like a much more distinctive executable
	# name than "convert". I assume that if "mogrify" is in the path, then
	# ImageMagick is installed and "convert" will run ImageMagick and not some
	# other tool.
	echo -e "${RED}${ME}: ERROR: ImageMagick does not appear to be installed. Please install it.${NC}" >&2
	exit 2
fi

# Optional argument specifying where to create the image(s).
# If not specified, create in current directory.
if [[ -n ${DIRECTORY} ]]; then
	if [[ ! -d ${DIRECTORY} ]]; then
		echo -e "\n${RED}*** ${ME} ERROR: Directory '${DIRECTORY}' not found!\n${NC}" >&2
		exit 2
	fi
	cd "${DIRECTORY}" || exit 3
fi

# If the arguments were specified on the command line, use them instead of the list below.
if [[ $# -eq ${MAX_ARGS} ]]; then
	make_image "${@}"

elif [[ $# -eq 0 ]]; then
#            #1                   #2         #3                 #4     #5        #6      #7         #8      #9        #10         #11       #12
#            Basename             Text       Font               Font   Stroke    Stroke  Background Border  Border    Extensions  Image     Message
#                                 Color      Name               Size   Color     Width   Color      Width   Color                 Size
#            ""                   "white"    "Helvetica-Bold"   128    "black"   2       "#404040"  0       "white"   ${ALL_EXTS} "959x719" ""
#            +--------------------+----------+------------------+------+---------+-------+----------+-------+---------+-----------+---------+--------------------------------------
  make_image NotRunning           "red"      ""                 ""     ""        ""      ""         ""      ""        ""          ""        "Allsky\nis not\nrunning"
  make_image DarkFrames           "green"    ""                 ""     "white"    1      "black"    ""      ""        ""          ""        "Camera\nis taking\ndark frames"
  make_image StartingUp           "lime"     ""                 150    ""        ""      ""         10      "lime"    ""          ""        "Allsky\nis starting\nup"
  make_image Restarting           "lime"     ""                 ""     ""        ""      ""          7      "lime"    ""          ""        "Allsky\nis restarting"
  make_image CameraOffDuringDay   "#ffff4a"  ""                 ""     ""        ""      "gray"      5      "yellow"  ""          ""        "Camera\nis off\nduring the day"
  make_image Error                "red"      ""                 80     ""        ""      ""         10      "red"     ""          ""        "ERROR\n\nSee\n/var/log/allsky.log\nfor details"

  make_image ConfigurationNeeded  "yellow"   ""                 80     ""        ""      ""         ""      ""        ""          ""        "***\nUse the WebUI\n'Allsky Settings'\nlink to\nconfigure Allsky\n***"
  make_image InstallationFailed   "red"      ""                 ""     ""        ""      ""         10      "red"     ""          ""        "***\nInstallation\nfailed\n***"
  make_image InstallationInProgress "yellow" ""                 80     ""        ""      ""         ""      ""        ""          ""        "***\nAllsky installation\nin progress.\nDo NOT\nchange anything.\n***"
  make_image RebootNeeded         "yellow"   ""                 ""     ""        ""      ""          7      "yellow"  ""          ""        "***\nReboot\nNeeded\n***"

fi
