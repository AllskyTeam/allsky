## Extra Data
This section explains how you can wite data that is available for use in the overlay from yoru own scripts outside of Allsky.

!!! warning  ""

    This is an advanced topic that requires an understanding of the Linux file system and how to manage files within it. The Linux Basics page should provide the understanding you need.

As an example, assume you want to add weather data to your images. You first need to create or obtain a program that gathers that data and writes it to a file. How you obtain that file is outside the scope of this documentation, but the program needs to write the data in a specific format in a file called ``~/allsky/tmp/extra/xxxxx``` (replace the xxxxx with an appropriate name).

The "extra" file can be either a simple ==.txt== file or preferably a ==.json== file since it provides much more flexibility. You can have multiple "extra" files with different names; this can be useful if you want to add different types of data to the overlay, and each type has its own program to gather the data. A typical example is weather data and dew heater status.

**Dates**

When adding dates to any extra data files please ensure that the date is formatted in the same format as the Time Format setting in WebUI

### Text Files

Text files must end with a .txt extension. The format is a simple **name=value** pair structure, with anything after the = being the value, as shown below:

|Line in File	|Resulting Variable|
|-------------|------------------|
|AG_TEMP=14.3	|${AG_TEMP}|
|AG_LOCATION=South Pole	|${AG_LOCATION}|
|AG_HUMIDITY=67.2	|${AG_HUMIDITY}|

The data in these files could become old if the application creating them fails or is not running. To have Allsky detect this you tell it to ignore "extra" files when they are over a certain age. For .txt files there is a single value which is specified in the Overlay Editor settings dialog box. See the next section for how to specify the expiration time for .json files.

### JSON Files

.json files are more complex in their structure but provide a lot more flexibility to add your own variables and even control the attributes of a field.

The .json file below will produce exactly the same variables as the .txt file described above. The data will expire as defined in the Overlay Editor settings dialog box.

```
{
  "AG_TEMP": {
    "value": "14.3"
  },
  "AG_LOCATION": {
    "value": "South Pole",
  },
  "AG_HUMIDITY": {
    "value": "67.2",
  }
}
```

This .json file includes an expiry time (in seconds) for the temperature and humidity, which change often, so those times will be used. The location doesn't specify an expiry time since the location never changes, so the one in the Overlay Editor dialog expiry setting will be used.

```
{
  "AG_TEMP": {
    "value": "14.3",
    "expires": 600
  },
  "AG_LOCATION": {
    "value": "South Pole",
  },
  "AG_HUMIDITY": {
    "value": "67.2",
    "expires": 600,
  }
}
```

!!! warning  "A note on the expires field:"
    - Instead of specifying an expiry time on two variables and not the third one as shown above, you could instead specify a value for the third field and use the Overlay Editor default expiry setting for the other two. This works well if you only have one "extra" file.

    - If you have multiple "extra" files it's probably best to specify an expiry time for ALL fields in all files, rather than using the Overlay Editor default expiry setting for fields that don't explicity set one. If a field shouldn't have an expiry time, use "expires": 0, which disables its expiry time.


This .json file, which has been truncated for brevity, includes all of the attributes that a field can set. It also adds an image.

```
{
  "AG_TEMP": {
    "value": "14.3",
    "format": "{:.0f}",
    "x": 800,
    "y": 200,
    "fill": "#333333",
    "font": "ledsled",
    "fontsize": 40,
    "opacity": 0.2,
    "stroke": "#000000",
    "strokewidth": 1
  },
  "AG_SCOPE": {
    "image": "crosshair.png",
    "x": 300,
    "y": 400,
    "scale": 0.1,
    "expires": 6000,
    "opacity": 0.5
  }
}
```

!!! warning  "This example demonstrates some important points:"

    - The attributes of a variable can be used to control how the variable appears, so for example if the temperature is close to the dew point then some text could be displayed in a highlighted colour. Note that this makes the variable a 'Field' and can only be used where a single variable is used within a field.

    - Images can by dynamically added to the captured image. So if you wanted to control when an image is added or not added, the program that creates the "extra" file can simply add the image's json code, or not add it, to the file.


The "extra" files must be created by an application you provide and there are a few things to consider when creating these files:

  - **Variable names** must be prefixed with a string that's unique to you, e.g., your initials, to avoid conflicting with the names of Allsky variables. The variables in the examples above are prefixed with ```AG_```. You can use anything except ```AS_``` and ```ALLSKY_```.

  - **Variable values** should generally not include units of measure. For example ```${DOME_TEMPERATURE}``` should be ```20.72```, not ```20.72° C``` because ```20.72``` is a "Numeric" variable that can be formated (e.g., to ```20.7```) whereas ```20.72° C``` is a "Text" string that can't be formatted. If you want ```° C``` to appear on the overlay, add it in the field itself: ```Dome temperature: ${DOME_TEMPERATURE}&deg; C```. Note that &deg; adds the degree symbol °. Or use the formatting system within the overlay editor to set the format

  - **Permissions** You must ensure that the "extra" files can be read by the web server. Adding ```chmod 644 file``` ... to the programs that create the files should suffice. The Overlay Module will silently ignore any files it cannot read.
