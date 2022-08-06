'''
allsky_stretch.py

Part of allsky postprocess.py modules.
https://github.com/thomasjacquin/allsky

This module will stretch the image

'''
import allsky_shared as s
import cv2

metaData = {
    "name": "Stretch Image",
    "description": "Stretches the captured image",
    "arguments":{
        "contrast": 1,
        "brightness": 0
    },
    "argumentdetails": {      
        "contrast" : {
            "required": "true",
            "description": "Contrast Value",
            "help": "Contrast value 1.0 to 3.0",
            "type": {
                "fieldtype": "spinner",
                "min": 1,
                "max": 3,
                "step": 0.1
            }           
        },
        "brightness" : {
            "required": "true",
            "description": "Brightness Value",
            "help": "Brightness value 0 to 100",
            "type": {
                "fieldtype": "spinner",
                "min": 0,
                "max": 100,
                "step": 1
            }           
        }           
    },
    "enabled": "false"            
}

def stretch(params):    

    params = s.setupParams(params, metaData)

    alpha = float(params["contrast"]) # Contrast control (1.0-3.0)
    beta = int(params["brightness"]) # Brightness control (0-100)

    s.image = cv2.convertScaleAbs(s.image, alpha=alpha, beta=beta)

    s.log(1,"INFO: Image stretched contrast (alpha)={0}, brightness (beta)={1}".format(alpha, beta))