'''
allsky_shared.py

Part of allsky postprocess.py modules.
https://github.com/AllskyTeam/allsky

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

def getEnvironmentVariable(name, fatal=False):
    result = None

    try:
        result = os.environ[name]
    except KeyError:
        if fatal:
            log(0, f"ERROR: Environment variable '{name}' not found.", exitCode=98)

    return result


# These must exist and are used in several places.
ALLSKYPATH = getEnvironmentVariable("ALLSKY_HOME", fatal=True)
TMPDIR = getEnvironmentVariable("ALLSKY_TMP", fatal=True)
SETTINGSFILE = getEnvironmentVariable("SETTINGS_FILE", fatal=True)


LOGLEVEL = 0
SETTINGS = {}
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

def convertLatLonOld(input):
    """ Converts the lat and lon to decimal notation i.e. 0.2E becomes -0.2"""
    multiplier = 1 if input[-1] in ['N', 'E'] else -1
    return multiplier * sum(float(x) / 60 ** n for n, x in enumerate(input[:-1].split('-')))

def convertLatLon(input):
    """ lat and lon can either be a positive or negative float, or end with N, S, E,or W. """
    """ If in  N, S, E, W format, 0.2E becomes -0.2 """
    nsew = 1 if input[-1] in ['N', 'S', 'E', 'W'] else 0
    if nsew:
        multiplier = 1 if input[-1] in ['N', 'E'] else -1
        ret = multiplier * sum(float(x) / 60 ** n for n, x in enumerate(input[:-1].split('-')))
    else:
        ret = float(input)
    return ret

def skyClear():
    skyState = "unknown"
    skyStateFlag = True
    X = getEnvironmentVariable("AS_SKYSTATE")
    if X is not None:
        if X == "Clear":
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
    X = getEnvironmentVariable("AS_ALLSKYRAINFLAG")
    if X is not None:
        rainingFlag = X
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
            value = getEnvironmentVariable(envVar, fatal=True)
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
    global TMPDIR

    moduleTmpDir = os.path.join(TMPDIR, "debug", module)
    try:
        if os.path.exists(moduleTmpDir):
            shutil.rmtree(moduleTmpDir)
        os.makedirs(moduleTmpDir, exist_ok=True)
        log(4, f"INFO: Creating folder for debug {moduleTmpDir}")
    except:
        log(0, f"ERROR: Unable to create {moduleTmpDir}")


def writeDebugImage(module, fileName, image):
    global TMPDIR

    debugDir = os.path.join(TMPDIR, "debug", module)
    os.makedirs(debugDir, mode = 0o777, exist_ok = True)
    moduleTmpFile = os.path.join(debugDir, fileName)
    cv2.imwrite(moduleTmpFile, image, params=None)
    log(4,"INFO: Wrote debug file {0}".format(moduleTmpFile))


def setEnvironmentVariable(name, value, logMessage='', logLevel=4):
    result = True

    try:
        os.environ[name] = value
        if logMessage != '':
            log(logLevel, logMessage)
    except:
        result = False
        log(2, f'ERROR: Failed to set environment variable {name} to value {value}')

    return result


def setupForCommandLine():
    global ALLSKYPATH, LOGLEVEL

    command = shlex.split("bash -c 'source " + ALLSKYPATH + "/variables.sh && env'")
    proc = subprocess.Popen(command, stdout = subprocess.PIPE)
    for line in proc.stdout:
        line = line.decode(encoding='UTF-8')
        line = line.strip("\n")
        line = line.strip("\r")
        try:
            (key, _, value) = line.partition("=")
            setEnvironmentVariable(key, value)
        except Exception:
            pass
    proc.communicate()

    readSettings()

####### settings file functions
def readSettings():
    global SETTINGS, SETTINGSFILE

    with open(SETTINGSFILE, "r") as fp:
        SETTINGS = json.load(fp)

    LOGLEVEL = int(getSetting("debuglevel"))

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
    global SETTINGS, SETTINGSFILE

    with open(SETTINGSFILE, "w") as fp:
        json.dump(SETTINGS, fp, indent=4)

def updateSetting(values):
    readSettings()
    for value in values:
        SETTINGS.update(value)

    writeSettings()


def var_dump(variable):
    pprint.PrettyPrinter(indent=2, width=128).pprint(variable)


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
    global DBDATA, TMPDIR

    dbFile = os.path.join(TMPDIR, 'allskydb.py')
    if not os.path.isfile(dbFile):
        file = open(dbFile, 'w+')
        file.write('DataBase = {}')
        file.close()

    try:
        sys.path.insert(1, TMPDIR)
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
    global DBDATA, TMPDIR

    dbFile = os.path.join(TMPDIR, 'allskydb.py')
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

def asfloat(val):
    localDP = ','

    if not isinstance(val, str):
        val = locale.str(val)

    val = val.replace(localDP, '.')
    val = float(val)

    return val

def getExtraDir():
    return getEnvironmentVariable("ALLSKY_EXTRA", fatal=True)

def saveExtraData(fileName, extraData):
    extraDataPath = getExtraDir()
    if extraDataPath is not None:               # it should never be None
        checkAndCreateDirectory(extraDataPath)
        extraDataFilename = os.path.join(extraDataPath, fileName)
        with open(extraDataFilename, "w") as file:
            formattedJSON = json.dumps(extraData, indent=4)
            file.write(formattedJSON)

def deleteExtraData(fileName):
    extraDataPath = getExtraDir()
    if extraDataPath is not None:               # it should never be None
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
