'''
allsky_loadimage.py

Part of allsky postprocess.py modules.
https://github.com/AllskyTeam/allsky

This module will load the last captured image into the shared module
allowing it to be passed between modules

'''
import allsky_shared as s
import cv2

metaData = {
    "name": "Loads the latest image",
    "description": "Loads the last captured image",
    "module": "allsky_loadimage",
    "ignorewatchdog": "True", 
    "events": [
        "day",
        "night"
    ]   
}

def loadimage(params, event):
    result = "Image {0} Loaded".format(s.CURRENTIMAGEPATH)
        
    try:
        s.image = cv2.imread(s.CURRENTIMAGEPATH)
        if s.image is None:
            s.log(0, "ERROR: Cannot read {0}...".format(s.CURRENTIMAGEPATH), exitCode=1)
    except Exception as e:
        s.log(0, "ERROR: Cannot load {0}: {1}".format(s.CURRENTIMAGEPATH, e), exitCode=1)

    s.log(4, "INFO: {}".format(result))
    return result        
