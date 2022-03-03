#!/bin/bash

# ${1} is allsky.sh's process ID (PID).  Send a signal to any child process
# which should normally just be the "capture" program.
PID=${1}
if [ -z "${PID}" ]; then
	echo "*** ERROR in reload.sh: no PID specified on command line ***"
	exit 1
fi

TO_SEND_SIGNAL=$(pgrep --parent ${PID})
if [ -z "${TO_SEND_SIGNAL}" ]; then
	echo "*** ERROR in reload.sh: cannot find any children of PID ${PID} ***"
	exit 2
fi

echo "${0}: Sending SIGUSR1 to PID ${TO_SEND_SIGNAL}"
kill -USR1 ${TO_SEND_SIGNAL}
