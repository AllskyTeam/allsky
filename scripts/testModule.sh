#!/bin/bash

# Allow this script to be executed manually or by sudo, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/.." )"

ME="$( basename "${BASH_ARGV0}" )"

#shellcheck disable=SC1091 source-path=.
source "${ALLSKY_HOME}/variables.sh"		|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"		|| exit "${EXIT_ERROR_STOP}"

export CURRENT_IMAGE=""
export DAY_OR_NIGHT="${1}"
export ALLSKY_DEBUG_LEVEL=4

activate_python_venv
python3 "${ALLSKY_SCRIPTS}/flow-runner.py" --test
deactivate_python_venv