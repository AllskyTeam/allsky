#!/bin/bash

if [ -z "$ALLSKY_HOME" ]
then
      export ALLSKY_HOME="$( cd "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"
fi

# reset auto camera selection, so $ALLSKY_HOME/config.sh do not pick up old camera selection
cd $ALLSKY_HOME
echo "" > "$ALLSKY_HOME/config/autocam.sh"
source $ALLSKY_HOME/config/config.sh

# Make it easy to find the beginning of this run in the log file.
echo "     ***** Starting AllSky *****"
echo "Making sure allsky.sh is not already running..."
ps -ef | grep allsky.sh | grep -v $$ | xargs "sudo kill -9" 2>/dev/null

mv -f log.txt OLD_log.txt 2> /dev/null		# save the prior log file for debugging
> log.txt

# old/regular manual camera selection mode => exit if no requested camera was found
if [[ $(vcgencmd get_camera) == "supported=1 detected=1" ]]; then
	RPiHQIsPresent=1
else
	RPiHQIsPresent=0
fi
if [[ $CAMERA == "RPiHQ" && $RPiHQIsPresent -eq 0 ]]; then
	echo "RPiHQ Camera not found. Exiting." >&2
        sudo systemctl stop allsky
        exit 0
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
        		exit 0
		else
        		echo "  Exiting." >&2
        		echo "  If you have the 'uhubctl' command installed, add it to config.sh." >&2
        		echo "  In the meantime, try running it to reset the USB bus." >&2
        		sudo systemctl stop allsky
        		exit 0
		fi
	fi
fi

# CAMERA AUTOSELECT
# exit if no camera found at all
WAS_AUTO=0

if [[ $CAMERA == "auto" ]]; then
  WAS_AUTO=1
  echo "Trying to automatically choose between ZWO and RPI camera"
  if [[ $ZWOIsPresent -eq 0 && $RPiHQIsPresent -eq 0 ]]; then
          echo "None of RPI or ZWO Cameras were found. Exiting." >&2
          sudo systemctl stop allsky
          exit 0
  fi
  # prioritize ZWO camera if exists, and use RPI camera otherwise
  if [[ $ZWOIsPresent -eq 0 ]]; then
   CAMERA="RPiHQ"
  else
   CAMERA="ZWO"
  fi

  # redefine the settings variable
  CAMERA_SETTINGS="$CAMERA_SETTINGS_DIR/settings_$CAMERA.json"
fi

echo "CAMERA: ${CAMERA}"
echo "CAMERA_SETTINGS: ${CAMERA_SETTINGS}"
# save auto camera selection for the current session, will be read in "$ALLSKY_HOME/config.sh" file
echo "export CAMERA=$CAMERA" > "$ALLSKY_HOME/config/autocam.sh"

if [ $WAS_AUTO -eq 1 ]; then  # Get the proper debug level since earlier config.sh run couldn't.
	ALLSKY_DEBUG_LEVEL=$(jq -r '.debuglevel' "${CAMERA_SETTINGS}")
fi

if [ $WAS_AUTO -eq 1 ]; then  # Get the proper debug level since earlier config.sh run couldn't.
	ALLSKY_DEBUG_LEVEL=$(jq -r '.debuglevel' "${CAMERA_SETTINGS}")
fi

# this must be called after camera autoselect
source $ALLSKY_HOME/scripts/filename.sh

# Optionally display a notification image. This has to come after the creation of "autocam.sh" above.
USE_NOTIFICATION_IMAGES=$(jq -r '.notificationimages' "$CAMERA_SETTINGS")
if [ "$USE_NOTIFICATION_IMAGES" = "1" ] ; then
	$ALLSKY_HOME/scripts/copy_notification_image.sh "StartingUp" 2>&1
fi

echo "Starting allsky camera..."

# Building the arguments to pass to the capture binary.
# Want to allow spaces in arguments so need to put quotes around them,
# but in order for it to work need to make ARGUMENTS an array.
ARGUMENTS=()
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
ARGUMENTS+=(-daytime $DAYTIME)

# Determine if we're called from the service (tty will fail).
tty --silent
if [ $? -eq 0 ] ; then
	TTY=1
else
	TTY=0
fi
ARGUMENTS+=(-tty $TTY)

Z=""
for A in ${ARGUMENTS[@]}
do
	Z="$Z $A"
done
echo "$Z" >> log.txt

RETCODE=0
if [[ $CAMERA == "ZWO" ]]; then
	$ALLSKY_HOME/capture "${ARGUMENTS[@]}"
	RETCODE=$?
	echo "capture exited with retcode=$RETCODE"

elif [[ $CAMERA == "RPiHQ" ]]; then
	$ALLSKY_HOME/capture_RPiHQ "${ARGUMENTS[@]}"
	RETCODE=$?
	echo "capture_RPiHQ exited with retcode=$RETCODE"
else
	exit 1
fi

if [ "$USE_NOTIFICATION_IMAGES" = "1" -a "$RETCODE" -ne 0 ] ; then
	# "capture" will do this if it exited with 0.
	if [ "$RETCODE" -gt 100 ]; then	
		$ALLSKY_HOME/scripts/copy_notification_image.sh "Error" 2>&1
		echo "*** Waiting for you to fix this.  Restart when done fixing. ***"
		sudo service allsky stop
	else
		$ALLSKY_HOME/scripts/copy_notification_image.sh "NotRunning" 2>&1
	fi
fi

exit $RETCODE
