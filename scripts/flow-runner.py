#!/usr/bin/python3

import sys
import os
import json
import argparse
import importlib
from datetime import datetime, timedelta, date
import signal

'''
NOTE: `valid_module_paths` must be an array, and the order specified dictates the order of search for a named module.
It is expected that the 'user' supplied modules are searched first, and thus come before the distributed modules path.
This permits the user to copy and modify a distributed module, or create an entirely new replacement for a distributed
module, thus giving the user total control.
'''

def signalHandler(sig, frame):
    if sig == signal.SIGTERM or sig == signal.SIGINT:
        try:
            sys.exit(99)
        except:
            pass

signal.signal(signal.SIGTERM, signalHandler)
signal.signal(signal.SIGINT, signalHandler)
signal.signal(signal.SIGUSR1, signalHandler)
signal.signal(signal.SIGUSR2, signalHandler)

'''
Get the locations of the modules and scripts and add them to the path.
'''
try:
    allSkyModules = os.environ["ALLSKY_MODULE_LOCATION"]
except KeyError:
    print("ERROR: $ALLSKY_MODULE_LOCATION not found in environment variables - Aborting")
    sys.exit(1)
allSkyModulesLocation = os.path.join(allSkyModules, "modules")

try:
    allSkyScripts = os.environ["ALLSKY_SCRIPTS"]
except KeyError:
    print("ERROR: $ALLSKY_SCRIPTS not found in environment variables - Aborting")
    sys.exit(1)
allSkyModulesPath = os.path.join(allSkyScripts, "modules")

valid_module_paths = [allSkyModulesLocation, allSkyModulesPath]

for vmp in valid_module_paths:
    sys.path.append(os.path.abspath(vmp))

import allsky_shared as shared

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("-e", "--event",  type=str, help="The event we are running modules for (defaults to postcapture).", default="postcapture", choices=["postcapture","daynight", "nightday", "periodic"])
    shared.args = parser.parse_args()
    
    try:
        shared.allskyTmp = os.environ["ALLSKY_TMP"]
    except:
        shared.log(0, "ERROR: $ALLSKY_TMP not found in the variables", exitCode=1)
    try:
        imagesRoot = os.environ["ALLSKY_IMAGES"]
    except:
        shared.log(0, "ERROR: $ALLSKY_IMAGES not found in the variables", exitCode=1)
    try:
        rawSettings = os.environ["SETTINGS_FILE"]
    except:
        shared.log(0, "ERROR: no camera config file available in the environment", exitCode=1)


    if (shared.args.event == "postcapture"):
        try:
            shared.LOGLEVEL = int(os.environ["ALLSKY_DEBUG_LEVEL"])
        except KeyError:
            shared.LOGLEVEL = 0

        try:
            shared.CURRENTIMAGEPATH = os.environ['CURRENT_IMAGE']
        except KeyError:
            shared.log(0, "ERROR: no image file available in the environment", exitCode=1)

        try:
            shared.args.tod = os.environ["DAY_OR_NIGHT"].lower()
        except:
            shared.log(0, "ERROR: unable to determine if its day or night in the environment", exitCode=1)

        try:
            with open(rawSettings, 'r') as settingsFile:
                shared.settings = json.load(settingsFile)
        except (FileNotFoundError, KeyError):
            shared.log(0, "ERROR: Unable to read SETTINGS_FILE - Aborting", exitCode=1)

        shared.fullFilename = os.environ["FULL_FILENAME"]
        shared.createThumbnails = os.environ["IMG_CREATE_THUMBNAILS"]
        shared.thumbnailWidth = int(os.environ["THUMBNAIL_SIZE_X"])
        shared.thumbnailHeight = int(os.environ["THUMBNAIL_SIZE_Y"])
        shared.websiteImageFile = os.path.join(shared.allskyTmp, shared.fullFilename)
        shared.TOD = shared.args.tod
        date = datetime.now()
        if shared.args.tod == "night":
            date = date + timedelta(hours=-12)
        dateString = date.strftime("%Y%m%d")

        shared.imageFolder = os.path.join(imagesRoot, dateString)
        shared.imageFileName = os.path.basename(shared.CURRENTIMAGEPATH)
        shared.imageFile = os.path.join(shared.imageFolder, shared.imageFileName)
        shared.thumbnailFolder = os.path.join(shared.imageFolder, "thumbnails")
        shared.thumbnailFile = os.path.join(shared.thumbnailFolder, shared.imageFileName)
    else:
        shared.setupForCommandLine()
        shared.CURRENTIMAGEPATH  = None
        shared.LOGLEVEL = int(shared.getSetting("debuglevel"))
        shared.args.tod = 'day'
        date = datetime.now()
        date = date + timedelta(hours=-12)
        dateString = date.strftime("%Y%m%d")
        shared.imageFolder = os.path.join(imagesRoot, dateString)

    try:
        shared.args.allskyConfig = os.environ["ALLSKY_MODULES"]
    except:
        shared.log(0, "ERROR: no allsky config directory available in the environment", exitCode=1)

    watchdog = False
    timeout = 0
    try:
        configFile = os.path.join(shared.args.allskyConfig, 'module-settings.json')
        with open(configFile, 'r') as module_Settings_file:
            module_settings = json.load(module_Settings_file)
            watchdog = module_settings['watchdog']
            timeout = module_settings['timeout']
    except:
        watchdog = False


    shared.args.config = rawSettings
    shared.log(4, "INFO: Loading config {0}".format(shared.args.config))
    try:
        with open(shared.args.config,'r') as config:
            try:
                shared.conf=json.load(config)
            except json.JSONDecodeError as err:
                shared.log(0, "Error: {0}".format(err), exitCode=1)
    except:
        shared.log(0, "ERROR: Failed to open {0}".format(shared.args.config), exitCode=1)
    
    flowName = shared.args.tod if shared.args.event == "postcapture" else shared.args.event
    shared.log(4, "INFO: Running {0} flow...".format(flowName))
    try:
        moduleConfig = "{0}/postprocessing_{1}.json".format(shared.args.allskyConfig, flowName)
   
        with open(moduleConfig) as flow_file:
            try:
                shared.flow=json.load(flow_file)
            except json.JSONDecodeError as err:
                shared.log(0, "ERROR: Error parsing {0} {1}".format(moduleConfig, err), exitCode=1)
    except:
        shared.log(0, "ERROR: Failed to open {0}".format(moduleConfig), exitCode=1)

    shared.initDB()
    
    if (shared.args.event == "postcapture"):
        disableFile = os.path.join(shared.allskyTmp,"disable")
        if shared.isFileReadable(disableFile):
            with open(disableFile, "r") as fp:
                disable = json.load(fp)
                for module in disable:
                    moduleName = disable[module].replace('.py','')
                    method = disable[module].replace('.py','').replace('allsky_','') + "_cleanup"
                    _temp = importlib.import_module(moduleName)
                    if hasattr(_temp, method):
                        globals()[method] = getattr(_temp, method)
                        result = globals()[method]()
                        shared.log(3, "INFO: Cleared module data for {0}".format(moduleName))
                    else:
                        shared.log(3, "INFO: Attempting to clear module data for {0} but no function provided".format(moduleName))
                        
            os.remove(disableFile)
    
    results = {}
    for shared.step in shared.flow:
        if shared.flow[shared.step]["enabled"] and shared.flow[shared.step]["module"] not in globals():
            try:
                moduleName = shared.flow[shared.step]['module'].replace('.py','')
                method = shared.flow[shared.step]['module'].replace('.py','').replace('allsky_','')
                shared.log(4, "INFO: ----------------------- Running Module {0} -----------------------".format(shared.flow[shared.step]['module']))
                shared.log(4, "INFO: Attempting to load {0}".format(moduleName))
                _temp = importlib.import_module(moduleName)
                globals()[method] = getattr(_temp, method)
            except Exception as e:
                shared.log(0, "ERROR: Failed to import module allsky_{0}.py in one of ( {1} ). Ignoring Module.".format(moduleName, e))
        else:
            shared.log(3, "INFO: Ignorning module {0} as its disabled".format(shared.flow[shared.step]["module"]))

        if shared.flow[shared.step]["enabled"] and method in globals():
            startTime = datetime.now()

            arguments = {}
            if 'arguments' in shared.flow[shared.step]['metadata']:
                arguments = shared.flow[shared.step]['metadata']['arguments']
                

            try:
                result = globals()[method](arguments, shared.args.event)
            except Exception as e:
                shared.log(0,"ERROR: {}".format(e))

            endTime = datetime.now()
            elapsedTime = (((endTime - startTime).total_seconds()) * 1000) / 1000

            ignoreWatchdog = False
            if shared.step in ['loadimage','saveimage']:
                 ignoreWatchdog = True
            else:
                if 'ignorewatchdog' in shared.flow[shared.step]['metadata']:
                    if shared.flow[shared.step]['metadata']['ignorewatchdog']:
                        ignoreWatchdog = True
                    
            results[shared.step] = {}
            if not ignoreWatchdog:
                if watchdog:
                    if elapsedTime > timeout:
                        shared.log(0, 'ERROR: Module {0} will be disabled, it took {1:.2f}s max allowed is {2}s'.format(shared.flow[shared.step]['module'], elapsedTime, timeout))
                        results[shared.step]["disable"] = True
                    else:
                        shared.log(3, 'INFO: Module {0} ran ok in {1:.2f}s'.format(shared.flow[shared.step]['module'], elapsedTime))
                else:
                    shared.log(3, 'INFO: Module {0} ran ok in {1:.2f}s'.format(shared.flow[shared.step]['module'], elapsedTime))
            else:
                shared.log(3, f'INFO: Ignoring watchdog for module {shared.step}')             
                    
            results[shared.step]["lastexecutiontime"] = str(elapsedTime) 

            if result == shared.ABORT:
                break

            results[shared.step]["lastexecutionresult"] = result
    shared.log(4, "INFO: {0} flow Complete...".format(flowName))

    with open(moduleConfig) as updatefile:
        try:
            config = json.load(updatefile)
            for step in config:
                if step in results:
                    config[step]["lastexecutiontime"] = results[step]["lastexecutiontime"]
                    config[step]["lastexecutionresult"] = results[step]["lastexecutionresult"]
                    if "disable" in results[step]:
                        config[step]["enabled"] = False

            updatefile.close()
            with open(moduleConfig, "w") as updatefile:
                json.dump(config, updatefile, indent=4)
        except json.JSONDecodeError as err:
            shared.log(0, "ERROR: Error parsing {0} {1}".format(moduleConfig, err), exitCode=1)
