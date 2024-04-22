#!/bin/bash

# Install SAMBA to enable network access to another device.
# Base idea from StackExchange ( https://bit.ly/3Qqzbnp )

if [[ -z ${LOGNAME} ]]; then
	echo "Unknown LOGNAME; cannot continue;" >&2
	exit 1
fi
source "${ALLSKY_HOME}/variables.sh"	|| exit 1
CAP="${LOGNAME:0:1}"
CAP="${CAP^^}${LOGNAME:1}"
SHARE_NAME="${LOGNAME}_home"

echo -e "${YELLOW}"
echo "*************"
echo "This script will install SAMBA which lets remote devices mount your Pi as a network drive."
echo "The '${HOME}' directory on the Pi will appear as '${SHARE_NAME}' on remote devices."
echo "You can then copy files to and from the Pi as you would from any other drive."
echo
echo -n "Press any key to continue: "; read x
echo "${NC}"

# Install SAMBA 
sudo apt install samba -y				|| exit 1

# Add the user to SAMBA and prompt for their SAMBA password.
echo -e "${YELLOW}"
echo "*************"
echo "You will be prompted for a SAMBA password which remote machines will use to"
echo "map to your Pi's drive."
echo "This is a different password than ${LOGNAME}'s password or the root password,"
echo "although you may elect to make them the same."
echo
echo "If this is your first time installing SAMBA and you are prompted for a current password,"
echo "press 'Enter'."
echo "*************"
echo "${NC}"
sudo smbpasswd -a ${LOGNAME}			|| exit 1

WORKGROUP="WORKGROUP"
CONFIG_FILE="/etc/samba/smb.conf"
echo -e "${GREEN}..... Configuring SAMBA.${NC}"

sudo mv -f ${CONFIG_FILE} ${CONFIG_FILE}.bak

sudo tee ${CONFIG_FILE} > /dev/null <<EOF
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
