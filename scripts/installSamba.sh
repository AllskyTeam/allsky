#!/bin/bash

# Install SAMBA to enable network access to/from another device.
# Base idea from StackExchange ( https://bit.ly/3Qqzbnp )

# Allow this script to be executed manually, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/.." )"
ME="$( basename "${BASH_ARGV0}" )"

# shellcheck source-path=..
source "${ALLSKY_HOME}/variables.sh"	|| exit 1

if [[ -z ${LOGNAME} ]]; then
	echo "${RED}${ME}: Unknown LOGNAME; cannot continue.${NC}" >&2
	exit 1
fi


OK="true"
while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
		--help)
			DO_HELP="true"
			;;
# TODO: allow some customization like SHARE_NAME
		-*)
			echo -e "${RED}Unknown argument '${ARG}' ignoring.${NC}" >&2
			OK="false"
			;;
	esac
	shift
done

usage_and_exit()
{
	local RET=${1}
	{
		echo
		[[ ${RET} -ne 0 ]] && echo -en "${RED}"
		echo "Usage: ${ME} [--help]"
		[[ ${RET} -ne 0 ]] && echo -en "${NC}"
		echo "    where:"
		echo "      '--help' displays this message and exits."
	} >&2
	exit "${RET}"
}
[[ ${DO_HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" ]] && usage_and_exit 1

CAP="${LOGNAME:0:1}"
CAP="${CAP^^}${LOGNAME:1}"
SHARE_NAME="${SHARE_NAME:-${LOGNAME}_home}"

# Check if SAMBA is already installed and configured
CONFIG_FILE="/etc/samba/smb.conf"
if [[ -f ${CONFIG_FILE} ]] && grep --silent "\[${SHARE_NAME}]" "${CONFIG_FILE}" ; then
	echo -e "\n${YELLOW}"
	echo "*************"
	echo "You Pi is already configured to share files with other network devices"
	echo "using the '${SHARE_NAME}' share."
	echo -e "\n"
	echo -en "${BOLD}"
	echo "=========================================="
	echo -n "Press RETURN to continue or 'q' to quit: "
	read -r x
	echo -e "${NC}"
	[[ ${x:0:1} == "q" ]] && exit 0
fi

echo -e "\n${YELLOW}"
echo "*************"
echo "This script will install SAMBA which lets remote devices mount"
echo "your Pi as a network drive."
echo "The '${HOME}' directory on the Pi will appear as '${SHARE_NAME}' on remote devices."
echo "You can then copy files to and from the Pi as you would from any other drive."
echo
echo "When installation is done you will be prompted for a SAMBA password."
echo
echo -en "${BOLD}"
echo "=========================================="
echo -n "Press RETURN to continue or 'q' to quit: "
read -r x
echo -e "${NC}"
[[ ${x:0:1} == "q" ]] && exit 0

# Install SAMBA 
mkdir -p "${ALLSKY_LOGS}"
LOG="${ALLSKY_LOGS}/SAMBA.log"

echo -e "${GREEN}..... Installing SAMBA.${NC}"
sudo apt install samba -y > "${LOG}" 2>&1
if [[ $? -ne 0 ]]; then
	echo -e "\n${RED}"
	echo "Installation of SAMBA failed:"
	echo "$( < "${LOG}" )"
	echo -e "${NC}"
	exit 1
fi

# Add the user to SAMBA and prompt for their SAMBA password.
echo -e "\n${YELLOW}"
echo "You will be prompted for a SAMBA password which remote machines will use to"
echo "map to your Pi's drive."
echo "This is a different password than ${LOGNAME}'s password or the root password,"
echo "although you may elect to make them the same."
echo
echo "If this is your first time installing SAMBA on this Pi and
echo "you are prompted for a CURRENT password, echo "press 'Enter'."
echo "*************"
echo -e "${NC}"
sudo smbpasswd -a "${LOGNAME}"			|| exit 1

WORKGROUP="WORKGROUP"
echo -e "${GREEN}..... Configuring SAMBA.${NC}"

sudo mv -f "${CONFIG_FILE}" "${CONFIG_FILE}.bak"

sudo tee "${CONFIG_FILE}" > /dev/null <<EOF
### Config File ###

[global]
workgroup = ${WORKGROUP}
server role = standalone server
obey pam restrictions = no
map to guest = never

client min protocol = SMB2
client max protocol = SMB3
vfs objects = catia fruit streams_xattr
fruit:metadata = stream
fruit:model = RackMac
fruit:posix_rename = yes
fruit:veto_appledouble = no
fruit:wipe_intentionally_left_blank_rfork = yes
fruit:delete_empty_adfiles = yes
security = user
encrypt passwords = yes

# Optional logging.  Is very verbose.
# log file = /var/log/samba/log.%m
# max log size = 1000
# logging = file

# The directories you want accessible by other devices.
# Each one's name must be surrounded by [].

[${SHARE_NAME}]
comment = ${CAP} home directory
path = ${HOME}
browseable = yes
read only = no
create mask = 0664
directory mask = 0775

### end Config ###
EOF

echo -e "${GREEN}..... Restarting SAMBA.${NC}"
sudo /etc/init.d/smbd restart

echo -e "${YELLOW}"
echo "*************"
echo "You can now mount '${SHARE_NAME}' on your remote device using"
echo "workgroup '${WORKGROUP}' and login name '${LOGNAME}'."
echo "If you don't know how to do that, see your remote device's operating system documentation."
echo "*************"
echo -e "${NC}"

exit 0
