#!/bin/bash

# This script allows the user to manually upload the keogram, startrails, and timelapse files.
# It uses the "generateForDay.sh" script to do the work.

# Allow this script to be executed manually, which requires ALLSKY_HOME to be set.
if [ -z "${ALLSKY_HOME}" ] ; then
	export ALLSKY_HOME="$(realpath $(dirname "${BASH_ARGV0}")/..)"
fi

source "${ALLSKY_HOME}/config/variables.sh"

# "--upload" tells the script to do an upload rather than create.
"${ALLSKY_SCRIPTS}/generateForDay.sh" --upload "$@"
