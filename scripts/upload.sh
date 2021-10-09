#!/bin/bash

# Script to upload files.
# This is a separate script so it can also be used manually to test uploads.

# Allow this script to be executed manually, which requires ALLSKY_HOME to be set.
if [ -z "${ALLSKY_HOME}" ] ; then
	export ALLSKY_HOME="$(realpath $(dirname "${BASH_ARGV0}")/..)"
fi

source "${ALLSKY_HOME}/variables.sh"
source "${ALLSKY_CONFIG}/config.sh"
source "${ALLSKY_SCRIPTS}/filename.sh"
source "${ALLSKY_CONFIG}/ftp-settings.sh"

if [ "${1}" = "--silent" ] ; then
	SILENT="true"
	shift
else
	SILENT="false"
fi

ME="$(basename "${BASH_ARGV0}")"

if [ $# -lt 3 ] ; then
	# When run manually, the uniqueID (arg $4) normally won't be given.
	echo -en "${RED}"
	echo -n "*** Usage: ${ME} [--silent]  file_to_upload  directory  destination_file_name"
	echo -e "${NC}"
	echo "Where:"
	echo "   '--silent' doesn't display any status messages"
	echo "   'file_to_upload' is the path name of the file you want to upload."
	echo "   'directory' is the directory ON THE SERVER the file should be uploaded to."
	echo "   'destination_file_name' is the name the file should be called ON THE SERVER."
	echo
	echo -n "For example: ${ME}  keogram-20210710.jpg  /keograms  keogram.jpg"
	exit 1
fi
FILE_TO_UPLOAD="${1}"
REMOTE_DIR="${2}"
DESTINATION_FILE="${3}"
if [ "${4}" = "" ] ; then
	TEMP_NAME="x-${RANDOM}"
else
	TEMP_NAME="${4}-${RANDOM}"
fi

if [ ! -f "${FILE_TO_UPLOAD}" ] ; then
	echo -en "${RED}"
	echo -n "*** ${ME}: ERROR: File to upload '${FILE_TO_UPLOAD}' not found!"
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

elif [[ ${PROTOCOL} == "local" ]] ; then
	if [ "${SILENT}" = "false" -a "${ALLSKY_DEBUG_LEVEL}" -ge 3 ]; then
		echo "${ME}: Copying ${FILE_TO_UPLOAD} to ${REMOTE_DIR}/${DESTINATION_FILE}"
	fi
	cp "${FILE_TO_UPLOAD}" "${REMOTE_DIR}/${DESTINATION_FILE}"

else # sftp/ftp
	# People sometimes have problems with ftp not working,
	# so save the commands we use so they can run lftp manually to debug.

	# If REMOTE_DIR isn't null (which it can be), append a "/".
	[ "${REMOTE_DIR}" != "" ] && REMOTE_DIR="${REMOTE_DIR}/"

	if [ "${SILENT}" = "false" -a "${ALLSKY_DEBUG_LEVEL}" -ge 3 ]; then
		echo "${ME}: FTP'ing ${FILE_TO_UPLOAD} to ${REMOTE_DIR}${DESTINATION_FILE}"
	fi
	LFTP_CMDS="${ALLSKY_TMP}/lftp_cmds.txt"

	(
		[ "${LFTP_COMMANDS}" != "" ] && echo ${LFTP_COMMANDS}
		# xxx TODO: escape double quotes in PASSWORD - how?  With \ ?
		P="${PASSWORD}"
		echo open --user "\"${USER}\"" --password "\"${P}\"" "${PROTOCOL}://${HOST}"
		# Sometimes have problems with "max-reties 1", so make it 2
		echo set net:max-retries 2
		echo set net:timeout 20
		echo rm -f "${TEMP_NAME}"		# just in case it's already there
		echo "put '${FILE_TO_UPLOAD}' -o '${TEMP_NAME}' || (echo 'put of ${FILE_TO_UPLOAD} failed!' && exit) "
		echo rm -f "\"${DESTINATION_FILE}\""
		echo mv "${TEMP_NAME}" "\"${REMOTE_DIR}${DESTINATION_FILE}\""
		echo exit
	) > "${LFTP_CMDS}"
	lftp -f "${LFTP_CMDS}" > "${LOG}" 2>&1
	RET=$?

	if [ ${RET} -ne 0 ] ; then
		echo -en "${RED}"
		echo "*** ${ME}: ERROR:"
		echo "FILE_TO_UPLOAD='${FILE_TO_UPLOAD}'"
		echo "REMOTE_DIR='${REMOTE_DIR}'"
		echo "TEMP_NAME='${TEMP_NAME}'"
		echo "DESTINATION_FILE='${DESTINATION_FILE}'"
		echo -en "${NC}"
		echo
		cat "${LOG}"

		echo -e "\n${YELLOW}Commands used${NC} (run via: ${GREEN}lftp -f ${LFTP_CMDS}${NC}):"
		cat "${LFTP_CMDS}"

	elif tty --silent && [ "${SILENT}" = "false" ]; then
		echo -en "${YELLOW}"
		echo -n "INFO: '${LFTP_CMDS}' contains the lftp commands used to upload the file."
		echo -e "${NC}"
	fi
fi

exit ${RET}
