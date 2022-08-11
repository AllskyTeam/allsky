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
    },
    "enabled": "false"            
}


def maskimage(params):
    """ Applies th emask to the captured image

    Args:
        params (array): Array of parameters, see abovge
    """
    mask = params['mask']
    maskPath = os.path.join(s.getEnvironmentVariable("ALLSKY_HOME"),"html","overlay","images",mask)
    if maskPath is not None:
        maskImage = cv2.imread(maskPath,cv2.IMREAD_GRAYSCALE)
        if maskImage is not None:
            s.image = cv2.bitwise_and(s.image,s.image,mask = maskImage)
        else:
            s.log(1,"ERROR: Unable to read the mask image {0}".format(maskPath))