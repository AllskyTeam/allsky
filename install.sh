#!/bin/bash
# shellcheck disable=SC2154,SC2024		# referenced but not assigned, sudo redirects

unset ALLSKY_VARIABLE_SET		# To force variables.sh to be read

[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )" )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/installUpgradeFunctions.sh"	|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/checkFunctions.sh"			|| exit "${EXIT_ERROR_STOP}"

# Default may be 700 (HOME) or 750 (ALLSKY_HOME) so web server can't read it
chmod 755 "${HOME}" "${ALLSKY_HOME}"					|| exit "${EXIT_ERROR_STOP}"
cd "${ALLSKY_HOME}"  									|| exit "${EXIT_ERROR_STOP}"

[[ ! -d ${ALLSKY_TMP} ]] && mkdir -p "${ALLSKY_TMP}"

# The ALLSKY_POST_INSTALL_ACTIONS contains information the user needs to act upon after installation.
rm -f "${ALLSKY_POST_INSTALL_ACTIONS}"		# Shouldn't be there, but just in case.
rm -f "${ALLSKY_MESSAGES}"					# Start out with no messages.
rm -f "${ALLSKY_REBOOT_NEEDED}"				# In case it's left over from a prior install.

SHORT_TITLE="Allsky Installer"
TITLE="${SHORT_TITLE} - ${ALLSKY_VERSION}"
FINAL_SUDOERS_FILE="/etc/sudoers.d/allsky"
OLD_RASPAP_DIR="/etc/raspap"			# used to contain WebUI configuration files
SETTINGS_FILE_NAME="$( basename "${ALLSKY_SETTINGS_FILE}" )"
FORCE_CREATING_DEFAULT_SETTINGS_FILE="false"	# should a default settings file be created?
RESTORED_PRIOR_SETTINGS_FILE="false"
PRIOR_SETTINGS_FILE=""					# Full pathname to the prior settings file, if it exists
COPIED_PRIOR_CONFIG_SH="false"			# prior config.sh's settings copied to settings file?
COPIED_PRIOR_FTP_SH="false"				# prior ftp-settings.sh's settings copied to settings file?
SUGGESTED_NEW_HOST_NAME="allsky"		# Suggested new host name
NEW_HOST_NAME=""						# User-specified host name
BRANCH="${ALLSKY_GITHUB_MAIN_BRANCH}"	# default branch

PASSED_DISPLAY_MSG_LOG="${DISPLAY_MSG_LOG}"		# if set, we were given the log file name
# shellcheck disable=SC2034
DISPLAY_MSG_LOG="${DISPLAY_MSG_LOG:-${ALLSKY_LOGS}/install.log}"	# send log entries here

LONG_BITS=$( getconf LONG_BIT ) # Size of a long, 32 or 64
REBOOT_NEEDED="true"					# Is a reboot needed at end of installation?
CONFIGURATION_NEEDED="true"				# Does Allsky need configuring at end of installation?
ALLSKY_IMAGES_MOVED="false"				# Did the user move ALLSKY_IMAGES, e.g., to an SSD?
SPACE="    "
NOT_RESTORED="NO PRIOR VERSION"
PI_MODEL=""								# The numeric model of Raspberry Pi
THIS_PI_MODEL=""						# The model of this Raspberry Pi

declare -r TMP_FILE="/tmp/x"			# temporary file used by many functions
declare -r TAB="$( echo -e '\t' )"
declare -r NEW_STYLE_ALLSKY="newStyle"
declare -r OLD_STYLE_ALLSKY="oldStyle"

# Overlay variables
SENSOR_WIDTH=""
SENSOR_HEIGHT=""
FULL_OVERLAY_NAME=""
SHORT_OVERLAY_NAME=""
OVERLAY_NAME=""

##### Allsky versions.   ${ALLSKY_VERSION} is set in variables.sh
#xxx currently not used:    ALLSKY_BASE_VERSION="$( remove_point_release "${ALLSKY_VERSION}" )"

	# Base of first version without Buster support or "legacy" overlay method.
# declare -r NO_BUSTER_BASE_VERSION="v2025.xx.xx"		# TODO: Change xxxxxx not used yet
	# Base of first version with combined configuration files and all lowercase setting names.
declare -r COMBINED_BASE_VERSION="v2024.12.06"

	# Base of first version with CAMERA_TYPE instead of CAMERA in config.sh and
	# "cameratype" in the settings file.
declare -r FIRST_CAMERA_TYPE_BASE_VERSION="v2023.05.01"

	# First Allsky version that used the "version" file.
	# It's also when ftp-settings.sh moved to the ${ALLSKY_CONFIG} directory.
declare -r FIRST_VERSION_VERSION="v2022.03.01"

	# Versions before ${FIRST_VERSION_VERSION} didn't have version numbers.
declare -r PRE_FIRST_VERSION_VERSION="old"

	# A reboot isn't needed if upgrading from this base release.  This changes every release.
declare -r NO_REBOOT_BASE_VERSION="v2024.12.06"

##### Information on the prior Allsky version, if used
USE_PRIOR_ALLSKY="false"
PRIOR_ALLSKY_STYLE=""			# Set to the style if they have a prior version
PRIOR_ALLSKY_VERSION=""			# The version number of the prior version, if known
PRIOR_ALLSKY_BASE_VERSION=""	# The base version number of the prior version, if known
PRIOR_CAMERA_TYPE=""
PRIOR_CAMERA_MODEL=""
PRIOR_CAMERA_NUMBER=""

# Holds status of installation if we need to exit and get back in.
STATUS_FILE="${ALLSKY_LOGS}/install_status.txt"
declare -r STATUS_FILE_TEMP="${ALLSKY_TMP}/temp_status.txt"	# holds intermediate status
# status of rebooting due to locale change
declare -r STATUS_LOCALE_REBOOT="Rebooting to change locale"
declare -r STATUS_FINISH_REBOOT="Rebooting to finish installation"
declare -r STATUS_NO_FINISH_REBOOT="Did not reboot to finish installation"
declare -r STATUS_NO_REBOOT="User elected not to reboot"
# exiting due to desired locale not installed
declare -r STATUS_NO_LOCALE="Desired locale not found"
# status of exiting due to no camera found
declare -r STATUS_NO_CAMERA="No camera found"
declare -r STATUS_NO_LAT_LONG="Latitude and/or Longitude not entered"
declare -r STATUS_OK="OK"										# Installation was completed.
declare -r STATUS_NOT_CONTINUE="User elected not to continue"	# Exiting, but not an error
declare -r STATUS_CLEAR="Clear"									# Clear the file
declare -r STATUS_ERROR="Error encountered"
declare -r STATUS_INT="Got interrupt"
STATUS_VARIABLES=()								# Holds the variables and values to save

##### Set in installUpgradeFunctions.sh
# ALLSKY_PRIOR_DIR
# PRIOR_CONFIG_DIR
# PRIOR_WEBSITE_DIR
# PRIOR_WEBSITE_CONFIG_FILE
# PRIOR_REMOTE_WEBSITE_CONFIGURATION_FILE
# PRIOR_CONFIG_FILE, PRIOR_FTP_FILE
# PRIOR_PYTHON_VENV
# WEBSITE_CONFIG_VERSION, WEBSITE_ALLSKY_VERSION
# REPO_SUDOERS_FILE, REPO_LIGHTTPD_FILE, REPO_AVI_FILE, REPO_OPTIONS_FILE
# LIGHTTPD_LOG_DIR, LIGHTTPD_LOG_FILE
# INSTALLED_LOCALES
# Plus others I probably forgot about...


############################################## functions

####
# The last installation succeeded.
# See what the user wants to do.
last_installation_was_ok()
{
	local MSG

	MSG="The last installation completed successfully."
	MSG+="\n\nDo you want to re-install from the beginning?"
	MSG+="\n\nSelecting <No> will exit without making any changes."
	if whiptail --title "${TITLE}" --yesno "${MSG}" 15 "${WT_WIDTH}"  3>&1 1>&2 2>&3; then
		display_msg --log progress "Re-starting installation after successful install."
		clear_status
	else
		display_msg --logonly info "Not continuing after prior successful installation."
		exit_installation 0 ""
	fi
}


####
# The last installation succeeded but a reboot is needed
# See what the user wants to do.
last_installation_needed_reboot()
{
	local MSG  MSG2

	MSG="The installation completed successfully but the following needs to happen"
	MSG+=" before Allsky is ready to run:"
	MSG2="\n"
	MSG2+="\n    1. Verify your settings in the WebUI's 'Allsky Settings' page."
	MSG2+="\n    2. Reboot the Pi."
	MSG3="\n\nHave you already performed those steps?"
	if whiptail --title "${TITLE}" --yesno "${MSG}${MSG2}${MSG3}" 15 "${WT_WIDTH}" \
			 3>&1 1>&2 2>&3; then
		MSG="\nCongratulations, you successfully installed Allsky version ${ALLSKY_VERSION}!"
		MSG+="\nAllsky is starting.  Look in the WebUI's 'Live View' page to ensure"
		MSG+="\nimages are being taken.\n"
		display_msg --log progress "${MSG}"
		start_Allsky

		# Update status
		sed -i \
			-e "s/${STATUS_NO_FINISH_REBOOT}/${STATUS_OK}/" \
			-e "s/MORE_STATUS.*//" \
				"${STATUS_FILE}"
	else
		display_msg --log info "\nPlease perform the following steps:${MSG2}\n"
	fi
	exit_installation 0 "" "" 
}


####
# The last installation didn't complete.
# Ask the user what they want to do.
last_installation_unknown_status()
{
	local MSG

	[[ -n ${MORE_STATUS} ]] && MORE_STATUS=" - ${MORE_STATUS}"
	MSG="You have already begun the installation."
	MSG+="\n\nThe last status was: ${STATUS_INSTALLATION}${MORE_STATUS}"
	MSG+="\n\nDo you want to continue where you left off?"
	if whiptail --title "${TITLE}" --yesno "${MSG}" 15 "${WT_WIDTH}"  3>&1 1>&2 2>&3; then
		MSG="Continuing installation.  Steps already performed will be skipped."
		MSG+="\n  The last status was: ${STATUS_INSTALLATION}${MORE_STATUS}"
		display_msg --log progress "${MSG}"

		#shellcheck disable=SC1090		# file doesn't exist in GitHub
		source "${STATUS_FILE}" || exit 1
		# Put all but the status variable in the list so we save them next time.
		STATUS_VARIABLES=( "$( grep -v STATUS_INSTALLATION "${STATUS_FILE}" )" )
		STATUS_VARIABLES+=("\n#### Prior variables above, new below.\n")

		# If returning from a reboot for local,
		# prompt for locale again to make sure it's there and still what they want.
		if [[ ${STATUS_INSTALLATION} == "${STATUS_LOCALE_REBOOT}" ]]; then
			unset get_desired_locale	# forces a re-prompt
			unset CURRENT_LOCALE		# It will get re-calculated
		fi

	else
		MSG="Do you want to restart the installation from the beginning?"
		MSG+="\n\nSelecting <No> will exit the installation without making any changes."
		if whiptail --title "${TITLE}" --yesno "${MSG}" 15 "${WT_WIDTH}"  \
				3>&1 1>&2 2>&3; then
			display_msg --log progress "Restarting installation."
		else
			display_msg --log progress "Not continuing after prior partial installation."
			exit_installation 0 ""
		fi
	fi
}

####
handle_prior_installation()
{
	local MSG  MSG2
	# Initially just get the STATUS and MORE_STATUS.
	# After that we may clear the file or get all the variables.
	eval "$( grep "^STATUS_INSTALLATION" "${STATUS_FILE}" )"
	[[ $? -ne 0 ]] && exit_installation 1 ""	# "" means do NOT update the status file

	if [[ ${STATUS_INSTALLATION} == "${STATUS_OK}" ]]; then
		last_installation_was_ok

	elif [[ ${STATUS_INSTALLATION} == "${STATUS_NO_FINISH_REBOOT}" ]]; then
		last_installation_needed_reboot

	else
		last_installation_unknown_status

	fi
}


####
do_initial_heading()
{
	[[ ${SKIP} == "true" ]] && return

	if [[ ${UPDATE} == "true" ]]; then
		display_header "Updating Allsky"
		return
	fi

	local MSG  H  X

	declare -n v="${FUNCNAME[0]}"
	if [[ ${v} == "true" ]]; then
		display_header "Welcome back to the ${SHORT_TITLE}!"
	else
		MSG="Welcome to the ${SHORT_TITLE}!\n"

		if [[ ${RESTORE} == "true" ]]; then
			H="$( basename "${ALLSKY_HOME}" )"
			X="$( basename "${RENAMED_DIR}" )"
			MSG+="\nYour current '${H}' directory will be renamed to"
			MSG+="\n\n    ${X}"
			X="$( basename "${ALLSKY_PRIOR_DIR}" )"
			MSG+="\n\nand the prior Allsky in '${X}' will be"
			MSG+=" renamed to back to '${H}'."
			MSG+="\n\nFiles that were moved from the old release to the current one"
			MSG+=" will be moved back."
			MSG+="\nYou will manually need to restart Allsky after checking that"
			MSG+=" the settings are correct in the WebUI."

		elif [[ ${USE_PRIOR_ALLSKY} == "true" ]]; then
			MSG+="\nYou will be asked if you want to use the images and darks"
			MSG+=" from your prior version of Allsky."

		else
			MSG+="\nYou will be prompted for required information such as the type"
			MSG+="\nof camera you have and the camera's latitude, logitude, and locale."
		fi

		if [[ ${RESTORE} != "true" ]]; then
			MSG+="\n\nNOTE: your camera must be connected to the Pi before continuing."
		fi
		MSG+="\n\nContinue?"
		if ! whiptail --title "${TITLE}" --yesno "${MSG}" 25 "${WT_WIDTH}" \
				3>&1 1>&2 2>&3; then
			display_msg "${LOG_TYPE}" info "User not ready to continue."
			exit_installation 1 "${STATUS_CLEAR}" ""
		fi

		display_header "Welcome to the ${SHORT_TITLE}"
	fi
	declare -n v="${FUNCNAME[0]}"; [[ ${v} != "true" ]] && STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")
}

####
usage_and_exit()
{
	local RET C USAGE

	exec >&2
	RET=${1}
	if [[ ${RET} -eq 0 ]]; then
		C="${YELLOW}"
	else
		C="${RED}"
	fi
	USAGE="Usage: ${ME} [--help] [--debug [...]] [--fix |--update | --restore | --function function]"
	echo -e "\n${C}${USAGE}${NC}"
	echo
	echo "Arguments:"
	echo "   --help       Displays this message and exits."
	echo "   --debug	  Displays debugging information. Can be called multiple times to increase level."
	echo "   --fix        Should only be used when instructed to by the Allsky Website."
	echo "   --update     Should only be used when instructed to by the Allsky Website."
	echo "   --restore    Restores ${ALLSKY_PRIOR_DIR} to ${ALLSKY_HOME}."
	echo "   --function   Executes the specified function and quits."
	echo

	exit_installation "${RET}"
}


####
# Get the branch of the release we are installing;
get_this_branch()
{
	declare -n v="${FUNCNAME[0]}"; [[ ${v} == "true" ]] && return
	local B		# BRANCH is global

	#shellcheck disable=SC2119
	if ! B="$( get_branch )" ; then
		display_msg --log warning "Unable to determine branch; assuming '${BRANCH}'."
	else
		BRANCH="${B}"
		display_msg --logonly info "Using the '${BRANCH}' branch."
	fi

	STATUS_VARIABLES+=("BRANCH='${BRANCH}'\n")
	STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")
}


####
# Execute any specified function, then exit.
do_function()
{
	local FUNCTION="${1}"
	shift

	# If we were passed a log file location, use it.
	[[ -n ${PASSED_DISPLAY_MSG_LOG} ]] && DISPLAY_MSG_LOG="${PASSED_DISPLAY_MSG_LOG}"

	if ! type "${FUNCTION}" > /dev/null; then
		display_msg error "Unknown function: '${FUNCTION}'."
		exit 1
	fi

	${FUNCTION} "$@"
	exit $?
}


####
# Map the new ${CAMERA_TYPE} setting to the old ${CAMERA} setting.
CAMERA_TYPE_to_CAMERA()
{
	local CAMERA_TYPE="${1}"
	if [[ ${CAMERA_TYPE} == "ZWO" ]]; then
		echo "ZWO"
	elif [[ ${CAMERA_TYPE} == "RPi" ]]; then
		echo "RPiHQ"		# RPi cameras used to be called "RPiHQ".
	else
		if [[ -n ${CAMERA_TYPE} ]]; then
			MSG="Unknown CAMERA_TYPE: '${CAMERA_TYPE}'"
		else
			MSG="'CAMERA_TYPE' not defined."
		fi
		display_msg --log error "${MSG}"
		exit_installation 1 "${STATUS_ERROR}" "${MSG}"
	fi
}
####
# Map the old ${CAMERA} setting to the new ${CAMERA_TYPE} setting.
CAMERA_to_CAMERA_TYPE()
{
	local CAMERA="${1}"
	if [[ ${CAMERA} == "ZWO" ]]; then
		echo "ZWO"
	elif [[ ${CAMERA} == "RPiHQ" ]]; then
		echo "RPi"
	else
		if [[ -n ${CAMERA} ]]; then
			MSG="Unknown CAMERA: '${CAMERA}'"
		else
			MSG="'CAMERA' not defined."
		fi
		display_msg --log error "Unknown CAMERA: '${CAMERA}'"
		exit_installation 1 "${STATUS_CLEAR}" "${MSG}"
	fi
}


#######
# Set up the file that contains information on all supported RPi cameras.
# Have separate function so it can be called from "--function".
setup_rpi_supported_cameras()
{
	local CMD="${1}"
	local notCMD

	if [[ ! -f ${ALLSKY_RPi_SUPPORTED_CAMERAS} ]]; then
		local B="$( basename "${ALLSKY_RPi_SUPPORTED_CAMERAS}" )"

		# "libcamera" is the only software packages supported as of 2025,
		# but leave the code to check for any future new software.
		if [[ -z ${CMD} ]]; then
			notCMD="xxxxx"		# won't match anything
			CMD="all"
		elif [[ ${CMD} == "NEW-TBD-SOFTWARE" ]]; then
			notCMD="libcamera"
		else
			notCMD="NEW-TBD-SOFTWARE"
		fi

		local MSG="Creating ${ALLSKY_RPi_SUPPORTED_CAMERAS} with '${CMD}' entries."
		display_msg --logonly info "${MSG}"

		# Remove comment and blank lines and lines for the command we are NOT using.
		grep -v -E "^\$|^#|^${notCMD}" "${ALLSKY_REPO}/${B}.repo" > "${ALLSKY_RPi_SUPPORTED_CAMERAS}"
	fi
}

#######
CONNECTED_CAMERA_MODELS=""
NUM_CONNECTED_CAMERAS=0
CT=()			# Camera Type array - what to display in whiptail

# Re-run every time in case a camera was connected or disconnected.
get_connected_cameras()
{
	local CMD   CMD_RET  CC  MSG   NUM_RPI=0   NUM_ZWO=0

	# true == ignore errors.  ${CMD} will be "" if no command found.
	CMD="$( determineCommandToUse "false" "" "true" 2> /dev/null )"
	CMD_RET=$?		# return of 2 means no command was found
	[[ ${CMD_RET} -ne 0 ]] && CMD=""

	setup_rpi_supported_cameras "${CMD}"		# Will create full file is CMD == ""

	# RPi format:	RPi \t camera_number \t camera_sensor [\t optional_other_stuff]
	# ZWO format:	ZWO \t camera_number \t camera_model
	# "true" == ignore errors
	get_connected_cameras_info --cmd "${CMD}" "true" > "${ALLSKY_CONNECTED_CAMERAS_INFO}" 2>/dev/null

	# Get the RPi connected cameras, if any.
	CC=""
	if [[ -n ${CMD} ]]; then
		local RPI_MODELS="$( get_connected_camera_models --full "RPi" )"
		# Output from above is:
		#	RPi \t camera_number \t camera_model \t camera_sensor
		if [[ -n ${RPI_MODELS} ]]; then
			CC="RPi"
			local CT_ CN_ MODEL SENSOR
   			# shellcheck disable=SC2034
			while read -r CT_ CN_ MODEL SENSOR
			do
				MODEL="${MODEL//++/ }"
				SENSOR="${SENSOR//++/ }"
				local FULL_NAME="${MODEL}  (${SENSOR})"
				[[ -z ${FUNCTION} ]] && display_msg --log progress "Found" " RPi ${FULL_NAME}"
				CT+=("${NUM_RPI};RPi;${MODEL}" "RPi     ${FULL_NAME}")
				((NUM_RPI++))
			done <<<"${RPI_MODELS// /++}"		# replace any spaces
		fi
	fi

	# Get the ZWO connected cameras, if any.
	local ZWO_MODELS="$( get_connected_camera_models "ZWO" )"
	if [[ -n ${ZWO_MODELS} ]]; then
		[[ -n ${CC} ]] && CC+=" "
		CC+="ZWO"
		for X in ${ZWO_MODELS// /++}
		do
			MODEL="${X//++/ }"
			[[ -z ${FUNCTION} ]] && display_msg --log progress "Found" " ZWO ${MODEL}"
			CT+=( "${NUM_ZWO};ZWO;${MODEL}" "ZWO     ${MODEL}" )
			((NUM_ZWO++))
		done
	fi

	NUM_CONNECTED_CAMERAS=$(( NUM_RPI + NUM_ZWO ))
	if [[ ${NUM_CONNECTED_CAMERAS} -eq 0 ]]; then
		MSG="No connected cameras were detected.  The installation will exit."
		MSG+="\nMake sure a camera is plugged in and working prior to restarting"
		MSG+=" the installation."
		if [[ ${CMD_RET} -eq "${EXIT_ERROR_STOP}" ]]; then
			# RPi command timed out.
			MSG+="\n\nIf you have an RPi camera attached, double check the cable -"
			MSG+=" it may be bad or not seated properly."
		fi
		whiptail --title "${TITLE}" --msgbox "${MSG}" 12 "${WT_WIDTH}" 3>&1 1>&2 2>&3

		MSG="No connected cameras were detected."
		local MSG2=""
		if [[ ${CMD_RET} -eq 2 ]]; then
			MSG2="No command to take RPi images was found"
			MSG2+=" - make sure 'libcamera-apps' is installed if you have an RPi camera."
		fi
		display_msg --log error "${MSG}" "${MSG2}"
		exit_installation 1 "${STATUS_NO_CAMERA}" ""
	fi

	declare -n v="${FUNCNAME[0]}";
	[[ ${v} != "true" ]] && STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")

	# CONNECTED_CAMERAS_MODELS was set from a prior installation, if any.
	# If it was set, warn the user if the prior models is different than
	# the current ones, but it's not an error.
	if [[ -n ${CONNECTED_CAMERA_MODELS} ]]; then
		if [[ ${CONNECTED_CAMERA_MODELS} != "${CC}" ]]; then
			MSG="Connected cameras were '${CONNECTED_CAMERA_MODELS}' during last installation"
			MSG+=" but are '${CC}' now."
			display_msg --log info "${MSG}"
			STATUS_VARIABLES+=("CONNECTED_CAMERA_MODELS='${CC}'\n")
			CONNECTED_CAMERA_MODELS="${CC}"
		fi
		return
	fi

	CONNECTED_CAMERA_MODELS="${CC}"	# Either not set before or is different this time
}

#
# Prompt the user to select their camera type, if we can't determine it automatically.
# If they have a prior installation of Allsky that uses either CAMERA or CAMERA_TYPE in config.sh,
# we can use its value and not prompt.
CAMERA_TYPE=""
select_camera_type()
{
	local MSG  CAMERA  NEW  S  CAMERA_INFO
	# CAMERA_TYPE and NUM_CONNECTED_CAMERAS are global

	if [[ ${USE_PRIOR_ALLSKY} == "true" ]]; then
		# bash doesn't have ">=" so we have to use "! ... < "
		if [[ ! ${PRIOR_ALLSKY_VERSION} < "${FIRST_CAMERA_TYPE_BASE_VERSION}" ]]; then
			# New style Allsky using ${CAMERA_TYPE}.
			CAMERA_TYPE="${PRIOR_CAMERA_TYPE}"

			if [[ -n ${CAMERA_TYPE} ]]; then
				MSG="Using Camera Type '${CAMERA_TYPE}' from prior Allsky; not prompting user."
				display_msg --logonly info "${MSG}"
				STATUS_VARIABLES+=("CAMERA_TYPE='${CAMERA_TYPE}'\n")
				if [[ -n ${CAMERA_MODEL} ]]; then
					STATUS_VARIABLES+=("CAMERA_MODEL='${CAMERA_MODEL}'\n")
				fi
				if [[ -n ${CAMERA_NUMBER} ]]; then
					STATUS_VARIABLES+=("CAMERA_NUMBER='${CAMERA_NUMBER}'\n")
				fi
				STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")
				return
			else
				MSG="Camera Type not in prior new-style settings file."
				display_msg --log error "${MSG}"
				exit_installation 2 "${STATUS_NO_CAMERA}" "${MSG}"
			fi
		else
			# Older style using ${CAMERA}
			CAMERA="$( get_variable "CAMERA" "${PRIOR_CONFIG_FILE}" )"
			if [[ -n ${CAMERA} ]]; then
				CAMERA_TYPE="$( CAMERA_to_CAMERA_TYPE "${CAMERA}" )"
				if [[ ${CAMERA} != "${CAMERA_TYPE}" ]]; then
					NEW=" (now called ${CAMERA_TYPE})"
				else
					NEW=""
				fi
				display_msg --log progress "Using prior ${CAMERA} camera${NEW}."
				STATUS_VARIABLES+=("CAMERA_TYPE='${CAMERA_TYPE}'\n")
				# Old style doesn't have CAMERA_MODEL or CAMERA_NUMBER.
				STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")
				return
			else
				MSG="CAMERA not in old-style '${PRIOR_CONFIG_FILE}'.sh."
				display_msg --log warning "${MSG}"
			fi
		fi
	fi

	S=" is"
	[[ ${NUM_CONNECTED_CAMERAS} -gt 1 ]] && S="s are"
	MSG="\nThe following camera${S} connected to the Pi.\n"
	[[ ${NUM_CONNECTED_CAMERAS} -gt 1 ]] && MSG+="Pick the one you want."
	MSG+="\nIf it's not in the list, select <Cancel> and determine why."
	if ! CAMERA_INFO=$( whiptail --title "${TITLE}" --notags --menu "${MSG}" 15 "${WT_WIDTH}" \
			"${NUM_CONNECTED_CAMERAS}" "${CT[@]}" 3>&1 1>&2 2>&3 ) ; then
		MSG="Camera selection required."
		MSG+=" Please re-run the installation and select a camera to continue."
		display_msg --log warning "${MSG}"
		exit_installation 2 "${STATUS_NO_CAMERA}" "User did not select a camera."
	fi
	# CAMERA_INFO is:    number;type;model
	CAMERA_NUMBER="${CAMERA_INFO%%;*}"				# before first ";"
	CAMERA_MODEL="${CAMERA_INFO##*;}"				# after last ";"
	CAMERA_INFO="${CAMERA_INFO/${CAMERA_NUMBER};/}"	# Now:  type;model
	CAMERA_TYPE="${CAMERA_INFO%;*}"					# before ";"

	display_msg --log progress "Using user-selected ${CAMERA_TYPE} ${CAMERA_MODEL} camera."
	STATUS_VARIABLES+=("CAMERA_TYPE='${CAMERA_TYPE}'\n")
	STATUS_VARIABLES+=("CAMERA_MODEL='${CAMERA_MODEL}'\n")
	STATUS_VARIABLES+=("CAMERA_NUMBER='${CAMERA_NUMBER}'\n")

	STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")
}

####
# Wrapper function to call do_save_camera_capabilities and exit on error.
save_camera_capabilities()
{
	declare -n v="${FUNCNAME[0]}"; [[ ${v} == "true" ]] && return

	do_save_camera_capabilities "${1}"
	[[ $? -ne 0 ]] && exit_with_image 1 "${STATUS_ERROR}" "${FUNCNAME[0]} failed."

	STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")
}

####
# Save the camera capabilities and use them to set the WebUI min, max, and defaults.
# This will error out and exit if no camera is installed,
# otherwise it will determine what capabilities the connected camera has,
# then create an "options" file specific to that camera.
# It will also create a default camera-specific "settings" file if one doesn't exist.

do_save_camera_capabilities()
{
	local OPTIONSFILEONLY="${1}"		# Set to "true" if we should ONLY create the options file.
	local FORCE  MSG  OPTIONSONLY  ERR  M  RET
	# CAMERA_MODEL is global

	# Create the camera type/model-specific options file and optionally a default settings file.
	# --cameraTypeOnly tells makeChanges.sh to only change the camera info, then exit.
	# It displays any error messages.
	if [[ ${FORCE_CREATING_DEFAULT_SETTINGS_FILE} == "true" ]]; then
		FORCE=" --force"
		MSG=" and default settings"
	else
		FORCE=""
		MSG=""
	fi

	if [[ ${OPTIONSFILEONLY} == "true" ]]; then
		OPTIONSONLY=" --optionsOnly"
	else
		OPTIONSONLY=""
		MSG="Setting up WebUI options${MSG} for ${CAMERA_TYPE} cameras."
		display_msg --log progress "${MSG}"
	fi

	# Restore the prior settings file or camera-specific settings file(s) if present so
	# the appropriate one can be used by makeChanges.sh.
	[[ -n ${PRIOR_SETTINGS_FILE} ]] && restore_prior_settings_file

	display_msg --logonly info "Making new settings file '${ALLSKY_SETTINGS_FILE}'."

	CMD="makeChanges.sh${FORCE}${OPTIONSONLY}"
	CMD+=" --cameraTypeOnly --from install --addNewSettings ${DEBUG_ARG}"
	#shellcheck disable=SC2089
	CMD+=" cameranumber 'Camera Number' '${PRIOR_CAMERA_NUMBER}' '${CAMERA_NUMBER}'"
	#shellcheck disable=SC2089
	CMD+=" cameramodel 'Camera Model' '${PRIOR_CAMERA_MODEL}' '${CAMERA_MODEL}'"

	# cameratype needs to come last.
	#shellcheck disable=SC2089
	CMD+=" cameratype 'Camera Type' '${PRIOR_CAMERA_TYPE}' '${CAMERA_TYPE}'"

	MSG="Executing ${CMD}"
	display_msg "${LOG_TYPE}" info "${MSG}"

	local TMP="${ALLSKY_LOGS}/makeChanges.log"
	#shellcheck disable=SC2086,SC2090
	M="$( eval "${ALLSKY_SCRIPTS}/"${CMD} 2> "${TMP}" )"
	RET=$?
	if [[ ${RET} -ne 0 ]]; then
		if [[ ${RET} -eq ${EXIT_NO_CAMERA} ]]; then
			MSG="No camera was found;"
			MSG+=" one must be connected and working for the installation to succeed.\n"
			MSG+="After connecting your camera, re-run the installation."
			whiptail --title "${TITLE}" --msgbox "${MSG}" 12 "${WT_WIDTH}" 3>&1 1>&2 2>&3

			display_msg --log error "No camera detected - installation aborted."
			[[ -s ${TMP} ]] && display_msg --log error "$( < "${TMP}" )"
			exit_with_image 1 "${STATUS_ERROR}" "No camera detected"
		elif [[ ${OPTIONSFILEONLY} == "false" ]]; then
			display_msg --log error "Unable to save camera capabilities."
			[[ -s ${TMP} ]] && display_msg --log info "TMP=$( < "${TMP}" )"
			[[ -n ${M} ]] && display_msg --log info "M=${M}"
		fi
		return 1
	else
		[[ -n ${M} ]] && display_msg --logonly info "${M}"

		if [[ ! -f ${ALLSKY_SETTINGS_FILE} ]]; then
			display_msg --log error "Settings file not created; cannot continue."
			return 1
		fi
	fi

	#shellcheck disable=SC2012
	MSG="$( /bin/ls -l "${ALLSKY_CONFIG}/settings"*.json 2>/dev/null | sed 's/^/    /' )"
	display_msg --logonly info "Settings files:\n${MSG}"

	# Make sure the settings file is linked to the camera-specific one.
	MSG="$( check_settings_link "${ALLSKY_SETTINGS_FILE}" )"
	RET=$?
	if [[ ${RET} -ne 0 ]]; then
		if [[ ${RET} -eq "${EXIT_ERROR_STOP}" ]]; then
			display_msg --log error "${MSG}"
			return 1
		else
			display_msg --logonly info "${MSG}"
		fi
	fi

	check_for_required_settings		# Make sure the required settings are there.

	CAMERA_MODEL="$( settings ".cameramodel" "${ALLSKY_SETTINGS_FILE}" )"
	if [[ -z ${CAMERA_MODEL} ]]; then
		display_msg --log error "cameramodel not found in settings file."
		return 1
	fi

	return 0
}

####
# Get a count of the number of the specified file in the specified directory.
get_count()
{
	local DIR="${1}"
	local FILE="${2}"
	find "${DIR}" -maxdepth 1 -name "${FILE}" | wc -l
}

####
# Recreate the options file.
# This can be used after installation if the options file gets hosed.
recreate_options_file()
{
	CAMERA_TYPE="$( settings ".cameratype" )"
	save_camera_capabilities "true"
	set_permissions
}


####
# Update the sudoers file so the web server can execute certain commands with sudo.
do_sudoers()
{
	declare -n v="${FUNCNAME[0]}"; [[ ${v} == "true" ]] && return
	[[ ${SKIP} == "true" ]] && return

	display_msg --logonly info "Creating/updating sudoers file."
	sed \
		-e "s;XX_ALLSKY_SCRIPTS_XX;${ALLSKY_SCRIPTS};" \
		-e "s;XX_ALLSKY_UTILITIES_XX;${ALLSKY_UTILITIES};" \
		"${REPO_SUDOERS_FILE}"  >  "${TMP_FILE}"
	sudo install -m 0644 "${TMP_FILE}" "${FINAL_SUDOERS_FILE}" && rm -f "${TMP_FILE}"

	STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")
}


####
# Ask the user if they want to reboot.
# Call every time in case they change their mind.
WILL_REBOOT="false"
ask_reboot()
{
	local TYPE="${1}"
	local MSG  AT

	if [[ ${TYPE} == "locale" ]]; then
		MSG="A reboot is needed for the locale change to take effect."
		MSG+="\nYou must reboot before continuing the installation."
		MSG+="\n\nReboot now?"
		if whiptail --title "${TITLE}" --yesno "${MSG}" 18 "${WT_WIDTH}" 3>&1 1>&2 2>&3; then
			MSG="\nAfter the reboot you MUST continue with the installation"
			MSG+=" before anything will work."
			MSG+="\nTo restart the installation, do the following:\n"
			MSG+="\n   cd ~/allsky"
			MSG+="\n   ./install.sh"
			MSG+="\n\nThe installation will pick up where it left off."
			whiptail --title "${TITLE}" --msgbox "${MSG}" 15 "${WT_WIDTH}"   3>&1 1>&2 2>&3
			return 0
		else
			REBOOT_NEEDED="true"
			WILL_REBOOT="false"
			return 1
		fi
	fi

	AT="     http://${NEW_HOST_NAME}.local\n"
	AT+="or\n"
	AT+="     http://$( hostname -I | sed -e 's/ .*$//' )"

	if [[ ${REBOOT_NEEDED} == "false" ]]; then
		MSG="\nAfter installation you can connect to the WebUI at:\n${AT}"
		display_msg -log progress "${MSG}"
		return 0
	fi

	MSG="*** Allsky installation is almost done. ***"
	MSG+="\n\nWhen done, you must reboot the Raspberry Pi to finish the installation."
	MSG+="\n\nAfter reboot you can connect to the WebUI at:\n"
	MSG+="${AT}"
	MSG+="\n\nReboot when installation is done?"
	if whiptail --title "${TITLE}" --yesno "${MSG}" 18 "${WT_WIDTH}" 3>&1 1>&2 2>&3; then
		WILL_REBOOT="true"
		display_msg --logonly info "Pi will reboot after installation completes."
	else
		WILL_REBOOT="false"
		display_msg --logonly info "User elected not to reboot."

		MSG="If you have not already rebooted your Pi, please do so now"
		MSG+=" by going to the <span class='WebUILink'>System</span> page."
		MSG+="\n\nYou can then connect to the WebUI at:\n"
		MSG+="${AT}"
		"${ALLSKY_SCRIPTS}/addMessage.sh" --type info --msg "${MSG}"
	fi
}
do_reboot()
{
	exit_installation -1 "${1}" "${2}"	# -1 means just log ending statement but don't exit.
	sudo reboot now
}

####
# Run apt-get, first checking if it's locked.
FIRST_CALL="true"
run_aptGet()
{
	local NUM_FAILS=0
	while sudo fuser --silent /var/lib/dpkg/lock* 2>/dev/null ;
	do
		(( NUM_FAILS++ ))
		if [[ ${NUM_FAILS} -eq 5 ]]; then
			echo "apt-get is locked.  Tried 5 times." >&2
			echo "Wait a while and try the Allsky installation again." >&2
			return 1
		fi
		sleep 3
	done

	# TODO: the above check doesn't seem to work very well, if at all.
	# When we fail due to apt being locked, it's almost always on the
	# first call to apt-get.
	# If the first call fails, try it again.

	local OUTPUT="$( sudo apt-get --assume-yes install "${@}" 2>&1 )"
	local RET=$?
	if [[ ${RET} -ne 0 && ${FIRST_CALL} == "true" ]]; then
		display_msg --logonly info "First call to apt-get failed; trying again."
		sleep 3
		sudo apt-get --assume-yes install "${@}"
		RET=$?
	elif [[ -n ${OUTPUT} ]]; then
		echo -e "${OUTPUT}"
	fi

	FIRST_CALL="false"
	return "${RET}"
}

####
# Check if the return code -ne 0.
# If not, display a message with partial contents from the log file.
check_success()
{
	local RET=${1}
	local MESSAGE="${2}"
	local LOG="${3}"
	local D=${4}
	local MSG

	if [[ ${RET} -ne 0 ]]; then
		display_msg --log error "${MESSAGE}"
		MSG="The full log file is in ${LOG}\nThe end of the file is:"
		display_msg --log info "${MSG}"
		indent "$( tail "${LOG}" )"

		return 1
	fi
	[[ ${D} -gt 1 ]] && cat "${LOG}"

	return 0
}


####
# Get checksums of local Website files.
# The file is used when installing a remote Website, not by this script,
# but we create it now before the user has changed anything.
get_checksums()
{
	declare -n v="${FUNCNAME[0]}"

	[[ -s ${ALLSKY_WEBSITE_CHECKSUM_FILE} ]] && return
	get_website_checksums > "${ALLSKY_WEBSITE_CHECKSUM_FILE}"

	STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")
}


####
# Install the web server.
install_webserver_et_al()
{
	declare -n v="${FUNCNAME[0]}"
	[[ ${SKIP} == "true" ]] && return

	sudo systemctl stop lighttpd 2>/dev/null

	if [[ ${v} == "true" ]]; then
		# Already installed it; just configure it.
		display_msg --log progress "Preparing the web server."
	else
		display_msg --log progress "Installing the web server."
		TMP="${ALLSKY_LOGS}/lighttpd.install.log"
		run_aptGet \
			lighttpd  php-fpm  php-gd  php-sqlite3 avahi-daemon  hwinfo tree python3-picamera2 i2c-tools \
			> "${TMP}" 2>&1
# TODO: Remove in next major release: Used to install: dnsmasq
		check_success $? "lighttpd installation failed" "${TMP}" "${DEBUG}" \
			|| exit_with_image 1 "${STATUS_ERROR}" "lighttpd installation failed"
	fi

	create_lighttpd_config_file
	create_lighttpd_log_file

	# Ignore output since it may already be enabled.
	sudo lighty-enable-mod fastcgi-php-fpm > /dev/null 2>&1

	TMP="${ALLSKY_LOGS}/lighttpd.start.log"
	sudo systemctl start lighttpd > "${TMP}" 2>&1
	check_success $? "Unable to start lighttpd" "${TMP}" "${DEBUG}"
	# Starting it added an entry so truncate the file so it's 0-length
	sleep 1; truncate -s 0 "${LIGHTTPD_LOG_FILE}"

	STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")
}


####
# Prompt for a new hostname if needed,
# and update all the files that contain the hostname.
# The default hostname in Pi OS is "raspberrypi"; if it's still that,
# prompt to update.  If it's anything else that means the user
# already changed it to something so don't overwrite their change.

prompt_for_hostname()
{
	declare -n v="${FUNCNAME[0]}"; [[ ${v} == "true" ]] && return

	local CURRENT_HOSTNAME=$( tr -d " \t\n\r" < /etc/hostname )
	if [[ ${CURRENT_HOSTNAME} != "raspberrypi" ]]; then
		display_msg --logonly info "Using current hostname of '${CURRENT_HOSTNAME}'."
		NEW_HOST_NAME="${CURRENT_HOSTNAME}"

		STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")
		STATUS_VARIABLES+=("NEW_HOST_NAME='${NEW_HOST_NAME}'\n")
		return
	fi

	MSG="Please enter a hostname for your Pi."
	MSG+="\n\nIf you have more than one Pi on your network they MUST all have unique names."
	MSG+="\n\nThe current hostname is '${CURRENT_HOSTNAME}'; the suggested name is below:\n"
	NEW_HOST_NAME=$( whiptail --title "${TITLE}" --inputbox "${MSG}" 15 "${WT_WIDTH}" \
		"${SUGGESTED_NEW_HOST_NAME}" 3>&1 1>&2 2>&3 )
	if [[ $? -ne 0 ]]; then
		MSG="You must specify a host name."
		MSG+="  Please re-run the installation and select one."
		display_msg --log warning "${MSG}"
		exit_installation 2 "No host name selected"
	fi

	STATUS_VARIABLES+=("NEW_HOST_NAME='${NEW_HOST_NAME}'\n")

	if [[ ${CURRENT_HOSTNAME} != "${NEW_HOST_NAME}" ]]; then
		echo "${NEW_HOST_NAME}" | sudo tee /etc/hostname > /dev/null
		sudo sed -i "s/127.0.1.1.*${CURRENT_HOSTNAME}/127.0.1.1${TAB}${NEW_HOST_NAME}/" /etc/hosts

	# else, they didn't change the default name, but that's their problem...
	fi

	# Set up the avahi daemon if needed.
	FINAL_AVI_FILE="/etc/avahi/avahi-daemon.conf"
	[[ -f ${FINAL_AVI_FILE} ]] && grep -i --quiet "host-name=${NEW_HOST_NAME}" "${FINAL_AVI_FILE}"
	if [[ $? -ne 0 ]]; then
		# New NEW_HOST_NAME is not found in the file, or the file doesn't exist,
		# so need to configure it.
		display_msg --log progress "Configuring avahi-daemon."

		sed "s/XX_HOST_NAME_XX/${NEW_HOST_NAME}/g" "${REPO_AVI_FILE}" > "${TMP_FILE}"
		sudo install -m 0644 "${TMP_FILE}" "${FINAL_AVI_FILE}" && rm -f "${TMP_FILE}"
	fi

	STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")
}


####
# Set permissions on various files.
# Do every time - doesn't hurt to re-do them.
set_permissions()
{
	display_msg --log progress "Setting permissions on various files."

	# Make sure the currently running user is in the right groups.
	# "sudo" allows them to run sudo on anything.
	# "${ALLSKY_WEBSERVER_GROUP}" allows the web server to write files to Allsky directories.
	# "video" allows the user to access video devices
	local G="$( id "${ALLSKY_OWNER}" )"
	for g in "sudo" "${ALLSKY_WEBSERVER_GROUP}" "video"
	do
		#shellcheck disable=SC2076
		if ! [[ ${G} =~ "(${g})" ]]; then
			display_msg --log progress "Adding ${ALLSKY_OWNER} to ${g} group."
			sudo adduser --quiet "${ALLSKY_OWNER}" "${g}"
		fi
	done

	# These directories aren't in GitHub so need to be manually created.
	mkdir -p \
		"${ALLSKY_EXTRA}" \
		"${ALLSKY_MYFILES_DIR}"

	# The web server needs to create and update many of the files in ${ALLSKY_CONFIG}.
	# Not all, but go ahead and chgrp all of them so we don't miss any new ones.
	sudo find "${ALLSKY_CONFIG}/" -type f -exec chmod 664 '{}' \;
	sudo find "${ALLSKY_CONFIG}/" -type d -exec chmod 775 '{}' \;
	sudo chgrp -R "${ALLSKY_WEBSERVER_GROUP}" "${ALLSKY_CONFIG}"

	# Modules and overlays
	sudo mkdir -p "${ALLSKY_MODULE_LOCATION}/modules"
	sudo chgrp -R "${ALLSKY_WEBSERVER_GROUP}" "${ALLSKY_MODULE_LOCATION}"
	sudo chmod -R 775 "${ALLSKY_MODULE_LOCATION}"

	# The files should already be the correct permissions/owners, but just in case, set them.
	# We don't know what permissions may have been on the old website, so use "sudo".
	sudo find "${ALLSKY_WEBUI}/" -type f -exec chmod 644 '{}' \;
	sudo find "${ALLSKY_WEBUI}/" -type d -exec chmod 755 '{}' \;

	chmod 775 "${ALLSKY_TMP}"
	sudo chgrp "${ALLSKY_WEBSERVER_GROUP}" "${ALLSKY_TMP}"

	[[ ! -d ${ALLSKY_CURRENT_DIR} ]] && mkdir -p "${ALLSKY_CURRENT_DIR}"
	chmod 775 "${ALLSKY_CURRENT_DIR}"
	sudo chgrp "${ALLSKY_WEBSERVER_GROUP}" "${ALLSKY_CURRENT_DIR}"


	########## Website files

	chmod 664 "${ALLSKY_ENV}"
	sudo chgrp "${ALLSKY_WEBSERVER_GROUP}" "${ALLSKY_ENV}"

	# These directories aren't in GitHub so need to be manually created.
	mkdir -p \
		"${ALLSKY_WEBSITE}/videos/thumbnails" \
		"${ALLSKY_WEBSITE}/keograms/thumbnails" \
		"${ALLSKY_WEBSITE}/startrails/thumbnails" \
		"${ALLSKY_WEBSITE}/meteors/thumbnails"

	# Not everything in the Website needs to be writable by the web server,
	# but make them all that way so we don't worry about missing something.
	sudo find "${ALLSKY_WEBSITE}" -type d -exec chmod 775 '{}' \;
	sudo find "${ALLSKY_WEBSITE}" -type f -exec chmod 664 '{}' \;
	sudo chgrp --recursive "${ALLSKY_WEBSERVER_GROUP}" "${ALLSKY_WEBSITE}"

	# Get the session handler type from the php ini file
	SESSION_HANDLER="$( get_php_setting "session.save_handler" )"
	# We need to make changes if the handler is using the filesystem
	if [[ ${SESSION_HANDLER} == "files" ]]; then
		# Get the path to the php sessions
		SESSION_PATH="$( get_php_setting "session.save_path" )"

		# Loop over all files in the session folder and if any are not owned by the
		# web server user then changs ALL of the php sessions to be owned by the
		# web server user.
		sudo find "${SESSION_PATH}" -type f -print0 | while read -r -d $'\0' SESSION_FILE
		do
			OWNER="$( sudo stat -c '%U' "${SESSION_FILE}" )"
			if [[ ${OWNER} != "${ALLSKY_WEBSERVER_OWNER}" ]]; then
				display_msg --log info "Found php sessions with wrong owner - fixing them"
				sudo chown -R "${ALLSKY_WEBSERVER_OWNER}":"${ALLSKY_WEBSERVER_OWNER}" "${SESSION_PATH}"
				break        
			fi
		done
	fi

	# Ensure the support folder has the correct owner and group
	[[ ! -d ${ALLSKY_SUPPORT_DIR} ]] && mkdir -p "${ALLSKY_SUPPORT_DIR}"
	sudo chown "${ALLSKY_OWNER}":"${ALLSKY_WEBSERVER_GROUP}" "${ALLSKY_SUPPORT_DIR}"
	sudo chmod 775 "${ALLSKY_SUPPORT_DIR}"
}


####
# Check if there's a WebUI in the old-style location,
# or if the directory exists but there doesn't appear to be a WebUI in it.
# The installation (sometimes?) creates the directory.

OLD_WEBUI_LOCATION_EXISTS_AT_START="false"
does_old_WebUI_location_exist()
{
	declare -n v="${FUNCNAME[0]}"; [[ ${v} == "true" ]] && return

	[[ -d ${OLD_WEBUI_LOCATION} ]] && OLD_WEBUI_LOCATION_EXISTS_AT_START="true"

	STATUS_VARIABLES+=("OLD_WEBUI_LOCATION_EXISTS_AT_START='${OLD_WEBUI_LOCATION_EXISTS_AT_START}'\n")
	STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")
}

# If the old WebUI location is there but it wasn't when the installation started,
# that means the installation created it so remove it.
# Let the user know if there's an old WebUI, or something unknown there.
check_old_WebUI_location()
{
	declare -n v="${FUNCNAME[0]}"; [[ ${v} == "true" ]] && return

	[[ ! -d ${OLD_WEBUI_LOCATION} ]] && return

	if [[ ${OLD_WEBUI_LOCATION_EXISTS_AT_START} == "false" ]]; then
		# Installation created the directory so get rid of it.
		sudo rm -fr "${OLD_WEBUI_LOCATION}"
		return
	fi

	local MSG

	MSG="Checking old WebUI location at ${OLD_WEBUI_LOCATION}."
	display_msg --log progress "${MSG}"

	# ${OLD_WEBUI_LOCATION}.  It just says "No files yet...", so delete it.
	sudo rm -f "${OLD_WEBUI_LOCATION}/index.lighttpd.html"

	# The installation of the web server often creates a file in
	if [[ ! -d ${OLD_WEBUI_LOCATION}/includes ]]; then
		local COUNT=$( find "${OLD_WEBUI_LOCATION}" | wc -l )
		if [[ ${COUNT} -eq 1 ]]; then
			# This is often true after a clean install of the OS.
			sudo rmdir "${OLD_WEBUI_LOCATION}"
			display_msg --logonly info "Deleted empty '${OLD_WEBUI_LOCATION}'."
		else
			MSG="The old WebUI location '${OLD_WEBUI_LOCATION}' exists"
			MSG+=" but doesn't contain a valid WebUI."
			MSG+="\nPlease check it out after installation - if there's nothing you"
			MSG+=" want in it, remove it:  sudo rm -fr '${OLD_WEBUI_LOCATION}'"
			whiptail --title "${TITLE}" --msgbox "${MSG}" 15 "${WT_WIDTH}"   3>&1 1>&2 2>&3
			display_msg --log notice "${MSG}"

			add_to_post_actions "${MSG}"
		fi
		return
	fi

	MSG="An old version of the WebUI was found in ${OLD_WEBUI_LOCATION};"
	MSG+=" it is no longer being used so you may remove it after intallation."
	MSG+="\n\nWARNING: if you have any other web sites in that directory,"
	MSG+="\n\n they will no longer be accessible via the web server."
	whiptail --title "${TITLE}" --msgbox "${MSG}" 15 "${WT_WIDTH}"   3>&1 1>&2 2>&3
	display_msg --log notice "${MSG}"
	add_to_post_actions "${MSG}"

	STATUS_VARIABLES+=( "${FUNCNAME[0]}='true'\n" )
}


####
# Get the locale, prompting if we can't determine it.
# A lot of people have the incorrect locale so prompt for the correct one.
DESIRED_LOCALE=""
CURRENT_LOCALE=""
get_desired_locale()
{
	declare -n v="${FUNCNAME[0]}"; [[ ${v} == "true" ]] && return

	local MSG  MSG2  X  TEMP_LOCALE  D

	# Get the list of all installed locales.
	get_installed_locales		# Sets global ${INSTALLED_LOCALES}
	if [[ -z ${INSTALLED_LOCALES} ]]; then
		MSG="There are no locales on your system ('locale -a' didn't return valid locales)."
		MSG+="\nYou need to install and set one before Allsky installation can run."
		MSG+="\nTo install locales, run:"
		MSG+="\n\tsudo raspi-config"
		MSG+="\n\t\tPick 'Localisation Options'"
		MSG+="\n\t\tPick 'Locale'"
		MSG+="\n\t\tScroll down to the locale(s) you want to install, then press the SPACE key."
		MSG+="\n\t\tWhen done, press the TAB key to select <Ok>, then press ENTER."
		MSG+="\n\nIt will take a moment for the locale(s) to be installed."
		MSG+="\n\nWhen that is completed, rerun the Allsky installation."
		display_msg --log error "${MSG}"

		exit_installation 1 "${STATUS_NO_LOCALE}" "None on system."
	fi

	[[ ${DEBUG} -gt 1 ]] && display_msg --logonly debug "INSTALLED_LOCALES=${INSTALLED_LOCALES}"

	# If the prior version of Allsky had a locale set but it's no longer installed,
	# let the user know.
	# This can happen if they use the settings file from a different Pi or different OS.
	MSG2=""
	if [[ -z ${DESIRED_LOCALE} && ${USE_PRIOR_ALLSKY} == "true" && -n ${PRIOR_SETTINGS_FILE} ]]; then
		# People rarely change locale once set, so assume they still want the prior one.
		DESIRED_LOCALE="$( settings ".locale" "${PRIOR_SETTINGS_FILE}" )"
		if [[ -n ${DESIRED_LOCALE} ]]; then
			if ! is_installed_locale "${DESIRED_LOCALE}"; then
				# This is probably EXTREMELY rare.
				MSG2="NOTE: Your prior locale (${DESIRED_LOCALE}) is no longer installed on this Pi."
			fi
		fi
	fi

	# Get current locale to use as the default.
	# Ignore any line that doesn't have a value, and get rid of double quotes.
	TEMP_LOCALE="$( locale | grep -E "^LANG=|^LANGUAGE=|^LC_ALL=" | sed -e '/=$/d' -e 's/"//g' )"

	CURRENT_LOCALE="$( 
		eval "$( locale | grep -E "^LANG=|^LANGUAGE=|^LC_ALL=" | sed -e '/=$/d' -e 's/"//g' )"
		[[ -n ${LANG} ]] && echo "${LANG}" && return
		[[ -n ${LANGUAGE} ]] && echo "${LANGUAGE}" && return
		echo "${LC_ALL}"
	)"

	MSG="CURRENT_LOCALE=${CURRENT_LOCALE}, TEMP_LOCALE=[[$( echo "${TEMP_LOCALE}" | tr '\n' ' ' )]]"
	display_msg --logonly info "${MSG}"

	D=""
	if [[ -n ${CURRENT_LOCALE} ]]; then
		D="--default-item ${CURRENT_LOCALE}"
	else
		CURRENT_LOCALE=""
	fi
	STATUS_VARIABLES+=("CURRENT_LOCALE='${CURRENT_LOCALE}'\n")

	# If they had a locale from the prior Allsky and it's still here, use it; no need to prompt.
	if [[ -n ${DESIRED_LOCALE} && ${DESIRED_LOCALE} == "${CURRENT_LOCALE}" ]]; then
		STATUS_VARIABLES+=("DESIRED_LOCALE='${DESIRED_LOCALE}'\n")
		STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")
		return
	fi

	MSG="\nSelect your locale; the default is highlighted in red."
	MSG+="\nIf your desired locale is not in the list, press <Cancel>."
	MSG+="\n\nIf you change the locale, the system will reboot and"
	MSG+="\nyou will need to continue the installation."
	[[ -n ${MSG2} ]] && MSG+="\n\n${MSG2}"

	# This puts in IL the necessary strings to have whiptail display what looks like
	# a single column of selections.  Could also use "--noitem" if we passed in a non-null
	# item as the second argument.
	local IL=()
	for i in ${INSTALLED_LOCALES}
	do
		IL+=("${i}" "")
	done

	#shellcheck disable=SC2086
	DESIRED_LOCALE=$( whiptail --title "${TITLE}" ${D} --menu "${MSG}" 25 "${WT_WIDTH}" 4 "${IL[@]}" \
		3>&1 1>&2 2>&3 )
	if [[ -z ${DESIRED_LOCALE} ]]; then
		MSG="You need to set the locale before the installation can run."
		MSG+="\n  If your desired locale was not in the list,"
		MSG+="\n   run 'sudo raspi-config' to update the list, then rerun the installation."
		display_msg info "${MSG}"
		display_msg --logonly info "No locale selected; exiting."

		exit_installation 0 "${STATUS_NOT_CONTINUE}" "Locale(s) available but none selected."

	elif echo "${DESIRED_LOCALE}" | grep --silent "Box options" ; then
		# Got a usage message from whiptail.  This happened once so I added this check.
		# Must be no space between the last double quote and ${INSTALLED_LOCALES}.
		#shellcheck disable=SC2086
		MSG="Got usage message from whiptail: D='${D}', INSTALLED_LOCALES="${INSTALLED_LOCALES}
		MSG+="\n  Fix the problem and try the installation again."
		display_msg --log error "${MSG}"
		exit_installation 1 "${STATUS_ERROR}" "Got usage message from whitail."
	fi

	STATUS_VARIABLES+=("DESIRED_LOCALE='${DESIRED_LOCALE}'\n")
	STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")
}


####
# Set the locale
set_locale()
{
	declare -n v="${FUNCNAME[0]}"; [[ ${v} == "true" ]] && return

	local L

	# ${DESIRED_LOCALE} and ${CURRENT_LOCALE} are already set

	if [[ ${CURRENT_LOCALE} == "${DESIRED_LOCALE}" ]]; then
		display_msg --logonly info "Keeping '${DESIRED_LOCALE}' locale."
		L="$( settings --null ".locale" )"
		MSG="Settings file '${ALLSKY_SETTINGS_FILE}'"
		if [[ -z ${L} || ${L} == "null" ]]; then
			# Either a new install or an upgrade from an older Allsky.
			if [[ -z ${L} ]]; then
				MSG+=" did NOT contain .locale"
			else
				MSG+=" had null .locale"
			fi
			MSG+=" so adding it."
			display_msg --logonly info "${MSG}"
			doV "" "DESIRED_LOCALE" "locale" "text" "${ALLSKY_SETTINGS_FILE}"
		else
			MSG+=" CONTAINED .locale:  ${L}"
			display_msg --logonly info "${MSG}"
		fi
		STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")
		return
	fi

	display_msg --log progress "Setting locale to '${DESIRED_LOCALE}'."
	doV "" "DESIRED_LOCALE" "locale" "text" "${ALLSKY_SETTINGS_FILE}"

	# This updates /etc/default/locale
	sudo update-locale LC_ALL="${DESIRED_LOCALE}" LANGUAGE="${DESIRED_LOCALE}" LANG="${DESIRED_LOCALE}"

	if ask_reboot "locale" ; then
		display_msg --logonly info "Rebooting to set locale to '${DESIRED_LOCALE}'"
		do_reboot "${STATUS_LOCALE_REBOOT}" ""		# does not return
	fi

	display_msg warning "You must reboot to set the locale before continuing with the installation."
	display_msg --logonly info "User elected not to reboot to update locale."

	exit_installation 0 "${STATUS_NO_REBOOT}" "to update locale."
}


####
# See what steps, if any, can be skipped.
set_what_can_be_skipped()
{
	[[ ${USE_PRIOR_ALLSKY} == "false" ]] && return

	local OLD_VERSION="${1}"
	local NEW_VERSION="${2}"
	[[ ${NEW_VERSION} != "${OLD_VERSION}" ]] && return

	local MSG

	# No changes to these packages so no need to reinstall.
	MSG="Skipping installation of: webserver et.al."
	MSG+=", PHP modules"
	MSG+=", Truetype fonts"
	MSG+=", Python"
	display_msg --logonly info "${MSG}"
	# shellcheck disable=SC2034
	install_webserver_et_al="true"
	# shellcheck disable=SC2034
	install_fonts="true"
	# shellcheck disable=SC2034
	install_PHP_modules="true"

	# need to always run install_Python() so it can set up venv
}


####
# Do we need to reboot?
# Use the prior version's info, even if we won't use its settings.
is_reboot_needed()
{
	local OLD_VERSION="${1}"
	local OLD_BASE_VERSION="$( remove_point_release "${OLD_VERSION}" )"
	local NEW_VERSION="${2}"
	local NEW_BASE_VERSION="$( remove_point_release "${NEW_VERSION}" )"

	if [[ ${NEW_BASE_VERSION} == "${OLD_BASE_VERSION}" ||
		  ${OLD_BASE_VERSION} == "${NO_REBOOT_BASE_VERSION}" ]]; then
		# Assume just bug fixes between point releases.
# TODO: this is not always true.
		REBOOT_NEEDED="false"
		display_msg --logonly info "No reboot is needed."
	else
		REBOOT_NEEDED="true"
		display_msg --log progress "A reboot is needed after installation finishes."
	fi
}


####
# See if a prior Allsky Website exists; if so, set some variables.
# First look in the prior Allsky directory, if it exists.
# If not, look in the old Website location.
PRIOR_WEBSITE_STYLE=""

# Versions of the Website configuration files: 1, 2, etc.
NEW_WEB_CONFIG_VERSION=""
PRIOR_WEB_CONFIG_VERSION=""

# Run every time in case the Website was removed after first run.
does_prior_Allsky_Website_exist()
{
	local PRIOR_STYLE="${1}"

	local MSG

# TODO: The Website moved to ~/allsky/html/allsky in v2023.05.01
# In v2025.xx.xx if that directory doesn't exist, no prior Website exists.
	if [[ ${PRIOR_STYLE} == "${NEW_STYLE_ALLSKY}" ]]; then
		if [[ -d ${PRIOR_WEBSITE_DIR} ]]; then
			PRIOR_WEBSITE_STYLE="${NEW_STYLE_ALLSKY}"
			if [[ -s ${PRIOR_WEBSITE_CONFIG_FILE} ]]; then
				PRIOR_WEB_CONFIG_VERSION="$( settings ".${WEBSITE_CONFIG_VERSION}" "${PRIOR_WEBSITE_CONFIG_FILE}" )"
				if [[ -z ${PRIOR_WEB_CONFIG_VERSION} ]]; then
					# This shouldn't happen ...
					MSG="Missing ${WEBSITE_CONFIG_VERSION} in ${PRIOR_WEBSITE_CONFIG_FILE}."
					MSG+="\nYou need to manually copy your prior local Allsky Website settings to"
					MSG+="\n${ALLSKY_WEBSITE_CONFIGURATION_FILE}."
					display_msg --log error "${MSG}"
					PRIOR_WEB_CONFIG_VERSION="1"		# Assume the oldest version
				fi
			else
				# No config file - they user probably never used the local Website
				PRIOR_WEB_CONFIG_VERSION="1"		# Assume the oldest version
				MSG="Prior Website config file '${PRIOR_WEBSITE_CONFIG_FILE}' not found."
				display_msg --logonly info "${MSG}"
			fi
		else
			PRIOR_WEBSITE_DIR=""
		fi
	else
		# Either old style, or didn't find a prior Allsky.
		# Either way, look in the old location.
		PRIOR_WEBSITE_DIR="${PRIOR_WEBSITE_LOCATION}"
		if [[ -d ${PRIOR_WEBSITE_DIR} ]]; then
			PRIOR_WEBSITE_STYLE="${OLD_STYLE_ALLSKY}"
			# old style websites don't have ${WEBSITE_CONFIG_VERSION}.
		else
			PRIOR_WEBSITE_DIR=""
		fi
	fi

	if [[ -z ${PRIOR_WEBSITE_DIR} ]]; then
		display_msg --logonly info "No prior local Allsky Website found."
	else
		display_msg --logonly info "PRIOR_WEBSITE_STYLE=${PRIOR_WEBSITE_STYLE}"
		display_msg --logonly info "PRIOR_WEBSITE_DIR=${PRIOR_WEBSITE_DIR}"
		# New Website configuration file may not exist yet so use repo version.
		NEW_WEB_CONFIG_VERSION="$( settings ".${WEBSITE_CONFIG_VERSION}" "${REPO_WEBCONFIG_FILE}" )"
		display_msg --logonly info "NEW_WEB_CONFIG_VERSION=${NEW_WEB_CONFIG_VERSION}"
		display_msg --logonly info "PRIOR_WEB_CONFIG_VERSION=${PRIOR_WEB_CONFIG_VERSION}"
	fi
}

####
# See if a prior Allsky exists; if so, set some variables.
does_prior_Allsky_exist()
{
	local MSG  DIR  CAPTURE  STRING

	# ${ALLSKY_PRIOR_DIR} points to where the prior Allsky would be.
	# Make sure it's there and is valid.

	MSG="Prior Allsky directory found at '${ALLSKY_PRIOR_DIR}'"
	# If a prior config directory doesn't exist then there's no prior Allsky,
	if [[ ! -d ${PRIOR_CONFIG_DIR} ]]; then
		if [[ -d ${ALLSKY_PRIOR_DIR} ]]; then
			MSG+=" but it doesn't appear to have been installed."
			display_msg --logonly info "${MSG}"
			MSG+="\n\nDo you want to continue and ignore that directory"
			MSG+=" (note that you'll need to re-enter all your settings)?"
			if ! whiptail --title "${TITLE}" --yesno "${MSG}" 20 "${WT_WIDTH}"  3>&1 1>&2 2>&3; then
				MSG="Check the contents of '${ALLSKY_PRIOR_DIR}' and delete it as needed,"
				MSG+=" then run the installation again."
				display_msg info "${MSG}"
				display_msg --logonly info "User elected not to continue.  Exiting installation."
				exit_installation 0 "${STATUS_NOT_CONTINUE}" "after no prior valid Allsky was found."
			fi
		else
			display_msg --logonly info "No prior Allsky found at '${ALLSKY_PRIOR_DIR}'."
		fi
		does_prior_Allsky_Website_exist ""
		USE_PRIOR_ALLSKY="false"
		return 1
	fi

# TODO: Remove this check when only looking back 2 major releases.
	# All versions back to v0.6 (never checked prior ones) have a "scripts" directory.
	if [[ ! -d "${ALLSKY_PRIOR_DIR}/scripts" ]]; then
		MSG+=" but it doesn't appear to be valid or it too old; ignoring it."
		display_msg --log warning "${MSG}"
		does_prior_Allsky_Website_exist ""
		USE_PRIOR_ALLSKY="false"
		return 1
	fi

	display_msg --logonly info "Prior Allsky found at '${ALLSKY_PRIOR_DIR}'."
	USE_PRIOR_ALLSKY="true"		# may be set to false after user is prompted to use it

	# Determine the prior Allsky version and set some PRIOR_* locations.
	PRIOR_ALLSKY_VERSION="$( get_version "${ALLSKY_PRIOR_DIR}/" )"	# Returns "" if no version file.
	if [[ -n ${PRIOR_ALLSKY_VERSION} && (! ${PRIOR_ALLSKY_VERSION} < "${FIRST_CAMERA_TYPE_BASE_VERSION}") ]]; then
		PRIOR_ALLSKY_STYLE="${NEW_STYLE_ALLSKY}"
		if [[ ${RESTORE} == "true" ]]; then
			does_prior_Allsky_Website_exist "${PRIOR_ALLSKY_STYLE}"
			return 0
		fi

		# PRIOR_SETTINGS_FILE should be a link to a camera-specific settings file
		# and that file will have the camera type and model.
		PRIOR_SETTINGS_FILE="${PRIOR_CONFIG_DIR}/${SETTINGS_FILE_NAME}"
		if [[ -f ${PRIOR_SETTINGS_FILE} ]]; then
			# Look for newer, lowercase setting names starting in v2024.12.06.
			PRIOR_CAMERA_TYPE="$( settings ".cameratype" "${PRIOR_SETTINGS_FILE}" )"
			if [[ -n ${PRIOR_CAMERA_TYPE} ]]; then
				PRIOR_CAMERA_MODEL="$( settings ".cameramodel" "${PRIOR_SETTINGS_FILE}" )"
				PRIOR_CAMERA_NUMBER="$( settings ".cameranumber" "${PRIOR_SETTINGS_FILE}" )"
			else
				PRIOR_CAMERA_TYPE="$( settings ".cameraType" "${PRIOR_SETTINGS_FILE}" )"
				PRIOR_CAMERA_MODEL="$( settings ".cameraModel" "${PRIOR_SETTINGS_FILE}" )"
				PRIOR_CAMERA_NUMBER="$( settings ".cameraNumber" "${PRIOR_SETTINGS_FILE}" )"
			fi
		else
			# This shouldn't happen...
			PRIOR_SETTINGS_FILE=""
			MSG="No prior new style settings file (${PRIOR_SETTINGS_FILE}) found!"
			display_msg --log warning "${MSG}"
		fi

		# Check for prior ALLSKY_USER_VARIABLES file.
		local PRIOR_ALLSKY_USER_VARIABLES="${ALLSKY_USER_VARIABLES/${ALLSKY_HOME}/${ALLSKY_PRIOR_DIR}}"
		if [[ -s ${PRIOR_ALLSKY_USER_VARIABLES} ]]; then
			display_msg --logonly info "User has ${PRIOR_ALLSKY_USER_VARIABLES}"
			# Check if ALLSKY_IMAGES was changed.
			local X="$(
				# shellcheck disable=SC1090,SC1091
				source "${PRIOR_ALLSKY_USER_VARIABLES}"
				[[ ${ALLSKY_IMAGES} != "${ALLSKY_IMAGES_ORIGINAL}" ]] && echo "${ALLSKY_IMAGES}"
			)"
			if [[ -n ${X} ]]; then
				ALLSKY_IMAGES="${X}"
				ALLSKY_IMAGES_MOVED="true"
				display_msg --logonly info "ALLSKY_IMAGES updated to '${ALLSKY_IMAGES}'"
			fi
		fi

# TODO: Remove "else" block check when only looking back 2 major releases.
	else		# pre-${FIRST_VERSION_VERSION}
		# V0.6, v0.7, and v0.8:
		#	"allsky" directory contained capture.cpp, config.sh.
		#	"scripts" directory had ftp-settings.sh.
		#	No "src" directory.
			# NOTE: v0.6's capture.cpp said v0.5.
		# V0.8.1 added "scr" and "config" directories and "variables.sh" file.

		local CAMERA="$( get_variable "CAMERA" "${PRIOR_CONFIG_FILE}" )"
		PRIOR_CAMERA_TYPE="$( CAMERA_to_CAMERA_TYPE "${CAMERA}" )"

		PRIOR_ALLSKY_STYLE="${OLD_STYLE_ALLSKY}"
		if [[ ${RESTORE} == "true" ]]; then
			does_prior_Allsky_Website_exist "${PRIOR_ALLSKY_STYLE}"
			return 0
		fi

		if [[ -z ${PRIOR_ALLSKY_VERSION} ]]; then
			# No version file so try to determine version via .cpp file.
			# sample:    printf("%s *** Allsky Camera Software v0.8.3 | 2021 ***\n", c(KGRN));
			DIR="${ALLSKY_PRIOR_DIR}/src"
			if [[ ! -d "${DIR}" ]]; then
				# Really old versions had source in the top directory.
				DIR="${ALLSKY_PRIOR_DIR}"
			fi
			CAPTURE="${DIR}/capture_${PRIOR_CAMERA_TYPE}.cpp"
			if [[ ! -f ${CAPTURE} ]]; then
				MSG="${CAPTURE} not found; "
				CAPTURE="${DIR}/capture.cpp"	# old name for ZWO
				MSG+=" using ${CAPTURE} instead"
				display_msg --logonly "info" "${MSG}"
			fi

			MSG2="\nWill NOT use your prior Allsky;"
			MSG2+=" you will need to copy files and setting manually."
			if [[ ! -f ${CAPTURE} ]]; then
				MSG="Cannot find prior 'capture*.cpp' program in '${DIR}'".
				display_msg --log "warning" "${MSG}${MSG2}"
				USE_PRIOR_ALLSKY="false"
				return 1
			fi
			STRING="Camera Software"
			if ! PRIOR_ALLSKY_VERSION="$( grep "Camera Software" "${CAPTURE}" |
					gawk '{print $6}' )" ; then
				MSG="Unable to determine version of prior Allsky: '${STRING}' not in '${CAPTURE}'."
				display_msg --log "warning" "${MSG}${MSG2}"
				USE_PRIOR_ALLSKY="false"
				return 1
			fi
		fi
		PRIOR_ALLSKY_VERSION="${PRIOR_ALLSKY_VERSION:-${PRE_FIRST_VERSION_VERSION}}"
		# PRIOR_CAMERA_MODEL wasn't stored anywhere so can't set it.
		PRIOR_SETTINGS_FILE="${OLD_RASPAP_DIR}/settings_${CAMERA}.json"
		[[ ! -f ${PRIOR_SETTINGS_FILE} ]] && PRIOR_SETTINGS_FILE=""
	fi

	if [[ ${PRIOR_ALLSKY_VERSION} != "${PRE_FIRST_VERSION_VERSION}" ]]; then
		PRIOR_ALLSKY_BASE_VERSION="$( remove_point_release "${PRIOR_ALLSKY_VERSION}" )"
	fi

	display_msg --logonly info "PRIOR_ALLSKY_VERSION=${PRIOR_ALLSKY_VERSION}"
	MSG="PRIOR_CAMERA_TYPE=${PRIOR_CAMERA_TYPE}, PRIOR_CAMERA_MODEL=${PRIOR_CAMERA_MODEL:-unknown}"
	display_msg --logonly info "${MSG}"
	display_msg --logonly info "PRIOR_SETTINGS_FILE=${PRIOR_SETTINGS_FILE}"

	does_prior_Allsky_Website_exist "${PRIOR_ALLSKY_STYLE}"

	return 0
}


####
# If there's a prior version of the software,
# ask the user if they want to move stuff from there to the new directory.

WILL_USE_PRIOR="true"

prompt_for_prior_Allsky()
{
	declare -n v="${FUNCNAME[0]}"; [[ ${v} == "true" ]] && return

	if [[ ${WILL_USE_PRIOR} == "true" ]]; then
		local MSG  M

		if [[ ${USE_PRIOR_ALLSKY} == "true" ]]; then
			MSG="You have a prior version of Allsky in ${ALLSKY_PRIOR_DIR}."
			if [[ ${ALLSKY_IMAGES_MOVED} == "true" ]]; then
				M=""
			else
				M=" images and other "
			fi
			MSG+="\n\nDo you want to restore the prior ${M}files you've changed?"
			if [[ ${PRIOR_ALLSKY_STYLE} == "${NEW_STYLE_ALLSKY}" ]]; then
				MSG+="\nIf so, your prior settings will be restored as well."
			else
				MSG+="\nIf so, we will attempt to use its settings as well, but may not be"
				MSG+="\nable to use ALL prior settings depending on how old your prior Allsky is."
				MSG+="\nIn that case, you'll be prompted for required information such as"
				MSG+="\nthe camera's latitude, logitude, and locale."
			fi

			if whiptail --title "${TITLE}" --yesno "${MSG}" 20 "${WT_WIDTH}"  3>&1 1>&2 2>&3; then
				# Set the prior camera type to the new, default camera type.
				CAMERA_TYPE="${PRIOR_CAMERA_TYPE}"
				CAMERA_MODEL="${PRIOR_CAMERA_MODEL}"
				CAMERA_NUMBER="${PRIOR_CAMERA_NUMBER}"
				STATUS_VARIABLES+=("CAMERA_TYPE='${CAMERA_TYPE}'\n")
				STATUS_VARIABLES+=("CAMERA_MODEL='${CAMERA_MODEL}'\n")
				STATUS_VARIABLES+=("CAMERA_NUMBER='${CAMERA_NUMBER}'\n")
				display_msg --logonly info "Will restore from prior version of Allsky."
			else
				USE_PRIOR_ALLSKY="false"
				PRIOR_SETTINGS_FILE=""
				CAMERA_TYPE=""
				PRIOR_CAMERA_TYPE=""
				PRIOR_CAMERA_MODEL=""
				PRIOR_CAMERA_NUMBER=""
				display_msg --logonly info "Will NOT restore from prior version of Allsky."
				if [[ ${ALLSKY_IMAGES_MOVED} == "true" ]]; then
					M=""
				else
					M="images, "
				fi
				MSG="If you want your old ${M}darks, settings, etc. from the prior version"
				MSG+=" of Allsky, you'll need to manually move them to the new version."
				display_msg info "${MSG}"
				WILL_USE_PRIOR="false"
			fi
		else
			MSG="No prior version of Allsky found."
			MSG+="\n\nIf you DO have a prior version and you want images, darks,"
			MSG+=" and certain settings moved from the prior version to the new one,"
			MSG+=" rename the prior version to ${ALLSKY_PRIOR_DIR} before running this installation."
			MSG+="\n\nDo you want to continue?"
			if ! whiptail --title "${TITLE}" --yesno "${MSG}" 15 "${WT_WIDTH}" 3>&1 1>&2 2>&3; then
				MSG="Rename the directory with your prior version of Allsky to"
				MSG+="\n '${ALLSKY_PRIOR_DIR}', then run the installation again."
				display_msg info "${MSG}"
				display_msg --logonly info "User elected not to continue.  Exiting installation."
				exit_installation 0 "${STATUS_NOT_CONTINUE}" "after no prior Allsky was found."
			fi
			WILL_USE_PRIOR="false"
		fi
	fi

	if [[ ${WILL_USE_PRIOR} == "false" ]]; then
		# No prior Allsky (or the user doesn't want to use it),
		# so force creating a default settings file.
		FORCE_CREATING_DEFAULT_SETTINGS_FILE="true"
		STATUS_VARIABLES+=("FORCE_CREATING_DEFAULT_SETTINGS_FILE='true'\n")
		STATUS_VARIABLES+=("USE_PRIOR_ALLSKY='${USE_PRIOR_ALLSKY}'\n")
	fi

	STATUS_VARIABLES+=("WILL_USE_PRIOR='${WILL_USE_PRIOR}'\n")
	STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")
}


####
# Make separate function so it can be called from command line for testing.
update_allsky_common()
{
	# Set some default locations needed by the capture programs so we
	# don't need to pass them in on the command line - if they are passed in,
	# those values overwrite the defaults.
	sed \
		-e "s;XX_ALLSKY_HOME_XX;${ALLSKY_HOME};" \
		-e "s;XX_ALLSKY_SCRIPTS_XX;${ALLSKY_SCRIPTS};" \
		-e "s;XX_CONNECTED_CAMERAS_FILE_XX;${ALLSKY_CONNECTED_CAMERAS_INFO};" \
		-e "s;XX_RPI_CAMERA_INFO_FILE_XX;${ALLSKY_RPi_SUPPORTED_CAMERAS};" \
		-e "s;XX_EXIT_OK_XX;${EXIT_OK};" \
		-e "s;XX_EXIT_RESTARTING_XX;${EXIT_RESTARTING};" \
		-e "s;XX_EXIT_RESET_USB_XX;${EXIT_RESET_USB};" \
		-e "s;XX_EXIT_ERROR_STOP_XX;${EXIT_ERROR_STOP};" \
		-e "s;XX_EXIT_NO_CAMERA_XX;${EXIT_NO_CAMERA};" \
		"${ALLSKY_HOME}/src/include/allsky_common.h.repo" \
	> "${ALLSKY_HOME}/src/include/allsky_common.h"
}

####
install_dependencies_etc()
{
	declare -n v="${FUNCNAME[0]}"; [[ ${v} == "true" ]] && return
	[[ ${SKIP} == "true" ]] && return

	# These commands produce a TON of output that's not needed unless there's a problem.
	# They also take a little while, so hide the output and let the user know.

	display_msg --log progress "Installing dependencies."

	local T="${ALLSKY_SCRIPTS}/allsky-config"
	if [[ ! -f "${T}" ]]; then
		local F="${ALLSKY_UTILITIES}/allsky-config.sh"
		display_msg --logonly info "Creating link to ${F}"
		ln -s "${F}" "${T}"		|| echo "Unable to ln -s '${F}' '${T}'" >&2
	fi

	local T="${ALLSKY_SCRIPTS}/functions.php"
	if [[ ! -f "${T}" ]]; then
		local F="${ALLSKY_WEBUI}/includes/functions.php"
		display_msg --logonly info "Creating link to ${F}"
		ln -s "${F}" "${T}"		|| echo "Unable to ln -s '${F}' '${T}'" >&2
	fi

	TMP="${ALLSKY_LOGS}/allsky_dependencies.log"
	run_aptGet ffmpeg lftp imagemagick sqlite3 bc > "${TMP}" 2>&1
	check_success $? "Allsky dependency installation failed" "${TMP}" "${DEBUG}" ||
		exit_with_image 1 "${STATUS_ERROR}" "dependency installation failed"

	update_allsky_common

	# "make -C src deps" may need to install some packages, so needs "sudo".
	display_msg --log progress "Creating Allsky commands."
	TMP="${ALLSKY_LOGS}/make_all.log"
	{
		echo "===== make deps"
		sudo make -C src deps && echo -e "\n\n===== make all" && make -C src all
	} > "${TMP}" 2>&1
	check_success $? "Compile failed" "${TMP}" "${DEBUG}" ||
		exit_with_image 1 "${STATUS_ERROR}" "compile failed"

	TMP="${ALLSKY_LOGS}/make_install.log"
	sudo make install > "${TMP}" 2>&1
	check_success $? "make install failed" "${TMP}" "${DEBUG}" ||
		exit_with_image 1 "${STATUS_ERROR}" "make install failed"

	STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")
}


####
# Create the log file and make it readable/writable by the user; this aids in debugging.
# Re-run every time in case permissions changed.
create_allsky_logs()
{
	local DO_ALL="${1}"

	display_msg --logonly progress "Setting permissions on ${ALLSKY_LOG} and ${ALLSKY_PERIODIC_LOG}."

	if [[ ${DO_ALL} == "true" ]]; then
		sudo systemctl stop rsyslog 2> /dev/null

		TMP="${ALLSKY_LOGS}/rsyslog.log"
		run_aptGet rsyslog > "${TMP}" 2>&1
		check_success $? "rsyslog installation failed" "${TMP}" "${DEBUG}" ||
			exit_with_image 1 "${STATUS_ERROR}" "rsyslog install failed."
	fi

	sudo truncate -s 0 "${ALLSKY_LOG}" "${ALLSKY_PERIODIC_LOG}"
	sudo chmod 664 "${ALLSKY_LOG}" "${ALLSKY_PERIODIC_LOG}"
	sudo chgrp "${ALLSKY_GROUP}" "${ALLSKY_LOG}" "${ALLSKY_PERIODIC_LOG}"

	if [[ ${DO_ALL} == "true" ]]; then
		sudo systemctl start rsyslog		# so logs go to the files above
	fi
}


####
# If needed, update the new settings file based on the prior one.
# The old and new files both exist and may be the same,
# but either way, do not modify the old file.

# Can't use variables since these messages are displayed in a "while read x" loop which
# runs in a subshell.
DISPLAYED_BRIGHTNESS_MSG="/tmp/displayed_brightness_msg"
DISPLAYED_OFFSET_MSG="/tmp/displayed_offset_msg"
DISPLAYED_CHANGE_NAMES_MSG="/tmp/displayed_change_names_msg"
rm -f "${DISPLAYED_BRIGHTNESS_MSG}" "${DISPLAYED_OFFSET_MSG}" "${DISPLAYED_CHANGE_NAMES_MSG}"

convert_settings_file()			# prior_file, new_file
{
	local PRIOR_FILE="${1}"
	local NEW_FILE="${2}"
	local CALLED_FROM="${3}"

# TODO: Keep track somehow of which upgrades added, deleted, and/or changed names of
# settings so we know if the settings file needs to be updated.

	local MSG="Converting '$( basename "${PRIOR_FILE}" )' to new format if needed."
	display_msg --log progress "${MSG}"

	DIR="/tmp/converted_settings"
	mkdir -p "${DIR}"
	local TEMP_PRIOR="${DIR}/PRIOR-${PRIOR_CAMERA_TYPE}_${PRIOR_CAMERA_MODEL// /_}.json"
	local DELETED_SETTINGS="${DIR}/deleted_settings.txt"
	rm -f "${DELETED_SETTINGS}"

	# Pre-v2024.12.06 version had uppercase letters in setting names and
	# "1" and "0" for booleans and quotes around numbers. Change that.
	# Don't modify the prior file, so make the changes to a temporary file.
	# --settings-only  says only output settings that are in the settings file.
	# The ALLSKY_OPTIONS_FILE doesn't exist yet so use REPO_OPTIONS_FILE.
	"${ALLSKY_SCRIPTS}/convertJSON.php" \
			--from-install \
			--convert \
			--settings-only \
			--settings-file "${PRIOR_FILE}" \
			--options-file "${REPO_OPTIONS_FILE}" \
			--include-not-in-options \
		> "${TEMP_PRIOR}" 2>&1
	if [[ $? -ne 0 ]]; then
		MSG="Unable to convert old settings file: $( < "${TEMP_PRIOR}" )"
		display_msg --log error "${MSG}"
		exit_installation 1 "${STATUS_ERROR}" "${MSG}."
	fi

	# For each field in prior file, update new file with old value.
	# Then handle new fields and fields that changed locations or names.

	# Output the field name and value as text separated by a tab.
	# Field names are already lowercase from above.
	"${ALLSKY_SCRIPTS}/convertJSON.php" \
			--from-install \
			--delimiter "${TAB}" \
			--settings-file "${TEMP_PRIOR}" \
			--options-file "${REPO_OPTIONS_FILE}" \
			--include-not-in-options |
		while read -r FIELD VALUE
		do
			case "${FIELD}" in
				"lastchanged")
					# Update the value.
					set_now "${FIELD}" "${NEW_FILE}"
					;;

				"computer")
					# As of ${COMBINED_BASE_VERSION}, we compute the value.
					VALUE="${THIS_PI_MODEL}"
					doV "${FIELD}" "VALUE" "${FIELD}" "text" "${NEW_FILE}"
					;;

				# Don't carry this forward:
				"XX_END_XX")
					echo -e "\t${FIELD}=${VALUE}" >> "${DELETED_SETTINGS}"
					;;

				# ===== Deleted/changed in ${NO_BUSTER_BASE_VERSION}.
				"overlaymethod")
					echo "${FIELD} ${FIELD} --delete" >> "${DELETED_SETTINGS}"
					if [[ ${VALUE} -eq 0 ]]; then
						MSG="The legacy Overlay Method is no longer available."
						MSG+="\nUse the WebUI's 'Overlay Editor' instead."
						display_msg --log notice "${MSG}"
					fi
					;;
				"showtime" | "showexposure" | "showgain" | "showusb" | "showtemp" | \
				"showmean" | "showhistogrambox" | "showfocus" | "text" | "textarea" | \
				"extratext" | "extratextage" | "textlineheight" | "textx" | "texty" | "fontname" | \
				"fontcolor" | "smallfontcolor" | "fonttype" | "fontsize" | "fontline" | "outlinefont")
					echo "${FIELD} ${FIELD} --delete" >> "${DELETED_SETTINGS}"
					;;
				"extraargs")
					if ! MSG="$( _check_immediate "${VALUE}" "Extra Arguments" )" ; then
						display_msg --log notice "${MSG}"
					fi
					;;

				# ===== Deleted in ${COMBINED_BASE_VERSION}.
				"autofocus" | "background" | "alwaysshowadvanced" | "notificationimages" | \
				"newexposure" | "experimentalexposure" | "showbrightness")
					echo "${FIELD} ${FIELD} --delete" >> "${DELETED_SETTINGS}"
					;;
				"brightness" | "daybrightness" | "nightbrightness")
					echo "${FIELD} ${FIELD} --delete" >> "${DELETED_SETTINGS}"
					if [[ ! -f ${DISPLAYED_BRIGHTNESS_MSG} ]]; then
						touch "${DISPLAYED_BRIGHTNESS_MSG}"
						MSG="The 'Brightness' settings were removed. Use 'Target Mean' instead."
						display_msg --log notice "${MSG}"
					fi
					;;
				"offset")
					echo "${FIELD} ${FIELD} --delete" >> "${DELETED_SETTINGS}"
					if [[ ${VALUE} -gt 1 && ! -f ${DISPLAYED_OFFSET_MSG} ]]; then
						touch "${DISPLAYED_OFFSET_MSG}"
						# 1 is default.  > 1 means they changed it, which is rare.
						MSG="The 'Offset' setting was removed."
						MSG+="\nUse the 'Target Mean' settings to adjust brightness."
						display_msg --log notice "${MSG}"
					fi
					;;

				# ===== Deleted in ${COMBINED_BASE_VERSION}_01.
				"remotewebsitevideodestinationname" | \
				"remotewebsitekeogramdestinationname" | \
				"remotewebsitestartrailsdestinationname")
					echo "${FIELD} ${FIELD} --delete" >> "${DELETED_SETTINGS}"
					if [[ -n ${VALUE} && ! -f ${DISPLAYED_CHANGE_NAMES_MSG} ]]; then
						touch "${DISPLAYED_CHANGE_NAMES_MSG}"
						MSG="Changing timelapse, keogram, and/or startrails names"
						MSG+="\nfor remote Websites is no longer allowed."
						display_msg --log notice "${MSG}"
					fi
					;;

				# ===== Names changed in ${COMBINED_BASE_VERSION}
				"darkframe")
					doV "${FIELD}" "VALUE" "takedarkframes" "boolean" "${NEW_FILE}"
					;;
				"daymaxgain")
					doV "${FIELD}" "VALUE" "daymaxautogain" "boolean" "${NEW_FILE}"
					;;
				"nightmaxexposure")
					doV "${FIELD}" "VALUE" "nightmaxautoexposure" "boolean" "${NEW_FILE}"
					;;
				"nightmaxgain")
					doV "${FIELD}" "VALUE" "nightmaxautogain" "boolean" "${NEW_FILE}"
					;;
				"websiteurl")
					doV "${FIELD}" "VALUE" "remotewebsiteurl" "text" "${NEW_FILE}"
					;;
				"imageurl")
					doV "${FIELD}" "VALUE" "remotewebsiteimageurl" "text" "${NEW_FILE}"
					;;

				# ===== Now have day and night versions as of ${COMBINED_BASE_VERSION}
				"awb" | "autowhitebalance")
					FIELD="awb"
					doV "${FIELD}" "VALUE" "day${FIELD}" "boolean" "${NEW_FILE}"
					doV "${FIELD}" "VALUE" "night${FIELD}" "boolean" "${NEW_FILE}"
					;;
				"wbr")
					doV "${FIELD}" "VALUE" "day${FIELD}" "number" "${NEW_FILE}"
					doV "${FIELD}" "VALUE" "night${FIELD}" "number" "${NEW_FILE}"
					;;
				"wbb")
					doV "${FIELD}" "VALUE" "day${FIELD}" "number" "${NEW_FILE}"
					doV "${FIELD}" "VALUE" "night${FIELD}" "number" "${NEW_FILE}"
					;;
				"targettemp")
					doV "${FIELD}" "VALUE" "day${FIELD}" "number" "${NEW_FILE}"
					doV "${FIELD}" "VALUE" "night${FIELD}" "number" "${NEW_FILE}"
					;;
				"coolerenabled")
					FIELD="enablecooler"		# also a name change
					doV "${FIELD}" "VALUE" "day${FIELD}" "boolean" "${NEW_FILE}"
					doV "${FIELD}" "VALUE" "night${FIELD}" "boolean" "${NEW_FILE}"
					;;
				"meanthreshold")
					doV "${FIELD}" "VALUE" "day${FIELD}" "number" "${NEW_FILE}"
					doV "${FIELD}" "VALUE" "night${FIELD}" "number" "${NEW_FILE}"
					;;

				*)
					# Since we don't know the setting name, we don't know its type.
					# Any setting that's not new, old, or changed (most of them), comes here.
					doV "${FIELD}" "VALUE" "${FIELD}" "" "${NEW_FILE}"
					;;
			esac
		done

	# Delete obsolete settings.
	if [[ -s "${DELETED_SETTINGS}" ]]; then
		display_msg --logonly info "List of settings deleted from '${NEW_FILE}' is in '${DELETED_SETTINGS}'."
		# shellcheck disable=SC2046
		"${ALLSKY_SCRIPTS}/updateJsonFile.sh" --file "${NEW_FILE}" $( < "${DELETED_SETTINGS}" )
	fi
}


####
# Copy everything from old config.sh to the settings file.
convert_config_sh()
{
	local OLD_CONFIG_FILE="${1}"
	local NEW_FILE="${2}"
	local CALLED_FROM="${3}"

	if [[ ${CALLED_FROM} == "install" ]]; then
		declare -n v="${FUNCNAME[0]}"; [[ ${v} == "true" ]] && return
	fi

	if [[ ! -e ${OLD_CONFIG_FILE} ]]; then
		display_msg --log info "No prior config.sh file to process."
		return 1
	fi

	MSG="Copying prior config.sh settings to settings file:"
	display_msg --log progress "${MSG}"
	(		# Use (  and not {  so the source'd variables don't stay in our environment
		#shellcheck disable=SC1090
		if ! source "${OLD_CONFIG_FILE}" ; then
			display_msg --log error "Unable to process prior config.sh file (${OLD_CONFIG_FILE})."
			return 1
		fi

		local X		# temporary variable

		# Determine name of settings to capture/save daytime images.
		# They initially were DAYTIME/CAPTURE_24HR, then DAYTIME_CAPTURE/DAYTIME_SAVE,
		# then moved to settings file.
		X=""
		if [[ -n ${DAYTIME_CAPTURE} ]]; then
			X="DAYTIME_CAPTURE"
		elif [[ -n ${DAYTIME} ]]; then
			X="DAYTIME"
			if [[ ${DAYTIME} == "1" ]]; then
				DAYTIME="true"
			else
				DAYTIME="false"
			fi
		fi
		[[ -n ${X} ]] && doV "${X}" "X" "takedaytimeimages" "boolean" "${NEW_FILE}"

		X=""
		if [[ -n ${DAYTIME_SAVE} ]]; then
			X="DAYTIME_SAVE"
		elif [[ -n ${CAPTURE_24HR} ]]; then
			X="CAPTURE_24HR"
		fi
		[[ -n ${X} ]] && doV "${X}" "X" "savedaytimeimages" "boolean" "${NEW_FILE}"

		doV "" "DARK_FRAME_SUBTRACTION" "usedarkframes" "boolean" "${NEW_FILE}"

		# IMG_UPLOAD no longer used; instead, upload if FREQUENCY > 0.
		# shellcheck disable=SC2034
		[[ ${IMG_UPLOAD} != "true" ]] && IMG_UPLOAD_FREQUENCY=0
		doV "" "IMG_UPLOAD_FREQUENCY" "imageuploadfrequency" "number" "${NEW_FILE}"

		# IMG_RESIZE no longer used; only resize if width and height are > 0.
		if [[ ${IMG_RESIZE} != "true" ]]; then
			IMG_WIDTH=0
			IMG_HEIGHT=0
		else
			IMG_WIDTH="${IMG_WIDTH:-0}"
			IMG_HEIGHT="${IMG_HEIGHT:-0}"
		fi
		doV "" "IMG_WIDTH" "imageresizewidth" "number" "${NEW_FILE}"
		doV "" "IMG_HEIGHT" "imageresizeheight" "number" "${NEW_FILE}"

		# CROP_IMAGE, CROP_WIDTH, CROP_HEIGHT, CROP_OFFSET_X, and CROP_OFFSET_Y are no longer used.
		# Instead the user specifies the number of pixels to crop from the
		# top, right, bottom, and left.
		# It's too difficult to convert old numbers to new, so force the user to enter new numbers.
		# We'd need to know actual number of image pixels, bin level, and .width and .height to get
		# the effective width and height, then convert.
		if [[ ${CROP_IMAGE} == "true" ]]; then
			MSG="The way to specify cropping images has changed."
			MSG+=" You need to reenter your crop settings."
			MSG+="\n  Specify the amount to crop from the top, right, bottom, and left."
			display_msg --log info "${MSG}"
		fi
		X=0
		doV "NEW" "X" "imagecroptop" "number" "${NEW_FILE}"
		doV "NEW" "X" "imagecropright" "number" "${NEW_FILE}"
		doV "NEW" "X" "imagecropbottom" "number" "${NEW_FILE}"
		doV "NEW" "X" "imagecropleft" "number" "${NEW_FILE}"

		# AUTO_STRETCH no longer used; only stretch if AMOUNT > 0 and MID_POINT != ""
		X=0; doV "NEW" "X" "imagestretchamountdaytime" "number" "${NEW_FILE}"
		X=10; doV "NEW" "X" "imagestretchmidpointdaytime" "number" "${NEW_FILE}"
		# shellcheck disable=SC2034
		[[ ${AUTO_STRETCH} != "true" || -z ${AUTO_STRETCH_MID_POINT} ]] && AUTO_STRETCH_AMOUNT=0
		doV "" "AUTO_STRETCH_AMOUNT" "imagestretchamountnighttime" "number" "${NEW_FILE}"
		AUTO_STRETCH_MID_POINT="${AUTO_STRETCH_MID_POINT/\%/}"	# % no longer used
		doV "" "AUTO_STRETCH_MID_POINT" "imagestretchmidpointnighttime" "number" "${NEW_FILE}"

		# RESIZE_UPLOADS no longer used; resize only if width > 0 and height > 0.
		if [[ ${RESIZE_UPLOADS} != "true" ]]; then
			# shellcheck disable=SC2034
			RESIZE_UPLOADS_WIDTH=0
			# shellcheck disable=SC2034
			RESIZE_UPLOADS_HEIGHT=0
		fi
		doV "" "RESIZE_UPLOADS_WIDTH" "imageresizeuploadswidth" "number" "${NEW_FILE}"
		doV "" "RESIZE_UPLOADS_HEIGHT" "imageresizeuploadsheight" "number" "${NEW_FILE}"

		doV "" "IMG_CREATE_THUMBNAILS" "imagecreatethumbnails" "boolean" "${NEW_FILE}"

		# REMOVE_BAD_IMAGES no longer used; remove only if low > 0 or high > 0.
		if [[ ${REMOVE_BAD_IMAGES} != "true" ]]; then
			# shellcheck disable=SC2034
			REMOVE_BAD_IMAGES_THRESHOLD_LOW=0
			# shellcheck disable=SC2034
			REMOVE_BAD_IMAGES_THRESHOLD_HIGH=0
		else
			# Old settings were 0 to 100, new are 0.0 to 1.0
			REMOVE_BAD_IMAGES_THRESHOLD_LOW="$( awk -v n="${REMOVE_BAD_IMAGES_THRESHOLD_LOW}" \
				'BEGIN { printf("%.3f", n/100); exit 0; }' )"
			REMOVE_BAD_IMAGES_THRESHOLD_HIGH="$( awk -v n="${REMOVE_BAD_IMAGES_THRESHOLD_HIGH}" \
				'BEGIN { printf("%.3f", n/100); exit 0; }' )"
		fi
		doV "" "REMOVE_BAD_IMAGES_THRESHOLD_LOW" "imageremovebadlow" "number" "${NEW_FILE}"
		doV "" "REMOVE_BAD_IMAGES_THRESHOLD_HIGH" "imageremovebadhigh" "number" "${NEW_FILE}"

		doV "" "TIMELAPSE" "timelapsegenerate" "boolean" "${NEW_FILE}"
		doV "" "TIMELAPSEWIDTH" "timelapsewidth" "number" "${NEW_FILE}"
		doV "" "TIMELAPSEHEIGHT" "timelapseheight" "number" "${NEW_FILE}"
		# We no longer include the trailing "k".
		TIMELAPSE_BITRATE="${TIMELAPSE_BITRATE/k/}"
		doV "" "TIMELAPSE_BITRATE" "timelapsebitrate" "number" "${NEW_FILE}"
		doV "" "FPS" "timelapsefps" "number" "${NEW_FILE}"
		doV "" "VCODEC" "timelapsevcodec" "text" "${NEW_FILE}"
		doV "" "PIX_FMT" "timelapsepixfmt" "text" "${NEW_FILE}"
		doV "" "FFLOG" "timelapsefflog" "text" "${NEW_FILE}"
		doV "" "KEEP_SEQUENCE" "timelapsekeepsequence" "boolean" "${NEW_FILE}"
		doV "" "TIMELAPSE_EXTRA_PARAMETERS" "timelapseextraparameters" "text" "${NEW_FILE}"
		doV "" "UPLOAD_VIDEO" "timelapseupload" "boolean" "${NEW_FILE}"
		doV "" "TIMELAPSE_UPLOAD_THUMBNAIL" "timelapseuploadthumbnail" "boolean" "${NEW_FILE}"

		doV "" "TIMELAPSE_MINI_IMAGES" "minitimelapsenumimages" "number" "${NEW_FILE}"
		doV "" "TIMELAPSE_MINI_FORCE_CREATION" "minitimelapseforcecreation" "boolean" "${NEW_FILE}"
		doV "" "TIMELAPSE_MINI_FREQUENCY" "minitimelapsefrequency" "number" "${NEW_FILE}"
		doV "" "TIMELAPSE_MINI_UPLOAD_VIDEO" "minitimelapseupload" "boolean" "${NEW_FILE}"
		doV "" "TIMELAPSE_MINI_UPLOAD_THUMBNAIL" "minitimelapseuploadthumbnail" "boolean" "${NEW_FILE}"
		doV "" "TIMELAPSE_MINI_FPS" "minitimelapsefps" "number" "${NEW_FILE}"
		TIMELAPSE_MINI_BITRATE="${TIMELAPSE_MINI_BITRATE//k/}"
		doV "" "TIMELAPSE_MINI_BITRATE" "minitimelapsebitrate" "number" "${NEW_FILE}"
		doV "" "TIMELAPSE_MINI_WIDTH" "minitimelapsewidth" "number" "${NEW_FILE}"
		doV "" "TIMELAPSE_MINI_HEIGHT" "minitimelapseheight" "number" "${NEW_FILE}"

		doV "" "KEOGRAM" "keogramgenerate" "boolean" "${NEW_FILE}"
		doV "" "KEOGRAM_EXTRA_PARAMETERS" "keogramextraparameters" "text" "${NEW_FILE}"
		doV "" "UPLOAD_KEOGRAM" "keogramupload" "boolean" "${NEW_FILE}"
		X="true"; doV "NEW" "X" "keogramexpand" "boolean" "${NEW_FILE}"
		X="simplex"; doV "NEW" "X" "keogramfontname" "text" "${NEW_FILE}"
		X="#ffffff"; doV "NEW" "X" "keogramfontcolor" "text" "${NEW_FILE}"
		X=1; doV "NEW" "X" "keogramfontsize" "text" "${NEW_FILE}"
		X=3; doV "NEW" "X" "keogramlinethickness" "text" "${NEW_FILE}"

		doV "" "STARTRAILS" "startrailsgenerate" "boolean" "${NEW_FILE}"
		doV "" "BRIGHTNESS_THRESHOLD" "startrailsbrightnessthreshold" "number" "${NEW_FILE}"
		doV "" "STARTRAILS_EXTRA_PARAMETERS" "startrailsextraparameters" "text" "${NEW_FILE}"
		doV "" "UPLOAD_STARTRAILS" "startrailsupload" "boolean" "${NEW_FILE}"

		[[ -z ${THUMBNAIL_SIZE_X} ]] && THUMBNAIL_SIZE_X=100
		doV "" "THUMBNAIL_SIZE_X" "thumbnailsizex" "number" "${NEW_FILE}"
		[[ -z ${THUMBNAIL_SIZE_Y} ]] && THUMBNAIL_SIZE_Y=75
		doV "" "THUMBNAIL_SIZE_Y" "thumbnailsizey" "number" "${NEW_FILE}"

		# NIGHTS_TO_KEEP was replaced by DAYS_TO_KEEP and the AUTO_DELETE boolean was deleted.
		if [[ -n ${NIGHTS_TO_KEEP} && ${AUTO_DELETE} == "true" ]]; then
			doV "" "NIGHTS_TO_KEEP" "daystokeep" "number" "${NEW_FILE}"
		else
			doV "" "DAYS_TO_KEEP" "daystokeep" "number" "${NEW_FILE}"
		fi
		doV "" "WEB_DAYS_TO_KEEP" "daystokeeplocalwebsite" "number" "${NEW_FILE}"
		X=0; doV "NEW" "X" "daystokeepremotewebsite" "number" "${NEW_FILE}"
		doV "" "WEBUI_DATA_FILES" "webuidatafiles" "text" "${NEW_FILE}"

	) || return 1

	if [[ ${CALLED_FROM} == "install" ]]; then
		STATUS_VARIABLES+=( "${FUNCNAME[0]}='true'\n" )
	fi

	return 0
}


####
# Copy everything from old ftp-settings.sh to the settings file.
convert_ftp_sh()
{
	local FTP_FILE="${1}"
	local NEW_FILE="${2}"
	local CALLED_FROM="${3}"

	if [[ ${CALLED_FROM} == "install" ]]; then
		declare -n v="${FUNCNAME[0]}"; [[ ${v} == "true" ]] && return
	fi

	if [[ ! -e ${FTP_FILE} ]]; then
		display_msg --log info "No prior ftp-settings.sh file to process (${FTP_FILE})."
		return 1
	fi

	MSG="Copying prior ftp-settings.sh settings to settings file:"
	display_msg --log progress "${MSG}"
	(		# Use (  and not {  so the source'd variables don't stay in our environment

		# These are really old names from the ftp file.
		# Make sure they aren't set before source'ing the file in.
		unset HOST USER PASSWORD IMGDIR MP4DIR

		#shellcheck disable=SC1090
		if ! source "${FTP_FILE}" ; then
			display_msg --log error "Unable to process prior ftp-settings.sh file (${FTP_FILE})."
			return 1
		fi

		PROTOCOL="${PROTOCOL,,}"

		# Really old names:
		# shellcheck disable=SC2034
		[[ -n ${HOST} ]] && REMOTE_HOST="${HOST}"
		# shellcheck disable=SC2034
		[[ -n ${USER} ]] && REMOTE_USER="${USER}"
		# shellcheck disable=SC2034
		[[ -n ${PASSWORD} ]] && REMOTE_PASSWORD="${PASSWORD}"
		# shellcheck disable=SC2034
		[[ -n ${IMGDIR} ]] && IMAGE_DIR="${IMGDIR}"
		# shellcheck disable=SC2034
		[[ -n ${MP4DIR} ]] && VIDEOS_DIR="${MP4DIR}"

		# ALLSKY_ENV is used by a remote Website and/or server.
		# Since we update it below, make sure it exists.
		if [[ ! -f ${ALLSKY_ENV} ]]; then
			cp "${REPO_ENV_FILE}" "${ALLSKY_ENV}"
		fi

		# Ignore the WEB_*_DIR entries - the user can no longer specify local directories.
		# Ignore VIDEOS_DIR, KEOGRAM_DIR, STARTRAILS_DIR - the user can no longer specify them.
		# Don't update REMOTEWEBSITE_* settings since they are new so have no prior value.

		# "local" PROTOCOL means they're using local Website.
		# WEB_IMAGE_DIR means they have both local and remote Website.
		PROTOCOL="${PROTOCOL,,}"
		if [[ (${PROTOCOL} == "local" || -n ${WEB_IMAGE_DIR}) ]]; then
			X="true"
		else
			X="false"
		fi
		doV "NEW" "X" "uselocalwebsite" "boolean" "${NEW_FILE}"

		##### Remote Website
		if [[ (-n ${PROTOCOL} && ${PROTOCOL} != "local") || -n ${REMOTE_HOST} ]]; then
			doV "" "PROTOCOL" "remotewebsiteprotocol" "text" "${NEW_FILE}"
			doV "" "IMAGE_DIR" "remotewebsiteimagedir" "text" "${NEW_FILE}"
			X="true"
		else
			PROTOCOL="${PROTOCOL:-ftps}"	# WebUI complains if it's not set
			doV "" "PROTOCOL" "remotewebsiteprotocol" "text" "${NEW_FILE}"
			# shellcheck disable=SC2034
			IMAGE_DIR=""
			doV "" "IMAGE_DIR" "remotewebsiteimagedir" "text" "${NEW_FILE}"
			X="false"
		fi
		doV "NEW" "X" "useremotewebsite" "boolean" "${NEW_FILE}"

		doV "" "IMG_UPLOAD_ORIGINAL_NAME" "remotewebsiteimageuploadoriginalname" "boolean" "${NEW_FILE}"
		doV "" "REMOTE_HOST" "REMOTEWEBSITE_HOST" "text" "${ALLSKY_ENV}" "hide"
		doV "" "REMOTE_PORT" "REMOTEWEBSITE_PORT" "text" "${ALLSKY_ENV}"

		doV "" "REMOTE_USER" "REMOTEWEBSITE_USER" "text" "${ALLSKY_ENV}" "hide"
		doV "" "REMOTE_PASSWORD" "REMOTEWEBSITE_PASSWORD" "text" "${ALLSKY_ENV}" "hide"
		doV "" "LFTP_COMMANDS" "REMOTEWEBSITE_LFTP_COMMANDS" "text" "${ALLSKY_ENV}"
		doV "" "SSH_KEY_FILE" "REMOTEWEBSITE_SSH_KEY_FILE" "text" "${ALLSKY_ENV}"

		if [[ ${PROTOCOL} != "s3" ]]; then
			AWS_CLI_DIR=""
			# shellcheck disable=SC2034
			S3_BUCKET=""
		fi
		doV "" "AWS_CLI_DIR" "REMOTEWEBSITE_AWS_CLI_DIR" "text" "${ALLSKY_ENV}"
		doV "" "S3_BUCKET" "REMOTEWEBSITE_S3_BUCKET" "text" "${ALLSKY_ENV}"
		doV "" "S3_ACL" "REMOTEWEBSITE_S3_ACL" "text" "${ALLSKY_ENV}"

		if [[ ${PROTOCOL} != "gcs" ]]; then
			# shellcheck disable=SC2034
			GCS_BUCKET=""
		fi
		doV "" "GCS_BUCKET" "REMOTEWEBSITE_GCS_BUCKET" "text" "${ALLSKY_ENV}"
		doV "" "GCS_ACL" "REMOTEWEBSITE_GCS_ACL" "text" "${ALLSKY_ENV}"

		##### Remote server - wasn't in prior releases so don't need to update ${ALLSKY_ENV}.
		X="false"; doV "NEW" "X" "useremoteserver" "boolean" "${NEW_FILE}"
		X="ftps"; doV "NEW" "X" "remoteserverprotocol" "text" "${NEW_FILE}"
		X="false"; doV "NEW" "X" "remoteserverimageuploadoriginalname" "boolean" "${NEW_FILE}"
	)

	[[ ${CALLED_FROM} == "install" ]] && STATUS_VARIABLES+=( "${FUNCNAME[0]}='true'\n" )

	return 0
}

####
# Restore the prior settings file(s) if the user wanted to use them.
# For ${NEW_STYLE_ALLSKY} we restore all prior camera-specific file(s) and let makeChanges.sh
# create the new settings file, linking it to the appropriate camera-specific file.
# For ${OLD_STYLE_ALLSKY} (which has no camera-specific file) we update the settings file
# if it currently exists.

restore_prior_settings_file()
{
	[[ ${RESTORED_PRIOR_SETTINGS_FILE} == "true" ]] && return

	if [[ ! -f ${PRIOR_SETTINGS_FILE} ]]; then
		# This should "never" happen since we are only called if the file exists.
		display_msg --log error "Prior settings file missing: ${PRIOR_SETTINGS_FILE}."
		FORCE_CREATING_DEFAULT_SETTINGS_FILE="true"
		return
	fi

	local MSG  NAME  EXT  FIRST_ONE  CHECK_UPPER

	if [[ ${PRIOR_ALLSKY_STYLE} == "${NEW_STYLE_ALLSKY}" ]]; then
		# The prior settings file SHOULD be a link to a camera-specific file.
		# Make sure that's true; if not, fix it.

		# Do we need to check for upperCase or lowercase setting names?
		if [[ ${PRIOR_ALLSKY_BASE_VERSION} < "${COMBINED_BASE_VERSION}" ]]; then
			CHECK_UPPER="--uppercase"
		else
			CHECK_UPPER=""
		fi

		MSG="Checking link for ${NEW_STYLE_ALLSKY} PRIOR_SETTINGS_FILE '${PRIOR_SETTINGS_FILE}'"
		display_msg --logonly info "${MSG}"

		# shellcheck disable=SC2086
		MSG="$( check_settings_link ${CHECK_UPPER} "${PRIOR_SETTINGS_FILE}" )"
		RET=$?
		if [[ ${RET} -ne 0 ]]; then
			if [[ ${RET} -eq "${EXIT_ERROR_STOP}" ]]; then
				display_msg --log error "${MSG}"
				FORCE_CREATING_DEFAULT_SETTINGS_FILE="true"
			else
				display_msg --log warning "${MSG}"
			fi
		fi

		# Camera-specific settings file names are:
		#	${NAME}_${CAMERA_TYPE}_${CAMERA_MODEL}.${EXT}
		# where ${SETTINGS_FILE_NAME} == ${NAME}.${EXT}
		NAME="${SETTINGS_FILE_NAME%.*}"			# before "."
		EXT="${SETTINGS_FILE_NAME##*.}"			# after "."

		# Copy all the camera-specific settings files; don't copy the generic-named
		# file since it will be recreated.
		# There will be more than one camera-specific file if the user has multiple cameras.
		local PRIOR_SPECIFIC_FILES="$( find "${PRIOR_CONFIG_DIR}" -maxdepth 1 -name "${NAME}_"'*'".${EXT}" )"
		if [[ -n ${PRIOR_SPECIFIC_FILES} ]]; then
			FIRST_ONE="true"
			echo "${PRIOR_SPECIFIC_FILES}" | while read -r FILE
				do
					if [[ ${FIRST_ONE} == "true" ]]; then
						display_msg --log progress "Restoring camera-specific settings files:"
						FIRST_ONE="false"
					fi
					display_msg --log progress "" "\t$( basename "${FILE}" )"
					cp -a "${FILE}" "${ALLSKY_CONFIG}"
				done
			RESTORED_PRIOR_SETTINGS_FILE="true"
			FORCE_CREATING_DEFAULT_SETTINGS_FILE="false"
		else
			# This shouldn't happen...
			MSG="No prior camera-specific settings files found,"

			# Try to create one based on ${PRIOR_SETTINGS_FILE}.
			if [[ ${PRIOR_CAMERA_TYPE} != "${CAMERA_TYPE}" ]]; then
# TODO: ? check CAMERA_MODEL
				MSG+="\nand unable to create one: new Camera Type"
				MSG+=" (${CAMERA_TYPE} different from prior type (${PRIOR_CAMERA_TYPE})."
				FORCE_CREATING_DEFAULT_SETTINGS_FILE="true"
			else
				local SPECIFIC="${NAME}_${PRIOR_CAMERA_TYPE}_${PRIOR_CAMERA_MODEL}.${EXT}"
				cp -a "${PRIOR_SETTINGS_FILE}" "${ALLSKY_CONFIG}/${SPECIFIC}"
				MSG+="\nbut was able to create '${SPECIFIC}'."
				PRIOR_SPECIFIC_FILES="${SPECIFIC}"

				RESTORED_PRIOR_SETTINGS_FILE="true"
				FORCE_CREATING_DEFAULT_SETTINGS_FILE="false"
			fi
			display_msg --log warning "${MSG}"
		fi

		# Make any changes to the settings files based on the old and new Allsky versions.
		# If we're not using the standard branch we're probably testing and want to convert the settings file.
		if [[ ${RESTORED_PRIOR_SETTINGS_FILE} == "true" &&
			( ${BRANCH} != "${ALLSKY_GITHUB_MAIN_BRANCH}" || ${PRIOR_ALLSKY_VERSION} != "${ALLSKY_VERSION}" ) ]]; then
			for S in ${PRIOR_SPECIFIC_FILES}
			do
				# Update all the prior camera-specific files (which are now in ${ALLSKY_CONFIG}).
				# The new settings file will be based on a camera specific file.
				S="${ALLSKY_CONFIG}/$( basename "${S}" )"
				convert_settings_file "${S}" "${S}" "install"
			done
		else
			MSG="No need to update prior settings files - same Allsky version and branch."
			display_msg --logonly info "${MSG}"
		fi

	else
		# settings file is old style in ${OLD_RASPAP_DIR}.
		if [[ -f ${ALLSKY_SETTINGS_FILE} ]]; then
			# Transfer prior settings to the new file.

			case "${PRIOR_ALLSKY_VERSION}" in
				"${FIRST_VERSION_VERSION}")
					convert_settings_file "${PRIOR_SETTINGS_FILE}" "${ALLSKY_SETTINGS_FILE}" "install"

					MSG="Your old WebUI settings were transfered to the new release,"
					MSG+="\n but note that there have been some changes to the settings file"
					MSG+=" (e.g., settings in ftp-settings.sh are now in the settings file)."
					MSG+="\n\nCheck your settings in the WebUI's 'Allsky Settings' page."
					whiptail --title "${TITLE}" --msgbox "${MSG}" 18 "${WT_WIDTH}" 3>&1 1>&2 2>&3
					display_msg info "\n${MSG}\n"
					add_to_post_actions "${MSG}"
					display_msg --logonly info "Settings from ${PRIOR_ALLSKY_VERSION} copied over."
					;;

				*)	# This could be one of many old versions of Allsky,
					# so don't try to copy all the settings since there have
					# been many changes, additions, and deletions.

					# As far as I know, latitude, longitude, and angle have never changed names,
					# and are required and have no default,
					# so try to restore them so Allsky can restart automatically.
					# shellcheck disable=SC2034
					local LAT="$( settings .latitude "${PRIOR_SETTINGS_FILE}" )"
					X="LAT"; doV "latitude" "X" "latitude" "text" "${ALLSKY_SETTINGS_FILE}"
					# shellcheck disable=SC2034
					local LONG="$( settings .longitude "${PRIOR_SETTINGS_FILE}" )"
					X="LONG"; doV "longitude" "X" "longitude" "text" "${ALLSKY_SETTINGS_FILE}"
					local ANGLE="$( settings .angle "${PRIOR_SETTINGS_FILE}" )"
					X="ANGLE"; doV "angle" "X" "angle" "number" "${ALLSKY_SETTINGS_FILE}"
					display_msg --log progress "Prior latitude, longitude, and angle restored."

					MSG="You need to manually transfer your old settings to the WebUI.\n"
					MSG+="\nNote that there have been many changes to the settings file"
					MSG+=" since you last installed Allsky, so you will need"
					MSG+=" to re-enter everything via the WebUI's 'Allsky Settings' page."
					whiptail --title "${TITLE}" --msgbox "${MSG}" 18 "${WT_WIDTH}" 3>&1 1>&2 2>&3
					display_msg info "\n${MSG}\n"
					add_to_post_actions "${MSG}"

					MSG="Only a few settings from very old ${PRIOR_ALLSKY_VERSION} copied over."
					display_msg --logonly info "${MSG}"
					;;
			esac

			# Set to null to force the user to look at the settings before Allsky will run.
			update_json_file -d ".lastchanged" "" "${ALLSKY_SETTINGS_FILE}"

			RESTORED_PRIOR_SETTINGS_FILE="true"
			FORCE_CREATING_DEFAULT_SETTINGS_FILE="false"
		else
			# First time through there often won't be ALLSKY_SETTINGS_FILE.
			display_msg --logonly info "No new settings file yet..."
			FORCE_CREATING_DEFAULT_SETTINGS_FILE="true"
		fi
	fi

	STATUS_VARIABLES+=( "RESTORED_PRIOR_SETTINGS_FILE='${RESTORED_PRIOR_SETTINGS_FILE}'\n" )
}


####
# If the user wanted to restore files from a prior version of Allsky, do that.
restore_prior_files()
{
	declare -n v="${FUNCNAME[0]}"; [[ ${v} == "true" ]] && return

	if [[ -d ${OLD_RASPAP_DIR} ]]; then
		MSG="\nThe '${OLD_RASPAP_DIR}' directory is no longer used.\n"
		MSG+="When installation is done you may remove it by executing:\n"
		MSG+="    sudo rm -fr '${OLD_RASPAP_DIR}'\n"
		display_msg --log info "${MSG}"
		add_to_post_actions "${MSG}"
	fi

	# If the prior ${ALLSKY_TMP} is mounted, unmount it so users can
	# remove the old Allsky.
	D="${ALLSKY_PRIOR_DIR}/tmp"
	if is_mounted "${D}" ; then
		display_msg --logonly info "Unmounting '${D}'."
		umount_dir "${D}" "install"
	fi

	[[ ${USE_PRIOR_ALLSKY} == "false" ]] && return

	# Do all the restores, then all the updates.
	display_msg --log progress "Restoring prior:"

	local E  D  R  ITEM  X

	ITEM="${SPACE}'images' directory"
	if [[ ${ALLSKY_IMAGES} != "${ALLSKY_IMAGES_ORIGINAL}" ]]; then
		display_msg --log progress "${ITEM} (leaving '${ALLSKY_IMAGES}' as is)"
	else
		if [[ -d ${ALLSKY_PRIOR_DIR}/images ]]; then
			display_msg --log progress "${ITEM} (moving)"
			mv "${ALLSKY_PRIOR_DIR}/images" "${ALLSKY_HOME}"
		else
			# This is probably very rare so let the user know
			display_msg --log progress "${ITEM}: ${NOT_RESTORED}."  " This is unusual."
		fi
	fi

	ITEM="${SPACE}'darks' directory"
	if [[ -d ${ALLSKY_PRIOR_DIR}/darks ]]; then
		display_msg --log progress "${ITEM} (moving)"
		mv "${ALLSKY_PRIOR_DIR}/darks" "${ALLSKY_HOME}"
	else
		display_msg --log progress "${ITEM}: ${NOT_RESTORED}"
	fi

	ITEM="${SPACE}'$( basename "$( dirname "${ALLSKY_MYFILES_DIR}" )" )/${ALLSKY_MYFILES_NAME}' directory"
	if [[ -d ${PRIOR_MYFILES_DIR} ]]; then
		display_msg --log progress "${ITEM} (moving)"
		if [[ -d ${ALLSKY_MYFILES_DIR} ]]; then
			(shopt -s dotglob
			 mv "${PRIOR_MYFILES_DIR}"/* "${ALLSKY_MYFILES_DIR}" 2>/dev/null
	 		)
		else
			mv "${PRIOR_MYFILES_DIR}" "${ALLSKY_MYFILES_DIR}"
		fi
	else
		# Almost no one has this directory, so don't show to user.
		display_msg --logonly info "${ITEM}: ${NOT_RESTORED}"
	fi

	ITEM="${SPACE}'config/ssl' directory"
	if [[ -d ${PRIOR_CONFIG_DIR}/ssl ]]; then
		display_msg --log progress "${ITEM} (copying)"
		cp -ar "${PRIOR_CONFIG_DIR}/ssl" "${ALLSKY_CONFIG}"
	else
		# Almost no one has this directory, so don't show to user.
		display_msg --logonly info "${ITEM}: ${NOT_RESTORED}"
	fi

	if [[ ${PRIOR_ALLSKY_STYLE} == "${NEW_STYLE_ALLSKY}" ]]; then
		D="${PRIOR_CONFIG_DIR}"
	else
		# raspap.auth was in a different directory in older versions.
		D="${OLD_RASPAP_DIR}"
	fi
	R="raspap.auth"
	ITEM="${SPACE}WebUI security settings (${R})"
	if [[ -f ${D}/${R} ]]; then
		display_msg --log progress "${ITEM} (copying)"
		cp -a "${D}/${R}" "${ALLSKY_CONFIG}"
	else
		display_msg --log progress "${ITEM}: ${NOT_RESTORED}"
	fi

	ITEM="${SPACE}uservariables.sh"
	if [[ -f ${PRIOR_CONFIG_DIR}/uservariables.sh ]]; then
		display_msg --log progress "${ITEM}: (copying)"
		cp -a "${PRIOR_CONFIG_DIR}/uservariables.sh" "${ALLSKY_CONFIG}"

		# Need to recreate variables.json since uservariables.sh changed
		# at least one variable.
		create_variables_json "install"
	# Don't bother with the "else" part since this file is very rarely used.
	fi


	########## Website files
	# ALLSKY_ENV is for a remote Website and/or server and any private information.
	# Restore it now because it's potentially written to below.
	E="$( basename "${ALLSKY_ENV}" )"
	ITEM="${SPACE}'${E}' file"
	if [[ -f ${ALLSKY_PRIOR_DIR}/${E} ]]; then
		display_msg --log progress "${ITEM} (copying)"
		cp -ar "${ALLSKY_PRIOR_DIR}/${E}" "${ALLSKY_ENV}"
	fi

	# Restore the remote Allsky Website configuration file if it exists.
	ITEM="${SPACE}'${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_NAME}'"
	if [[ -f ${PRIOR_REMOTE_WEBSITE_CONFIGURATION_FILE} ]]; then
		display_msg --log progress "${ITEM} (copying)"
		cp "${PRIOR_REMOTE_WEBSITE_CONFIGURATION_FILE}" "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}"

		# Check the Allsky version in the remote file - if it's old let user know.
		PRIOR_V="$( settings ".${WEBSITE_ALLSKY_VERSION}" "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}" )"
# TODO: if not using remote Website, change messages below.
		if [[ ${PRIOR_V} == "${ALLSKY_VERSION}" ]]; then
			MSG="${SPACE}${SPACE}Remote Website already at latest Allsky version ${PRIOR_V}."
			display_msg --log progress "${MSG}"
		else
			MSG="Your remote Website needs to be updated to version ${ALLSKY_VERSION}."
			MSG+="\nIt is at version ${PRIOR_V}.     Run:"
			MSG+="\n\n  cd ~/allsky;  ./remoteWebsiteInstall.sh"
			MSG+="\n\nNote that you do NOT need to manually copy files to the Website;"
			MSG+="\nthe installation does that for you."
			display_msg notice "${MSG}"
			add_to_post_actions "${MSG}"

			MSG="Displayed message that remote Website @ ${PRIOR_V} needs updating."
			display_msg --logonly info "${MSG}"
		fi
	else
		display_msg --log progress "${ITEM}: ${NOT_RESTORED}"
	fi

	# Do NOT restore options.json - it will be recreated.

	# Done with restores, now the updates.

	COPIED_PRIOR_CONFIG_SH="true"		# Global variable
	if [[ -s ${PRIOR_CONFIG_FILE} ]]; then
		# This copies the settings from the prior config file to the settings file.
		convert_config_sh "${PRIOR_CONFIG_FILE}" "${ALLSKY_SETTINGS_FILE}" "install" ||
			COPIED_PRIOR_CONFIG_SH="false"
	fi
	STATUS_VARIABLES+=( "COPIED_PRIOR_CONFIG_SH='${COPIED_PRIOR_CONFIG_SH}'\n" )

	# The ftp-settings.sh file was originally in allsky/scripts but
	# moved to allsky/config in version ${FIRST_VERSION_VERSION}.
	# It no longer exists, but if a prior one exists copy its contents to the settings file.
	# Get the current and prior (if any) file version.
	if [[ -f ${PRIOR_FTP_FILE} ]]; then			# allsky/config version
		# Version ${FIRST_VERSION_VERSION} and newer.
		:
	elif [[ -f ${ALLSKY_PRIOR_DIR}/scripts/ftp-settings.sh ]]; then
		# pre ${FIRST_VERSION_VERSION}
		PRIOR_FTP_FILE="${ALLSKY_PRIOR_DIR}/scripts/ftp-settings.sh"
	else
		if [[ -s ${PRIOR_CONFIG_FILE} ]]; then
			# If there was a prior config file there should have been a prior ftp file.
			display_msg --log error "Unable to find prior ftp-settings.sh (${PRIOR_FTP_FILE})."
		fi
		PRIOR_FTP_FILE=""
	fi
	COPIED_PRIOR_FTP_SH="true"			# Global variable
	if [[ -s ${PRIOR_FTP_FILE} ]]; then
		convert_ftp_sh "${PRIOR_FTP_FILE}" "${ALLSKY_SETTINGS_FILE}" "install" ||
			COPIED_PRIOR_FTP_SH="false"
	fi
	STATUS_VARIABLES+=( "COPIED_PRIOR_FTP_SH='${COPIED_PRIOR_FTP_SH}'\n" )


	if [[ ${COPIED_PRIOR_CONFIG_SH} == "true" && ${COPIED_PRIOR_FTP_SH} == "true" ]]; then
		return 0
	fi

	MSG="You need to manually move the CONTENTS of:"
	if [[ ${COPIED_PRIOR_CONFIG_SH} == "false" ]]; then
		MSG="${MSG}\n     ${PRIOR_CONFIG_DIR}/config.sh"
	fi
	if [[ ${COPIED_PRIOR_FTP_SH} == "false" ]]; then
		MSG="${MSG}\n     ${PRIOR_FTP_FILE}"
	fi
	MSG+=""
	whiptail --title "${TITLE}" --msgbox "${MSG}${MSGb}" 20 "${WT_WIDTH}" 3>&1 1>&2 2>&3

	display_msg --log info "\n${MSG}${MSGb}\n"
	add_to_post_actions "${MSG}"
	if [[ -n ${MSG2} ]]; then
		display_msg --log info "\n${MSG2}\n"
		add_to_post_actions "${MSG}"
	fi

	return 0
}


####
# If a prior local Website exists move its data to the new location.
restore_prior_website_files()
{
	declare -n v="${FUNCNAME[0]}"; [[ ${v} == "true" ]] && return
	local ITEM  D  count  MSG

	# Do this even if we're not restoring Website files.
	if [[ ! -f ${ALLSKY_ENV} ]]; then
		display_msg --log progress "${SPACE}$( basename "${ALLSKY_ENV}" ) (creating)"
		cp "${REPO_ENV_FILE}" "${ALLSKY_ENV}"
	fi

	[[ ${USE_PRIOR_ALLSKY} == "false" ]] && return

	ITEM="${SPACE}Local Website files"
	if [[ -z ${PRIOR_WEBSITE_DIR} ]]; then
		display_msg --log progress "${ITEM}: ${NOT_RESTORED}"

		# Create a default configuration file in case they decide to use a local Website.
		prepare_local_website ""
		return
	fi

	display_msg --log progress "${ITEM}:"

	# Each data directory will have zero or more images/videos.
	# Make sure we do NOT mv any .php files.

	ITEM="${SPACE}${SPACE}timelapse videos"
	D="${PRIOR_WEBSITE_DIR}/videos/thumbnails"
	[[ -d ${D} ]] && mv "${D}"   "${ALLSKY_WEBSITE}/videos"
	count=$( get_count "${PRIOR_WEBSITE_DIR}/videos" 'allsky-*' )
	if [[ ${count} -ge 1 ]]; then
		display_msg --log progress "${ITEM} (moving)"
		mv "${PRIOR_WEBSITE_DIR}"/videos/allsky-*   "${ALLSKY_WEBSITE}/videos"
	else
		display_msg --log progress "${ITEM}: ${NOT_RESTORED}"
	fi

	ITEM="${SPACE}${SPACE}keograms"
	D="${PRIOR_WEBSITE_DIR}/keograms/thumbnails"
	[[ -d ${D} ]] && mv "${D}"   "${ALLSKY_WEBSITE}/keograms"
	count=$( get_count "${PRIOR_WEBSITE_DIR}/keograms" 'keogram-*' )
	if [[ ${count} -ge 1 ]]; then
		display_msg --log progress "${ITEM} (moving)"
		mv "${PRIOR_WEBSITE_DIR}"/keograms/keogram-*   "${ALLSKY_WEBSITE}/keograms"
	else
		display_msg --log progress "${ITEM}: ${NOT_RESTORED}"
	fi

	ITEM="${SPACE}${SPACE}startrails"
	D="${PRIOR_WEBSITE_DIR}/startrails/thumbnails"
	[[ -d ${D} ]] && mv "${D}"   "${ALLSKY_WEBSITE}/startrails"
	count=$( get_count "${PRIOR_WEBSITE_DIR}/startrails" 'startrails-*' )
	if [[ ${count} -ge 1 ]]; then
		display_msg --log progress "${ITEM} (moving)"
		mv "${PRIOR_WEBSITE_DIR}"/startrails/startrails-*   "${ALLSKY_WEBSITE}/startrails"
	else
		display_msg --log progress "${ITEM}: ${NOT_RESTORED}"
	fi

	if [[ -d "${PRIOR_WEBSITE_DIR}/meteors" ]]; then
		ITEM="${SPACE}${SPACE}meteors"
		D="${PRIOR_WEBSITE_DIR}/meteors/thumbnails"
		[[ -d ${D} ]] && mv "${D}"   "${ALLSKY_WEBSITE}/meteors"
		count=$( get_count "${PRIOR_WEBSITE_DIR}/meteors" 'meteors-*' )
		if [[ ${count} -ge 1 ]]; then
			display_msg --log progress "${ITEM} (moving)"
			mv "${PRIOR_WEBSITE_DIR}"/meteors/meteors-*   "${ALLSKY_WEBSITE}/meteors"
		else
			display_msg --log progress "${ITEM}: ${NOT_RESTORED}"
		fi
	fi

	ITEM="${SPACE}${SPACE}'${ALLSKY_MYFILES_NAME}' directory"
	D="${PRIOR_WEBSITE_DIR}/${ALLSKY_MYFILES_NAME}"
	if [[ -d ${D} ]]; then
		display_msg --log progress "${ITEM} (moving)"
		if [[ -d ${ALLSKY_WEBSITE_MYFILES_DIR} ]]; then
			(shopt -s dotglob
			 mv "${D}"/*   "${ALLSKY_WEBSITE_MYFILES_DIR}" 2>/dev/null
	 		)
		else
			mv "${D}"   "${ALLSKY_WEBSITE_MYFILES_DIR}"
		fi
	else
		display_msg --logonly info "${ITEM}: ${NOT_RESTORED}"
	fi

	# Now deal with the local Website configuration file.
	if [[ ${PRIOR_WEBSITE_STYLE} == "${OLD_STYLE_ALLSKY}" ]]; then
		# The format of the old files is too different from the new file,
		# so force them to manually copy settings.
		MSG="You need to manually copy your prior Website settings in"
		MSG+="\n\t${PRIOR_WEBSITE_DIR}/config.js"
		MSG+="\nto '${ALLSKY_WEBSITE_CONFIGURATION_NAME}' in the"
		MSG+=" WebUI's 'Editor' page."
		display_msg --log info "${MSG}"

		MSG+="When done, check in '${PRIOR_WEBSITE_DIR}' for any files"
		MSG+="you may have added; if there are any, store them in"
		MSG+="\n   ${ALLSKY_WEBSITE_MYFILES_DIR}"
		MSG+="then remove the old Website:  sudo rm -fr ${PRIOR_WEBSITE_DIR}"
		add_to_post_actions "${MSG}"

		# Create a default file.
		prepare_local_website "" "postData"

	else		# NEW_STYLE_WEBSITE
		PRIOR_WEBSITE_CONFIG_FILE="${PRIOR_WEBSITE_DIR}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}"
		ITEM="${SPACE}${SPACE}${ALLSKY_WEBSITE_CONFIGURATION_NAME}"

		if [[ -f ${PRIOR_WEBSITE_CONFIG_FILE} ]]; then
			# Copy the old file to the current location.

			if [[ ${PRIOR_WEB_CONFIG_VERSION} < "${NEW_WEB_CONFIG_VERSION}" ]]; then
				MSG="${ITEM} (copying and updating for version ${NEW_WEB_CONFIG_VERSION})"
			else
				MSG="${ITEM} (copying)"
			fi
			display_msg --log progress "${MSG}"

			cp "${PRIOR_WEBSITE_CONFIG_FILE}" "${ALLSKY_WEBSITE_CONFIGURATION_FILE}"

			MSG="${SPACE}${SPACE}${SPACE}"
			if [[ ${PRIOR_WEB_CONFIG_VERSION} < "${NEW_WEB_CONFIG_VERSION}" ]]; then
				# If different versions, then update the current one.
				MSG+="Updating version from ${PRIOR_WEB_CONFIG_VERSION} to ${NEW_WEB_CONFIG_VERSION}."
				display_msg --logonly info "${MSG}"
				update_old_website_config_file "${ALLSKY_WEBSITE_CONFIGURATION_FILE}" \
					"${PRIOR_WEB_CONFIG_VERSION}" "${NEW_WEB_CONFIG_VERSION}"
			else
				MSG+="Already current @ version ${NEW_WEB_CONFIG_VERSION}"
				display_msg --logonly info "${MSG}"
			fi

			prepare_local_website "" "postData"

		else
			# Prior Website config file doesn't exist.
			display_msg --log progress "${ITEM}: ${NOT_RESTORED}"
			doV "uselocalwebsite" "false" "uselocalwebsite" "boolean" "${ALLSKY_SETTINGS_FILE}"
		fi
	fi

	# data.json was updated above so don't copy it.

	STATUS_VARIABLES+=( "${FUNCNAME[0]}='true'\n" )
}


####
# Restore the prior version of Allsky, but save this version.
# Anything moved from the prior version to this version is moved back.
RENAMED_DIR=""

do_restore()
{
	local MSG  MSG2  ITEM  OK

	# This is what the current ${ALLSKY_HOME} will be renamed to.
	RENAMED_DIR="${ALLSKY_HOME}-${ALLSKY_VERSION}"

	MSG="Unable to restore Allsky - "

	OK="true"
	if [[ ${USE_PRIOR_ALLSKY} == "false" ]]; then
		MSG+="No valid prior Allsky to restore."
		OK="false"
	fi

	if [[ -d ${RENAMED_DIR} ]]; then
		MSG+="'${RENAMED_DIR}' already exists."
		MSG+="\nDid you already restore Allsky?\n"
		OK="false"
	fi

	if [[ ! -d ${ALLSKY_CONFIG} ]]; then
		MSG+="Allsky isn't installed."
		OK="false"
	elif [[ ! -d ${ALLSKY_PRIOR_DIR} ]]; then
		MSG+="No prior version exists in '${ALLSKY_PRIOR_DIR}'."
		OK="false"
	fi
	if [[ ${OK} == "false" ]]; then
		display_msg --log error "${MSG}"
		exit_installation 1 "${STATUS_ERROR}" "${MSG}"
	fi

	do_initial_heading

	stop_Allsky

	# During installation some files were MOVED from the old release to
	# the new release (which is now the current release).
	# Move those items back.
	# Don't worry about the items that were COPIED to the current release.

	display_msg --log progress "Restoring files:"

	ITEM="${SPACE}'images' directory"
	if [[ ${ALLSKY_IMAGES} != "${ALLSKY_IMAGES_ORIGINAL}" ]]; then
		display_msg --log progress "${ITEM} (leaving '${ALLSKY_IMAGES}' as is)"
	else
		if [[ -d ${ALLSKY_IMAGES} ]]; then
			display_msg --log progress "${ITEM} (moving back)"
			mv "${ALLSKY_IMAGES}" "${ALLSKY_PRIOR_DIR}"
		else
			# This is probably very rare so let the user know
			display_msg --log progress "${ITEM}: ${NOT_RESTORED}." " This is unusual."
		fi
	fi

	ITEM="${SPACE}'darks' directory"
	if [[ -d ${ALLSKY_HOME}/darks ]]; then
		display_msg --log progress "${ITEM} (moving back)"
		mv "${ALLSKY_HOME}/darks" "${ALLSKY_PRIOR_DIR}"
	else
		display_msg --log progress "${ITEM}: ${NOT_RESTORED}"
	fi

	ITEM="${SPACE}'$( basename "$( dirname "${ALLSKY_MYFILES_DIR}" )" )/${ALLSKY_MYFILES_NAME}' directory"
	if [[ -d ${ALLSKY_MYFILES_DIR} ]]; then
		display_msg --log progress "${ITEM} (moving back)"
		mv "${ALLSKY_MYFILES_DIR}" "$( dirname "${PRIOR_MYFILES_DIR}" )"
	else
		# Few people have this directory, so don't show to user.
		display_msg --logonly info "${ITEM}: ${NOT_RESTORED}"
	fi

	if [[ -n ${PRIOR_WEBSITE_DIR} ]]; then
		display_msg --log progress "${SPACE}Local Website files:"

		ITEM="${SPACE}${SPACE}timelapse videos"
		D="${ALLSKY_WEBSITE}/videos/thumbnails"
		[[ -d ${D} ]] && mv "${D}"   "${PRIOR_WEBSITE_DIR}/videos"
		count=$( get_count "${ALLSKY_WEBSITE}/videos" 'allsky-*' )
		if [[ ${count} -ge 1 ]]; then
			display_msg --log progress "${ITEM} (moving back)"
			mv "${ALLSKY_WEBSITE}"/videos/allsky-*   "${PRIOR_WEBSITE_DIR}/videos"
		else
			display_msg --log progress "${ITEM}: ${NOT_RESTORED}"
		fi

		ITEM="${SPACE}${SPACE}keograms"
		D="${ALLSKY_WEBSITE}/keograms/thumbnails"
		[[ -d ${D} ]] && mv "${D}"   "${PRIOR_WEBSITE_DIR}/keograms"
		count=$( get_count "${ALLSKY_WEBSITE}/keograms" 'keogram-*' )
		if [[ ${count} -ge 1 ]]; then
			display_msg --log progress "${ITEM} (moving back)"
			mv "${ALLSKY_WEBSITE}"/keograms/keogram-*   "${PRIOR_WEBSITE_DIR}/keograms"
		else
			display_msg --log progress "${ITEM}: ${NOT_RESTORED}"
		fi

		ITEM="${SPACE}${SPACE}startrails"
		D="${ALLSKY_WEBSITE}/startrails/thumbnails"
		[[ -d ${D} ]] && mv "${D}"   "${PRIOR_WEBSITE_DIR}/startrails"
		count=$( get_count "${ALLSKY_WEBSITE}/startrails" 'startrails-*' )
		if [[ ${count} -ge 1 ]]; then
			display_msg --log progress "${ITEM} (moving back)"
			mv "${ALLSKY_WEBSITE}"/startrails/startrails-*   "${PRIOR_WEBSITE_DIR}/startrails"
		else
			display_msg --log progress "${ITEM}: ${NOT_RESTORED}"
		fi

		if [[ -d "${PRIOR_WEBSITE_DIR}/meteors" ]]; then
			ITEM="${SPACE}${SPACE}meteors"
			D="${ALLSKY_WEBSITE}/meteors/thumbnails"
			[[ -d ${D} ]] && mv "${D}"   "${PRIOR_WEBSITE_DIR}/meteors"
			count=$( get_count "${ALLSKY_WEBSITE}/meteors" 'meteors-*' )
			if [[ ${count} -ge 1 ]]; then
				display_msg --log progress "${ITEM} (moving back)"
				mv "${ALLSKY_WEBSITE}"/meteors/meteors-*   "${PRIOR_WEBSITE_DIR}/meteors"
			else
				display_msg --log progress "${ITEM}: ${NOT_RESTORED}"
			fi
		fi

		ITEM="${SPACE}${SPACE}${ALLSKY_MYFILES_NAME}"
		if [[ -d ${ALLSKY_WEBSITE_MYFILES_DIR} ]]; then
			display_msg --log progress "${ITEM} (moving back)"
			mv "${ALLSKY_WEBSITE_MYFILES_DIR}"   "${PRIOR_WEBSITE_DIR}"
		else
			display_msg --logonly info "${ITEM}: ${NOT_RESTORED}"
		fi
	fi

	# Since we'll be running a new Allsky, start off with clean log files.
	create_lighttpd_log_file
	create_allsky_logs "false"		# "false" = only create log file

	# If ${ALLSKY_TMP} is a memory filesystem, unmount it.
	if is_mounted "${ALLSKY_TMP}" ; then
		display_msg --logonly progress "Unmounting '${ALLSKY_TMP}'."
		umount_dir "${ALLSKY_TMP}" "install"
		WAS_MOUNTED="true"
	else
		WAS_MOUNTED="false"
	fi

	display_msg --log progress "Renaming '${ALLSKY_HOME}' to '${RENAMED_DIR}'"
	if ! mv "${ALLSKY_HOME}" "${RENAMED_DIR}" ; then
		MSG="Unable to rename '${ALLSKY_HOME}' to '${RENAMED_DIR}'"
		exit_installation 1 "${STATUS_ERROR}" "${MSG}"
	fi

	# Need to point to location of original Allsky.
	DISPLAY_MSG_LOG="${DISPLAY_MSG_LOG/${ALLSKY_HOME}/${RENAMED_DIR}}"
	STATUS_FILE="${STATUS_FILE/${ALLSKY_HOME}/${RENAMED_DIR}}"
	ALLSKY_SCRIPTS="${ALLSKY_SCRIPTS/${ALLSKY_HOME}/${RENAMED_DIR}}"

	display_msg --log progress "Renaming '${ALLSKY_PRIOR_DIR}' to '${ALLSKY_HOME}'"
	if ! mv "${ALLSKY_PRIOR_DIR}" "${ALLSKY_HOME}" ; then
		MSG="Unable to rename '${ALLSKY_PRIOR_DIR}' to '${ALLSKY_HOME}'"
		exit_installation 1 "${STATUS_ERROR}" "${MSG}"
	fi

	if [[ ${WAS_MOUNTED} == "true" ]]; then
		# Remounts ${ALLSKY_TMP}
		display_msg --logonly progress "Re-mounting '${ALLSKY_TMP}'."
		mount_dir "${ALLSKY_TMP}" "install"
	fi

	mkdir -p "$( dirname "${ALLSKY_POST_INSTALL_ACTIONS}" )"

	MSG="\nRestoration is done and"
	MSG2=" Allsky needs its settings reviewed to make sure they still apply."
	display_msg --log progress "${MSG}" "${MSG2}"

	MSG2+="\nGo to the 'Allsky Settings' page of the WebUI and"
	MSG2+=" make any necessary changes."
	add_to_post_actions "${MSG}${MSG2}"

	whiptail --title "${TITLE}" --msgbox "${MSG}${MSG2}" 12 "${WT_WIDTH}" 3>&1 1>&2 2>&3
	display_image "ReviewNeeded"

	# Force the user to look at the settings before Allsky will run.
	update_json_file -d ".lastchanged" "" "${ALLSKY_SETTINGS_FILE}"
	set_allsky_status "${ALLSKY_STATUS_NEEDS_REVIEW}"

	exit_installation 0 "${STATUS_OK}" ""
}


####
# "Fix" things then exit.
# This can be needed if the user hosed something up, or there was a problem somewhere.
# It does no harm to call this when not needed.
do_fix()
{
	set_permissions
	exit 0
}


####
# Change the ALLSKY_IMAGES folder.
do_change_images()
{
	# ALLSKY_IMAGES point to a different location.
	# Make sure everything knows the location.

	# just update web server
	install_webserver_et_al="true" install_webserver_et_al

	exit 0
}


####
# Update Allsky and exit.  It basically resets things.
# This can be needed if the user hosed something up, or there was a problem somewhere.
do_update()
{
	CAMERA_TYPE="$( settings ".cameratype" )"
	if [[ -z ${CAMERA_TYPE} ]]; then
		display_msg --log error "Camera Type not set in settings file."
		exit_installation 1 "${STATUS_ERROR}" "No Camera Type in settings file during update."
	fi

	save_camera_capabilities "false"
	do_fix

	do_allsky_status "${ALLSKY_STATUS_NOT_RUNNING}"

	exit_installation 0 "${STATUS_OK}" "Update completed."
}


####
# Install the overlay and modules system
install_PHP_modules()
{
	if [[ ${install_PHP_modules} == "true" ]]; then
		display_msg --logonly info "PHP modules already installed"
		return
	fi
	[[ ${SKIP} == "true" ]] && return

	display_msg --log progress "Installing PHP modules and dependencies."
	TMP="${ALLSKY_LOGS}/PHP_modules.log"
	run_aptGet php-zip php-sqlite3 python3-pip libatlas-base-dev > "${TMP}" 2>&1
	check_success $? "PHP module installation failed" "${TMP}" "${DEBUG}" ||
		exit_with_image 1 "${STATUS_ERROR}" "PHP module install failed."

	STATUS_VARIABLES+=( "${FUNCNAME[0]}='true'\n" )
}


install_dependencies()
{
		local REQUIREMENTS_FILE="$1"
		local NAME="$2"
		local NUM_TO_INSTALL=$( wc -l < "${REQUIREMENTS_FILE}" )

		TMP="${ALLSKY_LOGS}/${NAME}"
		display_msg --log progress "Installing ${NAME}${M}:"
		COUNT=0
		rm -f "${STATUS_FILE_TEMP}"
		while read -r package
		do
			((COUNT++))
			echo "${package}" > /tmp/package
			# Make the numbers line up.
			if [[ ${COUNT} -lt 10 ]]; then
				C=" ${COUNT}"
			else
				C="${COUNT}"
			fi

			PACKAGE="   === Package # ${C} of ${NUM_TO_INSTALL}: [${package}]"
			STATUS_NAME="${NAME}_${COUNT}"
			# Need indirection since the ${STATUS_NAME} is the variable name and we want its value.
			if [[ ${!STATUS_NAME} == "true" ]]; then
				display_msg --log progress "${PACKAGE} - already installed."
				continue
			fi
			display_msg --log progress "${PACKAGE}"

			L="${TMP}.${COUNT}.log"
			M="${NAME} [${package}] failed"
			pip3 install --upgrade --no-warn-script-location -r /tmp/package > "${L}" 2>&1
			# These files are too big to display so pass in "0" instead of ${DEBUG}.
			if ! check_success $? "${M}" "${L}" 0 ; then
				rm -fr "${PIP3_BUILD}"

				# Add current status
				update_status_from_temp_file

				exit_with_image 1 "${STATUS_ERROR}" "${M}."
			fi
			echo "${STATUS_NAME}='true'"  >> "${STATUS_FILE_TEMP}"
		done < "${REQUIREMENTS_FILE}"

		# Add the status back in.
		update_status_from_temp_file
}

####
# Install all the Python packages
install_Python()
{
	declare -n v="${FUNCNAME[0]}"
	if [[ ${v} == "true" ]]; then
		display_msg --logonly info "Python and related packages already installed"
		return
	fi
	[[ ${SKIP} == "true" ]] && return


	#
	# Install the server venv. NOTE this needs older versions of some packages like numpy so cannot use
	# the main allsky venv
	#
	#python3 -m venv "${ALLSKY_PYTHON_SERVER_VENV}" --system-site-packages
	#if [[ ${PI_OS} == "trixie" ]]; then
  #	run_aptGet python3-dev python3.13-dev build-essential pkg-config > "${TMP}" 2>&1	
	#fi

	#activate_python_server_venv
	#nstall_dependencies "${ALLSKY_REPO}/requirements-server.txt" "Python_server_dependencies"
	#deactivate_python_server_venv
	
	local PREFIX  REQUIREMENTS_FILE  M  R  NUM_TO_INSTALL
	local NAME  PKGs  TMP  COUNT  C  PACKAGE  STATUS_NAME  L  M  MSG

	# Doing all the python dependencies at once can run /tmp out of space, so do one at a time.
	# This also allows us to display progress messages.
	M=" for ${ALLSKY_PI_OS^}"
	R="-${ALLSKY_PI_OS}"

	if [[ ${ALLSKY_PI_OS} == "trixie" ]]; then
		display_msg --log progress "Trixie detected, installing python build packages."
		TMP="${ALLSKY_LOGS}/trixie_build.log"		
		run_aptGet python3.13-dev build-essential > "${TMP}" 2>&1
	fi
	
  display_msg --logonly info "Locating Python dependency file"
	PREFIX="${ALLSKY_REPO}/requirements"
	REQUIREMENTS_FILE=""
	for file in "${PREFIX}${R}-${LONG_BITS}.txt" \
		"${PREFIX}${R}.txt" \
		"${PREFIX}-${LONG_BITS}.txt" \
		"${PREFIX}.txt"
	do
    	if [[ -f ${file} ]]; then
        	display_msg --logonly info "  Using '${file}'"
			REQUIREMENTS_FILE="${file}"
			break
		fi
	done
	if [[ -z ${REQUIREMENTS_FILE} ]]; then
       	MSG="Unable to find a requirements file!"
       	display_msg --log error "${MSG}"
		exit_with_image 1 "${STATUS_ERROR}" "${MSG}"
	fi

	NUM_TO_INSTALL=$( wc -l < "${REQUIREMENTS_FILE}" )

	PKGs="python3-full libgfortran5 libopenblas0-pthread"
	display_msg --logonly progress "Installing ${PKGs}."
	TMP="${ALLSKY_LOGS}/python3-full.log"
	# shellcheck disable=SC2086
	run_aptGet ${PKGs} > "${TMP}" 2>&1
	check_success $? "${PKGs} install failed" "${TMP}" "${DEBUG}" ||
		exit_with_image 1 "${STATUS_ERROR}" "${PKGs} install failed."

	python3 -m venv "${ALLSKY_PYTHON_VENV}" --system-site-packages
	activate_python_venv

	NAME="Python_dependencies"

	# If the requirements file is the same as the in the prior Allsky version,
	# don't re-install these packages.
	local PRIOR_REQ="${REQUIREMENTS_FILE/${ALLSKY_HOME}/${ALLSKY_PRIOR_DIR}}"
	if [[ ${WILL_USE_PRIOR} == "true" && ${SKIP} == "true" && -f ${PRIOR_REQ} ]] && cmp --silent "${REQUIREMENTS_FILE}" "${PRIOR_REQ}" ; then
		display_msg --log progress "Skipping installation of ${NAME} - already installed."
	else
		install_dependencies "${REQUIREMENTS_FILE}" "${NAME}"
	fi

	# On Pi 5 models we need to replace rpi.gpi with lgpio.
	# This should be done by adafruit-blinka.
	# The code is in setup.py to do this but it
	# doesn't appear to work hence we are forcing it here.
	# gpiozero decodes the Pi revision number to calculate the Pi version so until the Pi 6 is 
	# released this code will detect all future versions of the Pi 5.
# TODO FUTURE: modify as needed once Pi 6 is out.

	local CMD="from gpiozero import Device"
	CMD+="\nDevice.ensure_pin_factory()"
	CMD+="\nprint(Device.pin_factory.board_info.model)"
	# Hide error since it only applies to Pi 5.
	local pimodel="$( echo -e "${CMD}" | python3 2>/dev/null )"
	echo "${pimodel}" > "${ALLSKY_PI_VERSION_FILE}"

	# If we are on the pi 5 then uninstall rpi.gpio,
	# using the virtual environment which will always exist on the pi 5.
	# lgpio is installed globally so will be used after rpi.gpio is removed.
	# Adafruits blinka reinstalls rpi.gpio so we need to ensure its removed.
	if [[ -n ${pimodel} ]]; then
		PI_MODEL="0"					# global
	else
		PI_MODEL="${pimodel:0:1}"
	fi
	if [[ ${PI_MODEL} == "5" ]]; then
		display_msg --logonly info "Updating GPIO to lgpio"
		activate_python_venv
		pip3 uninstall -y rpi.gpio > /dev/null 2>&1
	fi

	STATUS_VARIABLES+=( "${FUNCNAME[0]}='true'\n" )
}


####
# Install the overlay and modules system
install_overlay()
{
	declare -n v="${FUNCNAME[0]}"; [[ ${v} == "true" ]] && return

	display_msg --log progress "Setting up default modules and overlays."
	# Some of these will get overwritten later if the user has prior versions.
	cp -ar "${ALLSKY_REPO}/overlay" "${ALLSKY_REPO}/modules" "${ALLSKY_CONFIG}"
	cp  "${ALLSKY_REPO}/allskyvariables.json.repo" "${ALLSKY_CONFIG}/allskyvariables.json"


	# ALLSKY_MY_OVERLAY_TEMPLATES is not in ALLSKY_REPO and we haven't restored anything yet,
	# so create the directory.
	mkdir -p "${ALLSKY_MY_OVERLAY_TEMPLATES}"

	# Globals: SENSOR_WIDTH, SENSOR_HEIGHT, FULL_OVERLAY_NAME, SHORT_OVERLAY_NAME, OVERLAY_NAME
	SENSOR_WIDTH="$( settings ".sensorWidth" "${ALLSKY_CC_FILE}" )"
	SENSOR_HEIGHT="$( settings ".sensorHeight" "${ALLSKY_CC_FILE}" )"
	FULL_OVERLAY_NAME="overlay-${CAMERA_TYPE}_${CAMERA_MODEL}-${SENSOR_WIDTH}x${SENSOR_HEIGHT}-both.json"
	SHORT_OVERLAY_NAME="overlay-${CAMERA_TYPE}.json"

	local OVERLAY_PATH="${ALLSKY_REPO}/overlay/config/${FULL_OVERLAY_NAME}"
	if [[ -f ${OVERLAY_PATH} ]]; then
		OVERLAY_NAME=${FULL_OVERLAY_NAME}
	else
		OVERLAY_NAME=${SHORT_OVERLAY_NAME}
	fi

	if [[ ${WILL_USE_PRIOR} == "false" ]]; then
		# Set to defaults since there are no prior files.
		display_msg --log progress "Using overlay '${OVERLAY_NAME}'."
		for s in daytimeoverlay nighttimeoverlay
		do
			local VALUE=""; doV "" "OVERLAY_NAME" "${s}" "text" "${ALLSKY_SETTINGS_FILE}"
		done
	fi

	STATUS_VARIABLES+=( "${FUNCNAME[0]}='true'\n" )
}


####
log_info()
{
	declare -n v="${FUNCNAME[0]}"; [[ ${v} == "true" ]] && return

	display_msg --logonly info "ALLSKY_PI_OS = ${ALLSKY_PI_OS}"
	THIS_PI_MODEL="$( get_computer "" )"
	display_msg --logonly info "Pi Model = ${THIS_PI_MODEL}"
	display_msg --logonly info "uname = $( uname -a )"
	display_msg --logonly info "id = $( id )"

	STATUS_VARIABLES+=( "${FUNCNAME[0]}='true'\n" )
}


####
check_if_supported_OS()
{
	declare -n v="${FUNCNAME[0]}"; [[ ${v} == "true" ]] && return

	local SUPPORTED_OSES="bullseye bookworm trixie"
	[[ ${SUPPORTED_OSES} =~ ${ALLSKY_PI_OS} ]] && return

	local OS="${ALLSKY_PI_OS^}"		# uppercase 1st letter for looks
	local MSG="ERROR: Allsky does not support the ${OS} operating system."
	MSG+="\n\nSupported operating systems include:"
	for i in ${SUPPORTED_OSES}; do
		MSG+="\n  ${i^}"
	done
	MSG+="\n\nIf you are running an operating system that is NEWER than Trixie,"
	MSG+=" please run 'cat /etc/os-release' and copy/paste the results into"
	MSG+=" a new GitHub Discussion item."
	MSG+="  The Allsky team will need to test Allsky with the new operating system."
	MSG+="\n\nIf you are running an older operating system we recommend doing"
	MSG+=" a fresh install of the Desktop version of Trixie 64-bit on a clean SD card."
	whiptail --title "${TITLE}" --msgbox --ok-button "Exit" "${MSG}" 20 "${WT_WIDTH}" 3>&1 1>&2 2>&3

	MSG="Unsupported OS: ${ALLSKY_PI_OS}."
	display_msg --logonly info "${MSG}  Exiting."

	STATUS_VARIABLES+=( "${FUNCNAME[0]}='true'\n" )
	exit_installation 0 "${STATUS_NOT_CONTINUE}" "${MSG}"
}


####
# Display an image the user will see when they go to the WebUI during installation.
display_image()
{
	local IMAGE_OR_CUSTOM="${1}"
	local ALLSKY_FULL_FILENAME  ALLSKY_FILENAME  ALLSKY_EXTENSION  COLOR  CUSTOM_MESSAGE  MSG  X  I

	if [[ -s ${ALLSKY_SETTINGS_FILE} ]]; then		# The file may not exist yet.
		# These variables are defined in variables.sh, but require the settings file to exist.
		ALLSKY_FULL_FILENAME="$( settings ".filename" )"
		ALLSKY_FILENAME="${ALLSKY_FULL_FILENAME%.*}"
		ALLSKY_EXTENSION="${ALLSKY_FULL_FILENAME##*.}"
	else
		ALLSKY_FILENAME="image"
		ALLSKY_EXTENSION="jpg"
	fi

	I="${ALLSKY_CURRENT_DIR}/${ALLSKY_FILENAME}.${ALLSKY_EXTENSION}"
	if [[ -z ${IMAGE_OR_CUSTOM} ]]; then		# No IMAGE_OR_CUSTOM means remove the image
		display_msg --logonly info "Removing prior notification image."
		rm -f "${I}"
		return
	fi

	if [[ ${IMAGE_OR_CUSTOM} == "--custom" ]]; then
		# Create custom message
		COLOR="${2}"
		CUSTOM_MESSAGE="${3}"

		MSG="Displaying custom notification image: $( echo -e "${CUSTOM_MESSAGE}" | tr '\n' ' ' )"
		display_msg --logonly info "${MSG}"
		MSG="$( "${ALLSKY_SCRIPTS}/generateNotificationImages.sh" \
			--directory "${ALLSKY_CURRENT_DIR}" \
			"${ALLSKY_FILENAME}" "${COLOR}" "" "" "" "" \
			"" "10" "${COLOR}" "${ALLSKY_EXTENSION}" "" "${CUSTOM_MESSAGE}"  2>&1 >/dev/null )"
		if [[ -n ${MSG} ]]; then
			display_msg --logonly info "${MSG}"
		fi
	else
		if [[ -f ${ALLSKY_POST_INSTALL_ACTIONS} ]]; then
			# Add a message the user will see in the WebUI.
			MSG="Actions needed.  Click for more information."
			X="${ALLSKY_POST_INSTALL_ACTIONS/${ALLSKY_HOME}/}"
			"${ALLSKY_SCRIPTS}/addMessage.sh" --type warning --ID AM_POST --msg "${MSG}" --url "${X}"

			# This tells allsky.sh not to display a message about actions since we just did.
			touch "${ALLSKY_POST_INSTALL_ACTIONS}_initial_message"
		fi

		X="${IMAGE_OR_CUSTOM}.${ALLSKY_EXTENSION}"
		display_msg --logonly info "Displaying notification image '${X}'"
		cp "${ALLSKY_NOTIFICATION_IMAGES}/${X}" "${I}" ||
			display_msg --log info "WARNING: unable to copy '${X}' to '${I}'"
	fi
}


####
# Installation failed.
# Replace the "installing" messaged with a "failed" one.
exit_with_image()
{
	local RET="${1}"
	local STATUS="${2}"
	local MORE_STATUS="${3}"
	display_image "InstallationFailed"
	exit_installation "${RET}" "${STATUS}" "${MORE_STATUS}"
}


####
# Sort the specified settings file to be the same as the options file.
sort_settings_file()
{
	local FILE="${1}"

	display_msg --logonly info "Sorting settings file '${FILE}'."

	"${ALLSKY_SCRIPTS}/convertJSON.php" \
		--from-install \
		--convert \
		--order \
		--settings-file "${FILE}" \
		--options-file "${ALLSKY_OPTIONS_FILE}" \
		> "${TMP_FILE}" 2>&1
	if [[ $? -ne 0 ]]; then
		MSG="Unable to sort settings file '${FILE}': $( < "${TMP_FILE}" ); ignoring"
		display_msg --log error "${MSG}"
		return 1
	fi

	cp "${TMP_FILE}" "${FILE}"
	return 0
}


####
# Check if we restored all prior settings.
# Global: CONFIGURATION_NEEDED
check_restored_settings()
{
	local IMG  AFTER  MSG

	if [[ ${ALLSKY_VERSION} == "${PRIOR_ALLSKY_VERSION}" ]]; then
		CONFIGURATION_NEEDED="false"
		MSG="Re-installed same version; no configuration or reboot needed."
		display_msg --logonly info "${MSG}"
		STATUS_VARIABLES+=("CONFIGURATION_NEEDED='${CONFIGURATION_NEEDED}'\n")
		return
	fi

	for s in "${ALLSKY_CONFIG}/settings_"*
	do
		[[ -f ${s} ]] && sort_settings_file "${s}"
	done

	if [[ ${RESTORED_PRIOR_SETTINGS_FILE} == "true" &&
	  	  ${COPIED_PRIOR_CONFIG_SH} == "true" &&
	  	  ${COPIED_PRIOR_FTP_SH} == "true" ]]; then
		# We restored all the prior settings so no configuration is needed.
		# However, check if a reboot is needed.

		if [[ ${PRIOR_ALLSKY_STYLE} == "${NEW_STYLE_ALLSKY}" ]]; then
			CONFIGURATION_NEEDED="false"
			MSG="Upgrading a new-style version; no configuration needed."
			display_msg --logonly info "${MSG}"
		else
			MSG="Upgrading a old-style version; review needed."
			CONFIGURATION_NEEDED="review"
			display_msg --logonly info "${MSG}"
		fi

		if [[ ${REBOOT_NEEDED} == "true" ]]; then
			IMG="RebootNeeded"
		else
			IMG=""					# Blank name removes existing image
		fi
		display_image "${IMG}"
		STATUS_VARIABLES+=("CONFIGURATION_NEEDED='${CONFIGURATION_NEEDED}'\n")
		return
	fi

	if [[ ${REBOOT_NEEDED} == "true" ]]; then
		AFTER="rebooting"
	else
		AFTER="installation is complete"
	fi
	if [[ ${RESTORED_PRIOR_SETTINGS_FILE} == "false" ]]; then
		MSG="Default settings were created for your ${CAMERA_TYPE} ${CAMERA_MODEL} camera."
		MSG+="\n\nHowever, you must update them by going to the"
		MSG+=" 'Allsky Settings' page in the WebUI after ${AFTER}."
		whiptail --title "${TITLE}" --msgbox "${MSG}" 12 "${WT_WIDTH}" 3>&1 1>&2 2>&3
	fi

	CONFIGURATION_NEEDED="true"
	STATUS_VARIABLES+=("CONFIGURATION_NEEDED='${CONFIGURATION_NEEDED}'\n")
}


####
# Do every time as a reminder.
remind_old_version()
{
	[[ ${SKIP} == "true" ]] && return

	if [[ ${USE_PRIOR_ALLSKY} == "true" ]]; then
		MSG="When you are sure everything is working with the new Allsky release,"
		MSG+=" remove your old version in '${ALLSKY_PRIOR_DIR}' to save disk space."
		whiptail --title "${TITLE}" --msgbox "${MSG}" 12 "${WT_WIDTH}" 3>&1 1>&2 2>&3
		display_msg --logonly info "Displayed message about removing '${ALLSKY_PRIOR_DIR}'."
	fi
}

####
# Set the current Allsky status and log a message.
add_to_post_actions()
{
	local MSG="${1}"
	echo -e "\n\n========== ACTION NEEDED:\n${MSG}" >> "${ALLSKY_POST_INSTALL_ACTIONS}"
}

####
# Manage installation and setup of the Allsky database
setup_database()
{
	#
	# Create the sqlite database to prevent permission errors
	#
	sqlite3 "${ALLSKY_DATABASES}" ".databases"
	sudo chown "${ALLSKY_OWNER}":"${ALLSKY_WEBSERVER_OWNER}" "${ALLSKY_DATABASES}"
	sudo chmod 664 "${ALLSKY_DATABASES}"

	sudo "${ALLSKY_UTILITIES}/database_manager.py" --auto
}

####
# Manage overlay installation or updating
update_overlays()
{
	local OVERLAY_MANAGER="${ALLSKY_SCRIPTS}/modules/allskyoverlaymanager/allskyoverlaymanager.py"
	if [[ ${USE_PRIOR_ALLSKY} == "true" ]]; then
		"${OVERLAY_MANAGER}" --auto --oldpath "${ALLSKY_PRIOR_DIR}" --camera "${PRIOR_CAMERA_TYPE}"
	else
		"${OVERLAY_MANAGER}" --install
	fi
}

####
# Allow the user to install modules.
install_modules()
{

	#
	# NOTE: We need to use sudo here as the ALLSKY_USER has had various groups added but they will
	#       not be activated until the user logs out and in or reboots. The module. installer needs
	#       these groups otherwise it cannot change the permissions of various files.
	# NOTE: There is no way to reload the groups for the user, this is a limitation of the Linux Kernel
	#
	if [[ "$BRANCH" == "$ALLSKY_GITHUB_MAIN_BRANCH" ]]; then
		sudo su - "${ALLSKY_OWNER}" -c "\"${ALLSKY_MODULE_INSTALLER}\" --welcome"
	else
		sudo su - "${ALLSKY_OWNER}" -c "\"${ALLSKY_MODULE_INSTALLER}\" --welcome --setbranch \"${BRANCH}\""		
	fi

	RET=$?
	if [[ ${RET} -eq ${EXIT_PARTIAL_OK} ]]; then
		add_to_post_actions "To install and remove modules, execute 'allsky-config manage_modules'."
	fi
}

####
# Check if the extra modules need to be reinstalled.
# Do every time as a reminder.
update_modules()
{

	if [[ "$BRANCH" == "$ALLSKY_GITHUB_MAIN_BRANCH" ]]; then
			"${ALLSKY_MODULE_INSTALLER}" --auto
	else
			"${ALLSKY_MODULE_INSTALLER}" --auto --setbranch "$BRANCH"
	fi

	STATUS_VARIABLES+=( "${FUNCNAME[0]}='true'\n" )
}


clear_status()
{
	rm -f "${STATUS_FILE}"
}


# Update the status from the specified file.
# It's ok if the file doesn't exist.
update_status_from_temp_file()
{
	if [[ -s ${STATUS_FILE_TEMP} ]]; then
		STATUS_VARIABLES+=( "$( < "${STATUS_FILE_TEMP}" )" )
		STATUS_VARIABLES+=("\n")
		rm -f "${STATUS_FILE_TEMP}"
	fi
}

####
exit_installation()
{
	local RET="${1}"
	local STATUS_CODE="${2}"
	local MORE_STATUS="${3}"
	local MORE  S  Q

	# If STATUS_CODE is set, add it and all STATUS_VARIABLES to the status file.
	if [[ -n ${STATUS_CODE} ]]; then
		if [[ ${STATUS_CODE} == "${STATUS_CLEAR}" ]]; then
			clear_status
		else
			if [[ -n ${MORE_STATUS} && ${MORE_STATUS} != "${STATUS_CODE}" ]]; then
				Q="'"	# single quote.  Escape it:
				MORE="; MORE_STATUS='${MORE_STATUS//${Q}/\\${Q}}'"
			else
				MORE=""
			fi
			if [[ ${RESTORE} == "true" ]]; then
				S="RESTORATION"
			else
				S="INSTALLATION"
			fi
			echo -e "STATUS_${S}='${STATUS_CODE}'${MORE}" > "${STATUS_FILE}"
			update_status_from_temp_file
			echo -e "${STATUS_VARIABLES[@]}" >> "${STATUS_FILE}"

			# If the user needs to reboot, save the current uptime-since
			# so we can check it when Allsky starts.  If it's the same value
			# the user did not reboot.
			# If the time is different the user rebooted.
			if [[ ${STATUS_CODE} == "${STATUS_NO_FINISH_REBOOT}" ||
				  ${STATUS_CODE} == "${STATUS_NO_REBOOT}" ]]; then
				set_reboot_needed
				display_image "RebootNeeded"
			fi
		fi
	fi

	[[ -z ${FUNCTION} ]] && display_msg --logonly info "ENDING ${IorR}.\n"

	# Don't exit for negative numbers.
	[[ ${RET} -ge 0 ]] && exit "${RET}"
}


####
# Remove the point release from the version
# Format of a version (_PP is optional point release):
#	12345678901234
#	vYYYY.MM.DD_PP

function remove_point_release()
{
	# Get just the base portion.
	echo "${1:0:11}"
}


####
handle_interrupts()
{
	display_msg --log info "\nGot interrupt - saving installation status, then exiting.\n"
	display_image --custom "yellow" "Allsky installation\nwas interrupted."
	exit_installation 1 "${STATUS_INT}" "Saving status."
}


####
# Set the current Allsky status and log a message.
do_allsky_status()
{
	local STATUS="${1}"
	display_msg --logonly info "Setting Allsky status to '${STATUS}'."
	set_allsky_status "${STATUS}"
}


####
# Set the specified json field in the specified file to now.
set_now()
{
	local FIELD="${1}"
	local FILE="${2}"

	#shellcheck disable=SC2034
	local NOW="$( date +'%Y-%m-%d %H:%M:%S' )"
	doV "${FIELD}" "NOW" "${FIELD}" "text" "${FILE}"
}

####
# Install packages needed by this script.
install_installer_dependencies()
{
	declare -n v="${FUNCNAME[0]}"; [[ ${v} == "true" ]] && return
	[[ ${SKIP} == "true" ]] && return

	# Needed to put notification images there.
	[[ ! -d ${ALLSKY_CURRENT_DIR} ]] && mkdir -p "${ALLSKY_CURRENT_DIR}"


	local PACKAGES=""
	# Any version is ok so if the command exists, don't reinstall it.
	which dialog > /dev/null || PACKAGES+="dialog "
	which jq > /dev/null || PACKAGES+="jq "
	which gawk > /dev/null || PACKAGES+="gawk "
	if [[ -n ${PACKAGES} ]]; then
		display_msg --log progress "Installing initial dependencies: ${PACKAGES}"

		TMP="${ALLSKY_LOGS}/installer.dependencies.log"
		{
			#shellcheck disable=SC2086
			sudo apt-get update && run_aptGet ${PACKAGES}
		} > "${TMP}" 2>&1
		check_success $? "${PACKAGES/ /,} installation failed" "${TMP}" "${DEBUG}" ||
			exit_with_image 1 "${STATUS_ERROR}" "${PACKAGES/ /,} install failed."
	else
		display_msg --logonly info "Initial dependencies already installed."
	fi

	STATUS_VARIABLES+=( "${FUNCNAME[0]}='true'\n" )
}


####
# Make sure the required settings have a value.
# If latitude or longitude are missing, prompt for them.
check_for_required_settings()
{
	local lat  long angle  MSG

	lat="$( settings ".latitude" )"			|| return 1
	long="$( settings ".longitude" )"
	if [[ -z ${lat} || -z ${long} ]]; then
		MSG="Latitude is ${lat:-missing}, Longitude is ${long:-missing}; prompting."
		display_msg --logonly info "${MSG}"

		if ! get_lat_long ; then
			display_msg --log info "Latitude and/or Longitude not entered"
			CONFIGURATION_NEEDED="${STATUS_NO_LAT_LONG}"	# global
		fi
	fi

	angle="$( settings ".angle" )"
	if [[ -z ${angle} ]]; then
		MSG="Angle is not set; update in WebUI after installation completes"
		display_msg --log warning "${MSG}"
	fi
}


####
# Display a message informing the user the following steps can take a while.
display_wait_message()
{
	local MSG  HOW_LONG  M

	M="$( get_computer --pi-model-only )"
	M="${M:-0}"
	if [[ ${M} -lt 5 ]]; then
		HOW_LONG="up to an hour"
	else
		HOW_LONG="several minutes"
	fi
	MSG="The following steps can take ${HOW_LONG} depending on the speed of"
	MSG+="\nyour Pi ${M/0/} and how many of the necessary dependencies are already installed."
	display_msg notice "${MSG}"
}


####
# Request that the user add their camera to the Allsky Map.
request_map()
{
	[[ "$( settings ".showonmap" )" == "true" ]] && return

	local MSG

	MSG+="\nPlease consider adding your camera to the Allsky Map."
	if [[ "$( settings ".useremotewebsite" )" == "false" ]]; then
		MSG+="\nYou don't need to have a remote Website to do this."
	fi
	MSG+="\nSee the 'Allsky Map Settings' section of the WebUI's 'Allsky Settings' page."
	display_msg notice "${MSG}"

	add_to_post_actions "${MSG}"
}


####
# Perform actions after the installation completes.
do_done()
{
	local MSG  MSG2

	request_map

	if [[ ${WILL_REBOOT} == "true" ]]; then
		do_allsky_status "${ALLSKY_STATUS_REBOOT_NEEDED}"
		do_reboot "${STATUS_FINISH_REBOOT}" ""		# does not return
	fi

	if [[ ${REBOOT_NEEDED} == "true" ]]; then
		display_msg --log progress "\nInstallation is done" " but the Pi needs a reboot.\n"
		do_allsky_status "${ALLSKY_STATUS_REBOOT_NEEDED}"
		exit_installation 0 "${STATUS_NO_FINISH_REBOOT}" ""
	fi

	if [[ ${CONFIGURATION_NEEDED} == "false" ]]; then
		do_allsky_status "${ALLSKY_STATUS_NOT_RUNNING}"
		display_image --custom "lime" "Allsky is\nready to start"
		MSG="\nInstallation is done."
		MSG2="To start Allsky, go to the WebUI's 'System' page."
		display_msg --log progress "${MSG}"  "${MSG2}"
		MSG2+="  You can then clear this message."
		"${ALLSKY_SCRIPTS}/addMessage.sh" --type info --msg "${MSG2}"

		# Set it so the user isn't asked to review the Allsky settings.
		set_now "lastchanged" "${ALLSKY_SETTINGS_FILE}"

	elif [[ ${CONFIGURATION_NEEDED} == "true" ]]; then
		display_image "ConfigurationNeeded"
		do_allsky_status "${ALLSKY_STATUS_NEEDS_CONFIGURATION}"
		MSG="; Allsky needs to be configured before it will start."
		display_msg --log progress "\nInstallation is done" "${MSG}"
		MSG="Go to the WebUI's 'Allsky Settings' page to configure Allsky."
		display_msg progress "" "${MSG}"

	elif [[ ${CONFIGURATION_NEEDED} == "review" ]]; then
		display_image "ReviewNeeded"
		do_allsky_status "${ALLSKY_STATUS_NEEDS_REVIEW}"
		MSG=" Please review the settings on the WebUI's 'Allsky Settings' page"
		MSG+="\nto make sure they still look ok."
		display_msg --log progress "\nInstallation is done." "${MSG}"

	else
		# A different status string.
		exit_installation 0 "${CONFIGURATION_NEEDED}" ""
	fi

	display_msg progress "\nEnjoy Allsky!\n"
}

do_legacy_password_conversion()
{
	display_msg --logonly info "Calling setWebuiPassword.sh"
	"${ALLSKY_UTILITIES}/setWebuiPassword.sh" --frominstaller
}

############################################## Main part of program

##### Calculate whiptail sizes
WT_WIDTH="$( calc_wt_size )"

##### Check arguments
OK="true"
SKIP="false"			# mostly for testing same install multiple times
DEBUG=0
DEBUG_ARG=""
LOG_TYPE="--logonly"	# by default we only log some messages but don't display
HELP="false"
UPDATE="false"
FIX="false"
RESTORE="false"
FUNCTION=""
while [ $# -gt 0 ]; do
	ARG="${1}"
	case "${ARG,,}" in
		--help)
			HELP="true"
			;;
		--debug)
			((DEBUG++))
			DEBUG_ARG="${ARG}"		# we can pass this to other scripts
			LOG_TYPE="--log"
			;;
		--update)
			UPDATE="true"
			;;
		--fix)
			FIX="true"
			;;
		--restore)
			RESTORE="true"
			;;
		--skip)
			SKIP="true"
			;;
		--function)
			FUNCTION="${2}"
			# There are several steps below we don't do if we're calling
			# a function, since that's done AFTER installation.
			# For example, don't log anything.
			shift
			;;
		*)
			display_msg --log error "Unknown argument: '${ARG}'." >&2
			OK="false"
			;;
	esac
	shift
done
[[ ${OK} == "false" ]] && usage_and_exit 1
[[ ${HELP} == "true" ]] && usage_and_exit 0

IorR="INSTALLATION"		# Installation (default) or Restoration

if [[ -n ${FUNCTION} || ${FIX} == "true" ]]; then
	# If we were passed a log file name, use it, otherwise
	# don't log when a single function is executed or we're fixing things.
	DISPLAY_MSG_LOG=""
else
	if [[ ${RESTORE} == "true" ]]; then
		if [[ ! -d ${ALLSKY_PRIOR_DIR} ]]; then
			echo -en "\nERROR: You requested a restore," >&2
			echo -e " but no prior Allsky found at '${ALLSKY_PRIOR_DIR}'.\n" >&2
			exit 1
		fi
		DISPLAY_MSG_LOG="${ALLSKY_LOGS}/restore.log"
		STATUS_FILE="${ALLSKY_LOGS}/restore_status.txt"
		IorR="RESTORATION"
		V="$( get_version "${ALLSKY_PRIOR_DIR}/" )"		# Returns "" if no version file.
		V="${V:-prior version}"
		SHORT_TITLE="Allsky Restorer"
		TITLE="${SHORT_TITLE} - from ${ALLSKY_VERSION} back to ${V}"
		NOT_RESTORED="NO CURRENT VERSION"
	else
		V="${ALLSKY_VERSION}"
	fi

	mkdir -p "${ALLSKY_LOGS}" || display_msg --log "error" "Unable to make ${ALLSKY_LOGS}"

	MSG="STARTING ${IorR} OF ${V}.\n"
	display_msg --logonly info "${MSG}"
fi

[[ ${FIX} == "true" ]] && do_fix				# does not return


trap "handle_interrupts" SIGTERM SIGINT

# Install packages that may be needed very early in installation.
[[ -z ${FUNCTION} ]] && install_installer_dependencies

if [[ -z ${FUNCTION} && ${RESTORE} == "false" ]]; then

	check_if_supported_OS

	if [[ -s ${STATUS_FILE} ]]; then
		# Since there's an installation STATUS_FILE that means this isn't
		# the first installation of Allsky so we may be able to skip some steps.
		# Ask the user what they want to do.

		# When most function are called they add a variable
		# with the function's name set to "true".

		handle_prior_installation
	fi

	##### Keep track of current Allsky status
	mkdir -p "$( dirname "${ALLSKY_STATUS}" )"		# location of status file
	do_allsky_status "${ALLSKY_STATUS_INSTALLING}"

	##### Log some info to help in troubleshooting.
	log_info
fi

##### Does a prior Allsky exist? If so, set PRIOR_ALLSKY_STYLE and other PRIOR_* variables.
# Re-run every time in case the directory was removed.
does_prior_Allsky_exist

[[ ${RESTORE} == "true" ]] && do_restore		# does not return

##### Display the welcome header
[[ -z ${FUNCTION} ]] && do_initial_heading

##### See if we need to reboot at end of installation
if [[ -z ${FUNCTION} && ${USE_PRIOR_ALLSKY} == "true" ]]; then
	is_reboot_needed "${PRIOR_ALLSKY_VERSION}" "${ALLSKY_VERSION}"
fi

##### Determine what steps, if any, can be skipped.
set_what_can_be_skipped "${PRIOR_ALLSKY_VERSION}" "${ALLSKY_VERSION}"

##### Stop Allsky
stop_Allsky

##### Determine what camera(s) are connected
get_connected_cameras

##### Get branch
get_this_branch

##### Handle updates
[[ ${UPDATE} == "true" ]] && do_update		# does not return

##### See if there's an old WebUI
does_old_WebUI_location_exist

##### Executes the specified function, if any, and exits.
if [[ -n ${FUNCTION} ]]; then
	display_msg "${LOG_TYPE}" info "Calling FUNCTION '${FUNCTION}'"
	do_function "${FUNCTION}"				# does not return
fi

##### Display an image in the WebUI
display_image "InstallationInProgress"

# Do as much of the prompting up front, then do the long-running work, then prompt at the end.

##### Prompt to use prior Allsky
prompt_for_prior_Allsky		# Sets ${WILL_USE_PRIOR}

##### Get locale (prompt if needed).  May not return.
get_desired_locale

##### Prompt for the camera type
[[ ${select_camera_type} != "true" ]] && select_camera_type

##### Get the new host name
prompt_for_hostname

##### Check for sufficient swap space
check_swap "install" ""

##### Optionally make ${ALLSKY_TMP} a memory filesystem
check_tmp "install"

##### Tell the user it may take a while
display_wait_message

##### Install web server
# This must come BEFORE save_camera_capabilities, since it installs php.
install_webserver_et_al

##### Install dependencies, then compile and install Allsky software
# This will create the "config" directory and put default files in it.
install_dependencies_etc

##### Create the variables.json file based on variables.sh.
# The file may be needed by save_camera_capabilities.
create_variables_json "install"

##### Create the camera type/model-specific "options" file
# This should come after the steps above that create ${ALLSKY_CONFIG}.
save_camera_capabilities "false"

##### Re-create variables.json because some variables in variables.sh may have changed
# as a result of the settings file being updated.
create_variables_json "install"

##### Set locale.  May reboot instead of returning.
set_locale

##### Create the Allsky log files
create_allsky_logs "true"			# "true" == do everything

##### Install the overlay and modules system and things it needs
install_PHP_modules
install_Python
install_overlay

##### Get Website checksums for optional remote Website.
# Do this before we change the local Website files.
get_checksums

##### Restore prior files if needed.
# This MUST be called even if we know we're not using an OLD directory.
restore_prior_files

##### Restore prior Website files if needed.
# This has to come after restore_prior_files() since it may set some variables we need.
# This MUST be called even if we know we're not using an OLD directory.
restore_prior_website_files

##### Set permissions.  Want this at the end so we make sure we get all files.
# Re-run every time in case permissions changed.
set_permissions

##### Update the sudoers file
do_sudoers

##### Convert the legacy password format if required
do_legacy_password_conversion

##### Check if there's an old WebUI and let the user know it's no longer used.
# Prompt user to remove any prior old-style WebUI.
check_old_WebUI_location

##### See if we should reboot when installation is done.
# Call reboot_needed() in case an external function said we need to reboot.
if [[ ${REBOOT_NEEDED} == "true" ]] || reboot_needed ; then
	ask_reboot "full"			# prompts
fi

##### Display any necessary messaged about restored / not restored settings
# Re-run every time to possibly remind them to update their settings.
check_restored_settings

##### Migrate Overlays
update_overlays

##### Update any installed modules
update_modules

##### Allow the user to install modules
install_modules

##### Setup Database (If required)
setup_database

##### If needed, remind the user to remove any old Allsky version
# Re-run every time to remind the user again.
remind_old_version

######## All done
do_done

exit_installation 0 "${STATUS_OK}" ""
