This page describes known issues with RPi and RPi-compatible cameras.

!!! warning  "Warning"

    The first step in diagnosing problems with RPi cameras is to run

    ```rpicam-still --timeout 1 --nopreview```

    If it gives an error (usually one of the errors described below), then the problem is with the camera and NOT with Allsky.  

## Camera not found or not working

A "camera not found" message can be due many different things. Here are some steps to try:

- If this is a new RPi camera, make sure the ribbon cable is installed correctly. This is an easy mistake to make since the cable will go in backwards. See the camera documentation for details on how to correctly plug the camera in.
- If you have access to another Pi, try plugging the camera in it to see if it works.
- If you are running the Bullseye operating system, check for the correct camera driver.

    ```rpicam-still --timeout 1 --nopreview```

    Ignoring all the INFO and WARN messages, if you get an error like this:

    ```terminate called after throwing an instance of 'std::runtime_error'```  
    ```what():  failed to import fd 22```

    run:
        - ```sudo raspi-config```  
        - Navigate to Advanced Options  
        - Enable Glamor graphic acceleration  
        - Reboot your Pi  
        - Try ``rpicam-still --timeout 1 --nopreview`` again. It should work   

- Check for under voltage.

    Execute:
    
    ``rpicam-still --timeout 1 --nopreview``

    Ignoring all the INFO and WARN messages, if you get an error that contains  
    
    ```Unable to request 0 buffers: Device or resource busy```

    your Pi may be under voltaged  
        - If you have another power supply try it  
        - Using sudo, add over_voltage=4 to /boot/firmware/config.txt then reboot your Pi. If you are still having the problem, add arm_freq=700 to /boot/firmware/config.txt then reboot your Pi. Note that this decreases the speed of your Pi so should be a last resort  
        See more [information](https://github.com/raspberrypi/rpicam-apps/issues/246){ target="_blank" rel="noopener" }.

## ERROR: Unable to request 4 buffers

**ERROR: Unable to request 4 buffers: Cannot allocate memory** 

If you see this message, either in the WebUI or from running rpicam-still, that means that the camera is detected but it can't take a picture.

```
ERROR V4L2 v4l2_videodevice.cpp:1241 /dev/video14[15:cap]: Unable to request 4 buffers: Cannot allocate memory
ERROR: *** failed to allocate capture buffers ***
```

The following will usually fix it:

- Using your favorite text editor, use sudo to edit the /boot/firmware/config.txt file (if that file doesn't exist try /boot/config.txt).
- Add the following line to the bottom of the file:
  ``cma=256M``
- Reboot the Pi.

If it does NOT fix the problem:

- Run allsky-config prepare_logs.
- Wait for the error to occur. This may take minutes or hours.
- Run grep "Running:" /var/log/allsky.log | tail -1.
- Run rpicam-still --timeout 1 --nopreview.
- Create a new Issue on the rpicam-apps GitHub page  .
- Attach the output from the last two commands to the new Issue.
  Do not attach any Allsky files - this is NOT an Allsky problem.

## RPi HD camera stops taking pictures

This issue is normally resolved by upgrading the firmware on your Pi by doing the following:

```
sudo apt update 
sudo apt full-upgrade
sudo shutdown -r now
```

## RETCODE=137

When a Linux command (for example, date) completes, it has an exit code, also called a "return code" or "RETCODE". By convention, a code of 0 means the command was successful and a non-zero code means there was some problem. The developer of the command specifies what each non-zero code means. When Allsky commands detect an issue, like a required file is not found, they print an error message then exit with a non-zero code.

An exit code of 137 usually means the command was forcefully killed by an outside source, often the Linux operating system. When this happens to an Allsky command, the log file will usually contain a message with Killed in it, and often with ```RETCODE=137``` in it.

If you are using a RPi camera and get a notification message saying ERROR See /var/log/allsky.log for details and the log file contains entries similar to these:

```
Jan 20 18:45:50 allsky allsky.sh[4480]: /home/pi/allsky/allsky.sh: line 372: 4562 Killed "${ALLSKY_HOME}/${CAPTURE}" "${ARGUMENTS[@]}"
Jan 20 18:45:50 allsky allsky.sh[4480]: 'capture_RPi' exited with RETCODE=137
```

that usually means the Linux kernel killed the command because it was using more memory than was available. This can also happen when a timelapse is being created, and the solution is the same - increase swap space.

The installation of Allsky checked if additional swap space was needed, and if so, prompted you to add it. If you are seeing this problem you either didn't add swap space, or additional space is needed.

This problem happens more often on Pi's with small amounts of memory such as the Pi Zero 2 with only 512 MB. It's less likely (although still possible) on a Pi 4 with 4 or 8 GB of memory.