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

### Satellites
| Setting | Description |
|--------|-------------|
| NORAD Id's | List of Norad Id's for satellites, see below for more details |
| Min Elevation | Above this elevation the psatelliteslanet will be considered visible |

**NORAD ID's**
You can enter norad ID's as a comma separated list of the numeric Id's or enter a group.

So if for example you just want ISS then enter 25544 as the Norad Id. If however you want all weather satllites then enter 'weather' as the norad id.

Calculating large numbers of satellites can be slow, i.e. if you are using groups so be careful

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

In the examples below replace 25544 with the Norad Id

| Variable | Sample | Description |
|--------|-----| -------------|
| AS_25544_NAME | ISS (ZARYA) | The name of the Satellite |
| AS_25544_ALT | -14deg 52' 59.3" | The altitude of the Satellite in Human readable text |
| AS_25544_ALTD | -14 | The degrees portion of the altitude |
| AS_25544_ALTM | 52 | The minutes portion of the altitude |
| AS_25544_ALTS | 59 | The seconds portion of the altitude |
| AS_25544_AZ | 107deg 35' 18.5" | The azimuth of the Satellite in Human readable text |
| AS_25544_AZD | 107 | The degrees portion of the azimuth |
| AS_25544_AZM | 35 | The minutes portion of the azimuth |
| AS_25544_AZS | 18 | The seconds portion of the azimuth |
| AS_25544_DISTANCE	| 4494.53506453087 | The planets distance from Earth in Kilometers |
| AS_25544VISIBLE | No | Is the satellite visible |


## Available in

=== "Pipelines available In"
    
    <div class="grid cards" markdown>

    -   :fontawesome-solid-clock:{ .lg .middle } __Periodic__

        ---

          - The Periodic pipeline

    </div>