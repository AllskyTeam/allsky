#!/usr/bin/python3

import os
import sys
import requests

# Ensure the script is running in the correct Python environment
allsky_home = os.environ['ALLSKY_HOME']
here = os.path.dirname(os.path.abspath(__file__))
venv_dir = os.path.join(allsky_home, 'venv')
venv_python = os.path.join(venv_dir, 'bin', 'python3')
if sys.executable != venv_python:
    os.execv(venv_python, [venv_python] + sys.argv)
    
import json
import serial
import serial.tools.list_ports

try:
    from smbus2 import SMBus
    SMBUS_AVAILABLE = True
except ImportError:
    SMBUS_AVAILABLE = False

def load_family_codes():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    path = os.path.join(script_dir, "../config/onewire.json")
    if os.path.exists(path):
        with open(path, "r") as f:
            return json.load(f)
    return {}

def scan_i2c_bus(bus_num):
    found = []
    if not SMBUS_AVAILABLE:
        return None
    try:
        with SMBus(bus_num) as bus:
            for addr in range(0x03, 0x78):
                try:
                    bus.write_quick(addr)
                    found.append(hex(addr))
                except OSError:
                    continue
        return found
    except FileNotFoundError:
        return None

def load_i2c_metadata():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    path = os.path.join(script_dir, "../config/i2c.json")
    if os.path.exists(path):
        with open(path, "r") as f:
            return json.load(f)
    return {}

def normalise_i2c_key(addr):
    return "0x" + addr[2:].upper()

def get_all_i2c_devices():
    if not SMBUS_AVAILABLE:
        return []

    i2c_metadata = load_i2c_metadata()
    results = []

    for bus_num in [1, 2, 3, 4, 5, 6]:
        addresses = scan_i2c_bus(bus_num)
        if addresses:
            for addr in addresses:
                entry = {
                    "address": addr,
                    "bus": f"i2c-{bus_num}",
                    "devices": i2c_metadata.get(normalise_i2c_key(addr), [])
                }
                results.append(entry)
    return results

def get_onewire_devices(family_codes):
    base_path = "/sys/bus/w1/devices"
    devices = []
    if os.path.exists(base_path):
        for entry in os.listdir(base_path):
            if "-" in entry:
                family = entry.split("-")[0].upper()
                family_info = family_codes.get(family, {})
                description = family_info.get("description", "Unknown type")
                device_list = family_info.get("devices", [])
                devices.append({
                    "id": entry,
                    "type": description,
                    "devices": device_list
                })
    return devices

def try_serial_probe(port, baudrates=[9600, 19200, 38400, 57600, 115200]):
    for baud in baudrates:
        try:
            with serial.Serial(port.device, baudrate=baud, timeout=0.5) as ser:
                lines = []
                for _ in range(10):
                    line = ser.readline()
                    if line:
                        try:
                            lines.append(line.decode(errors='replace').strip())
                        except UnicodeDecodeError:
                            lines.append("<unreadable>")
                    else:
                        break
                if lines:
                    return {
                        "device": port.device,
                        "baud": baud,
                        "data": "\n".join(lines)
                    }
        except (serial.SerialException, OSError):
            continue
    return {
        "device": port.device,
        "baud": None,
        "data": ""
    }

def get_serial_devices():
    ports = serial.tools.list_ports.comports()
    return [try_serial_probe(port) for port in ports]

def get_gpio_status():
    url = "http://localhost:8090/gpio/all"

    try:
        resp = requests.get(url, timeout=5)
        resp.raise_for_status()
        data = resp.json()
    except requests.exceptions.ConnectionError as e:
        data = False        
    except requests.exceptions.RequestException as e:
        data = []
    except ValueError as e:
        data = []
    
    return data


def main():
    family_codes = load_family_codes()

    output = {
        "i2c": get_all_i2c_devices(),
        "onewire": get_onewire_devices(family_codes),
        "serial": get_serial_devices(),
        "gpio": get_gpio_status()
    }

    print(json.dumps(output, indent=2))

if __name__ == "__main__":
    main()