## Choosing A lens

Lenses have a few attributes you'll want to be aware of, and together with the camera sensor determine what kind of image you'll see.

Generally, the lower a lens' focal length is (expressed in mm, like 2.1 mm), the wider a field of view (FOV) it produces. Most people like a very wide FOV such as 180 degrees so they can image as much of the sky as possible. Lenses that produce very wide FOVs are usually called fisheye lenses. If your allsky camera is surrounded by lots of trees or buildings and you don't want them in your images, use a higher focal length lens.

Typical focal lengths used in allsky lens are 1.5 mm - 2.5 mm. Some allsky lens can vary their focal length so are called "zoom" lenses. These are more expensive and produce lesser-quality images so are seldom used. Typical FOVs are 120 degrees - 180 degrees.

The aperture of a lens determines how much light it passes through. Lower numbers let more light through but in general produce fuzzier images that you may or may not notice. Typical apertures (prepended by f) used in allsky lens are f 1.4 - f 2.8.

Lenses are round so produce round images. The size of the image it produces on the sensor, measured by its diameter in mm, is called its image circle.

## Image Circles

Most allsky cameras have rectangular sensors that are wider than they are tall. The images below show a sensor (black with dark gray border) and image circles produced by various fictional lenses (white with stars and a yellow borders).

Depending on the physical size of the sensor and the size of the image circle, you'll get different results, as shown below. There is no "right" or "wrong" combination - it's a personal preference.

1. An image circle that is <em>much</em> smaller than the sensor. This uncommon scenario produces a very small sky image.

    ![](/assets/hardware_images/Case1a.png){ width="100%" }

2. An image circle whose height is the same as the sensor. This shows the whole the sky image and leaves ample room to overlay text and images.
    It's rare to have the sensor height and imager circle be identical as shown below. The AIS 676 is an exception to this and a great camera for Allsky imaging

    ![](/assets/hardware_images/Case1b.png){ width="100%" }

3. An image circle whose height is bigger than the sensor but whose width is the same as the sensor. This cuts off part of the sky image but minimizes the black border, yet still allows for some space to add text without overwriting the sky image. Most very wide FOV sky images include some landscape and/or buildings around the edges so depending on how much of the sky image is cut off, this combination can be beneficial.

    It's rare to have the sensor width and imager circle be identical as shown below.

    ![](/assets/hardware_images/Case2a.png){ width="100%" }


4. If the lens' image fills the whole sensor you'll see what appears to be a "normal" image with no black border. This combination is usually the result of a very small camera sensor.

    ![](/assets/hardware_images/Case2b.png){ width="100%" }

## Determining Image Type

To determine which of the examples above you'll get you need to know the physical size of the camera's sensor and the size of the lens' image circle.

!!! danger  "Determining Size"

    Don't confuse a sensor's physical size with its pixel size. The pixel size only determines how fine of detail you'll see in a sky image - it has nothing to do with anything else on this page.

Most camera web pages list the sensor's width and height but you'll normally need to calculate the sensor's diagonal size using a little math:

Take the square root of:

\[
(sensor\_width \times sensor\_width) + (sensor\_height \times sensor\_height)
\]

So for the Pi HQ Camera

\[
(6.3\,\text{mm} \times 6.3\,\text{mm}) + (4.7\,\text{mm} \times 4.7\,\text{mm}) = 7.86\,\text{mm}
\]

Not all lens web pages list the image circle size - in fact, one of the lenses below didn't list it. You may need to contact the seller or search on the Web.

To see what you'll get, compare the sizes:

- If the image circle size is less than or equal to the sensor height, the full image will fit on the sensor (examples 1 and 2 above).

- If the image circle size is less than the sensor diagonal, the top and bottom of the sky image will be cut off (example 3).

- If the image circle size is greater than the sensor diagonal, the sky image will completely fill the sensor (example 4).

Some common allsky cameras and lenses are shown below followed by an example of the results that different lenses produce using the same camera.

<table>
<thead>
	<tr>
		<th colspan="6" class="tableHeader">Common allsky cameras</th>
	</tr>
	<tr>
		<th>Camera</th>
		<th>Sensor</th>
		<th>Sensor Width</th>
		<th>Sensor Height</th>
		<th>Sensor Diagonal</th>
		<th>Resolution (w&nbsp;x&nbsp;h)</th>
	</tr>
</thead>
<tbody>
	<tr>
		<td>RPi HQ</td>
		<td>Sony IMX477</td>
		<td>6.3 mm</td>
		<td>4.7 mm</td>
		<td>7.86 mm</td>
		<td>4056 x 3040</td>
	</tr>
	<tr>
		<td>ZWO ASI178</td>
		<td>Sony IMX178</td>
		<td>7.4 mm</td>
		<td>5.0 mm</td>
		<td>8.93 mm</td>
		<td>3096 x 2080</td>
	</tr>
	<tr>
		<td>ZWO ASI224</td>
		<td>Sony IMX224</td>
		<td>4.9 mm</td>
		<td>3.7 mm</td>
		<td>6.14 mm</td>
		<td>1403 x 976</td>
	</tr>
	<tr>
		<td>ZWO ASI290</td>
		<td>Sony IMX290</td>
		<td>5.6 mm</td>
		<td>3.2 mm</td>
		<td>6.45 mm</td>
		<td>1936 x 1096</td>
	</tr>
</tbody>
</table>

<table>
<thead>
	<tr>
		<th colspan="5" class="tableHeader">Example allsky lenses</th>
	</tr>
	<tr>
		<th>Lens</th>
		<th>Focal length</th>
		<th>Image circle</th>
		<th>Aperture</th>
		<th>FOV</th>
	</tr>
</thead>
<tbody>
	<tr>
		<td><a href="https://aico-lens.com/product/1-55mm-cs-mount-fisheye-lens-acf12f0155irmm/">cnAICO ACF12F0155IRMM</a></td>
		<td>1.5 mm</td>
		<td>4.6 mm</td>
		<td>F 2.0</td>
		<td>185 deg</td>
	</tr>
	<tr>
		<td><a href="https://aico-lens.com/product/2-5mm-8mp-cs-mount-fisheye-lens-actcs25ir8mpf/">cnAICO ACTCS25IR8MPF</a></td>
		<td>2.5 mm</td>
		<td>6.4 mm</td>
		<td>F 1.6</td>
		<td>190 deg</td>
	</tr>
	<tr>
		<td><a href="https://aico-lens.com/product/2-1mm-focal-length-wide-angle-fov-160-degree-cs-mount-cctv-lens-accf021163mp/">cnAICO ACCF021163MP</a></td>
		<td>2.1 mm</td>
		<td>?? </td>
		<td>F 1.6</td>
		<td>160 deg</td>
	</tr>
	<tr>
		<td><a href="https://aico-lens.com/product/1-4mm-c-fisheye-lens-acf12fm014ircmm/">cnAICO ACF12FM014IRCMM</a></td>
		<td>1.4 mm</td>
		<td>4.59 mm</td>
		<td>F 1.4</td>
		<td>182 deg</td>
	</tr>
</tbody>
</table>

Lens # 1, ACF12F0155IRMM: 1.5 mm focal length.
The lens' image circle (4.6 mm) is smaller than the height of the sensor (5.0 mm) so the whole image fits on the sensor. You may want to crop the sides of the image to remove some of the black border and save disk space.


![](/assets/hardware_images/ASI178-example-1.png){ width="100%" }

Lens # 2, ACTCS25IR8MPF: 2.5 mm focal length.
The lens' image circle (6.4 mm) is larger than the height of the sensor (5.0 mm) but smaller than the width of the sensor (7.4 mm), so you'll see a circle with the top and bottom cut off and some black on the sides.

![](/assets/hardware_images/ASI178-example-2.png){ width="100%" }

In the examples above, if you used a camera with a much larger sensor you would see the full cicular image even with the 2.5 mm lens. On the other hand, if you used a much smaller sensor, like the ASI224, you would see a slightly cut-off circle with the 1.5 mm lens and would see a rectangular image with no black using the 2.5 mm lens.

## Image Offset

It's not uncommon for the sky image to be off center relative to the sensor, as seen below. The small yellow circle is the center of the sky image and the small dark square is the center of the sensor.

![](/assets/hardware_images/Case3-offset.png){ width="100%" }

Most allsky lenses are inexpensive and don't provide "perfect" results. This is not a problem since you can easily crop the image to center it.