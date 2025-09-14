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
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"		|| exit "${EXIT_ERROR_STOP}"

readonly ALL_EXTS="jpg png"		# all the image filename extensions we support

# Sometimes a notification image will accidently make its way into an "images/YYYYMMDD" directory
# and then into a keogram and startrails.
# To avoid this, create images that are not even numbers, which cameras produce.
# The keogram and startrails program will ignore these images since they aren't "standard".
DEFAULT_IMAGE_SIZE="959x719"

function usage_and_exit()
{
	local RET=${1}
	exec >&2
	local MSG="\nUsage: ${ME} [--help] [--directory dir] [--size XxY]"
	MSG+="\n    [Basename TextColor Font FontSize StrokeColor StrokeWidth BgColor"
	MSG+="\n     BorderWidth BorderColor Extensions ImageSize Message]\n"
	if [[ ${RET} -ne 0 ]]; then
		E_ "${MSG}"
	else
		echo -e "${MSG}"
	fi
	echo "When run without 'Basename' and the other arguments,"
	echo "ALL notification types are created with extensions: ${ALL_EXTS/ /, }."
	echo
	echo "Arguments:"
	echo "   --help              Displays this message and exits."
	echo "   --directory dir     Creates the file(s) in that directory, otherwise in \${PWD}."
	echo -n "   --size XxY          Creates images that are X by Y pixels."
	echo " Default: ${DEFAULT_IMAGE_SIZE} pixels."
	echo "   Basename            The name of the file to create, not including the extension."
	echo "                       If '+' the current 'Filename' setting is used."
	echo "   TextColor, et. al.  Attributes of the message (color, size, etc.)."
	echo "   Extensions          One or more space-separated list of file extensions to create."
	echo "                       If '+' the current 'Filename' setting is used."
	echo "   Message             The message to add to the image."
	echo

	exit "${RET}"
}

# Check arguments
OK="true"
HELP="false"
DIRECTORY=""
IMAGE_SIZE="${DEFAULT_IMAGE_SIZE}"
while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
		--help)
			HELP="true"
			;;
		--directory)
			DIRECTORY="${2}"
			if [[ ! -d ${DIRECTORY} ]]; then
				E_ "ERROR: Directory '${DIRECTORY}' not found!" >&2
				OK="false"
			fi
			shift
			;;
		--size)
			IMAGE_SIZE="${2}"
			X="${IMAGE_SIZE%x*}"
			Y="${IMAGE_SIZE##*x}"
			[[ $((X % 2)) -ne 0 ]] && ((X--))
			[[ $((Y % 2)) -ne 0 ]] && ((Y--))
			IMAGE_SIZE="${X}x${Y}"
			shift
			;;
		-*)
			E_ "ERROR: Unknown argument: '${ARG}'." >&2
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
	{
		E_ "ERROR: Either specify ALL ${MAX_ARGS} arguments, or don't specify any."
		echo "You specified $# arguments."
	} >&2
	usage_and_exit 1
fi

declare LAST_ARG="${MAX_ARGS}"
if [[ $# -eq ${MAX_ARGS} ]]; then
	OK="true"
	if [[ -z ${1} ]]; then
		E_ "ERROR: The 'Basename' argument must be specified." >&2
		OK="false"
	fi
	if [[ -z ${LAST_ARG} ]]; then
		E_ "ERROR: The 'Message' argument must be specified." >&2
		OK="false"
	fi
	[[ ${OK} == "false" ]] && usage_and_exit 1
fi

IMAGE_NAME=""
function make_image()
{
	BASENAME="${1}"
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

	if [[ ${BASENAME} == "+" ]]; then
		BASENAME="${ALLSKY_FILENAME}"
	else
		echo "${BASENAME}" | grep -qEi "[.](${ALL_EXTS/ /|})"
		if [[ $? -ne 1 ]]; then
			E_ "ERROR: Do not add an extension to the 'Basename' argument." >&2
			usage_and_exit 1
		fi
	fi
	if [[ ${EXTS} == "+" ]]; then
		EXTS="${ALLSKY_EXTENSION}"
	fi

	if [[ ${BORDER_WIDTH} -ne 0 ]]; then
		BORDER="-border ${BORDER_WIDTH} -bordercolor ${BORDER_COLOR}"
	else
		BORDER=""
	fi

	[[ ${ON_TTY} == "true" ]] && echo "Creating '${BASENAME}' in ${PWD}."
	for EXT in ${EXTS} ; do
		# In case ${EXT} starts with a ".", remove it.
		EXT="${EXT/./}"

		# Make highest quality for jpg and highest loss-less compression for png.
		# jpg files at 95% produce somewhat bad artifacts.  Even 100% produces some artifacts.

		if [[ ${EXT} == "jpg" ]]; then
			Q=100
		else
			Q=9
		fi

		IMAGE_NAME="${BASENAME}.${EXT}"		# Global

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
			"${IMAGE_NAME}" || echo "${ME}: Unable to create image for '${MSG}'" >&2
	done

	return 0
}

if ! which mogrify > /dev/null ; then
	# Testing for mogrify which seems like a much more distinctive executable
	# name than "convert". I assume that if "mogrify" is in the path, then
	# ImageMagick is installed and "convert" will run ImageMagick and not some
	# other tool.
	E_ "${ME}: ERROR: ImageMagick does not appear to be installed. Please install it." >&2
	exit 2
fi

# Optional argument specifying where to create the image(s).
# If not specified, create in current directory.
if [[ -n ${DIRECTORY} ]]; then
	if [[ ! -d ${DIRECTORY} ]]; then
		E_ "${ME}: ERROR: Directory '${DIRECTORY}' not found!" >&2
		exit 2
	fi
	cd "${DIRECTORY}" || exit 3
fi

# If the arguments were specified on the command line, use them instead of the list below.
if [[ $# -eq ${MAX_ARGS} ]]; then
	make_image "${@}"
	FILE_NAME="${PWD}/${IMAGE_NAME}"		# Need full pathname
	export ME
	processAndUploadImage "${FILE_NAME}" "${IMAGE_NAME}"
	exit $?
fi


#          #1                   #2         #3                 #4     #5        #6      #7         #8      #9        #10         #11       #12
#          Basename             Text       Font               Font   Stroke    Stroke  Background Border  Border    Extensions  Image     Message
#                               Color      Name               Size   Color     Width   Color      Width   Color                 Size
#          ""                   "white"    "Helvetica-Bold"   128    "black"   2       "#404040"  0       "white"   ${ALL_EXTS} "959x719" ""
#          +--------------------+----------+------------------+------+---------+-------+----------+-------+---------+-----------+---------+--------------------------------------
make_image NotRunning           "red"      ""                 ""     ""        ""      ""         ""      ""        ""          ""        "Allsky\nis not\nrunning"
make_image DarkFrames           "green"    ""                 ""     "white"    1      "black"    ""      ""        ""          ""        "Camera\nis taking\ndark frames"
make_image StartingUp           "lime"     ""                 150    ""        ""      ""         10      "lime"    ""          ""        "Allsky\nis starting\nup"
make_image Restarting           "lime"     ""                 ""     ""        ""      ""          7      "lime"    ""          ""        "Allsky\nis restarting"
make_image CameraOffDuringDay   "#ffff4a"  ""                 ""     ""        ""      "gray"      5      "yellow"  ""          ""        "Camera\nis off\nduring the day"
make_image CameraOffDuringNight "#ffff4a"  ""                 ""     ""        ""      "gray"      5      "yellow"  ""          ""        "Camera\nis off\nat night"
make_image Error                "red"      ""                 ""     ""        ""      ""         10      "red"     ""          ""        "ERROR\nSee the WebUI\nfor details"
make_image InstallationFailed   "red"      ""                 ""     ""        ""      ""         10      "red"     ""          ""        "Installation\nfailed"
make_image InstallationInProgress "yellow" ""                 80     ""        ""      ""         ""      ""        ""          ""        "Allsky installation\nin progress.\n\nDo NOT\nchange anything."
make_image ConfigurationNeeded  "yellow"   ""                 80     ""        ""      ""          5      "red"     ""          ""        "Use the WebUI's\n'Allsky Settings' page\nto configure Allsky"
make_image ReviewNeeded         "yellow"   ""                 80     ""        ""      ""          5      "yellow"  ""          ""        "Review the settings\non the WebUI's\n'Allsky Settings' page"
make_image RebootNeeded         "yellow"   ""                 ""     ""        ""      ""          7      "yellow"  ""          ""        "A reboot\nis needed"

exit 0
