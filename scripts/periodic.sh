#!/bin/bash

if [[ -z ${ALLSKY_HOME} ]]; then
	export ALLSKY_HOME="$(realpath "$(dirname $(dirname "${BASH_ARGV0}"))")"
fi

source "${ALLSKY_HOME}/variables.sh" || exit 99
source "${ALLSKY_HOME}/config/config.sh" || exit 99

ME="$(basename "${BASH_ARGV0}")"

trap "exit" SIGTERM SIGINT

cd "${ALLSKY_SCRIPTS}" || exit 99

while :
do
	"${ALLSKY_SCRIPTS}/flow-runner.py" --event periodic
	DELAY="$(jq ".periodictimer" "${ALLSKY_CONFIG}/module-settings.json")"

	if [[ !($DELAY =~ ^[0-9]+$) ]]; then
		DELAY=5
	fi
	echo "${ME} INFO: Sleeping for $DELAY seconds."
	sleep "$DELAY"
done
