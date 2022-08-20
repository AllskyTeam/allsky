'''
allsky_darksubtract.py

Part of allsky postprocess.py modules.
https://github.com/thomasjacquin/allsky

This module will subtract any dark frames found for the given image

'''
import allsky_shared as s
import cv2
import numpy as np

metaData = {
    "name": "Subtract dark frames",
    "description": "Subtracts dark frames from the captured image",
    "events": [
        "day",
        "night"
    ],
    "arguments":{
    },
    "argumentdetails": {      
    }          
}

def darksubtract(params): 

    # set hot pixel threshold
    threshhold = 25
    
    darkFrame = "/home/pi/allsky/darks/27.jpg"
    darkImage = cv2.imread(darkFrame)

    # get dimensions of image
    darkShape = darkImage.shape
    lightShape = s.image.shape
 
    # height, width, number of channels in image
    height = darkImage.shape[0]
    width = darkImage.shape[1]
    channels = darkImage.shape[2]

    if (lightShape != darkShape):
        print('Dark does not match Light frame')
        print('Dark:')
        print('Image Dimension    : ',darkShape)
        print('Image Height       : ',height)
        print('Image Width        : ',width)
        print('Number of Channels : ',channels)
        
        print('Light:')
        print('Image Dimension    : ',lightShape)
        print('Image Height       : ',imageDark.shape[0])
        print('Image Width        : ',imageDark.shape[1])
        print('Number of Channels : ',imageDark.shape[2])
    else:
        for x in range(1,width-1):
            for y in range(1,height-1):
                if( darkImage[y,x,1] > threshhold):
                    #imageDark[y,x,:] = 255
                    arraySurroundingPixels = np.array([
                        s.image[y-1,x-1,1],
                        s.image[y-1,x,1],
                        s.image[y-1,x+1,1],
                        s.image[y+1,x-1,1],
                        s.image[y+1,x,1],
                        s.image[y+1,x+1,1],
                        s.image[y,x+1,1],
                        s.image[y,x-1,1]
                    ])
                    replacementValue = np.mean(arraySurroundingPixels)
                    s.image[y,x,:] = replacementValue
                #else:
                    #imageDark[y,x,:] = 0    