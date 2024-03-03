#!/bin/bash

# Make it easy to find the beginning of this run in the log file.
echo "     ***** Starting AllSky *****"

[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )" )"
ME="$( basename "${BASH_ARGV0}" )"

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
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/installUpgradeFunctions.sh"	|| exit "${EXIT_ERROR_STOP}"

if [[ ! -d ${ALLSKY_CONFIG} ]]; then
	{
		echo "*** ====="
		echo "Allsky needs to be installed.  Run:  cd ~/allsky; ./install.sh"
		echo "*** ====="
	} >&2
	# Can't call addMessage.sh or copy_notification_image.sh or almost anything
	# since they use ${ALLSKY_CONIG} and/or ${ALLSKY_TMP} which don't exist yet.
	doExit "${EXIT_ERROR_STOP}" "no-image" "" ""
fi

cd "${ALLSKY_HOME}" || exit 1

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
		MSG="Reminder: Click here to see the action(s) that need to be performed."
		MSG="${MSG}\nOnce you perform the actions, run this to remove this message:"
		MSG="${MSG}\n &nbsp; &nbsp;<code>rm -f '${POST_INSTALLATION_ACTIONS}'</code>"
		PIA="${POST_INSTALLATION_ACTIONS/${ALLSKY_HOME}/}"
		"${ALLSKY_SCRIPTS}/addMessage.sh" "warning" "${MSG}" "${PIA/${ALLSKY_HOME}/}"
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
	RPi_COMMAND_TO_USE="-cmd $( determineCommandToUse "true" "${ERROR_MSG_PREFIX}" )"

elif [[ ${CAMERA_TYPE} == "ZWO" ]]; then
	RPi_COMMAND_TO_USE=""
	RESETTING_USB_LOG="${ALLSKY_TMP}/resetting_USB.txt"
	ZWO_VENDOR="03c3"
	TEMP="${ALLSKY_TMP}/${CAMERA_TYPE}_cameras.txt"
	# Output will be:   camera_model TAB ZWO_camera_ID      for each camera found.
	# The awk code assumes idProduct comes before iProduct.
	CAMERAS="$( lsusb -d "${ZWO_VENDOR}:" -v 2>/dev/null |
		awk '{
				if ($1 == "idProduct") {
					idProduct = substr($2, 3);
				} else if ($1 == "iProduct") {
					printf("%s\t%s\n", $3, idProduct);
					exit(0);
				}
			}'
	)"
	NUM_CAMERAS=$( echo "${CAMERAS}" | wc -l )

	reset_usb()		# resets the USB bus
	{
		REASON="${1}"		# why are we resetting the bus?
		# Only reset a couple times, then exit with fatal error.
		if [[ -f ${RESETTING_USB_LOG} ]]; then
			NUM_USB_RESETS=$( < "${RESETTING_USB_LOG}" )
			if [[ ${NUM_USB_RESETS} -ge 2 ]]; then
				MSG="Too many consecutive USB bus resets done (${NUM_USB_RESETS})."
				echo -e "${RED}*** FATAL ERROR: ${MSG} Stopping Allsky.${NC}" >&2
				rm -f "${RESETTING_USB_LOG}"
				doExit "${EXIT_ERROR_STOP}" \
					"Error" \
					"${ERROR_MSG_PREFIX}\nToo many consecutive\nUSB bus resets done!\n${SEE_LOG_MSG}" \
					"${NOT_STARTED_MSG}: ${MSG}"
			fi
		else
			NUM_USB_RESETS=0
		fi

		MSG="WARNING: Resetting USB ports ${REASON/\\n/ }"
		if [[ ${ON_TTY} == "true" ]]; then
			echo "${YELLOW}${MSG}; restart ${ME} when done.${NC}" >&2
		else
			echo "${MSG}, then restarting." >&2
			# The service will automatically restart this script.
		fi

		((NUM_USB_RESETS++))
		echo "${NUM_USB_RESETS}" > "${RESETTING_USB_LOG}"

		# Display a warning message
		"${ALLSKY_SCRIPTS}/generate_notification_images.sh" --directory "${ALLSKY_TMP}" "${FILENAME}" \
			"yellow" "" "85" "" "" \
			"" "5" "yellow" "${EXTENSION}" "" "WARNING:\n\nResetting USB bus\n${REASON}.\nAttempt ${NUM_USB_RESETS}."
		SEARCH="${ZWO_VENDOR}:${ZWO_CAMERA_ID}"
		sudo "${ALLSKY_BIN}/uhubctl" --action cycle --exact --search "${SEARCH}"
		sleep 3		# give it a few seconds, plus, allow the notification images to be seen
	}

	if [[ ${NUM_CAMERAS} -eq 0 ]]; then
		# reset_usb() exits if too many tries
		reset_usb "looking for a\nZWO camera"
		exit 0	# exit with 0 so the service is restarted
	fi

	echo "${CAMERAS}" > "${TEMP}"

	# See if the user changed camera models without telling Allsky.
	# Get the ZWO ID for the camera model in the settings file and
	# check if that camera is currently connected.
	ZWO_CAMERA_ID="$( echo "${CAMERAS}" |
		awk -v MODEL="${CAMERA_MODEL}" '
			{
				if ($1 == MODEL) {
					print $2;
					exit(0);
				}
			}'
	)"
	if [[ -z ${ZWO_CAMERA_ID} ]]; then
		MSG="ZWO camera model '${CAMERA_MODEL}' not found."
		MSG="${MSG}\nConnected cameras are:"
		MSG="${MSG}\n$( echo "${CAMERAS}" | awk '{ printf(" * %s\n", $1); }' )"
		MSG="${MSG}\nIf you changed cameras, select 'Refresh' for the"
		MSG="${MSG} Camera Type on the Allsky Settings page."
		doExit "${EXIT_ERROR_STOP}" \
			"Error" \
			"${NOT_STARTED_MSG}\nZWO camera\n${CAMERA_MODEL}\nnot found!" \
			"${NOT_STARTED_MSG} ${MSG}"
	fi

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
	"${ALLSKY_SCRIPTS}/copy_notification_image.sh" --expires 0 "StartingUp" 2>&1 &
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
ARGS="$( "${ALLSKY_WEBUI}/includes/convertJSON.php" --capture-only )"
if [[ $? -ne 0 ]]; then
	echo "${ME}: ERROR: convertJSON.php returned: ${ARGS}"
	exit "${EXIT_ERROR_STOP}"
fi
echo "${ARGS}" | grep -E -i -v "^config=|^debuglevel=" >> "${ARGS_FILE}"

# When using a desktop environment a preview of the capture can be displayed.
# The preview mode does not work if we are started as a service or
# if the debian distribution has no desktop environment.
{
	[[ $1 == "preview" ]] && echo "preview=true"

	echo "version=${ALLSKY_VERSION}"
	echo "save_dir=${CAPTURE_SAVE_DIR}"
} >> "${ARGS_FILE}"

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
# ${RPi_COMMAND_TO_USE} needs to come first since the capture_RPi code checks for it first.
# Pass debuglevel on command line so the capture program knows right away
# if it should display debug output.

#shellcheck disable=SC2086
"${ALLSKY_BIN}/${CAPTURE}" ${RPi_COMMAND_TO_USE} -debuglevel "${ALLSKY_DEBUG_LEVEL}" -config "${ARGS_FILE}"
RETCODE=$?

if [[ ${RETCODE} -eq ${EXIT_OK} ]]; then
	[[ ${CAMERA_TYPE} == "ZWO" ]] && rm -f "${RESETTING_USB_LOG}"
	doExit "${EXIT_OK}" ""
fi

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
	# Reset the USB bus
	reset_usb " (too many capture errors)"
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
fi

# RETCODE -ge ${EXIT_ERROR_STOP} means we should not restart until the user fixes the error.
if [[ ${RETCODE} -ge ${EXIT_ERROR_STOP} ]]; then
	echo "***"
	if [[ ${ON_TTY} == "true" ]]; then
		echo "*** After fixing, restart ${ME}. ***"
	else
		echo "*** After fixing, restart the allsky service. ***"
	fi
	echo "***"
	doExit "${RETCODE}" "Error"	# Can't do a custom message since we don't know the problem
fi

# Some other error
if [[ ${USE_NOTIFICATION_IMAGES} == "true" ]]; then
	# If started by the service, it will restart us once we exit.
	doExit "${RETCODE}" "NotRunning"
else
	doExit "${RETCODE}" ""
fi
