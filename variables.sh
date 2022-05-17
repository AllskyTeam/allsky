#!/bin/bash

# This file is source'd into other files to set some variables used by scripts.
# This allows us to easily add and change directory names.
# It should only be called after $ALLSKY_HOME is set.

if [ "${ALLSKY_VARIABLE_SET}" = "" ]; then
	set -a	# automatically export all variables

	ALLSKY_VARIABLE_SET="true"	# so we only do the following once

	ME2="$(basename "${BASH_SOURCE[0]}")"

	# Set colors used by many scripts in output.
	# If we're not on a tty output is likely being written to a file, so don't use colors.
	if tty --silent ; then
		ON_TTY=1
		RED="\033[0;31m"
		GREEN="\033[0;32m"
		YELLOW="\033[0;33m"
		NC="\033[0m" # No Color
	else
		ON_TTY=0
		RED=""
		GREEN=""
		YELLOW=""
		NC=""
	fi

	if [ "${ALLSKY_HOME}" = "" ] ; then	# This must come after setting colors above
		echo -en "${RED}"
		echo -n "${ME2}: ERROR: ALLSKY_HOME not set!  Exiting..."
		echo -e "${NC}"
		exit 1
	fi

	# Allow variables to be overridden for testing or to use different locations.

	# For temporary files or files that can be deleted at reboot.
	ALLSKY_TMP="${ALLSKY_TMP:-${ALLSKY_HOME}/tmp}"

	# Central location for all AllSky configuration files.
	ALLSKY_CONFIG="${ALLSKY_CONFIG:-${ALLSKY_HOME}/config}"

	# Holds all the scripts.
	ALLSKY_SCRIPTS="${ALLSKY_SCRIPTS:-${ALLSKY_HOME}/scripts}"

	# Holds all the images on a per-day basis.
	ALLSKY_IMAGES="${ALLSKY_IMAGES:-${ALLSKY_HOME}/images}"

	# Holds all the notification images.
	ALLSKY_NOTIFICATION_IMAGES="${ALLSKY_NOTIFICATION_IMAGES:-${ALLSKY_HOME}/notification_images}"
	# Holds log of notifications displayed during this session.
	ALLSKY_NOTIFICATION_LOG="${ALLSKY_TMP}/notification_log.txt"

	# Holds all the dark frames.
	ALLSKY_DARKS="${ALLSKY_DARKS:-${ALLSKY_HOME}/darks}"

	# Location of optional allsky-portal package.
	ALLSKY_WEBUI=${ALLSKY_WEBUI:-/var/www/html}
	PORTAL_DIR=${ALLSKY_WEBUI}		# old name - will eventually remove this

	# Location of optional allsky-website package.
	ALLSKY_WEBSITE=${ALLSKY_WEBSITE:-${ALLSKY_WEBUI}/allsky}
	WEBSITE_DIR=${ALLSKY_WEBSITE}		# old name - will eventually remove this
fi
