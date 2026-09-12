#!/bin/bash

# --- Default Values ---
ALLSKY_HOME="${ALLSKY_HOME:-}"

# --- Parse Arguments ---
while [[ $# -gt 0 ]]; do
    key="$(echo "$1" | tr '[:upper:]' '[:lower:]')"
    case "$key" in
        --allsky_home)
            ALLSKY_HOME="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1" >&2
            exit 1
            ;;
    esac
done

# --- Validate Required Arguments ---
if [[ -z ${ALLSKY_HOME} ]]; then
    echo "ERROR: Missing required arguments." >&2
    echo "Usage: $0 [--allsky_home <path>]" >&2
    echo "You may also set ALLSKY_HOME as environment variables." >&2
    exit 1
fi

# --- Export Variables ---
export ALLSKY_HOME

# --- Validate and Source variables.sh ---
VARS_FILE="${ALLSKY_HOME}/variables.sh"
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
PY_SCRIPT="${ALLSKY_SCRIPTS}/devicemanager.py"
if [[ ! -f ${PY_SCRIPT} ]]; then
    echo "ERROR: devicemanager.py not found at ${PY_SCRIPT}" >&2
    exit 1
fi

python3 "${PY_SCRIPT}"
