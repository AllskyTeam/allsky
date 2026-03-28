#!/bin/bash

# https://squidfunk.github.io/mkdocs-material/

set -u

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

build_docs() {
    local site_dir="${1:-html/docs}"

    echo "==> Building MkDocs into: $site_dir"

    mkdocs build --clean --site-dir "$site_dir"
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
    if [ ! -f "venv/bin/activate" ]; then
        echo "ERROR: Python virtual environment not found at venv/bin/activate"
        exit 1
    fi

    # MkDocs for local docs development lives in the repo venv.
    # shellcheck disable=SC1091
    source "venv/bin/activate"

    echo "==> Starting MkDocs dev server on 0.0.0.0:8000"
    mkdocs serve --dev-addr=0.0.0.0:8000
}

command="${1:-}"

case "$command" in
    dev)
        run_dev
        ;;
    build)
        build_docs "${2:-html/docs}"
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
