#!/bin/bash

if [ -z "$ALLSKY_HOME" ]
then
      export ALLSKY_HOME="$( cd "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"
fi

# reset auto camera selection, so $ALLSKY_HOME/config.sh do not pick up old camera selection
cd $ALLSKY_HOME
echo "" > "$ALLSKY_HOME/autocam.sh"
source $ALLSKY_HOME/config.sh

echo "     ***** Starting AllSky *****"	# ECC added to make it easy to find beginning of this run in the log file
echo "Making sure allsky.sh is not already running..."
ps -ef | grep allsky.sh | grep -v $$ | xargs "sudo kill -9" 2>/dev/null

mv -f log.txt OLD_log.txt 2> /dev/null		# ECC added
> log.txt

# ECC added notification images
USE_NOTIFICATION_IMAGES=$(jq -r '.notificationimages' "$CAMERA_SETTINGS")
if [ "$USE_NOTIFICATION_IMAGES" = "1" ] ; then
	$ALLSKY_HOME/scripts/copy_notification_image.sh "StartingUp" 2>&1
fi

# old/regular manual camera selection mode => exit if no requested camera was found
RPiHQIsPresent=$(vcgencmd get_camera)
if [[ $CAMERA == "RPiHQ" && $RPiHQIsPresent != "supported=1 detected=1" ]]; then
echo "RPiHQ Camera not found. Exiting." >&2
        sudo systemctl stop allsky
        exit 0
fi

# ECC: added: 2>/dev/null, and separated into 2 commands to better aid debugging when camera isn't found.
ZWOdev=$(lsusb | awk '/ 03c3:/ { bus=$2; dev=$4; gsub(/[^0-9]/,"",dev); print "/dev/bus/usb/"bus"/"dev;}')
ZWOIsPresent=$(lsusb -D ${ZWOdev} 2>/dev/null | grep -c 'iProduct .*ASI[0-9]')
if [[ $CAMERA == "ZWO" &&  $ZWOIsPresent -eq 0 ]]; then
        echo "ZWO Camera not found..." >&2
	if [[ $ZWOdev == "" ]]; then
		echo "  and no USB entry found for it." >&2
	else
		echo "  but entry '$ZWOdev' found for it." >&2
	fi
	if true; then
        	echo "  Fixing USB and restarting." >&2
		sudo ~/uhubctl/uhubctl -a cycle -l 2		# l-ocation 2 are USB 3 ports
		# No need for 'sudo systemctl stop restart' since the service will automatically restart this script.
        	exit 0
	else
        	echo "  Exiting." >&2
        	sudo systemctl stop allsky
        	exit 0
	fi
fi

# CAMERA AUTOSELECT
# exit if no camare found at all
if [[ $CAMERA -eq "auto" ]]; then
  echo "Trying to automatically choose between ZWO and RPI camera"
  if [[ $ZWOIsPresent -eq 0 && $RPiHQIsPresent != "supported=1 detected=1" ]]; then
          echo "None of RPI or ZWO Cameras were found. Exiting." >&2
          sudo systemctl stop allsky
          exit 0
  fi
  # prioritize ZWO camera if exists, and use RPI camera otherwise
  if [[ $ZWOIsPresent -eq 0 ]]; then
    echo "No ZWO camera found. Choosing RPI"
    CAMERA="RPiHQ"
  else
    echo "ZWO camera found. Choosing ZWO"
    CAMERA="ZWO"
  fi

  # redefine the settings variable
  CAMERA_SETTINGS="$CAMERA_SETTINGS_DIR/settings_$CAMERA.json"
fi


echo "Settings check done"
echo "CAMERA: ${CAMERA}"
echo "CAMERA_SETTINGS: ${CAMERA_SETTINGS}"
# save auto camera selection for the current session, will be read in "$ALLSKY_HOME/config.sh" file
echo "export CAMERA=$CAMERA" > "$ALLSKY_HOME/autocam.sh"

# this must be called after camera autoselect
source $ALLSKY_HOME/scripts/filename.sh

echo "Starting allsky camera..."

# Building the arguments to pass to the capture binary
ARGUMENTS=""
KEYS=( $(jq -r 'keys[]' $CAMERA_SETTINGS) )
for KEY in ${KEYS[@]}
do
	ARGUMENTS="$ARGUMENTS -$KEY `jq -r '.'$KEY $CAMERA_SETTINGS` "
done

# When using a desktop environment (Remote Desktop, VNC, HDMI output, etc), a preview of the capture can be displayed in a separate window
# The preview mode does not work if allsky.sh is started as a service or if the debian distribution has no desktop environment.
if [[ $1 == "preview" ]] ; then
	ARGUMENTS="$ARGUMENTS -preview 1"
fi
ARGUMENTS="$ARGUMENTS -daytime $DAYTIME"

echo "$ARGUMENTS" >> log.txt			# ECC modified

RETCODE=0
if [[ $CAMERA == "ZWO" ]]; then
	$ALLSKY_HOME/capture $ARGUMENTS
	RETCODE=$?
	echo "capture exited with retcode=$RETCODE"

elif [[ $CAMERA == "RPiHQ" ]]; then
	$ALLSKY_HOME/capture_RPiHQ $ARGUMENTS
	RETCODE=$?
else
	exit 1
fi

if [ "$USE_NOTIFICATION_IMAGES" = "1" -a "$RETCODE" -ne 0 ] ; then
	# "capture" will do this if it exited with 0.
	$ALLSKY_HOME/scripts/copy_notification_image.sh "NotRunning" 2>&1
fi

exit $RETCODE
