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
      ajaxHeaders: undefined
    }, opts);

    // Debounced POST saver (used by onBoundsChange)
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

    // Queue of charts to create when a tab becomes visible
    this._pendingChartsByTab = Object.create(null);

    this.buildHTML();
    this.setupEvents();

    // Lazy-create charts only when a tab is shown
    $(document).on('shown.bs.tab', '#as-gm-tablist a[data-toggle="tab"]', (e) => {
      const tabId = $(e.target).attr('href').slice(1);
      this._restoreChartsIfPending(tabId);
    });

    // Auto-load from server if configured
    if (this.opts.loadUrl) {
      this.loadStateFromUrl(this.opts.loadUrl, {
        clearExisting: true,
        reuseTabIds: true,
        ajax: { headers: this.opts.ajaxHeaders }
      });
    }
  }

  // ---------- UI: show/hide + HTML ----------

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
          <nav class="navbar navbar-default">
            <div class="collapse navbar-collapse" id="oe-module-editor-navbar">
              <ul class="nav navbar-nav">
                <li>
                  <div class="tooltip-wrapper disabled" data-toggle="tooltip" data-container="body" data-placement="top" title="Save The Module Configuration">
                    <div class="btn btn-lg navbar-btn" id="module-editor-save"><i class="fa-solid fa-border-all"></i></div>
                  </div>
                </li>
              </ul>
              <ul class="nav navbar-nav navbar-right">
                <li>
                  <div class="btn btn-lg navbar-btn" id="device-manager" data-toggle="tooltip" data-container="body" data-placement="top" title="Device Manager"><i class="fa-solid fa-wrench"></i></div>
                </li>
              </ul>                            
            </div>
          </nav>
          <div id="as-charts-groups" class="panel-group">SS</div>
        </div>
      </div>`;
    $('#s-chart-manager').remove();
    $('body').append(chartManager);

    // Containment to avoid absolutely-positioned charts leaking
    const cssId = 'as-gm-style-core';
    if (!document.getElementById(cssId)) {
      $('<style id="as-gm-style-core">#as-gm-tablist-content .tab-pane{position:relative;overflow:hidden;}</style>').appendTo('head');
    }

// Containment style already added above; add measuring style too:
const cssMeasureId = 'as-gm-measuring-style';
if (!document.getElementById(cssMeasureId)) {
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
    `)
    .appendTo('head');
}


  }

  buildChartGroups() {
    $.ajax({
      url: 'includes/moduleutil.php?request=AvailableGraphs',
      type: 'GET',
      async: false,
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
              $('<a>', {
                class: 'collapsed small',
                'data-toggle': 'collapse',
                href: '#' + collapseId,
                text: categoryName
              })
            )
          );
          var body = $('<div>', {
            id: collapseId,
            class: 'panel-collapse collapse'
          }).append(
            $('<div>', { class: 'panel-body' })
          );

          chartsArray.forEach(function (chart) {
            var item = $('<div>', {
              id: `as-cm-chart-entry-${idCounter}`,
              class: 'as-cm-chart-entry',
              'data-module': chart.module,
              'data-filename': chart.filename,
              draggable: true
            }).append(
              $('<i>', { class: chart.icon + ' small' }).css({ marginRight: '5px' }),
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

  // ---------- Tabs ----------

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
  const $pane = $('#' + tabId);
  const $li   = $('#as-gm-tablist a[href="#' + tabId + '"]').closest('li');
  const wasActive = $li.hasClass('active');

  // 1) Destroy any created chart instances in this pane
  try {
    const insts = $pane.data('allskyChart_instances') || [];
    insts.forEach((inst) => {
      try {
        if (typeof inst.destroy === 'function') {
          inst.destroy();
        } else if (inst.chart && typeof inst.chart.destroy === 'function') {
          inst.chart.destroy();
        }
        const $node = inst.$root || inst.$el || inst.$container || inst.$box;
        if ($node && $node.length) $node.remove();
      } catch (e) {
        console.warn('Chart destroy failed:', e);
      }
    });
    // Remove instance list so we don't keep stale refs
    $pane.removeData('allskyChart_instances');
  } catch (e) {
    console.warn('Instance cleanup failed:', e);
  }

  // 2) Clear any queued (not-yet-created) charts for this tab
  if (this._pendingChartsByTab && this._pendingChartsByTab[tabId]) {
    delete this._pendingChartsByTab[tabId];
  }

  // 3) Decide which tab to activate next (if needed) before removing DOM
  const $nextLink = $li.next('li').not('#as-gm-add-tab').find('a[data-toggle="tab"]');
  const $prevLink = $li.prev('li').find('a[data-toggle="tab"]');

  // 4) Remove the nav item and pane
  $li.remove();
  $pane.remove();

  // 5) If we deleted the active tab, activate a neighbor and restore its pending charts
  if (wasActive) {
    const $toShow = $nextLink.length ? $nextLink : $prevLink;
    if ($toShow && $toShow.length) {
      $toShow.tab('show');
      const newId = $toShow.attr('href').slice(1);
      this._restoreChartsIfPending(newId);
    } else {
      // No tabs left except the add button; nothing to activate
    }
  }

  // 6) Save the state immediately after deletion
  if (this.opts && this.opts.saveUrl) {
    this.saveStateToUrl(this.opts.saveUrl, {
      wrap: this.opts.wrap,
      field: this.opts.field,
      includeMeta: this.opts.includeMeta,
      ajax: { headers: this.opts.ajaxHeaders }
    }).catch((e) => console.warn('Save after delete failed:', e));
  } else {
    // Fallback: still compute JSON (useful for debugging)
    this.saveState();
  }
}


startRename(a) {
  // Ensure there's a .tab-title span to edit (works for Home too)
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

    // Replace editor with final title span
    $input.replaceWith(`<span class="tab-title">${$('<div>').text(newText).html()}</span>`);
    $('.as-gm-tab-tools').css({ visibility: 'visible', display: 'inline' });

    // SAVE THE STATE RIGHT AFTER RENAME
    if (this.opts && this.opts.saveUrl) {
      // Immediate POST (no debounce) so renames are persisted at once
      this.saveStateToUrl(this.opts.saveUrl, {
        wrap: this.opts.wrap,
        field: this.opts.field,
        includeMeta: this.opts.includeMeta,
        ajax: { headers: this.opts.ajaxHeaders }
      }).catch((e) => console.warn('Rename save failed:', e));
    } else {
      // Fallback: still compute JSON (e.g., for debugging)
      this.saveState();
    }
  };

  $input.on('keydown', (e) => {
    if (e.key === 'Enter') finish(true);
    if (e.key === 'Escape') finish(false);
  });
  $input.on('blur', () => finish(true));
}


  // ---------- Events / DnD ----------

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

    // Drop a chart entry onto a tab pane → queue/build it there
    $(document).on('drop', '.as-gm-tab', (e) => {
      let targetTab = e.currentTarget.id;
      let elId = e.originalEvent.dataTransfer.getData('id');
      if (!elId) return;

      elId = $(`#${elId}`);
      let chartFileName = elId.data('filename');

      let $pane = $(`#${targetTab}`).addClass('as-grid-bg');
      // Use guarded creation (queues if hidden)
      this._createChartFromState($pane, {
        filename: chartFileName,
        top: 0, left: 0, width: 320, height: 240
      });
    });
  }

  // ---------- Instances / Bounds ----------

  getAllChartBoundsIn(tab) {
    var instances = tab.data('allskyChart_instances') || [];
    return instances
      .map(function (inst, i) {
        var b = inst.getBounds && inst.getBounds();
        if (!b) return null;
        return {
          index: i,
          title: inst.$title ? inst.$title.text() : null,
          top: b.top,
          left: b.left,
          width: b.width,
          height: b.height,
          filename: b.filename || null
        };
      })
      .filter(Boolean);
  }

/**
 * Make a hidden tab-pane measurable without showing it.
 * Moves it off-screen temporarily, runs `fn()`, then restores styles.
 */
_makeMeasurable($pane, fn) {
  // If it's already visible, just run.
  if ($pane.is(':visible')) return fn();

  const el = $pane[0];
  const s  = el.style;
  const orig = {
    display: s.display,
    visibility: s.visibility,
    position: s.position,
    left: s.left,
    top: s.top,
    width: s.width
  };

  // Put pane off-screen and visible for layout
  $pane.addClass('as-gm-measuring');

  // Give it a sensible width so children can compute layout
  const $host = $('#as-gm-tablist-content');
  const hostW = $host.width() || $pane.parent().width() || 800;
  s.width = hostW + 'px';

  // Force reflow
  // eslint-disable-next-line no-unused-expressions
  el.offsetHeight;

  let out;
  try {
    out = fn();
  } finally {
    // Restore everything
    $pane.removeClass('as-gm-measuring');
    s.display    = orig.display;
    s.visibility = orig.visibility;
    s.position   = orig.position;
    s.left       = orig.left;
    s.top        = orig.top;
    s.width      = orig.width;
  }
  return out;
}


  // ---------- SAVE ----------

  /** Return JSON string of the current state (for debugging/manual use). */
  saveState() {
    const payload = this._collectState();
    return JSON.stringify(payload, null, 2);
  }


/** Build full state for ALL tabs, including charts queued for hidden tabs. */
_collectState() {
  const allTabs = [];

  $('#as-gm-tablist-content .tab-pane').each((_, el) => {
    const $pane = $(el);
    const tabId = $pane.attr('id');
    const title = this._getTabTitle(tabId);

    // 1) Charts already created in this pane (visible or hidden)
    const created = this._makeMeasurable($pane, () => {
      return this.getAllChartBoundsIn($pane) || [];
    }) || [];

    // 2) Charts queued for this tab but not created yet (strict lazy-create)
    const queuedRaw = (this._pendingChartsByTab && this._pendingChartsByTab[tabId])
      ? this._pendingChartsByTab[tabId]
      : [];

    // Normalize queued bounds (they can be strings)
    const queued = queuedRaw.map((c) => this._normalizeBounds(c));

    // 3) Merge created + queued
    const charts = created.concat(queued);

    allTabs.push({ tabId, title, charts });
  });

  return allTabs;
}



  /**
   * Save current layout via POST to an AJAX URL (JSON).
   * @param {string} url
   * @param {Object} [opts]
   * @param {boolean} [opts.wrap=false]
   * @param {string}  [opts.field='state']
   * @param {boolean} [opts.includeMeta=true]
   * @param {Object}  [opts.ajax={}]
   * @returns {Promise}
   */
  saveStateToUrl(url, opts = {}) {
    const { wrap = false, field = 'state', includeMeta = true, ajax = {} } = opts;

    const state = this._collectState();
    let payload = state;
    if (wrap) {
      payload = { [field]: state };
      if (includeMeta) {
        payload.meta = { savedAt: new Date().toISOString(), version: 1 };
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

  // ---------- LOAD ----------

  /**
   * GET a saved layout from an AJAX URL and load it.
   * Leaves current tabs intact if server returns empty.
   */
  loadStateFromUrl(url, opts = {}) {
    const { clearExisting = true, reuseTabIds = true, ajax = {} } = opts;

    return $.ajax(Object.assign({
      url,
      method: 'GET',
      dataType: 'json',
      cache: false,
      headers: this.opts.ajaxHeaders
    }, ajax)).then((resp) => {
      let payload = Array.isArray(resp) ? resp : (resp && resp.state);
      if (!payload || !Array.isArray(payload) || payload.length === 0) {
        // Keep the existing UI (first tab etc.)
        console.info('loadStateFromUrl(): empty state, leaving tabs unchanged');
        return;
      }
      this.loadState(payload, { clearExisting, reuseTabIds });
    }).catch((xhr, status, err) => {
      console.error('loadStateFromUrl(): AJAX error', { status, err, xhr });
    });
  }

  /**
   * Load a saved layout object/JSON and rebuild tabs + charts.
   * Uses strict lazy creation (queue charts for hidden tabs).
   */
  loadState(state, opts = {}) {
    const { clearExisting = true, reuseTabIds = true } = opts;

    const data = (typeof state === 'string') ? JSON.parse(state) : state;
    if (!Array.isArray(data) || data.length === 0) {
      console.info('loadState(): empty state, leaving current tabs unchanged');
      return;
    }

    if (clearExisting && !reuseTabIds) {
      // Wipe and rebuild
      $('#as-gm-tablist-content .tab-pane').remove();
      $('#as-gm-tablist li').not('#as-gm-add-tab').remove();
      this.tabCounter = 1;
    } else if (clearExisting && reuseTabIds) {
      // Remove panes/nav not present in payload; keep matching ids
      const keepIds = new Set(data.map(t => t.tabId).filter(Boolean));
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

    // Rebuild tabs (queue charts; don't build yet for hidden panes)
    data.forEach((t, idx) => {
      let tabId = t.tabId || '';
      const title  = (t.title || `Tab ${idx + 1}`).trim();
      const charts = Array.isArray(t.charts) ? t.charts : [];

      const exists = tabId && $(`#${tabId}`).length > 0;
      if (reuseTabIds && exists) {
        this._setTabTitle(tabId, title);
        $(`#${tabId}`).empty().addClass('tab-pane as-gm-tab as-grid-bg');
      } else {
        tabId = this.addTab(title);
        if (reuseTabIds && t.tabId && tabId !== t.tabId) { this._renameTabIds(tabId, t.tabId); tabId = t.tabId; }
        $(`#${tabId}`).addClass('as-grid-bg');
      }

      // Queue charts for later (when tab becomes visible)
      this._pendingChartsByTab[tabId] = (this._pendingChartsByTab[tabId] || []).concat(charts);
    });

    // Ensure one tab is active; then build only that tab's charts
    const $active = $('#as-gm-tablist li.active a[data-toggle="tab"]');
    if ($active.length) {
      this._restoreChartsIfPending($active.attr('href').slice(1));
    } else {
      const $first = $('#as-gm-tablist li:not(#as-gm-add-tab) a[data-toggle="tab"]').first();
      if ($first.length) $first.tab('show'); // triggers _restoreChartsIfPending via event
    }


// Always end up back on the first tab after load
const $first = $('#as-gm-tablist li:not(#as-gm-add-tab) a[data-toggle="tab"]').first();
if ($first.length) {
  $first.tab('show');
  const firstId = $first.attr('href').slice(1);
  this._restoreChartsIfPending(firstId);
}


  }

  // ---------- Title / ID helpers ----------

  /** Ensure a `.tab-title` span exists inside the nav <a> for a tabId. Returns that span. */
  _ensureTitleSpan(tabId) {
    const $a = $(`#as-gm-tablist a[href="#${tabId}"]`);
    if (!$a.length) return $();
    let $title = $a.find('.tab-title');
    if ($title.length) return $title;

    // Extract existing text (minus tools/icons) and wrap it
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

  // ---------- Bounds / creation helpers ----------

  /** Parse "120", "120px", "120.5", " 120 " → finite rounded number. */
  _toNumber(v, fallback = 0) {
    if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v);
    if (typeof v === 'string') {
      const n = parseFloat(v.trim());
      if (Number.isFinite(n)) return Math.round(n);
    }
    return Math.round(fallback);
  }

  /** Normalize a saved chart bounds object (strings -> numbers, with defaults). */
  _normalizeBounds(c) {
    return {
      top:    this._toNumber(c.top,    0),
      left:   this._toNumber(c.left,   0),
      width:  this._toNumber(c.width,  320),
      height: this._toNumber(c.height, 240),
      filename: c.filename || null
    };
  }

  /**
   * Strictly lazy: if pane hidden and force=false, queue instead of creating now.
   * Accepts { force } to bypass the visible gate (used when tab is shown).
   * Uses initialPos / initialSize per your request.
   */
  _createChartFromState($pane, c, { force = false } = {}) {
    if (!force && !$pane.is(':visible')) {
      const tabId = $pane.attr('id');
      (this._pendingChartsByTab[tabId] ||= []).push(c);
      return;
    }

    const nc = this._normalizeBounds(c);
    if (!nc.filename) return;

    const beforeLen = ($pane.data('allskyChart_instances') || []).length;

    // Pane is visible: safe to build
    $pane.allskyChart({
      configUrl: 'includes/moduleutil.php?request=GraphData&filename=' + encodeURIComponent(nc.filename),
      filename: nc.filename,

      initialPos:  { top: nc.top, left: nc.left },
      initialSize: { width: nc.width, height: nc.height },

      grid: { enabled: true, size: { x: 24, y: 24 }, snap: 'end' },

      onBoundsChange: () => this._saveDebounced(),
      onDelete: () => this._saveDebounced()
    });

    // Enforce saved bounds after init (if plugin applies its own defaults)
    requestAnimationFrame(() => {
      const after = $pane.data('allskyChart_instances') || [];
      const newInsts = after.slice(beforeLen);
      newInsts.forEach((inst) => this._applyBounds(inst, nc));
    });
  }

  /** Create queued charts for a tab that just became visible. */
  _restoreChartsIfPending(tabId) {
    const pending = this._pendingChartsByTab[tabId];
    if (!pending || !pending.length) return;
    const $pane = $(`#${tabId}`).addClass('as-grid-bg');
    pending.splice(0).forEach((c) => this._createChartFromState($pane, c, { force: true }));
  }

  /**
   * Apply bounds directly on an instance (API or CSS fallback) and reflow.
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

  // ---------- Misc ----------

  _debounce(fn, wait = 300) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), wait); };
  }
}
