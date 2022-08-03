#!/bin/bash

if [ -z "${ALLSKY_HOME}" ]
then
	export ALLSKY_HOME="$(realpath $(dirname "${BASH_ARGV0}"))"
fi
ME="$(basename "${BASH_ARGV0}")"

source "${ALLSKY_HOME}/variables.sh"

if [[ ${EUID} -eq 0 ]]; then
	display_msg error "This script must NOT be run as root, do NOT use 'sudo'."
   exit 1
fi

# This script assumes the user already did the "git clone" into the "allsky" directory.
# Make sure they are running this script in the "allsky" directory.
INSTALL_DIR="allsky"
DIR=$(basename "${PWD}")
if [ "${DIR}" != "${INSTALL_DIR}" ] ; then
	display_msg error "Please run this script from the '${INSTALL_DIR}' directory."
	exit 1
fi

# Location of possible prior version of Allsky.
# If the user wants items copied from there to the new version,
# they should have manually renamed "allsky" to "allsky-OLD" prior to running this script.
PRIOR_INSTALL_DIR="$(dirname ${PWD})/${INSTALL_DIR}-OLD"

echo
echo "************************************************"
echo "*** Welcome to the Allsky Software Installer ***"
echo "************************************************"
echo
TITLE="Allsky Software Installer"


####################### functions
display_msg() {
	if [[ $1 == "error" ]]; then
		echo -e "\n${RED}*** ERROR: "
	elif [[ $1 == "warning" ]]; then
		echo -e "\n${YELLOW}*** WARNING: "
	else
		echo -e "${YELLOW}"
	fi
	echo -e "**********"
	echo -e "${2}"
	echo -e "**********${NC}"
}

usage_and_exit()
{
	RET=${1}
	if [ ${RET} -eq 0 ]; then
		C="${YELLOW}"
	else
		C="${RED}"
	fi
	echo
	echo -e "${C}Usage: ${ME} [--help] [--update]${NC}"
	echo
	echo "'--help' displays this message and exits."
	echo
	echo "'--update' should only be used when instructed to by an Allsky Website page."
	echo
	exit ${RET}
}

calc_wt_size() {
	# NOTE: it's tempting to redirect stderr to /dev/null, so supress error
	# output from tput. However in this case, tput detects neither stdout or
	# stderr is a tty and so only gives default 80, 24 values
	WT_HEIGHT=18
	WT_WIDTH=$(tput cols)
	
	if [ "${WT_WIDTH:-0}" -lt 60 ]; then
		WT_WIDTH=80
	elif [ "${WT_WIDTH}" -gt 178 ]; then
		WT_WIDTH=120
	fi
	WT_MENU_HEIGHT=$((${WT_HEIGHT}-7))
}


# Prompt the user to select their camera type, if we can't determine it automatically.
# If they have a prior installation of Allsky that uses CAMERA_TYPE in config.sh,
# we can use its value and not prompt.
CAMERA_TYPE=""
select_camera_type() {
	NEEDCAM=false

	if [[ ${HAS_PRIOR_ALLSKY} == "true" && ${HAS_NEW_PRIOR_ALLSKY} == "true" ]]; then
		# New style Allsky with CAMERA_TYPE in confgi.sh
		OLD_CONFIG="${PRIOR_INSTALL_DIR}/config/config.sh"
		if [ -f "${OLD_CONFIG}" ]; then
			CAMERA_TYPE=$(source "${OLD_CONFIG}"; echo "${CAMERA_TYPE}")
			[[ ${CAMERA_TYPE} != "" ]] && return
		fi
	fi
	# If they have the "old" style Allsky, don't bother trying to map the old $CAMERA
	# to the new $CAMERA_TYPE.

	CAMERA_TYPE=$(whiptail --title "${TITLE}" --menu "Camera Type" ${WT_HEIGHT} ${WT_WIDTH} ${WT_MENU_HEIGHT} \
		"ZWO"  "ZWO ASI" \
		"RPi"  "Raspberry Pi HQ and compatible" \
		3>&1 1>&2 2>&3)
	if [ $? -ne 0 ]; then
		display_msg warning "Camera selection required.  Please re-run the installation and select a camera to continue."
		exit 1
	fi
}


set_camera_type() {
	if [[ -z ${CAMERA_TYPE} ]]; then
		display_msg error "INTERNAL ERROR: CAMERA_TYPE not set in set_camera_type()."
		return 1
	fi

	"${ALLSKY_SCRIPTS}/makeChanges.sh" "cameraType" "Camera Type" "" "${CAMERA_TYPE}"
	# It displays an error message.
	[ $? -ne 0 ] && return 1

	return 0
}


# Save the camera capabilities and use them to set the WebUI min, max, and defaults.
save_camera_capabilities() {
	# Debug leve 3 to give the user more info on error.
	./capture_${CAMERA_TYPE} -debuglevel 3 -cc_file ${ALLSKY_CONFIG}/cc.json > "${ALLSKY_LOG}" 2>&1
	RET=$?
	if [ ${RET} -ne 0 ]; then
		if [ ${RET} -eq ${EXIT_NO_CAMERA} ]; then
			display_msg error "No camera found."
			display_msg "" "After connecting your camera, run '${ME} --update'."
		else
			display_msg error "Unable to save camera capabilities."
			display_msg "" "Look in ${ALLSKY_LOG} for any messages.\nAfter fixing things, run '${ME} --update'.\n"
		fi
		return 1
	fi

## TODO:
#  then look in file for CAMERA_TYPE and CAMERA_MODEL and rename cc.json to
#  ${CAMERA_TYPE}_${CAMERA_MODEL}.json.
#  Error if the file doesn't exist or capture fails with $? -ne 0.
#  Check for EXIT_NO_CAMERA_CONNECTED ret code

	return 0
}


# Some files have placeholders for certain locations.  Modify them.
modify_locations()
{
	echo -e "${GREEN}* Modifying locations in web files${NC}"
	# Not all files have all variables

	sed -i  -e "s;XX_ALLSKY_HOME_XX;${ALLSKY_HOME};" \
			-e "s;XX_ALLSKY_CONFIG_XX;${ALLSKY_CONFIG};" \
			-e "s;XX_ALLSKY_SCRIPTS_XX;${ALLSKY_SCRIPTS};" \
			-e "s;XX_ALLSKY_IMAGES_XX;${ALLSKY_IMAGES};" \
			-e "s;XX_ALLSKY_MESSAGES_XX;${ALLSKY_MESSAGES};" \
			-e "s;XX_ALLSKY_WEBUI_XX;${ALLSKY_WEBUI};" \
			-e "s;XX_ALLSKY_WEBSITE_XX;${ALLSKY_WEBSITE};" \
			-e "s;XX_ALLSKY_OWNER_XX;${ALLSKY_OWNER};" \
			-e "s;XX_ALLSKY_GROUP_XX;${ALLSKY_GROUP};" \
			-e "s;XX_RASPI_CONFIG_XX;${ALLSKY_CONFIG};" \
		"${ALLSKY_WEBUI}/includes/functions.php"
}

REPO_SUDOERS_FILE="${ALLSKY_REPO}/sudoers.repo"
FINAL_SUDOERS_FILE="/etc/sudoers.d/allsky"
do_sudoers()
{
	echo -e "${GREEN}* Creating/updating sudoers file${NC}"
	sed -e "s;XX_ALLSKY_SCRIPTS_XX;${ALLSKY_SCRIPTS};" "${REPO_SUDOERS_FILE}"  >  /tmp/x
	sudo install -m 0644 /tmp/x "${FINAL_SUDOERS_FILE}" && rm -f /tmp/x
}

ask_reboot() {
	if (whiptail --title "${TITLE}" --yesno "The Allsky Software is now installed. You must reboot the Raspberry Pi to finish the installation.\nAfter reboot you can connect to the WebUI at: http://${NEW_HOST_NAME}.local or http://$(hostname -I | sed -e 's/ .*$//')\n\n  Reboot now?" 10 60 \
		3>&1 1>&2 2>&3); then 
		sudo reboot now
	else
		display_msg warning "You will need to reboot the Pi before Allsky will work."
		exit 3
	fi
}


####################### main part of program

# Check arguments
OK=true
HELP=false
UPDATE=false
while [ $# -gt 0 ]; do
	ARG="${1}"
	case "${ARG}" in
		--help)
			HELP=true
			;;
		--update)
			UPDATE=true
			;;
		*)
			display_msg error "Unknown argument: '${ARG}'."
			OK="false"
			;;
	esac
	shift
done
[[ ${HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" ]] && usage_and_exit 1

calc_wt_size

if [[ ${UPDATE} == "true" ]]; then
	echo -en '\n'
	echo -e "***************************************"
	echo    "*** Performing update of the Allsky ***"
	echo -e "***************************************"
	echo -en '\n'

	save_camera_capabilities
	modify_locations

	# Update the sudoers file if it's missing some entries.
	# Look for the last entry added (should be the last entry in the file).
	# Don't simply copy the repo file to the final location in case the repo file isn't up to date.
	grep --silent "truncate" "${FINAL_SUDOERS_FILE}"
	# shellcheck disable=SC2181
	if [ $? -ne 0 ]; then
		echo -e "${GREEN}* Updating sudoers list${NC}"
		grep --silent "truncate" "${REPO_SUDOERS_FILE}"
		# shellcheck disable=SC2181
		if [ $? -ne 0 ]; then
				echo -e "${RED}Please get the newest '$(basename "${REPO_SUDOERS_FILE}")' file from Git and try again.${NC}"
			exit 2
		fi
		do_sudoers
	fi

	exit 0
fi


# If there's a prior version of the software,
# ask the user if they want to move stuff from there to the new directory.
# Look for a directory inside the old one to make sure it's really an old allsky.
HAS_PRIOR_ALLSKY=false
if [ -d "${PRIOR_INSTALL_DIR}/images" ]; then
	if (whiptail --title "${TITLE}" --yesno "You appear to have a prior version of Allsky in ${PRIOR_INSTALL_DIR}.\n\nDo you want to restore the prior images, any darks, and certain configuration settings?" 10 60 \
		3>&1 1>&2 2>&3); then 
		HAS_PRIOR_ALLSKY=true
		if [ -f  "${PRIOR_INSTALL_DIR}/version" ]; then
			HAS_NEW_PRIOR_ALLSKY=true		# New style Allsky with CAMERA_TYPE set in config.sh
		else
			HAS_NEW_PRIOR_ALLSKY=false		# Old style with CAMERA set in config.sh
		fi
	else
		display_msg warning "If you want your old images, darks, etc. from the prior verion"
		display_msg "" "of Allsky, you'll need to manually move them to the new version.\n"
	fi
else
	if (whiptail --title "${TITLE}" --yesno "You do not appear to have prior version of Allsky.\nIf you DO, and you want items moved from the prior version to the new one\n, make sure the prior version is in ${PRIOR_INSTALL_DIR}.\n\nDo you want to continue withOUT using the prior version?" 10 60 \
		3>&1 1>&2 2>&3); then 
		true
	else
		display_msg "" "* Rename the directory with your prior version of Allsky to\n'${PRIOR_INSTALL_DIR}', then run the installation again.\n"
		exit 0
	fi
fi

select_camera_type


echo -e "${GREEN}* Installing dependencies\n${NC}"
sudo make deps
if [ $? -ne 0 ]; then
	echo "Installing dependencies failed"
	exit 1
fi
echo

echo -e "${GREEN}* Compile and install Allsky software\n${NC}"
make all
if [ $? -ne 0 ]; then
	echo "Compile failed!"
	exit 1
fi
sudo make install
if [ $? -ne 0 ]; then
	echo "Install failed!"
	exit 1
fi
echo

chmod 755 "${ALLSKY_HOME}"	# Some versions of Linux default to 750 so web server can't read it

# Create the log file and make it readable by the user; this aids in debugging.
ALLSKY_LOG="/var/log/allsky.log"
echo -e "${GREEN}* Set permissions on Allsky log (${ALLSKY_LOG})\n${NC}"
ALLSKY_OWNER=$(id --group --name)
ALLSKY_GROUP=${ALLSKY_OWNER}
sudo touch "${ALLSKY_LOG}"
sudo chmod 664 "${ALLSKY_LOG}"
sudo chgrp ${ALLSKY_GROUP} "${ALLSKY_LOG}"

# Restore any necessary file
if [[ ${HAS_PRIOR_ALLSKY} == "true" ]]; then
	if [ -d "${PRIOR_INSTALL_DIR}/images" ]; then
		echo -e "${GREEN}* Restoring images.${NC}"
		mv "${PRIOR_INSTALL_DIR}/images" "${ALLSKY_HOME}"
	fi

	if [ -d "${PRIOR_INSTALL_DIR}/darks" ]; then
		echo -e "${GREEN}* Restoring darks.${NC}"
		mv "${PRIOR_INSTALL_DIR}/darks" "${ALLSKY_HOME}"
	fi

	PRIOR_WEBSITE="${PRIOR_INSTALL_DIR}/html/allsky"
	if [ -d "${PRIOR_WEBSITE}" ]; then
		echo -e "${GREEN}* Restoring darks.${NC}"
		mv "${PRIOR_WEBSITE}" "${ALLSKY_WEBSITE}/.."
	fi

	if [ -f "${PRIOR_INSTALL_DIR}/config/raspap.auth" ]; then
		echo -e "${GREEN}* Restoring WebUI security settings.${NC}"
		mv "${PRIOR_INSTALL_DIR}/config/raspap.auth" "${ALLSKY_CONFIG}"
	fi
	if [ -f "${PRIOR_INSTALL_DIR}/config/raspap.php" ]; then
		mv "${PRIOR_INSTALL_DIR}/config/raspap.php" "${ALLSKY_CONFIG}"
	fi

	if [ -f "${PRIOR_INSTALL_DIR}/config/configuration.json" ]; then
		echo -e "${GREEN}* Restoring remote Allsky Website configuration.${NC}"
		mv "${PRIOR_INSTALL_DIR}/config/configuration.json" "${ALLSKY_CONFIG}"
	fi

	echo -e "${GREEN}* Restoring settings from configuration files.${NC}"
	# This may miss really-old variables that no longer exist.
## TODO: automate this
# ( source ${PRIOR_INSTALL_DIR}/config/ftp-settings.sh
#	for each variable:
#		/^variable/ c;variable=$oldvalue;
# ) > /tmp/x
# sed -i --file=/tmp/x "${ALLSKY_CONFIG}/ftp-settings.sh"
# rm -f /tmp/x

# similar for config.sh, but
#	- don't transfer CAMERA
#	- handle renames
#	- handle variable that were moved to WebUI
#		> DAYTIME_CAPTURE

	display_msg "" "IMPORTANT: check config/config.sh and config/ftp-settings.sh for correctness.\n"
fi

if [[ ${NEEDCAM} == "true" ]]; then
	set_camera_type
fi

### TODO: Check for size of RAM+swap during installation (Issue # 969).

### FUTURE: Prompt to install SSL certificate

echo -e "${GREEN}* Configure the WebUI.\n${NC}"
CURRENT_HOSTNAME=$(tr -d " \t\n\r" < /etc/hostname)
NEW_HOST_NAME='allsky'

# If the Pi is already called ${NEW_HOST_NAME},
# then the user already updated the name, so don't prompt again.
if [ "${CURRENT_HOSTNAME}" != "${NEW_HOST_NAME}" ]; then
	NEW_HOST_NAME=$(whiptail --title "${TITLE}" --inputbox "Please enter a hostname for your Pi" 20 60 "${NEW_HOST_NAME}" 3>&1 1>&2 2>&3)
	if [ "${CURRENT_HOSTNAME}" != "${NEW_HOST_NAME}" ]; then
		echo "${NEW_HOST_NAME}" | sudo tee /etc/hostname > /dev/null
		sudo sed -i "s/127.0.1.1.*${CURRENT_HOSTNAME}/127.0.1.1\t${NEW_HOST_NAME}/" /etc/hosts
	fi
fi

echo -e "${GREEN}* Installing the lighttpd webserver and its dependencies${NC}"
echo
sudo apt-get update && sudo apt-get install -y lighttpd php-cgi php-gd hostapd dnsmasq avahi-daemon
sudo systemctl stop lighttpd 2> /dev/null
sudo rm -fr /var/log/lighttpd/*		# Start off with a clean log file.
sudo lighty-enable-mod fastcgi-php 2> /dev/null

REPO_LIGHTTPD_FILE="${ALLSKY_REPO}/lighttpd.conf.repo"
FINAL_LIGHTTPD_FILE="/etc/lighttpd/lighttpd.conf"
sed \
	-e "s;XX_ALLSKY_WEBUI_XX;${ALLSKY_WEBUI};g" \
	-e "s;XX_ALLSKY_HOME_XX;${ALLSKY_HOME};g" \
	-e "s;XX_ALLSKY_IMAGES_XX;${ALLSKY_IMAGES};g" \
	-e "s;XX_ALLSKY_WEBSITE_XX;${ALLSKY_WEBSITE};g" \
	-e "s;XX_ALLSKY_DOCUMENTATION_XX;${ALLSKY_DOCUMENTATION};g" \
		"${REPO_LIGHTTPD_FILE}"  >  /tmp/x
sudo install -m 0644 /tmp/x "${FINAL_LIGHTTPD_FILE}" && rm -f /tmp/x
sudo systemctl start lighttpd
echo

FINAL_AVI_FILE="/etc/avahi/avahi-daemon.conf"
[ -f "${FINAL_AVI_FILE}" ] && grep -i --quiet "host-name=${NEW_HOST_NAME}" "${FINAL_AVI_FILE}"
if [ $? -ne 0 ]; then
	# New NEW_HOST_NAME not found in file, or file doesn't exist, so need to configure file.
	echo -e "${GREEN}* Configuring avahi-daemon${NC}"
	REPO_AVI_FILE="${ALLSKY_REPO}/avahi-daemon.conf.repo"
	sed "s/XX_HOST_NAME_XX/${NEW_HOST_NAME}/g" "${REPO_AVI_FILE}" > /tmp/x
	sudo install -m 0644 /tmp/x "${FINAL_AVI_FILE}" && rm -f /tmp/x
	echo
fi

echo -e "${GREEN}* Adding the right permissions to the webserver${NC}"
# Remove any old entries; we now use /etc/sudoers.d/allsky instead of /etc/sudoers.
sudo sed -i -e '/allsky/d' -e '/www-data/d' /etc/sudoers
do_sudoers
echo

# TODO: If there was an ${ALLSKY_WEBSITE}, set its old location to ${ALLSKY_WEBSITE_OLD},
# which may be in /var/www/html/allsky.

# Restore files from any prior ALLSKY_WEBSITE.
# Note: This MUST come before the old WebUI check below so we don't remove the website
# before moving the files to the new location.
if [ "${ALLSKY_WEBSITE_OLD}" != "" ]; then
	echo -e "${GREEN}* Restoring ${ALLSKY_WEBSITE_OLD}${NC}"
	OK=true
	if [ -d "${ALLSKY_WEBSITE}" ]; then
		# Hmmm.  There's an old webite AND a new one.
		# Try to remove the new one - if it's not empty the remove will fail.
		rmdir "${ALLSKY_WEBSITE}" 
		if [ $? -ne 0 ]; then
			display_msg error "* New website in '${ALLSKY_WEBSITE}' is not empty."
			display_msg "" "  Move the contents manually from '${ALLSKY_WEBSITE_OLD}',"
			display_msg "" "  and then remove the old location.\n"
			OK=false
		fi
	fi
	[[ ${OK} = "true" ]] && sudo mv "${ALLSKY_WEBSITE_OLD}" "${ALLSKY_WEBSITE}"
fi

# Check if a WebUI exists in the old location.
OLD_WEBUI_LOCATION="/var/www/html"
OLD_WEBSITE="${OLD_WEBUI_LOCATION}/allsky"

if [ -d "${OLD_WEBUI_LOCATION}" ]; then
	if (whiptail --title "${TITLE}" --yesno "An old version of the WebUI was found in ${OLD_WEBUI_LOCATION}; it is no longer being used so do you want to remove it?" 10 60 \
		3>&1 1>&2 2>&3); then 
		echo -e "${GREEN}* Removing old WebUI in ${OLD_WEBUI_LOCATION}${NC}"

		# If an Allsky Website exists, save it before possibly blowing away the old WebUI.
		SAVED_OLD_WEBSITE=""
		if [ -d "${OLD_WEBSITE}" ]; then	# Save it
			SAVED_OLD_WEBSITE="$(dirname "${OLD_WEBUI_LOCATION}")"
			sudo mv "${OLD_WEBSITE}" "${SAVED_OLD_WEBSITE}"
		fi

		sudo rm -fr "${OLD_WEBUI_LOCATION}"

		if [[ -n ${SAVED_OLD_WEBSITE} ]]; then		# Restore it
			sudo mkdir "${OLD_WEBUI_LOCATION}"
			sudo mv "${SAVED_OLD_WEBSITE}" "${OLD_WEBSITE}"
		fi

	else	# they don't want to remove the old WebUI.
		display_msg warning "The old WebUI files are no longer used and are just taking up disk space."
	fi
fi

echo -e "${GREEN}* Setting permissions on WebUI files.${NC}"
# The files should already be the correct permissions/owners, but just in case, set them.
find "${ALLSKY_WEBUI}/" -type f -exec chmod 644 {} \;
find "${ALLSKY_WEBUI}/" -type d -exec chmod 755 {} \;
chmod 755 "${ALLSKY_WEBUI}/includes/createAllskyOptions.php"	# executable .php file


# Check if there's an outdated website in the old or new location.
# If so, suggest the user update it after the reboot.
if [ -d "${OLD_WEBSITE}" ]; then
	display_msg warning "There is an old version of the Allsky Website in ${OLD_WEBSITE}."
	display_msg "" "You should update to the newest version after rebooting your Pi"
	display_msg "" "by executing 'cd ~/allsky; website/install.sh'.\n"

elif [[ ${HAS_PRIOR_ALLSKY} == "true" && -d "${PRIOR_INSTALL_DIR}/html/allsky" ]]; then
	# Newer location of website - see if it's the current version.
	OLD_VERSION=$(< "${PRIOR_INSTALL_DIR}/version")
	NEW_VERSION="$(curl "${GITHUB_RAW_ROOT}/allsky-website/version")"
	if [[ ${OLD_VERSION} != ${NEW_VERSION} ]]; then
		display_msg warning "There is a newer Allsky Website and we suggest you upgrade to it."
		display_msg "" "Your    version: ${OLD_VERSION}"
		display_msg "" "Current version: ${NEW_VERSION}"
		display_msg "" "\nAFTER you reboot, you can upgrade by executing:"
		display_msg "" "     cd ~/allsky; website/install.sh\n"
	fi
fi

######## All done

ask_reboot
