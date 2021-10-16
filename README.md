# Allsky Camera ![Release 0.8.1](https://img.shields.io/badge/Release-0.8.1-green.svg) [![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=MEBU2KN75G2NG&source=url)



This is the source code for the Wireless Allsky Camera project described [on Instructables](http://www.instructables.com/id/Wireless-All-Sky-Camera/).


![](http://www.thomasjacquin.com/allsky-portal/screenshots/camera-header-photo.jpg)

## Requirements

In order to get the camera working properly you will need the following hardware:

 * A camera (a Raspberry Pi HQ or ZWO ASI)
 * A Raspberry Pi (2, 3, 4 or Zero)

**Note:*** Owners of USB2.0 cameras such as ASI120MC and ASI120MM may need to do a [firmware upgrade](https://astronomy-imaging-camera.com/software-drivers) (This changes the camera to use 512 byte packets instead of 1024 which makes it more compatible with most hardware.)

The Datyson T7 camera seems to be supported as well. The firmware needs to be upgraded with ZWO's compatible firmware (see link above) and you'll need to add this line in /boot/config.txt: `program_usb_boot_mode=0`

## Installation

**New:** PatriotAstro created a [video](https://www.youtube.com/watch?v=j9xHsST2EeY) describing the installation steps below. Feel free to check it out if you prefer video tutorials or if you're new to Linux and Raspberry Pi projects. Another [video](https://www.youtube.com/watch?v=y6EFfLo4XxE) covers the installation on a Raspberry Pi zero with both ZWO and RPiHQ cameras.

You will need to install Raspbian on your Raspberry Pi. Follow [this link](https://www.raspberrypi.org/documentation/installation/installing-images/) for information on how to do it.

Make sure you have a working internet connection by setting it either through the WebUI or [the terminal](https://www.raspberrypi.org/documentation/configuration/wireless/wireless-cli.md).  The WebUI is **highly** recommended since it simplifies administration of the AllSky software.

1. Start by installing git. You may already have it installed:
    ```shell
    sudo apt-get install git
    ```

2. Now fetch the code from this GitHub page. Open the terminal and type the following:
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

There is no 1-click update yet so until then, the easiest is to backup your config files, delete the allsky directory and follow the installation instructions again.

Please note that version 0.8 added many new settings and changed the name of several existing settings.  For example, there are now separate brightness levels for daytime and nighttime, called "daybrightness" and "nightbrightness".  Version 0.7 only had "brightness" that applied to both day and nighttime.  It's very important that you save a copy of your current settings prior to upgrading to version 0.8 so you can restore them properly.
The WebUI interface uses these new settings so it's also important to update AllSky **prior to** updating the WebUI.

Also note that in version 0.8, the default image file created and uploaded is called either "image.jpg" or "liveview-image.jpg", depending on how you set things up.  The prior "image-resize.jpg" is no longer created. Keep that in mind if you copy the image to a remote web server - it will need to know about the new name.

Some users have reported ASI TIMEOUT errors with their ZWO cameras in verion 0.8.  This can often be fixed by changing the "autousb" and/or "usb" settings - see below.

## Configuration

Here's a quick overview of the configuration files.

the first one is called `config/settings_RPiHQ.json` or `config/settings_ZWO.json`, depending on which camera type you have. It contains the camera parameters such as exposure, gain but also latitude, longitude, etc.  Many settings have both a daytime ("dayXXXX") and nighttime ("nightXXXX") version.
If you have the administrative WebUI, the files are in `/etc/raspap`, otherwise they are in `~/allsky/config`.  The advantage of using the administrative WebUI is that you don't explicitly edit the files, instead, you do it via the WebUI interface, which includes descriptive text on each option.

The exact list of settings available depend on the camera you are using; in general, the RPiHQ camera has less settings.

```shell
nano config/settings_RPiHQ.json
```
-or-
```
nano config/settings_ZWO.json
```


| Setting     | Default     | Additional Info |
| ----------- | ----------- | ----------------|
| width | 0 | 0 means max width. Look up your camera specifications to know what values are supported |
| height | 0 |  0 means max height. Look up your camera specifications to know what values are supported |
| dayautoexposure | 1 | Set to 0 to disable auto-exposure during **daytime**. Auto-exposure delivers properly exposed images throughout the day even if the overall brightness of the sky changes (cloud cover, sun, etc). Since daytime exposures are short, there is not daytime "maxexposure". This option is usually only disabled for testing. |
| dayexposure | 0.5 | **Day** time manual exposure time in milliseconds.  Normally daytime auto-exposure will be used; if so, this value is used as a starting exposure. |
| daybrightness | 50 | Varies between 0 and 600. This setting changes the amount of light in **daytime** images. |
| daydelay | 5000 | Time in milliseconds to wait between 2 frames during the day. |
| daybin | 1 | bin 2 collects the light from 2x2 photosites to form 1 pixel on the image. bin 3 uses 3x3 photosites, etc. Increasing the bin results in smaller images and reduces the need for long exposure. Look up your camera specifications to know what values are supported.  This variable is usually only changed during the day for testing. |
| nightautoexposure | 1 | Set to 0 to disable auto-exposure at **night**. Auto-exposure delivers properly exposed images throughout the night even if the overall brightness of the sky changes (cloud cover, moon, aurora, etc). When set to 1, *maxexposure* value will be used as the delay between timelapse frames. |
| nightmaxexposure | 20000 | This is the maximum exposure for **night** images when using auto-exposure.
| nightexposure | 10000 | **Night** time exposure in milliseconds. |
| nightautogain | 0 | Set to 1 to allow auto-gain at **night**. This mode will adjust the gain of night images when the overall brightness of the sky changes (cloud cover, moon, aurora, etc). **Avoid using autoexposure and autogain together** as it can produce unpredicatble results (dark frames, but not always).|
| nightmaxgain | 200 | Maximum gain for **night** images when using auto-gain.|
| nightgain | 50 | Gain for **Night** images. Varies from 0 to 600. During the day, gain is always set to 0. |
| nightdelay | 10 | Time in milliseconds to wait between 2 frames at night. |
| nightbin | 1 | Similar to "daybin" but for night. |
| nightbrightness | 50 | Varies between 0 and 600. This setting changes the amount of light in **nighttime** images. |
| gamma | 50 | Varies between 0 and 100. This setting increases or decreases contrast between dark and bright areas. This is not supported by all cameras. |
| autowhitebalance | 0 | Sets auto white balance.  When used, "wbr" and "wbb" are used as starting points. |
| wbr | 53 | Varies between 0 and 100. This is the intensity of the red component of the image. |
| wbb | 90 | Varies between 0 and 100. This is the intensity of the blue component of the image. |
| type | 99 | Image format. 0=RAW 8 bits, 1=RGB 24 bits, 2=RAW 16 bits, 99=auto (if you have a color camera it will use RGB; mono cameras use RAW16 if the output file is a .png, otherwise they use RAW8). |
| quality | 95 | Compression of the image. 0 (low quality) to 100 (high quality) for JPG images, 0 to 9 for PNG |
| autousb | 0 | Set to 1 to enable auto USB bandwidth.  If you get ASI TIMEOUT errors try changing this. |
| usb | 80 | This is the USB bandwidth. Varies from 40 to 100. If you get ASI TIMEOUT errors try changing this up and down. |
| filename | image.jpg | this is the name used across the app. Supported extensions are JPG and PNG. |
| flip | 0 | 0=No flip, 1=Horizontal, 2=Vertical, 3=Both |
| text | n/a | Text overlay that appears below the time, in the same font. |
| extratext | | (ZWO ONLY) The FULL path to a text file which will be displayed under other information. The file can contain multiple lines which will be displayed underneath each other. |
| extratextage | 600 | (ZWO ONLY) If using the extra text file then it must be updated within this number of seconds, if not it will not be displayed. Set to 0 to ignore this check and always didplay it |
| textlineheight | 30 | (ZWO ONLY) The line height of the text displayed in the image, if you chnage the font size then adjust this value if required |
| textx | 15 | Horizontal text placement from the left |
| texty | 35 | Vertical text placement from the top |
| fontname | 0 | Font type for the overlay. 0=Simplex, 1=Plain, 2=Duplex, 3=Complex, 4=Triplex, 5=Complex small, 6=Script simplex, 7=Script complex |
| fontcolor | 255 255 255 | Font color in BGR. NOTE: When using RAW 16 only the first two values are used i.e. 255 128 0 |
| smallfontcolor | 0 0 255 | Small Font color in BGR. NOTE: When using RAW 16 only the first two values are used i.e. 255 128 0 |
| fontsize | 7 | Font size |
| fonttype | 0 | Controls the smoothness of the fonts. 0=Antialiased, 1=8 Connected, 2=4 Connected. |
| fontline | 1 | font line thickness |
| outlinefont | 0 | Set to 1 to add an outline to the text overlay to improve contrast. |
| latitude | 60.7N | Latitude of the camera. N for North and S for South
| longitude | 135.05W | longitude of the camera. E for East and W for West |
| angle | -6 | Altitude of the sun above or below the horizon at which capture should start/stop. Can be negative (sun below horizon) or positive (sun above horizon). 0=Sunset, -6=Civil twilight, -12=Nautical twilight, -18=Astronomical twilight.
| showTime | 1 | Display the time the picture was taken? |
| timeformat | %Y%m%d %H:%M:%S | Determines the format of the displayed time.  Run "man 3 strftime" to see the options. |
| showTemp | 1 | Display the camera sensor temperature? |
| temptype | C | Determines what unit(s) the temperature will be displayed in: C=Celsius, F=Fahrenheit, B=Both. |
| showExposure | 1 | Display the exposure time in the overlay? If auto-exposure is enable, "(auto)" will appear after the exposure. |
| showGain | 1 | Display the gain in the overlay? If auto-gain is enable, "(auto)" will appear after the gain. |
| showBrightness | 1 | Display the brightness level in the overlay? |
| darkframe | 0 | Set to 1 to enable dark frame capture. In this mode, overlays are hidden. |
| notificationimages | 1 | Set to 0 to disable notification images, e.g., "Camera off during day" if daytime images are not being taken. |
| newexposure | 1 | Determines if the new version 0.8 exposure method is used. If you see ASI_ERROR_TIMEOUTs" in the log file, try setting this to 0. ( See [issue 417](https://github.com/thomasjacquin/allsky/issues/417) ) |
| debuglevel | 0 | Determines the amount of output in the log file (usually `/var/log/allsky.log`, also can be viewed with `journalctl -u allsky`). |

The second file called `config/config.sh` lets you configure the overall behavior of the camera. Options include functionalities such as upload, timelapse, dark frame location, keogram.  Note that with the administrative WebUI, you can edit the file via the "Editor" link on the left side of the page.

```shell
nano config.sh
```

| Configuration     | Default     | Additional Info |
| ----------- | ----------- | ----------------|
| CAMERA | ZWO | Choose between ZWO and RPiHQ
| UPLOAD_IMG | false | Set to true to upload (ftp) the current image to a server (website, blog, host, etc) |
| UPLOAD_VIDEO | false | Set to true to upload the timelapse to a server |
| POST_END_OF_NIGHT_DATA | false | Set to true to send some data to your server at the end of each night |
| TIMELAPSE | true | Build a timelapse at the end of the night |
| TIMELAPSEWIDTH | 0 | Overwrite the width of the generated timelapse, must be divisible by 2
| TIMELAPSEHEIGHT | 0 | Overwrite the height of the generated timelapse, must be divisible by 2
| TIMELAPSE_BITRATE | 2000k | Bitrate the timelapse video will be created with.  Higher values produce better quality video but larger files.  Make sure to include the trailing "k".
| FPS | 25 | The timelapse frame rate (frames per second)
| KEOGRAM | true | Builds a keogram at the end of the night |
| KEOGRAM_EXTRA_PARAMETERS | various | Additional Keogram parameters.  Execute ./keogram --help for a list. |
| UPLOAD_KEOGRAM | false | Set to true to upload the keogram to your server |
| STARTRAILS | true | Stacks images to create a startrail at the end of the night |
| BRIGHTNESS_THRESHOLD | 0.1 | Brightness level above which images are discarded (moon, head lights, aurora, etc) |
| UPLOAD_STARTRAILS | false | Set to true to uplad the startrails to your server |
| AUTO_DELETE | true | Enables automatic deletion of old images and videos |
| NIGHTS_TO_KEEP | 14 | Number of nights to keep before starting deleting. Needs AUTO_DELETE=true to work. |
| DARK_FRAME_SUBTRACTION | false | Set to true to enable hot pixels subtraction at night. |
| DAYTIME_CAPTURE | true | Set to 0 to disable daytime liveview. |
| DAYTIME_SAVE | false | Set to true to save images during both night and day |
| IMG_RESIZE | false | Resize images before cropping and saving. Adjust width and height according to your own sensor ratio |
| IMG_HEIGHT | n/a | The height of the resized image |
| IMG_WIDTH | n/a | The width of the resized image |
| CROP_IMAGE | false | Crop the captured image BEFORE any other processing. This inproves the subsequent images when using a fisheye lens |
| CROP_WIDTH | n/a | The width of the resulting image |
| CROP_HEIGHT | n/a | The height of the resulting image |
| CROP_OFFSET_X | 0 | The x offset to use when cropping |
| CROP_OFFSET_Y | 0 | The y offset to use when cropping |
| AUTO_STRETCH | false | If enabled the captured image will be stretched |
| AUTO_STRETCH_AMOUNT | 10 | Indicates how much to increase the contrast. For example, 0 is none, 3 is typical and 20 is a lot |
| AUTO_STRETCH_MID_POINT | 10% | Indicates where the maximum change 'slope' in contrast should fall in the resultant image (0 is white; 50% is middle-gray; 100% is black). |
| RESIZE_UPLOADS | false | Set to true to resize uploaded pictures |
| RESIZE_UPLOADS_SIZE | 962x720 | Sets the width x height of resized images being uploaded |
| THUMBNAIL_SIZE_X | 100 | Sets the width of thumbnails |
| THUMBNAIL_SIZE_Y | 75 | Sets the height of thumbnails |
| REMOVE_BAD_IMAGES | false | Remove corrupt or too bright/too dark images and their thumbnails before generating keograms and startrails |
| REMOVE_BAD_IMAGES_THRESHOLD_LOW | 1 | Images whose mean brightness is below this percent will be removed |
| REMOVE_BAD_IMAGES_THRESHOLD_HIGH | 90 | Images whose mean brightness is above this percent will be removed (max: 100) |
| UHUBCTL_PATH | n/a | If you have the "uhubctl" command installed (it resets the USB bus), enter its path name |
| UHUBCTL_PORT | n/a | Enter the USB port the camera is on.  Port 1 is USB 2.0 and port 2 is USB 3.0 |
| IMG_DIR | allsky | Location of the image the website will use.  "allsky" is `/var/www/html/allsky` and "current" is `/home/pi/allsky`. |
| IMG_PREFIX | liveview- | An optional prefix on the website image file name, before "image.jpg" (or whatever your image is called) |
| CAMERA_SETTINGS_DIR | Either `/home/pi/allsky/config` or `/etc/raspap` | Path to the camera settings file |
| CAMERA_SETTINGS | `/home/pi/allsky/config/settings_*.json` | Name of the camera settings file. **Note**: If using the WebUI, this path will change to /etc/raspap/settings_*.json |

When using the cropping options the image is cropped from the center so you will need to experiment with the correct width and height values. Normally there will be no need to amend the offset values.

In order to upload images and videos to your website, you'll need to fill your FTP or Amazon S3 connection details in `config/ftp-settings.sh`.  If you're using the administrative WebUI you can edit this file via the "Editor" link on the left side of the page.

```shell
nano scripts/ftp-settings.sh
```

| Configuration     | Default     | Additional Info |
| ----------- | ----------- | ----------------|
| PROTOCOL | ftp | Choose between `ftp`, `sftp`, `S3` or `local` |
| REMOTE_USER | username | Your ftp user name |
| REMOTE_PASSWORD | password | Your ftp password |
| REMOTE_HOST | example.com | Your host server or IP |
| IMAGE_DIR | /allsky/ | The absolute path to your image.jpg on the server |
| VIDEOS_DIR | /allsky/videos/ | The absolute path to your videos directory on the server |
| KEOGRAM_DIR | /allsky/keograms/ | The absolute path to your keograms directory on the server |
| STARTRAILS_DIR | allsky/startrails/ | The absolute path to your startrails directory on the server |


### Other scripts of interest (in `allsky/scripts`)

`saveImageNight.sh` is called every time the camera takes a new image at night. If dark subtraction is enabled, this is where it happens.

`saveImageDay.sh` is called every time the camera takes a new image during the day.

At the end of the night `endOfNight.sh` is run. It calls a few other scripts based on your config.sh content.

You normally won't need to edit those files unless you want to implement a new feature.
One change you may want to make is to copy `endOfNight_additionalSteps.repo` to
`endOfNight_additionalSteps.sh` and then add your additional processing steps which
will be run after the usual end-of-night processing, but before the deletion of any
old image files.

nano is a text editor. Hit **ctrl + x**, followed by **y** and **Enter** in order to save your changes.

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


## Graphical Interface

![](http://www.thomasjacquin.com/allsky-portal/screenshots/camera-settings.jpg)

If you don't want to configure the camera using the terminal, you can install the web based [graphical interface](https://github.com/thomasjacquin/allsky-portal).
Please note that this will change your hostname to **allsky** (or whatever you called it when installing), install the lighttpd web server, and replace your `/var/www/html` directory. It will also move `config/settings_*.json` to `/etc/raspap/settings_*.json`.
Using the Web user interface (WebUI) is **highly** recommended as it provides additional information on each setting and provides additional system information.

```shell
sudo gui/install.sh
```
Or if you don't want to use the default name of 'allsky' for your pi use the following:

```shell
sudo gui/install.sh piname
```

**Note:*** If you use an older version of Raspbian, the install script may fail on php7.0-cgi dependency. Edit `gui/install.sh` and replace php7.0-cgi by php5-cgi.

After you complete the WebUI setup, you'll be able to administer the camera using the web WebUI by navigating to
```sh
http://your_raspberry_IP
```
or
```sh
http://allsky.local
```

Note: If you changed the name of your pi during the WebUI install then use
```sh
http://piname.local
```

The default username is 'admin' and the default password is 'secret'.  If this website is publically viewable we suggest you change those settings.

A public page is also available in order to view the current image without having to log into the portal and without being able to do any administrative tasks. This can be useful for people who don't have a personal website but still want to share a view of their sky:

```sh
http://your_raspberry_IP/public.php
```

Make sure this page is publically viewable, i.e., is not behind a firewall.

**Note:*** The WebUI setup uses `/etc/raspap/settings_*.json` for the camera settings. If, for some reason, you prefer to go back to the non-WebUI version, make sure to edit your `config/config.sh` file to have `CAMERA_SETTINGS_DIR="${ALLSKY_HOME}/config"` instead.

## Dark frame subtraction

![](http://www.thomasjacquin.com/allsky-portal/screenshots/darkframe.jpg)

The dark frame subtraction feature removes hot pixels from night sky images. The concept is the following: Take an image with a cover on your camera lens and let the software subtract that image later from all images taken throughout the night.

You only need to follow these instructions once.

If you don't use the WebUI:
* Place a cover on your camera lens/dome.  Make sure no light can get in.
* Set `darkframe` to 1 in `config/settings_*.json`
* Restart the allsky service: `sudo systemctl restart allsky`
* Dark frames are created in a `darks` directory. A new dark is created every time the sensor temperature changes by 1 degree C.
* Set `darkframe` to 0 in `config/settings_*.json`
* Restart the allsky service: `sudo systemctl restart allsky`
* Remove the cover from the lens/dome
* Enable dark subtraction in `config/config.sh` by setting `DARK_FRAME_SUBTRACTION=true`

WebUI method:
* Place a cover on your camera lens/dome.  Make sure no light can get in.
* On the WebUI page, open the `Camera Settings` tab and set `Dark Frame` to Yes.
* Hit the Save button
* Dark frames are created in a `darks` directory. A new dark is created every time the sensor temperature changes by 1 degree C.
* On the Camera Settings tab set Dark Frame to No.
* Hit the `Save changes` button
* Remove the cover from the lens/dome
* Open the scripts editor tab, load `config/config.sh` and set `DARK_FRAME_SUBTRACTION=true`

The dark frame subtraction is temperature dependant.
Running the dark frame capture while ambiant temperature is varying results in a larger set of darks (1 per degree C).
During the night, the sensor temperature is used to select the most appropriate dark frame.
Dark frames are only subtracted from images taken at night.

## Timelapse

By default, a timelapse is generated at dawn from all of the images captured during last night.

To disable timelapse, open `config/config.sh` and set

```
TIMELAPSE=false
```

Example to generate a timelapse manually:

```
./scripts/timelapse.sh 20190322
```

**Note:** If you are unable to create a timelapse (typically it just dies part way through),
try creating or increasing the swap space.  2 GB is a good amount.
See https://pimylifeup.com/raspberry-pi-swap-file/ for details.
If that doesn't work, try reducing the size of the timelapse video.
This is especially true for Rasberry Pi 3 users who have less RAM memory than a Raspberry Pi 4.

## Keograms

![](http://www.thomasjacquin.com/allsky-portal/screenshots/keogram-annotated.jpg)

A **Keogram** is an image giving a quick view of the night activity. It was originally invented to study the aurora borealis.
For each image taken during the night, a central vertical column 1 pixel wide is extracted. All these columns are then stitched together from left to right. This results in a timeline that reads from dusk to dawn.

To get the best results, you will need to rotate your camera to have north at the top. That way, using a fisheye lens, you end up with the bottom of the keogram being the southern horizon and the top being the northern horizon.

Note that it will only show what happens at the meridian during the night and will not display events on the east or west.

The keogram program is used by the `scripts/endOfNight.sh` script.

The program can take multiple arguments:
```
Usage:  keogram -d <imagedir> -e <ext> -o <outputfile> [<other_args>]

Arguments:
-d | --directory <str> : directory from which to load images (required)
-e | --extension <str> : image extension to process (required)
-o | --output-file <str> : name of output file (required)
-r | --rotate <float> : number of degrees to rotate image, counterclockwise (0)
-s | --image-size <int>x<int> : only process images of a given size, eg. 1280x960
-h | --help : display this help message
-v | --verbose : Increase logging verbosity
-n | --no-label : Disable hour labels
-C | --font-color <str> : label font color, in HTML format (0000ff)
-L | --font-line <int> : font line thickness (3)
-N | --font-name <str> : font name (simplex)
-S | --font-size <float> : font size (2.0)
-T | --font-type <int> : font line type (1)

Font name is one of these OpenCV font names:
        Simplex, Plain, Duplex, Complex, Triplex, ComplexSmall, ScriptSimplex, ScriptComplex
Font Type is an OpenCV line type: 0=antialias, 1=8-connected, 2=4-connected
```

If your camera is not aligned in the north-south direction, you can use the optional `-r` | `--rotate` option to derotate the image before processing (rotation angle counterclockwise).

Example when running the program manually:
```
./keogram -d ./images/20180223/ -e jpg -o ./images/20180223/keogram/keogram.jpg --rotate 42 --font-size 2
```

To disable keograms, open `config/config.sh` and set

```
KEOGRAM=false
```

## Startrails

![](http://www.thomasjacquin.com/allsky-portal/screenshots/startrail.jpg)

**Startrails** can be generated by stacking all the images from a night on top of each other.

The startrails program is used by the `scripts/endOfNight.sh` script.

The program can take arguments:
```
Usage: startrails [-v] -d <dir> -e <ext> [-b <brightness> -o <output> | -s]

Arguments:
-h : display this help, then exit
-v : increase log verbosity
-s : print image directory statistics without producing image.
-d <str> : directory from which to read images
-e <str> : filter images to just this extension
-o <str> : output image filename
-S <int>x<int> : restrict processed images to this size
-b <float> : ranges from 0 (black) to 1 (white). Default 0.35
        A moonless sky may be as low as 0.05 while full moon can be as high as 0.4
```

Example when running the program manually:
```
./startrails -d ./images/20180223/ -e jpg -b 0.15 -o ./images/20180223/startrails/startrails.jpg
```

To disable automatic startrails, open `config/config.sh` and set

```
STARTRAILS=false
```

## Automatic deletion of archived nights

In order to keep the Raspberry Pi SD card from filling up, 2 settings have been added to `config/config.sh`. Automatic deletion is enabled by default and will keep 2 weeks of data on the card.
```
AUTO_DELETE=true
NIGHTS_TO_KEEP=14
```
Modify these values if you wish to increase/decrease the number of nights to retain on the card. Set to false to keep all nights (requires manual management of SD card free space).

## Logging issues

When using the allsky service, issues are written to a log file. In case the program stopped, crashed of behaved in an abnormal way, you can take a look at this log file:
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

If you have set the upload options to true in `config/config.sh`, that means you probably already have a website. If you want to display a live view of your sky on your website like in this [example](http://www.thomasjacquin.com/allsky), you can donwload the source files from this repository: [https://github.com/thomasjacquin/allsky-website.git](https://github.com/thomasjacquin/allsky-website.git).

If you want to host the website on the raspberry Pi, run the following command. Note that this website is installed on the same webserver as the WebUI. Currently, reinstalling the WebUI will wipe your website.

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
* version **0.8.1** Rearranged directory structure.
	* Renamed several variables in `config.sh` and `ftp-settings.sh`.
	* Many bug fixes.

## Donation

If you found this project useful, here's a link to send me a cup of coffee :)

[![](https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=MEBU2KN75G2NG&source=url)
