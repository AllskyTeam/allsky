#!/bin/bash

# Versioned migrations of Allsky's configuration files.
# This file is "source"d by installUpgradeFunctions.sh.
#
# Each kind of file has a directory  ${ALLSKY_MIGRATIONS_DIR}/<kind>/  with one file per
# version:  N.sh  brings a file from version N-1 to version N.  Version 1 has no file.
#	website:	the local and remote Website configuration files ("ConfigVersion").
#	overlay:	the user's overlay templates.  They have no version number of their own,
#				so the version they are at is kept in ${ALLSKY_MIGRATIONS_STATE_FILE},
#				and the newest version is the highest N.sh.
#
# A migration file defines one function,  migrate,  which gets the file to update as ${1}.
# It is "source"d, so it can use the functions in installUpgradeFunctions.sh.
# It must only change what still needs changing, so running it again is safe,
# and it must return non-zero if it fails.
#
# install.sh, upgrade.sh and remoteWebsiteInstall.sh all use run_migrations(),
# so each change is made in one place.  check_migrations() finds missing files,
# so a version can't be raised without its migration.

export ALLSKY_MIGRATIONS_DIR="${ALLSKY_SCRIPTS}/migrations"
export ALLSKY_MIGRATIONS_STATE_FILE="${ALLSKY_CONFIG}/migrations.json"

# Run the "${1}" migrations on file "${2}", from version ${3} to version ${4}.
# An unknown prior version is treated as version 1.
# If the file is already at (or, for a tester, above) version ${4}, the migration for ${4}
# runs again, so testers get changes made while the version stayed the same.
function run_migrations()
{
	local KIND="${1}"  FILE="${2}"  PRIOR="${3}"  NEW="${4}"
	local FIRST  N  M

	if [[ ! ${NEW} =~ ^[0-9]+$ ]]; then
		echo "run_migrations(): invalid new version '${NEW}' for '${KIND}'." >&2
		return 1
	fi
	[[ ${PRIOR} =~ ^[0-9]+$ ]] || PRIOR=1

	if (( PRIOR < NEW )); then
		FIRST=$(( PRIOR + 1 ))
	else
		FIRST=${NEW}
	fi
	(( FIRST < 2 )) && FIRST=2

	for (( N = FIRST; N <= NEW; N++ )); do
		M="${ALLSKY_MIGRATIONS_DIR}/${KIND}/${N}.sh"
		if [[ ! -f ${M} ]]; then
			echo "run_migrations(): missing migration '${M}'." >&2
			return 1
		fi

		unset -f migrate
		# shellcheck disable=SC1090
		if ! source "${M}" || ! migrate "${FILE}" ; then
			echo "run_migrations(): '${KIND}/${N}.sh' failed on '${FILE}'." >&2
			unset -f migrate
			return 1
		fi
		unset -f migrate
	done

	return 0
}

# Check that every version from 2 to ${2} of kind "${1}" has a migration.
# Prints the missing files and returns 1 if any are missing.
function check_migrations()
{
	local KIND="${1}"  NEW="${2}"  N  RET=0

	for (( N = 2; N <= NEW; N++ )); do
		if [[ ! -f ${ALLSKY_MIGRATIONS_DIR}/${KIND}/${N}.sh ]]; then
			echo "Missing migration: ${KIND}/${N}.sh"
			RET=1
		fi
	done

	return "${RET}"
}

# The newest version of kind "${1}": the highest N.sh (1 if there are none).
function latest_migration()
{
	local N=1

	while [[ -f ${ALLSKY_MIGRATIONS_DIR}/${1}/$(( N + 1 )).sh ]]; do
		(( N++ ))
	done
	echo "${N}"
}

# Bring the files "${2}"... of kind "${1}", which have no version number of their own,
# to the newest version.  Their version is kept in ${ALLSKY_MIGRATIONS_STATE_FILE};
# if it's unknown (e.g., after "Replace All"), all migrations run, which is safe
# since each one only changes what still needs changing.
function run_state_migrations()
{
	local KIND="${1}" ; shift
	local PRIOR  NEW  FILE  TEMP

	PRIOR="$( jq -r --arg k "${KIND}" '.[$k] // 1' "${ALLSKY_MIGRATIONS_STATE_FILE}" 2>/dev/null )"
	[[ ${PRIOR} =~ ^[0-9]+$ ]] || PRIOR=1
	NEW="$( latest_migration "${KIND}" )"
	(( PRIOR >= NEW )) && return 0

	for FILE in "$@"; do
		[[ -f ${FILE} ]] || continue
		run_migrations "${KIND}" "${FILE}" "${PRIOR}" "${NEW}" || return 1
	done

	TEMP="${ALLSKY_MIGRATIONS_STATE_FILE}.tmp"
	if [[ -s ${ALLSKY_MIGRATIONS_STATE_FILE} ]]; then
		jq --indent 4 --arg k "${KIND}" --argjson v "${NEW}" '.[$k] = $v' \
			"${ALLSKY_MIGRATIONS_STATE_FILE}" > "${TEMP}"
	else
		jq --null-input --indent 4 --arg k "${KIND}" --argjson v "${NEW}" '{($k): $v}' > "${TEMP}"
	fi && mv "${TEMP}" "${ALLSKY_MIGRATIONS_STATE_FILE}"
}

# The user's overlay templates.
function run_overlay_migrations()
{
	run_state_migrations "overlay" "${ALLSKY_OVERLAY}"/myTemplates/overlay*.json
}
