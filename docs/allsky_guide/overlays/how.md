## How They Work

!!! info  ""

    The Overlay Editor, which is accessed via the Overlay Editor WebUI page, is used to define what information you want on the captured images and where it should go. Once you have specified that information, you won't use the editor again until you want to change something in the overlay, which typically isn't done very often.
  
    The Overlay Module program is invoked every time an image is captured and places the information you specified in the Overlay Editor onto the image. This module is one of several modules   that can be invoked after every image is captured.

In the Overlay Editor you specify what information you want to go where, and what it should look like. For example, you want the date and time the image was taken to be in blue, 12 point font in the upper left of the image and a compass rotated 20 degrees so it's pointing north in the upper right of the image. You also have a graph of weather information you want on the bottom of the image, but because it will hide some of the image you want it to be partially transparent.


After Allsky captures an image it passes that image as well as information about the image to the Overlay Module, including the time the image was taken, the exposure length, the gain, and a lot more. This information is put into System Variables that can be used per you configuration in the Overlay Editor, which then:


- Replaces the system variables with their values and adds them to the overlay.  
- Replaces any other variables with their values and adds them to the overlay.  
- Adds any images you specified to the overlay.  