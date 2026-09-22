The Constellation Overlay helper tool works out the settings that line the Allsky Website's [constellation overlay](/allsky_guide/howtos/constellation_overlay.html) up with the stars in your images, so you don't have to align it by trial and error.

It needs to know three things about your images: where the zenith (the point straight overhead) is, how big the sky is, and how the image is rotated. It gets them from the stars: it compares the bright points in your image with where the bright stars were at the time the image was taken, fits your lens, and then picks the overlay settings that match it best.

## Using the tool { data-toc-label="Using the tool" }

- **Night image**

    Pick a clear, dark night image: no clouds, and ideally without the Moon, which washes out the fainter stars. Use an image as Allsky saved it, because the tool reads the time from the file name. Allsky's **Latitude** and **Longitude** settings must be correct.

- **Update the Website**

    Leave this on to have the tool write the new settings into the configuration of each enabled Website (local and/or remote) and upload the remote one, as the WebUI does when you change a Website setting. Turn it off to only see the suggested settings.

- **Run**

    Press **Run**. The tool looks for the stars by itself, which can take up to a minute. It uses another image from the same night, about half an hour apart, to tell stars (which move) from the text on your image (which doesn't).

    If it finds them, the **Images** tab shows your image with the bright stars circled and named. Check that the circles sit on stars. The **Output** tab shows how well the stars fit, then the suggested overlay settings next to the ones you have now, for your local and/or remote Website, and how far from the stars the overlay should be over most of the sky. A second image marks every bright star with a green circle where it is and a yellow cross where the overlay will draw it.

- **If the stars aren't found automatically**

    This can happen with few stars, clouds, or a lot of text on the image. The **Output** tab then lists the bright stars that were at least 20 degrees above the horizon, with their altitude and direction, and the **Images** tab has a copy of the image with a pixel grid.

    Pick two stars from the list that are well apart and not too low. Enter each name in **First star** and **Second star**, press **Pick** next to each and click the star in the image. Use **100%** to zoom in. The click moves to the brightest spot nearby, so it doesn't have to be exact. Then press **Run** again.

!!! info  "Info"

    Remember that your image may be rotated: if north is at the bottom of your image, a star listed as being in the south is near the top. A star chart for the same time helps.

With **Update the Website** on, the **Output** tab ends by saying which Websites were updated; reload the Website to see the new overlay. A weak fit is never written. With it off, nothing is changed: to use the settings, edit the Website's `configuration.json` in the WebUI's **Editor** page and enter the suggested `projection`, `overlayWidth`, `overlayHeight`, `overlayOffsetLeft`, `overlayOffsetTop` and `az`.

## If it doesn't work { data-toc-label="If it doesn't work" }

- **"No consistent fit"**: check that the names match the stars you clicked, that the image is clear, and try another pair of stars.
- **"East on the RIGHT"**: your image is a mirror image of the sky. The overlay can't be mirrored, so flip the image in Allsky's settings and use a new image.
- **"The fit is weak"**: few stars were found. Try a darker, clearer image.
