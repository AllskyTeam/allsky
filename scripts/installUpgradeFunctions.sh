#!/bin/bash

# Shell variables and functions used by the installation and upgrade scripts.
# This file is "source"d into others, and must be done AFTER source'ing variables.sh.


######################################### variables

# export to keep shellcheck quiet
	# The login installing Allsky
export ALLSKY_OWNER=$( id --group --name )
export ALLSKY_GROUP=${ALLSKY_OWNER}
export WEBSERVER_OWNER="www-data"
export WEBSERVER_GROUP="${WEBSERVER_OWNER}"

	# Central location for all master repository files.
export ALLSKY_REPO="${ALLSKY_HOME}/config_repo"
export REPO_WEBCONFIG_FILE="${ALLSKY_REPO}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}.repo"
export REPO_SUDOERS_FILE="${ALLSKY_REPO}/sudoers.repo"
export ALLSKY_DEFINES_INC="allskyDefines.inc"
export REPO_WEBUI_DEFINES_FILE="${ALLSKY_REPO}/${ALLSKY_DEFINES_INC}.repo"
export REPO_LIGHTTPD_FILE="${ALLSKY_REPO}/lighttpd.conf.repo"
export REPO_AVI_FILE="${ALLSKY_REPO}/avahi-daemon.conf.repo"
export REPO_OPTIONS_FILE="${ALLSKY_REPO}/$( basename "${OPTIONS_FILE}" ).repo"

##### Information on prior Allsky versions
	# Location of old-style WebUI and Website.
export OLD_WEBUI_LOCATION="/var/www/html"
export OLD_WEBSITE_LOCATION="${OLD_WEBUI_LOCATION}/allsky"
	# Directory of prior version of Allsky, if it exists.
export PRIOR_ALLSKY_DIR="$( dirname "${ALLSKY_HOME}" )/${ALLSKY_INSTALL_DIR}-OLD"
	# Prior "config" directory, if it exists.
export PRIOR_CONFIG_DIR="${PRIOR_ALLSKY_DIR}/$( basename "${ALLSKY_CONFIG}" )"
export PRIOR_REMOTE_WEBSITE_CONFIGURATION_FILE="${PRIOR_CONFIG_DIR}/${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_NAME}"
export PRIOR_PYTHON_VENV="${PRIOR_ALLSKY_DIR}/venv/lib"

	# Name of setting that determines version of Website config file.
export WEBSITE_CONFIG_VERSION="ConfigVersion"
	# Name of setting that holds the Allsky version.
export WEBSITE_ALLSKY_VERSION="config.AllskyVersion"


	# Location of prior "config.sh" file; varies by release; this is most recent.
export PRIOR_CONFIG_FILE="${PRIOR_CONFIG_DIR}/config.sh"
	# Location of prior "ftp-settings.sh" file; varies by release; this is most recent.
export PRIOR_FTP_FILE="${PRIOR_CONFIG_DIR}/ftp-settings.sh"



######################################### functions

#####
# Display a header surrounded by stars.
function display_header() {
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
function calc_wt_size()
{
	WT_WIDTH=$( tput cols )
	[[ ${WT_WIDTH} -gt 80 ]] && WT_WIDTH=80
}

#####
# Get a Git version, stripping any trailing newline.
# Return "" if none, or on error.
function get_Git_version() {
	local BRANCH="${1}"
	local PACKAGE="${2}"
	local VF="$( basename "${ALLSKY_VERSION_FILE}" )"
	local V="$( curl --show-error --silent "${GITHUB_RAW_ROOT}/${PACKAGE}/${BRANCH}/${VF}" | tr -d '\n\r' )"
	# "404" means the branch isn't found since all new branches have a version file.
	[[ ${V} != "404: Not Found" ]] && echo -n "${V}"
}


# For the version, if the last character of the argument passed is a "/",
# then append the file name from ${ALLSKY_VERSION_FILE}.
# We do this to limit the number of places that know the actual name of the file,
# in case we ever change it.

#####
# Get the version from a local file, if it exists.  If not, get from default file.
function get_version() {
	local F="${1}"
	if [[ -z ${F} ]]; then
		F="${ALLSKY_VERSION_FILE}"		# default
	else
		[[ ${F:1,-1} == "/" ]] && F="${F}$( basename "${ALLSKY_VERSION_FILE}" )"
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

function update_json_file()		# field, new value, file, [type]
{
	local M="${ME:-${FUNCNAME[0]}}"
	local FIELD="${1}"
	if [[ ${FIELD:0:1} != "." ]]; then
		echo "${M}: Field names must begin with period '.' (Field='${FIELD}')" >&2
		return 1
	fi

	local NEW_VALUE="${2}"
	local FILE="${3:-${SETTINGS_FILE}}"
	local TYPE="${4:-string}"		# optional
	local DOUBLE_QUOTE
	if [[ ${TYPE} == "string" ]]; then
		DOUBLE_QUOTE='"'
	else
		DOUBLE_QUOTE=""
	fi

	local TEMP="/tmp/$$"
	# Have to use "cp" instead of "mv" to keep any hard link.
	if jq "${FIELD} = ${DOUBLE_QUOTE}${NEW_VALUE}${DOUBLE_QUOTE}" "${FILE}" > "${TEMP}" ; then
		cp "${TEMP}" "${FILE}"
		rm "${TEMP}"
		return 0
	fi

	echo "${M}: Unable to update json value of '${FIELD}' to '${NEW_VALUE}' in '${FILE}'." >&2

	return 2
}

####
# Update a Website configuration file from old to current version.
update_website_config_file()
{
	local FILE="${1}"
	local PRIOR_VERSION="${2}"
	local CURRENT_VERSION="${3}"
	local LOCAL_OR_REMOTE="${4}"
	local MSG

	MSG="Updating ${FILE} for version ${CURRENT_VERSION}."
	display_msg --log progress "${MSG}"

	# Current version: 2
	if [[ ${PRIOR_VERSION} -eq 1 ]]; then
		# Version 2 removed AllskyWebsiteVersion.
#XX TODO: is this how to delete the field?
		update_json_file ".AllskyWebsiteVersion" "null" "${FILE}"
	fi

	# Set to current version.
	update_json_file ".${WEBSITE_CONFIG_VERSION}" "${CURRENT_VERSION}" "${FILE}"

	if [[ ${LOCAL_OR_REMOTE} == "local" ]]; then
		# Since we're installing a new Allsky, update the Allsky version.
		# For remote Websites it'll be updated when the user updates the Website.
		update_json_file ".${WEBSITE_ALLSKY_VERSION}" "${ALLSKY_VERSION}" "${FILE}"
	fi
}
