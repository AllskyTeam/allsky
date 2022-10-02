""" allsky_export.py

Part of allsky postprocess.py modules.
https://github.com/thomasjacquin/allsky

This module will export all of the AllSky variables to a json file. 
The default json path is ${ALLSKY_TMP}/allskydata.json but this can be changed in the module settings
"""
import allsky_shared as s
import os 
import json
import re

metaData = {
    "name": "AllSKY Export",
    "description": "Exports AllSKY data to json",
    "module": "allsky_export",       
    "events": [
        "day",
        "night"
    ],
    "arguments":{
        "filelocation": "${ALLSKY_TMP}/allskydata.json",
        "extradata": "CAMERA_TYPE,DAY_OR_NIGHT,CURRENT_IMAGE,FULL_FILENAME,ALLSKY_VERSION"
    },
    "argumentdetails": {
        "filelocation" : {
            "required": "true",
            "description": "File Location",
            "help": "The location to save the json date"
        },
        "extradata" : {
            "required": "false",
            "description": "Extra data to export",
            "help": "Comma seperated list of additional variables to export to json"
        }        
    }          
}

def getSavePath(savePath):
    """ Returns path to save the generated json file
    This function will replace any placeholder sin the filepath and then
    check that the file is writeable. If the file is not writeable then
    Non will be returned

    Args:
        savePath (string): The file path, may contain ${} placeholders

    Returns:
        String/None: The file path to save or None 
    """
    regex =  r"\$\{.*?\}"
    matches = re.finditer(regex, savePath, re.MULTILINE | re.IGNORECASE)

    for matchNum, match in enumerate(matches, start=1):
        variable = match.group()
        envVar = variable.replace("${", "")
        envVar = envVar.replace("}", "")

        envVarValue = s.getEnvironmentVariable(envVar)
        if envVarValue is not None:
            savePath = savePath.replace(variable, envVarValue)
        else:
            s.log(0, "ERROR: Cannot locate environment variable {0} Allsky data will NOT be exported".format(envVar))
            savePath = None
            break

    try:
        with open(savePath, "w") as outfile:
            pass
    except Exception:
        okToSave = False
        s.log(0, "ERROR: path is not writeable {0} Allsky data will NOT be exported".format(savePath))
        savePath = None

    return savePath 

def export(params, event):
    """ Generates the json file and saves it 

    Args:
        params (array): Array of params, see meta data for details
    """    
    jsonData = {}
    s.env = {}

    savePath = params["filelocation"]
    savePath = getSavePath(savePath)

    if savePath is not None:
        for var in os.environ:
            if var.startswith("AS_") or var.startswith("ALLSKY_"):
                jsonData[var] = s.getEnvironmentVariable(var)
                s.env[var] = jsonData[var]

        extraEntries = params["extradata"].split(",")
        for envVar in extraEntries:
            envVar = envVar.lstrip()
            envVar = envVar.rstrip()
            envVarValue = s.getEnvironmentVariable(envVar)
            if envVar:
                if envVarValue is not None:
                    jsonData[envVar] = envVarValue
                    s.env[envVar] = envVarValue
                else:
                    s.log(0, "ERROR: Cannot locate environment variable {0} specified in the extradata".format(envVar))
            else:
                s.log(0, "ERROR: Empty environment variable specified in the extradata field. Check commas!")

        with open(savePath, "w") as outfile:
            json.dump(jsonData, outfile)

        s.log(1, "INFO: Allsky data exported to {0}".format(savePath))

        return "Allsky data exported to {0}".format(savePath)