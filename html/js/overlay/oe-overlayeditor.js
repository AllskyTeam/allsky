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
        this.#checkResolution();
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
            if (!$('#oe-overlay-manager').data("allskyMM").enabled()) {
                configManager.loadOverlay('overlay.json', 'core');
            } else {
                $(document).trigger('oe-startup');
            }
            $.LoadingOverlay('hide');            
        }); 
    }

    #checkResolution() {
        var width = window.innerWidth;
        var height = window.innerHeight;

        if (width < 1024 || height < 768) {
            bootbox.alert({
                title: 'Overlay Editor Warning',
                message: 'Your screen resolution (' + width + 'x' + height + ') is below the recommened resolution for the overlay editor. You may continue to use the overlay editor but some functions may not be useable.'
            });
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