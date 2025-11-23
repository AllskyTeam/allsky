# Overview
## What Are Modules

Modules are Python components that extend the functionality of Allsky. They typically fall into one of several categories:

  - **Data-enhancement modules** — These add extra information that can be used in overlays. For example, the Solar System module provides details about celestial objects such as the Moon’s position.
  - **Hardware-control modules** — These interact with external devices. A common example is the Dew Heater module, which reads sensor data and automatically adjusts the dew heater.
  - **Image-processing modules** — These operate on the captured images. Some modify the image itself (such as the Mask module), while others analyse the image to generate additional overlay data, such as the Star Count module.

## Available Pipelines (flows)
There are 5 pipelines available in Allsky.

| Pipeline | Description |
|-----|------|
| Daytime    | Used whilst Allsky is capturing images during the day      |
| Nightime    | Used whilst Allsky is capturing images during the night      |
| Day to Night    | Used when Allsky transitions from Daytime to Nighttime capture     |
| Night to Day    | Used when Allsky transitions from Nighttime  to Daytime capture      |
| Periodic    | Run periodically outside of the main Allsky capture process     |

Each pipeline can run a series of modules in sequence. By default, the Daytime and Nighttime pipelines include the core modules that load and save the captured image; these core modules cannot be removed. All other pipelines start empty. You can use the Module Manager to add additional modules to any pipeline as needed.


``` mermaid
flowchart TB
    A["Capture Image"] --> B["Remove Bad Images"]
    B --> C["Resize"] & A
    C --> D["Crop"]
    D --> E["Stretch"]
    E --> F{"Flow Type"}
    F -- Daytime Pipeline --> FDL["Load Image"]
    FDL --> FDM["Load Modules"]
    FDM --> FDR["Run Modules"]
    FDR --> FDS["Save Image"]
    FDS --> P["Create Thumb"]
    F -- Nighttime Pipeline --> FNL["Load Image"]
    FNL --> FNM["Load Modules"]
    FNM --> FNR["Run Modules"]
    FNR --> FNS["Save Image"]
    FNS --> P
    PTE["Perodic Timer"] -- Periodic Pipeline --> FPM["Load Modules"]
    FPM --> FPR["Run Modules"]
    F -- End Of Night Pipeline --> FEONM["Load Modules"]
    FEONM --> FEONR["Run Modules"]
    FEONR --> FEONCS["Create Startrails"]
    FEONCS --> FEONCT["Create Timelapse"]
    FEONCT --> FEONCK["Create Keogram"]
    FEONCK --> FEONU["Upload Images / Videos"]
    FEONU --> A
    F -- Start Of Day Pipeline --> FEODM["Load Modules"]
    FEODM --> FEODR["Run Modules"]
    FEODR --> P
    P --> Q["Create Mini Timelapse"]
    Q --> R["Upload Image"]
    R --> A
```
