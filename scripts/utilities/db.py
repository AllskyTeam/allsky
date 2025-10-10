#!/usr/bin/python3

"""
Allsky Database Management Script

This script provides utilities to:
 - Ensure the database schema (install mode)
 - Run ad-hoc SQL queries (run mode)

"""

import os
import sys
import argparse
import json

# Determine the directory of this script
here = os.path.dirname(os.path.abspath(__file__))

# -------------------------------------------------------------------------
# Ensure we are running inside the Allsky Python virtual environment
# -------------------------------------------------------------------------
try:
    # Get the path to the Allsky Python virtual environment
    venv_dir = os.environ['ALLSKY_PYTHON_VENV']
except KeyError:
    # Environment not initialized — exit with an error
    print("ERROR: This program needs to be run in an Allsky environment with variables.sh or variables.json sourced in.")
    sys.exit(1)

# Expected Python interpreter inside the virtual environment
venv_python = os.path.join(venv_dir, 'bin', 'python3')

# If the current interpreter is not the venv one, re-execute using it
if sys.executable != venv_python:
    os.execv(venv_python, [venv_python] + sys.argv)

# -------------------------------------------------------------------------
# Extend Python path to include the Allsky 'modules' directory
# -------------------------------------------------------------------------
modules_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'modules')
sys.path.append(modules_dir)

# Import shared Allsky module utilities
import allsky_shared as shared


# =============================================================================
#  Class: ALLSKYDB
#  Provides methods for installing database schema and executing SQL queries.
# =============================================================================
class ALLSKYDB:
    def __init__(self, debug: bool = False):
        """
        Initialize the database utility class.

        :param debug: Enables verbose debug output if True
        """
        self.debug_mode = debug

    # ---------------------------------------------------------------------
    # Install or verify database schema based on db_data.json definitions
    # ---------------------------------------------------------------------
    def install(self):
        exit_code = 0
        # Attempt to get a database connection
        database_conn = shared.get_database_connection(silent=not self.debug_mode)

        if database_conn is not None:
            # Configuration file containing database table definitions
            db_config_file = os.path.join(os.environ['ALLSKY_CONFIG'], 'db_data.json')
            try:
                # Load the table definition JSON
                with open(db_config_file, 'r') as file:
                    db_data = json.load(file)

                    # Loop through each table definition
                    for table_name, table_info in db_data.items():
                        if self.debug_mode:
                            print(f"Table: {table_name}")
                            print("  Definition:")
                            for key, value in table_info['definition'].items():
                                print(f"    {key}: {value}")
                            print(f"  Purge days: {table_info['purge_days']}")
                            print("-" * 40)

                        # Extract table column definitions and primary key
                        columns = table_info.get('definition').get('columns', None)
                        primary_key = table_info.get('definition').get('primary_key', None)

                        # Ensure columns exist in the database, creating or modifying as needed
                        if primary_key is not None and columns is not None:
                            added_columns = database_conn.ensure_columns(
                                table_name, columns, primary_key=[primary_key]
                            )

                            # Debug output of added/modified columns
                            if self.debug_mode:
                                print(f"Columns added: {added_columns if added_columns else 'None'}")
                                print("-" * 40)
                                print("\n")

                    result = 'OK'
            except FileNotFoundError:
                # Config file missing
                result = f"Failed to open {db_config_file}"
                exit_code = 1
        else:
            # Database connection failed
            result = "Connection failed"
            exit_code = 1

        # Print result and exit with appropriate code
        print(result)
        sys.exit(exit_code)

    # ---------------------------------------------------------------------
    # Run arbitrary SQL queries against the database
    # ---------------------------------------------------------------------
    def run(self, query, return_format):
        """
        Execute an SQL query and print results in the desired format.

        :param query: SQL query string to execute
        :param return_format: Output format ('tab' or 'json')
        """
        result = ''
        database_conn = shared.get_database_connection(silent=not self.debug_mode)

        if database_conn is not None:
            # Execute query and capture result
            query_result = database_conn.run_sql(query)

            if query_result['ok']:
                # SELECT queries return rows
                if query_result['type'] == 'select':
                    if return_format == 'json':
                        # Return as JSON structure
                        result = query_result['rows']
                    elif return_format == 'tab':
                        # Format as tab-separated text
                        rows = query_result.get("rows", [])
                        keys = list(rows[0].keys()) if rows else []
                        result = "\n".join(
                            "\t".join(str(row.get(k, "")) for k in keys) for row in rows
                        )
                else:
                    # Non-select queries (INSERT/UPDATE/DELETE)
                    result = 'Ok'
            else:
                # Query execution error
                result = query_result.get('error_code', 'Unknown')
        else:
            # Database connection failed
            result = 'Connection failed'

        # Output result and exit with appropriate code
        print(result)
        sys.exit(0 if query_result['ok'] else 1)


# =============================================================================
#  Main entry point
# =============================================================================
if __name__ == "__main__":
    # ---------------------------------------------------------------------
    # Parse command-line arguments
    # ---------------------------------------------------------------------
    parser = argparse.ArgumentParser(description="Allsky database interface")

    # global flag
    parser.add_argument("--debug", action="store_true", help="Enable debug mode, shows more detailed errors")

    # main modes (mutually exclusive)
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--install", action="store_true", help="Runs the Allsky database installation routines")
    modes.add_argument("--run", metavar="SQL", type=str, help="Runs the specified SQL query against the database")
    modes.add_argument("--purge", action="store_true", help="Purges data from the Allsky database")
    modes.add_argument("--purgedryrun", action="store_true", help="Performs a dry run purge of data from the Allsky database")

    # only meaningful for --run
    parser.add_argument( "--format", choices=["tab", "json"], help="Output format for --run: 'tab' or 'json' (default: 'tab' when using --run)")

    args = parser.parse_args()
    
    # --format only allowed with --run
    if args.format and not args.run:
        parser.error("--format can only be used together with --run")

    # Default format when --run is used but no --format given
    if args.run and not args.format:
        args.format = "tab"

    # Sanity check for empty SQL
    if args.run is not None and args.run.strip() == "":
        parser.error("--run requires a non-empty SQL string")
        
    # Create instance of the database handler
    allsky_db = ALLSKYDB(args.debug)

    # Execute chosen operation
    if args.install:
        allsky_db.install()
        sys.exit(0)
        
    if args.run:
        allsky_db.run(args.run, args.format)
        sys.exit(0)
        
    if args.purge:
        shared.purge_database()
        sys.exit(0)
                
    if args.purgedryrun:
        shared.purge_database(True)
        sys.exit(0)        