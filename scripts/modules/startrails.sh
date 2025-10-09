#!/bin/bash

DATE="20250922"

# Activate the virtual environment
source /home/pi/allsky/venv/bin/activate

# Get in the right directory
cd /home/pi/allsky/scripts/modules/

# Run startrails with demo values
python -u startrails.py \
    --log-level 3  \
    --parallel 1 \
    --max-brightness 0.1 \
    --output /home/pi/allsky/tmp/current_images/"${DATE}".jpg \
    --fps 10 --video /home/pi/allsky/tmp/current_images/"${DATE}".mp4 \
    --postprocess gamma --gamma 0.9  \
    --smooth-trails \
    --label "Allsky 2025-09-23" --label-color "#FFEE88" --label-bg "#000000" \
    --final-mask /home/pi/allsky/config/overlay/images/mask676c.png \
    /home/pi/allsky/images/"${DATE}"