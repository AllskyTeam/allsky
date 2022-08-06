'''
allsky_maskimage.py

Part of allsky postprocess.py modules.
https://github.com/thomasjacquin/allsky

Applies a mask to a captured image. This is useful if the image circle is within the camera frame
Expected parameters:
None
'''
import allsky_shared as s
import os
import cv2

metaData = {
    "name": "Mask Image",
    "description": "Masks an Image",
    "arguments":{
        "maskpath": ""
    },
    "argumentdetails": {
        "maskpath" : {
            "required": "true",
            "description": "Mask Path",
            "help": "The full path to the mask to use"
        }
    },
    "enabled": "false"            
}


def maskimage(params):
    maskPath = params['maskpath']
    if maskPath is not None:
        maskImage = cv2.imread(maskPath,cv2.IMREAD_GRAYSCALE)
        if maskImage is not None:
            s.image = cv2.bitwise_and(s.image,s.image,mask = maskImage)
        else:
            s.log(1,"ERROR: Unable to read the mask image {0}".format(maskPath))