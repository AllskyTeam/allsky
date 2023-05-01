; (function ($) {

    $.allskyROI = function (options) {
        var defaults = {
            id: 'alex',
            fallbackValue: 5,
            dirty: false,
            roi: null,
            roiSelected: function (roi) { }
        }

        var plugin = this;

        plugin.settings = {}

        plugin.rioId = options.id + "-allskyroi";
        plugin.rioContainerId = options.id + "-allskyroi-container";

        plugin.init = function () {

            plugin.settings = $.extend({}, defaults, options);

            let roiHTML = '\
                <div class="modal" role="dialog" id="' + plugin.rioId + '">\
                    <div class="modal-dialog modal-lg" role="document">\
                        <div class="modal-content">\
                            <div class="modal-header">\
                                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>\
                                <h4 class="modal-title">ROI</h4>\
                            </div>\
                            <div class="modal-body">\
                                <div class="oe-roi" id="' + plugin.rioContainerId + '">\
                                </div>\
                            </div>\
                            <div class="modal-footer">\
                                <button type="button" class="btn btn-danger" data-dismiss="modal">Cancel</button>\
                                <button type="button" class="btn btn-primary" id="' + plugin.rioId + '-save">Save</button>\
                            </div>\
                        </div>\
                    </div>\
                </div>\
            ';
            $('#' + plugin.rioId).remove();
            $(document.body).append(roiHTML);

            $(document).on('click', '#' + plugin.rioId + '-save', (event) => {
                if (plugin.settings.dirty) {
                    x1 = ((roi.x() / hRatio) | 0);
                    y1 = ((roi.y() / hRatio) | 0);
                    x2 = (x1 + ((roi.width() * roi.scaleX()) / hRatio)) | 0;
                    y2 = (y1 + ((roi.height() * roi.scaleY()) / hRatio)) | 0;
                    plugin.settings.roiSelected.call(this, {x1: x1, y1: y1, x2: x2, y2: y2});
                }
                $('#' + plugin.rioId).modal('hide');
            });

            var stage;
            var layer;
            var roi;
            var tr;
            var hRatio
            plugin.settings.dirty = false;

            var imageObj = new Image();
            imageObj.onload = function () {
                var containerWidth = $('#' + plugin.rioContainerId).width();
                hRatio = containerWidth  / imageObj.width    ;
                stage = new Konva.Stage({
                    container: plugin.rioContainerId,
                    width: containerWidth,
                    height: (imageObj.height * hRatio) + 40
                });
      
                layer = new Konva.Layer();
                stage.add(layer);
    
                var backgroundImage = new Konva.Image({
                    x: 0,
                    y: 0,
                    scaleX: hRatio,
                    scaleY: hRatio,                
                    image: imageObj,
                    width: imageObj.width,
                    height: imageObj.height
                });
                layer.add(backgroundImage);

                if (plugin.settings.roi !== null) {
                    let roiData = plugin.settings.roi;
                    x1 = roiData.x1 | 0;
                    y1 = roiData.y1 | 0;
                    x2 = roiData.x2 | 0;
                    y2 = roiData.y2 | 0;
                } else {
                    fallbackAdj = (100 / plugin.settings.fallbackValue)
                    x1 = ((imageObj.width / 2) - ((imageObj.width / fallbackAdj)/2)) | 0;
                    y1 = ((imageObj.height / 2) - ((imageObj.height / fallbackAdj)/2)) | 0;
                    x2 = ((imageObj.width / 2) + ((imageObj.width / fallbackAdj)/2)) | 0;
                    y2 = ((imageObj.height / 2) + ((imageObj.height / fallbackAdj)/2)) | 0;
                }

                roi = new Konva.Rect({
                    x: (x1 * hRatio) | 0,
                    y: (y1 * hRatio) | 0,
                    width: (x2 - x1) | 0,
                    height: (y2 - y1) | 0,
                    scaleX: hRatio,
                    scaleY: hRatio,
                    name: 'roi',
                    draggable: true,
                    stroke: 'white',
                    strokeWidth: 1,
                    strokeScaleEnabled: false           
                });
                layer.add(roi);

                roi.on('dragend', () => {
                    checkROI();                    
                });
                roi.on('dragmove', () => {
                    checkROI();
                });
                roi.on('transform', () => {
                    checkROI();
                });

                tr = new Konva.Transformer({
                    rotateEnabled: false,
                    ignoreStroke: true,
                    nodes: [roi],
                    padding: 0,
                    flipEnabled: false,
                    boundBoxFunc: (oldBox, newBox) => {
                        let outSide = false;

                        roiPos = getROICoordinates(true);
                        if (roi.x() >= roiPos.xMax) {
                            outSide = true;
                        }
                        if (roi.y() >= roiPos.yMax) {
                            outSide = true;
                        }

                        if (outSide) {
                            return oldBox;
                        } else {
                            return newBox;
                        }
                    }
                });
                layer.add(tr);

                var text = new Konva.Text({
                    x: 5,
                    y: stage.height() - 30,
                    fontSize: 20,
                    fill: 'white'
                });
                layer.add(text);
                updateText();

                function checkROI() {
                    roiPos = getROICoordinates(true);
                    if (roi.x() < 1) {
                        roi.x(1);
                    }
                    if (roi.y() < 1) {
                        roi.y(1);
                    }
                    
                    if (roi.x() >= roiPos.xMax) {
                        roi.x(roiPos.xMax);
                    }
                    if (roi.y() >= roiPos.yMax) {
                        roi.y(roiPos.yMax);
                    }
                    updateText();
                    plugin.settings.dirty = true;
                }

                function getROICoordinates(screen = false) {
                    roiCoordinates = {};

                    if (screen) {
                        roiCoordinates.x = (roi.x() | 0);
                        roiCoordinates.y = (roi.y() | 0);
                        roiCoordinates.width = (roi.width() * roi.scaleX()) | 0;
                        roiCoordinates.height = (roi.height() * roi.scaleY()) | 0;
                        roiCoordinates.xMax = (backgroundImage.width() * backgroundImage.scaleX()) - roiCoordinates.width - 1;
                        roiCoordinates.yMax = (backgroundImage.height() * backgroundImage.scaleY()) - roiCoordinates.height - 1;
                    } else {

                    }

                    return roiCoordinates;
                }

                function updateText() {
                    var lines = [
                      //'x: ' + (roi.x() | 0),
                      //'y: ' + (roi.y() | 0),
                      'X: ' + ((roi.x() / hRatio) | 0),
                      'Y: ' + ((roi.y() / hRatio) | 0),
                      'width: ' + (((roi.width() * roi.scaleX()) / hRatio) | 0),
                      'height: ' + (((roi.height() * roi.scaleY()) / hRatio) | 0),
                      //'scaleX: ' + (roi.scaleX() | 0),
                      //'scaleY: ' + (roi.scaleY() | 0),
                      //'hRatio: ' + hRatio
                    ];
                    //text.text(lines.join('\n'));
                    text.text(lines.join(', '));
                  }

            };
            imageObj.src = 'current/tmp/image.jpg?_ts=1662585950244';

            $('#' + plugin.rioId).modal({
                keyboard: false
            });
         
        }

        plugin.destroy = function () {
            $(document).removeData('allskyROI');
        }

        plugin.getROI = function() {

        }

        plugin.init();

    }

    $.fn.allskyROI = function (options) {
        return this.each(function () {
            if (undefined == $(this).data('allskyROI')) {
                var plugin = new $.allskyROI(this, options);
                $(this).data('allskyROI', plugin);
            }
        });
    }

})(jQuery);