#!/bin/bash

# Upgrade the current Allsky release.

[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )" )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"		|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"		|| exit "${EXIT_ERROR_STOP}"

cd "${ALLSKY_HOME}"  						|| exit "${EXIT_ERROR_STOP}"

# High-level view of tasks for upgrade:
#	Prompt if user wants to carry current settings to new release.
#	Rename current release.
#	Download new release from GitHub.
#	Execute new release's installation script telling it it's an upgrade.

# High-level view of tasks for restore:
#	Rename current release to "${ALLSKY_HOME}-${ALLSKY_VERSION}"
#	Rename prior release to ${ALLSKY_HOME}
#	Execute old release's installation script telling it it's a restore.

#############
# Changes to install.sh needed:
#	* Accept "--upgrade" argument which means we're doing an upgrade.
#		- Don't display "**** Welcome to the Allsky Camera installer ****"
#		- Don't prompt to reboot
#	* Accept "--camera camera" option and set CAMERA=<camera>
#		Don't prompt for camera.
#
#	* Accept "--restore" argument which means we're doing a restore.
#############
# TODO:
#	Check for symbolic links
#	Allow installing the "dev" branch.
#############

############################## functions
function usage_and_exit()
{
	local RET=${1}
	{
		[[ ${RET} -ne 0 ]] && echo -e "${RED}"
		echo -e "\nUpgrade the 'allsky' package, or restore the prior version from your Pi."
		echo
		echo -e "Usage: ${ME} [--help] [--debug] [--restore] [--function function]${NC}"
		echo
		echo "'--help' displays this message and exits."
		echo
		echo "'--debug' displays debugging information."
		echo
		echo "'--restore' restores the prior version from '${ALLSKY_HOME}-OLD'."
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
while [ $# -gt 0 ]; do
	ARG="${1}"
	case "${ARG,,}" in
		--help)
			HELP="true"
			;;
		--debug)
			DEBUG="true"
			DEBUG_ARG="${ARG}"		# we can pass this to other scripts
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

BRANCH="$( get_branch )"
[[ -z ${BRANCH} ]] && BRANCH="${GITHUB_MAIN_BRANCH}"

# TODO: these are here to keep shellcheck quiet while this script is incomplete.
DEBUG="${DEBUG}"
DEBUG_ARG="${DEBUG_ARG}"
FUNCTION="${FUNCTION}"

if [ "${ACTION}" != "doUpgrade" ]; then
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
	#	Stop allsky
	#	Move ${ALLSKY_HOME} to ${ALLSKY_HOME}-OLD
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

elif [[ ${ACTION} == "restore" ]]; then
	:

	# If running in ${ALLSKY_HOME}		# us 1st time through
	#	Make sure ${ALLSKY_HOME}-OLD exists
	#		If not, warn user and exit:
	#			"No prior version to restore from: ${ALLSKY_HOME}-OLD does not exist".
	#	cp ${ME} /tmp
	#	chmod 775 /tmp/${ME}
	#	exec /tmp/${ME} --restore ${ALL_ARGS} ${ALLSKY_HOME}

	# Else		# running from /tmp - do the actual work
	#	Stop allsky
	#	mv ${ALLSKY_HOME} ${ALLSKY_HOME}-new_tmp
	#	mv ${ALLSKY_HOME}-OLD ${ALLSKY_HOME}
	#	move images from ${ALLSKY_HOME}-new_tmp to ${ALLSKY_HOME}
	#	move darks from ${ALLSKY_HOME}-new_tmp to ${ALLSKY_HOME}
	#	move other stuff that was moved in install.sh from old to new

fi
