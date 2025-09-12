#!/usr/bin/python3

import os
import sys
import argparse
import filecmp

# Ensure the script is running in the correct Python environment
allsky_home = os.environ['ALLSKY_HOME']
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
    print("ERROR: You must upgrade to the latest version of Allsky to manage overlays.")
    sys.exit(1)
            
with open(allsky_variables_path, "r") as file:
    json_data = json.load(file)

for key, value in json_data.items():
    os.environ[str(key)] = str(value)
            
import allsky_shared as shared

shared.setup_for_command_line()

        
class ALLSKYOVERLAYMANAGER:
    
    _whiptail_title_main_menu = "Select an option"
    _back_title = "Allsky Overlay Manager"
                
    def __init__(self, args):
        self._args = args
        self._debug_mode = args.debug
        self._overlay_folder = Path(shared.get_environment_variable("ALLSKY_OVERLAY"))
        self._old_allsky_path = None
        self._old_allsky_overlay_path = None
        self._allsky_version = None
        self._overlay_info = None
        self._overlay_method  = None
        self._daytime_overlay = None
        self._nighttime_overlay = None

    def _log(self, log_level, message):

        if self._debug_mode:
            print(message)
        else:
            shared.log(log_level, message) 

    def setup_overlay_info(self):
        self._allsky_version = shared.get_allsky_version()
        
        self._overlay_method = shared.get_setting("overlaymethod")
        if self._overlay_method == None:
            self._overlay_method = 1  # Default to module if setting not present
        
        self._daytime_overlay = shared.get_setting("daytimeoverlay")
        self._nighttime_overlay = shared.get_setting("nighttimeoverlay")
                
    def _migrate_overlay_assets(self) -> bool:

        if self._old_allsky_overlay_path.exists():
            folders = ["fonts", "images", "imagethumbnails"]
            files = ["config/userfields.json", "config/oe-config.json"]

            for name in folders:
                if not shared.copy_folder(str(self._old_allsky_overlay_path / name), str(self._overlay_folder / name)):
                    self._log(1, f"ERROR: Failed to copy overlay folder: {name}")
                    return False

            for rel in files:
                if not shared.copy_file(str(self._old_allsky_overlay_path / rel), str(self._overlay_folder / rel)):
                    self._log(1, f"ERROR: Failed to copy overlay file: {rel}")
                    return False
        else:
            self._log(1, f"WARNING: No overlay assets found in old Allsky installation at {self._old_allsky_overlay_path}")
            
        return True

    def _migrate_overlay_templates(self) -> bool:
        old_templates_path = self._old_allsky_path / "config" / "overlay" / "myTemplates"
        templates_path = self._overlay_folder / "myTemplates"
        
        if old_templates_path.exists():
            if not shared.copy_folder(str(old_templates_path), str(templates_path)):
                self._log(1, f"ERROR: Failed to copy overlay templates from {old_templates_path} to {templates_path}")
                return False
        
        return True

    def _create_overlay_templates(self) -> bool:        

        old_format_overlay_file = self._old_allsky_overlay_path / "config" / "overlay.json"
        if Path(old_format_overlay_file).exists():
            self._log(1, "INFO: Old overlay system detected - Attempting to migrate overlay")
            old_camera_type = self._args.oldcamera
            camera_type = shared.get_setting("cameratype")
            camera_model = shared.get_setting("cameramodel")
            cc_file = shared.get_environment_variable("ALLSKY_CC_FILE")
            sensor_width = shared._get_value_from_json_file(cc_file, "sensorWidth")
            sensor_height = shared._get_value_from_json_file(cc_file, "sensorHeight")
                                                
            old_repo_overlay_file = self._old_allsky_path / "config_repo" / "overlay" / "config" / f"overlay-{old_camera_type}.json"
            overlay_changed = not filecmp.cmp(old_format_overlay_file, old_repo_overlay_file, shallow=False)
            self._log(1, f"INFO: Comparing {str(old_format_overlay_file)} with {str(old_repo_overlay_file)}")
            if overlay_changed:
                overlay_name = self._overlay_folder /  "myTemplates" / "overlay1.json"
                if not shared.copy_file(old_format_overlay_file, str(overlay_name)):
                    self._log(1, f"ERROR: Failed to copy '{str(old_format_overlay_file)}' to '{str(overlay_name)}' - Please contact Allsky support")
                    return False
                
                self._log(1, f"INFO: Overlay has been changed. Copied {str(old_format_overlay_file)} to {str(overlay_name)}")
                old_overlay_name = self._overlay_folder /  "config" / "overlay.json"
                shared.remove_path(old_overlay_name)
                
                with open(str(overlay_name), encoding='utf-8') as file:
                    json_data = json.load(file)
                        
                json_data.update({
                    "metadata": {
                        "camerabrand": camera_type,
                        "cameramodel": camera_model,
                        "cameraresolutionwidth": sensor_width,
                        "cameraresolutionheight": sensor_height,
                        "tod": "both",
                        "camerabrand": camera_type,
                        "name": f"{camera_type} {camera_model}"
                    }
                })
                self._log(1, f"INFO: Added metadata to {str(overlay_name)}")
                with open(str(overlay_name), "w", encoding="utf-8") as file:
                    json.dump(json_data, file, indent=4, ensure_ascii=False)

            else:
                camera_model = camera_model.replace(" ", "_")
                full_overlay_name = f"overlay-{camera_type}_{camera_model}-{sensor_width}x{sensor_height}-both.json"
                short_overlay_name = f"overlay-{camera_type}.json"

                full_overlay_path = self._overlay_folder / "config" / full_overlay_name
                short_overlay_path = self._overlay_folder / "config" / short_overlay_name
                dest = self._overlay_folder / "myTemplates"                    
                
                if full_overlay_path.exists():
                    overlay_name = full_overlay_name
                    shared.copy_file(full_overlay_path, str(dest))
                else:
                    overlay_name = short_overlay_name                        
                    shared.copy_file(short_overlay_path, str(dest))

                self._log(1, f"INFO: Using default overlay {overlay_name.nam}")

            self._log(1, f"INFO: Setting 'daytimeoverlay' to {overlay_name.name}, 'nighttimeoverlay' to {overlay_name.name}")
            new_settings = {
                "daytimeoverlay": overlay_name.name,
                "nighttimeoverlay": overlay_name.name
            }                        
            shared.update_settings(new_settings)
            
        else:
            self._log(1, "INFO: Using new overlay system so ignoring any migrations")
            
        return True
    
    def _convert_overlay(self, overlay_name):
        overlay_name = shared.get_setting(overlay_name)
        template_path = self._overlay_folder / "myTemplates" / overlay_name
        
        if template_path.exists():
            with open(template_path, encoding='utf-8') as file:
                json_data = json.load(file)
                
    def _convert_overlays(self):
        for overlay_name in ["daytimeoverlay", "nighttimeoverlay"]:        
            self._convert_overlay(overlay_name)
    
    def upgrade(self):
        self._old_allsky_path = Path(self._args.oldpath)
        self._old_allsky_overlay_path = self._old_allsky_path / "config" / "overlay"
        
        self._migrate_overlay_assets()
        self._migrate_overlay_templates()
        self._create_overlay_templates() 
        self._convert_overlays()
    
    def run_auto(self):
        self.setup_overlay_info()
        self.upgrade()
    
    def run(self):
        self.setup_overlay_info()
        
        w = Whiptail(
            title=self._whiptail_title_main_menu,
            backtitle=self._back_title,
            height=18,
            width=50
        )

        while True:
            options = [
                ("1", "Show Overlay Information"),
                ("2", "Exit"),
            ]

            choice, code = w.menu("Select an option:", options)

            if code != 0 or choice == "2":
                break
            
            if choice == "2":
                self._show_mysql_status()
    
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Allsky extra module installer")
    parser.add_argument("--debug", action="store_true", help="Enable debug mode, shows more detailed errors")  
    parser.add_argument("--auto", action="store_true", help="Enable upgrade mode, requires --oldpath to be set")  
    parser.add_argument("--oldpath", type=str, help="Path to old Allsky installation for upgrade")
    parser.add_argument("--oldcamera", type=str, help="Old camera type")
    args = parser.parse_args()    

    overlay_manager = ALLSKYOVERLAYMANAGER(args)

    #if args.auto:        
    #    if args.upgrade and not args.oldpath:
    #        parser.error("--auto requires --oldpath to be specified")
    #        sys.exit(1)
        
    if args.auto:
        overlay_manager.run_auto()
        sys.exit(1)
                

    overlay_manager.run()        