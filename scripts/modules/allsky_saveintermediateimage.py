'''
allsky_saveintermediateimage.py

Part of allsky postprocess.py modules.
https://github.com/thomasjacquin/allsky

This module will save the image at any point during the module workflow

Expected parameters:
None

Changelog
v1.0.1 by Damian Grocholski (Mr-Groch)
- Added possibility to use custom filename for output image

'''
import allsky_shared as s
import os 
import cv2
import pathlib

metaData = {
    "name": "Saves an intermediate image",
    "description": "Saves an intermediate image",
    "version": "v1.0.1",
    "module": "allsky_saveintermediateimage",       
    "events": [
        "day",
        "night"
    ],
    "arguments":{
        "imagefolder": "${ALLSKY_IMAGES}/${DATE}-clean",
        "imagecustomname": ""
    },
    "argumentdetails": {
        "imagefolder" : {
            "required": "true",
            "description": "Image folder",
            "help": "The folder to save the image in. The folder will be created if it does not exist. You can use AllSky Variables in the path"
        },
        "imagecustomname" : {
            "required": "false",
            "description": "Image custom filename",
            "help": "Custom filename under which to save the image (without extension). If not provided - original filename will be used. You can use AllSky Variables in the name"
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
        path = params["imagefolder"]
        path = s.convertPath(path)
        if path is not None:
            filename = os.path.basename(s.CURRENTIMAGEPATH)
            imagecustomname = params["imagecustomname"]
            if imagecustomname != "":
                imagecustomname = s.convertPath(imagecustomname)
                if imagecustomname is not None:
                    fileExtension = pathlib.Path(s.CURRENTIMAGEPATH).suffix
                    filename = imagecustomname + fileExtension
                else:
                    result = "Invalid name {0}".format(params["imagecustomname"])
                    s.log(0, "ERROR: {}".format(result))
                    return result
            path = os.path.join(path, filename)
            if not writeImage(s.image, path, quality):
                result = "Failed to save {}".format(path) 
                s.log(0, "ERROR: Failed to save image {}".format(path))
            else:
                result = "Image {} Saved".format(path)
                s.log(1, "INFO: {}".format(result))
        else:
            result = "Invalid path {0}".format(params["imagefolder"])
            s.log(0, "ERROR: {}".format(result))
    else:
        result = "Cannot determine the image quality. Intermediate image NOT saved"
        s.log(0, "ERROR: {}".format(result))

    return result
