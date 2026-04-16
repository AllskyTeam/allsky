---
tags:
  - Experimental
  - Extra Module
  - Overlay Data
  - Pipeline Night
---

Estimate sky quality from captured images

The estimated is calculated as follows

```python
weighted_sqm_avg = (((night_max_auto_exposure - exposure_us) / 10) + 1) * (sqm_avg * (((night_max_auto_gain - gain) / 10) + 1))
```

Where

**sqm_avg** - The mean value of the image after the mask and ROI have been applied
**night_max_auto_exposure** - The Night time max auto exposure from the main settings
**exposure_us** - The last captured image's exposure time 
**night_max_auto_gain** The night max auto gain from the settings
**gain** - The gain used for the captured image


## Settings

### Main Settings

| Setting | Description |
|--------|-------------|
| Mask Path | The Mask to use when estimatig the sky quality |
| ROI | The are of the image to calulate the sky quality from |
| Fallback | If no ROI specified then use this percentage around the image center |
| Adjustment | Python forumula to apply when calculating the sky quality |

### Debug Settings

| Setting | Description |
|--------|-------------|
| Enable | When on debug mod is enabled and the Debug Image is used rather than the captured image |
| Debug Image | The image to use to test the module |

## Available Variables

| Variable | Description |
|--------|-------------|
| AS_SQM | The estimated sky quality |

## Available in

=== "Pipelines available In"
    
    <div class="grid cards" markdown>

    -   :fontawesome-solid-moon:{ .lg .middle } __Nighttime__

        ---

          - The Night time pipeline

    </div>