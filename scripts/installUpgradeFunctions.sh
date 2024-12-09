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
export NEED_TO_UPDATE="XX_NEED_TO_UPDATE_XX"

	# Central location for all master repository files.
export ALLSKY_REPO="${ALLSKY_HOME}/config_repo"
export REPO_WEBCONFIG_FILE="${ALLSKY_REPO}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}.repo"
export REPO_SUDOERS_FILE="${ALLSKY_REPO}/sudoers.repo"
export ALLSKY_DEFINES_INC="allskyDefines.inc"
export REPO_WEBUI_DEFINES_FILE="${ALLSKY_REPO}/${ALLSKY_DEFINES_INC}.repo"
export REPO_LIGHTTPD_FILE="${ALLSKY_REPO}/lighttpd.conf.repo"
export REPO_AVI_FILE="${ALLSKY_REPO}/avahi-daemon.conf.repo"
export REPO_OPTIONS_FILE="${ALLSKY_REPO}/$( basename "${OPTIONS_FILE}" ).repo"
export REPO_ENV_FILE="${ALLSKY_REPO}/$( basename "${ALLSKY_ENV}" ).repo"
export REPO_WEBSITE_CONFIGURATION_FILE="${ALLSKY_REPO}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}.repo"

##### Information on prior Allsky versions and files.
	# Location of old-style WebUI and Website.
export OLD_WEBUI_LOCATION="/var/www/html"
export OLD_WEBSITE_LOCATION="${OLD_WEBUI_LOCATION}/allsky"
	# Directory of prior version of Allsky, if it exists.
export PRIOR_ALLSKY_DIR="$( dirname "${ALLSKY_HOME}" )/${ALLSKY_INSTALL_DIR}-OLD"
	# Prior "config" directory, if it exists.
export PRIOR_CONFIG_DIR="${PRIOR_ALLSKY_DIR}/$( basename "${ALLSKY_CONFIG}" )"
export PRIOR_REMOTE_WEBSITE_CONFIGURATION_FILE="${PRIOR_CONFIG_DIR}/${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_NAME}"
export PRIOR_PYTHON_VENV="${PRIOR_ALLSKY_DIR}/venv/lib"
export PRIOR_MYFILES_DIR="${ALLSKY_MYFILES_DIR/${ALLSKY_HOME}/${PRIOR_ALLSKY_DIR}}"

	# Name of setting that determines version of Website config file.
export WEBSITE_CONFIG_VERSION="ConfigVersion"
	# Name of setting that holds the Allsky version.
export WEBSITE_ALLSKY_VERSION="config.AllskyVersion"

	# Location of prior files varies by release; this is most recent location.
export PRIOR_CONFIG_FILE="${PRIOR_CONFIG_DIR}/config.sh"
export PRIOR_FTP_FILE="${PRIOR_CONFIG_DIR}/ftp-settings.sh"

	# Location of lighttpd files.
export LIGHTTPD_LOG_DIR="/var/log/lighttpd"
export LIGHTTPD_LOG_FILE="${LIGHTTPD_LOG_DIR}/error.log"
export LIGHTTPD_CONFIG_FILE="/etc/lighttpd/lighttpd.conf"

######################################### functions

#####
# Display a header surrounded by stars.
function display_header()
{
	local HEADER="${1}"
	local LEN
	((LEN = ${#HEADER} + 8))		# 8 for leading and trailing "*** "
	local STARS=""
	while [[ ${LEN} -gt 0 ]]; do
		STARS+="*"
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
	local WT_WIDTH=$( tput cols )
	[[ ${WT_WIDTH} -gt 80 ]] && WT_WIDTH=80
	echo "${WT_WIDTH}"
}

#####
# Get a Git version, stripping any trailing newline.
# Return "" if none, or on error.
function get_Git_version()
{
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
function get_version()
{
	local F="${1}"
	if [[ -z ${F} ]]; then
		F="${ALLSKY_VERSION_FILE}"		# default
	else
		[[ ${F:1,-1} == "/" ]] && F+="$( basename "${ALLSKY_VERSION_FILE}" )"
	fi
	if [[ -f ${F} ]]; then
		# Sometimes the branch file will have both "master" and "dev" on two lines.
		local VALUE="$( head -1 "${F}" )"
		echo -n "${VALUE}" | tr -d '\n\r'
	fi
}


#####
# Get the branch using git.
function get_branch()
{
	local H="${1:-${ALLSKY_HOME}}"
	echo "$( cd "${H}" || exit; git rev-parse --abbrev-ref HEAD )"
}


#####
# Get a shell variable's value.  The variable can have optional spaces and tabs before it.
# This function is useful when we can't "source" the file.
function get_variable()
{
	local VARIABLE="${1}"
	local FILE="${2}"
	local LINE=""
	local SEARCH_STRING="^[ 	]*${VARIABLE}="
	if ! LINE="$( /bin/grep -E "${SEARCH_STRING}" "${FILE}" 2>/dev/null )" ; then
		return 1
	fi

	echo "${LINE}" | sed -e "s/${SEARCH_STRING}//" -e 's/"//g'
	return 0
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
		MSG+="\n"
		MSG+="**********\n"
		MSG+="${MESSAGE}\n"
		MSG+="**********${NC}\n"

		LOGMSG+="\n"
		LOGMSG+="**********\n"
		LOGMSG+="${MESSAGE}\n"
		LOGMSG+="**********\n"
	fi

	[[ ${LOG_ONLY} == "false" ]] && echo -e "${MSG}${MESSAGE2}"

	# Log messages to a file if it was specified.
	# ${DISPLAY_MSG_LOG} <should> be set if ${LOG_IT} is true, but just in case, check.

	[[ ${LOG_IT} == "false" || -z ${DISPLAY_MSG_LOG} ]] && return
	if [[ ! -f ${DISPLAY_MSG_LOG} ]]; then
		mkdir -p "$( dirname "${DISPLAY_MSG_LOG}" )"
		touch "${DISPLAY_MSG_LOG}"
	fi

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
		echo -e "$( echo "$(date) ${LOGMSG}${MESSAGE2}" |
			sed -e "s/${ESC}/033/g" -e "s/033\[/033X/g" \
				-e "s/${G}//g" \
				-e "s/${Y}//g" \
				-e "s/${R}//g" \
				-e "s/${D}//g" \
				-e "s/${N}//g" \
		)"
	else
		echo "$(date) ${LOGMSG}${MESSAGE2}"
	fi >>  "${DISPLAY_MSG_LOG}"
}


# The various upload protocols need different variables defined.
# For the specified protocol, make sure the specified variable is defined.
function check_PROTOCOL()
{
	local P="${1}"	# Protocol
	local V="${2}"	# Variable
	local T="${3}"	# Type (web or server)
	local N="${4}"	# Name of setting  
	local VALUE="$( settings ".${V}" "${ALLSKY_ENV}" )"
	if [[ -z ${VALUE} ]]; then
		echo "${T} Protocol (${P}) set but not '${N}'."
		echo "Uploads will not work until this is fixed."
		echo "FIX: Set '${N}'."
		return 1
	fi
	return 0
}
# Check variables are correct for a remote server.
# Return 0 for OK, 1 for warning, 2 for error.
function check_remote_server()
{
	check_for_env_file || return 1

	local TYPE="${1}"
	local sTYPE
	if [[ ${TYPE} == "REMOTEWEBSITE" ]]; then
		sTYPE="Remote Website"
	else
		sTYPE="Remote Server"
	fi
	local CORRECTED="Uploads will not work until this is corrected."

	local USE="$( settings ".use${TYPE,,}" )"
	if [[ ${USE} != "true" ]]; then
		return 0
	fi

	local RET=0
	local PROTOCOL="$( settings ".${TYPE,,}protocol" )"
	case "${PROTOCOL}" in
		"")
			echo "${sTYPE} is being used but has no Protocol."
			echo "${CORRECTED}"
			echo "FIX: Either disable the remote Website/server or specify the protocol."
			return 2
			;;

		ftp | ftps | sftp | scp | rsync)
			check_PROTOCOL "${PROTOCOL}" "${TYPE}_HOST" "${sTYPE}" "Server Name" || RET=1
			check_PROTOCOL "${PROTOCOL}" "${TYPE}_USER" "${sTYPE}" "User Name" || RET=1
			if [[ ${PROTOCOL} == "scp" || ${PROTOCOL} == "rsync" ]]; then
				if check_PROTOCOL "${PROTOCOL}" "${TYPE}_SSH_KEY_FILE" "SSH Key File" "${sTYPE}" \
						&& [[ ! -e ${SSH_KEY_FILE} ]]; then
					echo -n "${sTYPE} Protocol (${PROTOCOL}) set but '${TYPE}_SSH_KEY_FILE'"
					echo    " (${SSH_KEY_FILE}) does not exist."
					echo    "${CORRECTED}"
					echo    "FIX: Create the file or use a different protocol."
					RET=1
				fi
			else
				check_PROTOCOL "${PROTOCOL}" "${TYPE}_PASSWORD" "${sTYPE}" "Password" || RET=1
				if [[ ${PROTOCOL} == "ftp" ]]; then
					echo "${sTYPE} Protocol set to insecure 'ftp'."
					echo "FIX: Using 'ftps' or 'sftp' if possible."
					RET=1
				fi
			fi
			;;

		s3 | gcs)
			P="${PROTOCOL^^}"
			if [[ ${PROTOCOL} == "s3" ]] &&
				check_PROTOCOL "${PROTOCOL}" "${TYPE}_AWS_CLI_DIR" "${sTYPE}" "AWS CLI Directory" \
				&& [[ ! -e ${AWS_CLI_DIR} ]]; then

				echo -n "${sTYPE} Protocol (${PROTOCOL}) set but '${TYPE}_AWS_CLI_DIR'"
				echo    "(${AWS_CLI_DIR}) does not exist."
				echo    "${CORRECTED}"
				echo    "FIX: Create the directory and its contents or use a different protocol."
				RET=1
			fi
			check_PROTOCOL "${PROTOCOL}" "${TYPE}_${P}BUCKET" "${sTYPE}" "${P} Bucket" || RET=1
			check_PROTOCOL "${PROTOCOL}" "${TYPE}_${P}ACL" "${sTYPE}" "${P} ACL" || RET=1
			;;

		*)
			echo -n "${sTYPE} Protocol (${PROTOCOL}) is not blank or one of:"
			echo    " ftp, ftps, sftp, scp, rsync, s3, gcs."
			echo    "${CORRECTED}"
			echo    "FIX: Use a valid protocol."
			RET=1
			;;
	esac

	REMOTE_PORT="$( get_variable "${TYPE}_PORT" "${ALLSKY_ENV}" )"
	if [[ -n ${REMOTE_PORT} ]] && ! is_number "${REMOTE_PORT}" ; then
		echo "${sTYPE} Port (${REMOTE_PORT}) must be a number."
		echo "${CORRECTED}"
		echo "FIX: Use a valid port number."
		RET=1
	fi

	return "${RET}"
}


####
# Update a json file.
#	field, new value, file, [type]
# or
#	-d field, "" value, file
function update_json_file()		# [-d] field, new value, file, [type]
{
	local M  DELETE  FIELD  FILE  TEMP  NEW_VALUE
	local ACTION  TYPE  DOUBLE_QUOTE  ERR_MSG  RET

	M="${ME:-${FUNCNAME[0]}}"

	if [[ ${1} == "-d" ]]; then
		DELETE="true"
		shift
	else
		DELETE="false"
	fi

	FIELD="${1}"
	if [[ ${FIELD:0:1} != "." ]]; then
		echo "${M}: Field names must begin with period '.' (Field='${FIELD}')" >&2
		return 1
	fi

	FILE="${3:-${SETTINGS_FILE}}"
	TEMP="/tmp/$$"

	if [[ ${DELETE} == "true" ]]; then
		NEW_VALUE="(delete)"	# only used in error message below.
		ACTION="del(${FIELD})"
	else
		NEW_VALUE="${2}"
		TYPE="${4}"

		DOUBLE_QUOTE='"'

		if [[ -n ${TYPE} ]]; then
			# These don't need quotes.
			if [[ ${TYPE} == "boolean" || ${TYPE} == "percent" ||
				  ${TYPE} == "number" || ${TYPE} == "integer" || ${TYPE} == "float" ]]; then
				DOUBLE_QUOTE=""
			fi

			# If the TYPE wasn't passed to us, do our best to determine if
			# it's a boolean or number.
		elif [[ ${NEW_VALUE} == "true" || ${NEW_VALUE} == "false" ]] ||
				is_number "${NEW_VALUE}" ; then
			DOUBLE_QUOTE=""
		fi
		ACTION="${FIELD} = ${DOUBLE_QUOTE}${NEW_VALUE}${DOUBLE_QUOTE}"
	fi

	ERR_MSG="$( jq --indent 4 "${ACTION}" "${FILE}" 2>&1 > "${TEMP}" )"
	RET=$?
	if [[ ${RET} -eq 0 ]]; then
		# Have to use "cp" instead of "mv" to keep any hard link.
		cp "${TEMP}" "${FILE}"
	else
		MSG="Unable to [$ACTION] json value of '${FIELD}' to '${NEW_VALUE}' in '${FILE}': ${ERR_MSG}"
		echo "${M}: ${MSG}" >&2
	fi
	rm "${TEMP}"

	return "${RET}"
}


####
# Update a field in an array or delete the array index the field is at.
function update_array_field()
{
	local FILE="${1}"
	local ARRAY="${2}"
	local FIELD="${3}"			# may be ""
	local VALUE="${4}"
	local NEW_VALUE="${5}"		# a value or "--delete"

	local I="$( getJSONarrayIndex "${FILE}" "${ARRAY}" "${VALUE}" )"
	[[ ${I} -eq -1 ]] && return

	if [[ ${NEW_VALUE} == "--delete" ]]; then
		update_json_file -d ".${ARRAY}[${I}]" "" "${FILE}"
	else
		local URL=".${ARRAY}[${I}].${FIELD}"
		local V="$( settings "${URL}" "${FILE}" )"
		if [[ ${V} != "${NEW_VALUE}" ]]; then
			update_json_file "${URL}" "${NEW_VALUE}" "${FILE}"
		fi
	fi
}


# Replace all the ${NEED_TO_UPDATE} placeholders.
function replace_website_placeholders()
{
	local TYPE="${1}"		# "local" or "remote" Website
	local FILE="${2}"
	if [[ -z ${FILE} ]]; then
		if [[ ${TYPE} == "local" ]]; then
			FILE="${ALLSKY_WEBSITE_CONFIGURATION_FILE}"
		else
			FILE="${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}"
		fi
	fi

	# Get the array index for the mini-timelapse.

	local PARENT  FIELD  INDEX  MINI_TLAPSE_DISPLAY  MINI_TLAPSE_URL
	local MINI_TLAPSE_DISPLAY_VALUE  MINI_TLAPSE_URL_VALUE
	PARENT="homePage.leftSidebar"
	FIELD="Mini-timelapse"
	INDEX=$( getJSONarrayIndex "${FILE}" "${PARENT}" "${FIELD}" )
	if [[ ${INDEX} -ge 0 ]]; then
		MINI_TLAPSE_DISPLAY="${PARENT}[${INDEX}].display"
		MINI_TLAPSE_URL="${PARENT}[${INDEX}].url"
		TIMELAPSE_MINI_IMAGES="$( settings ".minitimelapsenumimages" )"
		if [[ ${TIMELAPSE_MINI_IMAGES:-0} -eq 0 ]]; then
			MINI_TLAPSE_DISPLAY_VALUE="false"
			MINI_TLAPSE_URL_VALUE=""
		else
			MINI_TLAPSE_DISPLAY_VALUE="true"
			if [[ ${DO_REMOTE_WEBSITE} == "true" ]]; then
				MINI_TLAPSE_URL_VALUE="mini-timelapse.mp4"
			else
				#shellcheck disable=SC2153
				MINI_TLAPSE_URL_VALUE="/${IMG_DIR}/mini-timelapse.mp4"
			fi
		fi
	else
		MSG="Unable to update '${FIELD}' in ${FILE}; ignoring."
		display_msg --log warning "${MSG}"
		# bogus settings that won't do anything
		MINI_TLAPSE_DISPLAY="x"
		MINI_TLAPSE_URL="x"
		MINI_TLAPSE_DISPLAY_VALUE=""
		MINI_TLAPSE_URL_VALUE=""
	fi

	# For these setting, check if it's == ${NEED_TO_UPDATE}.
	# If so, and the settings file's value isn't null, update it in the config file.
	# If the config file has a value, use it, even if it's "".

	local TEMP  LATITUDE  LONGITUDE  AURORAMAP  LOCATION  OWNER  CAMERA
	local LENS  COMPUTER  IMAGE_NAME

	LATITUDE="$( settings ".config.latitude" "${FILE}" )"
	if [[ ${LATITUDE} == "${NEED_TO_UPDATE}" ]]; then
		# Convert latitude and longitude to use N, S, E, W.
		TEMP="$( settings ".latitude" )"
		if [[ -n ${TEMP} ]]; then
			LATITUDE="$( convertLatLong "${TEMP}" "latitude" )"
		fi
	fi
	[[ -z ${LATITUDE} ]] && display_msg --log warning "latitude is empty"

	LONGITUDE="$( settings ".config.longitude" "${FILE}" )"
	if [[ ${LONGITUDE} == "${NEED_TO_UPDATE}" ]]; then
		TEMP="$( settings ".longitude" )"
		if [[ -n ${TEMP} ]]; then
			LONGITUDE="$( convertLatLong "${TEMP}" "longitude" )"
		fi
	fi
	[[ -z ${LONGITUDE} ]] && display_msg --log warning "longitude is empty"

	if [[ ${LATITUDE:1,-1} == "S" ]]; then			# last character
		AURORAMAP="south"
	else
		AURORAMAP="north"
	fi

	LOCATION="$( settings ".config.location" "${FILE}" )"
	if [[ ${LOCATION} == "${NEED_TO_UPDATE}" ]]; then
		TEMP="$( settings ".location" )"
		if [[ -n ${TEMP} ]]; then
			LOCATION="${TEMP}"
		fi
	fi

	OWNER="$( settings ".config.owner" "${FILE}" )"
	if [[ ${OWNER} == "${NEED_TO_UPDATE}" ]]; then
		TEMP="$( settings ".owner" )"
		if [[ -n ${TEMP} ]]; then
			OWNER="${TEMP}"
		fi
	fi

	CAMERA="$( settings ".config.camera" "${FILE}" )"
	if [[ ${CAMERA} == "${NEED_TO_UPDATE}" ]]; then
		# TYPE and MODEL are already in the environment.
		CAMERA="${CAMERA_TYPE} ${CAMERA_MODEL}"
	fi

	LENS="$( settings ".config.lens" "${FILE}" )"
	if [[ ${LENS} == "${NEED_TO_UPDATE}" ]]; then
		TEMP="$( settings ".lens" )"
		if [[ -n ${TEMP} ]]; then
			LENS="${TEMP}"
		fi
	fi

	COMPUTER="$( settings ".config.computer" "${FILE}" )"
	if [[ ${COMPUTER} == "${NEED_TO_UPDATE}" ]]; then
		TEMP="$( settings ".computer" )"
		if [[ -n ${TEMP} ]]; then
			COMPUTER="${TEMP}"
		fi
	fi

	if [[ ${TYPE} == "local" ]]; then
		#shellcheck disable=SC2153
		IMAGE_NAME="/${IMG_DIR}/${FULL_FILENAME}"
	else
		IMAGE_NAME="${FULL_FILENAME}"
	fi

	"${ALLSKY_SCRIPTS}/updateWebsiteConfig.sh" --verbosity silent \
		--config "${FILE}" \
		config.imageName			"imageName"			"${IMAGE_NAME}" \
		config.latitude				"latitude"			"${LATITUDE}" \
		config.longitude			"longitude"			"${LONGITUDE}" \
		config.auroraMap			"auroraMap"			"${AURORAMAP}" \
		config.location				"location"			"${LOCATION}" \
		config.owner				"owner" 			"${OWNER}" \
		config.camera				"camera"			"${CAMERA}" \
		config.lens					"lens"				"${LENS}" \
		config.computer				"computer"			"${COMPUTER}" \
		config.AllskyVersion		"AllskyVersion"		"${ALLSKY_VERSION}" \
		${MINI_TLAPSE_DISPLAY}		"mini_display"		"${MINI_TLAPSE_DISPLAY_VALUE}" \
		${MINI_TLAPSE_URL}			"mini_url"			"${MINI_TLAPSE_URL_VALUE}"
}


####
# Prepare a local Website:
#	Update the config file by replacing placeholders.
#	Copy data.json.
function prepare_local_website()
{
	local FORCE="${1}"
	local POST_DATA="${2}"

	display_msg --log progress "Creating default ${ALLSKY_WEBSITE_CONFIGURATION_NAME}."

	# Make sure there's a config file.
	if [[ ! -s ${ALLSKY_WEBSITE_CONFIGURATION_FILE} || ${FORCE} == "--force" ]]; then
		cp "${REPO_WEBSITE_CONFIGURATION_FILE}" "${ALLSKY_WEBSITE_CONFIGURATION_FILE}"
	fi

	replace_website_placeholders "local" "${ALLSKY_WEBSITE_CONFIGURATION_FILE}"

	if [[ ${POST_DATA} == "postData" && "$( settings ".uselocalwebsite" )" == "true" ]]; then
		# --fromWebUI tells it to be mostly silent.
		local MSG="$( "${ALLSKY_SCRIPTS}/postData.sh" --fromWebUI --allfiles 2>&1 )"
		if [[ $? -eq 0 ]]; then
			display_msg --log progress "${MSG}"
		else
			display_msg --log warning "${MSG}"
		fi
	fi
}


####
# Update a Website configuration file from old to current version.
function update_old_website_config_file()
{
	local FILE PRIOR_VERSION CURRENT_VERSION

	FILE="${1}"
	PRIOR_VERSION="${2}"
	CURRENT_VERSION="${3}"

	# Current version: 2
	if [[ ${PRIOR_VERSION} -eq 1 ]]; then
		# Deletions:
		update_json_file -d ".AllskyWebsiteVersion" "" "${FILE}"
		update_json_file -d ".homePage.onPi" "" "${FILE}"
		update_array_field "${FILE}" "homePage.popoutIcons" "variable" "AllskyWebsiteVersion" "--delete"

		# Additions:
		# Add in same place as new file
		local NEW='      \"thumbnailsizex\": 100,\
        \"thumbnailsizey\": 75,\
        \"thumbnailsortorder\": \"ascending\",'
		sed -i "/\"leftSidebar\"/i\ ${NEW}" "${FILE}"

		# Changes:
		for i in "videos" "keograms" "startrails"; do
			update_array_field "${FILE}" "homePage.leftSidebar" "url" "${i}" "${i}/"
		done
	fi

	# Set to current config and Allsky versions.
	update_json_file ".${WEBSITE_CONFIG_VERSION}" "${CURRENT_VERSION}" "${FILE}"
	update_json_file ".${WEBSITE_ALLSKY_VERSION}" "${ALLSKY_VERSION}" "${FILE}"
}

####
# Create the lighttpd configuration file.
function create_lighttpd_config_file()
{
	local TMP="/tmp/x"

	sudo rm -f "${TMP}"
	sed \
		-e "s;XX_ALLSKY_WEBUI_XX;${ALLSKY_WEBUI};g" \
		-e "s;XX_WEBSERVER_OWNER_XX;${WEBSERVER_OWNER};g" \
		-e "s;XX_WEBSERVER_GROUP_XX;${WEBSERVER_GROUP};g" \
		-e "s;XX_ALLSKY_HOME_XX;${ALLSKY_HOME};g" \
		-e "s;XX_ALLSKY_IMAGES_XX;${ALLSKY_IMAGES};g" \
		-e "s;XX_ALLSKY_CONFIG_XX;${ALLSKY_CONFIG};g" \
		-e "s;XX_ALLSKY_WEBSITE_XX;${ALLSKY_WEBSITE};g" \
		-e "s;XX_ALLSKY_DOCUMENTATION_XX;${ALLSKY_DOCUMENTATION};g" \
		-e "s;XX_ALLSKY_OVERLAY_XX;${ALLSKY_OVERLAY};g" \
		-e "s;XX_MY_OVERLAY_TEMPLATES_XX;${MY_OVERLAY_TEMPLATES};g" \
			"${REPO_LIGHTTPD_FILE}"  >  "${TMP}"
	sudo install -m 0644 "${TMP}" "${LIGHTTPD_CONFIG_FILE}" && rm -f "${TMP}"
}

####
# Create the lighttpd log file with permissions so user can update it.
function create_lighttpd_log_file()
{
	display_msg --log progress "Creating new ${LIGHTTPD_LOG_FILE}."

	# Remove any old log files.
	# Start off with a 0-length log file the user can write to.
	sudo chmod 755 "${LIGHTTPD_LOG_DIR}"
	sudo rm -fr "${LIGHTTPD_LOG_DIR}"/*
	sudo truncate -s 0 "${LIGHTTPD_LOG_FILE}"
	sudo chmod 664 "${LIGHTTPD_LOG_FILE}"
	sudo chown "${WEBSERVER_GROUP}:${ALLSKY_GROUP}" "${LIGHTTPD_LOG_FILE}"
}

####
# Check for size of RAM+swap during installation (Issue # 969)
# and ask the user to increase if not "big enough".
# recheck_swap() is is referenced in the Allsky Documentation and can
# optionally be called after installation to adjust swap space.
function recheck_swap()
{
	check_swap "after_install" "prompt"
}
function check_swap()
{
	# global: TITLE  WT_WIDTH
	local SWAP_CONFIG_FILE="/etc/dphys-swapfile"
	local CALLED_FROM PROMPT
	CALLED_FROM="${1}"
	PROMPT="${2:-false}"

	if [[ ${CALLED_FROM} == "install" ]]; then
		declare -n v="${FUNCNAME[0]}"; [[ ${v} == "true" && ${PROMPT} == "false" ]] && return
	fi

	[[ -z ${WT_WIDTH} ]] && WT_WIDTH="$( calc_wt_size )"
	local RAM_SIZE  DESIRED_COMBINATION  SUGGESTED_SWAP_SIZE  CURRENT_SWAP
	local AMT  M  MSG  SWAP_SIZE  CURRENT_MAX

	# This can return "total_mem is unknown" if the OS is REALLY old.
	RAM_SIZE="$( vcgencmd get_config total_mem )"
	if [[ ${RAM_SIZE} =~ "unknown" ]]; then
		# Note: This doesn't produce exact results.  On a 4 GB Pi, it returns 3.74805.
		RAM_SIZE=$( free --mebi | awk '{if ($1 == "Mem:") {print $2; exit 0} }' )		# in MB
	else
		RAM_SIZE="${RAM_SIZE//total_mem=/}"
	fi
	DESIRED_COMBINATION=$((1024 * 5))		# desired minimum memory + swap
	SUGGESTED_SWAP_SIZE=0
	for i in 512 1024 2048 4096		# 8192 and above don't need any swap
	do
		if [[ ${RAM_SIZE} -le ${i} ]]; then
			SUGGESTED_SWAP_SIZE=$((DESIRED_COMBINATION - i))
			break
		fi
	done
	display_msg --logonly info "RAM_SIZE=${RAM_SIZE}, SUGGESTED_SWAP_SIZE=${SUGGESTED_SWAP_SIZE}."

	# Not sure why, but displayed swap is often 1 MB less than what's in /etc/dphys-swapfile
	CURRENT_SWAP=$( free --mebi | awk '{if ($1 == "Swap:") {print $2 + 1; exit 0} }' )	# in MB
	CURRENT_SWAP=${CURRENT_SWAP:-0}
	if [[ ${CURRENT_SWAP} -lt ${SUGGESTED_SWAP_SIZE} || ${PROMPT} == "true" ]]; then

		[[ -z ${FUNCTION} ]] && sleep 2		# give user time to read prior messages
		if [[ ${CURRENT_SWAP} -eq 1 ]]; then
			CURRENT_SWAP=0
			AMT="no"
			M="added"
		else
			AMT="${CURRENT_SWAP} MB of"
			M="increased"
		fi
		MSG="\nYour Pi currently has ${AMT} swap space."
		MSG+="\nBased on your memory size of ${RAM_SIZE} MB,"
		if [[ ${CURRENT_SWAP} -ge ${SUGGESTED_SWAP_SIZE} ]]; then
			SUGGESTED_SWAP_SIZE=${CURRENT_SWAP}
			MSG+=" there is no need to change anything, but you can if you would like."
		else
			MSG+=" we suggest ${SUGGESTED_SWAP_SIZE} MB of swap"
			MSG+=" to decrease the chance of timelapse and other failures."
			MSG+="\n\nDo you want swap space ${M}?"
			MSG+="\n\nYou may change the amount of swap space by changing the number below."
		fi

		SWAP_SIZE=$( whiptail --title "${TITLE}" --inputbox "${MSG}" 18 "${WT_WIDTH}" \
			"${SUGGESTED_SWAP_SIZE}" 3>&1 1>&2 2>&3 )
		# If the suggested swap was 0 and the user added a number but didn't first delete the 0,
		# do it now so we don't have numbers like "0256".
		[[ ${SWAP_SIZE:0:1} == "0" ]] && SWAP_SIZE="${SWAP_SIZE:1}"

		if [[ -z ${SWAP_SIZE} || ${SWAP_SIZE} == "0" ]]; then
			if [[ ${CURRENT_SWAP} -eq 0 && ${SUGGESTED_SWAP_SIZE} -gt 0 ]]; then
				display_msg --log warning "With no swap space you run the risk of programs failing."
			else
				display_msg --log info "Swap will remain at ${CURRENT_SWAP}."
			fi
		else
			display_msg --log progress "Setting swap space to ${SWAP_SIZE} MB."
			sudo dphys-swapfile swapoff					# Stops the swap file
			sudo sed -i "/CONF_SWAPSIZE/ c CONF_SWAPSIZE=${SWAP_SIZE}" "${SWAP_CONFIG_FILE}"

			CURRENT_MAX="$( get_variable "CONF_MAXSWAP" "${SWAP_CONFIG_FILE}" )"
			# TODO: Can we determine the default max rather than hard-code it?
			CURRENT_MAX="${CURRENT_MAX:-2048}"
			if [[ ${CURRENT_MAX} -lt ${SWAP_SIZE} ]]; then
				if [[ ${DEBUG} -gt 0 ]]; then
					display_msg --log debug "Increasing max swap size to ${SWAP_SIZE} MB."
				fi
				sudo sed -i "/CONF_MAXSWAP/ c CONF_MAXSWAP=${SWAP_SIZE}" "${SWAP_CONFIG_FILE}"
			fi

			sudo dphys-swapfile setup  > /dev/null		# Sets up new swap file
			sudo dphys-swapfile swapon					# Turns on new swap file
		fi
	else
		MSG="Size of current swap (${CURRENT_SWAP} MB) is sufficient; no change needed."
		display_msg --logonly info "${MSG}"
	fi

	if [[ ${CALLED_FROM} == "install" ]]; then
		STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")
	fi
}


####

INITIAL_FSTAB_STRING="tmpfs ${ALLSKY_TMP} tmpfs"

# Is the tmp directory mounted?
function is_mounted()
{
	local TMP="${1}"

	mount | grep --quiet "${TMP}"
}
function umount_tmp()
{
	local TMP="${1}"

	sudo umount -f "${TMP}" 2> /dev/null ||
		{
			sudo systemctl restart smbd 2> /dev/null
			sudo umount -f "${TMP}" 2> /dev/null
		}
}

####
function recheck_tmp()
{
	check_tmp "after_install"
}
####
# Check if prior ${ALLSKY_TMP} was a memory filesystem.
# If not, offer to make it one.
function check_tmp()
{
	# global: TITLE  WT_WIDTH
	local PROMPT  CALLED_FROM
	CALLED_FROM="${1}"

	if [[ ${CALLED_FROM} == "install" ]]; then
		declare -n v="${FUNCNAME[0]}"; [[ ${v} == "true" ]] && return
	fi

	[[ -z ${WT_WIDTH} ]] && WT_WIDTH="$( calc_wt_size )"
	local STRING  SIZE  D  MSG

	# If the prior ${ALLSKY_TMP} was a memory filesystem it will have an entry
	# in /etc/fstab with ${ALLSKY_TMP} in it, even if it's not currently mounted.
	if grep --quiet "^${INITIAL_FSTAB_STRING}" /etc/fstab ; then
		MSG="${ALLSKY_TMP} is currently a memory filesystem; no change needed."
		display_msg --logonly info "${MSG}"

		# If there's a prior Allsky version and it's tmp directory is mounted,
		# try to unmount it, but that often gives an error that it's busy,
		# which isn't really a problem since it'll be unmounted at the reboot.
		# We know from the grep above that /etc/fstab has ${ALLSKY_TMP}
		# but the mount point is currently in the PRIOR Allsky.
		D="${PRIOR_ALLSKY_DIR}/tmp"
		if [[ -d "${D}" ]] && mount | grep --silent "${D}" ; then
			# The Samba daemon is one known cause of "target busy".
			umount_tmp "${D}"
		fi

		if [[ ${CALLED_FROM} == "install" ]]; then
			STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")
		fi

		# If the new Allsky's ${ALLSKY_TMP} is already mounted, don't do anything.
		# This would be the case during an upgrade.
		if mount | grep --silent "${ALLSKY_TMP}" ; then
			display_msg --logonly info "${ALLSKY_TMP} already mounted."
			return 0
		fi

		check_and_mount_tmp		# works on new ${ALLSKY_TMP}
		return 0
	fi

	SIZE=75		# MB - should be enough
	MSG="Putting the ${ALLSKY_TMP} director and its contents into memory drastically"
	MSG+=" decreases the number of writes to the SD card, increasing its life."
	MSG+="\n\nDo you want to do this?"
	MSG+="\n\nNote: anything in that directory will be deleted whenever the Pi is rebooted,"
	MSG+=" but that's not an issue since the directory only contains temporary files."
	if whiptail --title "${TITLE}" --yesno "${MSG}" 15 "${WT_WIDTH}"  3>&1 1>&2 2>&3; then
		STRING="${INITIAL_FSTAB_STRING} size=${SIZE}M,noatime,lazytime,nodev,"
		STRING+="nosuid,mode=775,uid=${ALLSKY_OWNER},gid=${WEBSERVER_GROUP}"
		if ! echo "${STRING}" | sudo tee -a /etc/fstab > /dev/null ; then
			display_msg --log error "Unable to update /etc/fstab"
			return 1
		fi
		check_and_mount_tmp
		display_msg --log progress "${ALLSKY_TMP} is now in memory."
	else
		MSG="The ${ALLSKY_TMP} directory and its contnts will remain on the SD card."
		display_msg --log info "${MSG}"
		mkdir -p "${ALLSKY_TMP}"
	fi

	if [[ ${CALLED_FROM} == "install" ]]; then
		STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")
	fi
}

####
# Prompt for either latitude or longitude, and make sure it's a valid entry.
function prompt_for_lat_long()
{
	local PROMPT="${1}"
	local SETTING_NAME="${2}"
	local WEBUI_SETTING_LABEL="${3}"
	local DEFAULT="${4}"
	local ERROR_MSG=""   VALUE  M

	[[ -z ${WT_WIDTH} ]] && WT_WIDTH="$( calc_wt_size )"
	[[ -z ${TITLE} ]] && TITLE="Enter ${SETTING_NAME}"

	while :
	do
		M="${ERROR_MSG}${PROMPT}"
		VALUE=$( whiptail --title "${TITLE}" --inputbox "${M}" 18 "${WT_WIDTH}" "${DEFAULT}" 3>&1 1>&2 2>&3 )
		if [[ -z ${VALUE} ]]; then
			# Let the user not enter anything.
			# A warning message is printed by our invoker.
			echo ""
			return

		elif VALUE="$( convertLatLong "${VALUE}" "${SETTING_NAME}" 2>&1 )" ; then
			update_json_file ".${SETTING_NAME}" "${VALUE}" "${SETTINGS_FILE}"
			display_msg --log progress "${WEBUI_SETTING_LABEL} set to ${VALUE}."
			echo "${VALUE}"
			return

		else
			ERROR_MSG="${VALUE}\n\n"
		fi
	done
}

####
# Try to 't automatically determine the latitude and longitude.
# If we can't prompt for them.
function get_lat_long()
{
	# Global: SETTINGS_FILE
	local MSG  LATITUDE  LAT  LONGITUDE  LON  RAW_LOCATION  MY_LOCATION_PARTS  ERR  X

	if [[ ! -f ${SETTINGS_FILE} ]]; then
		display_msg --log error "INTERNAL ERROR: '${SETTINGS_FILE}' not found!"
		return 1
	fi

	LAT=""
	LON=""
	# Check we have an internect connection
	if wget -q --spider "http://www.google.com" 2>/dev/null ; then
		# Use ipinfo.io to get the user's lat and lon from their IP.
		RAW_LOCATION="$( curl -s ipinfo.io/loc 2>/dev/null )"
		# If we got a json response then it's an error.
		# If "jq" fails we did NOT get json response.
		if ERR="$( jq -e . 2>&1 <<<"${RAW_LOCATION}" )"; then
			MSG="Got error response trying to get latitude and longitude from IP address:"
			MSG+="\n${ERR}"
			display_msg --logonly info "${MSG}"
		else
			# Lat and Lon are returned as a comma separated string i.e. 52.1234,0.3123
			# Setting an array variable needs the items to be space-separated.
			# shellcheck disable=SC2206
			MY_LOCATION_PARTS=( ${RAW_LOCATION/,/ } )
			if [[ ${#MY_LOCATION_PARTS[@]} -eq 2 ]]; then

				LAT="${MY_LOCATION_PARTS[0]}"
				LON="${MY_LOCATION_PARTS[1]}"

				if [[ $( echo "${LAT} > 0" | bc ) -eq 1 ]] ; then
					LAT="${LAT}N"
				else
					LAT="${LAT//-/}S"
				fi

				if [[ $( echo "$LON > 0" | bc ) -eq 1 ]] ; then
					LON="${LON}E"
				else
					LON="${LON//-/}W"
				fi
			else
				display_msg --logonly info "'${RAW_LOCATION}' did not have two fields."
			fi
		fi
	else
		display_msg --logonly info "No internet connection detected; skipping geolocation."
	fi

	if [[ -z ${LAT} ]]; then
		MSG="Prompting for Latitude and Longitude."
		X="Enter"
	else
		MSG="Verifying pre-determined Latitude and Longitude."
		X="Verify"
	fi
	display_msg --log progress "${MSG}"
	MSG="${X} your Latitude."
	MSG+="\nIt can either have a plus or minus sign (e.g., -20.1)"
	MSG+="\nor N or S (e.g., 20.1N)"
	if [[ -n ${LAT} ]]; then
		MSG+="\n\n*** Your APPROXIMATE Latitude using your IP Address is below. ***"
	fi
	LATITUDE="$( prompt_for_lat_long "${MSG}" "latitude" "Latitude" "${LAT}" )"

	MSG="${X} your Longitude."
	MSG+="\nIt can either have a plus or minus sign (e.g., -20.1)"
	MSG+="\nor E or W (e.g., 20.1W)"
	if [[ -n ${LON} ]]; then
		MSG+="\n\n*** Your APPROXIMATE Longitude using your IP Address is below. ***"
	fi
	LONGITUDE="$( prompt_for_lat_long "${MSG}" "longitude" "Longitude" "${LON}" )"

	if [[ -z ${LATITUDE} || -z ${LONGITUDE} ]]; then
		MSG="Latitude and Longitude need to be set in the WebUI before Allsky can start."
		display_msg --log warning "${MSG}"
		return 1
	fi
	return 0
}


####
# Return the amount of RAM in GB.
function get_RAM()
{
	# Input example: total_mem=4096
	# Pi's have either 0.5 GB or an integer number of GB.
	sudo vcgencmd get_config total_mem | gawk --field-separator "=" '
		{
			if ($2 < 1024)
				printf("%.1f", $2 / 1024);
			else
				printf("%d", $2 / 1024);
			exit 0;
		}'

}


####
# Return the "computer" - the Pi model and amount of memory in GB
function get_computer()
{
	# The file has a NULL at the end so to avoid a bash warning, ignore it.
	local MODEL="$( tr --delete '\0' < /sys/firmware/devicetree/base/model |
			sed 's/Raspberry Pi/RPi/')"
	local GB="$( get_RAM )"
	echo "${MODEL}, ${GB} GB"
}


####
# Get a value from the php ini file, using php rather than parsing the ini 
# files directly. This does assume that both the cli and cgi settings files
# work in the same way.
#
function get_php_setting()
{
    local SETTING="${1}"
    php -r "echo ini_get('${SETTING}');"
}


####
# Get the checksum of all Website files, not including the ones the user creates or updates.
function get_website_checksums()
{
	(
		cd "${ALLSKY_WEBSITE}"		|| exit 1

		# Add important image files.
		echo loading.jpg
		echo allsky-logo.png
		echo NoThumbnail.png
		echo allsky-favicon.png

		# Get all non-image files except for the ones the user creates/updates.
		find . -type f '!' '(' -name '*.jpg' -or -name '*.png' -or -name '*.mp4' ')' |
			sed 's;^./;;' |
			grep -E -v "myFiles/|${ALLSKY_WEBSITE_CONFIGURATION_NAME}|$( basename "${CHECKSUM_FILE}" )"
	) | "${ALLSKY_UTILITIES}/getChecksum.php"
}


####
# Update the specified file with the specified new value.
# ${V_} must be a legal shell variable name.
# Use V_ and VAL_ in case the caller uses V or VAL
doV()
{
	local oldV="${1}"		# Optional name of old variable; if "" then use ${V_}.
	local V_="${2}"			# name of the variable that holds the new value
	local VAL_="${!V_}"		# value of the variable
	local jV="${3}"			# new json variable name
	local TYPE="${4}"
	local FILE="${5}"

	[[ -z ${oldV} ]] && oldV="${V_}"

	if [[ ${TYPE} == "boolean" ]]; then
		# Some booleans used "true/false" and some used "1/0".
		if [[ ${VAL_} == "true" || ${VAL_} == "1" ]]; then
			VAL_="true"
		else
			VAL_="false"
		fi
	elif [[ ${TYPE} == "number" && -z ${VAL_} ]]; then
		VAL_=0		# give it a default
	fi

	local ERR  MSG
	if ERR="$( update_json_file ".${jV}" "${VAL_}" "${FILE}" "${TYPE}" 2>&1 )" ; then
		if [[ ${oldV} == "${jV}" ]]; then
			oldV=""
		else
			oldV+=": "
		fi
		MSG="${SPACE}${oldV}${jV} = ${VAL_}"
		[[ -n ${oldV} ]] && MSG+=", TYPE=${TYPE}"
		display_msg --logonly info "${MSG}"
	else
		# update_json_file() returns error message.
		display_msg --log warning "${ERR}"
	fi
}


####
# Check for settings in the options file that aren't in the settings file.
# These are new settings.
# This has to come after the new settings and options files are created.
function add_new_settings()
{
	local SETTINGS="${1}"
	local OPTIONS="${2}"
	local FROM_INSTALL="${3}"

	if [[ ${FROM_INSTALL} == "false" ]]; then
		function display_msg() { return; }
	fi

	display_msg --logonly info "Checking for new settings in options file."

	local TAB="$( echo -e '\t' )"
	local NEW="$( "${ALLSKY_SCRIPTS}/convertJSON.php" \
		--options-only \
		--settings-file "${SETTINGS}" \
		--options-file "${OPTIONS}" \
		--delimiter "${TAB}" \
		2>&1 )"
	if [[ $? -ne 0 ]]; then
		local M="Unable to get new settings"
		MSG="${M}: $( < "${NEW}" )"
		if [[ ${FROM_INSTALL} == "true" ]]; then
			display_msg --log error "${MSG}"
			exit_installation 1 "${STATUS_ERROR}" "${M}."
		else
			echo "ERROR: ${MSG}" >&2
			return 1
		fi
	fi
	if [[ -z ${NEW} ]]; then
		display_msg --logonly info "  >> No new settings in options file."
		return 0
	fi

	IFS="${TAB}"
	echo -e "${NEW}" | while read -r SETTING VALUE TYPE
		do
			[[ -z ${SETTING} ]] && continue

			# "read" doesn't work with empty fields.
			if [[ -z ${TYPE} ]]; then
				TYPE="${VALUE}"
				VALUE=""
			fi
			doV "NEW" "VALUE" "${SETTING}" "${TYPE}" "${SETTINGS}"
		done

	return 0
}
