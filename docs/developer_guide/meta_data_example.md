# Example Meta Data

```
	meta_data = {
		"name": "ADS-B Aircraft Tracking Data",
		"description": "Provide aircraft data for display on images",
		"module": "allsky_adsb",    
		"version": "v2.0.0",
		"group": "Data Capture",
		"events": [
			"periodic",
			"day",
			"night"
		],
		"enabled": "false",    
		"experimental": "true",
		"testable": "true",  
		"centersettings": "false",
		"extradatafilename": "allsky_adsb.json", 
		"extradata": {
			"database": {
				"enabled": "True",
				"table": "allsky_adsb",
    			"pk": "id",
    			"pk_type": "int",
    			"include_all": "false",       
       			"time_of_day_save": {
					"day": "always",
					"night": "always",
					"nightday": "always",
					"daynight": "always",
					"periodic": "enabled"
				}      
			},      
			"info": {
				"count": 20,
				"firstblank": "false"
			},
			"values": {
				"AS_TOTAL_AIRCRAFT": {
					"group": "ADSB Data",
					"type": "number",                
					"description": "Total Aircraft",
          			"dbtype": "int",
					"database": {
						"include" : "true"
					}     
				},
				"AS_DISTANCE_AIRCRAFT${COUNT}": {
					"group": "ADSB Data",
					"format": "{allsky}",
					"type": "distance",            
					"description": "Aircraft ${COUNT} distance"
				},    
				"AS_AZIMUTH_AIRCRAFT${COUNT}": {
					"group": "ADSB Data",
					"format": "{dp=2|deg}",     
					"type": "azimuth",                
					"description": "Aircraft ${COUNT} azimuth"
				},
				"AS_ELEVATION_AIRCRAFT${COUNT}": {
					"group": "ADSB Data",
					"format": "{dp=2|deg}",     
					"type": "elevation",                
					"description": "Aircraft ${COUNT} elevation"
				},
				"AS_ALTITUDE_AIRCRAFT${COUNT}": {
					"group": "ADSB Data",
					"format": "{flightlevel}",
					"type": "altitude",                
					"description": "Aircraft ${COUNT} altitude"
				},                        
				"AS_TYPE_AIRCRAFT${COUNT}": {
					"group": "ADSB Data",
					"type": "string",                
					"description": "Aircraft ${COUNT} type"
				},              
				"AS_OWNER_AIRCRAFT${COUNT}": {
					"group": "ADSB Data",
					"type": "string",                
					"description": "Aircraft ${COUNT} owner"
				},
				"AS_REGISTRATION_AIRCRAFT${COUNT}": {
					"group": "ADSB Data",
					"type": "string",                
					"description": "Aircraft ${COUNT} registration"
				},
				"AS_MANUFACTURER_AIRCRAFT${COUNT}": {
					"group": "ADSB Data",
					"type": "string",                
					"description": "Aircraft ${COUNT} manufacturer"
				},
				"AS_MILITARY_AIRCRAFT${COUNT}": {
					"group": "ADSB Data",
					"format": "{yesno}",     
					"type": "bool",                
					"description": "Aircraft ${COUNT} military flag"
				},
				"AS_TEXT_AIRCRAFT${COUNT}": {
					"group": "ADSB Data",
					"type": "string",
					"description": "Aircraft ${COUNT} short text (reg, bearing)"
				},
				"AS_LONGTEXT_AIRCRAFT${COUNT}": {
					"group": "ADSB Data",
					"type": "string",                
					"description": "Aircraft ${COUNT} medium text (reg, type, bearing, distance, alt, speed)"
				},
				"AS_SHORT_ROUTE_AIRCRAFT${COUNT}": {
					"group": "ADSB Data",
					"type": "string",                
					"description": "Aircraft ${COUNT} short route (ICAO -> ICAO)"
				},
				"AS_MEDIUM_ROUTE_AIRCRAFT${COUNT}": {
					"group": "ADSB Data",
					"type": "string",                
					"description": "Aircraft ${COUNT} short route (City -> CITY)"
				},
				"AS_LONG_ROUTE_AIRCRAFT${COUNT}": {
					"group": "ADSB Data",
					"type": "string",                
					"description": "Aircraft ${COUNT} long route (ICAO - City -> ICAO - CITY)"
				}
			}
		},
		"arguments":{
			"period": 60,
			"data_source": "Local",
			"aircraft_data": "local",
			"aircraft_route": "true",
			"distance_limit": 50,
			"timeout": 10,
			"local_adsb_url": "",
			"observer_altitude": 0,
			"opensky_username": "",
			"opensky_password": "",
			"opensky_lat_min": 0,
			"opensky_lon_min": 0,
			"opensky_lat_max": 0,
			"opensky_lon_max": 0,
			"airplaneslive_radius": 50
		},
		"argumentdetails": {
			"data_source" : {
				"required": "false",
				"description": "Data Source",
				"help": "The source for the ASB-D data.",
				"tab": "Data Source",
				"type": {
					"fieldtype": "select",
					"values": "Local,OpenSky,AirplanesLive,adsbfi",
					"default": "Local"
				}
			},        
	
			"noticeal" : {
				"tab": "Data Source",      
				"message": "There are no settings required for AirplanesLive",
				"type": {
					"fieldtype": "text",
					"style": {
						"width": "full",
						"alert": {
							"class": "info"
						}
					}
				},
				"filters": {
					"filter": "data_source",
					"filtertype": "show",
					"values": [
						"AirplanesLive"
					]
				}              			
			}, 
			"noticefi" : {
				"tab": "Data Source",      
				"message": "There are no settings required for adsbfi",
				"type": {
					"fieldtype": "text",
					"style": {
						"width": "full",
						"alert": {
							"class": "info"
						}
					}
				},
				"filters": {
					"filter": "data_source",
					"filtertype": "show",
					"values": [
						"adsbfi"
					]
				}              			
			},    
			"local_adsb_url": {
				"required": "false",
				"description": "Local ADS-B Address",
				"help": "See the help for how to obtain this address.",
				"tab": "Data Source",
				"secret": "true",
				"filters": {
					"filter": "data_source",
					"filtertype": "show",
					"values": [
						"Local"
					]
				}             
			},
			"opensky_username": {
				"required": "false",
				"description": "OpenSky Username",
				"help": "Your Opensky Network username. See the module documentation for details on the API limits with and without a username.",
				"tab": "Data Source",
				"secret": "true",    
				"filters": {
					"filter": "data_source",
					"filtertype": "show",
					"values": [
						"OpenSky"
					]
				}            
			},
			"opensky_password": {
				"required": "false",
				"description": "OpenSky Password",
				"help": "Your Opensky Network password.",
				"tab": "Data Source",
				"secret": "true",    
				"filters": {
					"filter": "data_source",
					"filtertype": "show",
					"values": [
						"OpenSky"
					]
				}            
			},        
			"opensky_lat_min": {
				"required": "false",
				"description": "Min latitude",
				"help": "The minimum latitude of the bounding box. Use a site like http://bboxfinder.com/ to determine the bounding box.",
				"tab": "Data Source",
				"filters": {
					"filter": "data_source",
					"filtertype": "show",
					"values": [
						"OpenSky"
					]
				}            
			},
			"opensky_lon_min": {
				"required": "false",
				"description": "Min longitude",
				"help": "The minimum longitude of the bounding box.",
				"tab": "Data Source",
				"filters": {
					"filter": "data_source",
					"filtertype": "show",
					"values": [
						"OpenSky"
					]
				}            
			},
			"opensky_lat_max": {
				"required": "false",
				"description": "Max latitude",
				"help": "The minimum latitude of the bounding box.",
				"tab": "Data Source",
				"filters": {
					"filter": "data_source",
					"filtertype": "show",
					"values": [
						"OpenSky"
					]
				}            
			},
			"opensky_lon_max": {
				"required": "false",
				"description": "Max longitude",
				"help": "The maximum longitude of the bounding box.",
				"tab": "Data Source",
				"filters": {
					"filter": "data_source",
					"filtertype": "show",
					"values": [
						"OpenSky"
					]
				}            
			},
			"aircraft_data" : {
				"required": "false",
				"description": "Aircraft Type Data Source",
				"help": "The source for the aircraft data, see the documentaiton for details.",
				"tab": "Settings",
				"type": {
					"fieldtype": "select",
					"values": "Local,Hexdb",
					"default": "Local"
				}
			},
			"aircraft_route" : {
				"required": "false",
				"description": "Get flight route",
				"help": "Get the flight's route if possible.",
				"tab": "Settings",
				"type": {
					"fieldtype": "checkbox"
				}          
			},
			"distance_limit" : {
				"required": "true",
				"description": "Limit Distance",
				"help": "Only include aircraft inside this distance.",
				"tab": "Settings",                        
				"type": {
					"fieldtype": "spinner",
					"min": 0,
					"max": 250,
					"step": 1
				}
			},         
			"observer_altitude" : {
				"required": "true",
				"description": "Altitude",
				"help": "Your altitude in metres.",
				"tab": "Settings",                        
				"type": {
					"fieldtype": "spinner",
					"min": 0,
					"max": 1000,
					"step": 10
				}
			},
			"period" : {
				"required": "true",
				"description": "Read Every",
				"help": "Read data every x seconds. Be careful of any API limits when setting this.",
				"tab": "Settings",                          
				"type": {
					"fieldtype": "spinner",
					"min": 60,
					"max": 1440,
					"step": 1
				}
			},
			"timeout" : {
				"required": "true",
				"description": "Timeout",
				"help": "The number of seconds to wait for a response from the API before aborting.",
				"tab": "Settings",                        
				"type": {
					"fieldtype": "spinner",
					"min": 1,
					"max": 20,
					"step": 1
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
		"businfo": [
		],
		"changelog": {
			"v1.0.0" : [
				{
					"author": "Alex Greenland",
					"authorurl": "https://github.com/allskyteam",
					"changes": "Initial Release"
				}
			],
			"v2.0.0" : [
				{
					"author": "Alex Greenland",
					"authorurl": "https://github.com/allskyteam",
					"changes": "Updates for new module system"
				}
			]   
		}
	}
```