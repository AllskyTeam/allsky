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
from datetime import timedelta

class ALLSKYPISTATUS(ALLSKYMODULEBASE):
 
	meta_data = {
		"name": "Read Pi Status Data",
		"description": "Read Pi status data so it can be added to overlays.",
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
		"extradatafilename": "allsky_pistatus.json", 
		"extradata": {
			"database": {
				"enabled": "True",
				"table": "allsky_hardware",
    			"pk": "id",
    			"pk_type": "int"
			},      
			"values": {
				"AS_CPUTEMP": {
					"name": "${CPUTEMP}",
					"format": "{dp2|deg|temp_unit}",
					"sample": "43.2",
					"group": "Pi",
					"description": "CPU Temperature (In C or F)",
					"type": "temperature",
					"database": {
						"include" : "true"
					}
				},              
				"AS_CPUTEMP_C": {
					"name": "${CPUTEMP_C}",
					"format": "",
					"sample": "43.2",              
					"group": "Pi",
					"description": "CPU Temperature (In Centigrade)",
					"type": "temperature",
					"database": {
						"include" : "true"
					}
				},
				"AS_CPUTEMP_F": {
					"name": "${CPUTEMP_F}",
					"format": "",
					"sample": "76.2",              
					"group": "Pi",
					"description": "CPU Temperature (In Farenheight)",
					"type": "temperature",
					"database": {
						"include" : "true"
					}
				},
				"AS_PIMODEL": {
					"name": "${PIMODEL}",
					"format": "",
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
					"format": "{Auto filesize}",
					"sample": "128 GB",
					"group": "Pi",
					"description": "Storage size",
					"type": "filesize",
					"database": {
						"include" : "true"
					}
				},
				"AS_DISKUSAGE": {
					"name": "${DISKUSAGE}",
					"format": "{Auto filesize}",
					"sample": "21.3 GB",              
					"group": "Pi",
					"description": "Storage used size",
					"type": "filesize",
					"database": {
						"include" : "true"
					}
				},
				"AS_DISKFREE": {
					"name": "${DISKFREE}",
					"format": "{Auto filesize}",
					"sample": "126.7 GB",              
					"group": "Pi",
					"description": "Storage free size",
					"type": "filesize",
					"database": {
						"include" : "true"
					}
				},
				"AS_DISKUSEDPERCENT": {
					"name": "${DISKUSEDPERCENT}",
					"format": "",
					"sample": "78",              
					"group": "Pi",
					"description": "Disk used percentage",
					"type": "number",
					"database": {
						"include" : "true"
					}
				},
				"AS_DISKFREEPERCENT": {
					"name": "${DISKFREEPERCENT}",
					"format": "",
					"sample": "78",              
					"group": "Pi",
					"description": "Disk free percentage",
					"type": "number",
					"database": {
						"include" : "true"
					}
				},
				"AS_MEMORYTOTAL": {
					"name": "${MEMORYTOTAL}",
					"format": "{Auto filesize}",
					"sample": "4 GB",              
					"group": "Pi",
					"description": "Total Memory",
					"type": "filesize",
					"database": {
						"include" : "true"
					}
				},
				"AS_MEMORYUSED": {
					"name": "${MEMORYUSED}",
					"format": "{Auto filesize}",
					"sample": "428.2 MB",              
					"group": "Pi",
					"description": "Memory used",
					"type": "filesize",
					"database": {
						"include" : "true"
					}
				},
				"AS_MEMORYAVAILABLE": {
					"name": "${MEMORYAVAILABLE}",
					"format": "{Auto filesize}",
					"sample": "3.5 GB",              
					"group": "Pi",
					"description": "Memory available",
					"type": "filesize",
					"database": {
						"include" : "true"
					}
				},
				"AS_MEMORYUSEDPERCENTAGE": {
					"name": "${MEMORYUSEDPERCENTAGE}",
					"format": "",
					"sample": "40",              
					"group": "Pi",
					"description": "Memory used %",
					"type": "number",
					"database": {
						"include" : "true"
					}
				},
				"AS_MEMORYFREEPERCENTAGE": {
					"name": "${MEMORYFREEPERCENTAGE}",
					"format": "",
					"sample": "40",              
					"group": "Pi",
					"description": "Memory free %",
					"type": "number",
					"database": {
						"include" : "true"
					}
				},
				"AS_UPTIME": {
					"name": "${UPTIME}",
					"format": "",
					"sample": "",
					"group": "Pi",
					"description": "System uptime",
					"type": "string",
					"database": {
						"include": "true"
					}
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
				"help": "Enable custom data expiry. This will overrides the default in the module manager.",
				"tab": "Data Control",
    			"type": {
					"fieldtype": "checkbox"
				}
			},  
			"dataage" : {
				"required": "false",
				"description": "Data Age",
				"help": "After this number of seconds if the module data is not updated, it will be removed.",
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
		period = self.get_param('period', 60, int) 
			
		shouldRun, diff = allsky_shared.shouldRun('pistatus', period)
				
		if shouldRun or self.debug_mode:
			extra_data = {}
			usage = shutil.disk_usage("/")
			size = usage[0]
			used = usage[1]
			free = usage[2]

			extra_data['AS_DISKSIZE'] = size
			extra_data['AS_DISKUSAGE'] = used
			extra_data['AS_DISKFREE'] = free
			extra_data['AS_DISKUSEDPERCENT'] = (used / size) * 100 if size else 0
			extra_data['AS_DISKFREEPERCENT'] = (free / size) * 100 if size else 0

			self.log(4, f'INFO: Disk Size {size}, Disk Used {used}, Disk Free {free}')
			vcgm = Vcgencmd()
			temp = CPUTemperature().temperature
			temp = round(temp,1)
			
			extra_data['AS_CPUTEMP'] = temp   
			extra_data['AS_CPUTEMP_C'] = temp   

			Device.ensure_pin_factory()
			board_info = Device.pin_factory.board_info
			extra_data['AS_PIMODEL'] = board_info.model
			self.log(4, f'INFO: Pi Model {board_info.model}')

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
			percent = mem.percent
			extra_data['AS_MEMORYTOTAL'] = total_memory
			extra_data['AS_MEMORYUSED'] = used_memory
			extra_data['AS_MEMORYAVAILABLE'] = available_memory
			extra_data['AS_MEMORYUSEDPERCENTAGE'] = percent
			extra_data['AS_MEMORYFREEPERCENTAGE'] = (available_memory / total_memory) * 100

			try:
				with open("/proc/uptime", "r") as f:
					uptime_seconds = float(f.readline().split()[0])
				total_uptime = timedelta(
					seconds=int(uptime_seconds)
				)
				uptime_str = str(total_uptime)
				extra_data['AS_UPTIME'] = uptime_str

				self.log(4, f'INFO: Uptime {uptime_str}')
			except Exception as e:
				self.log(0, f"INFO: ERROR reading /proc/uptime: {e}")
   
			allsky_shared.setLastRun('pistatus')
			allsky_shared.dbUpdate('pistatus', extra_data)
			result = 'PI Status Data Written'
		else:
			extra_data = allsky_shared.dbGet('pistatus')
			result = 'Will run in ' + str(period - diff) + ' seconds'
			
		if extra_data:
			allsky_shared.saveExtraData(self.meta_data["extradatafilename"], extra_data, self.meta_data['module'], self.meta_data['extradata'], event=self.event)
		
		self.log(4, f'INFO: {result}')
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
