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

metaData = {
    "name": "Star Count",
    "description": "Counts stars in an image",
    "arguments":{
        "detectionThreshold": 0.55,
        "distanceThreshold": 20,
        "annotate": "false"
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
        "annotate" : {
            "required": "true",
            "description": "Annotate Stars",
            "help": "If selected the identified stars in the image will be highlighted",
            "type": {
                "fieldtype": "checkbox"
            }          
        }        
    },
    "enabled": "false"            
}

def starcount(params):
    detectionThreshold = float(params['detectionThreshold'])
    distanceThreshold =  int(params['distanceThreshold'])
    annotate = params['annotate']
    if len(s.image.shape) == 2:
        gray_image = s.image
    else:
        gray_image = cv2.cvtColor(s.image, cv2.COLOR_BGR2GRAY)
    
    templateFile = os.path.join(os.environ["ALLSKY_CONFIG"], "templateSM.jpg")
    template = cv2.imread(templateFile, cv2.IMREAD_GRAYSCALE)
    result = cv2.matchTemplate(gray_image, template, cv2.TM_CCOEFF_NORMED)

    loc = np.where(result >= detectionThreshold)

    star_list = list()
    for pt in zip(*loc[::-1]):
        for star in star_list:
            d = math.sqrt(((pt[0] - star[0]) ** 2) + ((pt[1] - star[1]) ** 2))
            if (d < distanceThreshold):
                # Overlap found, do not add
                break
        else:
            star_list.append(pt)

    if (annotate):
        w, h = template.shape[::-1]
        wOffset = int(w/2)
        hOffset = int(h/2)
        for star in star_list:
            cv2.circle(s.image, (star[0] + wOffset, star[1] + hOffset), 10, (0, 255, 255), 1)

    starCount = len(star_list)
    os.environ["AS_STARCOUNT"] = str(starCount)