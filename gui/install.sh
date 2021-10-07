#!/bin/bash

if [ -z "${ALLSKY_HOME}" ] ; then
	export ALLSKY_HOME=$(realpath $(dirname "${BASH_ARGV0}")/..)
fi
source ${ALLSKY_HOME}/variables.sh

if [ $# -eq 1 ] ; then
	HOST_NAME=$1
else
	HOST_NAME='allsky'
fi

echo -en '\n'
echo -e "****************************************************************"
echo    "*** Welcome to the Allsky Administration Portal installation ***"
echo -e "****************************************************************"
echo -en '\n'
if [[ $EUID -ne 0 ]]; then
   echo "${RED}This script must be run as root${NC}" 1>&2
   exit 1
fi
echo -e "${GREEN}* Installation of the webserver${NC}"
echo -en '\n'
apt-get update && apt-get install -y lighttpd php-cgi php-gd hostapd dnsmasq avahi-daemon
lighty-enable-mod fastcgi-php
service lighttpd restart
echo -en '\n'

SCRIPTPATH="$( cd "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"
echo -e "${GREEN}* Configuring lighttpd${NC}"
sed -i "s|/home/pi/allsky|$(dirname "$SCRIPTPATH")|g" $SCRIPTPATH/lighttpd.conf
install -m 0644 $SCRIPTPATH/lighttpd.conf /etc/lighttpd/lighttpd.conf
echo -en '\n'

echo -e "${GREEN}* Changing hostname to allsky${NC}"
echo "$HOST_NAME" > /etc/hostname
sed -i "s/raspberrypi/$HOST_NAME/g" /etc/hosts
echo -en '\n'

echo -e "${GREEN}* Setting avahi-daemon configuration${NC}"
install -m 0644 $SCRIPTPATH/avahi-daemon.conf /etc/avahi/avahi-daemon.conf
sed -i "s/allsky/$HOST_NAME/g" /etc/avahi/avahi-daemon.conf
echo -en '\n'

echo -e "${GREEN}* Adding the right permissions to the web server${NC}"
sed -i '/allsky/d' /etc/sudoers
sed -i '/www-data/d' /etc/sudoers
rm -f /etc/sudoers.d/allsky
cat $SCRIPTPATH/sudoers >> /etc/sudoers.d/allsky
echo -en '\n'

echo -e "${GREEN}* Retrieving github files to build admin portal${NC}"
# As of October 2021, WEBSITE_DIR is a subdirectory of PORTAL_DIR.
# Before we remove all of PORTAL_DIR, save WEBSITE_DIR to the partent of PORTAL_DIR, then restore it.
if [ -d "${WEBSITE_DIR}" ]; then
	TMP_WEBSITE_DIR="$(dirname "${PORTAL_DIR}")"
	sudo mv "${WEBSITE_DIR}" "${TMP_WEBSITE_DIR}"
else
	TMP_WEBSITE_DIR=""
fi
rm -rf "${PORTAL_DIR}"
git clone https://github.com/thomasjacquin/allsky-portal.git "${PORTAL_DIR}"
chown -R ${SUDO_USER}:www-data "${PORTAL_DIR}"
chmod -R 775 "${PORTAL_DIR}"
# Restore WEBSITE_DIR if it existed before
if [ "${TMP_WEBSITE_DIR}" != "" ]; then
	sudo mv "${TMP_WEBSITE_DIR}" "${PORTAL_DIR}"
fi
mkdir -p /etc/raspap
mv "${PORTAL_DIR}"/raspap.php /etc/raspap/
mv "${PORTAL_DIR}"/camera_options_ZWO.json /etc/raspap/
mv "${PORTAL_DIR}"/camera_options_RPiHQ.json /etc/raspap/
install -m 0644 -o www-data -g www-data ${ALLSKY_CONFIG}/settings_ZWO.json /etc/raspap/
install -m 0644 -o www-data -g www-data ${ALLSKY_CONFIG}/settings_RPiHQ.json /etc/raspap/
chown -R www-data:www-data /etc/raspap
usermod -a -G www-data $SUDO_USER
echo -en '\n'
rm -f ${ALLSKY_CONFIG}/settings_ZWO.json ${ALLSKY_CONFIG}/settings_RPiHQ.json	# don't leave unused files around

echo -e "${GREEN}* Modify config.sh${NC}"
sed -i '/CAMERA_SETTINGS_DIR=/c\CAMERA_SETTINGS_DIR="/etc/raspap"' ${ALLSKY_CONFIG}/config.sh
echo -en '\n'

echo -en '\n'
echo "The Allsky Portal is now installed"
echo "You can now reboot the Raspberry Pi and connect to it from your laptop, computer, phone, tablet at this address: http://$HOST_NAME.local or http://$(hostname -I | sed -e 's/ .*$//')"
echo -en '\n'
read -p "Do you want to reboot now? [y/n] " ans_yn
case "$ans_yn" in
  [Yy]|[Yy][Ee][Ss]) reboot now;;

  *) exit 3;;
esac
