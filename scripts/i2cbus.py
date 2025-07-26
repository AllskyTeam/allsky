#!/usr/bin/python3

import smbus2
import json
import glob
import re

data = {}

def get_i2c_buses(valid_buses={1, 2, 3, 4, 5, 6}):
    i2c_devices = glob.glob('/dev/i2c-*')
    buses = []
    for path in i2c_devices:
        match = re.search(r'/dev/i2c-(\d+)', path)
        if match:
            buses.append(int(match.group(1)))
    found = sorted(buses)
    return [bus for bus in found if bus in valid_buses]


available_buses = get_i2c_buses()

for bus in available_buses:
    data[bus] = {
        "id": bus,
        "devices": []
    }
    try:
        i2c_bus = smbus2.SMBus(bus)

        for address in range(0x00, 0x80):
            try:
                i2c_bus.write_quick(address)
                data[bus]['devices'].append(hex(address))
            except OSError:
                # Ignore errors; they indicate no device at this address
                pass
        i2c_bus.close()
    except Exception:
        # Ignore errors; this will probably be i2c disabled on the pi
        pass
    

print(json.dumps(data))