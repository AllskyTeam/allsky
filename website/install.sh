#!/bin/bash

if [ -z "${ALLSKY_HOME}" ] ; then
	export ALLSKY_HOME=$(realpath $(dirname "${BASH_ARGV0}")/..)
fi
source "${ALLSKY_HOME}/variables.sh" || exit 1
source "${ALLSKY_SCRIPTS}/functions.sh" || exit 1

if [[ $EUID -eq 0 ]]; then
	display_msg error "This script must NOT be run as root, do NOT use 'sudo'."
	exit 1
fi

source "${ALLSKY_CONFIG}/config.sh"
source "${ALLSKY_CONFIG}/ftp-settings.sh"
ME="$(basename "${BASH_ARGV0}")"

TITLE="Allsky Website Installer"
ALLSKY_VERSION="$( < "${ALLSKY_HOME}/version" )"
ALLSKY_WEBSITE_VERSION="$( < "${ALLSKY_WEBSITE}/version" )"
ALLSKY_OWNER=$(id --group --name)
WEBSERVER_GROUP="www-data"
REPO_FILE="${ALLSKY_REPO}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}.repo"


####################### functions

# Display a header surrounded by stars.
display_header() {
	HEADER="${1}"
	((LEN=${#HEADER} + 8))		# 8 for leading and trailing "*** "
	STARS=""
	while [[ ${LEN} -gt 0 ]]; do
		STARS="${STARS}*"
		((LEN--))
	done
	echo
	echo "${STARS}"
	echo -e "*** ${HEADER} ***"
	echo "${STARS}"
	echo
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
	echo -e "${C}Usage: ${ME} [--help] [--debug] [--remote] [--branch name] [--update] [--function name]${NC}"
	echo
	echo "'--help' displays this message and exits."
	echo
	echo "'--remote' keeps a copy of a remote server's configuration file on the"
	echo "   Pi where it can be updated in the WebUI and uploaded to the server."
	echo "   This will have no impact on a local Allsky Website, if installed."
	echo
	echo "The '--branch' option should only be used when instructed to by an Allsky developer."
	echo "  'name' is a valid branch name at ${GITHUB_ROOT}/allsky-website."
	echo
	echo "'--update' should only be used when instructed to by an Allsky Website page."
	echo
	echo "'--function' executes the specified function and quits."
	echo
	exit ${RET}
}


##### Modify placeholders.
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
		MSG="Unable to create new 'data.json' file:"
		MSG="${MSG}\n${OUTPUT}"
		MSG="${MSG}\nMake sure 'REMOTE_HOST' is set to a valid server in 'config/ftp-settings.sh',"
		MSG="${MSG}\nor to '', then run ${ALLSKY_SCRIPTS}/postData.sh to create a 'data.json' file."
		display_msg error "${MSG}"
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

	CONFIG_FILE="${CONFIG_FILE_DIRECTORY}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}"
	WEB_CONFIG_FILE="${CONFIG_FILE}"	# default configuration file
}


##### # Check if this is an older configuration file.
check_for_older_config_file() {
	FILE="${1}"

	OLD=false
	PRIOR_CONFIG_VERSION="$(jq .ConfigVersion "${FILE}")"
	if [[ ${PRIOR_CONFIG_VERSION} == "null" ]]; then
		OLD=true
	else
		NEW_CONFIG_VERSION="$(jq .ConfigVersion "${REPO_FILE}")"
		if [[ ${PRIOR_CONFIG_VERSION} < "${NEW_CONFIG_VERSION}" ]]; then
			OLD=true
		fi
	fi

	if [[ ${OLD} == "true" ]]; then
		display_msg warning "Your ${FILE} is an older version."
		MSG="Your    version: ${PRIOR_CONFIG_VERSION}"
		MSG="${MSG}\nCurrent version: ${NEW_CONFIG_VERSION}"
		MSG="${MSG}\nPlease compare your file to the new one in"
		MSG="${MSG}\n${REPO_FILE}"
		MSG="${MSG}\nto see what fields have been added, changed, or removed.\n"
		display_msg info "${MSG}"
	fi
}


##### Update the json configuration file, either for the local machine or a remote one.
update_website_configuration_file() {
	display_msg progress "Updating settings in ${WEB_CONFIG_FILE}."

	# Get the array index for the mini-timelapse.
	INDEX=$(jq .homePage.sidebar "${WEB_CONFIG_FILE}" | \
		gawk 'BEGIN { n = -1; } {
			if ($1 == "{") {
				n++;
				next;
			}
			if ($0 ~ /Mini-timelapse/) {
				printf("%d", n);
				exit 0
			}
		}')
	MINI_TLAPSE_DISPLAY="homePage.sidebar[${INDEX}].display"
	MINI_TLAPSE_URL="homePage.sidebar[${INDEX}].url"

	if [ "${TIMELAPSE_MINI_IMAGES:-0}" -eq 0 ]; then
		MINI_TLAPSE_DISPLAY_VALUE="false"
		MINI_TLAPSE_URL_VALUE=""
	else
		MINI_TLAPSE_DISPLAY_VALUE="true"
		if [ "${REMOTE_WEBSITE}" = "true" ]; then
			MINI_TLAPSE_URL_VALUE="mini-timelapse.mp4"
		else
			MINI_TLAPSE_URL_VALUE="/${IMG_DIR}/mini-timelapse.mp4"
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
	"${ALLSKY_SCRIPTS}/updateWebsiteConfig.sh" --silent ${DEBUG_ARG} \
		--config "${WEB_CONFIG_FILE}" \
		config.imageName		"imageName"		"${IMAGE_NAME}" \
		config.latitude			"latitude"		"${LATITUDE}" \
		config.longitude		"longitude"		"${LONGITUDE}" \
		config.auroraMap		"auroraMap"		"${AURORAMAP}" \
		config.computer			"computer"		"${COMPUTER}" \
		config.camera			"camera"		"${CAMERA_TYPE}${CAMERA_MODEL}" \
		config.AllskyVersion	"AllskyVersion"	"${ALLSKY_VERSION}" \
		config.AllskyWebsiteVersion "AllskyWebsiteVersion" "${ALLSKY_WEBSITE_VERSION}" \
		homePage.onPi			"onPi"			"${ON_PI}" \
		${MINI_TLAPSE_DISPLAY} "mini_display"	"${MINI_TLAPSE_DISPLAY_VALUE}" \
		${MINI_TLAPSE_URL}		"mini_url"		"${MINI_TLAPSE_URL_VALUE}"
}


##### If the user is updating the website, use the prior config file(s).
HAS_NEW_CONFIGURATION_FILE=false
modify_configuration_variables() {
	if [ "${SAVED_OLD}" = "true" ]; then
		if [ "${OLD_WEBSITE_TYPE}" = "new" ]; then
			C="${PRIOR_WEBSITE}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}"
			if [[ ! -f ${C} ]]; then
				# This "shouldn't" happen with a new-style website, but in case it does...
				display_msg warning "Prior new-style website in ${PRIOR_WEBSITE} had no '${ALLSKY_WEBSITE_CONFIGURATION_NAME}'."
				HAS_NEW_CONFIGURATION_FILE=true
				cp "${REPO_FILE}" "${CONFIG_FILE}"
				return
			else
				display_msg progress "Restoring prior '${ALLSKY_WEBSITE_CONFIGURATION_NAME}'."
				mv "${C}" "${CONFIG_FILE}"
			fi

			# Check if this is an older configuration file.
			check_for_older_config_file "${CONFIG_FILE}"
		else
			# Old-style Website - merge old config files into new one.

# TODO: Merge ${ALLSKY_WEBSITE_OLD}/config.js and ${ALLSKY_WEBSITE_OLD}/virtualsky.json
# into ${ALLSKY_WEBSITE}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}.
# display_msg progress "Merging contents of prior 'config.js' and 'virtualsky.json' files into '${ALLSKY_WEBSITE_CONFIGURATION_NAME}'."

			MSG="When installation is done you must copy the contents of the prior"
			MSG="${MSG}\n   ${ALLSKY_WEBSITE_OLD}/config.js"
			MSG="${MSG}\nand"
			MSG="${MSG}\n   ${ALLSKY_WEBSITE_OLD}/virtualsky.json"
			MSG="${MSG}\nfiles into '${ALLSKY_WEBSITE}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}'."
			MSG="${MSG}\nCheck the Wiki for the meaning of the MANY new options."
			display_msg info "${MSG}"
		fi
	else
		# New website, so set up a default configuration file.
		HAS_NEW_CONFIGURATION_FILE=true
		cp "${REPO_FILE}" "${CONFIG_FILE}"
		WEB_CONFIG_FILE="${CONFIG_FILE}"
		update_website_configuration_file
		display_msg progress "Creating default '${ALLSKY_WEBSITE_CONFIGURATION_NAME}' file."
	fi
}

##### Help with a remote website installation, then exit
do_remote_website() {
	if [[ ${REMOTE_HOST} == "" ]]; then
		MSG="The 'REMOTE_HOST' must be set in 'config/ftp-settings.sh'\n"
		MSG="${MSG}in order to do a remote website installation.\n"
		MSG="${MSG}Please set it, the password, and other information, then re-run this installation."
		display_msg error "${MSG}"
		exit 1
	fi

	if [[ -f ${ALLSKY_CONFIG}/${ALLSKY_WEBSITE_CONFIGURATION_NAME} ]]; then
		# The user is upgrading a new-style website.
		HAS_PRIOR_REMOTE_SERVER="true"
		display_msg progress "\nYou can continue to configure your remote Allsky Website via the WebUI.\n"

		# Check if this is an older configuration file.
		check_for_older_config_file "${ALLSKY_CONFIG}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}"
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
			WEB_CONFIG_FILE="${REMOTE_CONFIG_FILE}"
			update_website_configuration_file

			MSG="\nTo edit the remote configuration file, go to the 'Editor' page in the WebUI\n"
			MSG="${MSG}and select '${ALLSKY_WEBSITE_CONFIGURATION_NAME} (remote Allsky Website)'.\n"
			display_msg info "${MSG}"
		else
			MSG="You need to manually copy '${REPO_FILE}'"
			MSG="${MSG}to your remote server and rename it to '${ALLSKY_WEBSITE_CONFIGURATION_NAME}',"
			MSG="${MSG}then modify it."
			display_msg warning "${MSG}"
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
}

##### Handle an update to the website, then exit
do_update() {
	if [ ! -d "${ALLSKY_WEBSITE}" ]; then
		display_msg error " --update specified but no existing website found at '${ALLSKY_WEBSITE}'."
		exit 2
	fi

	modify_locations
	create_data_json_file

	display_msg progress "\nUpdate complete!\n"
	exit 0
}


##### Download the Allsky Website files and exit on error.
download_Allsky_Website() {
	if [ "${BRANCH}" = "" ]; then
		BRANCH="master"
		B=""
	else
		B=" from branch ${BRANCH}"
	fi
	BRANCH="-b ${BRANCH}"

	display_msg progress "Downloading Allsky Website files${B} into ${ALLSKY_WEBSITE}."
	TMP="/tmp/git.install.tmp"
	git clone ${BRANCH} ${GITHUB_ROOT}/allsky-website.git "${ALLSKY_WEBSITE}" > ${TMP} 2>&1
	if [ $? -ne 0 ]; then
		display_msg error "Unable to get Allsky Website files from git."
		cat ${TMP}
		exit 4
	fi
}



##### See if they are upgrading the website, and if so, if the prior website was an "old" one.
# "old" means in the old location and with the old configuration files.
save_prior_website() {
	SAVED_OLD=false

	if [ -d "${ALLSKY_WEBSITE}" ]; then
		ALLSKY_WEBSITE_OLD="${ALLSKY_WEBSITE}"
		OLD_WEBSITE_TYPE="new"
	elif [ -d "/var/www/html/allsky" ]; then
		ALLSKY_WEBSITE_OLD="/var/www/html/allsky"
		OLD_WEBSITE_TYPE="old"
	else
		# Is no prior website
		ALLSKY_WEBSITE_OLD=""
		OLD_WEBSITE_TYPE=""
		return
	fi

	# git will fail if the new directory already exists and has something in it
	PRIOR_WEBSITE="${ALLSKY_WEBSITE}-OLD"
	if [ -d "${PRIOR_WEBSITE}" ]; then
		MSG="A saved copy of a prior Allsky Website already exists in"
		MSG="${MSG}\n     ${PRIOR_WEBSITE}"
		MSG="${MSG}\n\nCan only have one saved prior version at a time."
		display_msg error "${MSG}"
		display_msg info "\nRemove or rename that directory and run the installation again.\n"
		exit 3
	fi

	display_msg progress "Moving prior ${OLD_WEBSITE_TYPE}-style website to '${PRIOR_WEBSITE}'."
	mv "${ALLSKY_WEBSITE}" "${PRIOR_WEBSITE}"
	if [ $? -ne 0 ]; then
		display_msg error "Unable to move prior website."
		exit 3
	fi
	SAVED_OLD=true
}

##### Restore prior files.
restore_prior_files() {
	[[ ${SAVED_OLD} != "true" ]] && return

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

		A="analyticsTracking.js"
		if [ -f "${PRIOR_WEBSITE}/${A}" ]; then
			if ! cmp --silent "${PRIOR_WEBSITE}/${A}" "${A}" ; then
				display_msg progress "Restoring prior '${A}'."
				mv "${PRIOR_WEBSITE}/${A}" .
			fi
		fi
}

####################### main part of program

# Check arguments
OK="true"
HELP="false"
DEBUG=false
DEBUG_ARG=""
BRANCH="master"
UPDATE="false"
FUNCTION=""
REMOTE_WEBSITE="false"
while [ $# -gt 0 ]; do
	ARG="${1}"
	case "${ARG}" in
		--help)
			HELP="true"
			;;
		--debug)
			DEBUG=true
			DEBUG_ARG="${ARG}"		# we can pass this to other scripts
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
		--function)
			FUNCTION="${2}"
			shift
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

##### Display the welcome header
if [[ ${REMOTE_WEBSITE} == "true" ]]; then
	U2="for remote servers "
else
	U2=""
fi
H="Welcome to the ${TITLE} ${U2}"
display_header "${H}"

set_configuration_file_variables


##### Handle remote websites
[[ ${REMOTE_WEBSITE} == "true" ]] && do_remote_website		# does not return


#########    Local install


# Check if the user is updating an existing installation.
# This really only applies if they manually update some files rather than the whole release,
# and ideally would never happen.
[ "${UPDATE}" = "true" ]  && do_update		# does not return


##### Execute any specified function, then exit.
if [[ ${FUNCTION} != "" ]]; then
	if ! type ${FUNCTION} > /dev/null; then
		display_msg error "Unknown function: '${FUNCTION}'."
		exit 1
	fi

	${FUNCTION}
	exit 0
fi


##### Handle prior websites
save_prior_website


##### Download Allsky Website files
download_Allsky_Website

cd "${ALLSKY_WEBSITE}" || exit 1

modify_locations
modify_configuration_variables
create_data_json_file
restore_prior_files

# Create any directories not created above.
mkdir -p startrails/thumbnails keograms/thumbnails videos/thumbnails

# The webserver needs to be able to update the configuration file and create thumbnails.
display_msg progress "Setting ownership and permissions."
sudo chown -R "${ALLSKY_OWNER}:${WEBSERVER_GROUP}" .
find ./ -type f -exec chmod 644 {} \;
find ./ -type d -exec chmod 775 {} \;


echo -en "${GREEN}"
display_header "Installation is complete"
echo -en "${NC}"


if [[ ${SAVED_OLD} == "true" ]]; then
	MSG="\nYour prior website is in '${PRIOR_WEBSITE}'."
	MSG="${MSG}\nAll your prior videos, keograms, and startrails were MOVED to the updated website."
	MSG="${MSG}\nAfter you are convinced everything is working, remove your prior version.\n"
	display_msg info "${MSG}"
fi

if [[ ${HAS_NEW_CONFIGURATION_FILE} == "true" ]]; then
	MSG="\nBefore using the website you must edit its configuration by clicking on"
	MSG="${MSG}\nthe 'Editor' link in the WebUI, then select the"
	MSG="${MSG}\n    ${ALLSKY_WEBSITE_CONFIGURATION_NAME} (Allsky Website)"
	MSG="${MSG}\nentry.  See ${GITHUB_ROOT}/allsky/wiki/allsky-website-Settings for more information.\n"
	display_msg info "${MSG}"
fi

echo

