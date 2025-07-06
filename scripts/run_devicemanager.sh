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
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# --- Validate Required Arguments ---
if [[ -z "$ALLSKY_HOME" ]]; then
    echo "Error: Missing required arguments."
    echo "Usage: $0 [--allsky_home <path>]"
    echo "You may also set ALLSKY_HOME as environment variables."
    exit 1
fi

# --- Export Variables ---
export ALLSKY_HOME

# --- Validate and Source variables.sh ---
VARS_FILE="$ALLSKY_HOME/variables.sh"
if [[ -f "$VARS_FILE" ]]; then
    # shellcheck source=/dev/null
    if ! source "$VARS_FILE"; then
        echo "Failed to source $VARS_FILE"
        exit 1
    fi
else
    echo "Error: $VARS_FILE does not exist"
    exit 1
fi

# --- Run Python Script ---
PY_SCRIPT="$ALLSKY_SCRIPTS/devicemanager.py"
if [[ ! -f "$PY_SCRIPT" ]]; then
    echo "Error: devicemanager.py not found at $PY_SCRIPT"
    exit 1
fi

python3 "$PY_SCRIPT"