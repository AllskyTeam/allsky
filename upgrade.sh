#!/bin/bash

# Upgrade the current Allsky release, carrying current settings forward.

[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )" )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/installUpgradeFunctions.sh"	|| exit "${EXIT_ERROR_STOP}"

#############  TODO: Changes to install.sh needed:
#	* Accept "--upgrade" argument which means we're doing an upgrade.
#		- Don't display "**** Welcome to the installer ****"
#		- Don't prompt for camera
#		- Don't prompt to reboot
#		- Don't prompt other things ??
#

# shellcheck disable=SC2034
DISPLAY_MSG_LOG="${ALLSKY_LOGS}/upgrade.log"	# send log entries here


############################## functions
####
do_initial_heading()
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
check_for_oldest()
{
	[[ ! -d ${PRIOR_ALLSKY_DIR} ]] && return 0

	if [[ -d ${OLDEST_DIR} ]]; then
		local MSG="Directory '${OLDEST_DIR}' already exist."
		MSG+="\n\nIf you want to upgrade to the newest release, either remove '${OLDEST_DIR}'"
		MSG+=" or rename it to something else, then re-run this upgrade."
		whiptail --title "${TITLE}" --msgbox "${MSG}" 25 "${WT_WIDTH}" 3>&1 1>&2 2>&3
		display_msg --log info "${MSG}"
		exit 2
	fi

	display_msg --log progress "Renaming '${PRIOR_ALLSKY_DIR}' to '${OLDEST_DIR}."
	mv "${PRIOR_ALLSKY_DIR}" "${OLDEST_DIR}"
}


restore_directories()
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
	local USAGE="Usage: ${ME} [--help] [--debug] [--branch branch]"
	if [[ ${RET} -eq 0 ]]; then
		echo "Upgrade the Allsky software to a newer version."
		echo -e "\n${USAGE}"
	else
		E_ "${USAGE}"
	fi
	echo "Where:"
	echo "   --help            Displays this message and exits."
	echo "   --debug           Displays debugging information."
	echo "   --branch branch   Uses 'branch' instead of the production '${GITHUB_MAIN_BRANCH}' branch."
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
[[ -z ${BRANCH} ]] && BRANCH="${GITHUB_MAIN_BRANCH}"
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


NEWEST_VERSION="$( "${ALLSKY_UTILITIES}/getNewestAllskyVersion.sh" --branch "${BRANCH}" --version-only 2>&1 )"
if [[ $? -ne 0 || -z ${NEWEST_VERSION} ]]; then
	MSG="Unable to determine newest version; cannot continue."
	if [[ ${BRANCH} != "${GITHUB_MAIN_BRANCH}" ]];
	then
		MSG2="Make sure '${BRANCH}' is a valid branch in GitHub."
	else
		MSG2=""
	fi
	display_msg --log error "${MSG}" "${MSG2}"
	echo
	exit 2
fi

if [[ ! -d ${ALLSKY_CONFIG} ]]; then
	MSG="Allsky does not appear to be installed; cannot continue."
	MSG2="Directory '${ALLSKY_CONFIG}' does not exist."
	display_msg --log error "${MSG}" "${MSG2}"
	echo
	exit 2
fi
# Make sure we can upgrade:
#	If config/ does NOT exist, the user hasn't installed Allsky.
#		Warn the user but let them continue (won't be able to restore from prior).

##### Calculate whiptail sizes
WT_WIDTH="$( calc_wt_size )"

SHORT_TITLE="Allsky Upgrader"
TITLE="${SHORT_TITLE} - ${ALLSKY_VERSION}"
OLDEST_DIR="${PRIOR_ALLSKY_DIR}-OLDEST"

do_initial_heading

check_for_current

check_for_oldest

display_msg --log progress "Stopping Allsky"
stop_Allsky

display_msg --log progress "Renaming '${ALLSKY_HOME}' to '${PRIOR_ALLSKY_DIR}'."
mv "${ALLSKY_HOME}" "${PRIOR_ALLSKY_DIR}"

# Keep using same log file which is now in the "prior" directory.
DISPLAY_MSG_LOG="${DISPLAY_MSG_LOG/${ALLSKY_HOME}/${PRIOR_ALLSKY_DIR}}"

cd || exit "${EXIT_ERROR_STOP}"
 

R="${GITHUB_ROOT}/${GITHUB_ALLSKY_REPO}.git"
display_msg --log info "Running: git clone --depth=1 --recursive --branch '${BRANCH}' '${R}'"
if ! ERR="$( git clone --depth=1 --recursive --branch "${BRANCH}" "${R}" 2>&1 )" ; then
	display_msg --log error "'git clone' failed." " ${ERR}"
	restore_directories
	exit 3
fi

cd "${ALLSKY_HOME}" || exit "${EXIT_ERROR_STOP}"
#
# --doUpgrade tells it to use prior version without asking and to not display header,
# change messages to say "upgrade", not "install", etc.
# shellcheck disable=SC2086
echo xxx	./install.sh ${DEBUG_ARG} --branch "${BRANCH}" --doUpgrade
