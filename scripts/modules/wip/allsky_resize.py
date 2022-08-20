'''
allsky_resize.py

Part of allsky postprocess.py modules.
https://github.com/thomasjacquin/allsky

This module will resize the image, but only a single image.

Expected parameters:
x == New Width
y == New Height
keep_aspect == Boolean to keep aspect ratio ( default True )
'''
import allsky_shared as s
import cv2
import numpy as np

metaData = {
    "name": "Resizes the image",
    "description": "Resizes the captured image, keeping teh aspect ration if required",
    "events": [
        "day",
        "night"
    ],
    "arguments":{
        "keepaspect": "false",
        "x": 0,
        "y": 0,
        "padcolour": 0
    },
    "argumentdetails": {
        "padcolour" : {
            "required": "true",
            "description": "Padding colour",
            "help": "",
            "type": {
                "fieldtype": "spinner",
                "min": 0,
                "max": 255,
                "step": 1
            }           
        },
        "x": {
            "required": "true",
            "description": "Dimension for thew x axis",
            "help": "",
            "setting": "IMG_WIDTH",            
            "type": {
                "fieldtype": "spinner",
                "min": 0,
                "max": 10000,
                "step": 1
            }             
        },
        "y": {
            "required": "true",
            "description": "Dimension for thew x axis",
            "help": "",
            "setting": "IMG_HEIGHT", 
            "type": {
                "fieldtype": "spinner",
                "min": 0,
                "max": 10000,
                "step": 1
            }             
        }        
    }          
}

def resize(params): 

    params = s.setupParams(params, metaData)

    x = int(params["x"])
    y = int(params["y"])
    padColor = int(params["padcolour"])

    h, w = s.image.shape[:2]
    sh = y
    sw = x
    
    # interpolation method
    if h > sh or w > sw: # shrinking image
        interp = cv2.INTER_AREA
    
    else: # stretching image
        interp = cv2.INTER_CUBIC

    # aspect ratio of image
    aspect = float(w)/h 
    saspect = float(sw)/sh
    
    if (saspect >= aspect) or ((saspect == 1) and (aspect <= 1)):  # new horizontal image
        new_h = sh
        new_w = np.round(new_h * aspect).astype(int)
        pad_horz = float(sw - new_w) / 2
        pad_left, pad_right = np.floor(pad_horz).astype(int), np.ceil(pad_horz).astype(int)
        pad_top, pad_bot = 0, 0
    
    elif (saspect < aspect) or ((saspect == 1) and (aspect >= 1)):  # new vertical image
        new_w = sw
        new_h = np.round(float(new_w) / aspect).astype(int)
        pad_vert = float(sh - new_h) / 2
        pad_top, pad_bot = np.floor(pad_vert).astype(int), np.ceil(pad_vert).astype(int)
        pad_left, pad_right = 0, 0
    
    # set pad color
    if len(s.image.shape) == 3 and not isinstance(padColor, (list, tuple, np.ndarray)): # color image but only one color provided
        padColor = [padColor]*3
    
    # scale and pad
    scaled_img = cv2.resize(s.image, (new_w, new_h), interpolation=interp)
    s.image = cv2.copyMakeBorder(scaled_img, pad_top, pad_bot, pad_left, pad_right, borderType=cv2.BORDER_CONSTANT, value=padColor)

    s.log(1,"INFO: Image resized to {0}x{1}. Requested resize dimensions {2}x{3}".format(new_w, new_h, x, y))
