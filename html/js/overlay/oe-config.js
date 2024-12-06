"use strict";
class OECONFIG {

    #config = {};
    #appConfig = {};
    #dataFields = {};
    #overlayDataFields = {};
    #selectedOverlay = {
        type: null,
        name: null
    };
    #BASEDIR = 'annotater/';
    #dirty = false;
    #overlays = {};

    #lastConfig = [];

    constructor() {
    }

    get selectedOverlay() {
        return this.#selectedOverlay;
    }

    get overlays() {
        return this.#overlays;
    }
    set overlays(value) {
        this.#overlays = value;
    }

    get dirty() {
        return this.#dirty;
    }
    set dirty(value) {
        this.#dirty = value;
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

    loadOverlays() {
        $.ajax({
            url: 'includes/overlayutil.php?request=Overlays',
            type: 'GET',
            dataType: 'json',
            cache: false,
            async: false,                
            context: this
        }).done((overlays) => {
            this.overlays = overlays;
        }); 
    }

    loadConfig() {
        try {
            let result = $.ajax({
                type: "GET",
                url: "includes/overlayutil.php?request=Configs",
                data: "",
                dataType: 'json',
                cache: false,
                async: false,
                context: this,
                success: function (result) {
                    this.#config = result.config
                    this.#dataFields = result.data;
                    this.#overlayDataFields = result.overlaydata;
                    this.#appConfig = result.appconfig;
                }                
            });
        } catch (error) {
            confirm('A fatal error has occureed loading the application configuration.')
            return false;
        }            
    }

    loadOverlay(overlay, type) {
        this.#selectedOverlay.type = type;
        this.#selectedOverlay.name = overlay;
        try {
            let result = $.ajax({
                type: "GET",
                url: "includes/overlayutil.php?request=LoadOverlay&overlay=" + overlay,
                data: "",
                dataType: 'json',
                cache: false,
                async: false,
                context: this,
                success: function (result) {    
                    this.#config = result;
  
                    let fontList = Array.from(document.fonts);
                    for (let i in fontList) {
                        document.fonts.delete(fontList[i]);
                    }

                    const promises = [];
                    let fonts = this.getValue('fonts', {});
                    for (let font in fonts) {
                        let fontData = this.getValue('fonts.' + font, {});
                        let fontFace = new FontFace(font, 'url(' + window.oedi.get('BASEDIR') + fontData.fontPath + ')');
                        promises.push(
                            fontFace.load()
                        );
                    }

                    Promise.all(promises).then(function(loadedFonts) {
                        for (let font in loadedFonts) {
                            document.fonts.add(loadedFonts[font]);
                        }
                        window.oedi.get('uimanager').buildUI();
                    });

                    $(document).trigger('oe-overlay-loaded', {
                        overlay: this.#selectedOverlay
                    });
                    this.dirty = false;                
                },
                error: function(xHR, Status, error) {
                    if (xHR.responseText.length === 0) {
                        /**
                         * Something has gone badly wrong - The active overlay doesnt exist so we will set the active
                         * overlay to the defaulf for the camera then redirect the user back to the overlay manager
                         * which will hopefully fix that issue
                         */
                        alert(' The active overlay does not exist, was it deleted? The active overlay will be reset to the default for your camera.\n\nPlease click OK to continue');
                        
                        let defaultOverlay = 'overlay-ZWO.json';
                        if (this.overlays !== undefined) {
                            if (this.overlays.brand !== undefined) {
                                defaultOverlay = 'overlay-' + this.overlays.brand + '.json';
                            }
                        }

                        let result = $.ajax({
                            type: 'POST',
                            url: 'includes/overlayutil.php?request=SaveSettings',
                            data: {
                                daytime: defaultOverlay,
                                nighttime: defaultOverlay
                            },
                            dataType: 'json',
                            cache: false,
                            async: false
                        });
                        location.reload();
                    }
                }                
            });
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

    get gridColour() {
        let colour = '#ffffff'
        if (this.#appConfig.hasOwnProperty('gridColour')) {
            colour = this.#appConfig.gridColour;
        }
        return colour;
    }
    set gridColour(colour) {
        this.#appConfig.gridColour = colour;
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

    get overlayErrors() {
        return this.#appConfig.overlayErrors;
    }
    set overlayErrors(overlayErrors) {
        return this.#appConfig.overlayErrors = overlayErrors;
    }

    get overlayErrorsText() {
        return this.#appConfig.overlayErrorsText;
    }
    set overlayErrorsText(overlayErrorsText) {
        return this.#appConfig.overlayErrorsText = overlayErrorsText;
    }

    getMetaField(field) {
        let result = null;

        if (this.#config.metadata !== undefined) {
            if (this.#config.metadata[field] !== undefined) {
                result = this.#config.metadata[field];
            }
        }
        return result;
    }

    setMetaField(field, value) {
        if (this.#config.metadata === undefined) {
            this.#config.metadata = {};
        }
        this.#config.metadata[field] = value;
        this.dirty = true;
    }

    backupConfig() {
        this.#lastConfig= JSON.parse(JSON.stringify(this.#config));
    }

    saveFields() {
        try {
            $.ajax({
                type: 'POST',
                url: 'includes/overlayutil.php?request=Data',
                data: { data: JSON.stringify(this.#dataFields) },
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

        for (let i = 0; i < this.#dataFields.data.length; i++) {
            if (this.#dataFields.data[i].id == id) {
                result = i;
                break;
            }
        }

        if (result !== null) {
            this.#dataFields.data = this.#dataFields.data.filter(function (element) {
                return element.id != id;
            });
        }
        return result;
    }

    findAllFieldsById(id) {
        let result = null;

        for (let i = 0; i < this.#overlayDataFields.data.length; i++) {
            if (this.#overlayDataFields.data[i].id == id) {
                result = this.#overlayDataFields.data[i];
                break;
            }
        }
        return result;
    }

    findFieldById(id) {
        let result = null;

        for (let i = 0; i < this.#dataFields.data.length; i++) {
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

    saveConfig() {
        debugger;
        /*
        result =  $.ajax({
            type: 'POST',
            url: 'includes/overlayutil.php?request=Config',
            data: { config: JSON.stringify(this.#config) },
            async: false,
            dataType: 'json',
            cache: false
        });*/
    }

    saveConfig1() {
        $.ajax({
            type: 'POST',
            url: 'includes/overlayutil.php?request=Config',
            data: {
                overlay: this.#selectedOverlay,
                config: JSON.stringify(this.#config)
            },
            cache: false
        }).done(function() {
        }).fail(function() {
            bootbox.alert('Failed to save the overlay config. Please check the permissions on the ~/allsky/config/overlay/config/overlay.json file');
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

    getBackupValue(path, defaultValue) {
        return path.split('.').reduce((o, p) => o ? o[p] : defaultValue, this.#lastConfig);
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