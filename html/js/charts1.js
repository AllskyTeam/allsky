"use strict";

class CHARTMANAGER {
    chartConfigs = []

    constructor() {
        this.charts = new Map()
    }

    createChart(id, updateInterval, type) {
        this.destroyChart(id)


        if ($('body').hasClass('dark')) {
            Highcharts.theme = {
                chart: {
                    backgroundColor: '#1e1e1e',
                    style: { color: '#ffffff' }
                },
                title: { style: { color: '#ffffff' } },
                xAxis: {
                    labels: { style: { color: '#ffffff' } },
                    lineColor: '#ffffff',
                    tickColor: '#ffffff'
                },
                yAxis: {
                    labels: { style: { color: '#ffffff' } },
                    gridLineColor: '#444444',
                    title: { style: { color: '#ffffff' } }
                },
                legend: {
                    itemStyle: { color: '#ffffff' },
                    itemHoverStyle: { color: '#cccccc' }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    style: { color: '#ffffff' }
                },
                plotOptions: {
                    series: { dataLabels: { color: '#ffffff' } }
                }
            };

            Highcharts.setOptions(Highcharts.theme);
        }
        let chartConfig = this.chartConfigs[type].config

        const chart = Highcharts.chart(id, chartConfig);

        const fetchAndUpdateChart = () => {

            let table = this.chartConfigs[type].table
            let series = this.chartConfigs[type].series

            $.ajax({
                url: '/includes/moduleutil.php?request=GraphData',
                type: 'POST',
                data: {
                    'table': table,
                    'series': series
                },
                dataType: 'json',
                success: (response) => {
                    const incomingSeries = response.series
                    if (!Array.isArray(incomingSeries)) {
                        return
                    }

                    let maxTimestamp = 0
                    incomingSeries.forEach((incoming, i) => {
                        const existing = chart.series[i]

                        if (incoming.data?.length) {
                            const lastX = incoming.data[incoming.data.length - 1][0]
                            maxTimestamp = Math.max(maxTimestamp, lastX)
                        }

                        if (existing) {
                            existing.setData(incoming.data, false)
                            existing.update({
                                name: incoming.name,
                                yAxis: incoming.yAxis
                            }, false)
                        } else {
                            chart.addSeries(incoming, false);
                        }
                    })

                    while (chart.series.length > incomingSeries.length) {
                        chart.series[chart.series.length - 1].remove(false)
                    }

                    const xAxis = chart.xAxis[0];
                    const isZoomed = !!chart.resetZoomButton

                    if (!isZoomed && maxTimestamp) {
                        const range = 5 * 60 * 1000;
                        xAxis.setExtremes(maxTimestamp - range, maxTimestamp, false)
                    }

                    chart.redraw()
                },
                error: (xhr, status, err) => {
                    console.error(`Error updating chart "${id}":`, status, err)
                }
            })
        }

        const timerId = setInterval(fetchAndUpdateChart, updateInterval);

        fetchAndUpdateChart();

        this.charts.set(id, { chart, timerId, type })

        this.saveState()
    }

    destroyChart(id) {
        const chartEntry = this.charts.get(id)
        if (chartEntry) {
            clearInterval(chartEntry.timerId)
            chartEntry.chart.destroy()
            this.charts.delete(id)
            this.saveState()
        }
    }

    destroyAll() {
        for (const id of this.charts.keys()) {
            this.destroyChart(id);
        }
    }

    hasChart(id) {
        return this.charts.has(id);
    }

    getChart(id) {
        const entry = this.charts.get(id);
        return entry ? entry.chart : null;
    }

    saveState() {
        let charts = []
        for (const [key, value] of this.charts) {
            charts.push({
                type: value.type,
                id: key
            })
        }
        localStorage.setItem('allskygraphs', JSON.stringify(charts));
    }

    restoreState() {
        let jsonString = localStorage.getItem('allskygraphs');

        if (jsonString) {
            let charts = JSON.parse(jsonString)
            Object.entries(charts).forEach(([key, value]) => {
                let tt = 56
            })
        }
    }

    #loadChartTypes() {
        $.ajax({
            url: '/includes/moduleutil.php?request=AvailableGraphs',
            method: 'GET',
            dataType: 'json',
            async: false,
            success: (data) => {
                this.chartConfigs = data
                $.each(data, function (index, item) {
                    const div = $('<div>', {
                        class: 'as-charts-chart-type as-charts-draggable',
                        draggable: true,
                        'data-type': index
                    });

                    const icon = $('<i>', {
                        class: `${item.icon}`
                    });

                    const label = $('<span>', {
                        class: 'as-charts-label',
                        text: ` ${item.title}`
                    });

                    div.append(icon).append(label);
                    $('#as-charts-chart-list').append(div)
                });
            },
            error: function (xhr, status, error) {
                console.error('AJAX Error:', status, error)
            }
        })
    }

    #addEvents() {
        $('#as-charts-toggleSidebar').on('click', function () {
            $('#as-charts-sidebar').toggleClass('as-charts-collapsed')
        })

        $('.as-charts-draggable').on('dragstart', function (e) {
            e.originalEvent.dataTransfer.setData("chart-type", $(this).data("type"))
        })

        $('.as-charts-grid-cell').on('dragover', function (e) {
            e.preventDefault()
        })

        $('.as-charts-grid-cell').on('drop', (e) => {
            e.preventDefault()
            const type = e.originalEvent.dataTransfer.getData('chart-type')
            if (!type) return

            $(e.currentTarget).empty()

            const chartId = 'as-charts-chart-' + Date.now()
            const wrapper = $('<div class="as-charts-chart-wrapper" draggable="true"></div>')
            const removeBtn = $(`<button class="as-charts-chart-remove" data-chartid="${chartId}">✖</button>`)
            const refreshBtn = $(`<button class="as-charts-chart-refresh"><i class="fa-solid fa-arrows-rotate"></i></button>`)
            const container = $('<div class="as-charts-chart-container">').attr('id', chartId)

            wrapper.append(removeBtn, container)
            wrapper.append(refreshBtn, container)
            $(e.currentTarget).append(wrapper)

            this.createChart(chartId, 60000, type)
        })

        $(document).on('dragstart', '.as-charts-chart-wrapper', function (e) {
            e.originalEvent.dataTransfer.setData("chart-html", $(this).parent().html())
            $(this).addClass('as-charts-dragging')
        })


        $(document).on('click', '.as-charts-chart-remove', (e) => {
            let chartId = $(e.currentTarget).data('chartid')
            this.destroyChart(chartId)
            $(e.currentTarget).closest('.as-charts-grid-cell').empty()
        })
    }

    run() {
        this.#loadChartTypes()
        this.#addEvents()
        this.restoreState()
    }
}