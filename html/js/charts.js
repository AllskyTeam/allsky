"use strict";

class ASCHARTMANAGER {
    tabCounter = 1;

    constructor() {
        this.buildHTML();
        this.setupEvents();
    }

    show() {
        let menu = $('#as-charts-toolbox-wrapper');
        if (!menu.hasClass('active')) {
            menu.addClass('active');
            this.buildChartGroups();
        }
    }

    hide() {
        let menu = $('#as-charts-toolbox-wrapper');
        if (menu.hasClass('active')) {
            menu.removeClass('active');
        }
    }

    buildHTML() {
        let chartManager = `
            <div id="as-chart-manager">
                <div id="as-charts-toolbox-wrapper">
                    <h4 class="text-center">Charts Menu</h4>
                    <div id="as-charts-groups" class="panel-group">SS</div>
                </div>
            </div>`

        $('#s-chart-manager').remove();
        $('body').append(chartManager);
    }

    buildChartGroups() {
        $.ajax({
            url: 'includes/moduleutil.php?request=AvailableGraphs',
            type: 'GET',
            async: false,
            dataType: 'json',
            success: function (allskyChartData) {



                var chartGroups = $('#as-charts-groups')
                chartGroups.html('');
                $.each(allskyChartData, function (categoryName, chartsArray) {
                    var collapseId = 'category-' + categoryName.toLowerCase()
                    var panel = $('<div>', { class: 'panel panel-default chart-category' })
                    var heading = $('<div>', { class: 'panel-heading' }).append(
                        $('<h4>', { class: 'panel-title' }).append(
                            $('<a>', {
                                class: 'collapsed small',
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
                            $('<i>', { class: chart.icon + ' small' }).css({ marginRight: '5px' }),
                            chart.title
                        )

                        body.find('.panel-body').append(item)
                    })


                    panel.append(heading).append(body)
                    chartGroups.append(panel)

                })


            }
        });
    }

    addTab(title, content) {
        this.tabCounter++;
        var tabId = "as-gm-tab-" + this.tabCounter;

        var newTab = $(
            '<li><a href="#' + tabId + '" data-toggle="tab">' +
            '<span class="tab-title">' + (title || 'Tab ' + this.tabCounter) + '</span>' +
            '<span class="as-gm-tab-tools">' +
            '<button class="close close-tab"><i class="fa-regular fa-xmark small text-danger"></i></button></a></li>' +
            '</span>'
        );

        $('#as-gm-add-tab').before(newTab);

        var newContent = $(
            '<div class="tab-pane fade as-gm-tab" id="' + tabId + '">' +
            (content || '') +
            '</div>'
        );
        $('#as-gm-tablist-content').append(newContent);

        newTab.find('a').tab('show');
        return tabId;
    }

    removeTab(tabId) {
        var tabLi = $('#as-gm-tablist a[href="#' + tabId + '"]').closest('li');
        var tabContent = $('#' + tabId);

        if (tabLi.hasClass('active')) {
            var prev = tabLi.prev('li').find('a[data-toggle="tab"]');
            var next = tabLi.next('li').find('a[data-toggle="tab"]');

            if (prev.length) prev.tab('show');
            else if (next.length && !tabLi.is('#addTab')) next.tab('show');
        }

        tabLi.remove();
        tabContent.remove();
    }

    startRename(a) {
        var title = a.find('.tab-title');
        if (a.find('.tab-title-editor').length) return;

        var current = title.text();
        var input = $('<input type="text" class="form-control input-sm tab-title-editor">').val(current);

        $('.as-gm-tab-tools').css('visibility', 'hidden');
        $('.as-gm-tab-tools').css('display', 'none');
        title.replaceWith(input);
        input.focus().select();

        function finish(save) {
            var text = save ? (input.val().trim() || current) : current;
            input.replaceWith('<span class="tab-title">' + $('<div>').text(text).html() + '</span>');
            $('.as-gm-tab-tools').css('visibility', 'visible');
            $('.as-gm-tab-tools').css('display', 'inline');
        }
        input.on('keydown', function (e) {
            if (e.key === 'Enter') finish(true);
            if (e.key === 'Escape') finish(false);
        });
        input.on('blur', function () { finish(true); });
    }

    setupEvents() {

        $('#as-charts-menu').off('click');
        $('#as-charts-menu').on('click', (e) => {
            this.show();
        });

        $(document).on('click', (e) => {
            let isInside = $(e.target).closest('#as-charts-toolbox-wrapper').length > 0;
            let isExcluded = $(e.target).closest('#as-charts-menu').length > 0;

            if (!isInside && !isExcluded) {
                this.hide();
            }
        });

        $('#as-gm-add-tab').off('click');
        $('#as-gm-add-tab').on('click', (e) => {
            this.addTab();
        });

        $('#as-gm-tablist').on('click', '.close-tab', (e) => {
            e.stopPropagation();
            var tabId = $(e.currentTarget).closest('a').attr('href').substring(1);
            this.removeTab(tabId);
        });

        $('#as-gm-tablist').on('dblclick', '.tab-title', (e) => {
            let el = e.currentTarget;
            e.stopPropagation();
            e.preventDefault();
            this.startRename($(el).closest('a'));
        });


// Use event delegation
$(document).on('dragover', '.as-gm-tab', function(e) {
            e.preventDefault()
});
        

        $(document).on('drop', '.as-gm-tab', (e) => {

            let targetTab = e.currentTarget.id;

let $pane = $(`#${targetTab}`).addClass('as-grid-bg ');
$pane.asHighchartFromConfig({
  config: { title:'Fan 1 Speed', type:'gauge', series:{ speed:{ data:[42] } } },
  grid: { enabled:true, size:{ x:24, y:24 }, snap:'end' } // snap on drop
});

$pane.asHighchartFromConfig({
  config: {
    title:'Exposure',
    type:'line',
    series: { exposure:{ data:[1,2,3,2,4,3,5] } }
  },
  grid: { enabled:true, size:{ x:24, y:24 }, snap:'move', threshold:6 } // live snap
});

$pane.asHighchartFromConfig({
  config: {
    title: 'Exposure vs Gain',
    type: 'line',
    series: {
      exposure: { name: 'Exposure', yAxis: 0, data: [1,2,3,2,4,3,5] },
      gain:     { name: 'Gain',     yAxis: 1, data: [10,12,15,18,16,20,22] }
    }
  },
  grid: { enabled: true, size: { x: 24, y: 24 }, snap: 'end' }
});
        });
    }
}
