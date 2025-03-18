""" allsky_export.py

Part of allsky postprocess.py modules.
https://github.com/AllskyTeam/allsky

"""
import allsky_shared as allsky_shared
from allsky_base import ALLSKYMODULEBASE
import sqlite3
import time
import os

class ALLSKYPURGEDB(ALLSKYMODULEBASE):

    meta_data = {
        "name": "Allsky Purge DB",
        "description": "Purges data from the Allsky modules database",
        "module": "allsky_purgedb",
        "testable": "true",
        "centersettings": "false",
		"version": "v1.0.0",        
        "events": [
            "day",
            "night",
            "periodic",
            "nightday",
            "daynight"
        ],
        "arguments":{
            "purgedata": "False",
            "runevery": 1,
            "hourstokeep": 24
        },
        "argumentdetails": {
            "purgedata" : {
                "required": "false",
                "description": "Enable Purge",
                "tab": "Purge",
                "type": {
                    "fieldtype": "checkbox"
                }
            },       
            "runevery" : {
                "required": "true",
                "description": "Frequency",
                "help": "How frequently to purge data, in hours",                
                "tab": "Purge",
                "type": {
                    "fieldtype": "spinner",
                    "min": 1,
                    "max": 24,
                    "step": 1
                },
                "filters": {
                    "filter": "purgedata",
                    "filtertype": "show",
                    "values": [
                        "purgedata"
                    ]
                }
            },
            "hourstokeep" : {
                "required": "true",
                "description": "Hours To Keep",
                "help": "How many hours to keep data for",                
                "tab": "Purge",
                "type": {
                    "fieldtype": "spinner",
                    "min": 0,
                    "max": 6000,
                    "step": 1
                },
                "filters": {
                    "filter": "purgedata",
                    "filtertype": "show",
                    "values": [
                        "purgedata"
                    ]
                }    
            }      
        },
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
        
        base_path = allsky_shared.get_environment_variable('ALLSKY_MYFILES_DIR')
        database_path = os.path.join(base_path, 'allsky.db')
                            
        conn = sqlite3.connect(database_path)
        cursor = conn.cursor()

        threshold_time = time.time() - (24 * 60 * 60)

        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()

        for table in tables:
            table_name = table[0]

            cursor.execute(f'PRAGMA table_info({table_name})')
            columns = cursor.fetchall()

            column_names = [col[1] for col in columns]

            if 'timestamp' in column_names:
                cursor.execute(f'SELECT COUNT(*) FROM {table_name} WHERE timestamp < ?', (threshold_time,))
                count = cursor.fetchone()[0]

                if count > 0:                
                    print(f'Deleting {count} old records from table: {table_name}')
                    cursor.execute(f'DELETE FROM {table_name} WHERE timestamp < ?', (threshold_time,))
                    conn.commit()
                else:
                    print(f'No records found for deletion from {table_name}')

        conn.close()
        
        return result


def purgedb(params, event):
	allsky_purgedb = ALLSKYPURGEDB(params, event)
	result = allsky_purgedb.run()

	return result 

def purgedb_cleanup():
	moduleData = {
		"metaData": ALLSKYPURGEDB.meta_data,
		"cleanup": {
			"files": {
			},
			"env": {}
		}
	}
	allsky_shared.cleanup_module(moduleData)