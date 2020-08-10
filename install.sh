#!/bin/bash
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color
echo -en '\n'
echo -e "${RED}**********************************************"
echo    "*** Welcome to the Allsky Camera installer ***"
echo -e "**********************************************${NC}"
echo -en '\n'

echo -en "${GREEN}* Dependencies installation\n${NC}"
apt-get update && apt-get install libopencv-dev libusb-dev libusb-1.0-0-dev ffmpeg gawk lftp jq imagemagick -y
echo -en '\n'

echo -en "${GREEN}* Compile allsky software\n${NC}"
make all
echo -en '\n'

echo -en "${GREEN}* Sunwait installation"
cp sunwait /usr/local/bin
echo -en '\n'

echo -en "${GREEN}* Using the camera without root access\n${NC}"
install asi.rules /etc/udev/rules.d
udevadm control -R
echo -en '\n'

echo -en "${GREEN}* Autostart script\n${NC}"
sed -i '/allsky.sh/d' /etc/xdg/lxsession/LXDE-pi/autostart
sed -i "s|/home/pi/allsky|$PWD|g" autostart/allsky.service
cp autostart/allsky.service /lib/systemd/system/
chown root:root /lib/systemd/system/allsky.service
chmod 0644 /lib/systemd/system/allsky.service
echo -en '\n'

echo -en "${GREEN}* Configure log rotation\n${NC}"
cp autostart/allsky /etc/logrotate.d/
chown root:root /etc/logrotate.d/allsky
chmod 0644 /etc/logrotate.d/allsky
cp autostart/allsky.conf /etc/rsyslog.d/ 
chown root:root /etc/rsyslog.d/allsky.conf
chmod 0644 /etc/rsyslog.d/allsky.conf
echo -en '\n'

echo -en "${GREEN}* Add ALLSKY_HOME environment variable\n${NC}"
echo "export ALLSKY_HOME=$PWD" | sudo tee /etc/profile.d/allsky.sh
echo -en '\n'

echo -en "${GREEN}* Copy camera settings files\n${NC}"
cp settings.json.repo settings.json
cp config.sh.repo config.sh
cp scripts/ftp-settings.sh.repo scripts/ftp-settings.sh
chown -R pi:pi ../allsky
systemctl daemon-reload
systemctl enable allsky.service
echo -en '\n'

echo -en '\n'
echo -en "The Allsky Software is now installed. You should reboot the Raspberry Pi to finish the installation\n"
echo -en '\n'
read -p "Do you want to reboot now? [y/n] " ans_yn
case "$ans_yn" in
  [Yy]|[Yy][Ee][Ss]) reboot now;;

  *) exit 3;;
esac
