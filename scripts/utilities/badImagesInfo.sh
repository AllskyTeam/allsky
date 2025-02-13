#!/bin/bash

[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )" )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"					|| exit "${EXIT_ERROR_STOP}"

# Log entry format:
#	2025-02-09T10:44:17.594698-07:00 new-allsky allsky[905780]: removeBadImages.sh: File is bad: \
#		removed 'image-20250209104345.jpg' (MEAN of 0.167969 is below low threshold of 0.5)
INFO="$( grep "File is bad:.*MEAN of" "${ALLSKY_LOG}"* | sed -e 's/.*(MEAN/MEAN/' -e 's/)//' )"
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
			if (threshold != low_thresjjhold) {
				if (low_threshold != 0) {
					# Start over with numbers
					# printf("Low threshold changed from %f to %f; summary may not1GO
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
					# printf("High threshold changed from %f to %f; summary may not be accurate\n",
					# 	high_threshold, threshold);
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
		if (low_count > 0) {
			printf("%d images had a mean below the Low Threshold of %f\n", low_count, low_threshold);
			if (low_min == low_max) {
				printf("The lowest mean was %f\n", low_min);
				printf("\nConsider lowering your Low Threshold to less than %f\n", low_min);
				printf("or increasing your exposure and/or gain.\n");
			} else {
				ave = low_mean_total / low_count;
				printf("The lowest mean was %f and the highest %f with and average of %f\n",
					low_min, low_max, ave);
				printf("\nConsider lowering your Low Threshold to around %f\n", ave);
			}
		}
		if (high_count > 0) {
			printf("%d images had a mean above the High Threshold of %f\n", high_count, high_threshold);
			if (high_min == high_max) {
				printf("The highest mean was %f\n", high_min);
				printf("\nConsider raising your High Threshold to more than %f\n", high_min);
				printf("or decreasing your exposure and/or gain.\n");
			} else {
				ave = high_mean_total / high_count;
				printf("The lowest mean was %f and the highest %f with and average of %f\n",
					high_min, high_max, ave);
				printf("\nConsider raising your High Threshold to around %f\n", ave);
			}
		}
	}'
