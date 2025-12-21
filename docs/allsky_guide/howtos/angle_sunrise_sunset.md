The time the sun actually sets and rises at your location is dependent on the day of the year and your latitude and longitude, and defines what people call daytime and nighttime. Allsky also has a daytime and nighttime, but they determine when to use your daytime and nighttime settings, and can be changed as described below.

!!! info  "Info"

    Don't confuse Allsky's daytime and nighttime with your actual daytime and nighttime. Allsky's version should really be called daytime settings start and nighttime settings start.

Allsky's daytime is your actual sunrise time plus an offset you define, called the Angle  . This is set in the Allsky Settings page of the WebUI and is a positive or negative number that indicates the number of degrees above (positive) or below (negative) the horizon the Sun is when daytime starts.

Allsky's nighttime is your actual sunset time minus the Angle.

As an example, assume the Sun rises at 7:00 AM and sets at 18:00 (6:00 PM). Using an Angle of 0 degrees, Allsky's daytime starts at 7:00 and nighttime starts at 18:00, and that's when Allsky will start using your daytime and nightttime settings, respectively.

The Sun moves at 15 degrees per hour, so 6 degrees is 24 minutes (6 degrees / 15 degrees * 60 minutes).
Remember: daytime ADDs the number of minutes represented by Angle and nighttime SUBTRACTs it.
Subtracting a negative number is the same as adding a positive number, so 100 MINUS -5 is the same as 100 PLUS 5.

Using an Angle of 6 degrees, Allsky's daytime starts at 7:24 (7:00 PLUS 24 minutes) and nighttime at 17:36 (18:00 MINUS 24 minutes). An Angle of -6 degrees would give 6:36 (7:00 PLUS -24 minutes) and 18:24 (18:00 MINUS -24 minutes). The Angle effectively determines the length of daytime - the larger the Angle the shorter the daytime.

Why is Angle important?

You tell Allsky when to start using your daytime settings and nighttime settings by adjusting your Angle. Many people use -6 but it's up to you to determine where the daytime and nighttime transition points should be.

!!! info  "Info"

    Startrails, keograms, and timelapse videos are created at the end of nighttime, so your Angle value will determine how dark or light the beginning of the timelapse video is.

To see what Allsky uses for today's daytime and nighttime based on your Angle, Latitude, and Longitude, execute:

```
allsky-config  show_start_times
```

You can tell it to use different values by appending one or more of the following to the command above:

```
    --angle some_angle
    --latitude some_latitude
    --longitude some_longitude
```

For example:

```
allsky-config  show_start_times  --angle -7.1  --longitude 105W
```

If you want daytime and nighttime to start at a certain time, execute the command with different angles until you get the times you want.