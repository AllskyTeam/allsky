#!/bin/bash
# shellcheck disable=SC2034		# variable unused

# This file is source'd into other files to set some variables used by scripts.
# This allows us to easily add and change directory names.
# It should only be called after ${ALLSKY_HOME} is set.

if [[ -z "${ALLSKY_VARIABLE_SET}" || ${1} == "--force" ]]; then
	set -a	# automatically export all variables

	ALLSKY_VARIABLE_SET="true"	# so we only do the following once

	ME2="$( basename "${BASH_SOURCE[0]}" )"

	# Set colors used by many scripts in output.
	# If we're not on a tty output is likely being written to a file, so don't use colors.
	# The "w" colors are for when output may go to a web page (not on tty) or tty.
	if tty --silent ; then
		ON_TTY="true"

		# Dialog colors:  0-7: black, red, green, yellow, blue, magenta, cyan, white
		# Reverse: \Zr	 reverse off: \ZR
		# bold off: \ZB			underline off: \ZU
		DIALOG_BOLD="\Zb";
		DIALOG_UNDERLINE="\Zu";
		DIALOG_GREEN="\Z2";		DIALOG_OK="${DIALOG_GREEN}"
		DIALOG_YELLOW="\Z3"		DIALOG_WARNING="${DIALOG_YELLOW}"
		DIALOG_RED="\Z1";		DIALOG_ERROR="${DIALOG_RED}"
		DIALOG_BLUE="\Z4";		DIALOG_INFO="${DIALOG_BLUE}"
								DIALOG_DEBUG="${DIALOG_YELLOW}"
		DIALOG_NC="\Zn"

# Black       0;30     Dark Gray     1;30
# Blue        0;34     Light Blue    1;34
# Green       0;32     Light Green   1;32
# Cyan        0;36     Light Cyan    1;36
# Red         0;31     Light Red     1;31
# Purple      0;35     Light Purple  1;35
# Brown       0;33     Yellow        1;33
# Light Gray  0;37     White         1;37
# Bold        1
# Dim         2
# Italics     3
# Underline   4
# Blink       5 and 6 ?
# Inverse     7
		cRED="\033[0;31m";
		cGREEN="\033[0;32m";
		cBLUE="\033[0;34m"
		cYELLOW="\033[0;33m";

		cOK="${cGREEN}";		wOK="${cOK}"
		cINFO="${cBLUE}"		wINFO="${cINFO}"
		cWARNING="${cYELLOW}";	wWARNING="${cWARNING}"
		cERROR="${cRED}";		wERROR="${cERROR}"
		cDEBUG="${cYELLOW}";	wDEBUG="${cDEBUG}"
		cBOLD="\033[1m"; 		wBOLD="["
		cNBOLD="\033[22m"; 		wNBOLD="]"		# Disable only bold (N == NO)
		cUNDERLINE="\033[4m"; 	wUNDERLINE="${cUNDERLINE}"
		cNUNDERLINE="\033[24m";	wNUNDERLINE="${cNUNDERLINE}"	# Disable only underline
		cNC="\033[0m";			wNC="${cNC}"
								wBR="\n"

# TODO: change all to non-"c*" names in all other scripts, then get rid of these old names:
		BOLD="${cBOLD}"
		GREEN="${cGREEN}"
		YELLOW="${cYELLOW}"
		RED="${cRED}"
		NC="${cNC}"

	else
		ON_TTY="false"

		# The "dialog" command is always run on a tty, so don't need to set DIALOG_*.

						# Not on a tty usually means we're called from the WebUI, so use HTML.
		cOK="";					wOK="<span style='color: green'>"
		cINFO="";				wINFO="<span style='color: blue'>"
		cWARNING="";			wWARNING="<span style='color: #FF9800'>"	# darker yellow
		cERROR="";				wERROR="<span style='color: red'>"
		cDEBUG="";				wDEBUG="${wWARNING}"
		cBOLD="";				wBOLD="<span style='font-weight: bold'>"
		cNBOLD="";				wNBOLD="</span>"
		cUNDERLINE="";			wUNDERLINE="<span style='text-decoration: underline;'>"
		cNUNDERLINE="";			wUNNDERLINE="</span>"
		cNC="";					wNC="</span>"
								wBR="<br>"
# TODO: change all to non-"c*" names in all other scripts, then get rid of these old names:
		BOLD=""
		GREEN=""
		YELLOW=""
		RED=""
		NC=""
	fi

	if [[ -z "${ALLSKY_HOME}" ]] ; then	# This must come after setting colors above
		echo -en "${cRED}"
		echo -n "${ME2}: ERROR: ALLSKY_HOME not set!"
		echo -e "${cNC}"
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
	ALLSKY_UTILITIES="${ALLSKY_SCRIPTS}/utilities"

	# Holds all the binaries.
	ALLSKY_BIN="${ALLSKY_HOME}/bin"

	# Holds all the images on a per-day basis.
	ALLSKY_IMAGES="${ALLSKY_HOME}/images"

	# Areas for users' Allsky-related files that get propogated to new releases.
	ALLSKY_MYFILES_NAME="myFiles"
	ALLSKY_MYFILES_DIR="${ALLSKY_CONFIG}/${ALLSKY_MYFILES_NAME}"

	# Holds all the notification images.
	ALLSKY_NOTIFICATION_IMAGES="${ALLSKY_HOME}/notificationImages"
	USER_NOTIFICATION_IMAGES="${ALLSKY_MYFILES_DIR}/notificationImages"
	# Holds log of notifications displayed during this session.
	ALLSKY_NOTIFICATION_LOG="${ALLSKY_TMP}/notification_log.txt"

	# Holds temporary messages to display in the WebUI.
	ALLSKY_MESSAGES="${ALLSKY_CONFIG}/messages.txt"

	# Holds a count of continuous "bad" images
	ALLSKY_BAD_IMAGE_COUNT="${ALLSKY_TMP}/bad_images.txt"

	# Holds the number of images left until uploading.
	FREQUENCY_FILE="${ALLSKY_TMP}/IMG_UPLOAD_FREQUENCY.txt"

	# Holds the PID of the process that called timelapse.sh.
	ALLSKY_TIMELAPSE_PID_FILE="${ALLSKY_TMP}/timelapse-pid.txt"

	# Camera information:
	# List of ALL connected cameras.
	CONNECTED_CAMERAS_INFO="${ALLSKY_CONFIG}/connected_cameras.txt"
	# Supported RPi cameras
	RPi_SUPPORTED_CAMERAS="${ALLSKY_CONFIG}/RPi_cameraInfo.txt"

	# Log-related information.
	ALLSKY_LOGS="${ALLSKY_CONFIG}/logs"
	ALLSKY_POST_INSTALL_ACTIONS="${ALLSKY_LOGS}/post-installation_actions.txt"
	ALLSKY_OLD_REMINDER="${ALLSKY_LOGS}/allsky-OLD_reminder.txt"
	ALLSKY_CHECK_LOG="${ALLSKY_LOGS}/checkAllsky.html"

	# Holds temporary list of aborted processes since another one was in progress.
	ALLSKY_ABORTS_DIR="${ALLSKY_TMP}/aborts"
	ALLSKY_ABORTEDUPLOADS="uploads.txt"
	ALLSKY_ABORTEDTIMELAPSE="timelapse.txt"
	ALLSKY_ABORTEDSAVEIMAGE="saveImage.txt"

	# Holds all the dark frames.
	ALLSKY_DARKS="${ALLSKY_HOME}/darks"

	# Location of WebUI.
	ALLSKY_WEBUI="${ALLSKY_HOME}/html"
	ALLSKY_SUPPORT_DIR="${ALLSKY_WEBUI}/support"

	# Base location of the overlay and module configuration and data files.
	ALLSKY_OVERLAY="${ALLSKY_CONFIG}/overlay"
	MY_OVERLAY_TEMPLATES="${ALLSKY_OVERLAY}/myTemplates"
	ALLSKY_MODULES="${ALLSKY_CONFIG}/modules"
	ALLSKY_MODULE_LOCATION="/opt/allsky"
	ALLSKY_EXTRA="${ALLSKY_OVERLAY}/extra"

	# Directories and files for the flow timer function
	ALLSKY_FLOWTIMINGS="${ALLSKY_TMP}/flowtimings"
	ALLSKY_FLOWTIMINGS_DAY="${ALLSKY_FLOWTIMINGS}/day-average"
	ALLSKY_FLOWTIMINGS_NIGHT="${ALLSKY_FLOWTIMINGS}/night-average"

	# Allsky version.
	ALLSKY_VERSION_FILE="${ALLSKY_HOME}/version"
	ALLSKY_VERSION="$( head -1 "${ALLSKY_VERSION_FILE}" )"

	# Location of Allsky Website files.
	ALLSKY_WEBSITE="${ALLSKY_WEBUI}/allsky"
	ALLSKY_WEBSITE_MYFILES_DIR="${ALLSKY_WEBSITE}/${ALLSKY_MYFILES_NAME}"
	ALLSKY_WEBSITE_CHECKSUM_FILE="${ALLSKY_WEBSITE}/checksums.txt"
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
	ALLSKY_STATUS_SEE_WEBUI="Not Running - see the WebUI"
	ALLSKY_STATUS_STARTING="Starting"
	ALLSKY_STATUS_RESTARTING="Restarting"
	ALLSKY_STATUS_RUNNING="Running"
	ALLSKY_STATUS_STOPPED="Stopped"
	ALLSKY_STATUS_ERROR="Stopped - error detected"
	ALLSKY_STATUS_NO_CAMERA="Stopped - camera not found"
	ALLSKY_STATUS_CAMERA_CHANGED="Stopped - camera changed"
	ALLSKY_STATUS_REBOOT_NEEDED="Stopped - reboot needed"
	ALLSKY_STATUS_ACTIONS_NEEDED="Stopped - actions needed"
	ALLSKY_STATUS_NEEDS_CONFIGURATION="Allsky settings need configuring"
	ALLSKY_STATUS_NEEDS_REVIEW="Allsky settings need to be reviewed"

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
		CAMERA_NUMBER="$( jq -r '.cameranumber' "${SETTINGS_FILE}" )"
		CAMERA_NUMBER="${CAMERA_NUMBER:-0}"

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
	EXIT_PARTIAL_OK=90		# command partially worked
	EXIT_RESTARTING=98		# process is restarting, i.e., stop, then start
	EXIT_RESET_USB=99		# need to reset USB bus; cannot continue
	EXIT_ERROR_STOP=100		# unrecoverable error - need user action so stop service
	EXIT_NO_CAMERA=101		# cannot find camera

	# Name of the Pi's OS in lowercase.
	PI_OS="$( grep VERSION_CODENAME /etc/os-release )"; PI_OS="${PI_OS/VERSION_CODENAME=/}"
	PI_OS="${PI_OS,,}"

	# If a user wants to define new variables or assign variables differently,
	# then load their file if it exists.
	ALLSKY_USER_VARIABLES="${ALLSKY_CONFIG}/uservariables.sh"
	# shellcheck disable=SC1090,SC1091
	[[ -f ${ALLSKY_USER_VARIABLES} ]] && source "${ALLSKY_USER_VARIABLES}"
fi

return 0
