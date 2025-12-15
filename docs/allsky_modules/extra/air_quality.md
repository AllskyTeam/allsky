Monitor air quality using a pms5003, pms7003 or pmsa003. All three of thsese sensors provide digital particulate matter measurements and are best suited for trend monitoring and relative air quality assessment rather than regulatory-grade measurements. Proper airflow design, dust protection, and periodic cleaning are important to maintain long-term accuracy regardless of the model used.

**PMS5003**

The PMS5003 is a widely used laser-based particulate matter (PM) sensor manufactured by Plantower. It measures airborne particles by drawing air through an internal chamber and using laser scattering to detect particle concentrations. The sensor reports mass concentrations for PM1.0, PM2.5, and PM10, as well as particle counts across multiple size bins. Data is provided digitally over a UART interface, making the PMS5003 easy to integrate with microcontrollers such as the ESP32, Raspberry Pi, and Arduino. Due to its reliability, availability, and extensive community support, the PMS5003 is commonly used in indoor air quality monitors, weather stations, and DIY environmental sensing projects.

**PMS7003**

The PMS7003 is functionally very similar to the PMS5003, offering laser-based detection of PM1.0, PM2.5, and PM10 concentrations along with particle number counts. The primary difference lies in its form factor and airflow design; the PMS7003 is thinner and slightly larger in footprint, which can make it easier to integrate into slim enclosures or wall-mounted devices. Like the PMS5003, it communicates via UART and provides real-time particulate measurements suitable for indoor and outdoor applications. Performance and accuracy are comparable between the two models, so the PMS7003 is often selected based on mechanical design requirements rather than sensing capability.

**PMSA003**

The PMSA003 is a compact, low-profile particulate matter sensor designed for space-constrained applications. It uses the same laser scattering measurement principle as other Plantower sensors but is optimised for reduced size and power consumption. The PMSA003 reports PM1.0, PM2.5, and PM10 mass concentrations and is typically used in consumer devices, portable monitors, and embedded systems where enclosure depth is limited. Despite its smaller form factor, it maintains good measurement consistency for general air quality monitoring, though it may be slightly more sensitive to airflow and placement compared to larger models like the PMS5003 or PMS7003.

## Settings

| Setting | Description |
|--------|-------------|
| Serial Port | The serial port the device is connected to. Only available serial ports will be listed |

!!! warning  "Serial Ports"

    If no serial ports are displayed in the drop down then the sensor has not been detected. Please check the sensors connections

## Available Variables

| Variable | Description |
|--------|-------------|
| AS_PM1_0CF1 | PM1.0 concentration in Î¼g/m3 (corrected to standard conditions) |
| PM2_5CF1 | PM2.5 concentration in Î¼g/m3 (corrected to standard conditions) |
| PM10CF1 | PM10 concentration in Î¼g/m3 (corrected to standard conditions) |
| PM1_0 | PM1.0 concentration in Î¼g/m3 (under atmospheric conditions) |
| PM2_5 | PM2.5 concentration in Î¼g/m3 (under atmospheric conditions) |
| PM10 | PM10 concentration in Î¼g/m3 (under atmospheric conditions) |
| N0_3 | number of particles with diameter greater than 0.3 Î¼m (in 100 ml of air) |
| N0_5 | number of particles with diameter greater than 0.5 Î¼m (in 100 ml of air) |
| N1_0 | number of particles with diameter greater than 1.0 Î¼m (in 100 ml of air) |
| N2_5 | number of particles with diameter greater than 2.5 Î¼m (in 100 ml of air) |
| N5_0 | number of particles with diameter greater than 5.0 Î¼m (in 100 ml of air) |
| N10 | number of particles with diameter greater than 10 Î¼m (in 100 ml of air) |
| AS_AQI | Air quality |
| AS_AQI_TEXT | Human readable air quality |

## Air quality

To determine the air quality first the maximum of AS_PM2_5 and AS_PM10 is taken, then the following table is used

| Range | Air Quality |
|--------|-------------|
| 0 - 49 | Good |
| 50 - 99 | Moderate |
| 100 - 149 | Unhealthy for Sensitive Groups |
| 150 - 199 | Unhealthy |
| 200 - 299 | Very Unhealthy |
| 300+ | Hazardous |

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