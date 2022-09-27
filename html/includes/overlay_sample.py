#!/usr/bin/python
import json
import re
from datetime import datetime
import sys
import base64
import os
import ephem
import csv
import pathlib
import requests
import time
import tempfile
import shutil
import random

from suntime import Sun
from math import radians
from math import degrees
from datetime import date

from skyfield.api import EarthSatellite, load, wgs84, Loader
from skyfield.api import N, W

class ALLSKYANNOTATESAMPLE:
    _overlay = None
    _fields = None
    _basePath = ''
    _overlayFile = ''
    _fieldFile = ''
    _allskyTmp = None
    _OVERLAYTMP = None
    _tleFolder = None

    _sunRise = None
    _sunSet = None

    _sampleData = {}

    _cameraConfig = None
    _cameraConfigFile = None
    _observerLat = 0
    _observerLon = 0

    _userData = {}
    _extraData = {}

    _eph = {}

    def __init__(self):
        self._basePath = sys.argv[2]
        self._allskyTmp = sys.argv[3]
        self._cameraConfigFile = sys.argv[4]

        self._OVERLAYTMP = os.path.join(tempfile.gettempdir(), 'overlay')
        if not os.path.isdir(self._OVERLAYTMP):
            umask = os.umask(0o000)
            os.mkdir(self._OVERLAYTMP, mode=0o777)
            os.umask(umask)

        self._tleFolder = os.path.join(self._OVERLAYTMP , 'tle')

        self._overlayFile = os.path.join(self._basePath, 'overlay.json')
        self._fieldFile = os.path.join(self._basePath, 'fields.json')

        try:
            self._overlay = sys.argv[1]
            self._overlay = base64.b64decode(self._overlay)
            self._overlay = self._overlay.decode('ascii')
            self._overlay = json.loads(self._overlay)
        except IndexError:
            file = open(self._overlayFile)
            self._overlay = json.load(file)

        file = open(self._fieldFile)
        self._fields = json.load(file)

        load = Loader(self._OVERLAYTMP, verbose=False)
        self._eph = load('de421.bsp')

        self._checkForAllsky()
        self._loadDataFile()
        self._initPlanets()
        self._initSatellites()

    def _createTempDir(self, path):
        if not os.path.isdir(path):
            umask = os.umask(0o000)
            os.mkdir(path, mode=0o777)
            os.umask(umask)

    def _checkForAllsky(self):
        """ Attempts to find the all sky installation. The script will abort if this cannot be found """
        result = True
        try:
            with open(os.path.join(self._basePath,"config.sh")) as stream:
                contents = stream.read().strip()

            var_declarations = re.findall(r"^[a-zA-Z0-9_]+=.*$", contents, flags=re.MULTILINE)
            reader = csv.reader(var_declarations, delimiter="=")
            self._allSkyVariables = dict(reader)  

            try:
                allskySettingsFile = open(self._cameraConfigFile, 'r')
                self._cameraConfig = json.load(allskySettingsFile)

                self._observerLat = self._cameraConfig["latitude"]
                self._observerLon = self._cameraConfig["longitude"]

            except FileNotFoundError:
                result = False
        except KeyError:
            result = False

        return result

    def _loadDataFile(self):
        result = True

        allSkyTmp = '/home/pi/allsky/tmp'
        defaultExpiry = self._overlay["settings"]["defaultdatafileexpiry"]
        extraFolder = os.path.join(allSkyTmp, "extra")

        for (dirPath, dirNames, fileNames) in os.walk(extraFolder):
            for fileName in fileNames:
                dataFilename = os.path.join(extraFolder, fileName)
                self._readData(dataFilename, defaultExpiry)
                      
        return result

    def _readData(self, dataFilename, defaultExpiry):
        result = True
        fileExtension = pathlib.Path(dataFilename).suffix
        fileModifiedTime = int(os.path.getmtime(dataFilename))
        if fileExtension == ".json":
            if self._isFileReadable(dataFilename):
                with open(dataFilename) as file:
                    self._data = json.load(file)
                    for (name, valueData) in self._data.items():
                        if type(valueData) is dict:
                            if "value" in valueData:
                                value = valueData["value"]
                            else:
                                value = "ERR"
                            
                            if "expires" in valueData:
                                expires = valueData["expires"]
                            else:
                                expires = defaultExpiry
                        else:
                            value = valueData
                            expires = defaultExpiry

                        os.environ["AS_" + name] = str(value)
                        self._saveExtraDataField(name, fileModifiedTime, expires)
            else:
                result = False
        else:
            if self._isFileReadable(dataFilename):
                with open(dataFilename) as file:
                    for line in file:
                        name, value = line.partition("=")[::2]
                        name = "AS_" + name
                        os.environ[name] = value
                        self._saveExtraDataField(name, fileModifiedTime, defaultExpiry)
            else:
                result = False

        return result

    def _saveExtraDataField(self, name, fieldDate, expires):
        name = name.upper()
        _extraField = {
            'name': name,
            'datecreated': fieldDate,
            'expires': int(expires)
        }
        self._extraData[name] = _extraField

    def _isFileReadable(self, fileName):
        """ Check if a file is readable """
        if os.path.exists(fileName):
            if os.path.isfile(fileName):
                return os.access(fileName, os.R_OK)
            else:
                return False 
        else:
            return False  

    def _getFieldType(self,name):
        result = None
        for index,fieldData in enumerate(self._fields["data"]):
            if fieldData["name"] == name:
                result = fieldData
                break

        return result

    def _getFieldValue(self, label, format, samples):
        regex =  r"\$\{.*?\}"

        if format is not None:
            formatArray = format.split(',')

        if samples is not None:
            sampleArray = samples.split(',')
            
        matches = re.finditer(regex, label, re.MULTILINE | re.IGNORECASE)

        for matchNum, match in enumerate(matches, start=1):   
            fieldFormat = None
            if format is not None:
                try:
                    fieldFormat = formatArray[matchNum-1]
                except IndexError:
                    fieldFormat = ''

            field = match.group()
            fieldType = self._getFieldType(field)

            sample = ""
            placeHolder = field.replace("${", "")
            placeHolder = placeHolder.replace("}", "")
            envCheck = "AS_" + placeHolder.upper()
            if envCheck in os.environ:
                sample = os.environ[envCheck]

            if (field == '${SUNRISE}'):
                sample = self._sunRise
            
            if (field == '${SUNSET}'):
                sample = self._sunSet

            if (field == '${MOON_AZIMUTH}'):
                sample = self._moonAzimuth

            if (field == '${MOON_ELEVATION}'):
                sample = self._moonElevation

            if (field == '${MOON_ILLUMINATION}'):
                sample = self._moonIllumination

            if (field == '${MOON_SYMBOL}'):
                sample = self._moonPhaseSymbol

            if (field == '${CAMERA_TYPE}'):
                sample = 'ZWO'

            if (field == '${DAY_OR_NIGHT}'):
                sample = 'NIGHT'

            if (field == '${STARCOUNT}'):
                sample = str(random.randint(10, 352))

            if (field == '${sEXPOSURE}'):
                sample = "28.93 ms (0.03 sec)"

            if field in self._userData:
                sample = self._userData[field]

            if samples is not None:
                if sample == "":
                    try:
                        sample = sampleArray[matchNum-1]
                    except IndexError:
                        sample = ""

            if fieldType is not None:
                if (fieldType["type"] == "Date" or fieldType["type"] == "Time"):
                    sample = datetime.now()
                    if fieldFormat is not None:
                        sample = sample.strftime(fieldFormat)
                    else:
                        sample = sample.strftime('%Y-%m-%d %H:%M:%S')
                    label = label.replace(field, sample)
                elif  (fieldType["type"] == "Number"):
                    if fieldFormat is not None and fieldFormat != "":
                        if sample != "":
                            try:
                                fieldFormat = fieldFormat.replace("%", "{:.") + "}"
                                sample = float(sample)
                                sample = fieldFormat.format(sample)
                            except ValueError:
                                sample = "Error"
                    label = label.replace(field, sample)
                else:
                    label = label.replace(field, sample)
            else:
                label = label.replace(field, sample)

        return label

    def process(self):
        self._initialiseMoon()
        self._initialiseSun()

        for index,fieldData in enumerate(self._overlay["fields"]):
            label = fieldData["label"]
            
            format = None
            if "format" in fieldData:
                format = fieldData["format"]

            samples = None
            if "sample" in fieldData:
                samples = fieldData["sample"]

            newLabel = self._getFieldValue(label, format, samples)

            self._sampleData[fieldData['id']] = newLabel
        
        return self._sampleData

    def _initialiseMoon(self):
        """ Setup all of the data for the Moon """
        lat = radians(self._convertLatLon(self._observerLat))
        lon = radians(self._convertLatLon(self._observerLon))

        observer = ephem.Observer()  
        observer.lat = lat
        observer.long = lon 
        moon = ephem.Moon()      
        observer.date = date.today()
        observer.date = datetime.now()        
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

        return True

    def _initialiseSun(self):
        sunEnabled = self._overlay['settings']['defaultincludesun']
        if sunEnabled:        
            sun = Sun(self._convertLatLon(self._observerLat), self._convertLatLon(self._observerLon))
            sunRise = sun.get_local_sunrise_time()
            sunSet = sun.get_local_sunset_time()
            self._sunRise  = sunRise.strftime('%H:%M')
            self._sunSet  = sunSet.strftime('%H:%M')

        return True

    def _convertLatLon(self, input):
        """ Converts the lat and lon from the all sky config to decimal notation i.e. 0.2E becomes -0.2"""
        multiplier = 1 if input[-1] in ['N', 'E'] else -1
        return multiplier * sum(float(x) / 60 ** n for n, x in enumerate(input[:-1].split('-')))

    def _initPlanets(self):

        planetsEnabled = self._overlay["settings"]["defaultincludeplanets"]

        if planetsEnabled:
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
            ts = load.timescale()
            t = ts.now()
            earth = self._eph['earth']

            home = earth + wgs84.latlon(self._convertLatLon(self._observerLat) * N, self._convertLatLon(self._observerLon) * W)

            for planetId in planets:
                planet = self._eph[planetId]
                astrometric = home.at(t).observe(planet)
                alt, az, d = astrometric.apparent().altaz()
                #print(planetId, alt, az)
                os.environ['AS_' + planetId.replace(' BARYCENTER','') + 'ALT'] = str(alt)
                os.environ['AS_' + planetId.replace(' BARYCENTER','') + 'AZ'] = str(az)

                if alt.degrees > 5:
                    os.environ['AS_' + planetId.replace(' BARYCENTER','') + 'VISIBLE'] = 'Yes'
                else:
                    os.environ['AS_' + planetId.replace(' BARYCENTER','') + 'VISIBLE'] = 'No'
            
        return True

    def _fetchTleFromCelestrak(self, noradCatId, verify=True):

        tleFileName = os.path.join(self._tleFolder, noradCatId + '.tle')

        self._createTempDir(self._tleFolder)

        if os.path.exists(tleFileName):
            fileModifiedTime = int(os.path.getmtime(tleFileName))
            fileAge = int(time.time()) - fileModifiedTime
            fileAge = fileAge / 60 / 60 / 24
        else:
            fileAge = 9999

        if fileAge > 2:
            r = requests.get('https://www.celestrak.com/NORAD/elements/gp.php?CATNR={}'.format(noradCatId), verify=verify, timeout=5)
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
        else:
            tle = {}
            with open(tleFileName) as f:
                tle[0] = f.readline()
                tle[1] = f.readline()
                tle[2] = f.readline()

        return tle[0].strip(), tle[1].strip(), tle[2].strip()

    def _initSatellites(self):
        satellites = self._overlay["settings"]["defaultnoradids"]
        satellites = satellites.strip()

        if satellites != '':
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
                    os.environ['AS_' + noradId + 'ALT'] = str(alt)
                    os.environ['AS_' + noradId + 'AZ'] = str(az)

                    if alt.degrees > 5 and sunlit:
                        os.environ['AS_' + noradId + 'VISIBLE'] = 'Yes'
                    else:
                        os.environ['AS_' + noradId + 'VISIBLE'] = 'No'
                except LookupError:
                    self._log(4,'ERROR: Norad ID ' + noradId + ' Not found')
        else:
            pass

        return True

if __name__ == "__main__":
    sampleProcessor = ALLSKYANNOTATESAMPLE()
    result = sampleProcessor.process()
    result = json.dumps(result)
    print(result)
