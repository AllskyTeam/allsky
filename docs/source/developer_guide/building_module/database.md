In this tutorial we will modify the API module to save values to the Allsky database

!!! warning  "Warning"
 
    Please ensure you have read the simple tutorial before this one as the basics covered in the simple tutorial will not be covered

Saving values to the database, for example to using in charts, is accomplished by modifying the ```extradata``` section in the ```meta_data```

Start by taking the API example and renaming everything to example3 and add the humidity variable

```python
import requests
from typing import Any, Dict, Optional, Tuple
import allsky_shared as allsky_shared
from allsky_base import ALLSKYMODULEBASE

class ALLSKYEXAMPLE3(ALLSKYMODULEBASE):

  meta_data = {
    "name": "Allsky Example Database Module",
    "description": "A simple example module for Allsky to save data to the database.",
    "module": "allsky_example3",    
    "version": "v1.0.0",
    "group": "Data Capture",
    "events": [
      "periodic"
    ],
    "enabled": "false",    
    "experimental": "true",
    "testable": "true",  
    "centersettings": "false",
    "extradatafilename": "allsky_example3.json", 
    "extradata": {       
      "values": {
        "AS_EXAMPLE3_TEMP": {
          "name": "${EXAMPLE3_TEMP}",
          "format": "{dp=2|deg}",
          "sample": "",                   
          "group": "User",
          "description": "Temp from Openweather API",
          "type": "number"
        },
        "AS_EXAMPLE3_HUMIDITY": {
          "name": "${EXAMPLE3_HUMIDITY}",
          "format": "{dp=0|per}",
          "sample": "",                   
          "group": "User",
          "description": "Humidity from Openweather API",
          "type": "number"
        }        
      }
    },
    "arguments":{
      "owapikey": "",
      "units": "metric"
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
      extra_data["AS_EXAMPLE3_TEMP"] = float(data["main"]["temp"])
      extra_data["AS_EXAMPLE3_HUMIDITY"] = float(data["main"]["humidity"])
      
      allsky_shared.save_extra_data(self.meta_data['extradatafilename'], extra_data, self.meta_data['module'], self.meta_data['extradata'])
      result = f"INFO: Data read from Openweather API and variables created"      

    self.log(4, result)
            
    return result

def example3(params, event) -> str:
      allsky_example3 = ALLSKYEXAMPLE3(params, event)
      result = allsky_example3.run()

      return result    
  
def example3_cleanup():   
      moduleData = {
          "metaData": ALLSKYEXAMPLE3.meta_data,
          "cleanup": {
              "files": {
                  ALLSKYEXAMPLE3.meta_data['extradatafilename']
              },
              "env": {}
          }
      }
      allsky_shared.cleanupModule(moduleData)
```

Next we modify the ```extradata``` section of the ```meta_data``` to tell Allsky how to manage the extra data in the database

Change the ```extradata``` section to the following

```python
    "extradata": {    
			"database": {
				"enabled": "True",
				"table": "allsky_example3",
				"include_all": "true",
    		"pk": "id",
    		"pk_type": "int",    
       	"time_of_day_save": {
					"day": "always",
					"night": "always",
					"nightday": "always",
					"daynight": "always",
					"periodic": "always"
				}      
			},        
      "values": {
        "AS_EXAMPLE3_TEMP": {
          "name": "${EXAMPLE3_TEMP}",
          "format": "{dp=2|deg}",
          "sample": "",                   
          "group": "User",
          "description": "Example3 Temp from Openweather API",
          "type": "number"
        },
        "AS_EXAMPLE3_HUMIDITY": {
          "name": "${EXAMPLE3_HUMIDITY}",
          "format": "{dp=0|per}",
          "sample": "",                   
          "group": "User",
          "description": "Example3 Humidity from Openweather API",
          "type": "number"
        }        
      }
    }
```

This adds the database section that will

  - Create a table called ```allsky_example3```
  - Include ALL of the data from the ```values``` section i.e. all of the extra data
  - use a sequential primary key
  - Allways save data for each pipeline


![Example3 db](/assets/developer_images/dbexample3.png) 
/// caption 
The resulting database table
///

![Example3 db](/assets/developer_images/examplechart.png) 
/// caption 
The fields available when creating a custom chart
///


There may be instances where you do not want to save all of the data to the database. If we only wanted to save the temperature and not the humidity we would change the ```metadata`` section as follows

```python
    "extradata": {    
      "database": {
        "enabled": "True",
        "table": "allsky_example3",
        "include_all": "false",
        "pk": "id",
        "pk_type": "int",    
        "time_of_day_save": {
          "day": "always",
          "night": "always",
          "nightday": "always",
          "daynight": "always",
          "periodic": "always"
        }      
      },          
      "values": {
        "AS_EXAMPLE3_TEMP": {
          "name": "${EXAMPLE3_TEMP}",
          "format": "{dp=2|deg}",
          "sample": "",                   
          "group": "User",
          "description": "Example 3 Temp from Openweather API",
          "type": "number",
          "dbtype": "float",     
          "database": {
            "include" : "true"
          }          
        },
        "AS_EXAMPLE3_HUMIDITY": {
          "name": "${EXAMPLE3_HUMIDITY}",
          "format": "{dp=0|per}",
          "sample": "",                   
          "group": "User",
          "description": "Example 3 Humidity from Openweather API",
          "type": "number"
        }        
      }
    }
```

This modfifies the ```meta_data``` to

- Not add every field to the database automatically
- Sets the database type for the Temperature field
- Saves the temperature field to the database
- Since the Humidity field has no database settings it will not be saved

![Example3-1 db](/assets/developer_images/dbexample3-1.png) 
/// caption 
The resulting database table when only saving one value
///

### Database Rules

  - Only store numeric values, text values are of little use at present
  - Be mindful of data volumes, don't store huge amounts of data
  - Ensure your plugin provides the db config purge information

 