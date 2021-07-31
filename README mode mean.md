# Allsky Camera ![Release 0.7](https://img.shields.io/badge/Release-0.7-green.svg) [![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=MEBU2KN75G2NG&source=url)



This is the source code for the Wireless Allsky Camera project described [on Instructables](http://www.instructables.com/id/Wireless-All-Sky-Camera/).


![](http://www.thomasjacquin.com/allsky-portal/screenshots/camera-header-photo.jpg)

## Requirements

## Full installation (not testet !) 

Installation described in Readme should work (use https://github.com/AndreasLMeg/allsky.git)

## Test Installation

First stop allsky (eg. GUI / System / Stop Allsky)

Navigate to the allsky directory:
```shell
cd allsky
```

Make secure copy of capture_RPiHQ
```shell
cp capture_RPiHQ capture_RPiHQ_ori 
```

Back to home directory
```shell
cd ~
```

Now fetch the code from this GitHub page. Open the terminal and type the following:

```shell
git clone --recursive https://github.com/AndreasLMeg/allsky.git allsky_li
```

```shell
cd allsky_li
```

make new capture_RPiHQ
```shell
sudo make capture_RPiHQ
```

Copy new capture_RPiHQ to existing installation
```shell
cp capture_RPiHQ ~/allsky/capture_RPiHQ 
```

Make some config changes....some new lines in allsky.sh und config.sh

For Deinstallion stop allsky und restore secure copy of capture_RPiHQ
```shell
cd allsky
cp capture_RPiHQ_ori capture_RPiHQ 
``` 

And start Allsky - good luck !


## Configuration

Here's a quick overview of the configuration files (only for new mode mean).

the first one is called **settings.json**. It contains the camera parameters such as exposure, gain but also latitude, longitude, etc.

```shell
nano settings.json
```

| Setting     | Default     | Additional Info |
| ----------- | ----------- | ----------------|
| exposure | 10000 | No difference between night and day. Maximum value for time exposure in milliseconds.  If autogain=0 this value is used for all images |
| gain | 16 |No difference between night and day. Maximum value for gain. Varies from 0 to 16. If autogain=0 this value is used for all images|
| autogain | 0 | Set to 1 to allow auto-gain This mode will adjust the gain /exposure of images when the overall brightness of the sky changes (cloud cover, moon, aurora, etc).|

The second file called **config.sh** lets you configure the overall behavior of the camera. Options include functionalities such as upload, timelapse, dark frame location, keogram.

```shell
nano config.sh
```

| Configuration     | Default     | Additional Info |
| ----------- | ----------- | ----------------|
| MODE | 1 |  Mode 1: mean - Simple algorithm - the shutter speed and gain are adjusted based on the averaged exposure value |
| MEAN_VALUE | 0.5 | mode mean tries to make well exposed images |
| MEAN_THRESHOLD | 0.05 | underexposed: image < (mean value - threshold) -> increase shutter time or gain, overexposed: image > (mean value + threshold) -> decrease shutter time or gain | 
| MEAN_SHUTTERSTEPS | 3 | 1: shuttertime 1s, 2s, 4s, 8s,...  3:  1s, 1,26s, 1,59s, 2s   (For step ...-2, -1, 0, 1, 2, ... -> 2^(step/shuttersteps)) |
| MEAN_FASTFORWARD | 4.0 | magic number to speeed up fastforward (be carefule changing this value) |
| MEAN_LONGPLAY | 0 | 1: deactivate image captureinterval (camera setting: exposure). You will get much more images ! | 
| MEAN_HISTORYSIZE | 3 | 3: the last 3 image are taken to calculate the mean value |
| MEAN_KP | 1 | experimental parameter - not used |
| MEAN_MASKHORIZON | 0 | 1: You will get a mask_template.jpg  - the live view plus some grid lines. Use color WHITE for all ares you want to see and BLACK to remove unwanted areas. Save the image as mask.jpg |
| MEAN_INFO | 0 | 1: show some debug infos in the image |


### Other scripts of interest

**allsky.sh** you have to add some code line to activate the new mode

nano is a text editor. Hit **ctrl + x**, followed by **y** and **Enter** in order to save your changes.

serach for "# Building the arguments to pass to the capture binary" and add the lines for user defined mode

```
# Building the arguments to pass to the capture binary
ARGUMENTS=""
KEYS=( $(jq -r 'keys[]' $CAMERA_SETTINGS) )
for KEY in ${KEYS[@]}
do
	ARGUMENTS="$ARGUMENTS -$KEY `jq -r '.'$KEY $CAMERA_SETTINGS` "
done

# user defined mode
if [[ $CAMERA == "RPiHQ" && $MODE -eq "1" ]]; then
  echo "mode mean"
  ARGUMENTS="$ARGUMENTS -mode 1 "
  if [ -z ${MEAN_VALUE+x} ]; then echo "MEAN_VALUE is unset"; else ARGUMENTS="$ARGUMENTS -mean-value $MEAN_VALUE "; fi
  if [ -z ${MEAN_THRESHOLD+x} ]; then echo "MEAN_THRESHOLD is unset"; else ARGUMENTS="$ARGUMENTS -mean-threshold $MEAN_THRESHOLD "; fi
  if [ -z ${MEAN_SHUTTERSTEPS+x} ]; then echo "MEAN_SHUTTERSTEPS is unset"; else ARGUMENTS="$ARGUMENTS -mean-shuttersteps $MEAN_SHUTTERSTEPS "; fi
  if [ -z ${MEAN_FASTFORWARD+x} ]; then echo "MEAN_FASTFORWARD is unset"; else ARGUMENTS="$ARGUMENTS -mean-fastforward $MEAN_FASTFORWARD "; fi
  if [ -z ${MEAN_LONGPLAY+x} ]; then echo "MEAN_LONGPLAY is unset"; else ARGUMENTS="$ARGUMENTS -mean-longplay $MEAN_LONGPLAY "; fi
  if [ -z ${MEAN_HISTORYSIZE+x} ]; then echo "MEAN_HISTORYSIZE is unset"; else ARGUMENTS="$ARGUMENTS -mean-historySize $MEAN_HISTORYSIZE "; fi
  if [ -z ${MEAN_KP+x} ]; then echo "MEAN_KP is unset"; else ARGUMENTS="$ARGUMENTS -mean-kp $MEAN_KP "; fi
  if [ -z ${MEAN_MASKHORIZON+x} ]; then echo "MEAN_MASKHORIZON is unset"; else ARGUMENTS="$ARGUMENTS -mean-maskHorizon $MEAN_MASKHORIZON "; fi
  if [ -z ${MEAN_BRIGHTNESSCONTROL+x} ]; then echo "MEAN_BRIGHTNESSCONTROL is unset"; else ARGUMENTS="$ARGUMENTS -mean-brightnessControl $MEAN_BRIGHTNESSCONTROL "; fi
  if [ -z ${MEAN_INFO+x} ]; then echo "MEAN_INFO is unset"; else ARGUMENTS="$ARGUMENTS -mean-info $MEAN_INFO "; fi
fi
```

**endOfNight.sh** some useful parameters for keogramm

```
        ../keogram $ALLSKY_HOME/images/$LAST_NIGHT/ $EXTENSION $ALLSKY_HOME/images/$LAST_NIGHT/keogram/keogram-$LAST_NIGHT.$EXTENSION -fontsize 1.0 -fontline 1 -fontcolor 128 128 128 -finishline 819 -addRow 2
```

| Paramter     | Default     | Additional Info |
| ----------- | ----------- | ----------------|
| -finishline | 1/2 of image |  A column of all images is lined up. This gives a rough overview of the pictures from the whole night. With this parameter you can now choose another column. (Center of rotation, ...)|
| -addRow | 0 |  In case of short nights or high resolution you will get thin keograms. (1:) add the same row twice or more to get a "good" image.
(2:) add the neighbor column(s). So you can see the transit of one star.|


## Usage

### Activation

Change parameter in config.sh and camera settings.


### Exif information

All images should have exif information "Artist=li_1000000_1".  -> shuttertime: 1000000µs, gain=1  

