This file is for Allsky developers and describes the fields in an entry in the options.json file.
Most entries are settings but a few, e.g., "header" tell the WebUI how to display the page.

The options.json file tells the WebUI what settings the user can change and how to display them.  Many settings and/or their minimum, maximum, and default values are camera-dependent.  For example, only cameras with a cooler should display the "Cooling" setting for the user to change.

The options.json.repo file has ALL possible settings and is used to create the options.json file based on the camera's capabilities.  As described below, some values are placeholders and are replaced when the options file is created.

Each field in the options file is listed below as well as it's purpose, Type, Default, and Notes.
Unless otherwise specified, the Default value is what's used if the field isn't specified for a setting.
If a Note contains the phrases __If specified__ or __Optional__ it means the field doesn't need to be specified.
Other than the first few fields, fields can be in any order but are usually in the same order to make viewing the file easier.

* __name__
    * Name of the setting that appears in the settings file.
    * Type: string
    * Default: none - must be present
    * Notes: __Must be the 1st field__.  This is the json name and users generally won't see it.  Must be all lowercase and contain no spaces.  Names that start with "day" or "night" may have the same valid values (e.g., "daybin" and "nightbin") and the part of the name that comes after "day" or "night" e.g., "bin", may be used to lookup the common values.
* __display__
    * Determines whether or not the field is displayed in the WebUI. 
    * Type: boolean
    * Default: true
    * Notes: If specified, __must be the 2nd field__ (to keep the WebUI from parsing the rest of the setting if __false__).  Can be __true__, __false__, or __&lowbar;display__ which means the value depends on the camera and is determined when the options file is created.
* __settingsonly__
    * Determines if this setting ONLY appears in the settings file and not the WebUI.  Used for "internal" settings.
    * Type: boolean
    * Default: false
    * Notes: If specified, __must be 3rd field__.  Overrides "display : true".
* __minimum__
    * The setting's minimum value, if any.
    * Type: same as the setting's __type__.
    * Default: none
    * Notes: Optional.  Values that contain a "&lowbar;" e.g., "&lowbar;min" or "day&lowbar;min" are placeholders.
* __maximum__
    * The setting's maximum value, if any.
    * Type: same as the setting's __type__.
    * Default: none
    * Notes: Optional.  Values that contain a "&lowbar;" e.g., "&lowbar;min" or "night&lowbar;max" are placeholders.
* __default__
    * The setting's default value, if any.
    * Type: same as the setting's __type__.
    * Default: none
    * Notes: Optional.  Values that contain a "&lowbar;" e.g., "&lowbar;default" or "night&lowbar;default" are placeholders.
* __description__
    * A description of the settings.
    * Type: text
    * Default: none
    * Notes: Any setting that's displayed in the WebUI must have a description.  Can contain html since it's displayed in the WebUI.  The text displayed after html substitutions should be at most several lines so it doesn't take too much space in the WebUI.  If there's more to say, consider having a "click here for more info" link.
* __label__
    * The human-readable name of the setting displayed in the WebUI.
    * Type: text
    * Default: none
    * Notes: Any setting that's displayed in the WebUI must have a label.  Typically 1 - 3 words.
* __label_prefix__
    * A prefix for programs to prepend to the label.
    * Type: text
    * Default: none
    * Notes: Optional.  To improve readability, some labels are short, e.g., "Generate".  The prefix can be used by programs to clarify the label, e.g., "Timelapse Generate".  Typically 1 - 3 words.
* __type__
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
        * _select*_ - a drop-down selection.  Must have an __options__ field that defines the choices.  The actual type of the setting is what comes after the underscore, e.g., __select_integer__.
        * _text_ - a single, short line of text - usually a single word.
        * _widetext_ - a longer line of text.  Should fit in a single line in the WebUI to avoid having to scroll right and left.
* __usage__
    * Lists what this setting is used for.
    * Type: text
    * Default: none
    * Notes: Optional - the only current value is "capture" which means the setting is used by the capture programs.  If "capture" then the __action__ field MUST be present.
* __readonly__
    * A setting that's displayed in the WebUI but isn't editable.  Is displayed as "text".
    * Type: boolean
    * Default: false
    * Notes: Optional.  Not used often.
* __carryforward__
    * When a new camera is detected and there's a settings file for another camera, this field determine whether or not the setting's value in the other file should be used in the new settings file.  This minimizes the number of settings the user needs to change.
    * Type: boolean
    * Default: false
    * Notes: Optional.  Typically used for settings that aren't dependent on the camera type and model, e.g., latitude.  This is somewhat subjective.
* __options__
    * Sets the options for drop-down lists.
    * Type: json array
    * Default: none - required if setting __type__ is _select*_.
    * Notes: Settings that are camera-dependent like "bin" will usually have a single placeholder entry like __[ "bin_values" ]__.  Hard-coded options must have one or more elements, each with a field called __value__ its value as well as a field called __label__ and its value, e.g., __{"value" : 1, "label" : "module"}__.  The __value__ field's value is what's stored in the settings file. The type of the value stored in the settings file is either an integer/float or text depending on the value. The __label__ field's value is what's displayed in the drop-down as text.
* __checkchanges__
    * Should the setting's new value be verified after it's changed in the WebUI?
    * Type: boolean
    * Default: false
    * Notes: Optional.  The setting's new value is passed to the "makeChanges.sh" to validate it and/or perform "behind the scenes" actions like sending information to a remote Website.  This is why users should NEVER edit the settings file directly.
* __optional__
    * Is this setting optional, i.e., can it be left blank.
    * Type: boolean
    * Default: false
    * Notes: Optional.  Normally does not apply to boolean settings.
* __source__
    * What is the source of this setting, i.e., what .json file is it stored in?
    * Type: text
    * Default: none, which means settings.json
    * Notes: If specified, it's either a full pathname to the .json file or a variable that's replaced by the actual name of the file by the WebUI.  Currently the valid variables are __${HOME}__, __${ALLSKY_ENV}__, and __${ALLSKY_HOME}__ although only __${ALLSKY_ENV}__ is currently used.
* __action__
    * Determines what should happen after the setting is changed.
    * Type: text
    * Default: none
    * Notes: Optional.  Current choices determine what the capture program should do:
        * _reload_ - the program re-reads the file containing the command-line arguments (which is created partially using the settings file).
        * _restart_ - the program restarts - other than for camera changes, this isn't needed very often.
        * _stop_ - the program stops and requires the user to manually start it.  For example, when enabling dark frame capture, this allows the user to cover the lens then start Allsky.
* __noreset__
    * Determines if the field should be reset when clicking on the "Reset to default values" button in the WebUI.
    * Type: boolean
    * Default: false
    * Notes: Optional.  Some settings in the settings file are calculated hence have no default and should NOT be reset.  If the "overlay" fields are cleared the user will get errors about not finding an overlay file, so don't reset them.
* __booldependson__
    * Lists which boolean setting(s) that when "true" (a.k.a., "on") will cause this setting to be displayed.
    * Type: list of one or more setting __name__'s.
    * Default: none
    * Notes: __This field will be replaced when the "new WebUI" is available.__  It currently only exists to indicate which settings have a dependency and what those dependencies are.
* __booldependsoff__
    * Lists which boolean setting(s) that when "false" (a.k.a., "off") will cause this setting to be displayed.
    * Type: list of one or more setting __name__'s.
    * Default: none
    * Notes: __This field will be replaced when the "new WebUI" is available.__  It currently only exists to indicate which settings have a dependency and what those dependencies are.
* __popup-yesno__
    * Text to display in a popup when the setting's value changes to the value specified in __popup-yesno-value__.
    * Type: text
    * Default: none
    * Notes: __This field will be replaced when the "new WebUI" is available.__  It currently only exists to indicate which settings should have a popup.
* __popup-yesno-value__
    * A settings new value that causes a popup to be shown.
    * Type: number - 0 (false) or 1 (true)
    * Default: none
    * Notes: __This field will be replaced when the "new WebUI" is available.__  It currently only exists to indicate what value should produce a popup.
    * TODO: Need to specify the action to take based on the user's answer to the __popup-yesno__ text.
