"use strict";

class OEFIELD {
	fieldData = null;
	config = null;
	#dirty = false;
	shape = null;
	id = null;
	loaded = true;
	fieldType = null;
	groupId = null

	OVERLAYFIELDSELECTOR = ".overlayfield";

	constructor(fieldType, id) {
		this.fieldType = fieldType;
		this.id = 'oe-field-' + id;
	}

	get fieldType() {
		return this.type
	}

	get loaded() {
		return this.loaded;
	}

	get id() {
		return this.id;
	}

	get shape() {
		return this.shape;
	}

	get group() {
		let result = null

		if (this.fieldData.groupId !== undefined) {
			result = this.fieldData.groupId
		}
		return result
	}
	set group(group) {
		this.fieldData.groupId = group
	}

	get sample() {
		return this.fieldData.sample;
	}
	set sample(sample) {
		this.fieldData.sample = sample;
	}

	get dirty() {
		return this.#dirty;
	}
	set dirty(value) {
		this.#dirty = value
	}

	get name() {
		return this.fieldName;
	}

	get position() {
		return this.getValue('position');
	}

	get calcX() {
		return this.fieldData.x - this.shape.offsetX();
	}
	get calcY() {
		return this.fieldData.y - this.shape.offsetY();
	}

	get x() {
		return this.fieldData.x;
	}
	set x(x) {
		this.fieldData.x = x;
		this.shape.x(x);
		this.rotatePoint()
		this.dirty = true;
	}

	get y() {
		return this.fieldData.y;
	}
	set y(y) {
		this.fieldData.y = y;
		this.shape.y(y);
		this.rotatePoint()
		this.dirty = true;
	}

	get tlx() {
		return this.fieldData.tlx;
	}

	get tly() {
		return this.fieldData.tly;
	}

	set tlx(x) {
		this.fieldData.tlx = x;
		this.shape.x(x + this.shape.width()/2);
		this.rotatePoint();
	}

	set tly(y) {
		this.fieldData.tly = y;
		this.shape.y(y + this.shape.height()/2);
		this.rotatePoint();
	}


	get rotation() {
		return this.fieldData.rotate;
	}
	set rotation(rotation) {
		this.fieldData.rotate = rotation;
		this.shape.rotation(rotation);
		this.rotatePoint()
		this.dirty = true;
	}

	get opacity() {
		return this.fieldData.opacity;
	}
	set opacity(opacity) {
		this.fieldData.opacity = opacity;
		this.shape.opacity(opacity);
		this.dirty = true;
	}

	get fill() {
		return this.fieldData.fill;
	}
	set fill(fill) {
		this.fieldData.fill = fill;
		this.shape.fill(fill);
		this.dirty = true;
	}

	extractPlaceholders(str) {
		const regex = /\$\{([^}]+)\}/g;
		const matches = [];
		let match;

		while ((match = regex.exec(str)) !== null) {
			matches.push(match[1]);
		}

		return matches;
	}

	setDefaults() {
		for (let defaultName in this.DEFAULTS) {
			let path = this.DEFAULTS[defaultName].path;
			let defaultPath = this.DEFAULTS[defaultName].defaultpath;
			let defaultValue = this.DEFAULTS[defaultName].default;

			if (!(path in this.fieldData)) {
				if (defaultPath !== '') {
					this.fieldData[path] = this.config.getValue(defaultPath, defaultValue);
				} else {
					this.fieldData[path] = defaultValue;
				}
			}
		}
	}

	updateDefaults() {
		for (let defaultName in this.DEFAULTS) {
			let path = this.DEFAULTS[defaultName].path;
			let defaultPath = this.DEFAULTS[defaultName].defaultpath;
			let defaultValue = this.DEFAULTS[defaultName].default;

			if (path in this.fieldData) {
				let oldDefault = this.config.getBackupValue(defaultPath, defaultValue);
				if (this.fieldData[path] == oldDefault) {
					this.fieldData[path] = this.config.getValue(defaultPath, defaultValue);
					this[path] = this.fieldData[path];
				}
			}
		}
	}

	getValue(path, defaultValue = null) {
		return path.split('.').reduce((o, p) => o ? o[p] : defaultValue, this.fieldData);
	}

	setValue(path, value) {
		return path.split('.').reduce((o, p, i) => o[p] = path.split('.').length === ++i ? value : o[p] || {}, this.fieldData);
	}

	deleteValue(path) {
		let currentObject = this.fieldData
		const parts = path.split(".")
		const last = parts.pop()
		for (const part of parts) {
			currentObject = currentObject[part]
			if (!currentObject) {
				return
			}
		}
		delete currentObject[last]
	}

	getJSON() {
		this.saveFieldData = JSON.parse(JSON.stringify(this.fieldData));
		for (let defaultName in this.DEFAULTS) {
			let path = this.DEFAULTS[defaultName].path;
			let defaultPath = this.DEFAULTS[defaultName].defaultpath;
			let defaultClassValue = this.DEFAULTS[defaultName].default;

			let defaultValue = '';
			if (defaultPath !== '') {
				defaultValue = this.config.getValue(defaultPath, defaultClassValue);
			}

			if (path in this.saveFieldData) {
				if (this.saveFieldData[path] === defaultValue) {
					delete this.saveFieldData[path];
				}
			}
		}

		return this.saveFieldData;
	}

	rotatePoint() {

		let tlx = this.shape.x() - this.shape.offsetX();
		let tly = this.shape.y() - this.shape.offsetY();
		let pt = {
			x: tlx,
			y: tly
		};

		let o = {
			x: this.shape.x(),
			y: this.shape.y()
		};

		let a = this.shape.rotation();

		var angle = a * (Math.PI / 180);
		var rotatedX = Math.cos(angle) * (pt.x - o.x) - Math.sin(angle) * (pt.y - o.y) + o.x;
		var rotatedY = Math.sin(angle) * (pt.x - o.x) + Math.cos(angle) * (pt.y - o.y) + o.y;

		this.fieldData.tlx = rotatedX | 0;
		this.fieldData.tly = rotatedY | 0;
	}

	enableTestMode(value) {
		if (this instanceof OETEXTFIELD) {
			this.setLabel(value);
		}
	}

	disableTestMode() {
		if ('label' in this.fieldData) {
			this.label = this.label;
		}
	}
}