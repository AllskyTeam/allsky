#!/bin/bash

### xxxxxxxxxxx the functionality here must come after the "make install" in the main installer.
# TODO: If there was an ${ALLSKY_WEBSITE}, set its old location to ${ALLSKY_WEBSITE_OLD},
# which may be in /var/www/html/allsky.

if [ -z "${ALLSKY_HOME}" ] ; then
	ALLSKY_HOME="$(realpath "$(dirname "${BASH_ARGV0}")"/..)"
	export ALLSKY_HOME
fi
# shellcheck disable=SC1090
source "${ALLSKY_HOME}/variables.sh"
REPO_DIR="${ALLSKY_HOME}/config_repo"

echo -en '\n'
echo -e "*********************************************************************"
echo    "*** Welcome to the Allsky Web User Interface (WebUI) installation ***"
echo -e "*********************************************************************"
echo -en '\n'

if [[ ${EUID} -ne 0 ]]; then
	echo -e "${RED}This script must be run as root\n${NC}" 1>&2
	exit 1
fi

ALLSKY_OWNER="${SUDO_USER}"
ALLSKY_GROUP="${SUDO_USER}"

# Some files have placeholders for certain locations.  Modify them.
modify_locations()
{
	echo -e "${GREEN}* Modifying locations in web files${NC}"
	# Not all files have all variables

	sed -i  -e "s;XX_ALLSKY_HOME_XX;${ALLSKY_HOME};" \
			-e "s;XX_ALLSKY_CONFIG_XX;${ALLSKY_CONFIG};" \
			-e "s;XX_ALLSKY_SCRIPTS_XX;${ALLSKY_SCRIPTS};" \
			-e "s;XX_ALLSKY_IMAGES_XX;${ALLSKY_IMAGES};" \
			-e "s;XX_ALLSKY_MESSAGES_XX;${ALLSKY_MESSAGES};" \
			-e "s;XX_ALLSKY_WEBUI_XX;${ALLSKY_WEBUI};" \
			-e "s;XX_ALLSKY_WEBSITE_XX;${ALLSKY_WEBSITE};" \
			-e "s;XX_ALLSKY_OWNER_XX;${ALLSKY_OWNER};" \
			-e "s;XX_ALLSKY_GROUP_XX;${ALLSKY_GROUP};" \
			-e "s;XX_RASPI_CONFIG_XX;${ALLSKY_CONFIG};" \
		"${ALLSKY_WEBUI}/includes/functions.php"
}

REPO_SUDOERS_FILE="${REPO_DIR}/sudoers.repo"
FINAL_SUDOERS_FILE="/etc/sudoers.d/allsky"
do_sudoers()
{
	echo -e "${GREEN}* Creating/updating sudoers file${NC}"
	sed -e "s;XX_ALLSKY_SCRIPTS_XX;${ALLSKY_SCRIPTS};" \
		"${REPO_SUDOERS_FILE}"  >  "${FINAL_SUDOERS_FILE}"
	chmod 0644 "${FINAL_SUDOERS_FILE}"
}

# TODO: is "update" needed ?  Maybe it's part of an upgrade to Allsky...
# Check if the user is updating an existing installation.
if [ "${1}" = "--update" ] || [ "${1}" = "-update" ] ; then
	shift

	echo -en '\n'
	echo -e "*********************************************"
	echo    "*** Performing update of the Allsky WebUI ***"
	echo -e "*********************************************"
	echo -en '\n'

	modify_locations

	# Update the sudoers file if it's missing some entries.
	# Look for the last entry added (should be the last entry in the file).
	# Don't simply copy the repo file to the final location in case the repo file isn't up to date.
	grep --silent "truncate" "${FINAL_SUDOERS_FILE}"
	# shellcheck disable=SC2181
	if [ $? -ne 0 ]; then
		echo -e "${GREEN}* Updating sudoers list${NC}"
		grep --silent "makeChanges.sh" "${REPO_SUDOERS_FILE}"
		# shellcheck disable=SC2181
		if [ $? -ne 0 ]; then
				echo -e "${RED}Please get the newest '$(basename "${REPO_SUDOERS_FILE}")' file from Git and try again.${NC}"
			exit 2
		fi
		do_sudoers
	fi

	exit 0		# currently nothing else to do for updates
fi

# New install.  The WebUI files are already in place, we just need to adjust the configuration.

CURRENT_HOSTNAME=$(tr -d " \t\n\r" < /etc/hostname)
NEW_HOST_NAME='allsky'

# If the Pi is already called ${NEW_HOST_NAME},
# then the user already updated the name, so don't prompt again.
if [ "${CURRENT_HOSTNAME}" != "${NEW_HOST_NAME}" ]; then
	NEW_HOST_NAME=$(whiptail --inputbox "Please enter a hostname for your Pi" 20 60 "${NEW_HOST_NAME}" 3>&1 1>&2 2>&3)
	if [ "${CURRENT_HOSTNAME}" != "${NEW_HOST_NAME}" ]; then
		echo "${NEW_HOST_NAME}" > /etc/hostname
		sed -i "s/127.0.1.1.*${CURRENT_HOSTNAME}/127.0.1.1\t${NEW_HOST_NAME}/" /etc/hosts
	fi
fi

echo -e "${GREEN}* Installing the lighttpd webserver and its dependencies${NC}"
echo
apt-get update && apt-get install -y lighttpd php-cgi php-gd hostapd dnsmasq avahi-daemon
systemctl stop lighttpd 2> /dev/null
rm -fr /var/log/lighttpd/*		# Start off with a clean log file.
lighty-enable-mod fastcgi-php 2> /dev/null

REPO_LIGHTTPD_FILE="${REPO_DIR}/lighttpd.conf.repo"
FINAL_LIGHTTPD_FILE="/etc/lighttpd/lighttpd.conf"
sed \
	-e "s;XX_ALLSKY_WEBUI_XX;${ALLSKY_WEBUI};g" \
	-e "s;XX_ALLSKY_HOME_XX;${ALLSKY_HOME};g" \
	-e "s;XX_ALLSKY_IMAGES_XX;${ALLSKY_IMAGES};g" \
	-e "s;XX_ALLSKY_WEBSITE_XX;${ALLSKY_WEBSITE};g" \
	-e "s;XX_ALLSKY_DOCUMENTATION_XX;${ALLSKY_DOCUMENTATION};g" \
		"${REPO_LIGHTTPD_FILE}"  >  "${FINAL_LIGHTTPD_FILE}"
chmod 0644 "${FINAL_LIGHTTPD_FILE}"
systemctl start lighttpd
echo


FINAL_AVI_FILE="/etc/avahi/avahi-daemon.conf"
[ -f "${FINAL_AVI_FILE}" ] && grep -i --quiet "host-name=${NEW_HOST_NAME}" "${FINAL_AVI_FILE}"
if [ $? -ne 0 ]; then
	# New NEW_HOST_NAME not found in file, or file doesn't exist, so need to configure file.
	echo -e "${GREEN}* Configuring avahi-daemon${NC}"
	REPO_AVI_FILE="${REPO_DIR}/avahi-daemon.conf.repo"
	sed "s/XX_HOST_NAME_XX/${NEW_HOST_NAME}/g" "${REPO_AVI_FILE}" > "${FINAL_AVI_FILE}"
	chmod 0644 "${FINAL_AVI_FILE}"
	echo
fi

echo -e "${GREEN}* Adding the right permissions to the webserver${NC}"
# Remove any old entries; we now use /etc/sudoers.d/allsky instead of /etc/sudoers.
sed -i -e '/allsky/d' -e '/www-data/d' /etc/sudoers
do_sudoers
echo


# Restore files from any prior ALLSKY_WEBSITE.
# Note: This MUST come before the old WebUI check below so we don't remove the website
# before moving the files to the new location.
if [ "${ALLSKY_WEBSITE_OLD}" != "" ]; then
	echo -e "${GREEN}* Restoring ${ALLSKY_WEBSITE_OLD}${NC}"
	OK="true"
	if [ -d "${ALLSKY_WEBSITE}" ]; then
		# Hmmm.  There's an old webite AND a new one.
		# Try to remove the new one - if it's not empty the remove will fail.
		rmdir "${ALLSKY_WEBSITE}" 
		if [ $? -ne 0 ]; then
			echo -e "${RED}* New website in '${ALLSKY_WEBSITE}' is not empty.${NC}"
			echo -e "${RED}  Move the contents manually from '${ALLSKY_WEBSITE_OLD}',${NC}"
			echo -e "${RED}  and then remove the old location.${NC}"
			OK="false"
		fi
	fi
	[ "${OK}" = "true" ] && sudo mv "${ALLSKY_WEBSITE_OLD}" "${ALLSKY_WEBSITE}"
fi

# Check if a WebUI exists in the old location.
OLD_WEBUI_LOCATION="/var/www/html"
if [ -d "${OLD_WEBUI_LOCATION}" ]; then
	if (whiptail --title "Allsky Software Installer" --yesno "An old version of the WebUI was found in ${OLD_WEBUI_LOCATION}; it is no longer being used so do you want to remove it?" 10 60 \
		3>&1 1>&2 2>&3); then 
		echo -e "${GREEN}* Removing old WebUI in ${OLD_WEBUI_LOCATION}${NC}"
		sudo rm -fr "${OLD_WEBUI_LOCATION}"
	fi
fi

echo -e "${GREEN}* Setting permissions on WebUI files.${NC}"
# The files should already be the correct permissions/owners, but just in case, set them.
find "${ALLSKY_WEBUI}/" -type f -exec chmod 644 {} \;
find "${ALLSKY_WEBUI}/" -type d -exec chmod 775 {} \;

modify_locations	# replace placeholders in some files with actual path names

if (whiptail --title "Allsky Software Installer" --yesno "Allsky is now installed. You can now reboot the Raspberry Pi and connect to it at this address: http://${NEW_HOST_NAME}.local or http://$(hostname -I | sed -e 's/ .*$//')   Would you like to Reboot now?" 10 60 \
	3>&1 1>&2 2>&3); then 
	reboot now
else
	exit 3
fi
