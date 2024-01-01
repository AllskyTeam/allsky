#!/bin/bash

[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$(realpath "$(dirname "${BASH_ARGV0}")"/..)"
ME="$(basename "${BASH_ARGV0}")"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh" 				|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/installUpgradeFunctions.sh"	|| exit "${EXIT_ERROR_STOP}"

#shellcheck disable=SC1091		# file doesn't exist in GitHub
source "${ALLSKY_CONFIG}/config.sh"						|| exit_installation "${EXIT_ERROR_STOP}"
#shellcheck disable=SC1091		# file doesn't exist in GitHub
source "${ALLSKY_CONFIG}/ftp-settings.sh"				|| exit_installation "${EXIT_ERROR_STOP}"

TITLE="Allsky Website Installer"

# display_msg() will send "log" entries to this file.
# DISPLAY_MSG_LOG is used in display_msg()
# shellcheck disable=SC2034
DISPLAY_MSG_LOG="${ALLSKY_CONFIG}/Website_install.log"


####################### functions

####
# 
do_initial_heading()
{
	MSG="Welcome to the ${TITLE}!\n"

if false ; then		# change if/when we have an initial message to display.
	if [[ -n ${PRIOR_WEBSITE_TYPE} ]]; then
		MSG="${MSG}\nYou will be asked if you want to use the startrails, keograms, and timelapse"
		MSG="${MSG}\n(if any) from your prior version of the Allsky Website."
		if [[ ${PRIOR_WEBSITE_TYPE} == "new" ]]; then
			MSG="${MSG}\nIf so, we will use the prior settings as well."
		else
			MSG="${MSG}\nIf so, you will need to manually migrate the settings from the"
			MSG="${MSG}\nprior website to the new one."
		fi
	else
		MSG="${MSG}\nWhen installation is done you'll need to update the Allsky Website"
		MSG="${MSG}\nsettings before using the Website."
		MSG="${MSG}\nThe latitude and longitude and some Allsky Map-related settings (if any)"
		MSG="${MSG}\nwill be set for you."
	fi

	MSG="${MSG}\n\nContinue?"
	if ! whiptail --title "${TITLE}" --yesno "${MSG}" 25 "${WT_WIDTH}"  3>&1 1>&2 2>&3; then
		exit_installation 1
	fi
fi

	##### Display the welcome header
	local U2=""
	local B=""
	if [[ ${DO_REMOTE_WEBSITE} == "true" ]]; then
		U2=" for remote servers"
	else
		U2=""
	fi
	if [[ ${BRANCH} == "${GITHUB_MAIN_BRANCH}" ]]; then
		B=""
	else
		B=" ${BRANCH}"
	fi
	display_header "Welcome to the ${TITLE} for${B} version ${NEW_WEBSITE_VERSION}${U2}"
}


usage_and_exit()
{
	RET=${1}
	if [[ ${RET} == 0 ]]; then
		C="${YELLOW}"
	else
		C="${RED}"
	fi
	echo
	echo -e "${C}Usage: ${ME} [--help] [--debug] [--remote] [--branch name] [--update] [--function name]${NC}"
	echo
	echo "'--help' displays this message and exits."
	echo
	echo "'--remote' keeps a copy of a remote server's configuration file on the"
	echo "   Pi where it can be updated in the WebUI and uploaded to the server."
	echo "   This will have no impact on a local Allsky Website, if installed."
	echo
	echo "The '--branch' option should only be used when instructed to by an Allsky developer."
	echo "  'name' is a valid branch name at ${GITHUB_ROOT}/allsky-website."
	echo
	echo "'--update' should only be used when instructed to by an Allsky Website page."
	echo
	echo "'--function' executes the specified function and quits."
	echo
	exit_installation "${RET}"
}


##### Check if the user is trying to download an older Website version.
# This could be because they forgot to include "--branch".
check_for_old_version()
{
	local OLD_VERSION="${1}"
	local NEW_VERSION="${2}"
	local NEW_BRANCH="${3}"

	[[ ${NEW_VERSION} == "${OLD_VERSION}" || ${NEW_VERSION} > "${OLD_VERSION}" ]] && return 0

	MSG="You are attempting to install an older Website version:"
	MSG="${MSG}\n   Current version: ${OLD_VERSION}"
	MSG="${MSG}\n   New     version: ${NEW_VERSION}"
	if [[ ${NEW_BRANCH} != "${GITHUB_MAIN_BRANCH}" ]]; then
		[[ -n ${PRIOR_WEBSITE_BRANCH} ]] && MSG="${MSG}\n   Current branch : ${PRIOR_WEBSITE_BRANCH}"
		MSG="${MSG}\n   New     branch : ${NEW_BRANCH}"
	fi
	MSG="${MSG}\n\nInstalling older versions can cause problems."
	MSG="${MSG}\n\nContinue anyhow?"
	if whiptail --title "${TITLE}" --defaultno --yesno "${MSG}" 18 80 3>&1 1>&2 2>&3 ; then
		MSG="Continuing with older Website version '${NEW_VERSION}' could cause problems."
		display_msg --log warning "${MSG}"
		return 0
	else
		MSG="\nInstallation aborted."
		MSG="${MSG}\nIf you want to upgrade to another branch, re-run the installation adding"
		MSG="${MSG}\n\t--branch BRANCH"
		MSG="${MSG}\nto the command line, where 'BRANCH' is the branch you want."
		MSG="${MSG}\nThe default branch is '${GITHUB_MAIN_BRANCH}'.\n"
		display_msg info "${MSG}"
		MSG="User stopped installation due to attempting to install old version (${NEW_VERSION})."
		display_msg --logonly info "${MSG}"
		return 1
	fi
}

##### Get the current and new versions, taking branches into account.
# We haven't downloaded the new version yet so we need to get its version from Git.
GOT_VERSIONS_AND_BRANCHES="false"
get_versions_and_branches()
{
	GOT_VERSIONS_AND_BRANCHES="true"

	# All new versions have a "versions" file.
	# If the user specified a branch, use that, otherwise see if they are running
	# a non-production branch.

	GITHUB_MAIN_BRANCH_NEW_VERSION="$( get_Git_version "${GITHUB_MAIN_BRANCH}" "allsky-website" )"
	if [[ -z ${GITHUB_MAIN_BRANCH_NEW_VERSION} ]]; then
		# If this failed we likely won't be able to get the new files either.
		display_msg --log error "Unable to determine newest GitHub version."
		exit_installation 1
	fi

	if [[ -z ${USER_SPECIFIED_BRANCH} ]]; then
		local MINIMAL_VERSION="v2023"
		if [[ ${GITHUB_MAIN_BRANCH_NEW_VERSION:0:5} < "${MINIMAL_VERSION}" ]]; then
			MSG="This installer only works with Website versions starting with '${MINIMAL_VERSION}' or newer."
			MSG="${MSG}\nYou are attempting to install an old Website version '${GITHUB_MAIN_BRANCH_NEW_VERSION}'."
			MSG="${MSG}\n\nIf needed, re-run the installation specifying a newer branch by adding"
			MSG="${MSG}\n    --branch BRANCH"
			MSG="${MSG}\nto the command line.\n"
			display_msg --log error "${MSG}"
			whiptail --title "${TITLE}" --msgbox "${MSG}" 12 "${WT_WIDTH}" 3>&1 1>&2 2>&3
			exit_installation 1
		fi
	fi

	display_msg "${LOG_TYPE}" info "GITHUB_MAIN_BRANCH_NEW_VERSION=${GITHUB_MAIN_BRANCH_NEW_VERSION}"

	if [[ ${DO_REMOTE_WEBSITE} == "true" ]]; then
		# Only newer Websites have DO_REMOTE_WEBSITE, so there should be a PRIOR_WEBSITE_VERSION
		# if there was a prior remote Website.
		if [[ -s ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE} ]]; then
			PRIOR_WEBSITE_VERSION="$( settings .config.AllskyWebsiteVersion "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}" )"
		else
			PRIOR_WEBSITE_VERSION="[none]"
		fi

		if [[ -n ${USER_SPECIFIED_BRANCH} && ${USER_SPECIFIED_BRANCH} != "${GITHUB_MAIN_BRANCH}" ]]; then
			NEW_WEBSITE_VERSION="$( get_Git_version "${USER_SPECIFIED_BRANCH}" "allsky-website" )"
			if [[ -z ${NEW_WEBSITE_VERSION} ]]; then
				MSG="GitHub branch '${USER_SPECIFIED_BRANCH}' does not exist."
				MSG="${MSG}\nTry again either with a different branch or without a branch."
				display_msg --log error "${MSG}"
				exit_installation 1
			fi
		else
			NEW_WEBSITE_VERSION="${GITHUB_MAIN_BRANCH_NEW_VERSION}"
		fi

		# TODO: Currently no way to determine the branch of a remote website.
		# Should put in the configuration file.
		PRIOR_WEBSITE_BRANCH=""

		if [[ -n ${USER_SPECIFIED_BRANCH} ]]; then
			B="${USER_SPECIFIED_BRANCH}"
		else
			B="${BRANCH}"
		fi
		if [[ ${PRIOR_WEBSITE_VERSION} != "[none]" ]]; then
			check_for_old_version "${PRIOR_WEBSITE_VERSION}" "${NEW_WEBSITE_VERSION}" "${B}" || exit 1
		fi

		display_msg "${LOG_TYPE}" info "New   remote Website version=${NEW_WEBSITE_VERSION}"
		display_msg "${LOG_TYPE}" info "Prior remote Website version=${PRIOR_WEBSITE_VERSION}"

		return
	fi

	if [[ ${PRIOR_WEBSITE_TYPE} == "new" ]]; then
		PRIOR_WEBSITE_BRANCH="$( get_branch "${PRIOR_WEBSITE}" )"
	fi
	PRIOR_WEBSITE_BRANCH="${PRIOR_WEBSITE_BRANCH:-${GITHUB_MAIN_BRANCH}}"

	if [[ -n ${USER_SPECIFIED_BRANCH} ]]; then
		BRANCH="${USER_SPECIFIED_BRANCH}"
	else
		# User didn't specify a branch (most common usage).
		# See if the user is running a non-production branch.
		# Older website types didn't have branches.
		BRANCH="${PRIOR_WEBSITE_BRANCH}"
	fi

	if [[ ${BRANCH} != "${GITHUB_MAIN_BRANCH}" ]]; then
		# See if the branch still exists in GitHub.
		NEW_WEBSITE_VERSION="$( get_Git_version "${BRANCH}" "allsky-website" )"
		if [[ -z ${NEW_WEBSITE_VERSION} ]]; then
			MSG="GitHub branch '${BRANCH}' does not exist."
			MSG="${MSG}\nTry again either without a branch or with a different branch."
			display_msg --log error "${MSG}"
			exit_installation 1
		fi

		NEW_WEBSITE_BRANCH="${BRANCH}"
	else
		# Using default branch - most common usage.
		NEW_WEBSITE_BRANCH="${GITHUB_MAIN_BRANCH}"
		NEW_WEBSITE_VERSION="${GITHUB_MAIN_BRANCH_NEW_VERSION}"
	fi

	if [[ ${PRIOR_WEBSITE_TYPE} == "new" ]]; then
		PRIOR_WEBSITE_VERSION="$( get_version "${PRIOR_WEBSITE}/" )"
		check_for_old_version "${PRIOR_WEBSITE_VERSION}" "${NEW_WEBSITE_VERSION}" "${NEW_WEBSITE_BRANCH}" || exit 1
	else
		PRIOR_WEBSITE_VERSION="[none]"
	fi


	if [[ ${DEBUG} == "true" ]]; then
		MSG=""
		MSG="${MSG}\n\tCurrent version: ${PRIOR_WEBSITE_VERSION:-Unknown}"
		MSG="${MSG}\n\tNew     version: ${NEW_WEBSITE_VERSION}"
		if [[ ${BRANCH} != "${GITHUB_MAIN_BRANCH}" ]]; then
			MSG="${MSG}\n\tCurrent branch : ${PRIOR_WEBSITE_BRANCH}"
			MSG="${MSG}\n\tNew     branch : ${NEW_WEBSITE_BRANCH}"
		fi
		display_msg --log debug "${MSG}"
	fi
}


##### Make sure the new version is at least as new as the current version,
##### i.e., we aren't installing an old version.
check_versions() {
	[[ ${GOT_VERSIONS_AND_BRANCHES} == "false" ]] && get_versions_and_branches

	local CHECK_BRANCH="false"

	# We don't know branch for remote Websites so don't check.
	# If branches are changing, check.
	if [[ ${DO_REMOTE_WEBSITE} == "false" ]]; then
		if [[ ${PRIOR_WEBSITE_BRANCH} != "${BRANCH}" ]]; then
			CHECK_BRANCH="true"
		else
			display_msg --log info "Remaining on '${PRIOR_WEBSITE_BRANCH}' branch."
		fi
	fi

	if [[ ${CHECK_BRANCH} == "true" ]]; then
		[[ ${USER_SPECIFIED_BRANCH} == "${PRIOR_WEBSITE_BRANCH}" ]] && USER_SPECIFIED_BRANCH=""

		# The user didn't specify a branch and there's a prior Website with a non-production
		# branch, so ask if they want to use that branch.
		MSG="Your prior Allsky Website is running the '${PRIOR_WEBSITE_BRANCH}' branch."
		MSG="${MSG}\n\nTypically you should stay with the same branch unless you"
		MSG="${MSG} are upgrading to the newest production release or a different branch"
		MSG="${MSG} for testing purposes."
		if [[ -n ${USER_SPECIFIED_BRANCH} ]]; then
			MSG="${MSG}\n\nYou requested upgrading to the '${USER_SPECIFIED_BRANCH}' branch."
			MSG="${MSG}\n\nContinue with '${USER_SPECIFIED_BRANCH}'?"
			if ! whiptail --title "${TITLE}" --yesno "${MSG}" 18 80 3>&1 1>&2 2>&3; then
				MSG="\nInstallation aborted."
				MSG="${MSG}\nNot continuing with '${USER_SPECIFIED_BRANCH}' branch."
				display_msg info "${MSG}"
				display_msg --logonly info "User stopped installation with ${USER_SPECIFIED_BRANCH} branch."
				exit_installation 0
			fi
			MSG="Upgrading to '${USER_SPECIFIED_BRANCH}' branch version ${NEW_WEBSITE_VERSION}"
			display_msg --log info "${MSG}"

		else
			MSG="${MSG}\n\nContinue with the '${PRIOR_WEBSITE_BRANCH}' branch?"
			if whiptail --title "${TITLE}" --yesno "${MSG}" 18 80 3>&1 1>&2 2>&3; then
				display_msg --log info "User wants to remain on the '${PRIOR_WEBSITE_BRANCH}' branch."
			else
				MSG="\nInstallation aborted."
				MSG="${MSG}\nIf you want to upgrade to another branch, re-run the installation adding"
				MSG="${MSG}\n\t--branch BRANCH"
				MSG="${MSG}\nto the command line, where 'BRANCH' is the branch you want."
				MSG="${MSG}\nThe default branch is '${GITHUB_MAIN_BRANCH}'.\n"
				display_msg info "${MSG}"
				display_msg --logonly info "User stopped installation with prior ${PRIOR_WEBSITE_BRANCH} branch."
				exit_installation 0
			fi
		fi
	fi

	if [[ -n ${NEW_WEBSITE_VERSION} && ${PRIOR_WEBSITE_VERSION} != "[none]" && \
		     ${NEW_WEBSITE_VERSION}   <  "${PRIOR_WEBSITE_VERSION}" ]]; then
		# Unless the version in GitHub is screwed up (i.e., newer one sorts after prior one),
		# we should only get here if the user is r
		MSG="WARNING: You are trying to install an older version of the Allsky Website!\n"

		# If they are changing branches, display both.
		local PB=""		# prior branch
		local NB=""		# new branch
		if [[ ${PRIOR_WEBSITE_BRANCH} != "${NEW_WEBSITE_BRANCH}" ]]; then
			PB="(${PRIOR_WEBSITE_BRANCH} branch)"
			NB="(${NEW_WEBSITE_BRANCH} branch)"
		fi
		MSG="${MSG}\nCurrent version: ${PRIOR_WEBSITE_VERSION} ${PB}"
		MSG="${MSG}\nNew     version: ${NEW_WEBSITE_VERSION} ${NB}"
		MSG="${MSG}\n\nContinue?"
		local B=""
		[[ ${NEW_WEBSITE_BRANCH} != "${GITHUB_MAIN_BRANCH}" ]] && B="${NEW_WEBSITE_BRANCH} "
		if whiptail --title "${TITLE}" --yesno --defaultno "${MSG}" 15 80 3>&1 1>&2 2>&3; then
			display_msg --log info "Installing old ${B}version ${NEW_WEBSITE_VERSION}."
		else
			MSG="\nInstallation aborted."
			MSG="${MSG}\nNOT installing old ${NEW_WEBSITE_BRANCH} version ${NEW_WEBSITE_VERSION}."
			display_msg --log info "${MSG}"
			exit_installation 0
		fi
	fi
}


####
##### Execute any specified function, then exit.
do_function()
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


##### Modify placeholders.
modify_locations() {
	display_msg --log progress "Modifying locations in web files."
	sed -i -e "s;XX_ALLSKY_CONFIG_XX;${ALLSKY_CONFIG};" "${ALLSKY_WEBSITE}/functions.php"
}


##### Create and upload a new data.json file and files needed to display settings.
upload_data_json_file() {
	LOCAL_or_REMOTE="${1}"		# is this for a local or remote Website, or both?
	display_msg --log progress "Uploading initial files to ${LOCAL_or_REMOTE} Website(s)."

	OUTPUT="$( "${ALLSKY_SCRIPTS}/postData.sh" --websites "${LOCAL_or_REMOTE}" --allFiles 2>&1 )"
	if [[ $? -ne 0 || ! -f ${ALLSKY_TMP}/data.json ]]; then
		MSG="Unable to upload initial files:"
		if echo "${OUTPUT}" | grep --silent "${ALLSKY_WEBSITE_VIEWSETTINGS_DIRECTORY_NAME}: No such file or" ; then
			# This should only happen for remote sites, since this installation script
			# created the directory for local sites.
			MSG="Check that the remote Website has the newest files."
			MSG="${MSG}\nThe '${ALLSKY_WEBSITE_VIEWSETTINGS_DIRECTORY_NAME}' directory does not exist."
		fi
		MSG="${MSG}\n${OUTPUT}"
		MSG="${MSG}\nMake sure 'REMOTE_HOST' is set to a valid server or to '' in 'ftp-settings.sh',"
		MSG="${MSG}\n then run:   ${ALLSKY_SCRIPTS}/postData.sh"
		MSG="${MSG}\nto create and upload a 'data.json' file."
		display_msg --log error "${MSG}"
		return 1
	fi
	return 0
}


##### Set up the location where the website configuration file will go.
WEB_CONFIG_FILE=""
IMAGE_NAME=""
ON_PI=""

set_configuration_file_variables() {
	[[ -z ${FUNCTION} ]] && display_msg --log progress "Setting Website variables."
	if [[ ${DO_REMOTE_WEBSITE} == "true" ]]; then
		WEB_CONFIG_FILE="${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}"
		IMAGE_NAME="${FULL_FILENAME}"
		ON_PI="false"
	else
		WEB_CONFIG_FILE="${ALLSKY_WEBSITE_CONFIGURATION_FILE}"
		#shellcheck disable=SC2153
		IMAGE_NAME="/${IMG_DIR}/${FULL_FILENAME}"
		ON_PI="true"
	fi
}


##### Check if this is an older configuration file. Return 0 if current, 1 if old.
check_for_older_config_file() {
	FILE="${1}"

	OLD="false"
	NEW_CONFIG_VERSION="$( settings .ConfigVersion "${REPO_WEBCONFIG_FILE}" )"
	PRIOR_CONFIG_VERSION="$( settings .ConfigVersion "${FILE}" )"
	if [[ -z ${PRIOR_CONFIG_VERSION} ]]; then
		PRIOR_CONFIG_VERSION="** Unknown **"
		OLD="true"
	else
		[[ ${PRIOR_CONFIG_VERSION} < "${NEW_CONFIG_VERSION}" ]] && OLD="true"
	fi
	display_msg "${LOG_TYPE}" info "PRIOR_CONFIG_VERSION=${PRIOR_CONFIG_VERSION}, NEW=${NEW_CONFIG_VERSION}"

	if [[ ${OLD} == "true" ]]; then
		display_msg --log warning "Your ${FILE} is an older version."
		MSG="Your    version: ${PRIOR_CONFIG_VERSION}"
		MSG="${MSG}\nCurrent version: ${NEW_CONFIG_VERSION}"
		MSG="${MSG}\nPlease compare your file to the new one in"
		MSG="${MSG}\n${REPO_WEBCONFIG_FILE}"
		MSG="${MSG}\nto see what fields have been added, changed, or removed.\n"
		display_msg --log notice "${MSG}"
		return 1
	fi
	return 0
}


##### Create the json configuration file, either for the local machine or a remote one.
create_website_configuration_file() {

	# If creating for a remote server and there's a local configuration file, use it as the basis.
	if [[ ${DO_REMOTE_WEBSITE} == "true" && -f ${ALLSKY_WEBSITE_CONFIGURATION_FILE} ]]; then
		display_msg --log progress "Creating default '${WEB_CONFIG_FILE}' file based on the local file."
		cp "${ALLSKY_WEBSITE_CONFIGURATION_FILE}" "${WEB_CONFIG_FILE}" || exit_installation 2

		# There are only a few things to update.
		[[ ${DEBUG} == "true" ]] && display_msg --log debug "Calling updateWebsiteConfig.sh"
		# shellcheck disable=SC2086
		"${ALLSKY_SCRIPTS}/updateWebsiteConfig.sh" --verbosity silent ${DEBUG_ARG} \
			--config "${WEB_CONFIG_FILE}" \
			config.imageName		"imageName"		"${IMAGE_NAME}" \
			homePage.onPi			"onPi"			"${ON_PI}"

		MSG="If you want different settings on the remote Website than what's on the local Website,"
		MSG="${MSG}\nedit the remote settings in the WebUI's 'Editor' page."
		display_msg notice "${MSG}"
		return 0
	fi

	display_msg --log progress "Creating default '${WEB_CONFIG_FILE}' file."
	cp "${REPO_WEBCONFIG_FILE}" "${WEB_CONFIG_FILE}" || exit_installation 2

	# Get the array index for the mini-timelapse.
	PARENT="homePage.leftSidebar"
	FIELD="Mini-timelapse"
	INDEX=$(getJSONarrayIndex "${WEB_CONFIG_FILE}" "${PARENT}" "${FIELD}")
	if [[ ${INDEX} -ge 0 ]]; then
		MINI_TLAPSE_DISPLAY="${PARENT}[${INDEX}].display"
		MINI_TLAPSE_URL="${PARENT}[${INDEX}].url"
		if [[ ${TIMELAPSE_MINI_IMAGES:-0} -eq 0 ]]; then
			MINI_TLAPSE_DISPLAY_VALUE="false"
			MINI_TLAPSE_URL_VALUE=""
		else
			MINI_TLAPSE_DISPLAY_VALUE="true"
			if [[ ${DO_REMOTE_WEBSITE} == "true" ]]; then
				MINI_TLAPSE_URL_VALUE="mini-timelapse.mp4"
			else
				#shellcheck disable=SC2153
				MINI_TLAPSE_URL_VALUE="/${IMG_DIR}/mini-timelapse.mp4"
			fi
		fi
	else
		MSG="Unable to update '${FIELD}' in ${ALLSKY_WEBSITE_CONFIGURATION_FILE}; ignoring."
		display_msg --log warning "${MSG}"
		# bogus settings that won't do anything
		MINI_TLAPSE_DISPLAY="x"
		MINI_TLAPSE_URL="x"
		MINI_TLAPSE_DISPLAY_VALUE=""
		MINI_TLAPSE_URL_VALUE=""
	fi

	# Convert latitude and longitude to use N, S, E, W.
	LATITUDE="$(convertLatLong "${LATITUDE}" "latitude")"
	[[ -z ${LATITUDE} ]] && display_msg --log warning "latitude is empty"
	LONGITUDE="$(convertLatLong "${LONGITUDE}" "longitude")"
	[[ -z ${LONGITUDE} ]] && display_msg --log warning "longitude is empty"

	if [[ ${LATITUDE:1,-1} == "S" ]]; then			# last character
		AURORAMAP="south"
	else
		AURORAMAP="north"
	fi

	LOCATION="$(settings ".location")"
	OWNER="$(settings ".owner")"
	CAMERA_MODEL="$(settings ".cameramodel")"
	CAMERA="${CAMERA_TYPE}${CAMERA_MODEL}"
	LENS="$(settings ".lens")"
	COMPUTER="$(sed --quiet -e 's/Raspberry Pi/RPi/' -e '/^Model/ s/.*: // p' /proc/cpuinfo)"

	# These appeard not to be set for one tester, so put an explicit warning in.
	[[ -z ${ALLSKY_VERSION} ]] && display_msg --log warning "AllskyVersion is empty"
	[[ -z ${NEW_WEBSITE_VERSION} ]] && display_msg --log warning "AllskyWebsiteVersion is empty"

	display_msg "${LOG_TYPE}" debug "Calling updateWebsiteConfig.sh"

	# There are some settings we can't determine, like LENS.
	# shellcheck disable=SC2086
	"${ALLSKY_SCRIPTS}/updateWebsiteConfig.sh" --verbosity silent ${DEBUG_ARG} \
		--config "${WEB_CONFIG_FILE}" \
		config.imageName			"imageName"			"${IMAGE_NAME}" \
		config.latitude				"latitude"			"${LATITUDE}" \
		config.longitude			"longitude"			"${LONGITUDE}" \
		config.auroraMap			"auroraMap"			"${AURORAMAP}" \
		config.location				"location"			"${LOCATION}" \
		config.owner				"owner" 			"${OWNER}" \
		config.camera				"camera"			"${CAMERA}" \
		config.lens					"lens"				"${LENS}" \
		config.computer				"computer"			"${COMPUTER}" \
		config.AllskyVersion		"AllskyVersion"		"${ALLSKY_VERSION}" \
		config.AllskyWebsiteVersion	"AllskyWebsiteVersion" "${NEW_WEBSITE_VERSION}" \
		homePage.onPi				"onPi"				"${ON_PI}" \
		${MINI_TLAPSE_DISPLAY}		"mini_display"		"${MINI_TLAPSE_DISPLAY_VALUE}" \
		${MINI_TLAPSE_URL}			"mini_url"			"${MINI_TLAPSE_URL_VALUE}"
}


##### Update the Website version in the config file
update_version_in_config_file()
{
	local CONFIG_FILE="${1}"
	if [[ ${PRIOR_WEBSITE_VERSION} != "${NEW_WEBSITE_VERSION}" ]]; then
		display_msg --log progress "Updating Website version in '${CONFIG_FILE}' to ${NEW_WEBSITE_VERSION}"
		# shellcheck disable=SC2086
		"${ALLSKY_SCRIPTS}/updateWebsiteConfig.sh" --verbosity silent ${DEBUG_ARG} \
			--config "${CONFIG_FILE}" \
			config.AllskyWebsiteVersion		"AllskyWebsiteVersion"		"${NEW_WEBSITE_VERSION}"
	else
		display_msg "${LOG_TYPE}" progress "Website version already at ${NEW_WEBSITE_VERSION} - no need to update."
	fi
}


##### If the user is updating the website, use the prior config file(s).
NEEDS_NEW_CONFIGURATION_FILE="true"

modify_configuration_variables() {

	if [[ ${DEBUG} == "true" ]];then
		display_msg --log debug "modify_configuration_variables(): PRIOR_WEBSITE_TYPE=${PRIOR_WEBSITE_TYPE}"
	fi
	if [[ ${SAVED_PRIOR} == "true" ]]; then
		if [[ ${PRIOR_WEBSITE_TYPE} == "new" ]]; then
			local C="${PRIOR_WEBSITE}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}"
			if [[ -f ${C} ]]; then
				if ! json_pp < "${C}" > /dev/null; then
					MSG="Configuration file '${C} is corrupted.\nFix, then re-run this installation."
					display_msg --log warning "${MSG}"
					exit_installation 1
				fi

				# Check if this is an older configuration file version.
				# If it's old check_for_older_config_file() will display a message so we don't need to.
				if check_for_older_config_file "${C}" ; then
					display_msg --log progress "Restoring prior '${ALLSKY_WEBSITE_CONFIGURATION_NAME}'."
					cp "${C}" "${WEB_CONFIG_FILE}" || exit_installation 1

					update_version_in_config_file "${WEB_CONFIG_FILE}"

					NEEDS_NEW_CONFIGURATION_FILE="false"
				# no "else" needed
				fi
			else
				# This "shouldn't" happen with a new-style website, but in case it does...
				MSG="Prior Website in ${PRIOR_WEBSITE} had no '${ALLSKY_WEBSITE_CONFIGURATION_NAME}'."
				display_msg --log warning "${MSG}"
			fi
		else
			# Old-style Website.
			# It's not worth writing the difficult code to merge the old files into the new.

			MSG="When installation is done you must manually copy the contents of the prior"
			MSG="${MSG}\n   ${PRIOR_WEBSITE}/config.js"
			MSG="${MSG}\nand"
			MSG="${MSG}\n   ${PRIOR_WEBSITE}/virtualsky.json"
			MSG="${MSG}\nfiles into '${ALLSKY_WEBSITE_CONFIGURATION_FILE}'."
			MSG="${MSG}\nCheck the Allsky documentation for the meaning of the MANY new options."
			display_msg --log notice "${MSG}"
		fi
	fi

	if [[ ${NEEDS_NEW_CONFIGURATION_FILE} == "true" ]]; then
		create_website_configuration_file
	fi
}


##### Ask the user if their remote Website is ready for us.
check_if_remote_website_ready()
{
	MSG="Setting up a remote Allsky Website requires that you first:\n"
	MSG="${MSG}\n  1. Have Allsky configured and running the way you want it.\n"
	MSG="${MSG}\n  2. Upload the Allsky Website files to your remote server.\n"
	MSG="${MSG}\n  3. Update 'ftp-settings.sh' using the WebUI's 'Editor' page"
	MSG="${MSG}\n     to point to the remote server.\n"
	MSG="${MSG}\n  4. Enter the URL of the remote Website into the 'Website URL'"
	MSG="${MSG}\n     field in the WebUI's 'Allsky Settings' page,"
	MSG="${MSG}\n     even if you are not displaying your Website on the Allsky Map."
	MSG="${MSG}\n\n\nHave you completed these steps?"
	if ! whiptail --title "${TITLE}" --yesno "${MSG}" 22 80 3>&1 1>&2 2>&3; then
		MSG="\nYou need to manually copy the Allsky Website files to your remote server."
		MSG="${MSG}\nYou can do that by executing:"
		MSG="${MSG}\n   cd /tmp"
		MSG="${MSG}\n   git clone ${GITHUB_ROOT}/allsky-website.git allsky"
		MSG="${MSG}\nThen upload the 'allsky' directory and all it's contents to the root of your server."
		MSG="${MSG}\n\nOnce you have finished that, re-run this installation.\n"
		display_msg info "${MSG}"
		display_msg --logonly info "User stopped remote installation - not ready."
		exit_installation 1
	fi
}

##### Help with a remote Website installation, then exit
do_remote_website() {
	# Make sure things really are set up, despite what the user said.

# TODO: not all protocols require REMOTE_HOST
	OK="true"
	if [[ -z ${REMOTE_HOST} ]]; then
		MSG="The 'REMOTE_HOST' must be set in 'ftp-settings.sh'\n"
		MSG="${MSG}in order to do a remote Website installation.\n"
		MSG="${MSG}Please set it, the password, and other information, then re-run this installation."
		display_msg error "${MSG}"
		display_msg --logonly error "REMOTE_HOST not set."
		OK="false"
	fi
	WEBURL="$( settings ".websiteurl" )"
	if [[ -z ${WEBURL} ]]; then
		MSG="The 'Website URL' setting must be defined in the WebUI\n"
		MSG="${MSG}in order to do a remote Website installation.\n"
		MSG="${MSG}Please set it then re-run this installation."
		display_msg error "${MSG}"
		display_msg --logonly error "Website URL not set."
		OK="false"
	fi

	[[ ${OK} == "false" ]] && exit_installation 1

	TEST_FILE_NAME="Allsky_upload_test.txt"
	TEST_FILE="/tmp/${TEST_FILE_NAME}"
	display_msg --log progress "Testing upload to remote Website."
	display_msg info "  When done you can remove '${TEST_FILE_NAME}' from your remote server."
	echo "This is a test file and can be removed." > "${TEST_FILE}"
	if ! RET="$("${ALLSKY_SCRIPTS}/upload.sh" \
			"${TEST_FILE}" \
			"${IMAGE_DIR}" \
			"${TEST_FILE_NAME}" \
			"UploadTest")" ; then
		MSG="Unable to upload a test file.\n"
		display_msg --log error "${MSG}"
		display_msg --log info "${RET}"
		OK="false"
	fi
	rm -f "${TEST_FILE}"

	[[ ${OK} == "false" ]] && exit_installation 1

	# TODO: AUTOMATE: do a git clone into a temp directory, then copy all the files up.
	# TODO: Will also need to change the messages above.

	# Tell the remote server to check the sanity of the Website.
	# This also creates some necessary directories.
	display_msg --log progress "Sanity checking remote Website."
	[[ ${WEBURL: -1} != "/" ]] && WEBURL="${WEBURL}/"
	if [[ ${DEBUG} == "true" ]]; then
		D="&debug"
	else
		D=""
	fi
	X="$( curl --show-error --silent "${WEBURL}?check=1${D}" )"
	if ! echo "${X}" | grep --silent "^SUCCESS$" ; then
		MSG="Sanity check of remote Website (${WEBURL}) failed."
		MSG2="${MSG}\nYou will need to manually fix."
		display_msg warning "${MSG}${MSG2}"
		display_msg --logonly warning "${MSG}"
		echo -e "${X}"
	fi

	if [[ -f ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE} ]]; then
		# The user is upgrading a new-style remote Website.
		display_msg --log progress "You should continue to configure your remote Allsky Website via the WebUI."

		update_version_in_config_file "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}"

		# Check if this is an older configuration file version.
		check_for_older_config_file "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}"
	else
		# Don't know if the user is upgrading an old-style remote website,
		# or they don't even have a remote website.

		MSG="You can keep a copy of your remote Website's configuration file on your Pi"
		MSG="${MSG}\nso you can easily edit it in the WebUI and have it automatically uploaded."
		MSG="${MSG}\n** This is the recommended way of making changes to the configuration **."
		MSG="${MSG}\n\nWould you like to do that?"
		if (whiptail --title "${TITLE}" --yesno "${MSG}" 15 60 3>&1 1>&2 2>&3); then
			create_website_configuration_file

			MSG="\nTo edit the remote configuration file, go to the 'Editor' page in the WebUI\n"
			MSG="${MSG}and select '${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_NAME} (remote Allsky Website)'.\n"
			display_msg info "${MSG}"
			display_msg --logonly info "User will use local copy of remote Website config file."
		else
			# upload_data_json_file needs the remote configuration file to exist or else it thinks
			# there isn't a remote site.
			(
				echo "Do NOT remove or change this file."
				echo "It indicates there is a remote Allsky Website although it's not configured from the Pi."
			) > "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}"

			MSG="You need to manually copy '${REPO_WEBCONFIG_FILE}'"
			# ALLSKY_WEBSITE_CONFIGURATION_NAME is what it's called on the remote server
			MSG="${MSG}to your remote server and rename it to '${ALLSKY_WEBSITE_CONFIGURATION_NAME}',"
			MSG="${MSG}then modify it on yuor server."
			display_msg warning "${MSG}"
			display_msg --logonly info "User will NOT use local copy of remote Website config file."
		fi
	fi

	upload_data_json_file "remote" || exit_installation 2

	display_msg --log progress "The Pi portion of the Remote Allsky Website Installation is complete.\n"

	exit_installation 0
}


##### Handle an update to the Website, then exit.
do_update() {
	# This isn't a true "installation" so don't log anything.
	if [[ ! -d ${ALLSKY_WEBSITE} ]]; then
		display_msg error " --update specified but no existing website found at '${ALLSKY_WEBSITE}'."
		exit 2
	fi

	modify_locations
	upload_data_json_file "local"

	display_msg progress "\nUpdate complete!\n"
	exit 0
}


####
# See if a prior Allsky Website exists; if so, save its location and type.
does_prior_Allsky_Website_exist()
{
	if [[ -d ${ALLSKY_WEBSITE} ]]; then
		# Has a older version of the new-style website.
		PRIOR_WEBSITE="${ALLSKY_WEBSITE}"
		PRIOR_WEBSITE_TYPE="new"

	elif [[ -d ${OLD_WEBUI_LOCATION}/allsky ]]; then
		# Has an old-style website.  It is NOT moved.
		PRIOR_WEBSITE="${OLD_WEBUI_LOCATION}/allsky"
		PRIOR_WEBSITE_TYPE="old"

	else
		# No prior website
		PRIOR_WEBSITE=""
		PRIOR_WEBSITE_TYPE=""
	fi

	if [[ -n ${PRIOR_WEBSITE} ]]; then
		# Location we'll move the prior website to.
		PRIOR_WEBSITE_OLD="${PRIOR_WEBSITE}-OLD"
		if [[ ${PRIOR_WEBSITE_TYPE} == "new" ]]; then
			# git will fail if the new directory already exists and has something in it,
			# so rename it.
			if [[ -d ${PRIOR_WEBSITE_OLD} ]]; then
				MSG="A saved copy of a prior Allsky Website already exists in"
				MSG="${MSG}\n     ${PRIOR_WEBSITE_OLD}"
				MSG="${MSG}\n\nCan only have one saved prior version at a time."
				display_msg --log error "${MSG}"
				display_msg info "\nRemove or rename that directory and re-run the installation.\n"
				exit_installation 3
			fi
		fi
	else
		PRIOR_WEBSITE_OLD=""
	fi
}


##### See if they are upgrading the website, and if so, if the prior website was an "old" one.
# "old" means in the old location and with the old configuration files.
save_prior_website() {
	if [[ ${PRIOR_WEBSITE_TYPE} == "new" ]]; then
		display_msg --log progress "Moving prior website to '${PRIOR_WEBSITE_OLD}'."
		if ! mv "${ALLSKY_WEBSITE}" "${PRIOR_WEBSITE_OLD}" ; then
			display_msg --log error "Unable to move prior website."
			exit_installation 3
		fi
		# Now that we've renamed the prior website, update ${PRIOR_WEBSITE}
		PRIOR_WEBSITE="${PRIOR_WEBSITE_OLD}"
		SAVED_PRIOR="true"

	elif [[ ${PRIOR_WEBSITE_TYPE} == "old" ]]; then
		SAVED_PRIOR="true"
		# Leave the old-style Website where it is since it will no longer be used.

	else
		SAVED_PRIOR="false"
	fi
}


##### Download the Allsky Website files.
download_Allsky_Website() {
	local B=""

	# Only display if not the default.
	if [[ ${BRANCH} != "${GITHUB_MAIN_BRANCH}" ]]; then
		B=" from ${BRANCH} branch"
	fi

	display_msg --log progress "Downloading Allsky Website files${B} into ${ALLSKY_WEBSITE}."
	TMP="/tmp/git.install.tmp"
	# shellcheck disable=SC2086
	git clone -b ${BRANCH} "${GITHUB_ROOT}/allsky-website.git" "${ALLSKY_WEBSITE}" > "${TMP}" 2>&1
	if [[ $? -ne 0 ]]; then
		display_msg --log error "Unable to get Allsky Website files from git."
		display_msg --logonly info "$( cat "${TMP}" )"
		cat "${TMP}"
		exit_installation 4
	fi

	# If running non-production branch, save the branch.
	[[ ${BRANCH} != "${GITHUB_MAIN_BRANCH}" ]] && echo "${BRANCH}" > "${ALLSKY_WEBSITE_BRANCH_FILE}"
}


##### Restore prior files.
restore_prior_files() {
	[[ ${SAVED_PRIOR} == "false" ]] && return

	# Each directory will have zero or more images.
	# Make sure we do NOT mv any .php files.

	D="${PRIOR_WEBSITE}/videos/thumbnails"
	[[ -d ${D} ]] && mv "${D}"   "${ALLSKY_WEBSITE}/videos"
	count=$(find "${PRIOR_WEBSITE}/videos" -maxdepth 1 -name 'allsky-*' | wc -l)
	if [[ ${count} -ge 1 ]]; then
		display_msg --log progress "Restoring prior videos."
		mv "${PRIOR_WEBSITE}"/videos/allsky-*   "${ALLSKY_WEBSITE}/videos"
	else
		display_msg "${LOG_TYPE}" info "No prior vidoes to restore."
	fi

	D="${PRIOR_WEBSITE}/keograms/thumbnails"
	[[ -d ${D} ]] && mv "${D}"   "${ALLSKY_WEBSITE}/keograms"
	count=$(find "${PRIOR_WEBSITE}/keograms" -maxdepth 1 -name 'keogram-*' | wc -l)
	if [[ ${count} -ge 1 ]]; then
		display_msg progress "Restoring prior keograms."
		mv "${PRIOR_WEBSITE}"/keograms/keogram-*   "${ALLSKY_WEBSITE}/keograms"
	else
		display_msg "${LOG_TYPE}" info "No prior keograms to restore."
	fi

	D="${PRIOR_WEBSITE}/startrails/thumbnails"
	[[ -d ${D} ]] && mv "${D}"   "${ALLSKY_WEBSITE}/startrails"
	count=$(find "${PRIOR_WEBSITE}/startrails" -maxdepth 1 -name 'startrails-*' | wc -l)
	if [[ ${count} -ge 1 ]]; then
		display_msg progress "Restoring prior startrails."
		mv "${PRIOR_WEBSITE}"/startrails/startrails-*   "${ALLSKY_WEBSITE}/startrails"
	else
		display_msg "${LOG_TYPE}" info "No prior startrails to restore."
	fi

	D="${PRIOR_WEBSITE}/myImages"
	if [[ -d ${D} ]]; then
		count=$(find "${D}" | wc -l)
		if [[ ${count} -gt 1 ]]; then
			display_msg --log progress "Restoring prior 'myImages' directory."
			mv "${D}"   "${ALLSKY_WEBSITE}"
		fi
	else
		display_msg "${LOG_TYPE}" info "No prior 'myImages' to restore."
	fi

	A="analyticsTracking.js"
	D="${PRIOR_WEBSITE}/${A}"
	if [[ -f ${D} ]]; then
		if ! cmp --silent "${D}" "${A}" ; then
			display_msg progress "Restoring prior '${A}'."
			mv "${D}" "${ALLSKY_WEBSITE}"
		fi
	else
		display_msg "${LOG_TYPE}" info "No prior '${A}' to restore."
	fi
}


##### The webserver needs to be able to update the configuration file and create thumbnails.
set_permissions()
{
	display_msg --log progress "Setting ownership and permissions."
	sudo chown -R "${ALLSKY_OWNER}:${WEBSERVER_GROUP}" "${ALLSKY_WEBSITE}"
	find "${ALLSKY_WEBSITE}/" -type f -exec chmod 664 {} \;
	find "${ALLSKY_WEBSITE}/" -type d -exec chmod 775 {} \;
}

exit_installation()
{
	[[ -z ${FUNCTION} ]] && display_msg "${LOG_TYPE}" info "\nENDING INSTALLATON AT $(date).\n"
	local E="${1}"
	[[ ${E} -ge 0 ]] && exit "${E}"
}


####################### main part of program

# Check arguments
OK="true"
HELP="false"
DEBUG="false"
DEBUG_ARG=""
LOG_TYPE="--logonly"	# by default we only log some messages but don't display
USER_SPECIFIED_BRANCH=""
UPDATE="false"
FUNCTION=""
DO_REMOTE_WEBSITE="false"
while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG}" in
		--help)
			HELP="true"
			;;
		--debug)
			DEBUG="true"
			DEBUG_ARG="${ARG}"		# we can pass this to other scripts
			LOG_TYPE="--log"
			;;
		--branch)
			USER_SPECIFIED_BRANCH="${2}"
			if [[ ${USER_SPECIFIED_BRANCH} == "" ]]; then
				OK="false"
			else
				shift	# skip over BRANCH
			fi
			;;
		--remote)
			DO_REMOTE_WEBSITE="true"
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

[[ -z ${FUNCTION} && ${UPDATE} == "false" ]] && display_msg "${LOG_TYPE}" info "STARTING INSTALLATON AT $(date).\n"

[[ ${HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" ]] && usage_and_exit 1


# Make sure the settings file isn't corrupted.
if ! json_pp < "${SETTINGS_FILE}" > /dev/null; then
	display_msg --log error "Settings file '${SETTINGS_FILE} is corrupted.\nFix, then re-run this installation."
	exit_installation 1
fi

LATITUDE="$(settings ".latitude")"
LONGITUDE="$(settings ".longitude")"
if [[ -z ${LATITUDE} || -z ${LONGITUDE} ]]; then
	MSG="Latitude and Longitude must be set in the WebUI before the Allsky Website\ncan be installed."
	display_msg --log error "${MSG}"
	exit_installation 1
fi


NEW_WEBSITE_VERSION=""			# version we're upgrading to

##### See if there's a prior local Website and if so, set some variables.
[[ ${DO_REMOTE_WEBSITE} == "false" ]] && does_prior_Allsky_Website_exist

##### Get the current and new Website versions taking branch into account.
get_versions_and_branches

##### Make sure the remote site is ready for us.  If not ready the function exits.
[[ ${DO_REMOTE_WEBSITE} == "true" ]] && check_if_remote_website_ready

##### Display the welcome header.
[[ -z ${FUNCTION} ]] && do_initial_heading

##### Make sure the new version really is new.
check_versions

##### Set some variables that are used by several functions.
set_configuration_file_variables

##### Executes the specified function, if any, and exits.
[[ -n ${FUNCTION} ]] && do_function "${FUNCTION}"

##### Handle remote websites
[[ ${DO_REMOTE_WEBSITE} == "true" ]] && do_remote_website		# does not return



########################    Everything else is for local install


# This should only be done when directed to by the local Alsky Website
# when it finds a problem.
[ "${UPDATE}" = "true" ]  && do_update		# does not return

##### Handle prior website, if any
save_prior_website

##### Download new Allsky Website files
download_Allsky_Website

modify_locations
modify_configuration_variables
upload_data_json_file "local" || exit_installation 1
restore_prior_files

# Create any directories not created above.
mkdir -p \
	"${ALLSKY_WEBSITE}/startrails/thumbnails" \
	"${ALLSKY_WEBSITE}/keograms/thumbnails" \
	"${ALLSKY_WEBSITE}/videos/thumbnails" \
	"${ALLSKY_WEBSITE}/myImages"

##### Set permissions on files and directories
set_permissions


echo -en "${GREEN}"
display_header "Installation is complete"
echo -en "${NC}"


if [[ ${SAVED_PRIOR} == "true" ]]; then
	MSG="\nYour prior website is in '${PRIOR_WEBSITE}'."
	MSG="${MSG}\nAll your prior videos, keograms, and startrails were MOVED to the updated website."
	MSG="${MSG}\nAfter you are convinced everything is working, remove your prior version.\n"
	display_msg --log info "${MSG}"
fi

if [[ ${NEEDS_NEW_CONFIGURATION_FILE} == "true" ]]; then
	MSG="\nBefore using the website you must edit its configuration by clicking on"
	MSG="${MSG}\nthe 'Editor' link in the WebUI, then select the"
	MSG="${MSG}\n    ${ALLSKY_WEBSITE_CONFIGURATION_NAME} (local Allsky Website)"
	MSG="${MSG}\nentry.  See the 'Installation --> Allsky Website' documentation"
	MSG="${MSG}\npage for more information.\n"
	display_msg --log info "${MSG}"
fi

echo
exit_installation 0
