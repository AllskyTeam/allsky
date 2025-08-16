#!/bin/bash

# --- Default Values ---
ALLSKY_HOME="${ALLSKY_HOME:-}"
ALLSKY_SCRIPTS="${ALLSKY_SCRIPTS:-}"
ALLSKY_TMP="${ALLSKY_TMP:-}"
OVERLAY=""


# --- Parse Arguments ---
while [[ $# -gt 0 ]]; do
    key="$(echo "${1}" | tr '[:upper:]' '[:lower:]')"
    case "$key" in
        --allsky_home)
            ALLSKY_HOME="${2}"
            shift 2
            ;;
        --allsky_tmp)
            ALLSKY_TMP="${2}"
            shift 2
            ;;
        --allsky_scripts)
            ALLSKY_SCRIPTS="${2}"
            shift 2
            ;;
        --overlay)
            OVERLAY="${2}"	# TODO: OVERLAY isn't used
            shift 2
            ;;
        *)
            echo "Unknown option: ${1}" >&2
            exit 1
            ;;
    esac
done

# --- Validate Required Arguments ---
if [[ -z ${ALLSKY_HOME} || -z ${ALLSKY_SCRIPTS} || -z ${ALLSKY_TMP} || -z ${OVERLAY} ]]; then
    exec >&2
    echo "Error: Missing required arguments."
    echo "Usage: ${0} [--allsky_home <path>] [--allsky_scripts <path>] --allsky_tmp <path> [--overlay <overlay path>]"
    echo "You may also set ALLSKY_HOME, ALLSKY_SCRIPTS and ALLSKY_TMP as environment variables."
    exit 1
fi

# --- Export Variables ---
export ALLSKY_HOME
export ALLSKY_SCRIPTS
export ALLSKY_TMP="${ALLSKY_TMP}"


# --- Validate and Source variables.sh ---
VARS_FILE="$ALLSKY_HOME/variables.sh"
if [[ -f ${VARS_FILE} ]]; then
    # shellcheck source=/dev/null
    if ! source "${VARS_FILE}"; then
        echo "ERROR: Failed to source ${VARS_FILE}" >&2
        exit 1
    fi
else
    echo "ERROR: ${VARS_FILE} does not exist" >&2
    exit 1
fi


# --- Run Python Script ---
PY_SCRIPT="${ALLSKY_SCRIPTS}/modules/allskyoverlay/overlaydata.py" 

python3 "${PY_SCRIPT}" --overlay="${ALLSKY_TMP}/test_overlay.json" --print
