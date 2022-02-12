#!/bin/bash

# Exit code 100 will cause the service to be stopped so the user can fix the problem.

# Make it easy to find the beginning of this run in the log file.
echo "     ***** Starting AllSky *****"

if [ -z "${ALLSKY_HOME}" ]
then
	export ALLSKY_HOME="$(realpath $(dirname "${BASH_ARGV0}"))"
fi

cd "${ALLSKY_HOME}"

source "${ALLSKY_HOME}/variables.sh"
if [ -z "${ALLSKY_CONFIG}" ]; then
	echo "${RED}*** ERROR: variables not set, can't continue!${NC}"
	"${ALLSKY_SCRIPTS}/copy_notification_image.sh" "Error" 2>&1
	sudo systemctl stop allsky
	exit 100
fi

# COMPATIBILITY CHECKS
# Check for a new variable in config.sh that wasn't in prior versions.
# If not set to something (even "") then it wasn't found and force the user to upgrade config.sh
source "${ALLSKY_CONFIG}/config.sh"
if [ ! -v FAN_DATA_FILE ]; then	# FAN_DATA_FILE added after version 0.8.3.
	echo "${RED}*** ERROR: old version of ${ALLSKY_CONFIG}/config.sh detected.${NC}"
	echo "Please move your current config.sh file to config.sh-OLD, then place the newest one"
	echo "from https://github.com/thomasjacquin/allsky in ${ALLSKY_CONFIG} and"
	echo "manually copy your data from the old file to the new one.".

	"${ALLSKY_SCRIPTS}/copy_notification_image.sh" "Error" 2>&1
	sudo systemctl stop allsky
	exit 100
fi

if [ -z "${CAMERA}" ]; then
	echo "${RED}*** ERROR: CAMERA not set, can't continue!${NC}"
	"${ALLSKY_SCRIPTS}/copy_notification_image.sh" "Error" 2>&1
	sudo systemctl stop allsky
	exit 100
fi

# Make sure allsky.sh is not already running.
pgrep allsky.sh | grep -v $$ | xargs "sudo kill -9" 2>/dev/null

if [ "${CAMERA}" = "RPiHQ" ]; then
	# See if we should use libcamera-still or raspistill.
	which libcamera-still > /dev/null
	if [ $? -eq 0 ]; then
		LIBCAMERA_LOG_LEVELS="ERROR,FATAL" libcamera-still --timeout 1 --nopreview > /dev/null 2>&1
		RET=$?
	else
		# Buster and Bullseye have different output so only check the part they have in common.
		vcgencmd get_camera | grep --silent "supported=1" 
		RET=$?
	fi
	if [ $RET -ne 0 ]; then
		echo "${RED}*** ERROR: RPiHQ Camera not found. Exiting.${NC}" >&2
		sudo systemctl stop allsky
		exit 100
	fi

else	# ZWO CAMERA
	reset_usb()		# resets the USB bus
	{
		if [ "${ON_TTY}" = "1" ]; then
			echo "  Resetting USB ports; restart allsky.sh when done." >&2
		else
			echo "  Resetting USB ports and restarting." >&2
			# The service will automatically restart this script.
		fi
		sudo "$UHUBCTL_PATH" -a cycle -l "$UHUBCTL_PORT"
	}

	# Use two commands to better aid debugging when camera isn't found.
	ZWOdev=$(lsusb | awk '/ 03c3:/ { bus=$2; dev=$4; gsub(/[^0-9]/,"",dev); print "/dev/bus/usb/"bus"/"dev;}')
	ZWOIsPresent=$(lsusb -D ${ZWOdev} 2>/dev/null | grep -c 'iProduct .*ASI[0-9]')
	if [ $ZWOIsPresent -eq 0 ]; then
		echo "${RED}*** ERROR: ZWO Camera not found...${NC}" >&2
		if [[ $ZWOdev == "" ]]; then
			echo "  and no USB entry found for it." >&2
		else
			echo "  but USB entry '$ZWOdev' found for it." >&2
		fi
		if [ "$UHUBCTL_PATH" != "" ] ; then
			reset_usb
			exit 0	# exit with 0 so the service is restarted
		else
			echo "  Exiting." >&2
			echo "  If you have the 'uhubctl' command installed, add it to config.sh." >&2
			echo "  In the meantime, try running it to reset the USB bus." >&2
			sudo systemctl stop allsky
			exit 100
		fi
	fi
fi

echo "CAMERA: ${CAMERA}"
if [ "${ALLSKY_DEBUG_LEVEL}" -gt 0 ]; then
	echo "CAMERA_SETTINGS: ${CAMERA_SETTINGS}"
fi

if [ -d "${ALLSKY_TMP}" ]; then
	# remove any lingering old image files.
	rm -f "${ALLSKY_TMP}/${FILENAME}"-202*.${EXTENSION}	# "202" for 2020 and later
else
	# Re-create in case it's on a memory filesystem that gets wiped out at reboot
	mkdir -p "${ALLSKY_TMP}"
fi

# Optionally display a notification image.
USE_NOTIFICATION_IMAGES=$(jq -r '.notificationimages' "$CAMERA_SETTINGS")
if [ "$USE_NOTIFICATION_IMAGES" = "1" ] ; then
	# Can do this in the background to speed up startup
	"${ALLSKY_SCRIPTS}/copy_notification_image.sh" "StartingUp" 2>&1 &
fi

# Building the arguments to pass to the capture binary.
# Want to allow spaces in arguments so need to put quotes around them,
# but in order for it to work need to make ARGUMENTS an array.
ARGUMENTS=()

if [[ ${CAMERA} == "RPiHQ" ]]; then
	# The Bullseye operating system deprecated raspistill so we use libcamera instead.
	(
		grep --silent -i "VERSION_CODENAME=bullseye" /etc/os-release ||
		grep --silent "^dtoverlay=imx477" /boot/config.txt
	)
	# This argument needs to come first since the capture code checks for it first.
	if [ $? -eq 0 ]; then
		ARGUMENTS+=(-cmd libcamera)
	else
		ARGUMENTS+=(-cmd raspistill)
	fi
fi

# This argument should come second so the capture program knows if it should display debug output.
ARGUMENTS+=(-debuglevel ${ALLSKY_DEBUG_LEVEL})

# This argument should come next so the capture program knows if it should use colors.
ARGUMENTS+=(-tty ${ON_TTY})

KEYS=( $(jq -r 'keys[]' $CAMERA_SETTINGS) )
for KEY in ${KEYS[@]}
do
	K="`jq -r '.'$KEY $CAMERA_SETTINGS`"
	ARGUMENTS+=(-$KEY "$K")
done

# When using a desktop environment a preview of the capture can be displayed in a separate window.
# The preview mode does not work if allsky.sh is started as a service or if the debian distribution has no desktop environment.
if [[ $1 == "preview" ]] ; then
	ARGUMENTS+=(-preview 1)
fi

ARGUMENTS+=(-save_dir "${CAPTURE_SAVE_DIR}")

FREQUENCY_FILE="${ALLSKY_TMP}/IMG_UPLOAD_FREQUENCY.txt"
# If the user wants images uploaded only every n times, save that number to a file.
if [ "${IMG_UPLOAD_FREQUENCY}" != "1" ]; then
	# Save "1" so we upload the first image.
	# saveImage.sh will write ${IMG_UPLOAD_FREQUENCY} to the file as needed.
	echo "1" > "${FREQUENCY_FILE}"
else
	rm -f "${FREQUENCY_FILE}"
fi

if [ "${DAYTIME_CAPTURE}" = "true" ] ; then
	DAYTIME_CAPTURE=1
else
	DAYTIME_CAPTURE=0
fi
ARGUMENTS+=(-daytime $DAYTIME_CAPTURE)

[ "$CAPTURE_EXTRA_PARAMETERS" != "" ] && ARGUMENTS+=(${CAPTURE_EXTRA_PARAMETERS})	# Any additional parameters

echo "${ARGUMENTS[@]}" > ${ALLSKY_TMP}/capture_args.txt		# for debugging

GOT_SIGTERM="false"
GOT_SIGUSR1="false"
# trap "GOT_SIGTERM=true" SIGTERM
# trap "GOT_SIGUSR1=true" SIGUSR1

if [[ $CAMERA == "ZWO" ]]; then
	CAPTURE="capture"
elif [[ $CAMERA == "RPiHQ" ]]; then
	CAPTURE="capture_RPiHQ"
fi
"${ALLSKY_HOME}/${CAPTURE}" "${ARGUMENTS[@]}"
RETCODE=$?
if [ $RETCODE -ne 0 ]; then
	  echo -e "${RED}'${CAPTURE}' exited with RETCODE=${RETCODE}, GOT_SIGTERM=$GOT_SIGTERM, GOT_SIGUSR1=$GOT_SIGUSR1${NC}"
fi

# 98 return code means we are restarting.  The capture program dealt with notification images.
if [ "${RETCODE}" -eq 98 ] ; then
	exit 0	# use 0 so the service is restarted
fi

# 99 is a special return code which means to reset usb bus if possible.
if [ "${RETCODE}" -eq 99 -a "$UHUBCTL_PATH" != "" ] ; then
	reset_usb
	exit 0	# use 0 so the service is restarted
fi

if [ "${USE_NOTIFICATION_IMAGES}" = "1" -a "${RETCODE}" -ne 0 ] ; then
	# RETCODE -ge 100 means the we should not restart until the user fixes the error.
	if [ "$RETCODE" -ge 100 ]; then
		echo "***"
		if [ ${ON_TTY} = "1" ]; then
			echo "*** After fixing, restart allsky.sh. ***"
		else
			echo "*** After fixing, restart the allsky service. ***"
		fi
		echo "***"
		"${ALLSKY_SCRIPTS}/copy_notification_image.sh" "Error" 2>&1

		# Don't let the service restart us 'cause we'll likely get the same error again
		sudo systemctl stop allsky
	else
		"${ALLSKY_SCRIPTS}/copy_notification_image.sh" "NotRunning" 2>&1
		# If started by the service, it will restart us once we exit.
	fi
fi

exit $RETCODE
