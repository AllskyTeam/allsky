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
    # Environment not initialized - exit with an error
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

    def _print_status(self, message):
        if self.debug_mode:
            print(message)

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
        self._print_status(result)
        sys.exit(exit_code)

    # ---------------------------------------------------------------------
    # Run arbitrary SQL queries against the database
    # ---------------------------------------------------------------------
    def run(self, query, return_format, include_columns=False, format_explicitly_set=False):
        """
        Execute an SQL query and print results in the desired format.

        :param query: SQL query string to execute
        :param return_format: Output format ('tab' or 'json')
        :param include_columns: Include column names in the output
        :param format_explicitly_set: True when --format was supplied on the CLI
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
                        if include_columns:
                            rows = query_result.get('rows', [])
                            columns = list(rows[0].keys()) if rows else []
                            result = {
                                'columns': columns,
                                'rows': rows
                            }
                        else:
                            result = query_result['rows']
                    elif return_format == 'tab':
                        # Format as aligned plain text unless tab output was explicitly requested
                        rows = query_result.get("rows", [])
                        keys = list(rows[0].keys()) if rows else []
                        lines = []
                        if format_explicitly_set:
                            for row in rows:
                                lines.append("\t".join(str(row.get(key, "")) for key in keys))
                        else:
                            widths = {}
                            for key in keys:
                                widths[key] = len(str(key))

                            for row in rows:
                                for key in keys:
                                    widths[key] = max(widths[key], len(str(row.get(key, ""))))

                            if include_columns and keys:
                                header = "  ".join(str(key).ljust(widths[key]) for key in keys)
                                separator = "  ".join("-" * widths[key] for key in keys)
                                lines.append(header)
                                lines.append(separator)

                            for row in rows:
                                line = "  ".join(str(row.get(key, "")).ljust(widths[key]) for key in keys)
                                lines.append(line.rstrip())
                        result = "\n".join(lines)
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
        query_type = query_result.get('type')
        if query_type == 'select' or not query_result['ok']:
            print(result)
        else:
            self._print_status(result)
        sys.exit(0 if query_result['ok'] else 1)

    def save_from_definition(self, table_name, values, event='postcapture'):
        """
        Build an in-memory metadata/extradata structure and write supplied
        values through the normal Allsky extra-data database pipeline.

        :param table_name: Table name identifying the database target
        :param values: List of "COLUMN,VALUE" strings
        :param event: Allsky event type for database save rules
        """
        table_definition = self._get_db_table_definition(table_name)
        meta_data = self._build_meta_data(table_name, table_definition)
        structure = meta_data['extradata']
        db_column_types = table_definition.get('columns', {})

        structure = self._build_dummy_structure(structure, values, db_column_types)
        extra_data = self._build_extra_data(values, structure, db_column_types)
        shared.save_extra_data(None, extra_data, None, structure, event=event)

        self._print_status("OK")
        sys.exit(0)

    def _build_meta_data(self, table_name, table_definition):
        primary_key = table_definition.get('primary_key', 'id')
        primary_key_type = table_definition.get('columns', {}).get(primary_key, 'int')

        database_definition = {
            'enabled': 'True',
            'table': table_name,
            'pk': primary_key,
            'pk_type': primary_key_type,
            'include_all': 'true'
        }

        primary_key_source = table_definition.get('pk_source')
        if primary_key_source:
            database_definition['pk_source'] = primary_key_source

        return {
            'extradatafilename': None,
            'module': None,
            'extradata': {
                'database': database_definition,
                'values': {}
            }
        }

    def _get_db_table_definition(self, table_name):
        table_name = str(table_name).strip()
        if not table_name:
            raise ValueError(f"Invalid table name '{table_name}'")

        db_config_file = os.path.join(os.environ['ALLSKY_CONFIG'], 'db_data.json')
        try:
            with open(db_config_file, 'r') as file_handle:
                db_data = json.load(file_handle)
        except FileNotFoundError:
            raise ValueError(f"Unable to find {db_config_file}")

        table_definition = db_data.get(table_name, {}).get('definition', {})
        if not table_definition:
            raise ValueError(f"Table '{table_name}' is not defined in {db_config_file}")

        return table_definition

    def _build_dummy_structure(self, structure, raw_values, db_column_types):
        updated_structure = json.loads(json.dumps(structure))
        updated_structure['values'] = {
            'id': {
                'name': '${id}',
                'format': '',
                'sample': '',
                'group': 'Imported',
                'description': 'id',
                'type': 'int',
                'dbtype': 'int'
            }
        }

        primary_key = updated_structure.get('database', {}).get('pk', 'id')
        reserved_columns = {'timestamp'}

        for item in raw_values:
            if ',' not in item:
                raise ValueError(
                    f"Invalid value '{item}'. Use COLUMN,VALUE and quote entries containing spaces."
                )

            key, _ = item.split(',', 1)
            key = key.strip()

            if key in reserved_columns:
                raise ValueError(f"Column '{key}' is reserved and cannot be set via -v")

            column_type = db_column_types.get(key)
            if column_type is None:
                raise ValueError(f"Column '{key}' is not defined in {os.environ['ALLSKY_CONFIG']}/db_data.json")

            updated_structure['values'][key] = {
                'name': f"${{{key}}}",
                'format': '',
                'sample': '',
                'group': 'Imported',
                'description': key,
                'type': self._map_db_type_to_metadata_type(column_type),
                'dbtype': column_type
            }

        return updated_structure

    def _build_extra_data(self, raw_values, structure, db_column_types):
        value_definitions = structure.get('values', {})
        extra_data = {}
        primary_key = structure.get('database', {}).get('pk', 'id')

        for item in raw_values:
            if ',' not in item:
                raise ValueError(
                    f"Invalid value '{item}'. Use COLUMN,VALUE and quote entries containing spaces."
                )

            key, value = item.split(',', 1)
            key = key.strip()
            value = value.strip()

            if key not in value_definitions:
                raise ValueError(f"Column '{key}' is not defined in the generated extradata structure")

            column_type = db_column_types.get(key)
            if key in (primary_key, 'timestamp'):
                column_type = None

            extra_data[key] = self._convert_value(value, value_definitions[key], column_type)

        return extra_data

    def _map_db_type_to_metadata_type(self, column_type):
        lowered_column_type = str(column_type).lower()

        if any(token in lowered_column_type for token in ('tinyint(1)', 'bool', 'boolean')):
            return 'bool'

        if any(token in lowered_column_type for token in ('int', 'bigint', 'smallint')):
            return 'int'

        if any(token in lowered_column_type for token in ('float', 'double', 'decimal', 'real')):
            return 'number'

        return 'string'

    def _convert_value(self, value, definition, column_type=None):
        if column_type:
            lowered_column_type = str(column_type).lower()
            if any(token in lowered_column_type for token in ('tinyint(1)', 'bool', 'boolean')):
                lowered = value.lower()
                if lowered in ('true', '1', 'yes', 'on'):
                    return True
                if lowered in ('false', '0', 'no', 'off'):
                    return False
                raise ValueError(f"Invalid boolean value '{value}'")

            if any(token in lowered_column_type for token in ('int', 'bigint', 'smallint')):
                return int(value)

            if any(token in lowered_column_type for token in ('float', 'double', 'decimal', 'real')):
                return float(value)

        value_type = str(definition.get('type', 'string')).lower()

        if value_type in ('bool', 'boolean'):
            lowered = value.lower()
            if lowered in ('true', '1', 'yes', 'on'):
                return True
            if lowered in ('false', '0', 'no', 'off'):
                return False
            raise ValueError(f"Invalid boolean value '{value}'")

        if value_type in ('int', 'integer'):
            return int(value)

        if value_type in ('number', 'float', 'double', 'decimal', 'temperature'):
            return float(value)

        return value


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
    parser.add_argument("-t", "--table", help="Target database table for a database write")
    parser.add_argument("-v", "--values", nargs="+", metavar="COLUMN,VALUE", help="Column/value pairs for database write mode")
    parser.add_argument("--event", default="postcapture", help="Allsky event name to use for database write mode (default: postcapture)")

    # main modes (mutually exclusive)
    modes = parser.add_mutually_exclusive_group(required=False)
    modes.add_argument("--install", action="store_true", help="Runs the Allsky database installation routines")
    modes.add_argument("--run", metavar="SQL", type=str, help="Runs the specified SQL query against the database")
    modes.add_argument("--purge", action="store_true", help="Purges data from the Allsky database")
    modes.add_argument("--purgedryrun", action="store_true", help="Performs a dry run purge of data from the Allsky database")

    # only meaningful for --run
    parser.add_argument( "--format", choices=["tab", "json"], help="Output format for --run: 'tab' or 'json' (default: 'tab' when using --run)")
    parser.add_argument("--columns", action="store_true", help="Include column names in --run output")

    args = parser.parse_args()
    
    format_explicitly_set = args.format is not None

    # --format and --columns only allowed with --run
    if args.format and not args.run:
        parser.error("--format can only be used together with --run")
    if args.columns and not args.run:
        parser.error("--columns can only be used together with --run")
    if args.columns and args.format == "tab":
        parser.error("--columns cannot be used together with --format tab")

    # Default format when --run is used but no --format given
    if args.run and not args.format:
        args.format = "tab"

    # Sanity check for empty SQL
    if args.run is not None and args.run.strip() == "":
        parser.error("--run requires a non-empty SQL string")

    standard_modes_selected = sum(bool(mode) for mode in (args.install, args.run, args.purge, args.purgedryrun))
    file_mode_selected = bool(args.table or args.values)

    if standard_modes_selected == 0 and not file_mode_selected:
        parser.error("Specify one of --install, --run, --purge, --purgedryrun, or use -t with -v")

    if standard_modes_selected > 0 and file_mode_selected:
        parser.error("-t/-v cannot be combined with --install, --run, --purge, or --purgedryrun")

    if file_mode_selected:
        if not args.table:
            parser.error("-t/--table is required when using -v/--values")
        if not args.values:
            parser.error("-v/--values is required when using -t/--table")
        
    # Create instance of the database handler
    allsky_db = ALLSKYDB(args.debug)

    try:
        # Execute chosen operation
        if args.install:
            allsky_db.install()
            sys.exit(0)
            
        if args.run:
            allsky_db.run(args.run, args.format, args.columns, format_explicitly_set)
            sys.exit(0)
            
        if args.purge:
            shared.purge_database()
            sys.exit(0)
                    
        if args.purgedryrun:
            shared.purge_database(True)
            sys.exit(0)

        if args.table and args.values:
            allsky_db.save_from_definition(args.table, args.values, args.event)
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
