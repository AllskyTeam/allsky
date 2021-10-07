#!/bin/bash

if [ -z "${ALLSKY_HOME}" ] ; then
	export ALLSKY_HOME=$(realpath $(dirname "${BASH_ARGV0}")/..)
fi
source ${ALLSKY_HOME}/variables.sh

echo -en '\n'
echo -e "*************************************"
echo    "*** Welcome to the Allsky Website ***"
echo -e "*************************************"
echo -en '\n'

echo -en "${GREEN}* Fetching website files\n${NC}"
git clone https://github.com/thomasjacquin/allsky-website.git "${WEBSITE_DIR}"
echo -en '\n'

cd "${WEBSITE_DIR}"

# xxxx Should set some variables in config.js based on settings_*.json and config.sh

echo -en "${GREEN}* Creating thumbnails directories\n${NC}"
mkdir startrails/thumbnails keograms/thumbnails videos/thumbnails
echo -en '\n'

echo -en "${GREEN}* Fixing ownership and permissions\n${NC}"
chown -R pi:www-data .
find ./ -type f -exec chmod 644 {} \;
find ./ -type d -exec chmod 775 {} \;
echo -en '\n'
