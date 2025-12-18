A timelapse is a video created by combining a sequence of images taken at regular intervals and playing them back at a much higher speed than they were captured. This compression of time allows slow or gradual changes to be observed in a short, continuous video.

In an all-sky imaging context, timelapses are commonly used to show:

  - The movement of stars, the Moon, and planets across the sky

  - The progression of clouds and weather systems

  - The transition from daylight to twilight and night, and back again

  - Events such as aurora, airglow, or passing satellites

Each frame in the timelapse corresponds to a single captured image, and the final playback speed is determined by the capture interval and the frames-per-second (FPS) setting used when generating the video. Timelapses provide an intuitive and engaging way to review long periods of sky activity that would otherwise require examining many individual images.

Allsky supports two types of timelapse:

    1. Daily Timelapse
    2. Mini Timelapse

Settings for both types of timelapses are in the Timelapse Settings section of the WebUI's Allsky Settings page. Each type of timelapse has its own sub-section in the WebUI, and there is a sub-section that applies to both timelapse types.

## Daily Timelapse

The "Daily" timelapse is the one that's created once a day, at the end of nighttime. It includes all the images saved in the last 24 hours.

You specify whether or not you want a daily timelapse automatically created via the Generate   setting. When enabled, a daily timelapse will be created (and optionally uploaded) at the end of night.

The easiest way to manually create and optionally upload a daily timelapse is via the ```generateForDay.sh``` command. For example, to create and then upload a daily timelapse to any Allsky Website and/or remote server you have for July 10, 2025:

```
generateForDay.sh --timelapse 20250710
generateForDay.sh --upload --timelapse 20250710
```

This will use the settings specified in the Daily Timelapse sub-section of the WebUI.

If you have a remote Website you'll most likely need to enable the Upload Thumbnail setting so the timelapse's thumbnail is created on the Pi and uploaded to the Website.

If your camera has a lot of pixels you may need to resize the timelapse in order to decrease the processing power needed to create it and to reduce the file size. If so, update the Width and Height settings. Cutting each size in half is a good starting point.

## Mini Timelapse

A mini timelapse contains a limited number of images and is constantly recreated throughout the day. For example, you can have a mini timelapse that shows the last 50 of images, and is recreated every 5 images. Note that every new mini timelapse replaces the prior one, so there is ever only one mini timelapse.

You specify whether or not you want a mini timelapse created via the Number Of Images   setting. If greater than 0, mini timelapses will be created (and optionally uploaded) containing that number of images. You can enter any number you want, but beware:

  - A small number of images will produce a very short video. For example, a video with 5 images will usually last less than a second.

  - A large number of images will take longer to create and depending on the speed of your Pi, could cause other things to run slowly.

  - On a Pi 4, try starting with 50 images and adjust as needed.

If Number Of Images is greater than 0, a new mini timelapse will be created after the number of images you specify in Frequency. The smaller the number the more often a mini timelapse will be created, and the more processing power needed. Try starting off at 5 and adjust as needed.

Mini timelapses are not designed to be created manually because some configuration files need to be updated after creation.

## Change the timelapse length

Two things determine how long a timelapse video is:

    1. The number of images (called "frames") in a video.

    2. How many frames are displayed per second (called "Frames Per Second" or "FPS").

These are described in more details below.


### Number of frames
Everything else being equal, the more frames in a video, the longer it plays. Doubling the number of frames will double the video's length.

To increase a video's length, do options A and/or B below.

To decrease a video's length, do the opposite of the options below.

- Decrease the interval between images.

    Depending on the speed of your Pi, the size of each image, and how much image processing you do (e.g., how complex your overlay is, if you crop or stretch the image, etc.), you may be able to get by with a delay of a second or two (1000 - 2000 ms). Make sure you DISABLE the Consistent Delays Between Images setting.

    Try a Delay of 2000 ms and let it run for a day. If Allsky can't keep up you'll get messages in the WebUI. You may be able to live with an occassional error, although you may get tired seeing the error messages.

    Advantages:

      - Easy to do.

      - Videos will look smoother; stars and clouds won't "jump" as much from one image to the next.

      - If you like capturing meteors and other items that appear for only a few seconds, a smaller delay means more time is spent capturing images versus waiting, so it can significantly increase your chances of catching items.

    Disadvantages:

      - More images take up more disk space.

!!! info  "Tip"

    Most people start off adjusting the delay between images to change the length of a video.


- Take shorter exposures.

  In order to keep the image brightness the same, you must also increase the gain.

  Advantages:

  - Easy to do.
  - Moving objects will have less blur.
  - Stars will have shorter trails, although you may not notice unless you zoom into the video.

  Disadvantages:

  - More images take up more disk space.
  
  - It takes longer to create a timelapse with more images. For daily timelapses this may not be an issues since they are created while Allsky continues taking pictures.

  - Image quality decreases as gain increases. There's probably a gain level where you'll say "this is too grainy".

  - If you like capturing meteors, shorter exposures increase the time when no image is being taken, which increases the chance of missing a meteor.
      
      For example, assume your exposure length is 60 seconds and you have a 2 second delay between images. In an hour about 58 images will be taken and will be spent processing images and not taking them.

      Decreasing the exposure to 30 seconds produces 112 images but increases the total delay to about 3 minutes 45 seconds.

  - Taking shorter exposures only helps at night - typical daytime exposures are less than a second.

### Frames Per Second (FPS)

A video with 2000 frames displayed at the default FPS of 25 will run for 80 seconds (2000 / 25). The same video displayed at 10 FPS will run for 200 seconds, or 3 minutes, 20 seconds.

Advantages:

  - Easy to do.

Disadvantages:

  - The lower the FPS is, the "jerkier" the video is.

  - Who wants to watch a 3 minute, 20 second video of the sky moving? A minute or two is the limit for many people.

Do the following to see how low the FPS can go before you think the video is too jerky or too long:

```
cd ~/allsky/images
mkdir test
# Copy about 100 images from another directory to the "test" directory.

# Do the following 3 steps a few times, changing your 'Delay' each time.
# Change the "20" in the steps to whatever you set the delay to.

# Set your 'Delay' in the WebUI to something like 20.
generateForDay.sh --timelapse test
mv test/allsky-test.mp4  test/allsky-test-20.mp4

# After you've created some test videos, watch them and pick whichever one
you think is best.

# When done delete the test images:
rm -fr test
```

## Troubleshooting

See the [Troubleshooting -> Timelapse](/allsky_guide/troubleshooting/timelapse.html) for troubleshooting information.