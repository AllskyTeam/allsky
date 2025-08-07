#!/bin/bash

# Upgrade the current Allsky release.

[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )" )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/installUpgradeFunctions.sh"	|| exit "${EXIT_ERROR_STOP}"

# High-level view of tasks for upgrade:
#	Check if ${ALLSKY_PRIOR_DIR} exists.
#		If so, warn user they won't be able to save current release.
#	Prompt if user wants to carry current settings to new release.
#		If so:
#			If ${ALLSKY_PRIOR_DIR} exists, error out
#		Rename ${ALLSKY_HOME} to ${ALLSKY_PRIOR_DIR}
#	Download new release (with optional branch) from GitHub.
#	Execute new release's installation script telling it it's an upgrade.

#############
# Changes to install.sh needed:
#	* Accept "--upgrade" argument which means we're doing an upgrade.
#		- Don't display "**** Welcome to the installer ****"
#		- Don't prompt for camera
#		- Don't prompt to reboot
#		- Don't prompt other things ??
#
#############
# TODO:
#	Check for symbolic links
#	Allow installing other branches.
#############

############################## functions
function usage_and_exit()
{
	local RET=${1}
	{
		[[ ${RET} -ne 0 ]] && echo -e "${RED}"
		echo -e "\nUpgrade the Allsky software to a newer version.."
		echo
		echo -e "Usage: ${ME} [--help] [--debug] [--branch branch] [--function function]${NC}"
		echo
		echo "'--help' displays this message and exits."
		echo
		echo "'--debug' displays debugging information."
		echo
		echo "'--branch branch' uses 'branch' instead of the production branch."
		echo
		echo "'--function' executes the specified function and quits."
		echo
		[[ ${RET} -ne 0 ]] && echo -e "${NC}"
	} >&2
	exit "${RET}"
}

####################### main part of program
#shellcheck disable=SC2124
ALL_ARGS="$@"

##### Check arguments
OK="true"
HELP="false"
DEBUG="false"; DEBUG_ARG=""
ACTION="upgrade"; WORD="Upgrade"		# default
FUNCTION=""
while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
		--help)
			HELP="true"
			;;
		--debug)
			DEBUG="true"
			DEBUG_ARG="${ARG}"		# we can pass this to other scripts
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

# shellcheck disable=SC2119
BRANCH="$( get_branch )"
[[ -z ${BRANCH} ]] && BRANCH="${ALLSKY_GITHUB_MAIN_BRANCH}"

# TODO: these are here to keep shellcheck quiet while this script is incomplete.
DEBUG="${DEBUG}"
DEBUG_ARG="${DEBUG_ARG}"
FUNCTION="${FUNCTION}"

if [[ "${ACTION}" != "doUpgrade" ]]; then
	echo
	echo "***********************************************"
	echo "*** Welcome to the Allsky Software ${WORD} ***"
	echo "***********************************************"
	echo
else	# we're continuing where we left off, so don't welcome again.
	echo -e "* ${GREEN}Continuing the ${WORD}...${NC}"
fi

if [[ ${ACTION} == "upgrade" ]]; then
	:

	# First part of upgrade, executed by user in ${ALLSKY_HOME}.

	# Make sure we can upgrade:
	#	If config/ does NOT exist, the user hasn't installed Allsky.
	#		Warn the user but let them continue (won't be able to restore from prior).

	# Ask user if they want to upgrade in place (i.e., overwrite code),
	# or move current code to ${ALLSKY_PRIOR_DIR}.

	# If move current code:
	#	Check for prior Allsky versions:
	#		If ${ALLSKY_PRIOR_DIR} exist:
	#			If ${ALLSKY_PRIOR_DIR}-OLDEST exists
	#				Let user know both old versions exist
	#				Exit
	#			Let the user know ${ALLSKY_PRIOR_DIR} exists as FYI:
	#				echo "Saving prior version in ${ALLSKY_PRIOR_DIR}-OLDEST"
	#			Move ${ALLSKY_PRIOR_DIR} to ${ALLSKY_PRIOR_DIR}-OLDEST
	#	Stop allsky
	#	Move ${ALLSKY_HOME} to ${ALLSKY_PRIOR_DIR}
	#	cd
	#	Git new code into ${ALLSKY_HOME}
	#	cd ${ALLSKY_HOME}
	#	Run: ./install.sh ${DEBUG_ARG} .... --doUpgrade
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

fi
