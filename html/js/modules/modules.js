"use strict";
class MODULESEDITOR {

    #configData = null;
    #dirty = false;
    #configName = null;
    #settings = null;
    #first = true;

    constructor() {

    }

    #buildUI() {
        $.LoadingOverlay('show');

        $('#modules-available').sortable('destroy');
        $('#modules-selected').sortable('destroy');
        $('#modules-available').empty();
        $('#modules-selected').empty();

        this.#dirty = false;
        this.#updateToolbar();

        this.#configName = $("#module-editor-config option").filter(":selected").val();
       
        $.ajax({
            url: 'includes/moduleutil.php?request=ModuleBaseData',
            type: 'GET',
            dataType: 'json',
            cache: false,
            context: this
        }).done((result) => {
            this.#settings = result;

            if (this.#first) {
                if (this.#settings.tod !== undefined) {
                    this.#configName = this.#settings.tod;
                    $('#module-editor-config option[value="' + this.#configName + '"]').attr("selected", "selected"); 
                }
                this.#first = false;
            }
            $.ajax({
                url: 'includes/moduleutil.php?request=Modules&config=' + this.#configName,
                type: 'GET',
                dataType: 'json',
                cache: false,
                context: this
            }).done((result) => {
                this.#configData = result;
                this.#addModules(this.#configData.available, '#modules-available')
                this.#addModules(this.#configData.selected, '#modules-selected')

                $(document).on('click', '#module-help', (event) => {
                    $('#app-module-helpdialog').dialog({
                        width: 1024,
                        height: 800,
                        open: function (event, ui) {
                            $('#app-module-helptext').load('/help/modules/modules.html?dt' + (new Date()).valueOf(), function () {
                            });
                        }
                    });
                });                

                $(document).on('click', '.module-delete-button', (event) => {
                    if (this.#dirty) {
                        bootbox.alert('Please save the current configuration before deleting the module');
                    } else {
                        $.LoadingOverlay('show');
                        
                        let module = $(event.target).data('module');
                        $.ajax({
                            url: 'includes/moduleutil.php?request=Modules&module=' + module,
                            type: 'DELETE',
                            cache: false,
                            context: this
                        }).done((result) => {
                            this.#buildUI();
                        }).always(() => {
                            $.LoadingOverlay('hide');
                        });              
                    }
                });

                $(document).on('click', '.module-enable', (event) => {
                    let module = $(event.target).data('module');
                    let state = $(event.target).is(':checked');

                    for (let key in this.#configData.selected) {
                        if (this.#configData.selected[key].module == module) {
                            this.#configData.selected[key].enabled = state;
                        }
                    }
                    for (let key in this.#configData.available) {
                        if (this.#configData.available[key].module == module) {
                            this.#configData.available[key].enabled = state;
                        }
                    }

                    $(document).trigger('module:dirty');
                });

                $(document).on('click', '.module-settings-button', (event) => {
                    this.#createSettingsDialog(event.target);
                    $('#module-settings-dialog').modal({
                        keyboard: false
                    });
                });

                $('#modules-selected').sortable({
                    group: 'list',
                    animation: 200,
                    ghostClass: 'ghost',
                    filter: '.filtered',
                    onMove: function (evt) {
                        if (evt.related.classList.contains("locked")) {
                            return false;
                        }
                    },
                    onEnd: function (evt) {
                        $(document).trigger('module:dirty');
                        if ($(evt.to).is($('#modules-available'))) {
                            let settingsButton = $('#' + $(evt.item).attr("id") + 'settings');
                            let enabledButton = $('#' + $(evt.item).attr("id") + 'enabled');
                            let deleteButton = $('#' + $(evt.item).attr("id") + 'delete');
                            if (settingsButton.length) {
                                settingsButton.prop('disabled', true);
                            }
                            enabledButton.prop('disabled', true);
                            deleteButton.prop('disabled', false);
                        }
                    }
                });

                $('#modules-available').sortable({
                    group: 'list',
                    animation: 200,
                    ghostClass: 'ghost',
                    filter: '.filtered',
                    onMove: function (evt) {
                        if (evt.related.classList.contains('locked')) {
                            return false;
                        }
                    },
                    onEnd: function (evt) {
                        if ($(evt.to).is($('#modules-selected'))) {
                            $(document).trigger('module:dirty');
                            let settingsButton = $('#' + $(evt.item).attr("id") + 'settings');
                            let enabledButton = $('#' + $(evt.item).attr("id") + 'enabled');
                            let deleteButton = $('#' + $(evt.item).attr("id") + 'delete');                        
                            if (settingsButton.length) {
                                settingsButton.prop('disabled', false);
                            }
                            enabledButton.prop('disabled', false);
                            deleteButton.prop('disabled', true);                        
                        }
                    }
                });

                $(document).on('module:dirty', () => {
                    this.#dirty = true;
                    this.#updateToolbar();
                });

            });
        }).always(() => {
            $.LoadingOverlay('hide');
        });

    }

    #updateToolbar() {
        if (this.#dirty) {
            $('#module-editor-save').addClass('green pulse');
            $('#module-editor-save').removeClass('disabled');
        } else {
            $('#module-editor-save').removeClass('green pulse');
            $('#module-editor-save').addClass('disabled');
        }
    }

    alignModal() {
        let modalDialog = $(this).find('.modal-dialog');
        modalDialog.css('margin-top', Math.max(0, ($(window).height() - modalDialog.height()) / 2));
    }

    #addModules(moduleData, element) {
        for (let key in moduleData) {
            let data = moduleData[key];
            let template = this.#createModuleHTML(data, element);
            $(element).append(template);
        }
    }

    #createModuleHTML(data, element) {
        let settingsHtml = '';
        if (data.arguments !== null) {
            if (Object.entries(data.arguments).length != 0) {
                let disabled = '';
                if (element == '#modules-available') {
                    disabled = 'disabled="disabled"';
                }
                settingsHtml = '<button type="button" class="btn btn-primary module-settings-button" id="' + data.module + 'settings" data-module="' + data.module + '" ' + disabled + '>Settings</button>';
            }
        }

        let locked = '';
        let enabledHTML = '';
        if (data.position !== undefined) {
            locked = 'filtered locked';
        } else {
            let enabled = '';
            if (data.enabled !== undefined) {
                if (data.enabled) {
                    enabled = 'checked="checked"';
                }
            }
            enabledHTML = '<div class="pull-right module-enable">Enabled <input type="checkbox" ' + enabled + ' id="' + data.module + 'enabled" data-module="' + data.module + '"></div>';
        }

        let type = 'fa-wrench';
        let typeAlt = 'System Module';
        let deleteHtml = '';
        if (data.type !== undefined) {
            if (data.type == 'user') {
                let disabled = '';
                if (element == '#modules-selected') {
                    disabled = 'disabled="disabled"';
                }
                type = 'fa-user';
                typeAlt = 'User Module';
                deleteHtml = '<button type="button" class="btn btn-danger module-delete-button" id="' + data.module + 'delete" data-module="' + data.module + '" ' + disabled + '>Delete</button>';
            }
        }

        let disabled = '';
        if (element == '#modules-available') {
            disabled = 'disabled="disabled"';
        }

        let template = '\
            <div id="' + data.module + '" data-id="' + data.module + '" class="list-group-item ' + locked + '"> \
                <div class="panel panel-default"> \
                    <div class="panel-heading"><i class="fa fa-bars fa-fw"></i>&nbsp;<i class="fa ' + type + ' fa-fw" title="' + typeAlt + '"></i> ' + data.name + ' ' + enabledHTML + '</div> \
                    <div class="panel-body">' + data.description + ' <div class="pull-right">' + deleteHtml + ' ' + settingsHtml + '</div></div> \
                </div> \
            </div>';

        return template;
    }

    #findModuleData(module) {
        let moduleData = null;

        for (let key in this.#configData.available) {
            let data = this.#configData.available[key];
            if (data.module === module) {
                moduleData = data;
                break;
            }
        }

        if (moduleData === null) {
            for (let key in this.#configData.selected) {
                let data = this.#configData.selected[key];
                if (data.module === module) {
                    moduleData = data;
                    break;
                }
            }
        }

        return moduleData;
    }

    #createSettingsDialog(target) {

        target = $(target);
        let module = target.data('module');
        let moduleData = this.#findModuleData(module);

        let fieldsHTML = '';
        let args = moduleData.argumentdetails;
        for (let key in args) {
            let fieldData = args[key];
            let extraClass = 'input-group-allsky';

            let helpText = '';
            if (fieldData.help !== undefined) {
                if (fieldData.help !== '') {
                    helpText = '<p class="help-block">' + fieldData.help + '</p>';
                }
            }

            let fieldValue = '';
            if (moduleData.arguments[key] !== undefined) {
                fieldValue = moduleData.arguments[key];
            }

            let inputHTML = '<input id="' + key + '" name="' + key + '" class="form-control" value="' + fieldValue + '">';
            if (fieldData.type !== undefined) {
                let fieldType = fieldData.type;
                if (fieldType.fieldtype == 'spinner') {
                    let min = '';
                    if (fieldType.min !== undefined) {
                        min = 'min="' + fieldType.min + '"';
                    }
                    let max = '';
                    if (fieldType.max !== undefined) {
                        max = 'max="' + fieldType.max + '"';
                    }
                    let step = '';
                    if (fieldType.step !== undefined) {
                        step = 'step="' + fieldType.step + '"';
                    }
                    inputHTML = '<input id="' + key + '" name="' + key + '" type="number" ' + min + ' ' + max + ' ' + step + ' class="form-control" value="' + fieldValue + '">'
                    extraClass = 'input-group';
                }

                if (fieldType.fieldtype == 'checkbox') {
                    let checked = '';
                    if (fieldValue == true) {
                        checked = 'checked="checked"';
                    }
                    inputHTML = '<input type="checkbox" id="' + key + '" name="' + key + '" ' + checked + ' value="checked">';
                    extraClass = 'input-group';
                }

                if (fieldType.fieldtype == 'image') {
                    inputHTML = '<input id="' + key + '" name="' + key + '" class="form-control" value="' + fieldValue + '">';
                    extraClass = 'input-group';
                    inputHTML = '\
                        <div class="row">\
                            <div class="col-xs-8">\
                            ' + inputHTML + '\
                            </div>\
                            <div class="col-xs-4">\
                                <button type="button" class="btn btn-default" id="open-image-manager">...</button>\
                            </div>\
                        </div>\
                    ';

                    $(document).on('click', '#open-image-manager', (event) => {                
                        $('#module-image-manager').oeImageManager({
                            thumbnailURL: 'includes/overlayutil.php?request=Images',
                            usedImages: [],
                            bind: '#' + key,
                            allowDoubleClick: true
                        });
                        $('#module-file-manager-dialog').modal({
                            keyboard: false
                        });
                    });
                    $('#module-file-manager-dialog').on('hidden.bs.modal', () => {
                        $('#module-image-manager').data('oeImageManager').destroy();
                    });                    
                    $(document).on('oe-imagemanager-add', (event, image) => {
                        $('#module-file-manager-dialog').modal('hide')
                    });
                    
                }
            }

            let fieldHTML = '\
                <div class="form-group">\
                <label for="' + key + '" class="control-label col-xs-4">' + fieldData.description + '</label>\
                    <div class="col-xs-8">\
                        <div class="'+ extraClass + '">\
                            ' + inputHTML + '\
                        </div>\
                        ' + helpText + '\
                    </div>\
                </div>\
            ';

            fieldsHTML += fieldHTML;
        }

        let dialogTemplate = '\
            <div class="modal" role="dialog" id="module-settings-dialog" data-module="' + module + '">\
                <div class="modal-dialog modal-lg" role="document">\
                    <div class="modal-content">\
                        <div class="modal-header">\
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>\
                            <h4 class="modal-title">' + moduleData.name + ' Settings</h4>\
                        </div>\
                        <div class="modal-body">\
                            <form id="module-editor-settings-form" class="form-horizontal">\
                            ' + fieldsHTML + '\
                            </form>\
                        </div>\
                        <div class="modal-footer">\
                            <button type="button" class="btn btn-danger" data-dismiss="modal">Cancel</button>\
                            <button type="button" class="btn btn-primary" id="module-settings-dialog-save">Save</button>\
                        </div>\
                    </div>\
                </div>\
            </div>\
        ';

        $('#module-settings-dialog').remove();
        $(document.body).append(dialogTemplate);

        $('.modal').on('shown.bs.modal', this.alignModal);

        $(window).on('resize', (event) => {
            $('.modal:visible').each(this.alignModal);
        });

        $(document).on('click', '#module-settings-dialog-save', () => {
            let module = $('#module-settings-dialog').data('module');
            let formValues = {};
            $('#module-editor-settings-form :input').each(function() {
                if (this.type == 'checkbox') {
                    if ($(this).prop('checked')) {
                        formValues[$(this).attr('name')] = true;
                    } else {
                        formValues[$(this).attr('name')] = false;
                    }
                } else {
                    formValues[$(this).attr('name')] = $(this).val();
                }
            });

            this.#saveFormData(this.#configData.selected, formValues, module);
            this.#saveFormData(this.#configData.available, formValues, module);
/*
            for (let key in this.#configData.selected) {
                if (this.#configData.selected[key].module == module) {
                    for (let paramKey in this.#configData.selected[key].arguments) {
                        if (formValues[paramKey] !== undefined) {
                            let value = formValues[paramKey];
                            this.#configData.selected[key].arguments[paramKey] = value;
                        }
                    }
                }
            }
*/
            $('#module-settings-dialog').modal('hide');
            $(document).trigger('module:dirty');
        });
    }

    #saveFormData(type, formValues, module) {
        for (let key in type) {
            if (type[key].module == module) {
                for (let paramKey in type[key].arguments) {
                    if (formValues[paramKey] !== undefined) {
                        let value = formValues[paramKey];
                        type[key].arguments[paramKey] = value;
                    }
                }
            }
        }
    }

    #saveConfig() {
        $.LoadingOverlay('show');
        let newConfig = [];
        let moduleKeys = $('#modules-selected').sortable('toArray');
        for (let key in moduleKeys) {
            let moduleData = this.#findModuleData(moduleKeys[key])
            newConfig.push(moduleData);
        }

        let jsonData = JSON.stringify(newConfig, null, 4);

        $.ajax({
            url: 'includes/moduleutil.php?request=Modules',
            type: 'POST',
            dataType: 'json',
            data: { config: this.#configName, configData: jsonData },
            cache: false,
            context: this
        }).done((result) => {


        }).always(() => {
            $.LoadingOverlay('hide');
        });

        this.#dirty = false;
        this.#updateToolbar();
    }

    #uploadFile(form) {
        $.LoadingOverlay('show');
        $('#module-upload-dialog').modal('hide');

        $.ajax({
            type: 'POST',
            url: 'includes/moduleutil.php?request=Upload',
            data: new FormData(form),
            contentType: false,
            cache: false,
            processData: false,
            context: this
        }).done(function () {
            this.#buildUI();
        }).fail(function () {
            bootbox.alert('Failed to upload the plugin. Unable to move the file');
        }).always(function () {
            $.LoadingOverlay('hide');
        });
    }

    run() {

        jQuery(window).bind('beforeunload', ()=> {
            if (this.#dirty) {
                return ' ';
            } else {
                return undefined;
            }
        });

        $(document).on('click', '#module-options', () => {
            let loadingTimer = setTimeout(() => {
                $.LoadingOverlay('show', {text : 'Sorry this is taking longer than expected ...'});
            }, 500);

            $.ajax({
                url: 'includes/moduleutil.php?request=ModulesSettings',
                type: 'GET',
                dataType: 'json',
                cache: false,
                context: this
            }).done((result) => {
                $('#enablewatchdog').prop('checked', result.watchdog);
                $('#watchdog-timeout').val(result.timeout);                
                $('#module-editor-settings-dialog').modal('show');
            }).always(() => {
                clearTimeout(loadingTimer);
                $.LoadingOverlay('hide');
            });
        });

        
        $(document).on('click', '#module-editor-settings-dialog-save', () => {
            let loadingTimer = setTimeout(() => {
                $.LoadingOverlay('show', {text : 'Sorry this is taking longer than expected ...'});
            }, 500)
            let settings = {
                watchdog: $('#enablewatchdog').prop('checked'),
                timeout: $('#watchdog-timeout').val() | 0
            };

            $.ajax({
                url: 'includes/moduleutil.php?request=ModulesSettings',
                type: 'POST',
                data: {settings: JSON.stringify(settings)},
                cache: false
            }).done((result) => {
                $('#enablewatchdog').prop('checked', result.watchdog);
                $('#watchdog-timeout').val(result.timeout);                
                $('#module-editor-settings-dialog').modal('hide');
            }).fail((result) => {
                bootbox.alert('Failed to save the module settings configuration');
            }).always(() => {
                clearTimeout(loadingTimer);
                $.LoadingOverlay('hide');
            });

            $('#module-editor-settings-dialog').modal('hide');
        });

        $(document).on('click', '#module-editor-save', () => {
            this.#saveConfig();
        });

        $(document).on('change', '#module-editor-config', () => {
            this.#buildUI();
        });

        $(document).on('click', '#module-editor-new', () => {
            $('#module-upload-dialog').modal('show');
        });

        $('#module-upload-dialog-form').on('submit', (e) => {
            e.preventDefault();
            this.#uploadFile(e.target);
        });

        this.#buildUI();
    }

}