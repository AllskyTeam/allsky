#!/bin/bash

if [ -z "${ALLSKY_HOME}" ]
then
	export ALLSKY_HOME="$(realpath $(dirname "${BASH_ARGV0}"))"
fi
ME="$(basename "${BASH_ARGV0}")"

source "${ALLSKY_HOME}/variables.sh"

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

TITLE="Allsky Installer"
ALLSKY_OWNER=$(id --group --name)
ALLSKY_GROUP=${ALLSKY_OWNER}
WEBSERVER_GROUP="www-data"
ALLSKY_VERSION="$( < "${ALLSKY_HOME}/version" )"
REPO_SUDOERS_FILE="${ALLSKY_REPO}/sudoers.repo"
REPO_WEBUI_DEFINES_FILE="${ALLSKY_REPO}/allskyDefines.inc.repo"
FINAL_SUDOERS_FILE="/etc/sudoers.d/allsky"
RASPAP_DIR="/etc/raspap"
FORCE_CREATING_SETTINGS_FILE=false		# should a default settings file be created?
PRIOR_ALLSKY=""							# Set to "new" or "old" if they have a prior version
NEW_HOST_NAME='allsky'					# Suggested new host name

# This file contains information the user needs to act upon after the reboot.
NEW_INSTALLATION_FILE="${ALLSKY_CONFIG}/new_installation.txt"

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


display_msg() {
	if [[ $1 == "error" ]]; then
		echo -e "\n${RED}*** ERROR: "
	elif [[ $1 == "warning" ]]; then
		echo -e "\n${YELLOW}*** WARNING: "
	elif [[ $1 == "progress" ]]; then
		echo -e "${GREEN}* ${2}${NC}"
		return
	elif [[ $1 == "info" ]]; then
		echo -e "${YELLOW}${2}${NC}"
		return
	else
		echo -e "${YELLOW}"
	fi
	echo -e "**********"
	echo -e "${2}"
	echo -e "**********${NC}"
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
	echo -e "${C}Usage: ${ME} [--help] [--update]${NC}"
	echo
	echo "'--help' displays this message and exits."
	echo
	echo "'--update' should only be used when instructed to by an Allsky Website page."
	echo
	exit ${RET}
}

calc_wt_size() {
	WT_WIDTH=$(tput cols)
	[ "${WT_WIDTH}" -gt 80 ] && WT_WIDTH=80
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
			CAMERA_TYPE=$(source "${OLD_CONFIG}" >/dev/null 2>&1; echo "${CAMERA_TYPE}")
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
	display_msg progress "Using ${CAMERA_TYPE} camera."	# so we have a log
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

	display_msg progress "Modifying locations for WebUI."
	FILE="${ALLSKY_WEBUI}/includes/allskyDefines.inc"

	sed		-e "s;XX_ALLSKY_HOME_XX;${ALLSKY_HOME};" \
			-e "s;XX_ALLSKY_CONFIG_XX;${ALLSKY_CONFIG};" \
			-e "s;XX_ALLSKY_SCRIPTS_XX;${ALLSKY_SCRIPTS};" \
			-e "s;XX_ALLSKY_IMAGES_XX;${ALLSKY_IMAGES};" \
			-e "s;XX_ALLSKY_MESSAGES_XX;${ALLSKY_MESSAGES};" \
			-e "s;XX_ALLSKY_WEBUI_XX;${ALLSKY_WEBUI};" \
			-e "s;XX_ALLSKY_WEBSITE_XX;${ALLSKY_WEBSITE};" \
			-e "s;XX_ALLSKY_OWNER_XX;${ALLSKY_OWNER};" \
			-e "s;XX_ALLSKY_GROUP_XX;${ALLSKY_GROUP};" \
			-e "s;XX_ALLSKY_REPO_XX;${ALLSKY_REPO};" \
			-e "s;XX_ALLSKY_VERSION_XX;${ALLSKY_VERSION};" \
			-e "s;XX_RASPI_CONFIG_XX;${ALLSKY_CONFIG};" \
		"${REPO_WEBUI_DEFINES_FILE}"  >  "${FILE}"
		chmod 644 "${FILE}"

	# The web server needs to be able to create and update file in ${ALLSKY_CONFIG}
	chmod 775 "${ALLSKY_CONFIG}"
	chmod 664 "${ALLSKY_CONFIG}"/*
	sudo chgrp -R ${WEBSERVER_GROUP} "${ALLSKY_CONFIG}"
	chmod 755 "${ALLSKY_WEBUI}/includes/createAllskyOptions.php"	# executable .php file

	# makeChanges.sh creates the camera type/model-specific 
	# --cameraTypeOnly tells makeChanges.sh to only change the camera info and exit.
	# It displays any error messages.
	if [[ ${FORCE_CREATING_SETTINGS_FILE} == "true" ]]; then
		FORCE="--force"
		MSG=" and default settings"
	else
		FORCE=""
		MSG=""
	fi

	display_msg progress "Setting up WebUI options${MSG} for ${CAMERA_TYPE} cameras."
	"${ALLSKY_SCRIPTS}/makeChanges.sh" ${FORCE} --cameraTypeOnly \
		"cameraType" "Camera Type" "${CAMERA_TYPE}"
	RET=$?

	if [ ${RET} -ne 0 ]; then
		if [ ${RET} -eq ${EXIT_NO_CAMERA} ]; then
			MSG="No camera was found; one must be connected and working for the installation to succeed.\n"
			MSG="$MSG}After connecting your camera, run '${ME} --update'."
			whiptail --title "${TITLE}" --msgbox "${MSG}" 12 ${WT_WIDTH} 3>&1 1>&2 2>&3
			display_msg error "No camera detected - installation aborted."
		else
			display_msg error "Unable to save camera capabilities."
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
	AT="${AT}or"n
	AT="${AT}     http://$(hostname -I | sed -e 's/ .*$//')"
	MSG="*** The Allsky Software is now installed. ***"
	MSG="${MSG}\n\nYou must reboot the Raspberry Pi to finish the installation."
	MSG="${MSG}\n\nAfter reboot you can connect to the WebUI at:\n"
	MSG="${MSG}${AT}"
	MSG="${MSG}\n\nReboot now?"
	if whiptail --title "${TITLE}" --yesno "${MSG}" 18 ${WT_WIDTH} 3>&1 1>&2 2>&3; then 
		sudo reboot now
	else
		display_msg warning "You need to reboot the Pi before Allsky will work."
		MSG="If you have not already rebooted your Pi, please do so now.\n"
		MSG="You can connect to the WebUI at:\n"
		MSG="${MSG}${AT}"
		echo -e "\n\n==========\n${MSG}" >> "${NEW_INSTALLATION_FILE}"
	fi
}


# Check for size of RAM+swap during installation (Issue # 969).
check_swap() {
	RAM_SIZE=0		# TODO: Get RAM size in GB
	SUGGESTED_SWAP_SIZE=0
	if [[ ${RAM_SIZE} -le 1 ]]; then
		SUGGESTED_SWAP_SIZE=4
	elif [[ ${RAM_SIZE} -le 2 ]]; then
		SUGGESTED_SWAP_SIZE=2
	elif [[ ${RAM_SIZE} -le 4 ]]; then
		SUGGESTED_SWAP_SIZE=1
	fi

	CURRENT_SWAP=0		# TODO: Determine current swap size, if any.
	if [[ ${CURRENT_SWAP} -lt ${SUGGESTED_SWAP_SIZE} ]]; then
		if [[ ${CURRENT_SWAP} -eq 0 ]]; then
			AMT="no"
			M="added"
		else
			AMT="${CURRENT_SWAP} GB of"
			M="increased"
		fi
		MSG="Your Pi currently has ${AMT} swap space."
		MSG="${MSG}\nBased on your memory size of ${RAM_SIZE} GB,"
		MSG="${MSG}consider having ${SUGGESTED_SWAP_SIZE} GB of swap."
		MSG="${MSG}\nHaving sufficient swap will decrease the chance of timelapse and other failures."
		MSG="${MSG}\n\nDo you want swap space ${M}?"
		MSG="${MSG}\n\nIf you do NOT want to change anything, enter 0."
		sleep 2		# time to read prior messages
		SWAP_SIZE=$(whiptail --title "${TITLE}" --inputbox "${MSG}" 15 ${WT_WIDTH} \
			"${SUGGESTED_SWAP_SIZE}" 3>&1 1>&2 2>&3)
		if [[ ${SWAP_SIZE} == "0" ]]; then
			if [[ ${CURRENT_SWAP} -eq 0 ]]; then
				display_msg warning "With no swap space you run the risk of programs failing."	# so we have a log
			else
				display_msg info "Swap will remain at ${CURRENT_SWAP}."	# so we have a log
			fi
		else
echo -e "TODO: Add/increase swap to ${SWAP_SIZE}\n"
		fi
	else
		display_msg progress "Size of current swap (${CURRENT_SWAP}) is sufficient."	# so we have a log
	fi
}


# Check if prior ${ALLSKY_TMP} was a memory filesystem.
# If so, umount it, then remount it.
# If not, offer to make ${ALLSKY_TMP} a memory filesystem.
check_memory_filesystem() {
	IS_MEMORY=false
# TODO: check if currently a memory filesystem
	if [[ ${IS_MEMORY} == "true" ]]; then
# TODO: unmount it, then remount it
		display_msg progress "${ALLSKY_TMP} is currently in memory."	# so we have a log
		return
	fi

	MSG="Making ${ALLSKY_TMP} reside in memory can drastically decrease the amount of writes to the SD card, increasing its life."
	MSG="${MSG}\n\nDo you want to make it reside in memory?"
	MSG="${MSG}\n\nNote: anything in it will be deleted whenever the Pi is rebooted, but that's not an issue since the directory only contains temporary files."
	sleep 2		# time to read prior messages
	if whiptail --title "${TITLE}" --yesno "${MSG}" 15 ${WT_WIDTH}  3>&1 1>&2 2>&3; then 
echo -e "TODO: make memory filesystem\n"
	else
		display_msg info "${ALLSKY_TMP} will remain on disk."	# so we have a log
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

	REPO_LIGHTTPD_FILE="${ALLSKY_REPO}/lighttpd.conf.repo"
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
	sudo systemctl force-reload lighttpd > /dev/null 2>&1
	sudo systemctl start lighttpd
	sudo rm -fr /var/log/lighttpd/*		# Start off with a clean log file.
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

		REPO_AVI_FILE="${ALLSKY_REPO}/avahi-daemon.conf.repo"
		sed "s/XX_HOST_NAME_XX/${NEW_HOST_NAME}/g" "${REPO_AVI_FILE}" > /tmp/x
		sudo install -m 0644 /tmp/x "${FINAL_AVI_FILE}" && rm -f /tmp/x
	fi
}

# Set permissions on various web-related items.
set_web_permissions() {
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

handle_prior_website() {
	OLD_WEBUI_LOCATION="/var/www/html"
	OLD_WEBSITE="${OLD_WEBUI_LOCATION}/allsky"
	if [ -d "${OLD_WEBSITE}" ]; then
		ALLSKY_WEBSITE_OLD="${OLD_WEBSITE}"
	elif [ -d "${PRIOR_INSTALL_DIR}/html/allsky" ]; then
		ALLSKY_WEBSITE_OLD="${PRIOR_INSTALL_DIR}/html/allsky"
	else
		return
	fi

	# Move any prior ALLSKY_WEBSITE to the new location.
	# This HAS to be done since the lighttpd server only looks in the new location.
	# Note: This MUST come before the old WebUI check below so we don't remove the prior website
	# when we remove the prior WebUI.

	display_msg progress "Moving prior Allsky Website from ${ALLSKY_WEBSITE_OLD} to new location."
	OK=true
	if [ -d "${ALLSKY_WEBSITE}" ]; then
		# Hmmm.  There's an old webite AND a new one.
		# Allsky doesn't ship with the website directory, so not sure how one got there...
		# Try to remove the new one - if it's not empty the remove will fail.
		rmdir "${ALLSKY_WEBSITE}" 
		if [ $? -ne 0 ]; then
			display_msg error "* New website in '${ALLSKY_WEBSITE}' is not empty."
			display_msg info "  Move the contents manually from '${ALLSKY_WEBSITE_OLD}',"
			display_msg info "  and then remove the old location.\n"
			OK=false

			# Move failed, but still check if prior website is outdated.
			PRIOR_SITE="${ALLSKY_WEBSITE_OLD}"
		fi
	fi
	if [[ ${OK} = "true" ]]; then
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
		echo -e "\n\n==========\n${MSG}" >> "${NEW_INSTALLATION_FILE}"
	fi

	# Check if a WebUI exists in the old location.
	[ ! -d "${OLD_WEBUI_LOCATION}" ] && return

	MSG="An old version of the WebUI was found in ${OLD_WEBUI_LOCATION}; it is no longer being used so you may remove it after intallation."
	MSG="${MSG}\n\nWARNING: if you have any other web sites in that directory, they will no longer be accessible via the web server."
	whiptail --title "${TITLE}" --msgbox "${MSG}" 15 ${WT_WIDTH}   3>&1 1>&2 2>&3
	echo -e "\n\n==========\n${MSG}" >> "${NEW_INSTALLATION_FILE}"
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
			display_msg progress "Will NOT restore from prior version of Allsky."	# so we have a log
		fi
	else
		MSG="No prior version of Allsky found."
		MSG="${MSG}\n\nIf you DO have a prior version and you want images, darks, and certain settings moved from the prior version to the new one, rename the prior version to ${PRIOR_INSTALL_DIR} before running this installation."
		MSG="${MSG}\n\nDo you want to continue?"
		if ! whiptail --title "${TITLE}" --yesno "${MSG}" 15 ${WT_WIDTH} 3>&1 1>&2 2>&3; then 
			display_msg info "* Rename the directory with your prior version of Allsky to\n'${PRIOR_INSTALL_DIR}', then run the installation again.\n"
			exit 0
		fi
	fi
}

install_depenencies_etc() {
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

	display_msg progress "Preparing Allsky commands.  May take a couple minutes."
	TMP="/tmp/all.install.tmp"
	#shellcheck disable=SC2024
	make all > ${TMP} 2>&1
	if [ $? -ne 0 ]; then
		display_msg error "Compile failed:"
		cat ${TMP}
		return 1
	fi

	TMP="/tmp/install.install.tmp"
	#shellcheck disable=SC2024
	sudo make install > ${TMP} 2>&1
	if [ $? -ne 0 ]; then
		display_msg error "Install failed:"
		cat ${TMP}
		return 1
	fi

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
		# No prior Allsky so force creating a settings file.
		FORCE_CREATING_SETTINGS_FILE=true
		return
	fi

	if [ -f "${PRIOR_INSTALL_DIR}/scripts/endOfNight_additionalSteps.sh" ]; then
		display_msg progress "Restoring endOfNight_additionalSteps.sh."
		mv "${PRIOR_INSTALL_DIR}/scripts/endOfNight_additionalSteps.sh" "${ALLSKY_SCRIPTS}"
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
		RASPAP_DIR="${PRIOR_CONFIG_DIR}"
	else
		# RASPAP_DIR set at top of script
		if [ -d "${RASPAP_DIR}" ]; then
			MSG="\nThe '${RASPAP_DIR}' directory is no longer used.\n"
			MSG="${MSG}When installation is done you may remove it.\n"
			display_msg info "${MSG}"
			echo -e "\n\n==========\n${MSG}" >> "${NEW_INSTALLATION_FILE}"
		fi
	fi
	if [ -f "${RASPAP_DIR}/raspap.auth" ]; then
		display_msg progress "Restoring WebUI security settings."
		mv "${RASPAP_DIR}/raspap.auth" "${ALLSKY_CONFIG}"
	fi

	if [ -f "${PRIOR_CONFIG_DIR}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}" ]; then
		display_msg progress "Restoring remote Allsky Website ${ALLSKY_WEBSITE_CONFIGURATION_NAME}."
		mv "${PRIOR_CONFIG_DIR}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}" "${ALLSKY_CONFIG}"

		# Check if this is an older configuration file type.
		CONFIG_FILE="${ALLSKY_CONFIG}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}"
		OLD=false
		PRIOR_CONFIG_VERSION="$(jq .ConfigVersion "${CONFIG_FILE}")"
		REPO_FILE="${ALLSKY_REPO}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}"
		if [[ ${PRIOR_CONFIG_VERSION} == "null" ]]; then
			OLD=true		# Hmmm, it should have the version
		else
			NEW_CONFIG_VERSION="$(jq .ConfigVersion "${REPO_FILE}")"
			if [[ ${PRIOR_CONFIG_VERSION} < "${NEW_CONFIG_VERSION}" ]]; then
				OLD=true
			fi
		fi
		if [[ ${OLD} == "true" ]]; then
			MSG="Your ${CONFIG_FILE} is an older version.\n"
			MSG="${MSG}Your    version: ${PRIOR_CONFIG_VERSION}\n"
			MSG="${MSG}Current version: ${NEW_CONFIG_VERSION}\n"
			MSG="${MSG}\nPlease compare it to the new one in ${REPO_FILE}"
			MSG="${MSG} to see what fields have been added, changed, or removed.\n"
			display_msg warning "${MSG}"
			echo -e "\n\n==========\n${MSG}" >> "${NEW_INSTALLATION_FILE}"
		fi
	fi

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
	else
		# settings file is old style in ${RASPAP_DIR}.
		if [[ ${CAMERA_TYPE} == "ZWO" ]]; then
			CT="ZWO"
		else
			CT="RPi"
		fi
		SETTINGS="${RASPAP_DIR}/settings_${CT}.json"
		if [[ -f ${SETTINGS} ]]; then
			SETTINGS_MSG="\n\nYou also need to transfer your old settings to the WebUI.\nUse ${SETTINGS} as a guide.\n"
		fi
		FORCE_CREATING_SETTINGS_FILE=true
	fi
	# Do NOT restores options.json - it will be recreated.

	# This may miss really-old variables that no longer exist.

	## TODO: automate this
	# display_msg progress "Restoring settings from config.sh and ftp-settings.sh."
	# ( source ${PRIOR_CONFIG_DIR}/ftp-settings.sh
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

	MSG="You need to manually move the contents of"
	MSG="${MSG}\n     ${PRIOR_CONFIG_DIR}/config.sh"
	MSG="${MSG}\nand"
	MSG="${MSG}\n     ${PRIOR_CONFIG_DIR}/ftp-settings.sh"
	MSG="${MSG}\nto the new files in ${ALLSKY_CONFIG}."
	MSG="${MSG}\n\nNOTE: some settings are no longer in config.sh and some changed names."
	MSG="${MSG}\nDo NOT add the old/deleted settings back in."
	MSG="${MSG}${SETTINGS_MSG}" 
	# Don't use whiptail so there's a record of what the user needs to do.
	display_msg info "\n${MSG}\n"
	echo -e "\n\n==========\n${MSG}" >> "${NEW_INSTALLATION_FILE}"
}

# Update Allsky and exit.  It basically resets things.
# This can be needed if the user hosed something up, or there was a problem somewhere.
do_update() {
	source "${ALLSKY_CONFIG}/config.sh"		# Get current CAMERA_TYPE
	if [[ -z ${CAMERA_TYPE} ]]; then
		display_msg error "ERROR: CAMERA_TYPE not set in config.sh."
		exit 1
	fi
	save_camera_capabilities || exit 1

	# Update the sudoers file if it's missing some entries.
	# Look for the last entry added (should be the last entry in the file).
	# Don't simply copy the repo file to the final location in case the repo file isn't up to date.
	grep --silent "truncate" "${FINAL_SUDOERS_FILE}"
	# shellcheck disable=SC2181
	if [ $? -ne 0 ]; then
		display_msg progress "Updating sudoers list."
		grep --silent "truncate" "${REPO_SUDOERS_FILE}"
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

# Check arguments
OK=true
HELP=false
UPDATE=false
while [ $# -gt 0 ]; do
	ARG="${1}"
	case "${ARG}" in
		--help)
			HELP=true
			;;
		--update)
			UPDATE=true
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
if [[ ${UPDATE} == "true" ]]; then
	H="Updating Allsky"
else
	H="Welcome to the ${TITLE}"
fi
display_header "${H}"

##### Calculate whiptail sizes
calc_wt_size

##### Handle updates
[[ ${UPDATE} == "true" ]] && do_update

##### Determine if there's a prior version
check_if_prior_Allsky

##### Determine the camera type
select_camera_type

##### Install dependencies, then compile and install Allsky software
install_depenencies_etc || exit 1

##### Update config.sh
# This must come BEFORE save_camera_capabilities, since it uses the camera type.
update_config_sh

##### Create the camera type-model-specific "options" file
# This should come after the steps above that create ${ALLSKY_CONFIG}.
save_camera_capabilities || exit 1

# Code later needs "settings()" function.
source "${ALLSKY_CONFIG}/config.sh" || exit 1

##### Create ${ALLSKY_LOG}
create_allsky_log

##### Restore prior files if needed
RESTORED_PRIOR_SETTINGS_FILE=false
restore_prior_files

##### Set locale
set_locale

##### Check for sufficient swap space
check_swap

##### Check if prior $ALLSKY_TMP was a memory filesystem
check_memory_filesystem

##### Get the new host name
prompt_for_hostname

##### Install web server
install_webserver

##### Handle avahi
do_avahi

##### Set permissions
set_web_permissions

##### Check for, and handle any prior Allsky Website
handle_prior_website



######## All done


if [[ ${RESTORED_PRIOR_SETTINGS_FILE} == "false" ]]; then
	MSG="NOTE: Default settings were created for your camera."
	MSG="${MSG}\n\nHowever some entries were not set, like latitude, so you MUST"
	MSG="${MSG} go to the 'Allsky Settings' page in the WebUI after rebooting"
	MSG="${MSG} to make updates."
	whiptail --title "${TITLE}" --msgbox "${MSG}" 12 ${WT_WIDTH} 3>&1 1>&2 2>&3
	echo -e "\n\n==========\n${MSG}" >> "${NEW_INSTALLATION_FILE}"

	# This will be the first image they see.
	"${ALLSKY_SCRIPTS}//generate_notification_images.sh" --directory "${ALLSKY_TMP}" "image" \
			"yellow" "" 85 "" "" "" 10 "yellow" "jpg" "" \
			"***\nUse the\n'Allsky Settings'\nlink in the WebUI\nto configure Allsky\n***" > /dev/null
fi
if [[ -n ${PRIOR_ALLSKY} ]]; then
	MSG="When you are sure everything is working with this new release,"
	MSG="${MSG} remove your old version in ${PRIOR_INSTALL_DIR} to save disk space."
	whiptail --title "${TITLE}" --msgbox "${MSG}" 12 ${WT_WIDTH} 3>&1 1>&2 2>&3
	echo -e "\n\n==========\n${MSG}" >> "${NEW_INSTALLATION_FILE}"
fi

ask_reboot

exit 0
