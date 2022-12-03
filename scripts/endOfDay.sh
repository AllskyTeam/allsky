#!/bin/bash

ME="$(basename "${BASH_ARGV0}")"

# Allow this script to be executed manually, which requires several variables to be set.
if [[ -z ${ALLSKY_HOME} ]]; then
	ALLSKY_HOME="$(realpath "$(dirname "${BASH_ARGV0}")/..")"
	export ALLSKY_HOME
fi
# shellcheck disable=SC1090
source "${ALLSKY_HOME}/variables.sh"
# shellcheck disable=SC1090
source "${ALLSKY_CONFIG}/config.sh"
# shellcheck disable=SC1090
source "${ALLSKY_CONFIG}/ftp-settings.sh"

if [ $# -eq 1 ] ; then
	if [[ ${1} = "-h" || ${1} = "--help" ]]; then
		echo -e "Usage: ${ME} [YYYYmmdd]"
		exit 0
	else
		DATE="${1}"
	fi
else
	DATE=$(date +'%Y%m%d')
fi

DATE_DIR="${ALLSKY_IMAGES}/${DATE}"
if [[ ! -d ${DATE_DIR} ]]; then
	echo -e "${ME}: ${RED}ERROR: '${DATE_DIR}' not found!${NC}"
	exit 2
fi

# Run custom script at the end of a day.
cmd="${ALLSKY_SCRIPTS}/endOfDay_additionalSteps.sh"
test -x "${cmd}" && "${cmd}"

python ${ALLSKY_SCRIPTS}/flow-runner.py -e daynight

exit 0
