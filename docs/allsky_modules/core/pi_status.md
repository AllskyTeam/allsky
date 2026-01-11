---
tags:
  - Core Module
  - Pipeline Day  
  - Pipeline Night
  - Pipeline Periodic  
---

## Description
This module reads data from the Pi's hardware. Teh following is read

- CPU Temperature
- PI Model
- Error Status
- Disk Info. Size, usage, free
- Memory Info. Size, usage, free
- Uptime

## Settings
The following settings are available in the module

| Setting | Description |
|--------|-------------|
| Read Every | The number of seconds between reading the data |

## Available Variables

| Variable | Description |
|--------|-------------|
| AS_CPUTEMP | The CPU temperature of the pi in centigrade |
| AS_CPUTEMP_C | The CPU temperature of the pi in centigrade, maintained for legacy overlays |
| AS_CPUTEMP_F | The CPU temperature of the pi in Fahrenheit, maintained for legacy overlays |
| AS_PIMODEL | The module of pi, 4B, 5B etc |
| AS_TSTATSUMARYTEXT | The Throttled status in text format, see below for details |
| AS_DISKSIZE | The size of the disk |
| AS_DISKUSAGE | The amunt of disk space used |
| AS_DISKFREE | The amount of disk space free |
| AS_DISKUSEDPERCENT | The precentage of disk used |
| AS_DISKFREEPERCENT | The percentage of disk free |
| AS_MEMORYTOTAL | Total memory |
| AS_MEMORYUSED | Total memory used |
| AS_MEMORYAVAILABLE | Total memory available |
| AS_MEMORYUSEDPERCENTAGE | Percentage of memory used |
| AS_MEMORYFREEPERCENTAGE | Percentage of memory free |
| AS_UPTIME | the uptim eof th pi |

### Throttled Status

When a Raspberry Pi detects unsafe operating conditions, it protects itself by reducing performance. This is known as throttling and can involve:

  - Reducing CPU frequency
  - Reducing GPU frequency
  - Limiting power to peripherals
  - In extreme cases, shutting down components

Throttling is not a software bug — it is a hardware protection mechanism.

The following throttle conditions can occur


| Meaning | What it indicates |
|---------|-------------------|
| Under-voltage detected (current) | The Pi is not getting enough power right now |
| ARM frequency capped (current) | CPU speed is being limited due to power issues |
| CPU throttled (current) | Performance reduced due to high temperature or power instability |
| Soft temperature limit active (current) | Temperature is approaching the safe limit and performance is reduced |
| Under-voltage occurred since boot | Power has been unstable at least once since startup |
| ARM frequency capping occurred since boot | CPU performance was limited at least once since startup |
| CPU throttling occurred since boot | The system overheated or power dipped at least once |
| Soft temperature limit occurred since boot | The Pi reached high temperatures at least once |


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


