#!/bin/bash
# shellcheck disable=SC2034	# "source"d by run_migrations()

# Overlay templates, version 2 (v2026.10.01):
#	v2024 read a format that starts with "%" as a comma-separated list, one format per
#	variable ("%H:%M:%S", or "%H:%M,%d.%m" for two variables).  v2026 only reads formats
#	in braces, so these were ignored (a time showed as "070644").  Put each one in braces:
#	"%H:%M,%d.%m" becomes "{%H:%M}{%d.%m}".  Formats already in braces are not changed.

function migrate()
{
	local FILE="${1}"  TEMP="${1}.migrating"

	jq --indent 4 '(.fields[]? | select(.format | strings | startswith("%")) | .format)
		|= ("{" + (split(",") | join("}{")) + "}")' "${FILE}" > "${TEMP}" || { rm -f "${TEMP}"; return 1; }

	# Only rewrite the file if a format changed.
	if [[ "$( jq -S . "${TEMP}" )" != "$( jq -S . "${FILE}" )" ]]; then
		# cp so it keeps ${FILE}'s attributes
		cp "${TEMP}" "${FILE}" || { rm -f "${TEMP}"; return 1; }
	fi
	rm -f "${TEMP}"
	return 0
}
