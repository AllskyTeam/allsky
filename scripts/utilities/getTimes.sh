#!/bin/bash

ME="$( basename "${BASH_ARGV0}" )"

#shellcheck disable=SC1091 source=variables.sh
source "${ALLSKY_HOME}/variables.sh"					|| exit "${EXIT_ERROR_STOP}"

TMP="${ALLSKY_TMP}/${ME}.txt"

# 2025-07-06T04:47:43.690741-05:00 Pi_name allsky[pid]: STARTING EXPOSURE at: 2025-07-06 04:47:43   @ 28.0 sec
# 1                                2       3              4        5        6   7          8          9 10   11
# 2025-07-06T04:47:43.690741-05:00 Pi_name allsky[pid]: STARTING EXPOSURE at: 2025-07-06 04:47:43   @ 123 us

# 2025-07-13T00:01:18.865853-05:00 Pi_name allsky[pid]:  > Running: timeout 63  ...
# 1                                2       3               4 5

# ZWO:
# 2025-07-13T00:16:35.691179-05:00 Pi_name allsky[pid]:   > Got:    shutter_us: 33.9 ...
# 1                                2       3                4 5

# RPi
# 2025-07-13T02:33:31.569085-05:00 Pi_name allsky[pid]:   > GOT IMAGE @ mean 0.293, gain 200.
# 1                                2       3                4 5   6

# 2025-07-13T04:52:49.038624-05:00 Pi_name allsky[pid]: endOfNight.sh: ===== Generating Keogram for 20250712
# 1                                2       3            4

SEARCH_STRING="STARTING EXPOSURE |> Running: |> GOT IMAGE |> Got: |endOfNight.sh:"
[[ ! -s ${TMP} ]] && grep --no-filename -E "${SEARCH_STRING}" "${ALLSKY_LOG}"* 2>/dev/null |
	sed -e 's/, gain.*//' -e 's/ --thumb.*//' > "${TMP}"
if [[ ! -s ${TMP} ]]; then
	echo "ERROR: No lines in log file(s) with '${SEARCH_STRING}'" >&2
	ls -l "${ALLSKY_LOG}"* 2>/dev/null
	exit 1
fi

gawk 'BEGIN {
		numStarts = 0;
		numGots = 0;
		startSeconds = "";
		exposure = 0;
		totalSeconds = 0.0;
		totalOverhead = 0.0;
	}
	function min(a, b) {
		if (a < b) return a;
		return b;
	}
	function getTime(dateTime) {
		# 2025-07-13T02:33:31.569085-05:00
		T = index(dateTime, "T") + 1;
		if (T == 1) return "";
		time = substr(dateTime, T);

		minus = index(time, "-");
		if (minus > 0) {
			time = substr(time, 1, minus-1)
		}
		return time;
	}
	function getSeconds(time) {
		hours = substr(time, 1, 2) + 0;
		minutes = substr(time, 4, 2) + 0;
		seconds = substr(time, 7) + 0.0;
		t = (hours * (60 * 60)) + (minutes * 60) + seconds;
		return t;
	}

	{
		if ($4 == "STARTING" && $5 == "EXPOSURE") {
			numStarts++;
			startTime = getTime($1);
			startSeconds = getSeconds(startTime);
			exposure = $10;
			sub(",", "", exposure);		# remove commas from number  TODO: "." for thousands separator??
			exposureUnits = $11
			if (exposureUnits == "sec")
				exposureSeconds = exposure;
			else if (exposureUnits == "ms")
				exposureSeconds = exposure / 1000;
			else if (exposureUnits == "us")
				exposureSeconds = exposure / (1000 * 1000);
			else {
				printf("UNKNOWN exposure units: %s\n", $0);
				exposureSeconds = 0
			}
		} else if ($5 == "Running:") {
			# This always comes after STARTING EXPOSURE and is when libcamera-still actually starts.
			# Use it if it exists since it is a more accurate start time.
			startTime = getTime($1);
			startSeconds = getSeconds(startTime);

		} else if ($5 == "Got:" || $5 == "GOT") {
			if (startSeconds != "") {
				numGots++;
				endTime = getTime($1);
				endSeconds = getSeconds(endTime);
				# endSeconds will be less than startSeconds if they are in different days.
				if (endSeconds != "" && endSeconds > startSeconds) {
					seconds = endSeconds - startSeconds;
					totalSeconds += seconds;
					printf("%2.1f seconds @ %s", seconds, endTime);
					if (exposureSeconds != 0.0) {
						overhead = seconds - exposureSeconds;
						printf(", overhead %2.1f seconds", overhead);
						totalOverhead += overhead;
					}
					printf("\n");
				}
				startSeconds = "";
			}
		} else if ($4 == "endOfNight.sh:") {
			# Output just the time and "endOfNight.sh" and everything after it.
			sub("^....-..-..T", "", $0);
			sub("-..:.. ", " ", $0);
			sub("\\[", "", $0);
			sub($3, "", $0);	# needs to come before $2
			sub($2, "", $0);
			printf("    %s\n", $0);
		} else {
			printf("UNKNOWN LINE %6d: \"%s\"\n", FNR, $0);
		}
	}
	END {
		totalCount = min(numStarts, numGots);
		if (totalCount > 0) {
#			printf("num_STARTING: %d, num_Got: %d, ", numStarts, numGots);
			printf("average_time: %2.1f seconds, average_overhead: %2.1f seconds\n",
				totalSeconds / totalCount, totalOverhead / totalCount);
		}
	} ' "${TMP}"

