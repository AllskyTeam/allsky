#!/usr/bin/python3

# TODO - Add deprectaed flag and use in installer
# TODO - Save the migrated flows, ensure Allsky is stopped? Or add soemthing to the flow runner to suspend flows whilst the update happens
# TODO - Do somehting with the messages in installer, i.e. have an invalid modules menu option
# TODO - Should the git code be in here, or in a base class used by both this and the module installer - That way this class could do all of the work to install a module - NO
# TODO - Test broken modules, incorrect meta data - DONE
# TODO - Test bad locations passed in. - DONE

import os
import sys

# Ensure the script is running in the correct Python environment
allsky_home = os.environ['ALLSKY_HOME']
here = os.path.dirname(os.path.abspath(__file__))
venv_dir = os.path.join(allsky_home, 'venv')
venv_python = os.path.join(venv_dir, 'bin', 'python3')
if sys.executable != venv_python:
    os.execv(venv_python, [venv_python] + sys.argv)
    
import json
import ast
import argparse
import py_compile
import traceback
import linecache
from pathlib import Path
from packaging import version
from json import JSONDecodeError
from functools import wraps
from typing import Tuple

from exceptions import ModuleError, NoSourceError, NoVersionError

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
            
import allsky_shared as shared

shared.setup_for_command_line()

class ALLSKYMODULE:
    
    def __init__(self, module_name: str, debug:bool=False, install_source:str|None=None):
        self._module_paths = None
        self._debug_mode = debug
        self.name = module_name
        self._install_source = install_source
        self._found_locations = []
        self._installed_info = None
        self._source_info = None
        self._valid = False
        self._installed = False
        self._deprecated = False
        self._description = ""
        
        self._module_errors = {
            "source": [],
            "installed": []
        }

        self._init_module_paths()
        self._init_module()
        
    def __str__(self) -> str:
        return f"Name: {self.name}"

    def __repr__(self) -> str:
        return self.__str__()
    
    def _log(self, debug_only, message):

        if debug_only and self._debug_mode or not debug_only:
            print(f"\033[0;32m{message}")
    
    
    @property
    def name(self) -> str:
        return self._module_name
    
    @name.setter
    def name(self, value:str):
        self._module_name = value

    @property
    def description(self) -> str:
        return self._description

    @description.setter
    def description(self, value:str):
        self._description = value


    @property
    def deprecated(self) -> str:
        return self._deprecated

    @deprecated.setter
    def deprecated(self, value:str):
        self._deprecated = value
            
    @property
    def name_for_flow(self) -> str:
        prefix = "allsky_"

        if self.name.startswith(prefix):
            result = self.name[len(prefix):]
        else:
            result = self.name
            
        return result
    
    @property
    def installed(self) -> bool:
        #result = False
        #if self._installed_info is not None:
        #    result = True
        
        return self._installed

    @property
    def winstalled(self):
        return 'ON' if self.installed else 'OFF'
        
    @staticmethod
    def ensure_valid(method):
        @wraps(method)
        def wrapper(self, *args, **kwargs): 
            if self._valid or (self._module_errors["installed"] and not self._module_errors["source"]):
                return method(self, *args, **kwargs)
            else:
                errors = ""
                if self._module_errors["installed"]:
                    errors += "Installed Module: "
                    errors += ",".join(self._module_errors["installed"])
                if self._module_errors["source"]:
                    errors += "Source Module: "
                    errors += ",".join(self._module_errors["source"])
                raise ModuleError(errors)
        return wrapper

    def _get_meta_value(self, source, value) -> str | int | float | bool | list | dict | None:
        result = None
        meta_data = None        
        
        if self._source_info is not None:
            meta_data = self._source_info["meta_data"]
            
        if source == "installed":
            if self._installed_info is not None:
                meta_data = self._installed_info["meta_data"]
        
        if meta_data is not None:
            if value in meta_data:
                result = meta_data[value]
    
        return result
    
    @ensure_valid
    def is_new_version_available(self):
        result = True
        
        source_version, installed_version = self._get_versions()

        if source_version is not None and installed_version is not None:
            result = version.parse(installed_version) < version.parse(source_version)
        else:
            if self.installed and installed_version is None:
                result = True
            
        return result
    
    def is_migration_required(self) -> bool:                        
        return self._flows_differ
    
    def _get_versions(self) -> Tuple[str, str]:
        source_version = None
                    
        installed_version = self._get_meta_value("installed", "version")
        if installed_version is not None:
            if self._source_info is not None:
                source_version = self._get_meta_value("source", "version")
                if source_version is None:
                    raise NoVersionError("ERROR: cannot locate version in source module")

        return source_version, installed_version  

    def _getenv_or_exit(self, name: str) -> str:
        val = os.getenv(name)
        if not val:
            print(f"ERROR: ${name} not found - Aborting.")
            sys.exit(1)
        return val
    
    def _init_module_paths(self) -> None:
        allsky_my_files_folder   = Path(self._getenv_or_exit("ALLSKY_MYFILES_DIR")) / "modules"
        allsky_modules_location  = Path(self._getenv_or_exit("ALLSKY_MODULE_LOCATION")) / "modules"
        allsky_scripts_dir   = Path(self._getenv_or_exit("ALLSKY_SCRIPTS")) / "modules"
        
        self._module_install_paths = [allsky_my_files_folder, allsky_modules_location, allsky_scripts_dir]  
              
    def _check_module_function_exists(self, full_module_path: str) -> bool:

        module_path = Path(full_module_path)
        try:
            src = module_path.read_text(encoding="utf-8-sig")
        except OSError:
            return False

        base = module_path.stem 
        if not base.startswith("allsky_"):
            return False
        func_name = base[len("allsky_"):]

        try:
            tree = ast.parse(src, filename=str(module_path))
        except SyntaxError:
            return False
                
        for node in tree.body:
            if isinstance(node, ast.FunctionDef) and node.name == func_name:
                arg_names = []
                if hasattr(node.args, "posonlyargs"):
                    arg_names.extend(a.arg for a in node.args.posonlyargs)
                arg_names.extend(a.arg for a in node.args.args)

                exact = (
                    arg_names == ["params", "event"] and
                    not node.args.kwonlyargs and
                    node.args.vararg is None and
                    node.args.kwarg is None
                )
                return exact

        return False
    
    def _validate_module(self, installed_file_path:str) -> tuple[bool, str]:
        
        status = {
            "path": installed_file_path,
            "valid": True,
            "message": [],
            "meta_data": []
        } 
                        
        meta_data = self._get_meta_data_from_file(installed_file_path)

        if meta_data is not None:
            self.deprecated = False
            self.description = meta_data.get("description", self.name)
            if "deprecation" in meta_data:
                if "deprecated" in meta_data["deprecation"]:
                    self.deprecated = shared.to_bool(meta_data["deprecation"]["deprecated"])
                   
        if meta_data is None:
            status["valid"] = False
            status["message"].append('No valid meta data found')
                
        callable = self._check_module_function_exists(installed_file_path)
        if not callable:
            self._log(False, f"ERROR: {installed_file_path} Has no callable module function. This module will NOT work")
            status["valid"] = False
            status["message"].append('Module has no callable function. This module will NOT work')

        if meta_data is not None:
            status["meta_data"] = meta_data
                
        return status
    
    def _check_python_syntax(self, filepath: str) -> bool:
        """
        Check syntax of a Python file without executing it.
        Returns True if syntax is OK, False otherwise.
        """
        try:
            py_compile.compile(filepath, doraise=True)
            return True

        except py_compile.PyCompileError as e:
            # Extract and parse SyntaxError info
            tb = e.exc_value
            if isinstance(tb, SyntaxError):
                filename = tb.filename
                lineno = tb.lineno
                offset = tb.offset
                text = linecache.getline(filename, lineno).rstrip()
                msg = tb.msg

                print(f"\nSyntax error in: {filename}")
                print(f"   → Line {lineno}, Column {offset}: {msg}")
                if text:
                    print(f"     {text}")
                    if offset:
                        print("     " + " " * (offset - 1) + "^")
            else:
                print(f"Compilation error:\n{traceback.format_exc()}")

            return False
        
    def _init_module(self):
        
        self._installed_info = []
        self._source_info = []
        self._installed = False
        self._valid = False
        
        for path in self._module_install_paths:
            if not os.path.exists(path):
                continue
            installed_file_path = os.path.join(path, self.name + ".py")
            if os.path.exists(installed_file_path) and os.path.isfile(installed_file_path):
                self._installed = True
                self._check_python_syntax(installed_file_path)
                status = self._validate_module(installed_file_path)
                if status["valid"]:
                    self._installed_info = status
                    self._installed_info["path"] = path
                    self._installed_info["full_path"] = installed_file_path
                    self._valid = True
                                                           
                if status["message"]:
                    self._installed_info = status                    
                    self._module_errors["installed"] += status["message"]
                    self._valid = False
                                        
                self._found_locations.append(status)
    
        if self._install_source is not None:
            if os.path.exists(self._install_source):
                source_file_path = os.path.join(self._install_source, self.name , self.name + ".py")
                if shared.is_file_readable(source_file_path):                 
                    if self._check_python_syntax(source_file_path):
                        status = self._validate_module(source_file_path)
                        if status["valid"]:
                            self._source_info = status
                            self._source_info["path"] = os.path.join(self._install_source, self.name)
                            self._valid = True                        
    
                        if status["message"]:
                            self._module_errors["source"] += status["message"]
                            self._valid = False
                    else:
                        self._module_errors["source"] += [f"Module - ({source_file_path}) is not valid python"]
                        self._valid = False
                else:
                    self._module_errors["source"] += [f"Unable to locate module file to install - ({source_file_path})"]
                    self._valid = False

        self._flows_differ = False
        self._differing_flows = []
        if self.installed:
            flows = shared.get_flows_with_module(self.name_for_flow)
            for flow, flow_data in flows.items():
                flow_module_data = flow_data[self.name_for_flow]["metadata"]["argumentdetails"]
                code_module_data = self._get_meta_data_from_file(self._installed_info["full_path"])
                code_module_data = code_module_data["argumentdetails"]
                
                if shared.compare_flow_and_module(flow_module_data, code_module_data):
                    self._flows_differ = True
                    self._differing_flows.append(flow)
        
    def _get_meta_data_from_file(self, file_path:str) -> dict | list | None:
        meta_data = None

        meta_data = self._get_meta_data_from_file_by_name(file_path, "meta_data")
        if meta_data is None:
            meta_data = self._get_meta_data_from_file_by_name(file_path, "metaData")
                
        if meta_data is not None:
            try:
                meta_data = json.loads(meta_data)
            except JSONDecodeError:
                meta_data = None
                
        return meta_data

    def _get_meta_data_from_file_by_name(self, file_path:str, meta_variable_name:str) -> str | None:
        meta_data = None
        if os.path.exists(file_path) and os.path.isfile(file_path):
            try:
                with open(file_path, "r", encoding="utf-8") as file:
                    file_contents = file.readlines()
                found = False
                level = 0

                for source_line in file_contents:

                    if source_line.rstrip().endswith("{"):
                        level += 1

                    if source_line.lstrip().startswith("}"):
                        level -= 1

                    if source_line.lstrip().startswith(meta_variable_name):
                        found = True
                        meta_data = ""
                        source_line = source_line.replace(f"{meta_variable_name}", "").replace("=", "").replace(" ", "")
                    if found:
                        meta_data += source_line
                    if source_line.lstrip().rstrip() == "}" and found and level == 0:
                        break
            except (FileNotFoundError, PermissionError, OSError) as e:
                meta_data = None
              
        return meta_data
    
    def _setup_module_paths(self) -> None:
        base_path = shared.get_environment_variable("ALLSKY_MYFILES_DIR")
        base_path = os.path.join(base_path, "modules")
        moduledata_base_path = os.path.join(base_path, "moduledata")        
        self._module_paths = {
            "module": base_path,
            "blocks": os.path.join(moduledata_base_path, "blocks", self.name),
            "data": os.path.join(moduledata_base_path, "data", self.name),
            "info": os.path.join(moduledata_base_path, "info", self.name),
            "charts": os.path.join(moduledata_base_path, "charts", self.name),
            "installer": os.path.join(moduledata_base_path, "installer", self.name),
            "logfiles": os.path.join(moduledata_base_path, "logfiles", self.name),
            "dbconfig": os.path.join(self._source_info["path"], "db", "db_data.json")
        }

    def _install_apt_dependencies(self) -> bool:
        result = True
               
        log_folder = self._module_paths["logfiles"]
        log_file = os.path.join(log_folder, 'dependencies.log')
        packages_file = os.path.join(self._source_info["path"], "packages.txt")
        
        if shared.is_file_readable(packages_file):
            result = shared.install_apt_packages(packages_file, log_file)
            self._log(True, f"INFO: {self.name} Installed apt dependencies - {'Successful' if result else 'Failed'}")            
            
        else:
            self._log(True, f"INFO: {self.name} No apt packages required")
            
        return result
            
    def _install_python_dependencies(self) -> bool:
        result = True
               
        log_folder = self._module_paths["logfiles"]
        log_file = os.path.join(log_folder, 'dependencies.log')
        requirements_file = os.path.join(self._source_info["path"], "requirements.txt")
        
        if shared.is_file_readable(requirements_file):        
            result = shared.install_requirements(requirements_file, log_file)
            self._log(True, f"INFO: {self.name} Installed python dependencies - {'Successful' if result else 'Failed'}")            
            
        else:
            self._log(True, f"INFO: {self.name} No python modules required")
            
        return result

    def _create_modules_folder(self) -> bool:
        if not os.path.isdir(self._module_paths["module"]):
            os.makedirs(self._module_paths["module"], exist_ok=True)
            shared.set_permissions(self._module_paths["module"])
            
        return True
              
    def _install_copy_module(self) -> bool:
        module_file = os.path.join(self._source_info["path"], self.name + ".py")
        result = shared.copy_file(module_file, self._module_paths["module"])
        self._log(True, f"Copied {module_file} to {self._module_paths['module']}")
        self._log(True, f"INFO: {self.name} Copied module code - {'Successful' if result else 'Failed'}")

        return result

    def _install_copy_blocks(self) -> bool:
        result = False
        source = os.path.join(self._source_info["path"], "blocks")
        if os.path.isdir(source):
            result = shared.copy_folder(source, self._module_paths["blocks"])
            self._log(True, f"INFO: {self.name} Copied module blocks - {'Successful' if result else 'Failed'}")            
        else:
            self._log(True, f"INFO: {self.name} No blocks required")
            result = True
        

        return result

    def _install_copy_charts(self) -> bool:
        result = False
        source = os.path.join(self._source_info["path"], "charts")
        if os.path.isdir(source):
            result = shared.copy_folder(source, self._module_paths["charts"])
            self._log(True, f"INFO: {self.name} Copied module charts - {'Successful' if result else 'Failed'}")            
        else:
            self._log(True, f"INFO: {self.name} No charts required")
            result = True
        

        return result
    
    def _install_copy_data(self) -> bool:
        result = False
        source = os.path.join(self._source_info["path"], self.name)
        if os.path.isdir(source):
            result = shared.copy_folder(source, self._module_paths["data"])
            self._log(True, f"INFO: {self.name} Copied module data - {'Successful' if result else 'Failed'}")
        else:
            self._log(True, f"INFO: {self.name} No data required")
            result = True
        
        
        return result

    def _install_copy_info(self) -> bool:
        result = False
        info_files = ['readme.txt', 'README.txt', 'README.md']
        
        if shared.do_any_files_exist(self._source_info["path"], info_files):
            result = shared.copy_list(info_files, self._source_info["path"], self._module_paths["info"])
            self._log(True, f"INFO: {self.name} Copied module info - {'Successful' if result else 'Failed'}")
        else:
            result = True
            self._log(True, f"INFO: {self.name} No info files required")
            
        return result

    def _install_installer_info(self) -> bool:
        result = False
        
        self._installer_data = {}
        try:
            installer_file = os.path.join(self._source_info["path"], 'installer.json')
            if shared.is_file_readable(installer_file):
                try:
                    with open(installer_file, 'r', encoding='UTF-8') as file:
                        self._installer_data = json.load(file)
                except json.JSONDecodeError:
                    print('Error: Invalid json installer file')  #TODO DO SOMETHING !
            else:
                self._installer_data = {
                    "requirements": [],
                    "packages": [],
                    "post-install": {
                        "run": []
                    }
                }
                requirements_file = os.path.join(self._source_info["path"], 'requirements.txt')
                if shared.is_file_readable(requirements_file):
                    with open(requirements_file, 'r', encoding='UTF-8') as file:
                        lines = file.readlines()
                        self._installer_data['requirements'] = [line.strip() for line in lines]

                packages_file = os.path.join(self._source_info["path"], 'packages.txt')
                if shared.is_file_readable(packages_file):
                    with open(packages_file, 'r', encoding='UTF-8') as file:
                        lines = file.readlines()
                        self._installer_data['packages'] = [line.strip() for line in lines]

            installer_filename = os.path.join(self._module_paths["installer"],"installer.json")
            file_data = json.dumps(self._installer_data)
            shared.check_and_create_directory(self._module_paths["installer"])
            shared.create_and_set_file_permissions(installer_filename, None, None, None, False, file_data)
            
            result = True            
            self._log(True, f"INFO: {self.name} Copied installer data - {'Successful' if result else 'Failed'}")            
        except Exception as e:
            print(e)
            result = False
           
        return result
    
    def _install_database_config(self) -> bool:
        result = True        
        source = os.path.join(self._source_info["path"], "db", "db_data.json")
        file_path = Path(source)
        if file_path.is_file():
            db_config = shared.load_json_file(self._module_paths["dbconfig"])
            
            if self._source_info is not None:
                meta_data = self._source_info["meta_data"]
                table = meta_data.get("extradata", {}).get("database", {}).get("table", None)
                if table is not None:
                    user_db_config_file = os.path.join(shared.get_environment_variable("ALLSKY_MYFILES_DIR"), "db_data.json")
                    user_db_config = shared.load_json_file(user_db_config_file)
                    user_db_config[table] = db_config[table]
                    shared.save_json_file(user_db_config, user_db_config_file)
                    self._log(False, f"INFO: {self.name} Add db config data")
                else:
                    self._log(True, f"INFO: {self.name} No db config required")                      
            else:
                self._log(False, f"ERROR: {self.name} No meta data available in _install_database_config")
        else:
            self._log(True, f"INFO: {self.name} No db config required")            
            
        return result
        
    def _post_install(self) -> bool:
        result = True
        post_run_script = self._installer_data.get("post-install", {}).get("run", None)
        if post_run_script:
            post_run_script = post_run_script.replace("{install_data_dir}", self._module_paths["data"])
            
            if post_run_script.endswith(".py"):
                result, text = shared.run_python_script(post_run_script)
            else:
                result, text = shared.run_script(post_run_script)
            
            if result == 0:
                self._log(False, f"INFO: _post_install -> Module {self.name} Post install routines run")
                result = True
            else:
                self._log(False, f"ERROR: _post_install -> Module {self.name} Post install routines failed. {text}")
                result = False            
        else:
            self._log(False, f"INFO: {self.name} requires no post installation")
                                     
        return result
    
    def _cleanup_module(self) -> bool:        
        result = True

        do_cleanup = False
        if self._installed_info:
            if str(self._installed_info["path"]) != str(self._module_paths["module"]):
                do_cleanup = True

        if do_cleanup:
            try:
                self._log(False, f"INFO: {self.name} cleanup required")                
                installed_file_path = os.path.join(self._installed_info["path"], self.name + ".py")
                shared.remove_path(installed_file_path)
            
                dependencies_path = os.path.join(self._installed_info["path"],'dependencies', self.name)
                info_path = os.path.join(self._installed_info["path"],'info', self.name)

                shared.remove_path(dependencies_path)
                shared.remove_path(info_path)
            except Exception as e:
                self._log(False, f"ERROR: _cleanup_module -> Module {self.name} failed to remove - {e}")
                result = False
        else:
            self._log(False, f"INFO: {self.name} no cleanup required")
                            
        return result
    
    @ensure_valid     
    def _install_module(self) -> bool:
        self._setup_module_paths()
                        
        install_steps = [
            ("Install checks",        self._create_modules_folder),
            ("copy module",           self._install_copy_module),
            ("copy blocks",           self._install_copy_blocks),
            ("copy data",             self._install_copy_data),
            ("copy info",             self._install_copy_info),
            ("copy charts",           self._install_copy_charts),
            ("installer info",        self._install_installer_info),
            ("Database Config",       self._install_database_config),
            ("apt dependencies",      self._install_apt_dependencies),
            ("python dependencies",   self._install_python_dependencies),
            ("Post install",          self._post_install),
            ("Cleanup module",        self._cleanup_module)
        ]

        for name, step in install_steps:
            result = step()
            if not result:
                self._log(False, f"ERROR: '{name}' process failed - Aborting installation")
                return False
            
        self._log(False, f"INFO: Installation complete")            
        return True

    @ensure_valid
    def uninstall_module(self):
        result = False
        
        try:
            if self._installed_info is not None:
                self._setup_module_paths()

                module_file = os.path.join(self._installed_info["path"], self.name + ".py")
                shared.remove_path(module_file)
                
                shared.remove_path(self._module_paths["blocks"])
                shared.remove_path(self._module_paths["data"])
                shared.remove_path(self._module_paths["info"])
                shared.remove_path(self._module_paths["charts"])
                shared.remove_path(self._module_paths["installer"])
                shared.remove_path(self._module_paths["logfiles"])
                result = True
            else:
                self._log(True, f"ERROR: uninstall_module -> Module {self.name} Is not installed so cannot remove")
        except Exception:
            result = False

        return result
    
    @ensure_valid                            
    def migrate_module(self) -> bool:
        deprecated = []
        additional = []
        
        self._log(False, f"INFO: Starting module migration")
                    
        self._init_module() #Need to reload the source info as it will have changed if a new version was installed
                            
        flows = shared.get_flows_with_module(self.name_for_flow)
        for flow, flow_data in flows.items():
            self._log(True, f"INFO: Analysing flow {flow}")
            old_flow_data = flow_data[self.name_for_flow]["metadata"]
            new_flow_data = self._installed_info["meta_data"]
            
            if not "arguments" in old_flow_data:
                raise ModuleError(f"{flow} has corrupted meta data for module {self.name}, arguments is missing")
            
            for setting, value in old_flow_data["arguments"].items():
                if setting in new_flow_data["arguments"]:
                    new_flow_data["arguments"][setting] = value
                else:
                    deprecated.append({
                        "setting": setting,
                        "value": value
                    })
            
            for setting, value in new_flow_data["arguments"].items():
                if setting not in old_flow_data["arguments"]:
                    new_flow_data["arguments"][setting] = value
                    self._log(True, f"INFO: Additional {setting} - {value} added to flow")
                    additional.append({
                        "setting": setting,
                        "value": value
                    })                    

            secrets = shared.load_secrets_file()
            secrets_changed = False
            for setting, value in new_flow_data["argumentdetails"].items():
                if shared.to_bool(value.get("secret", False)):
                    secrets_key = f"{self.name.upper()}.{setting.upper()}"
                    if not secrets_key in secrets:
                        secrets[secrets_key] = new_flow_data["arguments"].get(setting, "")
                        new_flow_data["arguments"][setting] =  ""
                        secrets_changed = True
                        self._log(True, f"INFO: Setting {setting} migrated to env.json file")

                    
            if secrets_changed:
                shared.save_secrets_file(secrets)
            
            flow_data[self.name_for_flow]["metadata"] = new_flow_data

        self._log(False, f"INFO: Migrating flows containing module {self.name}")  
        shared.save_flows_with_module(flows, self.name)
        
        self._log(True, f"INFO: Deprecated Settings")          
        if deprecated:
            for item in deprecated:
                self._log(True, f"  Setting: {item['setting']}, Value: {item['value']}")
        else:
            self._log(True, "  No settings were deprecated")
    
        self._log(True, f"INFO: New Settings")
        if additional:
            for item in additional:
                self._log(True, f"  Setting: {item['setting']}, Value: {item['value']}")
        else:
            self._log(True, "  No additional settings were found")
                
        self._log(True, f"INFO: Module migration complete")
                        
    @ensure_valid
    def install_or_update_module(self, force:bool = False) -> bool:
        result = False
        
        message = f"Installing Module {self.name}"
        underline = "=" * len(message)
        self._log(False, f"\n\n{message}\n{underline}\n")
                
        if self._source_info is None:
            raise NoSourceError("ERROR: No source module provided to install from")
        
        update_required = False        
        install_required = False
        if self._installed_info is None or force:
            install_required = True
        else:
            if self.is_new_version_available():
                update_required = True
         
        migrate_required = self.is_migration_required()
 
        if not install_required and not update_required and not migrate_required:
            self._log(False, f"INFO: install_or_update -> Module {self.name} Nothing to do module is uptodate and does not require migrating - Aborting")
        else:
            actions = []
            if install_required:
                actions.append("installation")
            if update_required:
                actions.append("updating")
            if migrate_required:
                actions.append("migrating")

            if actions:
                action_str = ", ".join(actions)
            else:
                action_str = "nothing"

            self._log(True, f"INFO: install_or_update -> Module {self.name} requires {action_str}")

            
            if install_required or update_required:
                self._install_module()

            if migrate_required or force:
                self.migrate_module()
                
        return result

    @ensure_valid
    def print_module_status(self) -> None:
        
        source_version, installed_version = self._get_versions()
        version_string = ""
        if source_version is not None and installed_version is not None:
            version_string = "New version available" if self.is_new_version_available() else "Using latest version"
        migration_string = "Migration required, see below for affected flows" if self.is_migration_required() else "No migration required"
        description = self._get_meta_value("installed", "description")
        
        installed_version = (installed_version or "None Available").ljust(15)
        source_version = (source_version or "None Available").ljust(15)

        message = f"Module {self.name} Status"
        underline = "=" * len(message)
        print(f"{message}\n{underline}\n")

        print("             Installed         Available")
        print(f"Version:     {installed_version}   {source_version} {version_string}")
        
        if self._module_errors["source"]:
            print("\nSource Module Errors:")
            for error in self._module_errors["source"]:
                print(f"  - {error}")
                        
        print(f"\nDescription:      {description}")
        print(f"Installed In:     {self._installed_info['path']}")
        print(f"Migration Status: {migration_string}\n")


        if self._module_errors["installed"]:
            print("\nInstalled Module Errors:")
            for error in self._module_errors["installed"]:
                print(f"  - {error}")

        if self._flows_differ:
            print("The following flows have differing settings to the installed module")
            print("-------------------------------------------------------------------")
            for flow in self._differing_flows:
                print(f"  - {flow}")
            print("Run this script with --action migrate to update these flows")
                
                                            
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Allsky extra module")
    parser.add_argument("--debug", action="store_true", help="Enable debug mode, shows more detailed errors")
    parser.add_argument("--module", required=True, type=str, help="The module to install")
    parser.add_argument("--source", type=str, help="Source folder containing modules")
    parser.add_argument("--force", action="store_true", help="If migrating and/or installing a module then force the install/migration logic to run")
    parser.add_argument("--action", required=True, choices=["install", "reinstall", "remove", "migrate", "status"], help="Choose action to perform")

    args = parser.parse_args()    
    
    module_installer = ALLSKYMODULE(args.module, args.debug, args.source)
    
    if args.action == "status":
        #try:
            if module_installer.installed:
                module_installer.print_module_status()
            else:
                print(f"Module {args.module} is not installed.")
        #except Exception as e:
        #    print(e)
                
    if args.action == "install" or args.action == "reinstall":
        #try:
            module_installer.install_or_update_module()
        #except Exception as e:
        #    print(e)
        
    if args.action == "remove":
        try:
            module_installer.uninstall_module(args.force)
        except Exception as e:
            print(e)

    if args.action == "migrate":
        module_installer.migrate_module()
        #try:
        #    module_installer.migrate_module()
        #except Exception as e:
        #    print(e)
