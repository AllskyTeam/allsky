## The installer.json file

This file allows you to configure dependencies and post installation scripts for the module.

```
{
    "requirements": [
        "unidecode"
    ],
    "packages": [
        "somepackage"
    ],
    "post-install": {
        "run": "{install_data_dir}/tools/build_database.py" 
    }
}
```

There are three sections available in this file

- **Requirements** – Used to install any Python dependencies  
- **Packages** – Used to install any apt packages  
- **Post-install** – Any scripts to run after the installation is complete  

These are covered in more detail in the following sections

### Python Dependencies

If your module requires Python dependencies then first check if the dependencies are already available.

If the dependencies are not available then inside your module folder create the installer.json file and add the dependencies to it.

This file is passed to pip using the -r option so follows all of the normal conventions for installing python modules.

Any installed dependencies will be added to the main Allsky virtual python environment, found in ~/allsky/venv


!!! danger  "numpy"

    NEVER attempt to install numpy in your dependencies. Doing so may break Allsky. We use Numpy version 2 or above so you can not use any libraries that require numpy version 1

!!! danger  "Legacy Requirements file"

    Some modules use a requirements.txt file – This is the legacy method for installing dependencies and must not be used.


### APT Packages

If your module requires addition apt packages to be installed then create or amend the installer.json file to add the packages

The module installer will install these packages using apt so you can use the apt options for the packages, like setting versions etc

!!! danger  "Legacy Reqpackagesuirements file"

    Some modules use a packages.txt file – This is the legacy method for installing dependencies and must not be used.


### Additional Data

If your module requires additional data then create a folder inside the module folder with the same name as the module. Inside this folder place any data you require.

The module installer will then copy this code into the main Allsky folder. You will need to construct the path to this folder yourself in your code.

The allsky_adsb module is a good example to look at for this type of functionality.

### Install scripts

If you need to run any post installation code, so setup data for example then place details of the script to call int eh post-install section of the installer.json file.

In the example above the script has been placed in the allsky_adsb/tools folder. This will be copied to the main Allsky folder during installation. The installer file references {install_data_dir} which the installer will replace with the real folder.

### Charts

See the charts section for more details

### Blocks

See the blocks section for more details