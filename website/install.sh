#!/bin/bash

if [ -z "${ALLSKY_HOME}" ] ; then
	export ALLSKY_HOME=$(realpath $(dirname "${BASH_ARGV0}")/..)
fi
source "${ALLSKY_HOME}/variables.sh"

if [[ $EUID -eq 0 ]]; then
	display_msg error "This script must NOT be run as root, do NOT use 'sudo'."
	exit 1
fi

source "${ALLSKY_CONFIG}/config.sh"
source "${ALLSKY_CONFIG}/ftp-settings.sh"
ME="$(basename "${BASH_ARGV0}")"

TITLE="Allsky Website Installer"
ALLSKY_VERSION="$( < "${ALLSKY_HOME}/version" )"

if [[ ${REMOTE_WEBSITE} == "true" ]]; then
	U1="*******************"	# these must be the same length
	U2="for remote servers "
else
	U1=""
	U2=""
fi
echo
echo "********************************************${U1}***"
echo "*** Welcome to the Allsky Website Installer ${U2}***"
echo "********************************************${U1}***"
echo



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
	echo -e "${C}Usage: ${ME} [--help] [--remote] [--branch branch_name] [--update]${NC}"
	echo
	echo "'--help' displays this message and exits."
	echo
	echo "'--remote' keeps a copy of a remote server's configuration file on the"
	echo "   Pi where it can be updated in the WebUI and uploaded to the server."
	echo "   This will have no impact on a local Allsky Website, if installed."
	echo
	echo "The '--branch' option should only be used when instructed to by an Allsky developer."
	echo "  'branch_name' is a valid branch at ${GITHUB_ROOT}/allsky-website."
	echo
	echo "'--update' should only be used when instructed to by an Allsky Website page."
	echo
	exit ${RET}
}


##### Some files have placeholders for certain locations.  Modify them.
modify_locations() {
	display_msg progress "Modifying locations in web files."
	sed -i -e "s;XX_ALLSKY_CONFIG_XX;${ALLSKY_CONFIG};" "${ALLSKY_WEBSITE}/functions.php"
}


##### Create and upload a new data.json file.
create_data_json_file() {
	if [ "${POST_END_OF_NIGHT_DATA}" != "true" ]; then
		display_msg progress "Enabling POST_END_OF_NIGHT_DATA."
		sed -i 's/^POST_END_OF_NIGHT_DATA.*/POST_END_OF_NIGHT_DATA="true"/' "${ALLSKY_CONFIG}/config.sh"
	fi

	# Create the file.  postData.sh copies it to ${ALLSKY_WEBSITE}.
	OUTPUT="$(${ALLSKY_SCRIPTS}/postData.sh 2>&1)"
	if [[ $? -ne 0 || ! -f ${ALLSKY_WEBSITE}/data.json ]]; then
		echo -e "${RED}* Unable to create new 'data.json' file:"
		echo -e "${OUTPUT}"
		echo -e "${NC}"
		echo -e "Make sure 'REMOTE_HOST' is set to a valid server in 'config/ftp-settings.sh',"
		echo -e "or to '', then run ${ALLSKY_SCRIPTS}/postData.sh to create a 'data.json' file."
	fi
}


##### Set up the location where the website configuration file will go.
CONFIG_FILE_DIRECTORY=""
IMAGE_NAME=""
ON_PI=""
set_configuration_file_variables() {

	if [ "${REMOTE_WEBSITE}" = "true" ]; then
		CONFIG_FILE_DIRECTORY=$"${ALLSKY_CONFIG}"
		IMAGE_NAME="image.jpg"
		ON_PI="false"
	else
		CONFIG_FILE_DIRECTORY=$"${ALLSKY_WEBSITE}"
		IMAGE_NAME="/${IMG_DIR}/${FULL_FILENAME}"
		ON_PI="true"
	fi
}

##### Update the json configuration file, either for the local machine or a remote one.
update_website_configuration_file() {
	CONFIG_FILE="${1}"

	display_msg progress "Updating settings in ${CONFIG_FILE}."

	if [ "${TIMELAPSE_MINI_IMAGES:-0}" -eq 0 ]; then
		MINI_TIMELAPSE="XX_MINI_TIMELAPSE_XX"
		MINI_TIMELAPSE_URL="XX_MINI_TIMELAPSE_URL_XX"
	else
		MINI_TIMELAPSE="url"
		if [ "${REMOTE_WEBSITE}" = "true" ]; then
			MINI_TIMELAPSE_URL="mini-timelapse.mp4"
		else
			MINI_TIMELAPSE_URL="/${IMG_DIR}/mini-timelapse.mp4"
		fi
	fi

	# Latitude and longitude may or may not have N/S and E/W.
	# "N" is positive, "S" negative for LATITUDE.
	# "E" is positive, "W" negative for LONGITUDE.

	LATITUDE="$(settings ".latitude")"
	DIRECTION=${LATITUDE:1,-1}			# last character
	if [ "${DIRECTION}" = "S" ]; then
		SIGN="-"
	else
		SIGN=""
	fi
	LATITUDE="${SIGN}${LATITUDE%${DIRECTION}}"
	if [ "${DIRECTION}" = "S" ]; then
		AURORAMAP="south"
	else
		AURORAMAP="north"
	fi

	LONGITUDE="$(settings ".longitude")"
	DIRECTION=${LONGITUDE:1,-1}
	if [ "${DIRECTION}" = "W" ]; then
		SIGN="-"
	else
		SIGN=""
	fi
	LONGITUDE="${SIGN}${LONGITUDE%${DIRECTION}}"

	COMPUTER="$(tail -1 /proc/cpuinfo | sed 's/.*: //')"
	CAMERA_MODEL="$(settings ".cameraModel")"
	if [[ ${CAMERA_MODEL} == "null" ]]; then
		CAMERA_MODEL=""
	else
		CAMERA_MODEL=" ${CAMERA_MODEL}"		# adds a space
	fi

	# There are some settings we can't determine, like LENS.
	"${ALLSKY_SCRIPTS}/updateWebsiteConfig.sh" --silent \
		--config "${CONFIG_FILE}" \
		imageName "" "${IMAGE_NAME}" \
		latitude "XX_NEED_TO_UPDATE_XX" "${LATITUDE}" \
		longitude "XX_NEED_TO_UPDATE_XX" "${LONGITUDE}" \
		auroraMap "XX_NEED_TO_UPDATE_XX" "${AURORAMAP}" \
		computer "XX_NEED_TO_UPDATE_XX" "${COMPUTER}" \
		camera "XX_NEED_TO_UPDATE_XX" "${CAMERA_TYPE}${CAMERA_MODEL}" \
		XX_MINI_TIMELAPSE_XX "XX_MINI_TIMELAPSE_XX" "${MINI_TIMELAPSE}" \
		XX_MINI_TIMELAPSE_URL_XX "XX_MINI_TIMELAPSE_URL_XX" "${MINI_TIMELAPSE_URL}" \
		AllskyVersion "XX_ALLSKY_VERSION_XX" "${ALLSKY_VERSION}" \
		onPi "" "${ON_PI}"
}


##### Update some of the configuration files and variables
modify_configuration_variables() {
	# If the user is updating the website, use the prior config file(s).

	CONFIG_FILE="${CONFIG_FILE_DIRECTORY}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}"

	if [ "${SAVED_OLD}" = "true" ]; then
		A="analyticsTracking.js"
		if [ -f "${PRIOR_WEBSITE}/${A}" ]; then
			if cmp --silent "${PRIOR_WEBSITE}/${A}" "${A}" ; then
				display_msg progress "Restoring prior '${A}'."
				mv "${PRIOR_WEBSITE}/${A}" .
			fi
		fi

		# See if this is an older version of the website
		VERSION_FILE="${PRIOR_WEBSITE}/version"
		if [ -f "${VERSION_FILE}" ]; then
			OLD_VERSION=$( < "${VERSION_FILE}" )
		else
			OLD_VERSION="** Unknown, but old **"
		fi
		if [[ ${OLD_VERSION} < "${WEBSITE_VERSION}" ]]; then
			display_msg warning "There is a newer Allsky Website available; please upgrade to it."
			display_msg info "Your    version: ${OLD_VERSION}"
			display_msg info "Current version: ${WEBSITE_VERSION}"
			display_msg info "\nYou can upgrade the Allky Website by executing:"
			display_msg info "     cd ~/allsky; website/install.sh\n"
		fi

		if [ "${OLD_WEBSITE_TYPE}" = "new" ]; then
			display_msg progress "Restoring prior '${ALLSKY_WEBSITE_CONFIGURATION_NAME}'."
			cp "${PRIOR_WEBSITE}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}" "${CONFIG_FILE}"

			# Check if this is an older configuration file.
			OLD=false
			PRIOR_CONFIG_VERSION="$(jq .ConfigVersion "${CONFIG_FILE}")"
			if [[ ${PRIOR_CONFIG_VERSION} == "null" ]]; then
				OLD=true
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
				display_msg info "\nPlease compare your file to the new one in"
				display_msg info "${REPO_FILE}"
				display_msg info "to see what fields have been added, changed, or removed.\n"
			fi

		else
			# User had the older Website - merge old config files into new one.
if false; then
	# TODO: Merge ${ALLSKY_WEBSITE_OLD}/config.js and ${ALLSKY_WEBSITE_OLD}/virtualsky.json
	# into ${ALLSKY_WEBSITE}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}.
			display_msg progress "Merging contents of prior 'config.js' and 'virtualsky.json' files into '${ALLSKY_WEBSITE_CONFIGURATION_NAME}'."
else
			display_msg info "When installation is done you must copy the contents of the prior"
			display_msg info "'${ALLSKY_WEBSITE_OLD}/config.js' and"
			display_msg info "'${ALLSKY_WEBSITE_OLD}/virtualsky.json' files"
			display_msg info "into '${ALLSKY_WEBSITE}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}'."
			display_msg info "\nCheck the Wiki for the meaning of the MANY new options."
fi
		fi
	else
		cp "${REPO_FILE}" "${CONFIG_FILE}"
		update_website_configuration_file "${CONFIG_FILE}"
	fi
}


####################### main part of program

# Check arguments
OK="true"
HELP="false"
BRANCH="master"
UPDATE="false"
REMOTE_WEBSITE="false"
while [ $# -gt 0 ]; do
	ARG="${1}"
	case "${ARG}" in
		--help)
			HELP="true"
			;;
		--branch)
			BRANCH="${2}"
			if [[ ${BRANCH} == "" ]]; then
				OK="false"
			else
				shift	# skip over BRANCH
			fi
			;;
		--remote)
			REMOTE_WEBSITE="true"
			;;
		--update)
			UPDATE="true"
			;;
		*)
			echo -e "${RED}*** ERROR: Unknown argument: '${ARG}'${NC}"
			OK="false"
			;;
	esac
	shift
done
[[ ${HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" ]] && usage_and_exit 1

# Get the version now so we can use it with remote installations.
WEBSITE_VERSION="$(curl --show-error --silent "${GITHUB_RAW_ROOT}/allsky-website/${BRANCH}/version")"

REPO_FILE="${ALLSKY_REPO}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}.repo"
set_configuration_file_variables

##### Handle remote websites

if [[ ${REMOTE_WEBSITE} == "true" ]]; then
	if [[ ${REMOTE_HOST} == "" ]]; then
		echo -e "\n${RED}"
		echo "* ERROR: The 'REMOTE_HOST' must be set in 'config/ftp-settings.sh'"
		echo "in order to do a remote website installation."
		echo "Please set it, the password, and other information, then re-run this installation."
		echo -e "${NC}\n"
		exit 1
	fi

	if [[ -f ${ALLSKY_CONFIG}/${ALLSKY_WEBSITE_CONFIGURATION_NAME} ]]; then
		# The user is upgrading a new-style website.
		HAS_PRIOR_REMOTE_SERVER="true"
		display_msg progress "\nYou can continue to configure your remote Allsky Website via the WebUI.\n"
	else
		# Don't know if the user is upgrading and old-style remote website,
		# or they don't even have a remote website.

		HAS_PRIOR_REMOTE_SERVER="false"
		MSG="You can keep a copy of your remote website's configuration file on your Pi"
		MSG="${MSG}\nso you can easily edit it in the WebUI and have it automatically uploaded."
		MSG="${MSG}\n** This is the recommended way of making changes to the configuration **."
		MSG="${MSG}\n\nWould you like to do that?"
		if (whiptail --title "${TITLE}" --yesno "${MSG}" 15 60 3>&1 1>&2 2>&3); then 

			REMOTE_CONFIG_FILE="${CONFIG_FILE_DIRECTORY}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}"
			cp "${REPO_FILE}" "${REMOTE_CONFIG_FILE}"
			update_website_configuration_file "${REMOTE_CONFIG_FILE}"

			display_msg progress "\nTo edit the remote configuration file, go to the 'Editor' page in the WebUI\nand select '${ALLSKY_WEBSITE_CONFIGURATION_NAME} (remote Allsky Website)'.\n"
		else
			display_msg info "\nYou need to manually copy '${REPO_FILE}'"
			display_msg info "to your remote server and rename it to '${ALLSKY_WEBSITE_CONFIGURATION_NAME}',"
			display_msg info "then modify it."
		fi
	fi

	display_msg progress "** The Pi portion of the Remote Allsky Website Installation is complete."
	if [ "${HAS_PRIOR_REMOTE_SERVER}" = "true" ]; then
		display_msg info "Please manually update all the files"
		display_msg info "on your remote server the same way you installed them orginally."
	else
		display_msg info "Please manually install all the files"
		display_msg info "on your remote server from ${GITHUB_ROOT}/allsky-website.git."
### TODO: Can we tell the user how?
### Is it possible to ask them if they want this script to download the files to the Pi
### and then ftp the whole directory structure?   Wouldn't that be cool?
	fi

	exit 0
fi


#########    Local install


# See if they are upgrading the website, and if so, if the prior website was an "old" one.
# "old" means in the old location and with the old configuration files.
if [ -d "${ALLSKY_WEBSITE}" ]; then
	ALLSKY_WEBSITE_OLD="${ALLSKY_WEBSITE}"
	OLD_WEBSITE_TYPE="new"
elif [ -d "/var/www/html/allsky" ]; then
	ALLSKY_WEBSITE_OLD="/var/www/html/allsky"
	OLD_WEBSITE_TYPE="old"
else
	ALLSKY_WEBSITE_OLD=""
	OLD_WEBSITE_TYPE=""
fi


# Check if the user is updating an existing installation.
# This really only applies if they manually update some files rather than the whole release,
# and ideally would never happen.
### TODO: Is this still needed?  Check the code to see if it ever mentions "--update".
if [ "${UPDATE}" = "true" ] ; then
	if [ ! -d "${ALLSKY_WEBSITE}" ]; then
		display_msg error " --update specified but no existing website found at '${ALLSKY_WEBSITE}'."
		exit 2
	fi

	modify_locations
	create_data_json_file

	display_msg progress -e "\nUpdate complete!\n"
	exit 0
fi


if [[ -n ${ALLSKY_WEBSITE_OLD} &&  -d "${ALLSKY_WEBSITE_OLD}" ]]; then
	# git will fail if the new directory already exists and has something in it
	PRIOR_WEBSITE="${ALLSKY_WEBSITE}-OLD"
	if [ -d "${PRIOR_WEBSITE}" ]; then
		display_msg error "A saved copy of a prior Allsky Website already exists."
		display_msg info "See '${PRIOR_WEBSITE}'."
		display_msg info "Can only have one saved prior directory at a time.  Exiting.\n"
		exit 3
	fi

	display_msg progress "Moving prior website to '${PRIOR_WEBSITE}'."
	mv "${ALLSKY_WEBSITE}" "${PRIOR_WEBSITE}"
	if [ $? -ne 0 ]; then
		display_msg error "Unable to move prior website.  Exiting.\n"
		exit 3
	fi
	SAVED_OLD=true
else
	SAVED_OLD=false
fi

if [ "${BRANCH}" = "" ]; then
	BRANCH="master"
fi
B=" from branch ${BRANCH}"
BRANCH="-b ${BRANCH}"

display_msg progress "Fetching new website files$B into '${ALLSKY_WEBSITE}'."
git clone ${BRANCH} ${GITHUB_ROOT}/allsky-website.git "${ALLSKY_WEBSITE}"
if [ $? -ne 0 ]; then
	display_msg error "Unable to get Allsky Website files from git.\n"
	exit 4
fi
echo

cd "${ALLSKY_WEBSITE}" || exit 1

display_msg progress "Creating thumbnails directories."
mkdir -p startrails/thumbnails keograms/thumbnails videos/thumbnails

modify_locations
modify_configuration_variables
create_data_json_file

if [ "${SAVED_OLD}" = "true" ]; then
	# Each directory will have zero or more images.
	# Make sure we do NOT mv any .php files.

	if [ -d "${PRIOR_WEBSITE}/videos/thumbnails" ]; then
		mv "${PRIOR_WEBSITE}/videos/thumbnails"   videos
	fi
	count=$(ls -1 "${PRIOR_WEBSITE}"/videos/allsky-* 2>/dev/null  | wc -l)
	if [ "${count}" -ge 1 ]; then
		display_msg progress "Restoring prior videos."
		mv "${PRIOR_WEBSITE}"/videos/allsky-*   videos
	fi

	if [ -d "${PRIOR_WEBSITE}/keograms/thumbnails" ]; then
		mv "${PRIOR_WEBSITE}/keograms/thumbnails"   keograms
	fi
	count=$(ls -1 "${PRIOR_WEBSITE}"/keograms/keogram-* 2>/dev/null | wc -l)
	if [ "${count}" -ge 1 ]; then
		display_msg progress "Restoring prior keograms."
		mv "${PRIOR_WEBSITE}"/keograms/keogram-*   keograms
	fi

	if [ -d "${PRIOR_WEBSITE}/startrails/thumbnails" ]; then
		mv "${PRIOR_WEBSITE}/startrails/thumbnails"   startrails
	fi
	count=$(ls -1 "${PRIOR_WEBSITE}"/startrails/startrails-* 2>/dev/null | wc -l)
	if [ "${count}" -ge 1 ]; then
		display_msg progress "Restoring prior startrails."
		mv "${PRIOR_WEBSITE}"/startrails/startrails-*   startrails
	fi

	if [ -d "${PRIOR_WEBSITE}/myImages" ]; then
		display_msg progress "Restoring prior 'myImages' directory."
		mv "${PRIOR_WEBSITE/myImages}"   .
	fi
fi

display_msg progress "Fixing ownership and permissions."
U=$(id --name --user)		# User running this script
sudo chown -R "${U}:www-data" .
find ./ -type f -exec chmod 644 {} \;
find ./ -type d -exec chmod 775 {} \;


echo
display_msg progress "***********************************"
display_msg progress "**** Installation is complete *****"
display_msg progress "***********************************\n"


if [ "${SAVED_OLD}" = "true" ]; then
	display_msg info "Your prior website is in '${PRIOR_WEBSITE}'."
	display_msg info "All your prior videos, keograms, and startrails were MOVED to the updated website."
	display_msg info "\nAfter you are convinced everything is working, remove your prior version.\n"
else
	display_msg info "\nBefore using the website you must edit its configuration by clicking on"
	display_msg info "the 'Editor' link in the WebUI, then select the ${ALLSKY_WEBSITE_CONFIGURATION_NAME} entry."
	display_msg info "\nThere are many options, so see ${GITHUB_ROOT}/allsky/wiki/allsky-website-Settings"
	display_msg info "for more information.\n"
fi

echo
