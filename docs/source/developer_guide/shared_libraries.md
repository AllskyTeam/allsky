### The Allsky Base Module
Every module class must extend this base class. The base class does the following
In the constructor;

-	saves the params and event into class variables  
-	Determines if the module is running in debug mode (i.e. from the test button in the module manager)  
-	Converts any legacy meta data structures to the new meta data structure

It also provides the following functions that the module class should use;

#### get_parm
This function is used to get a parameter from the module settings. Whilst this can be accessed in the params variable this is not encouraged. The function  accepts the following parameters

|Parameter	|Description|
|-----|-----------|
|param	|The parameter to get, this is the name of the value in the arguments section|
|default	|The default value for the parameter|
|target_type	|The Python type of the variable to return|
|Use_default_if_blank	|If the target_type is a string (str) and the found value for the param is an empty tring then use the default value if this parameter is True|

#### log
This function logs data to either the console or Allsky debug logs. The function  accepts the following parameters

|Parameter	|Description|
|-----|-----------|
|level	|The Allsky log level, below this nothing wil be logged|
|message	|The message to log|
|preventNewLine	|(Optional) If True no newline will be added at the end of the log message|
|exitCode	|(Optional) Exit code – Not normally used|
|sendToAllsky	|(Optional) – Not normally used|

!!! info  "Detailed SDK"

    For more details on these functions see the SDK Reference

### The Allsky Shared Module
The shared module provides a huge library of functions that can assist module developers.

!!! info  "Detailed SDK"

    For more details on these functions see the SDK Reference