#!/bin/bash

####
# Generate Allsky support info.
#
# IMPORTANT: This script does not rely on ANY Allsky functions to gather data. This is to prevent any
#            issues with the Allsky installation from interfering with the data collection
#            Some 'standard' variables are hard coded in this script.
#
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )" )"

LOG_LINES="all"
SUPPORT_DATETIME=$(date +"%Y-%m-%d-%H:%M:%S")
SUPPORT_DATETIME_SHORT=$(date +"%Y%m%d%H%M%S")
SUPPORT_ZIP_NAME="support-ISSUE-${SUPPORT_DATETIME_SHORT}.zip"
SUPPORT_DIR="${ALLSKY_HOME}/html/support"
DIALOG_COMPLETE_MESSAGE="The support information has now been generated and can be found in\n\n
${ALLSKY_HOME}/html/support/ZIPNAME\n\n
Due to the size of the support information the file has been compressed.\n\n
This file should be attached to the relevant discussion in Github.\n\nIf your webui is functioning the the file can be downloaded using the support menu option
"
GITHUB_ERROR="Error\n\nThe Discussion number must be numberic\n\nIt can be found in the URL of the github issue, 
for example in this case\n\nhttps://github.com/AllskyTeam/allsky/discussions/4119\n\nThe discussion number would be 4119"

####
# Install prerequisits
function init() 
{
    clear
    echo -e "Initialising support system. Please wait ..."

    sudo apt install -y tree > /dev/null 2>&1
    sudo apt install -y i2c-tools > /dev/null 2>&1
}

function print_info() {
    local LABEL=$1
    local VALUE=$2
    printf "%-20s : %-20s\n" "${LABEL}" "${VALUE}"
}

function print() {
    local LABEL=$1
    echo "${LABEL}"
}

function print_heading(){
    local LABEL=$1

    printf "\n\n%-20s\n" "${LABEL}  - $(date)"
    printf "%-20s\n" "============================"
}

function print_sub_heading(){
    local LABEL=$1

    printf "\n%-20s\n" "${LABEL}"
    printf "%-20s\n" "----------------------------"    
}

function get_info()
{
    . /etc/os-release

    ### Misc information
    UPTIME=$(uptime)
    ###

    ### User information
    USER_NAME=$(id -un)
    USER_ID=$(id -u)    
    ###

    ### OS Information
    ID="${ID}"
    VERSION_ID="${VERSION_ID}"
    ###

    ### Hardware Information
    PI_REVISION=$(grep -m 1 'Revision' /proc/cpuinfo | awk '{print $3}')
    CPU_ARCH=$(uname -m)
    CPU_BITS=$(getconf LONG_BIT)
    CPU_TOTAL=$(nproc)
    MEM_TOTAL=$(free -h | grep Mem | awk '{print $2}')
    local CMD="from gpiozero import Device"
	CMD+="\nDevice.ensure_pin_factory()"
	CMD+="\nprint(Device.pin_factory.board_info.model)"
	PI_MODEL="$( echo -e "${CMD}" | python3 2>/dev/null )"
    ###

    ### Memry Info
    MEMORY_INFO="$(free)"
    ###

    ### Network Info
    NETWORKS="$(ip a)"
    ###

    ### File system information
    FILE_SYSTEMS="$(df -h)"
    #TODO: GET AS image dir sizes
    ###

    ### Allsky file information
    ALLSKY_VERSION="$( head -1 "./version" )"
    DEBUG_LEVEL=$(jq .debuglevel ./config/settings.json)
    if [[ "${TREE}" == "true" ]]; then
        ALLSKY_FILES="$(tree -ugp --gitignore --prune -I '.git|__pycache__')"
    else
        ALLSKY_FILES=""
    fi

    # shellcheck source=/dev/null
    source "${ALLSKY_HOME}/venv/bin/activate"
    PYTHON_VERSION="$(python3 -V)"
    PYTHON_MODULES="$(pip list)"
    ###

    ### Devices
    if [[ "${DEVICES}" == "true" ]]; then
        DEV=$(sudo ls -alh  /dev)
    else
        DEV=""
    fi
    if [[ "${FULL_USB}" == "true" ]]; then
        USB="$(sudo lsusb -v)"
    else
        USB="$(sudo lsusb)"
    fi
    I2C_ENABLED=$(sudo raspi-config nonint get_i2c)
    I2C_DEVICES=""
    if [[ ${I2C_ENABLED} == "0" ]]; then
        I2C_DEVICES="$(i2cdetect -y -a 1)"
    fi
    ###

    ### Process information
    PS="$(ps -efw)"
    ###

    ### pi Camera stuff
    PI_CAMERAS="$(libcamera-still --list-cameras)"
    ###

    ### get installed package information
    PYTHON_PACKAGES="$(dpkg -l | grep python)"
    #REPOS=$(grep -rE '^deb|^deb-src' /etc/apt/sources.list /etc/apt/sources.list.d/)
    APT_INSTALLED=$(sudo dpkg-query -l)
    ###
}

function generate_support_info()
{
    TEMP_FOLDER="${TMPDIR:-/tmp}"
    TEMP_DIR=$(mktemp -d "${TEMP_FOLDER}"/allskyXXXXX)

    BASIC_FILE="${TEMP_DIR}/system.txt"
    print_heading "Misc Info" > "${BASIC_FILE}"
    print_info "Date and Time": "$(date)" >> "${BASIC_FILE}"
    print_info "Allsky Version:" "${ALLSKY_VERSION}" >> "${BASIC_FILE}"
    print_info "Allsky Debug Level:" "${DEBUG_LEVEL}" >> "${BASIC_FILE}"
    print_info "Uptime:" "${UPTIME}" >> "${BASIC_FILE}"
    print_info "OS Id:" "${ID}" >> "${BASIC_FILE}"
    print_info "OS Version:" "${VERSION_ID}" >> "${BASIC_FILE}"
    print_info "Pi Revision:" "${PI_REVISION}" >> "${BASIC_FILE}"
    print_info "Pi Model:" "${PI_MODEL}" >> "${BASIC_FILE}"
    print_info "Total CPU Cores:" "${CPU_TOTAL}" >> "${BASIC_FILE}"
    print_info "CPU Architecture:" "${CPU_ARCH}" >> "${BASIC_FILE}"
    print_info "CPU Bits:" "${CPU_BITS}" >> "${BASIC_FILE}"
    print_info "Total RAM:" "${MEM_TOTAL}" >> "${BASIC_FILE}"
    print_info "User Name:" "${USER_NAME}" >> "${BASIC_FILE}"
    print_info "User ID:" "${USER_ID}" >> "${BASIC_FILE}"

    ISSUE_FILE="${TEMP_DIR}/issue.txt"
    print_heading "Github Issue" > "${ISSUE_FILE}"
    print "${ISSUE_NUMBER}" >> "${ISSUE_FILE}"

    OS_FILE="${TEMP_DIR}/ps.txt"
    print_heading "Process Information" > "${OS_FILE}"
    print "${PS}" >> "${OS_FILE}"

    MEMORY_FILE="${TEMP_DIR}/memory.txt"
    print_heading "Memory Info" > "${MEMORY_FILE}"
    print "${MEMORY_INFO}" >> "${MEMORY_FILE}"

    NETWORK_FILE="${TEMP_DIR}/network.txt"
    print_heading "Network Info" > "${NETWORK_FILE}"
    print "${NETWORKS}" >> "${NETWORK_FILE}"

    FILESYSTEM_FILE="${TEMP_DIR}/filesystem.txt"
    print_heading "File Systems" > "${FILESYSTEM_FILE}"
    print "${FILE_SYSTEMS}" >> "${FILESYSTEM_FILE}"

    if [[ "${DEVICES}" == "true" ]]; then
        DEVICES_FILE="${TEMP_DIR}/devices.txt"
        print_heading "Devices" > "${DEVICES_FILE}"
        print "${DEV}" >> "${DEVICES_FILE}"
    fi

    USB_FILE="${TEMP_DIR}/usb.txt"
    print_heading "USB Devices" > "${USB_FILE}"
    print "${USB}" >> "${USB_FILE}"

    LIBCAMERA_FILE="${TEMP_DIR}/libcamera.txt"
    print_heading "Libcamera Devices" > "${LIBCAMERA_FILE}"
    print "${PI_CAMERAS}" >> "${LIBCAMERA_FILE}"

    i2C_FILE="${TEMP_DIR}/i2c.txt"
    print_heading "I2C Devices" > "${i2C_FILE}"
    print "${I2C_DEVICES}" >> "${i2C_FILE}"

    ALLSKYFILES_FILE="${TEMP_DIR}/allsky_files.txt"
    print_heading "Allsky Files" > "${ALLSKYFILES_FILE}"
    print_info "Allsky Version:" "${ALLSKY_VERSION}" >> "${ALLSKYFILES_FILE}"
    print "${ALLSKY_FILES}" >> "${ALLSKYFILES_FILE}"

    ALLSKYVENV_FILE="${TEMP_DIR}/allsky_venv.txt"
    print_heading "Allsky Venv information" > "${ALLSKYVENV_FILE}"
    print_info "Python Version:" "${PYTHON_VERSION}" >> "${ALLSKYVENV_FILE}"
    print "${PYTHON_MODULES}" >> "${ALLSKYVENV_FILE}"
    print_heading "Package Information" >> "${ALLSKYVENV_FILE}"
    print "${PYTHON_PACKAGES}" >> "${ALLSKYVENV_FILE}"

    APT_FILE="${TEMP_DIR}/apt.txt"
    print_heading "APT installed packages" > "${APT_FILE}"
    print "${APT_INSTALLED}" >> "${APT_FILE}"

    LIGHTTPD_ERROR_LOG_FILE="${TEMP_DIR}/lighttpd_error.txt"
    LIGHTTPD_ERROR_LOG="/var/log/lighttpd/error.log"
    if [[ -f "${LIGHTTPD_ERROR_LOG}" ]]; then
        cp "${LIGHTTPD_ERROR_LOG}" "${LIGHTTPD_ERROR_LOG_FILE}"
    fi

    if [[ "$INCLUDE_ALLSKY_SCRIPTS" == "true" ]]; then
        CAMERA_INFO_FILE="${TEMP_DIR}/camera_info.txt"
        print_heading "Allsky - Supported Cameras" > "${CAMERA_INFO_FILE}"
        print_sub_heading "Raspberry Pi Cameras" >> "${CAMERA_INFO_FILE}"
        ./scripts/utilities/show_supported_cameras.sh --rpi >> "${CAMERA_INFO_FILE}"

        print_sub_heading "Raspberry Pi Cameras Attached" >> "${CAMERA_INFO_FILE}"
        ./scripts/utilities/get_RPi_camera_info.sh >> "${CAMERA_INFO_FILE}"
        cat ./tmp/camera_data.txt >> "${CAMERA_INFO_FILE}"

        print_sub_heading "ZWO Cameras" >> "${CAMERA_INFO_FILE}"
        ./scripts/utilities/show_supported_cameras.sh --zwo >> "${CAMERA_INFO_FILE}"
    fi

    ALLSKY_LOG_FILE="${TEMP_DIR}/allsky_log.txt"
    if [[ "${LOG_LINES}" == "all" ]]; then
        cp /var/log/allsky.log "${ALLSKY_LOG_FILE}"
    else
        touch "${ALLSKY_LOG_FILE}"
        tail -n "${LOG_LINES}" /var/log/allsky.log > "${ALLSKY_LOG_FILE}"
    fi

    ALLSKYPERIODIC_LOG_FILE="${TEMP_DIR}/allskyperiodic_log.txt"
    if [[ "${LOG_LINES}" == "all" ]]; then
        cp /var/log/allskyperiodic.log "${ALLSKYPERIODIC_LOG_FILE}"
    else
        touch "${ALLSKYPERIODIC_LOG_FILE}"    
        tail -n "${LOG_LINES}" /var/log/allskyperiodic.log > "${ALLSKYPERIODIC_LOG_FILE}"
    fi

    if [[ "${INCLUDE_ALLSKY_CONFIG}" == "true" ]]; then
        cp -ar "${ALLSKY_HOME}"/config "${TEMP_DIR}"

        # Truncate the JPL ephemeris files as its hughe and not needed for support
        truncate -s 0 "${TEMP_DIR}/config/overlay/config/tmp/overlay/de421.bsp"
        # Truncate all of the module configs until we can obfuscate any sensitive data
        find "${TEMP_DIR}"/config/modules -type f -exec truncate -s 0 {} +
    fi

    SUPPORT_ZIP_NAME="${SUPPORT_ZIP_NAME//ISSUE/${ISSUE_NUMBER}}"
    DIALOG_COMPLETE_MESSAGE="${DIALOG_COMPLETE_MESSAGE//ZIPNAME/${SUPPORT_ZIP_NAME}}"

    cd "${TEMP_DIR}" || exit 1
    zip -r "${SUPPORT_ZIP_NAME}" ./* > /dev/null 2>&1
    sudo chown pi:www-data "${TEMP_DIR}/${SUPPORT_ZIP_NAME}"
    chmod g+wx "${TEMP_DIR}/${SUPPORT_ZIP_NAME}"
    chmod u+wx "${TEMP_DIR}/${SUPPORT_ZIP_NAME}"
    sudo mv "${TEMP_DIR}/${SUPPORT_ZIP_NAME}" "${SUPPORT_DIR}"
    trap 'rm -rf "${TEMP_DIR}"' EXIT

}

####
# Allow user to select the data to include
function get_options()
{
    if [[ "${TEXT_MODE}" == "false" ]]; then
        if [[ "${SHOW_OPTIONS}" == "true" ]]; then
            TEMP_FILE=$(mktemp)
            dialog --checklist "Select data to include:" 15 50 5 \
            1 "Allsky File Tree" off \
            2 "Full USB details" off \
            3 "Device list" off \
            4 "Allsky Config Files" off 2> "${TEMP_FILE}"

            choices=$(<"${TEMP_FILE}")
            rm -f "${TEMP_FILE}"

            if [[ -n $choices ]]; then
                for choice in $choices; do
                    if [[ "${choice}" == "1" ]]; then
                        TREE="true"
                    fi
                    if [[ "${choice}" == "2" ]]; then
                        FULL_USB="true"
                    fi
                    if [[ "${choice}" == "3" ]]; then
                        DEVICES="true"
                    fi 
                    if [[ "${choice}" == "4" ]]; then
                        INCLUDE_ALLSKY_CONFIG="true"
                    fi                        
                done
            fi
        fi
    fi

    if [[ "${ISSUE_NUMBER}" == "none" ]]; then
        while true; do
            if [[ "${TEXT_MODE}" == "false" ]]; then
                ISSUE_NUMBER_TEMP=$(dialog --inputbox "Github Discussion Number:\nIf you don't know this just hit Enter." 8 50 2>&1 >/dev/tty)
            else
                echo -e "Enter the Github Discussion Number:\nIf you don't know this just hit Enter.\n"
                read -r -p "Github discussion number " ISSUE_NUMBER_TEMP
            fi

            if [[ -n "${ISSUE_NUMBER_TEMP}" ]]; then
                if [[ "${ISSUE_NUMBER_TEMP}" =~ ^[+-]?[0-9]+$ ]]; then
                    ISSUE_NUMBER="${ISSUE_NUMBER_TEMP}"
                    break
                else
                    if [[ "${TEXT_MODE}" == "false" ]]; then
                        dialog --msgbox "${GITHUB_ERROR}" 15 70
                    else
                        echo -e "${GITHUB_ERROR}\n\n"
                    fi
                fi
            else
                break
            fi
        done    
    fi    
}

display_running_dialog()
{

    if [[ "${TEXT_MODE}" == "false" ]]; then
        (
            dialog --title "Processing" --msgbox "\n\n\nPlease wait while the support info is collected..." 10 60
        ) &

        PROCESS_DIALOG=$!
    else
        echo "Please wait while the support info is collected..."
    fi
}

display_complete_dialog()
{

    DIALOG_MESSAGE="${DIALOG_COMPLETE_MESSAGE}"
    DIALOG_HEIGHT=20

    if [[ "${TEXT_MODE}" == "false" ]]; then
        dialog --title "Complete" --msgbox "${DIALOG_MESSAGE}" "${DIALOG_HEIGHT}" 70
    else
        echo -e "${DIALOG_MESSAGE}"
    fi
}

kill_running_dialog()
{
    if [[ "${TEXT_MODE}" == "false" ]]; then
        kill "${PROCESS_DIALOG}"
    fi
}

####
# Display script usage information
function usage_and_exit()
{
	local RET=${1}
	{
		echo
		[[ ${RET} -ne 0 ]] && echo -en "${RED}"
		echo "Usage: ${ME} [--help] [--tree] [--fullusb] "
		[[ ${RET} -ne 0 ]] && echo -en "${NC}"
		echo -e "\n	where:"
		echo -e "	'--help' displays this message and exits."
		echo -e "	'--text' Use text mode. Options must be specified on the command line."        
		echo -e "	'--issue' Include the Githuib issue number."        
		echo -e "	'--tree' Include full list of ALL Allsky files."
		echo -e "	'--fullusb' Include full USB device details."
		echo -e "	'--devices' Include /dev listing."
		echo -e "	'--config' Include Allsky configuration files."
		echo -e "	'--showoptions' Allow data to be included to be selected."
		echo -e "	'--excludeallskyscript' DO not include the Allsky camera scripts output."
		echo -e "	'--loglines' Number of lines to include from log files, defaults to 'all'. Use 'all' for entire file"

	} >&2
	exit "${RET}"
}

OK="true"
TREE="false"
FULL_USB="false"
DEVICES="false"
INCLUDE_ALLSKY_CONFIG="false"
INCLUDE_ALLSKY_SCRIPTS="true"
SHOW_OPTIONS="false"
TEXT_MODE="false"
ISSUE_NUMBER="none"

while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
		--help)
			DO_HELP="true"
			;;

		--text)
			TEXT_MODE="true"
			;;

		--tree)
			TREE="true"
			;;

		--fullusb)
			FULL_USB="true"
			;;

		--devices)
			DEVICES="true"
			;;

		--config)
			INCLUDE_ALLSKY_CONFIG="true"
			;;

		--showoptions)
			SHOW_OPTIONS="true"
			;;

        --excludeallskyscript)
			INCLUDE_ALLSKY_SCRIPTS="false"
			;;

        --issue)
        	ISSUE_NUMBER="${2}"
			shift
        ;;

		--loglines)
        	LOG_LINES_TEMP="${2}"
            if [[ "${LOG_LINES_TEMP}" =~ ^[0-9]+$ ]]; then
                LOG_LINES="${LOG_LINES_TEMP}"
            else
                LOG_LINES_TEMP="${LOG_LINES_TEMP,,}"
                if [[ "${LOG_LINES_TEMP}" == "all" ]]; then
                    LOG_LINES="all"
                else
                    echo -e "${RED}ERROR: --lognines must be numeric or 'all'.${NC}" >&2
                    OK="false"
                fi
            fi            
			shift
            ;;
	esac
	shift
done

[[ ${DO_HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" ]] && usage_and_exit 1

init
get_options
display_running_dialog
get_info
generate_support_info
kill_running_dialog
display_complete_dialog