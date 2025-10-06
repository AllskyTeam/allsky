#!/bin/bash

####
# Generate Allsky support info.

# IMPORTANT:
#	This script only assumes that "git clone" was successful.
#	It does NOT assume Allsky has been installed so only uses scripts and functions
#	that do not require Allsky to be installed.  This is to prevent any issues
#	with the Allsky installation from interfering with the data collection.


[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )" )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/installUpgradeFunctions.sh"	|| exit "${EXIT_ERROR_STOP}"

if [[ ! -d ${ALLSKY_SUPPORT_DIR} ]]; then
	mkdir -p "${ALLSKY_SUPPORT_DIR}" || exit 2
fi
# Always run these to make sure the permissions are correct.
sudo chown "${USER_NAME}:${WEBSERVER_OWNER}" "${ALLSKY_SUPPORT_DIR}"
sudo chmod 775 "${ALLSKY_SUPPORT_DIR}"

############################################## functions

function set_dialog_info()
{
	# Get DIALOG_WIDTH and DIALOG_HEIGHT
	calc_d_sizes

	if [[ ${TEXT_ONLY} == "true" ]]; then
		DIALOG_ERROR="${cERROR}"
		DIALOG_BLUE="${cBLUE}"
		DIALOG_NC="${cNC}"
	fi
}

function set_messages()
{
	DIALOG_COMPLETE_MESSAGE="\nThe support information is in:\n"
	DIALOG_COMPLETE_MESSAGE+="\n"
	DIALOG_COMPLETE_MESSAGE+="    ${DIALOG_BLUE}${ALLSKY_SUPPORT_DIR}/XX_ZIPNAME_XX${DIALOG_NC}\n"
	DIALOG_COMPLETE_MESSAGE+="\n"
	DIALOG_COMPLETE_MESSAGE+="This file should be attached to the relevant Discussion or Issue in Github.\n"
	DIALOG_COMPLETE_MESSAGE+="\n"
	DIALOG_COMPLETE_MESSAGE+="If your WebUI is functioning, the file can be downloaded using the"
	DIALOG_COMPLETE_MESSAGE+=" '${DIALOG_BLUE}Getting Support${DIALOG_NC}' page."

	GITHUB_ERROR="${DIALOG_ERROR}\nERROR: The Discussion / Issue number must be numeric.${DIALOG_NC}\n"
	GITHUB_ERROR+="\n"
	GITHUB_ERROR+="It can be found at the end of the Github URL, for example if the URL is:\n"
	GITHUB_ERROR+="\n"
	GITHUB_ERROR+="    ${DIALOG_BLUE}${ALLSKY_GITHUB_ROOT}/${ALLSKY_GITHUB_ALLSKY_REPO}/discussions/4119${DIALOG_NC}\n"
	GITHUB_ERROR+="\n"
	GITHUB_ERROR+="the post is a Discussion whose number is ${DIALOG_BLUE}4119${DIALOG_NC}."

	SUPPORT_TCS="\n${DIALOG_BLUE}This script collects the following data from your Raspberry Pi to"
	SUPPORT_TCS+=" assist in supporting problems (all private data is hidden):${DIALOG_NC}\n"
	SUPPORT_TCS+="\n"
	SUPPORT_TCS+="- Basic system information\n"
	SUPPORT_TCS+="- Filesystem, memory, and network information\n"
	SUPPORT_TCS+="- Installed system and python packages\n"
	SUPPORT_TCS+="- Allsky and web log files\n"
	SUPPORT_TCS+="- Connected camera details\n"
	SUPPORT_TCS+="- i2c bus details\n"
	SUPPORT_TCS+="- Running processes\n"
	SUPPORT_TCS+="- Allsky configuration files\n"
	SUPPORT_TCS+="\n"
}

H_WIDTH="-20s"

function print_info()
{
	local LABEL="${1}"
	local VALUE="${2}"

	# shellcheck disable=SC2059
	printf "%${H_WIDTH} : %${H_WIDTH}\n" "${LABEL}" "${VALUE}"
}

function print()
{
	local LABEL="${1}"

	echo "${LABEL}"
}

function print_heading()
{
	local LABEL="${1}"

	# shellcheck disable=SC2059
	printf "%${H_WIDTH}\n" "${LABEL}  - $( date )"
	# shellcheck disable=SC2059
	printf "%${H_WIDTH}\n" "============================"
	echo	# Separate header from content
}

function collect_support_info()
{
	# shellcheck disable=SC1091
	source /etc/os-release	|| true
	### OS Information
	OS_ID="${ID,,}"
	OS_VERSION_ID="${VERSION_ID}"
	OS_VERSION_CODENAME="${VERSION_CODENAME,,}"

	### Misc information
	UPTIME="$( uptime )"

	### User information
	USER_NAME="$( id -un )"
	USER_ID="$( id -u )"

	### Hardware Information
	PI_REVISION="$( grep -m 1 'Revision' /proc/cpuinfo | gawk '{print $3}' )"
	CPU_ARCH="$( uname -m )"
	CPU_BITS="$( getconf LONG_BIT )"
	CPU_TOTAL="$( nproc )"
	MEMORY_INFO="$( free -h )"
	MEM_TOTAL="$( echo "${MEMORY_INFO}" | grep Mem | gawk '{print $2}' )"
	if [[ -s ${ALLSKY_PI_VERSION_FILE} ]]; then
		PI_MODEL="$( < "${ALLSKY_PI_VERSION_FILE}" )"
	else
		PI_MODEL="unknown"
	fi

	### Network Info
	# obfuscate IP, MAC and ipv6 addresses
	NETWORKS="$( ip a |
		sed -E \
			-e 's/192\.168\.[0-9]+\.[0-9]+/[PRIVATE]/g' \
			-e 's/([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}/[REDACTED]/g' \
			-e 's/\b([0-9A-Fa-f]{1,4}:){1,7}([0-9A-Fa-f]{1,4}|:)\b/[REDACTED]/g' )"

	### File system information
	FILE_SYSTEMS="$( df -h )"
	# TODO: GET AS image dir sizes

	activate_python_venv
	PYTHON_VERSION="$( python3 -V )"
	PYTHON_VERSION="${PYTHON_VERSION:-unknown}"

	### Devices
	DEV_DEVICES="$( sudo ls -alh  /dev )"
	USB_DEVICES="$( sudo lsusb -v )"
	I2C_ENABLED="$( sudo raspi-config nonint get_i2c )"
	if [[ ${I2C_ENABLED} == "0" ]]; then
		I2C_DEVICES="$( sudo i2cdetect -y -a 1 )"
	else
		I2C_DEVICES="i2c interface is disabled"
	fi

	### Process information
	PS="$( ps -efw )"

	### Pi Camera stuff
	if which rpicam-still > /dev/null ; then
		RPI_CAMERAS="$( rpicam-still --list-cameras 2> /dev/null )"
	elif which libcamera-still > /dev/null ; then
		RPI_CAMERAS="$( libcamera-still --list-cameras 2> /dev/null )"
	else
		RPI_CAMERAS=""
	fi

	### Get installed package information
	# REPOS="$( grep -r '^deb' /etc/apt/sources.list /etc/apt/sources.list.d/ )"
}

function generate_support_info()
{
	# Create a temporary directory to hold all our files,
	# and make sure we can create a file in it.
	local TEMP_DIR="$( mktemp --directory "${TMPDIR:-/tmp}/allsky_XXX" 2>&1 )"
	local RET=$?
	if [[ $RET -ne 0 ]]; then
		echo "ERROR: mktemp returned code ${RET}: ${TEMP_DIR}" >&2
		return 1
	elif [[ -z ${TEMP_DIR} ]]; then
		echo "ERROR: mktemp returned nothing." >&2
		return 1
	elif [[ ! -d ${TEMP_DIR} ]]; then
		local A="Argument list too long"
		#shellcheck disable=SC2076
		if [[ ${TEMP_DIR} =~ "${A}" ]]; then
			echo "INTERNAL ERROR: '${A}'." >&2
			echo "Report to Allsky Team on GitHub." >&2
		else
			echo "ERROR: TEMP_DIR (${TEMP_DIR}) does not exist." >&2
		fi
		return 1
	else
		local TEST_FILE="${TEMP_DIR}/test.txt"
		local TEST
		if ! TEST="$( touch "${TEST_FILE}" 2>&1 )" ; then
			echo "ERROR: Unable to create '${TEST_FILE}': ${TEST}" >&2
			return 1
		fi
		rm -f "${TEST_FILE}"
	fi

	local BASIC_FILE="${TEMP_DIR}/system.txt"
	{
		print_heading "Misc Info"
		print_info "Date and Time": "$( date )"
		print_info "Allsky Version:" "${ALLSKY_VERSION}"
		print_info "Allsky Debug Level:" "${ALLSKY_DEBUG_LEVEL}"
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
	} > "${BASIC_FILE}"

	if [[ ${GITHUB_NUMBER} != "none" ]]; then
		local GITHUB_FILE="${TEMP_DIR}/Github_ID.txt"
		{
			print_heading "Github ID"
			print "${GITHUB_NUMBER}"
		} > "${GITHUB_FILE}"
	fi

	local OS_FILE="${TEMP_DIR}/ps.txt"
	{
		print_heading "Process Information"
		print "${PS}"
	} > "${OS_FILE}"

	local MEMORY_FILE="${TEMP_DIR}/memory.txt"
	{
		print_heading "Memory Info"
		print "${MEMORY_INFO}"
	} > "${MEMORY_FILE}"

	local NETWORK_FILE="${TEMP_DIR}/network.txt"
	{
		print_heading "Network Info"
		print "${NETWORKS}"
	} > "${NETWORK_FILE}"

	local FILESYSTEM_FILE="${TEMP_DIR}/filesystem.txt"
	{
		print_heading "File Systems"
		print "${FILE_SYSTEMS}"
	} > "${FILESYSTEM_FILE}"

	local DEVICES_FILE="${TEMP_DIR}/devices.txt"
	{
		print_heading "Devices"
		print "${DEV_DEVICES}"
	} > "${DEVICES_FILE}"

	local USB_FILE="${TEMP_DIR}/usb.txt"
	{
		print_heading "USB Devices"
		print "${USB_DEVICES}"
	} > "${USB_FILE}"

	local i2C_FILE="${TEMP_DIR}/i2c.txt"
	{
		print_heading "I2C Devices"
		print "${I2C_DEVICES}"
	} > "${i2C_FILE}"

	local ALLSKYFILES_FILE="${TEMP_DIR}/allsky_files.txt"
	{
		print_heading "Files in ${ALLSKY_HOME}"
		local IGNORE
		IGNORE='__pycache__'
		IGNORE+='|system_fonts|python3*'		# python3 in venv has LOTs of files
		IGNORE+='|image-2*|startrails-*|keogram-*|allsky-2*|thumbnail-*'
		tree --du -h -ugp -I "${IGNORE}" "${ALLSKY_HOME}"
	} > "${ALLSKYFILES_FILE}"

	local ALLSKYVENV_FILE="${TEMP_DIR}/allsky_venv.txt"
	{
		print_heading "Allsky Venv information"
		print_info "Python Version:" "${PYTHON_VERSION}"
		# This produces too much output to hold in a variable.
		pip list

		echo -e "\n"
		print_heading "Package Information"
		# This produces too much output to hold in a variable.
		dpkg -l | grep python
	}  > "${ALLSKYVENV_FILE}"

	local APT_FILE="${TEMP_DIR}/apt.txt"
	{
		print_heading "APT installed packages"
		# This produces too much output to hold in a variable.
		sudo dpkg-query -l
	} > "${APT_FILE}"

	local LIGHTTPD_ERROR_LOG="/var/log/lighttpd/error.log"
	local LIGHTTPD_ERROR_LOG_FILE="${TEMP_DIR}/lighttpd_error.txt"
	if [[ -f ${LIGHTTPD_ERROR_LOG} ]]; then
		# Don't include these - they aren't errors.
		grep -E -v " server started | server stopped | logfiles cycled " \
			"${LIGHTTPD_ERROR_LOG}" > "${LIGHTTPD_ERROR_LOG_FILE}"
	fi

	PRIOR_WEBSITE_DIR="${ALLSKY_PRIOR_DIR}${ALLSKY_WEBSITE/${ALLSKY_HOME}/}"
	if [[ -d ${PRIOR_WEBSITE_DIR} ]]; then
		PRIOR_WEBSITE_CONFIG_FILE="${PRIOR_WEBSITE_DIR}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}"
		if [[ -s ${PRIOR_WEBSITE_CONFIG_FILE} ]]; then
			cp "${PRIOR_WEBSITE_CONFIG_FILE}" "${TEMP_DIR}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}-OLD.json"
		fi
	fi

	if [[ -f ${ALLSKY_WEBSITE_CONFIGURATION_FILE} ]]; then
		cp "${ALLSKY_WEBSITE_CONFIGURATION_FILE}" "${TEMP_DIR}/local_$( basename "${ALLSKY_WEBSITE_CONFIGURATION_FILE}" )"
	fi

	local SUPPORTED_CAMERAS_FILE="${TEMP_DIR}/supported_cameras.txt"
	{
		print_heading "Allsky - Supported Cameras"
		"${ALLSKY_UTILITIES}/showSupportedCameras.sh" --rpi --zwo
	} > "${SUPPORTED_CAMERAS_FILE}"

	local LIBCAMERA_FILE="${TEMP_DIR}/pi_cameras.txt"
	{
		print_heading "Pi Cameras"
		print "${RPI_CAMERAS}"
	} > "${LIBCAMERA_FILE}"

	local LOG_FILE
 	for L in "${ALLSKY_LOG}" "${ALLSKY_LOG}.1" "${ALLSKY_PERIODIC_LOG}" ; do
		if [[ -f ${L} ]]; then
  			LOG_FILE="${TEMP_DIR}/$( basename "${L}" ).txt"
			if [[ ${LOG_LINES} == "all" ]]; then
				cp "${L}" "${LOG_FILE}"
			else
				tail -n "${LOG_LINES}" "${L}" > "${LOG_FILE}"
			fi
		fi
  	done

	local CONF_FILE="/etc/lighttpd/lighttpd.conf"
	if [[ -f ${CONF_FILE} ]]; then
		cp "${CONF_FILE}" "${TEMP_DIR}/etc-$( basename "${CONF_FILE}" ).txt"
	fi

	cp "${ALLSKY_HOME}/variables.json" "${TEMP_DIR}"

	# Copy most of ${ALLSKY_TMP} directory.
	if [[ -d ${ALLSKY_TMP} ]]; then
		mkdir "${TEMP_DIR}/tmp"
		find "${ALLSKY_TMP}" -maxdepth 1 \
			! \( -path "${ALLSKY_TMP}" -o -name "sequence-timelapse*" -o -name __pycache__ \) \
			-exec cp -ar {} "${TEMP_DIR}/tmp" \;
	fi

	# Copy ${ALLSKY_CONFIG} directory, then truncate files we don't want.
	# The directory should exists unless installation failed.
	[[ -d ${ALLSKY_CONFIG} ]] && cp -ar "${ALLSKY_CONFIG}" "${TEMP_DIR}"

	local TEMP_DIR_MODULES="${TEMP_DIR}/${ALLSKY_MODULES/${ALLSKY_HOME}}"
	local TEMP_DIR_OVERLAY="${TEMP_DIR}/${ALLSKY_OVERLAY/${ALLSKY_HOME}}"

	# Truncate large files not needed for support.
	local X="${TEMP_DIR_OVERLAY}/config/tmp/overlay/de421.bsp"
	[[ -s ${X} ]] && truncate -s 0 "${X}"
	X="${TEMP_DIR_OVERLAY}/system_fonts"
	[[ -d ${X} ]] && find "${X}" -type f -exec truncate -s 0 {} +

	# If we have any sensitive data in the flows then truncate them.
	# If the variables.json file exists then there will be no sensitive data in the flows since
	# this data was moved to the env.json file in the same release that created variables.json.
	# This could do a version comparison but this is a much simpler check.
	if [[ ! -f "${ALLSKY_HOME}/variables.json" ]]; then
		X="${TEMP_DIR_MODULES}"
		[[ -d ${X} ]] && find "${X}" -type f -exec truncate -s 0 {} +
	fi

	local ZIP_NAME="support"
	ZIP_NAME+="-${GITHUB_REPO:-repo}"
	ZIP_NAME+="-${GITHUB_TYPE:-type}"
	ZIP_NAME+="-${GITHUB_NUMBER:-none}"
	ZIP_NAME+="-$( date +"%Y%m%d%H%M%S" ).zip"

	# We're in a subshell so we need to "echo" this to pass it back to our invoker.
	echo "${DIALOG_COMPLETE_MESSAGE//XX_ZIPNAME_XX/${ZIP_NAME}}"

	cd "${TEMP_DIR}" || exit 1
	zip -r "${TEMP_DIR}/${ZIP_NAME}" ./* > /dev/null 2>&1
	sudo mv "${ZIP_NAME}" "${ALLSKY_SUPPORT_DIR}"
	sudo chown "${USER_NAME}:${WEBSERVER_OWNER}" "${ALLSKY_SUPPORT_DIR}/${ZIP_NAME}"
	sudo chmod 664 "${ALLSKY_SUPPORT_DIR}/${ZIP_NAME}"

	rm -rf "${TEMP_DIR}"

	return 0
}

####
# Allows the user to enter the Github id
function get_github_number()
{
	if [[ ${AUTO_CONFIRM} == "true" || ${GITHUB_NUMBER} != "none" ]]; then
		return
	fi

	local GITHUB_NUMBER_TEMP
	local MSG="${DIALOG_BLUE}Enter the Github Issue or Discussion number.${DIALOG_NC}"
	MSG+="\n\nPress 'Enter' if you don't know it: "
	local DIALOG_TITLE="Github Issue / Discussion Number"

	while true; do
		# The prompt is written to stdout and the answer to stderr, so switch them.
		GITHUB_NUMBER_TEMP="$( display_box "--inputbox" "${DIALOG_TITLE}" "\n${MSG}" --no-cancel 3>&1 1>&2 2>&3 )"

		if [[ -n ${GITHUB_NUMBER_TEMP} ]]; then
			if [[ ${GITHUB_NUMBER_TEMP} =~ ^[+-]?[0-9]+$ ]]; then
				GITHUB_NUMBER="${GITHUB_NUMBER_TEMP}"
# TODO: look in GitHub's GITHUB_REPO for a Discussion or Issue with this number
# If found, set GITHUB_TYPE to "discussion" or "issue".
# Output error message and try again if not found.
GITHUB_TYPE="discussion"		# Assume this for now.
				break
			else
				display_box "--msgbox" "${DIALOG_TITLE}" "${GITHUB_ERROR}"
			fi
		else
			break
		fi
	done
}

function get_github_repo()
{
	if [[ ${AUTO_CONFIRM} == "false"  && ${SOURCE} == "" && -z ${GITHUB_REPO} ]]; then
		RESPONSE="$( dialog --clear \
		--colors \
		--title "Select Discussion/Issue Repository" \
		--menu "\nChoose a Respository:" 15 40 2 \
			1 "Allsky" \
			2 "Allsky modules" \
		3>&1 1>&2 2>&3)"

		if [[ ${RESPONSE} == "2" ]]; then
			GITHUB_REPO="ASM"
		else
			GITHUB_REPO="AS"
		fi
	fi
}

PROCESS_DIALOG=""
display_running_dialog()
{
	if [[ "${AUTO_CONFIRM}" == "false" ]]; then
		DIALOG_TITLE="Processing"
		DIALOG_TEXT="${DIALOG_BLUE}Please wait while the support information is collected...${DIALOG_NC}"
		display_box "--infobox" "${TITLE}" "\n\n${DIALOG_TEXT}\n"
	fi
}

display_complete_dialog()
{
	local STATUS="${1:-Complete}"
	if [[ ${AUTO_CONFIRM} == "false" ]]; then
		display_box "--msgbox" " ${STATUS} " "${DIALOG_COMPLETE_MESSAGE}" 2>/dev/null
		clear
		echo -e "$( remove_colors "\n${DIALOG_COMPLETE_MESSAGE}\n" )"
	fi
}

display_start_dialog()
{
	if [[ ${AUTO_CONFIRM} == "false" ]]; then
		clear
		if [[ ${TEXT_ONLY} == "false" ]]; then
			SUPPORT_TCS+="Do you want to continue?\n"
		fi
		if ! display_box "--yesno" "Generate Support Information" "${SUPPORT_TCS}" ; then
			dialog --clear
			exit 1
		fi
	fi
}

kill_running_dialog()
{
	[[ -n ${PROCESS_DIALOG} ]] && kill "${PROCESS_DIALOG}"
}

####
# Display script usage information
function usage_and_exit()
{
	local RET=${1}
	exec 2>&1
	local USAGE="\nUsage: ${ME} [--help] [--tree] [--type t] [--repo r] [--number n] [--fullusb] "
	if [[ ${RET} -ne 0 ]]; then
		E_ "${USAGE}"
	else
		echo -e "${USAGE}"
	fi
	echo
	echo "Where:"
	echo "	--help        Displays this message and exits."
	echo "	--text        Use text mode. Options must be specified on the command line."
	echo "	--auto        Auto accept any prompts and produce no output except for errors."
	echo "	--type t      'D' for Github Discussion, 'I' for Issue."
	echo "	--repo r      Use the specified Github repository, either 'AS' for Allsky or 'ASM' for Allsky Modules."
	echo "	--number n    The Github Issue or Discussion number."
	echo "	--loglines n  Number of lines to include from log files, defaults to 'all' for entire file."

	exit "${RET}"
}


############################################## main body

OK="true"
TEXT_ONLY="false"		# Also used by display_box()
GITHUB_NUMBER="none"
GITHUB_REPO=""
GITHUB_TYPE=""
AUTO_CONFIRM="false"
LOG_LINES="all"

while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
		--help)
			DO_HELP="true"
			;;

		--text)
			TEXT_ONLY="true"
			;;

		--auto)
			AUTO_CONFIRM="true"
			;;

		--type)
			GITHUB_TYPE="${2}"
			shift
			;;

		--repo)
			GITHUB_REPO="${2}"
			shift
			;;

		--number)
			GITHUB_NUMBER="${2}"
			shift
			;;

		--loglines)
			LOG_LINES_TEMP="${2}"
			if [[ ${LOG_LINES_TEMP} =~ ^[0-9]+$ ]]; then
				LOG_LINES="${LOG_LINES_TEMP}"
			else
				LOG_LINES_TEMP="${LOG_LINES_TEMP,,}"
				if [[ ${LOG_LINES_TEMP} != "all" ]]; then
					E_ "ERROR: ${ARG} must be numeric or 'all'." >&2
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

set_dialog_info
set_messages
display_start_dialog
get_github_repo
get_github_number
display_running_dialog
collect_support_info
DIALOG_COMPLETE_MESSAGE="$( generate_support_info 2>&1 )"
RET=$?
kill_running_dialog
if [[ ${RET} -eq 0 ]]; then
	display_complete_dialog
else
	display_complete_dialog "Failure"
fi
exit "${RET}"
