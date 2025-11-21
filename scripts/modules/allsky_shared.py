"""
allsky_shared.py

Part of allsky postprocess.py modules.
https://github.com/AllskyTeam/allsky

This module is a common dumping ground for shared variables and functions
used by various Allsky components.

It provides helpers for:

- Reading environment variables and Allsky configuration
- Managing small on-disk "databases" used as debug stores
- Filesystem utilities (paths, permissions, extra-data files)
- Database connection helpers and automatic purge routines
- Overlay "extra data" JSON formatting and persistence
"""

import time
import os
import traceback
import pprint
import shlex
import subprocess
import requests
import json
import sqlite3
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
import numbers
from datetime import datetime, timezone, timedelta
from pathlib import Path
from functools import reduce
from allskyvariables.allskyvariables import ALLSKYVARIABLES
from allskydatabasemanager.allskydatabasemanager import ALLSKYDATABASEMANAGER, ConnType
import numpy as np
import numpy.typing as npt
from typing import Union, List, Dict, Any, Tuple, Sequence, Optional, Iterable
from mysql.connector.connection import MySQLConnection

 
try:
    locale.setlocale(locale.LC_ALL, '')
except:
    pass

ABORT = True

__all__ = [
    "save_extra_data",
    "load_extra_data_file",
    "delete_extra_data",
    "get_environment_variable",
    "read_environment_variable",
    "get_secrets",
    "load_secrets_file",
    "get_lat_lon",
    "get_pi_info",
    "create_cardinal",
    "should_run",
    "set_last_run",
    "convert_lat_lon",
    "get_setting",
    "update_setting",
    "log",
    "run_script",
    "run_python_script",
    "get_extra_dir",
    "get_value_from_debug_data",
    "load_json_file",
    "save_json_file",
    "obfuscate_password",
    "to_bool",
    "normalise_on_off",
    "get_api_url",
    "get_gpio_pin_details",
    "get_gpio_pin",
    "read_gpio_pin",
    "set_gpio_pin",
    "set_pwm",
    "stop_pwm",
    "create_device",
    "get_all_allsky_variables",
    "get_allsky_variable",
    "get_sensor_temperature",
    "get_camera_gain",
    "get_camera_type",
    "get_rpi_metadata",
    "get_rpi_meta_value",
    "get_ecowitt_data",
    "get_ecowitt_local_data",
    "get_hass_sensor_value",
    "get_flows_with_module",
    "get_allsky_version",
    "load_mask",
    "mask_image",
    "fast_star_count",
    "count_starts_in_image",
    "detect_meteors"
    "draw_detections"
    ]

def get_environment_variable(name, fatal=False, debug=False, try_allsky_debug_file=False):
    """
    Helper for reading an environment variable.

    This is the modern, snake_case wrapper around the legacy
    :func:`getEnvironmentVariable` implementation. New code should call this
    function rather than the camelCase version.

    Args:
        name: Name of the environment variable to read.
        fatal: If True and the variable cannot be resolved, the process will
            terminate with an error.
        debug: If True, values are read from the debug database instead of
            the real environment.
        try_allsky_debug_file: When False (default), the function will fall
            back to loading variables from ``variables.json``. When True,
            it will instead try to look up the value in the overlay debug
            data file.

    Returns:
        The resolved value as a string, or None if not found (and ``fatal``
        is False).
    """
    return getEnvironmentVariable(name, fatal, debug)

def getEnvironmentVariable(name, fatal=False, debug=False, try_allsky_debug_file=False):
    """Legacy camelCase environment variable accessor.

    This function contains the original implementation used throughout
    Allsky. It is retained for backwards compatibility. New code should
    prefer :func:`get_environment_variable` instead.

    See :func:`get_environment_variable` for parameter and return-value
    semantics.
    """
    global ALLSKY_TMP

    result = None

    if not debug:
        result = read_environment_variable(name)
        if result == None:    
            if try_allsky_debug_file:
                result = get_value_from_debug_data(name)
            else:
                # DO NOT change the below code
                json_variables = f"{ALLSKYPATH}/variables.json"
                with open(json_variables, 'r') as file:
                    json_data = json.load(file)

                for key, value in json_data.items():
                    os.environ[str(key)] = str(value)

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
    """
    Read an environment variable without any Allsky-specific fallback.

    This is a very thin wrapper around ``os.environ`` access and does not
    attempt to pull values from ``variables.json`` or any debug store.

    Args:
        name: Environment variable name.

    Returns:
        The value as a string, or None if the variable is not defined.
    """
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
    Load one or more secrets from ``env.json`` in ``ALLSKYPATH``.

    The file is expected to contain a flat JSON object mapping key names
    to secret values. Only the requested keys are returned; missing keys
    are silently ignored.

    Args:
        keys:
            Either a single key (string) or a list of key names to fetch.

    Returns:
        If a single key was requested, the value as a string (or None if
        it is not present).

        If multiple keys were requested, a ``dict`` mapping each key to
        its value. Keys that are not found are omitted from the mapping.

        If the file cannot be read or parsed, returns None (single key) or
        an empty dict (multiple keys).
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
    """
    Read latitude and longitude from settings and return them as floats.

    The settings ``latitude`` and ``longitude`` may be stored in a variety
    of formats supported by :func:`convert_lat_lon` (for example,
    ``51.5N`` or ``-0.13``). If a value is empty, the corresponding
    return value is ``None``.

    Returns:
        Tuple of ``(lat, lon)`` where each element is either a float or
        None if not defined.
    """
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
    """
    Query simple hardware details about the Raspberry Pi.

    Args:
        info:
            One of the predefined constants:

            - ``PI_INFO_MODEL`` – return the board model string.
            - ``Pi_INFO_CPU_TEMPERATURE`` – return the CPU temperature in °C.

    Returns:
        The requested value, or None if ``info`` does not match a
        supported constant.
    """
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
    """
    Obfuscate a secret value, leaving only a small prefix visible.

    This is primarily used when logging or displaying configuration
    values that should not be fully exposed.

    Args:
        secret: Original secret string.
        visible_chars: Number of characters at the start of the string
            to leave visible.

    Returns:
        Obfuscated string with ``'*'`` characters replacing the hidden
        portion.
    """
    return secret[:visible_chars] + '*' * (len(secret) - visible_chars)


def create_cardinal(degrees):
    """
    Convert a wind direction in degrees into a cardinal point.

    Args:
        degrees: Direction in degrees (0–360). North is 0°/360°, east is
            90°, and so on.

    Returns:
        A string containing one of the 16-point compass directions
        (e.g., ``'N'``, ``'NE'``, ``'SW'``), or ``'N/A'`` if the input
        cannot be interpreted.
    """
    try:
        cardinals = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW','W', 'WNW', 'NW', 'NNW', 'N']
        cardinal = cardinals[round(degrees / 22.5)]
    except Exception:
        cardinal = 'N/A'

    return cardinal


def should_run(module, period):
    """
    Helper to check whether a module should run again.

    This wrapper simply calls the legacy :func:`shouldRun`. New code
    should use this snake_case name; the camelCase version is retained
    for backwards compatibility.

    See :func:`shouldRun` for details.
    """
    return shouldRun(module, period)


def shouldRun(module, period):
    """
    Legacy function that implements the "last run" timing logic.

    It uses the internal key ``<module>_lastrun`` in the tiny on-disk
    database (see :func:`dbGet`) to determine when the module last ran.

    Args:
        module: Name of the module or task.
        period: Minimum number of seconds between runs.

    Returns:
        Tuple ``(should_run, diff)`` where:

        - ``should_run`` is True if the module should be run now.
        - ``diff`` is the number of seconds since the last run
          (0 if the module has never run).
    """
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
    """
    Helper to record that a module has just run.

    This function simply calls the legacy :func:`setLastRun`. New code
    should use this name; the camelCase variant is kept for older code.
    """
    setLastRun(module)


def setLastRun(module):
    """
    Legacy implementation to store the "last run" timestamp for a module.

    Args:
        module: Name of the module being tracked.
    """
    dbKey = module + "_lastrun"
    now = time.time()
    dbUpdate(dbKey, now)


def convertLatLonOld(input):
    """ Converts the lat and lon to decimal notation i.e. 0.2E becomes -0.2"""
    input = input.upper()
    multiplier = 1 if input[-1] in ['N', 'E'] else -1
    return multiplier * sum(float(x) / 60 ** n for n, x in enumerate(input[:-1].split('-')))


def convert_lat_lon(input):
    """
    Helper for converting latitude/longitude strings.

    This wrapper calls the legacy :func:`convertLatLon`. New code should
    use this snake_case name; the camelCase function is kept so existing
    callers continue to work.

    See :func:`convertLatLon` for details.
    """
    return convertLatLon(input)


def convertLatLon(input):
    """
    Convert a latitude/longitude value into a signed float.

    The input may either be:

    - A plain float (as string or number), e.g. ``51.5`` or ``-0.13``
    - A value with cardinal direction, e.g. ``51-30N`` or ``0.2E``

    If a cardinal direction (N, S, E, W) is present, the sign is derived
    from that direction.

    Args:
        input: Latitude or longitude value as a string or number.

    Returns:
        A float representing the coordinate in decimal degrees.
    """
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
    """
    Check the sky clarity flag from the environment.

    The function reads the environment variable ``AS_SKYSTATE`` and
    interprets it as a simple clear/not-clear status.

    Returns:
        Tuple ``(state, flag)`` where:

        - ``state`` is one of ``"clear"``, ``"not clear"``, or
          ``"unknown"``.
        - ``flag`` is True if the sky is clear, False otherwise.
    """
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
    """
    Check whether the "raining" flag is set in the environment.

    The function looks at the ``AS_ALLSKYRAINFLAG`` variable which is
    typically set by a weather sensor or external script.

    Returns:
        Tuple ``(state, flag)`` where:

        - ``state`` is ``"yes"``, ``"no"`` or ``"unknown"``.
        - ``flag`` is True if it is raining, False otherwise.
    """
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
    """
    Helper to ensure a directory exists.

    This wraps the legacy :func:`checkAndCreateDirectory` and should be
    used by new code.
    """
    checkAndCreateDirectory(file_path)


def checkAndCreateDirectory(file_path):
    """
    Legacy function that creates a directory (and parents) if needed.

    Args:
        file_path: Path of the directory to create. Parent directories
            are created as well. Permissions are set to ``0o777``.
    """
    os.makedirs(file_path, mode = 0o777, exist_ok = True)


def checkAndCreatePath(file_path):
    """
    Ensure the parent directory for a file path exists.

    Args:
        file_path: Full path to a file. The directory portion is created
            if it does not already exist.
    """
    path = os.path.dirname(file_path)
    os.makedirs(path, mode = 0o777, exist_ok = True)


def convertPath(path):
    """
    Expand Allsky-style placeholders in a path.

    Placeholders are of the form ``${VARNAME}``. For most names, the
    value will be taken from the environment. If the name is not present
    as-is, the prefix ``AS_`` is added and checked again.

    The special placeholder ``${CURRENT_IMAGE}`` is replaced by the
    basename of the ``CURRENT_IMAGE`` environment variable.

    Args:
        path: String path containing zero or more ``${...}`` segments.

    Returns:
        The expanded path string, or ``None`` if any placeholder could
        not be resolved.
    """
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
    """
    Create or reset a per-module debug directory.

    The directory is created under ``ALLSKY_TMP/debug/<module>``. If it
    already exists, it is removed and recreated.

    Args:
        module: Module name used to form the directory path.
    """
    global ALLSKY_TMP

    moduleTmpDir = os.path.join(ALLSKY_TMP, "debug", module)
    try:
        if os.path.exists(moduleTmpDir):
            shutil.rmtree(moduleTmpDir)
        os.makedirs(moduleTmpDir, exist_ok=True)
        log(4, f"INFO: Creating folder for debug {moduleTmpDir}")
    except:
        log(0, f"ERROR: Unable to create {moduleTmpDir}")


def setEnvironmentVariable(name, value, logMessage='', logLevel=4):
    """
    Set an environment variable, optionally logging the change.

    Args:
        name: Variable name.
        value: Value to set (will be converted to string by ``os.environ``).
        logMessage: Optional message to log if the set succeeds.
        logLevel: Log level used when emitting ``logMessage``.

    Returns:
        True on success, False if setting the variable failed.
    """
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
    """
    Helper to populate the process environment from variables.json.

    This wraps the legacy :func:`setupForCommandLine`. New callers should
    use this snake_case name.
    """
    setupForCommandLine()


def setupForCommandLine():
    """
    Legacy implementation to populate environment variables for CLI use.

    The function reads ``variables.json`` from ``ALLSKYPATH`` and exports
    each key/value pair into ``os.environ``. It then refreshes the global
    ``VARIABLES`` dict and the in-memory settings.

    This is typically used when running Allsky utilities directly from
    the shell, outside the normal capture flow.
    """
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
    """
    Load the main Allsky settings file into memory.

    The JSON file pointed to by ``ALLSKY_SETTINGS_FILE`` is parsed into
    the global ``SETTINGS`` dict and the ``LOGLEVEL`` global is updated
    from the ``debuglevel`` setting.
    """
    global SETTINGS, ALLSKY_SETTINGS_FILE, LOGLEVEL

    with open(ALLSKY_SETTINGS_FILE, "r") as fp:
        SETTINGS = json.load(fp)

    LOGLEVEL = int(getSetting("debuglevel"))


def get_setting(settingName):
    """
    Helper for reading a setting from the loaded settings JSON.

    This wraps the legacy :func:`getSetting` and should be used in new
    code. See :func:`getSetting` for details.
    """
    return getSetting(settingName)


def getSetting(settingName):
    """
    Legacy settings accessor.

    If the settings have not yet been loaded, this function will call
    :func:`readSettings` automatically.

    Args:
        settingName: Key name in the settings JSON.

    Returns:
        The value associated with ``settingName``, or None if it is not
        present.
    """
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
    """
    Persist the current in-memory settings back to disk.

    The global ``SETTINGS`` dict is written to ``ALLSKY_SETTINGS_FILE``
    in JSON format with indentation.
    """
    global SETTINGS, ALLSKY_SETTINGS_FILE

    with open(ALLSKY_SETTINGS_FILE, "w") as fp:
        json.dump(SETTINGS, fp, indent=4)


def update_settings(values):
    """
    Update multiple settings and write them to disk.

    Args:
        values: A mapping of setting names to new values. The incoming
            mapping is merged into the existing global ``SETTINGS`` dict.

    Notes:
        This function overwrites existing keys with new values where
        they overlap.
    """
    global SETTINGS

    readSettings()
    SETTINGS.update(values)

    writeSettings()    


def update_setting(values):
    """
    Helper to update one or more settings.

    This wraps the legacy :func:`updateSetting`. New code should use
    this snake_case name.
    """
    updateSetting(values)


def updateSetting(values):
    """
    Legacy implementation that updates settings one entry at a time.

    Args:
        values:
            Iterable of simple dicts, where each dict contains the key(s)
            and value(s) to update. Each dict is merged into the global
            ``SETTINGS`` dict in sequence.
    """
    global SETTINGS

    readSettings()
    for value in values:
        SETTINGS.update(value)

    writeSettings()


def var_dump(variable):
    """
    Convenience helper to pretty-print a Python object.

    This is mainly used during development or debugging.

    Args:
        variable: Any Python object to be printed.
    """
    pprint.PrettyPrinter(indent=2, width=128).pprint(variable)


def log(level, text, preventNewline = False, exitCode=None, sendToAllsky=False):
    """ Very simple method to log data if in verbose mode

    Log a message to stdout (depending on log level) and optionally
    forward it to the Allsky WebUI.

    Args:
        level:
            Numeric log level. The message is printed if the global
            ``LOGLEVEL`` is greater than or equal to this value. Level 0
            is treated as an error.
        text:
            The message to log.
        preventNewline:
            If True, the message is printed without a trailing newline.
        exitCode:
            If not None, the process exits with this code after logging
            the message.
        sendToAllsky:
            If True, the message is also passed to the Allsky WebUI via
            ``addMessage.sh``. Level 0 messages are always sent as
            errors.

    Notes:
        The function does not raise exceptions. If the WebUI message
        script fails, the error is silently ignored.
    """
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
    """
    Initialize the small on-disk "allskydb" database.

    The database is stored as a Python source file
    ``ALLSKY_TMP/allskydb.py`` containing a single ``DataBase`` dict.
    This function imports that module and populates the global ``DBDATA``
    mapping.

    If the file does not exist, it is created and initialized with an
    empty dict. If the file cannot be imported, it is treated as
    corrupted and reset to an empty database.
    """
    global DBDATA, ALLSKY_TMP

    dbFile = os.path.join(ALLSKY_TMP, 'allskydb.py')
    if not os.path.isfile(dbFile):
        file = open(dbFile, 'w+')
        file.write('DataBase = {}')
        file.close()
        set_permissions(dbFile)

    try:
        sys.path.insert(1, ALLSKY_TMP)
        database = __import__('allskydb')
        DBDATA = database.DataBase
    except:
        DBDATA = {}
        log(3, f"ERROR: Resetting corrupted Allsky database '{dbFile}'")


def db_add(key, value):
    """
    Helper to add a key/value pair to the tiny database.

    This wraps :func:`dbAdd`. New code should use this name.
    """
    dbAdd(key, value) 


def dbAdd(key, value):
    """
    Legacy function to add or replace a key in the tiny database.

    Args:
        key: Key name.
        value: Value to store.

    Notes:
        Changes are immediately persisted to disk via :func:`writeDB`.
    """
    global DBDATA
    DBDATA[key] = value
    writeDB()


def db_update(key, value):
    """
    Helper to update a key in the tiny database.

    This is just a synonym for :func:`dbAdd`/``dbUpdate`` and kept for
    readability.
    """
    return dbUpdate(key, value)


def dbUpdate(key, value):
    """
    Legacy implementation for updating a key in the tiny database.

    Args:
        key: Key name.
        value: Value to store (replacing any existing value).
    """
    global DBDATA
    DBDATA[key] = value
    writeDB()


def db_delete_key(key):
    """
    Helper to delete a key from the tiny database.

    Wraps :func:`dbDeleteKey`. New code should use this snake_case name.
    """
    dbDeleteKey(key)


def dbDeleteKey(key):
    """
    Legacy implementation for deleting a key from the tiny database.

    Args:
        key: Key to remove. If the key does not exist, nothing happens.
    """
    global DBDATA
    if dbHasKey(key):
        del DBDATA[key]
        writeDB()


def db_has_key(key):
    """
    Helper to check for the presence of a key in the tiny DB.

    This wraps :func:`dbHasKey`.
    """
    return dbHasKey(key)


def dbHasKey(key):
    """
    Legacy key-existence check for the tiny database.

    Args:
        key: Key to look up.

    Returns:
        True if the key exists, False otherwise.
    """
    global DBDATA
    return (key in DBDATA)


def db_get(key):
    """
    Helper for reading a key from the tiny database.

    This wraps :func:`dbGet`. New code should use this name.
    """
    return dbGet(key)


def dbGet(key):
    """
    Legacy getter for the tiny database.

    Args:
        key: Key name.

    Returns:
        The stored value, or None if the key is missing.
    """
    global DBDATA
    if dbHasKey(key):
        return DBDATA[key]
    else:
        return None


def write_env_to_db():
    """
    Snapshot the current environment variables into the debug database.

    The environment is stored under ``DBDEBUGDATA['os']`` in
    ``ALLSKY_TMP/allskydebugdb.py``. This is mainly used by debugging
    tools that need to reproduce the state of a particular capture run.
    """
    global ALLSKY_TMP

    dbFile = os.path.join(ALLSKY_TMP, 'allskydebugdb.py')
    if not os.path.isfile(dbFile):
        file = open(dbFile, 'w+')
        file.write('DataBase = {}')
        file.close()
        set_permissions(dbFile)
        
    try:
        sys.path.insert(1, ALLSKY_TMP)
        database = __import__('allskydebugdb')
        DBDEBUGDATA = database.DataBase
    except:
        DBDEBUGDATA = {}
        log(3, f"ERROR: Resetting corrupted Allsky database '{dbFile}'")

    DBDEBUGDATA['os'] = {}	
    for key, value in os.environ.items():            
        DBDEBUGDATA['os'][key] = value

    file = open(dbFile, 'w+')
    file.write('DataBase = ')
    file.write(str(DBDEBUGDATA))
    file.close()


def writeDB():
    """
    Persist the in-memory tiny database ``DBDATA`` to disk.

    The database is stored as a Python file in ``ALLSKY_TMP`` and is
    imported at startup by :func:`initDB`.
    """
    global DBDATA, ALLSKY_TMP

    dbFile = os.path.join(ALLSKY_TMP, 'allskydb.py')
    file = open(dbFile, 'w+')
    file.write('DataBase = ')
    file.write(str(DBDATA))
    file.close()


def create_file_web_server_access(file_name):
    """
    Create a file and set ownership/group so the web server can access it.

    The owner is taken from ``ALLSKY_OWNER`` and the group from
    ``ALLSKY_WEBSERVER_GROUP``.

    Args:
        file_name: Full path of the file to create or touch.

    Returns:
        True if the file exists and permissions were applied successfully,
        False otherwise.
    """
    import grp
    
    allsky_owner = get_environment_variable("ALLSKY_OWNER")
    web_server_group = get_environment_variable("ALLSKY_WEBSERVER_GROUP")
    
    uid = pwd.getpwnam(allsky_owner).pw_uid
    gid = grp.getgrnam(web_server_group).gr_gid
            
    return create_and_set_file_permissions(file_name, uid, gid, 0o770)      


def create_sqlite_database(file_name:str)-> bool:
    """
    Create a SQLite database with web-server-friendly permissions.

    If the file already exists, nothing is changed and True is returned.

    Args:
        file_name: Path to the SQLite database file.

    Returns:
        True if the database already existed or was created successfully.
        False if permission or creation failed.
    """
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
    """
    Run an arbitrary executable script and capture its output.

    Args:
        script: Path to the script or binary to execute.

    Returns:
        Tuple ``(returncode, output)`` where:

        - ``returncode`` is the process exit code, or 127 if the script
          was not found.
        - ``output`` is the combined stdout and stderr as a single
          string.
    """
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
    """
    Check a list of filenames for existence and readability under a base folder.

    Args:
        base_folder: Folder in which the files are expected to live.
        filenames: List of filenames (relative to ``base_folder``).

    Returns:
        True if at least one file exists and is readable, False otherwise.
    """
    base_folder = Path(base_folder)

    for name in filenames:
        file_path = os.path.join(base_folder, name)
        if is_file_readable(file_path):
            return True
    return False


def copy_list(file_names: list, source: str, dest: str) -> bool:
    """
    Copy a list of files from one directory to another.

    Files that do not exist or are not readable are silently skipped.

    Args:
        file_names: List of filenames (no path).
        source: Source directory.
        dest: Destination directory.

    Returns:
        True always. The return value is not currently used to report
        partial failures.
    """
    result = True

    for file_name in file_names:
        source_file = os.path.join(source, file_name)
        if is_file_readable(source_file):
            copy_file(source_file, dest)
                
    return result


def copy_folder(source, dest, uid=None, guid=None, dirs_exist_ok=True) -> bool:
    """
    Recursively copy a folder tree.

    Args:
        source: Source directory.
        dest: Destination directory. If it already exists and
            ``dirs_exist_ok`` is False, an exception is raised.
        uid: Reserved for future use; currently ignored.
        guid: Reserved for future use; currently ignored.
        dirs_exist_ok: Passed through to ``shutil.copytree``.

    Returns:
        True if the copy succeeded, False otherwise.
    """
    result = False

    try:
        shutil.copytree(source, dest, dirs_exist_ok=dirs_exist_ok)
        result = True
    except FileExistsError:
        result = False
        
    return result


def copy_file(source, dest, uid=None, gid=None) -> bool:
    """
    Copy a single file and apply permissions.

    If ``dest`` is a directory, the file is copied into that directory.
    The destination file ownership and group are adjusted via
    :func:`set_permissions`.

    Args:
        source: Full path to the source file.
        dest: Destination path or directory.
        uid: Optional user ID to use when setting ownership.
        gid: Optional group ID to use when setting ownership.

    Returns:
        True if the copy succeeded and permissions were applied,
        False otherwise.
    """
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
    """
    Recursively remove a directory and all of its contents.

    Args:
        path: Path to the directory.

    Returns:
        True if the directory existed and was removed successfully,
        False otherwise.
    """
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
    """
    Set file ownership and group based on Allsky environment.

    If ``uid`` or ``gid`` are not provided, they are looked up from
    ``ALLSKY_OWNER`` and ``ALLSKY_WEBSERVER_GROUP`` respectively, with
    sensible fallbacks.

    Args:
        file_name: Path to the file or directory.
        uid: Optional user ID. If None, derived from ``ALLSKY_OWNER`` or
            the current user.
        gid: Optional group ID. If None, derived from
            ``ALLSKY_WEBSERVER_GROUP`` or the current group.

    Notes:
        - When running as root (uid == 0), both owner and group are
          changed.
        - When running as a non-root user, only the group is changed.
        - Any failures are logged but not raised.
    """
    if uid is None:
        allsky_owner = get_environment_variable("ALLSKY_OWNER")
        try:
            uid = pwd.getpwnam(allsky_owner).pw_uid
        except Exception:
            uid = os.getuid()

    if gid is None:
        group = get_environment_variable("ALLSKY_WEBSERVER_GROUP") or "www-data"
        try:
            gid = grp.getgrnam(group).gr_gid
        except KeyError:
            gid = os.getgid()

    try:
        if os.getuid() == 0:
            os.chown(file_name, uid, gid)
        else:
            # Non-root: only group change is allowed in theory
            os.chown(file_name, -1, gid)
    except PermissionError as e:
        log(0, f"WARNING: set_permissions: cannot chown {file_name}: {e}")
        traceback.print_exc()
    except OSError as e:
        log(0, f"WARNING: set_permissions: OS error on {file_name}: {e}")
        traceback.print_exc()
    

def create_and_set_file_permissions(file_name, uid=None, gid=None, permissions=None, is_sqlite=False, file_data = '')-> bool:
    """
    Create a file if needed and apply ownership and permissions.

    For SQLite files, the function will open the database once to ensure
    it is created properly. For normal files, optional initial content
    can be written.

    Args:
        file_name: Path of the file to create/adjust.
        uid: User ID to use with :func:`set_permissions`.
        gid: Group ID to use with :func:`set_permissions`.
        permissions: Optional mode to pass to ``os.chmod`` (e.g. ``0o660``).
        is_sqlite: If True, treat the file as a SQLite database.
        file_data: Optional initial content for non-SQLite files.

    Returns:
        True if the file exists and permissions were successfully applied,
        False otherwise.
    """
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
    """
    Check whether a file exists and is writable.

    Args:
        fileName: Path to a file.

    Returns:
        True if the path refers to an existing regular file that the
        current process can write to, False otherwise.
    """
    if os.path.exists(fileName):
        if os.path.isfile(fileName):
            return os.access(fileName, os.W_OK)
        else:
            return False
    else:
        return False


def is_file_readable(file_name):
    """
    Helper to check if a file exists and is readable.

    This wraps the legacy :func:`isFileReadable`. New code should use
    this snake_case name.
    """
    return isFileReadable(file_name)


def isFileReadable(fileName):

    """ Check if a file is readable """
    """
    Check if a given path is a readable regular file.

    Args:
        fileName: Path to the file.

    Returns:
        True if the file exists, is a regular file, and can be read by
        the current process; False otherwise.
    """
    if os.path.exists(fileName):
        if os.path.isfile(fileName):
            return os.access(fileName, os.R_OK)
        else:
            return False
    else:
        return False


def int(val):
    """
    Locale-aware integer conversion helper.

    This function intentionally shadows the built-in ``int`` to ensure
    that numbers using the current locale's formatting are handled
    correctly.

    Args:
        val: Value to convert. If not already a string, it is converted
            with ``locale.str``.

    Returns:
        Integer value parsed using the current locale settings.

    Raises:
        ValueError: If the value cannot be parsed as an integer.
    """
    if not isinstance(val, str):
        val = locale.str(val)
    val = locale.atoi(val)

    return val


def asfloat(val):
    """
    Locale-aware floating point conversion helper.

    Args:
        val: Value to convert. If not a string, it is converted to one
            using ``locale.str``. The locale-specific decimal separator
            is normalised to ``'.'`` before parsing.

    Returns:
        Floating point representation of ``val``.
    """
    localDP = ','

    if not isinstance(val, str):
        val = locale.str(val)

    val = val.replace(localDP, '.')
    val = float(val)

    return val


def get_extra_dir(current_only:bool = False) -> list[str] | str:
    """
    Helper to get the "extra data" directory or directories.

    This simply calls :func:`getExtraDir`. New code should use this
    snake_case name.
    """
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
    """
    Normalize an extra-data filename in a parameter dict.

    The function:

    - Ensures the file has an extension (defaults to ``.json``).
    - If the base name is empty, it uses the module name instead.

    Args:
        params: Dict containing configuration parameters.
        module: Module name used as default filename when needed.
        fileKey: Key in ``params`` whose value is the file name to
            validate and normalise.
    """
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
    """
    Look up a key in the overlay debug file.

    This function is used when running in debug mode to retrieve values
    that would normally be supplied via environment variables.

    Args:
        key: Name of the value to retrieve.

    Returns:
        The corresponding value as a string with whitespace removed, or
        None if the file does not exist, cannot be read, or the key is
        not present.
    """
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
    """
    Install a list of system packages using ``apt-get``.

    Each non-comment, non-empty line in ``pkg_file`` is treated as a
    package name. The output of each installation attempt is appended to
    ``log_file``.

    Args:
        pkg_file: Path to a text file containing package names.
        log_file: Path to a log file to append install output to.

    Returns:
        True if all packages were installed successfully, False if one
        or more failed.
    """
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
    """
    Install Python packages from a requirements-style file.

    Each non-comment, non-empty line in ``req_file`` is passed directly
    to ``pip install``. Output is appended to ``log_file``.

    Args:
        req_file: Path to a pip requirements file.
        log_file: Path to a log file to append install output to.

    Returns:
        True if all packages were installed successfully, False if any
        installations failed.
    """
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


def save_json_file(data: dict, filename: Union[str, Path]) -> None:
    """
    Save a dictionary to a JSON file with pretty formatting.

    Args:
        data: Dictionary to save. Must be JSON-serializable.
        filename: Path or string of the file to write.

    Returns:
        True if the file could be written successfully, False otherwise.
    """
    file_path = Path(filename)

    try:
        with file_path.open('w', encoding='utf-8') as file:
            json.dump(data, file, ensure_ascii=False, indent=4)
    except:
        return False
    
    return True
            

def load_json_file(path: str | Path):
    """
    Load a JSON file and return its parsed contents.

    Args:
        path: Path to the JSON file.

    Returns:
        The parsed JSON data (dict or list). If the file does not exist,
        cannot be read, or contains invalid JSON, an empty dict is
        returned.
    """
    try:
        file_path = Path(path)
        if not file_path.is_file():
            return {}

        with file_path.open("r", encoding="utf-8") as file:
            return json.load(file)

    except (OSError, json.JSONDecodeError):
        return {}


def get_database_config():
    """
    Construct the database configuration from secrets and settings.

    The database host, user, password and database name are loaded from
    ``env.json`` via :func:`get_secrets`. The database type and enabled
    flag come from the Allsky settings.

    Returns:
        A dict containing at least:

        - ``databasehost``
        - ``databaseuser``
        - ``databasepassword``
        - ``databasedatabase``
        - ``databasetype``
        - ``databaseenabled``
    """
    secret_data = get_secrets(['databasehost', 'databaseuser', 'databasepassword', 'databasedatabase'])
    secret_data['databasetype'] = get_setting('databasetype')
    secret_data['databaseenabled'] = get_setting('enabledatabase')
    
    return secret_data


#
# Database purge functions
#
def get_purge_config():
    """
    Load and merge purge configuration from core and user db_data.json files.

    The configuration defines how long to retain data for each database table.
    """
    # Build paths to both the core and user configuration files
    core_db_config_file = os.path.join(get_environment_variable('ALLSKY_CONFIG'), 'db_data.json')
    user_db_config_file = os.path.join(get_environment_variable('ALLSKY_MYFILES_DIR'), 'db_data.json')
    
    # Load JSON data from both locations
    core_db_config = load_json_file(core_db_config_file)
    user_db_config = load_json_file(user_db_config_file)
    
    # Merge user config over core config (user overrides core)
    db_config_file = core_db_config | user_db_config
        
    # Iterate over each table configuration entry
    for name, entry in db_config_file.items():
        pd = entry.get("purge_days")

        # If purge_days is a numeric value (e.g., 365), normalize it to an integer
        if isinstance(pd, numbers.Number):
            entry["purge_days"] = int(pd)
            continue

        # If purge_days references a setting (dynamic source), resolve it
        if isinstance(pd, dict) and pd.get("source_type") == "settings":
            src_name = pd.get("source_name")
            if src_name:
                val = get_setting(src_name)
                try:
                    # Convert the value to an integer (e.g., "365" → 365)
                    entry["purge_days"] = int(val)
                except (TypeError, ValueError):
                    # If conversion fails, leave it unchanged
                    pass
                    
    # Return the final merged and normalized configuration
    return db_config_file


def _calculate_purge_timestamp(purge_config: dict, table: str, override: str = "") -> int:
    """
    Calculate the cutoff timestamp for purging old records.

    Args:
        purge_config: Dictionary containing per-table purge settings.
        table: The table name being processed.
        override: Optional string like "2d" or "23h" to override the default retention period.

    Returns:
        Tuple of (cutoff_timestamp, cutoff_datetime, formatted_config_value)
    """
    # Default to global setting for days to keep, if defined
    days_to_keep = get_setting('daystokeep')

    # Handle manual override, if provided
    if override != "":
        # If override is just whitespace, use default value
        if not override.strip():
            if days_to_keep == None:
                days_to_keep = 14  # Fallback default
            days_to_keep = f'{days_to_keep}d'

        # Validate override format: e.g. "2d" or "12h"
        m = re.fullmatch(r"\s*(\d+(?:\.\d+)?)\s*([dhDH])\s*", override)
        if not m:
            raise ValueError("to_keep must look like '2d' or '23h' (days/hours).")

        # Extract numeric value and unit (d = days, h = hours)
        amount = float(m.group(1))
        unit = m.group(2).lower()
    else:
        # Use configured or global default
        unit = "d"
        amount = purge_config.get(table, {}).get("purge_days", days_to_keep)
        
    # Compute timedelta based on unit (days or hours)
    delta = timedelta(days=amount) if unit == 'd' else timedelta(hours=amount)

    # Calculate cutoff datetime and timestamp
    now = datetime.now(timezone.utc)
    cutoff_time = now - delta
    cutoff_config_value = f"{amount}{unit}"
    cutoff_timestamp = builtins.int(cutoff_time.timestamp())
    
    # Return both numeric and readable cutoff values
    return cutoff_timestamp, cutoff_time, cutoff_config_value
        

def purge_database(dry_run: bool = False, to_keep: str = "") -> int:
    """
    Purge old records from all database tables according to purge configuration.

    Args:
        dry_run: If True, only count rows that would be deleted.
        to_keep: Optional override retention period (e.g., "7d", "48h").

    Returns:
        Dictionary mapping each table name to number of deleted (or would-be deleted) rows.
    """
    results = {}

    # Load the purge configuration
    purge_config = get_purge_config()
    
    # Get a database connection
    database_conn = get_database_connection()
    if database_conn is not None:
        # Retrieve list of tables in the connected database
        available_tables: Iterable[str] = database_conn.list_tables()        

        # Process each table individually
        for table in available_tables:
            # Calculate the cutoff time for this table
            cutoff_timestamp, cutoff_time, cutoff_config_value = _calculate_purge_timestamp(purge_config, table)

            try:
                # Quote identifiers to handle special characters or reserved words
                q_table = database_conn._quote_ident(table) 
                q_ts    = database_conn._quote_ident('timestamp')

                if dry_run:
                    # Only count how many rows would be deleted
                    row = database_conn.fetchone(
                        f"SELECT COUNT(*) AS n FROM {q_table} WHERE {q_ts} <= :cutoff",
                        {"cutoff": cutoff_timestamp}
                    )
                    number_to_delete = builtins.int((row or {}).get("n", 0))
                    results[table] = number_to_delete

                    # Log summary of what would happen in dry run mode
                    log(4, f"INFO: [DRY RUN] {table}: {number_to_delete} rows would be deleted (<= {cutoff_time}) - {cutoff_config_value}")
                else:
                    # Execute actual deletion query
                    cur = database_conn.execute(
                        f"DELETE FROM {q_table} WHERE {q_ts} <= :cutoff",
                        {"cutoff": cutoff_timestamp}
                    )
                    number_deleted = builtins.int(getattr(cur, "rowcount", 0) or 0)
                    results[table] = number_deleted

                    # Log actual deletion results
                    log(4, f"INFO: {table}: deleted {number_deleted} rows (<= {cutoff_time}) - {cutoff_config_value}")

            except Exception as e:
                # Log any error encountered during table processing
                log(0, f"Error processing table {table} in purge_database: {e}")
                results[table] = -1

    # Return per-table results summary
    return results
#
# End Database purge functions
#

  
def get_database_connection(silent=True):
    """
    Create and return an ``ALLSKYDATABASEMANAGER`` connection.

    The configuration is derived from :func:`get_database_config`. Both
    MySQL and SQLite are supported.

    Args:
        silent: Passed through to ``ALLSKYDATABASEMANAGER`` to control
            how noisy connection checks are.

    Returns:
        An ``ALLSKYDATABASEMANAGER`` instance if the database is enabled
        and the connection works, otherwise None.
    """
    database_conn = None
    secret_data = get_database_config()

    if secret_data['databaseenabled']:
        if not re.fullmatch(r'[a-zA-Z_][a-zA-Z0-9_]*', secret_data['databasedatabase']):
            log(0, f"ERROR: Database table name {secret_data['databasedatabase']} is invalid")
            return

        database_conn = None
        if secret_data['databasetype'] == 'mysql':
            database_conn = ALLSKYDATABASEMANAGER(
                "mysql",
                host=secret_data['databasehost'],
                user=secret_data['databaseuser'],
                password=secret_data['databasepassword'],
                database=secret_data['databasedatabase'],
                silent=silent         
            )

        if secret_data['databasetype'] == 'sqlite':
            try:
                db_path = os.environ['ALLSKY_DATABASES']
            except KeyError:
                setupForCommandLine()
                db_path = os.environ['ALLSKY_DATABASES']                
            database_conn = ALLSKYDATABASEMANAGER("sqlite", db_path=db_path, silent=silent)

        if database_conn and not database_conn.check_connection():
            log(0, "ERROR: Failed to connect to MySQL database. Please run the database manager utility.")
            return
        
    return database_conn
                

def update_database(structure, extra_data, event, source):
    """
    Decide whether to write capture data to the database and, if so,
    perform the update.

    The decision is based on:

    - The time of day (day/night).
    - The event type (postcapture, daynight, nightday, periodic).
    - Relevant settings such as ``savedaytimeimages`` and
      ``savenighttimeimages``.
    - Per-structure configuration in ``structure['database']``.

    Args:
        structure: Dictionary containing module database settings.
        extra_data: JSON-serialised data string to send to the database.
        event: Event type (e.g., ``'postcapture'``, ``'periodic'``).
        source: Human-readable identifier for logging.
    """
    save_daytime = get_setting('savedaytimeimages')
    save_nighttime = get_setting('savenighttimeimages')

    tod = get_environment_variable('DAY_OR_NIGHT')
    if tod is None:
        tod = get_environment_variable('DAY_OR_NIGHT', debug=True)
        if tod is not None:
            tod = tod.lower()
        else:
            tod = 'night'
    else:
        tod = tod.lower()

    update_database_flag = False

    if event == 'postcapture':
        if tod == 'day':
            mode = structure.get('database',{}).get('time_of_day_save', {}).get('day', 'enabled')
            if mode == 'enabled':
                if save_daytime:
                    update_database_flag = True
                else:
                    message = (
                        "INFO: Not saving to database as save daytime images is "
                        "disabled and it is daytime"
                    )
                    
            if mode == 'never':
                message = "INFO: Not saving to database as database time_of_day_save day is set to never"
                
            if mode == 'always':
                update_database_flag = True

        if tod == 'night':
            mode = structure.get('database',{}).get('time_of_day_save', {}).get('night', 'enabled')
            if mode == 'enabled':        
                if save_nighttime:
                    update_database_flag = True
                else:
                    message = (
                        "INFO: Not saving to database as save nighttime images is "
                        "disabled and it is nighttime"
                    )

            if mode == 'never':
                message = "INFO: Not saving to database as database todsave night is set to never"
                
            if mode == 'always':
                update_database_flag = True
       
    if event in ('daynight', 'nightday', 'periodic'):
        mode = structure.get('database',{}).get('time_of_day_save', {}).get(event, 'enabled')
        
        if mode == 'always':
            update_database_flag = True
        
        if mode == 'enabled':
            if tod == 'day':
                if save_daytime:
                    update_database_flag = True
                else:
                    message = (
                        "INFO: Not saving to database as save daytime images is "
                        f"disabled for the time_of_day_save {event} and it is daytime"
                    )
                    
            if tod == 'night':
                if save_nighttime:
                    update_database_flag = True
                else:
                    message = (
                        "INFO: Not saving to database as save nighttime images is "
                        f"disabled for the time_of_day_save {event} and it is nighttime"
                    )

        if mode == 'never':
            message = f"INFO: Not saving to database as database time_of_day_save {event} is set to never"
        
    if update_database_flag:
        database_conn = get_database_connection()
        if database_conn is not None:
            data = json.loads(extra_data)
            if not _update_database(database_conn, data, structure, source):
                log(0, f"ERROR: Unable to save data to {secret_data['databasetype']} database")
                
    else:
        log(4, message)


def _update_database(database_conn: Any, data: dict, structure: dict, source: str) -> bool:
    """
    Internal helper that actually writes one row (and optional child
    rows) to the database.

    Args:
        database_conn: An ``ALLSKYDATABASEMANAGER`` instance.
        data: Parsed "extra data" dict for a capture.
        structure: Metadata describing how to map fields into the
            database, including primary key configuration.
        source: Human-readable name of the module or data source.

    Returns:
        True if the update logic completed (even if no row was written),
        False only if an unexpected error occurs.
    """
    result = True
    
    if 'database' in structure and 'enabled' in structure['database']:
        if structure['database']['enabled']:
            if 'table' in structure['database']:
                database_table = structure['database']['table']
                                
                # split the extra data into two lists. One that uses the main table
                # and those that use other tables
                has_table: dict[str, dict] = {}
                no_table: dict[str, dict] = {}
                for key, value in data.items():
                    if isinstance(value.get('database'), dict) and 'table' in value['database']:
                        has_table[key] = value
                    else:
                        no_table[key] = value
                    
                columns = no_table.keys()
                primary_key = structure.get('database', {}).get('pk', 'id')
                primary_key_type = structure.get('database', {}).get('pk_type', 'int')
                primary_key_source = structure.get('database', {}).get('pk_source', 'now')
                primary_key_value = get_primary_key_value(structure)
                
                columns = {
                    primary_key: primary_key_type,
                    "timestamp": "int"
                }

                row = {
                    "id": primary_key_value,
                    "timestamp": builtins.int(time.time())
                }
                
                include_all = structure.get('database', {}).get('include_all', 'true')
                include_all = to_bool(include_all)
                if include_all:
                    for key, entry in data.items():
                        columns[key] = infer_sql_type(entry)
                        row[key] = entry.get("value")
                else:
                    for key, entry in data.items():
                        include_data = entry.get('database', {}).get('include', 'false')
                        include_data = to_bool(include_data)
                        if (include_data):
                            columns[key] = infer_sql_type(entry)
                            row[key] = entry.get("value")
                                           
                database_conn.ensure_columns(database_table, columns, primary_key=[primary_key])

                database_conn.upsert(
                    table=database_table,
                    data=row,
                    unique_keys=[primary_key] 
                )

                log(4, f"INFO: Saved data to the {database_conn.get_database_type()} database")                    
            else:
                log(4, f"WARNING: No table defined for {source}")
        else:
            log(4, f"WARNING: Database disabled for for {source}")                    
    else:
        log(4, f"WARNING: Database structure invalid for {source}")                    
                
    return result


def get_primary_key_value(structure: dict):
    """
    Determine the primary key value for a database row.

    The default is taken from ``AS_TIMESTAMP`` (environment or debug
    data), with a final fallback to the current time. If the structure
    defines a ``pk_source``, that name is treated as an environment (or
    debug) variable containing the primary key.

    Args:
        structure: Database configuration section from the module
            structure.

    Returns:
        The primary key value as a string or integer.
    """
    # Assume we have access to AS_TIMESTAMP in the env
    primary_key_value = get_environment_variable('AS_TIMESTAMP')

    # Possibly running in the periodic flow so get the value from the overlay debug data
    if primary_key_value == None:
        primary_key_value = get_value_from_debug_data("AS_TIMESTAMP")
        
    # Final fallback to use current time
    if primary_key_value == None:
        primary_key_value = builtins.int(time.time()) 

    # Get the primary key.        
    if 'pk_source' in structure:
        primary_key =  structure['pk_source']
        temp_primary_key = get_environment_variable(primary_key)  
        if temp_primary_key == None:
            temp_primary_key = get_value_from_debug_data(primary_key)
            if temp_primary_key is not None:
                primary_key_value = primary_key
                
    return primary_key_value
        

def infer_sql_type(entry: dict) -> str:
    """Infer an SQL column type from the entry's 'type' or 'dbtype'."""
    if "dbtype" in entry:
        return entry["dbtype"]
    t = entry.get("type", "").lower()
    if t in ("int", "integer"):
        return "INT"
    if t in ("number", "float", "double", "decimal"):
        return "FLOAT"
    if t in ("bool", "boolean"):
        return "TINYINT(1)"
    if t in ("temperature",):
        return "FLOAT"
    return "VARCHAR(1024)"


def obfuscate_password(password: str) -> str:
    """
    Obfuscate a password, leaving the first and last characters visible.

    This is used when logging configuration without exposing full
    credentials.

    Args:
        password: Original password string.

    Returns:
        Obfuscated password. Very short passwords are completely masked.
    """
    if not password:
        return ""
    if len(password) <= 2:
        return "*" * len(password)
    return password[0] + "*" * (len(password) - 2) + password[-1]


def get_database_row_key(structure: dict):
    """
    Determine a per-row key used for storing extra data in the database.

    The logic is similar to :func:`get_primary_key_value`, but uses the
    structure's ``row_key`` entry instead of ``pk_source`` if present.

    Args:
        structure: Database configuration structure.

    Returns:
        The row key value as a string or integer.
    """
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


def save_extra_data(file_name: str = '', extra_data: dict = {}, source: str = '', structure: dict = {}, custom_fields: dict = {}, event: str = 'postcapture'):
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
        event (str, optional):
            Event type (e.g. ``'postcapture'``, ``'periodic'``) used when
            deciding if database updates should occur.

    Returns:
        None

    Side Effects:
        - Creates/updates a file in ALLSKY_EXTRA.
        - Applies filesystem permissions to the output file.
        - May perform a database update if requested by `structure`.

    Error Handling:
        Any exception is (currently) allowed to propagate only into the
        surrounding code; earlier versions logged and swallowed errors.
    """
    saveExtraData(file_name, extra_data, source, structure, custom_fields, event)


def saveExtraData(file_name: str = '', extra_data: dict = {}, source: str = '', structure: dict = {}, custom_fields: dict = {}, event: str = 'postcapture'):

    #try:
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
            update_database(structure, extra_data, event, source)
    #except Exception as e:
    #    me = os.path.basename(__file__)
    #    eType, eObject, eTraceback = sys.exc_info()
    #    log(0, f'ERROR: saveExtraData failed on line {eTraceback.tb_next.tb_lineno} {eTraceback.tb_lineno} in {me} - {e}')


def format_extra_data_json(extra_data, structure, source):
    """
    Shape flat extra-data values into a structured JSON document.

    The structure metadata describes which keys should be present and
    how they should be labelled. This function is primarily used for
    overlay data where multiple indexed entries are generated from a
    template.

    Args:
        extra_data: Flat dict of values collected from a module.
        structure: Dict describing expected values, labels and counts.
        source: Human-readable module name for inclusion in the result.

    Returns:
        A new dict containing the formatted extra data. Keys that are
        missing from ``extra_data`` are skipped.
    """
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
    """
    Load an extra data file from one or more ALLSKY_EXTRA directories.

    This helper looks for the given file name in all configured extra-data
    directories (via :func:`get_extra_dir`). If it finds a readable file,
    it will attempt to parse it according to its extension.

    Currently only JSON files are parsed. Text files are recognised but
    not yet processed (the block is a placeholder).

    Args:
        file_name (str):
            Name of the extra data file to load (e.g. ``"extra.json"``).
        type (str, optional):
            Force the file type. If set to ``"json"``, the file is parsed
            as JSON regardless of its extension.

    Returns:
        dict:
            Parsed JSON data if successful; otherwise an empty dict.
    """
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
    """
    Preferred wrapper for removing extra data files.

    This is the underscore version and should be used in new code. It simply
    delegates to :func:`deleteExtraData`, which contains the legacy
    implementation.

    Args:
        fileName (str):
            File name to remove from all configured extra data directories.
    """
    deleteExtraData(fileName)


def deleteExtraData(fileName):
    """
    Legacy implementation for deleting extra data files.

    This function scans all configured extra data directories and removes
    the specified file wherever it exists and is writable. New code should
    call :func:`delete_extra_data` instead, which wraps this function.

    Args:
        fileName (str):
            File name to remove from the extra data directories.
    """
    extra_data_paths = get_extra_dir()
    for extra_data_path in extra_data_paths:
        if extra_data_path is not None:               # it should never be None
            extra_data_filename = os.path.join(extra_data_path, fileName)
            if os.path.exists(extra_data_filename):
                if isFileWriteable(extra_data_filename):
                    os.remove(extra_data_filename)


def is_just_filename(path):
    """
    Check whether a path is just a bare filename with no directory component.

    Args:
        path (str):
            Path or filename to test.

    Returns:
        bool:
            True if the path has no directory component (i.e. its basename
            is the same as the original string), False otherwise.
    """
    return os.path.basename(path) == path


def _load_flows_for_cleanup():
    """
    Load post-processing flow definitions used during extra-data cleanup.

    This helper reads any existing flow JSON files (day, night, periodic,
    nightday, daynight) from the ALLSKY_MODULES directory.

    Returns:
        dict:
            A mapping of flow name to its parsed JSON configuration.
    """
    flows = {}
    flow_names = ['day', 'night', 'periodic', 'nightday', 'daynight']
    for flow_name in flow_names:
        flow_file_name = os.path.join(ALLSKY_MODULES, f'postprocessing_{flow_name}.json')
        if is_file_readable(flow_file_name):
            with open(flow_file_name, 'r') as file:
                flows[flow_name] = json.load(file)
    return flows


def _load_module_settings():
    """
    Load module-level settings used for extra-data cleanup.

    This reads the ``module-settings.json`` file from the ALLSKY_MODULES
    directory if it exists.

    Returns:
        dict:
            Parsed settings dictionary or an empty dict if the file is missing
            or unreadable.
    """
    module_settings = {}
    module_settings_filename = os.path.join(ALLSKY_MODULES, f'module-settings.json')
    if is_file_readable(module_settings_filename):
        with open(module_settings_filename, 'r') as file:
            module_settings = json.load(file)
    return module_settings


def _get_dict_path(data, keys):
    """
    Safely traverse nested dictionaries using a list of keys.

    Args:
        data (dict):
            Root dictionary to traverse.
        keys (list):
            Sequence of keys to follow into the nested structure.

    Returns:
        Any:
            The nested value if all keys exist, otherwise None.
    """
    try:
        return reduce(lambda d, k: d[k], keys, data)
    except (KeyError, TypeError):
        return None


def _get_expiry_time_for_module(flows, module_name, module_settings, tod):
    """
    Determine how long extra data for a given module should be kept.

    The expiry time (in seconds) is resolved by checking:

      1. Flow-specific ``dataage`` and ``enabledataage`` settings for the
         current time of day (``tod``).
      2. The maximum ``dataage`` across other flows if no explicit override
         is enabled.
      3. A per-module ``expiryage`` in module settings.
      4. A default of 600 seconds if nothing else is defined.

    Args:
        flows (dict):
            Flow configuration loaded by :func:`_load_flows_for_cleanup`.
        module_name (str):
            Name of the module (JSON filename or base name).
        module_settings (dict):
            Per-module settings loaded by :func:`_load_module_settings`.
        tod (str):
            Time-of-day flow name (e.g. ``"day"`` or ``"night"``).

    Returns:
        int:
            Expiry age in seconds for this module.
    """
    delete_age = 0

    module_name = module_name.replace('.json', '').replace('allsky_', '')

    delete_age = _get_dict_path(flows, [tod, module_name, 'metadata', 'arguments', 'dataage'])
    enable_delete_age = _get_dict_path(flows, [tod, module_name, 'metadata', 'arguments', 'enabledataage'])

    use_custom_delete_age = False
    if enable_delete_age is not None:
        if enable_delete_age:
            if delete_age is not None:
                use_custom_delete_age = True

    if not use_custom_delete_age:
        for flow in flows:
            if flow != tod:
                delete_age_tmp = _get_dict_path(flows, [flow, module_name, 'metadata', 'arguments', 'dataage'])
                if delete_age_tmp is not None:
                    delete_age_tmp = round(float(delete_age_tmp))
                    if delete_age_tmp > delete_age:
                        delete_age = delete_age_tmp

    if delete_age is not None:
        delete_age = round(float(delete_age))

    if delete_age is None:
        delete_age = 600
        if 'expiryage' in module_settings:
            delete_age = round(module_settings['expiryage'])

    return delete_age


def cleanup_extra_data():
    """
    Remove stale extra-data files from all ALLSKY_EXTRA directories.

    For each extra-data file found, the function determines whether it should
    be deleted based on its age. At the moment the retention period is fixed
    to 600 seconds (10 minutes); the plumbing is in place to compute a
    per-module age via :func:`_get_expiry_time_for_module`.

    Logging at level 4 is used to indicate which files are deleted or kept.
    """
    flows = _load_flows_for_cleanup()
    module_settings = _load_module_settings()
    tod = getEnvironmentVariable('DAY_OR_NIGHT', fatal=True).lower()

    extra_data_paths = get_extra_dir()
    for extra_data_path in extra_data_paths:
        with os.scandir(extra_data_path) as entries:
            for entry in entries:
                if entry.is_file():
                    # delete_age = _get_expiry_time_for_module(flows, entry.name, module_settings, tod)
                    delete_age = 600
                    cleanup_extra_data_file(entry.path, delete_age)


def cleanup_extra_data_file(file_name, delete_age=600):
    """
    Check a single extra-data file and delete it if it has expired.

    If only a bare filename is given, the file is assumed to live in the
    current extra-data directory. The file's modification time is used to
    calculate its age.

    Args:
        file_name (str):
            Full path or bare filename of the extra-data file.
        delete_age (int, optional):
            Age threshold in seconds. Files older than this will be deleted.
            Defaults to 600 seconds.
    """
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
    """
    Remove a file or directory tree.

    This function is a convenience wrapper around ``os.remove`` and
    ``shutil.rmtree``. It ignores `FileNotFoundError` and `PermissionError`
    exceptions and returns whether anything was actually removed.

    Args:
        path (str):
            Path to a file or directory.

    Returns:
        bool:
            True if a file or directory was successfully removed, False otherwise.
    """
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
    """
    Preferred wrapper for module cleanup actions.

    This underscore version should be used by new code. It simply delegates
    to :func:`cleanupModule`, which holds the legacy implementation.

    Args:
        moduleData (dict):
            Module configuration containing optional ``"cleanup"`` entries.
    """
    cleanupModule(moduleData)


def cleanupModule(moduleData):
    """
    Legacy implementation for cleaning up module side effects.

    If the module configuration contains a ``"cleanup"`` section, this function
    will:

      * Delete any extra data files listed under ``"files"`` using
        :func:`deleteExtraData`.
      * Remove any environment variables listed under ``"env"``.

    New code should call :func:`cleanup_module` instead.

    Args:
        moduleData (dict):
            Module configuration dictionary that may include a ``"cleanup"``
            section with ``"files"`` and/or ``"env"`` lists.
    """
    if "cleanup" in moduleData:
        if "files" in moduleData["cleanup"]:
            for fileName in moduleData["cleanup"]["files"]:
                deleteExtraData(fileName)

        if "env" in moduleData["cleanup"]:
            for envVariable in moduleData["cleanup"]["env"]:
                os.environ.pop(envVariable, None)


def createTempDir(path):
    """
    Create a temporary directory with world-writable permissions.

    If the directory does not exist, it is created with mode ``0o777`` and
    the process' umask is temporarily set to ``0o000`` to ensure the desired
    mode is honoured.

    Args:
        path (str):
            Path of the directory to create.
    """
    if not os.path.isdir(path):
        umask = os.umask(0o000)
        os.makedirs(path, mode=0o777)
        os.umask(umask)


def get_gpio_pin_details(pin):
    """
    Get the CircuitPython ``board`` pin object for a given numeric pin.

    This is a convenience wrapper around :func:`getGPIOPin` and should be
    used by new code.

    Args:
        pin (int):
            Numeric pin index (0–27) corresponding to a board pin.

    Returns:
        Any:
            The matching ``board.Dx`` constant, or None if the pin is unknown.
    """
    return getGPIOPin(pin)


def get_gpio_pin(pin):
    """
    Legacy alias for :func:`getGPIOPin`.

    This underscore version currently forwards to the legacy implementation
    :func:`getGPIOPin`. Depending on context elsewhere in the file, a second
    definition of :func:`get_gpio_pin` is used for GPIO reads. Both are kept
    for backward compatibility, so use :func:`read_gpio_pin` for HTTP-based
    reads and :func:`get_gpio_pin_details` / :func:`getGPIOPin` for board pin
    mappings.

    Args:
        pin (int):
            Numeric pin index.

    Returns:
        Any:
            Board pin object as returned by :func:`getGPIOPin`.
    """
    return getGPIOPin(pin)


def getGPIOPin(pin):
    """
    Legacy implementation mapping a numeric pin index to a CircuitPython board pin.

    This function returns a ``board.Dx`` constant for a subset of Raspberry Pi
    header pins. It is used by higher-level helpers to configure I2C or other
    peripherals. New code should generally call :func:`get_gpio_pin_details`
    which wraps this function.

    Args:
        pin (int):
            Numeric pin index (0–27) to map.

    Returns:
        Any:
            Corresponding ``board`` pin object, or None if the mapping is not
            defined.
    """
    import board
    result = None
    if pin == 0:
        result = board.D0

    if pin == 1:
        result = board.D1

    if pin == 2:
        result = board.D2

    # SDA = pin.SDA

    if pin == 3:
        result = board.D3

    # SCL = pin.SCL

    if pin == 4:
        result = board.D4

    if pin == 5:
        result = board.D5

    if pin == 6:
        result = board.D6

    if pin == 7:
        result = board.D7

    # CE1 = pin.D7

    if pin == 8:
        result = board.D8

    # CE0 = pin.D8

    if pin == 9:
        result = board.D9

    # MISO = pin.D9

    if pin == 10:
        result = board.D10

    # MOSI = pin.D10

    if pin == 11:
        result = board.D11

    # SCLK = pin.D11
    # SCK = pin.D11

    if pin == 12:
        result = board.D12

    if pin == 13:
        result = board.D13

    if pin == 14:
        result = board.D14

    # TXD = pin.D14

    if pin == 15:
        result = board.D15

    # RXD = pin.D15

    if pin == 16:
        result = board.D16

    if pin == 17:
        result = board.D17

    if pin == 18:
        result = board.D18

    if pin == 19:
        result = board.D19

    # MISO_1 = pin.D19

    if pin == 20:
        result = board.D20

    # MOSI_1 = pin.D20

    if pin == 21:
        result = board.D21

    # SCLK_1 = pin.D21
    # SCK_1 = pin.D21

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
    """
    Normalise common on/off style values into a boolean.

    This helper treats ``"on"`` (case-insensitive) and ``"1"`` as True,
    and everything else as False.

    Note:
        There is another :func:`to_bool` definition further down which uses
        a slightly different interpretation. Both are retained for backward
        compatibility in different call sites.

    Args:
        value (Any):
            Input value to normalise.

    Returns:
        bool:
            True for ``"on"`` or ``"1"``, False otherwise.
    """
    return str(value).strip().lower() == 'on' or str(value).strip() == '1'


def normalise_on_off(value):
    """
    Normalise an on/off style value to the strings ``"on"`` or ``"off"``.

    Args:
        value (Any):
            Raw value (e.g. ``"on"``, ``"1"``, ``"off"``, ``0``).

    Returns:
        str:
            ``"on"`` if the input looks like an enabled value, otherwise ``"off"``.
    """
    if str(value).strip().lower() == 'on' or str(value).strip() == '1':
        return 'on'
    return 'off'


def get_api_url():
    """
    Resolve the Allsky API base URL from the environment.

    If ``ALLSKY_API_URL`` is not present in the current environment, this
    helper calls :func:`setupForCommandLine` to load variables from the
    usual ``variables.json`` file, and then re-reads the environment.

    Returns:
        str:
            The API base URL from ``ALLSKY_API_URL``.
    """
    try:
        api_url = os.environ['ALLSKY_API_URL']
    except KeyError:
        setupForCommandLine()
        api_url = os.environ['ALLSKY_API_URL']

    return api_url


def get_gpio_pin(gpio_pin, pi=None, show_errors=False):
    """
    Read the logical state of a GPIO pin via the Allsky API (legacy alias).

    This definition simply calls :func:`read_gpio_pin`. It is kept for
    backward compatibility with existing code that expects ``get_gpio_pin``
    to return a pin value rather than a board pin object.

    Args:
        gpio_pin (int | str):
            Pin identifier understood by the Allsky API.
        pi (Any, optional):
            Unused placeholder kept for interface compatibility.
        show_errors (bool, optional):
            Currently unused; kept for interface compatibility.

    Returns:
        bool:
            True if the GPIO is reported as ``"on"``, False otherwise.
    """
    return read_gpio_pin(gpio_pin, pi=None, show_errors=False)


def read_gpio_pin(gpio_pin, pi=None, show_errors=False):
    """
    Read the logical state of a GPIO pin via the Allsky HTTP API.

    A GET request is sent to the Allsky API, and the returned JSON is
    expected to contain a ``"value"`` field with the string ``"on"`` or
    ``"off"``.

    Args:
        gpio_pin (int | str):
            Pin identifier understood by the Allsky API.
        pi (Any, optional):
            Unused placeholder for compatibility with other GPIO interfaces.
        show_errors (bool, optional):
            Currently unused; errors are propagated via exceptions.

    Returns:
        bool:
            True if the GPIO value is ``"on"``, False otherwise.

    Raises:
        requests.HTTPError:
            If the HTTP request fails (via ``raise_for_status``).
    """
    api_url = get_api_url()
    response = requests.get(
        f'{api_url}/gpio/digital/{gpio_pin}',
        timeout=2
    )
    response.raise_for_status()
    data = response.json()

    return data.get('value') == 'on'


def set_gpio_pin(gpio_pin, state, pi=None, show_errors=False):
    """
    Set the logical state of a GPIO pin via the Allsky HTTP API.

    Args:
        gpio_pin (int | str):
            Pin identifier understood by the Allsky API.
        state (Any):
            Desired state; normalised using :func:`normalise_on_off` to
            ``"on"`` or ``"off"``.
        pi (Any, optional):
            Unused placeholder for compatibility with other GPIO interfaces.
        show_errors (bool, optional):
            Currently unused; errors are propagated via exceptions.

    Returns:
        dict:
            Parsed JSON response from the API.

    Raises:
        requests.HTTPError:
            If the HTTP request fails (via ``raise_for_status``).
    """
    api_url = get_api_url()
    state = normalise_on_off(state)
    response = requests.post(
        f'{api_url}/gpio/digital',
        json={
            'pin': str(gpio_pin),
            'state': state.lower()
        },
        timeout=2
    )
    response.raise_for_status()
    return response.json()


def set_pwm(gpio_pin, duty_cycle, pi=None, show_errors=False):
    """
    Set PWM output on a GPIO pin via the Allsky HTTP API.

    This helper posts the requested duty cycle (and a fixed frequency of
    1000Hz) to the API.

    Args:
        gpio_pin (int | str):
            Pin identifier understood by the Allsky API.
        duty_cycle (int | float):
            Duty cycle value; interpreted by the remote API.
        pi (Any, optional):
            Unused placeholder for compatibility with other GPIO interfaces.
        show_errors (bool, optional):
            Currently unused; errors are propagated via exceptions.

    Returns:
        dict:
            Parsed JSON response from the API.

    Raises:
        requests.HTTPError:
            If the HTTP request fails (via ``raise_for_status``).
    """
    api_url = get_api_url()
    frequency = 1000
    response = requests.post(
        f'{api_url}/gpio/pwm',
        json={
            'pin': str(gpio_pin),
            'duty': duty_cycle,
            'frequency': frequency
        },
        timeout=2
    )
    response.raise_for_status()
    return response.json()


def stop_pwm(gpio_pin):
    """
    Stop PWM output on a GPIO pin via the Allsky HTTP API.

    This is implemented by sending a PWM request with 0% duty cycle.

    Args:
        gpio_pin (int | str):
            Pin identifier understood by the Allsky API.

    Returns:
        dict:
            Parsed JSON response from the API.

    Raises:
        requests.HTTPError:
            If the HTTP request fails (via ``raise_for_status``).
    """
    api_url = get_api_url()
    frequency = 1000
    duty_cycle = 0
    response = requests.post(
        f'{api_url}/gpio/pwm',
        json={
            'pin': str(gpio_pin),
            'duty': duty_cycle,
            'frequency': frequency
        },
        timeout=2
    )
    response.raise_for_status()
    return response.json()


def _get_value_from_json_file(file_path, variable):
    """
    Load a JSON extra-data file and extract a variable by name.

    Each top-level key in the JSON may either map to a simple value or to
    a dict containing a ``"value"`` field. This helper handles both forms.

    Args:
        file_path (str | Path):
            Path to the JSON file.
        variable (str):
            The variable name to look up.

    Returns:
        Any:
            The resolved value (raw or ``['value']``), or None if the variable
            is not found or the file cannot be parsed.
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
    except:  # pylint: disable=W0702
        pass

    return result


def _get_value_from_text_file(file_path, variable):
    """
    Load a line-based text extra-data file and extract a variable by name.

    The file is expected to contain ``name=value`` pairs, one per line.

    Args:
        file_path (str | Path):
            Path to the text file.
        variable (str):
            The variable name to look up.

    Returns:
        str | None:
            The raw value string if found, otherwise None.
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
    """
    Retrieve all known Allsky variables via the ALLSKYVARIABLES helper.

    Args:
        show_empty (bool, optional):
            Whether to include variables that have no value. Defaults to True.
        module (str, optional):
            Optional module filter, depending on the ALLSKYVARIABLES
            implementation.
        indexed (bool, optional):
            If True, variables may be returned in an indexed form.
        raw (bool, optional):
            If True, return raw data structures from ALLSKYVARIABLES.

    Returns:
        Any:
            Whatever is returned by ``ALLSKYVARIABLES().get_variables(...)``.
    """
    allskyvariables = ALLSKYVARIABLES()
    return allskyvariables.get_variables(show_empty, module, indexed, raw)


def get_allsky_variable(variable):
    """
    Look up a single Allsky variable from environment or extra-data files.

    The lookup order is:

      1. Environment via :func:`getEnvironmentVariable`.
      2. JSON extra-data files in all extra-data directories.
      3. Text extra-data files in all extra-data directories.

    Args:
        variable (str):
            The variable name to retrieve.

    Returns:
        Any:
            The variable value if found, otherwise None.
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


def get_sensor_temperature():
    """
    Get the current sensor temperature for the active camera.

    For Raspberry Pi cameras, this reads the ``SensorTemperature`` value
    from the Pi metadata. For other camera types it uses the
    ``AS_TEMPERATURE_C`` environment variable.

    If no temperature can be determined, 0.0 is returned.

    Returns:
        float:
            Sensor temperature in °C.
    """
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
    """
    Get the current camera gain.

    For Raspberry Pi cameras, this reads the ``AnalogueGain`` value from the
    Pi metadata. For other camera types it uses the ``AS_GAIN`` environment
    variable.

    If no gain can be determined, 0.0 is returned.

    Returns:
        float:
            Camera gain value.
    """
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
    """
    Get the configured camera type from the environment.

    Returns:
        str:
            Lowercase camera type string (e.g. ``"rpi"``).
    """
    camera_type = get_environment_variable('CAMERA_TYPE')
    return camera_type.lower()


def get_rpi_meta_value(key):
    """
    Read a single value from the Raspberry Pi camera metadata file.

    The metadata file format can be either JSON or simple ``key=value`` text.
    This helper tries JSON first and falls back to line-based parsing.

    Args:
        key (str):
            Metadata key to retrieve.

    Returns:
        Any:
            The value if found, or 0 if the file is missing, unreadable, or the
            key is not present.
    """
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
    """
    Determine the path to the Raspberry Pi camera metadata file.

    The metadata path is extracted from the ``extraargs`` in the main
    settings file if a ``--metadata`` argument is present. If no explicit
    path is found, a default of ``metadata.txt`` in the current directory
    is used.

    Returns:
        str:
            Path to the metadata file.
    """
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
    """
    Safely retrieve a nested value from a dict/list structure.

    The path is a separator-delimited string (by default using ``"."``),
    where segments index into dict keys or list indices as appropriate.

    Args:
        data (dict | list):
            The root data structure.
        path (str):
            Separator-delimited path, e.g. ``"data.outdoor.temperature.value"``.
        value_type (callable, optional):
            Callable used to cast/convert the final value (e.g. ``float``).
        separator (str, optional):
            Path segment separator. Defaults to ``"."``.

    Returns:
        Any:
            Converted value if all lookups succeed, otherwise None.
    """
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
    """
    Fetch live weather data from the remote Ecowitt cloud API.

    If all of the required credentials are non-empty, the function builds
    an API URL and attempts to parse a range of fields such as outdoor and
    indoor temperatures, humidity, rainfall, wind, pressure, and lightning.

    All fields are returned in a nested dict with sensible defaults of None.

    Args:
        api_key (str):
            Ecowitt API key.
        app_key (str):
            Ecowitt application key.
        mac_address (str):
            Device MAC address registered with Ecowitt.
        temp_unitid (int, optional):
            Temperature unit ID expected by the API. Defaults to 1.
        pressure_unitid (int, optional):
            Pressure unit ID expected by the API. Defaults to 3.

    Returns:
        dict | str:
            On success, a nested dictionary of parsed values. On HTTP error,
            a descriptive error string may be returned instead.
    """
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

        log(4, f"INFO: Reading Ecowitt API from - {ECOWITT_API_URL}")
        try:
            response = requests.get(ECOWITT_API_URL)
            if response.status_code == 200:
                raw_data = response.json()

                result['outdoor']['temperature'] = _get_nested_value(raw_data, 'data.outdoor.temperature.value', float)
                result['outdoor']['feels_like'] = _get_nested_value(raw_data, 'data.outdoor.feels_like.value', float)
                result['outdoor']['humidity'] = _get_nested_value(raw_data, 'data.outdoor.humidity.value', float)
                result['outdoor']['app_temp'] = _get_nested_value(raw_data, 'data.outdoor.app_temp.value', float)
                result['outdoor']['dew_point'] = _get_nested_value(raw_data, 'data.outdoor.dew_point.value', float)

                result['indoor']['temperature'] = _get_nested_value(raw_data, 'data.indoor.temperature.value', float)
                result['indoor']['humidity'] = _get_nested_value(raw_data, 'data.indoor.humidity.value', float)

                result['solar_and_uvi']['solar'] = _get_nested_value(raw_data, 'data.solar_and_uvi.solar.value', float)
                result['solar_and_uvi']['uvi'] = _get_nested_value(raw_data, 'data.solar_and_uvi.uvi.value', float)

                result['rainfall']['rain_rate'] = _get_nested_value(raw_data, 'data.rainfall.rain_rate.value', float)
                result['rainfall']['daily'] = _get_nested_value(raw_data, 'data.rainfall.daily.value', float)
                result['rainfall']['event'] = _get_nested_value(raw_data, 'data.rainfall.event.value', float)
                result['rainfall']['hourly'] = _get_nested_value(raw_data, 'data.rainfall.hourly.value', float)
                result['rainfall']['weekly'] = _get_nested_value(raw_data, 'data.rainfall.weekly.value', float)
                result['rainfall']['monthly'] = _get_nested_value(raw_data, 'data.rainfall.monthly.value', float)
                result['rainfall']['yearly'] = _get_nested_value(raw_data, 'data.rainfall.yearly.value', float)

                result['wind']['wind_speed'] = _get_nested_value(raw_data, 'data.wind.wind_speed.value', float)
                result['wind']['wind_gust'] = _get_nested_value(raw_data, 'data.wind.wind_gust.value', float)
                result['wind']['wind_direction'] = _get_nested_value(raw_data, 'data.wind.wind_direction.value', int)

                result['pressure']['relative'] = _get_nested_value(raw_data, 'data.pressure.relative.value', float)
                result['pressure']['absolute'] = _get_nested_value(raw_data, 'data.pressure.absolute.value', float)

                result['lightning']['distance'] = _get_nested_value(raw_data, 'data.lightning.distance.value', float)
                result['lightning']['count'] = _get_nested_value(raw_data, 'data.lightning.count.value', int)

                log(1, f'INFO: Data read from Ecowitt API')
            else:
                result = f'Got error from the Ecowitt API. Response code {response.status_code}'
                log(0, f'ERROR: {result}')
        except Exception as e:
            me = os.path.basename(__file__)
            eType, eObject, eTraceback = sys.exc_info()
            log(0, f'ERROR: Failed to read data from Ecowitt on line {eTraceback.tb_lineno} in {me} - {e}')
    else:
        log(0, 'ERROR: Missing Ecowitt Application Key, API Key or MAC Address')

    return result


def get_ecowitt_local_data(address, password=None):
    """
    Fetch live weather data directly from a local Ecowitt gateway.

    This variant talks to the gateway's local HTTP API and parses a variety
    of metrics such as temperatures, humidity, rainfall, wind, pressure and
    lightning. Values are returned in a nested dict with None defaults.

    Units are parsed from the API response and temperature values are
    converted to Celsius when needed.

    Args:
        address (str):
            Base URL or IP address of the Ecowitt gateway.
        password (str, optional):
            Reserved for password-protected gateways (currently unused).

    Returns:
        dict:
            Nested dictionary of parsed values.
    """
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
        Extract numeric part from a value string and optionally convert °F to °C.

        Args:
            val (Any):
                Raw value from the Ecowitt JSON (may contain unit text).
            as_type (callable):
                Type to cast the numeric part to (e.g. float, int).
            unit (str | None):
                Optional unit string; when reported as Fahrenheit, values are
                converted to Celsius.

        Returns:
            Any | None:
                Parsed and optionally converted value, or None on failure.
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
        """
        Helper to locate a record in an Ecowitt list and extract (value, unit).

        Args:
            data_list (list[dict]):
                List of readings as returned by the Ecowitt gateway.
            target_id (str):
                Identifier to match in each dict's ``"id"`` field.

        Returns:
            tuple:
                ``(value, unit)`` where both may be None if the ID is not found.
        """
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
    """
    Query a Home Assistant sensor and return its numeric state.

    A GET request is sent to the Home Assistant REST API using the supplied
    long-lived token. The sensor's state is parsed as a float on success.

    Args:
        ha_url (str):
            Base URL of the Home Assistant instance (e.g. ``"http://host:8123"``).
        ha_ltt (str):
            Long-lived access token for Home Assistant.
        ha_sensor (str):
            Entity ID of the sensor (e.g. ``"sensor.outdoor_temp"``).

    Returns:
        float | None:
            The sensor state as a float, or None if the sensor cannot be read.
    """
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
    """
    Instantiate an I2C device class on a given bus.

    The device class is imported dynamically and initialised with an
    Adafruit Blinka ``busio.I2C`` object constructed from a known set of
    SCL/SDA pins for the requested bus number.

    Args:
        import_name (str):
            Module path to import (e.g. ``"adafruit_bme280"``).
        class_name (str):
            Name of the device class in that module.
        bus_number (int):
            I2C bus number (e.g. 1, 3, 4, 5, 6).
        i2c_address (str, optional):
            Optional I2C address string (e.g. ``"0x76"``). If omitted, the
            device class is constructed without an explicit address.

    Returns:
        Any:
            An instance of the requested device class.

    Raises:
        ImportError:
            If the module or class cannot be imported.
        ValueError:
            If no pin mapping exists for the given bus number.
    """
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
    """
    Scan module flow files and return those containing a given module.

    Only ``postprocessing_*.json`` files that are not debug variants are
    considered. Files that fail to parse are quietly ignored.

    Args:
        module_name (str):
            Name of the module to search for in the flow definitions.

    Returns:
        dict:
            Mapping of filename to parsed JSON content for flows that contain
            the given module.
    """
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
    """
    Normalise a value to a boolean, supporting several truthy strings.

    This version differs slightly from the earlier :func:`to_bool` in this
    file: it treats ``"true"``, ``"1"``, ``"yes"`` and ``"y"`` (case-
    insensitive) as True, and everything else as False. It is used when
    normalising configuration dictionaries.

    Args:
        v (bool | str | None):
            Input value.

    Returns:
        bool:
            Normalised boolean value.
    """
    if isinstance(v, bool):
        return v
    if v is None:
        return False
    return str(v).strip().lower() in ("true", "1", "yes", "y")


def _to_list(v: str | list | None) -> list | str | None:
    """
    Convert a comma-separated string into a list.

    If the input is already a list or does not contain a comma, it is
    returned unchanged.

    Args:
        v (str | list | None):
            Value to normalise.

    Returns:
        list | str | None:
            List of stripped segments for comma-separated strings, otherwise
            the original value.
    """
    if isinstance(v, str) and "," in v:
        return [x.strip() for x in v.split(",")]
    return v


def atomic_write_json(path: Path, data: Dict[str, Any]) -> None:
    """
    Atomically write a JSON file to disk.

    The content is first written to a temporary ``.tmp`` sibling and then
    moved into place with ``os.replace``, which is atomic on most systems.

    Args:
        path (Path):
            Target file path.
        data (dict):
            JSON-serialisable dictionary to write.
    """
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
        f.write("\n")
    os.replace(tmp, path)


def save_secrets_file(env_data: Dict[str, Any]) -> None:
    """
    Save environment-style secrets to ``env.json`` in the Allsky home directory.

    Args:
        env_data (dict):
            Mapping of key/value pairs to persist.
    """
    file_path = Path(os.path.join(ALLSKYPATH, 'env.json'))
    atomic_write_json(file_path, env_data)


def load_secrets_file() -> Dict[str, Any]:
    """
    Load environment-style secrets from ``env.json`` in the Allsky home directory.

    Any JSON decoding errors are treated as an empty file.

    Returns:
        dict:
            Parsed secrets dictionary, or an empty dict if missing/invalid.
    """
    file_path = Path(os.path.join(ALLSKYPATH, 'env.json'))
    env_data: Dict[str, Any] = {}
    if file_path.is_file():
        with file_path.open("r", encoding="utf-8") as f:
            try:
                env_data = json.load(f) or {}
            except json.JSONDecodeError:
                env_data = {}

    return env_data


def save_flows_with_module(flows: Dict[str, Any], module_name: str, debug: bool = False, log_level: int = 4) -> None:
    """
    Persist updated flow definitions back to their JSON files.

    Each entry in ``flows`` is written out to a file underneath
    ``ALLSKY_MODULES`` with the given key as the filename. The module name
    is currently only used for potential logging.

    Args:
        flows (dict):
            Mapping of filename to flow definition dictionaries.
        module_name (str):
            Name of the module whose flows are being saved (for logging).
        debug (bool, optional):
            If True, forces the log level to 4 (currently unused, kept for
            future logging behaviour).
        log_level (int, optional):
            Requested log level (currently overridden by global ``LOGLEVEL``).
    """
    log_level = LOGLEVEL
    if debug:
        log_level = 4
    # try:
    for flow, flow_data in flows.items():
        file_path = os.path.join(ALLSKY_MODULES, flow)
        with open(file_path, 'w', encoding='utf-8') as file:
            json.dump(flow_data, file, indent=4)
    # except Exception as e:
    #     log(0, f'ERROR: Failed to save flows for {module_name} - {e}')


def normalize_argdetails(ad):
    """
    Normalise a flow/module ``argdetails`` structure.

    This helper ensures that boolean fields such as ``required`` and
    ``secret`` are properly converted using :func:`to_bool`, and any type
    definitions that are themselves dicts have any comma-separated values
    converted into lists.

    Args:
        ad (dict | None):
            Argument details dictionary (or None).

    Returns:
        dict:
            A normalised copy of the input structure.
    """
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
    """
    Compare ``argdetails`` from flow configuration and code.

    The structures are first normalised with :func:`normalize_argdetails`
    and then compared for inequality.

    Args:
        flow_ad (dict | None):
            Argument details as defined in the flow JSON.
        code_ad (dict | None):
            Argument details as defined in the module code.

    Returns:
        bool:
            True if the normalised structures differ, False if they match.
    """
    return normalize_argdetails(flow_ad) != normalize_argdetails(code_ad)


def parse_version(file_path: str) -> dict:
    """
    Parse the Allsky version file.

    The first line is expected to contain a version string like
    ``v2025.12.01``. This helper splits the string into useful parts.

    Args:
        file_path (str):
            Path to the version file.

    Returns:
        dict:
            Dictionary with keys:

              * ``raw``: the raw version line.
              * ``year``: the first numeric part.
              * ``major``: second part or None.
              * ``minor``: third part or None.
    """
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
    """
    Convenience helper to retrieve and parse the Allsky version.

    The version file path is taken from the ``ALLSKY_VERSION_FILE``
    environment variable and passed to :func:`parse_version`.

    Returns:
        dict:
            Parsed version info as returned by :func:`parse_version`.
    """
    version_file = os.environ['ALLSKY_VERSION_FILE']
    version_info = parse_version(version_file)


### Generic Whiptail stuff ###
def _menu_choice(ret: Union[tuple[str, int], str, None]) -> Union[str, None]:
    """Normalize Whiptail.menu return: -> str choice or None on cancel.

    Args:
        ret (tuple[str, int] | str | None):
            Return value from a whiptail ``menu`` call.

    Returns:
        str | None:
            Selected choice string, or None if the user cancelled.
    """
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
        items (Sequence[str | tuple[str, str]]):
            Items to show in the menu. Entries may be simple strings or
            ``(tag, description)`` tuples.
        prompt (str, optional):
            Message shown above the list.
        title (str, optional):
            Dialog title.
        back_title (str, optional):
            Back title shown in the dialog border.

    Returns:
        str | None:
            Selected item tag, or None if cancelled.
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

    The user can browse directories starting at ``start`` and pick a folder
    by choosing ``SELECT``. Hidden directories can optionally be filtered
    out.

    Args:
        start (str, optional):
            Starting directory. Defaults to ``"/home/pi"``.
        title (str, optional):
            Dialog title.
        back_title (str, optional):
            Back title shown in the dialog border.
        hide_hidden (bool, optional):
            If True, ignore entries starting with ``"."`` (except ``".."``).

    Returns:
        str | None:
            The selected folder path, or None if cancelled.
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


#
# Image processing
#
def write_debug_image(module, fileName, image):
    """
    Preferred wrapper for saving debug images into the WebUI debug folder.

    This underscore helper simply delegates to the legacy
    :func:`writeDebugImage` implementation.

    Args:
        module (str):
            Module name used to create a per-module debug folder.
        fileName (str):
            File name for the debug image.
        image (numpy.ndarray):
            Image array to write with OpenCV.
    """
    writeDebugImage(module, fileName, image)


def writeDebugImage(module, fileName, image):
    """
    Legacy implementation for writing a debug image to the WebUI.

    Images are written to ``ALLSKY_WEBUI/debug/<module>/<fileName>`` using
    OpenCV's ``imwrite`` and logged at level 4.

    Args:
        module (str):
            Module name used to create a per-module debug folder.
        fileName (str):
            File name for the debug image.
        image (numpy.ndarray):
            Image array to write with OpenCV.
    """
    import cv2
    global ALLSKY_WEBUI

    debugDir = os.path.join(ALLSKY_WEBUI, "debug", module)
    os.makedirs(debugDir, mode=0o777, exist_ok=True)
    moduleTmpFile = os.path.join(debugDir, fileName)
    cv2.imwrite(moduleTmpFile, image, params=None)
    log(4, "INFO: Wrote debug file {0}".format(moduleTmpFile))


def load_mask(mask_file_name, target_image):
    """
    Load a grayscale mask image and resize it to match a target image.

    The mask is loaded from ``ALLSKY_OVERLAY/images/<mask_file_name>`` and
    converted to a float mask in the range [0, 1]. If the mask dimensions do
    not match the target image, it is resized accordingly.

    Args:
        mask_file_name (str):
            Name of the mask file to load.
        target_image (numpy.ndarray):
            Target image whose shape is used for resizing.

    Returns:
        numpy.ndarray | None:
            Float mask array in the range [0, 1], or None if the mask could
            not be loaded.
    """
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


def mask_image(image, mask_file_name='', log_info=False):
    """
    Apply a mask to an image, returning a masked copy.

    The mask is loaded via :func:`load_mask` and applied either directly
    (for grayscale images) or per-channel (for colour images). The result
    is clipped and converted back to ``uint8``.

    Args:
        image (numpy.ndarray):
            Input image (grayscale or BGR).
        mask_file_name (str, optional):
            Name of the mask image file. If empty, no masking is performed
            and None is returned.
        log_info (bool, optional):
            If True, log a message at level 4 when a mask is applied.

    Returns:
        numpy.ndarray | None:
            Masked image, or None if no mask is applied or an error occurs.
    """
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

            output = np.clip(output, 0, 255).astype(np.uint8)

            if log_info:
                log(4, f'INFO: Mask {mask_file_name} applied')

    except Exception as e:
        me = os.path.basename(__file__)
        eType, eObject, eTraceback = sys.exc_info()
        log(0, f'ERROR: mask_image failed on line {eTraceback.tb_lineno} in {me} - {e}')

    return output
#
# End Image processing
#


#
# Star detection
#
def count_starts_in_image(image, mask_file_name=None):
    """
    Detect stars in an image using Photutils' DAOStarFinder.

    The image is converted to grayscale if needed, optionally masked with
    :func:`mask_image`, and then processed with sigma-clipped statistics
    and DAOStarFinder to locate star centroids.

    Args:
        image (numpy.ndarray):
            Input image (grayscale or BGR).
        mask_file_name (str | None, optional):
            Optional mask file name to apply before detection.

    Returns:
        tuple[list[tuple[float, float]], numpy.ndarray]:
            A tuple containing:

              * A list of ``(x, y)`` star coordinates.
              * The (possibly masked) image used for detection.
    """
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
    daofind = DAOStarFinder(fwhm=3.0, threshold=5.0 * std)
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
    Fast, approximate star detection based on template matching and heuristics.

    The image is optionally downscaled for speed, background-subtracted,
    and correlated with a Gaussian template. Peaks are then filtered using
    a local contrast measure and a simple anisotropy test on gradient
    magnitudes to reject elongated features.

    Args:
        image (numpy.ndarray):
            Input image (grayscale or BGR uint8).
        min_d_px (int):
            Approximate star core diameter in pixels (on the original image).
        scale (float, optional):
            Downscale factor applied before processing. 0.5 is a good default
            for 1080p frames.
        corr_thresh (float, optional):
            Normalised template-match threshold in [0, 1].
        min_peak_contrast (float, optional):
            Minimum center-minus-ring contrast in uint8 units.
        anisotropy_min (float, optional):
            Minimum gradient anisotropy ratio; lower values are more edge-like.
        mask_bottom_frac (float, optional):
            Fraction of the image height at the bottom to ignore (to avoid
            horizon glow).

    Returns:
        list[tuple[float, float]]:
            List of detected star coordinates in ORIGINAL image pixels.
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
    if patch % 2 == 0:
        patch += 1
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
        yA = max(cy_ds - 1, 0)
        yB = min(cy_ds + 2, g_ds.shape[0])
        xA = max(cx_ds - 1, 0)
        xB = min(cx_ds + 2, g_ds.shape[1])
        center = flat[yA:yB, xA:xB].max()

        yA2 = max(cy_ds - 4, 0)
        yB2 = min(cy_ds + 5, g_ds.shape[0])
        xA2 = max(cx_ds - 4, 0)
        xB2 = min(cx_ds + 5, g_ds.shape[1])
        ring = flat[yA2:yB2, xA2:xB2].copy()
        ring[yA:yB, xA:xB] = center  # exclude center region approx
        local_bg = np.median(ring)

        if (center - local_bg) < min_peak_contrast:
            continue

        # Anisotropy (structure tensor proxy): stars ~ isotropic gradients
        sx_win = np.abs(sx[yA2:yB2, xA2:xB2])
        sy_win = np.abs(sy[yA2:yB2, xA2:xB2])
        gx = sx_win.mean()
        gy = sy_win.mean()
        ratio = (min(gx, gy) + 1e-6) / (max(gx, gy) + 1e-6)  # 0..1
        if ratio < anisotropy_min:
            continue

        # Accept; rescale to original coordinates
        coords.append((float(cx_ds / scale), float(cy_ds / scale)))

    return coords


#
# Meteor detection
#
def detect_meteors(img: np.ndarray,
                   mask: Optional[np.ndarray] = None,
                   *,
                   blur_ksize: builtins.int = 3,
                   bg_kernel: builtins.int = 31,
                   k_sigma: float = 3.0,
                   min_len_px: builtins.int = 20,
                   min_aspect: float = 5.0,
                   min_area_px: builtins.int = 15,
                   hough_check: bool = True) -> List[dict]:
    import cv2
    """
    Detect meteors in a single all-sky frame.

    The algorithm performs background removal, thresholding, and morphological
    cleanup, then identifies elongated bright regions and optionally checks
    them with a Hough transform-like line detection to reduce false positives.

    Args:
        img (numpy.ndarray):
            Input image (grayscale or BGR).
        mask (numpy.ndarray | None, optional):
            Optional mask specifying the region of interest (255=keep, 0=ignore).
        blur_ksize (int, optional):
            Gaussian blur kernel size for pre-smoothing.
        bg_kernel (int, optional):
            Median filter kernel size used to estimate background.
        k_sigma (float, optional):
            Number of standard deviations above the mean for thresholding.
        min_len_px (int, optional):
            Minimum detected streak length in pixels.
        min_aspect (float, optional):
            Minimum aspect ratio (major/minor) for candidate streaks.
        min_area_px (int, optional):
            Minimum contour area in pixels.
        hough_check (bool, optional):
            If True, perform an additional Hough line check inside each
            candidate bounding box.

    Returns:
        list[dict]:
            List of detections, each a dictionary containing:
                * ``bbox``: (x, y, w, h)
                * ``center``: (cx, cy)
                * ``angle_deg``
                * ``length_px``
                * ``aspect``
                * ``score`` (brightness score)
    """
    # --- convert to gray ---
    g = img if img.ndim == 2 else cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    if blur_ksize > 1:
        g = cv2.GaussianBlur(g, (blur_ksize, blur_ksize), 0)

    # --- background removal (median filter high-pass) ---
    bg_kernel = bg_kernel if bg_kernel % 2 else bg_kernel + 1
    bg = cv2.medianBlur(g, bg_kernel)
    highpass = cv2.subtract(g, bg)

    # --- remove point-like stars ---
    open_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    highpass = cv2.morphologyEx(highpass, cv2.MORPH_OPEN, open_kernel, iterations=1)

    # --- mask setup ---
    if mask is None:
        mask = np.ones_like(highpass, np.uint8) * 255

    # --- adaptive threshold ---
    mean, std = cv2.meanStdDev(highpass, mask=mask)
    tval = float(mean + k_sigma * std)
    tval = max(tval, 10.0)
    _, bin_img = cv2.threshold(highpass, tval, 255, cv2.THRESH_BINARY)

    # --- morphology cleanup ---
    kern = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    bin_img = cv2.morphologyEx(bin_img, cv2.MORPH_CLOSE, kern, iterations=1)
    bin_img = cv2.morphologyEx(bin_img, cv2.MORPH_OPEN, kern, iterations=1)

    # Apply mask
    bin_img = cv2.bitwise_and(bin_img, mask)

    # --- find elongated bright regions ---
    contours, _ = cv2.findContours(bin_img, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    detections = []

    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < min_area_px:
            continue

        if len(cnt) < 5:
            rect = cv2.minAreaRect(cnt)
            (cx, cy), (w, h), angle = rect
            if w < 1 or h < 1:
                continue
            major, minor = (w, h) if w >= h else (h, w)
            aspect = (major + 1e-6) / (minor + 1e-6)
            length_px = major
        else:
            ellipse = cv2.fitEllipse(cnt)
            (cx, cy), (w, h), angle = ellipse
            major, minor = (w, h) if w >= h else (h, w)
            aspect = (major + 1e-6) / (minor + 1e-6)
            length_px = major

        if length_px < min_len_px or aspect < min_aspect:
            continue

        # --- optional Hough line check ---
        if hough_check:
            x, y, w, h = cv2.boundingRect(cnt)
            pad = 3
            roi = bin_img[max(0, y - pad):y + h + pad, max(0, x - pad):x + w + pad]
            lines = cv2.HoughLinesP(roi, 1, np.pi / 180, threshold=12,
                                    minLineLength=max(10, builtins.int(0.4 * length_px)), maxLineGap=4)
            if lines is None or len(lines) == 0:
                continue

        # --- score brightness ---
        c_mask = np.zeros_like(bin_img)
        cv2.drawContours(c_mask, [cnt], -1, 255, -1)
        score = builtins.int(cv2.sumElems(cv2.bitwise_and(highpass, c_mask))[0])

        detections.append({
            "bbox": cv2.boundingRect(cnt),
            "center": (float(cx), float(cy)),
            "angle_deg": float(angle),
            "length_px": float(length_px),
            "aspect": float(aspect),
            "score": score
        })

    detections.sort(key=lambda d: (d["score"], d["length_px"], d["aspect"]), reverse=True)
    return detections


def draw_detections(image: np.ndarray,
                    detections: List[dict],
                    mask: Optional[np.ndarray] = None) -> np.ndarray:
    import cv2
    """
    Draw meteor detections on an image for visualisation.

    Rectangles are drawn around each detected streak. If a mask is supplied,
    the non-masked parts of the image can be dimmed to emphasise detections.

    Args:
        image (numpy.ndarray):
            Input image (grayscale or colour).
        detections (list[dict]):
            List of detection dicts as returned by :func:`detect_meteors`.
        mask (numpy.ndarray | None, optional):
            Optional mask used to dim non-interest regions.

    Returns:
        numpy.ndarray:
            A colour image with rectangles drawn around detections.
    """
    out = image.copy()
    if out.ndim == 2:
        out = cv2.cvtColor(out, cv2.COLOR_GRAY2BGR)
    for d in detections:
        x, y, w, h = d["bbox"]
        cv2.rectangle(out, (x, y), (x + w, y + h), (0, 255, 0), 1)
        cx, cy = map(builtins.int, d["center"])
        # cv2.circle(out, (cx, cy), 2, (0, 255, 255), -1)
    if mask is not None:
        dim = out.copy()
        dim[:] = (0, 0, 0)
        inv = cv2.bitwise_not(mask)
        out = cv2.addWeighted(out, 1.0, cv2.bitwise_and(dim, dim, mask=inv), 0.6, 0)
    return out
#
# End Meteor detection
#