#!/bin/bash

# Run upload.sh using a test file and if it doesn't work, parse the output
# looking for errors that are easy for users to miss.

# Allow this script to be executed manually, which requires ALLSKY_HOME to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"		|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"		|| exit "${EXIT_ERROR_STOP}"

function usage_and_exit()
{
	exec >&2
	local RET=${1}
	local MSG="Usage: ${ME} [--help] [--debug] [--silent] [--file f] [--fromInstall] \\\\"
	MSG+="\n\t[--output o] --website  and/or  --server"
	[[ ${RET} -eq 2 ]] && echo -e "\nERROR: You must specify --website and/or --server\n"

	if [[ ${RET} -ne 0 ]]; then
		wE_ "${MSG}"
	else
		echo -e "${MSG}"
	fi
	echo
	echo "Where:"
	echo "   --silent        Only outputs errors."
	echo "   --file f        Optionally specifies the test file to upload."
	echo "   --fromInstall   Outputs text without colors or other escape sequences."
	echo "   --output o      Puts detailed output in the specified file."

	exit "${RET}"
}

OK="true"
HELP="false"
DEBUG="false"
SILENT="false"
DEFAULT_TEST_FILE="/tmp/${ME}.txt"
TEST_FILE="${DEFAULT_TEST_FILE}"
OUT_FILE=""
DO_WEBSITE="false"
DO_SERVER="false"
FROM_INSTALL="false"
while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
		--help)
			HELP="true"
			;;
		--debug)
			DEBUG="true"
			;;
		--silent)
			SILENT="true"		# only output errors
			;;
		--frominstall)
			FROM_INSTALL="true"
			;;
		--file)
			TEST_FILE="${2}"
			shift
			;;
		--output)
			OUT_FILE="${2}"
			shift
			;;
		--website)
			DO_WEBSITE="true"
			;;
		--server)
			DO_SERVER="true"
			;;
		-*)
			wE_ "Unknown argument '${ARG}'." >&2
			OK="false"
			;;
		*)
			break	# done with arguments
			;;
	esac
	shift
done
[[ ${HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" ]] && usage_and_exit 1
[[ ${DO_WEBSITE} == "false" && ${DO_SERVER} == "false" ]] && usage_and_exit 2


FIX="FIX"
if [[ ${FROM_INSTALL} == "true" ]]; then
	function bold_it() { return 0; }
else
	function bold_it() { echo -e "${BOLD:-${wBOLD}}${1}${NC:-${wNBOLD}}"; }
	FIX="${BOLD:-${wBOLD}}${FIX}${NC:-${wNBOLD}}"
fi

# Display a "FIX" message.
function fix()
{
	local C="$1"		# Command name
	local S="$2"		# Section name
	local F="$3"		# Fix string

	echo -e "  ${F}Do one of the following on your Pi:"
	echo    "    In the WebUI's '${S}' section add '${C}' to 'FTP Commands'."
	echo    "  or"
	echo    "    echo '${C}' > ~/.lftprc"
}

# Parse the output file and provide fixes when possible.
function parse_output()
{
	local FILE="${1}"
	local TYPE="${2}"

	[[ ! -s ${FILE} ]] && return	# empty file - shouldn't happen...

	local STRING  S  CMD  F

	if [[ ${TYPE} == "REMOTEWEBSITE" ]]; then
		S="Remote Website Settings"
	else
		S="Remote Server Settings"
	fi

	# Parse output.
	STRING="host name resolve timeout"
	if grep --ignore-case --silent "${STRING}" "${FILE}" ; then
		bold_it "\n* ${WSNs}Server Name${WSNe} ${WSVs}${HOST}${WSVe} not found."
		echo -e "  ${FIX}: Check the spelling of the server."
	   	echo    "       Make sure your network is up."
	   	echo    "       Make sure the network the server is on is up."
	fi >&2

	STRING="User cannot log in|Login failed|Login incorrect"
	if grep -E --ignore-case --silent "${STRING}" "${FILE}" ; then
		bold_it "\n* Unable to log in."
		echo -e "  ${FIX}: Make sure the ${WSNs}User Name${WSNe} and ${WSNs}Password${WSNe} are correct."
	fi >&2

	STRING="max-retries exceeded"
	if grep --ignore-case --silent "${STRING}" "${FILE}" ; then
		bold_it "\n* Unable to log: max-retries exceeded."
		echo -e "  ${FIX}: Make sure the ${WSNs}Port${WSNe} is correct and your network is working."
		if [[ ${PROTOCOL} == "sftp" ]]; then
			echo "       On your Pi, run:  ssh ${USER}@${HOST}"
			echo "       When prompted to enter 'yes' or 'no', enter 'yes'."
			echo "       You may need to do this if the IP address of your Pi changed."
		fi
	fi >&2

	STRING="The system cannot find the file specified"
	if grep --ignore-case --silent "${STRING}" "${FILE}" ; then
		STRING="is current directory"
		if grep --ignore-case --silent "${STRING}" "${FILE}" ; then
			bold_it "\n* Login succeeded but unknown location found."
		else
			# This should never happen.
			# If we can't login we wouldn't know if the location was there.
			bold_it "\n* Login failed and unknown location found."
		fi
		if [[ -n ${DIR} && ${DIR} != "null" ]]; then
			echo "  The ${WSNs}Image Directory${WSNe} in the WebUI's '${S}' section is ${WSVs}${DIR}${WSVe}."
			F="  ${FIX}: Make sure the ${WSVs}${DIR}${WSVe} directory exists on the server."
		else
			echo "  The ${WSNs}Image Directory${WSNe} in the WebUI's '${S}' section is empty."
			# TODO: can this ever happen?
			F="  ${FIX}: unknown - not sure why this failed."
		fi

		local CONTENTS="$( get_ls_contents "${FILE}" )"
		if [[ -z ${CONTENTS} ]]; then
			echo "  There appears to be no files or directories in the server's root directory."
		else
			echo "  The following files and/or directories are in the server's root directory:"
			# "<DIR>" breaks html output
			indent --spaces "${CONTENTS}" | sed 's/<DIR>/ DIR /g'
		fi
		echo -e "\n${F}"
	fi >&2

	STRING="An unexpected TLS packet was received"
	if grep --ignore-case --silent "${STRING}" "${FILE}" ; then
		CMD="set ftp:ssl-force true"
		bold_it "\n* Authentication protocol issue."
		MSG="${FIX}: Change ${WSNs}Protocol${WSNe} to ${WSVs}ftp${WSVe}, then\n  "
		fix "${CMD}" "${S}" "${MSG}"
	fi >&2

	# Certificate-related issues
	STRING="The authenticity of host"
	if grep --ignore-case --silent "${STRING}" "${FILE}" ; then
		bold_it "\n* The remote machine doesn't know about your Pi."
		if [[ ${PROTOCOL} == "sftp" ]]; then
			echo    "  This happens the first time you use ${WSNs}Protocol${WSNe} ${WSVs}sftp${WSVe} on a new Pi."
			echo -e "  ${FIX}: On your Pi, run:  ssh ${USER}@${HOST}"
			echo    "       When prompted to enter 'yes' or 'no', enter 'yes'."
			echo    "       You may need to do this if the IP address of your Pi changed."
		else
			echo "  This error usually only happens when using Protocol ${WSVs}sftp${WSVe} on a new Pi."
			echo "  You are using ${WSNs}Protocol${WSNe} '${PROTOCOL}', so no known fix exists."
		fi
	fi >&2

	STRING="certificate common name doesn't match requested host name"
	if grep --ignore-case --silent "${STRING}" "${FILE}" ; then
		CMD="set ssl:check-hostname false"
		bold_it "\n* Certificate host verification issue."
		fix "${CMD}" "${S}" "${FIX}: "
	fi >&2

	# Ignore the WARNING messages for this; it continues to work.
	STRING="ERROR.*NOT trusted"
	if grep --ignore-case --silent "${STRING}" "${FILE}" ; then
		CMD="set ssl:verify-certificate no"
		bold_it "\n* Certificate verification issue."
		fix "${CMD}" "${S}" "${FIX}: "
	fi >&2

	STRING="No space left on device"
	if grep --ignore-case --silent "${STRING}" "${FILE}" ; then
		bold_it "\n* Server is out of disk space."
		echo -e "  ${FIX}: Remove unused files on server."
	fi >&2

	# Output already displayed in DEBUG mode.
	if [[ ${DEBUG} == "false" && -z ${OUT_FILE} ]]; then
		echo; wI_ "Raw output is in ${WSFs}${FILE}${WSFe}.\n\n" >&2
	fi
}


# Test an upload.
function do_test()
{
	local TYPE="${1}"
	local bTEST_FILE  HUMAN_TYPE  REMOTE  CMD  D

	bTEST_FILE="$( basename "${TEST_FILE}" )"
	if [[ ! -f ${TEST_FILE} ]]; then
		echo "Test file for ${TYPE}" > "${TEST_FILE}" || return 1
	fi
	if [[ -n ${OUT_FILE} ]]; then
		OUTPUT_FILE="${OUT_FILE}"
	else
		OUTPUT_FILE="${ALLSKY_TMP}/${ME}-${TYPE}.txt"
	fi

	# Set global variables used by us and parse_output().
	HOST="$( settings ".${TYPE}_HOST" "${ALLSKY_ENV}" )"
	if [[ ${TYPE} == "REMOTEWEBSITE" ]]; then
		HUMAN_TYPE="Remote Website ${HOST}"
		PROTOCOL="remotewebsiteprotocol"
		DIR="remotewebsiteimagedir"
		REMOTE="web"
	else
		HUMAN_TYPE="Remote Server ${HOST}"
		PROTOCOL="remoteserverprotocol"
		DIR="remoteserverimagedir"
		REMOTE="server"
	fi
	PROTOCOL="$( settings ".${PROTOCOL}" )"
	if [[ $? -ne 0 || -z ${PROTOCOL} ]]; then
		wE_ "${ME}: could not find ${WSNs}Protocol${WSNe} for ${HUMAN_TYPE}; unable to test." >&2
		return 1
	fi
	USER="$( settings ".${TYPE}_USER" "${ALLSKY_ENV}" )"
	DIR="$( settings ".${DIR}" )"
	DIR="${DIR:=null}"

	CMD="${ALLSKY_SCRIPTS}/upload.sh --debug --remote-${REMOTE}"
	if [[ ${DEBUG} == "true" ]]; then
		# Tell upload.sh to send output of its upload commands to 
		# the specified file.
		# We'll "tail -f" the file below so the user sees the output
		# as it appears.
		# Otherwise, they have to wait until the command completes
		# before they see anything, which can be tens of seconds.
		OUT="${ALLSKY_TMP}/test_raw_file-${TYPE}.txt"
		CMD+=" --output ${OUT}"
	else
		OUT="${OUTPUT_FILE}"
	fi
	CMD+=" ${TEST_FILE} ${DIR} ${bTEST_FILE} ${ME}"

	if [[ ${DEBUG} == "true" ]]; then
		# Need to send the debugging output to file descriptor 3.
		echo -e "Executing:\n    ${CMD}\n" >&3

		: > "${OUT}"
		${CMD} > "${OUTPUT_FILE}" 2>&1 &
		PID=$( jobs -p )
		[[ -n ${PID} ]] && tail -f "${OUT}" --pid="${PID}" >&3
		wait -n
		RET=$?		# return code from ${CMD}
	else
		${CMD} > "${OUTPUT_FILE}" 2>&1
		RET=$?
	fi

	if [[ ${RET} -eq 0 ]]; then
		[[ ${SILENT} == "false" ]] && wO_ "Test upload to ${HUMAN_TYPE} succeeded."
		if [[ -z ${DIR} || ${DIR} == "null" ]]; then
			D=""
		else
			D="${DIR}/"
		fi
		if [[ ${SILENT} == "false" ]]; then
			echo -en "\t"
			echo "Please remove '${D}${bTEST_FILE}' on your server." >> "${MSG_FILE}"
		fi
	else
		wE_ "Test upload to ${HUMAN_TYPE} FAILED."
		if [[ -s ${OUT} ]]; then
			parse_output "${OUT}" "${TYPE}"
		elif [[ -s ${OUTPUT_FILE} ]]; then
			indent --spaces "$( < "${OUTPUT_FILE}" )"
		fi
	fi

	if [[ ${TEST_FILE} == "${DEFAULT_TEST_FILE}" ]]; then
		rm -f "${TEST_FILE}"
	fi
	[[ ! -s ${OUTPUT_FILE} ]] && rm -f "${OUTPUT_FILE}"
	[[ ${DEBUG} == "true" && ! -s ${OUT} ]] && rm -f "${OUT}"

	return "${RET}"
}

# ========================= main body of program

# In debug mode, do_test() outputs the commands run by upload.sh in real time.
# Because do_test() is run below in sub-shells that capture stdout and stderr,
# it has to write to file descriptor 3 for the user to see the output
# in real time.
[[ ${DEBUG} == "true" ]] && exec 3>&2

# Globals
HOST=""
USER=""
PROTOCOL=""
DIR=""

MSG_FILE="/tmp/$$"
ERR_MSG=""
OK_MSG=""
RET=0
if [[ ${DO_WEBSITE} == "true" ]]; then
	if X="$( do_test "REMOTEWEBSITE" 2>&1 )" ; then
		OK_MSG+="${X}"
	else
		ERR_MSG+="${X}"
		RET=1
	fi
fi
if [[ ${DO_SERVER} == "true" ]]; then
	if X="$( do_test "REMOTESERVER" 2>&1 )" ; then
		OK_MSG+="${X}"
	else
		ERR_MSG+="${X}"
		RET=1
	fi
fi

if [[ -n ${ERR_MSG} ]]; then
	if [[ ${ON_TTY} == "true" ]]; then
		echo -e "\n${ERR_MSG}" >&2
	else
		echo -e "ERROR:: ${ERR_MSG}" >&2		# Must have "::" for class=error
	fi
fi
if [[ -n ${OK_MSG} ]]; then
	if [[ ${ON_TTY} == "true" ]]; then
		echo -e "\n${OK_MSG}" >&2
	else
		echo -e "SUCCESS:: ${OK_MSG}" >&2		# Must have "::" for class=success
	fi
fi

if [[ -s ${MSG_FILE} ]]; then
	M="$( < "${MSG_FILE}" )"
	if [[ ${ON_TTY} == "true" ]]; then
		echo -e "${M}"
	else
		echo -e "INFO:: ${M}"					# Must have "::" for class=info
	fi
fi
rm -f "${MSG_FILE}"

exit "${RET}"
