"use strict";
class OETEXTFIELD extends OEFIELD {

  static DEFAULTFONTCOLOUR = 'white';
  static DEFAULTFONTOPACITY = 1;
  static DEFAULTFONT = 'default';
  static DEFAULTFONTSIZE = 32;
  static DEFAULTTEXTROTATION = 0;
  static DEFAULTSTROKEWIDTH = 0;
  static DEFAULTSTROKE = '';

  DEFAULTS = {
    'font': {
      'path': 'font',
      'defaultpath': 'settings.defaultfont',
      'default': OETEXTFIELD.DEFAULTFONT
    },
    'fontsize': {
      'path': 'fontsize',
      'defaultpath': 'settings.defaultfontsize',
      'default': OETEXTFIELD.DEFAULTFONTSIZE
    },
    'fill': {
      'path': 'fill',
      'defaultpath': 'settings.defaultfontcolour',
      'default': OETEXTFIELD.DEFAULTFONTCOLOUR
    },
    'opacity': {
      'path': 'opacity',
      'defaultpath': 'settings.defaultfontopacity',
      'default': OETEXTFIELD.DEFAULTFONTOPACITY
    },
    'format': {
      'path': 'format',
      'defaultpath': '',
      'default': ''
    },
    'rotate': {
      'path': 'rotate',
      'defaultpath': 'settings.defaulttextrotation',
      'default': OETEXTFIELD.DEFAULTTEXTROTATION
    },
    'strokewidth': {
      'path': 'strokewidth',
      'defaultpath': '',
      'default': OETEXTFIELD.DEFAULTSTROKEWIDTH
    },
    'stroke': {
      'path': 'stroke',
      'defaultpath': 'settings.defaultstrokecolour',
      'default': OETEXTFIELD.DEFAULTSTROKE
    }    
  };

  constructor(fieldData, id) {
    super('fields', id);
    this.config = window.oedi.get('config');

    this.fieldData = fieldData;
    this.fieldData.id = this.id;
    this.setDefaults();
    this.createShape();
  }

  createShape() {
    this.shape = new Konva.Text({
      id: this.id,
      x: this.fieldData.x,
      y: this.fieldData.y,
      text: this.fieldData.label,
      fontSize: this.fieldData.fontsize,
      fontFamily: this.fieldData.font ,
      fill: this.fieldData.fontcolour,
      rotation:  this.fieldData.rotate,
      opacity: this.fieldData.opacity,
      draggable: true,
      fill: this.fieldData.fill,
      name: 'field',
      strokeWidth: this.fieldData.strokewidth,
      stroke: this.fieldData.stroke,
      perfectDrawEnabled: false
    });    
    let size = this.shape.measureSize(this.fieldData.label);  
    this.shape.offset({x: size.width/2, y: size.height/2});    
  }

  get empty() {
    return this.fieldData.empty;
  }
  set empty(empty) {
    this.fieldData.empty = empty;
    this.dirty = true;
  }

  get sample() {
    return this.fieldData.sample;
  }
  set sample(sample) {
    this.fieldData.sample = sample;
    this.dirty = true;
  }

  get label() {
    return this.fieldData.label;
  }
  set label(label) {
    this.fieldData.label = label;
    this.setLabel(this.fieldData.label);    
    this.dirty = true;
  }

  getLabel() {
    return this.shape.text();
  }
  setLabel(label) {

    let currentXoffset = this.shape.offsetX();
    let currentX = this.shape.x();
    let currentY = this.shape.y();
    this.shape.text(label);
    let size = this.shape.measureSize(label);  
    //this.shape.offset({x: size.width/2, y: size.height/2});
    this.dirty = true;
  }

  get format() {
    return this.fieldData.format;
  }
  set format(format) {
    this.fieldData.format = format;
    this.dirty = true;
  }

  get fontname() {
    return this.fieldData.font;
  }
  set fontname(font) {
    this.fieldData.font = font;
    this.shape.fontFamily(font);
    this.dirty = true;
  }

  get fontsize() {
    return this.fieldData.fontsize;
  }
  set fontsize(fontsize) {
    this.fieldData.fontsize = parseInt(fontsize);
    this.shape.fontSize(fontsize);
    let size = this.shape.measureSize(this.shape.text());      
    this.shape.offset({x:  size.width/2, y: size.height/2});    
    this.dirty = true;
  }

  get strokewidth() {
    return this.fieldData.strokewidth;
  }
  set strokewidth(strokeWidth) {
    this.fieldData.strokewidth = parseInt(strokeWidth);
    this.shape.strokeWidth(strokeWidth);    
    this.dirty = true;
  }

  get stroke() {
    return this.fieldData.stroke;
  }
  set stroke(stroke) {
    this.fieldData.stroke = stroke;
    this.shape.stroke(stroke);
    this.dirty = true;
  }  
}