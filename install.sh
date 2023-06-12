#!/bin/bash
# shellcheck disable=SC2154		# referenced but not assigned

[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$(realpath "$(dirname "${BASH_ARGV0}")")"
ME="$(basename "${BASH_ARGV0}")"

#shellcheck disable=SC2086 source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit ${ALLSKY_ERROR_STOP}
#shellcheck disable=SC2086 source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"					|| exit ${ALLSKY_ERROR_STOP}

# This file defines functions plus sets many variables.
#shellcheck disable=SC2086 source-path=scripts
source "${ALLSKY_SCRIPTS}/installUpgradeFunctions.sh"	|| exit ${ALLSKY_ERROR_STOP}

if [[ ${EUID} -eq 0 ]]; then
	display_msg error "This script must NOT be run as root, do NOT use 'sudo'."
	exit 1
fi

# This script assumes the user already did the "git clone" into ${ALLSKY_HOME}.

#shellcheck disable=SC2086
cd "${ALLSKY_HOME}"  									|| exit ${ALLSKY_ERROR_STOP}

# PRIOR_ALL_DIR is passed to us and is the location of an optional prior copy of Allsky.
PRIOR_CONFIG_DIR="${PRIOR_ALLSKY_DIR}/config"
PRIOR_CONFIG_FILE="${PRIOR_CONFIG_DIR}/config.sh"
PRIOR_FTP_FILE="${PRIOR_CONFIG_DIR}/ftp-settings.sh"	# may change depending on old version

TITLE="Allsky Installer"
FINAL_SUDOERS_FILE="/etc/sudoers.d/allsky"
OLD_RASPAP_DIR="/etc/raspap"			# used to contain WebUI configuration files
SETTINGS_FILE_NAME="$(basename "${SETTINGS_FILE}")"
FORCE_CREATING_SETTINGS_FILE="false"	# should a default settings file be created?
RESTORED_PRIOR_SETTINGS_FILE="false"
PRIOR_SETTINGS_FILE=""					# Full pathname to the prior settings file, if it exists
RESTORED_PRIOR_CONFIG_SH="false"		# prior config.sh restored?
RESTORED_PRIOR_FTP_SH="false"			# prior ftp-settings.sh restored?
ALLSKY_VERSION="$( get_version )"		# version we're installing
PRIOR_ALLSKY=""							# Set to "new" or "old" if they have a prior version
PRIOR_ALLSKY_VERSION=""					# The version number of the prior version, if known
SUGGESTED_NEW_HOST_NAME="allsky"		# Suggested new host name
NEW_HOST_NAME=""						# User-specified host name
BRANCH="${GITHUB_MAIN_BRANCH}"			# default branch

# Repo files
REPO_SUDOERS_FILE="${ALLSKY_REPO}/sudoers.repo"
REPO_WEBUI_DEFINES_FILE="${ALLSKY_REPO}/allskyDefines.inc.repo"
REPO_LIGHTTPD_FILE="${ALLSKY_REPO}/lighttpd.conf.repo"
REPO_AVI_FILE="${ALLSKY_REPO}/avahi-daemon.conf.repo"

# The POST_INSTALLATION_ACTIONS contains information the user needs to act upon after the reboot.
rm -f "${POST_INSTALLATION_ACTIONS}"		# Shouldn't be there, but just in case.

rm -f "${ALLSKY_MESSAGES}"					# Start out with no messages.

# display_msg() will send "log" entries to this file.
# DISPLAY_MSG_LOG is used in display_msg()
# shellcheck disable=SC2034
DISPLAY_MSG_LOG="${ALLSKY_INSTALLATION_LOGS}/install.sh.log"

# Holds status of installation if we need to exit and get back in.
STATUS_FILE="${ALLSKY_INSTALLATION_LOGS}/status.txt"
STATUS_FILE_TEMP="${ALLSKY_TMP}/temp_status.txt"	# holds intermediate status
STATUS_LOCALE_REBOOT="Rebooting to change locale"	# status of rebooting due to locale change
STATUS_NO_LOCALE="Desired locale not found"			# exiting due to desired locale not installed
STATUS_NO_CAMERA="No camera found"					# status of exiting due to no camera found
STATUS_OK="OK"										# Installation was completed.
STATUS_NOT_CONTINUE="User elected not to continue"	# Exiting, but not an error
STATUS_NO_REBOOT="User elected not to reboot"
STATUS_CLEAR="Clear"								# Clear the file
STATUS_ERROR="Error encountered"
STATUS_VARIABLES=()									# Holds all the variables and values to save

# Some versions of Linux default to 750 so web server can't read it
chmod 755 "${ALLSKY_HOME}"


####################### functions


####
# 
do_initial_heading()
{
	if [[ ${UPDATE} == "true" ]]; then
		display_header "Updating Allsky"
		return
	fi

	if [[ ${do_initial_heading} == "true" ]]; then
		display_header "Welcome back to the ${TITLE}!"
	else
		MSG="Welcome to the ${TITLE}!\n"

		if [[ -n ${PRIOR_ALLSKY} ]]; then
			MSG="${MSG}\nYou will be asked if you want to use the images and darks (if any) from"
			MSG="${MSG}\nyour prior version of Allsky."
			if [[ ${PRIOR_ALLSKY} == "newStyle" ]]; then
				MSG="${MSG}\nIf so, its settings will be used as well."
			else
				MSG="${MSG}\nIf so, we will attempt to use its settings as well, but may not be"
				MSG="${MSG}\nable to use ALL prior settings depending on how old your prior Allsky is."
				MSG="${MSG}\nIn that case, you'll be prompted for required information such as"
				MSG="${MSG}\nthe camera's latitude, logitude, and locale."
			fi
		else
			MSG="${MSG}\nYou will be prompted for required information such as the type"
			MSG="${MSG}\nof camera you have and the camera's latitude, logitude, and locale."
		fi

		MSG="${MSG}\n\nNOTE: your camera must be connected to the Pi before continuing."
		MSG="${MSG}\n\nContinue?"
		if ! whiptail --title "${TITLE}" --yesno "${MSG}" 25 "${WT_WIDTH}"  3>&1 1>&2 2>&3; then
			display_msg "${LOG_TYPE}" info "User not ready to continue."
			exit_installation 1 "${STATUS_CLEAR}" ""
		fi

		display_header "Welcome to the ${TITLE}!"
	fi

	[[ ${do_initial_heading} != "true" ]] && STATUS_VARIABLES+=("do_initial_heading='true'\n")
}

####
usage_and_exit()
{
	RET=${1}
	if [[ ${RET} -eq 0 ]]; then
		C="${YELLOW}"
	else
		C="${RED}"
	fi
	# Don't show --testing option since users shouldn't use it.
	echo
	echo -e "${C}Usage: ${ME} [--help] [--debug [...]] [--update] [--function function]${NC}"
	echo
	echo "'--help' displays this message and exits."
	echo
	echo "'--debug' displays debugging information. Can be called multiple times to increase level."
	echo
	echo "'--update' should only be used when instructed to by the Allsky Website."
	echo
	echo "'--function' executes the specified function and quits."
	echo
	#shellcheck disable=SC2086
	exit_installation ${RET}
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
	STATUS_VARIABLES+=("get_this_branch='true'\n")
	if ! B="$( git rev-parse --abbrev-ref HEAD )" ; then
		display_msg --log warning "Unable to determine branch; assuming '${BRANCH}'."
	else
		BRANCH="${B}"
		display_msg --logonly info "Using the '${BRANCH}' branch."
	fi

	STATUS_VARIABLES+=("BRANCH='${BRANCH}'\n")
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
		exit_installation 1 "${STATUS_CLEAR}" "unknown CAMERA_TYPE: '${CAMERA_TYPE}'"
	fi
}

#######
CONNECTED_CAMERAS=""
get_connected_cameras()
{
	local CC
	if determineCommandToUse "false" "" > /dev/null 2>&1 ; then
		display_msg --log info "RPi camera found."
		CC="RPi"
	fi
	if lsusb -d "03c3:" > /dev/null ; then
		display_msg --log info "ZWO camera found."
		[[ -n ${CC} ]] && CC="${CC} "
		CC="${CC}ZWO"
	fi

	if [[ -z ${CC} ]]; then
		MSG="No connected cameras were detected.  The installation will exit."
		whiptail --title "${TITLE}" --msgbox "${MSG}" 12 "${WT_WIDTH}" 3>&1 1>&2 2>&3

		MSG="No connected cameras were detected."
		MSG="${MSG}\nMake sure a camera is plugged in and working prior to restarting"
		MSG="${MSG} the installation."
		display_msg --log error "${MSG}"
		exit_installation 1 "${STATUS_NO_CAMERA}" ""
	fi

	if [[ -n ${CONNECTED_CAMERAS} ]]; then
		# Set from a prior installation.
		if [[ ${CONNECTED_CAMERAS} != "${CC}" ]]; then
			MSG="Connected cameras were '${CONNECTED_CAMERAS}' during last installation"
			MSG="${MSG} but are '${CC}' now."
			display_msg --log info "${MSG}"
			STATUS_VARIABLES+=("CONNECTED_CAMERAS='${CC}'\n")
		fi
		# Else the last one and this one are the same so don't save.
		CONNECTED_CAMERAS="${CC}"
		return
	fi

	STATUS_VARIABLES+=("get_connected_cameras='true'\n")
	# Either not set before or is different this time
	CONNECTED_CAMERAS="${CC}"
}

#
# Prompt the user to select their camera type, if we can't determine it automatically.
# If they have a prior installation of Allsky that uses either CAMERA or CAMERA_TYPE in config.sh,
# we can use its value and not prompt.
CAMERA_TYPE=""
select_camera_type()
{
	if [[ -n ${PRIOR_ALLSKY} ]]; then
		case "${PRIOR_ALLSKY_VERSION}" in
			# New versions go here...
			v2023.05.01*)
				# New style Allsky using ${CAMERA_TYPE}.
				CAMERA_TYPE="${PRIOR_CAMERA_TYPE}"

				# Don't bother with a message since this is a "similar" release.
				if [[ -n ${CAMERA_TYPE} ]]; then
					MSG="Using Camera Type '${CAMERA_TYPE}' from prior Allsky."
					STATUS_VARIABLES+=("select_camera_type='true'\n")
					STATUS_VARIABLES+=("CAMERA_TYPE='${CAMERA_TYPE}'\n")
					display_msg --logonly info "${MSG}"
					return
				else
					MSG="Camera Type not in prior new-style settings file."
					display_msg --log error "${MSG}"
				fi
				;;

			"v2022.03.01" | "old")
				local CAMERA="$( get_variable "CAMERA" "${PRIOR_CONFIG_FILE}" )"
				if [[ -n ${CAMERA} ]]; then
					CAMERA_TYPE="$( CAMERA_to_CAMERA_TYPE "${CAMERA}" )"
					STATUS_VARIABLES+=("select_camera_type='true'\n")
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
				;;
		esac
	fi

	local CT=()
	local NUM=0
	if [[ ${CONNECTED_CAMERAS} == "RPi" ]]; then
		CT+=("RPi" "     Raspberry Pi (HQ, Module 3, and compatibles)")
		((NUM++))
	elif [[ ${CONNECTED_CAMERAS} == "ZWO" ]]; then
		CT+=("ZWO" "     ZWO ASI")
		((NUM++))
	elif [[ ${CONNECTED_CAMERAS} == "RPi ZWO" ]]; then
		CT+=("RPi" "     Raspberry Pi (HQ, Module 3, and compatibles)")
		CT+=("ZWO" "     ZWO ASI")
		((NUM+=2))
	else		# shouldn't happen since we already checked
		MSG="INTERNAL ERROR:"
		if [[ -z ${CONNECTED_CAMERAS} ]]; then
			MSG="${MSG} CONNECTED_CAMERAS is empty."
		else
			MSG="${MSG} CONNECTED_CAMERAS (${CONNECTED_CAMERAS}) is invalid."
		fi
		display_msg --log error "${MSG}"
		exit_installation 2 "${STATUS_NO_CAMERA}" "${MSG}"
	fi

	local S=" is"
	[[ ${NUM} -gt 1 ]] && S="s are"
	MSG="\nThe following camera type${S} connected to the Pi.\n"
	MSG="${MSG}Pick the one you want."
	MSG="${MSG}\nIf it's not in the list, select <Cancel> and determine why."
	CAMERA_TYPE=$(whiptail --title "${TITLE}" --menu "${MSG}" 15 "${WT_WIDTH}" "${NUM}" \
		"${CT[@]}" 3>&1 1>&2 2>&3)
	if [[ $? -ne 0 ]]; then
		MSG="Camera selection required."
		MSG="${MSG} Please re-run the installation and select a camera to continue."
		display_msg --log warning "${MSG}"
		exit_installation 2 "${STATUS_NO_CAMERA}" "User did not select a camera."
	fi

	display_msg --log progress "Using ${CAMERA_TYPE} camera."
	STATUS_VARIABLES+=("select_camera_type='true'\n")
	STATUS_VARIABLES+=("CAMERA_TYPE='${CAMERA_TYPE}'\n")
}


####
# Create the file that defines the WebUI variables.
create_webui_defines()
{
	display_msg --log progress "Modifying locations for WebUI."
	FILE="${ALLSKY_WEBUI}/includes/allskyDefines.inc"
	sed		-e "s;XX_ALLSKY_HOME_XX;${ALLSKY_HOME};" \
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
			-e "s;XX_WEBSERVER_GROUP_XX;${WEBSERVER_GROUP};" \
			-e "s;XX_ALLSKY_REPO_XX;${ALLSKY_REPO};" \
			-e "s;XX_ALLSKY_VERSION_XX;${ALLSKY_VERSION};" \
			-e "s;XX_RASPI_CONFIG_XX;${ALLSKY_CONFIG};" \
			-e "s;XX_ALLSKY_OVERLAY_XX;${ALLSKY_OVERLAY};" \
			-e "s;XX_ALLSKY_MODULES_XX;${ALLSKY_MODULES};" \
		"${REPO_WEBUI_DEFINES_FILE}"  >  "${FILE}"
		chmod 644 "${FILE}"

	STATUS_VARIABLES+=("create_webui_defines='true'\n")
}


####
# Recreate the options file.
# This can be used after installation if the options file gets hosed.
recreate_options_file()
{
	CAMERA_TYPE="$( get_variable "CAMERA_TYPE" "${ALLSKY_CONFIG}/config.sh" )"
	save_camera_capabilities "true"
	set_permissions
}


####
# Save the camera capabilities and use them to set the WebUI min, max, and defaults.
# This will error out and exit if no camera is installed,
# otherwise it will determine what capabilities the connected camera has,
# then create an "options" file specific to that camera.
# It will also create a default camera-specific "settings" file if one doesn't exist.
save_camera_capabilities()
{
	if [[ -z ${CAMERA_TYPE} ]]; then
		display_msg --log error "INTERNAL ERROR: CAMERA_TYPE not set in save_camera_capabilities()."
		return 1
	fi

	local OPTIONSFILEONLY="${1}"		# Set to "true" if we should ONLY create the options file.
	local FORCE MSG OPTIONSONLY

	# Create the camera type/model-specific options file and optionally a default settings file.
	# --cameraTypeOnly tells makeChanges.sh to only change the camera info, then exit.
	# It displays any error messages.
	if [[ ${FORCE_CREATING_SETTINGS_FILE} == "true" ]]; then
		FORCE="--force"
		MSG=" and default settings"
	else
		FORCE=""
		MSG=""
	fi

	if [[ ${OPTIONSFILEONLY} == "true" ]]; then
		OPTIONSONLY="--optionsOnly"
	else
		OPTIONSONLY=""
		display_msg --log progress "Setting up WebUI options${MSG} for ${CAMERA_TYPE} cameras."
	fi

	# Restore the prior settings file so it can be used by makeChanges.sh.
	[[ ${PRIOR_ALLSKY} != "" ]] && restore_prior_settings_file

	MSG="Executing makeChanges.sh ${FORCE} ${OPTIONSONLY} --cameraTypeOnly"
	MSG="${MSG}  ${DEBUG_ARG} 'cameraType' 'Camera Type' '${PRIOR_CAMERA_TYPE}' '${CAMERA_TYPE}'"
	display_msg "${LOG_TYPE}" info "${MSG}"

	#shellcheck disable=SC2086
	MSG="$( "${ALLSKY_SCRIPTS}/makeChanges.sh" ${FORCE} ${OPTIONSONLY} --cameraTypeOnly \
		${DEBUG_ARG} "cameraType" "Camera Type" "${PRIOR_CAMERA_TYPE}" "${CAMERA_TYPE}" 2>&1 )"
	RET=$?

	[[ -n ${MSG} ]] && display_msg "${LOG_TYPE}" info "${MSG}"
	if [[ ${RET} -ne 0 ]]; then
		#shellcheck disable=SC2086
		if [[ ${RET} -eq ${EXIT_NO_CAMERA} ]]; then
			MSG="No camera was found; one must be connected and working for the installation to succeed.\n"
			MSG="$MSG}After connecting your camera, re-run the installation."
			whiptail --title "${TITLE}" --msgbox "${MSG}" 12 "${WT_WIDTH}" 3>&1 1>&2 2>&3
			display_msg --log error "No camera detected - installation aborted."
		elif [[ ${OPTIONSFILEONLY} == "false" ]]; then
			display_msg --log error "Unable to save camera capabilities."
		fi
		return 1
	fi

	#shellcheck disable=SC2012
	MSG="$( /bin/ls -l "${ALLSKY_CONFIG}/settings"*.json 2>/dev/null | sed 's/^/    /' )"
	display_msg "${LOG_TYPE}" info "Settings files:\n${MSG}"
	CAMERA_MODEL="$( settings ".cameraModel" "${SETTINGS_FILE}" )"

	STATUS_VARIABLES+=("save_camera_capabilities='true'\n")
	return 0
}


####
# Update the sudoers file so the web server can execute certain commands with sudo.
do_sudoers()
{
	display_msg --log progress "Creating/updating sudoers file."
	sed -e "s;XX_ALLSKY_SCRIPTS_XX;${ALLSKY_SCRIPTS};" "${REPO_SUDOERS_FILE}"  >  /tmp/x
	sudo install -m 0644 /tmp/x "${FINAL_SUDOERS_FILE}" && rm -f /tmp/x
}


####
# Ask the user if they want to reboot
WILL_REBOOT="false"
ask_reboot()
{
	local TYPE="${1}"

	if [[ ${TYPE} == "locale" ]]; then
		local MSG="A reboot is needed for the locale change to take effect."
		MSG="${MSG}\nYou must reboot before continuing the installation."
		MSG="${MSG}\n\nReboot now?"
		if whiptail --title "${TITLE}" --yesno "${MSG}" 18 "${WT_WIDTH}" 3>&1 1>&2 2>&3; then
			return 0
		else
			return 1
		fi
	fi

	local AT="     http://${NEW_HOST_NAME}.local\n"
	AT="${AT}or\n"
	AT="${AT}     http://$(hostname -I | sed -e 's/ .*$//')"
	local MSG="*** Allsky installation is almost done. ***"
	MSG="${MSG}\n\nWhen done, you must reboot the Raspberry Pi to finish the installation."
	MSG="${MSG}\n\nAfter reboot you can connect to the WebUI at:\n"
	MSG="${MSG}${AT}"
	MSG="${MSG}\n\nReboot when installation is done?"
	if whiptail --title "${TITLE}" --yesno "${MSG}" 18 "${WT_WIDTH}" 3>&1 1>&2 2>&3; then
		WILL_REBOOT="true"
		display_msg --logonly info "Pi will reboot after installation completes."
	else
		display_msg --logonly info "User elected not to reboot; displayed warning message."
		display_msg notice "You need to reboot the Pi before Allsky will work."
		MSG="If you have not already rebooted your Pi, please do so now.\n"
		MSG="${MSG}You can then connect to the WebUI at:\n"
		MSG="${MSG}${AT}"
		echo -e "\n\n==========\n${MSG}" >> "${POST_INSTALLATION_ACTIONS}"
	fi
}
do_reboot()
{
	exit_installation -1 "${1}"		# -1 means just log ending statement but don't exit.
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
	STATUS_VARIABLES+=("check_swap='true'\n")

	local PROMPT="false"
	[[ ${1} == "prompt" ]] && PROMPT="true"

	# This can return "total_mem is unknown" if the OS is REALLY old.
	local RAM_SIZE="$( vcgencmd get_config total_mem )"
	if echo "${RAM_SIZE}" | grep --silent "unknown" ; then
		# Note: This doesn't produce exact results.  On a 4 GB Pi, it returns 3.74805.
		RAM_SIZE=$(free --mebi | awk '{if ($1 == "Mem:") {print $2; exit 0} }')		# in MB
	else
		RAM_SIZE="${RAM_SIZE//total_mem=/}"
	fi
	local DESIRED_COMBINATION=$((1024 * 4))		# desired minimum memory + swap
	local SUGGESTED_SWAP_SIZE=0
	for i in 512 1024 2048		# 4096 and above don't need any swap
	do
		if [[ ${RAM_SIZE} -le ${i} ]]; then
			SUGGESTED_SWAP_SIZE=$((DESIRED_COMBINATION - i))
			break
		fi
	done
	display_msg --logonly info "RAM_SIZE=${RAM_SIZE}, SUGGESTED_SWAP_SIZE=${SUGGESTED_SWAP_SIZE}."

	# Not sure why, but displayed swap is often 1 MB less than what's in /etc/dphys-swapfile
	local CURRENT_SWAP=$(free --mebi | awk '{if ($1 == "Swap:") {print $2 + 1; exit 0} }')	# in MB
	CURRENT_SWAP=${CURRENT_SWAP:-0}
	if [[ ${CURRENT_SWAP} -lt ${SUGGESTED_SWAP_SIZE} || ${PROMPT} == "true" ]]; then
		local SWAP_CONFIG_FILE="/etc/dphys-swapfile"

		[[ -z ${FUNCTION} ]] && sleep 2		# give user time to read prior messages
		local AMT M
		if [[ ${CURRENT_SWAP} -eq 1 ]]; then
			CURRENT_SWAP=0
			AMT="no"
			M="added"
		else
			AMT="${CURRENT_SWAP} MB of"
			M="increased"
		fi
		MSG="\nYour Pi currently has ${AMT} swap space."
		MSG="${MSG}\nBased on your memory size of ${RAM_SIZE} MB,"
		if [[ ${CURRENT_SWAP} -ge ${SUGGESTED_SWAP_SIZE} ]]; then
			SUGGESTED_SWAP_SIZE=${CURRENT_SWAP}
			MSG="${MSG} there is no need to change anything, but you can if you would like."
		else
			MSG="${MSG} we suggest ${SUGGESTED_SWAP_SIZE} MB of swap"
			MSG="${MSG} to decrease the chance of timelapse and other failures."
			MSG="${MSG}\n\nDo you want swap space ${M}?"
			MSG="${MSG}\n\nYou may change the amount of swap by changing the number below."
		fi

		local SWAP_SIZE=$(whiptail --title "${TITLE}" --inputbox "${MSG}" 18 "${WT_WIDTH}" \
			"${SUGGESTED_SWAP_SIZE}" 3>&1 1>&2 2>&3)
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

			local CURRENT_MAX="$(get_variable "CONF_MAXSWAP" "${SWAP_CONFIG_FILE}")"
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
		display_msg --log progress "Size of current swap (${CURRENT_SWAP} MB) is sufficient; no change needed."
	fi
}


####
# Check if ${ALLSKY_TMP} exists, and if it does,
# save any *.jpg files (which we probably created), then remove everything else,
# then mount it.
check_and_mount_tmp()
{
	local TMP_DIR="/tmp/IMAGES"

	if [[ -d "${ALLSKY_TMP}" ]]; then
		local IMAGES="$(find "${ALLSKY_TMP}" -name '*.jpg')"
		if [[ -n ${IMAGES} ]]; then
			mkdir "${TMP_DIR}"
			# Need to allow for files with spaces in their names.
			# TODO: there has to be a better way.
			echo "${IMAGES}" | \
				while read -r image
				do
					mv "${image}" "${TMP_DIR}"
				done
		fi
		rm -f "${ALLSKY_TMP}"/*
	else
		mkdir "${ALLSKY_TMP}"
	fi

	# Now mount and restore any images that were there before
	sudo mount -a
	if [[ -d ${TMP_DIR} ]]; then
		mv "${TMP_DIR}"/* "${ALLSKY_TMP}"
		rmdir "${TMP_DIR}"
	fi
}


####
# Check if prior ${ALLSKY_TMP} was a memory filesystem.
# If not, offer to make it one.
check_tmp()
{
	STATUS_VARIABLES+=("check_tmp='true'\n")

	local INITIAL_FSTAB_STRING="tmpfs ${ALLSKY_TMP} tmpfs"

	# Check if currently a memory filesystem.
	if grep --quiet "^${INITIAL_FSTAB_STRING}" /etc/fstab; then
		MSG="${ALLSKY_TMP} is currently a memory filesystem; no change needed."
		display_msg --log progress "${MSG}"

		# If there's a prior Allsky version and it's tmp directory is mounted,
		# try to unmount it, but that often gives an error that it's busy,
		# which isn't really a problem since it'll be unmounted at the reboot.
		# We know from the grep above that /etc/fstab has ${ALLSKY_TMP}
		# but the mount point is currently in the PRIOR Allsky.
		local D="${PRIOR_ALLSKY_DIR}/tmp"
		if [[ -d "${D}" ]] && mount | grep --silent "${D}" ; then
			# The Samba daemon is one known cause of "target busy".
			sudo umount -f "${D}" 2> /dev/null ||
				(
					sudo systemctl restart smbd 2> /dev/null
					sudo umount -f "${D}" 2> /dev/null
				)
		fi

		# If the new Allsky's ${ALLSKY_TMP} is already mounted, don't do anything.
		# This would be the case during an upgrade.
		if mount | grep --silent "${ALLSKY_TMP}" ; then
			display_msg --logonly info "${ALLSKY_TMP} already mounted."
			return 0
		fi

		check_and_mount_tmp		# works on new ${ALLSKY_TMP}
		return 0
	fi

	local SIZE=75		# MB - should be enough
	MSG="Making ${ALLSKY_TMP} reside in memory can drastically decrease the amount of writes to the SD card, increasing its life."
	MSG="${MSG}\n\nDo you want to make it reside in memory?"
	MSG="${MSG}\n\nNote: anything in it will be deleted whenever the Pi is rebooted, but that's not an issue since the directory only contains temporary files."
	if whiptail --title "${TITLE}" --yesno "${MSG}" 15 "${WT_WIDTH}"  3>&1 1>&2 2>&3; then
		echo "${INITIAL_FSTAB_STRING} size=${SIZE}M,noatime,lazytime,nodev,nosuid,mode=775,uid=${ALLSKY_OWNER},gid=${WEBSERVER_GROUP}" | sudo tee -a /etc/fstab > /dev/null
		check_and_mount_tmp
		display_msg --log progress "${ALLSKY_TMP} is now in memory."
	else
		display_msg --log info "${ALLSKY_TMP} will remain on disk."
		mkdir -p "${ALLSKY_TMP}"
	fi
}


####
check_success()
{
	local RET=${1}
	local MESSAGE="${2}"
	local LOG="${3}"
	local D=${4}

	if [[ ${RET} -ne 0 ]]; then
		display_msg --log error "${MESSAGE}"
		MSG="The full log file is in ${LOG}"
		MSG="${MSG}\nThe end of the file is:"
		display_msg --log info "${MSG}"
		tail -5 "${LOG}"

		return 1
	fi
	[[ ${D} -gt 1 ]] && cat "${LOG}"

	return 0
}


####
# Install the web server.
install_webserver()
{
	display_msg --log progress "Installing the web server."
	sudo systemctl stop hostapd 2> /dev/null
	sudo systemctl stop lighttpd 2> /dev/null
	TMP="${ALLSKY_INSTALLATION_LOGS}/lighttpd.install.log"
	(
		sudo apt-get update && \
			sudo apt-get --assume-yes install lighttpd php-cgi php-gd hostapd dnsmasq avahi-daemon
	) > "${TMP}" 2>&1
	if ! check_success $? "lighttpd installation failed" "${TMP}" "${DEBUG}" ; then
		exit_with_image 1 "${STATUS_ERROR}" "lighttpd installation failed"
	fi

	FINAL_LIGHTTPD_FILE="/etc/lighttpd/lighttpd.conf"
	sed \
		-e "s;XX_ALLSKY_WEBUI_XX;${ALLSKY_WEBUI};g" \
		-e "s;XX_ALLSKY_HOME_XX;${ALLSKY_HOME};g" \
		-e "s;XX_ALLSKY_IMAGES_XX;${ALLSKY_IMAGES};g" \
		-e "s;XX_ALLSKY_CONFIG_XX;${ALLSKY_CONFIG};g" \
		-e "s;XX_ALLSKY_WEBSITE_XX;${ALLSKY_WEBSITE};g" \
		-e "s;XX_ALLSKY_OVERLAY_XX;${ALLSKY_OVERLAY};g" \
		-e "s;XX_ALLSKY_DOCUMENTATION_XX;${ALLSKY_DOCUMENTATION};g" \
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

	STATUS_VARIABLES+=("install_webserver='true'\n")
}


####
# Prompt for a new hostname if needed,
# and update all the files that contain the hostname.
# The default hostname in Pi OS is "raspberrypi"; if it's still that,
# prompt to update.  If it's anything else that means the user
# already changed it to something so don't overwrite their change.

prompt_for_hostname()
{
	local CURRENT_HOSTNAME=$(tr -d " \t\n\r" < /etc/hostname)
	if [[ ${CURRENT_HOSTNAME} != "raspberrypi" ]]; then
		display_msg --logonly info "Using current hostname of '${CURRENT_HOSTNAME}'."
		NEW_HOST_NAME="${CURRENT_HOSTNAME}"

		STATUS_VARIABLES+=("prompt_for_hostname='true'\n")
		STATUS_VARIABLES+=("NEW_HOST_NAME='${NEW_HOST_NAME}'\n")
		return
	fi

	MSG="Please enter a hostname for your Pi."
	MSG="${MSG}\n\nIf you have more than one Pi on your network they MUST all have unique names."
	MSG="${MSG}\n\nThe current hostname is '${CURRENT_HOSTNAME}'; the suggested name is below:\n"
	NEW_HOST_NAME=$(whiptail --title "${TITLE}" --inputbox "${MSG}" 15 "${WT_WIDTH}" \
		"${SUGGESTED_NEW_HOST_NAME}" 3>&1 1>&2 2>&3)
	if [[ $? -ne 0 ]]; then
		MSG="You must specify a host name."
		MSG="${MSG}  Please re-run the installation and select one."
		display_msg --log warning "${MSG}"
		exit_installation 2 "No host name selected"
	else
		STATUS_VARIABLES+=("prompt_for_hostname='true'\n")
		STATUS_VARIABLES+=("NEW_HOST_NAME='${NEW_HOST_NAME}'\n")
	fi

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
}


####
# Set permissions on various web-related items.
set_permissions()
{
	display_msg --log progress "Setting permissions on web-related files."

	# Make sure the currently running user has can write to the webserver root
	# and can run sudo on anything.
	G="$(id "${ALLSKY_OWNER}")"

	if ! echo "${G}" | grep --silent "(sudo)"; then
		display_msg --log progress "Adding ${ALLSKY_OWNER} to sudo group."

		### TODO:  Hmmm.  We need to run "sudo" to add to the group,
		### but we don't have "sudo" permissions yet... so this will likely fail:

		sudo addgroup --quiet "${ALLSKY_OWNER}" "sudo"
	fi

	if ! echo "${G}" | grep --silent "(${WEBSERVER_GROUP})"; then
		display_msg --log progress "Adding ${ALLSKY_OWNER} to ${WEBSERVER_GROUP} group."
		sudo addgroup --quiet "${ALLSKY_OWNER}" "${WEBSERVER_GROUP}"

		# TODO: We had a case where the login shell wasn't in the group after "addgroup"
		# until the user logged out and back in.
		# And this was AFTER he ran install.sh and rebooted.
		# Not sure what to do about this...
	fi

	# Remove any old entries; we now use /etc/sudoers.d/allsky instead of /etc/sudoers.
	# TODO: Can remove this in the next release
	sudo sed -i -e "/allsky/d" -e "/${WEBSERVER_GROUP}/d" /etc/sudoers

	do_sudoers

	# The web server needs to be able to create and update many of the files in ${ALLSKY_CONFIG}.
	# Not all, but go ahead and chgrp all of them so we don't miss any new ones.
	sudo find "${ALLSKY_CONFIG}/" -type f -exec chmod 664 '{}' \;
	sudo find "${ALLSKY_CONFIG}/" -type d -exec chmod 775 '{}' \;
	sudo chgrp -R "${WEBSERVER_GROUP}" "${ALLSKY_CONFIG}"

	# The files should already be the correct permissions/owners, but just in case, set them.
	# We don't know what permissions may have been on the old website, so use "sudo".
	sudo find "${ALLSKY_WEBUI}/" -type f -exec chmod 644 '{}' \;
	sudo find "${ALLSKY_WEBUI}/" -type d -exec chmod 755 '{}' \;
	chmod 755 "${ALLSKY_WEBUI}/includes/createAllskyOptions.php"

	if [[ -d "${ALLSKY_WEBSITE}" ]]; then
		sudo find "${ALLSKY_WEBUI}/" -type d -name thumbnails \! -perm 775 -exec chmod 775 '{}' \;
		sudo find "${ALLSKY_WEBUI}/" -type d -name thumbnails \! -group "${WEBSERVER_GROUP}" -exec chgrp "${WEBSERVER_GROUP}" '{}' \;
	fi

	chmod 775 "${ALLSKY_TMP}"
	sudo chgrp "${WEBSERVER_GROUP}" "${ALLSKY_TMP}"

	# This is actually an Allsky Website file, but in case we restored the old website,
	# set its permissions.
	chgrp -f "${WEBSERVER_GROUP}" "${ALLSKY_WEBSITE_CONFIGURATION_FILE}"
}


####
# Check if there's a WebUI in the old-style location,
# or if the directory exists but there doesn't appear to be a WebUI in it.
# The installation (sometimes?) creates the directory.

OLD_WEBUI_LOCATION_EXISTS_AT_START="false"
does_old_WebUI_location_exist()
{
	[[ -d ${OLD_WEBUI_LOCATION} ]] && OLD_WEBUI_LOCATION_EXISTS_AT_START="true"

	STATUS_VARIABLES+=("does_old_WebUI_location_exist='true'\n")
	STATUS_VARIABLES+=("OLD_WEBUI_LOCATION_EXISTS_AT_START='${OLD_WEBUI_LOCATION_EXISTS_AT_START}'\n")
}

# If the old WebUI location is there:
#	but it wasn't when the installation started,
#	that means the installation created it so remove it.
#
#	Let the user know if there's an old WebUI, or something unknown there.

check_old_WebUI_location()
{
	[[ ! -d ${OLD_WEBUI_LOCATION} ]] && return

	if [[ ${OLD_WEBUI_LOCATION_EXISTS_AT_START} == "false" ]]; then
		# Installation created the directory so get rid of it.
		sudo rm -fr "${OLD_WEBUI_LOCATION}"
		return
	fi

	# The installation of the web server often creates a file in
	# ${OLD_WEBUI_LOCATION}.  It just says "No files yet...", so delete it.
	sudo rm -f "${OLD_WEBUI_LOCATION}/index.lighttpd.html"

	if [[ ! -d ${OLD_WEBUI_LOCATION}/includes ]]; then
		local COUNT=$( find "${OLD_WEBUI_LOCATION}" | wc -l )
		if [[ ${COUNT} -eq 1 ]]; then
			# This is often true after a clean install of the OS.
			sudo rm -f "${OLD_WEBUI_LOCATION}"
			display_msg --logonly info "Deleted empty '${OLD_WEBUI_LOCATION}'."
		else
			MSG="The old WebUI location '${OLD_WEBUI_LOCATION}' exists"
			MSG="${MSG} but doesn't contain a valid WebUI."
			MSG="${MSG}\nPlease check it out after installation - if there's nothing you"
			MSG="${MSG} want in it, remove it:  sudo rm -fr '${OLD_WEBUI_LOCATION}'"
			whiptail --title "${TITLE}" --msgbox "${MSG}" 15 "${WT_WIDTH}"   3>&1 1>&2 2>&3
			display_msg --log notice "${MSG}"

			echo -e "\n\n==========\n${MSG}" >> "${POST_INSTALLATION_ACTIONS}"
		fi
		return
	fi

	MSG="An old version of the WebUI was found in ${OLD_WEBUI_LOCATION};"
	MSG="${MSG} it is no longer being used so you may remove it after intallation."
	MSG="${MSG}\n\nWARNING: if you have any other web sites in that directory,"
	MSG="${MSG}\n\n they will no longer be accessible via the web server."
	whiptail --title "${TITLE}" --msgbox "${MSG}" 15 "${WT_WIDTH}"   3>&1 1>&2 2>&3
	display_msg --log notice "${MSG}"
	echo -e "\n\n==========\n${MSG}" >> "${POST_INSTALLATION_ACTIONS}"
}


####
# If a website exists, see if it's the newest version.  If not, let the user know.
# If it's a new-style website, copy to the new Allsky release directory.
handle_prior_website()
{
	STATUS_VARIABLES+=( "handle_prior_website='true'\n" )
	# No variables to add to STATUS_VARIABLES.

	local PRIOR_SITE=""
	local PRIOR_STYLE=""

	local OLD_WEBSITE="${OLD_WEBSITE_LOCATION}"
	if [[ -d ${OLD_WEBSITE} ]]; then
		PRIOR_SITE="${OLD_WEBSITE}"						# old-style Website
		PRIOR_STYLE="old"

	elif [[ -d ${PRIOR_ALLSKY_DIR}/html/allsky ]]; then
		PRIOR_SITE="${PRIOR_ALLSKY_DIR}/html/allsky"	# new-style Website
		PRIOR_STYLE="new"

	else
		return											# no prior Website
	fi

	# Move any prior ALLSKY_WEBSITE to the new location.
	# This HAS to be done since the lighttpd server only looks in the new location.
	# Note: This MUST come before the old WebUI check below so we don't remove the prior website
	# when we remove the prior WebUI.

	if [[ -d ${ALLSKY_WEBSITE} ]]; then
		# Hmmm.  There's prior webite AND a new one.
		# Allsky doesn't ship with the website directory, so not sure how one got there...
		# Try to remove the new one - if it's not empty the remove will fail
		# so rename it.
		if ! rmdir "${ALLSKY_WEBSITE}" ; then
			local UNKNOWN_WEBSITE="${ALLSKY_WEBSITE}-UNKNOWN-$$"
			MSG="Unknown Website in '${ALLSKY_WEBSITE}' is not empty."
			MSG="${MSG}\nRenaming to '${UNKNOWN_WEBSITE}'."
			display_msg --log error "${MSG}"
			if ! mv "${ALLSKY_WEBSITE}" "${UNKNOWN_WEBSITE}" ; then
				display_msg --log error "Unable to move."
			fi
		fi
	fi

	# Trailing "/" tells get_version and get_branch to fill in the file
	# names given the directory we pass to them.

	# If there's no prior website version, then there IS a newer version available.
	# Set ${PV} to a string to display in messages, but we'll still use ${PRIOR_VERSION}
	# to determine whether or not there's a newer version.  PRIOR_VERSION="" means there is.
	local PRIOR_VERSION="$( get_version "${PRIOR_SITE}/" )"
	local PV=""
	if [[ -z ${PRIOR_VERSION} ]]; then
		PV="** Unknown, but old **"
	else
		PV="${PRIOR_VERSION}"
	fi

	local NEWEST_VERSION="$(get_Git_version "${GITHUB_MAIN_BRANCH}" "${GITHUB_WEBSITE_PACKAGE}")"
	if [[ -z ${NEWEST_VERSION} ]]; then
		display_msg --log warning "Unable to determine verson of GitHub branch '${GITHUB_MAIN_BRANCH}'."
	fi

	local B=""

	# Check if the prior website is outdated.
	# For new-style websites, only check the branch they are currently running.
	# If a non-production branch is used the Website installer will check if there's
	# a newer production branch.

	if [[ ${PRIOR_STYLE} == "new" ]]; then

		# If get_branch returns "" the prior branch is ${GITHUB_MAIN_BRANCH}.
		local PRIOR_BRANCH="$( get_branch "${PRIOR_SITE}/" )"

		display_msg --log progress "Restoring local Allsky Website from ${PRIOR_SITE}."
		sudo mv "${PRIOR_SITE}" "${ALLSKY_WEBSITE}"

		# Update "AllskyVersion" if needed.
		local V="$( settings .config.AllskyVersion "${ALLSKY_WEBSITE_CONFIGURATION_FILE}" )"
		display_msg --logonly info "Prior local Website's AllskyVersion=${V}"
		if [[ ${V} != "${ALLSKY_VERSION}" ]]; then
			MSG="Updating AllskyVersion in local Website from '${V}' to '${ALLSKY_VERSION}'"
			display_msg --log progress "${MSG}"
			update_json_file ".config.AllskyVersion" "${ALLSKY_VERSION}" \
				"${ALLSKY_WEBSITE_CONFIGURATION_FILE}"
		fi


		# We can only check versions if we obtained the new version.
		[[ -z ${NEWEST_VERSION} ]] && return

		# If the old Website was using a non-production branch,
		# see if there's a newer version of the Website with that branch OR
		# a newer version with the production branch.  Use whichever is newer.
		if [[ -n ${PRIOR_BRANCH} && ${PRIOR_BRANCH} != "${GITHUB_MAIN_BRANCH}" ]]; then
			NEWEST_VERSION="$( get_Git_version "${PRIOR_BRANCH}" "${GITHUB_WEBSITE_PACKAGE}" )"
			B=" in the '${PRIOR_BRANCH}' branch"

			if [[ ${DEBUG} -gt 0 ]]; then
				MSG="'${PRIOR_BRANCH}' branch: prior Website version=${PV},"
				MSG="${MSG} Git version=${NEWEST_VERSION}."
				display_msg --log debug "${MSG}"
			fi
		fi

	elif [[ -z ${NEWEST_VERSION} ]]; then
		return
	fi

	if [[ -n ${NEWEST_VERSION} ]]; then
		if [[ -z ${PRIOR_VERSION} || ${PRIOR_VERSION} < "${NEWEST_VERSION}" ]]; then
			MSG="There is a newer Allsky Website available${B}; please upgrade to it."
			MSG="${MSG}\nYour    version: ${PV}"
			MSG="${MSG}\nCurrent version: ${NEWEST_VERSION}"
			MSG="${MSG}\n\nYou can upgrade by executing:"
			MSG="${MSG}\n     cd ~/allsky; website/install.sh"
			MSG="${MSG}\nafter this installation finishes."
			display_msg --log notice "${MSG}"
			echo -e "\n\n==========\n${MSG}" >> "${POST_INSTALLATION_ACTIONS}"
		else
			display_msg "${LOG_TYPE}" info "Prior local Website already at ${NEWEST_VERSION}${B}"
		fi
	fi
}


####
# Get the locale, prompting if we can't determine it.
DESIRED_LOCALE=""
CURRENT_LOCALE=""
get_desired_locale()
{
	# A lot of people have the incorrect locale so prompt for the correct one.

	# List of all installed locales, ignoring any lines with ":" which
	# are usually error messages.
	local INSTALLED_LOCALES="$(locale -a 2>/dev/null | grep -E -v "^C$|:" | sed 's/utf8/UTF-8/')"
	if [[ -z ${INSTALLED_LOCALES} ]]; then
		MSG="There are no locales on your system ('locale -a' didn't return valid locales)."
		MSG="${MSG}\nYou need to install and set one before Allsky installation can run."
		MSG="${MSG}\nTo install locales, run:"
		MSG="${MSG}\n\tsudo raspi-config"
		MSG="${MSG}\n\t\tPick 'Localisation Options'"
		MSG="${MSG}\n\t\tPick 'Locale'"
		MSG="${MSG}\n\t\tScroll down to the locale(s) you want to install, then press the SPACE key."
		MSG="${MSG}\n\t\tWhen done, press the TAB key to select <Ok>, then press ENTER."
		MSG="${MSG}\n\nIt will take a moment for the locale(s) to be installed."
		MSG="${MSG}\n\nWhen that is completed, rerun the Allsky installation."
		display_msg --log error "${MSG}"

		exit_installation 1 "${STATUS_NO_LOCALE}" "None on system."
	fi

	[[ ${DEBUG} -gt 1 ]] && display_msg --logonly debug "INSTALLED_LOCALES=${INSTALLED_LOCALES}"

	# If the prior version of Allsky had a locale set but it's no longer installed,
	# let the user know.
	# This can happen if they use the settings file from a different Pi or different OS.
	local MSG2=""
	if [[ -z ${DESIRED_LOCALE} && -n ${PRIOR_ALLSKY} && -n ${PRIOR_SETTINGS_FILE} ]]; then
		# People rarely change locale once set, so assume they still want the prior one.
		DESIRED_LOCALE="$( settings .locale "${PRIOR_SETTINGS_FILE}" )"
		if [[ -n ${DESIRED_LOCALE} && ${DESIRED_LOCALE} != "null" ]]; then
			local X="$(echo "${INSTALLED_LOCALES}" | grep "${DESIRED_LOCALE}")"
			if [[ -z ${X} ]]; then
				# This is probably EXTREMELY rare.
				MSG2="NOTE: Your prior locale (${DESIRED_LOCALE}) is no longer installed on this Pi."
			fi
		fi
	fi

	# Get current locale to use as the default.
	# Ignore any line that doesn't have a value, and get rid of double quotes.
	local TEMP_LOCALE="$(locale | grep -E "^LANG=|^LANGUAGE=|^LC_ALL=" | sed -e '/=$/d' -e 's/"//g')"
	CURRENT_LOCALE="$(echo "${TEMP_LOCALE}" | sed --silent -e '/LANG=/ s/LANG=//p')"
	if [[ -z ${CURRENT_LOCALE} ]];  then
		CURRENT_LOCALE="$(echo "${TEMP_LOCALE}" | sed --silent -e '/LANGUAGE=/ s/LANGUAGE=//p')"
		if [[ -z ${CURRENT_LOCALE} ]];  then
			CURRENT_LOCALE="$(echo "${TEMP_LOCALE}" | sed --silent -e '/LC_ALL=/ s/LC_ALL=//p')"
		fi
	fi
	display_msg --logonly info "CURRENT_LOCALE=${CURRENT_LOCALE}, TEMP_LOCALE=${TEMP_LOCALE}"

	local D=""
	if [[ -n ${CURRENT_LOCALE} && ${CURRENT_LOCALE} != "null" ]]; then
		D="--default-item ${CURRENT_LOCALE}"
	else
		CURRENT_LOCALE=""
	fi
	STATUS_VARIABLES+=("CURRENT_LOCALE='${CURRENT_LOCALE}'\n")

	# If they had a locale from the prior Allsky and it's still here, use it; no need to prompt.
	if [[ -n ${DESIRED_LOCALE} && ${DESIRED_LOCALE} == "${CURRENT_LOCALE}" ]]; then
		STATUS_VARIABLES+=("get_desired_locale='true'\n")
		STATUS_VARIABLES+=("DESIRED_LOCALE='${DESIRED_LOCALE}'\n")
		return
	fi

	MSG="\nSelect your locale; the default is highlighted in red."
	MSG="${MSG}\nIf your desired locale is not in the list, press <Cancel>."
	MSG="${MSG}\n\nIf you change the locale, the system will reboot and"
	MSG="${MSG}\nyou will need to continue the installation."
	[[ -n ${MSG2} ]] && MSG="${MSG}\n\n${MSG2}"

	# This puts in IL the necessary strings to have whiptail display what looks like
	# a single column of selections.  Could also use "--noitem" if we passed in a non-null
	# item as the second argument.
	local IL=()
	for i in ${INSTALLED_LOCALES}
	do
		IL+=("$i" "")
	done

	#shellcheck disable=SC2086
	DESIRED_LOCALE=$(whiptail --title "${TITLE}" ${D} --menu "${MSG}" 25 "${WT_WIDTH}" 4 "${IL[@]}" \
		3>&1 1>&2 2>&3)
	if [[ -z ${DESIRED_LOCALE} ]]; then
		MSG="You need to set the locale before the installation can run."
		MSG="${MSG}\n  If your desired locale was not in the list,"
		MSG="${MSG}\n   run 'raspi-config' to update the list, then rerun the installation."
		display_msg info "${MSG}"
		display_msg --logonly info "No locale selected; exiting."

		exit_installation 0 "${STATUS_NOT_CONTINUE}" "Locale(s) available but none selected."

	elif echo "${DESIRED_LOCALE}" | grep --silent "Box options" ; then
		# Got a usage message from whiptail.  This happened once so I added this check.
		# Must be no space between the last double quote and ${INSTALLED_LOCALES}.
		#shellcheck disable=SC2086
		MSG="Got usage message from whiptail: D='${D}', INSTALLED_LOCALES="${INSTALLED_LOCALES}
		MSG="${MSG}\n  Fix the problem and try the installation again."
		display_msg --log error "${MSG}"
		exit_installation 1 "${STATUS_ERROR}" "Got usage message from whitail."
	fi

	STATUS_VARIABLES+=("get_desired_locale='true'\n")
	STATUS_VARIABLES+=("DESIRED_LOCALE='${DESIRED_LOCALE}'\n")
}


####
# Set the locale
set_locale()
{
	# ${DESIRED_LOCALE} and ${CURRENT_LOCALE} are already set

	if [[ ${CURRENT_LOCALE} == "${DESIRED_LOCALE}" ]]; then
		display_msg --log progress "Keeping '${DESIRED_LOCALE}' locale."
		local L="$( settings .locale )"
		MSG="Settings file '${SETTINGS_FILE}'"
		if [[ ${L} == "" || ${L} == "null" ]]; then
			# Either a new install or an upgrade from an older Allsky.
			MSG="${MSG} did NOT contain .locale so adding it."
			display_msg --logonly info "${MSG}"
			update_json_file ".locale" "${DESIRED_LOCALE}"  "${SETTINGS_FILE}"

# TODO: Something appears to still be unlinking the settings file
# from its camera-specific file, so do "ls" of the settings
# files to try and pinpoint the problem.
#shellcheck disable=SC2012
MSG="$( /bin/ls -l "${ALLSKY_CONFIG}/settings"*.json 2>/dev/null | sed 's/^/    /' )"
display_msg --logonly info "Settings files now:\n${MSG}"

		else
			MSG="${MSG} CONTAINED .locale = '${L}'."
			display_msg --logonly info "${MSG}"
		fi
		STATUS_VARIABLES+=("set_locale='true'\n")
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
# See if a prior Allsky exists; if so, set some variables.
does_prior_Allsky_exist()
{
	[[ ! -d ${PRIOR_ALLSKY_DIR}/src ]] && return 1

	PRIOR_ALLSKY=""
	PRIOR_CAMERA_TYPE=""
	PRIOR_CAMERA_MODEL=""
	PRIOR_ALLSKY_VERSION="$( get_version "${PRIOR_ALLSKY_DIR}/" )"
	if [[ -n  ${PRIOR_ALLSKY_VERSION} ]]; then
		case "${PRIOR_ALLSKY_VERSION}" in
			"v2022.03.01")		# First Allsky version with a "version" file
				# This is an old style Allsky with ${CAMERA} in config.sh.
				# Don't do anything here; go to the "if" after the "esac".
				;;

			*)
				# Newer version.
				# PRIOR_SETTINGS_FILE should be a link to a camera-specific settings file.
				PRIOR_ALLSKY="newStyle"
				PRIOR_SETTINGS_FILE="${PRIOR_CONFIG_DIR}/${SETTINGS_FILE_NAME}"
				if [[ -f ${PRIOR_SETTINGS_FILE} ]]; then
					PRIOR_CAMERA_TYPE="$( settings ".cameraType" "${PRIOR_SETTINGS_FILE}" )"
					PRIOR_CAMERA_MODEL="$( settings ".cameraModel" "${PRIOR_SETTINGS_FILE}" )"
				else
					# This shouldn't happen...
					PRIOR_SETTINGS_FILE=""
					display_msg --log warning "No prior new style settings file found!"
				fi

				;;
		esac
	fi

	if [[ -z ${PRIOR_ALLSKY} ]]; then
		PRIOR_ALLSKY="oldStyle"
		PRIOR_ALLSKY_VERSION="${PRIOR_ALLSKY_VERSION:-old}"
		local CAMERA="$( get_variable "CAMERA" "${PRIOR_CONFIG_FILE}" )"
		PRIOR_CAMERA_TYPE="$( CAMERA_to_CAMERA_TYPE "${CAMERA}" )"
		# PRIOR_CAMERA_MODEL wasn't stored anywhere so can't set it.
		PRIOR_SETTINGS_FILE="${OLD_RASPAP_DIR}/settings_${CAMERA}.json"
		[[ ! -f ${PRIOR_SETTINGS_FILE} ]] && PRIOR_SETTINGS_FILE=""
	fi

	MSG="PRIOR_ALLSKY_VERSION=${PRIOR_ALLSKY_VERSION}"
	MSG="${MSG}\nPRIOR_CAMERA_TYPE=${PRIOR_CAMERA_TYPE}"
	MSG="${MSG}\nPRIOR_SETTINGS_FILE=${PRIOR_SETTINGS_FILE}"
	display_msg "${LOG_TYPE}" info "${MSG}"

	return 0
}


####
# If there's a prior version of the software,
# ask the user if they want to move stuff from there to the new directory.
# Look for a directory inside the old one to make sure it's really an old allsky.
prompt_for_prior_Allsky()
{

	if [[ -n ${PRIOR_ALLSKY} ]]; then
		STATUS_VARIABLES+=("prompt_for_prior_Allsky='true'\n")
		MSG="You have a prior version of Allsky in ${PRIOR_ALLSKY_DIR}."
		MSG="${MSG}\n\nDo you want to restore the prior images, darks, and certain settings?"
		if whiptail --title "${TITLE}" --yesno "${MSG}" 15 "${WT_WIDTH}"  3>&1 1>&2 2>&3; then
			# Set the prior camera type to the new, default camera type.
			CAMERA_TYPE="${PRIOR_CAMERA_TYPE}"
			STATUS_VARIABLES+=("CAMERA_TYPE='${CAMERA_TYPE}'\n")
			return 0
		else
			CAMERA_TYPE=""
			PRIOR_CAMERA_TYPE=""
			PRIOR_ALLSKY=""
			PRIOR_ALLSKY_VERSION=""
			MSG="If you want your old images, darks, settings, etc. from the prior version"
			MSG="${MSG} of Allsky, you'll need to manually move them to the new version."
			whiptail --title "${TITLE}" --msgbox "${MSG}" 12 "${WT_WIDTH}" 3>&1 1>&2 2>&3
			display_msg --log info "Will NOT restore from prior version of Allsky."
		fi
	else
		MSG="No prior version of Allsky found."
		MSG="${MSG}\n\nIf you DO have a prior version and you want images, darks, and certain settings moved from the prior version to the new one, rename the prior version to ${PRIOR_ALLSKY_DIR} before running this installation."
		MSG="${MSG}\n\nDo you want to continue?"
		if ! whiptail --title "${TITLE}" --yesno "${MSG}" 15 "${WT_WIDTH}" 3>&1 1>&2 2>&3; then
			MSG="Rename the directory with your prior version of Allsky to"
			MSG="${MSG}\n '${PRIOR_ALLSKY_DIR}', then run the installation again."
			display_msg --log info "${MSG}"
			exit_installation 0 "${STATUS_NOT_CONTINUE}" "after no prior Allsky was found."
		fi
		STATUS_VARIABLES+=("prompt_for_prior_Allsky='true'\n")
	fi

	# No prior Allsky so force creating a default settings file.
	FORCE_CREATING_SETTINGS_FILE="true"
	STATUS_VARIABLES+=("FORCE_CREATING_SETTINGS_FILE='${FORCE_CREATING_SETTINGS_FILE}'\n")
}


####
install_dependencies_etc()
{
	# These commands produce a TON of output that's not needed unless there's a problem.
	# They also take a little while, so hide the output and let the user know.

	display_msg --log progress "Installing dependencies."
	TMP="${ALLSKY_INSTALLATION_LOGS}/make_deps.log"
	#shellcheck disable=SC2024
	sudo make deps > "${TMP}" 2>&1
	check_success $? "Dependency installation failed" "${TMP}" "${DEBUG}"
	[[ $? -ne 0 ]] && exit_with_image 1 "${STATUS_ERROR}" "dependency installation failed"

	display_msg --log progress "Preparing Allsky commands."
	TMP="${ALLSKY_INSTALLATION_LOGS}/make_all.log"
	#shellcheck disable=SC2024
	make all > "${TMP}" 2>&1
	check_success $? "Compile failed" "${TMP}" "${DEBUG}"
	[[ $? -ne 0 ]] && exit_with_image 1 "${STATUS_ERROR}" "compile failed"

	TMP="${ALLSKY_INSTALLATION_LOGS}/make_install.log"
	#shellcheck disable=SC2024
	sudo make install > "${TMP}" 2>&1
	check_success $? "make install failed" "${TMP}" "${DEBUG}"
	[[ $? -ne 0 ]] && exit_with_image 1 "${STATUS_ERROR}" "make insall_failed"

	STATUS_VARIABLES+=("install_dependencies_etc='true'\n")
	return 0
}


####
# Update config.sh
update_config_sh()
{
	local C="${ALLSKY_CONFIG}/config.sh"
	display_msg --log progress "Updating some '${C}' variables."
	if [[ -z ${ALLSKY_VERSION} ]]; then
		display_msg --log error "ALLSKY_VERSION is empty in update_config_sh()"
	fi
	if [[ -z ${CAMERA_TYPE} ]]; then
		display_msg --log error "CAMERA_TYPE is empty in update_config_sh()"
		CAMERA_TYPE="$( settings .cameraType )"
	fi
	sed -i \
		-e "s;^ALLSKY_VERSION=.*$;ALLSKY_VERSION=\"${ALLSKY_VERSION}\";" \
		-e "s;^CAMERA_TYPE=.*$;CAMERA_TYPE=\"${CAMERA_TYPE}\";" \
		"${C}"

	STATUS_VARIABLES+=( "update_config_sh='true'\n" )
}


####
# Create the log file and make it readable/writable by the user; this aids in debugging.
create_allsky_logs()
{
	display_msg --log progress "Setting permissions on ${ALLSKY_LOG} and ${ALLSKY_PERIODIC_LOG}."
	sudo truncate -s 0 "${ALLSKY_LOG}" "${ALLSKY_PERIODIC_LOG}"
	sudo chmod 664 "${ALLSKY_LOG}" "${ALLSKY_PERIODIC_LOG}"
	sudo chgrp "${ALLSKY_GROUP}" "${ALLSKY_LOG}" "${ALLSKY_PERIODIC_LOG}"

	sudo systemctl restart rsyslog		# so logs go to the files above
}


####
# Prompt for either latitude or longitude, and make sure it's a valid entry.
prompt_for_lat_long()
{
	local PROMPT="${1}"
	local TYPE="${2}"
	local HUMAN_TYPE="${3}"
	local ERROR_MSG=""
	local VALUE=""

	while :
	do
		local M="${ERROR_MSG}${PROMPT}"
		VALUE=$(whiptail --title "${TITLE}" --inputbox "${M}" 18 "${WT_WIDTH}" "" 3>&1 1>&2 2>&3)
		if [[ -z ${VALUE} ]]; then
			# Let the user not enter anything.  A message is printed below.
			break
		else
			if VALUE="$( convertLatLong "${VALUE}" "${TYPE}" 2>&1 )" ; then
				update_json_file ".${TYPE}" "${VALUE}" "${SETTINGS_FILE}"
				display_msg --log progress "${HUMAN_TYPE} set to ${VALUE}."
				echo "${VALUE}"
				break
			else
				ERROR_MSG="${VALUE}\n\n"
			fi
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
	MSG="${MSG}\nIt can either have a plus or minus sign (e.g., -20.1)"
	MSG="${MSG}\nor N or S (e.g., 20.1S)"
	LATITUDE="$(prompt_for_lat_long "${MSG}" "latitude" "Latitude")"

	MSG="Enter your Longitude."
	MSG="${MSG}\nIt can either have a plus or minus sign (e.g., -20.1)"
	MSG="${MSG}\nor E or W (e.g., 20.1W)"
	LONGITUDE="$(prompt_for_lat_long "${MSG}" "longitude" "Longitude")"

	if [[ -z ${LATITUDE} || -z ${LONGITUDE} ]]; then
		display_msg --log warning "Latitude and longitude need to be set in the WebUI before Allsky can start."
	fi
	return 0
}


####
# Convert the prior settings file to a new one,
# then link the new one to the camera-specific name.
convert_settings()			# prior_version, new_version, prior_file, new_file
{
	PRIOR_VERSION="${1}"
	NEW_VERSION="${2}"
	PRIOR_FILE="${3}"
	NEW_FILE="${4}"

	case "${NEW_VERSION}" in
		# TODO: new versions go here
		v2023.05.01*)

			case "${PRIOR_VERSION}" in
				"v2022.03.01")
					local B="$( basename "${NEW_FILE}" )"
					local NAME="${B%.*}"			# before "."
					local EXT="${B##*.}"			# after "."
					local SPECIFIC="${NAME}_${CAMERA_TYPE}_${CAMERA_MODEL}.${EXT}"

					# For each field in prior file, update new file with old value.
					# Then handle new fields and fields that changed locations or names.
					jq "." "${PRIOR_FILE}" |
						sed -e '/^{/d' -e '/^}/d' -e 's/ *"//' -e 's/":"/\t/' \
							-e 's/": "/\t/' -e 's/",$//' -e 's/,$//' |
						while read -r F V
						do
							case "${F}" in
								"lastChanged")
									V="$( date +'%Y-%m-%d %H:%M:%S' )"
									;;

								# These don't exist anymore.
								"autofocus"|"background")
									continue;
									;;

								"darkframe")
									F="takeDarkFrames"
									;;
								"brightness")
									update_json_file ".day${F}" "${V}" "${NEW_FILE}"
									F="night${F}"
									;;
								"awb"|"autowhitebalance")
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
								"targetTemp")
									F="TargetTemp"
									update_json_file ".day${F}" "${V}" "${NEW_FILE}"
									F="night${F}"
									;;
								"coolerEnabled")
									F="EnableCooler"
									update_json_file ".day${F}" "${V}" "${NEW_FILE}"
									F="night${F}"
									;;
								"meanthreshold")
									F="meanthreshold"
									update_json_file ".day${F}" "${V}" "${NEW_FILE}"
									F="night${F}"
									;;
							esac

							update_json_file ".${F}" "${V}" "${NEW_FILE}"
						done

					# Fields whose name or location changed.
					x="$( get_variable "DAYTIME_CAPTURE" "${PRIOR_CONFIG_FILE}" )"
					update_json_file ".takeDaytimeImages" "${x}" "${NEW_FILE}"

					x="$( get_variable "DAYTIME_SAVE" "${PRIOR_CONFIG_FILE}" )"
					update_json_file ".saveDaytimeImages" "${x}" "${NEW_FILE}"

					x="$( get_variable "DARK_FRAME_SUBTRACTION" "${PRIOR_CONFIG_FILE}" )"
					update_json_file ".useDarkFrames" "${x}" "${NEW_FILE}"

					return
					;;
			esac
			;;
	esac
}


####
# Restore the prior settings file(s) if the user wanted to use them.
restore_prior_settings_file()
{
	[[ ${RESTORED_PRIOR_SETTINGS_FILE} == "true" ]] && return

	local MSG NAME EXT FILES FIRST_ONE

	if [[ ${PRIOR_ALLSKY} == "newStyle" ]]; then
		if [[ -f ${PRIOR_SETTINGS_FILE} ]]; then

			# The prior settings file SHOULD be a link to a camera-specific file.
			# Make sure that's true; if not, fix it.
			if ! MSG="$( check_settings_link "${SETTINGS_FILE}" )" ; then
				display_msg --log info "${MSG}"
			fi

			# Camera-specific settings file names are:
			#	${NAME}_${CAMERA_TYPE}_${CAMERA_MODEL}.${EXT}
			# where ${SETTINGS_FILE_NAME} == ${NAME}.${EXT}
			# We don't know the ${CAMERA_MODEL} yet so use a regular expression.
			NAME="${SETTINGS_FILE_NAME%.*}"			# before "."
			EXT="${SETTINGS_FILE_NAME##*.}"			# after "."

			# Copy all the camera-specific settings files; don't copy the generic-named
			# file since it will be recreated.
			# There will be more than one camera-specific file if the user has multiple cameras.
			FILES="$(find "${PRIOR_CONFIG_DIR}" -name "${NAME}_"'*'".${EXT}")"
			if [[ -n ${FILES} ]]; then
				RESTORED_PRIOR_SETTINGS_FILE="true"
				FIRST_ONE="true"
				echo "${FILES}" | while read -r F
					do
						if [[ ${FIRST_ONE} == "true" ]]; then
							display_msg --log progress "Restoring settings files:"
							FIRST_ONE="false"
						fi
						display_msg --log progress "\t$(basename "${F}")"
						cp -a "${F}" "${ALLSKY_CONFIG}"
					done
			else
				# This shouldn't happen...
				MSG="No prior camera-specific settings files found,"

				# Try to create one based on ${PRIOR_SETTINGS_FILE}.
				if [[ ${PRIOR_CAMERA_TYPE} != "${CAMERA_TYPE}" ]]; then
					MSG="${MSG}\nand unable to create one: new Camera Type"
					MSG="${MSG} (${CAMERA_TYPE} different from prior type (${PRIOR_CAMERA_TYPE})."
				else
					local SPECIFIC="${NAME}_${PRIOR_CAMERA_TYPE}_${PRIOR_CAMERA_MODEL}.${EXT}"
					cp -a "${PRIOR_SETTINGS_FILE}" "${ALLSKY_CONFIG}/${SPECIFIC}"
					MSG="${MSG}\nbut was able to create '${SPECIFIC}'."
				fi
				display_msg --log warning "${MSG}"
			fi


			# TODO: check if this is an older version of the file,
			# and if so, reset "lastChanged" to null.
			# BUT, how do we determine if it's an old file,
			# given that it's initially created at installation time?
		else
			# This should "never" happen.
			# Their prior version is "new" but they don't have a settings file?
			display_msg --log error "Prior settings file missing: ${PRIOR_SETTINGS_FILE}."
		fi
	else
		# settings file is old style in ${OLD_RASPAP_DIR}.
		if [[ ! -f ${PRIOR_SETTINGS_FILE} ]]; then
			# This should "never" happen.
			# They have a prior Allsky version but no "settings file?
			display_msg --log error "Prior settings file missing: ${PRIOR_SETTINGS_FILE}."

			# If we ever automate migrating settings, this next statement should be deleted.
			FORCE_CREATING_SETTINGS_FILE="true"

		elif [[ -f ${SETTINGS_FILE} ]]; then
			# Transfer prior settings to the new file.
			case "${PRIOR_ALLSKY_VERSION}" in
				"v2022.03.01")
					convert_settings "${PRIOR_ALLSKY_VERSION}" "${ALLSKY_VERSION}" \
						"${PRIOR_SETTINGS_FILE}" "${SETTINGS_FILE}"
					RESTORED_PRIOR_SETTINGS_FILE="true"

					MSG="Your old WebUI settings were transfered to the new release,"
					MSG="${MSG}\n but note that there have been some changes to the settings file"
					MSG="${MSG} (e.g., some settings in config.sh are now in the settings file)."
					MSG="${MSG}\n\nPlease check your settings in the WebUI's 'Allsky Settings' page."
					whiptail --title "${TITLE}" --msgbox "${MSG}" 18 "${WT_WIDTH}" 3>&1 1>&2 2>&3
					display_msg info "\n${MSG}\n"
					echo -e "\n\n==========\n${MSG}" >> "${POST_INSTALLATION_ACTIONS}"
					display_msg --logonly info "Settings from ${PRIOR_ALLSKY_VERSION} copied over."
					;;

				*)	# This could be one of many old versions of Allsky,
					# so don't try to copy all the settings since there have
					# been many changes, additions, and deletions.

					# As far as I know, latitude and longitude have never changed names,
					# and are required and have no default,
					# so try to restore them so Allsky can restart automatically.
					local LAT="$(settings .latitude "${PRIOR_SETTINGS_FILE}")"
					update_json_file ".latitude" "${LAT}" "${SETTINGS_FILE}"
					local LONG="$(settings .longitude "${PRIOR_SETTINGS_FILE}")"
					update_json_file ".longitude" "${LONG}" "${SETTINGS_FILE}"
					local ANGLE="$(settings .angle "${PRIOR_SETTINGS_FILE}")"
					update_json_file ".angle" "${ANGLE}" "${SETTINGS_FILE}"
					display_msg --log progress "Prior latitude, longitude, and angle restored."

					MSG="You need to manually transfer your old settings to the WebUI.\n"
					MSG="${MSG}\nNote that there have been many changes to the settings file"
					MSG="${MSG} since you last installed Allsky, so it will likely be easiest"
					MSG="${MSG} to re-enter everything via the WebUI's 'Allsky Settings' page."
					whiptail --title "${TITLE}" --msgbox "${MSG}" 18 "${WT_WIDTH}" 3>&1 1>&2 2>&3
					display_msg --log info "\n${MSG}\n"
					echo -e "\n\n==========\n${MSG}" >> "${POST_INSTALLATION_ACTIONS}"
					;;

			esac
		else
			display_msg --logonly info "No new settings file yet..."
		fi
	fi

	STATUS_VARIABLES+=( "RESTORED_PRIOR_SETTINGS_FILE='${RESTORED_PRIOR_SETTINGS_FILE}'\n" )
}

####
# If the user wanted to restore files from a prior version of Allsky, do that.
restore_prior_files()
{
	STATUS_VARIABLES+=( "restore_prior_files='true'\n" )

	if [[ -d ${OLD_RASPAP_DIR} ]]; then
		MSG="\nThe '${OLD_RASPAP_DIR}' directory is no longer used.\n"
		MSG="${MSG}When installation is done you may remove it by executing:\n"
		MSG="${MSG}    sudo rm -fr '${OLD_RASPAP_DIR}'\n"
		display_msg --log info "${MSG}"
		echo -e "\n\n==========\n${MSG}" >> "${POST_INSTALLATION_ACTIONS}"
	fi

	if [[ -z ${PRIOR_ALLSKY} ]]; then
		get_lat_long	# get them to put in new config file
		mkdir -p "${ALLSKY_EXTRA}"		# default permissions is ok

		return			# Nothing left to do in this function, so return
	fi

	# Do all the being restores, then all the updates.
	local V=""

	display_msg --log progress "Restoring prior:"

	# TODO: endOfNight_additionalStepts.sh script is going away in the next major release.
	if [[ -f ${PRIOR_ALLSKY_DIR}/scripts/endOfNight_additionalSteps.sh ]]; then
		display_msg --log progress "    endOfNight_additionalSteps.sh."
		cp -a "${PRIOR_ALLSKY_DIR}/scripts/endOfNight_additionalSteps.sh" "${ALLSKY_SCRIPTS}"

		MSG="The ${ALLSKY_SCRIPTS}/endOfNight_additionalSteps.sh file will be removed"
		MSG="${MSG}\nin the next version of Allsky.  You appear to be using this file,"
		MSG="${MSG}\nso please move your code to the 'Script' module in"
		MSG="${MSG}\nthe 'Night to Day Transition Flow' of the Module Manager."
		MSG="${MSG}\nSee the 'Explanations --> Module' documentation for more details."
		display_msg --log warning "\n${MSG}\n"
		echo -e "\n\n==========\n${MSG}" >> "${POST_INSTALLATION_ACTIONS}"
	else
		MSG="    No prior 'endOfNight_additionalSteps.sh' so can't restore."
		display_msg "${LOG_TYPE}" progress "${MSG}"
	fi

	if [[ -d ${PRIOR_ALLSKY_DIR}/images ]]; then
		display_msg --log progress "    'images' directory."
		mv "${PRIOR_ALLSKY_DIR}/images" "${ALLSKY_HOME}"
	else
		# This is probably very rare so let the user know
		MSG="    No prior 'images' directory so can't restore; This is unusual."
		display_msg --log progress "${MSG}"
	fi

	if [[ -d ${PRIOR_ALLSKY_DIR}/darks ]]; then
		display_msg --log progress "    'darks' directory."
		mv "${PRIOR_ALLSKY_DIR}/darks" "${ALLSKY_HOME}"
	else
		display_msg "${LOG_TYPE}" progress "    No prior 'darks' directory so can't restore."
	fi

	if [[ -d ${PRIOR_CONFIG_DIR}/modules ]]; then
		display_msg --log progress "    'modules' directory."

		# Copy the user's prior data to the new file which may contain new fields.
		"${ALLSKY_SCRIPTS}"/flowupgrade.py --prior "${PRIOR_CONFIG_DIR}" --config "${ALLSKY_CONFIG}"
	else
		display_msg "${LOG_TYPE}" progress "    No prior 'modules' directory so can't restore."
	fi

	if [[ -d ${PRIOR_CONFIG_DIR}/overlay ]]; then
		display_msg --log progress "    'overlay' directory."
		cp -ar "${PRIOR_CONFIG_DIR}/overlay" "${ALLSKY_CONFIG}"

		# Restore the fields.json file as it's part of the main Allsky distribution
		# and should be replaced during an upgrade.
		cp -ar "${ALLSKY_REPO}/overlay/config/fields.json" "${ALLSKY_OVERLAY}/config/"
	else
		display_msg "${LOG_TYPE}" progress "    No prior 'overlay' directory so can't restore."
	fi

	if [[ -d ${PRIOR_CONFIG_DIR}/ssl ]]; then
		display_msg --log progress "    'ssl' directory."
		cp -ar "${PRIOR_CONFIG_DIR}/ssl" "${ALLSKY_CONFIG}"
	else
		display_msg "${LOG_TYPE}" progress "    No prior 'ssl' directory so can't restore."
	fi

	# This is not in a "standard" directory so we need to determine where it was.
	local EXTRA="${PRIOR_ALLSKY_DIR}${ALLSKY_EXTRA//${ALLSKY_HOME}/}"
	if [[ -d ${EXTRA} ]]; then
		display_msg --log progress "    '${EXTRA}' directory."
		cp -ar "${EXTRA}" "${ALLSKY_EXTRA}/.."
	else
		display_msg "${LOG_TYPE}" progress "     No prior '${EXTRA}' directory so can't restore."
	fi

	local D
	if [[ ${PRIOR_ALLSKY} == "newStyle" ]]; then
		D="${PRIOR_CONFIG_DIR}"
	else
		# raspap.auth was in a different directory in older versions.
		D="${OLD_RASPAP_DIR}"
	fi
	if [[ -f ${D}/raspap.auth ]]; then
		display_msg --log progress "    WebUI security settings."
		cp -a "${D}/raspap.auth" "${ALLSKY_CONFIG}"
	else
		display_msg "${LOG_TYPE}" progress "    No prior 'WebUI security settings' so can't restore."
	fi

	# Restore any REMOTE Allsky Website configuration file.
	if [[ -f ${PRIOR_CONFIG_DIR}/${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_NAME} ]]; then
		MSG="    '${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_NAME}'."
		display_msg --log progress "${MSG}"
		cp -a "${PRIOR_CONFIG_DIR}/${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_NAME}" \
			"${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}"

		# Used below to update "AllskyVersion" if needed.
		V="$( settings .config.AllskyVersion "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}" )"

		# Check if this is an older Allsky Website configuration file type.
		# The remote config file should have .ConfigVersion.
		local OLD="false"
		local NEW_CONFIG_VERSION="$(settings .ConfigVersion "${REPO_WEBCONFIG_FILE}")"
		local PRIOR_CONFIG_VERSION="$(settings .ConfigVersion "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}")"
		if [[ ${PRIOR_CONFIG_VERSION} == "" || ${PRIOR_CONFIG_VERSION} == "null" ]]; then
			OLD="true"		# Hmmm, it should have the version
			MSG="Prior Website configuration file '${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}'"
			MSG="${MSG}\nis missing .ConfigVersion.  It should be '${NEW_CONFIG_VERSION}'."
			display_msg --log warning "${MSG}"
			PRIOR_CONFIG_VERSION="** Unknown **"
		elif [[ ${PRIOR_CONFIG_VERSION} < "${NEW_CONFIG_VERSION}" ]]; then
			OLD="true"
		fi

		if [[ ${OLD} == "true" ]]; then
			MSG="Your ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE} is an older version.\n"
			MSG="${MSG}Your    version: ${PRIOR_CONFIG_VERSION}\n"
			MSG="${MSG}Current version: ${NEW_CONFIG_VERSION}\n"
			MSG="${MSG}\nPlease compare it to the new one in ${REPO_WEBCONFIG_FILE}"
			MSG="${MSG} to see what fields have been added, changed, or removed.\n"
			display_msg --log warning "${MSG}"
			echo -e "\n\n==========\n${MSG}" >> "${POST_INSTALLATION_ACTIONS}"
		fi
	else
		# We don't check for old LOCAL Allsky Website configuration files.
		# That's done when they install the Allsky Website.
		display_msg "${LOG_TYPE}" progress "    No prior remote Allsky Website known so can't restore."
	fi

	if [[ -f ${PRIOR_CONFIG_DIR}/uservariables.sh ]]; then
		display_msg --log progress "    uservariables.sh."
		cp -a "${PRIOR_CONFIG_DIR}/uservariables.sh" "${ALLSKY_CONFIG}"
	# Don't bother with the "else" part since this file is very rarely used.
	fi

	restore_prior_settings_file

	# Do NOT restore options.json - it will be recreated.

	# See if the prior config.sh and ftp-setting.sh are the same version as
	# the new ones; if so, we can copy them to the new version.
	# Currently what's in ${ALLSKY_CONFIG} are copies of the repo files.
	RESTORED_PRIOR_CONFIG_SH="false"		# Global variable
	RESTORED_PRIOR_FTP_SH="false"			# Global variable

	local CONFIG_SH_VERSION="$( get_variable "CONFIG_SH_VERSION" "${ALLSKY_CONFIG}/config.sh" )"
	local PRIOR_CONFIG_SH_VERSION="$( get_variable "CONFIG_SH_VERSION" "${PRIOR_CONFIG_FILE}" )"
	if [[ ${CONFIG_SH_VERSION} == "${PRIOR_CONFIG_SH_VERSION}" ]]; then
		display_msg --log progress "    Prior 'config.sh' file, as is."
		cp "${PRIOR_CONFIG_FILE}" "${ALLSKY_CONFIG}" && RESTORED_PRIOR_CONFIG_SH="true"
	else
		if [[ -z ${PRIOR_CONFIG_SH_VERSION} ]]; then
			MSG="no prior version specified"
		else
			# v2023.05.01 is hopefully the last version with config.sh so don't
			# bother writing a function to convert from the prior version to this.
			MSG="prior version is old (${PRIOR_CONFIG_SH_VERSION})"
		fi
		MSG="    Not restoring prior 'config.sh': ${MSG}."
		display_msg --log progress "${MSG}"
	fi
	MSG="        CONFIG_SH_VERSION=${CONFIG_SH_VERSION}, PRIOR=${PRIOR_CONFIG_SH_VERSION}"
	display_msg "${LOG_TYPE}" info "${MSG}"

	# Unlike the config.sh file which was always in allsky/config,
	# the ftp-settings.sh file used to be in allsky/scripts.
	# Get the current and prior (if any) file version.
	local FTP_SH_VERSION="$( get_variable "FTP_SH_VERSION" "${ALLSKY_CONFIG}/ftp-settings.sh" )"
	local PRIOR_FTP_SH_VERSION
	if [[ -f ${PRIOR_FTP_FILE} ]]; then
		# Allsky v2022.03.01 and newer.  v2022.03.01 doesn't have FTP_SH_VERSION.
		PRIOR_FTP_SH_VERSION="$( get_variable "FTP_SH_VERSION" "${PRIOR_FTP_FILE}" )"
		PRIOR_FTP_SH_VERSION="${PRIOR_FTP_SH_VERSION:-"no version"}"
	elif [[ -f ${PRIOR_ALLSKY_DIR}/scripts/ftp-settings.sh ]]; then
		# pre v2022.03.01
		PRIOR_FTP_FILE="${PRIOR_ALLSKY_DIR}/scripts/ftp-settings.sh"
		PRIOR_FTP_SH_VERSION="old"
	else
		display_msg --log error "Unable to find prior ftp-settings.sh"
		PRIOR_FTP_FILE=""
		PRIOR_FTP_SH_VERSION="no file"
	fi

	if [[ ${FTP_SH_VERSION} == "${PRIOR_FTP_SH_VERSION}" ]]; then
		display_msg --log progress "    Prior 'ftp-settings.sh' file, as is."
		cp "${PRIOR_FTP_FILE}" "${ALLSKY_CONFIG}" && RESTORED_PRIOR_FTP_SH="true"
	else
		if [[ ${PRIOR_FTP_SH_VERSION} == "no version" ]]; then
			MSG="unknown prior FTP_SH_VERSION."
		elif [[ ${PRIOR_FTP_SH_VERSION} == "old" ]]; then
			MSG="old location so no FTP_SH_VERSION."
		elif [[ ${PRIOR_FTP_SH_VERSION} == "no file" ]]; then
			MSG="no prior file."
		else
			MSG="unknown PRIOR_FTP_SH_VERSION: '${PRIOR_FTP_SH_VERSION}'."
		fi
		display_msg --log progress "    Not restoring prior 'ftp-settings.sh': ${MSG}"
	fi
	MSG="        FTP_SH_VERSION=${FTP_SH_VERSION}, PRIOR=${PRIOR_FTP_SH_VERSION}"
	display_msg "${LOG_TYPE}" info "${MSG}"

	# Done with restores, now the updates.

	if [[ -f ${PRIOR_CONFIG_DIR}/${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_NAME} ]]; then
		if [[ ${V} != "${ALLSKY_VERSION}" ]]; then
			MSG="Updating AllskyVersion in remote Website from '${V}' to '${ALLSKY_VERSION}'"
			display_msg --log progress "${MSG}"
			update_json_file ".config.AllskyVersion" "${ALLSKY_VERSION}" \
				"${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}"
		else
			display_msg --log progress "Prior remote Website already at latest version ${V}."
		fi
	fi

	if [[ ${CONFIG_SH_VERSION} == "${PRIOR_CONFIG_SH_VERSION}" ]]; then
		# This version should be the same as the what's in the prior "version" file.
		local PRIOR="$( get_variable "ALLSKY_VERSION" "${PRIOR_CONFIG_FILE}" )"
		if [[ ${PRIOR} != "${ALLSKY_VERSION}" ]]; then
			MSG="Updating ALLSKY_VERSION in 'config.sh' to '${ALLSKY_VERSION}'."
			sed -i "/ALLSKY_VERSION=/ c ALLSKY_VERSION=\"${ALLSKY_VERSION}\"" "${PRIOR_CONFIG_FILE}"
			display_msg --log progress "${MSG}"
		else
			MSG="ALLSKY_VERSION (${PRIOR}) in prior config.sh same as new version."
			display_msg --logonly info "${MSG}"
		fi
	fi


	STATUS_VARIABLES+=( "RESTORED_PRIOR_CONFIG_SH='${RESTORED_PRIOR_CONFIG_SH}'\n" )
	STATUS_VARIABLES+=( "RESTORED_PRIOR_FTP_SH='${RESTORED_PRIOR_FTP_SH}'\n" )

	if [[ ${RESTORED_PRIOR_CONFIG_SH} == "true" && ${RESTORED_PRIOR_FTP_SH} == "true" ]]; then
		return 0
	fi

	if [[ ${PRIOR_ALLSKY} == "newStyle" ]]; then
		# The prior versions are similar to the new ones.
		MSG=""
		# If it has a version number it's probably close to the current version.
		if [[ ${RESTORED_PRIOR_CONFIG_SH} == "false" && -n ${PRIOR_CONFIG_SH_VERSION} ]]; then
			MSG="${MSG}\nYour prior 'config.sh' file is similar to the new one."
		fi
		if [[ ${RESTORED_PRIOR_FTP_SH} == "false" && ${PRIOR_FTP_SH_VERSION} == "no version" ]]; then
			MSG="${MSG}\nYour prior 'ftp-settings.sh' file is similar to the new one."
		fi
		# Don't wantn this line in the post-installation file.
		MSGb="\nAfter installation, see ${POST_INSTALLATION_ACTIONS} for details."

		MSG2="You can compare the old and new configuration files using the following commands,"
		MSG2="${MSG2}\nand apply your changes from the prior file to the new file."
		MSG2="${MSG2}\nDo NOT simply copy the old files to the new location because"
		MSG2="${MSG2}\ntheir formats are different."
		MSG2="${MSG2}\n\ndiff ${PRIOR_CONFIG_DIR}/config.sh ${ALLSKY_CONFIG}"
		MSG2="${MSG2}\n\n   and"
		MSG2="${MSG2}\n\ndiff ${PRIOR_FTP_FILE} ${ALLSKY_CONFIG}"
	else
		MSG="You need to manually move the CONTENTS of:"
		if [[ ${RESTORED_PRIOR_CONFIG_SH} == "false" ]]; then
			MSG="${MSG}\n     ${PRIOR_CONFIG_DIR}/config.sh"
		fi
		if [[ ${RESTORED_PRIOR_FTP_SH} == "false" ]]; then
			MSG="${MSG}\n     ${PRIOR_FTP_FILE}"
		fi
		MSG="${MSG}\n\nto the new files in ${ALLSKY_CONFIG}."
		MSG="${MSG}\n\nNOTE: some settings are no longer in the new files and some changed names"
		MSG="${MSG}\nso NOT add the old/deleted settings back in or simply copy the files."
		MSG="${MSG}\n*** This will take several minutes ***"
		MSGb=""
		MSG2=""
	fi
	MSG="${MSG}"
	whiptail --title "${TITLE}" --msgbox "${MSG}${MSGb}" 20 "${WT_WIDTH}" 3>&1 1>&2 2>&3

	display_msg --log info "\n${MSG}${MSGb}\n"
	echo -e "\n\n==========\n${MSG}" >> "${POST_INSTALLATION_ACTIONS}"
	if [[ -n ${MSG2} ]]; then
		display_msg --log info "\n${MSG2}\n"
		echo -e "\n${MSG2}" >> "${POST_INSTALLATION_ACTIONS}"
	fi
}


####
# Update Allsky and exit.  It basically resets things.
# This can be needed if the user hosed something up, or there was a problem somewhere.
do_update()
{
# TODO: get from settings file
	#shellcheck disable=SC2086,SC1091		# file doesn't exist in GitHub
	source "${ALLSKY_CONFIG}/config.sh" || exit ${ALLSKY_ERROR_STOP}	# Get current CAMERA_TYPE
	if [[ -z ${CAMERA_TYPE} ]]; then
		display_msg --log error "CAMERA_TYPE not set in config.sh."
		exit_installation 1 "${STATUS_ERROR}" "No CAMERA_TYPE in config.sh during update."
	fi

	[[ ${create_webui_defines} != "true" ]] && create_webui_defines

	save_camera_capabilities "false" || exit 1
	set_permissions

	# Update the sudoers file if it's missing some entries.
	# Look for the last entry added (should be the last entry in the file).
	# Don't simply copy the repo file to the final location in case the repo file isn't up to date.
	if ! grep --silent "/date" "${FINAL_SUDOERS_FILE}" ; then
		display_msg --log progress "Updating sudoers list."
		if ! grep --silent "/date" "${REPO_SUDOERS_FILE}" ; then
			local F="$( basename "${REPO_SUDOERS_FILE}" )"
			MSG="Please get the newest '${F}' file from Git and try again."
			display_msg --log error "${MSG}"
			exit_installation 2 "${STATUS_ERROR}" "'${F}' file is old."
		fi
		do_sudoers
	fi

	exit_installation 0 "${STATUS_OK}" "Update completed."
}


####
# Install the overlay and modules system
install_overlay()
{

	display_msg --log progress "Installing PHP Modules."
	TMP="${ALLSKY_INSTALLATION_LOGS}/PHP_modules.log"
	sudo apt-get --assume-yes install php-zip php-sqlite3 python3-pip > "${TMP}" 2>&1
	check_success $? "PHP module installation failed" "${TMP}" "${DEBUG}"
	[[ $? -ne 0 ]] && exit_with_image 1 "${STATUS_ERROR}" "PHP module install failed."

	display_msg --log progress "Installing other PHP dependencies."
	TMP="${ALLSKY_INSTALLATION_LOGS}/libatlas.log"
	sudo apt-get --assume-yes install libatlas-base-dev > "${TMP}" 2>&1
	check_success $? "PHP dependencies failed" "${TMP}" "${DEBUG}"
	[[ $? -ne 0 ]] && exit_with_image 1 "${STATUS_ERROR}" "PHP dependencies failed."

	# Doing all the python dependencies at once can run /tmp out of space, so do one at a time.
	# This also allows us to display progress messages.
	if [[ ${OS} == "buster" ]]; then
		M=" for Buster"
		R="-buster"
		#
		# Force pip upgrade, without this installations on Buster fail
		#
		pip3 install --upgrade pip > /dev/null 2>&1
	else
		M=""
		R=""
	fi
	TMP="${ALLSKY_INSTALLATION_LOGS}/Python_dependencies"
	display_msg --log progress "Installing Python dependencies${M}:"
	COUNT=0
	local NUM=$(wc -l < "${ALLSKY_REPO}/requirements${R}.txt")
	: > "${STATUS_FILE_TEMP}"
	while read -r package
	do
		((COUNT++))
		echo "${package}" > /tmp/package
		if [[ ${COUNT} -lt 10 ]]; then
			C=" ${COUNT}"
		else
			C="${COUNT}"
		fi

		display_msg --log progress "   === Package # ${C} of ${NUM}: [${package}]"
		local STATUS_NAME="Python_dependency_${COUNT}"
		if [[ ${STATUS_NAME} == "true" ]]; then
			display_msg --log info "Skipping - already installed in prior installation."
			continue
		fi

		L="${TMP}.${COUNT}.log"
		local M="Python dependency [${package}] failed"
		pip3 install --no-warn-script-location -r /tmp/package > "${L}" 2>&1
		# These files are too big to display so pass in "0" instead of ${DEBUG}.
		if ! check_success $? "${M}" "${L}" 0 ; then
			rm -fr "${PIP3_BUILD}"

			# Add current status
			update_status_from_file "${STATUS_FILE_TEMP}"

			exit_with_image 1 "${STATUS_ERROR}" "${M}."
		fi
		echo "${STATUS_NAME}='true'"  >> "${TEMP_STATUS_FILE}"
	done < "${ALLSKY_REPO}/requirements${R}.txt"

	# Add the status back in.
	update_status_from_file "${STATUS_FILE_TEMP}"

	if [[ ${installing_Trutype_fonts} != "true" ]]; then
		display_msg --log progress "Installing Trutype fonts."
		TMP="${ALLSKY_INSTALLATION_LOGS}/msttcorefonts.log"
		local M="Trutype fonts failed"
		sudo apt-get --assume-yes install msttcorefonts > "${TMP}" 2>&1
		check_success $? "${M}" "${TMP}" "${DEBUG}" || exit_with_image 1 "${STATUS_ERROR}" "${M}"
		STATUS_VARIABLES+=( "install_Trutype_fonts='true'\n" )
	else
		display_msg --logonly info "Skipping: Installing Trutype fonts - already installed"
	fi

	# Do the rest, even if we already did it in a previous installation,
	# in case something in the directories.

	display_msg --log progress "Setting up modules and overlays."
	# These will get overwritten if the user has prior versions.
	cp -ar "${ALLSKY_REPO}/overlay" "${ALLSKY_CONFIG}"
	cp -ar "${ALLSKY_REPO}/modules" "${ALLSKY_CONFIG}"

	# Normally makeChanges.sh handles creating the "overlay.json" file, but the
	# Camera-Specific Overlay (CSO) file didn't exist when makeChanges was called,
	# so we have to set it up here.
	local CSO="${ALLSKY_OVERLAY}/config/overlay-${CAMERA_TYPE}.json"
	local O="${ALLSKY_OVERLAY}/config/overlay.json"		# generic name
	if [[ -f ${CSO} ]]; then
		display_msg "${LOG_TYPE}" progress "Copying '${CSO}' to '${O}'."
		cp "${CSO}" "${O}"
	else
		display_msg --log error "'${CSO}' does not exist; unable to create default overlay file."
	fi

	sudo mkdir -p "${ALLSKY_MODULE_LOCATION}/modules"
	sudo chown -R "${ALLSKY_OWNER}:${WEBSERVER_GROUP}" "${ALLSKY_MODULE_LOCATION}"
	sudo chmod -R 774 "${ALLSKY_MODULE_LOCATION}"			
}


####
check_if_buster()
{
	STATUS_VARIABLES+=("check_if_buster='true'\n")

	if [[ ${OS} == "buster" ]]; then
		MSG="This release runs best on the Bullseye operating system"
		MSG="${MSG} that was released in November, 2021."
		MSG="${MSG}\nYou are running the older Buster operating system and we"
		MSG="${MSG} recommend doing a fresh install of Bullseye on a clean SD card."
		MSG="${MSG}\n\nDo you want to continue anyhow?"
		if ! whiptail --title "${TITLE}" --yesno --defaultno "${MSG}" 18 "${WT_WIDTH}" 3>&1 1>&2 2>&3; then
			display_msg --logonly info "User running Buster and elected not to continue."
			exit_installation 0 "${STATUS_NOT_CONTINUE}" "After Buster check."
		fi
	fi
}


####
# Display an image the user will see when they go to the WebUI.
display_image()
{
	local IMAGE_NAME="${1}"

	I="${ALLSKY_TMP}/image.jpg"

	if [[ -z ${IMAGE_NAME} ]]; then		# No IMAGE_NAME means remove the image
		rm -f "${I}"
		return
	fi

	if [[ ${IMAGE_NAME} == "ConfigurationNeeded" && -f ${POST_INSTALLATION_ACTIONS} ]]; then
		# Add a message the user will see in the WebUI.
		WEBUI_MESSAGE="Actions needed.  See ${POST_INSTALLATION_ACTIONS}."
		"${ALLSKY_SCRIPTS}/addMessage.sh" "warning" "${WEBUI_MESSAGE}"

		# This tells allsky.sh not to display a message about actions since we just did.
		touch "${POST_INSTALLATION_ACTIONS}_initial_message"
	fi

	# ${ALLSKY_TMP} may not exist yet, i.e., at the beginning of installation.
	mkdir -p "${ALLSKY_TMP}"
	cp "${ALLSKY_NOTIFICATION_IMAGES}/${IMAGE_NAME}.jpg" "${I}" 2> /dev/null
}


####
# Installation failed.
# Replace the "installing" messaged with a "failed" one.
exit_with_image()
{
	local RET="${1}"
	local STATUS="${2}"
	display_image "InstallationFailed"
	exit_installation "${RET}" "${STATUS}"
}


####
check_restored_settings()
{
	if [[ ${RESTORED_PRIOR_SETTINGS_FILE} == "true" && \
	  	${RESTORED_PRIOR_CONFIG_SH} == "true" && \
	  	${RESTORED_PRIOR_FTP_SH} == "true" ]]; then
		# If we restored all the prior settings so no configuration is needed.
		if [[ ${WILL_REBOOT} == "true" ]]; then
			IMG=""					# Removes existing image
		else
			IMG="RebootNeeded"
		fi
		display_image "${IMG}"
		return 0
	fi

	if [[ ${RESTORED_PRIOR_SETTINGS_FILE} == "false" ]]; then
		MSG="Default settings were created for your ${CAMERA_TYPE} camera."
		MSG="${MSG}\n\nHowever, you must update them by going to the"
		MSG="${MSG} 'Allsky Settings' page in the WebUI after rebooting."
		whiptail --title "${TITLE}" --msgbox "${MSG}" 12 "${WT_WIDTH}" 3>&1 1>&2 2>&3
	fi
	if [[ ${RESTORED_PRIOR_CONFIG_SH} == "false" || \
	  	${RESTORED_PRIOR_FTP_SH} == "false" ]]; then
		MSG="Default files were created for:"
		[[ ${RESTORED_PRIOR_CONFIG_SH} == "false" ]] && MSG="${MSG}\n   config.sh"
		[[ ${RESTORED_PRIOR_FTP_SH}    == "false" ]] && MSG="${MSG}\n   ftp-settings.sh"
		MSG="${MSG}\n\nHowever, you must update them by going to the"
		MSG="${MSG} 'Editor' page in the WebUI after rebooting."
		whiptail --title "${TITLE}" --msgbox "${MSG}" 12 "${WT_WIDTH}" 3>&1 1>&2 2>&3
	fi

	display_image "ConfigurationNeeded"
}


####
# See if the new ZWO exposure algorithm should be used.
check_new_exposure_algorithm()
{
	local FIELD="experimentalExposure"
	local NEW="$( settings ".${FIELD}" )"
	[[ ${NEW} -eq 1 ]] && return
	
	MSG="There is a new auto-exposure algorithm for nighttime images that initial testing indicates"
	MSG="${MSG} it creates better images at night and during the day-to-night transition."
	MSG="${MSG}\n\nDo you want to use it?"
	if whiptail --title "${TITLE}" --yesno "${MSG}" 10 "${WT_WIDTH}"  3>&1 1>&2 2>&3; then
		display_msg --logonly info "Enabling ${FIELD}."
		update_json_file ".${FIELD}" 1 "${SETTINGS_FILE}"

		MSG="Please provide feedback on the new auto-exposure algorithm"
		MSG="${MSG} by entering a Discussion item in GitHub."
		MSG="${MSG}\nYou can disable it by changing 'New Exposure Algorithm' in the WebUI."
		display_msg notice "${MSG}"
	else
		display_msg --logonly info "User elected NOT to use ${FIELD}."
	fi

	STATUS_VARIABLES+=( "check_new_exposure_algorithm='true'\n" )
}


####
remind_old_version()
{
	if [[ -n ${PRIOR_ALLSKY} ]]; then
		MSG="When you are sure everything is working with the new Allsky release,"
		MSG="${MSG} remove your old version in ${PRIOR_ALLSKY_DIR} to save disk space."
		whiptail --title "${TITLE}" --msgbox "${MSG}" 12 "${WT_WIDTH}" 3>&1 1>&2 2>&3
	fi
}


####
remind_run_check_allsky()
{
	MSG="After you've configured Allsky, run:"
	MSG="${MSG}\n   cd ~/allsky;  scripts/check_allsky.sh"
	MSG="${MSG}\nto check for any issues.  You can also run it whenever you make changes."
	whiptail --title "${TITLE}" --msgbox "${MSG}" 12 "${WT_WIDTH}" 3>&1 1>&2 2>&3
	display_msg --logonly info "Displayed message about running 'check_allsky.sh'."
}


clear_status()
{
	rm -f "${STATUS_FILE}"
}

# Update the status from the specified file
update_status_from_file()
{
	local FILE="${1}"
	if [[ -s ${FILE} ]]; then
		STATUS_VARIABLES+=( "$( < "${FILE}" )" )
		STATUS_VARIABLES+=("\n")
	fi
	rm -f "${FILE}"
}

####
exit_installation()
{
	[[ -z ${FUNCTION} ]] && display_msg "${LOG_TYPE}" info "\nENDING INSTALLATON AT $(date).\n"
	local RET="${1}"

	# If STATUS_LINE is set, add that and all STATUS_VARIABLES to the status file.
	local STATUS_CODE="${2}"
	local MORE_STATUS="${3}"
	if [[ -n ${STATUS_CODE} ]]; then
		if [[ ${STATUS_CODE} == "${STATUS_CLEAR}" ]]; then
			clear_status
		else
			[[ -n ${MORE_STATUS} ]] && MORE_STATUS="; MORE_STATUS='${MORE_STATUS}'"
			echo -e "STATUS_INSTALLATION='${STATUS}'${MORE_STATUS}" > "${STATUS_FILE}"
			echo -e "${STATUS_VARIABLES[@]}" >> "${STATUS_FILE}"
		fi
	fi

	# Don't exit for negative numbers.
	#shellcheck disable=SC2086
	[[ ${RET} -ge 0 ]] && exit ${RET}
}



####################### Main part of program

OS="$(grep CODENAME /etc/os-release | cut -d= -f2)"	# usually buster or bullseye

##### Calculate whiptail sizes
calc_wt_size

##### Check arguments
OK="true"
HELP="false"
DEBUG=0
DEBUG_ARG=""
LOG_TYPE="--logonly"	# by default we only log some messages but don't display

IN_TESTING="false"		# XXXXXXXXXXXXXXXXXXXXXXXXXXXXX
if [[ ${IN_TESTING} == "true" ]]; then
	DEBUG=1; DEBUG_ARG="--debug"; LOG_TYPE="--log"

	T="${ALLSKY_HOME}/told"
	if [[ ! -f ${T} ]]; then
		MSG="\n"
		MSG="${MSG}Testers, until we go-live with this release, debugging is automatically on."
		MSG="${MSG}\n\nPlease make sure you have Debug Level set to 4 in the WebUI during testing."
		MSG="${MSG}\n"

		MSG="${MSG}\nChanges from prior dev releases:"

		MSG="${MSG}\n * change 1"

		MSG="${MSG}\n"
		MSG="${MSG}\n * change 2"

		MSG="${MSG}\n\nIf you agree, enter:    yes"
		A=$(whiptail --title "*** MESSAGE FOR TESTERS ***" --inputbox "${MSG}" 26 "${WT_WIDTH}"  3>&1 1>&2 2>&3)
		if [[ $? -ne 0 || ${A} != "yes" ]]; then
			MSG="\nYou need to TYPE 'yes' to continue the installation."
			MSG="${MSG}\nThis is to make sure you read it.\n"
			display_msg info "${MSG}"
			exit 0
		fi
		touch "${T}"
	fi
fi

UPDATE="false"
FUNCTION=""
TESTING="false"
while [ $# -gt 0 ]; do
	ARG="${1}"
	case "${ARG}" in
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
		--function)
			FUNCTION="${2}"
			shift
			;;
		--testing)
			TESTING="true"			# TODO: developer testing - skip many steps 
TESTING="${TESTING}"	# xxx keeps shellcheck quiet
			;;
		*)
			display_msg --log error "Unknown argument: '${ARG}'."
			OK="false"
			;;
	esac
	shift
done

if [[ -n ${FUNCTION} ]]; then
	# Don't log when a single function is executed.
	DISPLAY_MSG_LOG=""
else
	mkdir -p "${ALLSKY_INSTALLATION_LOGS}"

	display_msg "${LOG_TYPE}" info "STARTING INSTALLATON AT $(date).\n"
fi

[[ ${HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" ]] && usage_and_exit 1

# See if we should skip some steps.
# When most function are called they add a variable with the function's name set to "true".
if [[ -z ${FUNCTION} && -s ${STATUS_FILE} ]]; then
	# Initially just get the status.
	# After that we may clear the file or get all the variables.
	eval "$( grep STATUS_INSTALLATION "${STATUS_FILE}" )"

	if [[ ${STATUS_INSTALLATION} == "${STATUS_OK}" ]]; then
		MSG="The last installation completed successfully."
		MSG="${MSG}\n\nDo you want to re-install from the beginning?"
		MSG="${MSG}\n\nSelecting <No> will exit the installation without making any changes."
		if whiptail --title "${TITLE}" --yesno "${MSG}" 15 "${WT_WIDTH}"  3>&1 1>&2 2>&3; then
			display_msg --log progress "Re-starting installation after successful install."
			clear_status
		else
			display_msg --log progress "Not continuing after prior successful installation."
			exit_installation 0 ""
		fi
	else
		MSG="You have already begun the installation."
		MSG="${MSG}\n\nThe last status was: ${STATUS_INSTALLATION}${MORE_STATUS}"
		MSG="${MSG}\n\nDo you want to continue where you left off?"
		if whiptail --title "${TITLE}" --yesno "${MSG}" 15 "${WT_WIDTH}"  3>&1 1>&2 2>&3; then
			MSG="Continuing installation.  Steps already performed will be skipped."
			MSG="${MSG}\nThe last status was: ${STATUS_INSTALLATION}${MORE_STATUS}"
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
			MSG="${MSG}\n\nSelecting <No> will exit the installation without making any changes."
			if whiptail --title "${TITLE}" --yesno "${MSG}" 15 "${WT_WIDTH}"  3>&1 1>&2 2>&3; then
				display_msg --log progress "Restarting installation."
			else
				display_msg --log progress "Not continuing after prior partial installation."
				exit_installation 0 ""
			fi
		fi
	fi
fi

##### Display a message to Buster users.
[[ ${check_if_buster} != "true" && -z ${FUNCTION} ]] && check_if_buster

##### Does a prior Allsky exist? If so, set PRIOR_ALLSKY and other PRIOR_* variables.
# Re-run every time in case the directory was removed.
does_prior_Allsky_exist

##### Display the welcome header
[[ -z ${FUNCTION} ]] && do_initial_heading

##### Stop Allsky
stop_allsky

##### Determine what camera(s) are connected
# Re-run every time in case a camera was connected or disconnected.
get_connected_cameras

##### Get branch
[[ ${get_this_branch} != "true" ]] && get_this_branch

##### Handle updates
[[ ${UPDATE} == "true" ]] && do_update		# does not return

##### See if there's an old WebUI
[[ ${does_old_WebUI_location_exist} != "true" ]] && does_old_WebUI_location_exist

##### Executes the specified function, if any, and exits.
if [[ -n ${FUNCTION} ]]; then
	display_msg "${LOG_TYPE}" info "Calling FUNCTION '${FUNCTION}'"
	do_function "${FUNCTION}"
fi

##### Display an image in the WebUI
display_image "InstallationInProgress"

# Do as much of the prompting up front, then do the long-running work, then prompt at the end.

##### Prompt to use prior Allsky
[[ ${prompt_for_prior_Allsky} != "true" ]] && prompt_for_prior_Allsky

##### Get locale (prompt if needed).  May not return.
[[ ${get_desired_locale} != "true" ]] && get_desired_locale

##### Prompt for the camera type
[[ ${select_camera_type} != "true" ]] && select_camera_type

##### Get the new host name
[[ ${prompt_for_hostname} != "true" ]] && prompt_for_hostname

##### Check for sufficient swap space
[[ ${check_swap} == "true" ]] && check_swap

##### Optionally make ${ALLSKY_TMP} a memory filesystem
[[ ${check_tmp} != "true" ]] && check_tmp


MSG="The following steps can take up to an hour depending on the speed of your Pi"
MSG="${MSG}\nand how many of the necessary dependencies are already installed."
MSG="${MSG}\nYou will see progress messages throughout the process."
MSG="${MSG}\nAt the end you will be prompted again for additional steps."
display_msg notice "${MSG}"


##### Install web server
# This must come BEFORE save_camera_capabilities, since it installs php.
[[ ${install_webserver} != "true" ]] && install_webserver

##### Install dependencies, then compile and install Allsky software
# This will create the "config" directory and put default files in it.
[[ ${install_dependencies_etc} != "true" ]] && install_dependencies_etc

##### Create the file that defines the WebUI variables.
[[ ${create_webui_defines} != "true" ]] && create_webui_defines

##### Create the camera type-model-specific "options" file
# This should come after the steps above that create ${ALLSKY_CONFIG}.
if [[ ${save_camera_capabilities} != "true" ]]; then
	save_camera_capabilities "false"		# prompts on error only
	[[ $? -ne 0 ]] && exit_with_image 1 "${STATUS_ERROR}" "save_camera_capabilities failed."
fi

##### Set locale.  May reboot instead of returning.
[[ ${set_locale} != "true" ]] && set_locale

##### Create the Allsky log files
# Re-run every time in case permissions changed.
create_allsky_logs

##### install the overlay and modules system
install_overlay

##### Check for, and handle any prior Allsky Website
[[ ${handle_prior_website} != "true" ]] && handle_prior_website

##### Restore prior files if needed
[[ ${restore_prior_files} != "true" ]] && restore_prior_files	# prompts if prior Allsky exists

##### Update config.sh
[[ ${update_config_sh} != "true" ]] && update_config_sh

##### Set permissions.  Want this at the end so we make sure we get all files.
# Re-run every time in case permissions changed.
set_permissions

##### Check if there's an old WebUI and let the user know it's no longer used.
# Re-run every time to remind them if there's still an old location.
check_old_WebUI_location									# prompt if prior old-style WebUI

##### See if we should reboot when installation is done.
ask_reboot "full"											# prompts

##### Display any necessary messaged about restored / not restored settings
# Re-run every time to possibly remind them to update their settings.
check_restored_settings

##### If using ZWO, prompt if the New Exposure Algorithm should be used.
# TODO: remove check_new_exposure_algorithm() when it's the default.
[[ ${CAMERA_TYPE} == "ZWO" && ${check_new_exposure_algorith} != "true" ]] && check_new_exposure_algorithm

##### Let the user know to run check_allsky.sh.
remind_run_check_allsky

##### If needed, remind the user to remove any old Allsky version
remind_old_version


######## All done

[[ ${WILL_REBOOT} == "true" ]] && do_reboot		# does not return

exit_installation 0 "${STATUS_OK}" "Installation succeeded."
