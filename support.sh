#!/bin/bash

####
# Generate Allsky support info.
#
# IMPORTANT: This script does not rely on ANY Allsky functions to gather data. This is to prevent any
#            issues with the Allsky installation from interfering with the data collection
#
LOG_LINES=1000
SUPPORT_LOG_FILE="support.log"
ZIPPED="false"
MAX_UNZIPPED=512000
DIALOG_COMPLETE_MESSAGE="The support information has now been generated and can be found in\n\n
${ALLSKY_HOME}/${SUPPORT_LOG_FILE}\n\n
This file should be attached to the relevant issue/discussion in Github. Please ATTACH as a file do not paste it
into a discussion or issue as it makes the issue/discussion very difficult to read
"
DIALOG_COMPLETE_MESSAGE_ARCHIVE="The support information has now been generated and can be found in\n\n
${ALLSKY_HOME}/${SUPPORT_LOG_FILE}.zip\n\n
Due to the size of the support information the file has been compressed.\n
This file should be attached to the relevant issue/discussion in Github. Please ATTACH as a file do not paste it
into a discussion or issue as it makes the issue/discussion very difficult to read
"

####
# Install prerequisits
function init() 
{
    sudo apt install tree > /dev/null 2>&1
    sudo apt install i2c-tools > /dev/null 2>&1
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

    printf "\n\n%-20s\n" "${LABEL}"
    printf "%-20s\n" "============================"
}

function print_sub_heading(){
    local LABEL=$1

    printf "\n%-20s\n" "${LABEL}"
    printf "%-20s\n" "----------------------------"    
}

#sudo apt install -y tree

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
    source ${ALLSKY_HOME}/venv/bin/activate
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
    REPOS=$(grep -rE '^deb|^deb-src' /etc/apt/sources.list /etc/apt/sources.list.d/)
    APT_INSTALLED=$(sudo dpkg-query -l)
    ###
}

function display_info() 
{
    if [[ -f "${SUPPORT_LOG_FILE}" ]]; then
        rm "${SUPPORT_LOG_FILE}"
    fi

    exec > "${SUPPORT_LOG_FILE}" 2>&1

    print_heading "Misc Info"
    print_info "Date and Time": "$(date)"
    print_info "Allsky Version:" "${ALLSKY_VERSION}"
    print_info "Allsky Debug Level:" "${DEBUG_LEVEL}"
    print_info "Uptime:" "${UPTIME}"
    print_info "OS Id:" "${ID}"
    print_info "OS Version:" "${VERSION_ID}"
    print_info "Pi Revision:" "${PI_REVISION}"
    print_info "Pi Model:" "${PI_MODEL}"
    print_info "Total CPU Cores:" "${CPU_TOTAL}"
    print_info "CPU Architecture:" "${CPU_ARCH}"
    print_info "CPU Bits:" "${CPU_BITS}"
    print_info "Total RAM:" "${MEM_TOTAL}"
    print_info "User Name:" "${USER_NAME}"
    print_info "User ID:" "${USER_ID}"

    
    print_heading "Memory Info"
    print "${MEMORY_INFO}"


    print_heading "Network Info"
    print "${NETWORKS}"
    print_heading "File Systems"
    print "${FILE_SYSTEMS}"

    if [[ "${DEVICES}" == "true" ]]; then
        print_heading "Devices"
        print "${DEV}"
    fi
    print_heading "USB Devices"
    print "${USB}"
    print_heading "Libcamera Devices"
    print "${PI_CAMERAS}"
    print_heading "I2C Devices"
    if [[ ${I2C_ENABLED} == "0" ]]; then
        print "${I2C_DEVICES}"
    else
        print "i2c is not enabled"
    fi
    print_heading "Process Information"
    print "${PS}"
    print_heading "Allsky Files"
    print_info "Allsky Version:" "${ALLSKY_VERSION}"
    print "${ALLSKY_FILES}"
    print_heading "Allsky Venv information"
    print_info "Python Version:" "${PYTHON_VERSION}"
    print "${PYTHON_MODULES}"
    print_heading "Package Information"
    print "${PYTHON_PACKAGES}"
    print "${APT_INSTALLED}"

    print_heading "Allsky - Supported Cameras"
    print_sub_heading "Raspberry Pi Cameras"
    ./scripts/utilities/show_supported_cameras.sh --rpi

    print_sub_heading "Raspberry Pi Cameras Attached"
    ./scripts/utilities/get_RPi_camera_info.sh
    cat ./tmp/camera_data.txt

    print_sub_heading "ZWO Cameras"
    ./scripts/utilities/show_supported_cameras.sh --zwo

    print_heading "Allsky Log File - $LOG_LINES lines"
    if [[ "${LOG_LINES}" == "all" ]]; then
        cat /var/log/allsky.log
    else
        tail -n "${LOG_LINES}" /var/log/allsky.log
    fi
    print_heading "Allsky Periodic Log File - $LOG_LINES lines"
    if [[ "${LOG_LINES}" == "all" ]]; then
        cat /var/log/allskyperiodic.log
    else    
        tail -n "${LOG_LINES}" /var/log/allskyperiodic.log
    fi


    exec 1>/dev/tty 2>/dev/tty
}

function add_config_files() {
    if [[ "${INCLUDE_ALLSKY_CONFIG}" == "true" ]]; then
        TEMP_FOLDER="${TMPDIR:-/tmp}"
        TEMP_DIR=$(mktemp -d "${TEMP_FOLDER}"/allskyXXXXX)
        cp "${SUPPORT_LOG_FILE}" "${TEMP_DIR}"
        cp -ar "${ALLSKY_HOME}"/config "${TEMP_DIR}"

        # Truncate the JPL ephemeris files as its hughe and not needed for support
        truncate -s 0 "${TEMP_DIR}/config/overlay/config/tmp/overlay/de421.bsp"
        # Truncate all of the module configs until we can obfuscate any sensitive data
        find "${TEMP_DIR}"/config/modules -type f -exec truncate -s 0 {} +

        cd "${TEMP_DIR}" || exit 1
        zip -r support.zip *
        mv "${TEMP_DIR}/support.zip" "${ALLSKY_HOME}"
        trap 'rm -rf "${TEMP_DIR}"' EXIT
        ZIPPED="true"
    fi
}

function manage_support_log_size() {
    if [[ "${INCLUDE_ALLSKY_CONFIG}" == "false" ]]; then
        FILE_SIZE=$(stat --format=%s "${SUPPORT_LOG_FILE}")
        if [[ "${FILE_SIZE}" -gt "${MAX_UNZIPPED}" ]]; then
            zip -r support.zip "${SUPPORT_LOG_FILE}" > /dev/null 2>&1
            rm "${SUPPORT_LOG_FILE}" > /dev/null 2>&1
            ZIPPED="true"
        fi
    fi
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

    if [[ "${ZIPPED}" == "false" ]]; then
        DIALOG_MESSAGE="${DIALOG_COMPLETE_MESSAGE}"
        DIALOG_HEIGHT=20
    else
        DIALOG_MESSAGE="${DIALOG_COMPLETE_MESSAGE_ARCHIVE}"
        DIALOG_HEIGHT=20

    fi

    if [[ "${TEXT_MODE}" == "false" ]]; then
        dialog --title "Complete" --msgbox "${DIALOG_MESSAGE}" "${DIALOG_HEIGHT}" 50
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
		echo -e "	'--tree' Include full list of ALL Allsky files."
		echo -e "	'--fullusb' Include full USB device details."
		echo -e "	'--devices' Include /dev listing."
		echo -e "	'--config' Include Allsky configuration files."
		echo -e "	'--showoptions' Allow data to be included to be selected."
		echo -e "	'--excludeallskyscript' DO not include the Allsky camera scripts output."
		echo -e "	'--loglines' Number of lines to include from log files, defaults to 1000. Use 'all' for entire file"

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
display_info
add_config_files
manage_support_log_size
kill_running_dialog
display_complete_dialog