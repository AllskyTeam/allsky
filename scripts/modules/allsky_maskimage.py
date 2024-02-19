""" allsky_maskimage.py

Part of allsky postprocess.py modules.
https://github.com/AllskyTeam/allsky

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
            "required": "true",
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
        maskPath = os.path.join(s.getEnvironmentVariable("ALLSKY_OVERLAY"),"images",mask)
        maskImage = cv2.imread(maskPath,cv2.IMREAD_GRAYSCALE)
        if maskImage is not None:
            maskChannels = maskImage.shape[-1] if maskImage.ndim == 3 else 1
            imageChannels = s.image.shape[-1] if s.image.ndim == 3 else 1
            
            maskHeight = maskImage.shape[0]
            maskWidth = maskImage.shape[1]
            imageHeight = s.image.shape[0]
            imageWidth = s.image.shape[1]
            
            if (maskWidth == imageWidth) and (maskHeight == imageHeight):            
                s.image = cv2.bitwise_and(s.image,s.image,mask = maskImage)
                result = "Mask {0} applied".format(maskPath)
                s.log(4, f"INFO: {result}")
            else:
                result = f"Mask {mask} is incorrect size: {maskWidth}x{maskHeight}. Main image is {imageWidth}x{imageHeight}."
                s.log(0, f"ERROR: {result}")
        else:
            result = "Mask {0} not found".format(maskPath)
            s.log(0, f"ERROR: {result}")
    else:
        result = "No mask defined"
        s.log(0, f"ERROR: {result}")

    return result
