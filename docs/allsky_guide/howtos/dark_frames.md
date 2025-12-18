All cameras produce noise, which is shown in the picture below (click on it to show a larger version where the noise is more apparent). A theoretical "perfect" camera would produce a pure black image.

Noise can be one or more of the following:

1. Pixels that are stuck on and appear white on a mono camera, or red, green, or blue on a color camera. These are called "hot pixels".
    White hot pixels are visible in the unaltered left side of the image. Blue hot pixels are visible in the artifically-brightened right side of the image.

2. A salt and pepper-like pattern, visible in the right side of the image, especially when zoomed in.

3. Pixels that are always off and appear black (called "cold pixels"). This noise is very difficult to see unless zoomed in several hundred percent. You might see cold pixels if they are in a bright area of the picture (more likely during the day).

![](/assets/howtos_images/cameraNoise-sm.png){ width="100%" }

/// caption
Examples of Camera Noise
///

 
Noise increases with temperature and exposure length. You won't notice noise in a daylight image because it's significantly brighter than the noise, but with long exposures at night you'll likely see it. Newer cameras tend to produce less noise, but they still produce it.

!!! info  "Info"

    Even expensive cameras like the Hubble Space Telescope produce noise, which is why they are cooled to extremely cold temperatures. Most cameras designed for amature astrophotographers are also cooled, but typically only 10 - 30 degrees C below ambient temperature.


Many people find noise distracting, and a good way to decrease it is to subtract it from a captured image. A picture that contains your desired object, e.g., night sky, and noise is called a light frame. A picture with just the noise (like the picture above) is called a dark frame because it's mostly dark. Subtracting a dark frame from a light frame leaves just your desired object.

## When to take dark frames

You can take dark frames anytime - the software will use your night settings when taking dark frames, even if you take them during the day. The most important thing is to cover your lens fully so no light gets in. This isn't always easy and is why many people take dark frames at night. A good time to take them is on cloudy nights so you aren't "wasting" any time.

!!! info  "Info"

    The lens caps that come with many cameras let a small amount of light in, so don't depend on them to block all the light. Use the lens cap to keep the lens clean, but put a dark towel or something else over the lens. To be extra careful, only take dark frames at night or in a dark room.

You'll probably want to take dark frames before you install your allsky camera, especially if the camera will be difficult to access, for example, on the top of a tall pole. The noise produced by a camera changes over time so you'll want to take new darks whenever you notice "too much" noise.

Some people put their camera in the freezer before taking darks, then take darks until the camera is fully warmed. If that's not possible, take darks a few times a year when the temperature changes. The goal is to have a range of temperatures, but it's not critical to have EVERY possible temperature. A 2 or 3 degree spread is usually fine, e.g., 21, 24, 27 degrees C.

## How to take and use darks?

Execute these steps to take and then use dark frames.

### Capture dark frames

- In the WebUI's Allsky Settings page, set Take Dark Frames to Yes.

- Click on the  button.

    Allsky will stop and wait until you manually start it below. This gives you time for the next step...

- Cover your camera lens and/or dome. Make sure NO light gets in.

- Start Allsky: ```sudo systemctl start allsky```. Dark frames will be saved in the ~/allsky/darks directory. A new dark is created every time the sensor temperature changes by 1 degree C.

- After you are done taking darks, set Take Dark Frames in the WebUI to No.

    Allsky will stop and wait for you to manually start it. This gives you time for the next step...

- Remove the cover from the lens/dome.

- Restart Allsky: ```sudo systemctl start allsky```.

### Subtract dark frames

- On the WebUI's Allsky Settings page set Use Dark Frames to Yes.

- Click on the Save Changes  button. This will restart Allsky taking light frames, and subtract dark frames at night.

You will get an error message in the WebUI if there aren't any dark frames.

## How does Allsky handle darks?
When you are taking dark frames, the software will turn off auto-exposure, auto-gain, and any overlay settings (e.g., time) and use your nighttime settings for Max Auto-Exposure, Gain, and Binning.

!!! info  "Info"

    If you later change the Gain or Binning, you must discard the old darks and take new ones (noise, and hence dark frames, is impacted by these settings). If you think you'll go back to the original settings, save the old darks somewhere else instead of discarding them.

When a dark image is taken a file called dark.png is saved in ~/allsky/tmp, then moved to ~/allsky/darks with a name like "XX.png", where "XX" is the temperature, for example, 21.png.

When darks are being subtracted, the software looks in ~/allsky/darks for the dark frame that is closest to the current sensor temperature. For example, if the current temperature is 21 and you have 3 darks, 17.png, 20.png, and 23.png, the software will pick 20.png because it's only 1 degree off from the current sensor temperature.

The software does not actually look in the dark files - it simply looks at the names of the files. Unless something is really weird with your camera, or your darks are pretty old, the closest dark frame will give the best results.