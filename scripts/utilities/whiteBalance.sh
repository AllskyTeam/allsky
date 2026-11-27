#!/bin/bash

#x#x#x#x#x#x#x#x#x#x#x#x#x#x#x#x#x#x#x#x#x#x#x#x	TODO
# Add CAMERA_TYPE, CAMERA_MODEL, AUTOWB, WBR, and WBB to the database (allsky_loadimage.py ?)
#	Do a DB query, which replaces the "sed".

# Allow "buffer_minutes" value:
#	For day, look at (day_start + buffer_minutes)  to (day_end - buffer_minutes).
#	For night, look at (night_start + buffer_minutes)  to (night_end - buffer_minutes).
# For each day, get daytime start and nighttime start times, convert to seconds, add/subtract buffer, then compare those times.

# Allow start/stop times (normally days).
# --from-date,   --to-date
#x#x#x#x#x#x#x#x#x#x#x#x#x#x#x#x#x#x#x#x#x#x#x#x

# Determine the average daytime and nighttime Auto White Balance settings use,
# so users can set the manual settings to those values.
#
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )" )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh" --force			|| exit "${ALLSKY_EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"					|| exit "${ALLSKY_EXIT_ERROR_STOP}"

usage_and_exit()
{
	local RET=${1}
	exec >&2
	echo
	local USAGE="Usage: ${ME} [--help] [--from-date d] [--to-date d] [--buffer b]"
	if [[ ${RET} -ne 0 ]]; then
		wE_ "${USAGE}"
		[[ ${HTML} == "true" ]] && RET="${ALLSKY_EXIT_ERROR_STOP}"
	else
		echo -e "${USAGE}"
	fi

	echo "Arguments:"
	echo "   --help              Displays this message and exits."
	echo "   --from-date d       Starts looking for images on date 'd'."
	echo "   --to-date d         Stops looking for images on date 'd'."
	echo "   --buffer b          Ignore the first 'b' minutes after daytime and nighttime start"
	echo "                       and 'b' minutes before daytime and nighttime end."

	echo
	echo "Calculates the average red and blue white balance numbers when"
	echo "Auto White Balance is enabled."
	echo "This is useful to determine the manual red and blue balances to use."
	echo

	exit "${RET}"
}

OK="true"
DO_HELP="false"
HTML="false"
FROM_DATE=""
TO_DATE=""
BUFFER_MIN="60"
while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
		--help)
			DO_HELP="true"
			;;
		--html)
			HTML="true"
			;;
		--from-date)
			FROM_DATE="${2}"
			shift
			;;
		--to-date)
			TO_DATE="${2}"
			shift
			;;
		--buffer)
			BUFFER_MIN="${2}"
			shift
			;;
		-*)
			wE_ "Unknown argument '${ARG}'." >&2
			OK="false"
			;;
	esac
	shift
done
[[ ${DO_HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" ]] && usage_and_exit 1
if [[ -n ${FROM_DATE} && -n ${TO_DATE} && ${FROM_DATE} > "${TO_DATE}" ]]; then
	echo "${ME}: ERROR: --from-date must be before --to-date" >&2
	usage_and_exit 1
fi

if [[ -z ${FROM_DATE} ]]; then
:
		#XXXXXXXXX TODO: get yesterday's date
fi
if [[ -z ${TO_DATE} ]]; then
:
		#XXXXXXXXX TODO: get today's date
fi

# Typical log entry
#	... saveImage.sh DAY .../image-20261124152126.jpg TIMESTAMP=1795555286 ... AUTOWB=1 sAUTOAWB= WBR=2.500000 WBB=2.12

sed --silent -e "/saveImage.sh.*TIMESTAMP.*AUTOWB=1/s/.*saveImage.sh //p" "${ALLSKY_LOG}" |
	gawk -v HTML="${HTML}" '
	BEGIN {
		numDayAutoWhiteBalanceFound = 0;
		numNightAutoWhiteBalanceFound = 0;
		totalDayRed = 0;
		totalNightRed = 0;
		totalDayBlue = 0;
		totalNightBlue = 0;
		numDayRed = 0;
		numNightRed = 0;
		numDayBlue = 0;
		numNightBlue = 0;

		onLine = 0;

		AWB_NAME = "Auto White Balance";
		if (HTML == "true") {
			bold_on = "<strong>";
			bold_off = "</strong>";
			AWB_NAME = "<span class=\"WebUISettings\">" AWB_NAME "</span>"
		} else {
			bold_on = "";
			bold_off = "";
		}
	}

	# ZWO uses integers, RPi cameras use float.
	function is_float(val) {
		# Matches optional +/-, digits with a mandatory decimal point, and optional exponent
		return (val ~ /^[+-]?([0-9]+\.[0-9]*|\.[0-9]+)([eE][+-]?[0-9]+)?$/)
	}

	function no_images(day_night) {
		printf("%s", bold_on);
		printf("No NIGHT images were taken with %s turned on.\n", AWB_NAME);
		printf("%s", bold_off);
	}
	function no_images_color(day_night, color) {
		printf("%s", bold_on);
		printf("Unable to determine %s %s value", day_night, color);
		printf("- no images with %s turned on.\n", AWB_NAME);
		printf("%s", bold_off);
	}

	function do_ave(day_night, color, total, num) {
		ave = total / num;
		if (! is_float(total)) {
			ave = int(ave + 0.5);
			f = "%d";
		} else {
			f = "%.3f";
		}
		printf("Average %s %s value using %4d images = %s" f "%s\n", day_night, color, num, bold_on, ave, bold_off);
	}

	#	DAY .../image-20261124152126.jpg TIMESTAMP=1795555286 ... AUTOWB=0 WBR=2.500000 WBB=2 
	{
		onLine++;

		DAY_or_NIGHT = $1;
		WBR=0;	WBB=0;
		for (i=3; i<=NF; i++) {
			if ($i ~ /WBR=/) {
				split($i, fields, "=")
				WBR += fields[2];
			} else if ($i ~ /WBB=/) {
				split($i, fields, "=")
				WBB += fields[2];
			}
		}
		if (DAY_or_NIGHT == "DAY") {
			numDayAutoWhiteBalanceFound++;
			if (WBR > 0) {
				numDayRed++
				totalDayRed += WBR;
			}
			if (WBB > 0) {
				numDayBlue++
				totalDayBlue += WBB;
			}
		} else {
			numNightAutoWhiteBalanceFound++;
			if (WBR > 0) {
				numNightRed++
				totalNightRed += WBR;
			}
			if (WBB > 0) {
				numNightBlue++
				totalNightBlue += WBB;
			}
		}
	}

	END {
		if (numDayAutoWhiteBalanceFound == 0 && numNightAutoWhiteBalanceFound == 0) {
			no_images("DAY or NIGHT");
			exit(1);
		}

		if (numDayAutoWhiteBalanceFound == 0) {
			no_images("DAY");
		} else {
			if (numDayRed == 0) {
				no_images_color("DAY", "Red");
			} else {
				do_ave("DAY  ", "Red ", totalDayRed, numDayRed)
			}
			if (numDayBlue == 0) {
				no_images_color("DAY", "Blue");
			} else {
				do_ave("DAY  ", "Blue", totalDayBlue, numDayBlue)
			}
		}

		printf("\n");
		if (numNightAutoWhiteBalanceFound == 0) {
			no_images("NIGHT");
		} else {
			if (numNightRed == 0) {
				no_images_color("NIGHT", "Red");
			} else {
				do_ave("NIGHT", "Red ", totalNightRed, numNightRed)
			}
			if (numNightBlue == 0) {
				no_images_color("NIGHT", "Blue");
			} else {
				do_ave("NIGHT", "Blue", totalNightBlue, numNightBlue)
			}
		}

		exit(0);
	}'
