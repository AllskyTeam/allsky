; (function ($) {

    $.oeImageManager = function (element, options) {


        var defaults = {
            thumbnailURL: '',
            usedImages: [],
            bind: null,
            allowDoubleClick: false,
            validate: null,
            msgInUse: 'This image is in use and cannot be deleted',
            showMaskCreation: false,
            onFoo: function () { }

        }

        var plugin = this;
        plugin.settings = {}

        var $element = $(element);

        plugin.prefix = 'id-' + Math.random().toString(36).substr(2, 6);

        plugin.dialogId = plugin.prefix+ "-oe-image-manager-dialog";
        plugin.ddId = plugin.prefix+ "-oe-image-manager-dd";
        plugin.addId = plugin.prefix + "-oe-image-manager-add";
        plugin.deleteId = plugin.prefix+ "-oe-image-manager-delete";
        plugin.imagesId = plugin.prefix + "-oe-image-manager-images";
        plugin.imageManagerId = plugin.prefix+ "-oe-image-manager";
        plugin.maskCreateId = plugin.prefix+ "-oe-image-manager-mask-create";

        plugin.element = element; 


        plugin.init = function () {

            plugin.settings = $.extend({}, defaults, options);

            let nav = `<div id="${plugin.imageManagerId}">
                    <nav class="navbar navbar-default">
                    <div class="container-fluid">
                        <div class="collapse navbar-collapse" id="oe-main-navbar">
                            <ul class="nav navbar-nav">
                                <li>
                                    <div class="tooltip-wrapper disabled" data-toggle="tooltip" data-container="body" data-placement="top" title="Add Selected Image">
                                        <div class="btn btn-lg navbar-btn disabled" id="${plugin.addId}"><i class="fa-solid fa-image text-success fa-xl"></i></div>
                                    </div>
                                </li>
                                <li>
                                    <div class="tooltip-wrapper disabled" data-toggle="tooltip" data-container="body" data-placement="top" title="Delete The Selected Image">
                                        <div class="btn btn-lg navbar-btn disabled" id="${plugin.deleteId}"><i class="fa-solid fa-trash text-danger fa-xl"></i></div>
                                    </div>
                                </li>
                            </ul>
                            <ul class="nav navbar-nav navbar-right">
                            </ul>
                        </div>
                    </div>
                </nav>
                <div class="oe-image-manager-images" id="${plugin.imagesId }">
                </div>
                </div>
                <div class="dropzone" id="${plugin.ddId}">
                </div>
                <div id="dz-error-message">
                </div>`

            let maskHTML = '';
            if (plugin.settings.showMaskCreation) {
                maskHTML = `<button type="button" class="btn btn-primary" id="${plugin.maskCreateId}">Create Mask</button>`;
            }

            let imageManagerDialog = `
                <div class="modal oe-image-manager-dialog" role="dialog" id="${plugin.dialogId}">
                    <div class="modal-dialog modal-lg" role="document">
                        <div class="modal-content">
                            <div class="modal-header">
                                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                                <h4 class="modal-title">Image Manager</h4>
                            </div>
                            <div class="modal-body">
                                <div id="module-image-manager">${nav}</div>
                            </div>
                            <div class="modal-footer">
                                ${maskHTML}
                                <button type="button" class="btn btn-success" id="module-file-manager-dialog-close" data-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('.oe-image-manager-dialog').remove();
            $(document.body).append(imageManagerDialog);

            $(`#${plugin.dialogId}`).on('shown.bs.modal', () => {
                $(`#${plugin.maskCreateId}`).off('click').on('click', (event) => {
                    $(document).allskyMASK({
                        onComplete: () => {
                            loadThumbnails();
                        }
                    });
                });

                let dropzoneObj = new Dropzone(`#${plugin.ddId}`, {
                    url: plugin.settings.thumbnailURL,
                    maxFilesize: 100,
                    acceptedFiles: 'image/png, image/jpeg',
                    headers: {
                        "X-CSRF-Token": window.csrfToken
                    },
                    init: function() {
                        this.on('queuecomplete', () => {
                            loadThumbnails()
                        })

                        this.on('processing', function(file) {
                            $("#dz-error-message").text('')
                        })
                        
                        this.on("error", function (file, message, xhr) {
                            if (xhr && xhr.responseText) {
                            message = xhr.responseText
                            }
                            $("#dz-error-message").text(message)                
                        })
                    }                
                });
            });

            $(`#${plugin.dialogId}`).off('hidden.bs.modal')
            $(`#${plugin.dialogId}`).on('hidden.bs.modal', function() {
                $(this).remove();
                $('.modal-backdrop').remove();
                $('body').removeClass('modal-open');                      
                $(document).data('oeImageManager').destroy();
            });                    

            $(`#${plugin.dialogId}`).modal({
                keyboard: false
            }); 

            $(document).off('oe-imagemanager-add')
            $(document).on('oe-imagemanager-add', (event, image) => {
                $(`#${plugin.dialogId}`).modal('hide')
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
        }

        plugin.destroy = function () {
            $('#' + plugin.imagesId).off('click');
            $('#' + plugin.imageManagerId).remove();
            $(plugin.element).removeData('oeImageManager');
        }

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
                        if (validateMask(imageName)) {
                            if (plugin.settings.bind !== null) {
                                $(plugin.settings.bind).val(imageName);
                                $(document).trigger('oe-imagemanager-add', [imageName]);
                            } else {
                                $(document).trigger('oe-imagemanager-add', [imageName]);
                            }
                        }    
                    });
                }

            }).fail((jqXHR, textStatus, errorThrown) => {
            });            
        }

        var validateMask = function(filename) {
            let result = true

            if (plugin.settings.validate !== null) {

                $('body').LoadingOverlay('show', {
                    background: 'rgba(0, 0, 0, 0.5)',
                    imageColor: '#a94442',
                    textColor: '#a94442',
                    text: 'Validating Image'
                });  

                $.ajax({
                    url: plugin.settings.validate,
                    type: 'POST',
                    data: {
                        filename: filename
                    },
                    dataType: 'json',
                    cache: false                
                }).done((result) => {
                    if (result.error) {
                        bootbox.dialog({
                            title: 'Error validating image',
                            message: result.message,
                            size: 'large',
                            buttons: {
                                ok: {
                                    label: 'Ok',
                                    className: 'btn-success'
                                }
                            }
                        });
                    }
                }).fail((result) => {

                }).always(() => {
                    $('body').LoadingOverlay('hide')
                })
            }

            return result
        }

        plugin.init();

    }

    $.fn.oeImageManager = function (options) {
        return this.each(function () {
            if (undefined == $(this).data('oeImageManager')) {
                var plugin = new $.oeImageManager(this, options);
                $(this).data('oeImageManager', plugin);
            }
        });
    }

})(jQuery);
