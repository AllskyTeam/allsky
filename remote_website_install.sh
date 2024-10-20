#!/bin/bash

# shellcheck disable=SC2317

# Install or upgrade a remote Allsky Website.

# shellcheck disable=SC2155
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )" )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/installUpgradeFunctions.sh"	|| exit "${EXIT_ERROR_STOP}"

# display_msg() sends log entries to this file.
# shellcheck disable=SC2034
DISPLAY_MSG_LOG="${ALLSKY_LOGS}/${ME/.sh/}.log"

# Config variables
HAVE_NEW_CONFIG="false"
HAVE_OLD_CONFIG="false"
HAVE_NEW_REMOTE_CONFIG="false"
HAVE_REALLY_OLD_REMOTE_CONFIG="false"
CONFIG_TO_USE=""
CONFIG_MESSAGE=""

# Dialog size variables
DIALOG_WIDTH=70
DIALOG_HEIGHT=25

# Remote connectivity variables
REMOTE_URL="$( settings ".remotewebsiteurl" "${SETTINGS_FILE}" )"
REMOTE_USER="$( settings ".REMOTEWEBSITE_USER" "${ALLSKY_ENV}" )"
REMOTE_HOST="$( settings ".REMOTEWEBSITE_HOST" "${ALLSKY_ENV}" )"
REMOTE_PORT="$( settings ".REMOTEWEBSITE_PORT" "${ALLSKY_ENV}" )"
REMOTE_PASSWORD="$( settings ".REMOTEWEBSITE_PASSWORD" "${ALLSKY_ENV}" )"
REMOTE_DIR="$( settings ".remotewebsiteimagedir" "${SETTINGS_FILE}" )"
REMOTE_PROTOCOL="$( settings ".remotewebsiteprotocol" )"
WEBSITE_EXISTS="false"

# Titles for various dialogs
DIALOG_BACK_TITLE="Allsky Remote Website Installer"
DIALOG_WELCOME_TITLE="Allsky Remote Website Installer"
DIALOG_PRE_CHECK="Pre Installation Checks"
DIALOG_INSTALL="Installing Remote Website"
DIALOG_TITLE_LOG="Allsky Remote Website Installation Log"

# Old Allksy Website files that should be remoevd if they exist
OLD_FILES_TO_REMOVE=("config.js" "configuration.json" "virtualsky.json" "README.md" "myImages")

############################################## functions

# Prompt the user to enter (y)/(yes) or (n)/(no).
# This function is only used when running in text (--text) mode.
function enter_yes_no()
{
	local TEXT="${1}"
	local RESULT=1
	local ANSWER

	while true; do
		echo -e "${TEXT}"
		read -r -p "Do you want to continue? (y/n): " ANSWER
		ANSWER="${ANSWER,,}"	# convert to lowercase

		if [[ ${ANSWER} == "y" || ${ANSWER} == "yes" ]]; then
			return 0
		elif [[ ${ANSWER} == "n" || ${ANSWER} == "no" ]]; then
			return 1
		else
			echo -e "\nInvalid response. Please enter y/yes or n/no."
		fi
	done

	return ${RESULT}
}

# prompt the user to press any key.
# This function is only used when running in text (--text) mode.
function press_any_key()
{
	echo -e "${1}\nPress any key to continue..."
	read -r -n1 -s
}

# Adds the remote Website URL to the dialog text.

# TODO FIX: Eric thinks seeing the remote URL confusing.

function add_dialog_heading()
{
	local DIALOG_TEXT="${1}"
	if [[ ${TEXT_ONLY} == "true" ]]; then
		DIALOG_RED="${RED}"
		DIALOG_NORMAL="${NC}"
	fi

	local PADDING=$(( ((DIALOG_WIDTH-6) - ${#REMOTE_URL}) / 2 ))
	local URL=$(printf "%${PADDING}s%s" "" "${REMOTE_URL}")
	
	echo -e "\n${DIALOG_RED}${URL}${DIALOG_NORMAL}\n${DIALOG_TEXT}"
}

# Displays the specified type of Dialog, or in text mode just displays the text.
# ${1} - The box type
# ${2} - The backtitle for the dialog
# ${3} - The title for the dialog
# ${4} - The text to disply in the dialog
# ${5} - Optional additional arguments to dialog
#
# Return - 1 if the user selected "No"; 0 otherwise
function display_box()
{
	local DIALOG_TYPE="${1}"
	local DIALOG_TEXT="${4}"

	DIALOG_TEXT="$( add_dialog_heading "${DIALOG_TEXT}" )"
	if [[ ${TEXT_ONLY} == "true" ]]; then
		local RET=0
		if [[ ${DIALOG_TYPE} == "--msgbox" ]]; then
			press_any_key "${DIALOG_TEXT}"
		elif [[ ${DIALOG_TYPE} == "--yesno" ]]; then
			enter_yes_no "${DIALOG_TEXT}"
			RET=$?
		else
			echo -e "${DIALOG_TEXT}"
		fi
		return ${RET}
	fi

	local BACK_TITLE="${2}"
	local DIALOG_TITLE="${3}"
	local MORE_ARGS="${5}"
	# shellcheck disable=SC2086
	dialog \
		--colors \
		--backtitle "${BACK_TITLE}" \
		--title "${DIALOG_TITLE}" \
		${MORE_ARGS} \
		"${DIALOG_TYPE}" "${DIALOG_TEXT}" ${DIALOG_HEIGHT} ${DIALOG_WIDTH}
	return $?
}

function display_info_box()
{
	display_box "--infobox" "${1}" "${2}" "${3}"
}

function display_prompt_dialog()
{
	display_box "--yesno" "${1}" "${2}" "${3}"
	# Returns - The exit code (0 - Yes, >0 No)
}

# Displays a file Dialog, or in text mode just displays the file.
# ${1} - The backtitle for the dialog
# ${2} - The title for the dialog
# ${3} - The filename to display
#
# Returns - Nothing
function display_log_file()
{
	local FILENAME="${3}"

	if [[ ${TEXT_ONLY} == "true" ]]; then
		cat "${FILENAME}"
		return
	fi

	local BACK_TITLE="${1}"
	local DIALOG_TITLE="${2}"
	dialog \
		--clear\
		--colors\
		--backtitle "${BACK_TITLE}"\
		--title "${DIALOG_TITLE}"\
		--textbox "${FILENAME}" 22 77
}

# Runs the pre installation checks. This function will determine the following:
# - Is there a remote Website
# - Which configuration file to use for the remote Website
#
# The configuration file to use is decided using the following, in order:
#
# If there is a remote-configuration.json in the /config folder then use it.
# If there is a remote-configuration.json in the allsky-OLD/config folder then use it.
# Otherwise:
# If there is a remote Website with a configuration.json file then save it in /config.
# If there is a remote Website and it has an old configuration file (config.js) then
# create a new remote-configuration.json in /config.
function pre_install_checks()
{
	local MSG=""
	local DIALOG_TEXT="\nRunning pre installation checks."
	DIALOG_TEXT+="\n\nPlease wait as this can take a few minutes to complete.\n\n"

	DIALOG_TEXT+="\n1 - Checking for local files"
	display_info_box "${DIALOG_BACK_TITLE}" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"
	display_msg --logonly progress "Start pre installation checks."

	if [[ -f ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE} ]]; then
		MSG="Found current remote configuration file: ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}."
		display_msg --logonly info "${MSG}"
		HAVE_NEW_CONFIG="true"
	fi

	if [[ -f ${PRIOR_REMOTE_WEBSITE_CONFIGURATION_FILE} ]]; then
		MSG="Found -OLD configuration file: ${PRIOR_REMOTE_WEBSITE_CONFIGURATION_FILE}."
		display_msg --logonly info "${MSG}"
		HAVE_OLD_CONFIG="true"
	fi

	DIALOG_TEXT+="\n2 - Checking if remote Website exists"
	display_info_box "${DIALOG_BACK_TITLE}" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"

	check_if_website_exists		# Sets ${WEBSITE_EXISTS}
	if [[ ${WEBSITE_EXISTS} == "true" ]]; then
		DIALOG_TEXT+="\n3 - Checking for remote Website configuration file"
		display_info_box "${DIALOG_BACK_TITLE}" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"
		local NEW_CONFIG_FILES=("configuration.json")
		if check_if_files_exist "${REMOTE_URL}" "false" "${NEW_CONFIG_FILES[@]}" ; then
			HAVE_NEW_REMOTE_CONFIG="true"
			MSG="Found current configuration file on the remote server."
			display_msg --logonly info "${MSG}"
		fi

		DIALOG_TEXT+="\n4 - Checking for old-style remote Website configuration file"
		display_info_box "${DIALOG_BACK_TITLE}" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"
		local REALLY_OLD_CONFIG_FILES=("config.js")
		if check_if_files_exist "${REMOTE_URL}" "false" "${REALLY_OLD_CONFIG_FILES[@]}" ; then
			HAVE_REALLY_OLD_REMOTE_CONFIG="true"
			MSG="Found old-format config.js file on the remote Website."
			display_msg --logonly info "${MSG}"
		fi
	fi

	if [[ ${HAVE_NEW_CONFIG} == "true" ]]; then
		MSG="Using the local remote configuration file"
		if [[ ${HAVE_NEW_REMOTE_CONFIG} == "true" ]]; then
			MSG+=", a remote configuration file was found but using the local version instead"
		fi
		display_msg --logonly info "${MSG}."
		CONFIG_TO_USE="current"
		CONFIG_MESSAGE="the current remote"

	elif [[ ${HAVE_OLD_CONFIG} == "true" ]]; then
		MSG="Using the -OLD configuration file; placeholders will be updated."
		display_msg --logonly info "${MSG}"
		CONFIG_TO_USE="old"
		CONFIG_MESSAGE="the $( basename "${PRIOR_ALLSKY_DIR}" )"

	elif [[ ${WEBSITE_EXISTS} == "true" ]]; then
		if [[ ${HAVE_NEW_REMOTE_CONFIG} == "true" ]]; then
			MSG="Using new format Website configuration file on the remote Website;"
			MSG+=" it will be downloaded and saved locally."
			display_msg --logonly info "${MSG}"
			CONFIG_TO_USE="remotenew"
			CONFIG_MESSAGE="the remote Website's"
		else
			if [[ ${HAVE_REALLY_OLD_REMOTE_CONFIG} == "true" ]]; then
				MSG="Old config.js found."
				MSG+=" Creating a new configuration file that the user must manually update."
				display_msg --logonly info "${MSG}"
				CONFIG_TO_USE="remotereallyold"
				CONFIG_MESSAGE="a new"
			fi
		fi
	fi

	if [[ -z ${CONFIG_TO_USE} ]]; then
		MSG="Unable to determine the configuration file to use. A new one will be created."
		display_msg --logonly info "${MSG}"
		CONFIG_TO_USE="new"
	fi

	check_connectivity

	display_msg --logonly info "Completed pre installation checks."

	# Prompt the user to continue.  This is so they can see the above messages.
	DIALOG_TEXT+="\n\n\n${DIALOG_UNDERLINE}Press OK to continue${DIALOG_NORMAL}"
	display_box "--msgbox" "${DIALOG_BACK_TITLE}" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"
}

# Displays the welcome dialog indicating what steps will be taken
function display_welcome()
{
	if [[ ${TEXT_ONLY} == "true" ]]; then
		DIALOG_RED="${RED}"
		DIALOG_NORMAL="${NC}"
	fi

	if [[ ${AUTO_CONFIRM} == "false" ]]; then
		display_msg --logonly info "Displaying the welcome dialog"
		local DIALOG_MSG="\n\
 Welcome to the Allsky Remote Website Installer!\n\n\
 This script will perform the following tasks:\n\n\
 \
  1) Check the remote Website connectivity - PASSED\n\
   2) Use ${CONFIG_MESSAGE} configuration file\n\
   3) Upload the remote Website code\n\
   4) Upload the remote Website configuration file\n\
   5) Enable the remote Website\n\n\
 \
 ${DIALOG_RED}WARNING:${DIALOG_NORMAL}\n\
  - This will overwrite files on the remote server, and\n\
  - REMOVE any old Allsky files on the remote server.\n\n\n\
 ${DIALOG_UNDERLINE}Are you sure you wish to continue?${DIALOG_NORMAL}"

		if ! display_prompt_dialog "${DIALOG_BACK_TITLE}" "${DIALOG_WELCOME_TITLE}" "${DIALOG_MSG}" ; then
			display_aborted "--user" "at the Welcome dialog" "false"
		fi
	else
		display_msg --logonly info "Ignored welcome prompt as auto confirm option specified."
	fi
}

# Displays the aborted dialog. This is used when an error is encountered or the user cancels.
# ${1} - Extra text to display in the dialog
# ${2} - "true"/"false" - Flag to indicate if the user should be prompted to show the installation log
function display_aborted()
{
	if [[ ${1} == "--user" ]]; then
		local ABORT_MSG="USER ABORTED INSTALLATION"
		shift
	else
		local ABORT_MSG="INSTALLATION ABORTED"
	fi
	local EXTRA_TEXT="${1}"
	local SHOW_LOG="${2}"

	display_msg --logonly info "${ABORT_MSG} ${EXTRA_TEXT}."
	local ERROR_MSG="\nThe installation of the remote Website was aborted ${EXTRA_TEXT}."

	if [[ ${SHOW_LOG} == "true" ]]; then
# TODO: Instead of displaying the log file, which is very detailed,
# how about if we tell the user to attach the log file to any GitHub message they post?
		MSG="${ERROR_MSG}\n\n"
		MSG+="${DIALOG_UNDERLINE}Would you like to view the installation log?${DIALOG_NORMAL}"
		if display_prompt_dialog "${DIALOG_BACK_TITLE}" "${DIALOG_INSTALL}" "${MSG}" ; then
			display_log_file "${DIALOG_BACK_TITLE}" "${DIALOG_TITLE_LOG}" "${DISPLAY_MSG_LOG}"
		fi
	fi

	clear	# Gets rid of background color from last 'dialog' command.
	display_msg info "${ERROR_MSG}"

	exit 1
}

# Displays the completed dialog, used at the end of the installation process.
function display_complete()
{
	local EXTRA_TEXT=""
	local E=" Please use the WebUI's 'Editor' page to replace any '${NEED_TO_UPDATE}' with the correct values."
	if [[ ${CONFIG_TO_USE} == "new"  ]]; then
		EXTRA_TEXT="\nA new configuration file was created for your remote Website."
		EXTRA_TEXT+="${E}"
	elif [[ ${CONFIG_TO_USE} == "remotereallyold" ]]; then
		EXTRA_TEXT="\nYou have a very old remote Allsky Website so a new configuration file was created."
		EXTRA_TEXT+="${E}"
	fi

	display_msg --logonly info "INSTALLATON COMPLETED.\n"

	MSG="\n\
  The installation of the remote Website is complete.\n\n\
  Please use the WebUI's 'Editor' page to manage any changes to your Website.${EXTRA_TEXT}"
#xx	display_info_box "${DIALOG_BACK_TITLE}" "${DIALOG_INSTALL}" "${MSG}"
	clear	# Gets rid of background color from last 'dialog' command.
	display_msg progress "${MSG}"
}

# Check connectivity to the remote Website.
function check_connectivity()
{
	local TEST_FILE="${ME}.txt"

	display_msg --logonly info "Checking remote Website connectivity."
	if ERR="$( "${ALLSKY_SCRIPTS}/testUpload.sh" --website --silent --file "${TEST_FILE}" 2>&1 )" ; then
		local MSG="The remote Website connectivity test succeeded."
		display_msg --logonly info "${MSG}"
		remove_remote_file "${TEST_FILE}"
		show_debug_message "${TEST_FILE} deleted from the remote server"
	else
		local ERROR_MSG="\nERROR: The remote Website connectivity check failed."
		ERROR_MSG+="\n\nPlease check the 'Websites and Remote Server Settings' section of the WebUI.\n\n\
 HOST: ${REMOTE_HOST}\n\
 PROTOCOL: ${REMOTE_PROTOCOL}\n\
 USER: ${REMOTE_USER}\n\
 REMOTE FOLDER: ${REMOTE_DIR}\n\n\
 ${ERR}"

		display_aborted "${ERROR_MSG}" "true"
	fi
}

# Displays a debug message in the log if the debug flag has been specified on the command line.
function show_debug_message()
{
	if [[ ${DEBUG} == "true" ]]; then
		display_msg --logonly debug "${1}"
	fi
}

# Creates the remote Website configuration file if needed.
# See 'pre_install_checks' for details on which configuration file is used.
function create_website_config()
{
	local MSG="\nCreating configuration file from ${CONFIG_MESSAGE}"
	display_info_box "${DIALOG_BACK_TITLE}" "${DIALOG_INSTALL}" "${MSG}"
	display_msg --logonly info "Creating remote Website configuration file"

	if [[ ${CONFIG_TO_USE} == "new" || ${CONFIG_TO_USE} == "remotereallyold" ]]; then
		# We need a new config file so copy it from the repo and replace as many
		# of the placeholders as we can
		DEST_FILE="${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}"
		cp "${REPO_WEBCONFIG_FILE}" "${DEST_FILE}"
		replace_website_placeholders "remote"
		MSG="Created a new ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_NAME} from repo and updated placeholders."
		display_msg --logonly info "${MSG}"

	elif [[ ${CONFIG_TO_USE} == "current" ]]; then
		# Use the current config file so do nothing
		MSG="Using existing ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_NAME} so nothing created."
		display_msg --logonly info "${MSG}"

	elif [[ ${CONFIG_TO_USE} == "old" ]]; then
		# Use the config file from allsky-OLD, copy it and replace as many of the placeholders as we can
		cp "${PRIOR_REMOTE_WEBSITE_CONFIGURATION_FILE}" "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}"
		replace_website_placeholders "remote"
		MSG="Copying ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_NAME} from the"
		MSG+=" $( basename "${PRIOR_ALLSKY_DIR}" ) directory and updating placeholders."
		display_msg --logonly info "${MSG}"

	elif [[ ${CONFIG_TO_USE} == "remotenew" ]]; then
		# Use the new remote config file since none were found locally
		if wget -O "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}" "${REMOTE_URL}/${ALLSKY_WEBSITE_CONFIGURATION_FILE}" ; then
			replace_website_placeholders "remote"
			MSG="Downloading ${ALLSKY_WEBSITE_CONFIGURATION_FILE} from ${REMOTE_URL},"
			MSG+=" and creating a new ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}."
			display_msg --logonly info "${MSG}"
		else
			MSG="Failed to download ${ALLSKY_WEBSITE_CONFIGURATION_FILE} from ${REMOTE_URL}"
			display_aborted "${MSG}" "true"
		fi
	fi
}

# Check if a remote file, or array of files, exist.
# ${1} - The base url
# ${2} - "true"/"false" If true then all files must exist, if "false" then any of the files can exist.
# ${3}... - the files
#
# Returns - 0 if the file(s) exist, 1 if ANY file doesn't exist.
function check_if_files_exist()
{
	local URL="${1}"
	local AND="${2}"
	shift 2
	local RESULT=1

	for FILE in "$@"; do
		url="${URL}/${FILE}"
		HTTP_STATUS="$( curl -o /dev/null --head --silent --write-out "%{http_code}" "$url" )"

		local PRE_MSG="File ${FILE} ${url}"
		if [[ ${HTTP_STATUS} == "200" ]] ; then
			show_debug_message "${PRE_MSG} exists on the remote server"
			RESULT=0
		else
			show_debug_message "${PRE_MSG} does not exists on the remote server"
			if [[ ${AND} == "true" ]]; then
				return 1
			fi
		fi
	done

	return ${RESULT}
}

# Deletes a file from the remote server.
# If a URL is specified then the file is first checked to make sure it exists.
# ${1} - The name of the file to delete
# ${2} - The url of the remote Website, used to check if a file exists
#
# Returns - Nothing
function remove_remote_file()
{
	local FILENAME="${1}"
	local URL="${2}"

	if [[ -n ${URL} ]]; then
		check_if_files_exist "${REMOTE_URL}" "false" "${FILENAME}" || return
	fi

# TODO: This assumes ftp is used to upload files
	lftp -u "${REMOTE_USER},${REMOTE_PASSWORD}" "${REMOTE_PORT}" "${REMOTE_PROTOCOL}://${REMOTE_HOST}" -e "
		cd '${REMOTE_DIR}'
		rm '${FILENAME}'
		bye" > /dev/null 2>&1

	#TODO: Check response code

	display_msg --logonly info "Deleted file ${FILENAME} from ${REMOTE_HOST}"
}

# Check if a remote Website exists. The check is done by looking for the following files:
#
# If any of the ${CONFIG_FILES} files exist and
# all of the ${WEBSITE_FILES} exist then assume we have a remote Website.
#
# Returns - Nothing, but set the global variable ${WEBSITE_EXISTS}.
function check_if_website_exists()
{
	local CONFIG_FILES=("config.json" "configuration.json"  "remote_configuration.json")
	local WEBSITE_FILES=("index.php" "functions.php")

	if check_if_files_exist "${REMOTE_URL}" "false" "${CONFIG_FILES[@]}" ; then
		show_debug_message "Found remote website config file"

		if check_if_files_exist "${REMOTE_URL}" "and" "${WEBSITE_FILES[@]}" ; then
			display_msg --log progress "Found remote Allsky Website at ${REMOTE_URL}"
			WEBSITE_EXISTS="true"
			return
		fi
	fi
	WEBSITE_EXISTS="false"
}

# Uploads the Website code from ${ALLSKY_WEBSITE} and removes any old
# Allsky files that are no longer needed.
function upload_remote_website()
{
	if [[ ${SKIP_UPLOAD} == "true" ]]; then
		display_msg --logonly info "Skipping upload as --skipupload provided on command line.\n"
		return
	fi

	local EXTRA_TEXT=""
	local EXCLUDE_FOLDERS=""

	if [[ -n ${REMOTE_PORT} ]]; then
		REMOTE_PORT="-p ${REMOTE_PORT}"
	fi

	local MSG="Starting upload to the remote Website"
	if [[ ${WEBSITE_EXISTS} == "true" ]]; then
		EXCLUDE_FOLDERS="--exclude keograms --exclude startrails --exclude videos"
		MSG+=", excluding videos, startrails, and keograms"
	fi
	display_msg --log progress "${MSG}${EXTRA_TEXT}."

	MSG="\n${MESSAGE}\n\nPlease wait as uploading files could take several minutes..."
	display_info_box "${DIALOG_BACK_TITLE}" "${DIALOG_INSTALL}" "${MSG}"
		
	{
# TODO: upload.sh should have a "--mirror directory" option.
# This would also fix the problem that we're assuming the "ftp" protocol is used.
		# shellcheck disable=SC2086
		lftp -u "${REMOTE_USER},${REMOTE_PASSWORD}" ${REMOTE_PORT} "${REMOTE_PROTOCOL}://${REMOTE_HOST}" -e "
			lcd '${ALLSKY_WEBSITE}'
			cd '${REMOTE_DIR}'
			set dns:fatal-timeout 10
			set net:max-retries 2
			set net:timeout 10
			mirror --reverse --verbose --overwrite --ignore-time --transfer-all ${EXCLUDE_FOLDERS}
			quit"

# TODO: check return code

		# Remove any old core files no longer required
		for FILE_TO_DELETE in "${OLD_FILES_TO_REMOVE[@]}"; do
			remove_remote_file "${FILE_TO_DELETE}" "${REMOTE_URL}"
		done
	} >> "$DISPLAY_MSG_LOG" 2>&1

	display_msg --logonly info "Website upload complete"
}

# Uploads the configuration file for the remote Website.
function upload_config_file()
{
	local MSG="\nUploading remote Allsky configuration file"
	display_info_box "${DIALOG_BACK_TITLE}" "${DIALOG_INSTALL}" "${MSG}"
	display_msg --log progress "Starting Website configuration file upload"
	local REMOTE_DIR="$( settings ".remotewebsiteimagedir" "${SETTINGS_FILE}" )"

	local RESULT="$( "${ALLSKY_SCRIPTS}/upload.sh" --remote-web \
		"${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}" "${REMOTE_DIR}" \
		"${ALLSKY_WEBSITE_CONFIGURATION_NAME}" 2>&1
	)"
	if [[ $? -eq 0 ]]; then
		MSG="${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE} uploaded to"
		MSG+="${REMOTE_DIR}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}"
		show_debug_message "${MSG}"
		display_msg --logonly info "Completed Website configuration file upload."
	else
		display_msg --logonly info " Failed: ${RESULTS}"
		display_aborted "at the configuration file upload" "true"
	fi
}

# Displays the script's help.
usage_and_exit()
{
	local RET C MSG

	RET=${1}
	if [[ ${RET} -eq 0 ]]; then
		C="${YELLOW}"
	else
		C="${RED}"
	fi
	MSG="Usage: ${ME} [--help] [--debug] [--skipupload] [-auto] [--text]"
	{
		echo -e "\n${C}${MSG}${NC}"
		echo
		echo "'--help' displays this message and exits."
		echo
		echo "'--debug' adds addtional debugging information to the installation log."
		echo
		echo "'--skipupload' Skips uploading of the remote Website code. Must only be used if advised by Allsky support."
		echo
		echo "'--auto' Accepts all prompts by default"
		echo
		echo "'--text' Text only mode, do not use any dialogs"
		echo
	} >&2
	exit "${RET}"
}

# Enable the remote Website.
function enable_remote_website()
{
	display_info_box "${DIALOG_BACK_TITLE}" "${DIALOG_INSTALL}" "\nEnabling remote Website"
	update_json_file ".useremotewebsite" "true" "${SETTINGS_FILE}"
	display_msg --log info "Remote Website enabled.\n"
}

############################################## main body
OK="true"
HELP="false"
SKIP_UPLOAD="false"
AUTO_CONFIRM="false"
TEXT_ONLY="false"
DEBUG="false"

while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
		--help)
			HELP="true"
			;;
		--debug)
			DEBUG="true"
			;;
		--skipupload)
			SKIP_UPLOAD="true"
			;;
		--auto)
			AUTO_CONFIRM="true"
			;;
		--text)
			TEXT_ONLY="true"
			LOG_TYPE="--log"
			;;
		*)
			display_msg --log error "Unknown argument: '${ARG}'."
			OK="false"
			;;
	esac
	shift
done

[[ ${HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" ]] && usage_and_exit 1

display_msg --logonly info "STARTING INSTALLATON AT $( date ).\n"

pre_install_checks
display_welcome
create_website_config
upload_remote_website
upload_config_file
enable_remote_website
display_complete
