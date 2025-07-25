#!/bin/bash

# Determine the pathname of an Allsky Website (or a remote Server),
# and try to determine what URL points to that directory.

# We assume the user already verified they can upload files to the site.

# Allow this script to be executed manually, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/../.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/installUpgradeFunctions.sh"	|| exit "${EXIT_ERROR_STOP}"

usage_and_exit()
{
	local RET=${1}
	local MSG="${2}"
	exec 2>&1
	local USAGE="\n"
	[[ -n ${MSG} ]] && USAGE+="${MSG}\n"
	USAGE+="Usage: ${ME} [--help] [--debug]  --website | --server URL"
	if [[ ${RET} -ne 0 ]]; then
		E_ "${USAGE}"
	else
		echo -e "${USAGE}"
	fi

	echo
	echo "Helps determine what to put in the 'Image Directory' and 'Website URL' settings"
	echo "in the 'Remote Server' section of the WebUI."
	echo "It does this by displaying information from a remote Website's server via FTP"
	echo "and via a URL, such as the directory name (they should match) and"
	echo "a list of files in those directories."
	echo
	echo "If you did not specify either '--website' or '--server',"
	echo "you will be prompted for which to use."
	echo

	exit "${RET}"
}

OK="true"
DO_HELP="false"
DEBUG="false"
DO_WEBSITE="false"
DO_SERVER="false"
URL=""
TYPE=""
while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
		--help)
			DO_HELP="true"
			;;
		--debug)
			DEBUG="true"
			;;
		--website)
			DO_WEBSITE="true"
			TYPE="WEBSITE"
			;;
		--server)
			DO_SERVER="true"
			TYPE="SERVER"
			URL="${2}"
			shift
			;;
		-*)
			E_ "Unknown argument '${ARG}' ignoring." >&2
			OK="false"
			;;
		*)
			break
			;;
	esac
	shift
done

[[ ${DO_HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" ]] && usage_and_exit 1
if [[ -z ${TYPE} ]]; then
	usage_and_exit 2 "ERROR: Either '--website' or '--server' must be specified."
fi
if [[ ${DO_WEBSITE} == "true" && ${DO_SERVER} == "true" ]]; then
	usage_and_exit 2 "ERROR: Only of of '--website' or '--server' should be specified."
fi

# TODO: FIX in future when "remoteserverurl" is implemented.
if [[ ${DO_SERVER} == "true" && -z ${URL} ]]; then
	usage_and_exit 2 "ERROR: '--server' requires the server's URL"
fi
type="${TYPE,,}"

TAB="$( echo -en "\t" )"
OUTPUT_DIR="${ALLSKY_TMP}/${ME}-${TYPE}"	# All output files go here
[[ ! -d ${OUTPUT_DIR} ]] && mkdir "${OUTPUT_DIR}"

# Check that it's a supported protocol.
function checkProtocol()
{
	local PROTOCOL
	PROTOCOL="$( settings ".remote${type}protocol" )"
	if [[ -z ${PROTOCOL} ]]; then
		E_ "ERROR: No Protocol found for the remote ${TYPE}." >&2
		exit 3
	fi
	if [[ ! ${PROTOCOL,,} =~ ftp ]]; then
		E_ "ERROR: Protocol '${PROTOCOL}' not supported; only *FTP* supported." >&2
		exit 3
	fi
}

# Check that the variable we need exist, and set their values.
DIR=""
function checkVariables()
{
	local ENABLED
	ENABLED="$( settings ."useremote${type}" )"
	if [[ ${ENABLED} != "true" ]]; then
		W_ "WARNING: the remote ${TYPE} is not enabled; will attempt test anyway.\n"
	fi

	if [[ ${DO_WEBSITE} == "true" ]]; then
		URL="$( settings ".remote${type}url" )"
		if [[ -z ${URL} ]]; then
			E_ "ERROR: No remote Website URL given." >&2
			exit 3
		fi
	fi
	if [[ ${DO_SERVER} == "true" ]]; then
# TODO: FIX in future when "remoteserverurl" is implemented.
# For now, the URL was specified on command line.
SAVED_URL="${URL}"
		URL="$( settings ".remote${type}url" )"
		if [[ -z ${URL} ]]; then
URL="${SAVED_URL}"
#x			E_ "ERROR: No remote Website URL given." >&2
#x			exit 3
		fi
	fi

	DIR="$( settings ".remote${type}imagedir" )"
	DIR="${DIR:-null}"
}

# Send commands.txt to get the upload directory path on the server.
# Set global UPLOAD_DIR to the directory name.
# Set global UPLOAD_LS to the name of a file that contains the "ls" output.
UPLOAD_DIR=""
UPLOAD_LS="${OUTPUT_DIR}/upload-ls.txt"
function sendCommandsFile()
{
	local COMMANDS_FILE  OUT  CMD  OUTPUT

	COMMANDS_FILE="${OUTPUT_DIR}/commands.txt"
	{
		[[ ${DEBUG} == "true" ]] && echo -e "set${TAB}delete-commands${TAB}0"
		echo "pwd"
		echo "ls"
	} > "${COMMANDS_FILE}"

	# Need debug so we can look in the output for the current directory.
	OUT="${OUTPUT_DIR}/upload.sh-output.txt"
	CMD="${ALLSKY_SCRIPTS}/upload.sh --remote-${type} --debug"
	CMD+=" --output ${OUT}"
	CMD+=" ${COMMANDS_FILE} ${DIR} null ${ME}"
	[[ ${DEBUG} == "true" ]] && echo -e "DEBUG: Executing\n${TAB}${CMD}"
	if ! OUTPUT="$( ${CMD} 2>&1 )" ; then
		E_ -e "ERROR: Upload of commands failed:\n${OUTPUT}" >&2
		echo -e "\nAdditional details are in '${OUT}'." >&2
		exit 3
	fi

	# Look at everything between the "START info" and "END info" lines.
	# This first line should be the directory.

	# Get the UPLOAD login directory on the server.
	# Sample line (not sure if this is the same for all servers):
	#	<--- 257 "/directory_name" is current directory.
	UPLOAD_DIR="$( grep " 257 " "${OUT}" | cut -d'"' -f2 )"
	if [[ -z ${UPLOAD_DIR} ]]; then
		E_ "ERROR: Unable to get UPLOAD directory - return code 257 not found." >&2
		echo -e "\nAdditional details are in '${OUT}'." >&2
		exit 3
	fi

	get_ls_contents "${OUT}"  >  "${UPLOAD_LS}"
	if [[ $? -ne 0 ]]; then
		E_ "ERROR: Unable to get UPLOAD information." >&2
		echo -e "\nAdditional details are in '${OUT}'." >&2
		exit 3
	fi
}

# Get the server location of the Website.
# This uses the commands.txt file.
# Set global WEB_DIR to the directory name.
# Set global WEB_LS to the name of a file that contains the "ls" output.
WEB_DIR=""
WEB_LS="${OUTPUT_DIR}/web-ls.txt"
rm -f "${WEB_LS}"
function getWebPath()
{
	local OUTPUT="$( execute_web_commands "${URL}" 2>&1 )"
	local RET=$?
	if [[ ${RET} -eq 0 ]]; then
		if [[ -z ${OUTPUT} ]]; then
			WEB_DIR="[ERROR: No output from server.]"
			return
		fi
		if [[ ${OUTPUT} =~ "404 Not Found" ]]; then
			WEB_DIR="[ERROR: ${URL} Not Found]"
			return
		fi

		# Typical output:
			# RETURN	pwd	DIRECTORY_NAME
			# INFO	ls	FILE_1_NAME
			# INFO	ls	FILE_2_NAME
			# ...
		WEB_DIR="$( echo "${OUTPUT}" |
			nawk -v F="${WEB_LS}" '
				{
					if ($2 == "pwd") {
						print $3;
					} else if ($2 == "ls") {
						print $3 > F
					} else if ($0 != "") {
						printf("WARNING: Unknown line: [%s]\n", $0) > F
					}
				}'
		)"
	else
		OUTPUT="${OUTPUT:-unknown reason}"
		WEB_DIR="[ERROR: Unable to run commands on server: ${OUTPUT}.]"
		# Do not exit - print the info we currently have.
	fi
}

#
function outputInfo()
{
	echo "UPLOAD directory = ${UPLOAD_DIR}"
	echo "WEB    directory = ${WEB_DIR}"
	[[ -f ${UPLOAD_LS} ]] && echo -e "A list of files on the UPLOAD site is in '${UPLOAD_LS}'."
	[[ -f ${WEB_LS} ]] && echo -e "A list of files on the WEB server is in '${WEB_LS}'."
}

checkProtocol
checkVariables
sendCommandsFile
getWebPath
outputInfo
