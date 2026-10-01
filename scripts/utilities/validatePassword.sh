#!/bin/bash

function validate_password()
{
    if [ -z "${PASSWORD}" ]; then
        echo "Password cannot be blank."
        exit 1
    elif [[ "${NOSECURE}" == "false" ]]; then
        # Check length (at least 8 characters)
        if [[ ${#PASSWORD} -lt 8 ]]; then
            echo "Password must be at least 8 characters long."
            exit 1
        fi

        # Check for at least one uppercase letter
        if [[ ! "$PASSWORD" =~ [A-Z] ]]; then
            echo "Password must contain at least one uppercase letter."
            exit 1
        fi

        # Check for at least one lowercase letter
        if [[ ! "$PASSWORD" =~ [a-z] ]]; then
            echo "Password must contain at least one lowercase letter."
            exit 1
        fi

        # Check for at least one digit
        if [[ ! "$PASSWORD" =~ [0-9] ]]; then
            echo "Password must contain at least one digit."
            exit 1
        fi

        # Check for at least one special character
        if [[ ! "$PASSWORD" =~ [\@\#\$\%\^\&\*\(\)\_\+\!\~] ]]; then
            echo "Password must contain at least one special character. @#$%^&*()_+!~"
            exit 1
        fi
    fi

    echo "Password is secure."
    exit 0
}

function get_password_format()
{
	if [[ "${NOSECURE}" == "false" ]]; then 
    	echo "Password must be a minimum of 8 characters. At least one Uppercase letter, one lowercase letter, one digit and one special character from @#$%^&*()_+!~"
	else
		echo "There is no fixed password format"
	fi
    exit 0
}

####
# Display script usage information
function usage_and_exit()
{
	local RET=${1}
	{
		echo
		[[ ${RET} -ne 0 ]] && echo -en "${RED}"
		echo "Usage: ${ME} [--help] [--nosecure] [--getformat] [--password <password>]"
		[[ ${RET} -ne 0 ]] && echo -en "${NC}"
		echo -e "\n	where:"
		echo -e "	'--help' displays this message and exits."
		echo -e "	'--getformat' Return the password format as a string."
		echo -e "	'--nosecure' Do not enforce secure passwords."
	} >&2
	exit "${RET}"
}

NOSECURE="false"
PASSWORD=""
DO_PASSWORD_FORMAT="false"

while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
		--help)
			DO_HELP="true"
			;;

        --getformat)
			DO_PASSWORD_FORMAT="true"
            ;;

		--nosecure)
			NOSECURE="true"
			;;

		--password)
			PASSWORD="${2}"
			shift
			;;
	esac
	shift
done

[[ ${DO_HELP} == "true" ]] && usage_and_exit 0
[[ ${DO_PASSWORD_FORMAT} == "true" ]] && get_password_format 0

validate_password