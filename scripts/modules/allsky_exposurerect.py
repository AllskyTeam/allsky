'''
allsky_loadimage.py

Part of allsky postprocess.py modules.
https://github.com/AllskyTeam/allsky

This module will load the last captured image into the shared module
allowing it to be passed between modules

'''
import allsky_shared as allsky_shared
from allsky_base import ALLSKYMODULEBASE
import cv2

class ALLSKYEXPOSURERECT(ALLSKYMODULEBASE):

    meta_data = {
        "name": "Display the ZWO Histogram Box",
        "description": "Overlay the ZWO 'Histogram Box' on images.",
        "full_description": "Overlay the ZWO 'Histogram Box' on images.  The size and location of the box is set by the <span class='WebUISetting'>Histogram Box</span> setting.",
        "module": "allsky_exposurerect",
        "group": "Image Adjustments",
        "events": [
            "day",
            "night"
        ],
        "arguments":{
        }   
    }    

    def _draw_exposure_rect(self, width_px=500, height_px=500, x_pct=50, y_pct=50):

        img_h, img_w = allsky_shared.image.shape[:2]

        cx = int((x_pct / 100.0) * img_w)
        cy = int((y_pct / 100.0) * img_h)

        x1 = max(0, cx - width_px // 2)
        y1 = max(0, cy - height_px // 2)
        x2 = min(img_w - 1, cx + width_px // 2)
        y2 = min(img_h - 1, cy + height_px // 2)

        cv2.rectangle(allsky_shared.image, (x1, y1), (x2, y2), (0, 0, 0), thickness=3, lineType=cv2.LINE_8)
        cv2.rectangle(allsky_shared.image, (x1 + 5, y1 + 5), (x2 - 5, y2 - 5), (255, 255, 255), thickness=3, lineType=cv2.LINE_8)

    def run(self):
        result = 'ZWO Auto Exposure box drawn'
        
        histogram_box = allsky_shared.get_setting('histogrambox')
        if histogram_box != None:
            try:
                width_px, height_px, left_pct, top_pct = map(int, histogram_box.split())
                try:
                    self._draw_exposure_rect(width_px, height_px, left_pct, top_pct)
                    self.log(4, f'INFO: {result}')                    
                except Exception as e:
                    result = f'Failed to draew exposure rectangle: {e}'
                    self.log(0, f'ERROR: {result}')
            except ValueError:
                result = 'Invalid histogram box settings. Please check the camera settings page.'
                self.log(0, f'ERROR: {result}')
        else:
            result = 'Histogram box not set. Please set the histogram box in the camera settings page.'
            self.log(0, f'ERROR: {result}')
            
        return result        

def exposurerect(params, event):
    allsky_load_image = ALLSKYEXPOSURERECT(params, event)
    result = allsky_load_image.run()

    return result  
