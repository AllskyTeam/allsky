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
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/checkFunctions.sh"			|| exit "${EXIT_ERROR_STOP}"

# display_msg() sends log entries to this file.
# shellcheck disable=SC2034
DISPLAY_MSG_LOG="${ALLSKY_LOGS}/${ME/.sh/}.log"

# Config variables
TESTUPLOAD_OUTPUT_FILE="${ALLSKY_TMP}/${ME}.txt"
HAVE_LOCAL_REMOTE_CONFIG="false"			# Is there a remote Website config file on the Pi?
HAVE_NEW_STYLE_REMOTE_CONFIG="false"		# Is there a new-style remote Website config file on the server?
HAVE_REALLY_OLD_REMOTE_CONFIG="false"		# Is there a old-style remote Website config file on the server?
CONFIG_TO_USE=""							# Which Website configuration file to use?
TEST_FILE="commands.txt"					# Name of file we try to upload
TEST_FILE_UPLOADED="false"					# Was the test upload successful?
UPLOAD_IMAGE_FILES="false"
GLOBAL_ERROR_MSG=""							# A global error message
INDENT="  "									# indent each line so it's easier to read
	# USER_AGENT is for servers that don't return anything to curl or wget.
USER_AGENT="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Edg/136.0.0.0"

# Get DIALOG_WIDTH and DIALOG_HEIGHT
calc_d_sizes

# Remote connectivity variables
REMOTE_WEBSITE_URL="$( settings ".remotewebsiteurl" "${ALLSKY_SETTINGS_FILE}" )"
REMOTE_WEBSITE_IMAGE_URL="$( settings ".remotewebsiteimageurl" "${ALLSKY_SETTINGS_FILE}" )"
REMOTE_USER="$( settings ".REMOTEWEBSITE_USER" "${ALLSKY_ENV}" )"
REMOTE_HOST="$( settings ".REMOTEWEBSITE_HOST" "${ALLSKY_ENV}" )"
REMOTE_PORT="$( settings ".REMOTEWEBSITE_PORT" "${ALLSKY_ENV}" )"
[[ -n ${REMOTE_PORT} ]] && REMOTE_PORT="-p ${REMOTE_PORT}"
REMOTE_PASSWORD="$( settings ".REMOTEWEBSITE_PASSWORD" "${ALLSKY_ENV}" )"
REMOTE_DIR="$( settings ".remotewebsiteimagedir" "${ALLSKY_SETTINGS_FILE}" )"
REMOTE_PROTOCOL="$( settings ".remotewebsiteprotocol" "${ALLSKY_SETTINGS_FILE}" )"
REMOTE_PROTOCOL="${REMOTE_PROTOCOL,,}"		# convert to lowercase



# Titles for various dialogs
# don't use:  DIALOG_BACK_TITLE="Allsky Remote Website Installer"
DIALOG_WELCOME_TITLE="Allsky Remote Website Installer"
DIALOG_PRE_CHECK="${DIALOG_WELCOME_TITLE} - Pre Installation Checks"
DIALOG_INSTALL="Installing Remote Website"
DIALOG_DONE="Remote Website Installation Completed"
DIALOG_ABORT="${DIALOG_WELCOME_TITLE} - Aborting"
DIALOG_TITLE_ERROR_MSG="Allsky Remote Website Detailed Error Message"
DIALOG_TEXT=""		# What's currently displayed

# Old Allksy Website files that should be removed if they exist.
# These were removed in v2024.12.06:
OLD_CONFIG_NAME="config.js"
OLD_FILES_TO_REMOVE=( \
	"${OLD_CONFIG_NAME}" \
	"${ALLSKY_WEBSITE_CONFIGURATION_NAME}" \
	"getTime.php" \
	"virtualsky.json" \
	"README.md" \
	"version" \
	"allsky-font.css" \
	".git/" )
# These moved in v2024.12.06_02 to separate directories:
OLD_FILES_TO_REMOVE+=( \
	"allsky.css" "animate.min.css" "bootstrap.min.css" \
	"controller.js" "moment.js" "ng-lodash.min.js")
FILES_TO_MOVE=( "analyticsTracking.js	myFiles" )	# A tab separates the names

############################################## functions



# Runs the pre installation checks to determine:
# - Is there a remote Website?
# - Which configuration file to use for the remote Website?
# The configuration file to use is decided using the following, in order:

# 1.  Make sure all the WebUI settings for the remote Website are set.
# 2.  If ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE} exists, use it.
# 3a. If there's a remote Website with a ${ALLSKY_WEBSITE_CONFIGURATION_NAME} file,
#     save it locally as ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE} and use it.
# 3b. If there is a remote Website with an old-style configuration file (${OLD_CONFIG_NAME}),
#     create a NEW ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE} and use it.
#     Don't bother trying to convert from old-style files.
function pre_install_checks()
{
	local MSG  DT  MISSING  ERROR_MSG=""  VALID_RET
	local SPACES="${INDENT}${INDENT} "

	display_msg --logonly info "Start pre installation checks."

 	DIALOG_TEXT="\n\n*****   Welcome to the Allsky Remote Website Installer!   *****\n\n"
	DIALOG_TEXT+="\nRunning pre installation checks:\n"

	DIALOG_TEXT+="\n1  - Checking that required settings exist: "
	display_box "--infobox" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"

	MISSING=0
	MSG=""
	if [[ -z ${REMOTE_PROTOCOL} ]]; then
		(( MISSING++ ))
		[[ -n ${MSG} ]] && MSG+=", "
		MSG+="Protocol"
	else
# TODO: create a function that checks for all variables for the specified protocol,
# and use it here, in upload.sh, and in checkAllsky.sh.
		case ${REMOTE_PROTOCOL} in
			s3)
# TODO s3 needs: AWS_CLI_DIR, S3_BUCKET, S3_ACL
				:
				;;
			gcs)
# TODO gcs needs: GCS_BUCKET, GCS_ACL
				:
				;;
			scp | rsync | *ftp*)
				if [[ (${REMOTE_PROTOCOL} == "scp" || ${REMOTE_PROTOCOL} == "rsync" ) &&
						-z ${SSH_KEY_FILE} ]]; then
					(( MISSING++ ))
					[[ -n ${MSG} ]] && MSG+=", "
					MSG+="SSH Key File"
				elif [[ -z ${REMOTE_PASSWORD} ]]; then
					(( MISSING++ ))
					[[ -n ${MSG} ]] && MSG+=", "
					MSG+="Password"
				fi

				if [[ -z ${REMOTE_USER} ]]; then
					(( MISSING++ ))
					[[ -n ${MSG} ]] && MSG+=", "
					MSG+="User Name"
				fi
				if [[ -z ${REMOTE_HOST} ]]; then
					(( MISSING++ ))
					[[ -n ${MSG} ]] && MSG+=", "
					MSG+="Server Name"
				fi
				;;
		esac
	fi

	if [[ -z ${REMOTE_WEBSITE_URL} ]]; then
		(( MISSING++ ))
		[[ -n ${MSG} ]] && MSG+=", "
		MSG+="Website URL"
	fi
	if [[ -z ${REMOTE_WEBSITE_IMAGE_URL} ]]; then
		(( MISSING++ ))
		[[ -n ${MSG} ]] && MSG+=", "
		MSG+="Image URL"
	fi

	if [[ ${MISSING} -eq 0 ]]; then
		DT="$( dO_ "PASSED" )"
		MSG="All necessary WebUI settings exist."
	else
		MSG="Missing setting(s) in WebUI:\n${SPACES}${SPACES}${MSG}"
		DIALOG_TEXT+="$( dE_ "${MSG}" )"
		display_box "--msgbox" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}" "--ok-label Exit"
		display_aborted "${MSG}"
	fi
	display_msg --logonly info "${MSG}"
	DIALOG_TEXT+="${DT}."
	display_box "--infobox" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"


	DIALOG_TEXT+="\n2  - Checking for remote Website configuration file on Pi: "
	display_box "--infobox" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"
	if [[ -f ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE} ]]; then
		DT="$( dO_ "PASSED" )"
		MSG="Found ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}."
		display_msg --logonly info "${MSG}"
		HAVE_LOCAL_REMOTE_CONFIG="true"
	else
		DT="NOT FOUND"		# Do not color - this isn't an error
		display_msg --logonly info "No local config file found."
	fi
	DIALOG_TEXT+="${DT}."
	display_box "--infobox" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"


	DIALOG_TEXT+="\n3  - Checking for working remote Website: "
	display_box "--infobox" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"
	check_if_website_is_valid		# Sets global variables so can't be in subshell
	VALID_RET=$?
	if [[ ${VALID_RET} -eq 0 ]]; then
		# There is at least one config file.

		DIALOG_TEXT+="$( dO_ "PASSED" )."
		display_box "--infobox" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"

		# 3a.
		DIALOG_TEXT+="\n${SPACES}* Checking for new-style configuration file: "
		display_box "--infobox" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"
		if [[ ${HAVE_NEW_STYLE_REMOTE_CONFIG} == "true" ]]; then
			DIALOG_TEXT+="$( dO_ "PASSED" )."
			display_box "--infobox" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"
		else
			# 3b.
			DIALOG_TEXT+="NOT FOUND."		# Do not color - this isn't an error
			display_box "--infobox" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"

			DIALOG_TEXT+="\n${SPACES}* Checking it for old-style configuration file: "
			display_box "--infobox" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"
			if [[ ${HAVE_REALLY_OLD_REMOTE_CONFIG} == "true" ]]; then
				DT="$( dO_ "PASSED" )."
			else
				# This "shouldn't" happen - the remote Website should have SOME type
				# of configuration file.
				DT="NOT FOUND."		# Do not color - this isn't an error
			fi
			DIALOG_TEXT+="${DT}"
			display_box "--infobox" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"
		fi
	else
		# No working remote Website found.
		DIALOG_TEXT+="$( dE_ "NOT WORKING." )"
		display_box "--infobox" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"

		if [[ ${VALID_RET} -eq ${EXIT_ERROR_STOP} ]]; then
			if [[ -n ${GLOBAL_ERROR_MSG} ]]; then
				MSG="${GLOBAL_ERROR_MSG}"
			else
				MSG="Can't connect to remote Website @ ${REMOTE_WEBSITE_URL}"
			fi

			DIALOG_TEXT+="$( dE_ "\n\n${MSG}\nCannot continue." )"
			display_box "--msgbox" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}" "--ok-label Exit"
			display_aborted "${MSG}"

		elif [[ ${HAVE_LOCAL_REMOTE_CONFIG} == "true" ]]; then
			# The remote's config file is on the Pi but the remote Website doesn't have a
			# config file and/or the Website source files.
			# This could happen if the user HAD a working remote Website but moved all the files to,
			# for example, "allsky/OLD", before upgrading.
			DIALOG_TEXT+="\n${SPACES}NOTE:"
			DIALOG_TEXT+="\n${SPACES}A remote configuration file exists but a working remote Website wasn't found."
			DIALOG_TEXT+="\n${SPACES}If you moved the remote Website before upgrading, ignore this message."
			DIALOG_TEXT+="\n${SPACES}Either way, a new Website will be created.\n"
			display_box "--infobox" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"
		else
			DIALOG_TEXT+="$( dE_ "\n${SPACES}WARNING: No configuration file found so a new one will be created." )"
		fi
	fi

	if [[ ${HAVE_LOCAL_REMOTE_CONFIG} == "true" ]]; then
		if [[ ${HAVE_NEW_STYLE_REMOTE_CONFIG} == "true" ]]; then
			MSG="A remote configuration file was found but using the local file instead."
		else
			MSG="Using the remote configuration file on the Pi (no remote file found)."
		fi
		display_msg --logonly info "${MSG}"
		CONFIG_TO_USE="local"	# it may be old or current format

	elif [[ ${HAVE_NEW_STYLE_REMOTE_CONFIG} == "true" ]]; then
		MSG="Using new-style remote Website configuration file;"
		MSG+=" it will be downloaded and saved locally."
		display_msg --logonly info "${MSG}"
		CONFIG_TO_USE="remote"

	elif [[ ${HAVE_REALLY_OLD_REMOTE_CONFIG} == "true" ]]; then
		MSG="Old ${OLD_CONFIG_NAME} found."
		MSG+=" Creating a new configuration file that the user must manually update."
		display_msg --logonly info "${MSG}"
		CONFIG_TO_USE="remoteReallyOld"

	else
		MSG="No configuration file found - a new one will be created."
		display_msg --logonly info "${MSG}"
		CONFIG_TO_USE="new"
	fi

	DIALOG_TEXT+="\n${SPACES}* Checking ability to upload to server: "
	display_box "--infobox" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"
	display_msg --logonly info "Checking upload to server with '${TEST_FILE}'."
	if MSG="$( check_upload )" ; then
		TEST_FILE_UPLOADED="true"
		DIALOG_TEXT+="$( dO_ "${MSG}" )."
		display_box "--infobox" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"
		show_debug_message "Uploading to the server worked."
	else
		MSG="$( remove_colors "${MSG}" )"
		display_msg --logonly info "Upload failed: ${MSG}"
		DIALOG_TEXT+="$( dE_ "FAILED" ):"
		# If the first line is empty, delete it.
		# Otherwise, add "\n" string to end of each line so it displays as
		# multi-line output in dialog box.
		MSG="$( echo "${MSG}" |
			gawk '{ if (NR==1 && $0=="") next; printf("%s\\n\n", $0); }')"
		# Add:  dE_ ""
		# because dialog colors don't work if there's a leading or trailing newline.
		DIALOG_TEXT+="\n\n$( dE_ "${MSG}" ; dE_ "" )"

		display_box "--infobox" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"
		MSG="$( < "${TESTUPLOAD_OUTPUT_FILE}" )"

		ERROR_MSG="Unable to upload a file to the server."
	fi

	display_msg --logonly info "Completed pre installation checks."

	# Prompt the user to continue.  This is so they can see the above messages.
	DIALOG_TEXT+="\n\n\n$( dU_ "${DIALOG_BLUE}Press OK to continue${DIALOG_NC}" )"
	display_box "--msgbox" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"

	if [[ -n ${ERROR_MSG} ]]; then
		display_aborted "${ERROR_MSG}" "${MSG}"
	fi
}

####
function prompt_to_upload()
{
	# Global: UPLOAD_IMAGE_FILES

	if [[ ${AUTO_CONFIRM} == "true" ]]; then
		display_msg --logonly info "Not prompting to upload - AUTO_CONFIRM enabled."
		UPLOAD_IMAGE_FILES="true"
		return
	fi

	# See if there are any local images or timelapse.
	local C  DIR  X  DEFAULT  COUNT=0
	for i in startrails keograms meteors videos
	do
		DIR="${ALLSKY_WEBSITE}/${i}"
		C=$( find "${DIR}" -type f \( -name '*.jpg' -o -name '*.png' -o -name '*.mp4' \) | wc -l )
		display_msg --logonly info "FOUND ${C} ${i} file(s)."
		(( COUNT += C ))
	done
	if [[ ${COUNT} -gt 0 ]]; then
		display_msg --logonly info "Prompting to upload the local images and videos."

		DIALOG_TEXT="\n\n\nYour local Allsky Website has"
		DIALOG_TEXT+="${DIALOG_BLUE}"
		DIALOG_TEXT+=" ${COUNT} startrails, keogram, meteor, and/or timelapse files."
		DIALOG_TEXT+=" ${DIALOG_NC}"
		X=""
		if [[ "$( settings ".uselocalwebsite" )" != "true" ]]; then
 			X="NOTE: your local Allsky Website is NOT enabled so those file may be old."
 			DIALOG_TEXT+="\n\n$( dE_ "(${X})" )"
		fi
 		DIALOG_TEXT+="\n\n$( dU_ "Do you want to upload them to the remote server?" )"
		DIALOG_TEXT+="\n\n\nThis will overwrite any files already there."
		DEFAULT="--defaultno"

		# shellcheck disable=SC2086
		if display_box "--yesno" "${DIALOG_WELCOME_TITLE}" "${DIALOG_TEXT}" ${DEFAULT} ; then
			UPLOAD_IMAGE_FILES="true"		# default is "false"
			display_msg --logonly info "User DOES want to upload local images and videos."
		else
			display_msg --logonly info "User does NOT want to upload local images and videos."
		fi
	else
		display_msg --logonly info "Not prompting to upload images and videos - no local files."
	fi
}


####
# Displays the welcome dialog indicating what steps will be taken
function display_welcome()
{
	if [[ ${AUTO_CONFIRM} == "false" ]]; then
		display_msg --logonly info "Displaying the welcome dialog."
		DIALOG_TEXT="\n This script will now:\n\n\
${INDENT} 1) Upload the new remote Website code.\n\
${INDENT} 2) Upload the remote Website's configuration file, keeping a copy on the Pi.\n\
${INDENT} 3) Enable the remote Website.\n"
		if [[ ${UPLOAD_IMAGE_FILES} == "true" ]]; then
			DIALOG_TEXT+="\
${INDENT} 4) Upload the local startrails, keograms, meteors, and/or\n\
${INDENT}          timelapse images.\n"
		else
			DIALOG_TEXT+="\
${INDENT} 4) NOTE: Any existing startrails, keograms, meteors, and/or\n\
${INDENT}          timelapse images will NOT be touched.\n"
		fi
		DIALOG_TEXT+="\n\
 $( dE_ "IMPORTANT NOTES:" )\n\
${INDENT}- Step 1 above will overwrite the remote Website's old Allsky web files since\n\
${INDENT}  they are no longer needed.  If you want to save them first,\n\
${INDENT}  select '< $( dE_ "N" )o  >' below, then save them and rerun this installation.\n\
${INDENT}- Obsolete Allsky files will be removed from the server.\n\n\n\
 $( dU_ "${DIALOG_BLUE}Continue?${DIALOG_NC}" )"
		if ! display_box "--yesno" "${DIALOG_WELCOME_TITLE}" "${DIALOG_TEXT}" ; then
			display_aborted "--user" "at the Welcome dialog" ""
		fi
	else
		display_msg --logonly info "Ignored welcome prompt as auto confirm option specified."
	fi
}

####
# Displays the aborted dialog. This is used when an error is encountered or the user cancels.
# ${1} - Extra text to display in the dialog
# ${2} - Error message (or "" if no error)
function display_aborted()
{
	local ABORT_MSG  MSG  DIALOG_PROMPT

	if [[ ${1} == "--user" ]]; then
		ABORT_MSG="USER ABORTED INSTALLATION"
		shift
	else
		ABORT_MSG="INSTALLATION ABORTED"
	fi
	local EXTRA_TEXT="${1}"
	local ERROR_MSG="${2}"

	display_msg --logonly info "${ABORT_MSG} ${EXTRA_TEXT}.\n"

	if [[ -n ${ERROR_MSG} ]]; then
		display_msg --logonly info "Asking user if they want to view error message."

		MSG="$( dE_ "Installation aborted:   ${EXTRA_TEXT}" )"
		DIALOG_PROMPT="\n\n${MSG}\n\n"
		DIALOG_PROMPT+="$( dU_ "Would you like to view the detailed error message?" )"
		if display_box "--yesno" "${DIALOG_ABORT}" "${DIALOG_PROMPT}" ; then
			ERROR_MSG="$( remove_colors "\n\n${ERROR_MSG}" )"
			display_box "--msgbox" "${DIALOG_TITLE_ERROR_MSG}" "${ERROR_MSG}" "--scrollbar"
		fi
	fi

	remove_upload_file

	clear	# Gets rid of background color from last 'dialog' command.

	if [[ -n ${ERROR_MSG} ]]; then
		display_msg --logonly error "${ERROR_MSG}"
	fi

	exit 1
}

####
# Displays the completed dialog, used at the end of the installation process.
function display_complete()
{
	local EXTRA_TEXT  E
	E="Go to the WebUI's 'Editor' page to confirm the settings are correct,"
	E+="\n${INDENT}and update as needed:"
	E+="\n\n${INDENT}    ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_NAME} (remote Allsky Website)"

	if [[ ${CONFIG_TO_USE} == "new"  ]]; then
		EXTRA_TEXT="A new configuration file was created."
		EXTRA_TEXT+="\n\n${INDENT}${E}"
	elif [[ ${CONFIG_TO_USE} == "remoteReallyOld" ]]; then
		EXTRA_TEXT="You had a very old remote Allsky Website so a new configuration file was created."
		EXTRA_TEXT+="\n\n${INDENT}${E}"
	else
		EXTRA_TEXT+="${E}"
	fi

	if [[ "$( settings ".showonmap" )" != "true" ]]; then
		local X="***************************************************************"
		EXTRA_TEXT+="\n\n\n${INDENT}${X}"
		EXTRA_TEXT+="$( dE_ "\n${INDENT}Please consider adding your camera to the Allsky Map." )"
		EXTRA_TEXT+="\n${INDENT}See the 'Allsky Map Settings' in the WebUI's 'Allsky Settings' page."
		EXTRA_TEXT+="\n${INDENT}${X}"
	fi

	DIALOG_TEXT="\n\n\n${INDENT}${DIALOG_BLUE}${DIALOG_BOLD}"
	DIALOG_TEXT+="The installation of the remote Website is complete."
	DIALOG_TEXT+="${DIALOG_NC}"
	DIALOG_TEXT+="\n\n\n${INDENT}${EXTRA_TEXT}"
	display_box "--msgbox" "${DIALOG_DONE}" "${DIALOG_TEXT}"

	clear	# Gets rid of background color from last 'dialog' command.
	display_msg progress "\nEnjoy your remote Allsky Website!\n\n${EXTRA_TEXT}\n"

	display_msg --logonly info "INSTALLATION COMPLETED.\n"
}

####
# Check if we can upload a file to the server.
# Return "" for success, else the error message.
function check_upload()
{
	local ERR  MSG  RET  SECS=30

	# Put command to test basic functionality.
	{
		echo "set	delete-commands	0"		# We'll delete the file when we're done.
		MSG="delete_files"
		for FILE_TO_DELETE in "${OLD_FILES_TO_REMOVE[@]}"; do
			MSG+="\t${FILE_TO_DELETE}"
		done
		echo -e "${MSG}"
		for FILE_TO_MOVE in "${FILES_TO_MOVE[@]}"; do
			echo -e "move_files\t${FILE_TO_MOVE}"
		done
	} > "${ALLSKY_TMP}/${TEST_FILE}"

	# Some user reported this hanging, so add a timeout.
	ERR="$( timeout --signal=KILL "${SECS}" \
		"${ALLSKY_SCRIPTS}/testUpload.sh" --frominstall --website --silent \
		--output "${TESTUPLOAD_OUTPUT_FILE}" --file "${ALLSKY_TMP}/${TEST_FILE}" 2>&1 )"
	RET=$?
	if [[ ${RET} -eq 0 ]]; then
		echo "PASSED"
		return 0
	elif [[ ${RET} -eq 137 ]]; then
		echo "TIMED OUT after ${SECS} seconds"
	else
		echo "${ERR}"
	fi

	return 1
}

####
# And remove the test file
function remove_upload_file()
{
	[[ ${TEST_FILE_UPLOADED} != "true" ]] && return

	local ERR  RET  MSG
	# Assume since we didn't time out on the test upload we won't time out here.
	# Put in background since it can take a few seconds and other things can go on
	# at the same time.
	{
		(
			ERR="$( remove_remote_file "${TEST_FILE}" "do not check" 2>&1 )"
			RET=$?
			if [[ ${RET} -ne 0 ]]; then
				if [[ -n ${ERR} ]]; then
					MSG="${ERR}, RET=${RET}"
				else
					MSG="Unable to delete test upload file for unknown reason, RET=${RET}"
				fi
				display_msg --logonly info "${MSG}"
			fi
		) &
	} 2>/dev/null	# so the job ID isn't displayed
}

####
# Displays a debug message in the log if the debug flag has been specified on the command line.
function show_debug_message()
{
	if [[ ${DEBUG} == "true" ]]; then
		display_msg --logonly debug "${1}"
	fi
}

####
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

####
# Creates the remote Website configuration file if needed.
# See 'pre_install_checks' for details on which configuration file is used.
function create_website_config()
{
	local MSG  ERR  DEST_FILE  FILE  VER  TEMP_CONFIG_FILE

	if [[ ${CONFIG_TO_USE} == "remote" ]]; then
		# Use the remote config file since none were found locally.
		# Convert it to the newest format.
		# Remember that the remote file name is different than what we store on the Pi.
		FILE="${REMOTE_WEBSITE_URL}"
		[[ ${FILE: -1:1} != "/" ]] && FILE+="/"
		FILE+="${ALLSKY_WEBSITE_CONFIGURATION_NAME}"
		TEMP_CONFIG_FILE="${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}-from_server" 
		if ERR="$( wget --tries=1 --user-agent="${USER_AGENT}" --no-verbose \
				-O "${TEMP_CONFIG_FILE}" "${FILE}" 2>&1)"; then

			# Some servers return javascript code to make sure a browser requested
			# the page.  If that's the case, ignore the remote file and use
			# the local one if present.

			# Look for a setting in the file we know will exist if the file is valid.
			if settings ".latitude" "${TEMP_CONFIG_FILE}" >/dev/null 2>&1 ; then
				rm -f "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}"
				mv "${TEMP_CONFIG_FILE}" "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}"
				chmod 664 "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}"
				sudo chgrp "${WEBSERVER_GROUP}" "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}"

				MSG="Downloaded remote '${ALLSKY_WEBSITE_CONFIGURATION_NAME}'"
				MSG+=" to '${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}'."
				display_msg --logonly info "${MSG}"

				update_old "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}"
			else
				# Got a file that's not the remote config file.
				if [[ ${HAVE_LOCAL_REMOTE_CONFIG} == "true" ]]; then
					CONFIG_TO_USE="local"
				else
					CONFIG_TO_USE="new"
				fi

				mv "${TEMP_CONFIG_FILE}" "${ALLSKY_TMP}"		# for possible debugging
				MSG="Downloaded remote configuration file appears corrupt; using ${CONFIG_TO_USE} file instead."
				display_msg --logonly info "${MSG}"
			fi

		else
			# This "shouldn't" happen since we either already checked that the file exists,
			# or we uploaded it.
			MSG="Failed to download '${FILE}'. Where did it go?"
			display_aborted "${MSG}" "${ERR}"
		fi
	fi

	# Don't use "elif" since CONFIG_TO_USE may have been modified above.
	if [[ ${CONFIG_TO_USE} == "local" ]]; then
		# Using the remote config file on the Pi which may be new or old format.
		MSG="Using existing ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_NAME}"
		if update_old "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}" ; then
			MSG+=" and converting to newest format."
		fi
		display_msg --logonly info "${MSG}"

	elif [[ ${CONFIG_TO_USE} == "new" || ${CONFIG_TO_USE} == "remoteReallyOld" ]]; then
		# Need a new config file so copy it from the repo and replace as many
		# placeholders as we can.
		DEST_FILE="${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}"
		cp "${REPO_WEBCONFIG_FILE}" "${DEST_FILE}"

		MSG="Creating a new ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_NAME}"
		MSG+=" from repo file and updating placeholders."
		display_msg --logonly info "${MSG}"

		if ! ERR="$( replace_website_placeholders "remote" )" ; then
			MSG="Unable to replace placeholders in new configuration file"
			display_aborted "${MSG}" "${ERR}"
		fi

		return
	fi


	VER="$( settings ".${WEBSITE_ALLSKY_VERSION}" "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}" )"
	if [[ ${VER} == "${ALLSKY_VERSION}" ]]; then
		display_msg --logonly info "'${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_NAME}' already at ${ALLSKY_VERSION}."
	else
		update_json_file ".${WEBSITE_ALLSKY_VERSION}" "${ALLSKY_VERSION}" "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}"
		display_msg --logonly info "Updated '${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_NAME}' to ${ALLSKY_VERSION}."
	fi
}

# Check if a remote file, or array of files, exist.
# ${1} - The base url
# ${2} - "and"/"or" If "and" then all files must exist, if "or" then any of the files can exist.
# ${3}... - the files
#
# Returns - 0 if the file(s) exist, 1 if ANY file doesn't exist.

####
function check_if_web_files_exist()
{
	local URL="${1}"
	local AND_OR="${2}"
	shift 2

	local url   HTTP_STATUS   RET   MSG
	local RET_CODE=1

	for FILE in "$@"; do
		url="${URL}/${FILE}"

		HTTP_STATUS="$( curl --user-agent "${USER_AGENT}" -o /dev/null --head --silent --show-error --location --write-out "%{http_code}" "${url}" 2>&1 )"
		RET=$?

		if [[ ${RET} -ne 0 || ${HTTP_STATUS} != "200" ]] ; then
			MSG="'${FILE}' DOES NOT EXIST on the remote Website (HTTP_STATUS=${HTTP_STATUS})"
			show_debug_message "${MSG}"

			[[ ${AND_OR} == "and" ]] && return 1
		else
			show_debug_message "'${FILE}' EXISTS on the remote Website"
			RET_CODE=0
		fi
	done

	return "${RET_CODE}"
}

####
# Deletes a file from the remote server.
# ${1} - The name of the file to delete
# ${2} - If set to "check", first check if the file exists
#
# Returns - Nothing
function remove_remote_file()
{
	local FILENAME="${1}"
	local CHECK="${2}"

	local CMDS  ERR  MSG  RET
	if [[ ${CHECK} == "check" ]]; then
		if ! check_if_web_files_exist "${REMOTE_WEBSITE_URL}" "or" "${FILENAME}" ; then
			return 0
		fi
	fi

# TODO: This assumes ftp is used to upload files
# upload.sh should accept "--remove FILE" option.
	CMDS="${LFTP_CMDS}; "
	[[ -n ${REMOTE_DIR} ]] && CMDS+="cd '${REMOTE_DIR}' ;"
	CMDS+="rm -r '${FILENAME}' ; bye"

	# shellcheck disable=SC2086
	ERR="$( lftp \
		-u "${REMOTE_USER},${REMOTE_PASSWORD}" \
		${REMOTE_PORT} \
		"${REMOTE_PROTOCOL}://${REMOTE_HOST}" \
		-e "${CMDS}" 2>&1 )"
	RET=$?
	if [[ ${RET} -eq 0 ]] ; then
		MSG="Deleted remote file '${FILENAME}'"
		[[ ${CHECK} != "check" ]] && MSG+=" (if it existed)"
		display_msg --logonly info "${MSG}"
		return 0

	elif [[ ! ${ERR} =~ "550" ]]; then		# does not exist
		MSG="Unable to delete remote file '${FILENAME}': ${ERR}"
		echo "${MSG}"
		display_msg --logonly info "${MSG}"
		return 1
	fi

	show_debug_message "'${FILENAME}' not on server."
	return "${RET}"
}

####
# Check if a valid remote Website exists.
# If any of the ${CONFIG_FILES} files exist AND
# all of the ${WEBSITE_FILES} exist then assume the remote Website is valid.
# Set global variables:
#	GLOBAL_ERROR_MSG
#	HAVE_REALLY_OLD_REMOTE_CONFIG
#	HAVE_NEW_STYLE_REMOTE_CONFIG

function check_if_website_is_valid()
{
	local WEBSITE_FILES=("index.php" "functions.php")
	local RET  MSG  SOME_CONFIG_FILE_FOUND="false"

	display_msg --logonly info "Checking connectivity to ${REMOTE_WEBSITE_URL}"
	GLOBAL_ERROR_MSG="$( _check_web_connectivity --url "${REMOTE_WEBSITE_URL}" --from "install" )"
	RET=$?
	if [[ ${RET} -ne 0 ]]; then
		if [[ ${RET} -eq "${EXIT_PARTIAL_OK}" ]]; then
			# We only have basic connectivity so the site is probably empty
			# so the checks for files below will fail.  Return now.
			MSG="Skipping remaining validity checks due to Basic Connectivity."
			display_msg --logonly info "${MSG}"
			return 0
		else
			display_msg --logonly info "${GLOBAL_ERROR_MSG}"
			return "${EXIT_ERROR_STOP}"
		fi
	fi

	display_msg --logonly info "Looking for old and new config files at ${REMOTE_WEBSITE_URL}"
	if check_if_web_files_exist "${REMOTE_WEBSITE_URL}" "or" "${OLD_CONFIG_NAME}" ; then
		display_msg --logonly info "   Found old-style '${OLD_CONFIG_NAME}."
		HAVE_REALLY_OLD_REMOTE_CONFIG="true"
		SOME_CONFIG_FILE_FOUND="true"
	else
		HAVE_REALLY_OLD_REMOTE_CONFIG="false"
	fi
	if check_if_web_files_exist "${REMOTE_WEBSITE_URL}" "or" "${ALLSKY_WEBSITE_CONFIGURATION_NAME}" ; then
		display_msg --logonly info "   Found new-style remote '${ALLSKY_WEBSITE_CONFIGURATION_NAME}'."
		HAVE_NEW_STYLE_REMOTE_CONFIG="true"
		SOME_CONFIG_FILE_FOUND="true"
	else
		HAVE_NEW_STYLE_REMOTE_CONFIG="false"
	fi

	if [[ ${SOME_CONFIG_FILE_FOUND} == "true" ]]; then
		# Check for a limited number of other files.
		# It's not worth checking if ALL files are there since we're going to overwrite them.
		if check_if_web_files_exist "${REMOTE_WEBSITE_URL}" "and" "${WEBSITE_FILES[@]}" ; then
			display_msg --logonly info "Remote Website is valid."
		else
			display_msg --logonly info "Remote Website is NOT valid."
			return 1
		fi
	else
		# If the user just created the "allsky" directory on the Website but nothing else,
		# we'll get here.
		MSG="   Did not find a config file on server; assuming new, unpopulated Website."
		display_msg --logonly info "${MSG}"
	fi

	return 0
}

####
# Uploads the remote Website's configuration file.
function upload_remote_configuration_file()
{
	local MSG  ERR

	if [[ ! -f "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}" ]]; then
		MSG="'${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}' not found!"
		display_msg --logonly info " ${MSG}"
		display_aborted "at the configuration file upload" "${MSG}"
		return 1
	fi

	DIALOG_TEXT="\n\n\nUploading remote Allsky configuration file..."
	display_box "--infobox" "${DIALOG_INSTALL}" "${DIALOG_TEXT}"
	display_msg --logonly info "Uploading Website configuration file."

	if ERR="$( "${ALLSKY_SCRIPTS}/upload.sh" --remote-web --silent \
			"${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}" "${REMOTE_DIR}" \
			"${ALLSKY_WEBSITE_CONFIGURATION_NAME}" "remoteWebsiteInstall" 2>&1 )" ; then
		R="${REMOTE_DIR}"
		[[ -n ${R} ]] && R+="/"
		MSG="'${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}' uploaded to"
		MSG+=" '${R}${ALLSKY_WEBSITE_CONFIGURATION_NAME}'"
		[[ ${DEBUG} == "true" && -n ${ERR} ]] && MSG+="  (${ERR})"
		display_msg --logonly info "${MSG}"
	else
		display_msg --logonly info " Failed: ${ERR}"
		display_aborted "at the configuration file upload" "${ERR}"
	fi

	DIALOG_TEXT+="$( dO_ " DONE" )"
}

####
# Uploads the Website code from ${ALLSKY_WEBSITE} and removes any old Allsky
# files that are no longer used.
function upload_remote_website()
{
	if [[ ${SKIP_UPLOAD} == "true" ]]; then
		display_msg --logonly info "Skipping upload per command-line request."
		return
	fi

	local EXTRA_TEXT=""  EXCLUDE_FILES=""  MSG  R

	DIALOG_TEXT="Starting upload to the remote Website"
	[[ -n ${REMOTE_DIR} ]] && DIALOG_TEXT+=" in ${REMOTE_DIR}"

	if [[ ${UPLOAD_IMAGE_FILES} == "true" ]]; then
		DIALOG_TEXT+=" (including videos, images, and their thumbnails)."
		MSG="This may take several minutes"
	else
		# Don't upload images if the remote Website exists (we assume it already
		# has the images).  "VALID" assumes "EXISTS".
		# However, we must upload the index.php files.
		EXCLUDE_FILES="--exclude-glob=videos/*.mp4"
		EXCLUDE_FILES+=" --exclude-glob=keograms/*.jpg"
		EXCLUDE_FILES+=" --exclude-glob=startrails/*.jpg"
		EXCLUDE_FILES+=" --exclude-glob=meteors/*.jpg"
		EXCLUDE_FILES+=" --exclude-glob=*/thumbnails/*.jpg"
		DIALOG_TEXT+=" (without videos, images, and their thumbnails)."
		MSG="This may take a minute or two"
	fi
	display_msg --logonly info "${DIALOG_TEXT}${EXTRA_TEXT}."

	DIALOG_TEXT="\n${DIALOG_TEXT}\n\n${MSG}..."
	display_box "--infobox" "${DIALOG_INSTALL}" "${DIALOG_TEXT}"

# TODO: upload.sh should have a "--mirror from_directory to_directory" option.
# This would also fix the problem that we're assuming the "ftp" protocol is used.
	local NL="$( echo -e "\n " )"		# Need space otherwise it doesn't work - not sure why
	local CMDS="${LFTP_CMDS}${NL}lcd '${ALLSKY_WEBSITE}'"
	# shellcheck disable=SC2086
	if [[ -n "${REMOTE_DIR}" ]]; then
		CMDS+="${NL}cd '${REMOTE_DIR}'"
	else
		CMDS+="${NL}cd ."		# for debugging - it lists the current directory
	fi
	CMDS+="${NL}mirror --reverse --no-perms --verbose --overwrite --ignore-time --transfer-all"
	[[ -n ${EXCLUDE_FILES} ]] && CMDS+=" ${EXCLUDE_FILES}"
	CMDS+="${NL}bye"

	local TMP="${ALLSKY_TMP}/remote_upload.txt"
	echo -e "CMDS=\n${CMDS}\n====== END OF CMDS" > "${TMP}"
	# shellcheck disable=SC2086
	lftp -u "${REMOTE_USER},${REMOTE_PASSWORD}" \
		 ${REMOTE_PORT} "${REMOTE_PROTOCOL}://${REMOTE_HOST}" -e "${CMDS}" >> "${TMP}" 2>&1
	local RET_CODE=$?

	# Ignore stuff not supported by all FTP servers and stuff we don't want to see.
	local IGNORE="operation not supported"
	IGNORE+="|command not understood"
	IGNORE+="|hostname checking disabled"
	IGNORE+="|Overwriting old file"
	MSG="$( grep -v -i -E "${IGNORE}" "${TMP}" )"
	# If the "mirror" command causes any of the messages above,
	# they are counted as errors.
	if [[ ${RET_CODE} -ne 0 ]]; then
		MSG="$( echo -e "RET_CODE=${RET_CODE}\nCMDS=${CMDS}\n${MSG}" | sed -e 's/$/\\n/' )"
		display_aborted "while uploading Website" "${MSG}"
	fi

	DIALOG_TEXT+="$( dO_ " DONE" )"
	display_box "--infobox" "${DIALOG_INSTALL}" "${DIALOG_TEXT}"

	display_msg --logonly info "$( indent --spaces "${MSG}" )"

	# Tell the server to remove files no longer required and move others.
	# The files are in the commands file that's on the server.
	# If no RESULTS, then the files didn't exist.
	local RESULTS="$( execute_web_commands "${REMOTE_WEBSITE_URL}" | sed -e 's/&nbsp;/ /g' -e 's/<br>//' )"
	if [[ -n ${RESULTS} ]]; then
		display_msg --logonly info "Moved/Removed:\n${RESULTS}"
	fi

	local DIR="myImages"
	if check_if_web_files_exist "${REMOTE_WEBSITE_URL}" "or" "${DIR}" ; then
		display_msg --logonly info "Old directory '${DIR}' exists on server."

		# It would be nice to move the files for the user,
		# but almost no one has a "myImages" directory.
 		DIALOG_TEXT="\n${INDENT}$( dE_ "NOTE:" )"
		DIALOG_TEXT+="\n${INDENT}Move any files in '${DIR}' on the remote Website to"
		DIALOG_TEXT+="\n${INDENT}the 'myFiles' directory, then remove '${DIR}'."
		DIALOG_TEXT+="\n${INDENT}It is no longer used."
		display_box "--msgbox" "${DIALOG_INSTALL}" "${DIALOG_TEXT}"
	else
		display_msg --logonly info "Old file '${DIR}' does not exist."
	fi

	display_msg --logonly info "Website upload complete"
}

####
# Displays the script's help.
function usage_and_exit()
{
	local RET=${1}

	local C MSG

	exec >&2
	if [[ ${RET} -eq 0 ]]; then
		C="${cYELLOW}"
	else
		C="${cRED}"
	fi

	MSG="Usage: ${ME} [--help] [--debug] [--skipupload] [-auto] [--text]"
	echo -e "\n${C}${MSG}${cNC}"
	echo "where:"
	echo "   --help         Displays this message and exits."
	echo "   --debug        Adds addtional debugging information to the installation log."
	echo "   --skipupload   Skips uploading of the remote Website code."
	echo "                  Must only be used if advised by Allsky support."
	echo "   --auto         Accepts all prompts by default"
	echo "   --text         Text only mode, do not use any dialogs"
	echo
	exit "${RET}"
}

####
# Disable the remote Website.
function disable_remote_website()
{
	update_json_file ".useremotewebsite" "false" "${ALLSKY_SETTINGS_FILE}"
	display_msg --logonly info "Remote Website temporarily disabled."
}
####
# Enable the remote Website.
function enable_remote_website()
{
	update_json_file ".useremotewebsite" "true" "${ALLSKY_SETTINGS_FILE}"
	display_msg --logonly info "Remote Website enabled."
}

####
function post_data()
{
	local MSG

	DIALOG_TEXT+="\n\nUploading data files to server..."
	display_box "--infobox" "${DIALOG_INSTALL}" "${DIALOG_TEXT}"

	# "--from install" only displays summary.
	MSG="$( "${ALLSKY_SCRIPTS}/postData.sh" --from install --allfiles 2>&1 )"
	display_msg --logonly info "${MSG}"

	DIALOG_TEXT+="$( dO_ " DONE" )"
	display_box "--infobox" "${DIALOG_INSTALL}" "${DIALOG_TEXT}"
}

####
function set_colors()
{
	if [[ ${TEXT_ONLY} == "true" ]]; then
		DIALOG_RED="${cRED}"
		DIALOG_NC="${cNC}"
	fi
}


############################################## main body

set_colors

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
			SKIP_UPLOAD="true"		# Don't upload ANY files except test file
			;;
		--auto)
			AUTO_CONFIRM="true"
			;;
		--text)
			TEXT_ONLY="true"
			;;
		*)
			E_ "\nUnknown argument: '${ARG}'."
			OK="false"
			;;
	esac
	shift
done

[[ ${HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" ]] && usage_and_exit 1

if [[ ${REMOTE_PROTOCOL} == "sftp" || ${REMOTE_PROTOCOL} == "ftp" || ${REMOTE_PROTOCOL} == "ftps" ]]; then
	LFTP_CMDS="set dns:fatal-timeout 10; set net:max-retries 2; set net:timeout 10"
	X="$( settings ".REMOTEWEBSITE_LFTP_COMMANDS" "${ALLSKY_ENV}" )"
	[[ -n ${X} ]] && LFTP_CMDS+="; ${X}"

elif [[ ${SKIP_UPLOAD} == "false" ]]; then
	#### TODO: this script needs to support ALL protocols, not just *ftp*.
	# When it does, remove this code and add "mirror" code to other protocols.
	exec >&2
	echo
	echo
	echo    "************* NOTICE *************"
	echo    "This script currently only supports ftp protocols."
	echo    "Support for the '${REMOTE_PROTOCOL}' protocol will be added in the future."
	echo
	echo

	echo    "***** WORKAROUND:"
	echo    "If you are able to manually copy the files and directories in"
	echo    "'${ALLSKY_WEBSITE}' to the remote Website, do that, then run this on the Pi:"
	echo    "   cd ~/allsky"
	echo    "   ./${ME} --skipupload"
	echo
	echo    "If that is successful and you can access the remote Website,"
	echo	"remove these files from the server:"
	for i in "${OLD_FILES_TO_REMOVE[@]}"; do
		[[ ${i} != "${ALLSKY_WEBSITE_CONFIGURATION_NAME}" ]] && echo "   ${i}"
	done
	echo
	echo    "*****"
	echo
	echo    "If you are unable to perform the WORKAROUND and"
	echo    "you have an existing remote Allsky Website, it should continue to work."
	echo

	exit 0
fi
display_msg --logonly info "STARTING INSTALLATION.\n"

pre_install_checks
prompt_to_upload
display_welcome
create_website_config
disable_remote_website
upload_remote_website
upload_remote_configuration_file
enable_remote_website
post_data
remove_upload_file
display_complete
