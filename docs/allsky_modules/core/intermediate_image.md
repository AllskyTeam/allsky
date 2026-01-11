---
tags:
  - Core Module
  - Pipeline Day  
  - Pipeline Night 
---

## Description

This module allows you to save a copy of the image to a specific location

!!! warning  "Warning"
 
    Currently Allsky does not use these images, they are intended for your scripts. You are responsible for ensuring they are removed when not needed


The position of this module in the pipeline will determined whats saved. So for example if its the very first module then the image will be as captured, if you place it after the mask module it will contain the masked image. This can be useful for saving images before the overlay has been appended to them.

## Settings
The following settings are available in the module

| Setting | Description |
|--------|-------------|
| Image Folder | The location to save the images, see notes below on using variables in the path |

### Using Allsky variables

You can use any Allsky variables when constructing the path, for example

```
${ALLSKY_IMAGES}/${DATE}-clean
```

This will save the images in a folder within the main images directory ```${ALLSKY_IMAGES}``` by date ```${DATE}``` with ```-clean``` appended

## Available in

=== "Pipelines available In"
    
    <div class="grid cards" markdown>

    -   :fontawesome-solid-sun:{ .lg .middle } __Daytime__

        ---

          - The Day time pipeline

    -   :fontawesome-solid-moon:{ .lg .middle } __Nighttime__

        ---

          - The Night time pipeline

    </div>