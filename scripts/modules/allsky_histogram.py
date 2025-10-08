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
import numpy as np

class ALLSKYHISTOGRAM(ALLSKYMODULEBASE):

    meta_data = {
        "name": "Display Image Histogram",
        "description": "Add an image's histogram to the image.",
        "module": "allsky_histogram",
        "group": "Image Adjustments",
        "events": [
            "day",
            "night"
        ],
        "arguments":{
            "x": "0",
            "y": "0",
            "width": "1000",
            "height": "500"
        },
		"argumentdetails": {
			"x" : {
				"required": "false",
				"description": "x",
				"help": "X position of the histogram.",
				"tab": "Settings",
				"type": {
					"fieldtype": "spinner",
					"min": "0",
					"max": "6000",
					"step": "1"
				}
			},
			"y" : {
				"required": "false",
				"description": "y",
				"help": "Y position of the histogram.",
				"tab": "Settings",
				"type": {
					"fieldtype": "spinner",
					"min": "0",
					"max": "6000",
					"step": "1"
				}
			},
			"width" : {
				"required": "false",
				"description": "Width",
				"help": "Width of the histogram in pixels.",
				"tab": "Settings",
				"type": {
					"fieldtype": "spinner",
					"min": "0",
					"max": "6000",
					"step": "1"
				}
			},
			"height" : {
				"required": "false",
				"description": "Height",
				"help": "Height of the histogram in pixels.",
				"tab": "Settings",
				"type": {
					"fieldtype": "spinner",
					"min": "0",
					"max": "6000",
					"step": "1"
				}
			}
        }
    }

    def _draw_histogram(self, x = 2500, y=2000, width=1000, height=500):
        img = allsky_shared.image.copy()
        is_color = len(img.shape) == 3 and img.shape[2] == 3
        h, w = img.shape[:2]

        # Clamp position and size to fit inside image
        width = min(width, w - x)
        height = min(height, h - y)
        if width <= 10 or height <= 10:
            return img  # too small or invalid region

        # Create RGBA histogram canvas
        hist_canvas = np.zeros((height, width, 4), dtype=np.uint8)
        padding = 5  # space between border and histogram bars

        # Draw background and border
        cv2.rectangle(hist_canvas, (0, 0), (width - 1, height - 1), (0, 0, 0, 150), thickness=cv2.FILLED)
        cv2.rectangle(hist_canvas, (0, 0), (width - 1, height - 1), (255, 255, 255, 255), thickness=1, lineType=cv2.LINE_AA)

        # Define drawing area inside border
        plot_x0 = padding
        plot_x1 = width - padding - 1
        plot_y0 = padding
        plot_y1 = height - padding - 1
        plot_width = plot_x1 - plot_x0 + 1
        plot_height = plot_y1 - plot_y0 + 1

        # Set channels and colours
        if is_color:
            channels = [0, 1, 2]  # BGR
            colours = [(255, 0, 0), (0, 255, 0), (0, 0, 255)]
            hist_source = img
        else:
            hist_source = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
            channels = [0]
            colours = [(255, 255, 255)]

        alpha_value = 100  # histogram fill transparency

        # Draw filled histogram bars
        for ch, colour in zip(channels, colours):
            hist = cv2.calcHist([hist_source], [ch], None, [256], [0, 256])
            hist = cv2.normalize(hist, hist, 0, plot_height, cv2.NORM_MINMAX)

            pts = [
                (
                    plot_x0 + int(x * plot_width / 255),
                    plot_y1 - int(hist[x])
                )
                for x in range(256)
            ]
            pts = [(plot_x0, plot_y1)] + pts + [(plot_x1, plot_y1)]

            layer = np.zeros_like(hist_canvas, dtype=np.uint8)
            cv2.fillPoly(layer, [np.array(pts, dtype=np.int32)], colour + (alpha_value,))

            alpha_fg = layer[..., 3:4].astype(np.float32) / 255.0
            alpha_bg = hist_canvas[..., 3:4].astype(np.float32) / 255.0
            out_alpha = alpha_fg + alpha_bg * (1 - alpha_fg)

            for c in range(3):
                blended = (
                    layer[..., c:c+1] * alpha_fg + hist_canvas[..., c:c+1] * alpha_bg * (1 - alpha_fg)
                ) / np.maximum(out_alpha, 1e-6)
                hist_canvas[..., c] = blended.squeeze().astype(np.uint8)

            hist_canvas[..., 3] = (out_alpha * 255).astype(np.uint8).squeeze()

        # Overlay on image at (x, y)
        roi = img[y:y + height, x:x + width].astype(np.float32)
        overlay_rgb = hist_canvas[..., :3].astype(np.float32)
        overlay_alpha = hist_canvas[..., 3].astype(np.float32) / 255.0
        overlay_alpha = overlay_alpha[..., np.newaxis]

        blended = roi * (1 - overlay_alpha) + overlay_rgb * overlay_alpha
        allsky_shared.image[y:y + height, x:x + width] = np.clip(blended, 0, 255).astype(np.uint8)

    def run(self):
        result = 'Histogram drawn'

        try:
            x = self.get_param('x', 0,int)
            y = self.get_param('y', 0,int)
            width = self.get_param('width', 1000,int)
            height = self.get_param('height', 500,int)

            self._draw_histogram(x, y, width, height)
            result = f'Histogram drawn at x={x}, y={y}, width={width}, height={height}'
        except Exception as e:
            result = f'Failed to draw histogram: {e}'
            self.log(0, f'ERROR: {result}')
        else:
            self.log(4, f'INFO: {result}')

        return result

def histogram(params, event):
    allsky_load_image = ALLSKYHISTOGRAM(params, event)
    result = allsky_load_image.run()

    return result
