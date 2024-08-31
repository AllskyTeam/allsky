#!/bin/bash

# Install or upgrade a remote Allsky Website.

[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )" )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/installUpgradeFunctions.sh"	|| exit "${EXIT_ERROR_STOP}"

TITLE="Remote Allsky Website Installer"
COMMAND_FILE="${ALLSKY_TMP}/commands.txt"	# basename must match what's in runCommands.php

# display_msg() sends log entries to this file.
# shellcheck disable=SC2034
DISPLAY_MSG_LOG="${ALLSKY_LOGS}/remote_website_install.sh.log"

USING_LOCAL_WEBSITE="false"
USING_REMOTE_WEBSITE="false"
PRIOR_CONFIG_VERSION=""
do_initial_heading="false"
STATUS_VARIABLES=()
TAB="\t"


############################################## functions

####
# Check if a local and/or remote Website are being used.
# For remote, also check that we can get to the Website.
# Run every time in case things changed between installations.
function check_for_existing_websites()
{
	USING_LOCAL_WEBSITE="$( settings ".uselocalwebsite" )"
	USING_REMOTE_WEBSITE="$( settings ".useremotewebsite" )"
	if [[ ${USING_REMOTE_WEBSITE} == "true" ]]; then
		display_msg --log progress "Testing upload to remote Website."
		if ! RET="$( "${ALLSKY_SCRIPTS}/testUpload.sh" --website )"
			MSG="Unable to upload a test file to your remote Website.\n"
			display_msg --log error "${MSG}"
			display_msg --log info "${RET}"
			exit_installation 1
		fi
	fi
}

####
function do_initial_heading()
{
	if [[ ${UPDATE} == "true" ]]; then
		display_header "Updating Remote Allsky Website"
		return
	fi

	if [[ ${FUNCNAME[0]} == "true" ]]; then
		display_header "Welcome back to the ${TITLE}!"
	else
		local MSG="Welcome to the ${TITLE}!\n"

		if [[ ${USING_REMOTE_WEBSITE} == "false" ]]; then
			# If the local Website is being used ask if the user wants to upload its images
			# and use its configuration.json file (with changes for remote Websites).
			if [[ ${USING_LOCAL_WEBSITE} == "true" ]]; then
				MSG+="\nYou will be asked if you want to copy the startrails, keograms, and"
				MSG+="\ntimelapse (if any) files from your Allsky Website on the Pi"
				MSG+="\nto the remote Website."
				MSG+="\nYou will also be asked if the local Website settings should be"
				MSG+=" used for the remote Website."
			fi
		else
			# Upgrade
			MSG+="\nxxxxx"
			MSG+=" xxxxx"
		fi

		MSG="${MSG}\n\nContinue?"
		if ! whiptail --title "${TITLE}" --yesno "${MSG}" 25 "${WT_WIDTH}"  3>&1 1>&2 2>&3; then
			display_msg --logonly info "User not ready to continue."
			exit_installation 1 "${STATUS_CLEAR}" ""
		fi

		STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")
	fi
}


####
# Execute the specified function, then exit.
function do_function()
{
	local FUNCTION="${1}"
	shift
	if ! type "${FUNCTION}" > /dev/null; then
		display_msg error "Unknown function: '${FUNCTION}'."
		exit_installation 1
	fi

	${FUNCTION} "$@"
	exit_installation $?
}


####
# Update the configuration file to the current version.
function update_config_file()
{
	declare -n v="${FUNCNAME[0]}"; [[ ${v} == "true" ]] && return

	local CONFIG_FILE="${1}"
	local CURRENT_VERSION="${2}"
	local NEW_VERSION="${3}"

	if [[ ${NEW_VERSION} -gt 2 ]]; then
		MSG="Unknown ${WEBSITE_CONFIG_VERSION}: ${NEW_VERSION}."
		MSG+="Need to update this script."
		display_msg --log error "${MSG}"
		exit_installation "${EXIT_ERROR_STOP}"
	fi

	[[ ${CURRENT_VERSION} -eq ${NEW_VERSION} ]] && return

	if [[ ${CURRENT_VERSION} -eq 1 ]]; then

		# Append "/" to the urls
		$URL="homePage.leftSidebar"
		update_array_field "${CONFIG_FILE}" "${URL}" "url" "videos" "videos/"
		update_array_field "${CONFIG_FILE}" "${URL}" "url" "startrails" "startrails/"
		update_array_field "${CONFIG_FILE}" "${URL}" "url" "keograms" "keograms/"

		# Delete the "Website Version" array entry.
		update_array_field "${CONFIG_FILE}" "homePage.popoutIcons" "" "Website Version" "--delete"

		# Update/add other fields.
		"${ALLSKY_SCRIPTS}/updateWebsiteConfig.sh" ${DEBUG_ARG} --config "${CONFIG_FILE}" \
			--verbosity silent \
			".homePage.onPi" "onPi" --delete \
			".config.AllskyWebsiteVersion" "AllskyWebsiteVersion" --delete \
			".homePage.thumbnailsizex" "thumbnailsizex" 100 \
			".homePage.thumbnailsizey" "thumbnailsizex" 75 \
			".homePage.thumbnailsortorder" "thumbnailsortorder" "ascending" \
			${POPOUT_ICONS} ${POPOUT_ICONS} ${ACTION} \
			".${WEBSITE_CONFIG_VERSION}" "${WEBSITE_CONFIG_VERSION}" "${NEW_CONFIG_VERSION}"
	fi

	MSG="'${CONFIG_FILE}' updated from version ${CURRENT_VERSION} to version ${NEW_VERSION}."
	display_msg --log progress "${MSG}"

	STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")
}


####
# Check if this is an older configuration file. Return 0 if current, 1 if old.
function check_for_older_config_file()
{
	local FILE="${1}"

	local OLD="false"
	local NEW_CONFIG_VERSION="$( settings ".${WEBSITE_CONFIG_VERSION}" "${REPO_WEBCONFIG_FILE}" )"
	PRIOR_CONFIG_VERSION="$( settings ".${WEBSITE_CONFIG_VERSION}" "${FILE}" )"
	if [[ -z ${PRIOR_CONFIG_VERSION} ]]; then
		PRIOR_CONFIG_VERSION="** Unknown **"
		OLD="true"
	else
		[[ ${PRIOR_CONFIG_VERSION} < "${NEW_CONFIG_VERSION}" ]] && OLD="true"
	fi
	display_msg --logonly info "PRIOR_CONFIG_VERSION=${PRIOR_CONFIG_VERSION}, NEW=${NEW_CONFIG_VERSION}"

	if [[ ${OLD} == "true" ]]; then
		update_config_file "${FILE}" "${PRIOR_CONFIG_VERSION}" "${NEW_CONFIG_VERSION}"
		return 1
	else
		return 0
	fi
}

#####
# Get the checksum of all Website files.
# This will be used to compare what's on the remote Website.
function get_checksums()
{
	[[ -s ${ALLSKY_WEBSITE_CHECKSUM_FILE} ]] && return

	get_website_checksums > "${ALLSKY_WEBSITE_CHECKSUM_FILE}"
}


####
function usage_and_exit()
{
	local RET=${1}
	if [[ ${RET} == 0 ]]; then
		local C="${YELLOW}"
	else
		local C="${RED}"
	fi

	{
		echo
		echo -e "${C}Usage: ${ME} [--help] [--debug] [--update] [--function name]${NC}"
		echo
		echo "'--help' displays this message and exits."
		echo
		echo "'--update' should only be used when instructed to by an Allsky Website page."
		echo
		echo "'--function' executes the specified function and quits."
		echo
	} >&2
	exit_installation "${RET}"
}


############# Current remote Website exists:
#	Upgrade if config.AllskyVersion is old
#			(OR if ${WEBSITE_CONFIG_VERSION} != ${NEW_WEB_CONFIG_VERSION} ?????)

		# Check if this is an older Allsky Website configuration file type.
		# The remote config file should have ${WEBSITE_CONFIG_VERSION}.
		PRIOR_V="$( settings ".${WEBSITE_CONFIG_VERSION}" "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}" )"
		if [[ -z ${PRIOR_V} ]]; then
			# This shouldn't happen ...
			MSG="Website configuration file '${PRIOR_REMOTE_WEBSITE_CONFIGURATION_FILE}'"
			MSG+="\nis missing ${WEBSITE_CONFIG_VERSION}.  It should be '${NEW_WEB_CONFIG_VERSION}'."
			MSG+="\nYou need to manually copy your prior remote Allsky Website settings to"
			MSG+=" '${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}."
			display_msg --log error "${MSG}"
			PRIOR_V="1"		# Assume the oldest version
		fi
		if [[ ${PRIOR_V} < "${NEW_WEB_CONFIG_VERSION}" ]]; then
			update_old_website_config_file "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}" \
				"${PRIOR_V}" "${NEW_WEB_CONFIG_VERSION}" "remote"
		else
			MSG="Remote Website ${WEBSITE_CONFIG_VERSION} is current @ ${NEW_WEB_CONFIG_VERSION}"
			display_msg --logonly info "${MSG}"
		fi


############# Current remote Website does NOT exist:
#	Install it using some code from website/install.sh



############################################## main body
OK="true"
HELP="false"
DEBUG="false"
DEBUG_ARG=""
FUNCTION=""
UPDATE="false"

while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG}" in
		--help)
			HELP="true"
			;;
		--debug)
			DEBUG="true"
			DEBUG_ARG="${ARG}"		# we can pass this to other scripts
			;;
		--update)
			UPDATE="true"
			;;
		--function)
			FUNCTION="${2}"
			shift
			;;
		*)
			display_msg --log error "Unknown argument: '${ARG}'."
			OK="false"
			;;
	esac
	shift
done

[[ -z ${FUNCTION} && ${UPDATE} == "false" ]] && display_msg --log info "STARTING INSTALLATON AT $( date ).\n"

[[ ${HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" ]] && usage_and_exit 1

do_initial_heading

############# Make sure the Website is set up properly

# Quick check if runCommands.php is on the server.
# curl --data-urlencode var=value URL
REMOTE_HOST="( settings ".REMOTEWEBSITE_HOST" "${ALLSKY_ENV}" )"
if [[ -z ${REMOTE_HOST} ]]; then
	MSG="No remote Website server specified."
	display_msg --log error "${MSG}"
	exit_installation 1
fi

URL="${REMOTE_HOST}/runCommands.php"
RET="$( curl "${URL}?ping" 2>&1 )"
if [[ ${RET} -ne 0 || ! (${RET} =~ "success") ]]; then
	MSG="The 'runCommands.php' file was not found on the remote Website."
	MSG+="\nMake sure all files exist on the Website."
	display_msg --log error "${MSG}"
	exit_installation 1
fi


{
	echo -e "set${TAB}debug${TAB}1"
# TODO: add more
} > "${COMMAND_FILE}"


## upload ${COMMAND_FILE}
## curl runCommands.php - check for "success" in output.
## if 404, tell user, else if ! success tell user.  Quit


check_for_existing_websites
usage_and_exit
do_function
check_for_older_config_file
get_checksums
