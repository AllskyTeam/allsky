'''
allsky_shared.py

Part of allsky postprocess.py modules.
https://github.com/AllskyTeam/allsky

This module is a common dumping ground for shared variables and functions.
'''
import time
import os
import pprint
import shlex
import subprocess
import requests
import json
import sqlite3
import mysql.connector
import math
import shutil
import re
import sys
import time
import locale
import tempfile
import shlex
import board
import busio
import importlib
import requests
import grp
import builtins
import pwd
from pathlib import Path
from functools import reduce
from allskyvariables.allskyvariables import ALLSKYVARIABLES
import pigpio
import numpy as np
import numpy.typing as npt
from typing import Union, List, Dict, Any, Tuple, Sequence, Optional

 
try:
    locale.setlocale(locale.LC_ALL, '')
except:
    pass

ABORT = True

def get_environment_variable(name, fatal=False, debug=False, try_allsky_debug_file=False):
    return getEnvironmentVariable(name, fatal, debug)
def getEnvironmentVariable(name, fatal=False, debug=False, try_allsky_debug_file=False):
    global ALLSKY_TMP

    result = None

    if not debug:
        result = read_environment_variable(name)
        if result == None:    
            if try_allsky_debug_file:
                result = get_value_from_debug_data(name)
            else:
                setup_for_command_line()
                result = read_environment_variable(name)
                
            if result == None and fatal:
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
            #log(4, f"ERROR: Resetting corrupted Allsky database '{db_file}'")

        if name in DBDEBUGDATA['os']:
            result = DBDEBUGDATA['os'][name]

    return result

def read_environment_variable(name):
    result = None
    try:
        result = os.environ[name]
    except KeyError:
        result = None        
    
    return result

# These must exist and are used in several places.
ALLSKYPATH = getEnvironmentVariable("ALLSKY_HOME", fatal=True)
ALLSKY_TMP = getEnvironmentVariable("ALLSKY_TMP", fatal=True)
ALLSKY_CURRENT_DIR = getEnvironmentVariable("ALLSKY_CURRENT_DIR", fatal=True)
ALLSKY_SCRIPTS = getEnvironmentVariable("ALLSKY_SCRIPTS", fatal=True)
ALLSKY_SETTINGS_FILE = getEnvironmentVariable("ALLSKY_SETTINGS_FILE", fatal=True)
ALLSKY_OVERLAY = getEnvironmentVariable("ALLSKY_OVERLAY", fatal=True)
ALLSKY_WEBUI = getEnvironmentVariable("ALLSKY_WEBUI", fatal=True)
ALLSKY_MODULES = getEnvironmentVariable("ALLSKY_MODULES", fatal=True)

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
    from gpiozero import Device, CPUTemperature
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

def check_and_create_directory(file_path):
    checkAndCreateDirectory(file_path)
def checkAndCreateDirectory(file_path):
    os.makedirs(file_path, mode = 0o777, exist_ok = True)

def checkAndCreatePath(file_path):
    path = os.path.dirname(file_path)
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
    import cv2
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


def setup_for_command_line():
    setupForCommandLine()
def setupForCommandLine():
    global ALLSKYPATH
    
    json_variables = f"{ALLSKYPATH}/variables.json"
    with open(json_variables, 'r') as file:
        json_data = json.load(file)

    for key, value in json_data.items():
        os.environ[str(key)] = str(value)
    
    VARIABLES = json_data
    readSettings()

####### settings file functions
def readSettings():
    global SETTINGS, ALLSKY_SETTINGS_FILE, LOGLEVEL

    with open(ALLSKY_SETTINGS_FILE, "r") as fp:
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
    global SETTINGS, ALLSKY_SETTINGS_FILE

    with open(ALLSKY_SETTINGS_FILE, "w") as fp:
        json.dump(SETTINGS, fp, indent=4)

def update_settings(values):
    global SETTINGS

    readSettings()
    SETTINGS.update(values)

    writeSettings()    
    
def update_setting(values):
    updateSetting(values)
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

    if sendToAllsky or level == 0:
        if level == 0:
            type = "error"
        else:
            type = "warning"
        # Need to escape single quotes in {text}.
        doubleQuote = '"'
        text = text.replace("'", f"'{doubleQuote}'{doubleQuote}'")
        command = os.path.join(ALLSKY_SCRIPTS, f"addMessage.sh --type {type} --msg '{text}'")
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

def create_file_web_server_access(file_name):
    import grp
    
    allsky_owner = get_environment_variable("ALLSKY_OWNER")
    web_server_group = get_environment_variable("ALLSKY_WEBSERVER_GROUP")
    
    uid = pwd.getpwnam(allsky_owner).pw_uid
    gid = grp.getgrnam(web_server_group).gr_gid
            
    return create_and_set_file_permissions(file_name, uid, gid, 0o770)      

def create_sqlite_database(file_name:str)-> bool:
    result = True
    
    if not os.path.exists(file_name):
        result = False
        web_server_group = get_environment_variable("ALLSKY_WEBSERVER_GROUP")
        allsky_owner = get_environment_variable("ALLSKY_OWNER")
        try:
            uid = pwd.getpwnam(allsky_owner).pw_uid
        except KeyError:
            uid = None

        try:
            gid = grp.getgrnam(web_server_group).gr_gid
        except:
            gid = None

            
        if uid is not None and gid is not None:
            result = create_and_set_file_permissions(file_name, uid, gid, 0o660, True)

    return result

def run_script(script: str) -> Tuple[int, str]:
    try:
        result = subprocess.run(
            [script],
            capture_output=True,
            text=True,
            check=False
        )
        output = result.stdout + result.stderr
        return result.returncode, output.strip()
    except FileNotFoundError:
        return 127, f"Script not found: {script}"

def run_python_script(script: str, args: Optional[List[str]] = None, cwd: Optional[str] = None) -> Tuple[int, str]:
    """
    Run a Python script using the same interpreter as the current process (e.g., inside a venv).

    This function ensures the target script is executed with the current Python interpreter
    (`sys.executable`), so that packages installed in the active virtual environment are available.

    Args:
        script (str): Path to the Python script to execute.
        args (Optional[List[str]]): Additional arguments to pass to the script. Defaults to None.
        cwd (Optional[str]): Working directory in which to run the script. If None, uses the current directory.

    Returns:
        Tuple[int, str]: A tuple containing:
            - return code (int): The process's exit code, or 127 if the script is not found.
            - output (str): Combined standard output and standard error from the script, stripped of trailing whitespace.

    Example:
        >>> code, output = run_python_script("myscript.py", ["--option", "value"])
        >>> print(code, output)
        0 Script ran successfully
    """
    args = args or []
    try:
        proc = subprocess.run(
            [sys.executable, script, *args],
            capture_output=True,
            text=True,
            check=False,
            cwd=cwd,
        )
        output = (proc.stdout or "") + (proc.stderr or "")
        return proc.returncode, output.strip()
    except FileNotFoundError:
        return 127, f"Script not found: {script}"
        
def do_any_files_exist(base_folder: str | Path, filenames: list[str]) -> bool:
    base_folder = Path(base_folder)

    for name in filenames:
        file_path = os.path.join(base_folder, name)
        if is_file_readable(file_path):
            return True
    return False

def copy_list(file_names: list, source: str, dest: str) -> bool:
    result = True

    for file_name in file_names:
        source_file = os.path.join(source, file_name)
        if is_file_readable(source_file):
            copy_file(source_file, dest)
                
    return result

def copy_folder(source, dest, uid=None, guid=None, dirs_exist_ok=True) -> bool:
    result = False

    try:
        shutil.copytree(source, dest, dirs_exist_ok=dirs_exist_ok)
        result = True
    except FileExistsError:
        result = False
        
    return result

def copy_file(source, dest, uid=None, gid=None) -> bool:
    result = False
    
    directory = os.path.dirname(dest)
    check_and_create_directory(directory)
    
    if shutil.copy(source, dest) != "":
        
        dest_file = dest
        if os.path.isdir(dest):
            file_name = os.path.basename(source)
            dest_file = os.path.join(dest, file_name)
            
        set_permissions(dest_file, uid, gid)
        result = True
    
    return result

def remove_folder(path: str) -> bool:
    result = False
    try:
        folder = Path(path)
        if folder.exists() and folder.is_dir():
            shutil.rmtree(folder)
            result = True
    except:
        result = False
        
    return result

def set_permissions(file_name, uid=None, gid=None):                
    if uid is None:
        allsky_owner = get_environment_variable("ALLSKY_OWNER")
        try:
            uid = pwd.getpwnam(allsky_owner).pw_uid
        except KeyError:
            uid = os.getuid()
    if gid is None:
        if (group := get_environment_variable("ALLSKY_WEBSERVER_GROUP")) is None:
            group = 'www-data'
        gid = grp.getgrnam(group).gr_gid

    os.chown(file_name, uid, gid)
    
def create_and_set_file_permissions(file_name, uid=None, gid=None, permissions=None, is_sqlite=False, file_data = '')-> bool:
    result = True
    if not os.path.exists(file_name):
        directory = os.path.dirname(file_name)
        check_and_create_directory(directory)

    try:
        if is_sqlite:
            with sqlite3.connect(file_name, timeout=10) as conn:
                pass
        else:
            if not os.path.isdir(file_name):
                with open(file_name, 'w') as debug_file:
                    debug_file.write(file_data)
        set_permissions(file_name, uid, gid)
        if permissions:
            os.chmod(file_name, permissions)
    except Exception as e:
        eType, eObject, eTraceback = sys.exc_info()
        log(0, f'ERROR: Unable to create {file_name} with web server access. {eTraceback.tb_lineno} - {e}')
        result = False

    return result

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

def get_extra_dir(current_only:bool = False) -> list[str] | str:
    return getExtraDir(current_only)
def getExtraDir(current_only: bool = False) -> list[str] | str:
    """
    Get the extra directory paths to use for Allsky.

    Args:
        current_only (bool): 
            - If True, return only the current ALLSKY_EXTRA directory as a string.
            - If False (default), return a list of directories including the
              current directory and, if it exists, the legacy directory.

    Returns:
        list[str] | str: 
            - A string (path) if current_only is True.
            - A list of one or more directory paths if current_only is False.
    """
    
    # Get the current extra directory from the environment.
    # This is required, so fatal=True ensures the program exits if it's not set.
    extra_dir = get_environment_variable("ALLSKY_EXTRA", fatal=True)
    
    if current_only:
        # If only the current directory is requested, return it directly as a string.
        result = extra_dir
    else:
        # Try to get the legacy directory path from the environment.
        # This one is optional, so fatal=False means it can be missing.
        legacy_extra_dir = get_environment_variable("ALLSKY_EXTRA_LEGACY", fatal=False)    

        # If a legacy directory is defined and physically exists on disk,
        # include both the current and legacy directories.
        if legacy_extra_dir is not None and os.path.exists(legacy_extra_dir):
            result = [
                extra_dir,
                legacy_extra_dir
            ]
        else:
            # Otherwise, return only the current directory in a list.
            result = [extra_dir]

    return result

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

def get_value_from_debug_data(key: str) -> str | None:
    setup_for_command_line()
    
    try:
        allsky_tmp = os.environ["ALLSKY_TMP"]
        file_path = os.path.join(allsky_tmp, "overlaydebug.txt")
        
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                for line in f:
                    if not line.strip() or line.strip().startswith("#"):
                        continue

                    parts = line.split(maxsplit=1)
                    if len(parts) == 2 and parts[0] == key:
                        return "".join(parts[1].split())
        except FileNotFoundError:
            return None
    except:
        return None
    return None

def install_apt_packages(pkg_file: str | Path, log_file: str | Path) -> bool:
    pkg_file = Path(pkg_file)
    log_file = Path(log_file)

    if not pkg_file.exists():
        raise FileNotFoundError(f"Package file not found: {pkg_file}")

    with pkg_file.open("r", encoding="utf-8") as f:
        packages = [line.strip() for line in f if line.strip() and not line.startswith("#")]

    log_folder = os.path.dirname(log_file)
    check_and_create_directory(log_folder)  
    
    failures = []
    with log_file.open("a", encoding="utf-8") as log:
        for pkg in packages:
            log.write(f"\n--- Installing {pkg} ---\n")
            result = subprocess.run(
                ["sudo", "apt-get", "install", "-y", pkg],
                stdout=log,
                stderr=log
            )
            if result.returncode != 0:
                failures.append(pkg)
                log.write(f"--- Failed {pkg} ---\n")
            else:
                log.write(f"--- Success {pkg} ---\n")

    return len(failures) == 0

def install_requirements(req_file: str | Path, log_file: str | Path) -> bool:

    req_file = Path(req_file)
    log_file = Path(log_file)

    if not req_file.exists():
        raise FileNotFoundError(f"Requirements file not found: {req_file}")

    with req_file.open("r", encoding="utf-8") as f:
        packages = [line.strip() for line in f if line.strip() and not line.startswith("#")]

    log_folder = os.path.dirname(log_file)
    check_and_create_directory(log_folder)  
        
    failures = []
    with log_file.open("a", encoding="utf-8") as log:
        for pkg in packages:
            log.write(f"\n--- Installing {pkg} ---\n")
            result = subprocess.run(
                [sys.executable, "-m", "pip", "install", pkg],
                stdout=log,
                stderr=log
            )
            if result.returncode != 0:
                failures.append(pkg)
                log.write(f"--- Failed {pkg} ---\n")
            else:
                log.write(f"--- Success {pkg} ---\n")

    return len(failures) == 0

def check_mysql_connection(host, user, password, database=None, port=3306):
    try:
        conn = mysql.connector.connect(
            host=host,
            user=user,
            password=password,
            port=port
        )

        if not conn.is_connected():
            return False

        cur = conn.cursor()

        if database:
            cur.execute(f"CREATE DATABASE IF NOT EXISTS {database};")
            cur.execute("SHOW DATABASES LIKE %s", (database,))
            if not cur.fetchone():
                cur.close()
                conn.close()
                return False
            cur.execute(f"USE `{database}`")

        cur.close()
        conn.close()

        return True

    except Exception as e:
        log(0, f'ERROR: Database is configured as mysql but cannot connect: {e}')
        return False

def get_database_config():
    secret_data = get_secrets(['databasehost', 'databaseuser', 'databasepassword', 'databasedatabase'])
    secret_data['databasetype'] = get_setting('databasetype')
    secret_data['databaseenabled'] = get_setting('enabledatabase')
    
    return secret_data

def update_database(structure, extra_data):
    secret_data = get_database_config()

    if secret_data['databaseenabled']:
        if not re.fullmatch(r'[a-zA-Z_][a-zA-Z0-9_]*', secret_data['databasedatabase']):
            log(0, f"ERROR: Database table name {secret_data['databasedatabase']} is invalid")
            return
          
        if secret_data['databasetype'] == 'mysql':
            if check_mysql_connection(secret_data['databasehost'],secret_data['databaseuser'],secret_data['databasepassword'], secret_data['databasedatabase']):
                update_mysql_database(structure, extra_data)
            else:
                log(0, f"ERROR: Failed to connect to MySQL database. Please run the database manager utility.")
        
        if secret_data['databasetype'] == 'sqlite':
            update_sqlite_database(structure, extra_data)

def obfuscate_password(password: str) -> str:
    if not password:
        return ""
    if len(password) <= 2:
        return "*" * len(password)
    return password[0] + "*" * (len(password) - 2) + password[-1]

def get_database_row_key(structure: dict):
    
    # Assume we have access to AS_TIMESTAMP in the env
    row_key = get_environment_variable('AS_TIMESTAMP')

    # Possibly running in the periodic flow so get the value from the overlay debug data
    if row_key == None:
        row_key = get_value_from_debug_data("AS_TIMESTAMP")
        
    # Final fallback to use current time
    if row_key == None:
        row_key = builtins.int(time.time()) 

    # Get the row key.        
    if 'row_key' in structure:
        row_key =  structure['row_key']
        temp_row_key = get_environment_variable(row_key)  
        if temp_row_key == None:
            temp_row_key = get_value_from_debug_data(row_key)
            if temp_row_key is not None:
                row_key = temp_row_key
                
    return row_key

def update_sqlite_database(structure, extra_data):

    try:
        time_stamp = os.environ["AS_TIMESTAMP"]
    except:
        time_stamp = builtins.int(time.time()) # We have overidden int for locale so call builtin function here

    try:
        db_path = os.environ['ALLSKY_DATABASES']
    except KeyError:
        setupForCommandLine()
        db_path = os.environ['ALLSKY_DATABASES']

    try:
        if "database" in structure:        
            if 'enabled' in structure['database']:
                if structure['database']['enabled']:
                    if 'table' in structure['database']:
                        database_table = structure['database']['table']
                        row_type = "VARCHAR(100)"
                        if "row_type" in structure['database']:
                            row_type = "INTEGER"
                        
                        json_str = json.dumps(extra_data)
                        timestamp = math.floor(time.time())

                        if not create_sqlite_database(db_path):
                            return False
                        
                        # Use a context manager to ensure safe connection handling
                        with sqlite3.connect(db_path, timeout=10) as conn:
                            #conn.execute('PRAGMA journal_mode = WAL')  # Enables safe concurrent access
                            #conn.execute('PRAGMA synchronous = NORMAL')  # Balance between speed and safety
                            create_sql = get_sql_create(database_table, row_type)
                            conn.execute(create_sql)
                            
                            include_all = False
                            if "include_all" in structure['database']:
                                include_all = True if structure["database"]["include_all"].lower() == 'true' else False
                                                    
                            row_key = get_database_row_key(structure["database"])
                            data = json.loads(extra_data)
                            for entity, value in data.items():
                                include_row = False
                                row_database_table = database_table
                                key = entity
                                key1 = entity + "${COUNT}"
                                found_key = None
                                if key in structure["values"]:
                                    if 'database' in structure["values"][key]:
                                        found_key = key
                                if key1 in structure["values"]:
                                    if 'database' in structure["values"][key1]:
                                        found_key = key1
                                if found_key is not None:
                                    if 'table' in structure["values"][found_key]["database"]:
                                        row_database_table = value["database"]["table"]
                                        create_sql = get_sql_create(row_database_table)
                                        conn.execute(create_sql)
                                        row_key = get_database_row_key(structure["values"][found_key]["database"])
                                    if "include" in structure["values"][found_key]["database"]:
                                        if "include" in structure["values"][found_key]["database"]:
                                            include_row = True if structure["values"][found_key]["database"]["include"].lower() == 'true' else False
                                                                                
                                if include_row or include_all:                                         
                                    val = value.get("value")   
                                    conn.execute(
                                        f"INSERT INTO {row_database_table} (row_key, entity, value, timestamp) VALUES (?, ?, ?, ?)",
                                        (row_key, entity, str(val), time_stamp)
                                    )
                                    conn.commit()

    except Exception as e:
        me = os.path.basename(__file__)
        eType, eObject, eTraceback = sys.exc_info()            
        log(0, f'ERROR: update_sqlite_database failed on line {eTraceback.tb_lineno} in {me} - {e}')

def get_sql_create(database_table, row_key_type="INT"):
    create_sql = f'CREATE TABLE IF NOT EXISTS {database_table} (row_key {row_key_type}, timestamp {row_key_type}, entity VARCHAR(1024), value VARCHAR(2048))'
    return create_sql
            
def update_mysql_database(structure, extra_data): 
    secret_data = get_database_config()
    
    try:
        time_stamp = os.environ["AS_TIMESTAMP"]
    except:
        time_stamp = builtins.int(time.time()) # We have overidden int for locale so call builtin function here
        
    try:
        if "database" in structure:
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

                        row_type = "VARCHAR(100)"
                        if "row_type" in structure['database']:
                            row_type = "INT"
                            
                        include_all = False
                        if "include_all" in structure['database']:
                            include_all = True if structure["database"]["include_all"].lower() == 'true' else False
                            
                        cursor = conn.cursor()
                        create_sql = get_sql_create(database_table, row_type)
                        cursor.execute(create_sql)

                        row_key = get_database_row_key(structure["database"])
                        data = json.loads(extra_data)
                        for entity, value in data.items():
                            include_row = False
                            row_database_table = database_table
                            key = entity                            
                            key1 = re.sub(r'\d+$', '', entity) + "${COUNT}" # Strip trailing numbers
                            found_key = None
                            if key in structure["values"]:
                                if 'database' in structure["values"][key]:
                                    found_key = key
                            if key1 in structure["values"]:
                                if 'database' in structure["values"][key1]:
                                    found_key = key1
                            if found_key is not None:
                                if 'table' in structure["values"][found_key]["database"]:
                                    row_database_table = value["database"]["table"]
                                    create_sql = get_sql_create(row_database_table)
                                    cursor.execute(create_sql)
                                    row_key = get_database_row_key(structure["values"][found_key]["database"])
                                if "include" in structure["values"][found_key]["database"]:
                                    if "include" in structure["values"][found_key]["database"]:
                                        include_row = True if structure["values"][found_key]["database"]["include"].lower() == 'true' else False
                                    
                            if include_row or include_all:                                
                                val = value.get("value")
                                cursor.execute(
                                    f"INSERT INTO {row_database_table} (row_key, entity, value, timestamp) VALUES (%s, %s, %s, %s)",
                                    (row_key, entity, str(val), time_stamp)
                                )
                        conn.commit()
                        cursor.close()
                        conn.close()
    except Exception as e:
        me = os.path.basename(__file__)
        eType, eObject, eTraceback = sys.exc_info()            
        log(0, f'ERROR: update_mysql_database failed on line {eTraceback.tb_lineno} in {me} - {e}')

def save_extra_data(file_name, extra_data, source='', structure={}, custom_fields={}):
    saveExtraData(file_name, extra_data, source, structure, custom_fields)
def saveExtraData(file_name, extra_data, source: str = '', structure: dict = {}, custom_fields: dict = {}):
    """
    Persist "extra data" for use by Allsky overlay modules.

    This function writes the provided data to a file inside the current
    ALLSKY_EXTRA directory (resolved via `get_extra_dir(True)`), using a
    temporary file in ALLSKY_TMP and an atomic move to avoid partial writes.
    It ensures the destination directory exists and is web-server accessible,
    applies final permissions, and (optionally) updates a database when the
    `structure` indicates one is in use.

    Behavior:
      1) Ensure extra data directory exists (`checkAndCreateDirectory`) and
         enable web access (`create_file_web_server_access`).
      2) If the target filename ends with `.json`, normalize/shape the payload
         via `format_extra_data_json(extra_data, structure, source)`.
      3) Merge any `custom_fields` into the payload (overrides existing keys).
      4) Serialize to JSON (pretty-printed) and write to a temp file created in
         `ALLSKY_TMP`, then atomically move it to the final path.
      5) Set mode 0o770 and call `set_permissions()` for owner/group alignment.
      6) If `structure` contains a `"database"` key, call `update_database()`.

    Args:
        file_name (str):
            File name (with extension) to write into the extra data directory.
        extra_data (Any):
            Data to persist. If `file_name` ends with `.json`, this should be
            JSON-serializable. Non-JSON targets are written as the JSON string.
        source (str, optional):
            Context or origin tag passed to the JSON formatter. Default: ''.
        structure (dict, optional):
            Schema/metadata guiding JSON formatting and optional DB updates.
            If it contains `"database"`, `update_database()` will be invoked.
            Default: {}.
        custom_fields (dict, optional):
            Extra key/values to inject into the payload before serialization.
            Keys here override the same keys in `extra_data`. Default: {}.

    Returns:
        None

    Side Effects:
        - Creates/updates a file in ALLSKY_EXTRA.
        - Applies filesystem permissions to the output file.
        - May perform a database update if requested by `structure`.

    Error Handling:
        Any exception is caught and logged with line number and filename via
        `log(0, ...)`; the function does not re-raise.

    Notes:
        - Uses an atomic `shutil.move()` from ALLSKY_TMP -> ALLSKY_EXTRA to
          avoid readers seeing partial files.
        - Final mode is set to `0o770`; ownership is delegated to
          `set_permissions()`.
    """
    try:
        extra_data_path = get_extra_dir(True)
        if extra_data_path is not None:
            checkAndCreateDirectory(extra_data_path)
            create_file_web_server_access(extra_data_path)

            file_extension = Path(file_name).suffix
            extra_data_filename = os.path.join(extra_data_path, file_name)
            allsky_tmp = get_environment_variable("ALLSKY_TMP")
            with tempfile.NamedTemporaryFile(mode="w", dir=allsky_tmp, delete=False) as temp_file:
                if file_extension == '.json':
                    extra_data = format_extra_data_json(extra_data, structure, source)
                if len(custom_fields) > 0:
                    for key, value in custom_fields.items():
                        extra_data[key] = value
                extra_data = json.dumps(extra_data, indent=4)
                temp_file.write(extra_data)
                temp_file_name = temp_file.name

            shutil.move(temp_file_name, extra_data_filename)
            os.chmod(extra_data_filename, 0o770)
            set_permissions(extra_data_filename)

            if 'database' in structure:
                update_database(structure, extra_data)
    except Exception as e:
        me = os.path.basename(__file__)
        eType, eObject, eTraceback = sys.exc_info()
        log(0, f'ERROR: saveExtraData failed on line {eTraceback.tb_lineno} in {me} - {e}')

def format_extra_data_json(extra_data, structure, source):
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
    extra_data_paths = get_extra_dir()
    for extra_data_path in extra_data_paths:
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
                        log(0, f'ERROR: cannot read {extra_data_filename}.')
                
                if file_extension == '.txt':
                    pass
            
    return result

def delete_extra_data(fileName):
	deleteExtraData(fileName)
def deleteExtraData(fileName):
    extra_data_paths = get_extra_dir()
    for extra_data_path in extra_data_paths:    
        if extra_data_path is not None:               # it should never be None
            extra_data_filename = os.path.join(extra_data_path, fileName)
            if os.path.exists(extra_data_filename):
                if isFileWriteable(extra_data_filename):
                    os.remove(extra_data_filename)

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
    
    extra_data_paths = get_extra_dir()
    for extra_data_path in extra_data_paths:            
        with os.scandir(extra_data_path) as entries:
            for entry in entries: 
                if entry.is_file():
                    delete_age = _get_expiry_time_for_module(flows, entry.name, module_settings, tod)
                    cleanup_extra_data_file(entry.path, delete_age)
            
def cleanup_extra_data_file(file_name, delete_age=600):
    
    if (is_just_filename(file_name)):    
        extra_data_path = get_extra_dir(True)
        if extra_data_path is not None:
            file_name = os.path.join(extra_data_path, file_name)

    if (isFileWriteable(file_name)):
        file_modified_time = round(os.path.getmtime(file_name))
        file_age = round(time.time() - file_modified_time)
        if (file_age > delete_age):
            log(4, f'INFO: Deleting extra data file {file_name} as its older than {delete_age} seconds')
            delete_extra_data(file_name)
        else:
            log(4, f'INFO: Not deleting {file_name} as its {file_age} seconds old, threshhold is {delete_age}')
    else:
        log(4, f'ERROR: Cannot check extra data file {file_name} as it is not writeable')
            
def remove_path(path):
    result = False
    if os.path.isfile(path):
        try:
            os.remove(path)
            result = True
        except FileNotFoundError:
            pass
        except PermissionError:
            pass
        
    if os.path.isdir(path):
        folder = Path(path)
        try:
            shutil.rmtree(folder)
            result = True
        except FileNotFoundError:
            pass
        except PermissionError:
            pass
                
    return result
   
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
    import board
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

def to_bool(value):
    return str(value).strip().lower() == 'on' or str(value).strip() == '1'

def normalise_on_off(value):
    if str(value).strip().lower() == 'on' or str(value).strip() == '1':
        return 'on'
    return 'off'

def get_api_url():
    try:
        api_url = os.environ['ALLSKY_API_URL']
    except KeyError:
        setupForCommandLine()
        api_url = os.environ['ALLSKY_API_URL']
        
    return api_url

def get_gpio_pin(gpio_pin, pi=None, show_errors=False):
    return read_gpio_pin(gpio_pin, pi=None, show_errors=False)
def read_gpio_pin(gpio_pin, pi=None, show_errors=False):
    api_url = get_api_url()
    response = requests.get(f'{api_url}/gpio/digital/{gpio_pin}')
    response.raise_for_status()
    data = response.json()

    return data.get('value') == 'on'

def set_gpio_pin(gpio_pin, state, pi=None, show_errors=False):
    api_url = get_api_url()    
    state = normalise_on_off(state)
    response = requests.post(f'{api_url}/gpio/digital', json={
        'pin': str(gpio_pin),
        'state': state.lower()
    })
    response.raise_for_status()
    return response.json()

def set_pwm(gpio_pin, duty_cycle, pi=None, show_errors=False):
    api_url = get_api_url()    
    frequency = 1000
    response = requests.post(f'{api_url}/gpio/pwm', json={
        'pin': str(gpio_pin),
        'duty': duty_cycle,
        'frequency': frequency
    })
    response.raise_for_status()
    return response.json()

def stop_pwm(gpio_pin):
    api_url = get_api_url()    
    frequency = 1000
    duty_cycle = 0
    response = requests.post(f'{api_url}/gpio/pwm', json={
        'pin': str(gpio_pin),
        'duty': duty_cycle,
        'frequency': frequency
    })
    response.raise_for_status()
    return response.json()
    
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
    allskyvariables = ALLSKYVARIABLES()
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
        
        extra_data_paths = get_extra_dir()
        for extra_data_path in extra_data_paths:         
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
    import cv2
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
        me = os.path.basename(__file__)
        eType, eObject, eTraceback = sys.exc_info()
        log(0, f'ERROR: mask_image failed on line {eTraceback.tb_lineno} in {me} - {e}')

       
    return output
     
def count_starts_in_image(image, mask_file_name=None):
    from photutils.detection import DAOStarFinder
    from astropy.stats import sigma_clipped_stats
    import cv2
    
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
    
    # Convert to list of (x, y) tuples if sources were found
    coords = []
    if sources is not None and len(sources) > 0:
        x = sources['xcentroid'].tolist()
        y = sources['ycentroid'].tolist()
        coords = list(zip(x, y))

    return coords, image

def fast_star_count(
    image: np.ndarray,
    min_d_px: int,                 # ~star core diameter in pixels (try 5–8)
    scale: float = 0.5,            # downscale for speed (0.5 good for 1080p)
    corr_thresh: float = 0.78,     # template match threshold (0..1)
    min_peak_contrast: float = 12, # center minus local ring (uint8)
    anisotropy_min: float = 0.45,  # 0..1 (lamda_min/lamda_max) – low => edge-like
    mask_bottom_frac: float = 0.12 # ignore lowest X% (horizon glow)
) -> List[Tuple[float, float]]:
    import cv2
    """
    Return (x, y) coords of detected stars in ORIGINAL image pixels.
    Works with grayscale or BGR uint8.
    """
    # ---- grayscale & downscale ----
    g = image if image.ndim == 2 else cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    H0, W0 = g.shape[:2]
    if scale != 1.0:
        g_ds = cv2.resize(g, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    else:
        g_ds = g.copy()


    # ---- background removal (large median) ----
    k_bg = max(21, builtins.int(round(min(61, (min_d_px * 6) | 1))))  # odd; 21–61 range


    # keep uint8 for medianBlur
    bg = cv2.medianBlur(g_ds, k_bg)

    # convert to float AFTER background removal if you want math safety
    flat = cv2.subtract(g_ds.astype(np.float32), bg.astype(np.float32))


    # ---- Gaussian matched filter (template correlation) ----
    # Patch size ~ 2–2.5× diameter; sigma ~~ diameter / 3
    patch = max(7, builtins.int(round(min_d_px * scale * 2.5)))
    if patch % 2 == 0: patch += 1
    yy, xx = np.mgrid[:patch, :patch]
    cx = cy = patch // 2
    sigma = max(0.6, (min_d_px * scale) / 3.0)
    gauss = np.exp(-((xx - cx) ** 2 + (yy - cy) ** 2) / (2 * sigma * sigma)).astype(np.float32)
    gauss = (gauss - gauss.mean()) / (gauss.std() + 1e-6)  # zero-mean, unit-std

    # normalized correlation
    R = cv2.matchTemplate(flat, gauss, method=cv2.TM_CCOEFF_NORMED)

    # ---- non-maximum suppression + threshold ----
    nms_k = 3
    nms = cv2.dilate(R, np.ones((nms_k, nms_k), np.uint8))
    peaks = (R >= corr_thresh) & (R >= nms)

    # ---- mask fisheye border + bottom band ----
    ph, pw = R.shape
    mask = np.zeros((ph, pw), np.uint8)
    cx_r, cy_r = pw // 2, ph // 2
    rad = builtins.int(min(cx_r, cy_r) * 0.95)
    cv2.circle(mask, (cx_r, cy_r), rad, 1, -1)
    if mask_bottom_frac > 0:
        cut = builtins.int(ph * (1.0 - mask_bottom_frac))
        mask[cut:, :] = 0
    peaks &= mask.astype(bool)

    ys, xs = np.where(peaks)
    if len(xs) == 0:
        return []

    coords = []
    # offsets (matchTemplate coords are top-left of patch)
    off = patch // 2

    # Precompute gradients on downscaled image for anisotropy test
    sx = cv2.Sobel(g_ds, cv2.CV_32F, 1, 0, ksize=3)
    sy = cv2.Sobel(g_ds, cv2.CV_32F, 0, 1, ksize=3)

    for x0, y0 in zip(xs, ys):
        cx_ds, cy_ds = x0 + off, y0 + off

        # Annulus contrast: center 3x3 vs ring in 7x7
        yA = max(cy_ds - 1, 0); yB = min(cy_ds + 2, g_ds.shape[0])
        xA = max(cx_ds - 1, 0); xB = min(cx_ds + 2, g_ds.shape[1])
        center = flat[yA:yB, xA:xB].max()

        yA2 = max(cy_ds - 4, 0); yB2 = min(cy_ds + 5, g_ds.shape[0])
        xA2 = max(cx_ds - 4, 0); xB2 = min(cx_ds + 5, g_ds.shape[1])
        ring = flat[yA2:yB2, xA2:xB2].copy()
        ring[yA:yB, xA:xB] = center  # exclude center region approx
        local_bg = np.median(ring)

        if (center - local_bg) < min_peak_contrast:
            continue

        # Anisotropy (structure tensor proxy): stars ~ isotropic gradients
        sx_win = np.abs(sx[yA2:yB2, xA2:xB2]); sy_win = np.abs(sy[yA2:yB2, xA2:xB2])
        gx = sx_win.mean(); gy = sy_win.mean()
        ratio = (min(gx, gy) + 1e-6) / (max(gx, gy) + 1e-6)  # 0..1
        if ratio < anisotropy_min:
            continue

        # Accept; rescale to original coordinates
        coords.append((float(cx_ds / scale), float(cy_ds / scale)))

    return coords

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
        except FileNotFoundError as e:
            result = 0
        except Exception as e:
            result = 0
            
    return result

def get_rpi_metadata():
    with open(ALLSKY_SETTINGS_FILE) as file:
        config = json.load(file)

    extraargs = config.get('extraargs', '')
    args = shlex.split(extraargs)

    metadata_path = None
    for i, arg in enumerate(args):
        if arg == '--metadata' and i + 1 < len(args):
            metadata_path = args[i + 1]
            break
    if metadata_path is None:
        metadata_path = os.path.join(ALLSKY_CURRENT_DIR, 'metadata.txt')

    return metadata_path

def _get_nested_value(data, path, value_type=str, separator="."):
    keys = path.split(separator)
    try:
        for key in keys:
            if isinstance(data, dict):
                data = data[key]
            elif isinstance(data, list):
                data = data[int(key)]
            else:
                return None
        return value_type(data)
    except (KeyError, IndexError, ValueError, TypeError):
        return None

def get_ecowitt_data(api_key, app_key, mac_address, temp_unitid=1, pressure_unitid=3):
    result = {
        'outdoor': {
            'temperature': None,
            'feels_like': None,
            'humidity': None,
            'app_temp': None,
            'dew_point': None
        },
        'indoor': {
            'temperature': None,
            'humidity': None
        },
        'solar_and_uvi': {
            'solar': None,
            'uvi': None
        }, 
        'rainfall': {
            'rain_rate': None,
            'daily': None,
            'event': None,
            'hourly': None,
            'weekly': None,
            'monthly': None,
            'yearly': None
        },        
        'wind': {
            'wind_speed': None,
            'wind_gust': None,
            'wind_direction': None
        },
        'pressure': {
            'relative': None,
            'absolute': None
        },
        'lightning': {
            'distance': None,
            'count': None
        }
    }  
    if all(var.strip() for var in (app_key, api_key, mac_address)):
        ECOWITT_API_URL = f'https://api.ecowitt.net/api/v3/device/real_time?application_key={app_key}&api_key={api_key}&mac={mac_address}&call_back=all&temp_unitid={temp_unitid}&pressure_unitid={pressure_unitid}'
        
        log(4,f"INFO: Reading Ecowitt API from - {ECOWITT_API_URL}")
        try:
            response = requests.get(ECOWITT_API_URL)
            if response.status_code == 200:
                raw_data = response.json()

                result['outdoor']['temperature'] = _get_nested_value(raw_data, 'data.outdoor.temperature.value', float)
                result['outdoor']['feels_like'] = _get_nested_value(raw_data, 'data.outdoor.feels_like.value', float)
                result['outdoor']['humidity']  = _get_nested_value(raw_data, 'data.outdoor.humidity.value', float)
                result['outdoor']['app_temp']  = _get_nested_value(raw_data, 'data.outdoor.app_temp.value', float)
                result['outdoor']['dew_point']  = _get_nested_value(raw_data, 'data.outdoor.dew_point.value', float)

                result['indoor']['temperature']  = _get_nested_value(raw_data, 'data.indoor.temperature.value', float)
                result['indoor']['humidity']  = _get_nested_value(raw_data, 'data.indoor.humidity.value', float)

                result['solar_and_uvi']['solar']  = _get_nested_value(raw_data, 'data.solar_and_uvi.solar.value', float)
                result['solar_and_uvi']['uvi']  = _get_nested_value(raw_data, 'data.solar_and_uvi.uvi.value', float)

                result['rainfall']['rain_rate']  = _get_nested_value(raw_data, 'data.rainfall.rain_rate.value', float)
                result['rainfall']['daily']  = _get_nested_value(raw_data, 'data.rainfall.daily.value', float)
                result['rainfall']['event']  = _get_nested_value(raw_data, 'data.rainfall.event.value', float)
                result['rainfall']['hourly']  = _get_nested_value(raw_data, 'data.rainfall.hourly.value', float)
                result['rainfall']['weekly']  = _get_nested_value(raw_data, 'data.rainfall.weekly.value', float)
                result['rainfall']['monthly']  = _get_nested_value(raw_data, 'data.rainfall.monthly.value', float)
                result['rainfall']['yearly']  = _get_nested_value(raw_data, 'data.rainfall.yearly.value', float)

                result['wind']['wind_speed']  = _get_nested_value(raw_data, 'data.wind.wind_speed.value', float)
                result['wind']['wind_gust']  = _get_nested_value(raw_data, 'data.wind.wind_gust.value', float)
                result['wind']['wind_direction']  = _get_nested_value(raw_data, 'data.wind.wind_direction.value', int)

                result['pressure']['relative']  = _get_nested_value(raw_data, 'data.pressure.relative.value', float)
                result['pressure']['absolute']  = _get_nested_value(raw_data, 'data.pressure.absolute.value', float)

                result['lightning']['distance']  = _get_nested_value(raw_data, 'data.lightning.distance.value', float)
                result['lightning']['count']  = _get_nested_value(raw_data, 'data.lightning.count.value', int)                

                log(1, f'INFO: Data read from Ecowitt API')
            else:
                result = f'Got error from the Ecowitt API. Response code {response.status_code}'
                log(0,f'ERROR: {result}')
        except Exception as e:
            me = os.path.basename(__file__)
            eType, eObject, eTraceback = sys.exc_info()
            log(0, f'ERROR: Failed to read data from Ecowitt on line {eTraceback.tb_lineno} in {me} - {e}')
    else:
        log(0, 'ERROR: Missing Ecowitt Application Key, API Key or MAC Address')
    
    return result

def get_ecowitt_local_data(address, password=None):
    '''
    Temp 0 - C, 1 - F
    Pressure 0 - hPA, 1 - inHg, 2 - mmHg
    Wind 0 - m/s, 1 - km/h, 2 - mph, 3 - knots, 5 - Beaufort
    Rain 0 - mm, 1 - in
    Irradiance 0 - Klux, 1 - W/m2, 2 - Kfc
    Capacity 0 - L, 1 - m3, 2 - Gal
    '''    

    result = {
        'outdoor': {
            'temperature': None,
            'feels_like': None,
            'humidity': None,
            'app_temp': None,
            'dew_point': None
        },
        'indoor': {
            'temperature': None,
            'humidity': None
        },
        'solar_and_uvi': {
            'solar': None,
            'uvi': None
        }, 
        'rainfall': {
            'rain_rate': None,
            'daily': None,
            'event': None,
            'hourly': None,
            'weekly': None,
            'monthly': None,
            'yearly': None
        },        
        'wind': {
            'wind_speed': None,
            'wind_gust': None,
            'wind_direction': None
        },
        'pressure': {
            'relative': None,
            'absolute': None
        },
        'lightning': {
            'distance': None,
            'count': None
        }
    } 
    
    def parse_val(val, as_type=float, unit=None):
        """
        Extract numeric part from a value string and optionally convert Â°F to Â°C.
        """
        if val is None:
            return None
        try:
            num_str = str(val).strip().split()[0].strip('%')
            value = as_type(num_str)
            if unit:
                unit = unit.lower()
                if unit in ['f', 'Â°f']:
                    value = round((value - 32) * 5 / 9, 2)
            return value
        except (ValueError, TypeError):
            return None

    def get_val_and_unit(data_list, target_id):
        for item in data_list:
            if item.get("id") == target_id:
                return item.get("val"), item.get("unit", None)
        return None, None
        
    LIVE_URL = f'{address}/get_livedata_info?'

    try:
        response = requests.get(LIVE_URL)
        if response.status_code == 200:
            live_data = response.json()
            
            common = live_data.get("common_list", [])
            val, unit = get_val_and_unit(common, "0x02")
            result['outdoor']['temperature'] = parse_val(val, float, unit)

            val, unit = get_val_and_unit(common, "0x07")
            result['outdoor']['humidity'] = parse_val(val, int, unit)

            val, unit = get_val_and_unit(common, "3")
            result['outdoor']['feels_like'] = parse_val(val, float, unit)

            val, unit = get_val_and_unit(common, "0x03")
            result['outdoor']['dew_point'] = parse_val(val, float, unit)


            val, unit = get_val_and_unit(common, "0x0B")
            result['wind']['wind_speed'] = parse_val(val, float, unit)

            val, unit = get_val_and_unit(common, "0x0C")
            result['wind']['wind_gust'] = parse_val(val, float, unit)

            val, unit = get_val_and_unit(common, "0x0A")
            result['wind']['wind_direction'] = parse_val(val, int, unit)
            
            val, unit = get_val_and_unit(common, "0x15")
            result['solar_and_uvi']['solar'] = parse_val(val, float, unit)

            val, unit = get_val_and_unit(common, "0x17")
            result['solar_and_uvi']['uvi'] = parse_val(val, int, unit)

            # --- Rain ---
            rain = live_data.get("rain", [])
            for rid, key in {
                "0x0D": "event",
                "0x0E": "rain_rate",
                "0x10": "hourly",
                "0x11": "daily",
                "0x12": "weekly",
                "0x13": "yearly"
            }.items():
                val, unit = get_val_and_unit(rain, rid)
                result['rainfall'][key] = parse_val(val, float, unit)

            # --- WH25 Indoor Sensor ---
            wh25 = live_data.get("wh25", [{}])[0]
            result['indoor']['temperature'] = parse_val(wh25.get("intemp"), float, wh25.get("unit"))
            result['indoor']['humidity'] = parse_val(wh25.get("inhumi"), int)

            result['pressure']['absolute'] = parse_val(wh25.get("abs"), float)
            result['pressure']['relative'] = parse_val(wh25.get("rel"), float)

            # --- Lightning ---
            lightning = live_data.get("lightning", [{}])[0]
            result['lightning']['distance'] = parse_val(lightning.get("distance"), float)
            result['lightning']['count'] = parse_val(lightning.get("count"), int)

    except Exception as e:
        me = os.path.basename(__file__)
        eType, eObject, eTraceback = sys.exc_info()
        log(0, f'ERROR: Failed to read live data from the local Ecowitt gateway on line {eTraceback.tb_lineno} in {me} - {e}')

    return result

def get_hass_sensor_value(ha_url, ha_ltt, ha_sensor):
    result = None
    
    headers = {
        'Authorization': f'Bearer {ha_ltt}',
        'Content-Type': 'application/json',
    }

    try:
        response = requests.get(f'{ha_url}/api/states/{ha_sensor}', headers=headers)

        if response.status_code == 200:
            result = float(response.json().get('state'))
        else:
            if response.status_code == 404:
                log(0, f'ERROR: Unable to read {ha_sensor} from {ha_url}. homeassistant reports the sensor does not exist')
            else:
                if response.status_code == 401:
                    log(0, f'ERROR: Unable to read {ha_sensor} from {ha_url}. homeassistant reports the token is unauthorised')
                else:            
                    log(0, f'ERROR: Unable to read {ha_sensor} from {ha_url}. Error code {response.status_code}')
                
    except Exception as e:
        me = os.path.basename(__file__)
        eType, eObject, eTraceback = sys.exc_info()
        log(0, f'ERROR: Failed to read data from Homeassistant {eTraceback.tb_lineno} in {me} - {e}')
        result = None

    return result

def create_device(import_name: str, class_name: str, bus_number: int, i2c_address: str = ""):
    bus_number = int(bus_number) 
        
    # Define SCL/SDA pins for each bus
    I2C_BUS_PINS = {
        1: (board.SCL, board.SDA),
        3: (board.D5, board.D4),
        4: (board.D9, board.D8),
        5: (board.D13, board.D12),
        6: (board.D23, board.D22)
    }

    # Dynamically import the module and get the class
    try:
        module = importlib.import_module(import_name)
        cls = getattr(module, class_name)
    except (ImportError, AttributeError) as e:
        raise ImportError(f"Could not import '{class_name}' from '{import_name}': {e}")

    try:
        scl, sda = I2C_BUS_PINS[bus_number]
    except KeyError:
        raise ValueError(f"No pin mapping defined for I2C bus {bus_number}")

    i2c = busio.I2C(scl, sda)

    # Instantiate device
    if i2c_address:
        return cls(i2c, int(i2c_address, 0))
    else:
        return cls(i2c)

def get_flows_with_module(module_name):

    folder = Path(ALLSKY_MODULES)
    found: Dict[str, Any] = {}

    for file in folder.glob("*.json"):
        if not file.name.endswith("-debug.json"):
            if file.name.startswith("postprocessing_"):
                try:
                    with file.open("r", encoding="utf-8") as f:
                        data = json.load(f)

                    if module_name in data:
                        found[file.name] = data

                except (json.JSONDecodeError, OSError) as e:
                    pass

    return found

def to_bool(v: bool | str) -> bool:
    if isinstance(v, bool):
        return v
    if v is None:
        return False
    return str(v).strip().lower() in ("true", "1", "yes", "y")

def _to_list(v: str | list | None) -> list | str | None:
    if isinstance(v, str) and "," in v:
        return [x.strip() for x in v.split(",")]
    return v

def atomic_write_json(path: Path, data: Dict[str, Any]) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
        f.write("\n")
    os.replace(tmp, path)

def save_secrets_file(env_data: Dict[str, Any]) -> None:
    file_path = Path(os.path.join(ALLSKYPATH, 'env.json'))
    atomic_write_json(file_path, env_data)
    
def load_secrets_file() -> Dict[str, Any]:
    file_path = Path(os.path.join(ALLSKYPATH, 'env.json'))
    env_data: Dict[str, Any] = {}
    if file_path.is_file():
        with file_path.open("r", encoding="utf-8") as f:
            try:
                env_data = json.load(f) or {}
            except json.JSONDecodeError:
                env_data = {}
                
    return env_data
                        
def save_flows_with_module(flows: Dict[str, Any], module_name: str, debug:bool = False, log_level:int = 4) -> None:
    log_level = LOGLEVEL
    if debug:
        log_level = 4    
    #try:
    for flow, flow_data in flows.items():
        file_path = os.path.join(ALLSKY_MODULES, flow)
        with open(file_path, 'w', encoding='utf-8') as file:
            json.dump(flow_data, file, indent=4)
#except Exception as e:
    #    log(0, f'ERROR: Failed to save flows for {module_name} - {e}')
    

def normalize_argdetails(ad):
    norm = {}
    for key, details in (ad or {}).items():
        norm[key] = {}
        for k, v in (details or {}).items():
            if k in ("required", "secret"):
                norm[key][k] = to_bool(v)
            elif k == "type" and isinstance(v, dict):
                norm[key][k] = {kk: _to_list(vv) for kk, vv in v.items()}
            else:
                norm[key][k] = v
    return norm

def compare_flow_and_module(flow_ad, code_ad):
    return  normalize_argdetails(flow_ad) != normalize_argdetails(code_ad)

def parse_version(file_path: str) -> dict:
    with open(file_path, "r", encoding="utf-8") as f:
        first_line = f.readline().strip()
		# 2nd line is short description of release.

    # Example:  v2025.12.01
    parts = first_line.lstrip("v").split(".")
    return {
        "raw": first_line,
        "year": parts[0],
        "major": parts[1] if len(parts) > 1 else None,
        "minor": parts[2] if len(parts) > 2 else None
    }
    
def get_allsky_version():
    version_file = os.environ['ALLSKY_VERSION_FILE']
    version_info = parse_version(version_file)

### Generic Whiptail stuff ###
def _menu_choice(ret: Union[tuple[str, int], str, None]) -> Union[str, None]:
    """Normalize Whiptail.menu return: -> str choice or None on cancel."""
    if isinstance(ret, tuple):      # (choice, exit_code)
        choice, code = ret
        return choice if code == 0 else None
    return ret
### End Generic Whiptail stuff ###
    
### List selection using Whiptail
def select_from_list(
    items: Sequence[Union[str, Tuple[str, str]]],
    prompt: str = "",
    title: str = "Select Item",
    back_title: str = "Select Item"
) -> Union[str, None]:
    from whiptail import Whiptail
    """
    Display a whiptail menu to select from a list of items.

    Args:
        title (str): Dialog title
        prompt (str): Message shown above the list
        items (list[str] | list[tuple]): List of items (strings or (tag, desc) tuples)

    Returns:
        str | None: Selected item tag, or None if cancelled
    """
    wt = Whiptail(title=title, backtitle=back_title, height=20, width=70, auto_exit=False)

    # Convert simple strings into (tag, desc)
    options = []
    for item in items:
        if isinstance(item, tuple):
            options.append(item)
        else:
            options.append((item, ""))

    ret = wt.menu(prompt, options)
    return _menu_choice(ret)
### End List selection using Whiptail
    
### Folder Selection using Whpiptail
def select_folder(
    start: str = "/home/pi",
    title: str = "Select Folder",
    back_title: str = "Select Folder",
    hide_hidden: bool = True
) -> Union[str, None]:
    from whiptail import Whiptail    
    """
    A drill-down folder selector using python-whiptail.

    Args:
        start (str): starting directory.
        hide_hidden (bool): ignore entries that start with '.' (except '..').

    Returns:
        str | None: selected folder path, or None if cancelled.
    """
    wt = Whiptail(
        title=title,
        backtitle=back_title,
        height=20,
        width=70,
        auto_exit=False
    )

    current = os.path.abspath(start)

    while True:
        # List subdirectories
        try:
            dirs = sorted(
                d for d in os.listdir(current)
                if os.path.isdir(os.path.join(current, d))
                and (not hide_hidden or not d.startswith("."))
            )
        except OSError as e:
            wt.msgbox(f"Error reading {current}:\n{e}")
            return None

        # Build menu options
        options = [("SELECT", "Use this folder")]
        if current != "/":
            options.append(("..", "Go up one level"))
        for d in dirs:
            options.append((d, "Directory"))

        # Show menu
        ret = wt.menu(f"Current: {current}", options)
        choice = _menu_choice(ret)

        if choice is None:     # Cancel/Esc
            return None
        if choice == "SELECT":
            return current
        if choice == "..":
            current = os.path.dirname(current)
            continue

        # Drill down into chosen dir
        current = os.path.join(current, choice)

### End folder selection
