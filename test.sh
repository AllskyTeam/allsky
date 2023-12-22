#!/bin/bash

#shellcheck disable=SC2086 source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit ${ALLSKY_ERROR_STOP}
#shellcheck disable=SC2086 source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"					|| exit ${ALLSKY_ERROR_STOP}

# This file defines functions plus sets many variables.
#shellcheck disable=SC2086 source-path=scripts
source "${ALLSKY_SCRIPTS}/installUpgradeFunctions.sh"	|| exit ${ALLSKY_ERROR_STOP}


INSTALLED_VENV="true"
if [ -d "${ALLSKY_HOME}/venv" ]; then
    INSTALLED_VENV="false"
fi

echo "Installed venv ${INSTALLED_VENV}"

OS="$(grep CODENAME /etc/os-release | cut -d= -f2)"	# usually buster or bullseye
LONG_BITS=$(getconf LONG_BIT) # Size of a long, 32 or 64

	if [[ ${OS} == "buster" ]]; then
		M=" for Buster"
		R="-buster"

		# Force pip upgrade, without this installations on Buster fail
		pip3 install --upgrade pip > /dev/null 2>&1
	elif [[ ${OS} == "bullseye" ]]; then
		M=" for Bullseye"
		R="-bullseye"
	elif [[ ${OS} == "bookworm" ]]; then
		M=" for Bookworm"
		R="-bookworm"
	else
		M=""
		R=""
	fi

	REQUIREMENTS_FILE="${ALLSKY_REPO}/requirements${R}-${LONG_BITS}.txt"

    display_msg info "Attempting to locate Python dependency file"

    if [[ ! -f ${REQUIREMENTS_FILE} ]]; then
        display_msg info "${REQUIREMENTS_FILE} - File not found!"
        REQUIREMENTS_FILE="${ALLSKY_REPO}/requirements${R}.txt"
        if [[ ! -f ${REQUIREMENTS_FILE} ]]; then
            display_msg info "${REQUIREMENTS_FILE} - File not found!"

            REQUIREMENTS_FILE="${ALLSKY_REPO}/requirements-${LONG_BITS}.txt"
            if [[ ! -f ${REQUIREMENTS_FILE} ]]; then
                display_msg  info "${REQUIREMENTS_FILE} - File not found!"
                REQUIREMENTS_FILE="${ALLSKY_REPO}/requirements.txt"
            else
                display_msg info "${REQUIREMENTS_FILE} - File found!"
            fi
        else
            display_msg info "${REQUIREMENTS_FILE} - File found!"
        fi
    else
        display_msg  info "${REQUIREMENTS_FILE} - File found!"
    fi