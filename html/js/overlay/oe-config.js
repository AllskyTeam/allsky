"use strict";
class OECONFIG {

    #config = {};
    #appConfig = {};
    #dataFields = {};
    #overlayDataFields = {};
    #BASEDIR = 'annotater/';

    constructor() {
    }

    get config() {
        return this.#config;
    }
    set config(config) {
        this.#config = config;
    }

    get appConfig() {
        return this.#appConfig;
    }

    /**
     * 
     * Loads a configuration(s)
     * 
     * @returns 
     */
    async loadConfig() {
        let result;

        try {
            result = await $.ajax({
                type: "GET",
                url: "includes/overlayutil.php?request=Config",
                data: "",
                dataType: 'json',
                cache: false
            });

            this.#config = result;
            if (this.validateConfig()) {

                result = await $.ajax({
                    type: "GET",
                    url: "includes/overlayutil.php?request=Data",
                    data: "",
                    dataType: 'json',
                    cache: false
                });
                this.#dataFields = result;

                result = await $.ajax({
                    type: "GET",
                    url: "includes/overlayutil.php?request=OverlayData",
                    data: "",
                    dataType: 'json',
                    cache: false
                });
                this.#overlayDataFields = result;

                this.#appConfig = await $.ajax({
                    type: "GET",
                    url: "includes/overlayutil.php?request=AppConfig",
                    data: "",
                    dataType: 'json',
                    cache: false
                });

                return true;
            } else {
                return false;
            }

        } catch (error) {
            confirm('A fatal error has occureed loading the application configuration.')
            return false;
        }
    }

    get gridVisible() {
        return this.#appConfig.gridVisible;
    }
    set gridVisible(state) {
        this.#appConfig.gridVisible = state;
    }

    get gridSize() {
        return this.#appConfig.gridSize;
    }
    set gridSize(size) {
        this.#appConfig.gridSize = parseInt(size);
    }

    get gridOpacity() {
        return this.#appConfig.gridOpacity;
    }
    set gridOpacity(opacity) {
        this.#appConfig.gridOpacity = parseFloat(opacity);
    }

    get snapBackground() {
        return this.#appConfig.snapBackground;
    }
    set snapBackground(state) {
        this.#appConfig.snapBackground = state;
    }

    get addListPageSize() {
        return this.#appConfig.addlistpagesize;
    }
    set addListPageSize(size) {
        this.#appConfig.addlistpagesize = parseInt(size);
    }

    get addFieldOpacity() {
        return this.#appConfig.addfieldopacity;
    }
    set addFieldOpacity(opacity) {
        this.#appConfig.addfieldopacity = parseInt(opacity);
    }

    get selectFieldOpacity() {
        return this.#appConfig.selectfieldopacity;
    }
    set selectFieldOpacity(opacity) {
        this.#appConfig.selectfieldopacity = parseInt(opacity);
    }

    get mouseWheelZoom() {
        return this.#appConfig.mousewheelzoom;
    }
    set mouseWheelZoom(state) {
        this.#appConfig.mousewheelzoom = state;
    }

    get backgroundImageOpacity() {
        return this.#appConfig.backgroundopacity;
    }
    set backgroundImageOpacity(opacity) {
        this.#appConfig.backgroundopacity = parseInt(opacity);
    }

    get allDataFields() {
        return this.#overlayDataFields.data;
    }

    get dataFields() {
        return this.#dataFields.data;
    }
    set dataFields(dataFields) {
        return this.#dataFields = dataFields;
    }

    saveFields() {
        try {
            $.ajax({
                type: 'POST',
                url: 'includes/overlayutil.php?request=Data',
                data: { data: JSON.stringify( this.#dataFields)},
                dataType: 'json',
                cache: false
            });
        } catch (error) {
            console.log(error); // TODO: Daal with corrupt config
            return false;
        }
    }

    findFieldByName(name) {
        let result = null;

        for (let key in this.#dataFields.data) {
            if (this.#dataFields.data[key].name === name) {
                result = this.#dataFields.data[key];
                break;
            }
        }
        return result;
    }

    addField(field) {
        this.#dataFields.data.push(field);
    }

    deletefieldById(id) {
        let result = null;

        for(let i = 0; i < this.#dataFields.data.length; i++) {
            if (this.#dataFields.data[i].id == id) {
                result = i;
                break;
            }
        }

        if (result !== null) {
            this.#dataFields.data = this.#dataFields.data .filter(function(element){ 
                return element.id != id; 
            });
        }
        return result;
    }

    findAllFieldsById(id) {
        let result = null;

        for(let i = 0; i < this.#overlayDataFields.data.length; i++) {
            if (this.#overlayDataFields.data[i].id == id) {
                result = this.#overlayDataFields.data[i];
                break;
            }
        }
        return result;
    }

    findFieldById(id) {
        let result = null;

        for(let i = 0; i < this.#dataFields.data.length; i++) {
            if (this.#dataFields.data[i].id == id) {
                result = this.#dataFields.data[i];
                break;
            }
        }
        return result;
    }

    saveSettings() {
        try {
            $.ajax({
                type: 'POST',
                url: 'includes/overlayutil.php?request=AppConfig',
                data: { settings: JSON.stringify(this.#appConfig) },
                dataType: 'json',
                cache: false
            });
        } catch (error) {
            console.log(error); // TODO: Daal with corrupt config
            return false;
        }
    }

    async saveConfig() {
        result = await $.ajax({
            type: 'POST',
            url: 'includes/overlayutil.php?request=Config',
            data: { config: JSON.stringify(this.#config) },
            dataType: 'json',
            cache: false
        });
    }

    saveConfig1() {
        $.ajax({
            type: 'POST',
            url: 'includes/overlayutil.php?request=Config',
            data: { config: JSON.stringify(this.#config) },
            dataType: 'json',
            cache: false
        });
    }

    /**
     * TODO: Validate config
     * 
     * @returns Validate the loaded config file
     */
    validateConfig() {
        return true;
    }

    /**
     * 
     * Get a value from the config file using dot notation and of not found return a default value.
     * 
     *      "exposure": {
     *          "label": "Exposure: ${exposure}",
     *          "fontcolour": "blue",
     *          "font": "led",
     *          "position" : {
     *              "x": 10,
     *              "y": 50
     *          }            
     *       },
     *
     * passing path as 'exposure.position.x' will return 10
     * 
     * @param {*} path The path to the value to be returned
     * @param {*} defaultValue Default value if the path does not exist
     * 
     * @returns {*} the result !
     */
    getValue(path, defaultValue) {
        return path.split('.').reduce((o, p) => o ? o[p] : defaultValue, this.#config);
    }

    /**
     * 
     * Sets a value givena a path, see 'getValue' for details of how the path works
     * 
     * @param {*} path The path to the value to be set
     * @param {*} value The value to be set
     * 
     * @returns 
     */
    setValue(path, value) {
        return path.split('.').reduce((o, p, i) => o[p] = path.split('.').length === ++i ? value : o[p] || {}, this.#config);
    }

    /**
     * 
     * Deletes a value specified by the path
     * 
     * @param {*} path 
     * @returns 
     */
    deleteValue(path) {
        let currentObject = this.#config
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

}