In this tutorial we will write a module that accesses the Openweathermap api to retrieve weather data

!!! warning  "Warning"
 
    Please ensure you have read the simple tutorial before this one as the basics covered in the simple tutorial will not be covered

!!! warning  "API Limits"
 
    The Openweather map API has limits on the number of requests that can be made using an API key. If you run out of requests then you can create a new API key.

Before using this tutorial you will require an API key to access the API. To get an API key create an account on [Open Weather Map](https://openweathermap.org){ target="_blank" rel="noopener" .external } and create an API key in your account area.

Lets start with the basic framework for the module, after creating this code run add the module to the periodic flow and add your API key then save the module and pipeline

```python
import allsky_shared as allsky_shared
from allsky_base import ALLSKYMODULEBASE

class ALLSKYEXAMPLE1(ALLSKYMODULEBASE):

  meta_data = {
    "name": "Allsky Example API Module",
    "description": "A simple example module for Allsky to access an API.",
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
    "extradatafilename": "allsky_example1.json", 
    "extradata": {
      "values": {
        "AS_EXAMPLE_TEMP": {
          "name": "${EXAMPLE_TEMP}",
          "format": "{dp=0|deg}",
          "sample": "",                   
          "group": "User",
          "description": "Temp from Openweather API",
          "type": "number"
        }
      }
    },
    "arguments":{
      "owapikey": ""
    },
    "argumentdetails": {
      "owapikey": {
        "required": "false",
        "description": "API Key",
        "secret": "true",         
        "help": "Your Open Weather Map API key."            
      },
      "units" : {
        "required": "false",
        "description": "Units",
        "help": "Units of measurement: standard, metric, or imperial.",
        "tab": "Home",            
        "type": {
          "fieldtype": "select",
          "values": "standard,metric,imperial"
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

  def run(self) -> str:
    result = ""

  
    return result

def example1(params, event) -> str:
      allsky_example1 = ALLSKYEXAMPLE1(params, event)
      result = allsky_example1.run()

      return result    
  
def example1_cleanup():   
      moduleData = {
          "metaData": ALLSKYEXAMPLE1.meta_data,
          "cleanup": {
              "files": {
                  ALLSKYEXAMPLE1.meta_data['extradatafilename']
              },
              "env": {}
          }
      }
      allsky_shared.cleanupModule(moduleData)
```

A new concept in this code is the addition of the ```"secret": "true",``` in the api key defintion. This ensures that the valeu in this field is saved int the ```~/allsky/env.json``` file rather than in the pipeline. This is important in that when submitting support info sensitive data will not be included since we never include the env.json file

Next we need to get the weather data for our location from the API. The API uses the follwoing url

```
https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&units={units}&appid={api_key}"
```

So to access this we need to get the latitude, longitude, units and API key for the request.

The shared module provides some handy function to get the latitude and longitude. The units and api key we will get from the modules settings

Add the follwing imports at the top of the module

```python
import requests
from typing import Any, Dict, Optional, Tuple
```

Add the following function to get data from the API

```python
  def _get_weather(
      self,
      lat: float,
      lon: float,
      api_key: str,
      units: str = "metric",
      timeout: int = 10
  ) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
      """
      Fetch current weather from OpenWeather API.

      Returns:
          (data, None) on success
          (None, error_message) on error
      """

      if not api_key:
          return None, "API key is required"

      url = "https://api.openweathermap.org/data/2.5/weather"
      params = {
          "lat": lat,
          "lon": lon,
          "units": units,
          "appid": api_key,
      }

      try:
          response = requests.get(url, params=params, timeout=timeout)
      except requests.exceptions.Timeout:
          return None, "Request timed out"
      except requests.exceptions.ConnectionError:
          return None, "Network connection error"
      except requests.exceptions.RequestException as e:
          return None, f"Unexpected request error: {e}"

      try:
          data = response.json()
      except ValueError:
          return None, "Invalid JSON response from API"

      if not response.ok:
          message = data.get("message", f"HTTP error {response.status_code}")
          return None, f"API error {response.status_code}: {message}"

      if data.get("cod") != 200:
          return None, f"API error: {data.get('message', 'Unknown error')}"

      required_keys = ["weather", "main", "wind", "dt", "name"]
      missing = [k for k in required_keys if k not in data]
      if missing:
          return None, f"Malformed response, missing keys: {missing}"

      return data, None
```

Then modify the run method to extract the required values after calling the function

```python
  def run(self) -> str:
    result = ""
    extra_data = {}
    
    api_key = self.get_param("owapikey", "", str)
    units = self.get_param("units", "", str)
    lat, lon = allsky_shared.get_lat_lon()

    data, error = self._get_weather(lat, lon, api_key, units)

    if error:
      result = f"ERROR: Failed to obtainweather data {error}"
    else:
      extra_data["AS_EXAMPLE1_TEMP"] = float(data["main"]["temp"])
      allsky_shared.save_extra_data(self.meta_data['extradatafilename'], extra_data, self.meta_data['module'], self.meta_data['extradata'])
      result = f"INFO: Data read from Openweather API and variables created"      

    self.log(4, result)
            
    return result
```

When dealing with API's its important to ensure that you handle errors the API may return.

And thats it, you could get other values from the API if needed.