"use strict";
; (function ($) {

    $.allskyMASK = function (el, options) {
        var defaults = {
            dirty: false,
			id: 'mask',
            onClick: function (latlon) { }
        }

        var plugin = this;
        var el = $(el);
        plugin.settings = {}

        plugin.init = function () {
            plugin.settings = $.extend({}, defaults, options);

			let pluginPrefix = plugin.settings.id + '-' + Math.random().toString(36).substring(2, 9);

			plugin.undo = []
			plugin.tempUndo = []
			plugin.redo = []			
            plugin.modalid = `${pluginPrefix}-modal`
            plugin.modaliddialog = `${pluginPrefix}-modal-dialog`
            plugin.modaliddialogel = `.${pluginPrefix}-modal-dialog`
            plugin.modalidbody = `${pluginPrefix}-modal-body`
			plugin.modalidel = `#${plugin.modalid}`
            plugin.modalidbodyel = `#${pluginPrefix}-modal-body`
			createUI()
			createKonva()
			createKonvaNavEvents()
			createKonvaDrawEvents()
			createToolbarEvents()		
        }

		var createUI = function() {

			let maskDialog = `\
				<div id="${plugin.modalid}" class="modal fade allsky-mask-editor" role="dialog">
					<div class="modal-dialog allsky-mask-modal ${plugin.modaliddialog}">
						<div class="modal-content">
						<div class="modal-header">
							<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
							<h4 class="modal-title" id="myModalLabel">Allsky Mask Editor</h4>
						</div>
						<div class="modal-body">
							<div class="navbar navbar-default">
								<div class="container-fluid">
									<ul class="nav navbar-nav navbar-left">
										<li><button class="btn btn-default navbar-btn" id="allsky-mask-new"><i class="fa-solid fa-file"></i></button></li>

										<li>
<div class="dropdown ml-3">
  <button class="btn btn-primary dropdown-toggle navbar-btn" type="button" data-toggle="dropdown">
    Select Brush
    <span class="caret"></span>
  </button>
  <ul class="dropdown-menu allsky-mask-brush-dropdown-background">
    <li><div id="allsky-mask-brush-soft" class="allsky-mask-brush" data-brush="soft"></li>
    <li><div id="allsky-mask-brush-hard" class="allsky-mask-brush" data-brush="solid"></li>
  </ul>
</div>
										</li>
										<li>
<div class="dropdown ml-3">
  <button class="btn btn-primary dropdown-toggle navbar-btn" type="button" data-toggle="dropdown">
    Brush Size
    <span class="caret"></span>
  </button>
  <ul class="dropdown-menu allsky-mask-brush-dropdown-background">
    <li class="ml-4 mr-4">
		<input id="brushsize" data-slider-id='brushsizeslider' type="text" data-slider-min="0" data-slider-max="400" data-slider-step="1" data-slider-value="14"/>
	</li>
  </ul>
</div>											
										</li>
										<li><button class="btn btn-default navbar-btn ml-3" id="black"><i class="fa-solid fa-circle"></i></button></li>
										<li><button class="btn btn-default navbar-btn ml-1" id="white"><i class="fa-regular fa-circle"></i></button></li>
										<li><button class="btn btn-default navbar-btn ml-3" id="allsky-mask-undo"><i class="fa-solid fa-arrow-rotate-left"></i></button></li>
										<li><button class="btn btn-default navbar-btn ml-1" id="allsky-mask-redo"><i class="fa-solid fa-rotate-right"></i></button></li>
										<li>

<div class="dropdown ml-3">
  <button class="btn btn-primary dropdown-toggle navbar-btn" type="button" data-toggle="dropdown">
    Opacity
    <span class="caret"></span>
  </button>
  <ul class="dropdown-menu allsky-mask-brush-dropdown-background">
    <li class="ml-4 mr-4">
		<input id="maskopacity" data-slider-id='maskopacityslider' type="text" data-slider-min="0" data-slider-max="100" data-slider-step="1" data-slider-value="14"/>
	</li>
  </ul>
</div>	
										</li>
										<li><button class="btn btn-default navbar-btn ml-1" id="allsky-mask-check"><i class="fa-solid fa-check"></i></button></li>
									</ul>
								</div>
							</div>
							<div id="${plugin.modalidbody}">
								<p>This is the content of the modal.</p>
							</div>
						</div>
						<div class="modal-footer">
							<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
							<button type="button" class="btn btn-primary">Save changes</button>
						</div>
						</div>
					</div>
				</div>
			`
			$('body').append(maskDialog)
			
			plugin.dialogHeight = $(plugin.modaliddialogel).height()
			plugin.dialogWidth = $(plugin.modaliddialogel).width()
			plugin.dialogHeight = plugin.dialogHeight * 0.85
			plugin.dialogWidth = plugin.dialogWidth * 0.98

            $(plugin.modalidel).modal({
                keyboard: false
            });

			$(plugin.modalidel).off('hidden.bs.modal')
			$(plugin.modalidel).on('hidden.bs.modal', () => {
				plugin.destroy()
			});

			$('#maskopacity').slider({
				value: 100
			}).on('slide', (e) => {
				let opacity = e.value / 100
				plugin.maskLayer.opacity(opacity)
			})		

			$('#brushsize').slider({
				value: 80
			}).on('slide', (e) => {
				plugin.brushSize = e.value
				plugin.stage.fire('mousemove', { evt: { } })
			})	
			
			$('body').on('click', '.allsky-mask-brush', (e) => {
				plugin.brushStyle = $(e.target).data('brush')
			})

			$('body').on('click', '#allsky-mask-new', (e) => {
				plugin.maskLayer.destroyChildren()
				plugin.maskLayer.batchDraw()
				plugin.redo = []
				plugin.undo = []
			})

			$('body').on('click', '#allsky-mask-undo', (e) => {
				let lastShapeList = plugin.undo.pop()
				if (lastShapeList) {
					for (let shapeEntry of lastShapeList) {
						shapeEntry.destroy()
					}
				  	plugin.maskLayer.batchDraw()
//TODO: Need to clone
					plugin.redo.push(lastShapeList)
				}
			})
			
			$('body').on('click', '#allsky-mask-redo', (e) => {
				let lastShapeList = plugin.redo.pop()
				if (lastShapeList) {
					for (let shapeEntry of lastShapeList) {
						plugin.maskLayer.add(shapeEntry)
					}
				  	plugin.maskLayer.batchDraw()
				}
			})

			$('body').on('click', '#allsky-mask-check', (e) => {
				highlightNonBlackWhitePixels()
			})

		}

		var createKonva = function() {
			plugin.stage = new Konva.Stage({
				container: plugin.modalidbody,
				width: plugin.dialogWidth,
				height: plugin.dialogHeight,
			});

			plugin.imageLayer = new Konva.Layer();
			plugin.maskLayer = new Konva.Layer();
			plugin.mouseLayer = new Konva.Layer();
			plugin.stage.add(plugin.imageLayer);
			plugin.stage.add(plugin.maskLayer);
			plugin.stage.add(plugin.mouseLayer);
			
			// Load Image as Background
			Konva.Image.fromURL('current/tmp/image.jpg', function(image) {
		
				plugin.image = plugin.imageLayer.add(image)
				plugin.imageLayer.draw()

				plugin.clipRect = new Konva.Rect({
					x: 0,
					y: 0,
					width: image.width(),
					height: image.height(),
					stroke: 'black',
					strokeWidth: 2
				  });
				  
				  plugin.maskLayer.add(plugin.clipRect)

				  plugin.maskLayer.clipFunc(function (ctx) {
					ctx.rect(plugin.clipRect.x(), plugin.clipRect.y(), plugin.clipRect.width(), plugin.clipRect.height());
				  })


			});

			var scaleFactor = 0.25
			plugin.stage.scale({ x: scaleFactor, y: scaleFactor });
			plugin.stage.draw();
		}

		var createKonvaNavEvents = function() {
			plugin.stage.on('wheel', function (e) {
				e.evt.preventDefault();
				let scaleBy = 1.1;
				let oldScale = plugin.stage.scaleX();
				let scaleFactor = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
				
				plugin.stage.scale({ x: scaleFactor, y: scaleFactor });
				plugin.stage.draw();
			})

		}

		var createKonvaDrawEvents = function() {
			let isDrawing = false
			plugin.brushSize = 80
			plugin.brushColor = 'black'
			plugin.brushStyle = 'solid'

			// Start Drawing
			plugin.stage.on('mousedown touchstart', () => {
				isDrawing = true
				plugin.tempUndo = []
				plugin.redo = []
			});
			
			plugin.stage.on('mouseup touchend', () => {
				isDrawing = false
				plugin.undo.push(plugin.tempUndo)
			})
			
			// Feathered Brush Effect
			plugin.stage.on('mousemove touchmove', (e) => {
				let scale = plugin.stage.scaleX()
			
				var pointerPos = plugin.stage.getPointerPosition();
				var circleRect = plugin.image.getClientRect()
				
				if (pointerPos.x >= circleRect.x && pointerPos.x <= circleRect.x + circleRect.width &&
					pointerPos.y >= circleRect.y && pointerPos.y <= circleRect.y + circleRect.height) {
				} else {
					isDrawing = false
					return
				}

				if (pointerPos) {
					plugin.brushCircle.radius(plugin.brushSize)
					plugin.brushCircle.position({
					x: pointerPos.x / scale,
					y: pointerPos.y / scale 
				  })
				}

				if (!isDrawing) return;


				if (plugin.brushStyle == 'solid') {
					let col = 'black'
					if (plugin.brushColor == 'white') {
						col = 'white'
					}
					const solidBrush = new Konva.Circle({
						x: pointerPos.x / scale,
						y: pointerPos.y / scale,
						radius: plugin.brushSize,
						fill: col
					});
					plugin.maskLayer.add(solidBrush)
					plugin.tempUndo.push(solidBrush)
				} else {
					let col = 'rgba(0,0,0,0)'
					if (plugin.brushColor == 'white') {
						col = 'rgba(255, 255, 255, 0)'
					}
					const featheredBrush = new Konva.Circle({
						x: pointerPos.x / scale,
						y: pointerPos.y / scale,
						radius: plugin.brushSize,
						fillRadialGradientStartPoint: { x: 0, y: 0 },
						fillRadialGradientStartRadius: 0,
						fillRadialGradientEndPoint: { x: 0, y: 0 },
						fillRadialGradientEndRadius: plugin.brushSize,
						fillRadialGradientColorStops: [0, plugin.brushColor, 1, col], // Gradient fade
					});
					plugin.tempUndo.push(featheredBrush)
					plugin.maskLayer.add(featheredBrush)
				}
				plugin.maskLayer.batchDraw();
			});	
			
			
			plugin.brushCircle = new Konva.Circle({
				x: 0,
				y: 0,
				radius: plugin.brushSize,
				stroke: 'white',
				strokeWidth: 2
			  })
			  

			  plugin.mouseLayer.add(plugin.brushCircle);
			  plugin.mouseLayer.draw();

		}

		var createToolbarEvents = function() {
			$(document).on('click', '#black', () => {
				plugin.brushColor = 'black'				
			})
			$(document).on('click', '#white', () => {
				plugin.brushColor = 'white'				
			})


			$(document).keydown(function (event) {
				if (event.key === ']') {
					plugin.brushSize += 20
					$('#brushsize').slider('setValue', plugin.brushSize)
					plugin.stage.fire('mousemove', { evt: { } })
				}

				if (event.key === '[') {
					plugin.brushSize -= 20
					$('#brushsize').slider('setValue', plugin.brushSize)
					plugin.stage.fire('mousemove', { evt: { } })
				}

			})

		}


		var highlightNonBlackWhitePixels = function() {
			// Get image data from the layer's canvas
			var canvas = plugin.maskLayer.getCanvas();
			var ctx = canvas.getContext('2d');	  
			var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
			var data = imageData.data; // Array of RGBA values
	  
			// Loop through each pixel and check if it's not black or white
			for (var i = 0; i < data.length; i += 4) {
			  var r = data[i];     // Red channel
			  var g = data[i + 1]; // Green channel
			  var b = data[i + 2]; // Blue channel
			  var a = data[i + 3]; // Alpha channel
	  
			  // Check if pixel is neither black nor white
			  //if (!((r === 0 && g === 0 && b === 0) || (r === 255 && g === 255 && b === 255))) {
			if (a !== 0) {
				// Highlight the pixel by changing its color (e.g., to yellow)
				data[i] = 255;   // Red channel
				data[i + 1] = 255; // Green channel
				data[i + 2] = 0;  // Blue channel (yellow)
			  }
			}
	  
			// Put the modified data back to the canvas
			ctx.putImageData(imageData, 0, 0);
			plugin.maskLayer.batchDraw(); // Redraw the layer to show the changes
		  }


        plugin.destroy = function () {
			plugin.stage.destroy()
			$(plugin.modalidel).remove()
            $(document).removeData('allskyMASK');
        }

        plugin.init();

    }

    $.fn.allskyMASK = function (options) {
        return this.each(function () {
            if (undefined == $(this).data('allskyMASK')) {
                var plugin = new $.allskyMASK(this, options);
                $(this).data('allskyMASK', plugin);
            }
        });
    }

})(jQuery);


/*
const stage = new Konva.Stage({
    container: 'container',
    width: window.innerWidth,
    height: window.innerHeight,
});

const layer = new Konva.Layer();
stage.add(layer);

// Load Image as Background
Konva.Image.fromURL('your-image.jpg', function(image) {
    image.setAttrs({
        x: 0,
        y: 0,
        width: stage.width(),
        height: stage.height(),
    });
    layer.add(image);
    layer.draw();
});

// Brush Settings
let isDrawing = false;
const brushSize = 20; // Increase for better feathering
const brushColor = 'red';

// Start Drawing
stage.on('mousedown touchstart', () => {
    isDrawing = true;
});

stage.on('mouseup touchend', () => {
    isDrawing = false;
});

// Feathered Brush Effect
stage.on('mousemove touchmove', (e) => {
    if (!isDrawing) return;

    const pos = stage.getPointerPosition();

    const featheredBrush = new Konva.Circle({
        x: pos.x,
        y: pos.y,
        radius: brushSize,
        fillRadialGradientStartPoint: { x: 0, y: 0 },
        fillRadialGradientStartRadius: 0,
        fillRadialGradientEndPoint: { x: 0, y: 0 },
        fillRadialGradientEndRadius: brushSize,
        fillRadialGradientColorStops: [0, brushColor, 1, 'rgba(0,0,0,0)'], // Gradient fade
    });

    layer.add(featheredBrush);
    layer.batchDraw();
});

*/