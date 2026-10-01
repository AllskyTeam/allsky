A timelapse is a video created by combining a sequence of images taken at regular intervals and playing them back at a much higher speed than they were captured. This compression of time allows slow or gradual changes to be observed in a short, continuous video.

Timelapses are commonly used to show:

  - The movement of stars, the Moon, and planets across the sky
  - The progression of clouds and weather systems
  - The transition from daylight to twilight and night, and back again
  - Events such as aurora, airglow, or passing satellites

Each frame in the timelapse corresponds to a single captured image, and the final playback speed is determined by the capture interval and the frames-per-second (FPS) setting used when generating the video. Timelapses provide an intuitive and engaging way to review long periods of sky activity that would otherwise require examining many individual images.

Allsky supports two types of timelapse:

    1. Daily Timelapse
    2. Mini Timelapse

Settings for both types of timelapses are in the **Timelapse Settings** section of the WebUI's `Settings -> Allsky Settings` page. Each type of timelapse has its own sub-section in the WebUI, and there is a sub-section that applies to both timelapse types.

## Daily Timelapse { data-toc-label="Daily Timelapse" }

The "Daily" timelapse is the one that's automatically created once a day, at the end of nighttime. It includes all the images saved in the last 24 hours.

Enable the `Generate` setting to have a daily timelapse created. You can have the timelapse automatically uploaded to a Allsky Website and/or remote server via the `Upload` setting.  If you are uploading timelapses to a remote Website we suggest also uploading its thumbnail - to do so, enable the `Upload Thumbnail` setting.

The easiest way to **manually** create and optionally upload a daily timelapse is via the `generateForDay.sh` command. For example, to create and then upload a daily timelapse to any Allsky Website and/or remote server you have for July 10, 2026:

```
generateForDay.sh --timelapse 20260710
generateForDay.sh --upload --timelapse 20260710
```

!!! note
	You may wish to manually create a timelapse if you changed the settings (e.g., FPS), or if a timelapse wasn't automatically created, possibly due to Allsky not running at the night-to-day transition time.

If your camera has a lot of pixels you may need to resize the timelapse in order to decrease the processing power needed to create it and to reduce the file size. If so, update the timelapse **Width** and **Height** settings. Cutting each size in half is a good starting point.

## Mini Timelapse { data-toc-label="Mini Timelapse" }

A mini timelapse contains a limited number of images and is constantly recreated throughout the day. For example, you can have a mini timelapse that shows the last 50 images, and is recreated every 5 images. Note that every new mini timelapse **replaces** the prior one, so there is ever only one mini timelapse.

You specify whether or not you want a mini timelapse created via the `Number Of Images` setting. If greater than 0, mini timelapses will be created containing that number of images. You can enter any number you want, but beware:

  - A small number of images will produce a very short video. For example, a video with 5 images will usually last less than a second.
  - A large number of images will take longer to create and depending on the speed of your Pi, could cause other things to run slowly.
  - On a Pi 4 or older, try starting with 50 images and adjust as needed.
A new mini timelapse will be created after the number of images you specify in `Frequency`. The smaller the number the more often a mini timelapse will be created, and the more processing power needed. Try starting off at the default and adjust as needed.

Mini timelapses are not designed to be created manually because some configuration files need to be updated after creation.

## Change the timelapse length { data-toc-label="Change timelapse length" }

Two things determine how long a timelapse video is:

    1. The number of images (called "frames") in a video.
    2. How many frames are displayed per second (called "Frames Per Second" or "FPS").

These are described in more details below.

### Number of frames { data-toc-label="Number of frames" }
Everything else being equal, the more frames in a video, the longer it plays. Doubling the number of frames will double the video's length.

To increase a video's length, do options A and/or B below.

To decrease a video's length, do the opposite of the options below.

**A. Decrease the interval between images.**

Decreasing the interval between images is done via the `Delay` setting for Daytime and Nighttime.  Doing so increases the number of images taken, thereby increasing a video's length.

Depending on the speed of your Pi, the size of each image, and how much image processing you do (e.g., how complex your overlay is, if you crop or stretch the image, etc.), you may be able to get by with a delay of a second or two (1000 - 2000 ms). Make sure you DISABLE the `Consistent Delays Between Images` setting.

Try a Delay of 2000 ms and let it run for a day. If Allsky can't keep up you'll get messages in the WebUI. You may be able to live with an occassional error, although you may get tired seeing the error messages.

Advantages:

   - Easy to do.
   - Videos will look smoother; stars and clouds won't "jump" as much from one image to the next.
   - If you like capturing meteors and other items that appear for only a few seconds, a smaller delay means more time is spent capturing images versus waiting, so it can significantly increase your chances of catching items.

Disadvantages:

   - More images take up more disk space.
   - It takes longer to create a timelapse with more images. For daily timelapses this may not be an issues since they are created while Allsky continues taking pictures.

!!! info  "Tip"

    Most people start off adjusting the delay between images to change the length of a video.


**B. Take shorter exposures.**

In order to keep the image brightness the same, you must also increase the gain.

Advantages:

  - Easy to do.
  - Moving objects will have less blur.
  - Stars will have shorter trails, although you may not notice unless you zoom into the video.

Disadvantages:

  - More images take up more disk space.
  - It takes longer to create a timelapse with more images.
  - Image quality decreases as gain increases. There's probably a gain level where you'll say "this is too grainy".
  - If you like capturing meteors, shorter exposures increase the time when no image is being taken, which increases the chance of missing a meteor.

      For example, assume your exposure length is 60 seconds and you have a 2 second delay between images. In an hour about 58 images will be taken and about 2 minutes will be spent **processing** images and not **taking** them.  Decreasing the exposure to 30 seconds produces 112 images but increases the total delay to around 4 minutes.

  - Taking shorter exposures only helps at night - typical daytime exposures are less than a second.

### Frames Per Second (FPS) { data-toc-label="Frames Per Second (FPS)" }

A video with 2000 frames displayed at the default FPS of 25 will run for 80 seconds (2000 / 25). The same video displayed at 10 FPS will run for 200 seconds, or 3 minutes, 20 seconds.

Advantages:

  - Easy to do.

Disadvantages:

  - The lower the FPS is, the "jerkier" the video is.
  - Who wants to watch a 3 minute, 20 second video of the sky moving? A minute or two is the limit for many people.

### Bitrate { data-toc-label="Bitrate" }

Jpeg images are normally compressed to reduce their file size.  That compression also decreases their quality.  You change the `Quality` setting for images to impact the amount of compression.

Timelapse videos have a `Bitrate` setting that determines their compression and quality. A higher `Bitrate` means more information from each frame is included, improving the quality.  It also means the video file is larger.

## Create test timelapses

You'll want to pick `FPS` and `Bitrate` settings that provide a compromise you can live with based on your equipment, who will see your timelapses, and other factors.

See the [Timelapse Helper Tool](helper_tools/timelapse.md) documentation page to help determine what `FPS` and `Bitrate` settings to use.

## Troubleshooting { data-toc-label="Troubleshooting" }

See the [Troubleshooting -> Timelapse](/allsky_guide/troubleshooting/timelapse.html) for troubleshooting information.
