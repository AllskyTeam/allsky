#!/bin/bash

# Make it easy to find the beginning of this run in the log file.
echo "     ***** Starting AllSky *****"

if [ -z "${ALLSKY_HOME}" ]
then
	export ALLSKY_HOME="$(realpath $(dirname "${BASH_ARGV0}")/..)"
fi

cd "${ALLSKY_HOME}"

# Reset auto camera selection, so config.sh does not pick up old camera selection.
> "${ALLSKY_CONFIG}/autocam.sh"

source "${ALLSKY_HOME}/variables.sh"
source "${ALLSKY_CONFIG}/config.sh"
mkdir -p "${ALLSKY_TMP}"

# Make sure allsky.sh is not already running.
ps -ef | grep allsky.sh | grep -v $$ | xargs "sudo kill -9" 2>/dev/null

# old/regular manual camera selection mode => exit if no requested camera was found
if [[ $(vcgencmd get_camera) == "supported=1 detected=1" ]]; then
	RPiHQIsPresent=1
else
	RPiHQIsPresent=0
fi
if [[ $CAMERA == "RPiHQ" && $RPiHQIsPresent -eq 0 ]]; then
	echo "RPiHQ Camera not found. Exiting." >&2
	sudo systemctl stop allsky
	exit 1
fi

if [[ $CAMERA != "RPiHQ" ]]; then
	# Use two commands to better aid debugging when camera isn't found.
	# xxxxx This doesn't catch cases where CAMERA is "auto" and we should use ZWO.
	ZWOdev=$(lsusb | awk '/ 03c3:/ { bus=$2; dev=$4; gsub(/[^0-9]/,"",dev); print "/dev/bus/usb/"bus"/"dev;}')
	ZWOIsPresent=$(lsusb -D ${ZWOdev} 2>/dev/null | grep -c 'iProduct .*ASI[0-9]')
	if [[ $CAMERA == "ZWO" && $ZWOIsPresent -eq 0 ]]; then
		echo "ZWO Camera not found..." >&2
		if [[ $ZWOdev == "" ]]; then
			echo "  and no USB entry found for it." >&2
		else
			echo "  but USB entry '$ZWOdev' found for it." >&2
		fi
		if [ "$UHUBCTL_PATH" != "" ] ; then
			if tty --silent ; then
				echo "  Resetting USB ports; restart allsky.sh when done." >&2
			else
				echo "  Resetting USB ports and restarting." >&2
				# The service will automatically restart this script.
			fi
			sudo "$UHUBCTL_PATH" -a cycle -l "$UHUBCTL_PORT"
			exit 1
		else
			echo "  Exiting." >&2
			echo "  If you have the 'uhubctl' command installed, add it to config.sh." >&2
			echo "  In the meantime, try running it to reset the USB bus." >&2
			sudo systemctl stop allsky
			exit 1
		fi
	fi
fi

# CAMERA AUTOSELECT
# Exit if no camera found.
WAS_AUTO=0

if [[ $CAMERA == "auto" ]]; then
	WAS_AUTO=1
	echo "Trying to automatically determine camera type"
	if [[ $ZWOIsPresent -eq 0 && $RPiHQIsPresent -eq 0 ]]; then
		echo "None of RPI or ZWO Cameras were found. Exiting." >&2
		sudo systemctl stop allsky
		exit 1
	fi
	# Prioritize ZWO camera if exists, otherwise use RPI camera.
	if [[ $ZWOIsPresent -eq 0 ]]; then
		CAMERA="RPiHQ"
	else
		CAMERA="ZWO"
	fi

	# redefine the settings variable
	CAMERA_SETTINGS="${CAMERA_SETTINGS_DIR}/settings_${CAMERA}.json"
fi

if [ $WAS_AUTO -eq 1 ]; then	# Get the proper debug level since earlier config.sh run couldn't.
	ALLSKY_DEBUG_LEVEL=$(jq -r '.debuglevel' "${CAMERA_SETTINGS}")
fi

echo "CAMERA: ${CAMERA}"
if [ "${ALLSKY_DEBUG_LEVEL}" -gt 0 ]; then
	echo "CAMERA_SETTINGS: ${CAMERA_SETTINGS}"
fi

# Save auto camera selection for the current session, will be read in config.sh file.
echo "export CAMERA=${CAMERA}" > "${ALLSKY_CONFIG}/autocam.sh"

# This must be called after CAMERA AUTOSELECT above to refresh the file name.
source "${ALLSKY_SCRIPTS}/filename.sh"

# Optionally display a notification image. This must come after the creation of "autocam.sh" above.
USE_NOTIFICATION_IMAGES=$(jq -r '.notificationimages' "$CAMERA_SETTINGS")
if [ "$USE_NOTIFICATION_IMAGES" = "1" ] ; then
	"${ALLSKY_SCRIPTS}/copy_notification_image.sh" "StartingUp" 2>&1
fi

echo "Starting allsky camera..."

# Building the arguments to pass to the capture binary.
# Want to allow spaces in arguments so need to put quotes around them,
# but in order for it to work need to make ARGUMENTS an array.
ARGUMENTS=()

# Determine if we're called from the service (tty will fail).
# tty should come first so the capture program knows if it should use colors.
if tty --silent ; then
	TTY=1
else
	TTY=0
fi
ARGUMENTS+=(-tty $TTY)

KEYS=( $(jq -r 'keys[]' $CAMERA_SETTINGS) )
for KEY in ${KEYS[@]}
do
	K="`jq -r '.'$KEY $CAMERA_SETTINGS`"
	ARGUMENTS+=(-$KEY "$K")
done

# When using a desktop environment (Remote Desktop, VNC, HDMI output, etc), a preview of the capture can be displayed in a separate window
# The preview mode does not work if allsky.sh is started as a service or if the debian distribution has no desktop environment.
if [[ $1 == "preview" ]] ; then
	ARGUMENTS+=(-preview 1)
fi

# "capture" expects 0 or 1; newer versions of config.sh use "true" and "false".
# DAYTIME is the old name for DAYTIME_CAPTURE.
# TODO: These checks will go away in the future.
if [ "${DAYTIME_CAPTURE}" = "true" -o "${DAYTIME}" = "1" ] ; then
	DAYTIME_CAPTURE=1
elif [ "${DAYTIME_CAPTURE}" = "false" -o "${DAYTIME}" = "0" ] ; then
	DAYTIME_CAPTURE=0
fi
ARGUMENTS+=(-daytime $DAYTIME_CAPTURE)

[ "$ADD_PARAMS" != "" ] && ARGUMENTS+=($ADD_PARAMS)	# Any additional parameters

for A in ${ARGUMENTS[@]}
do
	echo "${A}"
done > $ALLSKY_TMP/capture_args.txt

if [[ $CAMERA == "ZWO" ]]; then
	CAPTURE="capture"

elif [[ $CAMERA == "RPiHQ" ]]; then
	CAPTURE="capture_RPiHQ"
fi
"${ALLSKY_HOME}/${CAPTURE}" "${ARGUMENTS[@]}"
RETCODE=$?
[ $RETCODE -ne 0 ] && echo "'${CAPTURE}' exited with RETCODE=${RETCODE}"

if [ "${USE_NOTIFICATION_IMAGES}" = "1" -a "${RETCODE}" -ne 0 ] ; then
	# ${CAPTURE} will do this if it exited with 0.
	# RETCODE -gt 100 means the we should not restart until the user fixes the error.
	if [ "$RETCODE" -gt 100 ]; then	
		"${ALLSKY_SCRIPTS}/copy_notification_image.sh" "Error" 2>&1
		if tty --silent ; then
			echo "*** After fixing, restart allsky.sh. ***"
		else
			echo "*** After fixing, restart the allsky service. ***"
		fi
		sudo systemctl stop allsky
	else
		"${ALLSKY_SCRIPTS}/copy_notification_image.sh" "NotRunning" 2>&1
		# If started by the service, it will restart us once we exit.
	fi
fi

exit $RETCODE
