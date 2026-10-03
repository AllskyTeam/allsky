#!/bin/bash
# shellcheck disable=SC2154		# referenced but not assigned - from convertJSON.php

# This script allows users to manually generate or upload keograms, startrails, and timelapses.

# Allow this script to be executed manually, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"		|| exit "${ALLSKY_EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"		|| exit "${ALLSKY_EXIT_ERROR_STOP}"

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
KEOGRAM_PARAMS=""
DO_STARTRAILS="false"
STARTRAILS_PARAMS=""
DO_TIMELAPSE="false"
TIMELAPSE_PARAMS=""
THUMBNAIL_ONLY="false"
THUMBNAIL_ONLY_ARG=""
IMAGES_FILE=""
OUTPUT_DIR=""
OUTPUT_DIR_ENTERED=""
START_TIME=""
END_TIME=""
GOT_TIME="false"

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
				NICE="${2}"
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
			--start)
				START_TIME="${2}"
				GOT_TIME="true"
				shift
				;;
			--end)
				END_TIME="${2}"
				GOT_TIME="true"
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
			--keogram-params)
				KEOGRAM_PARAMS="${2}"
				shift
				;;
			-s | --startrails)
				DO_STARTRAILS="true"
				((GOT++))
				;;
			--startrails-params)
				STARTRAILS_PARAMS="${2}"
				shift
				;;
			-t | --timelapse)
				DO_TIMELAPSE="true"
				((GOT++))
				;;
			--timelapse-params)
				TIMELAPSE_PARAMS="${2}"
				shift
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
	USAGE+="    [--keogram [--keogram-params 'params']] \\ \n"
	USAGE+="    [--startrails] [--startrails-params 'params']] \\ \n"
	USAGE+="    [--timelapse [--timelapse-params 'params']] \\ \n"
	USAGE+="    [--start time] [--end time] \\ \n"
	USAGE+="    [--thumbnail-only] [--output-dir <OUTPUT_DIR>] {--images file | <INPUT_DIR>}"
	echo
	if [[ ${RET} -ne 0 ]]; then
		E_ "${USAGE}"
	else
		echo -e "${USAGE}"
	fi
	echo "Arguments:"
	echo "   --help                          Display this message and exit."
	echo "   --debug                         Runs upload.sh in debug mode."
	echo "   --nice n                        Runs with the specified nice level."
	echo "   --upload                        Uploads previously-created files instead of creating them."
	echo "   --thumbnail-only                Creates or uploads video thumbnails only."
	echo "   --keogram                       Will ${MSG1} a keogram."
	echo "   --keogram-params 'params'       Passes parameters 'params' to the keogram program."
	echo "   --startrails                    Will ${MSG1} a startrail."
	echo "   --startrails-params 'params'    Passes parameters 'params' to the startrails program."
	echo "   --timelapse                     Will ${MSG1} a timelapse."
	echo "   --timelapse-params 'params'     Passes parameters 'params' to the timelapse program."
	echo "   --start time                    Only use images taken at or after 'time'."
	echo "   --end time                      Only use images taken at or before 'time'."
	echo "                                   'time' is HH:MM, HH:MM:SS, sunrise, sunset, daytime_start,"
	echo "                                   daytime_end, nighttime_start, or nighttime_end."
	echo "                                   These override the start and end time settings."
	echo "   --output-dir dir                Put the output file in 'dir'."
	echo "   INPUT_DIR                       Is the day in '${ALLSKY_IMAGES}' to process."
	echo
	echo "If you don't specify --keogram, --startrails, or --timelapse, all three will be ${MSG2}."
	echo
	echo "The list of images to process is determined in one of two ways:"
	echo
	echo "1. Looking in '<INPUT_DIR>' for files with an extension of '${ALLSKY_EXTENSION}'."
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

	if [[ ${GOT_TIME} == "true" ]]; then
		E_ "${ME}: '--start' and '--end' can't be used with '--images'." >&2
		exit 1
	fi

elif [[ $# -eq 0 ]]; then
	E_ "${ME}: No input directory specified." >&2
	usage_and_exit 2
elif [[ $# -gt 1 ]]; then
	E_ "${ME}: Too many arguments on command line." >&2
	usage_and_exit 2
fi

# Get all settings we're going to use.
#shellcheck disable=SC2119
getAllSettings --var "uselocalwebsite \
	useremotewebsite remotewebsiteimagedir \
	useremoteserver remoteserverimagedir \
	remoteserverkeogramdestinationname remoteserverstartrailsdestinationname remoteservervideodestinationname \
	keogramextraparameters keogramexpand keogramfontname keogramfontcolor keogramfontsize keogramlinethickness \
	startrailsbrightnessthreshold startrailsextraparameters startrailsnightonly \
	timelapseuploadthumbnail \
	keogramstart keogramend startrailsstart startrailsend timelapsestart timelapseend \
	latitude longitude angle" || exit 1

if [[ -n ${IMAGES_FILE} ]]; then
	if [[ ! -s ${IMAGES_FILE} ]]; then
		E_ "*** ${ME} ERROR: Images file '${IMAGES_FILE}' does not exist or is empty!" >&2
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
	GENERATE_OUTPUT=""		# global
	generate()
	{
		GENERATING_WHAT="${1}"
		DIRECTORY="${2}"
		CMD="${3}"

		[[ ${SILENT} == "false" ]] && echo "===== Generating ${GENERATING_WHAT}"
		[[ -n ${DIRECTORY} ]] && mkdir -p "${OUTPUT_DIR}/${DIRECTORY}"

		[[ -n ${DEBUG_ARG} ]] && echo "${ME}: Executing: ${CMD}"
		# shellcheck disable=SC2086
		GENERATE_OUTPUT="$( eval ${CMD} 2>&1 )"
		local RET=$?
		if [[ ${RET} -ne 0 && ${RET} -ne ${ALLSKY_EXIT_PARTIAL_OK}  ]]; then
			E_ "${ME}: Command Failed: ${GENERATE_OUTPUT}" >&2
		elif [[ ${SILENT} == "false" ]]; then
			echo -e "\tDone"
		fi

		return "${RET}"
	}

else
	L_WEB_USE="${S_uselocalwebsite}"
	R_WEB_USE="${S_useremotewebsite}"
	R_SERVER_USE="${S_useremoteserver}"
	if [[ ${L_WEB_USE} == "false" &&
		  ${R_WEB_USE} == "false" &&
		  ${R_SERVER_USE} == "false" ]]; then
		E_ "*** ${ME} ERROR: '--upload' specified but nowhere to upload!" >&2
		exit 5
	fi

	# Local Websites don't have directory or file name choices.

	if [[ ${R_WEB_USE} == "true" ]]; then
		R_WEB_DEST_DIR="${S_remotewebsiteimagedir}"
		if [[ -n ${R_WEB_DEST_DIR} && ${R_WEB_DEST_DIR: -1:1} != "/" ]]; then
			R_WEB_DEST_DIR+="/"
		fi
	fi

	if [[ ${R_SERVER_USE} == "true" ]]; then
		R_SERVER_DEST_DIR="${S_remoteserverimagedir}"
		if [[ -n ${R_SERVER_DEST_DIR} && ${R_SERVER_DEST_DIR: -1:1} != "/" ]]; then
			R_SERVER_DEST_DIR+="/"
		fi

		if [[ ${DO_KEOGRAM} == "true" ]]; then
			R_SERVER_KEOGRAM_NAME="${S_remoteserverkeogramdestinationname}"
		fi
		if [[ ${DO_STARTRAILS} == "true" ]]; then
			R_SERVER_STARTRAILS_NAME="${S_remoteserverstartrailsdestinationname}"
		fi
		if [[ ${DO_TIMELAPSE} == "true" ]]; then
			R_SERVER_VIDEO_NAME="${S_remoteservervideodestinationname}"
		fi
	fi
fi

EXIT_CODE=0
NUM_SUCCESS=0

# Images are only used between a start and an end time if either is set.
# The command-line arguments override the settings.
if [[ ${GOT_TIME} == "false" && -z ${S_startrailsstart} && -z ${S_startrailsend} &&
		${S_startrailsnightonly} == "true" ]]; then
	# Settings files that haven't been converted from "Startrails Night images only" yet.
	S_startrailsstart="nighttime_start"
	S_startrailsend="nighttime_end"
fi

DAYNIGHT_FILE=""		# global
WINDOW_FILE=""			# global

# Print the times of the first and last image in the names on stdin, as "start end"
# in seconds since 1970.  Image names contain the date and time, e.g., image-20261002183005.jpg.
first_last_image_times()
{
	local FIRST  LAST
	read -r FIRST LAST <<< "$( gawk '{ if (match($0, /[0-9]{14}/)) print substr($0, RSTART, 14); }' |
		sort | sed -n '1p;$p' | tr '\n' ' ' )"
	[[ -z ${FIRST} ]] && return 1
	[[ -z ${LAST} ]] && LAST="${FIRST}"
	local T
	for T in "${FIRST}" "${LAST}"; do
		date --date="${T:0:4}-${T:4:2}-${T:6:2} ${T:8:2}:${T:10:2}:${T:12:2}" '+%s' 2>/dev/null || return 1
	done | tr '\n' ' '
}
# Create a file with the names of the images between the start and end times for ${1}
# and set WINDOW_FILE to it.  WINDOW_FILE is "" if all images should be used.
# Return 1 if there are no images to use.
get_window_images()
{
	local WHAT="${1}"
	local START="${2}"
	local END="${3}"

	WINDOW_FILE=""
	if [[ ${GOT_TIME} == "true" ]]; then
		START="${START_TIME}"
		END="${END_TIME}"
	fi
	[[ -n ${IMAGES_FILE} || ( -z ${START} && -z ${END} ) ]] && return 0

	if [[ -z ${DAYNIGHT_FILE} ]]; then
		# Allsky's own day/night decision for each image, for daytime_* and nighttime_*.
		DAYNIGHT_FILE="${ALLSKY_TMP}/daynight-${DATE}.txt"
		local SQL="SELECT AS_CAMERAIMAGE, AS_DAY_OR_NIGHT FROM allsky_image WHERE AS_DATE_NAME = '${DATE}'"
		"${ALLSKY_DATABASE_COMMAND}" --run "${SQL}" > "${DAYNIGHT_FILE}" 2>/dev/null
	fi

	WINDOW_FILE="${ALLSKY_TMP}/${WHAT}-${DATE}-images.txt"
	local RES
	RES="$( "${ALLSKY_PYTHON_VENV}/bin/python3" "${ALLSKY_UTILITIES}/selectImages.py" \
		--dir "${INPUT_DIR}" --ext "${ALLSKY_EXTENSION}" \
		--start "${START}" --end "${END}" --daynight "${DAYNIGHT_FILE}" \
		--latitude "${S_latitude}" --longitude "${S_longitude}" --angle "${S_angle}" \
		--output "${WINDOW_FILE}" 2>&1 )"
	local RET=$?
	if [[ ${RET} -ne 0 ]]; then
		W_ "${ME}: Not creating the ${WHAT} for ${DATE}: ${RES}" >&2
		return 1
	fi
	[[ ${SILENT} == "false" ]] && echo "===== ${WHAT^}: using ${RES}"
	return 0
}

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
	KEOGRAM_FILE="keogram-${DATE}.${ALLSKY_EXTENSION}"
	UPLOAD_FILE="${OUTPUT_DIR}/keogram/${KEOGRAM_FILE}"

	if [[ ${TYPE} == "GENERATE" ]]; then
		if [[ -z ${NICE} ]]; then
			N=""
		else
			N="--nice-level ${NICE}"
		fi
		KEOGRAM_EXTRA_PARAMETERS="${S_keogramextraparameters}"
		MORE=""
		EXPAND="${S_keogramexpand}"
			[[ ${EXPAND} == "true" ]] && MORE+=" --image-expand"
		NAME="${S_keogramfontname}"
			[[ ${NAME} != "" ]] && MORE+=" --font-name ${NAME}"
		COLOR="${S_keogramfontcolor}"
			[[ ${COLOR} != "" ]] && MORE+=" --font-color '${COLOR}'"
		SIZE="${S_keogramfontsize}"
			[[ ${SIZE} != "" ]] && MORE+=" --font-size ${SIZE}"
		THICKNESS="${S_keogramlinethickness}"
			[[ ${THICKNESS} != "" ]] && MORE+=" --font-type ${THICKNESS}"
		CMD="'${ALLSKY_BIN}/keogram' ${N} ${SIZE_FILTER}"
		if [[ -n ${IMAGES_FILE} ]]; then
			CMD+=" --images '${IMAGES_FILE}'"
		elif get_window_images "keogram" "${S_keogramstart}" "${S_keogramend}" ; then
			if [[ -n ${WINDOW_FILE} ]]; then
				CMD+=" --images '${WINDOW_FILE}'"
			else
				CMD+=" -d '${INPUT_DIR}' -e ${ALLSKY_EXTENSION}"
			fi
		else
			CMD=""
		fi
		if [[ -n ${CMD} ]]; then
			CMD+=" -o '${UPLOAD_FILE}' ${MORE} ${KEOGRAM_EXTRA_PARAMETERS}"
			[[ -n ${KEOGRAM_PARAMS} ]] && CMD+=" ${KEOGRAM_PARAMS}"
			generate "Keogram" "keogram" "${CMD}"
			RET=$?
			[[ ${RET} -eq 0 ]] && ((NUM_SUCCESS++))
		else
			RET=1
			((EXIT_CODE++))
		fi

		if [[ $? -gt 90 && (${DO_STARTRAILS} == "true" || ${DO_TIMELAPSE} == "true") ]]; then
			DO_STARTRAILS="false"
			DO_TIMELAPSE="false"
			# -gt 90 means either no files or unable to read initial file, and
			# keograms and timelapse will have the same problem, so don't bother running.
			echo "Keogram creation unable to read files; will not run startrails or timelapse." >&2
		fi

		if [[ ${RET} -eq 0 ]]; then
			# Create thumbnail of keogram
			RES="$( "${ALLSKY_UTILITIES}/thumbnail.sh" -t keogram -d "${DATE}" --force 2>&1 )"
			if [[ $? -ne 0 ]]; then
				W_ "WARNING: unable to create keogram thumbnail: ${RES}."
			fi
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
	STARTRAILS_FILE="startrails-${DATE}.${ALLSKY_EXTENSION}"
	UPLOAD_FILE="${OUTPUT_DIR}/startrails/${STARTRAILS_FILE}"
	if [[ ${TYPE} == "GENERATE" ]]; then
		if [[ -z ${NICE} ]]; then
			N=""
		else
			N="--nice ${NICE}"
		fi
		BRIGHTNESS_THRESHOLD="${S_startrailsbrightnessthreshold}"
		STARTRAILS_EXTRA_PARAMETERS="${S_startrailsextraparameters}"
		CMD="'${ALLSKY_BIN}/startrails' ${N} ${SIZE_FILTER} -o '${UPLOAD_FILE}'"
		STARTRAILS_LIST=""		# the images used, for their times in the database
		if [[ -n ${IMAGES_FILE} ]]; then
			CMD+=" --images '${IMAGES_FILE}'"
			STARTRAILS_LIST="${IMAGES_FILE}"
		elif get_window_images "startrails" "${S_startrailsstart}" "${S_startrailsend}" ; then
			if [[ -n ${WINDOW_FILE} ]]; then
				CMD+=" --images '${WINDOW_FILE}'"
				STARTRAILS_LIST="${WINDOW_FILE}"
			else
				CMD+=" -d '${INPUT_DIR}' -e ${ALLSKY_EXTENSION}"
			fi
		else
			CMD=""
		fi
		if [[ -n ${CMD} ]]; then
			CMD+=" -b ${BRIGHTNESS_THRESHOLD}"
			CMD+=" ${STARTRAILS_EXTRA_PARAMETERS}"
			[[ -n ${STARTRAILS_PARAMS} ]] && CMD+=" ${STARTRAILS_PARAMS}"
			generate "Startrails, threshold=${BRIGHTNESS_THRESHOLD}" "startrails" "${CMD}"
			RET=$?
			[[ ${RET} -eq 0 || ${RET} -eq ${ALLSKY_EXIT_PARTIAL_OK} ]] && ((NUM_SUCCESS++))
		else
			RET=1
			GENERATE_OUTPUT=""
			((EXIT_CODE++))
		fi

		# ${GENERATE_OUTPUT} contains the output of the startrails command.
		# startrails: Minimum: .05 maximum: 0.584629 mean: 0.494671 median: 0.526751 \
		#	numImagesUsed: 0 numImagesNotUsed: 47 threshold: 0.1
		# shellcheck disable=SC2086
		V="$( echo ${GENERATE_OUTPUT} | gawk -v Q="'" '{
			if ($1 == "startrails:") {
				printf(" %sminimum,%f%s", Q, $3, Q);
				printf(" %smaximum,%f%s", Q, $5, Q);
				printf(" %smean,%f%s", Q, $7, Q);
				printf(" %smedian,%f%s", Q, $9, Q);
				printf(" %snumImagesUsed,%d%s", Q, $11, Q);
				printf(" %snumImagesNotUsed,%d%s", Q, $13, Q);
				printf(" %sthreshold,%f%s", Q, $15, Q);
			}
			}'
		)"
		if [[ -n ${V} ]]; then
			# The directory is usually YYYYMMDD but can be "test*".
			D="${DATE}"
			! is_number "${D}" && D="$( date '+%Y%m%d' )"
			VALUES="'date,${D}' 'directory,${DATE}' ${V}"

			# The times of the first and last image looked at, i.e., the startrails' time window.
			if [[ -n ${STARTRAILS_LIST} ]]; then
				TIMES="$( first_last_image_times < "${STARTRAILS_LIST}" )"
			else
				TIMES="$( find "${INPUT_DIR}" -maxdepth 1 -name "*.${ALLSKY_EXTENSION}" -printf '%f\n' |
					first_last_image_times )"
			fi
			read -r START_SECONDS END_SECONDS <<< "${TIMES}"
			if [[ -n ${START_SECONDS} && -n ${END_SECONDS} ]]; then
				VALUES+=" 'starttime,${START_SECONDS}' 'endtime,${END_SECONDS}'"
			fi

			# Insert the stats into the DB.
			# shellcheck disable=SC2086
			eval "${ALLSKY_DATABASE_COMMAND}" --table "${ALLSKY_STARTRAILS_TABLE}" \
				--values ${VALUES}
		fi

		if [[ ${RET} -eq ${ALLSKY_EXIT_PARTIAL_OK} ]]; then
			MSG1="The startrails file was created but has no trailed stars."
			MSG2="\nGo to the 'Helper Tools -&gt; Startrails Settings'"
			MSG3=" page to determine what 'Brightness Threshold' to use."
			if [[ ${ON_TTY} == "true" ]]; then
				echo -e "${MSG1}${MSG2}${MSG3}" | sed 's/&gt;/>/' >&2
			else
				MSG2="\nGo to the <a external='true' href='/?page=startrails_settings'>Helper Tools -&gt; Startrails Settings</a> page"
				"${ALLSKY_SCRIPTS}/addMessage.sh" --type "warning" --msg "${MSG1}${MSG2}${MSG3}"
			fi
		elif [[ ${RET} -gt 90 && ${DO_TIMELAPSE} == "true" ]]; then
			DO_TIMELAPSE="false"
			# -gt 90 means either no files or unable to read initial file, and
			# timelapse will have the same problem, so don't bother running.
			echo "Startrails creation unable to read files; will not run timelapse." >&2
		fi

		if [[ ${RET} -eq 0 || ${RET} -eq ${ALLSKY_EXIT_PARTIAL_OK} ]]; then
			# Create thumbnail of startrail
			RES="$( "${ALLSKY_UTILITIES}/thumbnail.sh" -t startrails -d "${DATE}" --force 2>&1 )"
			if [[ $? -ne 0 ]]; then
				W_ "WARNING: unable to create startrails thumbnail: ${RES}."
			fi
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
	THUMBNAIL_FILE="videothumbnail/allsky-${DATE}.jpg"
	UPLOAD_THUMBNAIL="${OUTPUT_DIR}/${THUMBNAIL_FILE}"
	UPLOAD_FILE="${OUTPUT_DIR}/${VIDEO_FILE}"

	TIMELAPSE_UPLOAD_THUMBNAIL="${S_timelapseuploadthumbnail}"
	if [[ ${TYPE} == "GENERATE" ]]; then
		if [[ ${THUMBNAIL_ONLY} == "true" ]]; then
			if [[ -f ${UPLOAD_FILE} ]]; then
				RES="$( "${ALLSKY_UTILITIES}/thumbnail.sh" -t timelapse -d "$( basename "${INPUT_DIR}" )" --force 2>&1 )"
				if [[ $? -ne 0 ]]; then
					W_ "WARNING: unable to create timelapse thumbnail: ${RES}."
				fi
				RET=0
			else
				ERR="${ME}: ERROR: video file '${UPLOAD_FILE}' not found!"
				ERR+="\nCannot create thumbnail."
				E_ "${ERR}" >&2
				RET=1
			fi
		else
			if [[ -z ${NICE} ]]; then
				N=""
			else
				N="nice -n ${NICE}"
			fi
			if [[ -n ${IMAGES_FILE} ]]; then
				X="--images '${IMAGES_FILE}'"
			elif get_window_images "timelapse" "${S_timelapsestart}" "${S_timelapseend}" ; then
				if [[ -n ${WINDOW_FILE} ]]; then
					X="--images '${WINDOW_FILE}' --output '${UPLOAD_FILE}'"
				else
					X="--output '${UPLOAD_FILE}' '${INPUT_DIR}'"
				fi
			else
				X=""
			fi
			if [[ -n ${X} ]]; then
				# timelapse.sh calls thumbnail.sh to create the thumbnail.
				CMD="${N} '${ALLSKY_SCRIPTS}/timelapse.sh' ${DEBUG_ARG} ${X}"
				[[ -n ${TIMELAPSE_PARAMS} ]] && CMD+=" ${TIMELAPSE_PARAMS}"
				generate "Timelapse" "" "${CMD}"	# it creates the necessary directory
				RET=$?
				[[ ${RET} -eq 0 ]] && ((NUM_SUCCESS++))
			else
				RET=1
				((EXIT_CODE++))
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

# Only display this message if at least one "generate" succeeded.
if [[ ${TYPE} == "GENERATE" && ${SILENT} == "false" && ${NUM_SUCCESS} -gt 0 ]]; then
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
