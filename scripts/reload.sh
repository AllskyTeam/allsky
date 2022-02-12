#!/bin/bash

# ${1} is allsky.sh.  Send a signal to any child process.
PID=${1}
if [ -z "${PID}" ]; then
	echo "*** ERROR on reload - no PID specified ***"
	exit 1
fi

TO_SEND_SIGNAL=$(ps --ppid ${PID} -o pid | grep -v PID)
if [ -z "${TO_SEND_SIGNAL}" ]; then
	echo "*** ERROR on reload - cannot find any children of PID ${PID} ***"
	exit 2
fi

echo "TO_SEND_SIGNAL=$TO_SEND_SIGNAL"
kill -USR1 $TO_SEND_SIGNAL
