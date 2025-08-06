#!/bin/bash

# Get the newest Allsky version from GitHub.
# If same as what's installed, exit 0.
# If newer than what's installed, exit ${EXIT_PARTIAL_OK}.

# Allow this script to be executed manually, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/../.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/installUpgradeFunctions.sh"	|| exit "${EXIT_ERROR_STOP}"

if [[ ${1} == "--branch" ]]; then
	BRANCH="${2}"
	shift 2
else
	BRANCH="${ALLSKY_GITHUB_MAIN_BRANCH}"
fi

GIT_FILE="${ALLSKY_GITHUB_RAW_ROOT}/${ALLSKY_GITHUB_ALLSKY_REPO}/${BRANCH}/version"
if ! NEWEST_VERSION="$( curl --show-error --silent "${GIT_FILE}" 2>&1 )" ; then
	echo "${ME}: ERROR: Unable to get newest Allsky version: ${NEWEST_VERSION}."
	exit 1
fi
if [[ ${NEWEST_VERSION:0:1} != "v" ||
		${NEWEST_VERSION} == "400: Invalid request" ||
		${NEWEST_VERSION} == "404: Not Found" ]]; then
	echo "${ME}: ERROR: Got unknown newest Allsky version: ${NEWEST_VERSION}."
	exit 1
fi

CURRENT_VERSION="$( get_version )"
NOTE=""
RET=0
if [[ ${CURRENT_VERSION} == "${NEWEST_VERSION}" ]]; then
	RET=0
elif [[ ${CURRENT_VERSION} < "${NEWEST_VERSION}" ]]; then
	NOTE="$( get_version --note )"
	RET="${EXIT_PARTIAL_OK}"
else
	# Current newer than newest - this can happen if testing a newer release.
	RET=0
fi

echo "${NEWEST_VERSION}"
[[ -n ${NOTE} ]] && echo "${NOTE}"

exit "${RET}"
