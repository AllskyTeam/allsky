This pages lists how to troubleshoot other problems that don't deserve their own page.

## USB reset messages in system logs

You can ignore entries similar to the following in the system logs:

```Sep 15 17:44:28 Pi-Allsky kernel: [108641.695297] usb 1-1.5: reset high-speed USB device number 4 using dwc_otg```

The ZWO software adds these whenever an image is taken.

## Can't save image because one is already being saved
This message appears in the WebUI when the time to save and process an image is greater than the time to take an image plus the Delay between images. For example, if it takes 10 seconds to save and process an image but your exposure time is 1 second and your Delay between exposures is 2 seconds (for a total of 3 seconds), the software will try to save the second picture while the first one is still being saved.

png files can take 10 or more seconds to save on a Pi 4 because there is no hardware support for them. You may also see this message if the Delay between images is too short, e.g., less than a second.

There also may be messages like these in ```/var/log/lighttpd/error.log```:

```
2021-10-19 15:17:10: (chunk.c.831) file shrunk: /home/pi/allsky/tmp/image.jpg
2021-10-19 15:17:10 (connections.c.456) connection closed: write failed on fd 8
```

This means that a file shrunk in size while the web server was reading it. With these errors you'll usually see bands of pixels in the images.
To fix this:

- Increase your Delay or save to jpg format instead of png.

- If you have an extremely slow SD card try replacing it with a faster one. Or, make the allsky/tmp directory a memory-filesystem if not already done during installation. See the Reducing wear on your SD card   page.

## Images are too light, too dark, or stars are hard to see

**Overall image too light or too dark**

If your images are too light or too dark and you are using manual exposure try adjusting the Gain, Exposure, and/or Bin. There are separate exposure-related settings for daytime and nighttime, so make sure you pick the right ones. During the day you'll normally use Bin of 1x1 (i.e., binning off), and Gain of 0 since images are bright enough that you don't need those settings.

If you are using auto exposure change the Mean Target to change the overall brightness of the image. It will vary the gain and exposure up to the maximum values you specify. If your images are still too dark overall try increasing the maximum values. Note that every camera has a maximum gain and exposure it supports - hover your cursor over those values to see what the maximums are.

**Stars hard to see**

If the stars are too hard to see but the overall image image brightness is where you want it, try stretching   the image.

## Images are corrupted

Various forms of image corruption have been observed: the right side of the image is full of repeating pixels, image contains parts of two or more frames, offset lines, etc.

- Check your power supply and cooling. The Pi will report on undervoltage and/or throttled status on the System page of the WebUI. If it doesn't say No throttling you should investigate and remediate.

- If you have a ZWO camera it may be experiencing some internal firmware error; reset the camera either by unplugging it or power cycling the port with
    ```
    sudo uhubctl -a 2 $(grep -l 03c3 /sys/bus/usb/devices/*/idVendor | \
        cut -d / -f 6 | sed -Ee 's/(.*)[.]([0-9]+)$/-l \1 -p \2/')
    ```

## Errors when running git clone...
The git command is used to download Allsky releases from the git server. The command rarely fails, but it can if there are networking problems or the git server is down.

The first thing to check is your networking - can you get to a site on the Internet? If you can and you see unusual messages like below, the git server is probably having problems so try again a few hours later.

```
error: RPC failed; curl 92 HTTP/2 stream 0 was not closed cleanly
error: 1234 bytes of body are still expected
fetch-pack: unexpcted disconnect while reading sideband packet
fatal: early EOF
fatal: index-pack failed
```