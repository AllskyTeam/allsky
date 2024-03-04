""" allsky_script.py

Part of allsky postprocess.py modules.
https://github.com/AllskyTeam/allsky

This module will run a custom script
"""
import allsky_shared as s
import os 
import subprocess

metaData = {
    "name": "AllSKY Script",
    "description": "Runs a custom script",
    "events": [
        "day",
        "night",
        "endofnight",
        "daynight",
        "nightday",
        "periodic"
    ],
    "arguments":{
        "scriptlocation": ""
    },
    "argumentdetails": {
        "scriptlocation" : {
            "required": "true",
            "description": "File Location",
            "help": "The location of the script to run"
        }
    }          
}

def script(params, event):
    script = params["scriptlocation"]

    if os.path.isfile(script):
        if os.access(script, os.X_OK):
            res = subprocess.check_output(script) 
            result = f"Script {script} executed."
        else:
            result = f"Script {script} is NOT executeable."
            s.log(0, f"ERROR: {result}")
    else:
        result = f"Script {script} not found."
        s.log(0, f"ERROR: {result}")

    return result
