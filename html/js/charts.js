"use strict";

class CHARTMANAGER {

    chartStorageKey = 'allsky-charts'
    chartLockedKey = 'allsky-charts-locked'
    refreshIntervals = {}
    countdownTimers = {}
    chartCount = 0
    charts = []
    chartListVisible = false
    chartsLocked = false

    createChartBox(id, moduleName, chartKey, left, top, width, height) {
        const box = $('<div class="allsky-charts-dashboard-chart"></div>').attr({
            'data-left': left, 'data-top': top, 'data-width': width, 'data-height': height
        });

        const container = $(`<div class="allsky-charts-chart-container" id="${id}" data-module="${moduleName}" data-chartkey="${chartKey}"></div>`);
        const resizer = $('<div class="allsky-charts-resizer"></div>');
        const toolbar = $(`<div class="allsky-charts-chart-toolbar"></div>`);
        const select = $('<select></select>').css({ fontSize: '12px', marginRight: '5px' }).append(`
            <option value="0">None</option>
            <option value="5000">5s</option>
            <option value="10000">10s</option>
            <option value="30000">30s</option>
            <option value="60000">1m</option>
        `);

        const refreshBtn = $('<button title="Refresh" class="btn btn-primary btn-xs ml-1"><i class="fa-solid fa-arrows-rotate"></i></button>')
        const toggleZoomBtn = $('<button title="Toggle Zoom" class="btn btn-primary btn-xs ml-1">Disable Zoom</button>')
        const closeBtn = $('<button title="Close" class="btn btn-danger btn-xs ml-1">×</button>')

        toolbar.append(select, refreshBtn, toggleZoomBtn, closeBtn);

        const indicator = $('<div class="allsky-charts-refresh-indicator">⏳</div>').hide()
        let zoomEnabled = true

        const updateZoomBtnText = () => {
            toggleZoomBtn.text(zoomEnabled ? 'Disable Zoom' : 'Enable Zoom');
        };

        select.on('change', () => {
            clearInterval(this.refreshIntervals[id]);
            clearInterval(this.countdownTimers[id]);

            const interval = parseInt(select.val());
            if (interval > 0) {
                let countdown = interval / 1000;
                indicator.text(countdown + 's').show();

                this.refreshIntervals[id] = setInterval(() => {
                    this.renderChart(id, moduleName, chartKey, { zoomEnabled });
                    countdown = interval / 1000;
                }, interval);

                this.countdownTimers[id] = setInterval(() => {
                    if (countdown > 0) {
                        countdown--;
                        indicator.text(countdown + 's');
                    }
                }, 1000);
            } else {
                indicator.hide();
            }

            this.saveCharts();
        });

        refreshBtn.on('click', () => {
            this.renderChart(id, moduleName, chartKey, { zoomEnabled });
        });

        toggleZoomBtn.on('click', () => {
            zoomEnabled = !zoomEnabled;
            updateZoomBtnText();
            this.renderChart(id, moduleName, chartKey, { zoomEnabled });
        });

        closeBtn.on('click', () => {
            clearInterval(this.refreshIntervals[id]);
            clearInterval(this.countdownTimers[id]);
            box.remove();
            this.saveCharts();
        });

        box.hover(
            () => toolbar.fadeIn(150),
            () => toolbar.fadeOut(150)
        )

        updateZoomBtnText();
        box.append(container, resizer, toolbar, indicator);
        this.makeDraggable(box);
        this.makeResizable(box, resizer);
        this.positionChartBox(box[0]);
        return box[0];
    }

    renderChart(id, moduleName, chartKey, options = {}) {
        const zoomKey = `chartZoomEnabled_${id}`;

        let zoomEnabled;
        if (options.hasOwnProperty('zoomEnabled')) {
            zoomEnabled = options.zoomEnabled;
            localStorage.setItem(zoomKey, JSON.stringify(zoomEnabled));
        } else {
            const stored = localStorage.getItem(zoomKey);
            zoomEnabled = stored === null ? true : JSON.parse(stored);
        }

        const dom = document.getElementById(id);
        if (!dom) {
            return
        }
        echarts.dispose(dom);
        const chart = echarts.init(dom);

        const categories = Array.from({ length: 10 }, (_, i) => `Label ${i + 1}`);
        const values = Array.from({ length: 100 }, () => Math.floor(Math.random() * 100));
        const pieData = categories.map((label, i) => ({
            name: label,
            value: values[i]
        }));




        $.ajax({
            url: 'includes/moduleutil.php?request=GraphData',
            type: 'POST',
            data: {
                module: moduleName,
                chartkey: chartKey
            },
            async: false,
            dataType: 'json',
            success: function (allskyChartData) {
                let chartOptions = allskyChartData.config
                let series = allskyChartData.series

                chartOptions.series = series
                chart.setOption(chartOptions, true)
                this.charts.push(chart)
                this.setTheme()
            },
            error: function (xhr, status, error) {
                console.error('Error:', error)
            }
        })







  /*      let option;

        option = {
            title: moduleName,
            tooltip: { trigger: 'axis' },
            xAxis: { type: 'category', data: categories },
            yAxis: { type: 'value' },
            series: [{
                data: values,
                type: 'line',
                smooth: true
            }],
            dataZoom: zoomEnabled
                ? [
                    { id: 'insideZoom', type: 'inside', xAxisIndex: 0 },
                    { id: 'sliderZoom', type: 'slider', xAxisIndex: 0 }
                ]
                : []
        };

        option.title = {
            left: 'center',
            text: `Chart ${moduleName}`
        }

        chart.setOption(option, true)
        this.charts.push(chart)
        this.setTheme()*/
    }

    positionChartBox(box) {
        if (!box || !box.dataset) {
            return
        }
        const rect = $('#allsky-charts-main')[0].getBoundingClientRect()
        const left = (parseFloat(box.dataset.left) / 100) * rect.width
        const top = (parseFloat(box.dataset.top) / 100) * rect.height
        const width = (parseFloat(box.dataset.width) / 100) * rect.width
        const height = (parseFloat(box.dataset.height) / 100) * rect.height
        $(box).css({ left, top, width, height })
        const container = $(box).find('.allsky-charts-chart-container')[0]
        if (container) {
            echarts.getInstanceByDom(container)?.resize()
        }
    }

    makeDraggable(el) {
        let isDragging = false
        let offsetX = 0
        let offsetY = 0

        el.on('mousedown', (e) => {
            if (!this.chartsLocked) {
                if ($(e.target).is('select, button') || $(e.target).hasClass('allsky-charts-resizer')) {
                    return
                }
                isDragging = true
                offsetX = e.offsetX
                offsetY = e.offsetY
            }
        })
        $(document).on('mousemove', (e) => {
            if (!isDragging) return;
            const rect = $('#allsky-charts-main')[0].getBoundingClientRect();
            const x = ((e.clientX - rect.left - offsetX) / rect.width) * 100;
            const y = ((e.clientY - rect.top - offsetY) / rect.height) * 100;
            el.attr('data-left', x).attr('data-top', y);
            this.positionChartBox(el[0]);
        }).on('mouseup', () => {
            if (isDragging) {
                this.saveCharts()
            }
            isDragging = false;
        })
    }

    makeResizable(box, handle) {
        let isResizing = false, startX, startY, startW, startH;
        handle.on('mousedown', (e) => {
            if (!this.chartsLocked) {
                e.preventDefault()
                isResizing = true
                startX = e.clientX
                startY = e.clientY
                startW = box.width()
                startH = box.height()
            }
        })
        $(document).on('mousemove', (e) => {
            if (!isResizing) {
                return
            }
            const rect = $('#allsky-charts-main')[0].getBoundingClientRect()
            const width = ((startW + (e.clientX - startX)) / rect.width) * 100
            const height = ((startH + (e.clientY - startY)) / rect.height) * 100
            box.attr('data-width', width).attr('data-height', height)
            this.positionChartBox(box[0])
        }).on('mouseup', (e) => {
            if (isResizing) {
                this.saveCharts()
            }
            isResizing = false
        })
    }

    loadCharts() {
        const data = JSON.parse(localStorage.getItem(this.chartStorageKey) || '[]');
        data.forEach(({ chartId, moduleName, chartKey, position, interval }) => {
            const box = $(this.createChartBox(chartId, moduleName, chartKey, position.left, position.top, position.width, position.height))
            $('#allsky-charts-main').append(box)
            this.renderChart(chartId, moduleName, chartKey)
            box.find('select').val(interval).trigger('change')
        })
        this.chartCount = data.reduce((max, c) => Math.max(max, parseInt(c.chartId.split('-')[1])), 0)
        this.setTheme()
    }

    saveCharts() {
        const data = $('.allsky-charts-dashboard-chart').map(function () {
            const box = $(this)
            const container = box.find('.allsky-charts-chart-container')
            const select = box.find('select')

            return {
                chartId: container.attr('id'),
                moduleName: container.data('module'),
                chartKey: container.data('chartkey'),
                position: {
                    left: box.attr('data-left'),
                    top: box.attr('data-top'),
                    width: box.attr('data-width'),
                    height: box.attr('data-height')
                },
                interval: select.val()
            }
        }).get()

        localStorage.setItem(this.chartStorageKey, JSON.stringify(data));
    }

    setTheme() {
        let theme = 'light'
        if ($('body').hasClass('dark')) {
            theme = 'dark'
        }

        const isDark = theme === 'dark'

        this.charts.forEach(chart => {
            const oldOption = chart.getOption();

            // Modify specific theme-dependent styles
            if (oldOption !== null) {
                const updatedOption = {
                    ...oldOption,
                    backgroundColor: isDark ? '#1f1f1f' : '#fff',
                    title: {
                        ...oldOption.title?.[0],
                        textStyle: {
                            ...oldOption.title?.[0]?.textStyle,
                            color: isDark ? '#fff' : '#000'
                        }
                    },
                    xAxis: (oldOption.xAxis || []).map(axis => ({
                        ...axis,
                        axisLine: {
                            ...axis.axisLine,
                            lineStyle: {
                                ...axis.axisLine?.lineStyle,
                                color: isDark ? '#ccc' : '#000'
                            }
                        },
                        axisLabel: {
                            ...axis.axisLabel,
                            color: isDark ? '#ddd' : '#000'
                        }
                    })),
                    yAxis: (oldOption.yAxis || []).map(axis => ({
                        ...axis,
                        axisLine: {
                            ...axis.axisLine,
                            lineStyle: {
                                ...axis.axisLine?.lineStyle,
                                color: isDark ? '#ddd' : '#000'
                            }
                        },
                        axisLabel: {
                            ...axis.axisLabel,
                            color: isDark ? '#ddd' : '#000'
                        }
                    }))
                }

                chart.setOption(updatedOption, true)
            }
        })
    }

    #setLockedState() {
        $('#allsky-charts-chart-toggle-lock').removeClass('fa-lock')
        $('#allsky-charts-chart-toggle-lock').removeClass('fa-lock-open')
        if (this.chartsLocked) {
            $('#allsky-charts-chart-toggle-lock').addClass('fa-lock')
        } else {
            $('#allsky-charts-chart-toggle-lock').addClass('fa-lock-open')
        }
        localStorage.setItem(this.chartLockedKey, this.chartsLocked ? 'true' : 'false')
    }

    buildUI() {
        $.ajax({
            url: 'includes/moduleutil.php?request=AvailableGraphs',
            type: 'GET',
            async: false,
            dataType: 'json',
            success: function (allskyChartData) {
                var sidebar = $('#allsky-charts-sidebar')
                $.each(allskyChartData, function (categoryName, chartsArray) {
                    var collapseId = 'category-' + categoryName.toLowerCase()

                    var panel = $('<div>', { class: 'panel panel-default chart-category' })

                    var heading = $('<div>', { class: 'panel-heading' }).append(
                        $('<h4>', { class: 'panel-title' }).append(
                            $('<a>', {
                                class: 'collapsed',
                                'data-toggle': 'collapse',
                                href: '#' + collapseId,
                                text: categoryName
                            })
                        )
                    )

                    var body = $('<div>', {
                        id: collapseId,
                        class: 'panel-collapse collapse'
                    }).append(
                        $('<div>', { class: 'panel-body' })
                    )

                    chartsArray.forEach(function (chart) {
                        var item = $('<div>', {
                            class: 'allsky-charts-chart-menu-item',
                            'data-module': chart.module,
                            'data-chartkey': chart.key,
                            draggable: true
                        }).append(
                            $('<i>', { class: chart.icon }).css({ marginRight: '5px' }),
                            chart.title
                        )

                        body.find('.panel-body').append(item)
                    })

                    panel.append(heading).append(body)
                    sidebar.append(panel)
                })
            },
            error: function (xhr, status, error) {
                console.error('Error:', error)
            }
        })

        this.chartsLocked = localStorage.getItem(this.chartLockedKey) === 'true'
        this.#setLockedState()

        //$('#allsky-charts-sidebar').hide()
    }

    addEvents() {
        let draggingSidebar = false
        let offsetX = 0
        let offsetY = 0

        var isToggled = false;

        $('#allsky-charts-lock').click((e) => {
            this.chartsLocked = !this.chartsLocked
            this.#setLockedState()
        })

        $('#allsky-charts-chart-list-toggle').click(function () {
            this.chartListVisible = !this.chartListVisible

            if (this.chartListVisible) {
                $('#allsky-charts-sidebar').show()
                $('#allsky-charts-chart-list-toggle-label')
                    .removeClass('label-default')
                    .addClass('label-success')
                    .text('ON');
            } else {
                $('#allsky-charts-sidebar').hide()
                $('#allsky-charts-chart-list-toggle-label')
                    .removeClass('label-success')
                    .addClass('label-default')
                    .text('OFF');
            }
        });

        $('#allsky-charts-sidebar').on('mousedown', function (e) {
            if ($(e.target).closest('.allsky-charts-chart-menu-item').length) {
                return
            }
            draggingSidebar = true
            offsetX = e.clientX - this.offsetLeft
            offsetY = e.clientY - this.offsetTop
        })

        $(document)
            .on('mousemove', function (e) {
                if (!draggingSidebar) {
                    return
                }
                $('#allsky-charts-sidebar').css({ left: `${e.clientX - offsetX}px`, top: `${e.clientY - offsetY}px` })
            })
            .on('mouseup', () => draggingSidebar = false)

        $('.allsky-charts-chart-menu-item').attr('draggable', true).on('dragstart', function (e) {
            e.originalEvent.dataTransfer.setData('module', $(this).data('module'))
            e.originalEvent.dataTransfer.setData('chartkey', $(this).data('chartkey'))
        })

        $('#allsky-charts-main').on('dragover', (e) => {
            e.preventDefault()
        });
        $('#allsky-charts-main').on('drop', (e) => {
            e.preventDefault()
            let el = e.currentTarget
            const moduleName = e.originalEvent.dataTransfer.getData('module')
            const chartKey = e.originalEvent.dataTransfer.getData('chartkey')

            const rect = el.getBoundingClientRect()
            const left = ((e.originalEvent.clientX - rect.left) / rect.width) * 100
            const top = ((e.originalEvent.clientY - rect.top) / rect.height) * 100
            const id = 'chart-' + (++this.chartCount)
            const box = this.createChartBox(id, moduleName, chartKey, left, top, 30, 20)
            if (box) {
                el.appendChild(box)
                this.renderChart(id, moduleName, chartKey)
                this.setTheme()
                this.saveCharts()
            }
        })

        $(window).on('resize', () => {
            $('.allsky-charts-dashboard-chart').each((_, el) => this.positionChartBox(el))
        })

        $(document).on('allsky-theme-change', (e) => {
            this.setTheme()
        })

        $('.chart-category').each(function () {
            const $panel = $(this);
            const $items = $panel.find('.allsky-charts-chart-menu-item');
            const $collapse = $panel.find('.panel-collapse');

            if ($items.length === 1) {
                $collapse.addClass('in'); // Bootstrap 3 collapse "open" class
                $panel.find('.panel-title a').removeClass('collapsed');
            }
        });

        $('[data-toggle="tooltip"]').tooltip();

        this.loadCharts()
    }

    run() {
        this.buildUI()        
        this.addEvents()
    }
}

$(function () {
    let chartManager = new CHARTMANAGER()
    chartManager.run()
})
