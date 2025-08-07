#!/bin/bash

[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$(dirname "${BASH_ARGV0}")/../.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/installUpgradeFunctions.sh"	|| exit "${EXIT_ERROR_STOP}"

# shellcheck disable=SC2034
export DISPLAY_MSG_LOG="${ALLSKY_LOGS}/moveImages.log"		# display_msg() logs here
display_msg --logonly info "\nSTARTING moveImages"

ALLSKY_IMAGES_ALREADY_MOVED="false"					# Did the user already move the images?
OLD_ALLSKY_IMAGES="${ALLSKY_IMAGES}"				# Where images are currently kept.

usage_and_exit()
{
	local RET=${1}
	exec >&2
	echo
	local USAGE="Usage: ${ME} [--help]"
	if [[ ${RET} -ne 0 ]]; then
		E_ "${USAGE}"
	else
		echo -e "${USAGE}"
	fi

	echo
	echo "Configure Allsky to save images in the location you specify,"
	echo "rather than in ~/allsky/images.  You are prompted for the new location,"
	echo "and if there are images in the current location, you'll be prompted for"
	echo "what you want to do with them (typically move them to the new location)."
	echo
	echo "The new location is typically an SSD or other higher-capacity,"
	echo "more reliable media than an SD card."
	echo

	exit "${RET}"
}
OK="true"
DO_HELP="false"
while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
		--help)
			DO_HELP="true"
			;;
		-*)
			E_ "Unknown argument '${ARG}'." >&2
			OK="false"
			;;
	esac
	shift
done
[[ ${DO_HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" ]] && usage_and_exit 1

function do_exit()
{
	local RET="${1}"

	display_msg --logonly info "ENDING moveImages"
	exit "${RET}"
}

# See if ALLSKY_IMAGES has already been set by the user.
if [[ -s ${ALLSKY_USER_VARIABLES} ]]; then
	display_msg --logonly info "Found '${ALLSKY_USER_VARIABLES}'."

	# Check if ALLSKY_IMAGES was changed.
	ALLSKY_IMAGES_ALREADY_MOVED="$(
		unset ALLSKY_IMAGES
		# shellcheck disable=SC1090,SC1091
		source "${ALLSKY_USER_VARIABLES}"
		if [[ -n ${ALLSKY_IMAGES} ]]; then
			echo "true"
		else
			echo "false"
		fi
	)"
	if [[ ${ALLSKY_IMAGES_ALREADY_MOVED} == "true" ]]; then
		display_msg --logonly info "  > ALLSKY_IMAGES already set to '${ALLSKY_IMAGES}'"
		echo
		echo "It appears you have already moved the Allsky images to '${ALLSKY_IMAGES}'."
		echo
		read -r -p "Change location? (yes/no): " ans
		if [[ ${ans:0:1} != "y" ]]; then
			display_msg --logonly info "  > User elected not to continue."
			do_exit 0
		fi
	else
		display_msg --logonly info "  > ALLSKY_IMAGES not in the file."
	fi
fi

display_msg --logonly info "Prompting for new location."
while true; do
	echo
	echo "Enter the full pathname to where you want the images to go."
	echo "The name must begin with '/'."
	echo
	read -r -p "Enter pathname: " NEW_ALLSKY_IMAGES
	if [[ ${NEW_ALLSKY_IMAGES} == 'q' ]]; then
		display_msg --logonly info "  > User elected not to continue."
		do_exit 0
	fi

	if [[ ${NEW_ALLSKY_IMAGES:0:1} != '/' ]]; then
		echo -e "\nThe name must begin with '/'.  Try again."
	else
		display_msg --logonly info "  > User entered '${NEW_ALLSKY_IMAGES}'."
		break
	fi
done

if [[ ! -d ${NEW_ALLSKY_IMAGES} ]]; then
	echo
	echo "'${NEW_ALLSKY_IMAGES}' does not exist."
	read -r -p "Create it? (yes/no): " ans
	if [[ ${ans} == "q" || ${ans:0:1} != "y" ]]; then
		display_msg --logonly info "  > User elected not to create '${NEW_ALLSKY_IMAGES}."
		echo
		echo "Exiting, nothing done."
		echo "The directory must be created in order to proceed."
		echo
		do_exit 0
	fi

	if ! E="$( sudo mkdir -p "${NEW_ALLSKY_IMAGES}" 2>&1 )" ; then
		MSG="Unable to create '${NEW_ALLSKY_IMAGES}'"
		display_msg --log error "${MSG}:" "${E}"
		do_exit "${EXIT_ERROR_STOP}"
	fi
	display_msg --logonly info "  > Created '${NEW_ALLSKY_IMAGES}'."
else
	display_msg --logonly info "  > '${NEW_ALLSKY_IMAGES}' already exists - will use it."
fi

# Do this even if the directory already existed, "just in case".
sudo chown "${ALLSKY_OWNER}":"${ALLSKY_OWNER}" "${NEW_ALLSKY_IMAGES}"
chmod 775 "${NEW_ALLSKY_IMAGES}"

# Make sure the web server can view the directory.
DIR="${NEW_ALLSKY_IMAGES}"
while ! sudo --user "${ALLSKY_WEBSERVER_OWNER}" ls "${DIR}" > /dev/null 2>&1
do
	display_msg --logonly info "  > Changing permissions of '${DIR}' so web server can view images."
	sudo chmod o+rx "${DIR}"
	[[ ${DIR} == "/" ]] && break
	DIR="$( dirname "${DIR}" )"
done

# Get current status of Allsky to determine if we have to stop and restart it.
STATUS="$( get_allsky_status )"
if [[ ${STATUS} == "${ALLSKY_STATUS_STARTING}" ||
	  ${STATUS} == "${ALLSKY_STATUS_RESTARTING}" ||
	  ${STATUS} == "${ALLSKY_STATUS_RUNNING}" ]]; then
	ALLSKY_RUNNING="true"
else
	ALLSKY_RUNNING="false"
fi

if [[ ${ALLSKY_RUNNING} == "true" ]]; then
	stop_Allsky
	display_msg progress "Allsky stopped."
	display_msg --logonly info "Allsky stopped; was '${STATUS}'."
else
	display_msg --logonly info "Not stopping Allsky - is currently '${STATUS}'."
fi

# Reset everything that points to old location.
if [[ ${ALLSKY_IMAGES_ALREADY_MOVED} == "true" ]]; then
	if [[ ${NEW_ALLSKY_IMAGES} == "${ALLSKY_IMAGES_ORIGINAL}" ]]; then
		# Restore to standard location.
		sed -i -e '/^ALLSKY_IMAGES=/d' "${ALLSKY_USER_VARIABLES}"
		RET=$?
		if [[ ! -s ${ALLSKY_USER_VARIABLES} ]]; then
			display_msg --logonly info "'${ALLSKY_USER_VARIABLES}' is now empty so removing"
			rm -f "${ALLSKY_USER_VARIABLES}"
		fi
	else
		sed -i \
			-e "s;^ALLSKY_IMAGES=.*;ALLSKY_IMAGES='${NEW_ALLSKY_IMAGES}';" \
			"${ALLSKY_USER_VARIABLES}"
		RET=$?
	fi
	if [[ ${RET} -ne 0 ]]; then
		display_msg --log error "Unable to update '${ALLSKY_USER_VARIABLES}'; exiting."
		do_exit 1
	fi
else
	echo "ALLSKY_IMAGES='${NEW_ALLSKY_IMAGES}'" >> "${ALLSKY_USER_VARIABLES}"
	chmod 664 "${ALLSKY_USER_VARIABLES}"
fi

# Re-read variables.  ${ALLSKY_IMAGES} will be the NEW location.
# ${OLD_ALLSKY_IMAGES} are where they currently are.
unset ALLSKY_VARIABLE_SET		# forces variables.sh to be re-read
#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit "${EXIT_ERROR_STOP}"

display_msg --logonly info "Making configuration changes."
"${ALLSKY_HOME}/install.sh" --function do_change_images

# For some reason, the yellow color being reset, so reset them.
O_ ""

# If there are any existing files or directories, ask the user what to do with them.
NUM=$( find "${OLD_ALLSKY_IMAGES}" -maxdepth 1 2>/dev/null | wc -l )
(( NUM-- ))		# Don't count the top directory
if [[ ${NUM} -gt 0 ]]; then
	display_msg --logonly info "${NUM} item(s) found in '${OLD_ALLSKY_IMAGES}'; prompting user."
	while true; do
		echo "There are ${NUM} objects in '${OLD_ALLSKY_IMAGES}'.  Should they be:"
		echo "1. MOVED to the new location,"
		echo "2. COPIED to the new location,"
		echo "3. or left as is?"
		echo
		read -r -p "Enter number: " ans
		case "${ans}" in
			1)
				display_msg --logonly info "  > User elected to MOVE items to new location."
				ERR="$( mv "${OLD_ALLSKY_IMAGES}"/* "${ALLSKY_IMAGES}" 2>&1 )"
				if [[ $? -ne 0 ]]; then
					MSG="WARNING: some images didn't get copied;"
					MSG+=" you must copy them manually:\n${ERR}"
					W_ "${MSG}"
				fi

				# This won't remove ${ALLSKY_IMAGES}.  Leave it, even if empty.
				if [[ ${ALLSKY_IMAGES_ALREADY_MOVED} == "true" ]]; then
					sudo rmdir "${OLD_ALLSKY_IMAGES}"
				fi
				break
				;;
			2)
				display_msg --logonly info "  > User elected to COPY items to new location."
				cp -a -r "${OLD_ALLSKY_IMAGES}"/* "${ALLSKY_IMAGES}"
				break
				;;
			3)
				display_msg --logonly info "  > User elected to LEAVE items as is."
				break
				;;
			"q")
				display_msg --logonly info "  > User elected not to continue."
				do_exit 0
				;;
			*)
				E_ "\nInvalid response.  Enter 1, 2, or 3." >&2
				;;
		esac
	done
else
	display_msg --logonly info "No items found in '${OLD_ALLSKY_IMAGES}'."
fi


MSG="Move completed."
if [[ ${ALLSKY_RUNNING} == "true" ]]; then
	start_Allsky
	MSG2=" Allsky restarted."
else
	MSG2=""
fi
display_msg --log progress "\n${MSG}" "${MSG2}"

MSG="In order for the change to be visible, go to the WebUI and press"
MSG+="\n    SHIFT-F5 in your browser to force it to re-read the new settings."
display_msg info "${MSG}\n"

do_exit 0
