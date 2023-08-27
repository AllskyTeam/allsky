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

	if [[ ${LOG_IT} == "true" && -n ${DISPLAY_MSG_LOG} ]]; then
		# Strip out all color escape sequences before adding to log file.
		# This requires escaping the "\" (which appear at the beginning of every variable)
		# and "[" in the variables.
		
		echo "${LOGMSG}${MESSAGE2}" |
		(
			if [[ -n ${GREEN} ]]; then
				# In case a variable isn't define, set it to a string that won't be found
				local Y="${YELLOW:-abcxyz}"
				local R="${RED:-abcxyz}"
				local D="${cDEBUG:-abcxyz}"
				local N="${NC:-abcxyz}"

				# I couldn't figure out how to replace "\n" with a new line in sed.
				O="$( sed \
					-e "s/\\${GREEN/\[/\\[}//g" \
					-e "s/\\${Y/\[/\\[}//g" \
					-e "s/\\${R/\[/\\[}//g" \
					-e "s/\\${D/\[/\\[}//g" \
					-e "s/\\${N/\[/\\[}//g" )"
				echo -e "${O}"		# handles the newlines
			else
				cat
			fi
		) >>  "${DISPLAY_MSG_LOG}"
	fi
}


# The various upload protocols need different variables defined.
# For the specified protocol, make sure the specified variable is defined.
function check_PROTOCOL()
{
	local P="${1}"	# Protocol
	local V="${2}"	# Variable
	local N="${3}"	# Name
	local VALUE="$( get_variable "${V}" "${ALLSKY_ENV}" )"
	if [[ -z ${VALUE} ]]; then
		echo "${N} Protocol (${P}) set but not '${V}'."
		echo "Uploads will not work until this is fixed."
		return 1
	fi
	return 0
}
# Check variables are correct for a remote server.
# Return 0 for OK, 1 for warning, 2 for error.
function check_remote_server()
{
	local TYPE="${1}"
	local TYPE_STRING
	if [[ ${TYPE} == "REMOTEWEBSITE" ]]; then
		TYPE_STRING="Remote Website"
	else
		TYPE_STRING="Remote Server"
	fi

	local USE="$( settings ".use${TYPE,,}" )"
	if [[ ${USE} -eq 0 ]]; then
		if check_for_env_file ; then
			# Variables should be empty.
			x="$( grep -E -v "^#|^$" "${ALLSKY_ENV}" | grep "${TYPE}" | grep -E -v "${TYPE}.*=\"\"|${TYPE}.*=$" )"
			if [[ -n "${x}" ]]; then
				echo "${TYPE_STRING} is not being used but settings for it exist in '${ALLSKY_ENV}:"
				indent "${x}" | sed "s/${TYPE}.*=.*/${TYPE}/"
				return 1
			fi
		fi
		return 0
	fi

	local RET=0
	local PROTOCOL="$( settings ".${TYPE,,}protocol" )"
	case "${PROTOCOL}" in
		"")
			echo "${TYPE_STRING} is being used but has no Protocol."
			echo "Uploads to it will not work."
			return 2
			;;

		ftp | ftps | sftp)
			check_for_env_file || return 1
			check_PROTOCOL "${PROTOCOL}" "${TYPE}_HOST" "${TYPE_STRING}" || RET=1
			check_PROTOCOL "${PROTOCOL}" "${TYPE}_USER" "${TYPE_STRING}" || RET=1
			check_PROTOCOL "${PROTOCOL}" "${TYPE}_PASSWORD" "${TYPE_STRING}" || RET=1
			if [[ ${PROTOCOL} == "ftp" ]]; then
				echo "${TYPE_STRING} Protocol set to insecure 'ftp'."
				echo "Try using 'ftps' or 'sftp' instead."
				RET=1
			fi
			;;

		scp)
			check_for_env_file || return 1
			check_PROTOCOL "${PROTOCOL}" "${TYPE}_HOST" "${TYPE_STRING}" || RET=1
			check_PROTOCOL "${PROTOCOL}" "${TYPE}_USER" "${TYPE_STRING}" || RET=1
			if check_PROTOCOL "${PROTOCOL}" "${TYPE}_SSH_KEY_FILE" "${TYPE_STRING}" \
					&& [[ ! -e ${SSH_KEY_FILE} ]]; then
				echo "${TYPE_STRING} Protocol (${PROTOCOL}) set but '${TYPE}_SSH_KEY_FILE' (${SSH_KEY_FILE}) does not exist."
				echo "Uploads will not work."
				RET=1
			fi
			;;

		s3)
			check_for_env_file || return 1
			if check_PROTOCOL "${PROTOCOL}" "${TYPE}_AWS_CLI_DIR" "${TYPE_STRING}" \
					&& [[ ! -e ${AWS_CLI_DIR} ]]; then
				echo "${TYPE_STRING} Protocol (${PROTOCOL}) set but '${TYPE}_AWS_CLI_DIR' (${AWS_CLI_DIR}) does not exist."
				echo "Uploads will not work."
				RET=1
			fi
			check_PROTOCOL "${PROTOCOL}" "${TYPE}_S3_BUCKET" "${TYPE_STRING}" || RET=1
			check_PROTOCOL "${PROTOCOL}" "${TYPE}_S3_ACL" "${TYPE_STRING}" || RET=1
			;;

		gcs)
			check_for_env_file || return 1
			check_PROTOCOL "${PROTOCOL}" "${TYPE}_GCS_BUCKET" "${TYPE_STRING}" || RET=1
			check_PROTOCOL "${PROTOCOL}" "${TYPE}_GCS_ACL" "${TYPE_STRING}" || RET=1
			;;

		*)
			echo "${TYPE_STRING} Protocol (${PROTOCOL}) not blank or one of: ftp, ftps, sftp, scp, s3, gcs."
			echo "Uploads will not work until this is corrected."
			RET=1
			;;
	esac

	REMOTE_PORT="$( get_variable "${TYPE}_PORT" "${ALLSKY_ENV}" )"
	if [[ -n ${REMOTE_PORT} ]] && ! is_number "${REMOTE_PORT}" ; then
		echo "${TYPE}_PORT (${REMOTE_PORT}) must be a number."
		echo "Uploads will not work until this is corrected."
		RET=1
	fi

	return "${RET}"
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
