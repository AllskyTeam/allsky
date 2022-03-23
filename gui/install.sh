#!/bin/bash

if [ -z "${ALLSKY_HOME}" ] ; then
	ALLSKY_HOME=$(realpath "$(dirname "${BASH_ARGV0}")"/..)
	export ALLSKY_HOME
fi
# shellcheck disable=SC1090
source ${ALLSKY_HOME}/variables.sh

echo -en '\n'
echo -e "*********************************************************************"
echo    "*** Welcome to the Allsky Web User Interface (WebUI) installation ***"
echo -e "*********************************************************************"
echo -en '\n'

if [[ $EUID -ne 0 ]]; then
	echo -e "${RED}This script must be run as root${NC}" 1>&2
	exit 1
fi

SCRIPTPATH="$( cd "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"

CONFIG_DIR="/etc/raspap"	# settings_*.json files go here
mkdir -p "${CONFIG_DIR}" || exit 2
modify_locations() {	# Some files have placeholders for certain locations.  Modify them.
	echo -e "${GREEN}* Modifying locations in web files${NC}"
	(
		cd "${PORTAL_DIR}/includes" || exit 1
		# NOTE: Only want to replace the FIRST instance of XX_ALLSKY_HOME_XX in funciton.php
		#       Otherwise, the edit check in functions.php will always fail.
		sed -i "0,/XX_ALLSKY_HOME_XX/{s;XX_ALLSKY_HOME_XX;${ALLSKY_HOME};}" functions.php
		sed -i "s;XX_ALLSKY_HOME_XX;${ALLSKY_HOME};" save_file.php
		sed -i -e "s;XX_ALLSKY_SCRIPTS_XX;${ALLSKY_SCRIPTS};" \
		       -e "s;XX_ALLSKY_IMAGES_XX;${ALLSKY_IMAGES};" \
		       -e "s;XX_ALLSKY_CONFIG_XX;${ALLSKY_CONFIG};" \
		       -e "s;XX_RASPI_CONFIG_XX;${CONFIG_DIR};" \
				functions.php
	)
}

do_sudoers()
{
	echo -e "${GREEN}* Creating/updating sudoers file${NC}"
	sed -e "s;XX_ALLSKY_SCRIPTS_XX;${ALLSKY_SCRIPTS};" ${SCRIPTPATH}/sudoers > /etc/sudoers.d/allsky
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

	if [ ! -d "${PORTAL_DIR}" ]; then
		echo -e "${RED}Update specified but no existing WebUI found in '${PORTAL_DIR}'${NC}" 1>&2
		exit 2
	fi

	modify_locations

	# Add entries to sudoers file if not already there.
	# This is only needed for people who updated allsky-portal but didn't update allsky.
	# Don't simply copy the "allsky" file to /etc/sudoers.d in case "allsky" isn't up to date.
	grep --silent "/usr/bin/vcgencmd" /etc/sudoers.d/allsky &&
	grep --silent "postData.sh" /etc/sudoers.d/allsky
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
service lighttpd restart
echo

echo -e "${GREEN}* Configuring lighttpd${NC}"
# "/home/pi/allsky" is hard coded into file we distribute
sed -i "s|/home/pi/allsky|$(dirname "$SCRIPTPATH")|g" $SCRIPTPATH/lighttpd.conf
install -m 0644 $SCRIPTPATH/lighttpd.conf /etc/lighttpd/lighttpd.conf
echo

if [ "${NEED_TO_UPDATE_HOST_NAME}" = "true" ]; then
	echo -e "${GREEN}* Changing hostname to '${HOST_NAME}'${NC}"
	echo "$HOST_NAME" > /etc/hostname
	sed -i "s/127.0.1.1.*$CURRENT_HOSTNAME/127.0.1.1\t$HOST_NAME/g" /etc/hosts
	echo
else
	echo -e "${GREEN}* Leaving hostname at '${HOST_NAME}'${NC}"
fi

FILE="/etc/avahi/avahi-daemon.conf"
[ -f "${FILE}" ] && grep -i --quiet "host-name=${HOST_NAME}" "${FILE}"
if [ $? -ne 0 ]; then
	# New HOST_NAME not found, or file doesn't exist, so need to configure file.
	echo -e "${GREEN}* Configuring avahi-daemon${NC}"
	install -m 0644 $SCRIPTPATH/avahi-daemon.conf "${FILE}"
	sed -i "s/allsky/$HOST_NAME/g" "${FILE}"	# "allsky" is hard coded in file we distribute
	echo
fi

echo -e "${GREEN}* Adding the right permissions to the web server${NC}"
# Remove any old entries; we now use /etc/sudoers.d/allsky instead of /etc/sudoers.
sed -i -e '/allsky/d' -e '/www-data/d' /etc/sudoers
do_sudoers
echo

# As of October 2021, WEBSITE_DIR is a subdirectory of PORTAL_DIR.
# Before we remove PORTAL_DIR, save WEBSITE_DIR to the partent of PORTAL_DIR, then restore it.
if [ -d "${WEBSITE_DIR}" ]; then
	TMP_WEBSITE_DIR="$(dirname "${PORTAL_DIR}")"
	echo -e "${GREEN}* Backing up ${WEBSITE_DIR} to ${TMP_WEBSITE_DIR}${NC}"
	sudo mv "${WEBSITE_DIR}" "${TMP_WEBSITE_DIR}"
	WEBSITE_DIR_NAME="$(basename "${WEBSITE_DIR}")"
else
	TMP_WEBSITE_DIR=""
fi

if [ -d "${PORTAL_DIR}" ]; then
	echo -e "${GREEN}* Removing old ${PORTAL_DIR}${NC}"
	rm -rf "${PORTAL_DIR}"
fi

echo -e "${GREEN}* Retrieving github files to build admin portal${NC}"
git clone https://github.com/thomasjacquin/allsky-portal.git "${PORTAL_DIR}"
chown -R ${SUDO_USER}:www-data "${PORTAL_DIR}"
chmod -R 775 "${PORTAL_DIR}"

# Restore WEBSITE_DIR if it existed before
if [ "${TMP_WEBSITE_DIR}" != "" ]; then
	echo -e "${GREEN}* Restoring ${TMP_WEBSITE_DIR}/${WEBSITE_DIR_NAME} to ${PORTAL_DIR}${NC}"
	sudo mv "${TMP_WEBSITE_DIR}/${WEBSITE_DIR_NAME}" "${PORTAL_DIR}"
fi

modify_locations	# replace placeholders in some files with actual path names

mv "${PORTAL_DIR}"/raspap.php "${CONFIG_DIR}"
mv "${PORTAL_DIR}"/camera_options_ZWO.json "${CONFIG_DIR}"
mv "${PORTAL_DIR}"/camera_options_RPiHQ.json "${CONFIG_DIR}"

# If the user is doing a re-install, don't overwrite their existing settings.
if [ -f "${CONFIG_DIR}/settings_ZWO.json" ]; then
	echo -e "${GREEN}* Leaving existing ZWO settings file as is.${NC}"
else
	install -m 0644 -o www-data -g www-data ${ALLSKY_CONFIG}/settings_ZWO.json "${CONFIG_DIR}"
fi
if [ -f "${CONFIG_DIR}/settings_RPiHQ.json" ]; then
	echo -e "${GREEN}* Leaving existing RPiHQ settings file as is.${NC}"
else
	install -m 0644 -o www-data -g www-data ${ALLSKY_CONFIG}/settings_RPiHQ.json "${CONFIG_DIR}"
fi
chown -R www-data:www-data "${CONFIG_DIR}"
usermod -a -G www-data $SUDO_USER
echo
# don't leave unused files around
rm -f ${ALLSKY_CONFIG}/settings_ZWO.json ${ALLSKY_CONFIG}/settings_RPiHQ.json

echo -e "${GREEN}* Modify config.sh${NC}"
sed -i "/CAMERA_SETTINGS_DIR=/c\CAMERA_SETTINGS_DIR=\"${CONFIG_DIR}\"" ${ALLSKY_CONFIG}/config.sh
echo -en '\n'

if (whiptail --title "Allsky Software Installer" --yesno "The Allsky WebUI is now installed. You can now reboot the Raspberry Pi and connect to it at this address: http://$HOST_NAME.local or http://$(hostname -I | sed -e 's/ .*$//')   Would you like to Reboot now?" 10 60 \
	3>&1 1>&2 2>&3); then 
	reboot now
else
	exit 3
fi
