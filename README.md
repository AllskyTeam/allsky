# Allsky Camera ![Release 0.8.3.3](https://img.shields.io/badge/Release-0.8.3.3-green.svg) [![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=MEBU2KN75G2NG&source=url)

**This README and our [Wiki pages](https://github.com/thomasjacquin/allsky/wiki) will help get your Allsky camera up and running.  Please review them _before_ submitting an Issue.**

This is the source code for the Allsky Camera project described [on Instructables](http://www.instructables.com/id/Wireless-All-Sky-Camera/).

&nbsp;
> **NOTE**: When upgrading from a release **prior to** 0.8.3 you **MUST** follow the steps [here](https://github.com/thomasjacquin/allsky/wiki/Upgrade-from-0.8.2-or-prior-versions).

&nbsp;  
&nbsp;
![](http://www.thomasjacquin.com/allsky-portal/screenshots/camera-header-photo.jpg)


&nbsp;
<!------------------------------------------------------------------------------------------->
### Requirements
<details><summary>Click here</summary>

&nbsp;  
In order to get the camera working properly you will need the following hardware:

 * A camera (Raspberry Pi HQ or ZWO ASI)
 * A Raspberry Pi (2, 3, 4 or Zero)

**NOTE:** Owners of USB2.0 cameras such as ASI120MC and ASI120MM may need to do a [firmware upgrade](https://astronomy-imaging-camera.com/software-drivers). This changes the camera to use 512 byte packets instead of 1024 which makes it more compatible with most hardware.

**NOTE:** The T7 / T7C cameras, e.g., from Datyson or other sellers, are not officially supported but persistent users may get them to work by following [these instructions](https://github.com/thomasjacquin/allsky/wiki/Troubleshoot:-T7-Cameras).

***
</details>


&nbsp;
<!------------------------------------------------------------------------------------------->
### Software Installation - 1st time only
<details><summary>Click here</summary>

&nbsp;  
PatriotAstro created a great [video](https://www.youtube.com/watch?v=7TGpGz5SeVI) describing the installation steps below.
**We highly suggest viewing it before installing the software.**

You will need to install the Raspberry Pi Operating System on your Raspberry Pi. Follow [this link](https://www.raspberrypi.org/documentation/installation/installing-images/) for information on how to do it.

Make sure you have a working Internet connection by setting it through [the terminal window](https://www.raspberrypi.org/documentation/configuration/wireless/wireless-cli.md).

1. Start by installing git if not already there.  Open the terminal window (or SSH into your Pi) and type the following:
    ```shell
    sudo apt-get install git
    ```

2. Now fetch the code from this GitHub page:
    ```shell
    cd
    git clone --recursive https://github.com/thomasjacquin/allsky.git
    ```

3. Then navigate to the new allsky directory and run the installation script:
    ```shell
    cd allsky
    ./install.sh  # PatriotAstro's video shows using "sudo"; that is no longer needed
    ```

Some users have reported ASI_ERROR_TIMEOUT errors with their ZWO cameras.  Click [here](https://github.com/thomasjacquin/allsky/wiki/Troubleshoot:-ASI_ERROR_TIMEOUTs) to troubleshoot.

There are many configuration variables that need to be set.  Please see the [allsky Settings](https://github.com/thomasjacquin/allsky/wiki/allsky-Settings) page for a list of them.

***
</details>


&nbsp;
<!------------------------------------------------------------------------------------------->
### Usage
<details><summary>Click here</summary>

### Autostart

The AllSky software should start automatically when the Raspberry Pi boots up. To enable or disable this behavior, use these commands:

```
sudo systemctl enable allsky.service     # starts the software when the Pi boots up
sudo systemctl disable allsky.service    # does NOT automatically start the software
```

When you want to start, stop, or restart the software, or obtain status, use one of the following commands:
```shell
sudo systemctl start allsky
sudo systemctl stop allsky
sudo systemctl restart allsky
sudo systemctl status allsky
```
> Tip: Add lines like the following to `~/.bashrc` to save typing:
```shell
alias start='sudo systemctl start allsky'
```
You will then only need to type `start` to start the software.

### Manual Start
Starting the program from the terminal can be a great way to track down issues as it provides debug information.
To start the program manually, run:
```
sudo systemctl stop allsky
cd ~/allsky
./allsky.sh
```

If you are using a desktop environment (Pixel, Mate, LXDE, etc) or using remote desktop or VNC, you can add the `preview` argument to show the images the program is currently saving in a separate window.
```
./allsky.sh preview
```

***
</details>


&nbsp;
<!------------------------------------------------------------------------------------------->
### Updating the software
<details><summary>Click here</summary>

&nbsp;  
See this [Wiki page](https://github.com/thomasjacquin/allsky/wiki/How-to-update-the-software) for instructions on how to update the AllSky software.

**NOTE:** Version 0.8 added many new settings and changed the name of several existing settings.  For example, there are now separate brightness levels for daytime and nighttime, called "daybrightness" and "nightbrightness".  Version 0.7 only had "brightness" that applied to both day and nighttime. It's very important that you save a copy of your current settings prior to upgrading to version 0.8 so you can restore them properly.
The WebUI from the `allsky-portal` package uses these new settings so it's also important to update AllSky **prior to** updating the WebUI.

Also note that in version 0.8.3 the default image file created and uploaded is called **image.jpg**.  The prior "image-resize.jpg" and "liveview-image.jpg" are no longer created. Keep that in mind if you copy the image to a remote web server - it will need to know about the new name.

***
</details>


&nbsp;
<!------------------------------------------------------------------------------------------->
### Web User Interface (WebUI) - `allsky-portal` package
<details><summary>Click here</summary>

&nbsp;  
![](http://www.thomasjacquin.com/allsky-portal/screenshots/camera-settings.jpg)

If you don't want to configure the camera using the terminal, you can install the [WebUI](https://github.com/thomasjacquin/allsky-portal).
Note that this will:
* change your hostname to **allsky** (or whatever you called it when installing)
* install the lighttpd web server
* replace your `/var/www/html` directory
* move the `allsky/config/settings_*.json` configuration files to `/etc/raspap`

Using the WebUI is **highly** recommended as it provides additional information on each setting and allows error checking behind the scenes.  The Wiki and other documentation assume you have WebUI installed.  To install it:

```shell
sudo gui/install.sh
```

After you complete the WebUI setup, you'll be able to administer the camera using the WebUI by navigating to
```
http://your_raspberry_IP_address
    OR
http://allsky.local
```

Note: If you changed the name of your Pi (to 'piname', for example) during the WebUI installation then use this:
```
http://piname.local
```

The default username is **admin** and the default password is **secret**.  If this website is publically viewable you should change those settings.

A public page is also available in order to view the current image without having to log into the portal and without being able to do any administrative tasks. This can be useful for people who don't have a personal website but still want to share a view of their sky:

```
http://your_raspberry_IP/public.php
```

Make sure this page is publically viewable.
If it is behind a firewall consult the documentation for your network equipment for information on allowing inbound connections.

***
</details>


&nbsp;
<!------------------------------------------------------------------------------------------->
### Allsky Website - `allsky-website` package
<details><summary>Click here</summary>

&nbsp;  
You can display your files on a website, either on the Pi itself or on another machine.

### On the Pi
If you want to host the website on your Raspberry Pi, run the following command. Note that this requires first installing the WebUI.

```shell
cd ~/allsky
website/install.sh
```

And set these variables in `allsky/config/ftp-settings.sh`:
```shell
PROTOCOL='local'
IMAGE_DIR='/var/www/html/allsky/'
VIDEOS_DIR='/var/www/html/allsky/videos'
KEOGRAM_DIR='/var/www/html/allsky/keograms'
STARTRAILS_DIR='/var/www/html/allsky/startrails'
```

### On a different machine
If you want to host the website on a _different_ machine, like in this [example](http://www.thomasjacquin.com/allsky), download the source files from this repository: [https://github.com/thomasjacquin/allsky-website.git](https://github.com/thomasjacquin/allsky-website.git).

### Website settings
Once you've installed the website, either on your Pi or another machine, look at the descriptions of the settings on the [allsky-website Settings page](https://github.com/thomasjacquin/allsky/wiki/allsky-website-Settings).

***
</details>


&nbsp;
<!------------------------------------------------------------------------------------------->
### Dark frame subtraction
<details><summary>Click here</summary>

&nbsp;  
The dark frame subtraction feature removes hot pixels from night sky images. The concept is the following: Take an image with a cover on your camera lens and let the software subtract that image later from all images taken throughout the night.

See [this Wiki page](https://github.com/thomasjacquin/allsky/wiki/Dark-Frames-Explained) on dark frames for instructions on how to use them.

***
</details>


&nbsp;
<!------------------------------------------------------------------------------------------->
### Timelapse
<details><summary>Click here</summary>

&nbsp;  
By default, a timelapse video is generated at the end of nighttime from all of the images captured in the last 24 hours.

To disable timelapse, open `allsky/config/config.sh` and set

```shell
TIMELAPSE="false"
```

To generate a timelapse video manually:

```shell
cd ~/allsky
scripts/generateForDay.sh -t 20220710
```

**Note:** If you are unable to create a timelapse, see [this Wiki page](https://github.com/thomasjacquin/allsky/wiki/Troubleshooting:-timelapse).

***
</details>


&nbsp;
<!------------------------------------------------------------------------------------------->
### Keograms
<details><summary>Click here</summary>

&nbsp;  
![](http://www.thomasjacquin.com/allsky-portal/screenshots/keogram-annotated.jpg)

A **Keogram** is an image giving a quick view of the day's activity. It was originally invented to study the aurora borealis.
For each image a central vertical column 1 pixel wide is extracted. All these columns are then stitched together from left to right. This results in a timeline that reads from dawn to the end of nighttime (the image above only shows nighttime data since daytime images were turned off).

See the [Keogram Wiki page](https://github.com/thomasjacquin/allsky/wiki/Keograms-explained) for more details.
	
To generate a keogram image manually:
```shell
cd ~/allsky
scripts/generateForDay.sh -k 20220710
```

***
</details>


&nbsp;
<!------------------------------------------------------------------------------------------->
### Startrails
<details><summary>Click here</summary>

&nbsp;  
![](http://www.thomasjacquin.com/allsky-portal/screenshots/startrail.jpg)

**Startrails** are generated by stacking all the images from a night on top of each other.

See the [Startrails Wiki page](https://github.com/thomasjacquin/allsky/wiki/Startrails-Explained) for more details.
	
To generate a startrails image manually:
```shell
cd ~/allsky
scripts/generateForDay.sh -s 20220710
```

***
</details>


&nbsp;
<!------------------------------------------------------------------------------------------->
### Automatic deletion of old data
<details><summary>Click here</summary>

&nbsp;  
You can specify how many days worth of images to keep in order to keep the Raspberry Pi SD card from filling up. To change the default number of days, change the number below in `allsky/config/config.sh`:
```
DAYS_TO_KEEP=14
```
	
If you have the Allsky website installed on your Pi, you can specify how many days worth of its imags to keep:
```
WEB_DAYS_TO_KEEP=28
```
In both cases, set to "" to keep all days' data but be careful that your SD card doesn't fill up.

***
</details>


&nbsp;
<!------------------------------------------------------------------------------------------->
### Logging information
<details><summary>Click here</summary>

&nbsp;  
When using Allsky, information is written to a log file. In case the program stopped, crashed, or behaved in an abnormal way, take a look at:
```
tail /var/log/allsky.log
```
	
There are other temporary log files in `allsky/tmp` that are used for debugging.

***
</details>


&nbsp;
<!------------------------------------------------------------------------------------------->
### Information for advanced users
<details><summary>Click here</summary>

&nbsp;  
Experienced users may want to add some additional processing steps at the end of nighttime.
To do so:
```shell
cd ~/allsky/scripts
mv endOfNight_additionalSteps.repo  endOfNight_additionalSteps.sh
```
and then add your additional processing steps which
will be run after the usual end-of-night processing, but before the deletion of any old image files.

After you rename the file above, you can edit the file via the "Editor" link on the left side of the WebUI page.

***
</details>


&nbsp;
<!------------------------------------------------------------------------------------------->
### Share your sky

If you want your allsky camera added to the [Allsky map](http://www.thomasjacquin.com/allsky-map), see [these settings](https://github.com/thomasjacquin/allsky/wiki/allsky-Settings/_edit#map-settings).

[![Global allsky map](http://www.thomasjacquin.com/allsky-map/screenshots/allsky-map-with-pins.jpg "Global allsky map example - click to see real map")](https://www.thomasjacquin.com/allsky-map/)


<!------------------------------------------------------------------------------------------->
### Release notes
<!--
* version **0.1**: Initial release
* version **0.2**: Separated camera settings from code logic
* version **0.3**: Added dark frame subtraction
* version **0.4**: Added Keograms (summary of the night in one image)
* version **0.5**: Added Startrails (image stacking) with brightness control
	* Keograms and Startrails generation is now much faster thanks to a rewrite by Jarno Paananen.
* version **0.6**: Added daytime exposure and auto-exposure capability
	* Added -maxexposure, -autoexposure, -maxgain, -autogain options. Note that using autoexposure and autogain at the same time may produce unexpected results (black frames).
	* Autostart is now based on systemd and should work on all raspbian based systems, including headless distributions. Remote controlling will not start multiple instances of the software.
	* Replaced `nodisplay` option with `preview` argument. No preview in autostart mode.
	* When using the WebUI, camera options can be saved without rebooting the RPi.
	* Added a publicly accessible preview to the WebUI: public.php
	* Changed exposure unit to milliseconds instead of microseconds
* version **0.7**:
	* Added Raspberry Pi camera HQ support (Based on Rob Musquetier's fork)
	* Support for x86 architecture (Ubuntu, etc)
	* Temperature dependant dark frame library
	* Browser based script editor
	* Configuration variables to crop black area around image
	* Timelapse frame rate setting
	* Changed font size default value
-->
* version **0.8**:
	* Workaround for ZWO daytime autoexposure bug.
	* Improved exposure transitions between day and night so there's not such a huge change in brightness.
	* Decrease in ZWO sensor temperature.
	* Lots of new settings, including splitting some settings into day and night versions.
	* Error checking and associated log messages added in many places to aid in debugging.
	* Ability to have "notification" images displayed, such as "Allsky is starting up" and "Taking dark frames".
	* Ability to resize uploaded images.
	* Ability to set thumbnail size.
	* Ability to delete bad images (corrupt and too light/dark).
	* Ability to set an image file name prefix.
	* Ability to reset USB bus if ZWO camera isn't found (requires "uhubctl" command to be installed).
	* Ability to specify the format of the time displayed on images.
	* Ability to have the temperature displayed in Celcius, Fahrenheit, or both.
	* Ability to set bitrate on timelapse video.
* version **0.8.1**:
	* Rearranged the directory structure.
	* Created a Wiki with additional documentation and troubleshooting tips.
	* Renamed several variables in `config.sh` and `ftp-settings.sh`.
	* CAMERA type of "auto" is no longer supported - you must specify "ZWO" or "RPiHQ".
	* Startrails and keograms are now created using all CPUs on the Pi, drastically speeding up creation time.
	* Installing the WebUI now preserves any website files (keograms, startrails, etc.) you have.  This allows for non-destructive updates of the WebUI.
	* New script called `upload.sh` centralizes all the upload code from other scripts, and can be used to debug uploading issues.  See [this Wiki page](https://github.com/thomasjacquin/allsky/wiki/Troubleshooting:-uploads) for more information.
	* The RPiHQ camera does much better auto-exposure if you set the `-mode-mean` and `-autoexposure` options.
	* The WebUI will now show the Pi's throttle and low-voltage states, which is useful for debugging.
	* Darks work better.
	* Many bug fixes, error checks, and warnings added.
* version **0.8.3**: 
	* Works on Bullseye operating system.
	* RPiHQ version:
	  * Has an improved auto-exposure algorithm.  To use it, set `CAPTURE_EXTRA_PARAMETERS="-daymean 0.5 -nightmean 0.2"` in config.sh (a future version will allow this to be set via the WebUI).
	  * Has many new settings including support for most of the text overlay features that are supported by the ZWO version.  The "extra text" feature will be supported in a future version.
	* New and changed config.sh variables, see the [Software Settings](https://github.com/thomasjacquin/allsky/wiki/allsky-Settings) Wiki page for more information:
	  * `IMG_UPLOAD_FREQUENCY`: how often the image should be uploaded to a website.  Useful with slow uplinks or metered Internet connections.
	  * `IMG_CREATE_THUMBNAILS`: specifies whether or not thumbnails should be created for each image.
	  * `REMOVE_BAD_IMAGES` now defaults to "true" since bad-image detection is now done after a picture is saved rather than once for all pictures at the end of the night.  This helps decrease problems when creating startrails, keograms, and timelapse videos.
	  * `IMG_PREFIX`: no longer used - the name of the image used by the websites is now whatever you specify in the WebUI (default: image.jpg).
	  * **NOTE**: When upgrading to 0.8.3 you MUST follow the steps listed [here](https://github.com/thomasjacquin/allsky/wiki/Upgrade-from-0.8.2-or-prior-versions).
	* Replaced `saveImageDay.sh` and `saveImageNight.sh` with `saveImage.sh` that has improved functionality, including passing the sensor temperature to the dark subtraction commands, thereby eliminating the need for the "temperature.txt" file.
	* The image used by the websites (default: image.jpg) as well as all temporary files are now written to `allsky/tmp`.  **NOTE**: if you are using the Allsky Website you will need to change the "imageName" variable in `/var/www/html/allsky/config.js` to `"/current/tmp/image.jpg"`.
	* You can **significanly** reduce wear on your SD card by making `allsky/tmp` a [memory-based filesystem](https://github.com/thomasjacquin/allsky/wiki/Miscellaneous-Tips).

* version **0.8.3.3**: 
	* Added ability to have your allsky camera added to the [Allsky map](http://www.thomasjacquin.com/allsky-map) by configuring [these settings](https://github.com/thomasjacquin/allsky/wiki/allsky-Settings/_edit#map-settings).  Added `Allsky Map Setup` section to the WebUI to configure the map settings.  The "Lens" field now shows in the popout on the Allsky website (if installed).
	* Significantly enhanced Wiki - more pages and more information on existing pages.  All known issues are described there as well as fixes / workarounds.
	* Added an option to keograms to make them full width, even if few images were used in creating the keogram.  In config.sh, set `KEOGRAM_EXTRA_PARAMETERS="--image-expand"`.
	* Added/changed/deleted settings (in config/config.sh unless otherwise noted):
	  * Added `WEBUI_DATA_FILES`: contains the name of one or more files that contain information to be added to the WebUI's "System" page.  See [this Wiki page](https://github.com/thomasjacquin/allsky/wiki/WEBUI_DATA_FILES) for more information.
	  * Renamed `NIGHTS_TO_KEEP` to `DAYS_TO_KEEP` since it determines how many days of data to keep, not just nighttime data.  If blank (""), ALL days' data are kept.
	  * Deleted `AUTO_DELETE`: its functionality is now in `DAYS_TO_KEEP`.  `DAYS_TO_KEEP=""` is similar to the old `AUTO_DELETE=false`.
	  * Added `WEB_DAYS_TO_KEEP`: specifies how many days of Allsky website images and videos to keep, if the website is installed on your Pi.
	  * Added `WEB_IMAGE_DIR` in config/ftp-settings.sh to allow the images to be copied to a location on your Pi (usually the Allsky website) as well as being copied to a remote machine.  This functionality already existed with timelapse, startrails, and keogram files.
	* The RPiHQ camera now supports all the text overlay features as the ZWO camera, including the "Extra Text" file.
	* Removed the harmless `deprecated pixel format used` message from the timelapse log file.  That message only confused people.
	* Improved the auto-exposure for RPiHQ cameras.
	* Made numerous changes to the ZWO and RPiHQ camera's code that will make it easier to maintain and add new features in the future.
	* If Allsky is stopped or restarted while a file is being uploaded to a remote server, the upload continues, eliminating cases where a temporary file would be left on the server.
	* Decreased other cases where temporary files would be left on remote servers during uploads.  Also, uploads now perform additional error checking to help in debugging.
	* Only one upload can now be done at a time.  Any additional uploads display a message in the log file and then exit. This should eliminate (or signifiantly decrease) cases where a file is overwritten or not found, resulting in an error message or a temporary file left on the server.
	* Added a `--debug` option to `allsky/scripts/upload.sh` to aid in debugging uploads.
	* Upload log files are only created if there was an error; this saves writes to SD cards.
	* The `removeBadImages.sh` script also only creates a log file if there was an error, which saves one write to the SD card _for every image_.
	* Allsky now stops with an error message on unrecoverable errors (e.g., no camera found).  It used to keep restarting and failing forever.
	* More meaningful messages are displayed as images.  For example, in most cases `ERROR.  See /var/log/allsky.log` messages have been replaced with messages containing additional information, for example, `*** ERROR ***  Allsky Stopped!  ZWO camera not found!`.
	* If Allsky is restarted, a new "Allsky software is restarting" message is displayed, instead of a "stopping" followed by "starting" message.
	* The timelapse debug output no longer includes one line for each of several thousand images proced.  This make it easier to see any actual errors.
	* The "Camera Settings" page of the WebUI now displays the minimum, maximum, and default values in a popup for numerical fields.
	* Startrails and Keogram creation no longer crash if invalid files are found.
	* Removed the `allsky/scripts/filename.sh` file.
	* The RPiHQ `Gamma` value in the WebUI was renamed to `Saturation`, which is what it always adjusted; `Gamma` was incorrect.
	* Known issues:
	  * The startrails and keogram programs don't work well if you bin differently during the day and night.  If you don't save daytime images this won't be a problem.
	  * The minimum, maximum, and default values in the "Camera Settings" page of the WebUI, especially for the RPiHQ camera, aren't always correct.  This is especially try if running on the Bullseye operating system, where many of the settings changed.


***

<!------------------------------------------------------------------------------------------->
### Donation
If you found this project useful, here's a link to send me a cup of coffee :)

[![](https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=MEBU2KN75G2NG&source=url)
