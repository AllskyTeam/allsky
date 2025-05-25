#!/bin/bash

# This script allows users to manually generate or upload keograms, startrails, and timelapses.

# Allow this script to be executed manually, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"		|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"		|| exit "${EXIT_ERROR_STOP}"

OK="true"
DO_HELP="false"
DEBUG_ARG=""
TYPE="GENERATE"
MSG1="create"
MSG2="created"
SILENT="false"
UPLOAD_SILENT="--silent"
NICE=""
GOT=0
DO_KEOGRAM="false"
DO_STARTRAILS="false"
DO_TIMELAPSE="false"
THUMBNAIL_ONLY="false"
THUMBNAIL_ONLY_ARG=""
IMAGES_FILE=""
OUTPUT_DIR=""
OUTPUT_DIR_ENTERED=""

while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
			--help)
				DO_HELP="true"
				;;
			--debug)
				DEBUG_ARG="${ARG}"
				;;
			--silent)
				SILENT="true"
				UPLOAD_SILENT=""	# since WE aren't outputing a message, upload.sh should.
				;;
			--nice)
				NICE="nice -n ${2}"
				shift
				;;
			--thumbnail-only)
				THUMBNAIL_ONLY="true"
				THUMBNAIL_ONLY_ARG="${ARG}"
				;;
			--upload)
				TYPE="UPLOAD"
				MSG1="upload"
				MSG2="uploaded"
				# On uploads, let upload.sh output messages since it has more details.
				UPLOAD_SILENT=""
				;;
			--images)
				IMAGES_FILE="${2}"
				shift
				;;
			--output-dir)
				OUTPUT_DIR="${2}"
				OUTPUT_DIR_ENTERED="${OUTPUT_DIR}"
				shift
				;;
			-k | --keogram)
				DO_KEOGRAM="true"
				((GOT++))
				;;
			-s | --startrails)
				DO_STARTRAILS="true"
				((GOT++))
				;;
			-t | --timelapse)
				DO_TIMELAPSE="true"
				((GOT++))
				;;

			-*)
				E_ "${ME}: Unknown argument '${ARG}'." >&2
				OK="false"
				;;
			*)
				break
				;;
	esac
	shift
done

usage_and_exit()
{
	local RET=${1}
	exec >&2
	local USAGE="Usage: ${ME} [--help] [--silent] [--debug] [--nice n] [--upload] \\ \n"
	USAGE+="    [--thumbnail-only] [--keogram] [--startrails] [--timelapse] \\ \n"
	USAGE+="    [--output-dir <OUTPUT_DIR>] \\ \n"
	USAGE+="    {--images file | <INPUT_DIR>}"
	echo
	if [[ ${RET} -ne 0 ]]; then
		E_ "${USAGE}"
	else
		echo -e "${USAGE}"
	fi
	echo "where:"
	echo "  --help             Displays this message and exits."
	echo "  --debug            Runs upload.sh in debug mode."
	echo "  --nice             Runs with nice level n."
	echo "  --upload           Uploads previously-created files instead of creating them."
	echo "  --thumbnail-only   Creates or uploads video thumbnails only."
	echo "  --keogram          Will ${MSG1} a keogram."
	echo "  --startrails       Will ${MSG1} a startrail."
	echo "  --timelapse        Will ${MSG1} a timelapse."
	echo "  --output-dir dir   Put the output file in 'dir'."
	echo "  INPUT_DIR          Is the day in '${ALLSKY_IMAGES}' to process."
	echo
	echo "If you don't specify --keogram, --startrails, or --timelapse, all three will be ${MSG2}."
	echo
	echo "The list of images to process is determined in one of two ways:"
	echo "1. Looking in '<INPUT_DIR>' for files with an extension of '${EXTENSION}'."
	echo "   If <INPUT_DIR> does NOT begin with a '/' it is assumed to be in '${ALLSKY_IMAGES}',"
	echo "   which allows using images on a USB stick, for example."
	echo "   The output file(s) are stored in <INPUT_DIR> unless '--output-dir' is specified."
	echo
	echo "2. Specifying '--images file' uses the images listed in 'file'; <INPUT_DIR> is not used."
	echo "   The output file is stored in the same directory as the first image unless"
	echo "   '--output-dir' is specified."
	exit "${RET}"
}

[[ ${DO_HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" ]] && usage_and_exit 1

if [[ -n ${OUTPUT_DIR} && ! -d ${OUTPUT_DIR} ]]; then
	E_ "${ME}: Output directory '${OUTPUT_DIR}' does not exist." >&2
	exit 2
fi

if [[ -n ${IMAGES_FILE} ]]; then
	# If IMAGES_FILE is specified there should be no other arguments.
	[[ $# -ne 0 ]] && usage_and_exit 1

	if [[ ${DO_KEOGRAM} == "true" || ${DO_STARTRAILS} == "true" ]]; then
		E_ "${ME}: The '--images' argument does not (yet) work with keograms or startrails." >&2
		exit 1
	fi

elif [[ $# -eq 0 || $# -gt 1 ]]; then
	usage_and_exit 2
fi

if [[ -n ${IMAGES_FILE} ]]; then
	if [[ ! -s ${IMAGES_FILE} ]]; then
		E_ "*** ${ME} ERROR: '${IMAGES_FILE}' does not exist or is empty!" >&2
		exit 3
	fi
	INPUT_DIR=""		# Not used

	if [[ -z ${OUTPUT_DIR} ]]; then
		# Use the directory the images are in.  Only look at the first one.
		I="$( head -1 "${IMAGES_FILE}" )"
		OUTPUT_DIR="$( dirname "${I}" )"

		# In case the filename doesn't include a path, put in a default location.
		if [[ ${OUTPUT_DIR} == "." ]]; then
			OUTPUT_DIR="${ALLSKY_TMP}"
			W_ "${ME}: Can't determine where to put files so putting in '${OUTPUT_DIR}'." >&2
		fi
	fi

	# Use the basename of the directory.
	DATE="$( basename "${OUTPUT_DIR}" )"

else
	INPUT_DIR="${1}"

	# If not a full pathname look in ${ALLSKY_IMAGES}.
	DATE="$( basename "${INPUT_DIR}" )"
	if [[ ${INPUT_DIR:0:1} != "/" && ${INPUT_DIR:0:2} != ".." ]]; then
		INPUT_DIR="${ALLSKY_IMAGES}/${INPUT_DIR}"	# Need full pathname for links.
	fi
	if [[ ! -d ${INPUT_DIR} ]]; then
		E_ "*** ${ME} ERROR: '${INPUT_DIR}' does not exist!" >&2
		exit 4
	fi

	[[ -z ${OUTPUT_DIR} ]] && OUTPUT_DIR="${INPUT_DIR}"	# Put output file(s) in same location as input files.
fi

if [[ ${GOT} -eq 0 ]]; then
	DO_KEOGRAM="true"
	DO_STARTRAILS="true"
	DO_TIMELAPSE="true"
fi

if [[ ${TYPE} == "GENERATE" ]]; then
	generate()
	{
		GENERATING_WHAT="${1}"
		DIRECTORY="${2}"
		CMD="${3}"
		[[ ${SILENT} == "false" ]] && echo "===== Generating ${GENERATING_WHAT}"
		[[ -n ${DIRECTORY} ]] && mkdir -p "${OUTPUT_DIR}/${DIRECTORY}"

		[[ -n ${DEBUG_ARG} ]] && echo "${ME}: Executing: ${CMD}"
		# shellcheck disable=SC2086
		eval ${CMD}
		local RET=$?
		if [[ ${RET} -ne 0 ]]; then
			E_ "${ME}: Command Failed: ${CMD}" >&2
		elif [[ ${SILENT} == "false" ]]; then
			echo -e "\tDone"
		fi

		return "${RET}"
	}

else
	L_WEB_USE="$( settings ".uselocalwebsite" )"
	R_WEB_USE="$( settings ".useremotewebsite" )"
	R_SERVER_USE="$( settings ".useremoteserver" )"
	if [[ ${L_WEB_USE} == "false" &&
		  ${R_WEB_USE} == "false" &&
		  ${R_SERVER_USE} == "false" ]]; then
		E_ "*** ${ME} ERROR: '--upload' specified but nowhere to upload!" >&2
		exit 5
	fi

	# Local Websites don't have directory or file name choices.

	if [[ ${R_WEB_USE} == "true" ]]; then
		R_WEB_DEST_DIR="$( settings ".remotewebsiteimagedir" )"
		if [[ -n ${R_WEB_DEST_DIR} && ${R_WEB_DEST_DIR: -1:1} != "/" ]]; then
			R_WEB_DEST_DIR+="/"
		fi
	fi

	if [[ ${R_SERVER_USE} == "true" ]]; then
		R_SERVER_DEST_DIR="$( settings ".remoteserverimagedir" )"
		if [[ -n ${R_SERVER_DEST_DIR} && ${R_SERVER_DEST_DIR: -1:1} != "/" ]]; then
			R_SERVER_DEST_DIR+="/"
		fi

		if [[ ${DO_KEOGRAM} == "true" ]]; then
			R_SERVER_KEOGRAM_NAME="$( settings ".remoteserverkeogramdestinationname" )"
		fi
		if [[ ${DO_STARTRAILS} == "true" ]]; then
			R_SERVER_STARTRAILS_NAME="$( settings ".remoteserverstartrailsdestinationname" )"
		fi
		if [[ ${DO_TIMELAPSE} == "true" ]]; then
			R_SERVER_VIDEO_NAME="$( settings ".remoteservervideodestinationname" )"
		fi
	fi
fi

EXIT_CODE=0

if [[ ${DO_KEOGRAM} == "true" || ${DO_STARTRAILS} == "true" ]]; then
	# Nasty JQ trick to compose a widthxheight string if both width and height
	# are defined in the config file and are non-zero. If this check fails, then
	# IMGSIZE will be empty and it won't be used later on. If the check passes
	# a non-empty string (eg. IMGSIZE="1280x960") will be produced and later
	# parts of this script so startrail and keogram generation can use it
	# to reject incorrectly-sized images.
	IMGSIZE=$( settings 'if .width != null and .height != null and .width != "0" and .height != "0" and .width != 0 and .height != 0 then "\(.width)x\(.height)" else empty end' )
	if [[ ${IMGSIZE} != "" ]]; then
		SIZE_FILTER="-s ${IMGSIZE//\"}"
	else
		SIZE_FILTER=""
	fi

fi

if [[ ${DO_KEOGRAM} == "true" ]]; then
	KEOGRAM_FILE="keogram-${DATE}.${EXTENSION}"
	UPLOAD_FILE="${OUTPUT_DIR}/keogram/${KEOGRAM_FILE}"

	if [[ ${TYPE} == "GENERATE" ]]; then
		KEOGRAM_EXTRA_PARAMETERS="$( settings ".keogramextraparameters" )"
		MORE=""
		EXPAND="$( settings ".keogramexpand" )"
			[[ ${EXPAND} == "true" ]] && MORE+=" --image-expand"
		NAME="$( settings ".keogramfontname" )"
			[[ ${NAME} != "" ]] && MORE+=" --font-name ${NAME}"
		COLOR="$( settings ".keogramfontcolor" )"
			[[ ${COLOR} != "" ]] && MORE+=" --font-color '${COLOR}'"
		SIZE="$( settings ".keogramfontsize" )"
			[[ ${SIZE} != "" ]] && MORE+=" --font-size ${SIZE}"
		THICKNESS="$( settings ".keogramlinethickness" )"
			[[ ${THICKNESS} != "" ]] && MORE+=" --font-type ${THICKNESS}"
		CMD="'${ALLSKY_BIN}/keogram' ${NICE} ${SIZE_FILTER} -d '${INPUT_DIR}' \
			-e ${EXTENSION} -o '${UPLOAD_FILE}' ${MORE} ${KEOGRAM_EXTRA_PARAMETERS}"
		generate "Keogram" "keogram" "${CMD}"

		if [[ $? -gt 90 && (${DO_STARTRAILS} == "true" || ${DO_TIMELAPSE} == "true") ]]; then
			DO_STARTRAILS="false"
			DO_TIMELAPSE="false"
			# -gt 90 means either no files or unable to read initial file, and
			# keograms and timelapse will have the same problem, so don't bother running.
			echo "Keogram creation unable to read files; will not run startrails or timelapse." >&2
		fi

	else
		if [[ ! -f ${UPLOAD_FILE} ]]; then
			W_ "WARNING: '${UPLOAD_FILE}' not found; skipping." >&2
			((EXIT_CODE++))
		else
			DEST_DIR="keograms"
			DEST_NAME="${KEOGRAM_FILE}"

			if [[ ${L_WEB_USE} == "true" ]]; then
				#shellcheck disable=SC2086
				"${ALLSKY_SCRIPTS}/upload.sh" ${UPLOAD_SILENT} ${DEBUG_ARG} "--local-web" \
					"${UPLOAD_FILE}" "${DEST_DIR}" "${DEST_NAME}"
				((EXIT_CODE+=$?))
			fi
			if [[ ${R_WEB_USE} == "true" ]]; then
				#shellcheck disable=SC2086
				"${ALLSKY_SCRIPTS}/upload.sh" ${UPLOAD_SILENT} ${DEBUG_ARG} "--remote-web" \
					"${UPLOAD_FILE}" "${R_WEB_DEST_DIR}${DEST_DIR}" "${DEST_NAME}" "Keogram"
				((EXIT_CODE+=$?))
			fi
			if [[ ${R_SERVER_USE} == "true" ]]; then
				if [[ -n ${R_SERVER_KEOGRAM_NAME} ]]; then
					DEST_NAME="${R_SERVER_KEOGRAM_NAME}"
				fi

				#shellcheck disable=SC2086
				"${ALLSKY_SCRIPTS}/upload.sh" ${UPLOAD_SILENT} ${DEBUG_ARG} "--remote-server" \
					"${UPLOAD_FILE}" "${R_SERVER_DEST_DIR}${DEST_DIR}" "${DEST_NAME}" "Keogram"
				((EXIT_CODE+=$?))
			fi
		fi
	fi
fi

if [[ ${DO_STARTRAILS} == "true" ]]; then
	STARTRAILS_FILE="startrails-${DATE}.${EXTENSION}"
	UPLOAD_FILE="${OUTPUT_DIR}/startrails/${STARTRAILS_FILE}"
	if [[ ${TYPE} == "GENERATE" ]]; then
		BRIGHTNESS_THRESHOLD="$( settings ".startrailsbrightnessthreshold" )"
		STARTRAILS_EXTRA_PARAMETERS="$( settings ".startrailsextraparameters" )"
		CMD="'${ALLSKY_BIN}/startrails' ${NICE} ${SIZE_FILTER} -d '${INPUT_DIR}' \
			-e ${EXTENSION} -b ${BRIGHTNESS_THRESHOLD} -o '${UPLOAD_FILE}' \
			${STARTRAILS_EXTRA_PARAMETERS}"
		generate "Startrails, threshold=${BRIGHTNESS_THRESHOLD}" "startrails" "${CMD}"

		if [[ $? -gt 90 && ${DO_TIMELAPSE} == "true" ]]; then
			DO_TIMELAPSE="false"
			# -gt 90 means either no files or unable to read initial file, and
			# timelapse will have the same problem, so don't bother running.
			echo "Startrails creation unable to read files; will not run timelapse." >&2
		fi

	else
		if [[ ! -f ${UPLOAD_FILE} ]]; then
			W_ "WARNING: '${UPLOAD_FILE}' not found; skipping." >&2
			((EXIT_CODE++))
		else
			DEST_DIR="startrails"
			DEST_NAME="${STARTRAILS_FILE}"

			if [[ ${L_WEB_USE} == "true" ]]; then
				#shellcheck disable=SC2086
				"${ALLSKY_SCRIPTS}/upload.sh" ${UPLOAD_SILENT} ${DEBUG_ARG} "--local-web" \
					"${UPLOAD_FILE}" "${DEST_DIR}" "${DEST_NAME}"
				((EXIT_CODE+=$?))
			fi
			if [[ ${R_WEB_USE} == "true" ]]; then
				#shellcheck disable=SC2086
				"${ALLSKY_SCRIPTS}/upload.sh" ${UPLOAD_SILENT} ${DEBUG_ARG} "--remote-web" \
					"${UPLOAD_FILE}" "${R_WEB_DEST_DIR}${DEST_DIR}" "${DEST_NAME}" "Startrails"
				((EXIT_CODE+=$?))
			fi
			if [[ ${R_SERVER_USE} == "true" ]]; then
				if [[ -n ${R_SERVER_STARTRAILS_NAME} ]]; then
					DEST_NAME="${R_SERVER_STARTRAILS_NAME}"
				fi

				#shellcheck disable=SC2086
				"${ALLSKY_SCRIPTS}/upload.sh" ${UPLOAD_SILENT} ${DEBUG_ARG} "--remote-server" \
					"${UPLOAD_FILE}" "${R_SERVER_DEST_DIR}${DEST_DIR}" "${DEST_NAME}" "Startrails"
				((EXIT_CODE+=$?))
			fi
		fi
	fi
fi

if [[ ${DO_TIMELAPSE} == "true" ]]; then
	VIDEO_FILE="allsky-${DATE}.mp4"

	# Need a different name for the file so it's not mistaken for a regular image in the WebUI.
	THUMBNAIL_FILE="thumbnail-${DATE}.jpg"

	UPLOAD_THUMBNAIL="${OUTPUT_DIR}/${THUMBNAIL_FILE}"
	UPLOAD_FILE="${OUTPUT_DIR}/${VIDEO_FILE}"

	TIMELAPSE_UPLOAD_THUMBNAIL="$( settings ".timelapseuploadthumbnail" )"
	if [[ ${TYPE} == "GENERATE" ]]; then
		# If the thumbnail file exists it will used and produce errors, so delete it.
		rm -f "${UPLOAD_THUMBNAIL}"

		if [[ ${THUMBNAIL_ONLY} == "true" ]]; then
			if [[ -f ${UPLOAD_FILE} ]]; then
				RET=0
			else
				ERR="${ME}: ERROR: video file '${UPLOAD_FILE}' not found!"
				ERR+="\nCannot create thumbnail."
				E_ "${ERR}" >&2
				RET=1
			fi
		else
			if [[ -n ${IMAGES_FILE} ]]; then
				X="--images '${IMAGES_FILE}'"
			else
				X="--output '${UPLOAD_FILE}' '${INPUT_DIR}'"
			fi
			CMD="${NICE} '${ALLSKY_SCRIPTS}/timelapse.sh' ${DEBUG_ARG} ${X}"
			generate "Timelapse" "" "${CMD}"	# it creates the necessary directory
			RET=$?
		fi
		if [[ ${RET} -eq 0 && ${TIMELAPSE_UPLOAD_THUMBNAIL} == "true" && -s ${UPLOAD_FILE} ]]; then
			# Want the thumbnail to be near the start of the video, but not the first frame
			# since that can be a lousy frame.
			# If the video is less than 5 seconds, make_thumbnail won't work, so try again.
			make_thumbnail "05" "${UPLOAD_FILE}" "${UPLOAD_THUMBNAIL}"
			if [[ ! -f ${UPLOAD_THUMBNAIL} ]]; then
				make_thumbnail "00" "${UPLOAD_FILE}" "${UPLOAD_THUMBNAIL}"
			fi
			if [[ ! -f ${UPLOAD_THUMBNAIL} ]]; then
				E_ "${ME}: ERROR: video thumbnail not created!" >&2
			fi
		fi

	elif [[ ! -f ${UPLOAD_FILE} ]]; then
		W_ "WARNING: '${UPLOAD_FILE}' not found; skipping." >&2
		((EXIT_CODE++))
	else
		DEST_DIR="videos"
		DEST_NAME="${VIDEO_FILE}"

		if [[ ${L_WEB_USE} == "true" ]]; then
			D="${DEST_DIR}"
			if [[ ${THUMBNAIL_ONLY} != "true" ]]; then
				#shellcheck disable=SC2086
				"${ALLSKY_SCRIPTS}/upload.sh" ${UPLOAD_SILENT} ${DEBUG_ARG} "--local-web" \
					"${UPLOAD_FILE}" "${D}" "${DEST_NAME}"
				RET=$?
				((EXIT_CODE+=RET))
			else
				RET=0
			fi
			if [[ ${RET} -eq 0 && ${TIMELAPSE_UPLOAD_THUMBNAIL} == "true" && -f ${UPLOAD_THUMBNAIL} ]]; then
				#shellcheck disable=SC2086
				"${ALLSKY_SCRIPTS}/upload.sh" ${UPLOAD_SILENT} ${DEBUG_ARG} "--local-web" \
					"${UPLOAD_THUMBNAIL}" "${D}/thumbnails" "${DEST_NAME/mp4/jpg}"
			fi
		fi
		if [[ ${R_WEB_USE} == "true" ]]; then
			D="${R_WEB_DEST_DIR}${DEST_DIR}"
			if [[ ${THUMBNAIL_ONLY} != "true" ]]; then
				#shellcheck disable=SC2086
				"${ALLSKY_SCRIPTS}/upload.sh" ${UPLOAD_SILENT} ${DEBUG_ARG} "--remote-web" \
					"${UPLOAD_FILE}" "${D}" "${DEST_NAME}" "Timelapse"
				RET=$?
				((EXIT_CODE+=RET))
			else
				RET=0
			fi
			if [[ ${RET} -eq 0 && ${TIMELAPSE_UPLOAD_THUMBNAIL} == "true" && -f ${UPLOAD_THUMBNAIL} ]]; then
				#shellcheck disable=SC2086
				"${ALLSKY_SCRIPTS}/upload.sh" ${UPLOAD_SILENT} ${DEBUG_ARG} "--remote-web" \
					"${UPLOAD_THUMBNAIL}" "${D}/thumbnails" "${DEST_NAME/mp4/jpg}" "TimelapseThumbnail"
			fi
		fi
		if [[ ${R_SERVER_USE} == "true" ]]; then
			if [[ -n ${R_SERVER_VIDEO_NAME} ]]; then
				DEST_NAME="${R_SERVER_VIDEO_NAME}"
			fi

			D="${R_SERVER_DEST_DIR}${DEST_DIR}"
			if [[ ${THUMBNAIL_ONLY} != "true" ]]; then
				#shellcheck disable=SC2086
				"${ALLSKY_SCRIPTS}/upload.sh" ${UPLOAD_SILENT} ${DEBUG_ARG} "--remote-server" \
					"${UPLOAD_FILE}" "${D}" "${DEST_NAME}" "Timelapse"
				RET=$?
				((EXIT_CODE+=RET))
			else
				RET=0
			fi
			if [[ ${RET} -eq 0 && ${TIMELAPSE_UPLOAD_THUMBNAIL} == "true" && -f ${UPLOAD_THUMBNAIL} ]]; then
				#shellcheck disable=SC2086
				"${ALLSKY_SCRIPTS}/upload.sh" ${UPLOAD_SILENT} ${DEBUG_ARG} "--remote-server" \
					"${UPLOAD_THUMBNAIL}" "${D}/thumbnails" "${DEST_NAME/mp4/jpg}" "TimelapseThumbnail"
			fi
		fi
	fi
fi


if [[ ${TYPE} == "GENERATE" && ${SILENT} == "false" && ${EXIT_CODE} -eq 0 ]]; then
	ARGS="${THUMBNAIL_ONLY_ARG}"
	[[ ${DO_KEOGRAM} == "true" ]] && ARGS="${ARGS} --keogram"
	[[ ${DO_STARTRAILS} == "true" ]] && ARGS="${ARGS} --startrails"
	[[ ${DO_TIMELAPSE} == "true" ]] && ARGS="${ARGS} --timelapse"
	echo -e "\n================"
	echo "If you want to upload the file(s) you just created,"
	echo -en "\texecute '${ME} --upload"
	if [[ -n ${OUTPUT_DIR_ENTERED} ]]; then
		echo -n " --output-dir '${OUTPUT_DIR_ENTERED}'"
	fi
	echo -e " ${ARGS} ${DATE}'"
	echo "================"
fi

exit "${EXIT_CODE}"
