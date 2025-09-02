#!/usr/bin/python3

import os
import sys
import re
import argparse
import subprocess

from typing import Tuple

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
    
    _welcome = "Allsky allows data be stored in a local database for various functions, such as graphs and other analytics.\
        This feature is optional. Would you like to enable this feature?\
        "
    _low_performance = "\nSince you are running on a PI with reduced CPU and RAM it is recommended that you use sqlite"
    _high_performance = "\nSince you are running a PI with sufficient CPU and RAM it is recommended that you use MySQL (MariaDB) althoug you may select sqlite if you wish"
    _enable_database = "\n\nWould you like to enable this feature? If you select No then you can rerun this script at any time and enable the database"
    
    def __init__(self, args):
        self._debug_mode = args.debug
        
        self._mysql_installed, self._mysql_type = self._mysql_service_installed()
        self._is_sqlite3_installed()
        self._database_config = self._get_allsky_database_config()
        self._pi_version = self._get_pi_version()

    @property
    def all_databases_installed(self) -> bool:
        result = False
        if self._sqlite_installed and self._mysql_installed:
            result = True
            
        return result

    @property
    def is_database_configured(self) -> bool:        
        return False

    @property
    def is_fast_pi(self) -> bool:
        result = False
        if self._pi_version > 3:
            result = True
            
        return result
                
    def _log(self, log_level, message) -> None:
        if self._debug_mode:
            print(message)
        else:
            shared.log(log_level, message)

    def _get_pi_version(self) -> int:
        Device.ensure_pin_factory()
        pi_full_version = Device.pin_factory.board_info.model

        match = re.match(r"(\d+)", pi_full_version)
        pi_version = int(match.group(1)) if match else 0

        return pi_version
    
    def _is_sqlite3_installed(self) -> bool:
        result = False
        try:
            import sqlite3
            result = True
        except ImportError:
            self._log(1,"ERROR: Unable to use SQLite on this pi. Please contact the Allsky support team via GitHub")
            sys.exit(1)
            
        return result
    
    def _mysql_service_installed(self) -> Tuple[bool, str]:
        for service in ("mariadb", "mysql"):
            try:
                subprocess.run(
                    ["systemctl", "status", service],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    check=True
                )
                return True, service
            except subprocess.CalledProcessError:
                return True, service
            except FileNotFoundError:
                continue
        return False, None

    def _display_welcome(self) -> bool:

        _message = self._welcome
        
        if self.is_fast_pi:
            _message += self._low_performance
        else:
            _message += self._high_performance
        
        _message += self._enable_database
        
        w = Whiptail(title="Welcome", backtitle="Allsky Database Manager", height=20, width=60)

        result = w.yesno(_message)

        return result
        
    def _get_allsky_database_config(self):
        pass
    
    def _install_database_server(self, database_to_use: str) -> bool:
        if database_to_use == "mysql":
            subprocess.run(["sudo", "apt-get", "update"], check=True)
            subprocess.run(["sudo", "apt-get", "install", "-y", "mariadb-server"], check=True)
            subprocess.check_call([sys.executable, "-m", "pip", "install", "mysql-connector-python"])

        return True
    
    def _select_database_server(self) -> (bool | str):
        options = []
        if self._mysql_installed:
            options.append(("MySQL", "Installed ",  ""))
        else:
            options.append(("MySQL", "",  ""))

        options.append(("SQLite", "Installed ",  ""))
            
        w = Whiptail(title="Select Database", backtitle=f"Allsky Database Manager", height=15, width=30)
        database_to_use = w.radiolist('Select the database to use', options)[0]
        
        result = None
        if len(database_to_use) > 0:
            result = database_to_use[0].lower()
            
        return result

    def _get_mysql_users(self, host="localhost", user="root", password="", port=3306):
        import mysql.connector
        from mysql.connector import Error  

        ignore = {"mariadb.sys", "mysql", "root"}
                
        """Fetch all usernames from mysql.user (skip system accounts)."""
        try:
            conn = mysql.connector.connect(user=user, unix_socket="/run/mysqld/mysqld.sock")
            cur = conn.cursor()
            cur.execute("SELECT user, host FROM mysql.user WHERE user != '' ORDER BY user, host;")
            users = []
            for u, h in cur.fetchall():
                if u not in ignore:
                    users.append({"user": u, "host": h, "display": f"{u}@{h}"})
            cur.close()
            conn.close()
            return users
        except Error as e:
            print("Error fetching users:", e)
            return []
    
    def _test_mysql_login(self, user: str, password: str, host: str = "localhost", port: int = 3306) -> tuple[bool, str]:
        import mysql.connector
        from mysql.connector import Error        
        
        try:
            conn = mysql.connector.connect(host=host, user=user, password=password, port=port)
            if conn.is_connected():
                conn.close()
                return True, "Login successful."
            return False, "Unable to establish connection."
        except Error as e:
            return False, str(e)

    def _create_mysql_user(self, new_user: str, new_pw: str, root_user="root", port=3306):
        import mysql.connector
        from mysql.connector import Error  
                
        """Create a new MySQL user with access to all databases (*.*)."""
        try:
            conn = mysql.connector.connect(user=root_user, unix_socket="/run/mysqld/mysqld.sock")
            cur = conn.cursor()
            cur.execute(f"CREATE USER IF NOT EXISTS '{new_user}'@'%' IDENTIFIED BY %s;", (new_pw,))
            cur.execute(f"GRANT ALL PRIVILEGES ON *.* TO '{new_user}'@'%' WITH GRANT OPTION;")
            cur.execute("FLUSH PRIVILEGES;")
            conn.commit()
            cur.close()
            conn.close()
            return True, f"MySQL user '{new_user}' created with full access."
        except Error as e:
            return False, str(e)
            
    def _select_database_user(self) -> str:

        w = Whiptail(title="MySQL User Setup", backtitle="Allsky Installer", height=20, width=70)

        existing_users = self._get_mysql_users()

        items = [("NEW", "Create a new user", "ON")]
        for entry in existing_users:
            items.append(
                (entry["user"], f"Use user '{entry['user']}'@'{entry['host']}'", "OFF")
            )

        selected, code = w.radiolist("Select ONE user (or create a new user):", items)
        if code != 0:
            return ("cancel", None, None)

        # Create new user flow
        if selected[0] == "NEW":
            # Username
            while True:
                username, code = w.inputbox("Enter a new username:")
                if code != 0:
                    return ("cancel", None, None)
                username = (username or "").strip()
                if not username:
                    w.msgbox("Username cannot be empty.")
                    continue
                if " " in username:
                    w.msgbox("Username cannot contain spaces.")
                    continue
                if username in existing_users:
                    w.msgbox(f"User '{username}' already exists. Pick another name.")
                    continue
                break

            # Password (twice)
            while True:
                try:
                    pwd1, code = w.passwordbox(f"Set password for '{username}':")
                except AttributeError:
                    pwd1, code = w.inputbox(f"Set password for '{username}':")
                if code != 0:
                    return ("cancel", None, None)

                try:
                    pwd2, code = w.passwordbox("Confirm password:")
                except AttributeError:
                    pwd2, code = w.inputbox("Confirm password:")
                if code != 0:
                    return ("cancel", None, None)

                if not pwd1:
                    w.msgbox("Password cannot be empty.")
                    continue
                if pwd1 != pwd2:
                    w.msgbox("Passwords do not match. Try again.")
                    continue
                break

            ok, msg = self._create_mysql_user(username, pwd1)
            if ok:
                w.msgbox(msg)
                return ("create", username, pwd1)
            else:
                w.msgbox(f"Failed to create user: {msg}")
                return ("cancel", None, None)

        # Existing user: prompt for password and test MySQL login
        user = selected[0]
        while True:
            try:
                pw, code = w.passwordbox(f"Enter password for MySQL user '{user}':")
            except AttributeError:
                pw, code = w.inputbox(f"Enter password for MySQL user '{user}':")
            if code != 0:
                return ("cancel", None, None)

            ok, msg = self._test_mysql_login(user, pw, host="localhost", port=3306)
            if ok:
                w.msgbox(f"Login OK for '{user}'.")
                return ("select", user, pw)
            else:
                # Show error and let user retry or cancel
                choice = w.menu(
                    f"Login failed: {msg}\n\nTry again?",
                    [("retry", "Enter password again"), ("cancel", "Cancel selection")]
                )[0]
                if choice != "retry":
                    return ("cancel", None, None)

    def _sanitize_dbname(self, name: str) -> bool:
        # simple safe-name rule: letters, digits, underscore only
        return bool(re.fullmatch(r"[A-Za-z0-9_]+", name))

    def _select_database(self, host:str="localhost", user_name:str="", password:str="", database_name: str | None = None) -> tuple[bool, str | None]:
        import mysql.connector
        from mysql.connector import Error  

        def can_access(db: str) -> tuple[bool, str | None]:
            try:
                conn = mysql.connector.connect(host=host, port=3306, user=user_name, password=password, database=db)
                cur = conn.cursor()
                cur.execute("SELECT 1")
                cur.fetchone()
                cur.close()
                conn.close()
                return True, None
            except Error as e:
                return False, str(e)

        def create_db(db: str) -> tuple[bool, str | None]:
            try:
                conn = mysql.connector.connect(host=host, port=3306, user=user_name, password=password)
                cur = conn.cursor()
                cur.execute(f"CREATE DATABASE IF NOT EXISTS `{db}`")
                conn.commit()
                cur.close()
                conn.close()
                return True, None
            except Error as e:
                return False, str(e)

        if database_name:
            ok, err = can_access(database_name)
            if ok:
                self._database = database_name
                return True, database_name

        w = Whiptail(
            title="Select Database",
            backtitle="Allsky Installer",
            height=12,
            width=70
        )

        while True:
            default = "allsky"
            db_name, code = w.inputbox("Enter the MySQL database name:", default=default)
            if code != 0:  # Cancel
                return False, None

            db_name = (db_name or "").strip()
            if not db_name:
                w.msgbox("Database name cannot be empty.")
                continue
            if not self._sanitize_dbname(db_name):
                w.msgbox("Invalid name. Use letters, numbers, and underscore only.")
                continue

            # Create (if needed)
            ok, err = create_db(db_name)
            if not ok:
                choice = w.menu(
                    f"Failed to create database '{db_name}':\n{err}\n\nTry another name?",
                    [("retry", "Enter a different name"), ("cancel", "Cancel")]
                )[0]
                if choice != "retry":
                    return False, None
                continue

            # Verify access
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

    def _test_database(self):
        pass
    
    def _set_allsky_options(self, host: str="localhost", user_name: str="", password: str="", database: str="", enabled: bool=True) -> bool:
        pass
    
    def run(self) -> None:
        if not self.is_database_configured:
            if self._display_welcome():
                database_to_use = self._select_database_server()
                if (database_to_use == "mysql" and not self._mysql_installed):
                    if not self._install_database_server(database_to_use):
                        #TODO install failed
                        pass
                    
                if (database_to_use == "mysql"):
                    action, user_name, password = self._select_database_user()

                    if action == "create" or action == "select":
                        self._select_database("localhost", user_name, password,"allsky")
                        result = self._set_allsky_options("localhot", user_name, password, "allsky")


if __name__ == "__main__":    
    parser = argparse.ArgumentParser(description="Allsky database manager")
    parser.add_argument("--debug", action="store_true", help="Enable debug mode, shows more detailed errors")  
    parser.add_argument("--auto", action="store_true", help="Step through installing / configuring the database")  
    args = parser.parse_args()    
    
    database_manager = ALLSKYDATABASEMANAGER(args)

    try:
        database_manager.run()
    except Exception as e:
        print(e)
            