"""Read the supported line formats in overlay extra .txt files."""

import json


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
