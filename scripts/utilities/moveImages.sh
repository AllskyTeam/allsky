#!/bin/bash

[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )" )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/installUpgradeFunctions.sh"	|| exit "${EXIT_ERROR_STOP}"

# shellcheck disable=SC2034
DISPLAY_MSG_LOG="${ALLSKY_LOGS}/changeImages.log"		# display_msg() sends log entries here
display_msg --logonly info "STARTING changeImages"

ALLSKY_IMAGES_MOVED="false"
SAVED_ALLSKY_IMAGES="${ALLSKY_IMAGES}"

# See if ALLSKY_IMAGES has already been set by the user.
if [[ -s ${ALLSKY_USER_VARIABLES} ]]; then
	display_msg --logonly info "Found '${ALLSKY_USER_VARIABLES}'."

	# Check if ALLSKY_IMAGES was changed.
	ALLSKY_IMAGES_MOVED="$(
		unset ALLSKY_IMAGES
		# shellcheck disable=SC1090,SC1091
		source "${ALLSKY_USER_VARIABLES}"
		if [[ -n ${ALLSKY_IMAGES} ]]; then
			echo "true"
		else
			echo "false"
		fi
	)"
	if [[ ${ALLSKY_IMAGES_MOVED} == "true" ]]; then
		display_msg --logonly info "   ALLSKY_IMAGES already set to '${ALLSKY_IMAGES}'"
		echo
		echo "It appears you have already moved the Allsky images to '${ALLSKY_IMAGES}'."
		echo
		read -r -p "Change location? (yes/no): " ans
		if [[ ${ans:0:1} != "y" ]]; then
			display_msg --logonly info "  User elected not to continue."
			exit 0
		fi
	else
		display_msg --logonly info "   ALLSKY_IMAGES not in the file."
	fi
fi

display_msg --logonly info "Prompting for new location."
while true; do
	echo "Enter the full pathname to where you want the images to go."
	echo "The name must begin with '/'."
	echo
	read -r -p "Enter pathname: " NEW_ALLSKY_IMAGES
	if [[ ${NEW_ALLSKY_IMAGES} == 'q' ]]; then
		display_msg --logonly info "  User elected not to continue."
		exit 0
	fi

	if [[ ${NEW_ALLSKY_IMAGES:0:1} != '/' ]]; then
		echo -e "\nThe name must begin with '/'.  Try again."
		echo
	elif [[ ${NEW_ALLSKY_IMAGES} == "${ALLSKY_IMAGES}" ]]; then
		echo -e "\nImages are already saved there.  Enter a new location of 'q' to quit."
		echo
	else
		break
	fi
done

if [[ ! -d ${NEW_ALLSKY_IMAGES} ]]; then
	echo
	echo "'${NEW_ALLSKY_IMAGES}' does not exist."
	read -r -p "Create it? (yes/no): " ans
	if [[ ${ans} == "q" || ${ans:0:1} != "y" ]]; then
		display_msg --logonly info "  User elected not to create '${NEW_ALLSKY_IMAGES}."
		echo
		echo "Exiting, nothing done."
		echo "The directory must be created in order to proceed."
		echo
		exit 0
	fi

	if ! E="$( sudo mkdir -p "${NEW_ALLSKY_IMAGES}" 2>&1 )" ; then
		echo -e "\nERROR: Unable to create '${NEW_ALLSKY_IMAGES}': ${E}\n" >&2
		exit "${EXIT_ERROR_STOP}"
	fi
	display_msg --logonly info "Created '${NEW_ALLSKY_IMAGES}'."
else
	display_msg --logonly info "Using existing '${NEW_ALLSKY_IMAGES}'."
fi

if [[ ${ALLSKY_IMAGES_MOVED} == "true" ]]; then
	if [[ ${NEW_ALLSKY_IMAGES} =~ "${ALLSKY_HOME}" ]]; then
		# Restoring to standard location.
		sed -i -e '/^ALLSKY_IMAGES=/d' "${ALLSKY_USER_VARIABLES}"
		RET=$?
		if [[ ! -s ${ALLSKY_USER_VARIABLES} ]]; then
			display_msg --logonly info "'${ALLSKY_USER_VARIABLES}' is now empty so removing"
			sudo rm "${ALLSKY_USER_VARIABLES}"
		fi
	else
		sed -i \
			-e "s;^ALLSKY_IMAGES=.*;ALLSKY_IMAGES='${NEW_ALLSKY_IMAGES}';" \
			"${ALLSKY_USER_VARIABLES}"
		RET=$?
	fi
	if [[ ${RET} -ne 0 ]]; then
		echo -e "\nERROR: Unable to update '${ALLSKY_USER_VARIABLES}; exiting." >&2
		exit 1
	fi
else
	echo "ALLSKY_IMAGES='${NEW_ALLSKY_IMAGES}'" >> "${ALLSKY_USER_VARIABLES}"
	chmod 664 "${ALLSKY_USER_VARIABLES}"
fi

sudo chown "${ALLSKY_OWNER}":"${ALLSKY_OWNER}" "${NEW_ALLSKY_IMAGES}"
chmod 775 "${NEW_ALLSKY_IMAGES}"

# If the new location is in ${ALLSKY_HOME}, assume
unset ALLSKY_VARIABLE_SET		# forces variables.sh to be re-read
#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit "${EXIT_ERROR_STOP}"

# Reset everything that points to old location
display_msg --logonly info "Making configuration changes."
stop_Allsky
"${ALLSKY_HOME}/install.sh" --function do_change_images
start_Allsky

# If there are any existing files, ask the user what to do.
NUM=$( find "${SAVED_ALLSKY_IMAGES}" -maxdepth 1 2>/dev/null | wc -l )
((NUM--))
if [[ ${NUM} -gt 0 ]]; then
	display_msg --logonly info "${NUM} item(s) found in '${SAVED_ALLSKY_IMAGES}'."
	while true; do
		echo
		echo "There are items in '${SAVED_ALLSKY_IMAGES}'.  Should they be:"
		echo "1. MOVED to the new location,"
		echo "2. COPIED to the new location,"
		echo "3. or left as is?"
		echo
		read -r -p "Enter number: " ans
		case "${ans}" in
			1)
				display_msg --logonly info "  User elected to MOVE items to new location."
				mv "${SAVED_ALLSKY_IMAGES}"/* "${ALLSKY_IMAGES}"
				if [[ ${ALLSKY_IMAGES_MOVED} == "true" ]]; then
					sudo rmdir "${SAVED_ALLSKY_IMAGES}"
				fi
				break
				;;
			2)
				display_msg --logonly info "  User elected to COPY items to new location."
				cp -a -r "${SAVED_ALLSKY_IMAGES}"/* "${ALLSKY_IMAGES}"
				break
				;;
			3)
				display_msg --logonly info "  User elected to LEAVE items as is."
				break
				;;
			"q")
				display_msg --logonly info "  User elected not to continue."
				exit 0
				;;
			*)
				echo -e "\nInvalid response.  Enter 1, 2, or 3." >&2
				;;
		esac
	done
fi


echo
echo "In order for the change to be visible, go to the WebUI in your browser and press"
echo "    SHIFT-F5"
echo "to force it to re-read the new settings."
echo

exit 0
