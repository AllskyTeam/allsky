'''
allsky_saveimafe.py

Part of allsky postprocess.py modules.
https://github.com/thomasjacquin/allsky

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
            cv2.imwrite(path, image, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
        else:
            cv2.imwrite(path, image, [int(cv2.IMWRITE_PNG_COMPRESSION), quality])        
    except:
        result = False
    
    return result

def saveimage(params, event):
    quality = s.getSetting("quality")
    if quality is not None:
        quality = int(quality)
        result = "Image {0} Saved, quality {1}".format(s.CURRENTIMAGEPATH, quality)

        if not writeImage(s.image, s.CURRENTIMAGEPATH, quality):
            result = "Failed to save {0}".format(s.CURRENTIMAGEPATH) 
            s.log(0, "ERROR: Failed to save image {0}".format(s.CURRENTIMAGEPATH), exitCode=1)
        else:
            s.log(1, "INFO: {}".format(result))
    else:
        result = "Cannot determine the image quality. Image NOT saved"
        s.log(0, "ERROR: {}".format(result))

    return result