This module retrieves space weather data from the NOAA Space Weather Prediction Center (SWPC) and makes it available to Allsky overlays.

The module currently reads:

- Solar wind plasma data
- Planetary K-index data
- Solar wind magnetic field data

It also calculates the Sun angle for the Allsky location using the latitude and longitude from the main Allsky settings.

!!! info  "NOAA SWPC"

    The module uses public NOAA SWPC JSON endpoints. Set a sensible update period so the service is not queried more often than necessary.

## Settings { data-toc-label="Settings" }

| Setting | Description |
|--------|-------------|
| Update Period | How often to fetch new data, in seconds. The minimum is 300 seconds, or 5 minutes |

## Available Variables { data-toc-label="Available Variables" }

| Variable | Description |
|--------|-------------|
| SWX_SWIND_SPEED | Solar wind speed |
| SWX_SWIND_DENSITY | Solar wind density |
| SWX_SWIND_TEMP | Solar wind temperature |
| SWX_KPDATA | Planetary K-index |
| SWX_BZDATA | Interplanetary magnetic field Bz value |
| SWX_S_ANGLE | Sun angle for the configured Allsky location |

## Variable colouring { data-toc-label="Variable colouring" }

Some variables include a `fill` colour in the extra data file. This allows overlay fields to change colour based on the current value.

### Solar wind density { data-toc-label="Solar wind density" }

| Range | Colour |
|------|--------|
| Greater than 6 | Green |
| 2 to 6 | Yellow |
| Less than 2 | Red |

### Solar wind speed { data-toc-label="Solar wind speed" }

| Range | Colour |
|------|--------|
| Less than 500 | Green |
| 500 to 550 | Yellow |
| Greater than 550 | Red |

### Solar wind temperature { data-toc-label="Solar wind temperature" }

| Range | Colour |
|------|--------|
| Less than 50,000 | Red |
| 50,000 to 100,000 | Yellow |
| 100,001 to 300,000 | Green |
| 300,001 to 500,000 | Yellow |
| Greater than 500,000 | Red |

### Kp index { data-toc-label="Kp index" }

| Range | Colour |
|------|--------|
| Less than 4 | Green |
| 4 to 5 | Yellow |
| Greater than 5 | Red |

### Bz value { data-toc-label="Bz value" }

| Range | Colour |
|------|--------|
| Greater than -6 | Green |
| -15 to -6 | Yellow |
| Less than or equal to -15 | Red |

## How to use the module { data-toc-label="How to use the module" }

Add the Space Weather module to the Daytime, Nighttime, or Periodic pipeline, depending on when you want the values updated. For most installations the Periodic pipeline is the best choice.

Set **Update Period** to control how often the module retrieves fresh NOAA data. A value of 300 seconds updates every 5 minutes. Use a longer period if you only need occasional overlay updates.

After saving the module configuration, use the module test button to confirm the values are being written to `allsky_spaceweather.json`. The variables can then be added to overlays from the Variable Manager.

!!! warning  "Network access"

    This module requires internet access. If the NOAA endpoints cannot be reached, the module logs an error and keeps any existing extra data until it is replaced by a successful update.

## Available in { data-toc-label="Available in" }

=== "Pipelines available In"
    
    <div class="grid cards" markdown>

    -   :fontawesome-solid-sun:{ .lg .middle } __Daytime__

        ---

          - The Day time pipeline

    -   :fontawesome-solid-moon:{ .lg .middle } __Nighttime__

        ---

          - The Night time pipeline

    -   :fontawesome-solid-clock:{ .lg .middle } __Periodic__

        ---

          - The Periodic pipeline

    </div>
