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

- **Known Issue**: The Overlay Module may be disabled the first time it runs. This is due to the module having to download the JPL ephemeris data which can take some time on a slow Internet connection.
    **Workaround**: Re-enable it in the Module Manager.

    **Future Plans**: Will fix in the next release.

- **Known Issue**: The "additional modules" have been installed but they don't all appear.

    **Workaround**: Ensure the "Show Experimental" setting is enabled in the Module Manager's settings.

    **Future Plans**: Will fix in the next release.
