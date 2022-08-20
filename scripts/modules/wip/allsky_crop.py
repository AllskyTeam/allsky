'''
allsky_crop.py

Part of allsky postprocess.py modules.
https://github.com/thomasjacquin/allsky

This module will crop the image, but only a single image.

'''
import allsky_shared as s
import cv2
import numpy as np

metaData = {
    "name": "Crop the image",
    "description": "Crops an image given the starting co ordinates and crop size",
    "events": [
        "day",
        "night"
    ],
    "arguments":{
        "offsetx": 0,
        "offsety": 0,
        "width": 0,
        "height": 0
    },
    "argumentdetails": {
        "offsetx": {
            "required": "true",
            "description": "Offset for the x axis",
            "help": "",
            "setting": "CROP_OFFSET_X",
            "type": {
                "fieldtype": "spinner",
                "min": 0,
                "max": 10000,
                "step": 1
            }             
        },
        "offsety": {
            "required": "true",
            "description": "Offset for the y axis",
            "help": "",
            "setting": "CROP_OFFSET_Y",
            "type": {
                "fieldtype": "spinner",
                "min": 0,
                "max": 10000,
                "step": 1
            }             
        },
        "width": {
            "required": "true",
            "description": "Height to crop to",
            "help": "",
            "setting": "CROP_WIDTH",
            "type": {
                "fieldtype": "spinner",
                "min": 0,
                "max": 10000,
                "step": 1
            }             
        },
        "height": {
            "required": "true",
            "description": "Height to crop to",
            "help": "",
            "setting": "CROP_HEIGHT",            
            "type": {
                "fieldtype": "spinner",
                "min": 0,
                "max": 10000,
                "step": 1
            }             
        }                  
    }        
}

def crop(params): 

    params = s.setupParams(params, metaData)

    s.image = s.image[params["offsetx"]:params["width"], params["offsety"]:params["height"]] 

    s.log(1,"INFO: Image cropped offsetx={0}, offsety={1}, width={2}, height={3}".format(params["offsetx"], params["offsety"], params["width"], params["height"]))