#!/bin/bash
# shellcheck disable=SC2034		# variable unused

# This file is source'd into other files to set some variables used by scripts.
# This allows us to easily add and change directory names.
# It should only be called after ${ALLSKY_HOME} is set.

if [[ -z "${ALLSKY_VARIABLE_SET}" ]]; then
	set -a	# automatically export all variables

	ALLSKY_VARIABLE_SET="true"	# so we only do the following once

	ME2="$(basename "${BASH_SOURCE[0]}")"

	# Set colors used by many scripts in output.
	# If we're not on a tty output is likely being written to a file, so don't use colors.
	# The "w" colors are for when output may go to a web page.
	if tty --silent ; then
		ON_TTY=1
		GREEN="\033[0;32m";		wOK="${GREEN}"
		YELLOW="\033[0;33m";	wWARNING="${YELLOW}"
		RED="\033[0;31m";		wERROR="${RED}"
		DEBUG="${YELLOW}";		wDEBUG="${YELLOW}"
		NC="\033[0m";			wNC="${NC}"
								wBOLD="["; wNBOLD="]"
								wBR="\n"
	else
		ON_TTY=0
		GREEN="";				wOK="<span style='color: green'>"
		YELLOW="";				wWARNING="<span style='color: #FF9800'>"
		RED="";					wERROR="<span style='color: red'>"
		DEBUG="";				wDEBUG="${wWARNING}"
		NC="";					wNC="</span>"
								wBOLD="<b>"; wNBOLD="</b>"
								wBR="<br>"
	fi

	if [[ -z "${ALLSKY_HOME}" ]] ; then	# This must come after setting colors above
		echo -en "${RED}"
		echo -n "${ME2}: ERROR: ALLSKY_HOME not set!"
		echo -e "${NC}"
		return 1
	fi

	# Directory Allsky is installed in.
	ALLSKY_INSTALL_DIR="$( basename "${ALLSKY_HOME}" )"

	# Optional prior copy of Allsky.
	PRIOR_ALLSKY_DIR="$(dirname "${ALLSKY_HOME}")/${ALLSKY_INSTALL_DIR}-OLD"

	# For temporary files or files that can be deleted at reboot.
	ALLSKY_TMP="${ALLSKY_HOME}/tmp"

	# Central location for all AllSky configuration files.
	ALLSKY_CONFIG="${ALLSKY_HOME}/config"

	# Central location for all master repository configuration files.
	ALLSKY_REPO="${ALLSKY_HOME}/config_repo"

	# Holds all the scripts.
	ALLSKY_SCRIPTS="${ALLSKY_HOME}/scripts"

	# Holds all the binaries.
	ALLSKY_BIN="${ALLSKY_HOME}/bin"

	# Holds all the images on a per-day basis.
	ALLSKY_IMAGES="${ALLSKY_HOME}/images"

	# Holds all the notification images.
	ALLSKY_NOTIFICATION_IMAGES="${ALLSKY_HOME}/notification_images"
	# Holds log of notifications displayed during this session.
	ALLSKY_NOTIFICATION_LOG="${ALLSKY_TMP}/notification_log.txt"

	# Holds temporary messages to display in the WebUI.
	ALLSKY_MESSAGES="${ALLSKY_CONFIG}/messages.txt"

	# Holds information on what the user needs to do after an installation.
	ALLSKY_INSTALLATION_LOGS="${ALLSKY_CONFIG}/installation_logs"
	POST_INSTALLATION_ACTIONS="${ALLSKY_INSTALLATION_LOGS}/post-installation_actions.txt"

	# Holds temporary list of aborted uploads and timelapse since another one was in progress
	ALLSKY_ABORTEDUPLOADS="${ALLSKY_TMP}/aborted_uploads.txt"
	ALLSKY_ABORTEDTIMELAPSE="${ALLSKY_TMP}/aborted_timelapse.txt"

	# Holds all the dark frames.
	ALLSKY_DARKS="${ALLSKY_HOME}/darks"

	# Location of WebUI.
	ALLSKY_WEBUI="${ALLSKY_HOME}/html"

	# Base location of the overlay and module configuration and data files.
	ALLSKY_OVERLAY="${ALLSKY_CONFIG}/overlay"
	ALLSKY_MODULES="${ALLSKY_CONFIG}/modules"
	ALLSKY_MODULE_LOCATION="/opt/allsky"
	ALLSKY_EXTRA="${ALLSKY_OVERLAY}/extra"

	# Verion file and option branch file.
	ALLSKY_VERSION_FILE="${ALLSKY_HOME}/version"
	ALLSKY_BRANCH_FILE="${ALLSKY_HOME}/branch"

	# Location of optional allsky-website package.
	ALLSKY_WEBSITE="${ALLSKY_WEBUI}/allsky"
	ALLSKY_WEBSITE_VERSION_FILE="${ALLSKY_WEBSITE}/version"
	ALLSKY_WEBSITE_BRANCH_FILE="${ALLSKY_WEBSITE}/branch"
	ALLSKY_WEBSITE_VIEWSETTINGS_DIRECTORY_NAME="viewSettings"
	ALLSKY_WEBSITE_VIEWSETTINGS_DIRECTORY="${ALLSKY_WEBSITE}/${ALLSKY_WEBSITE_VIEWSETTINGS_DIRECTORY_NAME}"
	ALLSKY_WEBSITE_CONFIGURATION_NAME="configuration.json"
	ALLSKY_REMOTE_WEBSITE_CONFIGURATION_NAME="remote_${ALLSKY_WEBSITE_CONFIGURATION_NAME}"
	ALLSKY_WEBSITE_CONFIGURATION_FILE="${ALLSKY_WEBSITE}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}"
	ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE="${ALLSKY_CONFIG}/${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_NAME}"

	# Holds all the Allsky documentation.
	ALLSKY_DOCUMENTATION="${ALLSKY_WEBUI}/documentation"

	# Log files for main Allsky and modules
	ALLSKY_LOG="/var/log/allsky.log"
	ALLSKY_PERIODIC_LOG="/var/log/allskyperiodic.log"

	# GitHub information - package names, repository, and contents of a file.
	GITHUB_ROOT="https://github.com/thomasjacquin"
	GITHUB_RAW_ROOT="https://raw.githubusercontent.com/thomasjacquin"
	GITHUB_MAIN_BRANCH="master"
	GITHUB_ALLSKY_PACKAGE="allsky"
	GITHUB_WEBSITE_PACKAGE="allsky-website"

	# NAMEs of some configuration files:
	#	Camera Capabilities - specific to a camera type and model (cc.json)
	#	Allsky WebUI settings - specific to a camera type and model (settings.json)
	#	Allsky WebUI options - created at installation and when camera type changes (options.json)
	# They are configuration files so go in ${ALLSKY_CONFIG) like all the other config files.
	CC_FILE="${ALLSKY_CONFIG}/cc.json"
	SETTINGS_FILE="${ALLSKY_CONFIG}/settings.json"
	OPTIONS_FILE="${ALLSKY_CONFIG}/options.json"

	# These EXIT codes from the capture programs must match what's in src/include/allsky_common.h
	# Anything at or above EXIT_ERROR_STOP is unrecoverable and the service must be stopped
	EXIT_OK=0
	EXIT_RESTARTING=98		# process is restarting, i.e., stop, then start
	EXIT_RESET_USB=99		# need to reset USB bus; cannot continue
	EXIT_ERROR_STOP=100		# unrecoverable error - need user action so stop service
	EXIT_NO_CAMERA=101		# cannot find camera

	# If a user wants to define new variables or assign variables differently,
	# then load their file if it exists.
	# shellcheck disable=SC1090,SC1091
	[[ -f ${ALLSKY_CONFIG}/uservariables.sh ]] && source "${ALLSKY_CONFIG}/uservariables.sh"
fi

return 0
