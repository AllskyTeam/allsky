!!! danger  "Before you install"
    Your camera must be connected to the Pi prior to installation.
    If you have an RPi camera, run the following to make sure the camera can be seen by Allsky:

    ```rpicam-still --list-cameras```

    If camera number 0 (the first camera) is in the list, you're good to go.
    Note that some non-Raspberry Pi brand cameras may need special software installed and/or operating system configuration changes - read the camera manual.


### Before installing
The following needs to be done prior to installing Allsky the first time on your Pi:

- If this is a new Pi, you'll need to install the Raspberry Pi Operating System (OS)   on it. We recommend installing the Desktop version of Pi OS.
- Make sure your Pi has a working [Internet connection](https://www.raspberrypi.com/documentation/computers/configuration.html)  . Use a wired LAN connection if possible - it's faster and more reliable than a Wi-Fi connection. If you use Power over Ethernet (PoE)   you can run a single ethernet cable to your Pi.
- Ensure git is installed:  
  ```sudo apt-get install git```

### If Allsky is installed
If Allsky already exists on your Pi, stop it:

```
sudo systemctl stop allsky
cd
```

then perform one of these steps:

- To upgrade the old version and keep its settings:  
  ```mv  allsky  allsky-OLD```  
  During installation you will be asked if you want to use the settings from allsky-OLD.  
  **Nothing is lost with this option.**


- To archive the old version but not use it:  
  ```mv  allsky  allsky-SAVED```  
  **Nothing is lost** with this option but after installation you'll need to re-enter all your settings and the new version won't have any of your prior images, timelapses, etc. At some point you'll want to delete the allsky-SAVED directory to free up its disk space.

- To delete the old version - only select this option if you're sure you don't want any saved images, darks, and configuration settings:  
  ```rm  -fr  allsky```  
  ***Everything is lost*** with this option so after installation you'll need to re-enter all your settings.

### Installing Allsky
Get the Allsky software and put it in ==~/allsky==. Except for some system files, all Allsky-related files reside in this directory.

```
cd
git clone  --depth=1  --recursive  https://github.com/AllskyTeam/allsky.git
```

This may take a minute and should produce output similar to what's below. The new ==allsky== directory is approximately 150 MB after download.

```
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

Now install Allsky:

``
cd allsky
./install.sh
``

The installation may prompt for several items (accepting the defaults is recommended). Upgrades produce fewer prompts.

- If the **host name** has never been changed you are asked to enter a new name - the default is ```allsky```. If you have more than one Pi on the same network they must all have unique names. For example, if you have a test Pi you may want to call it allsky-test.
- The **Locale** to use. This determines what the decimal separator is in log output (period or comma). Note that the default locale is ```en_GB.UTF-8``` where the Pi is developed.
- Adding **swap** space if needed. This effectively increases the amount of memory your Pi has. Insufficient swap space is one of the leading causes of timelapse video creations problems.
- Putting the ==~/allsky/tmp== directory in memory instead of on the disk. This directory holds temporary Allsky files and is where most Allsky files are initially written to. Putting the directory in memory **significantly** reduces the number of writes to the SD card, which increases its life.
- New installations will prompt for the **Latitude** and **Longitude** to use. In most cases values based on your network's location will be displayed as defaults.
- If a **reboot** is needed you are asked if the Pi should be rebooted when installation completes. If you answer "no", note that Allsky will not start until the Pi is rebooted.
The installation will notify you of any actions you need to take when the installation completes. If there are any such actions, the WebUI will display a message reminding you of those actions. Clear the message(s) when done performing the actions.

!!! info  "Instalation time"
    The installation may take up to an hour, depending on how many package you already have installed and the speed of your Pi. Subsequent installations of Allsky will be significantly faster.

### Post installation
After installation, reboot if told to, then perform any actions the identified during installation. Allsky will not begin until you do the following:

- Bring up the WebUI by entering ```http://allsky.local``` or ```http://allsky.localhost``` in a web browser. The default username is admin and the default password is secret.

!!! danger  "Remote Access"
    If your Pi is accessible via the Internet, change the username and password via the Change Password link on the WebUI.

- Go to the ```Allsky Settings``` page.
- If there's a message saying you need to configure Allsky or review the settings, do that now.
- Click on the blue button. It may look like [Save Changes](#){ .md-button .md-button--small }, or [Configuration Done; Start Allsky](#){ .md-button .md-button--small }, or something similar. Allsky will start.

### Starting and stopping Allsky
Allsky starts automatically when the Raspberry Pi boots up. To enable or disable this behavior, run:

```
sudo systemctl enable allsky     # starts Allsky when the Pi boots up
```

\#   OR

```
sudo systemctl disable allsky    # does NOT automatically start Allsky
```

When you want to manually start, stop, or restart Allsky, or obtain status, use one of these commands:

```
sudo systemctl start allsky
sudo systemctl stop allsky
sudo systemctl restart allsky    # a restart is the same as a stop then start
sudo systemctl status allsky
```

!!! info  "TIP"
    Add lines like the following to ~/.bashrc to save typing:  
    ``` alias start='sudo systemctl start allsky'```  
    You then only need to type start to start Allsky. Do this for the other commands as well.

### Troubleshooting

Starting Allsky from the terminal is a great way to track down issues as it provides debug information to the terminal window. To start Allsky manually, run:

```
sudo systemctl stop allsky
cd ~/allsky
./allsky.sh
```

If you are using a desktop environment (Pixel, Mate, LXDE, etc.) or using remote desktop or VNC, you can add the --preview argument to show the images the program is currently saving in a separate window:

```
./allsky.sh --preview
```