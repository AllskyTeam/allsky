import cgi
import os
import json
import re
import time
import locale
from datetime import datetime, timedelta, date

class ALLSKYFORMAT:

    _allSkyVariables = {}

    _config = ""
    _fields = ""
    _settings = None
    
    _jsonConfig = {}
    _jsonFields = {}

    def __init__(self):

        try:
            locale.setlocale(locale.LC_ALL, "")
        except:
            pass

        formData = cgi.FieldStorage()

        self._config = formData["config"].value
        self._fields = formData["fields"].value
        self._jsonConfig = json.loads(self._config)
        self._jsonFields = json.loads(self._fields)
        self._getAllSkyVariables()

    def _getAllSkyVariables(self):
        allskyVariables = {}

        scriptName = f"html{os.environ['SCRIPT_NAME']}"
        scriptFileName = os.environ["SCRIPT_FILENAME"]
        allSkyHome = scriptFileName.replace(scriptName, "")
        allSkyTmp = f"{allSkyHome}tmp"
        allSkyVariableFile = f"{allSkyTmp}/overlaydebug.txt"
        with open(allSkyVariableFile, "r", encoding="ISO-8859-1") as f:
            try:
                for line in f:
                    if line.startswith("AS_"):
                        line = line.strip()
                        firstSpace = line.find(" ")
                        variable = line[:firstSpace]
                        value = line[firstSpace:].strip()
                        self._allSkyVariables[variable] = value
            except Exception as e:
                raise(e)

    def _getFieldType(self, name):
        result = None
        for fieldData in self._jsonFields:
            if fieldData["name"] == name:
                result = fieldData["type"]
                break

        return result

    def _doBoolFormat(self, value, format):
        # allow formats:  %yes %on %true %1
        if value == 1 or value == '1':
            if format == '%yes':
                v = 'Yes'
            else:
                if format == '%on':
                    v = 'On'
                else:
                    if format == '%true':
                        v = 'True'
                    else:
                        if format == '%1':
                            v = '1'
                        else:
                            v = '??'
        else:
            if format == '%yes':
                v = 'No'
            else:
                if format == '%on':
                    v = 'Off'
                else:
                    if format == '%true':
                        v = 'False'
                    else:
                        if format == '%1':
                            v = '0'
                        else:
                            v = '??'

        return v

    def _getEnvironmentVariable(self, name):
        result = None

        try:
            result = os.environ[name]
        except KeyError:
            pass

        return result

    def _readSettings(self):

        settingsFile = self._getEnvironmentVariable("SETTINGS_FILE")
        if settingsFile is None:
            settingsFile = os.path.join(self._getEnvironmentVariable("ALLSKY_HOME"),"config","settings.json")

        with open(settingsFile, "r") as fp:
            self._settings = json.load(fp)

    def _getSetting(self, settingName):

        if self._settings == None:
            self._readSettings()

        result = None
        try:
            result = self._settings[settingName]
        except Exception:
            pass
        
        return result

    def _isUnixTimestamp(self, value):
        isUnixTimestamp = False
        isFloat = False    
        sanityCheckDate = time.mktime((date(2023, 1, 1)).timetuple())

        try:
            value = int(value)
            isInt = True
        except:
            isInt = False
            try:
                value = float(value)
                isFloat = True
            except:
                pass

        if isInt or isFloat:
            if value > sanityCheckDate:
                try:
                    temp = datetime.fromtimestamp(value)
                    isUnixTimestamp = True
                except:
                    pass

        return isUnixTimestamp, value

    def _getValue(self, format, fieldValue, variableType, label):
        value = fieldValue

        if variableType == 'Date':
            internalFormat = self._getSetting('timeformat')
            if label == 'DATE' or label == 'AS_DATE':
                timeStamp = datetime.fromtimestamp(time.time())
                value = timeStamp.strftime(internalFormat)
            else:
                isUnixTimestamp, value = self._isUnixTimestamp(value)
                if isUnixTimestamp:
                    timeStamp = datetime.fromtimestamp(value)
                    value = timeStamp.strftime(internalFormat)

            tempDate = datetime.strptime(value, internalFormat)
            if format is not None:
                try:
                    value = tempDate.strftime(format)
                except Exception:
                    pass            
                
        if variableType == 'Time':
            if label == 'TIME' or label == 'AS_TIME':
                timeStamp = time.localtime(time.time())
                if format is None:
                    value = time.strftime('%H:%M:%S', timeStamp)
                else:
                    value = time.strftime(format, timeStamp)
            else:
                value = fieldValue

        if variableType == 'Number':
            if format is not None and format != "":
                format = "{" + format + "}"
                try:
                    try:
                        convertValue = int(fieldValue)
                    except ValueError:
                        convertValue = float(fieldValue)
                    try:
                        value = format.format(convertValue)
                    except Exception as err:
                        value = "??"
                except ValueError as err:
                    pass

        if variableType == 'Bool':
            if format is None or format == '':
                format = "%yes"
            value = self._doBoolFormat(value, format)

        return value

    def createSampleData(self):
        result = {}
        for index,fieldData in enumerate(self._jsonConfig["fields"]):
            fieldLabel = fieldData["label"]
            regex = r"\$\{.*?\}"
            labelsArray = re.findall(regex, fieldLabel)
            if len(labelsArray) > 0:
                for index,fullLabel in enumerate(labelsArray):
                    label = fullLabel.replace("${", "")
                    label = label.replace("}", "")

                    fieldValue = None
                    if label in self._allSkyVariables:
                        fieldValue = self._allSkyVariables[label]
                    else:
                        labelVariant = f"AS_{label}"
                        if labelVariant in self._allSkyVariables:
                            fieldValue = self._allSkyVariables[labelVariant]

                    if fieldValue is not None:
                        if "format" in fieldData:
                            formats = fieldData["format"].strip()
                            if len(formats) > 0:
                                formatArray = {}
                                if formats.startswith('%'):
                                    formatArray = formats.split(',')
                                else:
                                    regex = r"\{(.*?)\}"
                                    formatArray = re.findall(regex, formats)

                                if len(formatArray) > 0:
                                    if index < len(formatArray):
                                        variableType = self._getFieldType(fullLabel)
                                        format = formatArray[index]
                                        formattedValue = self._getValue(format, fieldValue, variableType, label)
                                        fieldLabel = fieldLabel.replace(fullLabel, str(formattedValue))
                                else:
                                    fieldLabel = fieldLabel.replace(fullLabel, str(fieldValue))
                            else:
                                fieldLabel = fieldLabel.replace(fullLabel, str(fieldValue))
                        else:
                            fieldLabel = fieldLabel.replace(fullLabel, str(fieldValue))

            result[fieldData["id"]] = fieldLabel

        print("Content-type: text/html\n")
        data = {
            "result": "OK",
            "fields": result
        }
        print(json.dumps(data, indent = 4))

try:
    sampleEngine = ALLSKYFORMAT()
    sampleEngine.createSampleData()
except Exception as e:
    print("Content-type: text/html\n")
    data = {
        "result": "ERROR",
        "error": str(e),
        "fields": {}
    }
    print(json.dumps(data, indent = 4))
