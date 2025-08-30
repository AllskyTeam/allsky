#!/bin/bash
# shellcheck disable=SC2154		# referenced but not assigned - from convertJSON.php

[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )" )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit "${EXIT_ERROR_STOP}"

# If Allsky is already running, exit.  Let prior copy continue runnning.
if [[ $( pgrep --count "${ME}" ) -gt 1 ]]; then
	echo "     ***** Allsky already running; see below. Exiting new copy. *****" >&2
	# Show other processes.  Don't show any newer than 5 seconds so we don't show ourself.
	ps -f -p "$( pgrep --older 5 "${ME}" )"
	exit "${EXIT_ERROR_STOP}"
fi

#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/installUpgradeFunctions.sh"	|| exit "${EXIT_ERROR_STOP}"

# NOT_STARTED_MSG, STOPPED_MSG, ERROR_MSG_PREFIX, and ZWO_VENDOR are globals

# Output from this script goes either to the log file or a tty,
# so can't use "w*" colors.

if [[ ! -d ${ALLSKY_CONFIG} ]]; then
	MSG="*** ====="
	MSG+="\nAllsky needs to be installed.  Run:  cd ~/allsky; ./install.sh"
	MSG+="\n*** ====="
	E_ "${MSG}" >&2

	# Can't call addMessage.sh or copyNotificationImage.sh or almost anything
	# since they use ${ALLSKY_CONIG} and/or ${ALLSKY_TMP} which don't exist yet.
	set_allsky_status "${ALLSKY_STATUS_NEVER_RUN}"
	doExit "${EXIT_ERROR_STOP}" "no-image" "" ""
fi

####
usage_and_exit()
{
	local RET=${1}
	local USAGE="\nUsage: ${ME} [--help] [--preview]"
	USAGE+="\nArgumens:"
	USAGE+="\n   --help      Displays this message and the help message from the capture program, then exits."
	USAGE+="\n   --preview   Displays images on your screen as they are taken."
	if [[ ${RET} -eq 0 ]]; then
		W_ "${USAGE}" >&2
		# Do NOT exit yet.
	else
		E_ "${USAGE}" >&2
		exit "${RET}"
	fi
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
			E_ "ERROR: Unknown argument: '${ARG}'." >&2
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
echo "     ***** Starting Allsky *****"

# Make sure ${CAMERA_TYPE} is valid; if not, exit with a message.
verify_CAMERA_TYPE "${CAMERA_TYPE}"

cd "${ALLSKY_HOME}" || exit 1

# Make sure they rebooted if they were supposed to.
if reboot_needed ; then
	NEEDS_REBOOT="true"
else
	NEEDS_REBOOT="false"
fi

if [[ ${NEEDS_REBOOT} == "true" ]]; then
	set_allsky_status "${ALLSKY_STATUS_REBOOT_NEEDED}"
	doExit "${EXIT_ERROR_STOP}" "RebootNeeded" "" "The Pi needs to be rebooted."
fi

# Get all settings we're going to use.
#shellcheck disable=SC2119
getAllSettings --var "lastchanged cameranumber locale" || exit 1

# If the "lastchanged" setting is missing, the user needs to review/change the settings.
# This will happen after an installation or upgrade, which also sets the Allsky status.
if [[ -z ${S_lastchanged} ]]; then
	STATUS="$( get_allsky_status )"
	if [[ ${STATUS} == "${ALLSKY_STATUS_REBOOT_NEEDED}" ]]; then
		# It's been rebooted and now we need to force "lastchanged" to be set.
		STATUS="${ALLSKY_STATUS_NEEDS_REVIEW}"
	fi

	if [[ ${STATUS} == "${ALLSKY_STATUS_NEEDS_REVIEW}" ]]; then
		IMAGE_NAME="ReviewNeeded"
		MSG="Please review the settings on the WebUI's 'Allsky Settings' page"
		MSG+=" and make any necessary changes."
		WEBUI_MSG="Allsky settings need review"

	elif [[ ${STATUS} == "${ALLSKY_STATUS_NEEDS_CONFIGURATION}" ]]; then
		IMAGE_NAME="ConfigurationNeeded"
		MSG="Allsky needs to be configured before it can be used.  See the WebUI."
		WEBUI_MSG="Allsky needs to be configured"

	else
		# I don't think we'll ever get here.
		MSG="ERROR: Unknown reason 'lastchanged' did not exist."
		WEBUI_MSG="${MSG}"
		IMAGE_NAME=""
	fi
	if [[ ${NEEDS_REBOOT} == "true" ]]; then
		MSG+=" The Pi also needs to be rebooted." >&2
		doExit "${EXIT_ERROR_STOP}" "${IMAGE_NAME}" \
			"" "${WEBUI_MSG} and then the Pi rebooted."
	else
		doExit "${EXIT_ERROR_STOP}" "${IMAGE_NAME}" "" "${WEBUI_MSG}."
	fi
	[[ -n ${MSG} ]] && echo "*** ===== ${MSG}" >&2		# to the log
fi

SEE_LOG_MSG="See ${ALLSKY_LOG}"
ARGS_FILE="${ALLSKY_TMP}/capture_args.txt"

# If a prior copy of Allsky exists, remind the user if we've never reminded before,
# or it's been at least a week since the last reminder.
if [[ -d ${ALLSKY_PRIOR_DIR} ]]; then
	DO_MSG="true"
	if [[ -f ${ALLSKY_OLD_REMINDER} ]]; then
		CHECK_DATE="$( date -d '1 week ago' +'%Y%m%d%H%M.%S' )"
		CHECK_TMP_FILE="${ALLSKY_TMP}/check_date"
		touch -t "${CHECK_DATE}" "${CHECK_TMP_FILE}"
		[[ ${ALLSKY_OLD_REMINDER} -nt "${CHECK_TMP_FILE}" ]] && DO_MSG="false"
		rm -f "${CHECK_TMP_FILE}"
	fi
	if [[ ${DO_MSG} == "true" ]]; then
		MSG="Reminder: your prior Allsky is still in '${ALLSKY_PRIOR_DIR}'."
		MSG+="\nIf you are no longer using it, it can be removed to save disk space."
		"${ALLSKY_SCRIPTS}/addMessage.sh" --id AM_RM_PRIOR --type info --msg "${MSG}" \
			--cmd "Click here to remove the directory and all its contents."
		touch "${ALLSKY_OLD_REMINDER}"		# Sets the last time we displayed the message.
	fi
fi

# If there's some checkAllsky.sh output, remind the user.
if [[ -f ${ALLSKY_CHECK_LOG} ]]; then
	DO_MSG="true"
	REMINDER="${ALLSKY_LOGS}/checkAllsky_reminder.txt"
	if [[ -f ${REMINDER} ]]; then
		CHECK_DATE="$( date -d '1 week ago' +'%Y%m%d%H%M.%S' )"
		CHECK_TMP_FILE="${ALLSKY_TMP}/check_date-checkAllsky"
		touch -t "${CHECK_DATE}" "${CHECK_TMP_FILE}"
		[[ ${REMINDER} -nt "${CHECK_TMP_FILE}" ]] && DO_MSG="false"
		rm -f "${CHECK_TMP_FILE}"
	fi
	if [[ ${DO_MSG} == "true" ]]; then
		MSG="<div class='errorMsgBig errorMsgBox center-div center-text'>"
		MSG+="Reminder to make these changes to your settings"
		MSG+="</div>"
		MSG+="$( < "${ALLSKY_CHECK_LOG}" )"
		"${ALLSKY_SCRIPTS}/addMessage.sh" --id AM_RM_CHECK --type warning --msg "${MSG}" \
			--cmd "<hr><span class='errorMsgBig'>If you made the changes click here.</span>"
		touch "${REMINDER}"		# last time we displayed the message
	fi
fi

# This file contains information the user needs to act upon after an installation.
if [[ -f ${ALLSKY_POST_INSTALL_ACTIONS} ]]; then
	# If there's an initial message created during installation, display an image and stop.
	F="${ALLSKY_POST_INSTALL_ACTIONS}_initial_message"
	if [[ -f ${F} ]]; then
		# There is already a message so don't add another,
		# and there's already an image, so don't overwrite it.
		# shellcheck disable=SC2154
		rm -f "${F}"		# so next time we'll remind them.
		set_allsky_status "${ALLSKY_STATUS_ACTIONS_NEEDED}"
		doExit "${EXIT_ERROR_STOP}" "no-image" "" ""
	else
		# First delete the initial message if there since we're posting a reminder.
		"${ALLSKY_SCRIPTS}/addMessage.sh" --id AM_POST --delete

		MSG="Reminder: Click here to see the action(s) that need to be performed."
		PIA="${ALLSKY_POST_INSTALL_ACTIONS/${ALLSKY_HOME}/}"
		"${ALLSKY_SCRIPTS}/addMessage.sh" --id AM_RM_POST --type warning \
			--msg "${MSG}" --url "${PIA}" \
			--cmd "\nOnce you perform them, click here to remove this message."
	fi
fi

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
				E_ "*** ${FATAL_MSG} ${MSG} Stopping Allsky." >&2
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
			W_ "${MSG}; restart ${ME} when done." >&2
		else
			echo "${MSG}, then restarting." >&2
			# The service will automatically restart this script.
		fi

		((NUM_USB_RESETS++))
		echo "${NUM_USB_RESETS}" > "${RESETTING_USB_LOG}"

		# Display a warning message
		"${ALLSKY_SCRIPTS}/generateNotificationImages.sh" --directory "${ALLSKY_CURRENT_DIR}" \
			"${ALLSKY_FILENAME}" "yellow" "" "85" "" "" \
			"" "5" "yellow" "${ALLSKY_EXTENSION}" "" \
			"WARNING:\n\nResetting USB bus\n${REASON}.\nAttempt ${NUM_USB_RESETS}."

		SEARCH="${ZWO_VENDOR}:${ZWO_CAMERA_ID}"
		# Get the hub number the camera is on.
		local HUB="$( sudo "${ALLSKY_BIN}/uhubctl" --exact --search "${SEARCH}" |
			gawk -v Z="${SEARCH}" '
				BEGIN {hub = ""; }
   				{
					if ($4 == "hub") {
						hub = $5;
						next;
					}
					if (index($0, Z) > 0) {
						print hub;
						exit(0);
					}
				}'
		)"
		sudo "${ALLSKY_BIN}/uhubctl" --action off --exact --search "${SEARCH}" --location "${HUB}"
		sleep 3		# give it a few seconds, plus, allow the notification images to be seen
		sudo "${ALLSKY_BIN}/uhubctl" --action on --exact --search "${SEARCH}" --location "${HUB}"
	}

else	# RPi
	# "true" means use doExit() on error
	RPi_COMMAND_TO_USE="$( determineCommandToUse "true" "${ERROR_MSG_PREFIX}" "false" )"
fi

# "true" means ignore errors
get_connected_cameras_info "true" > "${ALLSKY_CONNECTED_CAMERAS_INFO}"
if grep --silent "^${CAMERA_TYPE}" "${ALLSKY_CONNECTED_CAMERAS_INFO}" ; then
	CAMERA_TYPE_FOUND="true"
else
	CAMERA_TYPE_FOUND="false"
fi

if [[ ${CAMERA_TYPE_FOUND} == "false" ]]; then
	set_allsky_status "${ALLSKY_STATUS_NO_CAMERA}"
	if [[ ${CAMERA_TYPE} == "ZWO" ]]; then
		# reset_usb() exits if too many tries
		reset_usb "looking for a\nZWO camera"
		exit 0	# exit with 0 so the service is restarted
	fi

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
#shellcheck disable=SC2076
if [[ ! ${CCM} =~ "${CAM}" ]]; then
	IFS="	" read -r CC_TYPE CC_NUMBER CC_MODEL CC_OTHER <<<"${CCM}"
	echo -e "Was: ${CAMERA_TYPE} ${CAMERA_NUMBER} ${CAMERA_MODEL}"
	echo -e "Now: ${CC_TYPE} ${CC_NUMBER} ${CC_MODEL} ${CC_OTHER}"
	# Something changed.  validate_camera() displays the error message.
	if ! validate_camera "${CC_TYPE}" "${CC_MODEL}" "${CC_NUMBER}" ; then
		set_allsky_status "${ALLSKY_STATUS_CAMERA_CHANGED}"
		IMAGE_MSG="${ERROR_MSG_PREFIX}"
		IMAGE_MSG+="The camera changed."
		IMAGE_MSG+="\nCheck Camera Type\n& Model in the WebUI."
		reset_usb "Camera changed"
		doExit "${EXIT_ERROR_STOP}" "Error" "${IMAGE_MSG}"
	fi
fi

# Make sure the settings file is linked to the camera-specific file.
if ! MSG="$( check_settings_link "${ALLSKY_SETTINGS_FILE}" )" ; then
	"${ALLSKY_SCRIPTS}/addMessage.sh" --type error --cmd "${MSG}"
	E_ "ERROR: ${MSG}" >&2
fi

# Make directories that need to exist.
if [[ -d ${ALLSKY_CURRENT_DIR} ]]; then
	# Remove any lingering temporary old image files.
	rm -f "${ALLSKY_CURRENT_DIR}/${ALLSKY_FILENAME}"-20*."${ALLSKY_EXTENSION}"	# "20" for 2000 and later
else
	# We should never get here since ${ALLSKY_CURRENT_DIR} is created during installation,
	# but "just in case"...
	mkdir -p "${ALLSKY_CURRENT_DIR}"
	chmod 775 "${ALLSKY_CURRENT_DIR}"
	sudo chgrp "${WEBSERVER_GROUP}" "${ALLSKY_CURRENT_DIR}"
	MSG="Had to create '${ALLSKY_CURRENT_DIR}'."
	MSG="${MSG}\nIf this happens again, contact the Allsky developers."
	"${ALLSKY_CURRENT_DIR}/addMessage.sh" --type warning --msg "${ME}: ${MSG}"
fi

rm -f "${ALLSKY_BAD_IMAGE_COUNT}"	# Start with no bad images

# Clear out these files and allow the web server to write to it.
rm -fr "${ALLSKY_ABORTS_DIR}"
mkdir "${ALLSKY_ABORTS_DIR}"
sudo chgrp "${WEBSERVER_GROUP}" "${ALLSKY_ABORTS_DIR}"
sudo chmod 775 "${ALLSKY_ABORTS_DIR}"

rm -f "${ALLSKY_NOTIFICATION_LOG}"	# clear out any notificatons from prior runs.

# Can do this in the background to speed up startup.
"${ALLSKY_SCRIPTS}/copyNotificationImage.sh" --expires 0 "StartingUp" 2>&1 &

# Only pass settings that are used by the capture program.
if ! ARGS="$( "${ALLSKY_SCRIPTS}/convertJSON.php" --capture-only )" ; then
	E_ "${ME}: ERROR: convertJSON.php returned: ${ARGS}"
	set_allsky_status "${ALLSKY_STATUS_ERROR}"
	exit "${EXIT_ERROR_STOP}"
fi

# We must pass "-config ${ARGS_FILE}" on the command line and
# other settings needed at the start of the capture program,
# so don't include them in the ARGS_FILE.
{
	echo "${ARGS}" |
		grep -E -i -v "^debuglevel=|^cameramodel=|^cameranumber=|^locale=|^config="

	# These aren't settings but are needed by the capture programs.
	echo "version=${ALLSKY_VERSION}"
	echo "save_dir=${ALLSKY_CURRENT_DIR}"
	echo "bad_image_count_file=${ALLSKY_BAD_IMAGE_COUNT}"
	[[ ${PREVIEW} == "true" ]] && echo "preview=true"
} > "${ARGS_FILE}"

# If the user wants images uploaded only every n times, save that number to a file.
if [[ ${IMG_UPLOAD_FREQUENCY} -ne 1 ]]; then
	# Save "1" so we upload the first image.
	# saveImage.sh will write ${IMG_UPLOAD_FREQUENCY} to the file as needed.
	echo "1" > "${ALLSKY_FREQUENCY_FILE}"		# ALLSKY_FREQUENCY_FILE is global
else
	rm -f "${ALLSKY_FREQUENCY_FILE}"
fi

# Clear up any flow timings
activate_python_venv
python3 "${ALLSKY_SCRIPTS}/flow-runner.py" --cleartimings
deactivate_python_venv

function catch_signal() { return 0; }
trap "catch_signal" SIGTERM SIGINT SIGHUP

set_allsky_status "${ALLSKY_STATUS_STARTING}"

# Run the camera-specific capture program - this is the main attraction...
CAMERA_NUMBER="${S_cameranumber:-0}"		# default
"${ALLSKY_BIN}/${CAPTURE}" \
	-debuglevel "${ALLSKY_DEBUG_LEVEL}" \
	-cmd "${RPi_COMMAND_TO_USE}" \
	-cameramodel "${CAMERA_MODEL}" \
	-cameranumber "${CAMERA_NUMBER}" \
	-locale "${S_locale}" \
	-config "${ARGS_FILE}"
RETCODE=$?

if [[ ${RETCODE} -eq ${EXIT_OK} ]]; then
	[[ ${CAMERA_TYPE} == "ZWO" ]] && rm -f "${RESETTING_USB_LOG}"
	set_allsky_status "${ALLSKY_STATUS_STOPPED}"
	# The user probably stopped Allsky, and the WebUI's status will show "Stopped".
	# In case the user wants to see the last image, do NOT call copyNotificationImage.sh.
	doExit "${EXIT_OK}" ""
fi

if [[ ${RETCODE} -eq ${EXIT_RESTARTING} ]]; then
	if [[ ${ON_TTY} == "true" ]]; then
		echo "*** Can restart allsky now. ***"
		NOTIFICATION_TYPE="NotRunning"
	else
		NOTIFICATION_TYPE="Restarting"
	fi
	"${ALLSKY_SCRIPTS}/copyNotificationImage.sh" "${NOTIFICATION_TYPE}"
	set_allsky_status "${ALLSKY_STATUS_RESTARTING}"
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
	"${ALLSKY_SCRIPTS}/copyNotificationImage.sh" "${NOTIFICATION_TYPE}"
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
# If started by the service, it will restart us once we exit.
set_allsky_status "${ALLSKY_STATUS_NOT_RUNNING}"
doExit "${RETCODE}" "NotRunning"
