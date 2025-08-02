#!/bin/bash

[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$(dirname "${BASH_ARGV0}")/../.." )"
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
	local USAGE="Usage: ${ME} [--help]"
	if [[ ${RET} -ne 0 ]]; then
		E_ "${USAGE}"
	else
		echo -e "${USAGE}"
	fi

	echo
	echo "Displays brightness information used when updating the startrails 'Threshold' setting."
	echo "Typically this is needed when startrails images don't show any trails."
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

if [[ "$( settings ".startrailsgenerate" )" != "true" ]]; then
	w_ "\nWARNING: The startrails 'Generate' setting is not enabled."
fi

# Input format:
# 2025-01-17T06:20:45.240112-06:00 \
#	Minimum: 0.0840083   maximum: 0.145526   mean: 0.103463   median: 0.104839 numImageUsed: 21 numImagesNotUsed: 18  threshold: 0.1
#	$2       $3          $4       $5         $6    $7         $8      $9       $10          $11 $12              $13  $14        $15

LOGS="$( ls -tr "${ALLSKY_LOG}"* )"
#shellcheck disable=SC2086
grep --no-filename "startrails: Minimum" ${LOGS} 2> /dev/null |
	sed "s/$(uname -n).*startrails: //" |
	nawk 'BEGIN {
			print;
			t_min=0; t_max=0; t_mean=0; t_median=0; t_num=0; t_used=0; t_notUsed=0;
			entries_not_used = 0;
			headerFmt		= "%-20s   %-5s   %-5s   %-5s     %-5s     %-5s   %-9s  %-s\n";
			numFmt			= "%-20s   %.3f     %.3f     %.3f     %.3f     %5d         %5d";
			numFmtAverage	= numFmt "       -\n";			# theshold not averaged
			numFmtData   	= numFmt "       %-4s\n";		# threshold
		}
		{
			date = substr($1, 0, 10) "  "  substr($1, 12, 8);
			min = $3;
			max = $5;
			if (min == -1.0 || min == "nan" || max == "nan") {
				entries_not_used++;
				next;
			}
			mean = $7;
			median = $9;
			used = $11;
			notUsed = $13;
			threshold = $15;
			t_min += min;
			t_max += max;
			t_mean += mean;
			t_median += median;
			if (used != "") t_used += used;
			if (notUsed != "") t_notUsed += notUsed;
			# does not make sense to average threshold

			if (++num == 1) {
				header = sprintf(headerFmt,
					"Startrails date", "Minimum", "Maximum", "Mean", "Median",
					"Images used", "Not used", "Threshold");
				printf(header);
				dashes = "-";
				l = length(header) - 2;
				for (i=1; i<=l; i++) {
					dashes = dashes "-";
				}
				printf("%s\n", dashes);
			}

			if (threshold == "")
				t = "-";
			else
				t  = sprintf("%-.4f", threshold)
			printf(numFmtData, date, min, max, mean, median, used, notUsed, t);
		}
		END {
			if (num == 0) {
				exit 1;
			} else if (num == 1) {
				printf("\n");
				printf("Data for only 1 startrails was found.\n");
				printf("Consider running this command in a few days to get more information.\n");
			} else {
				printf("%s\n", dashes);
				printf(numFmtAverage, "Averages", t_min/num, t_max/num, t_mean/num,
					t_median/num, t_used/num, t_notUsed/num);
			}

			if (entries_not_used > 0) {
				printf("\n%d entr", entries_not_used);
				if (entries_not_used == 1)
					printf("y");
				else
					printf("ies");
				printf(" not used due to invalid data.\n");
			}

			exit 0;
		}'
if [[ $? -ne 0 ]]; then
	echo -n "No information found.  "
	STATUS="$( get_allsky_status )"
	if [[ -z ${STATUS} ]]; then
		echo "Is Allsky running?"
	else
		TIMESTAMP="$( get_allsky_status_timestamp )"
		echo "Allsky is ${STATUS} as of ${TIMESTAMP:-unknown time}."
	fi
fi
echo
