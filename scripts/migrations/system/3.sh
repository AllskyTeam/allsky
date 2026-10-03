#!/bin/bash
# shellcheck disable=SC2034	# "source"d by run_migrations()

# System version 3 (v2026.10.01_01):
#	The Solar System module (v1.2.0 and newer) only runs in the Periodic flow.
#	Running it for every image as well did the same work several times.
#	Move it from the Daytime and Nighttime flows to the Periodic flow, keeping its
#	settings.  If it was in both, the enabled entry is used, Daytime first.
#	If it's already in the Periodic flow, that entry is kept.

function migrate()
{
	local MODULE="solarsystem"
	local SUFFIX  DAY  NIGHT  PERIODIC  ENTRY  E  TEMP  F

	for SUFFIX in "" "-debug"; do
		DAY="${ALLSKY_MODULES}/postprocessing_day${SUFFIX}.json"
		NIGHT="${ALLSKY_MODULES}/postprocessing_night${SUFFIX}.json"
		PERIODIC="${ALLSKY_MODULES}/postprocessing_periodic${SUFFIX}.json"

		# The entry to use: an enabled one if there is one.
		ENTRY=""
		for F in "${DAY}" "${NIGHT}"; do
			[[ -f ${F} ]] || continue
			E="$( jq -c --arg m "${MODULE}" '.[$m] // empty' "${F}" 2>/dev/null )"
			[[ -z ${E} ]] && continue
			if [[ -z ${ENTRY} ]] || [[ "$( jq -r '.enabled' <<< "${ENTRY}" )" != "true" &&
					"$( jq -r '.enabled' <<< "${E}" )" == "true" ]]; then
				ENTRY="${E}"
			fi
		done
		[[ -z ${ENTRY} ]] && continue

		if [[ -f ${PERIODIC} ]]; then
			if ! jq -e --arg m "${MODULE}" 'has($m)' "${PERIODIC}" > /dev/null 2>&1 ; then
				TEMP="${PERIODIC}.migrating"
				jq --indent 4 --arg m "${MODULE}" --argjson e "${ENTRY}" '.[$m] = $e' \
					"${PERIODIC}" > "${TEMP}" &&
				cp "${TEMP}" "${PERIODIC}" || { rm -f "${TEMP}"; return 1; }
				rm -f "${TEMP}"
			fi
		elif [[ -z ${SUFFIX} ]]; then
			# No Periodic flow yet; only the main flows are created, not their debug copies.
			jq --null-input --indent 4 --arg m "${MODULE}" --argjson e "${ENTRY}" '{($m): $e}' \
				> "${PERIODIC}" || return 1
		fi

		for F in "${DAY}" "${NIGHT}"; do
			jq -e --arg m "${MODULE}" 'has($m)' "${F}" > /dev/null 2>&1 || continue
			TEMP="${F}.migrating"
			jq --indent 4 --arg m "${MODULE}" 'del(.[$m])' "${F}" > "${TEMP}" &&
			cp "${TEMP}" "${F}" || { rm -f "${TEMP}"; return 1; }
			rm -f "${TEMP}"
		done
	done

	return 0
}
