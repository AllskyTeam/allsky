#!/bin/bash

# Script to upload files.
# This is a separate script so it can also be used manually to test uploads.

# Allow this script to be executed manually, which requires ALLSKY_HOME to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}")/.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck disable=SC1091 source-path=.
source "${ALLSKY_HOME}/variables.sh"		|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"		|| exit "${EXIT_ERROR_STOP}"
#shellcheck disable=SC1091		# file doesn't exist in GitHub
source "${ALLSKY_CONFIG}/config.sh"			|| exit "${EXIT_ERROR_STOP}"
#shellcheck disable=SC1091		# file doesn't exist in GitHub
source "${ALLSKY_CONFIG}/ftp-settings.sh"	|| exit "${EXIT_ERROR_STOP}"


usage_and_exit() {
	RET=$1
	[[ ${RET} -ne 0 ]] && echo -en "${RED}"
	echo "*** Usage: ${ME} [--help] [--wait] [--silent] [--debug] \\"
	echo "               file_to_upload  directory  destination_file_name \\"
	echo "               [file_type] [local_directory]"
	[[ ${RET} -ne 0 ]] && echo -e "${NC}"

	echo
	echo "Where:"
	echo "   '--help'    displays this message and exits."
	echo "   '--wait'    waits for any upload of the same type to finish."
	echo "   '--silent'  doesn't display any status messages."
	echo "   'file_to_upload' is the path name of the file to upload."
	echo "   'directory' is the directory ON THE SERVER the file should be uploaded to."
	echo "   'destination_file_name' is the name the file should be called ON THE SERVER."
	echo "   'file_type' is an optional, temporary name to use when uploading the file."
	echo "   'local_directory' is the name of an optional local directory the file should be"
	echo "        copied to IN ADDITION TO being uploaded to a remote server."
	echo
	echo "For example: ${ME}  keogram-20230710.jpg  /keograms  keogram.jpg"

	exit "${RET}"
}


HELP="false"
WAIT="false"
SILENT="false"
DEBUG="false"
RET=0
while [[ $# -gt 0 ]]; do
	case "${1}" in
		--help)
			HELP="true"
			shift
			;;
		--wait)
			WAIT="true"
			shift
			;;
		--silent)
			SILENT="true"
			shift
			;;
		--debug)
			DEBUG="true"
			shift
			;;
		-*)
			echo -e "${RED}Unknown argument '${1}'.${NC}" >&2
			shift
			RET=1
			;;
		*)
			break		# done with arguments
			;;
	esac
done
[[ $# -lt 3 || ${RET} -ne 0 ]] && usage_and_exit 1
[[ ${HELP} == "true" ]] && usage_and_exit 0

FILE_TO_UPLOAD="${1}"
if [[ ! -f ${FILE_TO_UPLOAD} ]]; then
	echo -en "${RED}" >&2
	echo -n "*** ${ME}: ERROR: File to upload '${FILE_TO_UPLOAD}' not found!" >&2
	echo -e "${NC}" >&2
	exit 2
fi

DIRECTORY="${2}"
DESTINATION_NAME="${3}"
[[ -z ${DESTINATION_NAME} ]] && DESTINATION_NAME="$(basename "${FILE_TO_UPLOAD}")"
# When run manually, the FILE_TYPE normally won't be given.
FILE_TYPE="${4:-x}"		# A unique identifier for this type of file
COPY_TO="${5}"
if [[ -n ${COPY_TO} && ! -d ${COPY_TO} ]]; then
	echo -en "${RED}" >&2
	echo -n "*** ${ME}: ERROR: '${COPY_TO}' directory not found!" >&2
	echo -e "${NC}" >&2
	exit 2
fi

# To save a write to the SD card, only save output to ${LOG} on error.
LOG="${ALLSKY_TMP}/upload_errors.txt"

# Make sure only one upload of this file type happens at once.
# Multiple concurrent uploads (which can happen if the system and/or network is slow can
# cause errors and files left on the server.
PID_FILE="${ALLSKY_TMP}/${FILE_TYPE}-pid.txt"
if [[ ${WAIT} == "true" ]]; then
	MAX_CHECKS=10
	SLEEP="5s"
else
	MAX_CHECKS=2
	SLEEP="10s"
fi
ABORTED_MSG1="Another '${FILE_TYPE}' upload is in progress so the new upload of"
ABORTED_MSG1="${ABORTED_MSG1} $(basename "${FILE_TO_UPLOAD}") was aborted."
ABORTED_FIELDS="${FILE_TYPE}\t${FILE_TO_UPLOAD}"
ABORTED_MSG2="uploads"
CAUSED_BY="This could be caused network issues or by delays between images that are too short."
if ! one_instance --sleep "${SLEEP}" --max-checks "${MAX_CHECKS}" --pid-file "${PID_FILE}" \
		--aborted-count-file "${ALLSKY_ABORTEDUPLOADS}" --aborted-fields "${ABORTED_FIELDS}" \
		--aborted-msg1 "${ABORTED_MSG1}" --aborted-msg2 "${ABORTED_MSG2}" \
		--caused-by "${CAUSED_BY}" ; then
	exit 1
fi

# Convert to lowercase so we don't care if user specified upper or lowercase.
PROTOCOL="${PROTOCOL,,}"

# SIGTERM is sent by systemctl to stop Allsky.
# SIGHUP is sent to have the capture program reload their arguments.
# Ignore them so we don't leave a temporary or partially uploaded file if the service is stopped
# in the middle of an upload.
trap "" SIGTERM
trap "" SIGHUP

if [[ ${PROTOCOL} == "s3" ]] ; then
	DEST="s3://${S3_BUCKET}${DIRECTORY}/${DESTINATION_NAME}"
	if [[ ${SILENT} == "false" && ${ALLSKY_DEBUG_LEVEL} -ge 3 ]]; then
		echo "${ME}: Uploading ${FILE_TO_UPLOAD} to ${DEST}"
	fi
	OUTPUT="$( "${AWS_CLI_DIR}/aws" s3 cp "${FILE_TO_UPLOAD}" "${DEST}" --acl "${S3_ACL}" 2>&1 )"
	RET=$?


elif [[ ${PROTOCOL} == "local" ]] ; then
	DEST="${DIRECTORY}/${DESTINATION_NAME}"
	if [[ ${SILENT} == "false" && ${ALLSKY_DEBUG_LEVEL} -ge 3 ]]; then
		echo "${ME}: Copying ${FILE_TO_UPLOAD} to ${DEST}"
	fi
	OUTPUT="$( cp "${FILE_TO_UPLOAD}" "${DEST}" 2>&1 )"
	RET=$?


elif [[ "${PROTOCOL}" == "scp" ]] ; then
	#shellcheck disable=SC2153
	DEST="${REMOTE_USER}@${REMOTE_HOST}:${DIRECTORY}/${DESTINATION_NAME}"
	if [[ ${SILENT} == "false" && ${ALLSKY_DEBUG_LEVEL} -ge 3 ]]; then
		echo "${ME}: Copying ${FILE_TO_UPLOAD} to ${DEST}"
	fi
	[[ -n ${REMOTE_PORT} ]] && REMOTE_PORT="-P ${REMOTE_PORT}"
	# shellcheck disable=SC2086
	OUTPUT="$( scp -i "${SSH_KEY_FILE}" ${REMOTE_PORT} "${FILE_TO_UPLOAD}" "${DEST}" 2>&1 )"
	RET=$?


elif [[ ${PROTOCOL} == "gcs" ]] ; then
	type gsutil >/dev/null 2>&1
	RET=$?
	if [[ ${RET} -eq 0 ]]; then
		DEST="gs://${GCS_BUCKET}${DIRECTORY}/${DESTINATION_NAME}"
		if [[ ${SILENT} == "false" && ${ALLSKY_DEBUG_LEVEL} -ge 3 ]]; then
			echo "${ME}: Uploading ${FILE_TO_UPLOAD} to ${DEST}"
		fi
		OUTPUT="$( gsutil cp -a "${GCS_ACL}" "${FILE_TO_UPLOAD}" "${DEST}" 2>&1 )"
		RET=$?
	else
		OUTPUT="${ME}: ERROR: 'gsutil' command not found; cannot upload."
		OUTPUT="${OUTPUT}\nIt should be in one of these directories: $PATH"
		"${ALLSKY_SCRIPTS}/addMessage.sh" "error" "${OUTPUT}"
		OUTPUT="${RED}*** ${OUTPUT}${NC}"
	fi


else # sftp/ftp/ftps
	# "put" to a temp name, then move the temp name to the final name.
	# This is useful with slow uplinks where multiple lftp requests can be running at once,
	# and only one lftp can upload the file at once, otherwise we get this error:
	#	put: Access failed: 550 The process cannot access the file because it is being used by
	#		another process. (image.jpg)
	# Slow uplinks also cause problems with web servers that read the file as it's being uploaded.

	# People sometimes have problems with ftp not working,
	# so save the commands we use so they can run lftp manually to debug.

	TEMP_NAME="${FILE_TYPE}-${RANDOM}"

	# If DIRECTORY isn't null (which it can be) and doesn't already have a trailing "/", append one.
	[[ -n ${DIRECTORY} && ${DIRECTORY: -1:1} != "/" ]] && DIRECTORY="${DIRECTORY}/"

	if [[ ${SILENT} == "false" && ${ALLSKY_DEBUG_LEVEL} -ge 3 ]]; then
		echo "${ME}: FTP '${FILE_TO_UPLOAD}' to '${DIRECTORY}${DESTINATION_NAME}', TEMP_NAME=${TEMP_NAME}"
	fi
	# LFTP_CMDS needs to be unique per file type so we don't overwrite a different upload type.
	DIR="${ALLSKY_TMP}/lftp_cmds"
	[[ ! -d ${DIR} ]] && mkdir "${DIR}"
	LFTP_CMDS="${DIR}/${FILE_TYPE}.txt"

	set +H	# This keeps "!!" from being processed in REMOTE_PASSWORD

	# The export LFTP_PASSWORD has to be OUTSIDE the ( ) below.
	if [[ ${DEBUG} == "true" ]]; then
		# In debug mode, include the password on the command line so it's easier
		# for the user to run "lftp -f ${LFT_CMDS}"
		PW="--password '${REMOTE_PASSWORD}'"
	else
		# Send the password to lftp via the environment to avoid having
		# to escape characters in it.
		export LFTP_PASSWORD="${REMOTE_PASSWORD}"
		PW="--env-password"
	fi

	(
		[[ -n ${LFTP_COMMANDS} ]] && echo "${LFTP_COMMANDS}"

		# Sometimes have problems with "max-reties 1", so make it 2
		echo set dns:fatal-timeout 10
		echo set net:max-retries 2
		echo set net:timeout 10

		[[ -n ${REMOTE_PORT} ]] && REMOTE_PORT="-p ${REMOTE_PORT}"

		# shellcheck disable=SC2153,SC2086
		echo "open --user '${REMOTE_USER}' ${PW} ${REMOTE_PORT} '${PROTOCOL}://${REMOTE_HOST}'"

		# lftp doesn't actually try to open the connection until the first command is executed,
		# and if it fails the error message isn't always clear.
		# So, do a simple command first so we get a better error message.
		echo "cd . || exit 99"

		if [[ ${DEBUG} == "true" ]]; then
			# PWD not supported by all servers,
			# but if it works it returns "xxx is current directory" so only output that.
			echo "quote PWD | grep current "
			echo "ls"
			echo "debug 5"
		fi
		if [[ -n ${DIRECTORY} ]]; then
			# lftp outputs error message so we don't have to.
			echo "cd '${DIRECTORY}' || exit 1"
			if [[ ${DEBUG} == "true" ]]; then
				echo "echo 'In DIRECTORY=${DIRECTORY}:'"
				echo "ls"
			fi
		fi

		# Unlikely, but just in case it's already there.
		# Need the "*" after the file name otherwise glob always succeeds.
		echo "glob --exist '${TEMP_NAME}*' && echo '${TEMP_NAME} exists; removing...' && rm '${TEMP_NAME}'"

		echo "put '${FILE_TO_UPLOAD}' -o '${TEMP_NAME}'
			|| (echo 'put of ${FILE_TO_UPLOAD} to ${TEMP_NAME} failed!  Trying again...'; (!sleep 3);  put '${FILE_TO_UPLOAD}' -o '${TEMP_NAME}' && echo 'WORKED' && exit 0)
			|| (echo '2nd put failed again, quitting'; exit 1)
			|| exit 2"

		# Try to remove ${DESTINATION_NAME}, which may or may not exist.
		# If the "rm" fails, the file may be in use by the web server or another lftp,
		# so wait a few seconds and try again, but without the "-f" option so we see any error msg.
		echo "rm  -f '${DESTINATION_NAME}'"
		echo "glob --exist '${DESTINATION_NAME}*'
			&& (echo 'rm of ${DESTINATION_NAME} failed!  Trying again...';  (!sleep 3);  rm '${DESTINATION_NAME}' && echo 'WORKED' && exit 1)
			&& (echo '2nd rm failed, quiting.'; rm -f '${TEMP_NAME}'; exit 1)
			&& exit 3"

		# If the first "mv" fails, wait, then try again.  If that works, exit 0.
		# If the 2nd "mv" also fails exit 4.  Either way, display a 2nd message.
		echo "mv '${TEMP_NAME}' '${DESTINATION_NAME}'
			|| (echo 'mv of ${TEMP_NAME} to ${DESTINATION_NAME} failed!  Trying again...'; (!sleep 3); mv '${TEMP_NAME}' '${DESTINATION_NAME}' && echo 'WORKED' && exit 0)
			|| (echo '2nd mv failed, quitting.'; rm -f '${TEMP_NAME}'; exit 1)
			|| exit 4"

		echo exit 0
	) > "${LFTP_CMDS}"

	OUTPUT="$( lftp -f "${LFTP_CMDS}" 2>&1 )"
	RET=$?
	if [[ ${RET} -ne 0 ]]; then
		HEADER="${RED}*** ${ME}: ERROR,"
		if [[ ${RET} -eq ${EXIT_ERROR_STOP} ]]; then
			# shellcheck disable=SC2153
			OUTPUT="$(
				echo "${HEADER} unable to log in to '${REMOTE_HOST}', user ${REMOTE_USER}'."
				echo -e "${OUTPUT}"
			)"
		else
			OUTPUT="$(
				echo "${HEADER} RET=${RET}:"
				echo "FILE_TO_UPLOAD='${FILE_TO_UPLOAD}'"
				# shellcheck disable=SC2153
				echo "REMOTE_HOST='${REMOTE_HOST}'"
				echo "DIRECTORY='${DIRECTORY}'"
				echo "TEMP_NAME='${TEMP_NAME}'"
				echo "DESTINATION_NAME='${DESTINATION_NAME}'"
				echo -en "${NC}"
				echo
				echo -e "${OUTPUT}"
			)"
		fi

		echo -e "\n${YELLOW}Commands used${NC} are in: ${GREEN}${LFTP_CMDS}${NC}"
	else
		if [[ ${SILENT} == "false" && ${ALLSKY_DEBUG_LEVEL} -ge 4 && ${ON_TTY} -eq 0 ]]; then
			echo "${ME}: FTP '${FILE_TO_UPLOAD}' finished"
		fi
	fi
fi

# Output any error messages
if [[ -n ${OUTPUT} ]]; then
	echo -e "Upload output from '${FILE_TO_UPLOAD}:\n   ${OUTPUT}\n" >&2
	echo -e "${OUTPUT}" > "${LOG}"
fi

# If a local directory was also specified, copy the file there.
if [[ -n ${COPY_TO} ]]; then
	if [[ ${SILENT} == "false" && ${ALLSKY_DEBUG_LEVEL} -ge 3 ]]; then
		# No need to specify the file being copied again since we did so above.
		echo "${ME}: Also copying to ${COPY_TO}/${DESTINATION_NAME}"
	fi
	cp "${FILE_TO_UPLOAD}" "${COPY_TO}/${DESTINATION_NAME}"
	((RET=RET + $?))
fi

rm -f "${PID_FILE}"

# shellcheck disable=SC2086
exit ${RET}
