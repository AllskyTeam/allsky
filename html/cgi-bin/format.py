import cgi
import os
import json
import re
import time
from datetime import datetime, timedelta, date

class ALLSKYFORMAT:
    
    _allSkyVariables = {}
    #
    # For testing remove for live
    #
    #_config = '{"fields":[{"label":"${DATE}","x":152,"y":40,"id":"oe-field-0","format":"%d-%m-%Y","strokewidth":0,"sample":"DATE","tlx":0,"tly":0,"fontsize":80,"fill":"#ff0000","font":"Arial","opacity":1,"rotate":0,"stroke":""},{"label":"${TIME}","x":604,"y":40,"id":"oe-field-1","format":"%H:%M:%S","strokewidth":0,"sample":"TIME","tlx":459,"tly":0,"fontsize":80,"fill":"#ff0000","font":"Arial","opacity":1,"rotate":0,"stroke":""},{"label":"Exposure: ${sEXPOSURE}","x":650,"y":214,"id":"oe-field-2","fontsize":68,"strokewidth":0,"tlx":239,"tly":180,"opacity":0.3,"format":",","font":"Arial","fill":"white","rotate":0,"stroke":""},{"label":"Gain: ${GAIN} Â°","x":1515,"y":834,"id":"oe-field-3","fontsize":68,"strokewidth":2,"tlx":1299,"tly":800,"stroke":"#f44336","opacity":0.7,"font":"Arial","fill":"white","format":"","rotate":0},{"label":"${TEMPERATURE_C} Â°","x":1437,"y":646,"id":"oe-field-4","strokewidth":0,"sample":"32","tlx":1159,"tly":620,"format":":.","font":"Arial","fontsize":52,"fill":"white","opacity":1,"rotate":0,"stroke":""},{"label":"EX: ${EXPOSURE_US} ${GAIN} 0x${AUTO_STRETCH_AMOUNT}","x":791,"y":386,"id":"oe-field-5","strokewidth":0,"sample":"10000","tlx":139,"tly":360,"format":"{:,}{}{:x}","font":"Arial","fontsize":52,"fill":"white","opacity":1,"rotate":0,"stroke":""},{"label":"EX: ${EXPOSURE_US} ","x":903,"y":526,"id":"oe-field-6","format":"{:.}","strokewidth":0,"tlx":619,"tly":500,"font":"Arial","fontsize":52,"fill":"white","opacity":1,"rotate":0,"stroke":""},{"label":"${TIME}","x":461,"y":926,"id":"oe-field-7","strokewidth":0,"tlx":319,"tly":900,"font":"Arial","fontsize":52,"fill":"white","opacity":1,"format":"","rotate":0,"stroke":""}],"images":[{"image":"ir.jpg","x":480,"y":1940,"tlx":80,"tly":1640,"id":"oe-field-8","opacity":0.63,"rotate":0,"scale":1,"src":"overlay/images/ir.jpg"}],"settings":{"defaultdatafileexpiry":"550","defaultincludeplanets":true,"defaultincludesun":true,"defaultincludemoon":true,"defaultimagetopacity":0.63,"defaultimagerotation":0,"defaulttextrotation":0,"defaultfontopacity":1,"defaultfontcolour":"white","defaultfont":"Arial","defaultfontsize":52,"defaultimagescale":1,"defaultnoradids":""},"fonts":{"moon_phases":{"fontPath":"fonts/moon_phases.ttf","fonttcolour":"red","backgroundcolor":"white","fontopacity":0.5},"montserrat-thin":{"fontPath":"fonts/Montserrat-Thin.ttf"},"montserrat-extralight":{"fontPath":"fonts/Montserrat-ExtraLight.ttf"},"montserrat-light":{"fontPath":"fonts/Montserrat-Light.ttf"},"montserrat-regular":{"fontPath":"fonts/Montserrat-Regular.ttf"},"montserrat-medium":{"fontPath":"fonts/Montserrat-Medium.ttf"},"montserrat-semibold":{"fontPath":"fonts/Montserrat-SemiBold.ttf"},"montserrat-bold":{"fontPath":"fonts/Montserrat-Bold.ttf"},"montserrat-extrabold":{"fontPath":"fonts/Montserrat-ExtraBold.ttf"},"montserrat-black":{"fontPath":"fonts/Montserrat-Black.ttf"},"montserrat-thinitalic":{"fontPath":"fonts/Montserrat-ThinItalic.ttf"},"montserrat-extralightitalic":{"fontPath":"fonts/Montserrat-ExtraLightItalic.ttf"},"montserrat-lightitalic":{"fontPath":"fonts/Montserrat-LightItalic.ttf"},"montserrat-italic":{"fontPath":"fonts/Montserrat-Italic.ttf"},"montserrat-mediumitalic":{"fontPath":"fonts/Montserrat-MediumItalic.ttf"},"montserrat-semibolditalic":{"fontPath":"fonts/Montserrat-SemiBoldItalic.ttf"},"montserrat-bolditalic":{"fontPath":"fonts/Montserrat-BoldItalic.ttf"},"montserrat-extrabolditalic":{"fontPath":"fonts/Montserrat-ExtraBoldItalic.ttf"},"montserrat-blackitalic":{"fontPath":"fonts/Montserrat-BlackItalic.ttf"},"montserrat-variablefont_wght":{"fontPath":"fonts/Montserrat-VariableFont_wght.ttf"},"montserrat-italic-variablefont_wght":{"fontPath":"fonts/Montserrat-Italic-VariableFont_wght.ttf"}}}'
    #_fields = '[{"id":0,"name":"${DATE}","description":"Date+Image+Taken","format":"%d-%m-%Y","sample":"DATE","type":"Date","source":"System"},{"id":1,"name":"${TIME}","description":"Time+Image+Taken","format":"%H:%M:%S","sample":"TIME","type":"Time","source":"System"},{"id":2,"name":"${TEMPERATURE_C}","description":"Sensor+Temp+in+C+(If+Available)","format":"","sample":"32","type":"Number","source":"System"},{"id":3,"name":"${TEMPERATURE_F}","description":"Sensor+Temp+in+F+(If+Available)","format":"","sample":"32","type":"Number","source":"System"},{"id":4,"name":"${AUTOEXPOSURE}","description":"Auto+Exposure","format":"","sample":"","type":"Bool","source":"System"},{"id":5,"name":"${EXPOSURE_US}","description":"Frame+Exposure+Duration","format":"","sample":"10000","type":"Number","source":"System"},{"id":6,"name":"${sAUTOEXPOSURE}","description":"Frame+Exposure+auto+flag","format":"","sample":"(auto)","type":"Text","source":"System"},{"id":7,"name":"${sEXPOSURE}","description":"Frame+Exposure+auto+String","format":"","sample":"32.00+ms+(0.03+sec)","type":"Text","source":"System"},{"id":8,"name":"${AUTOGAIN}","description":"Auto+Gain","format":"","sample":"","type":"Bool","source":"System"},{"id":9,"name":"${GAIN}","description":"Camera+Gain","format":"","sample":"180","type":"Number","source":"System"},{"id":10,"name":"${sAUTOGAIN}","description":"Camera+Gain+auto+flag","format":"","sample":"(Auto)","type":"Text","source":"System"},{"id":11,"name":"${BRIGHTNESS}","description":"Brightness","format":"","sample":"50","type":"Number","source":"System"},{"id":12,"name":"${MEAN}","description":"Mean+Brightness","format":"","sample":"","type":"Number","source":"System"},{"id":13,"name":"${AUTOWB}","description":"Auto+White+Balance","format":"","sample":"","type":"Bool","source":"System"},{"id":14,"name":"${sAUTOAWB}","description":"Auto+White+Balance+String","format":"","sample":"","type":"Bool","source":"System"},{"id":15,"name":"${WBR}","description":"White+Balance+RED","format":"","sample":"3.47","type":"Number","source":"System"},{"id":16,"name":"${WBB}","description":"White+Balance","format":"","sample":"1.00","type":"Number","source":"System"},{"id":17,"name":"${FLIP}","description":"Flip","format":"","sample":"","type":"Text","source":"System"},{"id":18,"name":"${BIN}","description":"Binning","format":"","sample":"","type":"Number","source":"System"},{"id":19,"name":"${BIT_DEPTH}","description":"Bit+Depth","format":"","sample":"","type":"Number","source":"System"},{"id":20,"name":"${FOCUS}","description":"Focus","format":"","sample":"","type":"Number","source":"System"},{"id":21,"name":"${25544ALT}","description":"ISS+Altitude","format":"","sample":"","type":"Number","source":"System"},{"id":22,"name":"${25544AZ}","description":"ISS+Azimuth","format":"","sample":"","type":"Number","source":"System"},{"id":23,"name":"${25544VISIBLE}","description":"ISS+Visible","format":"","sample":"","type":"Number","source":"System"},{"id":24,"name":"${MOON_ELEVATION}","description":"Moon+Altitude","format":"","sample":"","type":"Number","source":"System"},{"id":25,"name":"${MOON_AZIMUTH}","description":"Moon+Azimuth","format":"","sample":"","type":"Number","source":"System"},{"id":26,"name":"${MOON_ILLUMINATION}","description":"Moon+Illumination","format":"","sample":"","type":"Number","source":"System"},{"id":27,"name":"${MOON_SYMBOL}","description":"Moon+Font+Symbol","format":"","sample":"","type":"Number","source":"System"},{"id":28,"name":"${NAUTICALTWILIGHTSTARTS}","description":"Nautical+Twilight+Start","format":"","sample":"","type":"text","source":"System"},{"id":29,"name":"${CIVILTWILIGHTSTARTS}","description":"Civil+Twilight+Start","format":"","sample":"","type":"text","source":"System"},{"id":30,"name":"${DAYSTARTS}","description":"Day+Start","format":"","sample":"","type":"text","source":"System"},{"id":31,"name":"${CIVILTWILIGHTENDS}","description":"Civil+Twilight+Ends","format":"","sample":"","type":"text","source":"System"},{"id":32,"name":"${NAUTICALTWILIGHTENDS}","description":"Nautical+Twilight+Ends","format":"","sample":"","type":"text","source":"System"},{"id":33,"name":"${ASTRONOMICALTWILIGHTENDS}","description":"Astronmical+Twilight+Ends","format":"","sample":"","type":"text","source":"System"},{"id":34,"name":"${CAMERA_TYPE}","description":"Camera","format":"","sample":"","type":"text","source":"System"},{"id":35,"name":"${AUTOUSB}","description":"AUTOUSB+ZWO+Only","format":"","sample":"","type":"Bool","source":"System"},{"id":36,"name":"${USB}","description":"USB+ZWO+Only","format":"","sample":"","type":"Number","source":"System"},{"id":37,"name":"${CAPTURE}","description":"capture","format":"","sample":"","type":"Text","source":"System"},{"id":38,"name":"${DARKFRAME}","description":"Taking+Dark+Frames","format":"","sample":"","type":"Text","source":"System"},{"id":39,"name":"${eOVERLAY}","description":"External+Overlay","format":"","sample":"","type":"Text","source":"System"},{"id":40,"name":"${DAY_OR_NIGHT}","description":"Day/Night+string","format":"","sample":"Day","type":"Text","source":"System"},{"id":41,"name":"${ALLSKY_VERSION}","description":"Allsky+version+string","format":"","sample":"v2022.MM.DD_tbd","type":"Text","source":"System"},{"id":42,"name":"${PIGPSFIX}","description":"GPS+Fix","format":"","sample":"","type":"Text","source":"User"},{"id":43,"name":"${AS_LIGHTLUX}","description":"Lux","format":"","sample":"","type":"Number","source":"User"},{"id":44,"name":"${AUTO_STRETCH_AMOUNT}","description":"ss","format":"","sample":"","type":"Number","source":"User"}]'

    _config = ""
    _fields = ""

    _jsonConfig = {}
    _jsonFields = {}
    
    def __init__(self):
        formData = cgi.FieldStorage()

        self._config = formData["config"].value
        self._fields = formData["fields"].value
        self._jsonConfig = json.loads(self._config)
        self._jsonFields = json.loads(self._fields)
        self._getAllSkyVariables()
        pass
    
    def _getAllSkyVariables(self):
        allskyVariables = {}
        
        #scriptName = f"html{os.environ['SCRIPT_NAME']}"
        #scriptFileName = os.environ["SCRIPT_FILENAME"]  
        #allSkyHome = scriptFileName.replace(scriptName, "")
        #allSkyTmp = f"{allSkyHome}tmp"
        #allSkyVariableFile = f"{allSkyTmp}/overlaydebug.txt"
        #
        # For testing remove for live
        #        
        allSkyVariableFile = "/home/pi/allsky/tmp/overlaydebug.txt"
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
                print(e)
                pass

    def _getFieldType(self, name):
        result = None
        for fieldData in self._jsonFields:
            if fieldData["name"] == name:
                result = fieldData["type"]
                break

        return result
    
    def _getValue(self, format, fieldValue, variableType):
        value = fieldValue
        
        if variableType == 'Date':
            timeStamp = datetime.fromtimestamp(time.time())
            if format is None:
                value = timeStamp.strftime('%Y-%m-%d %H:%M:%S')
            else:
                value = timeStamp.strftime(format)

        if variableType == 'Time':
            timeStamp = time.localtime(time.time())
            if format is None:
                value = time.strftime('%H:%M:%S', timeStamp)
            else:
                value = time.strftime(format, timeStamp)

        if variableType == 'Number':
            if format is not None and format != "":
                format = "{" + format + "}"                 
                try:
                    try:
                        convertValue = int(fieldValue)
                    except ValueError:
                        convertValue = float(fieldValue)
                    value = format.format(convertValue)
                except ValueError as err:
                    pass

        if variableType == 'Bool':
            if int(value) == 0:
                fieldValue = 'No'
            else:
                fieldValue = 'Yes'
                                         
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
                                        formattedValue = self._getValue(format, fieldValue, variableType)
                                        fieldLabel = fieldLabel.replace(fullLabel, str(formattedValue))
                                else:
                                    fieldLabel = fieldLabel.replace(fullLabel, str(fieldValue))                                    
                            else:
                                fieldLabel = fieldLabel.replace(fullLabel, str(fieldValue))
                        else:
                            fieldLabel = fieldLabel.replace(fullLabel, str(fieldValue))                            
 
            result[fieldData["id"]] = fieldLabel
        
        print("Content-type: text/html\n")
        print(json.dumps(result, indent = 4))

try:        
    sampleEngine = ALLSKYFORMAT()
    sampleEngine.createSampleData()
except Exception as e:
    print(e)