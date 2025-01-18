#!/home/pi/allsky/venv/bin/python3

# TODO
# REPLACE WITH CORRECT PATH AT INSTALL TIME
# sudo usermod -aG i2c www-data

import smbus
import json


bus = smbus.SMBus(1)

data = {
    "1": {
        "id" : 1,
        "devices": []
    }
}

for device in range(128):
    try:
        bus.read_byte(device)
        data['1']['devices'].append(hex(device))
    except Exception as e:
        pass
    
print(json.dumps(data))