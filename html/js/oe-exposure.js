"use strict";
/**
 * Class for handling the auto exposure region editor.
 */
class OEEXPOSURE {

    #exposureStage = null;
    #exposureLayer = null
    #exposureRect = null;
    #transformer = null;
    #exposureBackgroundImage = null;
    #stageScale = 0.6;
    #stageMode = 'fit';

    constructor() {

        var imageObj = new Image();
        imageObj.src = $('#oe-background-image').attr('src');


        this.#exposureBackgroundImage = new Konva.Image({
            x: 0,
            y: 0,
            image: imageObj,
        });

        var width = this.#exposureBackgroundImage.width();
        var height = this.#exposureBackgroundImage.height();

        this.#exposureStage = new Konva.Stage({
            container: 'oe-exposure-stage',
            width: width,
            height: height,
            draggable: true
        });

        this.#exposureLayer = new Konva.Layer();
        this.#exposureLayer.add(this.#exposureBackgroundImage);
        this.#exposureStage.add(this.#exposureLayer);     
        this.setZoom('oe-autoexposure-zoom-fit');
    }

    setZoom(type) {
        this.#stageMode = '';
        switch (type) {
            case 'oe-autoexposure-zoom-in':
                this.#stageScale += 0.01;
                this.#exposureStage.draggable(true);
                break;

            case 'oe-autoexposure-zoom-out':
                this.#stageScale -= 0.01;
                this.#exposureStage.draggable(true);
                break;

            case 'oe-autoexposure-zoom-full':
                this.#stageScale = 1;
                this.#exposureStage.draggable(true);
                break;

            case 'oe-autoexposure-zoom-fit':
                let width = $('#oe-viewport').width();
                if (this.#exposureBackgroundImage.width() > width) {
                    this.#stageScale = width / this.#exposureBackgroundImage.width();
                    this.#exposureStage.position({ x: 0, y: 0 });
                    this.#exposureStage.draggable(false);
                    this.#stageMode = 'fit';
                } else {
                    this.#stageScale = 1;
                    this.#exposureStage.draggable(false);                    
                }                
                break;
        }

        this.#exposureStage.scale({ x: this.#stageScale, y: this.#stageScale });
    }

    start() {
        $(document).on('click', '#oe-autoexposure-save', { self: this }, function (event) {
            self = event.data.self;
            let rect = self.#exposureRect;
            let pos = rect.position();

            let position = {
                x: pos.x | 0,
                y: pos.y | 0,
                xrad: (rect.radiusX() * rect.scaleX()) | 0,
                yrad: (rect.radiusY() * rect.scaleY()) | 0,
                stagewidth: self.#exposureStage.width(),
                stageheight: self.#exposureStage.height()
            }

            $.ajax({
                type: 'POST',
                url: 'includes/overlayutil.php?request=AutoExposure',
                data: {data: JSON.stringify(position)},
                dataType: 'json',
                cache: false
            });
        });

        $(document).on('click', '#oe-autoexposure-reset', (event) => {
            let width = this.#exposureBackgroundImage.width();
            let height = this.#exposureBackgroundImage.height();
            let maskDiameter = (height / 3) | 0;
            let maskRadius = (maskDiameter / 2) | 0;
            let x = ((width / 2) | 0);
            let y = ((height / 2) | 0);
            this.#exposureRect.x(x);
            this.#exposureRect.y(y);
            this.#exposureRect.radiusX(maskRadius);
            this.#exposureRect.radiusY(maskRadius);
        });

        $(document).on('click', '.oe-autoexposure-zoom', (event) => {
            this.setZoom(event.currentTarget.id);
        });

        $.ajax({
            type: "GET",
            url: "includes/overlayutil.php?request=AutoExposure",
            data: "",
            dataType: 'json',
            cache: false,
            context: this
        }).done(function( data ) {

            this.#exposureRect= new Konva.Ellipse({
                x: data.x,
                y: data.y,
                radiusX: data.xrad,
                radiusY: data.yrad,
                fill: 'red',
                name: 'rect',
                opacity: 0.3,
                draggable: true,                
              })
              this.#exposureLayer.add(this.#exposureRect );
    
              this.#transformer = new Konva.Transformer({
                rotateEnabled: false
              });
              this.#exposureLayer.add(this.#transformer);
        
              this.#transformer.nodes([this.#exposureRect]);
    
              this.#exposureLayer.batchDraw();
        });

    }
}