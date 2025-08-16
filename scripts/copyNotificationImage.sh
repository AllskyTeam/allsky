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
	local RET=${1}
	exec >&2
	local MSG="\nUsage: ${ME} [--help] [--expires seconds] notification_type [custom_args]\n"
	if [[ ${RET} -ne 0 ]]; then
		E_ "${MSG}"
	else
		echo -e "${MSG}"
	fi
	echo "Arguments:"
	echo "   --expires seconds   Specifies how many seconds before the notification expires."
	echo "  notification_type    If 'custom' then a custom message is created and 'custom_args'"
	echo "                       must be given to specify arguments for the message."
	echo "  custom_args          Is one of the following:"
	echo "             TextColor Font FontSize StrokeColor StrokeWidth BgColor"
	echo "             BorderWidth BorderColor Extensions ImageSize 'Message'"

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
				E_ "Unknown argument '${ARG}'." >&2
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
[[ -z ${NOTIFICATION_TYPE} ]] && usage_and_exit 1
NOTIFICATION_NAME="${NOTIFICATION_TYPE}.${ALLSKY_EXTENSION}"

NUM_ARGS=12
if [[ ${NOTIFICATION_TYPE} == "custom" ]]; then
	if [[ $# -ne ${NUM_ARGS} ]]; then
		E_ "'custom' notification_type requires ${NUM_ARGS} arguments." >&2
		usage_and_exit 1
	fi

	# Create a custom message.
	# Extensions ($10) will normally be null since the invoker may not know what to use.
	if ! "${ALLSKY_SCRIPTS}/generateNotificationImages.sh" \
			--directory "${ALLSKY_CURRENT_DIR}" "${NOTIFICATION_TYPE}" \
			"${2}" "${3}" "${4}" "${5}" "${6}" \
			"${7}" "${8}" "${9}" "${10:-${ALLSKY_EXTENSION}}" "${11}" "${12}" ; then
		exit 2			# it output error messages
	fi
	NOTIFICATION_FILE="${ALLSKY_CURRENT_DIR}/${NOTIFICATION_NAME}"
else
	# Check if the user has a custom image.
	NOTIFICATION_FILE="${ALLSKY_USER_NOTIFICATION_IMAGES}/${NOTIFICATION_NAME}"
	if [[ ! -e ${NOTIFICATION_FILE} ]]; then
		NOTIFICATION_FILE="${ALLSKY_NOTIFICATION_IMAGES}/${NOTIFICATION_NAME}"
	fi
	if [[ ! -e ${NOTIFICATION_FILE} ]]; then
		# TODO: Create a custom image?
		E_ "${ME}: ERROR: File '${NOTIFICATION_FILE}' does not exist!" >&2
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
	CURRENT_IMAGE="${ALLSKY_CURRENT_DIR}/notification-${ALLSKY_FULL_FILENAME}"
	if ! cp "${NOTIFICATION_FILE}" "${CURRENT_IMAGE}" ; then
		E_ "*** ${ME}: ERROR: Cannot copy '${NOTIFICATION_FILE}' to '${CURRENT_IMAGE}'."
		exit 3
	fi
fi

# Get all settings we're going to use.  Their bash names are prefixed by "S_".
#shellcheck disable=SC2119
getAllSettings --var "imageresizewidth imageresizeheight \
	takedaytimeimages savedaytimeimages \
	imagecreatethumbnails thumbnailsizex thumbnailsizey" || exit 1

# Resize the image if required
#shellcheck disable=SC2154
if [[ ${S_imageresizewidth} -gt 0 ]]; then
	#shellcheck disable=SC2154
	if ! convert "${CURRENT_IMAGE}" -resize "${S_imageresizewidth}x${S_imageresizeheight}" \
			"${CURRENT_IMAGE}" ; then
		E_ "*** ${ME}: ERROR: IMG_RESIZE failed."
		exit 3
	fi
fi

# If daytime saving is active, save the image in today's thumbnail directory
# so the user can see when things changed.
# Don't save in main image directory because we don't want the notification image in timelapses.
# If at nighttime, save them in (possibly) yesterday's directory.
# If during day, save in today's directory.
#shellcheck disable=SC2154
if [[ ${S_takedaytimeimages} == "true" && ${S_savedaytimeimages} == "true" && \
	  ${S_imagecreatethumbnails} == "true" ]]; then
	DATE_DIR="${ALLSKY_IMAGES}/$( date +'%Y%m%d' )"
	# Use today's folder if it exists, otherwise yesterday's
	[[ ! -d ${DATE_DIR} ]] && DATE_DIR="${ALLSKY_IMAGES}/$( date -d '12 hours ago' +'%Y%m%d' )"
	THUMBNAILS_DIR="${DATE_DIR}/thumbnails"
	# The thumbnail isn't critical so continue if we can't create it.
	if ! mkdir -p "${THUMBNAILS_DIR}" ; then
			echo -e "${YELLOW}*** ${ME}: WARNING: could not create '${THUMBNAILS_DIR}'; continuing.${NC}"
	else
		THUMB="${THUMBNAILS_DIR}/${ALLSKY_FILENAME}-$( date +'%Y%m%d%H%M%S' ).${ALLSKY_EXTENSION}"
		#shellcheck disable=SC2154
		if ! convert "${CURRENT_IMAGE}" -resize "${S_thumbnailsizex}x${S_thumbnailsizey}" "${THUMB}" ; then
			W_ "*** ${ME}: WARNING: THUMBNAIL resize failed; continuing."
		fi
	fi
fi

# ${FINAL_IMAGE} is the final resting place of the image, and no more changes will be made to it.
# It's also the name of the image that web severs look for.
# The "mv" may be a rename or an actual move.
FINAL_IMAGE="${ALLSKY_CURRENT_DIR}/${ALLSKY_FULL_FILENAME}"
if ! mv -f "${CURRENT_IMAGE}" "${FINAL_IMAGE}" ; then
	MSG="*** ${ME}: ERROR: "
	if [[ -f ${CURRENT_IMAGE} ]]; then
		MSG+="\nCannot mv '${CURRENT_IMAGE}' to '${FINAL_IMAGE}'"
	else
		MSG+="\n'${CURRENT_IMAGE}' does not exist!"
	fi
	E_ "${MSG}"
	exit 4
fi

# Keep track of last notification type and time.
# We don't use the type (at least not yet), but save it anyhow so we can manually look at
# it for debugging purposes.
EXPIRE_TIME=$( date -d "${EXPIRES_IN_SECONDS} seconds" +'%Y-%m-%d %H:%M:%S' )
echo "${NOTIFICATION_TYPE},${EXPIRES_IN_SECONDS},${EXPIRE_TIME}" >> "${ALLSKY_NOTIFICATION_LOG}"
touch --date="${EXPIRE_TIME}" "${ALLSKY_NOTIFICATION_LOG}"

export ME
processAndUploadImage "${FINAL_IMAGE}" "${NOTIFICATION_FILE}"
