/*!
 * allskyChart — draggable/resizable Highcharts cards with toolbar + THEMES + series-only refresh
 * - Theme aware (auto switches using body.dark via MutationObserver)
 * - Auto-refresh progress indicator (1px shrinking bar)
 * - Emits events on move/resize (boundschange) and delete (deleted)
 * - Supports multiple chart types (line/column/3D/gauge/area3d/pie/yesno)
 * - Depends on: jQuery, Highcharts (+ highcharts-more, highcharts-3d, optional no-data-to-display)
 */
(function ($) {
  'use strict';

  var PLUGIN = 'allskyChart';
  var INST_KEY = PLUGIN + '_instances';
  var Z_STACK_NEXT = 1000; // for bringing active cards to front

  /* ======================= THEMES =======================
   * Two Highcharts theme presets. Active theme is tied to `body.dark`.
   */
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
      series: { dataLabels: { color: '#46465C', style: { fontSize: '13px' } }, marker: { lineColor: '#fff' } },
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

  /* ======================= Helpers =======================
   * Small utilities for deep merge, type normalization, and data coercion.
   */
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
    if (s === 'indicator' || s === 'boolean') s = 'yesno'; // alias to yes/no indicator
    return s;
  }

  function boolish(v) { return (typeof v === 'string') ? v.toLowerCase() === 'true' : !!v; }
  function isNumber(x) { return typeof x === 'number' && !isNaN(x); }

  // Convert ISO date strings to numeric timestamps for Highcharts
  function toNumericX(x) {
    if (typeof x === 'number') return x;
    if (typeof x === 'string') {
      var t = Date.parse(x);
      return isNaN(t) ? x : t;
    }
    return x;
  }

  // Normalize a *series data array* based on chart type expectations
  function normalizePointsForType(type, data) {
    var t = normalizeType(type);
    if (t === 'gauge') { // gauge takes a single numeric value
      if (isNumber(data)) return [data];
      if (Array.isArray(data)) {
        var n = Number(data[0]);
        return [isNaN(n) ? 0 : n];
      }
      return [0];
    }
    if (t === 'yesno') { // boolean-ish => 0/1
      var v = 0;
      if (typeof data === 'boolean') v = data ? 1 : 0;
      else if (isNumber(data)) v = data ? 1 : 0;
      else if (typeof data === 'string') v = data.trim().length ? 1 : 0;
      else if (Array.isArray(data) && data.length) {
        var cell = data[0];
        v = (typeof cell === 'boolean') ? (cell ? 1 : 0)
          : (isNumber(cell)) ? (cell ? 1 : 0)
          : (typeof cell === 'string') ? (cell.trim().length ? 1 : 0)
          : 0;
      }
      return [v];
    }
    var isPie = (t === 'pie');
    if (!Array.isArray(data)) return [];
    return data.map(function (pt) {
      if (typeof pt === 'number') return pt;                    // y
      if (Array.isArray(pt)) {                                  // [x,y] or [name,value] for pie
        if (isPie) {
          var pname = (pt[0] != null) ? String(pt[0]) : '';
          return [pname, pt[1]];
        }
        return [toNumericX(pt[0]), pt[1]];
      }
      if (pt && typeof pt === 'object') {                       // point object
        var out = {};
        if (isPie) {
          if (typeof pt.name !== 'undefined') out.name = pt.name;
          else if (typeof pt.x === 'string') out.name = pt.x;
          if (typeof pt.y !== 'undefined') out.y = pt.y;
        } else {
          if (typeof pt.x !== 'undefined') out.x = toNumericX(pt.x);
          if (typeof pt.y !== 'undefined') out.y = pt.y;
        }
        // keep custom payload (used for thumbnails in tooltip)
        if (typeof pt.custom !== 'undefined') out.custom = pt.custom;
        else if (typeof pt.data !== 'undefined') out.custom = pt.data;
        ['color', 'id', 'selected', 'sliced', 'marker', 'dataLabels', 'name'].forEach(function (k) {
          if (typeof pt[k] !== 'undefined' && typeof out[k] === 'undefined') out[k] = pt[k];
        });
        return out;
      }
      return pt;
    });
  }

  /* ======================= Defaults =======================
   * High-level per-type defaults layered over a common base.
   */
  var TYPE_DEFAULTS = {
    common: {
      title: { text: null },
      credits: { enabled: false },
      legend: { enabled: true },
      xAxis: { title: { text: null } },
      tooltip: { shared: true },
      plotOptions: { series: { turboThreshold: 0, marker: { enabled: false } } }
    },
    spline: {
      chart: { type: 'spline', zooming: { type: 'x' } },
      xAxis: { type: 'datetime', dateTimeLabelFormats: { day: '%Y-%m-%d', hour: '%H:%M' } },
      lang: { noData: 'No data available' },
      noData: { style: { fontWeight: 'bold', fontSize: '16px', color: '#666' } }
    },
    line: {
      chart: { type: 'spline', zooming: { type: 'x' } },
      xAxis: { type: 'datetime', dateTimeLabelFormats: { day: '%Y-%m-%d', hour: '%H:%M' } },
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
        options3d: { enabled: true, alpha: 10, beta: 15, depth: 50, viewDistance: 25,
          frame: {
            bottom: { size: 1, color: 'rgba(0,0,0,0.05)' },
            back:   { size: 1, color: 'rgba(0,0,0,0.03)' },
            side:   { size: 1, color: 'rgba(0,0,0,0.03)' }
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
        options3d: { enabled: true, alpha: 15, beta: 15, depth: 70, viewDistance: 25,
          frame: {
            bottom: { size: 1, color: 'rgba(0,0,0,0.05)' },
            back:   { size: 1, color: 'rgba(0,0,0,0.03)' },
            side:   { size: 1, color: 'rgba(0,0,0,0.03)' }
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
    },
    yesno: {
      chart: { type: 'line' },
      legend: { enabled: false },
      xAxis: { visible: false },
      yAxis: { visible: false },
      tooltip: { enabled: false },
      plotOptions: { series: { enableMouseTracking: false } }
    }
  };

  // Per-type series defaults layered on top of TYPE_DEFAULTS
  var SERIES_DEFAULTS = {
    line: {}, column: {}, column3d: {},
    gauge: {
      tooltip: { valueSuffix: ' %' },
      dataLabels: { format: '{y} %', borderWidth: 0, style: { textOutline: 'none', fontSize: '14px', color: '#ffffff' } },
      dial: { radius: '80%', backgroundColor: '#666', baseWidth: 16, baseLength: '0%', rearLength: '0%' },
      pivot: { backgroundColor: '#666', radius: 8 }
    },
    area3d: {}, pie: {}, yesno: {}
  };

  /* ======================= Public defaults =======================
   * Plugin options (geometry, behavior, toolbar, grid, notifications, etc.)
   */
  var defaults = {
    // Config source
    config: null,              // direct config object
    configUrl: null,           // URL or $.ajax options for GET
    configAjax: null,          // $.ajax options for POST (preferred when using body payloads)

    // Metadata
    filename: null,

    // Data resolver (used when cfg.series entries reference variables)
    fetchSeriesData: function (variable) {
      return $.Deferred().reject(new Error('fetchSeriesData not implemented for ' + variable)).promise();
    },

    highcharts: window.Highcharts,
    onBeforeRender: null,
    onError: function (err) { if (console) console.error(err); },

    // Initial geometry (position/size)
    initialPos: null,            // { top, left }
    initialSize: null,           // { width, height }
    top: undefined,
    left: undefined,
    width: undefined,
    height: undefined,

    // Fallbacks / layout
    headerTitle: null,
    containment: 'host',
    startPos: { top: 20, left: 20 },
    minSize: { width: 320, height: 220 },
    resizerSize: 15,

    // Interactions
    enableDrag: true,
    enableResize: true,

    // Toolbar
    showToolbar: true,
    showRefreshButton: true,
    refreshLabel: 'Refresh',
    showDeleteButton: true,
    deleteLabel: 'Delete',
    confirmDelete: true,

    // Tooltip toggle
    showTooltipToggle: true,

    // Auto refresh
    autoRefresh: { enabled: true, options: [0, 10, 20, 30, 60, 120], defaultSeconds: 0 },

    // Grid snap
    grid: { enabled: false, size: { x: 24, y: 24 }, snap: 'end', threshold: 0 },

    // Notifications to host
    onBoundsChange: null,
    boundsEventName: 'asHc.boundschange',
    onDelete: null,
    deleteEventName: 'asHc.deleted',

    // Resize/fill parent containers
    resizeParentHeight: false,
    fitParentWidth: false,
    resizeParentWidth: false // legacy alias
  };

  /* ======================= Constructor =======================
   * Initializes instance state and extracts POST body when configAjax is used.
   */
  function Plugin(el, options) {
    this.$host = $(el);
    this.opts = $.extend(true, {}, defaults, options || {});
    this.HC = this.opts.highcharts;

    this.config = null;  // last fetched chart config
    this.chart = null;   // Highcharts instance
    this.filename = this.opts.filename || null;

    // DOM refs
    this.$wrapper = null;
    this.$header = null;
    this.$title = null;
    this.$tools = null;
    this.$body = null;
    this.$inner = null;
    this.$resizer = null;
    this.$refreshBtn = null;
    this.$tooltipBtn = null;
    this.$progress = null;
    this.$progressBar = null;

    // Observers/timers/state
    this._resizeObserver = null;
    this._innerObserver = null;
    this._themeObserver = null;
    this._autoTimer = null;
    this._autoSeconds = (this.opts.autoRefresh && this.opts.autoRefresh.defaultSeconds) || 0;

    this._progressRAF = null;
    this._progressStartTs = 0;
    this._progressDurationMs = 0;

    this._tooltipsEnabled = true;

    this._drag3d = { active: false, startX: 0, startY: 0, startAlpha: 0, startBeta: 0 };
    this._yesnoLabel = null;
    this._uid = Math.random().toString(36).slice(2);

    // If configAjax is supplied, keep a parsed copy of the body so we can mutate it (time range, etc.)
    this._graphPostBody = null;
    if (this.opts.configAjax && typeof this.opts.configAjax === 'object') {
      if (this.opts.configAjax.method) {
        this.opts.configAjax.method = String(this.opts.configAjax.method).toUpperCase();
      }
      if (this.opts.configAjax.data && typeof this.opts.configAjax.data === 'string') {
        try { this._graphPostBody = JSON.parse(this.opts.configAjax.data); } catch (_e) { this._graphPostBody = null; }
      } else if (this.opts.configAjax.data && typeof this.opts.configAjax.data === 'object') {
        this._graphPostBody = $.extend(true, {}, this.opts.configAjax.data);
      }
    }
  }

  // Top-most z-index for active card
  Plugin.prototype._bringToFront = function () {
    Z_STACK_NEXT += 1;
    if (this.$wrapper) this.$wrapper.css('z-index', Z_STACK_NEXT);
  };

  /* ======================= Axis resolver =======================
   * Builds yAxis array when cfg doesn't define it explicitly.
   * - Skips for gauge/pie/yesno (no y-axes)
   * - Uses cfg.axis keyed map if present
   * - Otherwise, ensures enough axes to satisfy series[].yAxis indices
   */
  Plugin.prototype._resolveYAxes = function (cfg) {
    var t = normalizeType(cfg.type);
    if (t === 'gauge' || t === 'pie' || t === 'yesno') return undefined;
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

  /* ======================= Series helpers =======================
   * Convert incoming series payloads into Highcharts-ready arrays/objects.
   */
  // Extracts the array-like data for the series, regardless of input shape
  function coerceSeriesDataForType(type, payload) {
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
    var t = normalizeType(type);
    if (t === 'gauge' || t === 'yesno') {
      if (typeof payload === 'boolean' || typeof payload === 'number' || typeof payload === 'string') return [payload];
      if (Array.isArray(payload)) return [payload[0]];
      return [0];
    }
    return Array.isArray(payload) ? payload : [];
  }
  function normalizeSeriesPayload(type, payload) {
    var coerced = coerceSeriesDataForType(normalizeType(type), payload);
    return normalizePointsForType(type, coerced);
  }

  /**
   * Build Highcharts series[] from cfg.series (array or object map).
   * - Supports data inline, or deferred via fetchSeriesData(variable).
   * - Handles special types (gauge/yesno) normalization.
   */
  Plugin.prototype._buildSeries = function (cfg) {
    var self = this;

    var rawType = (cfg.type || 'line').toLowerCase();
    var normType = normalizeType(cfg.type);
    var resolvedChartSeriesType =
      rawType === 'area3d' ? 'area' :
      rawType === 'column3d' ? 'column' :
      rawType;

    // Array form: [{ name, data, ... }, ...]
    if (Array.isArray(cfg.series)) {
      var arr = cfg.series.map(function (s, i) {
        var data = Array.isArray(s.data) ? s.data : [];
        var normalized = normalizeSeriesPayload(normType, data);

        var built = deepMerge(
          {},
          SERIES_DEFAULTS[rawType] || SERIES_DEFAULTS[normType] || {},
          s.options || {},
          {
            name: s.name || ('Series ' + (i + 1)),
            type: (normType === 'yesno') ? 'line' : (s.type || resolvedChartSeriesType),
            data: normalized
          }
        );

        if (typeof s.yAxis === 'number' && normType !== 'gauge' && normType !== 'pie' && normType !== 'yesno') built.yAxis = s.yAxis;
        return built;
      });

      return $.Deferred().resolve(arr).promise();
    }

    // Object form: { key: { name, data|variable, options } }
    var seriesObj = cfg.series || {};
    var keys = Object.keys(seriesObj);
    if (!keys.length) {
      return $.Deferred().resolve([]).promise();
    }

    // Each key can fetch its own data (inline or via variable)
    var promises = keys.map(function (key) {
      var s = seriesObj[key] || {};
      var dataPromise;

      if ('data' in s) dataPromise = $.Deferred().resolve(s.data).promise();
      else if ('variable' in s) dataPromise = $.when(self.opts.fetchSeriesData(s.variable));
      else dataPromise = $.Deferred().resolve([]).promise();

      return dataPromise.then(function (data) {
        var normalized = normalizeSeriesPayload(normType, data);
        if (normType === 'gauge') {
          if (typeof normalized === 'number') normalized = [normalized];
          if (Array.isArray(normalized) && normalized.length > 1 && typeof normalized[0] === 'number') normalized = [normalized[0]];
        }
        if (normType === 'yesno') {
          normalized = (Array.isArray(normalized) && normalized.length) ? [normalized[0] ? 1 : 0] : [0];
        }

        var built = deepMerge(
          {},
          SERIES_DEFAULTS[rawType] || SERIES_DEFAULTS[normType] || {},
          s.options || {},
          {
            name: s.name || key,
            type: (normType === 'yesno') ? 'line' : resolvedChartSeriesType,
            data: normalized
          }
        );
        if (normType !== 'gauge' && normType !== 'pie' && normType !== 'yesno' && typeof s.yAxis === 'number') built.yAxis = s.yAxis;
        return built;
      });
    });

    // Collect results preserving promise arity
    return $.when.apply($, promises).then(function () {
      var out = Array.prototype.slice.call(arguments);
      if (promises.length === 1 && out.length && !out[0]) out = [arguments];
      return out;
    });
  };

  /* ======================= yAxis guard =======================
   * Ensures chart has enough yAxis entries to cover series[].yAxis indices.
   */
  Plugin.prototype._requiredYAxisCount = function (seriesArr, chartType) {
    var t = (chartType || '').toLowerCase();
    if (t === 'gauge' || t === 'pie' || t === 'yesno') return 0;
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

  /* ======================= THEME & PROGRESS STYLES =======================
   * Applies theme to the surrounding card and the Highcharts instance.
   */
  Plugin.prototype._applyTheme = function () {
    var theme = getActiveTheme();
    var bg = (theme.chart && theme.chart.backgroundColor) || '#ffffff';
    var bb = { boxSizing: 'border-box' };

    // Card container styling
    if (this.$wrapper) {
      this.$wrapper.css($.extend({}, bb, {
        backgroundColor: bg,
        borderColor: (theme.chart && theme.chart.borderColor) || (isDarkMode() ? '#3a3a3a' : '#ddd'),
        boxShadow: isDarkMode() ? '0 2px 10px rgba(0,0,0,.35)' : '0 2px 8px rgba(0,0,0,.15)'
      }));
    }
    if (this.$body) this.$body.css($.extend({}, bb, { backgroundColor: bg }));
    if (this.$inner) this.$inner.css($.extend({}, bb, { backgroundColor: bg }));

    // Progress bar color tracks theme
    if (this.$progressBar) {
      var color = (theme.colors && theme.colors[0]) || (isDarkMode() ? '#A3EDBA' : '#7cb5ec');
      this.$progressBar.css({ backgroundColor: color });
    }

    // Update Highcharts with theme (avoid overriding axes/series wholesale)
    if (this.chart) {
      var safe = $.extend(true, {}, theme);
      delete safe.yAxis; delete safe.xAxis; delete safe.series;
      this.chart.update(safe, false, false);

      var xa = theme.xAxis || {};
      var ya = theme.yAxis || {};

      if (this.chart.xAxis && this.chart.xAxis.length) {
        for (var i = 0; i < this.chart.xAxis.length; i++) {
          this.chart.xAxis[i].update({
            gridLineColor: xa.gridLineColor,
            lineColor: xa.lineColor,
            tickColor: xa.tickColor,
            labels: xa.labels,
            title: xa.title
          }, false);
        }
      }
      if (this.chart.yAxis && this.chart.yAxis.length) {
        for (var j = 0; j < this.chart.yAxis.length; j++) {
          this.chart.yAxis[j].update({
            gridLineColor: ya.gridLineColor,
            lineColor: ya.lineColor,
            tickColor: ya.tickColor,
            tickWidth: ya.tickWidth,
            labels: ya.labels,
            title: ya.title
          }, false);
        }
      }
      this.chart.redraw(false);
    }

    this._resizeParentToChart();
  };

  /* ======================= Tooltip (HTML with image) =======================
   * Custom formatter showing series name, datetime, value and optional thumbnail.
   * Uses point.custom (or options.custom) to pass thumbnail URLs.
   */
  function buildTooltipFormatter() {
    return function () {
      var p = this.point;
      var thumbUrl = (p && (p.custom || (p.options && p.options.custom))) || null;
      var dt = (typeof this.x === 'number')
        ? Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', this.x)
        : this.x;

      var html = '<div style="min-width:160px;max-width:260px">';
      html += '<div><strong>' + this.series.name + '</strong></div>';
      if (dt != null) html += '<div>' + dt + '</div>';
      if (typeof this.y !== 'undefined') html += '<div>Value: ' + Highcharts.numberFormat(this.y, 2) + '</div>';

      if (thumbUrl) {
        var fullUrl = String(thumbUrl).replace('thumbnails/', '');
        html += '' +
          '<div style="margin-top:6px">' +
          '  <a href="' + fullUrl + '" target="_blank" rel="noopener">' +
          '    <img src="' + thumbUrl + '" alt="preview" width="100" height="100" ' +
          '         style="display:block;object-fit:cover;border-radius:4px"/>' +
          '  </a>' +
          '</div>';
      }
      html += '</div>';
      return html;
    };
  }

  /* ======================= Options builder =======================
   * Merge theme + type defaults + cfg.hc and set tooltip behavior.
   */
  Plugin.prototype._baseOptions = function (cfg) {
    var type = normalizeType(cfg.type);
    var base = deepMerge({}, TYPE_DEFAULTS.common, TYPE_DEFAULTS[type] || {});
    base.chart = deepMerge({}, base.chart, { plotBackgroundColor: 'transparent' });

    // Let resolver create yAxis if not fixed by type (undefined => keep caller's)
    var yAxes = this._resolveYAxes(deepMerge({}, base, cfg));
    if (yAxes !== undefined) base.yAxis = yAxes;

    var theme = getActiveTheme();
    var themedOptions = deepMerge({}, theme, base, (cfg.hc || {}));
    themedOptions.title = { text: null };

    // HTML tooltip with formatter + toggle support
    themedOptions.tooltip = deepMerge({}, themedOptions.tooltip, {
      enabled: this._tooltipsEnabled,
      useHTML: true,
      stickOnContact: true,
      hideDelay: 250,
      shared: false,
      formatter: buildTooltipFormatter()
    });

    // For pies, tooltips are not shared by default
    if (type === 'pie' && (!cfg.hc || !cfg.hc.tooltip || typeof cfg.hc.tooltip.shared === 'undefined')) {
      themedOptions.tooltip = deepMerge({}, themedOptions.tooltip, { shared: false });
    }
    // For yes/no indicator, remove legend/tooltip noise
    if (type === 'yesno') {
      themedOptions.tooltip = { enabled: false };
      themedOptions.legend = { enabled: false };
    }
    return themedOptions;
  };

  /* ======================= Parent height sync =======================
   * Optionally set the parent container height to the card height.
   */
  Plugin.prototype._resizeParentToChart = function () {
    var opt = this.opts && this.opts.resizeParentHeight;
    if (!opt) return;

    var $target;
    if (opt === true) {
      $target = this.$host.parent();
    } else if (typeof opt === 'object' && opt.selector) {
      $target = this.$host.closest(opt.selector);
      if (!$target.length) $target = this.$host.parent();
    } else {
      $target = this.$host.parent();
    }
    if (!$target || !$target.length) return;

    var h = this.$wrapper ? this.$wrapper.outerHeight(true) : this.$host.outerHeight(true);

    if (opt && typeof opt === 'object') {
      if (typeof opt.min === 'number') h = Math.max(opt.min, h);
      if (typeof opt.max === 'number') h = Math.min(opt.max, h);
    }

    if (this._rphRAF) cancelAnimationFrame(this._rphRAF);
    var self = this;
    this._rphRAF = requestAnimationFrame(function () {
      $target.css('height', h + 'px');
      self._rphRAF = null;
    });
  };

  /* ======================= Fit parent width =======================
   * Optionally make card stretch to parent width (useful in grid layouts).
   */
  function _resolveTarget($host, opt) {
    if (opt === true) return $host;
    if (typeof opt === 'object' && opt.selector) {
      var $t = $host.closest(opt.selector);
      return $t.length ? $t : $host;
    }
    return $host;
  }
  Plugin.prototype._getFitWidthOpt = function () {
    return (this.opts.fitParentWidth !== false ? this.opts.fitParentWidth : this.opts.resizeParentWidth);
  };
  Plugin.prototype._fitToParentWidth = function () {
    var opt = this._getFitWidthOpt();
    if (!opt || !this.$wrapper) return;

    if (typeof opt === 'object' && opt.selector) {
      var $t = _resolveTarget(this.$host, opt);
      if ($t && $t.length) {
        var w = $t.innerWidth();
        if (typeof opt.offset === 'number') w = Math.max(0, w - opt.offset);
        if (typeof opt.min === 'number') w = Math.max(opt.min, w);
        if (typeof opt.max === 'number') w = Math.min(opt.max, w);
        this.$wrapper.css({ left: 0, right: 'auto', width: w + 'px' });
        return;
      }
    }
    this.$wrapper.css({ left: 0, right: 0, width: 'auto' });
  };

  /* ======================= Yes/No indicator helpers =======================
   * Renders a centered label with configurable colors/text based on truthiness.
   */
  Plugin.prototype._computeYesNo = function () {
    var cfg = this.config || {};
    var yesNoOpts = (cfg.hc && cfg.hc.yesNo) || {};
    var series = (cfg.series && cfg.series[0]) || {};
    var v = 0;

    if (this.chart && this.chart.series && this.chart.series.length && this.chart.series[0].points.length) {
      v = this.chart.series[0].points[0].y ? 1 : 0;
    } else if (Array.isArray(series.data) && series.data.length) {
      var cell = series.data[0];
      v = (typeof cell === 'boolean') ? (cell ? 1 : 0)
        : (isNumber(cell)) ? (cell ? 1 : 0)
        : (typeof cell === 'string') ? (cell.trim().length ? 1 : 0)
        : (Array.isArray(cell) ? (cell[1] ? 1 : 0) : 0);
    }

    var theme = getActiveTheme();
    var defaultYes = (theme.colors && theme.colors[0]) || '#2ecc71';
    var defaultNo  = '#DF5353';

    return {
      truthy: !!v,
      text: (!!v) ? (yesNoOpts.trueText || 'Yes') : (yesNoOpts.falseText || 'No'),
      color: (!!v) ? (yesNoOpts.trueColor || defaultYes) : (yesNoOpts.falseColor || defaultNo),
      fontSize: yesNoOpts.fontSize || '48px'
    };
  };
  Plugin.prototype._updateYesNoLabel = function () {
    if (!this.chart || !this.config || normalizeType(this.config.type) !== 'yesno') return;

    var meta = this._computeYesNo();
    var r = this.chart.renderer;
    var cx = this.chart.plotLeft + (this.chart.plotWidth / 2);
    var cy = this.chart.plotTop + (this.chart.plotHeight / 2);

    if (!this._yesnoLabel) {
      this._yesnoLabel = r.text(meta.text, cx, cy)
        .css({ color: meta.color, fontSize: meta.fontSize, fontWeight: '700', textOutline: 'none' })
        .attr({ align: 'center' })
        .add();
    } else {
      this._yesnoLabel.attr({ x: cx, y: cy, text: meta.text }).css({ color: meta.color, fontSize: meta.fontSize });
    }
  };

  /* ======================= Render / Sizing =======================
   * Create/size the Highcharts instance within the card.
   */
  Plugin.prototype._sizeToInner = function () {
    if (!this.chart || !this.$inner) return;
    var iw = Math.max(0, Math.floor(this.$inner.width()));
    var ih = Math.max(0, Math.floor(this.$inner.height()));
    if (iw && ih) this.chart.setSize(iw, ih, false);
    this._resizeParentToChart();
    this._updateYesNoLabel();
  };

  Plugin.prototype._render = function (options, rawConfig) {
    var targetEl = this.$inner[0] || this.$host[0];

    if (typeof this.opts.onBeforeRender === 'function') {
      options = this.opts.onBeforeRender(options, rawConfig) || options;
    }

    this._applyTheme();

    // Build chart and store for external access
    this.chart = this.HC.chart(targetEl, options);
    this.$host.data('asHcChart', this.chart);

    // Ensure series listed in cfg exist even if Highcharts stripped empties
    try {
      var reqSeries = Array.isArray(rawConfig && rawConfig.series)
        ? rawConfig.series
        : (rawConfig && typeof rawConfig.series === 'object')
          ? Object.keys(rawConfig.series).map(function (k) { return rawConfig.series[k]; })
          : [];

      var haveNames = (this.chart.series || []).map(function (s) { return s && s.name; });
      reqSeries.forEach((sReq, idx) => {
        var name = sReq && sReq.name != null ? sReq.name : 'Series ' + (idx + 1);
        if (haveNames.indexOf(name) === -1) {
          var sType = (rawConfig && rawConfig.type) ? String(rawConfig.type).toLowerCase() : 'line';
          if (sType === 'area3d') sType = 'area';
          if (sType === 'column3d') sType = 'column';
          if (sType === 'yesno') sType = 'line';

          this.chart.addSeries({
            name: name,
            type: sType,
            showInLegend: sType !== 'line' || normalizeType(rawConfig.type) !== 'yesno',
            enableMouseTracking: normalizeType(rawConfig.type) !== 'yesno',
            yAxis: (typeof sReq.yAxis === 'number') ? sReq.yAxis : (idx === 1 ? 1 : 0),
            data: Array.isArray(sReq.data) ? sReq.data : []
          }, false);
        }
      });

      if (reqSeries.length) this.chart.redraw();

    } catch (e) {
      try { console.warn('[asHc] post-render series fix failed:', e); } catch (_) {}
    }

    // Final sizing/theming pass
    this._fitToParentWidth();
    this._sizeToInner();
    this.chart.reflow();
    this._applyTheme();
    this._resizeParentToChart();
    this._updateYesNoLabel();

    // Enable dragging to rotate for 3D charts
    this._attach3dDragIfNeeded();
  };

  /* ======================= Config source =======================
   * Build ajax options for initial/refresh loads.
   * - Prefers configAjax (POST body, cache-busting via _ts)
   * - Supports legacy configUrl (string or $.ajax options)
   */
  Plugin.prototype._ajaxOptionsForConfig = function (cacheBust) {
    var cu = this.opts.configUrl;
    var ca = this.opts.configAjax;

    // Preferred: full $.ajax spec (often POST with JSON body)
    if (ca && typeof ca === 'object') {
      var ax = $.extend(true, {}, ca);
      if (!ax.url) ax.url = cu || '';
      if (!ax.method) ax.method = 'POST';
      ax.method = String(ax.method).toUpperCase();
      if (!ax.dataType) ax.dataType = 'json';
      if (ax.method === 'POST' && !ax.contentType) ax.contentType = 'application/json; charset=utf-8';
      if (ax.cache == null) ax.cache = false;

      // Maintain a parsed body so manager may update time ranges, etc.
      if (this._graphPostBody) {
        if (cacheBust) this._graphPostBody._ts = Date.now();
        ax.data = JSON.stringify(this._graphPostBody);
      } else if (ax.data && typeof ax.data === 'string') {
        if (cacheBust) {
          try {
            var body = JSON.parse(ax.data);
            body._ts = Date.now();
            ax.data = JSON.stringify(body);
          } catch (_e) {}
        }
      } else if (ax.data && typeof ax.data === 'object') {
        if (cacheBust) ax.data._ts = Date.now();
      }
      return ax;
    }

    // Legacy: URL string
    if (typeof cu === 'string') {
      if (!cacheBust) return { url: cu, method: 'GET', dataType: 'json', cache: false };
      var sep = cu.indexOf('?') === -1 ? '?' : '&';
      return { url: cu + sep + '_ts=' + Date.now(), method: 'GET', dataType: 'json', cache: false };
    }

    // Legacy: $.ajax options object
    if (cu && typeof cu === 'object') {
      var obj = $.extend(true, {}, cu);
      obj.method = obj.method ? String(obj.method).toUpperCase() : 'GET';
      if (!obj.dataType) obj.dataType = 'json';
      if (obj.cache == null) obj.cache = false;

      if (cacheBust) {
        if (obj.method === 'GET') {
          obj.data = obj.data || {};
          if (typeof obj.data !== 'string') obj.data._ts = Date.now();
        } else {
          if (obj.contentType && obj.contentType.indexOf('application/json') !== -1) {
            if (typeof obj.data === 'string') {
              try { var b = JSON.parse(obj.data); b._ts = Date.now(); obj.data = JSON.stringify(b); } catch (_e) {}
            } else if (obj.data && typeof obj.data === 'object') {
              obj.data._ts = Date.now();
              obj.data = JSON.stringify(obj.data);
            }
          }
        }
      }
      return obj;
    }

    return { url: '', method: 'GET', dataType: 'json', cache: false };
  };

  // First config load (with cache-bust)
  Plugin.prototype._getConfig = function () {
    if (this.opts.config && typeof this.opts.config === 'object') {
      return $.Deferred().resolve(this.opts.config).promise();
    }
    var ajaxOpts = this._ajaxOptionsForConfig(true);
    return $.ajax(ajaxOpts);
  };

  // Subsequent config refreshes (series-only update)
  Plugin.prototype._requestConfig = function () {
    var ajaxOpts = this._ajaxOptionsForConfig(true);
    if (!ajaxOpts.url) return $.Deferred().reject(new Error('No configUrl set')).promise();
    return $.ajax(ajaxOpts);
  };

  /* ======================= Refresh (series-only) =======================
   * Refreshes series (and axes if needed) without fully rebuilding the card.
   */
  Plugin.prototype.refresh = function () {
    var self = this;
    if (!self.config || !self.chart) return self.init();

    function finish(seriesArr) {
      var chartType = (self.config.type || 'line');
      var need = self._requiredYAxisCount(seriesArr, chartType);
      self._ensureYAxisCount(need);
      self.chart.update({ series: seriesArr }, true, true);

      self._fitToParentWidth();
      self._sizeToInner();
      self.chart.reflow();
      self._applyTheme();
      self._resizeParentToChart();
      self._updateYesNoLabel();

      if (self._autoSeconds > 0) self._restartProgress();
      return self.chart;
    }

    if (self.opts.configUrl || self.opts.configAjax) {
      return self._requestConfig()
        .then(function (newCfg) {
          var packedSeriesPromise = self._buildSeries(newCfg);
          return $.when(packedSeriesPromise).then(function (seriesArr) {
            // If new config declares yAxis explicitly, honor it
            if (Array.isArray(newCfg.yAxis)) {
              self.chart.update({ yAxis: newCfg.yAxis }, false, true);
            } else {
              var need = self._requiredYAxisCount(seriesArr, newCfg.type || 'line');
              self._ensureYAxisCount(need);
            }
            self.config = newCfg;
            return finish(seriesArr);
          });
        })
        .fail(self.opts.onError);
    }

    return self._buildSeries(self.config).then(finish).fail(self.opts.onError);
  };

  /* ======================= Auto-refresh timer + PROGRESS =======================
   * Manages the header-bottom progress line that shrinks to the left until refresh.
   */
  Plugin.prototype._ensureProgressEls = function () {
    if (this.$progress && this.$progressBar) return;
    this.$progress = $('<div class="as-hc-progress"></div>').css({
      position: 'absolute', left: 0, right: 0, bottom: 0, height: '1px', pointerEvents: 'none'
    });
    this.$progressBar = $('<div class="as-hc-progress-bar"></div>').css({
      position: 'absolute',
      left: 0, bottom: 0,
      height: '1px', width: '100%',
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
      var remaining = (1 - pct) * 100;
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

  // Starts/stops the interval that triggers refresh()
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

  /* ======================= 3D drag to rotate =======================
   * For column3d/area3d, allow dragging the card to rotate the 3D camera.
   */
  Plugin.prototype._attach3dDragIfNeeded = function () {
    if (!this.chart) return;
    var type = normalizeType(this.config && this.config.type);
    if (type !== 'column3d' && type !== 'area3d') return;

    var self = this;
    var $dragTargets = this.$inner.add(this.$header);

    if (!this.opts.enableDrag) return;

    $dragTargets.css('cursor', 'grab');

    function onDown(e) {
      if (e.button !== 0 && e.buttons !== 1) return;
      var opts3d = self.chart.options.chart.options3d || {};
      self._drag3d.active = true;
      self._drag3d.startX = e.pageX;
      self._drag3d.startY = e.pageY;
      self._drag3d.startAlpha = opts3d.alpha || 0;
      self._drag3d.startBeta = opts3d.beta || 0;
      $dragTargets.css('cursor', 'grabbing');
      e.preventDefault();
    }
    function onMove(e) {
      if (!self._drag3d.active) return;
      var dx = e.pageX - self._drag3d.startX;
      var dy = e.pageY - self._drag3d.startY;
      var beta = self._drag3d.startBeta + (dx / 3);
      var alpha = self._drag3d.startAlpha + (dy / 3);
      beta = Math.max(-100, Math.min(100, beta));
      alpha = Math.max(-100, Math.min(100, alpha));
      self.chart.update({ chart: { options3d: { beta: beta, alpha: alpha } } }, false);
      self.chart.redraw(false);
    }
    function onUp() {
      if (!self._drag3d.active) return;
      self._drag3d.active = false;
      $dragTargets.css('cursor', 'grab');
    }

    $dragTargets.off('.hc3d');
    $dragTargets.on('pointerdown.hc3d', onDown);
    $(window).on('pointermove.hc3d', onMove);
    $(window).on('pointerup.hc3d', onUp);
  };

  /* ======================= Snap-to-grid =======================
   * Rounds drag position to grid cells if enabled.
   */
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

  /* ======================= Bounds helpers & notifications =======================
   * Report geometry to host and emit custom events.
   */
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

  /* ======================= Drag & Resize =======================
   * Pointer-driven drag/resize with optional containment and snap.
   */
  Plugin.prototype._bindDrag = function () {
    var self = this;

    if (!self.opts.enableDrag) {
      if (self.$header) self.$header.css('cursor', 'default');
      return;
    }

    var $handle = self.$header;
    var $scope = self.$host;
    var $contain = (self.opts.containment === 'host') ? self.$host
      : (self.opts.containment === 'window') ? $(window)
        : $(self.opts.containment);

    var dragging = false, start = { x: 0, y: 0, left: 0, top: 0 };

    // Reduce accidental text/image drag inside the header
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

      // Containment within host element or window
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

      // Live snap
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

      // End-of-drag snap
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

      self._notifyBoundsChange();
    }
  };

  // Resize handle at bottom-right corner
  Plugin.prototype._bindResize = function () {
    var self = this;

    if (!self.opts.enableResize) {
      if (self.$resizer) self.$resizer.hide();
      return;
    }

    var minW = self.opts.minSize.width;
    var minH = self.opts.minSize.height;

    var $handle = self.$resizer;
    if (!$handle || !$handle.length) {
      $handle = self.$resizer = $('<div class="as-hc-resize" aria-hidden="true"></div>').appendTo(self.$wrapper);
    }
    $handle.show().css({
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

      self._fitToParentWidth();

      $scope.off('pointermove.' + PLUGIN, onMove);
      $scope.off('pointerup.' + PLUGIN, onUp);
      self._sizeToInner();
      if (self.chart) self.chart.reflow();

      self._notifyBoundsChange();
    }
  };

  /* ======================= Destroy =======================
   * Tears down observers, timers, event handlers, and chart.
   */
  Plugin.prototype.destroy = function () {
    if (this._autoTimer) { clearInterval(this._autoTimer); this._autoTimer = null; }
    this._stopProgress();
    if (this._resizeObserver) { this._resizeObserver.disconnect(); this._resizeObserver = null; }
    if (this._innerObserver) { this._innerObserver.disconnect(); this._innerObserver = null; }
    if (this._themeObserver) { this._themeObserver.disconnect(); this._themeObserver = null; }
    $(window).off('.hc3d');
    if (this._uid) $(window).off('.allsky-rph-' + PLUGIN + '-' + this._uid);
    if (this.chart && this.chart.destroy) this.chart.destroy();
    this.chart = null;
    if (this.$wrapper) { this.$wrapper.off('.' + PLUGIN).remove(); this.$wrapper = null; }
    this.$host.removeData('asHcChart');
  };

  /* ======================= Mount layout =======================
   * Builds the card DOM structure (header/tools/body/inner/resizer) and
   * initializes interactions + observers.
   */
  Plugin.prototype._mountLayout = function (cfg) {
    if (this.$host.css('position') === 'static') this.$host.css('position', 'relative');

    function toNum(v, fallback) {
      if (v === null || typeof v === 'undefined') return fallback;
      var n = Number(v);
      return isFinite(n) ? n : fallback;
    }

    // Resolve initial position/size with fallbacks and slight offsets per card
    var posOpt = (typeof this.opts.top !== 'undefined' || typeof this.opts.left !== 'undefined')
      ? { top: this.opts.top, left: this.opts.left }
      : (this.opts.initialPos || {});

    var sizeOpt = (typeof this.opts.width !== 'undefined' || typeof this.opts.height !== 'undefined')
      ? { width: this.opts.width, height: this.opts.height }
      : (this.opts.initialSize || {});

    var havePos = (posOpt && posOpt.top != null && posOpt.left != null);
    var haveSize = (sizeOpt && sizeOpt.width != null && sizeOpt.height != null);

    var countExisting = this.$host.children('.as-hc-wrapper').length;
    var offset = havePos ? 0 : Math.min(countExisting * 24, 120);

    var theme = getActiveTheme();
    var bg = (theme.chart && theme.chart.backgroundColor) || '#ffffff';

    var initTop = havePos ? toNum(posOpt.top, this.opts.startPos.top) : (this.opts.startPos.top + offset);
    var initLeft = havePos ? toNum(posOpt.left, this.opts.startPos.left) : (this.opts.startPos.left + offset);
    var initW = haveSize ? Math.max(this.opts.minSize.width, toNum(sizeOpt.width, this.opts.minSize.width)) : Math.max(480, this.opts.minSize.width);
    var initH = haveSize ? Math.max(this.opts.minSize.height, toNum(sizeOpt.height, this.opts.minSize.height)) : Math.max(300, this.opts.minSize.height);

    // Clamp to host bounds if known
    var hostW = this.$host.innerWidth(), hostH = this.$host.innerHeight();
    if (hostW && hostH) {
      initLeft = Math.max(0, Math.min(initLeft, Math.max(0, hostW - initW)));
      initTop = Math.max(0, Math.min(initTop, Math.max(0, hostH - initH)));
    }

    var bb = { boxSizing: 'border-box' };

    // Wrapper (card)
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

    // Header (title + tools)
    this.$header = $('<div class="as-hc-header"></div>').css($.extend({}, bb, {
      position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '6px 8px', gap: '8px',
      userSelect: 'none',
      cursor: this.opts.enableDrag ? 'move' : 'default'
    }));
    var titleText = this.opts.headerTitle != null ? this.opts.headerTitle : (cfg && cfg.title) || '';
    this.$title = $('<div class="as-hc-title"></div>').text(titleText).css({
      fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '8px'
    });
    this.$tools = $('<div class="as-hc-tools"></div>').css({ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'default' });

    // REFRESH button
    if (this.opts.showToolbar && this.opts.showRefreshButton) {
      this.$refreshBtn = $('<button type="button" class="as-hc-btn as-hc-refresh-btn" title="' + this.opts.refreshLabel + '"></button>')
        .css({ display: 'inline-flex', alignItems: 'center', gap: 0, padding: '4px 8px', cursor: 'pointer' })
        .append('<i class="fa fa-refresh" aria-hidden="true"></i>')
        .on('click', (e) => {
          e.preventDefault(); e.stopPropagation();
          this._setLoading(true);
          $.when(this.refresh()).always(() => { this._setLoading(false); });
        });
      this.$tools.append(this.$refreshBtn);
    }

    // TOOLTIP toggle
    if (this.opts.showToolbar && this.opts.showTooltipToggle) {
      this.$tooltipBtn = $('<button type="button" class="as-hc-btn as-hc-tooltip-btn" title="Toggle tooltips"></button>')
        .css({ display: 'inline-flex', alignItems: 'center', gap: 0, padding: '4px 8px', cursor: 'pointer' })
        .append('<i class="far fa-comment" aria-hidden="true"></i>')
        .on('click', (e) => {
          e.preventDefault(); e.stopPropagation();
          this._tooltipsEnabled = !this._tooltipsEnabled;
          if (this.chart) {
            this.chart.update({ tooltip: { enabled: this._tooltipsEnabled } }, false);
            this.chart.redraw(false);
          }
          $(e.currentTarget).css('opacity', this._tooltipsEnabled ? 1 : 0.5);
        });
      this.$tools.append(this.$tooltipBtn);
    }

    // AUTO-REFRESH select
    if (this.opts.showToolbar && this.opts.autoRefresh && this.opts.autoRefresh.enabled) {
      var options = this.opts.autoRefresh.options || [0, 10, 20, 30, 60, 120];
      var $sel = $('<select class="as-hc-autorefresh" title="Auto refresh interval"></select>').css({ padding: '3px 6px' });
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
        if (typeof this.opts.onAutoRefreshChange === 'function') {
          try { this.opts.onAutoRefreshChange(secs, this); } catch (e) {}
        }
        this.$host.trigger('asHc.autorefreshchange', [{ seconds: secs }, this]);
      });
      this.$tools.append($sel);
    }

    // DELETE button
    if (this.opts.showToolbar && this.opts.showDeleteButton) {
      var $btnDelete = $('<button type="button" class="as-hc-btn as-hc-delete-btn" title="' + this.opts.deleteLabel + '"></button>')
        .css({ display: 'inline-flex', alignItems: 'center', gap: 0, padding: '4px 8px', cursor: 'pointer' })
        .append('<i class="fa fa-trash" aria-hidden="true"></i>')
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
    }

    this.$header.append(this.$title, this.$tools);

    // Progress (auto-refresh) UI elements
    this._ensureProgressEls();

    // Body + Inner container (chart lives in $inner)
    this.$body = $('<div class="as-hc-body"></div>').css($.extend({}, bb, {
      position: 'relative', backgroundColor: bg, flex: '1 1 auto', minHeight: 0, overflow: 'hidden'
    }));
    this.$inner = $('<div class="as-hc-inner"></div>').css($.extend({}, bb, {
      position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, width: '100%', height: '100%', overflow: 'hidden'
    }));
    this.$body.append(this.$inner);

    // Resizer handle
    this.$resizer = $('<div class="as-hc-resize" aria-hidden="true"></div>');
    if (this.opts.enableResize) {
      this.$resizer.css({
        position: 'absolute', right: '6px', bottom: '6px',
        width: this.opts.resizerSize + 'px', height: this.opts.resizerSize + 'px',
        cursor: 'nwse-resize', zIndex: 2
      }).show();
    } else {
      this.$resizer.hide();
    }

    this.$wrapper.append(this.$header, this.$body, this.$resizer);
    this.$host.append(this.$wrapper);

    this._fitToParentWidth();

    // Interactions & observers
    this._bringToFront();
    this._bindDrag();
    this._bindResize();

    // Resize observers keep chart sized to inner container
    if (typeof ResizeObserver !== 'undefined') {
      var el = this.$wrapper[0];
      this._resizeObserver = new ResizeObserver(() => { this._sizeToInner(); });
      this._resizeObserver.observe(el);
    }
    if (typeof ResizeObserver !== 'undefined') {
      var innerEl = this.$inner[0];
      this._innerObserver = new ResizeObserver(() => { this._sizeToInner(); });
      this._innerObserver.observe(innerEl);
    }

    // Theme watcher (body.class changes)
    if (typeof MutationObserver !== 'undefined') {
      this._themeObserver = new MutationObserver((muts) => {
        for (var i = 0; i < muts.length; i++) {
          if (muts[i].attributeName === 'class') { this._applyTheme(); this._sizeToInner(); break; }
        }
      });
      this._themeObserver.observe(document.body, { attributes: true });
    }

    // Window resize => fit width + reflow chart
    var self = this;
    $(window).off('.allsky-rph-' + PLUGIN + '-' + this._uid);
    $(window).on('resize.allsky-rph-' + PLUGIN + '-' + this._uid, function () {
      self._fitToParentWidth();
      self._sizeToInner();
      if (self.chart && self.chart.reflow) self.chart.reflow();
    });

    if (this._autoSeconds > 0) this._startAutoTimer();
  };

  /* ======================= Init =======================
   * Public entry: mounts layout, fetches config, builds options, renders chart.
   */
  Plugin.prototype.init = function () {
    if (!this.$wrapper) this._mountLayout({ title: this.opts.headerTitle || 'Loading…' });
    this._setLoading(true);

    return this._getConfig()
      .then((cfg) => {

        this.config = cfg;
        if ('main' in cfg) cfg.main = boolish(cfg.main);

        var t = this.opts.headerTitle != null ? this.opts.headerTitle : (cfg && cfg.title) || '';
        this.$title && this.$title.text(t);

        var options = this._baseOptions(cfg);
        return this._buildSeries(cfg).then((seriesArr) => {
          options.series = seriesArr.slice();

          // Ensure enough y-axes based on series[].yAxis usage or explicit cfg.yAxis
          var need = 0;
          seriesArr.forEach(function (s) {
            if (typeof s.yAxis === 'number') need = Math.max(need, s.yAxis + 1);
          });

          if (Array.isArray(cfg.yAxis)) {
            options.yAxis = cfg.yAxis.slice();
          } else if (need > 0) {
            options.yAxis = options.yAxis || [];
          }
          if (need > 0) {
            options.yAxis = options.yAxis || [];
            for (var i = options.yAxis.length; i < need; i++) {
              options.yAxis.push({ title: { text: null }, opposite: (i % 2 === 1) });
            }
          }

          // Hide legend/tooltip for yesno
          options.legend = options.legend || {};
          options.legend.enabled = (normalizeType(cfg.type) !== 'yesno');

          // Default yAxis assignment for 2-series charts
          options.series = (options.series || []).map(function (s, i) {
            return $.extend(true, {
              showInLegend: (normalizeType(cfg.type) !== 'yesno'),
              enableMouseTracking: (normalizeType(cfg.type) !== 'yesno')
            }, s, {
              yAxis: (typeof s.yAxis === 'number') ? s.yAxis : (i === 1 ? 1 : 0)
            });
          });

          // If any series target yAxis=1, ensure there are 2 axes and set titles
          var needsAxis1 = (normalizeType(cfg.type) !== 'yesno') && options.series.some(function (s) { return s.yAxis === 1; });
          if (needsAxis1) {
            if (!Array.isArray(options.yAxis)) {
              options.yAxis = [
                { title: { text: 'Exposure' } },
                { title: { text: 'Gain' }, opposite: true }
              ];
            } else if (options.yAxis.length < 2) {
              options.yAxis = [
                options.yAxis[0] || { title: { text: 'Exposure' } },
                $.extend(true, { title: { text: 'Gain' }, opposite: true }, options.yAxis[1] || {})
              ];
            }
          }

          // Most non-categorical charts use datetime x-axis
          if (normalizeType(cfg.type) !== 'column' && normalizeType(cfg.type) !== 'pie') {
            options.xAxis = $.extend(true, { type: 'datetime' }, options.xAxis || {});
          }

          this._render(options, cfg);
          return this.chart;
        });
      })
      .fail(this.opts.onError)
      .always(() => {
        this._setLoading(false);
        this._notifyBoundsChange();
      });
  };

  /* ======================= Snap controls (NEW) =======================
   * Public API to control snap-to-grid at runtime (used by manager).
   */
  Plugin.prototype.setSnapEnabled = function (enabled) {
    this.opts.grid = this.opts.grid || {};
    this.opts.grid.enabled = !!enabled;
    return this;
  };
  Plugin.prototype.setSnapType = function (type) {
    var t = (type || 'end').toString().toLowerCase();
    if (t !== 'move' && t !== 'end') t = 'end';
    this.opts.grid = this.opts.grid || {};
    this.opts.grid.snap = t;
    return this;
  };
  Plugin.prototype.setSnapSize = function (x, y) {
    var gx, gy;
    if (typeof x === 'object' && x) { gx = x.x; gy = (x.y != null ? x.y : x.x); }
    else { gx = x; gy = (y != null ? y : x); }
    gx = parseInt(gx, 10); gy = parseInt(gy, 10);
    if (!isFinite(gx) || gx <= 0) gx = 24;
    if (!isFinite(gy) || gy <= 0) gy = gx;
    this.opts.grid = this.opts.grid || {};
    this.opts.grid.size = { x: gx, y: gy };
    return this;
  };

  /* ======================= NEW public helpers =======================
   * Allow host (manager) to update POST body/URL between refreshes.
   */
  Plugin.prototype.setGraphPostBody = function (bodyObj) {
    if (!bodyObj || typeof bodyObj !== 'object') return this;
    this._graphPostBody = $.extend(true, {}, bodyObj);
    if (this.opts.configAjax) {
      this.opts.configAjax.data = JSON.stringify(this._graphPostBody);
    }
    return this;
  };
  Plugin.prototype.setConfigUrl = function (url) {
    if (typeof url === 'string') this.opts.configUrl = url;
    return this;
  };

  /* ======================= jQuery bridge =======================
   * Attaches the plugin to jQuery collections and adds a few helper calls.
   */
  $.fn[PLUGIN] = function (optionOrMethod) {
    var args = Array.prototype.slice.call(arguments, 1);
    var ret;

    // Utility: gather bounds from all instances on the collection
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

    // Standard jQuery plugin behavior (init or call method on each instance)
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