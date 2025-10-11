"use strict";

class ASCHARTMANAGER {
  tabCounter = 1;

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
      autoRefreshSecondsDefault: 30,             // used for NEW charts
      autoRefreshOptionsDefault: [0, 10, 20, 30, 60, 120]
    }, opts);

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

    // Lazy build when a tab becomes visible
    $(document).on('shown.bs.tab', '#as-gm-tablist a[data-toggle="tab"]', (e) => {
      const tabId = $(e.target).attr('href').slice(1);
      this._restoreChartsIfPending(tabId);
    });

    // Auto-load
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
    let chartManager = `
      <div id="as-chart-manager" class="noselect">
        <div id="as-charts-toolbox-wrapper">
          <nav class="navbar navbar-default">
            <div class="container-fluid">
              <div class="collapse navbar-collapse">
                <ul class="nav navbar-nav"></ul>
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
    $('#s-chart-manager').remove();
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
        <!-- Swapped order: Cancel first, Save last -->
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
      // Show grid: ensure class is present and clear any inline override
      $pane.addClass('as-grid-bg');
      $pane.css({
        backgroundSize: sz,
        backgroundImage: '' // remove 'none' override so CSS class can show the grid
      });
    } else {
      // Hide grid completely
      $pane.removeClass('as-grid-bg');
      $pane.css({
        backgroundImage: 'none',
        backgroundSize: '',          // optional: clear size
        backgroundPosition: ''       // optional: reset
      });
    }
  }

  /** Apply UI settings across panes + snapping API */
  _applySettingsToUI() {
    // Update each pane's background grid visibility + size
    $('#as-gm-tablist-content .tab-pane').each((_, pane) => {
      this._updatePaneGridBg($(pane));
    });

    // Apply snap settings to each pane via jQuery plugin API
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
          var collapseId = 'category-' + String(categoryName).toLowerCase();
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

      this._createChartFromState($pane, {
        filename: chartFileName,
        top: 0, left: 0, width: 320, height: 240,
        // seconds default — pulled from settings dialog value
        autoRefreshSeconds: this.opts.autoRefreshSecondsDefault | 0
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
        defaultAutoRefreshSeconds: this.opts.autoRefreshSecondsDefault | 0
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

  /* ================= LOAD (legacy + new) ================= */

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

    // Apply settings to panes right away (background grid & snap) + seed dialog
    this._applySettingsToUI();
    $('#opt-grid-enabled').prop('checked', !!this.opts.gridEnabled);
    $('#opt-grid-size').val(this.opts.gridSize);
    $('#opt-snap-type').val(this.opts.snapType);
    $('#opt-default-autorefresh').val(String(this.opts.autoRefreshSecondsDefault));

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

    const $first = $('#as-gm-tablist li:not(#as-gm-add-tab) a[data-toggle="tab"]').first();
    if ($first.length) {
      $first.tab('show');
      const firstId = $first.attr('href').slice(1);
      this._restoreChartsIfPending(firstId);
    }
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

    $pane.allskyChart({
      configUrl: 'includes/moduleutil.php?request=GraphData&filename=' + encodeURIComponent(nc.filename),
      filename: nc.filename,

      initialPos: { top: nc.top, left: nc.left },
      initialSize: { width: nc.width, height: nc.height },

      // Keep grid object for backward compatibility;
      // authoritative snapping is applied below via API.
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
  // $pane.allskyChart('setSnapEnabled', bool)
  // $pane.allskyChart('setSnapType', 'move' | 'end')
  // $pane.allskyChart('setSnapSize', number | {x,y})
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

  // Persist when plugin notifies a change from its UI
  _onAutoRefreshChange(seconds, inst) {
    try {
      const secs = Math.max(0, parseInt(seconds, 10) || 0);
      inst._autoSeconds = secs; // mirror for saving
      this._saveDebounced();
    } catch (e) {
      console.warn('onAutoRefreshChange handler failed:', e);
    }
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

  /* ================= Utils ================= */

  _debounce(fn, wait = 300) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), wait); };
  }
}
