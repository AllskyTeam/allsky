#!/usr/bin/python3

import os 
import json
import pprint
import re
import urllib.request
import argparse

class ALLSKYI2CPROCESSOR:
    _URLS = [
        'https://raw.githubusercontent.com/adafruit/I2C_Addresses/main/0x00-0x0F.md',
        'https://raw.githubusercontent.com/adafruit/I2C_Addresses/main/0x10-0x1F.md',
        'https://raw.githubusercontent.com/adafruit/I2C_Addresses/main/0x20-0x2F.md',
        'https://raw.githubusercontent.com/adafruit/I2C_Addresses/main/0x30-0x3F.md',
        'https://raw.githubusercontent.com/adafruit/I2C_Addresses/main/0x40-0x4F.md',
        'https://raw.githubusercontent.com/adafruit/I2C_Addresses/main/0x50-0x5F.md',
        'https://raw.githubusercontent.com/adafruit/I2C_Addresses/main/0x60-0x6F.md',
        'https://raw.githubusercontent.com/adafruit/I2C_Addresses/main/0x70-0x7F.md'
    ]
    
    _IC2 = {}
    _home = '/tmp'
    
    def __init__(self, home): 
        self._home = home

    def var_dump(self, variable):
        pprint.PrettyPrinter(indent=2, width=128).pprint(variable)
    
    def _downloadFile(self, url):
        print(f'INFO: Downloading file {url}')
        response = urllib.request.urlopen(url)
        data = response.read()
        text = data.decode('utf-8') 
        array = text.splitlines()
        return array
    
    def _processLine(self, line, currentAddress):
        lineData = {
            'device': '',
            'url': '',
            'addresses': ''
        }
        if line.startswith('['):
            res = re.findall(r'\[.*?\]', line)
            data = res[0].replace('[','').replace(']','')
            lineData['device'] = data
            res = re.findall(r'\(.*?\)', line)
            if len(res) > 0:
                data = res[0].replace('(','').replace(')','')
                lineData['url'] = data
            if len(res) > 1:
                data = res[1].replace('(','').replace(')','')
                lineData['addresses'] = data
        else:
            res = re.findall(r'\(.*?\)', line)
            if len(res) == 1:
                lineData['device'] = line.replace(res[0],'').strip()
                data = res[0].replace('(','').replace(')','')
                lineData['addresses'] = data
            else:
                lineData['device'] = line
        
        print(f"INFO: Address '{currentAddress}' -  Added device '{lineData['device']}', url '{lineData['url']}', addresses '{lineData['addresses']}'")
        return lineData
     
    def run(self):
        
        for url in self._URLS:
            rawData = self._downloadFile(url)
            
            currentAddress = ''
            for lineData in rawData:
                if lineData.startswith('##'):
                    currentAddress = lineData.replace('## ', '')
                    self._IC2[currentAddress] = []
                
                if currentAddress != '':
                    if lineData.startswith('- '):
                        info = lineData.replace('- ', '', 1)
                        deviceData = self._processLine(info, currentAddress)
                        self._IC2[currentAddress].append(deviceData)

        jsonData = json.dumps(self._IC2, indent=4)
        destFile = os.path.join(self._home, 'config', 'i2c.json')

        with open(destFile, mode='wt') as file:
            file.write(jsonData)
            print(f'INFO: I2C data written to {destFile}')
        
if __name__ == '__main__':
    
    if 'ALLSKY_HOME' in os.environ:
        home = os.environ['ALLSKY_HOME']
    else:
        parser = argparse.ArgumentParser()
        parser.add_argument("--allskyhome", type=str, default="/home/pi/allsky", help="Allsky home directory")
        args = parser.parse_args()
        home = args.allskyhome
    
    processor = ALLSKYI2CPROCESSOR(home)
    processor.run()