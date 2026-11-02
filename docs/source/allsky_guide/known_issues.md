This page lists known issues and limitations with the current Allsky release. Workarounds and plans to address the items, if known, are also given.

## Image Capture { data-toc-label="Image Capture" }

- **Limitation** (ZWO only): When using the default ZWO Exposure Method of Snapshot, Auto Gain and Auto White Balance do not work.
    
    **Workaround:** Auto Gain should normally not be used since it conflicts with the Allsky Auto Exposure algorithm.
    
    If you need Auto White Balance, try a different ZWO Exposure Method.
    
    **Future Plans**: None.

## Overlays { data-toc-label="Overlays" }

- None

## Modules { data-toc-label="Modules" }

- **Limitation**: Modules can only run once per flow, e.g., once per image, once per day/night transition, etc.

    **Workaround**: None

    **Future Plans**: Will change in a future release.

## Charts

- **Bullseye**: Charts will **NOT** work on Bullseye due to outdated system software. We strongly recommend that you upgrade from Bullseys
