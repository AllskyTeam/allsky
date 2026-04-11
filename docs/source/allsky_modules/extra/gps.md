---
tags:
  - Extra Module
  - Pipeline Periodic
  - Hardware Required 
---


This module allows you to read latitude, longitude and time from a GPS attached to the pi. This module requires gpsd to be installed, the module installer will install this if its not present.

!!! warning  "Pi Noise"

    NOTE: The HDMI and Wifi on the Pi 4 is VERY noisy and will interfere with most GPS modules. To get around this please ensure that the GPS receiver and antenna is mounted at least one meter (three feet) away from the Pi.

    Time synchronisation

## Settings

### Settings Tab

| Setting | Description |
|--------|-------------|
| LAT/LON Warning | If enabled a warning will be generated, both in the log files and as an Allsky variable if the GPS position does not match your Latitude and Longitude. The comparison is done to 2 decimal places to allow for GPS fluctuation |
| Set LAT/LON | If enabled your Latitude and Longitude will be set from the GPS |
| Set Time | If enabled the time on the Pi will be set from the GPS |
| Set Every | If the "Set Time" option is enabled the time on the Pi will be set every this number of seconds |
| Extra Data Filename | The name of the file to create the GPS data in for the Overlay Manager. Normally you will not need to change this |
| Discrepancy Warning | if the "Lat/Lon Warning" is enabled and a discrepancy is found this text will be set in the variable for the Overlay Manager |

### Obfuscation Tab
| Setting | Description |
|--------|-------------|
| Obfuscate Position | If enabled the values below will be used to modify the GPS position. This is designed to allow you to display the GPS position on an overlay without giving away your exact position |
| Latitude Metres | The number of metres to offset the latitude by. Can be a positive or negative number |
| Longitude Metres | The number of metres to offset the longitude by. Can be a positive or negative number |


## Setting Location
The module has the ability to set your lat and lon in the main Allsky settings from the GPS data. 

If you are concerned about your exact location being set then the module contains settings allowing these values to be randomly adjusted to help obfuscate your exact location

## Setting the time

  Even if you set the time sync options in the GPS module the time will only be synchronised if the Pi is NOT having its time updated from the Internet. To test if the time is currently being synchronised from the Internet enter the following command:

  ```timedatectl status```

  Output similar to the following will be produced:


                Local time: Fri 2023-02-03 23:18:36 GMT
            Universal time: Fri 2023-02-03 23:18:36 UTC
                  RTC time: n/a
                  Time zone: Europe/London (GMT, +0000)
  System clock synchronized: no
                NTP service: inactive
            RTC in local TZ: no
            
  Note that the "System clock synchronized" value is "no" which means the GPS module will be allowed to set the time.

## Available Variables

| Variable | Description |
|--------|-------------|
| AS_PIGPSFIX | A text string, either "Yes" or "No", indicating if the GPS has a fix or not |
| AS_PIGPSUTC | The UTC time from the GPS |
| AS_PIGPSLOCAL | The local time from the GPS |
| AS_PIGPSOFFSET | The time offset from UTC in hours |
| AS_PIGPSLAT | The GPS latitude in degrees, minutes, and seconds |
| AS_PIGPSLON | The GPS longitude in degrees, minutes, and seconds |
| AS_PIGPSLATDEC | The GPS latitude in decimal degrees, minutes, and seconds |
| AS_PIGPSLONDEC | The GPS longitude in decimal degrees, minutes, and seconds |
| AS_PIGPSFIXDISC | The latitude and longitude discrepancy string, if there is a decrepancy found |

## Connecting the GPS
If possible please use a USB based GPS, they are far easier to work with that trying to setup the Pi's UART interface on the GPIO pins

## Available in

=== "Pipelines available In"
    
    <div class="grid cards" markdown>

    -   :fontawesome-solid-clock:{ .lg .middle } __Periodic__

        ---

          - The Periodic pipeline

    </div>