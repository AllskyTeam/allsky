'''
allsky_pistatus.py

Part of allsky postprocess.py modules.
https://github.com/thomasjacquin/allsky

'''
import allsky_shared as s
import os
import shutil
from vcgencmd import Vcgencmd

metaData = {
    "name": "Reads Pi Status",
    "description": "Reads Pi Data",
    "module": "allsky_pistatus",    
    "version": "v1.0.0",    
    "events": [
        "periodic"
    ],
    "experimental": "true",    
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

def formatSize(bytes):
    try:
        bytes = float(bytes)
        kb = bytes / 1024
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
    shouldRun, diff = s.shouldRun('pistatus', period)
    
    if shouldRun:
        data = {}
        usage = shutil.disk_usage("/")
        size = formatSize(usage[0])
        used = formatSize(usage[1])
        free = formatSize(usage[2])

        data['AS_DISKSIZE'] = str(size)
        data['AS_DISKUSAGE'] = str(used)
        data['AS_DISKFREE'] = str(free)

        vcgm = Vcgencmd()
        temp = vcgm.measure_temp()
        temp = round(temp,1)
        tempUnits = s.getSetting("temptype")
        if tempUnits == 'B':
            data['AS_CPUTEMP_C'] = str(temp)
            temp = (temp * (9/5)) + 32
            temp = round(temp,1)
            data['AS_CPUTEMP_F'] = str(temp)
        else:
            if tempUnits == 'F':
                temp = (temp * (9/5)) + 32
                temp = round(temp,1)
            data['AS_CPUTEMP'] = str(temp)

        throttled = vcgm.get_throttled()
        data['AS_THROTTLEDBINARY'] = str(throttled['raw_data'])
        text = []
        for bit in tstats:
            key = 'AS_TSTAT' + bit
            data[key] = str(throttled['breakdown'][bit])
            if throttled['breakdown'][bit]:
                textKey = key + 'TEXT'
                data[textKey] = tstats[bit]
                text.append(tstats[bit])

        tstatText = ", ".join(text)
        data['AS_TSTATSUMARYTEXT'] = tstatText

        clockSources = vcgm.get_sources('clock')
        for source in clockSources:
            try:
                speed = vcgm.measure_clock(source)
                data['AS_CLOCK' + source.upper()] = str(speed / 1000000000)
            except:
                pass
            
        voltageSources = vcgm.get_sources('volts')
        for source in voltageSources:
            try:
                voltage = vcgm.measure_volts(source)
                data['AS_VOLTAGE' + source.upper()] = str(voltage)
            except:
                pass
        
        s.setLastRun('pistatus')
        s.dbUpdate('pistatus', data)
        result = 'PI Status Data Written'
    else:
        data = s.dbGet('pistatus')
        result = 'Will run in ' + str(period - diff) + ' seconds'
        
    if data:
        s.saveExtraData("pistatus.json", data)
    
    s.log(1,'INFO: ' + result)
    return result