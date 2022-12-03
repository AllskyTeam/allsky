#!/bin/bash

if [ -z "${ALLSKY_HOME}" ]
then
	export ALLSKY_HOME="$(realpath $(dirname "${BASH_ARGV0}"))"
fi
ME="$(basename "${BASH_ARGV0}")"

# shellcheck disable=SC1090,SC1091
source "${ALLSKY_HOME}/variables.sh" || exit 1
# shellcheck disable=SC1090,SC1091
source "${ALLSKY_SCRIPTS}/functions.sh" || exit 1

if [[ ${EUID} -eq 0 ]]; then
	display_msg error "This script must NOT be run as root, do NOT use 'sudo'."
   exit 1
fi

# This script assumes the user already did the "git clone" into the "allsky" directory.
INSTALL_DIR="allsky"
cd ~/${INSTALL_DIR}  || exit 1

# Location of possible prior version of Allsky.
# If the user wants items copied from there to the new version,
# they should have manually renamed "allsky" to "allsky-OLD" prior to running this script.
PRIOR_INSTALL_DIR="$(dirname ${PWD})/${INSTALL_DIR}-OLD"

OLD_WEBUI_LOCATION="/var/www/html"		# location of old-style WebUI

TITLE="Allsky Installer"
ALLSKY_OWNER=$(id --group --name)
ALLSKY_GROUP=${ALLSKY_OWNER}
WEBSERVER_GROUP="www-data"
ALLSKY_VERSION="$( < "${ALLSKY_HOME}/version" )"
FINAL_SUDOERS_FILE="/etc/sudoers.d/allsky"
OLD_RASPAP_DIR="/etc/raspap"			# used to contain WebUI configuration files
FORCE_CREATING_SETTINGS_FILE=false		# should a default settings file be created?
RESTORED_PRIOR_SETTINGS_FILE=false
PRIOR_ALLSKY=""							# Set to "new" or "old" if they have a prior version
NEW_HOST_NAME='allsky'					# Suggested new host name

# Repo files
REPO_SUDOERS_FILE="${ALLSKY_REPO}/sudoers.repo"
REPO_WEBUI_DEFINES_FILE="${ALLSKY_REPO}/allskyDefines.inc.repo"
REPO_LIGHTTPD_FILE="${ALLSKY_REPO}/lighttpd.conf.repo"
REPO_AVI_FILE="${ALLSKY_REPO}/avahi-daemon.conf.repo"
REPO_WEBCONFIG_FILE="${ALLSKY_REPO}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}.repo"

# This file contains information the user needs to act upon after the reboot.
NEW_INSTALLATION_FILE="${ALLSKY_CONFIG}/installation_info.txt"
rm -f "${NEW_INSTALLATION_FILE}"
# display_msg() will send "log" entries to this file.
# DISPLAY_MSG_LOG is used in display_msg()
# shellcheck disable=SC2034
DISPLAY_MSG_LOG="${ALLSKY_CONFIG}/installation_log.txt"
rm -f "${DISPLAY_MSG_LOG}"

# Some versions of Linux default to 750 so web server can't read it
chmod 755 "${ALLSKY_HOME}"


####################### functions

# Display a header surrounded by stars.
display_header() {
	HEADER="${1}"
	((LEN=${#HEADER} + 8))		# 8 for leading and trailing "*** "
	STARS=""
	while [[ ${LEN} -gt 0 ]]; do
		STARS="${STARS}*"
		((LEN--))
	done
	echo
	echo "${STARS}"
	echo -e "*** ${HEADER} ***"
	echo "${STARS}"
	echo
}


usage_and_exit()
{
	RET=${1}
	if [ ${RET} -eq 0 ]; then
		C="${YELLOW}"
	else
		C="${RED}"
	fi
	echo
	echo -e "${C}Usage: ${ME} [--help] [--debug] [--update] [--function function]${NC}"
	echo
	echo "'--help' displays this message and exits."
	echo
	echo "'--update' should only be used when instructed to by an Allsky Website page."
	echo
	echo "'--function' executs the specified function and quits."
	echo
	exit ${RET}
}

calc_wt_size() {
	WT_WIDTH=$(tput cols)
	[ "${WT_WIDTH}" -gt 80 ] && WT_WIDTH=80
}


# Stop Allsky.  If it's not running, nothing happens.
stop_allsky() {
	sudo systemctl stop allsky 2> /dev/null
}


# Prompt the user to select their camera type, if we can't determine it automatically.
# If they have a prior installation of Allsky that uses CAMERA_TYPE in config.sh,
# we can use its value and not prompt.
CAMERA_TYPE=""
select_camera_type() {
	if [[ ${PRIOR_ALLSKY} == "new" ]]; then
		# New style Allsky with CAMERA_TYPE in config.sh
		OLD_CONFIG="${PRIOR_INSTALL_DIR}/config/config.sh"
		if [ -f "${OLD_CONFIG}" ]; then
			# We can't "source" the config file because the new settings file doesn't exist,
			# so the "source" will fail.
			CAMERA_TYPE="$(grep "^CAMERA_TYPE=" "${OLD_CONFIG}" | sed -e "s/CAMERA_TYPE=//" -e 's/"//g')"
			[[ ${CAMERA_TYPE} != "" ]] && return
		fi
	fi
	# If they have the "old" style Allsky, don't bother trying to map the old $CAMERA
	# to the new $CAMERA_TYPE.

	# "2" is the number of menu items.
	MSG="\nSelect your camera type:\n"
	CAMERA_TYPE=$(whiptail --title "${TITLE}" --menu "${MSG}" 15 ${WT_WIDTH} 2 \
		"ZWO"  "   ZWO ASI" \
		"RPi"  "   Raspberry Pi HQ and compatible" \
		3>&1 1>&2 2>&3)
	if [ $? -ne 0 ]; then
		display_msg warning "Camera selection required.  Please re-run the installation and select a camera to continue."
		exit 1
	fi
	display_msg --log progress "Using ${CAMERA_TYPE} camera."
}


# Create the file that defines the WebUI variables.
create_webui_defines() {
	display_msg progress "Modifying locations for WebUI."
	FILE="${ALLSKY_WEBUI}/includes/allskyDefines.inc"
	sed		-e "s;XX_ALLSKY_HOME_XX;${ALLSKY_HOME};" \
			-e "s;XX_ALLSKY_CONFIG_XX;${ALLSKY_CONFIG};" \
			-e "s;XX_ALLSKY_SCRIPTS_XX;${ALLSKY_SCRIPTS};" \
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
		"${REPO_WEBUI_DEFINES_FILE}"  >  "${FILE}"
		chmod 644 "${FILE}"
}


# Recreate the options file.
# This can be used after installation if the options file get hosed.
recreate_options_file() {
	CAMERA_TYPE="$(grep "^CAMERA_TYPE=" "${ALLSKY_CONFIG}/config.sh" | sed -e "s/CAMERA_TYPE=//" -e 's/"//g')"
	save_camera_capabilities "true"
}

# Save the camera capabilities and use them to set the WebUI min, max, and defaults.
# This will error out and exit if no camera installed,
# otherwise it will determine what capabilities the connected camera has,
# then create an "options" file specific to that camera.
# It will also create a default "settings" file.
save_camera_capabilities() {
	if [[ -z ${CAMERA_TYPE} ]]; then
		display_msg error "INTERNAL ERROR: CAMERA_TYPE not set in save_camera_capabilities()."
		return 1
	fi

	OPTIONSFILEONLY="${1}"

	# The web server needs to be able to create and update file in ${ALLSKY_CONFIG}
	chmod 775 "${ALLSKY_CONFIG}"
	chmod 664 "${ALLSKY_CONFIG}"/*
	sudo chgrp -R ${WEBSERVER_GROUP} "${ALLSKY_CONFIG}"
	chmod 755 "${ALLSKY_WEBUI}/includes/createAllskyOptions.php"	# executable .php file

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
	"${ALLSKY_SCRIPTS}/makeChanges.sh" ${FORCE} ${OPTIONSONLY} --cameraTypeOnly ${DEBUG_ARG} \
		"cameraType" "Camera Type" "${CAMERA_TYPE}"
	RET=$?
	if [ ${RET} -ne 0 ]; then
		if [ ${RET} -eq ${EXIT_NO_CAMERA} ]; then
			MSG="No camera was found; one must be connected and working for the installation to succeed.\n"
			MSG="$MSG}After connecting your camera, run '${ME} --update'."
			whiptail --title "${TITLE}" --msgbox "${MSG}" 12 ${WT_WIDTH} 3>&1 1>&2 2>&3
			display_msg --log error "No camera detected - installation aborted."
		elif [[ ${OPTIONSFILEONLY} == "false" ]]; then
			display_msg --log error "Unable to save camera capabilities."
		fi
		return 1
	fi

	return 0
}



# Update the sudoers file so the web server can execute certain commands with sudo.
do_sudoers()
{
	display_msg progress "Creating/updating sudoers file."
	sed -e "s;XX_ALLSKY_SCRIPTS_XX;${ALLSKY_SCRIPTS};" "${REPO_SUDOERS_FILE}"  >  /tmp/x
	sudo install -m 0644 /tmp/x "${FINAL_SUDOERS_FILE}" && rm -f /tmp/x
}

# Ask the user if they want to reboot
ask_reboot() {
	AT="     http://${NEW_HOST_NAME}.local\n"
	AT="${AT}or\n"
	AT="${AT}     http://$(hostname -I | sed -e 's/ .*$//')"
	MSG="*** The Allsky Software is now installed. ***"
	MSG="${MSG}\n\nYou must reboot the Raspberry Pi to finish the installation."
	MSG="${MSG}\n\nAfter reboot you can connect to the WebUI at:\n"
	MSG="${MSG}${AT}"
	MSG="${MSG}\n\nReboot now?"
	if whiptail --title "${TITLE}" --yesno "${MSG}" 18 ${WT_WIDTH} 3>&1 1>&2 2>&3; then 
		sudo reboot now
	else
		display_msg notice "You need to reboot the Pi before Allsky will work."
		MSG="If you have not already rebooted your Pi, please do so now.\n"
		MSG="You can connect to the WebUI at:\n"
		MSG="${MSG}${AT}"
		echo -e "\n\n==========\n${MSG}" >> "${NEW_INSTALLATION_FILE}"
	fi
}


# Check for size of RAM+swap during installation (Issue # 969).
recheck_swap() {
	check_swap "prompt"
}
check_swap() {
	if [[ ${1} == "prompt" ]]; then
		PROMPT="true"
	else
		PROMPT="false"
	fi

	# Note: This doesn't produce exact results.  On a 4 GB Pi, it returns 3.74805.
	RAM_SIZE=$(free --mebi | awk '{if ($1 == "Mem:") {print $2; exit 0} }')		# in MB
# TODO: are these the best numbers ??
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
		[[ ${FUNCTION} == "" ]] && sleep 2		# time to read prior messages
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

		SWAP_SIZE=$(whiptail --title "${TITLE}" --inputbox "${MSG}" 18 ${WT_WIDTH} \
			"${SUGGESTED_SWAP_SIZE}" 3>&1 1>&2 2>&3)
		if [[ ${SWAP_SIZE} == "" || ${SWAP_SIZE} == "0" ]]; then
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
		display_msg --log info "Size of current swap (${CURRENT_SWAP} MB) is sufficient."
	fi
}


# Check if prior ${ALLSKY_TMP} was a memory filesystem.
# If not, offer to make it one.
check_memory_filesystem() {
	# Check if currently a memory filesystem.
	if grep --quiet "^tmpfs ${ALLSKY_TMP} tmpfs" /etc/fstab; then
		display_msg --log info "${ALLSKY_TMP} is currently in memory."
		# /etc/fstab has ${ALLSKY_TMP} but the mount point is currently in the PRIOR Allsky.
		# Try to unmount it, but that often gives an error that it's busy.
		# It'll be unmounted at the reboot.
		# But make sure the new directory exists.
		sudo umount "${PRIOR_INSTALL_DIR}/tmp"
		mkdir -p "${ALLSKY_TMP}"
		sudo mount -a
		return 0
	fi

	sleep 2		# time to read prior messages
	SIZE=50
	MSG="Making ${ALLSKY_TMP} reside in memory can drastically decrease the amount of writes to the SD card, increasing its life."
	MSG="${MSG}\n\nDo you want to make it reside in memory?"
	MSG="${MSG}\n\nNote: anything in it will be deleted whenever the Pi is rebooted, but that's not an issue since the directory only contains temporary files."
	if whiptail --title "${TITLE}" --yesno "${MSG}" 15 ${WT_WIDTH}  3>&1 1>&2 2>&3; then 
		echo "tmpfs ${ALLSKY_TMP} tmpfs size=${SIZE}M,noatime,lazytime,nodev,nosuid,mode=775,uid=${ALLSKY_OWNER},gid=${WEBSERVER_GROUP}" | sudo tee -a /etc/fstab > /dev/null
		if [[ -d ${ALLSKY_TMP} ]]; then
			rm -f "${ALLSKY_TMP}"/*
		else
			mkdir "${ALLSKY_TMP}"
		fi
		sudo mount -a
		display_msg --log progress "${ALLSKY_TMP} is now in memory."
	else
		display_msg --log info "${ALLSKY_TMP} will remain on disk."
		mkdir -p "${ALLSKY_TMP}"
		chmod 775 "${ALLSKY_TMP}"
		sudo chown ${ALLSKY_OWNER}:${WEBSERVER_GROUP} "${ALLSKY_TMP}"
	fi
}

# Install the web server.
install_webserver() {
	MSG="The next step can take a minute."
	MSG="${MSG}\nOutput will only be displayed if there was a problem."
	whiptail --title "${TITLE}" --msgbox "${MSG}" 10 ${WT_WIDTH} 3>&1 1>&2 2>&3

	display_msg progress "Installing the lighttpd web server.  This may take a few seconds..."
	sudo systemctl stop hostapd 2> /dev/null
	sudo systemctl stop lighttpd 2> /dev/null
	TMP="/tmp/lighttpd.install.tmp"
	(sudo apt-get update && sudo apt-get install -y lighttpd php-cgi php-gd hostapd dnsmasq avahi-daemon) > ${TMP} 2>&1
	if [ $? -ne 0 ]; then
		display_msg error "lighttpd installation failed:"
		cat ${TMP}
		exit 1
	fi
	[[ ${DEBUG} == "true" ]] && cat ${TMP}

	FINAL_LIGHTTPD_FILE="/etc/lighttpd/lighttpd.conf"
	sed \
		-e "s;XX_ALLSKY_WEBUI_XX;${ALLSKY_WEBUI};g" \
		-e "s;XX_ALLSKY_HOME_XX;${ALLSKY_HOME};g" \
		-e "s;XX_ALLSKY_IMAGES_XX;${ALLSKY_IMAGES};g" \
		-e "s;XX_ALLSKY_WEBSITE_XX;${ALLSKY_WEBSITE};g" \
		-e "s;XX_ALLSKY_DOCUMENTATION_XX;${ALLSKY_DOCUMENTATION};g" \
			"${REPO_LIGHTTPD_FILE}"  >  /tmp/x
	sudo install -m 0644 /tmp/x "${FINAL_LIGHTTPD_FILE}" && rm -f /tmp/x

	sudo lighty-enable-mod fastcgi-php > /dev/null 2>&1
	sudo rm -fr /var/log/lighttpd/*		# Start off with a clean log file.
	sudo systemctl start lighttpd
}

# Prompt for a new hostname if needed
prompt_for_hostname() {
	# If the Pi is already called ${NEW_HOST_NAME},
	# then the user already updated the name, so don't prompt again.

	CURRENT_HOSTNAME=$(tr -d " \t\n\r" < /etc/hostname)
	[ "${CURRENT_HOSTNAME}" == "${NEW_HOST_NAME}" ] && return

	MSG="Please enter a hostname for your Pi."
	NEW_HOST_NAME=$(whiptail --title "${TITLE}" --inputbox "${MSG}" 10 ${WT_WIDTH} \
		"${NEW_HOST_NAME}" 3>&1 1>&2 2>&3)

	if [ "${CURRENT_HOSTNAME}" != "${NEW_HOST_NAME}" ]; then
		echo "${NEW_HOST_NAME}" | sudo tee /etc/hostname > /dev/null
		sudo sed -i "s/127.0.1.1.*${CURRENT_HOSTNAME}/127.0.1.1\t${NEW_HOST_NAME}/" /etc/hosts
	fi
}

# Set up the avahi daemon if needed
do_avahi() {
	FINAL_AVI_FILE="/etc/avahi/avahi-daemon.conf"
	[ -f "${FINAL_AVI_FILE}" ] && grep -i --quiet "host-name=${NEW_HOST_NAME}" "${FINAL_AVI_FILE}"
	if [ $? -ne 0 ]; then
		# New NEW_HOST_NAME not found in file, or file doesn't exist,
		# so need to configure file.
		display_msg progress "Configuring avahi-daemon."

		sed "s/XX_HOST_NAME_XX/${NEW_HOST_NAME}/g" "${REPO_AVI_FILE}" > /tmp/x
		sudo install -m 0644 /tmp/x "${FINAL_AVI_FILE}" && rm -f /tmp/x
	fi
}

# Set permissions on various web-related items.
set_permissions() {
	# Make sure the currently running user has can write to the webserver root
	# and can run sudo on anything.
	G="$(groups "${ALLSKY_OWNER}")"
	if ! echo "${G}" | grep --silent " sudo"; then
		display_msg progress "Adding ${ALLSKY_OWNER} to sudo group."
		### TODO:  Hmmm.  We need to run "sudo" to add to the group,
		### but we don't have "sudo" permissions yet...
		### sudo addgroup "${ALLSKY_OWNER}" "sudo"
	fi
	if ! echo "${G}" | grep --silent " ${WEBSERVER_GROUP}"; then
		display_msg progress "Adding ${ALLSKY_OWNER} to ${WEBSERVER_GROUP} group."
		sudo addgroup "${ALLSKY_OWNER}" "${WEBSERVER_GROUP}"
	fi

	display_msg progress "Adding permissions for the webserver."
	# Remove any old entries; we now use /etc/sudoers.d/allsky instead of /etc/sudoers.
	sudo sed -i -e "/allsky/d" -e "/${WEBSERVER_GROUP}/d" /etc/sudoers
	do_sudoers

	display_msg progress "Setting permissions for WebUI."
	# The files should already be the correct permissions/owners, but just in case, set them.
	# We don't know what permissions may have been on the old website, so use "sudo".
	sudo find "${ALLSKY_WEBUI}/" -type f -exec chmod 644 {} \;
	sudo find "${ALLSKY_WEBUI}/" -type d -exec chmod 755 {} \;
}

# Check if there's a WebUI in the old-style location,
# or if the directory exists but there doesn't appear to be a WebUI in it.
check_old_WebUI_location() {
	[[ ! -d ${OLD_WEBUI_LOCATION} ]] && return

	if [[ ! -d ${OLD_WEBUI_LOCATION}/includes ]]; then
		MSG="The old WebUI location '${OLD_WEBUI_LOCATION}' exists but it doesn't contain a valid WebUI."
		MSG="${MSG}\nPlease check it out after installation."
		whiptail --title "${TITLE}" --msgbox "${MSG}" 15 ${WT_WIDTH}   3>&1 1>&2 2>&3
		display_msg notice "${MSG}"
		echo -e "\n\n==========\n${MSG}" >> "${NEW_INSTALLATION_FILE}"
		return
	fi

	MSG="An old version of the WebUI was found in ${OLD_WEBUI_LOCATION}; it is no longer being used so you may remove it after intallation."
	MSG="${MSG}\n\nWARNING: if you have any other web sites in that directory, they will no longer be accessible via the web server."
	whiptail --title "${TITLE}" --msgbox "${MSG}" 15 ${WT_WIDTH}   3>&1 1>&2 2>&3
	display_msg notice "${MSG}"
	echo -e "\n\n==========\n${MSG}" >> "${NEW_INSTALLATION_FILE}"
}

handle_prior_website() {
	OLD_WEBSITE="${OLD_WEBUI_LOCATION}/allsky"
	if [ -d "${OLD_WEBSITE}" ]; then
		ALLSKY_WEBSITE_OLD="${OLD_WEBSITE}"
	elif [ -d "${PRIOR_INSTALL_DIR}/html/allsky" ]; then
		ALLSKY_WEBSITE_OLD="${PRIOR_INSTALL_DIR}/html/allsky"
	else
		check_old_WebUI_location
		return
	fi

	# Move any prior ALLSKY_WEBSITE to the new location.
	# This HAS to be done since the lighttpd server only looks in the new location.
	# Note: This MUST come before the old WebUI check below so we don't remove the prior website
	# when we remove the prior WebUI.

	OK=true
	if [ -d "${ALLSKY_WEBSITE}" ]; then
		# Hmmm.  There's an old webite AND a new one.
		# Allsky doesn't ship with the website directory, so not sure how one got there...
		# Try to remove the new one - if it's not empty the remove will fail.
		rmdir "${ALLSKY_WEBSITE}" 
		if [ $? -ne 0 ]; then
			display_msg error "New website in '${ALLSKY_WEBSITE}' is not empty."
			display_msg info "  Move the contents manually from '${ALLSKY_WEBSITE_OLD}',"
			display_msg info "  and then remove the old location.\n"
			OK=false

			# Move failed, but still check if prior website is outdated.
			PRIOR_SITE="${ALLSKY_WEBSITE_OLD}"
		fi
	fi
	if [[ ${OK} = "true" ]]; then
		display_msg progress "Moving prior Allsky Website from ${ALLSKY_WEBSITE_OLD} to new location."
		sudo mv "${ALLSKY_WEBSITE_OLD}" "${ALLSKY_WEBSITE}"
		PRIOR_SITE="${ALLSKY_WEBSITE}"
	fi

	# Check if the prior website is outdated.
	VERSION_FILE="${PRIOR_SITE}/version"
	if [ -f "${VERSION_FILE}" ]; then
		OLD_VERSION=$( < "${VERSION_FILE}" )
	else
		OLD_VERSION="** Unknown, but old **"
	fi
	NEW_VERSION="$(curl --show-error --silent "${GITHUB_RAW_ROOT}/allsky-website/master/version")"
	RET=$?
	if [[ ${RET} -eq 0 && ${OLD_VERSION} < "${NEW_VERSION}" ]]; then
		MSG="There is a newer Allsky Website available; please upgrade to it.\n"
		MSG="${MSG}Your    version: ${OLD_VERSION}\n"
		MSG="${MSG}Current version: ${NEW_VERSION}\n"
		MSG="${MSG}\nYou can upgrade the Allky Website by executing:\n"
		MSG="${MSG}     cd ~/allsky; website/install.sh"
		display_msg notice "${MSG}"
		echo -e "\n\n==========\n${MSG}" >> "${NEW_INSTALLATION_FILE}"
	fi

	check_old_WebUI_location
}


# If the locale isn't already set, set it if possible
set_locale() {
	LOCALE="$(settings .locale)"
	[[ -n ${LOCALE} ]] && return		# already set up

	display_msg progress "Setting locale."
	LOCALE="$(locale | grep LC_NUMERIC | sed -e 's;LC_NUMERIC=";;' -e 's;";;')"
	if [[ -z ${LOCALE} ]]; then
		MSG="Unable to determine your locale.\nRun the 'locale' command and then update the WebUI."
		display_msg warning "${MSG}"
		echo -e "\n\n==========\n${MSG}" >> "${NEW_INSTALLATION_FILE}"
	else
		jq ".locale = \"${LOCALE}\"" "${SETTINGS_FILE}" > /tmp/x && mv /tmp/x "${SETTINGS_FILE}"
	fi
}


# If there's a prior version of the software,
# ask the user if they want to move stuff from there to the new directory.
# Look for a directory inside the old one to make sure it's really an old allsky.
check_if_prior_Allsky() {
	if [ -d "${PRIOR_INSTALL_DIR}/src" ]; then
		MSG="You appear to have a prior version of Allsky in ${PRIOR_INSTALL_DIR}."
		MSG="${MSG}\n\nDo you want to restore the prior images, darks, and certain settings?"
		if whiptail --title "${TITLE}" --yesno "${MSG}" 15 ${WT_WIDTH}  3>&1 1>&2 2>&3; then 
			if [ -f  "${PRIOR_INSTALL_DIR}/version" ]; then
				PRIOR_ALLSKY="new"		# New style Allsky with CAMERA_TYPE set in config.sh
			else
				PRIOR_ALLSKY="old"		# Old style with CAMERA set in config.sh
			fi
		else
			MSG="If you want your old images, darks, settings, etc."
			MSG="${MSG} from the prior verion of Allsky, you'll need to manually move them to the new version."
			whiptail --title "${TITLE}" --msgbox "${MSG}" 12 ${WT_WIDTH} 3>&1 1>&2 2>&3
			display_msg --log info "Will NOT restore from prior version of Allsky."
		fi
	else
		MSG="No prior version of Allsky found."
		MSG="${MSG}\n\nIf you DO have a prior version and you want images, darks, and certain settings moved from the prior version to the new one, rename the prior version to ${PRIOR_INSTALL_DIR} before running this installation."
		MSG="${MSG}\n\nDo you want to continue?"
		if ! whiptail --title "${TITLE}" --yesno "${MSG}" 15 ${WT_WIDTH} 3>&1 1>&2 2>&3; then 
			display_msg info "* Rename the directory with your prior version of Allsky to\n'${PRIOR_INSTALL_DIR}', then run the installation again.\n"
			exit 0
		fi

		# No prior Allsky so force creating a settings file.
		FORCE_CREATING_SETTINGS_FILE=true
	fi
}


install_dependencies_etc() {
	# These commands produce a TON of output that's not needed unless there's a problem.
	# They also take a little while, so hide the output and let the user know.
	MSG="The next few steps can take a couple minutes."
	MSG="${MSG}\n\nOutput will only be displayed if there was a problem."
	whiptail --title "${TITLE}" --msgbox "${MSG}" 10 ${WT_WIDTH} 3>&1 1>&2 2>&3

	display_msg progress "Installing dependencies.  May take a while..."
	TMP="/tmp/deps.install.tmp"
	#shellcheck disable=SC2024
	sudo make deps > ${TMP} 2>&1
	if [ $? -ne 0 ]; then
		display_msg error "Installing dependencies failed:"
		cat ${TMP}
		return 1
	fi
	[[ ${DEBUG} == "true" ]] && cat ${TMP}

	display_msg progress "Preparing Allsky commands.  May take a couple minutes."
	TMP="/tmp/all.install.tmp"
	#shellcheck disable=SC2024
	make all > ${TMP} 2>&1
	if [ $? -ne 0 ]; then
		display_msg error "Compile failed:"
		cat ${TMP}
		return 1
	fi
	[[ ${DEBUG} == "true" ]] && cat ${TMP}

	TMP="/tmp/install.install.tmp"
	#shellcheck disable=SC2024
	sudo make install > ${TMP} 2>&1
	if [ $? -ne 0 ]; then
		display_msg error "Install failed:"
		cat ${TMP}
		return 1
	fi
	[[ ${DEBUG} == "true" ]] && cat ${TMP}

	return 0
}

# Update config.sh
update_config_sh() {
	sed -i \
		-e "s;XX_ALLSKY_VERSION_XX;${ALLSKY_VERSION};g" \
		-e "s/^CAMERA_TYPE=.*$/CAMERA_TYPE=\"${CAMERA_TYPE}\"/" \
		"${ALLSKY_CONFIG}/config.sh"
}

# Create the log file and make it readable/writable by the user; this aids in debugging.
create_allsky_log() {
	display_msg progress "Set permissions on Allsky log (${ALLSKY_LOG})."
	sudo truncate -s 0 "${ALLSKY_LOG}"
	sudo chmod 664 "${ALLSKY_LOG}"
	sudo chgrp ${ALLSKY_GROUP} "${ALLSKY_LOG}"
}


# If the user wanted to restore files from a prior version of Allsky, do that.
restore_prior_files() {
	if [[ -z ${PRIOR_ALLSKY} ]]; then
		return			# Nothing left to do in this function, so return
	fi

	if [ -f "${PRIOR_INSTALL_DIR}/scripts/endOfNight_additionalSteps.sh" ]; then
		display_msg progress "Restoring endOfNight_additionalSteps.sh."
		mv "${PRIOR_INSTALL_DIR}/scripts/endOfNight_additionalSteps.sh" "${ALLSKY_SCRIPTS}"
	fi

	if [ -f "${PRIOR_INSTALL_DIR}/scripts/endOfDay_additionalSteps.sh" ]; then
		display_msg progress "Restoring endOfDay_additionalSteps.sh."
		mv "${PRIOR_INSTALL_DIR}/scripts/endOfDay_additionalSteps.sh" "${ALLSKY_SCRIPTS}"
	fi

	if [ -d "${PRIOR_INSTALL_DIR}/images" ]; then
		display_msg progress "Restoring images."
		mv "${PRIOR_INSTALL_DIR}/images" "${ALLSKY_HOME}"
	fi

	if [ -d "${PRIOR_INSTALL_DIR}/darks" ]; then
		display_msg progress "Restoring darks."
		mv "${PRIOR_INSTALL_DIR}/darks" "${ALLSKY_HOME}"
	fi

	PRIOR_CONFIG_DIR="${PRIOR_INSTALL_DIR}/config"

	# If the user has an older release, these files may be in /etc/raspap.
	# Check for both.
	if [[ ${PRIOR_ALLSKY} == "new" ]]; then
		OLD_RASPAP_DIR="${PRIOR_CONFIG_DIR}"
	else
		if [ -d "${OLD_RASPAP_DIR}" ]; then
			MSG="\nThe '${OLD_RASPAP_DIR}' directory is no longer used.\n"
			MSG="${MSG}When installation is done you may remove it.\n"
			display_msg info "${MSG}"
			echo -e "\n\n==========\n${MSG}" >> "${NEW_INSTALLATION_FILE}"
		fi
	fi
	if [ -f "${OLD_RASPAP_DIR}/raspap.auth" ]; then
		display_msg progress "Restoring WebUI security settings."
		mv "${OLD_RASPAP_DIR}/raspap.auth" "${ALLSKY_CONFIG}"
	fi

	# Restore any REMOTE Allsky Website configuration file.
	if [ -f "${PRIOR_CONFIG_DIR}/${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_NAME}" ]; then
		display_msg progress "Restoring remote Allsky Website ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_NAME}."
		mv "${PRIOR_CONFIG_DIR}/${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_NAME}" "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}"

		# Check if this is an older Allsky Website configuration file type.
		OLD=false
		PRIOR_CONFIG_VERSION="$(jq .ConfigVersion "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}")"
		if [[ ${PRIOR_CONFIG_VERSION} == "null" ]]; then
			OLD=true		# Hmmm, it should have the version
		else
			NEW_CONFIG_VERSION="$(jq .ConfigVersion "${REPO_WEBCONFIG_FILE}")"
			if [[ ${PRIOR_CONFIG_VERSION} < "${NEW_CONFIG_VERSION}" ]]; then
				OLD=true
			fi
		fi
		if [[ ${OLD} == "true" ]]; then
			MSG="Your ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE} is an older version.\n"
			MSG="${MSG}Your    version: ${PRIOR_CONFIG_VERSION}\n"
			MSG="${MSG}Current version: ${NEW_CONFIG_VERSION}\n"
			MSG="${MSG}\nPlease compare it to the new one in ${REPO_WEBCONFIG_FILE}"
			MSG="${MSG} to see what fields have been added, changed, or removed.\n"
			display_msg warning "${MSG}"
			echo -e "\n\n==========\n${MSG}" >> "${NEW_INSTALLATION_FILE}"
		fi
	fi
	# We don't check for old LOCAL Allsky Website configuration files.
	# That's done when they install the Allsky Website.

	if [ -f "${PRIOR_CONFIG_DIR}/uservariables.sh" ]; then
		display_msg progress "Restoring uservariables.sh."
		mv "${PRIOR_CONFIG_DIR}/uservariables.sh" "${ALLSKY_CONFIG}"
	fi

	SETTINGS_MSG=""
	if [[ ${PRIOR_ALLSKY} == "new" ]]; then
		if [ -f "${PRIOR_CONFIG_DIR}/settings.json" ]; then
			display_msg progress "Restoring WebUI settings."
			# This file is probably a link to a camera type/model-specific file,
			# so copy it instead of moving it to not break the link.
			cp "${PRIOR_CONFIG_DIR}/settings.json" "${ALLSKY_CONFIG}"
			RESTORED_PRIOR_SETTINGS_FILE=true
		fi
		# else, what the heck?  Their prior version is "new" but they don't have a settings file?
	else
		# settings file is old style in ${OLD_RASPAP_DIR}.
		if [[ ${CAMERA_TYPE} == "ZWO" ]]; then
			CT="ZWO"
		else
			CT="RPiHQ"		# RPi cameras used to be called "RPiHQ".
		fi
		SETTINGS="${OLD_RASPAP_DIR}/settings_${CT}.json"
		if [[ -f ${SETTINGS} ]]; then
			SETTINGS_MSG="\n\nYou also need to transfer your old settings to the WebUI.\nUse ${SETTINGS} as a guide.\n"
			# Restore the latitude and longitude so Allsky can start after reboot.
			LAT="$(settings .latitude "${SETTINGS}")"
			LONG="$(settings .longitude "${SETTINGS}")"
			"${ALLSKY_SCRIPTS}/updateWebsiteConfig.sh" ${DEBUG_ARG} \
				"config.latitude" "Latitude" "${LAT}" \
				"config.longitude" "Longitude" "${LONG}"
			display_msg --log progress "Prior latitude and longitude saved."
		fi

		# If we ever automate migrating settings, this next statement should be deleted.
		FORCE_CREATING_SETTINGS_FILE=true
	fi
	# Do NOT restore options.json - it will be recreated.

	# This may miss really-old variables that no longer exist.

	FOUND="true"
	if [ -f "${PRIOR_CONFIG_DIR}/ftp-settings.sh" ]; then
		PRIOR_FTP="${PRIOR_CONFIG_DIR}/ftp-settings.sh"
	elif [ -f "${PRIOR_INSTALL_DIR}/scripts/ftp-settings.sh" ]; then
		PRIOR_FTP="${PRIOR_INSTALL_DIR}/scripts/ftp-settings.sh"
	else
		PRIOR_FTP="ftp-settings.sh (in unknown location)"
		FOUND="false"
	fi

	## TODO: Try to automate this.
	# Unfortunately, it's not easy since the prior configuration files could be from
	# any Allsky version, and the variables and their names changed and we don't have a
	# mapping of old-to-new names.

	# display_msg progress "Restoring settings from config.sh and ftp-settings.sh."
	# shellcheck disable=SC1090,SC1091
	# ( source ${PRIOR_FTP}
	#	for each variable:
	#		/^variable=/ c;variable="$oldvalue";
	#	Deal with old names from version 0.8
	# ) > /tmp/x
	# sed -i --file=/tmp/x "${ALLSKY_CONFIG}/ftp-settings.sh"
	# rm -f /tmp/x
	
	# similar for config.sh, but
	#	- don't transfer CAMERA
	#	- handle renames
	#	- handle variable that were moved to WebUI
	#		> DAYTIME_CAPTURE
	#
	# display_msg info "\nIMPORTANT: check config/config.sh and config/ftp-settings.sh for correctness.\n"

	if [[ ${PRIOR_ALLSKY} == "new" && ${FOUND} == "true" ]]; then
		MSG="Your config.sh and ftp-settings.sh files should be very similar to the"
		MSG="${MSG}\nnew ones, other than your changes."
		MSG="${MSG}\nThere may be an easy way to update the new configuration files."
		MSG="${MSG}\nAfter installation, see ${NEW_INSTALLATION_FILE} for details."

		MSG2="You can compare the old and new configuration files with the following commands,"
		MSG2="${MSG2}\nand if the only differences are your changes, you can simply copy the old files to the new location:"
		MSG2="${MSG2}\n\ndiff ${PRIOR_FTP} ${ALLSKY_CONFIG}"
		MSG2="${MSG2}\n\nand"
		MSG2="${MSG2}\n\ndiff ${PRIOR_CONFIG_DIR}/config.sh ${ALLSKY_CONFIG}"
	else
		MSG="You need to manually move the contents of"
		MSG="${MSG}\n     ${PRIOR_CONFIG_DIR}/config.sh"
		MSG="${MSG}\nand"
		MSG="${MSG}\n     ${PRIOR_FTP}"
		MSG="${MSG}\n\nto the new files in ${ALLSKY_CONFIG}."
		MSG="${MSG}\n\nNOTE: some settings are no longer in config.sh and some changed names."
		MSG="${MSG}\nDo NOT add the old/deleted settings back in."
		MSG2=""
	fi
	MSG="${MSG}${SETTINGS_MSG}" 
	whiptail --title "${TITLE}" --msgbox "${MSG}" 18 ${WT_WIDTH} 3>&1 1>&2 2>&3
	display_msg info "\n${MSG}\n"
	echo -e "\n\n==========\n${MSG}" >> "${NEW_INSTALLATION_FILE}"
	[[ ${MSG2} != "" ]] && echo -e "\n\n==========\n${MSG2}" >> "${NEW_INSTALLATION_FILE}"
}


# Update Allsky and exit.  It basically resets things.
# This can be needed if the user hosed something up, or there was a problem somewhere.
do_update() {
	# shellcheck disable=SC1090,SC1091
	source "${ALLSKY_CONFIG}/config.sh"		# Get current CAMERA_TYPE
	if [[ -z ${CAMERA_TYPE} ]]; then
		display_msg error "CAMERA_TYPE not set in config.sh."
		exit 1
	fi

	create_webui_defines

	save_camera_capabilities "false" || exit 1

	# Update the sudoers file if it's missing some entries.
	# Look for the last entry added (should be the last entry in the file).
	# Don't simply copy the repo file to the final location in case the repo file isn't up to date.
	grep --silent "/date" "${FINAL_SUDOERS_FILE}"
	# shellcheck disable=SC2181
	if [ $? -ne 0 ]; then
		display_msg progress "Updating sudoers list."
		grep --silent "/date" "${REPO_SUDOERS_FILE}"
		# shellcheck disable=SC2181
		if [ $? -ne 0 ]; then
				display_msg error "Please get the newest '$(basename "${REPO_SUDOERS_FILE}")' file from Git and try again."
			exit 2
		fi
		do_sudoers
	fi

	exit 0
}


####################### main part of program

##### Log files write to ${ALLSKY_CONFIG}, which doesn't exist yet, so create it.
mkdir -p "${ALLSKY_CONFIG}"


##### Check arguments
OK=true
HELP=false
DEBUG=false
DEBUG_ARG=""
UPDATE=false
FUNCTION=""
while [ $# -gt 0 ]; do
	ARG="${1}"
	case "${ARG}" in
		--help)
			HELP=true
			;;
		--debug)
			DEBUG=true
			DEBUG_ARG="${ARG}"		# we can pass this to other scripts
			;;
		--update)
			UPDATE=true
			;;
		--function)
			FUNCTION="${2}"
			shift
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

##### Display the welcome header
if [[ ${FUNCTION} == "" ]]; then
	if [[ ${UPDATE} == "true" ]]; then
		H="Updating Allsky"
	else
		H="Welcome to the ${TITLE}"
	fi
	display_header "${H}"
fi

##### Calculate whiptail sizes
calc_wt_size

##### Stop Allsky
stop_allsky

##### Handle updates
[[ ${UPDATE} == "true" ]] && do_update		# does not return

##### Execute any specified function, then exit.
if [[ ${FUNCTION} != "" ]]; then
	if ! type ${FUNCTION} > /dev/null; then
		display_msg error "Unknown function: '${FUNCTION}'."
		exit 1
	fi

	${FUNCTION}
	exit $?
fi

##### Determine if there's a prior version
check_if_prior_Allsky

##### Determine the camera type
select_camera_type

##### Install dependencies, then compile and install Allsky software
install_dependencies_etc || exit 1

##### Update config.sh
# This must come BEFORE save_camera_capabilities, since it uses the camera type.
update_config_sh

##### Install web server
# This must come BEFORE save_camera_capabilities, since it installs php.
install_webserver

##### Create the file that defines the WebUI variables.
create_webui_defines

##### Create the camera type-model-specific "options" file
# This should come after the steps above that create ${ALLSKY_CONFIG}.
save_camera_capabilities "false" || exit 1

# Code later needs "settings()" function.
# shellcheck disable=SC1090,SC1091
source "${ALLSKY_CONFIG}/config.sh" || exit 1

##### Create ${ALLSKY_LOG}
create_allsky_log

##### Restore prior files if needed
restore_prior_files

##### Set locale
set_locale

##### Check for sufficient swap space
check_swap

##### Optionally make ${ALLSKY_TMP} a memory filesystem
check_memory_filesystem

##### Get the new host name
prompt_for_hostname

##### Handle avahi
do_avahi

##### Set permissions
set_permissions

##### Check for, and handle any prior Allsky Website
handle_prior_website

######## TEMP function to install the overlay and modules system
install_overlay()
{

        echo -e "${GREEN}* Installing PHP Modules${NC}"
        sudo apt-get install -y php-zip
        sudo apt-get install -y php-sqlite3

        echo -e "${GREEN}* Installing Python dependencies. This will take a LONG time${NC}"
        pip3 install --no-warn-script-location -r requirements.txt 2>&1 > dependencies.log
        sudo apt-get -y install libatlas-base-dev 2>&1 >> dependencies.log
        echo -e "${GREEN}* Installing Trutype fonts - This will take a while please be patient${NC}"
        sudo apt-get -y install msttcorefonts 2>&1 >> dependencies.log

        echo -e "${GREEN}* Setting up modules${NC}"
        sudo mkdir -p /etc/allsky/modules
        sudo chown -R ${ALLSKY_OWNER}:www-data /etc/allsky
        sudo chmod -R 774 /etc/allsky

        echo -e "${GREEN}* Fixing permissions${NC}"

        sudo chown ${ALLSKY_OWNER}:www-data "${ALLSKY_CONFIG}"/fields.json
        sudo chown ${ALLSKY_OWNER}:www-data "${ALLSKY_CONFIG}"/module-settings.json
        sudo chown ${ALLSKY_OWNER}:www-data "${ALLSKY_CONFIG}"/postprocessing_day.json
        sudo chown ${ALLSKY_OWNER}:www-data "${ALLSKY_CONFIG}"/postprocessing_night.json
	sudo chown ${ALLSKY_OWNER}:www-data "${ALLSKY_CONFIG}"/postprocessing_daynight.json 
	sudo chown ${ALLSKY_OWNER}:www-data "${ALLSKY_CONFIG}"/postprocessing_nightday.json 
	sudo chown ${ALLSKY_OWNER}:www-data "${ALLSKY_CONFIG}"/postprocessing_periodic.json		
        sudo chown ${ALLSKY_OWNER}:www-data "${ALLSKY_CONFIG}"/autoexposure.json
        sudo chown ${ALLSKY_OWNER}:www-data "${ALLSKY_CONFIG}"/overlay.json
        sudo chown -R ${ALLSKY_OWNER}:www-data "${ALLSKY_WEBUI}"/overlay

	sudo chmod -R 770 "${ALLSKY_WEBUI}"/overlay

}


install_overlay

######## All done


if [[ ${RESTORED_PRIOR_SETTINGS_FILE} == "false" ]]; then
	MSG="NOTE: Default settings were created for your camera."
	MSG="${MSG}\n\nHowever some entries may not have been set, like latitude, so you MUST"
	MSG="${MSG} go to the 'Allsky Settings' page in the WebUI after rebooting"
	MSG="${MSG} to make updates."
	whiptail --title "${TITLE}" --msgbox "${MSG}" 12 ${WT_WIDTH} 3>&1 1>&2 2>&3
	echo -e "\n\n==========\n${MSG}" >> "${NEW_INSTALLATION_FILE}"
fi

if [[ -n ${PRIOR_ALLSKY} ]]; then
	MSG="When you are sure everything is working with this new release,"
	MSG="${MSG} remove your old version in ${PRIOR_INSTALL_DIR} to save disk space."
	whiptail --title "${TITLE}" --msgbox "${MSG}" 12 ${WT_WIDTH} 3>&1 1>&2 2>&3
	echo -e "\n\n==========\n${MSG}" >> "${NEW_INSTALLATION_FILE}"
fi

# This will be the first image they see.
"${ALLSKY_SCRIPTS}//generate_notification_images.sh" --directory "${ALLSKY_TMP}" "image" \
	"yellow" "" 85 "" "" "" 10 "yellow" "jpg" "" \
	"***\nUse the\n'Allsky Settings'\nlink in the WebUI\nto configure Allsky\n***" > /dev/null

ask_reboot

exit 0
