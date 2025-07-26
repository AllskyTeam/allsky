#TODO: Sort events
'''
allsky_pistatus.py

Part of allsky postprocess.py modules.
https://github.com/AllskyTeam/allsky

'''
import allsky_shared as allsky_shared
from allsky_base import ALLSKYMODULEBASE
import shutil
import psutil
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
		"group": "Hardware",
        "graphs": {
            "chart1": {
				"icon": "fa-solid fa-chart-line",
				"title": "Hardware",
				"group": "Hardware",
				"main": "true",
				"config": {
					"chart": {
						"type": "spline",
						"zooming": {
							"type": "x"
						}
					},
					"title": {
						"text": "Hardware"
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
								"text": "CPU Temp"
							} 
						},
						{
							"title": { 
								"text": "Free Disk"
							}, 
							"opposite": "true"
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
					"exposure": {
						"name": "CPU Temp",
						"yAxis": 0,
						"variable": "AS_CPUTEMP"                 
					},
					"gain": {
						"name": "Free Disk",
						"yAxis": 1,
						"variable": "AS_DISKFREE"
					}               
				}
			},
            "memory": {
				"icon": "fa-solid fa-chart-line",
				"title": "Memory",
				"group": "Hardware",
				"main": "true",
				"config": {
					"chart": {
						"type": "spline",
						"zooming": {
							"type": "x"
						}
					},
					"title": {
						"text": "Memory"
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
								"text": "Memory"
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
					"totalmemory": {
						"name": "Total Memory",
						"yAxis": 0,
						"variable": "AS_MEMORYTOTAL"                 
					},
					"usedmemory": {
						"name": "Used Memory",
						"yAxis": 0,
						"variable": "AS_MEMORYUSED"
					},
					"freememory": {
						"name": "Free Memory",
						"yAxis": 0,
						"variable": "AS_MEMORYAVAILABLE"
					}                
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
					"format": "",
					"sample": "43.2",
					"group": "Pi",
					"description": "CPU Temperature (In C or F)",
					"type": "temperature"
				},              
				"AS_CPUTEMP_C": {
					"name": "${CPUTEMP_C}",
					"format": "",
					"sample": "43.2",              
					"group": "Pi",
					"description": "CPU Temperature (In Centigrade)",
					"type": "temperature"
				},
				"AS_CPUTEMP_F": {
					"name": "${CPUTEMP_F}",
					"format": "",
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
					"format": "{GB}",
					"sample": "100000",
					"group": "Pi",
					"description": "Storage size",
					"type": "filesize"
				},
				"AS_DISKUSAGE": {
					"name": "${DISKUSAGE}",
					"format": "{GB}",
					"sample": "100000",              
					"group": "Pi",
					"description": "Storage used size",
					"type": "filesize"
				},
				"AS_DISKFREE": {
					"name": "${DISKFREE}",
					"format": "{GB}",
					"sample": "100000",              
					"group": "Pi",
					"description": "Storage free size",
					"type": "filesize"
				},
				"AS_MEMORYTOTAL": {
					"name": "${MEMORYTOTAL}",
					"format": "{GB}",
					"sample": "100000",              
					"group": "Pi",
					"description": "Total Memory",
					"type": "filesize"
				},
				"AS_MEMORYUSED": {
					"name": "${MEMORYUSED}",
					"format": "{GB}",
					"sample": "100000",              
					"group": "Pi",
					"description": "Memory used",
					"type": "filesize"
				},
				"AS_MEMORYAVAILABLE": {
					"name": "${MEMORYAVAILABLE}",
					"format": "filesize",
					"sample": "100000",              
					"group": "Pi",
					"description": "Memory available",
					"type": "filesize"
				}
			}
		},
		"arguments":{
			"period": 60,
			"enabledataage": "false",
			"dataage": "0"
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
			"enabledataage" : {
				"required": "false",
				"description": "Custom Data Expiry",
				"help": "Enable custom data expiry. This will overrides the default in the module manager",
				"tab": "Data Control",
    			"type": {
					"fieldtype": "checkbox"
				}
			},  
			"dataage" : {
				"required": "false",
				"description": "Data Age",
				"help": "After this number of seconds if the module data is not updated it will be removed.",
				"tab": "Data Control",
				"type": {
					"fieldtype": "spinner",
					"min": 0,
					"max": 60000,
					"step": 1
				},
				"filters": {
					"filter": "enabledataage",
					"filtertype": "show",
					"values": [
						"enabledataage"
					]
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

			mem = psutil.virtual_memory()
			total_memory = mem.total
			used_memory = mem.used
			available_memory = mem.available	
			extra_data['AS_MEMORYTOTAL'] = total_memory
			extra_data['AS_MEMORYUSED'] = used_memory
			extra_data['AS_MEMORYAVAILABLE'] = available_memory
   
    
				
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
		"metaData": ALLSKYPISTATUS.meta_data,
		"cleanup": {
			"files": {
				ALLSKYPISTATUS.meta_data["extradatafilename"]
			},
		"env": {}
		}
	}
	allsky_shared.cleanupModule(moduleData)
