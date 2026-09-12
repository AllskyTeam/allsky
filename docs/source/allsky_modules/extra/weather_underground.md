This module retrieves current weather observations from Weather Underground and makes them available as Allsky variables.

It is designed for Weather Underground personal weather station data. The module connects using your Weather Underground API key and station ID, then writes the retrieved values to `allsky_weatherunderground.json` for use in overlays and other Allsky features.

!!! info  "Weather Underground account"

    This module requires a Weather Underground API key and station ID.

!!! warning  "API limits"

    Weather Underground API access may be rate limited. Set **Read Every** high enough that the module does not exceed your account limits.

## Settings { data-toc-label="Settings" }

| Setting | Description |
|--------|-------------|
| API Key | Your Weather Underground API key |
| Station ID | Your Weather Underground station ID |
| Read Every | How often to retrieve data, in seconds |
| Units | The unit system used for returned measurements |

### Units { data-toc-label="Units" }

The following unit options are available:

| Unit | Description |
|-----|-------------|
| metric_si | Metric SI units |
| metric | Metric units |
| imperial | Imperial units |
| uk_hybrid | UK hybrid units |

The selected unit system controls the temperature, wind, precipitation, pressure, and elevation values returned by Weather Underground.

## Available Variables { data-toc-label="Available Variables" }

| Variable | Description |
|--------|-------------|
| AS_WUSTATIONID | Weather Underground station ID |
| AS_WUELEVATION | Station elevation |
| AS_WUQNH | Atmospheric pressure at mean sea level |
| AS_WUQFE | Atmospheric pressure at the station |
| AS_WUOBSTIME | Observation date and time, local to the station |
| AS_WURADIATION | Solar radiation |
| AS_WUUV | UV level |
| AS_WUTEMP | Temperature |
| AS_WUHEATINDEX | Heat index |
| AS_WUDEWPOINT | Dew point |
| AS_WUWINDDIR | Wind direction in degrees |
| AS_WUWINDCARDINAL | Cardinal wind direction |
| AS_WUWINDSPEED | Wind speed |
| AS_WUWINDGUST | Wind gust |
| AS_WUWINDCHILL | Wind chill |
| AS_WUPRECIPRATE | Precipitation rate |
| AS_WUPRECIPTOTAL | Precipitation total |

## Pressure values { data-toc-label="Pressure values" }

The module provides both `AS_WUQNH` and `AS_WUQFE`.

| Variable | Description |
|--------|-------------|
| AS_WUQNH | Pressure adjusted to mean sea level |
| AS_WUQFE | Pressure estimated at station elevation |

`AS_WUQFE` is calculated from the Weather Underground pressure and elevation values using the selected unit system.

## How to use the module { data-toc-label="How to use the module" }

Add the Weather Underground module to the Daytime, Nighttime, or Periodic pipeline. For most installations, the Periodic pipeline is the best place to fetch weather data because it avoids slowing image processing in the day and night pipelines.

Enter your **API Key** and **Station ID**, then choose the **Units** value that matches how you want the variables displayed. Set **Read Every** to control how often data is fetched. A longer period reduces API usage.

After saving the module configuration, use the module test button to confirm that data can be downloaded and written to `allsky_weatherunderground.json`. The variables can then be added to overlays from the Variable Manager.

!!! warning  "Network access"

    This module requires internet access. If the Weather Underground request fails, the module logs an error and no new weather data is written for that run.

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
