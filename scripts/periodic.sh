#!/bin/bash

[[ -z "${ALLSKY_HOME}" ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/.." )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"		|| exit "${ALLSKY_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"		|| exit "${ALLSKY_ERROR_STOP}"
#shellcheck disable=SC1091		# file doesn't exist in GitHub
source "${ALLSKY_CONFIG}/config.sh"			|| exit "${ALLSKY_ERROR_STOP}"

trap "exit 0" SIGTERM SIGINT

cd "${ALLSKY_SCRIPTS}" || exit "${ALLSKY_ERROR_STOP}"

while :
do
	if [[ ${PI_OS} == "bookworm" ]]; then
    	# AG - Bookworm mod 12/10/23
    	#shellcheck disable=SC1090,SC1091
    	source "${ALLSKY_HOME}/venv/bin/activate"
    	python3 "${ALLSKY_SCRIPTS}/flow-runner.py" --event periodic
    	deactivate
	else
    	python3 "${ALLSKY_SCRIPTS}/flow-runner.py" --event periodic
	fi

    DELAY=$(jq ".periodictimer" "${ALLSKY_MODULES}/module-settings.json")

    if [[ ! ($DELAY =~ ^[0-9]+$) ]]; then
        DELAY=60
    fi
    if [[ ${ALLSKY_DEBUG_LEVEL} -ge 4 ]]; then
		echo "INFO: Sleeping for $DELAY seconds"
	fi
    sleep "$DELAY"
done
