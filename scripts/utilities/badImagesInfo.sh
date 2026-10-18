#!/bin/bash
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$(dirname "${BASH_ARGV0}")/../.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit "${ALLSKY_EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"					|| exit "${ALLSKY_EXIT_ERROR_STOP}"

SETTING_NAME="Remove Bad Images Threshold"

usage_and_exit()
{
	local RET=${1}
	local MSG="${2}"
	exec 2>&1
	[[ ${HTML} == "true" ]] && echo "<pre>"

	local USAGE="\n"
	[[ -n ${MSG} ]] && USAGE+="${MSG}\n"
	USAGE+="Usage: ${ME} [--help] [--show_bad_images] [--html]"
	if [[ ${RET} -ne 0 ]]; then
		wE_ "${USAGE}"
		[[ ${HTML} == "true" ]] && RET="${ALLSKY_EXIT_ERROR_STOP}"
	else
		echo -e "${USAGE}"
	fi
	echo "Arguments:"
	echo "   --help              Displays this message and exits."
	echo "   --show_bad_images   Displays a list of 'bad' images that were removed."
	echo "   --html              Displays output in HTML (web) format."
	echo
	echo "This command displays information on the 'bad' images, that is,"
	echo "ones that were too dark or too light and so were not saved."
	echo "The settings to determine 'too dark' and 'too light' are"
	echo "'${SETTING_NAME} Low' and '${SETTING_NAME} High'."
	echo

	[[ ${HTML} == "true" ]] && echo "<pre>"
	exit "${RET}"
}

OK="true"
DO_HELP="false"
HTML="false"
SHOW_BAD_IMAGES=0
while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
		--help)
			DO_HELP="true"
			;;
		--html)
			HTML="true"
			;;
		--show_bad_images)
			SHOW_BAD_IMAGES="1"
			;;
		-*)
			E_ "Unknown argument '${ARG}' ignoring." >&2
			OK="false"
			;;
		*)
			break
			;;
	esac
	shift
done

[[ ${DO_HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" ]] && usage_and_exit 1

BAD_IMAGES_LIST="${ALLSKY_TMP}/bad_images_list.txt"

# Log entry format:
#	2025-02-09T10:44:17.594698-07:00 new-allsky allsky[905780]: \
#		Bad Image at 20250209104345 has MEAN of 0.167969 and is below low threshold of 0.5
#
# Remove the date/time, PID, etc.:
#		Bad Image at 20250209104345 has MEAN of 0.167969 and is below low threshold of 0.5
#		1   2     3  4              5   6    7  8        9   10 11    12  13        14 15
grep "Bad Image at [0-9]* has MEAN of" "${ALLSKY_LOG}" "${ALLSKY_LOG}.1" 2>/dev/null |
	sed -e 's/.* Bad Image/Bad Image/' > "${BAD_IMAGES_LIST}"
if [[ ! -s ${BAD_IMAGES_LIST} ]]; then
	rm -f "${BAD_IMAGES_LIST}"
	wW_ "\nCongratulations - no bad file information found in the Allsky log.\n" >&2
	exit 0
fi
SORTED="${BAD_IMAGES_LIST}.sorted"
sort --reverse --key=11,15 "${BAD_IMAGES_LIST}" > "${SORTED}"

if [[ ${HTML} == "false" ]]; then
	echo		# adds space at top to make it easier to read on a terminal
else
	echo "<span class='allow-select' style='font-size: 115%'>"
fi

# Pass in Bold ON, Bold Off, Highlight ON, Highlight Off
gawk -v HTML="${HTML}" -v showBadImages="${SHOW_BAD_IMAGES}" \
		-v BR="${wBR}" -v HLON="${wINFO}" -v HLOFF="${wNC}" \
		-v WSNs="${WSNs}" -v WSNe="${WSNe}" \
		-v singleQuote="'" -v settingName="${SETTING_NAME}" '
	BEGIN {
		low_count = 0; low_min = 1; low_max = 0; low_threshold = 0; low_mean_total = 0;
		high_count = 0; high_min = 0; high_max = 0; high_threshold = 0; high_mean_total = 0;
		total_low_count = 0; total_high_count = 0;
		low_settingName = WSNs settingName " Low" WSNe;
		high_settingName = WSNs settingName " High" WSNe;
		if (HTML == "true") {
			NL = " ";
		} else {
			# Do not want lines that are wider than a typical terminal, so wrap them.
			NL = "\n";
		}
		total_num_messages = 0; num_low_messages = 0; num_high_messages = 0;
		low_message = ""; high_message = "";
	}
	function do_low() {
		s = "";
		total_num_messages++;
		num_low_messages++
		if (num_low_messages > 1) s = s BR;	# Separator

		s = s sprintf("%s%d%s image%s", HLON, low_count, HLOFF, low_count > 1 ? "s" : "");
		s = s sprintf(" had a mean brightness below the %s setting of %0.4f%sso %s not saved.%s",
			low_settingName, low_threshold, NL, low_count > 1 ? "were" : "was", BR);
		if (low_min == low_max) {
			s = s sprintf("Their lowest mean was %0.4f.%s", low_min, BR);
			s = s HLON;
			s = s sprintf("FIX: Consider lowering your %s setting to less than %0.4f%s",
				low_settingName, low_min, NL);
			s = s sprintf("or increasing your exposure and/or gain.");
			s = s HLOFF BR;

		} else {
			ave = low_mean_total / low_count;
			s = s sprintf("Their lowest mean was %0.4f and the highest %0.4f with an average of %0.4f.%s",
				low_min, low_max, ave, BR);
			s = s sprintf("%sFIX: Consider lowering your %s setting to around %0.4f.%s%s",
				HLON, low_settingName, ave, HLOFF, BR);
		}

		low_message = low_message s;
	}
	function do_high() {
		s = "";
		total_num_messages++;
		num_high_messages++;
		if (num_high_messages > 1) s = s BR;	# Separator

		s = s sprintf("%s%d%s image%s", HLON, high_count, HLOFF, high_count > 1 ? "s" : "");
		s = s sprintf(" had a mean brightness above the %s setting of %0.4f%sso %s not saved.%s",
				high_settingName, high_threshold, NL, high_count > 1 ? "were" : "was", BR);

		if (high_min == high_max) {
			s = s sprintf("Their highest mean was %0.4f.%s", high_min, BR);
			s = s HLON;
			s = s sprintf("FIX: Consider raising your %s setting to more than %0.4f%s",
				high_settingName, high_min, NL);
			s = s sprintf("or decreasing your exposure and/or gain.")
			s = s HLOFF BR;
		} else {
			ave = high_mean_total / high_count;
			s = s sprintf("Their lowest mean was %0.4f and the highest %0.4f with and average of %0.4f.%s",
				high_min, high_max, ave, BR);
			s = s HLON;
			s = s sprintf("%sFIX: Consider raising your %s setting to around %0.4f.",
				high_settingName, ave);
			s = s HLOFF BR;
		}

		high_message = high_message s;
	}

	{
		fileName = $4;
		mean = $8;
		below_above = $11;
		threshold = $15;

		if (showBadImages) {
			printf("Image started at %s: mean of %0.4f is %s threshold of %0.4f.%s",
				fileName, mean, below_above, threshold, BR);
		}

		if (below_above == "below") {	# below low
			if (threshold != low_threshold) {
				if (low_threshold != 0) {
					# Threshold changed - start over with numbers.
					do_low();		# Info on prior threshold.
					low_count = 0;
					low_mean_total = 0;
					low_min = 1;
					low_max = 0;
				}
				low_threshold = threshold;
			}
			total_low_count++;
			low_count++;
			low_mean_total += mean;
			if (mean < low_min) {
				low_min = mean;
			}
			if (mean > low_max) {
				low_max = mean;
			}

		} else {				# above high
			if (threshold != high_threshold) {
				if (high_threshold != 0) {
					# Threshold changed - start over with numbers.
					do_high();
					high_count = 0;
					high_mean_total = 0;
					high_min = 0;
					high_max = 0;
				}
				high_threshold = threshold;
			}
			total_high_count++;
			high_count++;
			high_mean_total += mean;
			if (mean > high_min) {
				high_min = mean;
			}
			if (mean > high_max) {
				high_max = mean;
			}
		}
	}
	END {
		if (total_low_count == 0 && total_high_count == 0) {
			exit(0);
		}
		if (showBadImages) {
			printf("%s%s", BR, BR);
		}

		if (low_count > 0) {
			do_low();
		}
		if (total_low_count > 0) {
			if (num_low_messages > 1) {
				printf("%s", HLON);
				printf("NOTE: There were %d different low thresholds.", num_low_messages);
				printf(" Try using the lowest suggestion first.%s", BR BR);
				printf("%s", HLOFF);
			}
			printf("%s", low_message);
		}

		if (high_count > 0) {
			do_high();
		}
		if (total_high_count > 0) {
			if (num_low_messages > 1) {
				printf("%s", BR BR);		# separator
			}
			if (num_high_messages > 1) {
				printf("%s", HLON);
				printf("NOTE: There were %d different high thresholds.", num_high_messages);
				printf(" Try using the highest suggestion first.%s", BR BR);
				printf("%s", HLOFF);
			}
			printf("%s", high_message);
		}

		exit(0);
	}' "${SORTED}" 2>&1
RET=$?
if [[ ${RET} -ne 0 ]]; then
	echo "${wBR}${ME}: Unable to process data.${wBR}"
fi

if [[ ${SHOW_BAD_IMAGES} -eq 0 ]]; then
	if [[ ${HTML} == "true" ]]; then
		echo "${wBR}${wBR}The following images were not saved:<pre>"
		indent --html "$( < "${BAD_IMAGES_LIST}" )"
		echo "</pre>"
	else
		echo -e "\nLook in ${WSFs}${BAD_IMAGES_LIST}${WSFe} for the list of bad images."
	fi
fi

if [[ ${HTML} == "false" ]]; then
	echo		# adds space at bottom to make it easier to read on a terminal
else
	echo "</span>"
fi

rm -f "${SORTED}"

exit "${RET}"
