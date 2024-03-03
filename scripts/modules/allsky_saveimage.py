'''
allsky_saveimafe.py

Part of allsky postprocess.py modules.
https://github.com/AllskyTeam/allsky

This module will save the final image after all modules have run

'''
import allsky_shared as s
import os 
import json
import cv2
import pathlib

metaData = {
    "name": "Saves the image",
    "description": "Saves the image",
    "module": "allsky_saveimage",
    "ignorewatchdog": "True",     
    "events": [
        "day",
        "night"
    ] 
}

def writeImage(image, path, quality):
    fileExtension = pathlib.Path(path).suffix

    result = True
    try:
        if fileExtension == ".jpg":
            cv2.imwrite(path, image, [s.int(cv2.IMWRITE_JPEG_QUALITY), quality])
        else:
            cv2.imwrite(path, image, [s.int(cv2.IMWRITE_PNG_COMPRESSION), quality])        
    except:
        result = False
    
    return result

def saveimage(params, event):
    quality = s.getSetting("quality")
    if quality is not None:
        quality = s.int(quality)
        result = f"Image {s.CURRENTIMAGEPATH} Saved, quality {quality}"

        if not writeImage(s.image, s.CURRENTIMAGEPATH, quality):
            result = f"Failed to save {s.CURRENTIMAGEPATH}"
            s.log(0, f"ERROR: {result}", exitCode=1)
        else:
            s.log(4, f"INFO: {result}")
    else:
        result = "Cannot determine the image quality. Image NOT saved"
        s.log(0, f"ERROR: {result}")

    return result
