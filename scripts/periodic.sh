#!/bin/bash

if [ -z "${ALLSKY_HOME}" ]; then
	export ALLSKY_HOME="$(realpath $(dirname $(dirname "${BASH_ARGV0}")))"
fi

# shellcheck disable=SC1090,SC1091
source "${ALLSKY_HOME}/variables.sh" || exit 1
# shellcheck disable=SC1090,SC1091
source "${ALLSKY_HOME}/config/config.sh"

trap "exit" SIGTERM SIGINT

cd "${ALLSKY_SCRIPTS}" || exit 1

while :
do
    "${ALLSKY_SCRIPTS}/flow-runner.py" --event periodic
    sleep 30
done
