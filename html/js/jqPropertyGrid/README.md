# jqPropertyGrid
A small and simple property grid in JS to view/edit POJOs, excellent if you have a "settings" object you want to give the user to edit (that's why I have created it).

### Dependencies
* jQuery - This is mandatory
* jQueryUI - If jQueryUI is loaded so properties that are defined as `number` would be displayed using the jQueryUI spinner widget
* spectrum - A very cool Color Picker that will be used (if loaded) on properties that are defined as `color` [see spectrum on GitHub](https://github.com/bgrins/spectrum)

### Usage
The property grid needs a `div` to live in, then just initialize it by calling to the `jqPropertyGrid` method on it:

The html part:
```html
<script src='jqPropertyGrid.js'></script>
<link rel='stylesheet' href='jqPropertyGrid.css' />

<div id='propGrid'></div>
```

The Javascript part:
``` javascript
// This is our target object
var theObj = {
  font: 'Consolas',
  fontSize: 14,
  fontColor: '#a3ac03',
  jQuery: true,
  modernizr: false,
  framework: 'angular',
  iHaveNoMeta: 'Never mind...',
  iAmReadOnly: 'I am a label which is not editable'
};

// This is the metadata object that describes the target object properties (optional)
var theMeta = {
    // Since string is the default no nees to specify type
    font: { group: 'Editor', name: 'Font', description: 'The font editor to use'},
    // The "options" would be passed to jQueryUI as its options
    fontSize: { group: 'Editor', name: 'Font size', type: 'number', options: { min: 0, max: 20, step: 2 }},
    // The "options" would be passed to Spectrum as its options
    fontColor: { group: 'Editor', name: 'Font color', type: 'color', options: { preferredFormat: 'hex' }},
    // since typeof jQuery is boolean no need to specify type, also since "jQuery" is also the display text no need to specify name
    jQuery: { group: 'Plugins', description: 'Whether or not to include jQuery on the page' },
    // We can specify type boolean if we want...
    modernizr: {group: 'Plugins', type: 'boolean', description: 'Whether or not to include modernizr on the page'},
    framework: {name: 'Framework', group: 'Plugins', type: 'options', options: ['None', {text:'AngularJS', value: 'angular'}, {text:'Backbone.js', value: 'backbone'}], description: 'Whether to include any additional framework'},
    iAmReadOnly: { name: 'I am read only', type: 'label', description: 'Label types use a label tag for read-only properties', showHelp: false }

};

// Callback function. Called when any entry in the grid is changedCallback
function propertyChangedCallback(grid, name, value) {
    // handle callback
    console.log(name + ' ' + value);
}
// This is the customTypes object that describes additionnal types, and their renderers (optional)
var theCustomTypes = {
    ref: { // name of custom type
        html: function(elemId, name, value, meta) { // custom renderer for type (required)
            var onclick = '';
            valueHTML = value + ' <i class="fa fa-external-link" onclick="selectRef(\'' + value + '\')"></i>';
            return valueHTML;
        },
        valueFn: false // value-return function (optional). If unset, default will be "function() { return $('#' + elemId).val(); }", set to false to disable it
        // You can also put a makeValueFn function (taking elemId, name, value, meta parameters) to create value-return function on the fly (it will override valuefn setting), returning non-function will disable getting value for this property
    }
};

// Options object
var options = {
    meta: theMeta,
    customTypes: theCustomTypes,
    // default help "icon" is text in brackets, can also provide FontAwesome HTML for an icon (see examples)
    helpHtml: '[?]', 
    callback: propertyChangedCallback,
    // Allow collapsing property group. default to false.
    isCollapsible: true,
    // Sort properties, accept boolean or a sort function. default to false.
    sort: true,
};

// Create the grid
$('#propGrid').jqPropertyGrid(theObj, options);

// In order to get back the modified values:
var theNewObj = $('#propGrid').jqPropertyGrid('get');
```
The result would be:

![jqPropertyGrid](https://github.com/ValYouW/jqPropertyGrid/raw/master/example/example.png)

### The metadata object
As seen from the example above the metadata object **can** be used (it's optional) in order to describe the object properties.

Each property in the metadata object could have the following:
* browsable - Whether this property should be included in the grid, default is true (can be omitted).
* group - The group this property belongs to
* name - The display name of the property in the grid
* type - The type of the property, supported are:
    * boolean - A checkbox would be used
    * number - If the jQueryUI Spinner is loaded then it would be used, otherwise textbox
    * color - If the Spectrum Color Picker is loaded then it would be used, otherwise textbox
    * options - A dropdown list would be used in case the metadata contains the `options` array property
    * label - A label will be used, useful for uneditable / read-only properties
* options - An extra options object per type:
    * If the type is `number` then the options would be passed as the jQueryUI Spinner options
    * If the type is `color` then the options would be passed as the Spectrum options
    * If the type is `options` then options should be an array with the drop-down values, if an element in the array is  `string` it will be used both as the value and text of the `option` element. If an element in the array is `object` then it should contains a `text` and `value` properties which would be used on the `option` element
* description - A description of the property, will be used as tooltip on an hint element (a span with text "[?]")
* showHelp - If set to false, will disable showing description's span with text "[?]" on property name. Will instead show tooltip on hover of property value (adds title attribute to property value). Can be omitted if default description effect is desired
* colspan2 - true/false. If true then property input will span both columns and will have no name/label (useful for textarea custom type, see example/index.html)

### Live example
See this CodePen page: http://codepen.io/ValYouW/pen/zInBg

## Contributing
You are welcome to send pull requests that will make this module better. Before you send your PR please make sure that:

1. There are no `jshint` nor `jscs` errors (you can use the `grunt jshint` and `grunt jscs` for that)
2. If you are adding a new feature make sure to update the `README` accordingly
3. Thx !
