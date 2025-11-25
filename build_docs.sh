#!/bin/bash

# Usage:
#   ./build-docs.sh                → builds into html/docs
#   ./build-docs.sh html/manual    → builds into html/manual
#   ./build-docs.sh /var/www/docs  → builds into that directory

# --------------------------------------------
# 1. Determine site_dir from argument or default
# --------------------------------------------
SITE_DIR="${1:-html/docs}"

echo "==> Building MkDocs into: $SITE_DIR"

# --------------------------------------------
# 2. Build MkDocs with the provided output path
# --------------------------------------------
mkdocs build --clean --site-dir "$SITE_DIR"
RET=$?

if [ $RET -ne 0 ]; then
    echo "ERROR: mkdocs build failed!"
    exit $RET
fi

# --------------------------------------------
# 3. Fix paths inside generated HTML
# --------------------------------------------
echo "==> Rewriting asset paths inside: $SITE_DIR"

find "$SITE_DIR" -type f -name '*.html' -print0 \
  | xargs -0 sed -i 's|"\/assets|"\/docs\/assets|g'

echo "==> DONE"
echo "Output written to: $SITE_DIR"