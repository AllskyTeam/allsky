"use strict";

class CHARTMANAGER {

    chartStorageKey = 'allsky-charts'
    refreshIntervals = {}
    countdownTimers = {}
    chartCount = 0
    charts = []

    createChartBox(id, type, left, top, width, height) {
        const box = $('<div class="allsky-charts-dashboard-chart"></div>').attr({
            'data-left': left, 'data-top': top, 'data-width': width, 'data-height': height
        });

        const container = $(`<div class="allsky-charts-chart-container" id="${id}" data-type="${type}"></div>`);
        const resizer = $('<div class="allsky-charts-resizer"></div>');
        const toolbar = $(`<div class="allsky-charts-chart-toolbar"></div>`);
        const select = $('<select></select>').css({ fontSize: '12px', marginRight: '5px' }).append(`
            <option value="0">None</option>
            <option value="5000">5s</option>
            <option value="10000">10s</option>
            <option value="30000">30s</option>
            <option value="60000">1m</option>
        `);

        const refreshBtn = $('<button title="Refresh" class="btn btn-primary"><i class="fa-solid fa-arrows-rotate"></i></button>')
        const toggleZoomBtn = $('<button title="Toggle Zoom" class="btn btn-primary">Disable Zoom</button>')
        const closeBtn = $('<button title="Close" class="btn btn-danger">×</button>')

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
                    this.renderChart(id, type, { zoomEnabled });
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
            this.renderChart(id, type, { zoomEnabled });
        });

        toggleZoomBtn.on('click', () => {
            zoomEnabled = !zoomEnabled;
            updateZoomBtnText();
            this.renderChart(id, type, { zoomEnabled });
        });

        closeBtn.on('click', () => {
            clearInterval(this.refreshIntervals[id]);
            clearInterval(this.countdownTimers[id]);
            box.remove();
            this.saveCharts();
        });

        // === Hover Toolbar Toggle ===
        box.hover(
            () => toolbar.fadeIn(150),
            () => toolbar.fadeOut(150)
        );

        // === Initial setup ===
        updateZoomBtnText();
        box.append(container, resizer, toolbar, indicator);
        this.makeDraggable(box);
        this.makeResizable(box, resizer);
        this.positionChartBox(box[0]);
        return box[0];
    }

    renderChart(id, type, options = {}) {
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

        let option;

        if (type === 'line' || type === 'bar') {
            option = {
                title: 'TEST',
                tooltip: { trigger: 'axis' },
                xAxis: { type: 'category', data: categories },
                yAxis: { type: 'value' },
                series: [{
                    data: values,
                    type: type,
                    smooth: type === 'line'
                }],
                dataZoom: zoomEnabled
                    ? [
                        { id: 'insideZoom', type: 'inside', xAxisIndex: 0 },
                        { id: 'sliderZoom', type: 'slider', xAxisIndex: 0 }
                    ]
                    : []
            };
        } else if (type === 'pie') {
            option = {
                tooltip: { trigger: 'item' },
                legend: {
                    orient: 'vertical',
                    left: 'left'
                },
                series: [{
                    type: 'pie',
                    radius: '60%',
                    data: pieData,
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 10,
                            shadowOffsetX: 0,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    }
                }]
            };
        } else {
            console.warn(`Unsupported chart type: ${type}`);
            return;
        }

        option.title =  {
            left: 'center',
            text: `Chart ${type}`
        }

        chart.setOption(option, true)
        this.charts.push(chart)
        this.setTheme()
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

        el.on('mousedown', function (e) {
            if ($(e.target).is('select, button') || $(e.target).hasClass('allsky-charts-resizer')) return;
            isDragging = true;
            offsetX = e.offsetX;
            offsetY = e.offsetY;
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
        handle.on('mousedown', function (e) {
            e.preventDefault();
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startW = box.width();
            startH = box.height();
        });
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
        data.forEach(({ chartId, type, position, interval }) => {
            const box = $(this.createChartBox(chartId, type, position.left, position.top, position.width, position.height))
            $('#allsky-charts-main').append(box)
            this.renderChart(chartId, type)
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
                type: container.data('type'),
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
        })
    }

    addEvents() {
        let draggingSidebar = false
        let offsetX = 0
        let offsetY = 0

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
            e.originalEvent.dataTransfer.setData('type', $(this).data('type'))
        })

        $('#allsky-charts-main').on('dragover', (e) => {
            e.preventDefault()
        });
        $('#allsky-charts-main').on('drop', (e) => {
            e.preventDefault()
            let el = e.currentTarget
            const type = e.originalEvent.dataTransfer.getData('type')
            if (!type) {
                return
            }
            const rect = el.getBoundingClientRect()
            const left = ((e.originalEvent.clientX - rect.left) / rect.width) * 100
            const top = ((e.originalEvent.clientY - rect.top) / rect.height) * 100
            const id = 'chart-' + (++this.chartCount)
            const box = this.createChartBox(id, type, left, top, 30, 20)
            if (box) {
                el.appendChild(box)
                this.renderChart(id, type)
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
        this.addEvents()
    }
}

$(function () {
    let chartManager = new CHARTMANAGER()
    chartManager.run();
})
