#!/bin/bash

# Recreate files after a "git pull" or whenever any "parent" file changes.
# Some of the files probably don't need updating, but it's quick to
# update most of them and not always quick to check if they need updating.
# However, for the updates that can take a while and are easy to check, check.

# Allow this script to be executed manually, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit "${ALLSKY_EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"					|| exit "${ALLSKY_EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/installUpgradeFunctions.sh"	|| exit "${ALLSKY_EXIT_ERROR_STOP}"

if [[ ${1} == "--help" ]]; then
	echo
	W_ "Usage: ${ME}  ${ME_F} [--files-downloaded f]"
	echo
	echo "Recreates files when their 'parent' files change, e.g., a '.repo' file."
	echo
	echo "   --files-downloaded f    File 'f' contains a list of files that were downloaded."
	exit 0
fi

if [[ ${1} == "--files-downloaded" ]]; then
	FILES_DOWNLOADED_FILE="${2}"
	shift 2
else
	FILES_DOWNLOADED_FILE=""
fi

############################################## main

echo "* Updating variables.json file."
create_variables_json ""	# Should come first so other steps get the newest variables.


echo "* Updating sudoers file."
create_sudoers


echo "* Updating options file."
create_options_file --no-settings-file


echo "* Updating config_repo files."
update_repo_files


echo "* Recreating links."
create_links "allsky-config"


echo "* Updating variables used by C programs and running 'make' if needed."
# "true" means run "make" if needed.
# This is one case where it's worth checking what files changed, since running "make"
# can take a while.
X="$( update_allsky_common "${FILES_DOWNLOADED_FILE}" 2>&1 )"
if [[ $? -ne 0 ]]; then
	W_ "WARNING: ${X}" >&2
fi


if [[ ! -s ${FILES_DOWNLOADED_FILE} ]] ||
		grep -m 1 --silent "${REPO_LIGHTTPD_FILE}" "${FILES_DOWNLOADED_FILE}" ; then
	echo "* Updating lighttpd config file and restarting the service."
	create_lighttpd_config_file ""
	X="$( sudo systemctl restart lighttpd 2>&1 )"
	if [[ $? -ne 0 ]]; then
		W_ "WARNING: unable to restart lighttpd service in ${ME_F}: ${X}" >&2
	else
		# Starting it added an entry so truncate the file so it's 0-length.
		truncate -s 0 "${LIGHTTPD_LOG_FILE}"
	fi
fi


REPO="$( basename "${ALLSKY_REPO}" )/$( basename "${ALLSKY_RPi_SUPPORTED_CAMERAS}" )"
if [[ ! -s ${FILES_DOWNLOADED_FILE} ]] ||
		grep -m 1 --silent "${REPO}" "${FILES_DOWNLOADED_FILE}" ; then
	echo "* Updating list of RPi supported cameras."
	# true == ignore errors.  ${CMD} will be "" if no command found.
	CMD="$( determineCommandToUse "false" "" "true" 2> /dev/null )"
	RET=$?		# return of 2 means no command was found
	[[ ${RET} -ne 0 ]] && CMD=""
	# Will create full file is CMD == "".  "true" is to force creation.
	setup_rpi_supported_cameras "${CMD}" "true" > /dev/null
fi


# TODO: when ALLSKY_CONFIG is in GitHub, and hence comes with Allsky,
# remove these lines and the copy_repo_files function.
echo "* Copying some ${ALLSKY_REPO} files to ${ALLSKY_CONFIG}."
copy_repo_files

exit 0
