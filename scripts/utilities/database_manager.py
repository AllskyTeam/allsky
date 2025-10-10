#!/usr/bin/python3
"""
Allsky Database Manager

This script configures and manages Allsky's local data storage. It supports
SQLite (recommended for low-resource Pis) and MySQL/MariaDB (recommended for
more capable Pis), and provides a TUI (via `whiptail`) to:

- Run a setup wizard to choose and configure the database engine.
- Show database information (engine, size, table breakdown).
- Create a remote MySQL user (and open bind-address if requested).
- Reset ALL data (drops DB or deletes SQLite database file).
- Purge old rows across all Allsky tables by age threshold.

It must be run as root, because certain MySQL/MariaDB administrative tasks
(e.g., socket auth to root) require it. It also ensures it runs inside the
Allsky virtualenv.

Environment variables:
- ALLSKY_HOME (resolved automatically if missing)
- ALLSKY_MYFILES_DIR
- ALLSKY_MODULE_LOCATION
- ALLSKY_SCRIPTS
- ALLSKY_DATABASES (path to SQLite DB)
- ALLSKY_SETTINGS_FILE (JSON)
- ALLSKY_ENV (JSON holding env-style configuration for Allsky)

Notes:
- Uses `gpiozero.Device` to detect Pi model and guide recommendations.
- Uses `mysql-connector-python` when talking to MySQL/MariaDB.
"""

import os
import sys
import re
import argparse
import subprocess
import shutil
import time

from functools import wraps
from typing import Tuple, Literal, Optional

# We must run as root since we are potentially going to need to access MySQL via the root
# user and this is ONLY possible when runas root.
if os.geteuid() != 0:
    sys.exit("This script must be run as root!")

# Ensure the script is running in the correct Python environment
if "ALLSKY_HOME" in os.environ:
    allsky_home = os.environ['ALLSKY_HOME']
else:
    # Allow script to run, determine ALLSKY_HOME
    script_path = os.path.abspath(__file__)
    allsky_home = script_path.split("allsky", 1)[0] + "allsky"
    os.environ['ALLSKY_HOME'] = allsky_home

here = os.path.dirname(os.path.abspath(__file__))
venv_dir = os.path.join(allsky_home, 'venv')
venv_python = os.path.join(venv_dir, 'bin', 'python3')
if sys.executable != venv_python:
    os.execv(venv_python, [venv_python] + sys.argv)

import json
import sqlite3
from pathlib import Path
from whiptail import Whiptail

modules_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(modules_dir)

try:
    allsky_path = os.environ["ALLSKY_HOME"]
except KeyError:
    print("ERROR: ALLSKY_HOME environment variable is not set. Please set it to the AllSky installation directory.")
    sys.exit(1)
            
allsky_variables_path = Path(f"{allsky_path}/variables.json")
if not allsky_variables_path.is_file():
    print("ERROR: You must upgrade to the latest version of Allsky to install modules.")
    sys.exit(1)
            
with open(allsky_variables_path, "r") as file:
    json_data = json.load(file)

for key, value in json_data.items():
    os.environ[str(key)] = str(value)

try:
    allsky_my_files_folder = os.environ["ALLSKY_MYFILES_DIR"]
except KeyError:
    print("ERROR: $ALLSKY_MYFILES_DIR not found - Aborting.")
    sys.exit(1)
                
try:
    allsky_modules = os.environ['ALLSKY_MODULE_LOCATION']
except KeyError:
    print('ERROR: $ALLSKY_MODULE_LOCATION not found - Aborting.')
    sys.exit(1)
allsky_modules_location = os.path.join(allsky_modules, "modules")

try:
    allsky_scripts = os.environ["ALLSKY_SCRIPTS"]
except KeyError:
    print('ERROR: $ALLSKY_SCRIPTS not found - Aborting')
    sys.exit(1)
allsky_modules_path = os.path.join(allsky_scripts, 'modules')

valid_module_paths = [allsky_my_files_folder, allsky_modules_location, allsky_modules_path]
        
for valid_module_path in valid_module_paths:
    sys.path.append(os.path.abspath(valid_module_path))

from gpiozero import Device            
import allsky_shared as shared

shared.setup_for_command_line()

        
class ALLSKYDATABASEMANAGER:
    """
    Interactive manager for Allsky database configuration and maintenance.

    This class wraps all user interaction and DB operations, including engine
    detection, setup wizard, status display, purging, data reset, and remote
    MySQL user creation.

    Parameters
    ----------
    args : argparse.Namespace
        Parsed command-line arguments (e.g., --debug, --auto).

    Attributes
    ----------
    _debug_mode : bool
        If True, logs are printed to stdout instead of `shared.log`.
    _mysql_installed : bool
        True if a MySQL/MariaDB service or server binary is detected.
    _mysql_type : Optional[str]
        Service name guessed/detected (e.g., 'mariadb' or 'mysql').
    _database_config : dict
        The current Allsky database config (from shared.get_database_config()).
    _pi_version : int
        Detected Raspberry Pi version number (e.g., 3, 4, 5).
    """

    _welcome = "Allsky utilises a database to store information about images, settings, and other data.\n\n Would you like to use the recommended configuration. (If you are unsure then please select 'Yes').\n\nSelecting 'No' will allow you to manually configure the database"
    _low_performance = "\nSince you are running on a PI with reduced CPU and RAM it is recommended that you use sqlite"
    _high_performance = "\nSince you are running a PI with sufficient CPU and RAM it is recommended that you use MySQL (MariaDB) although you may select sqlite if you wish"
    _enable_database = "\n\nWould you like to enable this feature? If you select No then you can rerun this script at any time and enable the database"
    _mysql_warning = "This script can only configure MySQL on the local Pi. If you wish to use MySQL on a remote server then please consult the Allsky documentation\
        \n\nDo you wish to configure MySQL on this Pi?"
    _show_mysql_warning = True
    
    _reset_database_message = "This will remove ALL data from the database. This CANNOT be undone.\n\nAre you sure you wish to proceed?"
    _reset_complete = "All data has been removed from the database"
    _purge_database_time = "Enter a number of hours to keep, or a number followed by 'd' for days to keep:"
    _whiptail_database_disabled = "No database is configured or enabled. Please check the database configuration"
    _whiptail_add_remote_user = "Creating a user for remote access will require changing the MySQL server to be accessible outside of this pi. This may pose a security risk if the pi is exposed to the internet.\n\nAre you sure you wish to proceed?"    
    
    _back_title= "Allsky Database Manager"
    _whiptail_title_select_database = "Select Database"
    _whiptail_title_main_menu = "Main Menu"    
    _whiptail_message = "Message"
    _whiptail_error = "Error"
    _whiptail_warning = "Warning"    
    _whiptail_confirm = "Please Confirm"
    _whiptail_database_info = "Database Information"
    _whiptail_remote_user = "Create Remote MySQL User"
        
    def __init__(self, args):
        """
        Initialize the manager and detect environment.

        Detects MySQL/MariaDB availability, validates SQLite availability,
        reads Allsky DB config, and detects Pi model.

        Parameters
        ----------
        args : argparse.Namespace
            Namespace with `debug` and other flags.
        """
        self._debug_mode = args.debug
        
        self._mysql_installed, self._mysql_type = self._mysql_service_installed()
        self._is_sqlite3_installed()
        self._database_config = self._get_allsky_database_config()
        self._pi_version = self._get_pi_version()
        
        self._database_config = shared.get_database_config()

    @property
    def all_databases_installed(self) -> bool:
        """
        Whether both SQLite and MySQL/MariaDB are available.

        Returns
        -------
        bool
        """
        result = False
        if self._sqlite_installed and self._mysql_installed:
            result = True
            
        return result

    @property
    def is_database_configured(self) -> bool:
        """
        Whether a database is configured/enabled in Allsky.

        Returns
        -------
        bool
            Currently returns False (placeholder). Implementation may be
            provided in future to check config content.
        """
        return False

    @property
    def is_fast_pi(self) -> bool:
        """
        Heuristic indicating if the Pi is sufficiently powerful.

        Returns
        -------
        bool
            True if Pi version > 3.
        """
        result = False
        if self._pi_version > 3:
            result = True
            
        return result

    @staticmethod
    def warn_no_database(method):
        """
        Decorator to guard actions that require a configured database.

        If no database is enabled in the Allsky config, show an info prompt
        and do not call the wrapped method.

        Parameters
        ----------
        method : Callable
            Method that requires a configured database.

        Returns
        -------
        Callable
        """
        @wraps(method)
        def wrapper(self, *args, **kwargs): 
            if "databaseenabled" in self._database_config and self._database_config["databaseenabled"]:
                return method(self, *args, **kwargs)
            else:
                self._info_prompt(self._whiptail_error, self._back_title, self._whiptail_database_disabled, 11, 50)
        return wrapper
                                            
    def _log(self, log_level, message) -> None:
        """
        Log a message via Allsky or stdout (debug).

        Parameters
        ----------
        log_level : int
            Allsky log level.
        message : str
            Message to log.
        """
        if self._debug_mode:
            print(message)
        else:
            shared.log(log_level, message)

    def _get_pi_version(self) -> int:
        """
        Detect Raspberry Pi version using gpiozero Device info.

        Returns
        -------
        int
            Major version number parsed from model string; 0 if unknown.
        """
        Device.ensure_pin_factory()
        pi_full_version = Device.pin_factory.board_info.model

        match = re.match(r"(\d+)", pi_full_version)
        pi_version = int(match.group(1)) if match else 0

        return pi_version
    
    def _is_sqlite3_installed(self) -> bool:
        """
        Ensure sqlite3 module is available.

        Returns
        -------
        bool

        Exits
        -----
        SystemExit
            If sqlite3 cannot be imported.
        """
        result = False
        try:
            import sqlite3  # noqa: F401
            result = True
            self._sqlite_installed = True
        except ImportError:
            self._log(1,"ERROR: Unable to use SQLite on this pi. Please contact the Allsky support team via GitHub")
            sys.exit(1)
            
        return result
    
    def _mysql_service_installed(self) -> Tuple[bool, Optional[str]]:
        """
        Check whether MySQL/MariaDB is installed, and determine service name.

        Returns
        -------
        (bool, Optional[str])
            Tuple of (installed, service_name), where service_name is
            'mariadb' or 'mysql' if detectable, else None.
        """
        # Check explicit unit names
        for unit in ("mariadb.service", "mysql.service"):
            try:
                res = subprocess.run(
                    ["systemctl", "show", "-p", "LoadState", unit],
                    capture_output=True, text=True, check=False
                )
                # Loaded => unit file exists (installed), regardless of active state
                if res.returncode == 0 and "LoadState=loaded" in res.stdout:
                    return True, unit.removesuffix(".service")
            except FileNotFoundError:
                # systemctl not available (very rare on Pi OS)
                break

        # Fallback: if the server binary exists, consider it "installed" even if the unit isn't
        for bin_name in ("mariadbd", "mysqld"):
            if shutil.which(bin_name):
                # Guess a likely service name
                return True, "mariadb" if bin_name == "mariadbd" else "mysql"

        return False, None

    def _display_welcome(self) -> bool:
        """
        Show initial explanation and ask whether to enable database support.

        Returns
        -------
        bool
            True if user selected "Yes".
        """
        _message = self._welcome
        
        w = Whiptail(title="Welcome", backtitle="Allsky Database Manager", height=20, width=60)
        result = w.yesno(_message)
        return result
        
    def _get_allsky_database_config(self):
        """
        Placeholder for fetching Allsky DB configuration.

        Returns
        -------
        Any
            Currently unused (config is loaded from `shared.get_database_config()`).
        """
        pass
    
    def _install_database_server(self, database_to_use: str) -> bool:
        """
        Install the chosen database server on this Pi (if needed).

        Parameters
        ----------
        database_to_use : str
            'mysql' or 'sqlite' (only 'mysql' leads to package install).

        Returns
        -------
        bool
            True if installation (or no-op) succeeded.

        Raises
        ------
        subprocess.CalledProcessError
            If apt install/ update fails.
        """
        if database_to_use == "mysql":
            subprocess.run(["sudo", "apt-get", "update"], check=True)
            subprocess.run(["sudo", "apt-get", "install", "-y", "mariadb-server"], check=True)
            subprocess.check_call([sys.executable, "-m", "pip", "install", "mysql-connector-python"])

        return True
    
    def _select_database_server(self) -> (bool | str):
        """
        Prompt user to choose database engine (MySQL or SQLite).

        Preference toggles based on device capability.

        Returns
        -------
        str | None
            'mysql' or 'sqlite' if selected; None if cancelled.
        """
        options = []
        if self._mysql_installed:
            options.append(("MySQL", "Installed ",  "ON" if self.is_fast_pi else ""))
        else:
            options.append(("MySQL", "Not Installed",  "ON" if self.is_fast_pi else ""))

        options.append(("SQLite", "Installed ",  "ON" if not self.is_fast_pi else ""))
            
        w = Whiptail(title=self._whiptail_title_select_database, backtitle=self._back_title, height=15, width=40)
        database_to_use = w.radiolist('Select the database to use', options)[0]
        
        result = None
        if len(database_to_use) > 0:
            result = database_to_use[0].lower()
        return result

    def _get_mysql_users(self):
        """
        Retrieve non-system MySQL users.

        Returns
        -------
        list[dict]
            List of dicts: {'user': str, 'host': str, 'display': 'user@host'}
        """
        from mysql.connector import Error  

        ignore = {"mariadb.sys", "mysql", "root"}
                
        try:
            command = "SELECT user, host FROM mysql.user WHERE user != '' ORDER BY user, host;"
            user_list = self._run_mysql_command(root_user=True, command=command, command_type="fetchall")
            users = []
            for u, h in user_list:                
                if u not in ignore:
                    users.append({"user": u, "host": h, "display": f"{u}@{h}"})
            return users
        except Error as e:
            print("Error fetching users:", e)
            return []
    
    def _test_mysql_login(self, user_name: str, password: str, host: str = "localhost") -> tuple[bool, str]:
        """
        Attempt to log into MySQL with provided credentials.

        Parameters
        ----------
        user_name : str
        password : str
        host : str, optional

        Returns
        -------
        tuple[bool, str]
            (success, message)
        """
        from mysql.connector import Error        
        
        try:
            if self._run_mysql_command(host=host, user_name=user_name, password=password, command_type="login"):
                return True, "Login successful."
            return False, "Unable to establish connection."
        except Error as e:
            return False, str(e)

    def _create_mysql_user(self, new_user: str, new_pw: str, root_user="root", port=3306):
        """
        Create a new MySQL user with full privileges (for local server).

        Parameters
        ----------
        new_user : str
        new_pw : str
        root_user : str, optional
        port : int, optional

        Returns
        -------
        tuple[bool, str]
            (success, message)
        """
        from mysql.connector import Error  
                
        try:
            commands = []
            commands.append(f"CREATE USER IF NOT EXISTS '{new_user}'@'%' IDENTIFIED BY '{new_pw}';")
            commands.append(f"GRANT ALL PRIVILEGES ON *.* TO '{new_user}'@'%' WITH GRANT OPTION;")
            commands.append("FLUSH PRIVILEGES;")
            self._run_mysql_command(command=commands, root_user=True)
            return True, f"MySQL user '{new_user}' created with full access."
        except Error as e:
            return False, str(e)
            
    def _select_mysql_database_user(self) -> str:
        """
        Choose an existing MySQL user or create a new one (interactive).

        Returns
        -------
        tuple[str, Optional[str], Optional[str]]
            ("create"|"select"|"cancel", username or None, password or None)
        """
        w = Whiptail(title="MySQL User Setup", backtitle="Allsky Database Manager", height=25, width=50)
        w_prompt = Whiptail(title="MySQL User Setup", backtitle="Allsky Database Manager", height=9, width=50)

        existing_users = self._get_mysql_users()

        items = [("NEW", "Create a new user", "ON")]
        for entry in existing_users:
            items.append(
                (entry["user"], f"Use user '{entry['user']}'@'{entry['host']}'", "OFF")
            )

        selected, code = w.radiolist("Select ONE user (or create a new user):", items)
        if code != 0:
            return ("cancel", None, None)

        if selected[0] == "NEW":
            while True:
                username, code = w_prompt.inputbox("Enter a new username:")
                if code != 0:
                    return ("cancel", None, None)
                username = (username or "").strip()
                if not username:
                    w_prompt.msgbox("Username cannot be empty.")
                    continue
                if " " in username:
                    w_prompt.msgbox("Username cannot contain spaces.")
                    continue
                if username in existing_users:
                    w_prompt.msgbox(f"User '{username}' already exists. Pick another name.")
                    continue
                break

            while True:
                try:
                    pwd1, code = w_prompt.passwordbox(f"Set password for '{username}':")
                except AttributeError:
                    pwd1, code = w_prompt.inputbox(f"Set password for '{username}':")
                if code != 0:
                    return ("cancel", None, None)

                try:
                    pwd2, code = w_prompt.passwordbox("Confirm password:")
                except AttributeError:
                    pwd2, code = w_prompt.inputbox("Confirm password:")
                if code != 0:
                    return ("cancel", None, None)

                if not pwd1:
                    w_prompt.msgbox("Password cannot be empty.")
                    continue
                if pwd1 != pwd2:
                    w_prompt.msgbox("Passwords do not match. Try again.")
                    continue
                break

            ok, msg = self._create_mysql_user(username, pwd1)
            if ok:
                w_prompt.msgbox(msg)
                return ("create", username, pwd1)
            else:
                w_prompt.msgbox(f"Failed to create user: {msg}")
                return ("cancel", None, None)

        user = selected[0]
        while True:
            try:
                pw, code = w_prompt.passwordbox(f"Enter password for MySQL user '{user}':")
            except AttributeError:
                pw, code = w_prompt.inputbox(f"Enter password for MySQL user '{user}':")
            if code != 0:
                return ("cancel", None, None)

            ok, msg = self._test_mysql_login(user, pw, host="localhost")
            if ok:
                w_prompt.msgbox(f"Login OK for '{user}'.")
                return ("select", user, pw)
            else:
                choice = w_prompt.menu(
                    f"Login failed: {msg}\n\nTry again?",
                    [("retry", "Enter password again"), ("cancel", "Cancel selection")]
                )[0]
                if choice != "retry":
                    return ("cancel", None, None)

    def _run_mysql_command(
        self,
        host:str="",
        user_name:str="",
        password:str="",
        command:str|list="",
        database:str="",
        command_type: Literal["none", "fetchone", "fetchall", "login"]="",
        root_user:bool=False
    ) -> str:
        """
        Execute a MySQL command using mysql-connector.

        Parameters
        ----------
        host : str
        user_name : str
        password : str
        command : str | list
            SQL string or list of SQL strings to execute.
        database : str
            Database name to `USE` before running commands (optional).
        command_type : {'none','fetchone','fetchall','login'}
            Controls whether to fetch results or check login status.
        root_user : bool
            If True, connect as root via local UNIX socket.

        Returns
        -------
        Any
            Depends on `command_type`:
              - 'fetchone' -> tuple | None
              - 'fetchall' -> list[tuple] | None
              - 'login' -> bool
              - default -> None

        Raises
        ------
        TypeError
            If command is not str or list/tuple.
        """
        import mysql.connector
        from mysql.connector import Error  

        def is_update(command):
            update_command = False
            if command.strip().split()[0].upper() in (
                "INSERT", "UPDATE", "DELETE",
                "CREATE", "DROP", "ALTER", "REPLACE", "GRANT", "REVOKE"
            ):
                update_command = True
            return update_command
           
        def safe_close(cur):
            """Consume pending result sets to avoid 'Unread result' errors, then close."""
            try:
                if getattr(cur, "with_rows", False):
                    cur.fetchall()
                nxt = getattr(cur, "nextset", None)
                while callable(nxt) and cur.nextset():
                    if getattr(cur, "with_rows", False):
                        cur.fetchall()
            finally:
                cur.close()
                   
        result = None
        
        if root_user:
            conn = mysql.connector.connect(user="root", unix_socket="/run/mysqld/mysqld.sock")
        else:
            if database:
                conn = mysql.connector.connect(host=host, port=3306, user=user_name, password=password, database=database)
            else:
                conn = mysql.connector.connect(host=host, port=3306, user=user_name, password=password)
        
        cur = conn.cursor()
        
        if database:
            cur.execute(f"USE {database}")
            
        if command:
            do_commit = False
            if isinstance(command, str):
                cur.execute(command)
                do_commit = is_update(command)
            elif isinstance(command, (list, tuple)):
                for cmd in command:
                    cur.execute(cmd)
                    if not do_commit:
                        do_commit = is_update(cmd)
            else:
                raise TypeError(f"Unsupported command type: {type(command)}")
            
            if do_commit:
                conn.commit()
            
            if command_type == "fetchone":
                result = cur.fetchone()

            if command_type == "fetchall":
                result = cur.fetchall()
                                
        if command_type == "login":
            result = conn.is_connected()              
                                
        safe_close(cur)
        conn.close()
        
        return result

    def _run_sqlite_command(self, command: str, command_type: Literal["none", "fetchone", "fetchall", "login"]="")-> str:
        """
        Execute a SQLite command against the Allsky database.

        Parameters
        ----------
        command : str
            SQL command (single statement).
        command_type : {'none','fetchone','fetchall','login'}

        Returns
        -------
        Any
            Result depends on `command_type` (see `_run_mysql_command`).
        """
        def is_update(command):
            update_command = False
            if command.strip().split()[0].upper() in (
                "INSERT", "UPDATE", "DELETE",
                "CREATE", "DROP", "ALTER", "REPLACE", "GRANT", "REVOKE"
            ):
                update_command = True
            return update_command
                
        result = None
        db_path = os.environ['ALLSKY_DATABASES']
        with sqlite3.connect(db_path, timeout=10) as conn:
            cursor = conn.cursor()
            cursor.execute(command)
            
            if command_type == "fetchall":
                result = cursor.fetchall()

            if command_type == "fetchone":
                result = cursor.fetchone()[0]
            
            if is_update(command):
                conn.commit()
        return result
    
    def _show_mysql_warning_message(self)-> None:
        """
        Optionally warn user that remote MySQL config exposes the service.

        Returns
        -------
        bool
            True if user acknowledges and wishes to proceed.
        """
        result = False
        
        if self._show_mysql_warning:
            w_prompt = Whiptail(title=self._whiptail_message, backtitle=self._back_title, height=12, width=60)
            result = w_prompt.yesno(self._mysql_warning)
        else:
            result = True
        return result
                                
    def _sanitise_dbname(self, name: str) -> bool:
        """
        Validate MySQL database name for basic safety.

        Parameters
        ----------
        name : str

        Returns
        -------
        bool
            True if name matches [A-Za-z0-9_]+
        """
        return bool(re.fullmatch(r"[A-Za-z0-9_]+", name))

    def _select_mysql_database(self, host:str="localhost", user_name:str="", password:str="", database_name: str | None = None) -> tuple[bool, str | None]:
        """
        Create/Select a MySQL database, verifying access.

        If `database_name` is provided, attempts to use it; otherwise prompts.

        Parameters
        ----------
        host : str
        user_name : str
        password : str
        database_name : str | None

        Returns
        -------
        tuple[bool, str | None]
            (True, name) on success; (False, None) on cancel/failure.
        """
        from mysql.connector import Error  

        def can_access(database: str) -> tuple[bool, str | None]:
            try:
                command="SELECT 1"
                self._run_mysql_command(host=host, user_name=user_name, password=password, database=database, command_type="selectone", command=command)
                return True, None
            except Error as e:
                return False, str(e)

        def create_db(database: str) -> tuple[bool, str | None]:
            try:
                command = f"CREATE DATABASE IF NOT EXISTS `{database}`"
                self._run_mysql_command(host=host, user_name=user_name, password=password, command_type="selectone", command=command)
                return True, None
            except Error as e:
                return False, str(e)

        if database_name:
            ok, err = can_access(database_name)
            if ok:
                self._database = database_name
                return True, database_name

        w = Whiptail(title=self._whiptail_title_select_database, backtitle=self._back_title, height=12, width=70)

        while True:
            default = "allsky"
            db_name, code = w.inputbox("Enter the MySQL database name:", default=default)
            if code != 0:  # Cancel
                return False, None

            db_name = (db_name or "").strip()
            if not db_name:
                w.msgbox("Database name cannot be empty.")
                continue
            if not self._sanitise_dbname(db_name):
                w.msgbox("Invalid name. Use letters, numbers, and underscore only.")
                continue

            ok, err = create_db(db_name)
            if not ok:
                choice = w.menu(
                    f"Failed to create database '{db_name}':\n{err}\n\nTry another name?",
                    [("retry", "Enter a different name"), ("cancel", "Cancel")]
                )[0]
                if choice != "retry":
                    return False, None
                continue

            ok, err = can_access(db_name)
            if ok:
                w.msgbox(f"Database '{db_name}' is ready and accessible.")
                self._database = db_name
                return True, db_name

            choice = w.menu(
                f"Cannot access database '{db_name}':\n{err}\n\nTry a different name?",
                [("retry", "Enter a different name"), ("cancel", "Cancel")]
            )[0]
            if choice != "retry":
                return False, None

    def _set_allsky_options(self, database_type:str="mysq;", host: str="localhost", user_name: str="", password: str="", database: str="", enabled: bool=True) -> bool:
        """
        Persist selected DB options to Allsky settings and env JSONs.

        Parameters
        ----------
        database_type : str
            'mysql' or 'sqlite'
        host : str
        user_name : str
        password : str
        database : str
        enabled : bool

        Returns
        -------
        bool
            True on success; False on failure.
        """
        try:
            settings_file = os.environ["ALLSKY_SETTINGS_FILE"]
            if os.path.exists(settings_file):
                with open(settings_file, "r") as f:
                    settings = json.load(f)
            else:
                settings = {}

            settings["enabledatabase"] = enabled
            settings["databasetype"] = database_type.lower()

            with open(settings_file, "w") as f:
                json.dump(settings, f, indent=4)

            env_file = os.environ["ALLSKY_ENV"]
            if os.path.exists(env_file):
                with open(env_file, "r") as f:
                    env = json.load(f)
            else:
                env = {}

            env.update({
                "databasehost": host,
                "databaseuser": user_name,
                "databasedatabase": database,
                "databasepassword": password,
            })

            with open(env_file, "w") as f:
                json.dump(env, f, indent=4)

            return True

        except Exception as e:
            self._log(4, f"ERROR: _set_allsky_options failed -> {e}")
            return False

    def _info_prompt(self, title:str, back_title:str, message:str, height:int=12, width:int=60):
        """
        Show an informational dialog box.

        Parameters
        ----------
        title : str
        back_title : str
        message : str
        height : int
        width : int
        """
        w = Whiptail(title=title, backtitle=back_title, height=height, width=width)
        w.msgbox(message)
        
    def _confirm_prompt(self, title:str, back_title:str, message:str, height:int=12, width:int=60) -> bool:
        """
        Show a Yes/No confirmation dialog.

        Returns
        -------
        bool
            True if user selects Yes.
        """
        w = Whiptail(title=title, backtitle=back_title, height=height, width=width)
        result = w.yesno(message)
        return result
    
    def _restart_mysql_service(self):
        """
        Restart the detected MySQL/MariaDB service.

        Returns
        -------
        bool
            True if restart command succeeded.
        """
        try:
            subprocess.run(
                ["sudo", "systemctl", "restart", "mysql"],
                check=True
            )
            return True
        except subprocess.CalledProcessError:
            pass
        return False
    
    def _set_mysql_bind_all(self, config_file:str="/etc/mysql/mariadb.conf.d/50-server.cnf") -> bool:
        """
        Ensure MySQL binds to all interfaces (0.0.0.0) for remote access.

        Backs up the original config to `*.bak` and edits/creates a
        'bind-address = 0.0.0.0' under [mysqld].

        Parameters
        ----------
        config_file : str

        Returns
        -------
        bool
            False if config file doesn't exist; True after writing changes.
        """
        if not os.path.exists(config_file):
            return False

        backup_file = config_file + ".bak"
        shared.copy_file(config_file, backup_file)

        new_lines = []
        changed = False

        with open(config_file, "r") as f:
            for line in f:
                if line.strip().startswith("bind-address"):
                    new_lines.append("bind-address = 0.0.0.0\n")
                    changed = True
                else:
                    new_lines.append(line)

        if not changed:
            new_content = []
            inserted = False
            for line in new_lines:
                new_content.append(line)
                if not inserted and line.strip().lower().startswith("[mysqld]"):
                    new_content.append("bind-address = 0.0.0.0\n")
                    inserted = True
            new_lines = new_content

        with open(config_file, "w") as f:
            f.writelines(new_lines)

        return True
    
    @warn_no_database
    def _reset_database(self):
        """
        Drop and recreate the database (MySQL) or delete the SQLite file.

        Prompts user for confirmation. Irreversible.
        """
        if self._database_config["databasetype"] == "mysql" and not self._mysql_installed:
            self._info_prompt("Warning", self._back_title, "MySQL is enabled in the Allsky config but its not currently installed. Please install MySQL")
            return
                    
        ok_to_clear = self._confirm_prompt(self._whiptail_confirm, self._back_title, self._reset_database_message)
        if ok_to_clear:
            if self._database_config["databasetype"] == "mysql":
                try:
                    command = f"DROP DATABASE {self._database_config['databasedatabase']}"
                    self._run_mysql_command(
                        self._database_config["databasehost"],
                        self._database_config["databaseuser"],
                        self._database_config["databasepassword"],
                        command,
                    )
                except:
                    pass
                
                try:
                    command = f"CREATE DATABASE {self._database_config['databasedatabase']}"
                    self._run_mysql_command(
                        self._database_config["databasehost"],
                        self._database_config["databaseuser"],
                        self._database_config["databasepassword"],
                        command,
                    )
                except:
                    pass
                  
            if self._database_config["databasetype"] == "sqlite":
                try:
                    db_path = os.environ['ALLSKY_DATABASES']
                    shared.remove_path(db_path)
                except KeyError:
                    pass

            self._info_prompt(self._whiptail_message, self._back_title, self._reset_complete)

    @warn_no_database    
    def _show_mysql_status(self):
        """
        Display database engine details and table sizes.

        For MySQL/MariaDB: shows server version and each table's size (MB).
        For SQLite: estimates size per table relative to DB file size.
        """
        text = ""
        self._database_config = shared.get_database_config()

        if self._database_config["databasetype"] == "mysql":
            if self._mysql_installed:
                command = 'SELECT VERSION();'
                version = self._run_mysql_command(
                    self._database_config["databasehost"],
                    self._database_config["databaseuser"],
                    self._database_config["databasepassword"],
                    command,
                    command_type="fetchone"
                )
                                
                command = f"""
                    SELECT
                        table_name,
                        ROUND((data_length + index_length) / 1024 / 1024, 2) AS size_mb
                    FROM information_schema.tables
                        WHERE table_schema = '{self._database_config['databasedatabase']}'
                        ORDER BY size_mb DESC, table_name;
                    """
                table_sizes = self._run_mysql_command(
                    self._database_config["databasehost"],
                    self._database_config["databaseuser"],
                    self._database_config["databasepassword"],
                    command,
                    command_type="fetchall"
                )
                
                lines = []
                for table_name, size in table_sizes:
                    lines.append(f"{table_name.ljust(30)} {size:.2f} MB")
                
                table_info = "\n".join(lines)                
                    
                text =  f"Database   : MySQL {version[0]}\n"
                text += f'Server Host: {self._database_config["databasehost"]}\n'
                text += f'Username   : {self._database_config["databaseuser"]}\n'
                text += f'Password   : {shared.obfuscate_password(self._database_config["databaseuser"])}\n'
                text += f'Database   : {self._database_config["databasedatabase"]}\n\n'
                text += "TABLE INFORMATION\n"
                text += table_info
            else:
                self._info_prompt("Warning", self._back_title, "MySQL is enabled in the Allsky config but its not currently installed. Please install MySQL")
                return
                
        if self._database_config["databasetype"] == "sqlite":
            page_size = self._run_sqlite_command("PRAGMA page_size;", "fetchone")
            page_count = self._run_sqlite_command("PRAGMA page_count;", "fetchone")
            db_size = page_size * page_count

            tables = self._run_sqlite_command("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;", "fetchall")
            
            sizes = [(t[0], db_size / (1024 * 1024)) for t in tables]

            lines = [f"{name.ljust(40)} {size:.2f} MB" for name, size in sizes]
            table_info = "\n".join(lines)

            text = f"Database: SQlite\n"
            text += "TABLE INFORMATION\n"
            text += table_info
            
        self._info_prompt(
            self._whiptail_message,
            self._whiptail_database_info,
            text,
            height=30
        )

    @warn_no_database             
    def create_remote_mysql_user(self):
        """
        Create a remote MySQL user with full privileges and enable remote bind.

        Warns user about exposure risk, then:
        - Creates user 'username'@'%' with password.
        - Grants ALL PRIVILEGES.
        - Sets bind-address=0.0.0.0 and restarts mysqld.

        Returns
        -------
        bool
            True on success; False on failure or cancel.
        """
        import mysql.connector
        from mysql.connector import errorcode
        
        if self._mysql_installed:
            
            ok_to_proceed = self._confirm_prompt(self._whiptail_confirm, self._back_title, self._whiptail_add_remote_user)

            if ok_to_proceed:
                w = Whiptail(title=self._whiptail_remote_user, backtitle=self._back_title, height=15, width=60)

                username, code = w.inputbox("Enter a new MySQL username:")
                if code != 0 or not username.strip():
                    return False

                while True:
                    try:
                        pw1, code = w.passwordbox(f"Enter password for '{username}':")
                    except AttributeError:
                        pw1, code = w.inputbox(f"Enter password for '{username}':")
                    if code != 0:
                        w.msgbox("Cancelled.")
                        return False

                    try:
                        pw2, code = w.passwordbox("Confirm password:")
                    except AttributeError:
                        pw2, code = w.inputbox("Confirm password:")
                    if code != 0:
                        w.msgbox("Cancelled.")
                        return False

                    if pw1 != pw2:
                        w.msgbox("Passwords do not match. Please Try again.")
                        continue
                    if not pw1:
                        w.msgbox("Password cannot be empty.")
                        continue
                    break

                try:
                    commands = [
                        f'CREATE USER IF NOT EXISTS "{username}"@"%" IDENTIFIED BY "{pw1}"',
                        f'GRANT ALL PRIVILEGES ON *.* TO "{username}"@"%" WITH GRANT OPTION',
                        "FLUSH PRIVILEGES;"
                    ]
                    self._run_mysql_command(root_user=True, command=commands)

                    self._set_mysql_bind_all()
                    self._restart_mysql_service()
                    
                    w.msgbox(f"User '{username}'@'%' created with full remote access.")
                    return True

                except mysql.connector.Error as err:
                    if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
                        w.msgbox("Access denied: wrong root credentials?")
                    else:
                        w.msgbox(f"MySQL Error: {err}")
                    return False
        else:
            self._info_prompt("Warning", self._back_title, "MySQL is enabled in the Allsky config but its not currently installed. Please install MySQL")
            return
                                       
    def run_auto(self) -> None:
        """
        Guided setup flow:

        - Offer to enable DB
        - Select engine (MySQL vs SQLite), installing MySQL if chosen
        - For MySQL: pick or create user, then create/select database
        - Persist configuration to settings/env files
        """
        if not self.is_database_configured:
            if self._display_welcome():
                database_to_use = "sqlite"
            else:
                database_to_use = self._select_database_server()
                
            if database_to_use == "mysql" and not self._mysql_installed:
                if self._show_mysql_warning_message():
                    if not self._install_database_server(database_to_use):
                        # TODO: install failed handling
                        pass
                else:
                    sys.exit(1)
                
            if database_to_use == "mysql":
                action, user_name, password = self._select_mysql_database_user()
                if action == "create" or action == "select":
                    database_name = self._database_config["databasedatabase"] if "databasedatabase" in self._database_config else ""
                    result, db_name = self._select_mysql_database("localhost", user_name, password, database_name)
                    if result:
                        result = self._set_allsky_options("mysql", "localhost", user_name, password, db_name)
                        self._mysql_installed, self._mysql_type = self._mysql_service_installed()

            if database_to_use == "sqlite":
                result = self._set_allsky_options("sqlite", "", "", "", "allsky")
                    
    def run(self):
        """
        Main interactive menu loop.

        Options:
          1) Show Database Information
          2) Run Setup Wizard
          3) Create Remote MySQL User
          4) Reset ALL Data
          5) Exit
        """
        w = Whiptail(
            title=self._whiptail_title_main_menu,
            backtitle=self._back_title,
            height=18,
            width=50
        )

        while True:
            options = [
                ("1", "Show Database Information"),
                ("2", "Run Setup Wizard"),
                ("3", "Create Remote MySQL User"),
                ("4", "Reset ALL Data"),
                ("5", "Exit"),
            ]

            choice, code = w.menu("Select an option:", options)

            if code != 0 or choice == "5":
                break
            
            if choice == "1":
                self._show_mysql_status()

            if choice == "2":
                self.run_auto()

            if choice == "3":
                self.create_remote_mysql_user()
                          
            if choice == "4":
                self._reset_database()
                                                
    def remove_mysql(self, remove_data: bool = False):
        """
        Uninstall MariaDB packages and optionally remove data/config.

        Parameters
        ----------
        remove_data : bool
            If True, remove /var/lib/mysql and /etc/mysql.
        """
        def run(cmd):
            print(">>>", " ".join(cmd))
            subprocess.run(cmd, check=True)
            
        run(["sudo", "systemctl", "stop", "mariadb"])
        run(["sudo", "systemctl", "disable", "mariadb"])

        run(["sudo", "apt-get", "purge", "-y",
            "mariadb-server", "mariadb-client", "mariadb-common"])

        if remove_data:
            if os.path.exists("/var/lib/mysql"):
                print(">>> Removing /var/lib/mysql")
                shutil.rmtree("/var/lib/mysql", ignore_errors=True)
            if os.path.exists("/etc/mysql"):
                print(">>> Removing /etc/mysql")
                shutil.rmtree("/etc/mysql", ignore_errors=True)
    
if __name__ == "__main__":    
    parser = argparse.ArgumentParser(description="Allsky database manager")
    parser.add_argument("--debug", action="store_true", help="Enable debug mode, shows more detailed errors")  
    parser.add_argument("--auto", action="store_true", help="Step through installing / configuring the database")  
    parser.add_argument("--removemysql", action="store_true", help="For testign only remove mysql")  
    args = parser.parse_args()    
    
    database_manager = ALLSKYDATABASEMANAGER(args)

    if args.auto:
        database_manager.run_auto()
        sys.exit(1)
        
    if args.removemysql:
        database_manager.remove_mysql()
        sys.exit(0)
        
    database_manager.run()
