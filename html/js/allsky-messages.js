"use strict";

/**
 * @typedef {Object} MessageRow
 * @property {string} id           - Optional ID (when present, enables the Action button).
 * @property {string} cmd_txt      - Optional UI text / command description from the source file.
 * @property {string} level        - Message level, typically: danger|warning|info|success.
 * @property {string} date         - Human-readable timestamp.
 * @property {number} count        - Count associated with the message.
 * @property {string} message      - Message text (HTML allowed).
 * @property {string} url          - Optional URL; if present, message becomes a link.
 * @property {number} [_rowIndex]  - Injected client-side to preserve JSON order when grouping is off.
 */

/**
 * @typedef {Object} MessageListResponse
 * @property {MessageRow[]} data - Array of message rows.
 */

/**
 * @typedef {Object} AlertStyles
 * @property {string} backgroundColor - Background color extracted from Bootstrap alert class.
 * @property {string} color           - Text color extracted from Bootstrap alert class.
 * @property {string} borderColor     - Border color extracted from Bootstrap alert class.
 * @property {string} linkColor       - Link color extracted from Bootstrap alert class.
 */

/**
 * @typedef {Object} AllskyShowMessagesOptions
 * @property {string} [modalId='messageListModal']                 - DOM id to use for the modal.
 * @property {string} [tableId='messageListTable']                 - DOM id to use for the table element.
 * @property {string} [title='Messages']                           - Modal title text.
 * @property {string} [ajaxUrl='includes/messageutil.php?request=List']  - Endpoint returning JSON data for the table.
 * @property {string} [resetUrl='includes/messageutil.php?request=Reset'] - Endpoint to clear messages.
 * @property {string} [executeUrlBase='/execute.php']              - Base URL for action execution: `${base}?ID={id}`.
 * @property {string} [bodyMaxHeight='75vh']                       - Modal body max height (enables scrolling).
 * @property {string} [modalWidth='70%']                           - Modal dialog width (inline style).
 * @property {boolean} [autoCloseOnClear=true]                     - Close modal automatically after a successful clear.
 * @property {boolean} [enableGrouping=true]                       - Initial "group by level" setting.
 */

/**
 * ALLSKYSHOWMESSAGES
 *
 * High-level behaviour:
 * - Creates a Bootstrap 3 modal at runtime (only once), and reuses it on subsequent opens.
 * - Inside the modal, creates a DataTable that loads data via AJAX.
 * - Supports a "Group by level" toggle:
 *     - Grouping ON: rows are grouped by `level`, and ONLY the group headers are styled.
 *     - Grouping OFF: rows remain in the exact JSON order and EACH row is styled.
 * - Provides footer controls:
 *     - Group toggle (left aligned, custom el-switch markup)
 *     - Clear / Refresh / Close buttons (right aligned; Close is btn-primary)
 * - Clear triggers Reset endpoint, reloads the table, and removes the sidebar "System Messages" entry.
 *
 * Dependencies:
 * - jQuery
 * - Bootstrap 3 (modal)
 * - DataTables
 * - DataTables RowGroup extension (only used when grouping is enabled)
 * - Font Awesome (icons)
 */
class ALLSKYSHOWMESSAGES {
  /**
   * Creates an instance of the modal/table controller.
   *
   * Typical usage:
   *   const dlg = new ALLSKYSHOWMESSAGES();
   *   dlg.run();
   *
   * @param {AllskyShowMessagesOptions} [options] - Optional overrides for behaviour and endpoints.
   */
  constructor(options = {}) {
    /** @type {AllskyShowMessagesOptions} */
    this.opts = $.extend(true, {
      modalId: 'messageListModal',
      tableId: 'messageListTable',
      title: 'Messages',
      ajaxUrl: 'includes/messageutil.php?request=List',
      resetUrl: 'includes/messageutil.php?request=Reset',
      executeUrlBase: '/execute.php',
      bodyMaxHeight: '75vh',
      modalWidth: '70%',
      autoCloseOnClear: true,
      enableGrouping: true
    }, options);

    /** @type {JQuery<HTMLElement>|null} */
    this.modal = null;

    /** @type {any|null} DataTables API instance */
    this.dt = null;

    /** @type {boolean} Ensures we only bind events once */
    this.bound = false;

    /** @type {Set<string>} Tracks which level groups are collapsed when grouping is enabled */
    this.#collapsedGroups = new Set();

    /** @type {boolean} Current grouping state (mirrors footer toggle) */
    this.#groupingEnabled = !!this.opts.enableGrouping;
  }

  /* =========================
     Public API
     ========================= */

  /**
   * Entry point.
   *
   * Creates the modal if needed, binds all event handlers once,
   * and shows the modal. DataTable is initialised on "shown".
   *
   * @returns {void}
   */
  run() {
    this.#ensureModal();
    this.#bindOnce();
    this.#openModal();
  }

  /**
   * Reload the DataTable via AJAX, without resetting pagination.
   *
   * This is used by the Refresh button and after successful operations
   * (e.g. Reset / Execute).
   *
   * @returns {void}
   */
  refresh() {
    const selector = '#' + this.opts.tableId;
    if ($.fn.DataTable.isDataTable(selector)) {
      $(selector).DataTable().ajax.reload(null, false);
    }
  }

  /* =========================
     Private state
     ========================= */

  /** @type {Set<string>} */
  #collapsedGroups;

  /** @type {boolean} */
  #groupingEnabled;

  /* =========================
     Modal: creation + lifecycle
     ========================= */

  /**
   * Ensures the modal exists exactly once in the DOM.
   *
   * If it already exists:
   * - reuse it
   * - sync the grouping toggle state (so it reflects current mode)
   *
   * If it does not exist:
   * - build the HTML
   * - append to <body>
   * - apply body max height & scrolling
   *
   * @returns {void}
   */
  #ensureModal() {
    const existing = $('#' + this.opts.modalId);
    if (existing.length) {
      this.modal = existing;
      this.modal.find('.js-toggle-grouping').prop('checked', this.#groupingEnabled);
      return;
    }

    this.modal = $(this.#buildModalHtml());
    $('body').append(this.modal);

    this.modal.find('.modal-body').css({
      'max-height': this.opts.bodyMaxHeight,
      'overflow-y': 'auto'
    });

    this.modal.find('.js-toggle-grouping').prop('checked', this.#groupingEnabled);
  }

  /**
   * Shows the modal.
   *
   * We initialise the DataTable on the "shown" event
   * so the DOM is fully laid out before DataTables measures columns.
   *
   * @returns {void}
   */
  #openModal() {
    this.modal.modal('show');
  }

  /* =========================
     Event binding
     ========================= */

  /**
   * Binds modal and button events ONCE per instance lifetime.
   *
   * Uses a namespaced event suffix so cleanup is safe and predictable.
   * This avoids duplicate handlers when the modal is reopened.
   *
   * Events handled:
   * - shown.bs.modal: build DataTable
   * - hidden.bs.modal: destroy DataTable and reset DOM
   * - refresh button: reload AJAX
   * - clear button: reset messages via AJAX
   * - group header click: collapse/expand group (when grouping enabled)
   * - action button click: execute command by ID
   * - grouping toggle change: rebuild table in the other mode
   *
   * @returns {void}
   */
  #bindOnce() {
    if (this.bound) return;
    this.bound = true;

    this.modal.off('.allskyshowmessages');

    this.modal.on('shown.bs.modal.allskyshowmessages', () => {
      setTimeout(() => this.#initOrReinitDataTable(), 0);
    });

    this.modal.on('hidden.bs.modal.allskyshowmessages', () => {
      this.#destroyDataTable();
      this.#resetTableDom();
      this.#hideError();
      this.#showEmptyMessage(false);
    });

    this.modal.on('click.allskyshowmessages', '.js-refresh', (e) => {
      e.preventDefault();
      this.refresh();
    });

    this.modal.on('click.allskyshowmessages', '.js-clear', (e) => {
      e.preventDefault();
      this.#clearMessages();
    });

    this.modal.on('click.allskyshowmessages', 'tr.js-group-row', (e) => {
      if (!this.#groupingEnabled) return;

      const group = String($(e.currentTarget).data('group') || '');
      if (!group) return;

      if (this.#collapsedGroups.has(group)) this.#collapsedGroups.delete(group);
      else this.#collapsedGroups.add(group);

      if (this.dt) this.dt.draw(false);
    });

    this.modal.on('click.allskyshowmessages', '.js-run-action', (e) => {
      e.preventDefault();
      const btn = $(e.currentTarget);
      const id = String(btn.data('id') || '');
      if (!id) return;
      this.#executeAction(id, btn);
    });

    this.modal.on('change.allskyshowmessages', '.js-toggle-grouping', (e) => {
      this.#groupingEnabled = !!e.currentTarget.checked;
      this.#collapsedGroups.clear();
      this.#rebuildDataTable();
    });
  }

  /* =========================
     DataTable: rebuild + init
     ========================= */

  /**
   * Rebuilds the DataTable from scratch.
   *
   * We do this when switching between grouped/ungrouped modes,
   * because DataTables RowGroup and ordering behaviour is easier and safer
   * to swap by recreating the instance.
   *
   * @returns {void}
   */
  #rebuildDataTable() {
    this.#destroyDataTable();
    this.#resetTableDom();
    this.#hideError();
    this.#showEmptyMessage(false);
    this.#initOrReinitDataTable();
  }

  /**
   * Creates the DataTable with configuration that depends on grouping mode.
   *
   * Two modes:
   * - Grouped:
   *   - Order by "level order" then date desc
   *   - RowGroup enabled
   *   - Style is applied ONLY to group header rows
   * - Ungrouped:
   *   - Order by injected _rowIndex to preserve JSON order exactly
   *   - RowGroup disabled
   *   - Style is applied to EACH row
   *
   * @returns {void}
   */
  #initOrReinitDataTable() {
    const selector = '#' + this.opts.tableId;

    if (!$(selector).length) this.#resetTableDom();

    if ($.fn.DataTable.isDataTable(selector)) {
      $(selector).DataTable().destroy(true);
      this.#resetTableDom();
    }

    // Visible columns: Date, Count, Message, Action => 4
    const groupColspan = 4;

    /** @type {any} */
    const config = {
      processing: true,
      paging: true,
      ordering: true,
      searching: true,
      autoWidth: false,
      pageLength: 25,

      ajax: {
        url: this.opts.ajaxUrl,
        dataType: 'json',
        cache: false,

        /**
         * DataTables "dataSrc" can be a function.
         * We use it to:
         * - read the server payload
         * - inject a stable index so ungrouped mode can preserve server order
         *
         * @param {MessageListResponse} json
         * @returns {MessageRow[]}
         */
        dataSrc: (json) => {
          const arr = Array.isArray(json?.data) ? json.data : [];
          for (let i = 0; i < arr.length; i++) {
            arr[i]._rowIndex = i;
          }
          return arr;
        }
      },

      columns: [
        // Hidden fields used internally (id/level)
        { data: 'id', visible: false },
        { data: 'level', visible: false },

        // Hidden numeric ordering for severity when grouping is ON
        {
          data: 'level',
          visible: false,
          render: (data) => {
            const v = String(data || '').toLowerCase();
            if (v === 'danger') return 1;
            if (v === 'warning') return 2;
            if (v === 'info') return 3;
            if (v === 'success') return 4;
            return 99;
          }
        },

        // Hidden ordering for ungrouped mode
        { data: '_rowIndex', visible: false },

        // Visible columns
        { title: 'Date', data: 'date', width: '210px' },
        { title: 'Count', data: 'count', width: '70px' },

        {
          title: 'Message',
          data: 'message',

          /**
           * Message column rendering:
           * - HTML is allowed (we do not escape `message`)
           * - If `url` is present, wrap the message in a safe <a> tag
           *
           * @param {string} data
           * @param {string} type
           * @param {MessageRow} row
           * @returns {string}
           */
          render: (data, type, row) => {
            const html = data || '';
            if (row.url) {
              return `<a href="${ALLSKYSHOWMESSAGES.#escapeStatic(row.url)}" target="_blank" rel="noopener">${html}</a>`;
            }
            return html;
          }
        },

        {
          title: 'Action',
          data: null,
          orderable: false,
          searchable: false,
          width: '90px',
          className: 'text-center',

          /**
           * Action column:
           * - Only shown if `id` is non-empty
           * - Uses /execute.php?ID={id}
           *
           * @param {any} _data
           * @param {string} _type
           * @param {MessageRow} row
           * @returns {string}
           */
          render: (_data, _type, row) => {
            const id = (row && row.id != null) ? String(row.id) : '';
            if (!id) return '';

            const safeIdAttr = ALLSKYSHOWMESSAGES.#escapeStatic(id);

            return `
              <button type="button"
                      class="btn btn-xs btn-primary js-run-action"
                      data-id="${safeIdAttr}"
                      title="Execute">
                <i class="fa-solid fa-play"></i>
              </button>`;
          }
        }
      ],

      /**
       * Styling rule:
       * - If grouping is ON: do NOT style each row (group header carries the style)
       * - If grouping is OFF: style each row using Bootstrap alert palette
       *
       * @param {HTMLTableRowElement} row
       * @param {MessageRow} data
       * @returns {void}
       */
      createdRow: (row, data) => {
        if (this.#groupingEnabled) return;

        const styles = ALLSKYSHOWMESSAGES.#getAlertStyles(data?.level);
        if (!styles) return;

        row.style.backgroundColor = styles.backgroundColor;
        row.style.color = styles.color;
        row.style.borderTop = '1px solid ' + styles.borderColor;
        row.style.borderBottom = '1px solid ' + styles.borderColor;

        row.querySelectorAll('a').forEach(a => {
          a.style.color = styles.linkColor;
          a.style.textDecoration = 'underline';
        });
      },

      /**
       * After every draw (paging/search/order/reload), update:
       * - Empty-state message visibility
       * - Collapsed group state when grouping is enabled
       *
       * @param {any} settings
       * @returns {void}
       */
      drawCallback: (settings) => {
        const count = settings.fnRecordsDisplay();
        this.#showEmptyMessage(count === 0);

        if (this.#groupingEnabled) {
          this.#applyGroupCollapse();
        }
      }
    };

    if (this.#groupingEnabled) {
      // Grouped mode ordering: severity then date
      config.order = [[2, 'asc'], [4, 'desc']];

      config.rowGroup = {
        dataSrc: 'level',

        /**
         * Builds a group header row.
         * We apply the Bootstrap alert palette to the group header row ONLY.
         *
         * NOTE:
         * Bootstrap tables can apply borders to <td>. We explicitly clear top/bottom borders
         * to avoid the white "lines" you were seeing.
         *
         * @param {any} rows
         * @param {string} group
         * @returns {JQuery<HTMLElement>}
         */
        startRender: (rows, group) => {
          const level = String(group || '');
          const collapsed = this.#collapsedGroups.has(level);
          const caret = collapsed ? 'fa-caret-right' : 'fa-caret-down';
          const label = ALLSKYSHOWMESSAGES.#titleCase(level || 'unknown');
          const count = rows.count();

          const styles = ALLSKYSHOWMESSAGES.#getAlertStyles(level);

          const styleAttr = styles
            ? `style="
                font-weight:bold;
                cursor:pointer;
                user-select:none;
                background:${styles.backgroundColor};
                color:${styles.color};
                border-top:0 !important;
                border-bottom:0 !important;
              "`
            : `style="
                font-weight:bold;
                cursor:pointer;
                user-select:none;
                border-top:0 !important;
                border-bottom:0 !important;
              "`;

          return $('<tr class="js-group-row"/>')
            .attr('data-group', level)
            .append(`
              <td colspan="${groupColspan}" ${styleAttr}>
                <i class="fa-solid ${caret}" style="margin-right:8px;"></i>
                ${label} <span style="opacity:0.75;">(${count})</span>
              </td>
            `);
        }
      };
    } else {
      // Ungrouped mode ordering: preserve JSON sequence exactly
      config.order = [[3, 'asc']];
      // No rowGroup
    }

    this.dt = $(selector).DataTable(config);
  }

  /**
   * Applies the collapse state to rows on the CURRENT PAGE.
   *
   * We do this after each draw. RowGroup headers are built by DataTables;
   * this function only hides/shows the underlying row elements.
   *
   * @returns {void}
   */
  #applyGroupCollapse() {
    if (!this.dt) return;
    const collapsed = this.#collapsedGroups;

    this.dt.rows({ page: 'current' }).every(function () {
      const node = this.node();
      const level = String(this.data()?.level || '');
      node.style.display = collapsed.has(level) ? 'none' : '';
    });
  }

  /**
   * Fully destroys the DataTable instance if it exists.
   *
   * @returns {void}
   */
  #destroyDataTable() {
    const selector = '#' + this.opts.tableId;
    if ($.fn.DataTable.isDataTable(selector)) {
      $(selector).DataTable().destroy(true);
    }
    this.dt = null;
  }

  /**
   * Resets the table container HTML to a plain table element.
   *
   * Important:
   * - We intentionally avoid Bootstrap's `table-bordered` class
   *   to prevent borders bleeding into DataTables styling.
   *
   * @returns {void}
   */
  #resetTableDom() {
    this.modal.find('.js-table-wrap')
      .html(this.#buildTableHtml(this.opts.tableId));
  }

  /* =========================
     Actions: Clear + Execute
     ========================= */

  /**
   * Calls the Reset endpoint to delete/clear the messages file.
   *
   * On success:
   * - reload DataTable
   * - remove the sidebar menu item with id="messages"
   * - optionally auto-close the modal
   *
   * On failure:
   * - show a friendly error message in the modal
   *
   * @returns {void}
   */
  #clearMessages() {
    this.#hideError();

    $.ajax({
      url: this.opts.resetUrl,
      dataType: 'json',
      cache: false
    })
      .done((res) => {
        if (res?.success) {
          this.refresh();

          // Remove the "System Messages" menu item from the sidebar
          const link = document.getElementById('messages');
          if (link?.parentElement) link.parentElement.remove();

          if (this.opts.autoCloseOnClear) {
            this.modal.modal('hide');
          }
        } else {
          this.#showError(res?.error || 'Failed to clear messages.');
        }
      })
      .fail(() => this.#showError('Request failed while clearing messages.'));
  }

  /**
   * Executes an action for a row ID by calling:
   *   /execute.php?ID={ID}
   *
   * This is intentionally a simple fire-and-forget GET.
   * If you later want to display output from execute.php, we can
   * switch to expecting JSON and show success text.
   *
   * @param {string} id - The row ID to execute.
   * @param {JQuery<HTMLElement>} btn - Button element to disable while the call runs.
   * @returns {void}
   */
  #executeAction(id, btn) {
    this.#hideError();
    btn.prop('disabled', true);

    const url = this.opts.executeUrlBase + '?ID=' + encodeURIComponent(id);

    $.ajax({
      url,
      type: 'GET',
      cache: false
    })
      .done(() => {
        // Reload so any messages generated by the action appear immediately
        this.refresh();
      })
      .fail(() => {
        this.#showError('Action failed for ID: ' + id);
      })
      .always(() => {
        btn.prop('disabled', false);
      });
  }

  /* =========================
     UI helpers: empty + error
     ========================= */

  /**
   * Show/hide the "no messages" placeholder panel.
   *
   * @param {boolean} show
   * @returns {void}
   */
  #showEmptyMessage(show) {
    this.modal.find('.js-empty-wrap').toggle(show);
    this.modal.find('.js-table-wrap').toggle(!show);
  }

  /**
   * Displays an error alert in the modal.
   *
   * @param {string} msg
   * @returns {void}
   */
  #showError(msg) {
    this.modal.find('.js-error-text').text(msg);
    this.modal.find('.js-error-wrap').show();
  }

  /**
   * Hides the error alert area.
   *
   * @returns {void}
   */
  #hideError() {
    this.modal.find('.js-error-wrap').hide();
  }

  /* =========================
     HTML building
     ========================= */

  /**
   * Builds the modal HTML string.
   *
   * Layout requirements:
   * - toggle switch left aligned in footer
   * - buttons right aligned
   * - Close is Bootstrap primary
   * - grouping toggle uses custom el-switch markup
   *
   * @returns {string}
   */
  #buildModalHtml() {
    const { modalId, tableId, title, modalWidth } = this.opts;
    const checked = this.#groupingEnabled ? 'checked' : '';

    return `
<div id="${modalId}" class="modal fade" tabindex="-1">
  <div class="modal-dialog" style="width:${modalWidth}; max-width:${modalWidth};">
    <div class="modal-content">
      <div class="modal-header">
        <button class="close" data-dismiss="modal">&times;</button>
        <h4 class="modal-title">${ALLSKYSHOWMESSAGES.#escapeStatic(title)}</h4>
      </div>

      <div class="modal-body">
        <div class="js-error-wrap" style="display:none;margin-bottom:10px">
          <div class="alert alert-danger" style="margin:0;">
            <span class="js-error-text"></span>
          </div>
        </div>

        <div class="js-empty-wrap" style="display:none;margin-bottom:10px">
          <div class="alert alert-info" style="margin:0;">
            No messages to display.
          </div>
        </div>

        <div class="table-responsive js-table-wrap">
          ${this.#buildTableHtml(tableId)}
        </div>
      </div>

      <div class="modal-footer" style="display:flex;align-items:center;">
        <!-- LEFT: grouping toggle -->
        <div style="flex:1; display:flex; align-items:center; gap:10px;">
          <span>Group by level</span>
          <label class="el-switch el-switch-sm el-switch-green" style="margin:0;">
            <input type="checkbox" class="js-toggle-grouping" ${checked} value="checked">
            <span class="el-switch-style"></span>
          </label>
        </div>

        <!-- RIGHT: buttons -->
        <div>
          <button class="btn btn-default js-clear"><i class="fa fa-trash"></i> Clear</button>
          <button class="btn btn-default js-refresh"><i class="fa fa-refresh"></i> Refresh</button>
          <button class="btn btn-primary" data-dismiss="modal">Close</button>
        </div>
      </div>

    </div>
  </div>
</div>`;
  }

  /**
   * Builds the table markup used by DataTables.
   *
   * Note:
   * - no "table-bordered" class (avoids borders bleeding through)
   *
   * @param {string} id - Table element id
   * @returns {string}
   */
  #buildTableHtml(id) {
    return `<table id="${id}" class="table table-striped" style="width:100%"></table>`;
  }

  /* =========================
     Static helpers
     ========================= */

  /**
   * Escapes text for safe HTML attribute / text usage.
   * (We do NOT use this for the `message` column because HTML is intentionally allowed there.)
   *
   * @param {string} str
   * @returns {string}
   */
  static #escapeStatic(str) {
    return String(str).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  }

  /**
   * Converts a string into a simple "Title Case" style label.
   *
   * @param {string} str
   * @returns {string}
   */
  static #titleCase(str) {
    const s = String(str || '');
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }

  /** @type {Record<string, AlertStyles>} */
  static #alertStyleCache = {};

  /**
   * Extracts Bootstrap alert colours (background/text/border/link) from the page’s CSS.
   *
   * Why this exists:
   * - Bootstrap alert colours vary by theme
   * - We want to match the existing UI theme without hardcoding colours
   *
   * Implementation detail:
   * - We create an off-screen element with the relevant alert class
   * - Read computed styles
   * - Cache them per alert class to avoid repeated DOM work
   *
   * @param {string} level - danger|warning|info|success
   * @returns {AlertStyles|null}
   */
  static #getAlertStyles(level) {
    const map = {
      danger: 'alert-danger',
      warning: 'alert-warning',
      success: 'alert-success',
      info: 'alert-info'
    };

    const cls = map[String(level || '').toLowerCase()];
    if (!cls) return null;

    if (this.#alertStyleCache[cls]) return this.#alertStyleCache[cls];

    const probe = document.createElement('div');
    probe.className = 'alert ' + cls;
    probe.style.position = 'absolute';
    probe.style.left = '-9999px';
    probe.style.padding = '0';
    probe.style.margin = '0';
    probe.innerHTML = '<a href="#">x</a>'; // helps us capture link color too
    document.body.appendChild(probe);

    const cs = getComputedStyle(probe);
    const lcs = getComputedStyle(probe.querySelector('a'));

    const styles = {
      backgroundColor: cs.backgroundColor,
      color: cs.color,
      borderColor: cs.borderTopColor || cs.borderColor,
      linkColor: lcs.color || cs.color
    };

    document.body.removeChild(probe);
    this.#alertStyleCache[cls] = styles;
    return styles;
  }
}

window.ALLSKYSHOWMESSAGES = ALLSKYSHOWMESSAGES;