#!/bin/bash
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color
echo -en '\n'
echo -e "${RED}**********************************************"
echo    "*** Welcome to the Allsky Camera installer ***"
echo -e "**********************************************${NC}"
echo -en '\n'
echo -en "${GREEN}* Sunwait installation"
cp sunwait /usr/local/bin
echo -en '\n'
echo -en "${GREEN}* Dependencies installation\n${NC}"
apt-get update && apt-get install libopencv-dev libusb-dev libav-tools gawk lftp jq imagemagick -y
echo -en '\n'
echo -en "${GREEN}* Using the camera without root access\n${NC}"
install asi.rules /lib/udev/rules.d
echo -en '\n'
echo -en "${GREEN}* Autostart script\n${NC}"
sed -i '/allsky.sh/d' /home/pi/.config/lxsession/LXDE-pi/autostart
cp autostart/allsky.service /lib/systemd/system/
chown root:root /lib/systemd/system/allsky.service
chmod 0644 /lib/systemd/system/allsky.service
cp autostart/allsky /etc/logrotate.d/
chown root:root /etc/logrotate.d/allsky
chmod 0644 /etc/logrotate.d/allsky
cp autostart/allsky.conf /etc/rsyslog.d/
chown root:root /etc/rsyslog.d/allsky.conf
chmod 0644 /etc/rsyslog.d/allsky.conf
echo -en '\n'
echo -en "${GREEN}* Compile allsky software\n${NC}"
make all
echo -en '\n'
echo -en "${GREEN}* Copy camera settings files\n${NC}"
cp settings.json.repo settings.json
cp config.sh.repo config.sh
cp scripts/ftp-settings.sh.repo scripts/ftp-settings.sh
chown -R pi:pi ../allsky
echo -en '\n'
echo -en '\n'
echo -en "The Allsky Camera is now installed. Starting service now\n"
systemctl daemon-reload
systemctl enable allsky.service
systemctl start allsky.service
