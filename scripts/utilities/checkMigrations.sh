#!/bin/bash

# Check that every configuration version in the repository has its migration,
# so a version can't be raised without one.  Runs without an Allsky installation
# (e.g., in GitHub Actions).  Exits 1 if a migration is missing.

ME="$( basename "${BASH_ARGV0}" )"
ALLSKY_SCRIPTS="$( cd "$( dirname "${BASH_ARGV0}" )/.." && pwd )"
REPO_DIR="$( dirname "${ALLSKY_SCRIPTS}" )"

# shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/migrations.sh"	|| exit 1

RET=0

# Website configuration files.
WEBSITE_VERSION="$( jq -r .ConfigVersion "${REPO_DIR}/config_repo/configuration.json.repo" )"
if [[ ! ${WEBSITE_VERSION} =~ ^[0-9]+$ ]]; then
	echo "${ME}: Unable to get ConfigVersion of configuration.json.repo." >&2
	exit 1
fi
check_migrations "website" "${WEBSITE_VERSION}" || RET=1

# Overlay templates and system changes have no version number of their own:
# no gaps up to the highest N.sh.
OVERLAY_VERSION="$( latest_migration "overlay" )"
check_migrations "overlay" "${OVERLAY_VERSION}" || RET=1
SETTINGS_VERSION="$( latest_migration "settings" )"
check_migrations "settings" "${SETTINGS_VERSION}" || RET=1
SYSTEM_VERSION="$( latest_migration "system" )"
check_migrations "system" "${SYSTEM_VERSION}" || RET=1

if [[ ${RET} -eq 0 ]]; then
	MSG="All migrations are there (website: version ${WEBSITE_VERSION}"
	MSG+=", overlay: version ${OVERLAY_VERSION}, settings: version ${SETTINGS_VERSION}"
	MSG+=", system: version ${SYSTEM_VERSION})."
	echo "${ME}: ${MSG}"
fi
exit "${RET}"
