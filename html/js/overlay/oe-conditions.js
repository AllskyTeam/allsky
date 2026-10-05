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
	static NUMBER_TYPES = ['number', 'int', 'float', 'temperature', 'pressure', 'azimuth', 'elevation',
		'altitude', 'distance', 'per', 'percent', 'deg', 'filesize'];
	static TEXT_TYPES = ['string', 'text'];

	static NUMBER_OPS = ['<', '<=', '>', '>=', '='];
	static TEXT_OPS = { 'equals': 'equals', 'contains': 'contains', 'startswith': 'starts with' };
	static TRUTHY = ['true', 'yes', 'on', '1'];
	static FALSY = ['false', 'no', 'off', '0'];
	static STYLE_KEYS = ['fill', 'stroke', 'strokewidth', 'opacity', 'font', 'fontsize', 'text'];

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
		const kindText = { boolean: 'Yes / No', number: 'Number', text: 'Text' }[this.#kind];
		const hint = {
			boolean: 'Yes, on, true and 1 count as yes; no, off, false and 0 as no.',
			number: 'The first rule that matches is used.',
			text: 'Upper and lower case don\'t matter. The first rule that matches is used.',
		}[this.#kind];

		let html = '<div class="oe-cond-top">'
			+ '<span class="label label-default oe-cond-kind">' + kindText + '</span> '
			+ '<span class="text-muted small">' + hint + '</span>'
			+ this.#setsMenuHTML(setName)
			+ '</div>';

		html += '<div id="oe-cond-rows">' + this.#rowsHTML(conditions) + '</div>';
		if (this.#kind !== 'boolean') {
			html += '<button type="button" class="btn btn-default btn-block oe-cond-add" id="oe-cond-add"><i class="fa-solid fa-plus"></i> Add rule</button>';
		}
		html += '<div class="oe-cond-else text-muted small"><i class="fa-solid fa-arrow-turn-down fa-rotate-90"></i> Otherwise: the field\'s own style</div>';

		html += '<div class="form-inline oe-cond-try"><label for="oe-cond-test">Try a value</label> '
			+ '<input type="text" class="form-control input-sm" id="oe-cond-test" placeholder="' + (this.#kind === 'boolean' ? 'on' : (this.#kind === 'number' ? '12.5' : 'rain')) + '"> '
			+ '<span id="oe-cond-preview" class="oe-cond-sample oe-cond-preview"></span> '
			+ '<span id="oe-cond-which" class="text-muted small"></span></div>';

		$('#oe-conditions-dialog-body').html(html);
		this.#bind();
		this.#updatePreview();
	}

	/** One menu for everything about rule sets: pick one, save these rules, copy one in. */
	#setsMenuHTML(setName) {
		const sets = Object.entries(this.#sets()).filter(([name, set]) => set.type === this.#kind);
		const item = (name, text) => '<li' + (name === setName ? ' class="active"' : '') + '><a href="#" class="oe-cond-pick-set" data-set="' + OECONDITIONS.#esc(name) + '">'
			+ '<i class="fa-fw ' + (name === setName ? 'fa-solid fa-check' : (name === '' ? 'fa-regular fa-file' : 'fa-regular fa-bookmark')) + '"></i> ' + text + '</a></li>';
		let html = '<input type="hidden" id="oe-cond-set" value="' + OECONDITIONS.#esc(setName) + '">'
			+ '<div class="btn-group oe-cond-sets">'
			+ '<button type="button" class="btn btn-default btn-sm dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" title="Rule sets: reuse rules in other fields">'
			+ '<i class="fa-regular fa-bookmark"></i> ' + (setName ? 'Rule set: ' + OECONDITIONS.#esc(setName) : 'This field only') + ' <span class="caret"></span></button>'
			+ '<ul class="dropdown-menu dropdown-menu-right">'
			+ item('', 'This field only');
		for (const [name] of sets) {
			html += item(name, OECONDITIONS.#esc(name));
		}
		html += '<li role="separator" class="divider"></li>'
			+ '<li><a href="#" id="oe-cond-save-set"><i class="fa-fw fa-regular fa-floppy-disk"></i> Save these rules as a rule set…</a></li>'
			+ '<li><a href="#" id="oe-cond-copy"><i class="fa-fw fa-regular fa-copy"></i> Copy a rule set from another overlay…</a></li>'
			+ '</ul></div>';
		return html;
	}

	/** Colour swatch, a sample in that style, and the extra styles behind the sliders button. */
	#styleHTML(style) {
		style = style || {};
		return '<span class="oe-cond-style">'
			+ '<i class="fa-solid fa-arrow-right text-muted"></i> '
			+ '<input type="color" class="oe-cond-fill" value="' + OECONDITIONS.#esc(style.fill || '#ffffff') + '" title="Colour"> '
			+ '<span class="oe-cond-sample oe-cond-row-sample"></span></span>';
	}

	#moreHTML(style) {
		style = style || {};
		const more = OECONDITIONS.STYLE_KEYS.some(k => k !== 'fill' && style[k] !== undefined && style[k] !== '');
		let fonts = '<option value="">(field font)</option>';
		for (const font of this.#fonts) {
			fonts += '<option' + (style.font === font ? ' selected' : '') + '>' + OECONDITIONS.#esc(font) + '</option>';
		}
		return '<div class="oe-cond-more form-inline"' + (more ? '' : ' style="display:none"') + '>'
			+ '<div class="oe-cond-text-row"><label>Show instead</label> <input type="text" class="form-control input-sm oe-cond-text" maxlength="100" value="' + OECONDITIONS.#esc(style.text ?? '') + '" placeholder="the value" title="Text shown instead of the value, e.g. DANGER. Exported values are not changed."></div>'
			+ '<label><input type="checkbox" class="oe-cond-stroke-on" title="Change the stroke colour"' + (style.stroke ? ' checked' : '') + '> Stroke</label> '
			+ '<input type="color" class="oe-cond-stroke" value="' + OECONDITIONS.#esc(style.stroke || '#000000') + '"> '
			+ '<label>Width</label> <input type="number" class="form-control input-sm oe-cond-strokewidth" min="0" max="10" step="1" value="' + OECONDITIONS.#esc(style.strokewidth ?? '') + '" placeholder="–"> '
			+ '<label>Opacity</label> <input type="number" class="form-control input-sm oe-cond-opacity" min="0" max="1" step="0.1" value="' + OECONDITIONS.#esc(style.opacity ?? '') + '" placeholder="–"> '
			+ '<label>Font</label> <select class="form-control input-sm oe-cond-font">' + fonts + '</select> '
			+ '<label>Size</label> <input type="number" class="form-control input-sm oe-cond-fontsize" min="4" max="256" step="4" value="' + OECONDITIONS.#esc(style.fontsize ?? '') + '" placeholder="–">'
			+ '</div>';
	}

	#moreButtonHTML(style) {
		style = style || {};
		const more = OECONDITIONS.STYLE_KEYS.some(k => k !== 'fill' && style[k] !== undefined && style[k] !== '');
		return '<button type="button" class="btn btn-link btn-sm oe-cond-icon oe-cond-more-toggle' + (more ? ' active' : '') + '" title="Stroke, opacity, font and size"><i class="fa-solid fa-sliders"></i></button>';
	}

	#rowsHTML(conditions) {
		let html = '';
		if (this.#kind === 'boolean') {
			for (const [key, text] of [['true', 'When yes / on / true'], ['false', 'When no / off / false']]) {
				html += '<div class="oe-cond-row" data-key="' + key + '"><div class="oe-cond-line">'
					+ '<label class="oe-cond-when"><input type="checkbox" class="oe-cond-enabled" title="Use a style for this case"' + (conditions[key] ? ' checked' : '') + '> ' + text + '</label>'
					+ this.#styleHTML(conditions[key])
					+ '<span class="oe-cond-row-buttons">' + this.#moreButtonHTML(conditions[key]) + '</span>'
					+ '</div>' + this.#moreHTML(conditions[key]) + '</div>';
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
		const buttons = '<span class="oe-cond-row-buttons">'
			+ this.#moreButtonHTML(rule.style)
			+ '<button type="button" class="btn btn-link btn-sm oe-cond-icon oe-cond-up" title="Move up"><i class="fa-solid fa-arrow-up"></i></button>'
			+ '<button type="button" class="btn btn-link btn-sm oe-cond-icon oe-cond-down" title="Move down"><i class="fa-solid fa-arrow-down"></i></button>'
			+ '<button type="button" class="btn btn-link btn-sm oe-cond-icon oe-cond-delete" title="Delete rule"><i class="fa-regular fa-trash-can"></i></button></span>';
		let html = '<div class="oe-cond-row"><div class="oe-cond-line form-inline"><span class="oe-cond-cond">';
		if (this.#kind === 'number') {
			const ops = Object.fromEntries(OECONDITIONS.NUMBER_OPS.map(o => [o, o.replace('<=', '≤').replace('>=', '≥')]));
			const first = (rule.when || [])[0] || { op: '>', value: '' };
			const second = (rule.when || [])[1];
			html += '<label class="oe-cond-when">When value</label> '
				+ this.#opSelect('oe-cond-op1', ops, first.op) + ' '
				+ '<input type="number" step="any" class="form-control input-sm oe-cond-val1" value="' + OECONDITIONS.#esc(first.value) + '"> '
				+ '<span class="oe-cond-and"' + (second ? '' : ' style="display:none"') + '>and ' + this.#opSelect('oe-cond-op2', ops, second ? second.op : '<=') + ' '
				+ '<input type="number" step="any" class="form-control input-sm oe-cond-val2" value="' + OECONDITIONS.#esc(second ? second.value : '') + '"></span> '
				+ '<button type="button" class="btn btn-link btn-sm oe-cond-icon oe-cond-and-toggle" title="' + (second ? 'Remove the second condition' : 'Add a second condition, e.g. &gt; 11 and ≤ 12') + '">'
				+ '<i class="fa-solid ' + (second ? 'fa-minus' : 'fa-plus') + '"></i></button>';
		} else {
			html += '<label class="oe-cond-when">When value</label> '
				+ this.#opSelect('oe-cond-op1', OECONDITIONS.TEXT_OPS, rule.op || 'contains') + ' '
				+ '<input type="text" class="form-control input-sm oe-cond-val1" value="' + OECONDITIONS.#esc(rule.value) + '">';
		}
		html += '</span>' + this.#styleHTML(rule.style) + buttons + '</div>' + this.#moreHTML(rule.style) + '</div>';
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
		const text = String($row.find('.oe-cond-text').val() ?? '');
		if (text.trim() !== '') style.text = text;
		return style;
	}

	/** One number or text row as a rule, or null if it's incomplete. */
	#readRow($row) {
		const value = String($row.find('.oe-cond-val1').val()).trim();
		if (value === '') return null;
		if (this.#kind === 'number') {
			const when = [{ op: $row.find('.oe-cond-op1').val(), value: Number(value) }];
			const value2 = String($row.find('.oe-cond-val2').val()).trim();
			if (OECONDITIONS.#shown($row.find('.oe-cond-and')) && value2 !== '') {
				when.push({ op: $row.find('.oe-cond-op2').val(), value: Number(value2) });
			}
			return { when: when, style: this.#readStyle($row) };
		}
		return { op: $row.find('.oe-cond-op1').val(), value: value, style: this.#readStyle($row) };
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
			const rule = this.#readRow($(row));
			if (rule !== null) conditions.rules.push(rule);
		});
		return conditions;
	}

	#isEmpty(conditions) {
		return this.#kind === 'boolean' ? (!conditions.true && !conditions.false) : conditions.rules.length === 0;
	}

	/** Show a style on an element the way the overlay draws it. */
	#applyStyle($element, style) {
		$element.css({
			color: (style && style.fill) || this.#field.fill || '#ffffff',
			opacity: style && style.opacity !== undefined ? style.opacity : 1,
			'-webkit-text-stroke': style && style.stroke ? ((style.strokewidth || 1) + 'px ' + style.stroke) : '',
			'font-family': style && style.font ? style.font : '',
		});
	}

	/** The row that a value uses, or null. */
	#matchingRow(value) {
		if (value === undefined || String(value).trim() === '') return null;
		const $rows = $('#oe-cond-rows .oe-cond-row');
		if (this.#kind === 'boolean') {
			const state = OECONDITIONS.#toBool(value);
			if (state === null) return null;
			const $row = $rows.filter('[data-key="' + state + '"]');
			return $row.find('.oe-cond-enabled').is(':checked') ? $row : null;
		}
		for (const row of $rows.toArray()) {
			const rule = this.#readRow($(row));
			if (rule !== null && OECONDITIONS.evaluate({ type: this.#kind, rules: [rule] }, value, {}) !== null) {
				return $(row);
			}
		}
		return null;
	}

	#updatePreview() {
		// Each row's sample shows its own value (or "Aa") in its style.
		$('#oe-cond-rows .oe-cond-row').each((i, row) => {
			const $row = $(row);
			const text = this.#kind === 'boolean' ? ($row.data('key') === true || $row.data('key') === 'true' ? 'ON' : 'OFF')
				: (String($row.find('.oe-cond-val1').val() || '').trim() || 'Aa');
			const rowStyle = this.#readStyle($row);
			const $sample = $row.find('.oe-cond-row-sample').text(rowStyle.text ?? text);
			this.#applyStyle($sample, rowStyle);
		});

		const value = $('#oe-cond-test').val();
		const $preview = $('#oe-cond-preview');
		const $which = $('#oe-cond-which');
		$('#oe-cond-rows .oe-cond-row').removeClass('oe-cond-match');
		if (value === undefined || String(value).trim() === '') {
			$preview.html('').removeAttr('style').hide();
			$which.text('');
			return;
		}
		const style = OECONDITIONS.evaluate(this.#read(), value, {});
		$preview.text(style && style.text !== undefined ? style.text : value).show();
		this.#applyStyle($preview, style);
		const $match = this.#matchingRow(value);
		if ($match !== null) {
			$match.addClass('oe-cond-match');
			$which.text(this.#kind === 'boolean' ? '' : 'uses rule ' + ($('#oe-cond-rows .oe-cond-row').index($match) + 1));
		} else {
			$which.text('no rule matches: the field keeps its own style');
		}
		$preview.attr('title', style ? 'A rule matches' : 'No rule matches: the field keeps its own style');
	}

	#bind() {
		const $body = $('#oe-conditions-dialog-body');
		$body.off();
		$body.on('input change', 'input, select', () => this.#updatePreview());
		$body.on('click', '.oe-cond-more-toggle', (e) => {
			e.preventDefault();
			const $button = $(e.currentTarget);
			const $more = $button.closest('.oe-cond-row').find('.oe-cond-more');
			$more.css('display', OECONDITIONS.#shown($more) ? 'none' : '');
			$button.toggleClass('active', OECONDITIONS.#shown($more));
		});
		$body.on('click', '.oe-cond-and-toggle', (e) => {
			e.preventDefault();
			const $button = $(e.currentTarget);
			const $and = $button.closest('.oe-cond-row').find('.oe-cond-and');
			$and.css('display', OECONDITIONS.#shown($and) ? 'none' : '');
			const shown = OECONDITIONS.#shown($and);
			$button.attr('title', shown ? 'Remove the second condition' : 'Add a second condition, e.g. > 11 and ≤ 12')
				.find('i').toggleClass('fa-plus', !shown).toggleClass('fa-minus', shown);
			this.#updatePreview();
		});
		$body.on('click', '.oe-cond-up', (e) => {
			const $row = $(e.currentTarget).closest('.oe-cond-row');
			$row.prev('.oe-cond-row').before($row);
			this.#updatePreview();
		});
		$body.on('click', '.oe-cond-down', (e) => {
			const $row = $(e.currentTarget).closest('.oe-cond-row');
			$row.next('.oe-cond-row').after($row);
			this.#updatePreview();
		});
		$body.on('click', '.oe-cond-delete', (e) => {
			$(e.currentTarget).closest('.oe-cond-row').remove();
			this.#updatePreview();
		});
		$body.on('click', '#oe-cond-add', () => {
			const rule = this.#kind === 'number'
				? { when: [{ op: '>', value: '' }], style: { fill: '#ffffff' } }
				: { op: 'contains', value: '', style: { fill: '#ffffff' } };
			$('#oe-cond-rows').append(this.#ruleHTML(rule));
			$('#oe-cond-rows .oe-cond-row').last().find('.oe-cond-val1').trigger('focus');
			this.#updatePreview();
		});
		$body.on('click', '.oe-cond-pick-set', (e) => {
			e.preventDefault();
			$('#oe-cond-set').val(String($(e.currentTarget).data('set') ?? '')).trigger('change');
		});
		$body.on('change', '#oe-cond-set', () => {
			const name = $('#oe-cond-set').val();
			const conditions = name ? JSON.parse(JSON.stringify(this.#sets()[name])) : this.#read();
			const test = $('#oe-cond-test').val();
			this.#render(conditions, name);
			$('#oe-cond-test').val(test);
			this.#updatePreview();
		});
		$body.on('click', '#oe-cond-save-set', (e) => { e.preventDefault(); this.#saveAsSet(); });
		$body.on('click', '#oe-cond-copy', (e) => { e.preventDefault(); this.#copyFromOverlay(); });

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
