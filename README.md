# Allsky Camera ![Release 0.8.3](https://img.shields.io/badge/Release-0.8.3-green.svg) [![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=MEBU2KN75G2NG&source=url)

This is the source code for the Allsky Camera project described [on Instructables](http://www.instructables.com/id/Wireless-All-Sky-Camera/).

## Required Action Needed
When upgrading from a release _prior to_ 0.8.3 you **MUST** follow the steps [here](https://github.com/thomasjacquin/allsky/wiki/Upgrade-from-0.8.2-or-prior-versions).



![](http://www.thomasjacquin.com/allsky-portal/screenshots/camera-header-photo.jpg)


## Requirements

In order to get the camera working properly you will need the following hardware:

 * A camera (Raspberry Pi HQ or ZWO ASI)
 * A Raspberry Pi (2, 3, 4 or Zero)

**NOTE:** Owners of USB2.0 cameras such as ASI120MC and ASI120MM may need to do a [firmware upgrade](https://astronomy-imaging-camera.com/software-drivers). This changes the camera to use 512 byte packets instead of 1024 which makes it more compatible with most hardware.

**NOTE:** The T7 / T7C cameras, e.g., from Datyson or other sellers, are not officially supported but persistent users may get them to work by following [these instructions](https://github.com/thomasjacquin/allsky/wiki/Troubleshoot:-T7-Cameras).


## Software Installation

PatriotAstro created a [video](https://www.youtube.com/watch?v=j9xHsST2EeY) describing the installation steps below. Feel free to check it out.
Another [video](https://www.youtube.com/watch?v=y6EFfLo4XxE) covers the installation on a Raspberry Pi zero with both ZWO and RPiHQ cameras.

You will need to install the Raspbian Operating System on your Raspberry Pi. Follow [this link](https://www.raspberrypi.org/documentation/installation/installing-images/) for information on how to do it.

Make sure you have a working internet connection by setting it through [the terminal](https://www.raspberrypi.org/documentation/configuration/wireless/wireless-cli.md).

1. Start by installing git if not already there.  Open the terminal and type the following:
    ```shell
    sudo apt-get install git
    ```

2. Now fetch the code from this GitHub page:
    ```shell
    git clone --recursive https://github.com/thomasjacquin/allsky.git
    ```

3. Then navigate to the allsky directory:
    ```shell
    cd allsky
    ```

4. Now, run the install script:
    ```shell
    ./install.sh  # PatriotAstro's video shows using "sudo"; that is no longer needed
    ```

**NOTE:** Version 0.8 added many new settings and changed the name of several existing settings.  For example, there are now separate brightness levels for daytime and nighttime, called "daybrightness" and "nightbrightness".  Version 0.7 only had "brightness" that applied to both day and nighttime.  It's very important that you save a copy of your current settings prior to upgrading to version 0.8 so you can restore them properly.
The WebUI from the `allsky-portal` package uses these new settings so it's also important to update AllSky **prior to** updating the WebUI.

Also note that in version 0.8, the default image file created and uploaded is called either "image.jpg" or "liveview-image.jpg", depending on how you set things up.  The prior "image-resize.jpg" is no longer created. Keep that in mind if you copy the image to a remote web server - it will need to know about the new name.

Some users have reported ASI_ERROR_TIMEOUT errors with their ZWO cameras in verion 0.8.  Click [here](https://github.com/thomasjacquin/allsky/wiki/Troubleshoot:-ASI_ERROR_TIMEOUTs) to troubleshoot.

## Configuration

There are many configuration variables that need to be set as well as many optional ones.  Please see the [allsky Settings](https://github.com/thomasjacquin/allsky/wiki/allsky-Settings) page for a list of them.


## Usage

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

### Manual Start
Starting the program from the terminal can be a great way to track down issues as it provides debug information.
To start the program manually, make sure the service is stopped (see above), then run:
```
cd allsky
./allsky.sh
```

If you are using a desktop environment (Pixel, Mate, LXDE, etc) or using remote desktop or VNC, you can add the `preview` argument in order to show the images the program is currently saving.
```
./allsky.sh preview
```

## Updating the software

See this [Wiki page](https://github.com/thomasjacquin/allsky/wiki/How-to-update-the-software) for instructions on how to update the AllSky software.

## Web User Interface (WebUI)

![](http://www.thomasjacquin.com/allsky-portal/screenshots/camera-settings.jpg)

If you don't want to configure the camera using the terminal, you can install the [WebUI](https://github.com/thomasjacquin/allsky-portal).
Please note that this will change your hostname to **allsky** (or whatever you called it when installing), install the lighttpd web server, and replace your `/var/www/html` directory. It will also move `config/settings_*.json` to `/etc/raspap/settings_*.json`.
Using the WebUI is **highly** recommended as it provides additional information on each setting and allows error checking behind the scenes.

```shell
sudo gui/install.sh
```
It will prompt you for a new name of your Pi (default is 'allsky').

After you complete the WebUI setup, you'll be able to administer the camera using the WebUI by navigating to
```sh
http://your_raspberry_IP_address
```
or
```sh
http://allsky.local
```

Note: If you changed the name of your Pi (to 'piname', for example, instead of the default 'allsky') during the WebUI install then use this:
```sh
http://piname.local
```

The default username is **admin** and the default password is **secret**.  If this website is publically viewable you should change those settings.

A public page is also available in order to view the current image without having to log into the portal and without being able to do any administrative tasks. This can be useful for people who don't have a personal website but still want to share a view of their sky:

```sh
http://your_raspberry_IP/public.php
```

Make sure this page is publically viewable.
If it is behind a firewall consult the documentation for your network equipment for information on allowing inbound connections.

**Note:** The WebUI setup uses `/etc/raspap/settings_*.json` for the camera settings. If, for some reason, you prefer to go back to the non-WebUI version, make sure to edit your `config/config.sh` file to have `CAMERA_SETTINGS_DIR="${ALLSKY_CONFIG}"` instead.

## Dark frame subtraction

The dark frame subtraction feature removes hot pixels from night sky images. The concept is the following: Take an image with a cover on your camera lens and let the software subtract that image later from all images taken throughout the night.

See [this Wiki page](https://github.com/thomasjacquin/allsky/wiki/Dark-Frames-Explained) on dark frames for instructions on how to use them.


## Timelapse

By default, a timelapse video is generated at the end of nighttime from all of the images captured in the last 24 hours.

To disable timelapse, open `config/config.sh` and set

```
TIMELAPSE="false"
```

Example to generate a timelapse manually:

```
./scripts/generateForDay.sh -t 20210710
```

**Note:** If you are unable to create a timelapse, see [this Wiki page](https://github.com/thomasjacquin/allsky/wiki/Troubleshooting:-timelapse) on troubshooting timelapse issues.

## Keograms

![](http://www.thomasjacquin.com/allsky-portal/screenshots/keogram-annotated.jpg)

A **Keogram** is an image giving a quick view of the night activity. It was originally invented to study the aurora borealis.
For each nighttime image a central vertical column 1 pixel wide is extracted. All these columns are then stitched together from left to right. This results in a timeline that reads from dusk to dawn.

See the [Keogram Wiki page](https://github.com/thomasjacquin/allsky/wiki/Keograms-explained) for more details.

## Startrails

![](http://www.thomasjacquin.com/allsky-portal/screenshots/startrail.jpg)

**Startrails** are generated by stacking all the images from a night on top of each other.

To disable startrails, open `config/config.sh` and set

```
STARTRAILS="false"
```

See the [Startrails Wiki page](https://github.com/thomasjacquin/allsky/wiki/Startrails-Explained) for more details.

## Automatic deletion of old data

You can specify how many days worth of images to keep in order to keep the Raspberry Pi SD card from filling up. Automatic deletion is enabled by default and will keep 2 weeks of data on the card.
```
AUTO_DELETE="true"
NIGHTS_TO_KEEP=14
```
Set to "false" to keep all nights (requires manual management of SD card free space).

**NOTE:** "NIGHTS_TO_KEEP" should really be "DAYS_TO_KEEP" since it will keep that many 24-hour days of data, not just the nighttime data.

## Logging issues

When using the allsky service, issues are written to a log file. In case the program stopped, crashed, or behaved in an abnormal way, take a look at:
```
tail /var/log/allsky.log
```


## Allsky Website
You can display your files on a website, either on the Pi itself or on another machine.

### On the Pi
If you want to host the website on your Raspberry Pi, run the following command. Note that this requires first installing the WebUI.

```
website/install.sh
```

And set these variabled in `ftp-settings.sh`:
```
PROTOCOL='local'
IMAGE_DIR='/var/www/html/allsky/'
VIDEOS_DIR=`/var/www/html/allsky/videos`
KEOGRAM_DIR=`/var/www/html/allsky/keograms`
STARTRAILS_DIR=`/var/www/html/allsky/startrails`
```

### On a different machine
If you want to host the website on a _different_ machine, like in this [example](http://www.thomasjacquin.com/allsky), download the source files from this repository: [https://github.com/thomasjacquin/allsky-website.git](https://github.com/thomasjacquin/allsky-website.git).

### Website settings
Once you've installed the website, either on your Pi or another machine, look at the descriptions of the settings on the [allsky-website Settings page](https://github.com/thomasjacquin/allsky/wiki/allsky-website-Settings).

## Information for advanced users
### Optional additional processing steps
Experienced users may want to add some additional processing steps at the end of nighttime.
To do so, copy `scripts/endOfNight_additionalSteps.repo` to 
`scripts/endOfNight_additionalSteps.sh` and then add your additional processing steps which
will be run after the usual end-of-night processing, but before the deletion of any old image files.

Edit this file via the "Editor" link on the left side of the WebUI page.


### Compile your own version

If you want to modify a compiled file, edit the corresponding `src/*.cpp` file and run the following command from the `src` directory:
```shell
make all
sudo make install
```
This will compile the new code, create a new binary, and copy it to the top level `allsky` folder.


## Share your sky

If you've built an allsky camera, please send me a message and I'll add you to the [map](http://www.thomasjacquin.com/allsky-map).

![](http://www.thomasjacquin.com/allsky-map/screenshots/allsky-map-with-pins.jpg)

## Release notes
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
-->
* version **0.7**: Added Raspberry Pi camera HQ support (Based on Rob Musquetier's fork)
	* Support for x86 architecture (Ubuntu, etc)
	* Temperature dependant dark frame library
	* Browser based script editor
	* Configuration variables to crop black area around image
	* Timelapse frame rate setting
	* Changed font size default value
* version **0.8**: Workaround for ZWO daytime autoexposure bug.
	* Improved exposure transitions between day and night so there's not a huge change in brightness.
	* Decrease in ZWO sensor temperature.
	* Lots of new settings, including splitting some settings into day and night versions.
	* Error checking and associated log messages added in many places to aid in debugging.
	* Ability to have "notification" images displayed, such as "Allsky is starting up" and "Taking dark frames".
	* Ability to resize uploaded images to a user-specified size.
	* Ability to set thumbnail size.
	* Ability to delete bad images (corrupt and too light/dark).
	* Ability to set an image file name prefix.
	* Ability to reset USB bus if ZWO camera isn't found (requires "uhubctl" command to be installed).
	* Ability to specify format of time displayed on image and temperature displayed in Celcius, Fahrenheit, or both.
	* Ability to set bitrate on timelapse video.
* version **0.8.1**: Rearranged directory structure.
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
* version **0.8.3**: Works on Bullseye operating system.
	* RPiHQ version:
	  * Has an improved auto-exposure algorithm.  To use it, set `CAPTURE_EXTRA_PARAMETERS="-mean-value 0.3 -autoexposure 1"` in config.sh (a future version will allow this to be set via the WebUI).
	  * Has many new settings including support for most of the text overlay features that are supported by the ZWO version.  The "extra text" feature will be supported in a future version).
	* New and changed config.sh variables, see the [Software Settings](https://github.com/thomasjacquin/allsky/wiki/allsky-Settings) Wiki page for more information:
	  * `IMG_UPLOAD_FREQUENCY`: how often the image should be uploaded to a website.  Useful with slow uplinks or metered Internet connections.
	  * `IMG_CREATE_THUMBNAILS`: specifies whether or not thumbnails should be created for each image.
	  * `REMOVE_BAD_IMAGES` now defaults to "true" since bad-image detection is now done after a picture is saved rather than once for all pictures at the end of the night.  This helps decrease problems when creating startrails, keograms, and timelapse videos.
	  * `IMG_PREFIX`: no longer used - the name of the image used by the websites is now whatever you specify in the WebUI (default: image.jpg).
	  * **NOTE**: When upgrading to 0.8.3 you MUST follow the steps listed [here](https://github.com/thomasjacquin/allsky/wiki/Upgrade-from-0.8.2-or-prior-versions).
	* Replaced `saveImageDay.sh` and `saveImageNight.sh` with `saveImage.sh` that has improved functionality, including passing the sensor temperature to the dark subtraction commands, thereby eliminating the need for the "temperature.txt" file.
	* The image used by the websites (default: image.jpg) as well as all temporary files are now written to `allsky/tmp`.  **NOTE**: if you are using the Allsky Website you will need to change the "imageName" variable in `/var/www/html/allsky/config.js` to `"/current/tmp/"`.
	* You can **significanly** reduce wear on your SD card by making `allsky/tmp` a [memory-based filesystem](https://github.com/thomasjacquin/allsky/wiki/Miscellaneous-Tips) for instructions).
## Donation

If you found this project useful, here's a link to send me a cup of coffee :)

[![](https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=MEBU2KN75G2NG&source=url)
