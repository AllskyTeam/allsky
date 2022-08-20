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
        "template1": 3,
        "template2": 5,
        "mask": "",
        "debug": "false"
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
        "template2" : {
            "required": "true",
            "description": "Star Template size",
            "help": "Size in pixels of the second star template",
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
            "help": "The name of the image mask. THis mask is applied when counting stars bit not visible in the final image",
            "type": {
                "fieldtype": "image"
            }                
        },        
        "annotate" : {
            "required": "true",
            "description": "Annotate Stars",
            "help": "If selected the identified stars in the image will be highlighted",
            "type": {
                "fieldtype": "checkbox"
            }          
        },
        "debug" : {
            "required": "false",
            "description": "Enable debug mode",
            "help": "If selected each stage of the detection will generate images in the allsky tmp debug folder",
            "type": {
                "fieldtype": "checkbox"
            }          
        }             
    }          
}

def starcount(params):
    starTemplates = []

    detectionThreshold = float(params["detectionThreshold"])
    distanceThreshold = int(params["distanceThreshold"])
    mask = params["mask"]
    annotate = params["annotate"]
    starTemplate1Size = int(params["template1"])
    starTemplate2Size = int(params["template2"])
    debug = params["debug"]

    imageMask = None

    if debug:
        s.startModuleDebug(metaData["module"])

    if len(s.image.shape) == 2:
        gray_image = s.image
    else:
        gray_image = cv2.cvtColor(s.image, cv2.COLOR_BGR2GRAY)
    
    if debug:
        s.writeDebugImage(metaData["module"], "a-greyscale-image.png", gray_image)

    imageLoaded = True
    if mask != "":
        maskPath = os.path.join(s.getEnvironmentVariable("ALLSKY_HOME"),"html","overlay","images",mask)
        imageMask = cv2.imread(maskPath,cv2.IMREAD_GRAYSCALE)
        if debug:
            s.writeDebugImage(metaData["module"], "b-image-mask.png", imageMask)        
        #if imageMask is not None:
        #    if gray_image.shape == imageMask.shape:
        #        gray_image = cv2.bitwise_and(src1=gray_image, src2=imageMask)
        #        if debug:
        #            s.writeDebugImage(metaData["module"], "masked-image.png", gray_image)                   
        #    else:
        #        s.log(0,"ERROR: Source image and mask dimensions do not match")
        #        imageLoaded = False

    if imageLoaded:
        starTemplate = np.zeros([20, 20], dtype=np.uint8)
        cv2.circle(
            img=starTemplate,
            center=(9, 9),
            radius=starTemplate1Size,
            color=(255, 255, 255),
            thickness=cv2.FILLED,
        )

        starTemplate = cv2.blur(
            src=starTemplate,
            ksize=(3, 3),
        )

        if debug:
            s.writeDebugImage(metaData["module"], "star-template-1.png", starTemplate)    

        starTemplates.append(starTemplate)

        starTemplate = np.zeros([20, 20], dtype=np.uint8)
        cv2.circle(
            img=starTemplate,
            center=(9, 9),
            radius=starTemplate2Size,
            color=(255, 255, 255),
            thickness=cv2.FILLED,
        )

        starTemplate = cv2.blur(
            src=starTemplate,
            ksize=(5, 5),
        )
        if debug:
            s.writeDebugImage(metaData["module"], "star-template-2.png", starTemplate)        
        starTemplates.append(starTemplate)            

        contrast = 10
        Alpha = float(131 * (contrast + 127)) / (127 * (131 - contrast))
        Gamma = 127 * (1 - Alpha)
        gray_image = cv2.addWeighted(gray_image, Alpha, gray_image, 0, Gamma)

        if debug:
            s.writeDebugImage(metaData["module"], "c-image-contrast.png", gray_image)   

        gray_image = cv2.fastNlMeansDenoising(gray_image)
        if debug:
            s.writeDebugImage(metaData["module"], "c1-image-denoised.png", gray_image)   

        # threshold the image to reveal light regions in the
        # blurred image
        ret, thresh = cv2.threshold(gray_image, 90, 255, cv2.THRESH_BINARY)

        if debug:
            s.writeDebugImage(metaData["module"], "d-image-threshold.png", thresh) 

        # perform a series of erosions and dilations to remove
        # any small blobs of noise from the thresholded image
        thresh = cv2.erode(thresh, None, iterations=3)
        thresh = cv2.dilate(thresh, None, iterations=5)

        if debug:
            s.writeDebugImage(metaData["module"], "e-image-erodeddilated.png", thresh) 


        # perform a connected component analysis on the thresholded
        # image, then initialize a mask to store only the "large"
        # components
        labels = measure.label(thresh, background=0)
        mask = np.zeros(thresh.shape, dtype="uint8")

        # loop over the unique components
        for label in np.unique(labels):
            # if this is the background label, ignore it
            if label == 0:
                continue

            # otherwise, construct the label mask and count the
            # number of pixels 
            labelMask = np.zeros(thresh.shape, dtype="uint8")
            labelMask[labels == label] = 255
            numPixels = cv2.countNonZero(labelMask)

            # if the number of pixels in the component is sufficiently
            # large, then add it to our mask of "large blobs"
            if numPixels > 400:
                mask = cv2.add(mask, labelMask)


        mask2 = cv2.bitwise_not(mask)

        if debug:
            s.writeDebugImage(metaData["module"], "f-image-bright-mask.png", mask2) 

        dst = cv2.addWeighted(gray_image, 0.7, mask, 0.3, 0)
        
        gray_image = cv2.bitwise_and(src1=gray_image, src2=mask2)  


        if debug:
            s.writeDebugImage(metaData["module"], "g-image-bright-masked.png", gray_image) 

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
        for index, template in enumerate(starTemplates):

            templateWidth, templateHeight = template.shape[::-1]

            try:
                result = cv2.matchTemplate(sourceImageCopy, template, cv2.TM_CCOEFF_NORMED)
            except:
                s.log(0,"ERROR: Star template match failed")
            else:
                loc = np.where(result >= detectionThreshold)

                templateStarList = list()
                for pt in zip(*loc[::-1]):
                    for star in starList:
                        distance = sqrt(((pt[0] - star[0]) ** 2) + ((pt[1] - star[1]) ** 2))
                        if (distance < distanceThreshold):
                            break
                    else:
                        starList.append(pt)
                        templateStarList.append(pt)

                wOffset = int(templateWidth/2)
                hOffset = int(templateHeight/2)

                if annotate:
                    for star in templateStarList:
                        if index == 0:
                            cv2.circle(s.image, (star[0] + wOffset, star[1] + hOffset), 10, (255, 255, 255), 1)
                            pass
                        else:
                            cv2.rectangle(s.image, (star[0], star[1]), (star[0]+templateWidth, star[1] + templateHeight), (255, 255, 255), 1)

        starCount = len(templateStarList)
        os.environ["AS_STARCOUNT"] = str(starCount)

        return "{0} Stars found".format(starCount)