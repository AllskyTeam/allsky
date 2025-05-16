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
        transformer.nodes([]);
        for (let [fieldName, field] of this.#fields.entries()) {
            if (field.type == 'fields') {
                const isIntersecting = Konva.Util.haveIntersection(selectionRect, field.shape.getClientRect());

                if (isIntersecting) {
                    const oldNodes = transformer.nodes();
                    const newNodes = oldNodes.concat([field.shape]);
                    transformer.nodes(newNodes);
                }
            }
        }
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

        const count = textNodes.length;
        if (count === 0) return;
    
        const totalHeight = textNodes.reduce((sum, node) => sum + node.height(), 0);
        const availableSpace = bottomY - topY;
        const spacing = (availableSpace - totalHeight) / (count - 1);
    
        let currentY = topY;
    
        textNodes.forEach(node => {
            // Account for offsetY
            node.y(currentY + node.offsetY());
            currentY += node.height() + spacing;
        });
        

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
    }

    addField(type, fieldText = 'NEW FIELD', id, format = null, sample = null, image = 'missing') {

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
        }

        // reset x and y for offset
        newField.x = ((newField.shape.width() / 2) + 10) | 0;
        newField.y = ((newField.shape.height() / 2) + 10) | 0;
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
        let fieldJson = {};

        for (let [fieldName, field] of this.#fields.entries()) {
            fieldJson = field.getJSON();

            if (field instanceof OETEXTFIELD) {
                fields.push(fieldJson);
            } else {
                delete fieldJson.src;
                images.push(fieldJson);
            }
        }

        let config = window.oedi.get('config');

        config.setValue('fields', fields);
        config.setValue('images', images);
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
