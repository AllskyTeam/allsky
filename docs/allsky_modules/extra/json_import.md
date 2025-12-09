This module reads JSON data from a URl and creates and extra data file containing variables that can be used in overlays.

As an example if an url returns the following data

```json
{
  "var1": "var1 value",
  "var2": "var2 value",
  "var3": {
    "var3_subvalue": "var3_subvalue"
  }
}
```

The following allsky variables will be created

AS_VAR1

AS_VAR2

var3 will be ignored as its an object which cannot be imported

### Settings 

| Setting | Description |
|--------|-------------|
| Read Every | How frequently to read data |
| URL | The url that returns the data, note this must be unprotected i.e no username or password required |
| Prefix | The prefix to add to variables when imported so for example var1 becomes AS_{PREFIX}VAR1 |
| Filename | The name of the xtra data file to update |