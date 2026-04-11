#!/bin/bash

# https://squidfunk.github.io/mkdocs-material/

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MKDOCS_CONFIG="$SCRIPT_DIR/mkdocs.yml"
VENV_ACTIVATE="$REPO_ROOT/venv/bin/activate"
DEV_REQUIREMENTS="$REPO_ROOT/config_repo/requirements-dev.txt"

usage() {
    cat <<'EOF'
Usage:
  ./allsky_docs.sh dev
  ./allsky_docs.sh build [site_dir]

Commands:
  dev               Run the MkDocs development server on 0.0.0.0:8000
  build [site_dir]  Build docs into site_dir (default: html/docs)
EOF
}

ensure_mkdocs() {
    if command -v mkdocs >/dev/null 2>&1; then
        return 0
    fi

    if [ ! -f "$VENV_ACTIVATE" ]; then
        echo "ERROR: mkdocs is not installed and Python virtual environment was not found at $VENV_ACTIVATE"
        exit 1
    fi

    # MkDocs for local docs development lives in the repo venv.
    # shellcheck disable=SC1091
    source "$VENV_ACTIVATE"

    if command -v mkdocs >/dev/null 2>&1; then
        return 0
    fi

    if [ ! -f "$DEV_REQUIREMENTS" ]; then
        echo "ERROR: mkdocs is not installed and requirements file was not found at $DEV_REQUIREMENTS"
        exit 1
    fi

    echo "==> Installing documentation dependencies from: $DEV_REQUIREMENTS"
    python3 -m pip install -r "$DEV_REQUIREMENTS"
    local ret=$?

    if [ $ret -ne 0 ]; then
        echo "ERROR: failed to install documentation dependencies"
        exit $ret
    fi

    if ! command -v mkdocs >/dev/null 2>&1; then
        echo "ERROR: mkdocs is still unavailable after installing documentation dependencies"
        exit 1
    fi
}

build_docs() {
    local site_dir="${1:-$REPO_ROOT/html/docs}"

    ensure_mkdocs

    echo "==> Building MkDocs into: $site_dir"

    mkdocs build --clean -f "$MKDOCS_CONFIG" --site-dir "$site_dir"
    local ret=$?

    if [ $ret -ne 0 ]; then
        echo "ERROR: mkdocs build failed!"
        exit $ret
    fi

    echo "==> Rewriting asset paths inside: $site_dir"

    find "$site_dir" -type f -name '*.html' -print0 \
      | xargs -0 sed -i 's|"\/assets|"\/docs\/assets|g'

    echo "==> DONE"
    echo "Output written to: $site_dir"
}

run_dev() {
    ensure_mkdocs

    echo "==> Starting MkDocs dev server on 0.0.0.0:8000"
    mkdocs serve -f "$MKDOCS_CONFIG" --dev-addr=0.0.0.0:8000
}

command="${1:-}"

case "$command" in
    dev)
        run_dev
        ;;
    build)
        build_docs "${2:-$REPO_ROOT/html/docs}"
        ;;
    -h|--help|help|"")
        usage
        ;;
    *)
        echo "ERROR: unknown command: $command"
        echo
        usage
        exit 1
        ;;
esac
