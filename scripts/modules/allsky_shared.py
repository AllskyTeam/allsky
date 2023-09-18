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
import json
import cv2
import shutil
import re
import sys
import time
import locale
import board
import argparse

try:
    locale.setlocale(locale.LC_ALL, '')
except:
    pass

ABORT = True

ALLSKYPATH = None
LOGLEVEL = 0
SETTINGS = {}
CONFIG = {}
UPLOAD = {}
TOD = ''
DBDATA = {}

def shouldRun(module, period):
    result = False
    diff = 0

    dbKey = module + "_lastrun"
    lastRun = dbGet(dbKey)
    if lastRun is not None:
        now = time.time()
        diff = now - lastRun
        if diff >= period:
            result = True
    else:
        result = True

    return result, diff

def setLastRun(module):
    dbKey = module + "_lastrun"
    now = time.time()
    dbUpdate(dbKey, now)

def convertLatLon(input):
    """ Converts the lat and lon from the all sky config to decimal notation i.e. 0.2E becomes -0.2"""
    multiplier = 1 if input[-1] in ['N', 'E'] else -1
    return multiplier * sum(float(x) / 60 ** n for n, x in enumerate(input[:-1].split('-')))

def skyClear():
    skyState = "unknown"
    skyStateFlag = True
    if "AS_SKYSTATE" in os.environ:
        if os.environ["AS_SKYSTATE"] == "Clear":
            skyState = "clear"
            skyStateFlag = True
        else:
            skyState = "not clear"
            skyStateFlag = False

    return skyState, skyStateFlag


    pass

def raining():
    raining = "unknown"
    rainFlag = False
    if "AS_ALLSKYRAINFLAG" in os.environ:
        rainingFlag = os.environ["AS_ALLSKYRAINFLAG"]
        if rainingFlag == "True":
            raining = "yes"
            rainFlag = True
        else:
            raining = "no"
            rainFlag = False

    return raining, rainFlag

def checkAndCreateDirectory(filePath):
    os.makedirs(filePath, mode = 0o777, exist_ok = True)

def checkAndCreatePath(filePath):
    path = os.path.dirname(filePath)
    print(path)
    os.makedirs(path, mode = 0o777, exist_ok = True)

def convertPath(path):
    regex =  r"\$\{.*?\}"
    matches = re.finditer(regex, path, re.MULTILINE | re.IGNORECASE)
    for matchNum, match in enumerate(matches, start=1):
        variable = match.group()
        envVar = variable.replace("${", "")
        envVar = envVar.replace("}", "")

        value = None
        if envVar == "CURRENT_IMAGE":
            value = getEnvironmentVariable(envVar)
            value = os.path.basename(value)
        else:
            if envVar in os.environ:
                value = getEnvironmentVariable(envVar)
            else:
                envVar = "AS_" + envVar
                value = getEnvironmentVariable(envVar)

        if value is not None:
            path = path.replace(variable, value)
        else:
            path = None
            break

    return path

def startModuleDebug(module):
    tmpDir = getEnvironmentVariable("ALLSKY_TMP")
    moduleTmpDir = os.path.join(tmpDir, "debug", module)
    try:
        if os.path.exists(moduleTmpDir):
            shutil.rmtree(moduleTmpDir)
        os.makedirs(moduleTmpDir, exist_ok=True)
        log(4,"INFO: Creating folder for debug {0}".format(moduleTmpDir))
    except:
        log(0,"ERROR: Unable to create {0}".format(moduleTmpDir))

def writeDebugImage(module, fileName, image):
    tmpDir = getEnvironmentVariable("ALLSKY_TMP")
    debugDir = os.path.join(tmpDir, "debug", module)
    os.makedirs(debugDir, mode = 0o777, exist_ok = True)
    moduleTmpFile = os.path.join(debugDir, fileName)
    cv2.imwrite(moduleTmpFile, image, params=None)
    log(4,"INFO: Wrote debug file {0}".format(moduleTmpFile))

def setupForCommandLine():
    global ALLSKYPATH, LOGLEVEL

    try:
        ALLSKYPATH = os.environ["ALLSKY_HOME"]
    except KeyError:
        ALLSKYPATH = "/home/pi/allsky"

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

    """ XXXXX TODO: config.sh is gone.   readConfig() """
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

""" XXXXX TODO: ftp-settings.sh is gone and this function is never used. """
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

    settingsFile = getEnvironmentVariable("SETTINGS_FILE")
    if settingsFile is None:
        """ XXXXX TODO: it's a major error if the settings file doesn't exist. Do not continue. """
        camera = getEnvironmentVariable("CAMERA_TYPE")
        if camera is None:
            camera = CONFIG["CAMERA"]

        settingsFile = os.path.join(getEnvironmentVariable("ALLSKY_CONFIG"), "settings_" + camera + ".json")

    with open(settingsFile, "r") as fp:
        SETTINGS = json.load(fp)

    LOGLEVEL = int(getSetting("_debuglevel"))

def getSetting(settingName):
    global SETTINGS

    if not SETTINGS:
        readSettings()

    result = None
    try:
        result = SETTINGS[settingName]
    except Exception:
        pass

    return result

def writeSettings():
    global SETTINGS

    settingsFile = getEnvironmentVariable("SETTINGS_FILE")
    if settingsFile is None:
        """ XXXXX TODO: it's a major error if the settings file doesn't exist. Do not continue. """
        camera = getEnvironmentVariable("CAMERA_TYPE")
        if camera is None:
            camera = CONFIG["CAMERA"]

        settingsFile = os.path.join(getEnvironmentVariable("ALLSKY_CONFIG"), "settings_" + camera + ".json")

    with open(settingsFile, "w") as fp:
        json.dump(SETTINGS, fp, indent=4)

def updateSetting(values):
    readSettings()
    for value in values:
        SETTINGS.update(value)

    writeSettings()

def getConfig(settingName):
    result = None
    try:
        result = CONFIG[settingName]
    except Exception:
        pass

    return result

def setupParams(params, metaData):
    """ XXXXX TODO: config.sh is gone.   readConfig() """

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
            sys.exit(98)

    return result

def log(level, text, preventNewline = False, exitCode=None):
    """ Very simple method to log data if in verbose mode """
    if LOGLEVEL >= level:
        if preventNewline:
            print(text, end="")
        else:
            print(text)

    if exitCode is not None:
        sys.exit(exitCode)

def initDB():
    global DBDATA
    tmpDir = getEnvironmentVariable('ALLSKY_TMP')
    dbFile = os.path.join(tmpDir, 'allskydb.py')
    if not os.path.isfile(dbFile):
        file = open(dbFile, 'w+')
        file.write('DataBase = {}')
        file.close()

    try:
        sys.path.insert(1, tmpDir)
        database = __import__('allskydb')
        DBDATA = database.DataBase
    except:
        DBDATA = {}
        log(0, "ERROR: Allsy database corrupted - Resetting")

def dbAdd(key, value):
    global DBDATA
    DBDATA[key] = value
    writeDB()

def dbUpdate(key, value):
    global DBDATA
    DBDATA[key] = value
    writeDB()

def dbDeleteKey(key):
    global DBDATA
    if dbHasKey(key):
        del DBDATA[key]
        writeDB()
    
def dbHasKey(key):
    global DBDATA
    return (key in DBDATA)

def dbGet(key):
    global DBDATA
    if dbHasKey(key):
        return DBDATA[key]
    else:
        return None

def writeDB():
    global DBDATA
    tmpDir = getEnvironmentVariable('ALLSKY_TMP')
    dbFile = os.path.join(tmpDir, 'allskydb.py')
    file = open(dbFile, 'w+')
    file.write('DataBase = ')
    file.write(str(DBDATA))
    file.close()

def isFileWriteable(fileName):
    """ Check if a file exists and can be written to """
    if os.path.exists(fileName):
        if os.path.isfile(fileName):
            return os.access(fileName, os.W_OK)
        else:
            return False
    else:
        return False

def isFileReadable(fileName):

    """ Check if a file is readable """
    if os.path.exists(fileName):
        if os.path.isfile(fileName):
            return os.access(fileName, os.R_OK)
        else:
            return False
    else:
        return False

def int(val):
    if not isinstance(val, str):
        val = locale.str(val)
    val = locale.atoi(val)

    return val

def float(val):
    if not isinstance(val, str):
        val = locale.str(val)
    val = locale.atof(val)

    return val

def saveExtraData(fileName, extraData):
    extraDataPath = getEnvironmentVariable("ALLSKY_EXTRA")
    if extraDataPath is not None:
        checkAndCreateDirectory(extraDataPath)
        extraDataFilename = os.path.join(extraDataPath, fileName)
        with open(extraDataFilename, "w") as file:
            formattedJSON = json.dumps(extraData, indent=4)
            file.write(formattedJSON)

def deleteExtraData(fileName):
    extraDataPath = getEnvironmentVariable("ALLSKY_EXTRA")
    if extraDataPath is not None:
        extraDataFilename = os.path.join(extraDataPath, fileName)
        if os.path.exists(extraDataFilename):
            if isFileWriteable(extraDataFilename):
                os.remove(extraDataFilename)

def cleanupModule(moduleData):
    if "cleanup" in moduleData:
        if "files" in moduleData["cleanup"]:
            for fileName in moduleData["cleanup"]["files"]:
                deleteExtraData(fileName)

        if "env" in moduleData["cleanup"]:
            for envVariable in moduleData["cleanup"]["env"]:
                os.environ.pop(envVariable, None)
                                
def getGPIOPin(pin):
    result = None
    if pin == 0:
        result = board.D0

    if pin == 1:
        result = board.D1

    if pin == 2:
        result = board.D2

    #SDA = pin.SDA

    if pin == 3:
        result = board.D3

    #SCL = pin.SCL

    if pin == 4:
        result = board.D4

    if pin == 5:
        result = board.D5

    if pin == 6:
        result = board.D6

    if pin == 7:
        result = board.D7

    #CE1 = pin.D7

    if pin == 8:
        result = board.D8

    #CE0 = pin.D8

    if pin == 9:
        result = board.D9

    #MISO = pin.D9

    if pin == 10:
        result = board.D10

    #MOSI = pin.D10

    if pin == 11:
        result = board.D11

    #SCLK = pin.D11
    #SCK = pin.D11

    if pin == 12:
        result = board.D12

    if pin == 13:
        result = board.D13

    if pin == 14:
        result = board.D14

    #TXD = pin.D14

    if pin == 15:
        result = board.D15

    #RXD = pin.D15

    if pin == 16:
        result = board.D16

    if pin == 17:
        result = board.D17

    if pin == 18:
        result = board.D18

    if pin == 19:
        result = board.D19

    #MISO_1 = pin.D19

    if pin == 20:
        result = board.D20

    #MOSI_1 = pin.D20

    if pin == 21:
        result = board.D21

    #SCLK_1 = pin.D21
    #SCK_1 = pin.D21

    if pin == 22:
        result = board.D22

    if pin == 23:
        result = board.D23

    if pin == 24:
        result = board.D24

    if pin == 25:
        result = board.D25

    if pin == 26:
        result = board.D26

    if pin == 27:
        result = board.D27

    return result
