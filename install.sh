#!/bin/bash
# shellcheck disable=SC2154		# referenced but not assigned

[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )" )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/installUpgradeFunctions.sh"	|| exit "${EXIT_ERROR_STOP}"

# Some versions of Linux default to 750 so web server can't read it
chmod 755 "${ALLSKY_HOME}"								|| exit "${EXIT_ERROR_STOP}"
cd "${ALLSKY_HOME}"  									|| exit "${EXIT_ERROR_STOP}"

# The POST_INSTALLATION_ACTIONS contains information the user needs to act upon after the reboot.
rm -f "${POST_INSTALLATION_ACTIONS}"		# Shouldn't be there, but just in case.
rm -f "${ALLSKY_MESSAGES}"					# Start out with no messages.


TITLE="Allsky Installer - ${ALLSKY_VERSION}"
FINAL_SUDOERS_FILE="/etc/sudoers.d/allsky"
OLD_RASPAP_DIR="/etc/raspap"			# used to contain WebUI configuration files
SETTINGS_FILE_NAME="$( basename "${SETTINGS_FILE}" )"
FORCE_CREATING_DEFAULT_SETTINGS_FILE="false"	# should a default settings file be created?
RESTORED_PRIOR_SETTINGS_FILE="false"
PRIOR_SETTINGS_FILE=""					# Full pathname to the prior settings file, if it exists
COPIED_PRIOR_CONFIG_SH="false"			# prior config.sh's settings copied to settings file?
COPIED_PRIOR_FTP_SH="false"				# prior ftp-settings.sh's settings copied to settings file?
SUGGESTED_NEW_HOST_NAME="allsky"		# Suggested new host name
NEW_HOST_NAME=""						# User-specified host name
BRANCH="${GITHUB_MAIN_BRANCH}"			# default branch
# shellcheck disable=SC2034
DISPLAY_MSG_LOG="${ALLSKY_LOGS}/install.sh.log"		# display_msg() sends log entries to this file.
LONG_BITS=$( getconf LONG_BIT ) # Size of a long, 32 or 64
REBOOT_NEEDED="true"					# Is a reboot needed at end of installation?
CONFIGURATION_NEEDED="true"				# Does Allsky need to be configured at end of installation?

##### Allsky versions.   ${ALLSKY_VERSION} is set in variables.sh
##xxx TODO: uncomment:    ALLSKY_BASE_VERSION="$( remove_point_release "${ALLSKY_VERSION}" )"
	# Base of first version with combined configuration files and all lowercase setting names.
COMBINED_BASE_VERSION="v2024.xx.xx"				#xxxxxxx TODO: update when release name is final
	# Base of first version with CAMERA_TYPE instead of CAMERA in config.sh and
	# "cameratype" in the settings file.
FIRST_CAMERA_TYPE_BASE_VERSION="v2023.05.01"
	# When ALLSKY_SCRIPTS was added to PATH, requiring a reboot:
SCRIPTS_PATH_ADDED_VERSION="v2023.05.01_04"
	# First Allsky version that used the "version" file.
	# It's also when ftp-settings.sh moved to ${ALLSKY_CONFIG}
FIRST_VERSION_VERSION="v2022.03.01"
	# Versions before ${FIRST_VERSION_VERSION} that didn't have version numbers.
PRE_FIRST_VERSION_VERSION="old"

##### Information on the prior Allsky version, if used
PRIOR_ALLSKY_STYLE=""			# Set to the style if they have a prior version
PRIOR_ALLSKY_VERSION=""			# The version number of the prior version, if known
PRIOR_ALLSKY_BASE_VERSION=""	# The base version number of the prior version, if known
PRIOR_CAMERA_TYPE=""
PRIOR_CAMERA_MODEL=""

# Holds status of installation if we need to exit and get back in.
STATUS_FILE="${ALLSKY_LOGS}/status.txt"
STATUS_FILE_TEMP="${ALLSKY_TMP}/temp_status.txt"	# holds intermediate status
STATUS_LOCALE_REBOOT="Rebooting to change locale"	# status of rebooting due to locale change
STATUS_FINISH_REBOOT="Rebooting to finish installation"
STATUS_NO_FINISH_REBOOT="Did not reboot to finish installation"
STATUS_NO_REBOOT="User elected not to reboot"
STATUS_NO_LOCALE="Desired locale not found"			# exiting due to desired locale not installed
STATUS_NO_CAMERA="No camera found"					# status of exiting due to no camera found
STATUS_OK="OK"										# Installation was completed.
STATUS_NOT_CONTINUE="User elected not to continue"	# Exiting, but not an error
STATUS_CLEAR="Clear"								# Clear the file
STATUS_ERROR="Error encountered"
STATUS_INT="Got interrupt"
STATUS_VARIABLES=()									# Holds all the variables and values to save

##### Set in installUpgradeFunctions.sh
# PRIOR_ALLSKY_DIR
# PRIOR_CONFIG_DIR
# PRIOR_REMOTE_WEBSITE_CONFIGURATION_FILE
# WEBSITE_CONFIG_VERSION, WEBSITE_ALLSKY_VERSION
# PRIOR_CONFIG_FILE, PRIOR_FTP_FILE
# PRIOR_PYTHON_VENV
# ALLSKY_DEFINES_INC, REPO_WEBUI_DEFINES_FILE
# REPO_SUDOERS_FILE, REPO_LIGHTTPD_FILE, REPO_AVI_FILE, REPO_OPTIONS_FILE


############################################## functions

####
#
do_initial_heading()
{
	if [[ ${UPDATE} == "true" ]]; then
		display_header "Updating Allsky"
		return
	fi

	local MSG

	declare -n v="${FUNCNAME[0]}"
	if [[ ${v} == "true" ]]; then
		display_header "Welcome back to the ${TITLE}!"
	else
		MSG="Welcome to the ${TITLE}!\n"

		if [[ -n ${PRIOR_ALLSKY_STYLE} ]]; then
			MSG+="\nYou will be asked if you want to use the images and darks (if any) from"
			MSG+=" your prior version of Allsky."
			if [[ ${PRIOR_ALLSKY_STYLE} == "${NEW_STYLE_ALLSKY}" ]]; then
				MSG+="\nIf so, its settings will be used as well."
			else
				MSG+="\nIf so, we will attempt to use its settings as well, but may not be"
				MSG+="\nable to use ALL prior settings depending on how old your prior Allsky is."
				MSG+="\nIn that case, you'll be prompted for required information such as"
				MSG+="\nthe camera's latitude, logitude, and locale."
			fi
		else
			MSG+="\nYou will be prompted for required information such as the type"
			MSG+="\nof camera you have and the camera's latitude, logitude, and locale."
		fi

		MSG+="\n\nNOTE: your camera must be connected to the Pi before continuing."
		MSG+="\n\nContinue?"
		if ! whiptail --title "${TITLE}" --yesno "${MSG}" 25 "${WT_WIDTH}"  3>&1 1>&2 2>&3; then
			display_msg "${LOG_TYPE}" info "User not ready to continue."
			exit_installation 1 "${STATUS_CLEAR}" ""
		fi

		display_header "Welcome to the ${TITLE}"
	fi

	declare -n v="${FUNCNAME[0]}"; [[ ${v} != "true" ]] && STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")
}

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
	MSG="Usage: ${ME} [--help] [--debug [...]] [--fix] [--update] [--function function]"
	{
		echo -e "\n${C}${MSG}${NC}"
		echo
		echo "'--help' displays this message and exits."
		echo
		echo "'--debug' displays debugging information. Can be called multiple times to increase level."
		echo
		echo "'--fix' should only be used when instructed to by the Allsky Website."
		echo
		echo "'--update' should only be used when instructed to by the Allsky Website."
		echo
		echo "'--function' executes the specified function and quits."
		echo
	} >&2
	exit_installation "${RET}"
}


####
# Stop Allsky.  If it's not running, nothing happens.
stop_allsky()
{
	sudo systemctl stop allsky 2> /dev/null
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
##### Execute any specified function, then exit.
do_function()
{
	local FUNCTION="${1}"
	shift

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
		display_msg --log error "Unknown CAMERA_TYPE: '${CAMERA_TYPE}'"
		exit_installation 1 "${STATUS_ERROR}" "unknown CAMERA_TYPE: '${CAMERA_TYPE}'"
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
		display_msg --log error "Unknown CAMERA: '${CAMERA}'"
		exit_installation 1 "${STATUS_CLEAR}" "unknown CAMERA: '${CAMERA}'"
	fi
}

#######
CONNECTED_CAMERAS=""
# TODO: Make arrays and allow multiple cameras of each camera type
RPI_MODEL="HQ, Module 3, and compatibles"
ZWO_MODEL="ASI"

get_connected_cameras()
{
	local C CC Z MSG
	# RPI_MODEL, ZWO_MODEL, and CONNECTED_CAMERAS are global

	# Check if there is an RPi camera connected, and if so, determine what command
	# to use to control it.
	if C="$( determineCommandToUse "false" "" 2>&1 )" ; then
		if [[ "${C}" == "libcamera-still" ]]; then
			# Only get the first camera.
			RPI_MODEL="$( LIBCAMERA_LOG_LEVELS="ERROR,FATAL" libcamera-still --list-cameras 2>&1 |
				awk '{if ($2 == ":") { print $3; exit 0; }}' )"
		else
			:   # XXXXXXXXX  TODO: How to determine with raspicam?
		fi
		display_msg --log progress "RPi ${RPI_MODEL} camera found."
		CC="RPi"
	fi

	# Check if there is a USB-based camera, i.e., ZWO (03c3).
	if Z="$( lsusb --verbose -d "03c3:" 2>/dev/null )" ; then
		ZWO_MODEL="$( echo "${Z}" |
				awk '{if ($1 == "iProduct") { print $3; exit 0; }}' )"
		display_msg --log progress "ZWO ${ZWO_MODEL} camera found."
		[[ -n ${CC} ]] && CC+=" "
		CC+="ZWO"
	fi

	if [[ -z ${CC} ]]; then
		MSG="No connected cameras were detected.  The installation will exit."
		whiptail --title "${TITLE}" --msgbox "${MSG}" 12 "${WT_WIDTH}" 3>&1 1>&2 2>&3

		MSG="No connected cameras were detected."
		MSG+="\nMake sure a camera is plugged in and working prior to restarting"
		MSG+=" the installation."
		display_msg --log error "${MSG}"
		exit_installation 1 "${STATUS_NO_CAMERA}" ""
	fi

	if [[ -n ${CONNECTED_CAMERAS} ]]; then
		# Set from a prior installation.
		if [[ ${CONNECTED_CAMERAS} != "${CC}" ]]; then
			MSG="Connected cameras were '${CONNECTED_CAMERAS}' during last installation"
			MSG+=" but are '${CC}' now."
			display_msg --log info "${MSG}"
			STATUS_VARIABLES+=("CONNECTED_CAMERAS='${CC}'\n")
		fi
		# Else the last one and this one are the same so don't save.
		CONNECTED_CAMERAS="${CC}"
		return
	fi

	CONNECTED_CAMERAS="${CC}"	# Either not set before or is different this time

	declare -n v="${FUNCNAME[0]}";
	[[ ${v} != "true" ]] && STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")
}

#
# Prompt the user to select their camera type, if we can't determine it automatically.
# If they have a prior installation of Allsky that uses either CAMERA or CAMERA_TYPE in config.sh,
# we can use its value and not prompt.
CAMERA_TYPE=""
select_camera_type()
{
	local MSG  CAMERA  NEW  CT  NUM_RPI=0  NUM_ZWO=0  S  CAMERA_INFO  NUM
	# CAMERA_TYPE is global

	if [[ -n ${PRIOR_ALLSKY_STYLE} ]]; then
		# bash doesn't have ">=" so we have to use "! ... < "
		if [[ ! ${PRIOR_ALLSKY_VERSION} < "${FIRST_CAMERA_TYPE_BASE_VERSION}" ]]; then
			# New style Allsky using ${CAMERA_TYPE}.
			CAMERA_TYPE="${PRIOR_CAMERA_TYPE}"

			if [[ -n ${CAMERA_TYPE} ]]; then
				MSG="Using Camera Type '${CAMERA_TYPE}' from prior Allsky."
				STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")
				STATUS_VARIABLES+=("CAMERA_TYPE='${CAMERA_TYPE}'\n")
				display_msg --logonly info "${MSG}"
				return
			else
				MSG="Camera Type not in prior new-style settings file."
				display_msg --log error "${MSG}"
			fi
		else
			# Older style using ${CAMERA}
			CAMERA="$( get_variable "CAMERA" "${PRIOR_CONFIG_FILE}" )"
			if [[ -n ${CAMERA} ]]; then
				CAMERA_TYPE="$( CAMERA_to_CAMERA_TYPE "${CAMERA}" )"
				STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")
				STATUS_VARIABLES+=("CAMERA_TYPE='${CAMERA_TYPE}'\n")
				if [[ ${CAMERA} != "${CAMERA_TYPE}" ]]; then
					NEW=" (now called ${CAMERA_TYPE})"
				else
					NEW=""
				fi
				display_msg --log progress "Using prior ${CAMERA} camera${NEW}."
				return
			else
				MSG="CAMERA not in prior old-style config.sh."
				display_msg --log warning "${MSG}"
			fi
		fi
	fi

	CT=()			# Camera Type array - what to display in whiptail
	if [[ ${CONNECTED_CAMERAS} =~ "RPi" ]]; then
		CT+=("${NUM_RPI}_RPi_${RPI_MODEL}" "RPi     ${RPI_MODEL}")
		((NUM_RPI++))
	fi
	if [[ ${CONNECTED_CAMERAS} =~ "ZWO" ]]; then
		CT+=("${NUM_ZWO}_ZWO_${ZWO_MODEL}" "ZWO     ${ZWO_MODEL}")
		((NUM_ZWO++))
	fi
	NUM=$(( NUM_RPI + NUM_ZWO ))
	if [[ ${NUM} -eq 0 ]]; then		# shouldn't happen since we already checked
		MSG="INTERNAL ERROR:"
		if [[ -z ${CONNECTED_CAMERAS} ]]; then
			MSG+=" CONNECTED_CAMERAS is empty."
		else
			MSG+=" CONNECTED_CAMERAS (${CONNECTED_CAMERAS}) is invalid."
		fi
		display_msg --log error "${MSG}"
		exit_installation 2 "${STATUS_NO_CAMERA}" "${MSG}"
	fi

	S=" is"
	[[ ${NUM} -gt 1 ]] && S="s are"
	MSG="\nThe following camera${S} connected to the Pi.\n"
	MSG+="Pick the one you want."
	MSG+="\nIf it's not in the list, select <Cancel> and determine why."
	CAMERA_INFO=$( whiptail --title "${TITLE}" --notags --menu "${MSG}" 15 "${WT_WIDTH}" "${NUM}" \
		"${CT[@]}" 3>&1 1>&2 2>&3 )
	if [[ $? -ne 0 ]]; then
		MSG="Camera selection required."
		MSG+=" Please re-run the installation and select a camera to continue."
		display_msg --log warning "${MSG}"
		exit_installation 2 "${STATUS_NO_CAMERA}" "User did not select a camera."
	fi
	# CAMERA_INFO is:    number_type_model
# TODO: CAMERA_NUMBER not used yet
	CAMERA_NUMBER="${CAMERA_INFO%%_*}"				# before first "_"
	CAMERA_MODEL="${CAMERA_INFO##*_}"				# after last "_"
	CAMERA_INFO="${CAMERA_INFO/${CAMERA_NUMBER}_/}"	# Now:  type_model
	CAMERA_TYPE="${CAMERA_INFO%_*}"					# before "_"

	display_msg --log progress "Using user-selected ${CAMERA_TYPE} ${CAMERA_MODEL} camera."
	STATUS_VARIABLES+=("CAMERA_TYPE='${CAMERA_TYPE}'\n")
	STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")
}

####
# If the raspistill command exists on post-Buster releases,
# rename it so it's not used.
check_for_raspistill()
{
	declare -n v="${FUNCNAME[0]}"; [[ ${v} == "true" ]] && return
	local W

	if W="$( which raspistill )" && [[ ${PI_OS} != "buster" ]]; then
		display_msg --longonly info "Renaming 'raspistill' on ${PI_OS}."
		sudo mv "${W}" "${W}-OLD"
	fi

	STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")
}


####
# Update various PHP define() variables.
update_php_defines()
{
	declare -n v="${FUNCNAME[0]}"; [[ ${v} == "true" ]] && return
	local FILE

	display_msg --log progress "Modifying variables for WebUI and Website."
	FILE="${ALLSKY_WEBUI}/includes/${ALLSKY_DEFINES_INC}"
	sed		-e "s;XX_HOME_XX;${HOME};" \
			-e "s;XX_ALLSKY_HOME_XX;${ALLSKY_HOME};" \
			-e "s;XX_ALLSKY_CONFIG_XX;${ALLSKY_CONFIG};" \
			-e "s;XX_ALLSKY_SCRIPTS_XX;${ALLSKY_SCRIPTS};" \
			-e "s;XX_ALLSKY_TMP_XX;${ALLSKY_TMP};" \
			-e "s;XX_ALLSKY_IMAGES_XX;${ALLSKY_IMAGES};" \
			-e "s;XX_ALLSKY_MESSAGES_XX;${ALLSKY_MESSAGES};" \
			-e "s;XX_ALLSKY_WEBUI_XX;${ALLSKY_WEBUI};" \
			-e "s;XX_ALLSKY_WEBSITE_XX;${ALLSKY_WEBSITE};" \
			-e "s;XX_ALLSKY_WEBSITE_LOCAL_CONFIG_NAME_XX;${ALLSKY_WEBSITE_CONFIGURATION_NAME};" \
			-e "s;XX_ALLSKY_WEBSITE_REMOTE_CONFIG_NAME_XX;${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_NAME};" \
			-e "s;XX_ALLSKY_WEBSITE_LOCAL_CONFIG_XX;${ALLSKY_WEBSITE_CONFIGURATION_FILE};" \
			-e "s;XX_ALLSKY_WEBSITE_REMOTE_CONFIG_XX;${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE};" \
			-e "s;XX_ALLSKY_OWNER_XX;${ALLSKY_OWNER};" \
			-e "s;XX_ALLSKY_GROUP_XX;${ALLSKY_GROUP};" \
			-e "s;XX_WEBSERVER_OWNER_XX;${WEBSERVER_OWNER};" \
			-e "s;XX_WEBSERVER_GROUP_XX;${WEBSERVER_GROUP};" \
			-e "s;XX_ALLSKY_REPO_XX;${ALLSKY_REPO};" \
			-e "s;XX_ALLSKY_VERSION_XX;${ALLSKY_VERSION};" \
			-e "s;XX_RASPI_CONFIG_XX;${ALLSKY_CONFIG};" \
			-e "s;XX_ALLSKY_OVERLAY_XX;${ALLSKY_OVERLAY};" \
			-e "s;XX_MY_OVERLAY_TEMPLATES_XX;${MY_OVERLAY_TEMPLATES};" \
			-e "s;XX_ALLSKY_MODULES_XX;${ALLSKY_MODULES};" \
		"${REPO_WEBUI_DEFINES_FILE}"  >  "${FILE}"
		chmod 644 "${FILE}"

	sed -i -e "s;XX_ALLSKY_CONFIG_XX;${ALLSKY_CONFIG};" "${ALLSKY_WEBSITE}/functions.php"

	# Don't save status if we did a fix.
	if [[ ${FIX} == "false" ]]; then
		STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")
	fi
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
	if [[ -z ${CAMERA_TYPE} ]]; then
		display_msg --log error "INTERNAL ERROR: CAMERA_TYPE not set in save_camera_capabilities()."
		return 1
	fi

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
		display_msg --log progress "Setting up WebUI options${MSG} for ${CAMERA_TYPE} cameras."
	fi

	# Restore the prior settings file or camera-specific settings file(s) so
	# the appropriate one can be used by makeChanges.sh.
	[[ ${PRIOR_ALLSKY_STYLE} != "" ]] && restore_prior_settings_file

	display_msg --log progress "Making new settings file '${SETTINGS_FILE}'."

	MSG="Executing makeChanges.sh${FORCE}${OPTIONSONLY} --cameraTypeOnly"
	MSG+="  ${DEBUG_ARG} 'cameratype' 'Camera Type' '${PRIOR_CAMERA_TYPE}' '${CAMERA_TYPE}'"
	display_msg "${LOG_TYPE}" info "${MSG}"

	ERR="/tmp/makeChanges.errors.txt"
	#shellcheck disable=SC2086
	M="$( "${ALLSKY_SCRIPTS}/makeChanges.sh" ${FORCE} ${OPTIONSONLY} --cameraTypeOnly \
		${DEBUG_ARG} "cameratype" "Camera Type" "${PRIOR_CAMERA_TYPE}" "${CAMERA_TYPE}" 2> "${ERR}" )"
	RET=$?
	if [[ ${RET} -ne 0 ]]; then
		[[ -n ${X} ]] && display_msg --log info "${X}"
		if [[ ${RET} -eq ${EXIT_NO_CAMERA} ]]; then
			MSG="No camera was found; one must be connected and working for the installation to succeed.\n"
			MSG+="After connecting your camera, re-run the installation."
			whiptail --title "${TITLE}" --msgbox "${MSG}" 12 "${WT_WIDTH}" 3>&1 1>&2 2>&3
			display_msg --log error "No camera detected - installation aborted."
			exit_with_image 1 "${STATUS_ERROR}" "No camera detected"
		elif [[ ${OPTIONSFILEONLY} == "false" ]]; then
			display_msg --log error "Unable to save camera capabilities."
		fi
		return 1
	else
		[[ -n ${M} ]] && display_msg --logonly info "${M}"
		if [[ -s ${ERR} ]]; then
			display_msg --log error "$( < "${ERR}" )"
		fi

		if [[ ! -f ${SETTINGS_FILE} ]]; then
			display_msg --log error "Settings file not created; cannot continue."
			return 1
		fi
	fi

	#shellcheck disable=SC2012
	MSG="$( /bin/ls -l "${ALLSKY_CONFIG}/settings"*.json 2>/dev/null | sed 's/^/    /' )"
	display_msg --logonly info "Settings files:\n${MSG}"
	CAMERA_MODEL="$( settings ".cameramodel" "${SETTINGS_FILE}" )"
	if [[ -z ${CAMERA_MODEL} ]]; then
		display_msg --log error "cameramodel not found in settings file."
		return 1
	fi

	return 0
}


####
# Update the sudoers file so the web server can execute certain commands with sudo.
do_sudoers()
{
	declare -n v="${FUNCNAME[0]}"; [[ ${v} == "true" ]] && return

	display_msg --log progress "Creating/updating sudoers file."
	sed -e "s;XX_ALLSKY_SCRIPTS_XX;${ALLSKY_SCRIPTS};" "${REPO_SUDOERS_FILE}"  >  /tmp/x
	sudo install -m 0644 /tmp/x "${FINAL_SUDOERS_FILE}" && rm -f /tmp/x

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
		display_msg --logonly info "User elected not to reboot."

		MSG="If you have not already rebooted your Pi, please do so now.\n"
		MSG+="You can then connect to the WebUI at:\n"
		MSG+="${AT}"
		"${ALLSKY_SCRIPTS}/addMessage.sh" "info" "${MSG}"
	fi
}
do_reboot()
{
	exit_installation -1 "${1}" "${2}"		# -1 means just log ending statement but don't exit.
	sudo reboot now
}


####
# Check for size of RAM+swap during installation (Issue # 969).
# recheck_swap is used to check swap after the installation,
# and is referenced in the Allsky Documentation.
recheck_swap()
{
	check_swap "prompt"
}
check_swap()
{
	PROMPT="false"
	[[ ${1} == "prompt" ]] && PROMPT="true"

	declare -n v="${FUNCNAME[0]}"; [[ ${v} == "true" && ${PROMPT} == "false" ]] && return
	local PROMPT  RAM_SIZE DESIRED_COMBINATION SUGGESTED_SWAP_SIZE CURRENT_SWAP
	local SWAP_CONFIG_FILE  AMT  M  SWAP_SIZE  CURRENT_MAX

	# This can return "total_mem is unknown" if the OS is REALLY old.
	RAM_SIZE="$( vcgencmd get_config total_mem )"
	if [[ ${RAM_SIZE} =~ "unknown" ]]; then
		# Note: This doesn't produce exact results.  On a 4 GB Pi, it returns 3.74805.
		RAM_SIZE=$( free --mebi | awk '{if ($1 == "Mem:") {print $2; exit 0} }' )		# in MB
	else
		RAM_SIZE="${RAM_SIZE//total_mem=/}"
	fi
	DESIRED_COMBINATION=$((1024 * 5))		# desired minimum memory + swap
	SUGGESTED_SWAP_SIZE=0
	for i in 512 1024 2048 4096		# 8192 and above don't need any swap
	do
		if [[ ${RAM_SIZE} -le ${i} ]]; then
			SUGGESTED_SWAP_SIZE=$((DESIRED_COMBINATION - i))
			break
		fi
	done
	display_msg --logonly info "RAM_SIZE=${RAM_SIZE}, SUGGESTED_SWAP_SIZE=${SUGGESTED_SWAP_SIZE}."

	# Not sure why, but displayed swap is often 1 MB less than what's in /etc/dphys-swapfile
	CURRENT_SWAP=$( free --mebi | awk '{if ($1 == "Swap:") {print $2 + 1; exit 0} }' )	# in MB
	CURRENT_SWAP=${CURRENT_SWAP:-0}
	if [[ ${CURRENT_SWAP} -lt ${SUGGESTED_SWAP_SIZE} || ${PROMPT} == "true" ]]; then
		SWAP_CONFIG_FILE="/etc/dphys-swapfile"

		[[ -z ${FUNCTION} ]] && sleep 2		# give user time to read prior messages
		if [[ ${CURRENT_SWAP} -eq 1 ]]; then
			CURRENT_SWAP=0
			AMT="no"
			M="added"
		else
			AMT="${CURRENT_SWAP} MB of"
			M="increased"
		fi
		MSG="\nYour Pi currently has ${AMT} swap space."
		MSG+="\nBased on your memory size of ${RAM_SIZE} MB,"
		if [[ ${CURRENT_SWAP} -ge ${SUGGESTED_SWAP_SIZE} ]]; then
			SUGGESTED_SWAP_SIZE=${CURRENT_SWAP}
			MSG+=" there is no need to change anything, but you can if you would like."
		else
			MSG+=" we suggest ${SUGGESTED_SWAP_SIZE} MB of swap"
			MSG+=" to decrease the chance of timelapse and other failures."
			MSG+="\n\nDo you want swap space ${M}?"
			MSG+="\n\nYou may change the amount of swap space by changing the number below."
		fi

		SWAP_SIZE=$( whiptail --title "${TITLE}" --inputbox "${MSG}" 18 "${WT_WIDTH}" \
			"${SUGGESTED_SWAP_SIZE}" 3>&1 1>&2 2>&3 )
		# If the suggested swap was 0 and the user added a number but didn't first delete the 0,
		# do it now so we don't have numbers like "0256".
		[[ ${SWAP_SIZE:0:1} == "0" ]] && SWAP_SIZE="${SWAP_SIZE:1}"

		if [[ -z ${SWAP_SIZE} || ${SWAP_SIZE} == "0" ]]; then
			if [[ ${CURRENT_SWAP} -eq 0 && ${SUGGESTED_SWAP_SIZE} -gt 0 ]]; then
				display_msg --log warning "With no swap space you run the risk of programs failing."
			else
				display_msg --log info "Swap will remain at ${CURRENT_SWAP}."
			fi
		else
			display_msg --log progress "Setting swap space to ${SWAP_SIZE} MB."
			sudo dphys-swapfile swapoff					# Stops the swap file
			sudo sed -i "/CONF_SWAPSIZE/ c CONF_SWAPSIZE=${SWAP_SIZE}" "${SWAP_CONFIG_FILE}"

			CURRENT_MAX="$( get_variable "CONF_MAXSWAP" "${SWAP_CONFIG_FILE}" )"
			# TODO: Can we determine the default max rather than hard-code it.
			CURRENT_MAX="${CURRENT_MAX:-2048}"
			if [[ ${CURRENT_MAX} -lt ${SWAP_SIZE} ]]; then
				if [[ ${DEBUG} -gt 0 ]]; then
					display_msg --log debug "Increasing max swap size to ${SWAP_SIZE} MB."
				fi
				sudo sed -i "/CONF_MAXSWAP/ c CONF_MAXSWAP=${SWAP_SIZE}" "${SWAP_CONFIG_FILE}"
			fi

			sudo dphys-swapfile setup  > /dev/null		# Sets up new swap file
			sudo dphys-swapfile swapon					# Turns on new swap file
		fi
	else
		MSG="Size of current swap (${CURRENT_SWAP} MB) is sufficient; no change needed."
		display_msg --log progress "${MSG}"
	fi

	STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")
}


####
# Check if ${ALLSKY_TMP} exists, and if it does,
# save any *.jpg files (which we probably created), then remove everything else,
# then mount it.
check_and_mount_tmp()
{
	local TMP_DIR="/tmp/IMAGES"

	if [[ -d "${ALLSKY_TMP}" ]]; then
		mkdir -p "${TMP_DIR}"
		find "${ALLSKY_TMP}" \( -name '*.jpg' -o -name '*.png' \) -exec mv '{}' "${TMP_DIR}" \;
		rm -f "${ALLSKY_TMP}"/*
	else
		mkdir "${ALLSKY_TMP}"
	fi

	# Now mount and restore any images that were there before
	sudo systemctl daemon-reload 2> /dev/null
	sudo mount -a

	if [[ -d ${TMP_DIR} ]]; then
		mv "${TMP_DIR}"/* "${ALLSKY_TMP}" 2>/dev/null
		rmdir "${TMP_DIR}"
	fi
}


####
# Check if prior ${ALLSKY_TMP} was a memory filesystem.
# If not, offer to make it one.
check_tmp()
{
	declare -n v="${FUNCNAME[0]}"; [[ ${v} == "true" ]] && return
	local STRING  SIZE  D  MSG  INITIAL_FSTAB_STRING="tmpfs ${ALLSKY_TMP} tmpfs"

	# Check if currently a memory filesystem.
	if grep --quiet "^${INITIAL_FSTAB_STRING}" /etc/fstab; then
		MSG="${ALLSKY_TMP} is currently a memory filesystem; no change needed."
		display_msg --log progress "${MSG}"

		# If there's a prior Allsky version and it's tmp directory is mounted,
		# try to unmount it, but that often gives an error that it's busy,
		# which isn't really a problem since it'll be unmounted at the reboot.
		# We know from the grep above that /etc/fstab has ${ALLSKY_TMP}
		# but the mount point is currently in the PRIOR Allsky.
		D="${PRIOR_ALLSKY_DIR}/tmp"
		if [[ -d "${D}" ]] && mount | grep --silent "${D}" ; then
			# The Samba daemon is one known cause of "target busy".
			sudo umount -f "${D}" 2> /dev/null ||
				{
					sudo systemctl restart smbd 2> /dev/null
					sudo umount -f "${D}" 2> /dev/null
				}
		fi

		STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")

		# If the new Allsky's ${ALLSKY_TMP} is already mounted, don't do anything.
		# This would be the case during an upgrade.
		if mount | grep --silent "${ALLSKY_TMP}" ; then
			display_msg --logonly info "${ALLSKY_TMP} already mounted."
			return 0
		fi

		check_and_mount_tmp		# works on new ${ALLSKY_TMP}
		return 0
	fi

	SIZE=75		# MB - should be enough
	MSG="Making ${ALLSKY_TMP} reside in memory can drastically decrease the amount"
	MSG+=" of writes to the SD card, increasing its life."
	MSG+="\n\nDo you want to make it reside in memory?"
	MSG+="\n\nNote: anything in it will be deleted whenever the Pi is rebooted,"
	MSG+=" but that's not an issue since the directory only contains temporary files."
	if whiptail --title "${TITLE}" --yesno "${MSG}" 15 "${WT_WIDTH}"  3>&1 1>&2 2>&3; then
		STRING="${INITIAL_FSTAB_STRING} size=${SIZE}M,noatime,lazytime,nodev,"
		STRING+="nosuid,mode=775,uid=${ALLSKY_OWNER},gid=${WEBSERVER_GROUP}"
		if ! echo "${STRING}" | sudo tee -a /etc/fstab > /dev/null ; then
			display_msg --log error "Unable to update /etc/fstab"
			return 1
		fi
		check_and_mount_tmp
		display_msg --log progress "${ALLSKY_TMP} is now in memory."
	else
		display_msg --log info "${ALLSKY_TMP} will remain on disk."
		mkdir -p "${ALLSKY_TMP}"
	fi

	STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")
}


####
# If the return code -ne 0
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
# Install the web server.
install_webserver_et_al()
{
	declare -n v="${FUNCNAME[0]}"	# do not return

	sudo systemctl stop hostapd 2> /dev/null
	sudo systemctl stop lighttpd 2> /dev/null

	if [[ ${v} == "true" ]]; then
		# Already installed it; just configure it.
		display_msg --log progress "Preparing the web server."
	else
		display_msg --log progress "Installing the web server."
		TMP="${ALLSKY_LOGS}/lighttpd.install.log"
		{
			sudo apt-get update && \
				sudo apt-get --assume-yes install lighttpd php-cgi php-gd hostapd dnsmasq avahi-daemon
		} > "${TMP}" 2>&1
		check_success $? "lighttpd installation failed" "${TMP}" "${DEBUG}" ||
			exit_with_image 1 "${STATUS_ERROR}" "lighttpd installation failed"
	fi

	FINAL_LIGHTTPD_FILE="/etc/lighttpd/lighttpd.conf"
	sed \
		-e "s;XX_ALLSKY_WEBUI_XX;${ALLSKY_WEBUI};g" \
		-e "s;XX_WEBSERVER_OWNER_XX;${WEBSERVER_OWNER};g" \
		-e "s;XX_WEBSERVER_GROUP_XX;${WEBSERVER_GROUP};g" \
		-e "s;XX_ALLSKY_HOME_XX;${ALLSKY_HOME};g" \
		-e "s;XX_ALLSKY_IMAGES_XX;${ALLSKY_IMAGES};g" \
		-e "s;XX_ALLSKY_CONFIG_XX;${ALLSKY_CONFIG};g" \
		-e "s;XX_ALLSKY_WEBSITE_XX;${ALLSKY_WEBSITE};g" \
		-e "s;XX_ALLSKY_DOCUMENTATION_XX;${ALLSKY_DOCUMENTATION};g" \
		-e "s;XX_ALLSKY_OVERLAY_XX;${ALLSKY_OVERLAY};g" \
		-e "s;XX_MY_OVERLAY_TEMPLATES_XX;${MY_OVERLAY_TEMPLATES};g" \
			"${REPO_LIGHTTPD_FILE}"  >  /tmp/x
	sudo install -m 0644 /tmp/x "${FINAL_LIGHTTPD_FILE}" && rm -f /tmp/x

	# Ignore output since it may already be enabled.
	sudo lighty-enable-mod fastcgi-php > /dev/null 2>&1

	# Remove any old log files.
	# Start off with a 0-length log file the user can write to.
	local D="/var/log/lighttpd"
	sudo chmod 755 "${D}"
	sudo rm -fr "${D}"/*
	local LIGHTTPD_LOG="${D}/error.log"
	sudo touch "${LIGHTTPD_LOG}"
	sudo chmod 664 "${LIGHTTPD_LOG}"
	sudo chown "${WEBSERVER_GROUP}:${ALLSKY_GROUP}" "${LIGHTTPD_LOG}"

	sudo systemctl start lighttpd
	# Starting it added an entry so truncate the file so it's 0-length
	sleep 1; truncate -s 0 "${LIGHTTPD_LOG}"

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
		sudo sed -i "s/127.0.1.1.*${CURRENT_HOSTNAME}/127.0.1.1\t${NEW_HOST_NAME}/" /etc/hosts

	# else, they didn't change the default name, but that's their problem...
	fi

	# Set up the avahi daemon if needed.
	FINAL_AVI_FILE="/etc/avahi/avahi-daemon.conf"
	[[ -f ${FINAL_AVI_FILE} ]] && grep -i --quiet "host-name=${NEW_HOST_NAME}" "${FINAL_AVI_FILE}"
	if [[ $? -ne 0 ]]; then
		# New NEW_HOST_NAME is not found in the file, or the file doesn't exist,
		# so need to configure it.
		display_msg --log progress "Configuring avahi-daemon."

		sed "s/XX_HOST_NAME_XX/${NEW_HOST_NAME}/g" "${REPO_AVI_FILE}" > /tmp/x
		sudo install -m 0644 /tmp/x "${FINAL_AVI_FILE}" && rm -f /tmp/x
	fi

	STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")
}


####
# Set permissions on various web-related items.
# Do every time - doesn't hurt to re-do them.
set_permissions()
{
	display_msg --log progress "Setting permissions on web-related files."

	# Make sure the currently running user can run sudo on anything and
	# can write to the webserver root (is in the webserver group).
	local G="$( id "${ALLSKY_OWNER}" )"

	#shellcheck disable=SC2076
	if ! [[ ${G} =~ "(sudo)" ]]; then
		display_msg --log progress "Adding ${ALLSKY_OWNER} to sudo group."

		### TODO:  Hmmm.  We need to run "sudo" to add to the group,
		### but we don't have "sudo" permissions yet... so this will likely fail:

		sudo adduser --quiet "${ALLSKY_OWNER}" "sudo"
	fi

	#shellcheck disable=SC2076
	if ! [[ ${G} =~ "(${WEBSERVER_GROUP})" ]]; then
		display_msg --log progress "Adding ${ALLSKY_OWNER} to ${WEBSERVER_GROUP} group."
		sudo adduser --quiet "${ALLSKY_OWNER}" "${WEBSERVER_GROUP}"

		# TODO: We had a case where the login shell wasn't in the group after "adduser"
		# until the user logged out and back in.
		# And this was AFTER he ran install.sh and rebooted.
		# Not sure what to do about that...
	fi

	# The web server needs to be able to create and update many of the files in ${ALLSKY_CONFIG}.
	# Not all, but go ahead and chgrp all of them so we don't miss any new ones.
	sudo find "${ALLSKY_CONFIG}/" -type f -exec chmod 664 '{}' \;
	sudo find "${ALLSKY_CONFIG}/" -type d -exec chmod 775 '{}' \;
	sudo chgrp -R "${WEBSERVER_GROUP}" "${ALLSKY_CONFIG}"

	sudo mkdir -p "${ALLSKY_MODULE_LOCATION}/modules"
	sudo chgrp -R "${WEBSERVER_GROUP}" "${ALLSKY_MODULE_LOCATION}"
	sudo chmod -R 775 "${ALLSKY_MODULE_LOCATION}"			

	# The files should already be the correct permissions/owners, but just in case, set them.
	# We don't know what permissions may have been on the old website, so use "sudo".
	sudo find "${ALLSKY_WEBUI}/" -type f -exec chmod 644 '{}' \;
	sudo find "${ALLSKY_WEBUI}/" -type d -exec chmod 755 '{}' \;

	# Exceptions to files at 644:
	chmod 755	"${ALLSKY_WEBUI}/includes/createAllskyOptions.php" \
				"${ALLSKY_WEBUI}/includes/convertJSON.php"

	chmod 775 "${ALLSKY_TMP}"
	sudo chgrp "${WEBSERVER_GROUP}" "${ALLSKY_TMP}"

	#### Website files

	# These directories aren't in GitHub so need to be manually created.
	mkdir -p \
		"${ALLSKY_WEBSITE}/videos/thumbnails" \
		"${ALLSKY_WEBSITE}/keograms/thumbnails" \
		"${ALLSKY_WEBSITE}/startrails/thumbnails"

	# Not everything in the Website needs to be writable by the web server,
	# but make them all that way so we don't worry about missing something.
	sudo find "${ALLSKY_WEBSITE}" -type d -exec chmod 775 '{}' \;
	sudo find "${ALLSKY_WEBSITE}" -type f -exec chmod 664 '{}' \;
	sudo chgrp --recursive "${WEBSERVER_GROUP}" "${ALLSKY_WEBSITE}"
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

# If the old WebUI location is there:
#	but it wasn't when the installation started,
#	that means the installation created it so remove it.
#
#	Let the user know if there's an old WebUI, or something unknown there.

check_old_WebUI_location()
{
	declare -n v="${FUNCNAME[0]}"; [[ ${v} == "true" ]] && return

	[[ ! -d ${OLD_WEBUI_LOCATION} ]] && return

	if [[ ${OLD_WEBUI_LOCATION_EXISTS_AT_START} == "false" ]]; then
		# Installation created the directory so get rid of it.
		sudo rm -fr "${OLD_WEBUI_LOCATION}"
		return
	fi

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

			echo -e "\n\n==========\n${MSG}" >> "${POST_INSTALLATION_ACTIONS}"
		fi
		return
	fi

	MSG="An old version of the WebUI was found in ${OLD_WEBUI_LOCATION};"
	MSG+=" it is no longer being used so you may remove it after intallation."
	MSG+="\n\nWARNING: if you have any other web sites in that directory,"
	MSG+="\n\n they will no longer be accessible via the web server."
	whiptail --title "${TITLE}" --msgbox "${MSG}" 15 "${WT_WIDTH}"   3>&1 1>&2 2>&3
	display_msg --log notice "${MSG}"
	echo -e "\n\n==========\n${MSG}" >> "${POST_INSTALLATION_ACTIONS}"

	STATUS_VARIABLES+=( "${FUNCNAME[0]}='true'\n" )
}


####
# Get the locale, prompting if we can't determine it.
DESIRED_LOCALE=""
CURRENT_LOCALE=""
get_desired_locale()
{
	declare -n v="${FUNCNAME[0]}"; [[ ${v} == "true" ]] && return

	# A lot of people have the incorrect locale so prompt for the correct one.

	# List of all installed locales, ignoring any lines with ":" which
	# are usually error messages.
	local INSTALLED_LOCALES="$( locale -a 2>/dev/null | grep -E -v "^C$|:" | sed 's/utf8/UTF-8/' )"
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
	local MSG2=""
	if [[ -z ${DESIRED_LOCALE} && -n ${PRIOR_ALLSKY_STYLE} && -n ${PRIOR_SETTINGS_FILE} ]]; then
		# People rarely change locale once set, so assume they still want the prior one.
		DESIRED_LOCALE="$( settings .locale "${PRIOR_SETTINGS_FILE}" )"
		if [[ -n ${DESIRED_LOCALE} ]]; then
			local X="$( echo "${INSTALLED_LOCALES}" | grep "${DESIRED_LOCALE}" )"
			if [[ -z ${X} ]]; then
				# This is probably EXTREMELY rare.
				MSG2="NOTE: Your prior locale (${DESIRED_LOCALE}) is no longer installed on this Pi."
			fi
		fi
	fi

	# Get current locale to use as the default.
	# Ignore any line that doesn't have a value, and get rid of double quotes.
	local TEMP_LOCALE="$( locale | grep -E "^LANG=|^LANGUAGE=|^LC_ALL=" | sed -e '/=$/d' -e 's/"//g' )"
	CURRENT_LOCALE="$( echo "${TEMP_LOCALE}" | sed --silent -e '/LANG=/ s/LANG=//p' )"
	if [[ -z ${CURRENT_LOCALE} ]];  then
		CURRENT_LOCALE="$( echo "${TEMP_LOCALE}" | sed --silent -e '/LANGUAGE=/ s/LANGUAGE=//p' )"
		if [[ -z ${CURRENT_LOCALE} ]];  then
			CURRENT_LOCALE="$( echo "${TEMP_LOCALE}" | sed --silent -e '/LC_ALL=/ s/LC_ALL=//p' )"
		fi
	fi
	MSG="CURRENT_LOCALE=${CURRENT_LOCALE}, TEMP_LOCALE=[[$( echo "${TEMP_LOCALE}" | tr '\n' ' ' )]]"
	display_msg --logonly info "${MSG}"

	local D=""
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
		MSG+="\n   run 'raspi-config' to update the list, then rerun the installation."
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

	# ${DESIRED_LOCALE} and ${CURRENT_LOCALE} are already set

	if [[ ${CURRENT_LOCALE} == "${DESIRED_LOCALE}" ]]; then
		display_msg --log progress "Keeping '${DESIRED_LOCALE}' locale."
		local L="$( settings ".locale" )"
		MSG="Settings file '${SETTINGS_FILE}'"
		if [[ -z ${L} ]]; then
			# Either a new install or an upgrade from an older Allsky.
			MSG+=" did NOT contain .locale so adding it."
			display_msg --logonly info "${MSG}"
			update_json_file ".locale" "${DESIRED_LOCALE}"  "${SETTINGS_FILE}"

# TODO: Something was unlinking the settings file from its camera-specific file,
# so do "ls" of the settings files to try and pinpoint the problem.
# I think this was fixed in v2023.05.01_03...
#shellcheck disable=SC2012
MSG="$( /bin/ls -l "${ALLSKY_CONFIG}/settings"*.json 2>/dev/null | sed 's/^/    /' )"
display_msg --logonly info "Settings files now:\n${MSG}"

		else
			MSG+=" CONTAINED .locale = '${L}'."
			display_msg --logonly info "${MSG}"
		fi
		STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")
		return
	fi

	display_msg --log progress "Setting locale to '${DESIRED_LOCALE}'."
	update_json_file ".locale" "${DESIRED_LOCALE}"  "${SETTINGS_FILE}"

# TODO: same as above...
#shellcheck disable=SC2012
MSG="$( /bin/ls -l "${ALLSKY_CONFIG}/settings"*.json 2>/dev/null | sed 's/^/    /' )"
display_msg --logonly info "Settings files now:\n${MSG}"

	# This updates /etc/default/locale
	sudo update-locale LC_ALL="${DESIRED_LOCALE}" LANGUAGE="${DESIRED_LOCALE}" LANG="${DESIRED_LOCALE}"

	if ask_reboot "locale" ; then
		display_msg --logonly info "Rebooting to set locale to '${DESIRED_LOCALE}'"
		do_reboot "${STATUS_LOCALE_REBOOT}" ""		# does not return
	fi

	display_msg warning "You must reboot before continuing with the installation."
	display_msg --logonly info "User elected not to reboot to update locale."

	exit_installation 0 "${STATUS_NO_REBOOT}" "to update locale."
}


####
# See what steps, if any, can be skipped.
set_what_can_be_skipped()
{
	if [[ ${PRIOR_ALLSKY_STYLE} != "" ]]; then
		local OLD_VERSION="${1}"
		local OLD_BASE_VERSION="$( remove_point_release "${OLD_VERSION}" )"
		local NEW_VERSION="${2}"
		local NEW_BASE_VERSION="$( remove_point_release "${NEW_VERSION}" )"
		if [[ ${NEW_BASE_VERSION} == "${OLD_BASE_VERSION}" ]]; then
			# No changes to these packages so no need to reinstall.
			MSG="Skipping installation of: webserver et.al., PHP modules, Trutype fonts, Python"
			display_msg --logonly info "${MSG}"
			# shellcheck disable=SC2034
			install_webserver_et_al="true"
			# shellcheck disable=SC2034
			install_fonts="true"
			# shellcheck disable=SC2034
			install_PHP_modules="true"
			# shellcheck disable=SC2034
			install_Python="true"
		fi
	fi
}

####
# Do we need to reboot?
is_reboot_needed()
{
	local OLD_VERSION="${1}"
	local OLD_BASE_VERSION="$( remove_point_release "${OLD_VERSION}" )"
	local NEW_VERSION="${2}"
	local NEW_BASE_VERSION="$( remove_point_release "${NEW_VERSION}" )"
	if [[ ${NEW_BASE_VERSION} == "${OLD_BASE_VERSION}" ||
		  (! ${OLD_VERSION} < "${SCRIPTS_PATH_ADDED_VERSION}") ]]; then
		# Assume just bug fixes between point releases.
# TODO: this may not always be true.
		REBOOT_NEEDED="false"
		display_msg --logonly info "No reboot is needed."
	else
		REBOOT_NEEDED="true"
		display_msg --log progress "A reboot is needed after installation finishes."
	fi
}

NEW_STYLE_ALLSKY="newStyle"
OLD_STYLE_ALLSKY="oldStyle"

####
# See if a prior Allsky Website exists; if so, set some variables.
# First look in the prior Allsky directory, if it exists.
# If not, look in the old Website location.
PRIOR_WEBSITE_STYLE=""
PRIOR_WEBSITE_DIR=""
PRIOR_WEBSITE_CONFIG_FILE=""

# Versions of the Website configuration files: 1, 2, etc.
NEW_WEB_CONFIG_VERSION=""
PRIOR_WEB_CONFIG_VERSION=""

# Run every time in case the Website was removed after first run.
does_prior_Allsky_Website_exist()
{
	local PRIOR_STYLE="${1}"

	if [[ ${PRIOR_STYLE} == "${NEW_STYLE_ALLSKY}" ]]; then
		PRIOR_WEBSITE_DIR="${PRIOR_ALLSKY_DIR}${ALLSKY_WEBSITE/${ALLSKY_HOME}/}"
		if [[ -d ${PRIOR_WEBSITE_DIR} ]]; then
			PRIOR_WEBSITE_STYLE="${NEW_STYLE_ALLSKY}"

			PRIOR_WEBSITE_CONFIG_FILE="${PRIOR_WEBSITE_DIR}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}"
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
		display_msg --logonly info "No prior Allsky Website"
	else
		display_msg --logonly info "PRIOR_WEBSITE_STYLE=${PRIOR_WEBSITE_STYLE}"
		display_msg --logonly info "PRIOR_WEBSITE_DIR=${PRIOR_WEBSITE_DIR}"
		# New Website configuration file may not exist yet so use repo version.
		NEW_WEB_CONFIG_VERSION="$( settings ".${WEBSITE_CONFIG_VERSION}" "${REPO_WEBCONFIG_FILE}" )"
		display_msg --logonly info "NEW_WEB_CONFIG_VERSION=${NEW_WEB_CONFIG_VERSION}"
	fi
}

####
# See if a prior Allsky exists; if so, set some variables.

does_prior_Allsky_exist()
{
	# If a prior config directory doesn't exist then there's no prior Allsky.
	if [[ ! -d ${PRIOR_CONFIG_DIR} ]]; then
		display_msg --logonly info "No prior Allsky found."
		does_prior_Allsky_Website_exist ""
		return 1
	fi

	local MSG

	display_msg --logonly info "Prior Allsky found in ${PRIOR_ALLSKY_DIR}."

	# All versions back to v0.6 (never checked prior ones) have a "scripts" directory.
	if [[ ! -d "${PRIOR_ALLSKY_DIR}/scripts" ]]; then
		MSG="Prior Allsky directory found at '${PRIOR_ALLSKY_DIR}'"
		MSG+=" but it doesn't appear to be valid; ignoring it."
		display_msg --log warning "${MSG}"
		does_prior_Allsky_Website_exist ""
		return 1
	fi

	# Determine the prior Allsky version and set some PRIOR_* locations.
	PRIOR_ALLSKY_VERSION="$( get_version "${PRIOR_ALLSKY_DIR}/" )"	# Returns "" if no version file.
	if [[ -n ${PRIOR_ALLSKY_VERSION} && (! ${PRIOR_ALLSKY_VERSION} < "${FIRST_CAMERA_TYPE_BASE_VERSION}") ]]; then
		PRIOR_ALLSKY_STYLE="${NEW_STYLE_ALLSKY}"

		# PRIOR_SETTINGS_FILE should be a link to a camera-specific settings file
		# and that file will have the camera type and model.
		PRIOR_SETTINGS_FILE="${PRIOR_CONFIG_DIR}/${SETTINGS_FILE_NAME}"
		if [[ -f ${PRIOR_SETTINGS_FILE} ]]; then
			local CT_ CM_
			if [[ ${PRIOR_ALLSKY_VERSION} < "${COMBINED_BASE_VERSION}" ]]; then
				CT_=".cameraType"
				CM_=".cameraModel"
			else
				CT_=".cameratype"
				CM_=".cameramodel"
			fi
			PRIOR_CAMERA_TYPE="$( settings "${CT_}" "${PRIOR_SETTINGS_FILE}" )"
			PRIOR_CAMERA_MODEL="$( settings "${CM_}" "${PRIOR_SETTINGS_FILE}" )"
		else
			# This shouldn't happen...
			PRIOR_SETTINGS_FILE=""
			display_msg --log warning "No prior new style settings file (${PRIOR_SETTINGS_FILE}) found!"
		fi

	else		# pre-${FIRST_VERSION_VERSION}
		# V0.6, v0.7, and v0.8:
		#	"allsky" directory contained capture.cpp, config.sh.
		#	"scripts" directory had ftp-settings.sh.
		#	No "src" directory.
			# NOTE: v0.6's capture.cpp said v0.5.
		# V0.8.1 added "scr" and "config" directories and "variables.sh" file.

		PRIOR_ALLSKY_STYLE="${OLD_STYLE_ALLSKY}"
		if [[ -z ${PRIOR_ALLSKY_VERSION} ]]; then
			# No version file so try to determine version via .cpp file.
			# sample:    printf("%s *** Allsky Camera Software v0.8.3 | 2021 ***\n", c(KGRN));
			DIR="${PRIOR_ALLSKY_DIR}/src"
			[[ ! -d "${DIR}" ]] && DIR="${PRIOR_ALLSKY_DIR}"
			PRIOR_ALLSKY_VERSION="$( grep "Camera Software" "${DIR}/capture.cpp" | awk '{print $6}' )"
		fi
		PRIOR_ALLSKY_VERSION="${PRIOR_ALLSKY_VERSION:-${PRE_FIRST_VERSION_VERSION}}"
		local CAMERA="$( get_variable "CAMERA" "${PRIOR_CONFIG_FILE}" )"
		PRIOR_CAMERA_TYPE="$( CAMERA_to_CAMERA_TYPE "${CAMERA}" )"
		# PRIOR_CAMERA_MODEL wasn't stored anywhere so can't set it.
		PRIOR_SETTINGS_FILE="${OLD_RASPAP_DIR}/settings_${CAMERA}.json"
		[[ ! -f ${PRIOR_SETTINGS_FILE} ]] && PRIOR_SETTINGS_FILE=""
	fi

	if [[ -n ${PRIOR_ALLSKY_VERSION} && ${PRIOR_ALLSKY_VERSION} != "${PRE_FIRST_VERSION_VERSION}" ]]; then
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
# Look for a directory inside the old one to make sure it's really an old allsky.

WILL_USE_PRIOR=""

prompt_for_prior_Allsky()
{
	declare -n v="${FUNCNAME[0]}"; [[ ${v} == "true" ]] && return

	local MSG

	if [[ -n ${PRIOR_ALLSKY_STYLE} ]]; then
		MSG="You have a prior version of Allsky in ${PRIOR_ALLSKY_DIR}."
		MSG+="\n\nDo you want to restore the prior images, darks, and settings?"
		if whiptail --title "${TITLE}" --yesno "${MSG}" 15 "${WT_WIDTH}"  3>&1 1>&2 2>&3; then
			# Set the prior camera type to the new, default camera type.
			CAMERA_TYPE="${PRIOR_CAMERA_TYPE}"
			STATUS_VARIABLES+=("CAMERA_TYPE='${CAMERA_TYPE}'\n")
			display_msg --logonly info "Will restore from prior version of Allsky."
			WILL_USE_PRIOR="true"
		else
			PRIOR_ALLSKY_DIR=""
			PRIOR_ALLSKY_STYLE=""
			PRIOR_ALLSKY_VERSION=""
			PRIOR_SETTINGS_FILE=""
			CAMERA_TYPE=""
			PRIOR_CAMERA_TYPE=""
			MSG="If you want your old images, darks, settings, etc. from the prior version"
			MSG+=" of Allsky, you'll need to manually move them to the new version."
			MSG+="\nThis can take quite a while."
			whiptail --title "${TITLE}" --msgbox "${MSG}" 12 "${WT_WIDTH}" 3>&1 1>&2 2>&3
			display_msg --logonly info "Will NOT restore from prior version of Allsky."
			WILL_USE_PRIOR="false"
		fi
	else
		WILL_USE_PRIOR="false"
		MSG="No prior version of Allsky found."
		MSG+="\n\nIf you DO have a prior version and you want images, darks,"
		MSG+=" and certain settings moved from the prior version to the new one,"
		MSG+=" rename the prior version to ${PRIOR_ALLSKY_DIR} before running this installation."
		MSG+="\n\nDo you want to continue?"
		if ! whiptail --title "${TITLE}" --yesno "${MSG}" 15 "${WT_WIDTH}" 3>&1 1>&2 2>&3; then
			MSG="Rename the directory with your prior version of Allsky to"
			MSG+="\n '${PRIOR_ALLSKY_DIR}', then run the installation again."
			display_msg info "${MSG}"
			display_msg --logonly info "User elected not to continue.  Exiting installation."
			exit_installation 0 "${STATUS_NOT_CONTINUE}" "after no prior Allsky was found."
		fi
	fi

	if [[ ${WILL_USE_PRIOR} == "false" ]]; then
		# No prior Allsky (or the user doesn't want to use it),
		# so force creating a default settings file.
		FORCE_CREATING_DEFAULT_SETTINGS_FILE="true"
		STATUS_VARIABLES+=("FORCE_CREATING_DEFAULT_SETTINGS_FILE='true'\n")
	fi

	STATUS_VARIABLES+=("WILL_USE_PRIOR='${WILL_USE_PRIOR}'\n")
	STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")
}


####
install_dependencies_etc()
{
	declare -n v="${FUNCNAME[0]}"; [[ ${v} == "true" ]] && return

	# These commands produce a TON of output that's not needed unless there's a problem.
	# They also take a little while, so hide the output and let the user know.

	display_msg --log progress "Installing dependencies."
	TMP="${ALLSKY_LOGS}/make_deps.log"
	#shellcheck disable=SC2024
	sudo make deps > "${TMP}" 2>&1
	check_success $? "Dependency installation failed" "${TMP}" "${DEBUG}" ||
		exit_with_image 1 "${STATUS_ERROR}" "dependency installation failed"

	display_msg --log progress "Preparing Allsky commands."
	TMP="${ALLSKY_LOGS}/make_all.log"
	#shellcheck disable=SC2024
	make all > "${TMP}" 2>&1
	check_success $? "Compile failed" "${TMP}" "${DEBUG}" ||
		exit_with_image 1 "${STATUS_ERROR}" "compile failed"

	TMP="${ALLSKY_LOGS}/make_install.log"
	#shellcheck disable=SC2024
	sudo make install > "${TMP}" 2>&1
	check_success $? "make install failed" "${TMP}" "${DEBUG}" ||
		exit_with_image 1 "${STATUS_ERROR}" "make insall_failed"

	STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")
}


####
# Create the log file and make it readable/writable by the user; this aids in debugging.
# Re-run every time in case permissions changed.
create_allsky_logs()
{
	display_msg --log progress "Setting permissions on ${ALLSKY_LOG} and ${ALLSKY_PERIODIC_LOG}."

	sudo systemctl stop rsyslog 2> /dev/null

	TMP="${ALLSKY_LOGS}/rsyslog.log"
	sudo apt-get --assume-yes install rsyslog > "${TMP}" 2>&1	
	check_success $? "rsyslog installation failed" "${TMP}" "${DEBUG}" ||
		exit_with_image 1 "${STATUS_ERROR}" "rsyslog install failed."

	sudo truncate -s 0 "${ALLSKY_LOG}" "${ALLSKY_PERIODIC_LOG}"
	sudo chmod 664 "${ALLSKY_LOG}" "${ALLSKY_PERIODIC_LOG}"
	sudo chgrp "${ALLSKY_GROUP}" "${ALLSKY_LOG}" "${ALLSKY_PERIODIC_LOG}"

	sudo systemctl start rsyslog		# so logs go to the files above
}


####
# Prompt for either latitude or longitude, and make sure it's a valid entry.
prompt_for_lat_long()
{
	local PROMPT="${1}"
	local TYPE="${2}"
	local HUMAN_TYPE="${3}"
	local ERROR_MSG=""   VALUE  M

	while :
	do
		M="${ERROR_MSG}${PROMPT}"
		VALUE=$( whiptail --title "${TITLE}" --inputbox "${M}" 18 "${WT_WIDTH}" "" 3>&1 1>&2 2>&3 )
		if [[ -z ${VALUE} ]]; then
			# Let the user not enter anything.  A message is printed below.
			break
		elif VALUE="$( convertLatLong "${VALUE}" "${TYPE}" 2>&1 )" ; then
			update_json_file ".${TYPE}" "${VALUE}" "${SETTINGS_FILE}"
			display_msg --log progress "${HUMAN_TYPE} set to ${VALUE}."
			echo "${VALUE}"
			break
		else
			ERROR_MSG="${VALUE}\n\n"
		fi
	done
}

####
# We can't automatically determine the latitude and longitude, so prompt for them.
get_lat_long()
{
	if [[ ! -f ${SETTINGS_FILE} ]]; then
		display_msg --log error "INTERNAL ERROR: '${SETTINGS_FILE}' not found!"
		return 1
	fi

	display_msg --log progress "Prompting for Latitude and Longitude."

	MSG="Enter your Latitude."
	MSG+="\nIt can either have a plus or minus sign (e.g., -20.1)"
	MSG+="\nor N or S (e.g., 20.1S)"
	LATITUDE="$( prompt_for_lat_long "${MSG}" "latitude" "Latitude" )"

	MSG="Enter your Longitude."
	MSG+="\nIt can either have a plus or minus sign (e.g., -20.1)"
	MSG+="\nor E or W (e.g., 20.1W)"
	LONGITUDE="$( prompt_for_lat_long "${MSG}" "longitude" "Longitude" )"

	if [[ -z ${LATITUDE} || -z ${LONGITUDE} ]]; then
		display_msg --log warning "Latitude and longitude need to be set in the WebUI before Allsky can start."
	fi
	return 0
}


####
# If needed, update the new settings file based on the prior one.
# The old and new files both exist and may be the same,
# but either way, do not modify the old file.
convert_settings()			# prior_file, new_file
{
	local PRIOR_FILE="${1}"
	local NEW_FILE="${2}"

	[[ ${ALLSKY_VERSION} == "${PRIOR_ALLSKY_VERSION}" ]] && return

	# If we're upgrading a version >= COMBINED_BASE_VERSION then return.
	# bash doesn't have >= so use   ! <
	[[ ! (${PRIOR_ALLSKY_BASE_VERSION} < "${COMBINED_BASE_VERSION}") ]] && return

	local MSG="Converting '$( basename "${PRIOR_FILE}" )' to new format."
	display_msg --log progress "${MSG}"


	# Older version had uppercase letters in setting names and "1" and "0" for booleans
	# and quotes around numbers. Change that.
	# Don't modify the prior file, so make the changes to a temporary file.
	# --settings-only  says only output settings that are in the settings file.
	# The OPTIONS_FILE doesn't exist yet so use REPO_OPTIONS_FILE>
	local TEMP_PRIOR="/tmp/converted_old_settings.json"
	"${ALLSKY_WEBUI}/includes/convertJSON.php" --convert \
		--settings-only \
		--settings-file "${PRIOR_FILE}" \
		--options-file "${REPO_OPTIONS_FILE}" \
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
	"${ALLSKY_WEBUI}/includes/convertJSON.php" \
			--delimiter "$( echo -e '\t' )" \
			--settings-file "${TEMP_PRIOR}" |
		while read -r F V
		do
			case "${F}" in
				"lastchanged")
					V="$( date +'%Y-%m-%d %H:%M:%S' )"
					;;

				# Don't carry this forward
				"XX_END_XX")
					continue
					;;

				# These don't exist anymore.
				"autofocus" | "background" | "alwaysshowadvanced" | \
				"newexposure" | "experimentalexposure")
					continue
					;;
				# Deleted in ${COMBINED_BASE_VERSION}
				"brightness" | "daybrightness" | "nightbrightness" | "showbrightness")
					MSG="The 'Brightness' settings were removed."
					MSG+="\nUse the 'Target Mean' settings to adjust brightness."
					display_msg --log info "${MSG}"
					continue
					;;
				"offset")
					MSG="The 'Offset' setting was removed."
					MSG+="\nUse the 'Target Mean' settings to adjust brightness."
					display_msg --log info "${MSG}"
					continue
					;;

				# These changed names.
				"darkframe")
					F="takedarkframes"
					;;
				"daymaxgain")
					F="daymaxautogain"
					;;
				"nightmaxexposure")
					F="nightmaxautoexposure"
					;;
				"nightmaxgain")
					F="nightmaxautogain"
					;;
				"websiteurl")
					F="remotewebsiteurl"
					;;
				"imageurl")
					F="remotewebsiteimageurl"
					;;

				# These now have day and night versions.
				"awb" | "autowhitebalance")
					F="awb"
					update_json_file ".day${F}" "${V}" "${NEW_FILE}"
					F="night${F}"
					;;
				"wbr")
					update_json_file ".day${F}" "${V}" "${NEW_FILE}"
					F="night${F}"
					;;
				"wbb")
					update_json_file ".day${F}" "${V}" "${NEW_FILE}"
					F="night${F}"
					;;
				"targettemp")
					update_json_file ".day${F}" "${V}" "${NEW_FILE}"
					F="night${F}"
					;;
				"coolerenabled")
					F="enablecooler"		# also a name change
					update_json_file ".day${F}" "${V}" "${NEW_FILE}"
					F="night${F}"
					;;
				"meanthreshold")
					update_json_file ".day${F}" "${V}" "${NEW_FILE}"
					F="night${F}"
					;;
			esac

			update_json_file ".${F}" "${V}" "${NEW_FILE}"
		done

	##### New fields not already handled in loop above.
	# If they are already in PRIOR_FILE then they are also in NEW_FILE.
	x="$( settings ".takenighttimeimages" "${PRIOR_FILE}" )"
	[[ -z ${x} ]] && update_json_file ".takenighttimeimages" "true" "${NEW_FILE}"

	x="$( settings ".savenighttimeimages" "${PRIOR_FILE}" )"
	[[ -z ${x} ]] && update_json_file ".savenighttimeimages" "true" "${NEW_FILE}"

	x="$( settings ".determinefocus" "${PRIOR_FILE}" )"
	[[ -z ${x} ]] && update_json_file ".determinefocus" "false" "${NEW_FILE}"

	x="$( settings ".showdelay" "${PRIOR_FILE}" )"
	[[ -z ${x} ]] && update_json_file ".showdelay" "true" "${NEW_FILE}"

	x="$( settings ".imagessortorder" "${PRIOR_FILE}" )"
	[[ -z ${x} ]] && update_json_file ".imagessortorder" "ascending" "${NEW_FILE}"

	x="$( settings ".zwoexposuretype" "${PRIOR_FILE}" )"
	[[ -z ${x} ]] && update_json_file ".zwoexposuretype" 0 "${NEW_FILE}"

	# New fields were added to the bottom of the settings file but the below
	# command will order them the same as in the options file, which we want.

	local TEMP_NEW="/tmp/converted_new_settings.json"
	"${ALLSKY_WEBUI}/includes/convertJSON.php" --convert \
		--settings-only \
		--settings-file "${NEW_FILE}" \
		--options-file "${REPO_OPTIONS_FILE}" \
		> "${TEMP_NEW}" 2>&1
	if [[ $? -ne 0 ]]; then
		local M="Unable to convert from old settings file"
		MSG="${M}: $( < "${TEMP_NEW}" )"
		display_msg --log error "${MSG}"
		exit_installation 1 "${STATUS_ERROR}" "${M}."
	fi
	cp "${TEMP_NEW}" "${NEW_FILE}"
}

# Update the specified file with the specified new value.
doV()
{
	local V="${1}"			# name of the variable
	local VAL="${!V}"		# value of the variable
	local jV="${2}"			# new json variable name
	local TYPE="${3}"
	local FILE="${4}"

	[[ -z ${VAL} ]] && return

	if [[ ${TYPE} == "boolean" ]]; then
		# Some booleans used "true/false" and some used "1/0".
		if [[ ${VAL} == "true" || ${VAL} == "1" ]]; then
			VAL="true"
		else
			VAL="false"
		fi
	elif [[ ${TYPE} == "number" && -z ${VAL} ]]; then
		VAL=0		# give it a default
	fi

	if update_json_file "${jV}" "${VAL}" "${FILE}" "${TYPE}" ; then
		display_msg --logonly info "   ${V} (${VAL})"
	else
		display_msg --logonly error "Unable to update ${jV} from ${V} (${!V})"
	fi
}

# Copy everything from old config.sh to the settings file.
convert_config_sh()
{
	declare -n v="${FUNCNAME[0]}"; [[ ${v} == "true" ]] && return

	local OLD_CONFIG_FILE="${1}"
	local NEW_FILE="${2}"

	if [[ ! -e ${OLD_CONFIG_FILE} ]]; then
		display_msg --log info "No prior config.sh file to process."
		return 1
	fi

	display_msg --log progress "Copying contents of prior config.sh to the settings file."
	(
		#shellcheck disable=SC1090
		if ! source "${OLD_CONFIG_FILE}" ; then
			display_msg --log error "Unable to process prior config.sh file (${OLD_CONFIG_FILE})."
			return 1
		fi

		local X		# temporary variable

		if [[ -n ${DAYTIME} ]]; then		# old name
			X="${DAYTIME}"
		else
			X="${DAYTIME_CAPTURE}"
		fi
		if [[ -n ${CAPTURE_24HR} ]]; then	# old name
			X="${CAPTURE_24HR}"
		else
			X="${DAYTIME_SAVE}"
		fi
		doV "X" ".savedaytimeimages" "boolean" "${NEW_FILE}"

		doV "DARK_FRAME_SUBTRACTION" ".usedarkframes" "boolean" "${NEW_FILE}"

		# IMG_UPLOAD no longer used; instead, upload if FREQUENCY > 0.
		# shellcheck disable=SC2034
		[[ ${IMG_UPLOAD} != "true" ]] && IMG_UPLOAD_FREQUENCY=0
		doV "IMG_UPLOAD_FREQUENCY" ".imageuploadfrequency" "number" "${NEW_FILE}"

		# IMG_RESIZE no longer used; only resize if width and height are > 0.
		if [[ -n ${IMG_WIDTH} && ${IMG_WIDTH} -gt 0 && -n ${IMG_HEIGHT} && ${IMG_HEIGHT} -gt 0 ]];
		then
			doV "IMG_WIDTH" ".imageresizewidth" "number" "${NEW_FILE}"
			doV "IMG_HEIGHT" ".imageresizeheight" "number" "${NEW_FILE}"
		else
			MSG="Ignoring IMG_RESIZE since IMG_WIDTH (${IMG_WIDTH}) and/or IMG_HEIGHT (${IMG_HEIGHT}) are not positive numbers."
			display_msg --log info "${MSG}"
			X=0; doV "X" ".imageresizewidth" "number" "${NEW_FILE}"
			X=0; doV "X" ".imageresizeheight" "number" "${NEW_FILE}"
		fi

		# CROP_IMAGE, CROP_WIDTH, CROP_HEIGHT, CROP_OFFSET_X, and CROP_OFFSET_Y are no longer used.
		# Instead the user specifies the number of pixels to crop from the
		# top, right, bottom, and left.
		# It's too difficult to convert old numbers to new, so force the user to enter new numbers.
		# We'd need to know actual number of image pixels, bin level, and .width and .height to get
		# the effective width and height, then convert.
		if [[ ${CROP_IMAGE} == "true" ]]; then
			MSG="The way to specify cropping images has changed."
			MSG="${MSG}You need to reenter your crop settings."
			MSG="${MSG}\nSpecify the amount to crop from the top, right, bottom, and left."
			display_msg --log info "${MSG}"
			X=0; doV "X" ".imagecroptop" "number" "${NEW_FILE}"
			X=0; doV "X" ".imagecropright" "number" "${NEW_FILE}"
			X=0; doV "X" ".imagecropbottom" "number" "${NEW_FILE}"
			X=0; doV "X" ".imagecropleft" "number" "${NEW_FILE}"
		fi

		# AUTOSTRETCH no longer used; only stretch if AMOUNT > 0 and MID_POINT != ""
		X=0; doV "X" ".imagestretchamountdaytime" "number" "${NEW_FILE}"		# new
		X=0; doV "X" ".imagestretchmidpointdaytime" "text" "${NEW_FILE}"		# new
		# shellcheck disable=SC2034
		[[ ${AUTOSTRETCH} != "true" || -n ${AUTOSTRETCH_MID_POINT} ]] && AUTOSTRETCH_AMOUNT=0
		doV "AUTOSTRETCH_AMOUNT" ".imagestretchamountnighttime" "number" "${NEW_FILE}"
		doV "AUTOSTRETCH_MID_POINT" ".imagestretchmidpointnighttime" "text" "${NEW_FILE}"

		# RESIZE_UPLOADS no longer used; resize only if width > 0 and height > 0.
		if [[ ${RESIZE_UPLOADS} != "true" ]]; then
			# shellcheck disable=SC2034
			RESIZE_UPLOADS_WIDTH=0;
			# shellcheck disable=SC2034
			RESIZE_UPLOADS_HEIGHT=0
		fi
		doV "RESIZE_UPLOADS_WIDTH" ".imageresizeuploadswidth" "number" "${NEW_FILE}"
		doV "RESIZE_UPLOADS_HEIGHT" ".imageresizeuploadsheight" "number" "${NEW_FILE}"

		doV "IMG_CREATE_THUMBNAILS" ".imagecreatethumbnails" "boolean" "${NEW_FILE}"

		# REMOVE_BAD_IMAGES no longer used; remove only if low > 0 or high > 0.
		if [[ ${REMOVE_BAD_IMAGES} != "true" ]]; then
			# shellcheck disable=SC2034
			REMOVE_BAD_IMAGES_THRESHOLD_LOW=0;
			# shellcheck disable=SC2034
			REMOVE_BAD_IMAGES_THRESHOLD_HIGH=0
		fi
		doV "REMOVE_BAD_IMAGES_THRESHOLD_LOW" ".imageremovebadlow" "number" "${NEW_FILE}"
		doV "REMOVE_BAD_IMAGES_THRESHOLD_HIGH" ".imageremovebadhigh" "number" "${NEW_FILE}"

		doV "TIMELAPSE" ".timelapsegenerate" "boolean" "${NEW_FILE}"
		doV "TIMELAPSEWIDTH" ".timelapsewidth" "number" "${NEW_FILE}"
		doV "TIMELAPSEHEIGHT" ".timelapseheight" "number" "${NEW_FILE}"
		# We no longer include the trailing "k".
		TIMELAPSE_BITRATE="${TIMELAPSE_BITRATE//k/}"
		doV "TIMELAPSE_BITRATE" ".timelapsebitrate" "number" "${NEW_FILE}"
		doV "FPS" ".timelapsefps" "number" "${NEW_FILE}"
		doV "VCODEC" ".timelapsevcodec" "text" "${NEW_FILE}"
		doV "PIX_FMT" ".timelapsepixfmt" "text" "${NEW_FILE}"
		doV "FFLOG" ".timelapsefflog" "text" "${NEW_FILE}"
		doV "KEEP_SEQUENCE" ".timelapsekeepsequence" "boolean" "${NEW_FILE}"
		doV "TIMELAPSE_EXTRA_PARAMETERS" ".timelapseextraparameters" "text" "${NEW_FILE}"
		doV "UPLOAD_VIDEO" ".timelapseupload" "boolean" "${NEW_FILE}"
		doV "TIMELAPSE_UPLOAD_THUMBNAIL" ".timelapseuploadthumbnail" "boolean" "${NEW_FILE}"

		doV "TIMELAPSE_MINI_IMAGES" ".minitimelapsenumimages" "number" "${NEW_FILE}"
		doV "TIMELAPSE_MINI_FORCE_CREATION" ".minitimelapseforcecreation" "boolean" "${NEW_FILE}"
		doV "TIMELAPSE_MINI_FREQUENCY" ".minitimelapsefrequency" "number" "${NEW_FILE}"
		doV "TIMELAPSE_MINI_UPLOAD_VIDIO" ".minitimelapseupload" "boolean" "${NEW_FILE}"
		doV "TIMELAPSE_MINI_UPLOAD_THUMBNAIL" ".minitimelapseuploadthumbnail" "boolean" "${NEW_FILE}"
		doV "TIMELAPSE_MINI_FPS" ".minitimelapsefps" "number" "${NEW_FILE}"
		TIMELAPSE_MINI_BITRATE="${TIMELAPSE_MINI_BITRATE//k/}"
		doV "TIMELAPSE_MINI_BITRATE" ".minitimelapsebitrate" "number" "${NEW_FILE}"
		doV "TIMELAPSE_MINI_WIDTH" ".minitimelapsewidth" "number" "${NEW_FILE}"
		doV "TIMELAPSE_MINI_HEIGHT" ".minitimelapseheight" "number" "${NEW_FILE}"

		doV "KEOGRAM" ".keogramgenerate" "boolean" "${NEW_FILE}"
		doV "KEOGRAM_EXTRA_PARAMETERS" ".keogramextraparameters" "text" "${NEW_FILE}"
		doV "UPLOAD_KEOGRAM" ".keogramupload" "boolean" "${NEW_FILE}"
		X="true"; doV "X" ".keogramexpand" "boolean" "${NEW_FILE}"		# new
		X="simplex"; doV "X" ".keogramfontname" "text" "${NEW_FILE}"	# new
		X="#ffff"; doV "X" ".keogramfontcolor" "text" "${NEW_FILE}"		# new
		X=1; doV "X" ".keogramfontsize" "text" "${NEW_FILE}"			# new
		X=3; doV "X" ".keogramlinethickness" "text" "${NEW_FILE}"		# new

		doV "STARTRAILS" ".startrailsgramgenerate" "boolean" "${NEW_FILE}"
		doV "BRIGHTNESS_THRESHOLD" ".startrailsbrightnessthreshold" "number" "${NEW_FILE}"
		doV "STARTRAILS_EXTRA_PARAMETERS" ".startrailsextraparameters" "text" "${NEW_FILE}"
		doV "UPLOAD_STARTRAILS" ".startrailsupload" "boolean" "${NEW_FILE}"

		[[ -z ${THUMBNAIL_SIZE_X} ]] && THUMBNAIL_SIZE_X=100
		doV "THUMBNAIL_SIZE_X" ".thumbnailsizex" "number" "${NEW_FILE}"
		[[ -z ${THUMBNAIL_SIZE_Y} ]] && THUMBNAIL_SIZE_Y=75
		doV "THUMBNAIL_SIZE_Y" ".thumbnailsizey" "number" "${NEW_FILE}"

		# NIGHTS_TO_KEEP was replaced by DAYS_TO_KEEP and the AUTO_DELETE boolean was deleted.
		if [[ -n ${NIGHTS_TO_KEEP} && ${AUTO_DELETE} == "true" ]]; then
			doV "NIGHTS_TO_KEEP" ".daystokeep" "number" "${NEW_FILE}"
		else
			doV "DAYS_TO_KEEP" ".daystokeep" "number" "${NEW_FILE}"
		fi
		doV "WEB_DAYS_TO_KEEP" ".daystokeeplocalwebsite" "number" "${NEW_FILE}"
		X=0; doV "X" ".daystokeepremotewebsite" "number" "${NEW_FILE}"
		doV "WEBUI_DATA_FILES" ".webuidatafiles" "text" "${NEW_FILE}"
		doV "UHUBCTL_PATH" ".uhubctlpath" "text" "${NEW_FILE}"
		doV "UHUBCTL_PORT" ".uhubctlport" "number" "${NEW_FILE}"

	) || return 1

	STATUS_VARIABLES+=( "${FUNCNAME[0]}='true'\n" )

	return 0
}

# Copy everything from old ftp-settings.sh to the settings file.
convert_ftp_sh()
{
	declare -n v="${FUNCNAME[0]}"; [[ ${v} == "true" ]] && return

	local FTP_FILE="${1}"
	local NEW_FILE="${2}"

	if [[ ! -e ${FTP_FILE} ]]; then
		display_msg --log info "No prior ftp-settings.sh file to process (${FTP_FILE})."
		return 1
	fi

	display_msg --log progress "Copying contents of prior ftp-settings.sh to settings file."
	{
		#shellcheck disable=SC1090
		if ! source "${FTP_FILE}" ; then
			display_msg --log error "Unable to process prior ftp-settings.sh file (${FTP_FILE})."
			return 1
		fi

		# Ignore the WEB_*_DIR entries - the user can no longer specify local directories.
		# Ignore VIDEOS_DIR, KEOGRAM_DIR, STARTRAILS_DIR - the user can no longer specify them.
		# Don't update REMOTEWEBSITE_* settings since they are new so have no prior value.

		# "local" PROTOCOL means they're using local Website.
		# WEB_IMAGE_DIR means they have both local and remote Website.
		if [[ -d ${ALLSKY_WEBSITE} && (${PROTOCOL} == "local" || -n ${WEB_IMAGE_DIR}) ]]; then
			X="true";  doV "X" ".uselocalwebsite" "boolean" "${NEW_FILE}"
		else
			X="false"; doV "X" ".uselocalwebsite" "boolean" "${NEW_FILE}"
		fi
		if [[ (-n ${PROTOCOL} && ${PROTOCOL} != "local") || -n ${REMOTE_HOST} ]]; then
			doV "PROTOCOL" ".remotewebsiteprotocol" "text" "${NEW_FILE}"
			doV "IMAGE_DIR" ".remotewebsiteimagedir" "text" "${NEW_FILE}"
			X="true"; doV "X" ".useremotewebsite" "boolean" "${NEW_FILE}"
		else
			X=""; doV "X" ".remotewebsiteprotocol" "text" "${NEW_FILE}"
			X=""; doV "X" ".remotewebsiteimagedir" "text" "${NEW_FILE}"
			X="false"; doV "X" ".useremotewebsite" "boolean" "${NEW_FILE}"
		fi
		doV "IMG_UPLOAD_ORIGINAL_NAME" ".remotewebsiteimageuploadoriginalname" "boolean" "${NEW_FILE}"
		doV "VIDEOS_DESTINATION_NAME" ".remotewebsitevideodestinationname" "text" "${ALLSKY_ENV}"
		doV "KEOGRAM_DESTINATION_NAME" ".remotewebsitekeogramdestinationname" "text" "${ALLSKY_ENV}"
		doV "STARTRAILS_DESTINATION_NAME" ".remotewebsitestartrailsdestinationname" "text" "${ALLSKY_ENV}"
		# shellcheck disable=SC2034
		[[ -n ${HOST} ]] && REMOTE_HOST="${HOST}"
		doV "REMOTE_HOST" ".REMOTEWEBSITE_HOST" "text" "${ALLSKY_ENV}"
		if [[ -z ${REMOTE_PORT} ]]; then
			# Don't want a default value.
			doV "REMOTE_PORT" ".REMOTEWEBSITE_PORT" "text" "${ALLSKY_ENV}"
		else
			doV "REMOTE_PORT" ".REMOTEWEBSITE_PORT" "number" "${ALLSKY_ENV}"
		fi
		# shellcheck disable=SC2034
		[[ -n ${USER} ]] && REMOTE_USER="${USER}"
		doV "REMOTE_USER" ".REMOTEWEBSITE_USER" "text" "${ALLSKY_ENV}"
		# shellcheck disable=SC2034
		[[ -n ${PASSWORD} ]] && REMOTE_PASSWORD="${PASSWORD}"
		doV "REMOTE_PASSWORD" ".REMOTEWEBSITE_PASSWORD" "text" "${ALLSKY_ENV}"
		doV "LFTP_COMMANDS" ".REMOTEWEBSITE_LFTP_COMMANDS" "text" "${ALLSKY_ENV}"
		doV "SSH_KEY_FILE" ".REMOTEWEBSITE_SSH_KEY_FILE" "text" "${ALLSKY_ENV}"
		doV "AWS_CLI_DIR" ".REMOTEWEBSITE_AWS_CLI_DIR" "text" "${ALLSKY_ENV}"
		doV "S3_BUCKET" ".REMOTEWEBSITE_S3_BUCKET" "text" "${ALLSKY_ENV}"
		doV "S3_ACL" ".REMOTEWEBSITE_S3_ACL" "text" "${ALLSKY_ENV}"
		doV "GCS_BUCKET" ".REMOTEWEBSITE_GCS_BUCKET" "text" "${ALLSKY_ENV}"
		doV "GCS_ACL" ".REMOTEWEBSITE_GCS_ACL" "text" "${ALLSKY_ENV}"

		# Remote server
		doV "IMG_UPLOAD_ORIGINAL_NAME" ".remoteserverimageuploadoriginalname" "boolean" "${NEW_FILE}"
	} || return 1

	STATUS_VARIABLES+=( "${FUNCNAME[0]}='true'\n" )

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

	local MSG NAME EXT FIRST_ONE CHECK_UPPER

	if [[ ${PRIOR_ALLSKY_STYLE} == "${NEW_STYLE_ALLSKY}" ]]; then
		# The prior settings file SHOULD be a link to a camera-specific file.
		# Make sure that's true; if not, fix it.

		MSG="Checking link for ${NEW_STYLE_ALLSKY} PRIOR_SETTINGS_FILE '${PRIOR_SETTINGS_FILE}'"
		display_msg --logonly info "${MSG}"

		# Do we need to check for upperCase or lowercase setting names?
		if [[ ${PRIOR_ALLSKY_BASE_VERSION} < "${COMBINED_BASE_VERSION}" ]]; then
			CHECK_UPPER="--uppercase"
		else
			CHECK_UPPER=""
		fi
	
		# shellcheck disable=SC2086
		MSG="$( check_settings_link ${CHECK_UPPER} "${PRIOR_SETTINGS_FILE}" )"
		if [[ $? -eq "${EXIT_ERROR_STOP}" ]]; then
			display_msg --log error "${MSG}"
			FORCE_CREATING_DEFAULT_SETTINGS_FILE="true"
		fi

		# Camera-specific settings file names are:
		#	${NAME}_${CAMERA_TYPE}_${CAMERA_MODEL}.${EXT}
		# where ${SETTINGS_FILE_NAME} == ${NAME}.${EXT}
		NAME="${SETTINGS_FILE_NAME%.*}"			# before "."
		EXT="${SETTINGS_FILE_NAME##*.}"			# after "."

		# Copy all the camera-specific settings files; don't copy the generic-named
		# file since it will be recreated.
		# There will be more than one camera-specific file if the user has multiple cameras.
		local PRIOR_SPECIFIC_FILES="$( find "${PRIOR_CONFIG_DIR}" -name "${NAME}_"'*'".${EXT}" )"
		if [[ -n ${PRIOR_SPECIFIC_FILES} ]]; then
			FIRST_ONE="true"
			echo "${PRIOR_SPECIFIC_FILES}" | while read -r F
				do
					if [[ ${FIRST_ONE} == "true" ]]; then
						display_msg --log progress "Restoring camera-specific settings files:"
						FIRST_ONE="false"
					fi
					display_msg --log progress "\t$( basename "${F}" )"
					cp -a "${F}" "${ALLSKY_CONFIG}"
				done
			RESTORED_PRIOR_SETTINGS_FILE="true"
			FORCE_CREATING_DEFAULT_SETTINGS_FILE="false"
		else
			# This shouldn't happen...
			MSG="No prior camera-specific settings files found,"

			# Try to create one based on ${PRIOR_SETTINGS_FILE}.
			if [[ ${PRIOR_CAMERA_TYPE} != "${CAMERA_TYPE}" ]]; then
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
		if [[ ${RESTORED_PRIOR_SETTINGS_FILE} == "true" &&
			  ${PRIOR_ALLSKY_VERSION} != "${ALLSKY_VERSION}" ]]; then
			for S in ${PRIOR_SPECIFIC_FILES}
			do
				# Update all the prior camera-specific files (which are now in ${ALLSKY_CONFIG}).
				# The new settings file will be based on a camera specific file.
				local B="$( basename "${S}" )"
				S="${ALLSKY_CONFIG}/${B}"
				convert_settings "${S}" "${S}"
			done
		else
			MSG="No need to update prior settings files - same Allsky version"
			display_msg --logonly info "${MSG}"
		fi

	else
		# settings file is old style in ${OLD_RASPAP_DIR}.
		if [[ -f ${SETTINGS_FILE} ]]; then
			# Transfer prior settings to the new file.

			case "${PRIOR_ALLSKY_VERSION}" in
				"${FIRST_VERSION_VERSION}")
					convert_settings "${PRIOR_SETTINGS_FILE}" "${SETTINGS_FILE}"

					MSG="Your old WebUI settings were transfered to the new release,"
					MSG+="\n but note that there have been some changes to the settings file"
					MSG+=" (e.g., settings in ftp-settings.sh are now in the settings file)."
					MSG+="\n\nCheck your settings in the WebUI's 'Allsky Settings' page."
					whiptail --title "${TITLE}" --msgbox "${MSG}" 18 "${WT_WIDTH}" 3>&1 1>&2 2>&3
					display_msg info "\n${MSG}\n"
					echo -e "\n\n==========\n${MSG}" >> "${POST_INSTALLATION_ACTIONS}"
					display_msg --logonly info "Settings from ${PRIOR_ALLSKY_VERSION} copied over."
					;;

				*)	# This could be one of many old versions of Allsky,
					# so don't try to copy all the settings since there have
					# been many changes, additions, and deletions.

					# As far as I know, latitude, longitude, and angle have never changed names,
					# and are required and have no default,
					# so try to restore them so Allsky can restart automatically.
					local LAT="$( settings .latitude "${PRIOR_SETTINGS_FILE}" )"
					update_json_file ".latitude" "${LAT}" "${SETTINGS_FILE}"
					local LONG="$( settings .longitude "${PRIOR_SETTINGS_FILE}" )"
					update_json_file ".longitude" "${LONG}" "${SETTINGS_FILE}"
					local ANGLE="$( settings .angle "${PRIOR_SETTINGS_FILE}" )"
					update_json_file ".angle" "${ANGLE}" "${SETTINGS_FILE}" "number"
					display_msg --log progress "Prior latitude, longitude, and angle restored."

					MSG="You need to manually transfer your old settings to the WebUI.\n"
					MSG+="\nNote that there have been many changes to the settings file"
					MSG+=" since you last installed Allsky, so you will need"
					MSG+=" to re-enter everything via the WebUI's 'Allsky Settings' page."
					whiptail --title "${TITLE}" --msgbox "${MSG}" 18 "${WT_WIDTH}" 3>&1 1>&2 2>&3
					display_msg info "\n${MSG}\n"
					echo -e "\n\n==========\n${MSG}" >> "${POST_INSTALLATION_ACTIONS}"

					MSG="Only a few settings from very old ${PRIOR_ALLSKY_VERSION} copied over."
					display_msg --logonly info "${MSG}"
					;;
			esac

			# Set to null to force the user to look at the settings before Allsky will run.
			update_json_file ".lastchanged" "" "${SETTINGS_FILE}"

			RESTORED_PRIOR_SETTINGS_FILE="true"
			FORCE_CREATING_DEFAULT_SETTINGS_FILE="false"
		else
			# First time through there often won't be SETTINGS_FILE.
			display_msg --logonly info "No new settings file yet..."
			FORCE_CREATING_DEFAULT_SETTINGS_FILE="true"
		fi
	fi

	STATUS_VARIABLES+=( "RESTORED_PRIOR_SETTINGS_FILE='${RESTORED_PRIOR_SETTINGS_FILE}'\n" )
}

SPACE="    "
NOT_RESTORED="NO PRIOR VERSION"

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
		echo -e "\n\n==========\n${MSG}" >> "${POST_INSTALLATION_ACTIONS}"
	fi

	if [[ -z ${PRIOR_ALLSKY_STYLE} ]]; then
		restore_prior_local_website_files
		get_lat_long	# prompt for them to put in new settings file
		mkdir -p "${ALLSKY_EXTRA}"		# default permissions is ok

		STATUS_VARIABLES+=( "${FUNCNAME[0]}='true'\n" )
		return			# Nothing left to do in this function, so return
	fi

	# Do all the restores, then all the updates.
	display_msg --log progress "Restoring prior:"

	local E  EXTRA  D  R  ITEM  X

	if [[ -f ${PRIOR_ALLSKY_DIR}/scripts/endOfNight_additionalSteps.sh ]]; then
		MSG="The ${ALLSKY_SCRIPTS}/endOfNight_additionalSteps.sh file is no longer supported."
		MSG+="\nPlease move your code in that file to the 'Script' module in"
		MSG+="\nthe 'Night to Day Transition Flow' of the Module Manager."
		MSG+="\nSee the 'Explanations --> Module' documentation for more details."
		display_msg --log warning "\n${MSG}\n"
		echo -e "\n\n==========\n${MSG}" >> "${POST_INSTALLATION_ACTIONS}"
	fi

	E="$( basename "${ALLSKY_ENV}" )"
	ITEM="${SPACE}'${E}' file"
	if [[ -f ${PRIOR_ALLSKY_DIR}/${E} ]]; then
		display_msg --log progress "${ITEM}"
		cp -ar "${PRIOR_ALLSKY_DIR}/${E}" "${ALLSKY_ENV}"
		display_msg --log progress "${ITEM}: ${NOT_RESTORED}"
	fi

	ITEM="${SPACE}'images' directory"
	if [[ -d ${PRIOR_ALLSKY_DIR}/images ]]; then
		display_msg --log progress "${ITEM} (moving)"
		mv "${PRIOR_ALLSKY_DIR}/images" "${ALLSKY_HOME}"
	else
		# This is probably very rare so let the user know
		display_msg --log progress "${ITEM}: ${NOT_RESTORED}.  This is unusual."
	fi

	ITEM="${SPACE}'darks' directory"
	if [[ -d ${PRIOR_ALLSKY_DIR}/darks ]]; then
		display_msg --log progress "${ITEM} (moving)"
		mv "${PRIOR_ALLSKY_DIR}/darks" "${ALLSKY_HOME}"
	else
		display_msg --log progress "${ITEM}: ${NOT_RESTORED}"
	fi

	ITEM="${SPACE}'config/modules' directory"
	if [[ -d ${PRIOR_CONFIG_DIR}/modules ]]; then
		display_msg --log progress "${ITEM}"

		# Copy the user's prior data to the new file which may contain new fields.
		activate_python_venv
		if ! python3 "${ALLSKY_SCRIPTS}"/flowupgrade.py \
				--prior "${PRIOR_CONFIG_DIR}" --config "${ALLSKY_CONFIG}" ; then
			display_msg --log error "Copying 'modules' directory had problems."
		fi
	else
		display_msg --log progress "${ITEM}: ${NOT_RESTORED}"
	fi

	ITEM="${SPACE}'config/overlay' directory"
	if [[ -d ${PRIOR_CONFIG_DIR}/overlay ]]; then
#XXXX FIX: TODO: only copy over user-generated or user-modified files
		display_msg --log progress "${ITEM} (copying)"
		cp -ar "${PRIOR_CONFIG_DIR}/overlay" "${ALLSKY_CONFIG}"

		# Restore the new fields.json file as it's part of the main Allsky distribution
		# and should be replaced during an upgrade.
		cp -a "${ALLSKY_REPO}/overlay/config/fields.json" "${ALLSKY_OVERLAY}/config/"
	else
		display_msg --log progress "${ITEM}: ${NOT_RESTORED}"
	fi
	[[ ! -d ${MY_OVERLAY_TEMPLATES} ]] && mkdir -p "${MY_OVERLAY_TEMPLATES}"

	ITEM="${SPACE}'config/ssl' directory"
	if [[ -d ${PRIOR_CONFIG_DIR}/ssl ]]; then
		display_msg --log progress "${ITEM} (copying)"
		cp -ar "${PRIOR_CONFIG_DIR}/ssl" "${ALLSKY_CONFIG}"
	else
		# Almost no one has this directory, so don't show to user.
		display_msg --logonly info "${ITEM}: ${NOT_RESTORED}"
	fi

	# This is not in a "standard" directory so we need to determine where it was.
	E="${ALLSKY_EXTRA//${ALLSKY_HOME}\//}"
	EXTRA="${PRIOR_ALLSKY_DIR}${E}"
	ITEM="${SPACE}'${E}' directory"
	if [[ -d ${EXTRA} ]]; then
		display_msg --log progress "${ITEM} (copying)"
		cp -ar "${EXTRA}" "${ALLSKY_EXTRA}/.."
	else
		display_msg --log progress "${ITEM}: ${NOT_RESTORED}"
	fi

	if [[ ${PRIOR_ALLSKY_STYLE} == "${NEW_STYLE_ALLSKY}" ]]; then
		D="${PRIOR_CONFIG_DIR}"
	else
		# raspap.auth was in a different directory in older versions.
		D="${OLD_RASPAP_DIR}"
	fi
	R="raspap.auth"
	ITEM="${SPACE}WebUI security settings (${R})."
	if [[ -f ${D}/${R} ]]; then
		display_msg --log progress "${ITEM} (copying)"
		cp -a "${D}/${R}" "${ALLSKY_CONFIG}"
	else
		display_msg --log progress "${ITEM}: ${NOT_RESTORED}"
	fi

	ITEM="${SPACE}uservariables.sh"
	if [[ -f ${PRIOR_CONFIG_DIR}/uservariables.sh ]]; then
		display_msg --log progress "${ITEM}: ${NOT_RESTORED} (copying)"
		cp -a "${PRIOR_CONFIG_DIR}/uservariables.sh" "${ALLSKY_CONFIG}"
	# Don't bother with the "else" part since this file is very rarely used.
	fi

	restore_prior_local_website_files
	restore_prior_settings_file

	# Do NOT restore options.json - it will be recreated.

	# Done with restores, now the updates.

	COPIED_PRIOR_CONFIG_SH="true"		# Global variable
	if [[ -s ${PRIOR_CONFIG_FILE} ]]; then
		# This copies the settings from the prior config file to the settings file.
		convert_config_sh "${PRIOR_CONFIG_FILE}" "${SETTINGS_FILE}" || COPIED_PRIOR_CONFIG_SH="false"
	fi
	STATUS_VARIABLES+=( "COPIED_PRIOR_CONFIG_SH='${COPIED_PRIOR_CONFIG_SH}'\n" )

	# The ftp-settings.sh file was originally in allsky/scripts but
	# moved to allsky/config in version ${FIRST_VERSION_VERSION}.
	# It no longer exists, but if a prior one exists copy its contents to the settings file.
	# Get the current and prior (if any) file version.
	if [[ -f ${PRIOR_FTP_FILE} ]]; then			# allsky/config version
		# Version ${FIRST_VERSION_VERSION} and newer.
		:
	elif [[ -f ${PRIOR_ALLSKY_DIR}/scripts/ftp-settings.sh ]]; then
		# pre ${FIRST_VERSION_VERSION}
		PRIOR_FTP_FILE="${PRIOR_ALLSKY_DIR}/scripts/ftp-settings.sh"
	else
		if [[ -s ${PRIOR_CONFIG_FILE} ]]; then
			# If there was a prior config file there should have been a prior ftp file.
			display_msg --log error "Unable to find prior ftp-settings.sh (${PRIOR_FTP_FILE})."
		fi
		PRIOR_FTP_FILE=""
	fi
	COPIED_PRIOR_FTP_SH="true"			# Global variable
	if [[ -s ${PRIOR_FTP_FILE} ]]; then
		convert_ftp_sh "${PRIOR_FTP_FILE}" "${SETTINGS_FILE}" || COPIED_PRIOR_FTP_SH="false"
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
	echo -e "\n\n==========\n${MSG}" >> "${POST_INSTALLATION_ACTIONS}"
	if [[ -n ${MSG2} ]]; then
		display_msg --log info "\n${MSG2}\n"
		echo -e "\n${MSG2}" >> "${POST_INSTALLATION_ACTIONS}"
	fi
}


####
# Perform all tasks related to local and remote Websites.
do_Website_tasks()
{
	declare -n v="${FUNCNAME[0]}"; [[ ${v} == "true" ]] && return

#XXXX TODO: do this in makeChanges.sh when they enable the local Website.
	if [[ ! -f "${ALLSKY_WEBSITE_CONFIGURATION_FILE}" ]]; then
		# No prior config file (this should only happen if there was no prior Website).
		cp  "${ALLSKY_REPO}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}.repo" \
			"${ALLSKY_WEBSITE_CONFIGURATION_FILE}"
		update_json_file ".${WEBSITE_ALLSKY_VERSION}"  "${ALLSKY_VERSION}" \
			"${ALLSKY_WEBSITE_CONFIGURATION_FILE}"
	fi

	STATUS_VARIABLES+=( "${FUNCNAME[0]}='true'\n" )
}

####
# If a prior Website exists move its data to the new location.
restore_prior_remote_website_files()
{
	declare -n v="${FUNCNAME[0]}"
	if [[ ${v} == "true" ]]; then
		display_msg --logonly info "Remote Website configuration file already restored."
		return
	fi

	local PRIOR_V   ITEM   MSG

	# Restore the remote Allsky Website configuration file if it exists.
	ITEM="${SPACE}'${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_NAME}'"
	if [[ -f ${PRIOR_REMOTE_WEBSITE_CONFIGURATION_FILE} ]]; then
		display_msg --log progress "${ITEM} (copying)"
		cp "${PRIOR_REMOTE_WEBSITE_CONFIGURATION_FILE}" "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}"

		# Check the Allsky version in the remote file - if it's old let user know.
		PRIOR_V="$( settings ".${WEBSITE_ALLSKY_VERSION}" "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}" )"
# TODO: if not using remote Website, change messages below
		if [[ ${PRIOR_V} == "${ALLSKY_VERSION}" ]]; then
			display_msg --log progress "Remote Website already at latest Allsky version ${PRIOR_V}."
		else
			MSG="Your remote Website needs to be updated to this newest version."
			MSG+="\nIt is at version ${PRIOR_V}"
			MSG+="\n\nRun:  cd ~/allsky;  ./remote_website_install.sh"
			display_msg --log notice "${MSG}"
			# The command above will update the version.
		fi
	else
# TODO: if they are using the remote website warn them the old configuration.json file wasn't found
# and turn off useRemoteWebsite.
		display_msg --log progress "${ITEM}: ${NOT_RESTORED}"
	fi

	STATUS_VARIABLES+=( "${FUNCNAME[0]}='true'\n" )
}

####
# Get a count of the number of the specified file in the specified directory.
get_count()
{
	local DIR="${1}"
	local FILENAME="${2}"
	return echo $( find "${DIR}" -maxdepth 1 -name "${FILENAME}" | wc -l )
}

####
# If a prior local Website exists move its data to the new location.
restore_prior_local_website_files()
{
	declare -n v="${FUNCNAME[0]}"
	if [[ ${v} == "true" ]]; then
		display_msg --logonly info "Local Website files already restored."
		return
	fi

	local ITEM   D   count   A   MSG

	ITEM="${SPACE}Local Website files"
	if [[ -z ${PRIOR_WEBSITE_DIR} ]]; then
		display_msg --log progress "${ITEM}: ${NOT_RESTORED}"
		restore_prior_remote_website_files
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

	ITEM="${SPACE}${SPACE}'myFiles' directory"
	D="${PRIOR_WEBSITE_DIR}/myFiles"
	if [[ -d ${D} ]]; then
		count=$( get_count "${D}" '*' )
		if [[ ${count} -gt 1 ]]; then
			display_msg --log progress "${ITEM} (moving)"
			mv "${D}"   "${ALLSKY_WEBSITE}"
		fi
	else
		display_msg --log progress "${ITEM}: ${NOT_RESTORED}"
	fi

	# This is the old name.
# TODO: remove this check in the next release.
	ITEM="${SPACE}${SPACE}'myImages' directory"
	D="${PRIOR_WEBSITE_DIR}/myImages"
	if [[ -d ${D} ]]; then
		count=$( get_count "${D}" '*' )
		if [[ ${count} -gt 1 ]]; then
			local MSG2="  Please use 'myFiles' going forward."
			display_msg --log progress "${ITEM} (copying to '${ALLSKY_WEBSITE}/myFiles')" "${MSG2}"
			cp "${D}"/*   "${ALLSKY_WEBSITE}/myFiles"
		fi
	else
		# Since this is obsolete only add to log file.
		display_msg --logonly progress "${ITEM}: ${NOT_RESTORED}"
	fi

	A="analyticsTracking.js"
	ITEM="${SPACE}${SPACE}${A}"
	D="${PRIOR_WEBSITE_DIR}/${A}"
	if [[ -f ${D} ]]; then
		if ! cmp --silent "${D}" "${ALLSKY_WEBSITE}/${A}" ; then
			display_msg --log progress "${ITEM} (copying)"
			cp "${D}" "${ALLSKY_WEBSITE}"
		fi
	else
		display_msg --log progress "${ITEM}: ${NOT_RESTORED}"
	fi

	# Now deal with the configuration file.
	if [[ ${PRIOR_WEBSITE_STYLE} == "${OLD_STYLE_WEBSITE}" ]]; then
		# The format of the old files is too different from the new file,
		# so force them to manually copy settings.
		MSG="You need to manually copy your prior Website settings in"
		MSG+="\n\t${PRIOR_WEBSITE_DIR}"
		MSG+="\nto '${ALLSKY_WEBSITE_CONFIGURATION_NAME}' in the WebUI."
		display_msg --log info "${MSG}"
		echo -e "\n\n==========\n${MSG}" >> "${POST_INSTALLATION_ACTIONS}"

	else		# NEW_STYLE_WEBSITE
		ITEM="${SPACE}${SPACE}${ALLSKY_WEBSITE_CONFIGURATION_NAME}"
		if [[ ${PRIOR_WEB_CONFIG_VERSION} < "${NEW_WEB_CONFIG_VERSION}" ]]; then
			MSG="${ITEM} (copying and updating for version ${NEW_WEB_CONFIG_VERSION})"
			display_msg --log progress "${MSG}"
		fi

		# Copy the old file to the current location.
		cp "${PRIOR_WEBSITE_DIR}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}" \
			"${ALLSKY_WEBSITE_CONFIGURATION_FILE}"

		if [[ ${PRIOR_WEB_CONFIG_VERSION} < "${NEW_WEB_CONFIG_VERSION}" ]]; then
			# If different versions, then update the current one.
			update_website_config_file "${ALLSKY_WEBSITE_CONFIGURATION_FILE}" \
				"${PRIOR_WEB_CONFIG_VERSION}" "${NEW_WEB_CONFIG_VERSION}" "local"
		else
			display_msg --log progress "${ITEM} (copying)"
			MSG="${ALLSKY_WEBSITE_CONFIGURATION_NAME}: Already current @ version ${NEW_WEB_CONFIG_VERSION}"
			display_msg --logonly info "${MSG}"
		fi
	fi

	restore_prior_remote_website_files

	STATUS_VARIABLES+=( "${FUNCNAME[0]}='true'\n" )
}


####
# "Fix" things then exit.
# This can be needed if the user hosed something up, or there was a problem somewhere.
# It does no harm to call this when not needed.
do_fix()
{
	update_php_defines
	set_permissions
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

	exit_installation 0 "${STATUS_OK}" "Update completed."
}

####
# Install the Trutype fonts
install_fonts()
{
	declare -n v="${FUNCNAME[0]}"
	if [[ ${v} == "true" ]]; then
		display_msg --logonly info "Fonts already installed"
		return
	fi

	display_msg --log progress "Installing Trutype fonts."
	TMP="${ALLSKY_LOGS}/msttcorefonts.log"
	local M="Trutype fonts failed"
	sudo apt-get --assume-yes install msttcorefonts > "${TMP}" 2>&1
	check_success $? "${M}" "${TMP}" "${DEBUG}" || exit_with_image 1 "${STATUS_ERROR}" "${M}"

	STATUS_VARIABLES+=( "${FUNCNAME[0]}='true'\n" )
}

####
# Install the overlay and modules system
install_PHP_modules()
{
	if [[ ${install_PHP_modules} == "true" ]]; then
		display_msg --logonly info "PHP modules already installed"
		return
	fi

	display_msg --log progress "Installing PHP modules and dependencies."
	TMP="${ALLSKY_LOGS}/PHP_modules.log"
	sudo apt-get --assume-yes install php-zip php-sqlite3 python3-pip > "${TMP}" 2>&1
	check_success $? "PHP module installation failed" "${TMP}" "${DEBUG}" ||
		exit_with_image 1 "${STATUS_ERROR}" "PHP module install failed."

	TMP="${ALLSKY_LOGS}/libatlas.log"
	sudo apt-get --assume-yes install libatlas-base-dev > "${TMP}" 2>&1
	check_success $? "PHP dependencies failed" "${TMP}" "${DEBUG}" ||
		exit_with_image 1 "${STATUS_ERROR}" "PHP dependencies failed."

	STATUS_VARIABLES+=( "${FUNCNAME[0]}='true'\n" )
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

	local PREFIX  REQUIREMENTS_FILE  M  R  NUM_TO_INSTALL
	local NAME  PKGs  TMP  COUNT  C  PACKAGE  STATUS_NAME  L  M  MSG

	# Doing all the python dependencies at once can run /tmp out of space, so do one at a time.
	# This also allows us to display progress messages.
	M=" for ${PI_OS^}"
	R="-${PI_OS}"
	if [[ ${PI_OS} == "buster" ]]; then
		# Force pip upgrade, without this installations on Buster fail.
		pip3 install --upgrade pip > /dev/null 2>&1
	elif [[ ${PI_OS} != "bullseye" && ${PI_OS} != "bookworm" ]]; then
		display_msg --log warning "Unknown operating system: ${PI_OS}."
		M=""
		R=""
	fi

    display_msg --logonly info "Attempting to locate Python dependency file"
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
	NAME="Python_dependencies"

	if [[ ${PI_OS} == "bookworm" ]]; then
		PKGs="python3-full libgfortran5 libopenblas0-pthread"
		display_msg --log progress "Installing ${PKGs}."
		TMP="${ALLSKY_LOGS}/python3-full.log"
		# shellcheck disable=SC2086
		sudo apt-get --assume-yes install ${PKGs} > "${TMP}" 2>&1
		check_success $? "${PKGs} install failed" "${TMP}" "${DEBUG}" ||
			exit_with_image 1 "${STATUS_ERROR}" "${PKGs} install failed."

		python3 -m venv "${ALLSKY_PYTHON_VENV}" --system-site-packages
		activate_python_venv
	fi

	# Temporary fix to ensure that all dependencies are available for the Allsky modules as the
	# flow upgrader needs to load each module and if the dependencies are missing this will fail.
	if [[ -d "${ALLSKY_PYTHON_VENV}" && -d "${PRIOR_PYTHON_VENV}" ]]; then
		display_msg --logonly info "Copying '${PRIOR_PYTHON_VENV}' to '${ALLSKY_PYTHON_VENV}'"
		cp -arn "${PRIOR_PYTHON_VENV}" "${ALLSKY_PYTHON_VENV}/"
	fi

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
		# Need indirection since the ${STATUS_NAME} is the variable name and we want its value.
		STATUS_NAME="${NAME}_${COUNT}"
		eval "STATUS_VALUE=\${${STATUS_NAME}}"
		if [[ ${STATUS_VALUE} == "true" ]]; then
			display_msg --log progress "${PACKAGE} - already installed."
			continue
		fi
		display_msg --log progress "${PACKAGE}"

		L="${TMP}.${COUNT}.log"
		M="${NAME} [${package}] failed"
		pip3 install --no-warn-script-location -r /tmp/package > "${L}" 2>&1
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

	STATUS_VARIABLES+=( "${FUNCNAME[0]}='true'\n" )
}

####
# Install the overlay and modules system
install_overlay()
{
	declare -n v="${FUNCNAME[0]}"; [[ ${v} == "true" ]] && return
	local CSO  O

	# Do the rest, even if we already did it in a previous installation,
	# in case something in the directories changed.

	display_msg --log progress "Setting up default modules and overlays."
	# These will get overwritten later if the user has prior versions.
	cp -ar "${ALLSKY_REPO}/overlay" "${ALLSKY_REPO}/modules" "${ALLSKY_CONFIG}"

	# Normally makeChanges.sh handles creating the "overlay.json" file, but the
	# Camera-Specific Overlay (CSO) file didn't exist when makeChanges was called,
	# so we have to set it up here.
	CSO="${ALLSKY_OVERLAY}/config/overlay-${CAMERA_TYPE}.json"
	O="${ALLSKY_OVERLAY}/config/overlay.json"		# generic name
	if [[ -f ${CSO} ]]; then
		display_msg "${LOG_TYPE}" progress "Copying '${CSO}' to 'overlay.json'."
		cp "${CSO}" "${O}"
	else
		display_msg --log error "'${CSO}' does not exist; unable to create default overlay file."
	fi

	STATUS_VARIABLES+=( "${FUNCNAME[0]}='true'\n" )
}


####
log_info()
{
	declare -n v="${FUNCNAME[0]}"; [[ ${v} == "true" ]] && return

	display_msg --logonly info "/etc/os-release:\n$( indent "$( < /etc/os-release )" )"
	display_msg --logonly info "id = $( id )"
	display_msg --logonly info "uname = $( uname -a )"

	STATUS_VARIABLES+=( "${FUNCNAME[0]}='true'\n" )
}


####
check_if_buster()
{
	declare -n v="${FUNCNAME[0]}"; [[ ${v} == "true" ]] && return
	local MSG

	[[ ${PI_OS} != "buster" ]] && return

	MSG="WARNING: You are running the older Buster operating system."
	MSG+="\n\n\n>>> This is the last Allsky release that will support Buster. <<<\n\n"
	MSG+="\nWe recommend doing a fresh install of Bookworm 64-bit on a clean SD card now."
	MSG+="\n\nDo you want to continue anyhow?"
	if ! whiptail --title "${TITLE}" --yesno --defaultno "${MSG}" 20 "${WT_WIDTH}" 3>&1 1>&2 2>&3; then
		display_msg --logonly info "User running Buster and elected not to continue."
		exit_installation 0 "${STATUS_NOT_CONTINUE}" "After Buster check."
	fi
	display_msg --logonly info "User running Buster and elected to continue."

	STATUS_VARIABLES+=( "${FUNCNAME[0]}='true'\n" )
}


####
# Display an image the user will see when they go to the WebUI during installation.
display_image()
{
	local IMAGE_OR_CUSTOM="${1}"
	local FULL_FILENAME  FILENAME  EXTENSION  IMAGE_NAME  COLOR  CUSTOM_MESSAGE  MSG

	# ${ALLSKY_TMP} may not exist yet, i.e., at the beginning of installation.
	mkdir -p "${ALLSKY_TMP}"

	if [[ -s ${SETTINGS_FILE} ]]; then		# The file may not exist yet.
		FULL_FILENAME="$( settings ".filename" )"
		FILENAME="${FULL_FILENAME%.*}"
		EXTENSION="${FULL_FILENAME##*.}"
	else
		FILENAME="image"
		EXTENSION="jpg"
	fi

	if [[ -z ${IMAGE_OR_CUSTOM} ]]; then		# No IMAGE_OR_CUSTOM means remove the image
		display_msg --logonly info "Removing prior notification image."
		rm -f "${ALLSKY_TMP}/${FILENAME}.${EXTENSION}"
		return
	fi

	if [[ ${IMAGE_OR_CUSTOM} == "--custom" ]]; then
		# Create custom message
		COLOR="${2}"
		CUSTOM_MESSAGE="${3}"

		MSG="Displaying custom notification image: $( echo -e "${CUSTOM_MESSAGE}" | tr '\n' ' ' )"
		display_msg --logonly info "${MSG}"
		"${ALLSKY_SCRIPTS}/generate_notification_images.sh" \
			--directory "${ALLSKY_TMP}" \
			"${FILENAME}" "${COLOR}" "" "" "" "" \
			"" "10" "${COLOR}" "${EXTENSION}" "" "${CUSTOM_MESSAGE}"   > /dev/null
	else
		IMAGE_NAME="${IMAGE_OR_CUSTOM}"

		if [[ ${IMAGE_NAME} == "ConfigurationNeeded" && -f ${POST_INSTALLATION_ACTIONS} ]]; then
			# Add a message the user will see in the WebUI.
			MSG="Actions needed.  See ${POST_INSTALLATION_ACTIONS}."
			"${ALLSKY_SCRIPTS}/addMessage.sh" "warning" "${MSG}"

			# This tells allsky.sh not to display a message about actions since we just did.
			touch "${POST_INSTALLATION_ACTIONS}_initial_message"
		fi

		display_msg --logonly info "Displaying notification image '${IMAGE_NAME}.${EXTENSION}'"
		cp "${ALLSKY_NOTIFICATION_IMAGES}/${IMAGE_NAME}.${EXTENSION}" "${I}" 2>/dev/null
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
# Check if we restored all prior settings.
# Global: CONFIGURATION_NEEDED
check_restored_settings()
{
	local IMG  AFTER  MSG
	if [[ ${RESTORED_PRIOR_SETTINGS_FILE} == "true" && \
	  	  ${COPIED_PRIOR_CONFIG_SH} == "true" && \
	  	  ${COPIED_PRIOR_FTP_SH} == "true" ]]; then
		# We restored all the prior settings so no configuration is needed.
		# However, check if a reboot is needed.
		CONFIGURATION_NEEDED="false"	# global variable
		if [[ ${REBOOT_NEEDED} == "true" ]]; then
			IMG="RebootNeeded"
		else
			IMG=""					# Blank name removes existing image
		fi
		display_image "${IMG}"
		return
	fi

	if [[ ${REBOOT_NEEDED} == "true" ]]; then
		AFTER="rebooting"
	else
		AFTER="installation is complete"
	fi
	if [[ ${RESTORED_PRIOR_SETTINGS_FILE} == "false" ]]; then
		MSG="Default settings were created for your ${CAMERA_TYPE} camera."
		MSG+="\n\nHowever, you must update them by going to the"
		MSG+=" 'Allsky Settings' page in the WebUI after ${AFTER}."
		whiptail --title "${TITLE}" --msgbox "${MSG}" 12 "${WT_WIDTH}" 3>&1 1>&2 2>&3
	fi

	display_image "ConfigurationNeeded"
	CONFIGURATION_NEEDED="true"
}


####
# Do every time as a reminder.
remind_run_check_allsky()
{
	MSG="After you've configured Allsky, run:"
	MSG+="\n&nbsp; &nbsp; &nbsp; check_allsky.sh"
	MSG+="\nto check for any issues.  You can also run it whenever you make changes."
	"${ALLSKY_SCRIPTS}/addMessage.sh" "info" "${MSG}"
	display_msg --logonly info "Added message about running 'check_allsky.sh'."

	STATUS_VARIABLES+=( "${FUNCNAME[0]}='true'\n" )
}


####
# Do every time as a reminder.
remind_old_version()
{
	if [[ -n ${PRIOR_ALLSKY_STYLE} ]]; then
		MSG="When you are sure everything is working with the new Allsky release,"
		MSG+=" remove your old version in '${PRIOR_ALLSKY_DIR}' to save disk space."
		whiptail --title "${TITLE}" --msgbox "${MSG}" 12 "${WT_WIDTH}" 3>&1 1>&2 2>&3
		display_msg --logonly info "Displayed message about removing '${PRIOR_ALLSKY_DIR}'."
	fi
}

####
# Check if the extra modules need to be reinstalled.
# Do every time as a reminder.
update_modules()
{
	local X  MSG

	# Nothing to do if the extra modules aren't installed.
	X="$( find "${ALLSKY_MODULE_LOCATION}/modules" -type f -name "*.py" -print -quit 2> /dev/null )"
	[[ -z ${X} ]] && return

# xxxxxxxxxxx    TODO: check the CURRENT ${ALLSKY_PYTHON_VENV} or ${PRIOR_PYTHON_VENV} ?

	# If a venv isn't already installed then the install/update will create it,
	# but warn the user to reinstall the extra modules.
	if [[ ! -d ${ALLSKY_PYTHON_VENV} ]]; then
		MSG="You appear to have the Allsky Extra modules installed."
		MSG+="\nPlease reinstall these using the normal instructions at"
		MSG+="\n   https://github.com/AllskyTeam/allsky-modules"
		MSG+="\nThe extra modules will not function until you have reinstalled them."
		whiptail --title "${TITLE}" --msgbox "${MSG}" 12 "${WT_WIDTH}" 3>&1 1>&2 2>&3

		display_msg info "Don't forget to re-install your Allsky extra modules."
		display_msg --logonly info "Reminded user to re-install the extra modules."
		echo -e "\n\n==========\n${MSG}" >> "${POST_INSTALLATION_ACTIONS}"
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
	local MORE

	# If STATUS_CODE is set, add it and all STATUS_VARIABLES to the status file.
	if [[ -n ${STATUS_CODE} ]]; then
		if [[ ${STATUS_CODE} == "${STATUS_CLEAR}" ]]; then
			clear_status
		else
			if [[ -n ${MORE_STATUS} && ${MORE_STATUS} != "${STATUS_CODE}" ]]; then
				MORE="; MORE_STATUS='${MORE_STATUS}'"
			else
				MORE=""
			fi
			echo -e "STATUS_INSTALLATION='${STATUS_CODE}'${MORE}" > "${STATUS_FILE}"
			update_status_from_temp_file
			echo -e "${STATUS_VARIABLES[@]}" >> "${STATUS_FILE}"

			# If the user needs to reboot, save the current uptime-since
			# so we can check it when Allsky starts.  If it's the same value
			# the user did not reboot.
			# If the time is different the user rebooted.
			if [[ ${STATUS_CODE} == "${STATUS_NO_FINISH_REBOOT}" ||
				  ${STATUS_CODE} == "${STATUS_NO_REBOOT}" ]]; then
				uptime --since > "${ALLSKY_REBOOT_NEEDED}"
				display_image "RebootNeeded"
			else
				# Just in case it's left over from a prior install.
				rm -f "${ALLSKY_REBOOT_NEEDED}"
			fi
		fi
	fi

	[[ -z ${FUNCTION} ]] && display_msg "${LOG_TYPE}" info "\nENDING INSTALLATON AT $( date ).\n"

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

############################################## Main part of program

##### Calculate whiptail sizes
calc_wt_size

##### Check arguments
DEBUG=0
DEBUG_ARG=""
LOG_TYPE="--logonly"	# by default we only log some messages but don't display
IN_TESTING="false"

#shellcheck disable=SC2119
[[ $( get_branch ) != "${GITHUB_MAIN_BRANCH}" ]] && IN_TESTING="true"

if [[ ${IN_TESTING} == "true" ]]; then
	DEBUG=1; DEBUG_ARG="--debug"; LOG_TYPE="--log"

	T="${ALLSKY_HOME}/told"
	if [[ ! -f ${T} ]]; then
		MSG="\nTesters, until we go-live with this release, debugging is automatically on."
		MSG+="\n\nPlease set Debug Level to 3 during testing."
		MSG+="\n"

		MSG+="\nMajor changes from prior release:"
		MSG+="\n * ZWO library 1.33 cameras."
		MSG+="\n * Setting names are now lowercase."
		MSG+="\n * WebUI sections are hidden by default."
		MSG+="\n * ftp-settings.sh and config.sh are gone."
		MSG+="\n   Their settings are now in the WebUI's 'Allsky Settings' page."

		MSG+="\n\nIf you want to continue with the installation, enter:    yes"
		title="*** MESSAGE FOR TESTERS ***"
		A=$( whiptail --title "${title}" --inputbox "${MSG}" 26 "${WT_WIDTH}"  3>&1 1>&2 2>&3 )
		if [[ $? -ne 0 || ${A} != "yes" ]]; then
			MSG="\nYou must type 'yes' to continue the installation."
			MSG+="\nThis is to make sure you read it.\n"
			display_msg info "${MSG}"
			exit 0
		fi
		touch "${T}"
	fi
fi

OK="true"
HELP="false"
UPDATE="false"
FIX="false"
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
#XXX TODO: is --update still needed?
		--update)
			UPDATE="true"
			;;
		--fix)
			FIX="true"
			;;
		--function)
			FUNCTION="${2}"
			shift
			;;
		*)
			display_msg --log error "Unknown argument: '${ARG}'."
			OK="false"
			;;
	esac
	shift
done


if [[ -n ${FUNCTION} || ${FIX} == "true" ]]; then
	# Don't log when a single function is executed.
	DISPLAY_MSG_LOG=""
else
	mkdir -p "${ALLSKY_LOGS}"

	display_msg "${LOG_TYPE}" info "STARTING INSTALLATON OF ${ALLSKY_VERSION} AT $( date ).\n"
	display_msg --logonly info "PI_OS=${PI_OS}"
fi

[[ ${HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" ]] && usage_and_exit 1

[[ ${FIX} == "true" ]] && do_fix		# does not return

trap "handle_interrupts" SIGTERM SIGINT

# See if we should skip some steps.
# When most function are called they add a variable with the function's name set to "true".
if [[ -z ${FUNCTION} && -s ${STATUS_FILE} ]]; then
	# Initially just get the STATUS and MORE_STATUS.
	# After that we may clear the file or get all the variables.
	eval "$( grep "^STATUS_INSTALLATION" "${STATUS_FILE}" )"

	if [[ ${STATUS_INSTALLATION} == "${STATUS_OK}" ]]; then
		MSG="The last installation completed successfully."
		MSG+="\n\nDo you want to re-install from the beginning?"
		MSG+="\n\nSelecting <No> will exit the installation without making any changes."
		if whiptail --title "${TITLE}" --yesno "${MSG}" 15 "${WT_WIDTH}"  3>&1 1>&2 2>&3; then
			display_msg --log progress "Re-starting installation after successful install."
			clear_status
		else
			display_msg --log progress "Not continuing after prior successful installation."
			exit_installation 0 ""
		fi
	elif [[ ${STATUS_INSTALLATION} == "${STATUS_NO_FINISH_REBOOT}" ]]; then
		MSG="The installation completed successfully but the following needs to happen"
		MSG+=" before Allsky is ready to run:"
		MSG2="\n"
		MSG2+="\n    1. Verify your settings in the WebUi's 'Allsky Settings' page."
		MSG2+="\n    2. Reboot the Pi."
		MSG3="\n\nHave you already performed those steps?"
		if whiptail --title "${TITLE}" --yesno "${MSG}${MSG2}${MSG3}" 15 "${WT_WIDTH}"  3>&1 1>&2 2>&3; then
			MSG="\nCongratulations, you successfully installed Allsky version ${ALLSKY_VERSION}!"
			MSG+="\nAllsky is starting.  Look in the 'Live View' page of the WebUI to ensure"
			MSG+="\nimages are being taken.\n"
			display_msg --log progress "${MSG}"
			sudo systemctl start allsky

			# Update status
			sed -i \
				-e "s/${STATUS_NO_FINISH_REBOOT}/${STATUS_OK}/" \
				-e "s/MORE_STATUS.*//" \
					"${STATUS_FILE}"
		else
			display_msg --log info "\nPlease perform the following steps:${MSG2}\n"
		fi
		exit_installation 0 "" ""
	else
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
			if whiptail --title "${TITLE}" --yesno "${MSG}" 15 "${WT_WIDTH}"  3>&1 1>&2 2>&3; then
				display_msg --log progress "Restarting installation."
			else
				display_msg --log progress "Not continuing after prior partial installation."
				exit_installation 0 ""
			fi
		fi
	fi
fi

##### Log some info to help in troubleshooting.
[[ -z ${FUNCTION} ]] && log_info

##### Display a message to Buster users.
[[ -z ${FUNCTION} ]] && check_if_buster

##### Does a prior Allsky exist? If so, set PRIOR_ALLSKY_STYLE and other PRIOR_* variables.
# Re-run every time in case the directory was removed.
does_prior_Allsky_exist

##### Display the welcome header
[[ -z ${FUNCTION} ]] && do_initial_heading

##### See if we need to reboot at end of installation
[[ -n ${PRIOR_ALLSKY_STYLE} ]] && is_reboot_needed "${PRIOR_ALLSKY_VERSION}" "${ALLSKY_VERSION}"

##### Determine what steps, if any, can be skipped.
set_what_can_be_skipped "${PRIOR_ALLSKY_VERSION}" "${ALLSKY_VERSION}"

##### Stop Allsky
stop_allsky

##### Determine what camera(s) are connected
# Re-run every time in case a camera was connected or disconnected.
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
	do_function "${FUNCTION}"
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

##### If raspistill exists on post-Buster OS, rename it.
check_for_raspistill

##### Get the new host name
prompt_for_hostname

##### Check for sufficient swap space
check_swap

##### Optionally make ${ALLSKY_TMP} a memory filesystem
check_tmp


MSG="The following steps can take up to an hour depending on the speed of"
MSG+="\nyour Pi and how many of the necessary dependencies are already installed."
MSG+="\nYou will see progress messages throughout the process."
MSG+="\nAt the end you will be prompted again for additional steps."
display_msg notice "${MSG}"


##### Install web server
# This must come BEFORE save_camera_capabilities, since it installs php.
install_webserver_et_al

##### Install dependencies, then compile and install Allsky software
# This will create the "config" directory and put default files in it.
install_dependencies_etc

##### Update PHP "define()" variables
update_php_defines

##### Create the camera type/model-specific "options" file
# This should come after the steps above that create ${ALLSKY_CONFIG}.
save_camera_capabilities "false"

##### Set locale.  May reboot instead of returning.
set_locale

##### Create the Allsky log files
create_allsky_logs

##### Install the overlay and modules system and things it needs
install_fonts
install_PHP_modules
install_Python
install_overlay

##### Restore prior files if needed
[[ ${WILL_USE_PRIOR} == "true" ]] && restore_prior_files

##### Tasks for Allsky Websites
do_Website_tasks

##### Set permissions.  Want this at the end so we make sure we get all files.
# Re-run every time in case permissions changed.
set_permissions

##### Update the sudoers file
do_sudoers

##### Check if there's an old WebUI and let the user know it's no longer used.
# Prompt user to remove any prior old-style WebUI.
check_old_WebUI_location

##### See if we should reboot when installation is done.
[[ ${REBOOT_NEEDED} == "true" ]] && ask_reboot "full"			# prompts

##### Display any necessary messaged about restored / not restored settings
# Re-run every time to possibly remind them to update their settings.
check_restored_settings

##### Let the user know to run check_allsky.sh.
remind_run_check_allsky

##### Check if extra modules need to be reinstalled.
update_modules

##### If needed, remind the user to remove any old Allsky version
# Re-run every time to remind the user again.
remind_old_version


######## All done

[[ ${WILL_REBOOT} == "true" ]] && do_reboot "${STATUS_FINISH_REBOOT}" ""		# does not return

if [[ ${REBOOT_NEEDED} == "true" ]]; then
	display_msg --log progress "\nInstallation is done" " but the Pi needs a reboot.\n"
	exit_installation 0 "${STATUS_NO_FINISH_REBOOT}" ""
fi

if [[ ${CONFIGURATION_NEEDED} == "false" ]]; then
	display_image --custom "lime" "Allsky is\nready to start"
	display_msg --log progress "\nInstallation is done and Allsky is ready to start."
else
	display_msg --log progress "\nInstallation is done" " but Allsky needs to be configured."
	display_msg progress "" "Go to the 'Allsky Settings' page of the WebUI to configure Allsky."
fi

display_msg progress "\nEnjoy Allsky!\n"
exit_installation 0 "${STATUS_OK}" ""
