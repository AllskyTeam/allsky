#!/bin/bash

[[ -z "${ALLSKY_HOME}" ]] && export ALLSKY_HOME="$(realpath "$(dirname "${BASH_ARGV0}")/..")"

#shellcheck disable=SC2086 source-path=.
source "${ALLSKY_HOME}/variables.sh"		|| exit ${ALLSKY_ERROR_STOP}
#shellcheck disable=SC2086 source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"		|| exit ${ALLSKY_ERROR_STOP}
#shellcheck disable=SC2086,SC1091		# file doesn't exist in GitHub
source "${ALLSKY_CONFIG}/config.sh"			|| exit ${ALLSKY_ERROR_STOP}

trap "exit 0" SIGTERM SIGINT

#shellcheck disable=SC2086
cd "${ALLSKY_SCRIPTS}" || exit ${ALLSKY_ERROR_STOP}

while :
do
    # AG - Bookworm mod 12/10/23
    #shellcheck disable=SC1090,SC1091
    source "${ALLSKY_HOME}/venv/bin/activate"
    python3 "${ALLSKY_SCRIPTS}/flow-runner.py" --event periodic
    deactivate

    DELAY=$(jq ".periodictimer" "${ALLSKY_MODULES}/module-settings.json")

    if [[ ! ($DELAY =~ ^[0-9]+$) ]]; then
        DELAY=60
    fi
    if [[ ${ALLSKY_DEBUG_LEVEL} -ge 4 ]]; then
		echo "INFO: Sleeping for $DELAY seconds"
	fi
    sleep "$DELAY"
done
