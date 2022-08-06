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

TITLE="Allsky Installer"
ALLSKY_OWNER=$(id --group --name)
ALLSKY_GROUP=${ALLSKY_OWNER}
ALLSKY_VERSION="$( < "${ALLSKY_HOME}/version" )"
REPO_SUDOERS_FILE="${ALLSKY_REPO}/sudoers.repo"
REPO_WEBUI_DEFINES_FILE="${ALLSKY_REPO}/allskyDefines.inc.repo"
FINAL_SUDOERS_FILE="/etc/sudoers.d/allsky"
ALLSKY_LOG="/var/log/allsky.log"



####################### functions
display_msg() {
	if [[ $1 == "error" ]]; then
		echo -e "\n${RED}*** ERROR: "
	elif [[ $1 == "warning" ]]; then
		echo -e "\n${YELLOW}*** WARNING: "
	elif [[ $1 == "progress" ]]; then
		echo -e "${GREEN}* ${2}${NC}"
		return
	elif [[ $1 == "info" ]]; then
		echo -e "${YELLOW}${2}${NC}"
		return
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
##	WT_MENU_HEIGHT=$((${WT_HEIGHT}-7))
}


# Prompt the user to select their camera type, if we can't determine it automatically.
# If they have a prior installation of Allsky that uses CAMERA_TYPE in config.sh,
# we can use its value and not prompt.
CAMERA_TYPE=""
select_camera_type() {
	NEEDCAM=false

	if [[ ${HAS_PRIOR_ALLSKY} == "true" && ${HAS_NEW_PRIOR_ALLSKY} == "true" ]]; then
		# New style Allsky with CAMERA_TYPE in config.sh
		OLD_CONFIG="${PRIOR_INSTALL_DIR}/config/config.sh"
		if [ -f "${OLD_CONFIG}" ]; then
			CAMERA_TYPE=$(source "${OLD_CONFIG}" >/dev/null 2>&1; echo "${CAMERA_TYPE}")
			[[ ${CAMERA_TYPE} != "" ]] && return
		fi
	fi
	# If they have the "old" style Allsky, don't bother trying to map the old $CAMERA
	# to the new $CAMERA_TYPE.

	# "2" is the number of menu items.
	CAMERA_TYPE=$(whiptail --title "${TITLE}" --menu "\nSelect your camera type:\n" ${WT_HEIGHT} ${WT_WIDTH} 2 \
		"ZWO"  "   ZWO ASI" \
		"RPi"  "   Raspberry Pi HQ and compatible" \
		3>&1 1>&2 2>&3)
	if [ $? -ne 0 ]; then
		display_msg warning "Camera selection required.  Please re-run the installation and select a camera to continue.\n"
		exit 1
	fi
}


# Save the camera capabilities and use them to set the WebUI min, max, and defaults.
save_camera_capabilities() {
	if [[ -z ${CAMERA_TYPE} ]]; then
		display_msg error "INTERNAL ERROR: CAMERA_TYPE not set in get_camera_capabilities()."
		return 1
	fi

	# --cameraTypeOnly tells makeChanges.sh to only change the camera info and exit.
	# It displays any error messages.
	display_msg progress "Setting up WebUI options for '${CAMERA_TYPE}' cameras."
	"${ALLSKY_SCRIPTS}/makeChanges.sh" --cameraTypeOnly "cameraType" "Camera Type" "" "${CAMERA_TYPE}"
	RET=$?

	if [ ${RET} -ne 0 ]; then
		if [ ${RET} -eq ${EXIT_NO_CAMERA} ]; then
			display_msg error "No camera found."
			display_msg "" "After connecting your camera, run '${ME} --update'.\n"
		else
			display_msg error "Unable to save camera capabilities."
			display_msg "" "Look in ${ALLSKY_LOG} for any messages.\nAfter fixing things, run '${ME} --update'.\n"
		fi
		return 1
	fi

	return 0
}


# Modify placeholders for various directories.
create_WebUI_locations()
{
	display_msg progress "Modifying locations for WebUI."
	FILE="${ALLSKY_WEBUI}/includes/allskyDefines.inc"

	sed		-e "s;XX_ALLSKY_HOME_XX;${ALLSKY_HOME};" \
			-e "s;XX_ALLSKY_CONFIG_XX;${ALLSKY_CONFIG};" \
			-e "s;XX_ALLSKY_SCRIPTS_XX;${ALLSKY_SCRIPTS};" \
			-e "s;XX_ALLSKY_IMAGES_XX;${ALLSKY_IMAGES};" \
			-e "s;XX_ALLSKY_MESSAGES_XX;${ALLSKY_MESSAGES};" \
			-e "s;XX_ALLSKY_WEBUI_XX;${ALLSKY_WEBUI};" \
			-e "s;XX_ALLSKY_WEBSITE_XX;${ALLSKY_WEBSITE};" \
			-e "s;XX_ALLSKY_OWNER_XX;${ALLSKY_OWNER};" \
			-e "s;XX_ALLSKY_GROUP_XX;${ALLSKY_GROUP};" \
			-e "s;XX_ALLSKY_REPO_XX;${ALLSKY_REPO};" \
			-e "s;XX_ALLSKY_VERSION_XX;${ALLSKY_VERSION};" \
			-e "s;XX_RASPI_CONFIG_XX;${ALLSKY_CONFIG};" \
		"${REPO_WEBUI_DEFINES_FILE}"  >  "${FILE}"
		chmod 644 "${FILE}"
}

do_sudoers()
{
	display_msg progress "Creating/updating sudoers file."
	sed -e "s;XX_ALLSKY_SCRIPTS_XX;${ALLSKY_SCRIPTS};" "${REPO_SUDOERS_FILE}"  >  /tmp/x
	sudo install -m 0644 /tmp/x "${FINAL_SUDOERS_FILE}" && rm -f /tmp/x
}

ask_reboot() {
	if (whiptail --title "${TITLE}" --yesno "The Allsky Software is now installed. You must reboot the Raspberry Pi to finish the installation.\nAfter reboot you can connect to the WebUI at: http://${NEW_HOST_NAME}.local or http://$(hostname -I | sed -e 's/ .*$//')\n\n  Reboot now?" 10 60 \
		3>&1 1>&2 2>&3); then 
		sudo reboot now
	else
		display_msg warning "You will need to reboot the Pi before Allsky will work.\n"
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
	echo -e "***********************************"
	echo    "*** Performing update of Allsky ***"
	echo -e "***********************************"
	echo -en '\n'

	source "${ALLSKY_CONFIG}/config.sh"		# Sets CAMERA_TYPE
	save_camera_capabilities
	create_WebUI_locations

	# Update the sudoers file if it's missing some entries.
	# Look for the last entry added (should be the last entry in the file).
	# Don't simply copy the repo file to the final location in case the repo file isn't up to date.
	grep --silent "truncate" "${FINAL_SUDOERS_FILE}"
	# shellcheck disable=SC2181
	if [ $? -ne 0 ]; then
		display_msg progress "Updating sudoers list."
		grep --silent "truncate" "${REPO_SUDOERS_FILE}"
		# shellcheck disable=SC2181
		if [ $? -ne 0 ]; then
				display_msg error "Please get the newest '$(basename "${REPO_SUDOERS_FILE}")' file from Git and try again."
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
	if (whiptail --title "${TITLE}" --yesno "You appear to have a prior version of Allsky in ${PRIOR_INSTALL_DIR}.\n\nDo you want to restore the prior images, any darks, and certain configuration settings?" 12 60 \
		3>&1 1>&2 2>&3); then 
		HAS_PRIOR_ALLSKY=true
		if [ -f  "${PRIOR_INSTALL_DIR}/version" ]; then
			HAS_NEW_PRIOR_ALLSKY=true		# New style Allsky with CAMERA_TYPE set in config.sh
		else
			HAS_NEW_PRIOR_ALLSKY=false		# Old style with CAMERA set in config.sh
		fi
	else
		display_msg warning "If you want your old images, darks, etc. from the prior verion"
		display_msg info "of Allsky, you'll need to manually move them to the new version.\n"
	fi
else
	if (whiptail --title "${TITLE}" --yesno "You do not appear to have prior version of Allsky.\nIf you DO, and you want items moved from the prior version to the new one\n, make sure the prior version is in ${PRIOR_INSTALL_DIR}.\n\nDo you want to continue withOUT using the prior version?" 10 60 \
		3>&1 1>&2 2>&3); then 
		true
	else
		display_msg info "* Rename the directory with your prior version of Allsky to\n'${PRIOR_INSTALL_DIR}', then run the installation again.\n"
		exit 0
	fi
fi

select_camera_type

display_msg progress "Installing dependencies.\n"
sudo make deps
if [ $? -ne 0 ]; then
	echo "Installing dependencies failed"
	exit 1
fi
echo

display_msg progress "Compile and install Allsky software.\n"
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
display_msg progress "Set permissions on Allsky log (${ALLSKY_LOG}).\n"
sudo touch "${ALLSKY_LOG}"
sudo chmod 664 "${ALLSKY_LOG}"
sudo chgrp ${ALLSKY_GROUP} "${ALLSKY_LOG}"

display_msg progress "Updating version and CAMERA_TYPE in config.sh.\n"
sed -i \
	-e "s;XX_ALLSKY_VERSION_XX;${ALLSKY_VERSION};g" \
	-e "s/^CAMERA_TYPE=.*$/CAMERA_TYPE=\"${CAMERA_TYPE}\"/" \
	"${ALLSKY_CONFIG}/config.sh" >&2


# Restore any necessary files
if [[ ${HAS_PRIOR_ALLSKY} == "true" ]]; then

	if [ -f "${PRIOR_INSTALL_DIR}/scripts/endOfNight_additionalSteps.sh" ]; then
		display_msg progress "Restoring endOfNight_additionalSteps.sh."
		mv "${PRIOR_INSTALL_DIR}/scripts/endOfNight_additionalSteps.sh" "${ALLSKY_SCRIPTS}"
	fi

	if [ -d "${PRIOR_INSTALL_DIR}/images" ]; then
		display_msg progress "Restoring images."
		mv "${PRIOR_INSTALL_DIR}/images" "${ALLSKY_HOME}"
	fi

	if [ -d "${PRIOR_INSTALL_DIR}/darks" ]; then
		display_msg progress "Restoring darks."
		mv "${PRIOR_INSTALL_DIR}/darks" "${ALLSKY_HOME}"
	fi

	PRIOR_CONFIG_DIR="${PRIOR_INSTALL_DIR}/config"

	if [ -f "${PRIOR_CONFIG_DIR}/raspap.auth" ]; then
		display_msg progress "Restoring WebUI security settings."
		mv "${PRIOR_CONFIG_DIR}/raspap.auth" "${ALLSKY_CONFIG}"
	fi
	if [ -f "${PRIOR_CONFIG_DIR}/raspap.php" ]; then
		mv "${PRIOR_CONFIG_DIR}/raspap.php" "${ALLSKY_CONFIG}"
	fi

	if [ -f "${PRIOR_CONFIG_DIR}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}" ]; then
		display_msg progress "Restoring remote Allsky Website configuration."
		mv "${PRIOR_CONFIG_DIR}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}" "${ALLSKY_CONFIG}"

		# Check if this is an older configuration file type.
		CONFIG_FILE="${ALLSKY_CONFIG}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}"
		OLD=false
		PRIOR_CONFIG_VERSION="$(jq .ConfigVersion "${CONFIG_FILE}")"
		REPO_FILE="${ALLSKY_REPO}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}"
		if [[ ${PRIOR_CONFIG_VERSION} == "null" ]]; then
			OLD=true		# Hmmm, it should have the version
		else
			NEW_CONFIG_VERSION="$(jq .ConfigVersion "${REPO_FILE}")"
			if [[ ${PRIOR_CONFIG_VERSION} < "${NEW_CONFIG_VERSION}" ]]; then
				OLD=true
			fi
		fi
		if [[ ${OLD} == "true" ]]; then
			display_msg warning "Your ${CONFIG_FILE} is an older version."
			display_msg info "Your    version: ${PRIOR_CONFIG_VERSION}"
			display_msg info "Current version: ${NEW_CONFIG_VERSION}"
			display_msg info "\nPlease compare it to the new one in ${REPO_FILE}"
			display_msg info "to see what fields have been added, changed, or removed.\n"
		fi
	fi

	if [ -f "${PRIOR_CONFIG_DIR}/uservariables.sh" ]; then
		display_msg progress "Restoring uservariables.sh."
		mv "${PRIOR_CONFIG_DIR}/uservariables.sh" "${ALLSKY_CONFIG}"
	fi

	if [ -f "${PRIOR_CONFIG_DIR}/settings.json" ]; then
		display_msg progress "Restoring WebUI settings."
		# This file is probably a link to a camera type/model-specific file,
		# so copy it instead of moving it to not break the link.
		cp "${PRIOR_CONFIG_DIR}/settings.json" "${ALLSKY_CONFIG}"
	fi
	# Do NOT restores options.json - it will be recreated.

	display_msg progress "Restoring settings from configuration files."
	# This may miss really-old variables that no longer exist.
## TODO: automate this
# ( source ${PRIOR_CONFIG_DIR}/ftp-settings.sh
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

	display_msg info "IMPORTANT: check config/config.sh and config/ftp-settings.sh for correctness.\n"
fi

if [[ ${NEEDCAM} == "true" ]]; then
	get_camera_capabilities
fi

### TODO: Run "locale | grep LC_NUMERIC" and update "locale" in settings file.
### TODO: Check for size of RAM+swap during installation (Issue # 969).
### TODO: Check if prior $ALLSKY_TMP was a memory filesystem.  If not, offer to make $ALLSKY_TMP a memory filesystem.

### FUTURE: Prompt to install SSL certificate

display_msg progress "Configure the WebUI.\n"
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

display_msg progress "Installing the lighttpd webserver and its dependencies.\n"
sudo systemctl stop hostapd 2> /dev/null
sudo systemctl stop lighttpd 2> /dev/null
sudo apt-get update && sudo apt-get install -y lighttpd php-cgi php-gd hostapd dnsmasq avahi-daemon

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

sudo lighty-enable-mod fastcgi-php 2> /dev/null
sudo systemctl force-reload lighttpd 2> /dev/null
sudo systemctl start lighttpd
sudo rm -fr /var/log/lighttpd/*		# Start off with a clean log file.
echo

FINAL_AVI_FILE="/etc/avahi/avahi-daemon.conf"
[ -f "${FINAL_AVI_FILE}" ] && grep -i --quiet "host-name=${NEW_HOST_NAME}" "${FINAL_AVI_FILE}"
if [ $? -ne 0 ]; then
	# New NEW_HOST_NAME not found in file, or file doesn't exist, so need to configure file.
	display_msg progress "Configuring avahi-daemon."
	REPO_AVI_FILE="${ALLSKY_REPO}/avahi-daemon.conf.repo"
	sed "s/XX_HOST_NAME_XX/${NEW_HOST_NAME}/g" "${REPO_AVI_FILE}" > /tmp/x
	sudo install -m 0644 /tmp/x "${FINAL_AVI_FILE}" && rm -f /tmp/x
	echo
fi

display_msg progress "Adding the right permissions to the webserver."
# Remove any old entries; we now use /etc/sudoers.d/allsky instead of /etc/sudoers.
sudo sed -i -e '/allsky/d' -e '/www-data/d' /etc/sudoers
do_sudoers
echo


OLD_WEBUI_LOCATION="/var/www/html"
OLD_WEBSITE="${OLD_WEBUI_LOCATION}/allsky"
if [ -d "${OLD_WEBSITE}" ]; then
	ALLSKY_WEBSITE_OLD="${OLD_WEBSITE}"
elif [ -d "${PRIOR_INSTALL_DIR}/html/allsky" ]; then
	ALLSKY_WEBSITE_OLD="${PRIOR_INSTALL_DIR}/html/allsky"
else
	ALLSKY_WEBSITE_OLD=""
fi

# Move any prior ALLSKY_WEBSITE to the new location.
# This HAS to be done since the lighttpd server only looks in the new location.
# Note: This MUST come before the old WebUI check below so we don't remove the prior website
# when we remove the prior WebUI.

if [ "${ALLSKY_WEBSITE_OLD}" != "" ]; then
	display_msg progress "Moving prior Allsky Website from ${ALLSKY_WEBSITE_OLD} to new location."
	OK=true
	if [ -d "${ALLSKY_WEBSITE}" ]; then
		# Hmmm.  There's an old webite AND a new one.
		# Allsky doesn't ship with the website directory, so not sure how one got there...
		# Try to remove the new one - if it's not empty the remove will fail.
		rmdir "${ALLSKY_WEBSITE}" 
		if [ $? -ne 0 ]; then
			display_msg error "* New website in '${ALLSKY_WEBSITE}' is not empty."
			display_msg info "  Move the contents manually from '${ALLSKY_WEBSITE_OLD}',"
			display_msg info "  and then remove the old location.\n"
			OK=false
		fi
	fi
	if [[ ${OK} = "true" ]]; then
		sudo mv "${ALLSKY_WEBSITE_OLD}" "${ALLSKY_WEBSITE}"
		PRIOR_SITE="${ALLSKY_WEBSITE}"
	else
		# Move failed, but still check if prior website is outdated.
		PRIOR_SITE="${ALLSKY_WEBSITE_OLD}"
	fi

	# Check if the prior website is outdated.
	VERSION_FILE="${PRIOR_SITE}/version"
	if [ -f "${VERSION_FILE}" ]; then
		OLD_VERSION=$( < "${VERSION_FILE}/version" )
	else
		OLD_VERSION="** Unknown, but old **"
	fi
	NEW_VERSION="$(curl --show-error --silent "${GITHUB_RAW_ROOT}/allsky-website/master/version")"
	if [[ ${OLD_VERSION} < "${NEW_VERSION}" ]]; then
		display_msg warning "There is a newer Allsky Website available; please upgrade to it."
		display_msg info "Your    version: ${OLD_VERSION}"
		display_msg info "Current version: ${NEW_VERSION}"
		display_msg info "\nAFTER you reboot, you can upgrade the Allky Website by executing:"
		display_msg info "     cd ~/allsky; website/install.sh\n"
	fi
fi


# Check if a WebUI exists in the old location.

if [ -d "${OLD_WEBUI_LOCATION}" ]; then
	if (whiptail --title "${TITLE}" --yesno "An old version of the WebUI was found in ${OLD_WEBUI_LOCATION}; it is no longer being used so do you want to remove it?" 10 60 \
		3>&1 1>&2 2>&3); then 
		display_msg progress "Removing old WebUI in ${OLD_WEBUI_LOCATION}."

		sudo rm -fr "${OLD_WEBUI_LOCATION}"

	else	# they don't want to remove the old WebUI.
		display_msg warning "The old WebUI files are no longer used and are just taking up disk space.\n"
	fi
fi

create_WebUI_locations

display_msg progress "Setting permissions on WebUI files."
# The files should already be the correct permissions/owners, but just in case, set them.
# We don't know what permissions may have been on the old website, so use "sudo".
sudo find "${ALLSKY_WEBUI}/" -type f -exec chmod 644 {} \;
sudo find "${ALLSKY_WEBUI}/" -type d -exec chmod 755 {} \;
chmod 755 "${ALLSKY_WEBUI}/includes/createAllskyOptions.php"	# executable .php file

save_camera_capabilities

######## TEMP functiont to install the overlay and modules system
install_overlay()
{

        echo -e "${GREEN}* Installing PHP Modules${NC}"
        apt-get install -y php-zip

        echo -e "${GREEN}* Installing Python dependencies${NC}"
        pip3 install --no-warn-script-location -r requirements.txt 2>&1 > dependencies.log
        sudo apt-get -y install libatlas-base-dev 2>&1 >> dependencies.log
        echo -e "${GREEN}* Installing Trutype fonts - This will take a while please be patient${NC}"
        sudo apt-get -y install msttcorefonts 2>&1 >> dependencies.log

        echo -e "${GREEN}* Setting up modules${NC}"
        mkdir -p /etc/allsky/modules
        chown -R www-data /etc/allsky
        chmod -R 774 /etc/allsky

        echo -e "${GREEN}* Fixing permissions${NC}"

        chown www-data "${ALLSKY_CONFIG}"/fields.json
        chown www-data "${ALLSKY_CONFIG}"/module-settings.json
        chown www-data "${ALLSKY_CONFIG}"/postprocessing_day.json
        chown www-data "${ALLSKY_CONFIG}"/postprocessing_night.json
        chown www-data "${ALLSKY_CONFIG}"/autoexposure.json
        chown www-data "${ALLSKY_CONFIG}"/overlay.json
        chown www-data "${ALLSKY_CONFIG}"/settings_RPiHQ.json
        chown www-data "${ALLSKY_CONFIG}"/settings_ZWO.json

}

install_overlay

######## All done

ask_reboot
