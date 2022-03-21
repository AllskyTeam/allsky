#!/bin/bash

# These EXIT codes from the capture programs must match what's in src/include/allsky_common.h
EXIT_OK=0
EXIT_RESTARTING=98		# process is restarting, i.e., stop, then start
EXIT_RESET_USB=99		# need to reset USB bus; cannot continue
EXIT_ERROR_STOP=100		# unrecoverable error - need user action so stop service

# Make it easy to find the beginning of this run in the log file.
echo "     ***** Starting AllSky *****"

if [ -z "${ALLSKY_HOME}" ]; then
	export ALLSKY_HOME="$(realpath $(dirname "${BASH_ARGV0}"))"
fi
cd "${ALLSKY_HOME}"

ERROR_MSG_PREFIX="*** ERROR ***\nAllsky Stopped!\n"
SEE_LOG_MSG="See /var/log/allsky.log"
function doExit()
{
	EXITCODE=$1
	TYPE=${2:-Error}
	CUSTOM_MESSAGE="${3}"

	if [ ${EXITCODE} -eq ${EXIT_ERROR_STOP} ]; then
		# With fatal EXIT_ERROR_STOP errors, we can't continue so display a notification image
		# even if the user has them turned off.
		if [ -n "${CUSTOM_MESSAGE}" ]; then
			# Create a custom error message.
			# If we error out before config.sh is sourced in, $FILENAME and $EXTENSION won't be
			# set so guess at what they are.
			"${ALLSKY_SCRIPTS}/generate_notification_images.sh" --directory "${ALLSKY_TMP}" "${FILENAME:-image}" \
				"red" "" "85" "" "" \
				"" "10" "red" "${EXTENSION:-jpg}" "" "${CUSTOM_MESSAGE}"
		else
			"${ALLSKY_SCRIPTS}/copy_notification_image.sh" --expires 0 "${TYPE}" 2>&1
		fi
		# Don't let the service restart us because we'll likely get the same error again.
		echo "     ***** AllSky Stopped *****"
		sudo systemctl stop allsky
	fi
	exit ${EXITCODE}
}

source "${ALLSKY_HOME}/variables.sh"
if [ -z "${ALLSKY_CONFIG}" ]; then
	echo -e "${RED}*** FATAL ERROR: variables not set, can't continue!${NC}"
	doExit ${EXIT_ERROR_STOP} "Error" "${ERROR_MSG_PREFIX}\n$(basename ${ALLSKY_HOME})/variables.sh\nis corrupted!"
fi

# COMPATIBILITY CHECKS
# Check for a new variable in config.sh that wasn't in prior versions.
# If not set to something (even "") then it wasn't found and force the user to upgrade config.sh
source "${ALLSKY_CONFIG}/config.sh"
if [ ! -v WEBUI_DATA_FILES ]; then	# WEBUI_DATA_FILES added after version 0.8.3.
	echo -e "${RED}*** FATAL ERROR: old version of ${ALLSKY_CONFIG}/config.sh detected.${NC}"
	echo "Please move your current config.sh file to config.sh-OLD, then place the newest one"
	echo "from https://github.com/thomasjacquin/allsky in ${ALLSKY_CONFIG} and"
	echo "manually copy your data from the old file to the new one."
	doExit ${EXIT_ERROR_STOP} "Error" "${ERROR_MSG_PREFIX}\n$(basename ${ALLSKY_CONFIG})/config.sh\nis an old version.  See\n/var/log/allsky.log"

fi
USE_NOTIFICATION_IMAGES=$(jq -r '.notificationimages' "$CAMERA_SETTINGS")

if [ -z "${CAMERA}" ]; then
	echo -e "${RED}*** FATAL ERROR: CAMERA not set, can't continue!${NC}"
	doExit ${EXIT_ERROR_STOP} "Error" "${ERROR_MSG_PREFIX}\nCAMERA type\nnot specified in\n$(basename ${ALLSKY_CONFIG})/config.sh."
fi

# Make sure allsky.sh is not already running.
pgrep allsky.sh | grep -v $$ | xargs "sudo kill -9" 2>/dev/null

if [ "${CAMERA}" = "RPiHQ" ]; then
	# See if we should use libcamera-still or raspistill.
	# If libcamera is installed and works, we'll use it.
	# If it's not installed, or IS installed but doesn't work (the user may not have it configured),
	# we'll use raspistill.
	which libcamera-still > /dev/null
	RET=$?
	if [ ${RET} -eq 0 ]; then
		LIBCAMERA_LOG_LEVELS="ERROR,FATAL" libcamera-still --timeout 1 --nopreview > /dev/null 2>&1
		RET=$?
	fi
	if [ ${RET} -eq 0 ]; then
		RPiHQ_SOFTWARE_TO_USE="libcamera"
	else
		RPiHQ_SOFTWARE_TO_USE="raspistill"
		# Either libcamera isn't installed or it doesn't work, so try raspistill instead.

		# TODO: Should try and run raspistill command - doing that is more reliable since
		# the output of vcgencmd changes depending on the OS and how the Pi is configured.
		# Newer kernels/libcamera give:   supported=1 detected=0, libcamera interfaces=1
		# but only if    start_x=1    is in /boot/config.txt
		vcgencmd get_camera | grep --silent "supported=1" ######### detected=1"
		RET=$?
	fi
	if [ ${RET} -ne 0 ]; then
		echo -e "${RED}*** FATAL ERROR: RPiHQ Camera not found.  Make sure it's enabled. Stopping.${NC}" >&2
		doExit ${EXIT_ERROR_STOP} "Error" "${ERROR_MSG_PREFIX}\nRPiHQ Camera\nnot found!\nMake sure it's enabled."
	fi

elif [ "${CAMERA}" = "ZWO" ]; then
	RESETTING_USB_LOG="${ALLSKY_TMP}/resetting_USB.txt"
	reset_usb()		# resets the USB bus
	{
		REASON="${1}"		# why are we resetting the bus?
		# Only reset a couple times, then exit with fatal error.
		typeset -i COUNT
		if [ -f "${RESETTING_USB_LOG}" ]; then
			COUNT=$(< "${RESETTING_USB_LOG}")
		fi
		COUNT=${COUNT:-0}
		if [ ${COUNT} -eq 2 ]; then
			echo -e "${RED}*** FATAL ERROR: Too many consecutive USB bus resets done (${COUNT})! Stopping." >&2
			rm -f "${RESETTING_USB_LOG}"
			doExit ${EXIT_ERROR_STOP} "Error" "${ERROR_MSG_PREFIX}\nToo many consecutive\nUSB bus resets done!\n${SEE_LOG_MSG}"
		fi

		if [ "${ON_TTY}" = "1" ]; then
			echo "${YELLOW}WARNING: Resetting USB ports ${REASON/\\n/ }; restart allsky.sh when done.${NC}" >&2
		else
			echo "${YELLOW}WARNING: Resetting USB ports ${REASON/\\n/ }, then restarting.${NC}" >&2
			# The service will automatically restart this script.
		fi

		((COUNT=COUNT+1))
		echo "${COUNT}" > "${RESETTING_USB_LOG}"

		# Display a warning message
		"${ALLSKY_SCRIPTS}/generate_notification_images.sh" --directory "${ALLSKY_TMP}" "${FILENAME}" \
			"yellow" "" "85" "" "" \
			"" "5" "yellow" "${EXTENSION}" "" "WARNING:\n\nResetting USB bus\n${REASON}.\nAttempt ${COUNT}."
		sudo "$UHUBCTL_PATH" -a cycle -l "$UHUBCTL_PORT"
		sleep 3		# give it a few seconds, plus, allow the notification images to be seen
	}

	# Use two commands to better aid debugging when camera isn't found.
	ZWOdev=$(lsusb | awk '/ 03c3:/ { bus=$2; dev=$4; gsub(/[^0-9]/,"",dev); print "/dev/bus/usb/"bus"/"dev;}')
	ZWOIsPresent=$(lsusb -D ${ZWOdev} 2>/dev/null | grep -c 'iProduct .*ASI[0-9]')
	if [ $ZWOIsPresent -eq 0 ]; then
		if [ -n "${UHUBCTL_PATH}" ] ; then
			reset_usb "looking for a\nZWO camera"		# reset_usb exits if too many tries
			exit 0	# exit with 0 so the service is restarted
		else
			echo -en "${RED}*** FATAL ERROR: ZWO Camera not found" >&2
			if [[ $ZWOdev == "" ]]; then
				echo " and no USB entry either.${NC}" >&2
				USB_MSG=""
			else
				echo " but $ZWOdev found.${NC}" >&2
				USB_MSG="\n${SEE_LOG_MSG}"
			fi

			echo "  If you have the 'uhubctl' command installed, add it to config.sh." >&2
			echo "  In the meantime, try running it to reset the USB bus." >&2
			doExit ${EXIT_ERROR_STOP} "Error" "${ERROR_MSG_PREFIX}\nNo ZWO camera\nfound!${USB_MSG}"
		fi
	fi

	rm -f "${RESETTING_USB_LOG}"	# We found the camera so don't need to reset.

else
	echo -e "${RED}FATAL ERROR: Unknown CAMERA type: ${CAMERA}!  Stopping.${NC}" >&2
	doExit ${EXIT_ERROR_STOP} "Error" "${ERROR_MSG_PREFIX}\nUnknown CAMERA\ntype: ${CAMERA}"
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
if [ "$USE_NOTIFICATION_IMAGES" = "1" ] ; then
	# Can do this in the background to speed up startup
	"${ALLSKY_SCRIPTS}/copy_notification_image.sh" "StartingUp" 2>&1 &
fi

# Building the arguments to pass to the capture binary.
# Want to allow spaces in arguments so need to put quotes around them,
# but in order for it to work need to make ARGUMENTS an array.
ARGUMENTS=()

if [[ ${CAMERA} == "RPiHQ" ]]; then
	# This argument needs to come first since the capture code checks for it first.
	ARGUMENTS+=(-cmd ${RPiHQ_SOFTWARE_TO_USE})
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

if [ "$CAPTURE_EXTRA_PARAMETERS" != "" ]; then
	ARGUMENTS+=(${CAPTURE_EXTRA_PARAMETERS})	# Any additional parameters
fi

echo "${ARGUMENTS[@]}" > ${ALLSKY_TMP}/capture_args.txt		# for debugging

GOT_SIGTERM="false"	&& trap "GOT_SIGTERM=true" SIGTERM
GOT_SIGINT="false"  && trap "GOT_SIGINT=true" SIGINT
GOT_SIGUSR1="false" && trap "GOT_SIGUSR1=true" SIGUSR1

if [[ $CAMERA == "ZWO" ]]; then
	CAPTURE="capture"
elif [[ $CAMERA == "RPiHQ" ]]; then
	CAPTURE="capture_RPiHQ"
fi
rm -f "${ALLSKY_NOTIFICATION_LOG}"	# clear out any notificatons from prior runs.
"${ALLSKY_HOME}/${CAPTURE}" "${ARGUMENTS[@]}"		# run the main program
RETCODE=$?

if [ ${RETCODE} -ne ${EXIT_OK} ]; then
	# for testing
	echo -e "${RED}'${CAPTURE}' exited with RETCODE=${RETCODE}${NC}"
fi
if [ "${GOT_SIGTERM}" = "true" ] || [ "${GOT_SIGUSR1}" = "true" ] || [ "${GOT_SIGINT}" = "true" ]; then
	# for testing
	echo "allsky.sh: GOT_SIGTERM=$GOT_SIGTERM, GOT_SIGUSR1=$GOT_SIGUSR1, GOT_SIGINT=$GOT_SIGINT"
fi

if [ "${RETCODE}" -eq ${EXIT_OK} ] ; then
	doExit ${EXIT_OK} ""
fi

if [ "${RETCODE}" -eq ${EXIT_RESTARTING} ] ; then
	NOTIFICATION_TYPE="Restarting"
	if [ ${ON_TTY} = "1" ]; then
		echo "*** Can restart allsky now. ***"
		NOTIFICATION_TYPE="NotRunning"
	fi
	doExit 0 "${NOTIFICATION_TYPE}"		# use 0 so the service is restarted
fi

if [ "${RETCODE}" -eq ${EXIT_RESET_USB} ]; then
	# Reset the USB bus if possible
	if [ "${UHUBCTL_PATH}" != "" ] ; then
		reset_usb " (ASI_ERROR_TIMEOUTs)"
		NOTIFICATION_TYPE="Restarting"
		if [ ${ON_TTY} = "1" ]; then
			echo "*** USB bus was reset; You can restart allsky now. ***"
			NOTIFICATION_TYPE="NotRunning"
		fi
		if [ "${USE_NOTIFICATION_IMAGES}" = "1" ]; then
			"${ALLSKY_SCRIPTS}/copy_notification_image.sh" "${NOTIFICATION_TYPE}" 2>&1
		fi
		doExit 0 ""		# use 0 so the service is restarted
	else
		# TODO: use ASI_ERROR_TIMEOUT message
		if [ ${ON_TTY} = "1" ]; then
			echo "*** Non-recoverable ERROR found - see /var/log/allsky.log for details. ***"
		fi
		doExit ${EXIT_ERROR_STOP} "Error" "${ERROR_MSG_PREFIX}Too many\nASI_ERROR_TIMEOUT\nerrors received!\n${SEE_LOG_MSG}"
	fi
fi

# RETCODE -ge ${EXIT_ERROR_STOP} means we should not restart until the user fixes the error.
if [ "${RETCODE}" -ge ${EXIT_ERROR_STOP} ]; then
	echo "***"
	if [ ${ON_TTY} = "1" ]; then
		echo "*** After fixing, restart allsky.sh. ***"
	else
		echo "*** After fixing, restart the allsky service. ***"
	fi
	echo "***"
	doExit ${EXIT_ERROR_STOP} "Error"	# Can't do a custom message since we don't know the problem
fi

# Some other error
if [ "${USE_NOTIFICATION_IMAGES}" = "1" ]; then
	# If started by the service, it will restart us once we exit.
	doExit ${RETCODE} "NotRunning"
else
	doExit ${RETCODE} ""
fi
