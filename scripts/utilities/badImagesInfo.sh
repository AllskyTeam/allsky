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
	echo "Display information on 'bad' images, which are ones that are too dark or too light,"
	echo "and hence have been deleted."
	echo "This information can be used to determine what the low and high 'Remove Bad Images Threshold'"
	echo "settings should be."
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

# Log entry format:
#	2025-02-09T10:44:17.594698-07:00 new-allsky allsky[905780]: removeBadImages.sh: File is bad: \
#		removed 'image-20250209104345.jpg' (MEAN of 0.167969 is below low threshold of 0.5)
INFO="$( grep "File is bad:.*MEAN of" "${ALLSKY_LOG}"* 2>/dev/null | sed -e 's/.*(MEAN/MEAN/' -e 's/)//' )"
if [[ -z ${INFO} ]]; then
	W_ "\nNo bad file information found in the Allsky log (${ALLSKY_LOG}).  Cannot continue.\n"
	exit 1
fi

#	MEAN of 0.167969 is below low threshold of 0.5
#	$1   $2 $3       $4 $5    $6  $7        $8 $9
echo "$INFO" | gawk '
	BEGIN {
		low_count = 0; low_min = 1; low_max = 0; low_threshold = 0; low_mean_total = 0;
		high_count = 0; high_min = 0; high_max = 0; high_threshold = 0; high_mean_total = 0;
	}
	{
		mean = $3;
		below_above = $5;
		threshold = $9;
		if (below_above == "below") {	# below low
			if (threshold != low_threshold) {
				if (low_threshold != 0) {
					# Start over with numbers
					low_mean_total = 0;
				}
				low_threshold = threshold;
			}
			low_count++;
			low_mean_total += mean;
			if (mean < low_min)
				low_min = mean;
			else if (mean > low_max)
				low_max = mean;

		} else {				# above high
			if (threshold != high_threshold) {
				if (high_threshold != 0) {
					high_min = 1;
					high_count = 0;
					high_mean_total = 0;
				}
				high_threshold = threshold;
			}
			high_count++;
			high_mean_total += mean;
			if (mean < high_min)
				high_min = mean;
			else if (mean > high_max)
				high_max = mean;
		}
	}
	END {
		name = "\"Remove Bad Images Threshold\""
		if (low_count > 0) {
			printf("%d image", low_count);
			if (low_count > 1) printf("s");
			printf(" had a mean below the Low %s of %f.\n", name, low_threshold);
			if (low_min == low_max) {
				printf("The lowest mean was %f.\n", low_min);
				printf("\nConsider lowering your Low %s to less than %f\n", name, low_min);
				printf("or increasing your exposure and/or gain.\n");
			} else {
				ave = low_mean_total / low_count;
				printf("The lowest mean was %f and the highest %f with an average of %f.\n",
					low_min, low_max, ave);
				printf("\nConsider lowering your Low %s to around %f.\n", name, ave);
			}
		}
		if (high_count > 0) {
			printf("%d image", high_count);
			if (high_count > 1) printf("s");
			printf(" had a mean above the High %s of %f.\n", name, high_threshold);
			if (high_min == high_max) {
				printf("The highest mean was %f.\n", high_min);
				printf("\nConsider raising your High %s to more than %f\n", name, high_min);
				printf("or decreasing your exposure and/or gain.\n");
			} else {
				ave = high_mean_total / high_count;
				printf("The lowest mean was %f and the highest %f with and average of %f.\n",
					high_min, high_max, ave);
				printf("\nConsider raising your High %s to around %f.\n", name, ave);
			}
		}
	}'
