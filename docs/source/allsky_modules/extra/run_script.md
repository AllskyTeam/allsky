---
tags:
  - Extra Module
  - Pipeline Day
  - Pipeline Night
  - Pipeline Periodic
---

This module allows you to run a script. This can be useful if you want to perform custom actions. 

Be careful when running a script in the day or night time pipelines as the time your script takes to run will affect the time duration between captured images. Ideally only use this module in the periodic pipeline

## Settings

| Setting | Description |
|--------|-------------|
| File Location | The full path to the script to run, this must be on the local Pi |
| Use Shell | If enabled a full bash shell will be used to run the script |

!!! danger  "Using Shells"

    Only enable the 'Use Shell' option if you full undserstand th eimplications of running a script in a shell. 99% of scripts will NOT require this.

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