#!/bin/bash

mkdocs build --clean

find html/docs -name '*.html' -print0 | xargs -0 sed -i 's|\"/assets|\"/docs/assets|g'
