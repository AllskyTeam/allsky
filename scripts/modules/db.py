#!/usr/bin/python3

import os
import sys

here = os.path.dirname(os.path.abspath(__file__))
try:
    venv_dir = os.environ['ALLSKY_PYTHON_VENV']
except KeyError:
    print("ERROR: This program needs to be run in an Allsky environment with variables.sh or variables.json sourced in.")
    sys.exit(1)
venv_python = os.path.join(venv_dir, 'bin', 'python3')
if sys.executable != venv_python:
    os.execv(venv_python, [venv_python] + sys.argv)
   
import allsky_shared as shared
import argparse
import json

class ALLSKYDB():
    def __init__(self, debug:bool=False):
        self.debug_mode = debug
    
    def install(self):
        exit_code = 0
        database_conn = shared.get_database_connection(silent=False if self.debug_mode else True)
        if database_conn is not None:
            db_config_file = os.path.join(os.environ['ALLSKY_CONFIG'], 'db_data.json')
            try:
                with open(db_config_file, 'r') as file:
                    db_data = json.load(file)

                    for table_name, table_info in db_data.items():
                        if self.debug_mode:
                            print(f"Table: {table_name}")
                            print("  Definition:")
                            for key, value in table_info['definition'].items():
                                print(f"    {key}: {value}")
                            print(f"  Purge days: {table_info['purge_days']}")
                            print("-" * 40)

                        columns = table_info.get('definition').get('columns', None)
                        primary_key = table_info.get('definition').get('primary_key', None)
                        
                        if primary_key is not None and columns is not None:
                            added_columns = database_conn.ensure_columns(table_name, columns, primary_key=[primary_key])
                            if self.debug_mode:
                                print(f"Columns added: {added_columns if added_columns else 'None'}")
                                print("-" * 40)
                                print("\n")
                                
                    result = 'OK'
            except FileNotFoundError:
                result = f"Failed to open {db_config_file}"
                exit_code = 1 
        else:
            result = "Connection failed"
            exit_code = 1
    
        print(result)
        sys.exit(exit_code)
        
    def run(self, query, return_format):
        result = ''
        database_conn = shared.get_database_connection(silent=False if self.debug_mode else True)
        if database_conn is not None:        
            query_result = database_conn.run_sql(query)
            if query_result['ok']:
                if query_result['type'] == 'select':
                    if return_format == 'json':
                        result = query_result['rows']
                    if return_format == 'tab':
                        rows = query_result.get("rows", [])
                        keys = list(rows[0].keys()) if rows else []
                        result = "\n".join("\t".join(str(row.get(k, "")) for k in keys) for row in rows)
                else:
                    result = 'Ok'
            else:
                result = query_result.get('error_code', 'Unknown')
        else:
            result = 'Connection failed'
            
        print(result)
        sys.exit(0 if query_result['ok'] else 1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Allsky database interface")
    parser.add_argument("--debug", action="store_true", help="Enable debug mode, shows more detailed errors")    
    parser.add_argument("--install", action="store_true", help="Runs the Allsky database installation routines")
    parser.add_argument("--run", type=str, help="Runs the specified SQL query against the database")
    parser.add_argument("--format", choices=["tab", "json"], default="tab", help="Output format for --run: 'tab' for tab-separated or 'json' for JSON output (default: tab)")  
    args = parser.parse_args()    
    
    allsky_db = ALLSKYDB(args.debug)
        
    if args.install:
        allsky_db.install()

    if args.run:
        allsky_db.run(args.run, args.format)