This page describes how to request that Allsky support a camera.

## ZWO Cameras

Open a new [Discussions](https://github.com/AllskyTeam/allsky-modules/discussions){ target="_blank" rel="noopener" .external } in GitHub using the New feature requests category. Let us know what model of ZWO camera it is, and if you know it, when the camera came out.

Allsky uses a library provided by ZWO, and that library determines what cameras are supported. ZWO comes out with a new library every few months, so if your camera isn't supported that means the camera is newer than the library Allsky is using. We normally update the library when we release a new Allsky version.

**Advanced users**

If you can't wait for the next Allsky version you can download the newest ZWO library and install it yourself. Search for "zwo downloads" on the Web and go to the ZWO site. Look for the "Developer" page and download the Linux/Windows/Mac SDK to your Pi. Unzip the file and copy the libASICamera2.a files from the library to the various ~/allsky/src/lib/arm* directories on the Pi, then execute:

```
cd ~/allsky/src
make capture_ZWO
sudo systemctl stop allsky
cp capture_ZWO ../bin
sudo systemctl start allsky
```

Allsky should now recognize your camera.

## RPi Cameras

- Step 1: Check if the camera is good for allsky
  
    Connect the camera(s) to the Pi. If you have a single RPi camera connected to your Pi, run:

    ```
    allsky-config  new_rpi_camera_info
    ```

    If you have multiple RPi cameras connected, run the following, replacing NUM with the camera number - 0 is the first camera and 1 is the second camera.

    ```
    allsky-config  new_rpi_camera_info --camera NUM
    ```

    Either way, after a few seconds you'll see something like:

    ```
    Maximum exposure time for sensor 'imx708_wide_noir' is 220.5 seconds.
    >>> This will make a good allsky camera. <<<

    ************************
    When requesting support for this camera, please attach
        /home/pi/allsky/tmp/camera_data.txt
    to your request.
    ************************
    ```

    !!! danger  "Warning"

        The maximum exposure times of many RPi and compatible cameras are very short, e.g., 15 seconds, so do not make very good allsky cameras. Before requesting that Allsky support a camera (and ideally before you purchase the camera), make sure it'll make a good allsky camera.

    If the second line in the output is:

    ```
    >>>This is a short maximum exposure so may not make a good allsky camera.<<<
    ```

    you may want to consider a different camera. Nighttime exposures are typicall around 60 seconds, so any camera with a shorter maximum may not properly expose nighttime shots. Do NOT request support for the camera since it's likely no one else will use it either.

- Step 2: Request support

    If the longest exposure the camera supports is enough for you, open a new [Discussions](https://github.com/AllskyTeam/allsky-modules/discussions){ target="_blank" rel="noopener" .external } in GitHub with a New feature requests category. Attach the ```/home/pi/allsky/tmp/camera_data.txt``` file from above as well as a URL for information on the camera (often a URL of where you bought the camera).
