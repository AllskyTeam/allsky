# Allsky Camera

This is the source code for the Wireless Allsky Camera project described [on Instructables](http://www.instructables.com/id/Wireless-All-Sky-Camera/).

![](http://www.thomasjacquin.com/allsky-portal/screenshots/camera-header-photo.jpg)

## Requirements

In order to get the camera working properly you will need the following hardware:

 * An ASI camera from ZWO. Tested cameras include ASI120MC*, ASI120MM*, ASI120MC-S, ASI120MM-S, ASI224MC, ASI178MC, ASI185MC, ASI1600MC
 * A Raspberry Pi 2 or 3
 * A USB wireless dongle if using a Pi 2. [This one](https://www.amazon.ca/Edimax-EW-7811Un-150Mbps-Raspberry-Supports/dp/B003MTTJOY) has been tested.

**Note:*** Owners of USB2.0 cameras such as ASI120MC and ASI120MM will need to do a [firmware upgrade](https://astronomy-imaging-camera.com/software/) (This changes the camera to use 512 byte packets instead of 1024 which makes it more compatible with most hardware.) A Linux [kernel patch](http://zwoug.org/viewtopic.php?f=17&t=7132) may also be necessary to fix segmented images and improve frame rate.

## Installation

You will need to install Raspbian on your Raspberry Pi. Follow [this link](https://www.raspberrypi.org/documentation/installation/installing-images/) for information on how to do it.

Make sure you have a working internet connection by setting it either through the GUI or [the terminal](https://www.raspberrypi.org/documentation/configuration/wireless/wireless-cli.md). 

Start by installing git. You may already have it installed:

```shell
sudo apt-get install git
```

Now fetch the code from this GitHub page. Open the terminal and type the following:

```shell
git clone https://github.com/thomasjacquin/allsky.git
```

Then navigate to the allsky directory:

```shell
cd allsky
```
Now, before running the install script, if you're running a Pi 2, it may not be compatible with armv7 architecture. Run ```cat /proc/cpuinfo``` to know your processor model. If it doesn't say ARMv7, you'll need to change the first line of Makefile to say ```platform = armv6```

Now, run the install script:

```shell
sudo ./install.sh
```

**Important**: Unplug and replug the camera to trigger the new udev rules otherwise you'll get an error about permissions later.

## Update

There is no 1-click update yet so until then, the easiest is to backup your config files, delete the allsky directory and follow the installation instructions again.

## Configuration

Here's a quick overview of the configuration files. 

the first one is called **settings.json**. It contains the camera parameters such as exposure, gain but also latitude, longitude, etc.

```shell
nano settings.json
```
The second file called **config.sh** lets you configure the overall behavior of the camera. Options include functionalities such as upload, timelapse, dark frame location, keogram.

```shell
nano config.sh
```
In order to upload images and videos to your website, you'll need to fill your FTP connection details in **ftp-settings.sh**
```shell
nano scripts/ftp-settings.sh
```
**saveImage.sh** is called every time the camera take a new image. You can play with this file in case your sensor is not dead center.

At the end of the night **endOfNight.sh** is run. It calls a few other scripts based on your config.sh content.

nano is a text editor. Hit **ctrl + x**, followed by **y** and **Enter** in order to save your changes.

## Usage

The allsky.sh script is launched automatically when the Raspberry Pi boots up. To disable this feature, open /home/pi/.config/lxsession/LXDE-pi/autostart and remove the allsky line.

If you want to start the program manually, navigate to the allsky directory and type:
```shell
./allsky.sh
```

## Graphical Interface

![](http://www.thomasjacquin.com/allsky-portal/screenshots/camera-settings.jpg)

If you don't want to configure the camera using the terminal, you can install the web based [graphical interface](https://github.com/thomasjacquin/allsky-portal).
Please note that this will change your hostname to allsky, install lighttpd and replace your /var/www/html directory. It will also move settings.json to /var/www/html.

```shell
sudo gui/install.sh
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

The default username is 'admin' and the default password is 'secret'.

**Note:*** The GUI setup uses /var/www/html/settings.json for the camera settings. If, for some reason, you prefer using the non-gui version (launching allsky.sh from terminal), make sure to edit your config.sh file to have CAMERA_SETTINGS="settings.json" instead.

## Dark frame subtraction

![](http://www.thomasjacquin.com/allsky-portal/screenshots/darkframe.jpg)

The dark frame subtraction feature was implemented to remove hot pixels from night sky images. The concept is the following: Take an image with a cover on your camera lens and subtract that image later to all images taken during the night.

You only need to follow these instructions once.

Manual method:
* make sure config.sh has a DARK_FRAME configuration. Default is "dark.png"
* Place a cover on your camera dome
* Set darkframe to 1 in settings.json
* Reboot the Raspberry Pi: ```sudo reboot now```
* A new file has been created at the root of the project: dark.png by default
* Set darkframe to 0 in settings.json
* Reboot the Raspberry Pi: ```sudo reboot now```
* Remove the cover on the dome

GUI method:
* make sure config.sh has a DARK_FRAME configuration. Default is "dark.png"
* Place a cover on your camera dome
* Open the Camera Settings tab and set Dark Frame to Yes.
* Hit the Save and Reboot button
* A new file has been created at the root of the project: dark.png by default
* Open the Camera Settings tab and set Dark Frame to No.
* Hit the Save and Reboot button
* Remove the cover on the dome

The dark frame is now created and will always be subtracted from captured images. In case the outside temperature varies significantly and you start seeing more / less hot pixels, you can run theses instructions again to create a new dark frame.

## Timelapse

By default, a timelapse is generated at dawn from all of the images captured during last night.

To disable timelapse, open **config.sh** and set

```
TIMELAPSE=false
```

## Keograms

![](http://www.thomasjacquin.com/allsky-portal/screenshots/keogram-annotated.jpg)

A **Keogram** is an image giving a quick view of the night activity. It was originally invented to study the aurora borealis.
For each image taken during the night, a central vertical column 1 pixel wide is extracted. All these columns are then stitched together from left to right. This results in a timeline that reads from dusk to dawn.

To get the best results, you will need to rotate your camera to have north at the top. That way, using a fisheye lens, you end up with the bottom of the keogram being the southern horizon and the top being the northern horizon.

Note that it will only show what happens at the meridian during the night and will not display events on the east or west.

To activate keograms, open **config.sh** and set

```
KEOGRAM=true
```

## Usage without desktop environments

If you're using Raspbian lite or another distribution without a desktop environment, make sure to set the nodisplay option to 1 in settings.json.


## Compile your own version

If you want to modify the software, you'll need to edit capture.cpp and run the following command from the root of the allsky directory:
```shell
make capture
```
This will compile the new code and create a new "capture" binary.


## Share your sky

If you built an allsky camera, please send me a message and I'll add you to the [map](http://www.thomasjacquin.com/allsky-map).

![](http://www.thomasjacquin.com/allsky-map/screenshots/allsky-map-with-pins.jpg)

## Release notes

* version **0.1**: Initial release
* version **0.2**: Separated camera settings from code logic
* version **0.3**: Added dark frame subtraction
* version **0.4**: Added Keograms (summary of the night in one image)
