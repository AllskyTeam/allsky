## ZWO camera not found
If you have a new ZWO camera model that Allsky doesn't support you'll get an appropriate message in the WebUI when you start Allsky. The message will also tell you how to request support.

If your camera is supported, check:

  - Try plugging the camera into a different port.
  - Try a different USB cable - they DO go bad sometimes.
  - Is the camera plugged in to a USB hub? Make sure the hub is plugged into the Pi. Try plugging the hub into a different port on the Pi. Temporarily bypass the hub.
  - If you have access to another Pi, or a PC, plug the camera into it to see if it works.

## ASI_ERROR_TIMEOUT

!!! warning  "Info"

    This is should almost never happen with newer Allsky releases.

If images are not being taken with your ZWO camera and you see many ASI_ERROR_TIMEOUT messages in /var/log/allsky.log, try the steps below. The exact reason for these messages is unclear, although it's often due to USB settings or an excessive voltage drop going to the Pi or the camera. Long or thin wires can cause a voltage drop big enough that the camera has problems producing an image.

Additionally, some cameras have buggy firmware that causes image acquisition to fail, even when other operations succeed. This condition may persist through a restart of Allsky.

If you are seeing lots of errors (an occasional one can be ignored) try the following, in this order:

- If you have easy access to your Pi:
    - Check if there is moisture or water in it and if so, let it dry out for a couple days. This solved weird problems for some people, such as 60 second exposures finishing in 2 seconds, and continual ASI_ERROR_TIMEOUT messages.
    - Unplug and replug the camera to fully reboot it.
    - Move the camera to a different port on the Pi or from a USB 2 port to USB 3 or vice versa.
- Change the USB settings. On the WebUI's Allsky Settings page, try increasing and decreasing the USB Bandwidth setting and try turning Auto USB Bandwidth on and off.
- See if the system is in under-voltage mode or is throttling which could lead to insufficient power getting to the camera. The WebUI's System page will display the throttle and under voltage status.
  If you are getting under-voltage, this power unit   may help. Or use a more powerful power supply or power cables with thicker wires.
- If you have easy access to your Pi and have a spare powered USB hub, plug the hub into your Pi and a power source, and plug the camera into the hub. This will usually resolve any power issues with the camera.
- If you have a Windows PC, plug the camera into it and use the ZWO software that came with the camera to see if it also has problems. If it does, it's likely a hardware issue.
- The above changes work for almost everyone. If they don't work for you, follow the instructions on the Reporting Problems   page to report the problem.

### Advanced steps

The steps listed below haven't been fully tested and we suggest entering a new [Discussions](https://github.com/AllskyTeam/allsky-modules/discussions){ target="_blank" rel="noopener" }    item before trying them.

Try adding ```swiotlb=131072``` to end of the line in /boot/cmdline.txt, then reboot. This increases the number of USB buffers from 32 to 128 and might be needed for cameras with very large sensors like the ASI294MM (8288 x 5644) @ 16 bits.

```
32  buffers * 1024 bytes/buffer =  32768 bytes.
128 buffers * 1024 bytes/buffer = 131072 bytes.  
```

Prior to this change the contents of /sys/kernel/debug/swiotlb/io_tlb_used was hitting the maximum of 32768 bytes. After the change it was hitting a maximum of about 46000.

Enable ```DebugPrint``` in ~/.ZWO/ASIconfig.xml by changing the 00 to 01, then restart Allsky. A LOT of lines will be added to /var/log/allsky.log, so be sure to set it back to 00 when done testing. The extra log entries may offer some insight into causes of the exposure failures.

## ASI120 etc

!!! danger  "Warning"

    Many people with the ASI120 camera have problems and bought better cameras. Beware.
  
Owners of USB2.0 cameras such as the ASI120 may need to do a firmware upgrade  .

## T7 Cameras
The T7 / T7C cameras from Datyson and other sellers are an OEM version of the ZWO ASI120 and isn't officially supported in Allsky because it does not work out of the box. If you do decide to try this camera, you do so at your own risk.

We do not know if the camera has a fail-safe boot loader that will prevent the camera from being bricked if a firmware update fails. ZWO states that updating the firmware may result in reduced camera performance. As with all firmware updates, this may damage your camera. Once again, use this camera at your own risk.

The stock firmware uses invalid 1024-byte packets, rather than 512-byte. Plugging in this camera will result in kernel logs similar to this:

```
usb 3-2: new high-speed USB device number 62 using xhci_hcd
usb 3-2: config 1 interface 0 altsetting 0 bulk endpoint 0x82 has invalid maxpacket 1024
usb 3-2: New USB device found, idVendor=03c3, idProduct=120b, bcdDevice= 0.00
usb 3-2: New USB device strings: Mfr=1, Product=2, SerialNumber=3
usb 3-2: Product: ASI120MC
usb 3-2: Manufacturer: ZWOptical company  
usb 3-2: SerialNumber: 00000
```

You should now be experiencing some feelings of regret for buying this camera. Any attempt to actually use the camera will fail, likely producing kernel messages similar to:

```
usb 3-2: reset high-speed USB device number 62 using xhci_hcd
usb usb3-port2: disabled by hub (EMI?), re-enabling...
```

While we cannot help with the buyer's remorse, the USB errors can be remedied using ZWO's compatible firmware  . Without this firmware the camera will not work on Linux. Unfortunately, the firmware updater must be run from Windows in order to update USB 2 cameras. ZWO support confirms that it does not work on MacOS or Linux. Additionally, the firmware update requires you to install a specific version of MSVCRT, and also the ZWO driver package (this is not obvious on the firmware page).

If you do not have Windows, you can get a legitimate developer VM image from Microsoft which may work well enough to re-flash the camera. Use your favorite search engine to find a "Microsoft windows developer vm image". Then look for instructions on enabling "USB pass-through" for your virtualization platform. Note that USB pass-through to VMs has been the source of issues in many different projects, e.g., anything that does DSP, timing-critical operations, or device reprogramming.

It may be necessary to append ```program_usb_boot_mode=0``` to /boot/config.txt to make this camera work. As this changes some one-time-programmable EPROM - permanently altering your Raspberry Pi - do not set this unless absolutely necessary (and we don't know why it would be necessary).