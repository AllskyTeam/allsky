#!/bin/bash

# Script to save a DAY or NIGHT image.
# It goes in ${ALLSKY_TMP} where the WebUI and local Allsky Website can find it.

ME="$( basename "${BASH_ARGV0}" )"
[[ ${ALLSKY_DEBUG_LEVEL} -ge 3 ]] && echo "${ME} $*"

#shellcheck disable=SC1091 source-path=.
source "${ALLSKY_HOME}/variables.sh"		|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"		|| exit "${EXIT_ERROR_STOP}"

usage_and_exit()
{
	local RET=${1}
	{
		[[ ${RET} -ne 0 ]] && echo -ne "${RED}"
		echo -n "Usage: ${ME} DAY|NIGHT  full_path_to_image  [variable=value [...]]"
		[[ ${RET} -ne 0 ]] && echo -e "${NC}"
	} >&2
	exit "${RET}"
}
[[ $# -lt 2 ]] && usage_and_exit 1

# Export so other scripts can use it.
export DAY_OR_NIGHT="${1}"
[[ ${DAY_OR_NIGHT} != "DAY" && ${DAY_OR_NIGHT} != "NIGHT" ]] && usage_and_exit 1

# ${CURRENT_IMAGE} is the full path to a uniquely-named file created by the capture program.
# The file name is its final name in the ${ALLSKY_IMAGES}/<date> directory.
# Because it's a unique name we don't have to worry about another process overwritting it.
# We modify the file as needed and ultimately save a link to it as ${FULL_FILENAME} since
# that's what websites look for and what is uploaded.

# Export so other scripts can use it.
export CURRENT_IMAGE="${2}"
shift 2
if [[ ! -f ${CURRENT_IMAGE} ]] ; then
	echo -e "${RED}*** ${ME}: ERROR: File '${CURRENT_IMAGE}' not found; ignoring${NC}"
	exit 2
fi
if [[ ! -s ${CURRENT_IMAGE} ]] ; then
	echo -e "${RED}*** ${ME}: ERROR: File '${CURRENT_IMAGE}' is empty; ignoring${NC}"
	exit 2
fi

# Make sure only one save happens at once.
# Multiple concurrent saves (which can happen if the delay is short or post-processing
# is long) causes read and write errors.
PID_FILE="${ALLSKY_TMP}/saveImage-pid.txt"
ABORTED_MSG1="Another saveImage is in progress so the new one was aborted."
ABORTED_FIELDS="${CURRENT_IMAGE}"
ABORTED_MSG2="uploads"
# TODO: check delay settings and average times for module processing
# and tailor the message.
CAUSED_BY="This could be caused by very long module processing time or extremely short delays between images."
# Don't sleep too long or check too many times since processing an image should take at most
# a few seconds
if ! one_instance --pid-file "${PID_FILE}" --sleep "3s" --max-checks 3 \
		--aborted-count-file "${ALLSKY_ABORTEDSAVEIMAGE}" --aborted-fields "${ABORTED_FIELDS}" \
		--aborted-msg1 "${ABORTED_MSG1}" --aborted-msg2 "${ABORTED_MSG2}" \
		--caused-by "${CAUSED_BY}" ; then
	rm -f "${CURRENT_IMAGE}"
	exit 1
fi

# The image may be in a memory filesystem, so do all the processing there and
# leave the image used by the website(s) in that directory.
IMAGE_NAME=$( basename "${CURRENT_IMAGE}" )		# just the file name
WORKING_DIR=$( dirname "${CURRENT_IMAGE}" )		# the directory the image is currently in

# Check for bad images.
# Return code 99 means the image was bad and deleted and an error message
# displayed so don't continue.
"${ALLSKY_SCRIPTS}/removeBadImages.sh" "${WORKING_DIR}" "${IMAGE_NAME}"
[[ $? -eq 99 ]] && exit 99

CROP_TOP="$( settings ".imagecroptop" )"
CROP_RIGHT="$( settings ".imagecropright" )"
CROP_BOTTOM="$( settings ".imagecropbottom" )"
CROP_LEFT="$( settings ".imagecropleft" )"
CROP_IMAGE=$(( CROP_TOP + CROP_RIGHT + CROP_BOTTOM + CROP_LEFT ))		# > 0 if cropping

# If we're cropping the image, get the image resolution.
if [[ ${CROP_IMAGE} -gt 0 ]]; then
	# Typical "identify" output:
	#	image.jpg JPEG 4056x3040 4056x3040+0+0 8-bit sRGB 1.19257MiB 0.000u 0:00.000
	if ! x=$( identify "${CURRENT_IMAGE}" 2>/dev/null ) ; then
		echo -e "${RED}*** ${ME}: ERROR: '${CURRENT_IMAGE}' is corrupt; not saving.${NC}"
		exit 3
	fi

	RESOLUTION=$(echo "${x}" | awk '{ print $3 }')
	# These are the resolution of the image (which may have been binned), not the sensor.
	RESOLUTION_X=${RESOLUTION%x*}	# everything before the "x"
	RESOLUTION_Y=${RESOLUTION##*x}	# everything after  the "x"
fi

# Get passed-in variables.
while [[ $# -gt 0 ]]; do
	VARIABLE="AS_${1%=*}"		# everything before the "="
	VALUE="${1##*=}"			# everything after  the "="
	shift
	# Export the variable so other scripts we call can use it.
	# shellcheck disable=SC2086
	export ${VARIABLE}="${VALUE}"	# need "export" to get indirection to work
done
# Export other variables so user can use them in overlays
export AS_CAMERA_TYPE="$( settings ".cameratype" )"
export AS_CAMERA_MODEL="$( settings ".cameramodel" )"

# If ${AS_TEMPERATURE_C} is set, use it as the sensor temperature,
# otherwise use the temperature in ${TEMPERATURE_FILE}.
# The TEMPERATURE_FILE is manually created if needed.
if [[ -z ${AS_TEMPERATURE_C} ]]; then
	TEMPERATURE_FILE="${ALLSKY_TMP}/temperature.txt"
	if [[ -s ${TEMPERATURE_FILE} ]]; then	# -s so we don't use an empty file
		AS_TEMPERATURE_C=$( < "${TEMPERATURE_FILE}" )
	fi
fi

# If taking dark frames, save the dark frame then exit.
if [[ $( settings ".takedarkframes" ) == "true" ]]; then
	#shellcheck source-path=scripts
	source "${ALLSKY_SCRIPTS}/darkCapture.sh"
	exit 0
fi

# TODO: Dark subtract long-exposure images, even if during daytime.
# TODO: Need a config variable to specify the threshold to dark subtract.
if [[ ${DAY_OR_NIGHT} == "NIGHT" ]]; then
	#shellcheck source-path=scripts
	source "${ALLSKY_SCRIPTS}/darkSubtract.sh"	# It will modify the image but not its name.
fi

# If any of the "convert"s below fail, exit since we won't know if the file was corrupted.

function display_error_and_exit()	# error message, notification string
{
	ERROR_MESSAGE="${1}"
	NOTIFICATION_STRING="${2}"
	echo -en "${RED}"
	echo -e "${ERROR_MESSAGE}" | while read -r MSG
		do
			[[ -n ${MSG} ]] && echo -e "    * ${MSG}"
		done
	echo -e "${NC}"
	# Create a custom error message.
	"${ALLSKY_SCRIPTS}/copy_notification_image.sh" --expires 15 "custom" \
		"red" "" "85" "" "" "" "10" "red" "${EXTENSION}" "" \
		"*** ERROR ***\nAllsky Stopped!\nInvalid ${NOTIFICATION_STRING} settings\nSee\n/var/log/allsky.log"

	# Don't let the service restart us because we will get the same error again.
	stop_Allsky
	set_allsky_status "${ALLSKY_STATUS_ERROR}"
	exit "${EXIT_ERROR_STOP}"
}

# Resize the image if required
RESIZE_W="$( settings ".imageresizewidth" )"
RESIZE_H="$( settings ".imageresizeheight" )"
export AS_RESIZE_WIDTH="${RESIZE_W}"
export AS_RESIZE_HEIGHT="${RESIZE_H}"
if [[ ${RESIZE_W} -gt 0 && ${RESIZE_H} -gt 0 ]]; then
	# Make sure we were given numbers.
	ERROR_MSG=""
	if [[ ${RESIZE_W} != +([+0-9]) ]]; then		# no negative numbers allowed
		ERROR_MSG+="\n'Image Resize Height' (${RESIZE_W}) must be a number."
	fi
	if [[ ${RESIZE_H} != +([+0-9]) ]]; then
		ERROR_MSG+="\n'Image Resize Width' (${RESIZE_H}) must be a number."
	fi
	if [[ -n ${ERROR_MSG} ]]; then
		echo -e "${RED}*** ${ME}: ERROR: Image resize number(s) invalid.${NC}"
		display_error_and_exit "${ERROR_MSG}" "Image Resize"
	fi

	if [[ ${ALLSKY_DEBUG_LEVEL} -ge 3 ]]; then
		echo "${ME}: Resizing '${CURRENT_IMAGE}' to ${RESIZE_W}x${RESIZE_H}"
	fi
	if ! convert "${CURRENT_IMAGE}" -resize "${RESIZE_W}x${RESIZE_H}" "${CURRENT_IMAGE}" ; then
		echo -e "${RED}*** ${ME}: ERROR: image resize failed; not saving${NC}"
		exit 4
	fi

	if [[ ${CROP_IMAGE} -gt 0 ]]; then
		# The image was just resized and the resolution changed, so reset the variables.
		RESOLUTION_X=${RESIZE_W}
		RESOLUTION_Y=${RESIZE_H}
	fi
fi

# Crop the image if required
if [[ ${CROP_IMAGE} -gt 0 ]]; then
	# Perform basic checks on crop settings.
	ERROR_MSG="$( checkCropValues "${CROP_TOP}" "${CROP_RIGHT}" "${CROP_BOTTOM}" "${CROP_LEFT}" \
		"${RESOLUTION_X}" "${RESOLUTION_Y}" 2>&1 )"
	if [[ -z ${ERROR_MSG} ]]; then
		if [[ ${ALLSKY_DEBUG_LEVEL} -ge 3 ]]; then
			CROP_WIDTH=$(( RESOLUTION_X - CROP_RIGHT - CROP_LEFT ))
			CROP_HEIGHT=$(( RESOLUTION_Y - CROP_TOP - CROP_BOTTOM ))
			echo -e "${ME} Cropping '${CURRENT_IMAGE}' to ${CROP_WIDTH}x${CROP_HEIGHT}."
		fi
		C=""
		[[ ${CROP_TOP} -ne 0 ]] && C+=" -gravity North -chop 0x${CROP_TOP}"
		[[ ${CROP_RIGHT} -ne 0 ]] && C+=" -gravity East -chop ${CROP_RIGHT}x0"
		[[ ${CROP_BOTTOM} -ne 0 ]] && C+=" -gravity South -chop 0x${CROP_BOTTOM}"
		[[ ${CROP_LEFT} -ne 0 ]] && C+=" -gravity West -chop ${CROP_LEFT}x0"

		# shellcheck disable=SC2086
		convert "${CURRENT_IMAGE}" ${C} "${CURRENT_IMAGE}"
		if [[ $? -ne 0 ]] ; then
			echo -e "${RED}*** ${ME}: ERROR: CROP_IMAGE failed; not saving${NC}"
			exit 4
		fi
	else
		echo -e "${RED}*** ${ME}: ERROR: Crop number(s) invalid; not cropping image.${NC}"
		display_error_and_exit "${ERROR_MSG}" "CROP"
	fi
fi

# Stretch the image if required.
STRETCH_AMOUNT="$( settings ".imagestretchamount${DAY_OR_NIGHT,,}time" )"
STRETCH_MIDPOINT="$( settings ".imagestretchmidpoint${DAY_OR_NIGHT,,}time" )"
export AS_STRETCH_AMOUNT="${STRETCH_AMOUNT}"
export AS_STRETCH_MIDPOINT="${STRETCH_MIDPOINT}"
if [[ ${STRETCH_AMOUNT} -gt 0 ]]; then
	if [[ ${ALLSKY_DEBUG_LEVEL} -ge 3 ]]; then
		echo "${ME}: Stretching '${CURRENT_IMAGE}' by ${STRETCH_AMOUNT} @ ${STRETCH_MIDPOINT}%"
	fi
 	convert "${CURRENT_IMAGE}" -sigmoidal-contrast "${STRETCH_AMOUNT}x${STRETCH_MIDPOINT}%" "${CURRENT_IMAGE}"

	if [[ $? -ne 0 ]]; then
		echo -e "${RED}*** ${ME}: ERROR: AUTO_STRETCH failed; not saving${NC}"
		exit 4
	fi
fi

if [[ "${DAY_OR_NIGHT}" == "NIGHT" ]]; then
	# The 12 hours ago option ensures that we're always using today's date
	# even at high latitudes where civil twilight can start after midnight.
	export DATE_NAME="$( date -d '12 hours ago' +'%Y%m%d' )"
else
	# During the daytime we alway save the file in today's directory.
	export DATE_NAME="$( date +'%Y%m%d' )"
fi

activate_python_venv
python3 "${ALLSKY_SCRIPTS}/flow-runner.py"
deactivate_python_venv

# The majority of the post-processing time for an image is in flow-runner.py.
# Since only one mini-timelapse can run at once and that code is embeded in this code
# in several places, remove our PID lock now.
rm -f "${PID_FILE}"

SAVED_FILE="${CURRENT_IMAGE}"						# The name of the file saved from the camera.
WEBSITE_FILE="${WORKING_DIR}/${FULL_FILENAME}"		# The name of the file the websites look for

TIMELAPSE_MINI_UPLOAD_VIDEO="$( settings ".minitimelapseupload" )"
# If needed, save the current image in today's directory.
if [[ ( $( settings ".savedaytimeimages" ) == "true" && ${DAY_OR_NIGHT} == "DAY" ) || 
	  ( $( settings ".savenighttimeimages" ) == "true" && ${DAY_OR_NIGHT} == "NIGHT" ) ]]; then
	SAVE_IMAGE="true"
else
	SAVE_IMAGE="false"
fi
if [[ ${SAVE_IMAGE} == "true" ]]; then
	# Determine what directory is the final resting place.
	if [[ ${DAY_OR_NIGHT} == "NIGHT" ]]; then
		# The 12 hours ago option ensures that we're always using today's date
		# even at high latitudes where civil twilight can start after midnight.
		DATE_NAME="$( date -d '12 hours ago' +'%Y%m%d' )"
	else
		# During the daytime we alway save the file in today's directory.
		DATE_NAME="$( date +'%Y%m%d' )"
	fi
	DATE_DIR="${ALLSKY_IMAGES}/${DATE_NAME}"
	[[ ! -d ${DATE_DIR} ]] && mkdir -p "${DATE_DIR}"

	if [[ $( settings ".imagecreatethumbnails" ) == "true" ]]; then
		THUMBNAILS_DIR="${DATE_DIR}/thumbnails"
		mkdir -p "${THUMBNAILS_DIR}"
		# Create a thumbnail of the image for faster load in the WebUI.
		# If we resized above, this will be a resize of a resize,
		# but for thumbnails that should be ok.
		X="$( settings ".thumbnailsizex" )"
		Y="$( settings ".thumbnailsizey" )"
		if ! convert "${CURRENT_IMAGE}" -resize "${X}x${Y}" "${THUMBNAILS_DIR}/${IMAGE_NAME}" ; then
			echo -e "${YELLOW}*** ${ME}: WARNING: THUMBNAIL resize failed; continuing.${NC}"
		fi
	fi

	# The web server can't handle symbolic links so we need to make a copy of the file for
	# it to use.
	FINAL_FILE="${DATE_DIR}/${IMAGE_NAME}"
	if cp "${CURRENT_IMAGE}" "${FINAL_FILE}" ; then

		TIMELAPSE_MINI_IMAGES="$( settings ".minitimelapsenumimages" )"
		TIMELAPSE_MINI_FREQUENCY="$( settings ".minitimelapsefrequency" )"
		if [[ ${TIMELAPSE_MINI_IMAGES} -eq 0 ]]; then
			TIMELAPSE_MINI_UPLOAD_VIDEO="false"

		elif [[ ${TIMELAPSE_MINI_FREQUENCY} -ne 1 ]]; then
			TIMELAPSE_MINI_FORCE_CREATION="$( settings ".minitimelapseforcecreation" )"
			# We are creating mini-timelapses; see if we should create one now.

			CREATE="false"
			MOD=0

			# See how many images we have and how many are left.
			MINI_TIMELAPSE_FILES="${ALLSKY_TMP}/mini-timelapse_files.txt"	 # List of files
			if [[ ! -f ${MINI_TIMELAPSE_FILES} ]]; then
				# The file may have been deleted for an unknown reason.
				echo "${FINAL_FILE}" > "${MINI_TIMELAPSE_FILES}"
				NUM_IMAGES=1
				LEFT=$((TIMELAPSE_MINI_IMAGES - NUM_IMAGES))
			else
				if ! grep --silent "${FINAL_FILE}" "${MINI_TIMELAPSE_FILES}" ; then
					echo "${FINAL_FILE}" >> "${MINI_TIMELAPSE_FILES}"
				elif [[ ${ALLSKY_DEBUG_LEVEL} -ge 1 ]]; then
					# This shouldn't happen...
					echo -e "${YELLOW}${ME} WARNING: '${FINAL_FILE}' already in set.${NC}" >&2
				fi
				NUM_IMAGES=$( wc -l < "${MINI_TIMELAPSE_FILES}" )
				LEFT=$((TIMELAPSE_MINI_IMAGES - NUM_IMAGES))
				MOD="$( echo "${NUM_IMAGES} % ${TIMELAPSE_MINI_FREQUENCY}" | bc )"

				# If either of the following are true we'll create the mini-timelapse:
				#	1. We have ${TIMELAPSE_MINI_IMAGES}  (i.e., ${LEFT} -eq 0)
				#	2. ${TIMELAPSE_MINI_FORCE_CREATION} == true AND we're at a 
				#		${TIMELAPSE_MINI_FREQUENCY} boundary (i.e., ${MOD} -eq 0)

				if [[ ${LEFT} -le 0 ||
						( ${TIMELAPSE_MINI_FORCE_CREATION} == "true" && ${MOD} -eq 0 ) ]]; then
					CREATE="true"
				fi
			fi

			if [[ ${CREATE} == "true" ]]; then
				# Create a mini-timelapse
				# This ALLSKY_DEBUG_LEVEL should be same as what's in upload.sh
				# This causes timelapse.sh to print "before" and "after" debug messages.
				if [[ ${ALLSKY_DEBUG_LEVEL} -ge 3 ]]; then
					echo -e "NUM_IMAGES=${NUM_IMAGES}"
					D="--debug"
				else
					D="--no-debug"
				fi
				O="${ALLSKY_TMP}/mini-timelapse.mp4"

				"${ALLSKY_SCRIPTS}/timelapse.sh" --Last "$( basename "${FINAL_FILE}" )" \
					"${D}" --lock --output "${O}" --mini --images "${MINI_TIMELAPSE_FILES}"
				if [[ $? -eq 0 ]]; then
					# Remove the oldest files if we haven't reached the limit.
					if [[ ${LEFT} -le 0 ]]; then
						KEEP=$((TIMELAPSE_MINI_IMAGES - TIMELAPSE_MINI_FREQUENCY))
						x="$( tail -${KEEP} "${MINI_TIMELAPSE_FILES}" )"
						echo -e "${x}" > "${MINI_TIMELAPSE_FILES}"
						if [[ ${ALLSKY_DEBUG_LEVEL} -ge 3 ]]; then
							echo -en "${YELLOW}${ME}: Replaced ${TIMELAPSE_MINI_FREQUENCY} oldest"
							echo -e " timelapse file(s).${NC}" >&2
						fi
					fi
				else
					# failed so don't try to upload
					TIMELAPSE_MINI_UPLOAD_VIDEO="false"
				fi

			else
				# Not ready to create yet
				if [[ ${ALLSKY_DEBUG_LEVEL} -ge 3 ]]; then
					echo -n "NUM_IMAGES=${NUM_IMAGES}: Not creating mini-timelapse: "
					if [[ ${MOD} -eq 0 ]]; then
						echo "${LEFT} images(s) left."		# haven't reached limit
					else
						echo "$((TIMELAPSE_MINI_FREQUENCY - MOD)) images(s) left in frequency."
					fi
				fi
				TIMELAPSE_MINI_UPLOAD_VIDEO="false"
			fi
		fi

	else
		echo "*** ERROR: ${ME}: unable to copy ${CURRENT_IMAGE} ***"
		SAVE_IMAGE="false"
		TIMELAPSE_MINI_UPLOAD_VIDEO="false"			# so we can easily compare below
	fi
fi

if [[ ${TIMELAPSE_MINI_UPLOAD_VIDEO} == "false" ]]; then
	# Don't deleate a lock file that belongs to another running process.
	ALLSKY_TIMELAPSE_PID_FILE=""
fi

# If upload is true, optionally create a smaller version of the image; either way, upload it
IMG_UPLOAD_FREQUENCY="$( settings ".imageuploadfrequency" )"
if [[ ${IMG_UPLOAD_FREQUENCY} -gt 0 ]]; then
	# First check if we should upload this image
	if [[ ${IMG_UPLOAD_FREQUENCY} -ne 1 ]]; then
		FREQUENCY_FILE="${ALLSKY_TMP}/IMG_UPLOAD_FREQUENCY.txt"
		if [[ ! -f ${FREQUENCY_FILE} ]]; then
			# The file may have been deleted, or the user may have just changed the frequency.
			LEFT=${IMG_UPLOAD_FREQUENCY}
		else
			LEFT=$( < "${FREQUENCY_FILE}" )
		fi
		if [[ ${LEFT} -le 1 ]]; then
			# Reset the counter then upload this image below.
			if [[ "${ALLSKY_DEBUG_LEVEL}" -ge 3 ]]; then
				echo "${ME}: resetting LEFT counter to ${IMG_UPLOAD_FREQUENCY}, then uploading image."
			fi

			echo "${IMG_UPLOAD_FREQUENCY}" > "${FREQUENCY_FILE}"
		else
			# Not ready to upload yet, so decrement the counter
			LEFT=$((LEFT - 1))
			echo "${LEFT}" > "${FREQUENCY_FILE}"
			# This ALLSKY_DEBUG_LEVEL should be same as what's in upload.sh
			[[ ${ALLSKY_DEBUG_LEVEL} -ge 3 ]] && echo "${ME}: Not uploading image: ${LEFT} images(s) left."

			IMG_UPLOAD_FREQUENCY=0
		fi
	fi
fi

# image.jpg and mini-timelapse overwrite the prior files so are not copied to a local Website.
# Instead, the local Website points to the files in ${SAVE_DIR}.

RET=0
if [[ ${IMG_UPLOAD_FREQUENCY} -gt 0 ]]; then
	R_WEB="$( settings ".useremotewebsite" )"
	R_SERVER="$( settings ".useremoteserver" )"

	if [[ ${R_WEB} == "true" || ${R_SERVER} == "true" ]]; then
		W="$( settings ".imageresizeuploadswidth" )"
		H="$( settings ".imageresizeuploadsheight" )"
		if [[ ${W} -gt 0 && ${H} -gt 0 ]]; then
			RESIZE_UPLOADS="true"
		else
			RESIZE_UPLOADS="false"
		fi
		if [[ ${RESIZE_UPLOADS} == "true" ]]; then
			# Need a copy of the image since we are going to resize it.
			# Put the copy in ${WORKING_DIR}.
			FILE_TO_UPLOAD="${WORKING_DIR}/resize-${IMAGE_NAME}"
			S="${W}x${H}"
			[[ "${ALLSKY_DEBUG_LEVEL}" -ge 3 ]] && echo "${ME}: Resizing upload file '${FILE_TO_UPLOAD}' to ${S}"
			if ! convert "${CURRENT_IMAGE}" -resize "${S}" -gravity East -chop 2x0 "${FILE_TO_UPLOAD}" ; then
				echo -e "${YELLOW}*** ${ME}: WARNING: Resize Uploads failed; continuing with larger image.${NC}"
				# We don't know the state of $FILE_TO_UPLOAD so use the larger file.
				FILE_TO_UPLOAD="${CURRENT_IMAGE}"
			fi
		else
			FILE_TO_UPLOAD="${CURRENT_IMAGE}"
		fi

		if [[ ${R_WEB} == "true" ]]; then
			if [[ $( settings ".remotewebsiteimageuploadoriginalname" ) == "true" ]]; then
				DESTINATION_NAME=""
			else
				DESTINATION_NAME="${FULL_FILENAME}"
			fi
			# Goes in root of Website so second arg is "".
			upload_all --remote-web "${FILE_TO_UPLOAD}" "" "${DESTINATION_NAME}" "SaveImage"
			((RET += $?))
		fi

		if [[ ${R_SERVER} == "true" ]]; then
			if [[ $( settings ".remoteserverimageuploadoriginalname" ) == "true" ]]; then
				DESTINATION_NAME=""
			else
				DESTINATION_NAME="${FULL_FILENAME}"
			fi
			# Goes in root of Website so second arg is "".
			upload_all --remote-server "${FILE_TO_UPLOAD}" "" "${DESTINATION_NAME}" "SaveImage"
			((RET += $?))
		fi

		[[ ${RESIZE_UPLOADS} == "true" ]] && rm -f "${FILE_TO_UPLOAD}"	# was a temporary file
	fi
fi

# If needed, upload the mini timelapse.  If the upload failed above, it will likely fail below.
if [[ ${TIMELAPSE_MINI_UPLOAD_VIDEO} == "true" && ${SAVE_IMAGE} == "true" && ${RET} -eq 0 ]] ; then
	MINI="mini-timelapse.mp4"
	FILE_TO_UPLOAD="${ALLSKY_TMP}/${MINI}"

	upload_all --remote-web --remote-server "${FILE_TO_UPLOAD}" "" "${MINI}" "MiniTimelapse"
	RET=$?
	if [[ ${RET} -eq 0 && $( settings ".minitimelapseuploadthumbnail" ) == "true" ]]; then
		UPLOAD_THUMBNAIL_NAME="mini-timelapse.jpg"
		UPLOAD_THUMBNAIL="${ALLSKY_TMP}/${UPLOAD_THUMBNAIL_NAME}"
		# Create the thumbnail for the mini timelapse, then upload it.
		rm -f "${UPLOAD_THUMBNAIL}"
		make_thumbnail "00" "${FILE_TO_UPLOAD}" "${UPLOAD_THUMBNAIL}"
		if [[ ! -f ${UPLOAD_THUMBNAIL} ]]; then
			echo "${ME}: Mini timelapse thumbnail not created!"
		else
			# Use --silent because we just displayed message(s) above for this image.
			upload_all --remote-web --remote-server --silent \
				"${UPLOAD_THUMBNAIL}" \
				"" \
				"${UPLOAD_THUMBNAIL_NAME}" \
				"MiniThumbnail"
		fi
	fi
fi

# We're done so remove the lock file.
[[ -n ${ALLSKY_TIMELAPSE_PID_FILE} ]] && rm -f "${ALLSKY_TIMELAPSE_PID_FILE}"

# We create ${WEBSITE_FILE} as late as possible to avoid it being overwritten.
mv "${SAVED_FILE}" "${WEBSITE_FILE}"

set_allsky_status "${ALLSKY_STATUS_RUNNING}"

exit 0
