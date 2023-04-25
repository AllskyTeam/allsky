# Allsky Camera ![Release](https://img.shields.io/badge/Version-v2023.05.01-green.svg) [![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=MEBU2KN75G2NG&source=url)

This is the source code for the Allsky Camera project described [on Instructables](http://www.instructables.com/id/Wireless-All-Sky-Camera/).
&nbsp;  
<p align="center">
<img src="https://github.com/thomasjacquin/allsky/blob/master/assets/allsky_camera.png" width="50%" title="Example of an allsky camera">
</p>

> **This README and the [Allsky documentation](https://github.com/thomasjacquin/allsky/wiki) will help get your allsky camera up and running.**

&nbsp;  

<!-- =============================================================================== --> 
## Requirements

You will need the following hardware:

 * A camera (Raspberry Pi HQ, Module 3 or compatible, or ZWO ASI)
 * A Raspberry Pi (2, 3, 4 or Zero 2 W).


&nbsp;  
> **NOTES:**
>	- The ZWO ASI120-series cameras are not recommended due to somewhat poor quality. See the [Troubleshooting --> ZWO Cameras](https://github.com/thomasjacquin/allsky/wiki) documentation for notes on the ASI120-series and related T7 / T7C cameras.
>	- The Pi Zero and Pi Zero W, with their limited memory and _very_ limited CPU power (single CPU core), are not recommended.  You will likely not be able to create keograms, startrails, or timelapse videos.
>	- The Pi Zero 2 and Pi Zero 2 W, with their limited memory and somewhat limited CPU power, are not recommended unless cost is a major concern.  Creating keograms, startrails, and timelapse videos may or may not be possible.
>	- We have not found any "Pi-compatible" boards that are actually compatible, so buyer beware.
---


&nbsp;
<!-- =============================================================================== --> 
## Software Installation

PatriotAstro created a great [video](https://www.youtube.com/watch?v=7TGpGz5SeVI) describing the installation steps below.
**We highly suggest viewing it before installing the software.**

Detailed installation instructions can be found in the [Installing / Upgrading --> Allsky](https://github.com/thomasjacquin/allsky/wiki) documentation.

---


&nbsp;
<!-- =============================================================================== --> 
## Web User Interface (WebUI)

<p align="center">
<img src="https://github.com/thomasjacquin/allsky/blob/master/assets/WebUI.png" style="border: 1px solid black">
</p>

The WebUI is now installed as part of Allsky and is used to administer Allsky, and to a lesser extent, your Pi. It can also be used to view the current image as well as all saved images, keograms, startrails, and timelapse videos.

A public page is also available in order to view the current image without having to log into the WebUI and without being able to do any administrative tasks. This can be useful for people who don't have a Allsky Website but still want to share a view of their sky:

```
http://your_raspberry_IP/public.php
```

Make sure this page is publically viewable.
If it is behind a firewall consult the documentation for your network equipment for information on allowing inbound connections.

---

&nbsp;
<!-- =============================================================================== --> 
## Allsky Website

By installling the optional Allsky Website you can display your files on a website on the Pi, on another machine, or on both.

See the [Installation / Upgrading --> Website](https://github.com/thomasjacquin/allsky/wiki) documentation for information on how to install and configure an Allsky Website.

---


&nbsp;
<!-- =============================================================================== --> 
## Post-capture processing

Captured images can be resized, cropped, and stretched, and bad images (i.e., too light or too dark) can be removed automatically.

Allsky supports running "modules" after each picture is taken to change the image (e.g., add an overlay) or perform other tasks (e.g., count the number of stars in the image).  You can determine what modules to run and in what order.  Modules can pass data to other modules, for example, the Start Count Module can pass the star count to the Overlay Module to be added to the overlay.

The Overlay Editor lets you easily specify what text and images you want in your overlay, and place them using drag-and-drop.  Each field can be formatted however you want (font, color, size, position, rotation, etc.).  The only limit is your imagination!!

See the [Explanations / How To -> Overlays](https://github.com/thomasjacquin/allsky/wiki) and [Explanations / How To -> Modules](https://github.com/thomasjacquin/allsky/wiki)  documentation for more information.

---


&nbsp;
<!-- =============================================================================== --> 
## Dark frame subtraction

Dark frame subtraction removes hot pixels from images by taking images at different temperatures with a cover on your camera lens and subtracting those images from nighttime images.

See the [Explanations / How To -> Dark frames](https://github.com/thomasjacquin/allsky/wiki) documentation for more information.

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
<img src="https://github.com/thomasjacquin/allsky/blob/master/assets/Keogram.png" width="75%">
</p>

A **Keogram** is an image giving a quick view of the day's activity.
For each image a central vertical column 1 pixel wide is extracted. All these columns are then stitched together from left to right. This results in a timeline that reads from dawn to the end of nighttime (the image above only shows nighttime data since daytime images were turned off).

See the [Explanations / How To --> Keograms](https://github.com/thomasjacquin/allsky/wiki) documentation.


---


&nbsp;
<!-- =============================================================================== --> 
## Startrails

<p align="center">
<img src="https://github.com/thomasjacquin/allsky/blob/master/assets/Startrails.png" width="50%">
</p>

**Startrails** are generated by stacking all the images from a night on top of each other.
In the image above, Polaris is centered about one-fourth the way from the top.

See the [Explanations / How To --> Startrails](https://github.com/thomasjacquin/allsky/wiki) documentation.
	

---


&nbsp;
<!-- =============================================================================== --> 
## Automatic deletion of old data

You can specify how many days worth of images to keep in order to keep the Raspberry Pi SD card from filling up.  If you have the Allsky Website installed on your Pi, you can specify how many days worth of its imags to keep.


See the **DAYS_TO_KEEP** and **WEB_DAYS_TO_KEEP** settings in the [Settings --> Allsky Website](https://github.com/thomasjacquin/allsky/wiki) documentation.

---



&nbsp;
<!-- =============================================================================== --> 
## Share your sky


If you want your allsky camera added to the [Allsky map](http://www.thomasjacquin.com/allsky-map), see the [Put your camera on Allsky Map](https://github.com/thomasjacquin/allsky/wiki) documentation.

If you know anyone in Greenland or Antartica, send them a camera!!

<p align="center">
<a href="https://www.thomasjacquin.com/allsky-map/" title="Allsky map example - click to see real map">
<img src="https://github.com/thomasjacquin/allsky/blob/master/html/documentation/miscellaneous/allsky-map-with-pins.png">
</a>
</p>

---


&nbsp;
<!-- =============================================================================== --> 
## Release changes

See the
[Allsky Version Change Log](https://github.com/thomasjacquin/allsky/blob/master/html/documentation/changeLog.html)
for a list of changes in this release and all prior releases.

---


&nbsp;
<!-- =============================================================================== --> 
## Donation
If you found this project useful, here's a link to send Thomas a cup of coffee :)

[![](https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=MEBU2KN75G2NG&source=url)
