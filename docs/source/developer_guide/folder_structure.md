# Module folder structure

There are two relevant folder structures, that used when developing a module and that used after a module has been installed.

## Repository Structure
When developing a new module the following folder structure is required, this is taken from the Allsky ADSB module as an example


```
allsky_adsb                             Top level folder, the module name
├── allsky_adsb                         Data folder, copied into core Allsky. Named the same as the module
│   ├── adsb_data                       This can be any data thats needed folder name is only relevant to your code
│   └── tools                           A folder to hold some post install tools
│       └── build_database.py           The post install tool, referenced in the installer.json file
├── allsky_adsb.py                      The actual module itself
├── blocks                              Folder to hold blocks
│   ├── aircraft1.json
│   ├── aircraft2.json
│   ├── aircraft3.json
│   ├── aircraft4.json
│   ├── aircraft5.json
│   ├── closest.json
│   └── top5.json
├── charts                            Folder to hold charts
│   ├── total_aircraft_chart.json
│   └── total_aircraft_gauge.json
├── db                                Folder for database config
│   └── db_data.json                  The database config, mainly handles how the database is purged
├── installer.json                    Installtion details file
├── reuirements.txt                   LEGACY file do not use
├── packages.txt                      LEGACY file do not use
└── README.md                         Readme file for people browsing the repo
```

## Installed structure
Once a module has been installed by the moduel installer the files are copied into the main Allsky folder. The base folder for extra modules is

```
~/allsky/config/myfiles/modules
```

```
modules                                       The modules folder containing all extra modules
├── allsky_adsb.py                            The adsb module
├── moduledata                                Module data folder
│   ├── blocks                                Blocks folder, each module has its own folder
│   │   └── allsky_adsb                       The blocks for the adsb module
│   │       ├── aircraft1.json
│   │       ├── aircraft2.json
│   │       ├── aircraft3.json
│   │       ├── aircraft4.json
│   │       ├── aircraft5.json
│   │       ├── closest.json
│   │       └── top5.json
│   ├── charts                                Charts folder, each module has its own folder
│   │   └── allsky_adsb                       The charts for the adsb module
│   │       ├── total_aircraft_chart.json
│   │       └── total_aircraft_gauge.json
│   ├── data                                  Data folder, each module has its own folder
│   │   └── allsky_adsb                       The data folder for the adsb module, copied from the repo
│   │       ├── adsb_data
│   │       └── tools
│   │           └── build_database.py
│   ├── info
│   │   └── allsky_adsb
│   ├── installer                             Installer info for each module
│   │   └── allsky_adsb                       Installer info for the adsb module
│   │       └── installer.json
│   └── logfiles                              Logs created during installation
│       └── allsky_adsb
│           └── dependencies.log
└── __pycache__                               Compiled python code
```

# How Allsky finds modules
Allsky ships with core modules which can then be extended by installing the extra modules. Once installed Allsky will search for modules in the following order

1. The legacy custom modules folder ```/opt/allsky/modules```
2. The new custom modules folder ```~/allsky/config/myfiles/modules```
3. Core Allsky ```~/allsky/scripts/modules```

This mechanism allows you to implement custom versions of the core Allsky modules should you wish to do so.

!!! danger  "Overriding Core Allsky Modules"

    Before attempting to override a core module you must understand the existing functionality of the module. Failure to understand the modules could result in Allsky failing


!!! danger  "Legacy Module Locations"

    version v2024.12.06_01 and prior of Allsky stored all modules and module data in the ``/opt/allsky/modules``` folder. This has now been deprecated and all modules and associated data are stored with the ```~/allsky``` folder.

