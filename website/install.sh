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

echo -e "${GREEN}* Fetching website files into ${WEBSITE_DIR}${NC}"
git clone https://github.com/thomasjacquin/allsky-website.git "${WEBSITE_DIR}"
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

# xxxx Should set some variables in config.js based on settings_*.json and config.sh.
# In the meantime, let the user know to do it.
echo
echo -e "${GREEN}* Installation complete${NC}"
echo

echo "+++++++++++++++++++++++++++++++++++++"
echo "Before using the website you need to:"
echo "   * Edit '${WEBSITE_DIR}/config.js'"
if [ "${POST_END_OF_NIGHT_DATA}" != "xtrue" ]; then
	echo "   * Set 'POST_END_OF_NIGHT_DATA=true' in ${ALLSKY_CONFIG}/config.sh"
fi
echo
