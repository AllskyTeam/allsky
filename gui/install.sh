#!/bin/bash

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
	echo -e "${RED}This script must be run as root${NC}" 1>&2
	exit 1
fi

SCRIPTPATH="$( cd "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"

CONFIG_DIR="${ALLSKY_CONFIG}"	# settings_*.json files go here

# Some files have placeholders for certain locations.  Modify them.
modify_locations()
{
	echo -e "${GREEN}* Modifying locations in web files${NC}"
	(
		cd "${ALLSKY_WEBUI}/includes" || exit 1
		sed -i  -e "s;XX_ALLSKY_HOME_XX;${ALLSKY_HOME};" \
				-e "s;XX_ALLSKY_SCRIPTS_XX;${ALLSKY_SCRIPTS};" \
				-e "s;XX_ALLSKY_WEBSITE_XX;${ALLSKY_WEBSITE};" \
				save_file.php

		sed -i  -e "s;XX_ALLSKY_HOME_XX;${ALLSKY_HOME};" \
				-e "s;XX_ALLSKY_SCRIPTS_XX;${ALLSKY_SCRIPTS};" \
				-e "s;XX_ALLSKY_IMAGES_XX;${ALLSKY_IMAGES};" \
				-e "s;XX_ALLSKY_CONFIG_XX;${ALLSKY_CONFIG};" \
				-e "s;XX_ALLSKY_WEBUI_XX;${ALLSKY_WEBUI};" \
				-e "s;XX_ALLSKY_WEBSITE_XX;${ALLSKY_WEBSITE};" \
				-e "s;XX_ALLSKY_MESSAGES_XX;${ALLSKY_MESSAGES};" \
				-e "s;XX_RASPI_CONFIG_XX;${ALLSKY_CONFIG};" \
				functions.php
	)
}

# Set up lighttpd to only save 2 weeks of log files instead of the default of 12.
modify_logrotate()
{
	WEEKS=2
	echo -e "${GREEN}* Modifying lighttpd in to save ${WEEKS} weeks of logs.${NC}"
	ROTATE_CONFIG=/etc/logrotate.d/lighttpd
	if [ -f "${ROTATE_CONFIG}" ]; then
		sed -i "s; rotate [0-9]*; rotate ${WEEKS};" "${ROTATE_CONFIG}"
		systemctl restart logrotate
	else
		echo -e "${YELLOW}* WARNING: '${ROTATE_CONFIG}' not found; continuing.${NC}"
	fi
}

do_sudoers()
{
	echo -e "${GREEN}* Creating/updating sudoers file${NC}"
	REPO_FILE="${REPO_DIR}/sudoers.repo"
	CONFIG_FILE="${ALLSKY_CONFIG}/sudoers"
	FINAL_FILE="/etc/sudoers.d/allsky"
	sed -e "s;XX_ALLSKY_SCRIPTS_XX;${ALLSKY_SCRIPTS};" "${REPO_FILE}" > "${CONFIG_FILE}"
	chown ${SUDO_USER}:${SUDO_USER} "${CONFIG_FILE}"
	install -m 0644 "${CONFIG_FILE}" "${FINAL_FILE}"
}

NEED_TO_UPDATE_HOST_NAME="true"
CURRENT_HOSTNAME=$(tr -d " \t\n\r" < /etc/hostname)

# Check if the user is updating an existing installation.
if [ "${1}" = "--update" ] || [ "${1}" = "-update" ] ; then
	shift

	echo -en '\n'
	echo -e "*********************************************"
	echo    "*** Performing update of the Allsky WebUI ***"
	echo -e "*********************************************"
	echo -en '\n'

	if [ ! -d "${ALLSKY_WEBUI}" ]; then
		echo -e "${RED}Update specified but no existing WebUI found in '${ALLSKY_WEBUI}'${NC}" 1>&2
		exit 2
	fi

	modify_locations
	modify_logrotate

	# Add entries to sudoers file if not already there.
	# This is only needed for people who updated allsky-portal but didn't update allsky.
	# Don't simply copy the "allsky" file to /etc/sudoers.d in case "allsky" isn't up to date.
	grep --silent "postData.sh" /etc/sudoers.d/allsky &&
	grep --silent "ifconfig" /etc/sudoers.d/allsky
	# shellcheck disable=SC2181
	if [ $? -ne 0 ]; then
		echo -e "${GREEN}* Updating sudoers list${NC}"
		grep --silent "postData.sh" ${SCRIPTPATH}/sudoers
		# shellcheck disable=SC2181
		if [ $? -ne 0 ]; then
				echo -e "${RED}Please get the newest '$(basename "${SCRIPTPATH}")/sudoers' file from Git and try again.${NC}"
			exit 2
		fi
		do_sudoers
	fi

	exit 0		# currently nothing else to do for updates

else
	HOST_NAME='allsky'
	HOST_NAME=$(whiptail --inputbox "Please enter a hostname for your Allsky Pi" 20 60 "${HOST_NAME}" 3>&1 1>&2 2>&3)
	if [ "${CURRENT_HOSTNAME}" = "${HOST_NAME}" ]; then
		NEED_TO_UPDATE_HOST_NAME="false"
	fi
fi
# FOR TESTING:   echo -e "${GREEN} * Using host name '${HOST_NAME}'${NC}";  exit

echo -e "${GREEN}* Installing the webserver${NC}"
echo
apt-get update && apt-get install -y lighttpd php-cgi php-gd hostapd dnsmasq avahi-daemon
lighty-enable-mod fastcgi-php
echo

echo -e "${GREEN}* Configuring lighttpd${NC}"
REPO_FILE="${REPO_DIR}/lighttpd.conf.repo"
CONFIG_FILE="${ALLSKY_CONFIG}/lighttpd.conf"
FINAL_FILE="/etc/lighttpd/lighttpd.conf"
sed \
	-e "s|XX_ALLSKY_HOME_XX|${ALLSKY_HOME}|g" \
	-e "s|XX_ALLSKY_IMAGES_XX|${ALLSKY_IMAGES}|g" \
	-e "s|XX_ALLSKY_WEBUI_XX|${ALLSKY_WEBUI}|g" \
	-e "s|XX_ALLSKY_WEBSITE_XX|${ALLSKY_WEBSITE}|g" \
	-e "s|XX_ALLSKY_DOCUMENTATION_XX|${ALLSKY_DOCUMENTATION}|g" \
	"${REPO_FILE}" > "${CONFIG_FILE}"
chown ${SUDO_USER}:${SUDO_USER} "${CONFIG_FILE}"
install -m 0644 "${CONFIG_FILE}" "${FINAL_FILE}"
service lighttpd restart
echo

if [ "${NEED_TO_UPDATE_HOST_NAME}" = "true" ]; then
	echo -e "${GREEN}* Changing hostname to '${HOST_NAME}'${NC}"
	echo "${HOST_NAME}" > /etc/hostname
	sed -i "s/127.0.1.1.*${CURRENT_HOSTNAME}/127.0.1.1\t${HOST_NAME}/g" /etc/hosts
	echo
else
	echo -e "${GREEN}* Leaving hostname at '${HOST_NAME}'${NC}"
fi

FINAL_FILE="/etc/avahi/avahi-daemon.conf"
[ -f "${FINAL_FILE}" ] && grep -i --quiet "host-name=${HOST_NAME}" "${FINAL_FILE}"
if [ $? -ne 0 ]; then
	# New HOST_NAME not found, or file doesn't exist, so need to configure file.
	echo -e "${GREEN}* Configuring avahi-daemon${NC}"
	REPO_FILE="${REPO_DIR}/avahi-daemon.conf.repo"
	CONFIG_FILE="${ALLSKY_CONFIG}/avahi-daemon.conf"
	sed "s/XX_HOST_NAME_XX/${HOST_NAME}/g" "${REPO_FILE}" > "${CONFIG_FILE}"
	chown ${SUDO_USER}:${SUDO_USER} "${CONFIG_FILE}"
	install -m 0644 "${CONFIG_FILE}" "${FINAL_FILE}"

	echo
fi

echo -e "${GREEN}* Adding the right permissions to the web server${NC}"
# Remove any old entries; we now use /etc/sudoers.d/allsky instead of /etc/sudoers.
sed -i -e '/allsky/d' -e '/www-data/d' /etc/sudoers
do_sudoers
echo

# As of October 2021, ALLSKY_WEBSITE is a subdirectory of ALLSKY_WEBUI.
# Before we remove ALLSKY_WEBUI, save ALLSKY_WEBSITE to the partent of ALLSKY_WEBUI, then restore it.
if [ -d "${ALLSKY_WEBSITE}" ]; then
	TMP_ALLSKY_WEBSITE="$(dirname "${ALLSKY_WEBUI}")"
	echo -e "${GREEN}* Backing up ${ALLSKY_WEBSITE} to ${TMP_ALLSKY_WEBSITE}${NC}"
	sudo mv "${ALLSKY_WEBSITE}" "${TMP_ALLSKY_WEBSITE}"
	ALLSKY_WEBSITE_NAME="$(basename "${ALLSKY_WEBSITE}")"
else
	TMP_ALLSKY_WEBSITE=""
fi

if [ -d "${ALLSKY_WEBUI}" ]; then
	echo -e "${GREEN}* Removing old ${ALLSKY_WEBUI}${NC}"
	rm -rf "${ALLSKY_WEBUI}"
fi

echo -e "${GREEN}* Retrieving github files to build admin portal${NC}"
git clone https://github.com/thomasjacquin/allsky-portal.git "${ALLSKY_WEBUI}"
find "${ALLSKY_WEBUI}/" -type f -exec chmod 644 {} \;
find "${ALLSKY_WEBUI}/" -type d -exec chmod 775 {} \;
# The web server needs to be able to read everything.
chown -R ${SUDO_USER}:www-data "${ALLSKY_WEBUI}"

# These files are updated by the web server so need to be writable by the server.
chown www-data "${CONFIG_DIR}"/raspap.php
chown www-data "${CONFIG_DIR}"/camera_options_ZWO.json
chown www-data "${CONFIG_DIR}"/camera_options_RPiHQ.json

# Restore ALLSKY_WEBSITE if it existed before
if [ "${TMP_ALLSKY_WEBSITE}" != "" ]; then
	echo -e "${GREEN}* Restoring ${TMP_ALLSKY_WEBSITE}/${ALLSKY_WEBSITE_NAME} to ${ALLSKY_WEBUI}${NC}"
	sudo mv "${TMP_ALLSKY_WEBSITE}/${ALLSKY_WEBSITE_NAME}" "${ALLSKY_WEBUI}"
fi

modify_locations	# replace placeholders in some files with actual path names
modify_logrotate	# Set number of weeks of logs that are kept

# XXXXXXXXXXXX   ????    usermod -a -G www-data ${SUDO_USER}
echo

if (whiptail --title "Allsky Software Installer" --yesno "The Allsky WebUI is now installed. You can now reboot the Raspberry Pi and connect to it at this address: http://${HOST_NAME}.local or http://$(hostname -I | sed -e 's/ .*$//')   Would you like to Reboot now?" 10 60 \
	3>&1 1>&2 2>&3); then 
	reboot now
else
	exit 3
fi
