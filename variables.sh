#!/bin/bash
# shellcheck disable=SC2034		# variable unused

# This file is source'd into other files to set some variables used by scripts.
# This allows us to easily add and change directory names.
# It should only be called after ${ALLSKY_HOME} is set.

if [[ -z "${ALLSKY_VARIABLE_SET}" ]]; then
	set -a	# automatically export all variables

	ALLSKY_VARIABLE_SET="true"	# so we only do the following once

	ME2="$( basename "${BASH_SOURCE[0]}" )"

	# Set colors used by many scripts in output.
	# If we're not on a tty output is likely being written to a file, so don't use colors.
	# The "w" colors are for when output may go to a web page.
	if tty --silent ; then
		ON_TTY="true"
		GREEN="\033[0;32m";		wOK="${GREEN}"
		YELLOW="\033[0;33m";	wWARNING="${YELLOW}"
		RED="\033[0;31m";		wERROR="${RED}"
		# Can't use DEBUG since lots of scripts use that to enable debugging
		cDEBUG="${YELLOW}";		wDEBUG="${YELLOW}"
		NC="\033[0m";			wNC="${NC}"
								wBOLD="["; wNBOLD="]"
								wBR="\n"
	else
		ON_TTY="false"
		GREEN="";				wOK="<span style='color: green'>"
		YELLOW="";				wWARNING="<span style='color: #FF9800'>"
		RED="";					wERROR="<span style='color: red'>"
		cDEBUG="";				wDEBUG="${wWARNING}"
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

	# For temporary files or files that can be deleted at reboot.
	ALLSKY_TMP="${ALLSKY_HOME}/tmp"

	# Central location for all AllSky configuration files.
	ALLSKY_CONFIG="${ALLSKY_HOME}/config"

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

	# Holds a count of continuous "bad" images
	ALLSKY_BAD_IMAGE_COUNT="${ALLSKY_TMP}/bad_image_count.txt"

	# Holds the PID of the process that called timelapse.sh.
	ALLSKY_TIMELAPSE_PID_FILE="${ALLSKY_TMP}/timelapse-pid.txt"

	# Camera information:
	# List of ALL connected cameras.
	CONNECTED_CAMERAS_INFO="${ALLSKY_TMP}/connected_cameras.txt"
	# Supported RPi cameras
	RPi_SUPPORTED_CAMERAS="${ALLSKY_CONFIG}/RPi_cameraInfo.txt"

	# Holds information on what the user needs to do after an installation.
	ALLSKY_LOGS="${ALLSKY_CONFIG}/logs"
	POST_INSTALLATION_ACTIONS="${ALLSKY_LOGS}/post-installation_actions.txt"
	OLD_ALLSKY_REMINDER="${ALLSKY_LOGS}/allsky-OLD_reminder.txt"

	# Holds temporary list of aborted processes since another one was in progress.
	ALLSKY_ABORTS_DIR="${ALLSKY_TMP}/aborts"
	ALLSKY_ABORTEDUPLOADS="uploads.txt"
	ALLSKY_ABORTEDTIMELAPSE="timelapse.txt"
	ALLSKY_ABORTEDSAVEIMAGE="saveImage.txt"

	# Holds all the dark frames.
	ALLSKY_DARKS="${ALLSKY_HOME}/darks"

	# Location of WebUI.
	ALLSKY_WEBUI="${ALLSKY_HOME}/html"

	# Base location of the overlay and module configuration and data files.
	ALLSKY_OVERLAY="${ALLSKY_CONFIG}/overlay"
	MY_OVERLAY_TEMPLATES="${ALLSKY_OVERLAY}/config/myTemplates"
	ALLSKY_MODULES="${ALLSKY_CONFIG}/modules"
	ALLSKY_MODULE_LOCATION="/opt/allsky"
	ALLSKY_EXTRA="${ALLSKY_OVERLAY}/extra"

	# Directories and files for the flow timer function
	ALLSKY_FLOWTIMINGS="${ALLSKY_TMP}/flowtimings"
	ALLSKY_FLOWTIMINGS_DAY="${ALLSKY_FLOWTIMINGS}/day-average"
	ALLSKY_FLOWTIMINGS_NIGHT="${ALLSKY_FLOWTIMINGS}/night-average"

	# Allsky version.
	ALLSKY_VERSION_FILE="${ALLSKY_HOME}/version"
	ALLSKY_VERSION="$( < "${ALLSKY_VERSION_FILE}" )"

	# Location of optional allsky-website package.
	ALLSKY_WEBSITE="${ALLSKY_WEBUI}/allsky"
	ALLSKY_WEBSITE_VIEWSETTINGS_DIRECTORY_NAME="viewSettings"
	ALLSKY_WEBSITE_VIEWSETTINGS_DIRECTORY="${ALLSKY_WEBSITE}/${ALLSKY_WEBSITE_VIEWSETTINGS_DIRECTORY_NAME}"
	ALLSKY_WEBSITE_CONFIGURATION_NAME="configuration.json"
	ALLSKY_WEBSITE_CONFIGURATION_FILE="${ALLSKY_WEBSITE}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}"
	ALLSKY_REMOTE_WEBSITE_CONFIGURATION_NAME="remote_${ALLSKY_WEBSITE_CONFIGURATION_NAME}"
	ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE="${ALLSKY_CONFIG}/${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_NAME}"

	# Holds all the Allsky documentation.
	ALLSKY_DOCUMENTATION="${ALLSKY_WEBUI}/documentation"

	# When the Pi was last rebooted.  If the file exists a reboot is needed.
	# Put in ALLSKY_TMP so it'll be removed upon reboot.
	ALLSKY_REBOOT_NEEDED="${ALLSKY_TMP}/reboot_needed.txt"

	# Log files for main Allsky and modules
	ALLSKY_LOG="/var/log/allsky.log"
	ALLSKY_PERIODIC_LOG="/var/log/allskyperiodic.log"

	# Status of Allsky
	ALLSKY_STATUS="${ALLSKY_CONFIG}/status.json"
	ALLSKY_STATUS_INSTALLING="Installing..."
	ALLSKY_STATUS_NEVER_RUN="Never Run"
	ALLSKY_STATUS_NOT_RUNNING="Not Running"
	ALLSKY_STATUS_STARTING="Starting..."
	ALLSKY_STATUS_RUNNING="Running"
	ALLSKY_STATUS_STOPPED="Stopped (normal)"
	ALLSKY_STATUS_ERROR="Stopped (error detected)"
	ALLSKY_STATUS_SEE_WEBUI="See the WebUI"

	# GitHub information - package names, repository, and contents of a file.
	GITHUB_ROOT="https://github.com/AllskyTeam"
	GITHUB_RAW_ROOT="https://raw.githubusercontent.com/AllskyTeam"
	GITHUB_MAIN_BRANCH="master"
	GITHUB_ALLSKY_PACKAGE="allsky"

	# NAMEs of some configuration files:
	#	Camera Capabilities - specific to a camera type and model (cc.json)
	#	Allsky WebUI options - created at installation and when camera type changes (options.json)
	#	Allsky WebUI settings - specific to a camera type and model (settings.json)
	CC_FILE="${ALLSKY_CONFIG}/cc.json"
	OPTIONS_FILE="${ALLSKY_CONFIG}/options.json"
	SETTINGS_FILE="${ALLSKY_CONFIG}/settings.json"
	if [[ -s ${SETTINGS_FILE} ]]; then
		# Get the name of the file the websites will look for, and split into name and extension.
		FULL_FILENAME="$( jq -r ".filename" "${SETTINGS_FILE}" )"
		FILENAME="${FULL_FILENAME%.*}"
		EXTENSION="${FULL_FILENAME##*.}"

		CAMERA_TYPE="$( jq -r '.cameratype' "${SETTINGS_FILE}" )"
		CAMERA_MODEL="$( jq -r '.cameramodel' "${SETTINGS_FILE}" )"

		# So scripts can conditionally output messages.
		ALLSKY_DEBUG_LEVEL="$( jq -r '.debuglevel' "${SETTINGS_FILE}" )"
	else
		# Allsky probably not installed yet so provide defaults.
		FILENAME="image"
		EXTENSION="jpg"
		FULL_FILENAME="${FILENAME}.${EXTENSION}"
		ALLSKY_DEBUG_LEVEL=1
	fi
	ALLSKY_ENV="${ALLSKY_HOME}/env.json"	# holds private info like passwords

	IMG_DIR="current/tmp"
	CAPTURE_SAVE_DIR="${ALLSKY_TMP}"

	# Python virtual environment
	ALLSKY_PYTHON_VENV="${ALLSKY_HOME}/venv"

	# These EXIT codes from the capture programs must match what's in src/include/allsky_common.h
	# Anything at or above EXIT_ERROR_STOP is unrecoverable and the service must be stopped
	EXIT_OK=0
	EXIT_RESTARTING=98		# process is restarting, i.e., stop, then start
	EXIT_RESET_USB=99		# need to reset USB bus; cannot continue
	EXIT_ERROR_STOP=100		# unrecoverable error - need user action so stop service
	EXIT_NO_CAMERA=101		# cannot find camera

	# Name of the Pi's OS in lowercase.
	PI_OS="$( grep VERSION_CODENAME /etc/os-release )"; PI_OS="${PI_OS/VERSION_CODENAME=/}"
	PI_OS="${PI_OS,,}"

	# If a user wants to define new variables or assign variables differently,
	# then load their file if it exists.
	# shellcheck disable=SC1090,SC1091
	[[ -f ${ALLSKY_CONFIG}/uservariables.sh ]] && source "${ALLSKY_CONFIG}/uservariables.sh"
fi

return 0
