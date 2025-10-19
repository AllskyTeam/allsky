"use strict";
; (function ($) {

	$.allskyMASK = function (el, options) {
		var defaults = {
			dirty: false,
			id: 'mask',
			modalId: 'allsky-mask-drawingModal',
			image: '/current/image.jpg',
			saveURL: 'includes/overlayutil.php?request=Base64Image',
			onComplete: function (latlon) { }
		}

		var plugin = this;
		var el = $(el);
		plugin.settings = {}

		plugin.init = function () {
			plugin.settings = $.extend({}, defaults, options)

			let pluginPrefix = plugin.settings.id + '-' + Math.random().toString(36).substring(2, 9)

			plugin.stage = null
			plugin.drawingLayer = null
			plugin.drawnGroup = null
			plugin.transformer = null
			plugin.originalImageWidth = 0
			plugin.originalImageHeight = 0
			plugin.imageScaleFactor = 1
			plugin.displayedImageWidth = 0
			plugin.mode = "easy"
			plugin.currentTool = "circle"
			plugin.isDrawing = false
			plugin.currentLine = null
			plugin.currentShape = null
			plugin.startPos = null
			plugin.easyCircle = null
			plugin.drawnObjects = []
			plugin.undoneObjects = []

			$.ajax({
				url: "includes/overlayutil.php?request=ImageDetails",
				type: "GET",
				dataType: "json",
				cache: false,
  				context: this,		
				success: function(response) {
					plugin.settings.image = response;
					createUI()
					addFilters()
					createEditor()
					showMaskEditor()
				},
				error: function(xhr, status, error) {
					alert("Error fetching image details, cannot start Mask Editor: " + error);
				}
			});

		}

		var addFilters = function () {
			Konva.Filters.DarkAreaBrighten = function (imageData) {
				var brightness = this.brightness()
				var data = imageData.data
				var threshold = 128
				var addValue = brightness > 0 ? brightness * 100 : 0
				for (var i = 0; i < data.length; i += 4) {
					var avg = (data[i] + data[i + 1] + data[i + 2]) / 3
					if (avg < threshold) {
						data[i] = Math.min(255, data[i] + addValue)
						data[i + 1] = Math.min(255, data[i + 1] + addValue)
						data[i + 2] = Math.min(255, data[i + 2] + addValue)
					}
				}
			}
		}

		var createUI = function () {
			let dialogHTML = `
				<div id="allsky-mask">
					<div class="modal fade" id="${plugin.settings.modalId}" tabindex="-1" role="dialog" aria-labelledby="allsky-mask-drawingModalLabel">
						<div class="modal-dialog" role="document">
							<div class="modal-content">
								<div class="modal-header">
									<button type="button" class="close" data-dismiss="modal" aria-label="Close">
										<span>&times;</span>
									</button>
									<h4 class="modal-title" id="allsky-mask-drawingModalLabel">Allsky Mask Editor</h4>
								</div>
								<div class="modal-body">
									<div id="allsky-mask-toolbar">
										<button class="allsky-mask-tool-button btn btn-default" id="allsky-mask-newBtn" title="Clear mask and start again"><i class="fa-solid fa-file"></i></button>
										<div class="btn-group" role="group">
											<button type="button" class="btn btn-default active" id="allsky-mask-easyModeBtn" title="Easy mode - can only create a circle">Easy</button>
											<button type="button" class="btn btn-default" id="allsky-mask-expertModeBtn" title="Expert mode">Expert</button>
										</div>                
										<div class="dropdown" style="display:inline-block;">
										<button id="drawingToolDropdown" class="btn btn-default dropdown-toggle" type="button" data-toggle="dropdown" title="Pick how to create the mask">
											<i class="fas fa-brush"></i> <span class="caret"></span>
										</button>
										<ul class="dropdown-menu">
											<li><a href="#" data-tool="freehand"><i class="fas fa-brush" title="Use a brush to draw"></i> Freehand brush</a></li>
											<li><a href="#" data-tool="square"><i class="fa-solid fa-square" title="Create a square"></i> Square</a></li>
											<li><a href="#" data-tool="circle"><i class="fa-solid fa-circle" title="Create a circle"></i> Circle</a></li>
											<li><a href="#" data-tool="filledPath"><i class="fa-solid fa-draw-polygon" title="Draw a shape"></i> Draw shape</a></li>
											<li><a href="#" data-tool="feather"><i class="fa-solid fa-feather" title="Use a feather to draw"></i> Feather</a></li>
										</ul>
									</div>
									<button class="allsky-mask-tool-button btn btn-default mr-0" id="allsky-mask-undoBtn" title="Undo"><i class="fa-solid fa-rotate-left"></i></button>
									<button class="allsky-mask-tool-button btn btn-default" id="allsky-mask-redoBtn" title="Redo"><i class="fa-solid fa-rotate-right"></i></button>
									<div class="dropdown mr-0" style="display:inline-block;">
										<button class="btn btn-default dropdown-toggle navbar-btn" type="button" data-toggle="dropdown" title="Change mask opacity">
											<i class="fa-solid fa-filter"></i>
											<span class="caret"></span>
										</button>
										<ul class="dropdown-menu allsky-mask-brush-dropdown-background">
											<li class="ml-4 mr-4">
												<input type="text" id="allsky-mask-opacitySlider" type="text" data-slider-min="0" data-slider-max="100" data-slider-step="1" data-slider-value="100" />
											</li>
										</ul>
									</div>	
									<div class="dropdown mr-0" style="display:inline-block;">
										<button class="btn btn-default dropdown-toggle navbar-btn" type="button" data-toggle="dropdown" title="Change image brightness">
											<i class="fa-solid fa-lightbulb"></i>
											<span class="caret"></span>
										</button>
										<ul class="dropdown-menu allsky-mask-brush-dropdown-background">
											<li class="ml-4 mr-4">
												<input type="text" id="allsky-mask-brightnessSlider" type="text" data-slider-min="0" data-slider-max="1" data-slider-step="0.1" data-slider-value="0" />
											</li>
										</ul>
									</div>	                
									<div class="dropdown mr-0" style="display:inline-block;">
										<button class="btn btn-default dropdown-toggle navbar-btn" type="button" data-toggle="dropdown" title="Adjust brush size">
											<i class="fa-solid fa-expand"></i>
											<span class="caret"></span>
										</button>
										<ul class="dropdown-menu allsky-mask-brush-dropdown-background">
											<li class="ml-4 mr-4">
												<input type="text" id="allsky-mask-brushSizeSlider" type="text" data-slider-min="0" data-slider-max="100" data-slider-step="1" data-slider-value="10" />
											</li>
										</ul>
									</div>	   
									<div class="dropdown mr-0" style="display:inline-block;">
										<button class="btn btn-default dropdown-toggle navbar-btn" type="button" data-toggle="dropdown" title="Zoom image">
											<i class="fa-solid fa-magnifying-glass"></i>
											<span class="caret"></span>
										</button>
										<ul class="dropdown-menu allsky-mask-brush-dropdown-background">
											<li class="ml-4 mr-4">
												<input type="text" id="allsky-mask-zoomSlider" type="text" data-slider-min="0.5" data-slider-max="3" data-slider-step="0.05" data-slider-value="1" />
											</li>
										</ul>
									</div>	   
								</div>
								<div id="allsky-mask-container"></div>
								</div>
								<div class="modal-footer">
									<button type="button" class="btn btn-default btn-primary" id="allsky-mask-saveBtn" title="Save mask and close">Save</button>
									<button type="button" class="btn btn-default btn-success" data-dismiss="modal" title="Close this window">Close</button>
								</div>
							</div>
						</div>
					</div>
				</div>		
			`
			$(`#${plugin.settings.modalId}`).remove()
			$('body').append(dialogHTML)
		}

		var showMaskEditor = function () {

			$(`#${plugin.settings.modalId}`).on('hidden.bs.modal', () => {
				$(`#${plugin.settings.modalId}`).remove();
				$('.modal-backdrop').remove();
				$('body').removeClass('modal-open');
				plugin.destroy();
			});

			$(`#${plugin.settings.modalId}`).modal({
				keyboard: false
			});
		}

		var createEditor = function () {

			$('#allsky-mask-brushSizeSlider').bootstrapSlider({
				value: 10
			}).on('slide', (e) => {
				brushSize = parseInt(e.value, 10);
			})
			var brushSize = parseInt($("#allsky-mask-brushSizeSlider").bootstrapSlider('getValue'), 10);


			$("#drawingToolDropdown").next(".dropdown-menu").on("click", "a", function (e) {
				e.preventDefault()
				var tool = $(this).data("tool")
				plugin.currentTool = tool

				if (tool === "freehand") {
					$("#drawingToolDropdown").html('<i class="fas fa-brush"></i> <span class="caret"></span>')
				}
				if (tool === "feather") {
					$("#drawingToolDropdown").html('<i class="fas fa-feather"></i> <span class="caret"></span>')
				}
				if (tool === "square") {
					$("#drawingToolDropdown").html('<i class="fas fa-square"></i> <span class="caret"></span>')
				}
				if (tool === "circle") {
					$("#drawingToolDropdown").html('<i class="fas fa-circle"></i> <span class="caret"></span>')
				}
				if (tool === "filledPath") {
					$("#drawingToolDropdown").html('<i class="fas fa-draw-polygon"></i> <span class="caret"></span>')
				}
			})

			$("#allsky-mask-easyModeBtn").click(function () {
				plugin.mode = "easy"
				plugin.currentTool = "circle"
				$(this).addClass("active")
				$("#allsky-mask-expertModeBtn").removeClass("active")
			})
			$("#allsky-mask-expertModeBtn").click(function () {
				plugin.mode = "expert"
				$(this).addClass("active")
				$("#allsky-mask-easyModeBtn").removeClass("active")
			})

			$("#allsky-mask-newBtn").click(function () {
				plugin.drawnGroup.destroyChildren()
				plugin.drawnObjects = []
				plugin.undoneObjects = []
				plugin.drawingLayer.draw()
				plugin.easyCircle = null
			})

			$("#allsky-mask-undoBtn").click(function () {
				if (plugin.mode === "easy") return
				if (plugin.drawnObjects.length > 0) {
					var node = plugin.drawnObjects.pop()
					node.remove()
					plugin.undoneObjects.push(node)
					plugin.drawingLayer.draw()
				}
			})

			$("#allsky-mask-redoBtn").click(function () {
				if (mode === "easy") return
				if (plugin.undoneObjects.length > 0) {
					var node = plugin.undoneObjects.pop()
					plugin.drawnGroup.add(node)
					plugin.drawnObjects.push(node)
					plugin.drawingLayer.draw()
				}
			})

			$("#allsky-mask-saveBtn").click(() => {
				plugin.transformer.hide()
				plugin.drawingLayer.opacity(1)
				plugin.drawingLayer.draw()
				var pixelRatio = 1 / plugin.imageScaleFactor
				var dataURL = plugin.drawingLayer.toDataURL({
					pixelRatio: pixelRatio,
					x: 0,
					y: 0,
					width: plugin.stage.width(),
					height: plugin.stage.height(),
					backgroundColor: "transparent"
				})
				plugin.transformer.show()
				plugin.drawingLayer.draw()
				var tempCanvas = document.createElement("canvas")
				tempCanvas.width = plugin.originalImageWidth
				tempCanvas.height = plugin.originalImageHeight
				var ctx = tempCanvas.getContext("2d")
				ctx.fillStyle = "black"
				ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height)
				var drawingImg = new Image()
				drawingImg.onload = function () {
					ctx.drawImage(drawingImg, 0, 0, plugin.originalImageWidth, plugin.originalImageHeight)
					var finalDataURL = tempCanvas.toDataURL()
					$("<img>").attr("src", finalDataURL)
					.addClass("mask-tmp-image")
					.css({
						"max-width": "100%",
						"display": "none",
						"margin": "10px auto"
					}).appendTo("body")
					plugin.finalDataURL = finalDataURL
					saveImage();
				}


				drawingImg.src = dataURL;
			})

			$(`#${plugin.settings.modalId}`).on("shown.bs.modal", function () {
				var container = document.getElementById("allsky-mask-container")
				var rect = container.getBoundingClientRect()
				var containerWidth = rect.width
				var containerHeight = rect.height

				plugin.stage = new Konva.Stage({
					container: "allsky-mask-container",
					width: containerWidth,
					height: containerHeight
				})

				var imageLayer = new Konva.Layer()
				plugin.drawingLayer = new Konva.Layer()
				plugin.stage.add(imageLayer)
				plugin.stage.add(plugin.drawingLayer)

				plugin.drawnGroup = new Konva.Group({ id: "allsky-mask-plugin.drawnGroup" })
				plugin.drawingLayer.add(plugin.drawnGroup)

				plugin.transformer = new Konva.Transformer()
				plugin.drawingLayer.add(plugin.transformer)

				var imageObj = new Image()
				imageObj.onload = function () {
					plugin.originalImageWidth = imageObj.naturalWidth
					plugin.originalImageHeight = imageObj.naturalHeight
					plugin.imageScaleFactor = Math.min(containerWidth / plugin.originalImageWidth, containerHeight / plugin.originalImageHeight)
					plugin.displayedImageWidth = plugin.originalImageWidth * plugin.imageScaleFactor
					var displayedImageHeight = plugin.originalImageHeight * plugin.imageScaleFactor

					plugin.stage.width(plugin.displayedImageWidth)
					plugin.stage.height(displayedImageHeight)

					var konvaImage = new Konva.Image({
						image: imageObj,
						x: 0,
						y: 0,
						width: plugin.displayedImageWidth,
						height: displayedImageHeight,
						draggable: false
					})
					konvaImage.filters([Konva.Filters.DarkAreaBrighten])
					konvaImage.brightness(0)
					konvaImage.cache({ x: 0, y: 0, width: plugin.displayedImageWidth, height: displayedImageHeight })
					konvaImage.listening(false)
					imageLayer.add(konvaImage)
					imageLayer.draw()

					$("#allsky-mask .modal-dialog").css("width", plugin.displayedImageWidth + "px")

					setTimeout(function () {
						var newRect = container.getBoundingClientRect()
						var newWidth = newRect.width
						var newHeight = newRect.height
						plugin.imageScaleFactor = Math.min(newWidth / plugin.originalImageWidth, newHeight / plugin.originalImageHeight)
						plugin.displayedImageWidth = plugin.originalImageWidth * plugin.imageScaleFactor
						var newDisplayedHeight = plugin.originalImageHeight * plugin.imageScaleFactor
						plugin.stage.width(plugin.displayedImageWidth)
						plugin.stage.height(newDisplayedHeight)
						konvaImage.width(plugin.displayedImageWidth)
						konvaImage.height(newDisplayedHeight)
						konvaImage.cache({ x: 0, y: 0, width: plugin.displayedImageWidth, height: newDisplayedHeight })
						imageLayer.batchDraw()
					}, 100)
				}
				imageObj.onerror = function () {
					console.error("Error loading image at /current/tmp/i.jpg")
				}
				//imageObj.src = "/current/tmp/i.jpg?noCache=" + new Date().getTime()
				imageObj.src = `${plugin.settings.image}?noCache=` + new Date().getTime()

				$("#allsky-mask-zoomSlider").on("input", function () {
					var newScale = parseFloat($(this).val())
					plugin.stage.scale({ x: newScale, y: newScale })
					plugin.stage.batchDraw()
				})

				$('#allsky-mask-zoomSlider').bootstrapSlider({
					value: 1
				}).on('slide', (e) => {
					var newScale = parseFloat(e.value);
					plugin.stage.scale({ x: newScale, y: newScale });
					plugin.stage.batchDraw();
				})

				plugin.stage.on("wheel", function (e) {
					e.evt.preventDefault()
					var oldScale = plugin.stage.scaleX()
					var scaleBy = 1.05
					var newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy
					plugin.stage.scale({ x: newScale, y: newScale })
					$("#allsky-mask-zoomSlider").val(newScale)
					plugin.stage.batchDraw()
				})

				$('#allsky-mask-brightnessSlider').bootstrapSlider({
					value: 0
				}).on('slide', (e) => {
					var value = parseFloat(e.value);
					var bgImage = imageLayer.findOne("Image");
					if (bgImage) {
						bgImage.brightness(value);
						bgImage.cache({ x: 0, y: 0, width: plugin.displayedImageWidth, height: plugin.stage.height() });
						imageLayer.batchDraw();
					}
				})


				$('#allsky-mask-opacitySlider').bootstrapSlider({
					value: 0
				}).on('slide', (e) => {
					var opac = parseFloat(e.value) / 100;
					plugin.drawingLayer.opacity(opac);
					plugin.drawingLayer.draw();
				})

				// Separate event handling for easy and expert plugin.modes.
				plugin.stage.on("mousedown touchstart", function (e) {
					if (plugin.mode === "easy") {
						// In easy plugin.mode, only allow a single circle.
						if (e.target === plugin.stage) {
							if (!plugin.easyCircle) {
								var circle = new Konva.Circle({
									x: plugin.stage.width() / 2,
									y: plugin.stage.height() / 2,
									radius: 50,
									fill: "white",
									draggable: true
								});
								plugin.drawnGroup.add(circle)
								plugin.transformer.nodes([circle])
								plugin.drawingLayer.draw()
								plugin.drawnObjects.push(circle)
								plugin.easyCircle = circle
							} else {
								plugin.transformer.nodes([plugin.easyCircle])
								plugin.drawingLayer.draw()
							}
						}
						return
					}

					if (plugin.mode === "expert") {
						plugin.isDrawing = true;
						plugin.startPos = getTransformedPointerPosition();
						switch (plugin.currentTool) {
							case "freehand":
							case "feather":
								plugin.currentLine = new Konva.Line({
									stroke: "white",
									strokeWidth: plugin.currentTool === "feather" ? brushSize * 2 : brushSize,
									lineCap: "round",
									lineJoin: "round",
									points: [plugin.startPos.x, plugin.startPos.y]
								});
								plugin.currentLine.setAttr("brushType", plugin.currentTool);
								plugin.drawnGroup.add(plugin.currentLine);
								break
							case "square":
								plugin.currentShape = new Konva.Rect({
									x: plugin.startPos.x,
									y: plugin.startPos.y,
									width: 0,
									height: 0,
									stroke: "white",
									strokeWidth: 2
								})
								plugin.drawnGroup.add(plugin.currentShape)
								break
							case "filledPath":
								plugin.currentLine = new Konva.Line({
									stroke: "white",
									strokeWidth: 2,
									closed: false,
									points: [plugin.startPos.x, plugin.startPos.y]
								})
								plugin.drawnGroup.add(plugin.currentLine)
								break
							case "circle":
								plugin.currentShape = new Konva.Circle({
									x: plugin.startPos.x,
									y: plugin.startPos.y,
									radius: 0,
									stroke: "white",
									strokeWidth: 2,
									fill: "white"
								})
								plugin.drawnGroup.add(plugin.currentShape)
								break
						}
					}
				})

				plugin.stage.on("mousemove touchmove", function (e) {
					if (!plugin.isDrawing) return
					var pos = getTransformedPointerPosition()
					if (plugin.mode === "expert") {
						if (plugin.currentTool === "freehand" || plugin.currentTool === "feather") {
							var newPoints = plugin.currentLine.points().concat([pos.x, pos.y])
							plugin.currentLine.points(newPoints)
							plugin.drawingLayer.batchDraw();
						} else if (plugin.currentTool === "square") {
							plugin.currentShape.width(pos.x - plugin.startPos.x)
							plugin.currentShape.height(pos.y - plugin.startPos.y)
							plugin.drawingLayer.batchDraw()
						} else if (plugin.currentTool === "filledPath") {
							var newPoints = plugin.currentLine.points().concat([pos.x, pos.y])
							plugin.currentLine.points(newPoints)
							plugin.drawingLayer.batchDraw()
						} else if (plugin.currentTool === "circle") {
							var dx = pos.x - plugin.startPos.x
							var dy = pos.y - plugin.startPos.y
							var newRadius = Math.sqrt(dx * dx + dy * dy)
							plugin.currentShape.radius(newRadius)
							plugin.drawingLayer.batchDraw()
						}
					}
				})

				plugin.stage.on("mouseup touchend", function () {
					if (plugin.isDrawing && plugin.mode === "expert") {
						if (plugin.currentTool === "filledPath" && plugin.currentLine) {
							plugin.currentLine.closed(true)
							plugin.currentLine.fill("white")
							plugin.drawingLayer.draw()
							plugin.drawnObjects.push(plugin.currentLine)
						}
						if (plugin.currentTool === "square" && plugin.currentShape) {
							plugin.currentShape.fill("white")
							plugin.drawingLayer.draw()
							plugin.drawnObjects.push(plugin.currentShape)
						}
						if (plugin.currentTool === "circle" && plugin.currentShape) {
							plugin.drawingLayer.draw()
							plugin.drawnObjects.push(plugin.currentShape)
						}
						if ((plugin.currentTool === "freehand" || plugin.currentTool === "feather") && plugin.currentLine) {
							if (plugin.currentTool === "feather") {
								plugin.currentLine.filters([Konva.Filters.Blur])
								plugin.currentLine.blurRadius(3)
								plugin.currentLine.cache()
							}
							plugin.drawingLayer.draw()
							plugin.drawnObjects.push(plugin.currentLine)
						}
					}
					plugin.isDrawing = false
					plugin.currentLine = null
					plugin.currentShape = null
				})

				plugin.drawingLayer.draw()
			})
		}

		var getTransformedPointerPosition = function () {
			var pos = plugin.stage.getPointerPosition()
			var scale = plugin.stage.scaleX()
			return { x: pos.x / scale, y: pos.y / scale }
		}

		var askForValidFilename = function (callback) {
			const validateFilename = (name) => /^[a-zA-Z0-9_.-]+$/.test(name);

			function showPrompt() {
				bootbox.prompt({
					title: "Enter a filename",
					centerVertical: true,
					callback: function (result) {
						if (result === null) {
							if (typeof callback === "function") callback(null);
							return;
						}

						result = result.trim();
						if (!result) {
							bootbox.alert("Filename must not be empty.", showPrompt);
						} else if (!validateFilename(result)) {
							bootbox.alert("Filename can only contain letters, numbers, underscores (_), hyphens (-), and periods (.)", showPrompt);
						} else {
							if (typeof callback === "function") callback(result);
						}
					}
				});
			}

			showPrompt();
		}


		var saveImage = function () {
			askForValidFilename((filename) => {
				if (filename) {
					console.log("Valid filename inside plugin:", filename);

					$.ajax({
						type: 'POST',
						url: plugin.settings.saveURL,
						data: {
							filename: filename,
							image: plugin.finalDataURL
						},
						success: (response) => {
							$(".mask-tmp-image").remove();
							$(`#${plugin.settings.modalId}`).modal('hide');
							plugin.settings.onComplete.call(this, {});
						},
						error: function (xhr, status, error) {
							$(".mask-tmp-image").remove();
							console.error('Error:', error);
						}
					});


				} else {
					console.log("User cancelled inside plugin.");
				}
			});
		}

		plugin.destroy = function () {
			plugin.stage.destroy()
			$(`#${plugin.settings.modalId}`).remove()
			$(document).removeData('allskyMASK');
		}

		plugin.init();

	}

	$.fn.allskyMASK = function (options) {
		return this.each(function () {
			if (undefined == $(this).data('allskyMASK')) {
				var plugin = new $.allskyMASK(this, options)
				$(this).data('allskyMASK', plugin)
			}
		})
	}

})(jQuery);
