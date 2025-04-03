#TODO: Sort events
'''
allsky_pistatus.py

Part of allsky postprocess.py modules.
https://github.com/AllskyTeam/allsky

'''
import allsky_shared as allsky_shared
from allsky_base import ALLSKYMODULEBASE
import os
import shutil
from vcgencmd import Vcgencmd
from gpiozero import CPUTemperature, Device




class ALLSKYPISTATUS(ALLSKYMODULEBASE):
 
	meta_data = {
		"name": "Reads Pi Status",
		"description": "Reads Pi Data",
		"module": "allsky_pistatus",    
		"version": "v1.0.0",
		"events": [
			"periodic",
			"day",
			"night"
		],
		"experimental": "false",
		"testable": "true",  
		"centersettings": "false",
        "graphs": {
            "chart1": {
				"icon": "fa-solid fa-chart-line",
				"title": "Hardware",
				"group": "Hardware",    
				"main": "true",
				"config": {
					"title": {
						"text": "Hardware"
					},
					"tooltip": {
						"trigger": "axis",
						"axisPointer": {
							"type": "cross"
						}
					},
					"legend": {
						"show": "true"
					},
					"xAxis": {
						"type": "time"
					},
					"yAxis": [
						{
							"name": "CPU Temp",
							"type": "value",
							"splitLine": {
								"show": "true",
								"lineStyle": {
									"width": 1,
									"color": "#444",
									"type": "dashed"
								}
							}
						},
						{
							"name": "Free Disk",
							"type": "value",
							"position": "right",
							"splitLine": {
								"show": "true",
								"lineStyle": {
									"width": 1,
									"color": "#444",
									"type": "dashed"
								}
							}
						}
					],
					"animation": "false"
				},
				"series": {
					"exposure": {
						"name": "CPU Temp",
						"yAxisIndex": 0,
						"type": "line",
                        "smooth": "true",
                        "connectNulls": "false",
						"variable": "AS_CPUTEMP"                 
					},
					"gain": {
						"name": "Free Disk",
						"yAxisIndex": 1,
						"type": "line",
                        "smooth": "true",
                        "connectNulls": "false",
						"variable": "AS_DISKFREE"
					}               
				}
			},
            "guage1": {
				"icon": "fa-solid fa-gauge",
				"title": "CPU Temp",
				"group": "Hardware",    
				"main": "true",
				"type": "gauge",
				"config": {
					"series": [
					{
						"type": "gauge",
						"startAngle": 180,
						"endAngle": 0,
						"radius": "95%",
						"animation": "false",
						"axisLine": {
							"lineStyle": {
								"width": 30,
								"color": [
									[0.3, "#22ff22"],
									[0.7, "#ffbb00"],
									[1, "#fd666d"]
								]
							}
						},
						"pointer": {
							"itemStyle": {
								"color": "auto"
							}
						},
						"axisTick": {
							"distance": -30,
							"length": 8,
							"lineStyle": {
								"color": "#fff",
								"width": 2
							}
						},
						"splitLine": {
							"distance": -30,
							"length": 30,
							"lineStyle": {
								"color": "#fff",
								"width": 4
							}
						},
						"axisLabel": {
							"color": "inherit",
							"distance": 40,
							"fontSize": 20
						},
						"detail": {
							"valueAnimation": "true",
							"formatter": "{value}",
							"color": "inherit"
						},
						"data": [
							{
								"value": "AS_CPUTEMP"
							}
						]
					}
					]				
				}
			}
		},            
		"extradatafilename": "allsky_pistatus.json", 
		"extradata": {
			"database": {
				"enabled": "True",
				"table": "allsky_hardware"
			},      
			"values": {
				"AS_CPUTEMP": {
					"name": "${CPUTEMP}",
					"format": "float",
					"sample": "43.2",
					"group": "Pi",
					"description": "CPU Temperature (In C or F)",
					"type": "temperature"
				},              
				"AS_CPUTEMP_C": {
					"name": "${CPUTEMP_C}",
					"format": "float",
					"sample": "43.2",              
					"group": "Pi",
					"description": "CPU Temperature (In Centigrade)",
					"type": "temperature"
				},
				"AS_CPUTEMP_F": {
					"name": "${CPUTEMP_F}",
					"format": "float",
					"sample": "76.2",              
					"group": "Pi",
					"description": "CPU Temperature (In Farenheight)",
					"type": "temperature"
				},
				"AS_PIMODEL": {
					"name": "${PIMODEL}",
					"format": "string",
					"sample": "5B",              
					"group": "Pi",
					"description": "The model of Pi",
					"type": "string"
				},
				"AS_TSTATSUMARYTEXT": {
					"name": "${TSTATSUMARYTEXT}",
					"format": "text",
					"sample": "",               
					"group": "Pi",
					"description": "Throttling/overvoltage issues",
					"type": "string"
				},
				"AS_DISKSIZE": {
					"name": "${DISKSIZE}",
					"format": "filesize",
					"sample": "100000",
					"group": "Pi",
					"description": "Storage size",
					"type": "filesize"
				},
				"AS_DISKUSAGE": {
					"name": "${DISKUSAGE}",
					"format": "filesize",
					"sample": "100000",              
					"group": "Pi",
					"description": "Storage used size",
					"type": "filesize"
				},
				"AS_DISKFREE": {
					"name": "${DISKFREE}",
					"format": "filesize",
					"sample": "100000",              
					"group": "Pi",
					"description": "Storage free size",
					"type": "filesize"
				}
			}
		},
		"arguments":{
			"period": 60
		},
		"argumentdetails": {
			"period" : {
				"required": "true",
				"description": "Read Every",
				"help": "Reads data every x seconds.",                
				"type": {
					"fieldtype": "spinner",
					"min": 60,
					"max": 1440,
					"step": 1
				}          
			},
			"graph": {
				"required": "false",
				"tab": "History",
				"type": {
					"fieldtype": "graph"
				}
			}                                   
		},
		"enabled": "false"
	}

 
	tstats = {
		'0': 'Under-voltage detected',
		'1': 'Arm frequency capped',
		'2': 'Currently throttled',
		'3': 'Soft temperature limit active',
		'16': 'Under-voltage has occurred',
		'17': 'Arm frequency capping has occurred',
		'18': 'Throttling has occurred',
		'19': 'Soft temperature limit has occurred'
	}
 
	def run(self):
		result = ''
		self.debugmode = self.get_param('ALLSKYTESTMODE', False, bool) 
		period = self.get_param('period', 60, int) 
			
		shouldRun, diff = allsky_shared.shouldRun('pistatus', period)
				
		if shouldRun or self.debugmode:
			extra_data = {}
			usage = shutil.disk_usage("/")
			size = usage[0]
			used = usage[1]
			free = usage[2]

			extra_data['AS_DISKSIZE'] = size
			extra_data['AS_DISKUSAGE'] = used
			extra_data['AS_DISKFREE'] = free

			allsky_shared.log(4, f'INFO: Disk Size {size}, Disk Used {used}, Disk Free {free}')
			vcgm = Vcgencmd()
			temp = CPUTemperature().temperature
			temp = round(temp,1)
			
			tempUnits = allsky_shared.getSetting('temptype')
			if tempUnits == 'B':
				extra_data['AS_CPUTEMP_C'] = temp
				temp = (temp * (9/5)) + 32
				temp = round(temp,1)
				extra_data['AS_CPUTEMP_F'] = temp
				allsky_shared.log(4, f"CPU Temp (C) {extra_data['AS_CPUTEMP_C']}, CPU Temp (F) {extra_data['AS_CPUTEMP_F']}")
			else:
				if tempUnits == 'F':
					temp = (temp * (9/5)) + 32
					temp = round(temp,1)
				extra_data['AS_CPUTEMP'] = temp
				allsky_shared.log(4, f"INFO: CPU Temp ({tempUnits}) {extra_data['AS_CPUTEMP']}")

			Device.ensure_pin_factory()
			board_info = Device.pin_factory.board_info
			extra_data['AS_PIMODEL'] = board_info.model
			allsky_shared.log(4, f'INFO: Pi Model {board_info.model}')

			throttled = vcgm.get_throttled()
			text = []
			for bit in self.tstats:
				if throttled['breakdown'][bit]:
					text.append(self.tstats[bit])

			if not text:
				tstatText = 'No Errors'
			else:
				tstatText = ', '.join(text)
			extra_data['AS_TSTATSUMARYTEXT'] = tstatText

				
			allsky_shared.setLastRun('pistatus')
			allsky_shared.dbUpdate('pistatus', extra_data)
			result = 'PI Status Data Written'
		else:
			extra_data = allsky_shared.dbGet('pistatus')
			result = 'Will run in ' + str(period - diff) + ' seconds'
			
		if extra_data:
			allsky_shared.saveExtraData(self.meta_data["extradatafilename"], extra_data, self.meta_data['module'], self.meta_data['extradata'])
		
		allsky_shared.log(4, f'INFO: {result}')
		return result

def pistatus(params, event):
	allsky_pistatus = ALLSKYPISTATUS(params, event)
	result = allsky_pistatus.run()

	return result

def pistatus_cleanup():
	moduleData = {
		"metaData": metaData,
		"cleanup": {
			"files": {
				metaData["extradatafilename"]
			},
		"env": {}
		}
	}
	allsky_shared.cleanupModule(moduleData)
