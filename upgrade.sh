#!/bin/bash

# Upgrade the current Allsky release, carrying current settings forward.

[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )" )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit "${ALLSKY_EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"					|| exit "${ALLSKY_EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/installUpgradeFunctions.sh"	|| exit "${ALLSKY_EXIT_ERROR_STOP}"

# High-level view of tasks for upgrade:
#	Check if ${ALLSKY_PRIOR_DIR} exists.
#		If so, warn user they won't be able to save current release.
#	Prompt if user wants to carry current settings to new release.
#		If so:
#			If ${ALLSKY_PRIOR_DIR} exists, error out
#		Rename ${ALLSKY_HOME} to ${ALLSKY_PRIOR_DIR}
#	Download new release (with optional branch) from GitHub.
#	Execute new release's installation script telling it it's an upgrade.

#############  TODO: Changes to install.sh needed:
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

# shellcheck disable=SC2034
DISPLAY_MSG_LOG="${ALLSKY_LOGS}/upgrade.log"	# send log entries here


############################## functions
####
function do_initial_heading()
{
	local MSG

	MSG="Welcome to the ${SHORT_TITLE}!\n\n"
	MSG+="Your current Allsky release will be"
	if [[ ${NEWEST_VERSION} == "${ALLSKY_VERSION}" ]]; then
		MSG+=" reinstalled"
	else
		MSG+=" upgraded to ${NEWEST_VERSION}"
	fi
	MSG+=" and all settings and images maintained."

	if [[ -d ${PRIOR_ALLSKY_DIR} ]]; then
		MSG+="\n\n'${PRIOR_ALLSKY_DIR}' will be renamed to '${OLDEST_DIR}'."
	fi
	MSG+="\n\n'${ALLSKY_HOME}' will be renamed to '${PRIOR_ALLSKY_DIR}'."
	MSG+="\n\nThe new release will go in '${ALLSKY_HOME}'."

	MSG+="\n\n\nContinue?"
	if ! whiptail --title "${TITLE}" --yesno "${MSG}" 25 "${WT_WIDTH}" \
			3>&1 1>&2 2>&3; then
		display_msg --logonly info "User not ready to continue."
		exit 0
	fi

	display_header "Welcome to the ${SHORT_TITLE}"
}

function check_for_current()
{
	local MSG

	if [[ ${NEWEST_VERSION} == "${ALLSKY_VERSION}" ]]; then
		MSG="STARTING REINSTALLATION OF ${ALLSKY_VERSION}.\n"
		display_msg --logonly info "${MSG}"
		MSG="The current version of Allsky (${ALLSKY_VERSION}) is the newest version."
		MSG+="\n\nReinstalling the current version is useful"
		MSG+=" if it's corrupted or you just want to start over."
		MSG+="\nYour current settings and images will remain."
		MSG+="\n\nContinue?"
		if ! whiptail --title "${TITLE}" --yesno "${MSG}" 25 "${WT_WIDTH}" \
				3>&1 1>&2 2>&3; then
			display_msg --logonly info "User elected not to continue."
			exit 0
		fi
	else
		MSG="STARTING UPGRADE OF ${ALLSKY_VERSION} to ${NEWEST_VERSION}.\n"
		display_msg --logonly info "${MSG}"
	fi
}

# Check if both the prior and the "oldest" directory exist.
# If so, we can't continue since we can't rename the prior directory to the oldest.
function check_for_oldest()
{
	[[ ! -d ${PRIOR_ALLSKY_DIR} ]] && return 0

	if [[ -d ${OLDEST_DIR} ]]; then
		local MSG="Directory '${OLDEST_DIR}' already exist."
		local MSG2="\n\nIf you want to upgrade to the newest release, either remove '${OLDEST_DIR}'"
		MSG2+=" or rename it to something else, then re-run this upgrade."
		whiptail --title "${TITLE}" --msgbox "${MSG}${MSG2}" 25 "${WT_WIDTH}" 3>&1 1>&2 2>&3
		display_msg --log info "${MSG}"
		exit 2
	fi

	display_msg --log progress "Renaming '${PRIOR_ALLSKY_DIR}' to '${OLDEST_DIR}."
	mv "${PRIOR_ALLSKY_DIR}" "${OLDEST_DIR}"
}


function restore_directories()
{
	display_msg --log info "Renaming '${PRIOR_ALLSKY_DIR}' back to '${ALLSKY_HOME}'."
	echo mv "${PRIOR_ALLSKY_DIR}" "${ALLSKY_HOME}"
	if [[ -d ${OLDEST_DIR} ]]; then
		display_msg --log info "Renaming '${OLDEST_DIR}' back to '${PRIOR_ALLSKY_DIR}'."
		mv "${OLDEST_DIR}" "${PRIOR_ALLSKY_DIR}"
	fi
}


#
function usage_and_exit()
{
	local RET=${1}
	exec >&2

	echo
	local USAGE="Usage: ${ME} [--help] [--debug] [--branch branch] [--doUpgrade]"
	if [[ ${RET} -eq 0 ]]; then
		echo "Upgrade the Allsky software to a newer version."
		echo -e "\n${USAGE}"
	else
		E_ "${USAGE}"
	fi
	echo "Arguments:"
	echo "   --help            Displays this message and exits."
	echo "   --debug           Displays debugging information."
	echo "   --branch branch   Uses 'branch' instead of the production '${GITHUB_MAIN_BRANCH}' branch."
	echo "   --doUpgrade       Completes the upgrade."
	echo
	exit "${RET}"
}

####################### main part of program
#shellcheck disable=SC2124
ALL_ARGS="$@"

##### Check arguments
OK="true"
HELP="false"
DEBUG="false"; DEBUG_ARG=""
# shellcheck disable=SC2119
BRANCH="$( get_branch )"
[[ -z ${BRANCH} ]] && BRANCH="${ALLSKY_GITHUB_MAIN_BRANCH}"
# Possible ACTION's: "upgrade" (to prepare things), "doUpgrade" (to actually do the upgrade)
ACTION="upgrade"


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
		--branch)
			BRANCH="${2}"
			shift
			;;
		--doupgrade)
			ACTION="doUpgrade"
			;;
		-*)
			E_ "Unknown argument: '${ARG}'." >&2
			OK="false"
			;;

		*)
			break	# end of arguments
			;;
	esac
	shift
done
[[ ${HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" || $# -ne 0 ]] && usage_and_exit 1
[[ ${DEBUG} == "true" ]] && echo "Running: ${ME} ${ALL_ARGS}"

cd || exit "${ALLSKY_EXIT_ERROR_STOP}"

if [[ ! -d ${ALLSKY_CONFIG} ]]; then
	MSG="Allsky does not appear to be installed; cannot continue."
	MSG2="Directory '${ALLSKY_CONFIG}' does not exist."
	display_msg --log error "${MSG}" "${MSG2}"
	echo
	exit 2
fi

if [[ "${ACTION}" == "upgrade" ]]; then
	echo
	echo "**********************************************"
	echo "*** Welcome to the Allsky Software Upgrade ***"
	echo "**********************************************"
	echo
else	# we're continuing where we left off, so don't welcome again.
	display_msg --log info "Continuing the upgrade..."
fi

##### Calculate whiptail sizes
WT_WIDTH="$( calc_wt_size )"

SHORT_TITLE="Allsky Upgrader"
TITLE="${SHORT_TITLE} - ${ALLSKY_VERSION}"
OLDEST_DIR="${PRIOR_ALLSKY_DIR}-OLDEST"

if [[ ${ACTION} == "upgrade" ]]; then
	# First part of upgrade, executed by user in ${ALLSKY_HOME}.

	if ! NEWEST_VERSION="$( "${ALLSKY_UTILITIES}/getNewestAllskyVersion.sh" --branch "${BRANCH}" --version-only 2>&1 )" ; then
		MSG="Unable to determine newest version; cannot continue."
		if [[ ${BRANCH} != "${GITHUB_MAIN_BRANCH}" ]];
		then
			MSG2="Make sure '${BRANCH}' is a valid branch in GitHub."
		else
			MSG2=""
		fi
		display_msg --log error "${MSG}" "${MSG2}"
		display_msg --logonly info "${NEWEST_VERSION}"		# is the error message.
		echo
		exit 2
	fi

	# Ask user if they want to move current code to ${ALLSKY_PRIOR_DIR},
	# or upgrade in place (i.e., overwrite code).

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
	# 	Run "git pull", then "install.sh --noSkip" ????
	#
	# 		OR
	#
	#	Git new code into ${ALLSKY_HOME}-NEW
	#	?? move ${ALLSKY_HOME}/upgrade.sh to ${ALLSKY_HOME}/upgrade-OLD.sh
	#		exec ${ALLSKY_HOME}/upgrade-OLD.sh
	#	Copy (don't move) everything from ${ALLSKY_HOME}-NEW to ${ALLSKY_HOME}
	#	Run: install.sh ${ALL_ARGS} --doUpgradeInPlace
	#		--doUpgradeInPlace tells it to use prior version without asking and to
	#		not display header, change messages to say "upgrade", not "install", etc.
	#		How is --doUpgradeInPlace different from --doUpgrade ??
	#	?? anything else?


	do_initial_heading

	check_for_current

	check_for_oldest

	display_msg --log progress "Stopping Allsky"
	stop_Allsky

	display_msg --log progress "Renaming '${ALLSKY_HOME}' to '${PRIOR_ALLSKY_DIR}'."
	mv "${ALLSKY_HOME}" "${PRIOR_ALLSKY_DIR}" || exit "${ALLSKY_EXIT_ERROR_STOP}"

	# Keep using same log file which is now in the "prior" directory.
	DISPLAY_MSG_LOG="${DISPLAY_MSG_LOG/${ALLSKY_HOME}/${PRIOR_ALLSKY_DIR}}"

	R="${GITHUB_ROOT}/${GITHUB_ALLSKY_REPO}.git"
	display_msg --log progress "Running: git clone --depth=1 --recursive --branch '${BRANCH}' '${R}'"
	if ! ERR="$( git clone --depth=1 --recursive --branch "${BRANCH}" "${R}" 2>&1 )" ; then
		display_msg --log error "'git clone' failed." " ${ERR}"
		restore_directories
		exit 3
	fi

	cd "${ALLSKY_HOME}" || exit "${ALLSKY_EXIT_ERROR_STOP}"
	#
	# --doUpgrade tells it to use prior version without asking and to not display header,
	# change messages to say "upgrade", not "install", etc.
	# shellcheck disable=SC2086,SC2291
	echo xxx	./install.sh ${DEBUG_ARG} --branch "${BRANCH}" --doUpgrade

elif [[ ${ACTION} == "doUpgrade" ]]; then
	:
	# XXXX TODO: add code
fi
