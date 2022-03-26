#!/bin/bash

# Script to upload files.
# This is a separate script so it can also be used manually to test uploads.

# Allow this script to be executed manually, which requires ALLSKY_HOME to be set.
if [ -z "${ALLSKY_HOME}" ] ; then
	ALLSKY_HOME="$(realpath $(dirname "${BASH_ARGV0}")/..)"
	export ALLSKY_HOME
fi

source "${ALLSKY_HOME}/variables.sh"
source "${ALLSKY_CONFIG}/config.sh"
source "${ALLSKY_CONFIG}/ftp-settings.sh"

if [ "${1}" = "--silent" ] ; then
	SILENT="true"
	shift
else
	SILENT="false"
fi
if [ "${1}" = "--debug" ] ; then
	DEBUG="true"
	shift
else
	DEBUG="false"
fi

ME="$(basename "${BASH_ARGV0}")"

# TODO: Use getopt() so arguments can be in any order
if [ $# -lt 3 ] ; then
	# When run manually, the file_type (arg $4) normally won't be given.
	echo -en "${RED}"
	echo -n "*** Usage: ${ME} [--silent] [--debug] file_to_upload  directory  destination_file_name [file_type] [local_directory]"
	echo -e "${NC}"
	echo "Where:"
	echo "   '--silent' doesn't display any status messages"
	echo "   'file_to_upload' is the path name of the file you want to upload."
	echo "   'directory' is the directory ON THE SERVER the file should be uploaded to."
	echo "   'destination_file_name' is the name the file should be called ON THE SERVER."
	echo "   'file_type' is an optional, temporary name to use when uploading the file."
	echo "   'local_directory' is the name of an optional local directory the file should be"
	echo "        copied to in addition to being uploaded."
	echo
	echo "For example: ${ME}  keogram-20210710.jpg  /keograms  keogram.jpg"
	exit 1
fi
FILE_TO_UPLOAD="${1}"
if [ ! -f "${FILE_TO_UPLOAD}" ] ; then
	echo -en "${RED}"
	echo -n "*** ${ME}: ERROR: File to upload '${FILE_TO_UPLOAD}' not found!"
	echo -e "${NC}"
	exit 2
fi

REMOTE_DIR="${2}"
DESTINATION_FILE="${3}"
FILE_TYPE="${4:-x}"		# A unique identifier for this type of file
# TODO: only allow one execution of this script for each $FILE_TYPE.
COPY_TO="${5}"
if [ "${COPY_TO}" != "" -a ! -d "${COPY_TO}" ] ; then
	echo -en "${RED}"
	echo -n "*** ${ME}: ERROR: '${COPY_TO}' directory not found!"
	echo -e "${NC}"
	exit 2
fi

# "put" to a temp name, then move the temp name to the final name.
# This is useful with slow uplinks where multiple lftp requests can be running at once,
# and only one lftp can upload the file at once, otherwise we get this error:
#	put: Access failed: 550 The process cannot access the file because it is being used by
#		another process. (image.jpg)
# Slow uplinks also cause problems with web servers that read the file as it's being uploaded.

LOG="${ALLSKY_TMP}/upload_log.txt"

# Make sure only one upload of this file type happens at once.
# Multiple concurrent uploads (which can happen if the system and/or network is slow can
# cause errors and files left on the server.
PID_FILE="${ALLSKY_TMP}/${FILE_TYPE}-pid.txt"
if [ -f "${PID_FILE}" ]; then
		PID=$(< "${PID_FILE}")
		# shellcheck disable=SC2009
		ps -f -p${PID} | grep --silent "${ME}"
		# shellcheck disable=SC2181
		if [ $? -eq 0 ]; then
			echo -en "${YELLOW}"
			echo "*** ${ME}: WARNING: Another upload of type '${FILE_TYPE}' is in progress."
			echo "This new upload is being aborted. If this happens often, check your network"
			echo -n "and delay settings."
			echo -e "${NC}"
			exit 99
		fi
fi
echo $$ > "${PID_FILE}"

# Convert to lowercase so we don't care if user specified upper or lowercase.
PROTOCOL="${PROTOCOL,,}"

# SIGTERM is sent by systemctl to stop Allsky and SIGUSR1 is sent to restart it.
# SIGHUP is sent to have the capture program reload their arguments.
# Ignore them so we don't leave a temporary or partially uploaded file if the service is stopped
# in the middle of an upload.
trap "" SIGTERM
trap "" SIGUSR1
trap "" SIGHUP

if [[ "${PROTOCOL}" == "s3" ]] ; then
	# xxxxxx How do you tell it the DESTINATION_FILE name ?
	if [ "${SILENT}" = "false" -a "${ALLSKY_DEBUG_LEVEL}" -ge 3 ]; then
		echo "${ME}: Uploading ${FILE_TO_UPLOAD} to aws ${S3_BUCKET}/${REMOTE_DIR}"
	fi
	${AWS_CLI_DIR}/aws s3 cp "${FILE_TO_UPLOAD}" s3://${S3_BUCKET}${REMOTE_DIR} --acl ${S3_ACL} > "${LOG}"
	RET=$?

elif [[ ${PROTOCOL} == "local" ]] ; then
	if [ "${SILENT}" = "false" -a "${ALLSKY_DEBUG_LEVEL}" -ge 3 ]; then
		echo "${ME}: Copying ${FILE_TO_UPLOAD} to ${REMOTE_DIR}/${DESTINATION_FILE}"
	fi
	cp "${FILE_TO_UPLOAD}" "${REMOTE_DIR}/${DESTINATION_FILE}"
	RET=$?

else # sftp/ftp/ftps
	# People sometimes have problems with ftp not working,
	# so save the commands we use so they can run lftp manually to debug.

	TEMP_NAME="${FILE_TYPE}-${RANDOM}"

	# If REMOTE_DIR isn't null (which it can be) and doesn't already have a trailing "/", append one.
	[ "${REMOTE_DIR}" != "" -a "${REMOTE_DIR: -1:1}" != "/" ] && REMOTE_DIR="${REMOTE_DIR}/"

	if [ "${SILENT}" = "false" -a "${ALLSKY_DEBUG_LEVEL}" -ge 3 ]; then
		echo "${ME}: FTP '${FILE_TO_UPLOAD}' to '${REMOTE_DIR}${DESTINATION_FILE}', TEMP_NAME=${TEMP_NAME}"
	fi
	LFTP_CMDS="${ALLSKY_TMP}/lftp_cmds.txt"
	set +H	# This keeps "!!" from being processed in REMOTE_PASSWORD
	(
		# xxx TODO: escape single quotes in REMOTE_PASSWORD so lftp doesn't fail - how?  With \ ?
		P="${REMOTE_PASSWORD}"

		# Sometimes have problems with "max-reties 1", so make it 2
		echo set net:max-retries 2
		echo set net:timeout 10

		echo "open --user '${REMOTE_USER}' --password '${P}' '${PROTOCOL}://${REMOTE_HOST}'"
		if [ "${DEBUG}" = "true" ]; then
			echo "quote PWD"
			echo "ls"
			echo "debug 5"
		fi
		if [ -n "${REMOTE_DIR}" ]; then
			echo "cd '${REMOTE_DIR}' || (echo 'cd ${REMOTE_DIR} failed!'; exit 1) || exit 1"
		fi

		# unlikely, but just in case it's already there
		echo "glob --exist '${TEMP_NAME}*' && rm '${TEMP_NAME}'"

		echo "put '${FILE_TO_UPLOAD}' -o '${TEMP_NAME}' || (echo 'put of ${FILE_TO_UPLOAD} to ${TEMP_NAME} failed!'; rm -f '${TEMP_NAME}'; exit 1) || exit 2"

		# Try to remove ${DESTINATION_FILE}, which may or may not exist.
		# If the "rm" fails, the file may be in use by the web server or another lftp,
		# so wait a few seconds and try again, but without the "-f" option so we see any error msg.
		echo "rm  -f '${DESTINATION_FILE}'"
		echo "glob --exist '${DESTINATION_FILE}*'
			&& (echo 'rm of ${DESTINATION_FILE} failed!  Trying again...';  (!sleep 3);  rm '${DESTINATION_FILE}' && echo 'WORKED' && exit 1)
			&& (echo '2nd rm failed, quiting.'; rm -f '${TEMP_NAME}'; exit 1)
			&& exit 3"

		echo "mv '${TEMP_NAME}' '${DESTINATION_FILE}'
			|| (echo 'mv of ${TEMP_NAME} to ${DESTINATION_FILE} failed!  Trying again...'; (!sleep 3); mv '${TEMP_NAME} '${DESTINATION_FILE}' && echo 'WORKED' && exit 0)
			|| (echo '2nd mv failed, quitting.'; rm -f '${TEMP_NAME}; exit 1)
			|| exit 4"

		echo exit 0
	) > "${LFTP_CMDS}"

	# To save a write to the SD card, only save output to ${LOG} on error.
	OUTPUT="$(lftp -f "${LFTP_CMDS}" 2>&1)"
	RET=$?
	if [ ${RET} -ne 0 ] ; then
		echo -en "${RED}"
		echo "*** ${ME}: ERROR, RET=${RET}:"
		echo "FILE_TO_UPLOAD='${FILE_TO_UPLOAD}'"
		echo "REMOTE_HOST='${REMOTE_HOST}'"
		echo "REMOTE_DIR='${REMOTE_DIR}'"
		echo "TEMP_NAME='${TEMP_NAME}'"
		echo "DESTINATION_FILE='${DESTINATION_FILE}'"
		echo -en "${NC}"
		echo
		if [ -n "${OUTPUT}" ]; then
			echo "${OUTPUT}" > "${LOG}"
			cat "${LOG}"
		fi

		echo -e "\n${YELLOW}Commands used${NC} are in: ${GREEN}${LFTP_CMDS}${NC}"
	else
		if [ "${ALLSKY_DEBUG_LEVEL}" -ge 3 ] && [ "${ON_TTY}" -eq 0 ]; then
			echo "${ME}: FTP '${FILE_TO_UPLOAD}' finished"
		fi
		if [ -n "${OUTPUT}" ]; then
			echo -e "lftp OUTPUT from '${FILE_TO_UPLOAD}:\n   ${OUTPUT}"
		fi
	fi
fi

# If a local directory was also specified, copy the file there.
if [ ${RET} -eq 0 -a "${COPY_TO}" != "" ]; then
	if [ "${SILENT}" = "false" -a "${ALLSKY_DEBUG_LEVEL}" -ge 3 ]; then
		# No need to specify the file being copied again since we did so above.
		echo "${ME}: Also copying to ${COPY_TO}/${DESTINATION_FILE}"
	fi
	cp "${FILE_TO_UPLOAD}" "${COPY_TO}/${DESTINATION_FILE}"
	RET=$?
fi

rm -f "${PID_FILE}"

exit ${RET}
