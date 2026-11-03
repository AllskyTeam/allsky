#!/bin/bash
# shellcheck disable=SC2034	# "source"d by run_migrations()

# Website configuration, ConfigVersion 4 (v2024.12.06_03):
#	Added the "equipmentinfo" setting and popout icon.

function migrate()
{
	local FILE="${1}"  TEMP

	if ! grep --silent '"equipmentinfo"' "${FILE}" ; then
		# Add setting after "computer" entry.
		# Add popoutIcons entry after "Computer" entry (with "fa-microchip").
		TEMP="/tmp/$$"
		local E="$( settings ".equipmentinfo" )"
		gawk -v E="${E}" 'BEGIN {
				found_computer = 0;
				found_microchip = 0;
			}
			{
				print $0;

				if (found_computer == 1) {
					printf("%16s\"equipmentinfo\": \"%s\",\n", " ", E)
					found_computer = 0;
					next;
				}

				if (found_microchip == 1) {
					if ($1 == "},") {
						printf("%12s{\n", " ");
						printf("%16s\"display\": true,\n", " ")
						printf("%16s\"label\": \"Equipment info\",\n", " ")
						printf("%16s\"icon\": \"fa fa-fw fa-keyboard\",\n", " ")
						printf("%16s\"variable\": \"equipmentinfo\",\n", " ")
						printf("%16s\"value\": \"\",\n", " ")
						printf("%16s\"style\": \"\"\n", " ")
						printf("%12s},\n", " ");
	
						while (getline) {
							print $0;
						}
						exit(0);
					}
				} else if ($0 ~ /"computer"/) {
					found_computer = 1;
				} else if ($0 ~ / fa-microchip"/) {
					found_microchip = 1;
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
