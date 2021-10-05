#!/bin/bash

function make_image() {
    BASENAME="$1"
    TEXTCOLOR="$2"
    STROKE="$3"
    BGCOLOR="$4"
    MSG="$5"
    FS=$6
    EXTS="JPG PNG"

    echo "$BASENAME" | grep -qEi '[.](${EXTS/ /|})'
    if [ $? -ne 1 ] ; then
        echo "run this function with only the image basename"
        echo "make_image StartingUp '#00ff00' 'Allsky Starting Up'"
        exit 1
    fi

	# Hack to make these images more detectable. Typically camera images are
	# at least an even number of pixels, and usually a multiple of 8 pixels.
	# So just in case someone has a camera configured for 960x720 images, or
	# is rescaling to 960x720... this will allow them to be detected.
    IM_SIZE="959x719"
    FONT="Arial"
    FONT_SIZE=${FS:-128}

    for EXT in jpg png ; do
        convert \
            -background "$BGCOLOR" \
            -fill "$TEXTCOLOR" \
            -strokewidth 2 \
            -stroke "$STROKE}" \
            -size $IM_SIZE \
            -font $FONT \
            -pointsize $FONT_SIZE \
            -gravity center \
            label:"${MSG}" \
            "${BASENAME}.${EXT}"
    done

}

if [ -z "$(which mogrify)" ] ; then
    # Testing for mogrify which seems like a much more distinctive executable
	# name than "convert". I assume that if "mogrify" is in the path, then
	# ImageMagick is installed and "convert" will run ImageMagick and not some
	# other tool.
	echo ImageMagick does not appear to be installed. Please install it.
	exit 1
fi

#          BaseName           TxtColor  Stroke    BgColor   Message                                                       FontSize
make_image NotRunning         "#ff0000" "#000000" "#404040" "Allsky software\nis not running"
make_image DarkFrames         "#00ff00" "#ffffff" "#000000" "Camera is taking\ndark frames"
make_image StartingUp         "#00ff00" "#000000" "#404040" "Allsky Software\nis starting up"
make_image CameraOffDuringDay "#ffff4a" "#000000" "#404040" "Camera is off\nduring the day"
make_image Error              "#ff0000" "#000000" "#404040" "ERROR: See log\nfile for information\n\n/var/log/allsky.log" 72

