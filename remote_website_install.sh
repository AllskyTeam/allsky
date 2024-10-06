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
DISPLAY_MSG_LOG="${ALLSKY_LOGS}/${ME}.log"

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

# logging options
LOG_TYPE="--logonly"

# Rempote connectivity variables
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

# Old Allksy files that should be remoevd if they exist
OLD_FILES_TO_REMOVE=("config.js" "configuration.json" "virtualsky.json")

# TODO: DO we want to do this or backup any old logs, its better to have a single  
# log per run rather than a file thats just appended to.

# Truncate log file
: > "${DISPLAY_MSG_LOG}"

############################################## functions

# Prompt the user to enter (y)/(yes) or (n)/(no)
# This function is only used when running in text (--text) mode
function enter_yes_no()
{
    local RESULT
    local ANSWER

    while true; do
        echo -e "$1"
        read -r -p "Do you want to continue? (y/n): " ANSWER
        ANSWER=$(echo "${ANSWER}" | tr '[:upper:]' '[:lower:]')

        if [[ "${ANSWER}" == "y" || "${ANSWER}" == "yes" ]]; then
            RESULT=0
            break
        elif [[ "${ANSWER}" == "n" || "${ANSWER}" == "no" ]]; then
            RESULT=1
            break
        else
            echo "Invalid response. Please enter y/yes or n/no."
        fi
    done

    return ${RESULT}
}

# prompt the user to press any key
# This function is only used when running in text (--text) mode
function press_any_key()
{
    echo -e "$1"
    echo "Press any key to continue..."
    read -r -n1 -s
}

# Adds the remote website URL to the dialog text
function add_dialog_heading()
{
    local DIALOG_TEXT=$1
    if [[ ${TEXT_ONLY} == "true" ]]; then
        DIALOG_RED="${RED}"
        DIALOG_NORMAL="${NC}"
    fi

    local PADDING=$(( ((DIALOG_WIDTH-6) - ${#REMOTE_URL}) / 2 ))
    local URL=$(printf "%${PADDING}s%s" "" "$REMOTE_URL")
    
    DIALOG_TEXT="\n${DIALOG_RED}${URL}${DIALOG_NORMAL}\n${DIALOG_TEXT}"

    echo "${DIALOG_TEXT}"
}
# Displays an info Dialog, or in text mode just displays the text
# $1 - The backtitle for the dialog
# $2 - The title for the dialog
# $3 - The text to disply in the dialog
#
# Returns - Nothing
function display_info_dialog()
{
    local DIALOG_TEXT=$3

    DIALOG_TEXT=$(add_dialog_heading "${DIALOG_TEXT}")
    if [[ ${TEXT_ONLY} == "false" ]]; then
        local BACK_TITLE=$1
        local DIALOG_TITLE=$2
        dialog \
            --colors\
            --backtitle "${BACK_TITLE}" \
            --title "${DIALOG_TITLE}" \
            --infobox "${DIALOG_TEXT}" ${DIALOG_HEIGHT} ${DIALOG_WIDTH}
    else
        echo -e "${DIALOG_TEXT}"
    fi

}

# Displays an prompt Dialog, or in text mode just displays the text
# and prompts the user to enter y or n
# $1 - The backtitle for the dialog
# $2 - The title for the dialog
# $3 - The text to disply in the dialog
#
# Returns - The exiit code (0 - Yes, >0 No)
function display_prompt_dialog()
{
    local DIALOG_TEXT=$3
    local RESULT

    DIALOG_TEXT=$(add_dialog_heading "${DIALOG_TEXT}")
    if [[ ${TEXT_ONLY} == "false" ]]; then
        local BACK_TITLE=$1
        local DIALOG_TITLE=$2
        dialog \
            --colors\
            --backtitle "${BACK_TITLE}" \
            --title "${DIALOG_TITLE}" \
            --yesno "${DIALOG_TEXT}" ${DIALOG_HEIGHT} ${DIALOG_WIDTH}
    else
        enter_yes_no "${DIALOG_TEXT}"
    fi

    RESULT=$?

    return ${RESULT}
}

# Displays an message Dialog, or in text mode just displays the text
# and prmots the user to press any key
# $1 - The backtitle for the dialog
# $2 - The title for the dialog
# $3 - The text to disply in the dialog
#
# Returns - Nothing
function display_message_box()
{
    local DIALOG_TEXT=$3

    DIALOG_TEXT=$(add_dialog_heading "${DIALOG_TEXT}")
    if [[ ${TEXT_ONLY} == "false" ]]; then
        local BACK_TITLE=$1
        local DIALOG_TITLE=$2
        dialog \
            --colors\
            --backtitle "${BACK_TITLE}" \
            --title "${DIALOG_TITLE}" \
            --msgbox "${DIALOG_TEXT}" ${DIALOG_HEIGHT} ${DIALOG_WIDTH}
    else
        press_any_key "${DIALOG_TEXT}"
    fi

}

# Displays a file Dialog, or in text mode just displays the file
# $1 - The backtitle for the dialog
# $2 - The title for the dialog
# $3 - The filename to display
#
# Returns - Nothing
function display_log_file()
{

    local FILENAME=$3

    if [[ ${TEXT_ONLY} == "false" ]]; then
        local BACK_TITLE=$1
        local DIALOG_TITLE=$2
        dialog \
            --clear\
            --colors\
            --backtitle "${BACK_TITLE}"\
            --title "${DIALOG_TITLE}"\
            --textbox "${FILENAME}" 22 77
    else
        cat "${FILENAME}"
    fi
}

# Runs the pre installation checks. This function will determine the following
# - Is there a remote website
# - Which configuration file to use for the remote website
#
# The configuration file to use is decided using the following, in order
# 
# If there is a remote-configuration.json in the /config folder then use it
# If there is a remote-configuration.json in the allsky-OLD/config folder then use it
# Otherwise
# If there is a remote website with a configuration.json file then save it in /config
# If there is a remote website and it has an old configuration file (config.js) then
# create a new remote-configuration.json in /config
#
function pre_install_checks()
{
    local MESSAGE=""

    local DIALOG_TEXT="\nRunning pre installation checks.\n\nPlease wait as this process can take a few minutes to complete.\n\n"
    DIALOG_TEXT+="\n1 - Checking for local files"
    display_info_dialog "${DIALOG_BACK_TITLE}" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"
    display_msg "${LOG_TYPE}" info "Start pre installation checks."


    if [[ -f "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}" ]]; then
        MESSAGE="Found current configuration file in ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}."
        display_msg "${LOG_TYPE}" progress "${MESSAGE}"
        HAVE_NEW_CONFIG="true"
    fi

    if [[ -f "${PRIOR_REMOTE_WEBSITE_CONFIGURATION_FILE}" ]]; then
        MESSAGE="Found -OLD configuration file in ${PRIOR_REMOTE_WEBSITE_CONFIGURATION_FILE}."
        display_msg "${LOG_TYPE}" progress "${MESSAGE}"
        HAVE_OLD_CONFIG="true"
    fi

    DIALOG_TEXT+="\n2 - Checking if remote website exists"
    display_info_dialog "${DIALOG_BACK_TITLE}" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"

    check_if_website_exists

    if [[ "${WEBSITE_EXISTS}" == "true" ]]; then

        DIALOG_TEXT+="\n3 - Checking for remote website configuration file"
        display_info_dialog "${DIALOG_BACK_TITLE}" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"

        local NEW_CONFIG_FILES=("configuration.json")
        check_if_files_exist "${REMOTE_URL}" "false" "${NEW_CONFIG_FILES[@]}"
        local NEW_CONFIG_FILE_EXISTS=$?
        if [[ ${NEW_CONFIG_FILE_EXISTS} -eq 0 ]]; then
            HAVE_NEW_REMOTE_CONFIG="true"
            MESSAGE="Found current configuration on the remote server."
            display_msg "${LOG_TYPE}" progress "${MESSAGE}"
        fi

        DIALOG_TEXT+="\n4 - Checking for old remote website configuration file"
        display_info_dialog "${DIALOG_BACK_TITLE}" "${DIALOG_PRE_CHECK}" "${DIALOG_TEXT}"

        local REALLY_OLD_CONFIG_FILES=("config.js")
        check_if_files_exist "${REMOTE_URL}" "false" "${REALLY_OLD_CONFIG_FILES[@]}"
        local OLD_CONFIG_FILE_EXISTS=$?
        if [[ ${OLD_CONFIG_FILE_EXISTS} -eq 0 ]]; then
            HAVE_REALLY_OLD_REMOTE_CONFIG="true"
            MESSAGE="Found really old format website configuration file on the remote website."
            display_msg "${LOG_TYPE}" progress "${MESSAGE}"
        fi
    fi

    if [[ "${HAVE_NEW_CONFIG}" == "true" ]]; then
        local EXTRA_TEXT="."
        if [[ "${HAVE_NEW_REMOTE_CONFIG}" == "true" ]]; then
            EXTRA_TEXT=", A remote configuration file was found but the local version will be used instead"
        fi
        display_msg "${LOG_TYPE}" progress "Will use the local remote configuration file${EXTRA_TEXT}"
        CONFIG_TO_USE="current"
        CONFIG_MESSAGE="Current"
    else
        if [[ "${HAVE_OLD_CONFIG}" == "true" ]]; then
            display_msg "${LOG_TYPE}" progress "Will use the -OLD configuration file, placeholders will be updated"
            CONFIG_TO_USE="old"
            CONFIG_MESSAGE="allsky-OLD"
        else
            if [[ "${WEBSITE_EXISTS}" == "true" ]]; then
                if [[ "${HAVE_NEW_REMOTE_CONFIG}" == "true" ]]; then
                    display_msg "${LOG_TYPE}" progress "Will use the new format website configuration file on the remote website, will be downloaded and saved locally"
                    CONFIG_TO_USE="remotenew"
                    CONFIG_MESSAGE="Remote new"
                else
                    if [[ "${HAVE_REALLY_OLD_REMOTE_CONFIG}" == "true" ]]; then
                        display_msg "${LOG_TYPE}" progress "Old config.js found. A new configuration file will be created and the user will have to updae it manually"
                        CONFIG_TO_USE="remotereallyold"  
                        CONFIG_MESSAGE=" repos config i.e. a new config"                          
                    fi
                fi
            fi
        fi
    fi

    if [[ "${CONFIG_TO_USE}" == "" ]]; then
        display_msg "${LOG_TYPE}" progress "Unable to determine the configuration file to use. A new one will be created"
        CONFIG_TO_USE="new"
    fi

    check_connectivity

    display_msg "${LOG_TYPE}" info "Completed pre installation checks."
}

# Displays the welcome dialog indicating what steps will be taken
function display_welcome()
{
    local CONTINUE=0

    if [[ ${TEXT_ONLY} == "true" ]]; then
        DIALOG_RED="${RED}"
        DIALOG_NORMAL="${NC}"
    fi

    if [[ ${AUTO_CONFIRM} == "false" ]]; then
        display_msg "${LOG_TYPE}" progress "Displayed the welcome dialog"
        display_prompt_dialog "${DIALOG_BACK_TITLE}" "${DIALOG_WELCOME_TITLE}" "\n\
 Welcome the the Allsky Remote Website Installer\n\n\
 This script will perform the following tasks\n\n\
 \
  1) Check the remote website connectivity - PASSED\n\
   2) Use the ${CONFIG_MESSAGE} Configuration file\n\
   3) Upload the remote website code\n\
   4) Upload the remote website configuration file\n
   5) Enable the remote website in the WebUI settings\n\n\
 \
 ${DIALOG_RED}WARNING:${DIALOG_NORMAL}\n\
  - This will overwrite files on the remote server\n\
  - REMOVE any old Allsky system files on the remote server.\n\n\
 Are you sure you wish to continue?"

        CONTINUE=$?
    else
        display_msg "${LOG_TYPE}" progress "Ignored welcome prompt as auto confirm option specified"
    fi

    if [[ ${CONTINUE} -ne 0 ]]; then
        display_aborted "at the Welcome dialog"
    fi
}

# Displays the aborted dialog. This is used when an error is encountered or the user cancels
# $1 - Extra text to display in the dialog
# $2 - "true"/"false" - Flag to indicate if the user should be prompted to show the installation log
function display_aborted()
{
    local EXTRA_TEXT=$1
    local SHOW_LOG=$2

    display_msg "${LOG_TYPE}" warning "USER ABORTED INSTALLATION ${EXTRA_TEXT}."
    ERROR_MSG="\nThe installation of the remote website has been aborted ${EXTRA_TEXT}."

    if [[ ${SHOW_LOG} == "true" ]]; then
        display_prompt_dialog "${DIALOG_BACK_TITLE}" "${DIALOG_INSTALL}" "${ERROR_MSG}\n\nWould you like to view the installation log?"
        local DISPLAY_LOG=$?
        if [[ ${DISPLAY_LOG} -eq 0 ]]; then
            display_log_file "${DIALOG_BACK_TITLE}" "${DIALOG_TITLE_LOG}" "${DISPLAY_MSG_LOG}"
        fi
    else
        display_info_dialog "${DIALOG_BACK_TITLE}" "${DIALOG_INSTALL}" "${ERROR_MSG}"
    fi
    exit 1
}

# Displays the completed dialog, used at the end of the installation process
function display_complete()
{
    local EXTRA_TEXT=""
    if [[ "${CONFIG_TO_USE}" == "new"  ]]; then
        EXTRA_TEXT="\nA new configuration file was created for the website. Please use the WebUI editor and replace any 'XX_NEED_TO_UPDATE_XX' with the correct values"
    fi
    if [[ "${CONFIG_TO_USE}" == "remotereallyold" ]]; then
        EXTRA_TEXT="\nSince you have a very old Allsky website a new configuration file was created for the website. Please use the WebUI editor and replace any 'XX_NEED_TO_UPDATE_XX' with the correct values"
    fi

    display_msg "${LOG_TYPE}" info "INSTALLATON COMPLETED.\n"
    display_info_dialog "${DIALOG_BACK_TITLE}" "${DIALOG_INSTALL}" "\n\
  The installation of the remote website has been completed.\n\n\
  Please use the editor in the Allsky WebUI to manage any changes to the\
  website.${EXTRA_TEXT}"

}

# Check connectivity to the remote website
function check_connectivity() 
{
    display_msg "${LOG_TYPE}" info "Checking remote website connectivity."
    "${ALLSKY_SCRIPTS}/testUpload.sh" --website --silent >> "${DISPLAY_MSG_LOG}" 2>&1
    RESULT=$?

    if [[ ${RESULT} -ne 0 ]]; then
        local ERROR_MSG="\nERROR: The remote website connectivity check failed. Result code ${RESULT} \n\nPlease check the 'Websites and Remote Server Settings' in the WebUI.\n\n\
 HOST: ${REMOTE_HOST} PROTOCOL: ${REMOTE_PROTOCOL}\n\
 USER: ${REMOTE_USER}\n\
 PASSWORD: ${REMOTE_PASSWORD}\n\
 FOLDER: ${REMOTE_DIR}"

        display_aborted "${ERROR_MSG}" "true"
    else
        local MESSAGE="The remote website connectivity test succeeded."
        display_msg "${LOG_TYPE}" info "${MESSAGE}"
        remove_remote_file "testUpload.sh.txt"
        show_debug_message "testUpload.sh.txt deleted from the remote server"
    fi
}

# Displays a debug message in the log if the debug flag has been specified on the command line
function show_debug_message() 
{
    if [[ ${DEBUG} == "true" ]]; then
        display_msg "${LOG_TYPE}" debug "${1}"
    fi
}

# Creates the remote website configuration file if needed, see 'pre_install_checks' for details on which configuration file
# is used
function create_website_config()
{  
    display_info_dialog "${DIALOG_BACK_TITLE}" "${DIALOG_INSTALL}" "\nCreating configuration file from ${CONFIG_MESSAGE}"
    display_msg "${LOG_TYPE}" info "Creating remote website configuration file"

    # We need a new config file so copy it from the repo and replace as many of the placeholders as we can
    if [[ "${CONFIG_TO_USE}" == "new" || "${CONFIG_TO_USE}" == "remotereallyold" ]]; then
        SOURCE_FILE="${ALLSKY_REPO}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}.repo"
        DEST_FILE="${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}"
        cp "${SOURCE_FILE}" "${DEST_FILE}"
        replace_website_placeholders "remote"
        display_msg "${LOG_TYPE}" info "Created a new ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_NAME} from the repo version and updating placeholders"
    fi

    # Use the current config file so do nothing
    if [[ "${CONFIG_TO_USE}" == "current" ]]; then
        display_msg "${LOG_TYPE}" info "Using the existing ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_NAME} remote configuration file so nothing created"
    fi

    # Use the config file from allsky-OLD, copy it and replace as many of the placeholders as we can
    if [[ "${CONFIG_TO_USE}" == "old" ]]; then
        cp "${PRIOR_REMOTE_WEBSITE_CONFIGURATION_FILE}" "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}"
        replace_website_placeholders "remote"
        display_msg "${LOG_TYPE}" info "Copying ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_NAME} from the allsky-OLD directory and updating placeholders"
    fi

    # Use the new remote config file since none were found locally
    if [[ "${CONFIG_TO_USE}" == "remotenew" ]]; then
        if [[ $( wget -O "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}" "${REMOTE_URL}/${ALLSKY_WEBSITE_CONFIGURATION_FILE}" ) -eq 0 ]]; then
            replace_website_placeholders "remote"
            display_msg "${LOG_TYPE}" info "Downloading ${ALLSKY_WEBSITE_CONFIGURATION_FILE} from ${REMOTE_URL}, creating a new ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}"
        else
            display_aborted "Failed to download ${ALLSKY_WEBSITE_CONFIGURATION_FILE} from ${REMOTE_URL}" "true"
        fi
    fi
}

# Check if a remote file, or array of files, exists via http
# $1 - The base url
# $2 - "true"/"false" If true then all files must exist, if "false" then any of the files can exist
#
# Returns - 0 if the file(s) exist, 1 if not
function check_if_files_exist()
{
    local URL=$1
    shift
    local AND=$1
    shift
    local RESULT=1

    for file in "$@"; do
        url="${URL}/${file}"
        http_status=$(curl -o /dev/null -s -w "%{http_code}" "$url")

        if [ "${http_status}" -eq 200 ]; then
            show_debug_message "File ${file} ${url} exists on the remote server"
            RESULT=0
        else
            show_debug_message "File ${file} ${url} doesnt exists on the remote server"
            if [[ $AND == "true" ]]; then
                RESULT=1
                break
            fi
        fi
    done

    return "${RESULT}"
}

# Deletes a file from the remote server. If a URL is specified then the file is first checked to make sure it exists
# $1 - The name of the file to delete
# $2 - The url of the remote website, used to check if a file exists
#
# Returns - Nothing
function remove_remote_file()
{
    local FILENAME=$1
    local URL=$2
    local CONTINUE="true"

    if [[ -n "${URL}" ]]; then
        check_if_files_exist "${REMOTE_URL}" "false" "${FILENAME}"
        local FILE_EXISTS=$?
        if [[ ${FILE_EXISTS} -ne 0 ]]; then
            CONTINUE="false"
        fi
    fi

    if [[ "${CONTINUE}" == "true" ]]; then
        lftp -u "${REMOTE_USER}","${REMOTE_PASSWORD}" "${REMOTE_PORT}" "${REMOTE_PROTOCOL}://${REMOTE_HOST}" -e "
            cd ${REMOTE_DIR}
            rm ${FILENAME}
            bye" > /dev/null 2>&1

        #TODO: Check response code
        display_msg "${LOG_TYPE}" info "Deleted file ${FILENAME} from ${REMOTE_HOST}"

    fi

}

# Check if a remote website exists. The check is done by looking for the following files
#
# If any of these files config.js, configuration.json, remote_configuration.json exist and
# all of these index.php, functions.php exist then assume we have a remote website
#
# Returns - 0 - Found a rempote website, 1 - No remote website found
function check_if_website_exists()
{
    local RESULT=1

    local CONFIG_FILES=("config.json" "configuration.json"  "remote_configuration.json")
    local WEBSITE_FILES=("index.php" "functions.php")

    check_if_files_exist "${REMOTE_URL}" "false" "${CONFIG_FILES[@]}"
    local CONFIG_FILE_EXISTS=$?

    if [[ ${CONFIG_FILE_EXISTS} -eq 0 ]]; then
        show_debug_message "Found remote website config file"

        check_if_files_exist "${REMOTE_URL}" "and" "${WEBSITE_FILES[@]}"
        local WEBSITE_EXISTS_RESULT=$?
        if [[ ${WEBSITE_EXISTS_RESULT} -eq 0 ]]; then
            display_msg "${LOG_TYPE}" progress "Found remote Allsky website at ${REMOTE_URL}"
            RESULT=0
            WEBSITE_EXISTS="true"
        fi
    fi

    return "${RESULT}"
}

# Uploads the webits code. The code is copied from ~/allsky/html/allsky and removes any old
# Allsky files that will no longer be needed
function upload_remote_website()
{
    if [[ ${SKIP_UPLOAD} == "false" ]]; then
        local CONTINUE=0
        local EXTRA_TEXT=""
        local EXCLUDE_FOLDERS=""

        if [[ ${REMOTE_PORT} -ne "" ]]; then
            REMOTE_PORT="-p ${REMOTE_PORT}"
        fi

        if [[ ${AUTO_CONFIRM} == "false" ]]; then
            display_prompt_dialog "${DIALOG_BACK_TITLE}" "${DIALOG_INSTALL}" "\nTo continue the Allsky website must be uploaded. This will overwrite ALL website files on the remote server and REMOVE any old Allsky files. \n\nAre you sure you wish to continue"
            CONTINUE=$?
            EXTRA_TEXT=", user agreed to upload and remove all old Allsky files"
        else
            show_debug_message "Ignored confirm website upload as auto confirm option specified"
            EXTRA_TEXT=", auto confirm option specified"
        fi

        if [[ ${CONTINUE} -eq 0 ]]; then

            local MESSAGE="Starting Upload of the remote website"

            if [[ ${WEBSITE_EXISTS} == "true" ]]; then
                EXCLUDE_FOLDERS="--exclude keograms --exclude startrails --exclude videos"
                MESSAGE+=", excluding videos, startrails and keograms as the website exists"
            fi

            display_msg "${LOG_TYPE}" progress "${MESSAGE}${EXTRA_TEXT}"
            display_info_dialog "${DIALOG_BACK_TITLE}" "${DIALOG_INSTALL}" "\n${MESSAGE}\n\nPlease wait this process could take several minutes"
            
            # Save the current stdout and stderr
            exec 3>&1 4>&2
            # Redirect both stdout and stderr to the log file, appending so we capture commands and files that are uploaded
            exec >> "$DISPLAY_MSG_LOG" 2>&1

            lftp -u "${REMOTE_USER}","${REMOTE_PASSWORD}" "${REMOTE_PORT}" "${REMOTE_PROTOCOL}://${REMOTE_HOST}" -e "
                lcd ${ALLSKY_WEBSITE}
                cd ${REMOTE_DIR}
                set dns:fatal-timeout 10
                set net:max-retries 2
                set net:timeout 10
                mirror --reverse --verbose --overwrite --ignore-time --transfer-all ${EXCLUDE_FOLDERS}
                quit"

            # Remove any old core files no longer required
            for FILE_TO_DELETE in "${OLD_FILES_TO_REMOVE[@]}"; do
                remove_remote_file "${FILE_TO_DELETE}" "${REMOTE_URL}"
            done

            # Restore stdout and stderr to the terminal
            exec 1>&3 2>&4
            display_msg "${LOG_TYPE}" progress "Website upload complete"
        else
            display_aborted "at the website upload"
        fi

    else
        display_msg "${LOG_TYPE}" info "Skipping upload as --skipupload provided on command line\n"
    fi
}

# Uploads the configuration file for the remote website.
function upload_config_file()
{
    display_info_dialog "${DIALOG_BACK_TITLE}" "${DIALOG_INSTALL}" "\nUploading remote Allsky configuration file"
    display_msg "${LOG_TYPE}" progress "Starting website configuration file upload"
    REMOTE_DIR="$( settings ".remotewebsiteimagedir" "${SETTINGS_FILE}" )"

    RESULT="$( "${ALLSKY_SCRIPTS}/upload.sh" --remote-web "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}" "${REMOTE_DIR}" "${ALLSKY_WEBSITE_CONFIGURATION_NAME}" )"
    if [[ ! ${RESULT}  ]]; then
        show_debug_message "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE} uploaded to ${REMOTE_DIR}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}"
        display_msg "${LOG_TYPE}" progress "Completed website configuration file upload"
    else
        display_aborted "at the configuration file upload" "true"
    fi
}

# Displays the scrips help
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
		echo "'--skipupload' Skips uploading of the remote website code. Must only be used if advised by Allsky support."
		echo
		echo "'--auto' Accepts all prompts by default"
		echo
		echo "'--text' Text only mode, do not use any dialogs"
        echo
	} >&2
	exit "${RET}"
}

# Enables the remote website
function enable_remote_website()
{
    display_info_dialog "${DIALOG_BACK_TITLE}" "${DIALOG_INSTALL}" "\nEnabling remote website"    
    update_json_file ".useremotewebsite" "true" "${SETTINGS_FILE}"
    display_msg "${LOG_TYPE}" info "Remote website enabled.\n"
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
	case "${ARG}" in
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

display_msg "${LOG_TYPE}" info "STARTING INSTALLATON AT $( date ).\n"
pre_install_checks
display_welcome
create_website_config
upload_remote_website
upload_config_file
enable_remote_website
display_complete