/*!
 * asHighchartFromConfig — draggable/resizable Highcharts cards with toolbar + THEMES + series-only refresh
 * Live theme switching: reacts to body.dark (via MutationObserver)
 * Auto-refresh progress: 1px line at header bottom that starts FULL and shrinks LEFT until next refresh
 * Notifies host on move/resize (boundschange) and on delete (deleted)
 * Supports: line, column, column3d, gauge, area3d, pie
 * Requires: jQuery, Highcharts, highcharts-more (gauge), highcharts-3d (area3d/column3d),
 *           and (optionally) modules/no-data-to-display
 */
(function ($) {
  'use strict';

  var PLUGIN = 'asHighchartFromConfig';
  var INST_KEY = PLUGIN + '_instances';
  var Z_STACK_NEXT = 1000;

  /* ======================= THEMES ======================= */
  var darkTheme = {
    colors: ['#8087E8', '#A3EDBA', '#F19E53', '#6699A1', '#E1D369', '#87B4E7', '#DA6D85', '#BBBAC5'],
    chart: {
      backgroundColor: '#272727',
      style: { fontFamily: 'IBM Plex Sans, sans-serif' },
      borderColor: '#3a3a3a', borderWidth: 1,
      plotBorderColor: '#3a3a3a', plotBorderWidth: 1
    },
    title: { style: { fontSize: '22px', fontWeight: '500', color: '#fff' } },
    subtitle: { style: { fontSize: '16px', fontWeight: '400', color: '#fff' } },
    credits: { style: { color: '#f0f0f0' } },
    caption: { style: { color: '#f0f0f0' } },
    tooltip: { borderWidth: 0, backgroundColor: '#f0f0f0', shadow: true },
    legend: {
      backgroundColor: 'transparent',
      itemStyle: { fontWeight: '400', fontSize: '12px', color: '#fff' },
      itemHoverStyle: { fontWeight: '700', color: '#fff' }
    },
    plotOptions: {
      series: { dataLabels: { color: '#46465C', style: { fontSize: '13px' } }, marker: { lineColor: '#333' } },
      boxplot: { fillColor: '#505053' },
      candlestick: { lineColor: null, upColor: '#DA6D85', upLineColor: '#DA6D85' },
      errorbar: { color: 'white' },
      dumbbell: { lowColor: '#f0f0f0' },
      map: { borderColor: '#909090', nullColor: '#78758C' }
    },
    drilldown: {
      activeAxisLabelStyle: { color: '#F0F0F3' },
      activeDataLabelStyle: { color: '#F0F0F3' },
      drillUpButton: { theme: { fill: '#fff' } }
    },
    xAxis: {
      gridLineColor: '#707073',
      labels: { style: { color: '#fff', fontSize: '12px' } },
      lineColor: '#707073', minorGridLineColor: '#505053', tickColor: '#707073',
      title: { style: { color: '#fff' } }
    },
    yAxis: {
      gridLineColor: '#707073',
      labels: { style: { color: '#fff', fontSize: '12px' } },
      lineColor: '#707073', minorGridLineColor: '#505053', tickColor: '#707073', tickWidth: 1,
      title: { style: { color: '#fff', fontWeight: '300' } }
    },
    colorAxis: {
      gridLineColor: '#45445d',
      labels: { style: { color: '#fff', fontSize: '12px' } },
      minColor: '#342f95', maxColor: '#2caffe', tickColor: '#45445d'
    },
    mapNavigation: {
      enabled: true,
      buttonOptions: {
        theme: {
          fill: '#46465C', 'stroke-width': 1, stroke: '#BBBAC5', r: 2,
          style: { color: '#fff' },
          states: {
            hover: { fill: '#000', 'stroke-width': 1, stroke: '#f0f0f0', style: { color: '#fff' } },
            select: { fill: '#000', 'stroke-width': 1, stroke: '#f0f0f0', style: { color: '#fff' } }
          }
        }
      }
    },
    rangeSelector: {
      buttonTheme: {
        fill: '#46465C', stroke: '#BBBAC5', 'stroke-width': 1, style: { color: '#fff' },
        states: {
          hover: { fill: '#1f1836', style: { color: '#fff' }, 'stroke-width': 1, stroke: 'white' },
          select: { fill: '#1f1836', style: { color: '#fff' }, 'stroke-width': 1, stroke: 'white' }
        }
      },
      inputBoxBorderColor: '#BBBAC5',
      inputStyle: { backgroundColor: '#2F2B38', color: '#fff' },
      labelStyle: { color: '#fff' }
    },
    navigator: {
      handles: { backgroundColor: '#BBBAC5', borderColor: '#2F2B38' },
      outlineColor: '#CCC', maskFill: 'rgba(255,255,255,0.1)',
      series: { color: '#A3EDBA', lineColor: '#A3EDBA' },
      xAxis: { gridLineColor: '#505053' }
    },
    scrollbar: {
      barBackgroundColor: '#BBBAC5', barBorderColor: '#808083',
      buttonArrowColor: '#2F2B38', buttonBackgroundColor: '#BBBAC5', buttonBorderColor: '#2F2B38',
      rifleColor: '#2F2B38', trackBackgroundColor: '#78758C', trackBorderColor: '#2F2B38'
    }
  };

  var lightTheme = {
    chart: {
      backgroundColor: '#FFFFFF',
      style: { fontFamily: 'Lucida Grande, Lucida Sans Unicode, Verdana, Arial, Helvetica, sans-serif' },
      borderColor: '#e6e6e6', borderWidth: 1,
      plotBorderColor: '#eaeaea', plotBorderWidth: 1
    },
    title: { style: { color: '#333333', fontSize: '18px' } },
    xAxis: { labels: { style: { color: '#666666' } } },
    yAxis: { labels: { style: { color: '#666666' } } },
    legend: { itemStyle: { color: '#333333' }, itemHoverStyle: { color: '#000000' } },
    tooltip: { backgroundColor: 'rgba(255, 255, 255, 0.85)', style: { color: '#333333' } },
    colors: ['#7cb5ec', '#434348', '#90ed7d', '#f7a35c', '#8085e9', '#f15c80', '#e4d354', '#2b908f', '#f45b5b', '#91e8e1']
  };

  function isDarkMode() { return document.body.classList.contains('dark'); }
  function getActiveTheme() { return isDarkMode() ? darkTheme : lightTheme; }

  /* ======================= Helpers ======================= */
  function deepMerge() {
    var args = Array.prototype.slice.call(arguments), out = {};
    args.forEach(function (src) {
      if (!src) return;
      Object.keys(src).forEach(function (k) {
        var v = src[k];
        out[k] = ($.isPlainObject(v)) ? deepMerge(out[k], v) : v;
      });
    });
    return out;
  }
  function normalizeType(t) {
    var s = (t || 'line').toLowerCase();
    if (s === 'guage') s = 'gauge';
    if (s === 'spline') s = 'line';
    if (s === 'doughnut' || s === 'donut') s = 'pie';
    return s;
  }
  function boolish(v) { return (typeof v === 'string') ? v.toLowerCase() === 'true' : !!v; }
  function isNumber(x) { return typeof x === 'number' && !isNaN(x); }

  // ---- NEW: robust point normalization (fixes x,y,data) ----
  function toNumericX(x) {
    if (typeof x === 'number') return x;
    if (typeof x === 'string') {
      var t = Date.parse(x);
      return isNaN(t) ? x : t; // keep category strings, convert date strings
    }
    return x;
  }

  function normalizePointsForType(type, data) {
    var t = normalizeType(type);

    // Gauge: single number
    if (t === 'gauge') {
      if (isNumber(data)) return [data];
      if (Array.isArray(data)) {
        var n = Number(data[0]);
        return [isNaN(n) ? 0 : n];
      }
      return [0];
    }

    // Pie accepts {name,y} or [name, y]
    var isPie = (t === 'pie');

    if (!Array.isArray(data)) return [];
    return data.map(function (pt) {
      // number-only points (valid for line/column)
      if (typeof pt === 'number') return pt;

      // array points
      if (Array.isArray(pt)) {
        // Treat as [x, y] normally; for pie, treat as [name, y]
        if (isPie) {
          var pname = (pt[0] != null) ? String(pt[0]) : '';
          return [pname, pt[1]];
        }
        return [toNumericX(pt[0]), pt[1]];
      }

      // object points
      if (pt && typeof pt === 'object') {
        var out = {};
        // support {x, y} (line/column) and {name, y} or {x: 'cat', y} for pie
        if (isPie) {
          if (typeof pt.name !== 'undefined') out.name = pt.name;
          else if (typeof pt.x === 'string') out.name = pt.x; // x-as-category
          if (typeof pt.y !== 'undefined') out.y = pt.y;
        } else {
          if (typeof pt.x !== 'undefined') out.x = toNumericX(pt.x);
          if (typeof pt.y !== 'undefined') out.y = pt.y;
        }

        // move meta to custom
        if (typeof pt.custom !== 'undefined') out.custom = pt.custom;
        else if (typeof pt.data !== 'undefined') out.custom = pt.data;

        // copy other safe fields
        ['color', 'id', 'selected', 'sliced', 'marker', 'dataLabels', 'name'].forEach(function (k) {
          if (typeof pt[k] !== 'undefined' && typeof out[k] === 'undefined') out[k] = pt[k];
        });
        return out;
      }

      return pt;
    });
  }

  /* ======================= Defaults ======================= */
  var TYPE_DEFAULTS = {
    common: {
      title: { text: null }, // title in card header (not in chart)
      credits: { enabled: false },
      legend: { enabled: true },
      xAxis: { title: { text: null } },
      tooltip: { shared: true },
      plotOptions: { series: { turboThreshold: 0, marker: { enabled: false } } }
    },
    // LINE default per your spec
    line: {
      chart: { type: 'line', zooming: { type: 'x' } },
      xAxis: {
        type: 'datetime',
        dateTimeLabelFormats: { day: '%Y-%m-%d', hour: '%H:%M' }
      },
      lang: { noData: 'No data available' },
      noData: { style: { fontWeight: 'bold', fontSize: '16px', color: '#666' } }
    },
    column: {
      chart: { type: 'column' },
      plotOptions: { column: { pointPadding: 0.1, borderWidth: 0, groupPadding: 0.1 } },
      xAxis: { type: 'category' }
    },
    column3d: {
      chart: {
        type: 'column',
        options3d: {
          enabled: true, alpha: 10, beta: 15, depth: 50, viewDistance: 25,
          frame: {
            bottom: { size: 1, color: 'rgba(0,0,0,0.05)' },
            back: { size: 1, color: 'rgba(0,0,0,0.03)' },
            side: { size: 1, color: 'rgba(0,0,0,0.03)' }
          }
        }
      },
      plotOptions: { column: { depth: 40, pointPadding: 0.05, groupPadding: 0.05, borderWidth: 0 } },
      xAxis: { type: 'category' },
      yAxis: [{ title: { text: null } }]
    },
    gauge: {
      chart: { type: 'gauge', spacingBottom: 28 },
      pane: { startAngle: -90, endAngle: 90, center: ['50%', '75%'], size: '110%', background: null },
      yAxis: [{
        min: 0, max: 100, tickInterval: 10, tickPosition: 'inside', lineWidth: 0,
        labels: { distance: 20, style: { fontSize: '12px' } },
        plotBands: [
          { from: 0, to: 70, color: '#55BF3B', thickness: 30 },
          { from: 70, to: 85, color: '#DDDF0D', thickness: 30 },
          { from: 85, to: 100, color: '#DF5353', thickness: 30 }
        ]
      }]
    },
    area3d: {
      chart: {
        type: 'area',
        options3d: {
          enabled: true, alpha: 15, beta: 15, depth: 70, viewDistance: 25,
          frame: {
            bottom: { size: 1, color: 'rgba(0,0,0,0.05)' },
            back: { size: 1, color: 'rgba(0,0,0,0.03)' },
            side: { size: 1, color: 'rgba(0,0,0,0.03)' }
          }
        }
      },
      plotOptions: {
        area: { depth: 50, marker: { enabled: false }, enableMouseTracking: true },
        series: { animation: true }
      },
      xAxis: { type: 'category' },
      yAxis: [{ title: { text: null } }],
      zAxis: { visible: false }
    },
    pie: {
      chart: { type: 'pie' },
      tooltip: { pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>', shared: false },
      plotOptions: {
        pie: {
          allowPointSelect: true, cursor: 'pointer', showInLegend: true,
          dataLabels: { enabled: true, format: '<b>{point.name}</b>: {point.percentage:.1f} %' }
        }
      },
      legend: { enabled: true }
    }
  };

  var SERIES_DEFAULTS = {
    line: {}, column: {}, column3d: {},
    gauge: {
      tooltip: { valueSuffix: ' %' },
      dataLabels: { format: '{y} %', borderWidth: 0, style: { fontSize: '14px' } },
      dial: { radius: '80%', backgroundColor: '#666', baseWidth: 16, baseLength: '0%', rearLength: '0%' },
      pivot: { backgroundColor: '#666', radius: 8 }
    },
    area3d: {}, pie: {}
  };

  var defaults = {
    // Config source
    config: null,        // object inline
    configUrl: null,     // string or $.ajax options

    // Metadata outside config
    filename: null,      // custom field returned by getBounds / notifications

    // Variable resolver
    fetchSeriesData: function (variable) {
      return $.Deferred().reject(new Error('fetchSeriesData not implemented for ' + variable)).promise();
    },

    highcharts: window.Highcharts,
    onBeforeRender: null,
    onError: function (err) { if (console) console.error(err); },

    // Initial geometry: accepts either initialPos/initialSize OR top/left/width/height
    initialPos: null,            // { top, left } px
    initialSize: null,           // { width, height } px
    top: undefined,              // optional shorthand
    left: undefined,
    width: undefined,
    height: undefined,

    // Fallbacks
    headerTitle: null,
    containment: 'host',
    startPos: { top: 20, left: 20 },
    minSize: { width: 320, height: 220 },
    resizerSize: 15,             // resize handle size

    // Toolbar
    showToolbar: true,
    showRefreshButton: true,
    refreshLabel: '',
    showDeleteButton: true,
    deleteLabel: '',
    confirmDelete: true,

    // NEW: Tooltip toggle button labels
    tooltipToggle: {
      show: true,
      labelOn: 'On',
      labelOff: 'Off'
    },

    // Auto refresh
    autoRefresh: { enabled: true, options: [0, 10, 20, 30, 60, 120], defaultSeconds: 0 },

    // Snap-to-grid
    grid: { enabled: false, size: { x: 24, y: 24 }, snap: 'end', threshold: 0 },

    // Notifications
    onBoundsChange: null,                  // function(bounds, instance) {}
    boundsEventName: 'asHc.boundschange',
    onDelete: null,                        // function(payload, instance) {}
    deleteEventName: 'asHc.deleted'
  };

  /* ======================= Constructor ======================= */
  function Plugin(el, options) {
    this.$host = $(el);
    this.opts = $.extend(true, {}, defaults, options || {});
    this.HC = this.opts.highcharts;

    this.config = null;
    this.chart = null;

    this.filename = this.opts.filename || null;

    this.$wrapper = null;
    this.$header = null;
    this.$title = null;
    this.$tools = null;
    this.$body = null;
    this.$inner = null;
    this.$resizer = null;
    this.$refreshBtn = null;
    this.$progress = null;
    this.$progressBar = null;

    // NEW: tooltip toggle state & button
    this._tooltipsEnabled = true;
    this.$tooltipBtn = null;

    this._resizeObserver = null;
    this._innerObserver = null;
    this._themeObserver = null;
    this._autoTimer = null;
    this._autoSeconds = (this.opts.autoRefresh && this.opts.autoRefresh.defaultSeconds) || 0;

    this._progressRAF = null;
    this._progressStartTs = 0;
    this._progressDurationMs = 0;
  }

  Plugin.prototype._bringToFront = function () {
    Z_STACK_NEXT += 1;
    if (this.$wrapper) this.$wrapper.css('z-index', Z_STACK_NEXT);
  };

  /* ======================= Axis resolver ======================= */
  Plugin.prototype._resolveYAxes = function (cfg) {
    var t = normalizeType(cfg.type);
    if (t === 'gauge' || t === 'pie') return undefined;
    if (Array.isArray(cfg.yAxis) && cfg.yAxis.length) return cfg.yAxis;

    if (cfg.axis && typeof cfg.axis === 'object') {
      var keys = Object.keys(cfg.axis);
      if (keys.length) {
        return keys.map(function (k, i) {
          var a = cfg.axis[k] || {};
          return $.extend(true, { title: { text: a.title || null } }, a, { opposite: (i % 2 === 1) });
        });
      }
    }

    var maxIdx = 0;
    if (cfg.series) {
      Object.keys(cfg.series).forEach(function (k) {
        var s = cfg.series[k] || {};
        if (typeof s.yAxis === 'number') maxIdx = Math.max(maxIdx, s.yAxis);
      });
    }
    var count = Math.max(1, maxIdx + 1);
    var axes = [];
    for (var i = 0; i < count; i++) axes.push({ title: { text: null }, opposite: (i % 2 === 1) });
    return axes;
  };

  /* ======================= Series coercion helpers ======================= */
  function coerceSeriesDataForType(type, payload) {
    // accept { data: [...] } or [...] or number (gauge)
    if (!Array.isArray(payload) && typeof payload === 'object' && payload) {
      if (Array.isArray(payload.data)) payload = payload.data;
      else if (payload.series) {
        if (Array.isArray(payload.series) && payload.series.length) {
          var s0 = payload.series[0]; if (s0 && Array.isArray(s0.data)) payload = s0.data;
        } else if (typeof payload.series === 'object') {
          var k0 = Object.keys(payload.series)[0];
          if (k0 && Array.isArray(payload.series[k0].data)) payload = payload.series[k0].data;
        }
      }
    }
    if (type === 'gauge') {
      if (typeof payload === 'number') return [payload];
      if (Array.isArray(payload)) return [Number(payload[0] || 0)];
      return [0];
    }
    return Array.isArray(payload) ? payload : [];
  }

  // ---- UPDATED: returns normalized array of points for the given chart type
  function normalizeSeriesPayload(type, payload) {
    var coerced = coerceSeriesDataForType(normalizeType(type), payload);
    return normalizePointsForType(type, coerced);
  }

  // Build series array from NEW CONFIG on refresh
  Plugin.prototype._seriesFromNewConfig = function (newCfg) {
    var self = this;
    var curCfg = self.config || {};
    var baseType = normalizeType(curCfg.type || 'line');
    var norm = (baseType === 'area3d') ? 'area' : (baseType === 'column3d' ? 'column' : baseType);

    var out = [];
    var curSeries = curCfg.series || {};
    var keys = Object.keys(curSeries);

    function readNewSeriesDataByKey(key) {
      var n = newCfg && newCfg.series;
      if (!n) return undefined;
      if (!Array.isArray(n) && typeof n === 'object') {
        if (n[key] && Array.isArray(n[key].data)) return n[key].data;
        if (Array.isArray(n[key])) return n[key];
        return undefined;
      }
      if (Array.isArray(n)) {
        var byName = n.find(function (s) { return s && (s.name === (curSeries[key].name || key)); });
        if (byName && Array.isArray(byName.data)) return byName.data;
        var idx = keys.indexOf(key);
        if (idx >= 0 && n[idx] && Array.isArray(n[idx].data)) return n[idx].data;
      }
      return undefined;
    }

    keys.forEach(function (key) {
      var sCur = curSeries[key] || {};
      var sType = (baseType === 'area3d') ? 'area' : (baseType === 'column3d' ? 'column' : (baseType === 'pie' ? 'pie' : norm));
      var newData = readNewSeriesDataByKey(key);

      if (typeof newData === 'undefined' && self.chart) {
        var live = self.chart.series.find(function (sr) { return sr.name === (sCur.name || key); });
        if (live) newData = (live.options && live.options.data);
      }

      var normalizedData = normalizeSeriesPayload(norm, newData);
      var built = $.extend(true, {},
        (SERIES_DEFAULTS[baseType] || SERIES_DEFAULTS[norm] || {}),
        sCur.options || {},
        { name: sCur.name || key, type: sType, data: normalizedData }
      );
      if (norm !== 'gauge' && norm !== 'pie' && typeof sCur.yAxis === 'number') built.yAxis = sCur.yAxis;
      out.push(built);
    });

    // Also return possible new yAxis config
    return { series: out, yAxis: Array.isArray(newCfg.yAxis) ? newCfg.yAxis : undefined };
  };

  /* ======================= Options builder ======================= */
  Plugin.prototype._baseOptions = function (cfg) {
    var type = normalizeType(cfg.type);
    var base = deepMerge({}, TYPE_DEFAULTS.common, TYPE_DEFAULTS[type] || {});
    base.chart = deepMerge({}, base.chart, { plotBackgroundColor: 'transparent' });

    var yAxes = this._resolveYAxes(deepMerge({}, base, cfg));
    if (yAxes !== undefined) base.yAxis = yAxes;

    var theme = getActiveTheme();
    var themedOptions = deepMerge({}, theme, base, (cfg.hc || {}));
    themedOptions.title = { text: null }; // title in header

    // Respect instance tooltip enabled state, add HTML image with click-through to full image
    themedOptions.tooltip = deepMerge({}, themedOptions.tooltip, {
      enabled: this._tooltipsEnabled,
      useHTML: true,
      stickOnContact: true,
      hideDelay: 250,
      shared: false,
      formatter: function () {
        const p = this.point;
        const thumbUrl = (p && (p.custom || (p.options && p.options.custom))) || null;

        const dt = Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', this.x);
        let html = `
    <div style="min-width:160px;max-width:260px">
      <div><strong>${this.series.name}</strong></div>
      <div>${dt}</div>
      <div>Value: ${Highcharts.numberFormat(this.y, 2)}</div>
  `;

        if (thumbUrl) {
          // derive full image by stripping "thumbnails/"
          const fullUrl = thumbUrl.replace("thumbnails/", "");
          html += `
      <div style="margin-top:6px">
        <a href="${fullUrl}" target="_blank" rel="noopener">
          <img src="${thumbUrl}" alt="preview" width="200" height="200"
               style="display:block;object-fit:cover;border-radius:4px"/>
        </a>
      </div>
    `;
        }

        html += `</div>`;
        return html;
      }
    });

    if (type === 'pie' && (!cfg.hc || !cfg.hc.tooltip || typeof cfg.hc.tooltip.shared === 'undefined')) {
      themedOptions.tooltip = deepMerge({}, themedOptions.tooltip, { shared: false });
    }
    return themedOptions;
  };

  /* ======================= Build initial series (config + variables) ======================= */
  Plugin.prototype._buildSeries = function (cfg) {
    var self = this;
    var seriesObj = cfg.series || {};
    var keys = Object.keys(seriesObj);
    if (!keys.length) return $.Deferred().resolve([]).promise();

    var rawType = (cfg.type || 'line').toLowerCase();
    var normType = normalizeType(cfg.type);

    var promises = keys.map(function (key) {
      var s = seriesObj[key] || {};
      var dataPromise;

      if ('data' in s) dataPromise = $.Deferred().resolve(s.data).promise();
      else if ('variable' in s) dataPromise = $.when(self.opts.fetchSeriesData(s.variable));
      else dataPromise = $.Deferred().resolve([]).promise();

      return dataPromise.then(function (data) {
        // Normalize points (fix x,y,data meta)
        var normalized = normalizeSeriesPayload(normType, data);

        if (normType === 'gauge') {
          if (isNumber(normalized)) normalized = [normalized];
          if (Array.isArray(normalized) && normalized.length > 1 && isNumber(normalized[0])) normalized = [normalized[0]];
        }
        var yIdx = (normType === 'gauge' || normType === 'pie') ? undefined : (typeof s.yAxis === 'number' ? s.yAxis : 0);
        var seriesType = (rawType === 'area3d') ? 'area' : (rawType === 'column3d') ? 'column' : normType;

        var built = deepMerge(
          {},
          SERIES_DEFAULTS[rawType] || SERIES_DEFAULTS[normType] || {},
          s.options || {},
          { name: s.name || key, type: seriesType, data: normalized }
        );
        if (typeof yIdx !== 'undefined') built.yAxis = yIdx;
        return built;
      });
    });

    return $.when.apply($, promises).then(function () {
      return Array.prototype.slice.call(arguments);
    });
  };

  /* ======================= Error #18 guard (yAxis) ======================= */
  Plugin.prototype._requiredYAxisCount = function (seriesArr, chartType) {
    var t = (chartType || '').toLowerCase();
    if (t === 'gauge' || t === 'pie') return 0;
    var maxIdx = 0;
    (seriesArr || []).forEach(function (s) {
      if (typeof s.yAxis === 'number') maxIdx = Math.max(maxIdx, s.yAxis);
    });
    return (seriesArr && seriesArr.length) ? (maxIdx + 1) : 0;
  };
  Plugin.prototype._ensureYAxisCount = function (need) {
    var chart = this.chart;
    if (!chart || !need || need <= 0) return;
    var have = (chart.yAxis && chart.yAxis.length) ? chart.yAxis.length : 0;
    for (var i = have; i < need; i++) {
      chart.addAxis({ title: { text: null }, opposite: (i % 2 === 1) }, false, false);
    }
  };

  /* ======================= THEME & PROGRESS STYLES ======================= */
  Plugin.prototype._applyTheme = function () {
    var theme = getActiveTheme();
    var bg = (theme.chart && theme.chart.backgroundColor) || '#ffffff';
    var bb = { boxSizing: 'border-box' };

    if (this.$wrapper) {
      this.$wrapper.css($.extend({}, bb, {
        backgroundColor: bg,
        borderColor: (theme.chart && theme.chart.borderColor) || (isDarkMode() ? '#3a3a3a' : '#ddd'),
        boxShadow: isDarkMode() ? '0 2px 10px rgba(0,0,0,.35)' : '0 2px 8px rgba(0,0,0,.15)'
      }));
    }
    if (this.$body) this.$body.css($.extend({}, bb, { backgroundColor: bg }));
    if (this.$inner) this.$inner.css($.extend({}, bb, { backgroundColor: bg }));

    if (this.$progressBar) {
      var color = (theme.colors && theme.colors[0]) || (isDarkMode() ? '#A3EDBA' : '#7cb5ec');
      this.$progressBar.css({ backgroundColor: color });
    }

    if (this.chart) this.chart.update(deepMerge({}, theme), true, true);
  };

  /* ======================= Render / Sizing ======================= */
  Plugin.prototype._sizeToInner = function () {
    if (!this.chart || !this.$inner) return;
    var iw = Math.max(0, Math.floor(this.$inner.width()));
    var ih = Math.max(0, Math.floor(this.$inner.height()));
    if (iw && ih) this.chart.setSize(iw, ih, false);
  };

  Plugin.prototype._render = function (options, rawConfig) {
    var targetEl = this.$inner[0] || this.$host[0];

    if (typeof this.opts.onBeforeRender === 'function') {
      options = this.opts.onBeforeRender(options, rawConfig) || options;
    }

    this._applyTheme();
    this.chart = this.HC.chart(targetEl, options);
    this.$host.data('asHcChart', this.chart);

    this._sizeToInner();
    this.chart.reflow();
    this._applyTheme();
  };

  /* ======================= Config source ======================= */
  Plugin.prototype._getConfig = function () {
    if (this.opts.config && typeof this.opts.config === 'object') {
      return $.Deferred().resolve(this.opts.config).promise();
    }
    var cu = this.opts.configUrl;
    if (typeof cu === 'string') return $.getJSON(cu);
    if (cu && cu.url) return $.ajax($.extend({ method: 'GET', dataType: 'json' }, cu));
    return $.Deferred().reject(new Error('config or configUrl is required')).promise();
  };

  Plugin.prototype._requestConfig = function () {
    var cu = this.opts.configUrl;
    if (!cu) return $.Deferred().reject(new Error('No configUrl set')).promise();

    function withBuster(objOrUrl) {
      var ts = Date.now();
      if (typeof objOrUrl === 'string') {
        var sep = objOrUrl.indexOf('?') === -1 ? '?' : '&';
        return objOrUrl + sep + '_ts=' + ts;
      } else {
        var opts = $.extend(true, {}, objOrUrl);
        opts.data = opts.data || {};
        opts.data._ts = ts;
        return opts;
      }
    }

    if (typeof cu === 'string') return $.getJSON(withBuster(cu));
    var opts = withBuster(cu);
    return $.ajax($.extend({ method: 'GET', dataType: 'json' }, opts));
  };

  /* ======================= Refresh (series-only) ======================= */
  Plugin.prototype.refresh = function () {
    var self = this;
    if (!self.config || !self.chart) return self.init();

    function finish(seriesArr) {
      var chartType = (self.config.type || 'line');
      var need = self._requiredYAxisCount(seriesArr, chartType);
      self._ensureYAxisCount(need);
      self.chart.update({ series: seriesArr }, true, true);
      self._sizeToInner();
      self.chart.reflow();
      self._applyTheme();
      if (self._autoSeconds > 0) self._restartProgress();
      return self.chart;
    }

    if (self.opts.configUrl) {
      return self._requestConfig()
        .then(function (newCfg) {
          var packed = self._seriesFromNewConfig(newCfg);
          // if new yAxis array is provided, update it first to avoid #18
          if (packed.yAxis && Array.isArray(packed.yAxis)) {
            self.chart.update({ yAxis: packed.yAxis }, false, true);
          }
          return finish(packed.series);
        })
        .fail(self.opts.onError);
    }

    return self._buildSeries(self.config).then(finish).fail(self.opts.onError);
  };

  /* ======================= Auto-refresh timer + PROGRESS BAR ======================= */
  Plugin.prototype._startAutoTimer = function () {
    var self = this;
    if (self._autoTimer) window.clearInterval(self._autoTimer);

    if (self._autoSeconds > 0) {
      self._startProgress(self._autoSeconds * 1000);
      self._autoTimer = window.setInterval(function () {
        self._setLoading(true);
        $.when(self.refresh()).always(function () { self._setLoading(false); });
      }, self._autoSeconds * 1000);
    }
  };
  Plugin.prototype.setAutoRefresh = function (seconds) {
    this._autoSeconds = Math.max(0, parseInt(seconds, 10) || 0);
    if (this._autoTimer) { clearInterval(this._autoTimer); this._autoTimer = null; }
    this._stopProgress();
    if (this._autoSeconds > 0) this._startAutoTimer();
  };
  Plugin.prototype._setLoading = function (on) {
    if (!this.$refreshBtn) return;
    this.$refreshBtn.toggleClass('loading', !!on).prop('disabled', !!on).css('opacity', on ? 0.6 : 1);
  };

  // Progress elements: 1px, anchored LEFT, starts full width and shrinks to 0
  Plugin.prototype._ensureProgressEls = function () {
    if (this.$progress && this.$progressBar) return;
    this.$progress = $('<div class="as-hc-progress"></div>').css({
      position: 'absolute', left: 0, right: 0, bottom: 0, height: '1px', pointerEvents: 'none'
    });
    this.$progressBar = $('<div class="as-hc-progress-bar"></div>').css({
      position: 'absolute',
      left: 0, bottom: 0,
      height: '1px', width: '100%', // start full
      backgroundColor: (getActiveTheme().colors && getActiveTheme().colors[0]) || '#7cb5ec',
      transform: 'translateZ(0)'
    });
    this.$progress.append(this.$progressBar);
    this.$header.append(this.$progress);
  };
  Plugin.prototype._startProgress = function (durationMs) {
    this._ensureProgressEls();
    this._progressDurationMs = Math.max(50, durationMs || 1000);
    this._progressStartTs = performance.now();
    this.$progressBar.css({ width: '100%', left: 0 });

    var self = this;
    function tick(ts) {
      var elapsed = ts - self._progressStartTs;
      var pct = Math.min(1, elapsed / self._progressDurationMs);
      var remaining = (1 - pct) * 100; // width shrinks toward left
      self.$progressBar.css('width', remaining + '%');
      if (pct < 1) self._progressRAF = requestAnimationFrame(tick);
      else self._progressRAF = null;
    }
    if (this._progressRAF) cancelAnimationFrame(this._progressRAF);
    this._progressRAF = requestAnimationFrame(tick);
  };
  Plugin.prototype._stopProgress = function () {
    if (this._progressRAF) { cancelAnimationFrame(this._progressRAF); this._progressRAF = null; }
    if (this.$progressBar) this.$progressBar.css('width', '0%');
  };
  Plugin.prototype._restartProgress = function () {
    if (this._autoSeconds > 0) { this._stopProgress(); this._startProgress(this._autoSeconds * 1000); }
  };

  /* ======================= Snap-to-grid ======================= */
  Plugin.prototype._snapPosition = function (left, top) {
    var g = this.opts.grid;
    if (!g || !g.enabled) return { left: left, top: top };
    var gx = Math.max(1, (g.size && g.size.x) || 24);
    var gy = Math.max(1, (g.size && g.size.y) || 24);
    function roundTo(v, s) { return Math.round(v / s) * s; }

    if (g.threshold && g.threshold > 0) {
      var ls = roundTo(left, gx), ts = roundTo(top, gy);
      if (Math.abs(ls - left) <= g.threshold) left = ls;
      if (Math.abs(ts - top) <= g.threshold) top = ts;
      return { left: left, top: top };
    }
    return { left: roundTo(left, gx), top: roundTo(top, gy) };
  };

  /* ======================= Bounds helpers & notifications ======================= */
  Plugin.prototype.getBounds = function () {
    if (!this.$wrapper || !this.$wrapper.length) return null;
    var pos = this.$wrapper.position();
    return {
      top: Math.round(pos.top),
      left: Math.round(pos.left),
      width: Math.round(this.$wrapper.outerWidth()),
      height: Math.round(this.$wrapper.outerHeight()),
      filename: this.filename || null
    };
  };
  Plugin.prototype._boundsPayload = function () {
    var b = this.getBounds();
    if (!b) return null;
    b.title = this.$title ? this.$title.text() : null;
    return b;
  };
  Plugin.prototype._notifyBoundsChange = function () {
    var payload = this._boundsPayload();
    if (!payload) return;
    if (typeof this.opts.onBoundsChange === 'function') {
      try { this.opts.onBoundsChange(payload, this); } catch (e) { }
    }
    this.$host.trigger(this.opts.boundsEventName, [payload, this]);
  };
  Plugin.prototype._notifyDelete = function () {
    var payload = this._boundsPayload() || { filename: this.filename || null };
    if (typeof this.opts.onDelete === 'function') {
      try { this.opts.onDelete(payload, this); } catch (e) { }
    }
    this.$host.trigger(this.opts.deleteEventName, [payload, this]);
  };

  /* ======================= Drag & Resize ======================= */
  Plugin.prototype._bindDrag = function () {
    var self = this;
    var $handle = self.$header;
    var $scope = self.$host;
    var $contain = (self.opts.containment === 'host') ? self.$host
      : (self.opts.containment === 'window') ? $(window)
        : $(self.opts.containment);

    var dragging = false, start = { x: 0, y: 0, left: 0, top: 0 };

    $handle.css('touch-action', 'none')
      .on('selectstart.' + PLUGIN, function (e) {
        if ($(e.target).closest('.as-hc-tools, button, select, input, textarea, a, [contenteditable]').length) return;
        e.preventDefault();
      })
      .on('dragstart.' + PLUGIN, function (e) {
        if ($(e.target).closest('.as-hc-tools, button, select, input, textarea, a, [contenteditable]').length) return;
        e.preventDefault();
      });

    $handle.on('pointerdown.' + PLUGIN, function (e) {
      if ($(e.target).closest('.as-hc-tools, button, select, input, textarea, a, [contenteditable]').length) return;
      if (e.button !== 0 && e.buttons !== 1) return;

      self._bringToFront();
      dragging = true;
      $handle[0].setPointerCapture && $handle[0].setPointerCapture(e.pointerId);

      start.x = e.pageX; start.y = e.pageY;
      start.left = parseFloat(self.$wrapper.css('left')) || 0;
      start.top = parseFloat(self.$wrapper.css('top')) || 0;

      $('html,body').addClass('as-hc-noselect');
      e.preventDefault(); e.stopPropagation();

      $scope.on('pointermove.' + PLUGIN, onMove);
      $scope.on('pointerup.' + PLUGIN, onUp);
    });

    function onMove(e) {
      if (!dragging) return;
      var dx = e.pageX - start.x;
      var dy = e.pageY - start.y;
      var newLeft = start.left + dx;
      var newTop = start.top + dy;

      if ($contain && $contain.length && $contain[0] !== window) {
        var maxLeft = $contain.innerWidth() - self.$wrapper.outerWidth();
        var maxTop = $contain.innerHeight() - self.$wrapper.outerHeight();
        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));
      } else if (self.opts.containment === 'window') {
        var maxLeftW = $(window).width() - self.$wrapper.outerWidth();
        var maxTopW = $(window).height() - self.$wrapper.outerHeight();
        newLeft = Math.max(0, Math.min(newLeft, maxLeftW));
        newTop = Math.max(0, Math.min(newTop, maxTopW));
      }

      if (self.opts.grid && self.opts.grid.enabled && self.opts.grid.snap === 'move') {
        var snap = self._snapPosition(newLeft, newTop);
        newLeft = snap.left; newTop = snap.top;
      }

      self.$wrapper.css({ left: newLeft + 'px', top: newTop + 'px' });
      e.preventDefault();
    }
    function onUp(e) {
      if (!dragging) return;
      dragging = false;
      $('html,body').removeClass('as-hc-noselect');
      $scope.off('pointermove.' + PLUGIN, onMove);
      $scope.off('pointerup.' + PLUGIN, onUp);

      if (self.opts.grid && self.opts.grid.enabled && self.opts.grid.snap !== 'move') {
        var curLeft = parseFloat(self.$wrapper.css('left')) || 0;
        var curTop = parseFloat(self.$wrapper.css('top')) || 0;
        var snap = self._snapPosition(curLeft, curTop);

        if ($contain && $contain.length && $contain[0] !== window) {
          var maxLeft = $contain.innerWidth() - self.$wrapper.outerWidth();
          var maxTop = $contain.innerHeight() - self.$wrapper.outerHeight();
          snap.left = Math.max(0, Math.min(snap.left, maxLeft));
          snap.top = Math.max(0, Math.min(snap.top, maxTop));
        } else if (self.opts.containment === 'window') {
          var maxLeftW = $(window).width() - self.$wrapper.outerWidth();
          var maxTopW = $(window).height() - self.$wrapper.outerHeight();
          snap.left = Math.max(0, Math.min(snap.left, maxLeftW));
          snap.top = Math.max(0, Math.min(snap.top, maxTopW));
        }
        self.$wrapper.css({ left: snap.left + 'px', top: snap.top + 'px' });
      }

      // notify host of new position
      self._notifyBoundsChange();
    }
  };

  Plugin.prototype._bindResize = function () {
    var self = this;
    var minW = self.opts.minSize.width;
    var minH = self.opts.minSize.height;

    var $handle = self.$resizer;
    if (!$handle || !$handle.length) {
      $handle = self.$resizer = $('<div class="as-hc-resize" aria-hidden="true"></div>').appendTo(self.$wrapper);
    }
    $handle.css({
      position: 'absolute', right: '6px', bottom: '6px',
      width: self.opts.resizerSize + 'px', height: self.opts.resizerSize + 'px',
      cursor: 'nwse-resize', zIndex: 2
    });

    var $scope = self.$host;
    var start = { x: 0, y: 0, w: 0, h: 0 }, resizing = false;

    $handle.off('.' + PLUGIN);
    $handle.on('pointerdown.' + PLUGIN, function (e) {
      if (e.button !== 0 && e.buttons !== 1) return;
      resizing = true;
      this.setPointerCapture && this.setPointerCapture(e.pointerId);
      start.x = e.pageX; start.y = e.pageY;
      start.w = self.$wrapper.outerWidth();
      start.h = self.$wrapper.outerHeight();
      $('html,body').addClass('as-hc-noselect');
      e.preventDefault(); e.stopPropagation();
      $scope.on('pointermove.' + PLUGIN, onMove);
      $scope.on('pointerup.' + PLUGIN, onUp);
    });

    function onMove(e) {
      if (!resizing) return;
      var w = Math.max(minW, start.w + (e.pageX - start.x));
      var h = Math.max(minH, start.h + (e.pageY - start.y));
      var maxW = self.$host.innerWidth();
      var maxH = self.$host.innerHeight();
      if (maxW) w = Math.min(w, maxW);
      if (maxH) h = Math.min(h, maxH);
      self.$wrapper.css({ width: w + 'px', height: h + 'px' });

      self._sizeToInner();
      e.preventDefault();
    }
    function onUp(e) {
      if (!resizing) return;
      resizing = false;
      this.releasePointerCapture && this.releasePointerCapture(e.pointerId);
      $('html,body').removeClass('as-hc-noselect');
      $scope.off('pointermove.' + PLUGIN, onMove);
      $scope.off('pointerup.' + PLUGIN, onUp);
      self._sizeToInner();
      if (self.chart) self.chart.reflow();

      // notify host of new size
      self._notifyBoundsChange();
    }
  };

  /* ======================= Destroy ======================= */
  Plugin.prototype.destroy = function () {
    if (this._autoTimer) { clearInterval(this._autoTimer); this._autoTimer = null; }
    this._stopProgress();
    if (this._resizeObserver) { this._resizeObserver.disconnect(); this._resizeObserver = null; }
    if (this._innerObserver) { this._innerObserver.disconnect(); this._innerObserver = null; }
    if (this._themeObserver) { this._themeObserver.disconnect(); this._themeObserver = null; }
    if (this.chart && this.chart.destroy) this.chart.destroy();
    this.chart = null;
    if (this.$wrapper) { this.$wrapper.off('.' + PLUGIN).remove(); this.$wrapper = null; }
    this.$host.removeData('asHcChart');
  };

  /* ======================= Mount layout (accepts initialPos/Size or top/left/width/height) ======================= */
  Plugin.prototype._mountLayout = function (cfg) {
    if (this.$host.css('position') === 'static') this.$host.css('position', 'relative');

    function toNum(v, fallback) {
      if (v === null || typeof v === 'undefined') return fallback;
      var n = Number(v);
      return isFinite(n) ? n : fallback;
    }

    // Prefer explicit top/left if provided, otherwise fall back to initialPos
    var posOpt = (typeof this.opts.top !== 'undefined' || typeof this.opts.left !== 'undefined')
      ? { top: this.opts.top, left: this.opts.left }
      : (this.opts.initialPos || {});

    // Prefer explicit width/height if provided, otherwise fall back to initialSize
    var sizeOpt = (typeof this.opts.width !== 'undefined' || typeof this.opts.height !== 'undefined')
      ? { width: this.opts.width, height: this.opts.height }
      : (this.opts.initialSize || {});

    var havePos = (posOpt && posOpt.top != null && posOpt.left != null);
    var haveSize = (sizeOpt && sizeOpt.width != null && sizeOpt.height != null);

    var countExisting = this.$host.children('.as-hc-wrapper').length;
    var offset = havePos ? 0 : Math.min(countExisting * 24, 120);

    var theme = getActiveTheme();
    var bg = (theme.chart && theme.chart.backgroundColor) || '#ffffff';

    var initTop = havePos
      ? toNum(posOpt.top, this.opts.startPos.top)
      : (this.opts.startPos.top + offset);

    var initLeft = havePos
      ? toNum(posOpt.left, this.opts.startPos.left)
      : (this.opts.startPos.left + offset);

    var initW = haveSize
      ? Math.max(this.opts.minSize.width, toNum(sizeOpt.width, this.opts.minSize.width))
      : Math.max(480, this.opts.minSize.width);

    var initH = haveSize
      ? Math.max(this.opts.minSize.height, toNum(sizeOpt.height, this.opts.minSize.height))
      : Math.max(300, this.opts.minSize.height);

    var hostW = this.$host.innerWidth(), hostH = this.$host.innerHeight();
    if (hostW && hostH) {
      initLeft = Math.max(0, Math.min(initLeft, Math.max(0, hostW - initW)));
      initTop = Math.max(0, Math.min(initTop, Math.max(0, hostH - initH)));
    }

    var bb = { boxSizing: 'border-box' };

    this.$wrapper = $('<div class="as-hc-wrapper"></div>').css($.extend({}, bb, {
      position: 'absolute',
      top: initTop, left: initLeft, width: initW, height: initH,
      display: 'flex', flexDirection: 'column',
      background: bg,
      boxShadow: isDarkMode() ? '0 2px 10px rgba(0,0,0,.35)' : '0 2px 8px rgba(0,0,0,.15)',
      border: '1px solid ' + (isDarkMode() ? '#3a3a3a' : '#ddd'),
      overflow: 'hidden'
    }));
    this.$wrapper.on('pointerdown', (e) => {
      if ($(e.target).closest('.as-hc-tools, button, select, input, textarea, a, [contenteditable]').length) return;
      this._bringToFront();
    });

    this.$header = $('<div class="as-hc-header"></div>').css($.extend({}, bb, {
      position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '6px 8px', gap: '8px', userSelect: 'none', cursor: 'move'
    }));
    var titleText = this.opts.headerTitle != null ? this.opts.headerTitle : (cfg && cfg.title) || '';
    this.$title = $('<div class="as-hc-title"></div>').text(titleText).css({
      fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '8px'
    });
    this.$tools = $('<div class="as-hc-tools"></div>').css({ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'default' });

    if (this.opts.showToolbar && this.opts.showRefreshButton) {

      this.$refreshBtn = $('<button>', {
        type: 'button',
        class: 'as-hc-btn as-hc-refresh-btn',
        title: (this.opts.refreshLabel || 'Refresh')
      })
        .append($('<i>', { class: 'fa fa-refresh', 'aria-hidden': 'true' }))
        .css({ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 8px', cursor: 'pointer' })
        .on('click', (e) => {
          e.preventDefault(); e.stopPropagation();
          this._setLoading(true);
          $.when(this.refresh()).always(() => { this._setLoading(false); });
        });
      this.$tools.append(this.$refreshBtn);
    }

    if (this.opts.showToolbar && this.opts.autoRefresh && this.opts.autoRefresh.enabled) {
      var options = this.opts.autoRefresh.options || [0, 10, 20, 30, 60, 120];
      var $sel = $('<select class="as-hc-autorefresh" title="Auto refresh interval"></select>')
        .css({ padding: '3px 6px' });
      options.forEach((sec) => {
        var label = sec === 0 ? 'None' : (sec + 's');
        var $opt = $('<option></option>').val(String(sec)).text(label);
        if (sec === this._autoSeconds) $opt.attr('selected', 'selected');
        $sel.append($opt);
      });
      $sel.on('click', (e) => e.stopPropagation());
      $sel.on('change', () => {
        var secs = parseInt($sel.val(), 10) || 0;
        this.setAutoRefresh(secs);
      });
      this.$tools.append($sel);
    }


    if (this.opts.tooltipToggle && this.opts.tooltipToggle.show) {
      this._tooltipsEnabled = (this.chart ? this.chart.options.tooltip.enabled !== false : true);
      var label = this._tooltipsEnabled ? (this.opts.tooltipToggle.labelOn || 'On')
        : (this.opts.tooltipToggle.labelOff || 'Off');

      this.$tooltipBtn = $('<button>', {
        type: 'button',
        class: 'as-hc-btn as-hc-tooltips-btn',
        title: 'Toggle tooltips'
      })
        .append($('<i>', { class: 'fa fa-comment', 'aria-hidden': 'true' }))
        .append($('<span>').text(label))
        .css({ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 8px', cursor: 'pointer' })
        .on('click', (e) => {
          e.preventDefault(); e.stopPropagation();
          this._tooltipsEnabled = !this._tooltipsEnabled;
          if (this.chart) {
            this.chart.update({ tooltip: { enabled: this._tooltipsEnabled } }, false);
            this.chart.redraw(false);
          }
          this.$tooltipBtn.find('span').text(this._tooltipsEnabled
            ? (this.opts.tooltipToggle.labelOn || 'On')
            : (this.opts.tooltipToggle.labelOff || 'Off'));
        });

      this.$tools.append(this.$tooltipBtn);
    }

    var $btnDelete = $('<button>', {
      type: 'button',
      class: 'as-hc-btn as-hc-delete-btn',
      title: (this.opts.deleteLabel || 'Delete')
    })
      .append($('<i>', { class: 'fa fa-trash', 'aria-hidden': 'true' }))
      .css({ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 8px', cursor: 'pointer' })
      .on('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        if (!this.opts.confirmDelete || window.confirm('Remove this chart?')) {
          this._notifyDelete();
          this.destroy();
          var list = this.$host.data(INST_KEY) || [];
          this.$host.data(INST_KEY, list.filter((i) => i !== this));
        }
      });
    this.$tools.append($btnDelete);

    this.$header.append(this.$title, this.$tools);

    // progress elements
    this._ensureProgressEls();

    // Body (relative) + inner (absolute fill)
    this.$body = $('<div class="as-hc-body"></div>').css($.extend({}, bb, {
      position: 'relative', backgroundColor: bg, flex: '1 1 auto', minHeight: 0, overflow: 'hidden'
    }));
    this.$inner = $('<div class="as-hc-inner"></div>').css($.extend({}, bb, {
      position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, width: '100%', height: '100%', overflow: 'hidden'
    }));
    this.$body.append(this.$inner);

    // single resizer handle
    this.$resizer = $('<div class="as-hc-resize" aria-hidden="true"></div>').css({
      position: 'absolute', right: '6px', bottom: '6px',
      width: this.opts.resizerSize + 'px', height: this.opts.resizerSize + 'px',
      cursor: 'nwse-resize', zIndex: 2
    });

    this.$wrapper.append(this.$header, this.$body, this.$resizer);
    this.$host.append(this.$wrapper);

    // Interactions
    this._bringToFront();
    this._bindDrag();
    this._bindResize();

    // Observe wrapper resizes
    if (typeof ResizeObserver !== 'undefined') {
      var el = this.$wrapper[0];
      this._resizeObserver = new ResizeObserver(() => { this._sizeToInner(); });
      this._resizeObserver.observe(el);
    }
    // Observe inner size (the actual chart box)
    if (typeof ResizeObserver !== 'undefined') {
      var innerEl = this.$inner[0];
      this._innerObserver = new ResizeObserver(() => { this._sizeToInner(); });
      this._innerObserver.observe(innerEl);
    }

    // Theme switching on body class change
    if (typeof MutationObserver !== 'undefined') {
      this._themeObserver = new MutationObserver((muts) => {
        for (var i = 0; i < muts.length; i++) {
          if (muts[i].attributeName === 'class') { this._applyTheme(); this._sizeToInner(); break; }
        }
      });
      this._themeObserver.observe(document.body, { attributes: true });
    }

    if (this._autoSeconds > 0) this._startAutoTimer();
  };

  /* ======================= Init ======================= */
  Plugin.prototype.init = function () {
    if (!this.$wrapper) this._mountLayout({ title: this.opts.headerTitle || 'Loading…' });
    this._setLoading(true);

    return this._getConfig()
      .then((cfg) => {
        this.config = cfg;
        if ('main' in cfg) cfg.main = boolish(cfg.main);

        // NEW: initialize tooltip enabled state from config (defaults to true)
        var cfgTooltipEnabled = true;
        if (cfg && cfg.hc && cfg.hc.tooltip && typeof cfg.hc.tooltip.enabled !== 'undefined') {
          cfgTooltipEnabled = !!cfg.hc.tooltip.enabled;
        } else if (cfg && cfg.tooltip && typeof cfg.tooltip.enabled !== 'undefined') {
          cfgTooltipEnabled = !!cfg.tooltip.enabled;
        }
        this._tooltipsEnabled = cfgTooltipEnabled;

        var t = this.opts.headerTitle != null ? this.opts.headerTitle : (cfg && cfg.title) || '';
        this.$title && this.$title.text(t);

        var options = this._baseOptions(cfg);
        return this._buildSeries(cfg).then((seriesArr) => {
          // Ensure yAxes are enough before first render (avoid #18)
          var need = this._requiredYAxisCount(seriesArr, cfg.type || 'line');
          if (Array.isArray(options.yAxis)) {
            // ok — config already set
          } else if (need > 0) {
            options.yAxis = [];
            for (var i = 0; i < need; i++) options.yAxis.push({ title: { text: null }, opposite: (i % 2 === 1) });
          }
          options.series = seriesArr;
          this._render(options, cfg);
          return this.chart;
        });
      })
      .fail(this.opts.onError)
      .always(() => {
        this._setLoading(false);
        // Inform initial bounds
        this._notifyBoundsChange();
      });
  };

  /* ======================= jQuery bridge ======================= */
  $.fn[PLUGIN] = function (optionOrMethod) {
    var args = Array.prototype.slice.call(arguments, 1);
    var ret;

    // Convenience: fetch all bounds across matched hosts
    if (optionOrMethod === 'getAllBounds') {
      var results = [];
      this.each(function () {
        var instances = $(this).data(INST_KEY) || [];
        instances.forEach(function (inst, i) {
          var b = inst._boundsPayload && inst._boundsPayload();
          if (b) {
            results.push({
              host: this,
              index: i,
              title: b.title,
              top: b.top, left: b.left, width: b.width, height: b.height,
              filename: b.filename
            });
          }
        }, this);
      });
      return results;
    }

    this.each(function () {
      var $el = $(this);
      var instances = $el.data(INST_KEY);
      if (!instances) { instances = []; $el.data(INST_KEY, instances); }

      if (typeof optionOrMethod === 'string') {
        instances.slice().forEach(function (inst) {
          if (typeof inst[optionOrMethod] !== 'function') throw new Error(PLUGIN + ': unknown method ' + optionOrMethod);
          ret = inst[optionOrMethod].apply(inst, args);
        });
      } else {
        var inst = new Plugin(this, optionOrMethod || {});
        instances.push(inst);
        ret = inst.init();
      }
    });

    return ret !== undefined ? ret : this;
  };

})(jQuery);