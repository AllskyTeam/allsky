; (function ($) {

    $.oeImageManager = function (element, options) {


        var defaults = {
            thumbnailURL: '',
            usedImages: [],
            bind: null,
            allowDoubleClick: false,
            msgInUse: 'This image is in use and cannot be deleted',
            // if your plugin is event-driven, you may provide callback capabilities
            // for its events. execute these functions before or after events of your 
            // plugin, so that users may customize those particular events without 
            // changing the plugin's code
            onFoo: function () { }

        }

        var plugin = this;

        // this will hold the merged default, and user-provided options
        // plugin's properties will be available through this object like:
        // plugin.settings.propertyName from inside the plugin or
        // element.data('pluginName').settings.propertyName from outside the plugin, 
        // where "element" is the element the plugin is attached to;
        plugin.settings = {}

        var $element = $(element); // reference to the jQuery version of DOM element

        plugin.ddId = element.id + "-oe-image-manager-dd";
        plugin.addId = element.id + "-oe-image-manager-add";
        plugin.deleteId = element.id + "-oe-image-manager-delete";
        plugin.imagesId = element.id + "-oe-image-manager-images";
        plugin.imageManagerId = element.id + "-oe-image-manager";

        plugin.element = element;    // reference to the actual DOM element

        // the "constructor" method that gets called when the object is created
        plugin.init = function () {

            // the plugin's final properties are the merged default and 
            // user-provided options (if any)
            plugin.settings = $.extend({}, defaults, options);

            let nav = '<div id="' + plugin.imageManagerId + '">\
                    <nav class="navbar navbar-default">\
                    <div class="container-fluid">\
                        <div class="collapse navbar-collapse" id="oe-main-navbar">\
                            <ul class="nav navbar-nav">\
                                <li>\
                                    <div class="tooltip-wrapper disabled" data-toggle="tooltip" data-container="body" data-placement="top" title="Add selected image">\
                                        <div class="btn btn-lg navbar-btn disabled" id="' + plugin.addId + '"><i class="fa-solid fa-image"></i></div>\
                                    </div>\
                                </li>\
                                <li> \
                                    <div class="tooltip-wrapper disabled" data-toggle="tooltip" data-container="body" data-placement="top" title="Delete The Selected Image">\
                                        <div class="btn btn-lg navbar-btn disabled" id="' + plugin.deleteId + '"><i class="fa-solid fa-trash"></i></div>\
                                    </div>\
                                </li>\
                            </ul>\
                            <ul class="nav navbar-nav navbar-right">\
                            </ul>\
                        </div>\
                    </div>\
                </nav>\
                <div class="oe-image-manager-images" id="' + plugin.imagesId + '">\
                </div>\
                </div>\
                <div class="dropzone" id="' + plugin.ddId + '">\
                </div>';
            $(plugin.element).html(nav);

            let myDropzone = new Dropzone('div#' + plugin.ddId, {
                url: plugin.settings.thumbnailURL,
                maxFilesize: 100,
                acceptedFiles: 'image/png, image/jpeg',
                init: function() {
                    this.on('queuecomplete', () => {
                        loadThumbnails();
                    });
                }                
            });

            loadThumbnails();

            $('#' + plugin.imageManagerId).on('click', '#' + plugin.deleteId, (event) => {
                let selected = $('#' + plugin.imagesId + ' .oe-image-manager-image-selected');
                let fileName = $(selected).data('filename');
                if (confirm('Are you sure you wish to delete this image (' + fileName + ') ?')) {
                    $.ajax({
                        url: 'includes/overlayutil.php?request=Image&imageName=' + fileName,
                        type: 'DELETE',
                        context: this
                    }).done((result) => {
                        let selected = $('#' + plugin.imagesId + ' .oe-image-manager-image-selected');
                        $(selected).remove();
                        updateToolbar();
                    }).fail((jqXHR, textStatus, errorThrown) => {
                    });
                }
            });

            $('#' + plugin.imageManagerId).on('click', '#' + plugin.addId, (event) => {
                let selected = $('#' + plugin.imagesId + ' .oe-image-manager-image-selected');
                let fileName = $(selected).data('filename');
                if (plugin.settings.bind !== null) {
                    $(plugin.settings.bind).val(fileName);
                    $(document).trigger('oe-imagemanager-add', [fileName]);
                } else {
                    $(document).trigger('oe-imagemanager-add', [fileName]);
                }
            });
            

            // code goes here
            // Build UI - Elements
            // Fire ajax request to load thumbnails
            // Display Thumbnails
            //

        }

        // public methods
        // these methods can be called like:
        // plugin.methodName(arg1, arg2, ... argn) from inside the plugin or
        // element.data('pluginName').publicMethod(arg1, arg2, ... argn) from outside 
        // the plugin, where "element" is the element the plugin is attached to;

        // a public method. for demonstration purposes only - remove it!
        plugin.destroy = function () {
            $('#' + plugin.imagesId).off('click');
            $('#' + plugin.imageManagerId).remove();
            $(plugin.element).removeData('oeImageManager');
        }

        // private methods
        // these methods can be called only from inside the plugin like:
        // methodName(arg1, arg2, ... argn)

        // a private method. for demonstration purposes only - remove it!
        var updateToolbar = function () {

            let selected = $('.oe-image-manager-image').hasClass('oe-image-manager-image-selected');

            if (selected) {
                $('#' + plugin.deleteId).removeClass('disabled');
                $('#' + plugin.addId).removeClass('disabled');
            } else {
                $('#' + plugin.deleteId).addClass('disabled');
                $('#' + plugin.addId).addClass('disabled');
            }

        }

        var loadThumbnails = function() {
            $.ajax({
                url: plugin.settings.thumbnailURL,
                type: 'GET',
                dataType: 'json',
                cache: false,
                context: this
            }).done((result) => {
                $('#' + plugin.imagesId).off('click');
                $('#' + plugin.imagesId).empty();
                for (let i = 0; i < result.length; i++) {
                    let imageURL = result[i].thumbnailurl;
                    let imageName = result[i].filename;
                    let imageID = 'oe-image-manager-image-' + i;
                    let imageHTML = '<div class="oe-image-manager-image" id="' + imageID + '" data-filename="' + imageName + '"><img src="' + imageURL + '"><p title="' + imageName + '">' + imageName + '</p></div>';
                    $('#' + plugin.imagesId).append(imageHTML);
                    if (plugin.settings.usedImages.includes(imageName)) {
                        $('#' + imageID).css('opacity', '.2');
                        $('#' + imageID).prop('title', plugin.settings.msgInUse);
                    }
                }

                $('#' + plugin.imagesId).on('click', '.oe-image-manager-image', (event) => {
                    let imageName = $(event.currentTarget).data('filename');
                    if (!plugin.settings.usedImages.includes(imageName)) {
                        if ($(event.currentTarget).hasClass('oe-image-manager-image-selected')) {
                            $(event.currentTarget).removeClass('oe-image-manager-image-selected');
                        } else {
                            $('.oe-image-manager-image').removeClass('oe-image-manager-image-selected');
                            $(event.currentTarget).addClass('oe-image-manager-image-selected');
                        };
                        updateToolbar();
                    }
                });

                if (plugin.settings.allowDoubleClick) {
                    $('#' + plugin.imagesId).on('dblclick', '.oe-image-manager-image', (event) => {
                        let imageName = $(event.currentTarget).data('filename');
                        if (plugin.settings.bind !== null) {
                            $(plugin.settings.bind).val(imageName);
                            $(document).trigger('oe-imagemanager-add', [imageName]);
                        } else {
                            $(document).trigger('oe-imagemanager-add', [imageName]);
                        }                        
                    });
                }

            }).fail((jqXHR, textStatus, errorThrown) => {
            });            
        }
        // fire up the plugin!
        // call the "constructor" method
        plugin.init();

    }

    // add the plugin to the jQuery.fn object
    $.fn.oeImageManager = function (options) {

        // iterate through the DOM elements we are attaching the plugin to
        return this.each(function () {

            // if plugin has not already been attached to the element
            if (undefined == $(this).data('oeImageManager')) {

                // create a new instance of the plugin
                // pass the DOM element and the user-provided options as arguments
                var plugin = new $.oeImageManager(this, options);

                // in the jQuery version of the element
                // store a reference to the plugin object
                // you can later access the plugin and its methods and properties like
                // element.data('pluginName').publicMethod(arg1, arg2, ... argn) or
                // element.data('pluginName').settings.propertyName
                $(this).data('oeImageManager', plugin);

            }

        });

    }

})(jQuery);