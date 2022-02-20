#!/bin/bash

if [ -z "${ALLSKY_HOME}" ] ; then
	export ALLSKY_HOME=$(realpath $(dirname "${BASH_ARGV0}")/..)
fi
source "${ALLSKY_HOME}/variables.sh"
source "${ALLSKY_CONFIG}/config.sh"

echo
echo "*************************************"
echo "*** Welcome to the Allsky Website ***"
echo "*************************************"
echo

if [ ! -d "${PORTAL_DIR}" ]; then
	MSG="The website can use the WebUI, but it is not installed in '${WEBSITE_DIR}'."
	MSG="${MSG}\nIf you do NOT have a different web server installed on this machine,"
	MSG="${MSG} we suggest you install the WebUI first."
	MSG="${MSG}\n\nWould you like to manually install the WebUI now?"
	if (whiptail --title "Allsky Website Installer" --yesno "${MSG}" 15 60 3>&1 1>&2 2>&3); then 
		echo -e "\nTo install the WebUI, execute:"
		echo -e "    sudo gui/install.sh"
		exit 0
	fi
	echo
fi

modify_locations() {	# Some files have placeholders for certain locations.  Modify them.
	echo -e "${GREEN}* Modifying locations in web files${NC}"
	(
		cd "${WEBSITE_DIR}"

		sed -i -e "s;XX_ALLSKY_CONFIG_XX;${ALLSKY_CONFIG};" \
			   -e "s;XX_ON_PI_XX;true;" \
			functions.php
	)
}

create_data_json_file() {	# Create a new data.json file and check that it's newest version
	OUTPUT=$(${ALLSKY_SCRIPTS}/postData.sh 2>&1)
	if [ $? -eq 0 -a -f "${WEBSITE_DIR}/data.json" ]; then
		grep --silent "sunrise" "${WEBSITE_DIR}/data.json"
		if [ $? -ne 0 ]; then
			echo -e "${YELLOW}WARNING: you have an old version of ${ALLSKY_SCRIPTS}/postData.sh."
			echo -e "Please grab the latest version from GitHub and"
			echo -e "run it to update the 'data.json' file.${NC}"
		else
			echo -e "${GREEN}* Created new 'data.json' file.${NC}"
		fi
	else
		echo -e "${RED}* Unable to create new 'data.json' file:"
		echo -e "${OUTPUT}"
		echo -e "${NC}"
		echo -e "Make sure 'REMOTE_HOST' is set in 'config/config.sh' to a valid remote server"
		echo -e "or to '', then run ${ALLSKY_SCRIPTS}/postData.sh to create a 'data.json' file."
	fi
}

modify_configuration_variables() {	# Update some of the configuration files and variables
	# If the user is updating the website, use the prior config files.
	# NOTE: if we add/delete a setting in the files we'll need to change the code below.

	if [ "${SAVED_OLD}" = "true" ]; then
		echo -e "${GREEN}* Retoring prior 'config.js' and 'virtualsky.json' files.${NC}"
		cp "${WEBSITE_DIR_OLD}/config.js" "${WEBSITE_DIR_OLD}/virtualsky.json" "${WEBSITE_DIR}"
	else
		echo -e "${GREEN}* Updating settings in ${WEBSITE_DIR}/config.js${NC}"
		# These have N/S and E/W but the config.js needs decimal numbers.
		# "N" is positive, "S" negative for LATITUDE.
		# "E" is positive, "W" negative for LONGITUDE.
		LATITUDE=$(jq -r '.latitude' "$CAMERA_SETTINGS")
		DIRECTION=${LATITUDE:1,-1}
		if [ "${DIRECTION}" = "S" ]; then
			SIGN="-"
			AURORAMAP="south"
		else
			SIGN=""
			AURORAMAP="north"
		fi
		LATITUDE="${SIGN}${LATITUDE%${DIRECTION}}"

		LONGITUDE=$(jq -r '.longitude' "$CAMERA_SETTINGS")
		DIRECTION=${LONGITUDE:1,-1}
		if [ "${DIRECTION}" = "W" ]; then
			SIGN="-"
		else
			SIGN=""
		fi
		LONGITUDE="${SIGN}${LONGITUDE%${DIRECTION}}"
		COMPUTER=$(tail -1 /proc/cpuinfo | sed 's/.*: //')
		# xxxx TODO: anything else we can set?
		sed -i \
			-e "/latitude:/c\    latitude: ${LATITUDE}," \
			-e "/longitude:/c\    longitude: ${LONGITUDE}," \
			-e "/auroraMap:/c\    auroraMap: \"${AURORAMAP}\"," \
			-e "/computer:/c\    computer: \"${COMPUTER}\"," \
				"${WEBSITE_DIR}/config.js"
	fi
}


# Check if the user is updating an existing installation.
if [ "${1}" = "--update" -o "${1}" = "-update" ] ; then
	shift
	if [ ! -d "${WEBSITE_DIR}" ]; then
		echo -e "${RED}*** ERROR: --update specified but no existing website found in '${WEBSITE_DIR}'${NC}" 1>&2
		echo
		exit 2
	fi

	modify_locations
	create_data_json_file

	echo
	echo -e "${GREEN}* Update complete${NC}"
	echo
	exit 0		# currently nothing else to do for updates
fi

if [ -d "${WEBSITE_DIR}" ]; then
	# git will fail if the directory already exists
	WEBSITE_DIR_OLD="${WEBSITE_DIR}-OLD"
	if [ -d "${WEBSITE_DIR_OLD}" ]; then
		echo -e "${RED}*** ERROR: OLD allsky website directory already exists.  Exiting.${NC}" 1>&2
		echo -e "See '${WEBSITE_DIR_OLD}'." 1>&2
		echo -e "Can only have one OLD directory at a time." 1>&2
		echo
		exit 3
	fi
	echo -e "${GREEN}* Saving old website to '${WEBSITE_DIR_OLD}'${NC}"
	mv "${WEBSITE_DIR}" "${WEBSITE_DIR_OLD}"
	if [ $? -ne 0 ]; then
		echo -e "${RED}*** ERROR: Unable to save old website.  Exiting.${NC}" 1>&2
		echo
		exit 3
	fi
	SAVED_OLD=true
else
	SAVED_OLD=false
fi

echo -e "${GREEN}* Fetching website files into '${WEBSITE_DIR}'${NC}"
git clone https://github.com/thomasjacquin/allsky-website.git "${WEBSITE_DIR}"
[ $? -ne 0 ] && echo -e "\n${RED}*** ERROR: Exiting installation${NC}\n" && exit 4
echo

cd "${WEBSITE_DIR}"

# If the directories already exist, don't mess with them.
if [ ! -d startrails/thumbnails -o ! -d keograms/thumbnails -o ! -d videos/thumbnails ]; then
	echo -e "${GREEN}* Creating thumbnails directories${NC}"
	mkdir -p startrails/thumbnails keograms/thumbnails videos/thumbnails
	echo

	echo -e "${GREEN}* Fixing ownership and permissions${NC}"
	chown -R pi:www-data .
	find ./ -type f -exec chmod 644 {} \;
	find ./ -type d -exec chmod 775 {} \;
	echo
fi

modify_locations
modify_configuration_variables
create_data_json_file

if [ "${SAVED_OLD}" = "true" ]; then
	# Each directory has one .php file plus zero or more images.
	# Move the thumbnails first so it doesn't appear in the count.

	if [ -d "${WEBSITE_DIR_OLD}/videos/thumbnails" ]; then
		mv "${WEBSITE_DIR_OLD}/videos/thumbnails" videos
	fi
	count=$(ls -1 "${WEBSITE_DIR_OLD}/videos" | wc -l)
	if [ "${count}" -gt 1 ]; then
		echo -e "${GREEN}* Restoring prior videos${NC}"
		mv "${WEBSITE_DIR_OLD}"/videos/allsky-* videos
	fi

	if [ -d "${WEBSITE_DIR_OLD}/keograms/thumbnails" ]; then
		mv "${WEBSITE_DIR_OLD}/keograms/thumbnails" keograms
	fi
	count=$(ls -1 "${WEBSITE_DIR_OLD}/keograms" | wc -l)
	if [ "${count}" -gt 1 ]; then
		echo -e "${GREEN}* Restoring prior keograms${NC}"
		mv "${WEBSITE_DIR_OLD}"/keograms/keogram-* keograms
	fi

	if [ -d "${WEBSITE_DIR_OLD}/startrails/thumbnails" ]; then
		mv "${WEBSITE_DIR_OLD}/startrails/thumbnails" startrails
	fi
	count=$(ls -1 "${WEBSITE_DIR_OLD}/startrails" | wc -l)
	if [ "${count}" -gt 1 ]; then
		echo -e "${GREEN}* Restoring prior startrails${NC}"
		mv "${WEBSITE_DIR_OLD}"/startrails/startrails-* startrails
	fi
fi

echo
echo -e "${GREEN}* Installation complete${NC}"
echo

echo    "+++++++++++++++++++++++++++++++++++++"
if [ "${SAVED_OLD}" = "true" ]; then
	echo -e "Your prior website is in '${WEBSITE_DIR_OLD}'."
	echo    "All your prior videos, keograms, and startrails, as well as prior configuration files"
	echo    "were MOVED to the updated website".
	echo -e "\nAfter you are convinced everything is working remove your prior version.\n"
else
	echo    "Before using the website you should:"
	echo -e "   * Edit ${YELLOW}${WEBSITE_DIR}/config.js${NC}"
	echo -e "   * Look at, and possibly edit ${YELLOW}${WEBSITE_DIR}/virtualsky.json${NC}"
	echo    "     See https://github.com/thomasjacquin/allsky/wiki/allsky-website-Settings for more information".
fi
if [ "${POST_END_OF_NIGHT_DATA}" != "true" ]; then
	echo    "   * Set 'POST_END_OF_NIGHT_DATA=true' in ${ALLSKY_CONFIG}/config.sh"
fi
echo
