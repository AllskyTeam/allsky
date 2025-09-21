#!/bin/bash

# This script uploads a file to a Website to tell the Website when the user has defined
# "sunrise" and "sunset".
# A copy of the settings file is also uploaded.
# Upload to both local and remote Websites if they are enabled.

# Allow this script to be executed manually or by sudo, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"		|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"		|| exit "${EXIT_ERROR_STOP}"

function usage_and_exit()
{
	local RET=${1}
	
	exec >&2
	local USAGE="Usage: ${ME} [--help] [--debug] [--settingsOnly] [--from f] [--allfiles]"
	echo
	if [[ ${RET} -eq 0 ]]; then
		echo -e "${USAGE}"
	else
		E_ "${USAGE}"
	fi
	echo "where:"
	echo "  --help          displays this message and exits"
	echo "  --settingsOnly  only uploads the settings.json file"
	echo "  --from f        specifies who called ${ME}:"
	echo "      WebUI | install | endOfNight"
	echo "  --allfiles      causes all 'view settings' files to be uploaded"

	exit "${RET}"
}

function upload_file()
{
	local WHERE="${1}"
	local FILE_TO_UPLOAD="${2}"
	local DIRECTORY="${3}"		# Directory to put file in
	if [[ ! -f ${FILE_TO_UPLOAD} ]]; then
		local MSG="File to upload '${FILE_TO_UPLOAD}' - file not found."
		E_ "${ME}: ERROR: ${MSG}." >&2
		if [[ ${FROM} == "endofnight" ]]; then
			"${ALLSKY_SCRIPTS}/addMessage.sh" --type error --msg "${ME}: ${MSG}"
		fi
		return 1
	fi

	[[ ${DEBUG} == "true" ]] && echo "Uploading ${FILE_TO_UPLOAD} to ${WHERE:-everywhere}"
	#shellcheck disable=SC2086
	upload_all ${SILENT} ${WHERE} "${FILE_TO_UPLOAD}" "${DIRECTORY}" "" "PostData"
	return $?
}

# If called from the WebUI, it displays our output so don't call addMessage.sh.
FROM=""
HELP="false"
DEBUG="false"
SETTINGS_ONLY="false"
ALL_FILES="false"
RET=0
while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in		# lower case
		--help)
			HELP="true"
			;;
		--debug)
			DEBUG="true"
			;;
		--allfiles)
			ALL_FILES="true"
			;;
		--settingsonly)
			SETTINGS_ONLY="true"
			;;
		--from)
			FROM="${2,,}"
			shift
			;;
		-*)
			E_ "${ME}: Unknown argument '${ARG}'." >&2
			RET=1
			;;
		*)
			break		# done with arguments
			;;
	esac
	shift
done
[[ ${RET} -ne 0 ]] && usage_and_exit "${RET}"
[[ ${HELP} == "true" ]] && usage_and_exit 0


# If there are no enabled Websites or an enabled remote server, then exit.
WEBS=""
WHERE_TO=""
if [[ "$( settings ".uselocalwebsite" )" == "true" ]]; then
	WEBS+=" --local-web"
	[[ -n ${WHERE_TO} ]] && WHERE_TO+=", "
	WHERE_TO+="local Website"
fi
if [[ "$( settings ".useremotewebsite" )" == "true" ]]; then
	WEBS+=" --remote-web"
	[[ -n ${WHERE_TO} ]] && WHERE_TO+=", "
	WHERE_TO+="remote Website"
fi
if [[ "$( settings ".useremoteserver" )" == "true" ]]; then
	[[ -n ${WHERE_TO} ]] && WHERE_TO+=", "
	WHERE_TO+="remote server"
fi

if [[ -z ${WHERE_TO} ]]; then
	if [[ ${ON_TTY} == "true" ]]; then
		W_ "${ME}: WARNING: No action taken because no Websites are enabled.\n" >&2
		exit 1
	else
		# Not on a tty so probably called via end-of-night or WebUI so silently exit.
		exit 0
	fi
fi

if [[ ${FROM} == "webui" || ${FROM} == "install" ]]; then
	# Don't want any "uploading xxx" messages.
	SILENT="--silent"
else
	SILENT=""
fi

if [[ ${SETTINGS_ONLY} == "false" ]]; then
	OK="true"
	if ! latitude="$( convertLatLong "$( settings ".latitude" )" "latitude" 2>&1 )" ; then
		OK="false"
		E_ "${ME}: ERROR: ${latitude}" >&2
		if [[ ${FROM} == "endofnight" ]]; then
			"${ALLSKY_SCRIPTS}/addMessage.sh" --type error --msg "${ME}: ${latitude}"
		fi
	fi
	if ! longitude="$( convertLatLong "$( settings ".longitude" )" "longitude" 2>&1 )" ; then
		OK="false"
		E_ "${ME}: ERROR: ${longitude}" >&2
		if [[ ${FROM} != "endofnight" ]]; then
			"${ALLSKY_SCRIPTS}/addMessage.sh" --type error --msg "${ME}: ${longitude}"
		fi
	fi
	[[ ${OK} == "false" ]] && exit 1

	angle="$( settings ".angle" )"
	timezone="$( date "+%z" )"

	# If nighttime happens after midnight, sunwait returns "--:-- (Midnight sun)"
	# If nighttime happens before noon, sunwait returns "--:-- (Polar night)"
	sunrise="$( sunwait list rise angle "${angle}" "${latitude}" "${longitude}" 2>&1 )"
	sunrise_hhmm="${sunrise:0:5}"
	sunset="$( sunwait list set angle "${angle}" "${latitude}" "${longitude}" 2>&1 )"
	sunset_hhmm="${sunset:0:5}"

	if [[ ${sunrise_hhmm} == "--:--" || ${sunset_hhmm} == "--:--" ]]; then
		# nighttime starts after midnight or before noon.
		today="$( date --date='tomorrow' +%Y-%m-%d )"		# is actually tomorrow
		# TODO What SHOULD *_hhmm be?
		sunrise_hhmm="00:00"
		sunset_hhmm="00:00"
		{
			echo "***"
			MSG="${ME}: WARNING: angle ${angle} caused sunwait to return"
			MSG+=" sunrise='${sunrise}' and sunset='${sunset}'."
			W_ "${MSG}"
			echo "Using tomorrow at '${sunrise_hhmm}' instead."
			echo "***"
		} >&2
	else
		today="$( date +%Y-%m-%d )"
	fi

	DATA_FILE="${ALLSKY_TMP}/data.json"
	{
		if [[ $( settings ".takedaytimeimages" ) == "true" ]]; then
			D="true"
		else
			D="false"
		fi
		if [[ $( settings ".takenighttimeimages" ) == "true" ]]; then
			N="true"
		else
			N="false"
		fi
		echo "{"
		echo "\"sunrise\": \"${today}T${sunrise_hhmm}:00.000${timezone}\","
		echo "\"sunset\": \"${today}T${sunset_hhmm}:00.000${timezone}\","
		echo "\"takedaytimeimages\": \"${D}\"",
		echo "\"takenighttimeimages\": \"${N}\""
		echo "}"
	} > "${DATA_FILE}"

	# Some remote servers may want to see this file so upload everywhere.
	upload_file "" "${DATA_FILE}" ""		# Goes in top-level directory
fi

# These files go in ${VIEW_DIR} so the user can display their settings.
# This directory is in the root of the Allsky Website.
# Assume if the first upload fails they all will, so exit.
if [[ -n ${WEBS} ]]; then
	upload_file "${WEBS}" "${ALLSKY_SETTINGS_FILE}" "${ALLSKY_WEBSITE_VIEWSETTINGS_DIRECTORY_NAME}" || exit $?

	if [[ ${ALL_FILES} == "true" ]]; then
		for file in \
			"${ALLSKY_OPTIONS_FILE}" \
			"${ALLSKY_WEBUI}/includes/allskySettings.php" \
			"${ALLSKY_DOCUMENTATION}/css/custom.css" 
		do
			upload_file "${WEBS}" "${file}" "${ALLSKY_WEBSITE_VIEWSETTINGS_DIRECTORY_NAME}"
		done
	fi

	if [[ ${FROM} == "webui" || ${FROM} == "install" ]]; then
		MSG="Uploaded configuration files to: ${WHERE_TO}."
		if [[ ${FROM} == "webui" ]]; then
			echo "<script>console.log(\`${MSG}\`);</script>"
		else
			echo "${MSG}"
		fi
	fi
fi

exit 0
