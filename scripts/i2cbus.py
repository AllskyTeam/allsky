#!/home/pi/allsky/venv/bin/python3

# TODO
# REPLACE WITH CORRECT PATH AT INSTALL TIME
# sudo usermod -aG i2c www-data

import smbus2
import json

data = {
    "1": {
        "id" : 1,
        "devices": []
    }
}

i2c_bus = smbus2.SMBus(1)

for address in range(0x00, 0x80):
    try:
        i2c_bus.write_quick(address)
        data['1']['devices'].append(hex(address))
    except OSError:
        # Ignore errors; they indicate no device at this address
        pass

i2c_bus.close()
print(json.dumps(data))