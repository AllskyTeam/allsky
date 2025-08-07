#!/bin/bash
# shellcheck disable=SC2154		# referenced but not assigned

[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/../.." )"
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

TITLE_LOGIN_DISABLED="Use WebUI Login"
MSG_LOGIN_DISABLED="You are not currently using the WebUI login. Would you like to enable it?\n\n
If you plan to expose your PI to the internet it is highly recommended that you use the WebUI login\n\n
Selecting 'No' will terminate this script"
TITLE_DEFAULT="Security Warning"
MSG_DEFAULT="You are using the default username or password which is NOT recommened.\n\nPlease change them using the following prompts\n\nPress 'Ok' to continue"
MSG_USERNAME="Enter your username"
MSG_PASSWORD="Enter your password"
MSG_PASSWORD_REENTER="Re enter your password"
TITLE_INVALID_PASSWORD="Invalid Password"
TITLE_PASSWORDS_DONTMATCH="Password Error"
MSG_PASSWORDS_DONTMATCH="The entered passwords do not match"
TITLE_USE_ONLINE="Online Access"
MSG_USE_ONLINE="Do you intend to enable external access to this Pi?\n\n
If you select 'Yes' then a stronger password requirement will be enforced\n\n"
TITLE_LEGACY_EXISTS="Warning"
MSG_LEGACY_EXISTS="The legacy authentication file still exists but you are using the new authentication mechanism\n\n
Select 'Ok' to delete the legacy authentication file"
MSG_LEGACY_CONVERT="Your login credentails require upgrading ot the latest format\n\nPress 'Ok' to perform the upgrade"
MSG_LEGACY_DEFAULT="Your login credentails require upgrading ot the latest format\n\nPress 'Ok' to perform the upgrade"
TITLE_COMPLETE="Credentials Updated"
MSG_COMPLETE="Your username and password have been updated. The next time you refresh the WebUI you will be asked for the new credentials"
MIN_ALLSKY_VERSION=2024.12.06

####
# Create a password hash.
# This is separated out into a function so that we can easily change the
# method used to create the hash
#
function hash_password()
{
    local NEW_ADMIN_PASSWORD="${1}"
    php -r "echo password_hash('${NEW_ADMIN_PASSWORD}', PASSWORD_BCRYPT);"
}

####
# Displays a debug message in the log if the debug flag has been specified on the command line.
function show_debug_message()
{
    local MESSAGE MESSAGE_TYPE

    MESSAGE="${1}"
	MESSAGE_TYPE="${2:-debug}"

	if [[ ${DEBUG} == "true" ]]; then
		display_msg --logonly "${MESSAGE_TYPE}" "${MESSAGE}"
	fi
}

####
# Check if a plan text and hashed password match
#
function check_password_match()
{
    local PLAIN_PASSWORD="${1}"
    local BCRYPT_PASSWORD="${2}"
    local RESULT

    RESULT=$(php -r "echo password_verify('${PLAIN_PASSWORD}', '${BCRYPT_PASSWORD}');")

    if [[ ${RESULT} -eq 1 ]]; then
        echo true
    else
        echo false
    fi
}

####
# Simple check to ensure password is secure
#
function validate_password() 
{
    local MESSAGE RESULT OPTION

    OPTION=""
    if [[ "${NOSECURE}" == "true" ]]; then
        OPTION="--nosecure"
    fi
    MESSAGE="$( "${ALLSKY_UTILITIES}/validatePassword.sh" --password "$1" "${OPTION}" )"
    RESULT=$?
    echo "${MESSAGE}"
    return "${RESULT}"
}

function display_prompt()
{
    local DIALOG_TYPE="${1}"
    local DIALOG_TITLE="${2}"
    local DIALOG_MESSAGE="${3}"
    local DIALOG_HEIGHT="${4}"
    local DIALOG_WIDTH="${5}"
    local USE_ECHO="${6}"

    if [[ "${TEXTMODE}" == "false" ]]; then
        [[ -z ${DIALOG_HEIGHT} ]] && DIALOG_HEIGHT=10
        [[ -z ${DIALOG_WIDTH} ]] && DIALOG_WIDTH=50

        dialog --title "${DIALOG_TITLE}" "${DIALOG_TYPE}" "${DIALOG_MESSAGE}" "${DIALOG_HEIGHT}" "${DIALOG_WIDTH}" 3>&1 1>&2 2>&3
    else
        DIALOG_MESSAGE="${DIALOG_MESSAGE//Press \'Ok\'/Press Enter}"
        if [[ "${DIALOG_TYPE}" == "--msgbox" ]]; then
            echo -e "${DIALOG_MESSAGE}"
            if [[ -z ${USE_ECHO} ]]; then
                read -n 1 -s -r
            fi
        elif [[ ${DIALOG_TYPE} == "--yesno" ]]; then
            while true; do
                echo -e "${DIALOG_MESSAGE}"
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
            echo -e "${DIALOG_MESSAGE}"
            read -n 1 -s -r -p "Press any key to continue..."
            echo -e "\n\n"
        fi
    fi
}

function display_input()
{
    local DIALOG_TYPE DIALOG_MESSAGE DIALOG_HEIGHT DIALOG_WIDTH INPUT_VALUE PROMPT
    DIALOG_TYPE="${1}"
    DIALOG_MESSAGE="${2}"
    DIALOG_HEIGHT="${3}"
    DIALOG_WIDTH="${4}"
    INPUT_VALUE="${5}"

    if [[ ${TEXTMODE} == false ]]; then
        LAST_INPUT=$(dialog "${DIALOG_TYPE}" "${DIALOG_MESSAGE}" "${DIALOG_HEIGHT}" "${DIALOG_WIDTH}" "${INPUT_VALUE}" 3>&1 1>&2 2>&3)
        STATUS=$?
    else
        DIALOG_MESSAGE="${DIALOG_MESSAGE//Press \'Ok\'/Press Enter}"
        if [[ -n ${INPUT_VALUE} ]]; then
            PROMPT="${DIALOG_MESSAGE} (${INPUT_VALUE})"
        else
            PROMPT="${DIALOG_MESSAGE}"
        fi
        echo -e "${PROMPT} "
        read -r LAST_INPUT

        [[ -z ${LAST_INPUT} ]] && LAST_INPUT="${INPUT_VALUE}"
        STATUS=0
    fi

    return "${STATUS}"
}

function get_input() 
{
    local DIALOG_TYPE DIALOG_MESSAGE DIALOG_HEIGHT DIALOG_WIDTH INPUT_VALUE PASSWORD CONFIRM_PASSWORD FORCE_DIALOG_TYPE
    DIALOG_TYPE="${1}"
    DIALOG_MESSAGE="${2}"
    DIALOG_HEIGHT="${3}"
    DIALOG_WIDTH="${4}"
    INPUT_VALUE="${5}"    

	[[ -z ${DIALOG_HEIGHT} ]] && DIALOG_HEIGHT=10
	[[ -z ${DIALOG_WIDTH} ]] && DIALOG_WIDTH=50

    if [[ ${DIALOG_TYPE} == "--passwordbox" ]]; then
        FORCE_DIALOG_TYPE="--inputbox"
    else
        FORCE_DIALOG_TYPE="${DIALOG_TYPE}"
    fi

    if [[ ${DIALOG_TYPE} == "--passwordbox" && ${DOUBLE_ENTRY_PASSWORD} == "true" ]]; then
        while true; do
            while true; do
                display_input "${FORCE_DIALOG_TYPE}" "${DIALOG_MESSAGE}\n${PASSWORD_FORMAT}" "${DIALOG_HEIGHT}" "${DIALOG_WIDTH}" ""
                STATUS=$?
                PASSWORD="${LAST_INPUT}"
                [[ ${STATUS} -ne 0 ]] && return 1

                PASSWORD_STATUS="$( validate_password "${PASSWORD}" )" || break
                display_prompt "--msgbox" "${TITLE_INVALID_PASSWORD}" "${PASSWORD_STATUS}" "" "" "true"
                INPUT_VALUE="${PASSWORD}"
            done

            display_input "${FORCE_DIALOG_TYPE}" "${MSG_PASSWORD_REENTER}\n${PASSWORD_FORMAT}" "${DIALOG_HEIGHT}" "${DIALOG_WIDTH}" ""
            STATUS=$?
            CONFIRM_PASSWORD="${LAST_INPUT}"
			[[ ${STATUS} -ne 0 ]] && return 1

            if [[ ${PASSWORD} == "${CONFIRM_PASSWORD}" ]]; then
                RESULT="${PASSWORD}"
                break
            else
                display_prompt "--msgbox" "${TITLE_PASSWORDS_DONTMATCH}" "${MSG_PASSWORDS_DONTMATCH}"  "" "" "true"
            fi
            INPUT_VALUE="${PASSWORD}"
        done
    else
        while true; do
            display_input "${FORCE_DIALOG_TYPE}" "${DIALOG_MESSAGE}" "${DIALOG_HEIGHT}" "${DIALOG_WIDTH}" "${INPUT_VALUE}"
            STATUS=$?
            [[ ${STATUS} -ne 0 ]] && return 1

            if [[ "${DIALOG_TYPE}" == "--passwordbox" ]]; then
                PASSWORD_STATUS="$( validate_password "${LAST_INPUT}" )" && break
                display_prompt "--msgbox" "${TITLE_INVALID_PASSWORD}" "${PASSWORD_STATUS}"
                INPUT_VALUE="${LAST_INPUT}"
            else
                break
            fi
        done
        RESULT="${LAST_INPUT}"
    fi

    LAST_INPUT="${RESULT}"
    return "${STATUS}"
}

####
# Configures the WebUI login details
#
set_admin_password() 
{
    local DEFAULT_ADMIN_USER ADMIN_USER ADMIN_PASSWORD USE_LOGIN
    local NEW_ADMIN_USER NEW_ADMIN_PASSWORD

    DEFAULT_ADMIN_USER="admin"    
    ADMIN_USER="$( settings ".WEBUI_USERNAME" "${ALLSKY_ENV}" )"
    ADMIN_PASSWORD="$( settings ".WEBUI_PASSWORD" "${ALLSKY_ENV}" )"
    USE_LOGIN="$( settings ".uselogin" "${ALLSKY_SETTINGS_FILE}" )"
    PASSWORD_MATCH=$( check_password_match "secret" "${ADMIN_PASSWORD}" )

    show_debug_message "Current WebUI User: (${ADMIN_USER})"
    show_debug_message "Using WebUI Login: (${USE_LOGIN})"
    show_debug_message "Using default password: (${PASSWORD_MATCH})"

    if [[ $USE_LOGIN != "true" ]]; then
        if display_prompt "--yesno" "${TITLE_LOGIN_DISABLED}" "${MSG_LOGIN_DISABLED}" 15; then
            # shellcheck disable=SC2034
            USE_WEBUI_LOGIN="true"; doV "" "USE_WEBUI_LOGIN" "uselogin" "boolean" "${ALLSKY_SETTINGS_FILE}"
        else
            display_msg --logonly info "User declined to enable WebUI login so aborted"
            exit 1
        fi
    fi

    # if secure password option is not passed then ask the user if they will be using the pi
    # online. If they will then a stricter password policy is enforced
    if [[ ${HAVE_NO_SECURE} == "false" ]]; then
        if [[ ${IGNORE_ONLINE} == "false" ]]; then
            if display_prompt "--yesno" "${TITLE_USE_ONLINE}" "${MSG_USE_ONLINE}" 10; then
                # shellcheck disable=SC2034
                NOSECURE="false"
                display_msg --logonly info "User has selected 'Yes' to having online access to the Pi"
                display_msg --logonly info "Forcing secure passwords"
            else
                display_msg --logonly info "User has selected 'No' to having online access to the Pi"
                display_msg --logonly info "Allowing insecure passwords"
                NOSECURE="true"
                PASSWORD_FORMAT=""                
            fi
        fi
    fi

    if [[ ${DEFAULT_ADMIN_USER} == "${ADMIN_USER}" || ${PASSWORD_MATCH} == "true" ]]; then
        display_prompt "--msgbox" "${TITLE_DEFAULT}" "${MSG_DEFAULT}"
    fi

    get_input "--inputbox" "${MSG_USERNAME}" 8 40 "${ADMIN_USER}" false
    STATUS=$?
    NEW_ADMIN_USER="${LAST_INPUT}"
    if [[ ${STATUS} -ne 0 ]]; then
        display_msg --logonly info "User canceled at username prompt"
        exit 99
    fi

    HEIGHT=15
    if [[ ${NOSECURE} == "true" ]]; then
        HEIGHT=8
    fi
    get_input "--passwordbox" "${MSG_PASSWORD}" "${HEIGHT}" 50 "" false
    STATUS=$?
    NEW_ADMIN_PASSWORD="${LAST_INPUT}"        
    if [[ ${STATUS} -ne 0 ]]; then
        display_msg --logonly info "User canceled at password prompt"
        exit 98
    fi


    # shellcheck disable=SC2034
    PASSWORD_HASH="$( hash_password "${NEW_ADMIN_PASSWORD}" )"

    doV "" "NEW_ADMIN_USER" "WEBUI_USERNAME" "text" "${ALLSKY_ENV}"
    doV "" "PASSWORD_HASH" "WEBUI_PASSWORD" "text" "${ALLSKY_ENV}"

	if [[ ${ENABLELOGIN} == "true" ]]; then
        # shellcheck disable=SC2034	
		USE_WEBUI_LOGIN="true"; doV "" "USE_WEBUI_LOGIN" "uselogin" "boolean" "${ALLSKY_SETTINGS_FILE}"
	fi

    show_debug_message "Password details updated" "info"
    show_debug_message "Old Admin User: ${ADMIN_USER}"
    show_debug_message "New Admin User: ${NEW_ADMIN_USER}"
    show_debug_message "New Admin Password Hash: ${PASSWORD_HASH}"

    display_prompt "--msgbox" "${TITLE_COMPLETE}" "${MSG_COMPLETE}"
}

####
# Checks the current authentication method and upgrades it if required
#
check_and_update_auth_method() 
{
    local PASSWORD_HASH

    RASPAP_FILE="${ALLSKY_CONFIG}/raspap.auth"
    RASPAP_FILE_EXISTS="false"
    if [[ -e ${RASPAP_FILE} ]]; then
        RASPAP_FILE_EXISTS="true"
    fi

    WEBUI_USERNAME_EXISTS="true"
    TEMP="$( settings --null .WEBUI_USERNAME "${ALLSKY_ENV}" )"
    if [[ ${TEMP} == "null" ]]; then
        WEBUI_USERNAME_EXISTS="false"
    fi
    WEBUI_PASSWORD_EXISTS="true"
    TEMP="$( settings --null .WEBUI_PASSWORD "${ALLSKY_ENV}" )"
    if [[ ${TEMP} == "null" ]]; then
        WEBUI_PASSWORD_EXISTS="false"
    fi

    show_debug_message "raspap.auth file exists: (${RASPAP_FILE_EXISTS})"
    show_debug_message "WEBUI_USERNAME Setting exists: (${WEBUI_USERNAME_EXISTS})"
    show_debug_message "WEBUI_PASSWORD Setting exists: (${WEBUI_PASSWORD_EXISTS})"

    # If both old and new auth systems exists then delete the old as we must be using the new!
    # If called from the Allsky install script do it anyway
    if [[ ${RASPAP_FILE_EXISTS} == "true" && ${WEBUI_USERNAME_EXISTS} == "true" && ${WEBUI_PASSWORD_EXISTS} == "true" ]]; then
            if [[ ${FROM_INSTALLER} == "false" ]]; then
                display_prompt "--msgbox" "${TITLE_LEGACY_EXISTS}" "${MSG_LEGACY_EXISTS}"
            fi
            sudo rm -f "${RASPAP_FILE}" >/dev/null 2>&1
            show_debug_message "Legacy password file deleted. New system in use but file still existed"
    else
        # If old auth method exists but not the new env.json settings then convert the auth method
        if [[ ${RASPAP_FILE_EXISTS} == "true" && ${WEBUI_USERNAME_EXISTS} == "false" && ${WEBUI_PASSWORD_EXISTS} == "false" ]]; then
            if [[ ${FROM_INSTALLER} == "false" ]]; then
                display_prompt "--msgbox" "${TITLE_LEGACY_EXISTS}" "${MSG_LEGACY_CONVERT}"
            fi

            {
                # shellcheck disable=SC2034
                read -r RASPAP_USER
                # shellcheck disable=SC2034
                read -r RASPAP_PASSWORD
            } < "${RASPAP_FILE}" >/dev/null 2>&1
            doV "" "RASPAP_USER" "WEBUI_USERNAME" "text" "${ALLSKY_ENV}"
            doV "" "RASPAP_PASSWORD" "WEBUI_PASSWORD" "text" "${ALLSKY_ENV}"
            sudo rm -f "${RASPAP_FILE}" >/dev/null 2>&1
            show_debug_message "Legacy auth converted to new auth and legacy auth file deleted"
        else
            # No authentiation and no settings, probably never changed the webui password
            if [[ ${RASPAP_FILE_EXISTS} == "false" && ${WEBUI_USERNAME_EXISTS} == "false" && ${WEBUI_PASSWORD_EXISTS} == "false" ]]; then
                if [[ ${FROM_INSTALLER} == "false" ]]; then
                    display_prompt "--msgbox" "${TITLE_LEGACY_EXISTS}" "${MSG_LEGACY_DEFAULT}"
                fi

                # shellcheck disable=SC2034
                DEFAULT_PASSWORD="$( hash_password "secret" )"
                # shellcheck disable=SC2034
                DEFAULT_USER="admin"; doV "" "DEFAULT_USER" "WEBUI_USERNAME" "text" "${ALLSKY_ENV}"
                doV "" "DEFAULT_PASSWORD" "WEBUI_PASSWORD" "text" "${ALLSKY_ENV}"

                show_debug_message "Default authentication created as no raspap.auth file found and no env.json settings"
            fi
        fi
    fi
}

####
# Check we have the right verion of Allsky before proceeding
function check_allsky_version()
{
    TITLE_INVALID_VERSION="Incompatability Error"
    # shellcheck disable=SC2119
    CURRENT_VERSION="$( get_version )"
    # Remove any minor revisions
    CURRENT_VERSION="${CURRENT_VERSION%_*}"
    dpkg --compare-versions "${CURRENT_VERSION:1}" ge "${MIN_ALLSKY_VERSION}"
    OK_TO_PROCEED=$?

    if [[ ${OK_TO_PROCEED} == "1" ]]; then
    
        MSG_INVALID_VERSION="This script requires Allsky version ${MIN_ALLSKY_VERSION} or greater, your version is ${CURRENT_VERSION}"
        show_debug_message "${MSG_INVALID_VERSION}"
        display_prompt "--msgbox" "${TITLE_INVALID_VERSION}" "${MSG_INVALID_VERSION}"
        exit 1
    else
        show_debug_message "Allsky version ok, requires ${MIN_ALLSKY_VERSION} found ${CURRENT_VERSION}"
    fi
}

####
# Display script usage information
function usage_and_exit()
{
	local RET=${1}
	exec >&2
	echo
	local USAGE="Usage: ${ME} [--help] [--debug] [--nosecure] [--textmode] [--nodouble] [--ignoreonline]"
	if [[ ${RET} -ne 0 ]]; then
		E_ "${USAGE}"
	else
		echo -e "${USAGE}"
	fi
	echo
	echo "Arguments:"
	echo "   --help             Displays this message and exits."
	echo "   --debug            Displays debugging information."
	echo "   --nosecure         Do not enforce secure passwords."
	echo "   --text             Use text mode rather than dialogs."            
	echo "   --nodouble         Don't require password confirmation."            
	echo "   --ignoreonline     Don't ask question regarding online use."    
    echo "   --frominstaller    Forces certain operations to happen by default (DO NOT USE)."
	echo "	--enablelogin      Enable the webUI login if the password is set."				
	echo

	exit "${RET}"
}

DEBUG="false"
NOSECURE="false"
HAVE_NO_SECURE="false"
TEXTMODE="false"
DOUBLE_ENTRY_PASSWORD="true"
IGNORE_ONLINE="false"
FROM_INSTALLER="false"
ENABLELOGIN="false"
PASSWORD_FORMAT="$( "${ALLSKY_UTILITIES}/validatePassword.sh" --getformat )"

while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
		--help)
			DO_HELP="true"
			;;

		--debug)
			DEBUG="true"
			;;

		--nosecure)
			NOSECURE="true"
            HAVE_NO_SECURE="true"
			;;

		--enablelogin)
			ENABLELOGIN="true"
			;;

		--text)
			TEXTMODE="true"
			;;  

		--nodouble)
			DOUBLE_ENTRY_PASSWORD="false"
			;;

		--ignoreonline)
			IGNORE_ONLINE="true"
			;;

		--frominstaller)
			FROM_INSTALLER="true"
			;; 

	esac
	shift
done

[[ ${DO_HELP} == "true" ]] && usage_and_exit 0

if [[ ${FROM_INSTALLER} == "true" ]]; then
    check_and_update_auth_method
else
    check_allsky_version
    check_and_update_auth_method
    set_admin_password
fi
