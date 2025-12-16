## Choosing a Camera
Your budget will often be the driving factor when picking an allsky camera. The Raspberry Pi HQ (RPi HQ) camera is relatively inexpensive and produces good images but can only be used with a Pi. Many people choose ZWO cameras because they are familiar with them or they have a spare one lying around, and they may use their allsky camera for astrophotography as well.

Some things to consider:

- The RPi HQ is hard to beat unless you plan to also use the camera for astrophotography.

- Stay away from the ZWO ASI120 camera. Although it is inexpensive it often produces a lot of errors and many people complain about its noise and hot pixels so have replaced theirs.

- The choice of mono versus color is a personal one. Mono cameras are usually more sensitive so require shorter exposures or less gain, but many people prefer color for its more "natural" look, especially during the day.

- Higher-resolution sensors (for example the RPi HQ @ 4056x3040 and ASI178MC @ 3096x2080) require more memory to produce timelapses, so you may need to follow [these suggestions](/allsky_guide/troubleshooting/timelapse.html) to get timelapse working.

- For allsky use, an extremely high resolution camera (e.g., higher than the RPi HQ) probably isn't useful since the lens and dome cause some distortion that limits the effective resolution.

- Increasing sensor temperature will always increase noise and hot pixels, sometimes to the point of making the image unusable, so many people put a fan in their allsky enclosure to pull in cooler outside air. This can also increase the life of the camera and Pi.

- Different cameras have different dynamic ranges (the difference between the brightest and darkest parts). Increasing a camera's gain will produce brighter, noisier images with less dynamic range. Consult the camera specs to learn more about the trade-off between gain and dynamic range.

- Some RPi and RPi-compatible cameras support auto focus. That feature sounds great but has some major limitations:

    - You will almost always disable auto focus at night - it takes a long time since the camera has to take several long-exposure images to find the correct focus.

    - The lenses that come with these cameras typically produce at most a 120 degree field of view. Many allsky lenses produce about 180 degrees. A narrower field of view may not matter if you have a lot of trees and/or buildings blocking the view, however.

    - Some people with auto focus lenses focus during the day and may refocus if the temperature changes drastically.

- The "T7C" camera is an OEM version of the ASI120MC-mini. We do not recommend it.