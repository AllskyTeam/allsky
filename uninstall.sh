#!/bin/bash

[[ -z "${ALLSKY_HOME}" ]] && export ALLSKY_HOME="$(realpath "$(dirname "${BASH_ARGV0}")")"
# ME="$(basename "${BASH_ARGV0}")"

#shellcheck disable=SC2086 source-path=.
source "${ALLSKY_HOME}/variables.sh"			|| exit ${ALLSKY_ERROR_STOP}

cd ~/${ALLSKY_INSTALL_DIR}  || exit 1

MSG="This will remove all non-config, system files from your computer.\n"
MSG="${MSG}Note: This only removes files in their default location.\n"
MSG="${MSG}\nContinue?"
if whiptail --title "${TITLE}" --yesno "${MSG}" 10 60 3>&1 1>&2 2>&3; then 
    sudo make uninstall

	echo
    echo -e "${GREEN}All non-config system files removed.${NC}"
	echo
    echo -e "A few things of note:"
    echo -e "  - To remove ALL traces of 'allsky' (${RED}This cannot be undone!${NC}), run:"
# TODO: remove everything else, e.g., website if installed, lighttpd, ...
	echo -e "     ${YELLOW}cd; sudo rm -rf allsky${NC}"
	echo
    echo -e "  - If you wish to only remove config files, run:"
	echo -e "     ${YELLOW}sudo make remove_configs${NC}"
	echo
    echo -e "  - If you wish to only remove compiled binaries, run:"
	echo -e "     ${YELLOW}make clean${NC}"
	echo
	exit 0
else
	echo -e "\n${YELLOW}Nothing removed.${NC}\n"
	exit 3
fi
