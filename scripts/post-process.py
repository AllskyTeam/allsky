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
    parser.add_argument("-i", "--image",  type=str, help="Image to proces ( Required for day or night ).")
    parser.add_argument("-p", "--path",   type=str, help="Path to image directory to process ( Required for for endOfNight ).")
    parser.add_argument("-t", "--tod",    type=str, choices = ['day','night','endOfNight'],  help="Time of day.  One of: day, night, or endOfNight.")
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

    if s.args.image:
        if not os.path.exists(s.args.image):
            s.log(0, "ERROR: image file specified ( {0} ) does not exist.".format(s.args.image), exitCode=1)
        if not os.path.isfile(s.args.image):
            s.log(0,"ERROR: image file specified ( {0} ) is not a file.".format(s.args.image), exitCode=1)

        s.CURRENTIMAGEPATH = s.args.image
    else:
        try:
            s.CURRENTIMAGEPATH = os.environ['CURRENT_IMAGE']
        except KeyError:
            s.log(0, "ERROR: no image file available in the environment", exitCode=1)

    if s.args.path:
        if not os.path.exists(s.args.path):
            s.log(0, "ERROR: path specified ( {0} ) does not exist.".format(s.args.path), exitCode=1)
        if not os.path.isdir(s.args.path):
            s.log(0, "ERROR: path specified ( {0} ) does not exist.".format(s.args.path), exitCode=1)

    if not s.args.tod:
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
        with open("{0}/postprocessing_{1}.json".format(s.args.allskyConfig, s.args.tod)) as recipe_file:
            try:
                s.recipe=json.load(recipe_file)
            except json.JSONDecodeError as err:
                s.log(0, "ERROR: Error parsing {0}/postprocessing_{1}.json: {2}".format(s.conf['CONFIG_PATH'], s.args.tod, err), exitCode=1)
    except:
        s.log(0, "ERROR: Failed to open {0}/postprocessing_{1}.json".format(s.conf['CONFIG_PATH'], s.args.tod), exitCode=1)
    
    for s.step in s.recipe:
        if s.step["enabled"] and s.step["module"] not in globals():
            #try:
            #    '''
            #    This section expects module python to be present in /etc/allsky/modules/, or /home/pi/allsky/scripts/modules.
            #    Module files should be named 'allsky_MODULE.py', where MODULE is the name of the module.
            #    Assuming step['module']=="resize" for example, the below is equivalent to:
            #        from allsky_resize import resize
            #    and expects allsky_resize.py to be present in /etc/allsky/modules/ (this path has priority), or /home/pi/allsky/scripts/modules.
            #    '''
            s.log(2, "INFO: Attempting to load allsky_{0}.py".format(s.step['module']))
            _temp = importlib.import_module("allsky_{0}".format(s.step['module']))
            globals()[s.step['module']] = getattr(_temp,s.step['module'])
            #except Exception as e:
                #s.log(0, "ERROR: Failed to import module allsky_{0}.py in one of ( {1} ). Ignoring Module.".format(s.step['module'], ", ".join(valid_module_paths)), exitCode=1)
                #print(e)
        else:
            s.log(1, "INFO: Ignorning module {0} as its disabled".format(s.step["module"]))

        if s.step['module'] in globals():
            if watchdog:
                keepNewline = True
            else:
                keepNewline = False

            s.log(1, "INFO: Running Module {0}".format(s.step['module']), keepNewline)
            startTime = datetime.now()
            result = globals()[s.step['module']](s.step['arguments'])
            endTime = datetime.now()
            elapsedTime = ((endTime - startTime).total_seconds())
            if watchdog:
                if elapsedTime > timeout:
                    s.log(0, 'ERROR: Will disable module {0} it took {1}ms max allowed is {2}s'.format(s.step['module'], elapsedTime, timeout))
                else:
                    s.log(1, ', ran ok in {0}s'.format(elapsedTime))
            
            if result == s.ABORT:
                break
