"use strict";

; (function ($) {

    $.allskyVariable = function (element, options) {
        var defaults = {
            active: true,
            id: 'as-var',
            columns: [],
            collapseall: false,
            collapseallsky: true,
            stateKey: 'as-variables',
            valueDiv: null,
            selectStyle: 'single',
            showBlocks: false,
            fonts: [],
            variableSelected: function (variable) { }
        }

        if (options === undefined) {
            options = element;
            element = null;
        } else {
            element = $(element);
        }
        var plugin = this;


        plugin.settings = $.extend({}, defaults, options);

        plugin.preselectList = [];
        if (typeof plugin.settings.variable === 'string' && plugin.settings.variable.trim() !== '') {
            plugin.preselectList = plugin.settings.variable.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        }

        let pluginPrefix = plugin.settings.id + '-' + Math.random().toString(36).substring(2, 9);

        plugin.mmId = pluginPrefix + '-allskyVariable';
        plugin.select = pluginPrefix + '-allsky-var-select';
        plugin.container = pluginPrefix + '-container';
        plugin.showAllButton = pluginPrefix + 'as-variable-show-all'
        plugin.refreshButton = pluginPrefix + 'as-variable-refresh'
        plugin.resetButton = pluginPrefix + 'as-variable-reset'

        plugin.templatecontainer = pluginPrefix + '-allskyTemplatesContainer';
        plugin.mmtemplateId = pluginPrefix + '-allskyTemplates';

        plugin.init = function () {
            buildUI()
            updateUI()
            setupEvents()
        }

        var setupEvents = function () {

            $('#' + plugin.mmId).on('hidden.bs.modal', function () {
                plugin.destroy()
            });

            $(document).on('click', '#' + plugin.mmId + '-save', (event) => {
                if (plugin.settings.selectStyle === 'multi') {
                    let selectedData = $('#' + plugin.mmId + '-table').DataTable().rows('.selected').data().toArray();
                    if (selectedData.length > 0) {
                        let selectedVariables = selectedData.map(row => row.variable).join(', ');
                        plugin.settings.variable = selectedVariables;
                        plugin.settings.variableSelected.call(this, selectedVariables);
                    }
                } else {
                    let rowData = $('#' + plugin.mmId + '-table').DataTable().row('.selected').data()
                    if (rowData !== undefined) {
                        let selectedVariable = rowData.variable
                        plugin.settings.variable = selectedVariable
                        plugin.settings.variableSelected.call(this, selectedVariable);
                    }
                }
                plugin.destroy()
            });

            $(document).on('click', '#' + plugin.showAllButton, (event) => {
                var selectedValue = $('#' + plugin.showAllButton + ':checked').val()
                if (selectedValue === undefined) {
                    selectedValue = 'no'
                }
                let newUrl = 'includes/moduleutil.php?request=VariableList&showempty=' + selectedValue
                plugin.variableTable.ajax.url(newUrl).load()
            })

            $(document).on('click', '#' + plugin.refreshButton, (event) => {
                plugin.variableTable.ajax.reload()
            })

            $(document).on('click', '#' + plugin.resetButton, (event) => {
                localStorage.removeItem(plugin.settings.stateKey)
                buildTable()
            })

        }

        var updateUI = function () {
            $('#' + plugin.select).empty();
            $('#' + plugin.select).append('<option value="">No Variable</option>');
            $.each(plugin.settings.variables, function (index, value) {
                $('#' + plugin.select).append('<option value="' + index + '">' + index + ' (' + value + ')</option>');
            });

        }

        var buildUI = function () {
            $('#' + plugin.mmId + '-table').DataTable().destroy()

            let variableHTML = `
                <div class="modal as-variables" role="dialog" id="${plugin.mmId}">
                    <div class="modal-dialog modal-lg" role="document">
                        <div class="modal-content">
                            <div class="modal-header">
                                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                                <h4 class="modal-title">Select Allsky Variable</h4>
                            </div>
                            <div class="modal-body">
                                <ul class="nav nav-tabs" role="tablist">
                                    <li class="active"><a href="#variables" role="tab" data-toggle="tab">Variables</a></li>
                                    <li><a href="#templates" role="tab" data-toggle="tab">Blocks</a></li>
                                </ul>
                                <div class="tab-content" style="margin-top:15px;">
                                    <div class="tab-pane active" id="variables">
                                        <div class="as-var" id="${plugin.container}">
                                            <div>
                                                <table id="${plugin.mmId}-table" class="display compact as-variable-list" style="width:98%;">
                                                    <thead>
                                                        <tr>
                                                            <th>Variable</th>
                                                            <th>Group</th>
                                                            <th>Source</th>
                                                            <th>Value</th>
                                                            <th>Format</th>
                                                            <th>Sample</th>
                                                            <th>Type</th>
                                                            <th>Description</th>
                                                        </tr>
                                                    </thead>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="tab-pane" id="templates">
                                        <div class="as-var" id="${plugin.templatecontainer}">
                                            <div>
                                                <table id="${plugin.mmtemplateId}-table" class="display compact as-variable-list" style="width:98%;">
                                                    <thead>
                                                        <tr>
                                                            <th>Name</th>
                                                            <th>Group</th>
                                                            <th>Description</th>
                                                            <th></th>
                                                        </tr>
                                                    </thead>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <div class="pull-left">
                                    <button type="button" class="btn btn-success" id="${plugin.refreshButton}" data-toggle="tooltip" data-placement="top" title="Reload the Allsky Variables">Refresh</button>
                                    <button type="button" class="btn btn-info ml-2" id="${plugin.resetButton}" data-toggle="tooltip" data-placement="top" title="Reset the column states to default">Reset</button>

                                    <span class="ml-2">Show All Variables</span>
                                    <label class="el-switch el-switch-sm el-switch-green">
                                        <input type="checkbox" id="${plugin.showAllButton}" value="yes">
                                        <span class="el-switch-style"></span>
                                    </label>

                                </div>
                                <div class="pull-right">
                                    <button type="button" class="btn btn-danger" data-dismiss="modal">Cancel</button>
                                    <button type="button" class="btn btn-primary" id="${plugin.mmId}-save">Select</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;


            $('#' + plugin.mmId).remove();
            $(document.body).append(variableHTML);

            $('#' + plugin.mmId).on('shown.bs.modal', function () {
                buildTable()
            });

            $('#' + plugin.mmId).modal({
                keyboard: false
            });

            $('[data-toggle="tooltip"]').tooltip()

        }

        var buildTable = function () {

            $('#' + plugin.mmId + '-table').off('preXhr.dt')
            $('#' + plugin.mmId + '-table').off('xhr.dt')
            $('#' + plugin.mmId + '-table').DataTable().destroy()
            $('#' + plugin.mmtemplateId + '-table').DataTable().destroy()

            plugin.templateTable = $('#' + plugin.mmtemplateId + '-table')
                .DataTable({

                    initComplete: function () {
                        const searchDiv = $('#' + plugin.mmtemplateId + '-table_wrapper').find('.dt-search');

                        if (searchDiv.length) {
                            searchDiv.css({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                flexWrap: 'nowrap'
                            });

                            const spinnerGroup = $(`
                                <div style="display: flex; align-items: center;">
                                    <label for="dt-font-size" style="margin-right: 5px;">Font Size</label>
                                    <input type="number" id="block-font-size" class="form-control input-sm" value="10" min="1" style="width: 80px;">
                                </div>
                            `);

                            spinnerGroup.find('input').val(plugin.settings.defaultFontSize);

                            const fontDropdown = $(`
                                <div style="display: flex; align-items: center; margin-right: 10px;">
                                    <label for="dt-font-family" style="margin-right: 5px;">Font</label>
                                    <select id="block-font" class="form-control input-sm">
                                    </select>
                                </div>
                            `);

                            plugin.settings.fonts.forEach(f => {
                                const $option = $('<option>').val(f.value).text(f.text);
                                if (f.value === plugin.settings.defaultFont) {
                                    $option.prop('selected', true);
                                }
                                fontDropdown.find('select').append($option);
                            });

                            searchDiv.prepend(fontDropdown).prepend(spinnerGroup);
                        }
                    },
                    ajax: {
                        url: 'includes/moduleutil.php?request=TemplateList',
                        dataSrc: '',
                        type: 'GET',
                        dataType: 'json',
                        cache: false
                    },
                    order: [[1, 'asc'], [0, 'asc']],
                    paging: false,
                    scrollY: '50vh',
                    scrollCollapse: true,
                    autoWidth: true,
                    columns: [
                        {
                            data: 'name',
                            render: function (data, type, row, meta) {
                                let result = data
                                if (row.value !== '') {
                                    result = '<b class="as-variable-has-value">' + data + '</b>'
                                }
                                return result
                            }
                        }, {
                            data: 'group',
                            visible: false
                        }, {
                            data: 'description'
                        }, {
                            data: null,
                            width: '100px',
                            render: function (item, type, row, meta) {
                                let buttons = `
                                    <button type="button" class="btn btn-success btn-xs oe-add-field-template" data-group="${row.group}" data-block="${row.blockname}" data-filename="${row.filename}">Add</button>
                                `;

                                return buttons;
                            }
                        }
                    ],
                    rowGroup: {
                        dataSrc: 'group',
                        startRender: function (rows, group) {
                            var collapsed = !!templateCollapsedGroups[group];

                            let icon = collapsed ? '<i class="fa-solid fa-angles-right"></i>' : '<i class="fa-solid fa-angles-down"></i>';
                            rows.nodes().each(function (r) {
                                r.style.display = collapsed ? 'none' : '';
                            });

                            group = group.replace(/^allsky_/, '').toUpperCase();
                            return $('<tr/>')
                                .append('<td colspan="9">' + icon + ' ' + group + ' (' + rows.count() + ' Blocks)</td>')
                                .attr('data-name', group)
                                .toggleClass('collapsed', collapsed);
                        }
                    }
                })

            var templateCollapsedGroups = {};
            $('#' + plugin.mmtemplateId + '-table tbody').on('click', 'tr.dtrg-start', function () {
                var name = $(this).data('name');
                templateCollapsedGroups[name] = !templateCollapsedGroups[name];
                plugin.templateTable.draw(false);
            });

            $(document).off('click', '.oe-add-field-template');
            $(document).on('click', '.oe-add-field-template', (e) =>{
                let block = $(e.currentTarget).data('block');
                let filename = $(e.currentTarget).data('filename');
                let group = $(e.currentTarget).data('group');
                $.ajax({
                    url: 'includes/moduleutil.php?request=Template&block=' + block + '&filename=' + filename + "&group=" + group,
                    type: 'GET',
                    dataType: 'json',
                    cache: false,             
                    context: this
                }).done((fields) => {
                    let result = {
                        fields: fields,
                        font: $('#block-font').val(),
                        fontSize: $('#block-font-size').val()
                    }
                    $(document).trigger('addFields', result);
                });                 
            });

            var collapsedGroups = {};
            plugin.variableTable = $('#' + plugin.mmId + '-table')
                .on('preXhr.dt', function (e, settings, data) {
                    $('#' + plugin.mmId + ' .modal-dialog').LoadingOverlay('show', {
                        background: 'rgba(0, 0, 0, 0.5)',
                        imageColor: '#a94442',
                        textColor: '#a94442',
                        text: 'Loading Variables'
                    });
                })
                .on('xhr.dt', function (e, settings, json, xhr) {
                    if (plugin.settings.collapseallsky) {
                        collapsedGroups['Allsky'] = true
                    } else {
                        if (plugin.settings.collapseall) {
                            Object.entries(result).forEach(([key, value]) => {
                                collapsedGroups[value.group] = true
                            });
                        }
                    }
                    $('#' + plugin.mmId + ' .modal-dialog').LoadingOverlay('hide')


                    if (plugin.preselectList && plugin.preselectList.length > 0) {
                        const table = plugin.variableTable;
                        const want = new Set(
                            plugin.preselectList.map(s => String(s).toLowerCase().trim()).filter(Boolean)
                        );

                        console.debug('[allskyVariable] Preselect list:', plugin.preselectList);

                        table.off('draw.preselect');
                        table.on('draw.preselect', function () {
                            try {
                                const idxs = table.rows(function (idx, data) {
                                    const v = (data && data.variable != null)
                                        ? String(data.variable).toLowerCase().trim()
                                        : '';
                                    return want.has(v);
                                }).indexes();

                                console.debug('[allskyVariable] Matched row indexes:', idxs.toArray());

                                table.rows().deselect();

                                if (plugin.settings.selectStyle === 'multi') {
                                    table.rows(idxs).select();
                                } else if (idxs.length) {
                                    table.row(idxs[0]).select();
                                }
                            } catch (err) {
                                console.error('[allskyVariable] Preselect error:', err);
                            } finally {
                                table.off('draw.preselect');
                            }
                        });
                    }

                })
                .on('dblclick', 'tr', function () {
                    var rowData = plugin.variableTable.row(this).data();
                    if (rowData !== undefined) {
                        let selectedVariable = rowData.variable
                        plugin.settings.variable = selectedVariable
                        plugin.settings.variableSelected.call(this, selectedVariable);
                    }
                    plugin.destroy()
                })
                .DataTable({
                    ajax: {
                        url: 'includes/moduleutil.php?request=VariableList&showempty=no',
                        dataSrc: '',
                        type: 'GET',
                        dataType: 'json',
                        cache: false
                    },
                    stateSave: true,
                    stateSaveCallback: function (settings, data) {
                        localStorage.setItem(plugin.settings.stateKey, JSON.stringify(data));
                    },
                    stateLoadCallback: function (settings) {
                        return JSON.parse(localStorage.getItem(plugin.settings.stateKey));
                    },
                    layout: {
                        topStart: {
                            buttons: [
                                {
                                    extend: 'colvis',
                                    text: 'Select Columns',
                                    className: 'btn btn-success'
                                }
                            ]
                        }
                    },
                    colReorder: true,
                    order: [[1, 'asc']],
                    paging: false,
                    select: {
                        style: plugin.settings.selectStyle
                    },
                    scrollY: '50vh',
                    scrollCollapse: true,
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
                            data: 'group',
                            visible: true
                        }, {
                            data: 'source',
                            visible: false
                        }, {
                            data: 'value',
                            render: function (data, type, row, meta) {
                                let result = data
                                if (result !== null && typeof result === 'object') {
                                    let toolTip = ''
                                    Object.entries(result).forEach(([key, value]) => {
                                        toolTip += `${key} = ${value}, `
                                    });
                                    toolTip = toolTip.slice(0, -2)
                                    result = data.value + '&nbsp;<a href="#" data-toggle="tooltip" title="' + toolTip + '">Options</a>'
                                }
                                if (data !== null) {
                                    if (type === 'display' && data.length > 10) {
                                        result = '<span data-toggle="tooltip" title="' + data + '">' + data.substr(0, 10) + '…</span>';
                                    }
                                }

                                return result
                            },
                            width: '20%'
                        }, {
                            data: 'format',
                            visible: false,
                            width: '20%'
                        }, {
                            data: 'sample',
                            visible: false,
                            width: '20%'
                        }, {
                            data: 'type',
                            width: '10%'
                        }, {
                            data: 'description'
                        }
                    ],
                    rowGroup: {
                        dataSrc: 'group',
                        startRender: function (rows, group) {
                            var collapsed = !!collapsedGroups[group];

                            let icon = collapsed ? '<i class="fa-solid fa-angles-right"></i>' : '<i class="fa-solid fa-angles-down"></i>';
                            rows.nodes().each(function (r) {
                                r.style.display = collapsed ? 'none' : '';
                            });

                            return $('<tr/>')
                                .append('<td colspan="9">' + icon + ' ' + group + ' (' + rows.count() + ' Variables)</td>')
                                .attr('data-name', group)
                                .toggleClass('collapsed', collapsed);
                        }
                    }
                })

            if (plugin.settings.columns.length > 0) {
                plugin.variableTable.columns().every(function (index) {
                    let columnHeader = this.header()
                    let columnName = $(columnHeader).text().toLowerCase()
                    if (plugin.settings.columns.includes(columnName)) {
                        plugin.variableTable.column(index).visible(true)
                    } else {
                        plugin.variableTable.column(index).visible(false)
                    }
                })
            }


            $('#' + plugin.mmId + '-table tbody').on('click', 'tr.dtrg-start', function () {
                var name = $(this).data('name');
                collapsedGroups[name] = !collapsedGroups[name];
                plugin.variableTable.draw(false);
            });
        }

        plugin.destroy = function () {
            $('#' + plugin.mmId).remove()
            $('#' + plugin.mmId).off('hidden.bs.modal')
            $('#' + plugin.mmId + '-table').off('preXhr.dt')
            $('#' + plugin.mmId + '-table').off('xhr.dt')
            $(document).off('click', '#' + plugin.mmId + '-save')
            $(document).off('click', 'input[name="' + plugin.showAllButton + '"]')
            $(document).off('click', '#' + plugin.refreshButton)
            $(document).off('click', '#' + plugin.resetButton)
            $('#' + plugin.mmId + '-table').DataTable().destroy()
            $(document).removeData('allskyVariable');
        }

        plugin.init();
    }

    $.fn.allskyVariable = function (options) {
        return this.each(function () {
            if (undefined == $(this).data('allskyVariable')) {
                var plugin = new $.allskyVariable(this, options);
                $(this).data('allskyVariable', plugin);
            }
        });
    }

})(jQuery);