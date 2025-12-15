---
tags:
  - Extra Module
  - Pipeline Day
  - Pipeline DayToNight
  - Pipeline NightToDay  
---


This module allows a GPIO pin to be toggled during the transition from day to night and night to day. This can be used to signal other hadrware that the transition has happened, for example an automated cover that protects the camera during daylight hours in very hot environments


## Settings
The following settings are available in the module

| Setting | Description |
|--------|-------------|
| GPIO Pin | The GPIO pin to control |
| State | The state to set the GPIO pin to |

As an example to control a device connected to GPIO pin 18 that goes high at night you would do the following

  - In the Day To Night pipeline add the module, set the GPIO pin to 18 and check the state
  - In the Night To Day pipline add the module, set the GPIO pin to 18 and un check the state

## Available in

=== "Pipelines available In"
    
    <div class="grid cards" markdown>

    -   :fontawesome-solid-sun:{ .lg .middle } __Day To Night__

        ---

          - The Day time pipeline

    -   :fontawesome-solid-moon:{ .lg .middle } __Nigh To Day__

        ---

          - The Night time pipeline

    </div>