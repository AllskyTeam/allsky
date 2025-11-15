#!/usr/bin/python3

import os
import sys
import argparse

# Assume whoever calls us already sourced in variables.*
# Ensure the script is running in the correct Python environment.
here = os.path.dirname(os.path.abspath(__file__))
try:
    venv_dir = os.environ['ALLSKY_PYTHON_VENV']
except KeyError:
    print("ERROR: This program needs to be run in an Allsky environment with variables.sh or variables.json sourced in.")
    sys.exit(1)
venv_python = os.path.join(venv_dir, 'bin', 'python3')
if sys.executable != venv_python:
    os.execv(venv_python, [venv_python] + sys.argv)

import shutil
import json
import tempfile
from pathlib import Path
from git import Repo, InvalidGitRepositoryError, GitCommandError
from allskymodule import ALLSKYMODULE
from whiptail import Whiptail

modules_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(modules_dir)

try:
    allsky_path = os.environ["ALLSKY_HOME"]
except KeyError:
    print("ERROR: Allsky appears not to be installed (the ALLSKY_HOME environment variable is not set).")
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
    
    _module_repo_base_path = tempfile.gettempdir()
    _module_repo_path = os.path.join(_module_repo_base_path, 'allsky-modules')

    _back_title= "Allsky Module Manager"
    _welcome_message = "The Allsky modules are a collection of extensions developed both by the Allsky team and the wider community. They allow you to expand the functionality of your Allsky system beyond basic image capture.\n\
Modules can:\n\n\
 * Perform additional image processing to enhance captured frames.\n\
 * Integrate with external hardware such as sensors or I/O devices.\n\
 * Export data from Allsky to services such as mqtt, redis, etc.\n\
 * Add extra information to overlays using external services.\n\n\
The official Allsky Documentation provides detailed information on each module, including setup instructions and usage examples, so you can easily discover which modules suit your installation and how to get the most from them.\n\n\
Would you like to review and install any available modules now?\
"
                
    def __init__(self, debug_mode): 
        self._debug_mode = debug_mode
        self._allsky_path = shared.get_environment_variable("ALLSKY_HOME")
        self._branch = shared.get_environment_variable("ALLSKY_GITHUB_MAIN_BRANCH")     # master branch is default
        self._master_branch = self._branch
        self._main_backtitle1 = f"Allsky Module Manager."
        self._main_backtitle = self._main_backtitle1
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
            raise ConfigError("Allsky does not seem to be installed. Please install it before installing any modules.")

        if os.geteuid() == 0:
            raise ConfigError("DO NOT run this as root. Run the installer as the same user as Allsky was installed.")

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

    def _select_git_branch(self, args: argparse.Namespace, force: bool = False) -> None:
        if args.branch or force:
            wt = Whiptail(title="Select Branch", backtitle=f"Allsky Module Installer.")
            menu_items = [(branch, "") for branch in self._branches]

            branch, exit_code = wt.menu("Choose a branch:", menu_items)
            if exit_code == 0:
                self._branch = branch

        if args.setbranch and not force:
            self._log(True, f"INFO: Setting branch to {args.setbranch}")
            self._branch = args.setbranch

        # Only show branch if not the master branch.
        if self._branch != self._master_branch:
            self._main_backtitle = self._main_backtitle1 + f" Using '{self._branch}' branch."

        repo = Repo(self._module_repo_path)

        # checkout the branch (force to ensure working tree is updated)
        repo.git.checkout(self._branch, force=True)

        # try to pull latest changes
        try:
            if "origin" in repo.remotes:
                origin = repo.remotes.origin
                self._log(True, f"INFO: Pulling latest changes for branch {self._branch} from origin...")
                origin.fetch(prune=True)
                origin.pull(self._branch)
                self._log(True, f"INFO: Branch {self._branch} is now up-to-date.")
            else:
                self._log(True, "WARNING: No remote named 'origin', skipping pull.")
        except GitCommandError as e:
            self._log(True, f"ERROR: Git pull failed: {e}")

    def _get_checkedout_branch(self) -> str:
        branch = "Unknown"
        
        try:
            repo = Repo(self._module_repo_path)
            branch = repo.active_branch
        except:
            pass
        
        return branch
                
    def _read_modules(self):
        self._module_list = []
        dirs = os.listdir(self._module_repo_path)
        num_installed_modules = 0
        for dir in dirs:
            if dir.startswith('allsky_') and not os.path.isfile(dir):
                mod = ALLSKYMODULE(dir, self._debug_mode, self._module_repo_path)
                self._module_list.append(mod)
                if mod.installed:
                    num_installed_modules += 1
        
        self._module_list = sorted(self._module_list, key=lambda p: p.name)
        return num_installed_modules

    def _find_module(self, module_name: str):
        found_module = None
        for module in self._module_list:
            if module.name == module_name:
                found_module = module
                break

        return found_module
    
    def _display_install_dialog(self):
        import shutil, textwrap

        def _wrap_items(triples, box_width=70, min_desc_width=30, pad=4):
            """
            triples: [(tag, description, state_str), ...]
            Returns same shape but with descriptions wrapped with '\n' so whiptail won't overflow.
            """
            max_length = 0
            max_tag = max((len(tag) for tag, _, _ in triples), default=0)
            # whiptail draws "[ ] " plus some padding next to the tag; reserve ~6 chars
            tag_col = max_tag + 6
            desc_width = max(min_desc_width, box_width - tag_col - pad)

            wrapped = []
            for tag, desc, state in triples:
                d = (desc or "").replace("\t", " ")
                d = textwrap.fill(d, width=desc_width, break_long_words=True, break_on_hyphens=False)
                wrapped.append((tag, d, state))
                if len(tag) > max_length:
                    max_length = len(tag)

            return wrapped, max_length

        module_triples = []
        module_xref = []        
        modules_to_install = []

        # Build list with status + descriptions
        for module in self._module_list:
            try:
                if not module.deprecated:
                    if module.installed and getattr(module, "is_new_version_available", None) and module.is_new_version_available():
                        status = " (Update Available) "
                    elif module.installed:
                        status = " (Installed) "
                    else:
                        status = ""
                    # Whiptail expects triples: (tag, description, "ON"/"OFF")
                    description = f"{status}{module.description}"
                    module_triples.append((description, "", "OFF"))
                    module_xref.append((module, description))
            except (ModuleError, NoVersionError):
                # Skip modules that can't report status cleanly
                continue
            except Exception as e:
                tb = e.__traceback__
                print(f"Error {getattr(module, 'name', '?')} on line {tb.tb_lineno}: {e}")
                sys.exit(1)

        if not module_triples:
            return modules_to_install

        # Respect terminal width; keep within screen to avoid overflow
        cols, _rows = shutil.get_terminal_size(fallback=(120, 30))
        desired_width = min(180, max(80, cols - 10))  # clamp to terminal; >= 80 for readability

        # Wrap descriptions to fit the checklist column
        module_triples, max_length = _wrap_items(module_triples, box_width=desired_width)

        if max_length < desired_width:
            desired_width = max_length + 20  # + tag column + padding
            
        # Show dialog
        w = Whiptail(
            title=f"Select Modules",
            backtitle=f"{self._main_backtitle}",
            width=desired_width,
        )

        # python-whiptail / whiptail-dialogs both support triples and return (selected, rc)
        selected, rc = w.checklist(
            "Select the Modules To Install",
            module_triples,
            prefix=" "  # avoid leading "- " before descriptions
        )

        if rc != 0 or not selected:
            return []

        modules_to_install = []
        for description in selected:
            for module, desc in module_xref:
                if desc == description:
                    modules_to_install.append(module.name)
                    break

        # Run installs
        for module_name in modules_to_install:
            module = self._find_module(module_name)
            try:
                module.install_or_update_module(True)
            except Exception as e:
                print(e)

        if modules_to_install:
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
        self._log(False, f"Starting cleanup of {self._module_repo_base_path}/modules")
        self._log(False, f"=======================================\n")
        
        try:
            allsky_module_folder = shared.get_environment_variable("ALLSKY_MYFILES_DIR")
            allsky_module_folder = os.path.join(allsky_module_folder, "modules")   
            allsky_module_folder = Path(allsky_module_folder)
            
            opt_module_folder = os.path.join(self._module_repo_base_path, "modules")
            opt_module_info_folder_base = os.path.join(opt_module_folder, "info")
            opt_module_dependencies_folder_base = os.path.join(opt_module_folder, "dependencies")
            opt_module_folder = Path(opt_module_folder)

            if os.path.isdir(opt_module_folder):
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

    def welcome_message(self):

        w = Whiptail(title=f"Module Manager Welcome", backtitle=f"{self._main_backtitle}", height=25, width=80)
        result = w.yesno(self._welcome_message)        
        return result
                            
    def run(self, args: argparse.Namespace) -> None:
        
        self._ensure_cloned_repo(self._module_repo, self._module_repo_path)
        self._branches = self._get_remote_branches(self._module_repo_path)
        
        if args.branch or args.setbranch:
            self._select_git_branch(args)
    
        self._read_modules()
                    
        go_for_it = False
        if args.welcome:
            if self.welcome_message():
                self._display_install_dialog()
                sys.exit(0)
            else:
                ret = int(os.environ["ALLSKY_EXIT_PARTIAL_OK"])
                sys.exit(ret)  # indicates no error but user said "no"
        else:
            go_for_it = True
            
        if go_for_it:
            done = False
            while not done:
                w = Whiptail(title="Main Menu", backtitle=f"{self._main_backtitle}", height=20, width=40)
                menu_options = ['Install Modules']
                # Only add Uninstall if there's at least 1 installed module.
                if self._read_modules() > 0:    # returns number of installed modules
                    menu_options += ['Uninstall Modules']
                if self._debug_mode:
                    menu_options += ['Switch Branch', 'Clean Opt']
                menu_options += ['Exit']
                    
                menu_option, return_code = w.menu('', menu_options)
                if return_code == 0:
                    if menu_option == 'Exit':
                        done = True
                    elif menu_option == 'Clean Opt':
                        self.cleanup_opt()
                    elif menu_option == 'Switch Branch':
                        self._select_git_branch(args, True)
                        self._read_modules()
                    elif menu_option == 'Install Modules':
                        modules_to_install = self._display_install_dialog()
                    elif menu_option == 'Uninstall Modules':
                        if self._pre_checks():
                            self._read_modules()
# TODO: FIX: _display_uninstall_dialog() does not exist.
                            try:
                                modules_to_uninstall = self._display_uninstall_dialog()
                            except:
                                modules_to_uninstall = None
                            if modules_to_uninstall is not None:
# TODO: FIX: _do_uninstall_dialog() does not exist.
                                self._do_uninstall(modules_to_uninstall)
                            else:
                                w = Whiptail(title='Uninstall Modules', backtitle='Allsky Module Manager', height=8, width=50)
                                w.msgbox("There are no modules available to uninstall.")
                        else:
                            sys.exit(0)
                else:
                    done = True

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Allsky extra module installer")
    parser.add_argument("--debug", action="store_true", help="Enable debug mode, shows more detailed errors")
    parser.add_argument("--branch", action="store_true", help="Allow the remote branch to be selected, default is 'master'")
    parser.add_argument("--setbranch", type=str, help="Specify the remote branch to use")
    parser.add_argument("--cleanupopt", action="store_true", help="Cleanup the legacy module folders")
    parser.add_argument("--auto", action="store_true", help="Auto upgrade modules, will migrate if required")    
    parser.add_argument("--dryrun", action="store_true", help="For auto mode do a dry run only, no changes will be made")    
    parser.add_argument("--welcome", action="store_true", help="Show the welcome message")    
    args = parser.parse_args()    
    
    module_installer = ALLSKYMODULEINSTALLER(args.debug)
    
    if args.auto:
        try:
            module_installer.auto_upgrade_modules(args)
        except Exception as e:
            tb = e.__traceback__
            print(f"ERROR: Function auto_upgrade_modules on line {tb.tb_lineno}: {e}")
        sys.exit(0)
                
    if args.cleanupopt:
        module_installer.cleanup_opt(args)
        sys.exit(0)

    try:
        module_installer.run(args)
    except Exception as e:
        print(e)
