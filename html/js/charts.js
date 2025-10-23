"use strict";

/**
 * ASCHARTMANAGER
 * - Manages tabs of draggable/resizable charts (allskyChart plugin).
 * - Persists layout and global settings (including a global time range).
 * - Applies the global time range to every chart and forces reloads when it changes.
 * - Integrates with a chart designer for creating/editing custom charts.
 */
class ASCHARTMANAGER {
  tabCounter = 1;
  _zoomSyncing = false;

  constructor(opts = {}) {
    this.opts = Object.assign({
      saveUrl: 'includes/chartutil.php?request=SaveCharts',
      loadUrl: 'includes/chartutil.php?request=SaveCharts',
      wrap: false,
      field: 'state',
      includeMeta: true,
      saveDebounceMs: 300,
      ajaxHeaders: undefined,

      // Grid / snapping defaults (global)
      gridEnabled: true,
      gridSize: 24,
      snapType: 'end', // 'move' or 'end'

      // Chart auto-refresh defaults (per chart)
      autoRefreshSecondsDefault: 30,
      autoRefreshOptionsDefault: [0, 10, 20, 30, 60, 120],

      // Global time-range defaults (persisted)
      timeDefaults: { mode: 'quick', quick: '24h', from: null, to: null },

      // Designer integration options
      designer: {
        enabled: true,
        devPanel: true,
        mountSelector: 'body',
        variablesUrl: 'includes/chartutil.php?request=AvailableVariables',
        graphDataUrl: 'includes/chartutil.php?request=GraphData',
        saveUrl: 'includes/chartutil.php?request=SaveCustomChart',
        loadChartUrl: 'includes/chartutil.php?request=LoadCustomChart'
      }
    }, opts);

    // Global time-range state
    this._timeRange = Object.assign({}, this.opts.timeDefaults);

    // Debounced saver (URL or local)
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

    // Charts queued for tabs that are not visible yet
    this._pendingChartsByTab = Object.create(null);

    this.buildHTML();
    this.injectListStyles();
    this.buildOptionsModal();
    this.setupEvents();
    this._initTimeRangeButton();
    this._initDesignerIntegration();

    // When a tab is shown, instantiate any queued charts in that tab
    $(document)
      .off('shown.bs.tab.asGM')
      .on('shown.bs.tab.asGM', '#as-gm-tablist a[data-toggle="tab"]', (e) => {
        const tabId = $(e.target).attr('href').slice(1);
        this._restoreChartsIfPending(tabId);
      });

    // Initial load of saved state (tabs/layout/settings/time-range)
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
    const menu = $('#as-charts-toolbox-wrapper');
    if (!menu.hasClass('active')) {
      menu.addClass('active');
      this.buildChartGroups();
    }
  }

  hide() {
    const menu = $('#as-charts-toolbox-wrapper');
    if (menu.hasClass('active')) menu.removeClass('active');
  }

  /**
   * Mounts the static manager UI (toolbox, tabs container) and core styles.
   */
  buildHTML() {
    $('#as-chart-manager').remove();

    const chartManager = `
      <div id="as-chart-manager" class="noselect">
        <div id="as-charts-toolbox-wrapper">
          <nav class="navbar navbar-default">
            <div class="container-fluid">
              <div class="collapse navbar-collapse">
                <ul class="nav navbar-nav">
                  ${this.opts.designer && this.opts.designer.enabled ? `
                  <li>
                  </li>` : ``}
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
          <div id="as-charts-groups" class="panel-group"></div>
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

  /**
   * Styles for the left list (available chart entries).
   */
  injectListStyles() {
    if (document.getElementById('asg-list-style')) return;
    $('<style id="asg-list-style">')
      .text(`
        .as-cm-chart-entry { padding:8px 10px; display:flex; align-items:center; justify-content:space-between; border:0 !important; }
        .as-cm-title { display:inline-flex; align-items:center; gap:6px; cursor:grab; }
        .as-cm-title:active { cursor:grabbing; }
        .as-cm-actions { margin-left:auto; display:inline-flex; gap:6px; }
        .as-cm-actions .btn { padding:2px 6px; }
      `)
      .appendTo('head');
  }

  /* ================= Options modal ================= */

  /**
   * Builds the Options modal and binds its controls to manager settings.
   */
  buildOptionsModal() {
    if ($('#asChartsOptionsModal').length) return;

    const modal = `
<div class="modal fade" id="asChartsOptionsModal" tabindex="-1" role="dialog" aria-labelledby="asChartsOptionsLabel">
  <div class="modal-dialog modal-lg" role="document">
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
      <div class="modal-footer" style="background:#fafafa;">
        <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
        <button type="button" id="asChartsOptionsSave" class="btn btn-primary">Save</button>
      </div>
    </div>
  </div>
</div>`;
    $('body').append(modal);

    const $selAuto = $('#opt-default-autorefresh');
    const opts = this.opts.autoRefreshOptionsDefault || [0, 10, 20, 30, 60, 120];
    $selAuto.empty();
    opts.forEach((sec) => {
      const label = sec === 0 ? 'None' : `${sec}s`;
      $('<option>').val(String(sec)).text(label).appendTo($selAuto);
    });

    $('#opt-grid-enabled').prop('checked', !!this.opts.gridEnabled);
    $('#opt-grid-size').val(this.opts.gridSize);
    $('#opt-snap-type').val((this.opts.snapType === 'move') ? 'move' : 'end');
    $selAuto.val(String(this.opts.autoRefreshSecondsDefault));

    $(document).off('click.asOptions').on('click.asOptions', '#as-charts-toolbox-options', () => {
      $('#opt-grid-enabled').prop('checked', !!this.opts.gridEnabled);
      $('#opt-grid-size').val(this.opts.gridSize);
      $('#opt-snap-type').val((this.opts.snapType === 'move') ? 'move' : 'end');
      $selAuto.val(String(this.opts.autoRefreshSecondsDefault));
      $('#asChartsOptionsModal').modal('show');
    });

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
      this.opts.autoRefreshSecondsDefault = defSecs;

      this._applySettingsToUI();
      this._saveDebounced();

      $('#asChartsOptionsModal').modal('hide');
    });
  }

  /**
   * Applies grid background to a pane according to current settings.
   */
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

  /**
   * Refreshes UI elements impacted by settings (grid background + snapping).
   */
  _applySettingsToUI() {
    $('#as-gm-tablist-content .tab-pane').each((_, pane) => {
      this._updatePaneGridBg($(pane));
    });
    $('#as-gm-tablist-content .tab-pane').each((_, pane) => {
      this._applySnapToPane($(pane));
    });
  }

  /* ================= Available charts list ================= */

  /**
   * Loads and renders the list of available charts (grouped).
   */
  buildChartGroups() {
    $.ajax({
      url: 'includes/chartutil.php?request=AvailableGraphs',
      type: 'GET',
      async: false,
      cache: false,
      dataType: 'json',
      success: (allskyChartData) => {
        const chartGroups = $('#as-charts-groups');
        chartGroups.empty();

        $.each(allskyChartData, (categoryName, chartsArray) => {
          const collapseId = 'category-' + String(categoryName.replace(/ /g, '-')).toLowerCase();

          const $panel  = $('<div>', { class: 'panel panel-default chart-category' });

          const $heading = $('<div>', { class: 'panel-heading' }).append(
            $('<h4>', { class: 'panel-title' }).append(
              $('<a>', { class: 'collapsed', 'data-toggle': 'collapse', href: '#' + collapseId, text: categoryName })
            )
          );

          const $bodyWrap = $('<div>', { id: collapseId, class: 'panel-collapse collapse' });
          const $body = $('<div>', { class: 'panel-body' });

          (chartsArray || []).forEach((chart) => {
            const enabledClass = chart.enabled ? 'as-cm-chart-entry-enabled' : '';
            const safeId = String(chart.filename || chart.title || 'chart').replace(/[^\w\-:.]/g, '_');

            const $title = $('<span class="as-cm-title" draggable="'+(!!chart.enabled)+'">')
              .append($('<i>', { class: (chart.icon || 'fa fa-chart-line') + ' fs-18' }).css({ marginRight: '6px' }))
              .append(document.createTextNode(chart.title || chart.filename || 'Chart'))
              .data('drag', { filename: chart.filename, title: chart.title || chart.filename || '' });

            const $entry = $('<div>', {
              id: `as-cm-chart-entry-${safeId}`,
              class: `as-cm-chart-entry fs-16 noselect ${enabledClass}`,
              'data-module': chart.module,
              'data-filename': chart.filename,
              'data-title': chart.title || chart.filename || ''
            });

            const $right = $('<div class="as-cm-actions"></div>');

            if (chart.custom === true) {
              const $btnEdit = $('<button type="button" class="btn btn-xs btn-primary" title="Edit"><i class="fa-regular fa-pen-to-square"></i> Edit</button>');
              const $btnDelete = $('<button type="button" class="btn btn-xs btn-danger" title="Delete"><i class="fa-regular fa-trash-can"></i> Delete</button>');

              $btnEdit.on('click', (e) => {
                e.stopPropagation();
                $(document).trigger('asCharts:customEdit', [{
                  module: chart.module,
                  filename: chart.filename,
                  title: chart.title || chart.filename || ''
                }]);
              });

              $btnDelete.on('click', (e) => {
                e.stopPropagation();
                $(document).trigger('asCharts:customDelete', [{
                  module: chart.module,
                  filename: chart.filename,
                  title: chart.title || chart.filename || ''
                }]);
              });

              $right.append($btnEdit, $btnDelete);
            }

            $entry.append($title).append($right);
            $body.append($entry);
          });

          $panel.append($heading).append($bodyWrap.append($body));
          chartGroups.append($panel);
        });
      }
    });
  }

  /* ================= Tabs ================= */

  /**
   * Creates a new tab with a pane and activates it.
   */
  addTab(title, content) {
    this.tabCounter++;
    const tabId = "as-gm-tab-" + this.tabCounter;

    const newTab = $(
      '<li><a href="#' + tabId + '" data-toggle="tab">' +
      '<span class="tab-title">' + (title || 'Tab ' + this.tabCounter) + '</span>' +
      '<span class="as-gm-tab-tools">' +
      '<button class="close close-tab"><i class="fa-regular fa-xmark small text-danger"></i></button></a></li>' +
      '</span>'
    );

    $('#as-gm-add-tab').before(newTab);

    const newContent = $(
      '<div class="tab-pane fade as-gm-tab" id="' + tabId + '">' +
      (content || '') +
      '</div>'
    );
    $('#as-gm-tablist-content').append(newContent);

    this._updatePaneGridBg(newContent);

    newTab.find('a').tab('show');
    return tabId;
  }

  /**
   * Removes a tab and its charts, switches focus appropriately, and saves.
   */
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

  /**
   * Starts inline rename for a tab (double-click title).
   */
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

  /**
   * Binds toolbox visibility, tab actions, DnD from list, and custom chart actions.
   */
  setupEvents() {
    $('#as-charts-menu').off('click').on('click', (e) => this.show());

    $(document).on('click', (e) => {
      const isInside = $(e.target).closest('#as-charts-toolbox-wrapper').length > 0;
      const isExcluded = $(e.target).closest('#as-charts-menu').length > 0;
      if (!isInside && !isExcluded) this.hide();
    });

    $(document).off('click.asCreateChart').on('click.asCreateChart', '#as-create-chart', (e) => {
      e.preventDefault();
      this._openDesigner();
    });

    $('#as-gm-add-tab').off('click').on('click', (e) => this.addTab());
    $('#as-gm-tablist')
      .on('click', '.close-tab', (e) => {
        e.stopPropagation();
        const tabId = $(e.currentTarget).closest('a').attr('href').substring(1);
        this.removeTab(tabId);
      })
      .on('dblclick', '.tab-title', (e) => {
        const el = e.currentTarget;
        e.stopPropagation();
        e.preventDefault();
        this.startRename($(el).closest('a'));
      });

    // Drag from left list (title only)
    $(document).off('dragstart.asSidebar').on('dragstart.asSidebar', '.as-cm-title', function (e) {
      const meta = $(this).data('drag') || {};
      e.originalEvent.dataTransfer.setData('text/plain', JSON.stringify({ filename: meta.filename || meta.title || '', title: meta.title || '' }));
    });

    // Drop onto pane to create a chart
    $(document).on('dragover', '.as-gm-tab', function (e) { e.preventDefault(); });
    $(document).on('drop', '.as-gm-tab', (e) => {
      const targetTab = e.currentTarget.id;
      const payloadTxt = e.originalEvent.dataTransfer.getData('text/plain');
      if (!payloadTxt) return;

      let meta;
      try { meta = JSON.parse(payloadTxt); } catch(_) { meta = {}; }
      const filename = meta && meta.filename ? meta.filename : (meta && meta.title ? meta.title : null);
      if (!filename) return;

      const $pane = $(`#${targetTab}`);
      this._updatePaneGridBg($pane);

      this._createChartFromState($pane, {
        filename: filename,
        top: 0, left: 0, width: 320, height: 240,
        autoRefreshSeconds: this.opts.autoRefreshSecondsDefault | 0
      });
    });

    // Custom chart delete (immediate UI removal + server call)
    $(document)
      .off('asCharts:customDelete.handler')
      .on('asCharts:customDelete.handler', (e, info) => {
        if (!info || !info.filename) return;
        const display = info.title || info.filename;
        if (!window.confirm(`Delete custom chart “${display}”? This can’t be undone.`)) return;

        this._purgeChartEverywhere(info.filename);
        try { this._saveDebounced(); } catch(_) {}

        $.ajax({
          url: 'includes/chartutil.php?request=DeleteCustomChart',
          method: 'POST',
          data: JSON.stringify({ name: info.filename }),
          contentType: 'application/json; charset=utf-8',
          dataType: 'json',
          cache: false
        })
        .done((resp) => {
          if (resp && resp.ok) {
            $(`.as-cm-chart-entry[data-filename="${info.filename}"]`).remove();
            this.buildChartGroups();
          } else {
            const msg = (resp && resp.error) ? resp.error : 'Unknown server error';
            this._popup(`Delete failed: ${msg}`);
          }
        })
        .fail((xhr) => {
          const msg = (xhr && xhr.responseText) ? xhr.responseText : `HTTP ${xhr.status || ''}`;
          this._popup(`Delete failed: ${msg}`);
        });
      });

    // Custom chart edit (open designer prefilled)
    $(document)
      .off('asCharts:customEdit.handler')
      .on('asCharts:customEdit.handler', (e, info) => {
        this._openDesigner({ name: info && info.filename });
      });
  }

  /* ================= Instances / bounds / refresh ================= */

  /**
   * Returns bounds (and per-chart auto-refresh) for all charts in a tab.
   */
  getAllChartBoundsIn(tab) {
    const instances = tab.data('allskyChart_instances') || [];
    return instances
      .map((inst, i) => {
        const b = inst.getBounds && inst.getBounds();
        if (!b) return null;

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
        } catch (e) { console.warn('read auto-refresh seconds failed:', e); }

        const out = {
          index: i,
          title: inst.$title ? inst.$title.text() : null,
          top: b.top, left: b.left, width: b.width, height: b.height,
          filename: b.filename || inst.filename || null
        };
        if (seconds != null) out.autoRefreshSeconds = Math.max(0, seconds | 0);
        return out;
      })
      .filter(Boolean);
  }

  /**
   * Executes a function with a hidden pane temporarily made measurable.
   */
  _makeMeasurable($pane, fn) {
    if ($pane.is(':visible')) return fn();
    const el = $pane[0];
    const s = el.style;
    const orig = { display: s.display, visibility: s.visibility, position: s.position, left: s.left, top: s.top, width: s.width };
    $pane.addClass('as-gm-measuring');
    const $host = $('#as-gm-tablist-content');
    const hostW = $host.width() || $pane.parent().width() || 800;
    s.width = hostW + 'px';
    el.offsetHeight;
    let out;
    try { out = fn(); }
    finally {
      $pane.removeClass('as-gm-measuring');
      s.display = orig.display; s.visibility = orig.visibility; s.position = orig.position; s.left = orig.left; s.top = orig.top; s.width = orig.width;
    }
    return out;
  }

  /* ================= SAVE ================= */

  /**
   * Returns a JSON string of current state (settings + tabs + charts).
   */
  saveState() {
    const payload = this._collectState();
    return JSON.stringify(payload, null, 2);
  }

  /**
   * Constructs the state object for persistence.
   */
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
        timeRange: this._timeRange || this.opts.timeDefaults
      },
      tabs
    };
  }

  /**
   * Saves state via HTTP (optionally wrapped with metadata).
   */
  saveStateToUrl(url, opts = {}) {
    const { wrap = false, field = 'state', includeMeta = true, ajax = {} } = opts;
    const state = this._collectState();
    let payload = state;
    if (wrap) {
      payload = { [field]: state };
      if (includeMeta) payload.meta = { savedAt: new Date().toISOString(), version: 5 };
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

  /**
   * Loads state JSON from URL and applies it.
   */
  loadStateFromUrl(url, opts = {}) {
    const { clearExisting = true, reuseTabIds = true, ajax = {} } = opts;
    return $.ajax(Object.assign({
      url, method: 'GET', dataType: 'json', cache: false, headers: this.opts.ajaxHeaders
    }, ajax)).then((resp) => {
      const payload = (resp && resp.state) ? resp.state : resp;
      if (Array.isArray(payload)) {
        this.loadState({ tabs: payload }, { clearExisting, reuseTabIds });
      } else if (payload && typeof payload === 'object') {
        this.loadState(payload, { clearExisting, reuseTabIds });
      }
    }).catch((xhr, status, err) => {
      console.error('loadStateFromUrl(): AJAX error', { status, err, xhr });
    });
  }

  /**
   * Applies an in-memory state object or JSON string to the UI.
   * - Restores settings and tabs.
   * - Re-applies global time range (and reloads charts).
   */
  loadState(state, opts = {}) {
    const { clearExisting = true, reuseTabIds = true } = opts;
    const data = (typeof state === 'string') ? JSON.parse(state) : state;
    if (!data) return;

    const settings = data.settings || {};
    this.opts.gridEnabled = (typeof settings.gridEnabled === 'boolean') ? settings.gridEnabled : true;
    this.opts.gridSize = Number.isFinite(settings.gridSize) ? Math.max(4, Math.min(400, settings.gridSize | 0)) : 24;
    this.opts.snapType = (settings.snapType === 'move') ? 'move' : 'end';
    if (Number.isFinite(settings.defaultAutoRefreshSeconds)) {
      this.opts.autoRefreshSecondsDefault = Math.max(0, settings.defaultAutoRefreshSeconds | 0);
    }

    this._timeRange = (settings.timeRange && typeof settings.timeRange === 'object')
      ? Object.assign({}, this.opts.timeDefaults, settings.timeRange)
      : Object.assign({}, this.opts.timeDefaults);

    this._applySettingsToUI();
    $('#opt-grid-enabled').prop('checked', !!this.opts.gridEnabled);
    $('#opt-grid-size').val(this.opts.gridSize);
    $('#opt-snap-type').val(this.opts.snapType);
    $('#opt-default-autorefresh').val(String(this.opts.autoRefreshSecondsDefault));

    // Sync the time-range picker with the restored range
    try { $('#as-tr-btn').timeRangeModal('setRange', this._timeRange); } catch (_) {}

    const tabs = Array.isArray(data.tabs) ? data.tabs : (Array.isArray(data) ? data : []);
    if (tabs.length === 0) return;

    if (clearExisting && reuseTabIds) {
      const keepIds = new Set(tabs.map(t => t.tabId).filter(Boolean));
      $('#as-gm-tablist-content .tab-pane').each((_, el) => { const id = el.id; if (!keepIds.has(id)) $(el).remove(); });
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
        const $pane = $(`#${tabId}`);
        this._updatePaneGridBg($pane);
      }

      this._pendingChartsByTab[tabId] = (this._pendingChartsByTab[tabId] || []).concat(charts);
    });

    const $active = $('#as-gm-tablist li.active a[data-toggle="tab"]');
    if ($active.length) this._restoreChartsIfPending($active.attr('href').slice(1));
    else {
      const $first = $('#as-gm-tablist li:not(#as-gm-add-tab) a[data-toggle="tab"] ').first();
      if ($first.length) $first.tab('show');
    }

    // Important: propagate time-range to all charts and reload them
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

  /* ================= Bounds / normalize / create ================= */

  /**
   * Coerces values to integer pixels with fallback.
   */
  _toNumber(v, fallback = 0) {
    if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v);
    if (typeof v === 'string') {
      const n = parseFloat(v.trim());
      if (Number.isFinite(n)) return Math.round(n);
    }
    return Math.round(fallback);
  }

  /**
   * Normalizes chart bounds and per-chart auto-refresh seconds.
   */
  _normalizeBounds(c) {
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
      ...(c.chartConfig ? { chartConfig: c.chartConfig } : {}),
      ...(seconds != null ? { autoRefreshSeconds: seconds } : {})
    };
  }

  /**
   * Resolves a quick time-range key into absolute unix seconds.
   */
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

  /**
   * Returns a concrete {from,to} pair based on current global time-range.
   */
  _currentRangePair() {
    const tr = this._timeRange || this.opts.timeDefaults || { mode:'quick', quick:'24h' };
    if (tr.mode === 'range' && Number.isFinite(tr.from) && Number.isFinite(tr.to)) {
      return { from: tr.from, to: tr.to };
    }
    const q = this._resolveQuickRange(tr.quick || '24h');
    return { from: q.from, to: q.to };
  }

  /**
   * Builds the POST body for chart config requests (includes range + optional chart reference).
   */
  _buildGraphPostBody({ filename = null, chartConfig = null } = {}) {
    const range = this._currentRangePair();
    const body = { range, _ts: Date.now() };
    if (chartConfig && typeof chartConfig === 'object') body.chartConfig = chartConfig;
    else if (filename) body.filename = filename;
    else body.filename = '';
    return body;
  }

  /**
   * Creates and mounts a chart instance inside a pane from saved/chart data.
   * - Ensures plugin receives current time range via POST body and URL query.
   * - Wraps the instance refresh to always re-apply the latest range before reloads.
   */
  _createChartFromState($pane, c, { force = false } = {}) {
    if (!force && !$pane.is(':visible')) {
      const tabId = $pane.attr('id');
      (this._pendingChartsByTab[tabId] ||= []).push(c);
      return;
    }

    const nc = this._normalizeBounds(c);
    if (!nc.filename && !nc.chartConfig) return;

    const beforeLen = ($pane.data('allskyChart_instances') || []).length;
    const seconds = (nc.autoRefreshSeconds != null && Number.isFinite(+nc.autoRefreshSeconds))
      ? Math.max(0, (+nc.autoRefreshSeconds) | 0)
      : (this.opts.autoRefreshSecondsDefault | 0);

    const postBody = this._buildGraphPostBody({ filename: nc.filename, chartConfig: nc.chartConfig });

    // Persist time-range to URL as well (some backends may read either body or query)
    const baseUrl = 'includes/chartutil.php?request=GraphData';
    const qs = this._timeQueryString();

    $pane.allskyChart({
      configUrl: baseUrl + qs,
      configAjax: {
        method: 'POST',
        data: JSON.stringify(postBody),
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        cache: false,
        headers: this.opts.ajaxHeaders
      },
      filename: nc.filename,
      initialPos: { top: nc.top, left: nc.left },
      initialSize: { width: nc.width, height: nc.height },
      grid: {
        enabled: !!this.opts.gridEnabled,
        size: { x: this.opts.gridSize, y: this.opts.gridSize },
        snap: this.opts.snapType || 'end'
      },
      autoRefresh: {
        enabled: true,
        options: this.opts.autoRefreshOptionsDefault.slice(0),
        defaultSeconds: seconds
      },
      onAutoRefreshChange: (secs, inst) => this._onAutoRefreshChange(secs, inst),
      onBoundsChange: () => this._saveDebounced(),
      onDelete: () => this._saveDebounced()
    });

    // After plugin mounts, complete configuration and wrap refresh
    requestAnimationFrame(() => {
      const after = $pane.data('allskyChart_instances') || [];
      const newInsts = after.slice(beforeLen);
      newInsts.forEach((inst) => {
        this._applyBounds(inst, nc);
        this._applyAutoRefresh(inst, seconds);

        // Keep a manager copy and push into plugin via public setters (critical for future refreshes)
        inst._gmGraphPostBody = postBody;
        if (!inst._gmBaseConfigUrl) inst._gmBaseConfigUrl = baseUrl;

        try { if (typeof inst.setGraphPostBody === 'function') inst.setGraphPostBody(postBody); } catch(_) {}
        try { if (typeof inst.setConfigUrl === 'function') inst.setConfigUrl(baseUrl + qs); } catch(_) {}

        this._wrapInstanceRefreshWithFreshRange(inst);
        try {
          if (typeof inst.setTimeRange === 'function') inst.setTimeRange(this._timeRange);
          inst._gmLastTimeRangeSig = JSON.stringify(this._timeRange || {});
        } catch (_) {}
      });
      this._applySnapToPane($pane);
    });
  }

  /**
   * Instantiates any charts queued for a tab once it becomes visible.
   */
  _restoreChartsIfPending(tabId) {
    const pending = this._pendingChartsByTab[tabId];
    if (!pending || !pending.length) return;
    const $pane = $(`#${tabId}`);
    this._updatePaneGridBg($pane);
    pending.splice(0).forEach((c) => this._createChartFromState($pane, c, { force: true }));
  }

  /**
   * Applies saved geometry to a chart instance.
   */
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

  /**
   * Ensures a chart instance uses the given auto-refresh interval.
   */
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
    } catch (e) { console.warn('apply auto-refresh to instance failed:', e); }
  }

  /**
   * Pushes snap settings to a pane's charts.
   */
  _applySnapToPane($pane) {
    try {
      const enabled = !!this.opts.gridEnabled;
      const size = Math.max(1, this.opts.gridSize | 0);
      const type = (this.opts.snapType === 'move') ? 'move' : 'end';
      $pane.allskyChart('setSnapEnabled', enabled);
      $pane.allskyChart('setSnapType', type);
      $pane.allskyChart('setSnapSize', size);
    } catch (e) { console.warn('apply snap to pane failed:', e); }
  }

  /**
   * Records per-chart auto-refresh changes and persists state.
   */
  _onAutoRefreshChange(seconds, inst) {
    try {
      const secs = Math.max(0, parseInt(seconds, 10) || 0);
      inst._autoSeconds = secs;
      this._saveDebounced();
    } catch (e) { console.warn('onAutoRefreshChange handler failed:', e); }
  }

  /**
   * Simple debounce utility bound to instance.
   */
  _debounce(fn, wait = 300) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), wait); };
  }

  /* ================= Time range → POST bodies + Reload ================= */

  /**
   * Schedules a single refresh on the next animation frame.
   */
  _refreshInstOnce(inst) {
    if (inst._gmRefreshScheduled) return;
    inst._gmRefreshScheduled = true;
    requestAnimationFrame(() => {
      inst._gmRefreshScheduled = false;
      if (typeof inst.refresh === 'function') inst.refresh();
    });
  }

  /**
   * Reloads all charts in a pane using available plugin hooks.
   */
  _reloadPaneCharts($pane) {
    try {
      try { $pane.allskyChart('refreshAll'); return; } catch (_) {}

      const insts = ($pane.data('allskyChart_instances') || []).filter(Boolean);
      insts.forEach((inst, idx) => {
        if (inst && typeof inst.refresh === 'function') {
          inst.refresh();
          return;
        }
        try { $pane.allskyChart('refreshByIndex', idx); return; } catch (_) {}
        try { $pane.allskyChart('refresh', inst); return; } catch (_) {}
        try { $(inst.$root || inst.$el || inst.$container || inst.$box || $pane).trigger('asChart:refresh'); } catch (_) {}
        try {
          if (typeof inst.reflow === 'function') inst.reflow();
          if (inst.chart && typeof inst.chart.reflow === 'function') inst.chart.reflow();
        } catch (_) {}
      });
    } catch (e) {
      console.warn('reload pane charts failed:', e);
    }
  }

  /**
   * Applies current global time range to every chart and forces a reload.
   * - Updates each chart's internal POST body via plugin API (setGraphPostBody).
   * - Keeps URL query in sync (setConfigUrl) for backends that read from query.
   * - Calls a pane-wide reload to fetch fresh data.
   */
  _applyTimeRangeToAllPanes() {
    const trSig = JSON.stringify(this._timeRange || {});
    const freshRange = this._currentRangePair();

    $('#as-gm-tablist-content .tab-pane').each((_, pane) => {
      const $pane = $(pane);
      const insts = ($pane.data('allskyChart_instances') || []).filter(Boolean);

      insts.forEach((inst) => {
        try {
          const tr = this._timeRange || this.opts.timeDefaults || { mode:'quick', quick:'24h' };
          let useRange = freshRange;
          if (tr.mode === 'range' && Number.isFinite(tr.from) && Number.isFinite(tr.to)) {
            useRange = { from: tr.from, to: tr.to };
          }

          // Update manager copy and push to plugin
          if (inst._gmGraphPostBody && typeof inst._gmGraphPostBody === 'object') {
            inst._gmGraphPostBody.range = useRange;
            inst._gmGraphPostBody._ts = Date.now();
          } else {
            inst._gmGraphPostBody = { range: useRange, _ts: Date.now() };
          }

          if (typeof inst.setGraphPostBody === 'function') {
            inst.setGraphPostBody(inst._gmGraphPostBody);
          }

          // Sync URL query
          const base = inst._gmBaseConfigUrl || 'includes/chartutil.php?request=GraphData';
          const url = base + this._timeQueryString();
          if (typeof inst.setConfigUrl === 'function') {
            inst.setConfigUrl(url);
          }

          if (typeof inst.setTimeRange === 'function') inst.setTimeRange(this._timeRange);
          inst._gmLastTimeRangeSig = trSig;
        } catch (e) { console.warn('apply time range failed:', e); }
      });

      // Reload the pane after all instances are updated
      this._reloadPaneCharts($pane);
    });
  }

  /**
   * Initializes the time-range picker button and hooks up apply/clear events.
   */
  _initTimeRangeButton() {
    const saved = this._timeRange || this.opts.timeDefaults || { mode: 'quick', quick: '24h', from: null, to: null };
    const $btn = $('#as-tr-btn');
    if (!$btn.length) return;

    try { $btn.timeRangeModal({ range: saved, modalTitle: 'Time range', dialogClass: '' }); } catch (e) {}

    $btn.on('tr.apply', (e, range) => {
      this._timeRange = range;
      this._applyTimeRangeToAllPanes();
      this._saveDebounced();
    });
    $btn.on('tr.clear', () => {
      this._timeRange = { mode:'quick', quick:'24h', from:null, to:null };
      this._applyTimeRangeToAllPanes();
      this._saveDebounced();
    });
  }

  /**
   * Wraps a chart's refresh() so the latest time-range is injected just before reload.
   */
  _wrapInstanceRefreshWithFreshRange(inst) {
    if (!inst || inst._gmRefreshWrapped) return;
    const original = (typeof inst.refresh === 'function') ? inst.refresh.bind(inst) : null;
    inst.refresh = () => {
      try { this._reapplyFreshRangeToInstance(inst); } catch (e) { console.warn('fresh range apply failed:', e); }
      if (original) original();
    };
    inst._gmRefreshWrapped = true;
  }

  /**
   * Re-applies the latest time-range to a single chart's POST body and URL.
   */
  _reapplyFreshRangeToInstance(inst) {
    const tr = this._timeRange || this.opts.timeDefaults || { mode:'quick', quick:'24h' };
    let useRange = this._currentRangePair();
    if (tr.mode === 'range' && Number.isFinite(tr.from) && Number.isFinite(tr.to)) {
      useRange = { from: tr.from, to: tr.to };
    }

    if (!inst._gmGraphPostBody || typeof inst._gmGraphPostBody !== 'object') {
      inst._gmGraphPostBody = { range: useRange, _ts: Date.now() };
    } else {
      inst._gmGraphPostBody.range = useRange;
      inst._gmGraphPostBody._ts = Date.now();
    }

    try { if (typeof inst.setGraphPostBody === 'function') inst.setGraphPostBody(inst._gmGraphPostBody); } catch(_) {}

    const base = inst._gmBaseConfigUrl || 'includes/chartutil.php?request=GraphData';
    const url = base + this._timeQueryString();
    try { if (typeof inst.setConfigUrl === 'function') inst.setConfigUrl(url); } catch(_) {}

    if (typeof inst.setTimeRange === 'function') {
      inst.setTimeRange(this._timeRange);
    }
  }

  /* ================= Designer integration ================= */

  /**
   * Prepares the hidden designer host and initializes the designer plugin once.
   */
  _initDesignerIntegration() {
    if (!this.opts.designer || !this.opts.designer.enabled) return;

    if (!$('#chartDesignerHost').length) {
      $('<div id="chartDesignerHost" style="display:none;"></div>').appendTo(this.opts.designer.mountSelector || 'body');
    }

    if (!$('#chartDesignerHost').data('allskyChartDesigner')) {
      try {
        $('#chartDesignerHost').allskyChartDesigner({
          enableDeveloper: !!this.opts.designer.devPanel,
          variablesUrl: this.opts.designer.variablesUrl,
          graphDataUrl:  this.opts.designer.graphDataUrl,
          loadChartUrl:  this.opts.designer.loadChartUrl,
          onSave: (configJSON) => this._saveCustomChart(configJSON)
        });
      } catch (e) {
        console.warn('Designer init failed:', e);
      }
    }

    $(document).off('allskyChartDesigner:save.asMgr')
      .on('allskyChartDesigner:save.asMgr', (e, payload) => {
        const cfg = payload && payload.configJSON;
        if (cfg) this._saveCustomChart(cfg);
      });
  }

  /**
   * Opens the designer in new or edit mode.
   */
  _openDesigner(options = {}) {
    try {
      const api = $('#chartDesignerHost').data('allskyChartDesigner');
      if (api && typeof api.open === 'function') {
        api.open(options);
      } else {
        $('#chartDesignerHost').trigger('allskyChartDesigner:open', [options]);
      }
    } catch (e) {
      this._popup('Chart editor is not available.');
    }
  }

  /**
   * Saves a custom chart configuration to the server and refreshes the list.
   */
  _saveCustomChart(configJSON) {
    const title = (configJSON && String(configJSON.title || '').trim()) || '';
    if (!title) {
      this._popup('Please enter a chart title before saving.');
      return;
    }

    $.ajax({
      url: this.opts.designer.saveUrl || 'includes/chartutil.php?request=SaveCustomChart',
      method: 'POST',
      data: JSON.stringify({ title: title, config: configJSON }),
      contentType: 'application/json; charset=utf-8',
      dataType: 'json',
      cache: false
    })
    .done((resp) => {
      if (resp && resp.ok) {
        this._popup('Custom chart saved.');
        this.buildChartGroups();
      } else {
        const msg = (resp && resp.error) ? resp.error : 'Unknown error';
        this._popup(`Save failed: ${msg}`);
      }
    })
    .fail((xhr) => {
      const msg = (xhr && xhr.responseText) ? xhr.responseText : `HTTP ${xhr.status || ''}`;
      this._popup(`Save failed: ${msg}`);
    });
  }

  /* ================= Remove a chart everywhere (helper) ================= */

  /**
   * Removes a chart (by filename) from pending queues and destroys live instances.
   */
  _purgeChartEverywhere(filename) {
    if (!filename) return;

    Object.keys(this._pendingChartsByTab || {}).forEach((tabId) => {
      const list = this._pendingChartsByTab[tabId];
      if (!Array.isArray(list)) return;
      this._pendingChartsByTab[tabId] = list.filter((c) => (c && c.filename) !== filename);
    });

    $('#as-gm-tablist-content .tab-pane').each((_, pane) => {
      const $pane = $(pane);
      let insts = $pane.data('allskyChart_instances') || [];
      const keep = [];

      insts.forEach((inst) => {
        try {
          const b = inst.getBounds && inst.getBounds();
          const instFile =
            (b && b.filename) ||
            inst.filename ||
            (inst.$root && inst.$root.data && inst.$root.data('filename')) ||
            null;

          if (instFile === filename) {
            try { if (typeof inst.destroy === 'function') inst.destroy(); } catch(_){}
            try { if (inst.chart && typeof inst.chart.destroy === 'function') inst.chart.destroy(); } catch(_){}
            const $node = inst.$root || inst.$el || inst.$container || inst.$box;
            if ($node && $node.length) $node.remove();
          } else {
            keep.push(inst);
          }
        } catch (e) {
          keep.push(inst);
        }
      });

      $pane.data('allskyChart_instances', keep);
    });
  }

  /* ================= Helpers ================= */

  /**
   * Simple alert helper that prefers bootbox if present.
   */
  _popup(message, title) {
    if (window.bootbox && typeof bootbox.alert === 'function') {
      bootbox.alert({ title: title || 'Notice', message: String(message || '') });
    } else {
      alert(String(message || ''));
    }
  }

  /**
   * Builds a URL query string with the current concrete {from,to}.
   */
  _timeQueryString() {
    const { from, to } = this._currentRangePair();
    return `&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  }
}