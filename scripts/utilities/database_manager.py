#!/usr/bin/python3

import os
import sys
import re
import argparse
import subprocess
import shutil

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
    _high_performance = "\nSince you are running a PI with sufficient CPU and RAM it is recommended that you use MySQL (MariaDB) although you may select sqlite if you wish"
    _enable_database = "\n\nWould you like to enable this feature? If you select No then you can rerun this script at any time and enable the database"
    _mysql_warning = "This script can only configure MySQL on the local Pi. If you wish to use MySQL on a remote server then please consult the Allsky documentation\
        \n\nDo you wish to configure MySQL on this Pi?"
    _show_mysql_warning = True
    
    _back_title= "Allsky Database Manager"
    _whiptail_title_select_database = "Select Database"
    _whiptail_message = "Message"
    
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
    
    def _mysql_service_installed(self) -> Tuple[bool, Optional[str]]:
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
        from mysql.connector import Error        
        
        try:
            if self._run_mysql_command(host=host, user_name=user_name, password=password, command_type="login"):
                return True, "Login successful."
            return False, "Unable to establish connection."
        except Error as e:
            return False, str(e)

    def _create_mysql_user(self, new_user: str, new_pw: str, root_user="root", port=3306):
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

    def _run_mysql_command(self, host:str="", user_name:str="", password:str="", command:str|list="", database:str="", command_type: Literal["none", "fetchone", "fetchall", "login"]="", root_user:bool=False) -> str:
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
            try:
                # Consume current result set if any
                if getattr(cur, "with_rows", False):
                    cur.fetchall()
                # If the statement produced multiple result sets, consume them too
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

    def _show_mysql_warning_message(self)-> None:
        result = False
        
        if self._show_mysql_warning:
            w_prompt = Whiptail(title=self._whiptail_message, backtitle=self._back_title, height=12, width=60)
            result = w_prompt.yesno(self._mysql_warning)
        else:
            result = True
                        
        return result
                                
    def _sanitise_dbname(self, name: str) -> bool:
        return bool(re.fullmatch(r"[A-Za-z0-9_]+", name))

    def _select_mysql_database(self, host:str="localhost", user_name:str="", password:str="", database_name: str | None = None) -> tuple[bool, str | None]:
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

    def _test_database(self):
        pass
    
    def _set_allsky_options(self, host: str="localhost", user_name: str="", password: str="", database: str="", enabled: bool=True) -> bool:
        pass
    
    def run(self) -> None:
        if not self.is_database_configured:
            if self._display_welcome():
                database_to_use = self._select_database_server()
                if (database_to_use == "mysql" and not self._mysql_installed):
                    if self._show_mysql_warning_message():
                        if not self._install_database_server(database_to_use):
                            #TODO install failed
                            pass
                    else:
                        sys.exit(1)
                    
                if (database_to_use == "mysql"):
                    
                    
                    action, user_name, password = self._select_mysql_database_user()

                    if action == "create" or action == "select":
                        self._select_mysql_database("localhost", user_name, password,"allsky")
                        result = self._set_allsky_options("localhot", user_name, password, "allsky")

    def remove_mysql(self, remove_data: bool = False):

        def run(cmd):
            print(">>>", " ".join(cmd))
            subprocess.run(cmd, check=True)
            
        # 1. Stop and disable the service
        run(["sudo", "systemctl", "stop", "mariadb"])
        run(["sudo", "systemctl", "disable", "mariadb"])

        # 2. Purge packages
        run(["sudo", "apt-get", "purge", "-y",
            "mariadb-server", "mariadb-client", "mariadb-common"])

        # 3. Autoremove unused packages
        run(["sudo", "apt-get", "autoremove", "-y"])

        if remove_data:
            # 4. Delete leftover data and configs
            if os.path.exists("/var/lib/mysql"):
                print(">>> Removing /var/lib/mysql")
                shutil.rmtree("/var/lib/mysql", ignore_errors=True)
            if os.path.exists("/etc/mysql"):
                print(">>> Removing /etc/mysql")
                shutil.rmtree("/etc/mysql", ignore_errors=True)

        # 5. Verify service gone
        result = subprocess.run(
            ["systemctl", "status", "mariadb"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        print(result.stderr or result.stdout)
    
if __name__ == "__main__":    
    parser = argparse.ArgumentParser(description="Allsky database manager")
    parser.add_argument("--debug", action="store_true", help="Enable debug mode, shows more detailed errors")  
    parser.add_argument("--auto", action="store_true", help="Step through installing / configuring the database")  
    parser.add_argument("--removemysql", action="store_true", help="For testign only remove mysql")  
    args = parser.parse_args()    
    
    database_manager = ALLSKYDATABASEMANAGER(args)

    if args.removemysql:
        database_manager.remove_mysql()
        sys.exit(0)
    #try:
    database_manager.run()
    #except Exception as e:
    #    print(e)
            