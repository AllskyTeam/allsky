#!/bin/bash
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

if [[ $EUID -eq 0 ]]; then
   echo "This script must NOT be run as root" 1>&2
   exit 1
fi
# The user should be running this in the "allsky" directory.  Make sure they are.
INSTALL_DIR="allsky"
DIR=$(basename "$PWD")
if [ "$DIR" != "$INSTALL_DIR" ] ; then
	(echo
	 echo -e "${RED}**********"
	 echo -e "Please run this script from the '$INSTALL_DIR' directory."
	 echo -e "**********${NC}"
	 echo) 1>&2
	exit 1
fi

echo -en '\n'
echo -e "**********************************************"
echo    "*** Welcome to the Allsky Camera installer ***"
echo -e "**********************************************"
echo -en '\n'

echo -en "${GREEN}* Dependencies installation\n${NC}"
sudo apt update && sudo apt -y install libopencv-dev libusb-dev libusb-1.0-0-dev ffmpeg gawk lftp jq imagemagick
echo -en '\n'

echo -en "${GREEN}* Compile allsky software\n${NC}"
make all
echo -en '\n'

# Make sure all scripts are executable
chmod 755 allsky.sh scripts/*.sh

echo -en "${GREEN}* Sunwait installation"
sudo install sunwait /usr/local/bin/
echo -en '\n'

echo -en "${GREEN}* Allow using the camera without root access\n${NC}"
sudo install -D -m 0644 asi.rules /etc/udev/rules.d/
sudo udevadm control -R
echo -en '\n'

echo -en "${GREEN}* Autostart script\n${NC}"
[ -e /etc/xdg/lxsession/LXDE-pi/autostart ] && sudo sed -i '/allsky.sh/d' /etc/xdg/lxsession/LXDE-pi/autostart
sed -i "s|User=pi|User=$USER|g" autostart/allsky.service
sed -i "s|/home/pi/allsky|$PWD|g" autostart/allsky.service
sudo install -D -m 0644 autostart/allsky.service /etc/systemd/system/
sudo rm -f /lib/systemd/system/allsky.service     # remove file from prior version of AllSky
echo -en '\n'

echo -en "${GREEN}* Configure log rotation\n${NC}"
sudo install -D -m 0644 autostart/allsky /etc/logrotate.d/
sudo install -D -m 0644 autostart/allsky.conf /etc/rsyslog.d/ 
echo -en '\n'

echo -en "${GREEN}* Add ALLSKY_HOME environment variable\n${NC}"
echo "export ALLSKY_HOME=$PWD" | sudo tee /etc/profile.d/allsky.sh &> /dev/null
echo -en '\n'

echo -en "${GREEN}* Copy camera settings files\n${NC}"
[ ! -e settings_ZWO.json ] && cp settings_ZWO.json.repo settings_ZWO.json
[ ! -e settings_RPiHQ.json ] && cp settings_RPiHQ.json.repo settings_RPiHQ.json
[ ! -e config.sh ] && cp config.sh.repo config.sh
[ ! -e scripts/ftp-settings.sh ] && cp scripts/ftp-settings.sh.repo scripts/ftp-settings.sh
sudo chown -R $USER:$USER ./
sudo systemctl daemon-reload
sudo systemctl enable allsky.service
echo -en '\n'

echo -en '\n'
echo -en "The Allsky Software is now installed. You should reboot the Raspberry Pi to finish the installation\n"
echo -en '\n'
read -p "Do you want to reboot now? [y/n] " ans_yn
case "$ans_yn" in
  [Yy]|[Yy][Ee][Ss]) sudo reboot now;;

  *) exit 3;;
esac
