#!/bin/bash

# Install SAMBA to enable network access to/from another device.
# Base idea from StackExchange ( https://bit.ly/3Qqzbnp )

# Allow this script to be executed manually, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$(dirname "${BASH_ARGV0}")/../.." )"
ME="$( basename "${BASH_ARGV0}" )"

# shellcheck source-path=..
source "${ALLSKY_HOME}/variables.sh"	|| exit 1
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/installUpgradeFunctions.sh"	|| exit "${EXIT_ERROR_STOP}"


if [[ -z ${LOGNAME} ]]; then
	E_ "${ME}: Unknown LOGNAME; cannot continue." >&2
	exit 1
fi

usage_and_exit()
{
	local RET=${1}
	exec >&2
	echo
	local USAGE="Usage: ${ME} [--help]"
	if [[ ${RET} -ne 0 ]]; then
		E_ "${USAGE}"
	else
		echo -e "${USAGE}"
	fi

	echo
	echo "Configure your Pi using the Samba protocol to allow easy file transfers to"
	echo "and from PCs and MACs.  The HOME directory of the login you use on the Pi"
	echo "will be available to connect to a PC or MAC,"
	echo "where it will be treated like any other disk.  You can then drag and drop files."
	echo

	exit "${RET}"
}

OK="true"
DO_HELP="false"
while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
		--help)
			DO_HELP="true"
			;;
		-*)
			E_ "Unknown argument '${ARG}'." >&2
			OK="false"
			;;
	esac
	shift
done
[[ ${DO_HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" ]] && usage_and_exit 1

mkdir -p "${ALLSKY_LOGS}"
DISPLAY_MSG_LOG="${ALLSKY_LOGS}/SAMBA.log"

display_msg --logonly info "STARTING SAMBA INSTALLATION"

# TODO: Allow some customization, like SHARE_NAME.
# TODO: Allow sharing more than one directory.

CAP="${LOGNAME:0:1}"
CAP="${CAP^^}${LOGNAME:1}"
SHARE_NAME="${SHARE_NAME:-${LOGNAME}_home}"
STARS="*************"

# Check if SAMBA is already installed and configured
CONFIG_FILE="/etc/samba/smb.conf"
if [[ -f ${CONFIG_FILE} ]] && grep --silent "\[${SHARE_NAME}]" "${CONFIG_FILE}" ; then
	MSG="The Pi is already using SAMBA with '${SHARE_NAME}' share."
	display_msg --logonly info "${MSG}"

	MSG="Your Pi is already configured to share files with other network devices"
	MSG+=" using the '${cBOLD}${SHARE_NAME}${cNBOLD}' share."
	W_ "\n${STARS}\n${MSG}\n"
# TODO: Allow un-sharing the directory ?
	exit 0
fi

MSG="This script will install the SAMBA package which lets remote devices"
MSG+=" mount your Pi as a network drive."
MSG+="\nThe '${cBOLD}${HOME}${cNBOLD}' directory on the Pi will appear"
MSG+=" as '${cBOLD}${SHARE_NAME}${cNBOLD}' on remote devices."
MSG+="\nOnce the installation completes, you can copy files to and from the Pi"
MSG+=" as you would from any other drive."
I_ "${STARS}\n${MSG}\n"

echo
echo -en "${cYELLOW}${cBOLD}"
echo    "============================================="
echo -en "Press RETURN to continue the installation: ${cNC}"
# shellcheck disable=SC2034
read -r x
echo


display_msg --log progress "Installing SAMBA"
ERR="$( sudo apt install samba -y 2>&1 )"
if [[ $? -ne 0 ]]; then
	MSG="Installation of SAMBA failed: ${ERR}"
	display_msg --log error "${MSG}"
	exit 1
fi

# Add the user to SAMBA and prompt for their SAMBA password.
MSG="\n${STARS}"
MSG+="\nYou will now be prompted for a SAMBA password which remote machines will use to"
MSG+=" map to your Pi's drive."
MSG+="\nThis is a different password than the ${LOGNAME} login's password or the root password,"
MSG+="\nalthough you may elect to make them the same."
MSG+="\n"
MSG+="\nIf this is your first time installing SAMBA on this Pi and"
MSG+="\nyou are prompted for a CURRENT password, press '${cBOLD}Enter${cNBOLD}'."
I_ "${MSG}\n"
sudo smbpasswd -a "${LOGNAME}"			|| exit 1

WORKGROUP="WORKGROUP"
display_msg --log progress "Configuring SAMBA"

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

display_msg --log progress "Restarting SAMBA."
sudo /etc/init.d/smbd restart

MSG="\n${STARS}"
MSG+="\nYou can now mount '${cBOLD}${SHARE_NAME}${cNBOLD}' on your remote device using"
MSG+="workgroup '${cBOLD}${WORKGROUP}${cNBOLD}' and login name '${cBOLD}${LOGNAME}${cNBOLD}'."
MSG+="\nIf you don't know how to do that, see your remote device's operating system documentation."
MSG+="\n${STARS}"
I_ "${MSG}"

display_msg --logonly info "ENDING SAMBA INSTALLATION"
exit 0
