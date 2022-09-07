'''
allsky_export.py

Part of allsky postprocess.py modules.
https://github.com/thomasjacquin/allsky

This module will save the image at any point during the module workflow

Expected parameters:
None
'''
import allsky_shared as s
import os 
import json
import cv2

metaData = {
    "name": "Saves an intermediate image",
    "description": "Saves an intermediate image",
    "events": [
        "day",
        "night"
    ],
    "arguments":{
        "imagefolder": ""
    },
    "argumentdetails": {
        "imagefolder" : {
            "required": "true",
            "description": "Image folder",
            "help": "The folder to save the image in. The folder will be created if it does not exist"
        }
    }      
}

def writeImage(image, path):
    result = True
    try:
        s.checkAndCreatePath(path)
        cv2.imwrite(path, image, [int(cv2.IMWRITE_PNG_COMPRESSION),9])
    except:
        s.log(0, "ERROR: Failed to save image {0}".format(path), exitCode=1)
        result = False
    
    return result

def saveintermediateimage(params):
    path = params["imagefolder"]

    path = s.convertPath(path)
    if path is not None:
        writeImage(s.image, path)
        result = "Image {0} Saved".format(path)
        s.log(1, "INFO: Image saved to {0}".format(path))
    else:
        s.log(1, "ERROR: Invalid path {0}".format(params["imagefolder"]))
        result = "Image save failed"

    return result