# Introduction

!!! danger  "This is an Advanced User section"

    This section of the documentail details how you can extend Allsky. Most of the subjest covered require an understanding of development using Python.

The Allsky system is designed to be modular, extensible, and developer-friendly — allowing you to add new capabilities without modifying the core software.
Modules are self-contained units that integrate seamlessly with the Allsky environment, providing everything from hardware drivers (I²C sensors, focusers etc) to data processors (star counting, meteor detection, image overlays, AI classification).

By developing modules, you can easily:

  - Extend Allsky’s functionality without touching its core codebase.
  - Integrate custom hardware, APIs, or image-processing pipelines.
  - Add new graphs, data outputs, or automation routines.
  - Reuse shared features like configuration management, logging, and database access.

The Allsky Module SDK provides ready-made helpers for:

  - Logging and debugging — integrated with the main Allsky log system.
  - Configuration management — read and write module-specific settings safely.
  - Database access — use ALLSKYDATABASEMANAGER for structured data storage.
  - Environment discovery — access paths, devices, and runtime state from environment variables.
  - Graph and UI integration — register module outputs as live charts, overlays, or dashboard widgets.

With these tools, creating a new module becomes as simple as defining its purpose, implementing your logic, and declaring how it interacts with the rest of the system.
Whether you’re adding a temperature sensor, experimenting with meteor detection algorithms, or building a smart autofocus routine — the Allsky module system provides a consistent, safe, and maintainable framework for innovation.

Allsky ships with a core set of modules, the exta modules when installed extend this functionality.
