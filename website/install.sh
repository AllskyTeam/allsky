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
mkdir startrails/thumbnails
mkdir keograms/thumbnails
mkdir videos/thumbnails
echo -en '\n'

echo -en "${GREEN}* Fixing ownership and permissions\n${NC}"
chown -R pi:www-data .
chmod -R 755 .
chmod 0775 startrails/thumbnails
chmod 0775 keograms/thumbnails
chmod 0775 videos/thumbnails
echo -en '\n'
