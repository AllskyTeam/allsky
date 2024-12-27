#!/bin/bash

[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )" )"
ME="$( basename "${BASH_ARGV0}" )"

# NOT_STARTED_MSG, STOPPED_MSG, ERROR_MSG_PREFIX, and ZWO_VENDOR are globals

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit "${EXIT_ERROR_STOP}"
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
	set_allsky_status "${ALLSKY_STATUS_NEVER_RUN}"
	doExit "${EXIT_ERROR_STOP}" "no-image" "" ""
fi

####
usage_and_exit()
{
	local RET C MSG

	RET=${1}
	if [[ ${RET} -eq 0 ]]; then
		C="${YELLOW}"
	else
		C="${RED}"
	fi
	{
		echo -en "\n${C}"
		echo -n  "Usage: ${ME} [--help] [--preview]"
		echo -e  "${NC}"
		echo
		echo "'--help' displays this message and the help message from the capture program, then exits."
		echo
		echo "'--preview' displays images on your screen as they are taken."
		echo
	} >&2
	[[ ${RET} -ne 0 ]] && exit "${RET}"
}

CAPTURE="capture_${CAMERA_TYPE}"

##### Check arguments
OK="true"
HELP="false"
PREVIEW="false"
while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
		--help)
			HELP="true"
			;;
		--preview)
			PREVIEW="true"
			;;
		-*)
			echo -e "${RED}Unknown argument: '${ARG}'${NC}." >&2
			OK="false"
			;;
		*)
			break;		# end of arguments
			;;
	esac
	shift
done
[[ ${OK} == "false" ]] && usage_and_exit 1
if [[ ${HELP} == "true" ]]; then
	usage_and_exit 0
	"${ALLSKY_BIN}/${CAPTURE}" --help
	exit 0
fi

# Make it easy to find the beginning of this run in the log file.
echo "     ***** Starting AllSky *****"

# Make sure ${CAMERA_TYPE} is valid; if not, exit with a message.
verify_CAMERA_TYPE "${CAMERA_TYPE}"

cd "${ALLSKY_HOME}" || exit 1

# Make sure they rebooted if they were supposed to.
if reboot_needed ; then
	NEEDS_REBOOT="true"
else
	NEEDS_REBOOT="false"
fi

# Make sure the settings have been configured after an installation or upgrade.
LAST_CHANGED="$( settings ".lastchanged" )"
if [[ -z ${LAST_CHANGED} ]]; then
	set_allsky_status "${ALLSKY_STATUS_SEE_WEBUI}"
	echo "*** ===== Allsky needs to be configured before it can be used.  See the WebUI." >&2
	if [[ ${NEEDS_REBOOT} == "true" ]]; then
		echo "*** ===== The Pi also needs to be rebooted." >&2
		doExit "${EXIT_ERROR_STOP}" "ConfigurationNeeded" \
			"Allsky needs\nconfiguration\nand the Pi needs\na reboot" \
			"Allsky needs to be configured and then the Pi rebooted."
	else
		doExit "${EXIT_ERROR_STOP}" "ConfigurationNeeded" "" "Allsky needs to be configured."
	fi
elif [[ ${NEEDS_REBOOT} == "true" ]]; then
	set_allsky_status "${ALLSKY_STATUS_SEE_WEBUI}"
	doExit "${EXIT_ERROR_STOP}" "RebootNeeded" "" "The Pi needs to be rebooted."
fi

SEE_LOG_MSG="See ${ALLSKY_LOG}"
ARGS_FILE="${ALLSKY_TMP}/capture_args.txt"

# If a prior copy of Allsky exists, remind the user if we've never reminded before,
# or it's been at least a week since the last reminder.
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
		MSG+="\nIf you are no longer using it, it can be removed to save disk space:"
		MSG+="\n&nbsp; &nbsp;<code>rm -fr '${PRIOR_ALLSKY_DIR}'</code>\n"
		"${ALLSKY_SCRIPTS}/addMessage.sh" "info" "${MSG}"
		touch "${OLD_ALLSKY_REMINDER}"		# last time we displayed the message
	fi
fi

# If there's some checkAllsky.sh output, remind the user.
if [[ -f ${CHECK_ALLSKY_LOG} ]]; then
	DO_MSG="true"
	REMINDER="${ALLSKY_LOGS}/checkAllsky_reminder.txt"
	if [[ -f ${REMINDER} ]]; then
		CHECK_DATE="$( date -d '1 week ago' +'%Y%m%d%H%M.%S' )"
		CHECK_FILE="${ALLSKY_TMP}/check_date-checkAllsky"
		touch -t "${CHECK_DATE}" "${CHECK_FILE}"
		[[ ${REMINDER} -nt "${CHECK_FILE}" ]] && DO_MSG="false"
		rm -f "${CHECK_FILE}"
	fi
	if [[ ${DO_MSG} == "true" ]]; then
		MSG="<div class='errorMsgBig errorMsgBox center-div center-text'>"
		MSG+="Reminder to make these changes to your settings"
		MSG+="</div>"
		MSG+="$( < "${CHECK_ALLSKY_LOG}" )"
		MSG+="<hr><span class='errorMsgBig'>If you made the changes run:</span>"
		MSG+="\n&nbsp; &nbsp;<code>rm -f '${CHECK_ALLSKY_LOG}'</code>\n"
		"${ALLSKY_SCRIPTS}/addMessage.sh" "warning" "${MSG}"
		touch "${REMINDER}"		# last time we displayed the message
	fi
fi

# This file contains information the user needs to act upon after an installation.
if [[ -f ${POST_INSTALLATION_ACTIONS} ]]; then
	# If there's an initial message created during installation, display an image and stop.
	F="${POST_INSTALLATION_ACTIONS}_initial_message"
	if [[ -f ${F} ]]; then
		# There is already a message so don't add another,
		# and there's already an image, so don't overwrite it.
		# shellcheck disable=SC2154
		rm -f "${F}"		# so next time we'll remind them.
		set_allsky_status "${ALLSKY_STATUS_SEE_WEBUI}"
		doExit "${EXIT_ERROR_STOP}" "no-image" "" ""
	else
		MSG="Reminder: Click here to see the action(s) that need to be performed."
		MSG+="\nOnce you perform them run the following to remove this message:"
		MSG+="\n &nbsp; &nbsp;<code>rm -f '${POST_INSTALLATION_ACTIONS}'</code>"
		PIA="${POST_INSTALLATION_ACTIONS/${ALLSKY_HOME}/}"
		"${ALLSKY_SCRIPTS}/addMessage.sh" "warning" "${MSG}" "${PIA}"
	fi
fi

USE_NOTIFICATION_IMAGES="$( settings ".notificationimages" )"		|| exit "${EXIT_ERROR_STOP}"

# Make sure we are not already running.
pgrep "${ME}" | grep -v $$ | xargs "sudo kill -9" 2>/dev/null

# Get the list of connected cameras and make sure the one we want is connected.
if [[ ${CAMERA_TYPE} == "ZWO" ]]; then
	RPi_COMMAND_TO_USE=""
	RESETTING_USB_LOG="${ALLSKY_TMP}/resetting_USB.txt"

	reset_usb()		# resets the USB bus
	{
		local REASON="${1}"		# why are we resetting the bus?
		local MSG  IMAGE_MSG
		# Only reset a couple times, then exit with fatal error.
		if [[ -f ${RESETTING_USB_LOG} ]]; then
			NUM_USB_RESETS=$( < "${RESETTING_USB_LOG}" )
			if [[ ${NUM_USB_RESETS} -ge 2 ]]; then
				rm -f "${RESETTING_USB_LOG}"

				MSG="Too many consecutive USB bus resets done (${NUM_USB_RESETS})."
				echo -e "${RED}*** ${FATAL_MSG} ${MSG} Stopping Allsky.${NC}" >&2
				IMAGE_MSG="${ERROR_MSG_PREFIX}"
				IMAGE_MSG+="\nToo many consecutive\nUSB bus resets done!\n${SEE_LOG_MSG}"
				doExit "${EXIT_ERROR_STOP}" "Error" 
					"${IMAGE_MSG}" "${NOT_STARTED_MSG}: ${MSG}"
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
		"${ALLSKY_SCRIPTS}/generate_notification_images.sh" --directory "${ALLSKY_TMP}" \
			"${FILENAME}" "yellow" "" "85" "" "" \
			"" "5" "yellow" "${EXTENSION}" "" \
			"WARNING:\n\nResetting USB bus\n${REASON}.\nAttempt ${NUM_USB_RESETS}."

		SEARCH="${ZWO_VENDOR}:${ZWO_CAMERA_ID}"
		sudo "${ALLSKY_BIN}/uhubctl" --action off --exact --search "${SEARCH}"
		sleep 3		# give it a few seconds, plus, allow the notification images to be seen
		sudo "${ALLSKY_BIN}/uhubctl" --action on --exact --search "${SEARCH}"
	}

else	# RPi
	# "true" means use doExit() on error
	RPi_COMMAND_TO_USE="$( determineCommandToUse "true" "${ERROR_MSG_PREFIX}" "false" )"
fi

# "true" means ignore errors
get_connected_cameras_info "true" > "${CONNECTED_CAMERAS_INFO}"
if grep --silent "^${CAMERA_TYPE}" "${CONNECTED_CAMERAS_INFO}" ; then
	CAMERA_TYPE_FOUND="true"
else
	CAMERA_TYPE_FOUND="false"
fi

if [[ ${CAMERA_TYPE_FOUND} == "false" ]]; then
	if [[ ${CAMERA_TYPE} == "ZWO" ]]; then
		# reset_usb() exits if too many tries
		reset_usb "looking for a\nZWO camera"
		set_allsky_status "${ALLSKY_STATUS_SEE_WEBUI}"
		exit 0	# exit with 0 so the service is restarted
	fi

	set_allsky_status "${ALLSKY_STATUS_SEE_WEBUI}"
	MSG="${NOT_STARTED_MSG}  No connected ${CAMERA_TYPE} cameras found!"
	IMAGE_MSG="${ERROR_MSG_PREFIX}"
	IMAGE_MSG+="${NOT_STARTED_MSG}\n"
	IMAGE_MSG+="\nNo connected ${CAMERA_TYPE}\ncameras found!"
	doExit "${EXIT_ERROR_STOP}" "Error" \
		"${IMAGE_MSG}" "${MSG}"
fi

# Make sure the current camera is supported and hasn't changed unexpectedly.
CAM="${CAMERA_TYPE}	${CAMERA_NUMBER}	${CAMERA_MODEL}"	# has TABS
CCM="$( get_connected_camera_models --full "${CAMERA_TYPE}" )"
read -r CC_TYPE CC_NUMBER CC_MODEL <<<"${CCM}"
if ! echo -e "${CCM}" | grep --silent "${CAM}" ; then
	# Something changed.  validate_camera() displays the error message.
	if ! validate_camera "${CC_TYPE}" "${CC_MODEL}" "${CC_NUMBER}" ; then
		set_allsky_status "${ALLSKY_STATUS_SEE_WEBUI}"
		IMAGE_MSG="${ERROR_MSG_PREFIX}"
		IMAGE_MSG+="The camera changed."
		IMAGE_MSG+="\nCheck Camera Type\n& Model in the WebUI."
		doExit "${EXIT_ERROR_STOP}" "Error" "${IMAGE_MSG}"
	fi
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

# Only pass settings that are used by the capture program.
if ! ARGS="$( "${ALLSKY_SCRIPTS}/convertJSON.php" --capture-only )" ; then
	echo "${ME}: ERROR: convertJSON.php returned: ${ARGS}"
	set_allsky_status "${ALLSKY_STATUS_ERROR}"
	exit "${EXIT_ERROR_STOP}"
fi

# We must pass "-config ${ARGS_FILE}" on the command line and
# other settings needed at the start of the capture program.
{
	echo "${ARGS}" |
		grep -E -i -v "^config=|^debuglevel=^cmd=|^cameramodel|^cameranumber|^locale="

	echo "version=${ALLSKY_VERSION}"
	echo "save_dir=${CAPTURE_SAVE_DIR}"
	[[ ${PREVIEW} == "true" ]] && echo "preview=true"
} > "${ARGS_FILE}"

# If the user wants images uploaded only every n times, save that number to a file.
if [[ ${IMG_UPLOAD_FREQUENCY} -ne 1 ]]; then
	# Save "1" so we upload the first image.
	# saveImage.sh will write ${IMG_UPLOAD_FREQUENCY} to the file as needed.
	echo "1" > "${FREQUENCY_FILE}"		# FREQUENCY_FILE is global
else
	rm -f "${FREQUENCY_FILE}"
fi

# Clear up any flow timings
activate_python_venv
python3 "${ALLSKY_SCRIPTS}/flow-runner.py" --cleartimings
deactivate_python_venv

function catch_signal() { return 0; }
trap "catch_signal" SIGTERM SIGINT SIGHUP

set_allsky_status "${ALLSKY_STATUS_STARTING}"

# Run the camera-specific capture program - this is the main attraction...
CAMERA_NUMBER="$( settings ".cameranumber" )"
CAMERA_NUMBER="${CAMERA_NUMBER:-0}"		# default
"${ALLSKY_BIN}/${CAPTURE}" \
	-debuglevel "${ALLSKY_DEBUG_LEVEL}" \
	-cmd "${RPi_COMMAND_TO_USE}" \
	-cameramodel "${CAMERA_MODEL}" \
	-cameranumber "${CAMERA_NUMBER}" \
	-locale "$( settings ".locale" )" \
	-config "${ARGS_FILE}"
RETCODE=$?

if [[ ${RETCODE} -eq ${EXIT_OK} ]]; then
	[[ ${CAMERA_TYPE} == "ZWO" ]] && rm -f "${RESETTING_USB_LOG}"
	set_allsky_status "${ALLSKY_STATUS_STOPPED}"
	doExit "${EXIT_OK}" ""
fi

if [[ ${RETCODE} -eq ${EXIT_RESTARTING} ]]; then
	if [[ ${ON_TTY} == "true" ]]; then
		echo "*** Can restart allsky now. ***"
		NOTIFICATION_TYPE="NotRunning"
	else
		NOTIFICATION_TYPE="Restarting"
	fi
	set_allsky_status "${ALLSKY_STATUS_STOPPED}"
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
	set_allsky_status "${ALLSKY_STATUS_ERROR}"
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
	set_allsky_status "${ALLSKY_STATUS_ERROR}"
	doExit "${RETCODE}" "Error"	# Can't do a custom message since we don't know the problem
fi

# Some other error
if [[ ${USE_NOTIFICATION_IMAGES} == "true" ]]; then
	# If started by the service, it will restart us once we exit.
	set_allsky_status "${ALLSKY_STATUS_NOT_RUNNING}"
	doExit "${RETCODE}" "NotRunning"
else
	set_allsky_status "${ALLSKY_STATUS_SEE_WEBUI}"
	doExit "${RETCODE}" ""
fi
