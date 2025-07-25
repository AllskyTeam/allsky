#!/bin/bash

# Help the user determine where a device like an SSD is mounted.
# This would be a 2nd drive (or 3rd, etc.).

# Allow this script to be executed manually, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/../.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"					|| exit "${EXIT_ERROR_STOP}"

usage_and_exit()
{
	local RET=${1}
	exec >&2
	echo
	local USAGE="Usage: ${ME} [--help] [--debug]"
	if [[ ${RET} -ne 0 ]]; then
		E_ "${USAGE}"
	else
		echo -e "${USAGE}"
	fi

	echo
	echo "This command helps determine the path to a storage device like an SSD."
	echo

	exit "${RET}"
}
OK="true"
DEBUG="false"
DO_HELP="false"
while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
		--help)
			DO_HELP="true"
			;;
		--debug)
			DEBUG="true"
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

function outputData()
{
	local HEADER="${1}"
	local ENTRIES="${2}"

	echo
	I_ "$( echo "${HEADER}" | nawk '{
			# Replace "MOUNTPOINTS" with "PATH" for readability.
			#       NAME  SIZE TYPE  HOTPLUG MOUNTPOINTS
			printf("%-15s %10s %6s   %7s     %-30s\n", $1, $2, $3, $4, "PATH");
		}' )"
	echo "${ENTRIES}" | nawk '{
			printf("%-15s %10s %6s   %-7s     %-30s\n",
				$1, $2, $3, $4 == 0 ? "no" : "yes", $5 " " $6 " " $7);
		}'
	echo
}


# Light versions of Pi OS don't have an automounter so we need to use lsblk.
FS="$( lsblk --output "NAME,SIZE,TYPE,HOTPLUG,MOUNTPOINTS" )"

# Typical lsblk output:
#	NAME        SIZE    TYPE  HOTPLUG MOUNTPOINTS
#	sda         931.5G  disk  0
#	|-sda1      128M    part  0
#	|-sda2      931.4G  part  1        /media/pi/SSD
#	nvme0n1     465.8G  disk  0
#	|-nvme0n1p1 512M    part  0        /boot/firmware
#	|-nvme0n1p2 465.3G  part  0        /

#	$1          $2       $3   $4       $5

HEADER="$( echo "${FS}" | head -1 )"
ENTRIES="$( echo "${FS}" | grep -v "${HEADER}" )"
NUM_DISKS="$( echo "${FS}" | grep --count -E " disk| disk $" )"

# Ignore the boot drive and entries we know aren't the user's extra storage device.
POSSIBLE="$( echo "${ENTRIES}" | nawk 'BEGIN { num = 0; }
	{
		if ($3 == "part") {
			mountPoint = $5;
			if (mountPoint != "/" && substr(mountPoint, 0, 5) != "/boot") {
				printf("%s", mountPoint);
				# Check for up to 2 blanks in the mount point.
				if ($6 != "") printf(" %s", $6);
				if ($7 != "") printf(" %s", $7);
				if (++num > 1) printf("\n");
			}
		}
	}' )"

if [[ ${DEBUG} == "true" ]]; then
	echo "HEADER=[${HEADER}]"
	echo "ENTRIES=[${ENTRIES}]"
	echo "NUM_DISKS=${NUM_DISKS}"
	echo "POSSIBLE=[${POSSIBLE}]"
	echo
fi

if [[ -n ${POSSIBLE} ]]; then
	echo
	if [[ ${NUM_DISKS} -eq 1 ]]; then
		W_ "This is the only disk the Pi sees:"
	else
		echo "The Pi sees these disks:"
	fi
	indent --spaces "$( outputData "${HEADER}" "${ENTRIES}" )"

	NUM=$( echo -e "${POSSIBLE}" | wc -l )
	echo
	echo -n "Your extra storage device is likely"
	if [[ ${NUM} -eq 1 ]]; then
		echo " the one above whose 'PATH' column is '${POSSIBLE}',"
		echo "as long as the 'SIZE' roughly matches your device."
		if [[ ${POSSIBLE} =~ " " ]]; then
			echo
			echo "If this is your device we suggest removing the space from the PATH name,"
			echo "which may require changing the disk's label."
		fi
	else
		echo " one of the entries above whose 'TYPE' column is 'part'."
		echo "Pick the entry whose 'SIZE' most closely matches your device."
		echo "Your storage device is in the directory in the 'PATH' column."
	fi
	echo

else
	# We get here if the "other" disk isn't connected or isn't mounted.
	MSG="\nWARNING: Unable to determine where your storage device is"
	if [[ ${NUM_DISKS} -eq 1 ]]; then
		W_ "${MSG} - only 1 disk found:"
		indent --spaces "$( outputData "${HEADER}" "${ENTRIES}" )"
		exit 1
	fi

	W_ "${MSG}."
	echo
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
