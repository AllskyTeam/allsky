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
echo -en "${GREEN}* Dependencies installation${NC}"
apt-get update && apt-get install libopencv-dev libusb-dev libav-tools gawk lftp entr xterm imagemagick -y
echo -en '\n'
echo -en "${GREEN}* Using the camera without root access${NC}"
install asi.rules /lib/udev/rules.d
echo -en '\n'
echo -en "${GREEN}* Copying shared libraries to user library${NC}"
cp lib/libASICamera2* /usr/local/lib
ldconfig
echo -en '\n'
echo -en "${GREEN}* Autostart script${NC}"
echo "@xterm -hold -e /home/pi/allsky/allsky.sh" >> /home/pi/.config/lxsession/LXDE-pi/autostart
echo -en '\n'
echo -en "${GREEN}* Compile allsky software${NC}"
make capture
echo -en '\n'
echo -en '\n'
echo "The Allsky Camera is now installed."
echo "You can now reboot the Raspberry Pi."
echo -en '\n'
read -p "Do you want to reboot now? [y/n] " ans_yn
case "$ans_yn" in
  [Yy]|[Yy][Ee][Ss]) reboot now;;

  *) exit 3;;
esac
