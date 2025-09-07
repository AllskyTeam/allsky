#!/bin/bash
# shellcheck disable=SC2154		# referenced but not assigned - for ${WSNs}, et. al.

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
				FROM="${2,,}"
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
		# NO "-e"; let caller do it.
		echo "${ERR}Usage: ${FUNCNAME[0]}: [--from f] --website w | --server s | --url u"
		return 1
	fi

	local HTTP_STATUS  RET  MSG  WHY

	HTTP_STATUS="$( curl --user-agent Allsky -o /dev/null --head --silent --show-error --location \
		--write-out "%{http_code}" "${URL}" )"
	RET=$?
	if [[ ${RET} -ne 0 ]] ; then
		case "${RET}" in
			# Just do common return codes - there are too many to do them all.
			3)
				WHY="The URL appears bad: ${URL}"
				;;
			6)
				# Only whow the host name, not the full URL.
				WHY="${URL/*\/\//}"
				WHY="Unknown host:   ${WHY/\/*/}"
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

	# shellcheck disable=SC2028
	echo "Unable to connect to ${URL}\n   ${WHY}"		# NO "-e"; let caller do it
	return 1
}


####
# Check if the specified locale is valid and installed.
# Return a message on error.
function _check_locale()
{
	local LOCALE="${1}"
	local LABEL="${2}"
	is_installed_locale "${LOCALE}" && return 0

	local _LOCALE="${WSVs}${LOCALE}${WSVe}"
	local _LABEL="${WSNs}${LABEL}${WSNe}"
	local ERR="${_LABEL} ${_LOCALE} "
	local FIX="FIX: Either change ${_LABEL} to an installed locale "
	if is_valid_locale "${LOCALE}" ; then
		# Valid locale, just not installed.
		ERR+="is not installed on this computer."
		FIX+="or install '${_LOCALE}'."
	else
		ERR+="is not a valid locale."
		FIX+="or install a different one."
	fi
	echo "${ERR}"
	echo -e "Installed locales are:\n$( indent "$( list_installed_locales )" )"
	echo "${FIX}"
	echo "See the 'Settings -> Allsky' Documentation page for how to install locales."
	return 1
}


###
# Check if the user specified --immediate; it's on by default.
function _check_immediate()
{
	local SETTING_NAME="${1}"
	local SETTING_LABEL="${2}"

	if [[ -n ${SETTING_NAME} && ${SETTING_NAME} =~ --immediate ]]; then
		echo -n "${WSVs}--immediate${WSVe} is no longer needed in the ${WSNs}${SETTING_LABEL}${WSNe}"
		echo " setting since Allsky uses that option by default."
		return 1
	fi
	return 0
}


#####
# Make sure the specified width and height are valid.
# Assume each number has already been checked, e.g., it's not a string.
function _checkWidthHeight()
{
	local NAME_PREFIX="${1}"
	local ITEM="${2}"
	local WIDTH="${3}"
	local HEIGHT="${4}"
	local SENSOR_WIDTH="${5:-0}"
	local SENSOR_HEIGHT="${6:-0}"
	local ERR=""

	# Width and height must both be 0 or non-zero.
	if [[ (${WIDTH} -gt 0 && ${HEIGHT} -eq 0) || (${WIDTH} -eq 0 && ${HEIGHT} -gt 0) ]]; then
		ERR="${WSNs}${NAME_PREFIX} Width${WSNe} (${WSVs}${WIDTH}${WSVe})"
		ERR+=" and ${WSNs}Height${WSNe} (${WSVs}${HEIGHT}${WSVe})"
		ERR+=" must both be either 0 or non-zero.${wBR}"
		ERR+="The ${ITEM} will NOT be resized since it would look unnatural."

	elif [[ ${WIDTH} -gt 0 && ${HEIGHT} -gt 0 &&
			${SENSOR_WIDTH} -eq ${WIDTH} && ${SENSOR_HEIGHT} -eq ${HEIGHT} ]]; then
		ERR="Resizing a ${ITEM} to the same size as the sensor does nothing useful so will not be done."
	fi

	[[ -z ${ERR} ]] && return 0

	echo -e "${ERR}" >&2
	return 1
}
