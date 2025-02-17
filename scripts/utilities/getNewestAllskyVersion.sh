#!/bin/bash

# Get the newest Allsky version from GitHub.
# If same as what's installed, exit 0.
# If newer than what's installed, exit ${EXIT_PARTIAL_OK}.

# Allow this script to be executed manually, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/../.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit "${EXIT_ERROR_STOP}"

if [[ ${1} == "--branch" ]]; then
	BRANCH="${2}"
	shift 2
else
	BRANCH="${GITHUB_MAIN_BRANCH}"
fi

GIT_FILE="${GITHUB_RAW_ROOT}/${GITHUB_ALLSKY_PACKAGE}/${BRANCH}/version"
if ! NEWEST_VERSION="$( curl --show-error --silent "${GIT_FILE}" 2>&1 )" ; then
	echo "ERROR: Unable to get newest Allsky version: ${NEWEST_VERSION}."
	exit 1
fi
if [[ ${NEWEST_VERSION:0:1} != "v" ||
		${NEWEST_VERSION} == "400: Invalid request" ||
		${NEWEST_VERSION} == "404: Not Found" ]]; then
	echo "ERROR: Got unknown newest Allsky version: ${NEWEST_VERSION}."
	exit 1
fi

CURRENT_VERSION="$( < "${ALLSKY_VERSION_FILE}" )"
RET=0
if [[ ${CURRENT_VERSION} == "${NEWEST_VERSION}" ]]; then
	RET=0
elif [[ ${CURRENT_VERSION} < "${NEWEST_VERSION}" ]]; then
	RET="${EXIT_PARTIAL_OK}"
else
	RET=0		# Current newer than newest - this should not happen in normal use
fi

echo "${NEWEST_VERSION}"
exit "${RET}"
