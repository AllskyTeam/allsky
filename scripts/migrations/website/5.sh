#!/bin/bash
# shellcheck disable=SC2034	# "source"d by run_migrations()

# Website configuration, ConfigVersion 5 (v2026.10.01):
#	Changed "imageName" to "/current/image.jpg" in the local config file
#		(done in replace_website_placeholders(), not here).
#	New timelapse and mini-timelapse icons.
#	Full set of overlay colours.
#	Added "overlayLean" and "overlayLeanAz" after "az", for a camera that isn't level.

function migrate()
{
	local FILE="${1}"  TEMP

	# Update timelapse icons.
	update_array_field "${FILE}" "homePage.leftSidebar" "icon" \
		"fa fa-2x fa-fw fa-play-circle" "fa fa-2x fa-fw fa-video"
	update_array_field "${FILE}" "homePage.leftSidebar" "icon" \
		"fa fa-2x fa-fw icon-mini-timelapse" "fa fa-2x fa-fw fa-file-video"

	# Only while they are still the old kind, so running this again keeps a user's colours.
	if [[ "$( jq '[.config.colours | to_entries[] | select(.value | type == "object") | .value | has("constellation")] | all' "${FILE}" 2>/dev/null )" != "true" ]] ; then
		# Replace the old XXX_cardinal-only colours with the current full colour set.
		TEMP="/tmp/$$"
		jq --indent 4 --slurpfile repo "${REPO_WEBSITE_CONFIGURATION_FILE}" \
			'.config.colours = $repo[0].config.colours' "${FILE}" > "${TEMP}"
		if [[ $? -eq 0 ]]; then
			# cp so it keeps ${FILE}'s attributes
			cp "${TEMP}" "${FILE}" && rm -f "${TEMP}"
		else
			rm -f "${TEMP}"
		fi
	fi

	# Add "overlayLean" and "overlayLeanAz" after "az", unless already there.
	TEMP="/tmp/$$"
	jq --indent 4 '
		if (.config | has("overlayLean")) then .
		else .config |= (reduce to_entries[] as $e ({};
			. + {($e.key): $e.value}
			+ (if $e.key == "az" then {"overlayLean": 0, "overlayLeanAz": 0} else {} end)))
		end' "${FILE}" > "${TEMP}"
	if [[ $? -eq 0 ]]; then
		# cp so it keeps ${FILE}'s attributes
		cp "${TEMP}" "${FILE}" && rm -f "${TEMP}"
	else
		rm -f "${TEMP}"
	fi

	# Like before migrations had their own files, these steps don't stop on errors.
	return 0
}
