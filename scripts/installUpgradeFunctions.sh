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
	local VF="$( basename "${ALLSKY_VERSION_FILE}" )"
	local V="$(curl --show-error --silent "${GITHUB_RAW_ROOT}/${PACKAGE}/${BRANCH}/${VF}" | tr -d '\n\r')"
	# "404" means the branch isn't found since all new branches have a version file.
	[[ ${V} != "404: Not Found" ]] && echo -n "${V}"
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
	local LOG_IT="false"
	local LOG_ONLY="false"
	if [[ $1 == "--log" ]]; then
		LOG_IT="true"
		shift
	elif [[ $1 == "--logonly" ]]; then
		LOG_IT="true"
		LOG_ONLY="true"
		shift
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
		LOGMSG="* ${MESSAGE}"
		MSG="${YELLOW}${LOGMSG}${NC}"
		STARS=false

	elif [[ ${LOG_TYPE} == "debug" ]]; then
		# Indent so they align with text above
		LOGMSG="  DEBUG: ${MESSAGE}"
		#shellcheck disable=SC2154
		MSG="${cDEBUG}${LOGMSG}${NC}"
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

	[[ ${LOG_ONLY} == "false" ]] && echo -e "${MSG}${MESSAGE2}"

	# Log messages to a file if it was specified.
	# ${DISPLAY_MSG_LOG} <should> be set if ${LOG_IT} is true, but just in case, check.

	if [[ ${LOG_IT} == "true" && -n ${DISPLAY_MSG_LOG} ]]; then
		# Strip out all color escape sequences before adding to log file.
		# This requires escaping the "\" (which appear at the beginning of every variable)
		# and "[" in the variables.
		
		echo "${LOGMSG}${MESSAGE2}" |
		(
			if [[ -n ${GREEN} ]]; then
				# In case a variable isn't define, set it to a string that won't be found
				YELLOW="${YELLOW:-abcxyz}"
				RED="${RED:-abcxyz}"
				cDEBUG="${cDEBUG:-abcxyz}"
				NC="${NC:-abcxyz}"

				# I couldn't figure out how to replace "\n" with a new line in sed.
				O="$( sed \
					-e "s/\\${GREEN/\[/\\[}//g" \
					-e "s/\\${YELLOW/\[/\\[}//g" \
					-e "s/\\${RED/\[/\\[}//g" \
					-e "s/\\${cDEBUG/\[/\\[}//g" \
					-e "s/\\${NC/\[/\\[}//g" )"
				echo -e "${O}"		# handles the newlines
			else
				cat
			fi
		) >>  "${DISPLAY_MSG_LOG}"
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
