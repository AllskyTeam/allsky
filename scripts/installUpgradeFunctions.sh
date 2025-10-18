#!/bin/bash

# Shell variables and functions used by the installation and upgrade scripts.
# This file is "source"d into others, and must be done AFTER source'ing variables.sh.

######################################### variables

# export to keep shellcheck quiet

	# This file is created during installation and used by PHP and Python scripts.
export ALLSKY_VARIABLES_JSON_FILE="${ALLSKY_HOME}/variables.json"

	# The login installing Allsky
export ALLSKY_OWNER=$( id --group --name )
export ALLSKY_GROUP=${ALLSKY_OWNER}
export ALLSKY_WEBSERVER_OWNER="www-data"
export ALLSKY_WEBSERVER_GROUP="${ALLSKY_WEBSERVER_OWNER}"
export ALLSKY_NEED_TO_UPDATE="XX_NEED_TO_UPDATE_XX"

	# Central location for all master repository files.
export ALLSKY_REPO="${ALLSKY_HOME}/config_repo"
export REPO_WEBCONFIG_FILE="${ALLSKY_REPO}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}.repo"
export REPO_SUDOERS_FILE="${ALLSKY_REPO}/sudoers.repo"
export REPO_LIGHTTPD_FILE="${ALLSKY_REPO}/lighttpd.conf.repo"
export REPO_AVI_FILE="${ALLSKY_REPO}/avahi-daemon.conf.repo"
export REPO_OPTIONS_FILE="${ALLSKY_REPO}/$( basename "${ALLSKY_OPTIONS_FILE}" ).repo"
export REPO_ENV_FILE="${ALLSKY_REPO}/$( basename "${ALLSKY_ENV}" ).repo"
export REPO_WEBSITE_CONFIGURATION_FILE="${ALLSKY_REPO}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}.repo"

##### Information on prior Allsky versions and files.
	# Location of old-style WebUI and Website.
# TODO: delete these two in v2025.xx.xx
export OLD_WEBUI_LOCATION="/var/www/html"
export OLD_WEBSITE_LOCATION="${OLD_WEBUI_LOCATION}/allsky"

	# Directory of prior version of Allsky, if it exists.
export ALLSKY_PRIOR_DIR="$( dirname "${ALLSKY_HOME}" )/${ALLSKY_INSTALL_DIR}-OLD"
	# Prior "config" directory, if it exists.
export PRIOR_CONFIG_DIR="${ALLSKY_PRIOR_DIR}/$( basename "${ALLSKY_CONFIG}" )"
export PRIOR_WEBSITE_DIR="${ALLSKY_PRIOR_DIR}${ALLSKY_WEBSITE/${ALLSKY_HOME}/}"
export PRIOR_WEBSITE_CONFIG_FILE="${PRIOR_WEBSITE_DIR}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}"
export PRIOR_REMOTE_WEBSITE_CONFIGURATION_FILE="${PRIOR_CONFIG_DIR}/${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_NAME}"
export PRIOR_PYTHON_VENV="${ALLSKY_PRIOR_DIR}/venv/lib"
export PRIOR_MYFILES_DIR="${ALLSKY_MYFILES_DIR/${ALLSKY_HOME}/${ALLSKY_PRIOR_DIR}}"

	# Name of setting that determines version of Website config file.
export WEBSITE_CONFIG_VERSION="ConfigVersion"
	# Name of setting that holds the Allsky version.
export WEBSITE_ALLSKY_VERSION="config.AllskyVersion"

	# Location of prior files varies by release; this is most recent location.
# TODO: delete these two in v2025.xx.xx
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
	local V="$( curl --show-error --silent "${ALLSKY_GITHUB_RAW_ROOT}/${PACKAGE}/${BRANCH}/${VF}" | tr -d '\n\r' )"
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
	if [[ ${1} == "--note" ]]; then
		GET_NOTE="true"
		shift
	else
		GET_NOTE="false"
	fi
	local F="${1}"
	if [[ -z ${F} ]]; then
		F="${ALLSKY_VERSION_FILE}"		# default
	else
		[[ ${F:1,-1} == "/" ]] && F+="$( basename "${ALLSKY_VERSION_FILE}" )"
	fi
	if [[ -f ${F} ]]; then
		# Sometimes the branch file will have both "master" and "dev" on two lines.
		local RETURN="$( head -1 "${F}" )"
		if [[ ${GET_NOTE} == "true" ]]; then
			local NOTE="$( tail -1 "${F}" )"
			# Check if there's a note; if not, there will be only a version.
			[[ ${NOTE} != "${RETURN}" ]] && RETURN="${NOTE}"
		fi
		echo -n "${RETURN}" | tr -d '\n\r'
	fi
}


#####
# Get the branch using git.
function get_branch()
{
	local H="${1:-${ALLSKY_HOME}}"
	local BRANCH="$( cd "${H}" || exit; git rev-parse --abbrev-ref HEAD )"
	if [[ ${BRANCH} == "HEAD" ]]; then
		# If the user is getting the master branch but uses the "--branch master_branch_name",
		# BRANCH will be "HEAD".  For example if the master branch is v2024.12.06_02 and the user
		# runs "git clone --branch v2024.12.06_02 ...".
		local FILE="${H}/.git/packed-refs"
		if [[ -s ${FILE} ]]; then
			local B="$( tail -1 "${FILE}" | sed -e 's;.*/;;' )"
			[[ -n ${B} ]] && BRANCH="${B}"
		fi
	fi
	echo "${BRANCH}"
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
		LOGMSG="${NL}* ${MESSAGE}"
		MSG="${LOGMSG}"
		STARS=false
	fi

	if [[ ${STARS} == "true" ]]; then
		local M=""
		M+="\n"
		M+="**********\n"
		M+="${MESSAGE}\n"
		M+="**********\n"
	
		MSG+="${M}${NC}"
		LOGMSG+="${M}"
	fi

	[[ ${LOG_ONLY} == "false" ]] && echo -e "${MSG}${MESSAGE2}"

	# Log messages to a file if it was specified.
	# ${DISPLAY_MSG_LOG} <should> be set if ${LOG_IT} is true, but just in case, check.

	[[ ${LOG_IT} == "false" || -z ${DISPLAY_MSG_LOG} ]] && return
	if [[ ! -f ${DISPLAY_MSG_LOG} ]]; then
		mkdir -p "$( dirname "${DISPLAY_MSG_LOG}" )"
		touch "${DISPLAY_MSG_LOG}"
	fi

	# Assume if GREEN isn't defined then no colors are defined.
	MSG="$(date) ${LOGMSG}${MESSAGE2}"
	if [[ -n ${GREEN} ]]; then
		remove_colors "${MSG}"
	else
		echo "${MSG}"
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

	FILE="${3:-${ALLSKY_SETTINGS_FILE}}"
	TEMP="/tmp/$$"

	if [[ ${DELETE} == "true" ]]; then
		NEW_VALUE="(delete)"	# only used in error message below.
		ACTION="del(${FIELD})"
	else
		NEW_VALUE="${2//\"/\\\"}"
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
		local F=".${ARRAY}[${I}].${FIELD}"
		local V="$( settings "${F}" "${FILE}" )"
		if [[ ${V} != "${NEW_VALUE}" ]]; then
			update_json_file "${F}" "${NEW_VALUE}" "${FILE}"
			if [[ $? -ne 0 ]]; then
				echo "WARNING: Unable to update '${VALUE}' to '${NEW_VALUE} in '${FILE}'." >&2
			fi
		fi
	fi
}


####
# Replace all the ${ALLSKY_NEED_TO_UPDATE} placeholders and
# update mini-timelapse URL.
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

	local RET  PARENT  FIELD  INDEX  MINI_TLAPSE_DISPLAY  MINI_TLAPSE_URL
	local MINI_TLAPSE_DISPLAY_VALUE  MINI_TLAPSE_URL_VALUE

	PARENT="homePage.leftSidebar"
	FIELD="Mini-timelapse"
	INDEX=$( getJSONarrayIndex "${FILE}" "${PARENT}" "${FIELD}" 2>&1 )
	if [[ ${INDEX} -ge 0 ]]; then
		MINI_TLAPSE_DISPLAY="${PARENT}[${INDEX}].display"
		MINI_TLAPSE_URL="${PARENT}[${INDEX}].url"
		TIMELAPSE_MINI_IMAGES="$( settings ".minitimelapsenumimages" )"
		if [[ ${TIMELAPSE_MINI_IMAGES:-0} -eq 0 ]]; then
			MINI_TLAPSE_DISPLAY_VALUE="false"
			MINI_TLAPSE_URL_VALUE=""
		else
			MINI_TLAPSE_DISPLAY_VALUE="true"
			if [[ ${TYPE} == "local" ]]; then
				#shellcheck disable=SC2153
				MINI_TLAPSE_URL_VALUE="/${ALLSKY_MINITIMELAPSE_URL}"
			else
				MINI_TLAPSE_URL_VALUE="${ALLSKY_MINITIMELAPSE_NAME}"
			fi
		fi
	else
		MSG="Unable to update '${FIELD}' in ${FILE}:\n${INDEX}"
		display_msg --log error "${MSG}"
		return 1
	fi

	# For these setting, check if it's == ${ALLSKY_NEED_TO_UPDATE}.
	# If so, and the settings file's value isn't null, update it in the config file.
	# If the config file has a value, use it, even if it's "".

	local TEMP  LATITUDE  LONGITUDE  AURORAMAP  LOCATION  OWNER  CAMERA
	local LENS  COMPUTER  IMAGE_NAME

	LATITUDE="$( settings ".config.latitude" "${FILE}" )"
	if [[ ${LATITUDE} == "${ALLSKY_NEED_TO_UPDATE}" ]]; then
		# Convert latitude and longitude to use N, S, E, W.
		TEMP="$( settings ".latitude" )"
		if [[ -n ${TEMP} ]]; then
			LATITUDE="$( convertLatLong "${TEMP}" "latitude" )"
		fi
	fi
	[[ -z ${LATITUDE} ]] && display_msg --log warning "latitude is empty"

	LONGITUDE="$( settings ".config.longitude" "${FILE}" )"
	if [[ ${LONGITUDE} == "${ALLSKY_NEED_TO_UPDATE}" ]]; then
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
	if [[ ${LOCATION} == "${ALLSKY_NEED_TO_UPDATE}" ]]; then
		TEMP="$( settings ".location" )"
		if [[ -n ${TEMP} ]]; then
			LOCATION="${TEMP}"
		fi
	fi

	OWNER="$( settings ".config.owner" "${FILE}" )"
	if [[ ${OWNER} == "${ALLSKY_NEED_TO_UPDATE}" ]]; then
		TEMP="$( settings ".owner" )"
		if [[ -n ${TEMP} ]]; then
			OWNER="${TEMP}"
		fi
	fi

	CAMERA="$( settings ".config.camera" "${FILE}" )"
	if [[ ${CAMERA} == "${ALLSKY_NEED_TO_UPDATE}" ]]; then
		# TYPE and MODEL are already in the environment.
		CAMERA="${CAMERA_TYPE} ${CAMERA_MODEL}"
	fi

	LENS="$( settings ".config.lens" "${FILE}" )"
	if [[ ${LENS} == "${ALLSKY_NEED_TO_UPDATE}" ]]; then
		TEMP="$( settings ".lens" )"
		if [[ -n ${TEMP} ]]; then
			LENS="${TEMP}"
		fi
	fi

	COMPUTER="$( settings ".config.computer" "${FILE}" )"
	if [[ ${COMPUTER} == "${ALLSKY_NEED_TO_UPDATE}" ]]; then
		TEMP="$( settings ".computer" )"
		if [[ -n ${TEMP} ]]; then
			COMPUTER="${TEMP}"
		fi
	fi

	EQUIPMENT="$( settings ".config.equipmentinfo" "${FILE}" )"
	if [[ ${EQUIPMENT} == "${ALLSKY_NEED_TO_UPDATE}" ]]; then
		TEMP="$( settings ".equipmentinfo" )"
		if [[ -n ${TEMP} ]]; then
			EQUIPMENT="${TEMP}"
		fi
	fi

	if [[ ${TYPE} == "local" ]]; then
		#shellcheck disable=SC2153
		IMAGE_NAME="/${ALLSKY_IMG_DIR}/${ALLSKY_FULL_FILENAME}"
	else
		IMAGE_NAME="${ALLSKY_FULL_FILENAME}"
	fi

	"${ALLSKY_SCRIPTS}/updateJsonFile.sh" --verbosity silent --file "${FILE}" \
		config.imageName			"imageName"			"${IMAGE_NAME}" \
		config.latitude				"latitude"			"${LATITUDE}" \
		config.longitude			"longitude"			"${LONGITUDE}" \
		config.auroraMap			"auroraMap"			"${AURORAMAP}" \
		config.location				"location"			"${LOCATION}" \
		config.owner				"owner" 			"${OWNER}" \
		config.camera				"camera"			"${CAMERA}" \
		config.lens					"lens"				"${LENS}" \
		config.computer				"computer"			"${COMPUTER}" \
		config.equipmentinfo		"equipmentinfo"		"${EQUIPMENT}" \
		"${WEBSITE_ALLSKY_VERSION}"	"AllskyVersion"		"${ALLSKY_VERSION}" \
		"${MINI_TLAPSE_DISPLAY}"	"mini_display"		"${MINI_TLAPSE_DISPLAY_VALUE}" \
		"${MINI_TLAPSE_URL}"		"mini_url"			"${MINI_TLAPSE_URL_VALUE}"
	RET=$?
	if [[ ${RET} -ne 0 ]]; then
		MSG="updateJsonFile.sh failed with RET ${RET}"
		display_msg --logonly info "${MSG}"
		return 1
	fi

	return 0
}


####
# Prepare a local Website:
#	Update the config file by replacing placeholders.
#	Copy data.json.
function prepare_local_website()
{
	local FORCE="${1}"
	local POST_DATA="${2}"
	local MSG=""

	# Make sure there's a config file.
	if [[ ! -s ${ALLSKY_WEBSITE_CONFIGURATION_FILE} || ${FORCE} == "--force" ]]; then
		MSG="Creating default ${ALLSKY_WEBSITE_CONFIGURATION_NAME}."
		display_msg --log progress "${MSG}"
		cp "${REPO_WEBSITE_CONFIGURATION_FILE}" "${ALLSKY_WEBSITE_CONFIGURATION_FILE}"
	fi

	if replace_website_placeholders "local" "${ALLSKY_WEBSITE_CONFIGURATION_FILE}" ; then
		MSG="Replaced placeholders in ${ALLSKY_WEBSITE_CONFIGURATION_NAME}."
		display_msg --logonly progress "${MSG}"
	fi

	if [[ ${POST_DATA} == "postData" && "$( settings ".uselocalwebsite" )" == "true" ]]; then
		# "--from install" tells it to be mostly silent.
		if MSG="$( "${ALLSKY_SCRIPTS}/postData.sh" --from install --allfiles 2>&1 )" ; then
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

# TODO: create a .php file that reads the prior file into an array,
# then reads the repo file into another array, then copies from prior array to repo array,
# deleting / changing as needed.

	FILE="${1}"
	PRIOR_VERSION="${2}"
	CURRENT_VERSION="${3}"

	# Version: 1 from v2023.05.01*
	# Version: 2 from v2024.12.06
	# Version: 3 from v2024.12.06_01
	#	Added "meteors/"
	# Version: 4 from v2024.12.06_03
	#	Added "equipmentinfo" setting
	# Current version: 5 from v2025.xx.xx
	#	Changed "imageName" to "/current/image.jpg" in local config file.
	#		imageName is updated in replace_website_placeholders() so not done here.
	#	timelapse and mini-timelapse icons changed.

	if [[ ${PRIOR_VERSION} -eq 1 ]]; then
		# These steps bring version 1 up to 2.
		# Deletions:
		update_json_file -d ".config.AllskyWebsiteVersion" "" "${FILE}"
		update_json_file -d ".homePage.onPi" "" "${FILE}"
		update_array_field "${FILE}" "homePage.popoutIcons" "variable" "AllskyWebsiteVersion" "--delete"

		# Additions:
		# Add in same place as in repo file.
		local NEW='      \"thumbnailsizex\": 100,\
        \"thumbnailsizey\": 75,\
        \"thumbnailsortorder\": \"ascending\",'
		sed -i "/\"leftSidebar\"/i\ ${NEW}" "${FILE}"

		# Changes:
		for i in "videos" "keograms" "startrails"; do
			update_array_field "${FILE}" "homePage.leftSidebar" "url" "${i}" "${i}/"
		done
	fi

	# Try to determine what future changes are needed,
	# rather than compare version numbers as above.
	if [[ ${PRIOR_VERSION} -lt 3 ]] && ! grep --silent "meteors/" "${FILE}" ; then
		# Add after "startrails/" entry.
		TEMP="/tmp/$$"
		gawk 'BEGIN { found_startrails = 0; }
			{
				print $0;

				if (found_startrails == 1) {
					if ($1 == "},") {
						printf("%12s{\n", " ");
						printf("%16s\"display\": false,\n", " ")
						printf("%16s\"url\": \"meteors/\",\n", " ")
						printf("%16s\"title\": \"Archived Meteors\",\n", " ")
						printf("%16s\"icon\": \"fa fa-2x fa-fw fa-meteor\",\n", " ")
						printf("%16s\"style\": \"\"\n", " ")
						printf("%12s},\n", " ");
	
						while (getline) {
							print $0;
						}
						exit(0);
					}
				} else if ($0 ~ /"startrails\/"/) {
					found_startrails = 1;
				}
			}' "${FILE}" > "${TEMP}"
		if [[ $? -eq 0 ]]; then
			# cp so it keeps ${FILE}'s attributes
			cp "${TEMP}" "${FILE}" && rm -f "${TEMP}"
		fi
	fi

	if [[ ${PRIOR_VERSION} -lt 4 ]] && ! grep --silent '"equipmentinfo"' "${FILE}" ; then
		# Add setting after "computer" entry.
		# Add popoutIcons entry after "Computer" entry (with "fa-microchip").
		TEMP="/tmp/$$"
		local E="$( settings ".equipmentinfo" )"
		gawk -v E="${E}" 'BEGIN {
				found_computer = 0;
				found_microchip = 0;
			}
			{
				print $0;

				if (found_computer == 1) {
					printf("%16s\"equipmentinfo\": \"%s\",\n", " ", E)
					found_computer = 0;
					next;
				}

				if (found_microchip == 1) {
					if ($1 == "},") {
						printf("%12s{\n", " ");
						printf("%16s\"display\": true,\n", " ")
						printf("%16s\"label\": \"Equipment info\",\n", " ")
						printf("%16s\"icon\": \"fa fa-fw fa-keyboard\",\n", " ")
						printf("%16s\"variable\": \"equipmentinfo\",\n", " ")
						printf("%16s\"value\": \"\",\n", " ")
						printf("%16s\"style\": \"\"\n", " ")
						printf("%12s},\n", " ");
	
						while (getline) {
							print $0;
						}
						exit(0);
					}
				} else if ($0 ~ /"computer"/) {
					found_computer = 1;
				} else if ($0 ~ / fa-microchip"/) {
					found_microchip = 1;
				}
			}' "${FILE}" > "${TEMP}"
		if [[ $? -eq 0 ]]; then
			# cp so it keeps ${FILE}'s attributes
			cp "${TEMP}" "${FILE}" && rm -f "${TEMP}"
		fi
	fi

	if [[ ${PRIOR_VERSION} -le 5 ]] ; then	# use -le so testers get updated.
		# Update timelapse icons
		update_array_field "${FILE}" "homePage.leftSidebar" "icon" \
			"fa fa-2x fa-fw fa-play-circle" "fa fa-2x fa-fw fa-video"
		update_array_field "${FILE}" "homePage.leftSidebar" "icon" \
			"fa fa-2x fa-fw icon-mini-timelapse" "fa fa-2x fa-fw fa-file-video"
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
		-e "s;XX_ALLSKY_WEBSERVER_OWNER_XX;${ALLSKY_WEBSERVER_OWNER};g" \
		-e "s;XX_ALLSKY_WEBSERVER_GROUP_XX;${ALLSKY_WEBSERVER_GROUP};g" \
		-e "s;XX_ALLSKY_HOME_XX;${ALLSKY_HOME};g" \
		-e "s;XX_ALLSKY_CURRENT_DIR_XX;${ALLSKY_CURRENT_DIR};g" \
		-e "s;XX_ALLSKY_IMAGES_XX;${ALLSKY_IMAGES};g" \
		-e "s;XX_ALLSKY_CONFIG_XX;${ALLSKY_CONFIG};g" \
		-e "s;XX_ALLSKY_WEBSITE_XX;${ALLSKY_WEBSITE};g" \
		-e "s;XX_ALLSKY_DOCUMENTATION_XX;${ALLSKY_DOCUMENTATION};g" \
		-e "s;XX_ALLSKY_OVERLAY_XX;${ALLSKY_OVERLAY};g" \
		-e "s;XX_ALLSKY_MY_OVERLAY_TEMPLATES_XX;${ALLSKY_MY_OVERLAY_TEMPLATES};g" \
			"${REPO_LIGHTTPD_FILE}"  >  "${TMP}"
	sudo install -m 0644 "${TMP}" "${LIGHTTPD_CONFIG_FILE}" && rm -f "${TMP}"
}

####
# Create the lighttpd log file with permissions so user can update it.
function create_lighttpd_log_file()
{
	display_msg --logonly progress "Creating new ${LIGHTTPD_LOG_FILE}."

	# Remove any old log files.
	# Start off with a 0-length log file the user can write to.
	sudo chmod 755 "${LIGHTTPD_LOG_DIR}"
	sudo rm -fr "${LIGHTTPD_LOG_DIR}"/*
	sudo truncate -s 0 "${LIGHTTPD_LOG_FILE}"
	sudo chmod 664 "${LIGHTTPD_LOG_FILE}"
	sudo chown "${ALLSKY_WEBSERVER_GROUP}:${ALLSKY_GROUP}" "${LIGHTTPD_LOG_FILE}"
}

####
# Determine the RAM size in MB and a suggested swap and tmp size.
# If already determined, just return.
SUGGESTED_SWAP_SIZE=""
SUGGESTED_TMP_SIZE=""
RAM_SIZE=""
function get_ram_tmp_swap()
{
	[[ -n ${RAM_SIZE} ]] && return	# already determined numbers

	RAM_SIZE="$( get_RAM "MB" )"

	declare -A TMP_SIZES=()
	TMP_SIZES["512"]=75
	TMP_SIZES["1024"]=150
	TMP_SIZES["2048"]=200
	TMP_SIZES["4096"]=300
	local TMP_MAX=400
	TMP_SIZES["8192"]=${TMP_MAX}

	SUGGESTED_SWAP_SIZE=0
	SUGGESTED_TMP_SIZE=0
	local DESIRED_SWAP_COMBINATION=$((1024 * 5))	# desired minimum memory + swap in GB
	for i in 512 1024 2048 4096 8192
	do
		if [[ ${RAM_SIZE} -le ${i} ]]; then
			local SWAP=$(( DESIRED_SWAP_COMBINATION - i ))
			if [[ ${SWAP} -gt 0 ]]; then
				SUGGESTED_SWAP_SIZE="${SWAP}"
			fi		# Will be < 0 at 8192 and above.
			SUGGESTED_TMP_SIZE=${TMP_SIZES["${i}"]}
			break
		fi
	done
	if [[ ${SUGGESTED_TMP_SIZE} -eq 0 ]]; then
		SUGGESTED_TMP_SIZE=${TMP_MAX}
	fi
}

####
# Prompt for either a 0 or a positive number.
function get_0_or_positive()
{
	local CURRENT_NUM="${1}"
	local WHAT="${2}"
	local MSG="${3}"

	local NEW_NUM=""
	local ERR_MSG="\nERROR: You must enter a number, either:"
	ERR_MSG+="\n    a '0' to ${WHAT} (NOT RECOMMENDED)"
	ERR_MSG+="\nor"
	ERR_MSG+="\n    a size in MB\n"

	while [[ -z ${NEW_NUM} ]] ; do
		NEW_NUM=$( whiptail --title "${TITLE}" --inputbox "${MSG}\n" 20 "${WT_WIDTH}" \
		 	"${CURRENT_NUM}"  3>&1 1>&2 2>&3 )
		local RET=$?
		if [[ ${RET} -eq 1 ]]; then		# Cancel button
			NEW_NUM="${CURRENT_NUM}"
		elif [[ -z ${NEW_NUM} ]]; then
			MSG="${ERR_MSG}"
		elif ! is_number "${NEW_NUM}" ; then
			MSG="${ERR_MSG}"
			MSG+="\nYou entered: ${NEW_NUM}\n"
			NEW_NUM=""
		elif [[ "${NEW_NUM}" -lt 0 ]]; then
			MSG="${ERR_MSG}"
			MSG+="\nYou entered a negative number: ${NEW_NUM}\n"
			NEW_NUM=""
		fi
		[[ -z ${NEW_NUM} ]] && MSG+="\nTry again.\n"
	done

	# If the suggested number was 0 and the user added a number but didn't
	# first delete the 0, do it now so we don't have numbers like "0256".
	[[ ${NEW_NUM} != "0" && ${NEW_NUM:0:1} == "0" ]] && NEW_NUM="${NEW_NUM:1}"

	echo "${NEW_NUM}"
}

####
# Output a message based on ${FROM}.
function m()
{
	local MSG="${1}"
	local MSG2="${2}"
	local LOG="${3}"
	local LEVEL="${4}"
	local FROM="${5}"

	if [[ ${FROM} == "install" ]]; then
		display_msg "${LOG}" "${LEVEL}" "${MSG}" "${MSG2}"
	else
		if [[ ${LEVEL} == "error" ]]; then
			wE_ "\nERROR: ${MSG}${MSG2}\n"
		elif [[ ${LEVEL} == "warning" ]]; then
			wW_ "\nWARNING: ${MSG}${MSG2}\n"
		elif [[ ${LEVEL} == "progress" ]]; then
			wO_ "\n${MSG}${MSG2}\n"
		else
			echo -e "\n${MSG}${MSG2}\n"
		fi
	fi
}

####
# Called from allsky-config after installation to adjust amount.
function recheck_swap()
{
	check_swap "after_install"  "true"
}

####
# Allow the user to change the amount of swap space used.
function check_swap()
{
	local CALLED_FROM="${1}"
	local PROMPT="${2:-false}"

	# global: TITLE  WT_WIDTH
	local SWAP_CONFIG_FILE="/etc/dphys-swapfile"
	local CURRENT_SWAP  AMT  M  MSG  NEW_SIZE  CURRENT_MAX  CHANGE_SUGGESTED

	if [[ ${CALLED_FROM} == "install" ]]; then
		declare -n v="${FUNCNAME[0]}"; [[ ${v} == "true" && ${PROMPT} == "false" ]] && return
	fi

	[[ -z ${WT_WIDTH} ]] && WT_WIDTH="$( calc_wt_size )"

	get_ram_tmp_swap		# Sets ${RAM_SIZE} and ${SUGGESTED_SWAP_SIZE}
	MSG="RAM_SIZE=${RAM_SIZE}, SUGGESTED_SWAP_SIZE=${SUGGESTED_SWAP_SIZE}."
	# /dev/null so no ouput when not called from installer
	m "${MSG}" "" "--log" "info" "${CALLED_FROM}" > /dev/null

	# With "free -mebi" the displayed swap is often 1 MB less than what's in
	# /etc/dphys-swapfile, I think because "free -mebi" rounds down to an int.
	# Fix by gettting size in kibi (kilo) and divide by 1024 and convert to an int.
	CURRENT_SWAP=$( free --kibi |
			gawk 'BEGIN { swap = 0; }
			{
				if ($1 == "Swap:") {
					swap = $2 / 1024;
					exit 0;
				}
			}
			END { printf("%.f", swap); }'
		)	# in MB

	if [[ ${CURRENT_SWAP} -lt ${SUGGESTED_SWAP_SIZE} || ${PROMPT} == "true" ]]; then
		if [[ ${CURRENT_SWAP} -eq 0 ]]; then
			AMT="no"
		else
			AMT="${CURRENT_SWAP} MB of"
		fi
		MSG="\nYour Pi currently has ${AMT} swap space."
		MSG+="\nBased on your memory size of ${RAM_SIZE} MB,"
		if [[ ${CURRENT_SWAP} -ge ${SUGGESTED_SWAP_SIZE} ]]; then
			CHANGE_SUGGESTED="false"
			SUGGESTED_SWAP_SIZE=${CURRENT_SWAP}
			MSG+=" there is no need to change anything, but you can if you would like."
		else
			CHANGE_SUGGESTED="true"
			MSG+=" the recommended swap size is ${SUGGESTED_SWAP_SIZE} MB."
			MSG+=" which will decrease the chance of timelapse and other failures."
			MSG+="\n\nYou may change the amount of swap space by changing the number below."
		fi

		NEW_SIZE="$( get_0_or_positive "${SUGGESTED_SWAP_SIZE}" "disable swap space" "${MSG}" )"
		if [[ ${NEW_SIZE} -eq 0 ]]; then
			if [[ ${CHANGE_SUGGESTED} == "true" && ${SUGGESTED_SWAP_SIZE} -gt 0 ]]; then
				MSG="With no swap space you run the risk of programs failing."
				m "${MSG}" "" "--log" "warning" "${CALLED_FROM}"
			fi

			if [[ ${CURRENT_SWAP} -gt 0 ]]; then
				MSG="Swap space disabled."
				m "${MSG}" "" "--log" "progress" "${CALLED_FROM}"

				sudo dphys-swapfile swapoff				# Stop using swap file
				sudo dphys-swapfile uninstall			# Remove the swap file
				sudo sed -i "/CONF_SWAPSIZE=/ c CONF_SWAPSIZE=${NEW_SIZE}" "${SWAP_CONFIG_FILE}"
			else
				MSG="Swap space remaining disabled."
				m "${MSG}" "" "--logonly" "info" "${CALLED_FROM}"
			fi
		elif [[ ${NEW_SIZE} -eq ${CURRENT_SWAP} && ${CHANGE_SUGGESTED} == "false" ]]; then
			# User didn't change, and CURRENT_SWAP is sufficient.
			MSG="Swap size will remain at ${CURRENT_SWAP} MB."
			m "${MSG}" "" "--log" "progress" "${CALLED_FROM}"
		else
			MSG="Swap size set to ${NEW_SIZE} MB."
			m "${MSG}" "" "--log" "progress" "${CALLED_FROM}"

			sudo dphys-swapfile swapoff					# Stop using swap file
			sudo sed -i "/CONF_SWAPSIZE=/ c CONF_SWAPSIZE=${NEW_SIZE}" "${SWAP_CONFIG_FILE}"

			# If NEW_SIZE is greater than the current max, increase the max.
			CURRENT_MAX="$( get_variable "CONF_MAXSWAP" "${SWAP_CONFIG_FILE}" )"
			# TODO: Can we determine the default max rather than hard-code it?
			CURRENT_MAX="${CURRENT_MAX:-2048}"
			if [[ ${CURRENT_MAX} -lt ${NEW_SIZE} ]]; then
				if [[ ${DEBUG} -gt 0 ]]; then
					MSG="Max swap size increased to ${NEW_SIZE} MB."
					m "${MSG}" "" "--logonly" "debug" "${CALLED_FROM}"
				fi
				sudo sed -i "/CONF_MAXSWAP/ c CONF_MAXSWAP=${NEW_SIZE}" "${SWAP_CONFIG_FILE}"
			fi

			sudo dphys-swapfile setup  > /dev/null		# Set up new swap file
			sudo dphys-swapfile swapon					# Turn on new swap file
		fi
	else
		MSG="Size of current swap (${CURRENT_SWAP} MB) is sufficient; no change needed."
		m "${MSG}" "" "--logonly" "info" "${CALLED_FROM}"
	fi

	if [[ ${CALLED_FROM} == "install" ]]; then
		STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")
	fi
}


####
# Is the specified directory mounted?
function is_mounted()
{
	local TMP="${1}"

	grep --quiet "${TMP}" "/proc/mounts"
}

####
# Mount the specified directory.
function mount_dir()
{
	local DIR="${1}"
	local FROM="${2}"

	local ERR_MSG
	if ! ERR_MSG="$( sudo mount "${DIR}" )" ; then
		local MSG="Unable to mount '${DIR}': ${ERR_MSG}."
		m "${MSG}" "" "--log" "warning" "${FROM}"
	fi
}

####
# Unmount the specified directory.
function umount_dir()
{
	local DIR="${1}"
	local FROM="${2}"

	# Make sure we're not anywhere in ${DIR} - that can cause the umount to fail.
	# shellcheck disable=SC2103,SC2164
	cd / 2>/dev/null

	local RET=0
	sudo umount --force "${DIR}" 2> /dev/null ||
		{
			# The Samba daemon is one known cause of "target busy".
			sudo systemctl restart smbd 2> /dev/null

			if ! sudo umount --lazy "${DIR}" 2> /dev/null ; then
				RET=1
				local WHO="$( lsof "${DIR}" )"		# lists open files on ${DIR}
				if [[ -n ${WHO} ]]; then
					local ERR_MSG="Unable to unmount '${DIR}'"
					m "${ERR_MSG}" "${WHO}" "--logonly" "info" "${FROM}"
				fi
			fi
		}

	if [[ ${OLDPWD} == "${DIR}" ]]; then
		MSG="WARNING: You are in the '${DIR}' directory;"
		local MSG2=" run 'cd ${OLDPWD}'"
		m "${MSG}" "${MSG2}" "--log" "warning" "${FROM}"
	fi
	# shellcheck disable=SC2103,SC2164
	cd "${OLDPWD}" 2>/dev/null

	return "${RET}"
}


####
# Save important files in ${ALLSKY_TMP}.
TMP_DIR_="/tmp/IMAGES"
function save_tmp()
{
	if [[ -d "${ALLSKY_TMP}" ]]; then
		mkdir -p "${TMP_DIR_}"
		find "${ALLSKY_TMP}" -maxdepth 1 \! \
			\( -wholename "${ALLSKY_TMP}" -o -name '*.jpg' -o -name '*.png' \) \
			 -exec mv '{}' "${TMP_DIR_}" \;
		rm -fr "${ALLSKY_TMP:?}"/*
	else
		mkdir "${ALLSKY_TMP}"
	fi
}
# And restore the files
function restore_tmp()
{
	[[ ! -d ${TMP_DIR_} ]] && return
	find "${TMP_DIR_}" -maxdepth 1 \! -wholename "${TMP_DIR_}" -exec mv '{}' "${ALLSKY_TMP}" \;
	rmdir "${TMP_DIR_}" 2>/dev/null
}

####
# Check if ${ALLSKY_TMP} exists, and if it does,
# save any *.jpg files (which we probably created), then remove everything else,
# then mount it.
function check_and_mount_tmp()
{
	local FROM="${1:-install}"

	save_tmp

	is_mounted "${ALLSKY_TMP}" && umount_dir "${ALLSKY_TMP}" "${FROM}"

	# Now mount and restore any images that were there before
	sudo systemctl daemon-reload 2> /dev/null
	mount_dir "${ALLSKY_TMP}" "${FROM}"

	restore_tmp
}

####
# Called from allsky-config after installation to adjust amount.
function recheck_tmp()
{
	check_tmp "after_install" "true"
}

####
# Check if ${ALLSKY_TMP} is a memory filesystem.
# If not, offer to make it one.
function check_tmp()
{
	local CALLED_FROM="${1}"
# TODO: default to "false" so we don't prompt during installation
	local PROMPT="${2:-true}"

	# global: TITLE  WT_WIDTH
	local CURRENT_STRING  STRING  MSG  D  SIZE  NEW_SIZE  ERR_MSG
	local FSTAB="/etc/fstab"

	if [[ ${CALLED_FROM} == "install" ]]; then
		declare -n v="${FUNCNAME[0]}"; [[ ${v} == "true" ]] && return
	fi

	[[ -z ${WT_WIDTH} ]] && WT_WIDTH="$( calc_wt_size )"

	# If ${ALLSKY_TMP} is a memory filesystem it will have an entry in ${FSTAB},
	# even if it's not currently mounted.
	if CURRENT_STRING="$( grep " ${ALLSKY_TMP} " "${FSTAB}" )" ; then
		if [[ ${CALLED_FROM} == "install" ]]; then
			# During installation, don't give the user the option of changing.
			# They can do it afterwards via "allsky-config".
# TODO: set to new, larger size if not already there.
			MSG="${ALLSKY_TMP} is currently a memory filesystem; no change needed."
			display_msg --logonly info "${MSG}"

			# If there's a prior Allsky version and its tmp directory is mounted,
			# try to unmount it, but that often gives an error that it's busy,
			# which isn't a problem since it'll be unmounted at the next reboot.
			# We know from the grep above that ${FSTAB} has ${ALLSKY_TMP}
			# but the mount point is currently in the PRIOR Allsky.
			D="${ALLSKY_PRIOR_DIR}/tmp"
			if [[ -d "${D}" ]] && is_mounted "${D}" ; then
				if ! umount_dir "${D}" "${CALLED_FROM}" ; then
					set_reboot_needed		# Will force the unmount
				fi
			fi

			STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")

			# If the new Allsky's ${ALLSKY_TMP} is already mounted, don't do anything.
			# This would be the case during an upgrade.
			if is_mounted "${ALLSKY_TMP}" ; then
				display_msg --logonly info "${ALLSKY_TMP} already mounted."
				return 0
			fi

			check_and_mount_tmp "${CALLED_FROM}"		# works on new ${ALLSKY_TMP}
			return 0
		fi
	fi

	get_ram_tmp_swap		# Sets ${RAM_SIZE} and ${SUGGESTED_TMP_SIZE}

	if [[ -n ${CURRENT_STRING} ]]; then
		if [[ ${PROMPT} != "true" ]]; then
			if [[ ${CALLED_FROM} == "install" ]]; then
				STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")
			fi
			return 0	# Not prompting, so leave as is.
		fi
		SIZE="$( echo "${CURRENT_STRING}" | sed -e "s;^.* size=;;" -e "s;M.*;;" )"
	else
		SIZE=${SUGGESTED_TMP_SIZE}
	fi

	if [[ ${PROMPT} == "true" ]]; then
		if [[ -n ${CURRENT_STRING} ]]; then
			MSG="\nThe ${ALLSKY_TMP} directory is already in memory.\n"
			MSG+="\nYou can:"
			MSG+="\n    adjust the size in MB,"
			MSG+="\nor"
			MSG+="\n    set to '0' to remove it from memory (NOT RECOMMENDED)."
			if [[ ${SIZE} != "${SUGGESTED_TMP_SIZE}" ]]; then
				MSG+="\n\nThe recommended size for your Pi is ${SUGGESTED_TMP_SIZE} MB."
			fi
		else
			MSG="Putting the ${ALLSKY_TMP} directory into memory drastically"
			MSG+=" decreases the number of writes to the SD card, increasing its life."
			MSG+=" It also speeds up processing."
			MSG+="\n\nIf you want to do this, either leave the default MB below or adjust it."
			MSG+="\nIf you do NOT want to do this, set the size to 0."
			MSG+="\n\nNote: anything in that directory will be deleted whenever the Pi is rebooted,"
			MSG+=" but that's not an issue since the directory only contains temporary files."
		fi

		NEW_SIZE="$( get_0_or_positive "${SIZE}" "remove ${ALLSKY_TMP} from memory" "${MSG}" )"
	else
		NEW_SIZE="${SIZE}"	# Not prompting, so go with default size
	fi

	local QUIT="false"
	if [[ -n ${CURRENT_STRING} ]]; then
		if [[ ${NEW_SIZE} -eq ${SIZE} ]]; then
			MSG="No changes to the size of '${ALLSKY_TMP}' made."
			QUIT="true"
		fi
	elif [[ ${NEW_SIZE} -eq 0 ]]; then
		MSG="The ${ALLSKY_TMP} directory will remain on the SD card."
		QUIT="true"
	fi
	if [[ ${QUIT} == "true" ]]; then
		m "${MSG}" "" "--log" "info" "${CALLED_FROM}"
		if [[ ${CALLED_FROM} == "install" ]]; then
			STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")
		fi
		return 0
	fi

	# Allsky isn't running when called from the installer.
	[[ ${NEW_SIZE} -ge 0 && ${CALLED_FROM} != "install" ]] && stop_Allsky

	if [[ ${NEW_SIZE} -gt 0 ]]; then
		STRING="tmpfs ${ALLSKY_TMP} tmpfs size=${NEW_SIZE}M,noatime,lazytime,nodev,"
		STRING+="nosuid,mode=775,uid=${ALLSKY_OWNER},gid=${ALLSKY_WEBSERVER_GROUP}"

		if [[ -n ${CURRENT_STRING} ]]; then
			if ! sudo sed -i -e "s;${CURRENT_STRING};${STRING};" ${FSTAB} ; then
				MSG="Unable to update ${FSTAB}."
				m "${MSG}" "" "--log" "error" "${CALLED_FROM}"
				return 1
			fi
		else
			if ! echo "${STRING}" | sudo tee -a ${FSTAB} > /dev/null ; then
				MSG="Unable to add to ${FSTAB}."
				m "${MSG}" "" "--log" "error" "${CALLED_FROM}"
				return 1
			fi
		fi

		check_and_mount_tmp "${CALLED_FROM}"

		MSG="${ALLSKY_TMP} is now in memory, size=${NEW_SIZE} MB."
		if [[ ${CALLED_FROM} == "install" ]]; then
			display_msg --log progress "${MSG}"
		else
			if [[ -n ${CURRENT_STRING} ]]; then
				wO_ "\n${ALLSKY_TMP} is now ${NEW_SIZE} MB.\n"
			else
				wO_ "\n${MSG}\n"
			fi

			start_Allsky
		fi

	else	# is 0, i.e., do not put in memory
		if [[ -n ${CURRENT_STRING} ]]; then
			if ! sudo sed -i -e "\;${CURRENT_STRING};d" ${FSTAB} ; then
				MSG="Unable to remove '${ALLSKY_TMP}' from ${FSTAB}"
				m "${MSG}" "" "--log" "error" "${CALLED_FROM}"
				return 1
			fi
		fi

		if is_mounted "${ALLSKY_TMP}" ; then
			save_tmp
			umount_dir "${ALLSKY_TMP}" "${CALLED_FROM}"

			# in case it wasn't already
			chmod 775 "${ALLSKY_TMP}"
			sudo chgrp "${ALLSKY_WEBSERVER_GROUP}" "${ALLSKY_TMP}"

			restore_tmp
		fi

		if [[ ${CALLED_FROM} == "install" ]]; then
			MSG="The ${ALLSKY_TMP} directory and its contents will remain on the SD card."
			display_msg --log info "${MSG}"
		else
			start_Allsky
			MSG="\n${ALLSKY_TMP} is no longer in memory.\n"
			wO_ "${MSG}"
		fi
	fi

	if [[ ${CALLED_FROM} == "install" ]]; then
		STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")
	fi

	return 0
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
			update_json_file ".${SETTING_NAME}" "${VALUE}" "${ALLSKY_SETTINGS_FILE}"
			display_msg --log progress "${WEBUI_SETTING_LABEL} set to ${VALUE}."
			echo "${VALUE}"
			return

		else
			ERROR_MSG="${VALUE}\n\n"
		fi
	done
}

####
# Try to automatically determine the latitude and longitude.
# If we can't, prompt for them.
function get_lat_long()
{
	# Global: ALLSKY_SETTINGS_FILE
	local MSG  LATITUDE  LAT  LONGITUDE  LON  RAW_LOCATION  MY_LOCATION_PARTS  ERR  X

	if [[ ! -f ${ALLSKY_SETTINGS_FILE} ]]; then
		display_msg --log error "INTERNAL ERROR: '${ALLSKY_SETTINGS_FILE}' not found!"
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
# Return the amount of RAM in the units specified (either MB or GB).
function get_RAM()
{
	local UNITS="${1:-GB}"
	local RAM

	function parse_RAM()
	{
		local SKIP_HEADER
		if [[ ${1} == "--skip-header" ]]; then
			SKIP_HEADER="true"
			shift
		else
			SKIP_HEADER="false"
		fi
		local UNITS="${1}"
		
		gawk -v UNITS="${UNITS}" -v SKIP_HEADER="${SKIP_HEADER}" '
			{
				if (NR == 1 && SKIP_HEADER == "true") {
					next;		# skip header line
				}

				if ($0 ~ /unknown/) {
					printf("unknown");
					exit 0;
				}

				amt = $2;		# in MB
				if (UNITS == "MB") {
					printf("%d", amt);
				} else if (amt < 1024) {
					printf("%.1f", amt / 1024);
				} else {
					printf("%d", amt / 1024);
				}
				exit 0;
			}'
	}

	# vcgencmd doesn't exist on many non-Pi computers;
	if type vcgencmd >/dev/null 2>&1 ; then
		# vcgencmd can return "total_mem is unknown" if the OS is REALLY old.
		# Input example: total_mem=4096
		# Pi's have either 0.5 GB or an integer number of GB.
		RAM="$( sudo vcgencmd get_config total_mem | sed 's/=/ /' | parse_RAM "${UNITS}" )"
		if [[ ${RAM} != "unknown" ]]; then
			echo "${RAM}"
			return
		fi
	fi

	# Try a different way.
	# Note: This doesn't produce exact results.  On a 4 GB Pi, it returns 3.74805.
	free --mebi | parse_RAM --skip-header "${UNITS}"
}


####
# Return the "computer" - the Pi model and amount of memory in GB
function get_computer()
{
	local PI_MODEL_ONLY="false"
	if [[ ${1} == "--pi-model-only" ]]; then
		PI_MODEL_ONLY="true"
		shift
	fi
	# The file has a NULL at the end so to avoid a bash warning, ignore it.
	# Contents example:
	#	Raspberry Pi 5 Model B Rev 1.0p
	local MODEL="$( tr --delete '\0' < /sys/firmware/devicetree/base/model )"

	if [[ ${PI_MODEL_ONLY} == "true" ]]; then
		echo "${MODEL}" | gawk '{ printf("%s", $3); }'
	else
		local GB="$( get_RAM "GB" )"
		echo "${MODEL/Raspberry Pi/RPi}, ${GB} GB"
	fi
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

		{
			# Add important image files.
			echo loading.jpg
			echo allsky-logo.png
			echo NoThumbnail.png
			echo allsky-favicon.png

			# Get all non-image files except for the ones the user creates/updates.
			find . -type f '!' '(' -name '*.jpg' -or -name '*.png' -or -name '*.mp4' ')' |
				sed 's;^./;;' |
				grep -E -v "myFiles/|${ALLSKY_WEBSITE_CONFIGURATION_NAME}|$( basename "${ALLSKY_WEBSITE_CHECKSUM_FILE}" )"
		} | "${ALLSKY_UTILITIES}/getChecksum.php"
	)
}


####
# Update the specified file with the specified new value.
# ${V_} must be a legal shell variable name.
# Use V_ and VAL_ in case the caller uses V or VAL
function doV()
{
	local oldV="${1}"			# Optional name of old variable; if "" then use ${V_}.
	local V_="${2}"				# name of the variable that holds the new value
	local VAL_="${!V_}"			# value of the variable
	local jV="${3}"				# new json variable name
	local TYPE="${4}"
	local FILE="${5}"
	local HIDE="${6:-show}"		# "hide" to hide value in log file

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
		[[ ${HIDE} == "hide" ]] && MSG="${MSG/${VAL_}/<HIDDEN>}"
		display_msg --logonly info "${MSG}"
	else
		[[ ${HIDE} == "hide" ]] && ERR="${ERR/${VAL_}/<HIDDEN>}"
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
	local FROM="${3}"

	if [[ ${FROM} != "install" ]]; then
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
		if [[ ${FROM} == "install" ]]; then
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

# Return the locales installed on the computer.
# Ignore any lines with ":" which are usually error messages.
INSTALLED_LOCALES=""
function get_installed_locales()
{
	[[ -n ${INSTALLED_LOCALES} ]] && return

	INSTALLED_LOCALES="$( locale -a 2>/dev/null | grep -E -v "^C$|:" | sed 's/utf8/UTF-8/' )"
}
function list_installed_locales()
{
	[[ -z ${INSTALLED_LOCALES} ]] && get_installed_locales

	echo "${INSTALLED_LOCALES}"
}
function is_installed_locale()
{
	local CHECK_LOCALE="${1}"

	[[ -z ${INSTALLED_LOCALES} ]] && get_installed_locales

	# Return exit code of "grep"
	echo "${INSTALLED_LOCALES}" | grep --silent -i "^${CHECK_LOCALE}$";
}
function is_valid_locale()
{
	local CHECK_LOCALE="${1}"

	[[ -z ${INSTALLED_LOCALES} ]] && get_installed_locales

	# Only look for base of locale - anything before the ".".
	[[ -f "/usr/share/i18n/locales/${CHECK_LOCALE/.*}" ]]		# Returns $?
}


#########
# Functions for interacting with a dialog box.

#####
# Get the usable screen for the "dialog" command.
function calc_d_sizes()
{
	# Globals: DIALOG_WIDTH, DIALOG_HEIGHT

	DIALOG_WIDTH=$( tput cols )
	(( DIALOG_WIDTH -= 10 ))

	DIALOG_HEIGHT=$( tput lines )
	(( DIALOG_HEIGHT -= 4 ))
}

####
# Prompt the user to enter (y)/(yes) or (n)/(no).
# This function is only used when running in text (--text) mode.
function enter_yes_no()
{
	local TEXT="${1}"
	local RET=1
	local ANSWER

	if [[ ${AUTO_CONFIRM} == "true" ]]; then
		return 0
	fi

	while true; do
		echo -e "${TEXT}"
		read -r -p "Do you want to continue? (y/n): " ANSWER
		ANSWER="${ANSWER,,}"	# convert to lowercase

		if [[ ${ANSWER} == "y" || ${ANSWER} == "yes" ]]; then
			return 0
		elif [[ ${ANSWER} == "n" || ${ANSWER} == "no" ]]; then
			return 1
		else
			E_ "\nInvalid response. Please enter y/yes or n/no."
		fi
	done

	return "${RET}"
}

# prompt the user to press any key.
# This function is only used when running in text (--text) mode.
function press_any_key()
{
	if [[ ${AUTO_CONFIRM} == "false" ]]; then
		echo -e "${1}\n\nPress any key to continue..."
		read -r -n1 -s
	fi
}


# Displays the specified type of Dialog, or in text mode just displays the text.
# ${1} - The box type
# ${2} - The title for the dialog
# ${3} - The text to disply in the dialog
# ${4} - Optional additional arguments to dialog
#
# Return - 1 if the user selected "No"; 0 otherwise
function display_box()
{
	local DIALOG_TYPE="${1}"
	local DIALOG_TITLE="${2}"
	local DIALOG_TEXT="${3}"
	local MORE_ARGS="${4}"

	if [[ ${TEXT_ONLY} == "true" ]]; then
		local RET=0
		if [[ ${DIALOG_TYPE} == "--msgbox" ]]; then
			press_any_key "${DIALOG_TEXT}"
		elif [[ ${DIALOG_TYPE} == "--yesno" ]]; then
			enter_yes_no "${DIALOG_TEXT}"
			RET=$?
		elif [[ ${DIALOG_TYPE} == "--inputbox" ]]; then
			# Need prompts to go to stderr since stdout is likely
			# being stored in a variable so the user won't see it.
			echo -en "${DIALOG_TEXT} "
			read -r x
			if [[ -z ${x} ]]; then
				return 1
			else
				echo -e "${x}" >&2
				return 0
			fi
		else
			echo -e "${DIALOG_TEXT}"
		fi
		return "${RET}"
	fi

	# shellcheck disable=SC2086
	dialog \
		--colors \
		--title "${DIALOG_TITLE}" \
		${MORE_ARGS} \
		"${DIALOG_TYPE}" "${DIALOG_TEXT}" ${DIALOG_HEIGHT} ${DIALOG_WIDTH}
	return $?
}

# Displays a file Dialog, or in text mode just displays the file.
# ${1} - The title for the dialog
# ${2} - The filename to display
#
# Returns - Nothing
function display_file()
{
	local DIALOG_TITLE="${1}"
	local FILENAME="${2}"

	if [[ ${TEXT_ONLY} == "true" ]]; then
		cat "${FILENAME}"
		return
	fi

	dialog \
		--clear \
		--colors \
		--title "${DIALOG_TITLE}" \
		--textbox "${FILENAME}" 22 77
}

####
# Create the variables.json file based on variables.sh.
# Source in the two files where variables we care about are defined.
# Look for variables that begin with "ALLSKY_" and "EXIT_" (exit codes).
create_variables_json()
{
	local CALLED_FROM="${1}"

	if [[ ${CALLED_FROM} == "install" ]]; then
		declare -n v="${FUNCNAME[0]}"; [[ ${v} == "true" ]] && return
		display_msg --logonly info "Creating '${ALLSKY_VARIABLES_JSON_FILE}."
	fi

	{
		echo "{"
		(
			# "env -i" clears the environment.
			env -i bash -c "export ALLSKY_HOME='${ALLSKY_HOME}'; \
				source '${ALLSKY_HOME}/variables.sh' --force; \
				source '${ALLSKY_SCRIPTS}/installUpgradeFunctions.sh'; \
			   	env"
		) | grep -E '^ALLSKY_|^EXIT_' |
			sort |
			sed -e 's/^/    "/' -e 's/=/" : "/' -e 's/$/",/' -e 's/"true",$/true,/' -e 's/"false",$/false,/'
			# TODO: Remove quotes from around numbers and floats (with "." for decimal point).

		# Add "special cases"
		echo "    \"HOME\" : \"${HOME}\""

		echo "}"
	} > "${ALLSKY_VARIABLES_JSON_FILE}"

	if [[ ${CALLED_FROM} == "install" ]]; then
		STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")
	fi
}

