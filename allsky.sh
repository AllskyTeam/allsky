#!/bin/bash

# This EXIT code is also defined in variables.sh, but in case we can't open that file, we need it here.
EXIT_ERROR_STOP=100		# unrecoverable error - need user action so stop service

# Make it easy to find the beginning of this run in the log file.
echo "     ***** Starting AllSky *****"

[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )" )"
ME="$( basename "${BASH_ARGV0}" )"

cd "${ALLSKY_HOME}" || exit 1

NOT_STARTED_MSG="Unable to start Allsky!"
STOPPED_MSG="Allsky Stopped!"
ERROR_MSG_PREFIX="*** ERROR ***\n${STOPPED_MSG}\n"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit "${EXIT_ERROR_STOP}"
if [[ -z ${ALLSKY_CONFIG} ]]; then
	MSG="FATAL ERROR: 'source variables.sh' did not work properly."
	echo -e "${RED}*** ${MSG}${NC}"
	doExit "${EXIT_ERROR_STOP}" "Error" \
		"${ERROR_MSG_PREFIX}\n$( basename "${ALLSKY_HOME}" )/variables.sh\nis corrupted." \
		"${NOT_STARTED_MSG}<br>${MSG}"
fi

#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck disable=SC1091		# file doesn't exist in GitHub
source "${ALLSKY_CONFIG}/config.sh"						|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/installUpgradeFunctions.sh"	|| exit "${EXIT_ERROR_STOP}"

# Make sure they rebooted if they were supposed to.
NEEDS_REBOOT="false"
reboot_needed && NEEDS_REBOOT="true"

# Make sure the settings have been configured after an installation or upgrade.
LAST_CHANGED="$( settings ".lastchanged" )"
if [[ ${LAST_CHANGED} == "" ]]; then
	echo "*** ===== Allsky needs to be configured before it can be used.  See the WebUI."
	if [[ ${NEEDS_REBOOT} == "true" ]]; then
		echo "*** ===== The Pi also needs to be rebooted."
		doExit "${EXIT_ERROR_STOP}" "Error" \
			"Allsky needs\nconfiguration\nand the Pi needs\na reboot" \
			"Allsky needs to be configured then the Pi rebooted."
	else
		"${ALLSKY_SCRIPTS}/addMessage.sh" "Error" "Allsky needs to be configured."
		doExit "${EXIT_ERROR_STOP}" "ConfigurationNeeded" "" ""
	fi
elif [[ ${NEEDS_REBOOT} == "true" ]]; then
	"${ALLSKY_SCRIPTS}/addMessage.sh" "Error" "The Pi needs to be rebooted."
	doExit "${EXIT_ERROR_STOP}" "RebootNeeded" "" ""
fi

SEE_LOG_MSG="See ${ALLSKY_LOG}"
ARGS_FILE="${ALLSKY_TMP}/capture_args.txt"

# If a prior copy of Allsky exists, remind the user.
if [[ -d ${PRIOR_ALLSKY_DIR} ]]; then
	DO_MSG="true"
	if [[ -f ${OLD_ALLSKY_REMINDER} ]]; then
		CHECK_DATE="$( date -d '1 week ago' +'%Y%m%d%H%M.%S' )"
		CHECK_FILE="${ALLSKY_TMP}/check_date"
		touch -t "${CHECK_DATE}" "${CHECK_FILE}"
		[[ ${OLD_ALLSKY_REMINDER} -nt "${CHECK_FILE}" ]] && DO_MSG="false"
		rm -f "${CHECK_FILE}"
	fi
	if [[ ${DO_MSG} == "true" ]]; then
		MSG="Reminder: your prior Allsky is still in '${PRIOR_ALLSKY_DIR}'."
		MSG="${MSG}\nIf you are no longer using it, it can be removed to save disk space:"
		MSG="${MSG}\n&nbsp; &nbsp;<code>rm -fr '${PRIOR_ALLSKY_DIR}'</code>\n"
		"${ALLSKY_SCRIPTS}/addMessage.sh" "info" "${MSG}"
		touch "${OLD_ALLSKY_REMINDER}"		# last time we displayed the message
	fi
fi

# This file contains information the user needs to act upon after an installation.
if [[ -f ${POST_INSTALLATION_ACTIONS} ]]; then
	# If there's an initial message display an image and stop.
	F="${POST_INSTALLATION_ACTIONS}_initial_message"
	if [[ -f ${F} ]]; then
		# There is already a message so don't add another,
		# and there's already an image, so don't overwrite it.
		# shellcheck disable=SC2154
		rm "${F}"		# so next time we'll remind them.
		doExit "${EXIT_ERROR_STOP}" "no-image" "" ""
	else
		MSG="Reminder to perform the action(s) in '${POST_INSTALLATION_ACTIONS}'."
		MSG="${MSG}\nIf you already have, remove the file so you will no longer see this message:"
		MSG="${MSG}\n &nbsp; &nbsp;<code>rm -f '${POST_INSTALLATION_ACTIONS}'</code>"
		"${ALLSKY_SCRIPTS}/addMessage.sh" "info" "${MSG}"
	fi
fi

USE_NOTIFICATION_IMAGES="$( settings ".notificationimages" )"		|| exit "${EXIT_ERROR_STOP}"
LOCALE="$( settings ".locale" )"									|| exit "${EXIT_ERROR_STOP}"

if [[ -z ${CAMERA_TYPE} ]]; then
	MSG="FATAL ERROR: 'Camera Type' not set in WebUI."
	echo -e "${RED}*** ${MSG}${NC}"
	doExit "${EXIT_NO_CAMERA}" "Error" \
		"${ERROR_MSG_PREFIX}\nCamera Type\nnot specified\nin the WebUI." \
		"${NOT_STARTED_MSG}<br>${MSG}"
fi

# Make sure we are not already running.
pgrep "${ME}" | grep -v $$ | xargs "sudo kill -9" 2>/dev/null

if [[ ${CAMERA_TYPE} == "RPi" ]]; then
	# "true" means use doExit() on error
	RPi_COMMAND_TO_USE="$( determineCommandToUse "true" "${ERROR_MSG_PREFIX}" )"

elif [[ ${CAMERA_TYPE} == "ZWO" ]]; then
	RPi_COMMAND_TO_USE=""
	RESETTING_USB_LOG="${ALLSKY_TMP}/resetting_USB.txt"
	reset_usb()		# resets the USB bus
	{
		REASON="${1}"		# why are we resetting the bus?
		# Only reset a couple times, then exit with fatal error.
		if [[ -f ${RESETTING_USB_LOG} ]]; then
			NUM_USB_RESETS=$( < "${RESETTING_USB_LOG}" )
			if [[ ${NUM_USB_RESETS} -eq 2 ]]; then
				MSG="FATAL ERROR: Too many consecutive USB bus resets done (${NUM_USB_RESETS})."
				echo -e "${RED}*** ${MSG} Stopping." >&2
				rm -f "${RESETTING_USB_LOG}"
				doExit "${EXIT_ERROR_STOP}" "Error" \
					"${ERROR_MSG_PREFIX}\nToo many consecutive\nUSB bus resets done!\n${SEE_LOG_MSG}" \
					"${NOT_STARTED_MSG}<br>${MSG}"
			fi
		else
			NUM_USB_RESETS=0
		fi

		MSG="${YELLOW}WARNING: Resetting USB ports ${REASON/\\n/ }"
		if [[ ${ON_TTY} == "true" ]]; then
			echo "${MSG}; restart ${ME} when done.${NC}" >&2
		else
			echo "${MSG}, then restarting.${NC}" >&2
			# The service will automatically restart this script.
		fi

		((NUM_USB_RESETS++))
		echo "${NUM_USB_RESETS}" > "${RESETTING_USB_LOG}"

		# Display a warning message
		"${ALLSKY_SCRIPTS}/generate_notification_images.sh" --directory "${ALLSKY_TMP}" "${FILENAME}" \
			"yellow" "" "85" "" "" \
			"" "5" "yellow" "${EXTENSION}" "" "WARNING:\n\nResetting USB bus\n${REASON}.\nAttempt ${NUM_USB_RESETS}."
		sudo "${UHUBCTL_PATH}" -a cycle -l "${UHUBCTL_PORT}"
		sleep 3		# give it a few seconds, plus, allow the notification images to be seen
	}

	# "03c3" is the USB ID for ZWO devices.
	ZWOdev=$( lsusb -d '03c3:' | awk '{ bus=$2; dev=$4; gsub(/[^0-9]/,"",dev); print "/dev/bus/usb/"bus"/"dev;}' )
	# We have to run "lsusb -D" once for each device returned by "lsusb -d", and can't
	# use "echo x | while read" because variables set inside the "while" loop don't get exposed
	# to the calling code, so use a temp file.

	TEMP="${ALLSKY_TMP}/${CAMERA_TYPE}_cameras.txt"
	echo "${ZWOdev}" > "${TEMP}"
	NUM=0
	while read -r DEV
	do
		lsusb -D "${DEV}" 2>/dev/null | grep --silent 'iProduct .*ASI[0-9]' && ((NUM++))
	done < "${TEMP}"

	if [[ ${NUM} -eq 0 ]]; then
		if [[ -n ${UHUBCTL_PATH} ]] ; then
			reset_usb "looking for a\nZWO camera"		# reset_usb exits if too many tries
			exit 0	# exit with 0 so the service is restarted
		else
			MSG="FATAL ERROR: ZWO Camera not found"
			echo -en "${RED}*** ${MSG}" >&2
			if [[ ${ZWOdev} == "" ]]; then
				echo " and no USB entry either.${NC}" >&2
				USB_MSG=""
			else
				echo " but ${ZWOdev} found.${NC}" >&2
				USB_MSG="\n${SEE_LOG_MSG}"
			fi

			echo "  If you have the 'uhubctl' command installed, add it to config.sh." >&2
			echo "  In the meantime, try running it to reset the USB bus." >&2
			doExit "${EXIT_NO_CAMERA}" "Error" \
				"${ERROR_MSG_PREFIX}\nNo ZWO camera\nfound!${USB_MSG}" \
				"${NOT_STARTED_MSG}<br>${MSG}<br>${SEE_LOG_MSG}."
		fi
	fi

	rm -f "${RESETTING_USB_LOG}"	# We found the camera so don't need to reset.

else
	MSG="FATAL ERROR: Unknown Camera Type: ${CAMERA_TYPE}."
	echo -e "${RED}${MSG}  Stopping.${NC}" >&2
	doExit "${EXIT_NO_CAMERA}" "Error" \
		"${ERROR_MSG_PREFIX}\nUnknown Camera\nType: ${CAMERA_TYPE}" \
		"${NOT_STARTED_MSG}<br>${MSG}"
fi

# Make sure the settings file is linked to the camera-specific file.
if ! MSG="$( check_settings_link "${SETTINGS_FILE}" )" ; then
	"${ALLSKY_SCRIPTS}/addMessage.sh" "error" "${MSG}"
	echo "ERROR: ${MSG}" >&2
fi

# Make directories that need to exist.
if [[ -d ${ALLSKY_TMP} ]]; then
	# remove any lingering old image files.
	rm -f "${ALLSKY_TMP}/${FILENAME}"-20*."${EXTENSION}"	# "20" for 2000 and later
else
	# We should never get here since ${ALLSKY_TMP} is created during installation,
	# but "just in case"...
	mkdir -p "${ALLSKY_TMP}"
	chmod 775 "${ALLSKY_TMP}"
	sudo chgrp "${WEBSERVER_GROUP}" "${ALLSKY_TMP}"
	MSG="Had to create '${ALLSKY_TMP}'."
	MSG="${MSG}\nIf this happens again, contact the Allsky developers."
	"${ALLSKY_SCRIPTS}/addMessage.sh" warning "${ME}: ${MSG}"
fi

rm -f "${ALLSKY_BAD_IMAGE_COUNT}"	# Start with no bad images

# Clear out these files and allow the web server to write to it.
rm -fr "${ALLSKY_ABORTS_DIR}"
mkdir "${ALLSKY_ABORTS_DIR}"
sudo chgrp "${WEBSERVER_GROUP}" "${ALLSKY_ABORTS_DIR}"
sudo chmod 775 "${ALLSKY_ABORTS_DIR}"

rm -f "${ALLSKY_NOTIFICATION_LOG}"	# clear out any notificatons from prior runs.

# Optionally display a notification image.
if [[ ${USE_NOTIFICATION_IMAGES} == "true" ]]; then
	# Can do this in the background to speed up startup.
	"${ALLSKY_SCRIPTS}/copy_notification_image.sh" "StartingUp" 2>&1 &
fi

: > "${ARGS_FILE}"

# If the locale isn't in the settings file, try to determine it.
if [[ -z ${LOCALE} ]]; then
	if [[ -n ${LC_ALL} ]]; then
		echo "-locale=${LC_ALL}"
	elif [[ -n ${LANG} ]]; then
		echo "-locale=${LANG}"
	elif [[ -n ${LANGUAGE} ]]; then
		echo "-locale=${LANGUAGE}"
	fi >> "${ARGS_FILE}"
fi

# We must pass "-config ${ARGS_FILE}" on the command line,
# and debuglevel we did above, so don't do them again.
# Only pass settings that are used by the capture program.
"${ALLSKY_WEBUI}/includes/outputJSONwithEqual.php" --capture-only "${OPTIONS_FILE}" |
	grep -E -i -v "^config=|^debuglevel=" >> "${ARGS_FILE}"

# When using a desktop environment a preview of the capture can be displayed in a separate window.
# The preview mode does not work if we are started as a service or if the debian distribution has no desktop environment.
[[ $1 == "preview" ]] && echo "preview=true"

echo "version=${ALLSKY_VERSION}" >> "${ARGS_FILE}"
echo "save_dir=${CAPTURE_SAVE_DIR}" >> "${ARGS_FILE}"

FREQUENCY_FILE="${ALLSKY_TMP}/IMG_UPLOAD_FREQUENCY.txt"
# If the user wants images uploaded only every n times, save that number to a file.
if [[ ${IMG_UPLOAD_FREQUENCY} -ne 1 ]]; then
	# Save "1" so we upload the first image.
	# saveImage.sh will write ${IMG_UPLOAD_FREQUENCY} to the file as needed.
	echo "1" > "${FREQUENCY_FILE}"
else
	rm -f "${FREQUENCY_FILE}"
fi

CAPTURE="capture_${CAMERA_TYPE}"

# Clear up any flow timings
activate_python_venv
python3 "${ALLSKY_SCRIPTS}/flow-runner.py" --cleartimings
deactivate_python_venv

# Run the main program - this is the main attraction...
# -cmd needs to come first since the capture_RPi code checks for it first.  It's ignored
# in capture_ZWO.
# Pass debuglevel on command line so the capture program knows if it should display debug output.
"${ALLSKY_BIN}/${CAPTURE}" -cmd "${RPi_COMMAND_TO_USE}" -debuglevel "${ALLSKY_DEBUG_LEVEL}" -config "${ARGS_FILE}"
RETCODE=$?

[[ ${RETCODE} -eq ${EXIT_OK} ]] && doExit "${EXIT_OK}" ""

if [[ ${RETCODE} -eq ${EXIT_RESTARTING} ]]; then
	if [[ ${ON_TTY} == "true" ]]; then
		echo "*** Can restart allsky now. ***"
		NOTIFICATION_TYPE="NotRunning"
	else
		NOTIFICATION_TYPE="Restarting"
	fi
	doExit 0 "${NOTIFICATION_TYPE}"		# use 0 so the service is restarted
fi

if [[ ${RETCODE} -eq ${EXIT_RESET_USB} ]]; then
	# Reset the USB bus if possible
	if [[ ${UHUBCTL_PATH} != "" ]]; then
		reset_usb " (ASI_ERROR_TIMEOUTs)"
		if [[ ${ON_TTY} == "true" ]]; then
			echo "*** USB bus was reset; You can restart allsky now. ***"
			NOTIFICATION_TYPE="NotRunning"
		else
			NOTIFICATION_TYPE="Restarting"
		fi
		if [[ ${USE_NOTIFICATION_IMAGES} == "true" ]]; then
			"${ALLSKY_SCRIPTS}/copy_notification_image.sh" "${NOTIFICATION_TYPE}"
		fi
		doExit 0 ""		# use 0 so the service is restarted
	else
		# TODO: use ASI_ERROR_TIMEOUT message
		MSG="Non-recoverable ERROR found"
		[[ ${ON_TTY} == "true" ]] && echo "*** ${MSG} - ${SEE_LOG_MSG}. ***"
		doExit "${EXIT_ERROR_STOP}" "Error" \
			"${ERROR_MSG_PREFIX}Too many\nASI_ERROR_TIMEOUT\nerrors received!\n${SEE_LOG_MSG}" \
			"${STOPPED_MSG}<br>${MSG}<br>${SEE_LOG_MSG}."
	fi
fi

# RETCODE -ge ${EXIT_ERROR_STOP} means we should not restart until the user fixes the error.
if [[ ${RETCODE} -ge ${EXIT_ERROR_STOP} ]]; then
	echo "***"
	if [[ ${ON_TTY} == "true" ]]; then
		echo "*** After fixing, restart ${ME}.sh. ***"
	else
		echo "*** After fixing, restart the allsky service. ***"
	fi
	echo "***"
	doExit "${EXIT_ERROR_STOP}" "Error"	# Can't do a custom message since we don't know the problem
fi

# Some other error
if [[ ${USE_NOTIFICATION_IMAGES} == "true" ]]; then
	# If started by the service, it will restart us once we exit.
	doExit "${RETCODE}" "NotRunning"
else
	doExit "${RETCODE}" ""
fi
