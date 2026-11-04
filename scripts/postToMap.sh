#!/bin/bash
# shellcheck disable=SC2154		# referenced but not assigned - from convertJSON.php

# Allow this script to be executed manually, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/.." )"
ME="$( basename "${BASH_ARGV0}" )"

# This script uploads what the user chose in the "Privacy & Sharing" settings
# to the Allsky Map server, in one upload:
#	- the Map data, if "Map Sharing" isn't "Don't send"; it's only shown on the map
#	  if "Map Sharing" is "Send and show on the Map",
#	- the Usage Data, if "Share Usage Data" is enabled,
#	- the "Contact Email", if set,
#	- when the user agreed to each of them.
# Information is gathered automatically from the settings file.
# The script can be called manually, via endOfNight.sh, or via the WebUI.
# See the "Privacy & Sharing" documentation page for what is sent and why.

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"		|| exit "${ALLSKY_EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"		|| exit "${ALLSKY_EXIT_ERROR_STOP}"

MAP_COMMAND="${ALLSKY_MAP_URL}postToMap.php"

function usage_and_exit()
{
	local RET=${1}
	exec >&2
	local MSG="Usage: ${ME} [--help] [--whisper] [--show] [--delete] [--delete-all] [--force] [--debug] [--machineid id] [--endofnight] [--from f]"
	echo
	if [[ ${RET} -eq 0 ]]; then
		echo -e "${MSG}"
	else
		E_ "${MSG}"
	fi
	echo "Arguments:"
	echo "   --help        Print this usage message and exit immediately."
	echo "   --whisper     Be quiet with non-error related output - only display results."
	echo "   --show        Print the data that would be sent, then exit without sending it."
	echo "   --delete      Remove the camera from the map; all fields except machine_id are ignored."
	echo "   --delete-all  Delete all data of this Pi from the server (Map data, Usage Data,"
	echo "                 and Contact Email) and turn off sharing them."
	echo "   --force       Force updates, even if not scheduled automatically for today."
	echo "   --debug       Output debugging statements.  Can specify more than once for additional info."
	echo "   --endofnight  ${ME} was called from endOfNight.sh."
	echo "   --from f      Who called ${ME}, e.g., 'WebUI' (use html)."
	echo
	exit "${RET}"
}

function get_domain()
{
	local URL D
	# Get the domain name or IP address from a URL
	# Examples:
	#	http://myallsky.com						# Return "myallsky.com"
	#	http://myallsky.com/allsky				# Return "myallsky.com"
	#	http://123.456.789.000:8080/allsky		# Return "123.456.789.000"
	URL="${1}"
	D="${URL/*\/\//}"	# Remove everything up to and including "//"
	D="${D/[:\/]*/}"	# Remove from ":" or "/" to end
	D="${D/www./}"		# Remove optional "www."
	echo "${D}"
}


function check_URL()
{
	local URL="${1}"
	local URL_TYPE="${2}"
	local FIELD_NAME="${3}"

	local TIMEOUT=30		# seconds to wait when trying to reach a URL
	local E=""				# holds error message

	local D="$( get_domain "${URL}" )"
	if [[ "${D:0:7}"  == "192.168"		||
		  "${D:0:4}"  == "10.0"			||
		  "${D:0:9}"  == "127.0.0.1"	||
		  "${D:0:6}"  == "172.16"		||
		  "${D:0:9}"  == "169.254.0"	||
		  "${D:0:6}"  == "198.18"		||
		  "${D:0:10}" == "198.51.100"	||
		  "${D:0:9}"  == "203.0.113"	||
		  "${D:0:3}"  == "240" ]]; then
		E+="ERROR: ${FIELD_NAME} '${URL}' is not reachable from the Internet. Please unset the 'Website URL' and 'Image URL' settings.${BR}"

	elif [[ ${URL:0:7} != "http://" && ${URL:0:8} != "https://" ]]; then
		E+="ERROR: ${FIELD_NAME} '${URL}' must begin with 'http://' or 'https://'.${BR}"

	elif [[ ${URL_TYPE} == "remotewebsiteurl" && "$( basename "${URL}" )" == "index.php" ]]; then
		E+="ERROR: ${FIELD_NAME} '${URL}' should not end with '/index.php'.${BR}"

	else
		# Make sure it's a valid URL.  Some servers don't return anything if the user agent is "curl".
		local CONTENT="$( curl --user-agent Allsky --location --head --silent --show-error --connect-timeout "${TIMEOUT}" "${URL}" 2>&1 )"
		local RET=$?
		if [[ ${DEBUG} -gt 0 ]]; then
			local MSG="check_URL(${URL}, ${URL_TYPE}), RET=${RET}"
			if [[ ${DEBUG} -gt 1 ]]; then
				MSG+=":\n$( indent --spaces "${CONTENT}" )\n"
			fi
			wD_ "${MSG}" >&2
		fi

		if [[ ${RET} -eq 6 ]]; then
			E+="ERROR: ${FIELD_NAME} '${URL}' not found - check spelling and network connectivity.${BR}"
		elif [[ ${RET} -eq 28 ]]; then
			E+="ERROR: Could not connect to ${FIELD_NAME} '${URL}' after ${TIMEOUT} seconds.${BR}"
		elif [[ ${RET} -ne 0 ]]; then
				E+="ERROR: ${FIELD_NAME} '${URL}' cannot be reached (${CONTENT}).${BR}"
		else
			local TYPE T
			if [[ ${URL_TYPE} == "remotewebsiteurl" ]]; then
				TYPE="$( echo "${CONTENT}" | grep -i "Content-Type: text" )"
				T="web site"
			else
				TYPE="$( echo "${CONTENT}" | grep -i "Content-Type: image" )"
				T="image"
			fi
			if [[ -z ${TYPE} ]]; then
				E+="ERROR: ${FIELD_NAME} '${URL}' does not appear to be a valid ${T}:"
				# Hide header entries that aren't needed for troubleshooting.
				CONTENT="$( echo "${CONTENT}" | grep -v -E "^x-ws-|^server:|^strict-transport|^x-powered-by" )"
				E+="\n$( indent --spaces "${CONTENT}" ).${BR}"
			else
				return 0
			fi
		fi
	fi

	echo "${E}"		# NO -e
	return 1
}

DEBUG="0"
SHOW="false"
DELETE="false"
DELETE_ALL="false"
UPLOAD="false"
WHISPER="false"
ENDOFNIGHT="false"
MACHINE_ID=""
FROM=""
FORCE="false"
while [[ $# -ne 0 ]]; do
	case "${1,,}" in
		--help)
			usage_and_exit 0;
			;;
		--show)
			SHOW="true"
			;;
		--delete)
			DELETE="true"
			UPLOAD="true"		# always upload DELETEs
			;;
		--delete-all)
			DELETE_ALL="true"
			UPLOAD="true"
			;;
		--debug)
			(( DEBUG++ ))
			;;
		--force)
			FORCE="true"
			UPLOAD="true"
			;;
		--whisper)
			WHISPER="true"
			;;
		--endofnight)
			ENDOFNIGHT="true"
			;;
		--machineid)
			MACHINE_ID="${2}"
			shift
			;;
		--from)
			FROM="${2,,}"
			shift
			;;
		*)
			usage_and_exit 1;
			;;
	esac
	shift
done


if [[ ${FROM} == "webui" ]]; then
	BR="<br>"		# Line break
else
	BR="\n"
fi

if [[ ${ENDOFNIGHT} == "true" ]]; then
	# All stdout/stderr output goes to the log file so don't include colors.
	wERROR=""
	wWARNING=""
	wNC=""
fi

if [[ ${WHISPER} == "true" ]]; then
	MSG_START=""
	ERROR_MSG_START=""
	WARNING_MSG_START=""
else
	MSG_START="${ME}: "
	ERROR_MSG_START="*** ${ME}: "
	WARNING_MSG_START="*** ${ME}: "
	if [[ ${FROM} == "webui" ]]; then
		ERROR_MSG_START+="${BR}"
		WARNING_MSG_START+="${BR}"
	fi
fi


if [[ -z ${MACHINE_ID} ]]; then
	MACHINE_ID="$( < /etc/machine-id )"
	if [[ -z ${MACHINE_ID} ]]; then
		E="ERROR: Unable to get 'machine_id': check /etc/machine-id."
		wE_ "${ERROR_MSG_START}${E}" >&2
		[[ ${ENDOFNIGHT} == "true" ]] && "${ALLSKY_SCRIPTS}/addMessage.sh" --type error --msg "${ME}: ${E}"
		exit 3
	fi
fi

# This gets all settings and prefixes their names with "S_".
# It's faster than calling "settings()" a bunch of times.
#shellcheck disable=SC2119
getAllSettings || exit 1

MAP_SHARING="${S_mapsharing:-none}"		# none, team, or map
SHARE_USAGE="${S_shareusagedata:-false}"
EMAIL="${S_contactemail}"

# With nothing to share, the only thing left to do is remove the camera from the map.
if [[ ${DELETE_ALL} == "false" && ${MAP_SHARING} == "none" &&
		${SHARE_USAGE} != "true" && -z ${EMAIL} ]]; then
	DELETE="true"
	UPLOAD="true"
fi
SEND_MAP="false"
[[ ${DELETE} == "false" && ${DELETE_ALL} == "false" && ${MAP_SHARING} != "none" ]] && SEND_MAP="true"

function show_error()
{
	local E="${1}"
	wE_ "${ERROR_MSG_START}${E}" >&2
	[[ ${ENDOFNIGHT} == "true" ]] && "${ALLSKY_SCRIPTS}/addMessage.sh" --type error --msg "${ME}: ${E}"
}

# Print the Usage Data as JSON.
function usage_data()
{
	local FILE="${ALLSKY_USAGE_DATA_FILE}"
	local WEBUI_FILE="${ALLSKY_WEBUI_USAGE_DATA_FILE}"
	local COUNTS="{ }"  WEBUI_DAYS=0  SINCE=""  WEBUI_SINCE=""
	if [[ -s ${FILE} ]]; then
		COUNTS="$( jq -c '.counts // { }' "${FILE}" 2>/dev/null )" || COUNTS="{ }"
		SINCE="$( jq -r '.since // ""' "${FILE}" 2>/dev/null )"
	fi
	if [[ -s ${WEBUI_FILE} ]]; then
		WEBUI_DAYS="$( jq -r '.days // 0' "${WEBUI_FILE}" 2>/dev/null )" || WEBUI_DAYS=0
		WEBUI_SINCE="$( jq -r '.since // ""' "${WEBUI_FILE}" 2>/dev/null )"
	fi
	# The earlier of the two dates; dates in YYYY-MM-DD format sort as strings.
	if [[ -z ${SINCE} || ( -n ${WEBUI_SINCE} && ${WEBUI_SINCE} < "${SINCE}" ) ]]; then
		SINCE="${WEBUI_SINCE}"
	fi

	local OS  NUM_CAMERAS
	OS="$( . /etc/os-release 2>/dev/null && echo "${PRETTY_NAME}" )"
	NUM_CAMERAS="$( grep --count "^camera"$'\t' "${ALLSKY_CONNECTED_CAMERAS_INFO}" 2>/dev/null )"

	# The names of the enabled modules in each flow.
	local MODULES="{ }"  FLOW  F  NAMES
	for FLOW in day night daynight nightday periodic ; do
		F="${ALLSKY_MODULES}/postprocessing_${FLOW}.json"
		[[ ! -s ${F} ]] && continue
		NAMES="$( jq -c '[ .[] | select(.enabled == true) | .module | sub("\\.py$"; "") ]' "${F}" 2>/dev/null )" || continue
		MODULES="$( jq -c --arg f "${FLOW}" --argjson n "${NAMES}" '.[$f] = $n' <<< "${MODULES}" )"
	done

	jq -n \
		--arg since "${SINCE:-$( date +%F )}" \
		--arg os "${OS}" \
		--arg computer "${S_computer}" \
		--arg camera "${S_camera}" \
		--argjson cameras "${NUM_CAMERAS:-0}" \
		--argjson counts "${COUNTS}" \
		--argjson webui "${WEBUI_DAYS:-0}" \
		--argjson modules "${MODULES}" \
		'{
			since: $since,
			os: $os,
			computer: $computer,
			camera: $camera,
			cameras_connected: $cameras,
			allsky_starts: ($counts.allsky_starts // 0),
			camera_changes: ($counts.camera_changes // 0),
			webui_days: $webui,
			modules: $modules
		}'
}

# Start the counts over after they were sent.  The WebUI's file belongs to the
# web server; it's removed here and recreated by the WebUI.
function reset_usage_data()
{
	rm -f "${ALLSKY_WEBUI_USAGE_DATA_FILE}"
	echo "{ \"since\": \"$( date +%F )\", \"counts\": { } }" > "${ALLSKY_USAGE_DATA_FILE}"
}

if [[ ${SEND_MAP} == "true" ]]; then
	E=""
	LATITUDE="${S_latitude}"
	if [[ -z ${LATITUDE} ]]; then
		E+="ERROR: 'Latitude' is required.${BR}"
	fi
	LONGITUDE="${S_longitude}"
	if [[ -z ${LONGITUDE} ]]; then
		E+="ERROR: 'Longitude' is required.${BR}"
	fi
	if [[ -n ${E} ]]; then
		show_error "${E}"
		exit 1
	fi

	# Check for errors.  getPublicLatLong outputs error message.
	# The map gets the rounded values if "Hide Exact Location" is enabled.
	ERR_MSG=""
	if ! LATITUDE="$( getPublicLatLong "latitude" "${LATITUDE}" "${S_hideexactlocation}" 2>&1 )" ; then
		ERR_MSG+="\n${LATITUDE}"
	fi
	if ! LONGITUDE="$( getPublicLatLong "longitude" "${LONGITUDE}" "${S_hideexactlocation}" 2>&1 )" ; then
		ERR_MSG+="\n${LONGITUDE}"
	fi
	F="${ALLSKY_WEBSITE_CONFIGURATION_FILE}"
	if [[ ${S_uselocalwebsite} == "true" && ! -s ${F} ]]; then
		ERR_MSG+="\nLocal Website configuration file '${F}' not found."
	fi
	F="${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}"
	if [[ ${S_useremotewebsite} == "true" && ! -s ${F} ]]; then
		ERR_MSG+="\nRemote Website configuration file '${F}' not found."
	fi
	if [[ -n ${ERR_MSG} ]]; then
		ERR_MSG+="\n\nDid not upload data to Allsky Map."
		echo -e "${ME}: ${ERR_MSG}" >&2
		"${ALLSKY_SCRIPTS}/addMessage.sh" --type error --msg "${ME}: ${ERR_MSG}"
		exit 1
	fi
fi


if false; then
	# TODO: in the future, include part of the latitude and longitude with the machine id
	# to REALLY guarantee it's unique (we've seen cases where two Pi's have the same machine id.
	LA=${LATITUDE%.*}
	LO=${LONGITUDE%.*}
	MACHINE_ID="${LA:0:2}${LO:0:2}${MACHINE_ID:4}"
fi

if [[ ${DELETE_ALL} == "true" ]]; then
	generate_post_data()
	{
		jq -n --arg id "${MACHINE_ID}" '{ machine_id: $id, delete_all: true }'
	}

elif [[ ${DELETE} == "true" ]]; then
	generate_post_data()
	{
		jq -n --arg id "${MACHINE_ID}" --arg s "${MAP_SHARING}" \
			'{ machine_id: $id, website_url: "DELETE", map_sharing: $s }'
	}

else
	E=""
	W=""
	if [[ ${SEND_MAP} == "true" ]]; then
		LOCATION="${S_location}"
		OWNER="${S_owner}"
		WEBSITE_URL="${S_remotewebsiteurl}"
		IMAGE_URL="${S_remotewebsiteimageurl}"
		CAMERA="${S_camera}"
		LENS="${S_lens}"
		COMPUTER="${S_computer}"
		EQUIPMENT="${S_equipmentinfo}"

		# Check for required fields
		if [[ -z ${CAMERA} ]]; then
			E+="ERROR: 'Camera' is required for the Allsky Map.${BR}"
		fi
		if [[ -z ${COMPUTER} ]]; then
			E+="ERROR: 'Computer' is required for the Allsky Map.${BR}"
		fi

		# Check for optional, but suggested fields
		if [[ -z ${LOCATION} ]]; then
			W+="WARNING: 'Location' not set for the Allsky Map; continuing.${BR}"
		fi
		if [[ -z ${OWNER} ]]; then
			W+="WARNING: 'Owner' not set for the Allsky Map; continuing.${BR}"
		fi
		if [[ -z ${LENS} ]]; then
			W+="WARNING: 'Lens' not set for the Allsky Map; continuing.${BR}"
		fi

		# website_url and image_url are optional

		if [[ (-n ${WEBSITE_URL} && -z ${IMAGE_URL}) || (-z ${WEBSITE_URL} && -n ${IMAGE_URL}) ]]; then
			E+="ERROR: If you specify the Website URL or Image URL, you must specify both URLs.${BR}"

		elif [[ -n ${WEBSITE_URL} && ${SHOW} == "false" ]]; then		# they specified both
			# The domain names (or IP addresses) must be the same.
			Wurl="$( get_domain "${WEBSITE_URL}" )"
			Iurl="$( get_domain "${IMAGE_URL}" )"
			if [[ ${Wurl} != "${Iurl}" ]]; then
				E+="ERROR: The Website and Image URLs must have the same domain name or IP address.${BR}"
			fi

			ERR="$( check_URL "${WEBSITE_URL}" "remotewebsiteurl" "Website URL" )"  || E+="${ERR}"
			function C()
			{
				check_URL "${IMAGE_URL}" "remotewebsiteimageurl" "Image URL"
			}
			if ! ERR="$( C )" ; then
				# If the web server is updating the image when we check, it may not be there so wait
				# a little and try again.
				if [[ ${DEBUG} -gt 0 ]]; then
					wD_ "First check of valid image failed; trying again." >&2
				fi
				sleep 10
				ERR="$( C )" || E+="${ERR}"
			fi

			# Without a trailing "/" we may get a "Moved permanently" message.
			# This check needs to come after check_URL() above.
			[[ -n ${E} && -n ${WEBSITE_URL} && ${WEBSITE_URL: -1:1} != "/" ]] && WEBSITE_URL+="/"
		fi
	fi

	if [[ -n ${W} && ${SHOW} == "false" ]]; then
		wW_ "${WARNING_MSG_START}${W%%"${BR}"}" >&2
		if [[ ${ENDOFNIGHT} == "true" ]]; then
			"${ALLSKY_SCRIPTS}/addMessage.sh" --type warning --msg "${ME}: ${W}"
		fi
	fi
	if [[ -n ${E} ]]; then
		wE_ "${ERROR_MSG_START}${E%%"${BR}"}" >&2
		if [[ ${ENDOFNIGHT} == "true" ]]; then
			"${ALLSKY_SCRIPTS}/addMessage.sh" --type error --msg "${ME}: ${E}"
		fi
		exit 2
	fi

	# Output the json file ${2} and, if "Hide Exact Location" is enabled,
	# the latitude and longitude under the ${1} object replaced by the rounded values.
	public_location()
	{
		local PARENT="${1}"
		local FILE="${2}"
		if [[ ${S_hideexactlocation} == "true" ]]; then
			jq --arg lat "${LATITUDE}" --arg lon "${LONGITUDE}" \
				"(${PARENT}) |= (if type == \"object\" then .latitude = \$lat | .longitude = \$lon else . end)" \
				"${FILE}"
		else
			cat "${FILE}"
		fi
	}

	# The Map data, or null if it's not sent.
	map_data()
	{
		if [[ ${SEND_MAP} == "false" ]]; then
			echo "null"
			return
		fi

		# Both files contain the location so make it match what's sent below.
		# The Contact Email is only sent on its own, if set.
		local ALLSKY_SETTINGS="$( public_location "." "${ALLSKY_SETTINGS_FILE}" | jq 'del(.contactemail)' )"

		local WEBSITE_SETTINGS=""
		if [[ ${S_uselocalwebsite} == "true" ]]; then
			WEBSITE_SETTINGS="$( public_location ".config" "${ALLSKY_WEBSITE_CONFIGURATION_FILE}" )"
		elif [[ ${S_useremotewebsite} == "true" ]]; then
			WEBSITE_SETTINGS="$( public_location ".config" "${ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE}" )"
		fi
		[[ -z ${WEBSITE_SETTINGS} ]] && WEBSITE_SETTINGS="{ }"

		jq -n \
			--arg location "${LOCATION}" \
			--arg owner "${OWNER}" \
			--arg latitude "${LATITUDE}" \
			--arg longitude "${LONGITUDE}" \
			--arg website_url "${WEBSITE_URL}" \
			--arg image_url "${IMAGE_URL}" \
			--arg camera "${CAMERA}" \
			--arg lens "${LENS}" \
			--arg computer "${COMPUTER}" \
			--arg equipmentinfo "${EQUIPMENT}" \
			--argjson website_settings "${WEBSITE_SETTINGS}" \
			--argjson allsky_settings "${ALLSKY_SETTINGS}" \
			'{
				location: $location,
				owner: $owner,
				latitude: $latitude,
				longitude: $longitude,
				website_url: $website_url,
				image_url: $image_url,
				camera: $camera,
				lens: $lens,
				computer: $computer,
				equipmentinfo: $equipmentinfo,
				website_settings: $website_settings,
				allsky_settings: $allsky_settings
			}'
	}

	# The Map data keep their old place at the top level.
	# "usage" and "email" are null when they aren't shared (any more),
	# so the server removes them.
	generate_post_data()
	{
		local USAGE="null"
		[[ ${SHARE_USAGE} == "true" ]] && USAGE="$( usage_data )"
		jq -n \
			--argjson force "${FORCE}" \
			--arg id "${MACHINE_ID}" \
			--arg version "${ALLSKY_VERSION}" \
			--arg sharing "${MAP_SHARING}" \
			--argjson map "$( map_data )" \
			--argjson usage "${USAGE}" \
			--arg email "${EMAIL}" \
			--argjson privacy_version "${S_privacyversion:-0}" \
			--arg map_consent "${S_mapsharingconsent}" \
			--arg usage_consent "${S_usagedataconsent}" \
			--arg email_consent "${S_contactemailconsent}" \
			'{
				force: $force,
				machine_id: $id,
				allsky_version: $version,
				map_sharing: $sharing
			}
			+ ($map // { })
			+ {
				usage: $usage,
				email: (if $email == "" then null else $email end),
				consent: {
					privacy_version: $privacy_version,
					map: (if $sharing == "none" or $map_consent == "" then null else $map_consent end),
					usage: (if $usage == null or $usage_consent == "" then null else $usage_consent end),
					email: (if $email == "" or $email_consent == "" then null else $email_consent end)
				}
			}'
	}
fi

if [[ ${SHOW} == "true" ]]; then
	generate_post_data
	exit $?
fi

if [[ ${UPLOAD} == "false" ]]; then
	# Only upload every other day to save on server bandwidth.
	# Extract last character of machine ID and find its parity
	digit="${MACHINE_ID: -1}"
	decimal=$(( 16#$digit ))
	parity="$(( decimal % 2 ))"
	if (( $( date +%e ) % 2 != parity )); then
		if [[ ( ${ON_TTY} == "true" || ${ALLSKY_DEBUG_LEVEL} -ge 4) && ${ENDOFNIGHT} == "false"  ]]; then
			echo "${ME}: Not time to upload - wait until tomorrow."
		fi
		exit 0
	fi
fi

RETURN_CODE=0
if [[ ${DELETE_ALL} == "true" ]]; then
	[[ ${WHISPER} == "false" ]] && echo "${ME}: Deleting all data of this Pi from the Allsky Map server."
elif [[ ${DELETE} == "true" ]]; then
	[[ ${WHISPER} == "false" ]] && echo "${ME}: Deleting Map data."
elif [[ ${ON_TTY} == "true" || ${ALLSKY_DEBUG_LEVEL} -ge 3 ]]; then
	[[ ${WHISPER} == "false" ]] && echo "${ME}: Uploading Map data."
fi

POST_DATA="${ALLSKY_TMP}/${ME/.sh/}-data.json"
if ! generate_post_data > "${POST_DATA}" ; then
	show_error "ERROR: Unable to create the data to upload."
	rm -f "${POST_DATA}"
	exit 2
fi
CMD=( curl --silent --show-error -i -H 'Accept: application/json' -H 'Content-Type:application/json'
	--data-binary "@${POST_DATA}" "${MAP_COMMAND}" )
if [[ ${DEBUG} -gt 0 ]]; then
	MSG="${CMD[*]}"
	# Not much data is sent by DELETEs, so output it all.
	if [[ ${DEBUG} -gt 1 || ${DELETE} == "true" || ${DELETE_ALL} == "true" ]]; then
		MSG+="\n$( < "${POST_DATA}" )"
	fi
	wD_ "Executing:\n$( indent --spaces "${MSG}" )\n"
fi

RETURN_STRING="$( "${CMD[@]}" 2>&1 )"
RETURN_CODE=$?
rm -f "${POST_DATA}"
if [[ ${DEBUG} -gt 0 ]]; then
	MSG="Returned code ${RETURN_CODE}"
	if [[ ${DEBUG} -gt 1 ]]; then
		MSG+=":\n$( indent --spaces "${RETURN_STRING:-Nothing returned}" )"
	fi
	wD_ "${MSG}" >&2
fi

if [[ ${RETURN_CODE} -ne 0 ]]; then
	E="ERROR while uploading Map data with curl: ${RETURN_STRING}."
	if [[ ${ENDOFNIGHT} == "true" ]]; then
		echo -e "${ME}: ${E}"		# goes in log file
		"${ALLSKY_SCRIPTS}/addMessage.sh" --type error --msg "${ME}: ${E}"
	else
		wE_ "${ERROR_MSG_START}${E}" >&2
	fi
	exit "${RETURN_CODE}"
fi

# Check for server error.
if HTTP="$( echo "${RETURN_STRING}" | grep HTTP )" ; then
	if [[ ! ${HTTP} =~ 200 ]]; then
		wW_ "Got server error ${HTTP}"
		exit 1
	fi
fi

GOT_OK="false"
# Get the return string and other optional info from the server.
# shellcheck disable=SC2034
while read -r UNUSED STATUS MORE_INFO
do
	if [[ ${STATUS} == "INSERTED" || ${STATUS} == "DELETED" ]]; then
		GOT_OK="true"
		wO_ "${MSG_START}Map data ${STATUS}."

	elif [[ ${STATUS} == "UPDATED" ]]; then		# UPDATED num_updates  max_updates_allowed
		GOT_OK="true"
		MSG=""
		if [[ -n ${MORE_INFO} ]]; then
			read -r NUM_UPDATES MAX_UPDATES <<< "${MORE_INFO}"
			NUM_LEFT=$((MAX_UPDATES - NUM_UPDATES))
			if [[ ${NUM_LEFT} -eq 0 ]]; then
				MSG="  This is your last update allowed today.  You made ${MAX_UPDATES}."
			else
				MSG="  You can make ${NUM_LEFT} more updates today."
			fi
		fi
		[[ ${ENDOFNIGHT} == "false" ]] && wO_ "${MSG_START}Map data UPDATED.${MSG}"

	elif [[ -z ${STATUS} ]]; then
		E="ERROR: No status returned from server: ${RETURN_STRING}."
		wE_ "${ERROR_MSG_START}${E}"
		[[ ${ENDOFNIGHT} == "true" ]] && "${ALLSKY_SCRIPTS}/addMessage.sh" --type error --msg "${ME}: ${E}"
		RETURN_CODE=2

	elif [[ ${STATUS} == "ERROR" ]]; then
		E="ERROR returned while uploading Map data: ${MORE_INFO}."
		wE_ "${ERROR_MSG_START}${E}"
		[[ ${ENDOFNIGHT} == "true" ]] && "${ALLSKY_SCRIPTS}/addMessage.sh" --type error --msg "${ME}: ${E}"
		RETURN_CODE=2

	elif [[ ${STATUS} == "MESSAGE" ]]; then
		I="Message from Map server: ${MORE_INFO}."
		wI_ "${ERROR_MSG_START}${I}"
		# Don't include our name in the message.  It's not an error.
		[[ ${ENDOFNIGHT} != "true" ]] && "${ALLSKY_SCRIPTS}/addMessage.sh" --type info --msg "${I}"

	elif [[ ${STATUS} == "ALREADY_UPDATED" ]]; then
		MAX_UPDATES="${MORE_INFO}"
		MSG="NOTICE: You have already updated your Map data the maximum of ${MAX_UPDATES} times per day.  Try again tomorrow."
		wW_ "${WARNING_MSG_START}${MSG}"
		[[ ${ENDOFNIGHT} == "true" ]] && "${ALLSKY_SCRIPTS}/addMessage.sh" --type warning --msg "${ME}: ${MSG}"

	elif [[ -n ${STATUS} ]]; then
		E="ERROR: Unknown status from server: [${STATUS}].  Contact the Allsky Team."
		wE_ "${ERROR_MSG_START}${E}"
		[[ ${ENDOFNIGHT} == "true" ]] && "${ALLSKY_SCRIPTS}/addMessage.sh" --type error --msg "${ME}: ${E}"
		RETURN_CODE=2

# FIX: we should never get here because this loop only looks at lines that begin with "RETURN ".
	else
		E="ERROR Got unknown error while uploading Map data: ${STATUS:-No output}."
		wE_ "${ERROR_MSG_START}${E}"
		[[ ${ENDOFNIGHT} == "true" ]] && "${ALLSKY_SCRIPTS}/addMessage.sh" --type error --msg "${ME}: ${E}"
		RETURN_CODE=2
	fi
done <<< "$( echo "${RETURN_STRING}" | grep "^RETURN " )"

if [[ ${GOT_OK} == "true" ]]; then
	if [[ ${DELETE_ALL} == "true" ]]; then
		# Nothing is shared any more.  The counts on the Pi are kept.
		#shellcheck source-path=scripts
		source "${ALLSKY_SCRIPTS}/installUpgradeFunctions.sh" || exit "${ALLSKY_EXIT_ERROR_STOP}"
		update_all_settings_files ".mapsharing" "none" "text"
		update_all_settings_files ".shareusagedata" "false" "boolean"
		for X in "contactemail" "mapsharingconsent" "usagedataconsent" "contactemailconsent" ; do
			update_all_settings_files ".${X}" "" "text"
		done
		[[ ${WHISPER} == "false" ]] && wO_ "${MSG_START}'Map Sharing', 'Share Usage Data', and 'Contact Email' were turned off."
	elif [[ ${DELETE} == "false" && ${SHARE_USAGE} == "true" ]]; then
		reset_usage_data
	fi
fi

exit "${RETURN_CODE}"
