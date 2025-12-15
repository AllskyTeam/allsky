---
tags:
  - Extra Module
  - Overlay Data
  - Pipeline Day
  - Pipeline Night
  - Pipeline Periodic
  - Hardware Required 
---

This module detects rain using a digital sensor.

## Rain Sensors

There are a few types of rain sensor available.

### The 'Cheap' ones
![](/assets/module_images/rain-bad.jpg)

Resistive rain sensor plates

The vast majority of low-cost rain sensors consist of a printed circuit board with exposed copper traces arranged in an interleaved pattern. When the surface is dry, the resistance between the traces is very high. When rain, drizzle, or condensation lands on the board, water bridges the traces and reduces the electrical resistance. The sensor electronics measure this change in resistance and convert it into either an analogue voltage or a digital “rain detected” signal.

The amount of conductivity depends on how much water is present and how conductive that water is. Pure rainwater has relatively high resistance, while polluted rain, mist, or water containing dust and salts conducts much better. As a result, these sensors do not measure rainfall rate or volume; they simply indicate surface wetness. Over time, the exposed copper oxidises or corrodes, which gradually changes the sensor’s response and reduces reliability.

⸻

Comparator / module behaviour

These sensors are often sold with a small interface module that includes a comparator (usually an LM393) and a potentiometer. The potentiometer sets a threshold, allowing the module to output a digital HIGH or LOW when moisture exceeds a chosen level. Many modules also expose the raw analogue signal, which represents the resistance of the wet sensor plate.

Because the comparator threshold is fixed once set, the digital output is best interpreted as a binary wet/dry indicator, not a precision measurement. Small droplets, dew, fog, or even high humidity combined with dust can be enough to trigger the output, especially if the threshold is set aggressively.

⸻

What they are actually detecting

Despite being marketed as “rain sensors”, these devices detect electrical conductivity on a surface, not rain itself. They cannot distinguish between rain, condensation, splashes, melting frost, or even a wet insect. Wind-driven rain may miss the sensor entirely, while dew forming overnight can trigger it without any rainfall occurring. This makes them unsuitable for meteorological rainfall measurement but acceptable for basic automation tasks.

⸻

Durability and accuracy limitations

Low-cost rain sensor plates are not designed for long-term outdoor exposure. Continuous wetting accelerates corrosion of the copper traces, which permanently alters the sensor’s resistance. Many users mitigate this by powering the sensor only intermittently, applying conformal coating to non-sensing areas, or replacing the plate periodically. Even with these mitigations, readings will drift over time and vary significantly between units.

!!! warning  "Warning"

    These sensors will corrode very quickly, in my usage they last arounbd 12 months before the sensor is so corroded it can no longer read moisture

### Slightly better ones

![](/assets/module_images/rain-good.jpg)


Some variants of the M152 rain sensor include an integrated heating element beneath or near the sensing surface. The heater is designed to slightly warm the sensor plate, reducing the effects of condensation, dew, frost, and light snow. By keeping the sensing surface above the ambient dew point, the heater helps prevent false rain detections that commonly occur overnight or during periods of high humidity.

⸻

Purpose and behaviour of the heater

The heater does not improve rainfall measurement accuracy or enable quantitative precipitation measurement. Instead, its primary role is to stabilise the sensor’s wet/dry behaviour by drying the sensing surface more quickly after rainfall and suppressing triggers caused by mist or condensation. When precipitation stops, the heated surface evaporates residual moisture faster than an unheated sensor, allowing the output to return to a “dry” state sooner and more consistently.

In cold conditions, the heater can also prevent ice formation and help melt light frost or snow, allowing the sensor to continue functioning when an unheated resistive sensor would remain permanently “wet.”

⸻

Electrical and thermal considerations

The heater typically operates at a higher current than the sensing circuitry and may be powered continuously or under software control. Continuous heating improves reliability but increases power consumption and accelerates long-term wear of the sensing surface. Many implementations therefore enable the heater only intermittently, such as:
	•	Cycling the heater on when wetness is detected
	•	Activating it during high humidity or low temperatures
	•	Running it at reduced duty cycles to limit corrosion and power draw

⸻

Limitations remain

Even with a heater, the M152 remains a resistive wetness sensor, not a true rain gauge. It still detects surface conductivity and cannot distinguish between rain intensity, duration, or volume. Heavy condensation combined with contamination can still trigger the sensor, and long-term exposure will gradually alter its response due to electrode degradation.


## Settings 

| Setting | Description |
|--------|-------------|
| Input Pin	| The gpio pin the detector is connected to| 
| Invert | Normally the cheap sensors are high when it's not raining and low when it is. This setting reverse that | 

## Available Variables

| Variable | Description |
|--------|-------------|
| AS_RAINSTATE | Either "Raining" or "Not Raining" |
| AS_ALLSKYRAINFLAG	| Either True if it's raining, or False if it's not |
| AS_ALLSKYRAINFLAGINT | Either 1 if it's raining, or 0 if it's not |

## Allsky Usage

Allsky can use the results of this sensor in other modules, for example in the star and meteor count modules if its raining there is little point checking for stars or meteors

## Schematics

![](/assets/module_images/rain.png){ width="100%" }


/// caption
Example using the cheaper rain sensors
///

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