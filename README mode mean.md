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

Make some config changes....

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
| MODE | 1 |  Mode 1: mean - Simple algorithm - the shutter speed and gain are adjusted based on the averaged exposure value
| MEAN_VALUE | 0.5 | mode mean tries to make well exposed images   
| MEAN_THRESHOLD | 0.05 | underexposed: image < (mean value - threshold) -> increase shutter time or gain, overexposed: image > (mean value + threshold) -> decrease shutter time or gain  
| MEAN_SHUTTERSTEPS | 3 | 1: shuttertime 1s, 2s, 4s, 8s,...  3:  1s, 1,26s, 1,59s, 2s   (For step ...-2, -1, 0, 1, 2, ... -> 2^(step/shuttersteps))



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
  ARGUMENTS="$ARGUMENTS -mean-value $MEAN_VALUE " 
  ARGUMENTS="$ARGUMENTS -mean-threshold $MEAN_THRESHOLD " 
  ARGUMENTS="$ARGUMENTS -mean-shuttersteps $MEAN_SHUTTERSTEPS " 
fi
```


## Usage

### Activation

Change parameter in config.sh and camera settings.


### Exif information

All images should have exif information "Artist=li_1000000_1".  -> shuttertime: 1000000µs, gain=1  

