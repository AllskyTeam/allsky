/**
 * jqPropertyGrid
 * https://github.com/ValYouW/jqPropertyGrid
 * Author: YuvalW (ValYouW)
 * License: MIT
 */

/**
 * @typedef {object} JQPropertyGridOptions
 * @property {object} meta - A metadata object describing the obj properties
 */

/* jshint -W089 */
(function($) {// jscs:ignore requireNamedUnassignedFunctions
	var OTHER_GROUP_NAME = 'Other';
	var GET_VALS_FUNC_KEY = 'pg.getValues';
	var SET_VALS_FUNC_KEY = 'pg.setValues';	
	var pgIdSequence = 0;

	/**
	 * Generates the property grid
	 * @param {object} obj - The object whose properties we want to display
	 * @param {JQPropertyGridOptions} options - Options object for the component
	 */
	$.fn.jqPropertyGrid = function(obj, options) {
		// Check if the user called the 'get' function (to get the values back from the grid).
		if (typeof obj === 'string' && obj === 'get') {
			if (typeof this.data(GET_VALS_FUNC_KEY) === 'function') {
				return this.data(GET_VALS_FUNC_KEY)();
			}
			return null;
		}
		// Check if user called the 'set' method. The param meta should be an object with 
        // property keys and values
		else if (typeof obj === 'string' && obj === 'set' && options !== undefined) {
		    if (typeof this.data(SET_VALS_FUNC_KEY) === 'function') {
		        this.data(SET_VALS_FUNC_KEY)(options);
		        return;
		    }
		    return;
		} else if (typeof obj === 'string' && obj === 'Destroy') {
			$(this).children('table').first().remove();
		}
		else if (typeof obj === 'string') {
			console.error('jqPropertyGrid got invalid option:', obj);
			return;
		}
		else if (typeof obj !== 'object' || obj === null) {
			console.error('jqPropertyGrid must get an object in order to initialize the grid.');
			return;
		}

		// Normalize options
		options = options && typeof options === 'object' ? options : {};
		options.meta = options.meta && typeof options.meta === 'object' ? options.meta : {};
		options.customTypes = options.customTypes || {};
		options.helpHtml = options.helpHtml || '[?]';
		options.sort = (typeof options.sort === 'undefined') ? false : options.sort;
		options.isCollapsible = (typeof options.isCollapsible === 'undefined') ? false : !!(options.isCollapsible);
		options.callback = (typeof options.callback === 'function') ? options.callback : null;
		options.prefix = options.prefix || null;

		// Seems like we are ok to create the grid
		var meta = options.meta;
		var propertyRowsHTML = {OTHER_GROUP_NAME: ''};
		var groupsHeaderRowHTML = {};
		var postCreateInitFuncs = [];
		var getValueFuncs = {};
		var setValueFuncs = {};
		var pgId;
		var el = this;

		var currGroup;
		var properties = Object.keys(obj);

		if (options.prefix !== null) {
			pgId = 'pg' + options.prefix;
		} else {
			pgId = 'pg' + (pgIdSequence++);
		}

		if (options.sort) {
			if (typeof options.sort === 'boolean') {
				properties = properties.sort();
			} else if (typeof options.sort === 'function') {
				properties = properties.sort(options.sort);
			}
		}

		properties.forEach(function handleProperty(prop) {
			// Skip if this is a function, or its meta says it's non browsable
			if (typeof obj[prop] === 'function' || (meta[prop] && meta[prop].browsable === false)) {
				return;
			}

			// Check what is the group of the current property or use the default 'Other' group
			currGroup = (meta[prop] && meta[prop].group) || OTHER_GROUP_NAME;

			// If this is the first time we run into this group create the group row
			if (currGroup !== OTHER_GROUP_NAME && !groupsHeaderRowHTML[currGroup]) {
				groupsHeaderRowHTML[currGroup] = getGroupHeaderRowHtml(currGroup, options.isCollapsible);
			}

			// Initialize the group cells html
			propertyRowsHTML[currGroup] = propertyRowsHTML[currGroup] || '';

			// Append the current cell html into the group html
			propertyRowsHTML[currGroup] += getPropertyRowHtml(pgId, prop, obj[prop], meta[prop], postCreateInitFuncs, getValueFuncs, setValueFuncs, options, el);
		});

		// Now we have all the html we need, just assemble it
		var innerHTML = '<table class="pgTable">';
		for (var group in groupsHeaderRowHTML) {
			// Add the group row
			innerHTML += groupsHeaderRowHTML[group];
			// Add the group cells
			innerHTML += propertyRowsHTML[group];
		}

		// Finally we add the 'Other' group (if we have something there)
		if (propertyRowsHTML[OTHER_GROUP_NAME]) {
			innerHTML += getGroupHeaderRowHtml(OTHER_GROUP_NAME, options.isCollapsible);
			innerHTML += propertyRowsHTML[OTHER_GROUP_NAME];
		}

		// Close the table and apply it to the div
		innerHTML += '</table>';
		this.html(innerHTML);

		// Call the post init functions
		for (var i = 0; i < postCreateInitFuncs.length; ++i) {
			if (typeof postCreateInitFuncs[i] === 'function') {
				postCreateInitFuncs[i]();
				// just in case make sure we are not holding any reference to the functions
				postCreateInitFuncs[i] = null;
			}
		}

		// Create a function that will return tha values back from the property grid
		var getValues = function() {
			var result = {};
			for (var prop in getValueFuncs) {
				if (typeof getValueFuncs[prop] !== 'function') {
					continue;
				}

				result[prop] = getValueFuncs[prop]();
			}

			return result;
		};

		this.data(GET_VALS_FUNC_KEY, getValues);

		var setValues = function (values) {
		    for (var prop in setValueFuncs) {
		        if (typeof setValueFuncs[prop] !== 'function' || values[prop] === undefined) { continue; }
		        setValueFuncs[prop](values[prop]);
		    }
		};
		this.data(SET_VALS_FUNC_KEY, setValues);

		if (options.isCollapsible) {
			// Support Collapse Mode <START>
			$(el).find('.pgGroupRow').click(function onGroupRowClick() {
				var insideHtml = $(this).html();
				var insideText = $(insideHtml).text();
				var isPlus = insideText[0] === '+';
				var subText = insideText.substring(1);
				var currentText = isPlus ? '-' + subText : '+' + subText;
				var currentHtml = insideHtml.replace(insideText, currentText);
				$(this).html(currentHtml);
				$(this).nextUntil('tr.pgGroupRow').slideToggle(1);
			});
		} else {
			$('tr.pgGroupRow').each(function handleGroupRow(index) {

				var insideHtml = $(this).html();
				var insideText = $(insideHtml).text();

				$(this).css('cursor', 'default');

				var first = insideText[0] === '-';
				var second = insideText[1] === ' ';
				if (first && second) {
					var subText = insideText.substring(2);
					var currentHtml = insideHtml.replace(insideText, subText);
					$(this).html(currentHtml);
				}
			});
		}

		// Support Collapse Mode <END>
	};

	/**
	 * Gets the html of a group header row
	 * @param {string} displayName - The group display name
	 * @param {boolean} isCollapsible - Whether the group should support expand/collapse
	 */
	function getGroupHeaderRowHtml(displayName, isCollapsible) {
		return '<tr class="pgGroupRow ' + (isCollapsible ? 'pgCollapsible' : '') + '"><td colspan="2" class="pgGroupCell">' + (isCollapsible ? '- ' : '') + displayName + '</td></tr>';
	}

	/**
	 * Gets the html of a specific property row
	 * @param {string} pgId - The property-grid id being rendered
	 * @param {string} name - The property name
	 * @param {*} value - The current property value
	 * @param {object} meta - A metadata object describing this property
	 * @param {function[]} [postCreateInitFuncs] - An array to fill with functions to run after the grid was created
	 * @param {object.<string, function>} [getValueFuncs] - A dictionary where the key is the property name and the value is a function to retrieve the property selected value
	 * @param {object} options - top level options object for propertyGrid containing all options
     * @param {object} el - the container for the property grid
	 */
	function getPropertyRowHtml(pgId, name, value, meta, postCreateInitFuncs, getValueFuncs, setValueFuncs, options, el) {
		if (!name) {
			return '';
		}

		var changedCallback = options.callback;
		meta = meta || {};
		// We use the name in the meta if available
		var displayName = meta.name || name;
		var type = meta.type || '';
		var elemId = pgId + name;

		var valueHTML;

		// check if type is registered in customTypes
		var customTypes = options.customTypes;
		var customType;
		for (var ct in customTypes) {
			if (type === ct) {
				customType = customTypes[ct];
				break;
			}
		}

		// If custom type found use it
		if (customType) {
			valueHTML = customType.html(elemId, name, value, meta);
			if (getValueFuncs) {
				if (customType.hasOwnProperty('makeValueFn')) {
					getValueFuncs[name] = customType.makeValueFn(elemId, name, value, meta);
				} else if (customType.hasOwnProperty('valueFn')) {
					getValueFuncs[name] = customType.valueFn;
				} else {
					getValueFuncs[name] = function() {
						return $('#' + elemId).val();
					};
				}
			}
		}

		// If boolean create checkbox
		else if (type === 'boolean' || (type === '' && typeof value === 'boolean')) {
			valueHTML = '<input type="checkbox" id="' + elemId + '" value="' + name + '"' + (value ? ' checked' : '') + ' />';
			if (getValueFuncs) {
			    getValueFuncs[name] = function () { return $('#' + elemId).prop('checked'); };
			}
			if (setValueFuncs) {
			    setValueFuncs[name] = function (value) { $('#' + elemId).prop('checked', value); };
			}

			if (changedCallback) {
				$(el).on('change', '#' + elemId, function changed() {
					changedCallback(this, name, $('#' + elemId).is(':checked'));
				});
			}

			// If options create drop-down list
		} else if (type === 'options' && Array.isArray(meta.options)) {
			valueHTML = getSelectOptionHtml(elemId, value, meta.options);
			if (getValueFuncs) {
			    getValueFuncs[name] = function () { return $('#' + elemId).val(); };
			}
			if (setValueFuncs) {
			    setValueFuncs[name] = function (value) { $('#' + elemId).val(value); };
			}

			if (changedCallback) {
				$(el).on('change', '#' + elemId, function changed() {
					changedCallback(this, name, $('#' + elemId).val());
				});
			}

			// If number and a jqueryUI spinner is loaded use it
		} else if (typeof $.fn.spinner === 'function' && (type === 'number' || (type === '' && typeof value === 'number'))) {
			valueHTML = '<input type="text" id="' + elemId + '" value="' + value + '" style="width:50px" />';
			if (postCreateInitFuncs) {
				postCreateInitFuncs.push(initSpinner(elemId, meta.options, name, changedCallback, el));
			}

			if (getValueFuncs) {
			    getValueFuncs[name] = function () { return $('#' + elemId).spinner('value'); };
			}
			if (setValueFuncs) {
			    setValueFuncs[name] = function (value) { $('#' + elemId).spinner('value', value); };
			}

			// If color and we have the spectrum color picker use it
		} else if (type === 'color' && typeof $.fn.spectrum === 'function') {
			valueHTML = '<input type="text" id="' + elemId + '" />';
			if (postCreateInitFuncs) {
				postCreateInitFuncs.push(initColorPicker(elemId, value, meta.options, name, changedCallback, el));
			}

			if (getValueFuncs) {
			    getValueFuncs[name] = function () { return $('#' + elemId).spectrum('get').toHexString(); };
			}
			if (setValueFuncs) {
			    setValueFuncs[name] = function (value) { $('#' + elemId).spectrum('set', value); };
			}

			// If label (for read-only)
		} else if (type === 'label') {
			if (typeof meta.description === 'string' && meta.description) {
				valueHTML = '<label for="' + elemId + '" title="' + meta.description + '">' + value + '</label>';
			} else {
				valueHTML = '<label for="' + elemId + '">' + value + '</label>';
			}

			// Default is textbox
		} else {
			valueHTML = '<input type="text" id="' + elemId + '" value="' + value + '" autocomplete="off"</input>';
			if (getValueFuncs) {
			    getValueFuncs[name] = function () { return $('#' + elemId).val(); };
			}
			if (setValueFuncs) {
			    setValueFuncs[name] = function (value) { $('#' + elemId).val(value); };
			}

			if (changedCallback) {
				$(el).on('change', '#' + elemId, function changed(e) {
					changedCallback(this, name, $('#' + elemId).val());
					e.preventDefault();
					e.stopPropagation();
				});
			}
		}

		if (typeof meta.description === 'string' && meta.description &&
			(typeof meta.showHelp === 'undefined' || meta.showHelp)) {
			displayName += '<span class="pgTooltip" title="' + meta.description + '">' + options.helpHtml + '</span>';
		}

		if (typeof meta.helpcallback === 'function') {
			let helpId = elemId + 'help';
			valueHTML += ' <span class="pgHelp" id="' + helpId + '">[?]</span>';
			$(document).on('click', '#' + helpId, { fieldName: meta.name, cb: meta.helpcallback }, function (event) {
				fieldName = event.data.fieldName;
				cb = event.data.cb;

				cb(fieldName);
			});
		}

		if (meta.colspan2) {
			return '<tr class="pgRow"><td colspan="2" class="pgCell">' + valueHTML + '</td></tr>';
		} else {
			return '<tr class="pgRow"><td class="pgCell">' + displayName + '</td><td class="pgCell">' + valueHTML + '</td></tr>';
		}
	}

	/**
	 * Gets a select-option (dropdown) html
	 * @param {string} id - The select element id
	 * @param {string} [selectedValue] - The current selected value
	 * @param {*[]} options - An array of option. An element can be an object with value/text pairs, or just a string which is both the value and text
	 * @returns {string} The select element html
	 */
	function getSelectOptionHtml(id, selectedValue, options) {
		id = id || '';
		selectedValue = selectedValue || '';
		options = options || [];

		var html = '<select';
		if (id) {
			html += ' id="' + id + '"';
		}

		html += '>';

		var text;
		var value;
		for (var i = 0; i < options.length; i++) {
			value = typeof options[i] === 'object' ? options[i].value : options[i];
			text = typeof options[i] === 'object' ? options[i].text : options[i];
			html += '<option value="' + value + '"' + (selectedValue === value ? ' selected>' : '>');
			html += text + '</option>';
		}

		html += '</select>';
		return html;
	}

	/**
	 * Gets an init function to a number textbox
	 * @param {string} id - The number textbox id
	 * @param {object} [options] - The spinner options
     * @param {string} name - The name
     * @param {function} changedCallback - Callback for when he value changes
     * @param {object} el - the container for the property grid
	 * @returns {function}
	 */
	function initSpinner(id, options, name, changedCallback, el) {
		if (!id) {
			return null;
		}
		// Copy the options so we won't change the user "copy"
		var opts = {};
		$.extend(opts, options);

		// Add a handler to the change event to verify the min/max (only if not provided by the user)
		opts.change = typeof opts.change === 'undefined' ? onSpinnerChange : opts.change;

		return function onSpinnerInit() {
			var $elem = $('#' + id);
			$elem.spinner(opts);
			if (changedCallback) {
				$elem.on('spin change keyup paste input', function changed(e, ui) {
					changedCallback(el, name, ui ? ui.value : $(e.target).val());
				});
			}
		};
	}

	/**
	 * Gets an init function to a color textbox
	 * @param {string} id - The color textbox id
	 * @param {string} [color] - The current color (e.g #000000)
	 * @param {object} [options] - The color picker options
     * @param {string} name - The name
     * @param {function} changedCallback - Callback for when he value changes
     * @param {object} el - the container for the property grid
	 * @returns {function}
	 */
	function initColorPicker(id, color, options, name, changedCallback, el) {
		if (!id) {
			return null;
		}

		var opts = {};
		$.extend(opts, options);
		if (typeof color === 'string') {
			opts.color = color;
		}

		return function onColorPickerInit() {
			var $elem = $('#' + id);
			$elem.spectrum(opts);
			if (changedCallback !== undefined) {
				$elem.on('change', function changed(e, color) {
					changedCallback(el, name, color.toHexString());
				});
			}
		};
	}

	/**
	 * Handler for the spinner change event
	 */
	function onSpinnerChange() {
		var $spinner = $(this);
		var value = $spinner.spinner('value');

		// If the value is null and the real value in the textbox is string we empty the textbox
		if (value === null && typeof $spinner.val() === 'string') {
			$spinner.val('');
			return;
		}

		// Now check that the number is in the min/max range.
		var min = $spinner.spinner('option', 'min');
		var max = $spinner.spinner('option', 'max');
		if (typeof min === 'number' && this.value < min) {
			this.value = min;
			return;
		}

		if (typeof max === 'number' && this.value > max) {
			this.value = max;
		}
	}
})(window.$);
