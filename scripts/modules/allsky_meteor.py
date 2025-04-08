#TODO: Fix events
""" allsky_meteor.py

Part of allsky postprocess.py modules.
https://github.com/AllskyTeam/allsky

This module will attempt to locate meteors in captured images
"""
import allsky_shared as allsky_shared
from allsky_base import ALLSKYMODULEBASE
import os
import cv2
import numpy as np
from scipy.spatial import distance as dist
from astropy.io import fits
from scipy.ndimage import zoom
from astride import Streak

class ALLSKYMETEOR(ALLSKYMODULEBASE):
	_module_debug = False
	_annotate_image = False
	_fits_data = None
	_fits_file = '/tmp/meteors.fits'
 
	meta_data = {
		"name": "AllSKY Meteor Detection",
		"description": "Detects meteors in images",
		"events": [
			"night",
			"day"
		],
		"experimental": "true",
		"module": "allsky_meteor",
		"centersettings": "false",
		"extradatafilename": "allsky_meteor.json",
        "graphs": {
            "chart1": {
				"icon": "fa-solid fa-chart-line",
				"title": "Meteors",
				"group": "Analysis",
				"main": "true",
				"config": {
					"tooltip": "true",
					"chart": {
						"type": "spline",
						"zooming": {
							"type": "x"
						}
					},
					"title": {
						"text": "Meteors"
					},
					"plotOptions": {
						"series": {
							"animation": "false"
						}
					},
					"xAxis": {
						"type": "datetime",
						"dateTimeLabelFormats": {
							"day": "%Y-%m-%d",
							"hour": "%H:%M"
						}
					},
					"yAxis": [
						{ 
							"title": {
								"text": "Count"
							} 
						}
					],
					"lang": {
						"noData": "No data available"
					},
					"noData": {
						"style": {
							"fontWeight": "bold",
							"fontSize": "16px",
							"color": "#666"
						}
					}
				},
				"series": {
					"count": {
						"name": "Meteor Count",
						"yAxis": 0,
						"variable": "AS_METEORCOUNT|AS_METEORIMAGEURL"                 
					}            
				}
			}
		}, 
		"extradata": {
			"database": {
				"enabled": "True",
				"table": "allsky_meteors"
			},      
			"values": {
				"AS_METEORIMAGE": {
					"name": "${METEORIMAGE}",
					"format": "",
					"sample": "",
					"group": "Image Data",
					"description": "Image with meteors",
					"type": "string"
				},
				"AS_METEORIMAGEPATH": {
					"name": "${METEORIMAGEPATH}",
					"format": "",
					"sample": "",                
					"group": "Image Data",
					"description": "Image with meteors Path",
					"type": "string"
				},
				"AS_METEORIMAGEURL": {
					"name": "${METEORIMAGEURL}",
					"format": "",
					"sample": "",                
					"group": "Image Data",
					"description": "Image with meteors URL",
					"type": "string"
				},
				"AS_METEORCOUNT": {
					"name": "${METEORCOUNT}",
					"format": "",
					"sample": "",                
					"group": "Image Data",
					"description": "METEOR COUNT",
					"type": "number"
				}
			}  
		},
		"arguments": {
			"mask": "",
			"scalefactor": "0.5",
			"annotate": "false",
			"debug": "false",
			"useclearsky": "false",
			"background": "Constant",
			"backgroundboxsize": "50",
			"contourthreshold": "2.0",
			"minpoints": "15",
			"shapecut": "0.2",
			"areacut": "20",
			"radiusdevcut": "0.5",
			"connectivityangle": "3.0",
			"fullyconnected": "high",
			"fitsfilepath": "~/allsky/tmp/meteors.fits"
		},
		"argumentdetails": {
			"mask": {
				"required": "false",
				"description": "Mask Path",
				"tab": "General",
				"help": "The name of the image mask. This mask is applied when detecting meteors bit not visible in the final image",
				"type": {
					"fieldtype": "mask"
				}
			},
			"scalefactor" : {
				"required": "false",
				"description": "Scale Factor",
				"help": "Amount to scale the captured image by before attempting meteor detection",
				"tab": "General",   
				"type": {
					"fieldtype": "spinner",
					"min": ".25",
					"max": "1",
					"step": "0.05"
				}     
			},  
			"useclearsky": {
				"required": "false",
				"description": "Use Clear Sky",
				"tab": "General",
				"help": "If available use the results of the clear sky module. If the sky is not clear meteor detection will be skipped",
				"type": {
					"fieldtype": "checkbox"
				}
			},
			"background" : {
				"required": "false",
				"description": "Backround Type",
				"help": "The method used to remove the background.",
				"tab": "Settings",
				"type": {
					"fieldtype": "select",
					"values": "Constant,Map",
					"default": "Constant"
				}
			},
			"backgroundboxsize" : {
				"required": "false",
				"description": "Box Size",
				"help": "For 'Constant' sets the size of tiles used to estimate a single average background, for 'Map' Sets the grid size for building a 2D background map (more adaptive)",
				"tab": "Settings",   
				"type": {
					"fieldtype": "spinner",
					"min": "1",
					"max": "256",
					"step": "0.05"
				}     
			}, 
			"contourthreshold" : {
				"required": "false",
				"description": "Contour Threshold",
				"help": "1.0 - 2.0 Very sensitive, may detect noise. 2.0 - 3.5 Balanced (recommended starting point). 4.0 - 6.0+ Strict, only very bright streaks",
				"tab": "Settings",   
				"type": {
					"fieldtype": "spinner",
					"min": "1",
					"max": "6",
					"step": "0.05"
				}     
			}, 
			"minpoints" : {
				"required": "false",
				"description": "Min Points",
				"help": "The minimum number of pixels a detected contour (streak candidate) must have to be considered a real streak.",
				"tab": "Settings",   
				"type": {
					"fieldtype": "spinner",
					"min": "1",
					"max": "100",
					"step": "15"
				}     
			}, 
			"shapecut" : {
				"required": "false",
				"description": "Shape Cut",
				"help": "0.0 - 0.2 Very strict: Only highly elongated shapes. 0.2 - 0.4 Balanced: Good for typical meteor streaks. 0.5 - 0.8 Loose: Accepts short/fat streaks or blobs. 1.0 No shape filtering (almost everything passes.",
				"tab": "Settings",   
				"type": {
					"fieldtype": "spinner",
					"min": "0",
					"max": "1",
					"step": "0.1"
				}     
			}, 
			"areacut" : {
				"required": "false",
				"description": "Area Cut",
				"help": "0 - 10 Very permissive catches all small objects Use with caution (many false hits). 10 - 30 Balanced filters tiny blobs & hot pixels Recommended default range. 50 - 100 Strict only large/bright/long streaks Noisy images or urban skies.",
				"tab": "Settings",   
				"type": {
					"fieldtype": "spinner",
					"min": "0",
					"max": "100",
					"step": "1"
				}     
			}, 
			"radiusdevcut" : {
				"required": "false",
				"description": "Radius Dev Cut",
				"help": "0.1 - 0.4 Very strict: only highly linear or symmetric shapes. 0.4 - 0.7 Balanced filtering (default/recommended). 0.8 - 1.0+ Loose: allows more irregular shapes (more false positives).",
				"tab": "Settings",   
				"type": {
					"fieldtype": "spinner",
					"min": "0.1",
					"max": "10",
					"step": "0.1"
				}     
			}, 
			"connectivityangle" : {
				"required": "false",
				"description": "Connectivity Angle",
				"help": "1 - 2 Very strict â€” only near-perfectly straight. 2 - 5 Balanced â€” allows small bends, realistic. 6 - 10+ Loose â€” may connect unrelated noise contours.",
				"tab": "Settings",   
				"type": {
					"fieldtype": "spinner",
					"min": "1",
					"max": "100",
					"step": "1"
				}     
			}, 
			"fullyconnected" : {
				"required": "false",
				"description": "Fully Connected",
				"help": "'low' - Stricter: uses 4-connected neighborhood (orthogonal only).  'high' - Looser: uses 8-connected neighborhood (diagonal allowed).",
				"tab": "Settings",
				"type": {
					"fieldtype": "select",
					"values": "Low,High",
					"default": "Constant"
				}
			},
			"fitsfilepath": {
				"required": "false",
				"description": "Fits Path",
				"tab": "Settings",
				"help": "The path and filename for the intermediate fits file. ONLY chnage this if you have issues with space in the allsky/tmp filesystem"
			},
			"annotate": {
				"required": "false",
				"description": "Annotate Meteors",
				"help": "If selected the identified meteors in the image will be highlighted",
				"tab": "Debug",
				"type": {
					"fieldtype": "checkbox"
				}
			},
			"debug": {
				"required": "false",
				"description": "Enable debug mode",
				"help": "If selected each stage of the detection will generate images in the allsky tmp debug folder",
				"tab": "Debug",
				"type": {
					"fieldtype": "checkbox"
				}
			}
		}
	}

	def _to_grayscale_if_rgb(self, arr):
		if arr.ndim == 3 and arr.shape[2] == 3:
			if self._module_debug:
				print('Convert Image - Converting BGR to grayscale')
			rgb = arr[..., ::-1]
			return np.dot(rgb, [0.2989, 0.5870, 0.1140]).astype(np.float32)
		elif arr.ndim == 2:
			if self._module_debug:
				print('Convert Image - Already grayscale')
			return arr.astype(np.float32)
		else:
			raise ValueError(f"Unexpected image shape: {arr.shape}")

	def _resize_image(self, image, scale=0.5):
		height, width = image.shape[:2]
		new_size = (int(width * scale), int(height * scale))
		resized = cv2.resize(image, new_size, interpolation=cv2.INTER_AREA)
		if self._module_debug:
			print(f'Resize Image - Resized to: {resized.shape}')
		return resized

	def _save_fits_from_array(self, data):
		hdu = fits.PrimaryHDU(data)
		hdu.writeto(self._fits_file, overwrite=True)
		if self._module_debug:
			print(f'Saved FITS: {self._fits_file}')

	def _delete_fits_file(self):
		try:
			if os.path.exists(self._fits_file):
				os.remove(self._fits_file)
				if self._module_debug:    
					print(f'Deleted FITS file: {self._fits_file}')
			else:
				if self._module_debug:
					print(f'FITS file does not exist: {self._fits_file}')
		except Exception as e:
			print(f"Error deleting FITS file: {e}")

	def _run_streak_detection(self):		
		background = self.get_param('background', 'constant', str, True).lower()
		background_box_size = self.get_param('backgroundboxsize', 50, float)
		contour_threshold = self.get_param('contourthreshold', 2, float)
		min_points = self.get_param('minpoints', 15, int)
		shape_cut = self.get_param('shapecut', 0.2, float)
		area_cut = self.get_param('areacut', 20, int)
		radius_dev_cut = self.get_param('radiusdevcut', 0.5, float)
		connectivity_angle = self.get_param('connectivityangle', 3.0, float)
		fully_connected = self.get_param('fullyconnected', 'high', str, True).lower()

		# Gets around an error in astride where its using 'is' rather than == for comparisons
		if background == 'constant':
			streak = Streak(self._fits_file,
					remove_bkg='constant',
					bkg_box_size=background_box_size,
					contour_threshold=contour_threshold,
					min_points=min_points,
					shape_cut=shape_cut,
					area_cut=area_cut,
					radius_dev_cut=radius_dev_cut,
					connectivity_angle=connectivity_angle,
					fully_connected=fully_connected,
					output_path=None)
		else:
			streak = Streak(self._fits_file,
					remove_bkg='map',
					bkg_box_size=background_box_size,
					contour_threshold=contour_threshold,
					min_points=min_points,
					shape_cut=shape_cut,
					area_cut=area_cut,
					radius_dev_cut=radius_dev_cut,
					connectivity_angle=connectivity_angle,
					fully_connected=fully_connected,
					output_path=None)

		streak.detect()

		count = len(streak.streaks)
		if self._module_debug:  
			print(f'Total streaks detected: {count}')
			for i, streak_data in enumerate(streak.streaks):
				x_center = streak_data['x_center']
				y_center = streak_data['y_center']
				print(f'Streak {i+1}: center at (x={x_center:.1f}, y={y_center:.1f})')

		return streak.streaks

	def _draw_streaks_on_image(self, streaks, scale_factor):
		print('Annotating image')
		for i, s in enumerate(streaks):
			x = np.array(s['x']) / scale_factor
			y = np.array(s['y']) / scale_factor

			points = np.vstack((x, y)).T.astype(np.int32)
			points = points.reshape((-1, 1, 2))
			cv2.polylines(allsky_shared.image, [points], isClosed=False, color=(0, 255, 0), thickness=1)

			x_min, x_max = int(np.min(x)), int(np.max(x))
			y_min, y_max = int(np.min(y)), int(np.max(y))
			cv2.rectangle(allsky_shared.image, (x_min, y_min), (x_max, y_max), color=(255, 0, 0), thickness=1)

	def _find_meteors(self):
		scale = self.get_param('scalefactor', 0.5, float)
		image = allsky_shared.image
		gray = self._to_grayscale_if_rgb(image)
		resized = self._resize_image(gray, scale=0.5)
		self._save_fits_from_array(resized)
		streaks = self._run_streak_detection()
		if self._annotate_image:
			self._draw_streaks_on_image(streaks, scale_factor=scale)
		self._delete_fits_file()
  
		return streaks

	def run(self):
		self._module_debug = self.get_param('debug', False, bool)
		self._annotate_image = self.get_param('annotate', False, bool)
		self._fits_file = self.get_param('fitsfilepath', '/tmp/meteors.fits', str, True)

		streaks = self._find_meteors()
  
		if len(streaks) > 0:
			extra_data = {}
			filename = os.path.basename(allsky_shared.CURRENTIMAGEPATH)
			date = filename[6:14]
			url = f'/images/{date}/thumbnails/{filename}'
		
			extra_data = {}
			extra_data['AS_METEORIMAGE'] = filename
			extra_data['AS_METEORIMAGEPATH'] = allsky_shared.CURRENTIMAGEPATH
			extra_data['AS_METEORIMAGEURL'] = url
			extra_data['AS_METEORCOUNT'] = len(streaks)
			allsky_shared.saveExtraData(self.meta_data["extradatafilename"], extra_data, self.meta_data['module'], self.meta_data['extradata'])
   
		else:
			allsky_shared.delete_extra_data(self.meta_data['extradatafilename'])

def meteor(params, event):
	allsky_meteor = ALLSKYMETEOR(params, event)
	result = allsky_meteor.run()

	return result    
    
def meteor_cleanup():
	moduleData = {
		"metaData": ALLSKYMETEOR.meta_data,
		"cleanup": {
			"files": {
				ALLSKYMETEOR.meta_data['extradatafilename']       
			},
			"env": {}
		}
	}
	allsky_shared.cleanupModule(moduleData)
