#!/bin/bash

if [ -z "${ALLSKY_HOME}" ] ; then
	export ALLSKY_HOME=$(realpath $(dirname "${BASH_ARGV0}")/..)
fi
source "${ALLSKY_HOME}/variables.sh"

if [[ $EUID -eq 0 ]]; then
	echo -e "\n${RED}**********"
	echo -e "This script must NOT be run as root, do NOT use 'sudo'."
	echo -e "**********${NC}\n"

	exit 1
fi

source "${ALLSKY_CONFIG}/config.sh"
source "${ALLSKY_CONFIG}/ftp-settings.sh"
ME="$(basename "${BASH_ARGV0}")"

CONFIGURATION_FILE_NAME="configuration.json"

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

# Check arguments
OK="true"
HELP="false"
BRANCH=""
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

if [[ ${REMOTE_WEBSITE} == "true" ]]; then
	U1="*******************"	# these must be the same length
	U2="for remote servers "
else
	U1=""
	U2=""
fi
echo
echo "***********************************************${U1}***"
echo "*** Welcome to the Allsky Website installation ${U2}***"
echo "***********************************************${U1}***"
echo

##### Some files have placeholders for certain locations.  Modify them.
modify_locations() {
	echo -e "${GREEN}* Modifying locations in web files${NC}"
	sed -i -e "s;XX_ALLSKY_CONFIG_XX;${ALLSKY_CONFIG};" "${ALLSKY_WEBSITE}/functions.php"
}


##### Create and upload a new data.json file.
create_data_json_file() {
	if [ "${POST_END_OF_NIGHT_DATA}" != "true" ]; then
		echo -e "${GREEN}* Enabling POST_END_OF_NIGHT_DATA.${NC}"
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

##### Update some of the configuration files and variables
modify_configuration_variables() {
	# If the user is updating the website, use the prior config file(s).

	if [ "${SAVED_OLD}" = "true" ]; then
		A="analyticsTracking.js"
		if [ -f "${PRIOR_WEBSITE}/${A}" ]; then
			if cmp --silent "${PRIOR_WEBSITE}/${A}" "${A}" ; then
				echo -e "${GREEN}* Restoring prior '${A}'.${NC}"
				mv "${PRIOR_WEBSITE}/${A}" .
			fi
		fi

		if [ "${OLD_WEBSITE_TYPE}" = "new" ]; then
			echo -e "${GREEN}* Restoring prior '${CONFIGURATION_FILE_NAME}'.${NC}"
			cp "${PRIOR_WEBSITE}/${CONFIGURATION_FILE_NAME}" "${ALLSKY_WEBSITE}"
		else
			# User had the older Website - merge old config files into new one.
if false; then
	# TODO: Merge ${ALLSKY_WEBSITE_OLD}/config.js and ${ALLSKY_WEBSITE_OLD}/virtualsky.json
	# into ${ALLSKY_WEBSITE}/${CONFIGURATION_FILE_NAME}.
			echo -e "${GREEN}* Merging contents of prior 'config.js' and 'virtualsky.json' files into '${CONFIGURATION_FILE_NAME}'.${NC}"
else
			echo -e "\b${YELLOW}"
			echo "* When installation is done you must copy the contents of the prior"
			echo "'${ALLSKY_WEBSITE_OLD}/config.js' and"
			echo "'${ALLSKY_WEBSITE_OLD}/virtualsky.json' files"
			echo "into '${ALLSKY_WEBSITE}/${CONFIGURATION_FILE_NAME}'."
			echo
			echo "Check the Wiki for meaning of the options - there are many new ones."
			echo -e "${NC}\n"
fi
		fi
	else
		# No old web site, so just set up new one.
		if [ "${REMOTE_WEBSITE}" = "true" ]; then
			DIR=$"${ALLSKY_CONFIG}"
			IMAGE_NAME="image.jpg"
			ON_PI="false"
		else
			DIR=$"${ALLSKY_WEBSITE}"
			IMAGE_NAME="/${IMG_DIR}/${FULL_FILENAME}"
			ON_PI="true"
		fi
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
## TODO: hide the "videos", "keograms", and/or "startrails" if not being used.
		
 
		cp "${ALLSKY_REPO}/${CONFIGURATION_FILE_NAME}.repo" "${DIR}/${CONFIGURATION_FILE_NAME}"
		echo -e "${GREEN}* Updating settings in ${DIR}/${CONFIGURATION_FILE_NAME}${NC}"

### TODO: Not sure capture programs accept either way.

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

		"${ALLSKY_SCRIPTS}/updateWebsiteConfig.sh" --silent \
			--config "${DIR}/${CONFIGURATION_FILE_NAME}" \
			imageName "" "${IMAGE_NAME}" \
			latitude "" "${LATITUDE}" \
			longitude "" "${LONGITUDE}" \
			auroraMap "" "${AURORAMAP}" \
			computer "" "${COMPUTER}" \
			camera "" "${CAMERA_TYPE} ${CAMERA_MODEL}" \
			XX_MINI_TIMELAPSE_XX "XX_MINI_TIMELAPSE_XX" "${MINI_TIMELAPSE}" \
			XX_MINI_TIMELAPSE_URL_XX "XX_MINI_TIMELAPSE_URL_XX" "${MINI_TIMELAPSE_URL}" \
			onPi "" "${ON_PI}"
	fi
}

if [[ ${REMOTE_WEBSITE} == "true" ]]; then
	if [[ ${REMOTE_HOST} == "" ]]; then
		echo -e "\n${RED}"
		echo "* ERROR: The 'REMOTE_HOST' must be set in 'config/ftp-settings.sh'"
		echo "in order to do a remote website installation."
		echo "Please set it, the password, and other information, then re-run this installation."
		echo -e "${NC}\n"
		exit 1
	fi

	if [[ -f ${ALLSKY_CONFIG}/${CONFIGURATION_FILE_NAME} ]]; then
		# The user is upgrading a new-style website.
		HAS_PRIOR_REMOTE_SERVER="true"
		echo -e "\n${GREEN}"
		echo "You can continue to configure your remote Allsky Website via the WebUI."
		echo -e "${NC}\n"
	else
		# Don't know if the user is upgrading and old-style remote website,
		# or they don't even have a remote website.
		HAS_PRIOR_REMOTE_SERVER="false"
		MSG="You can keep a copy of your remote website's configuration file on your Pi"
		MSG="${MSG}\nso you can easily edit it in the WebUI and have it automatically uploaded."
		MSG="${MSG}\n** This is the recommended way of making changes to the configuration **."
		MSG="${MSG}\n\nWould you like to do that?"
		if (whiptail --title "Allsky Website Installer" --yesno "${MSG}" 15 60 3>&1 1>&2 2>&3); then 
			cp "${ALLSKY_REPO}/${CONFIGURATION_FILE_NAME}.repo" "${ALLSKY_CONFIG}/${CONFIGURATION_FILE_NAME}"
			echo -e "${GREEN}\n"
			echo "To edit the remote configuration file, go to the 'Editor' page in the WebUI"
			echo "and select '${CONFIGURATION_FILE_NAME} (remote Allsky Website)'."
			echo -e "\n${NC}"
		else
			echo -e "\n${YELLOW}"
			echo "You need to manually copy '${ALLSKY_REPO}/${CONFIGURATION_FILE_NAME}.repo'"
			echo "to your remote server and rename it to '${CONFIGURATION_FILE_NAME}'."
			echo -e "${NC}\n"
		fi
	fi

	echo -e "\n${GREEN}"
	echo "*** The Pi portion of the Remote Allsky Website Installation is complete."
	if [ "${HAS_PRIOR_REMOTE_SERVER}" = "true" ]; then
		echo "Please manually update all the files"
		echo "on the remote server the same way you installed them orginally."
	else
		echo "Please manually install all the files"
		echo "on the remote server from ${GITHUB_ROOT}/allsky-website.git."
### TODO: Can we tell the user how?
### Is it possible to ask them if they want this script to download the files to the Pi
### and then ftp the whole directory structure?   Wouldn't that be cool?
	fi
	echo -e "${NC}\n"
	exit 0
fi


#########    Local install


# See if they are upgrading the website, and if so, if the prior website was an "old" one.
# "old" means in the old location and with the old configuration files.
if [ -d "${ALLSKY_WEBSITE}" ]; then
	OLD_WEBSITE_TYPE="new"
	ALLSKY_WEBSITE_OLD="${ALLSKY_WEBSITE}"
elif [ -d "/var/www/html/allsky" ]; then
	OLD_WEBSITE_TYPE="old"
	ALLSKY_WEBSITE_OLD="/var/www/html/allsky"
else
	OLD_WEBSITE_TYPE=""
	ALLSKY_WEBSITE_OLD=""
fi


# Check if the user is updating an existing installation.
# This really only applies if they manually update some files rather than the whole release,
# and ideally would never happen.
if [ "${UPDATE}" = "true" ] ; then
	if [ ! -d "${ALLSKY_WEBSITE}" ]; then
		echo -e "\n${RED}"
		echo "*** ERROR: --update specified but no existing website found at '${ALLSKY_WEBSITE}'."
		echo -e "${NC}\n"
		exit 2
	fi

	modify_locations
	create_data_json_file

	echo -e "\n${GREEN}* Update complete${NC}\n"
	exit 0
fi


if [ -d "${ALLSKY_WEBSITE_OLD}" ]; then
	# git will fail if the new directory already exists and has something in it
	PRIOR_WEBSITE="${ALLSKY_WEBSITE}-OLD"
	if [ -d "${PRIOR_WEBSITE}" ]; then
		echo -e "\n${RED}"
		echo "*** ERROR: A saved copy of a prior Allsky Website already exists."
		echo "See '${PRIOR_WEBSITE}'."
		echo "Can only have one saved prior directory at a time.  Exiting."
		echo -e "${NC}\n"
		exit 3
	fi

	echo -e "${GREEN}* Moving prior website to '${PRIOR_WEBSITE}'${NC}"
	mv "${ALLSKY_WEBSITE}" "${PRIOR_WEBSITE}"
	if [ $? -ne 0 ]; then
		echo -e "\n${RED}*** ERROR: Unable to move prior website.  Exiting.${NC}\n"
		exit 3
	fi
	SAVED_OLD=true
else
	SAVED_OLD=false
fi

if [ "${BRANCH}" = "" ]; then
	B=""
else
	B=" from branch ${BRANCH}"
	BRANCH="-b ${BRANCH}"
fi
echo -e "${GREEN}* Fetching new website files$B into '${ALLSKY_WEBSITE}'${NC}"
git clone ${BRANCH} ${GITHUB_ROOT}/allsky-website.git "${ALLSKY_WEBSITE}"
if [ $? -ne 0 ]; then
	echo -e "\n${RED}"
	echo "*** ERROR: Unable to get Allsky Website files from git."
	echo -e "${NC}\n"
	exit 4
fi
echo

cd "${ALLSKY_WEBSITE}" || exit 1

echo -e "${GREEN}* Creating thumbnails directories${NC}"
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
		echo -e "${GREEN}* Restoring prior videos.${NC}"
		mv "${PRIOR_WEBSITE}"/videos/allsky-*   videos
	fi

	if [ -d "${PRIOR_WEBSITE}/keograms/thumbnails" ]; then
		mv "${PRIOR_WEBSITE}/keograms/thumbnails"   keograms
	fi
	count=$(ls -1 "${PRIOR_WEBSITE}"/keograms/keogram-* 2>/dev/null | wc -l)
	if [ "${count}" -ge 1 ]; then
		echo -e "${GREEN}* Restoring prior keograms.${NC}"
		mv "${PRIOR_WEBSITE}"/keograms/keogram-*   keograms
	fi

	if [ -d "${PRIOR_WEBSITE}/startrails/thumbnails" ]; then
		mv "${PRIOR_WEBSITE}/startrails/thumbnails"   startrails
	fi
	count=$(ls -1 "${PRIOR_WEBSITE}"/startrails/startrails-* 2>/dev/null | wc -l)
	if [ "${count}" -ge 1 ]; then
		echo -e "${GREEN}* Restoring prior startrails.${NC}"
		mv "${PRIOR_WEBSITE}"/startrails/startrails-*   startrails
	fi

	if [ -d "${PRIOR_WEBSITE}/myImages" ]; then
		echo -e "${GREEN}* Restoring prior 'myImages' directory.${NC}"
		mv "${PRIOR_WEBSITE/myImages}"   .
	fi
fi

echo -e "${GREEN}* Fixing ownership and permissions${NC}"
U=$(id --name --user)		# User running this script
sudo chown -R "${U}:www-data" .
find ./ -type f -exec chmod 644 {} \;
find ./ -type d -exec chmod 775 {} \;


echo
echo -e "${GREEN}***** Installation complete *****${NC}"
echo

echo    "+++++++++++++++++++++++++++++++++++++"
if [ "${SAVED_OLD}" = "true" ]; then
	echo -e "Your prior website is in '${PRIOR_WEBSITE}'."
	echo    "All your prior videos, keograms, and startrails were MOVED to the updated website."
	echo -e "\nAfter you are convinced everything is working, remove your prior version.\n"
else
	echo -e "\n${YELLOW}"
	echo    "Before using the website you must edit its configuration by clicking on"
	echo	"the 'Editor' link in the WebUI, then select the ${CONFIGURATION_FILE_NAME} entry."
	echo
	echo	"There are many options, so see ${GITHUB_ROOT}/allsky/wiki/allsky-website-Settings"
	echo	"for more information".
	echo -e "${NC}\n"
fi
echo
