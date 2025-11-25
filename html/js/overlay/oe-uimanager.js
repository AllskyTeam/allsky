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
    #imageCache = null;
    #errorFields = [];
    #errorsTable = null;
    #selectionLayer = null;
    #selectionRect = null;
    #selectionActive = false;

    #fieldTable = null;
    #allFieldTable = null;

    #debugMode = false;
    #debugPosMode = false;

    #selectionStart = null;

    #drawLayer = null
    #drawStart = null
    #drawRect = null
    #drawRectStartX = 0
    #drawRectStartY = 0

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
                
        this.#selectionLayer = new Konva.Layer();
        this.#selectionRect = new Konva.Rect({
            fill: 'rgba(0, 161, 255, 0.3)',
            visible: false,
        });
        this.#selectionLayer.add(this.#selectionRect);
        this.#oeEditorStage.add(this.#selectionLayer);

        this.#backgroundLayer = new Konva.Layer();
        this.#backgroundLayer.add(this.#backgroundImage);
        this.#oeEditorStage.add(this.#backgroundLayer);

        this.#gridLayer = new Konva.Layer();
        this.#overlayLayer = new Konva.Layer();
        this.#drawLayer = new Konva.Layer();
        this.#oeEditorStage.add(this.#drawLayer);
        this.#oeEditorStage.add(this.#overlayLayer);
        this.#oeEditorStage.add(this.#gridLayer);

        this.#drawRect = new Konva.Rect({
            fill: 'rgba(0, 0, 0, 0.5)',
            stroke: 'red',
            strokeWidth: 10,
            visible: false
        })
        this.#drawLayer.add(this.#drawRect)

        this.#oeEditorStage.on('mousemove', (e) => {
            let mousePos = this.#oeEditorStage.getPointerPosition();
            this.updateDebugWindowMousePos(mousePos.x, mousePos.y);
            this.updateDebugWindow();
        });

        let params = this.getQueryParams(window.location.href);

        if (params.hasOwnProperty('debug')) {
            if (params.debug == 'true') {
                localStorage.setItem('debugMode', 'true');
            } else {
                localStorage.setItem('debugMode', 'false');
            }
        }

        if (params.hasOwnProperty('debugpos')) {
            if (params.debugpos == 'true') {
                localStorage.setItem('debugpos', 'true');
            } else {
                localStorage.setItem('debugpos', 'false');
            }
        }

        this.#debugMode = localStorage.getItem('debugMode') === 'true' ? true: false;
        this.#debugPosMode = localStorage.getItem('debugpos') === 'true' ? true: false;
    }

    getQueryParams(url) {
        const paramArr = url.slice(url.indexOf('?') + 1).split('&');
        const params = {};
        paramArr.map(param => {
            const [key, val] = param.split('=');
            params[key] = decodeURIComponent(val);
        })
        return params;
    }

    get dirty() {
        let result = false;
        if (this.#fieldManager.dirty || this.#configManager.dirty) {
            result = true;
        }

        return result;
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

    get editorStage() {
        return this.#oeEditorStage;
    }

    get transformer() {
        return this.#transformer;
    }

    #resizeWindow() {
        if (this.#stageMode === 'fit') {
            this.setZoom('oe-zoom-fit');
        }
    }

    resetUI() {

        $(window).off('resize');
        this.#oeEditorStage.off('dragmove')
        this.#oeEditorStage.off('wheel');
        this.#oeEditorStage.off('click tap');
        this.#overlayLayer.off('dblclick dbltap');
        this.#overlayLayer.off('dragstart');
        this.#overlayLayer.off('dragmove');
        this.#overlayLayer.off('dragend');
    
        $(document).off('dblclick', '.draggable');
        $(document).off('click', '#oe-item-list');
        $(document).off('click', '.oe-list-delete');
        $(document).off('click', '.oe-all-list-add');
        $(document).off('click', '.oe-list-add');
        $(document).off('click', '#oe-field-dialog-add-field');
        $(document).off('click', '.oe-list-edit');
        $(document).off('click', '#oe-field-save');
        $(document).off('click', '#oe-item-list-dialog-save');
        $(document).off('click', '#oe-item-list-dialog-close');
        $(document).off('click', '#oe-save');
        $(document).off('click', '#oe-test-mode');
        $(document).off('click', '#oe-delete');
        $(document).off('click', '#oe-add-text');
        $(document).off('click', '#oe-add-image');
        $(document).off('click', '#oe-options');
        $('#optionsdialog a[data-toggle="tab"]').off('shown.bs.tab');
        $(document).off('click', '#optionsdialognewoverlay');
        $(document).off('click', '.oe-options-overlay-edit');
        $(document).off('click', '#oe-defaults-save');
        $(document).off('click', '#oe-font-dialog-add-font');
        $(document).off('click', '#oe-font-dialog-upload-font');
        $(document).off('click', '#oe-upload-font');
        $(document).off('click', '.oe-list-font-delete');
        $(document).off('click', '.oe-zoom');
        $(document).off('click', '#oe-show-image-manager');
        $(document).off('oe-imagemanager-add');
        $(document).off('click', '#oe-toobar-debug-button');
        $('.modal').off('shown.bs.modal');
        $(window).off('resize');
        $(document).off('click', '#oe-field-errors');
        $(document).off('click', '#oe-field-errors-dialog-close');
        $(document).off('click', '.oe-field-errors-dialog-delete');
        $(document).off('click', '.oe-field-errors-dialog-fix');
        $(document).off('oe-config-updated');
        $(document).off('click','#oe-show-overlay-manager');
        $(document).off('addFields');
        $('#textpropgrid').off('focusin', '#pgtextlabel, #pgtextformat, #pgtextsample, #pgtextempty');
        $('#textpropgrid').off('focusout', '#pgtextlabel, #pgtextformat, #pgtextsample, #pgtextempty');

        this.#overlayLayer.destroyChildren();
        this.#transformer = new Konva.Transformer({
            resizeEnabled: false
        });
        this.#overlayLayer.add(this.#transformer);        

        this.setZoom('oe-zoom-fit');

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

        this.#transformer.off('transformend');

        $(document).on('oe-uimanager-fonts-loaded', (e, data) => {
            this.setupFonts()
            this.#drawLayer.draw();
            this.#overlayLayer.draw();
        });

    }

    addFields() {
        this.#fieldManager.parseConfig();

        let fields = this.#fieldManager.fields;
        for (let [fieldName, field] of fields.entries()) {
            let object = field.shape;

            if (field.fieldType === 'rect') {
                this.#drawLayer.add(object)
            } else {
                this.#overlayLayer.add(object)
            }
        }
    }

    buildUI() {
        this.resetUI()
        this.setupFonts()

        this.addFields()

        this.setupToolbarEvents()
        this.setupDragAndDrop()
        this.setupErrorsEvents()
        this.setupFontEvents()
        this.setupGenericEvents()
        this.setupVariableManagerEvents()
        this.setupOptionsDialogEvents()
        this.setupOverlayManagerEvents()
        this.setupImageManagerEvents()

        this.updateDebugWindow()
        this.drawGrid()
        this.updateBackgroundImage()
        this.setupDebug()
        this.updateToolbar()
        this.checkFieldstimer()

        $('[data-toggle="tooltip"]').tooltip()
        $('.modal').on('shown.bs.modal', this.alignModal)
    }

    setupImageManagerEvents() {
        $(document).on('click', '#oe-show-image-manager', (event) => {

            let usedImages = [];
            let fields = this.#configManager.getValue('images', {});
            for (let index in fields) {
                let field = fields[index];
                let fileName = field.image;
                if (!usedImages.includes(fileName)) {
                    usedImages.push(fileName);
                }
            }

            $(document).oeImageManager({
                thumbnailURL: 'includes/overlayutil.php?request=Images',
                usedImages: usedImages,
                showMaskCreation: true
            });
            //$('#oe-file-manager-dialog').modal({
            //    keyboard: false
            //});

            //$('#oe-file-manager-dialog').on('hidden.bs.modal', () => {
            //    $('#oe-image-manager').data('oeImageManager').destroy();
            //});

        });

        $(document).on('oe-imagemanager-add', (event, image) => {
            let shape = this.#fieldManager.addField('image', '', null, null, null, image);
            this.#overlayLayer.add(shape);
            this.#selected = this.#fieldManager.findField(shape);
            this.showPropertyEditor();
            this.updatePropertyEditor();
            this.updateToolbar();
        });
    }

    setupOverlayManagerEvents() {
        $(document).on('click', '#optionsdialognewoverlay', (event) => {
            $('#oe-overlay-manager').data('allskyMM').show();
            $('#oe-overlay-manager').data('allskyMM').showNew();            
            $('#optionsdialog').modal('hide');
        });

        $(document).on('click', '.oe-options-overlay-edit', (event) => {
            let fileName = $(event.currentTarget).data('filename');
            $('#oe-overlay-manager').data('allskyMM').show();
            $('#oe-overlay-manager').data('allskyMM').setSelected(fileName);
            $('#optionsdialog').modal('hide');
        });
    }

    setupGenericEvents() {

        if (!this.#debugMode) {
            let selectedOverlay = this.#configManager.selectedOverlay
            if (selectedOverlay.type === 'allsky') {
                $('#oe-overlay-disable').removeClass('hidden')
            } else {
                $('#oe-overlay-disable').addClass('hidden')
            }
        } else {
            $('#oe-overlay-disable').addClass('hidden')
        }

        $(window).on('resize', (event) => {
            this.#resizeWindow()
        })


        jQuery(window).bind('beforeunload', ()=> {
            if (this.#fieldManager.dirty || this.#configManager.dirty) {
                return ' '
            } else {
                return undefined
            }
        })

        $(window).on('resize', (event) => {
            $('.modal:visible').each(this.alignModal)
        })

        $(document).on('oe-config-updated', (e) => {
            this.updateToolbar();
        });

        $(document).on('addFields', (e, result) => {
            this.#transformer.nodes([]);
            let templateInfo = result.fields
            if ('fields' in templateInfo) {

                let fields = templateInfo.fields;

                let fontSize = parseInt(this.#configManager.getValue('settings.defaultfontsize'), 10);
                let defaultFontName = this.#configManager.getValue('settings.defaultfont');
                let gridSize =this.#configManager.gridSize;

                if ('font' in result) {
                    defaultFontName = result.font;
                }
                if ('fontSize' in result) {
                    fontSize = parseInt(result.fontSize, 10);
                }

                function snapToGrid(value) {
                    return Math.round(value / gridSize) * gridSize;
                }

                let y = 10;
                y = snapToGrid(y)
                let cols = [];
                let rows = [];
                let row = 0;
                Object.entries(fields).forEach(([key, value]) => {
                    rows[row] = [];
                    let x = 500;
                    x = snapToGrid(x)
                    if ('text' in value) {
                        let shape = this.#fieldManager.addField('text', value.text)
                        this.#overlayLayer.add(shape)
                        let id = shape.id();
                        let field = this.#fieldManager.findField(id);
                        field.tlx = x;
                        field.tly = y;
                        field.format = value.format;
                        if (value.font !== "") {
                            field.font = value.font;
                        } else {
                            field.font = defaultFontName;
                        }
                        field.fontsize = fontSize;
                        let current = this.#transformer.nodes();
                        this.#transformer.nodes([...current, shape]); 
                    } else {
                        let col = 0;
                        Object.entries(value).forEach(([fieldkey, fieldvalue]) => {
                            if ('text' in fieldvalue) {
                                let shape = this.#fieldManager.addField('text', fieldvalue.text)
                                this.#overlayLayer.add(shape)
                                let id = shape.id();
                                let field = this.#fieldManager.findField(id);
                                field.tlx = x;
                                field.tly = y;
                                field.format = fieldvalue.format;
                                if (fieldvalue.font !== "") {
                                    field.font = fieldvalue.font;
                                } else {
                                    field.font = defaultFontName;
                                }
                                field.fontsize = fontSize;
                                x += shape.width() / this.#oeEditorStage.scaleX();
                                x = snapToGrid(x)
                                let current = this.#transformer.nodes();
                                this.#transformer.nodes([...current, shape]);
                                if (shape.width() > cols[col] || cols[col] === undefined) {
                                    cols[col] = Math.ceil(shape.width());
                                }
                                rows[row].push(field);
                                col++;
                            }        
                        });
                    }
                    row++;
                    y += fontSize;
                    y = snapToGrid(y);
                });
                           
                //this.enableTestMode(false);
//console.log(cols);
                let col = 0;
                Object.entries(cols).forEach(([col, colWidth]) => {
                    colWidth = 0;
                    Object.entries(rows).forEach(([row, fields]) => {
                        let field = fields[col];
                        if (field !== undefined) {
                            let width = Math.ceil(field.shape.width());
                            if (width > cols[col]  || cols[col]  === 0) {
                                cols[col] = width;
                            }
                        }
                    });
                    col++;
                });
//console.log(cols);



                Object.entries(rows).forEach(([row, fields]) => {
                    let x = 500;
                    Object.entries(cols).forEach(([col, colWidth]) => {
                        if (col > 0) {
                            colWidth = cols[col-1];                            
                            x += colWidth + (colWidth * 0.1);
                            let field = fields[col];
                            if (field !== undefined) {
                                field.tlx = snapToGrid(x);
                                let posx = snapToGrid(x); 
                                //console.log(`Setting row${row} col${col} to ${x} (snapped to ${posx})colwidth ${colWidth}`)
                            }
                        }
                    });
                });
            }
            //this.disableTestMode();
            this.#fieldManager.groupFields(this.#transformer)
            this.#transformer.nodes().forEach((node) => {
                const field = this.#fieldManager.findField(node.id())
                field.shape.draggable(true)
            })            
            this.#configManager.dirty = true
            this.updateToolbar();
        });        
        
        $('#textpropgrid')
        .on('focusin', '#pgtextlabel, #pgtextformat, #pgtextsample, #pgtextempty', function () {
            $(this).data('original', $(this).val());
        })
        .on('focusout', '#pgtextlabel, #pgtextformat, #pgtextsample, #pgtextempty', (e) => {
            const original = $(e.currentTarget).data('original');
            const current = $(e.currentTarget).val();

            if (original !== current) {
                if (this.testMode) {
                    this.enableTestMode();
                }
            }
        });


    }

    setupVariableManagerEvents() {
        $(document).on('click', '#oe-item-list', (event) => {
            let el = $(event.target).data('source');
            let data = $('#' + el).val();

            $.allskyVariable({
                id: 'var',
                variable: '',
				stateKey: 'as-oe',
                fonts: this.#fonts,
                defaultFont: this.#configManager.getValue('settings.defaultfont'),
                defaultFontSize: this.#configManager.getValue('settings.defaultfontsize'),
                showBlocks: true,
                variableSelected: (variable) => {
                    //let name = '${' + variable.replace('AS_', '') + '}'
                    variable = '${' + variable + '}';
                    let name = variable.replace(/^\$\{[^_]+_/, '${');
                    let field = this.#configManager.findFieldByName(name)
                    let shape = this.#fieldManager.addField('text', field.name, null, field.format, field.sample)
                    this.setFieldOpacity(true)
                    this.#overlayLayer.add(shape)
                    this.#selected = this.#fieldManager.findField(shape)
                    this.#transformer.nodes([shape])
                    this.#transformer.nodes().forEach((node) => {
                        const field = this.#fieldManager.findField(node.id())
                        field.shape.draggable(true)
                    })
                    this.showPropertyEditor()
                    this.updatePropertyEditor()
                    this.updateToolbar()
                    if (this.testMode) {
                        this.enableTestMode()
                    }
                }
            })
        })

        $(document).on('click', '#oe-add-text', (event) => {
            event.stopPropagation()
            event.preventDefault()
            let shape = this.#fieldManager.addField('text')
            this.#overlayLayer.add(shape)

            this.setFieldOpacity(true, shape.id())

            this.#selected = this.#fieldManager.findField(shape)
            this.showPropertyEditor()
            this.updatePropertyEditor()
            this.updateToolbar()
            if (this.testMode) {
                this.enableTestMode()
            }
        })

        $(document).on('click', '#oe-add-image', (event) => {
            let shape = this.#fieldManager.addField('image')
            this.#overlayLayer.add(shape)
            this.#selected = this.#fieldManager.findField(shape)
            this.showPropertyEditor()
            this.updatePropertyEditor()
            this.updateToolbar()
        })


    }

    setupToolbarEvents() {
        $(document).on('click', '#oe-left-align', (event) => {
            this.#fieldManager.leftAlignFields(this.#transformer)
            this.#configManager.dirty = true
            this.updateToolbar()
        })

        $(document).on('click', '#oe-vertical-equal', (event) => {
            this.#fieldManager.equalSpaceFields(this.#transformer)
            this.#configManager.dirty = true
            this.updateToolbar()
        })

        
        $(document).on('click', '#oe-group', (event) => {
            this.#fieldManager.groupFields(this.#transformer)
            this.#configManager.dirty = true
            this.updateToolbar()
        })

        $(document).on('click', '#oe-ungroup', (event) => {
            this.#fieldManager.unGroupFields(this.#transformer)
            this.#transformer.nodes([])
            this.#configManager.dirty = true
            this.updateToolbar()
        })

        $(document).on('click', '#oe-equal-width', (event) => {
            this.#fieldManager.equalWidth(this.#transformer)
            this.#configManager.dirty = true
            this.updateToolbar()
        })

        $(document).keyup((event) => {
            if ($(event.target)[0].nodeName == 'BODY') {
                if (event.key === 'Backspace' || event.key === 'Delete') {
                    if (this.#selected !== null) {
                        event.stopPropagation()
                        event.preventDefault()
                        this.#deleteField(event)
                        return false
                    }
                }
            }
        })

        $(document).on('click', '.oe-zoom', (event) => {
            this.setZoom(event.currentTarget.id)
        })

        $(document).on('click','#oe-show-overlay-manager', (e) => {
            $(document).trigger('oe-show-overlay-manager')
        })

        $(document).on('click', '#oe-save', (event) => {
            if (this.#fieldManager.dirty || this.#configManager.dirty) {
                this.#saveConfig()
                $(document).trigger('oe-overlay-saved');
            }
        })

        $(document).on('click', '#oe-test-mode', (event) => {
            if (this.testMode) {
                this.disableTestMode()
            } else {
                this.enableTestMode()
            }
        })

        $(document).on('click', '#oe-delete', (event) => {
            this.#deleteField(event)
        })

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
        })
    }

    setupDragAndDrop() {
        $(this.#oeEditorStage.container()).on('mousedown', (e) => {
            if (e.shiftKey) {                
                const pointer = this.#oeEditorStage.getPointerPosition()
                const transform = this.#oeEditorStage.getAbsoluteTransform().copy().invert()
                const pos = transform.point(pointer)
                this.#selectionStart = pos
                this.#selectionActive = false
            }

            if (e.altKey) {
                const pointer = this.#oeEditorStage.getPointerPosition()
                const transform = this.#oeEditorStage.getAbsoluteTransform().copy().invert()
                const pos = transform.point(pointer)
                
                this.#drawStart = pos
                this.#drawRect.position(pos)
                this.#drawRect.visible(true)
                this.#drawRectStartX = pos.x
                this.#drawRectStartY = pos.y
            }
        })
      
        $(this.#oeEditorStage.container()).on('mousemove', (e) => {
            if (this.#selectionStart) {
                if (this.#selected  !== null) return
                const transform = this.#oeEditorStage.getAbsoluteTransform().copy().invert();
                const pos = transform.point(this.#oeEditorStage.getPointerPosition());
            
                const dx = pos.x - this.#selectionStart.x;
                const dy = pos.y - this.#selectionStart.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
            
                if (!this.#selectionActive && dist > 10) {
                    this.#selectionActive = true;
                    this.#selectionRect.visible(true);
                }
            
                if (this.#selectionActive) {
                    const x = Math.min(this.#selectionStart.x, pos.x);
                    const y = Math.min(this.#selectionStart.y, pos.y);
                    const width = Math.abs(pos.x - this.#selectionStart.x);
                    const height = Math.abs(pos.y - this.#selectionStart.y);
                    this.#selectionRect.setAttrs({ x, y, width, height });

                    const box = this.#selectionRect.getClientRect()
                    this.#fieldManager.setupSelection(box, this.#transformer)
                    this.updateToolbar()
                }
            }

            if (this.#drawStart) {
                const transform = this.#oeEditorStage.getAbsoluteTransform().copy().invert()
                const pos = transform.point(this.#oeEditorStage.getPointerPosition())
                const newX = Math.min(pos.x, this.#drawRectStartX)
                const newY = Math.min(pos.y, this.#drawRectStartY)
                const newW = Math.abs(pos.x - this.#drawRectStartX)
                const newH = Math.abs(pos.y - this.#drawRectStartY)
              
                this.#drawRect.setAttrs({
                    x: newX,
                    y: newY,
                    width: newW,
                    height: newH,
                })
            }
        })
      
        $(this.#oeEditorStage.container()).on('mouseup', (e) => {
            if (this.#selectionStart) {
                if (this.#selected !== null) return
                if (this.#selectionActive) {
                    const box = this.#selectionRect.getClientRect()
                    this.#fieldManager.setupSelection(box, this.#transformer)
                    this.updateToolbar();
                    this.#selectionRect.visible(false)
                    this.#selectionStart = null
                } else {
                    this.#fieldManager.clearSelection(this.#transformer)
                    this.#selectionStart = null
                }
            }

            if (this.#drawStart) {
                this.#drawRect.visible(false)

                const transform = this.#oeEditorStage.getAbsoluteTransform().copy().invert()
                const pos = transform.point(this.#oeEditorStage.getPointerPosition())
                const newX = Math.min(pos.x, this.#drawRectStartX)
                const newY = Math.min(pos.y, this.#drawRectStartY)
                const newW = Math.abs(pos.x - this.#drawRectStartX)
                const newH = Math.abs(pos.y - this.#drawRectStartY)
              
                const field = this.#fieldManager.addField('rect', '', null, null, null, null , newX, newY, newW, newH)
                this.#drawLayer.add(field);

                this.#drawStart = false
            }
        })

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
                this.updateDebugWindow();
                return;
            }

            if (!event.target.hasName('field')) {
                return;
            }

            let shapes = this.#fieldManager.getGroupedFields(shape)

            this.#transformer.resizeEnabled(false);
            this.setTransformerState(shape);

            if (event.target.getClassName() === 'Image') {
                this.#transformer.resizeEnabled(true);
                this.#transformer.keepRatio(true);
                this.#transformer.enabledAnchors(['top-left', 'top-right', 'bottom-left', 'bottom-right']);
            }

            if (event.target.getClassName() === 'Rect') {
                this.#transformer.resizeEnabled(true);
                this.#transformer.keepRatio(false );
                this.#transformer.enabledAnchors(['top-left', 'top-right', 'bottom-left', 'bottom-right']);
            }

            if (event.evt.shiftKey) {                
                const transformerNodes = this.#transformer.nodes();
                const index = transformerNodes.indexOf(shape);
                
                if (index !== -1) {
                    transformerNodes.splice(index, 1);
                } else {
                    transformerNodes.push(shape);
                }
                this.#transformer.nodes(transformerNodes);
            } else {
                if (this.#transformer.nodes().length > 1) {
                    this.#transformer.nodes([event.target]);
                } else {
                    this.#transformer.nodes(shapes);
                }
            }

            this.#transformer.nodes().forEach((node) => {
                const field = this.#fieldManager.findField(node.id())
                field.shape.draggable(true)
            })

            this.#selected = this.#fieldManager.findField(shape);
            this.setFieldOpacity(false);
            this.setFieldOpacity(true, shape.id());

            this.#snapRectangle.offset({x: shape.width()/2, y: shape.height()/2});

            if (this.#transformer.nodes().length == 1) {
                this.updatePropertyEditor();
            }
            this.updateDebugWindow();
            this.updateToolbar();
        });

        this.#drawLayer.on('dblclick dbltap', (event) => {
            let shape = event.target;

            this.#transformer.nodes([event.target]);
                this.setFieldOpacity(true, shape.id());
                this.#selected = this.#fieldManager.findField(shape);
                $('#oe-delete').removeClass('disabled');
                this.showPropertyEditor();
        })

        this.#overlayLayer.on('dblclick dbltap', (event) => {
            let shape = event.target;


           // if (this.#transformer.nodes().length == 1) {
            this.#transformer.nodes([event.target]);
                this.setFieldOpacity(true, shape.id());
                this.#selected = this.#fieldManager.findField(shape);
                $('#oe-delete').removeClass('disabled');

                this.showPropertyEditor();
                
          //  }
        });

        this.#overlayLayer.on('dragstart', (event) => {
            this.#dragStart(event)
        });
        this.#drawLayer.on('dragstart', (event) => {
            this.#dragStart(event)
        });

        this.#overlayLayer.on('dragmove', (event) => {
            this.moveField(event);
        });
        this.#drawLayer.on('dragmove', (event) => {
            this.moveField(event);
        });

        this.#overlayLayer.on('dragend', (event) => {
            this.#dragEnd(event)
        });
        this.#drawLayer.on('dragend', (event) => {
            this.#dragEnd(event)       
        })

        this.#transformer.on('transform ', (event) => {
            this.moveField(event);
        });

        this.#transformer.on('transformend', (event) => {
            let shape = event.target;

            if (this.#selected !== null) {

                if (this.#selected instanceof OEIMAGEFIELD) {
                    this.#selected.scale = shape.scaleX();
                }

                if (this.#selected instanceof OERECTFIELD) {
                    let field = this.#fieldManager.findField(shape.id())
                    field.shape.draggable(false)
                    field.x = shape.x() | 0
                    field.y = shape.y() | 0

                    field.width = (shape.width() * shape.scaleX())| 0
                    field.height = (shape.height() * shape.scaleY()) | 0
                    shape.scaleX(1)
                    shape.scaleY(1)
                }

                if (this.#selected.id === shape.id()) {
                    let rotation = shape.rotation();
                    rotation = rotation | 0;
                    shape.rotation(rotation);
                    this.#selected.rotation = shape.rotation();
                    this.updatePropertyEditor();
                }
                this.updateToolbar();
            }

        });

        $(document).on('dblclick', '.draggable', (event) => {
            if (!$(event.target).hasClass('noclick')) {
                this.updateSelected(event.target);
            }
        });
    }

    setupErrorsEvents() {
        $(document).on('click', '#oe-field-errors', (event) => {

            this.#errorsTable = $('#fielderrorstable').DataTable({
                data: this.#errorFields,
                retrieve: true,
                autoWidth: false,
                pagingType: 'simple_numbers',
                paging: true,
                info: true,
                ordering: false,
                searching: true,
                rowId: 'id',
                pageLength: parseInt(this.#configManager.addListPageSize),
                lengthMenu: [ [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, -1], [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 'All']],
                order: [[0, 'asc']],
                columns: [
                    {
                        data: 'name',
                        width: '600px'
                    }, {
                        data: 'type',
                        width: '100px'
                    }, {
                        data: null,
                        width: '100px',
                        render: function (item, type, row, meta) {
                            let buttons = '';
                            buttons += '<button type="button" class="btn btn-primary btn-xs oe-field-errors-dialog-fix" data-id="' + item.id + '" data-type="' + item.type + '">Fix</button>';
                            buttons += '<button style="margin-left:10px;" type="button" class="btn btn-danger btn-xs oe-field-errors-dialog-delete" data-id="' + item.id + '"><i class="fa-solid fa-trash oe-field-errors-dialog-delete" data-id="' + item.id + '"></i></button>';
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

            if ($('#oe-field-errors-dialog').data('bs.modal') === undefined) {
                $('#oe-field-errors-dialog').modal({
                    keyboard: false,
                    width: 800
                })
            } else {
                $('#oe-field-errors-dialog').modal('show');
            }

            $('#oe-field-errors-dialog').on('hidden.bs.modal', (event) => {
                this.checkFields();
                $('#fielderrorstable').DataTable().destroy();
            });            
        });

        $(document).on('click', '#oe-field-errors-dialog-close', (event) => {
            $('#oe-field-errors-dialog').modal('hide');            
        });

        $(document).on('click', '.oe-field-errors-dialog-delete', (event) => {
            event.preventDefault();
            event.stopPropagation();
            let fieldId = $(event.currentTarget).data('id');
            let field = this.#fieldManager.findField(fieldId);

            let shape = field.shape;
            this.#fieldManager.deleteField(shape.id());
            shape.destroy();
            this.#errorsTable.rows('#' + fieldId).remove().draw();

            if (this.#errorsTable .rows().count() == 0) {
                $('#oe-field-errors-dialog').modal('hide');
            }    

            this.#configManager.dirty = true;
            this.updateToolbar();            
        });

        $(document).on('click', '.oe-field-errors-dialog-fix', (event) => {
            event.preventDefault();
            event.stopPropagation();
            let fieldId = $(event.currentTarget).data('id');
            let field = this.#fieldManager.findField(fieldId);

            let stageWidth = this.#oeEditorStage.width();
            let stageHeight = this.#oeEditorStage.height();
            
            field.x = (stageWidth / 2)|0;
            field.y = (stageHeight / 3)|0;

            this.#errorsTable.rows('#' + fieldId).remove().draw();

            if (this.#errorsTable .rows().count() == 0) {
                $('#oe-field-errors-dialog').modal('hide');
            }

            this.#configManager.dirty = true;
            this.updateToolbar();            
        });
          
    }

    setupFontEvents() {
        $(document).off('click', '#oe-font-dialog-add-font');
        $(document).on('click', '#oe-font-dialog-add-font', (event) => {
            if (this.#fieldManager.dirty) {
                if (window.confirm('This current configuration has been modified. If you continue any chnages will be lost. Would you like to continue?')) {
                    this.installFont();
                }
            } else {
                this.installFont();
            }
        });

        $(document).off('click', '#oe-font-dialog-upload-font');
        $(document).on('click', '#oe-font-dialog-upload-font', (event) => {
            if (this.#fieldManager.dirty) {
                if (window.confirm('This current configuration has been modified. If you continue any chnages will be lost. Would you like to continue?')) {
                    this.uploadFont();
                }
            } else {
                this.uploadFont();
            }
        });

        $(document).off('click', '#oe-font-dialog-preview');
        $(document).on('click', '#oe-font-dialog-preview', (event) => {
            $('#oe-font-preview-modal').modal({
                keyboard: false,
                width: 700
            });

            $('#oe-font-preview-modal-font-select, #oe-font-preview-modal-preview-text, #oe-font-preview-modal-font-size').off('input change')
            $('#oe-font-preview-modal-font-select, #oe-font-preview-modal-preview-text, #oe-font-preview-modal-font-size').on('input change', () => {
                const font = $('#oe-font-preview-modal-font-select').val();
                const text = $('#oe-font-preview-modal-preview-text').val().trim();
                const size = $('#oe-font-preview-modal-font-size').val() + 'px';

                $('#oe-font-preview-modal-preview-box')
                    .css({
                        'font-family': font,
                        'font-size': size
                    })
                        .text(text || 'The quick brown fox jumps over the lazy dog.');                
                    });

            const fontSelect = $('#oe-font-preview-modal-font-select');
            fontSelect.empty();

            const addedFonts = new Set();

            document.fonts.forEach(fontFace => {
            const font = fontFace.family.replace(/["']/g, '');
            if (!addedFonts.has(font)) {
                addedFonts.add(font);
                fontSelect.append($('<option></option>').val(font).text(font));
            }
            });

        });

        
        $(document).off('click', '#oe-upload-font');
        $(document).on('click', '#oe-upload-font', (event) => {
            var usedFonts = this.#configManager.getUsedFonts();
            $('#fontlisttable').DataTable().destroy();
            let fontTable = $('#fontlisttable').DataTable({
                ajax: function(data, callback, settings) {
                    $.ajax({
                        url: 'includes/overlayutil.php?request=Fonts',
                        type: 'GET',
                        dataType: 'json',
                        beforeSend: function(xhr) {
                            $.LoadingOverlay('show', {
                                text : 'Loading fonts'
                            });  
                        },
                        success: function(response) {
                            $.LoadingOverlay('hide');
                            callback(response);
                        }
                    });
                },

                dom1: '<"toolbar">lfrtip',
                dom: '<"row oe-table-header"<"col-sm-6"l><"col-sm-6"f>>rt<"row"<"col-sm-6"p>>',
                autoWidth: false,
                pagingType: 'simple_numbers',
                paging: true,
                pageLength: 20,
                info: false,
                searching: true,
                lengthMenu: [10, 20, 30, { label: 'All', value: -1 }],
                order: [[0, 'asc']],
                columns: [
                    {
                        data: 'name',
                        width: '250px'
                    }, {
                        data: 'family',
                        width: '150px',
                    }, {
                        data: 'style',
                        width: '150px',
                    },{
                        data: null,
                        width: '100px',
                        render: function (item, type, row, meta) {

                            let config = window.oedi.get('config');
                            let defaultFont = config.getValue('settings.defaultfont');

                            let disabled = '';
                            let tooltip = 'Delete font';
                            if (usedFonts.includes(row.name)) {
                                disabled = 'disabled';
                            }

                            let buttons = '';
                            if (item.type == 'user' && item.name !== defaultFont) {
                                buttons += `
                                    <span data-toggle="tooltip" title="${tooltip}">
                                        <button type="button" class="btn btn-danger btn-xs oe-list-font-delete" data-fontname="${item.name}"><i class="fa-solid fa-trash"></i></button>
                                    </span>`;
                            }
                            return buttons;
                        }
                    }

                ]
            });

            fontTable.on('draw', function () {
                $('[data-toggle="tooltip"]').tooltip();
            });

            $('#fontlistdialog').modal({
                keyboard: false,
                width: 600
            })
        });

        $(document).off('click', '.oe-list-font-delete');
        $(document).on('click', '.oe-list-font-delete', (event) => {
            event.stopPropagation();
            
            $('#oe-font-delete-dialog').modal({
                keyboard: false,
                width: 500
            });
            
            /*var fontName = $(event.currentTarget).data('fontname');
            if (fontName !== 'undefined') {

                if (this.#fieldManager.isFontUsed(fontName)) {
                    debugger;
                }
                if (window.confirm('Are you sure you wish to delete this font? If the font is in use then all fields will be set to the default font.')) {
                        let uiManager = window.oedi.get('uimanager');
                        uiManager.deleteFont(fontName);
                        this.#configManager.dirty = true;
                        this.updateToolbar();
                }
            }*/
        });

    }

    setupOptionsDialogEvents() {
        $(document).on('click', '#oe-options', (event) => {
            $('#defaultimagetopacity').val(this.#configManager.getValue('settings.defaultimagetopacity') * 100);
            $('#defaultimagerotation').val(this.#configManager.getValue('settings.defaultimagerotation'));
            $('#defaultfontsize').val(this.#configManager.getValue('settings.defaultfontsize'));
            $('#defaultfontopacity').val(this.#configManager.getValue('settings.defaultfontopacity') * 100);
            $('#defaulttextrotation').val(this.#configManager.getValue('settings.defaulttextrotation'));
            $('#defaultexpirytext').val(this.#configManager.getValue('settings.defaultexpirytext'));
            $('#oe-default-font-colour').val(this.#configManager.getValue('settings.defaultfontcolour'));
            $('#oe-default-stroke-colour').val(this.#configManager.getValue('settings.defaultstrokecolour'));


            $('#oe-default-font-colour').spectrum({
                type: 'color',
                showInput: true,
                showInitial: true,
                showAlpha: false
            });

            $('#oe-default-stroke-colour').spectrum({
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
            $('#oe-app-options-grid-colour').val(this.#configManager.gridColour);

            $('#oe-app-options-show-errors').prop('checked', this.#configManager.overlayErrors);
            $('#oe-app-options-show-errors-text').val(this.#configManager.overlayErrorsText);

            $('#oe-app-options-grid-colour').spectrum({
                type: 'color',
                showInput: true,
                showInitial: true,
                showAlpha: false,
                preferredFormat: 'hex'
            });            
            

            $('#overlaytablelist').DataTable().destroy();
            $('#overlaytablelist').DataTable({
                ajax: 'includes/overlayutil.php?request=OverlayList',
                dom: '<"toolbar">frtip',
                autoWidth: false,
                pagingType: 'simple_numbers',
                paging: true,
                pageLength: 20,
                info: false,
                searching: false,
                order: [[0, 'asc']],
                ordering: false,
                columns: [
                    {
                        data: 'type',
                        width: '80px'
                    }, {
                        data: 'name',
                        width: '300px'
                    }, {
                        data: 'brand',
                        width: '80px'
                    }, {
                        data: 'model',
                        width: '80px'
                    }, {
                        data: 'tod',
                        width: '80px',
                        render: function (item, type, row, meta) {
                            return item.charAt(0).toUpperCase() + item.slice(1);
                        }                        
                    }, {
                        data: null,
                        width: '50px',
                        render: function (item, type, row, meta) {
                            let icon = 'fa-pen-to-square'
                            if (item.type === 'Allsky') {
                                icon = 'fa-file-circle-plus';
                            }

                            let buttons = '<button type="button" class="btn btn-primary btn-sms oe-options-overlay-edit" data-filename="' + item.filename + '"><i class="fa-solid ' + icon + '"></i></button>';
                            return buttons;
                        }
                    }
                ]
            });

            $('#optionsdialog').modal({
                keyboard: false
            });

            $('a[href="#configoptions"]').tab('show');

        });

        $('#optionsdialog a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
            var target = $(e.target).attr('href')
            if (target === '#oeeditoroverlays') {
                $('#optionsdialognewoverlay').removeClass('hidden');
            } else {
                $('#optionsdialognewoverlay').addClass('hidden');
            }
        });

        $(document).on('click', '#oe-defaults-save', (event) => {
            let defaultImagOpacity = $('#defaultimagetopacity').val() / 100;
            let defaultImagRotation = $('#defaultimagerotation').val() | 0;
            let defaultFontSize = $('#defaultfontsize').val() | 0;
            let defaultTextRotation = $('#defaulttextrotation').val() | 0;
            let defaultFont = $("#defaultfont option").filter(":selected").val();
            let defaultFontOpacity = $('#defaultfontopacity').val() / 100;
            let defaultFontColour = $('#oe-default-font-colour').val();
            let defaultexpirytext = $('#defaultexpirytext').val();            
            let defaultStrokeColour = $('#oe-default-stroke-colour').val();
            let defaultStrokeSize = $('#oe-default-stroke-size').val();

            this.#configManager.setValue('settings.defaultimagetopacity', defaultImagOpacity);
            this.#configManager.setValue('settings.defaultimagerotation', defaultImagRotation);
            this.#configManager.setValue('settings.defaultfontsize', defaultFontSize);
            this.#configManager.setValue('settings.defaultfontopacity', defaultFontOpacity);
            this.#configManager.setValue('settings.defaulttextrotation', defaultTextRotation);
            this.#configManager.setValue('settings.defaultfont', defaultFont);
            this.#configManager.setValue('settings.defaultfontcolour', defaultFontColour);
            this.#configManager.setValue('settings.defaultexpirytext', defaultexpirytext);
            this.#configManager.setValue('settings.defaultstrokecolour', defaultStrokeColour);

            this.#configManager.gridVisible = $('#oe-app-options-show-grid').prop('checked');
            this.#configManager.gridSize = $("#oe-app-options-grid-size option").filter(":selected").val();
            this.#configManager.gridOpacity = $('#oe-app-options-grid-opacity').val() | 0;
            this.#configManager.gridColour = $('#oe-app-options-grid-colour').val();
            this.#configManager.snapBackground = $('#oe-app-options-snap-background').prop('checked');
            this.#configManager.addListPageSize = $("#oe-app-options-add-list-size option").filter(":selected").val();
            this.#configManager.addFieldOpacity = $('#oe-app-options-add-field-opacity').val() | 0;
            this.#configManager.selectFieldOpacity = $('#oe-app-options-select-field-opacity').val() | 0;
            this.#configManager.mouseWheelZoom = $('#oe-app-options-mousewheel-zoom').prop('checked');
            this.#configManager.backgroundImageOpacity = $('#oe-app-options-background-opacity').val() | 0;

            this.#configManager.overlayErrors = $('#oe-app-options-show-error').prop('checked');
            this.#configManager.overlayErrorsText = $('#oe-app-options-show-error').val();

            this.#fieldManager.updateFieldDefaults();
            this.drawGrid();
            this.updateBackgroundImage();

            this.#configManager.saveSettings();
            this.#fieldManager.defaultsModified();

            $('#optionsdialog').modal('hide');
            this.updateToolbar();
            this.setupDebug();
        });
    }

    #dragStart(event) {
        let shape = event.target;

        this.#movingField = this.#fieldManager.findField(shape);
        if (this.#configManager.snapBackground) {
            let gridSizeX = this.#configManager.gridSize * this.#oeEditorStage.scaleX();
            let gridSizeY = this.#configManager.gridSize * this.#oeEditorStage.scaleY();
            
            if (gridSizeX != 0 && gridSizeY != 0) {
                this.#snapRectangle.size({
                    width: shape.width(),
                    height: shape.height()
                });
                this.#snapRectangle.position({
                    x: (Math.round(shape.x() / gridSizeX) * gridSizeX) | 0,
                    y: (Math.round(shape.y() / gridSizeY) * gridSizeY) | 0
                });
//                this.#snapRectangle.offset({x: shape.width()/2, y: shape.height()/2});                
                this.#snapRectangle.offsetX(shape.offsetX());
                this.#snapRectangle.offsetY(shape.offsetY());
                this.#snapRectangle.scale({
                    x: this.#movingField.scale,
                    y: this.#movingField.scale
                });
                this.#snapRectangle.visible(true);
            }
        }
    }

    #dragEnd(event) {
        let shape = event.target;

        //event.cancelBubble = true;

        if (event.target.hasName('field')) {                

            let field = this.#fieldManager.findField(shape.id())
            field.shape.draggable(false)

            let gridSizeX = this.#configManager.gridSize;
            let gridSizeY = this.#configManager.gridSize;

            if (gridSizeX != 0 && gridSizeY != 0) {
                let adjustedX = shape.x() - shape.offsetX();
                let adjustedY = shape.y() - shape.offsetY();

                shape.position({
                    x: (Math.round(adjustedX / gridSizeX) * gridSizeX) + shape.offsetX() | 0,
                    y: (Math.round(adjustedY / gridSizeY) * gridSizeY) + shape.offsetY() | 0
                });
            }

            if (field !== null) {
                field.x = shape.x() | 0
                field.y = shape.y() | 0

                if (field.fieldType === 'rect') {
                    field.width = shape.width() | 0
                    field.height = shape.height() | 0
                }

                if (this.#selected !== null) {
                    if (this.#selected.id === shape.id()) {
                        this.updatePropertyEditor();
                    }
                }

                if (this.#configManager.snapBackground) {
                    this.#snapRectangle.visible(false);
                }
            }

        }

        this.checkFields();
        this.updateToolbar();
    }

    checkFieldstimer() {
        let checkFunction = function() {
            let allLoaded = true;
            let fields = this.#fieldManager.fields;
            for (let [fieldName, field] of fields.entries()) {
                if (!field.loaded) {
                    allLoaded = false;
                    break;
                }
            }
            if (!allLoaded) {
                setTimeout(checkFunction, 100);
            } else {
                this.checkFields();
            }
        }.bind(this);

        setTimeout(checkFunction, 100);
    }

    moveField(event) {
        let shape = event.target;
        if (shape.getClassName() !== 'Transformer') {
            if (this.#configManager.snapBackground) {
                let gridSizeX = this.#configManager.gridSize;
                let gridSizeY = this.#configManager.gridSize;

                if (event.evt.shiftKey) {
                    this.#transformer.rotationSnaps([0, 90, 180, 270]);
                } else {
                    this.#transformer.rotationSnaps([]);
                }

                this.#snapRectangle.rotation(shape.rotation());              
                this.#snapRectangle.position({
//                    x: (Math.round(shape.x()  / gridSizeX) * gridSizeX),
                    x: (Math.round((shape.x() - shape.offsetX())  / gridSizeX) * gridSizeX) +  shape.offsetX(),
                    y: (Math.round((shape.y() - shape.offsetY())  / gridSizeY) * gridSizeY) +  shape.offsetY()
                });
            }

            if (this.#selected !== null) {
                if (event.target.id() == this.#selected.id) {
                    this.setTransformerState(shape);
                }
            }
        }
    }

    setTransformerState(shape) {
        this.checkFieldBounds(shape, this.#oeEditorStage, this.#transformer);
    }

    checkFields() {
        this.#errorFields = [];
        let fields = this.#fieldManager.fields;
        for (let [fieldName, field] of fields.entries()) {
  
            let result = this.isFieldOutsideViewport(field);
            if (result.outOfBounds) {
                let name = 'Unknown';
                if (field instanceof OEIMAGEFIELD) {
                    name = field.image;
                } else {
                    name = field.label;
                }
                this.#errorFields.push({
                    'id': fieldName,
                    'name': name,
                    'field': field,
                    'type': result.type
                });
            }
        }

        if (this.#errorFields.length > 0) {
            $('#oe-field-errors').removeClass('hidden');
            $('#oe-field-errors').addClass('red pulse');
        } else {
            $('#oe-field-errors').addClass('hidden');
            $('#oe-field-errors').removeClass('red pulse');
        }
    }

    isFieldOutsideViewport(field) {
        let result = false;
        let type = '';
        let stageWidth = this.#oeEditorStage.width();
        let stageHeight = this.#oeEditorStage.height();

        let x = field.tlx;
        let y = field.tly;

        /** Nasty hack to fix tlx and tly being wrong on scaled images */
        if (field instanceof OEIMAGEFIELD) {
            let tx = field.shape.getWidth() * field.scale/2;
            let ty = field.shape.getHeight() * field.scale/2;
            x = field.x - tx;
            y = field.y - ty;
        }

        if (x < 0) {
            result = true;
            type = 'left';
        }
        if (y < 0) {
            result = true;
            type = 'top';
        }

        if (x > stageWidth) {
            result = true;
            type = 'right';
        }
        if (y > stageHeight) {
            result = true;
            type = 'bottom';
        }

        if ((x < 0 && y < 0) || (x > stageWidth && y > stageHeight)) {
            result = true;
            type = 'all';
        }

        return {
            outOfBounds: result, 
            type: type
        };
    }

    checkFieldBounds(shape, oeEditorStage, transformer=null) {
        if (transformer !== null) {
            if (transformer.borderStroke() !== '#00a1ff') {
                transformer.borderStroke('#00a1ff');
                transformer.borderStrokeWidth(1);
            }
        }

        let stageWidth = oeEditorStage.width();
        let stageHeight = oeEditorStage.height();

        let rect = shape.getClientRect();
        let x = rect.x  / oeEditorStage.scaleX();
        let y = rect.y  / oeEditorStage.scaleY();

        x = Math.ceil(x/oeEditorStage.scaleX())*oeEditorStage.scaleX()|0;
        y = Math.ceil(y/oeEditorStage.scaleY())*oeEditorStage.scaleY()|0;

        let width = rect.width / oeEditorStage.scaleX();
        let height = rect.height / oeEditorStage.scaleY();

        let outOfBounds = false;
        if (x < 0) {
            outOfBounds = true;
        }
        if (y < 0) {
            outOfBounds = true;
        }

        if ((x + width) > stageWidth) {
            outOfBounds = true;
        }
        if ((y + height) > stageHeight) {
            outOfBounds = true;
        }

        if (outOfBounds && transformer !== null) {
            transformer.borderStrokeWidth(3);
            transformer.borderStroke('red');    
        }

        return outOfBounds;
    }

    #saveConfig() {
        this.#fieldManager.buildJSON();
        this.#configManager.saveConfig();
        this.#fieldManager.clearDirty();
        this.#configManager.dirty = false;
        this.updateToolbar();
    }

    #deleteField(event) {
        bootbox.confirm({
            message: 'Are you sure you wish to delete this field(s)?',
            callback: (result) => {
                if (result) {
                    this.hidePropertyEditor()
                    this.#fieldManager.deleteFields(this.#transformer)
                    this.#transformer.nodes([])
                    this.setFieldOpacity(false)
                    this.#selected = null
                    this.setFieldOpacity(false)
                    this.updateToolbar()
                }
            }
        })
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

        let height = (this.#backgroundImage.height() * this.#stageScale);

        // Not very nice 'fix' to prevent the scaled stage from having a huge black block underneath it
        $('#overlay_container').height(height);
        

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

        let selectedOverlay = this.#configManager.selectedOverlay;
        if (selectedOverlay.type === 'allsky' && !this.#debugMode)  {
            $('#oe-delete').addClass('disabled');
            $('#oe-save').addClass('disabled');
            $('#oe-add-text').addClass('disabled');
            $('#oe-add-image').addClass('disabled');
            $('#oe-item-list').addClass('disabled');
            $('#oe-test-mode').addClass('disabled');
            $('#oe-field-errors').addClass('disabled');
            $('#oe-toobar-debug-button').addClass('disabled');
            $('#oe-upload-font').addClass('disabled');
            $('#oe-show-image-manager').addClass('disabled');
            $('#oe-options').addClass('disabled');            
        } else {        
            $('#oe-delete').removeClass('disabled');
            $('#oe-save').removeClass('disabled');
            $('#oe-add-text').removeClass('disabled');
            $('#oe-add-image').removeClass('disabled');
            $('#oe-item-list').removeClass('disabled');
            $('#oe-test-mode').removeClass('disabled');
            $('#oe-field-errors').removeClass('disabled');
            $('#oe-toobar-debug-button').removeClass('disabled');
            $('#oe-upload-font').removeClass('disabled');
            $('#oe-show-image-manager').removeClass('disabled');
            $('#oe-options').removeClass('disabled');            

            if (this.#selected === null) {
                $('#oe-delete').addClass('disabled');
                $('#oe-delete').removeClass('green');
            } else {
                $('#oe-delete').removeClass('disabled');
                $('#oe-delete').addClass('green');
            }

            if (this.#fieldManager.dirty || this.#configManager.dirty) {
                $('#oe-save').removeClass('disabled');
                $('#oe-save').addClass('green pulse');
                $('#oe-overlay-editor-tab').addClass('oe-overlay-editor-tab-modified');            
            } else {
                $('#oe-save').addClass('disabled');
                $('#oe-save').removeClass('green pulse');
                $('#oe-overlay-editor-tab').removeClass('oe-overlay-editor-tab-modified');
            }

            if (this.#debugMode) {
                $('#oe-toolbar-debug').removeClass('hidden')
            } else {
                $('#oe-toolbar-debug').addClass('hidden')
            }

            if (this.#transformer.nodes().length > 1) {
                $('#oe-group').removeClass('disabled');                
                $('#oe-ungroup').removeClass('disabled');
                $('#oe-left-align').removeClass('disabled');
                $('#oe-vertical-equal').removeClass('disabled');
            } else {
                $('#oe-group').addClass('disabled');
                $('#oe-ungroup').addClass('disabled');
                $('#oe-left-align').addClass('disabled');
                $('#oe-vertical-equal').addClass('disabled');
            }

            if (this.#fieldManager.allRects(this.#transformer)) {
                $('#oe-equal-width').removeClass('disabled');    
            } else {
                $('#oe-equal-width').addClass('disabled');
            }
        }
    }

    setupDebug() {
        if (this.#debugPosMode) {
            this.#createDebugWindow();
        } else {
            if ($('#debugdialog').hasClass('ui-dialog-content')) {
                $('#debugdialog').dialog('destroy');
            }
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
        $('#oe-fontupload-submit').addClass('disabled');
        $('.oe-fontuploaddialog-error').addClass('hidden');
        $('#oe-fontuploaddialog-info').removeClass('hidden');

        $('#oe-fontuploaddialog').modal({
            keyboard: false,
            width: 600
        });

        $('#oe-fontupload-file').off('change');
        $('#oe-fontupload-file').on('change',function() {
            $('.oe-fontuploaddialog-error').addClass('hidden');
            $('#oe-fontuploaddialog-info').removeClass('hidden');

            var file = this.files[0];
            var fileType = file.type;
            var match = ['application/zip', 'application/zip-compressed', 'application/x-zip-compressed', 'application/x-zip'];
            if(!((fileType == match[0]) || (fileType == match[1]) || (fileType == match[2]) || (fileType == match[3]) )){
                $('#oe-fontupload-file').val('');
                $('#oe-fontupload-submit').addClass('disabled');
                $('#oe-fontuploaddialog-info').addClass('hidden');
                $('#oe-fontuploaddialog-zip-only').removeClass('hidden');

                return false;
            }
            $('#oe-fontupload-submit').removeClass('disabled');
        });

        $('#oe-fontupload-submit').off('click');
        $('#oe-fontupload-submit').on('click', (e) => {

            $.LoadingOverlay('show', {
                text : 'Installing font'
            });

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
                    $('#oe-fontupload-submit').addClass('disabled');
                }                
            }).done( (fontData) => {
                $('#oe-fontupload-submit').removeClass('disabled');
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

                $('#oe-fontuploaddialog').modal('hide');                
            }).fail( (jqXHR, error, errorThrown) => {
                if (jqXHR.status === 413) {
                    $('#oe-fontuploaddialog-info').addClass('hidden');
                    $('#oe-fontuploaddialog-size').removeClass('hidden');
                } else if (jqXHR.status === 415) {
                    $('#oe-fontuploaddialog-info').addClass('hidden');
                    $('#oe-fontuploaddialog-header').removeClass('hidden');
                } else if (jqXHR.status === 507) {
                    $('#oe-fontuploaddialog-info').addClass('hidden');
                    $('#oe-fontuploaddialog-file-failed').removeClass('hidden');
                } else if (jqXHR.status === 417) {
                    $('#oe-fontuploaddialog-info').addClass('hidden');
                    $('#oe-fontuploaddialog-no-fonts').removeClass('hidden');
                }
            }).always(() => {
                $.LoadingOverlay('hide');
            });
        });

    }

    installFont() {

        $('#fontinstalldialog').modal({
            keyboard: false,
            width: 600
        });

        $('#oe-fontinstalldialog-url').off('input');
        $('#oe-fontinstalldialog-url').on('input', (e) => {
            const fontURL = $.trim($('#oe-fontinstalldialog-url').val());
            if (fontURL.startsWith("https://www.dafont.com/")) {
                $('#oe-fontinstalldialog-install').prop('disabled', false);
            } else {
                $('#oe-fontinstalldialog-install').prop('disabled', true);
            }
            $('#oe-fontinstalldialog-info').removeClass('hidden');
            $('#oe-fontinstalldialog-dl-error').addClass('hidden');
            $('#oe-fontinstalldialog-missing').addClass('hidden');
        });

        $('#oe-fontinstalldialog-install').off('click');
        $('#oe-fontinstalldialog-install').on('click', (e) => {
            const fontURL = $.trim($('#oe-fontinstalldialog-url').val());
            if (fontURL.startsWith("https://www.dafont.com/")) {
                $.LoadingOverlay('show', {
                    text : 'Installing font'
                });
                $.ajax({
                    url: 'includes/overlayutil.php?request=fonts',
                    type: 'POST',
                    data: { fontURL: fontURL },
                    dataType: 'json',
                    context: this
                }).done((fontData) => {
                    $('#fontlisttable').DataTable().ajax.reload();
                    this.#configManager.loadFonts();
                    $('#fontinstalldialog').modal('hide');
                }).fail(function (jqXHR, textStatus, errorThrown) {
                    if (jqXHR.status === 404) {
                        $('#oe-fontinstalldialog-info').addClass('hidden');
                        $('#oe-fontinstalldialog-dl-error').addClass('hidden');
                        $('#oe-fontinstalldialog-missing').removeClass('hidden');
                    } else if (jqXHR.status === 422) {
                        $('#oe-fontinstalldialog-info').addClass('hidden');
                        $('#oe-fontinstalldialog-dl-error').removeClass('hidden');
                        $('#oe-fontinstalldialog-missing').addClass('hidden');
                    }
                }).always(() => {
                    $.LoadingOverlay('hide');
                });
            }
        });
    }

    setupFonts() {
        this.#fonts = [];

        this.#fonts.push({ 'value': 'Arial', 'text': 'Arial (sans-serif)' });
        this.#fonts.push({ 'value': 'Arial Black', 'text': 'Arial Black (sans-serif)' });
        this.#fonts.push({ 'value': 'Times New Roman', 'text': 'Times New Roman (serif)' });
        this.#fonts.push({ 'value': 'Courier New', 'text': 'Courier (monospace)' });
        this.#fonts.push({ 'value': 'Verdana', 'text': 'Verdana (sans-serif)' });
        this.#fonts.push({ 'value': 'Trebuchet MS', 'text': 'Trebuchet MS (sans-serif)' });
        this.#fonts.push({ 'value': 'Impact', 'text': 'Impact (sans-serif)' });
        this.#fonts.push({ 'value': 'Georgia', 'text': 'Georgia (serif)' });
        this.#fonts.push({ 'value': 'Comic Sans MS', 'text': 'Comic Sans MS (cursive)' });

        /** Add our fonts */
        let fontList = Array.from(document.fonts);
        for (let i = 0; i < fontList.length; i++) {
            let fontFace = fontList[i];
            let fontName = fontFace.family.replace(/["']/g, '');

            let alreadyExists = this.#fonts.some(f => f.value === fontName);
            if (!alreadyExists) {
                this.#fonts.push({ 'value': fontName, 'text': fontName });
            }
        }
    }

    deleteFont(fontName) {
        let fontToDelete = null;
        const fontBaseName = fontName.split('/').pop().replace(/\.[^/.]+$/, '');
        for (let fontFace of document.fonts.values()) {
            if (fontFace.family == fontBaseName) {
                fontToDelete = fontFace;
                break;
            }
        }

        if (fontToDelete !== null) {
            $.LoadingOverlay('show');
            let result = document.fonts.delete(fontToDelete);
            if (result) {
                $.ajax({
                    url: 'includes/overlayutil.php?request=font&fontName=' + fontName,
                    type: 'DELETE',
                    context: this
                }).done((result) => {
                    this.#fieldManager.switchFontUsed(fontName);
                     $('#fontlisttable').DataTable().ajax.reload();
                }).fail((jqXHR, textStatus, errorThrown) => {
                }).always(() => {
                    $.LoadingOverlay('hide');
                });
            } else {
                $.LoadingOverlay('hide');
            }
        }
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

    convertColour(colour, opacity) {
        if (colour.charAt(0) == "#"){
            colour = colour.substring(1,7);
        }

        let red = parseInt(colour.substring(0,2) ,16);
        let green = parseInt(colour.substring(2,4) ,16);
        let blue = parseInt(colour.substring(4,6) ,16)
        opacity = opacity / 100;

        return 'rgba(' + red.toString() + ',' + green.toString() + ',' + blue.toString() + ',' + opacity.toString() + ')';
    }

    drawGrid() {
        this.#gridLayer.destroyChildren();
        if (this.#configManager.gridVisible) {
            if (this.#configManager.gridSize > 0) {
                let gridColour = this.convertColour(this.#configManager.gridColour, this.#configManager.gridOpacity)
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
                            //stroke: 'rgba(255, 255, 255, ' + (this.#configManager.gridOpacity / 100).toString() + ')',
                            stroke: gridColour,
                            strokeWidth: 1,
                        })
                    );
                }

                for (let i = 0; i <= ySteps; i++) {
                    this.#gridLayer.add(
                        new Konva.Line({
                            y: i * stepSize,
                            points: [0, 0, xSize, 0],
                            //stroke: 'rgba(255, 255, 255, ' + (this.#configManager.gridOpacity / 100).toString() + ')',
                            stroke: gridColour,
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
        }
        if (this.#selected instanceof OEIMAGEFIELD)  {
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
        if (this.#selected instanceof OERECTFIELD) {
            this.#createRectPropertyEditor();
            this.updatePropertyEditor();
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
        }

        if (this.#selected instanceof OEIMAGEFIELD) {
            if ($("#imagedialog").hasClass('ui-dialog-content')) {
                $('#imagepropgrid').jqPropertyGrid('Destroy');
                $('#imagedialog').dialog('close');
            }
        }

        if (this.#selected instanceof OERECTFIELD) {
            if ($("#rectdialog").hasClass('ui-dialog-content')) {
                $('#rectpropgrid').jqPropertyGrid('Destroy');
                $('#rectdialog').dialog('close');
            }
        }

        if ($("#formatdialog").hasClass('ui-dialog-content')) {
            $('#formatdialog').dialog('close');
        }
        
    }

    updatePropertyEditor() {
        if (this.#selected !== null) {

		/*	let label  = this.#selected.fieldData.label
			const regex = /\${([^}]+)}/;
			const match = label.match(regex);
			let source = ''
			if (match !== null) {
				let configManager = window.oedi.get('config');
				let name = match[0]
				let field = configManager.findFieldByName(name)
				if (field !== null) {
					source = field.source
				}
			}

			let tableRow = $('#pgtexttype').prev('.pgRow')

			tableRow = $('#pgtexttype').closest('.pgRow')
			if (source === 'user') {
				tableRow.css('display', 'table-row')
			} else {
		//		tableRow.css('display', 'none')
			}*/

            let textVisible = false;
            if ($('#textdialog').closest('.ui-dialog').is(':visible')) {
                textVisible = true;
            }
            let imageVisible = false;
            if ($('#imagedialog').closest('.ui-dialog').is(':visible')) {
                imageVisible = true;
            }
            let rectVisible = false;
            if ($('#rectdialog').closest('.ui-dialog').is(':visible')) {
                rectVisible = true;
            }

            if (this.#selected instanceof OETEXTFIELD) {
                if (imageVisible) {
                    $('#imagepropgrid').jqPropertyGrid('Destroy');
                    $('#imagedialog').dialog('close');
                    this.#createTextPropertyEditor();
                }
                if (rectVisible) {
                    $('#rectpropgrid').jqPropertyGrid('Destroy');
                    $('#rectdialog').dialog('close');
                    this.#createTextPropertyEditor();
                }
                let strokeColour = this.#selected.stroke;
                //if (this.#selected.strokewidth == 0) {
                //    strokeColour = null;
               // }
                $('#textpropgrid').jqPropertyGrid('set', {
                    'label': this.#selected.label,
					'type': this.#selected.type,
                    'format': this.#selected.format,
                    'sample': this.#selected.sample,
                    'empty': this.#selected.empty,
                    'x': this.#selected.calcX|0,
                    'y': this.#selected.calcY|0,
                    'fontsize': this.#selected.fontsize,
                    'fontname': this.#selected.fontname,
                    'opacity': this.#selected.opacity,
                    'rotation': this.#selected.rotation,
                    'fill': this.#selected.fill,
                    'strokewidth': this.#selected.strokewidth,
                    'stroke': strokeColour
                });
            }
            if (this.#selected instanceof OEIMAGEFIELD) {
                if (textVisible) {
                    $('#textdialog').dialog('close');
                    $('#textpropgrid').jqPropertyGrid('Destroy');
                    this.#createImagePropertyEditor();                    
                }
                if (rectVisible) {
                    $('#rectpropgrid').jqPropertyGrid('Destroy');
                    $('#rectdialog').dialog('close');
                    this.#createImagePropertyEditor();
                }
                $('#imagepropgrid').jqPropertyGrid('set', {
                    'x': this.#selected.x,
                    'y': this.#selected.y,
                    'image': this.#selected.image,
                    'opacity': this.#selected.opacity,
                    'rotation': this.#selected.rotation,
                    'scale': this.#selected.scale
                });
            }

            if (this.#selected instanceof OERECTFIELD) {
                if (textVisible) {
                    $('#textdialog').dialog('close');
                    $('#textpropgrid').jqPropertyGrid('Destroy');
                    this.#createRectPropertyEditor();                    
                }
                if (imageVisible) {
                    $('#imagepropgrid').jqPropertyGrid('Destroy');
                    $('#imagedialog').dialog('close');
                    this.#createRectPropertyEditor();
                }
                $('#rectpropgrid').jqPropertyGrid('set', {
                    'x': this.#selected.x,
                    'y': this.#selected.y,
                    'width': this.#selected.width,
                    'height': this.#selected.height,
                    'fill': this.#selected.fill,
                    'strokewidth': this.#selected.strokeWidth,
                    'stroke': this.#selected.stroke,
                    'cornerradius':this.#selected.cornerRadius
                });
            }
        }
    }

    #hexToRgb(hex, opacity) {
        hex = hex.replace(/^#/, '')

        if (hex.length === 3) {
            hex = hex.split('').map(c => c + c).join('')
        }

        var bigint = parseInt(hex, 16)
        var r = (bigint >> 16) & 255
        var g = (bigint >> 8) & 255
        var b = bigint & 255

        var rgbaString = `rgba(${r}, ${g}, ${b}, ${opacity})`

        return rgbaString
    }

    #createRectPropertyEditor() {
        var rectData = {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            cornerradius: 0,
            fill: '#ffffff',
            strokewidth: 0,
            stroke: ''
        };

        let gridSizeX = this.#configManager.gridSize;
        let gridSizeY = this.#configManager.gridSize;

        if (gridSizeX == 0) {
            gridSizeX = 1;
        }
        if (gridSizeY == 0) {
            gridSizeY = 1;
        }


		const rectConfig = {
            x: { 
                group: 'Position', 
                name: 'X', 
                type: 'number', 
                options: { 
                    min: 0, 
                    max: this.#backgroundImage.width(), 
                    step: gridSizeX
                }
            },
            y: {
                group: 'Position',
                name: 'Y',
                type: 'number',
                options: {
                    min: 0,
                    max: this.#backgroundImage.height(),
                    step: gridSizeY
                }
            },
            width: {
                group: 'Position',
                name: 'Width',
                type: 'number',
                options: {
                    min: 0,
                    max: this.#backgroundImage.width(),
                    step: gridSizeX
                }
            },
            height: {
                group: 'Position',
                name: 'Height',
                type: 'number',
                options: {
                    min: 0,
                    max: this.#backgroundImage.height(),
                    step: gridSizeY
                }
            },
            fill: {
                group: 'Background', 
                name: 'Colour', 
                type: 'color', 
                options: {
                    preferredFormat: 'rgb',
                    type: "color",
                    showInput: true,
                    showInitial: true,
                    showAlpha: true
                }
            },
            cornerradius: { 
                group: 'Border', 
                name: 'Corner Radius', 
                type: 'number', 
                options: {
                    min: 0,
                    max: 1000,
                    step: 1
                }
            },
            strokewidth: {
                group: 'Border',
                name: 'Stroke Size',
                type: 'number',
                options: {
                    min: 0,
                    max: 200,
                    step: 1
                }
            },
            stroke: {
                group: 'Border', 
                name: 'Stroke Colour', 
                type: 'color', 
                options: {
                    preferredFormat: 'hex',
                    type: "color",
                    showInput: true,
                    showInitial: true,
                    showAlpha: false
                }
            }
        };

        function propertyChangedCallback(grid, name, value) {
            let uiManager = window.oedi.get('uimanager')
            let field = uiManager.selected

            if (name == 'x') {
                field.x = value                
            }
            if (name == 'y') {
                field.y = value                
            }
            if (name == 'width') {
                field.width = value                
            }
            if (name == 'height') {
                field.height = value                
            }
            if (name == 'cornerradius') {
                field.cornerRadius = value
            }
            if (name == 'strokewidth') {
                field.strokeWidth = value
            }
            if (name == 'stroke') {
                field.stroke = value
            }
            if (name == 'fill') {
                field.fill = value
            }

            field.dirty = true
        }

        var options = {
            meta: rectConfig,
            prefix: 'rect',
            callback: propertyChangedCallback,
        };

        $('#rectpropgrid').jqPropertyGrid(rectData, options);
        $('#rectdialog').dialog({
            resizable: false,
            closeOnEscape: false,
            width: 350,
            beforeClose: function (event, ui) {
                let uiManager = window.oedi.get('uimanager');
                uiManager.setFieldOpacity(false);
            }
        });


    }

    #createTextPropertyEditor() {
        var textData = {
            label: '',
			type: '',
            format: '',
            sample: '',
            empty: '',
            x: 0,
            y: 0,
            rotation: 0,
            fontname: 'df',
            fontsize: 32,
            opacity: 1,
            fill: '#ffffff',
            strokewidth: 0,
            stroke: ''
        };

        let gridSizeX = this.#configManager.gridSize;
        let gridSizeY = this.#configManager.gridSize;

        if (gridSizeX == 0) {
            gridSizeX = 1;
        }
        if (gridSizeY == 0) {
            gridSizeY = 1;
        }

		let configManager = window.oedi.get('config')
		let types = configManager.getTypes(true)

		var textConfig = {
            label: { group: 'Label', name: 'Item', type: 'text' },
            type: { group: 'Label', name: 'type', type: 'options', options: types },
            format: { group: 'Label', name: 'Format', type: 'text', helpcallback: function (name) {
                let uiManager = window.oedi.get('uimanager')
				let selected = uiManager.#selected
                let type = selected.type;
                uiManager.#createFormatHelpWindow(type);
            }},
            sample: { group: 'Label', name: 'Sample', type: 'text' },
            empty: { group: 'Label', name: 'Empty Value', type: 'text' },

            x: { group: 'Position', name: 'X', type: 'number', options: { min: 0, max: this.#backgroundImage.width(), step: gridSizeX } },
            y: { group: 'Position', name: 'Y', type: 'number', options: { min: 0, max: this.#backgroundImage.height(), step: gridSizeY } },
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
            strokewidth: { group: 'Font', name: 'Stroke Size', type: 'number', options: { min: 0, max: 10, step: 1 } },
            stroke: {
                group: 'Font', name: 'Stroke Colour', type: 'color', options: {
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
            
            if (name == 'x' || name == 'y') {
                if (value == '') {
                    value = 0;
                }
                value = parseInt(value)
                if (name == 'x') {
                    field.x = value + field.shape.offsetX()
                } else {
                    field.y = value + field.shape.offsetY()
                }
            } else {
                if (name == 'label') {
                    let x = field.x;
                    let oldSize = field.shape.measureSize(field.label); 
                    field[name] = value;
                    let size = field.shape.measureSize(field.label); 
                    let adj = (oldSize.width - size.width)/2;
                    field.shape.offsetX((size.width/2)|0);
                    field.x = x - adj;
                } else {
                    field[name] = value;
                }
            }
            uiManager.checkFieldBounds(field.shape, uiManager.editorStage , uiManager.transformer);

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
            width: 500,
            beforeClose: function (event, ui) {
                let uiManager = window.oedi.get('uimanager');
               // uiManager.selected = null;
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

            x: { group: 'Position', name: 'X', type: 'number', options: { min: 0, max: this.#backgroundImage.width(), step: 10 } },
            y: { group: 'Position', name: 'Y', type: 'number', options: { min: 0, max: this.#backgroundImage.height(), step: 10 } },

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
                uiManager.checkFieldBounds(field.shape, uiManager.editorStage , uiManager.transformer);
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
               // uiManager.selected = null;
            }
        });
    }

    enableTestMode(async=true) {
        this.testMode = true;
        async = true;
        this.#fieldManager.enableTestMode(async);
        this.updateDebugWindow();
    }

    disableTestMode() {
        this.testMode = false;
        this.#fieldManager.disableTestMode();
        this.updateDebugWindow();
    }

    rotatePoint(pt, o, a){

        var angle = a * (Math.PI/180);
        var rotatedX = Math.cos(angle) * (pt.x - o.x) - Math.sin(angle) * (pt.y - o.y) + o.x;
        var rotatedY = Math.sin(angle) * (pt.x - o.x) + Math.cos(angle) * (pt.y - o.y) + o.y;  
      
        return {x: rotatedX, y: rotatedY};
    }

    updateDebugWindow() {
        if (this.#debugPosMode) {            
            let field = this.#selected;
            if (field === null) {
                $('#debugpropgrid').jqPropertyGrid('set', {
                    'type': 'N/A',
                    'fieldId': 'N/A',
                    'x': 'N/A',
                    'y': 'N/A',
                    'tlx': 'N/A',
                    'tly': 'N/A',                                
                    'offsetx': 'N/A',
                    'offsety': 'N/A',                
                    'width': 'N/A',
                    'height': 'N/A',
                    'rect': 'N/A',
                    'rectc': 'N/A'
                });            
            } else {
        
                let rect = field.shape.getClientRect();
                let rectx = rect.x  / this.#oeEditorStage.scaleX();
                let recty = rect.y  / this.#oeEditorStage.scaleY();

                let gridSizeX = this.#configManager.gridSize;
                let gridSizeY = this.#configManager.gridSize;

                let rectcx = (Math.round((field.shape.x() - field.shape.offsetX())  / gridSizeX) * gridSizeX);
                let rectcy = (Math.round((field.shape.y() - field.shape.offsetY())  / gridSizeY) * gridSizeY);
                
                let rectString = rectx.toFixed(2) + ", " + recty.toFixed(2);
                let rectCalc = rectcx + ", " + rectcy;

                let scaleX = this.#oeEditorStage.scaleX();
                let scaleY = this.#oeEditorStage.scaleY();              
                let type = 'Text';
                if (this.#selected instanceof OEIMAGEFIELD) {
                    type = 'Image';
                }
                
                let tlx = field.shape.x() - field.shape.offsetX();
                let tly = field.shape.y() - field.shape.offsetY();
                let tl = this.rotatePoint({x: tlx, y: tly}, {x: field.shape.x(), y: field.shape.y()}, field.shape.rotation());
                $('#debugpropgrid').jqPropertyGrid('set', {
                    'type': type,
                    'fieldId': field.shape.id(),
                    'x': 'sx: ' + (field.shape.x() | 0).toString() + ', ix: ' + ((field.shape.x() / scaleX) | 0).toString() ,
                    'y': 'sy: ' + (field.shape.y() | 0).toString() + ', iy: ' + ((field.shape.y() / scaleY) | 0).toString() ,
                    'tlx': (tl.x | 0).toString(),
                    'tly': (tl.y | 0).toString(),
                    'offsetx': (field.shape.offsetX() | 0).toString(),
                    'offsety': (field.shape.offsetY() | 0).toString(),
                    'width': 'sx: ' + (field.shape.width() | 0).toString() + ', ix: ' + ((field.shape.width() / scaleX) | 0).toString(),
                    'height': 'sy: ' + (field.shape.height() | 0).toString() + ', iy: ' + ((field.shape.height() / scaleY) | 0).toString(),
                    'rect': rectString,
                    'rectc' : rectCalc
                });
            }
        }
    }

    updateDebugWindowMousePos(x, y) {
        if (this.#debugPosMode) {        
            let imageX = x  / this.#oeEditorStage.scaleX();
            let imageY = y  / this.#oeEditorStage.scaleY();        
            $('#debugpropgrid').jqPropertyGrid('set', {
                'mouseScreenx': 'sx: ' + (x | 0).toString() + ', ix: ' + (imageX | 0).toString(),
                'mouseScreeny': 'sy: ' + (y | 0).toString() + ', iy: ' + (imageY | 0).toString()
            });
        }
    }

    #createDebugWindow() {
        let debugData = {
            type: '',
            fieldId: '',
            x: 0,
            y: 0,
            tlx: 0,
            tly: 0,
            offsetx: 0,
            offsety: 0,              
            width: 0,
            height: 0,
            mouseScreenx: 0,
            mouseScreeny: 0,
            rect: 0,
            rectc: 0  
        };

        let debugConfig = {
            type: { group: 'Field', name: 'Type', type: 'text', options: {} },
            fieldId: { group: 'Field', name: 'Id', type: 'text', options: {} },

            x: { group: 'Position', name: 'x', type: 'text' },
            y: { group: 'Position', name: 'y', type: 'text' },
            tlx: { group: 'Position', name: 'tlx', type: 'text' },
            tly: { group: 'Position', name: 'tly', type: 'text' },                        
            offsetx: { group: 'Position', name: 'offset x', type: 'text' },
            offsety: { group: 'Position', name: 'offset y', type: 'text' },                
            width: { group: 'Position', name: 'width', type: 'text' },
            height: { group: 'Position', name: 'height', type: 'text' },

            rect: { group: 'Field Rect', name: 'Rect', type: 'text' },
            rectc: { group: 'Field Rect', name: 'Rect', type: 'text' },

            mouseScreenx: { group: 'Mouse', name: 'Screen x', type: 'text' },
            mouseScreeny: { group: 'Mouse', name: 'Screen y', type: 'text' }
           
        }; 
        
        var options = {
            meta: debugConfig,
            prefix: 'debug',
            helpHtml: '[?]'
        };

        $('#debugpropgrid').jqPropertyGrid(debugData, options);
        $('#debugdialog').dialog({
            resizable: false,
            closeOnEscape: false,
        });
    }

    #createFormatHelpWindow(type) {
		var filterType = type
        var fType = ''		// ECC testing
        $('#formatlisttable').DataTable().destroy()
        $('#formatlisttable').removeClass('hidden')
        $(document).off('click', '.oe-format-replace')
        $(document).off('click', '.oe-format-add')

        var formatTable = $('#formatlisttable')
			.on('preXhr.dt', function (e, settings, data) {	
			})			
			.on('xhr.dt', function (e, settings, json, xhr) {
				let filters = []
				for (let i = 0; i < json.data.length; i++) {
					let key = json.data[i].type
					if (filters[key] === undefined) {
						filters[key] = 0
					}
					filters[key] = filters[key] + 1
				}
				$('#oe-format-filters').empty()
				$('#oe-format-filters').html('<option value="all">Show All</option>');
				Object.entries(filters).forEach(([filter, total]) => {
					let opt = filter.charAt(0).toUpperCase() + filter.slice(1)
                    let selectedAttr = (filter === filterType) ? ' selected' : '';
					$('#oe-format-filters').append('<option value="' + filter + '"' + selectedAttr + '>' + opt + '</option>');
				});

				$('#oe-format-filters').off('change')			
				$('#oe-format-filters').on('change', function() {
	filterType = this.value;	// ECC testing
	//x console.log("Got change, value=", this.value);
					if (this.value === 'all') {
						formatTable.column(3).search('').draw()
					} else {
						formatTable.column(3).search(this.value).draw()
					}
				});
                $('#oe-format-filters').trigger('change');		
			})
			.DataTable({
				ajax: {
					url: 'includes/overlayutil.php?request=Formats',
					dataType: 'json'
				},
                order: [[4, 'asc']],
                paging: false,
				scrollY: '25vh',
				scrollCollapse: true,
                autoWidth: false,                 
				columns: [
					{ 
						data: 'format',
						width: '20%',
                        render: function(data, type, row, meta) {
                            let result = data
                            if (row.value !== '') {
                                result = '<b class="as-variable-has-value">' + data + '</b>'
                            }
                            return result
                        }                          
					},
					{ 
						data: 'description',
						width: '40%'					
					},
					{ 
						data: 'example',
						width: '20%'					
					},                  
					{ 
                        data: function(data, type) {
                            fType = data.type.charAt(0).toUpperCase() + data.type.slice(1);
							return fType;
						},
						visible: false
					},
					{ 
						data: 'legacy',
                        defaultContent: 'Current',
                        visible: false,
						width: '5%'					
					},                     
					{
						data: null,
						width: '10%',
						render: function (item, type, row, meta) {
                            let buttons = '';
                            if (item.legacy !== 'Legacy') {
                                let icon = '<i class="fa-solid fa-right-to-bracket"></i></button>';
                                let buttonReplace = '<button type="button" title="Replace Format" class="btn btn-success btn-xs oe-format-replace" data-index="' + meta.row + '" data-format="' + item.format + '">' + icon + '</button>';
                                let buttonAdd = ''

                                if (row.stackable) {
                                    icon = '<i class="fa-solid fa-plus"></i></button>';
                                    buttonAdd = '<button type="button" title="Add to format" class="btn btn-primary btn-xs oe-format-add" data-format="' + item.format + '">' + icon + '</button>';
                                }
                                
                                buttons = '<div class="btn-group">' + buttonReplace + buttonAdd + '</div>';
                            }
							return buttons;
						}
					}                
				],
                    rowGroup: {
                        dataSrc: 'legacy',
                        startRender: function (rows, group) {
                            // TODO: Only show "Available Formats" if showing all filters (filterType == "all").
							let label = '';
							let showHeader = true;
							if (filterType !== "all" && group !== 'Legacy') {
								showHeader = false;
							}
		//x console.log("filterType=" + filterType, " group=" + group, " showHeader=", showHeader);
                            if (group === 'No group') {
                                group = '<u>Available Formats';
                                // TODO: FIX: this works except when "Show All" is selected, then every group says "Temperature"
                                // group += ' for ' + fType;
                                group += '</u>';
								label = "<br>";
                            }
                            var collapsed = !!legacyCollapsedGroups[group];
                            
                            rows.nodes().each(function (r) {
                                r.style.display = collapsed ? 'none' : '';
                            });    

                            if (group === 'Legacy') {	// TODO: Add filter name if "Show All" is selected.
                                group = 'Legacy Formats - DO NOT USE';
                            }
                            let icon = collapsed ? '<i class="fa-solid fa-angles-right"></i>' : '<i class="fa-solid fa-angles-down"></i>';
							if (showHeader) label += icon + ' ' + group;
                            return $('<tr/>')
                                .append('<td colspan="9">' + label + '</td>')
                                .attr('data-name', group)
                                .toggleClass('collapsed', collapsed);
                        }
                    }                 
			})

            var legacyCollapsedGroups = {};                
            $('#formatlisttable').on('click', 'tr.dtrg-start', function () {
                var name = $(this).data('name');
                legacyCollapsedGroups[name] = !legacyCollapsedGroups[name];
                formatTable.draw(false);
            });  

        $('#formatdialog').dialog({
            resizable: false,
            closeOnEscape: false,
            width: 900,
            close: function(event, ui) {
				$(document).off('click', '.oe-format-replace')
				$(document).off('click', '.oe-format-add')
				$(document).off('click', '#oe-format-filters-close')
				$('#oe-format-filters').off('change')
				$('#formatlisttable').off('preXhr.dt')
				$('#formatlisttable').off('xhr.dt')					
				$('#formatlisttable').DataTable().destroy()
			}			
        })
        
		$(document).off('click', '.oe-format-replace')
        $(document).on('click', '.oe-format-replace', (event) => {
            let format = '';
            if (this.#selected !== null) {
                format = this.#selected.format
                format = format.slice(1, -1);
            }

            const index = $(event.currentTarget).data('index');
            const table = $('#formatlisttable').DataTable();
            const rowData = table.row(index).data();

            if (rowData.format === 'customdate' || rowData.format === 'Custom date') {
                $.fn.dateFormatBuilder({
                    onSave: function (format) {
                        let uiManager = window.oedi.get('uimanager')
                        uiManager.updateFormat('{' + format + '}', 'replace')
                    }
                });

            } else {
                if ('attribute' in rowData) {
                    const jsonData = rowData.attribute
                    const keys = Object.keys(jsonData);

                    $('body').formModalFromJson({
                        data: jsonData,
                        keys: keys,
                        initialValues: format,
                        title: 'Configure Format "' + rowData.format + '" Options',
                        onSubmit: function (resultString) {
                            let uiManager = window.oedi.get('uimanager')
                            //let format = '{' + $(event.currentTarget).data('format') + '}'
                            uiManager.updateFormat('{' + resultString + '}', 'replace')
                        }
                    });
                } else {
                    let uiManager = window.oedi.get('uimanager')
                    uiManager.updateFormat('{' + rowData.format + '}', 'replace')
                }
            }
        })

        $(document).off('click', '.oe-format-add')		
        $(document).on('click', '.oe-format-add', (event) => {
            let uiManager = window.oedi.get('uimanager')
            let format = $(event.currentTarget).data('format')
            uiManager.updateFormat(format, 'add')
        })

        $(document).off('click', '#oe-format-filters-close')		
        $(document).on('click', '#oe-format-filters-close', (event) => {
			$('#formatdialog').dialog('close')
        })
		
    }

    updateFormat(format, type) {
        let uiManager = window.oedi.get('uimanager');
        let field = uiManager.selected;

        if (type == 'replace') {
            field.format = format;
        } else {
            field.format = field.format + format;
        }

        uiManager.updatePropertyEditor();
        if ($('#oe-test-mode').hasClass('pulse')) {
            let fieldManager = window.oedi.get('fieldmanager');
            fieldManager.enableTestMode();
        }
    }
}
