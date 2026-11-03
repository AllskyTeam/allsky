#!/bin/bash
# shellcheck disable=SC2034	# "source"d by run_migrations()

# Website configuration, ConfigVersion 3 (v2024.12.06_01):
#	Added "meteors/".

function migrate()
{
	local FILE="${1}"  TEMP

	if ! grep --silent "meteors/" "${FILE}" ; then
		# Add after "startrails/" entry.
		TEMP="/tmp/$$"
		gawk 'BEGIN { found_startrails = 0; }
			{
				print $0;

				if (found_startrails == 1) {
					if ($1 == "},") {
						printf("%12s{\n", " ");
						printf("%16s\"display\": false,\n", " ")
						printf("%16s\"url\": \"meteors/\",\n", " ")
						printf("%16s\"title\": \"Archived Meteors\",\n", " ")
						printf("%16s\"icon\": \"fa fa-2x fa-fw fa-meteor\",\n", " ")
						printf("%16s\"style\": \"\"\n", " ")
						printf("%12s},\n", " ");
	
						while (getline) {
							print $0;
						}
						exit(0);
					}
				} else if ($0 ~ /"startrails\/"/) {
					found_startrails = 1;
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
