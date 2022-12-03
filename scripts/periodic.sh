#!/bin/bash

if [ -z "${ALLSKY_HOME}" ]; then
	export ALLSKY_HOME="$(realpath $(dirname $(dirname "${BASH_ARGV0}")))"
fi

cd "${ALLSKY_HOME}/scripts"

source "${ALLSKY_HOME}/variables.sh"
source "${ALLSKY_HOME}/config/config.sh"

trap "exit" SIGTERM SIGINT

while :
do
    ./post-process.py --event periodic
    sleep 5
done