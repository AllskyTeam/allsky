#!/usr/bin/python

import os
import sys
import cv2
import json
import time
import argparse,importlib,json,numpy, os
from datetime import datetime, timedelta, date

'''
NOTE: `valid_module_paths` must be an array, and the order specified dictates the order of search for a named module.
It is expected that the 'user' supplied modules are searched first, and thus come before the distributed modules path.
This permits the user to copy and modify a distributed module, or create an entirely new replacement for a distributed
module, thus giving the user total control.
'''

try:
    allSkyHome = os.environ["ALLSKY_HOME"]
except KeyError:
    print("ERROR: $ALLSKY_HOME not found in environment variables - Aborting")
    exit(1)

allSkyModulesPath = os.path.join(allSkyHome, "scripts", "modules")
valid_module_paths = ["/etc/allsky/modules", allSkyModulesPath]

for vmp in valid_module_paths:
    sys.path.append(os.path.abspath(vmp))

# This is a dummy module for shared variables.
import allsky_shared as s

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("-e", "--event",  type=str, help="The event we are running modules for (defaults to postcapture.", default="postcapture", choices=["postcapture","daynight", "nightday", "endofnight"])
    s.args = parser.parse_args()

    watchdog = False
    timeout = 0
    try:
        configFile = os.path.join(os.environ['ALLSKY_CONFIG'], 'module-settings.json')
        with open(configFile, 'r') as module_Settings_file:
            module_settings = json.load(module_Settings_file)
            watchdog = module_settings['watchdog']
            timeout = module_settings['timeout']
    except:
        watchdog = False

    try:
        s.LOGLEVEL = int(os.environ["ALLSKY_DEBUG_LEVEL"])
    except KeyError:
        s.LOGLEVEL = 0

    if s.args.event == "postcapture":
        try:
            s.CURRENTIMAGEPATH = os.environ['CURRENT_IMAGE']
        except KeyError:
            s.log(0, "ERROR: no image file available in the environment", exitCode=1)
    else:
        s.CURRENTIMAGEPATH  = None
        
    try:
        s.args.tod = os.environ["DAY_OR_NIGHT"].lower()
    except:
        s.log("ERROR: unable to determine if its day or night in the environment", exitCode=1)

    try:
        s.args.config = os.environ["CAMERA_SETTINGS"]
    except:
        s.log(0, "ERROR: no camera config file available in the environment", exitCode=1)

    try:
        s.args.allskyConfig = os.environ["ALLSKY_CONFIG"]
    except:
        s.log(0, "ERROR: no allsky config directory available in the environment", exitCode=1)

    try:
        rawSettings = os.environ["CAMERA_SETTINGS"]
        with open(rawSettings, 'r') as settingsFile:
            s.settings = json.load(settingsFile)
    except (FileNotFoundError, KeyError):
        s.log(0, "ERROR: $CAMERA_SETTINGS not found in environment variables - Aborting", exitCode=1)

    ## GENRIC FUNCTION TO SET VARS
    s.allskyTmp = os.environ["ALLSKY_TMP"]
    s.fullFilename = os.environ["FULL_FILENAME"]
    s.createThumbnails = os.environ["IMG_CREATE_THUMBNAILS"]
    s.thumbnailWidth = int(os.environ["THUMBNAIL_SIZE_X"])
    s.thumbnailHeight = int(os.environ["THUMBNAIL_SIZE_Y"])

    s.websiteImageFile = os.path.join(s.allskyTmp, s.fullFilename)

    try:
        imagesRoot = os.environ["ALLSKY_IMAGES"]
    except:
        s.log(0, "ERROR: no allsky config directory available in the environment", exitCode=1)

    date = datetime.now()
    if s.args.tod == "night":
        date = date + timedelta(hours=-12)
    dateString = date.strftime("%Y%m%d")

    s.imageFileName = os.path.basename(s.CURRENTIMAGEPATH)
    s.imageFolder = os.path.join(imagesRoot, dateString)
    s.imageFile = os.path.join(s.imageFolder, s.imageFileName)

    s.thumbnailFolder = os.path.join(s.imageFolder, "thumbnails")
    s.thumbnailFile = os.path.join(s.thumbnailFolder, s.imageFileName)


    s.log(1, "INFO: Loading config...")
    try:
        with open(s.args.config,'r') as config:
            try:
                s.conf=json.load(config)
            except json.JSONDecodeError as err:
                s.log(0, "Error: {0}".format(err), exitCode=1)
    except:
        s.log(0, "ERROR: Failed to open {0}".format(s.args.config), exitCode=1)
    
    s.log(1, "INFO: Loading recipe...")
    try:
        if s.args.event == "postcapture":
            moduleConfig = "{0}/postprocessing_{1}.json".format(s.args.allskyConfig, s.args.tod)
        else:
            moduleConfig = "{0}/postprocessing_{1}.json".format(s.args.allskyConfig, s.args.event)
            
        with open(moduleConfig) as recipe_file:
            try:
                s.recipe=json.load(recipe_file)
            except json.JSONDecodeError as err:
                s.log(0, "ERROR: Error parsing {0} {1}".format(moduleConfig, err), exitCode=1)
    except:
        s.log(0, "ERROR: Failed to open {0}".format(moduleConfig), exitCode=1)
    
    results = {}
    for s.step in s.recipe:
        if s.recipe[s.step]["enabled"] and s.recipe[s.step]["module"] not in globals():
            #try:
            #    '''
            #    This section expects module python to be present in /etc/allsky/modules/, or /home/pi/allsky/scripts/modules.
            #    Module files should be named 'allsky_MODULE.py', where MODULE is the name of the module.
            #    Assuming step['module']=="resize" for example, the below is equivalent to:
            #        from allsky_resize import resize
            #    and expects allsky_resize.py to be present in /etc/allsky/modules/ (this path has priority), or /home/pi/allsky/scripts/modules.
            #    '''
            moduleName = s.recipe[s.step]['module'].replace('.py','')
            method = s.recipe[s.step]['module'].replace('.py','').replace('allsky_','')
            s.log(2, "INFO: Attempting to load {0}".format(moduleName))
            _temp = importlib.import_module(moduleName)
            globals()[method] = getattr(_temp, method)
            #except Exception as e:
                #s.log(0, "ERROR: Failed to import module allsky_{0}.py in one of ( {1} ). Ignoring Module.".format(s.step['module'], ", ".join(valid_module_paths)), exitCode=1)
                #print(e)
        else:
            s.log(1, "INFO: Ignorning module {0} as its disabled".format(s.recipe[s.step]["module"]))

        if s.recipe[s.step]["enabled"] and method in globals():
            s.log(1, "INFO: Running Module {0}".format(s.recipe[s.step]['module']))
            startTime = datetime.now()

            if 'arguments' in s.recipe[s.step]['metadata']:
                arguments = s.recipe[s.step]['metadata']['arguments']
            else:
                arguments = {}

            result = globals()[method](arguments)

            endTime = datetime.now()
            elapsedTime = ((endTime - startTime).total_seconds())
            if watchdog:
                if elapsedTime > timeout:
                    s.log(0, 'ERROR: Will disable module {0} it took {1}ms max allowed is {2}s'.format(s.recipe[s.step]['module'], elapsedTime, timeout))
                else:
                    s.log(1, 'INFO: Module {0} ran ok in {1}s'.format(s.recipe[s.step]['module'], elapsedTime))
            
            results[s.step] = {}
            results[s.step]["lastexecutiontime"] = str(elapsedTime * 1000)

            if result == s.ABORT:
                break

            results[s.step]["lastexecutionresult"] = result


    with open(moduleConfig) as updatefile:
        try:
            config = json.load(updatefile)
            for step in config:
                if step in results:
                    config[step]["lastexecutiontime"] = results[step]["lastexecutiontime"]
                    config[step]["lastexecutionresult"] = results[step]["lastexecutionresult"]

            updatefile.close()
            with open(moduleConfig, "w") as updatefile:
                json.dump(config, updatefile)
                updatefile.close()
        except json.JSONDecodeError as err:
            s.log(0, "ERROR: Error parsing {0} {1}".format(moduleConfig, err), exitCode=1)