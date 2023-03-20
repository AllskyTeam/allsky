#!/bin/bash

# Shell variables and functions used by the installation and upgrade scripts.
# This file is "source"d into others, and must be done AFTER source'ing variables.sh.

######################################### functions

#####
# Display a header surrounded by stars.
display_header() {
	local HEADER="${1}"
	local LEN
	((LEN = ${#HEADER} + 8))		# 8 for leading and trailing "*** "
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
# For the version and branch, if the last character of the argument passed is a "/",
# then append the file name fro ${ALLSKY_VERSION_FILE} or ${ALLSKY_BRANCH_FILE}.
# We do this to limit the number of places that know the actual name of the files,
# in case we every change their names.
function get_version() {
	local F="${1}"
	if [[ -z ${F} ]]; then
		F="${ALLSKY_VERSION_FILE}"		# default
	else
		[[ ${F:1,-1} == "/" ]] && F="${F}$(basename "${ALLSKY_VERSION_FILE}")"
	fi
	if [[ -f ${F} ]]; then
		local VALUE="$( < "${F}" )"
		echo -n "${VALUE}" | tr -d '\n\r'
	fi
}


#####
# Get the branch from a local file, if it exists.
function get_branch() {
	local F="${1}"
	if [[ -z ${F} ]]; then
		F="${ALLSKY_BRANCH_FILE}"		# default
	else
		[[ ${F:1,-1} == "/" ]] && F="${F}$(basename "${ALLSKY_BRANCH_FILE}")"
	fi

	# Branch file is same format as Version file.
	echo -n "$(get_version "${F}")"
}

#####
# Display a message of various types in appropriate colors.
# Used primarily in installation scripts.
function display_msg()
{
	local LOG_IT
	if [[ $1 == "--log" ]]; then
		LOG_IT=true
		shift
	else
		LOG_IT=false
	fi

	local LOG_TYPE="${1}"
	local MESSAGE="${2}"
	local MESSAGE2="${3}"		# optional 2nd message that's not in color
	local MSG=""
	local LOGMSG=""				# same as ${MSG} but no escape chars
	local STARS
	if [[ ${LOG_TYPE} == "error" ]]; then
		LOGMSG="*** ERROR: "
		MSG="\n${RED}${LOGMSG}"
		STARS=true

	elif [[ ${LOG_TYPE} == "warning" ]]; then
		LOGMSG="*** WARNING: "
		MSG="\n${YELLOW}${LOGMSG}"
		STARS=true

	elif [[ ${LOG_TYPE} == "notice" ]]; then
		LOGMSG="*** NOTICE: "
		MSG="\n${YELLOW}${LOGMSG}"
		STARS=true

	elif [[ ${LOG_TYPE} == "progress" ]]; then
		LOGMSG="* ${MESSAGE}"
		MSG="${GREEN}${LOGMSG}${NC}"
		STARS=false

	elif [[ ${LOG_TYPE} == "info" ]]; then
		LOGMSG="${MESSAGE}"
		MSG="${YELLOW}${LOGMSG}${NC}"
		STARS=false

	elif [[ ${LOG_TYPE} == "debug" ]]; then
		LOGMSG="DEBUG: ${MESSAGE}"
		MSG="${YELLOW}${LOGMSG}${NC}"
		STARS=false

	else
		LOGMSG=""
		MSG="${YELLOW}"
		STARS=false
	fi

	if [[ ${STARS} == "true" ]]; then
		MSG="${MSG}\n"
		MSG="${MSG}**********\n"
		MSG="${MSG}${MESSAGE}\n"
		MSG="${MSG}**********${NC}\n"

		LOGMSG="${LOGMSG}\n"
		LOGMSG="${LOGMSG}**********\n"
		LOGMSG="${LOGMSG}${MESSAGE}\n"
		LOGMSG="${LOGMSG}**********\n"
	fi

	echo -e "${MSG}${MESSAGE2}"

	# Log messages to a file if it was specified.
	# ${DISPLAY_MSG_LOG} <should> be set if ${LOG_IT} is true, but just in case, check.
	if [[ ${LOG_IT} == "true" && -n ${DISPLAY_MSG_LOG} ]]; then
		echo -e "${LOGMSG}${MESSAGE2}" >>  "${DISPLAY_MSG_LOG}"
	fi
}



######################################### variables

# export to keep shellcheck quiet
export ALLSKY_OWNER=$(id --group --name)		# The login installing Allsky
export ALLSKY_GROUP=${ALLSKY_OWNER}
export WEBSERVER_GROUP="www-data"
export ALLSKY_VERSION="$(get_version "${ALLSKY_HOME}" )"
export REPO_WEBCONFIG_FILE="${ALLSKY_REPO}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}.repo"
export OLD_WEBUI_LOCATION="/var/www/html"		# location of old-style WebUI
export OLD_WEBSITE_LOCATION="${OLD_WEBUI_LOCATION}/allsky"
