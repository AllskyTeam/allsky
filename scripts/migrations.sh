#!/bin/bash

# Versioned migrations of Allsky's configuration files.
# This file is "source"d by installUpgradeFunctions.sh.
#
# Each kind of file has a directory  ${ALLSKY_MIGRATIONS_DIR}/<kind>/  with one file per
# version:  N.sh  brings a file from version N-1 to version N.  Version 1 has no file.
#	website:	the local and remote Website configuration files ("ConfigVersion").
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
