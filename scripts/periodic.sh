#!/bin/bash

if [ -z "${ALLSKY_HOME}" ]; then
	export ALLSKY_HOME="$(realpath $(dirname $(dirname "${BASH_ARGV0}")))"
fi

source "${ALLSKY_HOME}/variables.sh" || exit 1
source "${ALLSKY_HOME}/config/config.sh"

trap "exit" SIGTERM SIGINT

cd "${ALLSKY_SCRIPTS}"

while :
do
    "${ALLSKY_HOME}/post-process.py" --event periodic
    sleep 5
done
