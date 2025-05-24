#!/home/pi/allsky/venv//bin/python3

# REPLACE WITH CORRECT PATH AT INSTALL TIME

import os

scriptName = f"html{os.environ['SCRIPT_NAME']}"
scriptFileName = os.environ["SCRIPT_FILENAME"]
allSkyHome = scriptFileName.replace(scriptName, "")
allskyConfig = os.path.join(allSkyHome, 'config')
i2cDataFile = os.path.join(allskyConfig, 'i2c.json')

file = open(i2cDataFile, 'r')
data = file.read()
file.close()

print(data)