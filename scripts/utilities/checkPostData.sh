#!/bin/bash

# Help determine why postData.sh failed.
# Failure will often result in an Allsky Website displaying the message:
#		data.json is X days old

[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$(realpath "$(dirname "${BASH_ARGV0}" )/../.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"					|| exit "${EXIT_ERROR_STOP}"

CMD="postData.sh"
LOCAL="$( settings ".uselocalwebsite" )"
REMOTE_W="$( settings ".useremotewebsite" )"
REMOTE_S="$( settings ".useremoteserver" )"

if [[ ${LOCAL} == "false" && ${REMOTE_W} == "false" && ${REMOTE_S} == "false" ]]; then
	MSG="${CMD} does not run because there is no where to upload data."
	MSG+="\nThe local Website, remote Website, and remote Server are all disabled"
	MSG+=" in the WebUI."
	E_ "${MSG}"
	exit 1
fi

echo -e "\n*** Testing ${CMD}..."

if ! OUTPUT="$( postData.sh 2>&1 )" ; then
	MSG="${CMD} failed:"
	MSG+="\n$( indent "${OUTPUT}" )"
	E_ "${MSG}"
	exit 2
fi

echo "    ${CMD} succeeded:"
indent "${OUTPUT}"

# Has it been running at end of night?
RAN="$( grep "Posting twilight data" "${ALLSKY_LOG}"* 2>/dev/null )"
if [[ -n ${RAN} ]]; then
	NUM_RUNS=$( echo "${RAN}" | wc -l )
	echo -e "\n*** ${CMD} ran ${NUM_RUNS} time(s) recently."
else
	echo -e "\n*** ${CMD} has not run recently."
	NUM_RUNS="0"
fi

echo -e "\n*** Checking for recent failures..."

# Have any runs failed?
ERRORS="$( grep "${CMD}" "${ALLSKY_LOG}"* 2>/dev/null )"
NUM_ERRORS="0"
if [[ -n ${ERRORS} ]]; then
	NUM_ERRORS=$( echo "${ERRORS}" | wc -l )
	echo "    ${CMD} failed ${NUM_ERRORS} time(s) recently:"
	indent "${ERRORS}"
else
	NUM_ERRORS="0"
	echo "    No failures found."
fi

if [[ ${NUM_RUNS} -gt 0 && ${NUM_ERRORS} -eq 0 ]]; then
	echo -e "\nCould not find any problems with ${CMD}."
	echo "If you think there is a problem, create a new Discussion in GitHub,"
	echo "describing what messages you've seen."
fi

exit 0
