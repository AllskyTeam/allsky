This page lists the major changes to all Allsky releases.
			You can also see the
			Known Issues and Limitations  
			of the current release.
===========================================

## v2025.xx.xx

???
    <h3>v2025.xx.xx_01  - Point Release # 1</h3>
			<details sub open> <summary></summary>
			xxx
			</details>

			<h3>v2025.xx.xx - Base Release</h3>

#### Changes that may require action (upgrades only)
    - The changes in this section may require settings changes;
						after upgrading, check that your settings and images look right.
    - The Buster operating system is no longer supported.
    - The "legacy" overlay method and the
						Image Overlay Settings
						section of the WebUI no longer exist.
						All overlays are now done via the
						Overlay Editor in the WebUI.
    - If your camera is very noisy it may create dark frames
						that are brighter than the new
						Dark Frame Upper Threshold
						value, which is 0.05.
						This threshold was 0.10 in the prior release.
    - The AS_TEMPERATURE_C and AS_TEMPERATURE_F values (sensor temperature) now has 1 digit after the decimal point.
						This may require you to change the format of those variables in the Overlay Editor.
    <h4>Deleted capabilities</h4>
				<ul>
					<li>
				</ul>

#### Enhancements / Changes
    - New Allsky Database:
						The database stores information on every image taken,
						such as exposure time, whether or not it's a daytime or nighttime
						image, and much more.
						Several Allsky modules add data such as number of stars or
						meteors detected.
						This makes it easy to limit startrails to nighttime images only,
						or to display all images with meteors.
    - WebUI changes:
						
Several menu items are now grouped together;
								putting your cursor over them or clicking on them
								shows a list of choices.
								
								For example, the Settings
								group contains
								Allsky Settings
								and
								Editor.
							Images page:
								
Now only shows the
										
										icon if there is at least one image for the day
										otherwise "none" is displayed.
									The timelapse and mini-timelapse icons on this page
										as well as on the Allsky Website home page on the left side changed to
										
										and
										
										respectively.
									If there are no images, startrails, keogram, or timelapse
										for a given day, that day is no longer included in the list.
									Directories in the images
										directory that start with
										test are now
										displayed along with the days.
										This is useful if you want to create a "test" directory
										with various images.
										
										Note that the 
										Startrails
										and
										Image Stretch
										helper tools create directories that are visible.
									The icons indicating there are images, a timelapse,
										a keogram, and/or a startrails are now the same
										height as the "Delete" button to give them a "cleaner" look.


You can now view the mini-timelapse (if it exists) via the link at the top
								of the Live View page.
							Overlay Editor page:
								
Alex to add changes...

Module Manager page:
								
Alex to add changes...

The new Charts page
								allows you to add charts for camera, hardware, and
								analysis data.
								Try it out!
							The new Helper Tools
								pages "helps" you do something:
								
Check Allsky
									runs the checkAllsky.sh command to identify
									Allsky settings that have errors or may cause problems.
								Startrails
									helps you determine what
									Brightness Threshold
									setting to use.
									You specify multiple setting and
									the page then creates startrails images with those
									settings which you can then view to decide which
									setting you prefer.
									
									This page is a front end to
									allsky-config  compare_startrails.
								Image Stretch
									helps you determine what daytime and/or nighttime
									Stretch Amount
									and
									Stretch Mid Point
									settings to use.
									
									This page is a front end to
									allsky-config  compare_stretches.
								Timelapse
									helps you determine what
									Bitrate
									and
									FPS
									settings to use when creating timelapse videos.
									
									This page is a front end to
									allsky-config  compare_timelapse.
								
The menu on the left side of the WebUI can now be
								collapsed to show just icons on smaller screens.
    - Startrails:
						
The generateForDay.sh command
								accepts a file that contains the images to process,
								which means a subset of the files in a directory
								can be used (e.g., just the nighttime files) or
								files from multiple nights can be used.
								
								For example:
								generateForDay.sh --startrails --images file.
							The allsky-config   get_startrails_info
								command (previously called get_brightness_info)
								now displays the
								Brightness Threshold
								in use when each startrails image was created.
    - The camera now saves initial images to
						~/allsky/tmp/current_images,
						and that's where the WebUI
						Live View page looks for the image.
						
						The current mini-timelapse file is also saved there.
						NOTE: the imageName
						field in the local Allsky Website configuration file is now
						/current/image.jpg.
    - The generateForDay.sh command now accepts
						arguments that can be passed to the keogram, startrails,
						and timelapse creation programs.
						Run generateForDay.sh --help
						to see uses of the new arguments.
    - The allsky-config   bad_images_info
						command can now display the list of "bad" images when
						the --show_bad_images argument is specified.
						This command is very helpful in tuning the
						Low and High
						Remove Bad Images Threshold
						settings.
    - Updated to ZWO SDK v1.39 which adds supports for the
						ASI582MC, Seestar 585MC, 4400MC Pro, 585MM Mini, 662MM Mini, and 992MM Pro cameras.
						It drops support for the 366MC Pro camera.

#### Bug Fixes
    - Fix an issue with not all thumbnails being displayed when
						viewing a day that has thousands of images.
    - Fix an issue with notification images (e.g., "Allsky is Starting")
						not being sent to a remote server.
    - Fixed an issue with updates to the Allsky Map server failing
						because of a missing file.
						A detailed System Message is now displayed in the WebUI
						if that happens.

#### Deleted Settings
    - The Image Overlay Settings
						section of the WebUI's
						Allsky Settings page was
						deleted.
						For ZWO cameras, the
						Show Histogram Box setting
						is now the ZWO Exposure Box
						module in the
						Module Manager.

#### New Settings
    - The Focus Mode setting helps you focus
						by temporarily changes settings to the Pi can take and display pictures
						as fast as possible, about once a second.
    - The Dark Frame Upper Threshold
						setting specifies when a dark frame is "too bright",
						usually because the lens isn't fully covered when taking darks.
						It can also happen if your camera is very noisy.
    - The Remove Bad Images Threshold Count
						setting determines after how many "bad" images a System Message
						and notification image will be displayed.

---
===========================================

## v2024.12.06

???

### v2024.12.06_06  - Point Release # 6

???

#### IMPORTANT NOTES:
        - This is the LAST major release that supports Buster.
        - This is the LAST major release that contains the "legacy"
						overlay method.

#### Enhancements / Changes
        - When 4 consecutive errors occur while capturing images
						with an RPi camera, the last error is now shown
						in the WebUI's "System Messages" section.
        - The allsky-config get_brightness_info command
						now outputs the number of images used and not used in the startrails.
        - Added a
						Troubleshooting Tools  
						Documentation page to list tools to aid in troubleshooting.

#### Bug Fixes
        - Fixed an issue where downloading the support log from the
						Getting Support
						page would hang the page.
        - Fixed a couple issues with WebUI "System Messages":
						
Some messages were displayed hundreds or thousands
								of times rather than being displayed once with a
								number of occurrences greater than 1.
							A message was truncated when unable to download the
								de421.bsp file.
        - Fixed an issue with updates to the Allsky Map server failing
						because multiple double quotes were in a field.
        - Fixed a rare situation where the
						Module Manager
						will fail to display any modules due to corruption in
						a module's metaData.

#### New Settings
        - None

### v2024.12.06_05  - Point Release # 5

???

#### Changes that may require action (upgrades only)
        - The changes in this section may require settings changes;
						after upgrading, check that your settings and images look right.
        - If your Keogram Font Color
						contained three numbers you'll need to reverse the order
						of the numbers.
						This setting previously accepted two formats:
						
blue_number green_number red_number
								(with spaces or commas separating the numbers)
								where each number is from 0 to 255.
							#RRGGBB where each two-digit pair
								goes from hex 00 to ff.
						

						To be consistent with the hex order and with web pages,
						the order of the first format is now:
						red_number green_number blue_number
						(red and blue switched places).
						The order of the second format did not change but
						it now accepts either 3 or 6 hex digits.
						See 
							the documentation   for more details on this setting.

#### Enhancements / Changes
        - The allsky-config   get_brightness_info
						command now displays how many images were used, and not used,
						in each startrail image.
						This is useful when setting the 
						Brightness Threshold.

#### Bug Fixes
        - For RPi cameras, the length of time Allsky waits before
						timing out an image was increased.
						For some Pi's, the prior 30-second timeout was too short
						when the Pi was extremely busy such as during
						timelapse creation.
        - Entering a Locale in the WebUI
						that is not installed on the Pi displays an error message and lists
						the locales that ARE installed and tells the user how
						to install other locales.
        - Mono cameras were calculating the mean image brightness
						twice: once prior to the initial save of the image
						and a second time when determining if the image was too
						dark or too bright.
						The second time used a different formula than the first time.

#### New Settings
        - None

### v2024.12.06_04  - Point Release # 4

???

#### Changes that may require action (upgrades only)
        - The changes in this section may require settings changes;
						after upgrading, check that your settings and images look right.
        - If your Keogram Font Color
						contained three numbers you'll need to reverse the order
						of the numbers.
						This setting previously accepted two formats:
						
blue_number green_number red_number
								(with spaces or commas separating the numbers)
								where each number is from 0 to 255.
							#RRGGBB where each two-digit pair
								goes from hex 00 to ff.
						

						To be consistent with the hex order and with web pages,
						the order of the first format is now:
						red_number green_number blue_number
						(red and blue switched places).
						The order of the second format did not change but
						it now accepts either 3 or 6 hex digits.
						See 
							the documentation   for more details on this setting.

#### Enhancements / Changes
        - The allsky-config   get_brightness_info
						command now displays how many images were used, and not used,
						in each startrails image.
						This is useful when setting the 
						Brightness Threshold.

#### Bug Fixes
        - For RPi cameras, the length of time Allsky waits before
						timing out an image was increased.
						For some Pi's, the prior 30-second timeout was too short
						when the Pi was extremely busy such as during
						timelapse creation.
        - Entering a Locale in the WebUI
						that is not installed on the Pi displays an error message and lists
						the locales that ARE installed and tells the user how
						to install other locales.
        - Mono cameras were calculating the mean image brightness
						twice: once prior to the initial save of the image
						and a second time when determining if the image was too
						dark or too bright.
						The second time used a different formula than the first time.

#### New Settings
        - None

### v2024.12.06_04  - Point Release # 4

???

#### Enhancements / Changes
        - When upgrading from a recent version from Allsky
						you'll likely just need to restart Allsky
						without having to review the settings.
						The installation script will tell you what to do.
        - In addition to the WebUI telling you when a new Allsky
						version is available, an optional note about the new version
						will be displayed, such as
						"Contains an important security update; please install".
        - The Allsky "Status:" on the top of the WebUI
						now updates automatically every few seconds.
        - The System WebUI page
						now appears very quickly and some of the data is automatically
						updated every few seconds.
						Usage of ~/allsky/tmp is now displayed.
						The "Refresh" button is no longer needed so was removed.
        - The Editor WebUI page
						will display a message in the unlikely event that the
						file is corrupted.
        - RPi cameras sometimes hang while taking pictures.
						This used to hang Allsky, but it now times out instead.
        - When RPi cameras are unable to take an image,
						an error message from the camera is added to the log file.
						Previously the error message was written to a temporary
						file that was overwritten every exposure, thereby
						losing prior messages.
        - A message is added to the WebUI if creation of a timelapse,
						startrails, or keogram fails during end-of-night processing.
        - If the Keograms Font Color begins with a
						0 and does not have 6 characters after it,
						e.g., #fff,
						an error message is displayed in the WebUI.
						Those values didn't produce the color expected, for example,
						#fff produced blue labels, not white.
        - The name of the Pi is shown at the top of the WebUI.
						This is useful for people with multiple Pi's.

#### Bug Fixes
        - The Getting Support WebUI page
						(and the related support.sh command) no longer
						fail with an "Argument list too long" message.
						
						They also provide more information to aid in troubleshooting.
        - Setting a target temperature for cooled ZWO cameras now works.
        - install.sh no longer corrupts the Website
						configuration file when adding meteor fields.
        - remoteWebsiteInstall.sh now handles servers that
						don't return anything under certain circumstances.
						This is uncommon but when it happened it kept the
						remote Website from being installed.
        - Permission denied errors from moduleutil.php
						when it tried to overwrite files ending in
						-last has been fixed.
        - The Allsky Website now correctly colors aurora forecasts.
        - upload.sh no longer finds files that don't exist.
        - During installation, the amount of RAM for non-Raspberry Pi
						boards is now determined correctly.
						This number is used to properly size the swap space.
						It's also used to populate the
						Computer setting.

#### Deleted Settings
        - Notification Images

						Notification images, e.g., "Allsky is starting up" provide
						valuable status and troubshooting information so can no longer
						be disabled.

#### New Settings
        - None

### v2024.12.06_03  - Point Release # 3

???

#### Enhancements / Changes
        - RPi cameras that report sensor temperature now support
						dark frames.
						The TEMPERATURE_C and TEMPERATURE_F variables can
						be displayed in overlays for these cameras.

						

RPi cameras that report sensor temperature
								and support dark frames:
								
HQ
									Module 3
									Arducam 16 MP
								
These cameras do not support darks:
								
Version 1
									imx290 60.00 fps
									Arducam 64 MP
									Arducam 462
									Waveshare imx219-d160
									Arducam 64 MB Owlsight
									OneInchEye IMX283
        - Dark frames are now saved as .png
						files for better quality.
						
						If you have any .jpg darks
						in ~/allsky/darks
						we suggest re-doing your darks then removing the old
						.jpg darks.

#### Bug Fixes
        - MOON variables work in the
						Overlay Editor
						(the de421.bsp file downloads correctly).
        - All the "Click here to ..." messages in the WebUI now work.
        - Using the analyticsTracking.js
						in an Allsky Website now works.
        - An issue with adding images in overlays was fixed.
        - The `remoteWebsiteInstall.sh` command now works if the
						Image Directory setting is empty.
        - Duplicate System Messages now have the correct count of the number
						of times the problem occurred.

#### Deleted Settings
        - Camera
						and Computer.
						These values are automatically set during installation so
						no longer need to be prompted for.

#### New Settings
        - Equipment Info
This optional setting is used to add any additional information
					about the equipment you are using,
					for example, if you are using a NoIR (no infra-red filter)
					version of a camera.
					This information will appear on any Allsky Website you have.

### v2024.12.06_02  - Point Release # 2

???

#### Enhancements / Changes
        - The WebUI will now notify you when a new Allsky version is available.
        - The remoteWebsiteInstall.sh command does a better
						job telling you why problems occur and how to fix them.
        - Additions to the allsky-config command:
						
If you are seeing a Multiple consecutive bad images
								message in the WebUI, run
								allsky-config  bad_images_info.
								It will suggest how to fix the problem.
							If a local or remote Allsky Website has a problem reading
								the data.json file,
								you are now directed to run the new
								allsky-config  check_post_data command.
								It tries to determine why the message occurred.
							The allsky-config  move_images command
								is more robust and allows you to move the images back to the
								~/allsky/images
								folder if desired.
        - When an Allsky Website is stuck on the "Loading ..." message
						because it can't find the current image,
						you'll get a message telling you how to fix it.
        - Several Allsky Website files are now in subdirectories, e.g.,
						all the "css" files are in a css directory.
						No user action is needed.
        - You can now have custom "notification images" like
						"Allsky is starting up".
						To do so, create a
						~/allsky/config/myFiles/notificationImages
						directory, then put your custom images there using the exact same names
						as the Allsky files in 
						~/allsky/notificationImages.

#### Bug Fixes
        - The problem with de421.bsp is fixed.
        - Timelapse thumbnails now have the correct name.
        - A security issue was fixed.
        - Installing or upgrading Allsky is less likely to hang when there's
						a problem with an RPi camera.
        - Fixed a typo in the ssl:check-hostname command in
						testUpload.sh.
        - removeBadImages.sh now works with mean values
						that have a comma in them.

#### New Settings
        - None

#### Deleted Settings
        - None

### v2024.12.06_01  - Point Release # 1

???

#### Enhancements / Changes
        - You can no longer enter Issues in GitHub
						(you can still enter Discussions).
						Instead, use the new Getting Support
						page in the WebUI to automatically collect the information
						needed to troubleshoot your problem.
						Simply following the instructions on that page.
						NO private information is sent; that information is kept in
						the ~/allsky/env.json file which
						should never be uploaded.
        - The WebUI's Editor page now:
						
Tells you if there is a formatting error on the page,
								for example, if you are missing a comma.
								You will not be able to save the file until the error(s) are fixed.
							Placeholder values that need updating before a Website
								will work are highlighted like
								XX_NEED_TO_UPDATE_XX.
        - The WebUI now displays the status of Allsky (Running, Stopped, etc.).
						The status is determined every time a WebUI page is displayed,
						so if the status changes while you are on a page it won't be
						updated until the page is refreshed.
        - You can now easily specify a location to store Allsky's image
						other than in ~/allsky/images.
						This is typically done to store images on an SSD or a
						similar larger, faster, and more reliable media than an SD card.
						See the allsky-config  move_images command.
        - If you are having problems getting startrails to show the trails,
						the new allsky-config  get_brightness_info command
						helps by displaying information on image brightness determined during
						startrails generation.
						That information helps determine what to put in the
						Brightness Threshold setting.
						See 
							Startrails settings  
						for details.
        - The new allsky-config  compare_paths command helps
						determine where to upload your remote Website files and what URL to use.
						See the 
							Mapping Server Locations to URLs  
						page for details.
        - The allsky-config command can do more,
						including lettings you change the size of the
						~/allsky/tmp directory
						and the amount of swap space.
						Run allsky-config for a full list of what it can do.
        - The new meteors directory in
						Allsky Websites is to upload images with meteors.
						A meteor icon can be displayed to the list of icons
						on the left side of a Website page by
						setting the "display" line to "true" in the "Archived Meteors" section
						of the associated configuration.json file.
						NOTE: Support for saving and uploading images with
						meteors will be added in a future Allsky release.
        - The remoteWebsiteInstall.sh command now prompts
						to upload any local startrails, keograms, and timelapse files.
						It's also more "polished", doesn't fail as often,
						and provides better messages.
        - Allsky Websites now give a detailed message when they can't
						find the image, instead of just the "Loading..." picture forever.

#### New Settings
        - None

#### Deleted Settings
        - To further simplify configuring a remote Website and
						remove a source of user error,
						changing the names of the timelapse, keogram, and startrails files
						uploaded to a remote Website is no longer allowed
						(these already couldn't be changed for local Websites).
						Hence, the
						Remote Video File Name,
						Remote Keogram File Name, and
						Remote Startrails File Name
						settings in the
						Remote Website
						sub-section of the WebUI were deleted.

#### Bug Fixes
        - Allsky Website icon sorting by date now works.
        - remoteWebsiteInstall.sh no longer fails if you have
						commands in the FTP Commands setting.
        - Changes to the image resize settings in the WebUI are now saved.
        - allsky.sh --help now works and displays all the
						options to the capture programs.
        - Many others including with modules and overlays.

---
        ===========================================

### v2024.12.06 - Base Release

???

#### Changes that may require action (upgrades only)
        - The changes in this section may require settings changes;
					after upgrading, check that your settings and images look right.
        - The config.sh
					and ftp-settings.sh
					files are gone - their settings are now in the WebUI.
					Possible action: 
					The upgrade should migrate your prior settings to the WebUI
					unless you have a very old version of Allsky in which case
					you'll be notified during the upgrade on what to do.
        - The CROP settings have been simplified to specifiy the number
					of pixels to crop from the top, right, bottom, and left of an image.
					Possible action: 
					If you cropped your images the upgrade will notify you
					to re-enter the settings using the new fields.
        - The Remove Bad Images Thresholds
					settings are now between 0.0 and 1.0 instead of 0 - 100.
					Possible action: 
					The upgrade should adjust your threshold values to the
					new range, but check.
        - Allsky now uses the mean brightness of an image
					to determine if it is too bright or too dark.
					This is the same way auto-exposure determines the exposure to use.
					Prior releases looked at the whole image including any dark borders.
					Possible action: 
					You may need to adjust your
					Remove Bad Images Thresholds
					to take into account for this change.
        - (ZWO only) The mean brightness of an images is
					now a number between 0.0 and 1.0; it used to be 0 - 255.
					This matches the Mean Target
					settings which have always been between 0.0 and 1.0 as well as the
					Remove Bad Images Thresholds.
					settings, making it easier to determine what values to use.
					Possible action: 
					If the MEAN variable is on your overlay you may need
					to change the format it's displayed in.
					A two or three-digit number is best.
        - The WebUI now hides the settings in each section unless there's
					an error in that section.
					To view a section's settings, click the
					 symbol on the left side
					of a section heading.
					Possible action: 
					This may take a little time to get used to.
					However, with the significant increase in WebUI settings
					it would be difficult to find what you want if
					the sections weren't hidden.
        - check_allsky.sh is now called
					checkAllsky.sh
					to be consistant with other program names.
					Possible action:  None.

#### Enhancements / Changes
        - Setting up an Allsky Website on the Pi is now trivial - just enable the
					the Use Local Website setting
					and optionally set the number of days' images to keep via the
					Days To Keep on Pi Website setting.
					No more trying to figure out how to set the variables!
        - Setting up a Website on a remote server is easier since the only
					directory you have to specify is the top-level
					Image Directory in the WebUI.
        - Installing a Website on a remote server is significantly easier as well.
					Use the new remoteWebsiteInstall.sh command;
					it will upload the Allsky Website files for you and remove any
					old, unneeded files.
					If this is a new remote Website,
					remoteWebsiteInstall.sh will ask you whether or not to
					also upload any startrails, keograms, and timelapse videos on your Pi.
        - Images, timelapse, keograms, and startrails can now be written
					to a remote server in addition to, or instead of, a remote Website.
					This is useful if you want to include those images in a different website
					or want to archive them.
        - The new allsky-config command
					is similar to the raspi-config command
					but for Allsky information and configuration.
					This command is mentioned in several documentation pages
					(as well as below) to easily describe how to do something.
					
					Execute allsky-config to see what it can do.
        - Running allsky-config   samba
					allows you to mount the ~/allsky
					directory on a PC or MAC.
					See Copy files to / from a Pi  
					for more information.
        - The new testUpload.sh command
					tries to upload a test file to either a remote Website or remote server.
					If the upload fails, the command
					attempts to tell you why it failed and what to do about it.
        - When changing settings, Allsky only restarts if it needs to.
					Some settings, like the Owner
					don't impact taking images so there's no reason to restart Allsky.
					A few settings cause Allsky to stop after being changed.
					Hovering you mouse over a WebUI data field displays a popup
					that indicates what will happen after changing that field.
        - The module
Overlay Method
					is now the default for new installations.
					In the next major Allsky release the legacy
					method will be removed and the only way to add text will be using the
					Overlay Editor.
        - You can now have more than one ZWO camera connected,
					and on the Pi 5, more than one RPi camera connected.
					The installation will show ALL attached cameras.
        - If you change cameras without notifying Allsky
					(e.g., you shutdown the Pi, replace the camera with a different model,
					then restart the Pi), Allsky will not start and will put a
					message in the WebUI telling you how to properly change cameras.
					No message will be given if you replace a camera with the same model,
					e.g., an RPi HQ with another RPi HQ camera.
        - If you try using an unsupported camera you'll
					receive a message stating that and telling you what to do
					and how to request support for the camera.
        - All ZWO cameras as of September 7, 2024 are supported (library version 1.36).
        - Support for some new third-party RPi cameras was added.
					
					Run
					allsky-config  show_supported_cameras
					to see the supported ZWO and RPi cameras.
					
					The ZWO list is over 130 entries so if you want to check
					if a camera you're considering getting is supported, run:
					
allsky-config  show_supported_cameras --zwo | grep -i "CAMERA_NAME"
					replacing CAMERA_NAME with the name with OUT
ASI, e.g., 178mc.
					Checking for an RPi camera is easier:
					allsky-config  show_supported_cameras --rpi
        - The LAN Dashboard
						and WLAN Dashboard
						WebUI pages now display all
						network adapters, regardless of their names.
        - The endOfNight_additionalSteps.sh
					file is no longer supported.
					The few people that had that file should use the "night to day"
					module flow instead.
        - When taking dark frames, any images that is too bright is deleted.
					This can happen if you start taking darks before covering the lens
					or if the lens cover lets in some light, e.g., a plastic lens cap.
        - DHCP on the Pi can be configured via the WebUI's
					Configure DHCP page.
					This is an advanced option that is not used very often.
        - Overlay changes:
					
The overlay module debugging output is easier to read.
You can now create different overlays for daytime and nighttime.
							The new Overlay Manager
							is available from the main toolbar in the
							Overlay Editor.
							Several overlay templates for different cameras are provided
							which can be customised to your requirements.
							If you have customised the overlay then during the upgrade
							process a new custom overlay will be created for you and assigned
							to both daytime and nighttime captures.
							If you have not customised the overlay then Allsky will
							attempt to use the best overlay for your camera.
The Overlay Editor
							will display a warning if any of the fields on the overlay
							are outside the image area.
							The fields can be fixed which will move them into the bounds of the image.
							See [BUG] If a field is outside the image ...  
If images are not being captured the
							Overlay Editor will not start and
							will display a message and wait until images are being captured.
							This prevents a (usually much smaller) notification image
							from being used as the Overlay Editor
							background.
        - See Modules Documentation  
					for details on Extra Module changes.
        - New Modules:
					
Allsky AI - Detects cloud cover using AI
Allsky Fans - Controls a fan based upon cpu temperature
Allsky Border - Expands an image to include additional borders 
Allsky HDD Temp - Retrives hard drive temperatures using SMART
Allsky ina3221 - Allows current and voltage measurements
Allsky influxdb - Allows data to be written to uinfluxdb
Allsky light - Determines light levels using a TSL2591
Allsky LightGraph - Displays a graph of day and night
Allsky ltr390 - Measures UV levels
Allsky mlx90640 - Captures an IR image of the sky (very experimental)
Allsky Publish Data - Publish Allsky data to Redis, MQTT, or REST
Allsky Temp - Reads up to three temperature sensors
							and controls a gpio pin based upon the temperature

#### New Settings
        - Images Sort Order
					determines the sort order of the images on the
					WebUI's Images page.
        - Show Updated Message
					allows hiding the
					Daytime images updated every...
					message on the WebUI's Live View page.
        - Nighttime Capture and
					Nighttime Save
					are the same as the daytime settings but for nighttime.
        - ZWO Exposure Type
					specifies how images should be taken.
					See the documentation for a description of the different types.

#### Deleted Settings
        - The Image Width and
					Height
					settings were deleted since they are no longer needed.
					Use the crop and/or resize settings instead.
        - The Version 0.8 Exposure
					setting was deleted since it's functionality is incorporated
					into the ZWO Exposure Type setting.
        - The New Exposure Algorithm
					setting was deleted because it produced better results
					so is now always used.
        - The REMOVE_BAD_IMAGES setting was
					deleted to keep people from disabling the check.
					In addition to "too dark" and "too light" images, images that are empty
					and corrupt are also checked for, and those images kept timelapses
					from being created.
					If you don't want to run the brightness checks set their
					Remove Bad Images Thresholds to
					0.
        - The Brightness settings
					were deleted since there is no need for them.
					Changes to brightness should be done via the
					Target Mean settings.
        - (ZWO only) The Offset setting
					was deleted.  It brightened every pixel by the amount specified
					and is not needed with allsky cameras.

#### Bug Fixes
        - ASI_ERROR_TIMEOUT messages are mostly gone.
					Yea!!!
        - The ROI selection code assumed the captured image was always a jpg. It now 
					looks in the settings to determine the correct image name. See 
					Ensure the ROI editor uses the correct image
        - Date formats in the overlay editor are now working correctly

#### Maintenance
        - All setting names are now lowercase and boolean settings are
					"true" and "false" rather than 1 and 0.
					These changes should have no impact on users.

---
    ===========================================

## v2023.05.01

???

### v2023.05.01_04 - Point Release # 4

???

#### Enhancements
        - Added support for Bookworm, the Pi Operating System released
						in October, 2023.
						Support for the Buster Operating System will be removed
						after the next major Allsky release.
        - Added support for the Pi 5.
        - Increased suggested amount of swap by 1 GB to help minimize timelapse
						creation problems.
        - New camera support:
						
Arducam IMX462 camera (inexpensive 1920x1080 camera).
All ZWO cameras as of October 19, 2023 (ZWO SDK 1.32)
        - The concept of "Advanced Options" no longer exists.
						ALL settings are always shown.

#### Bug Fixes
        - Uploads of mini-timelapse could fail if an image upload frequency
						was used.
        - Multiple concurrent timelapse creations now work.
        - The width and height of the RPi Version 1 and IMX290 cameras was
						reversed.
        - Uploading using the "GCS" protocol now use the correct "image.jpg"
						name rather than "image-YYYYMMDDHHMMSS.jpg" name.
        - Uploading using the "GCS" prototol gives an error if it can't
						find the gsutil command.
        - The Camera Model setting is no
						longer displayed in the WebUI since it can't be changed manually.
						To change cameras (either of different types or different models
						of the same type), select Refresh
						in the Camera Model field.
        - The ~/allsky/scripts directory
						is now included in the PATH so you can simply type the name of
						any of the scripts in that directory to execute them.
						A reboot may be required for this to take affect.
        - The documentation now specifies to set
						IMAGE_DIR to
						${ALLSKY_WEBSITE}
						when only a local Website exists.
        - The WebUI's Images page
						now only shows icons when there is at least one file
						of the specified type.
						For example, if there is a keogram for the current date the
						 icon appears,
						otherwise "none" appears.
        - The mean brightness is now calculated correctly for ZWO cameras
						running in RAW16 mode.

---
        ===========================================

### v2023.05.01_03 - Point Release # 3

???

#### Enhancements
        - Added support for RPi Version 1 (ov5647) camera.
        - Added FAQ question on how to copy files to and from the Pi.

#### Bug Fixes
        - AUTO_STRETCH now works.
        - Latitude and Longitude processing was improved and a couple bugs fixed.
        - The Allsky Map is no longer updated when "Show on map" is disabled.
        - Consistent delays on ZWO cameras were not working at night.
        - Installing a remote Allsky Website gave an error about a missing file.
        - Some default values were incorrect for RPi cameras in the WebUI.
        - Overlay Editor:

---
        ===========================================

### v2023.05.01_02 - Point Release # 2

???

#### Enhancements
        - The Mean Threshold setting now has
						separate daytime and nighttime settings.
        - The installation keeps track of where it is so if you have to exit it,
						for example, to update the locale, it resumes where it left off.
        - The installation skips steps that aren't needed.
						This greatly decreases the time when upgrading from v2023.05.01 or v2023.05.01_01.
						It can also skip the reboot if possible.
        - (RPi on Bullseye only) You can display the sensor temperature by
						doing the following:
						
Add --metadata   /home/pi/allsky/config/overlay/extra/libcamera.json
								to the Extra Arguments setting in the WebUI.
In the Overlay Editor's
Variable Manager,
								look for AS_SensorTemperature in the
								All Variables tab.
								Click on +
								and define the variable:
								
Format: {:n}   (a whole number)
Type: Number
Enter whatever you'd like in the other fields.
Click on Save changes.
								

In the Allsky Variables tab
								look for ${SensorTemperature}
								in the Variable Name column and
								click on the + button.
								Move and format the field as desired.
							
Click on the flashing  icon.

#### Bug Fixes
        - Setting the Mean Target for daytime and nighttime
						didn't work - the default values were used instead.
        - Keograms, startrails, and timelapse weren't being create at the end of night.

---
        ===========================================

### v2023.05.01_01 - Point Release # 1

???

#### Enhancements
        - If multiple consecutive "bad" images are found,
						a warning image is now displayed saying how many "bad" images were found.
						A system warning in the WebUI is also displayed with instructions on what to check.
						
						When Allsky starts it displays an "Allsky is Starting" image until the first
						good image is saved.
						Depending on your settings and the sky brightness,
						it may take many images before it gets a good one to save.
						The new warning image makes it obvious Allsky hasn't hung.
        - In the WebUI's Editor page,
						the buttons (e.g., "Save changes") are now at the top of the page
						and stay there as you scroll down.
						A new "Top" button appears at the bottom of the page after you scroll
						to make it quick to get back to the top.
        - Selecting Refresh from the
						Camera Type drop-down
						can be used to change cameras of the same
						Camera Type.
						For example, replacing a ZWO ASI120 with an ASI290.
        - Greatly sped up the installation process when packages are not
						already installed by using prebuilt binaries where possible.
        - Changing to a camera that Allsky hasn't seen before will use the
						prior camera's settings that typically are the same for all cameras,
						for example,
						Latitude,
						Angle,
						and
						Owner.
						You'll still need to verify other settings like exposure times
						are appropriate for the new camera.
						
						Changing to a camera that Allsky HAS seen before will
						use all that camera's prior settings.
        - The installation only prompts for a new hostname if the current one
						is still the default "raspberrypi".
						The suggested new name is still "allsky".
						If the current hostname is anything other than the default the user
						already changed the Pi's name, so don't prompt to change again.
        - Check at startup if the settings file is properly linked to a
						camera-specific file.
						When it isn't, changes to the settings won't be propogated during
						updates to Allsky or when switching cameras.
        - ZWO only:
						
ZWO Experimental Exposure
							is a new setting that will use the Allsky auto-exposure algorithm
							at night (assuming nighttime auto-exposure is enabled).
							Initial testing indicates this improves the exposure of nightime images.
							
							If you enable this setting, please let us know if it helps or not
							by entering a Discussion item in GitHub.
							We need the feedback.

Target Mean can now be specified
							for daytime and nighttime.
							This is the same as for RPi cameras - values range from
							0.0 (pure black) to 1.0 (pure white).
							1.0 is equivalent to 255 in the ${MEAN}
							variable in the Overlay Editor.
							
Mean Threshold can now be specified.
							This is the same as for RPi cameras and determines how close the
							mean brightness needs to be to the
							Target Mean.
        - If there are multiple Wi-Fi interfaces, information on each one will be displayed.
        - The WebUI now validates numbers.
						For example, entering X300
						for an exposure will produce an error.
						Hovering your mouse over a number's value will tell you if it
						must be a whole number or it accepts fractions.

#### Bug Fixes
        - REMOVE_BAD_IMAGES would often flag dark,
						but "good" images as "bad" and not save them using the default
						REMOVE_BAD_IMAGES_THRESHOLD_LOW
						value of 1 (which is still a good default).
						
							If after installing this point release you are still getting a lot of "bad" images,
							do NOT disable REMOVE_BAD_IMAGES - instead,
							modify the REMOVE_BAD_IMAGES_THRESHOLD_* values as needed.
        - The s3 upload protocol now sets the destination file name to
						image.jpg instead of
						image-YYYYMMDDHHMMSS.jpg.
        - The scp upload protocol now uses the
						REMOTE_USER setting.
        - Set the upper limits on the x and y spinner controls in the overlay property editors to the size
						of the image, previously these were hard coded to 2048.
        - When adding a new variable to the overlay variable list it can now be selected without
						refreshing the page.
        - When an image is moved out of bounds using the x and y spinner controls a red rectangle will be
						drawn around the image, the same as if it were dragged out of bounds.
        - Fixed a bug when compiling on i386 platforms, due to a recent Pi OS change.

---
        ===========================================

### v2023.05.01 - Base Release

???

#### Core Allsky
        - New camera support:
						
All ZWO cameras as of May 1, 2023.
							RPi HQ and Module 3 cameras.
							ArduCam 16 and 64 MP cameras.
							The RPi "Global Shutter Camera" is NOT supported - high speed shutters aren't useful for
								allsky images.
        - "Mini" timelapse videos can be created that contain a user-configurable
						number of the most recent images.
						This allows you to continually see the recent sky conditions.
        - Installation improvements:
						
If there is not enough swap space configured you are prompted to add more.
								Doing this decreases the chance of timelapse creation problems.
							If allsky/tmp is not a memory-resident
								filesystem you are prompted to make it one.
								This SIGNIFICANTLY decreases the number of writes to the SD card, prolonging its life.
							If a ~/allsky-OLD directory is found it's
								assumed to be a prior release of Allsky and you are prompted to have its images,
								darks, and other items moved to the new release.
								See the Installing /
									Upgrading -> Allsky  
								page for instructions for installing this release.
        - scripts/check_allsky.sh was added to perform basic sanity
						checking of your Allsky installation.
						Run it after you're done configuring Allsky to see if you have any issues.
        - latitude and longitude
						can now be specified as either a decimal number
						(e.g., -105.21) or with N, S, E, W (e.g., 105.21W).
        - Removed several settings from config.sh:
						
CAMERA: To update the camera type, use the new
								Camera Type setting in the WebUI.
								This is an advanced setting so you need to click the "Show Advanced Options" button to
								view it.
							POST_END_OF_NIGHT_DATA is no longer needed since
								Allsky automatically determines if you have a local Allsky Website, a remote one, or
								both.
        - New ftp-settings.sh variables:
						
REMOTE_PORT specifies a non-default FTP port.
							SSH_KEY_FILE is the path to an SSH private key.
								When scp is used for uploads,
								this identify file will be used to establish the secure connection.
							The Secure CP (scp) and Google Cloud Service
								(gcs) protocols are now supported for file uploads.
        - The Wiki now points to files in the GitHub documentation
						directory.
						A copy of that directory is also on the Pi and accessible via the Documentation link in the
						WebUI.
        - The Allsky Documentation has been significantly enhanced and expanded.
						Its goal is to be a single source for everything you need to know about Allsky.
						If you don't know how to do something, look it up.
						If it's not in the documentation, let us know.
        - AUTO_STRETCH now works, and is documented with sample images.
        - Images can now be uploaded using the full image-YYYYMMDDHHMMSS.jpg
						name instead of the shorter image.jpg name.
						See the IMG_UPLOAD_ORIGINAL_NAME Allsky setting in the
						documentation.
        - Many minor enhancements and bug fixes were made.

#### WebUI
        - The WebUI is now installed as part of the Allsky installation and must be
						used to make all settings changes.
						
							The allsky-portal  
							repository will be removed as it is no longer needed.
        - New links on the left side of the WebUI:
						
Overlay Editor allows you to drag and drop the text
								and images you want overlayed on the images.
								This is a significant improvement over the old mechanism and lets you
								vary the font size, color, rotation, etc. for everything you add.
								You can use variables in the text which get replaced at run-time, e.g., the time the
								image was taken.
							Module Manager allows you to specify what actions should
								take place after an image has been saved.
								For example you can add an overlay or count the number of stars or periodically control
								a dew heater.
								Users can develop (and hopefully share) their own modules.
								Full notes on how to develop modules  
								is included in the documentation.
							The Allsky Documentation
								link accesses the documentation on your Pi.
        - Minimum, maximum, and default values are now correct for all camera models.
        - Required fields with missing data are shown in red with a message saying the data is missing.
						For example, Latitude is a required field.
        - New settings on the Allsky Settings page:
						
Camera Type is either ZWO or RPi.
								This replaces the CAMERA variable in the
								config.sh
								file and also allows you to switch between cameras connected to the Pi.
								For example, if you have both an RPi and ZWO camera attached, you can switch between
								them using this setting.
							Max Auto-Exposure for day and night.
								When using auto-exposure, exposure times will not exceed this value.
							Max Auto-Gain for day and night.
								When using auto-gain, gain values will not exceed this value.
							Auto White Balance, Red
									Balance,
								and Blue Balance are now available for day and night.
							Frames to Skip for day and night determine how many
								initial
								auto-exposure frames to ignore when starting Allsky, while the auto-exposure
								algorithm homes in on the correct exposure.
								These frames are often over or under exposed so not worth saving anyhow.
							Consistent Delays determines whether or not the time
								between the start of
								exposures will be consistent (current behavior) or not.
								When enabled, the time between images is the maximum exposure time plus the delay you
								set.
							Overlay Method determines if the text overlay
								(exposure, time, etc.)
								should be done by the legacy program or by the new "module" system (see above).
								The default method will change to the module method in the next release of
									Allsky,
									and after that the legacy overlay method will be removed.
								
Require WebUI Login specifies whether
								or not the WebUI should require you to login.
								Only set this to No
								if your Pi is on a local network and you trust everyone on the network.
								Do NOT disable it if your Pi is accessible via the Internet!
Cooling and Target
									Temp.
								(ZWO only) now have separate settings for day and night.
							Aggression (ZWO only)
								determines how much of a calculated exposure change should be applied.
								This helps smooth out brightness changes, for example, when a car's headlights appear in
								one frame.
							Gamma (ZWO only) changes the contrast of an image.
								It is only supported by a few cameras; for those that don't,
								the AUTO_STRETCH setting can produce a similar effect.
							Offset (ZWO only)
								adds about 1/10th the specified amount to each pixel's brightness,
								thereby brightening the whole image.
								etting this too high causes the image to turn gray.
							Contrast and
								Sharpness(RPi only).
							Extra Parameters (RPi only) replaces the
								CAPTURE_EXTRA_PARAMETERS
								variable in the config.sh file,
								and allows you to pass parameters to the libcamera-still
								image capture program that Allsky doesn't natively support, such as auto-focus options.
							Mean Target (RPi only) for day and night.
								This specifies the mean target brightness (0.0 (pure black) to
								1.0 (pure white)) when in auto-exposure mode.
							Mean Threshold (RPi only).
								This specifies how close the actual mean brightness must be to the
								Mean Target.
								For example, if Mean Target is 0.5 and
										Mean Threshold is 0.1,
												the actual mean can vary between 0.4 and 0.6 (0.5 +/- 0.1).
							The Focus Metric setting is now available for ZWO
								cameras.
								Higher numbers indicate better focus.
								Use only when sky conditions are NOT changing.
        - NOTE: the following settings moved from
						config.sh to the WebUI,
						and are "advanced" options so you'll need to click the "Show Advanced Options" button to see
						them:
						
DAYTIME_CAPTURE is now
								Take Daytime Images in the WebUI.
							DAYTIME_SAVE is
								Save Daytime Images.
							DARK_CAPTURE is
								Take Dark Frames.
							DARK_FRAME_SUBTRACTION is
								Use Dark Frames.
        - Debug Level is more consistent:
						
 0: errors only.
							 1: level 0 plus warnings and messages about taking and saving pictures. This is the
								default.
							 2: level 1 plus details on images captured, sleep messages and the like.
							 3: level 2 plus time to save image, details on exposure settings and capture retries,
								and module execution.
							 4: lots of gory details for developers only.
        - System messages appear at the top of the WebUI whenever you need to take an action.
        - Many minor enhancements were made.

#### Allsky Website
        - The Allsky Website is now installed in
						~/allsky/html/allsky.
        - If an older version of the Website is found during Website installation you'll be prompted
						to have its images and settings moved to the new location.
        - The home page can be customized:
						
 You can specify the order, contents, look, and style of the icons on the left side.
								You can also hide an icon or display a new one.
							 You can specify the order, contents, and style of the popout that appears on the right
								side.
								For example, you can add a link to pictures of your allsky camera.
							 You can set a background image.
							 You can easily change the maximum width of the image.
							 You can add a link to a personal website.
								This link appears at the top of the page.
							 You can add a border around the image to have it stand out on the page.
							 You can hide the "Make Your Own" link on the bottom right of the page.
							 You can change the icon that appears on the browser's tab.
							 See the Allsky Website documentation for other customizations you can make.
        - Left sidebar:
						
 The constellation overlay icon (Casseopeia icon) is hidden by default and should only
								be displayed
								after you've set the overlay to match your stars.
							 If you are creating mini-timelapse videos, when you install the Website an icon for the
								current video will appear on the left side.
								You can also manually show/hide the icon.
							 There's a new icon to display the image full-size.
							 The startrails and information icons were updated.
        - Popout on right side:
						
 A link to your Image Settings can optionally be displayed via the
								Display Settings option in the WebUI.
							 The version of Allsky and the Allsky Website are displayed.
        - Timelapse video thumbnails are now created by default on the Pi and uploaded to a remote
						server.
						This resolves issues with remote servers that don't support creating thumbnails.
						See the TIMELAPSE_UPLOAD_THUMBNAIL setting.
        - Configuration file changes:
						
 The two prior configuration files (config.js and
								virtualsky.json) are replaced by configuration.json.
							 There are several new settings, including the ability to specify the opacity of the
								overlay.
							 The overlaySize setting,
								which defined both the width and the height of the constellation overlay, was split into
								overlayWidth and overlayHeight.
								Having separate values can be helpful when trying to get the overlay to line up with the
								actual stars.
							 The WebUI Editor page must be used to edit the Allsky
								Website's
								configuration file since it performs various checks before updating the configuration.
							 The Editor page should also be used to edit a REMOTE
								Allsky Website's configuration file for the same reason.s
								A master copy of the remote server's configuration.json
								is kept on the Pi and automatically re-uploaded to the server after every change.
								After you do this, the drop-down list on the Editor page
								will now have
								configuration.json (remote Allsky Website) to distinguish
								it from a local Website's file.
								See the Allsky Website Installation documentation for details.

---
v2023.05.01

## v2022.03.01

???
    - Switched to date-based release names.
    - Added ability to have your allsky camera added to the
					Allsky Map   by configuring
					these
						settings  .
					Added Allsky Map Setup section to the WebUI to configure the map settings.
					The Lens field now shows in the popout on the Allsky Website
					(if installed).
    - Significantly enhanced Wiki - more pages and more information on existing pages.
					All known issues are described there as well as fixes / workarounds.
    - Added an option to keograms to make them full width, even if few images were used in creating
					the keogram.
					In config.sh, set KEOGRAM_EXTRA_PARAMETERS="--image-expand".
    - Added/changed/deleted settings (in config.sh unless otherwise
					noted):
					
Added WEBUI_DATA_FILES - contains the name of one or more
							files that contain information to
							be added to the WebUI's System page.
							See this Wiki
								page   for more information.
						Renamed NIGHTS_TO_KEEP to DAYS_TO_KEEP since it determines
							how many days of data to keep, not just nighttime data.
							If blank (""), ALL days' data are kept.
						Deleted AUTO_DELETE - its functionality is now in DAYS_TO_KEEP.
							DAYS_TO_KEEP="" is similar to the old AUTO_DELETE=false.
						Added WEB_DAYS_TO_KEEP - specifies how many days of
							Allsky Website images and
							videos to keep, if the website is installed on your Pi.
						Added WEB_IMAGE_DIR in ftp-settings.sh to allow the
							images to be copied to a location on your Pi (usually the Allsky Website) as well as
							being copied to a remote machine.
							This functionality already existed with timelapse, startrails, and keogram files.
    - The RPi camera now supports all the text overlay features as the ZWO camera,
					including the Extra Text file.
    - Removed the harmless "deprecated pixel format used" message from the timelapse log file.
					That message only confused people.
    - Improved the auto-exposure for RPi cameras.
    - Made numerous changes to the ZWO and RPi camera's code that will make it easier to maintain and
					add new features in the future.
    - If Allsky is stopped or restarted while a file is being uploaded to a remote server,
					the upload continues, eliminating cases where a temporary file would be left on the server.
    - Decreased other cases where temporary files would be left on remote servers during uploads.
					Also, uploads now perform additional error checking to help in debugging.
    - Only one upload can now be done at a time.
					Any additional uploads display a message in the log file and then exit.
					This should eliminate (or signifiantly decrease) cases where a file is overwritten or not found,
					resulting in an error message or a temporary file left on the server.
    - Added a --debug option to allsky/scripts/upload.sh to aid in debugging
					uploads.
    - Upload log files are only created if there was an error; this saves writes to SD cards.
    - The removeBadImages.sh script also only creates a log file if there was an error,
					which saves one write to the SD card for every image.
    - Allsky now stops with an error message on unrecoverable errors (e.g., no camera found).
					It used to keep restarting and failing forever.
    - More meaningful messages are displayed as images.
					For example, in most cases "ERROR. See /var/log/allsky.log" messages have been
					replaced
					with messages containing additional information, for example,
					"*** ERROR *** Allsky Stopped! ZWO camera not found!".
    - If Allsky is restarted, a new "Allsky software is restarting" message is displayed,
					instead of a "stopping" followed by "starting" message.
    - The timelapse debug output no longer includes one line for each of several thousand images
					proced.
					This make it easier to see any actual errors.
    - The Camera Settings page of the WebUI now displays the minimum,
					maximum,
					and default values in a popup for numerical fields.
    - Startrails and Keogram creation no longer crash if invalid files are found.
    - Removed the allsky/scripts/filename.sh file.
    - The RPi Gamma value in the WebUI was renamed to Saturation,
					which is what it always adjusted; Gamma was incorrect.
    - Known issues:
					
The startrails and keogram programs don't work well if you bin differently during the
							day and night.
							If you don't save daytime images this won't be a problem.
						The minimum, maximum, and default values in the Camera
								Settings page of the WebUI,
							especially for the RPi camera, aren't always correct.
							This is especially try if running on the Bullseye operating system, where many of the
							settings changed.

## 0.8

???

### 0.8.3 - Point Release

???
        - Works on Bullseye operating system.
        - RPi version:
						
Has an improved auto-exposure algorithm.
								To use it, set CAPTURE_EXTRA_PARAMETERS="-daymean 0.5 -nightmean 0.2"
								in config.sh.
							Has many new settings including support for most of the text overlay features that are
								supported by the ZWO version.
        - New and changed config.sh variables,
						see the Software Settings  
						Wiki page for more information:
						
IMG_UPLOAD_FREQUENCY specifies how often the image should
								be uploaded to a website.
								Useful with slow uplinks or metered Internet connections.
							IMG_CREATE_THUMBNAILS specifies whether or not thumbnails
								should be created for each image.
							REMOVE_BAD_IMAGES now defaults to "true" since bad-image
								detection is now done after a
								picture is saved rather than once for all pictures at the end of the night.
								This helps decrease problems when creating startrails, keograms, and timelapse videos.
							IMG_PREFIX: no longer used - the name of the image used
								by the websites is now
								whatever you specify in the WebUI (default:
								image.jpg).
							
When upgrading to 0.8.3 you MUST follow the steps listed
									here  .
        - Replaced saveImageDay.sh and saveImageNight.sh with
						saveImage.sh that has improved functionality,
						including passing the sensor temperature to the dark subtraction commands,
						thereby eliminating the need for the
						temperature.txt file.
        - The image used by the websites (default:
						image.jpg)
						as well as all temporary files are now written to
						allsky/tmp.
						If you are using the Allsky Website you will need to change the
							imageName variable in
							/var/www/html/allsky/config.js to
							"/current/tmp/image.jpg".
        - You can significantly reduce wear on your SD card by making allsky/tmp
						a memory-based
							filesystem  .

### 0.8.1 - Point Release

???
        - Rearranged the directory structure.
        - Created a Wiki with additional documentation and troubleshooting tips.
        - Renamed several variables in config.sh and ftp-settings.sh.
        - CAMERA type of "auto" is no longer supported - you must specify
						"ZWO" or "RPi".
        - Startrails and keograms are now created using all CPUs on the Pi, drastically speeding up
						creation time.
        - Installing the WebUI now preserves any website files (keograms, startrails, etc.) you have.
						This allows for non-destructive updates of the WebUI.
        - New script called upload.sh centralizes all the upload code from other scripts,
						and can be used to debug uploading issues.
						See this Wiki
							page   for more information.
        - The RPi camera does much better auto-exposure if you set the -mode-mean and
						-autoexposure options.
        - The WebUI will now show the Pi's throttle and low-voltage states, which is useful for debugging.
        - Darks work better.
        - Many bug fixes, error checks, and warnings added.

### 0.8 Base Release

???
        - Workaround for ZWO daytime autoexposure bug.
        - Improved exposure transitions between day and night so there's not such a huge change in
						brightness.
        - Decrease in ZWO sensor temperature.
        - Lots of new settings, including splitting some settings into day and night versions.
        - Error checking and associated log messages added in many places to aid in debugging.
        - Ability to have "notification" images displayed, such as "Allsky is starting up" and "Taking
						dark frames".
        - Ability to resize uploaded images.
        - Ability to set thumbnail size.
        - Ability to delete bad images (corrupt and too light/dark).
        - Ability to set an image file name prefix.
        - Ability to reset USB bus if ZWO camera isn't found (requires uhubctl command to be
						installed).
        - Ability to specify the format of the time displayed on images.
        - Ability to have the temperature displayed in Celsius, Fahrenheit, or both.
        - Ability to set bitrate on timelapse video.
0.8

## 0.7

???
    - Added Raspberry Pi camera HQ support based on Rob Musquetier's fork.
    - Added support for x86 architecture (Ubuntu, etc.).
    - Temperature dependant dark frame library.
    - Added browser-based script editor.
    - Added configuration variables to crop black area around image.
    - Added timelapse frame rate setting.
    - Changed font size default value.

## 0.6

???
    - Added daytime exposure and auto-exposure capability.
    - Added -maxexposure, -autoexposure, -maxgain,
					-autogain options.
					Note that using autoexposure and autogain at the same time may produce unexpected results (black
					frames).
    - Autostart is now based on systemd and should work on all raspbian based systems, including
					headless distributions.
					Remote controlling will not start multiple instances of the software.
    - Replaced nodisplay option with preview argument.
					No preview in autostart mode.
    - When using the WebUI, camera options can be saved without rebooting the RPi.
    - Added a publicly accessible preview to the WebUI: public.php.
    - Changed exposure unit to milliseconds instead of microseconds.

## 0.5

???
    - Added Startrails (image stacking) with brightness control.
    - Keograms and Startrails generation is now much faster thanks to a rewrite by Jarno Paananen..

## 0.4

???
    - Added Keograms (summary of the night in one image).

## 0.3

???
    - Added dark frame subtraction.

## 0.2

???
    - Separated camera settings from code logic.

## 0.1

???
    - Initial release.
