# Allsky Camera ![Release](https://img.shields.io/badge/Version-v2024.12.06-green.svg) [![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=MEBU2KN75G2NG&source=url)

This is the source code for the Allsky Camera project described [on Instructables](http://www.instructables.com/id/Wireless-All-Sky-Camera/).
&nbsp;  
<p align="center">
<img src="https://github.com/AllskyTeam/allsky/blob/master/assets/allsky_camera.png" width="50%" title="Example of an allsky camera">
</p>


<!-- =============================================================================== --> 
## Requirements

In order to run the Allsky software you need:

 * A Raspberry Pi Zero 2, Pi 2, Pi 3, Pi 4, Pi 5, or Le Potato.
 * A camera:
    * Any ZWO camera sold before October 2024.
    * One of the following Raspberry Pi cameras:
       * RPi HQ (IMX477 sensor)
       * RPi Module 3 (IMX708 sensor)
       * RPi Version 1 (OV5647 sensor; NOT RECOMMENDED: 0.9 second maximum exposure)
       * IMX290 60.00 fps
       * ArduCam 16 MP (IMX519 sensor)
       * ArduCam 64 MP (arducam_64mp sensor)
       * ArduCam 462 (arducam-pivariety sensor)
       * Waveshare imx219-d160 (IMX290 sensor)
       * ArduCam 64 MP Owlsight (OV64a40 sensor)
       * OneInchEye IMX283 (IMX283 sensor)


&nbsp;  
> __NOTES:__
>	- Only the Raspberry Pi OS is supported.  Other operating systems like Ubuntu are NOT supported.  If possible use the newest Bookworm 64-bit release. Bullseye will also work. __Buster support will be dropped in the next major release__.
>	- The ZWO ASI120-series cameras are __not__ recommended due to their tendency to produce errors and poor-quality images.
>	- The Pi Zero with its limited memory and _very_ limited CPU power is not recommended.  You probably won't be able to create keograms, startrails, or timelapse videos.
>	- The Pi Zero 2 with its limited memory and somewhat limited CPU power is not recommended unless cost is the only concern.  Creating keograms, startrails, and timelapse videos may or may not be possible.
>	- The Le Potato is the only "Pi-compatible" board that we've found to actually be compatible, so buyer beware.


&nbsp;
<!-- =============================================================================== --> 
## Software Installation

<!-- HIDE FOR NOW - THE VIDEO IS A COUPLE RELEASES OLD
PatriotAstro created a great [video](https://www.youtube.com/watch?v=7TGpGz5SeVI) describing the installation steps below.
__We recommend viewing it before installing the software__.
-->

See the [detailed installation instructions](https://htmlpreview.github.io/?https://raw.githubusercontent.com/AllskyTeam/allsky/master/html/documentation/installations/Allsky.html).

---


&nbsp;
<!-- =============================================================================== --> 
## Web User Interface (WebUI)

<p align="center">
<img src="https://github.com/AllskyTeam/allsky/blob/master/html/documentation/settings/AllskySettingsPage.png" width="90%">
</p>

The WebUI is used to administer Allsky, and to a lesser extent, your Pi. It can also be used to view the current image as well as all saved images, keograms, startrails, and timelapse videos.

A public page is also available in order to view the current image without having to log into the WebUI and without being able to do any administrative tasks. This can be useful for people who don't use an Allsky Website but still want to share a view of their sky:

```
http://your_raspberry_IP/public.php
```

Make sure this page is publically viewable.
If it is behind a firewall consult the documentation for your network equipment for information on allowing inbound connections.

The WebUI has a link to the Allsky Documentation which describes all the settings Allsky uses as well as troubleshooting information.
It should be used before requesting support on GitHub.

---

&nbsp;
<!-- =============================================================================== --> 
## Allsky Website and remote server

The local Allsky Website (i.e., on the Pi) is installed with Allsky but must be enabled in the WebUI in order to use it.
You can also install the Allsky Website on a remote server so it can be viewable via the Internet.

See [Installation / Upgrading --> Website](https://htmlpreview.github.io/?https://raw.githubusercontent.com/AllskyTeam/allsky/master/html/documentation/installations/AllskyWebsite.html) for information on how to install and configure an Allsky Website.

Allsky images, keograms, startrails, and timelapse videos can optionally be uploaded to a remote server __not__ running an Allsky Website.  This is useful if you have a personal website and want to include the most recent Allsky images.

---


&nbsp;
<!-- =============================================================================== --> 
## Post-capture processing

Captured images can be resized, cropped, and stretched, and bad images (i.e., too light or too dark) can be removed automatically.

Allsky supports running "modules" after each picture is taken to change the image (e.g., add an overlay) or perform other tasks (e.g., count the number of stars in the image).  You can determine what modules to run and in what order.  Modules can pass data to other modules, for example, the Start Count Module can pass the star count to the Overlay Module to be added to the overlay.

The Overlay Editor lets you easily specify what text and images you want in your overlay, and place them using drag-and-drop.  Each field can be formatted however you want (font, color, size, position, rotation, etc.).  The only limit is your imagination!!

See [Explanations / How To -> Overlays](https://htmlpreview.github.io/?https://raw.githubusercontent.com/AllskyTeam/allsky/master/html/documentation/overlays/overlays.html) and [Explanations / How To -> Modules](https://htmlpreview.github.io/?https://raw.githubusercontent.com/AllskyTeam/allsky/master/html/documentation/modules/modules.html) for more information.

---


&nbsp;
<!-- =============================================================================== --> 
## Dark frame subtraction

Dark frame subtraction removes white (i.e., "hot") pixels from images by taking images with a cover over the camera lens and subtracting those images from images.

See [Explanations / How To -> Dark frames](https://htmlpreview.github.io/?https://raw.githubusercontent.com/AllskyTeam/allsky/master/html/documentation/explanations/darkFrames.html) for more information.

---


&nbsp;
<!-- =============================================================================== --> 
## Timelapse and mini timelapse

By default, a timelapse video is generated at the end of nighttime from all of the images captured in the last 24 hours.

"Mini" timelapse videos can also be created every few images, and contain the last several images.  They are useful to see what the sky was recently like.

---


&nbsp;
<!-- =============================================================================== --> 
## Keograms

<p align="center">
<img src="https://github.com/AllskyTeam/allsky/blob/master/assets/Keogram.png" width="75%">
</p>

A __Keogram__ is an image giving a quick view of the day's activity.
For each image a central vertical column 1 pixel wide is extracted. All these columns are then stitched together from left to right. This results in a timeline that reads from dawn to the end of nighttime (the image above only shows nighttime data since daytime images were turned off).

See [Explanations / How To --> Keograms](https://htmlpreview.github.io/?https://raw.githubusercontent.com/AllskyTeam/allsky/master/html/documentation/explanations/keograms.html).


---


&nbsp;
<!-- =============================================================================== --> 
## Startrails

<p align="center">
<img src="https://github.com/AllskyTeam/allsky/blob/master/assets/Startrails.png" width="50%">
</p>

__Startrails__ are generated by stacking all the images from a night on top of each other.
In the image above, Polaris is centered about one-fourth the way from the top.

See [Explanations / How To --> Startrails](https://htmlpreview.github.io/?https://raw.githubusercontent.com/AllskyTeam/allsky/master/html/documentation/explanations/startrails.html).
	

---


&nbsp;
<!-- =============================================================================== --> 
## Automatic deletion of old data

You can specify how many days worth of images to keep in order to keep the Raspberry Pi SD card from filling up.  If you are using the Allsky Website on your Pi, you can specify how many days worth of its imags to keep.


See the __Days to Keep on Pi Website__ and __Web Days To Keep on Remote Website__ settings in [Settings --> Allsky](https://htmlpreview.github.io/?https://raw.githubusercontent.com/AllskyTeam/allsky/master/html/documentation/settings/allsky.html).

---



&nbsp;
<!-- =============================================================================== --> 
## Share your sky


If you want your allsky camera added to the [Allsky map](http://www.thomasjacquin.com/allsky-map), see [Put your camera on Allsky Map](https://htmlpreview.github.io/?https://raw.githubusercontent.com/AllskyTeam/allsky/master/html/documentation/miscellaneous/AllskyMap.html).

If you know anyone in Greenland or Antartica, send them a camera!!

<p align="center">
<a href="https://www.thomasjacquin.com/allsky-map/" title="Allsky map example - click to see real map">
<img src="https://github.com/AllskyTeam/allsky/blob/master/html/documentation/miscellaneous/allsky-map-with-pins.png">
</a>
</p>

---


&nbsp;
<!-- =============================================================================== --> 
## Release changes

See the
[Allsky Version Change Log](https://htmlpreview.github.io/?https://raw.githubusercontent.com/AllskyTeam/allsky/master/html/documentation/changeLog.html)
for a list of changes in this release and all prior releases.

---


&nbsp;
<!-- =============================================================================== --> 
## Donation
If you found this project useful, here's a link to send Thomas a cup of coffee :)

[![](https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=MEBU2KN75G2NG&source=url)
