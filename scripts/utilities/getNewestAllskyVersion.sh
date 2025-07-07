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

BRANCH=""
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

[[ -z ${BRANCH} ]] && BRANCH="${GITHUB_MAIN_BRANCH}"

GIT_FILE="${GITHUB_RAW_ROOT}/${GITHUB_ALLSKY_REPO}/${BRANCH}/version"
if ! NEWEST_INFO="$( curl --show-error --silent "${GIT_FILE}" 2>&1 )" ; then
	echo "${ME}: ERROR: Unable to get newest Allsky version: ${NEWEST_INFO}." >&2
	exit 1
fi
if [[ -z ${NEWEST_INFO} ]]; then
	echo "${ME}: ERROR: Empty newest Allsky version for branch '${BRANCH}'." >&2
	exit 1
fi
NEWEST_VERSION="$( echo "${NEWEST_INFO}" | head -1 )"
if [[ ${NEWEST_VERSION:0:1} != "v" ||
		${NEWEST_VERSION} == "400: Invalid request" ||
		${NEWEST_VERSION} == "404: Not Found" ]]; then
	echo "${ME}: ERROR: Got unknown newest Allsky version: ${NEWEST_VERSION}." >&2
	exit 1
fi

if [[ ${VERSION_ONLY} == "true" ]]; then
	# Just output the newest version and quit.
	echo "${NEWEST_VERSION}"
	exit 0
fi

#shellcheck disable=SC2119
CURRENT_VERSION="$( get_version )"
RET=0
if [[ ${CURRENT_VERSION} == "${NEWEST_VERSION}" ]]; then
	RET=0
elif [[ ${CURRENT_VERSION} < "${NEWEST_VERSION}" ]]; then
	RET="${EXIT_PARTIAL_OK}"
else
	# Current newer than newest - this can happen if testing a newer release.
	RET=0
fi

echo "${NEWEST_VERSION}"
NEWEST_NOTE="$( echo "${NEWEST_INFO}" | tail -1 )"
[[ -n ${NEWEST_NOTE} ]] && echo "${NEWEST_NOTE}"

exit "${RET}"
