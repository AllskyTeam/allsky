#!/bin/bash

# Script to upload files.
# This is a separate script so it can also be used manually to test uploads.

# Allow this script to be executed manually, which requires ALLSKY_HOME to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"		|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"		|| exit "${EXIT_ERROR_STOP}"


usage_and_exit() {
	RET=$1
	exec >&2
	[[ ${RET} -ne 0 ]] && echo -en "${RED}"
	echo "*** Usage: ${ME} [--help] [--wait] [--silent] [--debug] [--output f] \\"
	echo "               { --local-web | --remote-web | --remote-server } \\"
	echo "               file_to_upload  directory  destination_name \\"
	echo "               [file_type]"
	[[ ${RET} -ne 0 ]] && echo -e "${NC}"

	echo
	echo "Arguments:"
	echo "   --help            Display this message and exits."
	echo "   --wait            Wait for any upload of the same type to finish."
	echo "   --silent          Don't display any status messages."
	echo "   --output f        Save the upload output in the specified file."
	echo "   --local-web       Copy to local Website."
	echo "   --remote-web      Upload to the remote Website."
	echo "   --remote-server   Upload to the remote server."
	echo "   file_to_upload    Is the path name of the file to upload."
	echo "   directory         Is the directory ON THE SERVER the file should be uploaded to."
	echo "   destination_name  Is the name the file should be called ON THE SERVER."
	echo "   file_type         Is an optional, temporary name to use when uploading the file."
	echo
	echo "For example: ${ME}  keogram-20250710.jpg  /keograms  keogram.jpg"

	exit "${RET}"
}


HELP="false"
WAIT="false"
SILENT="false"
OUTPUT_FILE=""
DEBUG="false"
LOCAL="false"
REMOTE_WEB="false"
REMOTE_SERVER="false"
NUM=0
RET=0
while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
		--help)
			HELP="true"
			;;
		--wait)
			WAIT="true"
			;;
		--silent)
			SILENT="true"
			;;
		--output)
			OUTPUT_FILE="$2"
			shift
			;;
		--debug)
			DEBUG="true"
			;;
		--local-web)
			LOCAL="true"
			(( NUM++ ))
			;;
		--remote-web)
			REMOTE_WEB="true"
			(( NUM++ ))
			;;
		--remote-server)
			REMOTE_SERVER="true"
			(( NUM++ ))
			;;
		-*)
			echo -e "${RED}Unknown argument '${ARG}'.${NC}" >&2
			RET=1
			;;
		*)
			break		# done with arguments
			;;
	esac
	shift
done
[[ $# -lt 3 || ${RET} -ne 0 ]] && usage_and_exit 1
[[ ${HELP} == "true" ]] && usage_and_exit 0
# Have to specify exactly one place to upload to.
[[ ${NUM} -ne 1 ]] && usage_and_exit 1

FILE_TO_UPLOAD="${1}"
if [[ ! -f ${FILE_TO_UPLOAD} ]]; then
	echo -en "${RED}" >&2
	echo -n "*** ${ME}: ERROR: File to upload '${FILE_TO_UPLOAD}' not found!" >&2
	echo -e "${NC}" >&2
	exit 2
fi

DIRECTORY="${2}"
# Allow explicit empty directory and destination file name.
[[ ${DIRECTORY} == "null" ]] && DIRECTORY=""
DESTINATION_NAME="${3}"
if [[ -z ${DESTINATION_NAME} || ${DESTINATION_NAME} == "null" ]]; then
	DESTINATION_NAME="$( basename "${FILE_TO_UPLOAD}" )"
fi
# When run manually, the FILE_TYPE normally won't be given.
FILE_TYPE="${4:-x}"		# A unique identifier for this type of file
COPY_TO="${5}"
if [[ -n ${COPY_TO} && ! -d ${COPY_TO} ]]; then
	echo -en "${RED}" >&2
	echo -n "*** ${ME}: ERROR: '${COPY_TO}' directory not found!" >&2
	echo -e "${NC}" >&2
	exit 2
fi

function check_for_error_messages()
{
	local ERROR_MESSAGES="${1}"
	# Output any error messages
	if [[ -n ${ERROR_MESSAGES} ]]; then
		echo -e "Upload output from '${FILE_TO_UPLOAD}':\n   ${ERROR_MESSAGES}\n" >&2
		echo -e "${ERROR_MESSAGES}" > "${LOG}"
	fi
}

# To save a write to the SD card, only save output to ${LOG} on error.
LOG="${ALLSKY_TMP}/upload_errors.txt"

if [[ ${LOCAL} == "true" ]]; then
	if [[ -z ${DIRECTORY} ]]; then
		DIRECTORY="${ALLSKY_WEBSITE}"
	elif [[ ${DIRECTORY:0:1} != "/" ]]; then
		DIRECTORY="${ALLSKY_WEBSITE}/${DIRECTORY}"
	fi
	# No need to set the lock for local copies - they are fast.
	if [[ ${SILENT} == "false" && ${ALLSKY_DEBUG_LEVEL} -ge 3 ]]; then
		echo "${ME}: Copying ${FILE_TO_UPLOAD} to ${DIRECTORY}/${DESTINATION_NAME}"
	fi
	OUTPUT="$( cp "${FILE_TO_UPLOAD}" "${DIRECTORY}/${DESTINATION_NAME}" 2>&1 )"
	RET=$?
	check_for_error_messages "${OUTPUT}"
	exit "${RET}"
fi


############## Remote Website or server

# Make sure only one upload of this file type happens at once.
# Multiple concurrent uploads (which can happen if the system and/or network is slow can
# cause errors and files left on the server.

if [[ ${WAIT} == "true" ]]; then
	MAX_CHECKS=10
	SLEEP="5s"
else
	MAX_CHECKS=2
	SLEEP="10s"
fi
PID_FILE="${ALLSKY_TMP}/${FILE_TYPE}-pid.txt"
ABORTED_MSG1="Another '${FILE_TYPE}' upload is in progress so the new upload of"
ABORTED_MSG1+=" $( basename "${FILE_TO_UPLOAD}" ) was aborted."
ABORTED_FIELDS="${FILE_TYPE}\t${FILE_TO_UPLOAD}"
ABORTED_MSG2="uploads"
CAUSED_BY="This could be caused network issues or by delays between images that are too short."
if ! one_instance --sleep "${SLEEP}" --max-checks "${MAX_CHECKS}" --pid-file "${PID_FILE}" \
		--aborted-count-file "${ALLSKY_ABORTEDUPLOADS}" --aborted-fields "${ABORTED_FIELDS}" \
		--aborted-msg1 "${ABORTED_MSG1}" --aborted-msg2 "${ABORTED_MSG2}" \
		--caused-by "${CAUSED_BY}" ; then
	exit 1
fi

if [[ ${REMOTE_WEB} == "true" ]]; then
	prefix="remotewebsite"
	PREFIX="REMOTEWEBSITE"
	Prefix="Remote Website"
else	# "server"
	prefix="remoteserver"
	PREFIX="REMOTESERVER"
	Prefix="Remote Server"
fi
PROTOCOL="$( settings ".${prefix}protocol" )"
if [[ -z ${PROTOCOL} ]]; then
	echo "${ME}: ERROR: 'Protocol' not specified for ${Prefix}." >&2
	exit 2
fi

# Get some variables and check for "".
function get_REMOTE_USER_HOST_PORT()
{
	local OK="true"
	REMOTE_USER="$( settings ".${PREFIX}_USER" "${ALLSKY_ENV}" )"
	if [[ -z ${REMOTE_USER} ]]; then
		OK="false"
		echo "${ME}: ERROR: 'User Name' not specified for ${Prefix}." >&2
	fi
	REMOTE_HOST="$( settings ".${PREFIX}_HOST" "${ALLSKY_ENV}" )"
	if [[ -z ${REMOTE_HOST} ]]; then
		OK="false"
		echo "${ME}: ERROR: 'Server Name' not specified for ${Prefix}." >&2
	fi
	[[ ${OK} == "false" ]] && exit 3

	# Ok to be null
	REMOTE_PORT="$( settings ".${PREFIX}_PORT" "${ALLSKY_ENV}" )"
}

# SIGTERM is sent by systemctl to stop Allsky.
# SIGHUP is sent to have the capture program reload its arguments.
# Ignore them so we don't leave a temporary or partially uploaded file if the service
# is stopped in the middle of an upload.
trap "" SIGTERM
trap "" SIGHUP

if [[ ${PROTOCOL} == "s3" ]] ; then
	AWS_CLI_DIR="$( settings ".${PREFIX}_AWS_CLI_DIR" "${ALLSKY_ENV}" )"
	S3_BUCKET="$( settings ".${PREFIX}_S3_BUCKET" "${ALLSKY_ENV}" )"
	S3_ACL="$( settings ".${PREFIX}_S3_ACL" "${ALLSKY_ENV}" )"

	DEST="s3://${S3_BUCKET}${DIRECTORY}/${DESTINATION_NAME}"
	if [[ ${SILENT} == "false" && ${ALLSKY_DEBUG_LEVEL} -ge 3 ]]; then
		echo "${ME}: Uploading ${FILE_TO_UPLOAD} to ${DEST}"
	fi
	OUTPUT="$( "${AWS_CLI_DIR}/aws" s3 cp "${FILE_TO_UPLOAD}" "${DEST}" --acl "${S3_ACL}" 2>&1 )"
	RET=$?


elif [[ "${PROTOCOL}" == "scp" || "${PROTOCOL}" == "rsync" ]] ; then
	get_REMOTE_USER_HOST_PORT
	SSH_KEY_FILE="$( settings ".${PREFIX}_SSH_KEY_FILE" "${ALLSKY_ENV}" )"

	DEST="${REMOTE_USER}@${REMOTE_HOST}:${DIRECTORY}/${DESTINATION_NAME}"
	if [[ ${SILENT} == "false" && ${ALLSKY_DEBUG_LEVEL} -ge 3 ]]; then
		echo "${ME}: Copying ${FILE_TO_UPLOAD} to ${DEST}"
	fi
	if [[ "${PROTOCOL}" == "scp" ]]; then
		[[ -n ${REMOTE_PORT} ]] && REMOTE_PORT="-P ${REMOTE_PORT}"
		# shellcheck disable=SC2086
		OUTPUT="$( scp -i "${SSH_KEY_FILE}" ${REMOTE_PORT} "${FILE_TO_UPLOAD}" "${DEST}" 2>&1 )"
 	else
		[[ -n ${REMOTE_PORT} ]] && REMOTE_PORT="-p ${REMOTE_PORT}"
		# shellcheck disable=SC2086
		OUTPUT="$( rsync -e "ssh -i ${SSH_KEY_FILE} ${REMOTE_PORT}" "${FILE_TO_UPLOAD}" "${DEST}" 2>&1 )"
  	fi
	RET=$?


elif [[ ${PROTOCOL} == "gcs" ]] ; then
	GCS_BUCKET="$( settings ".${PREFIX}_GCS_BUCKET" "${ALLSKY_ENV}" )"
	GCS_ACL="$( settings ".${PREFIX}_GCS_ACL" "${ALLSKY_ENV}" )"

	if type gsutil >/dev/null 2>&1 ; then
		DEST="gs://${GCS_BUCKET}${DIRECTORY}/${DESTINATION_NAME}"
		if [[ ${SILENT} == "false" && ${ALLSKY_DEBUG_LEVEL} -ge 3 ]]; then
			echo "${ME}: Uploading ${FILE_TO_UPLOAD} to ${DEST}"
		fi
		OUTPUT="$( gsutil cp -a "${GCS_ACL}" "${FILE_TO_UPLOAD}" "${DEST}" 2>&1 )"
		RET=$?
	else
		OUTPUT="${ME}: ERROR: 'gsutil' command not found; cannot upload."
		OUTPUT+="\nIt should be in one of these directories: ${PATH}"
		"${ALLSKY_SCRIPTS}/addMessage.sh" --type error --msg "${OUTPUT}"
		OUTPUT="${RED}*** ${OUTPUT}${NC}"
		RET=1
	fi


else # sftp/ftp/ftps
	# "put" to a temp name, then move the temp name to the final name.
	# This is useful with slow uplinks where multiple upload requests can be running at once,
	# and only one upload can upload the file at once.
	# For lftp we get this error:
	#	put: Access failed: 550 The process cannot access the file because it is being used by
	#		another process. (image.jpg)
	# Slow uplinks also cause problems with web servers that read the file as it's being uploaded.

	# People sometimes have problems with ftp not working,
	# so save the commands we use so they can run lftp manually to debug.

	TEMP_NAME="${FILE_TYPE}-${RANDOM}"

	# If directory is null (which it can be) put the file in the image directory
	# which is the root.
	if [[ -z ${DIRECTORY} ]]; then
		IMAGE_DIR="$( settings ".${prefix}imagedir" )"
		if [[ -n ${IMAGE_DIR} ]]; then
			[[ ${IMAGE_DIR: -1:1} != "/" ]] && IMAGE_DIR+="/"
			DIRECTORY="${IMAGE_DIR}"
		fi

	elif [[ ${DIRECTORY: -1:1} != "/" ]]; then
		# If DIRECTORY doesn't already have a trailing "/", append one.
		DIRECTORY+="/"
	fi

	# LFTP_CMDS needs to be unique per file type so we don't overwrite a different upload type.
	DIR="${ALLSKY_TMP}/lftp_cmds"
	if [[ ! -d ${DIR} ]]; then
		if ! mkdir "${DIR}" ; then
			echo -e "${RED}"
			echo -e "*** ERROR: Unable to create '${DIR}'."
			echo -e "${NC}"
			ls -ld "${ALLSKY_TMP}"
			exit 1
		fi
	fi
	LFTP_CMDS="${DIR}/${FILE_TYPE}.txt"

	set +H	# This keeps "!!" from being processed in REMOTE_PASSWORD

	get_REMOTE_USER_HOST_PORT
	# The export LFTP_PASSWORD has to be OUTSIDE the ( ) below.
	REMOTE_PASSWORD="$( settings ".${PREFIX}_PASSWORD" "${ALLSKY_ENV}" )"

	if [[ ${SILENT} == "false" && ${ALLSKY_DEBUG_LEVEL} -ge 3 ]]; then
		MSG="${ME}: FTP '${FILE_TO_UPLOAD}' to ${REMOTE_USER} @ ${REMOTE_HOST}"
		MSG+=" '${DIRECTORY}${DESTINATION_NAME}'"
		[[ ${ALLSKY_DEBUG_LEVEL} -ge 4 ]] && MSG+=", TEMP_NAME=${TEMP_NAME}"
		echo "${MSG}"
	fi

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

	{
		FTP_DEBUG=5
		if [[ ${DEBUG} == "true" ]]; then
			echo "debug ${FTP_DEBUG}"
		fi

		LFTP_COMMANDS="$( settings ".${PREFIX}_LFTP_COMMANDS" "${ALLSKY_ENV}" )"
		if [[ -n ${LFTP_COMMANDS} ]]; then
			echo "${LFTP_COMMANDS}"
			if [[ ${DEBUG} == "true" ]]; then
				echo "echo '${LFTP_COMMANDS}    # From FTP Commands'"
			fi
		fi

		# Sometimes have problems with "max-reties 1", so make it 2
		echo set dns:fatal-timeout 10
		echo set net:max-retries 2
		echo set net:timeout 10

		[[ -n ${REMOTE_PORT} ]] && REMOTE_PORT="-p ${REMOTE_PORT}"

		# shellcheck disable=SC2153,SC2086
		echo "open --user '${REMOTE_USER}' ${PW} ${REMOTE_PORT} '${PROTOCOL}://${REMOTE_HOST}'"

		# lftp doesn't open the connection until the first command is executed,
		# and if it fails the error message isn't always clear.
		# So, do a simple command first so we get a better error message.
		echo "cd . || exit ${EXIT_ERROR_STOP}"

		if [[ ${DEBUG} == "true" ]]; then
			echo "debug 0"
			echo "echo 'START info'"	# Helps invoker determine where the info begins
			echo "ls"
			echo "echo 'END info'"
			echo "debug ${FTP_DEBUG}"
		fi

		if [[ -n ${DIRECTORY} ]]; then
			# lftp outputs error message so we don't have to.
			echo "cd '${DIRECTORY}' || exit 1"
			if [[ ${DEBUG} == "true" ]]; then
				echo "echo 'In DIRECTORY=${DIRECTORY}:'"
				echo "ls"
			fi
		fi

		# Unlikely, but just in case it's already there, remove it and log the action.
		# Glob requires a regular expression, otherwise it always finds the file even if it's not there.
		if [[ ${UPLOAD_WORKAROUND:-false} == "true" ]]; then
			# Some web servers move the file just uploaded somewhere else so we can't rename it.
			# So, upload the file with the final name.
			# This means it may have problems overwritting the file if it's in use.
			echo "put '${FILE_TO_UPLOAD}'
				|| (echo 'put of ${FILE_TO_UPLOAD} failed!  Trying again...'; sleep 3;  put '${FILE_TO_UPLOAD}' && echo 'WORKED' && exit 0)
				|| (echo '2nd put failed again, quitting'; exit 1)
				|| exit 2"
		else
			echo "glob --exist '[${TEMP_NAME:0:1}]${TEMP_NAME:1}' && echo '${TEMP_NAME} exists; removing...' && rm '${TEMP_NAME}'"

			echo "put '${FILE_TO_UPLOAD}' -o '${TEMP_NAME}'
				|| (echo 'put of ${FILE_TO_UPLOAD} to ${TEMP_NAME} failed!  Trying again...'; sleep 3;  put '${FILE_TO_UPLOAD}' -o '${TEMP_NAME}' && echo 'WORKED' && exit 0)
				|| (echo '2nd put failed again, quitting'; exit 1)
				|| exit 2"

			# Try to remove ${DESTINATION_NAME}, which may or may not exist.
			# If the "rm" fails, the file may be in use by the web server or another lftp,
			# so wait a few seconds and try again, but without the "-f" option so we see any error msg.
			echo "rm  -f '${DESTINATION_NAME}'"
			echo "glob --exist '[${DESTINATION_NAME:0:1}]${DESTINATION_NAME:1}'
				&& (echo 'rm of ${DESTINATION_NAME} failed!  Trying again...';  sleep 3;  rm '${DESTINATION_NAME}' && echo 'WORKED' && exit 1)
				&& (echo '2nd rm failed, quiting.'; rm -f '${TEMP_NAME}'; exit 1)
				&& exit 3"

			# If the first "mv" fails, wait, then try again.  If that works, exit 0.
			# If the 2nd "mv" also fails exit 4.  Either way, display a 2nd message.
			echo "mv '${TEMP_NAME}' '${DESTINATION_NAME}'
				|| (echo 'mv of ${TEMP_NAME} to ${DESTINATION_NAME} failed!  Trying again...'; sleep 3; mv '${TEMP_NAME}' '${DESTINATION_NAME}' && echo 'WORKED' && exit 0)
				|| (echo '2nd mv failed, quitting.'; rm -f '${TEMP_NAME}'; exit 1)
				|| exit 4"
		fi

		echo exit 0
	} > "${LFTP_CMDS}"

	if [[ -n ${OUTPUT_FILE} ]]; then
		lftp -f "${LFTP_CMDS}" > "${OUTPUT_FILE}" 2>&1
		RET=$?
		OUTPUT=""		# Let invoker display OUTPUT_FILE if they want
	else
		OUTPUT="$( lftp -f "${LFTP_CMDS}" 2>&1 )"
		RET=$?
	fi
	if [[ ${RET} -ne 0 ]]; then
		HEADER="*** ${ME}: ERROR,"
		if [[ ${RET} -eq ${EXIT_ERROR_STOP} ]]; then
			# shellcheck disable=SC2153
			OUTPUT="$(
				echo "${HEADER} unable to log in to ${REMOTE_USER} @ ${REMOTE_HOST}."
				[[ -n ${OUTPUT} ]] && echo -e "${OUTPUT}"
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
				[[ -n ${OUTPUT} ]] && echo -e "\n${OUTPUT}"
			)"
		fi

		echo -e "\nCommands used are in '${LFTP_CMDS}'"
	else
		if [[ ${SILENT} == "false" && ${ALLSKY_DEBUG_LEVEL} -ge 3 && ${ON_TTY} == "false" ]]; then
			echo "${ME}: FTP '${FILE_TO_UPLOAD}' finished"
		fi
	fi
fi

check_for_error_messages "${OUTPUT}"
rm -f "${PID_FILE}"

exit "${RET}"
