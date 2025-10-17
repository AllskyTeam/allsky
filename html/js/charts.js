"use strict";


/*!
 * timeRangeModal — Bootstrap 3 modal time range picker (no Live mode)
 * Emits on the host button:
 *   - 'tr.apply' (event, range)
 *   - 'tr.clear' (event)
 *   - 'tr.change' (event, range)
 *
 * Public methods:
 *   - $(btn).timeRangeModal(opts)
 *   - $(btn).timeRangeModal('open')
 *   - $(btn).timeRangeModal('close')
 *   - $(btn).timeRangeModal('destroy')
 *   - $(btn).timeRangeModal('getRange')   -> {mode, quick, from, to}
 *   - $(btn).timeRangeModal('setRange', r)
 */
(function ($) {
  'use strict';

  var PLUGIN = 'timeRangeModal';
  var INST = PLUGIN + '_inst';
  var UID = 0;

  var defaults = {
    range: { mode: 'quick', quick: '24h', from: null, to: null },
    quickOptions: { '1h':'1h','6h':'6h','24h':'24h','7d':'7d','30d':'30d' },
    modalTitle: 'Time range',
    // Optional: modal size classes (BS3): '', 'modal-sm', 'modal-lg'
    dialogClass: 'modal-sm'
  };

  function toUnix(dtLocalStr) {
    if (!dtLocalStr) return null;
    var t = Date.parse(dtLocalStr);
    return isFinite(t) ? Math.floor(t / 1000) : null;
  }
  function fromUnixLocal(unix) {
    if (!isFinite(unix)) return '';
    var d = new Date(unix * 1000);
    function pad(n){return (''+n).length===1?('0'+n):(''+n);}
    return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()) +
           'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function resolveQuickRange(key) {
    var now = Math.floor(Date.now() / 1000);
    var map = {
      '1h': now - 3600,
      '6h': now - 6*3600,
      '24h': now - 24*3600,
      '7d': now - 7*86400,
      '30d': now - 30*86400
    };
    var from = map[key] != null ? map[key] : (now - 24*3600);
    return { from: from, to: now };
  }

  function buildModalHtml(id, opts) {
    var quickOpts = Object.keys(opts.quickOptions).map(function(v){
      var label = opts.quickOptions[v];
      var sel = v === '24h' ? ' selected' : '';
      return '<option value="'+v+'"'+sel+'>'+label+'</option>';
    }).join('');

    return '' +
'<div class="modal fade" id="'+id+'" tabindex="-1" role="dialog" aria-labelledby="'+id+'_label">' +
'  <div class="modal-dialog '+(opts.dialogClass||'')+'" role="document">' +
'    <div class="modal-content">' +
'      <div class="modal-header">' +
'        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span>&times;</span></button>' +
'        <h4 class="modal-title" id="'+id+'_label"><i class="fa-regular fa-clock"></i> '+(opts.modalTitle||'Time range')+'</h4>' +
'      </div>' +
'      <div class="modal-body">' +
'        <div class="form-inline" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">' +
'          <select class="trm-mode form-control input-sm">' +
'            <option value="quick">Last…</option>' +
'            <option value="range">Custom</option>' +
'          </select>' +
'          <select class="trm-quick form-control input-sm" style="width:120px;">' + quickOpts + '</select>' +
'          <div class="trm-range" style="display:none;display:flex;gap:6px;align-items:center;">' +
'            <input type="datetime-local" class="trm-from form-control input-sm" style="width:180px;">' +
'            <span>–</span>' +
'            <input type="datetime-local" class="trm-to form-control input-sm" style="width:180px;">' +
'          </div>' +
'        </div>' +
'      </div>' +
'      <div class="modal-footer">' +
'        <button type="button" class="btn btn-default btn-sm trm-clear">Clear</button>' +
'        <button type="button" class="btn btn-primary btn-sm trm-apply">Apply</button>' +
'      </div>' +
'    </div>' +
'  </div>' +
'</div>';
  }

  function setUiFromRange($m, range) {
    var mode = (range && (range.mode === 'quick' || range.mode === 'range')) ? range.mode : 'quick';
    $m.find('.trm-mode').val(mode);
    var showQuick = mode === 'quick';
    var showRange = mode === 'range';
    $m.find('.trm-quick').toggle(showQuick).val((range && range.quick) || '24h');
    $m.find('.trm-range').toggle(showRange);
    if (showRange) {
      $m.find('.trm-from').val(fromUnixLocal(range && range.from));
      $m.find('.trm-to').val(fromUnixLocal(range && range.to));
    }
  }
  function readUiRange($m) {
    var mode = String($m.find('.trm-mode').val() || 'quick');
    if (mode === 'quick') {
      var quick = String($m.find('.trm-quick').val() || '24h');
      return { mode: 'quick', quick: quick, from: null, to: null };
    }
    var from = toUnix($m.find('.trm-from').val());
    var to   = toUnix($m.find('.trm-to').val());
    if (isFinite(from) && isFinite(to) && from > to) { var t=from; from=to; to=t; }
    return { mode: 'range', quick: '24h', from: from, to: to };
  }

  function Instance($btn, opts) {
    this.$btn = $btn;
    this.opts = $.extend(true, {}, defaults, opts || {});
    this.uid = (++UID);
    this.id = 'trm_'+this.uid;
    this.$modal = $(buildModalHtml(this.id, this.opts)).appendTo(document.body);
    this._open = false;

    // Seed UI
    setUiFromRange(this.$modal, this.opts.range);

    var self = this;

    // Mode changes
    this.$modal.on('change', '.trm-mode', function () {
      var r = readUiRange(self.$modal);
      setUiFromRange(self.$modal, r);
      self.$btn.trigger('tr.change', [r]);
    });
    this.$modal.on('change input', '.trm-quick, .trm-from, .trm-to', function(){
      var r = readUiRange(self.$modal);
      self.$btn.trigger('tr.change', [r]);
    });

    // Apply
    this.$modal.on('click', '.trm-apply', function(){
      var r = readUiRange(self.$modal);
      if (r.mode === 'quick') {
        var abs = resolveQuickRange(r.quick || '24h');
        r.from = abs.from; r.to = abs.to;
      }
      self.$btn.trigger('tr.apply', [r]);
      self.close();
    });

    // Clear → reset to 24h
    this.$modal.on('click', '.trm-clear', function(){
      var r = { mode: 'quick', quick: '24h', from: null, to: null };
      setUiFromRange(self.$modal, r);
      self.$btn.trigger('tr.clear');
      self.close();
    });

    // Button toggles modal
    this.$btn.off('.'+PLUGIN).on('click.'+PLUGIN, function(e){
      e.preventDefault();
      self.open();
    });

    this.$modal.on('shown.bs.modal', function(){ self._open = true; });
    this.$modal.on('hidden.bs.modal', function(){ self._open = false; });
  }

  Instance.prototype.open = function(){ this.$modal.modal('show'); };
  Instance.prototype.close = function(){ this.$modal.modal('hide'); };
  Instance.prototype.getRange = function(){
    var r = readUiRange(this.$modal);
    if (r.mode === 'quick') {
      var abs = resolveQuickRange(r.quick || '24h');
      r.from = abs.from; r.to = abs.to;
    }
    return r;
  };
  Instance.prototype.setRange = function(range){
    this.opts.range = $.extend({}, this.opts.range, range || {});
    setUiFromRange(this.$modal, this.opts.range);
  };
  Instance.prototype.destroy = function(){
    try { this.$modal.modal('hide'); } catch(_){}
    this.$btn.off('.'+PLUGIN);
    this.$modal.off().remove();
    this.$btn.removeData(INST);
  };

  $.fn[PLUGIN] = function(option){
    var args = Array.prototype.slice.call(arguments, 1);
    var ret;
    this.each(function(){
      var $el = $(this);
      var inst = $el.data(INST);
      if (!inst) {
        if (typeof option === 'object' || !option) {
          inst = new Instance($el, option || {});
          $el.data(INST, inst);
        } else {
          return; // calling method before init
        }
      }
      if (typeof option === 'string') {
        if (typeof inst[option] !== 'function') throw new Error(PLUGIN+': unknown method '+option);
        ret = inst[option].apply(inst, args);
      }
    });
    return ret !== undefined ? ret : this;
  };

  // Minimal dark-friendly tweaks (optional)
  if (!document.getElementById('trm-style')) {
    $('<style id="trm-style">')
      .text('body.dark .modal-content{background:#272727;border-color:#3a3a3a;color:#fff;} body.dark .modal-header, body.dark .modal-footer{border-color:#3a3a3a;}')
      .appendTo('head');
  }
})(jQuery);

class ASCHARTMANAGER {
  tabCounter = 1;
  _zoomSyncing = false;

  constructor(opts = {}) {
    this.opts = Object.assign({
      saveUrl: 'includes/moduleutil.php?request=SaveCharts',
      loadUrl: 'includes/moduleutil.php?request=SaveCharts',
      wrap: false,
      field: 'state',
      includeMeta: true,
      saveDebounceMs: 300,
      ajaxHeaders: undefined,

      // Global settings defaults
      gridEnabled: true,
      gridSize: 24,
      snapType: 'end', // 'move' | 'end'

      // Per-chart auto-refresh (SECONDS)
      autoRefreshSecondsDefault: 30,
      autoRefreshOptionsDefault: [0, 10, 20, 30, 60, 120],

      // Global date/time filter defaults (persisted) — no live
      timeDefaults: {
        mode: 'quick',   // 'quick' | 'range'
        quick: '24h',
        from: null,
        to:   null
      }
    }, opts);

    // Global time range state (default to last 24h)
    this._timeRange = Object.assign({}, this.opts.timeDefaults);

    // Debounced POST saver
    this._saveDebounced = this._debounce(() => {
      if (this.opts.saveUrl) {
        this.saveStateToUrl(this.opts.saveUrl, {
          wrap: this.opts.wrap,
          field: this.opts.field,
          includeMeta: this.opts.includeMeta,
          ajax: { headers: this.opts.ajaxHeaders }
        });
      } else {
        this.saveState();
      }
    }, this.opts.saveDebounceMs);

    // Charts queued for hidden tabs
    this._pendingChartsByTab = Object.create(null);

    this.buildHTML();
    this.buildOptionsModal();
    this.setupEvents();
    this._initTimeRangeButton();

    // Lazy build when a tab becomes visible
    $(document)
      .off('shown.bs.tab.asGM')
      .on('shown.bs.tab.asGM', '#as-gm-tablist a[data-toggle="tab"]', (e) => {
        const tabId = $(e.target).attr('href').slice(1);
        this._restoreChartsIfPending(tabId);
      });

    // Auto-load saved state
    if (this.opts.loadUrl) {
      this.loadStateFromUrl(this.opts.loadUrl, {
        clearExisting: true,
        reuseTabIds: true,
        ajax: { headers: this.opts.ajaxHeaders }
      });
    }
  }

  /* ================= UI shell ================= */

  show() {
    let menu = $('#as-charts-toolbox-wrapper');
    if (!menu.hasClass('active')) {
      menu.addClass('active');
      this.buildChartGroups();
    }
  }

  hide() {
    let menu = $('#as-charts-toolbox-wrapper');
    if (menu.hasClass('active')) menu.removeClass('active');
  }

  buildHTML() {
    // Remove any existing manager
    $('#as-chart-manager').remove();

    const chartManager = `
      <div id="as-chart-manager" class="noselect">
        <div id="as-charts-toolbox-wrapper">
          <nav class="navbar navbar-default">
            <div class="container-fluid">
              <div class="collapse navbar-collapse">
                <ul class="nav navbar-nav">
                  <!-- Time Range button (opens plugin popover) -->
                  <li>
                    <button type="button" id="as-tr-btn" class="btn btn-default navbar-btn" title="Time range">
                      <i class="fa-regular fa-clock"></i>
                      <span class="hidden-xs"> Set Time Range</span>
                    </button>
                  </li>
                </ul>
                <ul class="nav navbar-nav navbar-right">
                  <li>
                    <button type="button" class="btn btn-default navbar-btn" id="as-charts-toolbox-options" title="Options">
                      <i class="fa-solid fa-gear"></i>
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </nav>
          <div id="as-charts-groups" class="panel-group">SS</div>
        </div>
      </div>`;

    $('body').append(chartManager);

    if (!document.getElementById('as-gm-style-core')) {
      $('<style id="as-gm-style-core">#as-gm-tablist-content .tab-pane{position:relative;overflow:hidden;}</style>').appendTo('head');
    }
    if (!document.getElementById('as-gm-measuring-style')) {
      $('<style id="as-gm-measuring-style">')
        .text(`
          .as-gm-measuring{
            position:fixed !important;
            left:-10000px !important;
            top:-10000px !important;
            display:block !important;
            visibility:visible !important;
            pointer-events:none !important;
            opacity:1 !important;
            z-index:-1 !important;
          }
          .as-grid-bg {
            background-image:
              linear-gradient(to right, rgba(0,0,0,0.07) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(0,0,0,0.07) 1px, transparent 1px);
          }
        `)
        .appendTo('head');
    }
  }

  /* ================= Options modal ================= */

  buildOptionsModal() {
    if ($('#asChartsOptionsModal').length) return;

    const modal = `
<div class="modal fade" id="asChartsOptionsModal" tabindex="-1" role="dialog" aria-labelledby="asChartsOptionsLabel">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-label="Cancel"><span>&times;</span></button>
        <h4 class="modal-title" id="asChartsOptionsLabel"><i class="fa fa-gear"></i> Chart Manager Options</h4>
      </div>
      <div class="modal-body">
        <form id="asChartsOptionsForm" class="form-horizontal">
          <div class="form-group">
            <label class="col-sm-4 control-label">Grid enabled</label>
            <div class="col-sm-8">
              <div class="checkbox" style="margin-top:0;">
                <label><input type="checkbox" id="opt-grid-enabled"> Enable drag grid / snap</label>
              </div>
              <p class="help-block">When enabled, charts snap to a fixed grid while moving/resizing.</p>
            </div>
          </div>

          <div class="form-group">
            <label for="opt-grid-size" class="col-sm-4 control-label">Grid size (px)</label>
            <div class="col-sm-4">
              <input type="number" class="form-control" id="opt-grid-size" min="4" max="400" step="1" placeholder="px">
            </div>
            <div class="col-sm-4"><p class="help-block">Typical: 8–48</p></div>
          </div>

          <div class="form-group">
            <label for="opt-snap-type" class="col-sm-4 control-label">Drag snap type</label>
            <div class="col-sm-4">
              <select id="opt-snap-type" class="form-control">
                <option value="end">end (snap when released)</option>
                <option value="move">move (snap while dragging)</option>
              </select>
            </div>
            <div class="col-sm-4"><p class="help-block">How snapping behaves during drag.</p></div>
          </div>

          <div class="form-group">
            <label for="opt-default-autorefresh" class="col-sm-4 control-label">Default auto-refresh</label>
            <div class="col-sm-4">
              <select id="opt-default-autorefresh" class="form-control"></select>
            </div>
            <div class="col-sm-4">
              <p class="help-block">Used for <em>newly created</em> charts.</p>
            </div>
          </div>

        </form>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
        <button type="button" id="asChartsOptionsSave" class="btn btn-primary">Save</button>
      </div>
    </div>
  </div>
</div>`;
    $('body').append(modal);

    // Build the default auto-refresh options list once
    const $selAuto = $('#opt-default-autorefresh');
    const opts = this.opts.autoRefreshOptionsDefault || [0, 10, 20, 30, 60, 120];
    $selAuto.empty();
    opts.forEach((sec) => {
      const label = sec === 0 ? 'None' : `${sec}s`;
      $('<option>').val(String(sec)).text(label).appendTo($selAuto);
    });

    // Seed form values
    $('#opt-grid-enabled').prop('checked', !!this.opts.gridEnabled);
    $('#opt-grid-size').val(this.opts.gridSize);
    $('#opt-snap-type').val((this.opts.snapType === 'move') ? 'move' : 'end');
    $selAuto.val(String(this.opts.autoRefreshSecondsDefault));

    // Open modal -> re-seed current values
    $(document).off('click.asOptions').on('click.asOptions', '#as-charts-toolbox-options', () => {
      $('#opt-grid-enabled').prop('checked', !!this.opts.gridEnabled);
      $('#opt-grid-size').val(this.opts.gridSize);
      $('#opt-snap-type').val((this.opts.snapType === 'move') ? 'move' : 'end');
      $selAuto.val(String(this.opts.autoRefreshSecondsDefault));
      $('#asChartsOptionsModal').modal('show');
    });

    // Save/apply + persist (debounced)
    $('#asChartsOptionsSave').off('click').on('click', () => {
      const enabled = $('#opt-grid-enabled').is(':checked');
      let size = parseInt($('#opt-grid-size').val(), 10);
      if (!Number.isFinite(size) || size < 4) size = 4;
      if (size > 400) size = 400;

      let defSecs = parseInt($('#opt-default-autorefresh').val(), 10);
      if (!Number.isFinite(defSecs) || defSecs < 0) defSecs = 0;

      const snapTypeSel = String($('#opt-snap-type').val());
      const snapType = (snapTypeSel === 'move') ? 'move' : 'end';

      this.opts.gridEnabled = enabled;
      this.opts.gridSize = size;
      this.opts.snapType = snapType;

      // Default auto-refresh used for future charts
      this.opts.autoRefreshSecondsDefault = defSecs;

      // Apply to existing charts (SNAP via jQuery API) + grid bg
      this._applySettingsToUI();

      // Persist
      this._saveDebounced();

      $('#asChartsOptionsModal').modal('hide');
    });
  }

  /** Update grid background for a pane based on current settings */
  _updatePaneGridBg($pane) {
    const sz = `${this.opts.gridSize}px ${this.opts.gridSize}px`;
    if (this.opts.gridEnabled) {
      $pane.addClass('as-grid-bg');
      $pane.css({ backgroundSize: sz, backgroundImage: '' });
    } else {
      $pane.removeClass('as-grid-bg');
      $pane.css({ backgroundImage: 'none', backgroundSize: '', backgroundPosition: '' });
    }
  }

  /** Apply UI settings across panes + snapping API */
  _applySettingsToUI() {
    $('#as-gm-tablist-content .tab-pane').each((_, pane) => {
      this._updatePaneGridBg($(pane));
    });
    $('#as-gm-tablist-content .tab-pane').each((_, pane) => {
      this._applySnapToPane($(pane));
    });
  }

  /* ================= Available charts list ================= */

  buildChartGroups() {
    $.ajax({
      url: 'includes/moduleutil.php?request=AvailableGraphs',
      type: 'GET',
      async: false,
      cache: false,
      dataType: 'json',
      success: function (allskyChartData) {
        let idCounter = 1;
        var chartGroups = $('#as-charts-groups');
        chartGroups.html('');

        $.each(allskyChartData, function (categoryName, chartsArray) {
          var collapseId = 'category-' + String(categoryName.replace(/ /g, '-')).toLowerCase();
          var panel = $('<div>', { class: 'panel panel-default chart-category' });
          var heading = $('<div>', { class: 'panel-heading' }).append(
            $('<h4>', { class: 'panel-title' }).append(
              $('<a>', { class: 'collapsed', 'data-toggle': 'collapse', href: '#' + collapseId, text: categoryName })
            )
          );
          var body = $('<div>', { id: collapseId, class: 'panel-collapse collapse' })
            .append($('<div>', { class: 'panel-body' }));

          chartsArray.forEach(function (chart) {
            let enabledClass = chart.enabled ? 'as-cm-chart-entry-enabled' : '';
            var item = $('<div>', {
              id: `as-cm-chart-entry-${idCounter}`,
              class: `as-cm-chart-entry fs-16 noselect ${enabledClass}`,
              'data-module': chart.module,
              'data-filename': chart.filename,
              draggable: chart.enabled
            }).append(
              $('<i>', { class: chart.icon + ' fs-18' }).css({ marginRight: '5px' }),
              chart.title
            );
            idCounter++;
            body.find('.panel-body').append(item);
          });

          panel.append(heading).append(body);
          chartGroups.append(panel);
        });
      }
    });
  }

  /* ================= Tabs ================= */

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

    // Ensure the grid visuals reflect current setting immediately on creation
    this._updatePaneGridBg(newContent);

    newTab.find('a').tab('show');
    return tabId;
  }

  removeTab(tabId) {
    const $pane = $('#' + tabId);
    const $li = $('#as-gm-tablist a[href="#' + tabId + '"]').closest('li');
    const wasActive = $li.hasClass('active');

    try {
      const insts = $pane.data('allskyChart_instances') || [];
      insts.forEach((inst) => {
        try {
          if (typeof inst.destroy === 'function') inst.destroy();
          else if (inst.chart && typeof inst.chart.destroy === 'function') inst.chart.destroy();
          const $node = inst.$root || inst.$el || inst.$container || inst.$box;
          if ($node && $node.length) $node.remove();
        } catch (e) { console.warn('Chart destroy failed:', e); }
      });
      $pane.removeData('allskyChart_instances');
    } catch (e) { console.warn('Instance cleanup failed:', e); }

    if (this._pendingChartsByTab && this._pendingChartsByTab[tabId]) {
      delete this._pendingChartsByTab[tabId];
    }

    const $nextLink = $li.next('li').not('#as-gm-add-tab').find('a[data-toggle="tab"]');
    const $prevLink = $li.prev('li').find('a[data-toggle="tab"]');

    $li.remove();
    $pane.remove();

    if (wasActive) {
      const $toShow = $nextLink.length ? $nextLink : $prevLink;
      if ($toShow && $toShow.length) {
        $toShow.tab('show');
        const newId = $toShow.attr('href').slice(1);
        this._restoreChartsIfPending(newId);
      }
    }

    if (this.opts && this.opts.saveUrl) {
      this.saveStateToUrl(this.opts.saveUrl, {
        wrap: this.opts.wrap,
        field: this.opts.field,
        includeMeta: this.opts.includeMeta,
        ajax: { headers: this.opts.ajaxHeaders }
      }).catch((e) => console.warn('Save after delete failed:', e));
    } else {
      this.saveState();
    }
  }

  startRename(a) {
    const href = a.attr('href');
    if (href) this._ensureTitleSpan(href.slice(1));
    const $title = a.find('.tab-title');
    if (a.find('.tab-title-editor').length) return;

    const current = ($title.text() || '').trim();
    const $input = $('<input type="text" class="form-control input-sm tab-title-editor">').val(current);

    $('.as-gm-tab-tools').css({ visibility: 'hidden', display: 'none' });
    $title.replaceWith($input);
    $input.focus().select();

    const finish = (saveIt) => {
      const newText = saveIt ? ($input.val().trim() || current) : current;
      $input.replaceWith(`<span class="tab-title">${$('<div>').text(newText).html()}</span>`);
      $('.as-gm-tab-tools').css({ visibility: 'visible', display: 'inline' });

      if (this.opts && this.opts.saveUrl) {
        this.saveStateToUrl(this.opts.saveUrl, {
          wrap: this.opts.wrap,
          field: this.opts.field,
          includeMeta: this.opts.includeMeta,
          ajax: { headers: this.opts.ajaxHeaders }
        }).catch((e) => console.warn('Rename save failed:', e));
      } else {
        this.saveState();
      }
    };

    $input.on('keydown', (e) => { if (e.key === 'Enter') finish(true); if (e.key === 'Escape') finish(false); });
    $input.on('blur', () => finish(true));
  }

  /* ================= Events / DnD ================= */

  setupEvents() {
    $('#as-charts-menu').off('click').on('click', (e) => this.show());

    $(document).on('click', (e) => {
      let isInside = $(e.target).closest('#as-charts-toolbox-wrapper').length > 0;
      let isExcluded = $(e.target).closest('#as-charts-menu').length > 0;
      if (!isInside && !isExcluded) this.hide();
    });

    $('#as-gm-add-tab').off('click').on('click', (e) => this.addTab());

    $('#as-gm-tablist')
      .on('click', '.close-tab', (e) => {
        e.stopPropagation();
        var tabId = $(e.currentTarget).closest('a').attr('href').substring(1);
        this.removeTab(tabId);
      })
      .on('dblclick', '.tab-title', (e) => {
        let el = e.currentTarget;
        e.stopPropagation();
        e.preventDefault();
        this.startRename($(el).closest('a'));
      });

    $(document).on('dragover', '.as-gm-tab', function (e) { e.preventDefault(); });

    $(document).on('dragstart', '.as-cm-chart-entry', function (e) {
      e.originalEvent.dataTransfer.setData('id', $(this).attr('id'));
    });

    // Drop → queue/build; seed auto-refresh defaults for new chart
    $(document).on('drop', '.as-gm-tab', (e) => {
      let targetTab = e.currentTarget.id;
      let elId = e.originalEvent.dataTransfer.getData('id');
      if (!elId) return;
      elId = $(`#${elId}`);

      let chartFileName = elId.data('filename');

      let $pane = $(`#${targetTab}`);
      // Respect grid enabled/disabled for background
      this._updatePaneGridBg($pane);

      const timeQ = this._timeQueryString(); // include global time range
      this._createChartFromState($pane, {
        filename: chartFileName,
        top: 0, left: 0, width: 320, height: 240,
        autoRefreshSeconds: this.opts.autoRefreshSecondsDefault | 0,
        _timeQ: timeQ
      });
    });
  }

  /* ================= Instances / bounds / refresh ================= */

  getAllChartBoundsIn(tab) {
    var instances = tab.data('allskyChart_instances') || [];
    return instances
      .map((inst, i) => {
        const b = inst.getBounds && inst.getBounds();
        if (!b) return null;

        // read seconds (prefer API, then internal mirror, then DOM select)
        let seconds = null;
        try {
          if (typeof inst.getAutoRefreshSeconds === 'function') {
            const s = parseInt(inst.getAutoRefreshSeconds(), 10);
            if (Number.isFinite(s)) seconds = s;
          }
          if (seconds == null && typeof inst._autoSeconds === 'number') {
            seconds = inst._autoSeconds | 0;
          }
          if (seconds == null) {
            const $root = inst.$root || inst.$el || inst.$container || inst.$box || $([]);
            const $sel = $root.find('[data-role="auto-refresh"], [name="autoRefresh"], .auto-refresh, .as-hc-autorefresh').filter('select').first();
            if ($sel.length) seconds = Math.max(0, parseInt($sel.val(), 10) || 0);
          }
        } catch (e) {
          console.warn('read auto-refresh seconds failed:', e);
        }

        const out = {
          index: i,
          title: inst.$title ? inst.$title.text() : null,
          top: b.top,
          left: b.left,
          width: b.width,
          height: b.height,
          filename: b.filename || null
        };
        if (seconds != null) out.autoRefreshSeconds = Math.max(0, seconds | 0);
        return out;
      })
      .filter(Boolean);
  }

  _makeMeasurable($pane, fn) {
    if ($pane.is(':visible')) return fn();

    const el = $pane[0];
    const s = el.style;
    const orig = {
      display: s.display,
      visibility: s.visibility,
      position: s.position,
      left: s.left,
      top: s.top,
      width: s.width
    };

    $pane.addClass('as-gm-measuring');

    const $host = $('#as-gm-tablist-content');
    const hostW = $host.width() || $pane.parent().width() || 800;
    s.width = hostW + 'px';
    el.offsetHeight;

    let out;
    try { out = fn(); }
    finally {
      $pane.removeClass('as-gm-measuring');
      s.display = orig.display;
      s.visibility = orig.visibility;
      s.position = orig.position;
      s.left = orig.left;
      s.top = orig.top;
      s.width = orig.width;
    }
    return out;
  }

  /* ================= SAVE ================= */

  saveState() {
    const payload = this._collectState();
    return JSON.stringify(payload, null, 2);
  }

  _collectState() {
    const tabs = [];

    $('#as-gm-tablist-content .tab-pane').each((_, el) => {
      const $pane = $(el);
      const tabId = $pane.attr('id');
      const title = this._getTabTitle(tabId);

      const created = this._makeMeasurable($pane, () => {
        return this.getAllChartBoundsIn($pane) || [];
      }) || [];

      const queuedRaw = (this._pendingChartsByTab && this._pendingChartsByTab[tabId])
        ? this._pendingChartsByTab[tabId]
        : [];

      const queued = queuedRaw.map((c) => this._normalizeBounds(c));
      const charts = created.concat(queued);

      tabs.push({ tabId, title, charts });
    });

    return {
      settings: {
        gridEnabled: !!this.opts.gridEnabled,
        gridSize: this.opts.gridSize | 0,
        snapType: (this.opts.snapType === 'move') ? 'move' : 'end',
        defaultAutoRefreshSeconds: this.opts.autoRefreshSecondsDefault | 0,
        timeRange: this._timeRange || this.opts.timeDefaults // persist global time range
      },
      tabs
    };
  }

  saveStateToUrl(url, opts = {}) {
    const { wrap = false, field = 'state', includeMeta = true, ajax = {} } = opts;

    const state = this._collectState();
    let payload = state;
    if (wrap) {
      payload = { [field]: state };
      if (includeMeta) {
        payload.meta = { savedAt: new Date().toISOString(), version: 5 };
      }
    }

    return $.ajax(Object.assign({
      url,
      method: 'POST',
      data: JSON.stringify(payload),
      contentType: 'application/json; charset=utf-8',
      dataType: 'json',
      cache: false,
      headers: this.opts.ajaxHeaders
    }, ajax));
  }

  /* ================= LOAD ================= */

  loadStateFromUrl(url, opts = {}) {
    const { clearExisting = true, reuseTabIds = true, ajax = {} } = opts;

    return $.ajax(Object.assign({
      url,
      method: 'GET',
      dataType: 'json',
      cache: false,
      headers: this.opts.ajaxHeaders
    }, ajax)).then((resp) => {
      let payload = (resp && resp.state) ? resp.state : resp;

      if (Array.isArray(payload)) {
        this.loadState({ tabs: payload }, { clearExisting, reuseTabIds });
      } else if (payload && typeof payload === 'object') {
        this.loadState(payload, { clearExisting, reuseTabIds });
      } else {
        console.info('loadStateFromUrl(): empty state, leaving tabs unchanged');
      }
    }).catch((xhr, status, err) => {
      console.error('loadStateFromUrl(): AJAX error', { status, err, xhr });
    });
  }

  loadState(state, opts = {}) {
    const { clearExisting = true, reuseTabIds = true } = opts;

    const data = (typeof state === 'string') ? JSON.parse(state) : state;
    if (!data) return;

    // Settings (defaults if missing)
    const settings = data.settings || {};
    this.opts.gridEnabled = (typeof settings.gridEnabled === 'boolean') ? settings.gridEnabled : true;
    this.opts.gridSize = Number.isFinite(settings.gridSize) ? Math.max(4, Math.min(400, settings.gridSize | 0)) : 24;

    const snapType = (settings.snapType === 'move') ? 'move' : 'end';
    this.opts.snapType = snapType;

    if (Number.isFinite(settings.defaultAutoRefreshSeconds)) {
      this.opts.autoRefreshSecondsDefault = Math.max(0, settings.defaultAutoRefreshSeconds | 0);
    }

    // restore global timeRange; coerce legacy 'live' to quick 24h
    this._timeRange = (settings.timeRange && typeof settings.timeRange === 'object')
      ? Object.assign({}, this.opts.timeDefaults, settings.timeRange)
      : Object.assign({}, this.opts.timeDefaults);

    if (!this._timeRange || (this._timeRange.mode !== 'quick' && this._timeRange.mode !== 'range')) {
      this._timeRange = { mode: 'quick', quick: '24h', from: null, to: null };
      try { $('#as-tr-btn').timeRangeModal('setRange', this._timeRange); } catch (_){}
    }

    // Apply settings to panes right away (background grid & snap) + seed dialog
    this._applySettingsToUI();
    $('#opt-grid-enabled').prop('checked', !!this.opts.gridEnabled);
    $('#opt-grid-size').val(this.opts.gridSize);
    $('#opt-snap-type').val(this.opts.snapType);
    $('#opt-default-autorefresh').val(String(this.opts.autoRefreshSecondsDefault));

    // Update timeRange button plugin UI if present
    try { $('#as-tr-btn').timeRangePicker('setRange', this._timeRange); } catch (_) {}

    const tabs = Array.isArray(data.tabs) ? data.tabs : (Array.isArray(data) ? data : []);
    if (tabs.length === 0) {
      console.info('loadState(): empty tabs, leaving current tabs unchanged');
      return;
    }

    if (clearExisting && !reuseTabIds) {
      $('#as-gm-tablist-content .tab-pane').remove();
      $('#as-gm-tablist li').not('#as-gm-add-tab').remove();
      this.tabCounter = 1;
    } else if (clearExisting && reuseTabIds) {
      const keepIds = new Set(tabs.map(t => t.tabId).filter(Boolean));
      $('#as-gm-tablist-content .tab-pane').each((_, el) => {
        const id = el.id;
        if (!keepIds.has(id)) $(el).remove();
      });
      $('#as-gm-tablist li').each((_, li) => {
        const $a = $(li).find('a[href^="#"]');
        if (!$a.length) return;
        const id = $a.attr('href').slice(1);
        if (!keepIds.has(id)) $(li).remove();
      });
    }

    tabs.forEach((t, idx) => {
      let tabId = t.tabId || '';
      const title = (t.title || `Tab ${idx + 1}`).trim();
      const charts = Array.isArray(t.charts) ? t.charts : [];

      const exists = tabId && $(`#${tabId}`).length > 0;
      if (reuseTabIds && exists) {
        this._setTabTitle(tabId, title);
        const $pane = $(`#${tabId}`).empty().addClass('tab-pane as-gm-tab');
        this._updatePaneGridBg($pane);
      } else {
        tabId = this.addTab(title);
        if (reuseTabIds && t.tabId && tabId !== t.tabId) { this._renameTabIds(tabId, t.tabId); tabId = t.tabId; }
        const $pane = $(`#${tabId}`);
        this._updatePaneGridBg($pane);
      }

      this._pendingChartsByTab[tabId] = (this._pendingChartsByTab[tabId] || []).concat(charts);
    });

    const $active = $('#as-gm-tablist li.active a[data-toggle="tab"]');
    if ($active.length) {
      this._restoreChartsIfPending($active.attr('href').slice(1));
    } else {
      const $first = $('#as-gm-tablist li:not(#as-gm-add-tab) a[data-toggle="tab"]').first();
      if ($first.length) $first.tab('show');
    }

    // Apply global time range to all charts once after load
    this._applyTimeRangeToAllPanes();
  }

  /* ================= Title / ID helpers ================= */

  _ensureTitleSpan(tabId) {
    const $a = $(`#as-gm-tablist a[href="#${tabId}"]`);
    if (!$a.length) return $();
    let $title = $a.find('.tab-title');
    if ($title.length) return $title;

    const $clone = $a.clone();
    $clone.find('.as-gm-tab-tools, i, .close, button').remove();
    const text = ($clone.text() || '').trim() || 'Tab';
    const $tools = $a.find('.as-gm-tab-tools').detach();
    $a.empty().append(`<span class="tab-title">${$('<div>').text(text).html()}</span>`);
    if ($tools.length) $a.append($tools);
    return $a.find('.tab-title');
  }

  _getTabTitle(tabId) {
    const $a = $(`#as-gm-tablist a[href="#${tabId}"]`);
    if (!$a.length) return '';
    const $title = this._ensureTitleSpan(tabId);
    return ($title.text() || '').trim();
  }

  _setTabTitle(tabId, title) {
    const $title = this._ensureTitleSpan(tabId);
    if ($title.length) $title.text(title);
  }

  _renameTabIds(oldId, newId) {
    if (!oldId || !newId || oldId === newId) return;
    const $pane = $(`#${oldId}`);
    const $link = $(`#as-gm-tablist a[href="#${oldId}"]`);
    if ($pane.length) $pane.attr('id', newId);
    if ($link.length) $link.attr('href', `#${newId}`);
  }

  /* ================= Bounds / normalize / create ================= */

  _toNumber(v, fallback = 0) {
    if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v);
    if (typeof v === 'string') {
      const n = parseFloat(v.trim());
      if (Number.isFinite(n)) return Math.round(n);
    }
    return Math.round(fallback);
  }

  _normalizeBounds(c) {
    // Priority: autoRefreshSeconds (seconds) → legacy refresh.intervalMs (ms)
    let seconds = null;
    if (c && c.autoRefreshSeconds != null && Number.isFinite(+c.autoRefreshSeconds)) {
      seconds = Math.max(0, (+c.autoRefreshSeconds) | 0);
    } else if (c && c.refresh && Number.isFinite(+c.refresh.intervalMs)) {
      seconds = Math.max(0, Math.round(+c.refresh.intervalMs / 1000));
    }

    return {
      top: this._toNumber(c.top, 0),
      left: this._toNumber(c.left, 0),
      width: this._toNumber(c.width, 320),
      height: this._toNumber(c.height, 240),
      filename: c.filename || null,
      ...(seconds != null ? { autoRefreshSeconds: seconds } : {})
    };
  }

  _createChartFromState($pane, c, { force = false } = {}) {
    if (!force && !$pane.is(':visible')) {
      const tabId = $pane.attr('id');
      (this._pendingChartsByTab[tabId] ||= []).push(c);
      return;
    }

    const nc = this._normalizeBounds(c);
    if (!nc.filename) return;

    const beforeLen = ($pane.data('allskyChart_instances') || []).length;

    // seconds (saved → default)
    const seconds = (nc.autoRefreshSeconds != null && Number.isFinite(+nc.autoRefreshSeconds))
      ? Math.max(0, (+nc.autoRefreshSeconds) | 0)
      : (this.opts.autoRefreshSecondsDefault | 0);

    const timeQ = (typeof c._timeQ === 'string') ? c._timeQ : this._timeQueryString();

    $pane.allskyChart({
      configUrl: 'includes/moduleutil.php?request=GraphData&filename=' + encodeURIComponent(nc.filename) + timeQ,
      filename: nc.filename,

      initialPos: { top: nc.top, left: nc.left },
      initialSize: { width: nc.width, height: nc.height },

      grid: {
        enabled: !!this.opts.gridEnabled,
        size: { x: this.opts.gridSize, y: this.opts.gridSize },
        snap: this.opts.snapType || 'end'
      },

      // plugin's expected autoRefresh signature (seconds)
      autoRefresh: {
        enabled: true,
        options: this.opts.autoRefreshOptionsDefault.slice(0),
        defaultSeconds: seconds
      },

      // Persist when user changes the dropdown in the chart
      onAutoRefreshChange: (secs, inst) => this._onAutoRefreshChange(secs, inst),

      onBoundsChange: () => this._saveDebounced(),
      onDelete: () => this._saveDebounced()
    });

    // Enforce bounds + auto-refresh + SNAP post-init
    requestAnimationFrame(() => {
      const after = $pane.data('allskyChart_instances') || [];
      const newInsts = after.slice(beforeLen);
      newInsts.forEach((inst) => {
        this._applyBounds(inst, nc);
        this._applyAutoRefresh(inst, seconds);
        try {
          if (typeof inst.setTimeRange === 'function') inst.setTimeRange(this._timeRange);
          inst._gmLastTimeRangeSig = JSON.stringify(this._timeRange || {});
          inst._gmLastTimeQ = timeQ;
        } catch (_) {}
      });

      // Apply snapping via the jQuery plugin API to ALL charts in this pane
      this._applySnapToPane($pane);
    });
  }

  _restoreChartsIfPending(tabId) {
    const pending = this._pendingChartsByTab[tabId];
    if (!pending || !pending.length) return;
    const $pane = $(`#${tabId}`);
    // Ensure background reflects setting
    this._updatePaneGridBg($pane);
    pending.splice(0).forEach((c) => this._createChartFromState($pane, c, { force: true }));
  }

  _applyBounds(inst, b) {
    try {
      if (!inst) return;
      if (typeof inst.setBounds === 'function') {
        inst.setBounds(b);
      } else {
        if (typeof inst.setPosition === 'function') inst.setPosition(b.left, b.top);
        if (typeof inst.setSize === 'function') inst.setSize(b.width, b.height);
        const $node = inst.$root || inst.$el || inst.$container || inst.$box;
        if ($node && $node.length) {
          if ($node.css('position') === 'static') $node.css('position', 'absolute');
          $node.css({ top: b.top, left: b.left, width: b.width, height: b.height });
        }
      }
      if (typeof inst.reflow === 'function') inst.reflow();
      if (inst.chart && typeof inst.chart.reflow === 'function') inst.chart.reflow();
    } catch (e) {
      console.warn('Bounds enforcement failed:', e);
    }
  }

  _applyAutoRefresh(inst, seconds) {
    if (!inst) return;
    try {
      if (typeof inst.setAutoRefresh === 'function') {
        inst.setAutoRefresh(Math.max(0, parseInt(seconds, 10) || 0));
      } else {
        inst._autoSeconds = Math.max(0, parseInt(seconds, 10) || 0);
        const $root = inst.$root || inst.$el || inst.$container || inst.$box || $([]);
        const $sel = $root.find('[data-role="auto-refresh"], [name="autoRefresh"], .auto-refresh, .as-hc-autorefresh').filter('select').first();
        if ($sel.length) { $sel.val(String(inst._autoSeconds)).trigger('change'); }
      }
      inst._autoSeconds = Math.max(0, parseInt(seconds, 10) || 0);
    } catch (e) {
      console.warn('apply auto-refresh to instance failed:', e);
    }
  }

  // >>> SNAP application using jQuery plugin API:
  _applySnapToPane($pane) {
    try {
      const enabled = !!this.opts.gridEnabled;
      const size = Math.max(1, this.opts.gridSize | 0);
      const type = (this.opts.snapType === 'move') ? 'move' : 'end';

      $pane.allskyChart('setSnapEnabled', enabled);
      $pane.allskyChart('setSnapType', type);
      $pane.allskyChart('setSnapSize', size);
    } catch (e) {
      console.warn('apply snap to pane failed:', e);
    }
  }

  _onAutoRefreshChange(seconds, inst) {
    try {
      const secs = Math.max(0, parseInt(seconds, 10) || 0);
      inst._autoSeconds = secs; // mirror for saving
      this._saveDebounced();
    } catch (e) {
      console.warn('onAutoRefreshChange handler failed:', e);
    }
  }

  /* ================= Utils ================= */

  _debounce(fn, wait = 300) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), wait); };
  }

  /* ================= Global Time Range: helpers & apply ================= */

  _resolveQuickRange(quick) {
    const now = Math.floor(Date.now() / 1000);
    const map = {
      '1h': now - 3600,
      '6h': now - 6 * 3600,
      '24h': now - 24 * 3600,
      '7d': now - 7 * 86400,
      '30d': now - 30 * 86400
    };
    const from = map[quick] != null ? map[quick] : (now - 24 * 3600);
    return { from, to: now };
  }

  // Always produce from/to — quick expands to absolute
  _timeQueryString() {
    const tr = this._timeRange || this.opts.timeDefaults || { mode:'quick', quick:'24h' };
    let from, to;

    if (tr.mode === 'range' && Number.isFinite(tr.from) && Number.isFinite(tr.to)) {
      from = tr.from; to = tr.to;
    } else {
      const q = this._resolveQuickRange(tr.quick || '24h');
      from = q.from; to = q.to;
    }

    if (from > to) { const tmp = from; from = to; to = tmp; }
    return `&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  }

  _cacheBust(url) {
    if (!url) return url;
    // strip previous _ts
    url = url.replace(/([?&])_ts=\d+(&|$)/, (m,p1,p2)=> p2 ? p1 : '');
    const ts = Date.now();
    const sep = url.indexOf('?') === -1 ? '?' : '&';
    return `${url}${sep}_ts=${ts}`;
  }

  _refreshInstOnce(inst) {
    if (inst._gmRefreshScheduled) return;
    inst._gmRefreshScheduled = true;
    requestAnimationFrame(() => {
      inst._gmRefreshScheduled = false;
      if (typeof inst.refresh === 'function') inst.refresh();
    });
  }

  _applyTimeRangeToAllPanes() {
    const extra = this._timeQueryString();                // &from=...&to=...
    const trSig = JSON.stringify(this._timeRange || {});  // signature

    $('#as-gm-tablist-content .tab-pane').each((_, pane) => {
      const $pane = $(pane);
      const insts = ($pane.data('allskyChart_instances') || []).filter(Boolean);

      insts.forEach((inst) => {
        try {
          const oldUrl = (inst.opts && inst.opts.configUrl) || '';

          // strip old from/to
          const withoutOldFT = oldUrl.replace(/([?&])(from|to)=[^&]*/g, '').replace(/[?&]$/, '');
          const sep = withoutOldFT.indexOf('?') === -1 ? '?' : '&';
          const withFT = extra ? (withoutOldFT + sep + extra.slice(1)) : withoutOldFT;

          // add cache-buster so the server actually gives us fresh data
          const newUrl = this._cacheBust(withFT);

          const urlChanged = newUrl !== oldUrl;
          const trChanged  = trSig !== inst._gmLastTimeRangeSig;

          if (inst.opts) inst.opts.configUrl = newUrl;

          // Inform plugin (if it supports client-side filtering)
          if (typeof inst.setTimeRange === 'function') {
            inst.setTimeRange(this._timeRange);
          }

          if (urlChanged || trChanged) {
            inst._gmLastTimeRangeSig = trSig;
            inst._gmLastTimeQ = extra;
            this._refreshInstOnce(inst);
          }
        } catch (e) {
          console.warn('apply time range failed:', e);
        }
      });
    });
  }

  _initTimeRangeButton() {
    const saved = this._timeRange || this.opts.timeDefaults || { mode: 'quick', quick: '24h', from: null, to: null };
    const $btn = $('#as-tr-btn');
    if (!$btn.length) return;

    // Initialize Bootstrap 3 modal version (ensure the plugin file above is loaded)
    try { $btn.timeRangeModal({ range: saved, modalTitle: 'Time range', dialogClass: '' /* or modal-sm / modal-lg */ }); } catch (e) {}

    // Apply handler
    $btn.on('tr.apply', (e, range) => {
      this._timeRange = range;                  // store (absolute for quick)
      this._applyTimeRangeToAllPanes();         // rewrite URLs + refresh
      this._saveDebounced();                    // persist to server
    });

    // Clear handler (reset to Last 24h)
    $btn.on('tr.clear', () => {
      this._timeRange = { mode:'quick', quick:'24h', from:null, to:null };
      this._applyTimeRangeToAllPanes();
      this._saveDebounced();
    });

    // Optional: preview changes while editing
    // $btn.on('tr.change', (e, range) => {});
  }
}