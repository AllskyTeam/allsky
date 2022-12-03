"use strict";
class MODULESEDITOR {

    #configData = null;
    #moduleSettings = null;
    #dirty = false;
    #eventName = null;
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
       
        $.ajax({
            url: 'includes/moduleutil.php?request=ModuleBaseData',
            type: 'GET',
            dataType: 'json',
            cache: false,
            context: this
        }).done((result) => {
            this.#settings = result;

            this.#dirty = false;
            this.#updateToolbar();

            $.moduleeditor = {
                settings: this.#settings.settings
            };
            if (this.#first) {
                $('#module-editor-config').empty();
                for (let event in this.#settings.settings.events) {
                    $('#module-editor-config').append(new Option(this.#settings.settings.events[event], event));
                }

                if (this.#settings.tod !== undefined) {
                    this.#eventName = this.#settings.tod;
                    $('#module-editor-config option[value="' + this.#eventName + '"]').attr("selected", "selected");
                    $('#module-editor-config').data("current", this.#eventName);
                }
                this.#first = false;
            }
            this.#eventName = $("#module-editor-config option").filter(":selected").val();

            $.ajax({
                url: 'includes/moduleutil.php?request=Modules&event=' + this.#eventName,
                type: 'GET',
                dataType: 'json',
                cache: false,
                context: this
            }).done((result) => {
                this.#configData = result;

                this.#addModules(this.#configData.available, '#modules-available')
                this.#addModules(this.#configData.selected, '#modules-selected')

                if (result.corrupted) {
                    bootbox.alert('The Flow configuration is corrupted. Please use the reset Flow button to revert the flow to the installation default');
                }
                this.#updateToolbar();

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

                        if (evt.related.classList.contains('filtered')) {
                            if (evt.related.classList.contains('first') && !evt.willInsertAfter) { 
                                return false;
                            }
                            if (evt.related.classList.contains('last') && evt.willInsertAfter) { 
                                return false;
                            }
                        }

                        if (evt.dragged.classList.contains("locked")) {
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
                            enabledButton.prop('checked', false);  
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

                        if (evt.related.classList.contains('filtered')) {
                            if (evt.related.classList.contains('first') && !evt.willInsertAfter) { 
                                return false;
                            }
                            if (evt.related.classList.contains('last') && evt.willInsertAfter) { 
                                return false;
                            }
                        }

                        if (evt.dragged.classList.contains('locked')) {
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
                            enabledButton.prop('checked', $.moduleeditor.settings.autoenable);                            
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

        if (this.#configData !== null) {
            if (this.#configData.corrupted) {
                $('#module-editor-reset').addClass('green pulse');
            } else {
                $('#module-editor-reset').removeClass('green pulse');
            }
        }

        if (this.#settings.settings.debugmode) {
            $('#oe-toolbar-debug').removeClass('hidden');
        } else {
            $('#oe-toolbar-debug').addClass('hidden');
        }
    }

    alignModal() {
        let modalDialog = $(this).find('.modal-dialog');
        modalDialog.css('margin-top', Math.max(0, ($(window).height() - modalDialog.height()) / 2));
    }

    #addModules(moduleData, element) {
        for (let key in moduleData) {
            let data = moduleData[key];
            let moduleKey = 'allsky' + key;
            let template = this.#createModuleHTML(data, element, moduleKey);
            $(element).append(template);
        }
    }

    #createModuleHTML(data, element, moduleKey) {
        let settingsHtml = '';
        if (data.metadata.arguments !== undefined) {
            if (Object.entries(data.metadata.arguments).length != 0) {
                let disabled = '';
                if (element == '#modules-available') {
                    disabled = 'disabled="disabled"';
                }
                settingsHtml = '<button type="button" class="btn btn-sm btn-primary module-settings-button" id="' + moduleKey + 'settings" data-module="' + data.module + '" ' + disabled + '>Settings</button>';
            }
        }

        let locked = '';
        let enabledHTML = '';
        if (data.position !== undefined) {
            locked = 'filtered locked ' + data.position;
        } else {
            let enabled = '';
            if (data.enabled !== undefined) {
                if (data.enabled) {
                    enabled = 'checked="checked"';
                }
            }
            enabledHTML = '<div class="pull-right module-enable"><span class="module-enable-text">Enabled</span> <input type="checkbox" ' + enabled + ' id="' + moduleKey + 'enabled" data-module="' + data.module + '"></div>';
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
                deleteHtml = '<button type="button" class="btn btn-sm btn-danger module-delete-button" id="' + moduleKey + 'delete" data-module="' + data.module + '" ' + disabled + '>Delete</button>';
            }
        }

        let disabled = '';
        if (element == '#modules-available') {
            disabled = 'disabled="disabled"';
        }

        let experimental = '';
        if (data.metadata.experimental) {
            experimental = '<span class="module-experimental">EXPERIMENTAL:</span> ';
        } 

        let version = this.#settings.version;
        if (data.metadata.version !== undefined) {
            version = data.metadata.version;
        }
        version = '<span><small class="module-version">' + version + '</small><span>';
        let template = '\
            <div id="' + moduleKey + '" data-id="' + data.module + '" class="list-group-item ' + locked + '"> \
                <div class="panel panel-default"> \
                    <div class="panel-heading"><i class="fa fa-bars fa-fw"></i>&nbsp;<i class="fa ' + type + ' fa-fw" title="' + typeAlt + '"></i> ' + data.metadata.name + ' ' + version + ' ' + enabledHTML + '</div> \
                    <div class="panel-body">' + experimental + data.metadata.description + ' <div class="pull-right">' + deleteHtml + ' ' + settingsHtml + '</div></div> \
                </div> \
            </div>';

        return template;
    }

    #findModuleData(module) {
        let moduleData = null;

        for (let key in this.#configData.available) {
            let data = this.#configData.available[key];
            if (data.module === module) {
                moduleData = {
                    module: key,
                    data: data
                };
                break;
            }
        }

        if (moduleData === null) {
            for (let key in this.#configData.selected) {
                let data = this.#configData.selected[key];
                if (data.module === module) {
                    moduleData = {
                        module: key,
                        data: data
                    };
                    break;
                }
            }
        }

        return moduleData;
    }

    #createSettingsDialog(target) {
        
        let tabs = [];

        target = $(target);
        let module = target.data('module');
        let moduleData = this.#findModuleData(module);
        moduleData = moduleData.data;

        let fieldsHTML = '';
        let args = moduleData.metadata.argumentdetails;
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
            if (moduleData.metadata.arguments[key] !== undefined) {
                fieldValue = moduleData.metadata.arguments[key];
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
                                <button type="button" class="btn btn-default" id="open-image-manager-' + key + '">...</button>\
                            </div>\
                        </div>\
                    ';

                    $(document).on('click', '#open-image-manager-' + key, (event) => {                
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

                if (fieldType.fieldtype == 'roi') {
                    inputHTML = '<input id="' + key + '" name="' + key + '" class="form-control" disabled="disabled" value="' + fieldValue + '">';
                    extraClass = 'input-group';
                    inputHTML = '\
                        <div class="row">\
                            <div class="col-xs-8">\
                            ' + inputHTML + '\
                            </div>\
                            <div class="col-xs-4">\
                                <button type="button" class="btn btn-default" id="open-roi-' + key + '" data-source="' + key + '">...</button>\
                                <button type="button" class="btn btn-default" id="reset-roi-' + key + '" data-source="' + key + '"><span class="glyphicon glyphicon-repeat"></span></button>\
                            </div>\
                        </div>\
                    ';

                    $(document).on('click', '#reset-roi-' + key, (event) => {
                        let el = $(event.target).data('source');
                        $('#' + el).val('');
                    });

                    $(document).on('click', '#open-roi-' + key, (event) => {
                        let el = $(event.target).data('source');
                        let data = $('#' + el).val();
                        let roi = null;
                        
                        if (data !== '') {
                            roi = this.#parseROI(data);
                        }

                        let fallbackValue = $('#roifallback').val();
                        if (fallbackValue === undefined) {
                            fallbackValue = 5;
                        }
                        $.allskyROI({
                            id: key,
                            roi: roi,
                            fallbackValue: fallbackValue,
                            roiSelected: function(roi) {
                                $('#' + key).val(roi.x1 + ',' + roi.y1 + ',' + roi.x2 + ',' + roi.y2)
                            }
                        });
                    });
                }

                if (fieldType.fieldtype == 'gpio') {
                    inputHTML = '<input id="' + key + '" name="' + key + '" class="form-control" disabled="disabled" value="' + fieldValue + '">';
                    extraClass = 'input-group';
                    inputHTML = '\
                        <div class="row">\
                            <div class="col-xs-8">\
                            ' + inputHTML + '\
                            </div>\
                            <div class="col-xs-4">\
                                <button type="button" class="btn btn-default" id="open-gpio-' + key + '" data-source="' + key + '">...</button>\
                                <button type="button" class="btn btn-default" id="reset-gpio-' + key + '" data-source="' + key + '"><span class="glyphicon glyphicon-repeat"></span></button>\
                            </div>\
                        </div>\
                    ';

                    $(document).on('click', '#reset-gpio-' + key, (event) => {
                        let el = $(event.target).data('source');
                        $('#' + el).val('');
                    });

                    $(document).on('click', '#open-gpio-' + key, (event) => {
                        let el = $(event.target).data('source');
                        let data = $('#' + el).val();

                        $.allskyGPIO({
                            id: key,
                            gpio: parseInt(data),
                            gpioSelected: function(gpio) {
                                $('#' + key).val(gpio)                                
                            }
                        });
                    });                    
                }

                if (fieldType.fieldtype == 'select') {
                    inputHTML = '<select name="' + key + '" id="' + key + '">';
                    let values = fieldType.values.split(',');
                    for (let value in values) {
                        let optionValue = values[value];
                        let selected = "";
                        if (fieldValue == optionValue) {
                            selected = ' selected="selected" ';
                        }
                        inputHTML += '<option value="' + optionValue + '"' + selected + '>' + optionValue + '</option>';
                    }
                    inputHTML += '</select>';
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

            let tab = 'home';
            if (fieldData.tab !== undefined) {
                tab = fieldData.tab
                tab = tab.replace(/\s+/g,'_');
            }
            if (tabs[tab] === undefined) {
                tabs[tab] = [];
            }
            tabs[tab].push(fieldHTML);
            fieldsHTML += fieldHTML;
        }
        let moduleSettingsHtml = '';
        let numberOfTabs = Object.keys(tabs).length;
        if (numberOfTabs === 1) {
            for (let tabName in tabs) {
                for (let field in tabs[tabName]) {
                    moduleSettingsHtml += tabs[tabName][field];
                }
            }
        } else {
            moduleSettingsHtml += '<div>';
            moduleSettingsHtml += ' <ul class="nav nav-tabs" role="tablist">'
            let active = 'active';
            for (let tabName in tabs) {
                let tabRef = moduleData.metadata.module + tabName;
                moduleSettingsHtml += '<li role="presentation" class="' + active + '"><a href="#' + tabRef + '" role="tab" data-toggle="tab">' + tabName.replace(/\_/g,' ') + '</a></li>';
                active = '';
            }
            moduleSettingsHtml += ' </ul>'

            moduleSettingsHtml += '<div class="tab-content">';
            active = 'active';
            for (let tabName in tabs) {
                let fieldsHTML  = '';
                for (let field in tabs[tabName]) {
                    fieldsHTML += tabs[tabName][field];
                }                
                let tabRef = moduleData.metadata.module + tabName;
                moduleSettingsHtml += '<div role="tabpanel" style="margin-top:10px" class="tab-pane ' + active + '" id="' + tabRef + '">' + fieldsHTML + '</div>';
                active = '';
            }
            moduleSettingsHtml += '</div>';
            moduleSettingsHtml += '</div>';
        }
        let experimental = '';
        if (moduleData.metadata.experimental) {
            experimental = '<span class="module-experimental module-experimental-header"> - Experimental. Please use with caution</span>';
        }
        let dialogTemplate = '\
            <div class="modal" role="dialog" id="module-settings-dialog" data-module="' + module + '">\
                <div class="modal-dialog modal-lg" role="document">\
                    <div class="modal-content">\
                        <div class="modal-header">\
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>\
                            <h4 class="modal-title"><strong>' + moduleData.metadata.name + ' Settings</strong> ' + experimental + '</h4>\
                        </div>\
                        <div class="modal-body">\
                            <form id="module-editor-settings-form" class="form-horizontal">\
                            ' + moduleSettingsHtml + '\
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

    #parseROI(rawROI) {
        let roi = null;
        let parts = rawROI.split(',');

        if (parts.length == 4) {
            roi = {};
            roi.x1 = parseInt(parts[0], 10);
            roi.y1 = parseInt(parts[1], 10);
            roi.x2 = parseInt(parts[2], 10);
            roi.y2 = parseInt(parts[3], 10);
        }

        return roi;
    }

    #saveFormData(type, formValues, module) {
        for (let key in type) {
            if (type[key].module == module) {
                for (let paramKey in type[key].metadata.arguments) {
                    if (formValues[paramKey] !== undefined) {
                        let value = formValues[paramKey];
                        type[key].metadata.arguments[paramKey] = value;
                    }
                }
            }
        }
    }

    #saveConfig() {
        $.LoadingOverlay('show');
        let newConfig = {};
        let moduleKeys = $('#modules-selected').sortable('toArray');
        for (let key in moduleKeys) {
            let moduleData = this.#findModuleData(moduleKeys[key])
            let enabled =  $('#allsky' + moduleData.module + 'enabled').prop('checked');
            if (enabled == undefined) {
                enabled = true;
            }
            moduleData.data.enabled = enabled;
            newConfig[moduleData.module] = moduleData.data
        }

        let jsonData = JSON.stringify(newConfig, null, 4);

        $.ajax({
            url: 'includes/moduleutil.php?request=Modules',
            type: 'POST',
            dataType: 'json',
            data: { config: this.#eventName, configData: jsonData },
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

    #showDebug() {
        $.ajax({
            url: 'includes/moduleutil.php?request=Modules&event=' + this.#eventName,
            type: 'GET',
            dataType: 'json',
            cache: false,
            context: this
        }).done((result) => {
            $('#module-editor-debug-dialog-content').empty();

            let totalTime = 0;
            let html = '';
            html += '<div class="row">';                
            html += '<div class="col-md-3"><strong>Module</strong></div>';
            html += '<div class="col-md-2"><strong>Run Time (ms)</strong></div>';
            html += '<div class="col-md-7"><strong>Result</strong></div>';
            html += '</div>';

            for (let key in result.selected) {
                let data = result.selected[key];
                let runTime = parseInt(data.lastexecutiontime,10);
                totalTime += runTime;

                html += '<div class="row">';                
                html += '<div class="col-md-3">' + data.module + '</div>';
                html += '<div class="col-md-2"><div class ="pull-right">' + runTime + '</div></div>';
                html += '<div class="col-md-7">' + data.lastexecutionresult + '</div>';
                html += '</div>';
            }            

            html += '<div class="row">';                
            html += '<div class="col-md-12">&nbsp;</div>';
            html += '</div>';

            html += '<div class="row">';                
            html += '<div class="col-md-3"><div class="pull-right"><strong>Total</strong></div></div>';
            html += '<div class="col-md-2"><div class="pull-right"><strong>' + totalTime + '</strong></div></div>';
            html += '<div class="col-md-7"><strong>' + totalTime/ 1000 + ' Seconds</strong></div>';
            html += '</div>';

            $('#module-editor-debug-dialog-content').append(html);

            $('#module-editor-debug-dialog').modal('show');            
        });

    }

    run() {

        $(document).on('click', '#module-editor-reset', (event) => {
            if (window.confirm('Are you sure you wish to reset this Flow. This process CANNOT be undone?')) {
                $.ajax({
                    url: 'includes/moduleutil.php?request=Reset&flow=' + this.#eventName,
                    type: 'GET',
                    cache: false,
                    context: this
                }).done((result) => {
                    this.#buildUI();
                });
            }
        });      

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
                this.#moduleSettings = result;
                $('#enablewatchdog').prop('checked', result.watchdog);
                $('#watchdog-timeout').val(result.timeout);                
                $('#showexperimental').prop('checked', result.showexperimental);
                $('#autoenable').prop('checked', result.autoenable);
                $('#debugmode').prop('checked', result.debugmode);
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

            this.#moduleSettings.watchdog = $('#enablewatchdog').prop('checked');
            this.#moduleSettings.timeout = $('#watchdog-timeout').val() | 0;
            this.#moduleSettings.showexperimental = $('#showexperimental').prop('checked');
            this.#moduleSettings.autoenable = $('#autoenable').prop('checked');
            this.#moduleSettings.debugmode = $('#debugmode').prop('checked');

            this.#settings.settings = this.#moduleSettings;
            $.moduleeditor.settings = this.#settings.settings;

            this.#updateToolbar();

            $.ajax({
                url: 'includes/moduleutil.php?request=ModulesSettings',
                type: 'POST',
                data: {settings: JSON.stringify( this.#moduleSettings)},
                cache: false
            }).done((result) => {
                $('#module-editor-settings-dialog').modal('hide');
            }).fail((result) => {
                bootbox.alert('Failed to save the module settings configuration');
            }).always(() => {
                this.#buildUI();
                clearTimeout(loadingTimer);
                $.LoadingOverlay('hide');
            });

            $('#module-editor-settings-dialog').modal('hide');
        });

        $(document).on('click', '#module-editor-save', () => {
            this.#saveConfig();
        });

        $(document).on('click', '#module-toobar-debug-button', () => {
            this.#showDebug()
        });

        $(document).on('change', '#module-editor-config', (e) => {
            let val = $("#module-editor-config option").filter(":selected").val();
            let oldVal = $("#module-editor-config").data("current");
            let doIt = true
            if (this.#dirty) {
                if (!window.confirm('Are you sure. Changes to the current configuration will be lost')) {
                    doIt = false;
                }
            }
            if (doIt) {
                $('#module-editor-config').data("current", val);
                this.#buildUI();
            } else {
                $(e.target).val(oldVal);
                return false;
            }
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