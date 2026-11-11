"""Load variable data from the extra JSON and text files."""

import json
import re
from pathlib import Path


def parse_extra_text_file(file_name):
    """Return variable names and values from name=value or name:value lines.

    JSON-style lines may be a fragment (without an opening brace), and may be
    mixed with unquoted lines. A closing brace and trailing commas are optional.
    """
    result = {}
    decoder = json.JSONDecoder()

    with open(file_name, encoding='utf-8') as file:
        lines = file.readlines()

    json_style = any(line.lstrip().startswith('"') for line in lines)
    for line in lines:
        line = line.strip()
        if not line or line in ('{', '}'):
            continue

        if line.startswith('"'):
            try:
                key, end = decoder.raw_decode(line)
                rest = line[end:].lstrip()
                if not isinstance(key, str) or not rest.startswith((':', '=')):
                    continue
                value, end = decoder.raw_decode(rest[1:].lstrip())
                if rest[1:].lstrip()[end:].strip() not in ('', ',', '}', ',}'):
                    continue
            except json.JSONDecodeError:
                continue
        elif '=' in line or ':' in line:
            separator = '=' if '=' in line.split(':', 1)[0] else ':'
            key, value = line.split(separator, 1)
            key = key.strip()
            if not re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]*', key):
                continue
            value = value.strip()
            if json_style or separator == ':':
                value = value.removesuffix(',').strip()
        else:
            continue

        if not key:
            continue
        if isinstance(value, str):
            try:
                value = int(value)
            except ValueError:
                try:
                    value = float(value)
                except ValueError:
                    pass
        result[key] = value

    return result


def read_extra_data_file(file_name):
    """Return (format, variables), trying JSON before the supported text syntax.

    File and format errors are raised for the caller to log.
    """
    path = Path(file_name)
    with path.open(encoding='utf-8') as file:
        contents = file.read()

    try:
        data = json.loads(contents)
    except json.JSONDecodeError:
        pass
    else:
        if isinstance(data, dict) and data:
            return 'json', data

    variables = {}
    for key, value in parse_extra_text_file(path).items():
        name = key.upper()
        variables[name] = {
            'name': '${' + name + '}',
            'format': '',
            'sample': '',
            'group': 'User',
            'description': 'Allsky variable ' + key,
            'type': 'number' if isinstance(value, (int, float)) else 'string',
            'source': path.stem,
            'value': value,
        }
    if variables:
        return 'text', variables
    raise ValueError('File contains no valid JSON object or supported text variables')
