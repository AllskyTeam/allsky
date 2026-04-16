!!! danger "Before you install"

    Your camera must be connected to the Raspberry Pi before you install Allsky.

    If you are using a Raspberry Pi camera, check that the operating system can see it:

    ```bash
    rpicam-still --list-cameras
    ```

    If camera `0` appears in the list, the camera is visible and Allsky should be able to use it.

    Some non-Raspberry Pi cameras need extra software, drivers, firmware, or operating system changes before they can be used. If that applies to your camera, follow the camera vendor's instructions first.

    The `rpicam-still` command must be run as the user you configured when you created the SD card image. If you created a different user later, add that user to the `video` group first:

    ```bash
    sudo usermod -aG video USERNAME
    ```

    Replace `USERNAME` with the account you actually use on the Pi.

# Installing Allsky

Installing Allsky is usually straightforward, but it goes much more smoothly if a few basic things are already in place. This page walks through the normal installation process, covers what to do if an older copy of Allsky is already present, and explains the main prompts you are likely to see during installation.

For most users, the overall process is simple: prepare the Pi, make sure the camera and network are working, download the Allsky source, run the installer, then complete the first-time setup in the WebUI. None of those steps is especially difficult on its own, but it is worth doing them in order so that you are not trying to diagnose several unrelated problems at once.

### Before Installing

Before you install Allsky for the first time, make sure the Pi itself is in a sensible starting state.

The Raspberry Pi should already be running Raspberry Pi OS. In most cases, the Desktop version is recommended because it tends to make general setup and troubleshooting easier, especially while you are still getting the system working. Headless setups are absolutely possible, but if this is your first installation the Desktop version usually gives you a smoother starting point.

The Pi should also have a working Internet connection. A wired network connection is preferable if you can use one, because it is generally faster and more reliable than Wi-Fi during installation. This matters more than it may first appear. The installer may need to fetch packages, update components, and compile software, and that is all easier when the connection is stable. If you are using Power over Ethernet, that can make deployment especially neat because you only need one cable to the Pi.

You also need `git` installed:

```bash
sudo apt-get install git
```

!!! tip "A reliable installation starts with a reliable Pi"

    If the camera is not detected, the network is unstable, or the Pi itself is only partly configured, it is better to fix that first and install Allsky afterwards. Allsky depends on those pieces working properly, so installing on top of a half-configured system tends to create confusing failures later.

### If Allsky Is Already Installed

If Allsky is already on the Pi, stop it first:

```bash
sudo systemctl stop allsky
cd
```

After that, decide what you want to do with the existing installation. There are three common choices, and they each mean something slightly different.

=== "Keep old settings"

    If you want to upgrade and preserve the old installation so its settings can be reused, rename the directory:

    ```bash
    mv allsky allsky-OLD
    ```

    During installation, you will be asked whether you want to use the settings from `allsky-OLD`.

    This is the safest upgrade path for most users. Nothing is deleted, and you still have the earlier installation available if you need to refer back to it.

=== "Archive old version"

    If you want to keep the old installation as a reference but do **not** want its settings reused automatically, rename it differently:

    ```bash
    mv allsky allsky-SAVED
    ```

    This keeps everything, but the new installation will behave like a fresh setup. You will need to configure it again, and the new installation will not automatically use your earlier images, timelapses, darks, or settings. At some point you will probably want to remove `allsky-SAVED` to reclaim disk space.

=== "Delete old version"

    If you are completely sure you do not want the old installation, you can remove it:

    ```bash
    rm -fr allsky
    ```

    This is destructive. Images, darks, configuration files, and other saved data in that directory are lost. Only choose this option if you are certain that you do not need anything from the previous installation.

!!! warning "Be deliberate here"

    If you are unsure which option to choose, renaming the old directory is almost always better than deleting it. Disk space is usually easier to recover later than lost configuration or lost data.

### Downloading Allsky

Allsky is installed into `~/allsky`. With the exception of some system-level files created during setup, that directory becomes the main home for the installation.

Clone the repository like this:

```bash
cd
git clone --depth=1 --recursive https://github.com/AllskyTeam/allsky.git
```

This can take a little while depending on the Pi model, storage speed, and network speed. When it finishes, the new `allsky` directory will normally be around 150 MB.

You should see output broadly similar to this:

```text
Cloning into 'allsky'...
remote: Enumerating objects: 891, done.
...  more commands here
Receiving objects: 100% (891/891), 46.25 MiB | 17.82 MiB/s, done.
Resolving deltas: 100% (100/100), done.
Submodule 'src/sunwait-src' (https://github.com/risacher/sunwait) registered for ...
Cloning into '/home/pi/allsky/src/sunwait-src'...
remote: Enumerating objects: 119, done.
...  more commands here
Submodule path 'src/sunwait-src': checked out '151d8340a748a4dac7752ebcd38983b2887f5f0c'
```

### Running The Installer

Once the source has been downloaded, start the installer:

```bash
cd ~/allsky
./install.sh
```

The installer may ask a number of questions. In most cases, accepting the defaults is the best choice unless you already know that your setup needs something different. If you are upgrading from an earlier Allsky installation, you will usually see fewer prompts because some information is already known.

/// details | Common installation prompts

#### Host name

If the Raspberry Pi still has its default host name, you may be asked to choose a new one. The default suggestion is usually `allsky`. If you have more than one Pi on the same network, they must all have unique names. A test machine might be named `allsky-test`, for example.

#### Locale

You may be asked which locale to use. This affects details such as the decimal separator in log output. The development environment uses `en_GB.UTF-8` by default.

#### Swap space

The installer may offer to add swap space. This effectively gives the system more working memory, and that can be important on smaller Pis. Insufficient swap space is one of the more common causes of timelapse creation problems.

#### Temporary directory in memory

You may be asked whether `~/allsky/tmp` should be placed in memory rather than on the SD card. This directory is used heavily for temporary files, and keeping it in memory can significantly reduce SD card writes. That generally improves card longevity.

#### Latitude and longitude

On a new installation, the installer will ask for the location. In many cases it can suggest defaults based on the network environment. These values matter because Allsky uses them for sunrise, sunset, and other time-dependent behaviour.

#### Reboot

If installation changes require a reboot, the installer will ask whether the Pi should be rebooted when it finishes. If you choose not to reboot at that point, remember that Allsky will not start properly until the reboot has happened.

///

If the installer tells you that there are post-installation actions to complete, do those before expecting the system to run normally. The WebUI will also remind you about required follow-up actions if any remain outstanding.

!!! info "Installation time"

    The first installation can take a surprisingly long time, especially on older Pis or systems that need many packages installed. An hour is not impossible. Later installs and upgrades are usually much faster.

### After Installation

Once installation finishes, reboot the Pi if you were told to do so. After that, open the WebUI and complete the initial configuration.

Use one of the following in a web browser:

- `http://allsky.local`
- `http://allsky.localhost`

The default login is:

- Username: `admin`
- Password: `secret`

!!! danger "Remote access"

    If your Pi can be reached from the Internet, change the WebUI username and password immediately using the **Change Password** link. The defaults are only suitable for first-time local setup.

From there, go to **Allsky Settings**. If the WebUI shows a message saying Allsky still needs to be configured or reviewed, do that before trying to start it. When you are ready, click the blue action button. Depending on the state of the installation, it may say something like [Save Changes](#){ .md-button .md-button--small } or [Configuration Done; Start Allsky](#){ .md-button .md-button--small }.

That step is important. Installation alone does not always mean the system is ready to begin capturing immediately. The WebUI is where you confirm the configuration and allow Allsky to start with a valid setup.

### Starting And Stopping Allsky

Allsky is configured to start automatically when the Raspberry Pi boots. If you want to control that behaviour manually, use `systemctl`.

=== "Enable auto-start"

    ```bash
    sudo systemctl enable allsky
    ```

    This makes Allsky start automatically whenever the Pi boots.

=== "Disable auto-start"

    ```bash
    sudo systemctl disable allsky
    ```

    This prevents Allsky from starting automatically on boot.

When you want to control the service manually, these are the commands you will use most often:

```bash
sudo systemctl start allsky
sudo systemctl stop allsky
sudo systemctl restart allsky
sudo systemctl status allsky
```

`restart` is effectively the same as doing a stop followed by a start.

!!! tip "Save yourself some typing"

    If you do this often, add shell aliases to `~/.bashrc`, for example:

    ```bash
    alias start='sudo systemctl start allsky'
    alias stop='sudo systemctl stop allsky'
    alias restart='sudo systemctl restart allsky'
    alias status='sudo systemctl status allsky'
    ```

    Then open a new terminal session, or reload the shell, and you can use the shorter commands directly.

### Troubleshooting From The Terminal

If Allsky is not behaving as expected, running it directly from a terminal is often one of the quickest ways to see what is wrong. Starting it manually gives you debug output in the terminal window, which is much easier to work with than guessing from symptoms alone.

To do that, first stop the service version and then start Allsky manually:

```bash
sudo systemctl stop allsky
cd ~/allsky
./allsky.sh
```

This is often the best first step when something appears broken but the WebUI does not make the cause obvious. Errors and warnings that would otherwise be hidden inside logs become visible immediately in the terminal.

If you are running a desktop environment such as Pixel, Mate, or LXDE, or if you are connected through remote desktop or VNC, you can add the `--preview` option:

```bash
./allsky.sh --preview
```

That opens a preview window showing the images currently being saved. It can be very useful while you are testing camera operation, exposure behaviour, or general image flow.

!!! note

    Manual terminal startup is mainly a troubleshooting technique. For normal use, Allsky is intended to run as a service under `systemctl`.
