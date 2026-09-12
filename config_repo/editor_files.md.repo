# WebUI Editor File Registry

`editor_files.json` controls which files appear in the WebUI file editor.
Each top-level key is the stable file key used by the browser and server.
Each value describes one editable file.

The editor only exposes files listed here. A file must resolve to an absolute
path inside `ALLSKY_HOME`, must be readable, and must not be a symlink or inside
a symlinked directory.

## Basic Structure

```json
{
  "local": {
    "order": 10,
    "label": "${ALLSKY_WEBSITE_CONFIGURATION_NAME} (local Allsky Website)",
    "path": "${ALLSKY_WEBSITE_CONFIGURATION_FILE}",
    "includeWhen": {
      "global": "hasLocalWebsite",
      "equals": true
    },
    "validateJson": true,
    "remote": false
  }
}
```

## File Key

The top-level key, for example `local`, is the value the editor sends back to
the server when reading or saving a file.

Keys may only contain letters, numbers, `_`, and `-`.

## File Options

| Option | Required | Description |
| --- | --- | --- |
| `order` | No | Sort order in the file selector. Defaults to `1000`. |
| `label` | No | Text shown in the file selector. If omitted, the file name is used. |
| `path` | Yes | Absolute path to the file. Constants can be used with `${CONSTANT_NAME}`. |
| `filename` | No | Older name for `path`. Use `path` for new entries. |
| `includeWhen` | No | Condition that decides whether the file is shown. |
| `validateJson` | No | When true, saves are rejected if the content is not valid JSON. Defaults to true. |
| `remote` | No | When true, the file is uploaded to the remote Website after a successful local save. Defaults to false. |
| `messages` | No | Status messages to show when the file is available, unavailable, or excluded. |
| `schemaToUse` | No | Schema name or schema index key to use for the Simple editor. |
| `schematouse` | No | Alternative spelling of `schemaToUse`, supported for compatibility. |
| `schema_to_use` | No | Alternative spelling of `schemaToUse`, supported for compatibility. |

## Constants In Strings

The registry can use Allsky constants in string values:

```json
"path": "${ALLSKY_MYFILES_DIR}/monitorable_logs.json"
```

Unknown constants are left unchanged, which makes configuration mistakes easier
to spot.

## Conditions

`includeWhen` and message-level `when` blocks use the same condition syntax.

Simple condition:

```json
{
  "global": "hasLocalWebsite",
  "equals": true
}
```

Grouped condition:

```json
{
  "all": [
    {
      "global": "hasLocalWebsite",
      "equals": true
    },
    {
      "setting": "uselocalwebsite",
      "truthy": true
    }
  ]
}
```

Supported condition groups:

| Group | Description |
| --- | --- |
| `all` | Every child condition must match. |
| `any` | At least one child condition must match. |
| `not` | The child condition must not match. |

Supported condition sources:

| Source | Description |
| --- | --- |
| `global` | Approved WebUI state globals such as `hasLocalWebsite`, `hasRemoteWebsite`, `useLocalWebsite`, and `useRemoteWebsite`. |
| `setting` | Value from the Allsky settings array. |
| `file` | Value from the normalised editor file entry. |
| `constant` | Value from a PHP constant. |

Supported comparisons:

| Comparison | Description |
| --- | --- |
| `equals` | Value must match. |
| `notEquals` | Value must not match. |
| `in` | Value must match one item in the array. |
| `truthy` | Value is compared as a boolean. |

If no comparison is supplied, the source value is checked for truthiness.

## Messages

Messages are grouped by context. The current contexts are:

| Context | When it is used |
| --- | --- |
| `available` | The file is valid and shown in the selector. |
| `unavailable` | The file is configured but cannot be used. |
| `excluded` | The file is valid but hidden by `includeWhen`. |

Example:

```json
"messages": {
  "available": [
    {
      "when": {
        "global": "useLocalWebsite",
        "equals": false
      },
      "severity": "warning",
      "message": "The <span class='WebUISetting'>Use Local Website</span> setting is not enabled."
    }
  ],
  "unavailable": [
    {
      "severity": "warning",
      "message": "${error}"
    }
  ]
}
```

Supported severities are `success`, `info`, `warning`, `danger`, `message`, and
`error`. Unknown severities are treated as `info`.

Messages can use these placeholders:

| Placeholder | Description |
| --- | --- |
| `${key}` | Editor file key. |
| `${label}` | File label. |
| `${fileName}` | Base file name. |
| `${path}` | Resolved file path. |
| `${error}` | Error text for unavailable files. |

Placeholders are escaped before they are displayed.

## Adding A New Editor File

1. Choose a unique key using only letters, numbers, `_`, and `-`.
2. Add a new top-level entry to `config/editor_files.json`.
3. Set `path` to an absolute path, or use an Allsky constant that resolves to an absolute path.
4. Set `label` and `order` so the file appears clearly in the selector.
5. Leave `validateJson` as true for JSON files.
6. Add `includeWhen` only if the file should appear conditionally.
7. Add messages only when the user needs extra context.
8. Add a schema mapping in `config/schema/index.json` if the file should use the Simple editor.

Example:

```json
"monitorable_logs": {
  "order": 30,
  "label": "monitorable_logs.json",
  "path": "${ALLSKY_MYFILES_DIR}/monitorable_logs.json",
  "validateJson": true,
  "remote": false
}
```

If no schema is found for the file, the editor still works but uses the raw JSON
editor only.

# Schema Index

Schemas for the Simple editor live in:

```text
config/schema
```

The schema index file is:

```text
config/schema/index.json
```

It maps the file being edited, or a schema selector, to the schema file that
should be used to build the Simple editor form.

Example:

```json
{
  "configuration.json": "configuration-schema.json",
  "remote_configuration.json": "configuration-schema.json",
  "monitorable_logs.json": "monitorable_logs-schema.json"
}
```

The value must be a schema file inside `config/schema`. Schema paths are checked
so they cannot point outside that directory.

## How The Schema Is Chosen

When a file is loaded, the editor checks for a schema in this order:

1. A schema selector inside the file being edited.
2. A schema selector in the file's `editor_files.json` entry.
3. A mapping in `config/schema/index.json` for the file name.
4. No schema. The editor uses the raw JSON editor.

The edited file can request a schema using any of these keys:

```json
{
  "schemaToUse": "configuration"
}
```

Also supported:

```json
{
  "schematouse": "configuration",
  "schema_to_use": "configuration",
  "schema": "configuration"
}
```

`editor_files.json` entries can use:

```json
"schemaToUse": "configuration"
```

Also supported there:

```json
"schematouse": "configuration"
```

```json
"schema_to_use": "configuration"
```

If the selector has no extension, `.json` is also tried. For example,
`"configuration-schema"` can resolve to `configuration-schema.json`.

## Adding A Schema Mapping

1. Add the schema file to `config/schema`.
2. Add an entry to `config/schema/index.json`.
3. Use the edited file name as the key when the mapping is file-specific.
4. Use a schema selector name as the key when several files should opt into the same schema.

File-specific mapping:

```json
{
  "my_file.json": "my_file-schema.json"
}
```

Selector mapping:

```json
{
  "website-config": "configuration-schema.json"
}
```

Then the edited file can opt in with:

```json
{
  "schemaToUse": "website-config"
}
```

## Schema Notes

The schema controls the Simple editor form. It is not used as the final rule for
whether a JSON file may be saved. The save endpoint only checks that JSON is
syntactically valid when `validateJson` is true.

The editor currently recognises custom schema fields such as:

| Field | Description |
| --- | --- |
| `x-change` | Marks fields that should appear in the required-fields view. |
| `x-hidden` | Hides a field from the form. |
| `x-notvalue` | Rejects a specific value in the Simple editor. |

