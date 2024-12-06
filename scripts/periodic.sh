#!/bin/bash

[[ -z "${ALLSKY_HOME}" ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/.." )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"		|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"		|| exit "${EXIT_ERROR_STOP}"

trap "exit 0" SIGTERM SIGINT

cd "${ALLSKY_SCRIPTS}"						|| exit "${EXIT_ERROR_STOP}"

while :
do
	activate_python_venv
	python3 "${ALLSKY_SCRIPTS}/flow-runner.py" --event periodic
	deactivate_python_venv

	DELAY=$( settings ".periodictimer" "${ALLSKY_MODULES}/module-settings.json" )
	if [[ ! (${DELAY} =~ ^[0-9]+$) ]]; then
		DELAY=60
	fi
	if [[ ${ALLSKY_DEBUG_LEVEL} -ge 4 ]]; then
		echo "INFO: Sleeping for ${DELAY} seconds"
	fi
	sleep "${DELAY}"
done

exit 0
