"use strict";

/**
 * Conditions dialog for overlay text fields: change a field's style (colour, stroke,
 * opacity, font, size) depending on its variable's value.
 *
 * The rules are stored in the field ("conditions"), either inline or as the name of a
 * rule set stored in the same overlay ("conditionsets"), so an overlay stays
 * self-contained.  The Python side (scripts/modules/allskyoverlay/conditions.py)
 * evaluates them when the overlay is drawn, after a module's own colour.
 *
 * The kind of rules follows the variable's type and can't be changed:
 *   boolean   a style for true (truthy) and one for false (falsy) values
 *   number    rows of one or two conditions (<, <=, >, >=, =); the first matching row wins
 *   text      rows of equals / contains / starts with, case-insensitive
 */
class OECONDITIONS {

	static BOOLEAN_TYPES = ['bool', 'boolean', 'gpio'];
	static NUMBER_TYPES = ['number', 'int', 'float', 'temperature', 'azimuth', 'elevation',
		'altitude', 'distance', 'per', 'percent', 'deg', 'filesize'];
	static TEXT_TYPES = ['string', 'text'];

	static NUMBER_OPS = ['<', '<=', '>', '>=', '='];
	static TEXT_OPS = { 'equals': 'equals', 'contains': 'contains', 'startswith': 'starts with' };
	static TRUTHY = ['true', 'yes', 'on', '1'];
	static FALSY = ['false', 'no', 'off', '0'];
	static STYLE_KEYS = ['fill', 'stroke', 'strokewidth', 'opacity', 'font', 'fontsize'];

	#field = null;
	#kind = null;
	#fonts = [];
	#onChange = null;

	/** The kind of rules for a variable type, or null if conditions aren't possible. */
	static kindForType(type) {
		type = String(type || '').toLowerCase();
		if (OECONDITIONS.BOOLEAN_TYPES.includes(type)) return 'boolean';
		if (OECONDITIONS.NUMBER_TYPES.includes(type)) return 'number';
		if (OECONDITIONS.TEXT_TYPES.includes(type)) return 'text';
		return null;
	}

	/**
	 * Conditions style the whole field, so it must contain only the variable:
	 * with "Heater: ${DEWCONTROLHEATER}" the "Heater:" would change colour too.
	 */
	static isSingleVariable(label) {
		return /^\s*\$\{[^}]*\}\s*$/.test(String(label || ''));
	}

	/** Shown or hidden by our own toggles (not ':visible', which depends on layout). */
	static #shown($element) {
		return $element.length > 0 && $element.css('display') !== 'none';
	}

	static #esc(text) {
		return $('<div>').text(text === undefined || text === null ? '' : String(text)).html();
	}

	// ---- evaluation, the same as conditions.py, for the preview ----------------------

	static #toBool(value) {
		if (typeof value === 'boolean') return value;
		const text = String(value).trim().toLowerCase();
		if (OECONDITIONS.TRUTHY.includes(text)) return true;
		if (OECONDITIONS.FALSY.includes(text)) return false;
		const number = Number(text);
		return (text !== '' && !isNaN(number)) ? number !== 0 : null;
	}

	static evaluate(conditions, value, sets) {
		if (conditions && conditions.set) {
			conditions = (sets || {})[conditions.set];
		}
		if (!conditions || value === null || value === undefined || String(value).trim() === '') {
			return null;
		}
		if (conditions.type === 'boolean') {
			const state = OECONDITIONS.#toBool(value);
			return state === null ? null : (conditions[state ? 'true' : 'false'] || null);
		}
		if (conditions.type === 'number') {
			const number = Number(String(value).trim());
			if (isNaN(number)) return null;
			const ops = { '<': (a, b) => a < b, '<=': (a, b) => a <= b, '>': (a, b) => a > b,
				'>=': (a, b) => a >= b, '=': (a, b) => a === b };
			for (const rule of conditions.rules || []) {
				const tests = rule.when || [];
				if (tests.length > 0 && tests.every(t => ops[t.op] && t.value !== '' && !isNaN(Number(t.value)) && ops[t.op](number, Number(t.value)))) {
					return rule.style || null;
				}
			}
			return null;
		}
		if (conditions.type === 'text') {
			const text = String(value).trim().toLowerCase();
			const ops = { 'equals': (a, b) => a === b, 'contains': (a, b) => a.includes(b), 'startswith': (a, b) => a.startsWith(b) };
			for (const rule of conditions.rules || []) {
				const target = String(rule.value || '').trim().toLowerCase();
				if (ops[rule.op] && target !== '' && ops[rule.op](text, target)) {
					return rule.style || null;
				}
			}
		}
		return null;
	}

	// ---- dialog ------------------------------------------------------------------------

	/**
	 * Open the dialog for a text field.
	 * @param field     the OETEXTFIELD
	 * @param fonts     font names for the font list
	 * @param onChange  called after the conditions were applied or removed
	 */
	open(field, fonts, onChange) {
		this.#field = field;
		this.#fonts = fonts || [];
		this.#onChange = onChange;

		const label = field.label;
		if (!OECONDITIONS.isSingleVariable(label) && !(field.fieldData && field.fieldData.conditions)) {
			bootbox.alert('Conditions need a field that contains only one variable, e.g. <code>${TEMPERATURE_C}</code>, and no other text, since the style applies to the whole field. Put any other text in its own field.');
			return;
		}
		this.#kind = OECONDITIONS.kindForType(field.type);
		if (this.#kind === null) {
			bootbox.alert('Conditions are available for yes/no, number and text variables. This variable\'s type (<b>' + OECONDITIONS.#esc(field.type || 'unknown') + '</b>) isn\'t supported.');
			return;
		}

		let conditions = field.fieldData.conditions ? JSON.parse(JSON.stringify(field.fieldData.conditions)) : null;
		let setName = '';
		if (conditions && conditions.set) {
			setName = conditions.set;
			conditions = this.#sets()[setName] ? JSON.parse(JSON.stringify(this.#sets()[setName])) : null;
		}
		if (!conditions || conditions.type !== this.#kind) {
			conditions = this.#empty();
			setName = '';
		}

		this.#render(conditions, setName);
		$('#oe-conditions-dialog').modal('show');
	}

	#config() {
		return window.oedi.get('config');
	}

	#sets() {
		return this.#config().getValue('conditionsets', {}) || {};
	}

	#empty() {
		if (this.#kind === 'boolean') {
			return { type: 'boolean', true: { fill: '#00ff00' }, false: { fill: '#ff0000' } };
		}
		if (this.#kind === 'number') {
			return { type: 'number', rules: [{ when: [{ op: '>', value: '' }], style: { fill: '#ff0000' } }] };
		}
		return { type: 'text', rules: [{ op: 'contains', value: '', style: { fill: '#ff0000' } }] };
	}

	#render(conditions, setName) {
		const variable = (this.#field.label.match(/\$\{[^}]*\}/) || [''])[0];
		const kindText = { boolean: 'Yes / No', number: 'Number', text: 'Text' }[this.#kind];
		const sets = Object.entries(this.#sets()).filter(([name, set]) => set.type === this.#kind);

		let html = '<p class="oe-cond-intro">Change how <code>' + OECONDITIONS.#esc(variable) + '</code> looks depending on its value (' + kindText + '). ';
		if (this.#kind === 'boolean') {
			html += 'Yes/on/true/1 and no/off/false/0 are recognised.';
		} else if (this.#kind === 'number') {
			html += 'The first row that matches is used.';
		} else {
			html += 'Upper and lower case don\'t matter; the first row that matches is used.';
		}
		html += '</p>';

		html += '<div class="form-inline oe-cond-sets">'
			+ '<label>Rule set&nbsp;</label><select class="form-control input-sm" id="oe-cond-set">'
			+ '<option value="">This field only</option>';
		for (const [name] of sets) {
			html += '<option value="' + OECONDITIONS.#esc(name) + '"' + (name === setName ? ' selected' : '') + '>' + OECONDITIONS.#esc(name) + '</option>';
		}
		html += '</select> '
			+ '<button type="button" class="btn btn-default btn-sm" id="oe-cond-save-set" title="Save these rules under a name to use them in other fields of this overlay">Save as rule set…</button> '
			+ '<button type="button" class="btn btn-default btn-sm" id="oe-cond-copy" title="Copy rule sets from another overlay into this one">Copy from another overlay…</button>'
			+ '</div><hr>';

		html += '<div id="oe-cond-rows">' + this.#rowsHTML(conditions) + '</div>';
		if (this.#kind !== 'boolean') {
			html += '<button type="button" class="btn btn-default btn-sm" id="oe-cond-add"><i class="fa-solid fa-plus"></i> Add row</button>';
		}

		html += '<hr><div class="form-inline"><label>Try a value&nbsp;</label>'
			+ '<input type="text" class="form-control input-sm" id="oe-cond-test" placeholder="' + (this.#kind === 'boolean' ? 'on' : (this.#kind === 'number' ? '12.5' : 'rain')) + '"> '
			+ '<span id="oe-cond-preview" class="oe-cond-preview"></span></div>';

		$('#oe-conditions-dialog-body').html(html);
		this.#bind();
		this.#updatePreview();
	}

	#styleHTML(style) {
		style = style || {};
		const more = OECONDITIONS.STYLE_KEYS.some(k => k !== 'fill' && style[k] !== undefined && style[k] !== '');
		let fonts = '<option value="">(field font)</option>';
		for (const font of this.#fonts) {
			fonts += '<option' + (style.font === font ? ' selected' : '') + '>' + OECONDITIONS.#esc(font) + '</option>';
		}
		return '<input type="color" class="oe-cond-fill" value="' + OECONDITIONS.#esc(style.fill || '#ffffff') + '" title="Colour"> '
			+ '<a href="#" class="oe-cond-more-toggle">' + (more ? 'Less' : 'More') + '</a>'
			+ '<div class="oe-cond-more form-inline"' + (more ? '' : ' style="display:none"') + '>'
			+ '<label>Stroke</label> <input type="color" class="oe-cond-stroke" value="' + OECONDITIONS.#esc(style.stroke || '#000000') + '">'
			+ '<input type="checkbox" class="oe-cond-stroke-on" title="Change the stroke colour"' + (style.stroke ? ' checked' : '') + '> '
			+ '<label>Width</label> <input type="number" class="form-control input-sm oe-cond-strokewidth" min="0" max="10" step="1" value="' + OECONDITIONS.#esc(style.strokewidth ?? '') + '" placeholder="–"> '
			+ '<label>Opacity</label> <input type="number" class="form-control input-sm oe-cond-opacity" min="0" max="1" step="0.1" value="' + OECONDITIONS.#esc(style.opacity ?? '') + '" placeholder="–"> '
			+ '<label>Font</label> <select class="form-control input-sm oe-cond-font">' + fonts + '</select> '
			+ '<label>Size</label> <input type="number" class="form-control input-sm oe-cond-fontsize" min="4" max="256" step="4" value="' + OECONDITIONS.#esc(style.fontsize ?? '') + '" placeholder="–">'
			+ '</div>';
	}

	#rowsHTML(conditions) {
		let html = '';
		if (this.#kind === 'boolean') {
			for (const [key, text] of [['true', 'When yes / on / true'], ['false', 'When no / off / false']]) {
				html += '<div class="oe-cond-row" data-key="' + key + '"><label class="oe-cond-when">' + text + '</label> '
					+ '<input type="checkbox" class="oe-cond-enabled" title="Use a style for this case"' + (conditions[key] ? ' checked' : '') + '> '
					+ this.#styleHTML(conditions[key]) + '</div>';
			}
			return html;
		}
		for (const rule of conditions.rules || []) {
			html += this.#ruleHTML(rule);
		}
		return html;
	}

	#opSelect(cls, ops, selected) {
		let html = '<select class="form-control input-sm ' + cls + '">';
		for (const [value, text] of Object.entries(ops)) {
			html += '<option value="' + OECONDITIONS.#esc(value) + '"' + (value === selected ? ' selected' : '') + '>' + OECONDITIONS.#esc(text) + '</option>';
		}
		return html + '</select>';
	}

	#ruleHTML(rule) {
		const buttons = ' <span class="oe-cond-row-buttons">'
			+ '<button type="button" class="btn btn-default btn-xs oe-cond-up" title="Move up"><i class="fa-solid fa-arrow-up"></i></button>'
			+ '<button type="button" class="btn btn-default btn-xs oe-cond-down" title="Move down"><i class="fa-solid fa-arrow-down"></i></button>'
			+ '<button type="button" class="btn btn-danger btn-xs oe-cond-delete" title="Delete row"><i class="fa-solid fa-xmark"></i></button></span>';
		let html = '<div class="oe-cond-row form-inline">';
		if (this.#kind === 'number') {
			const ops = Object.fromEntries(OECONDITIONS.NUMBER_OPS.map(o => [o, o.replace('<=', '≤').replace('>=', '≥')]));
			const first = (rule.when || [])[0] || { op: '>', value: '' };
			const second = (rule.when || [])[1];
			html += '<label class="oe-cond-when">When value</label> '
				+ this.#opSelect('oe-cond-op1', ops, first.op) + ' '
				+ '<input type="number" step="any" class="form-control input-sm oe-cond-val1" value="' + OECONDITIONS.#esc(first.value) + '"> '
				+ '<span class="oe-cond-and"' + (second ? '' : ' style="display:none"') + '>and ' + this.#opSelect('oe-cond-op2', ops, second ? second.op : '<=') + ' '
				+ '<input type="number" step="any" class="form-control input-sm oe-cond-val2" value="' + OECONDITIONS.#esc(second ? second.value : '') + '"></span> '
				+ '<a href="#" class="oe-cond-and-toggle" title="Add or remove a second condition, e.g. &gt; 11 and ≤ 12">' + (second ? '− and' : '+ and') + '</a> ';
		} else {
			html += '<label class="oe-cond-when">When value</label> '
				+ this.#opSelect('oe-cond-op1', OECONDITIONS.TEXT_OPS, rule.op || 'contains') + ' '
				+ '<input type="text" class="form-control input-sm oe-cond-val1" value="' + OECONDITIONS.#esc(rule.value) + '"> ';
		}
		html += this.#styleHTML(rule.style) + buttons + '</div>';
		return html;
	}

	#readStyle($row) {
		const style = { fill: $row.find('.oe-cond-fill').val() };
		if ($row.find('.oe-cond-stroke-on').is(':checked')) style.stroke = $row.find('.oe-cond-stroke').val();
		const width = $row.find('.oe-cond-strokewidth').val();
		if (width !== '') style.strokewidth = Number(width);
		const opacity = $row.find('.oe-cond-opacity').val();
		if (opacity !== '') style.opacity = Number(opacity);
		const font = $row.find('.oe-cond-font').val();
		if (font) style.font = font;
		const size = $row.find('.oe-cond-fontsize').val();
		if (size !== '') style.fontsize = Number(size);
		return style;
	}

	/** The rules as entered (incomplete rows are left out). */
	#read() {
		const conditions = { type: this.#kind };
		if (this.#kind === 'boolean') {
			$('#oe-cond-rows .oe-cond-row').each((i, row) => {
				const $row = $(row);
				if ($row.find('.oe-cond-enabled').is(':checked')) {
					conditions[$row.data('key')] = this.#readStyle($row);
				}
			});
			return conditions;
		}
		conditions.rules = [];
		$('#oe-cond-rows .oe-cond-row').each((i, row) => {
			const $row = $(row);
			const value = String($row.find('.oe-cond-val1').val()).trim();
			if (value === '') return;
			if (this.#kind === 'number') {
				const when = [{ op: $row.find('.oe-cond-op1').val(), value: Number(value) }];
				const value2 = String($row.find('.oe-cond-val2').val()).trim();
				if (OECONDITIONS.#shown($row.find('.oe-cond-and')) && value2 !== '') {
					when.push({ op: $row.find('.oe-cond-op2').val(), value: Number(value2) });
				}
				conditions.rules.push({ when: when, style: this.#readStyle($row) });
			} else {
				conditions.rules.push({ op: $row.find('.oe-cond-op1').val(), value: value, style: this.#readStyle($row) });
			}
		});
		return conditions;
	}

	#isEmpty(conditions) {
		return this.#kind === 'boolean' ? (!conditions.true && !conditions.false) : conditions.rules.length === 0;
	}

	#updatePreview() {
		const value = $('#oe-cond-test').val();
		const $preview = $('#oe-cond-preview');
		if (value === undefined || String(value).trim() === '') {
			$preview.html('').removeAttr('style');
			return;
		}
		const style = OECONDITIONS.evaluate(this.#read(), value, {});
		const fallback = this.#field.fill || '#ffffff';
		$preview.text(value).css({
			color: (style && style.fill) || fallback,
			opacity: style && style.opacity !== undefined ? style.opacity : 1,
			'-webkit-text-stroke': style && style.stroke ? ((style.strokewidth || 1) + 'px ' + style.stroke) : '',
			'font-family': style && style.font ? style.font : '',
		});
		$preview.attr('title', style ? 'A rule matches' : 'No rule matches: the field keeps its own style');
	}

	#bind() {
		const $body = $('#oe-conditions-dialog-body');
		$body.off();
		$body.on('input change', 'input, select', () => this.#updatePreview());
		$body.on('click', '.oe-cond-more-toggle', (e) => {
			e.preventDefault();
			const $more = $(e.target).siblings('.oe-cond-more');
			$more.css('display', OECONDITIONS.#shown($more) ? 'none' : '');
			$(e.target).text(OECONDITIONS.#shown($more) ? 'Less' : 'More');
		});
		$body.on('click', '.oe-cond-and-toggle', (e) => {
			e.preventDefault();
			const $and = $(e.target).siblings('.oe-cond-and');
			$and.css('display', OECONDITIONS.#shown($and) ? 'none' : '');
			$(e.target).text(OECONDITIONS.#shown($and) ? '− and' : '+ and');
			this.#updatePreview();
		});
		$body.on('click', '.oe-cond-up', (e) => {
			const $row = $(e.target).closest('.oe-cond-row');
			$row.prev('.oe-cond-row').before($row);
			this.#updatePreview();
		});
		$body.on('click', '.oe-cond-down', (e) => {
			const $row = $(e.target).closest('.oe-cond-row');
			$row.next('.oe-cond-row').after($row);
			this.#updatePreview();
		});
		$body.on('click', '.oe-cond-delete', (e) => {
			$(e.target).closest('.oe-cond-row').remove();
			this.#updatePreview();
		});
		$body.on('click', '#oe-cond-add', () => {
			const rule = this.#kind === 'number'
				? { when: [{ op: '>', value: '' }], style: { fill: '#ffffff' } }
				: { op: 'contains', value: '', style: { fill: '#ffffff' } };
			$('#oe-cond-rows').append(this.#ruleHTML(rule));
		});
		$body.on('change', '#oe-cond-set', () => {
			const name = $('#oe-cond-set').val();
			const conditions = name ? JSON.parse(JSON.stringify(this.#sets()[name])) : this.#read();
			const test = $('#oe-cond-test').val();
			this.#render(conditions, name);
			$('#oe-cond-test').val(test);
			this.#updatePreview();
		});
		$body.on('click', '#oe-cond-save-set', () => this.#saveAsSet());
		$body.on('click', '#oe-cond-copy', () => this.#copyFromOverlay());

		$('#oe-conditions-dialog-apply').off('click').on('click', () => this.#apply());
		$('#oe-conditions-dialog-remove').off('click').on('click', () => this.#remove());
	}

	#saveAsSet() {
		const conditions = this.#read();
		if (this.#isEmpty(conditions)) {
			bootbox.alert('Enter at least one rule first.');
			return;
		}
		bootbox.prompt({
			title: 'Name of the rule set',
			value: $('#oe-cond-set').val() || '',
			callback: (name) => {
				name = (name || '').trim();
				if (name === '') return;
				const save = () => {
					const sets = JSON.parse(JSON.stringify(this.#sets()));
					sets[name] = conditions;
					this.#config().setValue('conditionsets', sets);
					this.#config().dirty = true;
					this.#render(conditions, name);
				};
				if (this.#sets()[name]) {
					bootbox.confirm('A rule set "' + OECONDITIONS.#esc(name) + '" already exists. Replace it? Every field that uses it will change.', (ok) => { if (ok) save(); });
				} else {
					save();
				}
			}
		});
	}

	#copyFromOverlay() {
		$.ajax({
			url: 'includes/overlayutil.php?request=Overlays',
			type: 'GET',
			dataType: 'json',
			cache: false,
		}).done((overlays) => {
			const current = JSON.stringify(this.#config().getValue('metadata', {}));
			const found = [];
			for (const group of ['coreoverlays', 'useroverlays']) {
				for (const [file, overlay] of Object.entries(overlays[group] || {})) {
					if (JSON.stringify(overlay.metadata || {}) === current) continue;
					for (const [name, set] of Object.entries(overlay.conditionsets || {})) {
						if (set.type === this.#kind) {
							found.push({ file: file, overlay: (overlay.metadata && overlay.metadata.name) || file, name: name, set: set });
						}
					}
				}
			}
			if (found.length === 0) {
				bootbox.alert('No other overlay has rule sets for this kind of variable.');
				return;
			}
			bootbox.prompt({
				title: 'Copy a rule set into this overlay',
				inputType: 'select',
				inputOptions: found.map((f, i) => ({ text: f.name + '  (from ' + f.overlay + ')', value: String(i) })),
				callback: (index) => {
					if (index === null) return;
					const pick = found[Number(index)];
					const sets = JSON.parse(JSON.stringify(this.#sets()));
					let name = pick.name;
					if (sets[name] && JSON.stringify(sets[name]) !== JSON.stringify(pick.set)) {
						name = pick.name + ' (' + pick.overlay + ')';
					}
					sets[name] = JSON.parse(JSON.stringify(pick.set));
					this.#config().setValue('conditionsets', sets);
					this.#config().dirty = true;
					this.#render(sets[name], name);
				}
			});
		}).fail(() => {
			bootbox.alert('Unable to read the other overlays.');
		});
	}

	#apply() {
		const conditions = this.#read();
		const setName = $('#oe-cond-set').val();
		if (this.#isEmpty(conditions)) {
			delete this.#field.fieldData.conditions;
		} else if (setName && JSON.stringify(conditions) === JSON.stringify(this.#sets()[setName])) {
			this.#field.fieldData.conditions = { set: setName };
		} else {
			this.#field.fieldData.conditions = conditions;
		}
		this.#field.dirty = true;
		$('#oe-conditions-dialog').modal('hide');
		if (this.#onChange) this.#onChange();
	}

	#remove() {
		delete this.#field.fieldData.conditions;
		this.#field.dirty = true;
		$('#oe-conditions-dialog').modal('hide');
		if (this.#onChange) this.#onChange();
	}
}
