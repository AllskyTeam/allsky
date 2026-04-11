## Stuck "Allsky software is starting up"

Most likely Allsky is dropping all images for being overly dark or overly bright due to inappropriate settings. Check the log to see what it says by running tail -f /var/log/allsky.log in a terminal window.

If you are using manual exposure/gain try adjusting those values.

If you are using auto exposure/gain, the starting values are what you specified as the manual values, and it may take several exposures for the software to find the best exposure. While it's doing that, you'll see the "Allsky software is starting up" message. This is normal. However, if the message remains after several minutes follow the instructions here to report the problem.

You can also temporarily set the Remove Bad Images Thresholds to 0 to see what the incorrectly exposed images look like - this might give you an idea of the problem.

## My SD card is getting full/ Moving Images
How do I move my images somewhere else, like to a bigger SSD?
If you would like to store more images or other files than will fit on your SD card, you can:

- Buy a bigger SD card.
  
    This is fairly easy to do and is relatively inexpensive. The disadvantage is that you would still using an SD card, which is not a fast or reliable as other media.

    If you go with this option, follow the steps on the Imaging a storage device   page.

- Replace the SD card with a bigger, more reliable drive like an SSD.
  
    This option is similar to buying a bigger SD card, but you will be using a faster, more reliable media, potentially with much more disk space. On the other hand, an SSD may not fit in your allsky camera enclosure.

    If you go with this option, follow the same instructions as above.

- Add a second disk, such as a USB thumb drive or SSD.

    This option is probably the easiest one to implement - you won't need to reinstall Linux or any programs. Just follow a couple easy steps:
    
    - Make sure your SSD or other media is attached to the Pi and you know how write files there.

        - How you do that is outside the scope of this Allsky documentation.

        - If you don't know, try searching the Internet for instructions.

    - Run: ```allsky-config move_images```

        - It will prompt you for the full pathname of where the images should be moved to, for example, /media/SSD/images.

        - We recommend having images as the last part of the location since you may want to store other files on the SSD and don't want them in the same directory as the images.

        - You will also be asked if you want your current images:

            - Moved to the new location.

            - Copied to the new location.

            - Left in the old location.

            In most cases you'll want to move the images.

The new location will be maintained during future Allsky upgrades, as long as you tell the installation script you want to use the prior allsky-OLD directory.

## Why is there is a long delay between pictures?
The time between when one picture ends and another starts is determined by these settings:

1. **Delay**{ .web-ui-setting } (daytime or nighttime).

2. **Max Auto-Exposure**{ .web-ui-setting } (daytime or nighttime), even if you are using manual exposure.

3. **Consistent Delays Between Images**{ .web-ui-setting } .

There are two possibilities:

1. If **Consistent Delays Between Images**{ .web-ui-setting } is "Yes", then the total delay is always:  
      **Delay + Max Auto-Exposure.**{ .web-ui-setting }

2. If **Consistent Delays Between Images**{ .web-ui-setting } is "No", then the total delay is simply the Delay.

If the time between pictures is longer than you expected, check your **Max Auto-Exposure.**{ .web-ui-setting }

## Reduce wear on my SD card?

SD cards have a limited number of writes they can handle before they wear out. Although this is usually a very large number you may want to minimize writes to the SD card by moving the ~/allsky/tmp directory from the SD card into memory.

During Allsky installation you were prompted to do this - if you did you can ignore this FAQ item.

!!! info  "Pi 5 or newer"

    If you have a Pi 5 or newer you can also replace the SD card with an NVMe SSD disk which is much faster, more reliable, and allows significantly more space than an SD card (but costs more). To do this you'll need to add a board to your Pi (called an NVMe HAT) as well as an NVMe disk. Search for those terms on the Internet to see your options.

Before putting ```~/allsky/tmp``` into memory note the following:

  - In order to do this you'll need enough free RAM memory, so this may not work well with systems with very limited memory, for example, 512 MB.

  - The ```~/allsky/tmp``` directory and its contents will be erased every time you reboot your Pi. This is ok since that directory is only used for temporary files (hence the same) that are invalid after a reboot.

then execute:

```allsky-config  recheck_tmp```

You should accept the defaults.

## How do I focus my allsky camera?

Almost all allsky lenses can focus - either manually (i.e., you focus them) or automatically via a motor on the lens that focuses.

### Manual-focus cameras
Manual-focus lenses have a ring that you turn to change the focus. If your lens does NOT have a focus ring or some other focusing mechanism, it's called a "fixed focus" lens and you can skip this FAQ item.

Try to get your camera at least roughly focused during the day - it'll be easier to see the focus ring on your lens, and exposure duration will be much shorter so you'll get more instant feedback. Focusing on slow-moving clouds works well.

Most lenses have a screw to lock the focus ring - if your's does, loosen the screw. In the WebUI, enable the **Focus Mode**{ .web-ui-setting } setting. It will set up Allsky to take and display pictures as fast as possible by disabling all processing except adding the focus metric to each image. The images are not permanetly saved (so won't appear in timelapse) and are not uploaded.

Go to the WebUI's Live View page. If you were already on that page, refresh it via SHIFT-F5 so it knows to reload the images very quickly.
A focus number will appear on the images - the higher the number, the better focus. The number can change depending on the brightness, so focus when the brightness isn't changing. While looking at the focus number, turn the lens' focus ring a very small amount. If the image and focus number get worse, turn the ring the other way. At some point the image will get worse - that means you've past the best focus, so turn the focus ring in very small increments the other direction.

This method is often "good enough" but the most accurate (and slowest) way to focus is at night using stars. Zoom in on the image and look for stars that are bright but not saturated. Keep focusing until the stars are as small as possible.

When done focusing tighten the focus lock screw Look at the focus metric to make sure it's not worse - if it is, you probably moved the focus ring when tightening it; it's easy to do. In the WebUI, disable Focus Mode.

### Auto-focus cameras
If you have a camera with an auto-focus lens like the RPi Module 3, see the camera documentation   for a description of focus-related settings. You'll use the --lens-position setting to determine where the best focus is. Run the following (which puts the lens at infinity), then as needed, increase the lens position in small increments until you find the best focus:

```libcamera-still --timeout 1 -shutter 5000 --lens-position 0.0```

You will likely need to adjust the shutter speed to get a good exposure (5000 is 5 seconds).
Once the camera is focused we suggest disabling auto focus since it adds several seconds to each daytime image while it's finding focus, and adds minutes to nighttime images. To do so, add ```--lens-position X``` to the Extra Parameters setting in the WebUI, replacing X with the lens position of best focus.

## How do I change the icons on the Allsky Website?
The icons on the left side of an Allsky Website page and what happens when you click one are controlled by the leftSidebar setting  . The icon itself is specified via the icon sub-setting. See the Font Awesome   page (version 6.2.1) for other choices. Note that not all icons work so you'll need to try them.

## /var/log/allsky.log file is gone.
Do the following in order, stopping when the log file reappears:

1. Try restarting the software: ```sudo systemctl restart allsky```.

2. Restart the software that controls the log files: sudo systemctl restart syslog.

3. Reboot the Pi.

4. Wait until tomorrow - sometimes the log file mysteriously reappears after midnight. Note this is NOT an Allsky problem since it also happens with other services.