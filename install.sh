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

echo
echo "**********************************************"
echo "*** Welcome to the Allsky Camera installer ***"
echo "**********************************************"
echo

echo -e "${GREEN}* Dependencies installation\n${NC}"
sudo make -C src deps
RETVAL=$?
if [ $RETVAL -ne 0 ]; then
	echo Installing dependencies failed\!
	exit 1
fi
echo

echo -e "${GREEN}* Compile allsky software\n${NC}"
make -C src all
RETVAL=$?
if [ $RETVAL -ne 0 ]; then
	echo Compile failed\!
	exit 1
fi
echo

echo -e "${GREEN}* Install allsky software\n${NC}"
sudo make -C src install
RETVAL=$?
if [ $RETVAL -ne 0 ]; then
	echo Install failed\!
	exit 1
fi
echo

echo
echo "The Allsky Software is now installed. You should reboot the Raspberry Pi to finish the installation"
echo
read -p "Do you want to reboot now? [y/n] " ans_yn
case "$ans_yn" in
  [Yy]|[Yy][Ee][Ss]) sudo reboot now;;

  *) exit 3;;
esac
