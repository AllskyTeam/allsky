#!/usr/bin/python

'''
allsky_badimage.py

Part of allsky postprocess.py modules.
https://github.com/thomasjacquin/allsky

Removes bad images based upon mean brightness

Expected parameters:
None
'''
import allsky_shared as s
import os 
import cv2
import argparse
import subprocess
import glob

import numpy as np
from numpy.linalg import norm

metaData = {
    "name": "Remove bad images",
    "description": "Removes bad images based upon the MEAN brightness",
    "events": [
        "day",
        "night"
    ],
    "arguments":{
        "low": 0,
        "high": 90
    },
    "argumentdetails": {
        "low": {
            "required": "true",
            "description": "Low MEAN value",
            "help": "",
            "type": {
                "fieldtype": "spinner",
                "min": 0,
                "max": 100,
                "step": 1
            }             
        },
        "high": {
            "required": "true",
            "description": "High MEAN value",
            "help": "",
            "type": {
                "fieldtype": "spinner",
                "min": 0,
                "max": 100,
                "step": 1
            }             
        }                 
    }    
}

def badimage(params):
    result = False
    mean = 0

    grayscale = cv2.cvtColor(s.image, cv2.COLOR_BGR2GRAY)
    mean = cv2.mean(grayscale)[0]

    if (mean < int(params["low"])) or (mean > int(params["high"])):
        if params["test"]:
            s.log(0, "ERROR: Mean value {0} outside range {1} to {2} - Dry Run ONLY File NOT deleted".format(mean, params["low"], params["high"]))
        else:
            os.remove(s.CURRENTIMAGEPATH)            
            s.log(0, "ERROR: Mean value {0} outside range {1} to {2} - Aborting".format(mean, params["low"], params["high"]), exitCode=1)
            result = s.ABORT
    else:
        s.log(1, "INFO: Mean value {0} inside range {1} to {2}".format(mean, params["low"], params["high"]))

    return result    


def processImage(imagePath, low, high, test):
    result = False

    s.image = cv2.imread(imagePath)
    if s.image.any() == None:
        result = s.ABORT
        print("ERROR: Image {0} not found - Aborting".format(imagePath))

    if s.image is not None:
        params = {}
        params["low"] = low
        params["high"] = high
        params["test"] = test
        result = badimage(params)

    return result

if __name__ == "__main__":
    s.setupForCommandLine()
    
    parser = argparse.ArgumentParser()
    parser.add_argument("-i", "--image", type=str, help="Image to proces")
    parser.add_argument("-d", "--date",  type=str, help="Date to process YYYYMMDD")
    parser.add_argument("-t", "--test",  action=argparse.BooleanOptionalAction, help="Dummy run only. No files will be removed")
    parser.add_argument("-l", "--lower",  type=int, help="Low MEAN Value. Default is 0", nargs="?", default=0)
    parser.add_argument("-u", "--upper",  type=int, help="High MEAN Value. Default is 90", nargs="?", default=90)
    args = parser.parse_args()

    image = args.image
    directory = args.date
    low = args.lower
    high = args.upper
    test = args.test

    if image is not None:
        imagesFolder = s.getEnvironmentVariable("ALLSKY_IMAGES", True, "ALLSKY_IMAGES environment variable missing")
    
        imagePath = os.path.join(imagesFolder, args.date, image)
        s.CURRENTIMAGEPATH = imagePath
        if processImage(imagePath, low, high, test) == s.ABORT:
            exit(1)
    else:
        filname = s.getSetting("filename")
        name, extension = os.path.splitext(filname)
        match = name + "-*" + extension

        imagePath = s.getEnvironmentVariable("ALLSKY_IMAGES")
        imagePath = os.path.join(imagePath, directory, match)
        print(name, extension, imagePath)

        files = glob.glob(imagePath)
        for file in files:
            if processImage(file, low, high, test) == s.ABORT:
                exit(1) 