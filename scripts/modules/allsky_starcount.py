'''
allsky_starcount.py

Part of allsky postprocess.py modules.
https://github.com/thomasjacquin/allsky

This module attempts to count the number of stars in an image

Expected parameters:
None
'''
import allsky_shared as s
import os
import math
import cv2
import json
import numpy as np
from math import sqrt
from skimage import measure

metaData = {
    "name": "Star Count",
    "description": "Counts stars in an image",
    "events": [
        "day",
        "night"
    ],
    "experimental": "true",
    "module": "allsky_starcount",    
    "arguments":{
        "detectionThreshold": 0.55,
        "distanceThreshold": 20,
        "annotate": "false",
        "template1": 6,
        "mask": "",
        "debug": "false",
        "debugimage": "",
        "useclearsky": "False"
    },
    "argumentdetails": {
        "detectionThreshold" : {
            "required": "true",
            "description": "Detection Threshold",
            "help": "The limit at which stars will be detected",
            "type": {
                "fieldtype": "spinner",
                "min": 0.05,
                "max": 1,
                "step": 0.01
            }
        },
        "distanceThreshold" : {
            "required": "true",
            "description": "Distance Threshold",
            "help": "Stars within this number of pixels of another star will not be counted. Helps to reduce errors in the count",
            "type": {
                "fieldtype": "spinner",
                "min": 0,
                "max": 100,
                "step": 1
            }          
        },
        "template1" : {
            "required": "true",
            "description": "Star Template size",
            "help": "Size in pixels of the first star template",
            "type": {
                "fieldtype": "spinner",
                "min": 0,
                "max": 100,
                "step": 1
            }          
        },          
        "mask" : {
            "required": "false",
            "description": "Mask Path",
            "help": "The name of the image mask. This mask is applied when counting stars bit not visible in the final image. <span class=\"text-danger\">NOTE: It is highly recommened you create a mask to improve the detection performance</span>",
            "type": {
                "fieldtype": "image"
            }                
        },
        "useclearsky" : {
            "required": "false",
            "description": "Use Clear Sky",
            "help": "If available use the results of the clear sky module. If the sky is not clear meteor detection will be skipped",         
            "type": {
                "fieldtype": "checkbox"
            }          
        },              
        "annotate" : {
            "required": "true",
            "description": "Annotate Stars",
            "help": "If selected the identified stars in the image will be highlighted",
            "tab": "Debug",
            "type": {
                "fieldtype": "checkbox"
            }          
        },
        "debug" : {
            "required": "false",
            "description": "Enable debug mode",
            "help": "If selected each stage of the detection will generate images in the allsky tmp debug folder",
            "tab": "Debug",
            "type": {
                "fieldtype": "checkbox"
            }          
        },
        "debugimage" : {
            "required": "false",
            "description": "Debug Image",
            "help": "Image to use for debugging. DO NOT set this unless you know what you are doing",
            "tab": "Debug"        
        }                  
    }          
}

def createStarTemplate(starSize, debug):
    starTemplateSize = starSize * 4
    if (starTemplateSize % 2) != 0:
        starTemplateSize += 1

    starTemplate = np.zeros([starTemplateSize, starTemplateSize], dtype=np.uint8)
    cv2.circle(
        img=starTemplate,
        center=(int(starTemplateSize/2), int(starTemplateSize/2)),
        radius=int(starSize/2),
        color=(255, 255, 255),
        thickness=cv2.FILLED,
    )

    starTemplate = cv2.blur(
        src=starTemplate,
        ksize=(3, 3)
    )

    if debug:
        s.writeDebugImage(metaData["module"], "star-template-{0}.png".format(starSize), starTemplate)

    return starTemplate

def starcount(params, event):

    raining, rainFlag = s.raining()

    skyState, skyClear = s.skyClear()

    useclearsky = params["useclearsky"]
    if not useclearsky:
        skyClear = True

    if not rainFlag:
        if skyClear:        
            detectionThreshold = float(params["detectionThreshold"])
            distanceThreshold = int(params["distanceThreshold"])
            mask = params["mask"]
            annotate = params["annotate"]
            starTemplate1Size = int(params["template1"])
            debug = params["debug"]
            debugimage = params["debugimage"]

            usingDebugImage = False
            if debugimage != "":
                image = cv2.imread(debugimage)
                if image is None:
                    image = s.image
                    s.log(0, "WARNING: Debug image set to {0} but cannot be found, using latest allsky image".format(debugimage))
                else:
                    usingDebugImage = True
                    s.log(0, "WARNING: Using debug image {0}".format(debugimage))
            else:
                image = s.image

            if debug:
                s.startModuleDebug(metaData["module"])

            if len(image) == 2:
                gray_image = image
            else:
                gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            if debug:
                s.writeDebugImage(metaData["module"], "a-greyscale-image.png", gray_image)

            imageMask = None
            if mask != "":
                maskPath = os.path.join(s.getEnvironmentVariable("ALLSKY_HOME"),"html","overlay","images",mask)
                imageMask = cv2.imread(maskPath,cv2.IMREAD_GRAYSCALE)
                if debug:
                    s.writeDebugImage(metaData["module"], "b-image-mask.png", imageMask) 


            starTemplate = createStarTemplate(starTemplate1Size, debug)

            if imageMask is not None:
                if gray_image.shape == imageMask.shape:
                    gray_image = cv2.bitwise_and(src1=gray_image, src2=imageMask)
                    if debug:
                        s.writeDebugImage(metaData["module"], "h-masked-image.png", gray_image)                   
                else:
                    s.log(0,"ERROR: Source image and mask dimensions do not match")
                    imageLoaded = False

            detectedImageClean = gray_image.copy()
            sourceImageCopy = gray_image.copy()
            
            starList = list()

            templateWidth, templateHeight = starTemplate.shape[::-1]

            try:
                result = cv2.matchTemplate(sourceImageCopy, starTemplate, cv2.TM_CCOEFF_NORMED)
            except:
                s.log(0,"ERROR: Star template match failed")
            else:
                loc = np.where(result >= detectionThreshold)

                for pt in zip(*loc[::-1]):
                    for star in starList:
                        distance = sqrt(((pt[0] - star[0]) ** 2) + ((pt[1] - star[1]) ** 2))
                        if (distance < distanceThreshold):
                            break
                    else:
                        starList.append(pt)

                wOffset = int(templateWidth/2)
                hOffset = int(templateHeight/2)

                if annotate:
                    for star in starList:
                        if usingDebugImage:
                            cv2.circle(image, (star[0] + wOffset, star[1] + hOffset), 10, (255, 255, 255), 1)
                        else:
                            cv2.circle(s.image, (star[0] + wOffset, star[1] + hOffset), 10, (255, 255, 255), 1)
                        pass

            if debug:
                s.writeDebugImage(metaData["module"], "final.png", image)

            starCount = len(starList)
            os.environ["AS_STARCOUNT"] = str(starCount)

            result = "Total stars found {0}".format(starCount)
            s.log(1,"INFO: {0}".format(result))
        else:
            result = "Sky is not clear so ignoring starcount"
            s.log(1,"INFO: {0}".format(result))                 
            os.environ["AS_STARCOUNT"] = "Disabled"
    else:
        result = "Its raining so ignorning starcount"
        s.log(1,"INFO: {0}".format(result))
        os.environ["AS_STARCOUNT"] = "Disabled"

    return "{}".format(result)