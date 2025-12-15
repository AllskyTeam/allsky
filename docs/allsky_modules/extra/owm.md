---
tags:
  - Extra Module
  - Pipeline Day
  - Pipeline Night
  - Pipeline Periodic
  - API Required 
---

This module obtains weather data from the Open Weather Map service

[OpenWeatherMap](https://openweathermap.org){ target="_blank" rel="noopener" .external  } is a widely used weather data service that provides real-time and historical meteorological information through a simple web-based API. It aggregates data from thousands of weather stations, radars, satellites, and global models, then makes it available to developers for use in applications, dashboards, and IoT devices. The platform offers current conditions, forecasts, air-quality information, severe-weather alerts, and detailed hourly data. Access is provided through RESTful API endpoints, typically returning JSON, and supports both free and paid tiers depending on the level of precision, frequency, and features required.

!!! info  "API Key"

    This module requires an API key. To get a key register on the [OpenWeatherMap](https://openweathermap.org){ target="_blank" rel="noopener" .external  } website then visit the API keys section

!!! warning  "API limits"

    The free API limits you to 1000 requests per day. Please ensure you set the 'Read Every' setting to the correct value so as not to exceed this limit

## Settings

| Setting | Description |
|--------|-------------|
| API Key | You Open Weather Map API Key |
| Read Every | Read the data every this number of seconds |
| Units | The units to obtain data in |
| Expiry Time | How long to keep data for before its removed |

## Available Variables

| Variable | Description |
|--------|-------------|
| AS_OWWEATHER | Weather Summary |
| AS_OWWEATHERDESCRIPTION | Weather Description |
| AS_OWTEMP | Temperature |
| AS_OWDEWPOINT | Dewpoint |
| AS_OWHEATINDEX | Heat Index |
| AS_OWTEMPFEELSLIKE | What the temperature feels like |
| AS_OWTEMPMIN | Minimum Temperature |
| AS_OWTEMPMAX | Maximum Temperature |
| AS_OWPRESSURE | Pressure |
| AS_OWHUMIDITY | Humidity |
| AS_OWWINDSPEED | Wind Speed |
| AS_OWWINDGUST | Max Wind Gust |
| AS_OWWINDDIRECTION | Wind direction in degrees |
| AS_OWWINDCARDINAL | Cardinal Wind Direction |
| AS_OWCLOUDS | Percentage Cloud Cover |
| AS_OWRAIN1HR | Rain in the last hour |
| AS_OWRAIN3HR | Rain in the last 3 hours |
| AS_OWSUNRISE | Sunrise time |
| AS_OWSUNSET | Sunset time |

## Available in

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