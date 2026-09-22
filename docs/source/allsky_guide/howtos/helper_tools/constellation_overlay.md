The Constellation Overlay helper tool works out the settings that line the Allsky Website's [constellation overlay](/allsky_guide/howtos/constellation_overlay.html) up with the stars in your images, so you don't have to align it by trial and error.

It needs to know three things about your images: where the zenith (the point straight overhead) is, how big the sky is, and how the image is rotated. It gets them from the stars. You identify two bright stars in a night image, and the tool finds the other bright stars itself, fits your lens, and then picks the overlay settings that match it best.

## Using the tool { data-toc-label="Using the tool" }

- **Night image**

    Pick a clear, dark night image: no clouds, and ideally without the Moon, which washes out the fainter stars. Use an image as Allsky saved it, because the tool reads the time from the file name. Allsky's **Latitude** and **Longitude** settings must be correct.

- **Run it once without stars**

    Press **Run** with only the image selected. The **Output** tab lists the bright stars that were at least 20 degrees above the horizon when the image was taken, with their altitude and direction. The **Images** tab has a copy of the image with a pixel grid.

- **First star** and **Second star**

    Pick two stars from the list that are well apart and not too low. Enter each name, then press **Pick** and click the star in the image. Use **100%** to zoom in. The click moves to the brightest spot nearby, so it doesn't have to be exact.

!!! info  "Info"

    Finding the stars is usually the hardest part. Remember that your image may be rotated: if north is at the bottom of your image, a star listed as being in the south is near the top. The constellation lines on a star chart for the same time help.

- **Run it again**

    The **Output** tab shows how well the stars fit, then the suggested overlay settings next to the ones you have now, for your local and/or remote Website. It also shows how far from the stars the overlay should be over most of the sky. The **Images** tab shows the image with every bright star marked: a green circle where the star is, and a yellow cross where the overlay will draw it.

The tool doesn't change anything. To use the settings, edit the Website's `configuration.json` in the WebUI's **Editor** page and enter the suggested `projection`, `overlayWidth`, `overlayHeight`, `overlayOffsetLeft`, `overlayOffsetTop` and `az`.

## If it doesn't work { data-toc-label="If it doesn't work" }

- **"No consistent fit"**: check that the names match the stars you clicked, that the image is clear, and try another pair of stars.
- **"East on the RIGHT"**: your image is a mirror image of the sky. The overlay can't be mirrored, so flip the image in Allsky's settings and use a new image.
- **"The fit is weak"**: few stars were found. Try a darker, clearer image.
