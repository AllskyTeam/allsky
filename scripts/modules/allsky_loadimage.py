'''
allsky_export.py

Part of allsky postprocess.py modules.
https://github.com/thomasjacquin/allsky

This moduile will load the last captured image and pass between modules

Expected parameters:
None
'''
import allsky_shared as s
import os 
import json
import cv2

metaData = {
    "name": "Loads the latest image",
    "description": "Loads the last captured image"      
}

def loadimage(params):
    result = False
        
    try:
        s.image = cv2.imread(s.CURRENTIMAGEPATH)
    #    if s.image == None:
    #        result = s.ABORT
    except Exception as e:
        result = s.ABORT

    if result == s.ABORT:
        s.log(0,"ERROR: Cannot load {0}...".format(s.CURRENTIMAGEPATH), exitCode=1)

    return result        