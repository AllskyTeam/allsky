"use strict";
class MODULESEDITOR {

	#configData = null
	#testData = {}
	#moduleSettings = null
	#dirty = false
	#eventName = null
	#settings = null
	#first = true
	#dialogFilters = {}
	#events = []
	#errors = []
	#dialogRowGroups = {}
	#installerBranch = null
	#installerData = null
	#installerQueueRunning = false
	#installerReturnToDialog = false
	#installerCancelRequested = false
	#installerCurrentRequest = null
	#installerPendingRefreshText = null
	#installerPendingEditorRefreshText = null

	constructor() {

	}

	#buildUI(overlayText = null) {
		$.LoadingOverlay('show', overlayText ? { text: overlayText } : {});

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
					forceFallback: true,
					fallbackOnBody: true,
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
					forceFallback: true,
					fallbackOnBody: true,
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

		$('#device-manager').off('click').on('click', (e) => {
        e.preventDefault();

				if (this.#settings.devicemanager) {
					$(document).devicemanager({
						config: this.#settings.devicemanager
					}).devicemanager("open");
				} else {
        	$(document).devicemanager("open");
				}
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
		let lockedOverlayHTML = ''
		if (data.position !== undefined) {
			locked = 'filtered locked ' + data.position;
			lockedHTML = '<i class="fa-solid fa-lock" title="Module cannot be moved"></i> '
			lockedHTML = ''
			lockedOverlayHTML = `
				<div class="module-locked-overlay">
					<div class="label label-default"><i class="fa-solid fa-lock"></i> Locked</div>
				</div>
			`
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
                    ${lockedOverlayHTML}
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

	#renderTabFields(tabFields) {
		let fieldsHTML = '';
		let currentRowGroup = null;
		let currentRowFields = [];

		const flushRow = () => {
			if (currentRowFields.length === 0) {
				return;
			}

			if (currentRowFields.length === 1 || !currentRowFields[0].rowTitle) {
				fieldsHTML += '<div class="row as-settings-row">';
				for (const field of currentRowFields) {
					const width = Math.min(12, Math.max(1, parseInt(field.width, 10) || 12));
					fieldsHTML += `<div class="col-xs-12 col-md-${width}">${field.html}</div>`;
				}
				fieldsHTML += '</div>';
			} else {
				fieldsHTML += `<div class="form-group" id="${currentRowGroup}-wrapper">`;
				fieldsHTML += `<label class="control-label col-xs-3">${currentRowFields[0].rowTitle}</label>`;
				fieldsHTML += '<div class="col-xs-8"><div class="row as-settings-row-group" style="margin-left:0; margin-right:0;">';
				for (const field of currentRowFields) {
					const width = Math.min(12, Math.max(1, parseInt(field.width, 10) || 12));
					fieldsHTML += `<div class="col-xs-12 col-md-${width}">${field.html}</div>`;
				}
				fieldsHTML += '</div></div><div class="col-xs-1"></div></div>';
			}

			currentRowFields = [];
			currentRowGroup = null;
		};

		for (const field of tabFields) {
			if (!field.rowGroup) {
				flushRow();
				fieldsHTML += `<div class="row as-settings-row"><div class="col-xs-12">${field.html}</div></div>`;
				continue;
			}

			if (currentRowGroup !== null && currentRowGroup !== field.rowGroup) {
				flushRow();
			}

			currentRowGroup = field.rowGroup;
			currentRowFields.push(field);
		}

		flushRow();

		return fieldsHTML;
	}

	#disposeFieldHelpPopovers() {
		$('#module-settings-dialog .as-field-help-toggle').each(function() {
			$(this).popover('hide');
		});
	}

	#createSettingsDialog(target) {
		var events = []
		this.#events = []
		let tabs = []
		this.#dialogFilters = {}
		this.#dialogRowGroups = {}
		var controls = {
			'spectrum': [],
			'select2': [],
			'position': [],
			'urlcheck': [],
			'chart': [],
			'satpicker': [],
			'allskykamera': [],
			'allskysensor': []			
		}

		var askHack = false

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
			const layout = fieldData.layout || {};
			const rowGroup = layout.row || null;
			const groupedField = rowGroup !== null;
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
				let helpToggle = '';
				if (fieldData.help !== undefined) {
					if (fieldData.help !== '') {
						const helpContent = $('<div>').text(fieldData.help).html();
						helpToggle = '<button type="button" class="btn btn-link btn-xs as-field-help-toggle" data-toggle="popover" data-container="body" data-trigger="focus click" data-placement="left" title="' + fieldData.description + '" data-content="' + helpContent + '" aria-label="Show help for ' + fieldData.description + '"><i class="fa-solid fa-circle-info"></i></button>';
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
									<button type="button" class="btn btn-primary" id="open-image-manager-' + key + '">...</button>\
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
									<button type="button" class="btn btn-primary" id="open-roi-' + key + '" data-source="' + key + '">...</button>\
									<button type="button" class="btn btn-warning" id="reset-roi-' + key + '" data-source="' + key + '"><i class="fa-solid fa-rotate-right"></i></button>\
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

					if (fieldType == 'satpicker') {
						inputHTML = '<input id="' + key + '" name="' + key + '" class="form-control" disabled="disabled" value="' + fieldValue + '"' + required + fieldDescription + '>';
						extraClass = 'input-group';
						inputHTML = '\
							<div class="row">\
								<div class="col-xs-7">\
								' + inputHTML + '\
								</div>\
								<div class="col-xs-5">\
									<button type="button" class="btn btn-default" id="open-satpicker-' + key + '" data-source="' + key + '">...</button>\
									<button type="button" class="btn btn-default" id="reset-satpicker-' + key + '" data-source="' + key + '"><i class="fa-solid fa-rotate-right"></i></button>\
								</div>\
							</div>\
						';


						var picker = $.satellitePicker({
							dataUrl: "/includes/satutil.php?request=Satellites",
							preselected: fieldValue,
							onSubmit: function (csv, selected) {
								$(`#${key}`).val(csv);
							}
						});

						jQuery(document).on("click", "#pickSatBtn", function () {
							picker.open();
						});


						$(document).off('click', '#reset-satpicker-' + key)
						$(document).on('click', '#reset-satpicker-' + key, (event) => {
							let el = $(event.target).data('source');
							$('#' + el).val('');
						});

						$(document).off('click', '#open-satpicker-' + key)
						$(document).on('click', '#open-satpicker-' + key, (event) => {
							let el = $(event.target).data('source');
							let data = $('#' + el).val();

							picker.open();
						});

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
									<button type="button" class="btn btn-primary" id="open-gpio-' + key + '" data-source="' + key + '">...</button>\
									<button type="button" class="btn btn-warning" id="reset-gpio-' + key + '" data-source="' + key + '"><i class="fa-solid fa-rotate-right"></i></button>\
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
						inputHTML = '<textarea rows=10 id="' + key + '" name="' + key + '" class="form-control" disabled="disabled" value="' + fieldValue + '"' + required + fieldDescription + '>' + fieldValue + '</textarea>';
						extraClass = 'input-group1';
						let selectType = 'single';
						if ('select' in fieldTypeData) {
							selectType = fieldTypeData.select
						}
						inputHTML = '\
							<div class="row">\
								<div class="col-xs-8">\
								' + inputHTML + '\
								</div>\
								<div class="col-xs-3">\
									<button type="button" class="btn btn-primary" id="open-var-' + key + '" data-source="' + key + '" data-select="' + selectType + '">...</button>\
									<button type="button" class="btn btn-warning" id="reset-var-' + key + '" data-source="' + key + '"><i class="fa-solid fa-rotate-right"></i></button>\
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
								showBlocks: false,
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
									<button type="button" class="btn btn-primary" id="open-i2c-' + key + '" data-source="' + key + '">...</button>\
									<button type="button" class="btn btn-warning" id="reset-i2c-' + key + '" data-source="' + key + '"><i class="fa-solid fa-rotate-right"></i></button>\
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

					if (fieldType == 'allskysensor') {



						inputHTML = `<input type="hidden" id="${key}" name="${key}" class="form-control">`
						inputHTML += `<button type="button" class="btn btn-primary" id="open-allskysensor-${key}" data-source="${key}">Edit</button>`;
							
							controls['allskysensor'].push({
								'id': '#' + key,
								'config': {
									fieldValue: moduleData.metadata.extradata.values
								}
							})

							let exampleValues = moduleData.metadata.extradata.values
            var config = {
                sensorsUrl: "allskysensor-proxy.php",
                accessToken: "",
                title: "Available Sensors",
                openButtonText: "Open Sensor Picker",
                values: exampleValues,
                selectLabel: "Available Sensors",
                placeholder: "Choose a sensor",
                helpText: "Sensor list loaded. Pick one to inspect its details.",
                onLoaded: function (sensors) {
                    $("#selected-sensor-output").text(
                        "Loaded " + sensors.length + " sensors.\n\nSelect a sensor to see its payload."
                    );
                },
                onChange: function (sensor, sensors, mapping) {
                    if (!sensor) {
                        $("#selected-sensor-output").text("No sensor selected.");
                        return;
                    }

                    $("#selected-sensor-output").text(JSON.stringify({
                        sensor: sensor,
                        mapping: mapping || {}
                    }, null, 2));
                },
                onMappingChange: function (sensor, mapping) {
                    $("#selected-sensor-output").text(JSON.stringify({
                        sensor: sensor,
                        mapping: mapping || {}
                    }, null, 2));
                },
                onError: function (xhr) {
                    var message = "Request failed";

                    if (xhr && xhr.responseJSON && xhr.responseJSON.message) {
                        message = xhr.responseJSON.message;
                    }

                    $("#selected-sensor-output").text("Error loading sensors: " + message);
                }
            };
							
							$(document).off('click', `#open-allskysensor-${key}`)
							$(document).on('click', `#open-allskysensor-${key}`, (event) => {
								$(document).allskySensor(config);
								$(document).allskySensor("open");
							});

					}

					if (fieldType == 'allskykamera') {
						let allskyKameraStatus = null;
						$.ajax({
							url: 'includes/moduleutil.php?request=AllskyKameraStatus',
							type: 'GET',
							dataType: 'json',
							cache: false,
							async: false,
							success: function(result) {
								allskyKameraStatus = result;
							}
						});

						inputHTML = `<input type="hidden" id="${key}" name="${key}" class="form-control">`
						if (allskyKameraStatus && allskyKameraStatus.installed && allskyKameraStatus.configured) {
							inputHTML += `<button type="button" class="btn btn-primary" id="open-allskykamera-${key}" data-source="${key}">Edit</button>`;
							
							controls['allskykamera'].push({
								'id': '#' + key,
								'config': {
									fieldValue: fieldValue
								}
							})

							$(document).allskykamera({
									variablesUrl: "includes/moduleutil.php?request=VariableList&showempty=no",
									sunDataUrl: "includes/moduleutil.php?request=SunData",
									onSave: (value) => {
										$(`#${key}`).val(value)
									},
									configText: fieldValue,
									frequencyMinutes: 15,
									dailyLimit: 5000
							});
							
							$(document).off('click', `#open-allskykamera-${key}`)
							$(document).on('click', `#open-allskykamera-${key}`, (event) => {
								$(document).allskykamera("open");
							});
						} else {
							askHack = true;
						}
					}

					if (fieldType == 'select') {
						inputHTML = '<select name="' + key + '" id="' + key + '" class="form-control"' + required + fieldDescription + '>';
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
						inputHTML = `<select name="${key}" id="${key}" ${required} ${fieldDescription} class="form-control as-module-dependency-select" data-action="${action}" data-value="${fieldValue}" ${dataAttributes}></select>`
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
						inputHTML = '<select name="' + key + '" id="' + key + '" class="form-control"' + required + fieldDescription + '>'
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

					if (fieldType == 'dht22') {
						let retryId = false
						let retryDelayId = false
						let powerId = false
						let fieldValue = '';

						if (fieldData.retry !== undefined) {
							retryId = fieldData.retry.id
						}
						if (fieldData.delay !== undefined) {
							retryDelayId = fieldData.delay.id
						}
						if (fieldData.power !== undefined) {
							powerId = fieldData.power.id
						}

						inputHTML = '<div class="row">'

						if (retryId !== false) {
							fieldValue = moduleData.metadata.arguments[retryId];
							if (fieldValue === undefined) {
								fieldValue = ''
							}						
							inputHTML += `	<div class="col-md-3"><input class="form-control" id="${retryId}" name="${retryId}" value="${fieldValue}" type="number" min="0" max="10" step="1"></div>`
						}
						if (retryDelayId !== false) {
							fieldValue = moduleData.metadata.arguments[retryDelayId];
							if (fieldValue === undefined) {
								fieldValue = ''
							}		
							inputHTML += `	<div class="col-md-3"><input class="form-control" id="${retryDelayId}" name="${retryDelayId}" value="${fieldValue}" type="number" min="0" max="10" step="1"></div>`
						}

						fieldValue = ''
						if (powerId !== false) {
							fieldValue = moduleData.metadata.arguments[powerId];
							if (fieldValue === undefined) {
								fieldValue = ''
							}									
						}
						inputHTML += '<div class="col-md-3">'
						inputHTML += `<input id="${powerId}" name="${powerId}" class="form-control" disabled="disabled" value="${fieldValue}" ${required} ${fieldDescription}>'`;
						inputHTML += '</div>'
						inputHTML += `
								<div class="col-md-3">
									<button type="button" class="btn btn-primary" id="open-gpio-${powerId}" data-source="${powerId}">...</button>
									<button type="button" class="btn btn-warning" id="reset-gpio-${powerId}" data-source="${powerId}"><i class="fa-solid fa-rotate-right"></i></button>
								</div>
						`;
						inputHTML += '</div>'

						inputHTML += '<div class="row help-block">'
						inputHTML += `	<div class="col-md-3">Retry Count</div>`
						inputHTML += `	<div class="col-md-3">Retry Delay</div>`
						inputHTML += `	<div class="col-md-3">Power Pin</div>`
						inputHTML += '</div>'

						$(document).off('click', '#reset-gpio-' + powerId)
						$(document).on('click', '#reset-gpio-' + powerId, (event) => {
							let el = $(event.target).data('source');
							$('#' + el).val('');
						});

						$(document).off('click', '#open-gpio-' + powerId)
						$(document).on('click', '#open-gpio-' + powerId, (event) => {
							let el = $(event.target).data('source');
							let data = $('#' + el).val();

							$.allskyGPIO({
								id: powerId,
								gpio: parseInt(data),
								gpioSelected: function (gpio) {
									$('#' + powerId).val(gpio)
								}
							});
						});
								
					}

					if (fieldType == 'offset') {
						let tempId = false
						let pressureId = false
						let humidityId = false

						if (fieldData.temp !== undefined) {
							tempId = fieldData.temp.id
						}
						if (fieldData.pressure !== undefined) {
							pressureId = fieldData.pressure.id
						}
						if (fieldData.humidity !== undefined) {
							humidityId = fieldData.humidity.id
						}

						inputHTML = '<div class="row">'
						if (tempId !== false) {
							fieldValue = moduleData.metadata.arguments[tempId];
							if (fieldValue === undefined) {
								fieldValue = ''
							}
							inputHTML += `	<div class="col-md-4"><input class="form-control" id="${tempId}" name="${tempId}" value="${fieldValue}" type="number" min="-100" max="100" step="0.5"></div>`
						}
						if (pressureId !== false) {
							fieldValue = moduleData.metadata.arguments[pressureId];
							if (fieldValue === undefined) {
								fieldValue = ''
							}
							inputHTML += `	<div class="col-md-4"><input class="form-control" id="${pressureId}" name="${pressureId}" value="${fieldValue}" type="number" min="-1000" max="1000" step="1"></div>`
						}
						if (humidityId !== false) {
							fieldValue = moduleData.metadata.arguments[humidityId];
							if (fieldValue === undefined) {
								fieldValue = ''
							}
							inputHTML += `	<div class="col-md-4"><input class="form-control" id="${humidityId}" name="${humidityId}" value="${fieldValue}" type="number" min="-100" max="99999" step="1"></div>`
						}
						inputHTML += '</div>'
						
						inputHTML += '<div class="row help-block">'
						inputHTML += `	<div class="col-md-4">Temp</div>`
						inputHTML += `	<div class="col-md-4">Pressure</div>`
						inputHTML += `	<div class="col-md-4">Humidity</div>`												
						inputHTML += '</div>'

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
					if (groupedField) {
						const fieldLabel = layout.label || fieldData.description;
						fieldHTML = '\
							<div class="form-group as-settings-inline-group" id="' + key + '-wrapper" style="margin-bottom:8px;">\
								<div class="clearfix">\
									<label for="' + key + '" class="control-label pull-left" style="margin-bottom:4px;">' + fieldLabel + '</label>\
									<span class="pull-left" style="margin-left:6px;">' + helpToggle + '</span>\
								</div>\
								<div class="'+ extraClass + '">\
									' + inputHTML + '\
								</div>\
								' + fieldPostHTML + '\
							</div>\
						'
					} else {
						const valueColumnClass = (fieldType === 'select' || fieldType === 'dependentselect' || fieldType === 'ajaxselect') ? 'col-xs-4' : 'col-xs-8';
						fieldHTML = '\
							<div class="form-group" id="' + key + '-wrapper">\
								<label for="' + key + '" class="control-label col-xs-3">' + fieldData.description + ' ' + helpToggle + '</label>\
								<div class="' + valueColumnClass + '">\
									<div class="'+ extraClass + '">\
										' + inputHTML + '\
									</div>\
								</div>\
								<div class="col-xs-1">\
								' + fieldPostHTML + '\
								</div>\
							</div>\
						'
					}
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

				const width = layout.width || 12;
				const rowTitle = layout.title || null;
				if (rowGroup !== null) {
					if (this.#dialogRowGroups[rowGroup] === undefined) {
						this.#dialogRowGroups[rowGroup] = [];
					}
					this.#dialogRowGroups[rowGroup].push(key);
				}

				tabs[tab].push({
					html: fieldHTML,
					rowGroup: rowGroup,
					width: width,
					rowTitle: rowTitle
				});
				fieldsHTML += fieldHTML;
			}

			if (fieldData.filters !== undefined) {
				const filters = Array.isArray(fieldData.filters) ? fieldData.filters : [fieldData.filters];
				this.#dialogFilters[key] = filters;
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
				moduleSettingsHtml += this.#renderTabFields(tabs[tabName]);
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
				let fieldsHTML = this.#renderTabFields(tabs[tabName]);
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

		let dayChecked = ''
		let nightChecked = ''
		if (this.#settings.tod !== undefined) {
			if (this.#settings.tod == 'day') {
				dayChecked = 'checked'
			} else {
				nightChecked = 'checked'
			}
		}

		let testButton = `
        	<div class="hidden as-module-test">
                <div class="pull-left hidden as-module-test" id="module-settings-dialog-test-wrapper" ${popover}>
                    <button type="button" class="btn btn-success form-control" id="module-settings-dialog-test" ${testDisabled}>Test Module</button>
                </div>
                <div class="pull-left hidden ml-3 as-module-test" id="module-settings-dialog-test-tod-wrapper">
										<form id="module-test-form" autocomplete="off">
											<div class="switch-field boxShadow as-module-test-option-wrapper">
													<input id="switch_day_as-module-test-option" class="form-control" type="radio" name="as-module-test-option" value="day" ${dayChecked}  ${testDisabled}/>
													<label style="margin-bottom: 0px;" for="switch_day_as-module-test-option">Day</label>
													<input id="switch_night_as-module-test-option" class="form-control" type="radio" name="as-module-test-option" value="night"  ${nightChecked} ${testDisabled}/>
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

		Object.entries(controls['allskykamera']).forEach(([key, value]) => {
			$(value['id']).val(value['config']['fieldValue'])
		})

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


		if (askHack) {
			$('#allsky_allskykameraGeneral').empty();
			errorHTML += `
				<div class="panel panel-default">
  				<div class="panel-heading">
    				<h3 class="panel-title">Error locating the AllskyKamera Software</h3>
  				</div>
  				<div class="panel-body">
    				AllskyKamera is not installed or configured. Please refer to <a href="https://allskykamera.space" class="external" target="_blank">The AllkyKamera Network</a> for details on howto join and install the software
  				</div>
				</div>`;
			
			$('#allsky_allskykameraGeneral').append(errorHTML);
		}

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
		$('#module-settings-dialog').on('hidden.bs.modal', () => {
			this.#disposeFieldHelpPopovers();
			$('#module-settings-dialog [data-toggle="popover"]').popover('dispose');
			$('#module-settings-dialog').remove();
		});
		$('#module-settings-dialog').on('hide.bs.modal', () => {
			this.#disposeFieldHelpPopovers();
		});

		$(document).off('shown.bs.tab', '#module-settings-dialog a[data-toggle="tab"]');
		$(document).on('shown.bs.tab', '#module-settings-dialog a[data-toggle="tab"]', () => {
			this.#disposeFieldHelpPopovers();
		});

		$(document).off('click', '.as-field-help-toggle');
		$(document).on('click', '.as-field-help-toggle', (event) => {
			event.stopPropagation();
		});

		$(document).off('click', '#module-settings-dialog');
		$(document).on('click', '#module-settings-dialog', (event) => {
			if (!$(event.target).closest('.popover, .as-field-help-toggle').length) {
				this.#disposeFieldHelpPopovers();
			}
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
				this.#dirty = true;
				this.#updateToolbar();

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
		const fieldVisibility = {};

		for (let [fieldToManage, filters] of Object.entries(this.#dialogFilters)) {
			const wrapper = $('#' + fieldToManage + '-wrapper');
			if (!wrapper.length) {
				continue;
			}

			let visible = true;
			for (const filter of filters) {
				const sourceElement = $('#' + filter.filter);
				if (!sourceElement.length) {
					visible = false;
					break;
				}

				const fieldType = sourceElement.prop('type');
				let matches = false;

				if (fieldType === 'checkbox') {
					matches = sourceElement.prop('checked');
					if (Array.isArray(filter.values) && filter.values.length > 0) {
						const normalizedValues = filter.values.map((value) => {
							if (typeof value === 'boolean') {
								return value;
							}
							return String(value).toLowerCase();
						});
						const hasExplicitCheckboxState =
							normalizedValues.includes(true) ||
							normalizedValues.includes(false) ||
							normalizedValues.includes('true') ||
							normalizedValues.includes('false') ||
							normalizedValues.includes('1') ||
							normalizedValues.includes('0') ||
							normalizedValues.includes('checked') ||
							normalizedValues.includes('unchecked');

						if (hasExplicitCheckboxState) {
							matches =
								(normalizedValues.includes(true) || normalizedValues.includes('true') || normalizedValues.includes('1') || normalizedValues.includes('checked'))
								? sourceElement.prop('checked')
								: !sourceElement.prop('checked');
						}
					}
				} else {
					const currentValue = sourceElement.val();
					if (Array.isArray(filter.values)) {
						matches = filter.values.some((value) => String(value) === String(currentValue));
					} else {
						matches = String(currentValue) === String(filter.values);
					}
				}

				if (filter.filtertype === 'hide') {
					matches = !matches;
				}

				if (!matches) {
					visible = false;
					break;
				}
			}

			fieldVisibility[fieldToManage] = visible;
			wrapper.toggle(visible);
		}

		for (let [rowGroup, fields] of Object.entries(this.#dialogRowGroups)) {
			const rowWrapper = $('#' + rowGroup + '-wrapper');
			if (!rowWrapper.length) {
				continue;
			}

			const hasVisibleChildren = fields.some((fieldName) => fieldVisibility[fieldName] !== false);

			rowWrapper.toggle(hasVisibleChildren);
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

	#escapeHtml(value) {
		return $('<div>').text(value ?? '').html();
	}

	#selectedInstallerBranch() {
		return $('#module-installer-branch').val() || this.#installerBranch || '';
	}

	#moduleMatchesInstallerSearch(module, searchText) {
		if (!searchText) {
			return true;
		}

		const haystack = [
			module.displayName,
			module.module,
			module.description,
			module.group,
			(module.differingFlows || []).join(' ')
		].join(' ').toLowerCase();

		return haystack.includes(searchText);
	}

	#isReleaseBranch(branch) {
		if (!branch) {
			return false;
		}

		return branch === 'master' || branch === 'legacy' || branch.startsWith('v');
	}

	#adjustInstallerModalHeight() {
		const modal = $('#module-installer-dialog');
		if (!modal.length || !modal.is(':visible')) {
			return;
		}

		const dialog = modal.find('.modal-dialog');
		const content = modal.find('.modal-content');
		const header = modal.find('.modal-header');
		const body = modal.find('.modal-body');
		const footer = modal.find('.modal-footer');
		const tabs = modal.find('.nav-tabs').first();
		const fixed = $('#module-installer-fixed');
		const list = $('#module-installer-list');
		const tabContent = list.find('.tab-content');
		const installerTab = $('#module-installer-tab');
		const installerGroups = $('#module-installer-groups');
		const suggestedTab = $('#module-suggested-tab');
		const fixedHeight = installerTab.hasClass('active') ? (fixed.outerHeight(true) || 0) : 0;

		dialog.css({
			'margin-top': '10px',
			'margin-bottom': '10px'
		});

		const viewportHeight = $(window).height();
		const dialogMargins = parseInt(dialog.css('margin-top'), 10) + parseInt(dialog.css('margin-bottom'), 10);
		const contentHeight = Math.max(420, viewportHeight - dialogMargins);
		const chromeHeight = header.outerHeight(true) + footer.outerHeight(true);
		const bodyHeight = Math.max(320, contentHeight - chromeHeight);
		const tabsHeight = tabs.outerHeight(true) || 0;
		const listHeight = Math.max(240, bodyHeight - tabsHeight);
		const installerGroupsHeight = Math.max(180, listHeight - fixedHeight);

		content.css('height', `${contentHeight}px`);

		body.css({
			'height': `${bodyHeight}px`,
			'max-height': `${bodyHeight}px`,
			'overflow-y': 'hidden',
			'padding-bottom': '0'
		});

		list.css({
			'max-height': `${listHeight}px`,
			'height': `${listHeight}px`,
			'overflow-y': 'hidden',
			'overflow-x': 'hidden'
		});

		tabContent.css({
			'height': `${listHeight}px`,
			'max-height': `${listHeight}px`,
			'overflow-x': 'hidden'
		});

		installerTab.css({
			'height': `${listHeight}px`,
			'max-height': `${listHeight}px`,
			'overflow-y': 'hidden',
			'overflow-x': 'hidden'
		});

		installerGroups.css({
			'height': `${installerGroupsHeight}px`,
			'max-height': `${installerGroupsHeight}px`,
			'overflow-y': 'auto',
			'overflow-x': 'hidden'
		});

		suggestedTab.css({
			'height': `${listHeight}px`,
			'max-height': `${listHeight}px`,
			'overflow-y': 'auto',
			'overflow-x': 'hidden'
		});
	}

	#installerQueueModules() {
		if (this.#installerData === null) {
			return [];
		}

		const searchText = ($('#module-installer-search').val() || '').trim().toLowerCase();
		const filterMode = $('#module-installer-filter').val() || 'all';
		return (this.#installerData.modules || []).filter((module) => {
			if (filterMode === 'updateable' && !module.updateAvailable) {
				return false;
			}
			if (filterMode === 'migrateable' && !module.migrationRequired) {
				return false;
			}
			if (filterMode === 'not-installed') {
				if (module.installed) {
					return false;
				}
				if (module.replacedBy && String(module.replacedBy).trim() !== '') {
					return false;
				}
			}
			if (!this.#moduleMatchesInstallerSearch(module, searchText)) {
				return false;
			}

			return !module.installed && !module.deprecated && module.valid;
		}).map((module) => module.module);
	}

	#updateableModulesVisible() {
		if (this.#installerData === null) {
			return [];
		}

		const searchText = ($('#module-installer-search').val() || '').trim().toLowerCase();
		const filterMode = $('#module-installer-filter').val() || 'all';
		return (this.#installerData.modules || []).filter((module) => {
			if (filterMode === 'migrateable' && !module.migrationRequired) {
				return false;
			}
			if (filterMode === 'not-installed' && !module.installed) {
				return false;
			}
			if (!this.#moduleMatchesInstallerSearch(module, searchText)) {
				return false;
			}

			return module.installed && module.updateAvailable;
		}).map((module) => module.module);
	}

	#installedModulesForVerification() {
		if (this.#installerData === null) {
			return [];
		}

		return (this.#installerData.modules || [])
			.filter((module) => module.installed)
			.map((module) => module.module);
	}

	#resetInstallerProgress() {
		$('#module-installer-progress-status').text('');
		$('#module-installer-progress-log').text('');
		$('#module-installer-progress-cancel').prop('disabled', false).show();
		$('#module-installer-progress-close').prop('disabled', true);
		this.#installerPendingRefreshText = null;
		this.#installerPendingEditorRefreshText = null;
	}

	#appendInstallerProgress(message) {
		const log = $('#module-installer-progress-log');
		const current = log.text();
		log.text(current ? `${current}\n${message}` : message);
		log.scrollTop(log[0].scrollHeight);
	}

	#setInstallerProgressStatus(message) {
		$('#module-installer-progress-status').text(message);
	}

	#setInstallerQueueState(running) {
		this.#installerQueueRunning = running;
		$('#module-installer-install-all').prop('disabled', running);
		$('#module-installer-update-all').prop('disabled', running);
		$('#module-installer-verify-all').prop('disabled', running);
		$('.module-installer-action').prop('disabled', running);
		$('.module-suggested-install').prop('disabled', running);
		if (!running) {
			this.#installerCurrentRequest = null;
		}
	}

	#showInstallerProgressModal(title, status, body, returnToDialog = true) {
		const installerDialog = $('#module-installer-dialog');
		const progressModal = $('#module-installer-progress-modal');
		if (progressModal.length && progressModal.parent()[0] !== document.body) {
			progressModal.appendTo('body');
		}

		this.#installerReturnToDialog = returnToDialog && installerDialog.is(':visible');
		if (this.#installerReturnToDialog) {
			installerDialog.modal('hide');
		}

		progressModal.find('.modal-title').text(title);
		$('#module-installer-progress-status').text(status);
		$('#module-installer-progress-log').text(body || '');
		$('#module-installer-progress-cancel').hide();
		$('#module-installer-progress-close').prop('disabled', false);
		progressModal.modal({
			backdrop: 'static',
			keyboard: true,
			show: true
		});
	}

	#runInstallerQueue(modules, action, title) {
		const queue = Array.isArray(modules) ? modules.slice() : [];
		if (queue.length === 0 || this.#installerQueueRunning) {
			return;
		}

		const installerDialog = $('#module-installer-dialog');
		const progressModal = $('#module-installer-progress-modal');
		if (progressModal.length && progressModal.parent()[0] !== document.body) {
			progressModal.appendTo('body');
		}
		this.#installerReturnToDialog = installerDialog.is(':visible');
		if (this.#installerReturnToDialog) {
			installerDialog.modal('hide');
		}

		this.#installerCancelRequested = false;
		this.#installerCurrentRequest = null;
		$('#module-installer-progress-log').text('');
		progressModal.modal({
			backdrop: 'static',
			keyboard: false,
			show: true
		});
		progressModal.find('.modal-title').text('Installer Progress');
		this.#setInstallerQueueState(true);
		$('#module-installer-progress-cancel').prop('disabled', false).show();
		$('#module-installer-progress-close').prop('disabled', true);
		this.#setInstallerProgressStatus(`${title}: 0 of ${queue.length} complete`);
		this.#appendInstallerProgress(`Starting ${title.toLowerCase()} for ${queue.length} module${queue.length === 1 ? '' : 's'}.`);

		const runNext = (index) => {
			if (this.#installerCancelRequested) {
				this.#setInstallerProgressStatus(`${title}: cancelled`);
				this.#appendInstallerProgress('Installation cancelled by user.');
				this.#setInstallerQueueState(false);
				$('#module-installer-progress-cancel').hide();
				$('#module-installer-progress-close').prop('disabled', false);
				this.#installerPendingRefreshText = 'Refreshing installer after cancellation...';
				this.#installerPendingEditorRefreshText = 'Refreshing module editor...';
				return;
			}

			if (index >= queue.length) {
				this.#setInstallerProgressStatus(`${title}: complete`);
				this.#appendInstallerProgress('All queued modules processed.');
				this.#setInstallerQueueState(false);
				$('#module-installer-progress-cancel').hide();
				$('#module-installer-progress-close').prop('disabled', false);
				this.#installerPendingRefreshText = 'Refreshing installer after installation...';
				this.#installerPendingEditorRefreshText = 'Refreshing module editor...';
				return;
			}

			const moduleName = queue[index];
			this.#setInstallerProgressStatus(`${title}: ${index + 1} of ${queue.length} - ${moduleName}`);
			this.#appendInstallerProgress(`[${index + 1}/${queue.length}] ${action} ${moduleName}...`);

			this.#installerCurrentRequest = $.ajax({
				url: 'includes/moduleinstallerutil.php?request=Action&_=' + new Date().getTime(),
				type: 'POST',
				dataType: 'json',
				cache: false,
				data: {
					module: moduleName,
					action: action,
					branch: this.#selectedInstallerBranch()
				},
				context: this
			}).done((result) => {
				this.#appendInstallerProgress(`OK: ${moduleName}`);
				if (result.message) {
					this.#appendInstallerProgress(result.message);
				}
				this.#installerCurrentRequest = null;
				runNext(index + 1);
			}).fail((xhr) => {
				this.#installerCurrentRequest = null;
				if (this.#installerCancelRequested || xhr.statusText === 'abort') {
					runNext(index + 1);
					return;
				}

				let message = `Failed to ${action} ${moduleName}.`;
				if (xhr.responseJSON?.message) {
					message = xhr.responseJSON.message;
				}
				this.#appendInstallerProgress(`FAILED: ${moduleName}`);
				this.#appendInstallerProgress(message);
				this.#setInstallerProgressStatus(`${title}: failed on ${moduleName}`);
				this.#setInstallerQueueState(false);
				$('#module-installer-progress-cancel').hide();
				$('#module-installer-progress-close').prop('disabled', false);
				bootbox.alert(message);
			});
		};

		runNext(0);
	}

	#runVerificationQueue(modules) {
		const queue = Array.isArray(modules) ? modules.slice() : [];
		if (queue.length === 0 || this.#installerQueueRunning) {
			return;
		}

		const installerDialog = $('#module-installer-dialog');
		const progressModal = $('#module-installer-progress-modal');
		if (progressModal.length && progressModal.parent()[0] !== document.body) {
			progressModal.appendTo('body');
		}
		this.#installerReturnToDialog = installerDialog.is(':visible');
		if (this.#installerReturnToDialog) {
			installerDialog.modal('hide');
		}

		this.#installerCancelRequested = false;
		this.#installerCurrentRequest = null;
		progressModal.find('.modal-title').text('Module Verification');
		$('#module-installer-progress-log').text('');
		progressModal.modal({
			backdrop: 'static',
			keyboard: false,
			show: true
		});
		this.#setInstallerQueueState(true);
		$('#module-installer-progress-cancel').prop('disabled', false).show();
		$('#module-installer-progress-close').prop('disabled', true);
		this.#setInstallerProgressStatus(`Verifying installed modules: 0 of ${queue.length} complete`);
		this.#appendInstallerProgress(`Starting verification for ${queue.length} module${queue.length === 1 ? '' : 's'}.`);

		const runNext = (index) => {
			if (this.#installerCancelRequested) {
				this.#setInstallerProgressStatus('Verification cancelled');
				this.#appendInstallerProgress('Verification cancelled by user.');
				this.#setInstallerQueueState(false);
				$('#module-installer-progress-cancel').hide();
				$('#module-installer-progress-close').prop('disabled', false);
				this.#installerPendingRefreshText = 'Refreshing installer after verification cancellation...';
				return;
			}

			if (index >= queue.length) {
				this.#setInstallerProgressStatus('Verification complete');
				this.#appendInstallerProgress('All installed modules verified.');
				this.#setInstallerQueueState(false);
				$('#module-installer-progress-cancel').hide();
				$('#module-installer-progress-close').prop('disabled', false);
				this.#installerPendingRefreshText = 'Refreshing installer after verification...';
				return;
			}

			const moduleName = queue[index];
			this.#setInstallerProgressStatus(`Verifying installed modules: ${index + 1} of ${queue.length} - ${moduleName}`);
			this.#appendInstallerProgress(`[${index + 1}/${queue.length}] verify ${moduleName}...`);

			this.#installerCurrentRequest = $.ajax({
				url: 'includes/moduleinstallerutil.php?request=Action&_=' + new Date().getTime(),
				type: 'POST',
				dataType: 'json',
				cache: false,
				data: {
					module: moduleName,
					action: 'verify',
					branch: this.#selectedInstallerBranch()
				},
				context: this
			}).done((result) => {
				this.#installerCurrentRequest = null;
				this.#appendInstallerProgress(result.message || `Module: ${moduleName}\nResult: OK`);
				this.#appendInstallerProgress('');
				runNext(index + 1);
			}).fail((xhr) => {
				this.#installerCurrentRequest = null;
				if (this.#installerCancelRequested || xhr.statusText === 'abort') {
					runNext(index + 1);
					return;
				}

				const message = xhr.responseJSON?.message || `Failed to verify ${moduleName}.`;
				this.#appendInstallerProgress(`Module: ${moduleName}\nResult: FAILED\nERROR: ${message}`);
				this.#appendInstallerProgress('');
				runNext(index + 1);
			});
		};

		runNext(0);
	}

	#renderInstallerModules(result) {
		this.#installerData = result;
		this.#installerBranch = result.branch;
		$('#module-installer-repo').text(result.repo || '');

		const branchSelect = $('#module-installer-branch');
		const currentOptions = Array.from(branchSelect.find('option')).map((option) => option.value);
		const newOptions = result.branches || [];
		if (currentOptions.join('|') !== newOptions.join('|')) {
			branchSelect.empty();
			const stableGroup = $('<optgroup>', { label: 'Stable' });
			const developmentGroup = $('<optgroup>', { label: 'Development' });

			newOptions.forEach((branch) => {
				const option = new Option(branch, branch, false, branch === result.branch);
				if (this.#isReleaseBranch(branch)) {
					stableGroup.append(option);
				} else {
					developmentGroup.append(option);
				}
			});

			if (stableGroup.children().length > 0) {
				branchSelect.append(stableGroup);
			}
			if (developmentGroup.children().length > 0) {
				branchSelect.append(developmentGroup);
			}
		} else {
			branchSelect.val(result.branch);
		}

		const groupsContainer = $('#module-installer-groups');
		const summaryContainer = $('#module-installer-summary');
		groupsContainer.empty();
		summaryContainer.empty();

		const searchText = ($('#module-installer-search').val() || '').trim().toLowerCase();
		const filterMode = $('#module-installer-filter').val() || 'all';
		const modules = (result.modules || []).filter((module) => {
			if (filterMode === 'updateable' && !module.updateAvailable) {
				return false;
			}
			if (filterMode === 'migrateable' && !module.migrationRequired) {
				return false;
			}
			if (filterMode === 'not-installed') {
				if (module.installed) {
					return false;
				}
				if (module.replacedBy && String(module.replacedBy).trim() !== '') {
					return false;
				}
			}
			return this.#moduleMatchesInstallerSearch(module, searchText);
		});
		const installableCount = modules.filter((module) => !module.installed && !module.deprecated && module.valid).length;
		const updateableCount = modules.filter((module) => module.installed && module.updateAvailable).length;
		$('#module-installer-install-all')
			.prop('disabled', installableCount === 0 || this.#installerQueueRunning)
			.html(`<i class="fa-solid fa-layer-group fa-fw"></i>`);
		$('#module-installer-update-all')
			.prop('disabled', updateableCount === 0 || this.#installerQueueRunning)
			.html(`<i class="fa-solid fa-download fa-fw"></i>`);
		const installedCount = modules.filter((module) => module.installed).length;
		const updateCount = modules.filter((module) => module.updateAvailable).length;
		const migrationCount = modules.filter((module) => module.migrationRequired).length;
		const deprecatedCount = modules.filter((module) => module.deprecated).length;

		summaryContainer.append(`
			<div class="row">
				<div class="col-sm-6 col-md-2">
					<div class="panel panel-default"><div class="panel-body text-center"><small>Total Modules</small><div><strong>${modules.length}</strong></div></div></div>
				</div>
				<div class="col-sm-6 col-md-2">
					<div class="panel panel-default"><div class="panel-body text-center"><small>Installed</small><div><strong>${installedCount}</strong></div></div></div>
				</div>
				<div class="col-sm-6 col-md-2">
					<div class="panel panel-default"><div class="panel-body text-center"><small>Updates</small><div><strong>${updateCount}</strong></div></div></div>
				</div>
				<div class="col-sm-6 col-md-2">
					<div class="panel panel-default"><div class="panel-body text-center"><small>Migration</small><div><strong>${migrationCount}</strong></div></div></div>
				</div>
				<div class="col-sm-6 col-md-2">
					<div class="panel panel-default"><div class="panel-body text-center"><small>Deprecated</small><div><strong>${deprecatedCount}</strong></div></div></div>
				</div>
				<div class="col-sm-6 col-md-2">
					<div class="panel panel-default"><div class="panel-body text-center"><small>Branch</small><div><strong>${this.#escapeHtml(result.branch || '')}</strong></div></div></div>
				</div>
			</div>
		`);

		const groupedModules = {};
		modules.forEach((module) => {
			const groupName = module.group || 'Ungrouped';
			if (groupedModules[groupName] === undefined) {
				groupedModules[groupName] = [];
			}
			groupedModules[groupName].push(module);
		});

		Object.keys(groupedModules).sort((a, b) => a.localeCompare(b)).forEach((groupName) => {
			const groupId = `module-installer-group-${this.#escapeHtml(groupName).replace(/[^a-zA-Z0-9_-]/g, '-')}`;
			let groupHtml = `
				<div class="panel panel-default panel-shadow">
					<div class="panel-heading">
						<a class="module-installer-toggle collapsed" data-toggle="collapse" href="#${groupId}" aria-expanded="false" aria-controls="${groupId}">
							<i class="fa-solid fa-chevron-right fa-fw"></i> <span>${this.#escapeHtml(groupName)}</span>
							<span class="pull-right text-muted">${groupedModules[groupName].length} module${groupedModules[groupName].length === 1 ? '' : 's'}</span>
						</a>
					</div>
					<div id="${groupId}" class="panel-collapse collapse">
						<div class="panel-body">
							<div class="list-group">
			`;

			groupedModules[groupName].forEach((module) => {
			let actions = `
				<div class="btn-group" role="group">
					<button type="button" class="btn btn-primary module-installer-action" data-action="status" data-module="${this.#escapeHtml(module.module)}" title="Status"><i class="fa-solid fa-circle-info fa-fw"></i></button>
				</div>
			`;
			if (module.helplink) {
				actions += ` <div class="btn-group" role="group"><a class="btn btn-info" href="${this.#escapeHtml(module.helplink)}" target="_blank" rel="noopener noreferrer" title="Help"><i class="fa-solid fa-circle-question fa-fw"></i></a></div>`;
			}
			if (module.installed) {
				if (module.updateAvailable) {
					actions += ` <div class="btn-group" role="group"><button type="button" class="btn btn-primary module-installer-action" data-action="update" data-module="${this.#escapeHtml(module.module)}" title="Update"><i class="fa-solid fa-download fa-fw"></i></button></div>`;
				}
				actions += ` <div class="btn-group" role="group"><button type="button" class="btn btn-warning module-installer-action" data-action="reinstall" data-module="${this.#escapeHtml(module.module)}" title="Reinstall"><i class="fa-solid fa-rotate-right fa-fw"></i></button></div>`;
				if (module.migrationRequired) {
					actions += ` <div class="btn-group" role="group"><button type="button" class="btn btn-info module-installer-action" data-action="migrate" data-module="${this.#escapeHtml(module.module)}" title="Migrate"><i class="fa-solid fa-right-left fa-fw"></i></button></div>`;
				}
				actions += ` <div class="btn-group" role="group"><button type="button" class="btn btn-danger module-installer-action" data-action="uninstall" data-module="${this.#escapeHtml(module.module)}" title="Uninstall"><i class="fa-solid fa-trash fa-fw"></i></button></div>`;
			} else if (!module.deprecated && module.valid) {
				actions += ` <div class="btn-group" role="group"><button type="button" class="btn btn-success module-installer-action" data-action="install" data-module="${this.#escapeHtml(module.module)}" title="Install"><i class="fa-solid fa-plus fa-fw"></i></button></div>`;
			}

			const errors = []
				.concat(module.sourceErrors || [])
				.concat(module.installed ? (module.installedErrors || []) : []);
			const errorText = errors.length > 0
				? this.#escapeHtml(errors.join(' | '))
				: '';
			const replacedBy = module.replacedBy
				? `<div class="text-warning"><small>Replaced by ${this.#escapeHtml(module.replacedBy)}</small></div>`
				: '';
			const migrationBadge = (module.differingFlows || []).length > 0
				? `<span class="badge">Migration Required</span>`
				: '';
			const flowsBlock = (module.differingFlows || []).length > 0
				? `<div><strong>Flows:</strong> ${this.#escapeHtml(module.differingFlows.join(', '))}</div>`
				: '';
			const shortDescription = this.#escapeHtml(module.description || '');
			let statusIcon = '<i class="fa-regular fa-circle text-muted" title="Available"></i>';
			if (module.installed) {
				statusIcon = '<i class="fa-solid fa-circle-check text-success" title="Installed"></i>';
			} else if (module.deprecated) {
				statusIcon = '<i class="fa-solid fa-triangle-exclamation text-warning" title="Deprecated"></i>';
			}
			const versionLine = `
				<span class="badge">Installed: ${this.#escapeHtml(module.installedVersion || 'No')}</span>
				<span class="badge">Available: ${this.#escapeHtml(module.sourceVersion || 'Unknown')}</span>
			`;

			groupHtml += `
				<div class="list-group-item" data-module="${this.#escapeHtml(module.module)}">
						<div class="row">
							<div class="col-sm-8">
								<div class="row">
									<div class="col-xs-12">
										<h4>
											${statusIcon} ${this.#escapeHtml(module.displayName)}
										</h4>
									</div>
								</div>
								<div class="row">
									<div class="col-xs-12">
										<p class="text-muted">${shortDescription}</p>
									</div>
								</div>
								<div class="row">
									<div class="col-xs-12">
										<p class="help-block"><span class="badge">${this.#escapeHtml(module.module)}</span> ${versionLine} ${migrationBadge}</p>
									</div>
								</div>
								${replacedBy ? `<div class="row"><div class="col-xs-12">${replacedBy}</div></div>` : ''}
								${errorText ? `<div class="row"><div class="col-xs-12"><div class="text-danger"><small>${errorText}</small></div></div></div>` : ''}
								${flowsBlock ? `<div class="row"><div class="col-xs-12">${flowsBlock}</div></div>` : ''}
							</div>
							<div class="col-sm-4 text-right">
								<div class="btn-toolbar pull-right" role="toolbar">
									${actions}
								</div>
							</div>
						</div>
				</div>
			`;
			});

			groupHtml += '</div></div></div></div>';
			groupsContainer.append(groupHtml);
		});

		if (modules.length === 0) {
			let emptyTitle = 'No Modules Found';
			let emptyMessage = 'No repository modules are available for the selected branch.';

			if ((result.modules || []).length > 0) {
				emptyTitle = 'No Matching Modules';
				emptyMessage = 'No modules match the current filter or search text. Try changing the Show option or clearing the filter.';
			}

			groupsContainer.append(`
				<div id="module-installer-empty" class="panel panel-default">
					<div class="panel-body">
						<div class="alert alert-info text-center" style="margin-bottom: 0;">
							<h4>${emptyTitle}</h4>
							<p class="mb-0">${emptyMessage}</p>
						</div>
					</div>
				</div>
			`);
		}
	}

	#renderSuggestedModules(suggestedData, installerData = null) {
		const container = $('#module-suggested-groups');
		container.empty();

		const suggestionInfo = suggestedData && typeof suggestedData.info === 'string'
			? suggestedData.info
			: '';
		const suggestionList = Array.isArray(suggestedData)
			? suggestedData
			: ((suggestedData && Array.isArray(suggestedData.suggestions)) ? suggestedData.suggestions : []);
		const moduleIndex = {};
		((installerData && installerData.modules) || []).forEach((module) => {
			moduleIndex[module.module] = module;
		});

		if (suggestionInfo) {
			container.append(`
				<div class="panel panel-info">
					<div class="panel-body">
						<p class="help-block">${this.#escapeHtml(suggestionInfo)}</p>
					</div>
				</div>
			`);
		}

		if (suggestionList.length === 0) {
			container.append(`
				<div class="panel panel-default">
					<div class="panel-body">
						<div class="alert alert-info text-center" style="margin-bottom: 0;">
							<h4>No Suggestions Available</h4>
							<p>No suggested module groups are defined.</p>
						</div>
					</div>
				</div>
			`);
			return;
		}

		suggestionList.forEach((suggestion, index) => {
			const title = this.#escapeHtml(suggestion.title || 'Suggested Modules');
			const description = suggestion.description
				? `<div class="well well-sm"><p class="text-muted" style="margin-bottom: 0;">${this.#escapeHtml(suggestion.description)}</p></div>`
				: '';
			const modules = Array.isArray(suggestion.modules) ? suggestion.modules : [];
			const collapseId = `module-suggested-collapse-${index}`;
			const installableModules = modules.filter((moduleName) => {
				const module = moduleIndex[moduleName] || null;
				return module && !module.installed && !module.deprecated && module.valid;
			});
			const installButtonDisabled = installableModules.length === 0 ? ' disabled="disabled"' : '';
			const installButtonData = this.#escapeHtml(JSON.stringify(installableModules));
			let panelHtml = `
				<div class="panel panel-default panel-shadow">
					<div class="panel-heading">
						<div class="row">
							<div class="col-xs-8">
								<a class="module-suggested-toggle collapsed" role="button" data-toggle="collapse" href="#${collapseId}" aria-expanded="false" aria-controls="${collapseId}">
									<i class="fa-solid fa-chevron-right fa-fw"></i> <strong>${title}</strong>
								</a>
							</div>
							<div class="col-xs-4 text-right">
								<button type="button" class="btn btn-success btn-sm module-suggested-install"${installButtonDisabled} data-modules='${installButtonData}'>
									<i class="fa-solid fa-plus fa-fw"></i> Install
								</button>
							</div>
						</div>
					</div>
					<div id="${collapseId}" class="panel-collapse collapse">
						<div class="panel-body">
							${description}
							<div class="row">
								<div class="col-xs-12">
									<h4 class="text-muted">Required Modules</h4>
								</div>
							</div>
							<div class="list-group">
			`;

			modules.forEach((moduleName) => {
				const module = moduleIndex[moduleName] || null;
				const safeModuleName = this.#escapeHtml(moduleName);
				const displayName = this.#escapeHtml(module ? (module.displayName || module.module) : moduleName);
				const statusText = module
					? (module.installed ? 'Installed' : 'Not Installed')
					: 'Not Available In Repository';
				const statusClass = module
					? (module.installed ? 'label-success' : 'label-default')
					: 'label-warning';
				let actions = '';

				if (module && module.helplink) {
					actions += `<div class="btn-group" role="group"><a class="btn btn-info" href="${this.#escapeHtml(module.helplink)}" target="_blank" rel="noopener noreferrer" title="Help"><i class="fa-solid fa-circle-question fa-fw"></i></a></div>`;
				}
				if (module && !module.installed && !module.deprecated && module.valid) {
					actions += ` <div class="btn-group" role="group"><button type="button" class="btn btn-success module-installer-action" data-action="install" data-module="${safeModuleName}" title="Install"><i class="fa-solid fa-plus fa-fw"></i></button></div>`;
				} else if (module && module.installed && module.updateAvailable) {
					actions += ` <div class="btn-group" role="group"><button type="button" class="btn btn-primary module-installer-action" data-action="update" data-module="${safeModuleName}" title="Update"><i class="fa-solid fa-download fa-fw"></i></button></div>`;
				}

				panelHtml += `
					<div class="list-group-item">
						<div class="row">
							<div class="col-sm-8">
								<div><strong>${displayName}</strong></div>
							</div>
							<div class="col-sm-4 text-right">
								<p class="help-block"><span class="label ${statusClass}">${statusText}</span></p>
								${actions ? `<div class="btn-toolbar pull-right" role="toolbar">${actions}</div>` : ''}
							</div>
						</div>
					</div>
				`;
			});

			panelHtml += `
							</div>
						</div>
					</div>
				</div>
			`;
			container.append(panelHtml);
		});
	}

	#runSuggestedInstall(modules) {
		this.#runInstallerQueue(modules, 'install', 'Suggested Install');
	}

	#loadSuggestedModules() {
		return $.ajax({
			url: 'config/suggested_modules.json?_=' + new Date().getTime(),
			type: 'GET',
			dataType: 'json',
			cache: false,
			context: this
		}).done((result) => {
			this.#renderSuggestedModules(result, this.#installerData);
		}).fail(() => {
			$('#module-suggested-groups').html(`
				<div class="panel panel-default">
					<div class="panel-body">
						<div class="alert alert-warning text-center" style="margin-bottom: 0;">
							<h4>Unable To Load Suggestions</h4>
							<p>The suggested module list could not be loaded from config/suggested_modules.json.</p>
						</div>
					</div>
				</div>
			`);
		});
	}

	#loadInstallerModules(refresh = false, overlayText = null) {
		const branch = this.#selectedInstallerBranch();
		$.LoadingOverlay('show', overlayText ? { text: overlayText } : {});

		return $.ajax({
			url: 'includes/moduleinstallerutil.php',
			type: 'GET',
			dataType: 'json',
			cache: false,
			data: {
				request: 'Modules',
				branch: branch,
				refresh: refresh
			},
			context: this
		}).done((result) => {
			this.#renderInstallerModules(result);
			this.#renderSuggestedModules([], result);
			this.#loadSuggestedModules();
			this.#adjustInstallerModalHeight();
		}).fail((xhr) => {
			let message = 'Failed to load the module installer data.';
			if (xhr.responseJSON?.message) {
				message = xhr.responseJSON.message;
			}
			bootbox.alert(message);
		}).always(() => {
			$.LoadingOverlay('hide');
		});
	}

	#runInstallerAction(moduleName, action) {
		if (this.#installerQueueRunning) {
			return;
		}

		if (action === 'install') {
			this.#runInstallerQueue([moduleName], 'install', `Install ${moduleName}`);
			return;
		}

		const destructive = action === 'uninstall';
		if (destructive && !window.confirm(`Are you sure you want to ${action} ${moduleName}?`)) {
			return;
		}

		const actionLabels = {
			status: `Loading module information for ${moduleName}...`,
			install: `Installing ${moduleName}. This may take a while if dependencies are needed...`,
			update: `Updating ${moduleName}. This may take a while if dependencies are needed...`,
			reinstall: `Reinstalling ${moduleName}. This may take a while if dependencies are needed...`,
			migrate: `Loading migration information for ${moduleName}...`,
			uninstall: `Uninstalling ${moduleName}...`
		};

		$.LoadingOverlay('show', {
			text: actionLabels[action] || `Processing ${moduleName}...`
		});
		$.ajax({
			url: 'includes/moduleinstallerutil.php?request=Action&_=' + new Date().getTime(),
			type: 'POST',
			dataType: 'json',
			cache: false,
			data: {
				module: moduleName,
				action: action,
				branch: this.#selectedInstallerBranch()
			},
			context: this
		}).done((result) => {
			bootbox.alert({
				title: `${action.charAt(0).toUpperCase()}${action.slice(1)} ${moduleName}`,
				message: `<pre>${this.#escapeHtml(result.message || 'Done')}</pre>`
			});
			this.#loadInstallerModules(false);
			this.#buildUI();
		}).fail((xhr) => {
			let message = 'The module action failed.';
			if (xhr.responseJSON?.message) {
				message = xhr.responseJSON.message;
			}
			bootbox.alert(message);
		}).always(() => {
			$.LoadingOverlay('hide');
		});
	}

	run() {
		const installerDialog = $('#module-installer-dialog');
		if (installerDialog.length && installerDialog.parent()[0] !== document.body) {
			installerDialog.appendTo('body');
		}
		const installerProgressDialog = $('#module-installer-progress-modal');
		if (installerProgressDialog.length && installerProgressDialog.parent()[0] !== document.body) {
			installerProgressDialog.appendTo('body');
		}

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

		$(document).on('click', '#module-installer-manager', () => {
			$('#module-installer-dialog').modal('show');
			this.#resetInstallerProgress();
			this.#loadInstallerModules(false);
		});

		$(document).on('shown.bs.modal', '#module-installer-dialog', () => {
			this.#adjustInstallerModalHeight();
		});

		$(document).off('hidden.bs.modal', '#module-installer-progress-modal');
		$(document).on('hidden.bs.modal', '#module-installer-progress-modal', () => {
			const refreshText = this.#installerPendingRefreshText;
			const editorRefreshText = this.#installerPendingEditorRefreshText;
			this.#installerPendingRefreshText = null;
			this.#installerPendingEditorRefreshText = null;

			if (refreshText !== null) {
				this.#loadInstallerModules(false, refreshText);
			}
			if (editorRefreshText !== null) {
				this.#buildUI(editorRefreshText);
			}

			if (this.#installerReturnToDialog) {
				this.#installerReturnToDialog = false;
				$('#module-installer-dialog').modal('show');
			}
		});

		$(document).off('click', '#module-installer-progress-cancel');
		$(document).on('click', '#module-installer-progress-cancel', () => {
			if (!this.#installerQueueRunning) {
				return;
			}
			this.#installerCancelRequested = true;
			$('#module-installer-progress-cancel').prop('disabled', true);
			this.#setInstallerProgressStatus('Cancelling after current step...');
			this.#appendInstallerProgress('Cancel requested.');
			if (this.#installerCurrentRequest !== null) {
				this.#installerCurrentRequest.abort();
			}
		});

		$(document).on('shown.bs.tab', '#module-installer-dialog a[data-toggle="tab"]', () => {
			this.#adjustInstallerModalHeight();
		});

		$(window).off('resize.moduleinstaller');
		$(window).on('resize.moduleinstaller', () => {
			this.#adjustInstallerModalHeight();
		});

		$(document).on('change', '#module-installer-branch', () => {
			this.#installerBranch = $('#module-installer-branch').val();
			this.#loadInstallerModules(false);
		});

		$(document).on('input', '#module-installer-search', () => {
			if (this.#installerData !== null) {
				this.#renderInstallerModules(this.#installerData);
			}
		});

		$(document).on('change', '#module-installer-filter', () => {
			if (this.#installerData !== null) {
				this.#renderInstallerModules(this.#installerData);
				this.#adjustInstallerModalHeight();
			}
		});

		$(document).off('click', '.module-installer-action');
		$(document).on('click', '.module-installer-action', (event) => {
			const button = $(event.currentTarget);
			this.#runInstallerAction(button.data('module'), button.data('action'));
		});

		$(document).off('click', '#module-installer-install-all');
		$(document).on('click', '#module-installer-install-all', () => {
			const modules = this.#installerQueueModules();
			if (modules.length === 0) {
				return;
			}
			this.#runInstallerQueue(modules, 'install', 'Bulk Install');
		});

		$(document).off('click', '#module-installer-update-all');
		$(document).on('click', '#module-installer-update-all', () => {
			const modules = this.#updateableModulesVisible();
			if (modules.length === 0) {
				return;
			}
			this.#runInstallerQueue(modules, 'update', 'Bulk Update');
		});

		$(document).off('click', '#module-installer-verify-all');
		$(document).on('click', '#module-installer-verify-all', () => {
			this.#runVerificationQueue(this.#installedModulesForVerification());
		});

		$(document).off('click', '.module-suggested-install');
		$(document).on('click', '.module-suggested-install', (event) => {
			const button = $(event.currentTarget);
			if (button.is(':disabled')) {
				return;
			}

			let modules = [];
			try {
				modules = JSON.parse(button.attr('data-modules') || '[]');
			} catch (error) {
				modules = [];
			}

			this.#runSuggestedInstall(modules);
		});

		$(document).off('shown.bs.collapse hidden.bs.collapse', '#module-suggested-groups .panel-collapse');
		$(document).on('shown.bs.collapse hidden.bs.collapse', '#module-suggested-groups .panel-collapse', (event) => {
			const collapse = $(event.currentTarget);
			const icon = collapse.closest('.panel').find('.module-suggested-toggle .fa-solid').first();
			icon.attr('class', collapse.hasClass('in') ? 'fa-solid fa-chevron-down fa-fw' : 'fa-solid fa-chevron-right fa-fw');
			this.#adjustInstallerModalHeight();
		});

		$(document).off('shown.bs.collapse hidden.bs.collapse', '#module-installer-groups .panel-collapse');
		$(document).on('shown.bs.collapse hidden.bs.collapse', '#module-installer-groups .panel-collapse', (event) => {
			const collapse = $(event.currentTarget);
			const icon = collapse.closest('.panel').find('.module-installer-toggle .fa-solid').first();
			icon.attr('class', collapse.hasClass('in') ? 'fa-solid fa-chevron-down fa-fw' : 'fa-solid fa-chevron-right fa-fw');
			this.#adjustInstallerModalHeight();
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
