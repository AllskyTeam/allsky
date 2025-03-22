"use strict";

class CHARTMANAGER {
    chartConfigs = []

    #loadChartTypes() {
        $.ajax({
            url: '/includes/moduleutil.php?request=AvailableGraphs',
            method: 'GET',
            dataType: 'json',
            async: false,
            success: (data) => {
                this.chartConfigs = data
                $.each(data, function(index, item) {
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
            error: function(xhr, status, error) {
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
            const removeBtn = $('<button class="as-charts-chart-remove">✖</button>')
            const refreshBtn = $('<button class="as-charts-chart-refresh"><i class="fa-solid fa-arrows-rotate"></i></button>')
            const container = $('<div class="as-charts-chart-container">').attr('id', chartId)

            wrapper.append(removeBtn, container)
            wrapper.append(refreshBtn, container)
            $(e.currentTarget).append(wrapper)

            this.renderHighchart(chartId, type)
        })
    
        $(document).on('dragstart', '.as-charts-chart-wrapper', function (e) {
            e.originalEvent.dataTransfer.setData("chart-html", $(this).parent().html())
            $(this).addClass('as-charts-dragging')
        })
    
        $(document).on('drop', '.as-charts-grid-cell', function (e) {
            e.preventDefault()
            const chartHTML = e.originalEvent.dataTransfer.getData("chart-html")
            if (chartHTML) {
                $(this).empty().html(chartHTML)
                this.reRenderChartsInCell($(this))
            }
        })

        $(document).on('click', '.as-charts-chart-remove', function () {
            $(this).closest('.as-charts-grid-cell').empty();
        })
    }

    detectChartTypeFromHTML($el) {
        return 'bar'
    }

    reRenderChartsInCell($cell) {
        $cell.find('.as-charts-chart-wrapper').each(function () {
            const $container = $(this).find('.as-charts-chart-container');
            const type = detectChartTypeFromHTML($container);
            renderHighchart($container.attr('id'), type);
        });
    }

    renderHighchart(containerId, type) {
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
            success: (data) => {
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
                chartConfig.series = data.series

                Highcharts.chart(containerId, chartConfig);
            },
            error: function (xhr, status, error) {
                console.error('AJAX error:', status, error);
            }
            });
    }

    run() {
        this.#loadChartTypes()
        this.#addEvents()
    }
}