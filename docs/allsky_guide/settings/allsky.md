After you install Allsky for the first time there are many settings you must modify via the WebUI's Allsky Settings page. If you are upgrading from a recent prior release those settings can optionally be brought to the new release. Settings that change the look and feel of an Allsky Website are described [here](settings/website.md)  .

The list of settings available in the WebUI depends on your camera model; settings specific to a camera type (e.g., RPi or ZWO) are indicated as such in the table below. Where appropriate, the WebUI displays the minimum, maximum, and default values when you hover over a value, and only displays settings the camera supports, like cooler temperature for cooled cameras.


![settings page](/assets/settings_images/AllskySettingsPage.png)

/// caption
The Allsky Settings Page
///


AllskySettings

!!! note "Legend"
    - <span class="red">CD</span> indicates the setting's default is Camera Dependent and is displayed in the WebUI by hovering your cursor over the value.
    - <span class="red">AW</span> indicates a setting who's value is uploaded to your Allsky Website(s) when changed.

<table role="table">
   <thead>
      <tr class="table-header">
         <th width="15%">WebUI Setting</th>
         <th>Default</th>
         <th>Description</th>
      </tr>
   </thead>
   <tbody>
      <tr>
         <td class="settings-header" colspan="3">Daytime Settings</td>
      </tr>
      <tr>
         <td id="takedaytimeimages"><span class="web-ui-setting">Daytime Capture</span></td>
         <td>Yes</td>
         <td>Enable to <b>capture</b> images during the day.</td>
      </tr>
      <tr>
         <td id="savedaytimeimages"><span class="web-ui-setting">Daytime Save</span> <span class="allsky-website-dependent">AW</span></td>
         <td>No</td>
         <td>Enable to <b>save</b> images during the day (they are always saved at night).
            Only applies if <span class="web-ui-setting">Daytime Capture</span> is enabled.
         </td>
      </tr>
      <tr>
         <td id="dayautoexposure"><span class="web-ui-setting">Auto-Exposure</span></td>
         <td>Yes</td>
         <td>Turns on/off Auto-Exposure, which delivers properly exposed images even if
            the overall brightness of the sky changes due to cloud cover, sun, etc.
         </td>
      </tr>
      <tr>
         <td id="daymaxautoexposure"><span class="web-ui-setting">Max Auto-Exposure</span></td>
         <td><span class="camera-dependent">CD</span></td>
         <td>The maximum exposure in milliseconds when
            <span class="web-ui-setting">Auto-Exposure</span> is enabled.
            Ignored if <span class="web-ui-setting">Auto-Exposure</span> is disabled.
            <br>
            When <span class="web-ui-setting">Auto-Exposure</span> and
            <span class="web-ui-setting">Consistent Delays Between Images</span> are both on,
            the time between the start of one image and the start of the next images is
            the <span class="web-ui-setting">Max Auto-Exposure + Delay</span>.
      </tr>
      <tr>
         <td id="dayexposure"><span class="web-ui-setting">Manual Exposure</span></td>
         <td>0.5</td>
         <td>Manual exposure time in milliseconds.
            If <span class="web-ui-setting">Auto-Exposure</span>
            is on this value is used as a starting exposure.
            <br>
            The time between the start of one image and the start of the next images will be
            the <span class="web-ui-setting">Manual Exposure + Delay</span>,
            regardless of the status of
            <span class="web-ui-setting">Consistent Delays Between Images</span>.
         </td>
      </tr>
      <tr>
         <td id="daymean"><span class="web-ui-setting">Mean Target</span></td>
         <td>0.5</td>
         <td>The target mean brightness level when
            <span class="web-ui-setting">Auto-Exposure</span> is on.
            Ranges from 0.0 (pure black) to 1.0 (pure white).
            Best used when both <span class="web-ui-setting">Auto-Exposure</span> and
            <span class="web-ui-setting">Auto-Gain</span> are enabled.
         </td>
      </tr>
      <tr>
         <td id="daymeanthreshold"><span class="web-ui-setting">Mean Threshold</span></td>
         <td>0.1</td>
         <td>When using <span class="web-ui-setting">Mean Target</span>,
            this specifies how close (plus or minus) the target brightness should be to the
            <span class="web-ui-setting">Mean Target</span>.
            <br>For example, if <span class="web-ui-setting">Mean Target</span> is
            <code>0.4</code> and
            <span class="web-ui-setting">Mean Threshold</span> is <code>0.1</code>
            then the target brightness ranges from <code>0.3</code> to <code>0.5</code>
         </td>
      </tr>
      <tr>
         <td id="daydelay"><span class="web-ui-setting">Delay</span></td>
         <td>5000</td>
         <td>Time in milliseconds to wait between the end of one image and the start of the next.</td>
      </tr>
      <tr>
         <td id="dayautogain"><span class="web-ui-setting">Auto-Gain</span></td>
         <td>No</td>
         <td>Turns on/off Auto-Gain which delivers properly exposed images even if
            the overall brightness of the sky changes.
            With RPi cameras, this should typically be turned on.
            With ZWO cameras you'll probably want this off and use the lowest
            gain possible since daytime images are bright and don't need any gain.
         </td>
      </tr>
      <tr>
         <td id="daymaxautogain"><span class="web-ui-setting">Max Auto-Gain</span></td>
         <td><span class="camera-dependent">CD</span></td>
         <td>Maximum gain when using <span class="web-ui-setting">Auto-Gain</span>.
            Ignored if <span class="web-ui-setting">Auto-Gain</span> is off.
         </td>
      </tr>
      <tr>
         <td id="daygain"><span class="web-ui-setting">Gain</span></td>
         <td><span class="camera-dependent">CD</span></td>
         <td>Gain is similar to ISO on regular cameras.
            When <span class="web-ui-setting">Auto-Gain</span> is on, this value is used as a starting gain.
            When <span class="web-ui-setting">Auto-Gain</span> is off,
            increasing this produces brighter images, but with more noise.
            <br>The default daytime gain is the minimum possible for the camera since
            daytime images are normally bright and don't need any additional gain.
         </td>
      </tr>
      <tr>
         <td id="dayimagestretchamount"><span class="web-ui-setting">Stretch Amount</span></td>
         <td>0</td>
         <td>Stretching increases the contrast of an image without saturating the bright parts
            or making the dark parts turn black.
            It is most often used to lighten an image so isn't normally used during the day.
            This setting determines how much to change the image:
            3 is typical and 20 is a lot.
            <br>Set to <span class="WebUIValue">0</span> to disable stretching.
            <br>
            See <a allsky="true" external="true" href="../explanations/exposureGainSaturation.html#stretch">this page</a>
            for more information on stretching images.
         </td>
      </tr>
      <tr>
         <td id="dayimagestretchmidpoint"><span class="web-ui-setting">Stretch Mid Point</span></td>
         <td>10</td>
         <td>Determines what brightness level in the image should be stretched:
            0 stretches black pixels, 50 stretches middle-gray, etc.
         </td>
      </tr>
      <tr>
         <td id="daybin"><span class="web-ui-setting">Binning</span></td>
         <td>1x1</td>
         <td>
            Bin 2x2 collects the light from 4 pixels to form one larger pixel on the image.
            Bin 3x3 uses 9 pixels, etc.
            Increasing the bin results in smaller,
            lower-resolution images and reduces the need for long exposure.
            Look up your camera specifications to know what values are supported.
            <br>During the day this setting is usually only changed for testing.
            <blockquote>Binning on CCD cameras normally produces brighter images.
               CMOS camera may, or may not produce brighter images, depending on the camera model.
            </blockquote>
         </td>
      </tr>
      <tr>
         <td>
            <a id="dayawb">
               <span class="web-ui-setting">Auto White Balance</span>
         </td>
         <td>No</td>
         <td>Sets daytime auto white balance.
         When used, <span class="web-ui-setting">Red balance</span> and
         <span class="web-ui-setting">Blue balance</span> are used as starting points.</td>
      </tr>
      <tr><td id="daywbr"><span class="web-ui-setting">Red Balance</span></td>
      <td><span class="camera-dependent">CD</span></td>
      <td>The intensity of the red component of the image.</td>
      </tr>
      <tr><td id="daywbb"><span class="web-ui-setting">Blue Balance</span></td>
      <td><span class="camera-dependent">CD</span></td>
      <td>The intensity of the blue component of the image.</td>
      </tr>
      <tr><td id="dayskipframes"><span class="web-ui-setting">Frames To Skip</span></td>
      <td>5</td>
      <td>When starting Allsky during the day, skip <i>up to</i> this many images
      while the auto-exposure software gets to the correct exposure.
      <br>Only applies if daytime <span class="web-ui-setting">Auto-Exposure</span> is enabled.
      </td>
      </tr>
      <tr><td id="dayenablecooler"><span class="web-ui-setting">Cooling</span></td>
      <td>No</td>
      <td>(ZWO cooled cameras only) Enable to use cooling on cameras that support it.</td>
      </tr>
      <tr><td id="daytargettemp"><span class="web-ui-setting">Target Temp.</span></td>
      <td>0</td>
      <td>(ZWO cooled cameras only) Sensor's target temperature <i>when cooler is enabled</i>.
      In degrees Celsius.</td>
      </tr>
      <tr><td><a id="daytuningfile"><span class="web-ui-setting">Tuning File</span></td>
      <td>No</td>
      <td>(RPi on Bookworm and Bullseye only) Full path name of the optional daytime tuning file.
      See the
      <a external="true" href="https://www.raspberrypi.com/documentation/computers/camera_software.html#tuning-files">
      Raspberry Pi Documentation</a> for more information.
      <blockquote>
      System-supplied tuning files on Raspberry Pi models prior to 5 are in
      <span class="fileName">/usr/share/libcamera/ipa/rpi/vc4</span>.
      New Pi's files are in
      <span class="fileName">/usr/share/libcamera/ipa/rpi/pisp</span>.
      </blockquote>
      </td>
      </tr>
      <tr>
         <td id="nighttimesettings" class="settings-header" colspan="3">Nighttime Settings</td>
      </tr>
      <tr>
         <td class="settings-header settings-header-note" colspan="3">
            Unless otherwise specified, these setttings are the same as the Daytime ones.
         </td>
      </tr>
      <tr>
         <td id="nightautoexposure"><span class="web-ui-setting">Auto-Exposure</span></td>
         <td>Yes</td>
         <td></td>
      </tr>
      <tr>
         <td id="nightmaxautoexposure"><span class="web-ui-setting">Max Auto-Exposure</span></td>
         <td><span class="camera-dependent">CD</span></td>
         <td></td>
      </tr>
      <tr>
         <td id="nightexposure"><span class="web-ui-setting">Manual Exposure</span></td>
         <td>10000</td>
         <td></td>
      </tr>
      <tr>
         <td id="nightmean"><span class="web-ui-setting">Mean Target</span></td>
         <td>0.2</td>
         <td></td>
      </tr>
      <tr>
         <td id="nightmeanthreshold"><span class="web-ui-setting">Mean Threshold</span></td>
         <td>0.1</td>
         <td></td>
      </tr>
      <tr>
         <td id="nightdelay"><span class="web-ui-setting">Delay</span></td>
         <td>10</td>
         <td></td>
      </tr>
      <tr>
         <td id="nightautogain"><span class="web-ui-setting">Auto-Gain</span></td>
         <td>No</td>
         <td>With ZWO cameras enabling <span class="web-ui-setting">Auto-Exposure</span> and
            <span class="web-ui-setting">Auto-Gain</span> together
            can produce unpredictable results so testing is needed.
         </td>
      </tr>
      <tr>
         <td id="nightmaxautogain"><span class="web-ui-setting">Max Auto-Gain</span></td>
         <td><span class="camera-dependent">CD</span></td>
         <td></td>
      </tr>
      <tr>
         <td id="nightgain"><span class="web-ui-setting">Gain</span></td>
         <td><span class="camera-dependent">CD</span></td>
         <td>The default is one-half the maximum for the camera.</td>
      </tr>
      <tr>
         <td id="nightimagestretchamount"><span class="web-ui-setting">Stretch Amount</span></td>
         <td>0</td>
         <td></td>
         </td>
      </tr>
      <tr>
         <td id="nightimagestretchmidpoint"><span class="web-ui-setting">Stretch Mid Point</span></td>
         <td>10</td>
         <td></td>
      </tr>
      <tr>
         <td id="nightbin"><span class="web-ui-setting">Binning</span></td>
         <td>1x1</td>
         <td></td>
      </tr>
      <tr>
         <td id="nightawb"><span class="web-ui-setting">Auto White Balance</span></td>
         <td>No</td>
         <td></td>
      </tr>
      <tr>
         <td id="nightwbr"><span class="web-ui-setting">Red Balance</span></td>
         <td><span class="camera-dependent">CD</span></td>
         <td></td>
      </tr>
      <tr>
         <td id="nightwbb"><span class="web-ui-setting">Blue Balance</span></td>
         <td><span class="camera-dependent">CD</span></td>
         <td></td>
      </tr>
      <tr>
         <td id="nightskipframes"><span class="web-ui-setting">Frames To Skip</span></td>
         <td>1</td>
         <td>Only applies if nighttime <span class="web-ui-setting">Auto-Exposure</span> is enabled.</td>
      </tr>
      <tr>
         <td id="nightenablecooler"><span class="web-ui-setting">Cooling</span></td>
         <td>No</td>
         <td>(ZWO cooled cameras only)</td>
      </tr>
      <tr>
         <td id="nighttargettemp"><span class="web-ui-setting">Target Temp.</span></td>
         <td>0</td>
         <td>(ZWO cooled cameras only)</td>
      </tr>
      <tr>
         <td>
            <a id="nighttuningfile">
               <span class="web-ui-setting">Tuning File</span>
         </td>
         <td>No</td>
         <td>(RPi on Bookworm and Bullseye only)</td>
      </tr>
      <tr><td class="settings-header" colspan="3">Both Day and Night Settings</td></tr>
      <tr><td id="daystokeep"><span class="web-ui-setting">Days To Keep</span></td>
      <td>14</td>
      <td>Number of days of images and videos in
      <span class="fileName">~/allsky/images</span> to keep.
      Any directory older than this many days will be deleted at each end of night.
      Set to <span class="WebUIValue">0</span> to keep ALL days' data;
      you will need to manually manage disk space.</td>
      </tr>
      <tr><td id="config"><span class="web-ui-setting">Configuration File</span></td>
      <td>[none]</td>
      <td>Configuration file to use for settings.  Not currently used.</td>
      </tr>
      <tr><td id="extraargs"><span class="web-ui-setting">Extra Parameters</span></td>
      <td></td>
      <td>(RPi only) Any additional parameters to send to the
      <code>libcamera-still</code> image capture program.
      It supports a lot of settings that Allsky doesn't (e.g., auto-focus options),
      and this field allows you to enter those settings.
      <br>
      </td>
      </tr>
      <tr><td id="saturation"><span class="web-ui-setting">Saturation</span></td>
      <td><span class="camera-dependent">CD</span></td>
      <td>(RPi only) Sets saturation from black and white to extra saturated.</td>
      </tr>
      <tr><td id="contrast"><span class="web-ui-setting">Contrast</span></td>
      <td><span class="camera-dependent">CD</span></td>
      <td>(RPi only) Changes the difference between blacks and whites in an image.</td>
      </tr>
      <tr><td id="sharpness"><span class="web-ui-setting">Sharpness</span></td>
      <td><span class="camera-dependent">CD</span></td>
      <td>(RPi only) Changes the sharpness of an imgage.
      Images that are too sharp look unnatural.</td>
      </tr>
      <tr><td id="aggression"><span class="web-ui-setting">Aggression</span></td>
      <td>75%</td>
      <td>(ZWO only) Specifies how much of a calculated exposure change should be made
      during auto-exposure. Lower numbers smooth out brightness changes but take longer to
      react to changes.</td>
      </tr>
      <tr><td id="gaintransitiontime"><span class="web-ui-setting">Gain Transition Time</span></td>
      <td>15</td>
      <td>(ZWO only) Number of <b>minutes</b> over which to increase or decrease
      the gain when going from day-to-night or night-to-day images.
      This helps smooth brightness differences.
      Only works if nighttime <span class="web-ui-setting">Auto-Gain</span> is off.
      <span class="WebUIValue">0</span> disables transitions.</td>
      </tr>
      <!-- NO LONGER USED
         <tr><td id="width"><span class="web-ui-setting">Image Width</span></td>
         	<td>0</td>
         	<td>(ZWO only)
         	This and the <span class="web-ui-setting">Image Height</span>
         	crop the image around the center of the sensor while the picture is being taken,
         	resulting in a smaller-sized file being written to tisk.
         	<span class="WebUIValue">0</span> uses the sensor's full width in pixels.
         	</td>
         </tr>
         <tr><td id="height"><span class="web-ui-setting">Image Height</span></td>
         	<td>0</td>
         	<td>(ZWO only)
         		Same as <span class="web-ui-setting">Width</span> but for the sensor's height.</td>
         </tr>
         -->
      <tr><td id="type"><span class="web-ui-setting">Image Type</span></td>
      <td>auto</td>
      <td>Image format: <b>auto</b>:
      automatically picks the best type of image based on the camera.
      If you have a color camera it will use RGB24;
      mono cameras use RAW16 if the output file is a .png,
      otherwise RAW8 is used.
      <b>RAW8</b>: 8-bit mono. <b>RGB24</b>: color (red, green, blue), 8 bits per channel.
      <b>RAW16</b>: 16-bit mono.</td>
      </tr>
      <tr><td id="lity"><span class="web-ui-setting">Quality / Compression</span></td>
      <td>95</td>
      <td>For JPG images, this specifies the quality - 0 (low quality) to 100 (high quality).
      Larger numbers produce higher-quality, but larger, files.
      For PNG, this is the amount of compression - 0 for no compression (but quicker to save)
      to 9 for highest compression (but slowest to save).
      If you use very short delays between pictures you may want to play with these
      numbers to get the quickest delay possible.</td>
      </tr>
      <tr><td id="autousb"><span class="web-ui-setting">Auto USB Bandwidth</span></td>
      <td>Yes</td>
      <td>(ZWO only) Automatically sets the <span class="web-ui-setting">USB bandwidth</span>.</td>
      </tr>
      <tr><td id="usb"><span class="web-ui-setting">USB Bandwidth</span></td>
      <td><span class="camera-dependent">CD</span></td>
      <td>(ZWO only) How much of the USB bandwidth to use.</td>
      </tr>
      <tr><td id="filename"><span class="web-ui-setting">Filename</span> <span class="allsky-website-dependent">AW</span></td>
      <td>image.jpg</td>
      <td>The name of the image file. Supported extensions are <b>jpg</b> and <b>png</b>.</td>
      </tr>
      <tr><td id="rotation"><span class="web-ui-setting">Rotation</span></td>
      <td>None</td>
      <td>(RPi on Bookworm and Bullseye only) How to rotate the image.
      Choices are 0 and 180 degrees.</td>
      </tr>
      <tr><td id="flip"><span class="web-ui-setting">Flip</span></td>
      <td>No flip</td>
      <td>How to flip the image (No flip, Horizontal, Vertical, or Both).</td>
      </tr>
      <tr><td id="focusmode"><span class="web-ui-setting">Focus Mode</span></td>
      <td>No</td>
      <td>Enable to have images created and displayed as fast as possible,
      to aid in focusing.
      Other than adding the focus metric (see next setting) to each image,
      no other post-processing is performed - no resizing,
      no overlay or other modules are run, images aren't permanently saved or uploaded,
      and there is no delay between images - as soon as an image is available and
      the focus metric added, the next image is taken.
      <br>The WebUI's <span class="WebUILink">Live View</span>
      refreshes the image every second or so.
      Because this happens so quickly, it's possible the Live View page will try to
      read the image as it's being updated, so you may see occassional "glitches".
      </td>
      </tr>
      <tr><td id="determinefocus"><span class="web-ui-setting">Record Focus</span></td>
      <td>No</td>
      <td>Enable to have the overall focus of the image determined and output via the 'FOCUS' variable, which can then be used in an overlay.  Unless you are focusing in "Focus Mode" (in which case this setting is enabled), it's not all that useful to see the metric since it can change depending on image brightness and other factors.</td>
      </tr>
      <tr><td id="consistentdelays"><span class="web-ui-setting">Consistent Delays Between Images</span></td>
      <td>Yes</td>
      <td>Enabling this makes the time between the <strong>start</strong> of one auto-exposure
      and the <strong>start</strong> of the next exposure a consistent length
      (<span class="web-ui-setting">Max Auto-Exposure + Delay</span>).
      Timelapse video frames will be equally spaced.
      <br>
      For example, if the <span class="web-ui-setting">Max Auto-Exposure</span> is
      60 seconds and the <span class="web-ui-setting">Delay</span> is 30 seconds,
      the start of an exposure will be exactly 90 after the prior exposure's start time,
      regardless of how long an individual frame's exposure is.
      So if the first exposure was only 3 seconds,
      the second exposure will still start 90 seconds after the first one.
      <p>
      Disabling this means the time between exposure starts varies depending on
      the actual length of each exposure.
      At nighttime when most exposure are at their maximum length this setting
      doesn't make a difference,
      but during the day or at twilight the exposure length is usually not at the maximum.
      </p>
      <p>
      Note that if manual exposure is used this setting doesn't apply
      since the time between exposures
      (<span class="web-ui-setting">Manual Exposure + Delay</span>) is always the same.
      </p>
      </td>
      </tr>
      <tr><td id="timeformat"><span class="web-ui-setting">Time Format</span></td>
      <td>%Y%m%d %H:%M:%S</td>
      <td>Determines the format of the displayed time.
      Run <code>man 3 strftime</code> to see the options.</td>
      </tr>
      <tr><td id="temptype"><span class="web-ui-setting">Temperature Units</span></td>
      <td>Celsius</td>
      <td>Determines what unit(s) the temperature will be displayed in (Celsius, Fahrenheit, or Both).</td>
      </tr>
      <tr><td id="latitude"><span class="web-ui-setting">Latitude</span> <span class="allsky-website-dependent">AW</span></td>
      <td></td>
      <td>Latitude of the camera.
      Formats include: 123.4N, 123.4S, +123.4, or -123.4.
      Southern hemisphere is negative.
      The "+" is needed for positive numbers.
      </td>
      </tr>
      <tr><td id="longitude"><span class="web-ui-setting">Longitude</span> <span class="allsky-website-dependent">AW</span></td>
      <td></td>
      <td>Longitude of the camera.
      Formats include: 123.4E, 123.4W, +123.4, or -123.4.
      West is negative.
      The "+" is needed for positive numbers.
      <blockquote>
      The actual values for latitude and longitude are not displayed on the map,
      but users can zoom in to see exactly where your camera is.
      If that bothers you, change the latitude and/or longitude values slightly.
      Allsky itself only uses them to determine when daytime and nighttime begin so
      you can change the values a fair amount and not impact anything.
      <br><br>
      When installing Allsky the first time,
      the installation script will attempt to determine your rough
      <span class="web-ui-setting">Latitude</span> and
      <span class="web-ui-setting">Longitude</span> based on your IP address.
      These values may be "close enough" in most cases but you may want to check them anyhow.
      </blockquote>
      </td>
      </tr>
      <tr><td id="angle"><span class="web-ui-setting">Angle</span> <span class="allsky-website-dependent">AW</span></td>
      <td>-6</td>
      <td>Altitude of the Sun above or below the horizon at which daytime and nighttime switch.
      Can be negative (Sun below horizon) or positive (Sun above horizon).
      <ul class="minimalPadding">
      <li><span class="WebUIValue">0</span> = Sunset
      <li><span class="WebUIValue">-6</span> = Civil twilight
      <li><span class="WebUIValue">-12</span> = Nautical twilight
      <li><span class="WebUIValue">-18</span> = Astronomical twilight
      </ul>
      <a allsky="true" href="/documentation/explanations/angleSunriseSunset.html">Click here</a>
      for a more detailed description of <span class="web-ui-setting">Angle</span>.
      </td>
      </tr>
      <tr>
         <td id="takedarkframes"><span class="web-ui-setting">Take Dark Frames</span></td>
         <td>No</td>
         <td>Enable to take dark frames which are use to decrease noise in images.
            <br>
            See the
            <a allsky="true" external="true" href="/documentation/explanations/darkFrames.html">in-depth explanation</a>
            of dark frames, including how to take and use them.
         </td>
      </tr>
      <tr>
         <td id="imageremovebadhighdarkframe"><span class="web-ui-setting">Dark Frame Upper Threshold</span></td>
         <td>0.05</td>
         <td>Any dark frame that has a mean brightness higher than this number is not saved.
            <br>If you're getting messages about "bad images" while taking dark frames,
            first make sure your lens is FULLY covered and NO light is getting in.
            <br>If you are POSITIVE no light is getting in and your camera is noisy,
            then increase this to <code>0.1</code> and see if it helps.
            If not, then increase it more.
         </td>
      </tr>
      <tr>
         <td id="usedarkframes"><span class="web-ui-setting">Use Dark Frames</span></td>
         <td>No</td>
         <td>Enable to perform dark frame subtraction at night.
            <br>Requires that you first took dark frames using the
            <span class="web-ui-setting">Take Dark Frames</span> setting.
         </td>
      </tr>
      <tr>
         <td id="locale"><span class="web-ui-setting">Locale</span></td>
         <td></td>
         <td>
            The locale is used to determine what the thousands and decimal separators are
            as well as the language to use for many non-Allsky commands.
            If you have never set the locale in Allsky,
            the installation script will display a list of locales installed on your Pi,
            highlighting the current one.
            If it's the correct one, press the TAB key until the cursor is
            over <code>&lt;Ok&gt;</code>, then press ENTER.
            <p>
            <blockquote>
               The locale only needs to be set once and won't change unless you reinstall the Pi OS.
               Changing the locale requires a reboot, which <strong>must</strong> be done
               before continuing the installation.
            </blockquote>
            </p>
            If the correct locale isn't in the list it needs to be installed,
            so <code>&lt;Cancel&gt;</code> out of the installation and run
            <code>sudo raspi-config</code>, selecting <code>Localisation Options</code>,
            followed by the <code>Locale</code> option.
            You will be shown a drop-down list with hundreds of locales; when you find the correct
            one for your language and country, press the SPACE bar,
            then TAB to the <code>&lt;Ok&gt;</code> button.
            It will take a few seconds for the locale to be installed;
            when done, re-run the installation script selecting the locale you just installed.
         </td>
      </tr>
      <tr>
         <td id="zwoexposuretype"><span class="web-ui-setting">ZWO Exposure Type</span></td>
         <td>Snapshot</td>
         <td>
            (ZWO only) Determines what type of exposures to take:
            <ol class="minimalPadding topPadding">
               <li><span class="WebUIValue">Snapshot</span>
                  takes pictures one at a time like a "normal" camera.
                  Note that <a href="#dayautogain"><span class="web-ui-setting">Auto-Gain</span></a>
                  and <a href="#dayawb"><span class="web-ui-setting">Auto White Balance</span></a>
                  does not work when <span class="WebUIValue">Snapshot</span> is used.
               </li>
               <li><span class="WebUIValue">Video Off</span>
                  takes pictures like a video camera that is turned off after every picture.
                  This is the same as the old
                  <span class="web-ui-setting">Version 0.8 exposure</span> setting.
               </li>
               <li><span class="WebUIValue">Video (original)</span>
                  takes pictures like a video camera that is always on.
                  This is the original exposure method.
               </li>
            </ol>
            The first two types decrease the sensor temperature between 5 - 15 degrees Celsius.
      </tr>
      <tr>
         <td id="histogrambox"><span class="web-ui-setting">Histogram Box</span></td>
         <td>500 500 50 50</td>
         <td>(ZWO only) X and Y size of histogram box in pixels and the middle point of
            the box in percent.
            This box is used to determine the average brightness of the image for auto-exposure
            compensation.
            If the Sun goes through the center of your image you may want to move the box.
         </td>
      </tr>
      <tr>
         <td id="debuglevel"><span class="web-ui-setting">Debug Level</span></td>
         <td>1</td>
         <td>
            Determines the amount of output in the Allsky log file:
            <ul class="minimalPadding">
               <li><span class="WebUIValue">0</span> outputs error messages only.
               <li><span class="WebUIValue">1</span> outputs "what's happening" type messages.
               <li><span class="WebUIValue">2</span> outputs more "what's happening" messages.
               <li><span class="WebUIValue">3</span> outputs debugging information.
                  <strong>Use this level when debugging problems.</strong>
               <li><span class="WebUIValue">4</span> outputs a LOT of INFO messages.
                  Use only if directed to by an Allsky developer.
            </ul>
         </td>
      </tr>
      <tr>
         <td class="settings-header" colspan="3">Post Capture Settings</td>
      </tr>
      <tr>
         <td id="imeagesremovebadlow"><span class="web-ui-setting">Remove Bad Images Threshold Low</span></td>
         <td>0.1</td>
         <td>Images whose mean brightness is below this will be removed.
            Useful values range from <code>0.01</code> to around <code>0.2</code>.
            <br>Set to <code>0</code> to disable this check.
         </td>
      </tr>
      <tr>
         <td id="imeagesremovebadhigh"><span class="web-ui-setting">Remove Bad Images Threshold High</span></td>
         <td>0.9</td>
         <td>Images whose mean brightness is above this will be removed.
            Useful values range from <code>0.8</code> to around <code>0.95</code>.
            <br>Set to <code>0</code> to disable this check.
         </td>
      </tr>
      <tr>
         <td id="imeagesremovebadcount"><span class="web-ui-setting">Remove Bad Images Threshold Count</span></td>
         <td>5</td>
         <td>Display a System Message when this many consecutive "bad images" are taken.
            <br>A notification image will also be displayed telling you how many consecutive bad images
            there are.
            Once a "good" image is taken, the notification image will be replaced by the good image.
         </td>
      </tr>
      <tr>
         <td id="imagecreatethumbnails"><span class="web-ui-setting">Create Image Thumbnails</span></td>
         <td>Yes</td>
         <td>Create thumbnails of the images and save in <span class="fileName">~/allsky/images</span>?
            If you never look at them via the WebUI's <span class="WebUIWebPage">Images<span> page,
            consider changing this to "No".
         </td>
      </tr>
      <tr>
         <td id="thumbnailsizex"><span class="web-ui-setting">Thumbnail Width</span></td>
         <td>100</td>
         <td>Sets the width of image and video thumbnails.</td>
      </tr>
      <tr>
         <td id="thumbnailsizey"><span class="web-ui-setting">Thumbnail Height</span></td>
         <td>75</td>
         <td>
            Sets the height of image and video thumbnails.
            <br>These numbers determine the size of the thumbnails in
            <span class="fileName">~/allsky/images</span>
            as well as any thumbnails created by the Allsky Website.
            <blockquote>
               Although changing these will change the size of the thumbnails,
               no testing has been done to see if there are negative side effects.
            </blockquote>
         </td>
      </tr>
      <tr>
         <td id="imageresizewidth"><span class="web-ui-setting">Image Resize Width</span></td>
         <td>0</td>
         <td>The width to resize images to.
            Large sensor cameras like the RPi HQ may need to be resized (i.e., shrunken)
            in order for timelapses to work.
            Resizing is done before cropping.
            <br>Must be an even number and
            <span class="WebUIValue">0</span> disables resizing.
         </td>
      </tr>
      <tr>
         <td id="imageresizeheight"><span class="web-ui-setting">Image Resize<br>Height</span></td>
         <td>0</td>
         <td>Same as <span class="web-ui-setting">Image Resize<br>Width</span>
            but for the image height.
            <br>Typically you'll want the
            <span class="web-ui-setting">Width</span>&nbsp;/&nbsp;<span class="web-ui-setting">Height</span>
            ratio to be the same as the sensor's width / height ratio,
            otherwise images will be distorted.
         </td>
      </tr>
      <tr>
         <td id="imagecroptop"><span class="web-ui-setting">Image Crop<br>Top</span></td>
         <td>0</td>
         <td>Number of pixels to crop off the top of an image.
            This is often used to remove the dark areas around an image when using a fisheye lens.
            All the <span class="web-ui-setting">Crop</span> number should either
            <span class="WebUIValue">0</span> to disable cropping that side of an image,
            or a positive number.
         </td>
      </tr>
      <tr>
         <td id="imagecropright"><span class="web-ui-setting">Image Crop<br>Right</span></td>
         <td>0</td>
         <td>Number of pixels to crop off the right side of an image.</td>
      </tr>
      <tr>
         <td id="imagecropbottom"><span class="web-ui-setting">Image Crop<br>Bottom</span></td>
         <td>0</td>
         <td>Number of pixels to crop off the bottom an image.</td>
      </tr>
      <tr>
         <td id="imagecropleft"><span class="web-ui-setting">Image Crop<br>Left</span></td>
         <td>0</td>
         <td>Number of pixels to crop off the left side of an image.</td>
      </tr>
      <tr>
         <td id="timelapse" class="settings-header" colspan="3">Timelapse Settings</td>
      </tr>
      <tr>
         <td id=dailytimelapse" class="subsettings-header" colspan="3">Daily Timelapse</td>
      </tr>
      <tr>
         <td id="timelapsegenerate"><span class="web-ui-setting">Generate</span></td>
         <td>Yes</td>
         <td>Enable to generate a timelapse video at the end of the night.</td>
      </tr>
      <tr>
         <td id="timelapsewidth"><span class="web-ui-setting">Width</span></td>
         <td>0</td>
         <td>Changes the width of the generated timelapse; must be an even number.
            <br><span class="WebUIValue">0</span> uses the images's full size.
            <br>Large sensor cameras like the RPi HQ often need the timelapse to be shrunk
            in order for timelapses to work (or the individual images need to be shrunk).
         </td>
      </tr>
      <tr>
         <td id="timelapseheight"><span class="web-ui-setting">Height</span></td>
         <td>0</td>
         <td>Changes the height of the generated timelapse; must be an even number.
            <br><span class="WebUIValue">0</span> uses the images's full size.
            <br>If you change the width and height you'll probably want the resulting aspect ratio
            to match the original images.
         </td>
      </tr>
      <tr>
         <td id="timelapsebitrate"><span class="web-ui-setting">Bitrate</span></td>
         <td>5000</td>
         <td>Bitrate the timelapse video will be created with, in kilobytes.
            Higher values produce better quality video but larger files.
            <br>Do NOT add a trailing <span class="WebUIValue">k</span>.
         </td>
      </tr>
      <tr>
         <td id="timelapsefps"><span class="web-ui-setting">FPS</span></td>
         <td>25</td>
         <td>The timelapse video
            <span class="web-ui-setting">F</span>rames
            <span class="web-ui-setting">P</span>er
            <span class="web-ui-setting">S</span>econd.
            <br>Higher numbers produce smoother, but shorter, videos.
         </td>
      </tr>
      <tr>
         <td id="timelapsekeepsequence"><span class="web-ui-setting">Keep Sequence</span></td>
         <td>No</td>
         <td>Keep the sequence of symbolic links created when creating a timelapse?
            <br>Primarily used when debugging.
         </td>
      </tr>
      <tr>
         <td id="timelapseextraparameters"><span class="web-ui-setting">Extra Parameters</span></td>
         <td></td>
         <td>Any additional timelapse parameters.
            If video quality is poor or videos don't plan on Apple devices,
            try adding <span class="WebUIValue">-level 3.1</span>.
            <br>Run <code>ffmpeg -?</code> to see the options.
         </td>
      </tr>
      <tr>
         <td class="subsettings-header" colspan="3">Mini-Timelapse</td>
      </tr>
      <tr>
         <td class="subsettings-header subsettings-header-note" colspan="3">
            Several of these settings are similar to the setting with the same
            name for daily timelapses.
            In those cases, only differences are noted.
         </td>
      </tr>
      <tr>
         <td id="minitimelapsenumimages"><span class="web-ui-setting">Number Of Images</span></td>
         <td>0</td>
         <td>A "mini-timelapse" only includes the most recent images and is created often.
            It's a good way to see "recent" activity.
            This setting determines the number of images in the mini-timelapse.
            Keep in mind the more images you have the longer it'll take to create the video.
            30 is a good starting point.
            <span class="WebUIValue">0</span> disables mini-timelapse creation.
            <br><b>Note that each mini-timelapse overwrites the prior one.</b>
            <br>The following settings only apply if this settings is greater than 0.
         </td>
      </tr>
      <tr>
         <td id="minitimelapseforcecreation"><span class="web-ui-setting">Force Creation</span></td>
         <td>No</td>
         <td>Should a mini-timelapse be created even if
            <span class="web-ui-setting">Number Of Images</span> images
            haven't been taken yet?
            For example, you want 15 images in each mini-timelapse but only 5 have been taken;
            should a mini-timelapse still be created?
         </td>
      </tr>
      <tr>
         <td id="minitimelapsefrequency"><span class="web-ui-setting">Frequency</span></td>
         <td>5</td>
         <td>
            After how many images should the mini-timelapse be created?
            Slower machines and machines with slow networks should use higher numbers.
            3&nbsp;-&nbsp;5 works well on a Pi 4 with 4 GB memory.
            <br>Every <span class="web-ui-setting">Frequency</span> images a new
            mini-timelapse is created using the last
            <span class="web-ui-setting">Number Of Images</span> images.
            For example, every 5 frames a new mini-timelapse is created using the most recent 15 images.
            <p>
            <blockquote class="warning">
               Be <strong>very</strong> careful when setting the
               <span class="web-ui-setting">Number Of Images</span> and
               <span class="web-ui-setting">Frequency</span> settings.
               If either or both numbers are too high,
               or the daytime or nighttime <span class="web-ui-setting">Delay</span> is too short,
               there may not be enough time to finish one mini timelapse creation before
               the next one starts.
               If this happens the second one will be aborted and you'll see a System Message in the WebUI
               (you may need to refresh your browser page to see it).
            </blockquote>
            </p>
         </td>
      </tr>
      <tr>
         <td id="minitimelapsewidth"><span class="web-ui-setting">Width</span></td>
         <td>0</td>
         <td></td>
      </tr>
      <tr>
         <td id="minitimelapseheight"><span class="web-ui-setting">Height</span></td>
         <td>0</td>
         <td></td>
      </tr>
      <tr>
         <td id="minitimelapsebitrate"><span class="web-ui-setting">Bitrate</span></td>
         <td>2000</td>
         <td>This is normally smaller than a full timelapse to save on processing time.</td>
      </tr>
      <tr>
         <td id="minitimelapsefps"><span class="web-ui-setting">FPS</span></td>
         <td>5</td>
         <td>Mini-timelapses contain a small number of images so
            this setting should be low to avoid very short videos.
         </td>
      </tr>
      <tr>
         <td id="bothtimelapses" class="subsettings-header" colspan="3">Both Timelapses</td>
      </tr>
      <tr>
         <td id="timelapsevcodec"><span class="web-ui-setting">VCODEC</span></td>
         <td>libx264</td>
         <td>Encoder used to create the timelapse video.
            Rarely changed.
            <br>
            Run <code>allsky-config encoders</code> for a (long) list.
         </td>
      </tr>
      <tr>
         <td id="timelapsevpixfmt"><span class="web-ui-setting">Pixel format</span></td>
         <td>yuv420p</td>
         <td>Pixel format.
            Rarely changed.
            <br>
            Run <code>allsky-config pix_fmts</code> for a (long) list.
         </td>
      </tr>
      <tr>
         <td id="timelapsefflog"><span class="web-ui-setting">Log Level</span></td>
         <td>Warning</td>
         <td>Level of debugging information output when creating a timelapse.
            Set to <span class="WebUIValue">Info + Warnings + Errors</span> for more output.
            Primarily used for debugging or when tuning the algorithm.
         </td>
      </tr>
      <tr>
         <td class="settings-header" colspan="3">Keogram and Startrails Settings</td>
      </tr>
      <tr>
         <td id="keograms" class="subsettings-header" colspan="3">Keograms</td>
      </tr>
      <tr>
         <td id="keogramgenerate"><span class="web-ui-setting">Generate</span></td>
         <td>Yes</td>
         <td>Enable to generat a keogram image at the end of the night.</td>
      </tr>
      <tr>
         <td id="keogramexpand"><span class="web-ui-setting">Expand</span></td>
         <td>Yes</td>
         <td>Enable to expand keograms to the image width.
            Same as the "--image-expand" and "-x" options.
         </td>
      </tr>
      <tr>
         <td id="keogramfontname"><span class="web-ui-setting">Font Name</span></td>
         <td>Simplex</td>
         <td>Font name.</td>
      </tr>
      <tr>
         <td id="keogramfontcolor"><span class="web-ui-setting">Font Color</span></td>
         <td>#ffffff (white)</td>
         <td>
            Color of the date/time label on the keogram.
            Same as the "--font-color" and "-C" options.
            <br>The color can be specified using one of the following:
            <ol>
               <li>Three comma- or space-separated numbers between
                  <code>0</code> and <code>255</code>.
                  where the numbers are in Red, Green, Blue order:
                  <code>0,255,0</code> would be green and
                  <code>255 0 1</code> would be red with a tiny bit of blue.
               <li>A <code>#</code> followed by <strong>six</strong> hex digits between
                  <code>00</code> and <code>ff</code>
                  where the digits are in Red, Green, Blue order:
                  <code>#00ff00</code> would be green and
                  <code>#ff0001</code> would be red with a tiny bit of blue.
               <li>A <code>#</code> followed by <strong>three</strong> hex digits between
                  <code>0</code> and <code>f</code>
                  where the digits are in Red, Green, Blue order:
                  <code>#0f0</code> is equal to <code>#00ff00</code>
                  and would be green and
                  <code>#f00</code> is equal to <code>#ff0011</code>
                  and would be red with a little bit of blue.
            </ol>
            Hex digits include: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, a, b, c, d, e, and f,
            where hex <code>a</code> == decimal <code>10</code>,
            b == 11, c == 12, d == 13, e == 14, and f == 15.
            Hex <code>10</code> == decimal <code>16</code> and
            hex <code>ff</code> == decimal <code>255</code>.
            <br>
            The larger each number or hex digit, the more of that color is present, hence
            <code>#000000</code> is pure black,
            <code>255 255 255</code> is pure white,
            and <code>128,128,128</code> is middle gray.
         </td>
      </tr>
      <tr>
         <td id="keogramfontsize"><span class="web-ui-setting">Font Size</span></td>
         <td>2</td>
         <td>Font size.
            Same as the "--font-size" and "-S" options.
         </td>
      </tr>
      <tr>
         <td id="keogramfontlinethickness"><span class="web-ui-setting">Font Line Thickness</span></td>
         <td>3</td>
         <td>Thickness of the font's line.
            Same as the "--font-line" and "-L" options.
         </td>
      </tr>
      <tr>
         <td id="keogramextraparameters"><span class="web-ui-setting">Extra Parameters</span></td>
         <td></td>
         <td>Optional additional keogram creation parameters.
            Execute <code>~/allsky/bin/keogram --help</code> for a list of options.
         </td>
      </tr>
      <tr>
         <td id="startrails" class="subsettings-header" colspan="3">Startrails</td>
      </tr>
      <tr>
         <td id="startrailsgenerate"><span class="web-ui-setting">Generate</span></td>
         <td>Yes</td>
         <td>Enable to generate a startrails image at the end of night.</td>
      </tr>
      <tr>
         <td id="startrailsbrightnessthreshold"><span class="web-ui-setting">Brightness Threshold</span></td>
         <td>0.1</td>
         <td>Average brightness level above which images are discarded
            (moon, head lights, aurora, etc.).
            If you are only getting very short trails, or none at all, adjust this number.
            <br>Values are 0.0 (pure black, filters out nothing)
            to 1.0 (pure white, uses every image).
         </td>
      </tr>
      <tr>
         <td id="startrailsextraparameters"><span class="web-ui-setting">Extra Parameters</span></td>
         <td></td>
         <td>Optional additional startrails creation parameters.
            Execute <code>~/allsky/bin/startrails --help</code> for a list of options.
         </td>
      </tr>
      <tr>
         <td id="websitesandremoteserver" class="settings-header" colspan="3">Websites and Remote Server Settings</td>
      </tr>
      <tr>
         <td class="settings-header settings-header-note" colspan="3">
            Allsky supports uploading files to a local (i.e., on your Pi) Website,
            a remote (i.e., not on your Pi) Website,
            and/or a remote server that is NOT an Allsky Website.
         </td>
      </tr>
      <tr>
         <td id="imagesresizeuploadswidth"><span class="web-ui-setting">Resize Uploaded Images Width</span></td>
         <td>0</td>
         <td>Set to an even number to resize images that will be uploaded.
            This decreases the size of uploaded files and saves network bandwidth.
            Further, images from cameras with large sensors won't fit on most monitors
            at full resolution, so in effect it's a waste to have large images.
            Set to <span class="WebUIValue">0</span> to disable resizing.
         </td>
      </tr>
      <tr>
         <td id="imagesresizeuploadsheight"><span class="web-ui-setting">Resize Uploaded Images Height</span></td>
         <td>0</td>
         <td>Same as <span class="web-ui-setting">Resize Uploaded Images Width</span>
            but for the height.
            If that setting is <span class="WebUIValue">0</span> this setting must be as well.
         </td>
      </tr>
      <tr>
         <td id="imageuploadfrequency"><span class="web-ui-setting">Upload Every X Images</span></td>
         <td>1</td>
         <td>How often should the current image be uploaded?
            This is useful for slow or costly networks.
            <span class="WebUIValue">0</span> disables uploading images
            Note that startrails, keograms, and timelapse videos have their own "upload" settings.
         </td>
      </tr>
      <tr>
         <td id="timelapseupload"><span class="web-ui-setting">Upload Daily Timelapse</span></td>
         <td>Yes</td>
         <td>Enable to upload the timelapse video to an Allsky Website and/or remote server.
            If not set, the timelapse videos can still be viewed via the
            <span class="WebUIWebPage">Images</span> link on the WebUI.
            <br>Ignored if you you do not have an Allsky Website or remote server.
         </td>
      </tr>
      <tr>
         <td id="timelapseuploadthumbnail"><span class="web-ui-setting">Upload Daily Timelapse Thumbnail</span></td>
         <td>Yes</td>
         <td>Enable to upload the timelapse video's thumbnail to your Allsky Website.
            Many remote servers don't support thumbnail creation so the thumbnail needs to be
            created on the Pi and uploaded.
            <br>Not needed if your only Allsky Website is on your Pi.
         </td>
      </tr>
      <tr>
         <td id="keogramupload"><span class="web-ui-setting">Upload Keogram</span></td>
         <td>Yes</td>
         <td>Enable to upload the keogram image to an Allsky Website and/or remote server.</td>
      </tr>
      <tr>
         <td id="startrailsupload"><span class="web-ui-setting">Upload Startrails</span></td>
         <td>Yes</td>
         <td>Enable to upload the startrails image to an Allsky Website and/or remote server.</td>
      </tr>
      <tr>
         <td id="minitimelapseupload"><span class="web-ui-setting">Upload Mini-Timelapse</span></td>
         <td>Yes</td>
         <td></td>
      </tr>
      <tr>
         <td id="minitimelapseuploadthumbnails"><span class="web-ui-setting">Upload Mini-Timelapse Thumbnail</span></td>
         <td>Yes</td>
         <td></td>
      </tr>
      <tr>
         <td id="displaysettings"><span class="web-ui-setting">Display Settings</span></td>
         <td>No</td>
         <td>People sometimes ask others what settings they are using.
            Enable this setting to add a link to your Allsky Website's right-side
            popout that displays your settings.
            <br>This only works if you are running the Allsky Website.
         </td>
      </tr>
      <tr>
         <td "id=localwebsite" class="subsettings-header" colspan="3">Local Website</td>
      </tr>
      <tr>
         <td id="uselocalwebsite"><span class="web-ui-setting">Use Local Website</span></td>
         <td>No</td>
         <td>Enable to use a <b>local</b> Allsky Website.
            No other settings are needed for a local Website.
            <br>
            If you were using a local Website and disable it you will be asked if you
            want to keep or remove the saved images, keograms, startrails, and timelapse videos.
            Either way, the Website itself is not not removed nor are its settings so you can
            easily re-enable it and pick up where you left off.
         </td>
      </tr>
      <tr>
         <td id="daystokeeplocalwebsite"><span class="web-ui-setting">Days To Keep on Pi Website</span></td>
         <td>14</td>
         <td>Any image, video, or thumbnail older than this many days
            will be deleted at each end of night.
            <span class="WebUIValue">0</span> disables the check and keeps ALL days' web data;
            you will need to manually manage disk space.
         </td>
      </tr>
      <tr>
         <td id="remotewebsite" class="subsettings-header" colspan="3">Remote Website</td>
      </tr>
      <tr>
         <td id="useremotewebsite"><span class="web-ui-setting">Use Remote Website</span></td>
         <td>No</td>
         <td>Enable to use a <b>remote</b> Allsky Website.
            Enable the Website BEFORE you
            <a allsky="true" external="true" href="/documentation/installations/AllskyWebsite.html">install</a>
            it since the installation needs the settings below.
         </td>
      </tr>
      <tr>
         <td id="remotewebsiteimagedir"><span class="web-ui-setting">Image Directory</span></td>
         <td></td>
         <td>
            Name of the directory the current image should be uploaded to.
            <blockquote>
               This setting is a major cause of confusion for many users.
               If you don't know what to enter,
               ask the person or company supporting the server or look in the
               <a allsky="true" external="true" href="/documentation/troubleshooting/uploads.html">
               Troubleshooting -> Uploads</a> page for more information.
            </blockquote>
         </td>
      </tr>
      <tr>
         <td id="remotewebsiteprotocol"><span class="web-ui-setting">Protocol</span></td>
         <td>ftps</td>
         <td>
            Specifies how files should be uploaded to the remote Website.
            <ul class="minimalPadding">
               <li><code>ftps</code> -
                  uses secure File Transfer Protocol (FTPs) to upload to a remote server.
               <li><code>sftp</code> -
                  uses SSH file transfer to upload to a remote server.
               <li>
                  <code>ftp</code> -
                  uses (insecure) File Transfer Protocol (FTP) to upload to a remote server.
                  <blockquote class="warning">
                     <code>ftp</code> is unsecure;
                     please use
                     <code>ftps</code> or
                     <code>sftp</code> instead.
                  </blockquote>
               <li><code>scp</code> -
                  uses secure cp (copy) to copy the file to a remote server.
               <li><code>rsync</code> -
                  uses rsync to copy the file to a remote server.
               <li><code>s3</code> -
                  copies the file to an Amazon Web Services (AWS) server.
               <li><code>gcs</code> -
                  copies the file to a Google Cloud Storage (GCS) server.
            </ul>
            <p>Some of the settings below only apply to certain protocols.</p>
         </td>
      </tr>
      <tr>
         <td id="REMOTEWEBSITE_HOST"><span class="web-ui-setting">Server Name</span></td>
         <td></td>
         <td>Name of the remote server.
            Note that this is normally NOT the same as the URL used to access the server.
            If you don't know the name of the server,
            ask the person or company supporting the server.
         </td>
      </tr>
      <tr>
         <td id="REMOTEWEBSITE_PORT"><span class="web-ui-setting">Port</span></td>
         <td></td>
         <td>(ftp protocols only) Optional port required by the server.
            This is rarely needed as the software can usually determine what port to use.
         </td>
      </tr>
      <tr>
         <td id="REMOTEWEBSITE_USER"><span class="web-ui-setting">User Name</span></td>
         <td></td>
         <td>The username of the login on the remote Website.
         </td>
      </tr>
      <tr>
         <td id="REMOTEWEBSITE_PASSWORD"><span class="web-ui-setting">Password</span></td>
         <td></td>
         <td>The password of the login on the remote Website.
         </td>
      </tr>
      <tr>
         <td id="REMOTEWEBSITE_LFTP_COMMANDS"><span class="web-ui-setting">FTP Commands</span></td>
         <td></td>
         <td>(ftp protocols only) Optional command(s) to send to the ftp server prior to transfering files.
            If you have problems uploading to an ftp server you'll often need to add
            something to this field - see the
            <a allsky="true" external="true" href="/documentation/troubleshooting/uploads.html">Troubleshooting -> Uploads</a>
            page for more information.
            <br>
            If you need to add multiple commands, separate them with a semi-colon.
         </td>
      </tr>
      <tr>
         <td id="REMOTEWEBSITE_SSH_KEY_FILE"><span class="web-ui-setting">SSH Public Key File</span></td>
         <td></td>
         <td>
            (scp and rsync protocols only) Path to the SSH public key file.
            <p>
               You need to set up SSH key authentication on your server.
               First, generate a public SSH key on your Pi:
            <pre>ssh-keygen -t rsa</pre>
            When prompted, leave the default filename, and use an empty passphrase.
            </p>
            Then, copy the generated key to your server:
            <pre>ssh-copy-id remote_username@remote_server</pre>
            Replace <code>remote_username</code> with the login name on the remote server
            and replace <code>remote_server</code> with the name or IP address of the remote server.
            If you are prompted to <code>...continue connecting...</code>, enter <code>yes</code>.
            <p>
               The private SSH key will be stored in
               <span class="fileName">~/.ssh/id_rsa</span>).
            </p>
            <p>
               If you are using SSH Key with Amazon's Lightsail,
               copy the <span class="fileName">ssh-key.pem</span> file to your Pi,
               for example, in <span class="fileName">~</span>,
               then execute <code class="nowrap">chmod 400 ~/ssh-key.pem</code> and set:
            <ul class="minimalPadding">
               <li><span class="web-ui-setting">Protocol</span> to <code>sftp</code>
               <li><span class="web-ui-setting">Server Name</span> to <code>remote host name</code>
               <li><span class="web-ui-setting">User Name</span> to <code>remote user name</code>
               <li><span class="web-ui-setting">Password</span> to <code>n/a</code>
               <li><span class="web-ui-setting">FTP Commands</span> to
                  <code>set sftp:connect-program 'ssh -a -x -i /home/pi/ssh-key.pem'</code>
            </ul>
            </p>
         </td>
      </tr>
      <tr>
         <td id="REMOTEWEBSITE_AWS_CLI_DIR"><span class="web-ui-setting">AWS CLI Directory</span></td>
         <td></td>
         <td>
            (s3 protocol only) Directory on the Pi where the AWS Command-Line Interface (CLI)
            tools are installed,
            typically <span class="fileName">${HOME}/.local/bin</span>.
            You need to install tools:
            <pre>
pip3 install awscli --upgrade --user
export PATH="${HOME}/.local/bin:${PATH}"
aws configure
</pre>
            When prompted, enter a valid access key ID, Secret Access Key, and Default region name,
            for example, "us-west-2".
            Set the Default output format to "json" when prompted.
         </td>
      </tr>
      <tr>
         <td id="REMOTEWEBSITE_S3_BUCKET"><span class="web-ui-setting">S3 Bucket</span></td>
         <td></td>
         <td>(s3 protocol only) Name of the S3 bucket where files will be uploaded to
            (must be in Default region specified above).
            Suggested name is <span class="WebUIValue">allskybucket</span>.
            You may want to turn off or limit bucket versioning to avoid consuming lots of
            space with multiple versions of the "image.jpg" files.
         </td>
      </tr>
      <tr>
         <td id=REMOTEWEBSITE_S3_ACL""><span class="web-ui-setting">S3 ACL</span></td>
         <td>private</td>
         <td>(s3 protocol only) S3 Access Control List (ACL).
            <br>
            If you want to serve your uploaded files vis http(s),
            change this to <code>public-read</code>.
            You will need to ensure the S3 bucket policy is configured to allow public access to
            objects with a <code>public-read</code> ACL.
            <br>You may need to set a CORS policy in S3 if the files are to be accessed by
            Javascript from a different domain.
         </td>
      </tr>
      <tr>
         <td id="REMOTEWEBSITE_GCS_BUCKET"><span class="web-ui-setting">GCS Bucket</span></td>
         <td></td>
         <td>(gcs protocol only) Name of the GCS bucket where files will be uploaded to.
            Suggested name is <span class="WebUIValue">allskybucket</span>.
            <br>
            You need to install the <code>gsutil</code> command which is part of the Google Cloud SDK.
            See installation instructions
            <a external="true" href="https://cloud.google.com/storage/docs/gsutil_install">here</a>.
            <br>
            NOTE: The <code>gsutil</code> command must be installed somewhere in the standard ${PATH},
            usually in <span class="fileName">/usr/bin</span>.
            Make sure you authenticate the cli tool with the correct user as well.
         </td>
      </tr>
      <tr>
         <td id="REMOTEWEBSITE_GCS_ACL"><span class="web-ui-setting">GCS ACL</span></td>
         <td>private</td>
         <td>(gcs protocol only) GCS Access Control List (ACL).
            You can use any one of the predefined ACL rules found
            <a external="true" href="https://cloud.google.com/storage/docs/access-control/lists#predefined-acl">here</a>.
            To access files over https, set this to <code>publicRead</code>.
         </td>
      </tr>
      <tr>
         <td id=remotewebsiteverimageuploadoriginalname""><span class="web-ui-setting">Upload With Original Name</span></td>
         <td>No</td>
         <td>Determines the name of the uploaded image:
            <span class="fileName">image.jpg</span> (if No)
            or <span class="fileName">image-YYYYMMDDHHMMSS.jpg</span> (if Yes).
            <br>This is rarely used since changing the image name will make it unviewable.
         </td>
      </tr>
      <tr>
         <td id="remotewebsiteurl"><span class="web-ui-setting">Website URL</span></td>
         <td></td>
         <td>
            Your website's URL, for example
            <span class="WebUIValue">https://www.mywebsite.com/allsky</span>.
            <blockquote>
               <ul>
                  <li>If a <span class="web-ui-setting">Website URL</span> is specified,
                     the <span class="web-ui-setting">Image URL</span> must also be specified, and vice versa.
                  <li>Both URLs must begin with
                     <span class="WebUIValue">http</span> or <span class="WebUIValue">https</span>.
               </ul>
            </blockquote>
         </td>
      </tr>
      <tr>
         <td id="remotewebsiteimageurl"><span class="web-ui-setting">Image URL</span></td>
         <td></td>
         <td>The URL to your allsky image, for example
            <span class="WebUIValue">https://www.mywebsite.com/allsky/image.jpg</span>.
            Normally this will be the <span class="web-ui-setting">Website URL</span> followed by
            <code>image.jpg</code>.
            <br>Use the more secure "https" over "http" if possible.
         </td>
      </tr>
      <tr>
         <td id="remoteserver" class="subsettings-header" colspan="3">Remote Server</td>
      </tr>
      <tr>
         <td class="subsettings-header subsettings-header-note" colspan="3">
            These settings are the same as for the Remote Website so are not described.
         </td>
      </tr>
      <tr>
         <td id="useremoteserver"><span class="web-ui-setting">Use Remote Server</span></td>
         <td>No</td>
         <td>Enable to use a remote server which is NOT running the Allsky Website software.
            Files will be copied to this server which normally will be a private website
            where you want to display the most recent images along with other,
            non-Allsky information.
            For example, if you have an observatory website and want to show the latest image,
            you would use the settings below.
         </td>
      </tr>
      <tr>
         <td id="remoteserverimagedir"><span class="web-ui-setting">Image Directory</span></td>
         <td></td>
         <td></td>
      </tr>
      <tr>
         <td id="remoteserverprotocol"><span class="web-ui-setting">Protocol</span></td>
         <td>ftps</td>
         <td></td>
      </tr>
      <tr>
         <td id="REMOTESERVER_HOST"><span class="web-ui-setting">Server Name</span></td>
         <td></td>
         <td></td>
      </tr>
      <tr>
         <td id="REMOTESERVER_PORT"><span class="web-ui-setting">Port</span></td>
         <td></td>
         <td></td>
      </tr>
      <tr>
         <td id="REMOTESERVER_USER"><span class="web-ui-setting">User Name</span></td>
         <td></td>
         <td></td>
      </tr>
      <tr>
         <td id="REMOTESERVER_PASSWORD"><span class="web-ui-setting">Password</span></td>
         <td></td>
         <td></td>
      </tr>
      <tr>
         <td id="REMOTESERVER_LFTP_COMMANDS"><span class="web-ui-setting">FTP Commands</span></td>
         <td></td>
         <td></td>
      </tr>
      <tr>
         <td id="REMOTESERVER_SSH_KEY_FILE"><span class="web-ui-setting">SSH Public Key File</span></td>
         <td></td>
         <td></td>
      </tr>
      <tr>
         <td id="REMOTESERVER_ASW_CLI_DIR"><span class="web-ui-setting">AWS CLI Directory</span></td>
         <td></td>
         <td></td>
      </tr>
      <tr>
         <td id="REMOTESERVER_S3_BUCKET"><span class="web-ui-setting">S3 Bucket</span></td>
         <td></td>
         <td></td>
      </tr>
      <tr>
         <td id="REMOTESERVER_S3_ACL"><span class="web-ui-setting">S3 ACL</span></td>
         <td>private</td>
         <td></td>
      </tr>
      <tr>
         <td id="REMOTESERVER_GCS_BUCKET"><span class="web-ui-setting">GCS Bucket</span></td>
         <td></td>
         <td></td>
      </tr>
      <tr>
         <td id="REMOTESERVER_GCS_ACL"><span class="web-ui-setting">GCS ACL</span></td>
         <td>private</td>
         <td></td>
      </tr>
      <tr>
         <td id="remoteserverimageuploadoriginalname"><span class="web-ui-setting">Upload With Original Name</span></td>
         <td>No</td>
         <td>
            <br>Unless you are using the remote server as a backup,
            this is <b>rarely</b> used since changing the image name will make it unviewable.
         </td>
      </tr>
      <tr>
         <td id="remoteservervideodestinationname"><span class="web-ui-setting">Remote Video File Name</span></td>
         <td>allsky.mp4</td>
         <td>
            <br>Unless you are using the remote server as a backup,
            this is <b>usually</b> used so the server knows the file name.
         </td>
      </tr>
      <tr>
         <td id=remoteserverkeogramdestinationname""><span class="web-ui-setting">Remote Keogram File Name</span></td>
         <td>keogram.jpg</td>
         <td>
            <br>Unless you are using the remote server as a backup,
            this is <b>usually</b> used so the server knows the file name.
         </td>
      </tr>
      <tr>
         <td id=remoteserverstartrailsdestinationname""><span class="web-ui-setting">Remote Startrails File Name</span></td>
         <td>startrails.jpg</td>
         <td>
            <br>Unless you are using the remote server as a backup,
            this is <b>usually</b> used so the server knows the file name.
         </td>
      </tr>
      <tr>
         <td id="allskymap" class="settings-header" colspan="3">Allsky Map Settings</td>
      </tr>
      <tr>
         <td class="settings-header settings-header-note" colspan="3">
            If you want your allsky camera's location to display on the
            <a external="true" href='https://www.thomasjacquin.com/allsky-map'>Allsky map</a>,
            the information in this section will be sent to the map server every other
            morning to ensure it's fresh.
            The server automatically removes old data.
            Note that only a limited number of updates per day are allowed to catch bogus updates.
         </td>
      </tr>
      <tr>
         <td id="showonmap"><span class="web-ui-setting">Show on Map</span></td>
         <td>No</td>
         <td>Enable to have your camera appear on the
            <a external="true" href='https://www.thomasjacquin.com/allsky-map'>Allsky map</a>.
            <br><b>If off, the following settings are ignored.</b>
         </td>
      </tr>
      <tr>
         <td id="location"><span class="web-ui-setting">Location</span> <span class="allsky-website-dependent">AW</span></td>
         <td></td>
         <td>The location of your camera.
            You can put any level of detail you want.
         </td>
      </tr>
      <tr>
         <td id="owner"><span class="web-ui-setting">Owner</span> <span class="allsky-website-dependent">AW</span></td>
         <td></td>
         <td>The owner of the camera - your name, an association name, an observatory, etc.</td>
      </tr>
      <tr>
         <td id="lens"><span class="web-ui-setting">Lens</span> <span class="allsky-website-dependent">AW</span></td>
         <td></td>
         <td>The lens you're using on your camera, for example: <b>Arecont 1.55</b>.</td>
      </tr>
      <tr>
         <td id="equipmentinfo"><span class="web-ui-setting">Equipment Info</span> <span class="allsky-website-dependent">AW</span></td>
         <td></td>
         <td>Any optional information you want to add about the equipment you are using.
            For example, if you are using a camera with no infrared filter (a "NoIR" camera).
         </td>
      </tr>
      <tr>
         <td id=webuiconfiguration" class="settings-header" colspan="3">WebUI Configuration</td>
      </tr>
      <tr>
         <td id="imagessortorder"><span class="web-ui-setting">Images Sort Order</span></td>
         <td>Ascending</td>
         <td>Determines how the images for a day in the
            the WebUI's <span class="WebUIWebPage">Images</span> page are displayed.
            <br><span class="WebUIValue">Ascending</span>
            sorts oldest image to newest.
            <br><span class="WebUIValue">Descending</span>
            sorts newest (i.e., most recent) image to oldest.
         </td>
      </tr>
      <tr>
         <td id="showupdatedmessage"><span class="web-ui-setting">Show Updated Message</span></td>
         <td>Yes</td>
         <td>Determines whether or not the
            <span class='alert-info'>Daytime images updated every...</span>
            message in the <span class='WebUIWebPage'>Live View</span> page is shown.
         </td>
      </tr>
      <tr>
         <td id="uselogin"><span class="web-ui-setting">Require WebUI Login</span></td>
         <td>Yes</td>
         <td>Determines if you need to log into the WebUI.
            <b>If you Pi is accessible on the Internet, do NOT disable this!!</b>
         </td>
      </tr>
      <tr>
         <td id="webuidatafiles"><span class="web-ui-setting">System Page Additions</span></td>
         <td></td>
         <td>One or more colon-separated full path names to text files
            that contain user-supplied data to display on the WebUI's
            <span class="WebUIWebPage">System</span> page.
            See <a allsky="true" external="true" href="/documentation/explanations/SystemPageAdditions.html">
            System Page Additions</a>
            for more information and an example of this setting.
         </td>
      </tr>
      <tr>
         <td id=database" class="settings-header" colspan="3">Allsky Database Settings</td>
      </tr>
      <tr>
         <td></td>
         <td colspan="2">
            <blockquote class="warning">
               Only change the database settings if you know what you are doing.
            </blockquote>
         </td>
      </tr>
      <tr>
         <td id="imagessortorder"><span class="web-ui-setting">Enable Database</span></td>
         <td>Yes</td>
         <td>Enables the Allsky database, which keeps information on images taken
            like exposure time and a day/night flag.
            Some Allsky modules update these records, for example, the meteor detection module
            adds the number of meteors to each image's database record.
            <br>
            The database allows capabilities like using only nighttime images in startrails.
            <br>
            Disabling the database will keep many new features from working properly.
         </td>
      </tr>
      <tr>
         <td id="imagessortorder"><span class="web-ui-setting">Database</span></td>
         <td>allsky</td>
         <td>The name of the database.
         </td>
      </tr>
      <tr>
         <td id="imagessortorder"><span class="web-ui-setting">Database Type</span></td>
         <td>SQLite</td>
         <td>The type of database.
            MySQL has more features but uses a lot more CPU and memory than SQLite.
            It would typically only be used if you already have a MySQL database on your Pi,
            which is extremely rare.
         </td>
      </tr>
      <tr>
         <td id="imagessortorder"><span class="web-ui-setting">Database Host</span></td>
         <td></td>
         <td>(MySQL only) The IP address or hostname of the server running the database.
            By default the database runs on your Pi.
         </td>
      </tr>
      <tr>
         <td id="imagessortorder"><span class="web-ui-setting">Database User</span></td>
         <td></td>
         <td>(MySQL only) The username used to connect to the database.
            Suggest using the same as your Pi login so you have one less thing to remember.
         </td>
      </tr>
      <tr>
         <td id="imagessortorder"><span class="web-ui-setting">User Password</span></td>
         <td></td>
         <td>
            (MySQL only) The password used to connect to the database.
            <blockquote>
               Keep track of the User and Password - if the
               <span class="fileName">~/allsky/env.json</span> file is accidently removed you'll
               need to enter the User and Password in order for the database to work.
            </blockquote>
         </td>
      </tr>
      <tr>
         <td class="settings-header" colspan="3">Camera</td>
      </tr>
      <tr>
         <td id="cameratype"><span class="web-ui-setting">Camera Type</span></td>
         <td></td>
         <td>
            The type of camera you are using: ZWO or RPi.
            <br>To select a camera of a different <span class="web-ui-setting">Camera Type</span>:
            <ol class="minimalPadding">
               <li>Select the Type.
               <li>Save the change via the
                  <span class="btn btn-primary btn-not-real btn-small">Save changes</span> button.
               <li>Update the <span class="web-ui-setting">Camera Model</span> as desired.
            </ol>
            If you connect or disconnect a camera on the Pi,
            select <span class="dropdown">Refresh</span>
            to update the list of camera types and models.
         </td>
      </tr>
      <tr>
         <td id="cameramodel"><span class="web-ui-setting">Camera Model</span></td>
         <td></td>
         <td>The model of camera you are using.
            Note this list is only the models of
            the current <span class="web-ui-setting">Camera Type</span>.
         </td>
      </tr>
   </tbody>
</table>