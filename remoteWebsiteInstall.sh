#!/bin/bash

# shellcheck disable=SC2317

# Install or upgrade a remote Allsky Website.

# TODO: handle interrupts like in install.sh

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
HAVE_LOCAL_CONFIG="false"
HAVE_NEW_STYLE_REMOTE_CONFIG="false"
HAVE_REALLY_OLD_REMOTE_CONFIG="false"
CONFIG_TO_USE=""		# which Website configuration file to use?
CONFIG_MESSAGE=""
REMOTE_WEBSITE_IS_VALID="false"

# Dialog size variables
DIALOG_WIDTH="$( tput cols )"; ((DIALOG_WIDTH -= 10 ))
DIALOG_HEIGHT=25

# Remote connectivity variables
REMOTE_URL="$( settings ".remotewebsiteurl" "${SETTINGS_FILE}" )"
REMOTE_USER="$( settings ".REMOTEWEBSITE_USER" "${ALLSKY_ENV}" )"
REMOTE_HOST="$( settings ".REMOTEWEBSITE_HOST" "${ALLSKY_ENV}" )"
REMOTE_PORT="$( settings ".REMOTEWEBSITE_PORT" "${ALLSKY_ENV}" )"
[[ -n ${REMOTE_PORT} ]] && REMOTE_PORT="-p ${REMOTE_PORT}"
REMOTE_PASSWORD="$( settings ".REMOTEWEBSITE_PASSWORD" "${ALLSKY_ENV}" )"
REMOTE_DIR="$( settings ".remotewebsiteimagedir" "${SETTINGS_FILE}" )"
REMOTE_PROTOCOL="$( settings ".remotewebsiteprotocol" "${SETTINGS_FILE}" )"
REMOTE_PROTOCOL="${REMOTE_PROTOCOL,,}"		# convert to lowercase

#### TODO: this script needs to support ALL protocols, not just *ftp*.
# When it does, remove this check.
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
# don't use:  DIALOG_BACK_TITLE="Allsky Remote Website Installer"
DIALOG_WELCOME_TITLE="Allsky Remote Website Installer"
DIALOG_PRE_CHECK="${DIALOG_WELCOME_TITLE} - Pre Installation Checks"
DIALOG_INSTALL="Installing Remote Website"
DIALOG_DONE="Remote Website Installation Completed"
DIALOG_TITLE_LOG="Allsky Remote Website Installation Log"

# Old Allksy Website files that should be removed if they exist.
OLD_CONFIG_NAME="config.js"
OLD_FILES_TO_REMOVE=( \
	"${OLD_CONFIG_NAME}" \
	"${ALLSKY_WEBSITE_CONFIGURATION_NAME}" \
	"getTime.php" \
	"virtualsky.json" \
	"README.md" \
	"version" )
OLD_FILES_TO_WARN=( "myImages" )

############################################## functions

# Prompt the user to enter (y)/(yes) or (n)/(no).
# This function is only used when running in text (--text) mode.
function enter_yes_no()
{
	local TEXT="${1}"
	local RESULT=1
	local ANSWER

	if [[ ${AUTO_CONFIRM} == "false" ]]; then
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
	else
		return 0
	fi

	return "${RESULT}"
}

# prompt the user to press any key.
# This function is only used when running in text (--text) mode.
function press_any_key()
{
	if [[ ${AUTO_CONFIRM} == "false" ]]; then
		echo -e "${1}\nPress any key to continue..."
		read -r -n1 -s
	fi
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
		return "${RET}"
	fi

	# Don't use: it's redundant most of the time	--backtitle "${DIALOG_BACK_TITLE}" \
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
function display_log_file()
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

# Runs the pre installation checks to determine the following:
# - Is there a remote Website?
# - Which configuration file to use for the remote Website?
#
# The configuration file to use is decided using the following, in order:
#
# 1a. If ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE} exists, use it.
#
# 1b. No longer used, assume upgrade of Allsky will copy the configuration file
#     to the new installation
#
# 2a. If there's a remote Website with a ${ALLSKY_WEBSITE_CONFIGURATION_NAME} file,
#     save it locally as ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE} and use it.
#
# 2b. If there is a remote Website with an old-style configuration file (${OLD_CONFIG_NAME}),
#     create a NEW ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE} and use it.
#     Don't bother trying to convert from old-style files.
function pre_install_checks()
{
	display_msg --logonly info "Start pre installation checks."

	local MSG=""
	local DIALOG_TEXT  DT
 	DIALOG_TEXT="\nWelcome to the Allsky Remote Website Installer!\n\n"
	DIALOG_TEXT+="\nRunning pre installation checks.\n\n"

	DIALOG_TEXT+="\n1  - Checking for remote Website configuration file on Pi: "
	display_box "--infobox" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"
	if [[ -f ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE} ]]; then
		# 1a.
		DT="FOUND"
		MSG="Found ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}."
		display_msg --logonly info "${MSG}"
		HAVE_LOCAL_CONFIG="true"
	else
		DT="NOT FOUND"
		display_msg --logonly info "No local config file found."
	fi
	DIALOG_TEXT+="${DT}."
	display_box "--infobox" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"

	DIALOG_TEXT+="\n2  - Checking for working remote Website: "
	display_box "--infobox" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"
	local INDENT="     "
	REMOTE_WEBSITE_IS_VALID="$( check_if_website_is_valid )"
	if [[ ${REMOTE_WEBSITE_IS_VALID} == "true" ]]; then

		# If we didn't find a remote Website configuration file on the Pi,
		# it "should be" an old-style Website since the user wasn't
		# using the WebUI to configure it.

		DIALOG_TEXT+="WORKING."
		display_box "--infobox" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"

		# 2a.
		DIALOG_TEXT+="\n${INDENT}* Checking it for new-style configuration file: "
		display_box "--infobox" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"
		local NEW_CONFIG_FILES=("${ALLSKY_WEBSITE_CONFIGURATION_NAME}")
		if check_if_files_exist "${REMOTE_URL}" "or" "${NEW_CONFIG_FILES[@]}" ; then
			HAVE_NEW_STYLE_REMOTE_CONFIG="true"
			DIALOG_TEXT+="FOUND."
			display_box "--infobox" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"
			MSG="Found a current configuration file on the remote server."
			display_msg --logonly info "${MSG}"
		else
			# 2b.
			DIALOG_TEXT+="NOT FOUND."
			display_box "--infobox" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"

			DIALOG_TEXT+="\n${INDENT}* Checking it for old-style configuration file:"
			display_box "--infobox" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"
			local REALLY_OLD_CONFIG_FILES=("${OLD_CONFIG_NAME}")
			if check_if_files_exist "${REMOTE_URL}" "or" "${REALLY_OLD_CONFIG_FILES[@]}" ; then
				HAVE_REALLY_OLD_REMOTE_CONFIG="true"
				DT="FOUND."
				MSG="Found old-style ${OLD_CONFIG_NAME} file on the remote Website."
				display_msg --logonly info "${MSG}"
			else
				# This "shouldn't" happen - the remote Website should have SOME type
				# of configuration file.
				DT="NOT FOUND."
			fi
			DIALOG_TEXT+="${DT}"
			display_box "--infobox" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"
		fi
	else
		# No working remote Website found.
		DIALOG_TEXT+="NOT WORKING."
		display_box "--infobox" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"

		if [[ ${HAVE_LOCAL_CONFIG} == "true" ]]; then
			DIALOG_TEXT+="${DIALOG_RED}"
			DIALOG_TEXT+="\n${INDENT}WARNING: a remote configuration file exists"
			DIALOG_TEXT+="\n${INDENT}but a remote Website wasn't found."
			DIALOG_TEXT+="\n${INDENT}What is the configuration file for?"
			DIALOG_TEXT+="${DIALOG_NORMAL}"
			display_box "--infobox" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"
		else
			DIALOG_TEXT+="${DIALOG_RED}"
			DIALOG_TEXT+="\n${INDENT}WARNING: No configuration file found a new one will be created."
			DIALOG_TEXT+="${DIALOG_NORMAL}"
		fi

	fi

	if [[ ${HAVE_LOCAL_CONFIG} == "true" ]]; then
		if [[ ${HAVE_NEW_STYLE_REMOTE_CONFIG} == "true" ]]; then
			MSG="A new-style remote configuration file was found but using the local version instead."
		else
			MSG="Using the remote configuration file on the Pi (no remote file found)."
		fi
		display_msg --logonly info "${MSG}"
		CONFIG_TO_USE="local"	# it may be old or current format
		CONFIG_MESSAGE="the current remote"

	elif [[ ${HAVE_NEW_STYLE_REMOTE_CONFIG} == "true" ]]; then
		MSG="Using new-style Website configuration file on the remote Website;"
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
		MSG="No configuration file found - a new one will be created."
		display_msg --logonly info "${MSG}"
		CONFIG_TO_USE="new"
		CONFIG_MESSAGE="a new"
	fi

	DIALOG_TEXT+="\n     * Checking ability to upload to Website: "
	display_box "--infobox" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"
	display_msg --logonly info "Checking remote Website connectivity."
	local ERR="$( check_connectivity )"
	if [[ -z ${ERR} ]]; then
		DIALOG_TEXT+="PASSED."
		display_box "--infobox" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"
		show_debug_message "The remote Website connectivity test succeeded."
	else
		local ERROR_MSG="\nERROR: The remote Website connectivity check failed."
		display_aborted "${ERROR_MSG}" "${ERR}"
	fi

	display_msg --logonly info "Completed pre installation checks."

	# Prompt the user to continue.  This is so they can see the above messages.
	DIALOG_TEXT+="\n\n\n${DIALOG_UNDERLINE}Press OK to continue${DIALOG_NORMAL}"
	display_box "--msgbox" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"
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
		local DIALOG_TEXT="\n\
 This script will now:\n\n\
   1) Use ${CONFIG_MESSAGE} configuration file.\n\
   2) Upload the new remote Website code.\n\
   3) Upload the remote Website configuration file.\n\
   4) Enable the remote Website.\n\
   5) Any existing startrails, keograms, and/or timelapse will NOT be touched.\n\
\n\
 ${DIALOG_RED}NOTE: This will:${DIALOG_NORMAL}\n\
  - Overwrite the old Allsky web files on the remote server.\n\
  - Remove any old Allsky files from the remote server.\n\n\n\
 ${DIALOG_UNDERLINE}Are you sure you wish to continue?${DIALOG_NORMAL}"
		if ! display_box "--yesno" "${DIALOG_WELCOME_TITLE}" "${DIALOG_TEXT}" ; then
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

	display_msg --logonly info "${ABORT_MSG} ${EXTRA_TEXT}.\n"
	local MSG="\nInstallation of the remote Website aborted ${EXTRA_TEXT}."

	if [[ -n ${ERROR_MSG} ]]; then
		local DIALOG_PROMPT="${MSG}\n\n"
		DIALOG_PROMPT+="${DIALOG_UNDERLINE}Would you like to view the error message?${DIALOG_NORMAL}"
		if display_box "--yesno" "${DIALOG_INSTALL}" "${DIALOG_PROMPT}" ; then
			display_box "--msgbox" "${DIALOG_TITLE_LOG}" "${ERROR_MSG}" "--scrollbar"
		fi
	fi

	clear	# Gets rid of background color from last 'dialog' command.

	exit 1
}

# Displays the completed dialog, used at the end of the installation process.
function display_complete()
{
	local EXTRA_TEXT  E  E2
	E="Use the WebUI's 'Editor' page to edit the"
	E+=" '${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_NAME} (remote Allsky Website)' file"
	E2=", replacing any '${NEED_TO_UPDATE}' strings with the correct values."
	if [[ ${CONFIG_TO_USE} == "new"  ]]; then
		EXTRA_TEXT="A new configuration file was created."
		EXTRA_TEXT+="\n  ${E}${E2}"
	elif [[ ${CONFIG_TO_USE} == "remoteReallyOld" ]]; then
		EXTRA_TEXT="You had a very old remote Allsky Website so a new configuration file was created."
		EXTRA_TEXT+="\n  ${E}${E2}"
	else
		EXTRA_TEXT="${E} to change settings for your remote Website."
	fi

	local DIALOG_TEXT="\n  The installation of the remote Website is complete.\n\n  Please check it."
	DIALOG_TEXT+="\n\n  ${EXTRA_TEXT}"
	display_box "--msgbox" "${DIALOG_DONE}" "${DIALOG_TEXT}"

	clear	# Gets rid of background color from last 'dialog' command.
	display_msg --log success "\nEnjoy your remote Allsky Website!\n\n${EXTRA_TEXT}"

	display_msg --logonly info "INSTALLATION COMPLETED.\n"
}

# Check connectivity to the remote Website by trying to upload a file to it.
# Return "" for success, else the error message.
function check_connectivity()
{
	local TEST_FILE="${ME}.txt"
	local ERR

	if ERR="$( "${ALLSKY_SCRIPTS}/testUpload.sh" --website --silent --file "${TEST_FILE}" 2>&1 )" ; then
		remove_remote_file "${TEST_FILE}" "do not check"
		echo ""
	else
		echo "${ERR}"
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
	local MSG

	if [[ ${CONFIG_TO_USE} == "new" || ${CONFIG_TO_USE} == "remoteReallyOld" ]]; then
		# Need a new config file so copy it from the repo and replace as many
		# placeholders as we can.
		local DEST_FILE="${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}"
		cp "${REPO_WEBCONFIG_FILE}" "${DEST_FILE}"
		replace_website_placeholders "remote"

		MSG="Created a new ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_NAME}"
		MSG+=" from repo and updated placeholders."
		display_msg --logonly info "${MSG}"

		return
	fi

	if [[ ${CONFIG_TO_USE} == "local" ]]; then
		# Using the remote config file on the Pi which may be new or old format.
		MSG="Using existing ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_NAME}"
		if update_old "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}" ; then
			MSG+=" and converting to newest format."
		fi
		display_msg --logonly info "${MSG}"

	elif [[ ${CONFIG_TO_USE} == "remoteNew" ]]; then
		# Use the new remote config file since none were found locally.
		# Replace placeholders and convert it to the newest format.
		# Remember that the remote file name is different than what we store on the Pi.
		local FILE="${REMOTE_URL}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}"
		if ERR="$( wget -O "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}" "${FILE}" 2>&1 )"; then
			replace_website_placeholders "remote"
			update_old "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}"

			MSG="Downloaded '${FILE}' to '${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}'."
			display_msg --logonly info "${MSG}"
		else
			# This "shouldn't" happen since we either already checked that the file exists,
			# or we uploaded it.
			MSG="Failed to download '${FILE}'. Where did it go?"
			display_aborted "${MSG}" "${ERR}"
		fi
	fi

	update_json_file ".${WEBSITE_ALLSKY_VERSION}" "${ALLSKY_VERSION}" "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}"
	display_msg --logonly info "Updated remote configuration file to ${ALLSKY_VERSION}."
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
		HTTP_STATUS="$( curl -o /dev/null --head --silent --location --write-out "%{http_code}" "$url" )"

		local PRE_MSG="File '${FILE}'"
		if [[ ${HTTP_STATUS} == "200" ]] ; then
			show_debug_message "${PRE_MSG} exists on the remote server"
			RET_CODE=0
		else
			show_debug_message "${PRE_MSG} does not exist on the remote server (HTTP_STATUS=${HTTP_STATUS})"
			if [[ ${AND_OR} == "and" ]]; then
				return 1
			fi
		fi
	done

	return "${RET_CODE}"
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
			return
		fi
	fi

# TODO: This assumes ftp is used to upload files
# upload.sh should accept "--remove FILE" option.
	local CMDS=""  ERR
	[[ -n ${REMOTE_DIR} ]] && CMDS="cd '${REMOTE_DIR}' ;"
	CMDS+=" rm -r '${FILENAME}' ; bye"

	# shellcheck disable=SC2086
	ERR="$( lftp -u "${REMOTE_USER},${REMOTE_PASSWORD}" \
					${REMOTE_PORT} \
					"${REMOTE_PROTOCOL}://${REMOTE_HOST}" \
				-e "${CMDS}" 2>&1 )"
	if [[ $? -eq 0 ]] ; then
		MSG="Deleted remote file '${FILENAME}'"
	elif [[ ! ${ERR} =~ "550" ]]; then		# does not exist
		MSG="Unable to delete remote file '${FILENAME}': ${ERR}"
	else
		show_debug_message "'${FILENAME}' not on remote Website."
		return
	fi

	display_msg --logonly info "${MSG}"
}

# Check if a valid remote Website exists.
#
# If any of the ${CONFIG_FILES} files exist AND
# all of the ${WEBSITE_FILES} exist then assume the remote Website is valid.
#
# Returns - echo "true" if it exists, else "false"
function check_if_website_is_valid()
{
	local CONFIG_FILES=("${OLD_CONFIG_NAME}" "${ALLSKY_WEBSITE_CONFIGURATION_NAME}")
	local WEBSITE_FILES=("index.php" "functions.php")

	display_msg --logonly info "Looking for a config file at ${REMOTE_URL}"
	if check_if_files_exist "${REMOTE_URL}" "or" "${CONFIG_FILES[@]}" ; then
		local MSG="   Found a config file"

		if check_if_files_exist "${REMOTE_URL}" "and" "${WEBSITE_FILES[@]}" ; then
			display_msg --logonly info "${MSG} and a valid Website."
			echo "true"
			return 0
		else
			display_msg --logonly info "${MSG} but NOT a valid Website."
		fi
	else
		display_msg --logonly info "   Did not find a config file; assuming invalid site"
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

	local EXTRA_TEXT=""  EXCLUDE_FILES=""  MSG

	MSG="Starting upload to the remote Website"
	[[ -n ${REMOTE_DIR} ]] && MSG+=" in ${REMOTE_DIR}"
	if [[ ${REMOTE_WEBSITE_IS_VALID} == "true" ]]; then

		# Don't upload images if the remote Website exists (we assume it already
		# has the images).  "VALID" assumes "EXISTS".
		# However, we must upload the index.php files.
		EXCLUDE_FILES="--exclude-glob=*.jpg  --exclude-glob=*.mp4"

		MSG+=" (without videos, images, and their thumbnails)."
	else
		MSG+=" (including any videos, images, and their thumbnails)."
	fi
	display_msg --logonly info "${MSG}${EXTRA_TEXT}."

	MSG="\n${MSG}\n\nThis may take several minutes..."
	display_box "--infobox" "${DIALOG_INSTALL}" "${MSG}"

# TODO: upload.sh should have a "--mirror from_directory to_directory" option.
# This would also fix the problem that we're assuming the "ftp" protocol is used.
	local NL="$( echo -e "\n " )"		# Need space otherwise it doesn't work - not sure why
	local CMDS=" lcd '${ALLSKY_WEBSITE}'"
	CMDS+="${NL}set dns:fatal-timeout 10; set net:max-retries 2; set net:timeout 10"
	# shellcheck disable=SC2086
	if [[ -n "${REMOTE_DIR}" ]]; then
		CMDS+="${NL}cd '${REMOTE_DIR}'"
	else
		CMDS+="${NL}cd ."		# for debugging
	fi
	CMDS+="${NL}mirror --reverse --no-perms --verbose --overwrite --ignore-time --transfer-all"
	[[ -n ${EXCLUDE_FILES} ]] && CMDS+=" ${EXCLUDE_FILES}"
	CMDS+="${NL}bye"

	local TMP="${ALLSKY_TMP}/remote_upload.txt"
	echo -e "CMDS=${CMDS}\n======" > "${TMP}"
	# shellcheck disable=SC2086
	lftp -u "${REMOTE_USER},${REMOTE_PASSWORD}" \
		 ${REMOTE_PORT} "${REMOTE_PROTOCOL}://${REMOTE_HOST}" -e "${CMDS}" >> "${TMP}" 2>&1
	local RET_CODE=$?

	# Ignore stuff not supported by all FTP servers and stuff we don't want to see.
	local IGNORE="operation not supported|command not understood|hostname checking disabled|Overwriting old file"
	MSG="$( grep -v -i -E "${IGNORE}" "${TMP}" )"
	# If the "mirror" command causes any of the messages above,
	# they are counted as errors.
	if [[ ${RET_CODE} -ne 0 ]]; then
		MSG="$( echo -e "RET_CODE=${RET_CODE}\nCMDS=${CMDS}\n${MSG}" | sed -e 's/$/\\n/' )"
		display_aborted "while uploading Website" "${MSG}"
	fi

	display_msg --logonly info "$( indent --spaces "${MSG}" )"

	# Remove any old core files no longer required
	for FILE_TO_DELETE in "${OLD_FILES_TO_REMOVE[@]}"; do
		remove_remote_file "${FILE_TO_DELETE}" "do not check"
	done

	for FILE_TO_WARN in "${OLD_FILES_TO_WARN[@]}"; do
		if check_if_files_exist "${REMOTE_URL}" "or" "${FILE_TO_WARN}" ; then
			display_msg --logonly info "Old file '${FILE_TO_WARN}' exists."
			if [[ ${FILE_TO_WARN} == "myImages" ]]; then
# TODO: move the files for the user
				MSG="NOTE: move any files in '${FILE_TO_WARN}' on the remote Website to 'myFiles',"
				MSG+=" then remove '${FILE_TO_WARN}'.  It is no longer used."
			else
				MSG="NOTE: Please remove '${FILE_TO_WARN}' on the remote Website.   It is no longer used."
			fi
			display_box "--infobox" "${DIALOG_INSTALL}" "${MSG}"
		else
			display_msg --logonly info "Old file '${FILE_TO_WARN}' does not exist."
		fi
	done

	display_msg --logonly info "Website upload complete"
}

# Uploads the configuration file for the remote Website.
function upload_remote_config_file()
{
	local MSG

	if [[ ! -f "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}" ]]; then
		MSG="'${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}' not found!"
		display_msg --logonly info " ${MSG}"
		display_aborted "at the configuration file upload" "${MSG}"
		return 1
	fi

	MSG="\nUploading remote Allsky configuration file"
	display_box "--infobox" "${DIALOG_INSTALL}" "${MSG}"
	display_msg --logonly info "Uploading Website configuration file."

	local ERR="$( "${ALLSKY_SCRIPTS}/upload.sh" --remote-web --silent \
		"${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}" "${REMOTE_DIR}" \
		"${ALLSKY_WEBSITE_CONFIGURATION_NAME}" "remoteWebsiteInstall" 2>&1 )"
	if [[ $? -eq 0 ]]; then
		local R="${REMOTE_DIR}"
		[[ -n ${R} ]] && R+="/"
		MSG="'${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}' uploaded to"
		MSG+=" '${R}${ALLSKY_WEBSITE_CONFIGURATION_NAME}'"
		[[ ${DEBUG} == "true" && -n ${ERR} ]] && MSG+="  (${ERR})"
		display_msg --logonly info "${MSG}"
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

# Disable the remote Website.
function disable_remote_website()
{
	update_json_file ".useremotewebsite" "false" "${SETTINGS_FILE}"
	display_msg --logonly info "Remote Website temporarily disabled."
}
# Enable the remote Website.
function enable_remote_website()
{
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
disable_remote_website
upload_remote_website
upload_remote_config_file
enable_remote_website
display_complete
