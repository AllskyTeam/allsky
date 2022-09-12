'''
allsky_upload.py

Part of allsky postprocess.py modules.
https://github.com/thomasjacquin/allsky

This module will upload the final file if required

'''
import allsky_shared as s
import cv2

metaData = {
    "name": "Upload Image",
    "description": "Uploads the final image image",
    "arguments":{
    },
    "argumentdetails": {      
    },
    "enabled": "false"            
}

def upload(params):    
    s.readUploadConfig()
    params = s.setupParams(params, metaData)

    