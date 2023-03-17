#!/bin/bash

# Shell variables and functions used by the installation and upgrade scripts.
# This file is "source"d into others, and must be done AFTER source'ing variables.sh.

ALLSKY_OWNER=$(id --group --name)		# The login installing Allsky
ALLSKY_GROUP=${ALLSKY_OWNER}
WEBSERVER_GROUP="www-data"
ALLSKY_VERSION="$(get_version "${ALLSKY_HOME}" )"
REPO_WEBCONFIG_FILE="${ALLSKY_REPO}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}.repo"
OLD_WEBUI_LOCATION="/var/www/html"		# location of old-style WebUI
OLD_WEBSITE_LOCATION="${OLD_WEBUI_LOCATION}/allsky"



#####
# Display a header surrounded by stars.
display_header() {
	local HEADER="${1}"
	local LEN=((${#HEADER} + 8))		# 8 for leading and trailing "*** "
	local STARS=""
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

#####
calc_wt_size()
{
	WT_WIDTH=$(tput cols)
	[[ ${WT_WIDTH} -gt 80 ]] && WT_WIDTH=80
}

#####
# Get a Git version, stripping any trailing newline.
# Return "" if none, or on error.
function get_Git_version() {
	local BRANCH="${1}"
	local PACKAGE="${2}"
	echo -n "$(curl --show-error --silent "${GITHUB_RAW_ROOT}/${PACKAGE}/${BRANCH}/version" | tr -d '\n\r')"
}


#####
# Get the version from a local file, if it exists.
function get_version() {
	local F="${1}"
	if [[ -f ${F} ]]; then
		local VALUE="$( < "${F}" )"
		echo -n "${VALUE}" | tr -d '\n\r'
	fi
}


#####
# Get the branch from a local file, if it exists.
function get_branch() {
	# Branch file is same format as Version file.
	echo -n "$(get_version "${1}")"
}
