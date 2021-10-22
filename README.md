# Allsky Camera ![Release 0.8.1](https://img.shields.io/badge/Release-0.8.1-green.svg) [![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=MEBU2KN75G2NG&source=url)



This is the source code for the Wireless Allsky Camera project described [on Instructables](http://www.instructables.com/id/Wireless-All-Sky-Camera/).


![](http://www.thomasjacquin.com/allsky-portal/screenshots/camera-header-photo.jpg)

## Requirements

In order to get the camera working properly you will need the following hardware:

 * A camera (a Raspberry Pi HQ or ZWO ASI)
 * A Raspberry Pi (2, 3, 4 or Zero)

**NOTE:** Owners of USB2.0 cameras such as ASI120MC and ASI120MM may need to do a [firmware upgrade](https://astronomy-imaging-camera.com/software-drivers). This changes the camera to use 512 byte packets instead of 1024 which makes it more compatible with most hardware.

The Datyson T7 camera seems to be supported as well. The firmware needs to be upgraded with ZWO's compatible firmware (see link above) and you'll need to add this line in /boot/config.txt: `program_usb_boot_mode=0`

## Installation

PatriotAstro created a [video](https://www.youtube.com/watch?v=j9xHsST2EeY) describing the installation steps below. Feel free to check it out. **NOTE**: the video mentions executing `sudo ./install.sh`; this is outdated - use `./install.sh` instead (step 4 below).  Another [video](https://www.youtube.com/watch?v=y6EFfLo4XxE) covers the installation on a Raspberry Pi zero with both ZWO and RPiHQ cameras.

You will need to install Raspbian on your Raspberry Pi. Follow [this link](https://www.raspberrypi.org/documentation/installation/installing-images/) for information on how to do it.

Make sure you have a working internet connection by setting it through [the terminal](https://www.raspberrypi.org/documentation/configuration/wireless/wireless-cli.md).

1. Start by installing git. You may already have it installed.  Open the terminal and type the following:
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
    ./install.sh
    ```

## Update

See the Wiki for instructions on how to upgrade the AllSky software.

Please note that version 0.8 added many new settings and changed the name of several existing settings.  For example, there are now separate brightness levels for daytime and nighttime, called "daybrightness" and "nightbrightness".  Version 0.7 only had "brightness" that applied to both day and nighttime.  It's very important that you save a copy of your current settings prior to upgrading to version 0.8 so you can restore them properly.
The WebUI from the `allsky-portal` package uses these new settings so it's also important to update AllSky **prior to** updating the WebUI.

Also note that in version 0.8, the default image file created and uploaded is called either "image.jpg" or "liveview-image.jpg", depending on how you set things up.  The prior "image-resize.jpg" is no longer created. Keep that in mind if you copy the image to a remote web server - it will need to know about the new name.

Some users have reported ASI_ERROR_TIMEOUT errors with their ZWO cameras in verion 0.8.  See the Wiki for a workaround.

## Configuration

There are a few configuration files you'll need to modify.

The first one is called `settings_RPiHQ.json` or `settings_ZWO.json`, depending on which camera type you have. It contains the camera parameters such as exposure, gain, delay, etc.  Many settings have both a daytime ("dayXXXX") and nighttime ("nightXXXX") version.
If you have the WebUI installed, those files are in `/etc/raspap`, otherwise they are in `~/allsky/config`.

The WebUI is **highly** recommended since it simplifies administration of the AllSky software and provides a description of what each option does.  **Instructions in this document assume you have the WebUI installed.**  To install it, execute: `sudo gui/install.sh`.

The exact list of settings available depends on the camera you are using, but in general, the RPiHQ camera has fewer settings.
The range of valid values varies by camera model so is not shown below.  For example, the ZWO ASI183's maximum gain is 450 but the ASI178's is 510.  To determine your camera's range, set the `Debug Level` in the WebUI to 4 and then look in `/var/log/allsky.log`.  It will list the minimum, maximum, and default values for all the camera's capabilities.

If you do NOT have the WebUI installed, use "0" for "No" and "1" for "Yes" when manually editing the appropriate `settings_*.json` file.  Also, use "1" for "1x1" binning, "2" for "2x2", etc.


| Setting     | Default     | Additional Info |
| ----------- | ----------- | ----------------|
| width | 0 | 0 means max width. Look up your camera specifications to know what values are supported. |
| height | 0 |  0 means max height. Look up your camera specifications to know what values are supported. |
| dayautoexposure | Yes | Should auto-exposure be on during **daytime**? Auto-exposure delivers properly exposed images throughout the day even if the overall brightness of the sky changes (cloud cover, sun, etc). Since daytime exposures are short, there is no daytime "maxexposure". This option is usually only disabled for testing. |
| dayexposure | 0.5 | **Day**time manual exposure time in milliseconds.  Normally daytime auto-exposure will be used; if so, this value is used as a starting exposure. |
| daybrightness | 50 | This setting changes the amount of light in **daytime** images. |
| daydelay | 5000 | Time in milliseconds to wait between 2 frames during the day. |
| daybin | 1x1 | Bin 2x2 collects the light from 4 photosites to form 1 pixel on the image. bin 3 uses 9 photosites, etc. Increasing the bin results in smaller images and reduces the need for long exposure. Look up your camera specifications to know what values are supported.  This variable is usually only changed during the day for testing. |
| nightautoexposure | Yes | Should auto-exposure be on at **night**? When on, *maxexposure* value will be used as the delay between timelapse frames. |
| nightmaxexposure | 20000 | This is the maximum exposure for **night** images when using auto-exposure.
| nightexposure | 10000 | **Night**time manual exposure in milliseconds. |
| nightautogain | No | Should auto-gain be on at **night**? This mode will adjust the gain of night images when the overall brightness of the sky changes (cloud cover, moon, aurora, etc). **Avoid using autoexposure and autogain together** as it can produce unpredicatble results (dark frames, but not always).|
| nightmaxgain | 200 | Maximum gain for **night** images when using auto-gain.|
| nightgain | 50 | Gain for **Night** images. During the day, gain is always set to 0. |
| nightdelay | 10 | Time in milliseconds to wait between 2 frames at night. |
| nightbin | 1x1 | Similar to "daybin" but for night. |
| nightbrightness | 50 | This setting changes the amount of light in **nighttime** images. |
| gaintransitiontime | 15 | Number of minutes to transition gain between daytime and nighttime, i.e., ramp up or ramp down gain. |
| gamma | 50 | This setting increases or decreases contrast between dark and bright areas. Gamma is not supported by all cameras. |
| autowhitebalance | No | Sets auto white balance.  When used, "wbr" and "wbb" are used as starting points. |
| wbr | 53 | This is the intensity of the red component of the image. |
| wbb | 90 | This is the intensity of the blue component of the image. |
| type | 99 | Image format. 0=RAW 8 bits, 1=RGB 24 bits, 2=RAW 16 bits, 99=auto (if you have a color camera it will use RGB; mono cameras use RAW16 if the output file is a .png, otherwise they use RAW8). |
| quality | 95 | Compression of the image. 0 (low quality) to 100 (high quality) for JPG images, 0 to 9 for PNG. |
| autousb | Yes | Automatically determine the USB bandwidth? |
| usb | 80 | How much of the USB bandwidth to use. |
| filename | image.jpg | This is the name of the image file. Supported extensions are JPG and PNG. |
| flip | No flipping | How to flip the image (No flipping, Horizontal, Vertical, or Both). |
| text |  | Text overlay that appears below the time, in the same font. |
| extratext | | (ZWO ONLY) The FULL path to a text file which will be displayed under other information. The file can contain multiple lines which will be displayed underneath each other. |
| extratextage | 600 | (ZWO ONLY) If using the extra text file then it must be updated within this number of seconds, if not it will not be displayed. Set to 0 to ignore this check and always didplay it. |
| textlineheight | 60 | (ZWO ONLY) The line height of the text displayed in the image, if you chnage the font size then adjust this value if required. |
| textx | 15 | Horizontal text placement from the left. |
| texty | 30 | Vertical text placement from the top. |
| fontname | 0 | Font type for the overlay. 0=Simplex, 1=Plain, 2=Duplex, 3=Complex, 4=Triplex, 5=Complex small, 6=Script simplex, 7=Script complex. |
| fontcolor | 255 255 255 | Font color in Blue, Green, and Red (BGR). NOTE: When using RAW 16 only the first two values are used i.e. 255 128 0. |
| smallfontcolor | 0 0 255 | Small font color in BGR. NOTE: When using RAW 16 only the first two values are used i.e. 255 128 0. |
| fontsize | 7 | Font size. |
| fonttype | 0 | Controls the smoothness of the fonts. 0=Antialiased, 1=8 Connected, 2=4 Connected. |
| fontline | 1 | font line thickness. |
| outlinefont | No | Should an outline to the text overlay be added to improve contrast? |
| latitude | 60.7N | Latitude of the camera. N for North and S for South. |
| longitude | 135.05W | longitude of the camera. E for East and W for West. |
| angle | -6 | Altitude of the Sun above or below the horizon at which capture should start/stop. Can be negative (Sun below horizon) or positive (Sun above horizon). 0=Sunset, -6=Civil twilight, -12=Nautical twilight, -18=Astronomical twilight.
| showTime | Yes | Display the time the picture was taken? |
| timeformat | %Y%m%d %H:%M:%S | Determines the format of the displayed time.  Run "man 3 strftime" to see the options. |
| showTemp | Yes | Display the camera sensor temperature? |
| temptype | C | Determines what unit(s) the temperature will be displayed in: C=Celsius, F=Fahrenheit, B=Both. |
| showExposure | Yes | Display the exposure time in the overlay? If auto-exposure is enabled, "(auto)" will appear after the exposure. |
| showGain | Yes | Display the gain in the overlay? If auto-gain is enabled, "(auto)" will appear after the gain. |
| showBrightness | No | Display the brightness level in the overlay? |
| showHistogram | No | Display the histogram mean level in the overlay? |
| darkframe | No | Set to Yes to enable dark frame capture. In this mode, overlays are hidden. |
| histogrambox | 500 500 50 50 | X and Y size of histogram box in pixels and the middle point of the box in percent. |
| showhistogrambox | No | Show the histogram box on the image? |
| notificationimages | Yes | Set to No to disable notification images, e.g., "Camera off during day" if daytime images are not being taken. |
| newexposure | Yes | Determines if the new version 0.8 exposure method is used. If you see ASI_ERROR_TIMEOUTs in the log file, try setting this to 0. See [issue 417](https://github.com/thomasjacquin/allsky/issues/417). |
| debuglevel | 1 | Determines the amount of output in the log file (usually `/var/log/allsky.log` also can be viewed with `journalctl -u allsky`). |

The second configuration file is called `config/config.sh` lets you configure the overall behavior of the camera. Options include functionalities such as upload, timelapse, dark frame subtraction, and keogram creation.  Note that with the WebUI, you can edit the file via the "Editor" link on the left side of the page.


| Configuration     | Default     | Additional Info |
| ----------- | ----------- | ----------------|
| CAMERA | | Choose between ZWO and RPiHQ.  You MUST set this prior to using the WebUI or AllSky.
| IMG_UPLOAD | false | Upload the current image to a server (website, blog, host, etc)? |
| IMG_DIR | current | Location of the image the website will use.  "allsky" is `/var/www/html/allsky` and "current" is `/home/pi/allsky`. |
| IMG_PREFIX | liveview- | An optional prefix on the image file name, before "image.jpg" (or whatever your image is called). |
| IMG_RESIZE | false | Resize images before cropping and saving. Adjust width and height according to your own sensor ratio. |
| IMG_HEIGHT | 2028 | The height of the resized image. |
| IMG_WIDTH | 1520 | The width of the resized image. |
| CROP_IMAGE | false | Crop the captured image BEFORE any other processing. This can be used, for example, to crop out most of the dark border when using a fisheye lens. |
| CROP_WIDTH | 640| The width of the resulting image. |
| CROP_HEIGHT | 480 | The height of the resulting image. |
| CROP_OFFSET_X | 0 | The x offset to use when cropping. |
| CROP_OFFSET_Y | 0 | The y offset to use when cropping. |
| AUTO_STRETCH | false | Stretch the image? |
| AUTO_STRETCH_AMOUNT | 10 | Indicates how much to increase the contrast. For example, 0 is none, 3 is typical and 20 is a lot. |
| AUTO_STRETCH_MID_POINT | 10% | Indicates where the maximum change 'slope' in contrast should fall in the resultant image (0 is white; 50% is middle-gray; 100% is black). |
| RESIZE_UPLOADS | false | Resize uploaded pictures? |
| RESIZE_UPLOADS_SIZE | 962x720 | Sets the width x height of resized images being uploaded. |
| REMOVE_BAD_IMAGES | false | Remove corrupt or too bright/too dark images and their thumbnails before generating keograms and startrails? |
| REMOVE_BAD_IMAGES_THRESHOLD_LOW | 1 | Images whose mean brightness is below this percent will be removed. |
| REMOVE_BAD_IMAGES_THRESHOLD_HIGH | 90 | Images whose mean brightness is above this percent will be removed (max: 100). |
| TIMELAPSE | true | Build a timelapse video at the end of the night? |
| TIMELAPSEWIDTH | 0 | Overwrite the width of the generated timelapse, must be divisible by 2. |
| TIMELAPSEHEIGHT | 0 | Overwrite the height of the generated timelapse, must be divisible by 2. |
| TIMELAPSE_BITRATE | 2000k | Bitrate the timelapse video will be created with.  Higher values produce better quality video but larger files.  Make sure to include the trailing "k". |
| FPS | 25 | The timelapse video frame rate (Frames Per Second). |
| VCODEC | libx264 | Encoder used to create the timelapse video. |
| FFLOG | warning | Level of debugging information output when creating a timelapse.  Set to "info" for more output. |
| KEEP_SEQUENCE | false | Keep the sequence of symbolic links created when creating a timelapse? |
| TIMELAPSE_PARAMETERS | | Any additional timelapse parameters.  Run `ffmpeg -?` to see the options. |
| UPLOAD_VIDEO | false | Upload the timelapse video to a server? |
| KEOGRAM | true | Build a keogram at the end of the night? |
| KEOGRAM_EXTRA_PARAMETERS | various | Additional keogram parameters.  Execute `./keogram --help` for a list. |
| UPLOAD_KEOGRAM | false | Upload the keogram image to your server? |
| STARTRAILS | true | Stack images to create a startrail at the end of the night? |
| BRIGHTNESS_THRESHOLD | 0.1 | Brightness level above which images are discarded (moon, head lights, aurora, etc). |
| UPLOAD_STARTRAILS | false | Upload the startrails image to your server? |
| THUMBNAIL_SIZE_X | 100 | Sets the width of thumbnails. |
| THUMBNAIL_SIZE_Y | 75 | Sets the height of thumbnails. |
| AUTO_DELETE | true | Enables automatic deletion of old images and videos |
| NIGHTS_TO_KEEP | 14 | Number of nights to keep before starting deleting. Needs AUTO_DELETE=true to work. |
| POST_END_OF_NIGHT_DATA | false | Send data to your server at the end of each night? |
| DARK_FRAME_SUBTRACTION | false | Enable hot pixels subtraction at night? |
| DAYTIME_CAPTURE | true | Capture images during the day? |
| DAYTIME_SAVE | false | Save images during the day?  They are always saved at night. |
| UHUBCTL_PATH |  | If you have the "uhubctl" command installed enter its path name. uhubctl resets the USB bus an can sometimes eliminate ASI_ERROR_TIMEOUTs. |
| UHUBCTL_PORT | 2 | Enter the USB port the camera is on.  Port 1 is USB 2.0 and port 2 is USB 3.0. |
| CAMERA_SETTINGS_DIR | Either `/home/pi/allsky/config` or `/etc/raspap` | Path to the camera settings file.  Set automatically. |
| CAMERA_SETTINGS | n/a | Do not change this line. |
| ALLSKY_DEBUG_LEVEL | n/a | Do not change this line. |

When using the cropping options the image is cropped from the center so you will need to experiment with the correct width and height values. Normally there will be no need to amend the offset values.

In order to upload files to your website, you'll need to edit connection details in `config/ftp-settings.sh`.  Edit this file via the "Editor" link on the left side of the page.


| Configuration     | Default     | Additional Info |
| ----------- | ----------- | ----------------|
| PROTOCOL |  | How the file should be uploaded. Choose between `ftp`, `sftp`, `S3`, `scp`, or `local`. |
| IMAGE_DIR |  | The remote directory where the current "image.jpg" file should go. NOTE: You must create these directories on the remote host. |
| VIDEOS_DIR |  | The remote directory where the timelapse video should go. |
| VIDEOS_DESTINATION_NAME | | Remote name of the timelapse video file.  If not specified it's the same as on the Pi. |
| WEB_VIDEOS_DIR | | Location on the Pi to copy the timelapse video to, _in addition to_ uploading it. |
| KEOGRAM_DIR |  | The remote directory where the keogram image should go. |
| KEOGRAM_DESTINATION_NAME | | Remote name of the keogram image file.  If not specified it's the same as on the Pi. |
| WEB_KEOGRAM_DIR | | Location on the Pi to copy the keogram file to, _in addition to_ uploading it. |
| STARTRAILS_DIR |  | The remote directory where the startrails image should go. |
| STARTRAILS_DESTINATION_NAME | | Remote name of the startrails file.  If not specified it's the same as on the Pi. |
| WEB_STARTRAILS_DIR | | Location on the Pi to copy the startrails file to, _in addition to_ uploading it. |
| REMOTE_HOST |  | Your remote host server or IP. |
| REMOTE_USER |  | Your remote user name. |
| REMOTE_PASSWORD |  | Your ftp / sftp password. |
| LFTP_COMMANDS | | Any additional commands needed by `lftp`. |


### Optional additional processing steps

Experienced users may want to add some additional processing steps at the end of nighttime.
To do so, copy `scripts/endOfNight_additionalSteps.repo` to 
`scripts/endOfNight_additionalSteps.sh` and then add your additional processing steps which
will be run after the usual end-of-night processing, but before the deletion of any
old image files.

Edit this file via the "Editor" link on the left side of the WebUI page.

## Usage

### Autostart

**Systemd** is used to launch the software automatically when the Raspberry Pi boots up. To enable or disable this behavior, use these commands:

```
sudo systemctl enable allsky.service     # enables the service, but does not start it
sudo systemctl disable allsky.service
```
**Note:*** The service is enabled by default after installation.

When you want to start, stop or restart the program, or obtain status, use one of the following commands:
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
cd scripts
./allsky.sh
```

If you are using a desktop environment (Pixel, Mate, LXDE, etc) or using remote desktop or VNC, you can add the `preview` argument in order to show the images the program is currently saving.
```
./allsky.sh preview
```


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

**Note:*** The WebUI setup uses `/etc/raspap/settings_*.json` for the camera settings. If, for some reason, you prefer to go back to the non-WebUI version, make sure to edit your `config/config.sh` file to have `CAMERA_SETTINGS_DIR="${ALLSKY_CONFIG}"` instead.

## Dark frame subtraction

The dark frame subtraction feature removes hot pixels from night sky images. The concept is the following: Take an image with a cover on your camera lens and let the software subtract that image later from all images taken throughout the night.

See the Wiki page on dark frames for instructions on how to use them.


## Timelapse

By default, a timelapse video is generated at the end of nighttime from all of the images captured in the last 24 hours.

To disable timelapse, open `config/config.sh` and set

```
TIMELAPSE="false"
```

Example to generate a timelapse manually:

```
./scripts/timelapse.sh 20210710
```

**Note:** If you are unable to create a timelapse, see the Wiki page on troubshooting timelapse.

## Keograms

![](http://www.thomasjacquin.com/allsky-portal/screenshots/keogram-annotated.jpg)

A **Keogram** is an image giving a quick view of the night activity. It was originally invented to study the aurora borealis.
For each nighttime image a central vertical column 1 pixel wide is extracted. All these columns are then stitched together from left to right. This results in a timeline that reads from dusk to dawn.

See the Wiki page on Keograms for more details.

## Startrails

![](http://www.thomasjacquin.com/allsky-portal/screenshots/startrail.jpg)

**Startrails** are generated by stacking all the images from a night on top of each other.

To disable startrails, open `config/config.sh` and set

```
STARTRAILS="false"
```

See the Wiki page on Startrails for more details.

## Automatic deletion of archived nights

You can specify how many nights worth of images to keep in order to keep the Raspberry Pi SD card from filling up. Automatic deletion is enabled by default and will keep 2 weeks of data on the card.
```
AUTO_DELETE="true"
NIGHTS_TO_KEEP=14
```
Set to "false" to keep all nights (requires manual management of SD card free space).

## Logging issues

When using the allsky service, issues are written to a log file. In case the program stopped, crashed, or behaved in an abnormal way, take a look at this log file:
```
tail /var/log/allsky.log
```


## Compile your own version

If you want to modify a compiled file, you'll need to edit the corresponding `src/*.cpp` file and run the following command from the `src` directory:
```shell
make all
sudo make install
```
This will compile the new code, create a new binary, and copy it to the top level `allsky` folder.

## Show your sky on your own website

If you have set the upload options to true in `config/config.sh`, that means you probably already have a website. If you want to display a live view of your sky on your website like in this [example](http://www.thomasjacquin.com/allsky), download the source files from this repository: [https://github.com/thomasjacquin/allsky-website.git](https://github.com/thomasjacquin/allsky-website.git).

If you want to host the website on the raspberry Pi, run the following command. Note that installing the website on the Pi requires first installing the WebUI.

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

## Share your sky

If you've built an allsky camera, please send me a message and I'll add you to the [map](http://www.thomasjacquin.com/allsky-map).

![](http://www.thomasjacquin.com/allsky-map/screenshots/allsky-map-with-pins.jpg)

## Release notes

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
	* Renamed several variables in `config.sh` and `ftp-settings.sh`.
	* CAMERA type of "auto" is no longer supported - you must specify "ZWO" or "RPiHQ".
	* Startrails and keograms are now created using all CPUs on the Pi, drastically speeding up creating time.
	* Many bug fixes.

## Donation

If you found this project useful, here's a link to send me a cup of coffee :)

[![](https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=MEBU2KN75G2NG&source=url)
