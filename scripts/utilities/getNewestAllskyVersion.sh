#!/bin/bash

# Get the newest Allsky version from GitHub.
# If same as what's installed, exit 0.
# If newer than what's installed, exit ${ALLSKY_EXIT_PARTIAL_OK}.

# Allow this script to be executed manually, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/../.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit "${ALLSKY_EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/installUpgradeFunctions.sh"	|| exit "${ALLSKY_EXIT_ERROR_STOP}"

BRANCH="${ALLSKY_GITHUB_MAIN_BRANCH}"
VERSION_ONLY="false"
while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
		--branch)
			BRANCH="${2}"
			shift
			;;
		--version-only)
			VERSION_ONLY="true"
			;;
	esac
	shift
done

GIT_FILE="${ALLSKY_GITHUB_RAW_ROOT}/${ALLSKY_GITHUB_ALLSKY_REPO}/${BRANCH}/version"
NEWEST_VERSION_FILE="$( curl --show-error --silent "${GIT_FILE}" 2>&1 )"
RET=$?
if [[ ${RET} -ne 0 ]]; then
	echo "${ME}: ERROR: Unable to get newest Allsky version, RET=${RET}: ${NEWEST_VERSION}."
	exit 1
fi
NEWEST_VERSION="$( echo "${NEWEST_VERSION_FILE}" | head -1 )"
NEWEST_NOTE="$( echo "${NEWEST_VERSION_FILE}" | tail -1 )"
if [[ ${NEWEST_VERSION:0:1} != "v" ||
		${NEWEST_VERSION} == "400: Invalid request" ||
		${NEWEST_VERSION} == "404: Not Found" ]]; then
	echo "${ME}: ERROR: Got unknown newest Allsky version: ${NEWEST_VERSION}."
	exit 1
fi

CURRENT_VERSION="$( get_version "" )"

NOTE=""
if [[ ${CURRENT_VERSION} == "${NEWEST_VERSION}" ]]; then
	RET=0
elif [[ ${CURRENT_VERSION} < "${NEWEST_VERSION}" ]]; then
#XXX	NOTE="$( get_version --note )"		# Gets the note for the current version on the Pi
	NOTE="${NEWEST_NOTE}"
	RET="${ALLSKY_EXIT_PARTIAL_OK}"
else
	# Current newer than newest - this can happen if testing a newer release.
	RET=0
fi

echo "${NEWEST_VERSION}"
[[ ${VERSION_ONLY} == "false" && -n ${NOTE} ]] && echo "${NOTE}"

exit "${RET}"
