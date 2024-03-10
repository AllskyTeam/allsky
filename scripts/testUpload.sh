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

usage_and_exit()
{
	local RET=${1}
	{
		[[ ${RET} -ne 0 ]] && echo -en "${RED}"
		echo "Usage: ${ME} [--help] --website  and/or  --server"
		[[ ${RET} -eq 2 ]] && echo -e "\nMust specify --website and/or --server\n"
		[[ ${RET} -ne 0 ]] && echo -e "${NC}"
	} >&2
	exit "${RET}"
}

OK="true"
DEBUG="false"
DO_WEBSITE="false"
DO_SERVER="false"
while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
		--help)
			HELP="true"
			;;
		--debug)
			DEBUG="true"
			;;
		--website)
			DO_WEBSITE="true"
			;;
		--server)
			DO_SERVER="true"
			;;
		-*)
			echo -e "${RED}Unknown argument '${ARG}'.${NC}" >&2
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


# Parse the output and provide fixes when possible.
parse_output()
{	local OUTPUT="${1}"
	local TYPE="${2}"

	local PROTOCOL  DIR  HOST  USER  STRING  S  SSL

	if [[ ${TYPE} == "REMOTEWEBSITE" ]]; then
		PROTOCOL="remotewebsiteprotocol"
		DIR="remotewebsiteimagedir"
		S="Remote Website Settings"
	else
		PROTOCOL="remoteserverprotocol"
		DIR="remoteserverimagedir"
		S="Remote Server Settings"
	fi
	HOST="${TYPE}_HOST"
	USER="${TYPE}_USER"

	# Parse output.
	STRING="host name resolve timeout"
	if grep --ignore-case --silent "${STRING}" "${OUTPUT}" ; then
		HOST="$( settings ".${HOST}" "${ENV_FILE}" )"
		echo "* Host name '${HOST}' not found."
		echo "  FIX: Check the spelling of the server."
	   	echo "       Make sure your network is up."
	   	echo "       Make sure the network the server is on is up."
	fi >&2

	STRING="User cannot log in|Login failed|Login incorrect"
	if grep -E --ignore-case --silent "${STRING}" "${OUTPUT}" ; then
		echo "* Unable to login."
		echo "  FIX: Make sure the username and password are correct."
	fi >&2

	STRING="max-retries exceeded"
	if grep --ignore-case --silent "${STRING}" "${OUTPUT}" ; then
		echo "* Unable to login for unknown reason."
		echo "  FIX: Make sure the port is correct and your network is working."
		PROTOCOL="$( settings ".${PROTOCOL}" )"
		if [[ ${PROTOCOL} == "sftp" ]]; then
			HOST="$( settings ".${HOST}" "${ENV_FILE}" )"
			USER="$( settings ".${USER}" "${ENV_FILE}" )"
			echo "       On your Pi, run:  ssh ${USER}@${HOST}"
			echo "       When prompted to enter 'yes' or 'no', enter 'yes'."
			echo "       You may need to do this if the IP address of your Pi changed."
		fi
	fi >&2

	STRING="The system cannot find the file specified"
	if grep --ignore-case --silent "${STRING}" "${OUTPUT}" ; then
		STRING="is current directory"
		if grep --ignore-case --silent "${STRING}" "${OUTPUT}" ; then
			echo "* Login succeeded but unknown location found."
		else
			# This should never happen.
			# If we can't login we wouldn't know if the location was there.
			echo "* Login failed and unknown location found."
		fi
		DIR="$( settings ".${DIR}" )"
		if [[ -n ${DIR} ]]; then
			echo "  The 'Image Directory' in the WebUI's '${S}' section is '${DIR}'."
			echo "  FIX: make sure that directory exists on the server."
		else
			echo "  The 'Image Directory' in the WebUI's '${S}' section is empty."
			# TODO: can this ever happen?
			echo "  FIX: unknown - not sure why this failed."
		fi
	fi >&2

	# Certificate-related issues
	STRING="The authenticity of host"
	if grep --ignore-case --silent "${STRING}" "${OUTPUT}" ; then
		HOST="$( settings ".${HOST}" "${ENV_FILE}" )"
		USER="$( settings ".${USER}" "${ENV_FILE}" )"
		PROTOCOL="$( settings ".${PROTOCOL}" )"
		echo "* The remote machine doesn't know about your Pi."
		if [[ ${PROTOCOL} == "sftp" ]]; then
			echo "  This happens the first time you use Protocol 'sftp' on a new Pi."
			echo "  FIX: On your Pi, run:  ssh ${USER}@${HOST}"
			echo "       When prompted to enter 'yes' or 'no', enter 'yes'."
			echo "       You may need to do this if the IP address of your Pi changed."
		else
			echo "  This error usually only happens when using Protocol 'sftp' on a new Pi."
			echo "  You are using Protocol '${PROTOCOL}', so no know fix exists."
		fi
	fi >&2

	STRING="certificate common name doesn't match requested host name"
	if grep --ignore-case --silent "${STRING}" "${OUTPUT}" ; then
		echo "* Certificate verification issue."
		echo "  FIX: Do one of the following on your Pi:"
		echo "    echo 'set ssl:check-hostname' > ~/.lftprc"
		echo "  or"
		echo "    In the WebUI's '${S}' section set 'FTP Commands' to 'set ssl:check-hostname'."
	fi >&2

	STRING="Not trusted"
	if grep --ignore-case --silent "${STRING}" "${OUTPUT}" ; then
		SSL="set ssl:verify-certificate no"
		echo "* Certificate verification issue."
		echo "  FIX: do one of the following on your Pi:"
		echo "    echo '${SSL}' > ~/.lftprc"
		echo "  or"
		echo "    In the WebUI's '${S}' section set 'FTP Commands' to '${SSL}'."
	fi >&2


	if [[ -s ${OUTPUT} || ${DEBUG} == "true" ]]; then
		echo -e "\n==================== OUTPUT:"
		indent "${YELLOW}$( < "${OUTPUT}" )${NC}\n"
	fi >&2
}


# Test an upload.
do_test()
{
	local TYPE="${1}"

	local TEST_FILE bTEST_FILE OUTPUT_FILE HUMAN_TYPE PROTOCOL DIR REMOTE CMD D

	TEST_FILE="/tmp/${ME}.txt"
	bTEST_FILE="$( basename "${TEST_FILE}" )"
	echo "Test file for ${TYPE}" > "${TEST_FILE}" || return 1

	OUTPUT_FILE="/tmp/${ME}-${TYPE}.txt"

	if [[ ${TYPE} == "REMOTEWEBSITE" ]]; then
		HUMAN_TYPE="Remote Website"
		PROTOCOL="remotewebsiteprotocol"
		DIR="remotewebsiteimagedir"
		REMOTE="web"
	else
		HUMAN_TYPE="Remote Server"
		PROTOCOL="remoteserverprotocol"
		DIR="remoteserverimagedir"
		REMOTE="server"
	fi

	PROTOCOL="$( settings ".${PROTOCOL}" )"
	if [[ $? -ne 0 || -z ${PROTOCOL} ]]; then
		echo -e "${RED}${ME}: could not find protocol for ${HUMAN_TYPE}; unable to test.${NC}" >&2
		return 1
	fi

	DIR="$( settings ".${DIR}" )"
	DIR="${DIR:=null}"

	CMD="${ALLSKY_SCRIPTS}/upload.sh --debug --remote-${REMOTE}"
	CMD+=" ${TEST_FILE} ${DIR} ${bTEST_FILE} ${ME}"
	[[ ${DEBUG} == "true" ]] && echo -e "Executing:\n\t${CMD}"
	${CMD} > "${OUTPUT_FILE}" 2>&1
	RET=$?
	if [[ ${RET} -eq 0 ]]; then
		echo -e "${GREEN}Upload to ${HUMAN_TYPE} succeeded.${NC}"
		if [[ -z ${DIR} || ${DIR} == "null" ]]; then
			D=""
		else
			D="${DIR}/"
		fi
		echo -en "\t"
		echo     "Please remove '${D}${bTEST_FILE}' on your server." >> "${MSG_FILE}"
		if [[ -s ${OUTPUT_FILE} && ${DEBUG} == "true" ]]; then
			echo -e "OUTPUT:"
			echo -e "${YELLOW}$( < "${OUTPUT_FILE}" )${NC}\n"
		fi
	else
		echo -ne "${RED}"
		echo -n  "Upload to ${HUMAN_TYPE} FAILED with RET=${RET}."
		echo -e  "${NC}"
		parse_output "${OUTPUT_FILE}" "${TYPE}"
	fi

	rm -f "${TEST_FILE}"
	[[ ! -s ${OUTPUT_FILE} ]] && rm -f "${OUTPUT_FILE}"

	return "${RET}"
}

# ========================= main body of program
MSG_FILE="/tmp/$$"
ERR_MSG=""
RET=0
if [[ ${DO_WEBSITE} == "true" ]]; then
	ERR_MSG+="$( do_test "REMOTEWEBSITE" 2>&1 )"
	(( RET += $? ))
fi
if [[ ${DO_SERVER} == "true" ]]; then
	ERR_MSG+="$( do_test "REMOTESERVER" 2>&1 )"
	(( RET += $? ))
fi

if [[ -n ${ERR_MSG} ]]; then
	if [[ ${ON_TTY} == "true" ]]; then
		echo -e "\n${ERR_MSG}" >&2
	else
		"${ALLSKY_SCRIPTS}/addMessage.sh" "error" "${ERR_MSG}"
	fi
fi

if [[ -s ${MSG_FILE} ]]; then
	M="$( < "${MSG_FILE}" )"
	if [[ ${ON_TTY} == "true" ]]; then
		echo -e "\n${M}"
	else
		"${ALLSKY_SCRIPTS}/addMessage.sh" "info" "${M}"
	fi
	rm "${MSG_FILE}"
fi

exit ${RET}
