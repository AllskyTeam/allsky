#!/bin/bash
isPresent=$(lsusb -D $(lsusb | awk '/ 03c3:/ { bus=$2; dev=$4; gsub(/[^0-9]/,"",dev); print "/dev/bus/usb/"bus"/"dev;}') | grep -c 'iProduct .*ASI[0-9]')
if [ $isPresent -eq 0 ]; then
        echo ZWO Camera not found.  Exiting. >&2
        sudo systemctl stop allsky
        exit 0
fi

if [ -z "$ALLSKY_HOME" ]
then
      export ALLSKY_HOME=$(dirname $BASH_ARGV0)
fi

source $ALLSKY_HOME/config.sh
source $ALLSKY_HOME/scripts/filename.sh

echo "Starting allsky camera..."
cd $ALLSKY_HOME

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

echo "$ARGUMENTS">>log.txt

$ALLSKY_HOME/capture $ARGUMENTS
