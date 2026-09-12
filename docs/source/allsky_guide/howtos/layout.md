When you install Allsky, it creates its files and directories under the home directory of the user you installed it as, which is often `pi`. In most examples throughout the documentation this appears as `~/allsky`.

You do not need to understand every file in that tree to use Allsky successfully, but it is useful to know the broad layout. It helps when you are following troubleshooting steps, making backups, browsing saved images, or simply trying to understand what Allsky has stored on the Pi.

This page is a practical guide to the main files and directories you are likely to come across.

## Typical layout { data-toc-label="Typical Layout" }

A typical Allsky installation looks roughly like this:

```text
allsky
├── assets
├── bin
├── config
├── darks
├── config_repo
├── html
├── images
│   └── 20251117
│       ├── keogram
│       ├── keolapse
│       ├── startrails
│       └── thumbnails
├── notification_images
├── scripts
├── src
└── tmp
    ├── aborts
    ├── flowtimings
    ├── lftp_cmds
    ├── logs
    └── __pycache__
```

Your installation may not match this exactly. Some directories only appear when a feature is enabled or has been used, and others may vary slightly between versions. The point of the tree above is to show the general structure, not to define an exact list that every system must have.

## Directories you will most likely use { data-toc-label="Main Directories" }

The most important directories for normal users are `config`, `html`, `images`, `darks`, and `tmp`. <!--If you understand those, you already understand most of what matters in everyday use.-->

### `config` { data-toc-label="config" }

This directory contains Allsky's configuration files.

Some of the most important items here are:

- `settings.json`, which holds most of the settings you change on the **Allsky Settings** page in the WebUI.
- The `modules` directory, which contains configuration for the **Module Manager**.
- The `overlay` directory, which contains configuration for the **Overlay Editor**.
- `cc.json` and `options.json`, which are automatically created based on your camera and control which settings appear in the WebUI, along with their valid ranges and defaults.

If you change camera type or model through the WebUI, some of these files are regenerated automatically.

If you use a remote Allsky Website, you may also see `remote_configuration.json` here. That file is uploaded to the remote Website when you update it through the WebUI's **Editor** page.

For most users, the important point is simple: this is where Allsky's main configuration lives. If you are backing up the system, moving to a new SD card, or troubleshooting settings, this directory matters a great deal.

### `html` { data-toc-label="html" }

This directory contains the WebUI and the files for the local Allsky Website.

It also includes the documentation that can be viewed through the WebUI. If you are told to look for WebUI files, PHP pages, or local Website configuration, this is the area you will usually end up in.

The WebUI itself does not have one single user-editable configuration file in the same way that `settings.json` controls Allsky. However, the local and remote Websites do have configuration files that can be changed through the WebUI editor.

### `images` { data-toc-label="images" }

This is where Allsky stores captured output, including:

- saved images
- timelapse videos
- keograms
- startrails
- thumbnails related to those outputs

Allsky stores these by date, with each day's output in a directory named `YYYYMMDD`, for example `20260710`.

If you are looking for a specific image, checking disk usage, copying output off the Pi, or removing old captures manually, this is the directory you will work with.

!!! note
	If you moved the "images" folder to a different location, e.g., a USB thumb drive, you won't see the directory in `~/allsky`.

### `darks` { data-toc-label="darks" }

This directory stores optional dark frames. Dark frames are used to reduce visible sensor noise in images. If you are not using dark frames, this directory may be empty or unimportant to you. If you are using them, this is where they are kept.  You normally won't do anything with this directory.

### `tmp` { data-toc-label="tmp" }

This directory holds temporary files used while Allsky is running and often contains:

- log files
- temporary working files
- intermediate output used during processing
- other short-lived files created by scripts and helper tools

The contents of `tmp` are not meant to be permanent, and this directory is cleared after a reboot. When you are debugging a problem, however, this directory becomes much more important because many logs and temporary traces appear here.

## Other directories you may notice { data-toc-label="Other Directories" }

The rest of the installation tree is still useful to understand. You should not modify these directories unless told so by the Allsk Team.

### `assets` { data-toc-label="assets" }

This mainly contains files used in building or presenting Allsky, including assets used in documentation and development.

### `bin` { data-toc-label="bin" }

This contains compiled binary programs used by Allsky.

For example, this is where the camera capture programs such as `capture_RPi` and `capture_ZWO` live after they have been built. These are central to how Allsky actually captures images.

### `config_repo` { data-toc-label="config_repo" }

This holds template versions of configuration files. During installation, and sometimes during upgrades, Allsky uses these templates to create or refresh files in the `config` directory.

### `notification_images` { data-toc-label="notification_images" }

This contains the images Allsky can display for status or notification purposes, such as startup or placeholder images.

Depending on your image format, you may see both `.jpg` and `.png` files here.

### `scripts` { data-toc-label="scripts" }

This contains the shell scripts and helper programs Allsky uses while it is running.

Some of these scripts are also useful for advanced troubleshooting. For example, certain upload or generation scripts (like `generateForDay.sh`) can be run manually when you are debugging a specific part of the system.

### `src` { data-toc-label="src" }

This contains the source code for compiled parts of Allsky, including capture programs and utilities such as the keogram and startrails generators.

### `venv` { data-toc-label="venv" }

This directory contains Python virtual environment data used by Allsky.

## Important files in the top level { data-toc-label="Top-Level Files" }

Alongside the directories, there are several top-level files worth knowing about, although you should not change them unless directed to by the Allsky Team.

### `allsky.sh` { data-toc-label="allsky.sh" }

This is the main script used when Allsky starts. It launches the appropriate capture program and coordinates the normal runtime flow.

### `env.json` { data-toc-label="env.json" }

This file stores private or sensitive values such as usernames, passwords, and similar credentials used by uploads or integrations.

It is kept separate from `settings.json` so that the main settings file can be shared more safely without exposing secrets. If you ever send configuration files to someone for help, this is one of the files you should **treat with care**.

The values in `env.json` are managed through the WebUI.

### `install.sh` { data-toc-label="install.sh" }

This is the installation and upgrade script for Allsky.

### `LICENSE` { data-toc-label="LICENSE" }

This contains the Allsky software license.

### `Makefile` { data-toc-label="Makefile" }

This is used during build and installation steps to create binaries, prepare directories, and perform other setup tasks.

### `README.md` { data-toc-label="README.md" }

This is the repository readme file. Most users will read the documentation through the WebUI or the documentation site instead, but this file still provides useful overview information.

### `remoteWebsiteInstall.sh` { data-toc-label="remoteWebsiteInstall" }

This script is used to prepare a remote Allsky Website. It should only be used when you are following the remote Website installation instructions.

### `upgrade.sh` { data-toc-label="upgrade.sh" }

Do not use this unless documentation specifically tells you to. It is incomplete and intended for developer testing rather than normal upgrades.

### `uninstall.sh` { data-toc-label="uninstall.sh" }

This is a very basic uninstall script. It exists, but it should not be thought of as a polished full removal tool.

### `variables.sh` { data-toc-label="variables.sh" }

This file defines many of the variables used by Allsky scripts, including the locations of files and directories.

Advanced users who want to override locations can create `~/allsky/config/uservariables.sh`.

One useful detail is that although it ends in `.sh`, it is not meant to be executed directly. It is sourced by other scripts.

### `version` { data-toc-label="version" }

This file contains the Allsky version currently installed.

## A practical way to think about the layout { data-toc-label="Practical View" }

If you want a simple mental model, think of the directory structure like this:

- `config` is where Allsky remembers what to do.
- `images` is where Allsky stores what it produced.
- `tmp` is where Allsky keeps short-lived working files and logs.
- `html` is where the WebUI and local Website live.
- `scripts`, `bin`, and `src` are mostly the software itself.

That is enough to get you through most backup, troubleshooting, and file-management tasks without needing to memorise the entire tree.
