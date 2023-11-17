#!/bin/bash

# Allow this script to be executed manually, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"			|| exit  "${ALLSKY_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"			|| exit "${ALLSKY_ERROR_STOP}"

if [[ $# -eq 1 ]]; then
	if [[ ${1} == "--help" ]]; then
		echo -e "Usage: ${ME} [YYYYmmdd]"
		exit 0
	else
		DATE="${1}"
	fi
else
	DATE=$(date +'%Y%m%d')
fi

# If we weren't saving daytime images the directory won't exist.
SAVING="$( settings ".savedaytimeimages" )"
DATE_DIR="${ALLSKY_IMAGES}/${DATE}"
if [[ ! -d ${DATE_DIR} && ${SAVING} == "true" ]]; then
	echo -e "${ME}: ${RED}ERROR: '${DATE_DIR}' not found!${NC}"
	exit 2
fi

if [[ ${PI_OS} == "bookworm" ]]; then
   	#shellcheck disable=SC1090,SC1091
   	source "${ALLSKY_HOME}/venv/bin/activate"
   	python3 "${ALLSKY_SCRIPTS}/flow-runner.py" --event daynight
   	deactivate
else
   	python3 "${ALLSKY_SCRIPTS}/flow-runner.py" --event daynight
fi

exit 0
