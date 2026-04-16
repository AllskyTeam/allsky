Lets build a simple module. The module will

- Read data from a json file somewhere in the filesystem
- Extract a value from the json file and create an allsky variable

!!! tip  "Tip"
 
    This module has the 'testable' meta_data value set. This means that you can add the module to a pipeline and use the test button in the module settings to check on progress. 

We will be using the following json file so create a file somewhere on the pi and add the following contents to it.

```json
{
  "example": 21.22,
  "example1": 45.01
}
```

### Basic Framework
First we need the very basic framework for a module

```python
import allsky_shared as allsky_shared
from allsky_base import ALLSKYMODULEBASE

class ALLSKYEXAMPLE(ALLSKYMODULEBASE):

  meta_data = {
    "name": "Allsky Example Module",
    "description": "A simple example module for Allsky.",
    "module": "allsky_example",    
    "version": "v1.0.0",
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
    "extradatafilename": "allsky_example.json", 
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

  def run(self):
    result = ''

    return result
  
def example(params, event):
	allsky_example = ALLSKYEXAMPLE(params, event)
	result = allsky_example.run()

	return result    
    
def example_cleanup():   
	moduleData = {
	    "metaData": ALLSKYEXAMPLE.meta_data,
	    "cleanup": {
	        "files": {
	            ALLSKYEXAMPLE.meta_data['extradatafilename']
	        },
	        "env": {}
	    }
	}
	allsky_shared.cleanupModule(moduleData)
```

This will allow the module to be displayed in the module manager for the relevant pipelines but it wont actually do anything just yet.

### Add Arguments
Next we need to add some fields that specify where the file is that contains the json data. This is accomplished by adding values to the ```arguments``` and ```argumentsdetails``` sections of the ```meta_data```

Change the ```arguments``` and ```argumentdetails``` section of the ```meta_data``` variable to the following

```python
    "arguments":{
      "filename": ""
    },
    "argumentdetails": {
      "filename": {
        "required": "true",
				"description": "Filename",
        "help": "The location of the json file to read data from"
      }                
    },
```

This adds a field called ```Filename``` to the module options

### Use the arguments
Next we need to make use of the arguments to read the json file.

Change the ```run``` module method to the following

```python
  def run(self):
    result = ""

    file_name = self.get_param("filename", "", str, True) 
    
    json_data = allsky_shared.load_json_file(file_name)
      
    if json_data:
      pass
    else:
      result = f"ERROR: File {file_name} does not contain valid JSON."

      
    return result
```

A couple of important points here

  - ```self.get_param``` has been used to get the value entered in the module manager. This method must be used to access all values from the module manager. Refer to the [Base Class](../../allsky_base.md){ target="_blank" rel="noopener" .external } documentation for details of this method.
  - The ```load_json_file``` helper function from the ```allsky_shared``` module is used to read the json file. This makes reading json files a lot easier. Refer to the [Shared Module](../../allsky_shared.md){ target="_blank" rel="noopener" .external } documentation for details of this method.
  - Note how the result variable is set in any error condition to ensure we have more than an empty string returned.

### Create The Allsky Variable
Next we need to use the data from the json file to create the allsky variable, which will be available in the overlay manager

Change the ```run``` module method to the following

```python
  def run(self):
    result = ""

    file_name = self.get_param("filename", "", str, True) 
    
    json_data = allsky_shared.load_json_file(file_name)
      
    if json_data:
      if "example" in json_data:
        value = json_data["example"]
        extra_data = {}
        extra_data["AS_EXAMPLE"] = value
        allsky_shared.save_extra_data(self.meta_data['extradatafilename'], extra_data, 'internal')
        result = f"INFO: Data read from {file_name} and variable AS_EXAMPLE created"
      else:
        result = f"ERROR: The 'example' value is missing from the json file"
        
    else:
      result = f"ERROR: File {file_name} does not contain valid JSON."

    self.log(4, result)
    
    return result
```

This creates the extra_data dict and then calls the ```allsky_shared.save_extra_data``` method to actually save the data. This will create a file in ```~/allsky/tmp/extra``` called ```allsky_example.json``` containing the variable and value, this can then be used in the overlay editor

### Define the Allsky Variable

In the example above Allsky knows nothing about what the variable you have created is, this will cause limitations in the overlay editor.

To get the best out of the overlay editor it needs to understand what the variable you have created actually is. The ```meta_data``` structure can be used to define the variable in more detail

Change the ```meta_data``` structure to the following

```python
  meta_data = {
    "name": "Allsky Example Module",
    "description": "A simple example module for Allsky.",
    "module": "allsky_example",    
    "version": "v1.0.0",
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
    "extradatafilename": "allsky_example.json", 
    "extradata": {
      "values": {
        "AS_EXAMPLE": {
          "name": "${EXAMPLE}",
          "format": "{dp=0|per}",
          "sample": "",                   
          "group": "User",
          "description": "My Example Value",
          "type": "number"
        }
      }      
    },
    "arguments":{
      "filename": ""
    },
    "argumentdetails": {
      "filename": {
        "required": "true",
        "description": "Filename",
        "help": "The location of the json file to read data from"
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


This adds the ```extradata``` section that defines the variable(s) the module is going to create. The structure of this ection is detailed in [Meta Data](../meta_data_structure.md){ target="_blank" rel="noopener" .external } Documentation.

In the definition we added we are telling Allsky that 

- the variable is number, formatted to 0 decimal places with a percent sign added
- The variable will be displayed in a group called 'User' in the Variable Manager

### Adding more variables

Our json file contains a second value so lets add that as well by adding the new variable to the ```meta_data``` and setting it in the ```run``` method

Make the following changes

```python
  meta_data = {
    "name": "Allsky Example Module",
    "description": "A simple example module for Allsky.",
    "module": "allsky_example",    
    "version": "v1.0.0",
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
    "extradatafilename": "allsky_example.json", 
    "extradata": {
      "values": {
        "AS_EXAMPLE": {
          "name": "${EXAMPLE}",
          "format": "{dp=0|per}",
          "sample": "",                   
          "group": "User",
          "description": "My Example Value",
          "type": "number"
        },
        "AS_EXAMPLE1": {
          "name": "${EXAMPLE1}",
          "format": "{dp=2}",
          "sample": "",                   
          "group": "User",
          "description": "My Example Value 2",
          "type": "number"
        }        
      }      
    },
    "arguments":{
      "filename": ""
    },
    "argumentdetails": {
      "filename": {
        "required": "true",
        "description": "Filename",
        "help": "The location of the json file to read data from"
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

```python
  def run(self):
    result = ""

    file_name = self.get_param("filename", "", str, True) 
    
    json_data = allsky_shared.load_json_file(file_name)
      
    if json_data:
      if "example" in json_data and "example1" in json_data:
        extra_data = {}
        extra_data["AS_EXAMPLE"] = json_data["example"]
        extra_data["AS_EXAMPLE1"] = json_data["example1"]
        allsky_shared.save_extra_data(self.meta_data['extradatafilename'], extra_data, self.meta_data['module'], self.meta_data['extradata'])
        result = f"INFO: Data read from {file_name} and variable AS_EXAMPLE created"
      else:
        result = f"ERROR: The 'example' and 'example1' values are missing from the json file"
        
    else:
      result = f"ERROR: File {file_name} does not contain valid JSON."

    self.log(4, result)
    
    return result
```

Now when you test the module two variables are created. Note that the second variable differs from the first in that its formatted to 2 decimal places
