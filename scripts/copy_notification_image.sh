#!/bin/bash

# Allow this script to be executed manually, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck disable=SC1091 source-path=.
source "${ALLSKY_HOME}/variables.sh"		|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"		|| exit "${EXIT_ERROR_STOP}"

function usage_and_exit
{
	RET=${1}
	(
		[[ ${RET} -ne 0 ]] && echo -en "${RED}"
		echo -e "\nUsage: ${ME} [--help] [--expires seconds] notification_type [custom_args]\n"
		echo "'--expires seconds' specifies how many seconds before the notification expires."
		echo "If 'notification_type' is 'custom' then a custom message is created and"
		echo "'custeom_args' must be given to specify arguments for the message:"
		echo "  TextColor Font FontSize StrokeColor StrokeWidth BgColor BorderWidth BorderColor Extensions ImageSize 'Message'"
		[[ ${RET} -ne 0 ]] && echo -e "${NC}"
	) >&2
	exit "${RET}"
}

OK="true"
DO_HELP=""
EXPIRES_IN_SECONDS="5"	# default

while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG}" in
			--help)
				DO_HELP="true"
				;;
			--expires)
				# Optional argument specifying when the ALLSKY_NOTIFICATION_LOG should expire,
				# i.e., the period of time in which no other notification images will be displayed.
				# If it's 0, then force the use of this notification.
				EXPIRES_IN_SECONDS="${2}"
				shift 
				;;
			-*)
				echo -e "${RED}${ME}: Unknown argument '${ARG}' ignoring.${NC}" >&2
				OK="false"
				;;
			*)
				break
				;;
	esac
	shift
done

[[ ${DO_HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" ]] && usage_and_exit 1
[[ -z ${EXPIRES_IN_SECONDS} ]] && usage_and_exit 2

NOTIFICATION_TYPE="${1}"	# filename, minus the extension, since the extension may vary
[[ ${NOTIFICATION_TYPE} == "" ]] && usage_and_exit 1

NUM_ARGS=12
if [[ ${NOTIFICATION_TYPE} == "custom" ]]; then
	if [[ $# -ne ${NUM_ARGS} ]]; then
		echo -e "${RED}'custom' notification type requires ${NUM_ARGS} arguments" >&2
		usage_and_exit 1
	fi

	# Create a custom message.
	# Extensions ($10) will normally be null since the invoker may not know what to use.
	if ! "${ALLSKY_SCRIPTS}/generate_notification_images.sh" \
			--directory "${CAPTURE_SAVE_DIR}" "${NOTIFICATION_TYPE}" \
			"${2}" "${3}" "${4}" "${5}" "${6}" \
			"${7}" "${8}" "${9}" "${10:-${EXTENSION}}" "${11}" "${12}" ; then
		exit 2			# it output error messages
	fi
	NOTIFICATION_FILE="${CAPTURE_SAVE_DIR}/${NOTIFICATION_TYPE}.${EXTENSION}"
else
	NOTIFICATION_FILE="${ALLSKY_NOTIFICATION_IMAGES}/${NOTIFICATION_TYPE}.${EXTENSION}"
	if [[ ! -e ${NOTIFICATION_FILE} ]]; then
		# TODO: Create a custom image?
		echo -e "${RED}*** ${ME}: ERROR: File '${NOTIFICATION_FILE}' does not exist!${NC}" >&2
		exit 2
	fi
fi

# If a notification image was "recently" posted, don't post this one.
# We'll look at the timestamp of ${ALLSKY_NOTIFICATION_LOG} (defined in variables.sh) and if it's
# in the future we'll skip the current notification. When the file is updated below,
# it's given a timestamp of NOW + ${EXPIRES_IN_SECONDS}.
# We will APPEND to the file so we have a record of all notifications since Allsky started.

if [[ ${NOTIFICATION_TYPE} != "custom" && -f ${ALLSKY_NOTIFICATION_LOG} && ${EXPIRES_IN_SECONDS} -ne 0 ]]; then
	NOW=$( date +'%Y-%m-%d %H:%M:%S' )
	RESULTS="$( find "${ALLSKY_NOTIFICATION_LOG}" -newermt "${NOW}" -print )"
	if [[ -n ${RESULTS} ]]; then	# the file is in the future
		if [[ ${ALLSKY_DEBUG_LEVEL} -ge 4 ]]; then
			# File contains:	Notification_type,expires_in_seconds,expiration_time
			RECENT_NOTIFICATION=$( tail -1 "${ALLSKY_NOTIFICATION_LOG}" )
			RECENT_TYPE=${RECENT_NOTIFICATION%%,*}
			RECENT_TIME=${RECENT_NOTIFICATION##*,}
			echo "${ME}: Ignoring new '${NOTIFICATION_TYPE}'; prior '${RECENT_TYPE}' posted ${RECENT_TIME}."
		fi
		exit 0
	fi
fi

if [[ ${NOTIFICATION_TYPE} == "custom" ]]; then
	# Custom notifications are temporary so go ahead and overwrite them.
	CURRENT_IMAGE="${NOTIFICATION_FILE}"
else
	# Don't overwrite notification images so create a temporary copy and use that.
	CURRENT_IMAGE="${CAPTURE_SAVE_DIR}/notification-${FULL_FILENAME}"
	if ! cp "${NOTIFICATION_FILE}" "${CURRENT_IMAGE}" ; then
		echo -e "${RED}*** ${ME}: ERROR: Cannot copy '${NOTIFICATION_FILE}' to '${CURRENT_IMAGE}'${NC}"
		exit 3
	fi
fi

# Resize the image if required
RESIZE_W="$( settings ".imageresizewidth" )"
if [[ ${RESIZE_W} -gt 0 ]]; then
	RESIZE_H="$( settings ".imageresizeheight" )"
	if ! convert "${CURRENT_IMAGE}" -resize "${RESIZE_W}x${RESIZE_H}" "${CURRENT_IMAGE}" ; then
		echo -e "${RED}*** ${ME}: ERROR: IMG_RESIZE failed${NC}"
		exit 3
	fi
fi

# If daytime saving is active, save the image in today's thumbnail directory
# so the user can see when things changed.
# Don't save in main image directory because we don't want the notification image in timelapses.
# If at nighttime, save them in (possibly) yesterday's directory.
# If during day, save in today's directory.
if [[ $( settings ".takedaytimeimages" ) == "true" && \
	  $( settings ".savedaytimeimages" ) == "true" && \
	  $( settings ".imagecreatethumbnails" ) == "true" ]]; then
	DATE_DIR="${ALLSKY_IMAGES}/$( date +'%Y%m%d' )"
	# Use today's folder if it exists, otherwise yesterday's
	[[ ! -d ${DATE_DIR} ]] && DATE_DIR="${ALLSKY_IMAGES}/$( date -d '12 hours ago' +'%Y%m%d' )"
	THUMBNAILS_DIR="${DATE_DIR}/thumbnails"
	# The thumbnail isn't critical so continue if we can't create it.
	if ! mkdir -p "${THUMBNAILS_DIR}" ; then
			echo -e "${YELLOW}*** ${ME}: WARNING: could not create '${THUMBNAILS_DIR}'; continuing.${NC}"
	else
		THUMB="${THUMBNAILS_DIR}/${FILENAME}-$( date +'%Y%m%d%H%M%S' ).${EXTENSION}"

		X="$( settings ".thumbnailsizex" )"
		Y="$( settings ".thumbnailsizey" )"
		if ! convert "${CURRENT_IMAGE}" -resize "${X}x${Y}" "${THUMB}" ; then
			echo -e "${YELLOW}*** ${ME}: WARNING: THUMBNAIL resize failed; continuing.${NC}"
		fi
	fi
fi

# ${FINAL_IMAGE} is the final resting place of the image, and no more changes will be made to it.
# It's also the name of the image that web severs look for.
# The "mv" may be a rename or an actual move.
FINAL_IMAGE="${CAPTURE_SAVE_DIR}/${FULL_FILENAME}"
if ! mv -f "${CURRENT_IMAGE}" "${FINAL_IMAGE}" ; then
	echo -e "${RED}*** ${ME}: ERROR: "
	if [[ -f ${CURRENT_IMAGE} ]]; then
		echo "Cannot mv '${CURRENT_IMAGE}' to '${FINAL_IMAGE}'"
	else
		echo "'${CURRENT_IMAGE}' does not exist!"
	fi
	echo -e "${NC}"
	exit 4
fi

# Keep track of last notification type and time.
# We don't use the type (at least not yet), but save it anyhow so we can manually look at
# it for debugging purposes.
EXPIRE_TIME=$( date -d "${EXPIRES_IN_SECONDS} seconds" +'%Y-%m-%d %H:%M:%S' )
echo "${NOTIFICATION_TYPE},${EXPIRES_IN_SECONDS},${EXPIRE_TIME}" >> "${ALLSKY_NOTIFICATION_LOG}"
touch --date="${EXPIRE_TIME}" "${ALLSKY_NOTIFICATION_LOG}"

# If upload is true, optionally create a smaller version of the image, either way, upload it.
if [[ $( settings ".imageuploadfrequency" ) -gt 0 ]]; then
	RESIZE_UPLOADS_WIDTH="$( settings ".imageresizeuploadswidth" )"
	if [[ ${RESIZE_UPLOADS_WIDTH} == "true" ]]; then
		RESIZE_UPLOADS_HEIGHT="$( settings ".imageresizeuploadsheight" )"
		# Don't overwrite FINAL_IMAGE since the web server(s) may be looking at it.
		TEMP_FILE="${CAPTURE_SAVE_DIR}/resize-${FULL_FILENAME}"

		# create temporary copy to resize
		if ! cp "${FINAL_IMAGE}" "${TEMP_FILE}" ; then
			echo -e "${RED}*** ${ME}: ERROR: Cannot copy to TEMP_FILE: '${FINAL_IMAGE}' to '${TEMP_FILE}'${NC}"
			exit 5
		fi
		if ! convert "${TEMP_FILE}" \
				-resize "${RESIZE_UPLOADS_WIDTH}x${RESIZE_UPLOADS_HEIGHT}" \
				-gravity East \
				-chop 2x0 "${TEMP_FILE}" ; then
			echo -e "${RED}*** ${ME}: ERROR: Unable to resize '${TEMP_FILE}' - file left for debugging.${NC}"
			exit 6
		fi
		UPLOAD_FILE="${TEMP_FILE}"
	else
		UPLOAD_FILE="${FINAL_IMAGE}"
		TEMP_FILE=""
	fi

	# We're actually uploading ${UPLOAD_FILE}, but show ${NOTIFICATION_FILE} in the message since it's more descriptive.
	# If an existing notification is being uploaded, wait for it to finish then upload this one.
	if [[ ${ALLSKY_DEBUG_LEVEL} -ge 4 ]]; then
		echo -e "${ME}: Uploading $( basename "${NOTIFICATION_FILE}" )"
	fi
	upload_all --local-web --remote-web --wait --silent "${UPLOAD_FILE}" "" "${FULL_FILENAME}" "NotificationImage"
	RET=$?

	# If we created a temporary copy, delete it.
	[[ ${TEMP_FILE} != "" ]] && rm -f "${TEMP_FILE}"

	exit "${RET}"
fi

exit 0
