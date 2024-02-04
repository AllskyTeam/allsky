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

    buildUI() {
        $.LoadingOverlay('show');

        $.ajax({
            url: 'includes/overlayutil.php?request=Overlays',
            type: 'GET',
            dataType: 'json',
            cache: false,
            async: false,                
            context: this
        }).done((overlays) => {
            let configManager = window.oedi.get('config');
            configManager.overlays = overlays;

            $('#oe-overlay-manager').allskyMM();

            configManager.loadConfig();
            if (1==2) {
                configManager.loadOverlay('overlay.json', 'core');
            } else {
                $(document).trigger('oe-startup');
            }
            $.LoadingOverlay('hide');            
        }); 
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