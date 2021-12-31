#!/bin/bash
# vim: tabstop=4 shiftwidth=4 softtabstop=4

# Create notification image(s).
# The default ones are listed in this file, but
# other scripts can create custom messages on-the-fly by passing arguments to this script.
# This is quick - on a Pi 4 it takes about one second per image.

# Allow this script to be executed manually, which requires several variables to be set.
if [ -z "${ALLSKY_HOME}" ] ; then
	export ALLSKY_HOME=$(realpath $(dirname "${BASH_ARGV0}")/..)
fi
source "${ALLSKY_HOME}/variables.sh"
ME="$(basename "${BASH_ARGV0}")"

readonly USAGE="Usage: ${ME} [StartingUp TextColor Font FontSize StrokeColor StrokeWidth BgColor BorderColor Extensions ImageSize 'Message']"
readonly ALL_EXTS="jpg png"		# all the image filename extensions we support

function make_image() {
	BASENAME="$1"
	TEXTCOLOR="${2:-"white"}"
	FONT="${3:-"Helvetica-Bold"}"
	FONT_SIZE="${4:-128}"
	INTERLINE_SPACING=$(echo "${FONT_SIZE} / 3" | bc)
	STROKE_COLOR="${5:-"black"}"
	STROKE_WIDTH="${6:-2}"
	BGCOLOR="${7:-"#404040"}"
	BORDER_WIDTH="${8:-0}"
	BORDER_COLOR="${9:-"white"}"
	EXTS="${10:-"${ALL_EXTS}"}"
	# IM_SIZE is a hack to make these images more detectable. Typically camera images are
	# at least an even number of pixels, and usually a multiple of 8 pixels.
	# So just in case someone has a camera configured for 960x720 images, or
	# is rescaling to 960x720... this will allow these notification images to be detected.
	IM_SIZE="${11:-"959x719"}"
	MSG="${12}"

	echo "${BASENAME}" | grep -qEi "[.](${ALL_EXTS/ /|})"
	if [ $? -ne 1 ] ; then
		echo -e "${RED}ERROR: Do not add an extension to the basename${NC}."
		echo "${USAGE}"
		exit 1
	fi

	if [ ${BORDER_WIDTH} -ne 0 ]; then
		BORDER="-border ${BORDER_WIDTH} -bordercolor ${BORDER_COLOR}"
	else
		BORDER=""
	fi

	echo "Creating '${BASENAME}'"
	for EXT in ${EXTS} ; do
		convert \
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
if [ $? -ne 0 ] ; then
	# Testing for mogrify which seems like a much more distinctive executable
	# name than "convert". I assume that if "mogrify" is in the path, then
	# ImageMagick is installed and "convert" will run ImageMagick and not some
	# other tool.
	echo -e "${RED}ERROR: ImageMagick does not appear to be installed. Please install it.${NC}" >&2
	exit 2
fi

# If the arguments were specified on the command line, use them instead of the list below.
if [ $# -eq 12 ]; then
	if [ "${1}" = "" -o "${12}" = "" ]; then
		echo -e '${RED}ERROR: Basename ($1) and message ($12) must be specified.${NC}' >&2
		echo "${USAGE}"
		exit 1
	fi
	make_image "${@}"

elif [ $# -eq 0 ]; then
	#ake_image  1: Basename            2: "TxtColor"                          \
	#           3: "Font"              4: "FontSize"                          \
	#		    5: "StrokeColor"       6: "StrokeWidth"                       \
	#		    7: "BgColor"           8: "BorderWidth"    9: "BorderColor"   \
	#		   10: "Extensions"       11: "ImageSize"                         \
	#		   12: "Message"
	make_image NotRunning                 ""                                  \
			       ""                     ""                                  \
			       ""                     ""                                  \
				   ""                     ""                  ""              \
				   ""                     ""                                  \
				   "AllSky\nsoftware\nis not running"

	make_image DarkFrames                 "green"                             \
				   ""                     ""                                  \
				   "white"                ""                                  \
				   "black"                ""                  ""              \
				   ""                     ""                                  \
				   "Camera\nis taking\ndark frames"

	make_image StartingUp                 "green"                             \
				   ""                     ""                                  \
				   ""                     ""                                  \
				   ""                     ""                  ""              \
				   ""                     ""                                  \
				   "AllSky\nsoftware\nis starting up"

	make_image Restarting                 "lime"                              \
				   ""                     ""                                  \
				   ""                     ""                                  \
				   ""                     ""                  ""              \
				   ""                     ""                                  \
				   "AllSky\nsoftware\nis restarting"

	make_image CameraOffDuringDay         "#ffff4a"                           \
				   ""                     ""                                  \
				   ""                     ""                                  \
				   ""                     ""                  ""              \
				   ""                     ""                                  \
				   "Camera\nis off\nduring the day"

	make_image Error                      "red"                               \
				   ""                     100                                 \
				   ""                     ""                                  \
				   ""                     "10"                "red"           \
				   ""                     ""                                  \
				   "ERROR:\nSee\n/var/log/allsky.log\nfor details"

else
	echo -e "${RED}ERROR: Either specify ALL arguments, or don't specify any.${NC}" >&2
	echo "${USAGE}"
	exit 1
fi
