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

# shellcheck disable=SC2034
DISPLAY_MSG_LOG="${ALLSKY_LOGS}/upgrade.log"	# send log entries here

FILES_DOWNLOADED_FILE="${ALLSKY_LOGS}/upgrade-files-downloaded.log"
GIT_PULL_LOG="${ALLSKY_LOGS}/upgrade-git-pull.log"

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

	if [[ -d ${ALLSKY_PRIOR_DIR} ]]; then
		MSG+="\n\n'${ALLSKY_PRIOR_DIR}' will be renamed to '${OLDEST_DIR}'."
	fi
	MSG+="\n\n'${ALLSKY_HOME}' will be renamed to '${ALLSKY_PRIOR_DIR}'."
	MSG+="\n\nThe new release will go in '${ALLSKY_HOME}'."

	MSG+="\n\n\nContinue?"
	if ! dialog --title "${TITLE}" --yesno "${MSG}" 25 "${T_WIDTH}" \
			3>&1 1>&2 2>&3; then
		display_msg --logonly info "User not ready to continue."
		clear
		exit 0
	fi
	clear
}

function check_for_current()
{
	local MSG

	if [[ ${NEWEST_VERSION} == "${ALLSKY_VERSION}" ]]; then
		MSG="STARTING REINSTALLATION OF ${ALLSKY_VERSION}.\n"
		display_msg --logonly info "${MSG}"

		MSG="\nThe current version of Allsky (${ALLSKY_VERSION}) is the newest version."
		MSG+="\n\nReinstalling the current version is useful"
		MSG+=" if it's corrupted, you just want to start over,"
		MSG+=" or the Allsky Team updated the current version in GitHub without"
		MSG+=" changing the version name (e.g., for an emergency fix)."
		MSG+="\n\nYour current settings and images will remain."
		MSG+="\n\nContinue?"
		if ! dialog --title "${TITLE}" --yesno "${MSG}" 25 "${T_WIDTH}" \
				3>&1 1>&2 2>&3; then
			display_msg --logonly info "User elected not to continue."
			clear
			display_msg --log note "\nNo changes made.\n"
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
	[[ ! -d ${ALLSKY_PRIOR_DIR} ]] && return 0

	if [[ -d ${OLDEST_DIR} ]]; then
		local MSG="Directory '${OLDEST_DIR}' already exist."
		local MSG2="\n\nIf you want to upgrade to the newest release, either remove '${OLDEST_DIR}'"
		MSG2+=" or rename it to something else, then re-run this upgrade."
		dialog --title "${TITLE}" --msgbox "${MSG}${MSG2}" 25 "${T_WIDTH}" 3>&1 1>&2 2>&3
		clear
		echo
		display_msg --log info "${MSG}"  "  Remove or rename it to continue."
		echo
		exit 2
	fi

	display_msg --log progress "Renaming '${ALLSKY_PRIOR_DIR}' to '${OLDEST_DIR}."
	mv "${ALLSKY_PRIOR_DIR}" "${OLDEST_DIR}"
}


function restore_directories()
{
	if [[ -d ${ALLSKY_HOME} ]]; then
		local MSG="Cannot restore directories: '${ALLSKY_HOME}' already exists."
		display_msg --log warning "${MSG}"
		return 1
	fi

	display_msg --log info "Renaming '${ALLSKY_PRIOR_DIR}' back to '${ALLSKY_HOME}'."
	mv "${ALLSKY_PRIOR_DIR}" "${ALLSKY_HOME}"
	if [[ -d ${OLDEST_DIR} ]]; then
		display_msg --log info "Renaming '${OLDEST_DIR}' back to '${ALLSKY_PRIOR_DIR}'."
		mv "${OLDEST_DIR}" "${ALLSKY_PRIOR_DIR}"
	fi

	return 0
}


#
function usage_and_exit()
{
	local RET=${1}
	exec >&2

	echo
	local USAGE="Usage: ${ME} [--help] [--debug] [--branch branch] [--doUpgrade] [--in-place] [--skip] [--restart-allsky true|false]"
	if [[ ${RET} -eq 0 ]]; then
		echo "Upgrade the Allsky software to a newer version."
		echo -e "\n${USAGE}"
	else
		E_ "${USAGE}"
	fi
	echo "Arguments:"
	echo "   --help            Displays this message and exits."
	echo "   --debug           Displays debugging information."
	echo "   --branch branch   Uses 'branch' instead of the production '${ALLSKY_GITHUB_MAIN_BRANCH}' branch."
	echo "   --doUpgrade       Completes the upgrade."
	echo "   --in-place        Specifies an 'in-place' upgrade should be performed."
	echo "   --skip            Tells install.sh to skip some steps."
	echo
	exit "${RET}"
}

####################### main part of program
#shellcheck disable=SC2124
ALL_ARGS="$@"

METHOD_IN_PLACE="In Place"
METHOD_REPLACE_ALL="Replace All"
CHOSEN_METHOD=""

##### Check arguments
OK="true"
HELP="false"
DEBUG="false"; DEBUG_ARG=""
SKIP=""
# shellcheck disable=SC2119
BRANCH="$( get_branch )"
[[ -z ${BRANCH} ]] && BRANCH="${ALLSKY_GITHUB_MAIN_BRANCH}"
# Possible ACTION's: "upgrade" (to prepare things), "doUpgrade" (to actually do the upgrade)
ACTION="upgrade"
RESTART_ALLSKY="false"

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
		--in-place)
			CHOSEN_METHOD="${METHOD_IN_PLACE}"
			;;
		--skip)
			SKIP="${ARG}"
			;;
		--restart-allsky)
			RESTART_ALLSKY="${2}"
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

cd || exit "${ALLSKY_EXIT_ERROR_STOP}"

if [[ ! -d ${ALLSKY_BIN} ]]; then
	MSG="Allsky does not appear to be installed; cannot continue."
	MSG2="Directory '${ALLSKY_BIN}' does not exist."
	display_msg --log error "${MSG}" "${MSG2}"
	echo
	exit 2
fi

if [[ "${ACTION}" != "upgrade" && ${DEBUG} == "true" ]]; then
	# we're continuing where we left off, so don't welcome again.
	display_msg --log progress "Continuing the upgrade..."
fi

##### Calculate whiptail sizes
T_WIDTH="$( calc_wt_size )"

SHORT_TITLE="Allsky Upgrader"
TITLE="${SHORT_TITLE} - ${ALLSKY_VERSION}"

if [[ ${ACTION} == "upgrade" ]]; then

	# First part of upgrade, executed by user in ${ALLSKY_HOME}.
	if ! NEWEST_VERSION="$( "${ALLSKY_UTILITIES}/getNewestAllskyVersion.sh" --branch "${BRANCH}" --version-only 2>&1 )" ; then
		MSG="Unable to determine newest version; cannot continue."
		if [[ ${BRANCH} != "${ALLSKY_GITHUB_MAIN_BRANCH}" ]];
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
	check_for_current

	# Ask user how they want to upgrade.
	MSG="\n"
	MSG+="There are two ways to upgrade Allsky:"
	MSG+="\n"
	MSG+="\n1. ${METHOD_IN_PLACE}"
	MSG+="\n   This overwrites existing Allsky files on your Pi that have been"
	MSG+="\n   updated in GitHub, and is the preferred method for POINT RELEASES or"
	MSG+="\n   unless the Allsky Team suggests the method below."
	if [[ -d ${ALLSKY_PRIOR_DIR} ]]; then
		MSG+="\n   It does not use or update ${ALLSKY_PRIOR_DIR}."
	fi
	MSG+="\n   NOTE: If you have changed any Allsky source files this method"
	MSG+="\n   will not work."
	MSG+="\n"
	MSG+="\n2. ${METHOD_REPLACE_ALL}"
	MSG+="\n   This moves '${ALLSKY_HOME}' to '${ALLSKY_PRIOR_DIR}' then"
	MSG+="\n   recreates '${ALLSKY_HOME}' with the newest release from GitHub."
	MSG+="\n   It is safer than the method above but takes longer, and"
	MSG+="\n   is the preferred method for MAJOR updates or when you don't want"
	MSG+="\n   to overwrite the current release."
	MSG+="\n \nPick the upgrade method:"

	HEIGHT="$( echo -e "${MSG}" | wc -l )"
	(( HEIGHT += 10 ))

	dialog \
		--title "${SHORT_TITLE}" --msgbox "${MSG}" \
		"${HEIGHT}" "${T_WIDTH}"   3>&1 1>&2 2>&3
	if [[ $? -ne 0 ]]; then
		clear
		display_msg --log progress "\nNo changes made.\n"
		exit 0
	fi

	X="$( dialog \
		--title "${SHORT_TITLE}" \
		--menu "${MSG}" "${HEIGHT}" "${T_WIDTH}" 2 \
			1 "${METHOD_IN_PLACE}" \
			2 "${METHOD_REPLACE_ALL}" \
		3>&1 1>&2 2>&3 )"
	clear

	if [[ ${X} -eq 1 ]]; then
		CHOSEN_METHOD="${METHOD_IN_PLACE}"
	elif [[ ${X} -eq 2 ]]; then
		CHOSEN_METHOD="${METHOD_REPLACE_ALL}"
	else
		MSG="User elected to not continue while picking an upgrade method."
		display_msg --logonly info "${MSG}"
		display_msg --log progress "\nNo changes made - no upgrade method chosen.\n"
		exit 0
	fi

	if [[ ${CHOSEN_METHOD} == "${METHOD_IN_PLACE}" ]]; then
		cd "${ALLSKY_HOME}"	|| exit "${ALLSKY_EXIT_ERROR_STOP}"

		display_msg --log progress "Getting new files from GitHub"
		# Get the current git revision, this is used laer to determine if any files have been updated by coparing
		# the old and new head revisions
		if ! OLD_HEAD="$( git rev-parse HEAD 2>&1 )" ; then
			MSG="Unable to determine the current git revision:\n${OLD_HEAD}"
			display_msg --log error "${MSG}" "Contact the Allsky Team if needed."
			exit "${ALLSKY_EXIT_ERROR_STOP}"
		fi
		# Do the git pull and check for any issues
		if ! git pull > "${GIT_PULL_LOG}" 2>&1 ; then
			if grep -i --silent "would be overwritten" "${GIT_PULL_LOG}" ; then
				FILES="$( echo -e "${GIT_PULL_LOG}" | grep "^	" )"	# TAB
				MSG="You have un-checked out files, cannot continue:\n${FILES}"
				MSG+="\n\nThe full git output is in '${GIT_PULL_LOG}'."
			else
				MSG="Unable to get new files.\nThe full git output is in '${GIT_PULL_LOG}'."
			fi
			display_msg --log error "${MSG}" "Contact the Allsky Team if needed."
			exit "${ALLSKY_EXIT_ERROR_STOP}"
		fi
		if ! NEW_HEAD="$( git rev-parse HEAD 2>&1 )" ; then
			MSG="Unable to determine the new git revision:\n${NEW_HEAD}"
			display_msg --log error "${MSG}" "Contact the Allsky Team if needed."
			exit "${ALLSKY_EXIT_ERROR_STOP}"
		fi

		# Check the old and new git revisions, if they are the same then nothing updated.
		if [[ ${OLD_HEAD} == "${NEW_HEAD}" ]]; then
			echo
			MSG="No new files; existing upgrade.\n"
			display_msg --log progress "" "${MSG}"
			exit 0
		fi

		ACTIVE="$( systemctl is-active allsky )"
		if [[ $? -eq 0 ]]; then
			RESTART_ALLSKY="true"
			display_msg --log progress "Allsky is ${ACTIVE}; stopping it."
			stop_Allsky
		else
			display_msg --logonly progress "Allsky is ${ACTIVE}; no need to stop it."
			RESTART_ALLSKY="false"
		fi

		# Get a list of all files downloaded. Use git diff to determine the difference between the old and new head revisions. This
		# is 'potentially' more reliable than parsing the output of git pull, which can be in different formats depending on the version of git.
		if ! git diff --name-only "${OLD_HEAD}" "${NEW_HEAD}" > "${FILES_DOWNLOADED_FILE}" ; then
			MSG="Unable to get the list of downloaded files."
			display_msg --log error "${MSG}" "Contact the Allsky Team if needed."
			exit "${ALLSKY_EXIT_ERROR_STOP}"
		fi
		NUM="$( wc -l < "${FILES_DOWNLOADED_FILE}" )"
		display_msg --log progress "${NUM} file(s) were downloaded."
		display_msg --log info "Look in '${FILES_DOWNLOADED_FILE}' to see the list."

		# This script may have been updated so re-run it.
		# The "exec" should not return.
		# shellcheck disable=SC2093
		exec "${ALLSKY_HOME}/${ME}" --doUpgrade --in-place --restart-allsky "${RESTART_ALLSKY}"

		display_msg --log error "Unable to continue the upgrade."
		exit "${ALLSKY_EXIT_ERROR_STOP}"

	else		# move ${ALLSKY_HOME}
		check_for_oldest

		display_msg --log progress "Stopping Allsky"
		stop_Allsky

		display_msg --log progress "Renaming '${ALLSKY_HOME}' to '${ALLSKY_PRIOR_DIR}'."
		mv "${ALLSKY_HOME}" "${ALLSKY_PRIOR_DIR}" || exit "${ALLSKY_EXIT_ERROR_STOP}"

		# Keep using same log file which is now in the "prior" directory.
		DISPLAY_MSG_LOG="${DISPLAY_MSG_LOG/${ALLSKY_HOME}/${ALLSKY_PRIOR_DIR}}"

		R="${ALLSKY_GITHUB_ROOT}/${ALLSKY_GITHUB_ALLSKY_REPO}.git"
		X="${ALLSKY_PRIOR_DIR}/.git/config"
		if [[ -f "${X}" ]] && ! grep --silent "${R}" "${X}" ; then
			R="${R/https:??/git@}"
			R="${R/.com\//.com:}"
		fi

		display_msg --log progress "Running: git clone --depth=1 --recursive --branch '${BRANCH}' '${R}'"
		display_msg note "" "This will take a minute or so."
		if ! ERR="$( git clone --depth=1 --recursive --branch "${BRANCH}" "${R}" 2>&1 )" ; then
			# In case the git clone created ${ALLSKY_HOME}, delete it since it's not complete.
			display_msg --log error "'git clone' failed." " ${ERR}"
			if [[ -d ${ALLSKY_HOME} ]]; then
				display_msg --log error "Removing incomplete ${ALLSKY_HOME}."
				rm -fr "${ALLSKY_HOME}"
			fi
			restore_directories
			exit 3
		fi

		cd "${ALLSKY_HOME}" || exit "${ALLSKY_EXIT_ERROR_STOP}"

		if [[ -d ${OLDEST_DIR} ]]; then
			MSG="If you don't need the '${OLDEST_DIR}' directory, you can remove it:"
			MSG+="    sudo rm -fr '${OLDEST_DIR}'\n"
			add_to_post_actions "${MSG}"
		fi

		# --doUpgrade tells it to use prior version without asking and to not display header,
		# change messages to say "upgrade", not "install", etc.
		MSG="The first step of the upgrade is complete.\n"
		display_msg progress "${MSG}" "  Running install.sh"
		display_msg --logonly info "ENDING UPGRADE; calling install.sh"

		(
			unset DISPLAY_MSG_LOG	# so install.sh writes to its own log file
			# shellcheck disable=SC2086,SC2291
			./install.sh ${DEBUG_ARG} ${SKIP} --doUpgrade
		)
		RET=$?
		if [[ ${RET} -ne 0 ]]; then
			display_msg --log warning "install.sh failed."  "Contact the Allsky Team"
			exit "${RET}"
		fi
		MSG2="  To start Allsky, go to the WebUI's 'System -> System' page.\n"
		display_msg --log progress "The upgrade is complete."  "${MSG2}"
		exit 0
	fi

elif [[ ${ACTION} == "doUpgrade" ]]; then
	if [[ ${CHOSEN_METHOD} == "${METHOD_IN_PLACE}" ]]; then
		X="$( "${ALLSKY_UTILITIES}/allsky-config.sh" recreate_files --files-downloaded "${FILES_DOWNLOADED_FILE}" 2>&1 )"
		if [[ $? -ne 0 ]]; then
			MSG="Unable to recreate files: ${X}"
			display_msg --log error "${MSG}" "Contact the Allsky Team"
			exit 1
		fi
		if [[ ${RESTART_ALLSKY} == "true" ]]; then
			MSG2="  Allsky restarted.\n"
			start_Allsky
		else
			MSG2="  To start Allsky, go to the WebUI's 'System -> System' page.\n"
		fi
		display_msg --log progress "Allsky upgraded."  "${MSG2}"
		display_msg --logonly info "Recreated files:\n${X}"
		display_msg --logonly info "ENDING UPGRADE."
		exit 0
	else
		:
		# TODO: Is there anything to do for ${METHOD_REPLACE_ALL}?
		# I can't think of anything.
	fi
fi
