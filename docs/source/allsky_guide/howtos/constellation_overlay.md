The Allsky Website allows an overlay to appear over the image which can contain constellations, stars, objects, and other items. This overlay is called the "constellation overlay" and should not be confused with "image overlays" which contain text and other items that are embedded in captured images. You can view the constellation overlay by clicking on the constellation icon on the left side of the Website page (the icon looks like Cassiopeia).

!!! info  "Info"

    By default the constellation overlay icon doesn't appear since many people never align their overlay with the stars in their image, thereby making their overlay useless and misleading to others who might view it.
    
    You should only make the icon appear if you are going to follow the instructions below to align the overlay.

To make the overlay icon appear:

- In the WebUI, click on the Editor link.

- On the drop-down at the bottom of the page, click on the configuration.json file for your local or remote Website.

- In the homePage section of the file, go to the leftSidebar setting.

- The first group of sub-settings should be for the constellation overlay.

- Set the display setting to true.

- Save the file.

- Refresh your browser.

For more information on this, and other Website settings, visit the [Allsky Website Settings](/allsky_guide/settings/website.html) page.

## Adjusting image size

The default maximum size of the image that's displayed on the Website is 960 pixels wide by 720 pixels high. If your monitor is very small or can support a larger resolution, you may wish to change the default size by doing the following:

- In the WebUI's Editor page, edit the imageHeight setting in the configuration.json file. The image's width will be automatically determined.

- Refresh your browser.

- If you resized the image via the WebUI the final images size should be the same or greater than the size of the imageHeight value.


## Aligning the overlay
!!! info  "Info"

    Getting the overlay placed over the sky image correctly is a trial-and-error effort that takes time.

Most allsky cameras produce rectangular pictures, but the portion of the picture with your allsky image is often round, surrounded by black. Further, the round portion may not be centered exactly in the picture, although it's usually close.

When aligning the overlay keep in mind the difference between the rectangular, full-size picture and the (usually) round portion of that picture that contains the allsky image.

In the steps below you'll be editing the configuration.json file using the WebUI's Editor page.

- Change the width and height settings. These should be roughly the size of the circular portion of the image your lens produces, not the whole image. At night it can be difficult to determine where the border of the lens image is, so this step may be easier during the day.

- Tweak imageHeight if needed. If it's not large enough, the overlay will be cut off at the bottom.

- Center the overlay by changing overlayOffsetLeft and overlayOffsetTop.

- Make the overlay the correct size:

    - THE FOLLOWING HASN'T BEEN TESTED YET:

    - Determine the center of the lens image (not the center of the whole image).

    - Remember where the center is - possibly measure it from the top and side of your monitor.

    - Set keyboard to true.

    - Refresh your browser and display the overlay.

    - With the mouse over the overlay, press z to toggle the gridlines so you can easily see where the center of the overlay is.

    - Modify overlayOffsetLeft and overlayOffsetTop to get center of the overlay to match the center of the lens image.

    - Modify overlayWidth and overlayHeight so the overlay is the correct size. You may need to re-center the overlay as you do this.

- Rotate the overlay to match the stars. Increasing the az setting rotates the overlay clockwise.

## Tips

The following items can be done while aligning the overlay, and undone when finished.

- Set the opacity to 1.0 (pure white) to make it easier to see the overlay.

- Optionally set showOverlayAtStartup to true to eliminate the need to manually display the overlay every time you refresh the browser.

- Set constellationlabels, showgalaxy, and gridlines_eq to false so it's easier to compare the overlay with the actual sky. Keeping constellations on can help identify stars, though.

- Setting mouse can be useful to allow you to rotate the sky overlay with the mouse. This will give an indication if the overlay size and position are correct, and you just need to modify az.

- Have multiple windows open:

    - One editing configuration.json.

    - A big one that shows the full image and overlay.