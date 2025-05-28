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
import sqlite3
import mysql.connector
import math
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
import shlex
from pathlib import Path
from functools import reduce

from allskyvariables import allskyvariables

from astropy.stats import sigma_clipped_stats
from photutils.detection import DAOStarFinder

from gpiozero import Device, CPUTemperature
import pigpio

import numpy as np

from typing import Union, List, Dict

try:
    locale.setlocale(locale.LC_ALL, '')
except:
    pass

ABORT = True

def get_environment_variable(name, fatal=False, debug=False):
    return getEnvironmentVariable(name, fatal, debug)
def getEnvironmentVariable(name, fatal=False, debug=False):
	global ALLSKY_TMP

	result = None

	if not debug:
		try:
			result = os.environ[name]
		except KeyError:
			if fatal:
				log(0, f"ERROR: Environment variable '{name}' not found.", exitCode=98)
	else:
		db_file = os.path.join(ALLSKY_TMP, 'allskydebugdb.py')
		if not os.path.isfile(db_file):
			file = open(db_file, 'w+')
			file.write('DataBase = {}')
			file.close()

		try:
			sys.path.insert(1, ALLSKY_TMP)
			database = __import__('allskydebugdb')
			DBDEBUGDATA = database.DataBase
		except:
			DBDEBUGDATA = {}
			log(0, f"ERROR: Resetting corrupted Allsky database '{db_file}'")

		if name in DBDEBUGDATA['os']:
			result = DBDEBUGDATA['os'][name]

	return result

# These must exist and are used in several places.
ALLSKYPATH = getEnvironmentVariable("ALLSKY_HOME", fatal=True)
ALLSKY_TMP = getEnvironmentVariable("ALLSKY_TMP", fatal=True)
ALLSKY_SCRIPTS = getEnvironmentVariable("ALLSKY_SCRIPTS", fatal=True)
SETTINGS_FILE = getEnvironmentVariable("SETTINGS_FILE", fatal=True)
ALLSKY_OVERLAY = getEnvironmentVariable("ALLSKY_OVERLAY", fatal=True)
ALLSKY_WEBUI = getEnvironmentVariable("ALLSKY_WEBUI", fatal=True)
ALLSKY_MODULES = getEnvironmentVariable("ALLSKY_MODULES", fatal=True)
SETTINGS_FILE = getEnvironmentVariable("SETTINGS_FILE", fatal=True)

LOGLEVEL = 0
SETTINGS = {}
TOD = ''
DBDATA = {}

PI_INFO_MODEL = 1
Pi_INFO_CPU_TEMPERATURE = 2

def get_secrets(keys: Union[str, List[str]]) -> Union[str, Dict[str, str], None]:
    """
    Retrieve secret(s) from the given JSON file.

    :param keys: A single key (str) or a list of keys to retrieve.
    :param file_path: Path to the secrets JSON file.
    :return: Value (str) if one key, or dict of key-value pairs if multiple keys.
                Returns None or empty dict if keys not found.
    """
    single = isinstance(keys, str)
    if single:
        keys = [keys]

    try:
        file_path = os.path.join(ALLSKYPATH, 'env.json')
        with open(file_path, 'r') as f:
            secrets = json.load(f)

        results = {k: secrets[k] for k in keys if k in secrets}

        if single:
            return results.get(keys[0])
        return results

    except (IOError, json.JSONDecodeError) as e:
        print(f"Error reading secrets file: {e}")
        return None if single else {}
    
def get_lat_lon():
	lat = None
	lon = None

	temp_lat = get_setting('latitude')
	if temp_lat != '':
		lat = convert_lat_lon(temp_lat)
	temp_lon = get_setting('longitude')
	if temp_lon != '':
		lon = convert_lat_lon(temp_lon)

	return lat, lon

def get_pi_info(info):
    resukt = None
    
    if info == PI_INFO_MODEL:
        Device.ensure_pin_factory()
        pi_info = Device.pin_factory.board_info
        result = pi_info.model

    if info == Pi_INFO_CPU_TEMPERATURE:
        result = CPUTemperature().temperature
                            
    return result
        
def obfuscate_secret(secret, visible_chars=3):
    return secret[:visible_chars] + '*' * (len(secret) - visible_chars)

def create_cardinal(degrees):
	try:
		cardinals = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW','W', 'WNW', 'NW', 'NNW', 'N']
		cardinal = cardinals[round(degrees / 22.5)]
	except Exception:
		cardinal = 'N/A'

	return cardinal

def should_run(module, period):
    return shouldRun(module, period)
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

def set_last_run(module):
	setLastRun(module)
def setLastRun(module):
    dbKey = module + "_lastrun"
    now = time.time()
    dbUpdate(dbKey, now)

def convertLatLonOld(input):
    """ Converts the lat and lon to decimal notation i.e. 0.2E becomes -0.2"""
    input = input.upper()
    multiplier = 1 if input[-1] in ['N', 'E'] else -1
    return multiplier * sum(float(x) / 60 ** n for n, x in enumerate(input[:-1].split('-')))

def convert_lat_lon(input):
	return convertLatLon(input)
def convertLatLon(input):
    """ lat and lon can either be a positive or negative float, or end with N, S, E,or W. """
    """ If in  N, S, E, W format, 0.2E becomes -0.2 """

    """ #4220 Ensure that the passed in value is always a string"""
    input = str(input).upper()
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

def write_debug_image(module, fileName, image):
	writeDebugImage(module, fileName, image)

def writeDebugImage(module, fileName, image):
    global ALLSKY_WEBUI

    debugDir = os.path.join(ALLSKY_WEBUI, "debug", module)
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

def get_setting(settingName):
    return getSetting(settingName)
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

def db_add(key, value):
    dbAdd(key, value) 
def dbAdd(key, value):
    global DBDATA
    DBDATA[key] = value
    writeDB()

def db_update(key, value):
    return dbUpdate(key, value)
def dbUpdate(key, value):
    global DBDATA
    DBDATA[key] = value
    writeDB()

def db_delete_key(key):
    dbDeleteKey(key)
def dbDeleteKey(key):
    global DBDATA
    if dbHasKey(key):
        del DBDATA[key]
        writeDB()

def db_has_key(key):
	return dbHasKey(key)
def dbHasKey(key):
    global DBDATA
    return (key in DBDATA)

def db_get(key):
    return dbGet(key)
def dbGet(key):
    global DBDATA
    if dbHasKey(key):
        return DBDATA[key]
    else:
        return None

def write_env_to_db():
	global ALLSKY_TMP

	dbFile = os.path.join(ALLSKY_TMP, 'allskydebugdb.py')
	if not os.path.isfile(dbFile):
		file = open(dbFile, 'w+')
		file.write('DataBase = {}')
		file.close()

	try:
		sys.path.insert(1, ALLSKY_TMP)
		database = __import__('allskydebugdb')
		DBDEBUGDATA = database.DataBase
	except:
		DBDEBUGDATA = {}
		log(0, f"ERROR: Resetting corrupted Allsky database '{dbFile}'")

	DBDEBUGDATA['os'] = {}	
	for key, value in os.environ.items():            
		DBDEBUGDATA['os'][key] = value

	file = open(dbFile, 'w+')
	file.write('DataBase = ')
	file.write(str(DBDEBUGDATA))
	file.close()
    
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

def is_file_readable(file_name):
    return isFileReadable(file_name)
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

def check_mysql_connection(host, user, password, database=None, port=3306):
    try:
        conn = mysql.connector.connect(
            host=host,
            user=user,
            password=password,
            database=database,
            port=port
        )
        if conn.is_connected():
            conn.close()
            return True
    except Exception as e:
        log(0, f'ERROR: Database is configured as mysql but cannot connect')
        pass
    return False

def get_database_config():
    secret_data = get_secrets(['databasehost', 'databaseuser', 'databasepassword', 'databasedatabase'])
    secret_data['databasetype'] = get_setting('databasetype')
    
    return secret_data

def update_database(structure, extra_data):
    secret_data = get_database_config()

    if not re.fullmatch(r'[a-zA-Z_][a-zA-Z0-9_]*', secret_data['databasedatabase']):
        log(0, f"ERROR: Database table name {secret_data['databasedatabase']} is invalid")
        return

    if secret_data['databasetype'] == 'mysql':
        if check_mysql_connection(secret_data['databasehost'],secret_data['databaseuser'],secret_data['databasepassword']):
            update_mysql_database(structure, extra_data, secret_data)
    
    if secret_data['databasetype'] == 'sqlite':
        update_sqlite_database(structure, extra_data, secret_data)

def update_sqlite_database(structure, extra_data, secret_data):
    db_path = os.path.join(ALLSKYPATH, 'config', 'myFiles', 'allsky.db')
    try:
        if 'enabled' in structure['database']:
            if structure['database']['enabled']:
                if 'table' in structure['database']:
                    database_table = structure['database']['table']
                    
                    json_str = json.dumps(extra_data)
                    timestamp = math.floor(time.time())

                    # Use a context manager to ensure safe connection handling
                    with sqlite3.connect(db_path, timeout=10) as conn:
                        #conn.execute('PRAGMA journal_mode = WAL')  # Enables safe concurrent access
                        #conn.execute('PRAGMA synchronous = NORMAL')  # Balance between speed and safety
                        conn.execute(f'''
                            CREATE TABLE IF NOT EXISTS {database_table} (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                timestamp INTEGER NOT NULL,
                                json_data TEXT NOT NULL
                            )
                        ''')
                        conn.execute(f'''
                            INSERT INTO {database_table} (timestamp, json_data)
                            VALUES (?, ?)
                        ''', (timestamp, json_str))
                        conn.commit()

    except Exception as e:
        eType, eObject, eTraceback = sys.exc_info()            
        log(0, f'ERROR: Module update_database failed on line {eTraceback.tb_lineno} - {e}')
        
def update_mysql_database(structure, extra_data, secret_data):
    try:
        if 'enabled' in structure['database']:
            if structure['database']['enabled']:
                if 'table' in structure['database']:
                    database_table = structure['database']['table']
                    conn = mysql.connector.connect(
                        host=secret_data['databasehost'],
                        user=secret_data['databaseuser'],
                        password=secret_data['databasepassword'],
                        database=secret_data['databasedatabase']
                    )
                    
                    cursor = conn.cursor()
                    cursor.execute(f'CREATE TABLE IF NOT EXISTS {database_table} (id INT AUTO_INCREMENT PRIMARY KEY, timestamp BIGINT, json_data JSON)')
                    unix_timestamp = math.floor(time.time())
                    json_string = json.dumps(extra_data, separators=(",", ":"), ensure_ascii=True).replace("\n", "").replace("\r", "")
                    json_string = json_string.replace("\\n","").replace("\\r","").replace("\\","")
                    json_string = json.dumps(extra_data)
                    insert_query = f"INSERT INTO {database_table} (timestamp, json_data) VALUES (%s, %s)"
                    cursor.execute(insert_query, (unix_timestamp, json_string))

                    conn.commit()
                    cursor.close()
                    conn.close()

    except Exception as e:
        eType, eObject, eTraceback = sys.exc_info()            
        log(0, f'ERROR: Module update_database failed on line {eTraceback.tb_lineno} - {e}')

def save_extra_data(file_name, extra_data, source='', structure={}, custom_fields={}):
    saveExtraData(file_name, extra_data, source, structure, custom_fields)
def saveExtraData(file_name, extra_data, source='', structure={}, custom_fields={}):
	"""
	Save extra data to allows the overlay module to display it.

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

				if 'database' in structure:
					update_database(structure, extra_data)
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

def load_extra_data_file(file_name, type=''):
    result = {}
    extra_data_path = getExtraDir()
    if extra_data_path is not None:               # it should never be None
        extra_data_filename = os.path.join(extra_data_path, file_name)
        file_path = Path(extra_data_filename)
        if file_path.is_file() and isFileReadable(file_path):
            file_extension = Path(file_path).suffix

            if file_extension == '.json' or type == 'json':
                try:
                    with open(extra_data_filename, 'r') as file:
                        result = json.load(file)
                except json.JSONDecodeError:
                    log(0, f'Error reading extra_data_filename')
            
            if file_extension == '.txt':
                pass
            
    return result

def delete_extra_data(fileName):
	deleteExtraData(fileName)
def deleteExtraData(fileName):
    extraDataPath = getExtraDir()
    if extraDataPath is not None:               # it should never be None
        extraDataFilename = os.path.join(extraDataPath, fileName)
        if os.path.exists(extraDataFilename):
            if isFileWriteable(extraDataFilename):
                os.remove(extraDataFilename)

def is_just_filename(path):
    return os.path.basename(path) == path

def _load_flows_for_cleanup():
    flows = {}
    flow_names = ['day', 'night', 'periodic', 'nightday', 'daynight']
    for flow_name in flow_names:
        flow_file_name = os.path.join(ALLSKY_MODULES, f'postprocessing_{flow_name}.json')
        if is_file_readable(flow_file_name):
            with open(flow_file_name, 'r') as file:
                flows[flow_name] = json.load(file)
    return flows

def _load_module_settings():
    module_settings = {}
    module_settings_filename = os.path.join(ALLSKY_MODULES, f'module-settings.json')
    if is_file_readable(module_settings_filename):
        with open(module_settings_filename, 'r') as file:
            module_settings= json.load(file)
    return module_settings

def _get_dict_path(data, keys):
    try:
        return reduce(lambda d, k: d[k], keys, data)
    except (KeyError, TypeError):
        return None
    
def _get_expiry_time_for_module(flows, module_name, module_settings, tod):
    delete_age = 0
    
    module_name = module_name.replace('.json', '').replace('allsky_', '')
    
    delete_age = _get_dict_path(flows, [tod, module_name, 'metadata', 'arguments', 'dataage'])

    if delete_age is None:
        for flow in flows:
            if flow != tod:
                delete_age_tmp = _get_dict_path(flows, [flow, module_name, 'metadata', 'argumants', 'dataage'])
                if delete_age_tmp is not None:
                    delete_age_tmp = round(float(delete_age_tmp))
                    if delete_age_tmp > delete_age:
                        delete_age = delete_age_tmp                        
    else:
        delete_age = round(float(delete_age))
    
    if delete_age is None:
        delete_age = 600
        if 'expiryage' in module_settings:
            delete_age = round(module_settings['expiryage'])    
    
    return delete_age

def cleanup_extra_data():
    flows = _load_flows_for_cleanup()
    module_settings = _load_module_settings()
    tod = getEnvironmentVariable('DAY_OR_NIGHT', fatal=True).lower()

    extra_data_path = getExtraDir()
    with os.scandir(extra_data_path) as entries:
        for entry in entries: 
            if entry.is_file():
                delete_age = _get_expiry_time_for_module(flows, entry.name, module_settings, tod)
                cleanup_extra_data_file(entry.path, delete_age)
            
def cleanup_extra_data_file(file_name, delete_age=600):
    
    if (is_just_filename(file_name)):    
        extra_data_path = getExtraDir()
        if extra_data_path is not None:
            file_name = os.path.join(extra_data_path, file_name)

    if (isFileWriteable(file_name)):
        file_modified_time = round(os.path.getmtime(file_name))
        file_age = round(time.time() - file_modified_time)
        if (file_age > delete_age):
            log(4, f'INFO: Deleting extra data file {file_name} as its older than {delete_age} seconds')
            delete_extra_data(file_name)
        else:
            log(4, f'INFO: Not deleteing {file_name} as its {file_age} seconds old, threshhold is {delete_age}')
    else:
        log(4, f'ERROR: Cannot check extra data file {file_name} as it is not writeable')
            
    
def cleanup_module(moduleData):
    cleanupModule(moduleData)
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

def get_gpio_pin(pin):
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

def connect_pigpio(show_errors=False):
    pi = pigpio.pi(show_errors)
    
    return pi

def read_gpio_pin(gpio_pin, pi=None, show_errors=False):
    pin_state = None
    try:
        if pi is None:
            pi = pigpio.pi(show_errors=show_errors)
            
        if pi.connected:        
            pi.set_mode(gpio_pin, pigpio.INPUT)
            pin_state = pi.read(gpio_pin)
    except:
        pass
    
    return pin_state

def set_gpio_pin(gpio_pin, state, pi=None, show_errors=False):
    result = False
    try:
        if pi is None:
            pi = pigpio.pi(show_errors=show_errors)
            
        if pi.connected:        
            pi.set_mode(gpio_pin, pigpio.OUTPUT)
            pi.write(gpio_pin, state)
            result = True
    except:
        pass
    
    return result

def set_pwm(gpio_pin, duty_cycle, pi=None, show_errors=False):
    result = False
    try:
        if pi is None:
            pi = pigpio.pi(show_errors=False)
            
        if pi.connected:
            pi.set_PWM_range(gpio_pin, 100)
            pi.set_PWM_frequency(gpio_pin, 1_000)
            pi.set_PWM_dutycycle(gpio_pin, duty_cycle)
            result = True
    except:
        pass
    
    return result

def stop_pwm(gpio_pin):
    result = False
    try:
        if pi is None:
            pi = pigpio.pi(show_errors=False)
            
        if pi.connected:
            pi.set_PWM_dutycycle(self._fan_pin, 0)
            pi.stop()
            result = True
    except:
        pass

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

def get_all_allsky_variables(show_empty=True, module='', indexed=False, raw=False):
    return allskyvariables.get_variables(show_empty, module, indexed, raw)
    
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

def load_mask(mask_file_name, target_image):
    mask = None
    
    mask_path = os.path.join(ALLSKY_OVERLAY, 'images', mask_file_name)
    target_shape = target_image.shape[:2]
    
    mask = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
    if mask is not None:
        if (mask.shape[0] != target_shape[0]) or (mask.shape[1] != target_shape[1]):
            mask = cv2.resize(mask, (target_shape[1], target_shape[0]))
        mask = mask.astype(np.float32) / 255.0

    return mask

def mask_image(image, mask_file_name=''):
    output = None
    try:
        if mask_file_name != '':
            mask = load_mask(mask_file_name, image)
            if len(image.shape) == 2:
                image = image.astype(np.float32)
                output = image * mask
            else:
                image = image.astype(np.float32)
                if mask.ndim == 2:
                    mask = mask[..., np.newaxis]
                output = image * mask

            output =  np.clip(output, 0, 255).astype(np.uint8)
            
            log(4, f'INFO: Mask {mask_file_name} applied')
                
    except Exception as e:
        eType, eObject, eTraceback = sys.exc_info()
        result = f'mask_image failed on line {eTraceback.tb_lineno} - {e}'
        log(0,f'ERROR: {result}')

       
    return output
     
def count_starts_in_image(image, mask_file_name=None):
    # Convert to grayscale if it's RGB
    if image.ndim == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image

    if mask_file_name is not None and mask_file_name != '':
        gray = mask_image(gray, mask_file_name)

    # Convert to float for processing
    image_data = gray.astype(float)

    # Estimate background stats
    mean, median, std = sigma_clipped_stats(image_data, sigma=3.0)

    # Detect stars
    daofind = DAOStarFinder(fwhm=3.0, threshold=5.0*std)
    sources = daofind(image_data - median)
    
    return sources, image

def get_sensor_temperature():
    temperature = 0
    camera_type = get_camera_type()

    if camera_type == 'rpi':
        temperature = get_rpi_meta_value('SensorTemperature')
    else:
        temperature = get_environment_variable('AS_TEMPERATURE_C')
    
    if temperature == None:
        temperature = 0
    
    return float(temperature)

def get_camera_gain():
    gain = 0
    camera_type = get_camera_type()

    if camera_type == 'rpi':
        gain = get_rpi_meta_value('AnalogueGain')
    else:
        gain = get_environment_variable('AS_GAIN')
    
    if gain == None:
        gain = 0
        
    return float(gain)
    
def get_camera_type():
    camera_type = get_environment_variable('CAMERA_TYPE')
    return camera_type.lower()

def get_rpi_meta_value(key):
    result = None
    metadata_path = get_rpi_metadata()
    
    if metadata_path is not None:
        try:
            with open(metadata_path, 'r') as file:
                metadata = json.load(file)
                if key in metadata:
                    result = metadata[key]
        except json.JSONDecodeError as e:
            with open(metadata_path, 'r') as f:
                for line in f:
                    if line.startswith(key + "="):
                        result = line.split("=", 1)[1].strip()
            
    return result

def get_rpi_metadata():

    with open(SETTINGS_FILE) as file:
        config = json.load(file)

    extraargs = config.get('extraargs', '')
    args = shlex.split(extraargs)

    metadata_path = None
    for i, arg in enumerate(args):
        if arg == '--metadata' and i + 1 < len(args):
            metadata_path = args[i + 1]
            break
    if metadata_path is None:
        metadata_path = os.path.join(ALLSKY_TMP,'metadata.txt')

    return metadata_path