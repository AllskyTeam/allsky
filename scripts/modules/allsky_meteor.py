'''
allsky_meteor.py

Part of allsky postprocess.py modules.
https://github.com/thomasjacquin/allsky


Expected parameters:
None
'''
import allsky_shared as s
import os
import json
import cv2
import numpy as np
from scipy.spatial import distance as dist

metaData = {
    "name": "AllSKY Meteor Detection",
    "description": "EXPERIMENTAL: Detects meteors in images",
    "arguments":{
        "mask": "",
        "annotate": "false"
    },
    "argumentdetails": {
        "mask" : {
            "required": "false",
            "description": "Mask Path",
            "help": "The name of the image mask. THis mask is applied when detecting meteors bit not visible in the final image",
            "type": {
                "fieldtype": "image"
            }                
        },
        "annotate" : {
            "required": "true",
            "description": "Annotate Meteors",
            "help": "If selected the identified meteors in the image will be highlighted",
            "type": {
                "fieldtype": "checkbox"
            }          
        }                  
    },
    "enabled": "false"
}



def meteor(params):
    mask = params["mask"]
    annotate = params["annotate"]    
    height, width = s.image.shape[:2]

    minimal_lenth=300

    #img_gray = cv2.cvtColor(s.image, cv2.COLOR_BGR2GRAY)

    if mask != "":
        maskPath = os.path.join(s.getEnvironmentVariable("ALLSKY_HOME"),"html","overlay","images",mask)
        maskImage = cv2.imread(maskPath,cv2.IMREAD_GRAYSCALE)
        #if maskImage is not None:
        #    img_gray = cv2.bitwise_and(s.image,s.image,mask = maskImage)
        #else:
        #    s.log(1,"ERROR: Unable to read the mask image {0}".format(maskPath))

    img_gray = cv2.cvtColor(s.image, cv2.COLOR_BGR2GRAY)

    img_gray_canny = cv2.Canny(img_gray.astype(np.uint8),100,200,apertureSize=3)

    img_gray_canny_crop = img_gray_canny
    img_gray_canny_crop = img_gray_canny_crop.astype(np.uint8)

    kernel = np.ones((3,3), np.uint8)
    dilation = cv2.dilate(img_gray_canny_crop, kernel, iterations = 2)

    dilation = cv2.erode(dilation, kernel, iterations = 1)

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

    if contour_able==1:
        kernel_dilate = np.ones((7,7), np.uint8)
        dilation_mask = dilation * cv2.dilate(cv2.bitwise_not(cloud_mask), kernel_dilate, iterations = 1)
        dilation_mask = 255*dilation_mask
    else:
        dilation_mask = dilation

    if maskImage is not None:
        dilation_mask = cv2.bitwise_and(dilation_mask,dilation_mask,mask = maskImage)
 
    lines = cv2.HoughLinesP(dilation_mask,3,np.pi/180,100,minimal_lenth,20)
    print("Meteors = " + str(len(lines)))
    meteorCount = 0
    for i in range(lines.shape[0]):
      for x1,y1,x2,y2 in lines[i]:
        if dist.euclidean((x1, y1), (x2, y2)) > 50:
          meteorCount +=1
          if annotate:
            cv2.line(s.image,(x1,y1),(x2,y2),(0,255,0),10)
    
        os.environ["AS_METEORCOUNT"] = str(meteorCount)
    else:
        os.environ["AS_METEORCOUNT"] = "0"