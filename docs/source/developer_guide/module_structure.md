# Module Structure

## Anatomy of a module

Modules can be implemented in a number of ways but only the preferred method is documented here.
A module is essentially a Python script consisting of two methods

- A method that is called by Core Allsky to actually run the module
- A method that is called by Core Allsky when the module is removed from a pipeline, this allows the module to clearup any data


```
import allsky_shared as allsky_shared
from allsky_base import ALLSKYMODULEBASE

class ALLSKTUTORIAL(ALLSKYMODULEBASE):
    meta_data = {
    }

    def run(self):
        result = ""
        return result
  
def tutorial(params, event):
    allsky_tutorial = ALLSKTUTORIAL(params, event)
    result = allsky_tutorial.run()
    return result 

def tutorial_cleanup():
    moduleData = {
        "metaData": ALLSKTUTORIAL.meta_data,
        "cleanup": {
            "files": {
                ALLSKTUTORIAL.meta_data["extradatafilename"]
            },
            "env": {}
        }
    }
    allsky_shared.cleanupModule(moduleData)

```


 
Breaking this down we have

### Two imports that

-	Import the allsky_shared module, this is a library of functions that a module can use.
-	Import of the base module. The is a base class providing helper functions for a module

### A class definition (ALLSKYTUTORIAL)

that extends the base module (ALLSKYBASE) we imported. Note that the class can be called anything but as a convention its ALLSKY plus the module name all in upper case

A meta_data variable. This is described later and contains all of the definitions required for the module

A run function, this is the convention we use to run a module. This function must return the result of the module as a string, this is displayed in the module debug dialog.

### The module entry point (tutorial)

Every module requires this function. This is the function called by core Allsky to start the module.

There are two parameters provided to this function

**params** – These are the values the user has set for the module in the module manager

**event** – This is the pipeline(flow) the module was called from

In this function we would create a new instance of the module class passing the params and event variables then call the run method

Your class does not need a constructor, that’s handled by the base class. If for some reason you do need a constructor then you must ensure that base class constructor is also called

### The module cleanup entry point (tutorial_cleanup)

This function is called by core Allsky when a module is remove from a pipeline. This is to allow the module to cleanup any data required. A core function is provided that you can call that will handle all of the cleanup.

This entry point is optional. If the module does not create any extra data for the overlays then there is no need to provide this function.
