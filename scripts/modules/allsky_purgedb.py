""" allsky_export.py

Part of allsky postprocess.py modules.
https://github.com/AllskyTeam/allsky

"""
import allsky_shared as allsky_shared
from allsky_base import ALLSKYMODULEBASE
import sqlite3
import mysql.connector
import time
import os

class ALLSKYPURGEDB(ALLSKYMODULEBASE):

    meta_data = {
        "name": "Purge DB Entries",
        "description": "Purge old data from the Allsky database.",
        "module": "allsky_purgedb",
        "testable": "true",
        "centersettings": "false",
		"version": "v1.0.0",
		"group": "Allsky Core",    
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
                "help": "Enable to have old data automatically purged from the database.",                
                "tab": "Purge",
                "type": {
                    "fieldtype": "checkbox"
                }
            },       
            "runevery" : {
                "required": "true",
                "description": "Frequency",
                "help": "How frequently to purge data, in hours.",                
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
                "help": "Number of hours to keep data for.",
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

    def _purge_sqlite(self, age_seconds, age_hours):
        result = ''
        
        print(f'Purging data older than {age_hours} hours from SQLite')

        try:
            base_path = allsky_shared.get_environment_variable('ALLSKY_MYFILES_DIR')
            database_path = os.path.join(base_path, 'allsky.db')
                                
            conn = sqlite3.connect(database_path)
            cursor = conn.cursor()

            cutoff = int(time.time()) - age_seconds

            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = cursor.fetchall()

            for table in tables:
                table_name = table[0]

                cursor.execute(f'PRAGMA table_info({table_name})')
                columns = cursor.fetchall()

                column_names = [col[1] for col in columns]

                if 'timestamp' in column_names:
                    cursor.execute(f'SELECT COUNT(*) FROM {table_name} WHERE timestamp < ?', (cutoff,))
                    count = cursor.fetchone()[0]

                    if count > 0:                
                        print(f'Deleting {count} old records from table: {table_name}')
                        cursor.execute(f'DELETE FROM {table_name} WHERE timestamp < ?', (cutoff,))
                        conn.commit()
                    else:
                        print(f'No records found for deletion from {table_name}')

            cursor.execute(f'VACUUM;')
            conn.close()
            
            result = 'SQLite purged'
        except Exception as e:
            result = f'Skipping SQLite purgedue to error: {e}'
            self.log(result)
                    
        return result


    def _purge_mysql(self, database_config, age_seconds, age_hours):
        result = ''
        
        print(f'Purging data older than {age_hours} hours from MySQL')
        
        try:
            conn = mysql.connector.connect(
                host=database_config['databasehost'],
                user=database_config['databaseuser'],
                password=database_config['databasepassword'],
                database=database_config['databasedatabase']
            )
                        
            cursor = conn.cursor()
            cutoff = int(time.time()) - age_seconds

            cursor.execute('SHOW TABLES')
            tables = [row[0] for row in cursor.fetchall()]

            for table_name in tables:
                try:
                    cursor.execute(f"SHOW COLUMNS FROM `{table_name}` LIKE 'timestamp'")
                    if cursor.fetchone():
                        cursor.execute(f"SELECT COUNT(*) FROM `{table_name}` WHERE `timestamp` < %s", (cutoff,))
                        count = cursor.fetchone()[0]

                        if count > 0:
                            print(f'Deleting {count} old records from table: {table_name}')
                            cursor.execute(f"DELETE FROM `{table_name}` WHERE `timestamp` < %s", (cutoff,))
                            conn.commit()
                        else:
                            print(f'No records found for deletion from {table_name}')

                except Exception as e:
                    print(f'Skipping table {table_name} due to error: {e}')

            cursor.close()
            conn.close()
            
            result = 'MySQL purged'
        except Exception as e:
            result = f'Skipping MySQL purgedue to error: {e}'
            self.log(result)
                        
        return result

    
    
    def run(self):
        result =''

        frequency = self.get_param('runevery', 1, int)
        frequency = frequency * 60 *60

        should_run, diff = allsky_shared.should_run('allskypurgedb', frequency)    
        if should_run or self.debug_mode:
               
            age_hours = self.get_param('hourstokeep', 24, int)
            age_seconds = 60 * 60 * age_hours
            
            database_config = self.get_database_config()
            
            if database_config['databasetype'] == 'mysql':
                result = self._purge_mysql(database_config, age_seconds, age_hours)
            
            if database_config['databasetype'] == 'sqlite':
                result = self._purge_sqlite(age_seconds, age_hours)
        
            allsky_shared.set_last_run('allskypurgedb')
        else:
            seconds = frequency - diff
            hours = seconds // 3600
            minutes = (seconds % 3600) // 60
            secs = int(seconds % 60)

            result = f'Will run in {hours}h {minutes}m {secs}s'

            self.log(1, f'INFO: {result}')
        
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
