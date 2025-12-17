# Release Notes

This page lists the major changes to all Allsky releases.
You can also see the [Known Issues and Limitations](knownIssues.md) of the current release.

---

## v2025.xx.xx

??? info "v2025.xx.xx - Base Release"

    ### Changes that may require action (upgrades only)

    !!! warning
        The changes in this section may require settings changes; after upgrading, check that your settings and images look right.

    - The Buster operating system is no longer supported.
    - The "legacy" overlay method and the **Image Overlay Settings** section of the WebUI no longer exist. All overlays are now done via the **Overlay Editor** in the WebUI.
    - If your camera is very noisy it may create dark frames that are brighter than the new **Dark Frame Upper Threshold** value, which is `0.05`. This threshold was `0.10` in the prior release.
    - The AS_TEMPERATURE_C and AS_TEMPERATURE_F values (sensor temperature) now has 1 digit after the decimal point. This may require you to change the format of those variables in the Overlay Editor.

    ### Enhancements / Changes

    - **WebUI changes:**
        - Several menu items are now grouped together; putting your cursor over them or clicking on them shows a list of choices. For example, the **Settings** group contains **Allsky Settings** and **Editor**.
        - **Improved Login System**
            - The old login system has been removed and a new version implemented
            - Existing login details are not affected
            - Only used if WEBUI login is enabled
            - Provides stronger passwords if the Pi will be exposed to the internet
        - **New Database**
            - The database stores information on every image taken, such as exposure time, whether or not it's a daytime or nighttime image, and much more
            - Several Allsky modules add data such as number of stars or meteors detected
            - Easier to limit startrails to nighttime images only, or to display all images with meteors
            - Choice of inbuilt database, zero configuration or for more advanced users you can configure the database in more detail
        - **Images page:**
            - Now only shows the image icon if there is at least one image for the day otherwise "none" is displayed
            - The timelapse and mini-timelapse icons changed to video icons
            - If there are no images, startrails, keogram, or timelapse for a given day, that day is no longer included in the list
            - Directories in the `images` directory that start with `test` are now displayed along with the days
            - The icons indicating there are images, a timelapse, a keogram, and/or a startrails are now the same height as the "Delete" button
        - You can now view the mini-timelapse (if it exists) via the link at the top of the **Live View** page
        - **Overlay Editor page:**
            - Enhanced Variable Manager — adding variables to the overlay is now much simpler and more intuitive
            - Introduced **Blocks**: predefined groups of related fields that can be added to the overlay in a single step
            - Completely new and more flexible variable formatting system
            - Fields can now be grouped, making it easy to move or manage multiple items together
            - Added new alignment tools: Left alignment, Equal vertical spacing, Equal horizontal alignment
            - You can now draw rectangles on the overlay with customizable border and background colours
            - Removed the sun/moon/planets and satellite calculations from the overlay and moved them to the new Solar System module
            - The Font manager now auto detects fonts used in an overlay
            - **Mask Editor:**
                - Added a new **Mask Editor** to create and edit image masks directly within the WebUI
                - Can be accessed from the image manager by clicking the create mask button
                - Provides an easy set of tools for creating masks that can be used in other modules
        - **Module Manager page:**
            - **User Interface Improvements**
                - The UI now dynamically responds to field selections
                - Added a search box to quickly locate modules
                - Added a filter to narrow modules by type
                - Introduced many new field types: Secret, I²C Input, 1-Wire Input, AJAX Select, GPIO, Image, Variable, Position, URL, Host, Graph
            - Completely refactored the module system to simplify module development
            - Introduced a new module installer — cloning the module repository is no longer required
            - Modules are now automatically upgraded during Allsky upgrades
            - Added a new **Device Manager** to display all hardware devices connected to the Raspberry Pi
            - Modules have moved - Modules are now stored within the main Allsky directory system
            - **New and Updated Modules**
                - ADSB — generates aircraft data for overlay display
                - AI - This module had been deprecated by the Author. Please remove it if installed
                - Dew Heater - now supports PWM-based heater control
                - Fans — enables control of up to two fans with on/off or PWM modes
                - GPIO - Fixed this module so that it works
                - Boilerplate - Updated to show all new features
                - INA3221 - This module has been deprecated. Please use the Power module instead
                - Keogram - new module to generate a Keogram
                - LTR390 - This module has been deprecated. Please use the Light module instead
                - PMSX003 - New module to measure air quality
                - Power - New module to combine the INA219 and INA3221 sensors
                - Rain Detector - A new module to detect rain using a YOLO model
                - Solar System - New module to calculate data for Solar System objects
                - Environment - A new module to read sensors to obtain environment data
                - TPHBME680 - This module has been deprecated. Please use the Environment module instead
                - S3 Upload - A new module for the SkyVault project
            - **For Developers**
                - Modules now follow a class-based structure with a shared base class
                - Modules can now define reusable **blocks** and **charts**
                - Added helper functions for saving data to overlays and charts
                - Expanded **metaData** features
        - The new **Charts** page lets you create, view, and organize charts for camera performance, hardware metrics, and image analysis data
            - **Key Features:**
                - Use predefined charts or create fully custom charts
                - Group charts into tabs
                - Adjust the chart's date range
                - Enable automatic refresh
                - **Available Chart Types:** Line, Spline, Area, Column, Bar, Column 3D, Area 3D, Gauge, Yes/No
        - **System page**
            - Add auto refresh to the page
            - Added watchdog page to control the Allsky services
        - The new **Helper Tools** pages:
            - **Check Allsky** runs the `checkAllsky.sh` command
            - **Startrails** helps you determine what **Brightness Threshold** setting to use
            - **Image Stretch** helps you determine what **Stretch Amount** and **Stretch Mid Point** settings to use
            - **Timelapse** helps you determine what **Bitrate** and **FPS** settings to use
        - The menu on the left side of the WebUI can now be collapsed to show just icons on smaller screens

    - **Startrails:**
        - The `generateForDay.sh` command accepts a file that contains the images to process
        - The `allsky-config get_startrails_info` command now displays the **Brightness Threshold** in use

    - The camera now saves initial images to `~/allsky/tmp/current_images`
    - The `generateForDay.sh` command now accepts arguments that can be passed to the keogram, startrails, and timelapse creation programs
    - The `allsky-config bad_images_info` command can now display the list of "bad" images with the `--show_bad_images` argument
    - Updated to ZWO SDK v1.39 which adds support for several new cameras
    - Improved security for Allsky cameras connected to the internet

    ### Bug Fixes

    - Fix an issue with not all thumbnails being displayed when viewing a day that has thousands of images
    - Fix an issue with notification images not being sent to a remote server
    - Fixed an issue with updates to the Allsky Map server failing because of a missing file

    ### Deleted Settings

    - The **Image Overlay Settings** section was deleted. For ZWO cameras, the **Show Histogram Box** setting is now the **ZWO Exposure Box** module

    ### New Settings

    - **Focus Mode** - helps you focus by temporarily changing settings
    - **Dark Frame Upper Threshold** - specifies when a dark frame is "too bright"
    - **Remove Bad Images Threshold Count** - determines after how many "bad" images a System Message will be displayed

---

## v2024.12.06

??? info "v2024.12.06_06 - Point Release # 6"

    !!! important "IMPORTANT NOTES"
        - This is the LAST major release that supports Buster
        - This is the LAST major release that contains the "legacy" overlay method

    ### Enhancements / Changes

    - When 4 consecutive errors occur while capturing images with an RPi camera, the last error is now shown in the WebUI's "System Messages" section
    - The `allsky-config get_brightness_info` command now outputs the number of images used and not used in the startrails
    - Added a [Troubleshooting Tools](troubleshooting/troubleshootingTools.md) Documentation page

    ### Bug Fixes

    - Fixed an issue where downloading the support log from the **Getting Support** page would hang the page
    - Fixed a couple issues with WebUI "System Messages"
    - Fixed an issue with updates to the Allsky Map server failing because multiple double quotes were in a field
    - Fixed a rare situation where the **Module Manager** will fail to display any modules due to corruption in a module's metaData

    ### New Settings

    - None

??? info "v2024.12.06_05 - Point Release # 5"

    ### Changes that may require action (upgrades only)

    !!! warning
        The changes in this section may require settings changes; after upgrading, check that your settings and images look right.

    - If your Keogram **Font Color** contained three numbers you'll need to reverse the order of the numbers. The order is now: `red_number green_number blue_number` (red and blue switched places). See [the documentation](settings/allsky.md#keogramfontcolor) for more details.

    ### Enhancements / Changes

    - The `allsky-config get_brightness_info` command now displays how many images were used, and not used, in each startrail image

    ### Bug Fixes

    - For RPi cameras, the length of time Allsky waits before timing out an image was increased
    - Entering a **Locale** in the WebUI that is not installed displays an error message
    - Mono cameras were calculating the mean image brightness twice

    ### New Settings

    - None

??? info "v2024.12.06_04 - Point Release # 4"

    ### Enhancements / Changes

    - When upgrading from a recent version you'll likely just need to restart Allsky without having to review the settings
    - In addition to the WebUI telling you when a new Allsky version is available, an optional note about the new version will be displayed
    - The Allsky "Status:" on the top of the WebUI now updates automatically every few seconds
    - The **System** WebUI page now appears very quickly and some data is automatically updated
    - The **Editor** WebUI page will display a message if the file is corrupted
    - RPi cameras sometimes hang while taking pictures. This used to hang Allsky, but it now times out instead
    - When RPi cameras are unable to take an image, an error message from the camera is added to the log file
    - A message is added to the WebUI if creation of a timelapse, startrails, or keogram fails
    - If the **Keograms Font Color** begins with a `0` and does not have 6 characters after it, an error message is displayed
    - The name of the Pi is shown at the top of the WebUI

    ### Bug Fixes

    - The **Getting Support** WebUI page no longer fails with an "Argument list too long" message
    - Setting a target temperature for cooled ZWO cameras now works
    - `install.sh` no longer corrupts the Website configuration file when adding meteor fields
    - `remoteWebsiteInstall.sh` now handles servers that don't return anything under certain circumstances
    - Permission denied errors from `moduleutil.php` have been fixed
    - The Allsky Website now correctly colors aurora forecasts
    - `upload.sh` no longer finds files that don't exist
    - During installation, the amount of RAM for non-Raspberry Pi boards is now determined correctly

    ### Deleted Settings

    - **Notification Images** - Notification images can no longer be disabled

    ### New Settings

    - None

??? info "v2024.12.06_03 - Point Release # 3"

    ### Enhancements / Changes

    - RPi cameras that report sensor temperature now support **dark frames**. Supported cameras include: HQ, Module 3, Arducam 16 MP. Not supported: Version 1, imx290, Arducam 64 MP/462, Waveshare imx219-d160, Arducam 64 MB Owlsight, OneInchEye IMX283
    - Dark frames are now saved as `.png` files for better quality

    !!! note
        If you have any `.jpg` darks in `~/allsky/darks` we suggest re-doing your darks then removing the old `.jpg` darks.

    ### Bug Fixes

    - MOON variables work in the **Overlay Editor** (the `de421.bsp` file downloads correctly)
    - All the "Click here to ..." messages in the WebUI now work
    - Using the `analyticsTracking.js` in an Allsky Website now works
    - An issue with adding images in overlays was fixed
    - The `remoteWebsiteInstall.sh` command now works if the **Image Directory** setting is empty
    - Duplicate System Messages now have the correct count

    ### Deleted Settings

    - **Camera** and **Computer** - These values are automatically set during installation

    ### New Settings

    - **Equipment Info** - Optional setting to add additional information about your equipment

??? info "v2024.12.06_02 - Point Release # 2"

    ### Enhancements / Changes

    - The WebUI will now notify you when a new Allsky version is available
    - The `remoteWebsiteInstall.sh` command does a better job telling you why problems occur
    - Additions to the `allsky-config` command:
        - `allsky-config bad_images_info` - suggests how to fix bad images
        - `allsky-config check_post_data` - determines why data.json reading failed
        - `allsky-config move_images` - more robust image moving
    - When an Allsky Website is stuck on "Loading..." you'll get a message telling you how to fix it
    - Several Allsky Website files are now in subdirectories
    - You can now have custom "notification images"

    ### Bug Fixes

    - The problem with `de421.bsp` is fixed
    - Timelapse thumbnails now have the correct name
    - A security issue was fixed
    - Installing or upgrading Allsky is less likely to hang when there's a problem with an RPi camera
    - Fixed a typo in the `ssl:check-hostname` command
    - `removeBadImages.sh` now works with mean values that have a comma

    ### New Settings

    - None

    ### Deleted Settings

    - None

??? info "v2024.12.06_01 - Point Release # 1"

    ### Enhancements / Changes

    - You can no longer enter **Issues** in GitHub. Instead, use the new **Getting Support** page in the WebUI
    - The WebUI's **Editor** page now tells you if there is a formatting error and highlights placeholder values
    - The WebUI now displays the status of Allsky (Running, Stopped, etc.)
    - You can now easily specify a location to store images other than `~/allsky/images`
    - New `allsky-config get_brightness_info` command helps with startrails settings
    - New `allsky-config compare_paths` command helps determine where to upload files
    - The `allsky-config` command can do more
    - The new `meteors` directory in Allsky Websites is for uploading images with meteors
    - The `remoteWebsiteInstall.sh` command now prompts to upload local files
    - Allsky Websites now give detailed messages when they can't find the image

    ### New Settings

    - None

    ### Deleted Settings

    - To simplify configuration, changing the names of timelapse, keogram, and startrails files uploaded to a remote Website is no longer allowed. Hence, **Remote Video File Name**, **Remote Keogram File Name**, and **Remote Startrails File Name** settings were deleted.

    ### Bug Fixes

    - Allsky Website icon sorting by date now works
    - `remoteWebsiteInstall.sh` no longer fails if you have commands in **FTP Commands**
    - Changes to the image resize settings are now saved
    - `allsky.sh --help` now works
    - Many others including with modules and overlays

??? info "v2024.12.06 - Base Release"

    ### Changes that may require action (upgrades only)

    !!! warning
        The changes in this section may require settings changes; after upgrading, check that your settings and images look right.

    - The `config.sh` and `ftp-settings.sh` files are gone - their settings are now in the WebUI
    - The **CROP** settings have been simplified
    - The **Remove Bad Images Thresholds** settings are now between 0.0 and 1.0 instead of 0-100
    - Allsky now uses the mean brightness of an image to determine if it is too bright or too dark
    - (ZWO only) The mean brightness is now between 0.0 and 1.0; it used to be 0-255
    - The WebUI now hides the settings in each section unless there's an error
    - `check_allsky.sh` is now called `checkAllsky.sh`

    ### Enhancements / Changes

    - Setting up an Allsky Website on the Pi is now trivial
    - Setting up a Website on a remote server is easier
    - Installing a Website on a remote server is significantly easier with the new `remoteWebsiteInstall.sh` command
    - Images, timelapse, keograms, and startrails can now be written to a remote server
    - The new `allsky-config` command is similar to `raspi-config` but for Allsky
    - Running `allsky-config samba` allows you to mount the `~/allsky` directory on a PC or MAC
    - The new `testUpload.sh` command tries to upload a test file and tells you why it failed if it does
    - When changing settings, Allsky only restarts if it needs to
    - The **module** **Overlay Method** is now the default
    - You can now have more than one ZWO camera connected, and on Pi 5, more than one RPi camera
    - If you change cameras without notifying Allsky, you'll receive a message
    - If you try using an unsupported camera you'll receive a message
    - All ZWO cameras as of September 7, 2024 are supported (library version 1.36)
    - Support for some new third-party RPi cameras was added
    - The **LAN Dashboard** and **WLAN Dashboard** pages now display all network adapters
    - The `endOfNight_additionalSteps.sh` file is no longer supported
    - When taking dark frames, images that are too bright are deleted
    - DHCP on the Pi can be configured via the WebUI
    - Overlay changes:
        - Overlay debugging output is easier to read
        - You can now create different overlays for daytime and nighttime
        - The **Overlay Editor** warns if fields are outside the image area
        - The **Overlay Editor** won't start if images aren't being captured
    - See [Modules Documentation](modules/modules.md) for Extra Module changes
    - New Modules: Allsky AI, Allsky Fans, Allsky Border, Allsky HDD Temp, and more

    ### New Settings

    - **Images Sort Order** - determines the sort order on the Images page
    - **Show Updated Message** - allows hiding the update message
    - **Nighttime Capture** and **Nighttime Save** - nighttime equivalents of daytime settings
    - **ZWO Exposure Type** - specifies how images should be taken

    ### Deleted Settings

    - Image **Width** and **Height** - no longer needed
    - **Version 0.8 Exposure** - functionality incorporated into **ZWO Exposure Type**
    - **New Exposure Algorithm** - now always used
    - **REMOVE_BAD_IMAGES** - to keep people from disabling the check
    - **Brightness** settings - not needed
    - (ZWO only) **Offset** - not needed with allsky cameras

    ### Bug Fixes

    - `ASI_ERROR_TIMEOUT` messages are mostly gone
    - ROI selection code now looks in settings for correct image name
    - Date formats in overlay editor work correctly

    ### Maintenance

    - All setting names are now lowercase and boolean settings are "true" and "false"

---

## v2023.05.01

??? info "v2023.05.01_04 - Point Release # 4"

    ### Enhancements

    - Added support for Bookworm, the Pi Operating System released in October, 2023

    !!! note
        Support for the Buster Operating System will be removed after the next major Allsky release.

    - Added support for the Pi 5
    - Increased suggested amount of swap by 1 GB
    - New camera support:
        - Arducam IMX462 camera (inexpensive 1920x1080 camera)
        - All ZWO cameras as of October 19, 2023 (ZWO SDK 1.32)
    - The concept of "Advanced Options" no longer exists. ALL settings are always shown.

    ### Bug Fixes

    - Uploads of mini-timelapse could fail if an image upload frequency was used
    - Multiple concurrent timelapse creations now work
    - The width and height of the RPi Version 1 and IMX290 cameras was reversed
    - Uploading using the "GCS" protocol now uses the correct "image.jpg" name
    - Uploading using the "GCS" protocol gives an error if it can't find the `gsutil` command
    - The **Camera Model** setting is no longer displayed in the WebUI since it can't be changed manually
    - The `~/allsky/scripts` directory is now included in the PATH
    - The documentation now specifies to set `IMAGE_DIR` to `${ALLSKY_WEBSITE}` when only a local Website exists
    - The WebUI's **Images** page now only shows icons when there is at least one file of the specified type
    - The mean brightness is now calculated correctly for ZWO cameras running in RAW16 mode

??? info "v2023.05.01_03 - Point Release # 3"

    ### Enhancements

    - Added support for RPi Version 1 (ov5647) camera
    - Added FAQ question on how to copy files to and from the Pi

    ### Bug Fixes

    - `AUTO_STRETCH` now works
    - Latitude and Longitude processing was improved
    - The Allsky Map is no longer updated when "Show on map" is disabled
    - Consistent delays on ZWO cameras were not working at night
    - Installing a remote Allsky Website gave an error about a missing file
    - Some default values were incorrect for RPi cameras in the WebUI
    - Overlay Editor fixes:
        - Moon altitude not correct
        - When text of a field changes it no longer moves on screen
        - Snap rectangle alignment fixed
        - Grid disable issue fixed
        - Text alignment improved
        - Missing ERROR message for text fields outside image dimensions
        - Default stroke color now works
        - Changing field contents or font size no longer resets X to 0
        - Sensor temperature-related variables no longer shown for RPi cameras
        - Font zip files created on OSX handled correctly
        - Only txt and json files processed in extra directory
        - Removed 15px margin at bottom
        - Visual warning if text field will appear outside image
        - Fixed incorrect position of planets

??? info "v2023.05.01_02 - Point Release # 2"

    ### Enhancements

    - The **Mean Threshold** setting now has separate daytime and nighttime settings
    - The installation keeps track of where it is so if you exit, it resumes where it left off
    - The installation skips steps that aren't needed
    - (RPi on Bullseye only) You can display the sensor temperature

    ### Bug Fixes

    - Setting the **Mean Target** for daytime and nighttime didn't work
    - Keograms, startrails, and timelapse weren't being created at end of night

??? info "v2023.05.01_01 - Point Release # 1"

    ### Enhancements

    - If multiple consecutive "bad" images are found, a warning image is now displayed
    - In the WebUI's **Editor** page, the buttons are now at the top of the page
    - Selecting `Refresh` from the **Camera Type** drop-down can be used to change cameras
    - Greatly sped up the installation process
    - Changing to a camera that Allsky hasn't seen before will use the prior camera's settings
    - The installation only prompts for a new hostname if the current one is "raspberrypi"
    - Check at startup if the settings file is properly linked
    - ZWO only:
        - **ZWO Experimental Exposure** is a new setting
        - **Target Mean** can now be specified for daytime and nighttime
        - **Mean Threshold** can now be specified
    - If there are multiple Wi-Fi interfaces, information on each one will be displayed
    - The WebUI now validates numbers

    ### Bug Fixes

    - `REMOVE_BAD_IMAGES` would often flag dark, but "good" images as "bad"
    - The `s3` upload protocol now sets the destination file name to `image.jpg`
    - The `scp` upload protocol now uses the `REMOTE_USER` setting
    - Set upper limits on x and y spinner controls in overlay property editors
    - When adding a new variable to the overlay variable list it can now be selected without refreshing
    - When an image is moved out of bounds using spinners a red rectangle will be drawn
    - Fixed a bug when compiling on i386 platforms

??? info "v2023.05.01 - Base Release"

    ### Core Allsky

    - New camera support:
        - All ZWO cameras as of May 1, 2023
        - RPi HQ and Module 3 cameras
        - ArduCam 16 and 64 MP cameras
        - The RPi "Global Shutter Camera" is NOT supported
    - "Mini" timelapse videos can be created
    - Installation improvements:
        - Prompts to add more swap space
        - Prompts to make `allsky/tmp` memory-resident filesystem
        - If `~/allsky-OLD` directory is found, you are prompted to move its contents
    - `scripts/check_allsky.sh` was added to perform basic sanity checking
    - **latitude** and **longitude** can now be specified as decimal or with N, S, E, W
    - Removed several settings from `config.sh`
    - New ftp-settings.sh variables: `REMOTE_PORT`, `SSH_KEY_FILE`
    - Secure CP (`scp`) and Google Cloud Service (`gcs`) protocols are now supported
    - The Wiki now points to files in the GitHub `documentation` directory
    - The Allsky Documentation has been significantly enhanced and expanded
    - `AUTO_STRETCH` now works
    - Images can now be uploaded using the full `image-YYYYMMDDHHMMSS.jpg` name
    - Many minor enhancements and bug fixes

    ### WebUI

    - The WebUI is now installed as part of the Allsky installation and must be used to make all settings changes

    !!! note
        The [allsky-portal](https://github.com/thomasjacquin/allsky-portal) repository will be removed as it is no longer needed.

    - New links on the left side of the WebUI:
        - **Overlay Editor** - drag and drop text and images you want overlayed
        - **Module Manager** - specify what actions take place after an image is saved
        - **Allsky Documentation** - accesses the documentation on your Pi
    - Minimum, maximum, and default values are now correct for all camera models
    - Required fields with missing data are shown in red
    - New settings on the **Allsky Settings** page:
        - **Camera Type** - replaces the `CAMERA` variable
        - **Max Auto-Exposure** for day and night
        - **Max Auto-Gain** for day and night
        - **Auto White Balance**, **Red Balance**, and **Blue Balance** for day and night
        - **Frames to Skip** for day and night
        - **Consistent Delays**
        - **Overlay Method**
        - **Require WebUI Login**
        - **Cooling** and **Target Temp.** for day and night (ZWO only)
        - **Aggression** (ZWO only)
        - **Gamma** (ZWO only)
        - **Offset** (ZWO only)
        - **Contrast** and **Sharpness** (RPi only)
        - **Extra Parameters** (RPi only)
        - **Mean Target** for day and night (RPi only)
        - **Mean Threshold** (RPi only)
        - **Focus Metric** (ZWO)
    - Several settings moved from `config.sh` to the WebUI as advanced options
    - **Debug Level** is more consistent (0-4)
    - System messages appear at the top of the WebUI
    - Many minor enhancements

    ### Allsky Website

    - The Allsky Website is now installed in `~/allsky/html/allsky`
    - If an older version is found during installation you'll be prompted to move its images and settings
    - The home page can be customized:
        - Specify order, contents, look, and style of the icons on the left side
        - Specify order, contents, and style of the popout on the right side
        - Set a background image
        - Change the maximum width of the image
        - Add a link to a personal website
        - Add a border around the image
        - Hide the "Make Your Own" link
        - Change the browser tab icon
    - Left sidebar:
        - The constellation overlay icon is hidden by default
        - If creating mini-timelapse videos, an icon for the current video will appear
        - New icon to display the image full-size
        - The startrails and information icons were updated
    - Popout on right side:
        - A link to your **Image Settings** can optionally be displayed
        - The version of Allsky and the Allsky Website are displayed
    - Timelapse video thumbnails are now created by default on the Pi
    - Configuration file changes:
        - The two prior configuration files are replaced by `configuration.json`
        - Several new settings including overlay opacity
        - `overlaySize` was split into `overlayWidth` and `overlayHeight`
        - The WebUI **Editor** page must be used to edit the configuration file
        - The **Editor** page should also be used for remote Website configuration files

---

## v2022.03.01

??? info "v2022.03.01"

    - Switched to date-based release names
    - Added ability to have your allsky camera added to the [Allsky Map](http://www.thomasjacquin.com/allsky-map)
    - Significantly enhanced Wiki
    - Added option to keograms to make them full width
    - Added/changed/deleted settings:
        - Added `WEBUI_DATA_FILES` - contains file names with information for the WebUI's System page
        - Renamed `NIGHTS_TO_KEEP` to `DAYS_TO_KEEP`
        - Deleted `AUTO_DELETE` - functionality now in `DAYS_TO_KEEP`
        - Added `WEB_DAYS_TO_KEEP` - specifies how many days of Website images to keep
        - Added `WEB_IMAGE_DIR` - allows images to be copied to the Pi and a remote machine
    - The RPi camera now supports all text overlay features as the ZWO camera
    - Removed harmless "deprecated pixel format used" message from timelapse log
    - Improved auto-exposure for RPi cameras
    - Made numerous code changes for easier maintenance
    - If Allsky is stopped during file upload, the upload continues
    - Decreased cases where temporary files would be left on remote servers
    - Only one upload can be done at a time
    - Added `--debug` option to `allsky/scripts/upload.sh`
    - Upload log files only created if there was an error
    - `removeBadImages.sh` only creates a log file if there was an error
    - Allsky now stops with an error message on unrecoverable errors
    - More meaningful messages are displayed as images
    - If Allsky is restarted, a new "restarting" message is displayed
    - Timelapse debug output no longer includes one line for each of thousands of images
    - The **Camera Settings** page now displays min/max/default values in a popup
    - Startrails and Keogram creation no longer crash if invalid files are found
    - Removed the `