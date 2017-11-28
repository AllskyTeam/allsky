# Allsky Camera

This is the source code for the Wireless Allsky Camera project described [on Instructables](http://www.instructables.com/id/Wireless-All-Sky-Camera/).


## Requirements

In order to get the camera working properly you will need the following hardware:

 * An ASI camera from ZWO. Tested cameras include ASI120MC*, ASI120MM*, ASI120MC-S, ASI120MM-S, ASI224MC, ASI178MC, ASI185MC
 * A Raspberry Pi 2 or 3
 * A USB wireless dongle if using a Pi 2. [This one](https://www.amazon.ca/Edimax-EW-7811Un-150Mbps-Raspberry-Supports/dp/B003MTTJOY) has been tested.

**Note:*** ASI120MC and ASI120MM owners will need to do a [firmware upgrade](https://astronomy-imaging-camera.com/software/) (This changes the camera to use 512 byte packets instead of 1024 which makes it more compatible with most hardware.)

## Installation

You will need to install Raspbian on your Raspberry Pi. Follow [this link](https://www.raspberrypi.org/documentation/installation/installing-images/) for information on how to do it.

Make sure you have a working internet connection by setting it either through the GUI or [the terminal](https://www.raspberrypi.org/documentation/configuration/wireless/wireless-cli.md). 

If you are running a lite version of Raspbian, you probably don't have git yet. Install it now:

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

## Configuration

You need to configure your settings such as latitude, longitude, exposure, gain, etc.
Open the file called settings.json and modify the values to fit your needs:
```shell
nano settings.json
```
You also need to configure your FTP connection if you want to upload a live view image periodically to your website.
```shell
nano config.sh
```
nano is a text editor. Hit **ctrl + x**, followed by **y** and **Enter** in order to save your changes.

## Usage

You can now start the camera by typing the following:
```shell
./allsky.sh
```
This script is launched automatically when the Raspberry Pi boots up. To disable this feature, open /home/pi/.config/lxsession/LXDE-pi/autostart and remove the allsky line

## Graphical Interface

If you don't want to configure the camera using the terminal, you can install the web based [graphical interface](https://github.com/thomasjacquin/allsky-portal).
Please note that this will change your hostname to allsky, install lighttpd and replace your /var/www/html directory.
```shell
sudo gui/install.sh
```
After you complete the GUI setup, you'll be able to administer the camera using the web UI by navigating to
```sh
http://your_raspberry_IP
```
or
```sh
http://allsky.local
```

The default username is 'admin' and the default password is 'secret'.

## Usage without desktop environments

If you're using Raspbian lite or another distribution without desktop environment, make sure to set the nodisplay option to 1 in settings.json.


## Compile your own version

If you want to modify the software, you'll need to edit capture.cpp and run the following command from the root of the allsky directory:
```shell
make capture
```
This will compile the new code and create a new "capture" binary.

## Release notes

* version **0.1**: Initial release
* version **0.2**: Separated camera settings from code logic 
