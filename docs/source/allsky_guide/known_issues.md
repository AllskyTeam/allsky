---
tags:
  - Allsky Guide
  - Troubleshooting
  - Known Issues
---

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

## Other { data-toc-label="Other" }

- **Limitation**: If you have three or more cameras connected to a single Pi (very rare except while testing) including at least one RPi and one ZWO, if you switch from the current camera type to the other type which has at least two cameras, which of those cameras is used is undefined.
For example, assume you have one ZWO camera and two RPi cameras and the ZWO camera is the current one and you switch to the RPi Camera Type in the WebUI. Which RPi camera becomes current is undefined, and you'll likely see several errors about missing or empty fields.

    **Workaround**: Click on the Allsky Settings link to refresh the page.

    **Future Plans**: The Camera Type and Camera Model settings will be merged into one setting that contains both items. You will then be able to select exactly which camera to change to, which will eliminate this problem.
