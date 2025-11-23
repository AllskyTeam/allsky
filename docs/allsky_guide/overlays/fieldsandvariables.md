## Fields and Variables
Fields are the heart of the Overlay Editor. They are distinct items that are added to an overlay and each field has its own properties like color, size, rotation, etc. Most people have several fields on their overlays - date and time the image was taken, the exposure length, etc.


Variables are parts of a field whose value is determined when an image is saved. A common variable is ${TIME} which is replaced by the time the image was taken and changes every image. Some variables rarely or never change, for example ${CAMERA_MODEL} displays the model of the camera used to take the image, like "HQ" or "ASI290MM". It only changes if you change cameras.
See the [Variable names](#variable-names) section for details on variable names.


There are two types of fields:

- **Text** fields contain text and/or variables, for example, Exposure: ${sEXPOSURE}, which adds the word Exposure: followed by the image's exposure time to the overlay.
- **Image** fields contain pictures, graphics, or any image you want and are often used are logos, weather graphs, and compasses.

### Variable Names

- Must begin with a letter a - z or A - Z.  
- The remaining characters may contain any number of letters, number 0 - 9, or the underscore character _.  
- Should be prefixed with a string that's unique to you like your initials, to avoid conflicting with the names of Allsky system variables. This prefix can be anything except AS_ and ALLSKY_, which are reserved for the Allsky development team.  
- Should make sense to you. You are more likely to remember what ${MY_AMBIENT_TEMP} means than ${MY_AT}.  
- By convention are UPPERCASE, but you can mix case, however, variable names are case-sensitive, so ${MY_ABIENT_TEMP} and ${MY_ABIENT_temp} are different variables.  

!!! warning  ""

    If you see a variable displayed on the overlay as ??? it usually means the variable is undefined - either it's not in the Variable Manager at all (could be a typo), or is only in the All Variables tab. The variable needs to be defined and copied to the Allsky Variables tab.
    Undefined variables will have a line in ```/var/log/allsky.log``` like: ```ERROR: ${T2} has no variable type.```

    If a variable is displayed as ?? it usually means the variable's formatting is incorrect, for example, you tried to display a number as a date. Make sure the formatting is valid for the type of variable - click on the [?] icon to see valid formats for each type of variable.
    Incorrectly formatted variables will have a line in ```/var/log/allsky.log``` like: ERROR: Cannot use format '%a' on Number variables like ${GAIN}.

### Example text fields

|Field { .w-20p } | Example Output { .w-20p } | Description |
|-----------|----------------|-------------|
|${DATE}|	24/10/2025|	Displays the date from the DATE system variable. The date can be formatted in a variety of ways. This example field contains only a variable. |
|Date: ${DATE}|	Date: 24/10/2025	|Displays the text "Date: " then the date the image was taken from the DATE system variable. As above, the date can be formatted in a variety of ways. This field contains text and a variable.|
|Date: ${DATE} ${TIME}|Date: 24/10/2025 23:12:34	|Displays the date and time the image was taken from the DATE and TIME system variables, respectively. Both variables can be formatted in a variety of ways.This field contains text and two variables. You can have any number of variables you want.||
|Date: DATE TIME	|Date: DATE TIME	|Because this field doesn't have any variables, it simply displays "Date: DATE TIME". This field contains only text.|

Variables come from a variety of sources:

**Allsky** - The main Allsky application generates many variables.  
**Modules** - Any module can create variables.  
**Extra Data** - Typically created by an application external to Allsky.  

### Allsky Variables

The table below shows the most commonly used Allsky variables; a complete list can be found in the Variable Manager.

|Variable|Example Data|Description|
|--------|------------|-----------|
|${DATE}	|20250228	|The date the image was taken.|
|${TIME}	|221623	|The time the image was taken.|
|${GAIN}	|4.692540	|The gain used for the image. If auto-gain was disabled, this value will be what you set in the Gain setting in the WebUI, otherwise it's the value the auto-gain algorithm used.|
|${AUTOGAIN}	|1	|1 if auto-gain was enabled, 0 if disabled. Taken from the Auto-Gain WebUI setting.|
|${sAUTOGAIN}	|(auto)	|A string containing either (auto) if auto-gain was enabled, or blank. Useful to put after the gain, e.g., Gain: ${GAIN} ${sAUTOGAIN}.|
|${EXPOSURE_US}	|218000	|The exposure of the image in micro seconds. If auto-exposure was disabled, this value will be what you set in the Manual Exposure setting in the WebUI, otherwise it's the |value the auto-exposure algorithm used.
|${sEXPOSURE}	|218 ms (0.2 sec)	|The exposure of the image in a human readable format. The format changes depending on the exposure time, for example, very short exposures may be 218.48 ms (0.2 sec) whereas a long exposure may be 45.3 sec.|
|${AUTOEXPOSURE}	|1	|1 if auto-exposure was enabled, 0 if auto-exposure was disabled. Taken from the Auto-Exposure WebUI setting.|
|${sAUTOEXPOSURE}	|(auto)	|A string containing either (auto) or blank - similar to ${sAUTOGAIN}.|
|${TEMPERATURE_C} and ${TEMPERATURE_F}	|36	|The temperature of the camera sensor, if available. This does NOT include the C or F for Centigrade or Fahrenheit so you'll need to add them yourself, e.g., Sensor Temp: ${TEMPERATURE_C} C.|
|${MEAN}	|0.108564	|The mean brightness value for the image, from 0.0 (pure black) to 1.0 (pure white).|

### Module Variables
Any module can create variables for use in the Overlay Module. For this reason it's important that the Overlay Module runs as late as possible within the module flow. As an example, the Star Count Module creates a variable called ${STARCOUNT} and passes it to the next module.

Please refer to the documentation on each module for the variables they make available.