#!/usr/bin/env bash

# Allow this script to be executed manually, which requires ALLSKY_HOME to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh" || exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh" || exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/installUpgradeFunctions.sh" || exit "${EXIT_ERROR_STOP}"

function usage() {
	echo "Usage: ${ME} -t <startrails|keogram|timelapse|all> -d <YYYYMMDD|all|test*> [--force]"
	exit 1
}

function error_exit() {
	echo "${ME}: ERROR: $1" >&2
	exit 1
}

TYPE=""
DATE=""
FORCE=0

POSITIONAL=()
while [[ $# -gt 0 ]]; do
	case "$1" in
		--force)
			FORCE=1
			shift
			;;
		*)
			POSITIONAL+=("$1")
			shift
			;;
	esac
done
set -- "${POSITIONAL[@]}"

while getopts ":t:d:" opt; do
	case "${opt}" in
		t) TYPE="${OPTARG}" ;;
		d) DATE="${OPTARG}" ;;
		*) usage ;;
	esac
done

[[ -z "${TYPE}" || -z "${DATE}" ]] && usage

case "${TYPE}" in
	keogram|startrails|timelapse|all) ;;
	*) error_exit "Type must be startrails, keogram, timelapse, or all" ;;
esac

case "${DATE}" in
	[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9] | test* | all) ;;
	*) error_exit "Date must be in format YYYYMMDD, or 'all', or start with 'test'; it is '${DATE}'." ;;
esac

THUMBX="$(settings ".thumbnailsizex")" || error_exit "Failed to get thumbnailsizex"
THUMBY="$(settings ".thumbnailsizey")" || error_exit "Failed to get thumbnailsizey"

THUMBX=$((THUMBX * 2))
THUMBY=$((THUMBY * 2))

MISSING_IMAGE="${ALLSKY_HOME}/html/images/missing-image.png"

function process_thumbnail() {
	local TYPE="$1"
	local DATE="$2"
	local SOURCE=""
	local DEST=""
	local DEST_DIR=""
	local RC=0

	case "${TYPE}" in
		keogram)
			SOURCE="${ALLSKY_IMAGES}/${DATE}/keogram/keogram-${DATE}.jpg"
			DEST="${ALLSKY_IMAGES}/${DATE}/keogramthumbnail/keogram-${DATE}.jpg"
			;;
		startrails)
			SOURCE="${ALLSKY_IMAGES}/${DATE}/startrails/startrails-${DATE}.jpg"
			DEST="${ALLSKY_IMAGES}/${DATE}/startrailsthumbnail/startrails-${DATE}.jpg"
			;;
		timelapse)
			SOURCE="${ALLSKY_IMAGES}/${DATE}/allsky-${DATE}.mp4"
			DEST="${ALLSKY_IMAGES}/${DATE}/videothumbnail/allsky-${DATE}.jpg"
			;;
		*)
			error_exit "Invalid type '${TYPE}'"
			;;
	esac

	DEST_DIR="$(dirname "${DEST}")"

	if [[ ! -d "${DEST_DIR}" ]]; then
		mkdir -p "${DEST_DIR}" || error_exit "Failed to create directory ${DEST_DIR}"
		chown "${ALLSKY_OWNER}:${ALLSKY_WEBSERVER_GROUP}" "${DEST_DIR}" || error_exit "Failed to chown ${DEST_DIR}"
	fi

	if [[ -f "${DEST}" && ${FORCE} -eq 0 ]]; then
		echo "${ME}: Output exists, skipping (use --force to overwrite): ${DEST}"
		return 0
	fi

	if [[ ${FORCE} -eq 1 && -f "${DEST}" ]]; then
		rm -f "${DEST}" || error_exit "Failed to remove existing file ${DEST}"
	fi

	if [[ -f "${SOURCE}" ]]; then
		case "${TYPE}" in
			keogram|startrails)
				convert "${SOURCE}" \
					-thumbnail "${THUMBX}x${THUMBY}" \
					"${DEST}"
				RC=$?
				[[ ${RC} -ne 0 ]] && error_exit "convert failed (${RC}) for ${SOURCE}"
				;;
			timelapse)
				ffmpeg -y -loglevel error \
					-ss 00:00:00.2 \
					-i "${SOURCE}" \
					-frames:v 1 \
					-vf "thumbnail,scale=${THUMBX}:${THUMBY}:force_original_aspect_ratio=decrease" \
					"${DEST}"
				RC=$?
				[[ ${RC} -ne 0 ]] && error_exit "ffmpeg failed (${RC}) for ${SOURCE}"
				;;
		esac
	else
		echo "${ME}: WARNING: Source not found, creating missing image thumbnail: ${SOURCE}"

		convert "${MISSING_IMAGE}" \
			-thumbnail "${THUMBX}x${THUMBY}" \
			"${DEST}"
		RC=$?
		[[ ${RC} -ne 0 ]] && error_exit "convert failed (${RC}) for missing image ${MISSING_IMAGE}"
	fi

	chown "${ALLSKY_OWNER}:${ALLSKY_WEBSERVER_GROUP}" "${DEST}" || error_exit "Failed to chown ${DEST}"

	echo "Thumbnail created: ${DEST}"
	return 0
}

function process_date() {
	local CUR_DATE="$1"

	if [[ "${TYPE}" == "all" ]]; then
		process_thumbnail "keogram" "${CUR_DATE}"
		process_thumbnail "startrails" "${CUR_DATE}"
		process_thumbnail "timelapse" "${CUR_DATE}"
	else
		process_thumbnail "${TYPE}" "${CUR_DATE}"
	fi
}

if [[ "${DATE}" == "all" ]]; then
	for DATE_DIR in "${ALLSKY_IMAGES}"/*; do
		[[ -d "${DATE_DIR}" ]] || continue

		CUR_DATE="$(basename "${DATE_DIR}")"

		case "${CUR_DATE}" in
			[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9])
				process_date "${CUR_DATE}"
				;;
		esac
	done
else
	process_date "${DATE}"
fi

exit 0
