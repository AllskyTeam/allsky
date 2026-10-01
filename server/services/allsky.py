import os
import json
import sys

def get_allsky_status():
    base_path = os.getenv('ALLSKY_HOME')
    if not base_path:
        raise EnvironmentError("ALLSKY_HOME environment variable is not set.")

    file_path = os.path.join(base_path, 'config', 'status.json')

    if not os.path.exists(file_path):
        raise FileNotFoundError(f"status.json not found at: {file_path}")

    status = {
        'allsky': {},
        'modules': {},
        'debug': {}
    }
    with open(file_path, 'r') as f:
        status['allsky'] = json.load(f)

    try:
        sys.path.insert(1, '/home/pi/allsky/tmp')
        database = __import__('allskydb')
        status['modules'] = database.DataBase
    except:
        pass
  
    try:
        sys.path.insert(1, '/home/pi/allsky/tmp')
        database = __import__('allskydebugdb')
        status['debug'] = database.DataBase
    except:
        pass
    
    return status