#!/bin/bash

# --- Default Values ---
ALLSKY_HOME="${ALLSKY_HOME:-}"
ALLSKY_SCRIPTS="${ALLSKY_SCRIPTS:-}"
DAY_NIGHT=""
CURRENT_IMAGE=""

# --- Parse Arguments ---
while [[ $# -gt 0 ]]; do
    key="${1,,}"  # lowercase
    case "$key" in
        --allsky_home)
            ALLSKY_HOME="$2"
            shift 2
            ;;
        --allsky_scripts)
            ALLSKY_SCRIPTS="$2"
            shift 2
            ;;
        --day_night)
            DAY_NIGHT="$2"
            shift 2
            ;;
        --image)
            CURRENT_IMAGE="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# --- Validate Required Arguments ---
if [[ -z ${ALLSKY_HOME} || -z ${ALLSKY_SCRIPTS} || -z ${DAY_NIGHT} ]]; then
	exec >&2
    echo "ERROR: Missing required arguments."
    echo "Usage: $0 [--allsky_home <path>] [--scripts <path>] --day_night <day|night> [--image <image_path>]"
    echo "You may also set ALLSKY_HOME and ALLSKY_SCRIPTS as environment variables."
    exit 1
fi

# --- Export Variables ---
export ALLSKY_HOME
export ALLSKY_SCRIPTS
export DAY_OR_NIGHT="${DAY_NIGHT}"
export CURRENT_IMAGE="${CURRENT_IMAGE:-}"

# --- Validate and source variables.sh ---
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
PY_SCRIPT="${ALLSKY_SCRIPTS}/flow-runner.py"
if [[ ! -f ${PY_SCRIPT} ]]; then
    echo "ERROR:: flow-runner.py not found at ${PY_SCRIPT}" >&2
    exit 1
fi

python3 "${PY_SCRIPT}" --test
