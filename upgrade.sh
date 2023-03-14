#!/bin/bash

# Upgrade an existing release of Allsky, version v2023.03.09_tbd or newer.
# This includes upgrading code as well as configuration files.

############################
# TODO: This file currently just checks if there's a newer version on GitHub,
# and if so, it grabs the newer version and executes it.
# We did this so we could distribute a basic script with the new release,
# but didn't have time to fully complete and test this script.
############################

[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$(realpath "$(dirname "${BASH_ARGV0}")")"
ME="$(basename "${BASH_ARGV0}")"

source "${ALLSKY_HOME}/variables.sh" || exit 99
source "${ALLSKY_SCRIPTS}/functions.sh"		|| exit 99

if [[ ${EUID} -eq 0 ]]; then
	display_msg error "This script must NOT be run as root, do NOT use 'sudo'."
	exit 1
fi

INSTALL_DIR="allsky"
cd ~/${INSTALL_DIR}  || exit 1

source "${ALLSKY_CONFIG}/config.sh"			|| exit 99
source "${ALLSKY_CONFIG}/ftp-settings.sh"	|| exit 99


####
usage_and_exit()
{
	RET=${1}
	if [[ ${RET} -eq 0 ]]; then
		C="${YELLOW}"
	else
		C="${RED}"
	fi
	# Don't show "--newer" since users should never use that.
	echo
	echo -e "${C}Usage: ${ME} [--help] [--debug [...]] [--function function]${NC}"
	echo
	echo "'--help' displays this message and exits."
	echo
	echo "'--debug' displays debugging information. Can be called multiple times to increase level."
	echo
	echo "'--function' executes the specified function and quits."
	echo
	#shellcheck disable=SC2086
	exit ${RET}
}

####################### main part of program


##### Check arguments
OK="true"
HELP="false"
DEBUG=="false"
DEBUG_ARG=""
NEWER="false"
FUNCTION=""
while [ $# -gt 0 ]; do
	ARG="${1}"
	case "${ARG}" in
		--help)
			HELP="true"
			;;
		--debug)
			DEBUG="true"
			DEBUG_ARG="${ARG}"		# we can pass this to other scripts
			;;
		--newer)
			NEWER="true"
			shift
			;;
		--function)
			FUNCTION="${2}"
			shift
			;;
		*)
			display_msg error "Unknown argument: '${ARG}'."
			OK="false"
			;;
	esac
	shift
done
[[ ${HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" || $# -ne 0 ]] && usage_and_exit 1

FORCE_CHECK="true"		# Set to "true" to ALWAYS do the version check

BRANCH="$(getBranch)"
# Unless forced to, only do the version check if we're on the main branch,
# not on development branches, because when we're updating this script we
# don't want to have the updates overwritten from an older version on GitHub.
if [[ ${FORCE_CHECK} == "true" || ${BRANCH} == "${GITHUB_MAIN_BRANCH}" ]]; then
	CURRENT_SCRIPT="${ALLSKY_HOME}/${ME}"
	if [[ ${NEWER} == "true" ]]; then
		# This is the newer version
		echo "[${CURRENT_SCRIPT}] was replaced by newer version from GitHub."
		cp "${BASH_ARGV0}" "${CURRENT_SCRIPT}"
		chmod 775 "${CURRENT_SCRIPT}"

	else
		# See if there's a newer version of this script; if so, download it and execute it.
		BRANCH="$(getBranch)" || exit 2
		FILE_TO_CHECK="$(basename "${ALLSKY_SCRIPTS}")/${ME}"
		NEWER_SCRIPT="/tmp/${ME}"
		checkAndGetNewerFile --branch "${BRANCH}" "${CURRENT_SCRIPT}" "${FILE_TO_CHECK}" "${NEWER_SCRIPT}"
		RET=$?
		[[ ${RET} -eq 2 ]] && exit 2
		if [[ ${RET} -eq 1 ]]; then
			exec "${NEWER_SCRIPT}" --newer "$@"
			# Does not return
		fi
	fi
fi

