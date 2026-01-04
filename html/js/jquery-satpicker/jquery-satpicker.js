/*!
 * $.satellitePicker(options)
 *
 * NOT a Bootstrap modal. Creates its own overlay + dialog stacked above any Bootstrap modal.
 * Uses Bootstrap 3 styling + Font Awesome icons (no glyphicons).
 *
 * Requires:
 *  - jQuery
 *  - Bootstrap 3 CSS (for tables/panels/buttons)
 *  - Font Awesome (e.g. fa-solid/fa)
 */
(function (jQuery) {
  "use strict";

  var defaults = {
    dataUrl: null,
    dataPath: null,

    title: "Select Satellites",
    submitText: "Use Selected",
    cancelText: "Cancel",

    minSearchChars: 1,
    maxResults: 500,
    maxRenderRows: 600,

    // Catalog columns (explicit widths so they don't squash)
    columns: [
      { key: "norad_id",    label: "NORAD",    width: 90 },
      { key: "name",        label: "Name",     width: 340 },
      { key: "country",     label: "Country",  width: 90 },
      { key: "launch_date", label: "Launch",   width: 110 },
      { key: "object_type", label: "Type",     width: 70 },
      { key: "operator",    label: "Operator", width: 160 },
      { key: "orbit",       label: "Orbit",    width: 120 }
    ],

    // Selected columns (compact)
    selectedColumns: [
      { key: "norad_id", label: "NORAD", width: 90 },
      { key: "name",     label: "Name",  width: 260 }
    ],

    preselected: [],
    returnMode: "norad", // "norad" | "name" | "both"

    // Overlay stacking
    stackOffset: 60,
    backdropOpacity: 0.30,
    closeOnBackdrop: true,

    // Layout proportions
    catalogColClass: "col-sm-9",
    selectedColClass: "col-sm-3",

    enableFilters: true,

    // Font Awesome classes (supports FA5/FA6; adjust if you use FA4)
    icons: {
      close: "fa fa-times",
      search: "fa fa-search",
      clear: "fa fa-eraser",
      add: "fa fa-plus",
      added: "fa fa-check",
      remove: "fa fa-trash",
      removeAll: "fa fa-trash-can", // FA6; if not available, fall back to fa-trash below
      selected: "fa fa-star"
    },

    onSubmit: null,
    onOpen: null,
    onLoad: null,

    ajax: {
      method: "GET",
      dataType: "json",
      timeout: 20000
    }
  };

  function toIdString(v) { return jQuery.trim(String(v == null ? "" : v)); }

  function getByPath(obj, path) {
    if (!path) return obj;
    var parts = path.split(".");
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return null;
      cur = cur[parts[i]];
    }
    return cur;
  }

  function normalisePreselected(input) {
    var out = [];
    if (!input) return out;

    if (typeof input === "string") {
      jQuery.each(input.split(","), function (_, s) {
        var id = toIdString(s);
        if (id) out.push(id);
      });
      return out;
    }

    if (jQuery.isArray(input)) {
      jQuery.each(input, function (_, item) {
        if (item == null) return;
        if (typeof item === "object") {
          var idObj = item.norad_id != null ? item.norad_id : item.id;
          var id2 = toIdString(idObj);
          if (id2) out.push(id2);
        } else {
          var id3 = toIdString(item);
          if (id3) out.push(id3);
        }
      });
      return out;
    }

    var single = toIdString(input);
    if (single) out.push(single);
    return out;
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function faIcon(cls, title) {
    var t = title ? ' title="' + esc(title) + '"' : "";
    return '<i class="' + esc(cls) + '"' + t + ' aria-hidden="true"></i>';
  }

  function SatellitePicker(options) {
    this.opts = jQuery.extend(true, {}, defaults, options || {});
    // fallback if removeAll icon not present in FA version
    if (this.opts.icons.removeAll === "fa fa-trash-can") {
      // harmless even if it exists; still renders if FA6 loaded
      // but if user only has FA4/5, it may show blank; provide fallback usage in buttons
    }

    this.id = "satPicker_" + Math.random().toString(16).slice(2);

    this.sats = [];
    this.indexReady = false;
    this.selected = {};

    this.groups = [];
    this.countries = [];

    this.$root = null;
    this.$backdrop = null;
    this.$dialog = null;

    this.$search = null;
    this.$group = null;
    this.$country = null;

    this.$status = null;
    this.$count = null;
    this.$selectedCount = null;

    this.$catalogHead = null;
    this.$catalogBody = null;
    this.$selectedHead = null;
    this.$selectedBody = null;

    this._build();
    this._loadData();
  }

  // ---------------- Public API ----------------

  SatellitePicker.prototype.open = function () {
    var z = this._computeTopZ() + this.opts.stackOffset;

    this.$backdrop.css({
      display: "block",
      opacity: this.opts.backdropOpacity,
      zIndex: z
    });

    this.$dialog.css({
      display: "block",
      zIndex: z + 10
    });

    this.$search.focus();

    var self = this;
    jQuery(document).on("keydown." + this.id, function (e) {
      if (e.which === 27) {
        e.preventDefault();
        self.close();
      }
    });

    if (typeof this.opts.onOpen === "function") {
      this.opts.onOpen(this);
    }
  };

  SatellitePicker.prototype.close = function () {
    this.$backdrop.hide();
    this.$dialog.hide();
    jQuery(document).off("keydown." + this.id);
  };

  SatellitePicker.prototype.destroy = function () {
    this.close();
    this.$root.remove();
  };

  SatellitePicker.prototype.setSelected = function (preselected) {
    var ids = normalisePreselected(preselected);
    var byId = {};
    for (var i = 0; i < this.sats.length; i++) byId[this.sats[i].norad_id] = this.sats[i];

    this.selected = {};
    for (var j = 0; j < ids.length; j++) {
      var id = ids[j];
      this.selected[id] = byId[id] || { norad_id: id, name: "(Unknown satellite)", _nameLower: "(unknown satellite)" };
    }

    this._renderSelected();
    this._renderCatalog();
  };

  // ---------------- Internal: stacking ----------------

  SatellitePicker.prototype._computeTopZ = function () {
    var max = 1040;
    jQuery(".modal.in:visible, .modal-backdrop.in:visible").each(function () {
      var z = parseInt(jQuery(this).css("z-index"), 10);
      if (!isNaN(z)) max = Math.max(max, z);
    });
    return max;
  };

  // ---------------- Build UI ----------------

  SatellitePicker.prototype._build = function () {
    var ic = this.opts.icons;

    var html = ''
      + '<div class="satpicker-root" id="' + this.id + '">'
      + '  <div class="satpicker-backdrop" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:#000;"></div>'
      + '  <div class="satpicker-dialog" style="display:none; position:fixed; top:12vh; left:50%; transform:translateX(-50%); width:98vw; max-width:1500px; height:70vh;">'
      + '    <div class="panel panel-default" style="height:100%; margin:0; display:flex; flex-direction:column; box-shadow:0 10px 30px rgba(0,0,0,0.35);">'

      + '      <div class="panel-heading clearfix" style="flex:0 0 auto;">'
      + '        <button type="button" class="close js-sp-close" aria-label="Close">'
      +            faIcon(ic.close, "Close") + '</button>'
      + '        <h3 class="panel-title" style="font-size:16px; line-height:22px; margin:0;">' + esc(this.opts.title) + '</h3>'
      + '      </div>'

      + '      <div class="panel-body" style="flex:1 1 auto; overflow:hidden;">'

      // toolbar
      + '        <div class="row" style="margin-bottom:10px;">'
      + '          <div class="col-sm-7 col-md-8">'
      + '            <div class="input-group">'
      + '              <span class="input-group-addon">' + faIcon(ic.search, "Search") + '</span>'
      + '              <input type="text" class="form-control js-sp-search" placeholder="Search by NORAD or name…">'
      + '              <span class="input-group-btn">'
      + '                <button class="btn btn-default js-sp-clear" type="button">' + faIcon(ic.clear, "Clear") + ' Clear</button>'
      + '              </span>'
      + '            </div>'
      + '          </div>'
      + '          <div class="col-sm-5 col-md-4 js-sp-filters" style="display:none;">'
      + '            <div class="row">'
      + '              <div class="col-xs-6">'
      + '                <select class="form-control js-sp-group"><option value="">All groups</option></select>'
      + '              </div>'
      + '              <div class="col-xs-6">'
      + '                <select class="form-control js-sp-country"><option value="">All countries</option></select>'
      + '              </div>'
      + '            </div>'
      + '          </div>'
      + '        </div>'

      + '        <div class="row" style="margin-bottom:8px;">'
      + '          <div class="col-sm-8">'
      + '            <div class="text-muted js-sp-status" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"></div>'
      + '          </div>'
      + '          <div class="col-sm-4 text-right">'
      + '            <span class="label label-default">Shown: <span class="js-sp-count">0</span></span>'
      + '            &nbsp;'
      + '            <span class="label label-primary">' + faIcon(ic.selected, "Selected") + ' <span class="js-sp-selected-count">0</span></span>'
      + '          </div>'
      + '        </div>'

      // main area
      + '        <div class="row" style="height:calc(100% - 78px);">'
      + '          <div class="' + this.opts.catalogColClass + '" style="height:100%;">'
      + '            <div class="panel panel-default" style="height:100%; margin:0; display:flex; flex-direction:column;">'
      + '              <div class="panel-heading" style="flex:0 0 auto;">'
      + '                <strong>Catalog</strong>'
      + '                <span class="text-muted" style="margin-left:10px;">(double-click row to add/remove)</span>'
      + '              </div>'
      + '              <div class="panel-body" style="flex:1 1 auto; overflow:auto; padding:0;">'
      + '                <div class="satpicker-scrollx" style="overflow-x:auto; overflow-y:hidden;">'
      + '                  <table class="table table-condensed table-hover" style="margin:0; min-width:1100px;">'
      + '                    <thead class="js-sp-catalog-head" style="position:sticky; top:0; z-index:2; background:#fff;"></thead>'
      + '                    <tbody class="js-sp-catalog-body"></tbody>'
      + '                  </table>'
      + '                </div>'
      + '              </div>'
      + '            </div>'
      + '          </div>'

      + '          <div class="' + this.opts.selectedColClass + '" style="height:100%;">'
      + '            <div class="panel panel-default" style="height:100%; margin:0; display:flex; flex-direction:column;">'
      + '              <div class="panel-heading clearfix" style="flex:0 0 auto;">'
      + '                <strong>Selected</strong>'
      + '                <button type="button" class="btn btn-xs btn-link pull-right js-sp-removeall" style="padding:0;">'
      +                  (faIcon(ic.removeAll, "Remove all") || faIcon(ic.remove, "Remove all")) + ' Remove all'
      + '                </button>'
      + '              </div>'
      + '              <div class="panel-body" style="flex:1 1 auto; overflow:auto; padding:0;">'
      + '                <div class="satpicker-scrollx" style="overflow-x:auto; overflow-y:hidden;">'
      + '                  <table class="table table-condensed table-hover" style="margin:0; min-width:420px;">'
      + '                    <thead class="js-sp-selected-head" style="position:sticky; top:0; z-index:2; background:#fff;"></thead>'
      + '                    <tbody class="js-sp-selected-body"></tbody>'
      + '                  </table>'
      + '                </div>'
      + '              </div>'
      + '            </div>'
      + '          </div>'
      + '        </div>'

      + '      </div>'

      + '      <div class="panel-footer clearfix" style="flex:0 0 auto;">'
      + '        <div class="pull-left text-muted" style="padding-top:7px;">Tip: use filters to reduce the list.</div>'
      + '        <div class="pull-right">'
      + '          <button type="button" class="btn btn-default js-sp-cancel">' + esc(this.opts.cancelText) + '</button>'
      + '          <button type="button" class="btn btn-primary js-sp-submit">' + esc(this.opts.submitText) + '</button>'
      + '        </div>'
      + '      </div>'

      + '    </div>'
      + '  </div>'
      + '</div>';

    this.$root = jQuery(html);
    jQuery("body").append(this.$root);

    this.$backdrop = this.$root.find(".satpicker-backdrop");
    this.$dialog = this.$root.find(".satpicker-dialog");

    this.$search = this.$root.find(".js-sp-search");
    this.$group = this.$root.find(".js-sp-group");
    this.$country = this.$root.find(".js-sp-country");

    this.$status = this.$root.find(".js-sp-status");
    this.$count = this.$root.find(".js-sp-count");
    this.$selectedCount = this.$root.find(".js-sp-selected-count");

    this.$catalogHead = this.$root.find(".js-sp-catalog-head");
    this.$catalogBody = this.$root.find(".js-sp-catalog-body");
    this.$selectedHead = this.$root.find(".js-sp-selected-head");
    this.$selectedBody = this.$root.find(".js-sp-selected-body");

    this._renderCatalogHead();
    this._renderSelectedHead();
    this._wire();
  };

  SatellitePicker.prototype._wire = function () {
    var self = this;

    if (this.opts.closeOnBackdrop) {
      this.$backdrop.on("click", function () { self.close(); });
    }

    this.$root.find(".js-sp-close, .js-sp-cancel").on("click", function () {
      self.close();
    });

    this.$root.find(".js-sp-clear").on("click", function () {
      self.$search.val("");
      self._renderCatalog();
      self.$search.focus();
    });

    var debounceTimer = null;
    this.$search.on("keyup", function () {
      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(function () {
        self._renderCatalog();
      }, 120);
    });

    this.$group.on("change", function () { self._renderCatalog(); });
    this.$country.on("change", function () { self._renderCatalog(); });

    this.$root.on("dblclick", "tr.js-sp-cat-row", function () {
      var id = jQuery(this).data("id");
      if (self.selected[id]) self._removeById(id);
      else self._addById(id);
    });

    this.$root.on("click", ".js-sp-add", function (e) {
      e.preventDefault();
      self._addById(jQuery(this).data("id"));
    });

    this.$root.on("click", ".js-sp-remove", function (e) {
      e.preventDefault();
      self._removeById(jQuery(this).data("id"));
    });

    this.$root.find(".js-sp-removeall").on("click", function () {
      self.selected = {};
      self._renderSelected();
      self._renderCatalog();
    });

    this.$root.find(".js-sp-submit").on("click", function () {
      var payload = self._buildReturn();
      if (typeof self.opts.onSubmit === "function") {
        self.opts.onSubmit(payload.csv, payload.selectedArray, self);
      }
      jQuery(document).trigger("satellitePicker:submit", [payload.csv, payload.selectedArray, self]);
      self.close();
    });
  };

  // ---------------- Data ----------------

  SatellitePicker.prototype._loadData = function () {
    var self = this;

    if (!this.opts.dataUrl) {
      this._setStatus("No dataUrl provided.", true);
      return;
    }

    this._setStatus("Loading satellites…", false);

    var ajaxOpts = jQuery.extend(true, {}, this.opts.ajax, { url: this.opts.dataUrl });

    jQuery.ajax(ajaxOpts)
      .done(function (resp) {
        var raw = getByPath(resp, self.opts.dataPath) || resp;
        if (!jQuery.isArray(raw)) {
          self._setStatus("Satellite data is not an array (check dataPath).", true);
          return;
        }

        var groupsMap = {};
        var countriesMap = {};

        self.sats = jQuery.map(raw, function (item) {
          if (!item) return null;

          var norad = item.norad_id != null ? item.norad_id : item.id;
          var name  = item.name != null ? item.name : item.satellite_name;

          var noradStr = toIdString(norad);
          var nameStr  = jQuery.trim(String(name == null ? "" : name));
          if (!noradStr || !nameStr) return null;

          var sat = jQuery.extend(true, {}, item);
          sat.norad_id = noradStr;
          sat.name = nameStr;
          sat._nameLower = nameStr.toLowerCase();

          var c = toIdString(sat.country);
          if (c) countriesMap[c] = true;

          var gs = sat.groups || [];
          if (jQuery.isArray(gs)) {
            for (var g = 0; g < gs.length; g++) {
              var gg = toIdString(gs[g]);
              if (gg) groupsMap[gg] = true;
            }
          }

          return sat;
        });

        self.groups = Object.keys(groupsMap).sort();
        self.countries = Object.keys(countriesMap).sort();

        self.indexReady = true;
        self.setSelected(self.opts.preselected);

        self._populateFilters();
        self._setStatus(self.sats.length + " satellites loaded.", false);

        if (typeof self.opts.onLoad === "function") {
          self.opts.onLoad(self.sats, self);
        }

        self._renderCatalog();
      })
      .fail(function (xhr, status) {
        self._setStatus("Failed to load satellites (" + status + ").", true);
      });
  };

  SatellitePicker.prototype._populateFilters = function () {
    if (!this.opts.enableFilters) return;
    if (!this.groups.length && !this.countries.length) return;

    this.$root.find(".js-sp-filters").show();

    var gHtml = '<option value="">All groups</option>';
    for (var i = 0; i < this.groups.length; i++) {
      gHtml += '<option value="' + esc(this.groups[i]) + '">' + esc(this.groups[i]) + '</option>';
    }
    this.$group.html(gHtml);

    var cHtml = '<option value="">All countries</option>';
    for (var j = 0; j < this.countries.length; j++) {
      cHtml += '<option value="' + esc(this.countries[j]) + '">' + esc(this.countries[j]) + '</option>';
    }
    this.$country.html(cHtml);
  };

  // ---------------- Rendering ----------------

  SatellitePicker.prototype._setStatus = function (msg, isError) {
    this.$status
      .toggleClass("text-danger", !!isError)
      .toggleClass("text-muted", !isError)
      .text(msg);
  };

  SatellitePicker.prototype._renderCatalogHead = function () {
    var cols = this.opts.columns;
    var th = '<tr>';

    th += '<th style="width:80px; white-space:nowrap;"></th>';

    for (var i = 0; i < cols.length; i++) {
      var w = cols[i].width ? ('width:' + cols[i].width + 'px;') : '';
      th += '<th style="' + w + ' white-space:nowrap;">' + esc(cols[i].label) + '</th>';
    }

    th += '</tr>';
    this.$catalogHead.html(th);
  };

  SatellitePicker.prototype._renderSelectedHead = function () {
    var cols = this.opts.selectedColumns;
    var th = '<tr>';

    th += '<th style="width:80px; white-space:nowrap;"></th>';

    for (var i = 0; i < cols.length; i++) {
      var w = cols[i].width ? ('width:' + cols[i].width + 'px;') : '';
      th += '<th style="' + w + ' white-space:nowrap;">' + esc(cols[i].label) + '</th>';
    }

    th += '</tr>';
    this.$selectedHead.html(th);
  };

  SatellitePicker.prototype._renderCatalog = function () {
    this.$catalogBody.empty();

    if (!this.indexReady) {
      this._setStatus("Loading satellites…", false);
      this.$count.text("0");
      this._updateSelectedCount();
      return;
    }

    var query = jQuery.trim(this.$search.val() || "");
    var group = toIdString(this.$group.val());
    var country = toIdString(this.$country.val());

    if (query.length < this.opts.minSearchChars && !group && !country) {
      this._setStatus("Type to search, or use filters.", false);
      this.$count.text("0");
      this._updateSelectedCount();
      return;
    }

    var qLower = query.toLowerCase();
    var isNumeric = /^[0-9]+$/.test(query);

    var out = [];
    for (var i = 0; i < this.sats.length; i++) {
      var s = this.sats[i];

      if (country && toIdString(s.country) !== country) continue;

      if (group) {
        var gs = s.groups || [];
        var has = false;
        if (jQuery.isArray(gs)) {
          for (var g = 0; g < gs.length; g++) {
            if (toIdString(gs[g]) === group) { has = true; break; }
          }
        }
        if (!has) continue;
      }

      var match = false;
      if (!query) match = true;
      else if (isNumeric) match = (String(s.norad_id).indexOf(query) !== -1);
      else match = (String(s._nameLower).indexOf(qLower) !== -1) || (String(s.norad_id).indexOf(query) !== -1);

      if (match) out.push(s);
      if (out.length >= this.opts.maxResults) break;
    }

    var render = out.slice(0, this.opts.maxRenderRows);

    if (!render.length) {
      this._setStatus("No matches.", false);
      this.$count.text("0");
      this._updateSelectedCount();
      return;
    }

    this._setStatus(render.length + " shown. Scroll horizontally for more columns.", false);
    this.$count.text(String(render.length));

    var cols = this.opts.columns;
    var ic = this.opts.icons;

    var rowsHtml = "";
    for (var r = 0; r < render.length; r++) {
      var sat = render[r];
      var already = !!this.selected[sat.norad_id];

      rowsHtml += '<tr class="js-sp-cat-row" data-id="' + esc(sat.norad_id) + '">';

      rowsHtml += '<td style="white-space:nowrap;">'
        + (already
          ? '<button type="button" class="btn btn-xs btn-success" disabled="disabled">'
            + faIcon(ic.added, "Added") + ' Added</button>'
          : '<button type="button" class="btn btn-xs btn-primary js-sp-add" data-id="' + esc(sat.norad_id) + '">'
            + faIcon(ic.add, "Add") + ' Add</button>')
        + '</td>';

      for (var c = 0; c < cols.length; c++) {
        var key = cols[c].key;
        var val = sat[key];
        var w = cols[c].width ? ('width:' + cols[c].width + 'px;') : '';
        rowsHtml += '<td style="' + w + ' white-space:nowrap;">' + esc(val == null ? "" : String(val)) + '</td>';
      }

      rowsHtml += '</tr>';
    }

    this.$catalogBody.html(rowsHtml);
    this._updateSelectedCount();
  };

  SatellitePicker.prototype._renderSelected = function () {
    var ids = Object.keys(this.selected);
    this.$selectedBody.empty();

    if (!ids.length) {
      this.$selectedBody.html('<tr><td colspan="10" class="text-muted" style="padding:10px;">None selected.</td></tr>');
      this._updateSelectedCount();
      return;
    }

    ids.sort(function (a, b) {
      var ai = parseInt(a, 10), bi = parseInt(b, 10);
      if (isNaN(ai) || isNaN(bi)) return a.localeCompare(b);
      return ai - bi;
    });

    var cols = this.opts.selectedColumns;
    var ic = this.opts.icons;

    var rowsHtml = "";
    for (var i = 0; i < ids.length; i++) {
      var sat = this.selected[ids[i]];

      rowsHtml += '<tr data-id="' + esc(sat.norad_id) + '">';
      rowsHtml += '<td style="white-space:nowrap;">'
        + '<button type="button" class="btn btn-xs btn-danger js-sp-remove" data-id="' + esc(sat.norad_id) + '">'
        + faIcon(ic.remove, "Remove") + ' Remove</button>'
        + '</td>';

      for (var c = 0; c < cols.length; c++) {
        var key = cols[c].key;
        var val = sat[key];
        var w = cols[c].width ? ('width:' + cols[c].width + 'px;') : '';
        rowsHtml += '<td style="' + w + ' white-space:nowrap;">' + esc(val == null ? "" : String(val)) + '</td>';
      }

      rowsHtml += '</tr>';
    }

    this.$selectedBody.html(rowsHtml);
    this._updateSelectedCount();
  };

  SatellitePicker.prototype._updateSelectedCount = function () {
    this.$selectedCount.text(String(Object.keys(this.selected).length));
  };

  // ---------------- Add/remove & return ----------------

  SatellitePicker.prototype._addById = function (id) {
    id = toIdString(id);
    if (!id) return;

    for (var i = 0; i < this.sats.length; i++) {
      if (this.sats[i].norad_id === id) {
        this.selected[id] = this.sats[i];
        break;
      }
    }

    this._renderSelected();
    this._renderCatalog();
  };

  SatellitePicker.prototype._removeById = function (id) {
    id = toIdString(id);
    if (!id) return;

    if (this.selected[id]) delete this.selected[id];

    this._renderSelected();
    this._renderCatalog();
  };

  SatellitePicker.prototype._buildReturn = function () {
    var ids = Object.keys(this.selected);

    ids.sort(function (a, b) {
      var ai = parseInt(a, 10), bi = parseInt(b, 10);
      if (isNaN(ai) || isNaN(bi)) return a.localeCompare(b);
      return ai - bi;
    });

    var arr = [];
    for (var i = 0; i < ids.length; i++) arr.push(this.selected[ids[i]]);

    var csv;
    if (this.opts.returnMode === "name") {
      csv = jQuery.map(arr, function (s) { return s.name; }).join(",");
    } else if (this.opts.returnMode === "both") {
      csv = jQuery.map(arr, function (s) { return s.norad_id + "|" + s.name; }).join(",");
    } else {
      csv = jQuery.map(arr, function (s) { return s.norad_id; }).join(",");
    }

    return { csv: csv, selectedArray: arr };
  };

  // Factory
  jQuery.satellitePicker = function (options) {
    return new SatellitePicker(options || {});
  };

})(jQuery);