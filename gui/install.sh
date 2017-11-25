#!/bin/bash
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color
echo -en '\n'
echo -e "${RED}****************************************************************"
echo    "*** Welcome to the Allsky Administration Portal installation ***"
echo -e "****************************************************************${NC}"
echo -en '\n'
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root" 1>&2
   exit 1
fi
echo -e "${GREEN}* Installation of the webserver${NC}"
echo -en '\n'
apt-get update && apt-get install -y lighttpd php7.0-cgi hostapd dnsmasq avahi-daemon
lighty-enable-mod fastcgi-php
service lighttpd restart
echo -en '\n'
echo -e "${GREEN}* Configuring lighttpd${NC}"
cp /home/pi/allsky/lighttpd.conf /etc/httpd/httpd.conf
echo -en '\n'
echo -e "${GREEN}* Changing hostname to allsky${NC}"
echo "allsky" > /etc/hostname
sed -i 's/raspberrypi/allsky/g' /etc/hosts
echo -en '\n'
echo -e "${GREEN}* Adding the right permissions to the web server${NC}"
cat sudoers >> /etc/sudoers
echo -en '\n'
echo -e "${GREEN}* Retrieving github files to build admin portal${NC}"
rm -rf /var/www/html
git clone https://github.com/thomasjacquin/allsky-portal.git /var/www/html
chown -R www-data:www-data /var/www/html
mkdir /etc/raspap
mv /var/www/html/raspap.php /etc/raspap/
chown -R www-data:www-data /etc/raspap
usermod -a -G www-data pi
echo -en '\n'
echo -e "${GREEN}* Replacing allsky.sh${NC}"
mv -f /var/www/html/allsky.sh /home/pi/allsky/
echo -en '\n'
echo -e "${GREEN}* Modify config.sh${NC}"
printf "CAMERA_SETTINGS='/var/www/html/settings.json'\n" >> ../config.sh
cp settings.json /var/www/html/settings.json
echo -en '\n'
echo -en '\n'
echo "The Allsky Portal is now installed"
echo "You can now reboot the Raspberry Pi and connect to it from your laptop, computer, phone, tablet at this address: http://allsky.local"
echo -en '\n'
read -p "Do you want to reboot now? [y/n] " ans_yn
case "$ans_yn" in
  [Yy]|[Yy][Ee][Ss]) reboot now;;

  *) exit 3;;
esac
