"use strict";

; (function ($) {

    $.allskyMM = function (element, options) {
        var defaults = {
            data: {},
            active: true,
            id: 'oe-mm',
            dirty: false,
            overlaySelected: function (overlay) { }
        }

        var plugin = this;

        var element = $(element);

        plugin.settings = $.extend({}, defaults, options);
        plugin.data = [];
        plugin.debug = false;
        plugin.selectedOverlay = {
            type: null,
            name: null            
        };

        let pluginPrefix = plugin.settings.id + '-' + Math.random().toString(36).substr(2, 9);

        plugin.mmId = pluginPrefix + '-allskymm';
        plugin.mmTrigger = pluginPrefix + '-trigger';
        plugin.mmWrapper = pluginPrefix + '-wrapper';

        plugin.mmEditSelect = pluginPrefix + '-edit-select';
        plugin.mmDaySelect = pluginPrefix + '-day-select';
        plugin.mmNightSelect = pluginPrefix + '-night-select';
        plugin.mmTODSelect = pluginPrefix + '-tod-select';

        plugin.mmMetaData = pluginPrefix + '-meta-data';
        plugin.mmFileName = pluginPrefix + '-meta-filename';
        plugin.mmMetaName = pluginPrefix + '-meta-name';
        plugin.mmMetaDescription = pluginPrefix + '-meta-description';
        plugin.mmMetaBrand = pluginPrefix + '-meta-brand';
        plugin.mmMetaModel = pluginPrefix + '-meta-model';
        plugin.mmMetaResolutionWidth = pluginPrefix + '-meta-resolution-width';
        plugin.mmMetaResolutionHeight = pluginPrefix + '-meta-resolution-height';
        plugin.mmMetaTod = pluginPrefix + '-meta-tod';
        plugin.mmConfigSave = pluginPrefix + '-config-save';
        plugin.mmDebug = pluginPrefix + '-debug';

        plugin.init = function () {
            setupDebug();
            createHtml();
            setupMenu();
            setupEvents();
        }

        plugin.destroy = function () {
            $(document).removeData('allskyMM');
        }

        plugin.enabled = function() {
            return plugin.settings.active;
        }

        plugin.show = function() {
            let menu = $('#' + plugin.mmWrapper);
            if (!menu.hasClass('active')) {
                menu.addClass('active');
            }
        }

        plugin.setSelected = function(fileName) {
            $('#' + plugin.mmEditSelect).val(fileName);
            $('#' + plugin.mmEditSelect).trigger('change');
        }

        plugin.showNew = function() {
            $('#' + plugin.mmNewDialogNew).trigger('click');
        }

        plugin.hide = function() {
            let menu = $('#' + plugin.mmWrapper);
            if (menu.hasClass('active')) {
                menu.removeClass('active');
                $('.' + plugin.mmTrigger).hide();
            }
        }

        plugin.show = function() {
            let menu = $('#' + plugin.mmWrapper);
            menu.addClass('active');
            $('.' + plugin.mmTrigger).show();
        }

        var setupDebug = function() {
            let url = window.location.href;
            const paramArr = url.slice(url.indexOf('?') + 1).split('&');
            const params = {};
            paramArr.map(param => {
                const [key, val] = param.split('=');
                params[key] = decodeURIComponent(val);
            })
            if (params.hasOwnProperty('debug')) {
                if (params.debug == 'true') {
                    localStorage.setItem('debugMode', 'true');
                } else {
                    localStorage.setItem('debugMode', 'false');
                }
            }
            plugin.debug  = localStorage.getItem('debugMode') === 'true' ? true: false;          
        }

        var createHtml = function() {

            plugin.mmNewDialogNew = pluginPrefix + '-new-dialog-new';
            plugin.mmNewDialogDelete = pluginPrefix + '-new-dialog-delete';
            plugin.mmNewDialogSave = pluginPrefix + '-new-dialog-save';

            let oeMMHTML = '\
                <div class="oe-mm-wrapper" id="' + plugin.mmWrapper + '">\
                    <nav class="navbar navbar-default">\
                        <div class="container-fluid">\
                            <div class="navbar-header">\
                                <div class="navbar-brand">Overlay Manager</div>\
                            </div>\
                        </div>\
                    </nav>\
                    <div class="container-fluid">\
                        <ul class="nav nav-tabs mt-1" role="tablist">\
                            <li role="presentation" class="active">\
                                <a href="#oe-editor-tab1"  role="tab" data-toggle="tab" id="oe-overlay-editor-tab1">Overlay</a>\
                            </li>\
                            <li role="presentation">\
                                <a href="#oe-exposure-tab2"  role="tab" data-toggle="tab">Activate</a>\
                            </li>\
                        </ul>\
                        <div class="tab-content">\
                            <div role="tabpanel" class="tab-pane active" id="oe-editor-tab1">\
                                <div class="panel panel-default">\
                                    <div class="panel-heading">\
                                        <h3 class="panel-title">Available Overlays</h3>\
                                    </div>\
                                    <div class="panel-body">\
                                        <div class="form-group">\
                                            <label for="' + plugin.mmEditSelect + '">Overlay To Edit</label>\
                                            <div class="row">\
                                                <div class="col-md-12">\
                                                    <select class="form-control" id="' + plugin.mmEditSelect + '" name="' + plugin.mmEditSelect + '">\
                                                        <option value="day">Daytime Configuration</option>\
                                                        <option value="night">Nighttime Configuration</option>\
                                                    </select>\
                                                </div>\
                                            </div>\
                                            <div class="row mt-3">\
                                                <div class="col-md-6">\
                                                    <button type="button" class="btn btn-primary" id="' + plugin.mmNewDialogNew + '"><i class="fa-regular fa-lg fa-square-plus"></i> Add</button>\
                                                </div>\
                                                <div class="col-md-6">\
                                                    <button type="button" class="btn btn-danger pull-right" id="' + plugin.mmNewDialogDelete + '"><i class="fa-solid fa-lg fa-trash-can"></i> Delete</button>\
                                                </div>\
                                            </div>\
                                        </div>\
                                    </div>\
                                </div>\
                                <div class="panel panel-default">\
                                    <div class="panel-heading">\
                                        <h3 class="panel-title">Overlay Meta Data</h3>\
                                    </div>\
                                    <div class="panel-body">\
                                        <div class="row">\
                                            <div class="col-md-12 col-sm-12 col-xs-12">\
                                                <div class="form-group ' + plugin.mmDebug + ' hidden">\
                                                    <label class="control-label requiredField" for="' + plugin.mmFileName + '">Filename\
                                                        <span class="asteriskField">*</span>\
                                                    </label>\
                                                    <input class="form-control ' + plugin.mmMetaData  + '" id="' + plugin.mmFileName + '" name="' + plugin.mmFileName + '" type="text" data-field="filename" />\
                                                </div>\
                                            </div>\
                                        </div>\
                                        <div class="row">\
                                            <div class="col-md-12 col-sm-12 col-xs-12">\
                                                <div class="form-group ">\
                                                    <label class="control-label requiredField" for="' + plugin.mmMetaName + '">Name\
                                                        <span class="asteriskField">*</span>\
                                                    </label>\
                                                    <input class="form-control ' + plugin.mmMetaData  + '" id="' + plugin.mmMetaName + '" name="' + plugin.mmMetaName + '" type="text" data-field="name" />\
                                                </div>\
                                            </div>\
                                        </div>\
                                        <div class="row">\
                                            <div class="col-md-12 col-sm-12 col-xs-12">\
                                                <div class="form-group ">\
                                                    <label class="control-label " for="' + plugin.mmMetaDescription + '">Description</label>\
                                                    <textarea class="form-control ' + plugin.mmMetaData  + '" cols="40" id="' + plugin.mmMetaDescription + '" name="' + plugin.mmMetaDescription + '" rows="2" data-field="description"></textarea>\
                                                </div>\
                                            </div>\
                                        </div>\
                                        <div class="row">\
                                            <div class="col-md-6">\
                                                <div class="form-group ">\
                                                    <label class="control-label " for="' + plugin.mmMetaBrand + '">Camera Brand</label>\
                                                    <select class="select form-control ' + plugin.mmMetaData + '" id="' + plugin.mmMetaBrand + '" name="' + plugin.mmMetaBrand + '" data-field="camerabrand" >\
                                                    </select>\
                                                </div>\
                                            </div>\
                                            <div class="col-md-6">\
                                                <div class="form-group ">\
                                                    <label class="control-label " for="' + plugin.mmMetaModel + '">Camera Model</label>\
                                                    <input class="form-control ' + plugin.mmMetaData  + '" id="' + plugin.mmMetaModel + '" name="' + plugin.mmMetaModel + '" placeholder="Enter the camera model i.e. 178MM" type="text" data-field="cameramodel" />\
                                                </div>\
                                            </div>\
                                        </div>\
                                        <div class="row">\
                                            <div class="col-md-6">\
                                                <div class="form-group ">\
                                                    <label class="control-label " for="' + plugin.mmMetaResolutionWidth + '">Width</label>\
                                                    <input class="form-control ' + plugin.mmMetaData  + '" id="' + plugin.mmMetaResolutionWidth + '" name="' + plugin.mmMetaResolutionWidth + '" placeholder="width" type="number" data-field="cameraresolutionwidth" />\
                                                </div>\
                                            </div>\
                                            <div class="col-md-6">\
                                                <div class="form-group ">\
                                                    <label class="control-label " for="' + plugin.mmMetaResolutionHeight + '">Height</label>\
                                                    <input class="form-control ' + plugin.mmMetaData  + '" id="' + plugin.mmMetaResolutionHeight + '" name="' + plugin.mmMetaResolutionHeight + '" placeholder="height" type="number" data-field="cameraresolutionheight" />\
                                                </div>\
                                            </div>\
                                        </div>\
                                        <div class="row">\
                                            <div class="col-md-12 col-sm-12 col-xs-12">\
                                                <div class="form-group ">\
                                                    <label class="control-label " for="' + plugin.mmMetaTod + '">Available For</label>\
                                                    <select class="form-control ' + plugin.mmMetaData  + '" id="' + plugin.mmMetaTod + '" name="' + plugin.mmMetaTod + '" data-field="tod">\
                                                        <option value="both">Day and Night</option>\
                                                        <option value="day">Daytime</option>\
                                                        <option value="night">Nighttime</option>\
                                                    </select>\
                                                </div>\
                                            </div>\
                                        </div>\
                                    </div>\
                                </div>\
                            </div>\
                            <div role="tabpanel" class="tab-pane" id="oe-exposure-tab2">\
                                <div class="panel panel-default">\
                                    <div class="panel-heading">\
                                        <h3 class="panel-title">Active Overlays</h3>\
                                    </div>\
                                    <div class="panel-body">\
                                        <div class="row mt-2">\
                                            <div class="col-md-12 col-sm-12 col-xs-12">\
                                                <div class="form-group ">\
                                                    <label class="control-label " for="' + plugin.mmDaySelect + '">Daytime</label>\
                                                    <select class="select form-control ' + plugin.mmTODSelect + '" id="' + plugin.mmDaySelect + '" name="' + plugin.mmDaySelect + '"></select>\
                                                </div>\
                                                <div class="form-group ">\
                                                    <label class="control-label " for="' + plugin.mmNightSelect + '">Nighttime</label>\
                                                    <select class="select form-control ' + plugin.mmTODSelect + '" id="' + plugin.mmNightSelect + '" name="' + plugin.mmNightSelect + '"></select>\
                                                </div>\
                                            </div>\
                                        </div>\
                                        <div class="row mt-2">\
                                            <div class="col-md-12 col-sm-12 col-xs-12">\
                                                <button type="button" class="btn btn-primary pull-right" id="' + plugin.mmConfigSave + '">Save</button>\
                                            </div>\
                                        </div>\
                                    </div>\
                                </div>\
                            </div>\
                            <button type="button" class="btn btn-primary pull-right ' + plugin.mmTrigger + '">Close</button>\
                        </div>\
                    </div>\
                </div>\
                <button class="oe-mm-trigger fa fa-xmark ' + plugin.mmTrigger + '">\
                </button>';
            
            plugin.mmNewDialog = pluginPrefix + "-new-dialog";
            plugin.mmNewDialogSave = pluginPrefix + "-new-dialog-save";
            plugin.mmNewDialogCancel = pluginPrefix + "-new-dialog-cancel";

            plugin.mmNewDialogForm = pluginPrefix + "-new-dialog-form";

            plugin.mmNewDialogField = pluginPrefix + "-new-dialog-field";
            plugin.mmNewDialogCopy = pluginPrefix + "-new-dialog-copy";
            plugin.mmNewDialogFileName = pluginPrefix + "-new-dialog-filename";
            plugin.mmNewDialogName = pluginPrefix + "-new-dialog-name";
            plugin.mmNewDialogDescription = pluginPrefix + "-new-dialog-description";
            plugin.mmNewDialogBrand = pluginPrefix + "-new-dialog-brand";
            plugin.mmNewDialogModel = pluginPrefix + "-new-dialog-model";
            plugin.mmNewDialogResolutionWidth = pluginPrefix + "-new-dialog-resolutionwidth";
            plugin.mmNewDialogResolutionHeight = pluginPrefix + "-new-dialog-resolutionheight";
            plugin.mmNewDialogTod = pluginPrefix + "-new-dialog-tod";
            plugin.mmNewDialogActivate = pluginPrefix + "-new-dialog-activate";
            plugin.mmNewDialogSuggest = pluginPrefix + "-new-dialog-suggest";
            plugin.mmNewDialogAdvancedField = pluginPrefix + "-new-dialog-advanced";

            let dialogHTML = '\
                <div class="modal" role="dialog" id="' + plugin.mmNewDialog + '">\
                    <div class="modal-dialog" role="document">\
                        <div class="modal-content">\
                            <div class="modal-header">\
                                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>\
                                <h4 class="modal-title">Create New Overlay</h4>\
                            </div>\
                            <div class="modal-body">\
                                <div class="row">\
                                    <div class="col-md-12 col-sm-12 col-xs-12">\
                                        <form id="' + plugin.mmNewDialogForm + '">\
                                            <div class="panel panel-default">\
                                                <div class="panel-heading">\
                                                    <h3 class="panel-title">Select Template</h3>\
                                                </div>\
                                                <div class="panel-body">\
                                                    <div>\
                                                        <p>Select the template you wish to base your new overlay on. If you wish to create a blank overlay select \'Blank Overlay\'</p>\
                                                    </div>\
                                                    <div class="form-group ">\
                                                        <select class="select form-control" id="' + plugin.mmNewDialogCopy + '" name="' + plugin.mmNewDialogCopy + '" title="Select the template you wish to base your new overlay on"></select>\
                                                    </div>\
                                                </div>\
                                            </div>\
                                            <div class="panel panel-default">\
                                                <div class="panel-heading">\
                                                    <h3 class="panel-title">Overlay Meta Data</h3>\
                                                </div>\
                                                <div class="panel-body">\
                                                    <ul class="nav nav-tabs" role="tablist">\
                                                        <li role="presentation" class="active"><a href="#oe-item-list-dialog-allsky1" role="tab" data-toggle="tab">Basic</a></li>\
                                                        <li role="presentation"><a href="#oe-item-list-dialog-all1" aria-controls="profile" role="tab" data-toggle="tab">Advanced</a></li>\
                                                    </ul>\
                                                    <div class="tab-content">\
                                                        <div role="tabpanel" class="tab-pane active mt-2" id="oe-item-list-dialog-allsky1">\
                                                            <div class="row">\
                                                                <div class="col-md-12">\
                                                                    <div class="form-group ">\
                                                                        <label class="control-label requiredField" for="' + plugin.mmNewDialogName + '">Name <span class="asteriskField">*</span></label>\
                                                                        <input class="form-control ' + plugin.mmNewDialogField + '" id="' + plugin.mmNewDialogName + '" name="' + plugin.mmNewDialogName + '" type="text"/>\
                                                                        <span class="help-block text-danger hidden" id="' + plugin.mmNewDialogName + '-error">Please enter a name for this overlay</span>\
                                                                    </div>\
                                                                </div>\
                                                            </div>\
                                                            <div class="row">\
                                                                <div class="col-md-12">\
                                                                    <div class="form-group ">\
                                                                        <label class="control-label " for="' + plugin.mmNewDialogDescription + '">Description</label>\
                                                                        <textarea class="form-control ' + plugin.mmNewDialogField + '" cols="40" id="' + plugin.mmNewDialogDescription + '" name="' + plugin.mmNewDialogDescription + '" rows="2"></textarea>\
                                                                    </div>\
                                                                </div>\
                                                            </div>\
                                                            <div class="row">\
                                                                <div class="col-md-5">\
                                                                    <div class="form-group ">\
                                                                        <label class="control-label " for="' + plugin.mmNewDialogTod + '">Available For</label>\
                                                                        <select class="select form-control ' + plugin.mmNewDialogAdvancedField + '" id="' + plugin.mmNewDialogTod + '" name="' + plugin.mmNewDialogTod + '">\
                                                                            <option value="both">Day and Night</option>\
                                                                            <option value="day">Daytime</option>\
                                                                            <option value="night">Nightime</option>\
                                                                        </select>\
                                                                    </div>\
                                                                </div>\
                                                                <div class="col-md-7">\
                                                                    <div class="form-group form-check">\
                                                                        <label class="control-label " for="' + plugin.mmNewDialogActivate + '-yes">Activate After Creation</label><br>\
                                                                        <div class="switch-field boxShadow settingInput settingInputBoolean">\
                                                                            <input id="' + plugin.mmNewDialogActivate + '-no" class="form-control" type="radio" name="' + plugin.mmNewDialogActivate + '" value="false">\
                                                                            <label style="margin-bottom: 0px;" for="' + plugin.mmNewDialogActivate + '-no">No</label>\
                                                                            <input id="' + plugin.mmNewDialogActivate + '-yes" class="form-control" type="radio" name="' + plugin.mmNewDialogActivate + '" value="true" checked="">\
                                                                            <label style="margin-bottom: 0px;" for="' + plugin.mmNewDialogActivate + '-yes">Yes</label>\
                                                                        </div>\
                                                                    </div>\
                                                                </div>\
                                                            </div>\
                                                        </div>\
                                                        <div role="tabpanel" class="tab-pane mt-2" id="oe-item-list-dialog-all1">\
                                                            <div class="row">\
                                                                <div class="col-md-12">\
                                                                    <div class="form-group ">\
                                                                        <label class="control-label requiredField" for="' + plugin.mmNewDialogFileName + '">Filename <span class="asteriskField">*</span></label>\
                                                                        <input class="form-control ' + plugin.mmNewDialogField + '" id="' + plugin.mmNewDialogFileName + '" name="' + plugin.mmNewDialogFileName + '" type="text"/>\
                                                                        <span class="help-block text-danger hidden" id="' + plugin.mmNewDialogFileName + '-error">Please enter a unique filename. The name you entered is already in use</span>\
                                                                    </div>\
                                                                </div>\
                                                            </div>\
                                                            <div class="row">\
                                                                <div class="col-md-6">\
                                                                    <div class="form-group ">\
                                                                        <label class="control-label requiredField" for="' + plugin.mmNewDialogBrand + '">Camera Brand</label>\
                                                                        <select class="select form-control ' + plugin.mmNewDialogField + ' ' + plugin.mmNewDialogAdvancedField + '" id="' + plugin.mmNewDialogBrand + '" name="' + plugin.mmNewDialogBrand + '" >\
                                                                        </select>\
                                                                    </div>\
                                                                </div>\
                                                                <div class="col-md-6">\
                                                                    <div class="form-group ">\
                                                                        <label class="control-label requiredField" for="' + plugin.mmNewDialogModel + '">Camera Model</label>\
                                                                        <input class="form-control ' + plugin.mmNewDialogField + ' ' + plugin.mmNewDialogAdvancedField + '" id="' + plugin.mmNewDialogModel + '" name="" type="text"/>\
                                                                    </div>\
                                                                </div>\
                                                            </div>\
                                                            <div class="row">\
                                                                <div class="col-md-6">\
                                                                    <div class="form-group ">\
                                                                        <label class="control-label " for="' + plugin.mmNewDialogResolutionWidth + '">Width</label>\
                                                                        <input class="form-control ' + plugin.mmNewDialogField + ' ' + plugin.mmNewDialogAdvancedField + '" id="' + plugin.mmNewDialogResolutionWidth + '" name="' + plugin.mmNewDialogResolutionWidth + '" type="number"/>\
                                                                    </div>\
                                                                </div>\
                                                                <div class="col-md-6">\
                                                                    <div class="form-group ">\
                                                                        <label class="control-label " for="' + plugin.mmNewDialogResolutionHeight + '">Height</label>\
                                                                        <input class="form-control ' + plugin.mmNewDialogField + ' ' + plugin.mmNewDialogAdvancedField + '" id="' + plugin.mmNewDialogResolutionHeight + '" name="' + plugin.mmNewDialogResolutionHeight + '" type="number"/>\
                                                                    </div>\
                                                                </div>\
                                                            </div>\
                                                        </div>\
                                                    </div>\
                                                </div>\
                                            </div>\
                                        </form>\
                                    </div>\
                                </div>\
                            </div>\
                            <div class="modal-footer">\
                                <button type="button" class="btn btn-default" id="' + plugin.mmNewDialogCancel + '" data-dismiss="modal">Cancel</button>\
                                <button type="button" class="btn btn-primary" id="' + plugin.mmNewDialogSave + '">Save</button>\
                            </div>\
                        </div>\
                    </div>\
                </div>\
            ';

            element.empty();
            element.append(oeMMHTML + dialogHTML);
        }

        var setupMenu = function() {
            $('.' + plugin.mmTrigger).hide();
            let menu = $('#' + plugin.mmWrapper);
            $(document).on('click', '.' + plugin.mmTrigger, (e) => {
                    menu.removeClass('active');
                    $('.' + plugin.mmTrigger).hide();
            });

            $(document).on('click', (e) => {
                if ($(e.target).is('canvas') || $(e.target).is('#oe-overlay-disable')) {
                    menu.removeClass('active');
                    $('.' + plugin.mmTrigger).hide();
                }
            });              
        }

        var show = function() {
            let menu = $('#' + plugin.mmWrapper);
            if (!menu.hasClass('active')) {
                menu.addClass('active');
                $('.' + plugin.mmTrigger).show();
            }
        }

        var setupEvents = function() {

            $(document).on('oe-show-overlay-manager', (e) => {
                show();
            });

            $(document).on('oe-overlay-saved', (e,data) => {
                let configManager = window.oedi.get('config');
                configManager.loadOverlays();
                buildUI();
            });

            $(document).on('oe-overlay-loaded', (e,data) => {
                plugin.selectedOverlay = data.overlay
                buildUI();
            });

            $(document).on('click', '#oe-overlay-disable-new', (event) => {
                event.preventDefault();
                event.stopPropagation();
                plugin.show();
                plugin.showNew();
                let configManager = window.oedi.get('config');
                let overlays = configManager.overlays;
//                $('#' + plugin.mmNewDialogCopy).val(plugin.selectedOverlay.name);
                $('#' + plugin.mmNewDialogCopy).val(overlays.current);
            });

            $(document).on('oe-startup', (e,data) => {
                let configManager = window.oedi.get('config');
                let overlays = configManager.overlays;

                let type = 'allsky';
                for (let overlay in overlays.useroverlays) {
                    if (overlay == overlays.current) {
                        type = 'user';
                        break;
                    }
                }
                configManager.loadOverlay(overlays.current, type);
                                
            });
            
            $(document).on('change', '#' + plugin.mmEditSelect, (e) => {
                let overlay = $(e.target).val();
                let uiManager = window.oedi.get('uimanager');

                if (uiManager.dirty) {
                    bootbox.confirm('Are you sure you wish to load a new overlay. You will lose any unsaved changes', (result) => {
                        if (result) {
                            let selectOption = $('#' + plugin.mmEditSelect).find(':selected');
                            if (selectOption.data('type') === 'allsky') {
                                $('#' + plugin.mmNewDialogDelete).addClass('disabled');
                            } else {
                                $('#' + plugin.mmNewDialogDelete).removeClass('disabled');
                            }                       
                            window.oedi.get('config').loadOverlay(overlay, selectOption.data('type'));
                        } else {                          
                            $('#' + plugin.mmEditSelect).val(plugin.selectedOverlay.name);
                        }
                    });                    
                } else {
                    let selectOption = $('#' + plugin.mmEditSelect).find(':selected');
                    if (selectOption.data('type') === 'allsky') {
                        $('#' + plugin.mmNewDialogDelete).addClass('disabled');
                    } else {
                        $('#' + plugin.mmNewDialogDelete).removeClass('disabled');
                    }                       
                    window.oedi.get('config').loadOverlay(overlay, selectOption.data('type'));
                }                                    
                
            });

            $(document).on('change','.' + plugin.mmMetaData, (e) => {
                let field = $(e.target).data('field');
                if (field !== undefined) {
                    let configManager = window.oedi.get('config');
                    let value = $(e.target).val();
                    configManager.setMetaField(field, value);
                    $(document).trigger('oe-config-updated');
                }
            });

            $(document).on('click', '#' + plugin.mmNewDialogNew, (e) => {
                let uiManager = window.oedi.get('uimanager');

                if (uiManager.dirty) {
                    bootbox.confirm('Are you sure you wish to create a new overlay. You will lose any unsaved changes', (result) => {
                        if (result) {
                            showNewOverlayDialog();
                            $('#' + plugin.mmNewDialogCopy).val($('#' + plugin.mmEditSelect).val());
                        }
                    });                    
                } else {
                    showNewOverlayDialog();
                    $('#' + plugin.mmNewDialogCopy).val($('#' + plugin.mmEditSelect).val());
                }
            });

            $(document).on('focusout', '.' + plugin.mmNewDialogField, function(e){
                $(this).removeClass('has-error');
                $(this).parent().parent().next('.help-block').addClass('hidden');
                $(this).next('.help-block').addClass('hidden'); // YUK !
            });

            $(document).on('click', '#' + plugin.mmNewDialogSave, (e) => {
                let hasErrors = false;

                let fileName = $('#' + plugin.mmNewDialogFileName).val();
                fileName = fileName.replace(/\s+/g,'');
    
                if (fileName !== '') {
                    let result = $.ajax({
                        type: "GET",
                        url: "includes/overlayutil.php?request=ValidateFilename&filename=" + fileName,
                        data: "",
                        dataType: 'json',
                        cache: false,
                        async: false
                    });
    
                    if (result.responseJSON !== undefined) {
                        if (result.responseJSON.error === true) {
                            hasErrors = true;
                        }
                    }
                } else {
                    hasErrors = true;
                }
    
                if (hasErrors) {
                    $('#' + plugin.mmNewDialogFileName).addClass('has-error');
                    $('#' + plugin.mmNewDialogFileName).parent().parent().next('.help-block').removeClass('hidden');
                    hasErrors = true;
                }
    
                let name = $('#' + plugin.mmNewDialogName).val();
                name = name.replace(/\s+/g,'');
                if (name === '') {
                    $('#' + plugin.mmNewDialogName).addClass('has-error');
                    $('#' + plugin.mmNewDialogName).next('.help-block').removeClass('hidden');
                    hasErrors = true;
                }
    
                if (!hasErrors) {
                    let formData = {
                        'data': {
                            'copy': $('#' + plugin.mmNewDialogCopy).val(),
                            'filename': $('#' + plugin.mmNewDialogFileName).val()    
                        },
                        'fields': {
                            'name': $('#' + plugin.mmNewDialogName).val(),
                            'description': $('#' + plugin.mmNewDialogDescription).val(),
                            'camerabrand': $('#' + plugin.mmNewDialogBrand).val(),
                            'cameramodel': $('#' + plugin.mmNewDialogModel).val(),
                            'cameraresolutionwidth': $('#' + plugin.mmNewDialogResolutionWidth).val(),
                            'cameraresolutionheight': $('#' + plugin.mmNewDialogResolutionHeight).val(),
                            'tod': $('#' + plugin.mmNewDialogTod).val()
                        }
                    };

                    let result = $.ajax({
                        type: 'POST',
                        url: 'includes/overlayutil.php?request=NewOverlay',
                        data: formData,
                        dataType: 'json',
                        cache: false,
                        async: false
                    });

                    let activate = $('input[name=' + plugin.mmNewDialogActivate + ']:checked').val();
                    activate = (activate?.toLowerCase?.() === 'true');
                    if (activate) {
                        let tod = $('#' + plugin.mmNewDialogTod).val();
                        let day = $('#' + plugin.mmDaySelect).val();
                        let night = $('#' + plugin.mmNightSelect).val();
                        if (tod === 'day' || tod === 'both') {
                            day = formData.data.filename;
                        }
                        if (tod === 'night' || tod === 'both') {
                            night = formData.data.filename;
                        }
                        saveSettings(day, night);
                    }
                    
                    let configManager = window.oedi.get('config');
                    configManager.loadOverlays();
                    let selected = $('#' + plugin.mmNewDialogFileName).val();
                    configManager.loadOverlay(selected, 'user');
                    buildUI();
                    $('#' + plugin.mmNewDialog).modal('hide');
                    $('#' + plugin.mmNewDialogDelete).removeClass('disabled');

                }                
            });

            $(document).on('click', '#' + plugin.mmNewDialogDelete, (e) => {
                let selectedValue = $('#' + plugin.mmEditSelect).val();
                let selectedDayValue = $('#' + plugin.mmDaySelect).val();
                let selectedNightValue = $('#' + plugin.mmNightSelect).val();

                if (selectedValue === selectedDayValue || selectedValue === selectedNightValue) {
                    bootbox.alert('This overlay is currently being used for day or night overlays. Please select another overlay for day or night before deleting it');
                } else {
                    bootbox.confirm('Are you sure you wish to delete this overlay? This CANNOT be undone', (result) => {
                        if (result) {
                            let result = $.ajax({
                                type: 'GET',
                                url: 'includes/overlayutil.php?request=DeleteOverlay&filename=' + selectedValue,
                                dataType: 'json',
                                cache: false,
                                async: false
                            });
                            let configManager = window.oedi.get('config');
                            configManager.loadOverlays();
                            buildUI();                                                      
                        }
                    });     
                }             
            });

            $('#' + plugin.mmNewDialog).on('hidden.bs.modal', (e) => {
                destroyDialog();
            });

            $(document).on('change', '.' + plugin.mmTODSelect, (e) => {
                $('#' + plugin.mmConfigSave).removeClass('disabled');
            });

            $(document).on('click', '#' + plugin.mmConfigSave, (e) => {
                saveSettings($('#' + plugin.mmDaySelect).val(), $('#' + plugin.mmNightSelect).val());
                $('#' + plugin.mmConfigSave).addClass('disabled');           
            });

            $(document).on('change', '.' + plugin.mmNewDialogAdvancedField, (e) => {
                updateNewFilename();
            });

        }

        var saveSettings = function(day, night) {
            let result = $.ajax({
                type: 'POST',
                url: 'includes/overlayutil.php?request=SaveSettings',
                data: {
                    daytime: day,
                    nighttime: night
                },
                dataType: 'json',
                cache: false,
                async: false
            });

            return result;
        }

        var destroyDialog = function() {
            $('#' + plugin.mmNewDialogCopy).val('none');
            $('#' + plugin.mmNewDialogFileName).val('');
            $('#' + plugin.mmNewDialogName).val('');
            $('#' + plugin.mmNewDialogDescription).val('');
            $('#' + plugin.mmNewDialogBrand).val('');
            $('#' + plugin.mmNewDialogModel).val('');
            $('#' + plugin.mmNewDialogResolutionwidth).val('');
            $('#' + plugin.mmNewDialogResolutionHeight).val('');
            $('#' + plugin.mmNewDialogTod).val('both');
            $('#' + plugin.mmNewDialog).data('bs.modal', null);
        }

        var updateNewFilename = function() {
            let template = 'overlay{num}-{brand}_{model}-{width}x{height}-{tod}.json';

            let brand = $('#' + plugin.mmNewDialogBrand).val();
            let fileName = template.replace('{brand}', brand);

            let model = $('#' + plugin.mmNewDialogModel).val().trim();
            model = model.replace(/ /g, '_');
            fileName = fileName.replace('{model}', model);

            let width = $('#' + plugin.mmNewDialogResolutionWidth).val();
            fileName = fileName.replace('{width}', width);
            
            let height = $('#' + plugin.mmNewDialogResolutionHeight).val();
            fileName = fileName.replace('{height}', height);

            let tod = $('#' + plugin.mmNewDialogTod).val();
            fileName = fileName.replace('{tod}', tod);

            let result = $.ajax({
                type: "GET",
                url: "includes/overlayutil.php?request=Suggest",
                data: {
                    template: template,
                    filename: fileName,
                    brand: brand,
                    model: model,
                    width: width,
                    height: height
                },
                dataType: 'json',
                cache: false,
                async: false,
                context: this
            });

            let num = result.responseJSON;
            fileName = fileName.replace('{num}', num);

            $('#' + plugin.mmNewDialogFileName).val(fileName);
        }

        var showNewOverlayDialog = function() {
            $('#' + plugin.mmNewDialogCopy).empty().append($('<option>').val('none').text('Blank Overlay'));
            let configManager = window.oedi.get('config');
            let data = configManager.overlays;
            for (let overlay in data.coreoverlays) {
                let name = data.coreoverlays[overlay].metadata.name
                if (overlay === plugin.selectedOverlay.name) {
                    name += ' Default';
                }
                $('#' + plugin.mmNewDialogCopy).append($('<option>').val(overlay).text('Allsky - ' + name));
            }
            for (let overlay in data.useroverlays) {
                let name = data.useroverlays[overlay].metadata.name
                $('#' + plugin.mmNewDialogCopy).append($('<option>').val(overlay).text('User - ' + name));
            }

            $('#' + plugin.mmNewDialogBrand).empty();
            for (let brand in data.brands) {
                $('#' + plugin.mmNewDialogBrand).append($('<option>').val(data.brands[brand]).text(data.brands[brand]));
            }

            $('#' + plugin.mmNewDialogBrand).val($('#' + plugin.mmMetaBrand).val());
            $('#' + plugin.mmNewDialogModel).val($('#' + plugin.mmMetaModel).val());

            let image = $('#oe-background-image');
            $('#' + plugin.mmNewDialogResolutionWidth).val(image[0].width|0);
            $('#' + plugin.mmNewDialogResolutionHeight).val(image[0].height|0);

            $('#' + plugin.mmWrapper).removeClass('active');
            $('.' + plugin.mmTrigger).hide();

            $('#' + plugin.mmNewDialog).modal({
                keyboard: false,
                width: 800
            });

            $('#' + plugin.mmNewDialog).on('hidden.bs.modal', function (e) {
                $('#' + plugin.mmWrapper).addClass('active');
                $('.' + plugin.mmTrigger).show();
            })
                          
            updateNewFilename();
        }

        var buildUI = function () {
            let configManager = window.oedi.get('config');
            let data = configManager.overlays;
            resetSelect(plugin.mmEditSelect, 'both', true, (plugin.selectedOverlay.name !== null) ? plugin.selectedOverlay.name : null);
            resetSelect(plugin.mmDaySelect, 'day', true, (data.config.daytime !== null) ? data.config.daytime : null);
            resetSelect(plugin.mmNightSelect, 'night', true, (data.config.nighttime !== null) ? data.config.nighttime : null);

            resetSelect(plugin.mmMetaData, (plugin.selectedOverlay.name !== null) ? plugin.selectedOverlay.name : null);
            
            $('#' + plugin.mmMetaBrand).empty();
            for (let brand in data.brands) {
                $('#' + plugin.mmMetaBrand).append($('<option>').val(data.brands[brand]).text(data.brands[brand]));
            }
            $(plugin.mmMetaBrand).val(configManager.getMetaField('camerabrand'));

            if (plugin.selectedOverlay.type === 'allsky' && !plugin.debug ) {
                $('.' + plugin.mmMetaData).prop('disabled', true);
            } else {
                $('.' + plugin.mmMetaData).prop('disabled', false);
            }

            if (plugin.selectedOverlay.name !== null) {
                $('#' + plugin.mmFileName).val(plugin.selectedOverlay.name);
                $('#' + plugin.mmMetaName).val(configManager.getMetaField('name'));
                $('#' + plugin.mmMetaDescription).val(configManager.getMetaField('description'));
                $('#' + plugin.mmMetaBrand).val(configManager.getMetaField('camerabrand'));
                $('#' + plugin.mmMetaModel).val(configManager.getMetaField('cameramodel'));
                $('#' + plugin.mmMetaResolutionWidth).val(configManager.getMetaField('cameraresolutionwidth'));
                $('#' + plugin.mmMetaResolutionHeight).val(configManager.getMetaField('cameraresolutionheight'));
                $('#' + plugin.mmMetaTod).val(configManager.getMetaField('tod'));
            } else {
                $('.' + plugin.mmMetaData ).val('');
                $('.' + plugin.mmMetaData ).prop('disabled', true);
            }

            let selectOption = $('#' + plugin.mmEditSelect).find(':selected');
            if (selectOption.data('type') === 'allsky') {
                $('#' + plugin.mmNewDialogDelete).addClass('disabled');
            }

            $('#' + plugin.mmConfigSave).addClass('disabled');             
            $('#' + plugin.mmMetaSave).addClass('disabled');             

            if (plugin.debug) {
                $('.' + plugin.mmDebug).removeClass('hidden');
            }

            function resetSelect(id, tod, includeAllsky=false, selectedValue=null) {
                let selectId = '#' + id;
                $(selectId).empty();

                if (includeAllsky) {
                    for (let overlay in data.coreoverlays) {
                        let add = false;
                        if (tod == 'both') {
                            add = true;
                        } else {
                            let overlayTod = data.coreoverlays[overlay].metadata.tod;
                            if (overlayTod !== undefined) {
                                if (overlayTod === tod || overlayTod === 'both') {
                                    add = true;
                                }
                            } else {
                                add = true;
                            }
                        }

                        if (add) {
                            let selected = '';
                            if (selectedValue !== null && selectedValue === overlay) {
                                selected = 'selected';
                            }
                            let name = data.coreoverlays[overlay].metadata.name
                            $(selectId).append($('<option ' + selected + '>').val(overlay).text('Allsky - ' + name).data('type','allsky'));
                        }
                    }
                }

                for (let overlay in data.useroverlays) {
                    let add = false;
                    if (tod == 'both') {
                        add = true;
                    } else {
                        let overlayTod = data.useroverlays[overlay].metadata.tod;
                        if (overlayTod !== undefined) {
                            if (overlayTod === tod || overlayTod === 'both') {
                                add = true;
                            }
                        } else {
                            add = true;
                        }
                    }
                    if (add) {                    
                        let selected = '';
                        if (selectedValue !== null && selectedValue === overlay) {
                            selected = 'selected';
                        }
                        let name = data.useroverlays[overlay].metadata.name
                        $(selectId).append($('<option ' + selected + '>').val(overlay).text('User - ' + name).data('type','user'));
                    }
                }                
            }
        }

        plugin.init();       
    }

    $.fn.allskyMM = function (options) {
        return this.each(function () {
            if (undefined == $(this).data('allskyMM')) {
                var plugin = new $.allskyMM(this, options);
                $(this).data('allskyMM', plugin);
            }
        });
    }

})(jQuery);
