#!/bin/bash
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color
echo -en '\n'
echo -e "${RED}*******************************"
echo    "*** Welcome to the Allsky Website ***"
echo -e "*************************************${NC}"
echo -en '\n'

echo -en "${GREEN}* Fetching website files\n${NC}"
git clone https://github.com/thomasjacquin/allsky-website.git /var/www/html/allsky
echo -en '\n'

echo -en "${GREEN}* Create thumbnails directories\n${NC}"
cd /var/www/html
mkdir ./allsky/startrails/thumbnails
mkdir ./allsky/keograms/thumbnails
echo -en '\n'

echo -en "${GREEN}* Fixing ownership and permissions\n${NC}"
cd /var/www/html
chown -R pi:www-data allsky
chmod -R 755 allsky
chmod 0775 ./allsky/startrails/thumbnails
chmod 0775 ./allsky/keograms/thumbnails
echo -en '\n'
