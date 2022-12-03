"use strict";
/**
 * The main User Interface manager. This class is responsible for controlling the entire
 * ui for the overlay editor.
 */
class OEUIMANAGER {
    #selected = null;
    #fonts = [];
    #configManager = null;
    #fieldManager = null;
    #snapRectangle = null;
    #oeEditorStage = null;
    #gridLayer = null;
    #backgroundLayer = null;
    #overlayLayer = null;
    #transformer = null;
    #movingField = null;
    #testMode = false;
    #backgroundImage = null;
    #stageScale = 0.6;
    #stageMode = 'fit';
    #debugMode = false;
    #imageCache = null;

    #fieldTable = null;
    #allFieldTable = null;

    constructor(imageObj) {
        this.#configManager = window.oedi.get('config');
        this.#fieldManager = window.oedi.get('fieldmanager');

        Konva.pixelRatio = 1;

        this.#backgroundImage = new Konva.Image({
            x: 0,
            y: 0,
            image: imageObj,
        });

        var width = this.#backgroundImage.width();
        var height = this.#backgroundImage.height();

        $('#overlay_container').height(height);
        this.#oeEditorStage = new Konva.Stage({
            container: 'oe-editor-stage',
            width: width,
            height: height,
            draggable: true
        });

        this.setZoom('oe-zoom-fit');

        this.#backgroundLayer = new Konva.Layer();
        this.#backgroundLayer.add(this.#backgroundImage);
        this.#oeEditorStage.add(this.#backgroundLayer);

        this.#gridLayer = new Konva.Layer();
        this.#overlayLayer = new Konva.Layer();
        this.#oeEditorStage.add(this.#overlayLayer);
        this.#oeEditorStage.add(this.#gridLayer);

        this.#transformer = new Konva.Transformer({
            resizeEnabled: false
        });
        this.#overlayLayer.add(this.#transformer);

        this.#snapRectangle = new Konva.Rect({
            x: 0,
            y: 0,
            name: 'snapRectangle',
            width: 100,
            height: 50,
            fill: '#cccccc',
            opacity: 0.6,
            stroke: '#333',
            strokeWidth: 1,
            visible: false
        });
        this.#overlayLayer.add(this.#snapRectangle);
    }

    get selected() {
        return this.#selected;
    }
    set selected(selected) {
        this.#selected = selected;
    }

    get testMode() {
        return this.#testMode;
    }
    set testMode(state) {
        this.#testMode = state;
    }

    get transformer() {
        return this.#transformer;
    }

    #resizeWindow() {
        if (this.#stageMode === 'fit') {
            this.setZoom('oe-zoom-fit');
        }
    }

    buildUI() {
        this.setupFonts();

        let fields = this.#fieldManager.fields;
        for (let [fieldName, field] of fields.entries()) {
            let object = field.shape;

            this.#overlayLayer.add(object);
        }

        $(window).on('resize', (event) => {
            this.#resizeWindow();
        });

        this.#oeEditorStage.on('dragmove', (event) => {

            let stage = event.target;
            if (stage.getClassName() === 'Stage') {
                let x = stage.x();
                let y = stage.y();
                let viewPortWidth = $('#oe-viewport').width();
                let StageWidth = stage.width();
                let xDiff = StageWidth - viewPortWidth;

                if (x < -xDiff) {
                    stage.x(-xDiff);
                }
                if (x > 0) {
                    stage.x(0);
                }

                if (y > 0) {
                    stage.y(0);
                }

                event.evt.preventDefault();
                event.evt.stopPropagation();
            }


        });

        this.#oeEditorStage.on('wheel', (event) => {
            event.evt.preventDefault();

            if (this.#configManager.mouseWheelZoom) {
                let direction = event.evt.deltaY > 0 ? 1 : -1;

                if (event.evt.ctrlKey) {
                    direction = -direction;
                }

                this.#stageScale = this.#stageScale + (direction * 0.01);
                this.#oeEditorStage.scale({ x: this.#stageScale, y: this.#stageScale });
            }
        });

        this.#oeEditorStage.on('click tap', (event) => {
            let shape = event.target;

            this.updateToolbar();

            // if click on empty area - remove all selections
            if (event.target === this.#backgroundImage) {
                this.#transformer.nodes([]);
                this.hidePropertyEditor();
                this.#selected = null;

                this.setFieldOpacity(false);
                this.updateToolbar();
                return;
            }

            // do nothing if clicked NOT on our rectangles
            if (!event.target.hasName('field')) {
                return;
            }

            this.#transformer.resizeEnabled(false);

            if (event.target.getClassName() === 'Image') {
                this.#transformer.resizeEnabled(true);
                this.#transformer.keepRatio(true);
                this.#transformer.enabledAnchors(['top-left', 'top-right', 'bottom-left', 'bottom-right']);
            }
            this.#transformer.nodes([event.target]);
            this.#selected = this.#fieldManager.findField(shape);
            this.setFieldOpacity(false);
            this.setFieldOpacity(true, shape.id());

            if (this.#transformer.nodes().length == 1) {
                this.updatePropertyEditor();
            }
            this.updateToolbar();
        });

        this.#overlayLayer.on('dblclick ', (event) => {
            let shape = event.target;

            if (this.#transformer.nodes().length == 1) {
                this.setFieldOpacity(true, shape.id());
                this.#selected = this.#fieldManager.findField(shape);
                $('#oe-delete').removeClass('disabled');

                this.showPropertyEditor();
                
            }
        });

        this.#overlayLayer.on('dragstart', (event) => {
            let shape = event.target;

            this.#movingField = this.#fieldManager.findField(shape);
            if (this.#configManager.snapBackground) {
                let gridSizeX = this.#configManager.gridSize * this.#oeEditorStage.scaleX();
                let gridSizeY = this.#configManager.gridSize * this.#oeEditorStage.scaleY();
                this.#snapRectangle.position({
                    x: (Math.round(shape.x() / gridSizeX) * gridSizeX) | 0,
                    y: (Math.round(shape.y() / gridSizeY) * gridSizeY) | 0
                });
                this.#snapRectangle.size({
                    width: shape.width(),
                    height: shape.height()
                });
                this.#snapRectangle.scale({
                    x: this.#movingField.scale,
                    y: this.#movingField.scale
                });
                this.#snapRectangle.visible(true);
            }
            
        });

        this.#overlayLayer.on('dragmove ', (event) => {
            let shape = event.target;

            if (shape.getClassName() !== 'Transformer') {
                if (this.#configManager.snapBackground) {
                    let gridSizeX = this.#configManager.gridSize;
                    let gridSizeY = this.#configManager.gridSize;
                    this.#snapRectangle.position({
                        x: (Math.round(shape.x() / gridSizeX) * gridSizeX) | 0,
                        y: (Math.round(shape.y() / gridSizeY) * gridSizeY) | 0
                    });
                }
            }
        });

        this.#overlayLayer.on('dragend', (event) => {
            let shape = event.target;

            let gridSizeX = this.#configManager.gridSize;
            let gridSizeY = this.#configManager.gridSize;
            shape.position({
                x: (Math.round(shape.x() / gridSizeX) * gridSizeX) | 0,
                y: (Math.round(shape.y() / gridSizeY) * gridSizeY) | 0
            });

            if (this.#movingField !== null) {
                this.#movingField.x = shape.x() | 0;
                this.#movingField.y = shape.y() | 0;
            }

            if (this.#selected !== null) {
                if (this.#selected.id === shape.id()) {
                    this.updatePropertyEditor();
                }
                this.updateToolbar();
            }

            if (this.#configManager.snapBackground) {
                this.#snapRectangle.visible(false);
            }
            this.#movingField = null;
        });

        this.#transformer.on('transformend', (event) => {
            let shape = event.target;

            if (this.#selected !== null) {

                if (this.#selected instanceof OEIMAGEFIELD) {
                    this.#selected.scale = shape.scaleX();
                }

                if (this.#selected.id === shape.id()) {
                    this.#selected.rotation = shape.rotation();
                    this.updatePropertyEditor();
                }
            }

        });

        $(document).on('dblclick', '.draggable', (event) => {
            if (!$(event.target).hasClass('noclick')) {
                this.updateSelected(event.target);
            }
        });

        $(document).on('click', '#oe-item-list', (event) => {

            this.#fieldTable = $('#itemlisttable').DataTable({
                data: this.#configManager.dataFields,
                autoWidth: false,
                pagingType: 'simple_numbers',
                paging: true,
                info: true,
                searching: true,
                pageLength: parseInt(this.#configManager.addListPageSize),
                lengthMenu: [ [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, -1], [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 'All']],
                order: [[0, 'asc']],
                columns: [
                    {
                        data: 'id',
                        width: '0px',
                        visible: false
                    }, {
                        data: 'name',
                        width: '265px'
                    }, {
                        data: 'description',
                        width: '200px'
                    }, {
                        data: 'format',
                        width: '100px'
                    }, {
                        data: 'type',
                        width: '60px'
                    }, {
                        data: null,
                        width: '100px',
                        render: function (item, type, row, meta) {
                            let buttons = '<div class="btn-group"> <button type="button" class="btn btn-primary btn-xs oe-list-add" data-id="' + item.id + '">';
                            buttons += '<i class="fa-solid fa-plus oe-list-add" data-id="' + item.id + '"></i></button>';
                            buttons += '<button style="margin-left:5px;" type="button" class="btn btn-warning btn-xs oe-list-edit" data-id="' + item.id + '">';
                            buttons += '<i class="fa-solid fa-pen-to-square oe-list-edit" data-id="' + item.id + '"></i></button>';
                            if (item.source == 'User') {
                                buttons += '<button style="margin-left:5px;" type="button" class="btn btn-danger btn-xs oe-list-delete" data-id="' + item.id + '"><i class="fa-solid fa-trash oe-list-delete" data-id="' + item.id + '"></i></button>';
                            }
                            buttons += '</div>';
                            return buttons;
                        }
                    }

                ],
                fnDrawCallback: function (oSettings) {
                    if (oSettings._iDisplayLength >= oSettings.aoData.length) {
                        $(oSettings.nTableWrapper).find('.dataTables_paginate').hide();
                        $(oSettings.nTableWrapper).children('div').first().hide();
                        $(oSettings.nTableWrapper).children('div').last().hide();
                    } else {
                        $(oSettings.nTableWrapper).find('.dataTables_paginate').show();
                        $(oSettings.nTableWrapper).children('div').first().show();
                        $(oSettings.nTableWrapper).children('div').last().show();
                    }
                }
            });

            if (this.#configManager.allDataFields != undefined) {
                $('#oe-item-list-dialog-all-table').show();
                $('#oe-item-list-dialog-all-error').hide();
                this.#allFieldTable = $('#allitemlisttable').DataTable({
                    data: this.#configManager.allDataFields,
                    autoWidth: false,
                    pagingType: 'simple_numbers',
                    paging: true,
                    info: true,
                    searching: true,
                    pageLength: parseInt(this.#configManager.addListPageSize),
                    lengthMenu: [ [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, -1], [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 'All']],
                    order: [[0, 'asc']],
                    columns: [
                        {
                            data: 'id',
                            width: '0px',
                            visible: false
                        }, {
                            data: 'name',
                            width: '350px'
                        }, {
                            data: 'value',
                            width: '200px',
                            render: function (item, type, row, meta) {
                                if ( type !== 'display' ) {
                                    return item;
                                }
                                if ( typeof item !== 'number' && typeof item !== 'string' ) {
                                    return item;
                                }
                                item = item.toString();
                                if ( item.length <= 30 ) {
                                    return item;
                                }
                                
                                let shortened = item.substr(0, 20-1);

                                let escaped = item
                                    .replace( /&/g, '&amp;' )
                                    .replace( /</g, '&lt;' )
                                    .replace( />/g, '&gt;' )
                                    .replace( /"/g, '&quot;' );

                                return '<span class="ellipsis" title="'+escaped+'">'+shortened+'&#8230;</span>';
                            }                        
                        }, {
                            data: null,
                            width: '100px',
                            render: function (item, type, row, meta) {

                                let config = window.oedi.get('config');
                                let fields = config.dataFields;
                                let check = '${' + item.name.replace('AS_', '') + '}'
                                let found = false;
                                for (let key in fields) {
                                    if (fields[key].name == check) {
                                        found = true;
                                        break;
                                    }
                                }


                                let tableData = $('#itemlisttable').DataTable().data();
                                for (let key in tableData) {
                                    if (tableData[key].name == check) {
                                        found = true;
                                        break;
                                    }
                                }

                                let disabled = '';
                                let dataId = 'data-id="' + item.id + '"';
                                if (found) {
                                    disabled = 'disabled="disabled"';
                                    dataId = '';
                                }
                                let buttons = '<div class="btn-group"> <button ' + disabled + ' type="button" class="btn btn-primary btn-xs oe-all-list-add" ' + dataId + '>';
                                buttons += '<i class="fa-solid fa-plus oe-all-list-add" ' + dataId + '></i></button>';
                                buttons += '</div>';
                                
                                return buttons;
                            }
                        }

                    ],
                    fnDrawCallback: function (oSettings) {
                        if (oSettings._iDisplayLength >= oSettings.aoData.length) {
                            $(oSettings.nTableWrapper).find('.dataTables_paginate').hide();
                            $(oSettings.nTableWrapper).children('div').first().hide();
                            $(oSettings.nTableWrapper).children('div').last().hide();
                        } else {
                            $(oSettings.nTableWrapper).find('.dataTables_paginate').show();
                            $(oSettings.nTableWrapper).children('div').first().show();
                            $(oSettings.nTableWrapper).children('div').last().show();
                        }
                    }
                });
            } else {
                $('#oe-item-list-dialog-all-table').hide();
                $('#oe-item-list-dialog-all-error').show();
            }


            $('#oe-item-list-dialog-close').html('Close');
            $('#oe-item-list-dialog-save').addClass('hidden');
            $('#oe-item-list-dialog').modal({
                keyboard: false,
                width: 600
            })
            $('#oe-item-list-dialog').on('hidden.bs.modal', function () {
                $('#itemlisttable').DataTable().destroy();
                $('#allitemlisttable').DataTable().destroy();
            });
        });

        $(document).on('click', '.oe-list-delete', (event) => {

            event.preventDefault();
            event.stopPropagation();
            let fieldId = $(event.currentTarget).data('id');

            let field = this.#configManager.findFieldById(fieldId);

            if (field.source !== 'System') {
                if (window.confirm('Are you sure you wish to delete this item?')) {
                    this.#configManager.deletefieldById(field.id);
                    $('#itemlisttable').DataTable().clear();
                    $('#itemlisttable').DataTable().rows.add(this.#configManager.dataFields);
                    $('#itemlisttable').DataTable().draw();
                    if (this.#configManager.allDataFields != undefined) {
                        $('#allitemlisttable').DataTable().rows().invalidate().draw('page');
                    }

                    $('#oe-item-list-edit-dialog').modal('hide');
                    $('#oe-item-list-dialog-close').html('Cancel');
                    $('#oe-item-list-dialog-save').removeClass('hidden');
                }
            }
        });

        $(document).on('click', '.oe-all-list-add', (event) => {
            event.preventDefault();
            event.stopPropagation();
            let fieldId = $(event.currentTarget).data('id');
            let field = this.#configManager.findAllFieldsById(fieldId);
            let fieldName = '${' + field.name + '}';
            $('#oe-item-list-edit-dialog-id').val('');
            $('#oe-item-list-edit-dialog-name').val(fieldName.replace('AS_', ''));
            $('#oe-item-list-edit-dialog-description').val('');
            $('#oe-item-list-edit-dialog-format').val('');
            $('#oe-item-list-edit-dialog-sample').val('');
            $('#oe-item-list-edit-dialog-type option[value=Text]').attr('selected', 'selected');
            $('#oe-item-list-edit-dialog-source option[value=User').attr('selected', 'selected');

            $('#oe-item-list-edit-dialog-name').closest('.form-group').removeClass('has-error');
            $('#oe-item-list-edit-dialog-description').closest('.form-group').removeClass('has-error');

            $('#oe-item-list-edit-dialog-name').prop('disabled', false);
            $('#oe-item-list-edit-dialog-type').prop('disabled', false);

            $('#oe-variable-edit-fash').hide();

            $('#oe-variable-edit-title').html('Add Variable');
            $('#oe-item-list-edit-dialog').modal({
                keyboard: false
            });

        });

        $(document).on('click', '.oe-list-add', (event) => {

            event.preventDefault();
            event.stopPropagation();
            let fieldId = $(event.currentTarget).data('id');

            let field = this.#configManager.findFieldById(fieldId);

            let shape = this.#fieldManager.addField('text', field.name, null, field.format, field.sample);

            this.setFieldOpacity(true);

            this.#overlayLayer.add(shape);

            $('#itemlisttable').DataTable().destroy();
            $('#oe-item-list-dialog').modal('hide');

            this.#selected = this.#fieldManager.findField(shape);
            this.#transformer.nodes([shape]);
            this.showPropertyEditor();
            this.updatePropertyEditor();
            this.updateToolbar();
            this.#fieldManager.buildJSON();
            if (this.testMode) {
                this.enableTestMode();
            }
        });

        $(document).on('click', '#oe-field-dialog-add-field', (event) => {

            event.preventDefault();
            event.stopPropagation();

            $('#oe-item-list-edit-dialog-id').val('');
            $('#oe-item-list-edit-dialog-name').val('');
            $('#oe-item-list-edit-dialog-description').val('');
            $('#oe-item-list-edit-dialog-format').val('');
            $('#oe-item-list-edit-dialog-sample').val('');
            $('#oe-item-list-edit-dialog-type option[value=Text]').attr('selected', 'selected');
            $('#oe-item-list-edit-dialog-source option[value=User').attr('selected', 'selected');

            $('#oe-item-list-edit-dialog-name').closest('.form-group').removeClass('has-error');
            $('#oe-item-list-edit-dialog-description').closest('.form-group').removeClass('has-error');

            $('#oe-item-list-edit-dialog-name').prop('disabled', false);
            $('#oe-item-list-edit-dialog-type').prop('disabled', false);

            $('#oe-variable-edit-fash').hide();

            $('#oe-variable-edit-title').html('Add Variable');
            $('#oe-item-list-edit-dialog').modal({
                keyboard: false
            });

        });

        $(document).on('click', '.oe-list-edit', (event) => {

            event.preventDefault();
            event.stopPropagation();

            let fieldId = $(event.currentTarget).data('id');
            let field = this.#configManager.findFieldById(fieldId);

            if (field !== 'undefined') {

                if (field.source === 'System') {
                    $('#oe-item-list-edit-dialog-name').prop('disabled', true);
                    $('#oe-item-list-edit-dialog-type').prop('disabled', true);
                } else {
                    $('#oe-item-list-edit-dialog-name').prop('disabled', false);
                    $('#oe-item-list-edit-dialog-type').prop('disabled', false);
                }

                $('#oe-item-list-edit-dialog-name').closest('.form-group').removeClass('has-error');
                $('#oe-item-list-edit-dialog-description').closest('.form-group').removeClass('has-error');

                $('#oe-item-list-edit-dialog-id').val(field.id);
                $('#oe-item-list-edit-dialog-name').val(field.name);
                $('#oe-item-list-edit-dialog-description').val(field.description);
                $('#oe-item-list-edit-dialog-format').val(field.format);
                $('#oe-item-list-edit-dialog-sample').val(field.sample);
                $('#oe-item-list-edit-dialog-type option[value=' + field.type + ']').attr('selected', 'selected');
                $('#oe-item-list-edit-dialog-source option[value=' + field.source + ']').attr('selected', 'selected');

                if (field.source == 'System') {
                    $('#oe-variable-edit-fash').show();
                } else {
                    $('#oe-variable-edit-fash').hide();
                }

                $('#oe-variable-edit-title').html('Edit Variable');
                $('#oe-item-list-edit-dialog').modal({
                    keyboard: false
                });
            }

        });

        $(document).on('click', '#oe-field-save', (event) => {
            let fieldId = $('#oe-item-list-edit-dialog-id').val();
            let fieldName = $('#oe-item-list-edit-dialog-name').val();
            let fieldDescription = $('#oe-item-list-edit-dialog-description').val();
            let fieldFormat = $('#oe-item-list-edit-dialog-format').val();
            let fieldSample = $('#oe-item-list-edit-dialog-sample').val();

            let fieldType = $("#oe-item-list-edit-dialog-type option").filter(":selected").val();
            let fieldSource = $("#oe-item-list-edit-dialog-source option").filter(":selected").val();

            let formValid = true;
            if (!fieldName.startsWith('${')) {
                $('#oe-item-list-edit-dialog-name').closest('.form-group').addClass('has-error');
                formValid = false;
            }
            if (fieldDescription == '') {
                $('#oe-item-list-edit-dialog-description').closest('.form-group').addClass('has-error');
                formValid = false;
            }

            if (formValid) {
                if (fieldId !== '') {
                    let field = this.#configManager.findFieldById(fieldId);
                    if (field !== null) {
                        field.name = fieldName;
                        field.description = fieldDescription;
                        field.format = fieldFormat;
                        field.sample = fieldSample;
                        field.type = fieldType;
                        field.source = fieldSource;
                    }
                } else {
                    let fieldId = this.#configManager.dataFields.length;
                    let newField = {
                        id: fieldId,
                        name: fieldName,
                        description: fieldDescription,
                        format: fieldFormat,
                        sample: fieldSample,
                        type: fieldType,
                        source: fieldSource
                    };
                    this.#configManager.addField(newField);
                }

                $('#itemlisttable').DataTable().clear();
                $('#itemlisttable').DataTable().rows.add(this.#configManager.dataFields);
                $('#itemlisttable').DataTable().draw();
                if (this.#configManager.allDataFields != undefined) {
                    $('#allitemlisttable').DataTable().rows().invalidate().draw('page');
                }
                $('#oe-item-list-edit-dialog').modal('hide');
                $('#oe-item-list-dialog-close').html('Cancel');
                $('#oe-item-list-dialog-save').removeClass('hidden');
            }
        });

        $(document).on('click', '#oe-item-list-dialog-save', (event) => {
            this.#configManager.saveFields();
            $('#oe-item-list-dialog').modal('hide');
        });

        $(document).on('click', '#oe-item-list-dialog-close', (event) => {
            if (!$('#oe-item-list-dialog-save').hasClass('hidden')) {
                $.ajax({
                    type: "GET",
                    url: "includes/overlayutil.php?request=Data",
                    data: "",
                    dataType: 'json',
                    cache: false
                }).done((data) => {
                    this.#configManager.dataFields = data;
                });
            }
            $('#oe-item-list-dialog').modal('hide');
        });

        $(document).on('click', '#oe-save', (event) => {
            if (this.#fieldManager.dirty) {
                this.#saveConfig();
            }
        });

        $(document).on('click', '#oe-test-mode', (event) => {
            if (this.testMode) {
                this.disableTestMode();
            } else {
                this.enableTestMode();
            }
        });

        $(document).keyup((event) => {
            if ($(event.target)[0].nodeName == 'BODY') {
                if (event.key === 'Backspace' || event.key === 'Delete') {
                    if (this.#selected !== null) {
                        event.stopPropagation();
                        event.preventDefault();
                        this.#deleteField(event);
                        return false;
                    }
                }
            }
        });

        $(document).on('click', '#oe-delete', (event) => {
            this.#deleteField(event);
        });

        $(document).on('click', '#oe-add-text', (event) => {
            let shape = this.#fieldManager.addField('text');
            this.#overlayLayer.add(shape);

            this.setFieldOpacity(true, shape.id());

            this.#selected = this.#fieldManager.findField(shape);
            this.showPropertyEditor();
            this.updatePropertyEditor();
            this.updateToolbar();
            this.#fieldManager.buildJSON();
            if (this.testMode) {
                this.enableTestMode();
            }
        });

        $(document).on('click', '#oe-add-image', (event) => {
            let shape = this.#fieldManager.addField('image');
            this.#overlayLayer.add(shape);
            this.#selected = this.#fieldManager.findField(shape);
            this.showPropertyEditor();
            this.updatePropertyEditor();
            this.updateToolbar();
        });

        $(document).on('click', '#oe-options', (event) => {
            $('#defaultimagetopacity').val(this.#configManager.getValue('settings.defaultimagetopacity') * 100);
            $('#defaultimagerotation').val(this.#configManager.getValue('settings.defaultimagerotation'));
            $('#defaultfontsize').val(this.#configManager.getValue('settings.defaultfontsize'));
            $('#defaultfontopacity').val(this.#configManager.getValue('settings.defaultfontopacity') * 100);
            $('#defaulttextrotation').val(this.#configManager.getValue('settings.defaulttextrotation'));
            $('#defaultdatafileexpiry').val(this.#configManager.getValue('settings.defaultdatafileexpiry'));
            $('#oe-default-font-colour').val(this.#configManager.getValue('settings.defaultfontcolour'));
            $('#defaultnoradids').val(this.#configManager.getValue('settings.defaultnoradids'));
            $('#defaultincludeplanets').prop('checked', this.#configManager.getValue('settings.defaultincludeplanets'));
            $('#defaultincludesun').prop('checked', this.#configManager.getValue('settings.defaultincludesun'));
            $('#defaultincludemoon').prop('checked', this.#configManager.getValue('settings.defaultincludemoon'));


            $('#oe-default-font-colour').spectrum({
                type: 'color',
                showInput: true,
                showInitial: true,
                showAlpha: false
            });

            var defaultfont = this.#configManager.getValue('settings.defaultfont');

            $('#defaultfont').empty();
            this.#fonts.forEach(function (value, index, array) {
                var optionValue = value.value;
                var optionText = value.text;
                var selected = "";
                if (optionValue == defaultfont) {
                    selected = 'selected="selected"';
                }
                $('#defaultfont').append(`<option value="${optionValue}" ${selected}>${optionText}</option>`);
            });

            $('#oe-app-options-show-grid').prop('checked', this.#configManager.gridVisible);
            $('#oe-app-options-grid-size option[value=' + this.#configManager.gridSize + ']').attr('selected', 'selected');
            $('#oe-app-options-grid-opacity').val(this.#configManager.gridOpacity);
            $('#oe-app-options-snap-background').prop('checked', this.#configManager.snapBackground);
            $('#oe-app-options-add-list-size option[value=' + this.#configManager.addListPageSize + ']').attr('selected', 'selected');
            $('#oe-app-options-add-field-opacity').val(this.#configManager.addFieldOpacity);
            $('#oe-app-options-select-field-opacity').val(this.#configManager.selectFieldOpacity);
            $('#oe-app-options-mousewheel-zoom').prop('checked', this.#configManager.mouseWheelZoom);
            $('#oe-app-options-background-opacity').val(this.#configManager.backgroundImageOpacity);
            $('#oe-app-options-debug').prop('checked', this.#debugMode);


            $('#optionsdialog').modal({
                keyboard: false
            });

            $('a[href="#configoptions"]').tab('show');

        });

        $(document).on('click', '#oe-defaults-save', (event) => {
            let defaultImagOpacity = $('#defaultimagetopacity').val() / 100;
            let defaultImagRotation = $('#defaultimagerotation').val() | 0;
            let defaultFontSize = $('#defaultfontsize').val() | 0;
            let defaultTextRotation = $('#defaulttextrotation').val() | 0;
            let defaultFont = $("#defaultfont option").filter(":selected").val();
            let defaultFontOpacity = $('#defaultfontopacity').val() / 100;
            let defaultFontColour = $('#oe-default-font-colour').val();
            let defaultdatafileexpiry = $('#defaultdatafileexpiry').val();
            let defaultnoradids = $('#defaultnoradids').val();
            let defaultincludeplanets = $('#defaultincludeplanets').prop('checked');
            let defaultincludesun = $('#defaultincludesun').prop('checked');
            let defaultincludemoon = $('#defaultincludemoon').prop('checked');


            this.#configManager.setValue('settings.defaultimagetopacity', defaultImagOpacity);
            this.#configManager.setValue('settings.defaultimagerotation', defaultImagRotation);
            this.#configManager.setValue('settings.defaultfontsize', defaultFontSize);
            this.#configManager.setValue('settings.defaultfontopacity', defaultFontOpacity);
            this.#configManager.setValue('settings.defaulttextrotation', defaultTextRotation);
            this.#configManager.setValue('settings.defaultfont', defaultFont);
            this.#configManager.setValue('settings.defaultfontcolour', defaultFontColour);
            this.#configManager.setValue('settings.defaultdatafileexpiry', defaultdatafileexpiry);
            this.#configManager.setValue('settings.defaultnoradids', defaultnoradids);
            this.#configManager.setValue('settings.defaultincludeplanets', defaultincludeplanets);
            this.#configManager.setValue('settings.defaultincludemoon', defaultincludemoon);
            this.#configManager.setValue('settings.defaultincludesun', defaultincludesun);

            this.#configManager.gridVisible = $('#oe-app-options-show-grid').prop('checked');
            this.#configManager.gridSize = $("#oe-app-options-grid-size option").filter(":selected").val();
            this.#configManager.gridOpacity = $('#oe-app-options-grid-opacity').val() | 0;
            this.#configManager.snapBackground = $('#oe-app-options-snap-background').prop('checked');
            this.#configManager.addListPageSize = $("#oe-app-options-add-list-size option").filter(":selected").val();
            this.#configManager.addFieldOpacity = $('#oe-app-options-add-field-opacity').val() | 0;
            this.#configManager.selectFieldOpacity = $('#oe-app-options-select-field-opacity').val() | 0;
            this.#configManager.mouseWheelZoom = $('#oe-app-options-mousewheel-zoom').prop('checked');
            this.#configManager.backgroundImageOpacity = $('#oe-app-options-background-opacity').val() | 0;
            this.#debugMode = $('#oe-app-options-debug').prop('checked');

            this.drawGrid();
            this.updateBackgroundImage();

            this.#configManager.saveSettings();
            this.#fieldManager.defaultsModified();

            $('#optionsdialog').modal('hide');
            this.updateToolbar();
        });

        $(document).on('click', '#oe-font-dialog-add-font', (event) => {
            if (this.#fieldManager.dirty) {
                if (window.confirm('This current configuration has been modified. If you continue any chnages will be lost. Would you like to continue?')) {
                    this.installFont();
                }
            } else {
                this.installFont();
            }

        });

        $(document).on('click', '#oe-font-dialog-upload-font', (event) => {
            if (this.#fieldManager.dirty) {
                if (window.confirm('This current configuration has been modified. If you continue any chnages will be lost. Would you like to continue?')) {
                    this.uploadFont();
                }
            } else {
                this.uploadFont();
            }

        });

        $(document).on('click', '#oe-upload-font', (event) => {
            $('#fontlisttable').DataTable().destroy();
            $('#fontlisttable').DataTable({
                ajax: 'includes/overlayutil.php?request=Fonts',
                dom: '<"toolbar">frtip',
                autoWidth: false,
                pagingType: 'simple_numbers',
                paging: true,
                pageLength: 20,
                info: false,
                searching: false,
                order: [[0, 'asc']],
                columns: [
                    {
                        data: 'name',
                        width: '150px'
                    }, {
                        data: 'path',
                        width: '150px',
                        render: function (item, type, row, meta) {
                            if (item.includes('msttcorefonts')) {
                                return 'System Font';
                            } else {
                                return item;
                            }
                        }
                    }, {
                        data: null,
                        width: '100px',
                        render: function (item, type, row, meta) {

                            let config = window.oedi.get('config');
                            let defaultFont = config.getValue('settings.defaultfont');

                            let buttons = '';
                            if (item.name !== 'moon_phases' && item.name !== defaultFont && !item.path.includes('msttcorefonts')) {
                                buttons += '&nbsp; <button type="button" class="btn btn-danger btn-xs oe-list-font-delete" data-fontname="' + item.name + '"><i class="fa-solid fa-trash"></i></button>';
                                buttons += '</div>';
                            }
                            return buttons;
                        }
                    }

                ]
            });

            $('#fontlistdialog').modal({
                keyboard: false,
                width: 600
            })
        });

        $(document).on('click', '.oe-list-font-delete', (event) => {
            event.stopPropagation();
            if (window.confirm('Are you sure you wish to delete this font? If the font is in use then all fields will be set to the default font.')) {
                let fontName = $(event.currentTarget).data('fontname');
                if (fontName !== 'undefined') {
                    let uiManager = window.oedi.get('uimanager');
                    uiManager.deleteFont(fontName);
                }
            }
        });

        $(document).on('click', '.oe-zoom', (event) => {
            this.setZoom(event.currentTarget.id);
        });

        $(document).on('click', '#oe-show-image-manager', (event) => {

            let usedImages = [];
            fields = this.#configManager.getValue('images', {});
            for (let index in fields) {
                let field = fields[index];
                let fileName = field.image;
                if (!usedImages.includes(fileName)) {
                    usedImages.push(fileName);
                }
            }

            $('#oe-image-manager').oeImageManager({
                thumbnailURL: 'includes/overlayutil.php?request=Images',
                usedImages: usedImages
            });
            $('#oe-file-manager-dialog').modal({
                keyboard: false
            });

            $('#oe-file-manager-dialog').on('hidden.bs.modal', () => {
                $('#oe-image-manager').data('oeImageManager').destroy();
            });

        });

        $(document).on('oe-imagemanager-add', (event, image) => {
            let shape = this.#fieldManager.addField('image', '', null, null, null, image);
            this.#overlayLayer.add(shape);
            this.#selected = this.#fieldManager.findField(shape);
            this.showPropertyEditor();
            this.updatePropertyEditor();
            this.updateToolbar();
        });

        $(document).on('click', '#oe-toobar-debug-button', (event) => {

            let data = JSON.stringify(this.#configManager.config);
            $('#oe-debug-dialog-overlay').val(data);
            data = JSON.stringify(this.#configManager.dataFields);
            $('#oe-debug-dialog-fields').val(data);
            data = JSON.stringify(this.#configManager.appConfig);
            $('#oe-debug-dialog-config').val(data);

            $('#oe-debug-dialog').modal({
                keyboard: false
            });
        });

        $('.modal').on('shown.bs.modal', this.alignModal);

        $(window).on('resize', (event) => {
            $('.modal:visible').each(this.alignModal);
        });

        $('[data-toggle="tooltip"]').tooltip();

        this.drawGrid();
        this.updateBackgroundImage();
        this.updateToolbar();
    }

    #saveConfig() {
        this.#fieldManager.buildJSON();
        this.#configManager.saveConfig1();
        this.#fieldManager.clearDirty();
        this.updateToolbar();
    }

    #deleteField(event) {
        let shape = this.#selected.shape;
        this.hidePropertyEditor();
        this.#fieldManager.deleteField(shape.id());
        this.#transformer.nodes([]);
        shape.destroy();
        this.setFieldOpacity(false);
        this.#selected = null;
        this.setFieldOpacity(false);

        this.updateToolbar();
    }

    setZoom(type) {
        this.#stageMode = '';
        switch (type) {
            case 'oe-zoom-in':
                this.#stageScale += 0.01;
                this.#oeEditorStage.draggable(true);
                break;

            case 'oe-zoom-out':
                this.#stageScale -= 0.01;
                this.#oeEditorStage.draggable(true);
                break;

            case 'oe-zoom-full':
                this.#stageScale = 1;
                this.#oeEditorStage.draggable(true);
                break;

            case 'oe-zoom-fit':
                let width = $('#oe-viewport').width();
                if (this.#backgroundImage.width() > width) {
                    this.#stageScale = width / this.#backgroundImage.width();
                    this.#oeEditorStage.position({ x: 0, y: 0 });
                    this.#oeEditorStage.draggable(false);
                    this.#stageMode = 'fit';
                } else {
                    this.#stageScale = 1;
                    this.#oeEditorStage.draggable(false);
                }
                break;
        }

        this.#oeEditorStage.scale({ x: this.#stageScale, y: this.#stageScale });
    }

    loadBackgroundImage() {
        var imageObj = new Image();
        imageObj.src = $('#oe-background-image').attr('src');

        const load = url => new Promise(resolve => {
            imageObj.onload = () => resolve({ imageObj })
            imageObj.src = url
        });

        (async () => {
            const { imageObj } = await load($('#oe-background-image').attr('src'));
        })();

        this.#backgroundImage = new Konva.Image({
            x: 0,
            y: 0,
            image: imageObj,
        });
    }

    updateToolbar() {
        if (this.#selected === null) {
            $('#oe-delete').addClass('disabled');
            $('#oe-delete').removeClass('green');
        } else {
            $('#oe-delete').removeClass('disabled');
            $('#oe-delete').addClass('green');
        }

        if (this.#fieldManager.dirty) {
            $('#oe-save').removeClass('disabled');
            $('#oe-save').addClass('green pulse');
        } else {
            $('#oe-save').addClass('disabled');
            $('#oe-save').removeClass('green pulse');
        }

        if (this.#debugMode) {
            $('#oe-toolbar-debug').removeClass('hidden')
        } else {
            $('#oe-toolbar-debug').addClass('hidden')
        }
    }

    /**
     * Vertically align a Boostrap modal in the window. This makes the dialogs
     * far easier to see and use.
     */
    alignModal() {
        //let modalDialog = $(this).find(".modal-dialog");

        // Applying the top margin on modal to align it vertically center
        //modalDialog.css("margin-top", Math.max(0, ($(window).height() - modalDialog.height()) / 2));
    }

    uploadFont() {
        $('#fontuploadfile').val('');
        $('#fontuploadsubmit').addClass('disabled');
        $('#fontuploadalert').addClass('hidden');

        $('#fontuploaddialog').modal({
            keyboard: false,
            width: 600
        });

        $('#fontuploadfile').change(function() {
            $('#fontuploadalert').addClass('hidden');

            var file = this.files[0];
            var fileType = file.type;
            var match = ['application/zip', 'application/zip-compressed', 'application/x-zip-compressed', 'application/x-zip'];
            if(!((fileType == match[0]) || (fileType == match[1]) || (fileType == match[2]) || (fileType == match[3]) )){
                alert('Sorry, only zip files are allowed.');
                $('#fontuploadfile').val('');
                $('#fontuploadsubmit').addClass('disabled');
                return false;
            }
            $('#fontuploadsubmit').removeClass('disabled');
        });

        $('#fontuploadsubmit').on('click', (e) => {
            e.preventDefault();
            $.ajax({
                type: 'POST',
                url: 'includes/overlayutil.php?request=fonts',
                data: new FormData(document.getElementById('fontuploadform')),
                contentType: false,
                dataType: 'json',
                cache: false,
                processData:false,
                context: this,
                beforeSend: function( xhr ) {
                    $('.fontuploadsubmit').attr('disabled','disabled');
                    $('#fontuploadform').css('opacity','.5');
                }                
            }).done( (fontData) => {
                $('#fontuploadform').css('opacity','');
                $('.fontuploadsubmit').removeAttr('disabled');
                for (let i = 0; i < fontData.length; i++) {
                    let fontFace = new FontFace(fontData[i].key, 'url(' + window.oedi.get('BASEDIR') + fontData[i].path + ')');
                    fontFace.load();
                    document.fonts.add(fontFace);
                }

                document.fonts.ready.then((font_face_set) => {
                    this.setupFonts();
                    $('#fontlisttable').DataTable().ajax.reload();
                    let result = $.ajax({
                        type: "GET",
                        url: "includes/overlayutil.php?request=Config",
                        data: "",
                        dataType: 'json',
                        cache: false,
                        context: this
                    }).done((data) => {
                        this.#configManager.config = data;
                    });
                });                

                $('#fontuploaddialog').modal('hide');                
            }).fail( (jqXHR, error, errorThrown) => {
                $('#fontuploadform').css('opacity','');
                $('#fontuploadalert').removeClass('hidden');
                $('#fontuploadsubmit').addClass('disabled');                
            });
        });

    }

    installFont() {
        bootbox.prompt('Enter the URL of the font from daFont.com', (fontURL) => {
            if (fontURL !== '') {
                $.ajax({
                    url: 'includes/overlayutil.php?request=fonts',
                    type: 'POST',
                    data: { fontURL: fontURL },
                    dataType: 'json',
                    context: this
                }).done((fontData) => {

                    for (let i = 0; i < fontData.length; i++) {
                        let fontFace = new FontFace(fontData[i].key, 'url(' + window.oedi.get('BASEDIR') + fontData[i].path + ')');
                        fontFace.load();
                        document.fonts.add(fontFace);
                    }

                    document.fonts.ready.then((font_face_set) => {
                        this.setupFonts();
                        $('#fontlisttable').DataTable().ajax.reload();
                        let result = $.ajax({
                            type: "GET",
                            url: "includes/overlayutil.php?request=Config",
                            data: "",
                            dataType: 'json',
                            cache: false,
                            context: this
                        }).done((data) => {
                            this.#configManager.config = data;
                        });
                    });
                }).fail(function (jqXHR, textStatus, errorThrown) {
                    bootbox.alert('Please enter a valid url from daFont.com ' + errorThrown);
                }).fail((jqXHR, textStatus, errorThrown) => {
                });
            }
        });
    }

    setFieldOpacity(state, ignoreId) {
        let opacity = this.#configManager.addFieldOpacity / 100;
        if (typeof ignoreId !== 'undefined') {
            opacity = this.#configManager.selectFieldOpacity / 100;
        }
        let shapes = this.#overlayLayer.getChildren();
        for (let key in shapes) {
            let type = shapes[key].getClassName();

            let skip = false;
            if (typeof ignoreId !== 'undefined') {
                if (shapes[key].id() === ignoreId) {
                    skip = true;
                }
            }

            if (!skip) {
                if (type === 'Image' || type === 'Text') {
                    if (state) {
                        shapes[key].opacity(opacity);
                    } else {
                        let field = this.#fieldManager.findField(shapes[key]);
                        shapes[key].opacity(field.opacity);
                    }
                }
            }
        }
    }

    drawGrid() {
        this.#gridLayer.destroyChildren();
        if (this.#configManager.gridVisible) {
            if (this.#configManager.gridSize > 0) {
                let stepSize = this.#configManager.gridSize;

                let xSize = this.#oeEditorStage.width(),
                    ySize = this.#oeEditorStage.height(),
                    xSteps = Math.round(xSize / stepSize),
                    ySteps = Math.round(ySize / stepSize);

                for (let i = 0; i <= xSteps; i++) {
                    this.#gridLayer.add(
                        new Konva.Line({
                            x: i * stepSize,
                            points: [0, 0, 0, ySize],
                            stroke: 'rgba(255, 255, 255, ' + (this.#configManager.gridOpacity / 100).toString() + ')',
                            strokeWidth: 1,
                        })
                    );
                }

                for (let i = 0; i <= ySteps; i++) {
                    this.#gridLayer.add(
                        new Konva.Line({
                            y: i * stepSize,
                            points: [0, 0, xSize, 0],
                            stroke: 'rgba(255, 255, 255, ' + (this.#configManager.gridOpacity / 100).toString() + ')',
                            strokeWidth: 1,
                        })
                    );
                }
            }
        }
    }

    updateBackgroundImage() {
        this.#backgroundLayer.opacity(this.#configManager.backgroundImageOpacity / 100);
    }

    showPropertyEditor() {
        if (this.#selected instanceof OETEXTFIELD) {
            this.#createTextPropertyEditor();
            this.updatePropertyEditor();
        } else {
            $.ajax({
                url: 'includes/overlayutil.php?request=Images',
                type: 'GET',
                dataType: 'json',
                cache: false,
                context: this
            }).done((result) => {
                this.#imageCache = result;
                this.#createImagePropertyEditor();
                this.updatePropertyEditor();
            });
        }
    }

    hidePropertyEditor() {
        if (this.#selected instanceof OETEXTFIELD) {
            if ($("#textdialog").hasClass('ui-dialog-content')) {
                $('#textdialog').dialog('close');
                $('#textpropgrid').jqPropertyGrid('Destroy');
                try {
                    $('#oe-default-font-colour').spectrum('Destroy');
                } catch (error) { }
            }
        } else {
            if ($("#imagedialog").hasClass('ui-dialog-content')) {
                $('#imagepropgrid').jqPropertyGrid('Destroy');
                $('#imagedialog').dialog('close');
            }
        }

    }

    updatePropertyEditor() {
        if (this.#selected !== null) {
            if (this.#selected instanceof OETEXTFIELD) {
                $('#textpropgrid').jqPropertyGrid('set', {
                    'label': this.#selected.label,
                    'format': this.#selected.format,
                    'sample': this.#selected.sample,
                    'empty': this.#selected.empty,
                    'x': this.#selected.x,
                    'y': this.#selected.y,
                    'fontsize': this.#selected.fontsize,
                    'fontname': this.#selected.fontname,
                    'opacity': this.#selected.opacity,
                    'rotation': this.#selected.rotation,
                    'fill': this.#selected.fill
                });
            } else {
                $('#imagepropgrid').jqPropertyGrid('set', {
                    'x': this.#selected.x,
                    'y': this.#selected.y,
                    'image': this.#selected.image,
                    'opacity': this.#selected.opacity,
                    'rotation': this.#selected.rotation,
                    'scale': this.#selected.scale
                });
            }
        }
    }

    /**
     * Build an internal list of all available fonts. This is used for the drop downs on the 
     * text field property editor.
     */
    setupFonts() {
        this.#fonts = [];

        /** Add our fonts */
        let fontList = Array.from(document.fonts);
        for (let i=0; i<fontList.length; i++) {
            let fontFace = fontList[i];
            this.#fonts.push({ 'value': fontFace.family, 'text': fontFace.family });
        };

        /** Add Web safe fonts */
        this.#fonts.push({ 'value': 'Arial', 'text': 'Arial (sans-serif)' });
        this.#fonts.push({ 'value': 'Arial Black', 'text': 'Arial Black (sans-serif)' });
        this.#fonts.push({ 'value': 'Times New Roman', 'text': 'Times New Roman (serif)' });
        this.#fonts.push({ 'value': 'Courier New', 'text': 'Courier (monospace)' });
        this.#fonts.push({ 'value': 'Verdana', 'text': 'Verdana (sans-serif)' });
        this.#fonts.push({ 'value': 'Trebuchet MS', 'text': 'Trebuchet MS (sans-serif)' });
        this.#fonts.push({ 'value': 'Impact', 'text': 'Impact (sans-serif)' });
        this.#fonts.push({ 'value': 'Georgia', 'text': 'Georgia (serif)' });
        this.#fonts.push({ 'value': 'Comic Sans MS', 'text': 'Comic Sans MS (cursive)' });
    }

    deleteFont(fontName) {
        let fontToDelete = null;
        for (let fontFace of document.fonts.values()) {
            if (fontFace.family == fontName) {
                fontToDelete = fontFace;
                break;
            }
        }

        if (fontToDelete !== null) {
            $.LoadingOverlay('show');
            let result = document.fonts.delete(fontToDelete);
            if (result) {
                $.ajax({
                    type: 'POST',
                    url: 'includes/overlayutil.php?request=Config',
                    data: { config: JSON.stringify(this.#configManager.config) },
                    cache: false
                }).done((result) => {
                    $.ajax({
                        url: 'includes/overlayutil.php?request=font&fontName=' + fontName,
                        type: 'DELETE',
                        context: this
                    }).done((result) => {
                        this.#fieldManager.switchFontUsed(fontName);
                        //this.#fieldManager.buildJSON();
                        this.#configManager.deleteValue('fonts.' + fontName);
                        $.ajax({
                            type: 'POST',
                            url: 'includes/overlayutil.php?request=Config',
                            data: { config: JSON.stringify(this.#configManager.config) },
                            cache: false
                        }).done((result) => {
                            $('#fontlisttable').DataTable().ajax.reload();
                            $.LoadingOverlay('hide');
                        });
                    }).fail((jqXHR, textStatus, errorThrown) => {
                        $.LoadingOverlay('hide');
                    });
                }).fail((jqXHR, textStatus, errorThrown) => {
                    $.LoadingOverlay('hide');
                });
            } else {
                $.LoadingOverlay('hide');
            }
        }
    }

    #createTextPropertyEditor() {
        var textData = {
            label: '',
            format: '',
            sample: '',
            empty: '',
            x: 0,
            y: 0,
            rotation: 0,
            fontname: 'df',
            fontsize: 32,
            opacity: 1,
            fill: '#ffffff'
        };

        var textConfig = {
            label: { group: 'Label', name: 'Item', type: 'text' },
            format: { group: 'Label', name: 'Format', type: 'text'},
            sample: { group: 'Label', name: 'Sample', type: 'text' },
            empty: { group: 'Label', name: 'Empty Value', type: 'text' },

            x: { group: 'Position', name: 'X', type: 'number', options: { min: 0, max: 2048, step: 10 } },
            y: { group: 'Position', name: 'Y', type: 'number', options: { min: 0, max: 2048, step: 10 } },
            rotation: { group: 'Position', name: 'Rotation', type: 'number', options: { min: -360, max: 360, step: 1 } },

            fontname: { group: 'Font', name: 'Name', type: 'options', options: this.#fonts },
            fontsize: { group: 'Font', name: 'Size', type: 'number', options: { min: 4, max: 256, step: 4 } },
            opacity: { group: 'Font', name: 'Opacity', type: 'number', options: { min: 0, max: 1, step: 0.1 } },
            fill: {
                group: 'Font', name: 'Colour', type: 'color', options: {
                    preferredFormat: 'hex',
                    type: "color",
                    showInput: true,
                    showInitial: true,
                    showAlpha: false
                }
            },
        };

        function propertyChangedCallback(grid, name, value) {
            let uiManager = window.oedi.get('uimanager'); // YUK
            let field = uiManager.selected;

            // TODO: Check setter actually exists

            field[name] = value;

            // If we are in test mode then re enable it after the field has ben updated
            if (uiManager.testMode) {
                uiManager.enableTestMode();
            }
            uiManager.updateToolbar();

        }

        var options = {
            meta: textConfig,
            prefix: 'text',
            callback: propertyChangedCallback,
        };

        $('#textpropgrid').jqPropertyGrid(textData, options);
        $('#textdialog').dialog({
            resizable: false,
            closeOnEscape: false,
            width: 350,
            beforeClose: function (event, ui) {
                let uiManager = window.oedi.get('uimanager');
                uiManager.selected = null;
                uiManager.setFieldOpacity(false);
            }
        });
    }

    #createImagePropertyEditor() {
        let imageData = {
            image: '',
            x: 0,
            y: 0,
            rotation: 0,
            opacity: 0,
            scale: 0
        };

        let images = [];
        images.push({
            value: 'missing',
            text: 'Select Image'
        });
        for (let index in this.#imageCache) {
            images.push({
                value: this.#imageCache[index].filename,
                text: this.#imageCache[index].filename
            });
        }

        let imageConfig = {
            image: { group: 'Image', name: 'Image', type: 'options', options: images },
            //image: { group: 'Image', name: 'Image', type: 'text' },
            //fontname: { group: 'Font', name: 'Name', type: 'options', options: this.#fonts },

            x: { group: 'Position', name: 'X', type: 'number', options: { min: 0, max: 2048, step: 10 } },
            y: { group: 'Position', name: 'Y', type: 'number', options: { min: 0, max: 2048, step: 10 } },

            rotation: { group: 'Position', name: 'Rotation', type: 'number', options: { min: -360, max: 360, step: 1 } },
            opacity: { group: 'Position', name: 'Opacity', type: 'number', options: { min: 0, max: 1, step: 0.1 } },

            scale: { group: 'Size', name: 'Scale', type: 'number', options: { min: 0, max: 10, step: 0.1 } },

        };

        function propertyChangedCallback(grid, name, value) {
            let uiManager = window.oedi.get('uimanager'); // YUK
            let field = uiManager.selected;

            // TODO: Check setter actually exists
            if (name !== 'image') {
                field[name] = value;
            } else {
                field.setImage(value).then( () => {
                    uiManager.transformer.forceUpdate();
                });
            }

            

            uiManager.updateToolbar();
        }

        var options = {
            meta: imageConfig,
            prefix: 'image',
            helpHtml: '[?]',
            callback: propertyChangedCallback,
        };

        $('#imagepropgrid').jqPropertyGrid(imageData, options);
        $('#imagedialog').dialog({
            resizable: false,
            closeOnEscape: false,
            beforeClose: function (event, ui) {
                let uiManager = window.oedi.get('uimanager');
                uiManager.selected = null;
            }
        });
    }

    enableTestMode() {
        this.testMode = true;
        this.#fieldManager.enableTestMode();
    }

    disableTestMode() {
        this.testMode = false;
        this.#fieldManager.disableTestMode();
    }
}