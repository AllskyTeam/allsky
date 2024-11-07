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
HAVE_PRIOR_CONFIG="false"
HAVE_NEW_REMOTE_CONFIG="false"
HAVE_REALLY_OLD_REMOTE_CONFIG="false"
CONFIG_TO_USE=""		# which Website configuration file to use?
CONFIG_MESSAGE=""
REMOTE_WEBSITE_EXISTS="false"

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
REMOTE_PROTOCOL="$( settings ".remotewebsiteprotocol" "${SETTINGS_FILE}" )"
REMOTE_PROTOCOL="${REMOTE_PROTOCOL,,}"		# convert to lowercase

#### FIX: this script needs to support ALL protocols, not just *ftp*.
if [[ ${REMOTE_PROTOCOL} != "sftp" && ${REMOTE_PROTOCOL} != "ftp" && ${REMOTE_PROTOCOL} != "ftps" ]]; then
	echo -e "\n\n"
	echo    "************* NOTICE *************"
	echo    "This script currently only supports ftp protocols."
	echo    "Support for the '${REMOTE_PROTOCOL}' protocol will be added in"
	echo    "the first point release."
	echo -e "\n"
	echo    "In the meantime, if you have an existing remote Allsky Website,"
	echo    "it should continue to work."
	echo -e "\n"

	exit 0
fi

# Titles for various dialogs
DIALOG_BACK_TITLE="Allsky Remote Website Installer"
DIALOG_WELCOME_TITLE="Allsky Remote Website Installer"
DIALOG_PRE_CHECK="Pre Installation Checks"
DIALOG_INSTALL="Installing Remote Website"
DIALOG_DONE="Remote Website Installation Completed"
DIALOG_TITLE_LOG="Allsky Remote Website Installation Log"

# Old Allksy Website files that should be remoevd if they exist
OLD_CONFIG_NAME="config.js"
OLD_FILES_TO_REMOVE=( \
	"${OLD_CONFIG_NAME}" \
	"${ALLSKY_WEBSITE_CONFIGURATION_NAME}" \
	"getTime.php" \
	"virtualsky.json" \
	"README.md" \
	"myImages")

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

# Add a common heading to the dialog text.
function add_dialog_heading()
{
	local DIALOG_TEXT="${1}"

	## We no longer add the remote URL but have left this code in case we want
	## to add something else in the future.
	## Only the:   ITEM_TO_ADD=xxx   line should need changing.
	echo "${DIALOG_TEXT}"
	return

	if [[ ${TEXT_ONLY} == "true" ]]; then
		DIALOG_RED="${RED}"
		DIALOG_NORMAL="${NC}"
	fi

	local ITEM_TO_ADD="${REMOTE_URL}"
	local PADDING=$(( ((DIALOG_WIDTH-6) - ${#ITEM_TO_ADD}) / 2 ))
	local ITEM_TO_ADD="$( printf "%${PADDING}s%s" "" "${ITEM_TO_ADD}" )"

	echo -e "\n${DIALOG_RED}${ITEM_TO_ADD}${DIALOG_NORMAL}\n${DIALOG_TEXT}"
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
		--clear \
		--colors \
		--backtitle "${BACK_TITLE}" \
		--title "${DIALOG_TITLE}" \
		--textbox "${FILENAME}" 22 77
}

# Runs the pre installation checks to determine the following:
# - Is there a remote Website?
# - Which configuration file to use for the remote Website?
#
# The configuration file to use is decided using the following, in order:
#
# 1a. If ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE} exists, use it.
#
# 1b. If ${PRIOR_REMOTE_WEBSITE_CONFIGURATION_FILE} exists,
#     copy it to ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE} and use it.
#
# 2a. If there's a remote Website with a ${ALLSKY_WEBSITE_CONFIGURATION_NAME} file,
#     save it locally as ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE} and use it.
#
# 2b. If there is a remote Website with an old-style configuration file (${OLD_CONFIG_NAME}),
#     create a NEW ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE} and use it.
#     Don't bother trying to convert from old-style files.
function pre_install_checks()
{
	local MSG=""
	local DIALOG_TEXT
	DIALOG_TEXT="\nRunning pre installation checks."
	DIALOG_TEXT+="\n\nPlease wait as this can take a few minutes to complete.\n\n"

	DIALOG_TEXT+="\n1  - Checking for local files"
	display_info_box "${DIALOG_BACK_TITLE}" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"
	display_msg --logonly info "Start pre installation checks."

	if [[ -f ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE} ]]; then
		# 1a.
		MSG="Found ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE} on Pi."
		display_msg --logonly info "${MSG}"
		HAVE_NEW_CONFIG="true"

	elif [[ -f ${PRIOR_REMOTE_WEBSITE_CONFIGURATION_FILE} ]]; then
		# 1b.
		MSG="Found ${PRIOR_REMOTE_WEBSITE_CONFIGURATION_FILE}."
		display_msg --logonly info "${MSG}"
		HAVE_PRIOR_CONFIG="true"
	fi

	DIALOG_TEXT+="\n2  - Checking if an existing remote Website exists"
	display_info_box "${DIALOG_BACK_TITLE}" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"

	REMOTE_WEBSITE_EXISTS="$( check_if_website_exists )"
	if [[ ${REMOTE_WEBSITE_EXISTS} == "true" ]]; then
		# 2a.
		DIALOG_TEXT+="\n2a - Checking for remote Website configuration file"
		display_info_box "${DIALOG_BACK_TITLE}" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"
		local NEW_CONFIG_FILES=("${ALLSKY_WEBSITE_CONFIGURATION_NAME}")
		if check_if_files_exist "${REMOTE_URL}" "or" "${NEW_CONFIG_FILES[@]}" ; then
			HAVE_NEW_REMOTE_CONFIG="true"
			MSG="Found current configuration file on the remote server."
			display_msg --logonly info "${MSG}"
		fi

		# 2b.
		DIALOG_TEXT+="\n2b - Checking for old-style remote Website configuration file"
		display_info_box "${DIALOG_BACK_TITLE}" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"
		local REALLY_OLD_CONFIG_FILES=("${OLD_CONFIG_NAME}")
		if check_if_files_exist "${REMOTE_URL}" "or" "${REALLY_OLD_CONFIG_FILES[@]}" ; then
			HAVE_REALLY_OLD_REMOTE_CONFIG="true"
			MSG="Found old-format ${OLD_CONFIG_NAME} file on the remote Website."
			display_msg --logonly info "${MSG}"
		fi
	fi

	if [[ ${HAVE_NEW_CONFIG} == "true" ]]; then
		if [[ ${HAVE_NEW_REMOTE_CONFIG} == "true" ]]; then
			MSG="A remote configuration file was found but using the local version instead."
		else
			MSG="Using the local remote configuration file (no remote file found)."
		fi
		display_msg --logonly info "${MSG}."
		CONFIG_TO_USE="local"	# it may be old or current format
		CONFIG_MESSAGE="the current remote"

	elif [[ ${HAVE_PRIOR_CONFIG} == "true" ]]; then
		MSG="Using the $( basename "${PRIOR_ALLSKY_DIR}" ) configuration file;"
		MSG+=" placeholders will be updated."
		display_msg --logonly info "${MSG}"
		CONFIG_TO_USE="prior"	# it may be old or current format
		CONFIG_MESSAGE="the $( basename "${PRIOR_ALLSKY_DIR}" )"

	elif [[ ${HAVE_NEW_REMOTE_CONFIG} == "true" ]]; then
		MSG="Using new format Website configuration file on the remote Website;"
		MSG+=" it will be downloaded and saved locally."
		display_msg --logonly info "${MSG}"
		CONFIG_TO_USE="remoteNew"
		CONFIG_MESSAGE="the remote Website's"

	elif [[ ${HAVE_REALLY_OLD_REMOTE_CONFIG} == "true" ]]; then
		MSG="Old ${OLD_CONFIG_NAME} found."
		MSG+=" Creating a new configuration file that the user must manually update."
		display_msg --logonly info "${MSG}"
		CONFIG_TO_USE="remoteReallyOld"
		CONFIG_MESSAGE="a new"

	else
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
		display_msg --logonly info "Displaying the welcome dialog."
		local DIALOG_MSG="\n\
 Welcome to the Allsky Remote Website Installer!\n\n\
 This script will perform the following tasks:\n\n\
 \
  1) Check the remote Website connectivity - PASSED\n\
   2) Use ${CONFIG_MESSAGE} configuration file\n\
   3) Upload the new remote Website code\n\
   4) Upload the remote Website configuration file\n\
   5) Enable the remote Website\n\n\
 \
 ${DIALOG_RED}WARNING! This will:${DIALOG_NORMAL}\n\
  - Overwrite the old Allsky web files on the remote server.\n\
  - Remove any old Allsky files from the remote server.\n\n\n\
 ${DIALOG_UNDERLINE}Are you sure you wish to continue?${DIALOG_NORMAL}"

		if ! display_prompt_dialog "${DIALOG_BACK_TITLE}" "${DIALOG_WELCOME_TITLE}" "${DIALOG_MSG}" ; then
			display_aborted "--user" "at the Welcome dialog" ""
		fi
	else
		display_msg --logonly info "Ignored welcome prompt as auto confirm option specified."
	fi
}

# Displays the aborted dialog. This is used when an error is encountered or the user cancels.
# ${1} - Extra text to display in the dialog
# ${2} - Error message (or "" if no error)
function display_aborted()
{
	if [[ ${1} == "--user" ]]; then
		local ABORT_MSG="USER ABORTED INSTALLATION"
		shift
	else
		local ABORT_MSG="INSTALLATION ABORTED"
	fi
	local EXTRA_TEXT="${1}"
	local ERROR_MSG="${2}"

	display_msg --logonly info "${ABORT_MSG} at $( date ) ${EXTRA_TEXT}.\n"
	local MSG="\nThe installation of the remote Website was aborted ${EXTRA_TEXT}."

	if [[ -n ${ERROR_MSG} ]]; then
		local DIALOG_PROMPT="${MSG}\n\n"
		DIALOG_PROMPT+="${DIALOG_UNDERLINE}Would you like to view the error message?${DIALOG_NORMAL}"
		if display_prompt_dialog "${DIALOG_BACK_TITLE}" "${DIALOG_INSTALL}" "${DIALOG_PROMPT}" ; then
			display_box "--msgbox" "${DIALOG_BACK_TITLE}" "${DIALOG_TITLE_LOG}" "${ERROR_MSG}" "--scrollbar"
if false; then
			display_log_file "${DIALOG_BACK_TITLE}" "${DIALOG_TITLE_LOG}" "${DISPLAY_MSG_LOG}"
fi
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
	elif [[ ${CONFIG_TO_USE} == "remoteReallyOld" ]]; then
		EXTRA_TEXT="\nYou have a very old remote Allsky Website so a new configuration file was created."
		EXTRA_TEXT+="${E}"
	fi

	display_msg --logonly info "INSTALLATION COMPLETED.\n"

	local DIALOG_TEXT="\n\
  The installation of the remote Website is complete\n\
  and the remote Website should be working.\n\n\
  Please check it.\n\n\
  Use the WebUI's 'Editor' page to change settings for your Website.${EXTRA_TEXT}"
	display_box "--msgbox" "${DIALOG_BACK_TITLE}" "${DIALOG_DONE}" "${DIALOG_TEXT}"

	clear	# Gets rid of background color from last 'dialog' command.
	display_msg info "\nEnjoy your remote Allsky Website!\n"
}

# Check connectivity to the remote Website.
function check_connectivity()
{
	local TEST_FILE="${ME}.txt"
	local ERR

	display_msg --logonly info "Checking remote Website connectivity."
	if ERR="$( "${ALLSKY_SCRIPTS}/testUpload.sh" --website --silent --file "${TEST_FILE}" 2>&1 )" ; then
		show_debug_message "The remote Website connectivity test succeeded."
		remove_remote_file "${TEST_FILE}" "do not check"
	else
		local ERROR_MSG="\nERROR: The remote Website connectivity check failed."
		display_aborted "${ERROR_MSG}" "${ERR}"
	fi
}

# Displays a debug message in the log if the debug flag has been specified on the command line.
function show_debug_message()
{
	if [[ ${DEBUG} == "true" ]]; then
		display_msg --logonly debug "${1}"
	fi
}

# Update a Website config file if it's an old version.
function update_old()
{
	local FILE="${1}"

	local PRIOR_VERSION="$( settings ".${WEBSITE_CONFIG_VERSION}" "${FILE}" )"
	local NEW_VERSION="$( settings ".${WEBSITE_CONFIG_VERSION}" "${REPO_WEBCONFIG_FILE}" )"
	if [[ ${PRIOR_VERSION} < "${NEW_VERSION}" ]]; then
		# Old version, so update to format of the current version.
		update_old_website_config_file "${FILE}" "${PRIOR_VERSION}" "${NEW_VERSION}"
		return 0
	fi
	return 1
}

# Creates the remote Website configuration file if needed.
# See 'pre_install_checks' for details on which configuration file is used.
function create_website_config()
{
	local MSG="\nCreating configuration file from ${CONFIG_MESSAGE}"
	display_info_box "${DIALOG_BACK_TITLE}" "${DIALOG_INSTALL}" "${MSG}"

	if [[ ${CONFIG_TO_USE} == "new" || ${CONFIG_TO_USE} == "remoteReallyOld" ]]; then
		# Need a new config file so copy it from the repo and replace as many
		# placeholders as we can.
		local DEST_FILE="${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}"
		cp "${REPO_WEBCONFIG_FILE}" "${DEST_FILE}"
		replace_website_placeholders "remote"

		MSG="Created a new ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_NAME}"
		MSG+=" from repo and updated placeholders."
		display_msg --logonly info "${MSG}"

	elif [[ ${CONFIG_TO_USE} == "local" ]]; then
		# Using the remote config file on the Pi which may be new or old format.
		MSG="Using existing ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_NAME}"
		if update_old "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}" ; then
			MSG+=" and converting to newest format."
		fi
		display_msg --logonly info "${MSG}"

	elif [[ ${CONFIG_TO_USE} == "prior" ]]; then
		# Use the config file from the prior Allsky, replacing as many placeholders as we can.
		# If the file is an older version, convert to the newest format.
		cp "${PRIOR_REMOTE_WEBSITE_CONFIGURATION_FILE}" "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}"
		replace_website_placeholders "remote"
		update_old "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}"

		MSG="Copied ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_NAME} from the"
		MSG+=" $( basename "${PRIOR_ALLSKY_DIR}" ) directory and updated placeholders."
		display_msg --logonly info "${MSG}"

	elif [[ ${CONFIG_TO_USE} == "remoteNew" ]]; then
		# Use the new remote config file since none were found locally.
		# Replace placeholders and convert it to the newest format.
		# Remember that the remote file name is different than what we store on the Pi.
		if ERR="$( wget -O "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}" "${REMOTE_URL}/${ALLSKY_WEBSITE_CONFIGURATION_FILE}" 2>&1 )"; then
			replace_website_placeholders "remote"
			update_old "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}"

			MSG="Downloaded ${ALLSKY_WEBSITE_CONFIGURATION_FILE} from ${REMOTE_URL},"
			MSG+=" to ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}."
			display_msg --logonly info "${MSG}"
		else
			# This "shouldn't" happen since we either already checked the file exists,
			# or we uploaded it.
			MSG="Failed to download ${ALLSKY_WEBSITE_CONFIGURATION_FILE} from ${REMOTE_URL}."
			MSG+=" Where did it go?"
			display_aborted "${MSG}" "${ERR}"
		fi
	fi
}

# Check if a remote file, or array of files, exist.
# ${1} - The base url
# ${2} - "and"/"or" If "and" then all files must exist, if "or" then any of the files can exist.
# ${3}... - the files
#
# Returns - 0 if the file(s) exist, 1 if ANY file doesn't exist.
function check_if_files_exist()
{
	local URL="${1}"
	local AND_OR="${2}"
	shift 2
	local RET_CODE=1

	for FILE in "$@"; do
		url="${URL}/${FILE}"
		HTTP_STATUS="$( curl -o /dev/null --head --silent --write-out "%{http_code}" "$url" )"

		local PRE_MSG="File ${FILE} ${url}"
		if [[ ${HTTP_STATUS} == "200" ]] ; then
			show_debug_message "${PRE_MSG} exists on the remote server"
			RET_CODE=0
		else
			show_debug_message "${PRE_MSG} does not exists on the remote server"
			if [[ ${AND_OR} == "and" ]]; then
				return 1
			fi
		fi
	done

	return ${RET_CODE}
}

# Deletes a file from the remote server.
# ${1} - The name of the file to delete
# ${2} - If set to "check", first check if the file exists
#
# Returns - Nothing
function remove_remote_file()
{
	local FILENAME="${1}"
	local CHECK="${2}"

	if [[ ${CHECK} == "check" ]]; then
		if ! check_if_files_exist "${REMOTE_URL}" "or" "${FILENAME}" ; then
			show_debug_message "===== not on server"
			return
		fi
	fi

# TODO: FIX: This assumes ftp is used to upload files
# upload.sh should accept "--remove FILE" option.
	local CMDS=""  ERR
	[[ -n ${REMOTE_DIR} ]] && CMDS="cd '${REMOTE_DIR}' ;"
	CMDS+=" rm -r '${FILENAME}' ; bye"

	ERR="$( lftp -u "${REMOTE_USER},${REMOTE_PASSWORD}" \
					"${REMOTE_PORT}" \
					"${REMOTE_PROTOCOL}://${REMOTE_HOST}" \
				-e "${CMDS}" 2>&1 )"
	if [[ $? -eq 0 ]] ; then
		MSG="Deleted remote file '${FILENAME}'"
	else
		MSG="Unable to delete remote file '${FILENAME}': ${ERR}"
	fi

	display_msg --logonly info "${MSG}"
}

# Check if a remote Website exists.
# The check is done by looking for the following files:
#	If any of the ${CONFIG_FILES} files exist AND
#	all of the ${WEBSITE_FILES} exist then assume we have a remote Website.
#
# Returns - echo "true" if it exists, else "false"
function check_if_website_exists()
{
	local CONFIG_FILES=("${OLD_CONFIG_NAME}" "${ALLSKY_WEBSITE_CONFIGURATION_NAME}")
	local WEBSITE_FILES=("index.php" "functions.php")

	if check_if_files_exist "${REMOTE_URL}" "or" "${CONFIG_FILES[@]}" ; then
		show_debug_message "Found a remote Website config file"

		if check_if_files_exist "${REMOTE_URL}" "and" "${WEBSITE_FILES[@]}" ; then
			display_msg --logonly info "Found a remote Allsky Website at ${REMOTE_URL}"
			echo "true"
			return 0
		fi
	fi
	echo "false"
	return 1
}

# Uploads the Website code from ${ALLSKY_WEBSITE} and removes any old Allsky
# files that are no longer used.
function upload_remote_website()
{
	if [[ ${SKIP_UPLOAD} == "true" ]]; then
		display_msg --logonly info "Skipping upload per user request.\n"
		return
	fi

	local EXTRA_TEXT=""  EXCLUDE_FOLDERS=""
	local MSG  RET  RD

	if [[ -n ${REMOTE_PORT} ]]; then
		REMOTE_PORT="-p ${REMOTE_PORT}"
	fi

	MSG="Starting upload to the remote Website in ${REMOTE_DIR}..."
	if [[ ${REMOTE_WEBSITE_EXISTS} == "true" ]]; then

#### FIX: this won't upload the "index.php" files

		# Don't upload images if the remote Website exists (we assume it already
		# has the images).
		EXCLUDE_FOLDERS="--exclude keograms --exclude startrails --exclude videos"
		MSG+=", excluding videos, startrails, and keograms"
	fi
	display_msg --logonly info "${MSG}${EXTRA_TEXT}."

	MSG="\n${MESSAGE}\n\nUploading new Allsky files.  This may take several minutes..."
	display_info_box "${DIALOG_BACK_TITLE}" "${DIALOG_INSTALL}" "${MSG}"

# TODO: upload.sh should have a "--mirror from_directory to_directory" option.
# This would also fix the problem that we're assuming the "ftp" protocol is used.
	# shellcheck disable=SC2086
	if [[ -z "${REMOTE_DIR}" ]]; then
		RD=""		# don't cd to empty directory
	else
		RD="cd '${REMOTE_DIR}'"
	fi
	# shellcheck disable=SC2086
	RET="$( lftp -u "${REMOTE_USER},${REMOTE_PASSWORD}" \
			${REMOTE_PORT} "${REMOTE_PROTOCOL}://${REMOTE_HOST}" \
			-e "lcd '${ALLSKY_WEBSITE}'
				set dns:fatal-timeout 10
				set net:max-retries 2
				set net:timeout 10
				${RD}
				mirror --reverse --verbose --overwrite --ignore-time --transfer-all ${EXCLUDE_FOLDERS}
				quit" 2>&1 )"
	if [[ $? -ne 0 ]]; then
		display_aborted "while mirroring Website" "${RET}"
	fi

	# Ignore stuff not supported by all FTP servers.
	MSG="$( echo "${RET}" | grep -v -i -E "operation not supported|command not understood" )"
	display_msg --logonly info "$( indent --spaces "${MSG}" )"

	# Remove any old core files no longer required
	for FILE_TO_DELETE in "${OLD_FILES_TO_REMOVE[@]}"; do
		remove_remote_file "${FILE_TO_DELETE}" "check"
	done

	display_msg --logonly info "Website upload complete"
}

# Uploads the configuration file for the remote Website.
function upload_config_file()
{
	local MSG="\nUploading remote Allsky configuration file"
	display_info_box "${DIALOG_BACK_TITLE}" "${DIALOG_INSTALL}" "${MSG}"
	display_msg --logonly info "Uploading Website configuration file."

	local ERR="$( "${ALLSKY_SCRIPTS}/upload.sh" --remote-web \
		"${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}" "${REMOTE_DIR}" \
		"${ALLSKY_WEBSITE_CONFIGURATION_NAME}" 2>&1 )"
	if [[ $? -eq 0 ]]; then
		MSG="${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE} uploaded to"
		MSG+="${REMOTE_DIR}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}"
		show_debug_message "${MSG}"
	else
		display_msg --logonly info " Failed: ${ERR}"
		display_aborted "at the configuration file upload" "${ERR}"
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
		echo "'--skipupload' Skips uploading of the remote Website code."
		echo "   Must only be used if advised by Allsky support."
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
	display_msg --logonly info "Remote Website enabled."
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

display_msg --logonly info "STARTING INSTALLATION.\n"

pre_install_checks
display_welcome
create_website_config
upload_remote_website
upload_config_file
enable_remote_website
display_complete
