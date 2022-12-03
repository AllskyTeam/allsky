""" allsky_script.py

Part of allsky postprocess.py modules.
https://github.com/thomasjacquin/allsky

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
        "nightday"
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
            result = "Script {0} Executed.".format(script)
        else:
            s.log(0,"ERROR: Script {0} is not executable".format(script))
            result = "Script {0} Is NOT Executeable.".format(script)
    else:
        s.log(0,"ERROR: cannot access {0}".format(script))
        result = "Script {0} Not FOund.".format(script)

    return result