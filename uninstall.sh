#!/bin/bash
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

if [[ $EUID -eq 0 ]]; then
   echo "This script must NOT be run as root" 1>&2
   exit 1
fi

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
echo -e "${RED}This will remove all non-config, system files from your computer."
echo
echo "Note: This only removes files in their default location."
echo
read -p "ARE YOU SURE? [y/n] " ans_yn
echo -en "${NC}"
case "$ans_yn" in
  [Yy]|[Yy][Ee][Ss])
    sudo make uninstall
    echo -e "${RED}All non-config system files removed.${NC}"
    echo "A few things of note:"
    echo -e "  - To remove all traces of 'allsky' (${RED}This cannot be undone!${NC}), please run: 'cd; sudo rm -rf allsky'"
    echo "  - If you wish to only remove config files, please run 'sudo make remove_configs'"
    echo "  - If you wish to only remove compiled binaries, please run 'make clean'"
    ;;
  *) exit 3;;
esac
