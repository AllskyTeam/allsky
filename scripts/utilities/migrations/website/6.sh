#!/bin/bash
# shellcheck disable=SC2034	# "source"d by run_migrations()

[[ -z ${ALLSKY_VARIABLE_SET} ]] && source "${ALLSKY_HOME}/variables.sh"

# Website configuration, ConfigVersion 6 (v2026.10.01_01):
#	Added "keolapses/".

function migrate()
{
	local FILE="${1}"  TEMP

	if ! grep --silent "keolapses/" "${FILE}" ; then
		# Add after "Mini-timelapse/" entry.
		local TEMP="/tmp/$$"

		# If there are any keolapses set "display" to true.
		local DISPLAY="false"
		if [[ $( find "${ALLSKY_IMAGES}" -type d -name "keolapse" | wc -l ) -gt 0 ]]; then
			DISPLAY="true"
		fi

		gawk -v DISPLAY="${DISPLAY}" 'BEGIN { found_mini_timelapse = 0; }
			{
				print $0;

				if (found_mini_timelapse == 1) {
					if ($1 == "},") {
						printf("%12s{\n", " ");
						printf("%16s\"display\": %s,\n", " ", DISPLAY)
						printf("%16s\"url\": \"keolapses/\",\n", " ")
						printf("%16s\"title\": \"Archived Keolapses\",\n", " ")
						printf("%16s\"icon\": \"fa fa-2x fa-fw fa-circle-notch\",\n", " ")
						printf("%16s\"style\": \"\"\n", " ")
						printf("%12s},\n", " ");
	
						while (getline) {
							print $0;
						}
						exit(0);
					}
				} else if ($0 ~ /"Mini-timelapse"/) {
					found_mini_timelapse = 1;
				}
			}' "${FILE}" > "${TEMP}"
		if [[ $? -eq 0 ]]; then
			# cp so it keeps ${FILE}'s attributes
			cp "${TEMP}" "${FILE}" && rm -f "${TEMP}"
		fi
	fi

	# Like before migrations had their own files, these steps don't stop on errors.
	return 0
}
