---
tags:
  - Allsky Guide
  - Glossary
---

# Glossary

!!! info "Core Terms"

    **Allsky**

    The main program that captures and saves images and includes the Web User Interface (**WebUI**) used to administer Allsky and parts of your Pi.

    When a page says **Allsky Software** or just **software**, it is referring to the main Allsky software running on your Pi in the `~/allsky` directory.

    **WebUI**

    The Web User Interface used to administer Allsky.

    This is where you change settings, inspect the system, view saved output, manage modules, and control how Allsky behaves.

    The WebUI is the management interface, not the public viewing interface.

    **Module**

    Code that runs during the image capture or processing pipelines.

    **Extra Module**

    A module contributed by the Allsky team or by other users that runs during the image capture or processing pipelines.

    **Overlay**

    The information or graphics drawn onto an image, such as time, date, temperature, labels, logos, or other text and visual elements.

!!! info "Viewing and Sharing"

    **Allsky Website**

    A simple web interface that can run on your Pi and/or on a remote server and displays Allsky output for viewing.

    - This is often shortened to **Website**, always with a capital `W`.
    - A **local Allsky Website** runs on the same Pi that Allsky runs on.
    - A **remote Website** runs somewhere else.
    - Allsky does not care whether the remote machine is a true datacenter server or just another computer on your network. In the documentation, both are treated as remote servers.

    **Local Website**

    An Allsky Website running on the same Pi as Allsky.

    **Remote Website**

    An Allsky Website running somewhere other than the Pi doing the image capture.

    **`public.php`**

    A simple public-facing page that can show the current image without exposing the full WebUI.

    Use this when you want to share the current image but do not want to give people access to the administration interface.

    **Live View**

    The WebUI page that shows the latest image being produced by Allsky.

    It is mainly used for monitoring the current image, checking that capture is working, and helping with tasks such as focusing.

    **Images**

    The WebUI area used to browse saved output.

    This includes saved images, timelapses, keograms, and startrails, typically grouped by date.

!!! info "Capture and Output"

    **Focus Mode**

    A special capture mode intended to make focusing easier.

    - In this mode, Allsky reduces normal processing so images can be captured and displayed as quickly as possible.
    - Images shown in Focus Mode are not treated as normal saved or uploaded production images.

    **Timelapse**

    A video created from many saved images, usually to summarize a day or night.

    A **mini-timelapse** is a shorter version intended for quick review.

    **Keogram**

    A derived image that summarizes how the sky changed over time across a night or day.

    **Startrails**

    A derived image made by combining many nighttime images to show the apparent movement of the stars.

!!! info "Backup and Restore"

    **Config backup**

    A backup that preserves how Allsky is configured.

    Use this when you want to protect settings, modules, overlays, camera-related configuration, and other operational files.

    **Images backup**

    A backup that preserves captured image data.

    Use this when you want to protect saved image folders or specific observation dates.

!!! info "Remote Systems"

    **Remote server**

    A computer Allsky uploads files to.

    It may host a Website, or it may simply store uploaded images and derived output.

    **Server**

    In the context of Allsky documentation, this usually means a **remote server**.
