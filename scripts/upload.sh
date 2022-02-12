#!/bin/bash

# Script to upload files.
# This is a separate script so it can also be used manually to test uploads.

# Allow this script to be executed manually, which requires ALLSKY_HOME to be set.
if [ -z "${ALLSKY_HOME}" ] ; then
	export ALLSKY_HOME="$(realpath $(dirname "${BASH_ARGV0}")/..)"
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

ME="$(basename "${BASH_ARGV0}")"

# TODO: Use getopt() so arguments can be in any order
if [ $# -lt 3 ] ; then
	# When run manually, the unique_name (arg $4) normally won't be given.
	echo -en "${RED}"
	echo -n "*** Usage: ${ME} [--silent]  file_to_upload  directory  destination_file_name [unique_name] [local_directory]"
	echo -e "${NC}"
	echo "Where:"
	echo "   '--silent' doesn't display any status messages"
	echo "   'file_to_upload' is the path name of the file you want to upload."
	echo "   'directory' is the directory ON THE SERVER the file should be uploaded to."
	echo "   'destination_file_name' is the name the file should be called ON THE SERVER."
	echo "   'unique_name' is an optional, temporary name to use when uploading the file."
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
# ${4} only used by ftp
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

# Convert to lowercase so we don't care if user specified upper or lowercase.
PROTOCOL="${PROTOCOL,,}"

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

	if [ "${4}" = "" ] ; then
		TEMP_NAME="x-${RANDOM}"
	else
		TEMP_NAME="${4}-${RANDOM}"
	fi

	# If REMOTE_DIR isn't null (which it can be) and doesn't already have a trailing "/", append one.
	[ "${REMOTE_DIR}" != "" -a "${REMOTE_DIR: -1:1}" != "/" ] && REMOTE_DIR="${REMOTE_DIR}/"

	if [ "${SILENT}" = "false" -a "${ALLSKY_DEBUG_LEVEL}" -ge 3 ]; then
		echo "${ME}: FTP'ing ${FILE_TO_UPLOAD} to ${REMOTE_DIR}${DESTINATION_FILE}, TEMP_NAME=${TEMP_NAME}"
	fi
	LFTP_CMDS="${ALLSKY_TMP}/lftp_cmds.txt"
	# COMPATIBILITY CHECK.  New names start with "REMOTE_".
	# If "REMOTE_HOST" doesn't exist assume the user has the old-style ftp-settings.sh file.
	# xxxxx THIS CHECK WILL GO AWAY IN THE FUTURE.
	if [ -z "${REMOTE_HOST}" ]; then
		REMOTE_HOST="${HOST}"
		REMOTE_PASSWORD="${PASSWORD}"
		REMOTE_USER="${USER}"
	fi
set +H # XXXX needed so !! isn't processed in REMOTE_PASSWORD
	(
		[ "${LFTP_COMMANDS}" != "" ] && echo ${LFTP_COMMANDS}
		# xxx TODO: escape single quotes in REMOTE_PASSWORD - how?  With \ ?
		P="${REMOTE_PASSWORD}"

		# Sometimes have problems with "max-reties 1", so make it 2
		echo set net:max-retries 2
		echo set net:timeout 10

		echo "open --user '${REMOTE_USER}' --password '${P}' '${PROTOCOL}://${REMOTE_HOST}'"
		# unlikely, but just in case it's already there
		echo "rm -f '${REMOTE_DIR}${TEMP_NAME}'"
		echo "put '${FILE_TO_UPLOAD}' -o '${REMOTE_DIR}${TEMP_NAME}' || (echo 'put of ${FILE_TO_UPLOAD} failed!'; exit 1) || exit 2"
		echo "rm -f '${REMOTE_DIR}${DESTINATION_FILE}'"
		echo "mv '${REMOTE_DIR}${TEMP_NAME}' '${REMOTE_DIR}${DESTINATION_FILE}' || (echo 'mv of ${TEMP_NAME} to ${DESTINATION_FILE} in ${REMOTE_DIR} failed!'; exit 1) || exit 3"

		echo exit 0
	) > "${LFTP_CMDS}"
	lftp -f "${LFTP_CMDS}" > "${LOG}" 2>&1
	RET=$?

	if [ ${RET} -ne 0 ] ; then
		echo -en "${RED}"
		echo "*** ${ME}: ERROR:"
		echo "FILE_TO_UPLOAD='${FILE_TO_UPLOAD}'"
		echo "REMOTE_HOST='${REMOTE_HOST}'"
		echo "REMOTE_DIR='${REMOTE_DIR}'"
		echo "TEMP_NAME='${TEMP_NAME}'"
		echo "DESTINATION_FILE='${DESTINATION_FILE}'"
		echo -en "${NC}"
		echo
		cat "${LOG}"

		echo -e "\n${YELLOW}Commands used${NC} are in: ${GREEN}${LFTP_CMDS}${NC}"
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

exit ${RET}
