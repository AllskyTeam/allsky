#!/bin/bash

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
	exit 1
fi

# Reset auto camera selection, so config.sh does not pick up old camera selection.
> "${ALLSKY_CONFIG}/autocam.sh"

# COMPATIBILITY CHECKS
# config.sh moved to a new location in version 0.8.1.  Check for it.
# Check for a new variable in config.sh that wasn't in prior versions.
# If not found, force the user to upgrade config.sh
if [ -f "${ALLSKY_CONFIG}/config.sh" ]; then
	source "${ALLSKY_CONFIG}/config.sh"
	if [ -z "${CAPTURE_SAVE_DIR}" ]; then
		echo "${RED}*** ERROR: old version of config.sh detected.${NC}"
		echo "See https://github.com/thomasjacquin/allsky/wiki/Upgrade-from-0.8.2-or-prior-versions"

		"${ALLSKY_SCRIPTS}/copy_notification_image.sh" "Error" 2>&1
		sudo systemctl stop allsky
		exit 1
	fi
else
	echo "${RED}*** ERROR: config.sh not in ${ALLSKY_CONFIG}.${NC}"
	echo "Please make a backup of your config.sh, ftp-settings.sh, and settings_*.json files,"
	echo "then do a full re-install of AllSky."
	echo "After the re-install, copy your settings from the backup files to the new files."
	echo "Do NOT simply copy the old files over the new ones since several variables have been added or changed names."
	
	"${ALLSKY_SCRIPTS}/copy_notification_image.sh" "Error" 2>&1
	sudo systemctl stop allsky
	exit 1
fi

# Make sure allsky.sh is not already running.
ps -ef | grep allsky.sh | grep -v $$ | xargs "sudo kill -9" 2>/dev/null

# old/regular manual camera selection mode => exit if no requested camera was found
# Buster and Bullseye have different output so only check the part they have in common.
# TODO: this check only needs to be done if CAMERA = RPiHQ
# Bullseye has problems detecting RPiHQ cameras - workaround
which libcamera-still > /dev/null
if [ $? -eq 0 ]; then
	LIBCAMERA_LOG_LEVELS="ERROR,FATAL" libcamera-still -t 1 --nopreview
	RET=$?
else
	vcgencmd get_camera | grep --silent "supported=1" 
	RET=$?
fi
if [ $RET -eq 0 ]; then
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
			reset_usb
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

if [ -d "${ALLSKY_TMP}" ]; then
	# remove any lingering old image files.
	rm -f "${ALLSKY_TMP}/${FILENAME}"-202*.${EXTENSION}	# "202" for 2021 and later
else
	# Re-create in case it's on a memory filesystem that gets wiped out at reboot
	mkdir -p "${ALLSKY_TMP}"
fi

# Optionally display a notification image. This must come after the creation of "autocam.sh" above.
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

# "capture" expects 0 or 1; newer versions of config.sh use "true" and "false".
# DAYTIME is the old name for DAYTIME_CAPTURE.
# TODO: These checks will go away in the future.
if [ "${DAYTIME_CAPTURE}" = "true" -o "${DAYTIME}" = "1" ] ; then
	DAYTIME_CAPTURE=1
elif [ "${DAYTIME_CAPTURE}" = "false" -o "${DAYTIME}" = "0" ] ; then
	DAYTIME_CAPTURE=0
fi
ARGUMENTS+=(-daytime $DAYTIME_CAPTURE)

[ "$CAPTURE_EXTRA_PARAMETERS" != "" ] && ARGUMENTS+=(${CAPTURE_EXTRA_PARAMETERS})	# Any additional parameters

echo "${ARGUMENTS[@]}" > ${ALLSKY_TMP}/capture_args.txt

if [[ $CAMERA == "ZWO" ]]; then
	CAPTURE="capture"
elif [[ $CAMERA == "RPiHQ" ]]; then
	CAPTURE="capture_RPiHQ"
fi
"${ALLSKY_HOME}/${CAPTURE}" "${ARGUMENTS[@]}"
RETCODE=$?
[ $RETCODE -ne 0 ] && echo "'${CAPTURE}' exited with RETCODE=${RETCODE}"

if [ "${USE_NOTIFICATION_IMAGES}" = "1" -a "${RETCODE}" -ne 0 ] ; then

	# 99 is a special return code which means to reset usb bus if possible.
	if [ "${RETCODE}" -eq 99 -a "$UHUBCTL_PATH" != "" ] ; then
		reset_usb
	fi

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
