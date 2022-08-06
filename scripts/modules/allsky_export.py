'''
allsky_export.py

Part of allsky postprocess.py modules.
https://github.com/thomasjacquin/allsky

This module will export all of the AllSky variables to a json file in the 
${ALLSKY_TMP}/tmp folder

Expected parameters:
None
'''
import allsky_shared as s
import os 
import json

metaData = {
    "name": "AllSKY Export",
    "description": "Exports AllSKY data to json",
    "arguments":{
        "filelocation": "${ALLSKY_TMP}/allskydata.json"
    },
    "argumentdetails": {
        "filelocation" : {
            "required": "true",
            "description": "File Location",
            "help": "The location to save the json date"
        }
    },
    "enabled": "false"            
}

def getEnvironmentVariable(name, fatal=False,error=''):
    result = None

    try:
        result = os.environ[name]
    except KeyError:
        if fatal:
            print("Sorry, environment variable ( {0} ) not found.".format(name))
            exit(98)

    return result   

def export(params):
    jsonData = {}
    s.env = {}

    jsonFile = getEnvironmentVariable("ALLSKY_TMP", True, "Error - ALLSKY_TMP environment variable missing")
    jsonFile = os.path.join(jsonFile,"allskydata.json")

    for var in os.environ:
        if var.startswith("AS_") or var.startswith("ALLSKY_"):
            jsonData[var] = getEnvironmentVariable(var)
            s.env[var] = jsonData[var]

    camera = getEnvironmentVariable("CAMERA")
    if camera is not None:
        jsonData["CAMERA"] = camera
        s.env["CAMERA"] = camera

    dayornight = getEnvironmentVariable("DAY_OR_NIGHT")
    if dayornight is not None:
        jsonData["DAY_OR_NIGHT"] = dayornight
        s.env["DAY_OR_NIGHT"] = dayornight

    with open(jsonFile, "w") as outfile:
            json.dump(jsonData, outfile)