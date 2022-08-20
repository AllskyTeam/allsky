'''
allsky_shared.py

Part of allsky postprocess.py modules.
https://github.com/thomasjacquin/allsky

This module is a common dumping ground for shared variables and functions.
'''
import os
import pprint
import shlex
import subprocess
import string
import pprint
import json
import cv2
import shutil

ABORT = True

ALLSKYPATH = None
LOGLEVEL = 0
SETTINGS = {}
CONFIG = {}
UPLOAD = {}

def startModuleDebug(module):
    tmpDir = getEnvironmentVariable("ALLSKY_TMP")
    moduleTmpDir = os.path.join(tmpDir, "debug", module)
    try:
        if os.path.exists(moduleTmpDir):
            shutil.rmtree(moduleTmpDir)
        os.makedirs(moduleTmpDir, exist_ok=True)
        log(1,"INFO: Creating folder for debug {0}".format(moduleTmpDir))
    except:
        log(0,"ERROR: Unable to create {0}".format(moduleTmpDir))

def writeDebugImage(module, fileName, image):
    tmpDir = getEnvironmentVariable("ALLSKY_TMP")
    moduleTmpFile = os.path.join(tmpDir, "debug", module, fileName)    
    cv2.imwrite(moduleTmpFile, image, params=None)
    log(1,"INFO: Wrote debug file {0}".format(fileName))    

def setupForCommandLine():
    global ALLSKYPATH, LOGLEVEL

    try:
        ALLSKYPATH = os.environ["ALLSKY_HOME"]
    except KeyError:
        ALLSKYPATH = "/homepi/allsky"

    command = shlex.split("bash -c 'source " + ALLSKYPATH + "/variables.sh && env'")
    proc = subprocess.Popen(command, stdout = subprocess.PIPE)
    for line in proc.stdout:
        line = line.decode(encoding='UTF-8')
        line = line.strip("\n")
        line = line.strip("\r")
        try:
            (key, _, value) = line.partition("=")
            os.environ[key] = value
        except Exception:
            pass
    proc.communicate()

    readConfig()
    readSettings()

def readConfig():
    global CONFIG

    if not CONFIG:
        log(1, "INFO: Loading and parsing config.sh")
        allskyConfigPath = getEnvironmentVariable("ALLSKY_CONFIG", True)
        allskyConfigFile = os.path.join(allskyConfigPath, "config.sh")
        with open(allskyConfigFile) as fp:
            Lines = fp.readlines()
            for line in Lines:
                if not line.startswith("#"):
                    if not line.startswith("if"):
                        line = line.strip("\n")
                        line = line.strip("\r")
                        if line:
                            if not line.startswith("END_OF_USER_SETTINGS"):
                                if "=" in line:
                                    try:
                                        (key, _, value) = line.partition("=")
                                        value = value.strip("\"")
                                        CONFIG[key] = value
                                    except Exception:
                                        pass
                            else:
                                break

def readUploadConfig():
    global UPLOAD

    if not UPLOAD:
        log(1, "INFO: Loading and parsing ftp-settings.sh")
        allskyConfigPath = getEnvironmentVariable("ALLSKY_CONFIG", True)
        allskyConfigFile = os.path.join(allskyConfigPath, "ftp-settings.sh")
        with open(allskyConfigFile) as fp:
            Lines = fp.readlines()
            for line in Lines:
                line = line.lstrip()
                if not line.startswith("#"):
                    if not line.startswith("if"):
                        line = line.strip("\n")
                        line = line.strip("\r")
                        if line:
                            if "=" in line:
                                try:
                                    (key, _, value) = line.partition("=")
                                    value = value.strip("\"")
                                    UPLOAD[key] = value
                                except Exception:
                                    pass

def readSettings():
    global SETTINGS

    CONFIG["CAMERA_SETTINGS"] = os.path.join(getEnvironmentVariable("ALLSKY_CONFIG"), "settings_" + CONFIG["CAMERA"] + ".json")

    with open(CONFIG["CAMERA_SETTINGS"], "r") as fp:
        SETTINGS = json.load(fp)

    LOGLEVEL = int(getSetting("debuglevel"))

def getSetting(settingName):
    result = None
    try:
        result = SETTINGS[settingName]
    except Exception:
        pass
    
    return result

def getConfig(settingName):
    result = None
    try:
        result = CONFIG[settingName]
    except Exception:
        pass
    
    return result

def setupParams(params, metaData):
    readConfig()

    for param in metaData["arguments"]:
        if param in metaData["argumentdetails"]:
            if "setting" in metaData["argumentdetails"][param]:
                settingKey = metaData["argumentdetails"][param]["setting"]
                value = getConfig(settingKey)
                if "type" in metaData["argumentdetails"][param]:
                    if "fieldtype" in metaData["argumentdetails"][param]["type"]:
                        type = metaData["argumentdetails"][param]["type"]["fieldtype"]
                        if type == "spinner":
                            value = int(value)

                params[param] = value
    
    return params

def var_dump(variable):
    pprint.PrettyPrinter(indent=2, width=128).pprint(variable)

def getEnvironmentVariable(name, fatal=False, error=''):
    result = None

    try:
        result = os.environ[name]
    except KeyError:
        if fatal:
            print("Sorry, environment variable ( {0} ) not found.".format(name))
            exit(98)

    return result

def log(level, text, preventNewline = False, exitCode=None):
    """ Very simple method to log data if in verbose mode """
    if LOGLEVEL >= level:
        if preventNewline:
            print(text, end="")
        else:
            print(text)

    if exitCode is not None:
        exit(exitCode)