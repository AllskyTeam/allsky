## Description

This module counts stars in an image. It utilises a couple of algorithms to acheive this. It makes a 


!!! warning  "Create a mask"
 
    It is essential that you create a mask before attempting to use this module. Failure to mask the image properly will result in a considerable number of false positives

    For details on howto create masks please refer to the [Creating Masks](../../allsky_guide/overlays/interface.md#the-mask-editor) documentation

!!! warning  "The Moon"

    The Moon can play havoc with star detection due to reflections in the dome. During intense moonlit nights the star count will be inaccurate

!!! info  "Tip"
 
    When creating a mask ensure that it removes ALL areas of the image that could trigger false positives. Ideally the masked area should be smaller then the image circle, probably quite a bit smaller to prevent false positives around the horizon.

   

## Settings
The following settings are available in the module

| Setting | Description |
|--------|-------------|
| Use clearsky| If the clearsky module is enabled then this will be used to determine if the star count module shoudl even run |
| Mask Path | The mask to apply to the image |
| Detection Method | Either fast or slow. The Fast detection is a lot faster but less accurate |
| Scale Factor | Amount to scale the image by before detecting stars. Reducing the image size will speed up both detection methods |
| Min Star Size | The minimum size of a star in the image |

### The Debug Options
The debug options allow you to fine tune the settings and annotate the main image so see what the algorithms are detecting.

| Setting | Description |
|--------|-------------|
| Enable Debug Mode | Enables debug mode |
| Annotate Main | If enabled any detected stars will be circled on the captured image |
| Colour | The colour for the circle when annotating the main image |
| Debug Image | The path to a file used to test the algorithms. This path must be on the local pi |
| Debug Image Name | When using a debug image the resulting detected image will be saved as this name |


!!! info  "Tip"
 
    When using debug images set the 'Debug Image Name' to a file inside the Allsky web root. This will allow you to browse to the image

## Available in

=== "Pipelines available In"
    
    <div class="grid cards" markdown>

    -   :fontawesome-solid-moon:{ .lg .middle } __Nighttime__

        ---

          - The Night time pipeline

    </div>