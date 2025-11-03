#!/bin/bash
# shellcheck disable=SC2154		# referenced but not assigned - from convertJSON.php


# Check the Allsky installation and settings for missing items,
# inconsistent items, illegal items, etc.

# TODO: Within a heading, group by topic, e.g., all IMG_* together.
# TODO: Right now the checks within each heading are in the order I thought of them!

# Allow this script to be executed manually, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck disable=SC1091 source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh" 				|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/installUpgradeFunctions.sh"	|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/checkFunctions.sh"			|| exit "${EXIT_ERROR_STOP}"

usage_and_exit()
{
	local RET=${1}

	exec >&2
	local MSG="Usage: ${ME} [--help] [--fromWebUI] [--no-info] [--no-warn] [--no-error]"
	echo
	if [[ ${RET} -eq 0 ]]; then
		echo -e "${MSG}"
	else
		wE_ "${MSG}"
	fi
	echo "Arguments:"
	echo "   --help        Display this message and exit."
	echo "   --fromWebUI   Format output to be displayed in the WebUI."
	echo "   --no-info     Skip checking for Informational items."
	echo "   --no-warn     Skip checking for Warning items."
	echo "   --no-error    Skip checking for Error items."
	echo
	exit "${RET}"
}

# Check arguments
OK="true"
HELP="false"
FROM_WEBUI="false"
CHECK_INFORMATIONAL="true"
CHECK_WARNINGS="true"
CHECK_ERRORS="true"
while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
		--help)
			HELP="true"
			;;
		--fromwebui)
			FROM_WEBUI="true"
			;;
		--no-info)
			CHECK_INFORMATIONAL="false"
			;;
		--no-warn)
			CHECK_WARNINGS="false"
			;;
		--no-error)
			CHECK_ERRORS="false"
			;;
		*)
			wE_ "Unknown argument: '${ARG}'." >&2
			OK="false"
			;;
	esac
	shift
done
[[ ${HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" ]] && usage_and_exit 1

NUM_INFOS=0
NUM_WARNINGS=0
NUM_ERRORS=0

NUM_HEADER_CALLS=0
function heading()
{
	local HEADER="${1}"

	((NUM_HEADER_CALLS++))
	local SUB_HEADER=""
	local DISPLAY_HEADER="false"
	case "${HEADER}" in
		Information)
			((NUM_INFOS++))
			if [[ ${NUM_INFOS} -eq 1 ]]; then
				DISPLAY_HEADER="true"
				SUB_HEADER=" (items that will not stop any part of Allsky from running)"
			fi
			;;
		Warning)
			((NUM_WARNINGS++))
			if [[ ${NUM_WARNINGS} -eq 1 ]]; then
				DISPLAY_HEADER="true"
				SUB_HEADER=" (items that may keep parts of Allsky running)"
			fi
			;;
		Error)
			((NUM_ERRORS++))
			if [[ ${NUM_ERRORS} -eq 1 ]]; then
				DISPLAY_HEADER="true"
				SUB_HEADER=" (items that may keep Allsky from running)"
			fi
			;;
		Summary)
			DISPLAY_HEADER="true"
			;;
		*)
			wE_ "INTERNAL ERROR in heading(): Unknown HEADER '${HEADER}'." >&2
			;;
	esac

	if [[ ${DISPLAY_HEADER} == "true" ]]; then
		[[ ${NUM_HEADER_CALLS} -gt 1 ]] && echo -e "${wBR}"
		echo -ne "${STRONGs}---------- ${HEADER}${SUB_HEADER} ----------${STRONGe}${wBR}"
	else
		echo -ne "${STRONGs}-----${STRONGe}${wBR}"
	fi
}


# =================================================== FUNCTIONS

FIX="${wBOLD}FIX${wNBOLD}"
[[ ${FROM_WEBUI} == "false" ]] && wBR="\n"		# May not be defined elsewhere

# Return the min of two numbers.
function min()
{
	local ONE="${1}"
	local TWO="${2}"
	if [[ ${ONE} -lt ${TWO} ]]; then
		echo "${ONE}"
	else
		echo "${TWO}"
	fi
}

# Make sure the env file exists.
function check_for_env_file()
{
	[[ -s ${ALLSKY_ENV} ]] && return 0

	heading "Error"
	if [[ ! -f ${ALLSKY_ENV} ]]; then
		echo -ne "'${ALLSKY_ENV}' not found!${wBR}"
	else
		echo -ne "'${ALLSKY_ENV}' is empty!${wBR}"
	fi
	echo -ne "Unable to check any remote Website or server settings.${wBR}" >&2
	return 1
}
if check_for_env_file ; then
	ENV_EXISTS="true"
else
	ENV_EXISTS="false"
fi

# Get all settings.  Give each set a different prefix to avoid name conflicts.
if ! X="$( "${ALLSKY_SCRIPTS}/convertJSON.php" --prefix S_ --shell )" ; then
	echo -en "${X}${wBR}" >&2
	exit 1
fi
eval "${X}"

if [[ ${ENV_EXISTS} == "true" ]]; then
	X="$( "${ALLSKY_SCRIPTS}/convertJSON.php" --prefix E_ --shell --settings-file "${ALLSKY_ENV}" )"
	eval "${X}"
fi

# "convertJSON.php" won't work with the ALLSKY_CC_FILE since it has arrays.
C_sensorWidth="$( settings ".sensorWidth" "${ALLSKY_CC_FILE}" )"	# Physical sensor size.
C_sensorHeight="$( settings ".sensorHeight" "${ALLSKY_CC_FILE}" )"

# Return 0 if the number is 0.0, else return 1.
function is_zero()
{
	local NUM="${1}"
	gawk -v n="${NUM}" 'BEGIN {if (n == 0.0) exit 0; else exit 1; }'
}

# Return 0 if the number 0.0 - 1.0, else return 1.
function is_within_range()
{
	local NUM="${1}"
	local LOW="${2:-0.0}"
	local HIGH="${3:-1.0}"
	gawk -v n="${NUM}" -v low="${LOW}" -v high="${HIGH}" '
		BEGIN {if (n < low || n > high) exit 1; exit 0; }'
}

# Typical minimum daytime and nighttime exposures.
DAY_MIN_EXPOSURE_MS=250
NIGHT_MIN_EXPOSURE_MS=5000
# Minimum total time spent on each image.
DAY_MIN_IMAGE_TIME_MS=$(( DAY_MIN_EXPOSURE_MS + S_daydelay ))
NIGHT_MIN_IMAGE_TIME_MS=$(( NIGHT_MIN_EXPOSURE_MS + S_nightdelay ))
MIN_IMAGE_TIME_MS="$( min "${DAY_MIN_IMAGE_TIME_MS}" "${NIGHT_MIN_IMAGE_TIME_MS}" )"

##### Check if the delay is so short it's likely to cause problems.
function check_delay()
{
	local DAY_OR_NIGHT="${1}"
	local DELAY_MS  MIN_MS  L

	if [[ ${DAY_OR_NIGHT} == "Daytime" ]]; then
		L="${S_daydelay_label}"
		DELAY_MS="${S_daydelay}"
		MIN_MS="${DAY_MIN_IMAGE_TIME_MS}"
	else
		L="${S_nightdelay_label}"
		DELAY_MS="${S_nightdelay}"
		MIN_MS="${NIGHT_MIN_IMAGE_TIME_MS}"
	fi

# TODO: use the module average flow times for day and night.
	# It can take up to 5 seconds to save an image
	MAX_TIME_TO_PROCESS_MS=5000
	if [[ ${MIN_MS} -lt ${MAX_TIME_TO_PROCESS_MS} ]]; then
		heading "Warning"
		echo "The ${WSNs}${L}${WSNe} of ${DELAY_MS} ms may be too short given the"
		echo -ne "maximum expected time to save and process an image (${MAX_TIME_TO_PROCESS_MS} ms).${wBR}"
		echo -ne "A new image may appear before the prior one has finished processing.${wBR}"
		echo -ne "${FIX}: Consider increasing ${L}.${wBR}"
	fi
}

#
# ====================================================== MAIN PART OF PROGRAM
#

if [[ ${S_uselocalwebsite} == "true" ||
	  ${S_useremotewebsite} == "true" ||
	  ${S_useremoteserver} == "true" ]]; then
	USE_SOMETHING="true"
else
	USE_SOMETHING="false"
fi

# ======================================================================
# ================= Check for informational items.

if [[ ${CHECK_INFORMATIONAL} == "true" ]]; then

	# Settings used in this section.
	WEBSITES="$( whatWebsites )"

	# Is Allsky set up to take dark frames?  This isn't done often, so if it is, inform the user.
	if [[ ${S_takedarkframes} == "true" ]]; then
		heading "Information"
		echo -ne "${WSNs}${S_takedarkframes_label}${WSNe} is enabled.${wBR}"
		echo -ne "${FIX}: Unset when you are done taking dark frames.${wBR}"
	fi

	if [[ ${S_timelapsekeepsequence} == "true" ]]; then
		heading "Information"
		echo -ne "${WSNs}${S_timelapsekeepsequence_label}${WSNe} in enabled.${wBR}"
		echo -ne "${FIX}: If you are not debugging timelapse videos consider disabling this"
		echo -ne " to save disk space.${wBR}"
	fi

	if [[ ${S_thumbnailsizex} -ne 100 || ${S_thumbnailsizey} -ne 75 ]]; then
		heading "Information"
		echo -ne "You are using a non-standard thumbnail size of ${S_thumbnailsizex}x${S_thumbnailsizey}.${wBR}"
		echo -ne "Please note non-standard sizes have not been thoroughly tested.${wBR}"
		echo -ne "${FIX}: You may need to modify some code to get your thumbnail sizes working.${wBR}"
	fi

	FOREVER="be kept forever or until you manually delete them"
	if [[ ${S_daystokeep} -eq 0 ]]; then
		heading "Information"
		echo -ne  "${WSNs}${S_daystokeep_label}${WSNe} is ${WSVs}0${WSVe}"
		echo -ne " which means images and videos will ${FOREVER}.${wBR}"
		echo -ne "${FIX}: If this is not what you want, change the setting.${wBR}"
	fi

	if [[ (${WEBSITES} == "both" || ${WEBSITES} == "local") &&
			${S_daystokeeplocalwebsite} -eq 0 ]]; then
		heading "Information"
		echo -ne "${WSNs}${S_daystokeeplocalwebsite_label}${WSNe} is ${WSVs}0${WSVe}"
		echo -ne " which means local web images and videos will ${FOREVER}.${wBR}"
		echo -ne "${FIX}: If this is not what you want, change the setting.${wBR}"
	fi
	# S_daystokeepremotewebsite may not be implemented; if so, ignore.
	if [[ (${WEBSITES} == "both" || ${WEBSITES} == "remote") &&
			-n ${S_daystokeepremotewebsite} && ${S_daystokeepremotewebsite} -eq 0 ]]; then
		heading "Information"
		echo -ne "${WSNs}${S_daystokeepremotewebsite_label}${WSNe} is ${WSVs}0${WSVe}"
		echo -ne " which means remote web images and videos will ${FOREVER}.${wBR}"
		echo -ne "${FIX}: If this is not what you want, change the setting.${wBR}"
	fi

	ERR="$( _checkWidthHeight "Resize Image" "image" \
		"${S_imageresizewidth}" "${S_imageresizeheight}" \
	 	"${C_sensorWidth}" "${C_sensorHeight}" 2>&1 )"
	if [[ $? -ne 0 || -n ${ERR} ]]; then
		heading "Information"
		echo -ne "${ERR}${wBR}"
		echo -ne "${FIX}: Change the ${WSNs}${S_imageresizewidth_label}${WSNe} and ${WSNs}${S_imageresizeheight_label}${WSNe} settings.${wBR}"
	fi

	if [[ $((S_imagecroptop + S_imagecropright + S_imagecropbottom + S_imagecropleft)) -gt 0 ]]; then
		ERR="$( checkCropValues "${S_imagecroptop}" "${S_imagecropright}" \
				"${S_imagecropbottom}" "${S_imagecropleft}" \
				"${C_sensorWidth}" "${C_sensorHeight}" )"
		if [[ $? -ne 0 || -n ${ERR} ]]; then
			heading "Information"
			echo -ne "${ERR}${wBR}"
			echo -ne "${FIX}: Check the ${WSNs}Image Crop Top/Right/Bottom/Left${WSNe} settings.${wBR}"
		fi
	fi

	if [[ -n ${S_keogramextraparameters} ]]; then
		# These used to be set in the default S_keogramextraparameters.
		if echo "${S_keogramextraparameters}" |
				grep -E --silent "image-expand|-x|font-size|-S|font-line|-L|font-color|-C" ; then
			heading "Information"
			echo -ne "${WSNs}${S_keogramextraparameters_label}${WSNe} contains one or more of:${wBR}"
			echo -ne "${SPACES}${WSVs}--image-expand${WSVe} or ${WSVs}-x${WSVe}${wBR}"
			echo -ne "${SPACES}${WSVs}--font-size${WSVe} or ${WSVs}-S${WSVe}${wBR}"
			echo -ne "${SPACES}${WSVs}--font-line${WSVe} or ${WSVs}-L${WSVe}${wBR}"
			echo -ne "${SPACES}${WSVs}--font-color${WSVe} or ${WSVs}-C${WSVe}${wBR}"
			echo -ne "${FIX}: These are now separate settings so move them to their own settings.${wBR}"
		fi
	fi
	if [[ -n ${S_keogramfontcolor} && ${S_keogramfontcolor:0:1} == "#" &&
			${#S_keogramfontcolor} -ne 7 && ${#S_keogramfontcolor} -ne 4 ]]; then
		heading "Information"
		echo -ne "${WSNs}${S_keogramfontcolor_label}${WSNe} should have a '#' followed by 6 hex digits; "
		echo -ne "yours has $(( ${#S_keogramfontcolor} - 1)): ${WSVs}${S_keogramfontcolor}${WSVe}.${wBR}"
		echo -ne "${FIX}: Make sure there are 6 digits after the '#', for example: '#ffffff' for white.${wBR}"
	fi

	if ! MSG="$( _check_immediate "${S_extraargs}" "${S_extraargs_label}" )" ; then
		heading "Information"
		echo -ne "${MSG}${wBR}"
		echo -ne "${FIX}: Remove ${WSVs}--immediate${WSVe} from ${WSNs}${S_extraargs_label}${WSNe}.${wBR}"
	fi

fi		# end of checking for informational items



# ======================================================================
# ================= Check for warning items.
#	These are wrong and won't stop Allsky from running, but
#	may break part of Allsky, e.g., uploads may not work.

if [[ ${CHECK_WARNINGS} == "true" ]]; then

	if [[ -z ${S_lastchanged} ]]; then
		heading "Warning"
		echo -ne "Allsky needs to be configured before it will run.${wBR}"
		echo -ne "${FIX}: Go to the ${STRONGs}Allsky Settings${STRONGe} page in the WebUI.${wBR}"
	fi

	if reboot_needed ; then
		heading "Warning"
		echo -ne "The Pi needs to be rebooted before Allsky will start.${wBR}"
		echo -ne "${FIX}: Reboot.${wBR}"
	fi

	check_delay "Daytime"
	check_delay "Nighttime"

	if [[ ${CAMERA_TYPE} == "ZWO" ]]; then
		if [[ ${S_dayautoexposure} == "true" && ${S_dayautogain} == "true" ]]; then
			heading "Warning"
			echo -ne "For ZWO cameras we suggest NOT using both '${S_dayautoexposure_label}'"
			echo -ne " and '${S_dayautogain_label}' at the same time.${wBR}"
			echo -ne "${FIX}: Disable '${S_dayautogain_label}' and set '${S_daygain_label}' to"
			echo -ne " '${S_daymaxautogain_label}'.${wBR}"
		fi
		if [[ ${S_nightautoexposure} == "true" && ${S_nightautogain} == "true" ]]; then
			heading "Warning"
			echo -ne "For ZWO cameras we suggest NOT using both '${S_nightautoexposure_label}'"
			echo -ne " and '${S_nightautogain_label}' at the same time.${wBR}"
			echo -ne "${FIX}: Disable '${S_nightautogain_label}' and set '${S_nightgain_label}' to"
			echo -ne " '${S_nightmaxautogain_label}'.${wBR}"
		fi
	fi

	##### Timelapse and mini-timelapse
	if [[ ${S_timelapsevcodec} == "libx264" ]]; then
		# Check if timelapse size is "too big" and will likely cause an error.
		# This is normally only an issue with the libx264 video codec which has
		# a dimension limit that we put in PIXEL_LIMIT.
		PIXEL_LIMIT=$((8192 * 4320))		# Limit of libx264

		function check_timelapse_size()
		{
			local RESIZED_WIDTH="${1}"		; local RESIZED_WIDTH_LABEL="${2}"
			local RESIZED_HEIGHT="${3}"		; local RESIZED_HEIGHT_LABEL="${4}"
			local W H

			# Determine the final image size and put in ${W} and ${H}.
			# This is dependent on the these, in this order:
			#		if the images is resized, use that size
			#			else if the size is set in the WebUI (WIDTH, HEIGHT), use that size
			#				else use sensor size minus crop amount(s)
			if [[ ${RESIZED_WIDTH} -ne 0 ]]; then
				W="${RESIZED_WIDTH}"
			elif [[ ${S_width} -gt 0 ]]; then
				W="${S_width}"
			else
				W=$(( C_sensorWidth - S_imagecropleft - S_imagecropright ))
			fi
			if [[ ${RESIZED_HEIGHT} -ne 0 ]]; then
				H="${RESIZED_HEIGHT}"
			elif [[ ${S_height} -gt 0 ]]; then
				H="${S_height}"
			else
				H=$(( C_sensorWidth - S_imagecroptop - S_imagecropbottom ))
			fi

			# W * H == total pixels in timelapse
			if [[ $(( W * H )) -gt ${PIXEL_LIMIT} ]]; then
				heading "Warning"
				echo -ne "The ${WSNs}${RESIZED_WIDTH_LABEL}${WSNe} of ${WSVs}${W}${WSVe}"
				echo -ne " and ${WSNs}${RESIZED_HEIGHT_LABEL}${WSNe} of ${WSVs}${H}${WSVe}"
				echo -ne " may cause errors while creating the video.${wBR}"
				echo -ne "${FIX}: Consider either decreasing the video size or decreasing"
				echo -ne " each captured image via resizing and/or cropping.${wBR}"
			fi
		}

	fi

	# Check generate vs upload as well as the bitrate of a timelapse
	function check_timelapse_upload_and_bitrate()
	{
		local TYPE="${1}"				# type of timelapse
		local UPLOAD="${!2}"	; declare -n UPLOAD_LABEL="${2}_label"
		local BITRATE="${!3}"	; declare -n BITRATE_LABEL="${3}_label"
		local W="${!4}"			; declare -n W_LABEL="${4}_label"
		local H="${!5}"			; declare -n H_LABEL="${5}_label"

		if [[ ${S_timelapsevcodec} == "libx264" ]]; then
			check_timelapse_size "${W}" "${W_LABEL}" "${H}" "${H_LABEL}"
		fi

		# If the user doesn't have a Website or remote server there's nothing to upload
		# to so it's not an issue.
		if [[ ${UPLOAD} == "false" && ${USE_SOMETHING} == "true" ]]; then
			heading "Warning"
			echo -n "${TYPE} videos are being created"
			if [[ ${TYPE} == "Daily Timelapse" ]]; then
				echo -ne " (${WSNs}${S_timelapsegenerate_label}${WSNe} = Yes)"
			else
				echo -ne " (${WSNs}${S_minitimelapsenumimages_label}${WSNe} is greater than 0)"
:
			fi
			echo -ne " but not uploaded anywhere (${WSNs}${UPLOAD_LABEL}${WSNe} = No)${wBR}"
			echo -ne "${FIX}: Either disable timelapse generation or (more likely) enable upload.${wBR}"
		fi

		if [[ ${BITRATE: -1} == "k" ]]; then
			heading "Warning"
			echo -ne "${WSNs}${BITRATE_LABEL}${WSNe} should be a number with OUT ${WSVs}k${WSVe}.${wBR}"
			echo -ne "${FIX}: Remove the ${WSVs}k${WSVe} from the bitrate.${wBR}"
		fi
	}

	# Timelapse
	if [[ ${S_timelapsegenerate} == "true" ]]; then	
		check_timelapse_upload_and_bitrate "Daily Timelapse" \
			"S_timelapseupload" "S_timelapsebitrate" \
			"S_timelapsewidth" "S_timelapseheight"

	elif [[ ${S_timelapseupload} == "true" ]]; then
		heading "Warning"
		echo -ne "Daily Timelapse videos are not being created"
		echo -ne " (${WSNs}${S_timelapsegenerate_label}${WSNe} = No)"
		echo -ne " but ${WSNs}${S_timelapseupload_label}${WSNe} = Yes.${wBR}"
		echo -ne "${FIX}: Either create daily timelapse videos or disable upload.${wBR}"
	fi

	# Mini-timelapse
	if [[ ${S_minitimelapsenumimages} -gt 0 ]]; then		# Generating mini-timelapse
		check_timelapse_upload_and_bitrate "Mini-Timelapse" \
			"S_minitimelapseupload" "S_minitimelapsebitrate" \
			"S_minitimelapsewidth" "S_minitimelapseheight"

		# See if there's likely to be a problem with mini-timelapse creations
		# starting before the prior one finishes.
		# This is dependent on:
		#	1. Delay:		the delay between images: min(daydelay, nightdelay)
		#	2. Frequency:	how often mini-timelapse are created (i.e., after how many images)
		# 	3. NumImages:	how many images are used (the more the longer processing takes)
		# 	4. The speed of the Pi - this is the biggest unknown

		# Minimum total time between start of timelapse creations.
		MIN_IMAGE_TIME_SEC=$(( MIN_IMAGE_TIME_MS / 1000 ))
		MIN_TIME_BETWEEN_TIMELAPSE_SEC=$(( S_minitimelapsefrequency * MIN_IMAGE_TIME_SEC ))

		TYPICAL_T=50		# A guess at a "typical" number of images in a timelapse.

		# On a Pi 4, creating a ${TYPICAL_T}-image timelapse takes
		#	- a few seconds on a small ZWO camera
		#	- about a minute with an RPi HQ camera

		if [[ ${CAMERA_TYPE} == "ZWO" ]]; then
			S=3
		else
			S=60
		fi
		EXPECTED_TIME=$( echo "scale=0; (${S_minitimelapsenumimages} / ${TYPICAL_T}) * ${S}" | bc -l )
		if [[ ${EXPECTED_TIME} -gt ${MIN_TIME_BETWEEN_TIMELAPSE_SEC} ]]; then
			heading "Warning"
			echo -n  "Your mini-timelapse settings may cause multiple timelapse to"
			echo -ne " be created simultaneously.${wBR}"
			echo -ne "${FIX}: Consider increasing the ${WSNs}Delay${WSNe} between pictures,${wBR}"
			echo -ne "${SPACES}increasing ${WSNs}${S_minitimelapsefrequency_label}${WSNe},${wBR}"
			echo -ne "${SPACES}decreasing ${WSNs}${S_minitimelapsenumimages_label}${WSNe},${wBR}"
			echo -ne "${SPACES}or a combination of those changes.${wBR}"
			echo -n  "Expected time to create a mini-timelapse on a Pi 4 is"
			echo -n  " ${EXPECTED_TIME} seconds but with your settings one could be created"
			echo -ne " as short as every ${MIN_TIME_BETWEEN_TIMELAPSE_SEC} seconds.${wBR}"
		fi

	elif [[ ${S_minitimelapseupload} == "true" ]]; then
		heading "Warning"
		echo -ne "Mini-timelapse videos are not being created"
		echo -ne " (${WSNs}${S_minitimelapsenumimages_label}${WSNe} = 0)"
		echo -ne " but ${WSNs}${S_minitimelapseupload_label}${WSNe} = Yes${wBR}"
		echo -ne "${FIX}: Either create videos or disable upload.${wBR}"
	fi

	##### Keograms
	if [[ ${S_keogramgenerate} == "true" && ${S_keogramupload} == "false" && ${USE_SOMETHING} == "true" ]]; then
		heading "Warning"
		echo -ne "Keograms are being created (${WSNs}${S_keogramgenerate_label}${WSNe} = Yes)"
		echo -ne " but not uploaded (${WSNs}${S_keogramupload_label}${WSNe} = No)${wBR}"
		echo -ne "${FIX}: Either disable keogram generation or (more likely) enable upload.${wBR}"
	fi
	if [[ ${S_keogramgenerate} == "false" && ${S_keogramupload} == "true" ]]; then
		heading "Warning"
		echo -ne  "Keograms are not being created (${WSNs}${S_keogramgenerate_label}${WSNe} = No)"
		echo -ne " but ${WSNs}${S_keogramupload_label}${WSNe} = Yes${wBR}"
		echo -ne "${FIX}: Either enable keogram generation or disable upload.${wBR}"
	fi

	##### Startrails
# TODO: run "allsky-config get_startrails_info" and see if there are images
# not being used.

	if [[ ${S_startrailsgenerate} == "true" && ${S_startrailsupload} == "false" && ${USE_SOMETHING} == "true" ]]; then
		heading "Warning"
		echo -ne "Startrails are being created (${WSNs}${S_startrailsgenerate_label}${WSNe} = Yes)"
		echo -ne " but not uploaded (${WSNs}${S_startrailsupload_label}${WSNe} = No)${wBR}"
		echo -ne "${FIX}: Either disable startrails generation or (more likely) enable upload.${wBR}"
	fi
	if [[ ${S_startrailsgenerate} == "false" && ${S_startrailsupload} == "true" ]]; then
		heading "Warning"
		echo -ne "Startrails are not being created (${WSNs}${S_startrailsgenerate_label}${WSNe} = No)"
		echo -ne " but ${WSNs}${S_startrailsupload_label}${WSNe} = Yes${wBR}"
		echo -ne "${FIX}: Either enable startrails generation or disable upload.${wBR}"
	fi

	if is_number "${S_startrailsbrightnessthreshold}" ; then
		gawk -v x="${S_startrailsbrightnessthreshold}" ' BEGIN {
			if (x == 0.0) exit 0;
			else if (x == 1.0) exit 1;
			else if (x < 0.0 || x > 1.0) exit 2;
			exit 3;
			}'
		X=$?
	fi
	L="${S_startrailsbrightnessthreshold_label}"
	if [[ ${X} -eq 0 ]]; then
		heading "Warning"
		echo -ne "${WSNs}${L}${WSNe} is 0.0 which means ALL images"
		echo -ne " will be IGNORED when creating startrails.${wBR}"
		echo -ne "${FIX}: Increase the value; start off at 0.1 and adjust if needed.${wBR}"
	elif [[ ${X} -eq 1 ]]; then
		heading "Warning"
		echo -ne "${WSNs}${L}${WSNe} is 1.0 which means ALL images"
		echo -ne " will be USED when creating startrails, even daytime images.${wBR}"
		echo -ne "${FIX}: Decrease the value; start off at 0.1 and adjust if needed.${wBR}"
	elif [[ ${X} -eq 2 ]]; then
		heading "Warning"
		echo -ne "${WSNs}${L}${WSNe} is an invalid value:"
		echo -ne " ${WSVs}${S_startrailsbrightnessthreshold}${WSVe}.${wBR}"
		echo -ne "${FIX}: The value should be between 0.0 and 1.0.${wBR}"
	fi

	##### Images
	if [[ ${S_takedaytimeimages} == "false" && ${S_savedaytimeimages} == "true" ]]; then
		heading "Warning"
		echo -ne "${WSNs}${S_takedaytimeimages_label}${WSNe} of images is off"
		echo -ne " but ${WSNs}${S_savedaytimeimages_label}${WSNe} is on in the WebUI.${wBR}"
		echo -ne "${FIX}: Either enable capture or disable saving.${wBR}"
	fi

	# These are floats which bash doesn't support, so use gawk to compare.
	if ! is_number "${S_imageremovebadlow}" || ! is_within_range "${S_imageremovebadlow}" ; then
		heading "Error"
		echo -ne "${WSNs}${S_imageremovebadlow_label}${WSNe} (${S_imageremovebadlow})"
		echo -ne " must be 0.0 - 1.0, although it's normally around ${WSVs}0.1${WSVe}.${wBR}"
		echo -ne "${FIX}: Set to a vaild number.  ${WSVs}0${WSVe} disables the low threshold check.${wBR}"
	elif is_zero "${S_imageremovebadlow}" ; then
		heading "Warning"
		echo -ne "${WSNs}${S_imageremovebadlow_label}${WSNe} is 0 (disabled).${wBR}"
		echo -ne "${FIX}: Set to a value greater than 0 unless you are debugging issues.${wBR}"
		echo -ne "${SPACES}Try 0.1 and adjust if needed.${wBR}"
	fi
	if ! is_number "${S_imageremovebadhigh}" || ! is_within_range "${S_imageremovebadhigh}" ; then
		heading "Error"
		echo -ne "${WSNs}${S_imageremovebadhigh_label}${WSNe} (${S_imageremovebadhigh})"
		echo -ne " must be 0.0 - 1.0, although it's normally around ${WSVs}0.9${WSVe}.${wBR}"
		echo -ne "${FIX}: Set to a valid number.  ${WSVs}0${WSVe} disables the high threshold check.${wBR}"
	elif is_zero "${S_imageremovebadhigh}" ; then
		heading "Warning"
		echo -ne "${WSNs}${S_imageremovebadhigh_label}${WSNe} is 0 (disabled).${wBR}"
		echo -ne "${FIX}: Set to a value greater than 0 unless you are debugging issues.${wBR}"
		echo -ne "${SPACES}Try 0.9 and adjust if needed.${wBR}"
	fi

	##### Uploads
	if [[ ${S_imageresizeuploadswidth} -ne 0 || ${S_imageresizeuploadswidth} -ne 0 ]]; then
		if [[ ${S_imageuploadfrequency} -eq 0 ]]; then
			heading "Warning"
			echo -ne "${WSNs}${S_imageresizeuploadswidth_label}${WSNe} and / or "
			echo -ne "${WSNs}${S_imageresizeuploadsheight_label}${WSNe} are set"
			echo -ne " but you aren't uploading images (${WSNs}${S_imageuploadfrequency_label}${WSNe} = 0).${wBR}"
			echo -ne "${FIX}: Either don't resize uploaded images or enable upload.${wBR}"
		fi
		if [[ ${S_imageresizeuploadswidth} -eq 0 && ${S_imageresizeuploadsheight} -ne 0 ]]; then
			heading "Warning"
			echo -ne "${WSNs}${S_imageresizeuploadswidth_label}${WSNe} = 0"
			echo -ne " but ${WSNs}${S_imageresizeuploadsheight_label}${WSNe} is greater than 0.${wBR}"
			echo -ne "If one is set the other one must also be set.${wBR}"
			echo -ne "${FIX}: Set both to 0 to disable resizing uploads or both to some value.${wBR}"
		elif [[ ${S_imageresizeuploadswidth} -ne 0 && ${S_imageresizeuploadsheight} -eq 0 ]]; then
			heading "Warning"
			echo -ne "${WSNs}${S_imageresizeuploadsheight_label}${WSNe} > 0"
			echo -ne " but ${WSNs}${S_imageresizeuploadswidth_label}${WSNe} = 0.${wBR}"
			echo -ne "If one is set the other one must also be set.${wBR}"
			echo -ne "${FIX}: Set both to 0 to disable resizing uploads or both to some value.${wBR}"
		fi
	fi

	X="$( check_remote_server "REMOTEWEBSITE"  )"
	RET=$?
	if [[ ${RET} -eq 1 ]]; then
		heading "Warning"
		echo -ne "${X}{$wBR}"
	elif [[ ${RET} -eq 2 ]]; then
		heading "Error"
		echo -ne "${X}{$wBR}"
	fi

	X="$( check_remote_server "REMOTESERVER" )"
	RET=$?
	if [[ ${RET} -eq 1 ]]; then
		heading "Warning"
		echo -ne "${X}{$wBR}"
	elif [[ ${RET} -eq 2 ]]; then
		heading "Error"
		echo -ne "${X}{$wBR}"
	fi

fi		# end of checking for warning items



# ======================================================================
# ================= Check for error items.
#	These are wrong and will likely keep Allsky from running.

if [[ ${CHECK_ERRORS} == "true" ]]; then

	##### Make sure it's a know camera type.
	if [[ ${CAMERA_TYPE} != "ZWO" && ${CAMERA_TYPE} != "RPi" ]]; then
		heading "Error"
		echo -ne "CAMERA_TYPE (${CAMERA_TYPE}) not valid.${wBR}"
		echo -ne "${FIX}: Contact Allsky Team and re-install Allsky.${wBR}"
	fi

	##### Make sure the settings file is properly linked.
	if ! MSG="$( check_settings_link "${ALLSKY_SETTINGS_FILE}" )" ; then
		heading "Error"
		echo -ne "${MSG}${wBR}"
	fi

	function check_bool()
	{
		local B="${1}"
		local LABEL="${2}"
		local SETTING_NAME="${3}"

		if [[ ${B,,} != "true" && ${B,,} != "false" ]]; then
			heading "Error"
			local L="${WSNs}${LABEL}${WSNe} (${SETTING_NAME})."
			echo -ne "${L} must be either 'true' or 'false'.${wBR}"
			if [[ -z ${B} ]]; then
				echo -ne "It is empty.${wBR}"
			else
				echo -ne "It is '${B}'.${wBR}"
			fi
			echo -ne "${FIX}: Contact Allsky Team and re-install Allsky.${wBR}"
		fi
	}

	##### Make sure these booleans have boolean values.
	for i in $( "${ALLSKY_SCRIPTS}/convertJSON.php" --type "boolean" )
	do
		declare -n v="S_${i}"
		declare -n l="S_${i}_label"
		check_bool "${v}" "${l}" "${i}"
	done

	##### Make sure these numbers have numeric values.
	for i in \
		"type=an integer" \
		$( "${ALLSKY_SCRIPTS}/convertJSON.php" --type "integer" ) \
		"type=a float" \
		$( "${ALLSKY_SCRIPTS}/convertJSON.php" --type "float" )
	do
		if [[ ${i} =~ "type=" ]]; then
			T_="${i/type=/}"
			continue
		fi
		declare -n v="S_${i}"
		declare -n l="S_${i}_label"
		if ! is_number "${v}" ; then
			heading "Error"
			if [[ -z ${v} ]]; then
				v="empty"
			else
				v="${WSVs}${v}${WSVe}"
			fi
			echo -ne "${WSNs}${l}${WSNe} (${i}) must be ${T_} number.  It is ${v}.${wBR}"
			echo -ne "${FIX}: See the documenation for valid numbers.${wBR}"
		fi
	done

	##### Check that all required settings are set.  All others are optional.
# TODO: determine from options.json file which are required.
	for i in angle latitude longitude locale
	do
		declare -n v="S_${i}"
		if [[ -z ${v} ]]; then
			heading "Error"
			declare -n l="S_${i}_label"
			echo -ne "${l} must be set.${wBR}"
			echo -ne "${FIX}: Set it in the WebUI then rerun ${ME}.${wBR}"
		fi
	done

	##### Check that the required settings' values are valid.
	if [[ -n ${S_angle} ]] && ! is_number "${S_angle}" ; then
		heading "Error"
		echo -ne "${WSNs}${S_angle_label}${WSNe} (${S_angle}) must be a number.${wBR}"
		echo -ne "${FIX}: Set to a number in the WebUI then rerun ${ME}.${wBR}"
	fi
	if [[ -n ${S_latitude} ]] && 
			! LAT="$( convertLatLong "${S_latitude}" "latitude" 2>&1 )" ; then
		heading "Error"
		echo -ne "${LAT}${wBR}"		# ${LAT} contains the error message
		echo -ne "${FIX}: Correct the ${S_latitude_label} then rerun ${ME}.${wBR}"
	fi
	if [[ -n ${S_longitude} ]] &&
			! LONG="$( convertLatLong "${S_longitude}" "longitude" 2>&1 )" ; then
		heading "Error"
		echo -ne "${LONG}${wBR}"
		echo -ne "${FIX}: Correct the ${S_longitude_label} then rerun ${ME}.${wBR}"
	fi
	if [[ -n ${S_locale} ]] &&
			! MSG="$( _check_locale "${S_locale}" "${S_locale_label}" )" ; then
		heading "Error"
		echo -ne "${MSG}${wBR}"
	fi

	##### Make sure required files exist
	f="${ALLSKY_WEBSITE_CONFIGURATION_FILE}"
	if [[ ${S_uselocalwebsite} == "true" && ! -f ${f} ]]; then
		heading "Error"
		echo -ne "${WSNs}${S_uselocalwebsite_label}${WSNe} is enabled but '${f}' does not exist.${wBR}"
		echo -ne "${FIX}: Either disable ${WSNs}${S_uselocalwebsite_label}${WSNe} or create '${f}.${wBR}"
	fi
	f="${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}"
	if [[ ${S_useremotewebsite} == "true" && ! -f ${f} ]]; then
		heading "Error"
		echo -ne "${WSNs}${S_useremotewebsite_label}${WSNe} is enabled but '${f}' does not exist.${wBR}"
		echo -ne "${FIX}: Either disable ${WSNs}${S_useremotewebsite_label}${WSNe}"
		echo -ne " or run 'cd ~/allsky; ./remoteWebsiteInstall.sh'.${wBR}"
	fi

	##### Check dark frames
	if [[ ${S_usedarkframes} == "true" ]]; then
		if [[ ! -d ${ALLSKY_DARKS} ]]; then
			heading "Error"
			echo -ne "${WSNs}${S_usedarkframes_label}${WSNe} is set but the '${ALLSKY_DARKS}'"
			echo -ne " directory does not exist.${wBR}"
			echo -ne "${FIX}: Either disable the setting or take dark frames.${wBR}"
		else
			NUM_DARKS=$( find "${ALLSKY_DARKS}" -name "*.${ALLSKY_EXTENSION}" 2>/dev/null | wc -l)
			if [[ ${NUM_DARKS} -eq 0 ]]; then
				heading "Error"
				echo -ne "${WSNs}${S_usedarkframes_label}${WSNe} is set but there are no darks"
				echo -ne " in '${ALLSKY_DARKS}' with extension of '${ALLSKY_EXTENSION}'.${wBR}"
				echo -ne "${FIX}: Either disable the setting or take dark frames.${wBR}"
			fi
		fi
	fi

	##### Check for valid numbers.
	if ! is_number "${S_imageuploadfrequency}" || [[ ${S_imageuploadfrequency} -lt 0 ]]; then
		heading "Error"
		echo -ne "${WSNs}${S_imageuploadfrequency_label}${WSNe} (${S_imageuploadfrequency}) must be 0 or greater.${wBR}"
		echo -ne "${FIX}: Set to ${WSVs}0${WSVe} to disable image uploads or set to a positive number.${wBR}"
	fi

	function check_stretch_numbers()
	{
		local TYPE="${1}"
		local LABEL_AMOUNT="${2}"
		local AMOUNT="${3}"
		local LABEL_MIDPOINT="${4}"
		local MIDPOINT="${5}"

		if ! is_number "${AMOUNT}" || ! is_within_range "${AMOUNT}" 0 100 ; then
			heading "Error"
			echo -ne "${WSNs}${TYPE} ${LABEL_AMOUNT}${WSNe} (${AMOUNT}) must be 0 - 100.${wBR}"
			echo -ne "It is '${AMOUNT}'.${wBR}"
			echo -ne "${FIX}: Set to a vaild number.  ${WSVs}0${WSVe} disables stretching.${wBR}"
		elif [[ ${MIDPOINT: -1} == "%" ]]; then
			heading "Error"
			echo -ne "${WSNs}${TYPE} ${LABEL_MIDPOINT}${WSNe} (${MIDPOINT})"
			echo -ne " must be a number without a ${WSVs}%${WSVe}.${wBR}"
			echo -ne "${FIX}: remove the ${WSVs}%${WSVe}.${wBR}"
		fi
	}
	check_stretch_numbers "Daytime" \
		"${S_imagestretchamountdaytime_label}" "${S_imagestretchamountdaytime}" \
		"${S_imagestretchmidpointdaytime_label}" "${S_imagestretchmidpointdaytime}"
	check_stretch_numbers "Nighttime" \
		"${S_imagestretchamountnighttime_label}" "${S_imagestretchamountnighttime}" \
		"${S_imagestretchmidpointnighttime_label}" "${S_imagestretchmidpointnighttime}"

fi		# end of checking for error items


# ======================================================================
# ================= Summary (not displayed if called from WebUI)
NUM_FINDINGS=$((NUM_INFOS + NUM_WARNINGS + NUM_ERRORS))

RET=0
if [[ ${NUM_FINDINGS} -eq 0 ]]; then
	echo -en "No issues found.${wBR}"
else
	# Don't display summary if only 1 item.
	if [[ ${NUM_FINDINGS} -gt 1 ]]; then
		echo
		heading "Summary"
		if [[ ${NUM_INFOS} -gt 0 ]]; then
			echo -ne "${wINFO}Informational messages: ${NUM_INFOS}${wNC}${wBR}"
		fi
		if [[ ${NUM_WARNINGS} -gt 0 ]]; then
			echo -ne "${wWARNING}Warnings: ${NUM_WARNINGS}${wNC}${wBR}"
			RET=1
		fi
		if [[ ${NUM_ERRORS} -gt 0 ]]; then
			echo -ne "${wERROR}Errors: ${NUM_ERRORS}${wNC}${wBR}"
			RET="${EXIT_ERROR_STOP}"
		fi
	fi

	# If called from WebUI, only return error number if the script itself failed.
	[[ ${FROM_WEBUI} == "true" ]] && RET=0
fi

exit "${RET}"
