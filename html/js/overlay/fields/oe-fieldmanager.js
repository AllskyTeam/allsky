"use strict";
class OEFIELDMANAGER {

    #fields = new Map();
    #config = null;
    #idcounter = 0;
    #fieldDeletedAddedDefaultsChanged = false;

    constructor() {
        this.#config = window.oedi.get('config');
    }

    get dirty() {
        let result = this.#fieldDeletedAddedDefaultsChanged;

        if (!this.#fieldDeletedAddedDefaultsChanged) {
            for (let [fieldName, field] of this.#fields.entries()) {
                if (field.dirty) {
                    result = true;
                    break;
                }
            }
        }
        return result;
    }

    get fields() {
        return this.#fields;
    }

    setupSelection(selectionRect, transformer) {
        transformer.nodes([])
        for (let [fieldName, field] of this.#fields.entries()) {
            if (field.type == 'fields') {
                field.shape.draggable(false)
                const isIntersecting = Konva.Util.haveIntersection(selectionRect, field.shape.getClientRect());

                if (isIntersecting) {
                    const oldNodes = transformer.nodes()
                    const newNodes = oldNodes.concat([field.shape])
                    transformer.nodes(newNodes)
                    field.shape.draggable(true)
                }
            }
        }

        let transformerColour = '#00ff00'
        const nodes = transformer.nodes()
        if (nodes.length > 0) {
            const getGroup = node => this.#fields.get(node.id())?.group ?? null
            const firstGroup = getGroup(nodes[0])
            const allSameGroup = nodes.every(node => getGroup(node) === firstGroup)

            if (!allSameGroup) {
                transformerColour = '#ffff00'
            }
        }
        transformer.borderStroke(transformerColour)

    }

    clearSelection(transformer) {
        transformer.nodes([]);
    }

    leftAlignFields(transformer) {
        let leftMost = 9999999999
        let leftMostId = ''

        transformer.nodes().forEach((node) => {
            const x = node.x()
            if (x < leftMost) {
                leftMost = x - node.offsetX()
                leftMostId = node.id()
            }
        })

        transformer.nodes().forEach((node) => {
            if (node.id() !== leftMostId) {
                const field = this.findField(node.id())
                field.x = leftMost + node.offsetX()
            }
        })
    }

    equalSpaceFields(transformer) {

        let textNodes = transformer.nodes()
        const count = textNodes.length;
        if (count === 0) return;

        let topY = textNodes[0].y() - textNodes[0].offsetY()
        let bottomY = textNodes[textNodes.length - 1].y() - textNodes[textNodes.length - 1].offsetY()


        const totalHeight = textNodes.reduce((sum, node) => sum + node.height(), 0);
        const availableSpace = bottomY - topY;
        const spacing = (availableSpace - totalHeight) / (count - 1);
    
        let currentY = topY;
    
        textNodes.forEach(node => {
            const field = this.findField(node.id())
            field.y= currentY + node.offsetY()
            currentY += node.height() + spacing;
        });
        

    }

    groupFields(transformer) {
        const groupId = this.findFirstFreeGroup()
        transformer.nodes().forEach((node) => {
            const field = this.findField(node.id())
            field.group = 'group-' + groupId
        })
    }

    unGroupFields(transformer) {
        const groupId = this.findFirstFreeGroup()
        transformer.nodes().forEach((node) => {
            const field = this.findField(node.id())
            field.group = null
        })
    }

    findFirstFreeGroup() {
        const usedGroups = new Set();
    
        for (const field of this.#fields.values()) {
            const group = field.group;
            if (typeof group === 'string') {
                const match = group.match(/^group-(\d+)$/);
                if (match) {
                    usedGroups.add(Number(match[1]));
                }
            }
        }
    
        let i = 0;
        while (usedGroups.has(i)) {
            i++;
        }
        return i
    }
    
    getGroupedFields(shape) {
        let result = [shape]

        const id = shape.id()
        let field = this.findField(id)
        const group = field.group

        if (group !== null) {
            for (let [fieldName, field] of this.#fields.entries()) {
                if (field.type == 'fields') {
                    if (field.id !== id) {
                        if (field.group === group) {
                            result.push(field.shape)
                        }
                    }
                }
            }            
        }

        return result
    }
    
    clearDirty() {
        for (let [fieldName, field] of this.#fields.entries()) {
            field.dirty = false;
        }
        this.#fieldDeletedAddedDefaultsChanged = false;
    }

    parseConfig() {
        this.#fields = new Map();
        let config = window.oedi.get('config');
        let fields = config.getValue('fields', {});
        for (let index in fields) {
            let newField = new OETEXTFIELD(fields[index], this.#idcounter++);
            newField.dirty = false;
            fields[index].id = newField.id;
            this.#fields.set(newField.id, newField);
        }

        fields = config.getValue('images', {});
        for (let index in fields) {
            let newField = new OEIMAGEFIELD(fields[index], this.#idcounter++);
            newField.dirty = false;
            fields[index].id = newField.id;
            this.#fields.set(newField.id, newField);
        }

        fields = config.getValue('rects', {});
        for (let index in fields) {
            let newField = new OERECTFIELD(fields[index], this.#idcounter++);
            newField.dirty = false;
            fields[index].id = newField.id;
            this.#fields.set(newField.id, newField);
        }
    }

    addField(type, fieldText = 'NEW FIELD', id, format = null, sample = null, image = 'missing',x = 0, y = 0, width = 0, height = 0) {

        if (typeof id === 'undefined' || id === null) {
            id = this.#idcounter++;
        }

        let newField = null;
        switch (type) {
            case 'text':
                var field = {
                    'label': fieldText,
                    'x': 0,
                    'y': 0
                };
                newField = new OETEXTFIELD(field, id);

                if (format !== null) {
                    newField.format = format;
                }

                if (sample !== null) {
                    newField.sample = sample;
                }

                this.#fields.set(newField.id, newField);
                break;
            case 'image':
                var field = {
                    'image': image,
                    'x': 0,
                    'y': 0
                };
                newField = new OEIMAGEFIELD(field, id);
                this.#fields.set(newField.id, newField);
                break;

            case 'rect':
                var field = {
                    'x': x,
                    'y': y,
                    'width': width,
                    'height': height,
                    'strokewidth': 10
                };
                newField = new OERECTFIELD(field, id);
                this.#fields.set(newField.id, newField);
                break;
        }

        // reset x and y for offset
        if (type === 'text' || type === 'image') {
            newField.x = ((newField.shape.width() / 2) + 10) | 0
            newField.y = ((newField.shape.height() / 2) + 10) | 0
        }
        this.#fieldDeletedAddedDefaultsChanged = true;
        return newField.shape;
    }

    findField(searchField) {
        let searchId = null;
        try {
            searchId = searchField.id();
        } catch (error) {
            searchId = searchField;
        }

        let fieldObject = null;
        for (let [fieldName, field] of this.#fields.entries()) {
            if (field.id == searchId) {
                fieldObject = field;
                break;
            }
        }

        return fieldObject;
    }

    findFieldbyLabel(fieldLabel) {
        let fieldObject = null;
        for (let [fieldName, field] of this.#fields.entries()) {
            if (field.label == fieldLabel) {
                fieldObject = field;
                break;
            }
        }

        return fieldObject;
    }

    isFontUsed(fontName) {
        let result = false;
        for (let [fieldName, field] of this.#fields.entries()) {
            if (field.fontname === fontName) {
                result = true;
                break;
            }
        }
        return result;
    }

    switchFontUsed(fontName, switchTo = 'default') {
        let result = false;

        if (switchTo == 'default') {
            switchTo = this.#config.getValue('settings.defaultfont');
        }

        for (let [fieldName, field] of this.#fields.entries()) {
            if (field.fontname == fontName) {
                field.fontname = switchTo;
            }
        }
        return result;
    }

    deleteField(id) {
        this.#fields.delete(id);
        this.#fieldDeletedAddedDefaultsChanged = true;
    }

    defaultsModified() {
        this.#fieldDeletedAddedDefaultsChanged = true;
    }

    updateFieldDefaults() {
        for (let [fieldName, field] of this.#fields.entries()) {
            field.updateDefaults();
        }
    }

    buildJSON() {
        let fields = [];
        let images = [];
        let rects = [];
        let fieldJson = {};

        for (let [fieldName, field] of this.#fields.entries()) {
            fieldJson = field.getJSON();

            if (field instanceof OETEXTFIELD) {
                fields.push(fieldJson);
            }
            if (field instanceof OEIMAGEFIELD) {
                delete fieldJson.src;
                images.push(fieldJson);
            }
            if (field instanceof OERECTFIELD) {
                delete fieldJson.src;
                rects.push(fieldJson);
            }
        }

        let config = window.oedi.get('config');

        config.setValue('fields', fields);
        config.setValue('images', images);
        config.setValue('rects', rects);
    }

    buildTestJSON() {
        let fields = [];
        let fieldJson = {};

        for (let [fieldName, field] of this.#fields.entries()) {
            fieldJson = field.getJSON();

            if (field instanceof OETEXTFIELD) {
                fields.push(fieldJson);
            }
        }

        return fields
    }

    enableTestMode() {
        let config ={
            fields: this.buildTestJSON()
        };
		$.LoadingOverlay('show', {text : 'Calculating field values'});
		let loadingTimer = setTimeout(() => {
            $.LoadingOverlay('text', 'Sorry this is taking longer than expected ...');
        }, 3000);

        $('#oe-test-mode').addClass('red pulse');

        $.ajax({
            type: "POST",
            url: "includes/overlayutil.php?request=Sample",
            data: { 
				overlay: JSON.stringify(config),
			},
            dataType: 'json',
            cache: false,
            context: this
        }).done((data) => {
            $.LoadingOverlay('hide');
            clearTimeout(loadingTimer);
			for (let key in data) {
				let field = this.findField(data[key].id);
				if (field !== null) {
					field.enableTestMode(data[key].label);
				}
			}

        }).fail((jqXHR, textStatus, errorThrown) => {
            console.log("in .fail:  errorThrown=", errorThrown, ", jqXHR=", jqXHR);
        }).always(() => {
            clearTimeout(loadingTimer);
            $.LoadingOverlay('hide');
        });
    }

    disableTestMode() {
        let uiManager = window.oedi.get('uimanager');
        uiManager.testMode = false;
        $('#oe-test-mode').removeClass('red pulse');
		for (let [fieldName, field] of this.#fields.entries()) {
			field.disableTestMode();
		}
    }

}
