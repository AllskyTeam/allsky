'''
allsky_starcount.py

Part of allsky postprocess.py modules.
https://github.com/thomasjacquin/allsky

This module attempts to count the number of stars in an image

Expected parameters:
None

Changelog:
v1.0.1 by Damian Grocholski (Mr-Groch)
- Added possibility to use custom star template image
- If debug is enabled - annotate only on debug images

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
        "night"
    ],
    "experimental": "true",
    "module": "allsky_starcount",
    "version": "v1.0.1",
    "arguments":{
        "detectionThreshold": 0.55,
        "distanceThreshold": 20,
        "annotate": "false",
        "template1": 6,
        "template": "",
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
            "help": "Size in pixels of the first star template. Artificially created star template will be used if custom star template image is not set",
            "type": {
                "fieldtype": "spinner",
                "min": 1,
                "max": 100,
                "step": 1
            }
        },
        "template" : {
            "required": "false",
            "description": "Custom star template image",
            "help": "The name of the star template image. Will overwrite artificially created star template if used.",
            "type": {
                "fieldtype": "image"
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
            "required": "false",
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
        ksize=(2, 2)
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
            detectionThreshold = s.float(params["detectionThreshold"])
            distanceThreshold = s.int(params["distanceThreshold"])
            mask = params["mask"]
            annotate = params["annotate"]
            starTemplate1Size = s.int(params["template1"])
            starTemplateImgName = params["template"]
            debug = params["debug"]
            debugimage = params["debugimage"]

            usingDebugImage = False
            if debugimage != "":
                image = cv2.imread(debugimage)
                if image is None:
                    image = s.image.copy()
                    s.log(4, "WARNING: Debug image set to {0} but cannot be found, using latest allsky image".format(debugimage))
                else:
                    usingDebugImage = True
                    s.log(4, "WARNING: Using debug image {0}".format(debugimage))
            else:
                image = s.image.copy()

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
                maskPath = os.path.join(s.getEnvironmentVariable("ALLSKY_OVERLAY"),"images",mask)
                imageMask = cv2.imread(maskPath,cv2.IMREAD_GRAYSCALE)
                if debug:
                    s.writeDebugImage(metaData["module"], "b-image-mask.png", imageMask)

            if starTemplateImgName != "":
                starTemplateImgPath = os.path.join(s.getEnvironmentVariable("ALLSKY_OVERLAY"),"images",starTemplateImgName)
                starTemplate = cv2.imread(starTemplateImgPath,cv2.IMREAD_GRAYSCALE)
                if starTemplate is None:
                    s.log(0,"ERROR: Star template image can't be read. Falling back to artificiall star template.")
                    starTemplate = createStarTemplate(starTemplate1Size, debug)
            else:
                starTemplate = createStarTemplate(starTemplate1Size, debug)

            if imageMask is not None:
                if gray_image.shape == imageMask.shape:
                    gray_image = cv2.bitwise_and(src1=gray_image, src2=imageMask)
                    if debug:
                        s.writeDebugImage(metaData["module"], "h-masked-image.png", gray_image)
                else:
                    s.log(0,"ERROR: Source image and mask dimensions do not match")
                    imageLoaded = False

            starList = list()

            templateWidth, templateHeight = starTemplate.shape[::-1]

            try:
                result = cv2.matchTemplate(gray_image, starTemplate, cv2.TM_CCOEFF_NORMED)
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

                wOffset = s.int(templateWidth/2)
                hOffset = s.int(templateHeight/2)

                if annotate:
                    for star in starList:
                        if debug:
                            cv2.circle(image, (star[0] + wOffset, star[1] + hOffset), 10, (255, 255, 255), 1)
                        else:
                            cv2.circle(s.image, (star[0] + wOffset, star[1] + hOffset), 10, (255, 255, 255), 1)
                        pass

            if debug:
                s.writeDebugImage(metaData["module"], "final.png", image)

            starCount = len(starList)
            os.environ["AS_STARCOUNT"] = str(starCount)

            result = "Total stars found {0}".format(starCount)
            s.log(4,"INFO: {0}".format(result))
        else:
            result = "Sky is not clear so ignoring starcount"
            s.log(4,"INFO: {0}".format(result))
            os.environ["AS_STARCOUNT"] = "Disabled"
    else:
        result = "Its raining so ignorning starcount"
        s.log(4,"INFO: {0}".format(result))
        os.environ["AS_STARCOUNT"] = "Disabled"

    return "{}".format(result)

def starcount_cleanup():
    moduleData = {
        "metaData": metaData,
        "cleanup": {
            "files": {},
            "env": {
                "AS_STARCOUNT"
            }
        }
    }
    s.cleanupModule(moduleData)
