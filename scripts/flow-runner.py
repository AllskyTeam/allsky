#!/usr/bin/python3

import os
import sys
import traceback
import subprocess

# Ensure the script is running in the correct Python environment
allsky_home = os.environ['ALLSKY_HOME']
here = os.path.dirname(os.path.abspath(__file__))
venv_dir = os.path.join(allsky_home, 'venv')
venv_python = os.path.join(venv_dir, 'bin', 'python3')
if sys.executable != venv_python:
    os.execv(venv_python, [venv_python] + sys.argv)


import json
import argparse
import importlib
from datetime import datetime, timedelta, date
import signal
from collections import deque
import numpy
import shutil
import time
import locale

try:
    locale.setlocale(locale.LC_ALL, '')
except:
    pass

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
# Can't use log() or getEnvironmentVariable() yet.
try:
    allsky_my_files_folder = os.environ["ALLSKY_MYFILES_DIR"]
except KeyError:
    print("ERROR: $ALLSKY_MYFILES_DIR not found - Aborting.")
    sys.exit(1)

try:
    all_sky_modules = os.environ["ALLSKY_MODULE_LOCATION"]
except KeyError:
    print("ERROR: $ALLSKY_MODULE_LOCATION not found - Aborting.")
    sys.exit(1)
allsky_modules_location = os.path.join(all_sky_modules, "modules")

try:
    allsky_scripts = os.environ["ALLSKY_SCRIPTS"]
except KeyError:
    print("ERROR: $ALLSKY_SCRIPTS not found - Aborting")
    sys.exit(1)
allsky_modules_path = os.path.join(allsky_scripts, "modules")
allsky_my_files_folder = os.path.join(allsky_my_files_folder, "modules")

valid_module_paths = [allsky_my_files_folder, allsky_modules_location, allsky_modules_path]

for vmp in valid_module_paths:
    sys.path.append(os.path.abspath(vmp))

import allsky_shared as shared

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("-e", "--event",  type=str, help="The event we are running modules for (defaults to postcapture).", default="postcapture", choices=["postcapture","daynight", "nightday", "periodic"])
    parser.add_argument("-f", "--flowtimerframes",  type=int, help="Number of frames to capture for the flow timing averages.", default=10)
    parser.add_argument("-c", "--cleartimings", action="store_true", help="Clear any flow average timing data.")
    parser.add_argument("-t", "--test", action="store_true", help="Run the test module flow")
    shared.args = parser.parse_args()
    #ignoreWatchdogMsg = ""

    shared.initDB()

    if shared.args.cleartimings:
        if shared.dbHasKey("flowtimer"):
            shared.dbDeleteKey("flowtimer")

        flowTimingsFolder = shared.getEnvironmentVariable("ALLSKY_FLOWTIMINGS", fatal=True)
        if os.path.exists(flowTimingsFolder):
            shutil.rmtree(flowTimingsFolder)
        sys.exit(0)

    imagesRoot = shared.getEnvironmentVariable("ALLSKY_IMAGES", fatal=True)
 
    testMode = False
    if shared.args.test:
        testMode = True
    else:
        shared.write_env_to_db()
  
    if (shared.args.event == "postcapture"):
        try:
            shared.LOGLEVEL = int(os.environ["ALLSKY_DEBUG_LEVEL"])
        except KeyError:
            shared.LOGLEVEL = 0

        shared.CURRENTIMAGEPATH = shared.getEnvironmentVariable("CURRENT_IMAGE", fatal=True)
        shared.args.tod = shared.getEnvironmentVariable("DAY_OR_NIGHT", fatal=True).lower()

        try:
            with open(shared.ALLSKY_SETTINGS_FILE, 'r') as settingsFile:
                shared.settings = json.load(settingsFile)
        except (FileNotFoundError, KeyError):
            shared.log(0, f"ERROR: Unable to read {shared.ALLSKY_SETTINGS_FILE} - Aborting", exitCode=1)

        shared.fullFilename = shared.getEnvironmentVariable("ALLSKY_FULL_FILENAME", fatal=True)
        shared.createThumbnails = bool(shared.getSetting("imagecreatethumbnails"))
        shared.thumbnailWidth = int(shared.getSetting("thumbnailsizex"))
        shared.thumbnailHeight = int(shared.getSetting("thumbnailsizey"))
        shared.websiteImageFile = os.path.join(shared.ALLSKY_CURRENT_DIR, shared.fullFilename)
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

    shared.args.ALLSKY_MODULES = shared.getEnvironmentVariable("ALLSKY_MODULES", fatal=True);
    #watchdog = False
    moduleDebug = False
    timeout = 0
    try:
        configFile = os.path.join(shared.args.ALLSKY_MODULES, 'module-settings.json')
        with open(configFile, 'r') as module_Settings_file:
            module_settings = json.load(module_Settings_file)
            #watchdog = module_settings['watchdog']
            timeout = module_settings['timeout']
            moduleDebug = module_settings['debugmode']
    except:
        pass
        #watchdog = False

    if not testMode:
        shared.log(4, f"INFO: Loading {shared.ALLSKY_SETTINGS_FILE}")
    try:
        with open(shared.ALLSKY_SETTINGS_FILE,'r') as config:
            try:
                shared.conf=json.load(config)
            except json.JSONDecodeError as err:
                shared.log(0, f"ERROR: {err}", exitCode=1)
    except:
        shared.log(0, f"ERROR: Failed to open {shared.ALLSKY_SETTINGS_FILE}", exitCode=1)

    flowName = shared.args.tod if shared.args.event == "postcapture" else shared.args.event
    if not testMode:
        shared.log(4, f"INFO: ===== Running {flowName} flow...")
    if testMode:
        moduleConfig = f"{shared.args.ALLSKY_MODULES}/test_flow.json"
        moduleDebugFile = f"{shared.args.ALLSKY_MODULES}/test_flow-debug.json"
    else:
        moduleConfig = f"{shared.args.ALLSKY_MODULES}/postprocessing_{flowName}.json"
        moduleDebugFile = f"{shared.args.ALLSKY_MODULES}/postprocessing_{flowName}-debug.json"
    try:
        with open(moduleConfig) as flow_file:
            if (os.stat(moduleConfig).st_size == 0):
                shared.log(0, f"ERROR: File is empty: {moduleConfig}", exitCode=1)
            try:
                shared.flow=json.load(flow_file)
            except json.JSONDecodeError as err:
                shared.log(0, f"ERROR: Error parsing {moduleConfig} {err}", exitCode=1)
    except OSError as error:
        shared.log(0, f"ERROR: Failed to open {moduleConfig} {error}", exitCode=1)

    if (shared.args.event == "postcapture"):
        disableFile = os.path.join(shared.ALLSKY_TMP,"disable")
        if shared.isFileReadable(disableFile):
            with open(disableFile, "r") as fp:
                disable = json.load(fp)
                for module in disable:
                    moduleName = disable[module].replace('.py','')
                    method = moduleName.replace('allsky_','') + "_cleanup"
                    try:
                        _temp = importlib.import_module(moduleName)
                        if hasattr(_temp, method):
                            globals()[method] = getattr(_temp, method)
                            result = globals()[method]()
                            shared.log(4, f"INFO: Cleared module data for {moduleName}")
                        else:
                            shared.log(3, f"WARNING: Attempted to clear module data for {moduleName} but no function provided.")
                    except Exception as e:
                        shared.log(0, f"ERROR: Attempted to clear module data for {moduleName} but error thrown.")
                    
            os.remove(disableFile)

    results = {}
    if moduleDebug:
        flowStartTime = round(time.time() * 1000)
    for shared.step in shared.flow:
        fileName = shared.flow[shared.step]['module']
        enabled = shared.flow[shared.step]["enabled"]
        if enabled and fileName not in globals():
            try:
                moduleName = fileName.replace('.py','')
                method = moduleName.replace('allsky_','')
                if not testMode:
                    shared.log(4, f"INFO: --------------- Running Module {moduleName} ---------------")
                _temp = importlib.import_module(moduleName)
                globals()[method] = getattr(_temp, method)
            except Exception as e:
                message = f"ERROR: Failed to import module '{fileName}': {e}"
                # If some modules fail, like "Load Image" then we should stop
                # the flow since nothing else will work.
                # However, if other modules like "Star Count" fail we should continue the flow.
                # Modules may need a flag that says "can continue" or "stop all processing".
                if method == "loadimage":
                    shared.log(0, f"{message}; stopping all module processing.")
                    sys.exit(99)
                else:
                    shared.log(0, f"{message}; ignoring.")
        else:
            shared.log(4, f"INFO: Module {fileName} disabled; ignoring.")

        if enabled and method in globals():
            startTime = datetime.now()
            result = False

            arguments = {}
            if 'arguments' in shared.flow[shared.step]['metadata']:
                arguments = shared.flow[shared.step]['metadata']['arguments']

            arguments['ALLSKYTESTMODE'] = testMode                

            try:
                result = globals()[method](arguments, shared.args.event)
            except Exception as e:
                eType, eObject, eTraceback = sys.exc_info()
                L = eTraceback.tb_lineno
                nextL = eTraceback.tb_next.tb_lineno
                message = f"ERROR: Module '{fileName}' failed on line {nextL} called from flow-runner.py line {L} - {e}"
                shared.log(0, f"{message}.")
                if shared.LOGLEVEL == 4:
                    traceback.print_tb(eTraceback)
                if method == "loadimage":
                    shared.log(0, f"***** Stopping all module processing.")
                    sys.exit(99)

            endTime = datetime.now()
            elapsedTime = (((endTime - startTime).total_seconds()) * 1000) / 1000

            results[shared.step] = {}
            results[shared.step]["lastexecutiontime"] = str(elapsedTime)
            if result == shared.ABORT:
                break

            results[shared.step]["lastexecutionresult"] = result
    if not testMode:
        shared.log(4, f"INFO: ===== {flowName} flow complete.")

    try:
        debugData = {}
        for step in results:
            if step not in debugData:
                debugData[step] = {}
                
            debugData[step]["lastexecutiontime"] = results[step]["lastexecutiontime"]
            debugData[step]["lastexecutionresult"] = results[step]["lastexecutionresult"]
            if "disable" in results[step]:
                debugData[step]["enabled"] = False
                                                
        with open(moduleDebugFile, "w+") as debugFile:
            json.dump(debugData, debugFile, indent=4)
    except Exception as err:
        shared.log(0, f"ERROR: Error saving module debug data {err}", exitCode=1) 
        
    flowTimingsFolder = shared.getEnvironmentVariable("ALLSKY_FLOWTIMINGS", fatal=True)
    if moduleDebug:
        try:
            flowTimingsFile = os.environ[f"ALLSKY_FLOWTIMINGS_{flowName.upper()}"]

            flowEndTime = round(time.time() * 1000)
            flowElapsedTime = int(flowEndTime - flowStartTime)
            queueData = []
            allQueueData = {}
            if shared.dbHasKey("flowtimer"):
                allQueueData = shared.dbGet("flowtimer")
                if flowName in allQueueData:
                    queueData = allQueueData[flowName]

            queue = deque(queueData, maxlen = shared.args.flowtimerframes)
            queue.append(flowElapsedTime)

            queueData = list(queue)
            allQueueData[flowName] = queueData
            shared.dbUpdate("flowtimer", allQueueData)

            shared.checkAndCreateDirectory(flowTimingsFolder)
            if len(list(queue)) >= shared.args.flowtimerframes:
                average = str(int(numpy.average(list(queue))))
                with open(flowTimingsFile, 'w') as f:
                    f.write(average)
            else:
                if shared.isFileWriteable(flowTimingsFile):
                    os.remove(flowTimingsFile)
        except KeyError:
            pass

    else:
        if shared.dbHasKey("flowtimer"):
            shared.dbDeleteKey("flowtimer")

        if os.path.exists(flowTimingsFolder):
            shutil.rmtree(flowTimingsFolder)
