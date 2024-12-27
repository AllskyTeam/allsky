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
SUPPORT_DATETIME_SHORT=$(date +"%Y%m%d%H%M%S")
SUPPORT_ZIP_NAME="support-ISSUE-${SUPPORT_DATETIME_SHORT}.zip"
SUPPORT_DIR="${ALLSKY_HOME}/html/support"
DIALOG_COMPLETE_MESSAGE="The support information has now been generated and can be found in\n\n
${ALLSKY_HOME}/html/support/ZIPNAME\n\n
Due to the size of the support information the file has been compressed.\n\n
This file should be attached to the relevant discussion in Github.\n\nIf your webui is functioning the the file can be downloaded using the support menu option"
GITHUB_ERROR="Error\n\nThe Discussion number must be numberic\n\nIt can be found in the URL of the github issue, 
for example in this case\n\nhttps://github.com/AllskyTeam/allsky/discussions/4119\n\nThe discussion number would be 4119"
SUPPORT_TCS="\nThis script will collect data from your Raspberry Pi to assist in supporting any issues.\n\n
No personal information is collected by this script. The following data is collected\n\n
- Basic system information\n
- Filesystem/Memory/Network Information (IPV4/6/MAC details are obfuscated)\n
- Installed system and python packages\n
- Allsky/lighttpd logs and error logs\n
- Connected camera details\n
- i2c bus details\n
- Running processes\n
- Allsky config files (obfuscated where required to hide any credentials)\n\n
Select 'Yes' to agree or 'No' to abort this script
"
####
# Install prerequisites
function init() 
{
    if [[ "${AUTO_MODE}" == "false" ]]; then    
        clear
        echo -e "Initialising support system. Please wait ..."
    fi

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

	return "${RESULT}"
}

function print_sub_heading(){
    local LABEL=$1

    printf "\n%-20s\n" "${LABEL}"
    printf "%-20s\n" "----------------------------"    
}

function collect_support_info()
{
    # shellcheck disable=SC1091
    . /etc/os-release

    ### Misc information
    UPTIME=$(uptime)
    ###

    ### User information
    USER_NAME=$(id -un)
    USER_ID=$(id -u)    
    ###

    ### OS Information
    OS_ID="${ID}"
    OS_VERSION_ID="${VERSION_ID}"
    OS_VERSION_CODENAME="${VERSION_CODENAME}"
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
    # obfuscate IP, MAC and ipv6 addresses
    NETWORKS=$(echo "${NETWORKS}" | sed -E 's/192\.168\.[0-9]+\.[0-9]+/[PRIVATE]/g')
    NETWORKS=$(echo "${NETWORKS}" | sed -E 's/([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}/[REDACTED]/g')
    NETWORKS=$(echo "${NETWORKS}" | sed -E 's/\b([0-9A-Fa-f]{1,4}:){1,7}([0-9A-Fa-f]{1,4}|:)\b/[REDACTED]/g')
    ###

    ### File system information
    FILE_SYSTEMS="$(df -h)"
    #TODO: GET AS image dir sizes
    ###

    ### Allsky file information
    ALLSKY_VERSION="$( head -1 "./version" )"
    DEBUG_LEVEL=$(jq .debuglevel ./config/settings.json)
    ALLSKY_FILES="$(tree -ugp --gitignore --prune -I '.git|__pycache__' "${ALLSKY_HOME}")"

    # shellcheck source=/dev/null
    source "${ALLSKY_HOME}/venv/bin/activate"
    PYTHON_VERSION="$(python3 -V)"
    PYTHON_MODULES="$(pip list)"
    ###

    ### Devices
    DEV=$(sudo ls -alh  /dev)
    USB="$(sudo lsusb -v)"
    I2C_ENABLED=$(sudo raspi-config nonint get_i2c)
    I2C_DEVICES=""
    if [[ ${I2C_ENABLED} == "0" ]]; then
        I2C_DEVICES="$(sudo i2cdetect -y -a 1)"
    else
        I2C_DEVICES="i2c interface is disabled"
    fi
    ###

    ### Process information
    PS="$(ps -efw)"
    ###

    ### pi Camera stuff
    PI_CAMERAS="$(sudo libcamera-still --list-cameras)"
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
    {
        print_heading "Misc Info"
        print_info "Date and Time": "$(date)"
        print_info "Allsky Version:" "${ALLSKY_VERSION}"
        print_info "Allsky Debug Level:" "${DEBUG_LEVEL}"
        print_info "Uptime:" "${UPTIME}"
        print_info "OS Id:" "${OS_ID}"
        print_info "OS Version:" "(${OS_VERSION_ID}) ${OS_VERSION_CODENAME}"
        print_info "Pi Revision:" "${PI_REVISION}"
        print_info "Pi Model:" "${PI_MODEL}"
        print_info "Total CPU Cores:" "${CPU_TOTAL}"
        print_info "CPU Architecture:" "${CPU_ARCH}"
        print_info "CPU Bits:" "${CPU_BITS}"
        print_info "Total RAM:" "${MEM_TOTAL}"
        print_info "User Name:" "${USER_NAME}"
        print_info "User ID:" "${USER_ID}"
    } >> "${BASIC_FILE}"

    ISSUE_FILE="${TEMP_DIR}/issue.txt"
    {
        print_heading "Github Issue"
        print "${ISSUE_NUMBER}" 
    } >> "${ISSUE_FILE}"

    OS_FILE="${TEMP_DIR}/ps.txt"
    {
        print_heading "Process Information"
        print "${PS}" 
    } >> "${OS_FILE}"

    MEMORY_FILE="${TEMP_DIR}/memory.txt"
    {
        print_heading "Memory Info"
        print "${MEMORY_INFO}"
    } >> "${MEMORY_FILE}"

    NETWORK_FILE="${TEMP_DIR}/network.txt"
    {
        print_heading "Network Info"
        print "${NETWORKS}"
    } >> "${NETWORK_FILE}"

    FILESYSTEM_FILE="${TEMP_DIR}/filesystem.txt"
    {
        print_heading "File Systems"
        print "${FILE_SYSTEMS}"
    } >> "${FILESYSTEM_FILE}"

    DEVICES_FILE="${TEMP_DIR}/devices.txt"
    {
        print_heading "Devices"
        print "${DEV}"
    } >> "${DEVICES_FILE}"

    USB_FILE="${TEMP_DIR}/usb.txt"
    {
        print_heading "USB Devices"
        print "${USB}"
    } >> "${USB_FILE}"

    LIBCAMERA_FILE="${TEMP_DIR}/libcamera.txt"
    {
        print_heading "Libcamera Devices"
        print "${PI_CAMERAS}"
    } >> "${LIBCAMERA_FILE}"

    i2C_FILE="${TEMP_DIR}/i2c.txt"
    {
        print_heading "I2C Devices"
        print "${I2C_DEVICES}"
    } >> "${i2C_FILE}"

    ALLSKYFILES_FILE="${TEMP_DIR}/allsky_files.txt"
    {
        print_heading "Allsky Files"
        print_info "Allsky Version:" "${ALLSKY_VERSION}"
        print "${ALLSKY_FILES}"
    } >> "${ALLSKYFILES_FILE}"

    ALLSKYVENV_FILE="${TEMP_DIR}/allsky_venv.txt"
    {
        print_heading "Allsky Venv information"
        print_info "Python Version:" "${PYTHON_VERSION}"
        print "${PYTHON_MODULES}"
        print_heading "Package Information"
        print "${PYTHON_PACKAGES}"
    }  >> "${ALLSKYVENV_FILE}"

    APT_FILE="${TEMP_DIR}/apt.txt"
    {
        print_heading "APT installed packages" > "${APT_FILE}"
        print "${APT_INSTALLED}"
    } >> "${APT_FILE}"

    LIGHTTPD_ERROR_LOG_FILE="${TEMP_DIR}/lighttpd_error.txt"
    LIGHTTPD_ERROR_LOG="/var/log/lighttpd/error.log"
    if [[ -f "${LIGHTTPD_ERROR_LOG}" ]]; then
        cp "${LIGHTTPD_ERROR_LOG}" "${LIGHTTPD_ERROR_LOG_FILE}"
    fi

    CAMERA_INFO_FILE="${TEMP_DIR}/camera_info.txt"
    {
        print_heading "Allsky - Supported Cameras"

        #print_sub_heading "Raspberry Pi Cameras Attached"
        #sudo ./scripts/utilities/get_RPi_camera_info.sh
        #sudo cat ./tmp/camera_data.txt
        
        print_sub_heading "Pi Cameras"        
        RPi_SUPPORTED_CAMERAS="${ALLSKY_HOME}/config/RPi_cameraInfo.txt"
        gawk -F'\t' '
            BEGIN {
                printf("%-25s Sensor\n", "Camera Name");
                printf("%-25s-------\n", "--------------------------");
            }
            {
                if ($1 == "camera") {
                    sensor = $2;
                    compare_length = $3
                    model = $4;
                    if (compare_length > 0)
                        other = " and related sensors";
                    else
                        other = "";
                    printf("%-25s %s%s\n", model, sensor, other);
                }
            }' "${RPi_SUPPORTED_CAMERAS}"

        print_sub_heading "ZWO Cameras"
	    strings "${ALLSKY_HOME}/src/lib/armv7/libASICamera2.a" |
		    grep '_SetResolutionEv$' | \
		    sed -e 's/^.*CameraS//' -e 's/17Cam//' -e 's/_SetResolutionEv//' | \
		    sort -u

    } >> "${CAMERA_INFO_FILE}"

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

    cp -ar "${ALLSKY_HOME}"/config "${TEMP_DIR}"

    # Truncate the JPL ephemeris files as its hughe and not needed for support
    truncate -s 0 "${TEMP_DIR}/config/overlay/config/tmp/overlay/de421.bsp"
    # Truncate all of the module configs until we can obfuscate any sensitive data
    find "${TEMP_DIR}"/config/modules -type f -exec truncate -s 0 {} +

    SUPPORT_ZIP_NAME="${SUPPORT_ZIP_NAME//ISSUE/${ISSUE_NUMBER}}"
    DIALOG_COMPLETE_MESSAGE="${DIALOG_COMPLETE_MESSAGE//ZIPNAME/${SUPPORT_ZIP_NAME}}"

    cd "${TEMP_DIR}" || exit 1
    zip -r "${SUPPORT_ZIP_NAME}" ./* > /dev/null 2>&1
    sudo chown pi:www-data "${TEMP_DIR}/${SUPPORT_ZIP_NAME}"
    sudo chmod g+wx "${TEMP_DIR}/${SUPPORT_ZIP_NAME}"
    sudo chmod u+wx "${TEMP_DIR}/${SUPPORT_ZIP_NAME}"
    sudo mv "${TEMP_DIR}/${SUPPORT_ZIP_NAME}" "${SUPPORT_DIR}"
    trap 'rm -rf "${TEMP_DIR}"' EXIT
}

####
# Allows the user to enter the Github discussion id
function get_github_discussion_id()
{
    if [[ "${AUTO_MODE}" == "false" ]]; then
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
    fi
}

display_running_dialog()
{
    if [[ "${AUTO_MODE}" == "false" ]]; then
        if [[ "${TEXT_MODE}" == "false" ]]; then
            (
                dialog --title "Processing" --msgbox "\n\n\nPlease wait while the support info is collected..." 10 60
            ) &

            PROCESS_DIALOG=$!
        else
            echo "Please wait while the support info is collected..."
        fi
    fi
}

display_complete_dialog()
{
    if [[ "${AUTO_MODE}" == "false" ]]; then
        DIALOG_MESSAGE="${DIALOG_COMPLETE_MESSAGE}"
        DIALOG_HEIGHT=20

        if [[ "${TEXT_MODE}" == "false" ]]; then
            dialog --title "Complete" --msgbox "${DIALOG_MESSAGE}" "${DIALOG_HEIGHT}" 70
        else
            echo -e "${DIALOG_MESSAGE}"
        fi
    fi
}

display_start_dialog()
{
    if [[ "${AUTO_MODE}" == "false" ]]; then
        clear
        if [[ "${TEXT_MODE}" == "false" ]]; then
            dialog --title "Generate Support Information" --yesno "${SUPPORT_TCS}" 25 80
            RESULT=$?
        else
            enter_yes_no "${SUPPORT_TCS}"
            RESULT=$?
        fi

        if [[ "${RESULT}" -eq 1 ]]; then
            exit 1
        fi
    fi
}

kill_running_dialog()
{
    if [[ "${AUTO_MODE}" == "false" ]]; then
        if [[ "${TEXT_MODE}" == "false" ]]; then
            kill "${PROCESS_DIALOG}"
        fi
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
		echo -e "	'--auto' Auto accept any prompts and no output."
		echo -e "	'--issue' Include the Github issue number."        
		echo -e "	'--loglines' Number of lines to include from log files, defaults to 'all'. Use 'all' for entire file"

	} >&2
	exit "${RET}"
}

OK="true"
TEXT_MODE="false"
ISSUE_NUMBER="none"
AUTO_MODE="false"

while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
		--help)
			DO_HELP="true"
			;;

		--text)
			TEXT_MODE="true"
			;;

		--auto)
			AUTO_MODE="true"
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

display_start_dialog
init
get_github_discussion_id
display_running_dialog
collect_support_info
generate_support_info
kill_running_dialog
display_complete_dialog