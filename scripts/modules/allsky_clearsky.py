'''
allsky_clearsky.py

Part of allsky postprocess.py modules.
https://github.com/thomasjacquin/allsky

'''
import allsky_shared as s
import cv2
import os
import numpy as np
from math import sqrt
import paho.mqtt.client as paho
from paho import mqtt

metaData = {
    "name": "Clear Sky Alarm",
    "description": "Clear Sky Alarm",
    "module": "allsky_clearsky",
    "version": "v1.0.0",        
    "events": [
        "day",
        "night"
    ],
    "experimental": "true",    
    "arguments":{
        "detectionThreshold": 0.55,
        "distanceThreshold": 20,
        "annotate": "false",
        "template1": 6,
        "mask": "",
        "debug": "false",
        "clearvalue": 10,
        "roi": "",
        "roifallback": 5,
        "mqttenable": "False",
        "mqttbroker": "",
        "mqttport": 1883,
        "mqttusername": "",
        "mqttpassword": "",
        "mqtttopic": "SKYSTATE",
        "debugimage": ""
    },
    "argumentdetails": {
        "roi": {
            "required": "true",
            "description": "Region of Interest",
            "help": "The area of the image to check for clear skies. Format is x1,y1,x2,y2",
            "type": {
                "fieldtype": "roi"
            }            
        },          
        "roifallback" : {
            "required": "true",
            "description": "Fallback %",
            "help": "If no ROI is set then this % of the image, from the center will be used",
            "type": {
                "fieldtype": "spinner",
                "min": 1,
                "max": 100,
                "step": 1
            }
        },
        "clearvalue" : {
            "required": "true",
            "description": "Clear Sky",
            "help": "If more than this number of stars are found the sky will be considered clear",
            "type": {
                "fieldtype": "spinner",
                "min": 1,
                "max": 1000,
                "step": 1
            }
        },
        "detectionThreshold" : {
            "required": "true",
            "description": "Detection Threshold",
            "help": "The limit at which stars will be detected",
            "type": {
                "fieldtype": "spinner",
                "min": 0.05,
                "max": 1,
                "step": 0.01
            }
        },
        "distanceThreshold" : {
            "required": "true",
            "description": "Distance Threshold",
            "help": "Stars within this number of pixels of another star will not be counted. Helps to reduce errors in the count",
            "type": {
                "fieldtype": "spinner",
                "min": 0,
                "max": 100,
                "step": 1
            }          
        },
        "template1" : {
            "required": "true",
            "description": "Star Template size",
            "help": "Size in pixels of the star template.",
            "type": {
                "fieldtype": "spinner",
                "min": 0,
                "max": 100,
                "step": 1
            }          
        },               
        "mask" : {
            "required": "false",
            "description": "Mask Path",
            "help": "The name of the image mask. THis mask is applied when counting stars bit not visible in the final image",
            "type": {
                "fieldtype": "image"
            }                
        },        
        "annotate" : {
            "required": "true",
            "description": "Annotate Stars",
            "help": "If selected the identified stars in the image will be highlighted",
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
        "debugimage" : {
            "required": "false",
            "description": "Debug Image",
            "help": "Image to use for debugging. DO NOT set this unless you know what you are doing",
            "tab": "Debug"        
        },        
        "mqttenable" : {
            "required": "false",
            "description": "Enable MQTT",
            "help": "Enable updates to a MQTT Broker",
            "tab": "MQTT",
            "type": {
                "fieldtype": "checkbox"
            }          
        }, 
        "mqttbroker" : {
            "required": "false",
            "description": "MQTT Broker address",
            "help": "MQTT Broker address",
            "tab": "MQTT"        
        },
        "mqttport" : {
            "required": "false",
            "description": "MQTT Broker port",
            "help": "MQTT Broker port",
            "tab": "MQTT",
            "type": {
                "fieldtype": "spinner",
                "min": 1,
                "max": 65536,
                "step": 1
            }                      
        },
        "mqttusername" : {
            "required": "false",
            "description": "MQTT Username",
            "help": "MQTT Username",
            "tab": "MQTT"        
        },                                                             
        "mqttpassword" : {
            "required": "false",
            "description": "MQTT Pasword",
            "help": "MQTT Password",
            "tab": "MQTT"        
        },
        "mqtttopic" : {
            "required": "false",
            "description": "MQTT Topic",
            "help": "MQTT Topic the sky state is published to",
            "tab": "MQTT"        
        }        
    },
    "enabled": "false"            
}

def onPublish(client, userdata, mid, properties=None):
    s.log(1,"INFO: Sky state published to MQTT Broker mid {0}".format(mid))    

def clearsky(params, event):
    #ONLY AT NIGHT !

    detectionThreshold = float(params["detectionThreshold"])
    distanceThreshold = int(params["distanceThreshold"])
    mask = params["mask"]
    annotate = params["annotate"]
    starTemplate1Size = int(params["template1"])
    debug = params["debug"]
    debugimage = params["debugimage"]
    clearvalue = int(params["clearvalue"])
    roi = params["roi"].replace(" ", "")
    fallback = int(params["roifallback"])

    mqttenable = params["mqttenable"]
    mqttbroker = params["mqttbroker"]
    mqttport = int(params["mqttport"])
    mqttusername = params["mqttusername"]
    mqttpassword = params["mqttpassword"]        
    mqtttopic = params["mqtttopic"]

    starCount = ""

    binning = s.getEnvironmentVariable("AS_BIN")
    if binning is None:
        binning = 1
    binning = int(binning)

    if debugimage != "":
        image = cv2.imread(debugimage)
        if image is None:
            image = s.image
            s.log(0, "WARNING: Debug image set to {0} but cannot be found, using latest allsky image".format(debugimage))
        else:
            s.log(0, "WARNING: Using debug image {0}".format(debugimage))
    else:
        image = s.image

    if mask != "":
        maskPath = os.path.join(s.getEnvironmentVariable("ALLSKY_HOME"),"html","overlay","images",mask)
        imageMask = cv2.imread(maskPath,cv2.IMREAD_GRAYSCALE)
        if debug:
            s.writeDebugImage(metaData["module"], "image-mask.png", imageMask)  

    if len(image.shape) == 2:
        grayImage = image
    else:
        grayImage = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    if debug:
        s.writeDebugImage(metaData["module"], "gray.png", grayImage)

    imageHeight, imageWidth = grayImage.shape[:2]
    try:
        roiList = roi.split(",")
        x1 = int(int(roiList[0]) / binning)
        y1 = int(int(roiList[1]) / binning)
        x2 = int(int(roiList[2]) / binning)
        y2 = int(int(roiList[3]) / binning)
    except:
        if len(roi) > 0:
            s.log(0, "ERROR: ROI is invalid, falling back to {0}% of image".format(fallback))
        else:
            s.log(1, "INFO: ROI not set, falling back to {0}% of image".format(fallback))
        fallbackAdj = (100 / fallback)
        x1 = int((imageWidth / 2) - (imageWidth / fallbackAdj))
        y1 = int((imageHeight / 2) - (imageHeight / fallbackAdj))
        x2 = int((imageWidth / 2) + (imageWidth / fallbackAdj))
        y2 = int((imageHeight / 2) + (imageHeight / fallbackAdj))

    croppedImage = grayImage[y1:y2, x1:x2] 

    if debug:
        s.writeDebugImage(metaData["module"], "cropped.png", croppedImage)  

    starTemplateSize = starTemplate1Size * 4
    if (starTemplateSize % 2) != 0:
        starTemplateSize += 1

    starTemplate = np.zeros([starTemplateSize, starTemplateSize], dtype=np.uint8)
    cv2.circle(
        img=starTemplate,
        center=(int(starTemplateSize/2), int(starTemplateSize/2)),
        radius=int(starTemplate1Size/2),
        color=(255, 255, 255),
        thickness=cv2.FILLED,
    )

    starTemplate = cv2.blur(
        src=starTemplate,
        ksize=(3, 3)
    )

    if debug:
        templateFileName = "startemplate-{0}.png".format(starTemplate1Size)
        s.writeDebugImage(metaData["module"], templateFileName, starTemplate)

    s.log(1,"INFO: Created star template. Radius - {0}".format(starTemplate1Size))

    starList = list()
    templateWidth, templateHeight = starTemplate.shape[::-1]

    try:
        result = cv2.matchTemplate(croppedImage, starTemplate, cv2.TM_CCOEFF_NORMED)
    except:
        s.log(0,"ERROR: Star template match failed")
    else:
        loc = np.where(result >= detectionThreshold)

        for pt in zip(*loc[::-1]):
            for star in starList:
                distance = sqrt(((pt[0] - star[0]) ** 2) + ((pt[1] - star[1]) ** 2))
                if (distance < distanceThreshold):
                    break
            else:
                starList.append(pt)

        wOffset = int(templateWidth/2)
        hOffset = int(templateHeight/2)

        if annotate:
            for star in starList:
                cv2.circle(croppedImage, (star[0] + wOffset, star[1] + hOffset), 10, (255, 255, 255), 1)

    if debug:
        s.writeDebugImage(metaData["module"], "result.png", croppedImage)  
    
    starCount = len(starList)

    if starCount >= clearvalue:
        s.log(1,"INFO: Sky is clear. {0} Stars found, clear limit is {1}".format(starCount, clearvalue))
        skyState = "Clear"
    else:
        s.log(1,"INFO: Sky is NOT clear. {0} Stars found, clear limit is {1}".format(starCount, clearvalue))
        skyState = "NOT Clear"

    if mqttenable:
        s.log(1,"INFO: Sending sky state {0} to MQTT Broker {1} using topic {2}".format(skyState, mqttbroker, mqtttopic))
        client = paho.Client(client_id="", userdata=None, protocol=paho.MQTTv5)
        client.on_publish = onPublish
        client.tls_set(tls_version=mqtt.client.ssl.PROTOCOL_TLS)
        client.username_pw_set(mqttusername, mqttpassword)
        client.connect(mqttbroker, mqttport)
        result = client.publish(mqtttopic, skyState)
    else:
        s.log(1,"INFO: MQTT disabled")

    os.environ["AS_SKYSTATE"] = skyState
    os.environ["AS_SKYSTATESTARS"] = str(starCount)
    return "Sky is {0}".format(skyState)