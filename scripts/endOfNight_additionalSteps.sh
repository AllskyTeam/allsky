#!/bin/bash

#
# Place any additional code you require to be run at the end of the night in this script. This script is run prior
# to the deletion of any old image files.
#
# Include "${ME}" in any output so it's easier to find in the log file, for debugging.
ME="$(basename "$BASH_ARGV0")"
