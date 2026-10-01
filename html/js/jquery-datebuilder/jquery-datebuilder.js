"use strict";

(function ($) {
  $.fn.dateFormatBuilder = function (options) {
    const settings = $.extend({ onSave: null, initialValue: "" }, options);
    const uniqueId = "date-format-builder-" + Math.random().toString(36).substr(2, 9);

    function renderSection(title, id, tokens) {
      const collapseId = `collapse-${id}-${uniqueId}`;
      let html = `<div class="panel panel-default">
        <div class="panel-heading">
          <h4 class="panel-title">
            <a data-toggle="collapse" data-parent="#accordion-${uniqueId}" href="#${collapseId}">${title}</a>
          </h4>
        </div>
        <div id="${collapseId}" class="panel-collapse collapse">
          <div class="panel-body token-source-zone" data-id="${collapseId}">
            <ul class="list-unstyled">`;
      tokens.forEach(([code, desc]) => {
        html += `<li><span class="token token-source label label-info" draggable="true" data-format="${encodeURIComponent(code)}">${getTokenLabel(code)}</span> <small>${desc}</small></li>`;
      });
      html += "</ul></div></div></div>";
      return html;
    }

    function getTokenLabel(format) {
      return format === " " ? "Space" : format;
    }

    function getTokenFormat(token) {
      if (token.hasClass("token-source")) {
        return decodeURIComponent(token.attr("data-format") || "");
      }
      return token.data("format");
    }

    const modalHtml = `
      <div class="modal fade date-format-builder-modal" id="${uniqueId}" tabindex="-1" role="dialog">
        <div class="modal-dialog modal-lg" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <button type="button" class="close" data-dismiss="modal">&times;</button>
              <h4 class="modal-title">Date Format Builder</h4>
            </div>
            <div class="modal-body">
              <div class="row">
                <div class="col-sm-4">
                  <div class="panel-group" id="accordion-${uniqueId}">
                    ${renderSection("Date Tokens", "date", [["%Y", "4-digit year"], ["%y", "2-digit year"], ["%m", "Month (01–12)"], ["%d", "Day (01–31)"], ["%B", "Full month name"], ["%b", "Abbreviated month name"], ["%A", "Full weekday name"], ["%a", "Abbreviated weekday name"], ["%j", "Day of year"], ["%w", "Weekday number"]])}
                    ${renderSection("Time Tokens", "time", [["%H", "Hour (00–23)"], ["%I", "Hour (01–12)"], ["%p", "AM/PM"], ["%M", "Minute"], ["%S", "Second"], ["%f", "Microsecond"]])}
                    ${renderSection("Week/ISO Tokens", "week", [["%U", "Week # (Sun)"], ["%W", "Week # (Mon)"], ["%V", "ISO week"], ["%u", "ISO weekday"], ["%G", "ISO year"]])}
                    ${renderSection("Timezone Tokens", "tz", [["%z", "UTC offset"], ["%Z", "Timezone name"]])}
                    ${renderSection("Other Tokens", "other", [["%c", "Locale datetime"], ["%x", "Locale date"], ["%X", "Locale time"], ["%%", "Literal %"], ["-", "Dash"], ["/", "Slash"], [":", "Colon"], [" ", "Space"], [",", "Comma"], [".", "Period"], ["%o", "Ordinal day"]])}
                  </div>
                </div>
                <div class="col-sm-8">
                  <div class="form-group">
                    <label>Build Format:</label>
                    <div class="drop-zone well" id="format-zone-${uniqueId}">
                      <em class="text-muted">Drag tokens here...</em>
                    </div>
                  </div>
                  <div class="form-group">
                    <label>Format String</label>
                    <input type="text" class="form-control" id="format-output-${uniqueId}" readonly>
                  </div>
                  <div class="form-group">
                    <label>Preview</label>
                    <input type="text" class="form-control" id="preview-output-${uniqueId}" readonly>
                  </div>
                  <button class="btn btn-default" id="clear-format-${uniqueId}">Clear</button>
                  <button class="btn btn-primary" id="save-format-${uniqueId}">Save</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`;

    $("body").append(modalHtml);

    const modalSelector = `#${uniqueId}`;
    const zoneSelector = `#format-zone-${uniqueId}`;
    let dragPayload = null;

    function createToken(format) {
      return $("<span>")
        .addClass("token token-clone label label-success")
        .attr("draggable", "true")
        .text(getTokenLabel(format))
        .data("format", format);
    }

    function getDropTarget(clientX) {
      let target = null;
      $(`${zoneSelector} .token-clone`).each(function () {
        const rect = this.getBoundingClientRect();
        if (clientX < rect.left + rect.width / 2) {
          target = this;
          return false;
        }
      });
      return target;
    }

    function updateFormatOutput() {
      let format = "";
      $(`${zoneSelector} .token-clone`).each(function () {
        format += $(this).data("format");
      });
      format = format.replace(/&nbsp;/g, " ").replace(/\u00a0/g, " ");
      $(`#format-output-${uniqueId}`).val(format);

      $.ajax({ url: "/includes/overlayutil.php?request=PythonDate", method: "POST", data: { format } })
        .done(function (response) {
          $(`#preview-output-${uniqueId}`).val(response);
        })
        .fail(function (jqXHR, textStatus) {
          let message = textStatus;
          if (jqXHR.responseJSON && jqXHR.responseJSON.message) {
            message = jqXHR.responseJSON.message;
          } else if (jqXHR.responseText) {
            message = jqXHR.responseText;
          }
          $(`#preview-output-${uniqueId}`).val("Error generating preview: " + message);
        });
    }

    function ensureEmptyMessage() {
      const zone = $(zoneSelector);
      if (zone.find(".token-clone").length === 0) {
        zone.html('<em class="text-muted">Drag tokens here...</em>');
      }
    }

    function addTokenToDropZone(format, beforeNode = null) {
      const zone = $(zoneSelector);
      zone.find("em").remove();
      const token = createToken(format);
      if (beforeNode) {
        $(beforeNode).before(token);
      } else {
        zone.append(token);
      }
      updateFormatOutput();
    }

    function populateInitialValue() {
      const initialValue = String(settings.initialValue || "");
      if (initialValue.length === 0) {
        return;
      }

      const normalizedValue = initialValue.replace(/&nbsp;/g, " ").replace(/\u00a0/g, " ");
      const matches = normalizedValue.match(/%[A-Za-z%]|./g) || [];
      matches.forEach((token) => {
        addTokenToDropZone(token);
      });
    }

    $(document).on("dragstart", `${modalSelector} .token-source, ${modalSelector} .token-clone`, function (event) {
      const token = $(this);
      const format = getTokenFormat(token);
      dragPayload = {
        format: format,
        source: token.hasClass("token-clone") ? "zone" : "source",
        element: this
      };

      if (event.originalEvent.dataTransfer) {
        event.originalEvent.dataTransfer.effectAllowed = "move";
        event.originalEvent.dataTransfer.setData("text/plain", format);
      }
    });

    $(document).on("dragover", zoneSelector, function (event) {
      event.preventDefault();
      if (event.originalEvent.dataTransfer) {
        event.originalEvent.dataTransfer.dropEffect = "move";
      }
    });

    $(document).on("drop", zoneSelector, function (event) {
      event.preventDefault();
      if (!dragPayload) {
        return;
      }

      const beforeNode = getDropTarget(event.originalEvent.clientX);
      if (dragPayload.source === "zone") {
        if (beforeNode) {
          $(beforeNode).before(dragPayload.element);
        } else {
          $(this).append(dragPayload.element);
        }
        updateFormatOutput();
      } else {
        addTokenToDropZone(dragPayload.format, beforeNode);
      }

      dragPayload = null;
    });

    $(document).on("dragover", `${modalSelector} .token-source-zone`, function (event) {
      event.preventDefault();
      if (event.originalEvent.dataTransfer) {
        event.originalEvent.dataTransfer.dropEffect = "move";
      }
    });

    $(document).on("drop", `${modalSelector} .token-source-zone`, function (event) {
      event.preventDefault();
      if (!dragPayload || dragPayload.source !== "zone") {
        return;
      }

      $(dragPayload.element).remove();
      ensureEmptyMessage();
      updateFormatOutput();
      dragPayload = null;
    });

    $(document).on("dblclick", `${modalSelector} .token-source`, function () {
      addTokenToDropZone(getTokenFormat($(this)));
    });

    $(document).on("dblclick", `${modalSelector} .token-clone`, function () {
      $(this).remove();
      ensureEmptyMessage();
      updateFormatOutput();
    });

    $(`#${uniqueId}`).on("show.bs.modal", function () {
      $(this).css("z-index", 10070);
      $(this).find(".modal-dialog").css({
        position: "relative",
        zIndex: 10080
      });
      setTimeout(function () {
        $(".modal-backdrop").last()
          .addClass("date-format-builder-backdrop")
          .css("z-index", 10060);
      }, 0);
    });

    $(`#${uniqueId}`).on("shown.bs.modal", function () {
      populateInitialValue();
    });

    $(`#clear-format-${uniqueId}`).click(function () {
      $(zoneSelector).html('<em class="text-muted">Drag tokens here...</em>');
      $(`#format-output-${uniqueId}, #preview-output-${uniqueId}`).val("");
    });

    $(`#save-format-${uniqueId}`).click(function () {
      if (typeof settings.onSave === "function") {
        settings.onSave($(`#format-output-${uniqueId}`).val());
      }
      $(`#${uniqueId}`).modal("hide");
    });

    $(`#${uniqueId}`).on("hidden.bs.modal", function () {
      $(document).off("dragstart", `${modalSelector} .token-source, ${modalSelector} .token-clone`);
      $(document).off("dragover", zoneSelector);
      $(document).off("drop", zoneSelector);
      $(document).off("dragover", `${modalSelector} .token-source-zone`);
      $(document).off("drop", `${modalSelector} .token-source-zone`);
      $(document).off("dblclick", `${modalSelector} .token-source`);
      $(document).off("dblclick", `${modalSelector} .token-clone`);
      $(this).remove();
    });

    $(`#${uniqueId}`).modal("show");
  };
})(jQuery);
