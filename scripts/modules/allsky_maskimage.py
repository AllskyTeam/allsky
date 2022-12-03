""" allsky_maskimage.py

Part of allsky postprocess.py modules.
https://github.com/thomasjacquin/allsky

This module will apply a permenant mask to the captured image
"""
import allsky_shared as s
import os
import cv2

metaData = {
    "name": "Mask Image",
    "description": "Masks an Image",
    "events": [
        "day",
        "night"
    ],
    "arguments":{
        "mask": ""
    },    
    "argumentdetails": {
        "mask" : {
            "required": "false",
            "description": "Mask Path",
            "help": "The name of the image mask",
            "type": {
                "fieldtype": "image"
            }                
        } 
    }         
}


def maskimage(params, event):
    """ Applies th emask to the captured image

    Args:
        params (array): Array of parameters, see abovge
    """
    result = ""
    mask = params['mask']
    if (mask is not None) and (mask != ""):
        maskPath = os.path.join(s.getEnvironmentVariable("ALLSKY_HOME"),"html","overlay","images",mask)
        maskImage = cv2.imread(maskPath,cv2.IMREAD_GRAYSCALE)
        if maskImage is not None:
            s.image = cv2.bitwise_and(s.image,s.image,mask = maskImage)
            result = "Mask {0} applied".format(maskPath)
        else:
            s.log(0,"ERROR: Unable to read the mask image {0}".format(maskPath))
            result = "Mask {0} not found".format(maskPath)
    else:
        s.log(0,"ERROR: No mask defined")
        result = "No mask defined"

    return result