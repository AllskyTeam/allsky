"use strict";
class OERECTFIELD extends OEFIELD {

    static DEFAULTRECTOPACITY = 50
    static DEFAULTSTROKEWIDTH = 0
    static DEFAULTSTROKE = ''
    static DEFAULTFILLCOLOUR = 'rgba(0, 0, 0, 0.5)'

    DEFAULTS = {
        'fill': {
            'path': 'fill',
            'defaultpath': '',
            'default': 'rgba(0, 0, 0, 0.5)'
        },
        'opacity': {
            'path': 'opacity',
            'defaultpath': '',
            'default': 100
        },
        'cornerradius': {
            'path': 'cornerradius',
            'defaultpath': '',
            'default': 10
        },
        'strokewidth': {
            'path': 'strokewidth',
            'defaultpath': '',
            'default': 10
        },
        'stroke': {
            'path': 'stroke',
            'defaultpath': '',
            'default': 'red'
        }
    };

    constructor(fieldData, id) {
        super('rect', id);
        this.config = window.oedi.get('config');

        this.fieldData = fieldData;
        this.fieldData.id = this.id;
        this.setDefaults();
        this.createShape();
    }

    createShape() {
        let fillEnabled = true
        if (this.fieldData.fill === 'none') {
            fillEnabled = false
        } 
        this.shape = new Konva.Rect({
            id: this.id,
            x: this.fieldData.x,
            y: this.fieldData.y,
            width: this.fieldData.width,
            height: this.fieldData.height,
            stroke: this.fieldData.stroke,
            strokeWidth: this.fieldData.strokewidth,
            rotation: this.fieldData.rotate,
            opacity: this.fieldData.opacity / 100,
            draggable: false,
            fill: this.fieldData.fill,
            name: 'field',
            perfectDrawEnabled: false,
            fillEnabled: fillEnabled,
            cornerRadius: this.fieldData.cornerradius
        })
    }

    get cornerRadius() {
        return this.fieldData.cornerradius
    }
    set cornerRadius(cornerRadius) {
        this.fieldData.cornerradius = cornerRadius
        this.shape.cornerRadius(cornerRadius)
    }

    get strokeWidth() {
        return this.fieldData.strokewidth
    }
    set strokeWidth(strokeWidth) {
        this.fieldData.strokewidth = strokeWidth
        this.shape.strokeWidth(strokeWidth)
    }

    get width() {
        return this.fieldData.width
    }
    set width(width) {
        this.fieldData.width = width
        this.shape.width(width)
    }

    get height() {
        return this.fieldData.height
    }
    set height(height) {
        this.fieldData.height = height
        this.shape.height(height)
    }

    get colour() {
        return this.fieldData.fill;
    }

    get type() {
        return this.fieldData.type;
    }
    set type(type) {
        this.fieldData.type = type;
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