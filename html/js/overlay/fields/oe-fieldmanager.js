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

    clearDirty() {
        for (let [fieldName, field] of this.#fields.entries()) {
            field.dirty = false;
        }
        this.#fieldDeletedAddedDefaultsChanged = false;
    }

    async parseConfig() {
        let config = window.oedi.get('config');
        let fields = config.getValue('fields', {});
        for (let index in fields) {
            let newField = new OETEXTFIELD(fields[index], this.#idcounter++);
            fields[index].id = newField.id;
            this.#fields.set(newField.id, newField);
        }

        fields = config.getValue('images', {});
        for (let index in fields) {
            let newField = new OEIMAGEFIELD(fields[index], this.#idcounter++);
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

    enableTestMode() {
        let loadingTimer = setTimeout(() => {
            $.LoadingOverlay('show', {text : 'Sorry this is taking longer than expected ...'});
        }, 1000);

        $('#oe-test-mode').addClass('red pulse');

        $.ajax({
            type: "POST",
            url: "includes/overlayutil.php?request=Sample",
            data: { config: JSON.stringify(this.#config.config) },
            dataType: 'json',
            cache: false,
            context: this
        }).done((data) => {
            $.LoadingOverlay('hide');
            clearTimeout(loadingTimer);
            for (let key in data) {
                let field = this.findField(key);
                if (field !== null) {
                    field.enableTestMode(data[key]);
                }
            }
        }).fail((jqXHR, textStatus, errorThrown) => {
            // TODO
        }).always(() => {
            clearTimeout(loadingTimer);
            $.LoadingOverlay('hide');
        });

    }

    disableTestMode() {
        $('#oe-test-mode').removeClass('red pulse');
        let dataFields = this.#config.dataFields;
        for (let dataField in dataFields) {
            for (let [fieldName, field] of this.#fields.entries()) {
                field.disableTestMode();
            }
        }
    }

}