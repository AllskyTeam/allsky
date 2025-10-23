/*!
 * allskyChartDesigner (server-driven)
 * -----------------------------------
 * A Bootstrap 3 + jQuery modal plugin that lets users compose custom Highcharts
 * via drag/drop mapping of available "measures" (variables) to chart axes and
 * then preview the result by POSTing to server endpoints.
 *
 * Key features
 * - Server-normalized measure catalog via `AvailableVariables`
 * - Optional Developer Console for inspecting request/response payloads
 * - Supports multiple chart types: line/spline/area/column/bar, 3D column/area,
 *   radial gauge, and a minimalist yes/no visualization
 * - Two-axis support (left/right) with per-axis series assignment
 * - Thumbnails support flag appended to variable id using a "|true" suffix
 * - Time range selection via external `timeRangeModal` (if available)
 *
 * Dependencies
 * - jQuery (plugin style)
 * - Bootstrap 3 (modal, collapse)
 * - Highcharts (plus 3D and solid-gauge modules as needed)
 *
 * Public API (attached to the host element via jQuery .data)
 * ---------------------------------------------------------
 *   $(el).allskyChartDesigner(opts)
 *   $(el).data('allskyChartDesigner').open({
 *     // Option A: open with an existing config object (populate UI immediately)
 *     config: <ChartConfig JSON>,
 *     // Option B: open by name, fetched via opts.loadChartUrl
 *     name: 'existing-chart-name'
 *   })
 *
 * Events emitted
 * --------------
 *   'allskyChartDesigner:save'
 *      detail: {
 *        configJSON: <final chart config to persist>,
 *        previewOutput: <Highcharts options used in the last preview>
 *      }
 *
 * Server endpoints (defaults can be overridden via options)
 * --------------------------------------------------------
 *   opts.variablesUrl        -> returns measure catalog
 *   opts.graphDataUrl        -> receives { chartConfig, range } and returns data for preview
 *   opts.variableSeriesUrl   -> (dev console) receives variable selections to fetch raw series
 *   opts.loadChartUrl        -> receives { name } and returns { config } for editing an existing chart
 *
 * Expected payload formats (high-level)
 * -------------------------------------
 *   1) AvailableVariables (catalog):
 *        - Either an array of items { id, label, group, table?, description? }
 *        - Or an object keyed by group -> { id: { description, table? } }
 *
 *   2) GraphData (preview response):
 *        - For cartesian charts: { series: [ { name, data: [[x,y],...], yAxis? } ], yAxis? }
 *        - For gauge:            { value: Number } OR { series: HighchartsGaugeSeries[] }
 *        - For yes/no:           { value: Boolean|Number|String }
 *
 * Options (JSDoc)
 * ---------------
 * @typedef {Object} AllskyChartDesignerOptions
 * @property {{type:string}} [defaults]                - Initial chart-type selection; default 'line'.
 * @property {string} [variablesUrl]                   - GET endpoint for measures catalog.
 * @property {string} [graphDataUrl]                   - POST endpoint for preview data.
 * @property {string} [variableSeriesUrl]              - POST endpoint (dev-only) for raw series lookup.
 * @property {boolean} [showDevPanel=false]            - Show the Developer Console.
 * @property {string|null} [loadChartUrl=null]         - POST endpoint to load a chart by name.
 * @property {{selector?:string, options?:Object, defaultSeconds?:number}} [timeframe]
 *
 */
(function ($) {
  'use strict';

  /** HTML-escape a string for safe attribute/text injection. */
  function escapeHtml(s){
    return String(s).replace(/[&<>\"']/g, function(m){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]);
    });
  }

  /** Title-case helper; converts snake/space/kebab to spaced Title Case. */
  function tcase(s){
    return String(s||'').replace(/(^|[_\s-])([a-z])/g, function(_,p,a){
      return (p?' ':'')+a.toUpperCase();
    });
  }

  /** Coerce various truthy/falsy representations to a boolean. */
  function toBool(v){
    if (v === true || v === 1) return true;
    if (typeof v === 'string'){
      var s=v.trim().toLowerCase();
      return s==='1' || s==='true' || s==='yes' || s==='y' || s==='on';
    }
    if (typeof v === 'number') return v !== 0;
    return false;
  }

  /** Deep-merge source object `s` into target `t` (arrays are overwritten). */
  function deepMerge(t, s){
    if (!s) return t;
    Object.keys(s).forEach(function(k){
      if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k])){
        t[k] = deepMerge(t[k] || {}, s[k]);
      } else {
        t[k] = s[k];
      }
    });
    return t;
  }

  /** Remove the "|true" thumbnail suffix from a variable id. */
  function stripThumbSuffix(id){
    return String(id||'').replace(/\|true$/i,'');
  }

  /** Detect a trailing "|true" thumbnail suffix on a variable id. */
  function hasThumbSuffix(id){
    return /\|true$/i.test(String(id||''));
  }

  /**
   * Highcharts base defaults by type. `TYPE_DEFAULTS.common` is applied first,
   * then the specific type block. `baseConfigFor(type)` assembles the merged
   * configuration used by `toHighcharts()`.
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
    // Spline/Line: datetime x-axis with basic no-data styling
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
    // Category x-axis columns
    column: {
      chart: { type: 'column' },
      plotOptions: { column: { pointPadding: 0.1, borderWidth: 0, groupPadding: 0.1 } },
      xAxis: { type: 'category' }
    },
    // 3D column defaults
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
    // Semi-circular gauge with three colored bands
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
    // 3D area defaults
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
      plotOptions: { area: { depth: 50, marker: { enabled: false }, enableMouseTracking: true }, series: { animation: true } },
      xAxis: { type: 'category' },
      yAxis: [{ title: { text: null } }],
      zAxis: { visible: false }
    },
    // Minimal binary (yes/no) visualization
    yesno: {
      chart: { type: 'line' },
      legend: { enabled: false },
      xAxis: { visible: false },
      yAxis: { visible: false },
      tooltip: { enabled: false },
      plotOptions: { series: { enableMouseTracking: false } }
    }
  };

  /** Build a type-specific Highcharts base config (common + per-type). */
  function baseConfigFor(type){
    var cfg = deepMerge({}, TYPE_DEFAULTS.common);
    cfg = deepMerge(cfg, TYPE_DEFAULTS[type] || {});
    return cfg;
  }

  /** Modal markup rendered once per plugin instance. */
  var MODAL_HTML = `
    <div class="modal fade ascd-modal" tabindex="-1" role="dialog" aria-hidden="true">
      <div class="modal-dialog modal-lg"><div class="modal-content">
        <div class="modal-header">
          <h4 class="modal-title">Design a Custom Chart</h4>
        </div>
        <div class="modal-body">
          <div class="row" style="display:flex;">
            <!-- Left rail: type & basic details -->
            <div class="col-sm-2">
              <div class="panel panel-default">
                <div class="panel-heading"><strong>Chart Type</strong></div>
                <div class="list-group ascd-type-list">
                  <a href="#" class="list-group-item" data-type="line">Line</a>
                  <a href="#" class="list-group-item" data-type="spline">Spline</a>
                  <a href="#" class="list-group-item" data-type="area">Area</a>
                  <a href="#" class="list-group-item" data-type="column">Column</a>
                  <a href="#" class="list-group-item" data-type="bar">Bar</a>
                  <a href="#" class="list-group-item" data-type="column3d">Column 3D</a>
                  <a href="#" class="list-group-item" data-type="area3d">Area 3D</a>
                  <a href="#" class="list-group-item" data-type="gauge">Gauge</a>
                  <a href="#" class="list-group-item" data-type="yesno">Yes / No</a>
                </div>
              </div>
              <div class="panel panel-default">
                <div class="panel-heading">
                  <h5 class="panel-title" style="margin:0;">
                    <a data-toggle="collapse" href="#ascd-details">Chart Details</a>
                  </h5>
                </div>
                <div id="ascd-details" class="panel-collapse">
                  <div class="panel-body">
                    <div class="form-group">
                      <label>Title</label>
                      <input type="text" class="form-control input-sm ascd-title" placeholder="Chart title" />
                    </div>
                    <div class="form-group hidden">
                      <label>Group</label>
                      <input type="text" class="form-control input-sm ascd-group" value="Custom" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Middle: preview + mapping areas -->
            <div class="col-sm-6">
              <div class="panel panel-default">
                <div class="panel-heading" style="display:flex; align-items:center;">
                  <strong>Preview</strong>
                  <div style="margin-left:auto; display:flex; gap:6px;">
                    <button type="button" class="btn btn-default btn-xs ascd-time-btn" title="Time Range"><i class="fa fa-clock"></i></button>
                    <button type="button" class="btn btn-default btn-xs ascd-preview" title="Preview"><i class="fa fa-refresh"></i></button>
                  </div>
                </div>
                <div class="panel-body">
                  <div id="ascd-preview"></div>
                </div>
              </div>

              <!-- Cartesian mapping (two Y-axes) -->
              <div class="panel panel-default ascd-mapping-cart" style="margin-top:10px;">
                <div class="panel-heading"><strong>Axis Variables</strong></div>
                <div class="panel-body">
                  <div class="ascd-y-columns" style="margin-top:8px; display:flex; gap:16px;">
                    <div class="ascd-y-col" style="flex:1;">
                      <label class="control-label">Y (Left)</label>
                      <div class="ascd-drop ascd-drop-y-left" data-accept="measure" style="min-height:72px;border:1px dashed #bbb;border-radius:4px;padding:6px;"></div>
                      <div class="clearfix" style="margin-top:6px; display:flex; justify-content:space-between; align-items:center;">
                        <div class="checkbox ascd-thumb-toggle" style="margin:0;">
                          <label><input type="checkbox" class="ascd-thumb-left"> Thumbnails on Left</label>
                        </div>
                        <button class="btn btn-xs btn-default ascd-clear-y-left">Clear</button>
                      </div>
                    </div>

                    <div class="ascd-y-col" style="flex:1;">
                      <label class="control-label">Y (Right)</label>
                      <div class="ascd-drop ascd-drop-y-right" data-accept="measure" style="min-height:72px;border:1px dashed #bbb;border-radius:4px;padding:6px;"></div>
                      <div class="clearfix" style="margin-top:6px; display:flex; justify-content:space-between; align-items:center;">
                        <div class="checkbox ascd-thumb-toggle" style="margin:0;">
                          <label><input type="checkbox" class="ascd-thumb-right"> Thumbnails on Right</label>
                        </div>
                        <button class="btn btn-xs btn-default ascd-clear-y-right">Clear</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Gauge mapping -->
              <div class="panel panel-default ascd-mapping-gauge" style="display:none; margin-top:10px;">
                <div class="panel-heading"><strong>Gauge Target</strong></div>
                <div class="panel-body">
                  <label class="control-label">Value (measure)</label>
                  <div class="ascd-drop ascd-drop-gauge" data-accept="measure" style="min-height:38px;border:1px dashed #bbb;border-radius:4px;padding:6px;"></div>
                  <div class="clearfix" style="margin-top:6px; display:flex; justify-content:flex-end; gap:8px;">
                    <button class="btn btn-xs btn-default ascd-clear-gauge">Clear</button>
                  </div>
                </div>
              </div>

              <!-- Yes/No mapping -->
              <div class="panel panel-default ascd-mapping-yesno" style="display:none; margin-top:10px;">
                <div class="panel-heading"><strong>Yes / No Target</strong></div>
                <div class="panel-body">
                  <label class="control-label">Value (measure)</label>
                  <div class="ascd-drop ascd-drop-yesno" data-accept="measure" style="min-height:38px;border:1px dashed #bbb;border-radius:4px;padding:6px;"></div>
                  <div class="clearfix" style="margin-top:6px; display:flex; justify-content:flex-end; gap:8px;">
                    <button class="btn btn-xs btn-default ascd-clear-yesno">Clear</button>
                  </div>
                </div>
              </div>

              <div class="ascd-dev-slot"></div>
            </div>

            <!-- Right rail: variable catalog grouped by 'group' -->
            <div class="col-sm-4">
              <div class="panel panel-default">
                <div class="panel-heading"><strong>Variables</strong></div>
                <div class="panel-body">
                  <div class="panel-group ascd-measure-groups"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <span class="text-muted ascd-status pull-left" style="margin-top:8px;"></span>
          <button type="button" class="btn btn-danger ascd-reset" disabled>Reset</button>
          <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
          <button type="button" class="btn btn-success ascd-save" disabled>Save</button>
        </div>
      </div></div>
    </div>`;

  /**
   * Core plugin initializer. Builds modal, binds UI events, wires AJAX calls,
   * and exposes a small open() API.
   * @param {jQuery} host  Host element receiving the plugin.
   * @param {AllskyChartDesignerOptions} opts Merged options.
   */
  function plugin(host, opts){
    // Cache important DOM nodes
    var modal = $(MODAL_HTML).appendTo('body');
    var types = modal.find('.ascd-type-list');
    var statusEl = modal.find('.ascd-status');
    var preview = modal.find('#ascd-preview');
    var btnPreview = modal.find('.ascd-preview');
    var btnSave = modal.find('.ascd-save');
    var btnReset = modal.find('.ascd-reset');
    var btnTime = modal.find('.ascd-time-btn');
    var groups = modal.find('.ascd-measure-groups');
    var dropYLeft = modal.find('.ascd-drop-y-left');
    var dropYRight = modal.find('.ascd-drop-y-right');
    var dropGauge = modal.find('.ascd-drop-gauge');
    var dropYesNo = modal.find('.ascd-drop-yesno');
    var clearYLeft = modal.find('.ascd-clear-y-left');
    var clearYRight = modal.find('.ascd-clear-y-right');
    var clearGauge = modal.find('.ascd-clear-gauge');
    var clearYesNo = modal.find('.ascd-clear-yesno');
    var titleInput = modal.find('.ascd-title');
    var groupInput = modal.find('.ascd-group');
    var thumbLeft = modal.find('.ascd-thumb-left');
    var thumbRight = modal.find('.ascd-thumb-right');

    // Optional Developer Console slot setup
    var dev = { enabled: !!opts.showDevPanel };
    if (dev.enabled) {
      var devHtml = `
      <div class="panel panel-default ascd-dev" style="margin-top:10px;">
        <div class="panel-heading">
          Developer Console
          <button type="button" class="btn btn-xs btn-default ascd-send-preview">Send Preview Request</button>
          <button type="button" class="btn btn-xs btn-default ascd-send-vars">Send VariableSeriesData</button>
        </div>
        <div class="panel-body">
          <div class="row">
            <div class="col-sm-6">
              <label>Preview Request → <code>GraphData</code></label>
              <pre class="well well-sm ascd-dev-req-preview">{}</pre>
              <label>Preview Response</label>
              <pre class="well well-sm ascd-dev-resp-preview">{}</pre>
            </div>
            <div class="col-sm-6">
              <label>Series Request → <code>VariableSeriesData</code></label>
              <pre class="well well-sm ascd-dev-req-series">{}</pre>
              <label>Series Response</label>
              <pre class="well well-sm ascd-dev-resp-series">{}</pre>
            </div>
          </div>
        </div>
      </div>`;
      modal.find('.ascd-dev-slot').replaceWith(devHtml);
      dev.$reqPrev  = modal.find('.ascd-dev-req-preview');
      dev.$respPrev = modal.find('.ascd-dev-resp-preview');
      dev.$reqVar   = modal.find('.ascd-dev-req-series');
      dev.$respVar  = modal.find('.ascd-dev-resp-series');
      dev.$btnPrev  = modal.find('.ascd-send-preview');
      dev.$btnVars  = modal.find('.ascd-send-vars');
    }

    // In-memory UI state
    var state = {
      catalog: {measures:[]},     // normalized measures catalog
      type: (opts.defaults && opts.defaults.type) || 'line',
      yLeft: [], yRight: [],      // selected variable ids for left/right Y
      gaugeVal: null,             // selected variable id for gauge
      yesnoVal: null,             // selected variable id for yes/no
      lastOutput: null,           // last Highcharts options or yes/no render marker
      _catalogReady: false,       // when catalog finished loading
      _pendingPopulate: null,     // hold an incoming config until catalog ready
      tfFrom: null,               // active time range (unix seconds)
      tfTo: null
    };

    /** Update the status message area. */
    function status(msg, error){
      statusEl.text(msg||'');
      statusEl.toggleClass('text-danger', !!error);
    }

    /** True for cartesian (non-gauge/non-yesno) types. */
    function isCartesianType(t){ return !/^(gauge|yesno)$/.test(t); }

    /** Map UI type to Highcharts base series type (3D → 2D base). */
    function mapTypeForConfig(t){ return (t==='column3d')?'column':(t==='area3d'?'area':t); }

    /** Whether the selection has at least one visible series/target. */
    function computeHasAnySeries(){
      if (state.type==='gauge') return !!state.gaugeVal;
      if (state.type==='yesno') return !!state.yesnoVal;
      return !!(state.yLeft.length || state.yRight.length);
    }

    /** Enable/disable Reset button based on current selections. */
    function updateResetEnabled(){
      btnReset.prop('disabled', !computeHasAnySeries());
    }

    /** Enable/disable axis-specific controls. */
    function updateAxisControls(){
      thumbLeft.prop('disabled', state.yLeft.length===0);
      clearYLeft.prop('disabled', state.yLeft.length===0);
      thumbRight.prop('disabled', state.yRight.length===0);
      clearYRight.prop('disabled', state.yRight.length===0);
    }

    /** Allow preview only once we have at least one mapped field for the type. */
    function canPreviewNow(){
      if (isCartesianType(state.type)) return !!(state.yLeft.length || state.yRight.length);
      if (state.type==='gauge') return !!state.gaugeVal;
      if (state.type==='yesno') return !!state.yesnoVal;
      return false;
    }

    /** Switch the visible mapping section by type and optionally trigger preview. */
    function selectType(t){
      state.type = t;
      types.find('.list-group-item').removeClass('active').filter('[data-type="'+t+'"]').addClass('active');
      var isGauge=(t==='gauge'), isYesNo=(t==='yesno'), isCart=!/^(gauge|yesno)$/.test(t);
      modal.find('.ascd-mapping-cart').toggle(isCart);
      modal.find('.ascd-mapping-gauge').toggle(isGauge);
      modal.find('.ascd-mapping-yesno').toggle(isYesNo);
      updateAxisControls();
      updateResetEnabled();
      if (canPreviewNow()) previewChart(); else { status(''); state.lastOutput=null; btnSave.prop('disabled', true); preview.empty(); }
    }

    /** Render a small removable pill for a mapped measure. */
    function badge(id, label){
      return `
        <span class="label label-primary ascd-badge" data-id="${escapeHtml(id)}" style="display:inline-block;margin:2px;">
          ${escapeHtml(label)}
          <span class="fa-solid fa-trash ascd-remove" title="Remove" style="margin-left:4px; cursor:pointer;"></span>
        </span>
      `;
    }

    /** Replace content of a single-target drop (gauge/yesno). */
    function setSingleTarget(drop, field){ drop.empty().append($(badge(field.id, field.label))); }

    /** Append a measure to a multi-target drop (left/right Y). */
    function addMultiTarget(drop, field, arr){
      if(arr.indexOf(field.id)===-1){
        arr.push(field.id);
        drop.append($(badge(field.id, field.label)));
      }
      updateAxisControls();
      updateResetEnabled();
    }

    /** Remove a mapped measure pill and update state. */
    function removeBadge(b){
      var id=b.data('id');
      var container = b.closest('.ascd-drop');
      b.remove();
      if (container.hasClass('ascd-drop-gauge'))      state.gaugeVal=null;
      else if (container.hasClass('ascd-drop-yesno')) state.yesnoVal=null;
      else if (container.hasClass('ascd-drop-y-left'))  state.yLeft = state.yLeft.filter(function(y){ return y!==id; });
      else if (container.hasClass('ascd-drop-y-right')) state.yRight = state.yRight.filter(function(y){ return y!==id; });
      updateAxisControls();
      updateResetEnabled();
      maybeAutoPreview();
    }

    /** Preview automatically when selection changes. */
    function maybeAutoPreview(){
      updateSaveEnabled();
      if (canPreviewNow()) previewChart();
      else { preview.empty(); state.lastOutput=null; btnSave.prop('disabled', true); }
    }

    /** Make a drop-zone accept JSON drag payloads with a `kind` discriminator. */
    function bindDrop(drop, accept, onAdd){
      drop.on('dragover',function(ev){ ev.preventDefault(); $(this).css('border','1px dashed #44ff44'); })
          .on('dragleave',function(){ $(this).css('border','1px dashed #bbb'); })
          .on('drop',function(ev){
            ev.preventDefault(); $(this).css('border','1px dashed #bbb');
            try{
              var data=JSON.parse(ev.originalEvent.dataTransfer.getData('text/plain'));
              if(!data || data.kind!==accept) return;
              onAdd(data);
              maybeAutoPreview();
            }catch(e){}
          });
    }

    // Remove pill clicks (delegated)
    $(document).on('click', '.ascd-remove', function(e){
      e.preventDefault(); e.stopPropagation();
      removeBadge($(this).closest('.ascd-badge'));
    });

    /** Construct a draggable label for a measure entry. */
    function mkMeasurePill(m){
      var labelText = m.label || m.id;
      var titleTip = (m.label||m.id) + ' — ' + (m.id) + (m.table?(' — table: '+m.table):'');
      var wrap = $('<div class="ascd-measure-pill"></div>');

      var label = $('<span class="label label-default" draggable="true"></span>')
        .attr('title', escapeHtml(titleTip))
        .html(`<strong>${escapeHtml(labelText)}</strong>`)
        .data('field', { id:m.id, label:labelText, table:m.table||'', kind:'measure' });

      label.on('dragstart', function(ev){
        ev.originalEvent.dataTransfer.setData('text/plain', JSON.stringify($(this).data('field')));
      });

      wrap.append(label);
      return wrap;
    }

    /** Group measures by "group" property for accordion rendering. */
    function groupMeasures(measures){
      var map = {}; measures.forEach(function(m){ (map[m.group||'Other']=map[m.group||'Other']||[]).push(m); }); return map;
    }

    /** Render the variables accordion. */
    function renderMeasureGroups(){
      var grouped = groupMeasures(state.catalog.measures);
      var names = Object.keys(grouped).sort();
      groups.empty();

      names.forEach(function(name, idx){
        var items = grouped[name];
        var gid = 'ascd-g-' + idx;

        var panel = $('<div class="panel panel-default"></div>');

        panel.append($(`
          <div class="panel-heading">
            <h5 class="panel-title" style="margin:0;">
              <a data-toggle="collapse" href="#${gid}">
                ${tcase(name)} <span class="text-muted">(${items.length})</span>
              </a>
            </h5>
          </div>
        `));

        var body = $(
          `<div id="${gid}" class="panel-collapse collapse">
            <div class="panel-body"></div>
          </div>`
        );

        items.forEach(function(m){ body.find('.panel-body').append(mkMeasurePill(m)); });

        panel.append(body);
        groups.append(panel);
      });

      if (!groups.children().length){
        groups.append('<div class="text-muted">No measures available.</div>');
      }
    }

    /** Enable the Save button only after a successful preview exists. */
    function updateSaveEnabled(){
      var ok=false;
      switch(state.type){
        case 'gauge': ok=!!state.gaugeVal; break;
        case 'yesno': ok=!!state.yesnoVal; break;
        default: ok=(state.yLeft.length || state.yRight.length);
      }
      btnSave.prop('disabled', !(ok && state.lastOutput));
    }

    /**
     * Build the persisted chart config from current UI state.
     * - Adds per-axis titles based on the first series per axis
     * - Moves identical per-series `table` property to a top-level `table`
     */
    function buildChartConfig(){
      function findMeta(id){ return (state.catalog.measures||[]).filter(function(m){ return m.id===id; })[0] || null; }
      var group = $.trim(groupInput.val() || 'Custom') || 'Custom';
      var title = $.trim(titleInput.val());

      // Singular targets: gauge / yesno
      if (state.type === 'gauge'){
        var mg = findMeta(state.gaugeVal) || {label: state.gaugeVal, table: ''};
        var cfg = {
          title: title || null,
          icon: 'fa-solid fa-gauge',
          type: 'gauge',
          group: group,
          series: [{ name: mg.label || state.gaugeVal, variable: state.gaugeVal }]
        };
        if (mg.table) cfg.table = mg.table;
        return cfg;
      }
      if (state.type === 'yesno'){
        var my = findMeta(state.yesnoVal) || {label: state.yesnoVal, table: ''};
        var cfgY = {
          title: title || null,
          icon: 'fas fa-toggle-on',
          type: 'yesno',
          group: group,
          series: [{ name: my.label || state.yesnoVal, variable: state.yesnoVal }]
        };
        if (my.table) cfgY.table = my.table;
        return cfgY;
      }

      // Cartesian targets (left/right), with optional thumbnail flags
      var leftThumb = !!thumbLeft.prop('checked');
      var rightThumb = !!thumbRight.prop('checked');

      var leftIds = state.yLeft.slice(0), rightIds = state.yRight.slice(0);
      var byAxisTitle = {0:null, 1:null};
      var series = [];

      leftIds.forEach(function(id){
        var m=findMeta(stripThumbSuffix(id)) || {label:stripThumbSuffix(id), table:''};
        if (byAxisTitle[0]===null) byAxisTitle[0]=m.label||id;
        var variable = stripThumbSuffix(id) + (leftThumb ? '|true' : '');
        series.push({ name: m.label||id, yAxis: 0, variable: variable, table: m.table||'' });
      });
      rightIds.forEach(function(id){
        var m=findMeta(stripThumbSuffix(id)) || {label:stripThumbSuffix(id), table:''};
        if (byAxisTitle[1]===null) byAxisTitle[1]=m.label||id;
        var variable = stripThumbSuffix(id) + (rightThumb ? '|true' : '');
        series.push({ name: m.label||id, yAxis: 1, variable: variable, table: m.table||'' });
      });

      // Build yAxis array only for axes that have series
      var yAxis = [];
      if (leftIds.length){ yAxis.push({ title: { text: byAxisTitle[0] || 'Left' } }); }
      if (rightIds.length){ yAxis.push({ title: { text: byAxisTitle[1] || 'Right' }, opposite: true }); }
      if (!yAxis.length){ yAxis = [{ title:{ text: '' } }]; }

      // If all series share the same table, lift to top-level
      var tables = series.map(function(s){ return s.table||''; }).filter(Boolean);
      var uniqueTables = Array.from(new Set(tables));
      var rootTable = null;
      if (uniqueTables.length===1){
        rootTable = uniqueTables[0];
        series = series.map(function(s){ var c=$.extend({}, s); delete c.table; return c; });
      }

      var iconMap={ line:'fas fa-chart-line', spline:'fas fa-wave-square', area:'fas fa-chart-area', column:'fas fa-chart-bar', bar:'fas fa-chart-bar', column3d:'fas fa-cube', area3d:'fas fa-cubes' };
      var icon = iconMap[state.type] || 'fas fa-chart-line';

      var finalCfg = {
        icon: icon,
        group: group,
        title: title || null,
        type: mapTypeForConfig(state.type),
        yAxis: yAxis,
        series: series
      };
      if (rootTable) finalCfg.table = rootTable;
      return finalCfg;
    }

    /** Construct payload for dev-only VariableSeriesData endpoint. */
    function buildVariableSeriesPayload(){
      function metaFor(id){
        var m = (state.catalog.measures||[]).filter(function(x){ return x.id===id; })[0];
        return m || { id:id, table:'' };
      }
      if (state.type==='gauge'){
        var mg = metaFor(state.gaugeVal);
        return { type:'gauge', valueField: { variable: state.gaugeVal, table: mg.table || '' } };
      }
      if (state.type==='yesno'){
        var my = metaFor(state.yesnoVal);
        return { type:'yesno', valueField: { variable: state.yesnoVal, table: my.table || '' } };
      }
      var left = (state.yLeft||[]).map(function(id){ var m=metaFor(stripThumbSuffix(id)); return { variable:stripThumbSuffix(id), table:m.table||'' }; });
      var right = (state.yRight||[]).map(function(id){ var m=metaFor(stripThumbSuffix(id)); return { variable:stripThumbSuffix(id), table:m.table||'' }; });
      return { type: state.type, xField: 'timestamp', xIsDatetime: true, yLeft: left, yRight: right };
    }

    /**
     * Sanitize incoming series from the server: ensure [x,y] tuples, drop NaNs,
     * and preserve yAxis/opposite hints where provided.
     */
    function cleanSeries(series){
      series = Array.isArray(series) ? series : [];
      return series.map(function(s){
        var pts = Array.isArray(s.data) ? s.data : [];
        var clean = pts.filter(function(p){
          if (Array.isArray(p)) return p.length >= 2 && isFinite(p[0]) && isFinite(p[1]);
          if (p && typeof p === 'object' && 'x' in p && 'y' in p) return isFinite(p.x) && isFinite(p.y);
          return false;
        }).map(function(p){ return Array.isArray(p) ? p : [p.x, p.y]; });

        return {
          id: s.id || s.variable || s.name,
          name: s.name || s.id || s.variable,
          data: clean,
          yAxis: (s.yAxis === 1 ? 1 : 0),
          opposite: s.opposite === true
        };
      });
    }

    /** Minimal yes/no renderer; writes directly into preview element. */
    function renderYesNoLabel(value, intoEl){
      var truthy = toBool(value);
      var txt = truthy ? 'YES' : 'NO';
      var cls = truthy ? 'yes-chip' : 'no-chip';
      $(intoEl).html(`
        <div class="yesno-wrap">
          <span class="yesno-chip ${cls}">${txt}</span>
        </div>
      `);
      return { kind:'yesnoLabel', value:value, truthy:truthy };
    }

    /**
     * Convert a normalized server response to Highcharts options, per type.
     * - For gauge: either use provided series or wrap single numeric value
     * - For yes/no: render a chip into the preview and return sentinel object
     * - For cartesian: build yAxis and series arrays; support dual axes
     */
    function toHighcharts(query, data){
      var cfg = baseConfigFor(query.type);
      cfg = deepMerge(cfg, { title:{ text:null }, credits:{enabled:false} });

      if (query.type === 'gauge') {
        if (data && Array.isArray(data.series)) { cfg.series = data.series; return cfg; }
        var v = data && data.value;
        if (v && typeof v === 'object') { if ('value' in v) v = v.value; else if ('y' in v) v = v.y; }
        var val = isFinite(+v) ? +v : 0;
        cfg.series = [{ name: query.valueField || 'Value', data: [val] }];
        return cfg;
      }

      if (query.type === 'yesno') {
        var yn = data && data.value;
        if (yn && typeof yn === 'object') { if ('value' in yn) yn = yn.value; else if ('y' in yn) yn = yn.y; }
        return renderYesNoLabel(yn, $('#ascd-preview')[0]);
      }

      var isCol3D = (query.type==='column3d');
      var isArea3D = (query.type==='area3d');
      var baseType = isCol3D ? 'column' : (isArea3D ? 'area' : (query.type==='spline' ? 'spline' : query.type));

      var incoming = cleanSeries(data.series || []);
      var anyRight = incoming.some(function(s){ return s.yAxis === 1 || s.opposite === true; });

      // yAxis assembly: prefer server-provided, else synthesize
      if (Array.isArray(data.yAxis) && data.yAxis.length){
        cfg.yAxis = data.yAxis.map(function(ax, i){
          ax = ax || {};
          ax.title = ax.title || { text: null };
          ax.labels = ax.labels || {};
          ax.labels.enabled = true;
          if (i === 1 && typeof ax.opposite === 'undefined') ax.opposite = true;
          return ax;
        });
      } else {
        if (!cfg.yAxis){
          cfg.yAxis = [{ title:{text:null}, labels:{enabled:true} }];
        } else if (!Array.isArray(cfg.yAxis)){
          cfg.yAxis = [cfg.yAxis];
        }
        if (anyRight && cfg.yAxis.length === 1){
          cfg.yAxis.push({ title:{text:null}, opposite:true, labels:{enabled:true} });
        }
      }

      cfg.series = incoming.map(function(s){
        var out = { id:s.id, name:s.name||s.id, data:s.data, type: baseType };
        if (cfg.yAxis && cfg.yAxis.length > 1){
          out.yAxis = (s.yAxis === 1 || s.opposite === true) ? 1 : 0;
        }
        return out;
      });

      return cfg;
    }

    /** Get current time range; default to last N seconds from options. */
    function getActiveRange(){
      if (isFinite(state.tfFrom) && isFinite(state.tfTo)) return { from: state.tfFrom, to: state.tfTo };
      var now = Math.floor(Date.now()/1000);
      var sec = (opts.timeframe && opts.timeframe.defaultSeconds) || 24*3600;
      return { from: now - sec, to: now };
    }

    /** Set the active time range (unix seconds). */
    function setRange(from, to){
      if (isFinite(from) && isFinite(to)){
        state.tfFrom = Math.floor(from);
        state.tfTo   = Math.floor(to);
      }
    }

    /** Open external time range modal if present, else emit a generic event. */
    function openTimeRangeModal(){
      var cur = getActiveRange();
      $('#ascd-trm').remove();
      var hostDiv = $('<div id="ascd-trm"></div>').appendTo(document.body);
      if ($.fn.timeRangeModal){
        try{
          hostDiv.timeRangeModal({ from: cur.from, to: cur.to, wide: true });
          if (typeof hostDiv.timeRangeModal === 'function'){
            hostDiv.timeRangeModal('open');
          }
        }catch(_){}
      } else {
        try { $(document).trigger('tr.open', [{from:cur.from, to:cur.to}]); } catch(_){}
      }
    }

    // Time range apply hooks (both names are listened for)
    $(document).on('tr.apply.ascd', function(e, payload){
      if (payload && isFinite(payload.from) && isFinite(payload.to)){
        setRange(payload.from, payload.to);
        if (canPreviewNow()) previewChart();
      }
    });
    $(document).on('tr.apply', function(e, payload){
      if (payload && isFinite(payload.from) && isFinite(payload.to)){
        setRange(payload.from, payload.to);
        if (canPreviewNow()) previewChart();
      }
    });

    /** Render preview using a server response payload. */
    function previewFromServer(resp){
      try{
        var q = { type: state.type, yLeft: state.yLeft.map(stripThumbSuffix), yRight: state.yRight.map(stripThumbSuffix), valueField: state.gaugeVal || state.yesnoVal };
        // Special case: gauge data can come as full series
        if (resp && resp.type === 'gauge' && Array.isArray(resp.series)) {
          var gcfg = deepMerge(baseConfigFor('gauge'), { series: resp.series });
          Highcharts.chart(preview[0], gcfg);
          state.lastOutput = gcfg;
          status('Preview updated with server gauge data.');
          updateSaveEnabled();
          return;
        }
        var normalized = (q.type==='gauge' || q.type==='yesno')
          ? { value: (resp && (resp.value !== undefined ? resp.value : (resp.data !== undefined ? resp.data : null))) }
          : { series: resp && resp.series ? resp.series : [] };

        var hc = toHighcharts(q, normalized);
        if (hc && hc.kind === 'yesnoLabel'){
          state.lastOutput = hc; // sentinel for yes/no render
        } else {
          Highcharts.chart(preview[0], hc);
          state.lastOutput = hc;
        }
        status('Preview updated with server data.');
        updateSaveEnabled();
      } catch(e){
        console.error(e);
        status('Could not render server data: '+e, true);
      }
    }

    /**
     * Collect current config + range, POST to graphDataUrl, then render.
     * Developer Console mirrors request/response for troubleshooting.
     */
    function previewChart(){
      state.lastOutput=null; updateSaveEnabled();

      if (state.type==='gauge' && !state.gaugeVal) { status('Select a gauge value field.', true); return; }
      if (state.type==='yesno' && !state.yesnoVal) { status('Select a yes/no value field.', true); return; }
      if (!/^(gauge|yesno)$/.test(state.type) && !(state.yLeft.length || state.yRight.length)) {
        status('Drag at least one measure into Y Left/Right.', true); return;
      }

      var chartConfig = buildChartConfig();
      var r = getActiveRange();
      var previewPayload = { chartConfig: chartConfig, range: { from: r.from, to: r.to } };

      if (dev.enabled && dev.$reqPrev) dev.$reqPrev.text(JSON.stringify(previewPayload, null, 2));

      status('Preview: requesting data from server…');
      $.ajax({
        url: (opts.graphDataUrl || 'includes/chartutil.php?request=GraphData'),
        method: 'POST',
        data: JSON.stringify(previewPayload),
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        cache: false,
               timeout: 15000
      }).done(function(resp){
        if (dev.enabled && dev.$respPrev) {
          try { dev.$respPrev.text(JSON.stringify(resp, null, 2)); } catch(_) { dev.$respPrev.text('OK (non-JSON)'); }
        }
        previewFromServer(resp);
      }).fail(function(xhr){
        var msg='Server preview failed'; if (xhr && xhr.status) msg+=' ('+xhr.status+')';
        if (dev.enabled && dev.$respPrev) dev.$respPrev.text(msg + (xhr && xhr.responseText ? '\n' + xhr.responseText : ''));
        status(msg, true);
      });
    }

    /** Dev helper: send the variable selection to variableSeriesUrl. */
    function sendVariableSeries(){
      function canSend(){
        if (state.type==='gauge') return !!state.gaugeVal;
        if (state.type==='yesno') return !!state.yesnoVal;
        return !!(state.yLeft.length || state.yRight.length);
      }
      if (!canSend()){
        status('Add at least one measure first.', true);
        return;
      }
      var payload = buildVariableSeriesPayload();
      if (dev.enabled && dev.$reqVar) dev.$reqVar.text(JSON.stringify(payload, null, 2));
      if (!opts.variableSeriesUrl) {
        if (dev.enabled && dev.$respVar) dev.$respVar.text('No variableSeriesUrl configured.');
        return;
      }
      $.ajax({
        url: opts.variableSeriesUrl,
        method: 'POST',
        data: JSON.stringify(payload),
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        timeout: 15000
      }).done(function(resp){
        if (dev.enabled && dev.$respVar) {
          try { dev.$respVar.text(JSON.stringify(resp, null, 2)); } catch(_) { dev.$respVar.text('OK (non-JSON)'); }
        }
      }).fail(function(xhr){
        var msg='Series request failed'; if (xhr && xhr.status) msg+=' ('+xhr.status+')';
        if (dev.enabled && dev.$respVar) dev.$respVar.text(msg + (xhr && xhr.responseText ? '\n' + xhr.responseText : ''));
      });
    }

    /** Populate the UI from an existing ChartConfig object. */
    function applyConfigToUI(cfg){
      try {
        // Clear current selections/state
        dropYLeft.empty(); dropYRight.empty(); dropGauge.empty(); dropYesNo.empty();
        state.yLeft = []; state.yRight = []; state.gaugeVal = null; state.yesnoVal = null;
        thumbLeft.prop('checked', false); thumbRight.prop('checked', false);
        preview.empty(); state.lastOutput = null;

        if (cfg.title) titleInput.val(String(cfg.title));
        groupInput.val(String(cfg.group || 'Custom'));

        var t = String(cfg.type || 'line').toLowerCase();
        var allowedTypes = {line:1,spline:1,area:1,column:1,bar:1,gauge:1,yesno:1,area3d:1,column3d:1};
        if (!allowedTypes[t]) t = 'line';
        selectType(t);

        var series = Array.isArray(cfg.series) ? cfg.series : [];

        if (t === 'gauge') {
          if (series[0]) {
            var varIdG = series[0].variable || series[0].id || series[0].name || '';
            varIdG = String(varIdG);
            state.gaugeVal = stripThumbSuffix(varIdG);
            setSingleTarget(dropGauge, { id: state.gaugeVal, label: series[0].name || state.gaugeVal });
          }
        } else if (t === 'yesno') {
          if (series[0]) {
            var varIdY = series[0].variable || series[0].id || series[0].name || '';
            varIdY = String(varIdY);
            state.yesnoVal = stripThumbSuffix(varIdY);
            setSingleTarget(dropYesNo, { id: state.yesnoVal, label: series[0].name || state.yesnoVal });
          }
        } else {
          // Cartesian: restore left/right series, detect thumbnail flags per side
          var leftHadThumb = false, rightHadThumb = false;

          series.forEach(function(s){
            var vid = String(s.variable || s.id || s.name || '');
            if (!vid) return;
            var isRight = (s.yAxis === 1 || s.opposite === true);
            if (isRight) {
              state.yRight.push(stripThumbSuffix(vid));
              rightHadThumb = rightHadThumb || hasThumbSuffix(vid);
              dropYRight.append($(badge(stripThumbSuffix(vid), s.name || stripThumbSuffix(vid))));
            } else {
              state.yLeft.push(stripThumbSuffix(vid));
              leftHadThumb = leftHadThumb || hasThumbSuffix(vid);
              dropYLeft.append($(badge(stripThumbSuffix(vid), s.name || stripThumbSuffix(vid))));
            }
          });

          thumbLeft.prop('checked', !!leftHadThumb);
          thumbRight.prop('checked', !!rightHadThumb);
        }

        updateAxisControls();
        updateResetEnabled();
        updateSaveEnabled();
        if (canPreviewNow()) previewChart();

      } catch (e) {
        console.error('applyConfigToUI failed:', e);
        status('Could not populate editor from the existing chart.', true);
      }
    }

    // Bind type selection and drop-zones
    types.on('click','.list-group-item',function(e){ e.preventDefault(); selectType($(this).data('type')); });
    bindDrop(dropYLeft,'measure',function(f){ addMultiTarget(dropYLeft,f,state.yLeft); });
    bindDrop(dropYRight,'measure',function(f){ addMultiTarget(dropYRight,f,state.yRight); });
    bindDrop(dropGauge,'measure',function(f){ setSingleTarget(dropGauge,f); state.gaugeVal=f.id; updateResetEnabled(); });
    bindDrop(dropYesNo,'measure',function(f){ setSingleTarget(dropYesNo,f); state.yesnoVal=f.id; updateResetEnabled(); });

    // Clear buttons
    clearYLeft.on('click',function(e){
      e.preventDefault();
      dropYLeft.empty(); state.yLeft=[];
      updateAxisControls(); updateResetEnabled(); updateSaveEnabled();
      if (state.yRight.length>0) previewChart(); else { preview.empty(); state.lastOutput=null; btnSave.prop('disabled', true); }
    });
    clearYRight.on('click',function(e){
      e.preventDefault();
      dropYRight.empty(); state.yRight=[];
      updateAxisControls(); updateResetEnabled(); updateSaveEnabled();
      if (state.yLeft.length>0) previewChart(); else { preview.empty(); state.lastOutput=null; btnSave.prop('disabled', true); }
    });
    clearGauge.on('click',function(e){
      e.preventDefault();
      dropGauge.empty(); state.gaugeVal=null;
      updateResetEnabled(); updateSaveEnabled();
      preview.empty(); state.lastOutput=null; btnSave.prop('disabled', true);
    });
    clearYesNo.on('click',function(e){
      e.preventDefault();
      dropYesNo.empty(); state.yesnoVal=null;
      updateResetEnabled(); updateSaveEnabled();
      preview.empty(); state.lastOutput=null; btnSave.prop('disabled', true);
    });

    // Thumbnail toggle impacts variable id suffix → triggers preview
    thumbLeft.on('change', function(){ if (state.yLeft.length) maybeAutoPreview(); });
    thumbRight.on('change', function(){ if (state.yRight.length) maybeAutoPreview(); });

    // Actions
    btnPreview.on('click', function(e){ e.preventDefault(); previewChart(); });
    btnTime.on('click', function(e){ e.preventDefault(); openTimeRangeModal(); });
    if (dev.enabled) {
      dev.$btnPrev.on('click', previewChart);
      dev.$btnVars.on('click', sendVariableSeries);
    }

    /** Fetch and normalize the measures catalog, then render. */
    function fetchCatalog(){
      var url = (opts.variablesUrl || 'includes/chartutil.php?request=AvailableVariables');
      var d = $.Deferred();
      $.ajax({ url: url, method: 'GET', dataType: 'json', cache: false })
        .done(function(resp){
          try {
            var measuresFlat = normalizeCatalog(resp);
            d.resolve({ measures: measuresFlat });
          } catch (e){ d.reject(e); }
        })
        .fail(function(xhr){ d.reject(new Error('Failed to load variable catalog (' + (xhr.status||'') + ').')); });
      return d.promise();
    }

    /** Normalize catalog payload into a flat [{id,label,group,table,description}] list. */
    function normalizeCatalog(resp){
      var out = [];
      if (Array.isArray(resp)){
        resp.forEach(function(item){
          if (!item) return;
          var id = item.id || item.variable || item.name || '';
          if (!id) return;
          var label = item.description || item.label || id;
          var group = item.group || item.category || 'Other';
          var table = item.table || '';
          out.push({ id: id, label: label, table: table, description: label, group: group });
        });
        return out;
      }
      Object.keys(resp || {}).forEach(function(group){
        var measures = resp[group] || {};
        Object.keys(measures).forEach(function(id){
          var meta = measures[id] || {};
          out.push({
            id: id,
            label: meta.description || id,
            table: meta.table || '',
            description: meta.description || '',
            group: group
          });
        });
      });
      return out;
    }

    // Load catalog; if a config was queued pre-catalog, apply it after load
    fetchCatalog().done(function(cat){
      state.catalog = cat;
      state._catalogReady = true;
      renderMeasureGroups();
      status('Fields ready.');
      if (state._pendingPopulate) {
        applyConfigToUI(state._pendingPopulate);
        state._pendingPopulate = null;
      }
    }).fail(function(err){
      console.error(err);
      status('Failed to load fields: ' + (err && err.message ? err.message : err), true);
    });

    // Initial type selection and form bindings
    selectType(state.type);
    titleInput.on('input', updateSaveEnabled);

    // Reset wipes all mappings and preview output
    btnReset.on('click', function(){
      if ($(this).prop('disabled')) return;
      dropYLeft.empty(); dropYRight.empty(); dropGauge.empty(); dropYesNo.empty();
      state.yLeft=[]; state.yRight=[]; state.gaugeVal=null; state.yesnoVal=null;
      thumbLeft.prop('checked', false); thumbRight.prop('checked', false);
      preview.empty(); state.lastOutput=null;
      updateAxisControls(); updateResetEnabled(); updateSaveEnabled();
    });

    // Save emits final config + last preview options and closes the modal
    btnSave.on('click', function(){
      if (!state.lastOutput){ status('Preview first.', true); return; }
      var finalCfg = buildChartConfig();
      var payloadOut={ configJSON: finalCfg, previewOutput: state.lastOutput };
      host.trigger('allskyChartDesigner:save', payloadOut);
      $(modal).modal('hide');
    });

    /** Open the modal, optionally pre-populating from config or 
     *  loading by name via opts.loadChartUrl. */
    function doOpen(optsOpen){
      $(modal).modal('show');

      // Direct config provided – populate immediately (or defer until catalog ready)
      if (optsOpen && optsOpen.config && typeof optsOpen.config === 'object') {
        if (state._catalogReady) applyConfigToUI(optsOpen.config);
        else state._pendingPopulate = optsOpen.config;
        return;
      }

      // Load by name from server, if configured
      if (optsOpen && optsOpen.name && opts.loadChartUrl) {
        var req = { name: String(optsOpen.name) };
        $.ajax({
          url: opts.loadChartUrl,
          method: 'POST',
          data: JSON.stringify(req),
          contentType: 'application/json; charset=utf-8',
          dataType: 'json',
          cache: false,
          timeout: 15000
        }).done(function(resp){
          var cfg = (resp && resp.config) ? resp.config : resp;
          if (cfg && typeof cfg === 'object') {
            if (state._catalogReady) applyConfigToUI(cfg);
            else state._pendingPopulate = cfg;
          } else {
            status('Could not load chart for editing.', true);
          }
        }).fail(function(xhr){
          var msg='Load chart failed'; if (xhr && xhr.status) msg+=' ('+xhr.status+')';
          status(msg, true);
        });
      }
    }

    // Expose minimal API on the host element
    host.data('allskyChartDesigner', {
      open: function(optsOpen){ doOpen(optsOpen || {}); }
    });
  }

  /** jQuery plugin wrapper – ensures single instance per host element. */
  $.fn.allskyChartDesigner = function(options){
    var defaults = {
      defaults:{type:'line'},
      variablesUrl: 'includes/chartutil.php?request=AvailableVariables',
      graphDataUrl: 'includes/chartutil.php?request=GraphData',
      variableSeriesUrl: 'includes/chartutil.php?request=VariableSeriesData',
      showDevPanel: false,
      loadChartUrl: null,
      timeframe: {
        selector: null,
        options: null,
        defaultSeconds: 24*3600
      }
    };
    var opts = $.extend(true, {}, defaults, options || {});
    return this.each(function(){
      var thisHost=$(this);
      if(!thisHost.data('allskyChartDesigner')) plugin(thisHost, opts);
    });
  };

})(jQuery);
