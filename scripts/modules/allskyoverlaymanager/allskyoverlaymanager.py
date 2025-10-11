#!/usr/bin/python3
"""
Allsky Overlay Manager

This script manages overlay configurations for the Allsky software. It supports:
- Migrating overlay assets and templates from an old Allsky installation
- Converting overlays to the new `myTemplates` format
- Updating settings with migrated overlays
- Running in either interactive mode (menu-driven with Whiptail) or automatic
  upgrade mode

Environment Variables:
    ALLSKY_HOME (str): Path to the Allsky installation directory.
    ALLSKY_OVERLAY (str): Path where overlay files are stored.
    ALLSKY_CC_FILE (str): Path to camera configuration JSON.

Usage:
    python3 overlay_manager.py --auto --oldpath /path/to/old/allsky --camera RPi
    python3 overlay_manager.py --debug
"""

import os
import sys
import argparse
import filecmp
import json
import subprocess
from pathlib import Path
from typing import Optional

# Ensure the script is running in the correct Python environment (the Allsky venv)
allsky_home = os.environ['ALLSKY_HOME']
here = os.path.dirname(os.path.abspath(__file__))
venv_dir = os.path.join(allsky_home, 'venv')
venv_python = os.path.join(venv_dir, 'bin', 'python3')
if sys.executable != venv_python:
    os.execv(venv_python, [venv_python] + sys.argv)

modules_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(modules_dir)

try:
    allsky_path = os.environ["ALLSKY_HOME"]
except KeyError:
    print("ERROR: ALLSKY_HOME environment variable is not set. Please set it to the Allsky installation directory.")
    sys.exit(1)
            
allsky_variables_path = Path(f"{allsky_path}/variables.json")
if not allsky_variables_path.is_file():
    print("ERROR: You must upgrade to the latest version of Allsky to manage overlays.")
    sys.exit(1)
            
with open(allsky_variables_path, "r") as file:
    json_data = json.load(file)

for key, value in json_data.items():
    os.environ[str(key)] = str(value)
            
from whiptail import Whiptail
import allsky_shared as shared

shared.setup_for_command_line()


class ALLSKYOVERLAYMANAGER:
    """
    Manage migration and conversion of overlay configurations in Allsky.

    This class encapsulates operations to migrate overlay assets/templates from an
    older Allsky installation, convert legacy overlay formats into `myTemplates`,
    and update Allsky settings accordingly. It supports both automatic and
    interactive (Whiptail) modes.

    Attributes:
        _args (argparse.Namespace): Parsed command-line arguments.
        _debug_mode (bool): If True, print debug logs instead of using shared.log.
        _overlay_folder (Path): Path to the overlay storage folder.
        _old_allsky_path (Path | None): Path to the old Allsky installation.
        _old_allsky_overlay_path (Path | None): Overlay directory in old installation.
        _allsky_version (str | None): Detected Allsky version.
        _overlay_info (dict | None): Overlay configuration info (if used later).
        _overlay_method (int | None): Overlay rendering method.
        _daytime_overlay (str | None): Current daytime overlay filename.
        _nighttime_overlay (str | None): Current nighttime overlay filename.
    """

    _whiptail_title_main_menu = "Select an option"
    _back_title = "Allsky Overlay Manager"
    _contact_allsky = "- Please contact Allsky support at https://github.com/AllskyTeam/allsky"
                
    def __init__(self, args: argparse.Namespace) -> None:
        """Initialize the overlay manager with parsed CLI arguments.

        Args:
            args: Command-line arguments parsed by :mod:`argparse`.
        """
        self._args = args
        self._debug_mode = args.debug
        self._overlay_folder = Path(shared.get_environment_variable("ALLSKY_OVERLAY"))
        self._old_allsky_path: Optional[Path] = None
        self._old_allsky_overlay_path: Optional[Path] = None
        self._allsky_version: Optional[str] = None
        self._overlay_info: Optional[dict] = None
        self._overlay_method: Optional[int] = None
        self._daytime_overlay: Optional[str] = None
        self._nighttime_overlay: Optional[str] = None

    def _log(self, debug_only: bool, message: str) -> None:
        """Log a message using :func:`shared.log` or print in debug mode.

        Args:
            debug_only: Only log when debug mode is set on command line.
            message: The log message to emit.
        """                    
        if debug_only and self._debug_mode or not debug_only:
            print(message)
    

    def setup_overlay_info(self) -> None:
        """Populate basic overlay settings from the Allsky environment.

        Sets internal attributes like the current Allsky version, overlay method,
        and the configured daytime/nighttime overlays.
        """
        self._allsky_version = shared.get_allsky_version()
        self._overlay_method = shared.get_setting("overlaymethod") or 1
        self._daytime_overlay = shared.get_setting("daytimeoverlay")
        self._nighttime_overlay = shared.get_setting("nighttimeoverlay")
                
    def _migrate_overlay_assets(self) -> bool:
        """Copy overlay assets (fonts, images, config files) from the old installation.

        Returns:
            True if all applicable assets were copied successfully; False otherwise.
        """
        if self._old_allsky_overlay_path and self._old_allsky_overlay_path.exists():
            folders = ["fonts", "images", "imagethumbnails"]
            files = ["config/userfields.json", "config/oe-config.json"]

            for name in folders:
                if not shared.copy_folder(str(self._old_allsky_overlay_path / name), str(self._overlay_folder / name)):
                    self._log(False, f"ERROR: Failed to copy overlay folder: {name} {self._contact_allsky}")
                    return False

            for rel in files:
                if not shared.copy_file(str(self._old_allsky_overlay_path / rel), str(self._overlay_folder / rel)):
                    self._log(False, f"ERROR: Failed to copy overlay file: {rel} {self._contact_allsky}")
                    return False
        else:
            self._log(False, f"WARNING: No overlay assets found in old Allsky installation at {self._old_allsky_overlay_path}")
            
        return True

    def _migrate_overlay_templates(self) -> bool:
        """Copy overlay templates from the old installation into the new location.

        Returns:
            True if the templates were copied successfully or did not need copying;
            False on failure.
        """
        old_templates_path = self._old_allsky_path / "config" / "overlay" / "myTemplates"  # type: ignore[operator]
        templates_path = self._overlay_folder / "myTemplates"
        
        if old_templates_path.exists():
            if not shared.copy_folder(str(old_templates_path), str(templates_path)):
                self._log(False, f"ERROR: Failed to copy overlay templates from {old_templates_path} to {templates_path} {self._contact_allsky}")
                return False
        
        return True

    def _create_overlay_templates(self) -> bool:        
        """Migrate legacy ``overlay.json`` into a template under ``myTemplates``.

        If an old-format overlay exists, copy or synthesize a template in the new
        format and update Allsky settings to reference it.

        Returns:
            True if migration succeeded or was not required; False on failure.
        """
        old_format_overlay_file = self._old_allsky_overlay_path / "config" / "overlay.json"  # type: ignore[operator]
        if Path(old_format_overlay_file).exists():
            self._log(False, "INFO: Old overlay system detected - Attempting to migrate overlay")
            old_camera_type = self._args.camera
            camera_type = shared.get_setting("cameratype")
            camera_model = shared.get_setting("cameramodel")
            cc_file = shared.get_environment_variable("ALLSKY_CC_FILE")
            sensor_width = shared._get_value_from_json_file(cc_file, "sensorWidth")
            sensor_height = shared._get_value_from_json_file(cc_file, "sensorHeight")
                                                
            old_repo_overlay_file = self._old_allsky_path / "config_repo" / "overlay" / "config" / f"overlay-{old_camera_type}.json"  # type: ignore[operator]
            overlay_changed = not filecmp.cmp(old_format_overlay_file, old_repo_overlay_file, shallow=False)
            self._log(True, f"INFO: Comparing {str(old_format_overlay_file)} with {str(old_repo_overlay_file)}")
            if overlay_changed:
                overlay_name = self._overlay_folder / "myTemplates" / "overlay1.json"
                if not shared.copy_file(old_format_overlay_file, str(overlay_name)):
                    self._log(False, f"ERROR: Failed to copy '{str(old_format_overlay_file)}' to '{str(overlay_name)}'  {self._contact_allsky}")
                    return False
                
                self._log(True, f"INFO: Overlay has been changed. Copied {str(old_format_overlay_file)} to {str(overlay_name)}")
                old_overlay_name = self._overlay_folder / "config" / "overlay.json"
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
                self._log(True, f"INFO: Added metadata to {str(overlay_name)}")
                with open(str(overlay_name), "w", encoding="utf-8") as file:
                    json.dump(json_data, file, indent=4, ensure_ascii=False)

            else:
                camera_model = shared.get_setting("cameramodel")                
                camera_model = camera_model.replace(" ", "_")
                full_overlay_name = f"overlay-{camera_type}_{camera_model}-{sensor_width}x{sensor_height}-both.json"
                short_overlay_name = f"overlay-{camera_type}.json"

                full_overlay_path = self._overlay_folder / "config" / full_overlay_name
                short_overlay_path = self._overlay_folder / "config" / short_overlay_name
                dest = self._overlay_folder / "myTemplates"                    
                
                if full_overlay_path.exists():
                    overlay_name = Path(full_overlay_name)
                    shared.copy_file(full_overlay_path, str(dest))
                else:
                    overlay_name = Path(short_overlay_name)                   
                    shared.copy_file(short_overlay_path, str(dest))

                self._log(True, f"INFO: Overlay not changed - Using default overlay {overlay_name.name}")

            self._log(True, f"INFO: Setting 'daytimeoverlay' to {overlay_name.name}, 'nighttimeoverlay' to {overlay_name.name}")
            new_settings = {
                "daytimeoverlay": overlay_name.name,
                "nighttimeoverlay": overlay_name.name
            }                        
            shared.update_settings(new_settings)
        else:
            if self._old_allsky_path and self._old_allsky_path.exists():
                old_settings_file = self._old_allsky_path / "config" / "settings.json"
                if old_settings_file.exists():
                    old_settings = shared.load_json_file(old_settings_file)
                    day_overlay_name = old_settings.get("daytimeoverlay", None)
                    night_overlay_name = old_settings.get("nighttimeoverlay", None)
                    if day_overlay_name is not None and night_overlay_name is not None:
                        new_settings = {
                            "daytimeoverlay": day_overlay_name,
                            "nighttimeoverlay": night_overlay_name
                        }                        
                        shared.update_settings(new_settings)
                        self._log(False, f"INFO: Setting 'daytimeoverlay' to {day_overlay_name}, 'nighttimeoverlay' to {night_overlay_name}")
                    else:
                        self._log(False, f"ERROR: Could not locate overlays in old settings file")                        
                else:
                    self._log(False, f"INFO: Could not find old settings file {old_settings_file}") 
            self._log(False, "INFO: Using new overlay system so ignoring any migrations")
            
        return True
    
    def _convert_overlay(self, overlay_name: str) -> None:
        """Convert a single overlay referenced by a setting name.

        Args:
            overlay_name: Name of the overlay setting, e.g. ``"daytimeoverlay"``.
        """
        overlay_name = shared.get_setting(overlay_name)
        template_path = self._overlay_folder / "myTemplates" / overlay_name
        
        if template_path.exists():
            with open(template_path, encoding='utf-8') as file:
                json_data = json.load(file)
                # Placeholder: add conversion logic as needed.
                _ = json_data
                
    def _convert_overlays(self) -> None:
        """Convert both daytime and nighttime overlays (if present)."""
        for overlay_name in ["daytimeoverlay", "nighttimeoverlay"]:        
            self._convert_overlay(overlay_name)

    def install(self) -> None:
        """Install or select an overlay template based on detected camera settings.

        Determines the most specific overlay filename (including camera model and
        sensor resolution when available) falling back to a generic camera-type
        overlay, then updates the Allsky settings accordingly.
        """
        self._log(False, "INFO: Starting overlay install")
        camera_type = shared.get_setting("cameratype")
        camera_model = shared.get_setting("cameramodel")
        camera_model = camera_model.replace(" ", "_")
        cc_file = shared.get_environment_variable("ALLSKY_CC_FILE")
        sensor_width = shared._get_value_from_json_file(cc_file, "sensorWidth")
        sensor_height = shared._get_value_from_json_file(cc_file, "sensorHeight")

        self._log(True, f"INFO: Camera Info. Camera {camera_type}, Model {camera_model}")
        self._log(True, f"INFO: Sensor Info. Width {sensor_width}, Height {sensor_height}")
        self._log(True, f"INFO: Using cc file {cc_file}")

        overlay_name = "overlay-RPi.json"
        
        overlay_config = self._overlay_folder / "config"
        full_filename = f"overlay-{camera_type}_{camera_model}-{sensor_width}x{sensor_height}-both.json"
        full_file_path = overlay_config / full_filename

        short_filename = f"overlay-{camera_type}.json"
        short_file_path = overlay_config / short_filename
        
        self._log(True, f"INFO: Full Filename  {full_filename}")
        self._log(True, f"INFO: Short Filename {short_filename}")
                
        if full_file_path.exists():
            overlay_name = full_filename
            self._log(True, f"INFO: Found {str(full_file_path)} so using this as the overlay")
        elif short_file_path.exists():
            overlay_name = short_filename
            self._log(True, f"INFO: Found {str(short_filename)} so using this as the overlay")
            
        new_settings = {
            "daytimeoverlay": overlay_name,
            "nighttimeoverlay": overlay_name
        }                        
        shared.update_settings(new_settings)
        self._log(False, f"INFO: Set daytimeoverlay and nighttimeoverlay to {overlay_name}")

        self._log(False, "INFO: Completed overlay install")
                    
        
        
    def run_auto(self) -> None:
        """Run automatic upgrade: migrate assets/templates and convert overlays.

        Uses the provided ``--oldpath`` and ``--camera`` arguments to locate the
        old Allsky installation, then migrates assets and templates, converts
        overlays, and updates settings without interactive prompts.
        """                    
        self._old_allsky_path = Path(self._args.oldpath)
        self._old_allsky_overlay_path = self._old_allsky_path / "config" / "overlay"        
        self.setup_overlay_info()
        if self._migrate_overlay_assets():
            if self._migrate_overlay_templates():
                if self._create_overlay_templates():
                    self._convert_overlays()
    
    def run(self) -> None:
        """Run the interactive Whiptail menu-based workflow."""
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
                ("2", "Upgrade Overlays"),
                ("3", "Exit"),
            ]

            choice, code = w.menu("Select an option:", options)

            if code != 0 or choice == "3":
                break
            
            if choice == "1":
                self._show_overlay_status()
    
            if choice == "2":                
                previous_camera = shared.select_from_list([( "RPi", "Pi Camera" ), ( "ZWO", "ZWO Camera" )], "Select Previous Camera", "Select Camera", "Allsky Overlay manager")
                if previous_camera is not None:
                    folder = shared.select_folder("/home/pi")
                    if folder is not None:
                        os.system("clear")
                        self._args.oldpath = folder
                        self._args.camera = previous_camera
                        self.run_auto()
                        print("\n\nPress Enter to continue...")
                        sys.stdin.read(1)                 
            
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Allsky extra module installer")
    parser.add_argument("--debug", action="store_true", help="Enable debug mode, shows more detailed errors")  
    parser.add_argument("--auto", action="store_true", help="Enable upgrade mode, requires --oldpath to be set")  
    parser.add_argument("--oldpath", type=str, help="Path to old Allsky installation for upgrade")
    parser.add_argument("--camera", type=str, help="Camera type")
    parser.add_argument("--install", action="store_true", help="Initial Install of overlay system")
    args = parser.parse_args()    

    overlay_manager = ALLSKYOVERLAYMANAGER(args)

    if args.install:
        overlay_manager.install()
        sys.exit(1)
                
    if args.auto:
        overlay_manager.run_auto()
        sys.exit(1)

    overlay_manager.run()
