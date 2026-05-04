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
	local USAGE="Usage: ${ME} [--help] [--debug] [--branch branch] [--doUpgrade] [--in-place]"
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
	echo "   --in-place        Specifies an 'in-place' upgrade should be performed."
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
IN_PLACE="false"

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
			IN_PLACE="true"
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
	display_msg --log progress "Continuing the upgrade..."
fi

##### Calculate whiptail sizes
WT_WIDTH="$( calc_wt_size )"

SHORT_TITLE="Allsky Upgrader"
TITLE="${SHORT_TITLE} - ${ALLSKY_VERSION}"
OLDEST_DIR="${PRIOR_ALLSKY_DIR}-OLDEST"

if [[ ${ACTION} == "upgrade" ]]; then
	# First part of upgrade, executed by user in ${ALLSKY_HOME}.

	# Ask user how they want to upgrade.
if false; then
	MSG="\n"
	MSG+="There are two ways to upgrade Allsky:"
	MSG+="\n"
	MSG+="\n1. In Place"
	MSG+="\n   This overwrites existing Allsky files on your Pi that have been"
	MSG+="\n   updated in GitHub, and is the preferred method for POINT RELEASES or"
	MSG+="\n   unless the Allsky Team suggests the method below."
	if [[ -d ${ALLSKY_PRIOR_DIR} ]]; then
		MSG+="\n   It does not use or update ${ALLSKY_PRIOR_DIR}."
	fi
	MSG+="\n   NOTE: If you have changed any Allsky source files this method"
	MSG+="\n   will not work."
	MSG+="\n"
	MSG+="\n2. Replace All"
	MSG+="\n   This moves '${ALLSKY_HOME}' to '${ALLSKY_PRIOR_DIR}' then"
	MSG+="\n   recreates '${ALLSKY_HOME}' with the newest release from GitHub."
	MSG+="\n   It is safer than the method above but takes longer, and"
	MSG+="\n   is the preferred method for MAJOR updates or when you don't want"
	MSG+="\n   to overwrite the current release."

	MSG+="\n\n\nYou will be prompted for which method to use in the next screen."

	HEIGHT="$( echo -e "${MSG}" | wc -l )"
	(( HEIGHT += 5 ))

	dialog \
		--title "${SHORT_TITLE}" --msgbox "${MSG}" \
		"${HEIGHT}" 80   3>&1 1>&2 2>&3
	if [[ $? -ne 0 ]]; then
		clear
		display_msg --log progress "\nNo changes made.\n"
		exit 0
	fi

	RESPONSE="$( dialog \
		--title "${SHORT_TITLE}" \
		--menu "\nPick The Upgrade Method:\n \n" 15 40 2 \
			1 "In Place" \
			2 "Replace All" \
		3>&1 1>&2 2>&3)"
	clear
else
	RESPONSE=1		# TODO: FIX: remove "else" when "Replace All" is implemented.

	MSG="\n"
	MSG+="\nThis upgrade will download the newest files from GitHub and"
	MSG+="\ninstall them in '${ALLSKY_HOME}', overwriting the existing files."
	MSG+="\n"
	MSG+="\nNOTE: If you have changed any Allsky source files you must do a 'normal'"
	MSG+="\nupgrade using 'git clone' - see the documentation for instructions."
	MSG+="\n"
	MSG+="\n\nContinue?"
	HEIGHT="$( echo -e "${MSG}" | wc -l )"
	(( HEIGHT += 5 ))
	dialog \
		--title "${SHORT_TITLE}" --yesno "${MSG}" \
		"${HEIGHT}" 80   3>&1 1>&2 2>&3
	RET=$?
	clear
	if [[ ${RET} -ne 0 ]]; then
		display_msg --log progress "\nNo changes made.\n"
		exit 0
	fi
fi

	if [[ ${RESPONSE} == "1" ]]; then
		IN_PLACE="true"
	elif [[ ${RESPONSE} == "2" ]]; then
		IN_PLACE="false"
	else
		MSG="User elected to not continue while picking an upgrade method."
		display_msg --logonly info "${MSG}"
		display_msg --log progress "\nNo changes made.\n"
		exit 0
	fi

	if [[ ${IN_PLACE} == "true" ]]; then
		display_msg --log progress "Stopping Allsky"
		sudo systemctl stop allsky

		cd "${ALLSKY_HOME}"	|| exit "${ALLSKY_EXIT_ERROR_STOP}"

		display_msg --log progress "Getting new files from GitHub"
		X="$( git pull 2>&1 )"
		if [[ $? -ne 0 ]]; then
			if echo "${X}" | grep -i --silent -n "would be overwritten" ; then
				FILES="$( echo -e "${X}" | grep "^	" )"	# TAB
				MSG="You have un-checked out files, cannot continue:\n${FILES}"
			else
				MSG="Unable to get new files: ${X}"
			fi
			display_msg --log error "${MSG}" "Contact the Allsky Team"
			exit "${ALLSKY_EXIT_ERROR_STOP}"
		fi

		# This script may have been updated so re-run it.
		# shellcheck disable=SC2093
		exec "${ALLSKY_HOME}/${ME}" --doUpgrade --in-place		# should not return

		display_msg --log error "Unable to continue the upgrade."
		exit "${ALLSKY_EXIT_ERROR_STOP}"

	else		# move ${ALLSKY_HOME}

		OLDEST="${ALLSKY_PRIOR_DIR/OLD/OLDEST}"
		if [[ -d ${ALLSKY_PRIOR_DIR} ]]; then
			if [[ -d ${OLDEST} ]]; then
				MSG="Both '${ALLSKY_PRIOR_DIR}' and '${OLDEST}' exist; connot continue."
				display_msg --log warning "${MSG}" "If you are not using '${OLDEST}' delete it then rerun the upgrade."

#xxx				MSG="If you are not using '${OLDEST}' delete it then rerun the upgrade."
#xxx				display_msg --log note "${MSG}"
			fi
exit

			display_msg --log progress "Renaming '${ALLSKY_PRIOR_DIR}' to '${OLDEST}'."
			mv "${ALLSKY_PRIOR_DIR}" "${OLDEST}"
			display_msg --log progress "Renaming '${ALLSKY_HOME}' to '${ALLSKY_PRIOR_DIR}'."
		fi
		#	Check for prior Allsky versions:
		#		If ${ALLSKY_PRIOR_DIR} exist:
		#			If ${ALLSKY_PRIOR_DIR}-OLDEST exists
		#				Let user know both old versions exist.
		#				Exit
		#			Let the user know ${ALLSKY_PRIOR_DIR} exists as FYI:
		#				echo "Renaming ${ALLSKY_PRIOR_DIR} to ${ALLSKY_PRIOR_DIR}-OLDEST"
		#			Move ${ALLSKY_PRIOR_DIR} to ${ALLSKY_PRIOR_DIR}-OLDEST
		#	Stop allsky
		#	cd
		#	mv "${ALLSKY_HOME}" "${ALLSKY_PRIOR_DIR}"
		GIT_URL="https://github.com/AllskyTeam/allsky.git"
GIT_URL="${GIT_URL}"	# XXXXXXXXXXXXX keeps shellcheck quiet
		#	git clone --branch "${BRANCH}" --depth=1 --recursive "${GIT_URL}"
#[[ -z ${BRANCH} ]] && BRANCH="${ALLSKY_GITHUB_MAIN_BRANCH}"
		#	cd ${ALLSKY_HOME}
		#	Run: ./install.sh ${DEBUG_ARG} .... --doUpgrade
		#		--doUpgrade tells it to use prior version without asking and to
		#		not display header, change messages to say "upgrade", not "install", etc.
		#	?? anything else?

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

		# --doUpgrade tells it to use prior version without asking and to not display header,
		# change messages to say "upgrade", not "install", etc.
# TODO: used "exec" ?
		# shellcheck disable=SC2086,SC2291
		./install.sh ${DEBUG_ARG} --branch "${BRANCH}" --doUpgrade
	fi

elif [[ ${ACTION} == "doUpgrade" ]]; then
	if [[ ${IN_PLACE} == "true" ]]; then
		X="$( "${ALLSKY_UTILITIES}/allsky-config.sh" recreate_files 2>&1 )"
		if [[ $? -ne 0 ]]; then
			MSG="Unable to update files: ${X}"
			display_msg --log error "${MSG}" "Contact the Allsky Team"
			exit 1
		fi
		display_msg --log progress "Files updated."  "  Go to the WebUI to restart Allsky.\n"
		display_msg --logonly info "Updated files:\n${X}"
		display_msg --logonly info "ENDING UPGRADE."
		exit 0
	else
:
	# XXXX TODO: add code
	fi
fi
