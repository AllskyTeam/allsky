#!/bin/bash
# shellcheck disable=SC2154		# referenced but not assigned - from convertJSON.php

# Script to save a DAY or NIGHT image.
# It goes in ${ALLSKY_CURRENT_DIR} where the WebUI and local Allsky Website can find it.

ME="$( basename "${BASH_ARGV0}" )"
[[ ${ALLSKY_DEBUG_LEVEL} -ge 3 ]] && echo "${ME} $*"

#shellcheck disable=SC1091 source-path=.
source "${ALLSKY_HOME}/variables.sh"		|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"		|| exit "${EXIT_ERROR_STOP}"

usage_and_exit()
{
	local RET=${1}
	exec >&2
	local MSG="Usage: ${ME} DAY|NIGHT  full_path_to_image  [variable=value [...]]"
	if [[ ${RET} -ne 0 ]]; then
		E_ "${MSG}"
	else
		echo -e "${MSG}"
	fi

	exit "${RET}"
}
[[ $# -lt 2 ]] && usage_and_exit 1

# Export so other scripts can use it.
export DAY_OR_NIGHT="${1}";		export AS_DAY_OR_NIGHT="${DAY_OR_NIGHT}"
[[ ${DAY_OR_NIGHT} != "DAY" && ${DAY_OR_NIGHT} != "NIGHT" ]] && usage_and_exit 1

# ${CURRENT_IMAGE} is the full path to a uniquely-named file created by the capture program.
# The file name is its final name in the ${ALLSKY_IMAGES}/<date> directory.
# Because it's a unique name we don't have to worry about another process overwritting it.
# We modify the file as needed and ultimately save a link to it as ${ALLSKY_FULL_FILENAME} since
# that's what websites look for and what is uploaded.

# Export so other scripts can use it.
export CURRENT_IMAGE="${2}";		export AS_CURRENT_IMAGE="${CURRENT_IMAGE}"
shift 2
if [[ ! -f ${CURRENT_IMAGE} ]] ; then
	E_ "*** ${ME}: ERROR: File '${CURRENT_IMAGE}' not found; ignoring."
	exit 2
fi
if [[ ! -s ${CURRENT_IMAGE} ]] ; then
	E_ "*** ${ME}: ERROR: File '${CURRENT_IMAGE}' is empty; ignoring."
	exit 2
fi

WORKING_DIR=$( dirname "${CURRENT_IMAGE}" )		# the directory the image is currently in
WEBSITE_FILE="${WORKING_DIR}/${ALLSKY_FULL_FILENAME}"	# The file name the websites look for
CURRENT_ALLSKY_STATUS="$( get_allsky_status )"
# Only update if different so we don't loose original timestamp
if [[ ${CURRENT_ALLSKY_STATUS} != "${ALLSKY_STATUS_RUNNING}" ]]; then
	set_allsky_status "${ALLSKY_STATUS_RUNNING}" || echo "Unable to set Allsky Status"
fi

if [[ ${1} == "--focus-mode" ]]; then
	# Add the metric to the image, rename it, and exit.
	FOCUS_METRIC="${2}"
	NUM_EXPOSURES="${3}"
	TEXT="Focus Mode, metric = ${FOCUS_METRIC}"
	TEXT+="\nFrame: ${NUM_EXPOSURES}"
	# Use defaults for everything but Y location - put near top.
	addTextToImage --y 100 "${CURRENT_IMAGE}" "${CURRENT_IMAGE}" "${TEXT}"
	mv "${CURRENT_IMAGE}" "${WEBSITE_FILE}"
	exit $?
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

# This gets all settings and prefixes their names with "S_".
# It's faster than calling "settings()" a bunch of times.
#shellcheck disable=SC2119
getAllSettings || exit 1

# Get passed-in variables and export as AS_* so overlays can use them.
while [[ $# -gt 0 ]]; do
	VARIABLE="AS_${1%=*}"		# everything before the "="
	VALUE="${1##*=}"			# everything after  the "="
	shift
	# Export the variable so other scripts we call can use it.
	# shellcheck disable=SC2086
	export ${VARIABLE}="${VALUE}"	# need "export" to get indirection to work
done
# Export other variables so user can use them in overlays
export AS_CAMERA_TYPE="${CAMERA_TYPE}"
export AS_CAMERA_MODEL="${CAMERA_MODEL}"
export AS_CAMERA_NUMBER="${CAMERA_NUMBER}"

# The image may be in a memory filesystem, so do all the processing there and
# leave the image used by the website(s) in that directory.
IMAGE_NAME=$( basename "${CURRENT_IMAGE}" )		# just the file name

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
if [[ ${S_takedarkframes} == "true" ]]; then
	#shellcheck source-path=scripts
	source "${ALLSKY_SCRIPTS}/darkCapture.sh"
	exit 0
fi

# TODO: Dark subtract long-exposure images, even if during daytime.
# TODO: Need a config variable to specify the threshold to dark subtract.
if [[ ${S_usedarkframes} == "true" ]]; then
	if [[ ${DAY_OR_NIGHT} == "NIGHT" ]]; then
		#shellcheck source-path=scripts
		source "${ALLSKY_SCRIPTS}/darkSubtract.sh"	# It will modify the image but not its name.
	fi
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
	"${ALLSKY_SCRIPTS}/copyNotificationImage.sh" --expires 15 "custom" \
		"red" "" "85" "" "" "" "10" "red" "${ALLSKY_EXTENSION}" "" \
		"*** ERROR ***\nAllsky Stopped!\nInvalid ${NOTIFICATION_STRING} settings\nSee\n/var/log/allsky.log"

	# Don't let the service restart us because we will get the same error again.
	stop_Allsky
	set_allsky_status "${ALLSKY_STATUS_ERROR}"
	exit "${EXIT_ERROR_STOP}"
}

# Resize the image if required
export AS_RESIZE_WIDTH="${S_imageresizewidth}"
export AS_RESIZE_HEIGHT="${S_imageresizeheight}"
if [[ ${AS_RESIZE_WIDTH} -gt 0 && ${AS_RESIZE_HEIGHT} -gt 0 ]]; then
	# Make sure we were given numbers.
	ERROR_MSG=""
	if [[ ${AS_RESIZE_WIDTH} != +([+0-9]) ]]; then		# no negative numbers allowed
		ERROR_MSG+="\n'Image Resize Height' (${AS_RESIZE_WIDTH}) must be a number."
	fi
	if [[ ${AS_RESIZE_HEIGHT} != +([+0-9]) ]]; then
		ERROR_MSG+="\n'Image Resize Width' (${AS_RESIZE_HEIGHT}) must be a number."
	fi
	if [[ -n ${ERROR_MSG} ]]; then
		E_ "*** ${ME}: ERROR: Image resize number(s) invalid."
		display_error_and_exit "${ERROR_MSG}" "Image Resize"
	fi

	S="${AS_RESIZE_WIDTH}x${AS_RESIZE_HEIGHT}"
	# Check if resizing to same size.
	if [[ "${AS_RESOLUTION_X}x${AS_RESOLUTION_Y}" != "${S}" ]]; then
		if [[ ${ALLSKY_DEBUG_LEVEL} -ge 3 ]]; then
			echo "${ME}: Resizing '${CURRENT_IMAGE}' to ${S}"
		fi
		if ! convert "${CURRENT_IMAGE}" -resize "${S}!" "${CURRENT_IMAGE}" ; then
			E_ "*** ${ME}: ERROR: image resize failed; not saving."
			exit 4
		fi

		# The image was just resized and the resolution changed, so reset the variables.
		AS_RESOLUTION_X=${AS_RESIZE_WIDTH}
		AS_RESOLUTION_Y=${AS_RESIZE_HEIGHT}

	elif [[ ${ALLSKY_DEBUG_LEVEL} -ge 3 ]]; then
		echo "${ME}: NOT resizing '${CURRENT_IMAGE}' to same size (${S})"
	fi
fi

# Crop the image if required
CROP_TOP="${S_imagecroptop}"
CROP_RIGHT="${S_imagecropright}"
CROP_BOTTOM="${S_imagecropbottom}"
CROP_LEFT="${S_imagecropleft}"
CROP_IMAGE=$(( CROP_TOP + CROP_RIGHT + CROP_BOTTOM + CROP_LEFT ))		# > 0 if cropping
if [[ ${CROP_IMAGE} -gt 0 ]]; then
	# Perform basic checks on crop settings.
	ERROR_MSG="$( checkCropValues "${CROP_TOP}" "${CROP_RIGHT}" "${CROP_BOTTOM}" "${CROP_LEFT}" \
		"${AS_RESOLUTION_X}" "${AS_RESOLUTION_Y}" 2>&1 )"
	if [[ -z ${ERROR_MSG} ]]; then
		CROP_WIDTH=$(( AS_RESOLUTION_X - CROP_RIGHT - CROP_LEFT ))
		CROP_HEIGHT=$(( AS_RESOLUTION_Y - CROP_TOP - CROP_BOTTOM ))
		if [[ ${ALLSKY_DEBUG_LEVEL} -ge 3 ]]; then
			echo -e "${ME} Cropping '${CURRENT_IMAGE}' to ${CROP_WIDTH}x${CROP_HEIGHT}."
		fi
		C=""
		[[ ${CROP_TOP} -ne 0 ]] && C+=" -gravity North -chop 0x${CROP_TOP}"
		[[ ${CROP_RIGHT} -ne 0 ]] && C+=" -gravity East -chop ${CROP_RIGHT}x0"
		[[ ${CROP_BOTTOM} -ne 0 ]] && C+=" -gravity South -chop 0x${CROP_BOTTOM}"
		[[ ${CROP_LEFT} -ne 0 ]] && C+=" -gravity West -chop ${CROP_LEFT}x0"

		# shellcheck disable=SC2086
		if ! convert "${CURRENT_IMAGE}" ${C} "${CURRENT_IMAGE}" ; then
			E_ "*** ${ME}: ERROR: Unable to crop image; not saving."
			exit 4
		fi
		# The image was just resized and the resolution changed, so reset the variables.
		AS_RESOLUTION_X=${CROP_WIDTH}
		AS_RESOLUTION_Y=${CROP_HEIGHT}
	else
		E_ "*** ${ME}: ERROR: Crop number(s) invalid; not cropping image."
		display_error_and_exit "${ERROR_MSG}" "CROP"
	fi
fi

# Stretch the image if required.
if [[ ${DAY_OR_NIGHT} == "DAY" ]]; then
	export AS_STRETCH_AMOUNT="${S_imagestretchamountdaytime}"
	export AS_STRETCH_MIDPOINT="${S_imagestretchmidpointdaytime}"
else
	export AS_STRETCH_AMOUNT="${S_imagestretchamountnighttime}"
	export AS_STRETCH_MIDPOINT="${S_imagestretchmidpointnighttime}"
fi
if [[ ${AS_STRETCH_AMOUNT} -gt 0 ]]; then
	if [[ ${ALLSKY_DEBUG_LEVEL} -ge 3 ]]; then
		echo "${ME}: Stretching '${CURRENT_IMAGE}' by ${AS_STRETCH_AMOUNT} @ ${AS_STRETCH_MIDPOINT}%"
	fi
 	convert "${CURRENT_IMAGE}" -sigmoidal-contrast \
		"${AS_STRETCH_AMOUNT}x${AS_STRETCH_MIDPOINT}%" "${CURRENT_IMAGE}"
	if [[ $? -ne 0 ]]; then
		E_ "*** ${ME}: ERROR: Unable to stretch image; not saving."
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
export AS_DATE_NAME="${DATE_NAME}"

activate_python_venv
python3 "${ALLSKY_SCRIPTS}/flow-runner.py"
deactivate_python_venv

# The majority of the post-processing time for an image is in flow-runner.py.
# Since only one mini-timelapse can run at once and that code is embeded in this code
# in several places, remove our PID lock now.
rm -f "${PID_FILE}"

TIMELAPSE_MINI_UPLOAD_VIDEO="${S_minitimelapseupload}"
# If needed, save the current image in today's directory.
if [[ ( ${S_savedaytimeimages} == "true" && ${DAY_OR_NIGHT} == "DAY" ) || 
	  ( ${S_savenighttimeimages} == "true" && ${DAY_OR_NIGHT} == "NIGHT" ) ]]; then
	SAVE_IMAGE="true"
else
	SAVE_IMAGE="false"
fi
if [[ ${SAVE_IMAGE} == "true" ]]; then
	# Determine what directory is the final resting place.
	DATE_DIR="${ALLSKY_IMAGES}/${DATE_NAME}"
	[[ ! -d ${DATE_DIR} ]] && mkdir -p "${DATE_DIR}"

	if [[ ${S_imagecreatethumbnails} == "true" ]]; then
		THUMBNAILS_DIR="${DATE_DIR}/thumbnails"
		mkdir -p "${THUMBNAILS_DIR}"
		# Create a thumbnail of the image for faster load in the WebUI.
		# If we resized above, this will be a resize of a resize,
		# but for thumbnails that should be ok.
		S="${S_thumbnailsizex}x${S_thumbnailsizey}!"
		if ! convert "${CURRENT_IMAGE}" -resize "${S}" "${THUMBNAILS_DIR}/${IMAGE_NAME}" ; then
			W_ "*** ${ME}: WARNING: THUMBNAIL resize failed; continuing."
		fi
	fi

	# The web server can't handle symbolic links so we need to make a copy of the file for
	# it to use.
	FINAL_FILE="${DATE_DIR}/${IMAGE_NAME}"
	if cp "${CURRENT_IMAGE}" "${FINAL_FILE}" ; then

		TIMELAPSE_MINI_IMAGES="${S_minitimelapsenumimages}"
		TIMELAPSE_MINI_FREQUENCY="${S_minitimelapsefrequency}"
		if [[ ${TIMELAPSE_MINI_IMAGES} -eq 0 ]]; then
			TIMELAPSE_MINI_UPLOAD_VIDEO="false"

		elif [[ ${TIMELAPSE_MINI_FREQUENCY} -ne 1 ]]; then
			TIMELAPSE_MINI_FORCE_CREATION="${S_minitimelapseforcecreation}"
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
					W_ "${ME} WARNING: '${FINAL_FILE}' already in set." >&2
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
				if [[ ${ALLSKY_DEBUG_LEVEL} -ge 4 ]]; then
					echo -e "NUM_IMAGES=${NUM_IMAGES}"
					D="--debug"
				else
					D="--no-debug"
				fi

				"${ALLSKY_SCRIPTS}/timelapse.sh" --Last "$( basename "${FINAL_FILE}" )" \
					"${D}" --lock --output "${ALLSKY_MINITIMELAPSE_FILE}" --mini \
					--images "${MINI_TIMELAPSE_FILES}"
				if [[ $? -ne 0 ]]; then
					# failed so don't try to upload
					TIMELAPSE_MINI_UPLOAD_VIDEO="false"
				fi

				# Remove the oldest files if we haven't reached the limit.
				if [[ ${LEFT} -le 0 ]]; then
					KEEP=$((TIMELAPSE_MINI_IMAGES - TIMELAPSE_MINI_FREQUENCY))
					x="$( tail "-${KEEP}" "${MINI_TIMELAPSE_FILES}" )"
					echo -e "${x}" > "${MINI_TIMELAPSE_FILES}"
					if [[ ${ALLSKY_DEBUG_LEVEL} -ge 3 ]]; then
						MSG="${ME}: Replaced ${TIMELAPSE_MINI_FREQUENCY} oldest, LEFT=$LEFT, KEEP=$KEEP"
						MSG+=" timelapse file(s)."
						W_ "${MSG}" >&2
					fi
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
		E_ "*** ERROR: ${ME}: unable to copy ${CURRENT_IMAGE} ***"
		SAVE_IMAGE="false"
		TIMELAPSE_MINI_UPLOAD_VIDEO="false"			# so we can easily compare below
	fi
fi

if [[ ${TIMELAPSE_MINI_UPLOAD_VIDEO} == "false" ]]; then
	# Don't deleate a lock file that belongs to another running process.
	ALLSKY_TIMELAPSE_PID_FILE=""
fi

# If upload is true, optionally create a smaller version of the image; either way, upload it
IMG_UPLOAD_FREQUENCY="${S_imageuploadfrequency}"
if [[ ${IMG_UPLOAD_FREQUENCY} -gt 0 ]]; then
	# First check if we should upload this image
	if [[ ${IMG_UPLOAD_FREQUENCY} -ne 1 ]]; then
		if [[ ! -f ${ALLSKY_FREQUENCY_FILE} ]]; then		# global variable
			# The file may have been deleted, or the user may have just changed the frequency.
			LEFT=${IMG_UPLOAD_FREQUENCY}
		else
			LEFT=$( < "${ALLSKY_FREQUENCY_FILE}" )
		fi
		if [[ ${LEFT} -le 1 ]]; then
			# Reset the counter then upload this image below.
			if [[ "${ALLSKY_DEBUG_LEVEL}" -ge 3 ]]; then
				echo "${ME}: resetting LEFT counter to ${IMG_UPLOAD_FREQUENCY}, then uploading image."
			fi

			echo "${IMG_UPLOAD_FREQUENCY}" > "${ALLSKY_FREQUENCY_FILE}"
		else
			# Not ready to upload yet, so decrement the counter
			LEFT=$((LEFT - 1))
			echo "${LEFT}" > "${ALLSKY_FREQUENCY_FILE}"
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
	R_WEB="${S_useremotewebsite}"
	R_SERVER="${S_useremoteserver}"

	if [[ ${R_WEB} == "true" || ${R_SERVER} == "true" ]]; then
		W="${S_imageresizeuploadswidth}"
		H="${S_imageresizeuploadsheight}"
		if [[ ${W} -gt 0 && ${H} -gt 0 ]]; then
			RESIZE_UPLOADS="true"
			# Need a copy of the image since we are going to resize it.
			# Put the copy in ${WORKING_DIR}.
			FILE_TO_UPLOAD="${WORKING_DIR}/resize-${IMAGE_NAME}"
			S="${W}x${H}!"
			if [[ "${ALLSKY_DEBUG_LEVEL}" -ge 3 ]]; then
				echo "${ME}: Resizing upload file '${FILE_TO_UPLOAD}' to ${S/!/}"
			fi
			if ! convert "${CURRENT_IMAGE}" -resize "${S}" -gravity East -chop 2x0 "${FILE_TO_UPLOAD}" ; then
				W_ "*** ${ME}: WARNING: Resize Uploads failed; continuing with larger image."
				# We don't know the state of $FILE_TO_UPLOAD so use the larger file.
				FILE_TO_UPLOAD="${CURRENT_IMAGE}"
			fi
		else
			RESIZE_UPLOADS="false"
			FILE_TO_UPLOAD="${CURRENT_IMAGE}"
		fi

		if [[ ${R_WEB} == "true" ]]; then
			if [[ ${S_remotewebsiteimageuploadoriginalname} == "true" ]]; then
				DESTINATION_NAME=""
			else
				DESTINATION_NAME="${ALLSKY_FULL_FILENAME}"
			fi
			# Goes in root of Website so second arg is "".
			upload_all --remote-web "${FILE_TO_UPLOAD}" "" "${DESTINATION_NAME}" "SaveImage"
			((RET += $?))
		fi

		if [[ ${R_SERVER} == "true" ]]; then
			if [[ ${S_remoteserverimageuploadoriginalname} == "true" ]]; then
				DESTINATION_NAME=""
			else
				DESTINATION_NAME="${ALLSKY_FULL_FILENAME}"
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
	FILE_TO_UPLOAD="${ALLSKY_MINITIMELAPSE_FILE}"

	upload_all --remote-web --remote-server "${FILE_TO_UPLOAD}" "" "${ALLSKY_MINITIMELAPSE_NAME}" "MiniTimelapse"
	RET=$?
	if [[ ${RET} -eq 0 && ${S_minitimelapseuploadthumbnail} == "true" ]]; then
		UPLOAD_THUMBNAIL_NAME="${ALLSKY_MINITIMELAPSE_NAME/.mp4/.jpg}"
		UPLOAD_THUMBNAIL="${ALLSKY_CURRENT_DIR}/${UPLOAD_THUMBNAIL_NAME}"
		# Create the thumbnail for the mini timelapse, then upload it.
		rm -f "${UPLOAD_THUMBNAIL}"
		make_thumbnail "00" "${FILE_TO_UPLOAD}" "${UPLOAD_THUMBNAIL}"
		if [[ ! -f ${UPLOAD_THUMBNAIL} ]]; then
			echo "${ME}: WARNING: Mini timelapse thumbnail not created!"
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
mv "${CURRENT_IMAGE}" "${WEBSITE_FILE}" || echo "ERROR: ${ME} Unable to rename current image to final name." >&2

exit 0
