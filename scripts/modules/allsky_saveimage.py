'''
allsky_export.py

Part of allsky postprocess.py modules.
https://github.com/thomasjacquin/allsky

This module will save the final image after all modules have run

Expected parameters:
None
'''
import allsky_shared as s
import os 
import json
import cv2

metaData = {
    "name": "Saves the image",
    "description": "Saves the image",
    "events": [
        "day",
        "night"
    ] 
}

def createThumbnail():
    thumbnailSize = (s.thumbnailWidth,s.thumbnailHeight)
    s.thumbnail = cv2.resize(s.image,thumbnailSize,interpolation=cv2.INTER_AREA)
    writeImage(s.thumbnail, s.thumbnailFile)

def writeImage(image, path):
    result = True
    try:
        cv2.imwrite(path, image, [int(cv2.IMWRITE_PNG_COMPRESSION),9])
    except:
        s.log(0, "ERROR: Failed to save image {0}".format(path), exitCode=1)
        result = False
    
    return result

def saveimage(params):
    result = "Image {0} Saved".format(s.CURRENTIMAGEPATH)    
    #if s.settings["takeDaytimeImages"] or s.tod == "night":
    #    if not os.path.exists(s.imageFolder):
    #        os.makedirs(s.imageFolder)

    #    if s.createThumbnails:
    #        if not os.path.exists(s.thumbnailFolder):
    #            os.makedirs(s.thumbnailFolder)
    #        createThumbnail()

    #writeImage(s.image, s.websiteImageFile)
    #writeImage(s.image, s.imageFile)
    if not writeImage(s.image, s.CURRENTIMAGEPATH):
        result = "Failed to save {0}".format(s.CURRENTIMAGEPATH) 
    #os.remove(s.CURRENTIMAGEPATH)

    return result