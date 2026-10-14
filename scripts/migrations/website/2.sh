#!/bin/bash
# shellcheck disable=SC2034	# "source"d by run_migrations()

# Website configuration, ConfigVersion 2 (v2024.12.06):
#	Removed "AllskyWebsiteVersion" and "onPi"; added the thumbnail settings;
#	"videos", "keograms" and "startrails" links end in "/".

function migrate()
{
	local FILE="${1}"  TEMP

	# These steps bring version 1 up to 2.
	# Deletions:
	update_json_file -d ".config.AllskyWebsiteVersion" "" "${FILE}"
	update_json_file -d ".homePage.onPi" "" "${FILE}"
	update_array_field "${FILE}" "homePage.popoutIcons" "variable" "AllskyWebsiteVersion" "--delete"

	# Additions:
	# Add in same place as in repo file, unless already there.
	if ! grep --silent '"thumbnailsizex"' "${FILE}" ; then
		local NEW='      \"thumbnailsizex\": 100,\
        \"thumbnailsizey\": 75,\
        \"thumbnailsortorder\": \"ascending\",'
		sed -i "/\"leftSidebar\"/i\ ${NEW}" "${FILE}"
	fi

	# Changes:
	for i in "videos" "keograms" "startrails"; do
		update_array_field "${FILE}" "homePage.leftSidebar" "url" "${i}" "${i}/"
	done

	# Like before migrations had their own files, these steps don't stop on errors.
	return 0
}
