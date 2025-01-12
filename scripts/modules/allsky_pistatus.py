#TODO: Sort events
'''
allsky_pistatus.py

Part of allsky postprocess.py modules.
https://github.com/AllskyTeam/allsky

'''
import allsky_shared as s
import os
import shutil
from vcgencmd import Vcgencmd
from gpiozero import CPUTemperature, Device

metaData = {
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
	"extradata": {
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
		"period": 60,
		"includeclocks": "false",
		"includevoltages": "false"
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

def formatSize(Bytes):
	try:
		Bytes = float(Bytes)
		kb = Bytes / 1024
	except:
		return "Error"
	if kb >= 1024:
		M = kb / 1024
		if M >= 1024:
			G = M / 1024
			return "%.2fG" % (G)
		else:
			return "%.2fM" % (M)
	else:
		return "%.2fkb" % (kb)

def pistatus(params, event):
	result = ''
	period = int(params['period'])
	includeclocks = params["includeclocks"]
	includevoltages = params["includevoltages"]        
	shouldRun, diff = s.shouldRun('pistatus', period)

	try:
		debugMode = params["ALLSKYTESTMODE"]
	except ValueError:
		debugMode = False
            
	if shouldRun or debugMode:
		data = {}
		usage = shutil.disk_usage("/")
		size = usage[0]
		used = usage[1]
		free = usage[2]

		data['AS_DISKSIZE'] = size
		data['AS_DISKUSAGE'] = used
		data['AS_DISKFREE'] = free

		s.log(4, f'INFO: Disk Size {size}, Disk Used {used}, Disk Free {free}')
		vcgm = Vcgencmd()
		temp = CPUTemperature().temperature
		temp = round(temp,1)
        
		tempUnits = s.getSetting("temptype")
		if tempUnits == 'B':
			data['AS_CPUTEMP_C'] = str(temp)
			temp = (temp * (9/5)) + 32
			temp = round(temp,1)
			data['AS_CPUTEMP_F'] = str(temp)
			s.log(4, f"CPU Temp (C) {data['AS_CPUTEMP_C']}, CPU Temp (F) {data['AS_CPUTEMP_F']}")
		else:
			if tempUnits == 'F':
				temp = (temp * (9/5)) + 32
				temp = round(temp,1)
			data['AS_CPUTEMP'] = str(temp)
			s.log(4, f"INFO: CPU Temp ({tempUnits}) {data['AS_CPUTEMP']}")

		Device.ensure_pin_factory()
		board_info = Device.pin_factory.board_info
		data['AS_PIMODEL'] = board_info.model
		s.log(4, f"INFO: Pi Model {board_info.model}")

		throttled = vcgm.get_throttled()
		text = []
		for bit in tstats:
			if throttled['breakdown'][bit]:
				text.append(tstats[bit])

		if not text:
			tstatText = "No Errors"
		else:
			tstatText = ", ".join(text)
		data['AS_TSTATSUMARYTEXT'] = tstatText

            
		s.setLastRun('pistatus')
		s.dbUpdate('pistatus', data)
		result = 'PI Status Data Written'
	else:
		data = s.dbGet('pistatus')
		result = 'Will run in ' + str(period - diff) + ' seconds'
        
	if data:
		s.saveExtraData("pistatus.json", data, metaData["module"], metaData["extradata"])
    
	s.log(4, f'INFO: {result}')
	return result

def pistatus_cleanup():
	moduleData = {
		"metaData": metaData,
		"cleanup": {
			"files": {
				"pistatus.json"
			},
		"env": {}
		}
	}
	s.cleanupModule(moduleData)
