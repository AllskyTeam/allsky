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
	RET=$?
	if [ -z "${ALLSKY_DEBUG_LEVEL}" ]; then
		echo "${RED}*** ERROR: old version of config.sh detected.${NC}"
		RET=1
	fi
else
	echo "${RED}*** ERROR: cannot find config.sh.${NC}"
	RET=1
fi
if [ ${RET} -ne 0 ]; then
	echo "Please make a backup of your config.sh, ftp-settings.sh, and settings_*.json files,"
	echo "then do a full re-install of AllSky."
	echo "After the re-install, copy your settings from the backup files to the new files."
	echo "Do NOT simply copy the old files over the new ones since several variables have been added or changed names."
	
	"${ALLSKY_SCRIPTS}/copy_notification_image.sh" "Error" 2>&1
	sudo systemctl stop allsky
	exit 1
fi

mkdir -p "${ALLSKY_TMP}"	# Re-create in case it's on a memory filesystem that gets wiped out at reboot

# Make sure allsky.sh is not already running.
ps -ef | grep allsky.sh | grep -v $$ | xargs "sudo kill -9" 2>/dev/null

# old/regular manual camera selection mode => exit if no requested camera was found
# Buster and Bullseye have different output so only check the part they have in common.
# TODO: this check only needs to be done if CAMERA = RPiHQ
vcgencmd get_camera | grep --silent "supported=1"
if [ $? -eq 0 ]; then
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
	# Can do this in the background to speed up startup
	"${ALLSKY_SCRIPTS}/copy_notification_image.sh" "StartingUp" 2>&1 &
fi

echo "Starting allsky camera..."

# Building the arguments to pass to the capture binary.
# Want to allow spaces in arguments so need to put quotes around them,
# but in order for it to work need to make ARGUMENTS an array.
ARGUMENTS=()

# This argument should come first so the capture program knows if it should use colors.
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
	grep --silent -i "VERSION_CODENAME=bullseye" /etc/os-release
	if [ $? -eq 0 ]; then
		echo "***"
		echo -e "${YELLOW}Sorry, AllSky with RPiHQ cameras on the Bullseye operating system does not yet work.${NC}"
		echo "See https://github.com/thomasjacquin/allsky/discussions/802 for more information."
		echo "***"
		"${ALLSKY_SCRIPTS}/copy_notification_image.sh" "Error" 2>&1

		# Don't let the service restart us 'cause we'll get the same error again
		sudo systemctl stop allsky
	fi
fi
"${ALLSKY_HOME}/${CAPTURE}" "${ARGUMENTS[@]}"
RETCODE=$?
[ $RETCODE -ne 0 ] && echo "'${CAPTURE}' exited with RETCODE=${RETCODE}"

if [ "${USE_NOTIFICATION_IMAGES}" = "1" -a "${RETCODE}" -ne 0 ] ; then
	# ${CAPTURE} will do this if it exited with 0.
	# RETCODE -ge 100 means the we should not restart until the user fixes the error.
	if [ "$RETCODE" -ge 100 ]; then
		echo "***"
		if ${ON_TTY} = "1" ; then
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
