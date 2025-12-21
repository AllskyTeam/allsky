This page lists the major changes to all Allsky releases.
You can also see the
[Known Issues and Limitations](knownIssues.html)
of the current release.

---

## v2025.xx.xx

???+ "v2025.xx.xx"

    #### Changes that may require action (upgrades only)

    !!! warning
        The changes in this section may require settings changes;
        after upgrading, check that your settings and images look right.

    - The Buster operating system is no longer supported.
    - The "legacy" overlay method and the **Image Overlay Settings** section of the WebUI no longer exist. All overlays are now done via the **Overlay Editor** in the WebUI.
    - If your camera is very noisy it may create dark frames that are brighter than the new ==Dark Frame Upper Threshold== value, which is `0.05`. This threshold was `0.10` in the prior release.
    - The AS_TEMPERATURE_C and AS_TEMPERATURE_F values (sensor temperature) now have 1 digit after the decimal point. This may require you to change the format of those variables in the Overlay Editor.

    #### Enhancements / Changes

    - **WebUI changes:**
        - Several menu items are now grouped together; putting your cursor over them or clicking on them shows a list of choices.  
          For example, the **Settings** group contains **Allsky Settings** and **Editor**.

        - **Improved Login System**
            - The old login system has been removed and a new version implemented
            - Existing login details are not affected
            - Only used if WebUI login is enabled
            - Provides stronger passwords if the Pi will be exposed to the internet

        - **New Database**
            - Stores information on every image taken (exposure, day/night, etc.)
            - Modules can add derived data such as star and meteor counts
            - Makes it easier to filter images (e.g. only nighttime startrails)
            - Choice of zero-configuration internal DB or advanced configuration

        - **Images page**
            - Shows the image icon only if at least one image exists for the day
            - Timelapse and mini-timelapse icons have been updated
            - Days with no images, startrails, keograms, or timelapses are no longer shown
            - Directories in the `images` directory starting with `test` are now displayed
            - Image, timelapse, keogram, and startrail icons are now aligned with the Delete button

        - You can now view the mini-timelapse (if it exists) from the top of the **Live View** page

        - **Overlay Editor**
            - Enhanced Variable Manager for easier variable handling
            - Introduced **Blocks** for adding related fields in one step
            - New, more flexible variable formatting system
            - Fields can be grouped and moved together
            - New alignment tools:
                - Left alignment
                - Equal vertical spacing
                - Equal horizontal alignment
            - Rectangles can now be drawn with configurable border and background colours
            - Solar calculations moved to the new **Solar System** module
            - Font Manager now auto-detects fonts in use
            - **Mask Editor**
                - Create and edit masks directly in the WebUI
                - Accessible from the Image Manager
                - Masks can be reused by other modules (e.g. star count, meteor detection)

        - **Module Manager**
            - UI now dynamically adapts to selected devices
            - Search and filter modules by type
            - New configuration field types:
                - **Secret**
                - **I²C Input**
                - **1-Wire Input**
                - **AJAX Select**
                - **GPIO**
                - **Image**
                - **Variable**
                - **Position**
                - **URL**
                - **Host**
                - **Graph**
            - Refactored module system for easier development
            - New module installer (no git clone required)
            - Modules are automatically upgraded
            - New **Device Manager** for connected hardware
            - Modules moved into the main Allsky directory tree
            - **New / Updated Modules**
                - ADSB
                - AI (deprecated)
                - Dew Heater (PWM support; sensor data moving to Environment module)
                - Fans
                - GPIO (fixed)
                - Boilerplate
                - INA3221 (deprecated)
                - Keogram
                - LTR390 (deprecated)
                - PMSX003
                - Power
                - Rain Detector (YOLO-based, by Muchen Han)
                - Solar System
                - Environment
                - TPHBME680 (deprecated)
                - S3 Upload (Titan Astro)

            - **For Developers**
                - Class-based module architecture (backward compatible)
                - Reusable blocks and charts
                - Overlay and chart helper functions
                - Expanded metadata support:
                    - Conditional fields
                    - Advanced DB control
                    - Overlay data exposure
                    - Install/uninstall hooks

        - **Charts**
            - Create and manage charts for camera, hardware, and analysis data
            - Supports predefined and custom charts
            - Tab grouping and date-range selection
            - Auto-refresh support
            - Chart types:
                - Line, Spline, Area
                - Column, Bar
                - 3D Column, 3D Area
                - Gauge
                - Yes/No

        - **System page**
            - Auto refresh
            - Watchdog service control

        - **Helper Tools**
            - **Check Allsky** — runs `checkAllsky.sh`
            - **Startrails** — brightness threshold tuning
            - **Image Stretch** — stretch comparison
            - **Timelapse** — bitrate and FPS tuning

        - Left-hand menu can now collapse to icon-only mode

    - **Startrails**
        - `generateForDay.sh` now accepts a file list
        - `allsky-config get_startrails_info` shows brightness thresholds used

    - Camera images now save to `~/allsky/tmp/current_images`
      and Live View reads from there.
      The website `imageName` is now `/current/image.jpg`.

    - `generateForDay.sh` accepts additional arguments for keogram,
      startrails, and timelapse creation.

    - `allsky-config bad_images_info --show_bad_images`
      helps tune **Remove Bad Images Threshold** values.

    - Updated to ZWO SDK v1.39 (new camera support, 366MC Pro removed)
    - Improved security for internet-connected Allsky cameras

    #### Bug Fixes

    - Fixed missing thumbnails on days with thousands of images
    - Fixed notification images not uploading to remote servers
    - Fixed Allsky Map update failures with improved error reporting

    #### Deleted Settings

    - **Image Overlay Settings** removed from **Allsky Settings**
      For ZWO cameras, **Show Histogram Box** is now handled by the
      **ZWO Exposure Box** module.

    #### New Settings

    - ==Focus Mode== — temporarily optimizes capture speed for focusing
    - ==Dark Frame Upper Threshold==
    - ==Remove Bad Images Threshold Count==

    ---

## v2024.12.06

??? "v2024.12.06"

    ### v2024.12.06_06

    ???+ "v2024.12.06_06 - Point Release # 6"

        #### IMPORTANT NOTES:

        - This is the LAST major release that supports Buster.
        - This is the LAST major release that contains the "legacy" overlay method.

        #### Enhancements / Changes

        - When 4 consecutive errors occur while capturing images with an RPi camera, the last error is now shown in the WebUI's "System Messages" section.
        - The `allsky-config get_brightness_info` command now outputs the number of images used and not used in the startrails.
        - Added a [Troubleshooting Tools](/documentation/troubleshooting/troubleshootingTools.html) documentation page to list tools to aid in troubleshooting.

        #### Bug Fixes

        - Fixed an issue where downloading the support log from the **Getting Support** page would hang the page.
        - Fixed a couple issues with WebUI "System Messages":
            1. Some messages were displayed hundreds or thousands of times rather than being displayed once with a number of occurrences greater than 1.
            2. A message was truncated when unable to download the `de421.bsp` file.
        - Fixed an issue with updates to the Allsky Map server failing because multiple double quotes were in a field.
        - Fixed a rare situation where the **Module Manager** will fail to display any modules due to corruption in a module's metaData.

        #### New Settings

        - None

    ### v2024.12.06_05

    ??? "v2024.12.06_05 - Point Release # 5"

        #### Changes that may require action (upgrades only)

        !!! warning
            The changes in this section may require settings changes;
            after upgrading, check that your settings and images look right.

        - If your Keogram **Font Color** contained three numbers you'll need to reverse the order of the numbers.  
          This setting previously accepted two formats:
            1. `blue_number green_number red_number` (with spaces or commas separating the numbers) where each number is from `0` to `255`.
            2. `#RRGGBB` where each two-digit pair goes from hex `00` to `ff`.

          To be consistent with the hex order and with web pages, the order of the first format is now:
          `red_number green_number blue_number` (red and blue switched places).  
          The order of the second format did not change but it now accepts either 3 or 6 hex digits.  
          See [the documentation](/documentation/settings/allsky.html#keogramfontcolor) for more details on this setting.

        #### Enhancements / Changes

        - The `allsky-config get_brightness_info` command now displays how many images were used, and not used, in each startrail image.
          This is useful when setting the **Brightness Threshold**.

        #### Bug Fixes

        - For RPi cameras, the length of time Allsky waits before timing out an image was increased.
          For some Pi's, the prior 30-second timeout was too short when the Pi was extremely busy such as during timelapse creation.
        - Entering a **Locale** in the WebUI that is not installed on the Pi displays an error message and lists the locales that ARE installed and tells the user how to install other locales.
        - Mono cameras were calculating the mean image brightness twice: once prior to the initial save of the image and a second time when determining if the image was too dark or too bright.
          The second time used a different formula than the first time.

        #### New Settings

        - **None**

    ### v2024.12.06_04

    ??? "v2024.12.06_04 - Point Release # 4"

        #### Changes that may require action (upgrades only)

        !!! warning
            The changes in this section may require settings changes;
            after upgrading, check that your settings and images look right.

        - If your Keogram **Font Color** contained three numbers you'll need to reverse the order of the numbers.  
          This setting previously accepted two formats:
            1. `blue_number green_number red_number` (with spaces or commas separating the numbers) where each number is from `0` to `255`.
            2. `#RRGGBB` where each two-digit pair goes from hex `00` to `ff`.

          To be consistent with the hex order and with web pages, the order of the first format is now:
          `red_number green_number blue_number` (red and blue switched places).  
          The order of the second format did not change but it now accepts either 3 or 6 hex digits.  
          See [the documentation](/documentation/settings/allsky.html#keogramfontcolor) for more details on this setting.

        #### Enhancements / Changes

        - The `allsky-config get_brightness_info` command now displays how many images were used, and not used, in each startrails image.
          This is useful when setting the **Brightness Threshold**.

        #### Bug Fixes

        - For RPi cameras, the length of time Allsky waits before timing out an image was increased.
          For some Pi's, the prior 30-second timeout was too short when the Pi was extremely busy such as during timelapse creation.
        - Entering a **Locale** in the WebUI that is not installed on the Pi displays an error message and lists the locales that ARE installed and tells the user how to install other locales.
        - Mono cameras were calculating the mean image brightness twice: once prior to the initial save of the image and a second time when determining if the image was too dark or too bright.
          The second time used a different formula than the first time.

        #### New Settings

        - **None**

    ### v2024.12.06_04

    ??? "v2024.12.06_04 - Point Release # 4"

        #### Enhancements / Changes

        - When upgrading from a recent version from Allsky you'll likely just need to restart Allsky without having to review the settings.
          The installation script will tell you what to do.
        - In addition to the WebUI telling you when a new Allsky version is available, an optional note about the new version will be displayed, such as
          "Contains an important security update; please install".
        - The Allsky "Status:" on the top of the WebUI now updates automatically every few seconds.
        - The **System** WebUI page now appears very quickly and some of the data is automatically updated every few seconds.  
          Usage of `~/allsky/tmp` is now displayed.  
          The "Refresh" button is no longer needed so was removed.
        - The **Editor** WebUI page will display a message in the unlikely event that the file is corrupted.
        - RPi cameras sometimes hang while taking pictures. This used to hang Allsky, but it now times out instead.
        - When RPi cameras are unable to take an image, an error message from the camera is added to the log file.
          Previously the error message was written to a temporary file that was overwritten every exposure, thereby losing prior messages.
        - A message is added to the WebUI if creation of a timelapse, startrails, or keogram fails during end-of-night processing.
        - If the **Keograms Font Color** begins with a **0** and does not have 6 characters after it (e.g. `#fff`),
          an error message is displayed in the WebUI.
          Those values didn't produce the color expected (e.g. `#fff` produced blue labels, not white).
        - The name of the Pi is shown at the top of the WebUI. This is useful for people with multiple Pi's.

        #### Bug Fixes

        - The **Getting Support** WebUI page (and the related `support.sh` command) no longer fail with an "Argument list too long" message.  
          They also provide more information to aid in troubleshooting.
        - Setting a target temperature for cooled ZWO cameras now works.
        - `install.sh` no longer corrupts the Website configuration file when adding meteor fields.
        - `remoteWebsiteInstall.sh` now handles servers that don't return anything under certain circumstances.
        - Permission denied errors from `moduleutil.php` when it tried to overwrite files ending in `-last` have been fixed.
        - The Allsky Website now correctly colors aurora forecasts.
        - `upload.sh` no longer finds files that don't exist.
        - During installation, the amount of RAM for non-Raspberry Pi boards is now determined correctly.
          This is used to size swap space and populate the **Computer** setting.

        #### Deleted Settings

        - **Notification Images**  
          Notification images (e.g. "Allsky is starting up") provide valuable status and troubleshooting information so can no longer be disabled.

        #### New Settings

        - **None**

    ### v2024.12.06_03

    ??? "v2024.12.06_03 - Point Release # 3"

        #### Enhancements / Changes

        - RPi cameras that report sensor temperature now support **dark frames**.  
          The TEMPERATURE_C and TEMPERATURE_F variables can be displayed in overlays for these cameras.

          ??? "Supported RPi cameras"

              - RPi cameras that report sensor temperature and support dark frames:
                  - HQ
                  - Module 3
                  - Arducam 16 MP
              - These cameras do not support darks:
                  - Version 1
                  - imx290 60.00 fps
                  - Arducam 64 MP
                  - Arducam 462
                  - Waveshare imx219-d160
                  - Arducam 64 MB Owlsight
                  - OneInchEye IMX283

        - Dark frames are now saved as `.png` files for better quality.

          > If you have any `.jpg` darks in `~/allsky/darks` we suggest re-doing your darks then removing the old `.jpg` darks.

        #### Bug Fixes

        - MOON variables work in the **Overlay Editor** (`de421.bsp` downloads correctly).
        - All the "Click here to ..." messages in the WebUI now work.
        - Using `analyticsTracking.js` in an Allsky Website now works.
        - An issue with adding images in overlays was fixed.
        - The `remoteWebsiteInstall.sh` command now works if the **Image Directory** setting is empty.
        - Duplicate System Messages now have the correct count of the number of times the problem occurred.

        #### Deleted Settings

        - **Camera** and **Computer**  
          These values are automatically set during installation so no longer need to be prompted for.

        #### New Settings

        - ==Equipment Info==  
          Optional setting to add information about your equipment (e.g. NoIR camera).
          This appears on any Allsky Website you have.

    ### v2024.12.06_02

    ??? "v2024.12.06_02 - Point Release # 2"

        #### Enhancements / Changes

        - The WebUI will now notify you when a new Allsky version is available.
        - `remoteWebsiteInstall.sh` does a better job explaining failures and fixes.
        - Additions to the `allsky-config` command:
            - If you see a **Multiple consecutive bad images** message, run `allsky-config bad_images_info` to get suggestions.
            - If a Website has trouble reading `data.json`, run `allsky-config check_post_data`.
            - `allsky-config move_images` is more robust and can move images back to `~/allsky/images`.

        - If a Website is stuck on "Loading ..." because it can't find the current image, you’ll get a message telling you how to fix it.
        - Several Website files are now in subdirectories (e.g. `css`). No user action needed.
        - You can now have custom notification images:
          create `~/allsky/config/myFiles/notificationImages` and place files matching the names in `~/allsky/notificationImages`.

        #### Bug Fixes

        - The problem with `de421.bsp` is fixed.
        - Timelapse thumbnails now have the correct name.
        - A security issue was fixed.
        - Installing/upgrading is less likely to hang when there's a problem with an RPi camera.
        - Fixed a typo in the **ssl:check-hostname** command in `testUpload.sh`.
        - `removeBadImages.sh` now works with mean values that have a comma in them.

        #### New Settings

        - **None**

        #### Deleted Settings

        - **None**

    ### v2024.12.06_01

    ??? "v2024.12.06_01 - Point Release # 1"

        #### Enhancements / Changes

        - You can no longer enter **Issues** in GitHub (you can still enter **Discussions**).
          Instead, use the **Getting Support** page in the WebUI to collect info needed to troubleshoot.
          No private information is sent; it is kept in `~/allsky/env.json` and should never be uploaded.

        - The WebUI **Editor** page now:
            - Warns you about formatting errors (e.g. missing comma) and prevents saving until fixed.
            - Highlights placeholders like `XX_NEED_TO_UPDATE_XX`.

        - The WebUI now displays the status of Allsky (Running, Stopped, etc.).
        - You can specify a location to store images outside `~/allsky/images` (e.g. SSD) via `allsky-config move_images`.
        - `allsky-config get_brightness_info` helps tune the **Brightness Threshold**. See [Startrails settings](/documentation/explanations/startrails.html#brightnessthreshold).
        - `allsky-config compare_paths` helps map upload locations to URLs. See [Mapping Server Locations to URLs](/documentation/explanations/serverLocationToURL.html).
        - `allsky-config` can also adjust `~/allsky/tmp` size and swap; run `allsky-config` for options.
        - New `meteors` directory exists in Websites (upload support added in a future release).
        - `remoteWebsiteInstall.sh` now prompts to upload startrails/keograms/timelapse and is more robust.
        - Websites now show a detailed message when they can't find the image.

        #### New Settings

        - **None**

        #### Deleted Settings

        - Remote naming overrides were removed:
          **Remote Video File Name**, **Remote Keogram File Name**, **Remote Startrails File Name**
          were deleted from the **Remote Website** section.

        #### Bug Fixes

        - Website icon sorting by date now works.
        - `remoteWebsiteInstall.sh` no longer fails if you have commands in the **FTP Commands** setting.
        - Image resize setting changes are now saved.
        - `allsky.sh --help` now works and displays capture options.
        - Many others including with modules and overlays.

    ### v2024.12.06 - Base Release

    ??? "v2024.12.06 - Base Release"

        #### Changes that may require action (upgrades only)

        !!! warning
            The changes in this section may require settings changes;
            after upgrading, check that your settings and images look right.

        - The `config.sh` and `ftp-settings.sh` files are gone — their settings are now in the WebUI.  
          **Possible action:** The upgrade should migrate your prior settings unless you have a very old version.

        - The **CROP** settings have been simplified to pixels from top/right/bottom/left.  
          **Possible action:** If you used crop, the upgrade will tell you to re-enter values.

        - **Remove Bad Images Thresholds** are now 0.0–1.0 (instead of 0–100).  
          **Possible action:** Upgrade should convert values, but verify.

        - Mean brightness is now used to determine too bright/too dark (matches auto-exposure).  
          **Possible action:** You may need to adjust **Remove Bad Images Thresholds**.

        - (ZWO only) Mean brightness is now 0.0–1.0 (was 0–255).  
          **Possible action:** If **MEAN** is on your overlay, adjust formatting.

        - WebUI now hides settings within sections unless that section has an error.
          Click the chevron-down icon to expand.  
          **Possible action:** Expect an adjustment period.

        - `check_allsky.sh` is now `checkAllsky.sh`.  
          **Possible action:** None.

        #### Enhancements / Changes

        - Local Website setup is now trivial: enable **Use Local Website** and optionally set **Days To Keep on Pi Website**.
        - Remote Website setup is easier: only specify the top-level **Image Directory**.
        - Remote install is easier using `remoteWebsiteInstall.sh` (uploads files and removes old ones).
        - Images/videos/keograms/startrails can be written to a remote server in addition to (or instead of) a remote Website.
        - New `allsky-config` command (similar to `raspi-config`); run it to see options.
        - `allsky-config samba` helps mount `~/allsky` on a PC/Mac. See [Copy files to / from a Pi](/documentation/explanations/SAMBA.html).
        - `testUpload.sh` uploads a test file and attempts to explain failures and fixes.
        - Allsky only restarts when needed; tooltips indicate what will happen after changing settings.
        - **Overlay Method** `module` is now default for new installs; `legacy` will be removed in the next major release.
        - Multiple ZWO cameras (and on Pi 5 multiple RPi cameras) are supported; install shows all attached cameras.
        - If you swap cameras without telling Allsky, it won’t start and will tell you what to do.
        - Unsupported cameras trigger a message on how to proceed / request support.
        - All ZWO cameras as of September 7, 2024 are supported (library version 1.36).
        - Support for new third-party RPi cameras added.

          > Run `allsky-config show_supported_cameras` to see supported cameras.  
          > ZWO list is large; check with:  
          > `allsky-config show_supported_cameras --zwo | grep -i "CAMERA_NAME"`  
          > RPi list:  
          > `allsky-config show_supported_cameras --rpi`

        - **LAN Dashboard** and **WLAN Dashboard** now display all network adapters.
        - `endOfNight_additionalSteps.sh` is no longer supported (use the night-to-day module flow).
        - Too-bright dark frames are deleted during capture (e.g. lens not covered).
        - DHCP can be configured via the **Configure DHCP** page (advanced option).

        - Overlay changes:
            - Overlay module debugging output is easier to read.
            - Separate daytime and nighttime overlays are supported via the new **Overlay Manager** in the **Overlay Editor**.
            - **Overlay Editor** warns if fields are outside the image and can fix them.
              See [Ensure overlay fields stay within bounds](https://github.com/AllskyTeam/allsky/issues/3317).
            - **Overlay Editor** won’t start if images aren’t being captured (prevents using notification image as background).

        - See [Modules Documentation](/documentation/modules/modules.html) for details on Extra Module changes.

        - New Modules:
            - **Allsky AI** — Detects cloud cover using AI
            - **Allsky Fans** — Controls a fan based on CPU temperature
            - **Allsky Border** — Expands an image to include additional borders
            - **Allsky HDD Temp** — Retrieves hard drive temperatures using SMART
            - **Allsky ina3221** — Current and voltage measurements
            - **Allsky influxdb** — Writes data to influxdb
            - **Allsky light** — Determines light levels using a TSL2591
            - **Allsky LightGraph** — Displays a graph of day and night
            - **Allsky ltr390** — Measures UV levels
            - **Allsky mlx90640** — Captures an IR image of the sky (experimental)
            - **Allsky Publish Data** — Publish to Redis, MQTT, or REST
            - **Allsky Temp** — Reads up to three temperature sensors and controls a GPIO pin

        #### New Settings

        - ==Images Sort Order== — sort order for the **Images** page
        - ==Show Updated Message== — hides the “Daytime images updated every...” message on **Live View**
        - ==Nighttime Capture== and **Nighttime Save** — nighttime equivalents of daytime settings
        - ==ZWO Exposure Type== — how images should be taken (see docs)

        #### Deleted Settings

        - Image **Width** and **Height** removed (use crop/resize)
        - **Version 0.8 Exposure** removed (now part of **ZWO Exposure Type**)
        - **New Exposure Algorithm** removed (always used now)
        - `REMOVE_BAD_IMAGES` removed; set **Remove Bad Images Thresholds** to **0** to disable brightness checks
        - **Brightness** settings removed; use **Target Mean**
        - (ZWO only) **Offset** removed

        #### Bug Fixes

        - `ASI_ERROR_TIMEOUT` messages are mostly gone. **Yea!!!**
        - ROI editor now uses the correct image name based on settings.
          See [Ensure the ROI editor uses the correct image](https://github.com/AllskyTeam/allsky/pull/3337).
        - Date formats in the overlay editor now work correctly

        #### Maintenance

        - Setting names are now lowercase and boolean settings use `true`/`false` rather than `1`/`0`.
          No user impact expected.

    ---


## v2023.05.01

??? "v2023.05.01"

    ### v2023.05.01_04

    ??? "v2023.05.01_04 - Point Release # 4"

        #### Enhancements

        - Added support for **Bookworm**, the Pi Operating System released in October 2023.

          > Support for the Buster Operating System will be removed after the next major Allsky release.

        - Added support for the **Pi 5**.
        - Increased suggested amount of swap by **1 GB** to help minimize timelapse creation problems.
        - New camera support:
            - Arducam IMX462 camera (inexpensive 1920×1080 camera)
            - All ZWO cameras as of October 19, 2023 (ZWO SDK 1.32)
        - The concept of **Advanced Options** no longer exists — **all settings are always shown**.

        #### Bug Fixes

        - Uploads of mini-timelapse could fail if an image upload frequency was used.
        - Multiple concurrent timelapse creations now work.
        - Fixed reversed width/height for RPi Version 1 and IMX290 cameras.
        - GCS uploads now correctly use `image.jpg` instead of `image-YYYYMMDDHHMMSS.jpg`.
        - GCS uploads now error correctly if `gsutil` is missing.
        - **Camera Model** is no longer shown since it cannot be manually changed.
          To change cameras, select **Refresh** in the **Camera Model** field.
        - `~/allsky/scripts` is now added to `PATH` (reboot may be required).
        - Documentation clarified setting `IMAGE_DIR=${ALLSKY_WEBSITE}` for local-only Websites.
        - **Images** page now only shows icons when at least one file exists.
        - Mean brightness is now calculated correctly for ZWO cameras in RAW16 mode.

    ---

    ### v2023.05.01_03

    ??? "v2023.05.01_03 - Point Release # 3"

        #### Enhancements

        - Added support for RPi Version 1 (ov5647) camera.
        - Added FAQ explaining how to copy files to and from the Pi.

        #### Bug Fixes

        - `AUTO_STRETCH` now works.
        - Improved latitude/longitude handling and fixed bugs.
        - Allsky Map no longer updates when “Show on map” is disabled.
        - Nighttime delays on ZWO cameras now work.
        - Fixed missing-file error when installing a remote Website.
        - Corrected default WebUI values for RPi cameras.
        - **Overlay Editor fixes:**
            - Moon altitude corrected.
            - Text no longer shifts when content changes.
            - Snap rectangle alignment fixed.
            - Editor works correctly when grid is disabled.
            - Text alignment improved.
            - Missing error for fields outside image dimensions added.
            - Default stroke color fixed.
            - X position no longer resets to 0.
            - Sensor temperature variables hidden for unsupported cameras.
            - Font ZIP handling fixed on macOS.
            - Extra directory processing restricted to `.txt` and `.json`.
            - Removed bottom margin.
            - Visual warnings for out-of-bounds fields added.
            - Fixed incorrect planet positions.

    ---

    ### v2023.05.01_02

    ??? "v2023.05.01_02 - Point Release # 2"

        #### Enhancements

        - **Mean Threshold** now has separate daytime and nighttime settings.
        - Installer resumes from last step if interrupted.
        - Installer skips unnecessary steps and may skip reboot when possible.
        - *(RPi Bullseye only)* Sensor temperature display support:
            - Add  
              `--metadata /home/pi/allsky/config/overlay/extra/libcamera.json`
              to **Extra Arguments**
            - Add `AS_SensorTemperature` via the **Overlay Editor → Variable Manager**
            - Save and enable the field

        #### Bug Fixes

        - Day/night **Mean Target** values now apply correctly.
        - Keograms, startrails, and timelapse generation at end-of-night fixed.

    ---

    ### v2023.05.01_01

    ??? "v2023.05.01_01 - Point Release # 1"

        #### Enhancements

        - Multiple consecutive bad images now trigger a visible warning image and system message.
        - **Editor** page buttons are fixed to the top with a quick “Top” button.
        - Camera refresh allows swapping cameras of the same type.
        - Installation speed significantly improved using prebuilt binaries.
        - Camera changes reuse shared settings where appropriate.
        - Hostname prompt only appears if hostname is still default.
        - Startup now verifies camera-specific settings linkage.
        - **ZWO only:**
            - New **ZWO Experimental Exposure** setting for nighttime auto-exposure.
            - **Target Mean** now configurable for day and night.
            - **Mean Threshold** now configurable.
        - All Wi-Fi interfaces are displayed.
        - WebUI now validates numeric fields.

        #### Bug Fixes

        - Improved bad-image detection defaults (do not disable; tune thresholds instead).
        - `s3` uploads now use `image.jpg`.
        - `scp` uploads now respect `REMOTE_USER`.
        - Overlay bounds indicators added when fields move out of bounds.
        - Compilation fixed on i386 platforms.

    ---

    ### v2023.05.01

    ??? "v2023.05.01 - Base Release"

        #### Core Allsky

        - New camera support:
            - All ZWO cameras as of May 1, 2023
            - RPi HQ and Module 3
            - ArduCam 16 & 64 MP
            - Global Shutter Camera not supported
        - Mini-timelapse videos supported.
        - Installation improvements:
            - Swap size checks
            - Memory-resident `/allsky/tmp`
            - Migration from `~/allsky-OLD`
        - Added `check_allsky.sh` sanity-check script.
        - Latitude/Longitude accept decimal or N/S/E/W formats.
        - Removed obsolete `config.sh` settings.
        - Added SCP and GCS upload support.
        - Documentation consolidated and expanded.
        - AUTO_STRETCH fully functional.
        - Optional original filename uploads supported.

        #### WebUI

        - WebUI is now mandatory for configuration.
        - New links:
            - **Overlay Editor**
            - **Module Manager**
            - **Allsky Documentation**
        - Validation and defaults corrected.
        - Extensive new settings added (camera type, exposure, overlays, login, focus metrics, etc.).
        - Debug levels standardized.
        - System messages now surface required actions.

        #### Allsky Website

        - Website installed to `~/allsky/html/allsky`.
        - Full customization of layout, icons, and appearance.
        - Thumbnail creation now handled on the Pi.
        - Configuration unified into `configuration.json`.
        - Editor enforces configuration validity for local and remote Websites.

    ---


## v2022.03.01

??? "v2022.03.01"

    - Switched to date-based release names.
    - Added ability to have your allsky camera added to the Allsky Map by configuring:
        - [Allsky Map](http://www.thomasjacquin.com/allsky-map){ external }
        - [Map settings](https://github.com/AllskyTeam/allsky/wiki/allsky-Settings/_edit#map-settings){ external }
      Added an **Allsky Map Setup** section to the WebUI to configure the map settings.
      The **Lens** field now shows in the popout on the Allsky Website (if installed).
    - Significantly enhanced Wiki — more pages and more information, including known issues and fixes/workarounds.
    - Added an option to keograms to make them full width, even if few images were used.
      In `config.sh`, set `KEOGRAM_EXTRA_PARAMETERS="--image-expand"`.
    - Added/changed/deleted settings (in `config.sh` unless otherwise noted):
        - Added `WEBUI_DATA_FILES` — one or more files whose contents are shown on the WebUI **System** page.
          See [this Wiki page](https://github.com/AllskyTeam/allsky/wiki/WEBUI_DATA_FILES){ external }.
        - Renamed `NIGHTS_TO_KEEP` to `DAYS_TO_KEEP` since it keeps **days**, not just nights.
          If blank (`""`), **all** days are kept.
        - Deleted `AUTO_DELETE` — replaced by `DAYS_TO_KEEP`.
          `DAYS_TO_KEEP=""` is similar to the old `AUTO_DELETE=false`.
        - Added `WEB_DAYS_TO_KEEP` — how many days of Allsky Website images/videos to keep when hosted on the Pi.
        - Added `WEB_IMAGE_DIR` in `ftp-settings.sh` — allows copying images to a local Pi location (often the Website)
          as well as to a remote machine (timelapse/startrails/keogram already supported this).
    - The RPi camera now supports the same text overlay features as ZWO, including the **Extra Text** file.
    - Removed the harmless “deprecated pixel format used” message from the timelapse log (it confused people).
    - Improved auto-exposure for RPi cameras.
    - Refactored ZWO and RPi camera code to simplify maintenance and future features.
    - Upload reliability improvements:
        - If Allsky is stopped/restarted during an upload, the upload continues (fewer temp files left behind).
        - Additional cases where temp files were left on remote servers were reduced.
        - Uploads now do extra error checking to aid debugging.
        - Only one upload runs at a time; additional uploads log a message and exit.
    - Added `--debug` option to `allsky/scripts/upload.sh` to aid upload debugging.
    - Upload log files are now only created on error (reduces SD card writes).
    - `removeBadImages.sh` also only creates a log file on error (saves a write per image).
    - Allsky now stops with an error message on unrecoverable errors (e.g., no camera found), instead of restarting forever.
    - More meaningful on-image messages:
        - Replaced generic “ERROR. See /var/log/allsky.log” with more specific messages
          (e.g., “*** ERROR *** Allsky Stopped! ZWO camera not found!”).
        - On restart, shows “Allsky software is restarting” instead of “stopping” then “starting”.
    - Timelapse debug output no longer prints a line for each of thousands of images, making real errors easier to spot.
    - WebUI improvements:
        - **Camera Settings** page now shows min/max/default values in a popup for numerical fields.
    - Startrails and Keogram creation no longer crash if invalid files are found.
    - Removed `allsky/scripts/filename.sh`.
    - RPi WebUI setting **Gamma** renamed to **Saturation** (Gamma name was incorrect).

    - Known issues:
        - Startrails and keogram programs don’t work well if you bin differently during day vs night.
          If you don’t save daytime images this won’t be a problem.
        - Min/max/default values shown in the WebUI **Camera Settings** page (especially RPi) aren’t always correct,
          particularly on Bullseye where many settings changed.


### 0.8 Base Release

??? "0.8 Base Release"

    - Workaround for ZWO daytime auto-exposure bug.
    - Improved exposure transitions between day and night to avoid large brightness jumps.
    - Decrease in ZWO sensor temperature.
    - Many new settings, including splitting some settings into day and night versions.
    - Added error checking and log messages in many areas to aid debugging.
    - Support for **notification images**, such as “Allsky is starting up” and “Taking dark frames”.
    - Ability to resize uploaded images.
    - Ability to set thumbnail size.
    - Ability to delete bad images (corrupt, too light, or too dark).
    - Ability to set an image file name prefix.
    - Ability to reset the USB bus if a ZWO camera isn’t found (requires the `uhubctl` command).
    - Ability to specify the format of the time displayed on images.
    - Ability to display temperature in Celsius, Fahrenheit, or both.
    - Ability to set the bitrate on timelapse videos.

---

## 0.7

??? "0.7"

    - Added Raspberry Pi HQ camera support based on Rob Musquetier’s fork.
    - Added support for x86 architecture (Ubuntu, etc.).
    - Temperature-dependent dark frame library.
    - Added browser-based script editor.
    - Added configuration variables to crop black areas around images.
    - Added timelapse frame-rate setting.
    - Changed default font size.

---

## 0.6

??? "0.6"

    - Added daytime exposure and auto-exposure capability.
    - Added `-maxexposure`, `-autoexposure`, `-maxgain`, and `-autogain` options.  
      Using auto-exposure and auto-gain together may produce unexpected results (black frames).
    - Autostart is now based on **systemd** and works on all Raspbian-based systems, including headless setups.
      Remote control will not start multiple instances.
    - Replaced the `nodisplay` option with the `preview` argument.
      No preview is shown in autostart mode.
    - When using the WebUI, camera options can be saved without rebooting the Pi.
    - Added a publicly accessible preview to the WebUI: `public.php`.
    - Changed exposure units to milliseconds instead of microseconds.

---

## 0.5

??? "0.5"

    - Added **Startrails** (image stacking) with brightness control.
    - Keogram and Startrails generation is now much faster thanks to a rewrite by Jarno Paananen.

---

## 0.4

??? "0.4"

    - Added **Keograms** (a summary of the night in a single image).

---

## 0.3

??? "0.3"

    - Added dark frame subtraction.

---

## 0.2

??? "0.2"

    - Separated camera settings from code logic.

---

## 0.1

??? "0.1"

    - Initial release.

