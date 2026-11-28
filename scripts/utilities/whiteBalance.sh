#!/bin/bash

#x#x#x#x#x#x#x#x#x#x#x#x#x#x#x#x#x#x#x#x#x#x#x#x	TODO
# Do a DB query, which replaces the "sed".

# Allow "buffer_minutes" value:
#	For day, look at (day_start + buffer_minutes)  to (day_end - buffer_minutes).
#	For night, look at (night_start + buffer_minutes)  to (night_end - buffer_minutes).
# For each day, get daytime start and nighttime start times, convert to seconds, add/subtract buffer, then compare those times.

# Allow start/stop times (normally days).
# --from-date,   --to-date

# Prompt / command line argument to automatically update the settings file.
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
	local USAGE="Usage: ${ME} [--help] [--use-log] [--from-date d] [--to-date d] [--buffer b]"
	if [[ ${RET} -ne 0 ]]; then
		wE_ "${USAGE}"
		[[ ${HTML} == "true" ]] && RET="${ALLSKY_EXIT_ERROR_STOP}"
	else
		echo -e "${USAGE}"
	fi

	echo "Arguments:"
	echo "   --help              Displays this message and exits."
	echo "   --use-log           Look in ${ALLSKY_LOG} instead of the Allsky database for"
	echo "                       white balance data."
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
USE_LOG="false"
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
		--use-log)
			USE_LOG="true"
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
		# get yesterday's date (or the day prior to the most recent one)
		FROM_DATE="$( cd "${ALLSKY_IMAGES}"; ls -d -tr 20* | tail -2 | head -1)"
fi
if [[ -z ${TO_DATE} ]]; then
		# get today's date (or the most recent date)
		TO_DATE="$( cd "${ALLSKY_IMAGES}"; ls -d -tr 20* | tail -1)"
fi
if [[ ${FROM_DATE} != ${TO_DATE} ]]; then
	DATE_RANGE="IN ('${FROM_DATE}', '${TO_DATE}')"
else
	DATE_RANGE="= '${FROM_DATE}'"
fi

		BUFFER_MIN="${BUFFER_MIN}"		#XXXXXXXX Keeps shellcheck quiet

if [[ ${USE_LOG} == "true" ]]; then
	# Typical log entry:
	#	... saveImage.sh DAY .../image-xxx.jpg TIMESTAMP=1795555286 ...
	#		AUTOWB=1 sAUTOAWB= WBR=2.500000 WBB=2.12
	# Convert to:
	#	DAY .../image-xxx.jpg TIMESTAMP=1795555286 ... AUTOWB=0 WBR=2.500000 WBB=2 
	sed --silent -e "/saveImage.sh.*TIMESTAMP.*AUTOWB=1/s/.*saveImage.sh //p" "${ALLSKY_LOG}"

	# TODO: filter based on FROM_DATE and TO_DATE
else
	# The gawk script assumes this order:
	SQL="SELECT AS_DAY_OR_NIGHT, AS_WBR, AS_WBB"

	SQL+=" FROM ${ALLSKY_IMAGES_TABLE} WHERE"
	SQL+=" AS_AUTOWB=1"
	SQL+=" AND AS_DATE_NAME ${DATE_RANGE}"
	SQL+=" AND AS_CAMERA_TYPE='${CAMERA_TYPE}'"
	SQL+=" AND AS_CAMERA_MODEL='${CAMERA_MODEL}'"
# echo SQL=$SQL >&2
	"${ALLSKY_DATABASE_COMMAND}" --run "${SQL}"
fi |
	gawk -v HTML="${HTML}" -v USE_LOG="${USE_LOG}" '
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
		printf("No %s images were taken with %s turned on.\n", day_night, AWB_NAME);
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

	{
		onLine++;

		DAY_or_NIGHT = $1;
		if (USE_LOG == "true") {
			WBR=0;	WBB=0;
			for (i=2; i<=NF; i++) {
				if ($i ~ /WBR=/) {
					split($i, fields, "=")
					WBR = fields[2];
				} else if ($i ~ /WBB=/) {
					split($i, fields, "=")
					WBB = fields[2];
				}
			}
		} else {
			WBR = $2;
			WBB = $3;
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

		} else {	# NIGHT
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
