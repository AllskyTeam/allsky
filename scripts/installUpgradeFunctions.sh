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


# For the version, if the last character of the argument passed is a "/",
# then append the file name from ${ALLSKY_VERSION_FILE}.
# We do this to limit the number of places that know the actual name of the file,
# in case we ever change it.

#####
# Get the version from a local file, if it exists.
function get_version() {
	local F="${1}"
	if [[ -z ${F} ]]; then
		F="${ALLSKY_VERSION_FILE}"		# default
	else
		[[ ${F:1,-1} == "/" ]] && F="${F}$(basename "${ALLSKY_VERSION_FILE}")"
	fi
	if [[ -f ${F} ]]; then
		# Sometimes the branch file will have both "master" and "dev" on two lines.
		local VALUE="$( head -1 "${F}" )"
		echo -n "${VALUE}" | tr -d '\n\r'
	fi
}


#####
# Get the branch using git.
function get_branch() {
	local H="${1:-${ALLSKY_HOME}}"
	echo "$( cd "${H}" || exit; git rev-parse --abbrev-ref HEAD )"
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
	local NL=""
	if [[ ${MESSAGE:0:2} == "\n" ]]; then
		# If the message starts with "\n" then add newline BEFORE the "*".
		NL="\n"
		MESSAGE="${MESSAGE:2}"
	fi
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
		LOGMSG="${NL}* ${MESSAGE}"
		MSG="${GREEN}${LOGMSG}${NC}"
		STARS=false

	elif [[ ${LOG_TYPE} == "info" ]]; then
		LOGMSG="${NL}* ${MESSAGE}"
		MSG="${YELLOW}${LOGMSG}${NC}"
		STARS=false

	elif [[ ${LOG_TYPE} == "debug" ]]; then
		# Indent so they align with text above
		LOGMSG="${NL}  DEBUG: ${MESSAGE}"
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

	[[ ${LOG_IT} == "false" || -z ${DISPLAY_MSG_LOG} ]] && return

	# Strip out all color escape sequences before adding to log file.
	# The message may have an actual escape character or may have the
	# four characters "\033" which represent an escape character.

	# I don't know how to replace "\n" with an
	# actual newline in sed, and there HAS to be a better way to strip the
	# escape sequences.
	# I simply replace actual escape characters in the input with "033" then 
	# replace "033[" with "033X".
	# Feel free to improve...

	# Assume if GREEN isn't defined then no colors are defined.
	if [[ -n ${GREEN} ]]; then
		local ESC="$( echo -en '\033' )"

		# Ignore any initial "\" in the colors.
		# In case a variable isn't defined, set it to a string that won't be found.
		local G="${GREEN/\\/}"							; G="${G/033\[/033X}"
		local Y="${YELLOW/\\/}"		; Y="${Y:-abcxyz}"	; Y="${Y/033\[/033X}"
		local R="${RED/\\/}"		; R="${R:-abcxyz}"	; R="${R/033\[/033X}"
		local D="${cDEBUG/\\/}"		; D="${D:-abcxyz}"	; D="${D/033\[/033X}"
		local N="${NC/\\/}"			; N="${N:-abcxyz}"	; N="${N/033\[/033X}"

		# Outer "echo -e" handles "\n" (2 characters) in input.
		# No "-e" needed on inner "echo".
		echo -e "$( echo "${LOGMSG}${MESSAGE2}" |
			sed -e "s/${ESC}/033/g" -e "s/033\[/033X/g" \
				-e "s/${G}//g" \
				-e "s/${Y}//g" \
				-e "s/${R}//g" \
				-e "s/${D}//g" \
				-e "s/${N}//g" \
		)"
	else
		echo "${LOGMSG}${MESSAGE2}"
	fi >>  "${DISPLAY_MSG_LOG}"
}



######################################### variables

# export to keep shellcheck quiet
export ALLSKY_OWNER=$(id --group --name)		# The login installing Allsky
export ALLSKY_GROUP=${ALLSKY_OWNER}
export WEBSERVER_GROUP="www-data"
export REPO_WEBCONFIG_FILE="${ALLSKY_REPO}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}.repo"
export OLD_WEBUI_LOCATION="/var/www/html"		# location of old-style WebUI
export OLD_WEBSITE_LOCATION="${OLD_WEBUI_LOCATION}/allsky"
