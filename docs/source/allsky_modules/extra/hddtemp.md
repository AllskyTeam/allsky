---
tags:
  - Extra Module
  - Pipeline Day
  - Pipeline Night
  - Pipeline Periodic  
  - Hardware Required 
---

This module uses SMART (Self-Monitoring, Analysis and Reporting Technology) to monitor the temperature of a hard drive.

SMART is a diagnostic and monitoring system used by HDDs and SSDs to track internal health conditions. The drive keeps a set of counters, error logs, temperature records, and performance measurements. These indicators help the drive (and the operating system) detect when the hardware is starting to fail. The goal of SMART is not just to report current problems, but to predict future failure, giving users time to back up data before the drive becomes unusable.

Although both HDD's and SSD's use SMART, their behaviours differ:

  - HDDs mostly fail due to mechanical wear, surface defects, and bad sectors. SMART is excellent at predicting these because they develop gradually.
  - SSDs fail due to flash wear, controller issues, and exhausted write cycles. SMART tracks wear levels and total writes, but SSDs sometimes die suddenly without SMART warnings due to controller failure. Still, wear attributes are reliable indicators of overall health.


!!! warning  "Its not perfect"

    SMART is useful, but not perfect. Mechanical parts can fail suddenly without warning, and some manufacturers hide certain attributes. SMART is very good at predicting gradual failures—like increasing bad sectors—but cannot reliably predict sudden electrical failures, controller failures, or catastrophic mechanical damage. That said, if SMART reports a warning, you should assume the drive is at high risk of imminent failure and back up immediately.

    SMART is available on SSD's and even NVME drives but the implementation is sporadic. It is NOT available for SD cards

Whilst SMART prvides a lot of data this module is intended to only provide the temperature of the HDD or SSD

The module will attempt to read the temperature from all connected drives

## Settings
The following settings are available in the module

### Fans 1 and 2 tabs

| Setting | Description |
|--------|-------------|
| Use Colour | If enabled the data for the overlay will be coloured based upon the settings below |
| Ok Temp | At or below this temperature it is considered ok |
| Ok Colour | If 'Use Colour' ie enabled this colour will be used when the temperatur is ok |
| Bad Colour | If 'Use Colour' ie enabled this colour will be used when the temperatur is not ok |

## Charts

A variety of charts are available, see the chart manager for details

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