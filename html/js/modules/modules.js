"use strict";
class MODULESEDITOR {

	#configData = null
	#testData = {}
	#moduleSettings = null
	#dirty = false
	#eventName = null
	#settings = null
	#first = true
	#dialogFilters = []
	#events = []
	#errors = []

	constructor() {

	}

	#buildUI() {
		$.LoadingOverlay('show');

		$('[data-toggle="tooltip"]').tooltip();

		if ($('#modules-available').data('ui-sortable')) {
			$('#modules-available').sortable('destroy');
		}
		if ($('#modules-available').data('ui-sortable')) {
			$('#modules-available').sortable('destroy');
		}
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

				if (this.#configData.restore) {
					$('#module-editor-restore').show();
				} else {
					$('#module-editor-restore').hide();
				}

				this.#addModules(this.#configData.available, '#modules-available')
				this.#addModules(this.#configData.selected, '#modules-selected')


				let groups = ['All Modules'];

				const availableModules = this.#configData.available || {};
				for (const key in availableModules) {
					const module = availableModules[key];
					const group = module?.metadata?.group;
					if (group && !groups.includes(group)) {
						groups.push(group);
					}
				}

				groups.sort();

				const filterSelect = $('#module-filters');
				filterSelect.empty();

				groups.forEach(function (group) {
					filterSelect.append($('<option>', {
						value: group,
						text: group
					}));
				});

				$('#module-filters').off('change');
				$('#module-filters').on('change', function () {
					const selectedValue = $(this).val();
					if (selectedValue === 'All Modules') {
						$('#modules-available .allskymodule').show();
					} else {
						$('#modules-available .allskymodule').hide();
						$(`#modules-available .allskymodule[data-group="${selectedValue}"]`).show();
					}
				});

				$('[data-toggle="popover"]').popover('destroy')
				$('[data-toggle="popover"]').popover()

				$(document).on('click', '.moduleenabler', (event) => {
					let element = $(event.currentTarget);
					let checked = $(element).prop('checked');
					let moduleName = $(element).data('module');
					let module = this.#findModuleData(moduleName);
					module.data.enabled = checked;
				});

				if (result.corrupted) {
					let message = 'The Flow configuration is corrupted. Please use the reset Flow button to revert the flow to the installation default';
					if (this.#configData.restore) {
						message = 'The Flow configuration is corrupted. Please use the reset Flow button to revert the flow to the installation default or the Restore button to restore the last good configuration';
					}
					bootbox.alert(message);
				}
				this.#updateToolbar();

				$(document).off('click', '.module-add-button')
				$(document).on('click', '.module-add-button', (event) => {
					$('.popover').remove();

					let id = $(event.currentTarget).data('module')
					if ($('#allskyloadimage').length) {
						$('#allskyloadimage').after($('#' + id));
					} else {
						$('#modules-selected').prepend($('#' + id));
					}
					this.#moduleAdded($('#' + id))
				});

				$(document).off('click', '.module-remove-button')
				$(document).on('click', '.module-remove-button', (event) => {
					let id = $(event.currentTarget).data('module')
					$('#modules-available').prepend($('#' + id));
					this.#removeModule($('#' + id))
					this.#dirty = true;
					this.#updateToolbar()
				});

				$(document).off('click', '.module-delete-button')
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

				$(document).off('click', '.module-enable');
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

				$(document).off('click', '.module-settings-button');
				$(document).on('click', '.module-settings-button', (event) => {

					/*var loadingTimer = setTimeout(() => {
						$.LoadingOverlay('show', {text : 'Sorry this is taking longer than expected ...'});
							}, 10);
					*/
					this.#createSettingsDialog(event.currentTarget);
					/*
					$('#module-settings-dialog').off('shown.bs.modal').on('shown.bs.modal', () => {
						clearTimeout(loadingTimer);
						$.LoadingOverlay('hide');
					});
					*/
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
					onEnd: (evt) => {
						$(document).trigger('module:dirty');

						if ($(evt.to).is($('#modules-available'))) {
							this.#removeModule(evt.item);
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
					onEnd: (evt) => {
						if ($(evt.to).is($('#modules-selected'))) {
							this.#moduleAdded(evt.item)
						}
					}
				});

				$(document).off('keyup', '#module-available-filter');
				$(document).on('keyup', '#module-available-filter', () => {
					var searchText = $("#module-available-filter").val()
					$("#modules-available .allskymodule").each(function () {
						let text = $(`#${this.id}`).data('search')
						if (text !== undefined) {
							text = text.toLowerCase()
							searchText = searchText.toLowerCase()
							this.style.display = text.includes(searchText) ? 'block' : 'none'
						}
					});
				})
				$(document).off('click', '#module-available-filter-clear');
				$(document).on('click', '#module-available-filter-clear', () => {
					$("#module-available-filter").val('')
					$("#modules-available .allskymodule").each(function () {
						this.style.display = 'block'
					});
				})
				$(document).off('keyup', '#module-selected-filter');
				$(document).on('keyup', '#module-selected-filter', () => {
					var searchText = $("#module-selected-filter").val()
					$("#modules-selected .allskymodule").each(function () {
						if (!$(`#${this.id}`).hasClass('locked')) {
							let text = $(`#${this.id}`).data('search')
							if (text !== undefined) {
								text = text.toLowerCase()
								searchText = searchText.toLowerCase()
								this.style.display = text.includes(searchText) ? 'block' : 'none'
							}
						}
					});
				})
				$(document).off('click', '#module-selected-filter-clear');
				$(document).on('click', '#module-selected-filter-clear', () => {
					$("#module-selected-filter").val('')
					$("#modules-selected .allskymodule").each(function () {
						this.style.display = 'block'
					});
				})
				$(document).off('module:dirty');
				$(document).on('module:dirty', () => {
					this.#dirty = true;
					this.#updateToolbar();
				});

				this.#checkDependencies()
			});

			$(document).off('hidden.bs.modal', '.modal');
			$(document).on('hidden.bs.modal', '.modal', function () {
				if ($('.modal:visible').length) {
					$('body').addClass('modal-open');
				}
			});
		}).always(() => {
			$.LoadingOverlay('hide');
		});

		$(document).off('click', '#module-settings-dialog-test')
		$(document).on('click', '#module-settings-dialog-test', () => {
			this.#testModule()
		})

		$('#device-manager').off('click').on('click', () => {
			$.devicemanager();
		});
	}

	#moduleAdded(item) {
		$(document).trigger('module:dirty');
		let settingsButton = $('#' + $(item).attr("id") + 'settings')
		let removeButton = $('#' + $(item).attr("id") + 'remove')
		let enabledButton = $('#' + $(item).attr("id") + 'enabled')
		let enabledButtonWrapper = $('#' + $(item).attr("id") + 'enablewrapper')
		let deleteButton = $('#' + $(item).attr("id") + 'delete')
		let addButton = $('#' + $(item).attr("id") + 'add')
		if (settingsButton.length) {
			settingsButton.css('display', 'inline-block')
		}
		if (removeButton.length) {
			removeButton.css('display', 'inline-block')
		}
		enabledButton.prop('disabled', false)
		enabledButton.prop('checked', $.moduleeditor.settings.autoenable)
		deleteButton.prop('disabled', true)
		addButton.addClass('hidden')
		enabledButtonWrapper.css('display', 'flex')
		let element = $(item).find('.moduleenabler')
		let checked = $(element).prop('checked')
		let moduleName = $(element).data('module')
		let module = this.#findModuleData(moduleName)
		module.data.enabled = checked

		this.#checkDependencies()
	}

	#removeModule(item) {
		let settingsButton = $('#' + $(item).attr("id") + 'settings')
		let enabledButton = $('#' + $(item).attr("id") + 'enabled')
		let removeButton = $('#' + $(item).attr("id") + 'remove')
		let enabledButtonWrapper = $('#' + $(item).attr("id") + 'enablewrapper')
		let deleteButton = $('#' + $(item).attr("id") + 'delete')
		let addButton = $('#' + $(item).attr("id") + 'add')
		if (settingsButton.length) {
			settingsButton.css('display', 'none')
		}
		if (removeButton.length) {
			removeButton.css('display', 'none')
		}
		enabledButton.prop('disabled', true);
		enabledButton.prop('checked', false);
		deleteButton.prop('disabled', false);
		addButton.removeClass('hidden')
		enabledButtonWrapper.css('display', 'none')

		this.#checkDependencies()
	}

	#checkDependencies() {
		let result = $.ajax({
			type: 'POST',
			url: 'includes/moduleutil.php?request=CheckModuleDependencies',
			data: {
				check: $('#modules-selected').sortable('toArray'),
				flow: this.#eventName
			},
			beforeSend: function (xhr, settings) {
				xhr.setRequestHeader('X-CSRF-Token', window.csrfToken);
			},
			dataType: 'json',
			cache: false,
			async: false,
			context: this,
			success: function (result) {
				$('[data-id] .warning').css('display', 'none')
				if (result !== null && typeof result === 'object' && !Array.isArray(result)) {
					for (const module in result) {
						let moduleResult = result[module]
						if (moduleResult[this.#eventName] !== undefined) {
							$('[data-id="' + module + '"] .warning').css('display', 'inline-block')
							$('[data-id="' + module + '"] .warning').attr('title', 'Warning')
							$('[data-id="' + module + '"] .warning').data('content', moduleResult[this.#eventName])
						}
					}
					$('[data-toggle="popover"]').popover('destroy')
					$('[data-toggle="popover"]').popover()
				}
				this.#errors = result
			}
		})
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
				if (this.#configData.restore) {
					$('#module-editor-restore').addClass('green pulse');
				}
			} else {
				$('#module-editor-reset').removeClass('green pulse');
				$('#module-editor-restore').removeClass('green pulse');
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

	#getNested(obj, path, defaultValue = undefined) {
		return path
			.split('.')
			.reduce((acc, part) => acc?.[part], obj) ?? defaultValue;
	}

	#createModuleHTML(data, element, moduleKey) {
		let settingsHtml = '';
		if (data.metadata.arguments !== undefined) {
			if (Object.entries(data.metadata.arguments).length != 0) {
				let disabled = ''
				if (element == '#modules-available') {
					disabled = 'style="display: none"'
				} else {
					if (data.corrupt !== undefined) {
						disabled = 'disabled="disabled"'
					}
				}
				settingsHtml = '<button type="button" class="btn btn-sm btn-danger module-remove-button" id="' + moduleKey + 'remove" data-module="' + moduleKey + '" ' + disabled + '><i class="fa-solid fa-trash"></i></button>';
				settingsHtml += '<button type="button" class="btn btn-sm btn-primary module-settings-button ml-4" id="' + moduleKey + 'settings" data-module="' + data.module + '" ' + disabled + '><i class="fa-solid fa-gear"></i></button>';
			}
		}

		let locked = ''
		let enabledHTML = ''
		let lockedHTML = ''
		if (data.position !== undefined) {
			locked = 'filtered locked ' + data.position;
			lockedHTML = '<i class="fa-solid fa-lock" title="Module cannot be moved"></i> '
		} else {
			let enabled = '';
			if (data.enabled !== undefined) {
				if (data.enabled) {
					enabled = 'checked="checked"';
				}
			}
			let disabled = ''
			if (element == '#modules-available') {
				disabled = 'style="display: none"'
			}
			let cb = '	<label class="el-switch el-switch-sm el-switch-green">\
  							<input type="checkbox" name="switch" class="moduleenabler" ' + enabled + ' id="' + moduleKey + 'enabled" data-module="' + data.module + '">\
  							<span class="el-switch-style"></span>\
						</label>'
			enabledHTML = '<div class="pull-right module-enable " ' + disabled + ' id="' + moduleKey + 'enablewrapper"><span class="module-enable-text">Enabled</span> ' + cb + ' </div>';
		}

		let hidden = ''
		if (element != '#modules-available') {
			hidden = 'hidden';
		}


		let deprecated = this.#getNested(data.metadata, 'deprecation.deprecated', 'false')

		let addHTML = ''
		if (deprecated == 'true') {
			let deprecatedText = this.#getNested(data.metadata, 'deprecation.notes', 'This module has been deprecated')
			let popover = 'data-toggle="popover" data-delay=\'{"show": 100, "hide": 200}\' data-placement="top" data-trigger="hover" title="' + deprecatedText + '"'
			addHTML = '<button type="button" class="btn btn-sm btn-danger  ml-2"' + popover + '><i class="fa-solid fa-circle-info fa-lg"></i></button>';
		} else {
			let popover = 'data-toggle="popover" data-delay=\'{"show": 1000, "hide": 200}\' data-placement="top" data-trigger="hover" title="Add Module" data-content="Adds the ' + data.metadata.name + ' to the selected modules"'
			addHTML = '<button type="button" class="btn btn-sm btn-success module-add-button ml-2 ' + hidden + '" id="' + moduleKey + 'add" data-module="' + moduleKey + '" ' + popover + '>>></button>';
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
		let deprecatedHTML = ''
		if (data.metadata.deprecation !== undefined) {
			if (data.metadata.deprecation.partial !== undefined) {
				deprecatedHTML = '<strong class="text-warning">PARTIAL DEPRECATED</strong> '
			} else {
				deprecatedHTML = '<strong class="text-danger">DEPRECATED</strong> '
			}
		}
		version = deprecatedHTML + '<span><small class="module-version">' + version + '</small><span>';
		let nameData = experimental + data.metadata.description;
		if (data.corrupt !== undefined) {
			nameData = 'WARNING: This modules metaData is corrupt. Please contact Allsky support'
		}
		let template = `
            <div id="${moduleKey}" data-id="${data.module}" class="list-group-item allskymodule ${locked}" data-search="${data.metadata.description} ${data.metadata.name}" data-group="${data.metadata.group}">
                <div class="panel panel-default">
                    <div class="panel-heading"><span class="warning" data-toggle="popover" data-delay=\'{"show": 1000, "hide": 200}\' data-placement="top" data-trigger="hover" data-placement="top" title="" data-content=""><i class="fa-solid fa-2x fa-triangle-exclamation"></i></span> ${lockedHTML}${data.metadata.name} ${version} ${enabledHTML}</div> 
                    <div class="panel-body">${nameData} <div class="pull-right">${settingsHtml} ${addHTML}</div></div> 
                </div> 
            </div>`;

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

	#rgbtohex(rgbString) {
		let result = rgbString
		if (rgbString.includes(',')) {
			const rgbArray = rgbString.split(',').map(value => parseInt(value.trim(), 10))
			if (rgbArray.length === 3 && rgbArray.every(val => !isNaN(val) && val >= 0 && val <= 255)) {
				result = '#' +
					((1 << 24) | (rgbArray[0] << 16) | (rgbArray[1] << 8) | rgbArray[2])
						.toString(16)
						.slice(1)
						.toUpperCase()
			}
		}

		return result
	}

	#hexToRgb(hex) {
		let result = '0,0,0'
		hex = hex.replace(/^#/, '')

		if (hex.length === 6) {
			const r = parseInt(hex.slice(0, 2), 16)
			const g = parseInt(hex.slice(2, 4), 16)
			const b = parseInt(hex.slice(4, 6), 16)

			result = `${r},${g},${b}`
		}

		return result
	}

	#createSettingsDialog(target) {
		var events = []
		this.#events = []
		let tabs = []
		this.#dialogFilters = []
		var controls = {
			'spectrum': [],
			'select2': [],
			'position': [],
			'urlcheck': [],
			'chart': []
		}

		target = $(target)
		let module = target.data('module')
		let moduleShortName = module.replace('.py', '')
		let allskyModuleShortName = moduleShortName;
		moduleShortName = moduleShortName.replace('allsky_', '')
		let moduleData = this.#findModuleData(module)
		moduleData = moduleData.data
		let dependenciesset = {};

		let fieldsHTML = ''
		let args = moduleData.metadata.argumentdetails
		for (let key in args) {
			let fieldData = args[key]
			let fieldHTML = ''
			let fieldType = null
			if (fieldData.type !== undefined) {
				if (fieldData.type.fieldtype !== undefined) {
					fieldType = fieldData.type.fieldtype
				}
			}

			if (fieldType !== 'text') {
				let extraClass = 'input-group-allsky';

				let required = '';
				if (fieldData.required !== undefined) {
					if (fieldData.required == 'true') {
						required = ' required ';
					}
				}

				let fieldDescription = ' data-description="' + fieldData.description + '" ';
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

				let extraFieldValue = 1;
				if (fieldType == 'i2c') {
					const extraKey = key + '-bus';
					if (moduleData.metadata.arguments[extraKey] !== undefined) {
						extraFieldValue = moduleData.metadata.arguments[extraKey];
						if (extraFieldValue == "") {
							extraFieldValue = 1;
						}
					}
				}

				let disabled = ''
				if (fieldData.disabled !== undefined) {
					if (fieldData.disabled) {
						disabled = ' disabled="disabled" '
					}
				}

				let inputHTML = ''
				let fieldPostHTML = ''
				if (fieldType === null || fieldType == 'text') {
					let fieldBaseType = 'text'
					if ('secret' in fieldData) {
						if (fieldData.secret) {
							fieldBaseType = 'password'
							fieldPostHTML = '<span class="form-control noborder as-secret-toggle" data-secretid="' + key + '"><i class="fa-regular fa-lg fa-eye" id="' + key + '-eye"></i><i class="fa-regular fa-lg fa-eye-slash hidden" id="' + key + '-eye-slash"></i></span>'
						}
					}
					inputHTML = '<input ' + disabled + ' id="' + key + '" type="' + fieldBaseType + '" name="' + key + '" class="form-control" value="' + fieldValue + '"' + required + fieldDescription + '>';
				}
				if (fieldType !== null) {
					let fieldTypeData = fieldData.type;
					if (fieldType == 'spinner') {
						let min = '';
						if (fieldTypeData.min !== undefined) {
							min = 'min="' + fieldTypeData.min + '"';
						}
						let max = '';
						if (fieldTypeData.max !== undefined) {
							max = 'max="' + fieldTypeData.max + '"';
						}
						let step = '';
						if (fieldTypeData.step !== undefined) {
							step = 'step="' + fieldTypeData.step + '"';
						}
						inputHTML = '<input id="' + key + '" name="' + key + '" type="number" ' + min + ' ' + max + ' ' + step + ' class="form-control" value="' + fieldValue + '"' + required + fieldDescription + '>'
						extraClass = 'input-group';
					}

					if (fieldType == 'checkbox') {
						let checked = '';
						if (this.#convertBool(fieldValue) == true) {
							checked = 'checked="checked"';
						}
						//inputHTML = '<input type="checkbox" id="' + key + '" name="' + key + '" ' + checked + ' value="checked"' + required + fieldDescription + '>'

						inputHTML = '<label class="el-switch el-switch-sm el-switch-green">\
  							<input type="checkbox" id="' + key + '" name="' + key + '" ' + checked + ' value="checked"' + required + fieldDescription + '>\
  							<span class="el-switch-style"></span>\
						</label>'


						extraClass = 'input-group';
					}

					if (fieldType == 'image' || fieldType == 'mask') {
						inputHTML = '<input id="' + key + '" name="' + key + '" class="form-control" value="' + fieldValue + '"' + required + fieldDescription + '>';
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

						let validate = null;
						if (fieldType == 'mask') {
							validate = 'includes/moduleutil.php?request=ValidateMask'
						}

						$(document).off('click', '#open-image-manager-' + key)
						$(document).on('click', '#open-image-manager-' + key, (event) => {
							$(document).oeImageManager({
								thumbnailURL: 'includes/overlayutil.php?request=Images',
								usedImages: [],
								bind: '#' + key,
								validate: validate,
								showMaskCreation: true,
								allowDoubleClick: true
							});
						});
					}

					if (fieldType == 'roi') {
						inputHTML = '<input id="' + key + '" name="' + key + '" class="form-control" disabled="disabled" value="' + fieldValue + '"' + required + fieldDescription + '>';
						extraClass = 'input-group';
						inputHTML = '\
							<div class="row">\
								<div class="col-xs-7">\
								' + inputHTML + '\
								</div>\
								<div class="col-xs-5">\
									<button type="button" class="btn btn-default" id="open-roi-' + key + '" data-source="' + key + '">...</button>\
									<button type="button" class="btn btn-default" id="reset-roi-' + key + '" data-source="' + key + '"><i class="fa-solid fa-rotate-right"></i></button>\
								</div>\
							</div>\
						';

						$(document).off('click', '#reset-roi-' + key)
						$(document).on('click', '#reset-roi-' + key, (event) => {
							let el = $(event.currentTarget).data('source');
							$('#' + el).val('');
						});

						$(document).off('click', '#open-roi-' + key)
						$(document).on('click', '#open-roi-' + key, (event) => {
							let el = $(event.currentTarget).data('source');
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
								imageFile: this.#settings.filename,
								roiSelected: function (roi) {
									$('#' + key).val(roi.x1 + ',' + roi.y1 + ',' + roi.x2 + ',' + roi.y2)
								}
							});
						});
					}

					if (fieldType == 'colour') {
						let colourValue = this.#rgbtohex(fieldValue)
						inputHTML = '<input id="' + key + '" name="' + key + '" class="form-control" data-convert="rgb" value="' + colourValue + '"' + required + fieldDescription + '>';
						extraClass = 'input-group';
						inputHTML = '\
							<div class="row">\
								<div class="col-xs-8">\
								' + inputHTML + '\
								</div>\
							</div>\
						';
						controls['spectrum'].push({
							'id': '#' + key,
							'config': {
								type: 'color',
								showInput: true,
								showInitial: true,
								showAlpha: false,
								preferredFormat: 'hex3'
							}
						})
					}

					if (fieldType == 'gpio') {
						inputHTML = '<input id="' + key + '" name="' + key + '" class="form-control" disabled="disabled" value="' + fieldValue + '"' + required + fieldDescription + '>';
						extraClass = 'input-group';
						inputHTML = '\
							<div class="row">\
								<div class="col-xs-7">\
								' + inputHTML + '\
								</div>\
								<div class="col-xs-5">\
									<button type="button" class="btn btn-default" id="open-gpio-' + key + '" data-source="' + key + '">...</button>\
									<button type="button" class="btn btn-default" id="reset-gpio-' + key + '" data-source="' + key + '"><i class="fa-solid fa-rotate-right"></i></button>\
								</div>\
							</div>\
						';

						$(document).off('click', '#reset-gpio-' + key)
						$(document).on('click', '#reset-gpio-' + key, (event) => {
							let el = $(event.target).data('source');
							$('#' + el).val('');
						});

						$(document).off('click', '#open-gpio-' + key)
						$(document).on('click', '#open-gpio-' + key, (event) => {
							let el = $(event.target).data('source');
							let data = $('#' + el).val();

							$.allskyGPIO({
								id: key,
								gpio: parseInt(data),
								gpioSelected: function (gpio) {
									$('#' + key).val(gpio)
								}
							});
						});
					}

					if (fieldType == 'variable') {
						inputHTML = '<input id="' + key + '" name="' + key + '" class="form-control" disabled="disabled" value="' + fieldValue + '"' + required + fieldDescription + '>';
						extraClass = 'input-group1';
						let selectType = 'single';
						if ('select' in fieldTypeData) {
							selectType = fieldTypeData.select
						}
						inputHTML = '\
							<div class="row">\
								<div class="col-xs-4">\
								' + inputHTML + '\
								</div>\
								<div class="col-xs-3">\
									<button type="button" class="btn btn-default" id="open-var-' + key + '" data-source="' + key + '" data-select="' + selectType + '">...</button>\
									<button type="button" class="btn btn-default" id="reset-var-' + key + '" data-source="' + key + '"><i class="fa-solid fa-rotate-right"></i></button>\
								</div>\
								<div class="col-xs-4" id="' + key + '_value">\
								</div>\
							</div>\
						';

						$(document).off('click', '#reset-var-' + key)
						$(document).on('click', '#reset-var-' + key, (event) => {
							let el = $(event.target).data('source');
							$('#' + el).val('');
						});

						$(document).off('click', '#open-var-' + key)
						$(document).on('click', '#open-var-' + key, (event) => {
							let el = $(event.target).data('source');
							let data = $('#' + el).val();
							let selectType = $(event.target).data('select');
							$.allskyVariable({
								id: key,
								variable: data,
								selectStyle: selectType,
								valueDiv: key + '_value',
								variableSelected: function (variable) {
									$('#' + key).val(variable)
								}
							});
						});
					}

					if (fieldType == 'i2c') {
						inputHTML = '<input id="' + key + '" name="' + key + '" class="form-control" value="' + fieldValue + '"' + required + fieldDescription + '>';
						let extraKey = key + '-bus';
						inputHTML += '<input id="' + extraKey + '" name="' + extraKey + '" class="form-control hidden" value="' + extraFieldValue + '">';

						extraClass = 'input-group';
						inputHTML = '\
							<div class="row">\
								<div class="col-xs-7">\
								' + inputHTML + '\
								</div>\
								<div class="col-xs-5">\
									<button type="button" class="btn btn-default" id="open-i2c-' + key + '" data-source="' + key + '">...</button>\
									<button type="button" class="btn btn-default" id="reset-i2c-' + key + '" data-source="' + key + '"><i class="fa-solid fa-rotate-right"></i></button>\
								</div>\
							</div>\
						';

						$(document).off('click', '#reset-i2c-' + key)
						$(document).on('click', '#reset-i2c-' + key, (event) => {
							let el = $(event.target).data('source');
							$('#' + el).val('');
						});

						$(document).off('click', '#open-i2c-' + key)
						$(document).on('click', '#open-i2c-' + key, (event) => {
							let el = $(event.target).data('source');
							const address = $('#' + el).val();
							el = $(event.target).data('source') + '-bus';
							const bus = parseInt($('#' + el).val());


							$.allskyI2C({
								address: address,
								bus: extraFieldValue,
								i2cSelected: (address, bus) => {
									$(`#${key}`).val(address)
									$(`#${key}-bus`).val(bus)
								}
							});
						});
					}

					if (fieldType == 'select') {
						inputHTML = '<select name="' + key + '" id="' + key + '"' + required + fieldDescription + '>';
						let values = fieldData.type.values.split(',')
						for (let value in values) {
							let optionValue = values[value]
							let optiontext = optionValue
							if (optionValue.includes('|')) {
								let fieldData = optionValue.split('|')
								optionValue = fieldData[0]
								optiontext = fieldData[1]
							}
							let selected = "";
							if (fieldValue == optionValue) {
								selected = ' selected="selected" ';
							}
							inputHTML += '<option value="' + optionValue + '"' + selected + '>' + optiontext + '</option>';
						}
						inputHTML += '</select>';
					}

					if (fieldType == 'dependentselect') {
						let dataAttributes = ""
						const action = fieldData?.type?.action

						if (fieldData.type.dependenciesset !== undefined) {
							Object.values(fieldData.type.dependenciesset).forEach((value, index) => {
								dataAttributes += ` data-dependency${index}="${value}"`
								if (dependenciesset[value] === undefined) {
									dependenciesset[value] = []
								}
								dependenciesset[value].push(key)
							})
						}
						inputHTML = `<select name="${key}" id="${key}" ${required} ${fieldDescription} class="as-module-dependency-select" data-action="${action}" data-value="${fieldValue}" ${dataAttributes}></select>`
					}

					if (fieldType == 'ajaxselect') {

						let result = $.ajax({
							type: "GET",
							url: fieldData.type.url,
							data: "",
							dataType: 'json',
							cache: false,
							async: false,
							context: this
						})

						let values = result.responseJSON.results
						inputHTML = '<select name="' + key + '" id="' + key + '"' + required + fieldDescription + '>'
						for (const [key, value] of Object.entries(values)) {
							let selected = ''
							if (fieldValue == value.id) {
								selected = 'selected'
							}
							inputHTML += `<option value="${value.id}" ${selected}>${value.text}</option>`
						}
						inputHTML += '</select>'

					}

					if (fieldType == 'position') {
						let latId = false
						let lonId = false
						let heightId = false

						if (fieldData.lat !== undefined) {
							latId = fieldData.lat.id
						}
						if (fieldData.lon !== undefined) {
							lonId = fieldData.lon.id
						}
						if (fieldData.height !== undefined) {
							heightId = fieldData.height.id
						}

						inputHTML = '<div class="row">'
						if (latId !== false) {
							fieldValue = moduleData.metadata.arguments[latId];
							if (fieldValue === undefined) {
								fieldValue = ''
							}
							inputHTML += `	<div class="col-md-3"><input class="form-control" id="${latId}" name="${latId}" value="${fieldValue}"></div>`
						}
						if (latId !== false) {
							fieldValue = moduleData.metadata.arguments[lonId];
							if (fieldValue === undefined) {
								fieldValue = ''
							}
							inputHTML += `	<div class="col-md-3"><input class="form-control" id="${lonId}" name="${lonId}" value="${fieldValue}"></div>`
						}
						if (heightId !== false) {
							fieldValue = moduleData.metadata.arguments[heightId];
							if (fieldValue === undefined) {
								fieldValue = ''
							}
							inputHTML += `	<div class="col-md-3"><input class="form-control" id="${heightId}" name="${heightId}" value="${fieldValue}" type="number" min="-100" max="99999" stap="1"></div>`
						}
						inputHTML += '	<div class="col-md-2">'
						inputHTML += `	  <button type="button" id="${key}" class="btn btn-primary allsky-position" data-lat="${latId}" data-lon="${lonId}" data-height="${heightId}" title="Select location on a map">`
						inputHTML += '	    <i class="fa-solid fa-map-location-dot"></i>'
						inputHTML += '	  </button>'
						inputHTML += '  </div>'
						inputHTML += '</div>'

					}

					if (fieldType == 'url') {
						inputHTML = '<div class="row">'
						inputHTML += '	<div class="col-md-8">'
						inputHTML += `		<input id="${key}" name="${key}" class="form-control" value="${fieldValue}">`
						inputHTML += '  </div>'
						inputHTML += '	<div class="col-md-2">'
						inputHTML += `	  <button type="button" id="${key}-urlcheck" class="btn btn-primary allsky-url-check" data-urlel="${key}" title="Test URL">`
						inputHTML += '	    <i class="fa-solid fa-globe"></i>'
						inputHTML += '	  </button>'
						inputHTML += '  </div>'
						inputHTML += '</div>'

						controls['urlcheck'].push({
							'id': `#${key}-urlcheck`
						})
					}

					if (fieldType == 'host') {
						let urlId = false
						let portId = false

						if (fieldData.url !== undefined) {
							urlId = fieldData.url.id
						}
						if (fieldData.port !== undefined) {
							portId = fieldData.port.id
						}

						inputHTML = '<div class="row">'
						if (urlId !== false) {
							fieldValue = moduleData.metadata.arguments[urlId];
							if (fieldValue === undefined) {
								fieldValue = ''
							}
							inputHTML += `	<div class="col-md-9"><input class="form-control" id="${urlId}" name="${urlId}" value="${fieldValue}"></div>`
						}
						if (portId !== false) {
							fieldValue = moduleData.metadata.arguments[portId];
							if (fieldValue === undefined) {
								fieldValue = ''
							}
							inputHTML += `	<div class="col-md-3"><input class="form-control" type="number" min="1" max="65535" id="${portId}" name="${portId}" value="${fieldValue}"></div>`
						}
						inputHTML += '</div>'
					}

					if (fieldType == 'graph') {
						if (this.#settings.haveDatabase) {
							controls['chart'].push({
								'id': key,
								'module': module.replace('.py', '')
							})
							inputHTML = `<div id="${key}"><h3 class="text-center">No history available</h3></div>`
						}
					}

					if (fieldType == 'html') {
					}
				}

				if (fieldType == 'graph' || fieldType == 'html') {
					if (fieldType == 'html') {
						let source = '';
						let html = '';
						if (fieldData.source !== undefined) {
							source = fieldData.source.toLowerCase();

							if (source == 'local') {
								if (fieldData.html !== undefined) {
									html = fieldData.html;
								}
							}
							if (source == 'file') {
								if (fieldData.file !== undefined) {
									let result = $.ajax({
										url: 'includes/moduleutil.php?request=ModuleFile',
										type: 'GET',
										async: false,
										data: {
											file: fieldData.file,
											module: allskyModuleShortName
										}
									});
									html = result.responseText;
								} else {
									html = '<p class="text-danger">Error: No source defined for HTML field</p>';
								}
							}
						}
						fieldHTML = html;
					}

					if (fieldType == 'graph') {
						if (this.#settings.haveDatabase) {
							fieldHTML = `
								<div class="form-group" id="${key}-wrapper">
									<div class="col-xs-12">
										<div class="${extraClass}">
											${inputHTML}
										</div>
										${helpText}
									</div>
								</div>
							`
						}
					}
				} else {
					fieldHTML = '\
						<div class="form-group" id="' + key + '-wrapper">\
							<label for="' + key + '" class="control-label col-xs-3">' + fieldData.description + '</label>\
							<div class="col-xs-8">\
								<div class="'+ extraClass + '">\
									' + inputHTML + '\
								</div>\
								' + helpText + '\
							</div>\
							<div class="col-xs-1">\
							' + fieldPostHTML + '\
							</div>\
						</div>\
					'
				}

			} else {
				let fieldError = true
				if (fieldData.type.style !== undefined) {
					let style = fieldData.type.style

					if (style.alert !== undefined) {
						let css = 'success'
						if (style.alert.class !== undefined) {
							css = style.alert.class
						}
						fieldHTML = '<div class="alert alert-' + css + '" role="alert">' + fieldData.message + '</div>'
						fieldError = false
					}

					let width = 'full'
					if (style.width !== undefined) {
						width = style.width
					}

					switch (width) {
						case 'full':
							fieldHTML = '<div class="row" id="' + key + '-wrapper"><div class="col-xs-12">' + fieldHTML + '</div></div>'
							break;
						case 'left':
							fieldHTML = '<div class="row" id="' + key + '-wrapper"><div class="col-xs-4">' + fieldHTML + '</div></div>'
							break;
						case 'right':
							fieldHTML = '<div class="row" id="' + key + '-wrapper"><div class="col-xs-offset-4"><div class="col-xs-8">' + fieldHTML + '</div></div></div>'
							break;
					}

				}
				if (fieldError) {
					fieldHTML = '<p>' + fieldData.message + '</p>'
				}
			}

			let include = true;
			if (fieldType == 'graph') {
				if (!this.#settings.haveDatabase) {
					include = false;
				}
			}

			if (include) {
				let tab = 'Settings';
				if (fieldData.tab !== undefined) {
					tab = fieldData.tab
					tab = tab.replace(/\s+/g, '_');
				}
				if (tabs[tab] === undefined) {
					tabs[tab] = [];
				}
				tabs[tab].push(fieldHTML);
				fieldsHTML += fieldHTML;
			}

			if (fieldData.filters !== undefined) {
				let filters = fieldData.filters
				if (this.#dialogFilters[filters.filter] === undefined) {
					this.#dialogFilters[filters.filter] = {}
				}
				let sourceField = moduleData.metadata.argumentdetails[filters.filter]
				let sourceFieldType = 'text'
				if (sourceField.type !== undefined) {
					if (sourceField.type.fieldtype !== undefined) {
						sourceFieldType = sourceField.type.fieldtype
					}
				}
				if (sourceFieldType === 'select') {
					for (let [filterkey, value] of Object.entries(filters.values)) {
						if (this.#dialogFilters[filters.filter][value] === undefined) {
							this.#dialogFilters[filters.filter][value] = {}
						}
						this.#dialogFilters[filters.filter][value][key] = filters.filtertype
					}
				}
				if (sourceFieldType === 'checkbox') {
					if (this.#dialogFilters[filters.filter][true] === undefined) {
						this.#dialogFilters[filters.filter][true] = {}
					}
					this.#dialogFilters[filters.filter][true][key] = filters.filtertype
				}
			}
		}
		let moduleSettingsHtml = '';
		let numberOfTabs = Object.keys(tabs).length;
		if ('extradata' in moduleData.metadata) {
			numberOfTabs += 1
		}
		if ('changelog' in moduleData.metadata) {
			numberOfTabs += 1
		}
		if ('deprecation' in moduleData.metadata) {
			numberOfTabs += 1
		}

		if (numberOfTabs === 1 && moduleData.metadata.extradata === undefined) {
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
				moduleSettingsHtml += '<li role="presentation" class="' + active + '"><a href="#' + tabRef + '" role="tab" data-toggle="tab">' + tabName.replace(/\_/g, ' ') + '</a></li>';
				active = '';
			}

			if ('extradata' in moduleData.metadata) {
				moduleSettingsHtml += '<li role="presentation"><a href="#as-module-var-list" role="tab" data-toggle="tab">Variables</a></li>';
			}

			if ('changelog' in moduleData.metadata) {
				moduleSettingsHtml += '<li role="presentation"><a href="#as-module-var-changelog" role="tab" data-toggle="tab">Change Log</a></li>';
			}

			if ('deprecation' in moduleData.metadata) {
				let type = 'danger'
				if (moduleData.metadata.deprecation.partial !== undefined) {
					type = 'warning'
				}
				moduleSettingsHtml += '<li role="presentation"><a href="#as-module-var-deprecation" role="tab" data-toggle="tab" class="text-' + type + '">IMPORTANT</a></li>';

			}

			moduleSettingsHtml += ' </ul>'

			moduleSettingsHtml += '<div class="tab-content">';
			active = 'active';
			for (let tabName in tabs) {
				let fieldsHTML = '';
				for (let field in tabs[tabName]) {
					fieldsHTML += tabs[tabName][field];
				}
				let tabRef = moduleData.metadata.module + tabName;
				moduleSettingsHtml += '<div role="tabpanel" style="margin-top:10px" class="tab-pane ' + active + '" id="' + tabRef + '">' + fieldsHTML + '</div>';
				active = '';
			}

			if ('extradata' in moduleData.metadata) {
				moduleSettingsHtml += `
                    <div role="tabpanel" style="margin-top:10px" class="tab-pane" id="as-module-var-list">
                        <div class="alert alert-success hidden as-module-var-count" role="alert">The table shows all variables that this module can generate. Where \${COUNT} appears it means that the module can generate multiple variables with \${COUNT} replaced by a number.<br>Any other \${} variables will be replaced with the relevant content - See the module documentation for more details</div>
                        <table id="as-module-var-list-table" class="display compact as-variable-list" style="width:98%;">
                            <thead>
                                <tr>
                                    <th>Variable</th>
                                    <th>Type</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                        </table>
                    </div>`
			}

			if ('changelog' in moduleData.metadata) {
				let metaDataHTML = ''
				let changeLog = moduleData.metadata.changelog

				let state = ' in'
				let idCounter = 0
				metaDataHTML = '<div class="panel-group" id="changelog" role="tablist">'
				Object.entries(changeLog)
					.reverse()
					.forEach(([version, versionChangeData]) => {

						let changeHTML = ''
						Object.entries(versionChangeData).forEach(([index, changeList]) => {
							let firstChange = ''
							let subsequentChangesHTML = ''
							if (typeof changeList.changes === 'string') {
								firstChange = '&bull; ' + changeList.changes
							} else {
								const [key, value] = Object.entries(changeList.changes)[0]
								firstChange = '&bull; ' + value
								let changeArray = Object.values(changeList.changes);
								for (let i = 1; i < changeArray.length; i++) {
									subsequentChangesHTML += '\
								<div class="row">\
									<div class="col-md-7 col-md-offset-4">&bull; ' + changeArray[i] + '</div>\
								</div>'
								}
							}

							let author = 'Unknown Author'
							if (changeList.author !== undefined) {
								author = changeList.author
							}

							if (changeList.authorurl !== undefined) {
								author = '<a href="' + changeList.authorurl + '" target="_blank">' + author + '</a>'
							}
							changeHTML += '\
						<div class="row">\
							<div class="col-md-3 col-md-offset-1">' + author + '</div>\
							<div class="col-md-7">' + firstChange + '</div>\
						</div>\
						' + subsequentChangesHTML
						})

						let id = 'chanelog' + idCounter++
						metaDataHTML += '\
						<div class="panel panel-default">\
							<div class="panel-heading" role="tab" id="headingOne">\
								<h4 class="panel-title">\
									<a role="button" data-toggle="collapse" data-parent="#changelog" href="#' + id + '">Version - ' + version + '</a>\
								</h4>\
							</div>\
							<div id="' + id + '" class="panel-collapse collapse' + state + '" role="tabpanel">\
								<div class="panel-body">\
									' + changeHTML + '\
								</div>\
							</div>\
						</div>'
						state = ''
					})
				metaDataHTML += '</div>'

				moduleSettingsHtml += '\
				<div role="tabpanel" style="margin-top:10px" class="tab-pane" id="as-module-var-changelog">\
				' + metaDataHTML + '\
				</div>'
			}

			if ('deprecation' in moduleData.metadata) {
				let heading = 'THIS MODULE HAS BEEN MARKED FOR DEPRECATION'
				if (moduleData.metadata.deprecation.partial !== undefined) {
					heading = 'PORTIONS OF THIS MODULE HAS BEEN MARKED FOR DEPRECATION'
				}
				moduleSettingsHtml += '\
				<div role="tabpanel" style="margin-top:10px" class="tab-pane" id="as-module-var-deprecation">\
					<div class="well">\
						<h3 class="text-center">' + heading + '</h3>\
					</div>\
					<div class="row">\
						<div class="col-md-4"><h4>Deprecated from Version:</h4></div>\
						<div class="col-md-8"><h4>' + moduleData.metadata.deprecation.fromversion + '</h4></div>\
					</div>\
					<div class="row">\
						<div class="col-md-4"><h4>Removed from Version:</h4></div>\
						<div class="col-md-8"><h4>' + moduleData.metadata.deprecation.removein + '</h4></div>\
					</div>\
					<div class="row">\
						<div class="col-md-4"><h4>Deprecation Reason:</h4></div>\
						<div class="col-md-8"><h4>' + moduleData.metadata.deprecation.notes + '</h4></div>\
					</div>\
				</div>'
			}


			moduleSettingsHtml += '</div>';
			moduleSettingsHtml += '</div>';
		}
		let experimental = '';
		if (moduleData.metadata.experimental) {
			experimental = '<span class="module-experimental module-experimental-header"> - Experimental. Please use with caution</span>';
		}

		let testDisabled = ''
		let testTitle = 'Run a test of the module using current settings'
		let delay = 2000
		if (!moduleData.enabled) {
			testDisabled = ' disabled="disabled" '
			testTitle = 'You must enable the module before you can test it'
			delay = 200
		}
		let popover = 'data-toggle="popover" data-delay=\'{"show": ' + delay + ', "hide": 200}\' data-placement="top" data-trigger="hover" title="' + testTitle + '"'


		let testButton = `
        	<div class="hidden as-module-test">
                <div class="pull-left hidden as-module-test" id="module-settings-dialog-test-wrapper" ${popover}>
                    <button type="button" class="btn btn-success form-control" id="module-settings-dialog-test" ${testDisabled}>Test Module</button>
                </div>
                <div class="pull-left hidden ml-3 as-module-test" id="module-settings-dialog-test-tod-wrapper">
										<form id="module-test-form" autocomplete="off">
											<div class="switch-field boxShadow as-module-test-option-wrapper">
													<input id="switch_day_as-module-test-option" class="form-control" type="radio" name="as-module-test-option" value="day" checked  ${testDisabled}/>
													<label style="margin-bottom: 0px;" for="switch_day_as-module-test-option">Day</label>
													<input id="switch_night_as-module-test-option" class="form-control" type="radio" name="as-module-test-option" value="night"  ${testDisabled}/>
													<label style="margin-bottom: 0px;" for="switch_night_as-module-test-option">Night</label>
											</div>
										</form>
                </div>
            </div>`

		let errorHTML = ''
		if (this.#errors[module] !== undefined) {
			if (this.#errors[module][this.#eventName] !== undefined) {
				let text = this.#errors[module][this.#eventName];
				errorHTML = '<div class="alert alert-warning mt-4 mb-4" role="alert">WARNING: ' + text + '</div>'
			}
		}

		let helpLink = '';
		if (moduleData.metadata.help !== undefined) {
			helpLink = `<a type="button" class="btn btn-danger mr-4" target="_blank" href="${moduleData.metadata.help}"><i class="fa-solid fa-question"></i></a>`;
		}

		let dialogTemplate = `
            <div class="modal" role="dialog" id="module-settings-dialog" data-module="${module}">
            		<div class="modal-dialog modal-lg" role="document">
                		<div class="modal-content">
                        <div class="modal-header">
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                            <h4 class="modal-title"><strong>${moduleData.metadata.name} Settings</strong> ${experimental}</h4>
                        </div>
                        <div class="modal-body">
														${errorHTML}
                            <form id="module-editor-settings-form" class="form-horizontal">
                            ${moduleSettingsHtml}
                            </form>
                        </div>
                        <div class="modal-footer">
                            ${testButton}
														<div class="pull-right">
															${helpLink}
															<button type="button" class="btn btn-danger" data-dismiss="modal">Cancel</button>
															<button type="button" class="btn btn-primary" id="module-settings-dialog-save">Save</button>
														</div>
												</div>
										</div>
                </div>
            </div>
        `;

		$('#module-settings-dialog').remove();
		$(document.body).append(dialogTemplate);

		$('[data-toggle="popover"]').popover('destroy')
		$('[data-toggle="popover"]').popover()

		if (moduleData.metadata.testable !== undefined) {
			if (moduleData.metadata.testable === 'true') {
				$('.as-module-test').removeClass('hidden')
			}
		}

		Object.entries(controls['spectrum']).forEach(([key, value]) => {
			$(value['id']).spectrum(value['config'])
		})

		Object.entries(controls['select2']).forEach(([key, value]) => {
			$(value['id']).select2({
				placeholder: value['config']['placeholder'],
				ajax: {
					url: value['config']['url'],
					dataType: 'json'
				}
			})

			$(value['id']).val(value['config']['value'])

		})

		$('.allsky-position').allskyPOSITION({
			onClick: () => {
			}
		});

		Object.entries(controls['urlcheck']).forEach(([key, value]) => {
			$(value['id']).allskyURLCHECK({});
		})

		Object.entries(controls['chart']).forEach(([id, value]) => {
			$.ajax({
				url: 'includes/chartutil.php?request=ModuleGraphData',
				type: 'POST',
				data: {
					'module': value.module
				},
				dataType: 'json',
				success: function (chartInfo) {
					if (chartInfo.path !== undefined && chartInfo.filename !== undefined) {
						$(`#${value.id}`).allskyChart({
							configUrl: 'includes/chartutil.php?request=GraphData',
							configAjax: {
								method: 'POST',
								data: JSON.stringify({ filename: chartInfo.path + '/' + chartInfo.filename }),
								contentType: 'application/json; charset=utf-8',
								dataType: 'json',
								cache: false
							},
							filename: chartInfo.filename,
							startPos: { top: 0, left: 0 },
							showDeleteButton: false,
							resizeParentHeight: true,
							fitParentWidth: true,
							enableDrag: false,
							enableResize: false
						});
					}
				},
				error: function (xhr, status, error) {
					console.error('AJAX error:', status, error);
				}
			});
		})


		Object.entries(dependenciesset).forEach(([key, dependentFields]) => {
			$(`#${key}`).off('change');
			$(`#${key}`).on('change', (e) => {
				$('.as-module-dependency-select').trigger('as-dependent');
			});
		})

		$(document).off('change', '.as-module-dependency-select');
		$(document).on('change', '.as-module-dependency-select', (e) => {
			const el = $(e.currentTarget);
			const currentValue = el.val();

			el.data('value', currentValue);
		});

		$(document).off('focus', '.as-module-dependency-select');
		$(document).on('focus', '.as-module-dependency-select', (e) => {
			this.handleDependentSelect(e);
		});
		$(document).on('as-dependent', '.as-module-dependency-select', (e) => {
			this.handleDependentSelect(e);
		});
		$('.as-module-dependency-select').trigger('as-dependent');


		let centerModal = true
		if ('centersettings' in moduleData.metadata) {
			if (moduleData.metadata.centersettings === 'false') {
				centerModal = false
			}
		}
		if (centerModal) {
			$('.modal').on('shown.bs.modal', this.alignModal);
		}

		if ('extradata' in moduleData.metadata) {
			$('#as-module-var-list-table').DataTable().destroy()
			let variableTable = $('#as-module-var-list-table').DataTable({
				ajax: {
					url: 'includes/moduleutil.php?request=VariableList&module=' + module,
					type: 'GET',
					cache: false,
					dataSrc: '',
					data: function (d) {
						d.timestamp = new Date().getTime();
					}
				},
				dom: 'rtip',
				ordering: false,
				paging: true,
				pageLength: 20,
				autoWidth: false,
				columns: [
					{
						data: 'variable',
						render: function (data, type, row, meta) {
							let result = data
							if (row.value !== '') {
								result = '<b class="as-variable-has-value">' + data + '</b>'
							}
							return result
						},
						width: '30%'
					}, {
						data: 'type',
						width: '15%'
					}, {
						data: 'description',
						width: '55%'
					}
				]
			})

			variableTable.off('draw').on('draw', function () {
				let found = false;

				variableTable.column(0).data().each(function (value) {
					if (value.toString().toUpperCase().includes("COUNT")) {
						found = true;
					}
				});

				if (found) {
					$('.as-module-var-count').removeClass('hidden');
				}
			});


		}

		$('#module-settings-dialog').off('hidden.bs.modal')
		$('#module-settings-dialog').on('hidden.bs.modal', function() {
			$(this).remove();
		});

		$(window).off('resize')
		$(window).on('resize', (event) => {
			$('.modal:visible').each(this.alignModal);
		});


		$(document).off('click', '.as-secret-toggle')
		$(document).on('click', '.as-secret-toggle', (e) => {
			let elId = $(e.currentTarget).data('secretid')
			let inputEl = $('#' + elId)
			let eyeEl = $('#' + elId + '-eye')
			let eyeSlashEl = $('#' + elId + '-eye-slash')
			if (eyeEl.hasClass('hidden')) {
				inputEl.attr('type', 'password')
				eyeSlashEl.addClass('hidden')
				eyeEl.removeClass('hidden')
			} else {
				inputEl.attr('type', 'text')
				eyeEl.addClass('hidden')
				eyeSlashEl.removeClass('hidden')
			}
		})

		$(document).off('click', '#module-settings-dialog-save')
		$(document).on('click', '#module-settings-dialog-save', () => {
			let formErrors = this.#validateFormData();

			if (formErrors.length > 0) {
				let html = '<h4>Please correct the following errors before proceeding</h4>';
				html += '<ul>';
				formErrors.forEach(function (value, index) {
					html += '<li>' + value + '</li>';
				});
				html += '</ul>';


				bootbox.dialog({
					message: html,
					title: '<h4><i class="fa-solid fa-2xl fa-triangle-exclamation"></i> Module Error(s)</h4>',
					buttons: {
						main: {
							label: 'Close',
							className: 'btn-primary'
						}
					},
					className: 'module-error-dialog'
				});

			} else {
				let module = $('#module-settings-dialog').data('module');
				let formValues = this.#getFormValues()
				this.#saveFormData(this.#configData.selected, formValues, module);
				this.#saveFormData(this.#configData.available, formValues, module);

				Object.entries(controls['spectrum']).forEach(([key, value]) => {
					$(value['id']).spectrum('destroy')
				})

				//$('.allsky-position').destroy()

				$('#module-settings-dialog').modal('hide');
				$(document).trigger('module:dirty');
			}
		});

		$(document).off('change', 'select')
		$(document).on('change', 'select', (event) => {
			this.#setFormState()
		})

		$(document).off('change', 'input[type="checkbox"]')
		$(document).on('change', 'input[type="checkbox"]', (event) => {
			this.#setFormState()
		})

		this.#setFormState()
	}

	handleDependentSelect(e) {
		const el = $(e.currentTarget);
		const currentValue = el.data('value');
		let ok = true;

		$.each(el[0].attributes, function (_, attr) {
			if (attr.name.startsWith('data-dependency')) {

				let val = $(`#${attr.value}`).val()
				if (val.trim() === '') {
					ok = false
				}
			}
		});

		if (ok) {
			let url = el.data('dependency0');
			let ltt = el.data('dependency1');
			$.ajax({
				url: 'includes/moduleutil.php?request=HassSensors',
				type: 'POST',
				data: {
					'hassurl': $(`#${url}`).val(),
					'hassltt': $(`#${ltt}`).val()
				},
				dataType: 'json',
				success: function (sensorData) {

					el.empty();
					$.each(sensorData, function (index, sensor) {
						el.append(
							$('<option>', {
								value: sensor.id,
								text: sensor.name + ` (${sensor.id})`,
								selected: sensor.id === currentValue
							})
						);
					});

				}
			});
		}
	}

	#getFormValues() {

		$('#module-editor-settings-form').find('input').each(function () {
			console.log(this.name, $(this).val());
		});

		let formValues = {};
		$('#module-editor-settings-form :input:not([type=button])').each((index, element) => {
			let el = $(element)
			if (element.type == 'checkbox') {
				if (el.prop('checked')) {
					formValues[el.attr('name')] = true
				} else {
					formValues[el.attr('name')] = false
				}
			} else {
				let value = el.val()
				let convert = el.data('convert')
				if (convert !== undefined) {
					if (convert === 'rgb') {
						value = this.#hexToRgb(value)
					}
				}
				formValues[el.attr('name')] = value
			}
		});

		return formValues
	}

	#setFormState() {
		// Hide all fields that can be hidden / shown
		for (let [selectField, selectValues] of Object.entries(this.#dialogFilters)) {
			for (let [selectOption, fields] of Object.entries(selectValues)) {
				for (let [fieldToManage, filterType] of Object.entries(fields)) {
					$('#' + fieldToManage + '-wrapper').hide()
				}
			}
		}

		// Show just the fields based upon the select value
		for (let [selectField, selectValues] of Object.entries(this.#dialogFilters)) {
			let fieldType = $(`#${selectField}`).prop('type');
			let selectValue = ''
			if (fieldType === 'checkbox') {
				selectValue = $(`#${selectField}`).prop('checked')
			}
			if (fieldType === 'select-one') {
				selectValue = $(`#${selectField}`).val()
			}

			for (let [selectOption, fields] of Object.entries(selectValues)) {
				if ((selectValue == selectOption) || (fieldType === 'checkbox' && selectValue)) {
					for (let [fieldToManage, filterType] of Object.entries(fields)) {
						$('#' + fieldToManage + '-wrapper').show()
					}
				}
			}
		}
	}

	#createTestResultsMessage(response, runModule) {
		let messageHtml = response
		if (typeof response !== 'string') {
			if ('message' in response) {
				messageHtml = this.#convertLineBreaksToBr(response.message)
			}
		} else {
			messageHtml = this.#convertLineBreaksToBr(response)
		}
		let html = '<div class="module-test-results">' + messageHtml + '</div>'

		return html
	}

	#displayTestResultsDialog(response, title, runModule) {
		let dialogHtml = ''
		let results = this.#createTestResultsMessage(response, runModule)

		dialogHtml = '\
			<ul class="nav nav-tabs" role="tablist">\
				<li class="active">\
					<a href="#testresult" role="tab" data-toggle="tab">Test Results</a>\
				</li>\
				<li>\
					<a href="#testextradata" role="tab" data-toggle="tab">Extra Data</a>\
				</li>\
			</ul>\
			<div class="tab-content">\
				<div role="tabpanel" class="tab-pane fade in active" id="testresult">\
					' + results + '\
				</div>\
				<div role="tabpanel" class="tab-pane fade" id="testextradata">\
					<div id="resultjsonnotice" class="mt-4 mb-2">\
					</div>\
					<div id="resultjson" style="max-height: 500px; overflow-y: scroll;">\
					</div>\
				</div>\
			</div>\
		'

		var runInfo = bootbox.dialog({
			title: title,
			message: dialogHtml,
			size: 'large',
			buttons: {
				ok: {
					label: 'Close',
					className: 'btn-success',
					callback: function () {
						runInfo.modal('hide').remove();
					}
				}
			}
		});

		if (runModule.metadata.extradatafilename !== undefined) {
			$('#resultjsonnotice').html('<div class="alert alert-success" role="alert">This is the extra data that was generated by the module and available for use in the overlay manager.</div>')
			$('#resultjson').JVC(response.extradata);
		} else {
			$('#resultjsonnotice').html('<div class="alert alert-warning" role="alert">This module does not provide any extra data for use in the overlay.</div>')
		}


	}

	#testModule() {
		let moduleFilename = $('#module-settings-dialog').data('module')
		let daynight = $('input[name=as-module-test-option]:checked').val()
		var module = moduleFilename.replace('allsky_', '')
		module = module.replace('.py', '')
		let formValues = this.#getFormValues()

		var runModule = {}
		if (module in this.#configData.selected) {
			runModule = Object.assign({}, this.#configData.selected[module]);
		} else {
			if (module in this.#configData.available) {
				runModule = Object.assign({}, this.#configData.available[module]);
			}
		}

		this.#testData = {}
		this.#testData[module] = runModule
		this.#saveFormData(this.#testData, formValues, moduleFilename);

		let jsonData = JSON.stringify(this.#testData, null, 4);

		let overlayText = 'Testing Module - Please Wait'
		$('#module-settings-dialog .modal-content').LoadingOverlay('show', {
			background: 'rgba(0, 0, 0, 0.5)',
			imageColor: '#a94442',
			textColor: '#a94442',
			text: overlayText
		});

		$.ajax({
			url: 'includes/moduleutil.php?request=TestModule&_=' + new Date().getTime(),
			type: 'POST',
			data: {
				module: module,
				dayNight: daynight,
				flow: jsonData,
				extraDataFilename: runModule.metadata.extradatafilename
			},
			cache: false,
			dataType: 'json'
		})
			.then((response) => {
				let title = 'Module <b>' + module + '</b> run result'
				this.#displayTestResultsDialog(response, title, runModule)
			})
			.catch((error) => {
				let title = 'ERROR Running Module <b>' + module + '</b> run result'
				this.#displayTestResultsDialog(error.responseText, title, runModule)
			}).always(() => {
				$('#module-settings-dialog .modal-content').LoadingOverlay('hide')
			})
	}

	#convertLineBreaksToBr(input) {
		return input.replace(/\r\n|\n|\r/g, '<br>');
	}

	#convertBool(value) {
		let result = false;
		if (typeof value === 'boolean') {
			result = value;
		} else {
			if (typeof value === 'string') {
				value = value.toLowerCase();
				if (value === 'true') {
					result = true;
				}
			}
		}
		return result;
	}

	#validateFormData() {
		let errors = [];
		$('#module-editor-settings-form :input:not([type=button])').each(function () {
			let required = $(this).attr('required');
			if (required !== undefined && required === 'required') {
				let value = $(this).val();
				if (value === '') {
					let error = $(this).data('description') + ' is required';
					errors.push(error)
				}
			}
		});
		return errors;
	}

	#validateModuleData() {
		let errors = [];
		let moduleKeys = $('#modules-selected').sortable('toArray');
		for (let moduleKey in moduleKeys) {
			let moduleData = this.#findModuleData(moduleKeys[moduleKey]);
			if (moduleData.data.enabled) {
				if (moduleData.data.metadata.argumentdetails !== undefined) {
					for (let key in moduleData.data.metadata.argumentdetails) {
						let data = moduleData.data.metadata.argumentdetails[key];
						if (data.required !== undefined) {
							if (data.required == 'true') {
								if (moduleData.data.metadata.arguments[key] !== undefined) {
									if (moduleData.data.metadata.arguments[key] == '') {
										let moduleName = moduleData.module;
										if (errors[moduleName] === undefined) {
											errors[moduleName] = {
												'module': moduleName,
												'description': moduleData.data.metadata.name,
												'errors': []
											};
										}
										let errorMessage = data.description + ' is a required field';
										errors[moduleName].errors.push(errorMessage)
									}
								}
							}
						}
					}
				}
			}
		}
		return errors;
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
		let errors = this.#validateModuleData();
		if (Object.keys(errors).length > 0) {

			let html = '<h4>Please correct the following errors before proceeding</h4>';
			html += '<ul>';
			for (let module in errors) {
				html += '<li> Module - ' + errors[module].description;
				html += '<ul>';
				for (let error in errors[module].errors) {
					html += '<li>' + errors[module].errors[error] + '</li>';
				}
				html += '</ul>';
				html += '</li>';
			};
			html += '</ul>';


			bootbox.dialog({
				message: html,
				title: '<h4><i class="fa-solid fa-2xl fa-triangle-exclamation"></i> Module Error(s)</h4>',
				buttons: {
					main: {
						label: 'Close',
						className: 'btn-primary'
					}
				},
				className: 'module-error-dialog'
			});

		} else {
			$.LoadingOverlay('show');
			let newConfig = {};
			let moduleKeys = $('#modules-selected').sortable('toArray');
			for (let key in moduleKeys) {
				let moduleData = this.#findModuleData(moduleKeys[key])
				let enabled = $('#allsky' + moduleData.module + 'enabled').prop('checked');
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
			html += '<div class="col-md-2"><strong>Run Time (s)</strong></div>';
			html += '<div class="col-md-7"><strong>Result</strong></div>';
			html += '</div>';

			for (let key in result.debug) {
				let data = result.debug[key];
				let runTime = parseFloat(data.lastexecutiontime);
				totalTime += runTime;

				html += '<div class="row">';
				html += '<div class="col-md-3">' + key + '</div>';
				html += '<div class="col-md-2"><div class ="pull-right">' + runTime.toFixed(2) + '</div></div>';
				html += '<div class="col-md-7">' + data.lastexecutionresult + '</div>';
				html += '</div>';
			}

			html += '<div class="row">';
			html += '<div class="col-md-12">&nbsp;</div>';
			html += '</div>';

			html += '<div class="row">';
			html += '<div class="col-md-3"><div class="pull-right"><strong>Total</strong></div></div>';
			html += '<div class="col-md-2"><div class="pull-right"><strong>' + totalTime.toFixed(2) + '</strong></div></div>';
			html += '<div class="col-md-7"></div>';
			html += '</div>';

			$('#module-editor-debug-dialog-content').append(html);

			$('#module-editor-debug-dialog').modal('show');
		});

	}

	run() {

		$(document).on('click', '#module-editor-restore', (event) => {
			if (window.confirm('Are you sure you wish to restore this Flow. The last saved configuration for this flow will be restored. This process CANNOT be undone?')) {
				$.ajax({
					url: 'includes/moduleutil.php?request=Restore&flow=' + this.#eventName,
					type: 'GET',
					cache: false,
					context: this
				}).done((result) => {
					this.#buildUI();
				});
			}
		});


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

		jQuery(window).bind('beforeunload', () => {
			if (this.#dirty) {
				return ' ';
			} else {
				return undefined;
			}
		});

		$(document).on('click', '#module-options', () => {
			let loadingTimer = setTimeout(() => {
				$.LoadingOverlay('show', { text: 'Sorry this is taking longer than expected ...' });
			}, 500);

			$.ajax({
				url: 'includes/moduleutil.php?request=ModulesSettings',
				type: 'GET',
				dataType: 'json',
				cache: false,
				context: this
			}).done((result) => {
				if (result.periodictimer == undefined) {
					result.periodictimer = 5;
				}
				if (result.expiryage == undefined) {
					result.expiryage = 600;
				}
				this.#moduleSettings = result
				$('#autoenable').prop('checked', result.autoenable);
				$('#debugmode').prop('checked', result.debugmode);
				$('#periodic-timer').val(result.periodictimer);
				$('#expiry-age').val(result.expiryage);

				$('#module-editor-settings-dialog').modal('show');
			}).always(() => {
				clearTimeout(loadingTimer);
				$.LoadingOverlay('hide');
			});
		});


		$(document).on('click', '#module-editor-settings-dialog-save', () => {
			let loadingTimer = setTimeout(() => {
				$.LoadingOverlay('show', { text: 'Sorry this is taking longer than expected ...' });
			}, 500)


			this.#moduleSettings.autoenable = $('#autoenable').prop('checked');
			this.#moduleSettings.debugmode = $('#debugmode').prop('checked');

			this.#moduleSettings.periodictimer = $('#periodic-timer').val() | 0;
			this.#moduleSettings.expiryage = $('#expiry-age').val() | 0;

			this.#settings.settings = this.#moduleSettings;
			$.moduleeditor.settings = this.#settings.settings;

			this.#updateToolbar();

			$.ajax({
				url: 'includes/moduleutil.php?request=ModulesSettings',
				type: 'POST',
				data: { settings: JSON.stringify(this.#moduleSettings) },
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

		$(document).on('click', '#module-editor-periodic', (e) => {
			$('#module-editor-config').val('periodic').trigger('change');
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

		this.#buildUI();
	}

}