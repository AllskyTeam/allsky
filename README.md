# Allsky Camera ![Release 0.7](https://img.shields.io/badge/Release-0.7-green.svg) [![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=MEBU2KN75G2NG&source=url)



This is the source code for the Wireless Allsky Camera project described [on Instructables](http://www.instructables.com/id/Wireless-All-Sky-Camera/).


![](http://www.thomasjacquin.com/allsky-portal/screenshots/camera-header-photo.jpg)

## Requirements

In order to get the camera working properly you will need the following hardware:

 * A camera (Tested cameras include Raspberry Pi HQ camera, ASI120MC*, ASI120MM*, ASI120MC-S, ASI120MM-S, ASI224MC, ASI178MC, ASI185MC, ASI290MC, ASI1600MC
 * A Raspberry Pi (2, 3, 4 or zero)

**Note:*** Owners of USB2.0 cameras such as ASI120MC and ASI120MM may need to do a [firmware upgrade](https://astronomy-imaging-camera.com/software/) (This changes the camera to use 512 byte packets instead of 1024 which makes it more compatible with most hardware.)

The Datyson T7 camera seems to be supported as well. The firmware needs to be upgraded with ZWO's compatible firmware (see link above) and you'll need to add this line in /boot/config.txt: `program_usb_boot_mode=0`

## Installation

**New:** PatriotAstro created a [video](https://www.youtube.com/watch?v=j9xHsST2EeY) describing the installation steps below. Feel free to check it out if you prefer video tutorials or if you're new to Linux and Raspberry Pi projects.

You will need to install Raspbian on your Raspberry Pi. Follow [this link](https://www.raspberrypi.org/documentation/installation/installing-images/) for information on how to do it.

Make sure you have a working internet connection by setting it either through the GUI or [the terminal](https://www.raspberrypi.org/documentation/configuration/wireless/wireless-cli.md).

Start by installing git. You may already have it installed:

```shell
sudo apt-get install git
```

Now fetch the code from this GitHub page. Open the terminal and type the following:

```shell
git clone --recursive https://github.com/thomasjacquin/allsky.git
```

Then navigate to the allsky directory:

```shell
cd allsky
```

Now, run the install script:

```shell
sudo ./install.sh
```

## Update

There is no 1-click update yet so until then, the easiest is to backup your config files, delete the allsky directory and follow the installation instructions again.

## Configuration

Here's a quick overview of the configuration files.

the first one is called **settings.json**. It contains the camera parameters such as exposure, gain but also latitude, longitude, etc.

```shell
nano settings.json
```

| Setting     | Default     | Additional Info |
| ----------- | ----------- | ----------------|
| width | 0 | 0 means max width. Look up your camera specifications to know what values are supported |
| height | 0 |  0 means max height. Look up your camera specifications to know what values are supported |
| exposure | 10000 | **Night** time exposure in milliseconds. During the day, auto-exposure is used. |
| maxexposure | 20000 | This is the maximum exposure for **night** images when using auto-exposure. During the day, auto-exposure is always used. |
| autoexposure | 1 | Set to 0 to disable auto-exposure at **night**. Auto-exposure delivers properly exposed images throughout the night even if the overall brightness of the sky changes (cloud cover, moon, aurora, etc). When set to 1, *maxexposure* value will be used as the delay between timelapse frames. |
| gain | 50 | Gain for **Night** images. Varies from 0 to 600. During the day, gain is always set to 0 |
| maxgain | 200 | Maximum gain for **night** images when using auto-gain.|
| autogain | 0 | Set to 1 to allow auto-gain at **night**. This mode will adjust the gain of night images when the overall brightness of the sky changes (cloud cover, moon, aurora, etc). **Avoid using autoexposure and autogain together** as it produces unpredicatble results (dark frames, but not always).|
| gamma | 50 | Varies between 0 and 100. This setting increases or decreases contrast between dark and bright areas. |
| brightness | 50 | Varies between 0 and 100. This setting changes the amount of light in the image. |
| wbr | 53 | Varies between 0 and 100. This is the intensity of the red component of the image. |
| wbb | 90 | Varies between 0 and 100. This is the intensity of the blue component of the image. |
| bin | 1 | bin 2 collects the light from 2x2 photosites to form 1 pixel on the image. bin 3 uses 3x3 photosites, etc. Increasing the bin results in smaller images and reduces the need for long exposure. Look up your camera specifications to know what values are supported |
| delay | 10 | Time in milliseconds to wait between 2 frames at night. |
| daytimeDelay | 5000 | Time in milliseconds to wait between 2 frames during the day. |
| type | 1 | Image format. 0=RAW 8 bits, 1=RGB 24 bits, 2=RAW 16 bits |
| quality | 95 | Compression of the image. 0(low quality) to 100(high quality) for JPG images, 0 to 9 for PNG |
| usb | 40 | This is the USB bandwidth. Varies from 40 to 100. |
| filename | image.jpg | this is the name used across the app. Supported extensions are JPG and PNG. |
| flip | 0 | 0=Original, 1=Horizontal, 2=Vertical, 3=Both |
| text | text | Text overlay. **Note**: It is replaced by timestamp if time=1 |
| extratext | | (ZWO ONLY) The FULL path to a text file which will be displayed under the Exposure/Gain. The file can contain multiple lines which will be displayed underneath each other |
| extratextage | 600 | (ZWO ONLY) If using the extra text file then it must be updated within this number of seconds, if not it will not be displayed. Set to 0 to ignore this check and always didplay it |
| textlineheight | 30 | (ZWO ONLY) The line height of the text displayed in the image, if you chnage the font size the adjust this value if required |
| textx | 15 | Horizontal text placement from the left |
| texty | 35 | Vertical text placement from the top |
| fontname | 0 | Font type for the overlay. 0=Simplex, 1=Plain, 2=Duplex, 3=Complex, 4=Triplex, 5=Complex small, 6=Script simplex, 7=Script complex |
| fontcolor | 255 255 255 | Font color in BGR. NOTE: When using RAW 16 only the B and G values are used i.e. 255 128 0 |
| smallfontcolor | 0 0 255 | Small Font color in BGR. NOTE: When using RAW 16 only the B and G values are used i.e. 255 128 0 |
| fontsize | 7 | Font size |
| fonttype | 0 | Controls the smoothness of the fonts. 0=Antialiased, 1=8 Connected, 2=4 Connected. |
| fontline | 1 | font line thickness |
| latitude | 60.7N | Latitude of the camera. N for North and S for South
| longitude | 135.05W | longitude of the camera. E for East and W for West |
| angle | -6 | Altitude of the sun above or below the horizon at which capture should start/stop. Can be negative (sun below horizon) or positive (sun above horizon). 0=Sunset, -6=Civil twilight, -12=Nautical twilight, -18=Astronomical twilight.
| time | 1 | Replaces the text overlay |
| darkframe | 0 | Set to 1 to enable dark frame capture. In this mode, overlays are hidden and the image is saved as dark.png by default |
| showDetails | 1 | Displays the exposure, gain and temperature in the overlay |

The second file called **config.sh** lets you configure the overall behavior of the camera. Options include functionalities such as upload, timelapse, dark frame location, keogram.

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
| FPS | 25 | The timelapse frame rate (frames per second)
| KEOGRAM | true | Builds a keogram at the end of the night |
| UPLOAD_KEOGRAM | false | Set to true to upload the keogram to your server |
| STARTRAILS | true | Stacks images to create a startrail at the end of the night |
| BRIGHTNESS_THRESHOLD | 0.1 | Brightness level above which images are discarded (moon, head lights, aurora, etc) |
| UPLOAD_STARTRAILS | false | Set to true to uplad the startrails to your server |
| AUTO_DELETE | true | Enables automatic deletion of old images and videos |
| NIGHTS_TO_KEEP | 14 | Number of nights to keep before starting deleting. Needs AUTO_DELETE=true to work. |
| DARK_FRAME_SUBTRACTION | false | Set to true to enable hot pixels subtraction at night. |
| DAYTIME | 1 | Set to 0 to disable daytime liveview. |
| CAPTURE_24HR | false | Set to true to save images during both night and day |
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
| CAMERA_SETTINGS | /home/pi/allsky/settings.json | Path to the camera settings file. **Note**: If using the GUI, this path will change to /etc/raspap/settings.json |

When using the cropping options the image is cropped from the center so you will need to experiment with the correct width and height values. Normally there will be no need to amend the offset values.

In order to upload images and videos to your website, you'll need to fill your FTP or Amazon S3 connection details in **ftp-settings.sh**
```shell
nano scripts/ftp-settings.sh
```

| Configuration     | Default     | Additional Info |
| ----------- | ----------- | ----------------|
| PROTOCOL | ftp | Choose between `ftp`, `sftp`, `S3` or `local` |
| USER | username | Your ftp user name |
| PASSWORD | password | Your ftp password |
| HOST | example.com | Your host server or IP |
| IMGDIR | /allsky/ | The absolute path to your image-resize.jpg on the server |
| MP4DIR | /allsky/videos/ | The absolute path to your videos directory on the server |
| KEOGRAM_DIR | /allsky/keograms/ | The absolute path to your keograms directory on the server |
| STARTRAILS_DIR | allsky/startrails/ | The absolute path to your startrails directory on the server |


### Other scripts of interest

**saveImageNight.sh** is called every time the camera takes a new image at night. If dark subtraction is enabled, this is where it happens

**saveImageDay.sh** is called every time the camera takes a new image during the day.

At the end of the night **endOfNight.sh** is run. It calls a few other scripts based on your config.sh content.

nano is a text editor. Hit **ctrl + x**, followed by **y** and **Enter** in order to save your changes.

## Usage

### Autostart

Systemd is used to launch the software automatically when the Raspberry Pi boots up. To enable or disable this behavior, you can use these commands.

```
sudo systemctl enable allsky.service
sudo systemctl disable allsky.service
```
**Note:*** The service is enabled by default.

When you want to start, stop or restart the program, you can use one of the following commands:
```shell
sudo service allsky start
sudo service allsky stop
sudo service allsky restart
```
To know the status of the allsky software, type:
```shell
sudo service allsky status
```

### Manual Start
Starting the program from the terminal can be a great way to track down issues as it provides debug information.
To start the program manually, make sure you first stop the service and run:
```
./allsky.sh
```
If you are using a desktop environment (Pixel, Mate, LXDE, etc) or using remote desktop or VNC, you can add the `preview` argument in order to show the images the program is currently saving.
```
./allsky.sh preview
```


## Graphical Interface

![](http://www.thomasjacquin.com/allsky-portal/screenshots/camera-settings.jpg)

If you don't want to configure the camera using the terminal, you can install the web based [graphical interface](https://github.com/thomasjacquin/allsky-portal).
Please note that this will change your hostname to allsky (or whatever you called it when installing), install lighttpd and replace your /var/www/html directory. It will also move settings.json to `/etc/raspap/settings.json`.

```shell
sudo gui/install.sh
```
Or if you don't want to use the default name of 'allsky' for your pi use the following

```shell
sudo gui/install.sh piname
```

**Note:*** If you use an older version of Raspbian, the install script may fail on php7.0-cgi dependency. Edit gui/install.sh and replace php7.0-cgi by php5-cgi.

After you complete the GUI setup, you'll be able to administer the camera using the web UI by navigating to
```sh
http://your_raspberry_IP
```
or
```sh
http://allsky.local
```

Note: If you changed the name of your pi during the gui install then use
```sh
http://piname.local
```

The default username is 'admin' and the default password is 'secret'.

A public page is also available in order to view the current image without having to log into the portal. This can be useful for people who don't have a personal website but still want to share a view of their sky :

```sh
http://your_raspberry_IP/public.php
```

**Note:*** The GUI setup uses /etc/raspap/settings.json for the camera settings. If, for some reason, you prefer to go back to the non-gui version, make sure to edit your config.sh file to have CAMERA_SETTINGS="settings.json" instead.

## Dark frame subtraction

![](http://www.thomasjacquin.com/allsky-portal/screenshots/darkframe.jpg)

The dark frame subtraction feature was implemented to remove hot pixels from night sky images. The concept is the following: Take an image with a cover on your camera lens and subtract that image later to all images taken throughout the night.

You only need to follow these instructions once.

If you don't use the GUI:
* Place a cover on your camera lens/dome
* Set darkframe to 1 in settings.json
* Restart the allsky service: ```sudo service allsky restart```
* Dark frames are created in a `darks` directory. A new dark is created every time the sensor temperature changes by 1 degree C.
* Set darkframe to 0 in settings.json
* Restart the allsky service: ```sudo service allsky restart```
* Remove the cover from the lens/dome
* Enable dark subtraction in `config.sh` by setting `DARK_FRAME_SUBTRACTION` to true

GUI method:
* Place a cover on your camera lens/dome
* Open the Camera Settings tab and set Dark Frame to Yes.
* Hit the Save button
* Dark frames are created in a `darks` directory. A new dark is created every time the sensor temperature changes by 1 degree C.
* On the Camera Settings tab and set Dark Frame to No.
* Hit the Save button
* Remove the cover from the lens/dome
* Open the scripts editor tab, load `config.sh` and set `DARK_FRAME_SUBTRACTION` to true

The dark frame subtraction is temperature dependant.
Running the dark frame capture while ambiant temperature is varying results in a larger set of darks (1 per degree C).
During the night, the sensor temperature is used to select the most appropriate dark frame.
Dark frames are only subtracted from images taken at night.

## Timelapse

By default, a timelapse is generated at dawn from all of the images captured during last night.

To disable timelapse, open **config.sh** and set

```
TIMELAPSE=false
```

Example to generate a timelapse manually:

```
./scripts/timelapse.sh 20190322
```

## Keograms

![](http://www.thomasjacquin.com/allsky-portal/screenshots/keogram-annotated.jpg)

A **Keogram** is an image giving a quick view of the night activity. It was originally invented to study the aurora borealis.
For each image taken during the night, a central vertical column 1 pixel wide is extracted. All these columns are then stitched together from left to right. This results in a timeline that reads from dusk to dawn.

To get the best results, you will need to rotate your camera to have north at the top. That way, using a fisheye lens, you end up with the bottom of the keogram being the southern horizon and the top being the northern horizon.

Note that it will only show what happens at the meridian during the night and will not display events on the east or west.

The keogram program is used by the `endOfNight.sh` script.

The program takes 3 arguments:
- Source directory
- File extension
- Output file

and 7 optional arguments:
-no-label
-fontname
-fontcolor
-fonttype
-fontsize
-fontline
-rotate

If your camera is not aligned in the north-south direction, you can use the optional `-rotate` option to derotate the image before processing (rotation angle counterclockwise).

Example when running the program manually:
```
./keogram ./images/20180223/ jpg ./images/20180223/keogram/keogram.jpg -rotate 42 -fontsize 2
```

To disable keograms, open **config.sh** and set

```
KEOGRAM=false
```

## Startrails

![](http://www.thomasjacquin.com/allsky-portal/screenshots/startrail.jpg)

**Startrails** can be generated by stacking all the images from a night on top of each other.

The startrails program is used by the `endOfNight.sh` script.

The program takes 4 arguments:
- Source directory
- File extension
- Brightness treshold to avoid over-exposure: 0 (black) to 1 (white).
- Output file

Example when running the program manually:
```
./startrails ./images/20180223/ jpg 0.15 ./images/20180223/startrails/startrails.jpg
```

To disable automatic startrails, open **config.sh** and set

```
STARTRAILS=false
```

## Automatic deletion of archived nights

In order to keep the Raspberry Pi SD card from filling up, 2 settings have been added to **config.sh**. Automatic deletion is enabled by default and will keep 2 weeks of data on the card.
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

If you want to modify a compiled file, you'll need to edit the corresponding .cpp file and run the following command from the root of the allsky directory:
```shell
make all
```
This will compile the new code and create a new binary.

## Show your sky on your own website

If you have set the upload options to true in `config.sh`, that means you probably already have a website. If you want to display a live view of your sky on your website like in this [example](http://www.thomasjacquin.com/allsky), you can donwload the source files from this repository: [https://github.com/thomasjacquin/allsky-website.git](https://github.com/thomasjacquin/allsky-website.git).

If you want to host the website on the raspberry Pi, run these commands:

```
cd /var/www/html
git clone github.com/thomasjacquin/allsky-website.git
mv allsky-website allsky
```

And set these variabled in `ftp-settings.sh`:
```
PROTOCOL = 'local'
IMGDIR = '/var/www/html/allsky/'
MP4DIR = `/var/www/html/allsky/videos`
KEOGRAM_DIR = `/var/www/html/allsky/keograms`
STARTRAILS_DIR = `/var/www/html/allsky/startrails`
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
	* When using the GUI, camera options can be saved without rebooting the RPi.
	* Added a publicly accessible preview to the GUI: public.php
	* Changed exposure unit to milliseconds instead of microseconds
* version **0.7**: Added Raspberry Pi camera HQ support (Based on Rob Musquetier's fork)
	* Support for x86 architecture (Ubuntu, etc)
	* Temperature dependant dark frame library
	* Browser based script editor
	* Configuration variables to crop black area around image
	* Timelapse frame rate setting
	* Changed font size default value

## Donation

If you found this project useful, here's a link to send me a cup of coffee :)

[![](https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=MEBU2KN75G2NG&source=url)
