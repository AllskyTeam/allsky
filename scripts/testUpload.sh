#!/bin/bash

# Run upload.sh using a test file and if it doesn't work, parse the output
# looking for errors that are easy for users to miss.

# Allow this script to be executed manually, which requires ALLSKY_HOME to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$(realpath "$(dirname "${BASH_ARGV0}")/..")"
ME="$(basename "${BASH_ARGV0}")"

#shellcheck disable=SC2086 source-path=.
source "${ALLSKY_HOME}/variables.sh"		|| exit ${ALLSKY_ERROR_STOP}
#shellcheck disable=SC2086 source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"		|| exit ${ALLSKY_ERROR_STOP}

usage_and_exit()
{
	local RET=${1}
	[[ ${RET} -ne 0 ]] && echo -en "${RED}" >&2

	echo "Usage: ${ME} [--help] --website | --server ......." >&2

	[[ ${RET} -ne 0 ]] && echo -e "${NC}" >&2

	# shellcheck disable=SC2086
	exit ${RET}
}

DEBUG="false"
DO_WEBSITE="false"
DO_SERVER="false"
while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG}" in
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
			RET=1
			;;
		*)
			break	# done with arguments
			;;
	esac
	shift
done
[[ ${HELP} == "true" ]] && usage_and_exit 0
[[ ${DO_WEBSITE} == "false" && ${DO_SERVER} == "false" ]] && usage_and_exit 1

# Parse the output and provide fixes when possible.
parse_output()
{	local OUTPUT="${1}"
	local TYPE="${2}"

	local PROTOCOL DIR HOST USER S

	if [[ ${TYPE} == "REMOTEWEBSITE" ]]; then
		PROTOCOL=".remotewebsiteprotocol"
		DIR=".remotewebsiteimagedir"
		S="Remote Website Settings"
	else
		PROTOCOL=".remoteserverprotocol"
		DIR=".remoteserverimagedir"
		S="Remote Server Settings"
	fi
	HOST="${TYPE}_HOST"
	USER="${TYPE}_USER"

	# Parse output.
	if grep -i --silent "host name resolve timeout" "${OUTPUT}" ; then
		HOST="$( settings ".${HOST}" "${ENV_FILE}" )"
		echo -e "\t* Host name '${HOST}' not found." >&2
		echo -e "\t  FIX: Check the spelling of the server." >&2
	   	echo -e "\t       Make sure your network is up." >&2
	   	echo -e "\t       Make sure the network the server is on is up." >&2
	fi

	if grep -E -i --silent "User cannot log in|Login failed|Login incorrect" "${OUTPUT}" ; then
		echo -e "\t* Unable to login." >&2
		echo -e "\t  FIX: Make sure the username and password are correct." >&2
	fi

	if grep -i --silent "max-retries exceeded" "${OUTPUT}" ; then
		echo -e "\t* Unable to login for unknown reason." >&2
		echo -e "\t  FIX: Make sure the port is correct and your network is working." >&2
		PROTOCOL="$( settings "${PROTOCOL}" )"
		if [[ ${PROTOCOL} == "sftp" ]]; then
			HOST="$( settings ".${HOST}" "${ENV_FILE}" )"
			USER="$( settings ".${USER}" "${ENV_FILE}" )"
			echo -e "\t       On your Pi, run:  ssh ${USER}@${HOST}" >&2
			echo -e "\t       When prompted to enter 'yes' or 'no', enter 'yes'." >&2
			echo -e "\t       You may need to do this if the IP address of your Pi changed." >&2
		fi
	fi

	if grep -i --silent "The system cannot find the file specified" "${OUTPUT}" ; then
		if grep -i --silent "is current directory" "${OUTPUT}" ; then
			echo -e "\t* Login succeeded but unknown location found." >&2
		else
			# This should never happen.
			# If we can't login we wouldn't know if the location was there.
			echo -e "\t* Login failed and unknown location found." >&2
		fi
		DIR="$( settings "${DIR}" )"
		if [[ -n ${DIR} ]]; then
			echo -e "\t  The 'Image Directory' in the WebUI's '${S}' section is '${DIR}'." >&2
			echo -e "\t  FIX: make sure that directory exists on the server." >&2
		else
			echo -e "\t  The 'Image Directory' in the WebUI's '${S}' section is empty." >&2
			# TODO: can this every happen?
			echo -e "\t  FIX: unknown - not sure why this failed." >&2
		fi
	fi

	# Certificate-related issues
	if grep -i --silent "The authenticity of host" "${OUTPUT}" ; then
		HOST="$( settings ".${HOST}" "${ENV_FILE}" )"
		USER="$( settings ".${USER}" "${ENV_FILE}" )"
		PROTOCOL="$( settings "${PROTOCOL}" )"
		echo -e "\t* The remote machine doesn't know about your Pi." >&2
		if [[ ${PROTOCOL} == "sftp" ]]; then
			echo -e "\t  This happens the first time you use Protocol 'sftp' on a new Pi." >&2
			echo -e "\t  FIX: On your Pi, run:  ssh ${USER}@${HOST}" >&2
			echo -e "\t       When prompted to enter 'yes' or 'no', enter 'yes'." >&2
			echo -e "\t       You may need to do this if the IP address of your Pi changed." >&2
		else
			echo -e "\t  This error usually only happens when using Protocol 'sftp' on a new Pi." >&2
			echo -e "\t  You are using Protocol '${PROTOCOL}', so no know fix exists." >&2
		fi
	fi

	if grep -i --silent "certificate common name doesn't match requested host name" "${OUTPUT}" ; then
		echo -e "\t* Certificate verification issue." >&2
		echo -e "\t  FIX: Do one of the following on your Pi:" >&2
		echo -e "\t    echo 'set ssl:check-hostname' > ~/.lftprc" >&2
		echo -e "\t  or" >&2
		echo -e "\t    In the WebUI's '${S}' section set 'FTP Commands' to 'set ssl:check-hostname'." >&2
	fi

	if grep -i --silent "Not trusted" "${OUTPUT}" ; then
		echo -e "\t* Certificate verification issue." >&2
		echo -e "\t  FIX: o one of the following on your Pi:" >&2
		echo -e "\t    echo 'set ssl:verify-certificate no' > ~/.lftprc" >&2
		echo -e "\t  or" >&2
		echo -e "\t    In the WebUI's '${S}' section set 'FTP Commands' to 'set ssl:verify-certificate no'." >&2
	fi


	if [[ -s ${OUTPUT} || ${DEBUG} == "true" ]]; then
		echo -e "\n==================== OUTPUT:" >&2
		indent "${YELLOW}$( < "${OUTPUT}" )${NC}\n"
	fi
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
		PROTOCOL=".remotewebsiteprotocol"
		DIR=".remotewebsiteimagedir"
		REMOTE="web"
	else
		HUMAN_TYPE="Remote Server"
		PROTOCOL=".remoteserverprotocol"
		DIR=".remoteserverimagedir"
		REMOTE="server"
	fi

	PROTOCOL="$( settings "${PROTOCOL}" )"
	if [[ $? -ne 0 || -z ${PROTOCOL} ]]; then
		echo -e "${RED}${ME}: could not find protocol for ${HUMAN_TYPE}; unable to test.${NC}" >&2
		return 1
	fi

	DIR="$( settings "${DIR}" )"
	DIR="${DIR:=null}"

	CMD="${ALLSKY_SCRIPTS}/upload.sh --debug --remote ${REMOTE} ${TEST_FILE} ${DIR} ${bTEST_FILE} ${ME}"
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
		echo -e "\tPlease remove '${D}${bTEST_FILE}' on your server."
		if [[ -s ${OUTPUT_FILE} && ${DEBUG} == "true" ]]; then
			echo -e "OUTPUT:"
			echo -e "${YELLOW}$( < "${OUTPUT_FILE}" )${NC}\n"
		fi
	else
		echo -e "${RED}Upload to ${HUMAN_TYPE} FAILED with RET=${RET}.${NC}"
		parse_output "${OUTPUT_FILE}" "${TYPE}"
	fi

	rm -f "${TEST_FILE}"
	[[ ! -s "${OUTPUT_FILE}" ]] && rm -f "${OUTPUT_FILE}"
	# shellcheck disable=SC2086
	exit ${RET}
}

# ========================= main body of program
[[ ${DO_WEBSITE} == "true" ]] && do_test "REMOTEWEBSITE"
[[ ${DO_SERVER} == "true" ]] && do_test "REMOTESERVER"

exit 0
