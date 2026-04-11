---
tags:
  - Extra Module
  - Overlay Data
  - Pipeline Periodic
---

This module calculates data for Solar System objects, the Sun, planets satellites etc. These are called ephemeris, or ephemeris the plural

Data used in this modules calculations is obtained from a variety of sources

- [**The Jet Propulsion Labratory** ](https://www.jpl.nasa.gov){ target="_blank" rel="noopener" } Provides the binary SPICE ephemeris file that contains highly accurate positions and motions of:
    - The Sun
    - Moon
    - Planets (Mercury → Neptune)
    - The Earth–Moon barycentre
- [**Celestrak** ](https://celestrak.org){ target="_blank" rel="noopener" } Provides the data for calculating:
    - Earth satellite positions

## Settings

### Moon

| Setting | Description |
|--------|-------------|
| Enable | Enable this to calculate ephemeris for the Moon |
| Min Elevation | Above this elevation the Moon will be considered visible |

### Sun

| Setting | Description |
|--------|-------------|
| Enable | Enable this to calculate ephemeris for the Sun |

### Planets

| Setting | Description |
|--------|-------------|
| Enable Mercury | Enable this to calculate ephemeris for Mercury |
| Enable Venus | Enable this to calculate ephemeris for Venus |
| Enable Mars | Enable this to calculate ephemeris for Mars |
| Enable Jupiter | Enable this to calculate ephemeris for Jupiter |
| Enable Saturn | Enable this to calculate ephemeris for Saturn |
| Enable Uranus | Enable this to calculate ephemeris for Uranus |
| Enable Neptune | Enable this to calculate ephemeris for Neptune |
| Enable Pluto | Enable this to calculate ephemeris for Pluto |
| Min Elevation | Above this elevation the planet will be considered visible |

### ISS
| Setting | Description |
|--------|-------------|
| Enable ISS | Select this to calculate ISS data |
| Visible Only | When calculating passes only show those where ISS is visible |
| Debug Passes | Enabling this will display the pass information when testing the module, only useful for diagnosing issues |
| Pass Days | The number of days to look ahead for passes |
| Number Of Passes | The number of passes to return |
| AOS/LOS Elevation | The elevation at which Acquisition and Loss of satellite times are calculated |
| Min Elevation | Only return passes where the max elevation is above this value |


Calculating passes for ISS can be fairly slow so be careful with the number of days ahead you look. A sensible value is 5 to 15 days. Also note that the TLE data will become less accurate the further out you look.

### Satellites
| Setting | Description |
|--------|-------------|
| NORAD Id's | List of Norad Id's for satellites, see below for more details |
| Min Elevation | Above this elevation the satellites will be considered visible |

!!! warning  "International Space Station"

    Do not add ISS to the list of Norad Id's. Instead use the iSS tab to manage the space station.


**NORAD ID's**
Enter norad ID's as a comma separated list of the numeric Id's.

So if for example you just want ISS then enter 25544 as the Norad Id.

Calculating large numbers of satellites can be slow so be careful

!!! info  "Element Set Data formats"

    Data is only retreived from Celestrak every two days to prevent being blocked by the site

## Available Variables

!!! info  "Localisation"

    All values are relative to the location and timezone defined in the main Allsky settings

### The Moons Variables

| Variable | Sample | Description |
|--------|-----| -------------|
| AS_MOON_AZIMUTH	| 357 | The Azimuth of the Moon |
| AS_MOON_ELEVATION	| -36.02 | The Elevation of the Moon |
| AS_MOON_ILLUMINATION | 11.5 | The Moons illumination percentage |
| AS_MOON_SYMBOL | W | The Moon symbol for use with the moon font on overlays |

### The Suns Variables

| Variable | Sample | Description |
|--------|-----| -------------|
| AS_SUN_DAWN | 20251029 06:14:04 | The time of Dawn |
| AS_SUN_SUNRISE | 20251029 06:50:27 | The time of Sunrise |
| AS_SUN_NOON | 20251029 11:42:34 | The time of Noon |
| AS_SUN_SUNSET | 20251028 16:35:54 | The time of Sunset |
| AS_SUN_DUSK | 20251028 17:12:07 | The time of Dusk |
| AS_SUN_AZIMUTH | 307 | The Sun's Azimuth |
| AS_SUN_ELEVATION | -40 | The Sun's Elevation |

### The Planets Variables

In the examples below replace Mercury with the relevant planet name

| Variable | Sample | Description |
|--------|-----| -------------|
| AS_Mercury_ALT | -36deg 58' 52.9" | The altitude of the Planet in Human readable text |
| AS_Mercury_ALTD | -36 | The degrees portion of the altitude |
| AS_Mercury_ALTM | 58 | The minutes portion of the altitude |
| AS_Mercury_ALTS | 52 | The seconds portion of the altitude |
| AS_Mercury_AZ | 285deg 40' 14.5" | The azimuth of the Planet in Human readable text |
| AS_Mercury_AZD | 285 | The degrees portion of the azimuth |
| AS_Mercury_AZM | 40 | The minutes portion of the azimuth |
| AS_Mercury_AZS | 14 | The seconds portion of the azimuth |
| AS_Mercury_RA | 15h 19m 09.98s | The planets RA |
| AS_Mercury_DEC | -20deg 05' 17.8" | The planets Dec |
| AS_Mercury_DISTANCE_KM | 195626327 | The planets distance from Earth in Kilometers |
| AS_Mercury_DISTANCE_KM_FORMATTED | 195,626,327 | The planets distance from Earth in Kilometers formatted |
| AS_Mercury_DISTANCE_MILES | 121556526 | The planets distance from Earth in miles |
| AS_Mercury_DISTANCE_MILES_FORMATTED | 121,556,526 | The planets distance from Earth in miles formatted |
| AS_Mercury_VISIBLE | No | Is the planet visible |

### The Satellites Variables

In the examples below replace 66645 with the Norad Id.

| Variable | Sample | Description |
|--------|-----| -------------|
| AS_66645_NAME | ISS (ZARYA) | The name of the Satellite |
| AS_66645_ALT | -14deg 52' 59.3" | The altitude of the Satellite in Human readable text |
| AS_66645_ALTD | -14 | The degrees portion of the altitude |
| AS_66645_ALTM | 52 | The minutes portion of the altitude |
| AS_66645_ALTS | 59 | The seconds portion of the altitude |
| AS_66645_AZ | 107deg 35' 18.5" | The azimuth of the Satellite in Human readable text |
| AS_66645_AZD | 107 | The degrees portion of the azimuth |
| AS_66645_AZM | 35 | The minutes portion of the azimuth |
| AS_66645_AZS | 18 | The seconds portion of the azimuth |
| AS_66645_DISTANCE	| 4494.53506453087 | The planets distance from Earth in Kilometers |
| AS_66645VISIBLE | No | Is the satellite visible |

If ISS passes are enabled then the following variables are generated

| Variable | Sample | Description |
|--------|-----| -------------|
| AS_25544_VISIBLE_PASSES | None Found | A text variable that can be used on overlays if no passes are available ||
| AS_25544_PASS1_RISE_TIME | Date | The date and time ISS rises above the 'Min Elevation' setting |
| AS_25544_PASS1_CUL_TIME | Date | The date and time of the maximum elevation of the pass |
| AS_25544_PASS1_SET_TIME | Date | The date and time ISS sets below the 'Min Elevation' setting |
| AS_25544_PASS1_DURATION | Number | The duration of the pass in seconds |
| AS_25544_PASS1_MAX_ELE | Number | The maximum elevation of the pass |
| AS_25544_PASS1_VISIBLE | Boolean | Flag to indicate if any part of the pass will be visible Z

If you add a table of pass information, or use one of the provided blocks, then you can place the AS_25544_VISIBLE_PASSES on top of the table. If there are no passes this will be displayed, useful for indicating that there are no passes

## Blocks

Several blocks are provide to make adding data to the overlays easier. These can be access from the variable manager in the overlay editor

## Charts

Several charts are available that display Moon related information. These can be found in the Chart Manager


## Available in

=== "Pipelines available In"
    
    <div class="grid cards" markdown>

    -   :fontawesome-solid-clock:{ .lg .middle } __Periodic__

        ---

          - The Periodic pipeline

    </div>