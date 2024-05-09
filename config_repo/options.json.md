This file is for Allsky developers and describes the fields in an entry in the options.json file.
Most entries are settings but a few, e.g., "header" tell the WebUI how to display the page.

The options.json file tells the WebUI what settings the user can change and how to display them.  Many settings and/or their minimum, maximum, and default values are camera-dependent.  For example, only cameras with a cooler should display the "Cooling" setting for the user to change.

The options.json.repo file has ALL possible settings and is used to create the options.json file based on the camera's capabilities.  As described below, some values are placeholders and are replaced when the options file is created.

Each field in the options file is listed below as well as it's purpose, Type, Default, and Notes.
Unless otherwise specified, the Default value is what's used if the field isn't specified for a setting.
If a Note contains the phrases **If specified** or **Optional** it means the field doesn't need to be specified.
Other than the first few fields, fields can be in any order but are usually in the same order to make viewing the file easier.

* **name**
    * Name of the setting that appears in the settings file.
    * Type: string
    * Default: none - must be present
    * Notes: **Must be the 1st field**.  This is the json name and users generally won't see it.  Must be all lowercase and contain no spaces.  Names that start with "day" or "night" may have the same valid values (e.g., "daybin" and "nightbin") and the part of the name that comes after "day" or "night" e.g., "bin", may be used to lookup the common values.
* **display**
    * Determines whether or not the field is displayed in the WebUI. 
    * Type: boolean
    * Default: true
    * Notes: If specified, **must be the 2nd field** (to keep the WebUI from parsing the rest of the setting if **false**).  Can be **true**, **false**, or **&lowbar;display** which means the value depends on the camera and is determined when the options file is created.
* **settingsonly**
    * Determines if this setting ONLY appears in the settings file and not the WebUI.  Used for "internal" settings.
    * Type: boolean
    * Default: false
    * Notes: If specified, **must be 3rd field**.  Overrides "display : true".
* **minimum**
    * The setting's minimum value, if any.
    * Type: same as the setting's **type**.
    * Default: none
    * Notes: Optional.  Values that contain a "&lowbar;" e.g., "&lowbar;min" or "day&lowbar;min" are placeholders.
* **maximum**
    * The setting's maximum value, if any.
    * Type: same as the setting's **type**.
    * Default: none
    * Notes: Optional.  Values that contain a "&lowbar;" e.g., "&lowbar;min" or "night&lowbar;max" are placeholders.
* **default**
    * The setting's default value, if any.
    * Type: same as the setting's **type**.
    * Default: none
    * Notes: Optional.  Values that contain a "&lowbar;" e.g., "&lowbar;default" or "night&lowbar;default" are placeholders.
* **description**
    * A description of the settings.
    * Type: text
    * Default: none
    * Notes: Any setting that's displayed in the WebUI must have a description.  Can contain html since it's displayed in the WebUI.  The text displayed after html substitutions should be at most several lines so it doesn't take too much space in the WebUI.  If there's more to say, consider having a "click here for more info" link.
* **label**
    * The human-readable name of the setting displayed in the WebUI.
    * Type: text
    * Default: none
    * Notes: Any setting that's displayed in the WebUI must have a label.  Typically 1 - 3 words.
* **label_prefix**
    * A prefix for programs to prepend to the label.
    * Type: text
    * Default: none
    * Notes: Optional.  To improve readability, some labels are short, e.g., "Generate".  The prefix can be used by programs to clarify the label, e.g., "Timelapse Generate".  Typically 1 - 3 words.
* **type**
    * The setting's type.
    * Type: text
    * Default: none - MUST be specified.
    * Notes: Valid values:
        * _boolean_ - a setting whose value in the settings file is either "true" or "false".
        * _color_ - a text value representing a color, e.g., "#fff".  The WebUI should present a color wheel for the user to set the value so they don't see the actual value (which may not make sense to them).
        * _float_ - a number with a decimal point (period or comma, depending on locale)
        * _header_ - defines a section header in the WebUI which in turn contains one or (usually) more settings.
        * _header-column_ - defines the column names when multiple settings are displayed in the WebUI on one line.
        * _header-sub_ - a sub-header in the WebUI.  There can be 0 or more sub-headings under a header.
        * _header-tab_ - defines a new tab in the WebUI.
        * _integer_ - a number without a decimal point.
        * _password_ - same as "text" but displayed with "&ast;&ast;&ast;" in the WebUI.
        * _percent_ - a "float" that acts as a percent.  The WebUI should display "%" after the number but the number must be stored in the settings file without the "%".
        * _select_ - a drop-down selection.  Must have an **options** field that defines the choices.
        * _text_ - a single, short line of text - usually a single word.
        * _widetext_ - a longer line of text.  Should fit in a single line in the WebUI to avoid having to scroll right and left.
* **usage**
    * Lists what this setting is used for.
    * Type: text
    * Default: none
    * Notes: Optional - the only current value is "capture" which means the setting is used by the capture programs.  If "capture" then the **action** field MUST be present.
* **readonly**
    * A setting that's displayed in the WebUI but isn't editable.  Is displayed as "text".
    * Type: boolean
    * Default: false
    * Notes: Optional.  Not used often.
* **carryforward**
    * When a new camera is detected and there's a settings file for another camera, this field determine whether or not the setting's value in the other file should be used in the new settings file.  This minimizes the number of settings the user needs to change.
    * Type: boolean
    * Default: false
    * Notes: Optional.  Typically used for settings that aren't dependent on the camera type and model, e.g., latitude.  This is somewhat subjective.
* **options**
    * Sets the options for drop-down lists.
    * Type: json array
    * Default: none - required if setting **type** is _select_.
    * Notes: Settings that are camera-dependent like "bin" will usually have a single placeholder entry like **[ "bin_values" ]**.  Hard-coded options must have one or more elements, each with a field called **value** its value as well as a field called **label** and its value, e.g., **{"value" : 1, "label" : "module"}**.  The **value** field's value is what's stored in the settings file. The type of the value stored in the settings file is either an integer/float or text depending on the value. The **label** field's value is what's displayed in the drop-down as text.
* **checkchanges**
    * Should the setting's new value be verified after it's changed in the WebUI?
    * Type: boolean
    * Default: false
    * Notes: Optional.  The setting's new value is passed to the "makeChanges.sh" to validate it and/or perform "behind the scenes" actions like sending information to a remote Website.  This is why users should NEVER edit the settings file directly.
* **optional**
    * Is this setting optional, i.e., can it be left blank.
    * Type: boolean
    * Default: false
    * Notes: Optional.  Normally does not apply to boolean settings.
* **source**
    * What is the source of this setting, i.e., what .json file is it stored in?
    * Type: text
    * Default: none, which means settings.json
    * Notes: If specified, it's either a full pathname to the .json file or a variable that's replaced by the actual name of the file by the WebUI.  Currently the valid variables are **${HOME}**, **${ALLSKY_ENV}**, and **${ALLSKY_HOME}** although only **${ALLSKY_ENV}** is currently used.
* **action**
    * Determines what should happen after the setting is changed.
    * Type: text
    * Default: none
    * Notes: Optional.  Current choices determine what the capture program should do:
        * _reload_ - the program re-reads the file containing the command-line arguments (which is created partially using the settings file).
        * _restart_ - the program restarts - other than for camera changes, this isn't needed very often.
        * _stop_ - the program stops and requires the user to manually start it.  For example, when enabling dark frame capture, this allows the user to cover the lens then start Allsky.
* **booldependson**
    * Lists which boolean setting(s) that when "true" (a.k.a., "on") will cause this setting to be displayed.
    * Type: list of one or more setting **name**s.
    * Default: none
    * Notes: **This field will be replaced when the "new WebUI" is available.**  It currently only exists to indicate which settings have a dependency and what those dependencies are.
* **booldependsoff**
    * Lists which boolean setting(s) that when "false" (a.k.a., "off") will cause this setting to be displayed.
    * Type: list of one or more setting **name**s.
    * Default: none
    * Notes: **This field will be replaced when the "new WebUI" is available.**  It currently only exists to indicate which settings have a dependency and what those dependencies are.
* **popup-yesno**
    * Text to display in a popup when the setting's value changes to the value specified in **popup-yesno-value**.
    * Type: text
    * Default: none
    * Notes: **This field will be replaced when the "new WebUI" is available.**  It currently only exists to indicate which settings should have a popup.
* **popup-yesno-value**
    * A settings new value that causes a popup to be shown.
    * Type: number - 0 (false) or 1 (true)
    * Default: none
    * Notes: **This field will be replaced when the "new WebUI" is available.**  It currently only exists to indicate what value should produce a popup.
    * TODO: Need to specify the action to take based on the user's answer to the **popup-yesno** text.
