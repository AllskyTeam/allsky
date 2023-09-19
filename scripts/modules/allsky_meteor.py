""" allsky_meteor.py

Part of allsky postprocess.py modules.
https://github.com/thomasjacquin/allsky

This module will attempt to locate meteors in captured images
"""
import allsky_shared as s
import os
import json
import cv2
import pathlib
import numpy as np
from scipy.spatial import distance as dist

metaData = {
    "name": "AllSKY Meteor Detection",
    "description": "Detects meteors in images",
    "version": "v1.0.1",
    "events": [
        "night"
    ],
    "experimental": "true",
    "module": "allsky_meteor",
    "arguments":{
        "mask": "",
        "length": "100",
        "annotate": "false",
        "debug": "false",
        "useclearsky": "false",
        "saveimage": "false",
        "imagefolder": "${ALLSKY_IMAGES}/${DATE_NAME}/meteors",
        "writelog": "false",
        "logfile": "${ALLSKY_IMAGES}/${DATE_NAME}/meteors.txt"
    },
    "argumentdetails": {
        "mask" : {
            "required": "false",
            "description": "Mask Path",
            "help": "The name of the image mask. This mask is applied when detecting meteors bit not visible in the final image",
            "type": {
                "fieldtype": "image"
            }                
        },
        "length" : {
            "required": "true",
            "description": "Minimum Length",
            "help": "The minimum length of a detected meteor trail in pixels",
            "type": {
                "fieldtype": "spinner",
                "min": 0,
                "max": 500,
                "step": 1
            }          
        },
        "useclearsky" : {
            "required": "false",
            "description": "Use Clear Sky",
            "help": "If available use the results of the clear sky module. If the sky is not clear meteor detection will be skipped",         
            "type": {
                "fieldtype": "checkbox"
            }          
        },            
        "annotate" : {
            "required": "false",
            "description": "Annotate Meteors",
            "help": "If selected the identified meteors in the image will be highlighted",
            "tab": "Debug",            
            "type": {
                "fieldtype": "checkbox"
            }          
        },
        "debug" : {
            "required": "false",
            "description": "Enable debug mode",
            "help": "If selected each stage of the detection will generate images in the allsky tmp debug folder",
            "tab": "Debug",            
            "type": {
                "fieldtype": "checkbox"
            }          
        },
        "saveimage" : {
            "required": "false",
            "description": "Save images with meteors",
            "help": "Save an intermediate images with detected meteors",
            "type": {
                "fieldtype": "checkbox"
            }
        },
        "imagefolder" : {
            "required": "false",
            "description": "Images folder",
            "help": "The folder to save the images in. The folder will be created if it does not exist. You can use AllSky Variables in the path"
        },
        "writelog" : {
            "required": "false",
            "description": "Write detections to log file",
            "help": "Positive results of meteors detections will be written to log file",
            "type": {
                "fieldtype": "checkbox"
            }
        },
        "logfile" : {
            "required": "false",
            "description": "Detections log file",
            "help": "The log file to write the positive meteors detections. The file will be created if it does not exist but folder must exist. You can use AllSky Variables in the path"
        }
    }
}

def meteor(params, event):

    raining, rainFlag = s.raining()
    skyState, skyClear = s.skyClear()

    useclearsky = params["useclearsky"]
    if not useclearsky:
        skyClear = True

    if not rainFlag:
        if skyClear:
            mask = params["mask"]
            annotate = params["annotate"]    
            length = s.int(params["length"])
            debug = params["debug"]
            saveimage = params["saveimage"]
            imagefolder = params["imagefolder"]
            writelog = params["writelog"]
            logfile = params["logfile"]

            maskImage = None
            
            if debug:
                s.startModuleDebug(metaData["module"])

            height, width = s.image.shape[:2]

            if mask != "":
                maskPath = os.path.join(s.getEnvironmentVariable("ALLSKY_OVERLAY"),"images",mask)
                s.log(4,f"INFO: Loading mask {maskPath}")
                maskImage = cv2.imread(maskPath,cv2.IMREAD_GRAYSCALE)
                if maskImage is not None:
                    if debug:
                        s.writeDebugImage(metaData["module"], "meteor-mask.png", maskImage)

            img_gray = cv2.cvtColor(s.image, cv2.COLOR_BGR2GRAY)
            if debug:
                s.writeDebugImage(metaData["module"], "greyscale-image.png", img_gray)

            img_gray_canny = cv2.Canny(img_gray.astype(np.uint8),100,200,apertureSize=3)

            img_gray_canny_crop = img_gray_canny
            img_gray_canny_crop = img_gray_canny_crop.astype(np.uint8)

            if debug:
                s.writeDebugImage(metaData["module"], "greyscale-canny.png", img_gray)

            kernel = np.ones((3,3), np.uint8)
            dilation = cv2.dilate(img_gray_canny_crop, kernel, iterations = 2)
            dilation = cv2.erode(dilation, kernel, iterations = 1)

            if debug:
                s.writeDebugImage(metaData["module"], "dilated-canny.png", img_gray)

            cloud_mask = np.zeros(dilation.shape,np.uint8)
            contour,hier = cv2.findContours(dilation,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_SIMPLE)
            contour_able = 0
            try:
                for cnt in contour:
                    area = cv2.contourArea(cnt)
                    if area > 1550:
                        contour_able = 1
                        cv2.drawContours(cloud_mask,[cnt],0,255,-1)
            except:
                contour_able = 0

            if debug:
                s.writeDebugImage(metaData["module"], "cloud-mask.png", cloud_mask)

            if contour_able==1:
                kernel_dilate = np.ones((7,7), np.uint8)
                dilation_mask = dilation * cv2.dilate(cv2.bitwise_not(cloud_mask), kernel_dilate, iterations = 1)
                dilation_mask = 255*dilation_mask
            else:
                dilation_mask = dilation

            if maskImage is not None:
                try:
                    dilation_mask = cv2.bitwise_and(dilation_mask,dilation_mask,mask = maskImage)
                except Exception as ex:
                    s.log(0,"ERROR: There is a problem with the meteor mask. Please check the masks dimensions and colour depth")
        
                if debug:
                    s.writeDebugImage(metaData["module"], "dilation-mask.png", dilation_mask)

            lines = cv2.HoughLinesP(dilation_mask,3,np.pi/180,100,length,20)

            meteorCount = 0
            lineCount = 0
            if lines is not None:
                for i in range(lines.shape[0]):
                    for x1,y1,x2,y2 in lines[i]:
                        if dist.euclidean((x1, y1), (x2, y2)) > length:
                            meteorCount += 1
                            if annotate:
                                cv2.line(s.image,(x1,y1),(x2,y2),(0,255,0),10)
                    lineCount += 1
            
            os.environ["AS_METEORLINECOUNT"] = str(lineCount)    
            os.environ["AS_METEORCOUNT"] = str(meteorCount)
            result = "{0} Meteors found, {1} Lines detected".format(meteorCount, lineCount)
            s.log(4,"INFO: {}".format(result))
            if meteorCount > 0:
                if writelog:
                    path = s.convertPath(logfile)
                    if path is not None:
                        with open(path, "a") as outfile:
                            outfile.write(os.path.basename(s.CURRENTIMAGEPATH) + ": " + result + "\n")
                if saveimage:
                    quality = s.getSetting("quality")
                    if quality is not None:
                        quality = s.int(quality)
                        path = s.convertPath(imagefolder)
                        if path is not None:
                            path = os.path.join(path, os.path.basename(s.CURRENTIMAGEPATH))
                            fileExtension = pathlib.Path(path).suffix
                            s.checkAndCreatePath(path)
                            if fileExtension == ".jpg":
                                cv2.imwrite(path, s.image, [s.int(cv2.IMWRITE_JPEG_QUALITY), quality])
                            else:
                                cv2.imwrite(path, s.image, [s.int(cv2.IMWRITE_PNG_COMPRESSION), quality])
        else:
            result = "Sky is not clear so ignoring meteor detection"
            s.log(4,"INFO: {0}".format(result))
            os.environ["AS_METEORCOUNT"] = "Disabled"            
    else:
        result = "Its raining so ignorning meteor detection"
        s.log(4,"INFO: {0}".format(result))
        os.environ["AS_METEORCOUNT"] = "Disabled"

    return result

def meteor_cleanup():
    moduleData = {
        "metaData": metaData,
        "cleanup": {
            "files": {},
            "env": {
                "AS_METEORLINECOUNT",
                "AS_METEORCOUNT"
            }
        }
    }
    s.cleanupModule(moduleData)
