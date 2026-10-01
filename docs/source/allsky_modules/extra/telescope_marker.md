This module retrieves the current telescope altitude and azimuth from an ASCOM Remote Server and draws a marker on the captured Allsky image at the telescope's pointing position.

It is intended for systems where an Allsky camera and telescope are operating together and you want the processed image to show where the telescope is currently aimed.

!!! warning  "Experimental module"

    This module is experimental. Check the marker position carefully after installation and adjust the Allsky orientation, flip, and margin settings until the marker matches the real sky.

## Requirements { data-toc-label="Requirements" }

This module requires:

- A running ASCOM Remote Server that exposes the telescope altitude and azimuth API endpoints.
- Network access from the Allsky Pi to the ASCOM Remote Server.
- Correct Allsky site and camera orientation settings so telescope coordinates can be mapped onto the image.

## Settings { data-toc-label="Settings" }

### Marker { data-toc-label="Marker" }

These settings control how the telescope position is drawn on the image.

| Setting | Description |
|--------|-------------|
| Telescope marker radius | The radius of the marker circle in pixels |
| Telescope marker width | The line width of the marker circle in pixels |
| Telescope marker color | The colour used for the marker |

### Telescope { data-toc-label="Telescope" }

| Setting | Description |
|--------|-------------|
| Telescope's position | The telescope location. If left empty, use the current Allsky position |

The telescope position is used as the observer location for the telescope coordinate calculation. In most installations this should match the Allsky camera location.

### Allsky { data-toc-label="Allsky" }

These settings align the telescope coordinate system with the camera image.

| Setting | Description |
|--------|-------------|
| Flip x,y coordinates | Flips the calculated image coordinates to match the camera and Allsky image orientation |
| Allsky's sensor azimuth orientation | The azimuth direction at the top of the circular fisheye image. Use `0` if the top of the image points north |
| Allsky's image border | The margin, in pixels, between the square image edge and the usable fisheye horizon circle |

Use the flip setting if the marker appears mirrored horizontally, vertically, or both. Use the sensor azimuth orientation when the marker rotates around the image by a consistent amount.

### ASCOM { data-toc-label="ASCOM" }

These settings tell the module where to read the telescope position.

| Setting | Description |
|--------|-------------|
| Telescope server altitude API url | The ASCOM Remote Server API URL for telescope altitude |
| Telescope server azimuth API url | The ASCOM Remote Server API URL for telescope azimuth |
| Telescope fallback position | The altitude and azimuth to use if the ASCOM query fails |

The altitude and azimuth URLs should return JSON containing a `Value` field. For a typical ASCOM Remote Server telescope device, the endpoint paths are similar to:

```
http://server:11111/api/v1/telescope/0/altitude
http://server:11111/api/v1/telescope/0/azimuth
```

Set the fallback position as an altitude and azimuth pair, for example:

```
(0.0, 0.0)
```

## How to use the module { data-toc-label="How to use the module" }

Add the Telescope Marker module to the Daytime or Nighttime pipeline after the image has been loaded and before the final image is saved. The module modifies the current image directly.

Configure the ASCOM altitude and azimuth URLs first, then use the module test button while the telescope is connected. If the ASCOM server cannot be reached, the fallback position is used.

After the marker appears, tune the Allsky tab:

- If the marker is mirrored, change **Flip x,y coordinates**.
- If the marker is rotated around the centre of the image, adjust **Allsky's sensor azimuth orientation**.
- If the marker is too close to or too far from the centre for low-altitude objects, adjust **Allsky's image border**.

Use a known telescope position to calibrate the marker. Pointing the telescope at a bright star, the Moon, or another easily identifiable object makes it easier to confirm the marker alignment.

## Available in { data-toc-label="Available in" }

=== "Pipelines available In"
    
    <div class="grid cards" markdown>

    -   :fontawesome-solid-sun:{ .lg .middle } __Daytime__

        ---

          - The Day time pipeline

    -   :fontawesome-solid-moon:{ .lg .middle } __Nighttime__

        ---

          - The Night time pipeline

    </div>
