'''
allsky_starcount.py

Part of allsky postprocess.py modules.
https://github.com/AllskyTeam/allsky

This module attempts to count the number of stars in an image

Expected parameters:
None
'''
import allsky_shared as allsky_shared
from allsky_base import ALLSKYMODULEBASE

import cv2
import os
from astropy.stats import sigma_clipped_stats
from photutils.detection import DAOStarFinder

class ALLSKYSTARCOUNT(ALLSKYMODULEBASE):

	meta_data = {
		"name": "Star Count",
		"description": "Counts stars in an image",
		"events": [
			"night"
		],
		"experimental": "true",
		"module": "allsky_starcount",
		"testable": "true",
		"testableresult": "images",
		"centersettings": "false",
		"extradatafilename": "allsky_starcount.json",
        "graphs": {
            "chart1": {
				"icon": "fa-solid fa-chart-line",
				"title": "Stars",
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
						"text": "Stars"
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
						"name": "Star Count",
						"yAxis": 0,
						"variable": "AS_STARCOUNT|AS_STARIMAGEURL"                 
					}            
				}
			}
		}, 
		"extradata": {
			"database": {
				"enabled": "True",
				"table": "allsky_stars"
			}, 
			"values": {
				"AS_STARIMAGE": {
					"name": "${STARIMAGE}",
					"format": "",
					"sample": "",
					"group": "Image Data",
					"description": "Image with stars",
					"type": "string"
				},
				"AS_STARIMAGEPATH": {
					"name": "${STARIMAGEPATH}",
					"format": "",
					"sample": "",                
					"group": "Image Data",
					"description": "Image with stars Path",
					"type": "string"
				},
				"AS_STARIMAGEURL": {
					"name": "${STARIMAGEURL}",
					"format": "",
					"sample": "",                
					"group": "Image Data",
					"description": "Image with stars URL",
					"type": "string"
				},
				"AS_STARCOUNT": {
					"name": "${STARCOUNT}",
					"format": "",
					"sample": "",                
					"group": "Image Data",
					"description": "STAR COUNT",
					"type": "number"
				}
			}
		},     
		"arguments":{
			"detectionThreshold": 0.55,
			"distanceThreshold": 20,
			"annotate": "false",
			"template1": 6,
			"mask": "",
			"debug": "false",
			"debugimage": "",
			"useclearsky": "False"
		},
		"argumentdetails": {
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
				"help": "Size in pixels of the first star template",
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
				"help": "The name of the image mask. This mask is applied when counting stars bit not visible in the final image. <span class=\"text-danger\">NOTE: It is highly recommened you create a mask to improve the detection performance</span>",
				"type": {
					"fieldtype": "image"
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
			}                  
		}          
	}

	def run(self):
		result = ''
  
		image = allsky_shared.image

		# Convert to grayscale if it's RGB
		if image.ndim == 3:
			gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
		else:
			gray = image

		# Convert to float for processing
		image_data = gray.astype(float)

		# Estimate background stats
		mean, median, std = sigma_clipped_stats(image_data, sigma=3.0)

		# Detect stars
		daofind = DAOStarFinder(fwhm=3.0, threshold=5.0*std)
		sources = daofind(image_data - median)

		# Show results
		if sources is not None:
			print(f"Number of stars detected: {len(sources)}")

			for i, row in enumerate(sources):
				x = int(row['xcentroid'])
				y = int(row['ycentroid'])

				print(f'x={x}, y={y}')
				# Draw red circle (radius = 6)
				cv2.circle(allsky_shared.image, (x, y), 20, (0, 0, 255), 2)

				# Draw yellow label
				cv2.putText(allsky_shared.image, str(i+1), (x+7, y-7), cv2.FONT_HERSHEY_SIMPLEX, 
							0.4, (0, 255, 255), 1, cv2.LINE_AA)

			extra_data = {}
			filename = os.path.basename(allsky_shared.CURRENTIMAGEPATH)
			date = filename[6:14]
			url = f'/images/{date}/thumbnails/{filename}'
		
			extra_data = {}
			extra_data['AS_STARIMAGE'] = filename
			extra_data['AS_STARIMAGEPATH'] = allsky_shared.CURRENTIMAGEPATH
			extra_data['AS_STARIMAGEURL'] = url
			extra_data['AS_STARCOUNT'] = len(sources)
			allsky_shared.saveExtraData(self.meta_data["extradatafilename"], extra_data, self.meta_data['module'], self.meta_data['extradata'])
   
		else:
			allsky_shared.delete_extra_data(self.meta_data['extradatafilename'])
			print("No stars detected.")
   
		return result

def starcount(params, event):
	allsky_starcount = ALLSKYSTARCOUNT(params, event)
	result = allsky_starcount.run()

	return result     
         
def starcount_cleanup():
	moduleData = {
	    "metaData": ALLSKYSTARCOUNT.meta_data,
	    "cleanup": {
			"files": {
				ALLSKYSTARCOUNT.meta_data["extradatafilename"]
			}
	    }
	}
	allsky_shared.cleanupModule(moduleData)
