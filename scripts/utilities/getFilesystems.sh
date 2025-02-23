#!/bin/bash

# Help the user determine where a device like an SSD is mounted.

# Allow this script to be executed manually, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/../.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"					|| exit "${EXIT_ERROR_STOP}"

function outputData()
{
	local HEADER="${1}"
	local ENTRIES="${2}"

	echo
	I_ "$( echo "${HEADER}" | nawk '{
			printf("%-15s %10s %6s  %-30s\n", $1, $4, $6, "PATH");
		}' )"
	echo "${ENTRIES}" | nawk '{
			printf("%-15s %10s %6s  %-30s\n", $1, $4, $6, $7 " " $8 " " $9);
		}'
	echo
}


echo

FS="$( lsblk )"

# Typical output:
#	NAME        MAJ:MIN RM   SIZE RO TYPE MOUNTPOINTS
#	sda           8:0    0 931.5G  0 disk 
#	|-sda1        8:1    0   128M  0 part 
#	|-sda2        8:2    0 931.4G  0 part /media/pi/SSD
#	nvme0n1     259:0    0 465.8G  0 disk 
#	|-nvme0n1p1 259:1    0   512M  0 part /boot/firmware
#	|-nvme0n1p2 259:2    0 465.3G  0 part /

#	$1          $2       $3 $4     $5 $6  $7

HEADER="$( echo "${FS}" | head -1 )"
ENTRIES="$( echo "${FS}" | grep -v "${HEADER}" )"

# Ignore the boot drive and entries we know aren't the user's storage device.
POSSIBLE="$( echo "${ENTRIES}" | nawk 'BEGIN { num = 0; }
	{
		if ($6 == "part") {
			M = $7;
			if ($7 != "/" && substr($7, 0, 5) != "/boot") {
				printf("%s", $7);
				# Check for up to 2 blanks in the mount point.
				if ($8 != "") printf("%s", $8);
				if ($9 != "") printf("%s", $9);
				if (++num > 1) printf("\n");
			}
		}
	}' )"

if [[ -n ${POSSIBLE} ]]; then
	NUM=$( echo -e "${POSSIBLE}" | wc -l )
	echo -n "Your storage device is likely"
	if [[ ${NUM} -eq 1 ]]; then
		echo " the entry below whose 'PATH' column is '${POSSIBLE}',"
		echo "as long as the 'Size' roughly matches your device."
	else
		echo " one of the entries below whose 'TYPE' column is 'part'."
		echo "Pick the entry whose 'SIZE' most closely matches your device."
		echo "Your storage device is in the directory in the 'PATH' column."
	fi

	outputData "${HEADER}" "${ENTRIES}"

else
	# We get here if the disk isn't connected or isn't mounted.
	# Light versions of Pi OS don't have an automounter so we need to use lsblk.
	W_ "WARNING: Unable to determine where your storage device is.\n"

	echo "All the disks the Pi sees are shown below:"

	outputData "${HEADER}" "${ENTRIES}"

	echo "Look at the line whose 'TYPE' column is 'part' and whose 'SIZE' column is"
	echo "roughly the size of your device."
	echo "If there is something in the 'PATH' column, your device is likely in that directory."
	echo
	echo "If the 'PATH' column is blank, do the following:"
	echo "   sudo mkdir /media/SSD    # Change 'SSD' to anything you want"
	echo "   # Look in the 'NAME' column of the entry for your device,"
	echo "   # then run this, replacing 'NAME' and 'SSD' (if you changed it above):"
	echo "   sudo mount /dev/NAME /media/SSD"
	echo
	echo "Your storage device will then be in the '/media/SSD' directory."

	echo -e "\nIf NONE of the entries appear to be your storage device,"
	echo "either there is no filesystem on the device, or the Pi doesn't recognize it."
	echo

	exit 1
fi

exit 0
