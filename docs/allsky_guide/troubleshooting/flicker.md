If your videos to change in brightness every image or "strobe", see below.

## During daytime AND nighttime
If images on the WebUI's Liveview page or the Allsky Website flicker every time a new image appears, it could be the Firefox browser which has a known issue with image updates. Try a different browser. To ensure the issue is browser-related, click on the Images link in the WebUI and view the images one at a time, checking if their brightness changes every image. If they do NOT, then it's a browser issue.

## Daytime only flicker (ZWO cameras)
Daytime auto exposures with ZWO cameras use an AllSky algorithm that looks at part of the image (called the histogram box) to determine the average brightness, and adjusts exposure to keep the brightness within an acceptable range. By default the histogram box is centered on the image. If the Sun or Moon go through that box, your images may flicker, especially if it is cloudy. If that's the case, try moving the histogram box to one of the corners (but be sure it's within the image the camera lens produces and NOT in the black border). You can also try adjusting the histogram box size - it should be around 15% of the width of the camera sensor in pixels. For a sensor that's 1000 pixels wide, a histogram box of 150 pixels wide is a good place to start.

If you are STILL having flicker issues after doing the above, please follow the instructions on the Reporting Problems   page.

##Nighttime only flicker (ZWO cameras)
Nighttime images use the ZWO algorithm, not the Allsky algorithm for auto exposure. If you see flickering at night, try the following - these steps have helped some people, but not everyone:

Change the USB Bandwidth and Auto USB settings in the WebUI.
Add a more powerful power supply to the Pi, or a thicker/shorter wire from the power supply to the Pi. The Pi may not be getting enough power, which causes it to not provide enough power to the camera.
Add a powered USB 3 hub between the Pi and the camera to ensure the camera's getting enough power.
Update the Pi's firmware by executing sudo rpi-update.