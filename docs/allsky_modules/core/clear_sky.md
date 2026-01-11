---
tags:
  - Core Module
  - Pipeline Night 
---

## Description

This module attempts to determine if the sky is clear. It does this by counting the number of stars in a specific region of the image. If the count is above a threshold then the sky is considered clear.

Several other modules, star count and meteor count, can use the results of this module. If the sky is not considered clear then these modules will not attempt to run as there would be no point.

## Settings
The following settings are available in the module

| Setting | Description |
|--------|-------------|
| Region of Interest| Selects the area of the image to use for determining if the sky is clear |
| Fallback % | If no region of interets is specified then an are around the center of the image will be used. This determines what percentage of the image, from the center, is used |
| Clear Sky | If the number of stars is above this then the sky is conidered clear |

### The Debug Options
The debug options allow you to fine tune the settings and annotate the main image so see what the algorithms are detecting.

| Setting | Description |
|--------|-------------|
| Annotate stars | will highlight detected stars in the debug image specified |
| Debug Image | When using a debug image the resulting detected image will be saved as this name |

!!! info  "Tip"
 
    When using debug images set the 'Debug Image Name' to a file inside the Allsky web root. This will allow you to browse to the image


## Available in

=== "Pipelines available In"
    
    <div class="grid cards" markdown>

    -   :fontawesome-solid-moon:{ .lg .middle } __Nighttime__

        ---

          - The Night time pipeline

    </div>