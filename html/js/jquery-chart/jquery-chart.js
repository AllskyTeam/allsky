"use strict";

(function ($) {
  'use strict';

  var PLUGIN = 'asHighchartFromConfig';
  var INST_KEY = PLUGIN + '_instances';
  var Z_STACK_NEXT = 1000; // active card z-order

  /* ---------------- Helpers ---------------- */

  function deepMerge() {
    var args = Array.prototype.slice.call(arguments);
    var out = {};
    args.forEach(function (src) {
      if (!src) return;
      Object.keys(src).forEach(function (k) {
        var v = src[k];
        if ($.isPlainObject(v)) out[k] = deepMerge(out[k], v);
        else out[k] = v;
      });
    });
    return out;
  }

  function normalizeType(t) {
    var s = (t || 'line') + '';
    s = s.toLowerCase();
    if (s === 'guage') s = 'gauge';
    if (s === 'spline') s = 'line'; // can override via cfg.hc
    return s;
  }
  function boolish(v) { return (typeof v === 'string') ? v.toLowerCase() === 'true' : !!v; }
  function isNumber(x) { return typeof x === 'number' && !isNaN(x); }

  // Smart defaults
  var TYPE_DEFAULTS = {
    common: {
      title: { text: null },                  // we render title in header
      credits: { enabled: false },
      legend: { enabled: true },
      xAxis: { title: { text: null } },
      tooltip: { shared: true },
      plotOptions: {
        series: {
          turboThreshold: 0,
          marker: { enabled: false }
        }
      }
    },
    line: {
      chart: { type: 'line' }
    },
    gauge: {
      chart: { type: 'gauge', spacingBottom: 28 },
      pane: {
        startAngle: -90,
        endAngle: 90,
        center: ['50%', '75%'],
        size: '110%',
        background: null
      },
      yAxis: [{
        min: 0, max: 100, tickInterval: 10,
        tickPosition: 'inside', lineWidth: 0,
        labels: { distance: 20, style: { fontSize: '12px' } },
        plotBands: [
          { from: 0,  to: 70,  color: '#55BF3B', thickness: 30 },
          { from: 70, to: 85,  color: '#DDDF0D', thickness: 30 },
          { from: 85, to: 100, color: '#DF5353', thickness: 30 }
        ]
      }]
    }
  };

  var SERIES_DEFAULTS = {
    line: {},
    gauge: {
      tooltip:    { valueSuffix: ' %' },
      dataLabels: { format: '{y} %', borderWidth: 0, style: { fontSize: '14px' } },
      dial:  { radius: '80%', backgroundColor: '#666', baseWidth: 16, baseLength: '0%', rearLength: '0%' },
      pivot: { backgroundColor: '#666', radius: 8 }
    }
  };

  /* ---------------- Defaults ---------------- */

  var defaults = {
    // Config source
    config: null,              // object
    configUrl: null,           // string or $.ajax opts

    // Variable resolver (return Promise -> array or number)
    fetchSeriesData: function (variable) {
      return $.Deferred().reject(new Error('fetchSeriesData not implemented for ' + variable)).promise();
    },

    highcharts: window.Highcharts,
    onBeforeRender: null,
    onError: function (err) { if (console) console.error(err); },

    // Layout / behavior
    headerTitle: null,
    containment: 'host',        // 'host', 'window', or CSS selector
    startPos: { top: 20, left: 20 },
    minSize: { width: 320, height: 220 },
    resizerSize: 22,

    // Toolbar
    showToolbar: true,
    showRefreshButton: true,
    refreshLabel: 'Refresh',
    showDeleteButton: true,
    deleteLabel: 'Delete',
    confirmDelete: true,

    // Auto refresh
    autoRefresh: {
      enabled: true,
      options: [0, 10, 20, 30, 60, 120],
      defaultSeconds: 0
    },

    // Snap-to-grid
    grid: {
      enabled: false,
      size: { x: 24, y: 24 },
      snap: 'end',              // 'end' or 'move'
      threshold: 0
    }
  };

  /* ---------------- Constructor ---------------- */

  function Plugin(el, options) {
    this.$host = $(el);
    this.opts = $.extend(true, {}, defaults, options || {});
    this.HC = this.opts.highcharts;

    this.config = null;
    this.chart = null;

    this.$wrapper = null;
    this.$header  = null;
    this.$title   = null;
    this.$tools   = null;
    this.$body    = null;
    this.$inner   = null;
    this.$resizer = null;
    this.$refreshBtn = null;

    this._resizeObserver = null;
    this._autoTimer = null;
    this._autoSeconds = (this.opts.autoRefresh && this.opts.autoRefresh.defaultSeconds) || 0;
  }

  Plugin.prototype._bringToFront = function () {
    Z_STACK_NEXT += 1;
    if (this.$wrapper) this.$wrapper.css('z-index', Z_STACK_NEXT);
  };

  /* ---------------- Axis resolution (fix HC #18) ---------------- */

  Plugin.prototype._resolveYAxes = function (cfg) {
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
    for (var i = 0; i < count; i++) {
      axes.push({ title: { text: null }, opposite: (i % 2 === 1) });
    }
    return axes;
  };

  /* ---------------- Base options ---------------- */

  Plugin.prototype._baseOptions = function (cfg) {
    var type = normalizeType(cfg.type);
    var base = deepMerge({}, TYPE_DEFAULTS.common, TYPE_DEFAULTS[type] || {});
    base.chart = deepMerge({}, base.chart, {
      backgroundColor: 'transparent',
      plotBackgroundColor: 'transparent'
    });
    base.yAxis = this._resolveYAxes(deepMerge({}, base, cfg));
    var finalOptions = deepMerge({}, base, (cfg.hc || {}));
    finalOptions.title = { text: null }; // suppress in-chart title
    return finalOptions;
  };

  /* ---------------- Build series ---------------- */

  Plugin.prototype._buildSeries = function (cfg) {
    var self = this;
    var seriesObj = cfg.series || {};
    var keys = Object.keys(seriesObj);
    if (!keys.length) return $.Deferred().resolve([]).promise();

    var type = normalizeType(cfg.type);
    var promises = keys.map(function (key) {
      var s = seriesObj[key] || {};
      var dataPromise;

      if ('data' in s) {
        dataPromise = $.Deferred().resolve(s.data).promise();
      } else if ('variable' in s) {
        dataPromise = $.when(self.opts.fetchSeriesData(s.variable));
      } else {
        dataPromise = $.Deferred().resolve([]).promise();
      }

      return dataPromise.then(function (data) {
        if (type === 'gauge') {
          if (isNumber(data)) data = [data];
          if (Array.isArray(data) && data.length > 1 && isNumber(data[0])) data = [data[0]];
        }
        var yIdx = (type === 'gauge') ? 0 : (typeof s.yAxis === 'number' ? s.yAxis : 0);

        return deepMerge(
          {},
          SERIES_DEFAULTS[type] || {},
          s.options || {},
          {
            name: s.name || key,
            type: type,
            yAxis: yIdx,
            data: Array.isArray(data) ? data : (isNumber(data) ? [data] : [])
          }
        );
      });
    });

    return $.when.apply($, promises).then(function () {
      return Array.prototype.slice.call(arguments);
    });
  };

  /* ---------------- Render ---------------- */

  Plugin.prototype._render = function (options, rawConfig) {
    var targetEl = this.$inner[0] || this.$host[0];
    if (typeof this.opts.onBeforeRender === 'function') {
      options = this.opts.onBeforeRender(options, rawConfig) || options;
    }
    this.chart = this.HC.chart(targetEl, options);
    this.$host.data('asHcChart', this.chart);
  };

  /* ---------------- Config source ---------------- */

  Plugin.prototype._getConfig = function () {
    if (this.opts.config && typeof this.opts.config === 'object') {
      return $.Deferred().resolve(this.opts.config).promise();
    }
    var cu = this.opts.configUrl;
    if (typeof cu === 'string') return $.getJSON(cu);
    if (cu && cu.url) return $.ajax($.extend({ method: 'GET', dataType: 'json' }, cu));
    return $.Deferred().reject(new Error('config or configUrl is required')).promise();
  };

  /* ---------------- Refresh paths ---------------- */

  Plugin.prototype.refresh = function () {
    var self = this;
    if (!self.config || !self.chart) return self.init();
    return self._buildSeries(self.config).then(function (seriesArr) {
      self.chart.update({ series: seriesArr }, true, true);
      return self.chart;
    }).fail(self.opts.onError);
  };

  Plugin.prototype._startAutoTimer = function () {
    var self = this;
    if (self._autoTimer) window.clearInterval(self._autoTimer);
    self._autoTimer = window.setInterval(function () {
      self._setLoading(true);
      $.when(self.refresh()).always(function () { self._setLoading(false); });
    }, self._autoSeconds * 1000);
  };
  Plugin.prototype.setAutoRefresh = function (seconds) {
    this._autoSeconds = Math.max(0, parseInt(seconds, 10) || 0);
    if (this._autoTimer) { window.clearInterval(this._autoTimer); this._autoTimer = null; }
    if (this._autoSeconds > 0) this._startAutoTimer();
  };

  Plugin.prototype._setLoading = function (on) {
    if (!this.$refreshBtn) return;
    this.$refreshBtn.toggleClass('loading', !!on).prop('disabled', !!on).css('opacity', on ? 0.6 : 1);
  };

  /* ---------------- Snap-to-grid ---------------- */

  Plugin.prototype._snapPosition = function (left, top) {
    var g = this.opts.grid;
    if (!g || !g.enabled) return { left: left, top: top };
    var gx = Math.max(1, (g.size && g.size.x) || 24);
    var gy = Math.max(1, (g.size && g.size.y) || 24);
    function roundTo(v, s){ return Math.round(v / s) * s; }

    if (g.threshold && g.threshold > 0) {
      var ls = roundTo(left, gx), ts = roundTo(top, gy);
      if (Math.abs(ls - left) <= g.threshold) left = ls;
      if (Math.abs(ts - top)  <= g.threshold) top  = ts;
      return { left:left, top:top };
    }
    return { left: roundTo(left, gx), top: roundTo(top, gy) };
  };

  /* ---------------- Drag & Resize ---------------- */

  Plugin.prototype._bindDrag = function () {
    var self = this;
    var $handle = self.$header;            // header is the drag handle
    var $scope  = self.$host;
    var $contain = (self.opts.containment === 'host') ? self.$host
                 : (self.opts.containment === 'window') ? $(window)
                 : $(self.opts.containment);

    var dragging = false, start = { x:0, y:0, left:0, top:0 };

    $handle.css('touch-action', 'none')
           .on('selectstart.' + PLUGIN, function(e){
             if ($(e.target).closest('.as-hc-tools, button, select, input, textarea, a, [contenteditable]').length) return;
             e.preventDefault();
           })
           .on('dragstart.' + PLUGIN, function(e){
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
      start.top  = parseFloat(self.$wrapper.css('top'))  || 0;

      $('html,body').addClass('as-hc-noselect');
      e.preventDefault(); e.stopPropagation();

      $scope.on('pointermove.' + PLUGIN, onMove);
      $scope.on('pointerup.'   + PLUGIN, onUp);
    });

    function onMove(e) {
      if (!dragging) return;
      var dx = e.pageX - start.x;
      var dy = e.pageY - start.y;
      var newLeft = start.left + dx;
      var newTop  = start.top  + dy;

      // containment
      if ($contain && $contain.length && $contain[0] !== window) {
        var maxLeft = $contain.innerWidth()  - self.$wrapper.outerWidth();
        var maxTop  = $contain.innerHeight() - self.$wrapper.outerHeight();
        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop  = Math.max(0, Math.min(newTop,  maxTop));
      } else if (self.opts.containment === 'window') {
        var maxLeftW = $(window).width()  - self.$wrapper.outerWidth();
        var maxTopW  = $(window).height() - self.$wrapper.outerHeight();
        newLeft = Math.max(0, Math.min(newLeft, maxLeftW));
        newTop  = Math.max(0, Math.min(newTop,  maxTopW));
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
      $scope.off('pointerup.'   + PLUGIN, onUp);

      if (self.opts.grid && self.opts.grid.enabled && self.opts.grid.snap !== 'move') {
        var curLeft = parseFloat(self.$wrapper.css('left')) || 0;
        var curTop  = parseFloat(self.$wrapper.css('top'))  || 0;
        var snap = self._snapPosition(curLeft, curTop);

        // re-apply containment post-snap
        if ($contain && $contain.length && $contain[0] !== window) {
          var maxLeft = $contain.innerWidth()  - self.$wrapper.outerWidth();
          var maxTop  = $contain.innerHeight() - self.$wrapper.outerHeight();
          snap.left = Math.max(0, Math.min(snap.left, maxLeft));
          snap.top  = Math.max(0, Math.min(snap.top,  maxTop));
        } else if (self.opts.containment === 'window') {
          var maxLeftW = $(window).width()  - self.$wrapper.outerWidth();
          var maxTopW  = $(window).height() - self.$wrapper.outerHeight();
          snap.left = Math.max(0, Math.min(snap.left, maxLeftW));
          snap.top  = Math.max(0, Math.min(snap.top,  maxTopW));
        }

        self.$wrapper.css({ left: snap.left + 'px', top: snap.top + 'px' });
      }
    }
  };

  Plugin.prototype._bindResize = function () {
    var self = this;
    var minW = self.opts.minSize.width;
    var minH = self.opts.minSize.height;

    var $handle = $('<div class="as-hc-resize" aria-hidden="true"></div>');
    self.$wrapper.append($handle);

    var $scope = self.$host;
    var start = { x:0, y:0, w:0, h:0 };
    var resizing = false;

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
      $scope.on('pointerup.'   + PLUGIN, onUp);
    });

    function onMove(e){
      if (!resizing) return;
      var w = Math.max(minW, start.w + (e.pageX - start.x));
      var h = Math.max(minH, start.h + (e.pageY - start.y));
      var maxW = self.$host.innerWidth();
      var maxH = self.$host.innerHeight();
      w = Math.min(w, maxW); h = Math.min(h, maxH);
      self.$wrapper.css({ width: w + 'px', height: h + 'px' });
      if (self.chart) self.chart.reflow();
      e.preventDefault();
    }
    function onUp(e){
      resizing = false;
      this.releasePointerCapture && this.releasePointerCapture(e.pointerId);
      $('html,body').removeClass('as-hc-noselect');
      $scope.off('pointermove.' + PLUGIN, onMove);
      $scope.off('pointerup.'   + PLUGIN, onUp);
    }
  };

  /* ---------------- Destroy ---------------- */

  Plugin.prototype.destroy = function () {
    if (this._autoTimer) { clearInterval(this._autoTimer); this._autoTimer = null; }
    if (this._resizeObserver) { this._resizeObserver.disconnect(); this._resizeObserver = null; }
    if (this.chart && this.chart.destroy) this.chart.destroy();
    this.chart = null;
    if (this.$wrapper) { this.$wrapper.off('.' + PLUGIN).remove(); this.$wrapper = null; }
    this.$host.removeData('asHcChart');
  };

  /* ---------------- Mount layout ---------------- */

  Plugin.prototype._mountLayout = function (cfg) {
    if (this.$host.css('position') === 'static') this.$host.css('position', 'relative');

    // Stagger new cards so they don't overlap initially
    var countExisting = this.$host.children('.as-hc-wrapper').length;
    var offset = Math.min(countExisting * 24, 120);

    this.$wrapper = $('<div class="as-hc-wrapper"></div>').css({
      top: this.opts.startPos.top + offset,
      left: this.opts.startPos.left + offset,
      width: Math.max(480, this.opts.minSize.width) + 'px',
      height: Math.max(300, this.opts.minSize.height) + 'px'
    });

    // Header
    this.$header = $('<div class="as-hc-header"></div>');
    var titleText = this.opts.headerTitle != null ? this.opts.headerTitle : (cfg && cfg.title) || '';
    this.$title  = $('<div class="as-hc-title"></div>').text(titleText);
    this.$tools  = $('<div class="as-hc-tools"></div>');

    // Refresh
    if (this.opts.showToolbar && this.opts.showRefreshButton) {
      this.$refreshBtn = $('<button type="button" class="as-hc-btn as-hc-refresh-btn" title="' + this.opts.refreshLabel + '">\
        <i class="fa fa-refresh" aria-hidden="true"></i><span>' + this.opts.refreshLabel + '</span>\
      </button>').on('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        this._setLoading(true);
        $.when(this.refresh()).always(() => { this._setLoading(false); });
      });
      this.$tools.append(this.$refreshBtn);
    }

    // Auto-refresh
    if (this.opts.showToolbar && this.opts.autoRefresh && this.opts.autoRefresh.enabled) {
      var options = this.opts.autoRefresh.options || [0,10,20,30,60,120];
      var $sel = $('<select class="as-hc-autorefresh" title="Auto refresh interval"></select>');
      options.forEach((sec) => {
        var label = sec === 0 ? 'None' : (sec + 's');
        var $opt = $('<option></option>').val(String(sec)).text(label);
        if (sec === this._autoSeconds) $opt.attr('selected', 'selected');
        $sel.append($opt);
      });
      $sel.on('change', () => {
        var secs = parseInt($sel.val(), 10) || 0;
        this.setAutoRefresh(secs);
      });
      this.$tools.append($sel);
    }

    // Delete (removes only this card, NOT the host)
    if (this.opts.showToolbar && this.opts.showDeleteButton) {
      var $btnDelete = $('<button type="button" class="as-hc-btn as-hc-delete-btn" title="' + this.opts.deleteLabel + '">\
        <i class="fa fa-trash" aria-hidden="true"></i><span>' + this.opts.deleteLabel + '</span>\
      </button>').on('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        if (!this.opts.confirmDelete || window.confirm('Remove this chart?')) {
          this.destroy();
          // Remove instance from host registry
          var list = this.$host.data(INST_KEY) || [];
          this.$host.data(INST_KEY, list.filter((i) => i !== this));
        }
      });
      this.$tools.append($btnDelete);
    }

    // Assemble header
    this.$header.append(this.$title, this.$tools);

    // Body
    this.$body  = $('<div class="as-hc-body"></div>');
    this.$inner = $('<div class="as-hc-inner"></div>');
    this.$body.append(this.$inner);

    // Resizer
    var size = this.opts.resizerSize;
    this.$resizer = $('<div class="as-hc-resize" aria-hidden="true"></div>').css({
      width: size + 'px', height: size + 'px'
    });

    // Compose
    this.$wrapper.append(this.$header, this.$body, this.$resizer);
    this.$host.append(this.$wrapper);

    // Interactions
    this._bringToFront();
    this._bindDrag();
    this._bindResize();

    // Reflow on container resize
    var el = this.$wrapper[0];
    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver(() => { this.chart && this.chart.reflow(); });
      this._resizeObserver.observe(el);
    }

    if (this._autoSeconds > 0) this._startAutoTimer();
  };

  /* ---------------- Init ---------------- */

  Plugin.prototype.init = function () {
    // mount a skeleton first so header & buttons exist (spinner can run)
    if (!this.$wrapper) {
      this._mountLayout({ title: this.opts.headerTitle || 'Loading…' });
    }
    this._setLoading(true);

    return this._getConfig()
      .then((cfg) => {
        this.config = cfg;
        if ('main' in cfg) cfg.main = boolish(cfg.main);
        // update header title
        var t = this.opts.headerTitle != null ? this.opts.headerTitle : (cfg && cfg.title) || '';
        this.$title && this.$title.text(t);

        var options = this._baseOptions(cfg);
        return this._buildSeries(cfg).then((seriesArr) => {
          options.series = seriesArr;
          this._render(options, cfg);
          return this.chart;
        });
      })
      .fail(this.opts.onError)
      .always(() => { this._setLoading(false); });
  };

  /* ---------------- jQuery bridge ---------------- */

  $.fn[PLUGIN] = function (optionOrMethod) {
    var args = Array.prototype.slice.call(arguments, 1);
    var ret;

    this.each(function () {
      var $el = $(this);
      var instances = $el.data(INST_KEY);
      if (!instances) {
        instances = [];
        $el.data(INST_KEY, instances);
      }

      if (typeof optionOrMethod === 'string') {
        // Call method on ALL instances of this host
        instances.slice().forEach(function (inst) {
          if (typeof inst[optionOrMethod] !== 'function') throw new Error(PLUGIN + ': unknown method ' + optionOrMethod);
          ret = inst[optionOrMethod].apply(inst, args);
        });
      } else {
        // Add a new chart instance
        var inst = new Plugin(this, optionOrMethod || {});
        instances.push(inst);
        ret = inst.init();
      }
    });

    return ret !== undefined ? ret : this;
  };

})(jQuery);