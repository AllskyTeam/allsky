"use strict";
class OVERLAYEDITOR {
    #container = "";

    constructor(container, image) {
        this.#container = container;

        this.#addDiContainer();

        let config = new OECONFIG();
        window.oedi.add('config', config);
        let fieldManager = new OEFIELDMANAGER();
        window.oedi.add('fieldmanager', fieldManager);
        let uiManager = new OEUIMANAGER(image);
        window.oedi.add('uimanager', uiManager);
        window.oedi.add('BASEDIR', 'overlay/');    
        window.oedi.add('IMAGEDIR', 'overlay/images/');       
    }

    async #loadFonts() {
        let config = window.oedi.get('config');
        let fonts = config.getValue('fonts', {});
        for (let font in fonts) {
            let fontData = config.getValue('fonts.' + font, {});

            let fontFace = new FontFace(font, 'url(' + window.oedi.get('BASEDIR') + fontData.fontPath + ')');
            await fontFace.load();
            document.fonts.add(fontFace);
        }
    }

    async buildUI() {
        $.LoadingOverlay('show');
        if (await window.oedi.get('config').loadConfig()) {
            await this.#loadFonts();

            window.oedi.get('fieldmanager').parseConfig();
            window.oedi.get('uimanager').buildUI();
            $.LoadingOverlay('hide');
        }        
    }

    /**
     * A DI container for the overlay editor. This reduces a lot of issues with scope in 3rd party
     * libraries.
     */
    #addDiContainer() {
        window.oedi = {
            dependencies: {},
            add: function(qualifier, obj) {
                this.dependencies[qualifier] = obj;
            },
            get: function(qualifier) {
                return this.dependencies[qualifier];
            }
        };

    }

}