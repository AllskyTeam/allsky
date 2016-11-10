# Allsky Camera

This is the source code for the Wireless Allsky Camera project described [on Instructables](http://www.instructables.com/id/Wireless-All-Sky-Camera/).


## Requirements

In order to get the camera working properly you will need the following hardware:

 * An ASI camera from ZWO. Tested cameras include ASI120MC, ASI224MC
 * A Raspberry Pi 2 or 3
 * A USB wireless dongle if using a Pi 2. [This one](https://www.amazon.ca/Edimax-EW-7811Un-150Mbps-Raspberry-Supports/dp/B003MTTJOY) has been tested.

## Installation

You will need to install Raspbian on your Raspberry Pi. Follow [this link](https://www.raspberrypi.org/documentation/installation/installing-images/) for information on how to do it.

Make sure you have a working internet connection by setting it either through the GUI or [the terminal](https://www.raspberrypi.org/documentation/configuration/wireless/wireless-cli.md). 

Start by fetching the code from this GitHub page. Open the terminal and type the following:

```shell
clone https://github.com/thomasjacquin/allsky.git
```

Then navigate to the allsky directory:

```shell
cd allsky
```

Then make the install script executable:

```shell
chmod +x install.sh
```

Now, run the install script:

```shell
sudo ./install.sh
```

Unplug and replug the camera to trigger the new udev rules.

You can now start the camera by typing the following:

```shell
./allsky.sh
```

Note: If you don't want to use the X server, make sure you type this in the console before launching ./allsky.sh:

```shell
export DISPLAY=:0.0
```
