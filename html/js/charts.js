"use strict";

class CHARTMANAGER {

    chartStorageKey = 'allsky-charts'
    chartLockedKey = 'allsky-charts-locked'
    refreshIntervals = {}
    countdownTimers = {}
    chartCount = 0
    charts = new Map()
    chartListVisible = false
    chartsLocked = false
    darkTheme = {
        colors: [
            '#8087E8', '#A3EDBA', '#F19E53', '#6699A1',
            '#E1D369', '#87B4E7', '#DA6D85', '#BBBAC5'
        ],
        chart: {
            backgroundColor: '#272727',
            style: {
                fontFamily: 'IBM Plex Sans, sans-serif'
            }
        },
        title: {
            style: {
                fontSize: '22px',
                fontWeight: '500',
                color: '#fff'
            }
        },
        subtitle: {
            style: {
                fontSize: '16px',
                fontWeight: '400',
                color: '#fff'
            }
        },
        credits: {
            style: {
                color: '#f0f0f0'
            }
        },
        caption: {
            style: {
                color: '#f0f0f0'
            }
        },
        tooltip: {
            borderWidth: 0,
            backgroundColor: '#f0f0f0',
            shadow: true
        },
        legend: {
            backgroundColor: 'transparent',
            itemStyle: {
                fontWeight: '400',
                fontSize: '12px',
                color: '#fff'
            },
            itemHoverStyle: {
                fontWeight: '700',
                color: '#fff'
            }
        },
        plotOptions: {
            series: {
                dataLabels: {
                    color: '#46465C',
                    style: {
                        fontSize: '13px'
                    }
                },
                marker: {
                    lineColor: '#333'
                }
            },
            boxplot: {
                fillColor: '#505053'
            },
            candlestick: {
                lineColor: null,
                upColor: '#DA6D85',
                upLineColor: '#DA6D85'
            },
            errorbar: {
                color: 'white'
            },
            dumbbell: {
                lowColor: '#f0f0f0'
            },
            map: {
                borderColor: '#909090',
                nullColor: '#78758C'
            }
        },
        drilldown: {
            activeAxisLabelStyle: {
                color: '#F0F0F3'
            },
            activeDataLabelStyle: {
                color: '#F0F0F3'
            },
            drillUpButton: {
                theme: {
                    fill: '#fff'
                }
            }
        },
        xAxis: {
            gridLineColor: '#707073',
            labels: {
                style: {
                    color: '#fff',
                    fontSize: '12px'
                }
            },
            lineColor: '#707073',
            minorGridLineColor: '#505053',
            tickColor: '#707073',
            title: {
                style: {
                    color: '#fff'
                }
            }
        },
        yAxis: {
            gridLineColor: '#707073',
            labels: {
                style: {
                    color: '#fff',
                    fontSize: '12px'
                }
            },
            lineColor: '#707073',
            minorGridLineColor: '#505053',
            tickColor: '#707073',
            tickWidth: 1,
            title: {
                style: {
                    color: '#fff',
                    fontWeight: '300'
                }
            }
        },
        colorAxis: {
            gridLineColor: '#45445d',
            labels: {
                style: {
                    color: '#fff',
                    fontSize: '12px'
                }
            },
            minColor: '#342f95',
            maxColor: '#2caffe',
            tickColor: '#45445d'
        },
        mapNavigation: {
            enabled: true,
            buttonOptions: {
                theme: {
                    fill: '#46465C',
                    'stroke-width': 1,
                    stroke: '#BBBAC5',
                    r: 2,
                    style: {
                        color: '#fff'
                    },
                    states: {
                        hover: {
                            fill: '#000',
                            'stroke-width': 1,
                            stroke: '#f0f0f0',
                            style: {
                                color: '#fff'
                            }
                        },
                        select: {
                            fill: '#000',
                            'stroke-width': 1,
                            stroke: '#f0f0f0',
                            style: {
                                color: '#fff'
                            }
                        }
                    }
                }
            }
        },
        // Scroll charts
        rangeSelector: {
            buttonTheme: {
                fill: '#46465C',
                stroke: '#BBBAC5',
                'stroke-width': 1,
                style: {
                    color: '#fff'
                },
                states: {
                    hover: {
                        fill: '#1f1836',
                        style: {
                            color: '#fff'
                        },
                        'stroke-width': 1,
                        stroke: 'white'
                    },
                    select: {
                        fill: '#1f1836',
                        style: {
                            color: '#fff'
                        },
                        'stroke-width': 1,
                        stroke: 'white'
                    }
                }
            },
            inputBoxBorderColor: '#BBBAC5',
            inputStyle: {
                backgroundColor: '#2F2B38',
                color: '#fff'
            },
            labelStyle: {
                color: '#fff'
            }
        },
        navigator: {
            handles: {
                backgroundColor: '#BBBAC5',
                borderColor: '#2F2B38'
            },
            outlineColor: '#CCC',
            maskFill: 'rgba(255,255,255,0.1)',
            series: {
                color: '#A3EDBA',
                lineColor: '#A3EDBA'
            },
            xAxis: {
                gridLineColor: '#505053'
            }
        },
        scrollbar: {
            barBackgroundColor: '#BBBAC5',
            barBorderColor: '#808083',
            buttonArrowColor: '#2F2B38',
            buttonBackgroundColor: '#BBBAC5',
            buttonBorderColor: '#2F2B38',
            rifleColor: '#2F2B38',
            trackBackgroundColor: '#78758C',
            trackBorderColor: '#2F2B38'
        }
    }
    lightTheme = {
        chart: {
            backgroundColor: '#FFFFFF',
            style: {
                fontFamily: 'Lucida Grande, Lucida Sans Unicode, Verdana, Arial, Helvetica, sans-serif'
            }
        },
        title: {
            style: {
                color: '#333333',
                fontSize: '18px'
            }
        },
        xAxis: {
            labels: {
                style: {
                    color: '#666666'
                }
            }
        },
        yAxis: {
            labels: {
                style: {
                    color: '#666666'
                }
            }
        },
        legend: {
            itemStyle: {
                color: '#333333'
            },
            itemHoverStyle: {
                color: '#000000'
            }
        },
        tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            style: {
                color: '#333333'
            }
        },
        colors: [
            '#7cb5ec', '#434348', '#90ed7d', '#f7a35c',
            '#8085e9', '#f15c80', '#e4d354', '#2b908f',
            '#f45b5b', '#91e8e1'
        ]
    }

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
        const closeBtn = $('<button title="Close" class="btn btn-danger btn-xs ml-1">×</button>')

        toolbar.append(select, refreshBtn, closeBtn);

        const indicator = $('<div class="allsky-charts-refresh-indicator">⏳</div>').hide()

        select.on('change', () => {
            clearInterval(this.refreshIntervals[id]);
            clearInterval(this.countdownTimers[id]);

            const interval = parseInt(select.val());
            if (interval > 0) {
                let countdown = interval / 1000;
                indicator.text(countdown + 's').show();

                this.refreshIntervals[id] = setInterval(() => {
                    this.renderChart(id, moduleName, chartKey);
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
            this.renderChart(id, moduleName, chartKey);
        });

        closeBtn.on('click', () => {
            clearInterval(this.refreshIntervals[id])
            clearInterval(this.countdownTimers[id])
            this.charts.delete(chartKey)
            box.remove()
            this.saveCharts()
        })

        box.hover(
            () => toolbar.fadeIn(150),
            () => toolbar.fadeOut(150)
        )

        box.append(container, resizer, toolbar, indicator);
        this.makeDraggable(box);
        this.makeResizable(box, resizer);
        this.positionChartBox(box[0]);
        return box[0];
    }

    renderChart(id, moduleName, chartKey, options = {}) {

        const dom = document.getElementById(id);
        if (!dom) {
            return
        }

        this.positionChartBox(dom.closest('.allsky-charts-dashboard-chart'));

        $.ajax({
            url: 'includes/moduleutil.php?request=GraphData',
            type: 'POST',
            data: {
                module: moduleName,
                chartkey: chartKey
            },
            dataType: 'json',
            success: (allskyChartData) => {
                if (this.charts.has(chartKey)) {
                    const chart = this.charts.get(chartKey);
                    chart.update(allskyChartData);
                } else {
                    const chart = Highcharts.chart(dom, allskyChartData)
                    //this.charts.set(chartKey, chart)
                }
                
                this.setTheme()
            },
            error: function (xhr, status, error) {
                console.error('Error:', error)
            }
        })

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
            //echarts.getInstanceByDom(container)?.resize()
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
        if ($('body').hasClass('dark')) {
            Highcharts.setOptions(this.darkTheme)
        } else {
            Highcharts.setOptions(this.lightTheme)
        }
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
            for (const [id, chart] of this.charts.entries()) {
                if (chart && chart.redraw) {
                    chart.redraw();
                }
            }            
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
