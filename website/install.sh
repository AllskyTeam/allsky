#!/bin/bash

[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$(realpath "$(dirname "${BASH_ARGV0}")"/..)"
ME="$(basename "${BASH_ARGV0}")"

#shellcheck disable=SC2086 source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit ${ALLSKY_ERROR_STOP}
#shellcheck disable=SC2086 source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh" 				|| exit ${ALLSKY_ERROR_STOP}
#shellcheck disable=SC2086 source-path=scripts
source "${ALLSKY_SCRIPTS}/installUpgradeFunctions.sh"	|| exit ${ALLSKY_ERROR_STOP}

if [[ ${EUID} -eq 0 ]]; then
	display_msg error "This script must NOT be run as root, do NOT use 'sudo'."
	exit 1
fi

# Make sure the settings file isn't corrupted.
if ! json_pp < "${SETTINGS_FILE}" > /dev/null; then
	display_msg error "Settings file '${SETTINGS_FILE} is corrupted.\nFix, then re-run this installation."
	exit 1
fi

#shellcheck disable=SC2086,SC1091		# file doesn't exist in GitHub
source "${ALLSKY_CONFIG}/config.sh"			|| exit ${ALLSKY_ERROR_STOP}
#shellcheck disable=SC2086,SC1091		# file doesn't exist in GitHub
source "${ALLSKY_CONFIG}/ftp-settings.sh"	|| exit ${ALLSKY_ERROR_STOP}

LATITUDE="$(settings ".latitude")"
LONGITUDE="$(settings ".longitude")"
if [[ -z ${LATITUDE} || -z ${LONGITUDE} ]]; then
	display_msg error "Latitude and Longitude must be set in the WebUI before the Allsky Website\ncan be installed."
	exit 1
fi

TITLE="Allsky Website Installer"


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
		exit 1
	fi
fi

	##### Display the welcome header
	local U2=""
	local B=""
	if [[ ${REMOTE_WEBSITE} == "true" ]]; then
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
	# shellcheck disable=SC2086
	exit ${RET}
}


##### Get the current and new versions, taking branches into account.
# We haven't downloaded the new version yet so we need to get its version from Git.
GOT_VERSIONS_AND_BRANCHES="false"
get_versions_and_branches()
{
	GOT_VERSIONS_AND_BRANCHES="true"

	# All new versions have a "versions" file.
	# If the user specified a branch use that, otherwise see if they are running
	# a non-production branch.

	GITHUB_MAIN_BRANCH_NEW_VERSION="$(get_Git_version "${GITHUB_MAIN_BRANCH}" "allsky-website")"
	if [[ -z ${GITHUB_MAIN_BRANCH_NEW_VERSION} ]]; then
		display_msg warning "Unable to determine newest GitHub version."
		GITHUB_MAIN_BRANCH_NEW_VERSION="Unknown"
	fi

	if [[ ${REMOTE_WEBSITE} == "true" ]]; then
		if [[ -n ${USER_SPECIFIED_BRANCH} && ${USER_SPECIFIED_BRANCH} != "${GITHUB_MAIN_BRANCH}" ]]; then
			GITHUB_OTHER_BRANCH_NEW_VERSION="$(get_Git_version "${USER_SPECIFIED_BRANCH}" "allsky-website")"
			if [[ -n ${GITHUB_OTHER_BRANCH_NEW_VERSION} ]]; then
				NEW_WEBSITE_VERSION="${GITHUB_OTHER_BRANCH_NEW_VERSION}"
			else
				NEW_WEBSITE_VERSION="${GITHUB_MAIN_BRANCH_NEW_VERSION}"
			fi
		fi
		PRIOR_WEBSITE_VERSION="$(settings .config.AllskyWebsiteVersion "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}")"

		# TODO: Currently no way to determine the branch of a remote website.
		# Should put in the configuration file.
		return
	fi

	if [[ ${PRIOR_WEBSITE_TYPE} == "new" ]]; then
		PRIOR_WEBSITE_BRANCH="$(get_branch "${PRIOR_WEBSITE}/" )"
	else
		PRIOR_WEBSITE_BRANCH=""
	fi

	if [[ -n ${USER_SPECIFIED_BRANCH} ]]; then
		BRANCH="${USER_SPECIFIED_BRANCH}"
	else
		# User didn't specify a branch (most common usage).
		# See if the user is running a non-production branch.
		# Older website types didn't have branches.
		BRANCH="${PRIOR_WEBSITE_BRANCH:-${GITHUB_MAIN_BRANCH}}"
	fi

	if [[ ${BRANCH} != "${GITHUB_MAIN_BRANCH}" ]]; then
		# See if the branch still exists in GitHub.
		GITHUB_OTHER_BRANCH_NEW_VERSION="$(get_Git_version "${BRANCH}" "allsky-website")"
		if [[ -z ${GITHUB_OTHER_BRANCH_NEW_VERSION} ]]; then
			MSG="GitHub branch '${BRANCH}' no longer exists;"
			MSG="${MSG} ; using '${GITHUB_MAIN_BRANCH}' branch instead."
			display_msg info "${MSG}"

			GITHUB_OTHER_BRANCH_NEW_VERSION=""
			NEW_WEBSITE_BRANCH="${GITHUB_MAIN_BRANCH}"
			NEW_WEBSITE_VERSION="${GITHUB_MAIN_BRANCH_NEW_VERSION}"
		else
			NEW_WEBSITE_VERSION="${GITHUB_OTHER_BRANCH_NEW_VERSION}"
			NEW_WEBSITE_BRANCH="${BRANCH}"
		fi
	else
		# Using default branch - most common usage.
		GITHUB_OTHER_BRANCH_NEW_VERSION=""
		NEW_WEBSITE_BRANCH="${GITHUB_MAIN_BRANCH}"
		NEW_WEBSITE_VERSION="${GITHUB_MAIN_BRANCH_NEW_VERSION}"
	fi

	if [[ ${PRIOR_WEBSITE_TYPE} == "new" ]]; then
		PRIOR_WEBSITE_VERSION="$(get_version "${PRIOR_WEBSITE}/" )"
	else
		PRIOR_WEBSITE_VERSION=""
	fi

	if [[ ${DEBUG} == "true" ]]; then
		MSG=""
		MSG="${MSG}\n\tCurrent version: ${PRIOR_WEBSITE_VERSION:-Unknown}"
		MSG="${MSG}\n\tNew     version: ${NEW_WEBSITE_VERSION}"
		if [[ ${BRANCH} != "${GITHUB_MAIN_BRANCH}" ]]; then
			MSG="${MSG}\n\tCurrent branch : ${PRIOR_WEBSITE_BRANCH:-${GITHUB_MAIN_BRANCH}}"
			MSG="${MSG}\n\tNew     branch : ${NEW_WEBSITE_BRANCH}"
		fi
		display_msg debug "${MSG}"
	fi
}


##### Make sure the new version is at least as new as the current version,
##### i.e., we aren't installing an old version.
check_versions() {
	[[ ${GOT_VERSIONS_AND_BRANCHES} == "false" ]] && get_versions_and_branches

	local CHECK_BRANCH="false"

	if [[ ${REMOTE_WEBSITE} == "false" && ${PRIOR_WEBSITE_TYPE} == "new" && -n ${PRIOR_WEBSITE_BRANCH} ]]; then
		CHECK_BRANCH="true"
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
				MSG="${MSG}\nNot continuing with ${USER_SPECIFIED_BRANCH} branch."
				display_msg info "${MSG}"
				exit 0
			fi
			MSG="Upgrading to '${USER_SPECIFIED_BRANCH}' branch version ${NEW_WEBSITE_VERSION}"
			display_msg --log info "${MSG}"

		else
			MSG="${MSG}\n\nContinue with the '${PRIOR_WEBSITE_BRANCH}' branch?"
			if whiptail --title "${TITLE}" --yesno "${MSG}" 18 80 3>&1 1>&2 2>&3; then
				display_msg --log info "Remaining on '${PRIOR_WEBSITE_BRANCH}' branch."
			else
				MSG="\nInstallation aborted."
				MSG="${MSG}\nIf you want to upgrade to another branch, re-run the installation adding"
				MSG="${MSG}\n\t--branch BRANCH"
				MSG="${MSG}\nto the command line, where 'BRANCH' is the branch you want."
				MSG="${MSG}\nThe default branch is '${GITHUB_MAIN_BRANCH}'.\n"
				display_msg info "${MSG}"
				exit 0
			fi
		fi
	fi

	if [[ -n ${NEW_WEBSITE_VERSION} && -n ${PRIOR_WEBSITE_VERSION} && \
		     ${NEW_WEBSITE_VERSION}   <  "${PRIOR_WEBSITE_VERSION}" ]]; then
		# Unless the version in GitHub is screwed up (i.e., newer one sorts after prior one),
		# we should only get here if the user is r
		MSG="WARNING: You are trying to install an older version of the Allsky Website!\n"

		# If they are changing branches, display both.
		local PB=""		# prior branch
		local NB=""		# new branch
		if [[ ${PRIOR_WEBSITE_BRANCH} != ${NEW_WEBSITE_BRANCH} ]]; then
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
			display_msg info "${MSG}"
			exit 0
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
		exit 1
	fi

	${FUNCTION} "$@"
	exit $?
}


##### Modify placeholders.
modify_locations() {
	display_msg progress "Modifying locations in web files."
	sed -i -e "s;XX_ALLSKY_CONFIG_XX;${ALLSKY_CONFIG};" "${ALLSKY_WEBSITE}/functions.php"
}


##### Create and upload a new data.json file and files needed to display settings.
upload_data_json_file() {
	display_msg progress "Uploading initial files to remote Website."
	OUTPUT="$("${ALLSKY_SCRIPTS}/postData.sh" --allFiles 2>&1)"
	if [[ $? -ne 0 || ! -f ${ALLSKY_WEBSITE}/data.json ]]; then
		MSG="Unable to create new 'data.json' file:"
		MSG="${MSG}\n${OUTPUT}"
		MSG="${MSG}\nMake sure 'REMOTE_HOST' is set to a valid server in 'ftp-settings.sh',"
		MSG="${MSG}\nor to '', then run ${ALLSKY_SCRIPTS}/postData.sh to create a 'data.json' file."
		display_msg error "${MSG}"
	fi
}


##### Set up the location where the website configuration file will go.
WEB_CONFIG_FILE=""
IMAGE_NAME=""
ON_PI=""

set_configuration_file_variables() {
	[[ -z ${FUNCTION} ]] && display_msg progress "Setting Website variables."
	if [[ ${REMOTE_WEBSITE} == "true" ]]; then
		WEB_CONFIG_FILE="${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}"
		IMAGE_NAME="${FULL_FILENAME}"
		ON_PI="false"
	else
		WEB_CONFIG_FILE="${ALLSKY_WEBSITE_CONFIGURATION_FILE}"
		IMAGE_NAME="/${IMG_DIR}/${FULL_FILENAME}"
		ON_PI="true"
	fi
}


##### # Check if this is an older configuration file.
check_for_older_config_file() {
	FILE="${1}"

	OLD="false"
	PRIOR_CONFIG_VERSION="$(jq .ConfigVersion "${FILE}")"
	if [[ ${PRIOR_CONFIG_VERSION} == "null" ]]; then
		PRIOR_CONFIG_VERSION="** Unknown **"
		OLD="true"
	else
		NEW_CONFIG_VERSION="$(jq .ConfigVersion "${REPO_WEBCONFIG_FILE}")"
		[[ ${PRIOR_CONFIG_VERSION} < "${NEW_CONFIG_VERSION}" ]] && OLD="true"
	fi

	if [[ ${OLD} == "true" ]]; then
		display_msg warning "Your ${FILE} is an older version."
		MSG="Your    version: ${PRIOR_CONFIG_VERSION}"
		MSG="${MSG}\nCurrent version: ${NEW_CONFIG_VERSION}"
		MSG="${MSG}\nPlease compare your file to the new one in"
		MSG="${MSG}\n${REPO_WEBCONFIG_FILE}"
		MSG="${MSG}\nto see what fields have been added, changed, or removed.\n"
		display_msg notice "${MSG}"
	fi
}


##### Create the json configuration file, either for the local machine or a remote one.
create_website_configuration_file() {

	# If creating for a remote server and there's a local configuration file, use it as the basis.
	if [[ ${REMOTE_WEBSITE} == "true" && -f ${ALLSKY_WEBSITE_CONFIGURATION_FILE} ]]; then
		display_msg progress "Creating default '${WEB_CONFIG_FILE}' file based on the local file."
		cp "${ALLSKY_WEBSITE_CONFIGURATION_FILE}" "${WEB_CONFIG_FILE}" || exit 2

		# There are only a few things to update.
		[[ ${DEBUG} == "true" ]] && display_msg debug "Calling updateWebsiteConfig.sh"
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

	display_msg progress "Creating default '${WEB_CONFIG_FILE}' file."
	cp "${REPO_WEBCONFIG_FILE}" "${WEB_CONFIG_FILE}" || exit 2

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
			if [[ ${REMOTE_WEBSITE} == "true" ]]; then
				MINI_TLAPSE_URL_VALUE="mini-timelapse.mp4"
			else
				MINI_TLAPSE_URL_VALUE="/${IMG_DIR}/mini-timelapse.mp4"
			fi
		fi
	else
		display_msg warning "Unable to update '${FIELD}' in ${ALLSKY_WEBSITE_CONFIGURATION_FILE}; ignoring."
		# bogus settings that won't do anything
		MINI_TLAPSE_DISPLAY="x"
		MINI_TLAPSE_URL="x"
		MINI_TLAPSE_DISPLAY_VALUE=""
		MINI_TLAPSE_URL_VALUE=""
	fi

	# Convert latitude and longitude to use N, S, E, W.
	LATITUDE="$(convertLatLong "${LATITUDE}" "latitude")"
	LONGITUDE="$(convertLatLong "${LONGITUDE}" "longitude")"

	if [[ ${LATITUDE:1,-1} == "S" ]]; then			# last character
		AURORAMAP="south"
	else
		AURORAMAP="north"
	fi

	LOCATION="$(settings ".location")"
	OWNER="$(settings ".owner")"
	CAMERA_MODEL="$(settings ".cameraModel")"
	if [[ ${CAMERA_MODEL} == "null" ]]; then
		CAMERA_MODEL=""
	else
		CAMERA_MODEL=" ${CAMERA_MODEL}"		# adds a space
	fi
	CAMERA="${CAMERA_TYPE}${CAMERA_MODEL}"
	LENS="$(settings ".lens")"
	COMPUTER="$(sed --quiet -e 's/Raspberry Pi/RPi/' -e '/^Model/ s/.*: // p' /proc/cpuinfo)"

	# There are some settings we can't determine, like LENS.
	[[ ${DEBUG} == "true" ]] && display_msg debug "Calling updateWebsiteConfig.sh"
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
	display_msg progress "Updating Website version in config file to ${NEW_WEBSITE_VERSION}"
	# shellcheck disable=SC2086
	"${ALLSKY_SCRIPTS}/updateWebsiteConfig.sh" --verbosity silent ${DEBUG_ARG} \
		--config "${CONFIG_FILE}" \
		config.AllskyWebsiteVersion		"AllskyWebsiteVersion"		"${NEW_WEBSITE_VERSION}"
}


##### If the user is updating the website, use the prior config file(s).
NEEDS_NEW_CONFIGURATION_FILE="true"

modify_configuration_variables() {

	if [[ ${DEBUG} == "true" ]];then
		display_msg debug "modify_configuration_variables(): PRIOR_WEBSITE_TYPE = ${PRIOR_WEBSITE_TYPE}"
	fi
	if [[ ${SAVED_PRIOR} == "true" ]]; then
		if [[ ${PRIOR_WEBSITE_TYPE} == "new" ]]; then
			local C="${PRIOR_WEBSITE}/${ALLSKY_WEBSITE_CONFIGURATION_NAME}"
			if [[ -f ${C} ]]; then
				display_msg progress "Restoring prior '${ALLSKY_WEBSITE_CONFIGURATION_NAME}'."
				if ! json_pp < "${C}" > /dev/null; then
					display_msg warning "Configuration file '${C} is corrupted.\nFix, then re-run this installation."
					exit 1
				fi
				cp "${C}" "${WEB_CONFIG_FILE}" || exit 1

				update_version_in_config_file "${WEB_CONFIG_FILE}"

				# Check if this is an older configuration file.
				check_for_older_config_file "${WEB_CONFIG_FILE}"

				NEEDS_NEW_CONFIGURATION_FILE="false"
			else
				# This "shouldn't" happen with a new-style website, but in case it does...
				MSG="Prior Website in ${PRIOR_WEBSITE} had no '${ALLSKY_WEBSITE_CONFIGURATION_NAME}'."
				display_msg warning "${MSG}"
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
			display_msg notice "${MSG}"
		fi
	fi

	if [[ ${NEEDS_NEW_CONFIGURATION_FILE} == "true" ]]; then
		create_website_configuration_file
	fi
}


##### Help with a remote website installation, then exit
do_remote_website() {
	MSG="Setting up a remote Allsky Website requires that you first:"
	MSG="${MSG}\n  1. Upload the Allsky Website files to your remote server."
	MSG="${MSG}\n  2. Update 'ftp-settings.sh' using the WebUI's 'Editor' page"
	MSG="${MSG}\n     to point to the remote server."
	MSG="${MSG}\n  3. Enter the URL of the remote Website into the 'Website URL'"
	MSG="${MSG}\n     field in the WebUI's 'Allsky Settings' page,"
	MSG="${MSG}\n     even if you are not displaying your Website on the Allsky Map."
	MSG="${MSG}\n\nHave you completed these steps?"
	if ! whiptail --title "${TITLE}" --yesno "${MSG}" 15 80 3>&1 1>&2 2>&3; then
		MSG="You need to manually copy the Allsky Website files to your remote server."
		MSG="${MSG}\nYou can do that by executing:"
		MSG="${MSG}\n   cd /tmp"
		MSG="${MSG}\n   git clone ${GITHUB_ROOT}/allsky-website.git allsky"
		MSG="${MSG}\nThen upload the 'allsky' directory and all it's contents to the root of your server."
		MSG="${MSG}\n\nOnce you have finished that, re-run this installation."
		display_msg warning "${MSG}"
		exit 1
	fi

	# Make sure they REALLY did the above.
# TODO: not all protocols require REMOTE_HOST
	OK="true"
	if [[ -z ${REMOTE_HOST} ]]; then
		MSG="The 'REMOTE_HOST' must be set in 'ftp-settings.sh'\n"
		MSG="${MSG}in order to do a remote Website installation.\n"
		MSG="${MSG}Please set it, the password, and other information, then re-run this installation."
		display_msg error "${MSG}"
		OK="false"
	fi
	WEBURL="$(settings ".websiteurl")"
	if [[ -z ${WEBURL} || ${WEBURL} == "null" ]]; then
		MSG="The 'Website URL' setting must be defined in the WebUI\n"
		MSG="${MSG}in order to do a remote Website installation.\n"
		MSG="${MSG}Please set it then re-run this installation."
		display_msg error "${MSG}"
		OK="false"
	fi

	TEST_FILE_NAME="Allsky_upload_test.txt"
	TEST_FILE="/tmp/${TEST_FILE_NAME}"
	display_msg progress "Testing upload to remote Website."
	display_msg info "When done you can remove '${TEST_FILE_NAME}' from your remote server."
	echo "This is a test file and can be removed." > "${TEST_FILE}"
	RET="$("${ALLSKY_SCRIPTS}/upload.sh" "${TEST_FILE}" "${IMAGE_DIR}" "${TEST_FILE_NAME}" "UploadTest")"
	if [[ $? -eq 0 ]]; then
		rm -f "${TEST_FILE}"
	else
		MSG="Unable to upload a test file.\n"
		display_msg error "${MSG}"
		display_msg info "${RET}"
		OK="false"
	fi

	[[ ${OK} == "false" ]] && exit 1

	# TODO: AUTOMATE: do a git clone into a temp directory, then copy all the files up.
	# TODO: Will also need to change the messages above.

	# Tell the remote server to check the sanity of the Website.
	# This also creates some necessary directories.
	display_msg progress "Sanity checking remote Website."
	[[ ${WEBURL: -1} != "/" ]] && WEBURL="${WEBURL}/"
	if [[ ${DEBUG} == "true" ]]; then
		D="&debug"
	else
		D=""
	fi
	X="$(curl --show-error --silent "${WEBURL}?check=1${D}")"
	if ! echo "${X}" | grep --silent "^SUCCESS$" ; then
		MSG="Sanity check of remote Website (${WEBURL}) failed."
		MSG="${MSG}\nYou will need to manually fix."
		display_msg warning "${MSG}"
		echo -e "${X}"
	fi

	upload_data_json_file

	if [[ -f ${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE} ]]; then
		# The user is upgrading a new-style remote Website.
		display_msg progress "You should continue to configure your remote Allsky Website via the WebUI."

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
		else
			MSG="You need to manually copy '${REPO_WEBCONFIG_FILE}'"
			# ALLSKY_WEBSITE_CONFIGURATION_NAME is what it's called on the remote server
			MSG="${MSG}to your remote server and rename it to '${ALLSKY_WEBSITE_CONFIGURATION_NAME}',"
			MSG="${MSG}then modify it."
			display_msg warning "${MSG}"
		fi
	fi

	display_msg progress "The Pi portion of the Remote Allsky Website Installation is complete.\n"

	exit 0
}


##### Handle an update to the website, then exit
do_update() {
	if [[ ! -d ${ALLSKY_WEBSITE} ]]; then
		display_msg error " --update specified but no existing website found at '${ALLSKY_WEBSITE}'."
		exit 2
	fi

	modify_locations
	upload_data_json_file

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
				display_msg error "${MSG}"
				display_msg info "\nRemove or rename that directory and re-run the installation.\n"
				exit 3
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
		display_msg progress "Moving prior website to '${PRIOR_WEBSITE_OLD}'."
		if ! mv "${ALLSKY_WEBSITE}" "${PRIOR_WEBSITE_OLD}" ; then
			display_msg error "Unable to move prior website."
			exit 3
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
		B=" from branch ${BRANCH}"
	fi

	display_msg progress "Downloading Allsky Website files${B} into ${ALLSKY_WEBSITE}."
	TMP="/tmp/git.install.tmp"
	# shellcheck disable=SC2086
	git clone -b ${BRANCH} "${GITHUB_ROOT}/allsky-website.git" "${ALLSKY_WEBSITE}" > "${TMP}" 2>&1
	if [[ $? -ne 0 ]]; then
		display_msg error "Unable to get Allsky Website files from git."
		cat "${TMP}"
		exit 4
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
		display_msg progress "Restoring prior videos."
		mv "${PRIOR_WEBSITE}"/videos/allsky-*   "${ALLSKY_WEBSITE}/videos"
	fi

	D="${PRIOR_WEBSITE}/keograms/thumbnails"
	[[ -d ${D} ]] && mv "${D}"   "${ALLSKY_WEBSITE}/keograms"
	count=$(find "${PRIOR_WEBSITE}/keograms" -maxdepth 1 -name 'keogram-*' | wc -l)
	if [[ ${count} -ge 1 ]]; then
		display_msg progress "Restoring prior keograms."
		mv "${PRIOR_WEBSITE}"/keograms/keogram-*   "${ALLSKY_WEBSITE}/keograms"
	fi

	D="${PRIOR_WEBSITE}/startrails/thumbnails"
	[[ -d ${D} ]] && mv "${D}"   "${ALLSKY_WEBSITE}/startrails"
	count=$(find "${PRIOR_WEBSITE}/startrails" -maxdepth 1 -name 'startrails-*' | wc -l)
	if [[ ${count} -ge 1 ]]; then
		display_msg progress "Restoring prior startrails."
		mv "${PRIOR_WEBSITE}"/startrails/startrails-*   "${ALLSKY_WEBSITE}/startrails"
	fi

	D="${PRIOR_WEBSITE}/myImages"
	if [[ -d ${D} ]]; then
		count=$(find "${D}" | wc -l)
		if [[ ${count} -gt 1 ]]; then
			display_msg progress "Restoring prior 'myImages' directory."
			mv "${D}"   "${ALLSKY_WEBSITE}"
		fi
	fi

	A="analyticsTracking.js"
	D="${PRIOR_WEBSITE}/${A}"
	if [[ -f ${D} ]]; then
		if ! cmp --silent "${D}" "${A}" ; then
			display_msg progress "Restoring prior '${A}'."
			mv "${D}" "${ALLSKY_WEBSITE}"
		fi
	fi
}


##### The webserver needs to be able to update the configuration file and create thumbnails.
set_permissions()
{
	display_msg progress "Setting ownership and permissions."
	sudo chown -R "${ALLSKY_OWNER}:${WEBSERVER_GROUP}" "${ALLSKY_WEBSITE}"
	find "${ALLSKY_WEBSITE}/" -type f -exec chmod 664 {} \;
	find "${ALLSKY_WEBSITE}/" -type d -exec chmod 775 {} \;
}


####################### main part of program

# Check arguments
OK="true"
HELP="false"
DEBUG="false"
DEBUG_ARG=""
USER_SPECIFIED_BRANCH=""
UPDATE="false"
FUNCTION=""
REMOTE_WEBSITE="false"
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
		--branch)
			USER_SPECIFIED_BRANCH="${2}"
			if [[ ${USER_SPECIFIED_BRANCH} == "" ]]; then
				OK="false"
			else
				shift	# skip over BRANCH
			fi
			;;
		--remote)
			REMOTE_WEBSITE="true"
			;;
		--update)
			UPDATE="true"
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
[[ ${OK} == "false" ]] && usage_and_exit 1

NEW_WEBSITE_VERSION=""			# version we're upgrading to

##### See if there's a prior Website and if so, set some variables.
does_prior_Allsky_Website_exist

##### Get the current and new Website versions taking branch into account.
get_versions_and_branches

##### Display the welcome header.
[[ -z ${FUNCTION} ]] && do_initial_heading

##### Make sure the new version really is new.
check_versions

##### Set some variables that are used by several functions.
set_configuration_file_variables

##### Executes the specified function, if any, and exits.
[[ -n ${FUNCTION} ]] && do_function "${FUNCTION}"

##### Handle remote websites
[[ ${REMOTE_WEBSITE} == "true" ]] && do_remote_website		# does not return



########################    Everything else is for local install


# Check if the user is updating an existing installation.
# This really only applies if they manually update some files rather than the whole release,
# and ideally would never happen.
[ "${UPDATE}" = "true" ]  && do_update		# does not return

##### Handle prior website, if any
save_prior_website

##### Download new Allsky Website files
download_Allsky_Website

modify_locations
modify_configuration_variables
upload_data_json_file
restore_prior_files

# Create any directories not created above.
mkdir -p "${ALLSKY_WEBSITE_VIEWSETTINGS_DIRECTORY}" \
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
	display_msg info "${MSG}"
fi

if [[ ${NEEDS_NEW_CONFIGURATION_FILE} == "true" ]]; then
	MSG="\nBefore using the website you must edit its configuration by clicking on"
	MSG="${MSG}\nthe 'Editor' link in the WebUI, then select the"
	MSG="${MSG}\n    ${ALLSKY_WEBSITE_CONFIGURATION_NAME} (local Allsky Website)"
	MSG="${MSG}\nentry.  See the 'Installation --> Allsky Website' documentation"
	MSG="${MSG}\npage for more information.\n"
	display_msg info "${MSG}"
fi

echo
exit 0
