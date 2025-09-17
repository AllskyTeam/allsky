#!/usr/bin/python3

import os
import sys
import argparse

# Ensure the script is running in the correct Python environment
allsky_home = os.environ['ALLSKY_HOME']
here = os.path.dirname(os.path.abspath(__file__))
venv_dir = os.path.join(allsky_home, 'venv')
venv_python = os.path.join(venv_dir, 'bin', 'python3')
if sys.executable != venv_python:
    os.execv(venv_python, [venv_python] + sys.argv)

import shutil
import json
from pathlib import Path
from git import Repo, InvalidGitRepositoryError, GitCommandError
from allskymodule import ALLSKYMODULE
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
            
import allsky_shared as shared

shared.setup_for_command_line()

from exceptions import ConfigError, ModuleError, NoVersionError
        
class ALLSKYMODULEINSTALLER:
    
    _module_repo_base_path = "/opt/allsky"
    _module_repo_path = "/opt/allsky/allsky-modules"

    
    def __init__(self, debug_mode): 
        self._debug_mode = debug_mode
        self._allsky_path = shared.get_environment_variable("ALLSKY_HOME")
        self._branch = shared.get_environment_variable("ALLSKY_GITHUB_MAIN_BRANCH")
        repo_base = shared.get_environment_variable("ALLSKY_GITHUB_ROOT")
        modules_repo = shared.get_environment_variable("ALLSKY_GITHUB_ALLSKY_MODULES_REPO")
        self._module_repo = f"{repo_base}/{modules_repo}"
        
        self._pre_checks()

    def _log(self, debug_only, message):

        if debug_only and self._debug_mode or not debug_only:
            print(message)
                        
    def _pre_checks(self):
        result = True

        if not os.path.exists(self._allsky_path):
            raise ConfigError("AllSky does not seem to be installed. The /opt/allsky directory does not exist. Please install AllSky before installing the modules")

        if os.geteuid() == 0:
            raise ConfigError("DO NOT run this as root. Run the installer as the same user as AllSky was installed")

        try:
            self.user = os.getlogin()
        except:
            if 'LOGNAME' in os.environ:
                self.user = os.environ['LOGNAME']
            else:
                raise ConfigError("Cannot determine user - Aborting")
                 
        return result  
    
    def _is_git_repo(self, path: Path) -> bool:
        try:
            Repo(path).git_dir
            return True
        except (InvalidGitRepositoryError, GitCommandError):
            return False

    def _ensure_cloned_repo(self, repo_url: str, dest: str | Path, branch: str = "master", re_checkout:bool = False) -> bool:
        dest_path = Path(dest)

        if dest_path.exists() and dest_path.is_dir() and self._is_git_repo(dest_path) and not re_checkout:
            try:
                repo = Repo(dest_path)
                self._log(True,f"INFO: Updating existing repo in {dest_path}...")
                repo.git.checkout(branch, force=True)
                repo.remotes.origin.pull()
                return True
            except GitCommandError as e:
                tb = e.__traceback__
                self._log(False, f"ERROR: Function _ensure_cloned_repo on line {tb.tb_lineno}: {e}")
                return False
        else:
            if dest_path.exists():
                if re_checkout:
                    self._log(True, f"INFO: In auto mode so re-checking out the module repo")
                else:
                    self._log(True, f"INFO: {dest_path} exists but is not a repo. Removing...")
                shutil.rmtree(dest_path)

            dest_path.parent.mkdir(parents=True, exist_ok=True)

            try:
                Repo.clone_from(
                    repo_url,
                    str(dest_path),
                    branch=branch
                )
                self._log(True, f"INFO: Cloned {repo_url} into {dest_path}")
                return True
            except GitCommandError as e:
                print(f"INFO: Error cloning {repo_url}: {e}")
                return False

    def _get_remote_branches(self, repo_path: str | Path) -> list[str]:
        repo = Repo(repo_path)
        return [
            ref.name.split("/", 1)[1]
            for ref in repo.remotes.origin.refs
            if ref.name != "origin/HEAD"
        ]

    def _select_git_branch(self, args: argparse.Namespace, force:bool = False) -> None:
        
        if args.branch or force:
            wt = Whiptail(title="Select Branch", backtitle=f"Allsky Module Installer. Using branch {self._branch}")
            menu_items = [(branch, "") for branch in self._branches]

            branch, exit_code = wt.menu("Choose a branch:", menu_items)
            if exit_code == 0:
                self._branch = branch
        
        if args.setbranch and not force:
            self._branch = args.setbranch

        repo = Repo(self._module_repo_path)
        repo.git.checkout(self._branch, force=True)

    def _get_checkedout_branch(self) -> str:
        branch = "Unknown"
        
        try:
            repo = Repo(self._module_repo_path)
            branch = repo.active_branch
        except:
            pass
        
        return branch
                
    def _read_modules(self) -> None:
        self._module_list = []
        dirs = os.listdir(self._module_repo_path)
        for dir in dirs:
            if dir.startswith('allsky_') and not os.path.isfile(dir):
                self._module_list.append(ALLSKYMODULE(dir, self._debug_mode, self._module_repo_path))
        
        self._module_list = sorted(self._module_list, key=lambda p: p.name)

    def _find_module(self, module_name: str):
        found_module = None
        for module in self._module_list:
            if module.name == module_name:
                found_module = module
                break

        return found_module
    
    def _display_install_dialog(self):
        module_list = []
        modules_to_install = None
        for module in self._module_list:
            try:
                status = ""
                if module.installed:
                    status = "Installed"
                    if module.is_new_version_available():
                        status = "Update Available"
                        
                module_list.append((module.name, status,  ""))
            except (ModuleError, NoVersionError) as e:
                pass
            except Exception as e:
                tb = e.__traceback__
                print(f"Error {module.name} on line {tb.tb_lineno}: {e}")
                sys.exit(1)
            
        if len(module_list) > 0:                            
            w = Whiptail(title="Select Modules", backtitle=f"Allsky Module Installer. Using branch {self._branch}", height=20, width=60)
            modules_to_install = w.checklist('Select the Modules To Install', module_list)[0]

        for module_name in modules_to_install:
            module = self._find_module(module_name)
            try:
                module.install_or_update_module(True)
            except Exception as e:
                print(e)

        if len(modules_to_install) > 0:
            print("\n\nInstallation complete")
            input("\nPress Enter to continue...")
            
        return modules_to_install
    
    def auto_upgrade_modules(self, args):
        self._log(False, f"Auto upgrade modules started")
        self._log(False, f"============================\n")

        if args.dryrun:
            self._log(False, f"WARNING: Using dry run mode, no changes will be made\n")
            
        self._log(True, f"Initialising Allsky Module repository")
        self._log(True, f"=====================================\n")            
        self._ensure_cloned_repo(self._module_repo, self._module_repo_path, self._branch, True)
        self._branches = self._get_remote_branches(self._module_repo_path)
        self._select_git_branch(args)

        branch = self._get_checkedout_branch()
        print(f"INFO: Using branch {branch}")
        
        self._log(True, f"\nReading Installed modules")
        self._log(True, f"=========================\n")
        self._read_modules()
        
        self._log(True, f"\nUpdating modules")
        self._log(True, f"================\n")
                
        for module in self._module_list:
            #try:
            if module.installed:
                if not args.dryrun:
                    module.install_or_update_module(True)
            #except Exception as e:
            #    tb = e.__traceback__
            #    self._log(False, f"ERROR: Function auto_upgrade_modules on line {tb.tb_lineno}: {e}")
        
        self._log(False, "INFO: Auto upgrade modules completed\n\n")
    
        self.cleanup_opt(args)
        
    def cleanup_opt(self, args):
        
        did_something = False
        self._log(False, f"Starting cleanup of /opt/allsky/modules")
        self._log(False, f"=======================================\n")
        
        try:
            allsky_module_folder = shared.get_environment_variable("ALLSKY_MYFILES_DIR")
            allsky_module_folder = os.path.join(allsky_module_folder, "modules")   
            allsky_module_folder = Path(allsky_module_folder)
            
            opt_module_folder = os.path.join(self._module_repo_base_path, "modules")
            opt_module_info_folder_base = os.path.join(opt_module_folder, "info")
            opt_module_dependencies_folder_base = os.path.join(opt_module_folder, "dependencies")
            opt_module_folder = Path(opt_module_folder)

            for opt_module in opt_module_folder.iterdir():
                if opt_module.is_file():
                    allsky_module = allsky_module_folder / opt_module.name
                    if allsky_module.exists():
                        module_name = os.path.splitext(os.path.basename(opt_module))[0]
                        self._log(True, f"INFO: Removing {opt_module} and its info and dependencies folders")
                        if not args.dryrun:
                            os.remove(opt_module)
                            opt_module_info_folder = os.path.join(opt_module_info_folder_base, module_name)
                            opt_module_dependencies_folder = os.path.join(opt_module_dependencies_folder_base, module_name)
                            shared.remove_path(opt_module_info_folder)
                            shared.remove_path(opt_module_dependencies_folder)
                        did_something = True

            
            if os.path.isdir(opt_module_info_folder_base):        
                if not any(Path(opt_module_info_folder_base).iterdir()):
                    self._log(True, f"INFO: Removing empty directory {opt_module_info_folder_base}")
                    if not args.dryrun:
                        shared.remove_path(opt_module_info_folder_base)
                    did_something = True
            if os.path.isdir(opt_module_dependencies_folder_base):                   
                if not any(Path(opt_module_dependencies_folder_base).iterdir()):
                    self._log(True, f"INFO: Removing empty directory {opt_module_dependencies_folder_base}")                    
                    if not args.dryrun:
                        shared.remove_path(opt_module_dependencies_folder_base)
                    did_something = True

            py_cache_path = os.path.join(self._module_repo_base_path, "modules", "__pycache__")
            if os.path.isdir(py_cache_path):
                self._log(True, f"INFO: Removing python cache directory {py_cache_path}") 
                if not args.dryrun:
                    shared.remove_path(py_cache_path)
                did_something = True
                
            if opt_module_folder.exists() and opt_module_folder.is_dir():     
                for file in opt_module_folder.iterdir():
                    if file.is_file() and file.name.startswith("allsky_"):
                        target = allsky_module_folder / file.name
                        self._log(True, f"INFO: Moving non Allsky module {file.name} from {os.path.dirname(file)} to Allsky module folder")
                        if not args.dryrun:
                            shutil.move(str(file), str(target))
                        did_something = True                                    
        except Exception as e:  
            tb = e.__traceback__
            self._log(False, f"ERROR: Function cleanup_opt on line {tb.tb_lineno}: {e}")

        if not did_something:
            self._log(False, "INFO: No cleanup required")
        self._log(False, f"INFO: Completed cleanup of /opt/allsky/modules")
                    
    def run(self, args: argparse.Namespace) -> None:
        self._ensure_cloned_repo(self._module_repo, self._module_repo_path)
        self._branches = self._get_remote_branches(self._module_repo_path)
        
        if args.branch or args.setbranch:
            self._select_git_branch(args)
    
        self._read_modules()

        done = False
        while not done:
            w = Whiptail(title="Main Menu", backtitle=f"Allsky Module Manager. Using branch {self._branch}", height=20, width=40)
            menu_options = ['Install Modules', 'Uninstall Modules', 'Exit']
            if self._debug_mode:
                menu_options = ['Install Modules', 'Uninstall Modules', 'Switch Branch', 'Clean Opt', 'Exit']
                
            menu_option, return_code = w.menu('', menu_options)

            if return_code == 0:
                if menu_option == 'Exit':
                    done = True
                if menu_option == 'Clean Opt':
                    self.cleanup_opt()
                if menu_option == 'Switch Branch':
                    self._select_git_branch(args, True)
                    self._read_modules()
                if menu_option == 'Install Modules':
                    modules_to_install = self._display_install_dialog()
                if menu_option == 'Uninstall Modules':
                    if self._pre_checks():
                        self._read_modules()
                        modules_to_uninstall = self._display_uninstall_dialog()
                        if modules_to_uninstall is not None:
                            self._do_uninstall(modules_to_uninstall)
                        else:
                            w = Whiptail(title='Uninstall Modules', backtitle='AllSky Module Manager', height=8, width=50)
                            w.msgbox("There are no modules available for uninstall.")
                    else:
                        sys.exit(0)
            else:
                done = True

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Allsky extra module installer")
    parser.add_argument("--debug", action="store_true", help="Enable debug mode, shows more detailed errors")
    parser.add_argument("--branch", action="store_true", help="Allow the remote branch to be selected, default is Master")
    parser.add_argument("--setbranch", type=str, help="Specify the remote branch to use")
    parser.add_argument("--cleanupopt", action="store_true", help="Cleanup the legacy module folders")
    parser.add_argument("--auto", action="store_true", help="Auto upgrade modules, will migrate if required")    
    parser.add_argument("--dryrun", action="store_true", help="For auto mode do a dry run only, no changes will be made")    
    args = parser.parse_args()    
    
    module_installer = ALLSKYMODULEINSTALLER(args.debug)
    
    if args.auto:
        #try:
        module_installer.auto_upgrade_modules(args)
        #except Exception as e:
        #    tb = e.__traceback__
        #    print(f"ERROR: Function auto_upgrade_modules on line {tb.tb_lineno}: {e}")
        sys.exit(0)
                
    if args.cleanupopt:
        module_installer.cleanup_opt(args)
        sys.exit(0)

    #try:

    module_installer.run(args)
    #except Exception as e:
    #    print(e)
            