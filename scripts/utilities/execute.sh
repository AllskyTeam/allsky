#!/bin/bash

# Execute the specified command.
# Normally the command is built-in, but allow for an arbitrary command.
# Many commands are referenced in addMessage.sh and the command name
# is one of its IDs, e.g., ${AM_...}.

# Allow this script to be executed manually, which requires several variables to be set.
[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$( dirname "${BASH_ARGV0}" )/../.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/installUpgradeFunctions.sh"	|| exit "${EXIT_ERROR_STOP}"

OK="true"
DO_HELP="false"
while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
		--help)
			DO_HELP="true"
			;;
		-*)
			wE_ "Unknown argument '${ARG}'." >&2
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
	exec 2>&1
	echo
	local USAGE="Usage: ${ME} [--help] command [arguments...]"
	if [[ ${RET} -ne 0 ]]; then
		wE_ "${USAGE}"
	else
		echo "${USAGE}"
	fi
	exit "${RET}"
}

[[ ${DO_HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" || $# -eq 0 ]] && usage_and_exit 1


# Remove a message from the messages DB.
function rm_msg()
{
	local ID="${1}"
	"${ALLSKY_SCRIPTS}/addMessage.sh" --id "${ID}" --delete
}

function rm_object()
{
	local ITEM="${1}"
	local MSG="${2}"

	local R="$( rm -r "${ITEM}" 2>&1 )"	# -r in case it's a directory
	local RET_CODE=$?

	echo "<span style='font-size: 200%'>"
	if [[ ${RET_CODE} -eq 0 ]]; then
		if [[ -n ${MSG} ]]; then
			echo -e "${MSG}"
		else
			echo "Removed '${ITEM}'"
		fi
	else
		wE_ "Unable to remove '${ITEM}': ${R}" >&2
	fi
	echo "</span>"
	return "${RET_CODE}"
}

RET=0
CMD="${1}"
case "${CMD}" in
	"AM_RM_PRIOR")		# Remove prior version of Allsky
		rm_object "${PRIOR_ALLSKY_DIR}" 
		RET=$?
		rm -f "${OLD_ALLSKY_REMINDER}"

		rm_msg "${CMD}"
		;;

	"AM_RM_CHECK")		# Remove log from checkAllsky.sh
		rm_object "${CHECK_ALLSKY_LOG}"
		RET=$?

		rm_msg "${CMD}"
		;;

	"AM_RM_POST")		# Remove log from checkAllsky.sh
		rm_object "${POST_INSTALLATION_ACTIONS}"
		RET=$?

		rm_msg "${CMD}"
		;;

	AM_RM_ABORTS_*)		# Remove the specified "have been aborted" file
		# The "*" is the file name.
		FILE="${CMD/AM_RM_ABORTS_/}"
		rm_object "${ALLSKY_ABORTS_DIR}/${FILE}" "File removed."
		RET=$?

		rm_msg "${CMD}"
		;;

	"AM_NOT_SUPPORTED")		# Not supported camera
		CT="$2"
		shift
		"${ALLSKY_UTILITIES}/showSupportedCameras.sh" "--${CT}"

		rm_msg "${CMD}"
		;;

	"allsky-config")
		shift
		"${ALLSKY_SCRIPTS}/${CMD}" "${@}"
		;;

	AM_*)
		wE_ "${ME}: ERROR: Unknown error ID: '${CMD}'." >&2
		exit 1
		;;

	*)		# Arbitrary command
		eval "${*}"
		RET=$?
		if [[ ${RET} -eq 0 ]]; then
			echo "Executed ${*}"
		else
			wE_ "Unable to execute ${*}" >&2
		fi
		;;
esac

exit "${RET}"
