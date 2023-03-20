#!/bin/bash

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

# Location of possible prior version of Allsky.
# If the user wants items copied from there to the new version,
# they should have manually renamed "allsky" to "allsky-OLD" prior to running this script.
PRIOR_ALLSKY_DIR="$(dirname "${ALLSKY_HOME}")/${ALLSKY_INSTALL_DIR}-OLD"
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

# Directory for log files from installation.
# Needs to go somewhere that survives reboots but can be removed when done.
INSTALL_LOGS_DIR="${ALLSKY_CONFIG}/installation_logs"

# The POST_INSTALLATION_ACTIONS contains information the user needs to act upon after the reboot.
rm -f "${POST_INSTALLATION_ACTIONS}"		# Shouldn't be there, but just in case.

rm -f "${ALLSKY_MESSAGES}"					# Start out with no messages.

# display_msg() will send "log" entries to this file.
# DISPLAY_MSG_LOG is used in display_msg()
# shellcheck disable=SC2034
DISPLAY_MSG_LOG="${INSTALL_LOGS_DIR}/installation_log.txt"

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

	MSG="Welcome to the ${TITLE}!\n"

	if [[ -n ${PRIOR_ALLSKY} ]]; then
		MSG="${MSG}\nYou will be asked if you want to use the images and darks (if any) from"
		MSG="${MSG}\nyour prior version of Allsky."
		if [[ ${PRIOR_ALLSKY} == "new" ]]; then
			MSG="${MSG}\nIf so, we will use its settings as well."
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
		exit 1
	fi
	display_header "Welcome to the ${TITLE}!"
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
	exit ${RET}
}


####
# Stop Allsky.  If it's not running, nothing happens.
stop_allsky()
{
	sudo systemctl stop allsky 2> /dev/null
	sudo systemctl stop allskyperiodic 2> /dev/null
}


####
# Get the branch of the release we are installing; if not GITHUB_MAIN_BRANCH, save it.
get_this_branch()
{
	local FILE="${ALLSKY_HOME}/.git/config"
	if [[ -f ${FILE} ]]; then
		local B="$(sed -E --silent -e '/^\[branch "/s/(^\[branch ")(.*)("])/\2/p' "${FILE}")"
		if [[ -n ${B} ]]; then
			if [[ ${B} != "${GITHUB_MAIN_BRANCH}" ]]; then
				BRANCH="${B}"
				echo -n "${BRANCH}" > "${ALLSKY_BRANCH_FILE}"
				display_msg info "Using '${BRANCH}' branch."
			elif [[ ${DEBUG} -gt 0 ]]; then
				display_msg info "Using the '${B}' branch."
			fi
		else
			display_msg --log warning "Unable to determine branch from '${FILE}'; assuming ${BRANCH}."
		fi
	else
		display_msg --log warning "${FILE} not found; assuming ${BRANCH} branch."
	fi
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
		display_msg error "Unknown CAMERA_TYPE: '${CAMERA_TYPE}'"
		exit 1
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
		display_msg error "Unknown CAMERA: '${CAMERA}'"
		exit 1
	fi
}

####
# Prompt the user to select their camera type, if we can't determine it automatically.
# If they have a prior installation of Allsky that uses either CAMERA or CAMERA_TYPE in config.sh,
# we can use its value and not prompt.
CAMERA_TYPE=""
select_camera_type()
{
	if [[ -f ${PRIOR_CONFIG_FILE} ]]; then
		case "${PRIOR_ALLSKY_VERSION}" in
			# New versions go here...
# xxxxxxxxxxxxxx      TODO: update version on next line when we go live.
			"v2023.03.09_tbd")
				# New style Allsky using ${CAMERA_TYPE}.
				CAMERA_TYPE="$(get_variable "CAMERA_TYPE" "${PRIOR_CONFIG_FILE}")"
				# Don't bother with a message since this is a "similar" release.
				[[ -n ${CAMERA_TYPE} ]] && return
				;;

			"v2022.03.01" | "old")
				local CAMERA="$(get_variable "CAMERA" "${PRIOR_CONFIG_FILE}")"
				if [[ -n ${CAMERA} ]]; then
					CAMERA_TYPE="$( CAMERA_to_CAMERA_TYPE "${CAMERA}" )"
					if [[ ${CAMERA} != "${CAMERA_TYPE}" ]]; then
						NEW=" (now called ${CAMERA_TYPE})"
					else
						NEW=""
					fi
					display_msg --log progress "Using prior ${CAMERA} camera${NEW}."
					return
				fi
				;;
		esac
	fi

	# "2" is the number of menu items.
	MSG="\nSelect your camera type:\n"
	CAMERA_TYPE=$(whiptail --title "${TITLE}" --menu "${MSG}" 15 "${WT_WIDTH}" 2 \
		"ZWO"  "   ZWO ASI" \
		"RPi"  "   Raspberry Pi HQ, Module 3, and compatible" \
		3>&1 1>&2 2>&3)
	if [[ $? -ne 0 ]]; then
		display_msg warning "Camera selection required.  Please re-run the installation and select a camera to continue."
		exit 2
	fi
	display_msg --log progress "Using ${CAMERA_TYPE} camera."
}


####
# Create the file that defines the WebUI variables.
create_webui_defines()
{
	display_msg progress "Modifying locations for WebUI."
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
}


####
# Recreate the options file.
# This can be used after installation if the options file gets hosed.
recreate_options_file()
{
	CAMERA_TYPE="$(get_variable "CAMERA_TYPE" "${ALLSKY_CONFIG}/config.sh")"
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
		display_msg error "INTERNAL ERROR: CAMERA_TYPE not set in save_camera_capabilities()."
		return 1
	fi

	OPTIONSFILEONLY="${1}"		# Set to "true" if we should ONLY create the options file.

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
		display_msg progress "Setting up WebUI options${MSG} for ${CAMERA_TYPE} cameras."
	fi

	# Restore the prior settings file so it can be used by makeChanges.sh.
	[[ ${PRIOR_ALLSKY} != "" ]] && restore_prior_settings_files

	if [[ ${DEBUG} -gt 0 ]]; then
		MSG="Executing makeChanges.sh ${FORCE} ${OPTIONSONLY} --cameraTypeOnly"
		MSG="${MSG}  ${DEBUG_ARG} 'cameraType' 'Camera Type' '${CAMERA_TYPE}'"
		display_msg debug "${MSG}"
	fi
	#shellcheck disable=SC2086
	"${ALLSKY_SCRIPTS}/makeChanges.sh" ${FORCE} ${OPTIONSONLY} --cameraTypeOnly ${DEBUG_ARG} \
		"cameraType" "Camera Type" "${CAMERA_TYPE}"
	RET=$?
	if [[ ${RET} -ne 0 ]]; then
		#shellcheck disable=SC2086
		if [[ ${RET} -eq ${EXIT_NO_CAMERA} ]]; then
			MSG="No camera was found; one must be connected and working for the installation to succeed.\n"
			MSG="$MSG}After connecting your camera, run '${ME} --update'."
			whiptail --title "${TITLE}" --msgbox "${MSG}" 12 "${WT_WIDTH}" 3>&1 1>&2 2>&3
			display_msg --log error "No camera detected - installation aborted."
		elif [[ ${OPTIONSFILEONLY} == "false" ]]; then
			display_msg --log error "Unable to save camera capabilities."
		fi
		return 1
	fi

	return 0
}


####
# Update the sudoers file so the web server can execute certain commands with sudo.
do_sudoers()
{
	display_msg progress "Creating/updating sudoers file."
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
	MSG="${MSG}\n\nYou must reboot the Raspberry Pi to finish the installation."
	MSG="${MSG}\n\nAfter reboot you can connect to the WebUI at:\n"
	MSG="${MSG}${AT}"
	MSG="${MSG}\n\nReboot when installation is done?"
	if whiptail --title "${TITLE}" --yesno "${MSG}" 18 "${WT_WIDTH}" 3>&1 1>&2 2>&3; then
		WILL_REBOOT="true"
	else
		display_msg notice "You need to reboot the Pi before Allsky will work."
		MSG="If you have not already rebooted your Pi, please do so now.\n"
		MSG="${MSG}You can connect to the WebUI at:\n"
		MSG="${MSG}${AT}"
		echo -e "\n\n==========\n${MSG}" >> "${POST_INSTALLATION_ACTIONS}"
	fi
}
do_reboot()
{
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
	if [[ ${1} == "prompt" ]]; then
		PROMPT="true"
	else
		PROMPT="false"
	fi

	# Note: This doesn't produce exact results.  On a 4 GB Pi, it returns 3.74805.
	RAM_SIZE=$(free --mebi | awk '{if ($1 == "Mem:") {print $2; exit 0} }')		# in MB
	if [[ ${RAM_SIZE} -le 1024 ]]; then
		SUGGESTED_SWAP_SIZE=4096
	elif [[ ${RAM_SIZE} -le 2048 ]]; then
		SUGGESTED_SWAP_SIZE=2048
	elif [[ ${RAM_SIZE} -le 4046 ]]; then
		SUGGESTED_SWAP_SIZE=1025
	else
		SUGGESTED_SWAP_SIZE=0
	fi

	# Not sure why, but displayed swap is often 1 MB less than what's in /etc/dphys-swapfile
	CURRENT_SWAP=$(free --mebi | awk '{if ($1 == "Swap:") {print $2 + 1; exit 0} }')		# in MB
	CURRENT_SWAP=${CURRENT_SWAP:-0}
	if [[ ${CURRENT_SWAP} -lt ${SUGGESTED_SWAP_SIZE} || ${PROMPT} == "true" ]]; then
		[[ -z ${FUNCTION} ]] && sleep 2		# time to read prior messages
		if [[ ${CURRENT_SWAP} -eq 0 ]]; then
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

		SWAP_SIZE=$(whiptail --title "${TITLE}" --inputbox "${MSG}" 18 "${WT_WIDTH}" \
			"${SUGGESTED_SWAP_SIZE}" 3>&1 1>&2 2>&3)
		if [[ -z ${SWAP_SIZE} || ${SWAP_SIZE} == "0" ]]; then
			if [[ ${CURRENT_SWAP} -eq 0 && ${SUGGESTED_SWAP_SIZE} -gt 0 ]]; then
				display_msg --log warning "With no swap space you run the risk of programs failing."
			else
				display_msg --log info "Swap will remain at ${CURRENT_SWAP}."
			fi
		else
			sudo dphys-swapfile swapoff					# Stops the swap file
			sudo sed -i "/CONF_SWAPSIZE/ c CONF_SWAPSIZE=${SWAP_SIZE}" /etc/dphys-swapfile
			sudo dphys-swapfile setup  > /dev/null		# Sets up new swap file
			sudo dphys-swapfile swapon					# Turns on new swap file
			display_msg --log progress "Swap space set to ${SWAP_SIZE} MB."
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
		[[ ${DEBUG} -gt 0 ]] && display_msg debug "Existing IMAGES=${IMAGES}"
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
	INITIAL_FSTAB_STRING="tmpfs ${ALLSKY_TMP} tmpfs"

	# Check if currently a memory filesystem.
	if grep --quiet "^${INITIAL_FSTAB_STRING}" /etc/fstab; then
		display_msg --log progress "${ALLSKY_TMP} is currently in memory; no change needed."

		# If there's a prior Allsky version and it's tmp directory is mounted,
		# try to unmount it, but that often gives an error that it's busy,
		# which isn't really a problem since it'll be unmounted at the reboot.
		# /etc/fstab has ${ALLSKY_TMP} but the mount point is currently in the PRIOR Allsky.
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
			[[ ${DEBUG} -gt 0 ]] && display_msg debug "${ALLSKY_TMP} already mounted"
			return 0
		fi

		check_and_mount_tmp		# works on new ${ALLSKY_TMP}
		return 0
	fi

	SIZE=75		# MB - should be enough
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
		display_msg error "${MESSAGE}"
		MSG="The full log file is in ${LOG}"
		MSG="${MSG}\nThe end of the file is:"
		display_msg info "${MSG}"
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
	display_msg progress "Installing the web server."
	sudo systemctl stop hostapd 2> /dev/null
	sudo systemctl stop lighttpd 2> /dev/null
	TMP="${INSTALL_LOGS_DIR}/lighttpd.install.log"
	(
		sudo apt-get update && \
			sudo apt-get install -y lighttpd php-cgi php-gd hostapd dnsmasq avahi-daemon
	) > "${TMP}" 2>&1
	check_success $? "lighttpd installation failed" "${TMP}" "${DEBUG}" || exit_with_image 1

	FINAL_LIGHTTPD_FILE="/etc/lighttpd/lighttpd.conf"
	sed \
		-e "s;XX_ALLSKY_WEBUI_XX;${ALLSKY_WEBUI};g" \
		-e "s;XX_ALLSKY_HOME_XX;${ALLSKY_HOME};g" \
		-e "s;XX_ALLSKY_IMAGES_XX;${ALLSKY_IMAGES};g" \
		-e "s;XX_ALLSKY_WEBSITE_XX;${ALLSKY_WEBSITE};g" \
		-e "s;XX_ALLSKY_DOCUMENTATION_XX;${ALLSKY_DOCUMENTATION};g" \
		-e "s;XX_ALLSKY_CONFIG_XX;${ALLSKY_CONFIG};g" \
		-e "s;XX_ALLSKY_OVERLAY_XX;${ALLSKY_OVERLAY};g" \
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
	truncate -s 0 "${LIGHTTPD_LOG}"
}


####
# Prompt for a new hostname if needed,
# and update all the files that contain the hostname.
prompt_for_hostname()
{
	# If the Pi is already called ${SUGGESTED_NEW_HOST_NAME},
	# then the user already updated the name, so don't prompt again.

	CURRENT_HOSTNAME=$(tr -d " \t\n\r" < /etc/hostname)
	if [[ ${CURRENT_HOSTNAME} == "${SUGGESTED_NEW_HOST_NAME}" ]]; then
		NEW_HOST_NAME="${CURRENT_HOSTNAME}"
		return
	fi

	# If we're upgrading, use the current name.
	if [[ -n ${PRIOR_ALLSKY} ]]; then
		NEW_HOST_NAME="${CURRENT_HOSTNAME}"
		display_msg --log progress "Using current hostname of ${CURRENT_HOSTNAME}."
		return
	fi

	MSG="Please enter a hostname for your Pi."
	MSG="${MSG}\n\nIf you have more than one Pi on your network they must all have unique names."
	NEW_HOST_NAME=$(whiptail --title "${TITLE}" --inputbox "${MSG}" 10 "${WT_WIDTH}" \
		"${SUGGESTED_NEW_HOST_NAME}" 3>&1 1>&2 2>&3)
	if [[ $? -ne 0 ]]; then
		display_msg warning "You must specify a host name.  Please re-run the installation and select one."
		exit 2
	fi

	if [[ ${CURRENT_HOSTNAME} != "${NEW_HOST_NAME}" ]]; then
		echo "${NEW_HOST_NAME}" | sudo tee /etc/hostname > /dev/null
		sudo sed -i "s/127.0.1.1.*${CURRENT_HOSTNAME}/127.0.1.1\t${NEW_HOST_NAME}/" /etc/hosts
	fi

	# Set up the avahi daemon if needed.
	FINAL_AVI_FILE="/etc/avahi/avahi-daemon.conf"
	[[ -f ${FINAL_AVI_FILE} ]] && grep -i --quiet "host-name=${NEW_HOST_NAME}" "${FINAL_AVI_FILE}"
	if [[ $? -ne 0 ]]; then
		# New NEW_HOST_NAME is not found in the file, or the file doesn't exist,
		# so need to configure it.
		display_msg progress "Configuring avahi-daemon."

		sed "s/XX_HOST_NAME_XX/${NEW_HOST_NAME}/g" "${REPO_AVI_FILE}" > /tmp/x
		sudo install -m 0644 /tmp/x "${FINAL_AVI_FILE}" && rm -f /tmp/x
	fi
}


####
# Set permissions on various web-related items.
set_permissions()
{
	display_msg progress "Setting permissions on web-related files."

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
	sudo find "${ALLSKY_CONFIG}/" -type f -exec chmod 664 {} \;
	sudo find "${ALLSKY_CONFIG}/" -type d -exec chmod 775 {} \;
	sudo chgrp -R "${WEBSERVER_GROUP}" "${ALLSKY_CONFIG}"

	# The files should already be the correct permissions/owners, but just in case, set them.
	# We don't know what permissions may have been on the old website, so use "sudo".
	sudo find "${ALLSKY_WEBUI}/" -type f -exec chmod 644 {} \;
	# These are the exceptions
	chmod 755 "${ALLSKY_WEBUI}/includes/createAllskyOptions.php" "${ALLSKY_WEBUI}/includes/overlay_sample.py"
	sudo find "${ALLSKY_WEBUI}/" -type d -exec chmod 755 {} \;

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
}

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
		MSG="The old WebUI location '${OLD_WEBUI_LOCATION}' exists"
		COUNT=$(find "${OLD_WEBUI_LOCATION}" | wc -l)
		if [[ ${COUNT} -eq 1 ]]; then
			MSG="${MSG} and is empty."
			MSG="${MSG}\nYou can safely delete it after installation:  sudo rmdir '${OLD_WEBUI_LOCATION}'"
		else
			MSG="${MSG} but doesn't contain a valid WebUI."
			MSG="${MSG}\nPlease check it out after installation - if there's nothing you"
			MSG="${MSG} want in it, remove it:  sudo rm -fr '${OLD_WEBUI_LOCATION}'"
		fi
		whiptail --title "${TITLE}" --msgbox "${MSG}" 15 "${WT_WIDTH}"   3>&1 1>&2 2>&3
		display_msg notice "${MSG}"
		echo -e "\n\n==========\n${MSG}" >> "${POST_INSTALLATION_ACTIONS}"
		return
	fi

	MSG="An old version of the WebUI was found in ${OLD_WEBUI_LOCATION}; it is no longer being used so you may remove it after intallation."
	MSG="${MSG}\n\nWARNING: if you have any other web sites in that directory, they will no longer be accessible via the web server."
	whiptail --title "${TITLE}" --msgbox "${MSG}" 15 "${WT_WIDTH}"   3>&1 1>&2 2>&3
	display_msg notice "${MSG}"
	echo -e "\n\n==========\n${MSG}" >> "${POST_INSTALLATION_ACTIONS}"
}


####
handle_prior_website()
{
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
		# Hmmm.  There's an old webite AND a new one.
		# Allsky doesn't ship with the website directory, so not sure how one got there...
		# Try to remove the new one - if it's not empty the remove will fail
		# so rename it.
		if ! rmdir "${ALLSKY_WEBSITE}" ; then
			local UNKNOWN_WEBSITE="${ALLSKY_WEBSITE}-UNKNOWN-$$"
			MSG="Unknown Website in '${ALLSKY_WEBSITE}' is not empty."
			MSG="${MSG}\nRenaming to '${UNKNOWN_WEBSITE}'."
			display_msg error "${MSG}"
			if ! mv "${ALLSKY_WEBSITE}" "${UNKNOWN_WEBSITE}" ; then
				display_msg error "Unable to move."
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
		display_msg warning "Unable to determine verson of GitHub branch '${GITHUB_MAIN_BRANCH}'."
	fi

	local B=""

	# Check if the prior website is outdated.
	# For new-style websites, only check the branch they are currently running.
	# If a non-production branch is used the Website installer will check if there's
	# a newer production branch.

	if [[ ${PRIOR_STYLE} == "new" ]]; then

		# get_branch returns "" the prior branch is ${GITHUB_MAIN_BRANCH}.
		local PRIOR_BRANCH="$( get_branch "${PRIOR_SITE}/" )"

		display_msg progress "Restoring Allsky Website from ${PRIOR_SITE}."
		sudo mv "${PRIOR_SITE}" "${ALLSKY_WEBSITE}"

		# We can only check versions if we obtained the new version.
		[[ -z ${NEWEST_VERSION} ]] && return

		# If the old Website was using a non-production branch,
		# see if there's a newer version of the Website with that branch OR
		# a newer version with the production branch.  Use whichever is newer.
		if [[ -n ${PRIOR_BRANCH} && ${PRIOR_BRANCH} != "${GITHUB_MAIN_BRANCH}" ]]; then
			NEWEST_VERSION="$(get_Git_version "${PRIOR_BRANCH}" "${GITHUB_WEBSITE_PACKAGE}")"
			B=" in the '${PRIOR_BRANCH}' branch"

			if [[ ${DEBUG} -gt 0 ]]; then
				MSG="'${PRIOR_BRANCH}' branch: prior Website version=${PV},"
				MSG="${MSG} Git version=${NEWEST_VERSION}."
				display_msg debug "${MSG}"
			fi
		fi

	elif [[ -z ${NEWEST_VERSION} ]]; then
		return
	fi

	if [[ -n ${NEWEST_VERSION} ]]; then
		if [[ ${DEBUG} -gt 0 ]]; then
			display_msg debug "Comparing prior Website ${PV} to newest ${NEWEST_VERSION}${B}"
		fi
		if [[ -z ${PRIOR_VERSION} || ${PRIOR_VERSION} < "${NEWEST_VERSION}" ]]; then
			MSG="There is a newer Allsky Website available${B}; please upgrade to it."
			MSG="${MSG}\nYour    version: ${PV}"
			MSG="${MSG}\nCurrent version: ${NEWEST_VERSION}"
			MSG="${MSG}\n\nYou can upgrade by executing:"
			MSG="${MSG}\n     cd ~/allsky; website/install.sh"
			MSG="${MSG}\nafter this installation finishes."
			display_msg notice "${MSG}"
			echo -e "\n\n==========\n${MSG}" >> "${POST_INSTALLATION_ACTIONS}"
		fi
	fi
}


####
# Get the locale, prompting if we can't determine it.
LOCALE=""
CURRENT_LOCALE=""
get_locale()
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
		exit 1
	fi

	#shellcheck disable=SC2086
	[[ ${DEBUG} -gt 1 ]] && echo "INSTALLED_LOCALES=" ${INSTALLED_LOCALES}

	# If the prior version of Allsky had a locale set but it's not
	# an installed one, let th euser know.
	# This can happen if they use the settings file from a different Pi or different OS.
	local MSG2=""
	if [[ -n ${PRIOR_ALLSKY} && -n ${PRIOR_SETTINGS_FILE} ]]; then
		local L="$(jq -r .locale "${PRIOR_SETTINGS_FILE}")"
		if [[ ${L} != "" && ${L} != "null" ]]; then
			local X="$(echo "${INSTALLED_LOCALES}" | grep "${L}")"
			if [[ -z ${X} ]]; then
				MSG2="NOTE: Your prior locale (${L}) is not installed on this Pi."
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
	#shellcheck disable=SC2086
	[[ ${DEBUG} -gt 1 ]] && echo "TEMP_LOCALE=${TEMP_LOCALE}, CURRENT_LOCALE=${CURRENT_LOCALE}"

	local D=""
	if [[ -n ${CURRENT_LOCALE} && ${CURRENT_LOCALE} != "null" ]]; then
		D="--default-item ${CURRENT_LOCALE}"
	else
		CURRENT_LOCALE=""
	fi

	MSG="\nSelect your locale; the default is highlighted in red."
	MSG="${MSG}\nIf it's not in the list, press <Cancel>."
	MSG="${MSG}\n\nIf you change the locale, the system will reboot and"
	MSG="${MSG}\nyou will need to restart the installation."
	[[ -n ${MSG2} ]] && MSG="${MSG}\n\n${MSG2}"

# TODO: replace "." in printf() with something (I don't know what) so whiptail gets a null or
# space for the 2nd arguments in the pair.
	local LOCALES="$( echo "${INSTALLED_LOCALES}" | awk '{ printf("%s %s ", $1, ".") }' )"
	[[ ${DEBUG} -gt 1 ]] && echo "LOCALES=${LOCALES}"

	#shellcheck disable=SC2086
	LOCALE=$(whiptail --title "${TITLE}" ${D} --menu "${MSG}" 25 "${WT_WIDTH}" 4 ${LOCALES} \
		3>&1 1>&2 2>&3)
	if [[ -z ${LOCALE} ]]; then
		MSG="You need to set the locale before the installation can run."
		MSG="${MSG}\nIf your locale was not in the list, run 'raspi-config' to update the list,"
		MSG="${MSG}\nthen rerun the installation."
		display_msg info "${MSG}"
		exit 0
	elif echo "${LOCALE}" | grep --silent "Box options" ; then
		# Got a usage message from whiptail.
		# Must be no space between the last double quote and ${LOCALES}.
		#shellcheck disable=SC2086
		MSG="Got usage message from whiptail: D='${D}', LOCALES="${LOCALES}
		MSG="${MSG}\nFix the problem and try the installation again."
		display_msg --log error "${MSG}"
		exit 1
	fi
}


####
# Set the locale
set_locale()
{
	[[ -z ${LOCALE} ]] && get_locale

	# ${LOCALE} and ${CURRENT_LOCALE} are set

	if [[ ${CURRENT_LOCALE} == "${LOCALE}" ]]; then
		display_msg progress "Keeping '${LOCALE}' locale."
		LOCALE=""		# causes set_locale not to do anything.
	else
		display_msg progress "Setting locale to '${LOCALE}'."
		if [[ ! -f ${SETTINGS_FILE} ]]; then
			# For testing, create a dummy settings file.
			SETTINGS_FILE="/tmp/s"
			echo '{ "locale" : "aa_AA.UTF-8" }' > "${SETTINGS_FILE}"
		fi
		jq ".locale = \"${LOCALE}\"" "${SETTINGS_FILE}" > /tmp/x && mv /tmp/x "${SETTINGS_FILE}"
		# This updates /etc/default/locale
		sudo update-locale LC_ALL="${LOCALE}" LANGUAGE="${LOCALE}" LANG="${LOCALE}"

		ask_reboot "locale" && do_reboot		# do_reboot does not return
		display_msg warning "You must reboot before continuing with the installation."
		exit 0
	fi
}


####
# See if a prior Allsky exists; if so, set some variables.
does_prior_Allsky_exist()
{
	PRIOR_ALLSKY=""
	if [[ -d ${PRIOR_ALLSKY_DIR}/src ]]; then
		if [[ -f  ${PRIOR_ALLSKY_DIR}/version ]]; then
			PRIOR_ALLSKY_VERSION="$( < "${PRIOR_ALLSKY_DIR}/version" )"
			case "${PRIOR_ALLSKY_VERSION}" in
				"v2022.03.01")		# First Allsky version with a version file
					# This is an old style Allsky with ${CAMERA} in config.sh and
					# the first version with a "version" file.
					# Don't do anything here; go to the "if" after the "esac".
					;;

				*)
					# Newer version.
					# PRIOR_SETTINGS_FILE should be a link to a camera-specific settings file.
					PRIOR_ALLSKY="new"
					PRIOR_SETTINGS_FILE="${PRIOR_CONFIG_DIR}/${SETTINGS_FILE_NAME}"

					# This shouldn't happen, but just in case ...
					[[ ! -f ${PRIOR_SETTINGS_FILE} ]] && PRIOR_SETTINGS_FILE=""
					;;
			esac
		fi

		if [[ -z ${PRIOR_ALLSKY} ]]; then
			PRIOR_ALLSKY="old"
			PRIOR_ALLSKY_VERSION="${PRIOR_ALLSKY_VERSION:-old}"
			local CAMERA="$( CAMERA_TYPE_to_CAMERA "${CAMERA_TYPE}" )"
			PRIOR_SETTINGS_FILE="${OLD_RASPAP_DIR}/settings_${CAMERA}.json"
			[[ ! -f ${PRIOR_SETTINGS_FILE} ]] && PRIOR_SETTINGS_FILE=""
		fi

		return 0
	else
		return 1
	fi
}


####
# If there's a prior version of the software,
# ask the user if they want to move stuff from there to the new directory.
# Look for a directory inside the old one to make sure it's really an old allsky.
prompt_for_prior_Allsky()
{
	if [[ -n ${PRIOR_ALLSKY} ]]; then
		MSG="You have a prior version of Allsky in ${PRIOR_ALLSKY_DIR}."
		MSG="${MSG}\n\nDo you want to restore the prior images, darks, and certain settings?"
		if whiptail --title "${TITLE}" --yesno "${MSG}" 15 "${WT_WIDTH}"  3>&1 1>&2 2>&3; then
			return 0
		else
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
			display_msg info "Rename the directory with your prior version of Allsky to\n'${PRIOR_ALLSKY_DIR}', then run the installation again.\n"
			exit 0
		fi
	fi

	# No prior Allsky so force creating a default settings file.
	FORCE_CREATING_SETTINGS_FILE="true"
}


####
install_dependencies_etc()
{
	# These commands produce a TON of output that's not needed unless there's a problem.
	# They also take a little while, so hide the output and let the user know.

	display_msg progress "Installing dependencies."
	TMP="${INSTALL_LOGS_DIR}/make_deps.log"
	#shellcheck disable=SC2024
	sudo make deps > "${TMP}" 2>&1
	check_success $? "Dependency installation failed" "${TMP}" "${DEBUG}" || exit_with_image 1

	display_msg progress "Preparing Allsky commands."
	TMP="${INSTALL_LOGS_DIR}/make_all.log"
	#shellcheck disable=SC2024
	make all > "${TMP}" 2>&1
	check_success $? "Compile failed" "${TMP}" "${DEBUG}" || exit_with_image 1

	TMP="${INSTALL_LOGS_DIR}/make_install.log"
	#shellcheck disable=SC2024
	sudo make install > "${TMP}" 2>&1
	check_success $? "make install failed" "${TMP}" "${DEBUG}" || exit_with_image 1

	return 0
}


####
# Update config.sh
update_config_sh()
{
	sed -i \
		-e "s;XX_ALLSKY_VERSION_XX;${ALLSKY_VERSION};g" \
		-e "s/^CAMERA_TYPE=.*$/CAMERA_TYPE=\"${CAMERA_TYPE}\"/" \
		"${ALLSKY_CONFIG}/config.sh"
}


####
# Create the log file and make it readable/writable by the user; this aids in debugging.
create_allsky_logs()
{
	display_msg progress "Setting permissions on ${ALLSKY_LOG} and ${ALLSKY_PERIODIC_LOG}."
	sudo truncate -s 0 "${ALLSKY_LOG}" "${ALLSKY_PERIODIC_LOG}"
	sudo chmod 664 "${ALLSKY_LOG}" "${ALLSKY_PERIODIC_LOG}"
	sudo chgrp "${ALLSKY_GROUP}" "${ALLSKY_LOG}" "${ALLSKY_PERIODIC_LOG}"

	sudo systemctl restart rsyslog		# so logs go to the files above
}


####
# Prompt for either latitude or longitude, and make sure it's a valid entry.
prompt_for_lat_long()
{
	local TYPE="${1}"
	local HUMAN_TYPE="${2}"
	local ERROR_MSG=""
	local VALUE=""

	while :
	do
		local M="${ERROR_MSG}${MSG}"
		VALUE=$(whiptail --title "${TITLE}" --inputbox "${M}" 18 "${WT_WIDTH}" "" 3>&1 1>&2 2>&3)
		if [[ -z ${VALUE} ]]; then
			# Let the user not enter anything.  A message is printed below.
			break
		else
			if VALUE="$(convertLatLong "${VALUE}" "${TYPE}")" ; then
				jq ".${TYPE}=\"${VALUE}\" "   "${SETTINGS_FILE}" > /tmp/x && mv /tmp/x "${SETTINGS_FILE}"
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
	display_msg progress "Prompting for Latitude and Longitude."

	MSG="Enter your Latitude."
	MSG="${MSG}\nIt can either have a plus or minus sign (e.g., -20.1)"
	MSG="${MSG} or N or S (e.g., 20.1S)"
	LATITUDE="$(prompt_for_lat_long "latitude" "Latitude")"

	MSG="Enter your Longitude."
	MSG="${MSG}\nIt can either have a plus or minus sign (e.g., -20.1)"
	MSG="${MSG} or E or W (e.g., 20.1W)"
	LONGITUDE="$(prompt_for_lat_long "longitude" "Longitude")"

	if [[ -z ${LATITUDE} || -z ${LONGITUDE} ]]; then
		display_msg --log warning "Latitude and longitude need to be set in the WebUI before Allsky can start."
	fi
}


####
# Convert the prior settings file to a new one,
# then link the new one to the camera-specific name.
convert_settings()			# prior_version, prior_file, current_version
{
cat > /dev/null <<EOF
# ZWO:
Z "autousb":"1",
Z "usb":"80",
Z "gaintransitiontime":"15",
Z "gamma":"50",
Z "showTemp":"1",
Z "showHistogram":"0",
Z "coolerEnabled":"0",
Z "targetTemp":"0",
Z "histogrambox":"500 500 50 50",
Z "showhistogrambox":"0",
Z "newexposure":"1",
Z aggression
Z dayskipframes
Z nightskipframes


R Z "dayautoexposure":"1",
R   "daymaxexposure"
R Z "dayexposure":".5",
R   "daymean"
R Z "daybrightness":"50",		R: brightness, daybrightness
R Z "daydelay":"5000",
R   "dayautogain",
R   "daymaxgain"
R   "daygain",
R Z "daybin":"1",
R Z "nightautoexposure":"1",
R Z "nightmaxexposure":"20000",
R   "nightmaxesposure"
R Z "nightexposure":"10000",
R   "nightmean"
R Z "nightbrightness":"50",		R: brightness
R Z "nightdelay":"10",
R Z "nightautogain":"0",
R Z "nightmaxgain":"200",
R Z "nightgain":"50",
R Z gaintransitiontime
R Z "nightbin":"1",
R Z "width":"0",
R Z "height":"0",
R Z "type":"99",
R Z "autowhitebalance":"0",		|| awb
R Z "wbr":"53",
R Z "wbb":"90",
R Z "quality":"95",
R Z "filename":"image.jpg",
R Z "flip":"0",
R Z "showTime":"1",
R Z "timeformat":"%Y%m%d %H:%M:%S",
R Z "temptype":"C",
R Z "showExposure":"1",
R Z "showGain":"1",
R Z "showBrightness":"0",
R Z "text":"",
R Z "extratext":"",
R Z "extratextage":"600",
R Z "textlineheight":"60",
R Z "textx":"15",
R Z "texty":"30",
R Z "fontname":"0",
R Z "fontcolor":"255 255 255",
R Z "smallfontcolor":"0 0 255",
R Z "fonttype":"0",
R Z "fontsize":"7",
R Z "fontline":"1",
R Z "outlinefont":"0",
R Z "notificationimages":"1",
R Z "latitude":"60.7N",
R Z "longitude":"135.05W",
R Z "angle":"-6",
R Z "darkframe":"0",
R Z "locale":"en_US.UTF-8",
R Z "debuglevel":"1",
R Z "alwaysshowadvanced":"0",
R Z "showonmap":"0",
R Z "location":"",
R Z "owner":"",
R Z "websiteurl":"",
R Z "imageurl":"",
R Z "camera":"",
R Z "lens":"",
R Z "computer":""

R "autofocus":"0",
R "rotation":"0",
R "showDetails":"1",
R "background":"0",
R "saturation":"0",
R "showMean",
R "mean-threshold"
R "mean-p0"
R "mean-p1"
R "mean-p2"
EOF
}


####
# Restore the prior settings file(s) if the user wanted to use them.
PRIOR_SETTINGS_RESTORED="false"
restore_prior_settings_files()
{
	[[ ${PRIOR_SETTINGS_RESTORED} == "true" ]] && return
	PRIOR_SETTINGS_RESTORED="true"

	if [[ ${PRIOR_ALLSKY} == "new" ]]; then
		if [[ -f ${PRIOR_SETTINGS_FILE} ]]; then

			# The prior settings file should be a link to a camera-specific file,
			# and there may be more than one camera-specific file if the user has
			# more than one camera.
			# Copy all the camera-specific settings files; don't copy the generic-named
			# file since it will be recreated.

			# Camera-specific settings file names are:
			#	${NAME}_${CAMERA_TYPE}_${CAMERA_MODEL}.${EXT}
			# where ${SETTINGS_FILE_NAME} == ${NAME}.${EXT}
			# We don't know the ${CAMERA_MODEL} yet so use a regular expression.
			local NAME="${SETTINGS_FILE_NAME%.*}"			# before "."
			local EXT="${SETTINGS_FILE_NAME##*.}"			# after "."

			FILES="$(find "${PRIOR_CONFIG_DIR}" -name "${NAME}_"'*'".${EXT}")"
			if [[ -n ${FILES} ]]; then
				RESTORED_PRIOR_SETTINGS_FILE="true"
				FIRST_ONE="true"
				echo "${FILES}" | while read -r F
					do
						if [[ ${FIRST_ONE} == "true" ]]; then
							display_msg progress "Restoring settings files:"
							FIRST_ONE="false"
						fi
						display_msg progress "\t'$(basename "${F}")."
						cp -a "${F}" "${ALLSKY_CONFIG}"
					done
			else
				MSG="No prior camera-specific settings files found,"

				# Try to create one based on ${PRIOR_SETTINGS_FILE}.
				local CT="$(jq -r .cameraType "${PRIOR_SETTINGS_FILE}")"
				if [[ ${CT} != "${CAMERA_TYPE}" ]]; then
					MSG="${MSG}\nand unable to create one: new CAMERA_TYPE (${CAMERA_TYPE} different from prior type (${CT})."
				else
					local CM="$(jq -r .cameraModel "${PRIOR_SETTINGS_FILE}")"
					local SPECIFIC="${NAME}_${CT}_${CM}.${EXT}"
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
			get_lat_long
		fi
	else
		# settings file is old style in ${OLD_RASPAP_DIR}.
		if [[ -n ${PRIOR_SETTINGS_FILE} ]]; then
			# Transfer prior settings to the new file.
			case "${PRIOR_ALLSKY_VERSION}" in
				"v2022.03.01")
					convert_settings "${PRIOR_ALLSKY_VERSION}" "${PRIOR_SETTINGS_FILE}" \
							"${ALLSKY_VERSION}"
					;;

				*)	# This could be one of many old versions of Allsky,
					# so don't try to copy all the settings since there have
					# been many changes, additions, and deletions.

					# As far as I know, latitude and longitude have never changed,
					# and are required and have no default,
					# so try to restore them so Allsky can restart automatically.
					LAT="$(settings .latitude "${PRIOR_SETTINGS_FILE}")"
					LONG="$(settings .longitude "${PRIOR_SETTINGS_FILE}")"
					ANGLE="$(settings .angle "${PRIOR_SETTINGS_FILE}")"
					jq ".latitude=\"${LAT}\" | .longitude=\"${LONG}\" | .angle=\"${ANGLE}\"" \
						"${SETTINGS_FILE}" > /tmp/x && mv /tmp/x "${SETTINGS_FILE}"
					display_msg --log progress "Prior latitude, longitude, and angle restored."

					MSG="You need to manually transfer your old settings to the WebUI.\n"
					MSG="${MSG}\nNote that there have been many changes to the settings file"
					MSG="${MSG} since you last installed Allsky, so it will likely be easiest"
					MSG="${MSG} to re-enter everything via the WebUI's 'Allsky Settings' page."
					whiptail --title "${TITLE}" --msgbox "${MSG}" 18 "${WT_WIDTH}" 3>&1 1>&2 2>&3
					display_msg info "\n${MSG}\n"
					echo -e "\n\n==========\n${MSG}" >> "${POST_INSTALLATION_ACTIONS}"
					;;

			esac
		else
			# This should "never" happen.
			# They have a prior Allsky version but no "settings file?
			get_lat_long

			# If we ever automate migrating settings, this next statement should be deleted.
			FORCE_CREATING_SETTINGS_FILE="true"
		fi
	fi
}

####
# If the user wanted to restore files from a prior version of Allsky, do that.
restore_prior_files()
{
	if [[ -d ${OLD_RASPAP_DIR} ]]; then
		MSG="\nThe '${OLD_RASPAP_DIR}' directory is no longer used.\n"
		MSG="${MSG}When installation is done you may remove it by executing:\n"
		MSG="${MSG}    sudo rm -fr '${OLD_RASPAP_DIR}'\n"
		display_msg info "${MSG}"
		echo -e "\n\n==========\n${MSG}" >> "${POST_INSTALLATION_ACTIONS}"
	fi

	if [[ -z ${PRIOR_ALLSKY} ]]; then
		get_lat_long
		return			# Nothing left to do in this function, so return
	fi

	if [[ -f ${PRIOR_ALLSKY_DIR}/scripts/endOfNight_additionalSteps.sh ]]; then
		display_msg progress "Restoring endOfNight_additionalSteps.sh."
		cp -a "${PRIOR_ALLSKY_DIR}/scripts/endOfNight_additionalSteps.sh" "${ALLSKY_SCRIPTS}"

		MSG="The ${ALLSKY_SCRIPTS}/endOfNight_additionalSteps.sh file will be removed"
		MSG="${MSG}\nin the next version of Allsky.  You appear to be using this file,"
		MSG="${MSG}\nso please move your code to the 'Script' module in"
		MSG="${MSG}\nthe 'Night to Day Transition Flow' of the Module Manager."
		MSG="${MSG}\nSee the 'Explanations --> Module' documentation for more details."
		display_msg info "\n${MSG}\n"
		echo -e "\n\n==========\n${MSG}" >> "${POST_INSTALLATION_ACTIONS}"
	fi

	if [[ -d ${PRIOR_ALLSKY_DIR}/images ]]; then
		display_msg progress "Restoring images."
		mv "${PRIOR_ALLSKY_DIR}/images" "${ALLSKY_HOME}"
	fi

	if [[ -d ${PRIOR_ALLSKY_DIR}/darks ]]; then
		display_msg progress "Restoring darks."
		mv "${PRIOR_ALLSKY_DIR}/darks" "${ALLSKY_HOME}"
	fi

	if [[ -d ${PRIOR_CONFIG_DIR}/modules ]]; then
		display_msg progress "Restoring modules."
		"${ALLSKY_SCRIPTS}"/flowupgrade.py --prior "${PRIOR_CONFIG_DIR}" --config "${ALLSKY_CONFIG}"
	fi

	if [[ -d ${PRIOR_CONFIG_DIR}/overlay ]]; then
		display_msg progress "Restoring overlays."
		cp -ar "${PRIOR_CONFIG_DIR}/overlay" "${ALLSKY_CONFIG}"
	fi

	if [[ ${PRIOR_ALLSKY} == "new" ]]; then
		D="${PRIOR_CONFIG_DIR}"
	else
		# raspap.auth was in a different directory in older versions.
		D="${OLD_RASPAP_DIR}"
	fi
	if [[ -f ${D}/raspap.auth ]]; then
		display_msg progress "Restoring WebUI security settings."
		cp -a "${D}/raspap.auth" "${ALLSKY_CONFIG}"
	fi

	# Restore any REMOTE Allsky Website configuration file.
	if [[ -f ${PRIOR_CONFIG_DIR}/${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_NAME} ]]; then
		display_msg progress "Restoring remote Allsky Website ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_NAME}."
		cp -a "${PRIOR_CONFIG_DIR}/${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_NAME}" "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}"

		# Check if this is an older Allsky Website configuration file type.
		local OLD="false"
		PRIOR_CONFIG_VERSION="$(jq .ConfigVersion "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}")"
		if [[ ${PRIOR_CONFIG_VERSION} == "null" ]]; then
			OLD="true"		# Hmmm, it should have the version
			PRIOR_CONFIG_VERSION="** Unknown **"
		else
			NEW_CONFIG_VERSION="$(jq .ConfigVersion "${REPO_WEBCONFIG_FILE}")"
			if [[ ${PRIOR_CONFIG_VERSION} < "${NEW_CONFIG_VERSION}" ]]; then
				OLD="true"
			fi
		fi
		if [[ ${OLD} == "true" ]]; then
			MSG="Your ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE} is an older version.\n"
			MSG="${MSG}Your    version: ${PRIOR_CONFIG_VERSION}\n"
			MSG="${MSG}Current version: ${NEW_CONFIG_VERSION}\n"
			MSG="${MSG}\nPlease compare it to the new one in ${REPO_WEBCONFIG_FILE}"
			MSG="${MSG} to see what fields have been added, changed, or removed.\n"
			display_msg warning "${MSG}"
			echo -e "\n\n==========\n${MSG}" >> "${POST_INSTALLATION_ACTIONS}"
		fi
	fi
	# We don't check for old LOCAL Allsky Website configuration files.
	# That's done when they install the Allsky Website.

	if [[ -f ${PRIOR_CONFIG_DIR}/uservariables.sh ]]; then
		display_msg progress "Restoring uservariables.sh."
		cp -a "${PRIOR_CONFIG_DIR}/uservariables.sh" "${ALLSKY_CONFIG}"
	fi

	restore_prior_settings_files

	# Do NOT restore options.json - it will be recreated.

	# See if the prior config.sh and ftp-setting.sh are the same version as
	# the new ones; if so, we can copy them to the new version.

	PRIOR_CONFIG_SH_VERSION="$(get_variable "CONFIG_SH_VERSION" "${PRIOR_CONFIG_FILE}")"
	if [[ ${DEBUG} -gt 0 ]]; then
		display_msg debug "CONFIG_SH_VERSION=${CONFIG_SH_VERSION}, PRIOR=${PRIOR_CONFIG_SH_VERSION}"
	fi
	if [[ ${CONFIG_SH_VERSION} == "${PRIOR_CONFIG_SH_VERSION}" ]]; then
		RESTORED_PRIOR_CONFIG_SH="true"
		display_msg progress "Restoring prior 'config.sh' file."
		cp "${PRIOR_CONFIG_FILE}" "${ALLSKY_CONFIG}"
	else
		RESTORED_PRIOR_CONFIG_SH="false"
	fi

	PRIOR_FTP_SH_VERSION=""
	if [[ -f ${PRIOR_FTP_FILE} ]]; then
		# Allsky v2022.03.01 and newer.  v2022.03.01 doesn't ahve FTP_SH_VERSION.
		PRIOR_FTP_SH_VERSION="$(get_variable "FTP_SH_VERSION" "${PRIOR_FTP_FILE}")"
		FTP_SH_VERSION="$(get_variable "FTP_SH_VERSION" "${ALLSKY_CONFIG}/ftp-settings.sh")"
	elif [[ -f ${PRIOR_ALLSKY_DIR}/scripts/ftp-settings.sh ]]; then
		# pre v2022.03.01
		PRIOR_FTP_FILE="${PRIOR_ALLSKY_DIR}/scripts/ftp-settings.sh"
	else
		display_msg error "Unable to find prior ftp-settings.sh"
		PRIOR_FTP_FILE=""
	fi
	if [[ ${DEBUG} -gt 0 ]]; then
		display_msg debug "FTP_SH_VERSION=${FTP_SH_VERSION}, PRIOR=${PRIOR_FTP_SH_VERSION}"
	fi
	if [[ ${FTP_SH_VERSION} == "${PRIOR_FTP_SH_VERSION}" ]]; then
		RESTORED_PRIOR_FTP_SH="true"
		display_msg progress "Restoring prior 'ftp-settings.sh' file."
		cp "${PRIOR_FTP_FILE}" "${ALLSKY_CONFIG}"
	else
		RESTORED_PRIOR_FTP_SH="false"
	fi

	if [[ ${RESTORED_PRIOR_CONFIG_SH} == "true" && ${RESTORED_PRIOR_FTP_SH} == "true" ]]; then
		return 0
	fi

	## TODO: Try to automate this.
	# We know the format of PRIOR_ALLSKY_VERSION == v2022.03.01 and know
	# the format of CONFIG_FTP_VERSION and FTP_SH_VERSION files.

	# display_msg progress "Restoring settings from 'config.sh'."
	# similar for config.sh, but
	#	- don't transfer CAMERA
	#	- handle renames
	#	- handle variable that were moved to WebUI
	#		> DAYTIME_CAPTURE
	#		> others
	#
	# display_msg info "\nIMPORTANT: check 'config.sh' for correctness.\n"
	# RESTORED_PRIOR_CONFIG_SH="true"

	# display_msg progress "Restoring settings from 'ftp-settings.sh'."
	# if [[ -n ${PRIOR_FTP_FILE} ]]; then
	#	( source ${PRIOR_FTP_FILE}
	#		for each variable:
	#			/^variable=/ c;variable="$oldvalue";
	#		Deal with old names from version 0.8
	#	) > /tmp/x
	#	sed -i --file=/tmp/x "${ALLSKY_CONFIG}/ftp-settings.sh"
	#	rm -f /tmp/x
	#	RESTORED_PRIOR_FTP_SH="true"
	#	display_msg info "\nIMPORTANT: check 'ftp-settings.sh' for correctness.\n"
	# fi
	
	if [[ ${PRIOR_ALLSKY} == "new" ]]; then
		# The prior versions are similar to the new ones.
# TODO: We can automate this since we know what changed in each version.
		if [[ ${RESTORED_PRIOR_CONFIG_SH} == "false" ]]; then
			MSG="Your prior 'config.sh' file is similar to the new one."
		elif [[ ${RESTORED_PRIOR_FTP_SH} == "false" ]]; then
			MSG="Your prior 'ftp-settings.sh' file is similar to the new one."
		else
			MSG="Your 'config.sh' and 'ftp-settings.sh' files are similar to the new ones."
		fi
		MSG="${MSG}\nAfter installation, see ${POST_INSTALLATION_ACTIONS} for details."

		MSG2="You can compare the old and new configuration files with the following commands,"
		MSG2="${MSG2}\nand apply your changes from the prior file to the new file."
		MSG2="${MSG2}\nDo NOT simply copy the old files to the new location."
		MSG2="${MSG2}\n\ndiff ${PRIOR_CONFIG_DIR}/config.sh ${ALLSKY_CONFIG}"
		MSG2="${MSG2}\n\n   and"
		MSG2="${MSG2}\n\ndiff ${PRIOR_FTP_FILE} ${ALLSKY_CONFIG}"
	else
		MSG="You need to manually move the contents of:"
		if [[ ${RESTORED_PRIOR_CONFIG_SH} == "false" ]]; then
			MSG="${MSG}\n     ${PRIOR_CONFIG_DIR}/config.sh"
		fi
		if [[ ${RESTORED_PRIOR_FTP_SH} == "false" ]]; then
			MSG="${MSG}\n     ${PRIOR_FTP_FILE}"
		fi
		MSG="${MSG}\n\nto the new files in ${ALLSKY_CONFIG}."
		MSG="${MSG}\n\nNOTE: some settings are no longer in the new files and some changed names."
		MSG="${MSG}\nDo NOT add the old/deleted settings back in."
		MSG2=""
	fi
	MSG="${MSG}"
	whiptail --title "${TITLE}" --msgbox "${MSG}" 18 "${WT_WIDTH}" 3>&1 1>&2 2>&3
	display_msg info "\n${MSG}\n"
	echo -e "\n\n==========\n${MSG}" >> "${POST_INSTALLATION_ACTIONS}"
	[[ -n ${MSG2} ]] && echo -e "\n${MSG2}" >> "${POST_INSTALLATION_ACTIONS}"
}


####
# Update Allsky and exit.  It basically resets things.
# This can be needed if the user hosed something up, or there was a problem somewhere.
do_update()
{
	#shellcheck disable=SC2086,SC1091		# file doesn't exist in GitHub
	source "${ALLSKY_CONFIG}/config.sh" || exit ${ALLSKY_ERROR_STOP}	# Get current CAMERA_TYPE
	if [[ -z ${CAMERA_TYPE} ]]; then
		display_msg error "CAMERA_TYPE not set in config.sh."
		exit 1
	fi

	create_webui_defines

	save_camera_capabilities "false" || exit 1
	set_permissions

	# Update the sudoers file if it's missing some entries.
	# Look for the last entry added (should be the last entry in the file).
	# Don't simply copy the repo file to the final location in case the repo file isn't up to date.
	if ! grep --silent "/date" "${FINAL_SUDOERS_FILE}" ; then
		display_msg progress "Updating sudoers list."
		if ! grep --silent "/date" "${REPO_SUDOERS_FILE}" ; then
			display_msg error "Please get the newest '$(basename "${REPO_SUDOERS_FILE}")' file from Git and try again."
			exit 2
		fi
		do_sudoers
	fi

	exit 0
}


####
# Install the overlay and modules system
install_overlay()
{

	display_msg progress "Installing PHP Modules."
	TMP="${INSTALL_LOGS_DIR}/PHP_modules.log"
	(
		sudo apt-get install -y php-zip && \
		sudo apt-get install -y php-sqlite3 && \
		sudo apt install -y python3-pip
	) > "${TMP}" 2>&1
	check_success $? "PHP module installation failed" "${TMP}" "${DEBUG}" || exit_with_image 1

	display_msg progress "Installing other PHP dependencies."
	TMP="${INSTALL_LOGS_DIR}/libatlas.log"
	sudo apt-get -y install libatlas-base-dev > "${TMP}" 2>&1
	check_success $? "PHP dependencies failed" "${TMP}" "${DEBUG}" || exit_with_image 1

	# Doing all the python dependencies at once can run /tmp out of space, so do one at a time.
	# This also allows us to display progress messages.
	if [[ ${OS} == "buster" ]]; then
		M=" for Buster"
		R="-buster"
	else
		M=""
		R=""
	fi
	MSG2="\n\tThis may take a LONG time if the packages are not already installed."
	display_msg progress "Installing Python dependencies${M}."  "${MSG2}"
	TMP="${INSTALL_LOGS_DIR}/Python_dependencies"
	PIP3_BUILD="${ALLSKY_HOME}/pip3.build"
	mkdir -p "${PIP3_BUILD}"
	COUNT=0
	local NUM=$(wc -l < "${ALLSKY_REPO}/requirements${R}.txt")
	while read -r package
	do
		((COUNT++))
		echo "${package}" > /tmp/package
		L="${TMP}.${COUNT}.log"
		display_msg progress "   === Package # ${COUNT} of ${NUM}: [${package}]"
		pip3 install --no-warn-script-location --build "${PIP3_BUILD}" -r /tmp/package > "${L}" 2>&1
		# These files are too big to display so pass in "0" instead of ${DEBUG}.
		if ! check_success $? "Python dependency [${package}] failed" "${L}" 0 ; then
			rm -fr "${PIP3_BUILD}"
			exit_with_image 1
		fi
	done < "${ALLSKY_REPO}/requirements${R}.txt"
	rm -fr "${PIP3_BUILD}"

	display_msg progress "Installing Trutype fonts."
	TMP="${INSTALL_LOGS_DIR}/msttcorefonts.log"
	sudo apt-get -y install msttcorefonts > "${TMP}" 2>&1
	check_success $? "Trutype fonts failed" "${TMP}" "${DEBUG}" || exit_with_image 1

	display_msg progress "Setting up modules and overlays."

	cp -ar "${ALLSKY_REPO}/overlay" "${ALLSKY_CONFIG}"
	cp -ar "${ALLSKY_REPO}/modules" "${ALLSKY_CONFIG}"

	cp "${ALLSKY_OVERLAY}/config/overlay-${CAMERA_TYPE}.json" "${ALLSKY_OVERLAY}/config/overlay.json"

	MODULE_LOCATION="/opt/allsky"
	sudo mkdir -p "${MODULE_LOCATION}/modules"

	# TODO: Remove in next release. Temporary fix to move modules and deal with pistatus and gps that have moved to core allsky
	if [[ -d /etc/allsky/modules ]]; then
		sudo cp -a /etc/allsky/modules "${MODULE_LOCATION}"
		sudo rm -rf /etc/allsky
	fi

	if [[ -f "/opt/allsky/modules/allsky_pistatus.py" ]]; then
    	sudo rm "/opt/allsky/modules/allsky_pistatus.py"
	fi
	if [[ -f "/opt/allsky/modules/allsky_script.py" ]]; then
    	sudo rm "/opt/allsky/modules/allsky_script.py"
	fi	
	#TODO: End

	sudo chown -R "${ALLSKY_OWNER}:${WEBSERVER_GROUP}" "${MODULE_LOCATION}"
	sudo chmod -R 774 "${MODULE_LOCATION}"			
}


####
check_if_buster()
{
	if [[ ${OS} == "buster" ]]; then
		MSG="This release runs best on the newer Bullseye operating system"
		MSG="${MSG} that was released in November, 2021."
		MSG="${MSG}\nYou are running the older Buster operating system and we"
		MSG="${MSG} recommend doing a fresh install of Bullseye on a clean SD card."
		MSG="${MSG}\n\nDo you want to continue anyhow?"
		if ! whiptail --title "${TITLE}" --yesno "${MSG}" 18 "${WT_WIDTH}" 3>&1 1>&2 2>&3; then
			exit 0
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
		cat "${POST_INSTALLATION_ACTIONS}" >> "${ALLSKY_LOG}"
		WEBUI_MESSAGE="Actions needed.  See ${ALLSKY_LOG}."
		"${ALLSKY_SCRIPTS}/addMessage.sh" "Warning" "${WEBUI_MESSAGE}"
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
	display_image "InstallationFailed"
	#shellcheck disable=SC2086
	exit ${1}
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
		MSG="${MSG}\n\nHowever, you must update them by going to the 'Editor' page in the WebUI after rebooting."
		whiptail --title "${TITLE}" --msgbox "${MSG}" 12 "${WT_WIDTH}" 3>&1 1>&2 2>&3
	fi

	display_image "ConfigurationNeeded"
}


####
remind_old_version()
{
	if [[ -n ${PRIOR_ALLSKY} ]]; then
		MSG="When you are sure everything is working with the new Allsky release,"
		MSG="${MSG} remove your old version in ${PRIOR_ALLSKY_DIR} to save disk space."
		whiptail --title "${TITLE}" --msgbox "${MSG}" 12 "${WT_WIDTH}" 3>&1 1>&2 2>&3
		echo -e "\n\n==========\n${MSG}" >> "${POST_INSTALLATION_ACTIONS}"
	fi
}



####################### main part of program

##### Log files write to ${ALLSKY_CONFIG}, which doesn't exist yet, so create it.
mkdir -p "${ALLSKY_CONFIG}"
rm -fr "${INSTALL_LOGS_DIR}"			# shouldn't be there, but just in case
mkdir "${INSTALL_LOGS_DIR}"

OS="$(grep CODENAME /etc/os-release | cut -d= -f2)"	# usually buster or bullseye

##### Check arguments
OK="true"
HELP="false"
DEBUG=0
DEBUG_ARG=""
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
			;;
		--update)
			UPDATE="true"
			;;
		--function)
			FUNCTION="${2}"
			shift
			;;
		--testing)
			TESTING="true"			# developer testing - skip many steps 
TESTING="${TESTING}" # TODO: keeps shellcheck quiet
			;;
		*)
			display_msg error "Unknown argument: '${ARG}'."
			OK="false"
			;;
	esac
	shift
done
[[ ${HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" ]] && usage_and_exit 1

##### Calculate whiptail sizes
calc_wt_size

##### Does a prior Allsky exist? If so, set PRIOR_ALLSKY
does_prior_Allsky_exist

##### Display the welcome header
[[ -z ${FUNCTION} ]] && do_initial_heading

##### Stop Allsky
stop_allsky

##### Get branch
get_this_branch

##### Handle updates
[[ ${UPDATE} == "true" ]] && do_update		# does not return

##### See if there's an old WebUI
does_old_WebUI_location_exist

##### Executes the specified function, if any, and exits.
[[ -n ${FUNCTION} ]] && do_function "${FUNCTION}"

##### Display an image in the WebUI
display_image "InstallationInProgress"

# Do as much of the prompting up front, then do the long-running work, then prompt at the end.

##### Prompt to use prior Allsky
prompt_for_prior_Allsky

##### Get locale (prompt if needed).  May not return.
get_locale

##### Determine the camera type
select_camera_type

##### Get the new host name
prompt_for_hostname

##### Check for sufficient swap space
check_swap

##### Optionally make ${ALLSKY_TMP} a memory filesystem
check_tmp


MSG="\nThe following steps can take about an HOUR depending on the speed of your Pi"
MSG="${MSG}\nand how many of the necessary dependencies are already installed."
display_msg info "${MSG}"

MSG="${MSG}\nYou will see progress messages throughout the process."
MSG="${MSG}\nAt the end you will be prompted again for additional steps.\n"
whiptail --title "${TITLE}" --msgbox "${MSG}" 12 "${WT_WIDTH}" 3>&1 1>&2 2>&3


##### Install web server
# This must come BEFORE save_camera_capabilities, since it installs php.
install_webserver

##### Install dependencies, then compile and install Allsky software
install_dependencies_etc || exit_with_image 1

##### Update config.sh
# This must come BEFORE save_camera_capabilities, since it uses the camera type.
update_config_sh

##### Create the file that defines the WebUI variables.
create_webui_defines

##### Create the camera type-model-specific "options" file
# This should come after the steps above that create ${ALLSKY_CONFIG}.
save_camera_capabilities "false" || exit_with_image 1			# prompts on error only

# Code later needs "settings()" function.
#shellcheck disable=SC2086,SC1091		# file doesn't exist in GitHub
source "${ALLSKY_CONFIG}/config.sh" || exit_with_image ${ALLSKY_ERROR_STOP}

##### Set locale
set_locale

##### Create the Allsky log files
create_allsky_logs

##### install the overlay and modules system
install_overlay

##### Check for, and handle any prior Allsky Website
handle_prior_website

##### Restore prior files if needed
restore_prior_files									# prompts if prior Allsky exists

##### Set permissions.  Want this at the end so we make sure we get all files.
set_permissions

##### Check if there's an old WebUI and let the user know it's no longer used.
check_old_WebUI_location							# prompt if prior old-style WebUI

##### See if we should reboot when installation is done.
ask_reboot "full"											# prompts

##### Display any necessary messaged about restored / not restored settings
check_restored_settings

##### If needed, remind the user to remove any old Allsky version
remind_old_version


######## All done

[[ ${WILL_REBOOT} == "true" ]] && do_reboot	# does not return

exit 0
