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

CAM=""
NEEDCAM=0

echo
echo "**********************************************"
echo "*** Welcome to the Allsky Camera installer ***"
echo "**********************************************"
echo
source "variables.sh"

calc_wt_size() {
	# NOTE: it's tempting to redirect stderr to /dev/null, so supress error
	# output from tput. However in this case, tput detects neither stdout or
	# stderr is a tty and so only gives default 80, 24 values
	WT_HEIGHT=18
	WT_WIDTH=$(tput cols)
	
	if [ -z "$WT_WIDTH" ] || [ "$WT_WIDTH" -lt 60 ]; then
		WT_WIDTH=80
	fi
	if [ "$WT_WIDTH" -gt 178 ]; then
		WT_WIDTH=120
	fi
	WT_MENU_HEIGHT=$(($WT_HEIGHT-7))
}

select_camera() {
	NEEDCAM=0
	if [ ! -e ${ALLSKY_CONFIG}/config.sh ]; then
		NEEDCAM=1
	else
		source ${ALLSKY_CONFIG}/config.sh
		if [ -z "${CAM}" ]; then
			NEEDCAM=1
		fi
	fi
	if [ $NEEDCAM -eq 1 ]; then
		MYCAM=$(whiptail --title "Allsky Software Installer" --menu "Camera Type" $WT_HEIGHT $WT_WIDTH $WT_MENU_HEIGHT \
			"ZWO" "ZWO camera is used for allsky" \
			"RPiHQ" "RPiHQ camera is used for allsky" \
			3>&1 1>&2 2>&3)
		if [ $? -eq 0 ]; then
			CAM=$MYCAM
		else
			whiptail --msgbox "Camera selection required.  Please re-run './install.sh' and select a camera to continue." 10 60 2
			exit 1
		fi
	fi
}

set_camera() {
	sed -i -e "s/^CAMERA=.*$/CAMERA=\"${CAM}\"/" "$ALLSKY_CONFIG/config.sh"
	RETVAL=$?
	if [ $RETVAL -eq 0 ]; then
		whiptail --msgbox "Camera set to $CAM" 10 60 2
		return 0
	else
		whiptail --msgbox "Something went wrong setting camera to ${CAM}.  Error code ${RETVAL}?" 10 60 2
		return 1
	fi
}


ask_reboot() {
	if (whiptail --title "Allsky Software Installer" --yesno "The Allsky Software is now installed. You should reboot the Raspberry Pi to finish the installation.\n\n  Reboot now?" 10 60 \
		3>&1 1>&2 2>&3); then 
		sudo reboot now
	else
		exit 3
	fi
}

calc_wt_size
select_camera

echo -e "${GREEN}* Dependencies installation\n${NC}"
sudo make deps
RETVAL=$?
if [ $RETVAL -ne 0 ]; then
	echo Installing dependencies failed\!
	exit 1
fi
echo

echo -e "${GREEN}* Compile allsky software\n${NC}"
make all
RETVAL=$?
if [ $RETVAL -ne 0 ]; then
	echo Compile failed\!
	exit 1
fi
echo

echo -e "${GREEN}* Install allsky software\n${NC}"
sudo make install
RETVAL=$?
if [ $RETVAL -ne 0 ]; then
	echo Install failed\!
	exit 1
fi
echo

set_camera
ask_reboot
