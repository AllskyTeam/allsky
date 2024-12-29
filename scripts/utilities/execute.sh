#!/bin/bash

# Execute the specified command.
# Normally the command is built-in, but allow for an arbitrary command.
# Many commands are referenced in addMessage.sh and the command name
# is one of its IDs, e.g., ${AM_...}.

# Allow this script to be executed manually, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"		|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"		|| exit "${EXIT_ERROR_STOP}"

OK="true"
DO_HELP="false"
while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
		--help)
			DO_HELP="true"
			;;
		-*)
			echo -e "${RED}Unknown argument '${ARG}' ignoring.${NC}" >&2
			OK="false"
			;;
		*)
			break
			;;
	esac
	shift
done

usage_and_exit()
{
	local RET=${1}
	{
		echo
		[[ ${RET} -ne 0 ]] && echo -en "${RED}"
		echo "Usage: ${ME} [--help] command [arguments...]"
		[[ ${RET} -ne 0 ]] && echo -en "${NC}"
	} >&2
	exit "${RET}"
}

[[ ${DO_HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" || $# -eq 0 ]] && usage_and_exit 1


function rm_msg()
{
	local FILE="$1"

	local R   RET_CODE

	R="$( rm -r "${FILE}" 2>&1 )"	# -r in case it's a directory
	RET_CODE=$?

	if [[ ${RET_CODE} -eq 0 ]]; then
		echo "Removed '${FILE}'"
	else
		echo "Unable to remove '${FILE}': ${R}" >&2
	fi
	return "${RET_CODE}"
}

RET=0
CMD="${1}"
case "${CMD}" in
	"AM_RM_PRIOR")		# Remove prior version of Allsky
		rm_msg "${PRIOR_ALLSKY_DIR}" 
		RET=$?
		rm -f "${OLD_ALLSKY_REMINDER}"

		"${ALLSKY_SCRIPTS}/addMessage.sh" --id "${CMD}" --delete
		;;

	"AM_RM_CHECK")		# Remove log from checkAllsky.sh
		rm_msg "${CHECK_ALLSKY_LOG}"
		RET=$?

		"${ALLSKY_SCRIPTS}/addMessage.sh" --id "${CMD}" --delete
		;;

	"AM_RM_POST")		# Remove log from checkAllsky.sh
		rm_msg "${POST_INSTALLATION_ACTIONS}"
		RET=$?

		"${ALLSKY_SCRIPTS}/addMessage.sh" --id "${CMD}" --delete
		;;

	"AM_NOT_SUPPORTED")		# Not supported camera
		CT="$2"
		shift
		"${ALLSKY_UTILITIES}/show_supported_cameras.sh" "--${CT}"

		"${ALLSKY_SCRIPTS}/addMessage.sh" --id "${CMD}" --delete
		;;

	AM_*)
		echo "${ME}: ERROR: Unknown error ID: '${CMD}'." >&2
		exit 1
		;;

	*)		# Arbitrary command
		eval "${*}"
		RET=$?
		if [[ ${RET} -eq 0 ]]; then
			echo "Executed ${*}"
		else
			echo "Unable to execute ${*}" >^2
		fi
		;;
esac

exit "${RET}"
