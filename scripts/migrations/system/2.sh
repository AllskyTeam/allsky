#!/bin/bash
# shellcheck disable=SC2034	# "source"d by run_migrations()

# System version 2 (v2026.10.01_01):
#	Allsky's venv also sees the system's Python packages.  On Bookworm, Debian's matplotlib
#	is built for NumPy 1.x but the venv has NumPy 2, so importing it fails, and photutils
#	(star counting) logs a long traceback every time.  Install a current matplotlib into
#	the venv.  "Replace All" gets it from the requirements file; "In Place" needs this.
#	A plain "pip install matplotlib" isn't enough since pip thinks the system's is fine.

function migrate()
{
	local PY="${ALLSKY_PYTHON_VENV}/bin/python3"
	local LOG="${ALLSKY_LOGS}/matplotlib.log"

	[[ -x ${PY} ]] || return 0

	# Nothing to do if matplotlib imports fine, or if there's no matplotlib at all.
	"${PY}" -c "import matplotlib" > /dev/null 2>&1 && return 0
	"${PY}" -c "import importlib.util, sys; sys.exit(importlib.util.find_spec('matplotlib') is None)" \
		> /dev/null 2>&1 || return 0

	display_msg --log progress "Installing a current matplotlib into the Python environment."
	if ! "${PY}" -m pip install --no-warn-script-location "matplotlib>=3.9" > "${LOG}" 2>&1 ; then
		display_msg --log warning "Unable to install matplotlib; see '${LOG}'."
		return 1
	fi
	return 0
}
