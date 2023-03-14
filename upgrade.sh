#!/bin/bash

# Upgrade an existing release of Allsky.
# This includes upgrading code as well as configuration files.

############################
# TODO: This file currently just checks if there's a newer version on GitHub,
# and if so, it grabs the newer version and executes it.
# We did this so we could distribute a basic script with the new release,
# but didn't have time to fully complete and test this script.
############################
# TODO: Move variables and functions used by this script and install.sh into
# scripts/installUpgradeFunctions.sh, including functions in functiton.sh that
# are only used by upgrade.sh and install.sh.
############################


[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$(realpath "$(dirname "${BASH_ARGV0}")")"
ME="$(basename "${BASH_ARGV0}")"

source "${ALLSKY_HOME}/variables.sh"		|| exit 99
source "${ALLSKY_SCRIPTS}/functions.sh"		|| exit 99

if [[ ${EUID} -eq 0 ]]; then
	display_msg error "This script must NOT be run as root, do NOT use 'sudo'."
	exit 1
fi

INSTALL_DIR="allsky"
cd ~/"${INSTALL_DIR}"  || exit 1


####
usage_and_exit()
{
	RET=${1}
	if [[ ${RET} -eq 0 ]]; then
		C="${YELLOW}"
	else
		C="${RED}"
	fi
	# Don't show "--newer" or --doUpgrade* since users should never use them.
	echo
	echo -e "${C}Usage: ${ME} [--help] [--debug] [--restore] [--function function]${NC}"
	echo
	echo "'--help' displays this message and exits."
	echo
	echo "'--debug' displays debugging information."
	echo
	echo "'--restore' restores a previously upgraded Allsky.  Rarely needed."
	echo
	echo "'--function' executes the specified function and quits."
	echo
	#shellcheck disable=SC2086
	exit ${RET}
}

####################### main part of program
ALL_ARGS="$@"

##### Check arguments
OK="true"
HELP="false"
DEBUG="false"
DEBUG_ARG=""
NEWER="false"
ACTION="upgrade"
WORD="Upgrade"
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
			;;
		--restore)
			ACTION="restore"
			WORD="Restorer"
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

[[ ${DEBUG} == "true" ]] && echo "Running: ${ME} ${ALL_ARGS}"

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
		NEWER_SCRIPT="/tmp/${ME}"
		checkAndGetNewerFile --branch "${BRANCH}" "${CURRENT_SCRIPT}" "${ME}" "${NEWER_SCRIPT}"
		RET=$?
		[[ ${RET} -eq 2 ]] && exit 2
		if [[ ${RET} -eq 1 ]]; then
			exec "${NEWER_SCRIPT}" --newer "${ALL_ARGS}"
			# Does not return
		fi
	fi
fi

# TODO: these are here to keep shellcheck quiet.
DEBUG="${DEBUG}"
DEBUG_ARG="${DEBUG_ARG}"
FUNCTION="${FUNCTION}"
WORD="${WORD}"

source "${ALLSKY_CONFIG}/config.sh"			|| exit 99
source "${ALLSKY_CONFIG}/ftp-settings.sh"	|| exit 99


if [[ ${ACTION} == "upgrade" ]]; then
	:

	# First part of upgrade, executed by user in ${ALLSKY_HOME}.

	# Make sure we can upgrade:
	#	If config/ does NOT exist, the user hasn't installed Allsky.
	#		Tell the user.
	#		Invoke install.sh, or exit ?????

	# Ask user if they want to upgrade in place (i.e., overwrite code),
	# or move current code to ${ALLSKY_HOME}-OLD.

	# If move current code:
	#	Check for prior Allsky versions:
	#		If ${ALLSKY_HOME}-OLD exist:
	#			If ${ALLSKY_HOME}-OLDEST exists
	#				Let user know both old versions exist
	#				Exit
	#			Let the user know ${ALLSKY_HOME}-OLD exists as FYI:
	#				echo "Saving prior version in ${ALLSKY_HOME}-OLDEST"
	#			Move ${ALLSKY_HOME}-OLD to ${ALLSKY_HOME}-OLDEST
	#	Stop allsky and allskyperiodic
	#	Move ${ALLSKY_HOME} to ${ALLSKY_HOME}-OLD
	#	cd
	#	Git new code into ${ALLSKY_HOME}
	#	cd ${ALLSKY_HOME}
	#	Run: ./install.sh $DEBUG_ARG .... --doUpgrade
	#		--doUpgrade tells it to use prior version without asking and to
	#		not display header, change messages to say "upgrade", not "install", etc.
	#	?? anything else?

	# Else (upgrade in place)
	#	Git new code into ${ALLSKY_HOME}-NEW
	#	?? move ${ALLSKY_HOME}/upgrade.sh to ${ALLSKY_HOME}/upgrade-OLD.sh
	#		exec ${ALLSKY_HOME}/upgrade-OLD.sh
	#	Copy (don't move) everything from ${ALLSKY_HOME}-NEW to ${ALLSKY_HOME}
	#	Run: install.sh ${ALL_ARGS} --doUpgradeInPlace
	#		--doUpgradeInPlace tells it to use prior version without asking and to
	#		not display header, change messages to say "upgrade", not "install", etc.
	#		How is --doUpgradeInPlace different from --doUpgrade ??
	#	?? anything else?

elif [[ ${ACTION} == "restore" ]]; then
	:

	# If running in $ALLSKY_HOME		# us 1st time through
	#	Make sure ${ALLSKY_HOME}-OLD exists
	#		If not, warn user and exit:
	#			"No prior version to restore from: ${ALLSKY_HOME}-OLD does not exist".
	#	cp ${ME} /tmp
	#	chmod 775 /tmp/${ME}
	#	exec /tmp/${ME} --restore ${ALL_ARGS} $ALLSKY_HOME

	# Else		# running from /tmp - do the actual work
	#	Stop allsky and allskyperiodic
	#	mv $ALLSKY_HOME} ${ALLSKY_HOME}-new_tmp
	#	mv ${ALLSKY_HOME}-OLD $ALLSKY_HOME
	#	move images from ${ALLSKY_HOME}-new_tmp to $ALLSKY_HOME
	#	move darks from ${ALLSKY_HOME}-new_tmp to $ALLSKY_HOME
	#	copy scripts/endOfNight_additionalSteps.sh from ${ALLSKY_HOME}-new_tmp to $ALLSKY_HOME

	# Prompt the user if they want to:
	#	restore their old "images" folder (if there's anything in it)
	#	restore their old "darks" folder (if there's anything in it)
	#	restore their old configuration settings
	#		(config.sh, ftp-settings.sh, scripts/endOfNight_additionalSteps.sh)
	#	upgrade their WebUI (if installed)
	#	upgrade their Website (if installed)

fi
