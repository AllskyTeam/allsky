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
        let loadingTimer = setTimeout(() => {
            $.LoadingOverlay('show', {text : 'Sorry this is taking longer than expected ...'});
        }, 1000);

        $('#oe-test-mode').addClass('red pulse');

        $.ajax({
            type: "POST",
            //url: "includes/overlayutil.php?request=Sample",
            url: "cgi-bin/format.py",
            data: { config: JSON.stringify(config), fields: JSON.stringify(this.#config.dataFields) },
            dataType: 'json',
            cache: false,
            context: this
        }).done((data) => {
            $.LoadingOverlay('hide');
            clearTimeout(loadingTimer);
// console.log("data", data);
            if (data.result === "OK") {
                for (let key in data.fields) {
                    let field = this.findField(key);
                    if (field !== null) {
                        field.enableTestMode(data.fields[key]);
                    }
                }
            } else {
                this.disableTestMode();
                var msg;
                if (data.result === "LEGACY_MODE") {
                    msg = 'The WebUI "Overlay Method" setting is set to "legacy" so overlays will not work.';
                } else if (data.result === "FILE_MISSING") {
                    msg = 'Error generating sample data. Missing file: ' + data.missingFile + ',  Try later';
                } else {    // should be data.result == "ERROR"
                    msg = 'Error generating sample data: ' + data.error;
                }
                bootbox.alert(msg);
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
        let dataFields = this.#config.dataFields;
        for (let dataField in dataFields) {
            for (let [fieldName, field] of this.#fields.entries()) {
                field.disableTestMode();
            }
        }
    }

}
