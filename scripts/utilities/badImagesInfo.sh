#!/bin/bash
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$(dirname "${BASH_ARGV0}")/../.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"					|| exit "${EXIT_ERROR_STOP}"

SETTING_NAME="Remove Bad Images Threshold"

usage_and_exit()
{
	local RET=${1}
	local MSG="${2}"
	exec 2>&1
	local USAGE="\n"
	[[ -n ${MSG} ]] && USAGE+="${MSG}\n"
	USAGE+="Usage: ${ME} [--help] [--show_bad_images]"
	if [[ ${RET} -ne 0 ]]; then
		E_ "${USAGE}"
	else
		echo -e "${USAGE}"
	fi
	echo "Where:"
	echo "   --help              Displays this message and exits."
	echo "   --show_bad_images   Displays a list of 'bad' images that were removed."
	echo
	echo "This command displays information on the 'bad' images, that is,"
	echo "ones that were too dark or too light and so were deleted."
	echo "The settings to determine 'too dark' and 'too light' are"
	echo "'${SETTING_NAME} Low' and '${SETTING_NAME} High'."
	echo

	exit "${RET}"
}

OK="true"
DO_HELP="false"
SHOW_BAD_IMAGES="0"
while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
		--help)
			DO_HELP="true"
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

# Log entry format:
#	2025-02-09T10:44:17.594698-07:00 new-allsky allsky[905780]: removeBadImages.sh: File is bad: \
#		removed 'image-20250209104345.jpg' (MEAN of 0.167969 is below low threshold of 0.5)
INFO="$( grep "File is bad:.*MEAN of" "${ALLSKY_LOG}" "${ALLSKY_LOG}.1" 2>/dev/null |
	sed -e 's/.* removed //' -e 's/(MEAN/MEAN/' -e 's/)//' )"
if [[ -z ${INFO} ]]; then
	W_ "\nCongratulations - no bad file information found in the Allsky log.\n" >&2
	exit 1
fi

#	'image-20250209104345' MEAN of 0.167969 is below low threshold of 0.5
#	$1                     $2   $3 $4       $5 $6    $7  $8        $9 $10

echo "$INFO" | gawk -v showBadImages="${SHOW_BAD_IMAGES}" \
		-v singleQuote="'" -v settingName="${SETTING_NAME}" '
	BEGIN {
		low_count = 0; low_min = 1; low_max = 0; low_threshold = 0; low_mean_total = 0;
		high_count = 0; high_min = 0; high_max = 0; high_threshold = 0; high_mean_total = 0;
	}
	{
		fileName = $1; gsub(singleQuote, "", fileName);
		mean = $4;
		below_above = $6;
		threshold = $10;
		if (showBadImages) printf("%s: mean of %f is %s threshold of %f.\n", fileName, mean, below_above, threshold);
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
		if (low_count > 0) {
			printf("\n");
			printf("%d image", low_count);
			if (low_count > 1) printf("s");
			printf(" had a mean brightness below the \"%s Low\" setting of %f so were deleted.\n",
				settingName, low_threshold);
			if (low_min == low_max) {
				printf("The lowest mean was %f.\n", low_min);
				printf("FIX: Consider lowering your \"%s Low\" to less than %0.3f\n",
					settingName, low_min);
				printf("or increasing your exposure and/or gain.\n");
			} else {
				ave = low_mean_total / low_count;
				printf("The lowest mean was %f and the highest %f with an average of %f.\n",
					low_min, low_max, ave);
				printf("FIX: Consider lowering your \"%s Low\" to around %0.3f.\n", settingName, ave);
			}
		}
		if (high_count > 0) {
			printf("\n");
			printf("%d image", high_count);
			if (high_count > 1) printf("s");
			printf(" had a mean brightness above the \"%s High\" of %f so were deleted.\n",
				settingName, high_threshold);
			if (high_min == high_max) {
				printf("The highest mean was %f.\n", high_min);
				printf("FIX: Consider raising your \"%s High\" to more than %0.3f\n",
					settingName, high_min);
				printf("or decreasing your exposure and/or gain.\n");
			} else {
				ave = high_mean_total / high_count;
				printf("The lowest mean was %f and the highest %f with and average of %f.\n",
					high_min, high_max, ave);
				printf("FIX: Consider raising your \"%s High\" to around %0.3f.\n", settingName, ave);
			}
		}
	}'
