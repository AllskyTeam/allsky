In this tutorial we will write a module that accesses an I²C sensor to get temperature data. We will use the [Adafruit sht40](https://learn.adafruit.com/adafruit-sht40-temperature-humidity-sensor/overview){ target="_blank" rel="noopener" .external } sensor.

!!! important  "Important"
 
    - Please ensure you have read the simple tutorial before this one as the basics covered in the simple tutorial will not be covered 
    - This tutorial requires additional hardware and basic understanding of the Pi's GPIO pins
    - Please ensure the Allsky Environment module is installed as this will install the dependencies for this example module

Connect the SHT40 to the PI as shown in the following diagram, the pin connections are the same for the pi3, 4 and 5

![SHT40 Wiring](/assets/developer_images/sht40.png) 
/// caption 
The SHT40 wiring
///


Lets start with the basic framework for the module, this does nothing other than allow you to add the module to the periodic pipeline

```python
import allsky_shared as allsky_shared
from allsky_base import ALLSKYMODULEBASE

class ALLSKYEXAMPLE2(ALLSKYMODULEBASE):

  meta_data = {
    "name": "Allsky Example I²C Module",
    "description": "A simple example module to read an sht40 sensor.",
    "module": "allsky_example1",    
    "version": "v1.0.0",
    "group": "Data Capture",
    "events": [
      "periodic"
    ],
    "enabled": "false",    
    "experimental": "true",
    "testable": "true",  
    "centersettings": "false",
    "extradatafilename": "allsky_example2.json", 
    "extradata": {
    },
    "arguments":{
    },
    "argumentdetails": {                  
    },
    "businfo": [
    ],
    "changelog": {
      "v1.0.0" : [
        {
          "author": "Alex Greenland",
          "authorurl": "https://github.com/allskyteam",
          "changes": "Initial Release"
        }
      ] 
    }
  }

  
  def run(self) -> str:
    result = ""
    extra_data = {}

    self.log(4, result)
            
    return result

def example2(params, event) -> str:
      allsky_example2 = ALLSKYEXAMPLE2(params, event)
      result = allsky_example2.run()

      return result    
  
def example2_cleanup():   
      moduleData = {
          "metaData": ALLSKYEXAMPLE2.meta_data,
          "cleanup": {
              "files": {
                  ALLSKYEXAMPLE2.meta_data['extradatafilename']
              },
              "env": {}
          }
      }
      allsky_shared.cleanupModule(moduleData)
```

The next thing we need to do is to add any settings we need for the sensor. We will only require one settings that allows the I²C address to be changed if needed. Noramlly you would not need to do this but adding the setting will show how the I²C device can be selected from a list.

Modify the meta data to include the I²C address field

```python
  meta_data = {
    "name": "Allsky Example I²C Module",
    "description": "A simple example module to read an sht40 sensor.",
    "module": "allsky_example1",    
    "version": "v1.0.0",
    "group": "Data Capture",
    "events": [
      "periodic"
    ],
    "enabled": "false",    
    "experimental": "true",
    "testable": "true",  
    "centersettings": "false",
    "extradatafilename": "allsky_example2.json", 
    "extradata": {
    },
    "arguments":{
      "I²Caddress": ""     
    },
    "argumentdetails": {           
      "I²Caddress": {
        "required": "false",
        "description": "I²C Address",
        "help": "Override the standard I²C address for a device. NOTE: This value must be hex, i.e., 0x76.",
        "type": {
          "fieldtype": "I²C"
        }           
      }             
    },
    "businfo": [
    ],
    "changelog": {
      "v1.0.0" : [
        {
          "author": "Alex Greenland",
          "authorurl": "https://github.com/allskyteam",
          "changes": "Initial Release"
        }
      ] 
    }
  }
```

Next we need to add the code to read the sensor, see the notes at the top of this page regardin installing the Environment module to get the correct dependencies.

Add the following imports at the top of the module

```python
from typing import Optional, Dict, Tuple, Any

import board
import busio
import adafruit_sht4x
```

Next add a method to read the sensor

```python
  def _read_sht40(self, address: int = 0x44) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:

      try:
        if not isinstance(address, int) or not (0x03 <= address <= 0x77):
          return None, f"Invalid I²C address: {address}"

        try:
          I²C = busio.I²C(board.SCL, board.SDA)
        except Exception as e:
          return None, f"Failed to initialise I²C bus: {e}"

        try:
          sensor = adafruit_sht4x.SHT4x(I²C, address=address)
        except Exception as e:
          return None, f"SHT40 not found at I²C address 0x{address:02X}: {e}"

        try:
          sensor.mode = adafruit_sht4x.Mode.NOHEAT_HIGHPRECISION
        except Exception:
          pass

        try:
          temperature, humidity = sensor.measurements
        except Exception as e:
          return None, f"Sensor read failed: {e}"

        if temperature is None or humidity is None:
          return None, "Sensor returned empty values"

        return {
          "temperature_c": round(float(temperature), 2),
          "temperature_f": round(float(temperature) * 9 / 5 + 32, 2),
          "humidity": round(float(humidity), 2),
          "serial_number": getattr(sensor, "serial_number", None),
          "address": f"0x{address:02X}"
        }, None

      except Exception as e:
        return None, f"Unexpected error: {e}"
```

Now modify the run function to use it

```python
  def run(self) -> str:
    result = ""
    extra_data = {}

    I²C_address = self.get_param("I²Caddress", 0x44, int) 
    
    data, error = self._read_sht40(I²C_address)

    if error:
        result = f"ERROR: SHT40 error: {error}"
    else:
      extra_data["AS_EXAMPLE2_TEMP"] = data["temperature_c"]
      extra_data["AS_EXAMPLE2_HUMIDITY"] = data["humidity"]
      
      result = f"INFO: sht40 read temp_c={data['temperature_c']}, temp_f={data['temperature_f']}, humidity={data['humidity']}, serial={data['serial_number']}, address={data['address']}"
    
    self.log(4, result)
            
    return result
```

And finally add the extra data config to the meta_data 

```python
  meta_data = {
    "name": "Allsky Example I²C Module",
    "description": "A simple example module to read an sht40 sensor.",
    "module": "allsky_example1",    
    "version": "v1.0.0",
    "group": "Data Capture",
    "events": [
      "periodic"
    ],
    "enabled": "false",    
    "experimental": "true",
    "testable": "true",  
    "centersettings": "false",
    "extradatafilename": "allsky_example2.json", 
    "extradata": {
      "values": {
        "AS_EXAMPLE2_TEMP": {
          "name": "${EXAMPLE2_TEMP}",
          "format": "",
          "sample": "",                
          "group": "User",
          "description": "Temperature from the sht40",
          "type": "temperature"
        },
        "AS_EXAMPLE2_HUMIDITY": {
          "name": "${EXAMPLE2_HUMIDITY}",
          "format": "",
          "sample": "",                 
          "group": "User",
          "description": "Pressure from the sht40",
          "type": "number"
        }
      }
    },
    "arguments":{
      "I²Caddress": ""     
    },
    "argumentdetails": {           
      "I²Caddress": {
        "required": "false",
        "description": "I²C Address",
        "help": "Override the standard I²C address for a device. NOTE: This value must be hex, i.e., 0x76.",
        "type": {
          "fieldtype": "I²C"
        }           
      }             
    },
    "businfo": [
    ],
    "changelog": {
      "v1.0.0" : [
        {
          "author": "Alex Greenland",
          "authorurl": "https://github.com/allskyteam",
          "changes": "Initial Release"
        }
      ] 
    }
  }
```

And thats it a fully functioning module to read the temperature and pressure from an SHT40