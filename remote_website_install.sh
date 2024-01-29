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
