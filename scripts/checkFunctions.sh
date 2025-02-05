#!/bin/bash

# Functions that check various things and are used in multiple other scripts.


####
# Check if we can connect to a web site via URL.
function _check_web_connectivity()
{
	local OK  URL  FROM  ERR=""

	OK="true"
	URL=""
	FROM=""
	while [[ $# -gt 0 ]]
	do
		ARG="${1}"
		case "${ARG,,}" in
			"--website" | "--server")
				URL="$( settings ".remote${ARG/--/}url" )"
				;;
			"--from")
				FROM="${2}"
				shift
				;;
			"--url")
				URL="${2}"
				shift
				;;
			*)
				ERR="Unknown argument: '${ARG}'\n"
				OK="false"
				;;
		esac
		shift
	done
	if [[ ${OK} == "false" || -z ${URL} ]]; then
		echo -e "${ERR}Usage: ${FUNCNAME[0]}: [--from f] --website w | --server s | --url u"
		return 1
	fi

	local HTTP_STATUS  RET  MSG  WHY  HOST

	HTTP_STATUS="$( curl -o /dev/null --head --silent --location --write-out "%{http_code}" "${URL}" )"
	RET=$?
	if [[ ${RET} -ne 0 ]] ; then
		case "${RET}" in
			# Just do common ones
			3)
				WHY="The URL appears bad: ${URL}"
				;;
			6)
				# Only should the host name.
				HOST="${URL/*\/\//}"
				WHY="Unknown host:   ${HOST/\/*/}"
				;;
			*)
				WHY="Return code ${RET} from curl"
				;;
		esac

	elif [[ ${HTTP_STATUS} == "403" ]] ; then
		# If this is a brand new Website with no files yet, OR
		# the user moved/removed all the old files,
		# there won't be a default web file so in most cases we'll get a "403 Forbidden".
		# That means connectivity to the Website DOES work.

		# TODO: There may be other HTTP_STATUS that indicate we connected...
		# Probably not 404 - that tells us connectivity to the SERVER worked,
		# but not to the WEBSITE.

		MSG="Got HTTP_STATUS ${HTTP_STATUS} from ${URL}; connectivity worked."
		[[ ${FROM} == "install" ]] && display_msg --logonly info "${MSG}"
		return "${EXIT_PARTIAL_OK}"		# partial because it has basic connectivity only

	else
		case "${HTTP_STATUS}" in
			"")
				WHY="Unknown reason"
				;;
			"000")
				WHY="Unknown HTML code ${HTTP_STATUS}"
				;;
			"200")
				return 0
				;;
			"404")
				WHY="Website not found (code ${HTTP_STATUS})"
				;;
			5*)
				WHY="Server error (code ${HTTP_STATUS})"
				;;
			*)
				WHY="HTML code ${HTTP_STATUS}"
				;;
		esac
	fi

	echo -e "Unable to connect to ${URL}\n   ${WHY}"
	return 1
}
