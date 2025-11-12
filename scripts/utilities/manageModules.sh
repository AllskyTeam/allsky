#!/bin/bash

[[ -z ${ALLSKY_HOME} ]] && export ALLSKY_HOME="$( realpath "$(dirname "${BASH_ARGV0}")/../.." )"
ME="$( basename "${BASH_ARGV0}" )"

#shellcheck source-path=.
source "${ALLSKY_HOME}/variables.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/functions.sh"					|| exit "${EXIT_ERROR_STOP}"
#shellcheck source-path=scripts
source "${ALLSKY_SCRIPTS}/installUpgradeFunctions.sh"	|| exit "${EXIT_ERROR_STOP}"

usage_and_exit()
{
	local RET=${1}
	exec 2>&1
	local USAGE="\n"
	USAGE+="Usage: ${ME} [--help] [--branch] [--setbranch b] [--welcome]"
	if [[ ${RET} -ne 0 ]]; then
		E_ "${USAGE}"
	else
		echo -e "${USAGE}"
	fi
	echo
	echo "Install or uninstall modules."
	echo "See the 'Explanations / How To -> Modules' Documentation page for a"
	echo "description of modules."
	echo
	echo "Arguments:"
	echo "   --help          Display this message and exit."
	echo "   --branch        Prompt for a branch in the ${ALLSKY_GITHUB_ALLSKY_MODULES_REPO} repository."
	echo "   --setbranch b   Use branch 'b' from the ${ALLSKY_GITHUB_ALLSKY_MODULES_REPO} repository."
	echo "   --welcome       Display a dialog box asking to continue."
	echo
	exit "${RET}"
}

OK="true"
DO_HELP="false"
ARGS=""
BRANCH_SPECIFIED="false"
# There are more command-line arguments, but the ones below are most likely to
# be used by a user.
while [[ $# -gt 0 ]]; do
	ARG="${1}"
	case "${ARG,,}" in
		--help)
			DO_HELP="true"
			;;
		--setbranch)
			ARGS+=" ${ARG} ${2}"
			BRANCH_SPECIFIED="true"
			shift
			;;
		--branch)
			ARGS+=" ${ARG}"
			BRANCH_SPECIFIED="true"
			;;
		--welcome)
			ARGS+=" ${ARG}"
			;;
		-*)
			E_ "Unknown argument '${ARG}' ignoring." >&2
			OK="false"
			;;
		*)
			break
			;;
	esac
	shift
done

[[ ${DO_HELP} == "true" ]] && usage_and_exit 0
[[ ${OK} == "false" ]] && usage_and_exit 1

if [[ ${BRANCH_SPECIFIED} == "false" ]]; then
	BRANCH="$( get_branch "" )"
	if [[ ${BRANCH} != "${ALLSKY_GITHUB_MAIN_BRANCH}" ]]; then
		ARGS+=" --setbranch ${BRANCH}"
	fi
fi
# shellcheck disable=SC2068,SC2086
"${ALLSKY_MODULE_INSTALLER}" "${@}" ${ARGS}
