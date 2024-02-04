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

# shellcheck disable=SC2034
DISPLAY_MSG_LOG="${ALLSKY_LOGS}/remote_website_install.sh.log"		# display_msg() sends log entries to this file.

#XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX TODO: get working

# Keep shellcheck quiet during construction...
IS_NEW_INSTALL="false"
do_initial_heading="false"

############################################## functions

####
#
do_initial_heading()
{
	if [[ ${UPDATE} == "true" ]]; then
		display_header "Updating Remote Allsky Website"
		return
	fi

	if [[ ${do_initial_heading} == "true" ]]; then
		display_header "Welcome back to the ${TITLE}!"
	else
		local MSG="Welcome to the ${TITLE}!\n"

		if [[ ${IS_NEW_INSTALL} == "true" ]]; then
			# If the local Website is being used ask if the user wants to upload its images
			# and use its configuration.json file (with changes for remote Websites).
			MSG="${MSG}\nxxxxx"
			MSG="${MSG} xxxxx"
		else
			# Upgrade
			MSG="${MSG}\nxxxxx"
			MSG="${MSG} xxxxx"
		fi

		MSG="${MSG}\n\nContinue?"
		if ! whiptail --title "${TITLE}" --yesno "${MSG}" 25 "${WT_WIDTH}"  3>&1 1>&2 2>&3; then
			display_msg "${LOG_TYPE}" info "User not ready to continue."
			exit_installation 1 "${STATUS_CLEAR}" ""
		fi

		display_header "Welcome to the ${TITLE}"
	fi

	[[ ${do_initial_heading} != "true" ]] && STATUS_VARIABLES+=("${FUNCNAME[0]}='true'\n")
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
			MSG="${MSG}\nis missing ${WEBSITE_CONFIG_VERSION}.  It should be '${NEW_WEB_CONFIG_VERSION}'."
			MSG="${MSG}\nYou need to manually copy your prior remote Allsky Website settings to"
			MSG="${MSG} '${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}."
			display_msg --log error "${MSG}"
			PRIOR_V="1"		# Assume the oldest version
		fi
		if [[ ${PRIOR_V} < "${NEW_WEB_CONFIG_VERSION}" ]]; then
			update_website_config_file "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}" \
				"${PRIOR_V}" "${NEW_WEB_CONFIG_VERSION}" "remote"
		else
			MSG="${SPACE}${SPACE}Remote Website ${WEBSITE_CONFIG_VERSION} is current @ ${NEW_WEB_CONFIG_VERSION}"
			display_msg --logonly info "${MSG}"
		fi


############# Current remote Website does NOT exist:
#	Install it using some code from website/install.sh
