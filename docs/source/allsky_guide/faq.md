# FAQ

## Startup and Capture { data-toc-label="Startup and Capture" }

??? question "Stuck `Allsky software is starting up`"
    Most likely, Allsky is dropping all images because they are overly dark or overly bright due to inappropriate settings.

    Check the log to see what it says by running:

    ```bash
    tail -f /var/log/allsky.log
    ```

    If you are using manual exposure or gain, try adjusting those values.

    If you are using auto exposure or gain, the starting values are the manual values you specified. It may take several exposures for the software to find the best exposure. While that is happening, you will see the **Allsky software is starting up** message. This is normal.

    If the message remains after several minutes, follow the instructions here to report the problem.

    You can also temporarily set **Remove Bad Images Thresholds**{ .web-ui-setting } to `0` to see what the incorrectly exposed images look like. That might give you a clue about the problem.

??? question "Why are no images appearing in Live View?"
    Start with the simplest explanation: **Live View** only shows what Allsky is currently producing. If Allsky is not capturing images, Live View has nothing new to display.

    In many cases, a frozen or empty Live View is not a Live View problem at all. It is the first visible sign that image capture has stopped, is delayed, or is currently doing something else.

    Common causes include:

    - Allsky is stopped or still starting up
    - the camera is not producing images
    - dark frames are currently being captured
    - the browser page is stale and needs a manual refresh
    - the image is being updated more slowly than you expected because of your current day or night capture cadence

    The first thing to check is whether Allsky itself is running normally and producing new images. After that, refresh the page in the browser. If the page was opened before a day-to-night or night-to-day transition, it may still be using the old refresh timing and simply needs to be reloaded.

    If Live View still does not update, check `/var/log/allsky.log` and the relevant system status pages in the WebUI. If you are currently taking dark frames, that will also explain why the normal live image is not behaving the way you expect.

??? question "Why are my images too dark, too bright, or completely black?"
    This is usually an exposure problem, not a storage or display problem.

    If you are using manual exposure, start by checking the manual **Exposure**, **Gain**, and **Bin** settings you are using for the current period. Remember that Allsky has separate daytime and nighttime settings, so make sure you are adjusting the right set.

    If you are using auto exposure, the overall brightness is guided by the target and the maximum values you allow Allsky to use. In that case, a bad result usually means one of two things:

    - the target brightness is not appropriate for your conditions
    - the maximum gain or exposure values are too low, so Allsky cannot reach a usable result

    A completely black image can also happen if the lens is covered, the camera is not responding properly, or the image is being rejected as a bad frame. Likewise, an image that is almost pure white can be caused by excessive exposure, incorrect gain, or the camera seeing a scene that is much brighter than your current settings expect.

    If you are not sure what is happening, look at `/var/log/allsky.log` while Allsky is running. That often makes it much clearer whether images are being captured successfully and then rejected, or whether the camera is failing before a usable image is produced.

    If the problem appears only at night or only during the day, that is another strong hint that the issue is in the corresponding day or night settings rather than in the camera itself.

??? question "Why is there a long delay between pictures?"
    The time between when one picture ends and another starts is determined by these settings:

    1. **Delay**{ .web-ui-setting } (daytime or nighttime)
    2. **Max Auto-Exposure**{ .web-ui-setting } (daytime or nighttime), even if you are using manual exposure
    3. **Consistent Delays Between Images**{ .web-ui-setting }

    There are two possibilities:

    1. If **Consistent Delays Between Images**{ .web-ui-setting } is `Yes`, then the total delay is always:

        **Delay + Max Auto-Exposure**{ .web-ui-setting }

    2. If **Consistent Delays Between Images**{ .web-ui-setting } is `No`, then the total delay is simply the **Delay**{ .web-ui-setting }.

    If the time between pictures is longer than you expected, check **Max Auto-Exposure**{ .web-ui-setting }.

??? question "Why are my daytime and nighttime settings behaving differently?"
    Because in many parts of Allsky, daytime and nighttime are treated as separate operating modes.

    That is intentional. The sky, brightness levels, exposure needs, overlays, and processing choices can be very different during the day and at night, so Allsky lets you configure them independently in many places.

    This is useful, but it also means it is easy to change a setting and then think it is not working, when in reality you changed the daytime version and are looking at nighttime behaviour, or the other way around.

    If something feels inconsistent, ask yourself these questions:

    - Am I looking at daytime images or nighttime images right now?
    - Does this setting have separate day and night values?
    - Did I change the correct version of the setting?

    This matters especially for exposure-related settings, capture delays, overlays, saving behaviour, and image appearance. It can also affect troubleshooting, because a system that looks fine during the day may still be misconfigured for nighttime use.

    When in doubt, check the exact setting labels in the WebUI and confirm whether they apply to daytime, nighttime, or both.

## Storage { data-toc-label="Storage" }

??? question "My SD card is getting full. How do I move images somewhere else, like to a bigger SSD?"
    If you would like to store more images or other files than will fit on your SD card, you can:

    **Buy a bigger SD card**

    This is fairly easy to do and is relatively inexpensive. The disadvantage is that you would still be using an SD card, which is not as fast or reliable as other media.

    If you go with this option, follow the steps on the **Imaging a storage device** page.

    **Replace the SD card with a bigger, more reliable drive like an SSD**

    This option is similar to buying a bigger SD card, but you will be using faster, more reliable media, potentially with much more disk space. On the other hand, an SSD may not fit in your allsky camera enclosure.

    If you go with this option, follow the same instructions as above.

    **Add a second disk, such as a USB thumb drive or SSD**

    This option is probably the easiest one to implement. You will not need to reinstall Linux or any programs.

    Follow these steps:

    1. Make sure your SSD or other media is attached to the Pi and you know how to write files there.

        - How you do that is outside the scope of this Allsky documentation.
        - If you do not know, try searching the Internet for instructions.

    2. Run:

        ```bash
        allsky-config move_images
        ```

    3. When prompted, enter the full pathname of where the images should be moved, for example:

        ```text
        /media/SSD/images
        ```

    4. We recommend having `images` as the last part of the location since you may want to store other files on the SSD and do not want them in the same directory as the images.

    5. You will also be asked what to do with your current images:

        - Move them to the new location.
        - Copy them to the new location.
        - Leave them in the old location.

    In most cases, you will want to move the images.

    The new location will be maintained during future Allsky upgrades, as long as you tell the installation script you want to use the prior `allsky-OLD` directory.

??? question "How can I reduce wear on my SD card?"
    SD cards have a limited number of writes they can handle before they wear out. Although this is usually a very large number, you may want to minimize writes to the SD card by moving the `~/allsky/tmp` directory from the SD card into memory.

    During Allsky installation you were prompted to do this. If you did, you can ignore this FAQ item.

    !!! info "Pi 5 or newer"

        If you have a Pi 5 or newer, you can also replace the SD card with an NVMe SSD disk, which is much faster, more reliable, and allows significantly more space than an SD card, but costs more.

        To do this, you will need to add a board to your Pi, called an **NVMe HAT**, as well as an NVMe disk. Search for those terms on the Internet to see your options.

    Before putting `~/allsky/tmp` into memory, note the following:

    - You will need enough free RAM memory, so this may not work well with systems with very limited memory, for example, `512 MB`.
    - The `~/allsky/tmp` directory and its contents will be erased every time you reboot your Pi. This is ok since that directory is only used for temporary files and they are invalid after a reboot.

    Then execute:

    ```bash
    allsky-config recheck_tmp
    ```

    You should accept the defaults.

??? question "How do I safely update Allsky without losing my settings or images?"
    The safest approach is to treat updates like any other system change: prepare first, then update.

    Before a significant change, create a **Config backup** so you have a restore point for your settings and configuration. If you care about preserving recent captures as well, also create an **Images backup** for the dates you do not want to lose.

    This matters because updates and migrations do not all carry the same level of risk. Most go smoothly, but if something does go wrong, the difference between a small inconvenience and a painful recovery is usually whether you prepared a backup first.

    A good working pattern is:

    1. Create a config backup before the update.
    2. Create image backups for any important recent nights.
    3. Download important backups off the device.
    4. Then proceed with the update.

    If you later need to recover, the **Backup and Restore** area gives you a controlled way to inspect and restore those archives rather than manually trying to rebuild the system from copied files.

??? question "What should I back up before making changes?"
    That depends on what kind of change you are about to make.

    If you are changing how Allsky behaves, for example camera settings, overlays, modules, upload settings, or other operational configuration, create a **Config backup** first.

    If you are doing storage cleanup, moving images, replacing a device, or preserving important captures, create an **Images backup** for the dates or folders you care about.

    If the change is significant and you are not completely sure what might be affected, the safest answer is usually to create both:

    - a **Config backup** to preserve how Allsky is set up
    - an **Images backup** to preserve what Allsky has already captured

    In practice, that gives you much more flexibility later. You can restore configuration without touching images, or restore images without replacing the current configuration.

??? question "`/var/log/allsky.log` file is gone"
    Do the following in order, stopping when the log file reappears:

    1. Try restarting the software:

        ```bash
        sudo systemctl restart allsky
        ```

    2. Restart the software that controls the log files:

        ```bash
        sudo systemctl restart syslog
        ```

    3. Reboot the Pi.

    4. Wait until tomorrow. Sometimes the log file mysteriously reappears after midnight. Note this is **not** an Allsky problem since it also happens with other services.

??? question "Where are the logs, and which one should I check first?"
    In most cases, the first log to check is:

    ```text
    /var/log/allsky.log
    ```

    That is the main place where Allsky writes runtime information, warnings, and errors. If something is wrong with image capture, exposure, uploads, generated outputs, or startup behaviour, this is usually the first and best place to look.

    A useful command while troubleshooting is:

    ```bash
    tail -f /var/log/allsky.log
    ```

    That lets you watch new log entries appear as Allsky runs.

    The WebUI can also show messages and status information, and the system pages can help you tell whether the Pi itself is healthy. But when you need detail about what Allsky is actually doing, `allsky.log` is usually the right starting point.

    If you are collecting information for support, use the **Getting Support** page or the support script so you gather the right logs and context together instead of copying fragments manually.

## Camera { data-toc-label="Camera" }

??? question "How do I focus my allsky camera?"
    Almost all allsky lenses can focus, either manually, meaning you focus them, or automatically via a motor on the lens.

    **Manual-focus cameras**

    Manual-focus lenses have a ring that you turn to change the focus. If your lens does **not** have a focus ring or some other focusing mechanism, it is called a **fixed focus** lens and you can skip this FAQ item.

    Try to get your camera at least roughly focused during the day. It will be easier to see the focus ring on your lens, and exposure duration will be much shorter so you will get more instant feedback. Focusing on slow-moving clouds works well.

    Most lenses have a screw to lock the focus ring. If yours does, loosen the screw.

    In the WebUI, enable **Focus Mode**{ .web-ui-setting }. It will set up Allsky to take and display pictures as fast as possible by disabling all processing except adding the focus metric to each image. The images are not permanently saved, so they will not appear in timelapse, and they are not uploaded.

    Go to the WebUI's **Live View** page. If you were already on that page, refresh it with `SHIFT-F5` so it knows to reload the images very quickly.

    A focus number will appear on the images. The higher the number, the better the focus. The number can change depending on the brightness, so focus when the brightness is not changing.

    While looking at the focus number, turn the lens' focus ring a very small amount. If the image and focus number get worse, turn the ring the other way. At some point the image will get worse. That means you have passed the best focus, so turn the focus ring in very small increments the other direction.

    This method is often good enough, but the most accurate, and slowest, way to focus is at night using stars. Zoom in on the image and look for stars that are bright but not saturated. Keep focusing until the stars are as small as possible.

    When done focusing, tighten the focus lock screw. Look at the focus metric to make sure it is not worse. If it is, you probably moved the focus ring while tightening it, which is easy to do.

    In the WebUI, disable **Focus Mode**{ .web-ui-setting }.

    **Auto-focus cameras**

    If you have a camera with an auto-focus lens like the RPi Module 3, see the camera documentation for a description of focus-related settings. You will use the `--lens-position` setting to determine where the best focus is.

    Run the following, which puts the lens at infinity, then as needed, increase the lens position in small increments until you find the best focus:

    ```bash
    libcamera-still --timeout 1 -shutter 5000 --lens-position 0.0
    ```

    You will likely need to adjust the shutter speed to get a good exposure. `5000` is 5 seconds.

    Once the camera is focused, we suggest disabling auto focus since it adds several seconds to each daytime image while it is finding focus, and adds minutes to nighttime images.

    To do so, add `--lens-position X` to the **Extra Parameters** setting in the WebUI, replacing `X` with the lens position of best focus.

??? question "Why does Focus Mode not save or upload images?"
    Because **Focus Mode** is designed for fast feedback, not for normal capture.

    When you enable Focus Mode, Allsky changes its behaviour so it can take and display images as quickly as possible while you are adjusting focus. To do that, it disables most of the normal processing work and keeps the workflow lightweight.

    That is why the images shown in Focus Mode are not treated like normal production images. They are not permanently saved for later browsing, they do not appear in timelapses, and they are not uploaded.

    This is intentional. If Focus Mode tried to behave like normal capture at the same time, the extra saving, processing, and upload work would slow down the feedback loop and make focusing harder.

    Once you have finished focusing, disable **Focus Mode**{ .web-ui-setting } so Allsky returns to normal operation.

??? question "Why is Allsky using a lot of CPU or taking a long time between captures?"
    Capturing a single image is only part of what Allsky does. Depending on your settings, it may also be resizing images, generating overlays, saving files, uploading content, running modules, writing temporary files, and later generating timelapses, keograms, or startrails.

    That means high CPU use is not automatically a sign that something is wrong. Sometimes it simply means the Pi is busy doing exactly what you asked it to do.

    Common reasons for heavier load include:

    - high-resolution images
    - many enabled modules
    - heavy overlay work
    - slow storage
    - uploads happening in the background
    - end-of-night generation of timelapses, keograms, or startrails
    - limited memory causing more pressure on the system

    If the time between captures feels too long, check both your capture timing settings and the amount of processing the system is doing per image. A Pi that is capturing modest images with minimal post-processing behaves very differently from a Pi that is also doing a lot of derived output and upload work.

    Timelapse creation in particular can be demanding, especially on smaller Pis or with high-resolution sensors. If the system seems overloaded during that kind of work, review the timelapse troubleshooting guidance and consider reducing output size or adding swap where appropriate.

## Website { data-toc-label="Website" }

??? question "How do I change the icons on the Allsky Website?"
    The icons on the left side of an Allsky Website page, and what happens when you click one, are controlled by the `leftSidebar` setting. The icon itself is specified via the `icon` sub-setting.

    See the **Font Awesome** page, version `6.2.1`, for other choices. Note that not all icons work, so you will need to try them.

??? question "Why are my images not uploading to my Website or remote server?"
    In most cases, upload failures come down to one of three things:

    - the connection details are wrong
    - the destination path is wrong
    - the remote side is not set up the way Allsky expects

    Start by checking the WebUI settings for the remote Website or remote server carefully. If the server name, protocol, username, password, SSH key, or target directory are wrong, Allsky will not be able to upload successfully.

    A useful rule is this: if **you** cannot log in to the destination with the same details, Allsky will not be able to either.

    For a remote Website, the directory structure also matters. For a remote server, Allsky only cares about the image directory you specify, but for a Website installation the expected layout needs to be correct or uploads may appear to succeed while files end up in the wrong place.

    The best next step is to run the upload test tools described in the uploads troubleshooting guide. Those tools often tell you not only that an upload failed, but also why it failed and what to fix next.

    If uploads still do not work, check `/var/log/allsky.log` and the upload troubleshooting pages. They usually make it clear whether the problem is authentication, path mapping, missing remote directories, or server trust issues such as SSH host verification.

??? question "Why did my timelapse, keogram, or startrails not get created?"
    The first thing to understand is that the **Images** area of the WebUI is mainly a viewer. If an output is missing there, that often means it was never created, never uploaded, or failed during processing.

    Start by checking whether that output type was actually enabled. For example:

    - timelapse generation must be enabled
    - startrails generation must be enabled
    - the underlying images needed for the output must exist and be usable

    After that, check `/var/log/allsky.log`. Allsky normally logs failures during end-of-night processing, and that often tells you whether the problem is a disabled setting, a processing failure, insufficient memory, or a problem with the input images.

    Timelapses are especially sensitive to memory and output size. On smaller Pis or with high-resolution images, `ffmpeg` may fail if the system does not have enough resources. Startrails, by contrast, are more often affected by brightness threshold issues or by there simply not being suitable nighttime images available. Keograms and startrails can also be affected if the day and night image characteristics do not match well enough for the generation process.

    If needed, try generating the missing output manually using the relevant `generateForDay.sh` option. That often gives you a clearer error path and makes troubleshooting easier than waiting for the next automatic run.

??? question "Can I use the WebUI without exposing it to the Internet?"
    Yes, and for many installations that is the better approach.

    The WebUI is an administration interface. It is where you change settings, manage modules, inspect the system, and control how Allsky behaves. Because of that, it generally makes sense to keep it on a private network rather than expose it directly to the Internet.

    If your goal is simply to view or share images, use an Allsky Website or `public.php` instead. Those are intended for viewing output. The WebUI is intended for operating the system.

    A private local setup with WebUI login enabled gives you a much safer baseline than an Internet-exposed WebUI with weak credentials. Even if you never plan to expose the WebUI outside your home network, it is still worth treating it as an administrative surface and protecting it accordingly.

??? question "What is the difference between the WebUI, `public.php`, and an Allsky Website?"
    These three things are related, but they are not the same.

    The **WebUI** is the administration interface. It is where you configure Allsky, view system status, manage modules, inspect saved images, and control how the installation behaves.

    `public.php` is a simple public-facing page that can show the current image without exposing the full WebUI. It is useful when you want a lightweight way to share the current sky view.

    An **Allsky Website** is a viewing interface for output such as current images, saved images, timelapses, keograms, and startrails. It is intended for presentation and sharing rather than administration. It can run locally on the Pi or on a remote server.

    A good way to think about it is:

    - use the **WebUI** to run Allsky
    - use `public.php` to share a simple current-image view
    - use an **Allsky Website** to present the richer viewing side of what Allsky produces

## Hardware { data-toc-label="Hardware" }

??? question "How do I disable the LED's on the Pi"

    !!! warning  "Hardware"

        The instructions here have been noted to work on a lot of hardware but not on some. Give them a try as they will not do any harm.

    To disable the power and ethernet LED's on the pi use the following 

    Debian Bookworm or Trixie, edit:

    ```
    sudo nano /boot/firmware/config.txt
    ```

    Debian Bullseye or older and/or RPi 3 or older:

    ```
    sudo nano /boot/config.txt
    ```

    Then paste the following on the last line of the file and reboot.
    For Bookworm or newer OS:

    ```
    # Disable the Power LED (Red) - Try 'on' if 'off' fails
    dtparam=pwr_led_trigger=none
    dtparam=pwr_led_activelow=on

    # Disable the Activity LED (Green)
    dtparam=act_led_trigger=none
    dtparam=act_led_activelow=off

    # Disable Ethernet Port LEDs
    dtparam=eth_led0=4
    dtparam=eth_led1=4
    ```

    Exceptions:
    For RPi 3 or older, change ethernet value to:
    ```
    dtparam=eth_led1=14
    ```

    For RPi 5:
    Check that your bootloader is up to date:
    
    ```
    sudo rpi-eeprom-update
    ```
    and try omitting: `dtparam=pwr_led_activelow=on` or switching to off if you are unsuccessful.