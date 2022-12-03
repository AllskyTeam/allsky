"use strict";

class OEFIELD {
  fieldData = null;
  config = null;
  #dirty = false;
  shape = null;
  id = null;

  OVERLAYFIELDSELECTOR = ".overlayfield";

  constructor(type, id) {
    //this.type = type;
    this.id = 'oe-field-' + id;
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

  get id() {
    return this.id;
  }

  get shape() {
    return this.shape;
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
    for (let defaultName in this.DEFAULTS) {
      let path = this.DEFAULTS[defaultName].path;
      let defaultPath = this.DEFAULTS[defaultName].defaultpath;
      let defaultClassValue = this.DEFAULTS[defaultName].default;

      let defaultValue = '';
      if (defaultPath !== '') {
        defaultValue = this.config.getValue(defaultPath, defaultClassValue);
      }

      if (path in this.fieldData) {
        if (this.fieldData[path] === defaultValue) {
          delete this.fieldData[path];
        }
      }
    }
    
    return this.fieldData;
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

  get x() {
    return this.fieldData.x;
  }
  set x(x) {
    this.fieldData.x = x;
    this.shape.x(x);
    this.dirty = true;
  }

  get y() {
    return this.fieldData.y;
  }
  set y(y) {
    this.fieldData.y = y;
    this.shape.y(y);;
    this.dirty = true;
  }

  get rotation() {
    return this.fieldData.rotate;
  }
  set rotation(rotation) {
    this.fieldData.rotate = rotation;
    this.shape.rotation(rotation);
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

  //enableTestMode(name, sample) {
  enableTestMode(value) {
      if (this instanceof OETEXTFIELD) {
      //let label = this.getLabel();
      //label = label.replace(name, sample);
      //this.setLabel(label);
      this.setLabel(value);
    }
  }

  disableTestMode() {
    if ('label' in this.fieldData) {
      this.label = this.label;
    }
  }
}