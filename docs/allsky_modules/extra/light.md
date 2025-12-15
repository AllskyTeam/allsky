---
tags:
  - Extra Module
  - Pipeline Day
  - Pipeline Night
  - Pipeline Periodic
  - Hardware Required 
---

This module produces a Lux level and estimation of Bortle value from various light sensors. The following sensors are supported

- TSL2561
- TSL2591
- LTR390

## Lux
Lux (lx) is the standard unit used to measure illuminance, which means how much light actually falls on a surface.

It describes how bright something appears, not how much light a source emits.

| Environment              | Typical Lux (lx)        | Notes                                          |
|--------------------------|--------------------------|------------------------------------------------|
| Moonless dark sky        | 0.001 – 0.002            | Near Bortle 1; extremely dark                  |
| Starlight only           | ~0.0001                  | Human eye barely detects detail                |
| Quarter Moon             | ~0.02                    | Soft illumination                              |
| Full Moon                | ~0.25                    | Clearly visible landscape                      |
| Urban night (street lit) | 10 – 20                  | Typical suburban streetlights                  |
| Office lighting          | 300 – 500                | Standard working environment                   |
| Overcast daylight        | ~1,000                   | Bright but no direct sun                       |
| Direct sunlight          | 100,000+                 | Can reach 120,000–130,000 lx at noon           |

## Bortle Scale
The Bortle Scale is a 9-level classification system used to describe night-sky brightness and how much light pollution affects your ability to see stars, the Milky Way, and deep-sky objects.

It was created by John E. Bortle in 2001 and is widely used by astronomers to compare observing sites.

| Bortle Class | Sky Type                     | Milky Way Visibility                     | Naked-Eye Limit (mag) | Notes                                               |
|--------------|------------------------------|-------------------------------------------|------------------------|-----------------------------------------------------|
| 1            | Excellent dark-sky           | Extremely bright; may cast shadows        | 7.6+                   | No light pollution; zodiacal light and airglow visible |
| 2            | Truly dark                   | Very bright and detailed                  | 7.1–7.5               | Minimal light domes                                 |
| 3            | Rural                        | Bright overhead, fades near horizon       | 6.6–7.0               | Zodiacal light visible; slight light domes          |
| 4            | Rural/Suburban transition    | Visible but washed out                    | 6.1–6.5               | Noticeable skyglow; reduced contrast                |
| 5            | Suburban                     | Faint, little structure                   | 5.6–6.0               | Grey/amber sky; faint DSOs weak                     |
| 6            | Bright suburban              | Barely visible, if at all                 | 5.1–5.5               | Significant skyglow                                 |
| 7            | Suburban/Urban transition    | Not visible                               | 4.6–5.0               | Only bright constellations visible                  |
| 8            | City                         | Not visible                               | 4.1–4.5               | Very few stars visible                              |
| 9            | Inner city                   | Not visible                               | <4.0                  | Only brightest stars/planets visible                |

### Calculating Bortle
Converting Lux to the Bortle scale is not possible. The Bortle scale describes sky quality as seen by a human observer, while lux measures illuminance on a surface.
They are related to sky brightness, but they measure completely different things.

The values the module calculates are estimates based upon the table below

| Bortle Class | Sky Description                | Typical Night-Sky Lux (lx)     | Notes                                             |
|--------------|--------------------------------|----------------------------------|---------------------------------------------------|
| 1            | Excellent dark-sky             | 0.0010 – 0.0020                  | Natural sky brightness; extremely dark            |
| 2            | Truly dark                     | 0.0015 – 0.0030                  | Very faint skyglow only                           |
| 3            | Rural                          | 0.0020 – 0.0040                  | Slight light domes on horizon                     |
| 4            | Rural/Suburban transition      | 0.0040 – 0.0100                  | Noticeable skyglow                                |
| 5            | Suburban                       | 0.0100 – 0.0300                  | Sky brightening clearly visible                   |
| 6            | Bright suburban                | 0.0300 – 0.0800                  | Milky Way usually invisible                       |
| 7            | Suburban/Urban transition      | 0.0800 – 0.1500                  | Strong skyglow; only brightest stars visible      |
| 8            | City                           | 0.1500 – 0.3000                  | Very few stars visible                            |
| 9            | Inner city                     | 0.3000 – 1.0000+                 | Bright orange/grey sky; deep-sky impossible       |

## Settings

### TSL2561

| Setting | Description |
|--------|-------------|
| I2C Address | The I2C address of the sensor, leave blank for the default |
| Gain | The gain to use |
| Integration Time | The time taken to take a reading |

### TSL2591

| Setting | Description |
|--------|-------------|
| I2C Address | The I2C address of the sensor, leave blank for the default |
| Gain | The gain to use |
| Integration Time | The time taken to take a reading |

### LTR390

| Setting | Description |
|--------|-------------|
| I2C Address | The I2C address of the sensor, leave blank for the default |
| Gain | The gain to use |
| Sensor Resolution  | The resolution of the internal DAC, if in doubt leave at default |
| Gain | The gain to use |
| Delay | Delay between measurements, only really useful for power saving |

## Available Variables
The module generates the following variables

| Variable | Description |
|--------|-------------|
| AS_LUX | The measure Lux level |
| AS_BORTLE | The estimated Bortle value |

## Schematics

![](/assets/module_images/light.png){ width="100%" }


/// caption
Example using the tsl2561 and tsl2591
///

## Protecting The Sensors

These sensors are delicate and cannot be exposed to the elements, however they do need clear access to the sky to be able to measure the light levels. You will require some way to protect the sensor

| Material                      | Suitability | Optical Performance                | Pros                                              | Cons                                              | Notes                                             |
|-------------------------------|-------------|------------------------------------|---------------------------------------------------|---------------------------------------------------|--------------------------------------------------|
| **PTFE (Teflon) film/sheet**  | ⭐⭐⭐⭐⭐ Best | Excellent (90–95% transmission)    | Waterproof, UV-resistant, stable diffusion        | Slight attenuation if too thick                   | Best overall for outdoor light sensors; use thin PTFE |
| **Optical-grade Acrylic (PMMA)** | ⭐⭐⭐⭐      | Excellent (~92% transmission)      | Clear, durable, good for windows or domes         | Brittle under impact; needs sealing               | Ideal as a protective clear cover                 |
| **Polycarbonate (Lexan)**     | ⭐⭐⭐⭐      | Very good                          | Extremely tough, weather-resistant                | Slight colour shift; can yellow over years        | Good when durability matters most                 |
| **Polyethylene (PE) film**    | ⭐⭐         | Moderate                            | Cheap, flexible, waterproof                       | UV degradation; inconsistent optical quality       | OK for temporary use, not long-term              |
| **Glass**                     | ⭐          | Variable (depends on type)         | Hard, scratch-resistant                           | Absorbs IR/UV; heavy; condensation issues          | Not recommended unless using optical-grade glass |
| **Silicone sealant (over sensor)** | 🚫 No | Poor                               | Waterproof                                        | Strong spectral distortion; fogging; uneven layer | Do not apply directly over sensor                 |
| **3D-printed plastics (PLA/PETG)** | 🚫 No | Poor                               | Easy to fabricate                                 | Not optically clear; scatter light; UV issues     | Not suitable as a light-transmitting cover        |

## Available in

=== "Pipelines available In"
    
    <div class="grid cards" markdown>

    -   :fontawesome-solid-sun:{ .lg .middle } __Daytime__

        ---

          - The Day time pipeline

    -   :fontawesome-solid-moon:{ .lg .middle } __Nighttime__

        ---

          - The Night time pipeline

    </div>