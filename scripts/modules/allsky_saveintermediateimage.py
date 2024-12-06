'''
allsky_saveintermediateimage.py

Part of allsky postprocess.py modules.
https://github.com/AllskyTeam/allsky

This module will save the image at any point during the module workflow

Expected parameters:
None
'''
import allsky_shared as s
import os 
import cv2
import pathlib

metaData = {
    "name": "Saves an intermediate image",
    "description": "Saves an intermediate image",
    "module": "allsky_saveintermediateimage",       
    "events": [
        "day",
        "night"
    ],
    "arguments":{
        "imagefolder": "${ALLSKY_IMAGES}/${DATE}-clean"
    },
    "argumentdetails": {
        "imagefolder" : {
            "required": "true",
            "description": "Image folder",
            "help": "The folder to save the image in. The folder will be created if it does not exist. You can use AllSky Variables in the path"
        }
    }      
}

def writeImage(image, path, quality):
    fileExtension = pathlib.Path(path).suffix

    result = True
    try:
        s.checkAndCreatePath(path)

        if fileExtension == ".jpg":
            cv2.imwrite(path, image, [s.int(cv2.IMWRITE_JPEG_QUALITY), quality])
        else:
            cv2.imwrite(path, image, [s.int(cv2.IMWRITE_PNG_COMPRESSION), quality]) 
    except:
        result = False
    
    return result

def saveintermediateimage(params, event):
    quality = s.getSetting("quality")
    if quality is not None:
        quality = s.int(quality)
        savedPath = params["imagefolder"]
        path = s.convertPath(savedPath)
        if path is not None:
            path = os.path.join(path, os.path.basename(s.CURRENTIMAGEPATH))
            if not writeImage(s.image, path, quality):
                result = f"Failed to save {path}"
                s.log(0, f"ERROR: Failed to save image {path}")
            else:
                result = f"Image {path} Saved"
                s.log(1, f"INFO: {result}")
        else:
            result = "Invalid path {savedPath}"
            s.log(0, f"ERROR: {result}")
    else:
        result = "Cannot determine the image quality. Intermediate image NOT saved."
        s.log(0, f"ERROR: {result}")

    return result
