import os
import argparse
import json
import cv2
import re
import numpy as np
import ephem
import pathlib
import time
import requests
import tempfile
import math
import sys

import allsky_shared as s

from datetime import datetime, timedelta, date
from PIL import ImageFont
from PIL import ImageDraw
from PIL import Image
from PIL import ImageColor

from math import radians
from math import degrees

from datetime import date, datetime, timedelta

from astral.sun import sun, azimuth, elevation, night
from astral import LocationInfo, Observer

from skyfield.api import EarthSatellite, load, wgs84, Loader
from skyfield.api import N, S, E, W
from skyfield import almanac
from pytz import timezone

import locale

try:
    locale.setlocale(locale.LC_ALL, '')
except:
    pass

metaData = {
    "name": "Overlays data on the image",
    "description": "Overlays data fields on the image",
    "module": "allsky_overlay",
    "events": [
        "day",
        "night"
    ],
    "arguments":{
        "formaterrortext": "??",
        "suntimeformat": "",
        "nonighttext": ""
    },
    "argumentdetails": {
            "formaterrortext" : {
            "required": "false",
            "tab": "Overlays",
            "description": "Format Error Text",
            "help": "Value to place in a variable when the provided format is invalid. defaults to ??"
        }
    }
}

class ALLSKYOVERLAY:
    _OVERLAYCONFIGFILE = 'overlay.json'
    _OVERLAYFIELDSFILE = 'fields.json'
    _OVERLAYUSERFIELDSFILE = 'userfields.json'
    _OVERLAYTMPFOLDER = ''
    _OVERLAYTLEFOLDER = None
    _overlayConfigFile = None
    _overlayConfig = None
    _image = None
    _fonts = {}
    _fields = {}
    _systemfields = {}
    _userfields = {}

    _extraData = {}

    _startTime = 0
    _lastTimer = None

    _observerLat = 0
    _observerLon = 0

    _eph = None

    _sunFast = False

    _imageDate = None
    _debug = False
    _enableSkyfield = True
    _formaterrortext = ""

    def __init__(self, formaterrortext):
        C = os.path.join(s.ALLSKY_OVERLAY, 'config')
        self._overlayConfigFile = os.path.join(C, self._OVERLAYCONFIGFILE)
        fieldsFile = os.path.join(C, self._OVERLAYFIELDSFILE)
        userFieldsFile = os.path.join(C, self._OVERLAYUSERFIELDSFILE)

        tmpFolder = os.path.join(O, 'tmp')
        self._createTempDir(tmpFolder)
        self._OVERLAYTMP = os.path.join(tmpFolder, 'overlay')
        self._createTempDir(self._OVERLAYTMP)
        self._OVERLAYTLEFOLDER = os.path.join(self._OVERLAYTMP , 'tle')
        self._createTempDir(self._OVERLAYTLEFOLDER)

        with open(fieldsFile) as file:
            self._systemfields = json.load(file)['data']
        with open(userFieldsFile) as file:
            self._userfields = json.load(file)['data']

        self._fields = self._systemfields + self._userfields

        s.log(4, f"INFO: Config file set to '{self._overlayConfigFile}'.")
        self._enableSkyfield = True
        try:
            load = Loader(self._OVERLAYTMP, verbose=False)
            self._eph = load('de421.bsp')
        except Exception as err:
            s.log(0, f"ERROR: Unable to download de421.bsp: {err}")
            self._enableSkyfield = False
        self._setDateandTime()
        self._observerLat = s.getSetting('latitude')
        self._observerLon = s.getSetting('longitude')
        self._debug = True

        self._formaterrortext = formaterrortext;

    def _dumpDebugData(self):
        debugFilePath = os.path.join(s.TMPDIR, 'overlaydebug.txt')
        env = {}
        for var in os.environ:
            varValue = s.getEnvironmentVariable(var, fatal=True)
            varValue = varValue.replace('\n', '')
            varValue = varValue.replace('\r', '')
            var = var.ljust(50, ' ')
            env[var] = varValue

        with open(debugFilePath, 'w') as debugFile:
            for var in sorted(env):
                varValue = env[var]
                debugFile.write(var + varValue + os.linesep)

        s.log(4, f"INFO: Debug information written to {debugFilePath}")

    def _createTempDir(self, path):
        if not os.path.isdir(path):
            umask = os.umask(0o000)
            os.makedirs(path, mode=0o777)
            os.umask(umask)

    def _setDateandTime(self):
        osDate = s.getEnvironmentVariable('AS_DATE', fatal=True)
        osTime = s.getEnvironmentVariable('AS_TIME', fatal=True)
        if osDate.startswith('20'):
            self._imageDate = time.mktime(datetime.strptime(osDate + ' ' + osTime,"%Y%m%d %H%M%S").timetuple())
        else:
            self._imageDate = time.time()

    def _loadDataFile(self):
        """ Loads any extra data files found in the {ALLSKY_EXTRA} folder. The data files can either be json or
            name pair values.

            The json format allows for an expiry time for the variable. In the example below the rain value will expire
            after 60 seconds. The Ambient and Cloud_Cover will expire based upon the time the file was created and the
            value set in the overlay editor for expiration.

            {
                "RAIN": {                       <-- The variable name (This is a text field)
                    "value": "14",              <-- The value for the variable
                    "expires": 6000000,         <-- (Optional) The expiry time (seconds), will use the editor default if not defined
                    "x" : 800,                  <-- (optional) Override for the x coordinate of the field
                    "y" : 200,                  <-- (optional) Override for the y coordinate of the field
                    "fill": "#333333",          <-- (optional) Override for the colour of the field
                    "font": "ledsled",          <-- (optional) Override for the font name (NOTE: The font MUST be installed)
                    "fontsize": 40              <-- (optional) Override for the font size
                },
                "SCOPE": {                      <-- The variable name (This is an image field) The name is only for reference and not used
                    "image": "crosshair.png",   <-- The name of the image (MUST have been previously uploaded in the editor)
                    "x" : 300,                  <-- The x coordinate of the field
                    "y" : 400,                  <-- The y coordinate of the field
                    "scale": 0.1,               <-- (Optional) value to scale the image by, this is 10% of the original size
                    "expires": 6000,            <-- (Optional) The expiry time (seconds), will use the editor default if not defined
                },
                "AMBIENT": "15",               <-- This value will use the expiry time defined in the editor if one is set
                "CLOUD_COVER": "45"
            }

            A name pair value file would look like

            RAIN=14
            AMBIENT=15
            CLOUD_COVER=45

            NOTE: For name pair values in .txt files it is not possible to specify the expiry time by variable.
            The entire file will be expired based upon the value set in the overlay editor.
        """

        result = True

        defaultExpiry = self._overlayConfig["settings"]["defaultdatafileexpiry"]
        extraFolder = s.getEnvironmentVariable('ALLSKY_EXTRA', fatal=True)
        for (dirPath, dirNames, fileNames) in os.walk(extraFolder):
            for fileName in fileNames:
                dataFilename = os.path.join(extraFolder, fileName)
                s.log(4, f"INFO: Loading Data File {dataFilename}")
                self._readData(dataFilename, defaultExpiry)

        return result

    def _readData(self, dataFilename, defaultExpiry):
        result = False
        fileExtension = pathlib.Path(dataFilename).suffix
        fileModifiedTime = int(os.path.getmtime(dataFilename))
        if fileExtension == '.json':
            if s.isFileReadable(dataFilename):
                try:
                    with open(dataFilename) as file:
                        self._data = json.load(file)
                        for (name, valueData) in self._data.items():
                            x = None
                            y = None
                            fill = None
                            font = None
                            fontsize = None
                            result = True
                            image = None
                            rotate = None
                            scale = None
                            opacity = None
                            stroke = None
                            strokewidth = None
                            if type(valueData) is dict:
                                if 'value' in valueData:
                                    value = valueData['value']
                                else:
                                    value = 'ERR'

                                if 'expires' in valueData:
                                    expires = valueData['expires']
                                else:
                                    expires = defaultExpiry

                                if 'x' in valueData:
                                    x = valueData['x']

                                if 'y' in valueData:
                                    y = valueData['y']

                                if 'fill' in valueData:
                                    fill = valueData['fill']

                                if 'font' in valueData:
                                    font = valueData['font']

                                if 'fontsize' in valueData:
                                    fontsize = valueData['fontsize']

                                if 'image' in valueData:
                                    image = valueData['image']

                                if 'rotate' in valueData:
                                    rotate = valueData['rotate']

                                if 'scale' in valueData:
                                    scale = valueData['scale']

                                if 'opacity' in valueData:
                                    opacity = valueData['opacity']

                                if 'stroke' in valueData:
                                    stroke = valueData['stroke']

                                if 'strokewidth' in valueData:
                                    strokewidth = valueData['strokewidth']
                            else:
                                value = valueData
                                expires = defaultExpiry

                            if name[0:3] != 'AS_':
                                name = f'AS_{name}'
                            s.setEnvironmentVariable(name, str(value))
                            self._saveExtraDataField(name, fileModifiedTime, expires, x, y, fill, font, fontsize, image, rotate, scale, opacity, stroke, strokewidth)
                except:
                    s.log(1, f'WARNING: Data File {dataFilename} is invalid - IGNORING.')
            else:
                s.log(1, f'WARNING: Data File {dataFilename} is not accessible - IGNORING.')
                result = False
        elif fileExtension == '.txt':
            if s.isFileReadable(dataFilename):
                with open(dataFilename) as file:
                    for line in file:
                        name, value = line.partition("=")[::2]
                        name = name.rstrip()
                        value = value.lstrip()
                        name = "AS_" + name
                        value = value.strip()
                        os.environ[name] = str(value)
                        self._saveExtraDataField(name, fileModifiedTime, defaultExpiry)
            else:
                s.log(1, f"WARNING: Data File {dataFilename} is not accessible - IGNORING.")
                result = False

        return result

    def _saveExtraDataField(self, name, fieldDate, expires, x=None, y=None, fill=None, font=None, fontsize=None, image=None, rotate=None, scale=None, opacity=None, stroke=None, strokewidth=None):
        name = name.upper()
        _extraField = {
            'name': name,
            'datecreated': fieldDate,
            'expires': s.int(expires),
            'x': x,
            'y': y,
            'fill': fill,
            'font': font,
            'fontsize': fontsize,
            'image': image,
            'rotate': rotate,
            'scale': scale,
            'opacity': opacity,
            'stroke': stroke,
            'strokewidth': strokewidth
        }
        self._extraData[name] = _extraField
        s.log(4, f"INFO: Added extra data field {name}, expiry {expires} seconds.")

    def _loadConfigFile(self):
        result = True
        if s.isFileReadable(self._overlayConfigFile):
            with open(self._overlayConfigFile) as file:
                self._overlayConfig = json.load(file)

            if len(self._overlayConfig["fields"]) == 0 and len(self._overlayConfig["images"]) == 0:
                s.log(1, f"WARNING: Config file '{self._overlayConfigFile}' is empty.")
                result = True
        else:
            s.log(0, f"ERROR: Config File '{self._overlayConfigFile}' not accessible.")
            result = False

        return result

    def _loadImageFile(self):
        """ Loads the image file to annotate. If no image is specified on the command line
            then this method will attempt to use the image specified in the all sky camera
            config
        """
        result = True

        self._image = s.image
        return result

    def _saveImagefile(self):
        """ Saves the final image """
        s.image = self._image

    def _timer(self, text, showIntermediate = True, showMessage=True):
        """ Method to display the elapsed time between function calls and the total script execution time """
        if s.LOGLEVEL:
            if showMessage:
                if self._lastTimer is None:
                    elapsedSinceLastTime = datetime.now() - self._startTime
                else:
                    elapsedSinceLastTime = datetime.now() - self._lastTimer

                lastText = str(elapsedSinceLastTime.total_seconds())
                self._lastTimer = datetime.now()

                elapsedTime = datetime.now() - self._startTime
                if showIntermediate:
                    s.log(4, "INFO: {0} took {1} seconds. Elapsed time {2} seconds.".format(text, lastText, elapsedTime.total_seconds()))
                else:
                    s.log(4, "INFO: {0} Elapsed time {1} seconds.".format(text, elapsedTime.total_seconds()))

    def _getFont(self, font, fontSize):

        systemFontMap = {
            'Arial': {'fontpath': '/usr/share/fonts/truetype/msttcorefonts/Arial.ttf'},
            'Arial Black': {'fontpath': '/usr/share/fonts/truetype/msttcorefonts/Arial_Black.ttf'},
            'Times New Roman': {'fontpath': '/usr/share/fonts/truetype/msttcorefonts/Times_New_Roman.ttf'},
            'Courier New': {'fontpath': '/usr/share/fonts/truetype/msttcorefonts/cour.ttf'},
            'Verdana': {'fontpath': '/usr/share/fonts/truetype/msttcorefonts/Verdana.ttf'},
            'Trebuchet MS': {'fontpath': '/usr/share/fonts/truetype/msttcorefonts/trebuc.ttf'},
            'Impact': {'fontpath': '/usr/share/fonts/truetype/msttcorefonts/Impact.ttf'},
            'Georgia': {'fontpath': '/usr/share/fonts/truetype/msttcorefonts/Georgia.ttf'},
            'Comic Sans MS': {'fontpath': '/usr/share/fonts/truetype/msttcorefonts/comic.ttf'},
        }

        preMsg = f"Loading '{font}' font, size {fontSize} pixels"
        fontPath = None
        if font in self._overlayConfig['fonts']:
            fontData = self._overlayConfig['fonts'][font]
            fontConfigPath = fontData['fontPath']
            if fontConfigPath.startswith('/'):
                fontConfigPath = fontConfigPath[1:]
            C = s.getEnvironmentVariable('ALLSKY_CONFIG', fatal=True)
            fontPath = os.path.join(C, 'overlay', fontConfigPath)
        else:
            if font in systemFontMap:
                fontPath = systemFontMap[font]['fontpath']
            else:
                s.log(0, f"ERROR: System font '{font}' not found in internal map.")

        if fontPath is not None:
            if fontSize is None:
                if fontSize in fontData:
                    fontSize = fontData['fontSize']
                else:
                    fontSize = self._overlayConfig['settings']['defaultfontsize']

            fontKey = font + '_' + str(fontSize)

            if fontKey in self._fonts:
                font = self._fonts[fontKey]
                s.log(4, F'{preMsg} - found in cache.')
            else :
                try:
                    fontSize = s.int(fontSize)
                    self._fonts[fontKey] = ImageFont.truetype(fontPath, fontSize)
                    font = self._fonts[fontKey]
                    s.log(4, F'{preMsg} - loaded from disk.')
                except OSError as err:
                    s.log(0, f"ERROR: Font '{fontPath}' could not be loaded from disk.")
                    font = None
        else:
            font = None

        return font

    def _addText(self):
        pilImage = Image.fromarray(self._image)
        for index,fieldData in enumerate(self._overlayConfig["fields"]):
            pilImage = self._processText(fieldData["label"], fieldData, pilImage)
        self._image = np.array(pilImage)

    def _getFieldType(self,name):
        result = None
        for index,fieldData in enumerate(self._fields):
            if fieldData["name"] == name:
                result = fieldData["type"]
                break

        return result

    def _processText(self, name, fieldData, pilImage = None):

        if "format" in fieldData:
            Format = fieldData['format']
            if Format.startswith('%'):
                formatArray = Format.split(',')
            else:
                regex = r"\{(.*?)\}"
                formatArray = re.findall(regex, Format)
        else:
            Format = None
            formatArray = {}

        if "empty" in fieldData:
            empty = fieldData["empty"]
            if empty.startswith('{'):
                regex = r"\{(.*?)\}"
                emptyArray = re.findall(regex, empty)
            else:
                emptyArray = empty.split(',')
        else:
            empty = None
            emptyArray = {}

        if "font" in fieldData:
            fontName = fieldData["font"]
        else:
            fontName = self._overlayConfig["settings"]["defaultfont"]

        if "fontsize" in fieldData:
            fontSize = fieldData["fontsize"]
        else:
            fontSize = self._overlayConfig["settings"]["defaultfontsize"]

        if "rotate" in fieldData:
            rotation = int(fieldData["rotate"])
        else:
            rotation = 0

        if "opacity" in fieldData:
            opacity = fieldData["opacity"]
        else:
            opacity = 1

        if "tlx" in fieldData:
            fieldX = s.int(fieldData["tlx"])
        else:
            fieldX = s.int(fieldData["x"])

        if "tly" in fieldData:
            fieldY = s.int(fieldData["tly"])
        else:
            fieldY = s.int(fieldData["x"])


        if "fill" in fieldData:
            fieldColour = fieldData["fill"]
        else:
            fieldColour = self._overlayConfig["settings"]["defaultfontcolour"]

        if "strokewidth" in fieldData:
            strokeWidth = int(fieldData["strokewidth"])
        else:
            strokeWidth = 0

        if "stroke" in fieldData:
            stroke = fieldData["stroke"]
        else:
            if "defaultstrokecolour" in self._overlayConfig["settings"]:
                stroke = self._overlayConfig["settings"]["defaultstrokecolour"]
            else:
                stroke = '#ffffff'

        if stroke != None:
            stroker, strokeg, strokeb = self._convertColour(name, stroke)
        else:
            stroker = None
            strokeg = None
            strokeb = None

        r, g, b = self._convertColour(name, fieldColour)

        regex =  r"\$\{.*?\}"
        fieldLabel = fieldData["label"]
        totalVariablesReplaced = 0
        totalVariables = 0
        matches = re.finditer(regex, fieldLabel, re.MULTILINE | re.IGNORECASE)

        for matchNum, match in enumerate(matches, start=1):
            variable = match.group()
            variableType = self._getFieldType(variable)

            fieldFormat = None
            if Format is not None:
                try:
                    fieldFormat = formatArray[matchNum-1]
                except IndexError:
                    fieldFormat = ''

            fieldEmpty = None
            if empty is not None:
                try:
                    fieldEmpty = emptyArray[matchNum-1]
                except IndexError:
                    fieldEmpty = ''

            fieldValue, overrideX, overrideY, overrideFill, overrideFont, overrideFontSize, overrideRotate, overrideScale, overrideOpacity, overrideStroke, overrideStrokewidth = self._getValue(variable, variableType, fieldFormat, fieldEmpty)

            if overrideStroke is not None:
                stroke = overrideStroke
                stroker, strokeg, strokeb = self._convertColour(name, stroke)

            if overrideStrokewidth is not None:
                strokeWidth = int(overrideStrokewidth)

            if overrideX is not None:
                fieldX = overrideX

            if overrideY is not None:
                fieldY = overrideY

            if overrideFill is not None:
                fieldColour = overrideFill
                r, g, b = self._convertColour(name, fieldColour)

            if overrideFont is not None:
                fontName = overrideFont

            if overrideFontSize is not None:
                fontSize = overrideFontSize

            if overrideRotate is not None:
                rotation = overrideRotate

            if overrideOpacity is not None:
                opacity = overrideOpacity

            if fieldValue is not None:
                fieldLabel = fieldLabel.replace(variable, str(fieldValue))
                totalVariablesReplaced += 1
            else:
                fieldLabel = fieldLabel.replace(variable, '')

            totalVariables += 1

        # If there were variables and none matched, don't display the field.
        if totalVariables != 0 and totalVariablesReplaced == 0:
            fieldLabel = None

        if fieldLabel is not None:
            font = self._getFont(fontName, fontSize)
            if font is None:
                cv2.putText(self._image, fieldLabel, (fieldX,fieldY), cv2.FONT_HERSHEY_SIMPLEX, 1, (b,g,r), 1, cv2.LINE_AA)
            else:
                fill = (b, g, r, 0)

                if stroker == None or strokeg == None or strokeb == None:
                    strokeFill = None
                    strokeWidth = 0
                else:
                    strokeFill = (strokeb, strokeg, stroker, 0)

                if len(s.image.shape) == 2:
                    fill = 255

                self._checkTextBounds(fieldLabel, fieldX, fieldY)

                if rotation == 0 and opacity == 1:
                    draw = ImageDraw.Draw(pilImage)
                    draw.text((fieldX, fieldY), fieldLabel, font = font, fill = fill, stroke_width=strokeWidth, stroke_fill=strokeFill)
                else:
                    pilImage = self._draw_rotated_text(pilImage,-rotation,(fieldX, fieldY), fieldLabel, fill = fieldColour, font = font, opacity = opacity, strokeWidth=strokeWidth, strokeFill=stroke)

            self._timer("Adding text field " + fieldLabel + ' (' + fieldData["label"] + ') ')
        else:
            self._timer("Adding text field " + fieldData['label'] + " failed no variable data available")

        return pilImage

    def _convertColour(self, name, value):
        try:
            r,g,b = ImageColor.getcolor(value, "RGB")
        except:
            #s.log(0, f"ERROR: The colour '{value}' for field '{name}' is NOT valid - Defaulting to white.")
            r = 255
            g = 255
            b = 255

        return r,g,b

    def _checkTextBounds(self, fieldLabel, x, y):
        try:
            h, w, c = self._image.shape

            outOfBounds = False
            if (x < 0):
                outOfBounds = True
            if (y < 0):
                outOfBounds = True
            if (x > w):
                outOfBounds = True
            if (y > h):
                outOfBounds = True

            if outOfBounds:
                s.log(0, f"ERROR: Field '{fieldLabel}' is outside of the image")
        except:
            pass

    def get_text_dimensions(self, text_string, font):
        ascent, descent = font.getmetrics()

        text_width = font.getmask(text_string).getbbox()[2]
        text_height = font.getmask(text_string).getbbox()[3] + descent

        return (text_width, text_height)

    def _convertRGBtoBGR(self, colour, opacity):
        r,g,b = ImageColor.getrgb(colour)
        #colour =  '#{:02x}{:02x}{:02x}'.format(b,g,r)

        opacity = int((255/100) * (float(opacity)*100))
        colour = (b,g,r,opacity)
        return colour

    def _draw_rotated_text(self, image, angle, xy, text, fill, font, opacity, strokeWidth, strokeFill):
        fill = self._convertRGBtoBGR(fill, opacity)
        if strokeFill != "":
            strokeFill = self._convertRGBtoBGR(strokeFill,1)
        else:
            strokeFill = None

        im_txt = Image.new('RGBA', image.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(im_txt)
        draw.text(xy, text, fill=fill, embedded_color=False, font=font, stroke_width=strokeWidth, stroke_fill=strokeFill)

        im_txt = im_txt.rotate(angle, center=xy)

        image.paste(im_txt, mask=im_txt)
        return image

    def _doBoolFormat(self, field, value, format):
        # allow formats:  %yes %on %true %1
        if value == 1 or value == '1':
            if format == '%yes':
                v = 'Yes'
            elif format == '%on':
                v = 'On'
            elif format == '%true':
                v = 'True'
            elif format == '%1':
                v = '1'
            else:
                s.log(0, f"ERROR: Cannot use format '{format}' on Bool variables like {field} (value={value}).")
                v = self._formaterrortext

        elif format == '%yes':
            v = 'No'
        elif format == '%on':
            v = 'Off'
        elif format == '%true':
            v = 'False'
        elif format == '%1':
            v = '0'
        else:
            s.log(0, f"ERROR: Cannot use format '{format}' on Bool variables like {field} (value={value}).")
            v = self._formaterrortext

        return v

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

    def _getValue(self, placeHolder, variableType, Format=None, empty=''):
        value = None
        valueOk = True
        x = None
        y = None
        fill = None
        font = None
        fontsize = None
        rotate = None
        scale = None
        opacity = None
        stroke = None
        strokewidth = None
        rawFieldName = placeHolder
        placeHolder = placeHolder.replace("${", "")
        placeHolder = placeHolder.replace("}", "")
        envCheck = "AS_" + placeHolder

        if envCheck in self._extraData:
            x = self._extraData[envCheck]['x']
            y = self._extraData[envCheck]['y']
            fill = self._extraData[envCheck]['fill']
            font = self._extraData[envCheck]['font']
            fontsize = self._extraData[envCheck]['fontsize']
            rotate = self._extraData[envCheck]['rotate']
            scale = self._extraData[envCheck]['scale']
            opacity = self._extraData[envCheck]['opacity']
            stroke = self._extraData[envCheck]['stroke']
            strokewidth = self._extraData[envCheck]['strokewidth']

            if self._extraData[envCheck]["expires"] != 0:
                age = int(time.time()) - self._extraData[envCheck]["datecreated"]
                if age > self._extraData[envCheck]["expires"]:
                    fileTime = datetime.fromtimestamp(int(self._extraData[envCheck]["datecreated"]))
                    fileTimeHR = fileTime.strftime("%d.%m.%y %H:%M:%S")
                    nowTime = datetime.fromtimestamp(int(time.time()))
                    nowTimeHR = nowTime.strftime("%d.%m.%y %H:%M:%S")
                    s.log(4, "WARNING: data field {0} expired. File time {1}, now {2}. Expiry {3} Seconds. Age {4} Seconds"
                        .format(placeHolder, fileTimeHR, nowTimeHR, self._extraData[envCheck]["expires"], age))
                    valueOk = False
                    expiredText = ''
                    if 'defaultexpirytext' in self._overlayConfig["settings"]:
                        expiredText = self._overlayConfig["settings"]["defaultexpirytext"]
                    if expiredText != "":
                        value = expiredText

        if valueOk:
            fieldFound = False
            if envCheck in os.environ:
                value = os.environ[envCheck]
                fieldFound = True
            else:
                envCheck = placeHolder.upper()
                if envCheck in os.environ:
                    value = os.environ[envCheck]
                    fieldFound = True
                else:
                    if placeHolder.upper() in os.environ:
                        value = os.environ[placeHolder.upper()]
                        fieldFound = True

            if fieldFound:
                if variableType == 'Date':
                    internalFormat = s.getSetting('timeformat')
                    if envCheck == 'DATE' or envCheck == 'AS_DATE':
                        timeStamp = datetime.fromtimestamp(self._imageDate)
                        value = timeStamp.strftime(internalFormat)
                    else:
                        isUnixTimestamp, value = self._isUnixTimestamp(value)
                        if isUnixTimestamp:
                            timeStamp = datetime.fromtimestamp(value)
                            value = timeStamp.strftime(internalFormat)

                    tempDate = datetime.strptime(value, internalFormat)
                    if Format is not None:
                        try:
                            value = tempDate.strftime(Format)
                        except Exception:
                            pass

                if variableType == 'Time':
                    if envCheck == 'AS_TIME' or envCheck == 'TIME':
                        timeStamp = time.localtime(self._imageDate)
                        if Format is None:
                            value = time.strftime('%H:%M:%S', timeStamp)
                        else:
			    # TODO: Check for bad format?
                            value = time.strftime(Format, timeStamp)
                    else:
                        pass

                if variableType == 'Number':
                    if Format is not None and Format != "":
                        f = Format
                        Format = "{" + Format + "}"
                        convertValue = 0
                        try:
                            try:
                                convertValue = int(value)
                            except ValueError:
                                convertValue = float(value)
                            try:
                                value = Format.format(convertValue)
                            except Exception as err:
                                s.log(0, f"ERROR: Cannot use format '{f}' on Number variables like {rawFieldName} (value={value}).")
                                value = self._formaterrortext
                        except ValueError as err:
                            s.log(0, f"ERROR: Cannot use format '{f}' on Number variables like {rawFieldName} (value={value}).")

                if variableType == 'Bool':
                    if Format is None or Format == '':
                        Format = "%yes"
                    value = self._doBoolFormat(rawFieldName, value, Format)

            if variableType == 'Text' or variableType == 'Number':
                if value == '' or value is None:
                    if empty != '' and empty is not None:
                        value = empty
            elif variableType is None or variableType == '':
                value = '???'
                s.log(0, f"ERROR: {rawFieldName} has no variable type; check 'userfields.json'.  Using '{value}' instead.")

        return value, x, y, fill, font, fontsize, rotate, scale, opacity, stroke, strokewidth

    def _addImages(self):
        for index, imageData in enumerate(self._overlayConfig["images"]):
            self._doAddImage(imageData)

        for index, extraFieldName in enumerate(self._extraData):
            if self._extraData[extraFieldName]['image'] is not None:
                imageData = {
                    'x': self._extraData[extraFieldName]['x'],
                    'y': self._extraData[extraFieldName]['y'],
                    'image': self._extraData[extraFieldName]['image'],
                    'scale': self._extraData[extraFieldName]['scale'],
                    'rotate': self._extraData[extraFieldName]['rotate']
                }
                self._doAddImage(imageData)

    def _doAddImage(self, imageData):
        imageName = imageData["image"]
        if imageName != 'missing':
            imageX = int(imageData["x"])
            imageY = int(imageData["y"])
            image = None

            imagePath = os.path.join(s.ALLSKY_OVERLAY, "images", imageName)

            if s.isFileReadable(imagePath):
                image = cv2.imread(imagePath, cv2.IMREAD_UNCHANGED)
            if image is not None:
                if "scale" in imageData:
                    if imageData["scale"] is not None:
                        scale = s.asfloat(imageData["scale"])
                        image = cv2.resize(image, (0, 0), fx=scale, fy=scale)

                if "rotate" in imageData:
                    if imageData["rotate"] is not None:
                        image = self._rotate_image(image, int(imageData["rotate"]))

                height = image.shape[0]
                width = image.shape[1]

                imageX = imageX - int(width / 2)
                imageY = imageY - int(height / 2)

                self._image = self._overlay_transparent(imageName, self._image, image, imageX, imageY, imageData)
                s.log(4, f"INFO: Adding image field {imageName}")

            else:
                s.log(1, f"WARNING: image '{imageName}' missing; ignoring.")
        else:
            s.log(1, "WARNING: Image not set so ignoring.")

    def _overlay_transparent(self, imageName, background, overlay, x, y, imageData):
        background_height, background_width = background.shape[0], background.shape[1]
        h, w = overlay.shape[0], overlay.shape[1]

        if (h + y < background_height) and (w + x < background_width and x >= 0 and y >= 0):
            if x >= background_width or y >= background_height:
                return background

            if x + w > background_width:
                w = background_width - x
                overlay = overlay[:, :w]

            if y + h > background_height:
                h = background_height - y
                overlay = overlay[:h]

            if overlay.shape[2] < 4:
                overlay = np.concatenate(
                    [
                        overlay,
                        np.ones((overlay.shape[0], overlay.shape[1], 1), dtype = overlay.dtype) * 255
                    ],
                    axis = 2,
                )

            overlay_image = overlay[..., :3]
            mask = overlay[..., 3:] / 255.0

            opacityMultiplier = 1
            if "opacity" in imageData:
                try:
                    opacity = imageData["opacity"]
                    opacityMultiplier = float(opacity)
                except:
                    pass

            if opacityMultiplier != 1:
                mask = mask * opacityMultiplier

            background[y:y+h, x:x+w] = (1.0 - mask) * background[y:y+h, x:x+w] + mask * overlay_image
        else:
            s.log(0, f"ERROR: Image '{imageName}' is outside the bounds of the main image.")
        return background

    def _rotate_image(self, image, angle):
        image_center = tuple(np.array(image.shape[1::-1]) / 2)

        image_center=tuple(np.array(image.shape[0:2])/2)

        rot_mat = cv2.getRotationMatrix2D(image_center, -int(angle), 1.0)
        result = cv2.warpAffine(image, rot_mat, image.shape[1::-1], flags=cv2.INTER_LINEAR)
        return result

    def _initialiseMoon(self):
        try:
            """ Setup all of the data for the Moon """
            moonEnabled = self._overlayConfig["settings"]["defaultincludemoon"]
            if moonEnabled:
                if self._enableSkyfield:
                    lat = radians(self._convertLatLon(self._observerLat))
                    lon = radians(self._convertLatLon(self._observerLon))

                    ts = time.time()
                    utcOffset = (datetime.fromtimestamp(ts) - datetime.utcfromtimestamp(ts)).total_seconds()

                    observer = ephem.Observer()
                    observer.lat = lat
                    observer.long = lon
                    moon = ephem.Moon()
                    observer.date = datetime.now() - timedelta(seconds=utcOffset)
                    moon.compute(observer)

                    nnm = ephem.next_new_moon(observer.date)
                    pnm = ephem.previous_new_moon(observer.date)

                    lunation=(observer.date-pnm)/(nnm-pnm)
                    symbol=lunation*26
                    if symbol < 0.2 or symbol > 25.8 :
                        symbol = '1'  # new moon
                    else:
                        symbol = chr(ord('A')+int(symbol+0.5)-1)

                    azTemp = str(moon.az).split(":")
                    self._moonAzimuth = azTemp[0] + u"\N{DEGREE SIGN}"
                    self._moonElevation = str(round(degrees(moon.alt),2)) + u"\N{DEGREE SIGN}"
                    self._moonIllumination = str(round(moon.phase, 2))
                    self._moonPhaseSymbol  = symbol

                    s.log(4, 'INFO: Adding Moon Azimuth {self._moonAzimuth} and Elevation {self._moonElevation}.')
                    s.setEnvironmentVariable('AS_MOON_AZIMUTH', self._moonAzimuth)
                    s.setEnvironmentVariable('AS_MOON_ELEVATION', self._moonElevation)
                    s.log(4, 'INFO: Adding Moon Illumination {self._moonIllumination} and Symbol {self._moonPhaseSymbol}')
                    s.setEnvironmentVariable('AS_MOON_ILLUMINATION', self._moonIllumination)
                    s.setEnvironmentVariable('AS_MOON_SYMBOL', self._moonPhaseSymbol)
                else:
                    s.log(4,'INFO: Moon enabled but cannot use due to prior error.')
            else:
                s.log(4,'INFO: Moon not enabled.')
        except Exception as e:
            eType, eObject, eTraceback = sys.exc_info()
            s.log(0, f'ERROR: _initialiseMoon failed on line {eTraceback.tb_lineno} - {e}')
        return True

    def _fileCreatedToday(self, fileName):
        result = False
        today = date.today()
        today = today.strftime('%Y-%m-%d')
        fileModifiedTime = ''

        if os.path.exists(fileName):
            fileModifiedTime = int(os.path.getmtime(fileName))
            m_ti = time.ctime(fileModifiedTime)
            fileDate = time.strptime(m_ti)
            fileDate = time.strftime('%Y-%m-%d', fileDate)

            if fileDate == today:
                result = True

        return result

    def _getSunTimes(self, location, date):
        sunData = sun(location, date=date)
        az = azimuth(location, date)
        el = elevation(location, date)
        sunData['azimuth'] = az
        sunData['elevation'] = el
        return sunData

    def _getTimeZone(self):
        try:
            file = open('/etc/timezone', 'r')
            tz = file.readline()
            tz = tz.strip()
            file.close()
        except:
            tz = "Europe/London"

        return tz, timezone(tz)

    def _initialiseSun(self):
        try:
            sunEnabled = self._overlayConfig['settings']['defaultincludesun']
            if sunEnabled:
                lat = self._convertLatLon(self._observerLat)
                lon = self._convertLatLon(self._observerLon)

                tzName, tz = self._getTimeZone()
                location = Observer(lat, lon, 0)

                today = datetime.now(tz)
                tomorrow = today + timedelta(days = 1)
                yesterday = today + timedelta(days = -1)

                yesterdaySunData = self._getSunTimes(location, yesterday)
                todaySunData = self._getSunTimes(location, today)
                tomorrowSunData = self._getSunTimes(location, tomorrow)

                if s.TOD == 'day':
                    dawn = todaySunData["dawn"]
                    sunrise = todaySunData["sunrise"]
                    noon = todaySunData["noon"]
                    sunset = todaySunData["sunset"]
                    dusk = todaySunData["dusk"]
                else:
                    now = datetime.now(tz)
                    if now.hour > 0 and now < todaySunData["dawn"]:
                        dawn = todaySunData["dawn"]
                        sunrise = todaySunData["sunrise"]
                        noon = todaySunData["noon"]
                        sunset = yesterdaySunData["sunset"]
                        dusk = yesterdaySunData["dusk"]
                    else:
                        dawn = tomorrowSunData["dawn"]
                        sunrise = tomorrowSunData["sunrise"]
                        noon = tomorrowSunData["noon"]
                        sunset = todaySunData["sunset"]
                        dusk = todaySunData["dusk"]

                Format = s.getSetting("timeformat")
                s.setEnvironmentVariable("AS_SUN_DAWN", dawn.strftime(Format))
                s.setEnvironmentVariable("AS_SUN_SUNRISE", sunrise.strftime(Format))
                s.setEnvironmentVariable("AS_SUN_NOON", noon.strftime(Format))
                s.setEnvironmentVariable("AS_SUN_SUNSET", sunset.strftime(Format))
                s.setEnvironmentVariable("AS_SUN_DUSK", dusk.strftime(Format))
                s.setEnvironmentVariable("AS_SUN_AZIMUTH", str(int(todaySunData["azimuth"])))
                s.setEnvironmentVariable("AS_SUN_ELEVATION", str(int(todaySunData["elevation"])))

                s.log(4, f'INFO: Lat = {lat}, Lon = {lon}, tz = {tzName}, Sunrise = {sunrise}, Sunset = {sunset}')
            else:
                s.log(4,'INFO: Sun not enabled')
        except Exception as e:
            eType, eObject, eTraceback = sys.exc_info()
            s.log(0, f'ERROR: _initialiseSun failed on line {eTraceback.tb_lineno} - {e}')

        return True

    def _initialiseSunOld(self):
        sunEnabled = self._overlayConfig['settings']['defaultincludesun']
        if sunEnabled:
            if self._enableSkyfield:
                cacheData = {}
                lat = self._convertLatLon(self._observerLat)
                lon = self._convertLatLon(self._observerLon)

                sunTmpFile = os.path.join(self._OVERLAYTMP,'sun')

                if not self._fileCreatedToday(sunTmpFile):
                    if not self._sunFast:
                        notUsed, tz = self._getTimeZone()

                        # Figure out local midnight.
                        zone = timezone(tz)
                        now = zone.localize(datetime.now())

                        midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
                        next_midnight = midnight + timedelta(days=1)

                        ts = load.timescale()
                        t0 = ts.from_datetime(midnight)
                        t1 = ts.from_datetime(next_midnight)
                        bluffton = wgs84.latlon(lat, lon)
                        f = almanac.dark_twilight_day(self._eph, bluffton)
                        times, events = almanac.find_discrete(t0, t1, f)

                        previous_e = f(t0).item()
                        for t, e in zip(times, events):
                            eventTime = str(t.astimezone(zone).strftime('%H:%M'))
                            if previous_e < e:
                                name = str(almanac.TWILIGHTS[e]) +  'starts'
                                name = name.upper().replace(' ', '')
                            else:
                                name = str(almanac.TWILIGHTS[e]) +  'ends'
                                name = name.upper().replace(' ', '')
                            cacheData['AS_' + name] = eventTime
                            previous_e = e
                    else:
                        sun = Sun(lat, lon)
                        sunRise = sun.get_local_sunrise_time()
                        sunSet = sun.get_local_sunset_time()
                        cacheData['AS_SUNRISE'] = sunRise.strftime('%H:%M')
                        cacheData['AS_SUNSET'] = sunSet.strftime('%H:%M')
                    jsonData = json.dumps(cacheData, indent = 4)
                    umask = os.umask(0)
                    with open(os.open(sunTmpFile, os.O_CREAT | os.O_WRONLY, 0o777), 'w') as outfile:
                        outfile.write(jsonData)
                    os.umask(umask)
                else:
                    with open(sunTmpFile) as inFile:
                        cacheData = json.load(inFile)

                for key, value in cacheData.items():
                    os.environ[key] = value
                    s.log(4, f'INFO: Adding {key}:{value}')
            else:
                s.log(4, 'INFO: Sun enabled but cannot use due to prior error.')
        else:
            s.log(4, 'INFO: Sun not enabled.')

        return True

    def _convertLatLon(self, input):
        """ lat and lon can either be a positive or negative float, or end with N, S, E,or W. """
        """ If in  N, S, E, W format, 0.2E becomes -0.2 """
        nsew = False
        if isinstance(input, str):
            nsew = 1 if input[-1] in ['N', 'S', 'E', 'W'] else 0
        if nsew:
            multiplier = 1 if input[-1] in ['N', 'E'] else -1
            ret = multiplier * sum(s.asfloat(x) / 60 ** n for n, x in enumerate(input[:-1].split('-')))
        else:
            ret = float(input)
        return ret

    def _fetchTleFromCelestrak(self, noradCatId, verify=True):
        s.log(4, f'INFO: Loading Satellite {noradCatId}', fatal=True)
        tleFileName = os.path.join(self._OVERLAYTLEFOLDER , noradCatId + '.tle')

        self._createTempDir(self._OVERLAYTLEFOLDER)

        if os.path.exists(tleFileName):
            fileModifiedTime = int(os.path.getmtime(tleFileName))
            fileAge = int(time.time()) - fileModifiedTime
            fileAge = fileAge / 60 / 60 / 24
        else:
            fileAge = 9999

        if fileAge > 2:
            r = requests.get(f'https://www.celestrak.com/NORAD/elements/gp.php?CATNR={noradCatId}', verify=verify, timeout=5)
            r.raise_for_status()

            if r.text == 'No GP data found':
                raise LookupError

            tle = r.text.split('\r\n')

            umask = os.umask(0)
            with open(os.open(tleFileName, os.O_CREAT | os.O_WRONLY, 0o777), 'w') as outfile:
                outfile.write(tle[0].strip() + os.linesep)
                outfile.write(tle[1].strip() + os.linesep)
                outfile.write(tle[2].strip() + os.linesep)
            os.umask(umask)

            s.log(4, ' TLE file over 2 days old so downloaded')
        else:
            tle = {}
            with open(tleFileName) as f:
                tle[0] = f.readline()
                tle[1] = f.readline()
                tle[2] = f.readline()
            s.log(4, ' TLE loaded from cache')

        return tle[0].strip(), tle[1].strip(), tle[2].strip()

    def _initSatellites(self):

        try:
            satellites = self._overlayConfig["settings"]["defaultnoradids"]
            satellites = satellites.strip()

            if satellites != '':
                if self._enableSkyfield:
                    satelliteArray = list(map(str.strip, satellites.split(',')))
                    for noradId in satelliteArray:
                        try:
                            tles = self._fetchTleFromCelestrak(noradId)
                            ts = load.timescale()
                            t = ts.now()

                            satellite = EarthSatellite(tles[1], tles[2], tles[0], ts)
                            geocentric = satellite.at(t)
                            sunlit = satellite.at(t).is_sunlit(self._eph)
                            satLat, satLon = wgs84.latlon_of(geocentric)

                            lat = self._convertLatLon(self._observerLat)
                            lon = self._convertLatLon(self._observerLon)
                            bluffton = wgs84.latlon(lat, lon)
                            difference = satellite - bluffton
                            topocentric = difference.at(t)
                            alt, az, distance = topocentric.altaz()
                            s.setEnvironmentVariable('AS_' + noradId + 'ALT', str(alt))
                            s.setEnvironmentVariable('AS_' + noradId + 'AZ', str(az))

                            if alt.degrees > 5 and sunlit:
                                s.SetEnvironmentVariable('AS_' + noradId + 'VISIBLE', 'Yes')
                            else:
                                s.SetEnvironmentVariable('AS_' + noradId + 'VISIBLE', 'No')
                        except LookupError:
                            s.log(0, f'ERROR: Norad ID {noradId} Not found.')
                else:
                    s.log(4, 'INFO: Satellites enabled but cannot use due to prior error.')

            else:
                s.log(4, 'INFO: Satellites not enabled.')

        except Exception as e:
            eType, eObject, eTraceback = sys.exc_info()
            s.log(4, ' ')
            s.log(0, f'ERROR: _initSatellites failed on line {eTraceback.tb_lineno} - {e}')

        return True

    def _initPlanets(self):

        try:
            planetsEnabled = self._overlayConfig["settings"]["defaultincludeplanets"]

            if planetsEnabled:
                if self._enableSkyfield:
                    planets = {
                        'MERCURY BARYCENTER',
                        'VENUS BARYCENTER',
                        'MARS BARYCENTER',
                        'JUPITER BARYCENTER',
                        'SATURN BARYCENTER',
                        'URANUS BARYCENTER',
                        'NEPTUNE BARYCENTER',
                        'PLUTO BARYCENTER'
                    }

                    timeNow = time.time()
                    utcOffset = (datetime.fromtimestamp(timeNow) - datetime.utcfromtimestamp(timeNow)).total_seconds()

                    ts = load.timescale()
                    t = ts.now() #- timedelta(seconds=utcOffset)
                    earth = self._eph['earth']

                    home = earth + wgs84.latlon(self._convertLatLon(self._observerLat), self._convertLatLon(self._observerLon))

                    for planetId in planets:
                        planet = self._eph[planetId]
                        astrometric = home.at(t).observe(planet)
                        alt, az, d = astrometric.apparent().altaz()
                        ra, dec, distance = astrometric.radec()
                        #prs.int(planetId, alt, az)
                        s.setEnvironmentVariable('AS_' + planetId.replace(' BARYCENTER','') + 'ALT', str(alt))
                        s.setEnvironmentVariable('AS_' + planetId.replace(' BARYCENTER','') + 'AZ', str(az))
                        s.setEnvironmentVariable('AS_' + planetId.replace(' BARYCENTER','') + 'RA', str(ra))
                        s.setEnvironmentVariable('AS_' + planetId.replace(' BARYCENTER','') + 'DEC', str(dec))

                        if alt.degrees > 5:
                            s.setEnvironmentVariable('AS_' + planetId.replace(' BARYCENTER','') + 'VISIBLE', 'Yes')
                        else:
                            s.setEnvironmentVariable('AS_' + planetId.replace(' BARYCENTER','') + 'VISIBLE', 'No')
                else:
                    s.log(4, 'INFO: Planets enabled but unable to use due to prior error.')
            else:
                s.log(4, 'INFO: Planets not enabled.')

        except Exception as e:
            eType, eObject, eTraceback = sys.exc_info()
            s.log(0, f'ERROR: _initPlanets failed on line {eTraceback.tb_lineno}- {e}')

        return True

    def annotate(self):
        self._startTime = datetime.now()
        if self._loadConfigFile():
            self._timer("Loading Config")
            if self._initialiseMoon():
                moonEnabled = self._overlayConfig["settings"]["defaultincludemoon"]
                self._timer("Initialising The Moon", showMessage=moonEnabled)
                if self._initialiseSun():
                    sunEnabled = self._overlayConfig['settings']['defaultincludesun']
                    self._timer("Initialising The Sun", showMessage=sunEnabled)
                    if self._initSatellites():
                        satellites = self._overlayConfig["settings"]["defaultnoradids"]
                        showInitMessage = True
                        if satellites == '':
                            showInitMessage = False
                        self._timer("Initialising The Satellites", showMessage=showInitMessage)
                        if self._initPlanets():
                            planetsEnabled = self._overlayConfig["settings"]["defaultincludeplanets"]
                            self._timer("Initialising The Planets", showMessage=planetsEnabled)
                            if self._loadImageFile():
                                self._timer("Loading Image")
                                if self._loadDataFile():
                                    self._timer("Loading Extra Data")
                                    self._addText()
                                    self._timer("Adding Text Fields")
                                    self._addImages()
                                    self._timer("Adding Image Fields")
                                    self._saveImagefile()
                                    self._timer("Saving Final Image")
                                    if self._debug:
                                        self._timer("Writing debug data")
                                        self._dumpDebugData()

        self._timer("Annotation Complete", showIntermediate=False)

def overlay(params, event):
    enabled = s.int(s.getEnvironmentVariable("AS_eOVERLAY"))
    if enabled == 1:
        formaterrortext = "??"
        if "formaterrortext" in params:
            formaterrortext = params["formaterrortext"]
        annotater = ALLSKYOVERLAY(formaterrortext)
        annotater.annotate()
        result = "Overlay Complete"
    else:
        result = "External Overlay Disabled"

    s.log(4, f"INFO: {result}.")
    return result
