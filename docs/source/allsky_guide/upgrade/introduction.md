# Upgrade Notes

This section contains important information for people upgrading an existing Allsky installation. The pages here are not a replacement for the normal installation instructions or the changelog. They are version-specific notes that highlight changes which may affect an existing setup when you move from one Allsky release to another.

In most cases, an Allsky upgrade is designed to preserve your existing configuration, images, overlays, modules, Website settings, and other local customisations. However, some releases introduce changes that need a little more care. A setting may have moved, a module may have replaced an older feature, an overlay variable may have been renamed, or a workflow may have changed enough that you should check it after the upgrade has completed.

The individual pages in this section are linked to the version you are upgrading **to**. For example, if you are upgrading to a release called `v2025.05.01`, read the upgrade notes for `v2025.05.01` before you start the upgrade. Those notes describe anything specific to that destination version that deserves your attention.

!!! warning "Read the notes for the version you are upgrading to"

    Upgrade notes are organised by target version, not by the version you are upgrading from.

    If your current Allsky installation is several releases behind, you should read the notes for each relevant version between your current release and the release you are installing. This is especially important if you have customised overlays, added your own scripts, installed optional modules, changed Website files, or adjusted settings outside the normal WebUI.

## What these pages are for { data-toc-label="Purpose" }

The upgrade notes are intended to call out changes that may need action, review, or a little extra understanding during an upgrade.

They may include information about:

- configuration values that have changed meaning or have been replaced,
- features that have moved into modules,
- older settings that cannot be migrated automatically,
- overlay fields or variables that may need updating,
- WebUI changes that affect where you find existing tools,
- script locations or file locations that are now handled differently,
- manual checks you should perform after the upgrade,
- and known upgrade behaviours that are worth understanding before you start.

Not every release will need detailed upgrade notes. Some releases contain mostly fixes, internal improvements, or changes that are handled automatically by the installer. When a release does need special attention, the relevant page in this section should explain what changed, why it matters, and what you should do about it.

## How to use this section { data-toc-label="Using this section" }

Before upgrading, identify the version you are planning to install. Then open the page for that version and read it before running the upgrade. This is the best time to spot anything that might affect your installation, because you can make backups, note current settings, or prepare for manual changes before the system is altered.

After the upgrade has completed, return to the same page and work through any follow-up checks. Some changes only matter once the new version is running. For example, you may need to open a module, confirm that an overlay still uses the right variables, check that a script is in the correct directory, or verify that a setting has migrated as expected.

If you are upgrading across more than one release, do not assume that only the newest notes matter. A later version may include everything needed for the software to run, but the documentation for earlier target versions may still describe changes that affect your old configuration. Reading the intervening notes gives you a clearer picture of what has changed between your current installation and the version you are moving to.

