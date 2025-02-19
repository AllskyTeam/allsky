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
		
			plugin.drawMode = 'paint'
			plugin.shape = 'circle'

			plugin.isDrawing = false
			plugin.brushSize = 80
			plugin.brushColor = 'black'
			plugin.brushStyle = 'solid'

			createUI()
			createKonva()
			createKonvaNavEvents()
			createKonvaDrawEvents()
			createToolbarEvents()
			updateToolbar()	
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
  <button class="btn btn-default dropdown-toggle navbar-btn" type="button" data-toggle="dropdown">
    <i class="fa-solid fa-brush mr-2"></i>
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
  <button class="btn btn-default dropdown-toggle navbar-btn" type="button" data-toggle="dropdown">
    <i class="fa-solid fa-palette"></i>
    <span class="caret"></span>
  </button>
  <ul class="dropdown-menu allsky-mask-colour-dropdown-background">
    <li><div id="allsky-mask-tool-colour-black" class="allsky-mask-tool-colour" data-colour="black"><span>Mask<span></li>
    <li><div id="allsky-mask-tool-colour-white" class="allsky-mask-tool-colour" data-colour="white"><span>Keep<span></li>
  </ul>
</div>										
										</li>
										

										<li>
<div class="dropdown ml-3">
  <button class="btn btn-default dropdown-toggle navbar-btn" type="button" data-toggle="dropdown">
    <i class="fa-solid fa-up-right-and-down-left-from-center mr-2"></i>
    <span class="caret"></span>
  </button>
  <ul class="dropdown-menu allsky-mask-brush-dropdown-background">
    <li class="ml-4 mr-4">
		<input id="brushsize" data-slider-id='brushsizeslider' type="text" data-slider-min="0" data-slider-max="400" data-slider-step="1" data-slider-value="14"/>
	</li>
  </ul>
</div>											
										</li>


										<li>
<div class="dropdown ml-3">
  <button class="btn btn-default dropdown-toggle navbar-btn" type="button" data-toggle="dropdown">
    <i class="fa-solid fa-magnifying-glass mr-2"></i>
    <span class="caret"></span>
  </button>
  <ul class="dropdown-menu allsky-mask-zoom-dropdown-background">
    <li class="ml-4 mr-4">
		<input id="allsky-mask-tool-zoom" data-slider-id='allsky-mask-tool-zoom-slider' type="text" data-slider-min="0" data-slider-max="100" data-slider-step="1" data-slider-value="14"/>
	</li>
  </ul>
</div>											
										</li>

										<li>

<div class="dropdown ml-3">
  <button class="btn btn-default dropdown-toggle navbar-btn" type="button" data-toggle="dropdown">
    <span id="allsky-mask-toolbar-shape"><i class="fa-solid fa-palette"></i></span>
    <span class="caret"></span>
  </button>
  <ul class="dropdown-menu allsky-mask-shape-dropdown-background">
    <li><button type="button" class="btn btn-default ml-1 allsky-mask-tool-shape" data-shape="rectangle"><i class="fa-solid fa-square"></i></button></li>
    <li><button type="button" class="btn btn-default ml-1 allsky-mask-tool-shape" data-shape="circle"><i class="fa-solid fa-circle"></i></button></li>
    <li><button type="button" class="btn btn-default ml-1 allsky-mask-tool-shape" data-shape="path"><i class="fa-solid fa-draw-polygon"></i></button></li>
  </ul>
</div>	

										</li>
										<li><button class="btn btn-default navbar-btn ml-1 allsky-mask-tool-drawing" id="allsky-mask-tool-paint"><i class="fa-solid fa-brush"></i></button></li>
										<li><button class="btn btn-default navbar-btn ml-1 allsky-mask-tool-drawing" id="allsky-mask-tool-erase"><i class="fa-solid fa-eraser"></i></button></li>


										<li><button class="btn btn-default navbar-btn ml-3" id="allsky-mask-undo"><i class="fa-solid fa-arrow-rotate-left"></i></button></li>
										<li><button class="btn btn-default navbar-btn ml-1" id="allsky-mask-redo"><i class="fa-solid fa-rotate-right"></i></button></li>
										<li>

<div class="dropdown ml-3">
	<button class="btn btn-default dropdown-toggle navbar-btn" type="button" data-toggle="dropdown">
		<img class="allsky-mask-tool-opacity-black">
		<span class="caret"></span>
  	</button>
	<ul class="dropdown-menu allsky-mask-brush-dropdown-background">
		<li class="ml-4 mr-4">
			<input id="maskopacity" data-slider-id='maskopacityslider' type="text" data-slider-min="0" data-slider-max="100" data-slider-step="1" data-slider-value="14"/>
		</li>
  	</ul>
</div>	
										</li>
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
			plugin.checkLayer = new Konva.Layer();			
			plugin.stage.add(plugin.imageLayer);
			plugin.stage.add(plugin.maskLayer);
			plugin.stage.add(plugin.mouseLayer);
			plugin.stage.add(plugin.checkLayer);
			
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
				  })
				  
				  plugin.maskLayer.add(plugin.clipRect)

				  plugin.maskLayer.clipFunc(function (ctx) {
					ctx.rect(plugin.clipRect.x(), plugin.clipRect.y(), plugin.clipRect.width(), plugin.clipRect.height())
				  })

				  let stageHeight = plugin.stage.height()
				  let scale = stageHeight / image.height()
				  
				  plugin.stage.scale({ x: scale, y: scale })
				  $('#allsky-mask-tool-zoom').slider('setValue', Math.floor(scale * 100))
			})

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

			plugin.stage.on('mousedown touchstart', () => {
				plugin.isDrawing = true
				plugin.tempUndo = []
				plugin.redo = []


				if (plugin.shape == 'rectangle') {
					let pos = plugin.stage.getPointerPosition()
					let scale = plugin.stage.scaleX()
					plugin.drawRect = new Konva.Rect({
						x: pos.x / scale,
						y: pos.y / scale,
						width: 1,
						height: 1,
						fill: plugin.brushColor,
						draggable: true
					})
					plugin.maskLayer.add(plugin.drawRect)
				}

				if (plugin.shape == 'path') {
					plugin.points = []
					let pos = plugin.stage.getPointerPosition();
					let scale = plugin.stage.scaleX()
					plugin.points.push(pos.x / scale, pos.y / scale);
				
					plugin.drawLine = new Konva.Line({
						points: plugin.points,
						stroke: 'black',
						strokeWidth: 2,
						fill: plugin.brushColor,
						closed: false
					});
					plugin.maskLayer.add(plugin.drawLine)
				}

			})
			
			plugin.stage.on('mouseup touchend', () => {

				plugin.isDrawing = false

				if (plugin.tempUndo.length > 0) {
					plugin.undo.push(plugin.tempUndo)
				}

				if (plugin.shape == 'path') {
					plugin.drawLine.strokeWidth(0)
					plugin.drawLine.closed(true)
					plugin.maskLayer.batchDraw()
				}
				updateToolbar()
			})
			
			plugin.stage.on('mousemove touchmove', (e) => {
				let scale = plugin.stage.scaleX()
			
				var pointerPos = plugin.stage.getPointerPosition();
				var circleRect = plugin.image.getClientRect()
				
				if (pointerPos.x >= circleRect.x && pointerPos.x <= circleRect.x + circleRect.width &&
					pointerPos.y >= circleRect.y && pointerPos.y <= circleRect.y + circleRect.height) {
				} else {
					plugin.isDrawing = false
					return
				}

				if (pointerPos) {
					if (plugin.shape == 'circle' || plugin.drawMode == 'erase') {
						plugin.brushCircle.radius(plugin.brushSize)
						plugin.brushCircle.position({
							x: pointerPos.x / scale,
							y: pointerPos.y / scale 
						})
						plugin.brushCircle.visible(true)
					} else {
						plugin.brushCircle.visible(false)
					}
				}

				if (!plugin.isDrawing) return;

				if (plugin.drawMode == 'paint') {

					if (plugin.shape == 'path') {
						plugin.points.push(pointerPos.x / scale, pointerPos.y / scale);
						plugin.drawLine.points(plugin.points)
						plugin.maskLayer.draw()
					}

					if (plugin.shape == 'rectangle') {

						let newWidth = (pointerPos.x / scale) - plugin.drawRect.x()
						let newHeight = (pointerPos.y / scale) - plugin.drawRect.y()
					
						plugin.drawRect.width(newWidth)
						plugin.drawRect.height(newHeight)
					}

					if (plugin.shape == 'circle') {
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
					}
				}

				if (plugin.drawMode == 'erase') {
					var circle = new Konva.Circle({
						x: pointerPos.x / scale,
						y: pointerPos.y / scale,
						radius: plugin.brushSize,
						fill: 'white',
						globalCompositeOperation: 'destination-out',
						listening: false
					  })
				
					  plugin.maskLayer.add(circle)

				}

				plugin.maskLayer.draw();
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

			$(document).on('click', '.allsky-mask-tool-shape', (e) => {
				plugin.shape = $(e.currentTarget).data('shape') 
				updateToolbar()
			})

			
			$(document).on('click', '.allsky-mask-tool-colour', (e) => {
				plugin.brushColor = $(e.target).data('colour') 
				updateToolbar()
			})

			$(document).on('click', '#allsky-mask-tool-paint', () => {
				plugin.brushColor = 'white'
				plugin.drawMode = 'paint'
				updateToolbar()
			})

			$(document).on('click', '#allsky-mask-tool-erase', () => {
				plugin.brushColor = 'white'
				plugin.drawMode = 'erase'
				updateToolbar()
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
			
			$('#allsky-mask-tool-zoom').slider({
				value: 80
			}).on('slide', (e) => {
				let scale = e.value / 100
				plugin.stage.scale({x: scale, y: scale})
				plugin.stage.fire('mousemove', { evt: { } })
			})	

			


			$('body').on('click', '.allsky-mask-brush', (e) => {
				plugin.brushStyle = $(e.target).data('brush')
			})

			$('body').on('click', '#allsky-mask-new', (e) => {
				plugin.maskLayer.destroyChildren()
				plugin.maskLayer.draw()
				plugin.redo = []
				plugin.undo = []
			})

			$('body').on('click', '#allsky-mask-undo', (e) => {
				let lastShapeList = plugin.undo.pop()
				if (lastShapeList) {
					for (let shapeEntry of lastShapeList) {
						shapeEntry.remove()
					}
				  	plugin.maskLayer.draw()
//TODO: Need to clone
					plugin.redo.push(lastShapeList)
					updateToolbar()
				}
			})
			
			$('body').on('click', '#allsky-mask-redo', (e) => {
				let lastShapeList = plugin.redo.pop()
				if (lastShapeList) {
					for (let shapeEntry of lastShapeList) {
						plugin.maskLayer.add(shapeEntry)
					}
				  	plugin.maskLayer.draw()
					updateToolbar()
				}
			})
		
		}

		var updateToolbar = function() {
			$('.allsky-mask-tool-drawing').removeClass('active')
			if (plugin.drawMode == 'paint') {
				$('#allsky-mask-tool-paint').addClass('active')
			}		
	
			if (plugin.drawMode == 'erase') {
				$('#allsky-mask-tool-erase').addClass('active')
			}
			
			if (plugin.undo.length > 0) {
				$('#allsky-mask-undo').removeClass('disabled')
			} else {
				$('#allsky-mask-undo').addClass('disabled')
			}

			if (plugin.redo.length > 0) {
				$('#allsky-mask-redo').removeClass('disabled')
			} else {
				$('#allsky-mask-redo').addClass('disabled')
			}

			if (plugin.shape == 'circle') {
				$('#allsky-mask-toolbar-shape').empty()
				$('#allsky-mask-toolbar-shape').html('<i class="fa-solid fa-circle"></i>')
			}

			if (plugin.shape == 'rectangle') {
				$('#allsky-mask-toolbar-shape').empty()
				$('#allsky-mask-toolbar-shape').html('<i class="fa-solid fa-square"></i>')
			}

			if (plugin.shape == 'path') {
				$('#allsky-mask-toolbar-shape').empty()
				$('#allsky-mask-toolbar-shape').html('<i class="fa-solid fa-draw-polygon"></i>')
			}

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