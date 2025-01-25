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
import locale
import tempfile
import pathlib
from pathlib import Path

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
ALLSKY_TMP = getEnvironmentVariable("ALLSKY_TMP", fatal=True)
ALLSKY_SCRIPTS = getEnvironmentVariable("ALLSKY_SCRIPTS", fatal=True)
SETTINGS_FILE = getEnvironmentVariable("SETTINGS_FILE", fatal=True)
ALLSKY_OVERLAY = getEnvironmentVariable("ALLSKY_OVERLAY", fatal=True)

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
    input = input.upper()
    multiplier = 1 if input[-1] in ['N', 'E'] else -1
    return multiplier * sum(float(x) / 60 ** n for n, x in enumerate(input[:-1].split('-')))

def convertLatLon(input):
    """ lat and lon can either be a positive or negative float, or end with N, S, E,or W. """
    """ If in  N, S, E, W format, 0.2E becomes -0.2 """
    input = input.upper()
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
        envVar = variable.replace("${", "").replace("}", "")

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
    global ALLSKY_TMP

    moduleTmpDir = os.path.join(ALLSKY_TMP, "debug", module)
    try:
        if os.path.exists(moduleTmpDir):
            shutil.rmtree(moduleTmpDir)
        os.makedirs(moduleTmpDir, exist_ok=True)
        log(4, f"INFO: Creating folder for debug {moduleTmpDir}")
    except:
        log(0, f"ERROR: Unable to create {moduleTmpDir}")

def writeDebugImage(module, fileName, image):
    global ALLSKY_TMP

    debugDir = os.path.join(ALLSKY_TMP, "debug", module)
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
    global ALLSKYPATH

    command = shlex.split("bash -c 'source " + ALLSKYPATH + "/variables.sh && env'")
    proc = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
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
    global SETTINGS, SETTINGS_FILE, LOGLEVEL

    with open(SETTINGS_FILE, "r") as fp:
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
    global SETTINGS, SETTINGS_FILE

    with open(SETTINGS_FILE, "w") as fp:
        json.dump(SETTINGS, fp, indent=4)

def updateSetting(values):
    global SETTINGS

    readSettings()
    for value in values:
        SETTINGS.update(value)

    writeSettings()

def var_dump(variable):
    pprint.PrettyPrinter(indent=2, width=128).pprint(variable)

def log(level, text, preventNewline = False, exitCode=None, sendToAllsky=False):
    """ Very simple method to log data if in verbose mode """
    global LOGLEVEL, ALLSKY_SCRIPTS

    if LOGLEVEL >= level:
        if preventNewline:
            print(text, end="")
        else:
            print(text)

    if sendToAllsky and level == 0:
        # Need to escape single quotes in {text}.
        doubleQuote = '"'
        text = text.replace("'", f"'{doubleQuote}'{doubleQuote}'")
        command = os.path.join(ALLSKY_SCRIPTS, f"addMessage.sh error '{text}'")
        os.system(command)
    
    if exitCode is not None:
        sys.exit(exitCode)

def initDB():
    global DBDATA, ALLSKY_TMP

    dbFile = os.path.join(ALLSKY_TMP, 'allskydb.py')
    if not os.path.isfile(dbFile):
        file = open(dbFile, 'w+')
        file.write('DataBase = {}')
        file.close()

    try:
        sys.path.insert(1, ALLSKY_TMP)
        database = __import__('allskydb')
        DBDATA = database.DataBase
    except:
        DBDATA = {}
        log(0, f"ERROR: Resetting corrupted Allsky database '{dbFile}'")

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
    global DBDATA, ALLSKY_TMP

    dbFile = os.path.join(ALLSKY_TMP, 'allskydb.py')
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

def validateExtraFileName(params, module, fileKey):
    
    fileBits = os.path.splitext(params[fileKey])
    fileName = fileBits[0].strip()
    fileExtension = fileBits[1].strip()
    
    if fileExtension == '':
        fileExtension = '.json'
        
    if fileName == '':
        fileName = module

    extraDataFilename = fileName + fileExtension
                    
    params[fileKey] = extraDataFilename
            
def save_extra_data(file_name, extra_data, source='', structure={}, custom_fields={}):
    saveExtraData(file_name, extra_data, source, structure, custom_fields)

def saveExtraData(file_name, extra_data, source='', structure={}, custom_fields={}):
	"""
	Save extra data to allows the overlay module to disdplay it.

	Args:
		file_name (string): The name of the file to save.
		extra_data (object): The data to save.

	Returns:
		Nothing
	"""
	try:
		extra_data_path = getExtraDir()
		if extra_data_path is not None:        
			checkAndCreateDirectory(extra_data_path)

			file_extension = Path(file_name).suffix
			extra_data_filename = os.path.join(extra_data_path, file_name)
			with tempfile.NamedTemporaryFile(mode="w", delete=False) as temp_file:
				if file_extension == '.json':
					extra_data = format_extra_data(extra_data, structure, source)
					if len(custom_fields) > 0:
						for key, value in custom_fields.items():
							extra_data[key] = value
					extra_data = json.dumps(extra_data, indent=4)
					temp_file.write(extra_data)
				temp_file_name = temp_file.name
				os.chmod(temp_file_name, 0o644)

			shutil.move(temp_file_name, extra_data_filename)
	except Exception as e:
		eType, eObject, eTraceback = sys.exc_info()            
		log(0, f'ERROR: Module saveExtraData failed on line {eTraceback.tb_lineno} - {e}')
         

def format_extra_data(extra_data, structure, source):
    result = extra_data

    if structure:
        result = {}
        counter = 2
        blank_first_entry = False
        if 'info' in structure:
            if 'count' in structure['info']:
                counter = structure['info']['count']
            if 'firstblank' in structure['info']:
                blank_first_entry = structure['info']['firstblank']

        for valueItr in range(1, counter):
            index = valueItr
            if blank_first_entry and valueItr == 1:
                index = ''
            else:
                index = index - 1

            for raw_key, value in structure['values'].items():
                key = raw_key.replace('${COUNT}', str(index))
                if key in extra_data:

                    result[key] = dict(structure['values'][raw_key])
                    result[key]['source'] = source
                    result[key]["value"] = extra_data[key]

                    description = structure['values'][raw_key]['description']
                    description = description.replace('${COUNT}', str(index))
                    result[key]["description"] = description

                    if 'name' in result[key]:
                        result[key]['name'] = result[key]['name'].replace('${COUNT}', str(index))

                    regex = r"\$\{.*?\}"
                    matches = re.finditer(regex, description, re.MULTILINE | re.IGNORECASE)
                    placeHolder = ''
                    for matchNum, match in enumerate(matches, start=1):
                        replacement = ""
                        raw_matched = match.group()

                        placeHolder = raw_matched.replace("${", "")
                        placeHolder = placeHolder.replace("}", "")

                    if placeHolder in extra_data:
                        replacement = extra_data[placeHolder]
                        result[key]["description"] = description.replace(raw_matched, replacement)
                else:
                    pass
                    #log(0, f"ERROR: {key} not found in module config")
    return result


def load_extra_data_file(file_name):
    result = {}
    extra_data_path = getExtraDir()
    if extra_data_path is not None:               # it should never be None
        extra_data_filename = os.path.join(extra_data_path, file_name)
        file_path = Path(extra_data_filename)
        if file_path.is_file() and isFileReadable(file_path):
            file_extension = Path(file_path).suffix

            if file_extension == '.json':
                try:
                    with open(extra_data_filename, 'r') as file:
                        result = json.load(file)
                except json.JSONDecodeError:
                    log(0, f'Error reading extra_data_filename')
            
            if file_extension == '.txt':
                pass
            
    return result

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

def createTempDir(path):
    if not os.path.isdir(path):
        umask = os.umask(0o000)
        os.makedirs(path, mode=0o777)
        os.umask(umask)

def get_gpio_pin_details(pin):
    return getGPIOPin(pin)
            
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

def _get_value_from_json_file(file_path, variable):
    """
    Loads a json based extra data file and returns the value of a variable if found

    Args:
        variable (string): The varible to get

    Returns:
        result (various) The result or None if the variable could not be found
    """
    result = None
    try:
        with open(file_path, encoding='utf-8') as file:
            json_data = json.load(file)
            for (name, value_data) in json_data.items():
                if name == variable:
                    if isinstance(value_data, dict):
                        if 'value' in value_data:
                            result = value_data['value']
                    else:
                        result = value_data
    except: # pylint: disable=W0702
        pass

    return result

def _get_value_from_text_file(file_path, variable):
    """
    Loads a text based extra data file and returns the value of a variable if found

    Args:
        variable (string): The varible to get

    Returns:
        result (various) The result or None if the variable could not be found
    """
    result = None

    with open(file_path, encoding='utf-8') as file:
        for line in file:
            name, value = line.partition("=")[::2]
            name = name.rstrip()
            value = value.lstrip()
            value = value.strip()
            if name == variable:
                result = value
                break

    return result   

def get_allsky_variable(variable):
    """
    Gets an Allsky variable either from the environment or extra data files

    Args:
        variable (string): The varible to get

    Returns:
        result (various) The result or None if the variable could not be found
    """
    result = getEnvironmentVariable(variable)

    if result is None:
        extra_data_path = getExtraDir()
        directory = Path(extra_data_path)

        for file_path in directory.iterdir():
            if file_path.is_file() and isFileReadable(file_path):

                file_extension = Path(file_path).suffix

                if file_extension == '.json':
                    result = _get_value_from_json_file(file_path, variable)

                if file_extension == '.txt':
                    result = _get_value_from_text_file(file_path, variable)

            if result is not None:
                break

    return result